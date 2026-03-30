"""
CREDITS - Organization-wide credit system
Handles credit balance, purchases, deductions, and transaction history.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("credits")

router = APIRouter(prefix="/credits", tags=["Credits"])

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


# ============ CREDIT PACKAGES ============

CREDIT_PACKAGES = [
    {"id": "starter",      "name": "Starter",      "usd": 20,    "credits": 100,    "discount": 0,     "description": "For light usage and testing"},
    {"id": "growth",       "name": "Growth",        "usd": 100,   "credits": 525,    "discount": 4.76,  "description": "For consistent weekly activity"},
    {"id": "professional", "name": "Professional",  "usd": 250,   "credits": 1350,   "discount": 7.41,  "description": "For active teams scaling outreach"},
    {"id": "scale",        "name": "Scale",         "usd": 500,   "credits": 2850,   "discount": 12.28, "description": "For higher-volume campaign operations"},
    {"id": "executive",    "name": "Executive",     "usd": 1000,  "credits": 6100,   "discount": 18.03, "description": "For serious organizations"},
    {"id": "enterprise",   "name": "Enterprise",    "usd": 2500,  "credits": 16700,  "discount": 25.15, "description": "For teams running aggressive volume"},
    {"id": "titan",        "name": "Titan",         "usd": 5000,  "credits": 36750,  "discount": 31.97, "description": "For large-scale acquisition"},
    {"id": "black",        "name": "Black",         "usd": 10000, "credits": 83333,  "discount": 40.0,  "description": "Best economics for maximum scale"},
]

# Credit conversion constants
CREDITS_PER_DOLLAR = 5
PHONE_NUMBER_COST_CREDITS = 40  # $8.00 * 5
TEXT_COST_CREDITS = 0.316  # $0.0632 * 5


class CreditPurchaseRequest(BaseModel):
    package_id: str


class CreditDeductRequest(BaseModel):
    amount: int
    source: str  # "phone_number", "campaign", etc.
    description: Optional[str] = None
    metadata: Optional[dict] = None


# ============ HELPERS ============

async def get_org_id_for_user(user_id: str) -> Optional[str]:
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "org_id": 1})
    return user.get("org_id") if user else None


async def get_org_credit_balance(org_id: str) -> int:
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0, "credit_balance": 1})
    if not org:
        return 0
    return org.get("credit_balance", 0)


async def deduct_credits(org_id: str, user_id: str, amount: int, source: str, description: str = "", metadata: dict = None) -> dict:
    """Atomically deduct credits from org balance. Returns transaction or raises."""
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Deduction amount must be positive")

    # Atomic update: only succeeds if balance >= amount
    result = await db.organizations.update_one(
        {"id": org_id, "credit_balance": {"$gte": amount}},
        {"$inc": {"credit_balance": -amount}}
    )
    if result.modified_count == 0:
        current = await get_org_credit_balance(org_id)
        raise HTTPException(
            status_code=402,
            detail=f"Insufficient credits. Need {amount}, have {current}."
        )

    # Log transaction
    txn = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "user_id": user_id,
        "type": "deduction",
        "source": source,
        "credits_delta": -amount,
        "usd_amount": None,
        "description": description,
        "metadata": metadata or {},
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.credit_transactions.insert_one(txn)
    if "_id" in txn:
        del txn["_id"]

    new_balance = await get_org_credit_balance(org_id)
    return {"transaction": txn, "new_balance": new_balance}


async def add_credits(org_id: str, user_id: str, amount: int, source: str, usd_amount: float = None, description: str = "", metadata: dict = None) -> dict:
    """Add credits to org balance."""
    await db.organizations.update_one(
        {"id": org_id},
        {"$inc": {"credit_balance": amount}},
        upsert=False
    )

    txn = {
        "id": str(uuid.uuid4()),
        "org_id": org_id,
        "user_id": user_id,
        "type": "purchase",
        "source": source,
        "credits_delta": amount,
        "usd_amount": usd_amount,
        "description": description,
        "metadata": metadata or {},
        "status": "completed",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.credit_transactions.insert_one(txn)
    if "_id" in txn:
        del txn["_id"]

    new_balance = await get_org_credit_balance(org_id)
    return {"transaction": txn, "new_balance": new_balance}


# ============ ENDPOINTS ============

@router.get("/packages")
async def get_credit_packages():
    """Get all available credit packages (public within app)"""
    return CREDIT_PACKAGES


@router.get("/balance")
async def get_credit_balance(current_user: dict = Depends(get_current_user)):
    """Get the org's credit balance"""
    org_id = await get_org_id_for_user(current_user["user_id"])
    if not org_id:
        return {"balance": 0, "org_id": None}
    balance = await get_org_credit_balance(org_id)
    return {"balance": balance, "org_id": org_id}


