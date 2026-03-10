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
    tags: List[str] = []
    birthday: Optional[str] = None

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    balance: Optional[float] = None
    tags: Optional[List[str]] = None
    birthday: Optional[str] = None

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
    tags: List[str] = []
    birthday: Optional[str] = None
    special_events: List[Dict[str, str]] = []
    created_at: str
    updated_at: str

# Predefined Tags
CLIENT_TAGS = [
    "New Lead",
    "Contacted",
    "Responded",
    "Interested",
    "Not Interested",
    "Follow Up",
    "Application Sent",
    "Docs Submitted",
    "Approved",
    "Funded",
    "Lost Deal"
]

# Payment Reminder Models
class ReminderCreate(BaseModel):
    client_id: str
    amount_due: float
    start_date: str
    end_date: str
    days_of_week: List[str] = ["monday", "tuesday", "wednesday", "thursday", "friday"]
    message: Optional[str] = None
    status: str = "pending"

class ReminderUpdate(BaseModel):
    amount_due: Optional[float] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    days_of_week: Optional[List[str]] = None
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
    start_date: str
    end_date: str
    days_of_week: List[str] = []
    total_reminders: int = 0
    sent_count: int = 0
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

# Phone Number Models
class PhoneNumberCreate(BaseModel):
    phone_number: str
    friendly_name: Optional[str] = None
    provider: str = "twilio"

class PhoneNumberResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    phone_number: str
    friendly_name: Optional[str] = None
    provider: str
    is_active: bool = True
    monthly_cost: float = 1.00
    created_at: str

# Contact/Conversation Models
class ConversationMessage(BaseModel):
    direction: str  # inbound, outbound
    content: str
    timestamp: str
    status: str = "sent"

class ContactUpdate(BaseModel):
    birthday: Optional[str] = None
    special_events: Optional[List[Dict[str, str]]] = None
    notes: Optional[str] = None

# Gift Store Models
class GiftCategory(BaseModel):
    id: str
    name: str
    description: str

class GiftProduct(BaseModel):
    id: str
    name: str
    description: str
    price: float
    category: str
    image_url: Optional[str] = None
    provider: str = "catalog"

class GiftOrderCreate(BaseModel):
    client_id: str
    product_id: str
    occasion: str
    delivery_date: str
    message: Optional[str] = None
    gift_amount: Optional[float] = None

class GiftOrderResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    client_id: str
    client_name: Optional[str] = None
    product_id: str
    product_name: Optional[str] = None
    occasion: str
    delivery_date: str
    message: Optional[str] = None
    gift_amount: Optional[float] = None
    status: str
    created_at: str

# Domain Models
class DomainCreate(BaseModel):
    domain_name: str
    is_owned: bool = False
    dns_verified: bool = False

class DomainResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    domain_name: str
    is_owned: bool
    dns_verified: bool
    mx_records: List[str] = []
    status: str
    created_at: str

class EmailAccountCreate(BaseModel):
    domain_id: str
    email_address: str
    display_name: Optional[str] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None

class EmailAccountResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    domain_id: str
    email_address: str
    display_name: Optional[str] = None
    is_active: bool = True
    created_at: str

# Message Template Models
class TemplateCreate(BaseModel):
    name: str
    category: str = "general"
    content: str
    variables: List[str] = []

class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[List[str]] = None

class TemplateResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    category: str
    content: str
    variables: List[str] = []
    use_count: int = 0
    created_at: str
    updated_at: str

# Predefined template categories
TEMPLATE_CATEGORIES = [
    "Payment Reminder",
    "Follow Up",
    "Introduction",
    "Thank You",
    "Appointment",
    "General"
]

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

