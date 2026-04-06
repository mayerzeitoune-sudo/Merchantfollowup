"""
PAYMENTS - Stripe Checkout integration for credit purchases.
Uses emergentintegrations Stripe Checkout wrapper.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import uuid
import os
import logging

logger = logging.getLogger("payments")

router = APIRouter(prefix="/payments", tags=["Payments"])

db = None
_get_current_user_func = None
_add_credits_func = None


async def get_stripe_creds():
    """Get Stripe credentials from MongoDB first, then fall back to env vars.
    MongoDB source survives deployments and bypasses env caching."""
    stored = await db.platform_config.find_one({"key": "stripe_creds"}, {"_id": 0})
    if stored and stored.get("secret_key"):
        return stored["secret_key"], stored.get("publishable_key", "")
    # Fall back to env
    return os.environ.get("STRIPE_API_KEY", "").strip(), ""

def set_db(database):
    global db
    db = database

def set_auth_dependency(auth_func):
    global _get_current_user_func
    _get_current_user_func = auth_func

def set_add_credits(func):
    global _add_credits_func
    _add_credits_func = func

from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
security = HTTPBearer()

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if _get_current_user_func:
        return await _get_current_user_func(credentials)
    raise HTTPException(status_code=401, detail="Not configured")


# Fixed credit packages (amounts NEVER come from frontend)
CREDIT_PACKAGES = {
    "starter":      {"name": "Starter",      "usd": 20.00,    "credits": 100},
    "growth":       {"name": "Growth",        "usd": 100.00,   "credits": 525},
    "professional": {"name": "Professional",  "usd": 250.00,   "credits": 1350},
    "scale":        {"name": "Scale",         "usd": 500.00,   "credits": 2850},
    "executive":    {"name": "Executive",     "usd": 1000.00,  "credits": 6100},
    "enterprise":   {"name": "Enterprise",    "usd": 2500.00,  "credits": 16700},
    "titan":        {"name": "Titan",         "usd": 5000.00,  "credits": 36750},
    "black":        {"name": "Black",         "usd": 10000.00, "credits": 83333},
}


class CheckoutRequest(BaseModel):
    package_id: str
    origin_url: str


@router.post("/checkout")
async def create_checkout(data: CheckoutRequest, request: Request, current_user: dict = Depends(get_current_user)):
    """Create a Stripe Checkout session for a credit package"""
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest
    )

    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") not in ("admin", "org_admin", "team_leader"):
        raise HTTPException(status_code=403, detail="Only admins can purchase credits")

    org_id = user.get("org_id")
    if not org_id:
        # For org_admin without org_id, create a personal org or find one they manage
        if user.get("role") == "org_admin":
            # Find any org they created or own
            owned_org = await db.organizations.find_one(
                {"$or": [{"owner_id": user["id"]}, {"created_by": user["id"]}]},
                {"_id": 0, "id": 1}
            )
            if owned_org:
                org_id = owned_org["id"]
            else:
                # Create a personal org for the platform admin
                org_id = str(uuid.uuid4())
                await db.organizations.insert_one({
                    "id": org_id,
                    "name": f"{user.get('name', 'Admin')}'s Organization",
                    "owner_id": user["id"],
                    "credit_balance": 0,
                    "is_active": True,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })
                await db.users.update_one({"id": user["id"]}, {"$set": {"org_id": org_id}})
        else:
            raise HTTPException(status_code=400, detail="User has no organization")

    package = CREDIT_PACKAGES.get(data.package_id)
    if not package:
        raise HTTPException(status_code=400, detail="Invalid package")

    api_key, _ = await get_stripe_creds()
    logger.info(f"Stripe checkout: key found={bool(api_key)}, key_prefix={api_key[:8] if api_key else 'NONE'}...")
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured. Go to Settings > Platform Integrations to add your Stripe key.")

    # Build dynamic URLs from frontend origin
    origin = data.origin_url.rstrip("/")
    success_url = f"{origin}/credit-shop?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/credit-shop"

    # Build webhook URL from backend host — always use production
    host_url = str(request.base_url).rstrip("/")
    if "preview" in host_url:
        host_url = "https://merchantfollowup.com"
    webhook_url = f"{host_url}/api/webhook/stripe"

    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    metadata = {
        "org_id": org_id,
        "user_id": current_user["user_id"],
        "package_id": data.package_id,
        "credits": str(package["credits"]),
    }

    checkout_req = CheckoutSessionRequest(
        amount=package["usd"],
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata=metadata,
    )

    try:
        session = await stripe_checkout.create_checkout_session(checkout_req)
    except Exception as e:
        logger.error(f"Stripe create_checkout_session FAILED: {e}")
        raise HTTPException(status_code=502, detail=f"Stripe error: {str(e)}")

    # Create payment_transactions record BEFORE redirect
    txn = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "org_id": org_id,
        "user_id": current_user["user_id"],
        "package_id": data.package_id,
        "package_name": package["name"],
        "amount_usd": package["usd"],
        "credits": package["credits"],
        "currency": "usd",
        "payment_status": "initiated",
        "status": "pending",
        "metadata": metadata,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.payment_transactions.insert_one(txn)

    return {"url": session.url, "session_id": session.session_id}


@router.get("/checkout/status/{session_id}")
async def get_checkout_status(session_id: str, current_user: dict = Depends(get_current_user)):
    """Poll Stripe for checkout session status and process credits if paid"""
    from emergentintegrations.payments.stripe.checkout import StripeCheckout

    api_key, _ = await get_stripe_creds()
    if not api_key:
        raise HTTPException(status_code=500, detail="Stripe not configured")

    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")

    try:
        status = await stripe_checkout.get_checkout_status(session_id)
    except Exception as e:
        logger.error(f"Stripe status check failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to check payment status")

    # Find our transaction record
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")

    # Update transaction status
    new_status = status.status
    new_payment_status = status.payment_status

    await db.payment_transactions.update_one(
        {"session_id": session_id},
        {"$set": {
            "status": new_status,
            "payment_status": new_payment_status,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }}
    )

    # If payment is successful and credits haven't been granted yet
    if new_payment_status == "paid" and txn.get("payment_status") != "paid":
        # Prevent double-crediting: atomic check-and-set
        result = await db.payment_transactions.update_one(
            {"session_id": session_id, "payment_status": {"$ne": "paid"}},
            {"$set": {"payment_status": "paid", "credits_granted": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

        if result.modified_count > 0 and _add_credits_func:
            org_id = txn["org_id"]
            user_id = txn["user_id"]
            credits = txn["credits"]
            package_name = txn.get("package_name", "Credit Package")

            await _add_credits_func(
                org_id=org_id,
                user_id=user_id,
                amount=credits,
                source="stripe_purchase",
                usd_amount=txn["amount_usd"],
                description=f"{package_name} — {credits} credits (Stripe)",
                metadata={"session_id": session_id, "package_id": txn.get("package_id")}
            )
            logger.info(f"Credits granted: {credits} to org {org_id} (session {session_id})")

    return {
        "status": new_status,
        "payment_status": new_payment_status,
        "amount_usd": txn.get("amount_usd"),
        "credits": txn.get("credits"),
        "package_name": txn.get("package_name"),
        "session_id": session_id,
    }


@router.get("/history")
async def get_payment_history(current_user: dict = Depends(get_current_user)):
    """Get payment transaction history"""
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    org_id = user.get("org_id")
    if not org_id:
        return []

    txns = await db.payment_transactions.find(
        {"org_id": org_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return txns
