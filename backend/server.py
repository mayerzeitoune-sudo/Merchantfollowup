from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, Form
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
    business: Optional[str] = None
    sms_opt_in: bool = False

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    phone: Optional[str] = None
    business: Optional[str] = None
    sms_opt_in: bool = False
    is_verified: bool = False
    role: str = "user"
    org_id: Optional[str] = None
    org_name: Optional[str] = None
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
    amount_requested: Optional[float] = None
    # Address fields for gift shop
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = "US"

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    notes: Optional[str] = None
    note_logs: Optional[List[Dict]] = None
    balance: Optional[float] = None
    tags: Optional[List[str]] = None
    birthday: Optional[str] = None
    amount_requested: Optional[float] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None

class ClientResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    name: str
    email: Optional[str] = None
    phone: str
    company: Optional[str] = None
    notes: Optional[str] = None
    note_logs: List[Dict] = []
    balance: float = 0.0
    tags: List[str] = []
    pipeline_stage: Optional[str] = "new_lead"
    birthday: Optional[str] = None
    amount_requested: Optional[float] = None
    special_events: List[Dict[str, str]] = []
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    country: Optional[str] = None
    ai_summary: Optional[str] = None
    created_at: str
    updated_at: str

# Predefined Tags (matching pipeline stages)
CLIENT_TAGS = [
    "New Lead",
    "Interested",
    "Application Sent",
    "Docs Submitted",
    "Approved",
    "Funded",
    "Dead",
    "Future"
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
    assigned_user_id: Optional[str] = None  # Agent assigned to this number

class PhoneNumberUpdate(BaseModel):
    friendly_name: Optional[str] = None
    assigned_user_id: Optional[str] = "___UNSET___"  # Sentinel to distinguish null from not-provided
    is_active: Optional[bool] = None

class PhoneNumberResponse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    org_id: Optional[str] = None
    phone_number: str
    friendly_name: Optional[str] = None
    provider: str
    is_active: bool = True
    is_default: bool = False
    assigned_user_id: Optional[str] = None
    assigned_user_name: Optional[str] = None
    monthly_cost: float = 1.00
    credit_cost: Optional[int] = None
    twilio_sid: Optional[str] = None
    twilio_purchased: Optional[bool] = None
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
        
        # Fetch full user to get role and org_id
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "user_id": user_id, 
            "email": payload.get("email"),
            "role": user.get("role", "user"),
            "org_id": user.get("org_id"),
            "org_name": user.get("org_name")
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def is_admin_or_above(user: dict) -> bool:
    """Check if user has admin or org_admin role"""
    return user.get("role") in ["admin", "org_admin"]


def is_org_admin(user: dict) -> bool:
    """Check if user is org_admin (super admin)"""
    return user.get("role") == "org_admin"


def require_admin_or_above(user: dict):
    """Raise exception if user is not admin or org_admin"""
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Admin access required")


async def get_accessible_user_ids(current_user: dict) -> List[str]:
    """
    Get list of user IDs whose data the current user can access.
    - org_admin: all users
    - admin: all users in their org
    - team_leader: themselves + their assigned agents
    - agent/viewer: only themselves
    """
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        return [current_user["user_id"]]
    
    role = user.get("role", "agent")
    
    if role == "org_admin":
        # Org admin sees all
        all_users = await db.users.find({}, {"id": 1, "_id": 0}).to_list(10000)
        return [u["id"] for u in all_users]
    
    elif role == "admin":
        # Admin sees all users in their organization (by org_id)
        org_id = user.get("org_id")
        if org_id:
            org_users = await db.users.find(
                {"org_id": org_id},
                {"id": 1, "_id": 0}
            ).to_list(1000)
            return [u["id"] for u in org_users]
        else:
            # Fallback to team_id for backwards compatibility
            team_id = user.get("team_id") or current_user["user_id"]
            team_users = await db.users.find(
                {"$or": [{"team_id": team_id}, {"id": team_id}]},
                {"id": 1, "_id": 0}
            ).to_list(1000)
            return [u["id"] for u in team_users]
    
    elif role == "team_leader":
        # Team leader sees their own data + their agents' data
        agents = await db.users.find(
            {"team_leader_id": current_user["user_id"]},
            {"id": 1, "_id": 0}
        ).to_list(100)
        return [current_user["user_id"]] + [a["id"] for a in agents]
    
    else:
        # Agent/viewer only sees their own data
        return [current_user["user_id"]]


async def build_data_query(current_user: dict, base_query: dict = None) -> dict:
    """Build a query that filters data based on user's role and access level."""
    if base_query is None:
        base_query = {}
    
    accessible_ids = await get_accessible_user_ids(current_user)
    base_query["user_id"] = {"$in": accessible_ids}
    return base_query


async def log_activity(user_id: str, action: str, details: dict = None, entity_type: str = None, entity_id: str = None):
    """Log user activity for audit trail"""
    activity = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "action": action,
        "details": details or {},
        "entity_type": entity_type,
        "entity_id": entity_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.activity_logs.insert_one(activity)


async def create_notification(user_id: str, title: str, message: str, type: str = "info", link: str = None):
    """Create a notification for a user"""
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": type,  # info, success, warning, error
        "link": link,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    return notification


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
    
    # Check if this is the first user (will be admin)
    user_count = await db.users.count_documents({})
    is_first_user = user_count == 0
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate OTP for verification
    otp = generate_otp()
    otp_expires = (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    
    user_doc = {
        "id": user_id,
        "email": user.email,
        "password": hash_password(user.password),
        "name": user.name,
        "phone": user.phone,
        "business": user.business,
        "sms_opt_in": user.sms_opt_in,
        "sms_opt_in_date": now if user.sms_opt_in else None,
        "is_verified": False,  # Requires OTP verification
        "role": "admin" if is_first_user else "agent",  # First user gets admin role
        "otp": otp,
        "otp_expires": otp_expires,
        "created_at": now,
        "updated_at": now
    }
    
    await db.users.insert_one(user_doc)
    
    logger.info(f"New user registered: {user.email}, OTP: {otp}")
    
    # TODO: Send OTP via email using support email configuration
    # For now, returning OTP for testing
    
    return {
        "message": "Registration successful! Please verify your account.",
        "otp": otp,  # Remove in production - here for testing
        "requires_verification": True,
        "email": user.email
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
            "is_verified": user.get("is_verified", False),
            "role": user.get("role", "user"),
            "org_id": user.get("org_id"),
            "org_name": user.get("org_name")
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

# ============== PROFILE ROUTES ==============

class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

@api_router.put("/profile")
async def update_profile(data: ProfileUpdate, current_user: dict = Depends(get_current_user)):
    """Update user's profile"""
    update_data = {}
    if data.name:
        update_data["name"] = data.name
    if data.phone:
        update_data["phone"] = data.phone
    
    if not update_data:
        return {"message": "No changes to update"}
    
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    return {"message": "Profile updated successfully"}

@api_router.post("/profile/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Change user's own password"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(data.current_password, user["password"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    if len(data.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    
    await db.users.update_one(
        {"id": current_user["user_id"]},
        {"$set": {
            "password": hash_password(data.new_password),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Password changed successfully"}

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
        "amount_requested": data.amount_requested,
        "special_events": [],
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client_doc)
    if "_id" in client_doc:
        del client_doc["_id"]
    
    # Log activity
    await log_activity(
        current_user["user_id"],
        f"Created client: {data.name}",
        {"phone": data.phone, "company": data.company},
        "client",
        client_id
    )
    
    # Auto-enroll in active drip campaigns that match client tags
    if data.tags:
        try:
            from zoneinfo import ZoneInfo
            et = ZoneInfo("America/New_York")
            now_utc = datetime.now(timezone.utc)
            now_et = now_utc.astimezone(et)
            # Schedule first message for 10:45 AM ET today (or tomorrow if past 10:45)
            send_time_et = now_et.replace(hour=10, minute=45, second=0, microsecond=0)
            if now_et >= send_time_et:
                send_time_et = send_time_et + timedelta(days=1)
            first_send = send_time_et.astimezone(timezone.utc).isoformat()
            
            accessible_ids = await get_accessible_user_ids(current_user)
            active_campaigns = await db.enhanced_campaigns.find(
                {"user_id": {"$in": accessible_ids}, "status": "active"},
                {"_id": 0}
            ).to_list(100)
            
            for campaign in active_campaigns:
                camp_tags = campaign.get("target_tags", [])
                camp_tag = campaign.get("target_tag", "")
                matching_tags = set(data.tags) & set(camp_tags + ([camp_tag] if camp_tag else []))
                
                if matching_tags:
                    existing = await db.campaign_enrollments.find_one({
                        "client_id": client_id,
                        "campaign_id": campaign["id"],
                        "status": "active"
                    })
                    if not existing:
                        enrollment = {
                            "id": str(uuid.uuid4()),
                            "campaign_id": campaign["id"],
                            "campaign_type": campaign.get("campaign_type", campaign.get("type", "prebuilt")),
                            "client_id": client_id,
                            "user_id": current_user["user_id"],
                            "status": "active",
                            "current_step": 0,
                            "start_date": now,
                            "next_send_date": first_send,
                            "last_sent_date": None,
                            "created_at": now
                        }
                        await db.campaign_enrollments.insert_one(enrollment)
                        await db.enhanced_campaigns.update_one(
                            {"id": campaign["id"]},
                            {"$inc": {"contacts_enrolled": 1}}
                        )
                        logger.info(f"Auto-enrolled client {client_id} into campaign {campaign['name']} - first send at {first_send}")
        except Exception as e:
            logger.error(f"Auto-enrollment error for client {client_id}: {e}")
    
    return client_doc

@api_router.get("/clients/tags")
async def get_available_tags(current_user: dict = Depends(get_current_user)):
    """Get list of available tags for clients"""
    return {"tags": CLIENT_TAGS}

@api_router.get("/clients", response_model=List[ClientResponse])
async def get_clients(tag: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Build query with role-based data scoping
    query = await build_data_query(current_user)
    if tag:
        query["tags"] = tag
    
    clients = await db.clients.find(query, {"_id": 0}).to_list(1000)
    return clients

@api_router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    # Get accessible user IDs for this user
    accessible_ids = await get_accessible_user_ids(current_user)
    
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    return client

@api_router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, data: ClientUpdate, current_user: dict = Depends(get_current_user)):
    logger.info(f"update_client called with client_id={client_id}")
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # Sync tags with pipeline stage
    TAG_TO_STAGE = {
        'New Lead': 'new_lead',
        'Interested': 'interested',
        'Application Sent': 'application_sent',
        'Docs Submitted': 'docs_submitted',
        'Approved': 'approved',
        'Funded': 'funded',
        'Dead': 'dead',
        'Future': 'future',
    }
    
    # If tags are being updated, check if we need to update pipeline_stage
    if 'tags' in update_data and update_data['tags']:
        for tag in update_data['tags']:
            if tag in TAG_TO_STAGE:
                update_data['pipeline_stage'] = TAG_TO_STAGE[tag]
                break  # Use the first stage tag found
    
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
    # First, delete all funded deals associated with this client
    await db.funded_deals.delete_many(
        {"client_id": client_id, "user_id": current_user["user_id"]}
    )
    
    # Delete all payments associated with deals for this client
    await db.deal_payments.delete_many(
        {"client_id": client_id, "user_id": current_user["user_id"]}
    )
    
    # Delete conversations
    await db.conversations.delete_many(
        {"client_id": client_id}
    )
    
    # Delete reminders
    await db.reminders.delete_many(
        {"client_id": client_id, "user_id": current_user["user_id"]}
    )
    
    # Finally delete the client
    result = await db.clients.delete_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Client not found")
    return {"message": "Client and all associated data deleted"}

class BulkDeleteRequest(BaseModel):
    client_ids: List[str]

@api_router.post("/clients/bulk-delete")
async def bulk_delete_clients(data: BulkDeleteRequest, current_user: dict = Depends(get_current_user)):
    """Delete multiple clients at once"""
    if not data.client_ids:
        raise HTTPException(status_code=400, detail="No client IDs provided")
    
    if len(data.client_ids) > 100:
        raise HTTPException(status_code=400, detail="Cannot delete more than 100 clients at once")
    
    # Build query based on user role
    if current_user.get("role") in ["org_admin", "admin"]:
        query = {"id": {"$in": data.client_ids}}
    else:
        query = {"id": {"$in": data.client_ids}, "user_id": current_user["user_id"]}
    
    # Delete associated data first
    await db.funded_deals.delete_many({"client_id": {"$in": data.client_ids}})
    await db.deal_payments.delete_many({"client_id": {"$in": data.client_ids}})
    await db.conversations.delete_many({"client_id": {"$in": data.client_ids}})
    await db.reminders.delete_many({"client_id": {"$in": data.client_ids}})
    
    # Delete the clients
    result = await db.clients.delete_many(query)
    
    # Log activity
    await log_activity(
        current_user["user_id"],
        f"Bulk deleted {result.deleted_count} clients",
        {"client_ids": data.client_ids[:10]},  # Log first 10 IDs only
        "client",
        None
    )
    
    return {"message": f"Deleted {result.deleted_count} clients", "deleted_count": result.deleted_count}

@api_router.put("/clients/{client_id}/pipeline")
async def update_client_pipeline(client_id: str, stage: str, current_user: dict = Depends(get_current_user)):
    """Update client's pipeline stage"""
    logger.info(f"Pipeline update request: client_id={client_id}, stage={stage}, user_role={current_user.get('role')}")
    
    valid_stages = ['new_lead', 'interested', 'application_sent', 'docs_submitted', 'approved', 'funded', 'dead', 'future']
    if stage not in valid_stages:
        raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of: {valid_stages}")
    
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
    
    # Build query based on user role (org_admin/admin can update any client)
    if current_user.get("role") in ["org_admin", "admin"]:
        query = {"id": client_id}
    else:
        query = {"id": client_id, "user_id": current_user["user_id"]}
    
    logger.info(f"Pipeline query: {query}")
    
    # Get current client to update tags
    client = await db.clients.find_one(query, {"_id": 0})
    logger.info(f"Pipeline client found: {client is not None}")
    
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update tags - remove old stage tags and add new one
    current_tags = client.get("tags", [])
    stage_tag_values = list(STAGE_TO_TAG.values())
    updated_tags = [t for t in current_tags if t not in stage_tag_values]
    updated_tags.append(STAGE_TO_TAG.get(stage, stage))
    
    result = await db.clients.update_one(
        query,
        {"$set": {
            "pipeline_stage": stage, 
            "tags": updated_tags,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Pipeline stage updated to {stage}"}

@api_router.post("/clients/{client_id}/generate-summary")
async def generate_client_ai_summary(client_id: str, current_user: dict = Depends(get_current_user)):
    """Generate AI summary of client conversations"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all conversations for this client
    conversations = await db.conversations.find(
        {"client_id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("timestamp", 1).to_list(100)
    
    if not conversations:
        return {"summary": "No conversation history yet.", "generated": False}
    
    # Get API key
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return {"summary": "AI summary not available. Configure API key.", "generated": False}
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Format conversation history
        conv_text = "\n".join([
            f"{'Client' if msg['direction'] == 'inbound' else 'You'}: {msg['content']}"
            for msg in conversations[-20:]  # Last 20 messages
        ])
        
        system_prompt = """You are a helpful assistant that summarizes business conversations.
Provide a brief, actionable summary that includes:
1. Key topics discussed
2. Client's current status/interest level
3. Any pending action items or follow-ups needed
4. Important details mentioned (budget, timeline, concerns)

Keep the summary concise (2-4 sentences) and professional."""
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"summary-{client_id}",
            system_message=system_prompt
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=f"Client: {client['name']}\nCompany: {client.get('company', 'N/A')}\n\nConversation:\n{conv_text}\n\nProvide a summary:")
        response = await chat.send_message(user_message)
        summary = response.strip()
        
        # Save summary to client
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"ai_summary": summary, "summary_updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        
        return {"summary": summary, "generated": True}
        
    except Exception as e:
        logger.error(f"AI summary error: {e}")
        return {"summary": f"Could not generate summary: {str(e)}", "generated": False}

@api_router.get("/clients/{client_id}/summary")
async def get_client_summary(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get existing AI summary for a client"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0, "ai_summary": 1, "summary_updated_at": 1}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    return {
        "summary": client.get("ai_summary"),
        "updated_at": client.get("summary_updated_at")
    }

# ============== AI DEAL ASSISTANT ==============

@api_router.post("/ai/generate-message")
async def ai_generate_message(request_data: dict, current_user: dict = Depends(get_current_user)):
    """Generate AI message for a client"""
    client_id = request_data.get("client_id")
    context = request_data.get("context", "follow_up")  # follow_up, intro, closing, reminder
    
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get recent conversation
    conversations = await db.conversations.find(
        {"client_id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(10)
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        conv_history = "\n".join([
            f"{'Client' if msg['direction'] == 'inbound' else 'You'}: {msg['content']}"
            for msg in reversed(conversations[-5:])
        ]) if conversations else "No previous messages"
        
        prompts = {
            "follow_up": "Write a friendly follow-up message to check in and move the deal forward.",
            "intro": "Write an introduction message to start the conversation professionally.",
            "closing": "Write a message to help close the deal and get commitment.",
            "reminder": "Write a gentle reminder message about their pending application or documents."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_gen_{client_id}",
            system_message="You are a professional sales assistant. Write concise, personalized SMS messages (under 160 characters when possible). Be friendly but professional. Don't use emojis excessively."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Client: {client['name']}
Company: {client.get('company', 'N/A')}
Pipeline Stage: {client.get('pipeline_stage', 'new_lead')}

Recent conversation:
{conv_history}

Task: {prompts.get(context, prompts['follow_up'])}

Generate ONLY the message text, nothing else."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"message": response.strip(), "context": context}
        
    except Exception as e:
        logger.error(f"AI generate message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/rewrite-message")
async def ai_rewrite_message(request_data: dict, current_user: dict = Depends(get_current_user)):
    """Rewrite message with different tone"""
    message = request_data.get("message", "")
    tone = request_data.get("tone", "professional")  # professional, friendly, urgent
    
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        tone_prompts = {
            "professional": "Make it more formal and professional while keeping it concise.",
            "friendly": "Make it warmer and more conversational while staying professional.",
            "urgent": "Add urgency while remaining respectful. Emphasize time sensitivity."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_rewrite_{uuid.uuid4()}",
            system_message="You rewrite messages. Output ONLY the rewritten message, nothing else."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Original message: {message}

Task: {tone_prompts.get(tone, tone_prompts['professional'])}

Rewrite:"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {"original": message, "rewritten": response.strip(), "tone": tone}
        
    except Exception as e:
        logger.error(f"AI rewrite error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-template")
async def ai_generate_template(request_data: dict, current_user: dict = Depends(get_current_user)):
    """Generate a message template using AI"""
    template_type = request_data.get("type", "follow_up")  # payment_reminder, follow_up, introduction, thank_you, appointment
    context = request_data.get("context", "")
    tone = request_data.get("tone", "professional")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        template_prompts = {
            "payment_reminder": "Create an SMS payment reminder template. Include {client_name}, {amount}, and {due_date} variables.",
            "follow_up": "Create a follow-up SMS template for checking in with a lead. Include {client_name} variable.",
            "introduction": "Create an introduction SMS template for reaching out to a new lead. Include {client_name} and {company_name} variables.",
            "thank_you": "Create a thank you SMS template. Include {client_name} variable.",
            "appointment": "Create an appointment confirmation/reminder SMS template. Include {client_name}, {date}, and {time} variables.",
            "closing": "Create a deal closing SMS template. Include {client_name} variable.",
            "cold_outreach": "Create a cold outreach SMS template for generating new business. Include {client_name} variable."
        }
        
        tone_instructions = {
            "professional": "Use a formal, business-appropriate tone.",
            "friendly": "Use a warm, conversational but still professional tone.",
            "urgent": "Add urgency and time-sensitivity to the message.",
            "casual": "Use a relaxed, approachable tone."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_template_{uuid.uuid4()}",
            system_message="You are an expert SMS marketing copywriter. Create concise, effective SMS templates under 160 characters. Use variables in {curly_braces} format. Don't use excessive emojis."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""{template_prompts.get(template_type, template_prompts['follow_up'])}

{tone_instructions.get(tone, tone_instructions['professional'])}

{f'Additional context: {context}' if context else ''}

Generate ONLY the template text with variables, nothing else."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Extract variables from template
        import re
        variables = re.findall(r'\{(\w+)\}', response)
        
        return {
            "template": response.strip(),
            "variables": list(set(variables)),
            "type": template_type,
            "tone": tone
        }
        
    except Exception as e:
        logger.error(f"AI generate template error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-drip-sequence")
async def ai_generate_drip_sequence(request_data: dict, current_user: dict = Depends(get_current_user)):
    """Generate a drip campaign sequence using AI"""
    goal = request_data.get("goal", "nurture")  # nurture, convert, onboard, re-engage
    num_messages = request_data.get("num_messages", 5)
    industry = request_data.get("industry", "general business")
    context = request_data.get("context", "")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        goal_prompts = {
            "nurture": "Create a nurturing sequence that builds trust and keeps the lead engaged over time.",
            "convert": "Create a conversion-focused sequence that moves leads toward making a decision.",
            "onboard": "Create an onboarding sequence that welcomes new clients and helps them get started.",
            "re-engage": "Create a re-engagement sequence that brings back cold or inactive leads.",
            "payment": "Create a payment reminder sequence that encourages timely payments.",
            "upsell": "Create an upsell sequence for existing clients about additional services."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_drip_{uuid.uuid4()}",
            system_message="You are an expert marketing automation specialist. Create effective drip campaign sequences with proper timing and messaging strategy."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Create a {num_messages}-message drip campaign sequence for {industry}.

Goal: {goal_prompts.get(goal, goal_prompts['nurture'])}

{f'Additional context: {context}' if context else ''}

Return a JSON array with this exact format:
[
  {{"step": 1, "delay_days": 0, "delay_hours": 0, "subject": "optional subject for email", "message": "the SMS/email message content", "channel": "sms"}},
  {{"step": 2, "delay_days": 2, "delay_hours": 0, "subject": "", "message": "follow up message", "channel": "sms"}}
]

Use {{client_name}} for personalization. Keep SMS messages under 160 characters.
Return ONLY the JSON array, no other text."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        try:
            # Clean up response
            json_str = response.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            sequence = json.loads(json_str)
        except:
            sequence = [{"step": 1, "delay_days": 0, "message": response.strip(), "channel": "sms"}]
        
        return {
            "sequence": sequence,
            "goal": goal,
            "num_messages": len(sequence)
        }
        
    except Exception as e:
        logger.error(f"AI generate drip sequence error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/generate-revival-message")
async def ai_generate_revival_message(request_data: dict, current_user: dict = Depends(get_current_user)):
    """Generate a lead revival message using AI"""
    days_inactive = request_data.get("days_inactive", 30)
    last_stage = request_data.get("last_stage", "unknown")
    industry = request_data.get("industry", "general business")
    approach = request_data.get("approach", "value")  # value, urgency, curiosity, personal
    context = request_data.get("context", "")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        approach_prompts = {
            "value": "Focus on providing new value or helpful information to re-engage them.",
            "urgency": "Create urgency with limited-time offers or expiring opportunities.",
            "curiosity": "Spark curiosity with intriguing questions or updates.",
            "personal": "Take a personal, caring approach checking in on them.",
            "offer": "Lead with a special offer or incentive to re-engage."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_revival_{uuid.uuid4()}",
            system_message="You are an expert at re-engaging cold leads. Create compelling messages that bring back inactive prospects without being pushy."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Create a revival message for leads who have been inactive for {days_inactive} days.

Last known stage: {last_stage}
Industry: {industry}
Approach: {approach_prompts.get(approach, approach_prompts['value'])}

{f'Additional context: {context}' if context else ''}

Create an SMS message (under 160 characters) that will re-engage this cold lead.
Use {{client_name}} for personalization.

Generate ONLY the message text, nothing else."""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "message": response.strip(),
            "days_inactive": days_inactive,
            "approach": approach
        }
        
    except Exception as e:
        logger.error(f"AI generate revival message error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/chat")
async def ai_chat(request_data: dict, current_user: dict = Depends(get_current_user)):
    """General AI chat for asking questions and getting help"""
    message = request_data.get("message", "")
    context = request_data.get("context", "general")  # templates, drip_campaigns, revival, general
    
    if not message:
        raise HTTPException(status_code=400, detail="Message required")
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        context_prompts = {
            "templates": "You are helping with SMS/email message templates. Help create, improve, or suggest templates for various scenarios.",
            "drip_campaigns": "You are helping with drip campaign automation. Help design sequences, timing, and messaging strategy.",
            "revival": "You are helping with lead revival campaigns. Help create re-engagement strategies for cold leads.",
            "general": "You are a helpful assistant for a CRM and SMS marketing platform."
        }
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_chat_{current_user['user_id']}_{context}",
            system_message=f"{context_prompts.get(context, context_prompts['general'])} Be concise and actionable in your responses."
        ).with_model("openai", "gpt-5.2")
        
        user_message = UserMessage(text=message)
        response = await chat.send_message(user_message)
        
        return {"response": response.strip(), "context": context}
        
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/ai/analyze-deal")
async def ai_analyze_deal(request_data: dict, current_user: dict = Depends(get_current_user)):
    """Analyze deal health and suggest next actions"""
    client_id = request_data.get("client_id")
    
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get conversation history
    conversations = await db.conversations.find(
        {"client_id": client_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(20)
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        raise HTTPException(status_code=500, detail="AI not configured")
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        # Calculate days since last contact
        last_contact = None
        if conversations:
            last_contact = conversations[0].get('timestamp')
        
        conv_history = "\n".join([
            f"[{msg.get('timestamp', 'unknown')[:10]}] {'Client' if msg['direction'] == 'inbound' else 'You'}: {msg['content']}"
            for msg in reversed(conversations[-10:])
        ]) if conversations else "No conversation history"
        
        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai_analyze_{client_id}",
            system_message="You are a sales analytics expert. Analyze deals and provide actionable insights."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this deal:

Client: {client['name']}
Company: {client.get('company', 'N/A')}
Pipeline Stage: {client.get('pipeline_stage', 'new_lead')}
Deal Value: ${client.get('balance', 0)}
Tags: {', '.join(client.get('tags', []))}
Last Contact: {last_contact or 'Never'}

Conversation History:
{conv_history}

Provide analysis in this JSON format:
{{
  "health_score": <1-10>,
  "status": "<hot|warm|cold|dead>",
  "days_inactive": <number or null>,
  "risk_factors": ["<factor1>", "<factor2>"],
  "suggested_actions": ["<action1>", "<action2>", "<action3>"],
  "next_message_suggestion": "<suggested message>",
  "win_probability": <0-100>
}}"""
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse JSON response
        import json
        try:
            # Extract JSON from response
            json_str = response.strip()
            if "```json" in json_str:
                json_str = json_str.split("```json")[1].split("```")[0]
            elif "```" in json_str:
                json_str = json_str.split("```")[1].split("```")[0]
            analysis = json.loads(json_str)
        except:
            analysis = {
                "health_score": 5,
                "status": "warm",
                "risk_factors": ["Unable to parse full analysis"],
                "suggested_actions": ["Follow up with client"],
                "raw_response": response.strip()
            }
        
        return {"client_id": client_id, "analysis": analysis}
        
    except Exception as e:
        logger.error(f"AI analyze error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== LEAD CAPTURE ROUTES ==============

@api_router.get("/leads/forms")
async def get_lead_forms(current_user: dict = Depends(get_current_user)):
    """Get all lead capture forms"""
    forms = await db.lead_forms.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(100)
    return forms

@api_router.post("/leads/forms")
async def create_lead_form(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a lead capture form"""
    form_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    base_url = os.environ.get('REACT_APP_BACKEND_URL')
    if not base_url:
        raise HTTPException(status_code=500, detail="REACT_APP_BACKEND_URL not configured")
    
    form_doc = {
        "id": form_id,
        "user_id": current_user["user_id"],
        "name": data.get("name", "Contact Form"),
        "fields": data.get("fields", []),
        "redirect_url": data.get("redirect_url", ""),
        "auto_tags": data.get("auto_tags", []),
        "form_url": f"{base_url}/form/{form_id}",
        "submissions_count": 0,
        "created_at": now
    }
    
    await db.lead_forms.insert_one(form_doc)
    if "_id" in form_doc:
        del form_doc["_id"]
    return form_doc

@api_router.post("/leads/webhook")
async def create_webhook(current_user: dict = Depends(get_current_user)):
    """Create a webhook endpoint for receiving leads"""
    webhook_id = str(uuid.uuid4())
    base_url = os.environ.get('REACT_APP_BACKEND_URL')
    if not base_url:
        raise HTTPException(status_code=500, detail="REACT_APP_BACKEND_URL not configured")
    
    webhook_doc = {
        "id": webhook_id,
        "user_id": current_user["user_id"],
        "url": f"{base_url}/api/webhook/lead/{webhook_id}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.webhooks.insert_one(webhook_doc)
    if "_id" in webhook_doc:
        del webhook_doc["_id"]
    return webhook_doc

@api_router.post("/webhook/lead/{webhook_id}")
async def receive_webhook_lead(webhook_id: str, data: dict):
    """Public endpoint to receive leads via webhook"""
    webhook = await db.webhooks.find_one({"id": webhook_id})
    if not webhook:
        raise HTTPException(status_code=404, detail="Webhook not found")
    
    # Create client from webhook data
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    client_doc = {
        "id": client_id,
        "user_id": webhook["user_id"],
        "name": data.get("name", "Unknown"),
        "email": data.get("email", ""),
        "phone": data.get("phone", ""),
        "company": data.get("company", ""),
        "tags": data.get("tags", ["Webhook Lead"]),
        "pipeline_stage": "new_lead",
        "source": "webhook",
        "webhook_id": webhook_id,
        "created_at": now,
        "updated_at": now
    }
    
    await db.clients.insert_one(client_doc)
    return {"success": True, "client_id": client_id}

@api_router.post("/leads/import/csv")
async def import_csv_leads(file: UploadFile, auto_tags: str = "", current_user: dict = Depends(get_current_user)):
    """Import leads from CSV file"""
    import csv
    import io
    
    contents = await file.read()
    decoded = contents.decode('utf-8')
    reader = csv.DictReader(io.StringIO(decoded))
    
    imported = 0
    errors = []
    tags = [t.strip() for t in auto_tags.split(',') if t.strip()] or ["CSV Import"]
    
    for row in reader:
        try:
            name = row.get('name', row.get('Name', '')).strip()
            phone = row.get('phone', row.get('Phone', '')).strip()
            email = row.get('email', row.get('Email', '')).strip()
            company = row.get('company', row.get('Company', '')).strip()
            
            if not name:
                errors.append(f"Row {imported + 1}: Missing name")
                continue
            
            client_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            
            await db.clients.insert_one({
                "id": client_id,
                "user_id": current_user["user_id"],
                "name": name,
                "phone": phone,
                "email": email,
                "company": company,
                "tags": tags,
                "pipeline_stage": "new_lead",
                "source": "csv_import",
                "created_at": now,
                "updated_at": now
            })
            imported += 1
        except Exception as e:
            errors.append(f"Row {imported + 1}: {str(e)}")
    
    return {"imported": imported, "errors": errors}

# ============== TEAM ROUTES ==============

@api_router.get("/team/members")
async def get_team_members(current_user: dict = Depends(get_current_user), include_archived: bool = False):
    """Get all team members in the user's organization"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    org_id = user.get("org_id")
    team_id = user.get("team_id") or current_user["user_id"]
    role = user.get("role", "agent")
    
    # Build query based on role
    if role == "org_admin":
        # Org admin sees all users
        query = {}
    elif org_id:
        # Users with org_id see all users in their org
        query = {"org_id": org_id}
    else:
        # Fallback to team_id for backwards compatibility
        query = {"$or": [{"team_id": team_id}, {"id": team_id}]}
    
    # Exclude archived by default
    if not include_archived:
        if "$and" not in query:
            query = {"$and": [query]} if query else {"$and": []}
        query["$and"].append({"$or": [{"is_archived": {"$ne": True}}, {"is_archived": {"$exists": False}}]})
    
    # Get all members
    members = await db.users.find(
        query,
        {"_id": 0, "password": 0, "hashed_password": 0, "otp": 0}
    ).to_list(500)
    
    # Add stats for each member
    for member in members:
        member["clients_count"] = await db.clients.count_documents({"user_id": member["id"]})
        member["messages_sent"] = await db.conversations.count_documents(
            {"user_id": member["id"], "direction": "outbound"}
        )
    
    return members

@api_router.get("/team/invites")
async def get_team_invites(current_user: dict = Depends(get_current_user)):
    """Get pending team invitations"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        return []
    
    team_id = user.get("team_id") or current_user["user_id"]
    invites = await db.team_invites.find(
        {"team_id": team_id, "status": "pending"},
        {"_id": 0}
    ).to_list(100)
    return invites

@api_router.get("/team/stats")
async def get_team_stats(current_user: dict = Depends(get_current_user)):
    """Get team statistics"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    team_id = user.get("team_id") or current_user["user_id"]
    
    # Get team member IDs
    members = await db.users.find(
        {"$or": [{"team_id": team_id}, {"id": team_id}]},
        {"id": 1}
    ).to_list(100)
    member_ids = [m["id"] for m in members]
    
    total_deals = await db.clients.count_documents({"user_id": {"$in": member_ids}})
    messages_sent = await db.conversations.count_documents(
        {"user_id": {"$in": member_ids}, "direction": "outbound"}
    )
    
    # Calculate pipeline value
    pipeline = await db.clients.aggregate([
        {"$match": {"user_id": {"$in": member_ids}}},
        {"$group": {"_id": None, "total": {"$sum": "$balance"}}}
    ]).to_list(1)
    pipeline_value = pipeline[0]["total"] if pipeline else 0
    
    return {
        "total_members": len(member_ids),
        "total_deals": total_deals,
        "messages_sent": messages_sent,
        "pipeline_value": pipeline_value
    }

@api_router.post("/team/invite")
async def invite_team_member(data: dict, current_user: dict = Depends(get_current_user)):
    """Invite a new team member via email"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can invite members")
    
    team_id = user.get("team_id") or current_user["user_id"]
    
    # Check if email already exists
    existing = await db.users.find_one({"email": data.get("email")})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    invite_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    invite_doc = {
        "id": invite_id,
        "team_id": team_id,
        "email": data.get("email"),
        "name": data.get("name", ""),
        "role": data.get("role", "agent"),
        "status": "pending",
        "invited_by": current_user["user_id"],
        "created_at": now
    }
    
    await db.team_invites.insert_one(invite_doc)
    if "_id" in invite_doc:
        del invite_doc["_id"]
    
    # Send invitation email via Gmail if message provided
    email_sent = False
    email_error = None
    custom_message = data.get("message", "")
    
    if custom_message:
        try:
            from routes.gmail import get_gmail_credentials
            from googleapiclient.discovery import build
            import base64
            from email.mime.text import MIMEText
            from email.mime.multipart import MIMEMultipart
            
            creds = await get_gmail_credentials(current_user["user_id"])
            if creds:
                service = build('gmail', 'v1', credentials=creds)
                
                # Build email with custom message
                html_body = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ea580c;">You're Invited to Merchant Followup!</h2>
                    <p>Hi{' ' + data.get('name') if data.get('name') else ''},</p>
                    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; white-space: pre-wrap;">
{custom_message}
                    </div>
                    <p>
                        <a href="https://merchantfollowup.com/register?invite={invite_id}" 
                           style="background: #ea580c; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                            Accept Invitation
                        </a>
                    </p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        This invitation was sent from Merchant Followup.
                    </p>
                </div>
                """
                
                message = MIMEMultipart('alternative')
                message['to'] = data.get("email")
                message['subject'] = data.get("subject", "You're Invited to Join Merchant Followup")
                
                text_part = MIMEText(custom_message, 'plain')
                html_part = MIMEText(html_body, 'html')
                
                message.attach(text_part)
                message.attach(html_part)
                
                raw_message = base64.urlsafe_b64encode(message.as_bytes()).decode('utf-8')
                sent = service.users().messages().send(userId='me', body={'raw': raw_message}).execute()
                email_sent = True
                logger.info(f"Invitation email sent to {data.get('email')}")
            else:
                email_error = "Gmail not connected"
        except Exception as e:
            logger.error(f"Failed to send invitation email: {e}")
            email_error = str(e)
    
    return {
        **invite_doc,
        "email_sent": email_sent,
        "email_error": email_error
    }

@api_router.post("/team/create-member")
async def create_team_member(data: dict, current_user: dict = Depends(get_current_user)):
    """Directly create a new team member account and send login details via email"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can create members")
    
    team_id = user.get("team_id") or current_user["user_id"]
    
    # Check if email already exists
    existing = await db.users.find_one({"email": data.get("email")})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Store plaintext password before hashing (for email)
    plaintext_password = data.get("password")
    
    # Hash the password
    hashed_password = hash_password(plaintext_password)
    
    new_user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    new_user = {
        "id": new_user_id,
        "email": data.get("email"),
        "name": data.get("name"),
        "password": hashed_password,
        "role": data.get("role", "agent"),
        "team_id": team_id,
        "is_verified": True,
        "created_at": now,
        "created_by": current_user["user_id"]
    }
    
    await db.users.insert_one(new_user)
    
    # Send email with login details via Gmail if connected
    email_sent = False
    email_error = None
    try:
        from routes.gmail import send_team_invitation_email
        result = await send_team_invitation_email(
            user_id=current_user["user_id"],
            to_email=data.get("email"),
            name=data.get("name"),
            password=plaintext_password
        )
        email_sent = result.get("success", False)
        if not email_sent:
            email_error = result.get("error", "Unknown error")
    except Exception as e:
        logger.error(f"Failed to send invitation email: {e}")
        email_error = str(e)
    
    logger.info(f"New team member created: {data.get('email')} with role {data.get('role')}, email_sent: {email_sent}")
    
    return {
        "message": "Team member created successfully",
        "user_id": new_user_id,
        "email": data.get("email"),
        "name": data.get("name"),
        "role": data.get("role"),
        "email_sent": email_sent,
        "email_error": email_error
    }

@api_router.put("/team/members/{member_id}/role")
async def update_member_role(member_id: str, role: str, current_user: dict = Depends(get_current_user)):
    """Update a team member's role"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can update roles")
    
    valid_roles = ["admin", "team_leader", "agent", "viewer"]
    if role not in valid_roles:
        raise HTTPException(status_code=400, detail=f"Invalid role. Must be one of: {valid_roles}")
    
    result = await db.users.update_one(
        {"id": member_id},
        {"$set": {"role": role}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Member not found")
    
    return {"message": "Role updated"}

@api_router.delete("/team/members/{member_id}")
async def remove_team_member(member_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a team member"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can remove members")
    
    if member_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    # Remove team_id from member (they become independent)
    await db.users.update_one(
        {"id": member_id},
        {"$unset": {"team_id": ""}}
    )
    
    return {"message": "Member removed from team"}

@api_router.post("/team/members/{member_id}/archive")
async def archive_team_member(member_id: str, current_user: dict = Depends(get_current_user)):
    """Archive a team member (soft delete)"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can archive members")
    
    if member_id == current_user["user_id"]:
        raise HTTPException(status_code=400, detail="Cannot archive yourself")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": member_id},
        {"$set": {
            "is_archived": True,
            "archived_at": now,
            "archived_by": current_user["user_id"],
            "updated_at": now
        }}
    )
    
    # Log the activity
    await log_activity(
        current_user["user_id"],
        f"Archived user: {member.get('name', member.get('email'))}",
        {"member_id": member_id},
        "user",
        member_id
    )
    
    return {"message": f"Member {member.get('name')} archived successfully"}

@api_router.post("/team/members/{member_id}/restore")
async def restore_team_member(member_id: str, current_user: dict = Depends(get_current_user)):
    """Restore an archived team member"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can restore members")
    
    member = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    now = datetime.now(timezone.utc).isoformat()
    await db.users.update_one(
        {"id": member_id},
        {"$set": {
            "is_archived": False,
            "restored_at": now,
            "restored_by": current_user["user_id"],
            "updated_at": now
        },
        "$unset": {"archived_at": "", "archived_by": ""}}
    )
    
    # Log the activity
    await log_activity(
        current_user["user_id"],
        f"Restored user: {member.get('name', member.get('email'))}",
        {"member_id": member_id},
        "user",
        member_id
    )
    
    return {"message": f"Member {member.get('name')} restored successfully"}

@api_router.get("/team/members/archived")
async def get_archived_members(current_user: dict = Depends(get_current_user)):
    """Get list of archived team members"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can view archived members")
    
    members = await db.users.find(
        {"is_archived": True},
        {"_id": 0, "password": 0, "otp": 0, "reset_otp": 0}
    ).to_list(100)
    
    return members

@api_router.get("/users/{user_id}/history")
async def get_user_history(user_id: str, current_user: dict = Depends(get_current_user)):
    """Get activity history for a specific user"""
    admin_user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    # Allow admins to view any user's history, or users to view their own
    if not is_admin_or_above(admin_user) and user_id != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's history")
    
    # Get user details
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0, "otp": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get activity logs for this user
    activities = await db.activity_logs.find(
        {"user_id": user_id}
    ).sort("created_at", -1).to_list(100)
    
    # Remove _id from activities
    for activity in activities:
        if "_id" in activity:
            del activity["_id"]
    
    # Get login history (if tracked)
    login_history = await db.login_history.find(
        {"user_id": user_id}
    ).sort("timestamp", -1).to_list(50)
    
    for login in login_history:
        if "_id" in login:
            del login["_id"]
    
    # Get user stats
    clients_count = await db.clients.count_documents({"user_id": user_id})
    messages_count = await db.conversations.count_documents({"user_id": user_id})
    deals_count = await db.funded_deals.count_documents({"user_id": user_id})
    
    return {
        "user": user,
        "activities": activities,
        "login_history": login_history,
        "stats": {
            "clients_count": clients_count,
            "messages_count": messages_count,
            "deals_count": deals_count
        }
    }

@api_router.delete("/team/invites/{invite_id}")
async def cancel_team_invite(invite_id: str, current_user: dict = Depends(get_current_user)):
    """Cancel a pending invitation"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Only admins can cancel invites")
    
    result = await db.team_invites.delete_one({"id": invite_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Invite not found")
    
    return {"message": "Invitation cancelled"}


# ============== ADMIN PASSWORD RESET ==============

@api_router.post("/team/members/{member_id}/reset-password")
async def admin_reset_password(member_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Admin/Org Admin can directly reset a user's password"""
    admin_user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(admin_user):
        raise HTTPException(status_code=403, detail="Only admins can reset passwords")
    
    # Find the target user
    target_user = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Org admin can reset anyone, regular admin can only reset users in their team/org
    if admin_user.get("role") != "org_admin":
        admin_team_id = admin_user.get("team_id") or current_user["user_id"]
        target_team_id = target_user.get("team_id")
        if target_team_id != admin_team_id and target_user.get("org_id") != admin_user.get("org_id"):
            raise HTTPException(status_code=403, detail="You can only reset passwords for users in your team/organization")
    
    new_password = data.get("new_password")
    if not new_password or len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash and update password
    hashed_password = hash_password(new_password)
    await db.users.update_one(
        {"id": member_id},
        {"$set": {"password": hashed_password, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    logger.info(f"Password reset by admin {current_user['email']} for user {target_user['email']}")
    
    return {"message": f"Password reset successfully for {target_user['email']}"}


@api_router.post("/team/members/{member_id}/send-reset-link")
async def send_password_reset_link(member_id: str, current_user: dict = Depends(get_current_user)):
    """Admin/Org Admin can send a password reset email to a user"""
    admin_user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(admin_user):
        raise HTTPException(status_code=403, detail="Only admins can send reset links")
    
    # Find the target user
    target_user = await db.users.find_one({"id": member_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Org admin can reset anyone, regular admin can only reset users in their team/org
    if admin_user.get("role") != "org_admin":
        admin_team_id = admin_user.get("team_id") or current_user["user_id"]
        target_team_id = target_user.get("team_id")
        if target_team_id != admin_team_id and target_user.get("org_id") != admin_user.get("org_id"):
            raise HTTPException(status_code=403, detail="You can only send reset links to users in your team/organization")
    
    # Generate reset token
    reset_token = str(uuid.uuid4())
    reset_expires = (datetime.now(timezone.utc) + timedelta(hours=24)).isoformat()
    
    await db.users.update_one(
        {"id": member_id},
        {"$set": {"reset_token": reset_token, "reset_expires": reset_expires}}
    )
    
    # Try to send email via Gmail
    email_sent = False
    try:
        from routes.gmail import get_gmail_credentials, build_gmail_service
        import base64
        from email.mime.text import MIMEText
        
        creds = await get_gmail_credentials(current_user["user_id"])
        if creds:
            service = build_gmail_service(creds)
            
            base_url = os.environ.get('REACT_APP_BACKEND_URL', '')
            reset_link = f"{base_url}/reset-password?token={reset_token}&email={target_user['email']}"
            
            message_text = f"""
Hello {target_user.get('name', 'User')},

An administrator has requested a password reset for your account.

Click the link below to reset your password:
{reset_link}

This link will expire in 24 hours.

If you did not request this reset, please contact your administrator.

Best regards,
Merchant Follow Up Team
            """
            
            message = MIMEText(message_text)
            message['to'] = target_user['email']
            message['subject'] = 'Password Reset Request - Merchant Follow Up'
            
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()
            service.users().messages().send(userId='me', body={'raw': raw}).execute()
            email_sent = True
    except Exception as e:
        logger.error(f"Failed to send password reset email: {e}")
    
    logger.info(f"Password reset link generated by admin {current_user['email']} for user {target_user['email']}")
    
    return {
        "message": f"Password reset link {'sent to' if email_sent else 'generated for'} {target_user['email']}",
        "email_sent": email_sent,
        "reset_token": reset_token if not email_sent else None  # Only return token if email failed
    }


# ============== TEAM LEADER MANAGEMENT ==============

@api_router.get("/team/leaders")
async def get_team_leaders(current_user: dict = Depends(get_current_user)):
    """Get all team leaders in the organization"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    team_id = user.get("team_id") or current_user["user_id"]
    leaders = await db.users.find(
        {"team_id": team_id, "role": "team_leader"},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    # Add agent count for each leader
    for leader in leaders:
        agent_count = await db.users.count_documents({"team_leader_id": leader["id"]})
        leader["agent_count"] = agent_count
    
    return leaders


@api_router.get("/team/leaders/{leader_id}/agents")
async def get_leader_agents(leader_id: str, current_user: dict = Depends(get_current_user)):
    """Get agents assigned to a team leader"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    # Admin, org_admin, or the team leader themselves can view
    if not is_admin_or_above(user) and current_user["user_id"] != leader_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    agents = await db.users.find(
        {"team_leader_id": leader_id},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    return agents


@api_router.post("/team/leaders/{leader_id}/agents")
async def assign_agent_to_leader(leader_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Assign an agent to a team leader (Admin only)"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Verify leader exists and is a team_leader
    leader = await db.users.find_one({"id": leader_id, "role": "team_leader"})
    if not leader:
        raise HTTPException(status_code=404, detail="Team leader not found")
    
    agent_id = data.get("agent_id")
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
    
    # Verify agent exists
    agent = await db.users.find_one({"id": agent_id})
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    
    # Update agent with team_leader_id
    await db.users.update_one(
        {"id": agent_id},
        {"$set": {"team_leader_id": leader_id}}
    )
    
    logger.info(f"Agent {agent['email']} assigned to team leader {leader['email']}")
    
    return {"message": f"Agent {agent['email']} assigned to {leader['name']}"}


@api_router.delete("/team/leaders/{leader_id}/agents/{agent_id}")
async def remove_agent_from_leader(leader_id: str, agent_id: str, current_user: dict = Depends(get_current_user)):
    """Remove an agent from a team leader (Admin only)"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not is_admin_or_above(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.users.update_one(
        {"id": agent_id, "team_leader_id": leader_id},
        {"$unset": {"team_leader_id": ""}}
    )
    
    return {"message": "Agent removed from team leader"}


@api_router.get("/team/my-agents")
async def get_my_agents(current_user: dict = Depends(get_current_user)):
    """Get agents assigned to the current team leader"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if user.get("role") != "team_leader":
        raise HTTPException(status_code=403, detail="Only team leaders can access this")
    
    agents = await db.users.find(
        {"team_leader_id": current_user["user_id"]},
        {"_id": 0, "password": 0}
    ).to_list(100)
    
    # Get client count and message count for each agent
    for agent in agents:
        agent["clients_count"] = await db.clients.count_documents({"user_id": agent["id"]})
        agent["messages_sent"] = await db.conversations.count_documents({"user_id": agent["id"], "direction": "outbound"})
    
    return agents


@api_router.get("/team/agent/{agent_id}/clients")
async def get_agent_clients(agent_id: str, current_user: dict = Depends(get_current_user)):
    """Team leader can view their agent's clients"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    # Check if user is admin, org_admin, or the team leader of this agent
    if is_admin_or_above(user):
        pass  # Admins can access anyone
    elif user.get("role") == "team_leader":
        # Verify agent belongs to this team leader
        agent = await db.users.find_one({"id": agent_id, "team_leader_id": current_user["user_id"]})
        if not agent:
            raise HTTPException(status_code=403, detail="This agent is not on your team")
    else:
        raise HTTPException(status_code=403, detail="Access denied")
    
    clients = await db.clients.find(
        {"user_id": agent_id},
        {"_id": 0}
    ).to_list(500)
    
    return clients


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
    # Verify client exists (use role-based access)
    accessible_ids = await get_accessible_user_ids(current_user)
    client = await db.clients.find_one(
        {"id": data.client_id, "user_id": {"$in": accessible_ids}},
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
    """Search for available phone numbers via Twilio API"""
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    
    if not twilio_sid or not twilio_token:
        placeholder_numbers = []
        for i in range(min(limit, 10)):
            placeholder_numbers.append({
                "phone_number": f"+1{area_code or '555'}{random.randint(1000000, 9999999)}",
                "friendly_name": f"({area_code or '555'}) {random.randint(100, 999)}-{random.randint(1000, 9999)}",
                "capabilities": {"SMS": True, "voice": True},
                "region": "US",
                "locality": ""
            })
        return {"available_numbers": placeholder_numbers, "provider_configured": False}
    
    def _parse_capabilities(caps):
        if not caps:
            return {"SMS": False, "voice": False, "MMS": False}
        lower_caps = {k.lower(): v for k, v in caps.items()} if isinstance(caps, dict) else {}
        return {
            "SMS": lower_caps.get("sms", False),
            "voice": lower_caps.get("voice", False),
            "MMS": lower_caps.get("mms", False),
        }

    def _format_results(numbers):
        results = []
        for n in numbers:
            results.append({
                "phone_number": n.phone_number,
                "friendly_name": n.friendly_name,
                "capabilities": _parse_capabilities(n.capabilities),
                "region": n.region or "",
                "locality": n.locality or "",
                "postal_code": n.postal_code or "",
            })
        return results

    try:
        from twilio.rest import Client
        twilio_client = Client(twilio_sid, twilio_token)
        
        has_area_code = bool(area_code and len(area_code) == 3)
        cap_limit = min(limit, 30)
        
        # 1) Local numbers with SMS + requested area code
        kwargs = {"limit": cap_limit, "sms_enabled": True}
        if has_area_code:
            kwargs["area_code"] = area_code
        numbers = twilio_client.available_phone_numbers(country).local.list(**kwargs)
        if numbers:
            return {"available_numbers": _format_results(numbers), "provider_configured": True}
        
        # 2) If area code specified, try mobile numbers for that area code (often SMS-capable)
        if has_area_code:
            try:
                mobile_kwargs = {"limit": cap_limit, "sms_enabled": True, "area_code": area_code}
                numbers = twilio_client.available_phone_numbers(country).mobile.list(**mobile_kwargs)
                if numbers:
                    return {"available_numbers": _format_results(numbers), "provider_configured": True}
            except Exception:
                pass  # Mobile search not available in all countries
        
        # 3) If area code specified, try local WITHOUT sms filter (voice-only for that area)
        if has_area_code:
            kwargs_no_sms = {"limit": cap_limit, "area_code": area_code}
            numbers = twilio_client.available_phone_numbers(country).local.list(**kwargs_no_sms)
            if numbers:
                return {"available_numbers": _format_results(numbers), "provider_configured": True, "note": "No SMS-enabled numbers found for this area code. Showing voice-only numbers."}
        
        # 4) Only fall back to toll-free if NO area code was specified
        if not has_area_code:
            tf_kwargs = {"limit": cap_limit, "sms_enabled": True}
            numbers = twilio_client.available_phone_numbers(country).toll_free.list(**tf_kwargs)
            if numbers:
                return {"available_numbers": _format_results(numbers), "provider_configured": True, "type": "toll_free"}
        
        # Nothing found at all
        return {"available_numbers": [], "provider_configured": True, "note": f"No numbers available for area code {area_code}. Try a different area code."}
    except Exception as e:
        logger.error(f"Twilio number search error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to search numbers: {str(e)}")

@api_router.post("/phone-numbers/purchase")
async def purchase_phone_number(data: PhoneNumberCreate, current_user: dict = Depends(get_current_user)):
    """Purchase/add a phone number - deducts credits from org balance"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = user.get("role", "agent")
    org_id = user.get("org_id")
    
    # org_admin can always buy
    if role == "org_admin":
        pass
    elif role == "admin":
        pass
    elif role in ["agent", "team_leader"]:
        if org_id:
            org = await db.organizations.find_one({"id": org_id})
            if org and org.get("allow_rep_purchases") is False:
                raise HTTPException(status_code=403, detail="Your organization does not allow reps to purchase phone numbers")
            rep_limit = org.get("rep_monthly_number_limit", 0) if org else 0
            if rep_limit > 0:
                now = datetime.now(timezone.utc)
                month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
                purchased_this_month = await db.phone_numbers.count_documents({
                    "user_id": current_user["user_id"],
                    "created_at": {"$gte": month_start}
                })
                if purchased_this_month >= rep_limit:
                    raise HTTPException(
                        status_code=403, 
                        detail=f"Monthly purchase limit reached ({rep_limit} numbers/month). Contact your admin."
                    )
    else:
        raise HTTPException(status_code=403, detail="You don't have permission to purchase phone numbers")
    
    # Deduct credits from org balance (40 credits per number)
    PHONE_NUMBER_COST_CREDITS = 40
    if org_id:
        from routes.credits import deduct_credits
        await deduct_credits(
            org_id=org_id,
            user_id=current_user["user_id"],
            amount=PHONE_NUMBER_COST_CREDITS,
            source="phone_number",
            description=f"Phone number purchase: {data.phone_number}",
            metadata={"phone_number": data.phone_number}
        )
    
    # Actually purchase through Twilio if configured
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    twilio_purchased = False
    twilio_sid_number = None
    
    if twilio_sid and twilio_token and data.provider == "twilio":
        try:
            from twilio.rest import Client
            client = Client(twilio_sid, twilio_token)
            
            # Buy the number
            backend_url = os.environ.get('BACKEND_URL', '')
            incoming = client.incoming_phone_numbers.create(
                phone_number=data.phone_number,
                sms_url=f"{backend_url}/api/sms/webhook/inbound",
                sms_method="POST",
                status_callback=f"{backend_url}/api/sms/webhook/status",
                voice_url=f"{backend_url}/api/phone-blower/twiml/blower-message",
                voice_method="POST",
            )
            twilio_purchased = True
            twilio_sid_number = incoming.sid
            logger.info(f"Twilio number purchased: {data.phone_number} (SID: {incoming.sid})")
            
            # Auto-add to Messaging Service for A2P 10DLC compliance
            ms_sid = os.environ.get('TWILIO_MESSAGING_SERVICE_SID', '')
            if ms_sid:
                try:
                    client.messaging.v1.services(ms_sid).phone_numbers.create(
                        phone_number_sid=incoming.sid
                    )
                    logger.info(f"Added {data.phone_number} to Messaging Service {ms_sid}")
                except Exception as ms_err:
                    logger.warning(f"Could not add number to Messaging Service: {ms_err}")
        except Exception as e:
            logger.error(f"Twilio purchase failed: {e}")
            # Refund credits if Twilio purchase fails
            if org_id:
                from routes.credits import add_credits
                await add_credits(
                    org_id=org_id,
                    user_id=current_user["user_id"],
                    amount=PHONE_NUMBER_COST_CREDITS,
                    source="refund",
                    description=f"Refund: Failed to purchase {data.phone_number} — {str(e)}",
                )
                # Dispatch balance update
            raise HTTPException(status_code=500, detail=f"Twilio purchase failed: {str(e)}")
    
    phone_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    assigned_user_name = None
    if data.assigned_user_id:
        assigned_user = await db.users.find_one({"id": data.assigned_user_id})
        if assigned_user:
            assigned_user_name = assigned_user.get("name")
    
    assigned_user_id = data.assigned_user_id
    if role in ["agent", "team_leader"] and not assigned_user_id:
        assigned_user_id = current_user["user_id"]
        assigned_user_name = user.get("name")
    
    phone_doc = {
        "id": phone_id,
        "user_id": current_user["user_id"],
        "org_id": user.get("org_id"),
        "phone_number": data.phone_number,
        "friendly_name": data.friendly_name or data.phone_number,
        "provider": data.provider,
        "is_active": True,
        "is_default": False,
        "assigned_user_id": assigned_user_id,
        "assigned_user_name": assigned_user_name,
        "monthly_cost": 8.00,
        "credit_cost": PHONE_NUMBER_COST_CREDITS,
        "twilio_sid": twilio_sid_number,
        "twilio_purchased": twilio_purchased,
        "created_at": now
    }
    
    if not phone_doc["org_id"] and assigned_user_id:
        assigned_user = await db.users.find_one({"id": assigned_user_id})
        if assigned_user and assigned_user.get("org_id"):
            phone_doc["org_id"] = assigned_user["org_id"]
    
    await db.phone_numbers.insert_one(phone_doc)
    if "_id" in phone_doc:
        del phone_doc["_id"]
    return phone_doc

@api_router.get("/phone-numbers/owned", response_model=List[PhoneNumberResponse])
async def get_owned_numbers(current_user: dict = Depends(get_current_user)):
    """List phone numbers - admins see all org numbers, agents see only assigned"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        return []
    
    role = user.get("role", "agent")
    org_id = user.get("org_id")
    user_id = current_user["user_id"]
    
    if role == "org_admin":
        # Org admin sees all numbers
        numbers = await db.phone_numbers.find({}, {"_id": 0}).to_list(500)
    elif role == "admin":
        # Admin sees all numbers in their org + numbers assigned to them
        # Also find numbers assigned to any user in their org (even if org_id on number is None)
        org_user_ids = []
        if org_id:
            org_users = await db.users.find({"org_id": org_id}, {"id": 1, "_id": 0}).to_list(500)
            org_user_ids = [u["id"] for u in org_users]
        
        conditions = [
            {"assigned_user_id": user_id},
            {"user_id": user_id}
        ]
        if org_id:
            conditions.append({"org_id": org_id})
        if org_user_ids:
            conditions.append({"assigned_user_id": {"$in": org_user_ids}})
        
        query = {"$or": conditions}
        numbers = await db.phone_numbers.find(query, {"_id": 0}).to_list(200)
    else:
        # Agents see only numbers assigned to them
        query = {"assigned_user_id": user_id}
        numbers = await db.phone_numbers.find(query, {"_id": 0}).to_list(100)
    
    return numbers

@api_router.put("/phone-numbers/{phone_id}")
async def update_phone_number(phone_id: str, data: PhoneNumberUpdate, current_user: dict = Depends(get_current_user)):
    """Update a phone number (admin only)"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can update phone numbers")
    
    update_data = {}
    if data.friendly_name is not None:
        update_data["friendly_name"] = data.friendly_name
    
    # Handle assignment: sentinel "___UNSET___" means not provided, None means unassign, string means assign
    if data.assigned_user_id != "___UNSET___":
        if data.assigned_user_id:
            # Assigning to a user
            assigned_user = await db.users.find_one({"id": data.assigned_user_id})
            update_data["assigned_user_id"] = data.assigned_user_id
            update_data["assigned_user_name"] = assigned_user.get("name") if assigned_user else None
            # Also update org_id to match the assigned user's org so admins in the same org can see it
            if assigned_user and assigned_user.get("org_id"):
                update_data["org_id"] = assigned_user["org_id"]
        else:
            # Unassigning (null was sent)
            update_data["assigned_user_id"] = None
            update_data["assigned_user_name"] = None
    
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    if update_data:
        result = await db.phone_numbers.update_one(
            {"id": phone_id},
            {"$set": update_data}
        )
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Phone number not found")
    
    updated = await db.phone_numbers.find_one({"id": phone_id}, {"_id": 0})
    return updated

@api_router.delete("/phone-numbers/{phone_id}")
async def release_phone_number(phone_id: str, current_user: dict = Depends(get_current_user)):
    """Release a phone number (admin only)"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Only admins can release phone numbers")
    
    result = await db.phone_numbers.delete_one({"id": phone_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Phone number not found")
    return {"message": "Phone number released"}

@api_router.post("/phone-numbers/{phone_id}/request-deletion")
async def request_phone_number_deletion(phone_id: str, current_user: dict = Depends(get_current_user)):
    """Request deletion of a phone number - creates a request, doesn't delete immediately"""
    phone = await db.phone_numbers.find_one({"id": phone_id}, {"_id": 0})
    if not phone:
        raise HTTPException(status_code=404, detail="Phone number not found")
    
    user = await db.users.find_one({"id": current_user["user_id"]})
    now = datetime.now(timezone.utc).isoformat()
    
    request_doc = {
        "id": str(uuid.uuid4()),
        "phone_id": phone_id,
        "phone_number": phone.get("phone_number"),
        "requested_by": current_user["user_id"],
        "requested_by_name": user.get("name") if user else None,
        "org_id": phone.get("org_id"),
        "status": "pending",
        "created_at": now
    }
    
    await db.phone_deletion_requests.insert_one(request_doc)
    if "_id" in request_doc:
        del request_doc["_id"]
    
    return {"message": "Deletion request submitted. Expect a phone call from the admin within 24 hours."}

@api_router.put("/phone-numbers/{phone_id}/set-default")
async def set_default_phone_number(phone_id: str, current_user: dict = Depends(get_current_user)):
    """Set a phone number as the default for the user"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    org_id = user.get("org_id")
    
    # Unset all current defaults in user's scope
    if user.get("role") in ["admin", "org_admin"]:
        # Admin: unset defaults in org
        if org_id:
            await db.phone_numbers.update_many(
                {"org_id": org_id},
                {"$set": {"is_default": False}}
            )
        else:
            await db.phone_numbers.update_many(
                {"user_id": current_user["user_id"]},
                {"$set": {"is_default": False}}
            )
    else:
        # Agent: only affects their assigned numbers
        await db.phone_numbers.update_many(
            {"assigned_user_id": current_user["user_id"]},
            {"$set": {"is_default": False}}
        )
    
    # Set the new default
    result = await db.phone_numbers.update_one(
        {"id": phone_id},
        {"$set": {"is_default": True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Phone number not found")
    return {"message": "Default phone number updated"}

@api_router.get("/phone-numbers/default")
async def get_default_phone_number(current_user: dict = Depends(get_current_user)):
    """Get the default phone number for the user"""
    default_number = await db.phone_numbers.find_one(
        {"user_id": current_user["user_id"], "is_default": True},
        {"_id": 0}
    )
    if not default_number:
        # Return first number if no default set
        first_number = await db.phone_numbers.find_one(
            {"user_id": current_user["user_id"]},
            {"_id": 0}
        )
        return first_number
    return default_number

# ============== CONTACT MESSAGING & CALLING ROUTES ==============

@api_router.get("/contacts/{client_id}/conversation")
async def get_conversation(
    client_id: str, 
    from_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS conversation history with a client, optionally filtered by from_number"""
    # Use role-based access
    accessible_ids = await get_accessible_user_ids(current_user)
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Build query - filter by from_number if specified
    query = {"user_id": {"$in": accessible_ids}, "client_id": client_id}
    if from_number and from_number != "default":
        query["from_number"] = from_number
    elif from_number == "default":
        query["$or"] = [{"from_number": None}, {"from_number": {"$exists": False}}]
    
    messages = await db.conversations.find(query, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(100)
    
    return {
        "client": client,
        "messages": list(reversed(messages)),
        "from_number": from_number
    }

@api_router.get("/contacts/{client_id}/chains")
async def get_conversation_chains(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get all conversation chains (by phone number) for a client"""
    # Use role-based access
    accessible_ids = await get_accessible_user_ids(current_user)
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all unique from_numbers used with this client
    pipeline = [
        {"$match": {"user_id": {"$in": accessible_ids}, "client_id": client_id}},
        {"$group": {
            "_id": "$from_number",
            "message_count": {"$sum": 1},
            "last_message": {"$last": "$content"},
            "last_timestamp": {"$max": "$timestamp"}
        }},
        {"$sort": {"last_timestamp": -1}}
    ]
    
    chains_raw = await db.conversations.aggregate(pipeline).to_list(50)
    
    # Get owned phone numbers for display names
    owned_numbers = await db.phone_numbers.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "phone_number": 1, "friendly_name": 1}
    ).to_list(50)
    
    number_names = {n["phone_number"]: n.get("friendly_name", n["phone_number"]) for n in owned_numbers}
    
    chains = []
    for chain in chains_raw:
        from_num = chain["_id"]
        chains.append({
            "from_number": from_num or "default",
            "display_name": number_names.get(from_num, "Default Number") if from_num else "Default Number",
            "message_count": chain["message_count"],
            "last_message": chain["last_message"],
            "last_timestamp": chain["last_timestamp"]
        })
    
    # If no chains exist, add default
    if not chains:
        chains.append({
            "from_number": "default",
            "display_name": "Default Number",
            "message_count": 0,
            "last_message": None,
            "last_timestamp": None
        })
    
    return {"client": client, "chains": chains}

@api_router.post("/contacts/{client_id}/send-sms")
async def send_sms_to_contact(
    client_id: str,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Send SMS to a contact from a specific phone number"""
    message = data.get("message", "")
    from_number = data.get("from_number")
    campaign_id = data.get("campaign_id")
    campaign_name = data.get("campaign_name")
    step_number = data.get("step_number")
    
    # Use role-based access
    accessible_ids = await get_accessible_user_ids(current_user)
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Replace template variables with client data
    def replace_variables(text, client_data):
        replacements = {
            '{name}': client_data.get('name', ''),
            '{first_name}': client_data.get('name', '').split()[0] if client_data.get('name') else '',
            '{company}': client_data.get('company', ''),
            '{phone}': client_data.get('phone', ''),
            '{email}': client_data.get('email', ''),
            '{balance}': f"${client_data.get('balance', 0):.2f}",
            '{amount}': f"${client_data.get('balance', 0):.2f}",
            '{date}': datetime.now(timezone.utc).strftime('%B %d, %Y'),
            '{due_date}': datetime.now(timezone.utc).strftime('%B %d, %Y'),
            '{client_name}': client_data.get('name', ''),
        }
        result = text
        for var, value in replacements.items():
            result = result.replace(var, str(value))
        return result
    
    # Process the message to replace variables
    processed_message = replace_variables(message, client)
    
    # Check for active SMS provider
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    # Validate from_number - user must have access to this number
    if from_number:
        user = await db.users.find_one({"id": current_user["user_id"]})
        role = user.get("role", "agent") if user else "agent"
        org_id = user.get("org_id") if user else None
        
        if role == "org_admin":
            owned_number = await db.phone_numbers.find_one({"phone_number": from_number})
        elif role == "admin":
            # Admins can use any number in their org
            owned_number = await db.phone_numbers.find_one({
                "phone_number": from_number,
                "$or": [
                    {"org_id": org_id} if org_id else {"user_id": current_user["user_id"]},
                    {"assigned_user_id": current_user["user_id"]},
                    {"user_id": current_user["user_id"]}
                ]
            })
        else:
            # Agents can only use numbers assigned to them
            owned_number = await db.phone_numbers.find_one({
                "phone_number": from_number,
                "assigned_user_id": current_user["user_id"]
            })
        
        if not owned_number:
            raise HTTPException(status_code=400, detail="You don't own this phone number")
        
        # Block sending from numbers not actually provisioned on Twilio
        if not owned_number.get("twilio_purchased"):
            raise HTTPException(
                status_code=400,
                detail=f"Number {from_number} is not a live Twilio number. Please purchase a number through the app to send real SMS."
            )
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Store the message with processed content and campaign info
    message_doc = {
        "id": message_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "direction": "outbound",
        "content": processed_message,
        "from_number": from_number,
        "timestamp": now,
        "status": "pending",
        "campaign_id": campaign_id,
        "campaign_name": campaign_name,
        "step_number": step_number
    }
    
    # Send via Twilio if configured
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN")
    
    if twilio_sid and twilio_token and from_number and client.get("phone"):
        try:
            from twilio.rest import Client
            twilio_client = Client(twilio_sid, twilio_token)
            
            # Normalize the to-number to E.164 format
            raw = client["phone"]
            digits = ''.join(c for c in raw if c.isdigit())
            if len(digits) == 10:
                to_phone = f"+1{digits}"
            elif len(digits) == 11 and digits.startswith('1'):
                to_phone = f"+{digits}"
            elif digits:
                to_phone = f"+{digits}"
            else:
                raise ValueError(f"Client has no valid phone digits: {raw}")
            
            status_cb = os.environ.get('BACKEND_URL', '')
            ms_sid = os.environ.get('TWILIO_MESSAGING_SERVICE_SID', '')
            
            # Build Twilio message params
            msg_params = {
                "body": processed_message,
                "to": to_phone,
            }
            
            # Use Messaging Service if configured (for A2P 10DLC compliance)
            if ms_sid:
                msg_params["messaging_service_sid"] = ms_sid
                # Still pass from_ so the specific number is used
                msg_params["from_"] = from_number
            else:
                msg_params["from_"] = from_number
            
            if status_cb:
                msg_params["status_callback"] = f"{status_cb}/api/sms/webhook/status"
            
            msg = twilio_client.messages.create(**msg_params)
            message_doc["status"] = msg.status or "sent"
            message_doc["twilio_sid"] = msg.sid
            logger.info(f"SMS sent via Twilio: {msg.sid} from {from_number} to {to_phone}")
        except Exception as e:
            logger.error(f"Twilio send error: {e}")
            message_doc["status"] = "failed"
            message_doc["error"] = str(e)
    else:
        message_doc["status"] = "pending_provider"
        message_doc["note"] = "Twilio not configured or missing from_number"
    
    await db.conversations.insert_one(message_doc)
    
    return {
        "message_id": message_id,
        "from_number": from_number,
        "status": message_doc["status"],
        "twilio_sid": message_doc.get("twilio_sid"),
        "error": message_doc.get("error"),
    }

# ============== INBOUND SMS WEBHOOK (Twilio/Provider) ==============

@api_router.post("/sms/inbound")
async def receive_inbound_sms_legacy(
    From: str = Form(""),
    To: str = Form(""),
    Body: str = Form(""),
    MessageSid: str = Form(""),
):
    """
    Legacy inbound SMS webhook (form-encoded).
    Redirects to the canonical /sms/webhook/inbound handler.
    """
    from fastapi.responses import Response
    EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'

    if not From or not Body:
        return Response(content=EMPTY_TWIML, media_type="application/xml")

    customer_phone = From
    our_number = To
    customer_phone_clean = customer_phone.replace("+1", "").replace("+", "").replace("-", "").replace(" ", "")

    # Find the client by phone number
    client_doc = await db.clients.find_one({
        "phone": {"$regex": customer_phone_clean[-10:] if len(customer_phone_clean) >= 10 else customer_phone_clean}
    })

    # Find owner of the Twilio number
    phone_owner = await db.phone_numbers.find_one(
        {"phone_number": our_number},
        {"_id": 0, "user_id": 1, "assigned_user_id": 1}
    )
    user_id = None
    if phone_owner:
        user_id = phone_owner.get("assigned_user_id") or phone_owner.get("user_id")
    if not user_id:
        last_outbound = await db.conversations.find_one(
            {"from_number": our_number, "direction": "outbound"},
            sort=[("timestamp", -1)]
        )
        if last_outbound:
            user_id = last_outbound.get("user_id")

    client_id = client_doc.get("id") if client_doc else None

    # Find last outbound for campaign context
    responding_to_content = None
    campaign_name = None
    campaign_id = None
    if client_id:
        our_clean = our_number.replace("+1", "").replace("+", "").replace("-", "").replace(" ", "")
        last_outbound = await db.conversations.find_one(
            {
                "client_id": client_id,
                "direction": "outbound",
                "$or": [
                    {"from_number": our_number},
                    {"from_number": {"$regex": our_clean[-10:] if len(our_clean) >= 10 else our_clean}}
                ]
            },
            sort=[("timestamp", -1)]
        )
        if last_outbound:
            responding_to_content = last_outbound.get("content", "")
            campaign_name = last_outbound.get("campaign_name")
            campaign_id = last_outbound.get("campaign_id")

    now = datetime.now(timezone.utc).isoformat()
    message_id = str(uuid.uuid4())

    inbound_doc = {
        "id": message_id,
        "user_id": user_id,
        "client_id": client_id,
        "direction": "inbound",
        "content": Body,
        "from_number": our_number,
        "customer_phone": customer_phone,
        "timestamp": now,
        "status": "received",
        "responding_to": responding_to_content,
        "campaign_name": campaign_name,
        "campaign_id": campaign_id,
        "twilio_sid": MessageSid
    }
    await db.conversations.insert_one(inbound_doc)

    if not client_doc:
        await db.orphan_messages.insert_one({
            "id": str(uuid.uuid4()),
            "from_number": customer_phone,
            "to_number": our_number,
            "content": Body,
            "timestamp": now,
            "status": "unmatched"
        })

    logger.info(f"Inbound SMS from {customer_phone} to {our_number} - Client: {client_doc.get('name', 'Unknown') if client_doc else 'Unknown'}")
    return Response(content=EMPTY_TWIML, media_type="application/xml")

@api_router.post("/sms/simulate-inbound")
async def simulate_inbound_sms(
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    DEV/TEST endpoint: Simulate an inbound SMS reply from a customer.
    This helps test the reply context feature without real Twilio integration.
    """
    client_id = data.get("client_id")
    message_content = data.get("message", "Test reply message")
    from_number = data.get("from_number")  # Optional: which of your numbers they're replying to
    
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Find the last outbound message to this client
    query = {
        "client_id": client_id,
        "direction": "outbound",
        "user_id": current_user["user_id"]
    }
    if from_number:
        query["from_number"] = from_number
    
    last_outbound = await db.conversations.find_one(
        query,
        sort=[("timestamp", -1)]
    )
    
    # Build the responding_to context
    responding_to_content = None
    campaign_name = None
    campaign_id = None
    
    if last_outbound:
        responding_to_content = last_outbound.get("content", "")
        campaign_name = last_outbound.get("campaign_name")
        campaign_id = last_outbound.get("campaign_id")
    
    # Store the simulated inbound message
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    inbound_doc = {
        "id": message_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "direction": "inbound",
        "content": message_content,
        "from_number": from_number or last_outbound.get("from_number") if last_outbound else None,
        "customer_phone": client["phone"],
        "timestamp": now,
        "status": "received",
        "responding_to": responding_to_content,
        "campaign_name": campaign_name,
        "campaign_id": campaign_id,
        "simulated": True
    }
    
    await db.conversations.insert_one(inbound_doc)
    
    return {
        "message_id": message_id,
        "client_name": client["name"],
        "responding_to": responding_to_content[:100] + "..." if responding_to_content and len(responding_to_content) > 100 else responding_to_content,
        "campaign_name": campaign_name,
        "note": "Simulated inbound SMS for testing reply context"
    }

@api_router.post("/contacts/{client_id}/initiate-call")
async def initiate_call(
    client_id: str, 
    from_number: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Initiate a call to a contact - returns call token for browser calling"""
    client = await db.clients.find_one(
        {"id": client_id, "user_id": current_user["user_id"]}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate from_number if provided
    caller_id = None
    if from_number:
        user = await db.users.find_one({"id": current_user["user_id"]})
        role = user.get("role", "agent") if user else "agent"
        org_id = user.get("org_id") if user else None
        
        if role == "org_admin":
            phone_num = await db.phone_numbers.find_one({"phone_number": from_number})
        elif role == "admin":
            phone_num = await db.phone_numbers.find_one({
                "phone_number": from_number,
                "$or": [
                    {"org_id": org_id} if org_id else {"user_id": current_user["user_id"]},
                    {"assigned_user_id": current_user["user_id"]},
                    {"user_id": current_user["user_id"]}
                ]
            })
        else:
            phone_num = await db.phone_numbers.find_one({
                "phone_number": from_number,
                "assigned_user_id": current_user["user_id"]
            })
        
        if phone_num:
            caller_id = from_number
    
    # Check for active SMS provider with voice capability
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    call_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Log the call attempt with from_number
    call_doc = {
        "id": call_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "client_name": client["name"],
        "client_phone": client["phone"],
        "from_number": caller_id,
        "status": "initiated",
        "created_at": now
    }
    
    await db.call_logs.insert_one(call_doc)
    
    return {
        "call_id": call_id,
        "client_phone": client["phone"],
        "client_name": client["name"],
        "from_number": caller_id,
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
    from_number = request_data.get("from_number")
    
    # Get client using role-based access
    accessible_ids = await get_accessible_user_ids(current_user)
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Validate from_number - user must have access to this number
    if from_number:
        user = await db.users.find_one({"id": current_user["user_id"]})
        role = user.get("role", "agent") if user else "agent"
        org_id = user.get("org_id") if user else None
        
        if role == "org_admin":
            phone_num = await db.phone_numbers.find_one({"phone_number": from_number})
        elif role == "admin":
            phone_num = await db.phone_numbers.find_one({
                "phone_number": from_number,
                "$or": [
                    {"org_id": org_id} if org_id else {"user_id": current_user["user_id"]},
                    {"assigned_user_id": current_user["user_id"]},
                    {"user_id": current_user["user_id"]}
                ]
            })
        else:
            phone_num = await db.phone_numbers.find_one({
                "phone_number": from_number,
                "assigned_user_id": current_user["user_id"]
            })
        
        if not phone_num:
            raise HTTPException(status_code=400, detail="Invalid from number")
    
    # Get template
    template = await db.templates.find_one(
        {"id": template_id, "user_id": current_user["user_id"]}
    )
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    # Substitute variables in template content
    message_content = template["content"]
    
    # Apply custom variables first
    if variables:
        for var, value in variables.items():
            message_content = message_content.replace(f"{{{var}}}", str(value))
    
    # Default variable substitutions from client data
    client_name = client.get("name", "") or ""
    first_name = client_name.split()[0] if client_name else ""
    
    default_vars = {
        "name": client_name,
        "first_name": first_name,
        "client_name": client_name,
        "company": client.get("company", "") or "",
        "client_company": client.get("company", "") or "",
        "phone": client.get("phone", "") or "",
        "email": client.get("email", "") or "",
        "balance": f"${client.get('balance', 0):.2f}",
        "amount": f"${client.get('balance', 0):.2f}",
        "client_balance": f"${client.get('balance', 0):.2f}",
        "date": datetime.now(timezone.utc).strftime('%B %d, %Y'),
        "due_date": datetime.now(timezone.utc).strftime('%B %d, %Y'),
        "payment_link": f"https://pay.example.com/{client_id}"
    }
    
    for var, value in default_vars.items():
        message_content = message_content.replace(f"{{{var}}}", str(value) if value else "")
    
    # Check for active SMS provider
    provider = await db.sms_providers.find_one(
        {"user_id": current_user["user_id"], "is_active": True}
    )
    
    message_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Store the message with from_number
    message_doc = {
        "id": message_id,
        "user_id": current_user["user_id"],
        "client_id": client_id,
        "template_id": template_id,
        "direction": "outbound",
        "content": message_content,
        "from_number": from_number,
        "to_number": client.get("phone"),
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
        "from_number": from_number,
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

# ============== FUNDED DEALS ROUTES ==============

from funded_deals import generate_payment_schedule, calculate_deal_totals, auto_clear_payments, get_payment_status

DEAL_TYPES = ["MCA", "Term Loan", "Line of Credit", "Equipment Financing", "Revenue Based", "Invoice Factoring"]
PAYMENT_FREQUENCIES = ["daily", "weekly", "bi-weekly", "monthly"]

@api_router.get("/funded/deal-types")
async def get_deal_types():
    """Get available deal types"""
    return {"deal_types": DEAL_TYPES, "payment_frequencies": PAYMENT_FREQUENCIES}

@api_router.post("/funded/deals")
async def create_funded_deal(data: dict, current_user: dict = Depends(get_current_user)):
    """Create a new funded deal"""
    deal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Generate payment schedule
    payment_schedule = generate_payment_schedule(
        start_date=data.get("start_date", now),
        num_payments=data.get("num_payments", 1),
        payment_amount=data.get("payment_amount", 0),
        frequency=data.get("payment_frequency", "weekly")
    )
    
    # Calculate maturity date
    if payment_schedule:
        maturity_date = payment_schedule[-1]["due_date"]
    else:
        maturity_date = data.get("start_date", now)
    
    deal_doc = {
        "id": deal_id,
        "user_id": current_user["user_id"],
        "client_id": data.get("client_id"),
        "client_name": data.get("client_name", ""),
        "business_name": data.get("business_name", ""),
        "deal_type": data.get("deal_type", "MCA"),
        "funded_amount": data.get("funded_amount", 0),
        "funding_date": data.get("funding_date", now),
        "payback_amount": data.get("payback_amount", 0),
        "payment_frequency": data.get("payment_frequency", "weekly"),
        "num_payments": data.get("num_payments", 1),
        "payment_amount": data.get("payment_amount", 0),
        "start_date": data.get("start_date", now),
        "maturity_date": maturity_date,
        "payment_schedule": payment_schedule,
        "payment_link": data.get("payment_link", ""),
        "assigned_rep": data.get("assigned_rep"),
        "assigned_rep_name": data.get("assigned_rep_name", ""),
        "notes": data.get("notes", ""),
        "status": "active",  # active, paid_off, defaulted
        "payment_status": "current",  # current, late, severely_late, paid_off
        "milestone_50_notified": False,
        "created_at": now,
        "updated_at": now
    }
    
    # Calculate initial totals
    totals = calculate_deal_totals(payment_schedule)
    deal_doc.update(totals)
    
    await db.funded_deals.insert_one(deal_doc)
    
    # Update client pipeline stage to funded
    await db.clients.update_one(
        {"id": data.get("client_id")},
        {"$set": {"pipeline_stage": "funded", "updated_at": now}}
    )
    
    if "_id" in deal_doc:
        del deal_doc["_id"]
    return deal_doc

@api_router.get("/funded/deals")
async def get_funded_deals(
    status: Optional[str] = None,
    payment_status: Optional[str] = None,
    assigned_rep: Optional[str] = None,
    deal_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all funded deals with filters"""
    query = {"user_id": current_user["user_id"]}
    
    if status:
        query["status"] = status
    if payment_status:
        query["payment_status"] = payment_status
    if assigned_rep:
        query["assigned_rep"] = assigned_rep
    if deal_type:
        query["deal_type"] = deal_type
    
    deals = await db.funded_deals.find(query, {"_id": 0}).sort("funding_date", -1).to_list(500)
    
    # Auto-clear payments and recalculate for each deal
    for deal in deals:
        deal["payment_schedule"] = auto_clear_payments(deal.get("payment_schedule", []))
        totals = calculate_deal_totals(deal["payment_schedule"])
        deal.update(totals)
        
        # Check 50% milestone
        if totals["percent_paid"] >= 50 and not deal.get("milestone_50_notified"):
            deal["milestone_50_reached"] = True
    
    return deals

@api_router.get("/funded/deals/{deal_id}")
async def get_funded_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single funded deal with full details"""
    deal = await db.funded_deals.find_one(
        {"id": deal_id, "user_id": current_user["user_id"]},
        {"_id": 0}
    )
    if not deal:
        raise HTTPException(status_code=404, detail="Funded deal not found")
    
    # Auto-clear and recalculate
    deal["payment_schedule"] = auto_clear_payments(deal.get("payment_schedule", []))
    totals = calculate_deal_totals(deal["payment_schedule"])
    deal.update(totals)
    
    # Get conversation history
    conversations = await db.conversations.find(
        {"client_id": deal.get("client_id"), "user_id": current_user["user_id"]},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    deal["conversations"] = conversations
    
    # Get payment reminder logs
    reminders = await db.funded_deal_reminders.find(
        {"deal_id": deal_id},
        {"_id": 0}
    ).sort("sent_at", -1).to_list(50)
    deal["reminder_logs"] = reminders
    
    return deal

@api_router.put("/funded/deals/{deal_id}")
async def update_funded_deal(deal_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    """Update funded deal details"""
    update_data = {k: v for k, v in data.items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    result = await db.funded_deals.update_one(
        {"id": deal_id, "user_id": current_user["user_id"]},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Funded deal not found")
    
    return {"message": "Deal updated"}

@api_router.delete("/funded/deals/{deal_id}")
async def delete_funded_deal(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a funded deal"""
    result = await db.funded_deals.delete_one(
        {"id": deal_id, "user_id": current_user["user_id"]}
    )
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Funded deal not found")
    
    return {"message": "Deal deleted"}

@api_router.put("/funded/deals/{deal_id}/payment/{payment_number}")
async def update_payment(
    deal_id: str,
    payment_number: int,
    data: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update a specific payment in the schedule"""
    deal = await db.funded_deals.find_one(
        {"id": deal_id, "user_id": current_user["user_id"]}
    )
    if not deal:
        raise HTTPException(status_code=404, detail="Funded deal not found")
    
    schedule = deal.get("payment_schedule", [])
    
    # Find the payment
    payment_idx = None
    for i, p in enumerate(schedule):
        if p["payment_number"] == payment_number:
            payment_idx = i
            break
    
    if payment_idx is None:
        raise HTTPException(status_code=404, detail="Payment not found")
    
    # Update payment
    if "cleared" in data:
        schedule[payment_idx]["cleared"] = data["cleared"]
        if data["cleared"]:
            schedule[payment_idx]["missed"] = False
            schedule[payment_idx]["status"] = "cleared"
            schedule[payment_idx]["paid_date"] = data.get("paid_date") or datetime.now(timezone.utc).isoformat()
    
    if "missed" in data:
        schedule[payment_idx]["missed"] = data["missed"]
        if data["missed"]:
            schedule[payment_idx]["cleared"] = False
            schedule[payment_idx]["status"] = "missed"
            schedule[payment_idx]["paid_date"] = None
    
    if "notes" in data:
        schedule[payment_idx]["notes"] = data["notes"]
    
    if "expected_amount" in data:
        schedule[payment_idx]["expected_amount"] = data["expected_amount"]
    
    # Recalculate totals
    totals = calculate_deal_totals(schedule)
    
    # Check 50% milestone
    milestone_50_notified = deal.get("milestone_50_notified", False)
    milestone_reached = False
    if totals["percent_paid"] >= 50 and not milestone_50_notified:
        milestone_reached = True
    
    # Determine overall payment status
    late_count = sum(1 for p in schedule if p.get("missed") or (not p.get("cleared") and get_payment_status(p) in ["late", "severely_late"]))
    if totals["percent_paid"] >= 100:
        payment_status = "paid_off"
        deal_status = "paid_off"
    elif late_count >= 3:
        payment_status = "severely_late"
        deal_status = "active"
    elif late_count > 0:
        payment_status = "late"
        deal_status = "active"
    else:
        payment_status = "current"
        deal_status = "active"
    
    await db.funded_deals.update_one(
        {"id": deal_id},
        {"$set": {
            "payment_schedule": schedule,
            "payment_status": payment_status,
            "status": deal_status,
            **totals,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {
        "message": "Payment updated",
        "totals": totals,
        "milestone_50_reached": milestone_reached
    }

@api_router.get("/funded/stats")
async def get_funded_stats(current_user: dict = Depends(get_current_user)):
    """Get funded deals statistics and book value"""
    deals = await db.funded_deals.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Calculate stats
    total_funded_volume = sum(d.get("funded_amount", 0) for d in deals)
    total_deals = len(deals)
    active_deals = [d for d in deals if d.get("status") == "active"]
    paid_off_deals = [d for d in deals if d.get("status") == "paid_off"]
    late_deals = [d for d in deals if d.get("payment_status") in ["late", "severely_late"]]
    
    # Calculate collected and outstanding
    total_collected = 0
    total_outstanding = 0
    for deal in deals:
        schedule = auto_clear_payments(deal.get("payment_schedule", []))
        totals = calculate_deal_totals(schedule)
        total_collected += totals["total_collected"]
        total_outstanding += totals["remaining_balance"]
    
    # Monthly stats
    now = datetime.now(timezone.utc)
    current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    monthly_funded = sum(
        d.get("funded_amount", 0) for d in deals
        if d.get("funding_date", "").startswith(current_month_start.strftime("%Y-%m"))
    )
    
    avg_deal_size = total_funded_volume / total_deals if total_deals > 0 else 0
    
    return {
        "total_funded_volume": total_funded_volume,
        "total_deals": total_deals,
        "active_deals": len(active_deals),
        "paid_off_deals": len(paid_off_deals),
        "late_accounts": len(late_deals),
        "total_collected": total_collected,
        "total_outstanding": total_outstanding,
        "monthly_funded_volume": monthly_funded,
        "average_deal_size": round(avg_deal_size, 2),
        "book_value": total_outstanding,
        "expected_receivables": total_outstanding
    }

@api_router.get("/funded/collections-queue")
async def get_collections_queue(current_user: dict = Depends(get_current_user)):
    """Get deals that need payment follow-up"""
    deals = await db.funded_deals.find(
        {"user_id": current_user["user_id"], "status": "active"},
        {"_id": 0}
    ).to_list(500)
    
    queue = []
    now = datetime.now(timezone.utc)
    
    for deal in deals:
        schedule = deal.get("payment_schedule", [])
        
        for payment in schedule:
            if payment["cleared"] or payment["missed"]:
                continue
            
            due_date = datetime.fromisoformat(payment["due_date"].replace('Z', '+00:00'))
            days_diff = (due_date.date() - now.date()).days
            
            # Include if due within 3 days or overdue
            if days_diff <= 3:
                status = get_payment_status(payment)
                queue.append({
                    "deal_id": deal["id"],
                    "client_name": deal.get("client_name", ""),
                    "business_name": deal.get("business_name", ""),
                    "payment_number": payment["payment_number"],
                    "amount": payment["expected_amount"],
                    "due_date": payment["due_date"],
                    "days_diff": days_diff,
                    "status": status,
                    "priority": "high" if days_diff < 0 else "medium" if days_diff == 0 else "low"
                })
    
    # Sort by priority (overdue first)
    queue.sort(key=lambda x: x["days_diff"])
    
    return queue

@api_router.get("/funded/milestones")
async def get_milestones(current_user: dict = Depends(get_current_user)):
    """Get deals that have reached milestones"""
    deals = await db.funded_deals.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(500)
    
    milestones = []
    
    for deal in deals:
        schedule = auto_clear_payments(deal.get("payment_schedule", []))
        totals = calculate_deal_totals(schedule)
        
        if totals["percent_paid"] >= 50 and not deal.get("milestone_50_notified"):
            milestones.append({
                "deal_id": deal["id"],
                "client_name": deal.get("client_name", ""),
                "business_name": deal.get("business_name", ""),
                "milestone": "50%",
                "total_payback": totals["total_payback"],
                "total_collected": totals["total_collected"],
                "percent_paid": totals["percent_paid"]
            })
    
    return milestones

@api_router.post("/funded/deals/{deal_id}/milestone-acknowledged")
async def acknowledge_milestone(deal_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a milestone as acknowledged"""
    result = await db.funded_deals.update_one(
        {"id": deal_id, "user_id": current_user["user_id"]},
        {"$set": {"milestone_50_notified": True}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Deal not found")
    
    return {"message": "Milestone acknowledged"}

@api_router.get("/funded/recent")
async def get_recent_funded(limit: int = 10, current_user: dict = Depends(get_current_user)):
    """Get recently funded deals"""
    deals = await db.funded_deals.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0, "id": 1, "client_name": 1, "business_name": 1, "funded_amount": 1, "funding_date": 1}
    ).sort("funding_date", -1).limit(limit).to_list(limit)
    
    return deals

@api_router.get("/funded/analytics")
async def get_funded_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get funded deals analytics for charts"""
    query = {"user_id": current_user["user_id"]}
    
    deals = await db.funded_deals.find(query, {"_id": 0}).to_list(1000)
    
    # Group by month for charts
    monthly_funded = {}
    monthly_collections = {}
    by_deal_type = {}
    by_rep = {}
    
    for deal in deals:
        # By month funded
        funding_month = deal.get("funding_date", "")[:7]  # YYYY-MM
        if funding_month:
            monthly_funded[funding_month] = monthly_funded.get(funding_month, 0) + deal.get("funded_amount", 0)
        
        # By deal type
        deal_type = deal.get("deal_type", "Other")
        by_deal_type[deal_type] = by_deal_type.get(deal_type, 0) + deal.get("funded_amount", 0)
        
        # By rep
        rep = deal.get("assigned_rep_name", "Unassigned") or "Unassigned"
        by_rep[rep] = by_rep.get(rep, 0) + deal.get("funded_amount", 0)
        
        # Calculate monthly collections
        schedule = auto_clear_payments(deal.get("payment_schedule", []))
        for payment in schedule:
            if payment.get("cleared") and payment.get("paid_date"):
                payment_month = payment["paid_date"][:7]
                monthly_collections[payment_month] = monthly_collections.get(payment_month, 0) + payment["expected_amount"]
    
    return {
        "monthly_funded": [{"month": k, "amount": v} for k, v in sorted(monthly_funded.items())],
        "monthly_collections": [{"month": k, "amount": v} for k, v in sorted(monthly_collections.items())],
        "by_deal_type": [{"type": k, "amount": v} for k, v in by_deal_type.items()],
        "by_rep": [{"rep": k, "amount": v} for k, v in by_rep.items()]
    }

# ============== ONBOARDING / SMS REGISTRATION ==============
@api_router.post("/onboarding/submit")
async def submit_onboarding(data: dict, current_user: dict = Depends(get_current_user)):
    """Submit SMS onboarding data for Twilio A2P 10DLC registration"""
    onboarding_record = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["user_id"],
        "submitted_at": datetime.now(timezone.utc).isoformat(),
        "status": "pending",
        "brand_status": "pending",
        "campaign_status": "pending",
        **data
    }
    
    db.sms_onboarding.insert_one(onboarding_record)
    
    return {
        "message": "Onboarding submitted successfully",
        "id": onboarding_record["id"],
        "status": "pending"
    }

@api_router.get("/onboarding/status")
async def get_onboarding_status(current_user: dict = Depends(get_current_user)):
    """Get SMS registration status"""
    onboarding = await db.sms_onboarding.find_one(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    )
    
    if not onboarding:
        return {"status": "not_started", "onboarding": None}
    
    return {
        "status": onboarding.get("status", "pending"),
        "brand_status": onboarding.get("brand_status", "pending"),
        "campaign_status": onboarding.get("campaign_status", "pending"),
        "phone_number": onboarding.get("selected_phone_number"),
        "onboarding": onboarding
    }

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

# Load Gmail routes
try:
    from routes.gmail import router as gmail_router
    app.include_router(gmail_router, prefix="/api")
    logger.info("Gmail routes loaded successfully")
except Exception as e:
    logger.warning(f"Could not load Gmail routes: {e}")

# Load Organization routes
try:
    from routes.organizations import router as org_router
    app.include_router(org_router, prefix="/api")
    logger.info("Organization routes loaded successfully")
except Exception as e:
    logger.warning(f"Could not load Organization routes: {e}")

# Load SMS routes
try:
    from routes.sms import router as sms_router
    app.include_router(sms_router, prefix="/api")
    logger.info("SMS routes loaded successfully")
except Exception as e:
    logger.warning(f"Could not load SMS routes: {e}")

# Load Phone Blower routes
try:
    from routes.phone_blower import router as pb_router, set_db as pb_set_db, set_auth_dependency as pb_set_auth
    pb_set_db(db)
    pb_set_auth(get_current_user)
    app.include_router(pb_router, prefix="/api")
    logger.info("Phone Blower routes loaded successfully")
except Exception as e:
    logger.warning(f"Could not load Phone Blower routes: {e}")

# Load Credits routes
try:
    from routes.credits import router as credits_router, set_db as credits_set_db, set_auth_dependency as credits_set_auth
    credits_set_db(db)
    credits_set_auth(get_current_user)
    app.include_router(credits_router, prefix="/api")
    logger.info("Credits routes loaded successfully")
except Exception as e:
    logger.warning(f"Could not load Credits routes: {e}")


# ============== CALLING FEATURE ==============

@api_router.get("/messages/unread")
async def get_unread_messages(current_user: dict = Depends(get_current_user)):
    """Get unread inbound messages"""
    accessible_ids = await get_accessible_user_ids(current_user)
    
    unread = await db.conversations.find(
        {
            "user_id": {"$in": accessible_ids},
            "direction": "inbound",
            "$or": [{"read": False}, {"read": {"$exists": False}}]
        },
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    # Get client info for each message
    for msg in unread:
        if msg.get("client_id"):
            client = await db.clients.find_one({"id": msg["client_id"]}, {"_id": 0, "name": 1, "phone": 1})
            msg["client_name"] = client.get("name") if client else "Unknown"
            msg["client_phone"] = client.get("phone") if client else msg.get("from_number")
    
    return {"messages": unread, "count": len(unread)}


@api_router.put("/messages/{message_id}/read")
async def mark_message_read(message_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a message as read"""
    await db.conversations.update_one(
        {"id": message_id},
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@api_router.put("/messages/mark-all-read")
async def mark_all_messages_read(current_user: dict = Depends(get_current_user)):
    """Mark all messages as read for the current user"""
    accessible_ids = await get_accessible_user_ids(current_user)
    
    await db.conversations.update_many(
        {
            "user_id": {"$in": accessible_ids},
            "direction": "inbound",
            "read": {"$ne": True}
        },
        {"$set": {"read": True, "read_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"success": True}


@api_router.get("/clients/{client_id}/ai-summary")
async def get_ai_conversation_summary(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get AI-generated summary of conversation with a client"""
    accessible_ids = await get_accessible_user_ids(current_user)
    
    # Get client
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get recent conversations
    conversations = await db.conversations.find(
        {"client_id": client_id},
        {"_id": 0, "message": 1, "direction": 1, "created_at": 1}
    ).sort("created_at", -1).to_list(20)
    
    if not conversations:
        return {
            "summary": "No conversation history with this client yet.",
            "sentiment": "neutral",
            "key_topics": [],
            "suggested_action": "Start a conversation to build rapport."
        }
    
    # Format conversation for AI
    conv_text = "\n".join([
        f"{'Agent' if c['direction'] == 'outbound' else 'Client'}: {c['message']}"
        for c in reversed(conversations)
    ])
    
    api_key = os.environ.get('EMERGENT_LLM_KEY')
    if not api_key:
        return {
            "summary": f"Recent conversation with {client.get('name', 'client')} containing {len(conversations)} messages.",
            "sentiment": "unknown",
            "key_topics": [],
            "suggested_action": "Review conversation manually.",
            "ai_unavailable": True
        }
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        prompt = f"""Analyze this conversation between an agent and a client named {client.get('name', 'the client')}.
        
Conversation:
{conv_text}

Provide a JSON response with:
1. "summary": A brief 2-3 sentence summary of the conversation
2. "sentiment": The client's sentiment (positive, neutral, negative, interested, frustrated)
3. "key_topics": List of 3-5 main topics discussed
4. "suggested_action": One actionable next step for the agent
5. "deal_likelihood": Percentage likelihood this leads to a deal (0-100)

Respond with valid JSON only."""

        chat = LlmChat(
            api_key=api_key,
            session_id=f"ai-summary-{client_id}",
            system_message="You are a conversation analyst. Respond with valid JSON only."
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse JSON from response
        import json
        try:
            result = json.loads(response)
        except:
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
            else:
                result = {
                    "summary": response[:500],
                    "sentiment": "unknown",
                    "key_topics": [],
                    "suggested_action": "Review the conversation."
                }
        
        return result
        
    except Exception as e:
        logger.error(f"AI summary error: {e}")
        return {
            "summary": f"Conversation with {client.get('name', 'client')} has {len(conversations)} messages.",
            "sentiment": "unknown",
            "key_topics": [],
            "suggested_action": "Review conversation manually.",
            "error": str(e)
        }


@api_router.post("/calls/initiate")
async def initiate_call(data: dict, current_user: dict = Depends(get_current_user)):
    """Initiate an outbound call"""
    to_number = data.get("to")
    from_number = data.get("from")
    
    if not to_number or not from_number:
        raise HTTPException(status_code=400, detail="Both 'to' and 'from' numbers are required")
    
    call_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Check if Twilio is configured for actual calls
    twilio_account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
    twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
    
    call_doc = {
        "id": call_id,
        "user_id": current_user["user_id"],
        "to": to_number,
        "from": from_number,
        "status": "initiated",
        "direction": "outbound",
        "created_at": now
    }
    
    if twilio_account_sid and twilio_auth_token:
        try:
            from twilio.rest import Client
            twilio_client = Client(twilio_account_sid, twilio_auth_token)
            
            # Initiate the call via Twilio
            call = twilio_client.calls.create(
                to=to_number,
                from_=from_number,
                url="http://demo.twilio.com/docs/voice.xml"  # TwiML for basic call
            )
            
            call_doc["twilio_sid"] = call.sid
            call_doc["status"] = call.status
            
        except Exception as e:
            logger.error(f"Twilio call failed: {e}")
            call_doc["status"] = "failed"
            call_doc["error"] = str(e)
    else:
        call_doc["status"] = "mock_initiated"
        call_doc["mock"] = True
        logger.info(f"Mock call initiated from {from_number} to {to_number}")
    
    await db.calls.insert_one(call_doc)
    
    # Log activity
    await log_activity(
        current_user["user_id"],
        "call_initiated",
        {"to": to_number, "from": from_number},
        "call",
        call_id
    )
    
    return {
        "success": True,
        "call_id": call_id,
        "status": call_doc["status"],
        "mock": call_doc.get("mock", False)
    }


@api_router.post("/calls/{call_id}/end")
async def end_call(call_id: str, current_user: dict = Depends(get_current_user)):
    """End an active call"""
    call = await db.calls.find_one({"id": call_id, "user_id": current_user["user_id"]})
    if not call:
        raise HTTPException(status_code=404, detail="Call not found")
    
    # If real Twilio call, end it
    if call.get("twilio_sid"):
        try:
            twilio_account_sid = os.environ.get("TWILIO_ACCOUNT_SID")
            twilio_auth_token = os.environ.get("TWILIO_AUTH_TOKEN")
            if twilio_account_sid and twilio_auth_token:
                from twilio.rest import Client
                twilio_client = Client(twilio_account_sid, twilio_auth_token)
                twilio_client.calls(call["twilio_sid"]).update(status="completed")
        except Exception as e:
            logger.error(f"Failed to end Twilio call: {e}")
    
    await db.calls.update_one(
        {"id": call_id},
        {"$set": {"status": "completed", "ended_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"success": True, "status": "completed"}


@api_router.get("/calls/history")
async def get_call_history(current_user: dict = Depends(get_current_user), limit: int = 50):
    """Get call history"""
    accessible_ids = await get_accessible_user_ids(current_user)
    
    calls = await db.calls.find(
        {"user_id": {"$in": accessible_ids}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    return calls


# ============== GLOBAL SEARCH ==============

@api_router.get("/search")
async def global_search(q: str, current_user: dict = Depends(get_current_user)):
    """Search across clients, messages, and deals"""
    if not q or len(q) < 2:
        return {"clients": [], "messages": [], "deals": []}
    
    accessible_ids = await get_accessible_user_ids(current_user)
    search_regex = {"$regex": q, "$options": "i"}
    
    # Search clients
    clients = await db.clients.find(
        {
            "user_id": {"$in": accessible_ids},
            "$or": [
                {"name": search_regex},
                {"email": search_regex},
                {"phone": search_regex},
                {"company": search_regex},
                {"notes": search_regex}
            ]
        },
        {"_id": 0}
    ).to_list(20)
    
    # Search conversations/messages
    messages = await db.conversations.find(
        {
            "user_id": {"$in": accessible_ids},
            "message": search_regex
        },
        {"_id": 0}
    ).to_list(20)
    
    # Search deals
    deals = await db.deals.find(
        {
            "user_id": {"$in": accessible_ids},
            "$or": [
                {"business_name": search_regex},
                {"notes": search_regex}
            ]
        },
        {"_id": 0}
    ).to_list(20)
    
    return {"clients": clients, "messages": messages, "deals": deals}


# ============== CLIENT PROFILE (Full History) ==============

@api_router.get("/clients/{client_id}/profile")
async def get_client_profile(client_id: str, current_user: dict = Depends(get_current_user)):
    """Get full client profile with all history"""
    accessible_ids = await get_accessible_user_ids(current_user)
    
    # Get client
    client = await db.clients.find_one(
        {"id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    )
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Get all messages with this client
    messages = await db.conversations.find(
        {"client_id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    ).sort("timestamp", -1).to_list(100)
    
    # Get deals for this client
    deals = await db.funded_deals.find(
        {"client_id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    ).to_list(50)
    
    # Get reminders for this client
    reminders = await db.reminders.find(
        {"client_id": client_id, "user_id": {"$in": accessible_ids}},
        {"_id": 0}
    ).to_list(50)
    
    # Get activity logs for this client
    activities = await db.activity_logs.find(
        {"entity_type": "client", "entity_id": client_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    # Get owner info
    owner = await db.users.find_one({"id": client["user_id"]}, {"_id": 0, "password": 0})
    
    return {
        "client": client,
        "messages": messages,
        "deals": deals,
        "reminders": reminders,
        "activities": activities,
        "owner": {"id": owner["id"], "name": owner.get("name"), "email": owner.get("email")} if owner else None,
        "stats": {
            "total_messages": len(messages),
            "total_deals": len(deals),
            "last_contact": messages[0].get("timestamp") if messages else None
        }
    }


# ============== ACTIVITY LOG ==============

@api_router.get("/activity")
async def get_activity_log(
    limit: int = 50,
    entity_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get activity log for audit trail"""
    accessible_ids = await get_accessible_user_ids(current_user)
    
    query = {"user_id": {"$in": accessible_ids}}
    if entity_type:
        query["entity_type"] = entity_type
    
    activities = await db.activity_logs.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Enrich with user names
    for activity in activities:
        user = await db.users.find_one({"id": activity["user_id"]}, {"name": 1, "_id": 0})
        activity["user_name"] = user.get("name") if user else "Unknown"
    
    return activities


# ============== NOTIFICATIONS ==============

@api_router.get("/notifications")
async def get_notifications(unread_only: bool = False, current_user: dict = Depends(get_current_user)):
    """Get user notifications"""
    query = {"user_id": current_user["user_id"]}
    if unread_only:
        query["read"] = False
    
    notifications = await db.notifications.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).to_list(50)
    
    unread_count = await db.notifications.count_documents(
        {"user_id": current_user["user_id"], "read": False}
    )
    
    return {"notifications": notifications, "unread_count": unread_count}


@api_router.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Mark a notification as read"""
    await db.notifications.update_one(
        {"id": notification_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True}}
    )
    return {"message": "Notification marked as read"}


@api_router.put("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Mark all notifications as read"""
    await db.notifications.update_many(
        {"user_id": current_user["user_id"], "read": False},
        {"$set": {"read": True}}
    )
    return {"message": "All notifications marked as read"}


# ============== TEAM LEADER DASHBOARD ==============

@api_router.get("/team-leader/dashboard")
async def get_team_leader_dashboard(current_user: dict = Depends(get_current_user)):
    """Get dashboard data for team leaders"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    
    if user.get("role") not in ["team_leader", "admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get agents based on role
    if user.get("role") == "team_leader":
        agents = await db.users.find(
            {"team_leader_id": current_user["user_id"]},
            {"_id": 0, "password": 0}
        ).to_list(100)
    else:
        # Admin/org_admin can see all agents
        team_id = user.get("team_id") or current_user["user_id"]
        agents = await db.users.find(
            {"$or": [{"team_id": team_id}, {"team_leader_id": {"$exists": True}}], "role": "agent"},
            {"_id": 0, "password": 0}
        ).to_list(100)
    
    # Get stats for each agent
    agent_stats = []
    for agent in agents:
        clients_count = await db.clients.count_documents({"user_id": agent["id"]})
        messages_sent = await db.conversations.count_documents({"user_id": agent["id"], "direction": "outbound"})
        messages_received = await db.conversations.count_documents({"user_id": agent["id"], "direction": "inbound"})
        deals_count = await db.deals.count_documents({"user_id": agent["id"]})
        
        # Recent activity
        last_activity = await db.activity_logs.find_one(
            {"user_id": agent["id"]},
            {"_id": 0}
        )
        
        agent_stats.append({
            "id": agent["id"],
            "name": agent.get("name"),
            "email": agent.get("email"),
            "role": agent.get("role"),
            "clients_count": clients_count,
            "messages_sent": messages_sent,
            "messages_received": messages_received,
            "deals_count": deals_count,
            "last_activity": last_activity.get("created_at") if last_activity else None
        })
    
    # Team totals
    total_clients = sum(a["clients_count"] for a in agent_stats)
    total_messages = sum(a["messages_sent"] for a in agent_stats)
    total_deals = sum(a["deals_count"] for a in agent_stats)
    
    return {
        "agents": agent_stats,
        "totals": {
            "agents_count": len(agent_stats),
            "total_clients": total_clients,
            "total_messages": total_messages,
            "total_deals": total_deals
        }
    }


# ============== SUPPORT EMAIL SETTINGS ==============

class SupportEmailConfig(BaseModel):
    smtp_host: str
    smtp_port: int = 587
    smtp_username: str
    smtp_password: str
    from_email: str
    from_name: str = "Merchant Follow Up"
    use_tls: bool = True

@api_router.get("/settings/support-email")
async def get_support_email_config(current_user: dict = Depends(get_current_user)):
    """Get support email configuration (admin only)"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "support_email"}, {"_id": 0})
    if not config:
        return {"configured": False, "config": None}
    
    # Don't return password
    config.pop("smtp_password", None)
    return {"configured": True, "config": config}

@api_router.post("/settings/support-email")
async def save_support_email_config(config: SupportEmailConfig, current_user: dict = Depends(get_current_user)):
    """Save support email configuration (admin only)"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    now = datetime.now(timezone.utc).isoformat()
    
    config_doc = {
        "type": "support_email",
        "smtp_host": config.smtp_host,
        "smtp_port": config.smtp_port,
        "smtp_username": config.smtp_username,
        "smtp_password": config.smtp_password,  # Should be encrypted in production
        "from_email": config.from_email,
        "from_name": config.from_name,
        "use_tls": config.use_tls,
        "updated_at": now,
        "updated_by": current_user["user_id"]
    }
    
    await db.settings.update_one(
        {"type": "support_email"},
        {"$set": config_doc},
        upsert=True
    )
    
    return {"message": "Support email configuration saved successfully"}

@api_router.post("/settings/support-email/test")
async def test_support_email(current_user: dict = Depends(get_current_user)):
    """Test support email configuration by sending a test email"""
    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart
    
    user = await db.users.find_one({"id": current_user["user_id"]})
    if user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    config = await db.settings.find_one({"type": "support_email"})
    if not config:
        raise HTTPException(status_code=400, detail="Support email not configured")
    
    try:
        # Create message
        msg = MIMEMultipart()
        msg['From'] = f"{config['from_name']} <{config['from_email']}>"
        msg['To'] = user['email']
        msg['Subject'] = "Merchant Follow Up - Test Email"
        
        body = """
        <html>
        <body style="font-family: Arial, sans-serif;">
            <h2 style="color: #f97316;">Test Email Successful!</h2>
            <p>This is a test email from Merchant Follow Up.</p>
            <p>Your support email configuration is working correctly.</p>
            <br>
            <p style="color: #666;">- Merchant Follow Up Team</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        if config.get('use_tls', True):
            server = smtplib.SMTP(config['smtp_host'], config['smtp_port'])
            server.starttls()
        else:
            server = smtplib.SMTP_SSL(config['smtp_host'], config['smtp_port'])
        
        server.login(config['smtp_username'], config['smtp_password'])
        server.send_message(msg)
        server.quit()
        
        return {"message": f"Test email sent successfully to {user['email']}"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to send test email: {str(e)}")


# ============== ORG PHONE NUMBER SETTINGS (Admin) ==============

@api_router.get("/settings/phone-numbers")
async def get_phone_number_settings(current_user: dict = Depends(get_current_user)):
    """Get phone number settings for the admin's org"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user or user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    org_id = user.get("org_id")
    if not org_id:
        return {"allow_rep_purchases": True, "rep_monthly_number_limit": 0}
    
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        return {"allow_rep_purchases": True, "rep_monthly_number_limit": 0}
    
    return {
        "allow_rep_purchases": org.get("allow_rep_purchases", True),
        "rep_monthly_number_limit": org.get("rep_monthly_number_limit", 0)
    }

@api_router.put("/settings/phone-numbers")
async def update_phone_number_settings(data: dict, current_user: dict = Depends(get_current_user)):
    """Update phone number settings for the admin's org"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user or user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="No organization found")
    
    update_data = {}
    if "rep_monthly_number_limit" in data:
        update_data["rep_monthly_number_limit"] = max(0, int(data["rep_monthly_number_limit"]))
    
    if update_data:
        await db.organizations.update_one(
            {"id": org_id},
            {"$set": update_data}
        )
    
    return {"message": "Phone number settings updated"}

@api_router.get("/phone-numbers/purchase-status")
async def get_purchase_status(current_user: dict = Depends(get_current_user)):
    """Check if the current user can purchase phone numbers and how many they have left"""
    user = await db.users.find_one({"id": current_user["user_id"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    role = user.get("role", "agent")
    org_id = user.get("org_id")
    
    result = {"can_purchase": True, "reason": None, "limit": 0, "purchased_this_month": 0}
    
    if role in ["org_admin", "admin"]:
        result["can_purchase"] = True
        return result
    
    # For agents/reps
    if org_id:
        org = await db.organizations.find_one({"id": org_id})
        if org and org.get("allow_rep_purchases") is False:
            result["can_purchase"] = False
            result["reason"] = "Your organization does not allow reps to purchase phone numbers"
            return result
        
        rep_limit = org.get("rep_monthly_number_limit", 0) if org else 0
        result["limit"] = rep_limit
        
        if rep_limit > 0:
            now = datetime.now(timezone.utc)
            month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
            purchased = await db.phone_numbers.count_documents({
                "user_id": current_user["user_id"],
                "created_at": {"$gte": month_start}
            })
            result["purchased_this_month"] = purchased
            if purchased >= rep_limit:
                result["can_purchase"] = False
                result["reason"] = f"Monthly limit reached ({purchased}/{rep_limit})"
    
    return result


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
    # Stop the campaign scheduler
    if hasattr(app.state, 'scheduler') and app.state.scheduler.running:
        app.state.scheduler.shutdown()


@app.on_event("startup")
async def startup_campaign_scheduler():
    """Start the background scheduler for drip campaign processing at 10:45 AM ET daily"""
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
    from apscheduler.triggers.cron import CronTrigger
    import pytz

    scheduler = AsyncIOScheduler()

    async def run_campaign_processor():
        try:
            from routes.enhanced import _process_due_messages
            result = await _process_due_messages()
            logger.info(f"Campaign scheduler ran: {result}")
        except Exception as e:
            logger.error(f"Campaign scheduler error: {e}")

    # Run every hour on the hour during business hours (9AM-5PM ET) to handle hourly campaigns
    eastern = pytz.timezone("America/New_York")
    scheduler.add_job(
        run_campaign_processor,
        CronTrigger(hour="9-17", minute=0, timezone=eastern, day_of_week="mon-fri"),
        id="campaign_hourly_send",
        replace_existing=True
    )
    # Also keep the 10:45 AM run for standard daily campaigns
    scheduler.add_job(
        run_campaign_processor,
        CronTrigger(hour=10, minute=45, timezone=eastern, day_of_week="mon-fri"),
        id="campaign_daily_send",
        replace_existing=True
    )
    # Auto-dialer processor: runs every 2 minutes to check for due auto-dial sessions
    async def run_auto_dialer():
        try:
            from routes.phone_blower import process_auto_dial_sessions
            result = await process_auto_dial_sessions()
            if result.get("processed", 0) > 0:
                logger.info(f"Auto-dialer ran: {result}")
        except Exception as e:
            logger.error(f"Auto-dialer scheduler error: {e}")

    from apscheduler.triggers.interval import IntervalTrigger
    scheduler.add_job(
        run_auto_dialer,
        IntervalTrigger(minutes=2),
        id="auto_dialer_processor",
        replace_existing=True
    )

    scheduler.start()
    app.state.scheduler = scheduler
    logger.info("Campaign scheduler started - hourly 9AM-5PM ET + daily 10:45 AM ET, Mon-Fri + auto-dialer every 2 min")
