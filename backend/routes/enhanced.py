"""
Enhanced Routes for Merchant Follow Up Platform
Smart Drip Campaigns, Analytics, Lead Capture, Teams, Compliance, AI Suggestions
"""
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import csv
import io
import json
from motor.motor_asyncio import AsyncIOMotorClient
import os
import jwt
import logging

logger = logging.getLogger(__name__)

# AI imports (optional - will fail gracefully if not available)
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    AI_AVAILABLE = True
except ImportError:
    AI_AVAILABLE = False
    logger.warning("AI features not available - emergentintegrations not installed")

# Import models
from models.enhanced import (
    EnhancedCampaignCreate, EnhancedCampaignUpdate, EnhancedCampaignResponse,
    ContactCampaignEnrollment, CampaignStep, CampaignStatus, ContactCampaignStatus,
    EnhancedFollowUpCreate, EnhancedFollowUpUpdate, EnhancedFollowUpResponse,
    FollowUpStatus, MessageCreate, ConversationResponse, ChannelType,
    LeadFormCreate, LeadFormResponse, LeadSubmission, CSVImportRequest, LeadSource,
    AnalyticsResponse, AppointmentTypeCreate, AppointmentTypeResponse,
    AppointmentCreate, AppointmentResponse, AppointmentStatus,
    TeamMemberInvite, TeamMemberResponse, TeamAssignment, TeamRole,
    OptOutRecord, ComplianceSettings, AISuggestionRequest, AISuggestionResponse,
    RevivalCampaignCreate, RevivalCampaignResponse, NotificationResponse,
    PIPELINE_STAGES, EXTENDED_TAGS
)

router = APIRouter()

# Database will be injected
db = None

def set_db(database):
    global db
    db = database

# ============== AUTH DEPENDENCY ==============
security = HTTPBearer()
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')
JWT_ALGORITHM = "HS256"

_get_current_user_func = None

