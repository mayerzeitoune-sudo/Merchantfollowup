"""
Organization Management Routes
- Multi-tenant organization structure
- Org Admin (super admin) can manage all organizations
- Admin can manage users within their organization
- Users can only see data within their organization
"""
import os
import uuid
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import jwt

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")
JWT_SECRET = os.environ.get("JWT_SECRET")

# Validate required environment variables
if not MONGO_URL:
    raise RuntimeError("MONGO_URL environment variable is required")
if not DB_NAME:
    raise RuntimeError("DB_NAME environment variable is required")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

router = APIRouter(prefix="/organizations", tags=["Organizations"])

# Pydantic models
class OrganizationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    
class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str = "user"  # user, admin (not org_admin - that's only assignable internally)


async def get_current_user(authorization: str = None):
    """Verify JWT token and return user"""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        token = authorization.replace("Bearer ", "") if authorization.startswith("Bearer ") else authorization
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def require_org_admin(user: dict):
    """Check if user is org_admin"""
    if user.get("role") != "org_admin":
        raise HTTPException(status_code=403, detail="Only Org Admin can perform this action")


def require_admin_or_above(user: dict):
    """Check if user is admin or org_admin"""
    if user.get("role") not in ["admin", "org_admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")


# ============== Organization Management (Org Admin Only) ==============

@router.get("")
async def list_organizations(authorization: str = Query(...)):
    """List all organizations (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    orgs = await db.organizations.find({}, {"_id": 0}).to_list(1000)
    
    # Add user and client count for each org
    for org in orgs:
        org["user_count"] = await db.users.count_documents({"org_id": org["id"]})
        org["client_count"] = await db.clients.count_documents({"org_id": org["id"]})
    
    return orgs


@router.post("")
async def create_organization(data: OrganizationCreate, authorization: str = Query(...)):
    """Create a new organization (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    # Check if org name already exists
    existing = await db.organizations.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail="Organization with this name already exists")
    
    org_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    org_doc = {
        "id": org_id,
        "name": data.name,
        "description": data.description,
        "is_active": True,
        "created_at": now,
        "created_by": user["id"]
    }
    
    await db.organizations.insert_one(org_doc)
    del org_doc["_id"]
    
    return org_doc