def calculate_reminder_count(start_date: str, end_date: str, days_of_week: List[str]) -> int:
    """Calculate total number of reminders based on date range and selected days"""
    from datetime import datetime, timedelta
    
    day_map = {
        "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
        "friday": 4, "saturday": 5, "sunday": 6
    }
    
    selected_days = [day_map[d.lower()] for d in days_of_week if d.lower() in day_map]
    
    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")
    except:
        return 0
    
    if end < start:
        return 0
    
    count = 0
    current = start
    while current <= end:
        if current.weekday() in selected_days:
            count += 1
        current += timedelta(days=1)
    
    return count

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
        "tags": data.tags,
        "birthday": data.birthday,
        "special_events": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client_doc)
    if "_id" in client_doc:
        del client_doc["_id"]
    return client_doc

@api_router.get("/clients/tags")
async def get_available_tags(current_user: dict = Depends(get_current_user)):
    """Get list of available tags for clients"""
    return {"tags": CLIENT_TAGS}

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(tag: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"user_id": current_user["user_id"]}
    if tag:
        query["tags"] = tag
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
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
    
    # Calculate total reminders
    total_reminders = calculate_reminder_count(data.start_date, data.end_date, data.days_of_week)
    
    reminder_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    reminder_doc = {
        "id": reminder_id,
        "user_id": current_user["user_id"],
        "client_id": data.client_id,
        "client_name": client["name"],
        "client_phone": client["phone"],
        "amount_due": data.amount_due,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "days_of_week": data.days_of_week,
        "total_reminders": total_reminders,
        "sent_count": 0,
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

@api_router.post("/reminders/calculate")
async def calculate_reminders(
    start_date: str,
    end_date: str,
    days_of_week: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Calculate how many reminders will be sent based on date range and days"""
    count = calculate_reminder_count(start_date, end_date, days_of_week)
    return {"total_reminders": count}

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
    if "_id" in campaign_doc:
        del campaign_doc["_id"]
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

# ============== PHONE NUMBERS ROUTES ==============

@api_router.get("/phone-numbers/available")
async def search_available_numbers(
    area_code: str,
    country: str = "US",
    limit: int = 20,
    current_user: dict = Depends(get_current_user)
):
    """Search for available phone numbers by area code - placeholder + real Twilio"""
    # Get active provider
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    # Generate placeholder numbers for demo
    placeholder_numbers = []
    for i in range(min(limit, 10)):
        placeholder_numbers.append({
            "phone_number": f"+1{area_code}{random.randint(1000000, 9999999)}",
            "friendly_name": f"({area_code}) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
            "monthly_cost": round(random.uniform(1.00, 2.50), 2),
            "capabilities": ["sms", "voice"],
            "region": "US"
        })
    
    return {
        "available_numbers": placeholder_numbers,
        "provider_configured": provider is not None,
        "note": "Connect your SMS provider (Twilio, etc.) in Settings to purchase real numbers"
    }

@api_router.post("/phone-numbers/purchase")
async def purchase_phone_number(data: PhoneNumberCreate, current_user: dict = Depends(get_current_user)):
    """Purchase/add a phone number"""
    phone_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    phone_doc = {
        "id": phone_id,
        "user_id": current_user["user_id"],
        "phone_number": data.phone_number,
        "friendly_name": data.friendly_name or data.phone_number,
        "provider": data.provider,
        "is_active": True,
        "monthly_cost": 1.00,
        "created_at": now
    }
    
    await db.phone_numbers.insert_one(phone_doc)
    if "_id" in phone_doc:
        del phone_doc["_id"]
    return phone_doc

@api_router.get("/phone-numbers/owned", response_model=List[PhoneNumberResponse])
async def get_owned_numbers(current_user: dict = Depends(get_current_user)):
    """List all owned phone numbers"""
    numbers = await db.phone_numbers.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    return numbers

@api_router.delete("/phone-numbers/{phone_id}")
async def release_phone_number(phone_id: str, current_user: dict = Depends(get_current_user)):
    """Release a phone number"""
    result = await db.phone_numbers.delete_one(
        {"id": phone_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Phone number not found")
    return {"message": "Phone number released"}

# ============== CONTACT MESSAGING & CALLING ROUTES ==============

@api_router.get("/contacts/{client_id}/conversation")
async def get_conversation(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get SMS conversation history with a client"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    messages = await db.conversations.find(
        {"user_id": current_user["user_id"], "client_id": client_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(100).to_list(100)
    
    return {
        "client": client,
        "messages": list(reversed(messages))
    }

@api_router.post("/contacts/{client_id}/send-sms")
async def send_sms_to_contact(
    client_id: str,
    message: str,
    from_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Send SMS to a contact from a specific phone number"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check for active SMS provider
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    # Validate from_number if provided
    if from_number:
        owned_number = await db.phone_numbers.find_one(
            {"user_id": current_user["user_id"], "phone_number": from_number}
        )
        if not owned_number:
            raise HTTPException(status_code=400, detail="You don't own this phone number")
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Store the message
    message_doc = {
        "id": message_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "direction": "outbound",
        "content": message,
        "from_number": from_number,
        "timestamp": now,
        "status": "sent" if provider else "pending_provider"
    }
    
    await db.conversations.insert_one(message_doc)
    
    return {
        "message_id": message_id,
        "from_number": from_number,
        "status": "sent" if provider else "pending_provider",
        "note": None if provider else "Configure SMS provider to send messages"
    }

@api_router.post("/contacts/{client_id}/initiate-call")
async def initiate_call(client_id: str, current_user: dict = Depends(get_current_user)):
    """Initiate a call to a contact - returns call token for browser calling"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Check for active SMS provider with voice capability
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    call_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Log the call attempt
    call_doc = {
        "id": call_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "client_name": client["name"],
        "client_phone": client["phone"],
        "status": "initiated",
        "created_at": now
    }
    
    await db.call_logs.insert_one(call_doc)
    
    return {
        "call_id": call_id,
        "client_phone": client["phone"],
        "client_name": client["name"],
        "provider_configured": provider is not None,
        "note": "Configure Twilio Voice in Settings to enable browser calling" if not provider else None
    }

@api_router.put("/clients/{client_id}/birthday")
async def update_client_birthday(
    client_id: str,
    birthday: str,
    current_user: dict = Depends(get_current_user)
):
    """Update client birthday for gift reminders"""
    result = await db.clients.update_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"$set": {"birthday": birthday, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Birthday updated"}

@api_router.post("/clients/{client_id}/events")
async def add_client_event(
    client_id: str,
    event_name: str,
    event_date: str,
    current_user: dict = Depends(get_current_user)
):
    """Add a special event for a client"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    events = client.get("special_events", [])
    events.append({
        "id": str(uuid.uuid4()),
        "name": event_name,
        "date": event_date
    })
    
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"special_events": events}}
    )
    
    return {"message": "Event added", "events": events}

# ============== GIFT STORE ROUTES ==============

# Gift catalog (hardcoded for now - could connect to real API later)
GIFT_CATALOG = [
    {"id": "wine-red-1", "name": "Premium Red Wine Selection", "description": "A curated selection of fine red wines", "price": 89.99, "category": "wine", "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400"},
    {"id": "wine-white-1", "name": "Chardonnay Collection", "description": "Elegant white wine collection", "price": 79.99, "category": "wine", "image_url": "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400"},
    {"id": "whiskey-1", "name": "Single Malt Scotch", "description": "Premium aged single malt whiskey", "price": 149.99, "category": "spirits", "image_url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400"},
    {"id": "champagne-1", "name": "Champagne Celebration Box", "description": "French champagne with glasses", "price": 129.99, "category": "wine", "image_url": "https://images.unsplash.com/photo-1549918864-1d817ec5c8b8?w=400"},
    {"id": "basket-gourmet-1", "name": "Gourmet Food Basket", "description": "Artisan cheeses, crackers, and treats", "price": 99.99, "category": "baskets", "image_url": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400"},
    {"id": "basket-fruit-1", "name": "Fresh Fruit Basket", "description": "Premium seasonal fruits arrangement", "price": 69.99, "category": "baskets", "image_url": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400"},
    {"id": "basket-chocolate-1", "name": "Luxury Chocolate Box", "description": "Assorted premium chocolates", "price": 59.99, "category": "baskets", "image_url": "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400"},
    {"id": "flowers-1", "name": "Executive Floral Arrangement", "description": "Elegant business floral display", "price": 89.99, "category": "flowers", "image_url": "https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400"},
    {"id": "gift-card-1", "name": "Restaurant Gift Card", "description": "Fine dining experience", "price": 100.00, "category": "gift_cards", "image_url": "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400"},
    {"id": "gift-card-2", "name": "Spa & Wellness Gift Card", "description": "Relaxation and wellness experience", "price": 150.00, "category": "gift_cards", "image_url": "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400"},
]

@api_router.get("/gifts/catalog")
async def get_gift_catalog(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get gift catalog"""
    if category:
        filtered = [g for g in GIFT_CATALOG if g["category"] == category]
        return {"products": filtered, "categories": ["wine", "spirits", "baskets", "flowers", "gift_cards"]}
    return {"products": GIFT_CATALOG, "categories": ["wine", "spirits", "baskets", "flowers", "gift_cards"]}

@api_router.get("/gifts/categories")
async def get_gift_categories(current_user: dict = Depends(get_current_user)):
    """Get gift categories"""
    return {
        "categories": [
            {"id": "wine", "name": "Wine", "description": "Fine wines and champagne", "icon": "wine"},
            {"id": "spirits", "name": "Spirits", "description": "Whiskey, bourbon, and more", "icon": "glass"},
            {"id": "baskets", "name": "Gift Baskets", "description": "Gourmet food and treat baskets", "icon": "gift"},
            {"id": "flowers", "name": "Flowers", "description": "Elegant floral arrangements", "icon": "flower"},
            {"id": "gift_cards", "name": "Gift Cards", "description": "Experience gift cards", "icon": "card"},
        ]
    }

@api_router.post("/gifts/orders", response_model=GiftOrderResponse)
async def create_gift_order(data: GiftOrderCreate, current_user: dict = Depends(get_current_user)):
    """Create a gift order for a client"""
    client = await db.clients.find_one(
        {"id": data.client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Find product
    product = next((p for p in GIFT_CATALOG if p["id"] == data.product_id), None)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    order_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    order_doc = {
        "id": order_id,
        "user_id": current_user["user_id"],
        "client_id": data.client_id,
        "client_name": client["name"],
        "product_id": data.product_id,
        "product_name": product["name"],
        "occasion": data.occasion,
        "delivery_date": data.delivery_date,
        "message": data.message,
        "gift_amount": data.gift_amount or product["price"],
        "status": "pending",
        "created_at": now
    }
    
    await db.gift_orders.insert_one(order_doc)
    if "_id" in order_doc:
        del order_doc["_id"]
    return order_doc

@api_router.get("/gifts/orders", response_model=List[GiftOrderResponse])
async def get_gift_orders(current_user: dict = Depends(get_current_user)):
    """Get all gift orders"""
    orders = await db.gift_orders.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/gifts/upcoming-events")
async def get_upcoming_gift_events(current_user: dict = Depends(get_current_user)):
    """Get upcoming birthdays and events for gift reminders"""
    # Get all clients with birthdays or events
    clients = await db.clients.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    today = datetime.now(timezone.utc)
    upcoming = []
    
    for client in clients:
        # Check birthday
        if client.get("birthday"):
            try:
                bday = datetime.strptime(client["birthday"], "%Y-%m-%d")
                # Set to this year
                bday_this_year = bday.replace(year=today.year)
                if bday_this_year < today:
                    bday_this_year = bday.replace(year=today.year + 1)
                
                days_until = (bday_this_year - today).days
                if 0 <= days_until <= 30:
                    upcoming.append({
                        "client_id": client["id"],
                        "client_name": client["name"],
                        "event_type": "birthday",
                        "event_name": "Birthday",
                        "event_date": bday_this_year.strftime("%Y-%m-%d"),
                        "days_until": days_until
                    })
            except:
                pass
        
        # Check special events
        for event in client.get("special_events", []):
            try:
                event_date = datetime.strptime(event["date"], "%Y-%m-%d")
                days_until = (event_date - today).days
                if 0 <= days_until <= 30:
                    upcoming.append({
                        "client_id": client["id"],
                        "client_name": client["name"],
                        "event_type": "special",
                        "event_name": event["name"],
                        "event_date": event["date"],
                        "days_until": days_until
                    })
            except:
                pass
    
    # Sort by days until
    upcoming.sort(key=lambda x: x["days_until"])
    
    return {"upcoming_events": upcoming}

# ============== DOMAIN & EMAIL ROUTES ==============

@api_router.post("/domains", response_model=DomainResponse)
async def add_domain(data: DomainCreate, current_user: dict = Depends(get_current_user)):
    """Add a domain for email"""
    domain_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    domain_doc = {
        "id": domain_id,
        "user_id": current_user["user_id"],
        "domain_name": data.domain_name,
        "is_owned": data.is_owned,
        "dns_verified": False,
        "mx_records": [],
        "status": "pending_verification",
        "created_at": now
    }
    
    await db.domains.insert_one(domain_doc)
    if "_id" in domain_doc:
        del domain_doc["_id"]
    return domain_doc

@api_router.get("/domains", response_model=List[DomainResponse])
async def get_domains(current_user: dict = Depends(get_current_user)):
    """Get all domains"""
    domains = await db.domains.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    return domains

@api_router.get("/domains/{domain_id}/dns-instructions")
async def get_dns_instructions(domain_id: str, current_user: dict = Depends(get_current_user)):
    """Get DNS setup instructions for a domain"""
    domain = await db.domains.find_one(
        {"id": domain_id, "user_id": current_user["user_id"]}
    )
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    return {
        "domain": domain["domain_name"],
        "instructions": [
            {
                "type": "MX",
                "name": "@",
                "value": "mx.merchantfollowup.com",
                "priority": 10,
                "description": "Main mail server record"
            },
            {
                "type": "TXT",
                "name": "@",
                "value": f"v=spf1 include:merchantfollowup.com ~all",
                "description": "SPF record for email authentication"
            },
            {
                "type": "TXT",
                "name": "_dmarc",
                "value": "v=DMARC1; p=none; rua=mailto:dmarc@merchantfollowup.com",
                "description": "DMARC policy"
            },
            {
                "type": "CNAME",
                "name": "em",
                "value": "u123456.wl.merchantfollowup.com",
                "description": "Email tracking subdomain"
            }
        ],
        "verification_status": domain.get("dns_verified", False)
    }

@api_router.post("/domains/{domain_id}/verify")
async def verify_domain(domain_id: str, current_user: dict = Depends(get_current_user)):
    """Verify domain DNS settings"""
    domain = await db.domains.find_one(
        {"id": domain_id, "user_id": current_user["user_id"]}
    )
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    # In production, actually check DNS records here
    # For now, simulate verification
    await db.domains.update_one(
        {"id": domain_id},
        {"$set": {"dns_verified": True, "status": "active"}}
    )
    
    return {"message": "Domain verified successfully", "status": "active"}

@api_router.delete("/domains/{domain_id}")
async def delete_domain(domain_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a domain"""
    result = await db.domains.delete_one(
        {"id": domain_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    # Also delete associated email accounts
    await db.email_accounts.delete_many({"domain_id": domain_id})
    
    return {"message": "Domain deleted"}

@api_router.post("/email-accounts", response_model=EmailAccountResponse)
async def create_email_account(data: EmailAccountCreate, current_user: dict = Depends(get_current_user)):
    """Create an email account on a domain"""
    domain = await db.domains.find_one(
        {"id": data.domain_id, "user_id": current_user["user_id"]}
    )
    if not domain:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    account_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    account_doc = {
        "id": account_id,
        "user_id": current_user["user_id"],
        "domain_id": data.domain_id,
        "email_address": data.email_address,
        "display_name": data.display_name,
        "smtp_host": data.smtp_host,
        "smtp_port": data.smtp_port,
        "smtp_username": data.smtp_username,
        "smtp_password": data.smtp_password,  # In production, encrypt this
        "is_active": True,
        "created_at": now
    }
    
    await db.email_accounts.insert_one(account_doc)
    
    return {
        "id": account_id,
        "user_id": current_user["user_id"],
        "domain_id": data.domain_id,
        "email_address": data.email_address,
        "display_name": data.display_name,
        "is_active": True,
        "created_at": now
    }

@api_router.get("/email-accounts", response_model=List[EmailAccountResponse])
async def get_email_accounts(current_user: dict = Depends(get_current_user)):
    """Get all email accounts"""
    accounts = await db.email_accounts.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "smtp_password": 0}
    ).to_list(100)
    return accounts

@api_router.delete("/email-accounts/{account_id}")
async def delete_email_account(account_id: str, current_user: dict = Depends(get_current_user)):
    """Delete an email account"""
    result = await db.email_accounts.delete_one(
        {"id": account_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Email account not found")
    return {"message": "Email account deleted"}

@api_router.get("/domains/marketplace")
async def get_domain_marketplace(current_user: dict = Depends(get_current_user)):
    """Get available domains for purchase - placeholder for registrar API"""
    return {
        "available_domains": [
            {"domain": "merchantpay.com", "price": 14.99, "available": True},
            {"domain": "businessremind.com", "price": 12.99, "available": True},
            {"domain": "payfollowup.com", "price": 9.99, "available": True},
            {"domain": "invoiceremind.net", "price": 8.99, "available": True},
        ],
        "note": "Domain purchasing will be available soon. Connect your registrar API in Settings.",
        "supported_registrars": ["Namecheap", "GoDaddy", "Cloudflare"]
    }

# ============== MESSAGE TEMPLATE ROUTES ==============

@api_router.post("/templates", response_model=TemplateResponse)
async def create_template(data: TemplateCreate, current_user: dict = Depends(get_current_user)):
    """Create a new message template"""
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    template_doc = {
        "id": template_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "category": data.category,
        "content": data.content,
        "variables": data.variables,
        "use_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.templates.insert_one(template_doc)
    if "_id" in template_doc:
        del template_doc["_id"]
    return template_doc

@api_router.get("/templates", response_model=List[TemplateResponse])
async def get_templates(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all templates, optionally filtered by category"""
    query = {"user_id": current_user["user_id"]}
    if category:
        query["category"] = category
    
    templates = await db.templates.find(query, {"_id": 0}).sort("name", 1).to_list(1000)
    return templates

@api_router.get("/templates/categories")
async def get_template_categories(current_user: dict = Depends(get_current_user)):
    """Get available template categories"""
    return {"categories": TEMPLATE_CATEGORIES}

@api_router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Get a specific template"""
    template = await db.templates.find_one(
        {"id": template_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: str, data: TemplateUpdate, current_user: dict = Depends(get_current_user)):
    """Update a template"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.templates.update_one(
        {"id": template_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return template

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a template"""
    result = await db.templates.delete_one(
        {"id": template_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

@api_router.post("/templates/{template_id}/use")
async def use_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Increment template use count"""
    result = await db.templates.update_one(
        {"id": template_id, "user_id": current_user["user_id"]},
        {"$inc": {"use_count": 1}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    return {"message": "Template use count updated"}

@api_router.post("/contacts/{client_id}/send-template")
async def send_template_message(
    client_id: str,
    request_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send a template message to a contact with variable substitution"""
    template_id = request_data.get("template_id")
    variables = request_data.get("variables", {})
    
    # Get client
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get template
    template = await db.templates.find_one(
        {"id": template_id, "user_id": current_user["user_id"]}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Substitute variables in template content
    message_content = template["content"]
    if variables:
        for var, value in variables.items():
            message_content = message_content.replace(f"{{{var}}}", value)
    
    # Default variable substitutions
    default_vars = {
        "client_name": client.get("name", ""),
        "client_company": client.get("company", ""),
        "client_balance": str(client.get("balance", 0))
    }
    
    for var, value in default_vars.items():
        message_content = message_content.replace(f"{{{var}}}", value)
    
    # Check for active SMS provider
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Store the message
    message_doc = {
        "id": message_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "template_id": template_id,
        "direction": "outbound",
        "content": message_content,
        "timestamp": now,
        "status": "sent" if provider else "pending_provider"
    }
    
    await db.conversations.insert_one(message_doc)
    
    # Increment template use count
    await db.templates.update_one(
        {"id": template_id},
        {"$inc": {"use_count": 1}}
    )
    
    return {
        "message_id": message_id,
        "content": message_content,
        "status": "sent" if provider else "pending_provider",
        "note": None if provider else "Configure SMS provider to send messages"
    }

# ============== MESSAGE TEMPLATES ROUTES ==============

@api_router.get("/templates/categories")
async def get_template_categories(current_user: dict = Depends(get_current_user)):
    """Get available template categories"""
    return {"categories": TEMPLATE_CATEGORIES}

@api_router.post("/templates", response_model=TemplateResponse)
async def create_template(data: TemplateCreate, current_user: dict = Depends(get_current_user)):
    """Create a new message template"""
    template_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Extract variables from content (format: {variable_name})
    import re
    found_vars = re.findall(r'\{(\w+)\}', data.content)
    variables = list(set(data.variables + found_vars))
    
    template_doc = {
        "id": template_id,
        "user_id": current_user["user_id"],
        "name": data.name,
        "category": data.category,
        "content": data.content,
        "variables": variables,
        "use_count": 0,
        "created_at": now,
        "updated_at": now
    }
    
    await db.templates.insert_one(template_doc)
    if "_id" in template_doc:
        del template_doc["_id"]
    return template_doc

@api_router.get("/templates", response_model=List[TemplateResponse])
async def get_templates(category: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Get all templates, optionally filtered by category"""
    query = {"user_id": current_user["user_id"]}
    if category:
        query["category"] = category
    
    templates = await db.templates.find(query, {"_id": 0}).sort("use_count", -1).to_list(100)
    return templates

@api_router.get("/templates/{template_id}", response_model=TemplateResponse)
async def get_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single template"""
    template = await db.templates.find_one(
        {"id": template_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template

@api_router.put("/templates/{template_id}", response_model=TemplateResponse)
async def update_template(template_id: str, data: TemplateUpdate, current_user: dict = Depends(get_current_user)):
    """Update a template"""
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    
    if "content" in update_data:
        import re
        found_vars = re.findall(r'\{(\w+)\}', update_data["content"])
        update_data["variables"] = list(set(update_data.get("variables", []) + found_vars))
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.templates.update_one(
        {"id": template_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    
    template = await db.templates.find_one({"id": template_id}, {"_id": 0})
    return template

@api_router.delete("/templates/{template_id}")
async def delete_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a template"""
    result = await db.templates.delete_one(
        {"id": template_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Template deleted"}

@api_router.post("/templates/{template_id}/use")
async def use_template(template_id: str, current_user: dict = Depends(get_current_user)):
    """Increment template use count"""
    result = await db.templates.update_one(
        {"id": template_id, "user_id": current_user["user_id"]},
        {"$inc": {"use_count": 1}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Template not found")
    return {"message": "Use count updated"}

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
    return {"message": "Merchant Follow Up API", "version": "2.0.0"}

# ============== IMPORT ENHANCED ROUTES ==============
# Enhanced routes must be included BEFORE main router to ensure proper route matching
# Routes like /campaigns/enhanced must be matched before /campaigns/{campaign_id}
import sys
sys.path.insert(0, str(ROOT_DIR))

try:
    from routes.enhanced import router as enhanced_router, set_db, set_auth_dependency
    set_db(db)
    set_auth_dependency(get_current_user)
    # Include enhanced router FIRST with /api prefix
    app.include_router(enhanced_router, prefix="/api", tags=["Enhanced Features"])
    logger.info("Enhanced routes loaded successfully")
except Exception as e:
    logger.warning(f"Could not load enhanced routes: {e}")

# Include the main router AFTER enhanced routes
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