@router.post("/purchase")
async def purchase_credits(data: CreditPurchaseRequest, current_user: dict = Depends(get_current_user)):
    """Admin purchases a credit package for their org"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("role") not in ("admin", "org_admin"):
        raise HTTPException(status_code=403, detail="Only admins can purchase credits")

    org_id = user.get("org_id")
    if not org_id:
        raise HTTPException(status_code=400, detail="User has no organization")

    # Validate package
    package = next((p for p in CREDIT_PACKAGES if p["id"] == data.package_id), None)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")

    # Ensure org has credit_balance field
    org = await db.organizations.find_one({"id": org_id})
    if org and "credit_balance" not in org:
        await db.organizations.update_one({"id": org_id}, {"$set": {"credit_balance": 0}})

    # Simulate payment (mocked)
    payment_id = f"mock_pay_{uuid.uuid4().hex[:12]}"

    result = await add_credits(
        org_id=org_id,
        user_id=current_user["user_id"],
        amount=package["credits"],
        source="credit_shop",
        usd_amount=package["usd"],
        description=f"{package['name']} package — {package['credits']} credits",
        metadata={"package_id": package["id"], "payment_id": payment_id}
    )

    return {
        "status": "success",
        "package": package["name"],
        "credits_added": package["credits"],
        "usd_charged": package["usd"],
        "new_balance": result["new_balance"],
        "transaction_id": result["transaction"]["id"],
        "payment_id": payment_id,
    }


@router.get("/history")
async def get_credit_history(current_user: dict = Depends(get_current_user)):
    """Get credit transaction history for the org"""
    org_id = await get_org_id_for_user(current_user["user_id"])
    if not org_id:
        return []

    txns = await db.credit_transactions.find(
        {"org_id": org_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(200)

    # Enrich with user names
    user_ids = list(set(t.get("user_id") for t in txns if t.get("user_id")))
    users = await db.users.find({"id": {"$in": user_ids}}, {"_id": 0, "id": 1, "name": 1}).to_list(100)
    user_map = {u["id"]: u.get("name", "Unknown") for u in users}

    for t in txns:
        t["user_name"] = user_map.get(t.get("user_id"), "Unknown")

    return txns


@router.get("/constants")
async def get_credit_constants():
    """Return credit conversion constants for the frontend"""
    return {
        "credits_per_dollar": CREDITS_PER_DOLLAR,
        "phone_number_cost_credits": PHONE_NUMBER_COST_CREDITS,
        "text_cost_credits": TEXT_COST_CREDITS,
    }


class GrantCreditsRequest(BaseModel):
    org_id: str
    amount: int
    reason: Optional[str] = "Org Admin Grant"


@router.post("/grant")
async def grant_credits(data: GrantCreditsRequest, current_user: dict = Depends(get_current_user)):
    """Org Admin only: manually grant credits to any organization"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user or user.get("role") != "org_admin":
        raise HTTPException(status_code=403, detail="Only org_admin can grant credits")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")

    org = await db.organizations.find_one({"id": data.org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    # Ensure org has credit_balance field
    if "credit_balance" not in org:
        await db.organizations.update_one({"id": data.org_id}, {"$set": {"credit_balance": 0}})

    result = await add_credits(
        org_id=data.org_id,
        user_id=current_user["user_id"],
        amount=data.amount,
        source="org_admin_grant",
        description=data.reason or f"Manual grant by org admin",
        metadata={"granted_by": current_user["user_id"], "org_name": org.get("name", "")}
    )

    return {
        "status": "success",
        "org_id": data.org_id,
        "org_name": org.get("name", ""),
        "credits_added": data.amount,
        "new_balance": result["new_balance"],
        "transaction_id": result["transaction"]["id"],
    }


@router.get("/all-orgs")
async def list_all_orgs_for_grant(current_user: dict = Depends(get_current_user)):
    """Org Admin only: list all organizations with balances for granting"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user or user.get("role") != "org_admin":
        raise HTTPException(status_code=403, detail="Only org_admin can view all organizations")

    orgs = await db.organizations.find({}, {"_id": 0}).to_list(500)
    result = []
    for org in orgs:
        user_count = await db.users.count_documents({"org_id": org["id"]})
        result.append({
            "id": org["id"],
            "name": org.get("name", "Unnamed"),
            "credit_balance": org.get("credit_balance", 0),
            "user_count": user_count,
        })
    return result
