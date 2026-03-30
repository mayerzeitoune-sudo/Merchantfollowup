"""
CONTENT MODERATION - Banned words and blacklisted phone numbers.
Managed by org_admin, enforced globally across all organizations.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import re
import logging

logger = logging.getLogger("moderation")

router = APIRouter(prefix="/moderation", tags=["Moderation"])

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


async def require_org_admin(current_user: dict):
    """Verify caller is org_admin"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user or user.get("role") != "org_admin":
        raise HTTPException(status_code=403, detail="Only platform administrators can manage moderation rules")
    return user


# ==================== MODELS ====================

class BannedWordCreate(BaseModel):
    word: str
    reason: Optional[str] = None

class BlacklistedNumberCreate(BaseModel):
    phone_number: str
    reason: Optional[str] = None


# ==================== BANNED WORDS ====================

@router.get("/banned-words")
async def get_banned_words(current_user: dict = Depends(get_current_user)):
    """Get all banned words (visible to all authenticated users)"""
    words = await db.banned_words.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return words


@router.post("/banned-words")
async def add_banned_word(data: BannedWordCreate, current_user: dict = Depends(get_current_user)):
    """Add a banned word (org_admin only)"""
    await require_org_admin(current_user)
    
    word = data.word.strip().lower()
    if not word:
        raise HTTPException(status_code=400, detail="Word cannot be empty")
    
    # Check for duplicates
    existing = await db.banned_words.find_one({"word": word})
    if existing:
        raise HTTPException(status_code=409, detail=f"'{word}' is already banned")
    
    doc = {
        "id": str(uuid.uuid4()),
        "word": word,
        "reason": data.reason or "",
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.banned_words.insert_one(doc)
    doc.pop("_id", None)
    
    logger.info(f"Banned word added: '{word}' by {current_user['user_id']}")
    return {k: v for k, v in doc.items() if k != "_id"}


@router.delete("/banned-words/{word_id}")
async def remove_banned_word(word_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a banned word (org_admin only)"""
    await require_org_admin(current_user)
    
    result = await db.banned_words.delete_one({"id": word_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Banned word not found")
    
    return {"message": "Banned word removed"}


# ==================== BLACKLISTED NUMBERS ====================

@router.get("/blacklisted-numbers")
async def get_blacklisted_numbers(current_user: dict = Depends(get_current_user)):
    """Get all blacklisted phone numbers (visible to all authenticated users)"""
    numbers = await db.blacklisted_numbers.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return numbers


@router.post("/blacklisted-numbers")
async def add_blacklisted_number(data: BlacklistedNumberCreate, current_user: dict = Depends(get_current_user)):
    """Add a blacklisted phone number (org_admin only)"""
    await require_org_admin(current_user)
    
    # Normalize phone number
    phone = re.sub(r'\D', '', data.phone_number)
    if len(phone) == 10:
        phone = "1" + phone
    phone = "+" + phone
    
    if len(phone) < 11:
        raise HTTPException(status_code=400, detail="Invalid phone number")
    
    # Check for duplicates
    existing = await db.blacklisted_numbers.find_one({"phone_number": phone})
    if existing:
        raise HTTPException(status_code=409, detail=f"{phone} is already blacklisted")
    
    doc = {
        "id": str(uuid.uuid4()),
        "phone_number": phone,
        "reason": data.reason or "",
        "created_by": current_user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.blacklisted_numbers.insert_one(doc)
    
    logger.info(f"Blacklisted number added: {phone} by {current_user['user_id']}")
    return {k: v for k, v in doc.items() if k != "_id"}


@router.delete("/blacklisted-numbers/{number_id}")
async def remove_blacklisted_number(number_id: str, current_user: dict = Depends(get_current_user)):
    """Remove a blacklisted phone number (org_admin only)"""
    await require_org_admin(current_user)
    
    result = await db.blacklisted_numbers.delete_one({"id": number_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Blacklisted number not found")
    
    return {"message": "Blacklisted number removed"}


# ==================== ENFORCEMENT FUNCTIONS ====================

async def check_message_content(message_body: str) -> dict:
    """
    Check message against banned words.
    Returns {"allowed": True/False, "blocked_word": "xxx" or None}
    """
    if not message_body:
        return {"allowed": True, "blocked_word": None}
    
    body_lower = message_body.lower()
    
    # Fetch all banned words
    banned = await db.banned_words.find({}, {"_id": 0, "word": 1}).to_list(1000)
    
    for entry in banned:
        word = entry["word"].lower()
        # Check for whole word or phrase match (case-insensitive)
        # Use word boundary matching for single words, substring for phrases
        if " " in word:
            # Phrase — substring match
            if word in body_lower:
                return {"allowed": False, "blocked_word": word}
        else:
            # Single word — word boundary match
            pattern = r'\b' + re.escape(word) + r'\b'
            if re.search(pattern, body_lower):
                return {"allowed": False, "blocked_word": word}
    
    return {"allowed": True, "blocked_word": None}


async def check_recipient_number(phone_number: str) -> dict:
    """
    Check if a phone number is blacklisted.
    Returns {"allowed": True/False, "reason": "xxx" or None}
    """
    if not phone_number:
        return {"allowed": True, "reason": None}
    
    # Normalize
    phone = re.sub(r'\D', '', phone_number)
    if len(phone) == 10:
        phone = "1" + phone
    phone = "+" + phone
    
    blacklisted = await db.blacklisted_numbers.find_one({"phone_number": phone})
    if blacklisted:
        return {"allowed": False, "reason": blacklisted.get("reason", "Number is blacklisted")}
    
    return {"allowed": True, "reason": None}
