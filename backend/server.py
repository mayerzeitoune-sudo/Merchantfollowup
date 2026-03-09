from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random
import string
from emergentintegrations.llm.chat import LlmChat, UserMessage
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'default-secret-key')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI(title="Merchant Follow Up API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ============== MODELS ==============

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    is_verified: bool = False
    created_at: str

class VerifyOTP(BaseModel):
    email: EmailStr
    otp: str

class ForgotPassword(BaseModel):
    email: EmailStr

class ResetPassword(BaseModel):
    email: EmailStr
    otp: str
    new_password: str

# Client Models
class ClientCreate(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None
    balance: float = 0.0

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    balance: Optional[float] = None

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None
    balance: float = 0.0
    created_at: str
    updated_at: str

# Payment Reminder Models
class ReminderCreate(BaseModel):
    client_id: str
    amount_due: float
    due_date: str
    message: Optional[str] = None
    status: str = "pending"

class ReminderUpdate(BaseModel):
    amount_due: Optional[float] = None
    due_date: Optional[str] = None
    message: Optional[str] = None
    status: Optional[str] = None

class ReminderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    amount_due: float
    due_date: str
    message: Optional[str] = None
    status: str
    sent_at: Optional[str] = None
    created_at: str

# Follow-up Models
class FollowUpCreate(BaseModel):
    client_id: str
    title: str
    description: Optional[str] = None
    scheduled_date: str
    scheduled_time: Optional[str] = "09:00"
    reminder_type: str = "call"

class FollowUpUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[str] = None
    scheduled_time: Optional[str] = None
    reminder_type: Optional[str] = None
    status: Optional[str] = None

class FollowUpResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    client_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    scheduled_date: str
    scheduled_time: str
    reminder_type: str
    status: str
    created_at: str

# Campaign Models
class KeywordTrigger(BaseModel):
    keywords: List[str]
    response_message: str
    action: str = "reply"

class CampaignCreate(BaseModel):
    name: str
    description: Optional[str] = None
    initial_message: str
    triggers: List[KeywordTrigger] = []
    delay_hours: int = 24
    follow_up_messages: List[str] = []
    status: str = "draft"

class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    initial_message: Optional[str] = None
    triggers: Optional[List[KeywordTrigger]] = None
    delay_hours: Optional[int] = None
    follow_up_messages: Optional[List[str]] = None
    status: Optional[str] = None

class CampaignResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    description: Optional[str] = None
    initial_message: str
    triggers: List[Dict[str, Any]] = []
    delay_hours: int
    follow_up_messages: List[str] = []
    status: str
    created_at: str
    updated_at: str

# SMS Provider Models
class SMSProviderConfig(BaseModel):
    provider: str  # twilio, telnyx, vonage, plivo, bandwidth
    account_sid: Optional[str] = None
    auth_token: Optional[str] = None
    api_key: Optional[str] = None
    api_secret: Optional[str] = None
    from_number: str
    is_active: bool = False

class SMSProviderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    provider: str
    from_number: str
    is_active: bool
    created_at: str

# AI Response Matching
class MatchRequest(BaseModel):
    incoming_message: str
    keywords: List[str]

class MatchResponse(BaseModel):
    matched: bool
    matched_keyword: Optional[str] = None
    confidence: float

# ============== HELPER FUNCTIONS ==============

def generate_otp():
    return ''.join(random.choices(string.digits, k=6))

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
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

async def ai_match_response(incoming_message: str, keywords: List[str]) -> dict:
    """Use AI to match incoming message to keywords with semantic understanding"""
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            # Fallback to simple matching
            incoming_lower = incoming_message.lower().strip()
            for keyword in keywords:
                if keyword.lower() in incoming_lower or incoming_lower in keyword.lower():
                    return {"matched": True, "matched_keyword": keyword, "confidence": 0.8}
            return {"matched": False, "matched_keyword": None, "confidence": 0.0}
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"match-{uuid.uuid4()}",
            system_message="""You are a message matching assistant. Your job is to determine if an incoming SMS message semantically matches any of the given keywords/phrases. 
            Consider variations like:
            - 'yes', 'yea', 'yeah', 'yep', 'sure', 'ok', 'okay' are all affirmative
            - 'no', 'nope', 'nah', 'not interested' are all negative
            - 'later', 'busy', 'call back' indicate delay
            
            Respond ONLY with JSON in this exact format:
            {"matched": true/false, "matched_keyword": "the keyword that matched or null", "confidence": 0.0-1.0}"""
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(
            text=f"Incoming message: \"{incoming_message}\"\nKeywords to match: {keywords}\n\nDoes the incoming message match any keyword semantically?"
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        import json
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if response_text.startswith("```"):
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
            result = json.loads(response_text)
            return result
        except:
            # Fallback parsing
            if "true" in response.lower():
                return {"matched": True, "matched_keyword": keywords[0] if keywords else None, "confidence": 0.7}
            return {"matched": False, "matched_keyword": None, "confidence": 0.0}
            
    except Exception as e:
        logger.error(f"AI matching error: {e}")
        # Fallback to simple matching
        incoming_lower = incoming_message.lower().strip()
        for keyword in keywords:
            if keyword.lower() in incoming_lower:
                return {"matched": True, "matched_keyword": keyword, "confidence": 0.6}
        return {"matched": False, "matched_keyword": None, "confidence": 0.0}

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    otp = generate_otp()
    now = datetime.now(timezone.utc).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "phone": user.phone,
        "is_verified": False,
        "otp": otp,
        "otp_expires": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    # In production, send SMS with OTP here
    logger.info(f"OTP for {user.email}: {otp}")
    
    return {
        "message": "Registration successful. Please verify your account.",
        "user_id": user_id,
        "otp": otp  # Remove in production - just for testing
    }

@api_router.post("/auth/verify", response_model=dict)
async def verify_otp_route(data: VerifyOTP):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    otp_expires = datetime.fromisoformat(user.get("otp_expires", ""))
    if datetime.now(timezone.utc) > otp_expires:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    await db.users.update_one(
        {"email": data.email},
        {"$set": {"is_verified": True, "otp": None}}
    )
    
    token = create_token(user["id"], user["email"])
    
    return {
        "message": "Account verified successfully",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"]
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user["id"], user["email"])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "email": user["email"],
            "name": user["name"],
            "is_verified": user.get("is_verified", False)
        }
    }

@api_router.post("/auth/forgot-password", response_model=dict)
async def forgot_password(data: ForgotPassword):
    user = await db.users.find_one({"email": data.email})
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, an OTP has been sent"}
    
    otp = generate_otp()
    await db.users.update_one(
        {"email": data.email},
        {"$set": {
            "reset_otp": otp,
            "reset_otp_expires": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
        }}
    )
    
    logger.info(f"Reset OTP for {data.email}: {otp}")
    
    return {
        "message": "If the email exists, an OTP has been sent",
        "otp": otp  # Remove in production
    }

@api_router.post("/auth/reset-password", response_model=dict)
async def reset_password(data: ResetPassword):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.get("reset_otp") != data.otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    reset_expires = datetime.fromisoformat(user.get("reset_otp_expires", ""))
    if datetime.now(timezone.utc) > reset_expires:
        raise HTTPException(status_code=400, detail="OTP expired")
    
    await db.users.update_one(
        {"email": data.email},
        {"$set": {
            "password": hash_password(data.new_password),
            "reset_otp": None
        }}
    )
    
    return {"message": "Password reset successful"}

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0, "otp": 0, "reset_otp": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# ============== CLIENT ROUTES ==============

@api_router.post("/clients", response_model=ClientResponse)
async def create_client(data: ClientCreate, current_user: dict = Depends(get_current_user)):
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client_doc = {
        "id": client_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "company": data.company,
        "notes": data.notes,
        "balance": data.balance,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client_doc)
    if "_id" in client_doc:
        del client_doc["_id"]
    return client_doc

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(current_user: dict = Depends(get_current_user)):
    clients = await db.clients.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.clients.update_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    return client

@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.clients.delete_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client deleted"}

# ============== REMINDER ROUTES ==============

@api_router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(data: ReminderCreate, current_user: dict = Depends(get_current_user)):
    # Verify client exists
    client = await db.clients.find_one(
        {"id": data.client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    reminder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    reminder_doc = {
        "id": reminder_id,
        "user_id": current_user["user_id"],
        "client_id": data.client_id,
        "client_name": client["name"],
        "client_phone": client["phone"],
        "amount_due": data.amount_due,
        "due_date": data.due_date,
        "message": data.message,
        "status": data.status,
        "sent_at": None,
        "created_at": now
    }
    
    await db.reminders.insert_one(reminder_doc)
    if "_id" in reminder_doc:
        del reminder_doc["_id"]
    return reminder_doc

@api_router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["user_id"]}
    if status:
        query["status"] = status
    
    reminders = await db.reminders.find(query, {"_id": 0}).to_list(1000)
    return reminders

@api_router.get("/reminders/{reminder_id}", response_model=ReminderResponse)
async def get_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    reminder = await db.reminders.find_one(
        {"id": reminder_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return reminder

@api_router.put("/reminders/{reminder_id}", response_model=ReminderResponse)
async def update_reminder(reminder_id: str, data: ReminderUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.reminders.update_one(
        {"id": reminder_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    reminder = await db.reminders.find_one({"id": reminder_id}, {"_id": 0})
    return reminder

@api_router.delete("/reminders/{reminder_id}")
async def delete_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.reminders.delete_one(
        {"id": reminder_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reminder not found")
    return {"message": "Reminder deleted"}

@api_router.post("/reminders/{reminder_id}/send")
async def send_reminder(reminder_id: str, current_user: dict = Depends(get_current_user)):
    reminder = await db.reminders.find_one(
        {"id": reminder_id, "user_id": current_user["user_id"]}
    )
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")
    
    # Check if SMS provider is configured
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    if not provider:
        raise HTTPException(status_code=400, detail="No active SMS provider configured. Please configure an SMS provider in Settings.")
    
    # In production, send SMS here using the provider config
    now = datetime.now(timezone.utc).isoformat()
    await db.reminders.update_one(
        {"id": reminder_id},
        {"$set": {"status": "sent", "sent_at": now}}
    )
    
    return {"message": "Reminder sent successfully", "sent_at": now}

# ============== FOLLOW-UP ROUTES ==============

@api_router.post("/followups", response_model=FollowUpResponse)
async def create_followup(data: FollowUpCreate, current_user: dict = Depends(get_current_user)):
    # Verify client exists
    client = await db.clients.find_one(
        {"id": data.client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    followup_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    followup_doc = {
        "id": followup_id,
        "user_id": current_user["user_id"],
        "client_id": data.client_id,
        "client_name": client["name"],
        "title": data.title,
        "description": data.description,
        "scheduled_date": data.scheduled_date,
        "scheduled_time": data.scheduled_time or "09:00",
        "reminder_type": data.reminder_type,
        "status": "scheduled",
        "created_at": now
    }
    
    await db.followups.insert_one(followup_doc)
    if "_id" in followup_doc:
        del followup_doc["_id"]
    return followup_doc

@api_router.get("/followups", response_model=List[FollowUpResponse])
async def get_followups(date: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["user_id"]}
    if date:
        query["scheduled_date"] = date
    
    followups = await db.followups.find(query, {"_id": 0}).to_list(1000)
    return followups

@api_router.get("/followups/{followup_id}", response_model=FollowUpResponse)
async def get_followup(followup_id: str, current_user: dict = Depends(get_current_user)):
    followup = await db.followups.find_one(
        {"id": followup_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not followup:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return followup

@api_router.put("/followups/{followup_id}", response_model=FollowUpResponse)
async def update_followup(followup_id: str, data: FollowUpUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    result = await db.followups.update_one(
        {"id": followup_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    
    followup = await db.followups.find_one({"id": followup_id}, {"_id": 0})
    return followup

@api_router.delete("/followups/{followup_id}")
async def delete_followup(followup_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.followups.delete_one(
        {"id": followup_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Follow-up not found")
    return {"message": "Follow-up deleted"}

# ============== CAMPAIGN ROUTES ==============

@api_router.post("/campaigns", response_model=CampaignResponse)
async def create_campaign(data: CampaignCreate, current_user: dict = Depends(get_current_user)):
    campaign_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    campaign_doc = {
        "id": campaign_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "description": data.description,
        "initial_message": data.initial_message,
        "triggers": [t.model_dump() for t in data.triggers],
        "delay_hours": data.delay_hours,
        "follow_up_messages": data.follow_up_messages,
        "status": data.status,
        "created_at": now,
        "updated_at": now
    }
    
    await db.campaigns.insert_one(campaign_doc)
    del campaign_doc["_id"] if "_id" in campaign_doc else None
    return campaign_doc

@api_router.get("/campaigns", response_model=List[CampaignResponse])
async def get_campaigns(current_user: dict = Depends(get_current_user)):
    campaigns = await db.campaigns.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    return campaigns

@api_router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    campaign = await db.campaigns.find_one(
        {"id": campaign_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign

@api_router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(campaign_id: str, data: CampaignUpdate, current_user: dict = Depends(get_current_user)):
    update_data = {}
    for k, v in data.model_dump().items():
        if v is not None:
            if k == "triggers":
                update_data[k] = [t if isinstance(t, dict) else t.model_dump() for t in v]
            else:
                update_data[k] = v
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.campaigns.update_one(
        {"id": campaign_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    campaign = await db.campaigns.find_one({"id": campaign_id}, {"_id": 0})
    return campaign

@api_router.delete("/campaigns/{campaign_id}")
async def delete_campaign(campaign_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.campaigns.delete_one(
        {"id": campaign_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return {"message": "Campaign deleted"}

# ============== SMS PROVIDER ROUTES ==============

@api_router.post("/sms-providers", response_model=SMSProviderResponse)
async def create_sms_provider(data: SMSProviderConfig, current_user: dict = Depends(get_current_user)):
    provider_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # If this is set as active, deactivate others
    if data.is_active:
        await db.sms_providers.update_many(
            {"user_id": current_user["user_id"]},
            {"$set": {"is_active": False}}
        )
    
    provider_doc = {
        "id": provider_id,
        "user_id": current_user["user_id"],
        "provider": data.provider,
        "account_sid": data.account_sid,
        "auth_token": data.auth_token,
        "api_key": data.api_key,
        "api_secret": data.api_secret,
        "from_number": data.from_number,
        "is_active": data.is_active,
        "created_at": now
    }
    
    await db.sms_providers.insert_one(provider_doc)
    
    return {
        "id": provider_id,
        "user_id": current_user["user_id"],
        "provider": data.provider,
        "from_number": data.from_number,
        "is_active": data.is_active,
        "created_at": now
    }

@api_router.get("/sms-providers", response_model=List[SMSProviderResponse])
async def get_sms_providers(current_user: dict = Depends(get_current_user)):
    providers = await db.sms_providers.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "account_sid": 0, "auth_token": 0, "api_key": 0, "api_secret": 0}
    ).to_list(100)
    return providers

@api_router.delete("/sms-providers/{provider_id}")
async def delete_sms_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.sms_providers.delete_one(
        {"id": provider_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    return {"message": "Provider deleted"}

@api_router.put("/sms-providers/{provider_id}/activate")
async def activate_sms_provider(provider_id: str, current_user: dict = Depends(get_current_user)):
    # Deactivate all others first
    await db.sms_providers.update_many(
        {"user_id": current_user["user_id"]},
        {"$set": {"is_active": False}}
    )
    
    result = await db.sms_providers.update_one(
        {"id": provider_id, "user_id": current_user["user_id"]},
        {"$set": {"is_active": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    return {"message": "Provider activated"}

# ============== AI MATCHING ROUTE ==============

@api_router.post("/ai/match-response", response_model=MatchResponse)
async def match_response(data: MatchRequest, current_user: dict = Depends(get_current_user)):
    result = await ai_match_response(data.incoming_message, data.keywords)
    return result

# ============== DASHBOARD STATS ==============

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    
    # Get counts
    total_clients = await db.clients.count_documents({"user_id": user_id})
    total_reminders = await db.reminders.count_documents({"user_id": user_id})
    pending_reminders = await db.reminders.count_documents({"user_id": user_id, "status": "pending"})
    sent_reminders = await db.reminders.count_documents({"user_id": user_id, "status": "sent"})
    active_campaigns = await db.campaigns.count_documents({"user_id": user_id, "status": "active"})
    
    # Get total balance owed
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]
    balance_result = await db.clients.aggregate(pipeline).to_list(1)
    total_balance = balance_result[0]["total"] if balance_result else 0
    
    # Get today's followups
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    todays_followups = await db.followups.count_documents({
        "user_id": user_id,
        "scheduled_date": today
    })
    
    # Get recent activity (last 5 reminders)
    recent_reminders = await db.reminders.find(
        {"user_id": user_id},
        {"_id": 0}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_clients": total_clients,
        "total_reminders": total_reminders,
        "pending_reminders": pending_reminders,
        "sent_reminders": sent_reminders,
        "active_campaigns": active_campaigns,
        "total_balance_owed": total_balance,
        "todays_followups": todays_followups,
        "recent_reminders": recent_reminders
    }

# ============== ROOT ROUTE ==============

@api_router.get("/")
async def root():
    return {"message": "Merchant Follow Up API", "version": "1.0.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
