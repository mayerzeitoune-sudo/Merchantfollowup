"""
Twilio SMS Integration Routes
Handles real SMS sending via Twilio API
"""
from fastapi import APIRouter, HTTPException, Depends, Query, Form
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

# Environment variables
TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN")
TWILIO_PHONE_NUMBER = os.environ.get("TWILIO_PHONE_NUMBER")
MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

# Initialize MongoDB
if not MONGO_URL:
    raise RuntimeError("MONGO_URL environment variable is required")
if not DB_NAME:
    raise RuntimeError("DB_NAME environment variable is required")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]


class SMSRequest(BaseModel):
    to: str
    message: str
    client_id: Optional[str] = None
    from_number: Optional[str] = None


class BulkSMSRequest(BaseModel):
    phone_numbers: List[str]
    message: str


def get_twilio_client():
    """Get Twilio client if credentials are configured"""
    sid = os.environ.get("TWILIO_ACCOUNT_SID")
    token = os.environ.get("TWILIO_AUTH_TOKEN")
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
async def send_sms(request: SMSRequest, user_id: str = Query(...)):
    """Send a single SMS message via Twilio"""
    twilio_client = get_twilio_client()
    
    if not twilio_client:
        # Log the attempt even if not configured (for testing)
        logger.warning("SMS not sent - Twilio not configured")
        
        # Store the message as queued
        msg_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "client_id": request.client_id,
            "to": request.to,
            "message": request.message,
            "status": "mock_sent",
            "direction": "outbound",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "twilio_sid": None,
            "error": "Twilio not configured - message not actually sent"
        }
        await db.sms_messages.insert_one(msg_doc)
        
        return {
            "success": False,
            "message": "Twilio is not configured. Message logged but not sent.",
            "message_id": msg_doc["id"],
            "mock": True
        }
    
    try:
        # Determine from number
        sender = request.from_number or os.environ.get("TWILIO_PHONE_NUMBER")
        if not sender:
            raise HTTPException(status_code=400, detail="No from_number provided and no default TWILIO_PHONE_NUMBER configured")
        
        # Send via Twilio
        message = twilio_client.messages.create(
            body=request.message,
            from_=sender,
            to=request.to
        )
        
        # Store the message
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
        
        # Also add to conversations for the client
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
        
        # Store failed attempt
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
    From: str = "",
    To: str = "",
    Body: str = "",
    MessageSid: str = "",
):
    """Webhook endpoint for receiving inbound SMS from Twilio (form-encoded POST)"""
    logger.info(f"Inbound SMS from {From} to {To}: {Body}")
    
    if not From or not Body:
        # Try to extract from request body if form params didn't bind
        return {"status": "received", "matched": False, "note": "No data"}
    
    # Normalize phone for matching
    from_clean = From.replace("+1", "").replace("+", "").replace("-", "").replace(" ", "").replace("(", "").replace(")", "")
    
    # Find the client by phone number (last 10 digits)
    client_doc = await db.clients.find_one({
        "phone": {"$regex": from_clean[-10:] if len(from_clean) >= 10 else from_clean}
    })
    
    # Find the user who owns this phone number (via their Twilio number)
    # For now, we'll try to find by the last outbound message to this number
    last_outbound = await db.sms_messages.find_one(
        {"to": From, "direction": "outbound"},
        sort=[("created_at", -1)]
    )
    
    user_id = last_outbound.get("user_id") if last_outbound else None
    client_id = client_doc.get("id") if client_doc else None
    
    # Store the inbound message
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
        "twilio_sid": MessageSid
    }
    await db.sms_messages.insert_one(msg_doc)
    
    # Also add to conversations
    if user_id and client_id:
        conv_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "client_id": client_id,
            "message": Body,
            "direction": "inbound",
            "channel": "sms",
            "status": "received",
            "twilio_sid": MessageSid,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.conversations.insert_one(conv_doc)
        
        # Check trigger words — auto-remove from campaigns if matched
        if Body:
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
                # Check trigger words
                for tw in trigger_words:
                    if tw.lower() in body_lower or body_lower == tw.lower():
                        should_stop = True
                        break
                # Also stop on any reply if stop_on_reply is True
                if campaign.get("stop_on_reply") and not should_stop:
                    should_stop = True
                if should_stop:
                    await db.campaign_enrollments.update_one(
                        {"id": enrollment["id"]},
                        {"$set": {"status": "stopped_trigger", "stopped_at": datetime.now(timezone.utc).isoformat(), "stopped_reason": f"trigger_word: {body_lower[:50]}"}}
                    )
                    logger.info(f"Auto-stopped enrollment {enrollment['id']} for client {client_id} due to trigger word match")
        
        # Create notification for the user
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
    
    # Return TwiML response (empty for now)
    return {"status": "received", "message_id": msg_doc["id"]}


@router.post("/webhook/status")
async def handle_status_callback(
    MessageSid: str = Query(None),
    MessageStatus: str = Query(None),
    To: str = Query(None)
):
    """Webhook endpoint for SMS delivery status updates from Twilio"""
    logger.info(f"Status update for {MessageSid}: {MessageStatus}")
    
    # Update the message status
    await db.sms_messages.update_one(
        {"twilio_sid": MessageSid},
        {"$set": {"status": MessageStatus, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    await db.conversations.update_one(
        {"twilio_sid": MessageSid},
        {"$set": {"status": MessageStatus}}
    )
    
    return {"status": "updated"}


@router.get("/messages")
async def get_sms_messages(user_id: str = Query(...), limit: int = 50):
    """Get SMS message history"""
    messages = await db.sms_messages.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return messages
