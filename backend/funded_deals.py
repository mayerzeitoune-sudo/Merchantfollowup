"""
Funded Deals Module - Comprehensive funded deal management with payment tracking
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

funded_router = APIRouter(prefix="/api/funded", tags=["Funded Deals"])

# ============== MODELS ==============

class PaymentScheduleItem(BaseModel):
    payment_number: int
    due_date: str
    expected_amount: float
    status: str = "pending"  # pending, cleared, missed, late, overridden
    cleared: bool = False
    missed: bool = False
    paid_date: Optional[str] = None
    notes: Optional[str] = None

class FundedDealCreate(BaseModel):
    client_id: str
    client_name: str
    business_name: Optional[str] = None
    deal_type: str = "MCA"  # MCA, Term Loan, Line of Credit, Equipment Financing
    funded_amount: float
    funding_date: str
    payback_amount: float
    payment_frequency: str = "daily"  # daily, weekly, bi-weekly, monthly
    num_payments: int
    start_date: str
    payment_amount: float
    assigned_rep: Optional[str] = None
    notes: Optional[str] = None

class FundedDealUpdate(BaseModel):
    business_name: Optional[str] = None
    deal_type: Optional[str] = None
    payback_amount: Optional[float] = None
    payment_frequency: Optional[str] = None
    assigned_rep: Optional[str] = None
    notes: Optional[str] = None
    payment_link: Optional[str] = None

class PaymentUpdate(BaseModel):
    cleared: Optional[bool] = None
    missed: Optional[bool] = None
    paid_date: Optional[str] = None
    notes: Optional[str] = None

# Helper functions
def generate_payment_schedule(
    start_date: str,
    num_payments: int,
    payment_amount: float,
    frequency: str
) -> List[dict]:
    """Generate payment schedule based on frequency"""
    schedule = []
    current_date = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
    
    frequency_days = {
        "daily": 1,
        "weekly": 7,
        "bi-weekly": 14,
        "monthly": 30
    }
    
    days_between = frequency_days.get(frequency, 7)
    
    for i in range(num_payments):
        schedule.append({
            "payment_number": i + 1,
            "due_date": current_date.isoformat(),
            "expected_amount": payment_amount,
            "status": "pending",
            "cleared": False,
            "missed": False,
            "paid_date": None,
            "notes": None
        })
        current_date += timedelta(days=days_between)
    
    return schedule

def calculate_deal_totals(payments: List[dict]) -> dict:
    """Calculate deal-level rollup totals"""
    total_payback = sum(p["expected_amount"] for p in payments)
    total_collected = sum(p["expected_amount"] for p in payments if p["cleared"])
    payments_cleared = sum(1 for p in payments if p["cleared"])
    payments_missed = sum(1 for p in payments if p["missed"])
    remaining_balance = total_payback - total_collected
    percent_paid = (total_collected / total_payback * 100) if total_payback > 0 else 0
    
    return {
        "total_payback": total_payback,
        "total_collected": total_collected,
        "remaining_balance": remaining_balance,
        "payments_cleared": payments_cleared,
        "payments_missed": payments_missed,
        "total_payments": len(payments),
        "percent_paid": round(percent_paid, 1)
    }

def get_payment_status(payment: dict) -> str:
    """Determine current payment status"""
    if payment["cleared"]:
        return "cleared"
    if payment["missed"]:
        return "missed"
    
    due_date = datetime.fromisoformat(payment["due_date"].replace('Z', '+00:00'))
    now = datetime.now(timezone.utc)
    
    if due_date.date() > now.date():
        return "pending"
    elif due_date.date() == now.date():
        return "due_today"
    else:
        days_late = (now.date() - due_date.date()).days
        if days_late <= 3:
            return "late"
        elif days_late <= 7:
            return "severely_late"
        else:
            return "severely_late"
    
    return "pending"

def auto_clear_payments(payments: List[dict]) -> List[dict]:
    """Auto-clear payments that are past due (default optimistic behavior)"""
    now = datetime.now(timezone.utc)
    updated = []
    
    for payment in payments:
        if payment["cleared"] or payment["missed"]:
            updated.append(payment)
            continue
            
        due_date = datetime.fromisoformat(payment["due_date"].replace('Z', '+00:00'))
        
        # Auto-clear if past due and not manually marked
        if due_date.date() < now.date():
            payment["cleared"] = True
            payment["status"] = "cleared"
            payment["paid_date"] = due_date.isoformat()
        
        updated.append(payment)
    
    return updated

# Export for use in main server
__all__ = [
    'funded_router',
    'FundedDealCreate',
    'FundedDealUpdate',
    'PaymentUpdate',
    'generate_payment_schedule',
    'calculate_deal_totals',
    'get_payment_status',
    'auto_clear_payments'
]
