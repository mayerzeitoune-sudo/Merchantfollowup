"""
PHONE BLOWER - High-intensity outbound call workflow API
Manages call attempts, dispositions, compliance guardrails, and analytics.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone, timedelta
import uuid

router = APIRouter(prefix="/phone-blower", tags=["Phone Blower"])

# Shared state - set by server.py
db = None
_get_current_user_func = None

def set_db(database):
    global db
    db = database

def set_auth_dependency(auth_func):
    global _get_current_user_func
    _get_current_user_func = auth_func

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if _get_current_user_func:
        return await _get_current_user_func(credentials)
    raise HTTPException(status_code=401, detail="Not configured")


VALID_DISPOSITIONS = [
    "no_answer", "left_voicemail", "busy", "answered_interested",
    "answered_not_interested", "callback_requested", "wrong_number",
    "do_not_call", "application_sent", "application_started",
    "funded_elsewhere", "already_funded", "dead_lead"
]

STOP_DISPOSITIONS = {"wrong_number", "do_not_call", "funded_elsewhere", "already_funded", "dead_lead"}


class CallAttemptCreate(BaseModel):
    client_id: str
    outbound_number: str
    disposition: str
    notes: Optional[str] = None
    duration_seconds: Optional[int] = 0


class PhoneBlowerSettings(BaseModel):
    max_attempts_per_day: Optional[int] = 3
    cooldown_minutes: Optional[int] = 60
    call_window_start: Optional[str] = "09:00"
    call_window_end: Optional[str] = "17:00"


@router.get("/settings")
async def get_phone_blower_settings(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    org_id = user.get("org_id") if user else None

    settings = await db.phone_blower_settings.find_one(
        {"org_id": org_id}, {"_id": 0}
    )
    if not settings:
        settings = {
            "org_id": org_id,
            "max_attempts_per_day": 3,
            "cooldown_minutes": 60,
            "call_window_start": "09:00",
            "call_window_end": "17:00",
            "weekdays_only": True,
        }
    return settings


@router.put("/settings")
async def update_phone_blower_settings(
    data: PhoneBlowerSettings,
    current_user: dict = Depends(get_current_user)
):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user or user.get("role") not in ("admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Admin only")

    org_id = user.get("org_id")
    now = datetime.now(timezone.utc).isoformat()

    await db.phone_blower_settings.update_one(
        {"org_id": org_id},
        {"$set": {
            "org_id": org_id,
            "max_attempts_per_day": data.max_attempts_per_day,
            "cooldown_minutes": data.cooldown_minutes,
            "call_window_start": data.call_window_start,
            "call_window_end": data.call_window_end,
            "weekdays_only": True,
            "updated_at": now,
        }},
        upsert=True
    )
    return {"status": "updated"}


@router.get("/lead/{client_id}")
async def get_lead_call_profile(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get full lead profile for the Phone Blower call card"""
    from server import get_accessible_user_ids
    accessible_ids = await get_accessible_user_ids(current_user)

    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Lead not found")

    # Get call attempts for this lead
    attempts = await db.call_attempts.find(
        {"client_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)

    # Today's attempt count
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    today_attempts = await db.call_attempts.count_documents({
        "client_id": client_id,
        "created_at": {"$gte": today_start}
    })

    # Last call, last text, last note
    last_call = attempts[0] if attempts else None
    last_text = await db.messages.find_one(
        {"client_id": client_id},
        {"_id": 0}
    )
    last_note = await db.activity_log.find_one(
        {"entity_id": client_id, "entity_type": "client"},
        {"_id": 0}
    )

    # Get settings
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    org_id = user.get("org_id") if user else None
    settings = await db.phone_blower_settings.find_one({"org_id": org_id}, {"_id": 0})
    if not settings:
        settings = {
            "max_attempts_per_day": 3,
            "cooldown_minutes": 60,
            "call_window_start": "09:00",
            "call_window_end": "17:00",
        }

    # Compliance checks
    is_dnc = client.get("do_not_contact", False)
    is_opted_out = client.get("opted_out", False)
    is_wrong_number = client.get("wrong_number", False)
    is_blocked = is_dnc or is_opted_out or is_wrong_number
    status = client.get("pipeline_stage", "unknown")
    is_terminal = status in ("funded", "dead", "funded_elsewhere")

    # Cooldown check
    cooldown_active = False
    cooldown_expires = None
    if last_call:
        last_call_time = datetime.fromisoformat(last_call["created_at"])
        cooldown_end = last_call_time + timedelta(minutes=settings.get("cooldown_minutes", 60))
        if datetime.now(timezone.utc) < cooldown_end:
            cooldown_active = True
            cooldown_expires = cooldown_end.isoformat()

    # Attempt limit check
    max_per_day = settings.get("max_attempts_per_day", 3)
    attempts_exhausted = today_attempts >= max_per_day

    # Call window check
    now_utc = datetime.now(timezone.utc)
    # Approximate: use ET as default timezone for leads
    from zoneinfo import ZoneInfo
    et = ZoneInfo("America/New_York")
    now_local = now_utc.astimezone(et)
    hour_now = now_local.hour
    minute_now = now_local.minute
    window_start = int(settings.get("call_window_start", "09:00").split(":")[0])
    window_end = int(settings.get("call_window_end", "17:00").split(":")[0])
    is_weekday = now_local.weekday() < 5
    in_window = is_weekday and window_start <= hour_now < window_end

    can_call = in_window and not is_blocked and not is_terminal and not cooldown_active and not attempts_exhausted

    # Recommendation
    recommendation = "Call now" if can_call else ""
    if is_blocked:
        recommendation = "Blocked - DNC/Opted Out/Wrong Number"
    elif is_terminal:
        recommendation = f"Terminal status: {status}"
    elif not in_window:
        recommendation = f"Outside call window ({settings.get('call_window_start')}-{settings.get('call_window_end')} ET, weekdays)"
    elif cooldown_active:
        recommendation = f"Cooldown active until {cooldown_expires}"
    elif attempts_exhausted:
        recommendation = f"Daily limit reached ({max_per_day} attempts)"

    # Next best action
    next_action = "call"
    if last_call and last_call.get("disposition") == "no_answer":
        next_action = "text_first"
    elif last_call and last_call.get("disposition") == "callback_requested":
        next_action = "wait_for_callback"
    elif last_call and last_call.get("disposition") == "answered_interested":
        next_action = "send_application"

    return {
        "client": client,
        "attempts": attempts,
        "today_attempts": today_attempts,
        "last_call": last_call,
        "last_text": last_text,
        "last_note": last_note,
        "settings": settings,
        "compliance": {
            "is_dnc": is_dnc,
            "is_opted_out": is_opted_out,
            "is_wrong_number": is_wrong_number,
            "is_blocked": is_blocked,
            "is_terminal": is_terminal,
            "cooldown_active": cooldown_active,
            "cooldown_expires": cooldown_expires,
            "attempts_exhausted": attempts_exhausted,
            "in_call_window": in_window,
            "is_weekday": is_weekday,
            "can_call": can_call,
        },
        "recommendation": recommendation,
        "next_action": next_action,
    }


@router.post("/call")
async def log_call_attempt(data: CallAttemptCreate, current_user: dict = Depends(get_current_user)):
    """Log a call attempt with disposition"""
    from server import get_accessible_user_ids
    accessible_ids = await get_accessible_user_ids(current_user)

    if data.disposition not in VALID_DISPOSITIONS:
        raise HTTPException(status_code=400, detail=f"Invalid disposition. Must be one of: {VALID_DISPOSITIONS}")

    accessible_ids = await get_accessible_user_ids(current_user)
    client = await db.clients.find_one(
        {"id": data.client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Lead not found")

    now = datetime.now(timezone.utc).isoformat()
    attempt_id = str(uuid.uuid4())

    attempt_doc = {
        "id": attempt_id,
        "client_id": data.client_id,
        "user_id": current_user["user_id"],
        "outbound_number": data.outbound_number,
        "disposition": data.disposition,
        "notes": data.notes,
        "duration_seconds": data.duration_seconds or 0,
        "created_at": now,
    }
    await db.call_attempts.insert_one(attempt_doc)

    # Update client status based on disposition
    client_update = {"last_call_at": now, "last_call_disposition": data.disposition}
    if data.disposition == "do_not_call":
        client_update["do_not_contact"] = True
    elif data.disposition == "wrong_number":
        client_update["wrong_number"] = True
    elif data.disposition == "answered_interested":
        client_update["pipeline_stage"] = "interested"
    elif data.disposition == "application_sent":
        client_update["pipeline_stage"] = "application_sent"
    elif data.disposition == "application_started":
        client_update["pipeline_stage"] = "application_started"
    elif data.disposition in ("funded_elsewhere", "already_funded"):
        client_update["pipeline_stage"] = "funded"
    elif data.disposition == "dead_lead":
        client_update["pipeline_stage"] = "dead"

    await db.clients.update_one({"id": data.client_id}, {"$set": client_update})

    # Remove _id before returning
    if "_id" in attempt_doc:
        del attempt_doc["_id"]

    return attempt_doc


@router.get("/analytics")
async def get_phone_blower_analytics(current_user: dict = Depends(get_current_user)):
    """Get call analytics for the PHONE BLOWER page"""
    from server import get_accessible_user_ids
    accessible_ids = await get_accessible_user_ids(current_user)

    # All attempts by accessible users
    all_attempts = await db.call_attempts.find(
        {"user_id": {"$in": accessible_ids}},
        {"_id": 0}
    ).to_list(10000)

    total = len(all_attempts)
    dispositions = {}
    for a in all_attempts:
        d = a.get("disposition", "unknown")
        dispositions[d] = dispositions.get(d, 0) + 1

    connects = dispositions.get("answered_interested", 0) + dispositions.get("answered_not_interested", 0)
    positive = dispositions.get("answered_interested", 0)
    app_started = dispositions.get("application_started", 0) + dispositions.get("application_sent", 0)

    return {
        "total_attempts": total,
        "connects": connects,
        "no_answers": dispositions.get("no_answer", 0),
        "voicemails_left": dispositions.get("left_voicemail", 0),
        "callbacks_requested": dispositions.get("callback_requested", 0),
        "positive_contacts": positive,
        "applications_started": app_started,
        "wrong_numbers": dispositions.get("wrong_number", 0),
        "dnc_marked": dispositions.get("do_not_call", 0),
        "dead_leads": dispositions.get("dead_lead", 0),
        "connect_rate": round(connects / total * 100, 1) if total > 0 else 0,
        "conversion_rate": round(positive / total * 100, 1) if total > 0 else 0,
        "dispositions": dispositions,
    }


@router.get("/queue")
async def get_call_queue(current_user: dict = Depends(get_current_user)):
    """Get prioritized list of leads ready to be called"""
    from server import get_accessible_user_ids
    accessible_ids = await get_accessible_user_ids(current_user)

    # Get all active leads that aren't blocked
    leads = await db.clients.find(
        {
            "user_id": {"$in": accessible_ids},
            "do_not_contact": {"$ne": True},
            "opted_out": {"$ne": True},
            "wrong_number": {"$ne": True},
            "pipeline_stage": {"$nin": ["funded", "dead", "funded_elsewhere"]},
        },
        {"_id": 0}
    ).to_list(500)

    # Enrich with call data
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0).isoformat()
    queue = []
    for lead in leads:
        today_calls = await db.call_attempts.count_documents({
            "client_id": lead["id"],
            "created_at": {"$gte": today_start}
        })
        last_call = await db.call_attempts.find_one(
            {"client_id": lead["id"]},
            {"_id": 0}
        )
        queue.append({
            "client": lead,
            "today_attempts": today_calls,
            "last_call": last_call,
            "last_disposition": last_call.get("disposition") if last_call else None,
        })

    # Sort: leads with fewer attempts first, then by name
    queue.sort(key=lambda x: (x["today_attempts"], x["client"].get("name", "")))
    return queue[:100]