def set_auth_dependency(auth_func):
    global _get_current_user_func
    _get_current_user_func = auth_func

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get current user from JWT token"""
    if _get_current_user_func:
        return await _get_current_user_func(credentials)
    
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"user_id": user_id, "email": payload.get("email")}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============== ENHANCED DRIP CAMPAIGNS ==============

@router.post("/campaigns/enhanced", response_model=EnhancedCampaignResponse)
async def create_enhanced_campaign(data: EnhancedCampaignCreate, current_user: dict = Depends(get_current_user)):
    """Create a smart drip campaign with multi-step sequences"""
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Process steps with IDs
    steps = []
    for i, step in enumerate(data.steps):
        step_dict = step.model_dump() if hasattr(step, 'model_dump') else dict(step)
        step_dict['id'] = str(uuid.uuid4())
        step_dict['order'] = i
        steps.append(step_dict)
    
    campaign_doc = {
        "id": campaign_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "description": data.description,
        "steps": steps,
        "triggers": [t.model_dump() if hasattr(t, 'model_dump') else dict(t) for t in data.triggers],
        "stop_on_reply": data.stop_on_reply,
        "target_tags": data.target_tags,
        "status": data.status.value if hasattr(data.status, 'value') else data.status,
        "duration_days": data.duration_days,
        "use_funded_term": data.use_funded_term,
        "contacts_enrolled": 0,
        "contacts_completed": 0,
        "total_messages_sent": 0,
        "total_replies": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.enhanced_campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"]
    return campaign_doc

@router.get("/campaigns/enhanced", response_model=List[EnhancedCampaignResponse])
async def get_enhanced_campaigns(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all enhanced campaigns"""
    query = {"user_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    campaigns = await db.enhanced_campaigns.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return campaigns

@router.get("/campaigns/enhanced/{campaign_id}", response_model=EnhancedCampaignResponse)
async def get_enhanced_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single enhanced campaign"""
    campaign = await db.enhanced_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@router.put("/campaigns/enhanced/{campaign_id}", response_model=EnhancedCampaignResponse)
async def update_enhanced_campaign(campaign_id: str, data: EnhancedCampaignUpdate, current_user: dict = Depends(get_current_user)):
    """Update an enhanced campaign"""
    update_data = {}
    
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.steps is not None:
        steps = []
        for i, step in enumerate(data.steps):
            step_dict = step.model_dump() if hasattr(step, 'model_dump') else dict(step)
            step_dict['order'] = i
            if 'id' not in step_dict:
                step_dict['id'] = str(uuid.uuid4())
            steps.append(step_dict)
        update_data["steps"] = steps
    if data.triggers is not None:
        update_data["triggers"] = [t.model_dump() if hasattr(t, 'model_dump') else dict(t) for t in data.triggers]
    if data.stop_on_reply is not None:
        update_data["stop_on_reply"] = data.stop_on_reply
    if data.target_tags is not None:
        update_data["target_tags"] = data.target_tags
    if data.status is not None:
        update_data["status"] = data.status.value if hasattr(data.status, 'value') else data.status
    if data.duration_days is not None:
        update_data["duration_days"] = data.duration_days
    if data.use_funded_term is not None:
        update_data["use_funded_term"] = data.use_funded_term
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.enhanced_campaigns.update_one(
        {"id": campaign_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = await db.enhanced_campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return campaign

@router.delete("/campaigns/enhanced/{campaign_id}")
async def delete_enhanced_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an enhanced campaign"""
    result = await db.enhanced_campaigns.delete_one(
        {"id": campaign_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Also remove all enrollments
    await db.campaign_enrollments.delete_many({"campaign_id": campaign_id})
    
    return {"message": "Campaign deleted"}

@router.post("/campaigns/enhanced/{campaign_id}/enroll")
async def enroll_contacts_in_campaign(
    campaign_id: str,
    client_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Enroll contacts in a campaign"""
    campaign = await db.enhanced_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["user_id"]}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    enrolled = 0
    now = datetime.now(timezone.utc)
    
    for client_id in client_ids:
        # Check if already enrolled
        existing = await db.campaign_enrollments.find_one({
            "campaign_id": campaign_id,
            "client_id": client_id,
            "status": {"$in": ["active", "paused"]}
        })
        if existing:
            continue
        
        # Calculate first message time
        first_step = campaign["steps"][0] if campaign["steps"] else None
        if first_step:
            delay = timedelta(
                days=first_step.get("delay_days", 0),
                hours=first_step.get("delay_hours", 0),
                minutes=first_step.get("delay_minutes", 0)
            )
            next_message_at = (now + delay).isoformat()
        else:
            next_message_at = now.isoformat()
        
        enrollment_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["user_id"],
            "client_id": client_id,
            "campaign_id": campaign_id,
            "current_step": 0,
            "status": "active",
            "enrolled_at": now.isoformat(),
            "next_message_at": next_message_at,
            "completed_at": None,
            "stopped_reason": None
        }
        
        await db.campaign_enrollments.insert_one(enrollment_doc)
        enrolled += 1
        
        # Update client's active campaigns
        await db.clients.update_one(
            {"id": client_id},
            {"$addToSet": {"active_campaigns": campaign_id}}
        )
    
    # Update campaign stats
    await db.enhanced_campaigns.update_one(
        {"id": campaign_id},
        {"$inc": {"contacts_enrolled": enrolled}}
    )
    
    return {"message": f"Enrolled {enrolled} contacts", "enrolled": enrolled}

@router.post("/campaigns/enhanced/{campaign_id}/stop/{client_id}")
async def stop_campaign_for_contact(
    campaign_id: str,
    client_id: str,
    reason: str = "manual",
    current_user: dict = Depends(get_current_user)
):
    """Stop a campaign for a specific contact"""
    result = await db.campaign_enrollments.update_one(
        {
            "campaign_id": campaign_id,
            "client_id": client_id,
            "user_id": current_user["user_id"]
        },
        {
            "$set": {
                "status": "stopped_reply" if reason == "reply" else "paused",
                "stopped_reason": reason
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Remove from client's active campaigns
    await db.clients.update_one(
        {"id": client_id},
        {"$pull": {"active_campaigns": campaign_id}}
    )
    
    return {"message": "Campaign stopped for contact"}

@router.post("/campaigns/enhanced/{campaign_id}/resume/{client_id}")
async def resume_campaign_for_contact(
    campaign_id: str,
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Resume a paused campaign for a contact"""
    now = datetime.now(timezone.utc)
    
    result = await db.campaign_enrollments.update_one(
        {
            "campaign_id": campaign_id,
            "client_id": client_id,
            "user_id": current_user["user_id"],
            "status": {"$in": ["paused", "stopped_reply"]}
        },
        {
            "$set": {
                "status": "active",
                "next_message_at": now.isoformat(),
                "stopped_reason": None
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found or not paused")
    
    # Add back to client's active campaigns
    await db.clients.update_one(
        {"id": client_id},
        {"$addToSet": {"active_campaigns": campaign_id}}
    )
    
    return {"message": "Campaign resumed for contact"}

@router.get("/campaigns/enhanced/{campaign_id}/enrollments")
async def get_campaign_enrollments(
    campaign_id: str,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all enrollments for a campaign"""
    query = {"campaign_id": campaign_id, "user_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    enrollments = await db.campaign_enrollments.find(query, {"_id": 0}).to_list(1000)
    
    # Enrich with client info
    for enrollment in enrollments:
        client = await db.clients.find_one({"id": enrollment["client_id"]}, {"_id": 0, "name": 1, "phone": 1})
        if client:
            enrollment["client_name"] = client.get("name")
            enrollment["client_phone"] = client.get("phone")
    
    return enrollments

# ============== ENHANCED FOLLOW-UPS ==============

@router.get("/followups/today")
async def get_todays_followups(current_user: dict = Depends(get_current_user)):
    """Get today's follow-ups dashboard"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    followups = await db.followups.find(
        {
            "user_id": current_user["user_id"],
            "scheduled_date": today,
            "status": {"$in": ["pending", "snoozed"]}
        },
        {"_id": 0}
    ).sort("scheduled_time", 1).to_list(100)
    
    # Enrich with client info
    for followup in followups:
        client = await db.clients.find_one({"id": followup["client_id"]}, {"_id": 0})
        if client:
            followup["client_name"] = client.get("name")
            followup["client_phone"] = client.get("phone")
            followup["client_company"] = client.get("company")
    
    return {"date": today, "followups": followups, "count": len(followups)}

@router.get("/followups/missed")
async def get_missed_followups(current_user: dict = Depends(get_current_user)):
    """Get missed follow-ups"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    
    followups = await db.followups.find(
        {
            "user_id": current_user["user_id"],
            "scheduled_date": {"$lt": today},
            "status": "pending"
        },
        {"_id": 0}
    ).sort("scheduled_date", -1).to_list(100)
    
    # Mark as missed
    if followups:
        await db.followups.update_many(
            {
                "user_id": current_user["user_id"],
                "scheduled_date": {"$lt": today},
                "status": "pending"
            },
            {"$set": {"status": "missed"}}
        )
    
    # Enrich with client info
    for followup in followups:
        client = await db.clients.find_one({"id": followup["client_id"]}, {"_id": 0})
        if client:
            followup["client_name"] = client.get("name")
            followup["client_phone"] = client.get("phone")
    
    return {"followups": followups, "count": len(followups)}

@router.post("/followups/{followup_id}/snooze")
async def snooze_followup(
    followup_id: str,
    snooze_until: str,
    current_user: dict = Depends(get_current_user)
):
    """Snooze a follow-up"""
    result = await db.followups.update_one(
        {"id": followup_id, "user_id": current_user["user_id"]},
        {
            "$set": {
                "status": "snoozed",
                "snooze_until": snooze_until,
                "scheduled_date": snooze_until.split("T")[0] if "T" in snooze_until else snooze_until
            }
        }
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    return {"message": "Follow-up snoozed"}

@router.post("/followups/{followup_id}/complete")
async def complete_followup(
    followup_id: str,
    notes: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Mark a follow-up as complete"""
    now = datetime.now(timezone.utc).isoformat()
    
    update_data = {
        "status": "completed",
        "completed_at": now
    }
    if notes:
        update_data["completion_notes"] = notes
    
    result = await db.followups.update_one(
        {"id": followup_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    return {"message": "Follow-up completed"}

@router.post("/followups/{followup_id}/reschedule")
async def reschedule_followup(
    followup_id: str,
    new_date: str,
    new_time: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Reschedule a follow-up"""
    update_data = {
        "status": "pending",
        "scheduled_date": new_date,
        "snooze_until": None
    }
    if new_time:
        update_data["scheduled_time"] = new_time
    
    result = await db.followups.update_one(
        {"id": followup_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    return {"message": "Follow-up rescheduled"}

# ============== CONVERSATION INBOX ==============

@router.get("/inbox/conversations")
async def get_inbox_conversations(
    channel: Optional[str] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user)
):
    """Get all conversations for inbox view"""
    # Build client query
    client_query = {"user_id": current_user["user_id"]}
    if tag:
        client_query["tags"] = tag
    if search:
        client_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]
    
    clients = await db.clients.find(client_query, {"_id": 0}).to_list(500)
    
    conversations = []
    for client in clients:
        # Get last message
        last_msg = await db.conversations.find_one(
            {"client_id": client["id"], "user_id": current_user["user_id"]},
            {"_id": 0},
            sort=[("timestamp", -1)]
        )
        
        # Get unread count
        unread = await db.conversations.count_documents({
            "client_id": client["id"],
            "user_id": current_user["user_id"],
            "direction": "inbound",
            "read": False
        })
        
        if unread_only and unread == 0:
            continue
        
        conversations.append({
            "id": client["id"],
            "user_id": current_user["user_id"],
            "client_id": client["id"],
            "client_name": client["name"],
            "client_phone": client.get("phone"),
            "client_email": client.get("email"),
            "last_message": last_msg.get("content") if last_msg else None,
            "last_message_at": last_msg.get("timestamp") if last_msg else None,
            "unread_count": unread,
            "channel": last_msg.get("channel", "sms") if last_msg else "sms",
            "tags": client.get("tags", [])
        })
    
    # Sort by last message
    conversations.sort(key=lambda x: x.get("last_message_at") or "", reverse=True)
    
    return conversations

@router.post("/inbox/mark-read/{client_id}")
async def mark_conversation_read(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Mark all messages in a conversation as read"""
    result = await db.conversations.update_many(
        {
            "client_id": client_id,
            "user_id": current_user["user_id"],
            "direction": "inbound"
        },
        {"$set": {"read": True}}
    )
    
    return {"message": f"Marked {result.modified_count} messages as read"}

@router.get("/inbox/search")
async def search_conversations(
    query: str,
    current_user: dict = Depends(get_current_user)
):
    """Search through all conversations"""
    # Search in messages
    messages = await db.conversations.find(
        {
            "user_id": current_user["user_id"],
            "content": {"$regex": query, "$options": "i"}
        },
        {"_id": 0}
    ).limit(50).to_list(50)
    
    # Group by client
    results = {}
    for msg in messages:
        client_id = msg["client_id"]
        if client_id not in results:
            client = await db.clients.find_one({"id": client_id}, {"_id": 0, "name": 1, "phone": 1})
            results[client_id] = {
                "client_id": client_id,
                "client_name": client.get("name") if client else "Unknown",
                "client_phone": client.get("phone") if client else "",
                "matching_messages": []
            }
        results[client_id]["matching_messages"].append(msg)
    
    return list(results.values())

# ============== LEAD CAPTURE ==============

@router.post("/leads/forms", response_model=LeadFormResponse)
async def create_lead_form(data: LeadFormCreate, current_user: dict = Depends(get_current_user)):
    """Create a lead capture form"""
    form_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate form URL
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    form_url = f"{base_url}/api/leads/submit/{form_id}"
    
    form_doc = {
        "id": form_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "fields": data.fields,
        "redirect_url": data.redirect_url,
        "auto_campaign_id": data.auto_campaign_id,
        "auto_tags": data.auto_tags,
        "webhook_url": data.webhook_url,
        "form_url": form_url,
        "submissions_count": 0,
        "created_at": now
    }
    
    await db.lead_forms.insert_one(form_doc)
    del form_doc["_id"]
    return form_doc

@router.get("/leads/forms", response_model=List[LeadFormResponse])
async def get_lead_forms(current_user: dict = Depends(get_current_user)):
    """Get all lead forms"""
    forms = await db.lead_forms.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    return forms

@router.post("/leads/submit/{form_id}")
async def submit_lead_form(form_id: str, data: Dict[str, Any], background_tasks: BackgroundTasks):
    """Public endpoint for lead form submission"""
    form = await db.lead_forms.find_one({"id": form_id})
    if not form:
        raise HTTPException(status_code=404, detail="Form not found")
    
    # Create client from submission
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client_doc = {
        "id": client_id,
        "user_id": form["user_id"],
        "name": data.get("name", "Unknown"),
        "email": data.get("email"),
        "phone": data.get("phone", ""),
        "company": data.get("company"),
        "notes": f"Lead from form: {form['name']}",
        "balance": 0.0,
        "tags": form.get("auto_tags", []),
        "source": "form",
        "pipeline_stage": "new",
        "custom_fields": {k: v for k, v in data.items() if k not in ["name", "email", "phone", "company"]},
        "opted_in_sms": True,
        "opted_in_email": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client_doc)
    
    # Update form submissions count
    await db.lead_forms.update_one(
        {"id": form_id},
        {"$inc": {"submissions_count": 1}}
    )
    
    # Create notification
    notification_doc = {
        "id": str(uuid.uuid4()),
        "user_id": form["user_id"],
        "type": "new_lead",
        "title": "New Lead Captured",
        "body": f"New lead from {form['name']}: {data.get('name', 'Unknown')}",
        "data": {"client_id": client_id, "form_id": form_id},
        "read": False,
        "created_at": now
    }
    await db.notifications.insert_one(notification_doc)
    
    # Auto-enroll in campaign if configured
    if form.get("auto_campaign_id"):
        # This would trigger campaign enrollment
        pass
    
    return {"message": "Lead captured", "redirect_url": form.get("redirect_url")}

@router.post("/leads/import/csv")
async def import_leads_csv(
    file: UploadFile = File(...),
    auto_tags: str = "",
    current_user: dict = Depends(get_current_user)
):
    """Import leads from CSV file"""
    content = await file.read()
    decoded = content.decode("utf-8")
    reader = csv.DictReader(io.StringIO(decoded))
    
    tags = [t.strip() for t in auto_tags.split(",") if t.strip()]
    imported = 0
    errors = []
    now = datetime.now(timezone.utc).isoformat()
    
    for row in reader:
        try:
            # Map common field names
            name = row.get("name") or row.get("Name") or row.get("full_name") or "Unknown"
            phone = row.get("phone") or row.get("Phone") or row.get("mobile") or ""
            email = row.get("email") or row.get("Email") or None
            company = row.get("company") or row.get("Company") or row.get("business") or None
            
            if not phone:
                errors.append(f"Missing phone for {name}")
                continue
            
            client_doc = {
                "id": str(uuid.uuid4()),
                "user_id": current_user["user_id"],
                "name": name,
                "email": email,
                "phone": phone,
                "company": company,
                "notes": None,
                "balance": 0.0,
                "tags": tags,
                "source": "csv",
                "pipeline_stage": "new",
                "opted_in_sms": True,
                "opted_in_email": True,
                "created_at": now,
                "updated_at": now
            }
            
            await db.clients.insert_one(client_doc)
            imported += 1
        except Exception as e:
            errors.append(str(e))
    
    return {"imported": imported, "errors": errors}

@router.post("/leads/webhook")
async def create_lead_webhook(current_user: dict = Depends(get_current_user)):
    """Generate a webhook URL for lead capture"""
    webhook_id = str(uuid.uuid4())
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    
    webhook_doc = {
        "id": webhook_id,
        "user_id": current_user["user_id"],
        "url": f"{base_url}/api/leads/webhook/{webhook_id}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.lead_webhooks.insert_one(webhook_doc)
    
    return {"webhook_url": webhook_doc["url"], "id": webhook_id}

@router.post("/leads/webhook/{webhook_id}")
async def receive_webhook_lead(webhook_id: str, data: Dict[str, Any]):
    """Receive leads via webhook (Zapier, etc.)"""
    webhook = await db.lead_webhooks.find_one({"id": webhook_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Create client
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client_doc = {
        "id": client_id,
        "user_id": webhook["user_id"],
        "name": data.get("name", "Unknown"),
        "email": data.get("email"),
        "phone": data.get("phone", ""),
        "company": data.get("company"),
        "notes": "Lead from webhook",
        "balance": 0.0,
        "tags": data.get("tags", []),
        "source": "api",
        "pipeline_stage": "new",
        "custom_fields": data.get("custom_fields", {}),
        "opted_in_sms": True,
        "opted_in_email": True,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client_doc)
    
    return {"success": True, "client_id": client_id}

# ============== ANALYTICS ==============

@router.get("/analytics/overview")
async def get_analytics_overview(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get analytics overview"""
    user_id = current_user["user_id"]
    
    # Default to last 30 days
    if not end_date:
        end_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    if not start_date:
        start_date = (datetime.now(timezone.utc) - timedelta(days=30)).strftime("%Y-%m-%d")
    
    # Get message counts
    total_sent = await db.conversations.count_documents({
        "user_id": user_id,
        "direction": "outbound"
    })
    
    total_replies = await db.conversations.count_documents({
        "user_id": user_id,
        "direction": "inbound"
    })
    
    response_rate = (total_replies / total_sent * 100) if total_sent > 0 else 0
    
    # Get active campaigns
    active_campaigns = await db.enhanced_campaigns.count_documents({
        "user_id": user_id,
        "status": "active"
    })
    
    # Get top templates
    top_templates = await db.templates.find(
        {"user_id": user_id},
        {"_id": 0, "name": 1, "use_count": 1}
    ).sort("use_count", -1).limit(5).to_list(5)
    
    # Get top campaigns
    top_campaigns = await db.enhanced_campaigns.find(
        {"user_id": user_id},
        {"_id": 0, "name": 1, "total_messages_sent": 1, "total_replies": 1}
    ).sort("total_replies", -1).limit(5).to_list(5)
    
    # Get messages by day (simplified)
    messages_by_day = []
    replies_by_day = []
    
    return {
        "total_messages_sent": total_sent,
        "total_replies": total_replies,
        "response_rate": round(response_rate, 1),
        "conversations_started": total_replies,
        "campaigns_active": active_campaigns,
        "top_templates": top_templates,
        "top_campaigns": top_campaigns,
        "messages_by_day": messages_by_day,
        "replies_by_day": replies_by_day
    }

@router.get("/analytics/campaigns/{campaign_id}")
async def get_campaign_analytics(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Get analytics for a specific campaign"""
    campaign = await db.enhanced_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Get enrollment stats
    total_enrolled = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id})
    active = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id, "status": "active"})
    completed = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id, "status": "completed"})
    stopped = await db.campaign_enrollments.count_documents({"campaign_id": campaign_id, "status": "stopped_reply"})
    
    return {
        "campaign": campaign,
        "stats": {
            "total_enrolled": total_enrolled,
            "active": active,
            "completed": completed,
            "stopped_on_reply": stopped,
            "completion_rate": round((completed / total_enrolled * 100) if total_enrolled > 0 else 0, 1)
        }
    }

# ============== APPOINTMENTS ==============

@router.post("/appointments/types", response_model=AppointmentTypeResponse)
async def create_appointment_type(data: AppointmentTypeCreate, current_user: dict = Depends(get_current_user)):
    """Create an appointment type"""
    type_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    base_url = os.environ.get("REACT_APP_BACKEND_URL", "")
    booking_url = f"{base_url}/book/{current_user['user_id']}/{type_id}"
    
    type_doc = {
        "id": type_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "duration_minutes": data.duration_minutes,
        "description": data.description,
        "color": data.color,
        "buffer_minutes": data.buffer_minutes,
        "booking_url": booking_url,
        "created_at": now
    }
    
    await db.appointment_types.insert_one(type_doc)
    del type_doc["_id"]
    return type_doc

@router.get("/appointments/types", response_model=List[AppointmentTypeResponse])
async def get_appointment_types(current_user: dict = Depends(get_current_user)):
    """Get all appointment types"""
    types = await db.appointment_types.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(50)
    return types

@router.post("/appointments", response_model=AppointmentResponse)
async def create_appointment(data: AppointmentCreate, current_user: dict = Depends(get_current_user)):
    """Create an appointment"""
    appointment_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Get appointment type
    apt_type = await db.appointment_types.find_one({"id": data.appointment_type_id})
    if not apt_type:
        raise HTTPException(status_code=404, detail="Appointment type not found")
    
    # Get client
    client = await db.clients.find_one({"id": data.client_id})
    
    appointment_doc = {
        "id": appointment_id,
        "user_id": current_user["user_id"],
        "client_id": data.client_id,
        "client_name": client.get("name") if client else None,
        "appointment_type_id": data.appointment_type_id,
        "appointment_type_name": apt_type.get("name"),
        "scheduled_date": data.scheduled_date,
        "scheduled_time": data.scheduled_time,
        "duration_minutes": apt_type.get("duration_minutes", 30),
        "notes": data.notes,
        "status": "scheduled",
        "reminder_sent": False,
        "created_at": now
    }
    
    await db.appointments.insert_one(appointment_doc)
    del appointment_doc["_id"]
    return appointment_doc

@router.get("/appointments", response_model=List[AppointmentResponse])
async def get_appointments(
    date: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get appointments"""
    query = {"user_id": current_user["user_id"]}
    if date:
        query["scheduled_date"] = date
    if status:
        query["status"] = status
    
    appointments = await db.appointments.find(query, {"_id": 0}).sort("scheduled_date", 1).to_list(100)
    return appointments

@router.put("/appointments/{appointment_id}/status")
async def update_appointment_status(
    appointment_id: str,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """Update appointment status"""
    result = await db.appointments.update_one(
        {"id": appointment_id, "user_id": current_user["user_id"]},
        {"$set": {"status": status}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")
    
    return {"message": "Appointment updated"}

# ============== SMS COMPLIANCE ==============

@router.get("/compliance/settings")
async def get_compliance_settings(current_user: dict = Depends(get_current_user)):
    """Get compliance settings"""
    settings = await db.compliance_settings.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not settings:
        # Return defaults
        return {
            "stop_keywords": ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"],
            "opt_in_required": True,
            "auto_reply_on_stop": "You have been unsubscribed. Reply START to re-subscribe.",
            "quiet_hours_start": None,
            "quiet_hours_end": None
        }
    
    return settings

@router.put("/compliance/settings")
async def update_compliance_settings(data: ComplianceSettings, current_user: dict = Depends(get_current_user)):
    """Update compliance settings"""
    await db.compliance_settings.update_one(
        {"user_id": current_user["user_id"]},
        {"$set": data.model_dump()},
        upsert=True
    )
    
    return {"message": "Settings updated"}

@router.get("/compliance/opt-outs")
async def get_opt_outs(current_user: dict = Depends(get_current_user)):
    """Get all opted-out contacts"""
    opt_outs = await db.opt_outs.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    return opt_outs

@router.post("/compliance/opt-out")
async def add_opt_out(phone_number: str, reason: str = "manual", current_user: dict = Depends(get_current_user)):
    """Manually add an opt-out"""
    now = datetime.now(timezone.utc).isoformat()
    
    opt_out_doc = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "phone_number": phone_number,
        "opted_out_at": now,
        "reason": reason,
        "channel": "sms"
    }
    
    await db.opt_outs.update_one(
        {"user_id": current_user["user_id"], "phone_number": phone_number},
        {"$set": opt_out_doc},
        upsert=True
    )
    
    # Update client opt-in status
    await db.clients.update_one(
        {"user_id": current_user["user_id"], "phone": phone_number},
        {"$set": {"opted_in_sms": False}}
    )
    
    return {"message": "Contact opted out"}

@router.delete("/compliance/opt-out/{phone_number}")
async def remove_opt_out(phone_number: str, current_user: dict = Depends(get_current_user)):
    """Remove an opt-out (re-subscribe)"""
    await db.opt_outs.delete_one(
        {"user_id": current_user["user_id"], "phone_number": phone_number}
    )
    
    # Update client opt-in status
    await db.clients.update_one(
        {"user_id": current_user["user_id"], "phone": phone_number},
        {"$set": {"opted_in_sms": True}}
    )
    
    return {"message": "Contact re-subscribed"}

# ============== AI SUGGESTIONS ==============

@router.post("/ai/suggest")
async def get_ai_suggestions(data: AISuggestionRequest, current_user: dict = Depends(get_current_user)):
    """Get AI-powered message suggestions"""
    if not AI_AVAILABLE:
        return {"suggestions": ["AI features not available. Please contact support."]}
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return {"suggestions": ["Please configure your API key for AI suggestions."]}
    
    try:
        tone_instructions = {
            "professional": "Use a professional, business-like tone.",
            "friendly": "Use a warm, friendly, and approachable tone.",
            "urgent": "Use an urgent tone that conveys importance and time-sensitivity."
        }
        
        action_prompts = {
            "reply": "Generate 3 different reply options for this conversation.",
            "follow_up": "Generate 3 follow-up message options to re-engage this contact.",
            "rewrite": "Rewrite the last message with improvements for clarity and persuasion."
        }
        
        system_message = f"""You are an expert sales and communication assistant for a merchant financing business.
{tone_instructions.get(data.tone, tone_instructions['professional'])}
{action_prompts.get(data.action, action_prompts['reply'])}

Format your response as JSON:
{{"suggestions": ["option 1", "option 2", "option 3"]}}
"""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-suggest-{uuid.uuid4()}",
            system_message=system_message
        ).with_model("openai", "gpt-5.2")
        
        # Format conversation context
        context = "\n".join([
            f"{'Client' if msg['role'] == 'client' else 'You'}: {msg['content']}"
            for msg in data.conversation_context[-5:]  # Last 5 messages
        ])
        
        user_message = UserMessage(text=f"Conversation:\n{context}\n\nGenerate suggestions:")
        response = await chat.send_message(user_message)
        
        # Parse response
        try:
            result = json.loads(response.strip().replace("```json", "").replace("```", ""))
            return result
        except Exception:
            # Fallback parsing
            return {"suggestions": [response.strip()]}
            
    except Exception as e:
        return {"suggestions": [f"AI suggestion error: {str(e)}"]}

@router.post("/ai/rewrite")
async def rewrite_message(message: str, tone: str = "professional", current_user: dict = Depends(get_current_user)):
    """Rewrite a message with AI"""
    if not AI_AVAILABLE:
        return {"rewritten": message}
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return {"rewritten": message}
    
    try:
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-rewrite-{uuid.uuid4()}",
            system_message=f"Rewrite the following message to be more {tone} and persuasive. Keep it concise. Return only the rewritten message, nothing else."
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=message))
        return {"rewritten": response.strip()}
        
    except Exception:
        return {"rewritten": message}

# ============== DEAD LEAD REVIVAL ==============

@router.post("/revival/campaigns", response_model=RevivalCampaignResponse)
async def create_revival_campaign(data: RevivalCampaignCreate, current_user: dict = Depends(get_current_user)):
    """Create a dead lead revival campaign"""
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Calculate eligible contacts
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=data.days_inactive)).isoformat()
    
    query = {
        "user_id": current_user["user_id"],
        "$or": [
            {"last_contacted_at": {"$lt": cutoff_date}},
            {"last_contacted_at": None}
        ],
        "opted_in_sms": True
    }
    
    if data.target_tags:
        query["tags"] = {"$in": data.target_tags}
    if data.exclude_tags:
        query["tags"] = {"$nin": data.exclude_tags}
    
    eligible_count = await db.clients.count_documents(query)
    
    campaign_doc = {
        "id": campaign_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "days_inactive": data.days_inactive,
        "target_tags": data.target_tags,
        "exclude_tags": data.exclude_tags,
        "message": data.message,
        "channel": data.channel.value if hasattr(data.channel, 'value') else data.channel,
        "eligible_contacts": eligible_count,
        "messages_sent": 0,
        "replies_received": 0,
        "last_run_at": None,
        "status": "draft",
        "created_at": now
    }
    
    await db.revival_campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"]
    return campaign_doc

@router.get("/revival/campaigns", response_model=List[RevivalCampaignResponse])
async def get_revival_campaigns(current_user: dict = Depends(get_current_user)):
    """Get all revival campaigns"""
    campaigns = await db.revival_campaigns.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(50)
    return campaigns

@router.post("/revival/campaigns/{campaign_id}/run")
async def run_revival_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    """Run a revival campaign"""
    campaign = await db.revival_campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["user_id"]}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    # Find eligible contacts
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=campaign["days_inactive"])).isoformat()
    
    query = {
        "user_id": current_user["user_id"],
        "$or": [
            {"last_contacted_at": {"$lt": cutoff_date}},
            {"last_contacted_at": None}
        ],
        "opted_in_sms": True
    }
    
    if campaign.get("target_tags"):
        query["tags"] = {"$in": campaign["target_tags"]}
    if campaign.get("exclude_tags"):
        query["tags"] = {"$nin": campaign["exclude_tags"]}
    
    contacts = await db.clients.find(query, {"_id": 0, "id": 1, "name": 1, "phone": 1}).to_list(500)
    
    now = datetime.now(timezone.utc).isoformat()
    messages_sent = 0
    
    for contact in contacts:
        # Create message
        message_content = campaign["message"].replace("{name}", contact.get("name", ""))
        
        message_doc = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["user_id"],
            "client_id": contact["id"],
            "direction": "outbound",
            "content": message_content,
            "channel": campaign.get("channel", "sms"),
            "timestamp": now,
            "status": "pending_provider",
            "revival_campaign_id": campaign_id
        }
        
        await db.conversations.insert_one(message_doc)
        messages_sent += 1
        
        # Update client last contacted
        await db.clients.update_one(
            {"id": contact["id"]},
            {"$set": {"last_contacted_at": now}}
        )
    
    # Update campaign stats
    await db.revival_campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {"last_run_at": now, "status": "completed"},
            "$inc": {"messages_sent": messages_sent}
        }
    )
    
    return {"message": f"Sent {messages_sent} revival messages", "messages_sent": messages_sent}

# ============== NOTIFICATIONS ==============

@router.get("/notifications")
async def get_notifications(
    unread_only: bool = False,
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get notifications"""
    query = {"user_id": current_user["user_id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(query, {"_id": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    unread_count = await db.notifications.count_documents({"user_id": current_user["user_id"], "read": False})
    
    return {"notifications": notifications, "unread_count": unread_count}

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}

@router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}

# ============== CONTACT SEGMENTATION ==============

@router.get("/segments/tags")
async def get_all_tags(current_user: dict = Depends(get_current_user)):
    """Get all tags with counts"""
    # Get custom tags from clients
    pipeline = [
        {"$match": {"user_id": current_user["user_id"]}},
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    
    tag_counts = await db.clients.aggregate(pipeline).to_list(100)
    
    # Merge with predefined tags
    tag_map = {t["_id"]: t["count"] for t in tag_counts}
    
    all_tags = []
    for tag in EXTENDED_TAGS:
        all_tags.append({"tag": tag, "count": tag_map.get(tag, 0), "is_system": True})
    
    # Add custom tags
    for tag_data in tag_counts:
        if tag_data["_id"] not in EXTENDED_TAGS:
            all_tags.append({"tag": tag_data["_id"], "count": tag_data["count"], "is_system": False})
    
    return {"tags": all_tags}

@router.post("/segments/bulk-tag")
async def bulk_add_tags(
    client_ids: List[str],
    tags: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Add tags to multiple contacts"""
    result = await db.clients.update_many(
        {"id": {"$in": client_ids}, "user_id": current_user["user_id"]},
        {"$addToSet": {"tags": {"$each": tags}}}
    )
    
    return {"message": f"Updated {result.modified_count} contacts"}

@router.post("/segments/bulk-remove-tag")
async def bulk_remove_tags(
    client_ids: List[str],
    tags: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Remove tags from multiple contacts"""
    result = await db.clients.update_many(
        {"id": {"$in": client_ids}, "user_id": current_user["user_id"]},
        {"$pull": {"tags": {"$in": tags}}}
    )
    
    return {"message": f"Updated {result.modified_count} contacts"}

@router.get("/segments/pipeline")
async def get_pipeline_stats(current_user: dict = Depends(get_current_user)):
    """Get pipeline stage statistics"""
    pipeline = [
        {"$match": {"user_id": current_user["user_id"]}},
        {"$group": {"_id": "$pipeline_stage", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}}
    ]
    
    stage_counts = await db.clients.aggregate(pipeline).to_list(20)
    
    # Format with all stages
    result = []
    stage_map = {s["_id"]: s["count"] for s in stage_counts}
    
    for stage in PIPELINE_STAGES:
        result.append({"stage": stage, "count": stage_map.get(stage, 0)})
    
    return {"stages": result}

@router.put("/clients/{client_id}/pipeline")
async def update_client_pipeline(
    client_id: str,
    stage: str,
    current_user: dict = Depends(get_current_user)
):
    """Update client pipeline stage"""
    if stage not in PIPELINE_STAGES:
        raise HTTPException(status_code=400, detail="Invalid pipeline stage")
    
    # Build query based on user role (org_admin/admin can update any client)
    if current_user.get("role") in ["org_admin", "admin"]:
        query = {"id": client_id}
    else:
        query = {"id": client_id, "user_id": current_user["user_id"]}
    
    # Map stages to tags for syncing
    STAGE_TO_TAG = {
        'new_lead': 'New Lead',
        'interested': 'Interested',
        'application_sent': 'Application Sent',
        'docs_submitted': 'Docs Submitted',
        'approved': 'Approved',
        'funded': 'Funded',
        'dead': 'Dead',
        'future': 'Future',
    }
    
    # Get current client to update tags
    client = await db.clients.find_one(query, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update tags - remove old stage tags and add new one
    current_tags = client.get("tags", [])
    stage_tag_values = list(STAGE_TO_TAG.values())
    updated_tags = [t for t in current_tags if t not in stage_tag_values]
    updated_tags.append(STAGE_TO_TAG.get(stage, stage))
    
    await db.clients.update_one(
        query,
        {"$set": {
            "pipeline_stage": stage,
            "tags": updated_tags,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Pipeline stage updated"}


# ============== PRE-BUILT DRIP CAMPAIGNS ==============

from campaign_templates import ALL_PREBUILT_CAMPAIGNS

@router.get("/campaigns/prebuilt")
async def get_prebuilt_campaigns(current_user: dict = Depends(get_current_user)):
    """List all available pre-built campaign templates"""
    templates = []
    for key, template in ALL_PREBUILT_CAMPAIGNS.items():
        templates.append({
            "id": key,
            "name": template["name"],
            "description": template["description"],
            "campaign_type": template["campaign_type"],
            "target_tag": template["target_tag"],
            "total_steps": len(template["steps"]),
            "total_days": template["steps"][-1]["day"] if template["steps"] else 0
        })
    return templates

@router.get("/campaigns/prebuilt/{campaign_type}")
async def get_prebuilt_campaign_detail(campaign_type: str, current_user: dict = Depends(get_current_user)):
    """Get full details of a pre-built campaign template"""
    template = ALL_PREBUILT_CAMPAIGNS.get(campaign_type)
    if not template:
        raise HTTPException(status_code=404, detail="Campaign template not found")
    return template

@router.post("/campaigns/prebuilt/{campaign_type}/launch")
async def launch_prebuilt_campaign(
    campaign_type: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Launch a pre-built campaign with bulk enrollment by tag"""
    template = ALL_PREBUILT_CAMPAIGNS.get(campaign_type)
    if not template:
        raise HTTPException(status_code=404, detail="Campaign template not found")
    
    user = await db.users.find_one({"id": current_user["user_id"]})
    now = datetime.now(timezone.utc).isoformat()
    campaign_id = str(uuid.uuid4())
    
    # Get accessible user IDs for this user
    from server import get_accessible_user_ids
    accessible_ids = await get_accessible_user_ids(current_user)
    
    # Create the campaign
    campaign_doc = {
        "id": campaign_id,
        "user_id": current_user["user_id"],
        "org_id": user.get("org_id") if user else None,
        "name": data.get("name", template["name"]),
        "description": template["description"],
        "campaign_type": campaign_type,
        "type": "prebuilt",
        "target_tag": template["target_tag"],
        "steps": template["steps"],
        "status": "active",
        "created_at": now,
        "started_at": now
    }
    
    await db.enhanced_campaigns.insert_one(campaign_doc)
    
    # Enroll clients by tag
    tag = data.get("tag", template["target_tag"])
    clients = await db.clients.find(
        {"user_id": {"$in": accessible_ids}, "tags": tag},
        {"_id": 0, "id": 1, "name": 1, "phone": 1}
    ).to_list(10000)
    
    enrolled_count = 0
    for client in clients:
        # Check if client is already enrolled in an active campaign of same type
        existing = await db.campaign_enrollments.find_one({
            "client_id": client["id"],
            "campaign_type": campaign_type,
            "status": "active"
        })
        if existing:
            continue
        
        enrollment = {
            "id": str(uuid.uuid4()),
            "campaign_id": campaign_id,
            "campaign_type": campaign_type,
            "client_id": client["id"],
            "user_id": current_user["user_id"],
            "status": "active",
            "current_step": 0,
            "start_date": now,
            "next_send_date": now,  # First message goes immediately
            "last_sent_date": None,
            "created_at": now
        }
        await db.campaign_enrollments.insert_one(enrollment)
        enrolled_count += 1
    
    # Clean up _id from campaign_doc
    if "_id" in campaign_doc:
        del campaign_doc["_id"]
    
    return {
        "campaign_id": campaign_id,
        "enrolled_count": enrolled_count,
        "total_clients_matched": len(clients),
        "message": f"Campaign launched with {enrolled_count} clients enrolled"
    }

@router.post("/campaigns/{campaign_id}/remove-client/{client_id}")
async def remove_client_from_campaign(
    campaign_id: str,
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a client from an active campaign and change their tag to Responded"""
    result = await db.campaign_enrollments.update_one(
        {"campaign_id": campaign_id, "client_id": client_id, "status": "active"},
        {"$set": {"status": "removed", "removed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Change client tag from campaign target to "Responded"
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if client:
        tags = client.get("tags", [])
        # Remove campaign-related tags and add "Responded"
        campaign_tags = ["New Lead", "new_lead"]
        updated_tags = [t for t in tags if t not in campaign_tags]
        if "Responded" not in updated_tags:
            updated_tags.append("Responded")
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"tags": updated_tags, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Client removed from campaign and tagged as Responded"}

@router.get("/campaigns/client/{client_id}/active")
async def get_active_campaigns_for_client(
    client_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Check if a client is in any active campaign"""
    enrollments = await db.campaign_enrollments.find(
        {"client_id": client_id, "status": "active"},
        {"_id": 0}
    ).to_list(100)
    
    result = []
    for enrollment in enrollments:
        campaign = await db.enhanced_campaigns.find_one(
            {"id": enrollment["campaign_id"]},
            {"_id": 0, "name": 1, "id": 1, "campaign_type": 1}
        )
        if campaign:
            result.append({
                "enrollment_id": enrollment["id"],
                "campaign_id": enrollment["campaign_id"],
                "campaign_name": campaign.get("name"),
                "campaign_type": campaign.get("campaign_type"),
                "current_step": enrollment.get("current_step", 0),
                "start_date": enrollment.get("start_date")
            })
    
    return result

@router.post("/campaigns/process-due")
async def process_due_campaign_messages(current_user: dict = Depends(get_current_user)):
    """Process and send due campaign messages (called by scheduler or manually)"""
    now = datetime.now(timezone.utc).isoformat()
    
    # Find all active enrollments where next_send_date <= now
    due_enrollments = await db.campaign_enrollments.find(
        {"status": "active", "next_send_date": {"$lte": now}},
        {"_id": 0}
    ).to_list(1000)
    
    sent_count = 0
    for enrollment in due_enrollments:
        campaign = await db.enhanced_campaigns.find_one(
            {"id": enrollment["campaign_id"]},
            {"_id": 0}
        )
        if not campaign or campaign.get("status") != "active":
            continue
        
        steps = campaign.get("steps", [])
        current_step = enrollment.get("current_step", 0)
        
        if current_step >= len(steps):
            # Campaign completed for this client
            await db.campaign_enrollments.update_one(
                {"id": enrollment["id"]},
                {"$set": {"status": "completed"}}
            )
            continue
        
        step = steps[current_step]
        client = await db.clients.find_one({"id": enrollment["client_id"]}, {"_id": 0})
        if not client:
            continue
        
        # Replace template variables
        message = step["message"]
        first_name = (client.get("name") or "").split(" ")[0]
        amount = client.get("amount_requested")
        amount_str = f"{amount:,.0f}" if amount else "the amount"
        company_name = client.get("company") or "your business"
        
        message = message.replace("{first_name}", first_name)
        message = message.replace("${amount_requested}", f"${amount_str}")
        message = message.replace("{company_name}", company_name)
        
        # Store as a scheduled message
        msg_doc = {
            "id": str(uuid.uuid4()),
            "campaign_id": enrollment["campaign_id"],
            "enrollment_id": enrollment["id"],
            "client_id": enrollment["client_id"],
            "user_id": enrollment["user_id"],
            "message": message,
            "step_label": step.get("label"),
            "status": "pending",
            "created_at": now
        }
        await db.campaign_messages.insert_one(msg_doc)
        
        # Calculate next send date
        next_step = current_step + 1
        if next_step < len(steps):
            days_diff = steps[next_step]["day"] - steps[current_step]["day"]
            from datetime import timedelta
            next_date = datetime.now(timezone.utc) + timedelta(days=days_diff)
            next_send = next_date.isoformat()
        else:
            next_send = None
        
        update = {
            "current_step": next_step,
            "last_sent_date": now
        }
        if next_send:
            update["next_send_date"] = next_send
        
        await db.campaign_enrollments.update_one(
            {"id": enrollment["id"]},
            {"$set": update}
        )
        sent_count += 1
    
    return {"processed": sent_count, "total_due": len(due_enrollments)}
