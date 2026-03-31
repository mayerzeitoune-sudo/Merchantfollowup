"""
Twilio SMS Integration Routes
Handles real SMS sending via Twilio API
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Form, Request
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List
from motor.motor_asyncio import AsyncIOMotorClient
from datetime import datetime, timezone
import os
import uuid
import logging

# Initialize router
router = APIRouter(prefix="/sms", tags=["SMS"])

logger = logging.getLogger(__name__)

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL environment variable is required")
if not DB_NAME:
    raise RuntimeError("DB_NAME environment variable is required")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'


class SMSRequest(BaseModel):
    to: str
    message: str
    client_id: Optional[str] = None
    from_number: Optional[str] = None


def get_twilio_client():
    """Get Twilio client — reads from MongoDB first, then twilio_creds.json, then env vars"""
    import json as _json
    from pathlib import Path
    import asyncio

    sid = ""
    token = ""

    # 1. Try MongoDB (sync wrapper for async call)
    try:
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # We're in an async context, can't do sync DB call here
            # Fall through to file/env
            pass
    except RuntimeError:
        pass

    # 2. Try twilio_creds.json
    creds_path = Path(__file__).resolve().parent.parent / 'twilio_creds.json'
    if creds_path.exists():
        try:
            with open(creds_path) as f:
                creds = _json.load(f)
            sid = creds.get("TWILIO_ACCOUNT_SID", "")
            token = creds.get("TWILIO_AUTH_TOKEN", "")
        except Exception:
            pass

    # 3. Fall back to env
    if not sid or not token:
        sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    if not sid or not token:
        return None
    from twilio.rest import Client
    return Client(sid, token)


async def get_twilio_client_async():
    """Async version - checks MongoDB first for credentials"""
    from motor.motor_asyncio import AsyncIOMotorClient
    from pathlib import Path
    import json as _json

    sid = ""
    token = ""

    # 1. Try MongoDB
    try:
        mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        db_name = os.environ.get("DB_NAME", "test_database")
        _client = AsyncIOMotorClient(mongo_url)
        _db = _client[db_name]
        stored = await _db.platform_config.find_one({"key": "twilio_creds"}, {"_id": 0})
        _client.close()
        if stored and stored.get("account_sid") and stored.get("auth_token"):
            sid = stored["account_sid"]
            token = stored["auth_token"]
    except Exception:
        pass

    # 2. Try twilio_creds.json
    if not sid or not token:
        creds_path = Path(__file__).resolve().parent.parent / 'twilio_creds.json'
        if creds_path.exists():
            try:
                with open(creds_path) as f:
                    creds = _json.load(f)
                sid = creds.get("TWILIO_ACCOUNT_SID", "")
                token = creds.get("TWILIO_AUTH_TOKEN", "")
            except Exception:
                pass

    # 3. Fall back to env
    if not sid or not token:
        sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
        token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    if not sid or not token:
        return None
    from twilio.rest import Client
    return Client(sid, token)


@router.get("/status")
async def get_sms_status():
    """Check if Twilio SMS is configured"""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    is_configured = bool(sid and token)
    return {
        "configured": is_configured,
        "message": "Twilio SMS is ready" if is_configured else "Twilio credentials not configured"
    }


@router.post("/send")
async def send_sms(request_obj: Request, request: SMSRequest, user_id: str = Query(...)):
    """Send a single SMS message via Twilio"""
    
    # ===== CONTENT MODERATION =====
    try:
        from routes.moderation import check_message_content, check_recipient_number
        
        word_check = await check_message_content(request.message)
        if not word_check["allowed"]:
            raise HTTPException(
                status_code=400,
                detail=f"Message blocked: contains prohibited word '{word_check['blocked_word']}'. Please remove it and try again."
            )
        
        number_check = await check_recipient_number(request.to)
        if not number_check["allowed"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot send to this number: {number_check['reason']}"
            )
    except HTTPException:
        raise
    except Exception as mod_err:
        logger.warning(f"Moderation check skipped: {mod_err}")
    
    twilio_client = get_twilio_client()

    if not twilio_client:
        raise HTTPException(status_code=503, detail="SMS service is not configured. Contact platform administrator.")

    try:
        sender = request.from_number or os.environ.get("TWILIO_PHONE_NUMBER")
        if not sender:
            raise HTTPException(status_code=400, detail="No from_number provided and no default TWILIO_PHONE_NUMBER configured")

        ms_sid = os.environ.get('TWILIO_MESSAGING_SERVICE_SID', '')
        msg_params = {"body": request.message, "to": request.to, "from_": sender}
        if ms_sid:
            msg_params["messaging_service_sid"] = ms_sid
        
        status_cb_proto = request_obj.headers.get("x-forwarded-proto", "https")
        status_cb_host = request_obj.headers.get("x-forwarded-host") or request_obj.headers.get("host", "")
        status_cb = f"{status_cb_proto}://{status_cb_host}" if status_cb_host else str(request_obj.base_url).rstrip("/")
        if status_cb:
            msg_params["status_callback"] = f"{status_cb}/api/sms/webhook/status"
        
        message = twilio_client.messages.create(**msg_params)

        msg_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "client_id": request.client_id,
            "to": request.to,
            "from": sender,
            "message": request.message,
            "status": message.status,
            "direction": "outbound",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "twilio_sid": message.sid
        }
        await db.sms_messages.insert_one(msg_doc)

        if request.client_id:
            conv_doc = {
                "id": str(uuid.uuid4()),
                "user_id": user_id,
                "client_id": request.client_id,
                "message": request.message,
                "direction": "outbound",
                "channel": "sms",
                "status": message.status,
                "twilio_sid": message.sid,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.conversations.insert_one(conv_doc)

        logger.info(f"SMS sent to {request.to}, SID: {message.sid}")
        return {
            "success": True,
            "message_sid": message.sid,
            "status": message.status,
            "message_id": msg_doc["id"]
        }

    except Exception as e:
        logger.error(f"Failed to send SMS: {str(e)}")
        msg_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "client_id": request.client_id,
            "to": request.to,
            "message": request.message,
            "status": "failed",
            "direction": "outbound",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }
        await db.sms_messages.insert_one(msg_doc)
        raise HTTPException(status_code=500, detail=f"Failed to send SMS: {str(e)}")


@router.post("/webhook/inbound")
async def handle_inbound_sms(
    From: str = Form(""),
    To: str = Form(""),
    Body: str = Form(""),
    MessageSid: str = Form(""),
    AccountSid: str = Form(""),
    NumMedia: str = Form("0"),
):
    """Webhook for receiving inbound SMS from Twilio (form-encoded POST)"""
    logger.info(f"Inbound SMS webhook: From={From} To={To} Body={Body[:80] if Body else ''}")

    if not From or not Body:
        return Response(content=EMPTY_TWIML, media_type="application/xml")

    from_clean = From.replace("+1", "").replace("+", "").replace("-", "").replace(" ", "").replace("(", "").replace(")", "")

    # Find the client by phone number — prefer one that already has a conversation
    # with this Twilio number to keep threads connected
    last_10 = from_clean[-10:] if len(from_clean) >= 10 else from_clean
    matching_clients = await db.clients.find(
        {"phone": {"$regex": last_10}}, {"_id": 0, "id": 1}
    ).to_list(10)

    client_doc = None
    if matching_clients:
        if len(matching_clients) == 1:
            client_doc = matching_clients[0]
        else:
            # Multiple clients with same phone — pick the one with the most recent
            # outbound conversation to this customer from this Twilio number
            for mc in matching_clients:
                has_conv = await db.conversations.find_one(
                    {"client_id": mc["id"], "from_number": To, "direction": "outbound"},
                    sort=[("timestamp", -1)]
                )
                if has_conv:
                    client_doc = mc
                    break
            if not client_doc:
                client_doc = matching_clients[0]

    # Find the owner of the Twilio number that received this message
    # Prefer the record that has an org_id (real org ownership) over orphaned records
    phone_owner = await db.phone_numbers.find_one(
        {"phone_number": To, "org_id": {"$ne": None}},
        {"_id": 0, "user_id": 1, "assigned_user_id": 1, "org_id": 1}
    )
    if not phone_owner:
        phone_owner = await db.phone_numbers.find_one(
            {"phone_number": To},
            {"_id": 0, "user_id": 1, "assigned_user_id": 1, "org_id": 1}
        )

    # Determine user_id — prefer assigned user, then purchaser, then last outbound sender, then client owner
    user_id = None
    if phone_owner:
        user_id = phone_owner.get("assigned_user_id") or phone_owner.get("user_id")

    if not user_id:
        last_outbound = await db.conversations.find_one(
            {"from_number": To, "direction": "outbound"},
            sort=[("timestamp", -1)]
        )
        if last_outbound:
            user_id = last_outbound.get("user_id")

    # Fallback: use the client's owner as the user_id
    if not user_id and client_doc:
        client_full = await db.clients.find_one({"id": client_doc["id"]}, {"_id": 0, "user_id": 1})
        if client_full:
            user_id = client_full.get("user_id")
            logger.info(f"Inbound SMS: resolved user_id from client owner: {user_id}")

    client_id = client_doc.get("id") if client_doc else None

    # Store in conversations (same collection the Inbox reads from)
    conv_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "client_id": client_id,
        "direction": "inbound",
        "content": Body,
        "from_number": To,
        "customer_phone": From,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "received",
        "twilio_sid": MessageSid,
    }
    await db.conversations.insert_one(conv_doc)

    # Also store in sms_messages for the messages log
    msg_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "client_id": client_id,
        "from": From,
        "to": To,
        "message": Body,
        "status": "received",
        "direction": "inbound",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "twilio_sid": MessageSid,
    }
    await db.sms_messages.insert_one(msg_doc)

    # Check trigger words — auto-remove from campaigns if matched
    if user_id and client_id and Body:
        body_lower = Body.strip().lower()
        active_enrollments = await db.campaign_enrollments.find(
            {"client_id": client_id, "status": "active"}
        ).to_list(100)
        for enrollment in active_enrollments:
            campaign = await db.enhanced_campaigns.find_one(
                {"id": enrollment["campaign_id"]}, {"_id": 0, "trigger_words": 1, "stop_on_reply": 1}
            )
            if not campaign:
                continue
            trigger_words = campaign.get("trigger_words", [])
            should_stop = False
            for tw in trigger_words:
                if tw.lower() in body_lower or body_lower == tw.lower():
                    should_stop = True
                    break
            if campaign.get("stop_on_reply") and not should_stop:
                should_stop = True
            if should_stop:
                await db.campaign_enrollments.update_one(
                    {"id": enrollment["id"]},
                    {"$set": {"status": "stopped_trigger", "stopped_at": datetime.now(timezone.utc).isoformat(), "stopped_reason": f"trigger_word: {body_lower[:50]}"}}
                )
                logger.info(f"Auto-stopped enrollment {enrollment['id']} for client {client_id} due to trigger word match")

        # Create notification
        notification = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "title": "New SMS Reply",
            "message": f"New message from {client_doc.get('name', From) if client_doc else From}",
            "type": "info",
            "link": f"/clients/{client_id}" if client_id else "/contacts",
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.notifications.insert_one(notification)

    elif not client_doc:
        # Store orphan message for unknown numbers
        await db.orphan_messages.insert_one({
            "id": str(uuid.uuid4()),
            "from_number": From,
            "to_number": To,
            "content": Body,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": "unmatched"
        })

    # Twilio expects TwiML XML response
    return Response(content=EMPTY_TWIML, media_type="application/xml")


@router.post("/webhook/status")
async def handle_status_callback(
    MessageSid: str = Form(""),
    MessageStatus: str = Form(""),
    To: str = Form(""),
    From: str = Form(""),
    ErrorCode: str = Form(""),
):
    """Webhook for SMS delivery status updates from Twilio (form-encoded POST)"""
    logger.info(f"Status callback: SID={MessageSid} Status={MessageStatus} Error={ErrorCode}")

    if MessageSid:
        update_fields = {"status": MessageStatus, "updated_at": datetime.now(timezone.utc).isoformat()}
        if ErrorCode:
            update_fields["error_code"] = ErrorCode

        await db.sms_messages.update_one(
            {"twilio_sid": MessageSid},
            {"$set": update_fields}
        )
        await db.conversations.update_one(
            {"twilio_sid": MessageSid},
            {"$set": {"status": MessageStatus}}
        )

    return Response(content=EMPTY_TWIML, media_type="application/xml")


@router.get("/messages")
async def get_sms_messages(user_id: str = Query(...), limit: int = 50):
    """Get SMS message history"""
    messages = await db.sms_messages.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    return messages