@router.get("/{org_id}")
async def get_organization(org_id: str, authorization: str = Query(...)):
    """Get organization details (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    org = await db.organizations.find_one({"id": org_id}, {"_id": 0})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Add stats
    org["user_count"] = await db.users.count_documents({"org_id": org_id})
    org["admin_count"] = await db.users.count_documents({"org_id": org_id, "role": "admin"})
    org["client_count"] = await db.clients.count_documents({"org_id": org_id})
    
    return org


@router.put("/{org_id}")
async def update_organization(org_id: str, data: OrganizationUpdate, authorization: str = Query(...)):
    """Update organization (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if data.name is not None:
        update_data["name"] = data.name
    if data.description is not None:
        update_data["description"] = data.description
    if data.is_active is not None:
        update_data["is_active"] = data.is_active
    
    result = await db.organizations.update_one(
        {"id": org_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {"message": "Organization updated"}


@router.delete("/{org_id}")
async def delete_organization(org_id: str, authorization: str = Query(...)):
    """Delete organization and all its data (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    # Delete all org data
    await db.users.delete_many({"org_id": org_id})
    await db.clients.delete_many({"org_id": org_id})
    await db.funded_deals.delete_many({"org_id": org_id})
    await db.conversations.delete_many({"org_id": org_id})
    await db.reminders.delete_many({"org_id": org_id})
    await db.campaigns.delete_many({"org_id": org_id})
    
    result = await db.organizations.delete_one({"id": org_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    return {"message": "Organization and all data deleted"}


@router.get("/{org_id}/users")
async def list_org_users(org_id: str, authorization: str = Query(...)):
    """List users in an organization (Org Admin or Admin of that org)"""
    user = await get_current_user(authorization)
    
    # Org admin can see any org, admin can only see their own
    if user.get("role") != "org_admin":
        if user.get("role") != "admin" or user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    users = await db.users.find(
        {"org_id": org_id},
        {"_id": 0, "password": 0}
    ).to_list(1000)
    
    return users


@router.post("/{org_id}/users")
async def add_user_to_org(org_id: str, data: UserCreate, authorization: str = Query(...)):
    """Add a user to an organization (Org Admin or Admin of that org)"""
    import bcrypt
    
    user = await get_current_user(authorization)
    
    # Org admin can add to any org, admin can only add to their own
    if user.get("role") != "org_admin":
        if user.get("role") != "admin" or user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Admin cannot create another admin
        if data.role == "admin":
            raise HTTPException(status_code=403, detail="Only Org Admin can create admin users")
    
    # Verify org exists
    org = await db.organizations.find_one({"id": org_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Check if email exists
    existing = await db.users.find_one({"email": data.email})
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Prevent creating org_admin role
    if data.role == "org_admin":
        raise HTTPException(status_code=403, detail="Cannot create org_admin users")
    
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    
    # Hash password using bcrypt
    hashed_password = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    new_user = {
        "id": user_id,
        "email": data.email,
        "name": data.name,
        "password": hashed_password,
        "role": data.role,
        "org_id": org_id,
        "org_name": org["name"],
        "is_verified": True,
        "created_at": now,
        "created_by": user["id"]
    }
    
    await db.users.insert_one(new_user)
    
    return {
        "message": "User created",
        "user_id": user_id,
        "email": data.email,
        "name": data.name,
        "role": data.role,
        "org_name": org["name"]
    }


@router.delete("/{org_id}/users/{user_id}")
async def remove_user_from_org(org_id: str, user_id: str, authorization: str = Query(...)):
    """Remove a user from an organization"""
    user = await get_current_user(authorization)
    
    # Org admin can remove from any org, admin can only remove from their own
    if user.get("role") != "org_admin":
        if user.get("role") != "admin" or user.get("org_id") != org_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    # Cannot remove yourself
    if user_id == user["id"]:
        raise HTTPException(status_code=400, detail="Cannot remove yourself")
    
    # Check target user
    target_user = await db.users.find_one({"id": user_id, "org_id": org_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in this organization")
    
    # Admin cannot remove another admin
    if user.get("role") == "admin" and target_user.get("role") == "admin":
        raise HTTPException(status_code=403, detail="Admins cannot remove other admins")
    
    await db.users.delete_one({"id": user_id})
    
    return {"message": "User removed"}


# ============== Stats for Org Admin ==============

@router.get("/stats/overview")
async def get_org_overview_stats(authorization: str = Query(...)):
    """Get overview stats across all organizations (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    total_orgs = await db.organizations.count_documents({})
    
    # Count only users that belong to an organization (have org_id)
    total_users_in_orgs = await db.users.count_documents({
        "org_id": {"$exists": True, "$ne": None},
        "role": {"$ne": "org_admin"}
    })
    
    # Count admins in organizations
    total_admins = await db.users.count_documents({
        "org_id": {"$exists": True, "$ne": None},
        "role": "admin"
    })
    
    # Count clients that belong to organizations
    total_clients_in_orgs = await db.clients.count_documents({
        "org_id": {"$exists": True, "$ne": None}
    })
    
    # Also get unassigned counts for reference
    unassigned_users = await db.users.count_documents({
        "$or": [{"org_id": {"$exists": False}}, {"org_id": None}],
        "role": {"$ne": "org_admin"}
    })
    unassigned_clients = await db.clients.count_documents({
        "$or": [{"org_id": {"$exists": False}}, {"org_id": None}]
    })
    
    return {
        "total_organizations": total_orgs,
        "total_users": total_users_in_orgs,
        "total_admins": total_admins,
        "total_clients": total_clients_in_orgs,
        "unassigned_users": unassigned_users,
        "unassigned_clients": unassigned_clients
    }



@router.get("/unassigned/users")
async def get_unassigned_users(authorization: str = Query(...)):
    """Get all users not assigned to any organization (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    users = await db.users.find({
        "$or": [{"org_id": {"$exists": False}}, {"org_id": None}],
        "role": {"$ne": "org_admin"}
    }, {"_id": 0, "password": 0}).to_list(1000)
    
    return users

@router.get("/unassigned/clients")
async def get_unassigned_clients(authorization: str = Query(...)):
    """Get all clients not assigned to any organization (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    clients = await db.clients.find({
        "$or": [{"org_id": {"$exists": False}}, {"org_id": None}]
    }, {"_id": 0}).to_list(1000)
    
    return clients

@router.get("/all/users")
async def get_all_org_users(authorization: str = Query(...)):
    """Get all users across all organizations (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    # Get all users with org_id
    users = await db.users.find({
        "org_id": {"$exists": True, "$ne": None},
        "role": {"$ne": "org_admin"}
    }, {"_id": 0, "password": 0}).to_list(1000)
    
    # Get organization names
    org_ids = list(set(u.get("org_id") for u in users if u.get("org_id")))
    orgs = await db.organizations.find({"id": {"$in": org_ids}}, {"_id": 0}).to_list(1000)
    org_map = {o["id"]: o["name"] for o in orgs}
    
    # Add org names to users
    for u in users:
        u["organization_name"] = org_map.get(u.get("org_id"), "Unknown")
    
    return users

class AssignUserRequest(BaseModel):
    user_id: str
    organization_id: str

class AssignClientRequest(BaseModel):
    client_id: str
    organization_id: str

@router.post("/assign/user")
async def assign_user_to_org(data: AssignUserRequest, authorization: str = Query(...)):
    """Assign a user to an organization (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    # Verify organization exists
    org = await db.organizations.find_one({"id": data.organization_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify user exists
    target_user = await db.users.find_one({"user_id": data.user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user's org_id
    result = await db.users.update_one(
        {"user_id": data.user_id},
        {"$set": {"org_id": data.organization_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to assign user")
    
    return {"message": "User assigned to organization successfully"}

@router.post("/assign/client")
async def assign_client_to_org(data: AssignClientRequest, authorization: str = Query(...)):
    """Assign a client to an organization (Org Admin only)"""
    user = await get_current_user(authorization)
    require_org_admin(user)
    
    # Verify organization exists
    org = await db.organizations.find_one({"id": data.organization_id})
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    
    # Verify client exists
    client = await db.clients.find_one({"id": data.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    # Update client's org_id
    result = await db.clients.update_one(
        {"id": data.client_id},
        {"$set": {"org_id": data.organization_id}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=400, detail="Failed to assign client")
    
    return {"message": "Client assigned to organization successfully"}
