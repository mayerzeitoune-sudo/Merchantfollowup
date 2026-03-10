#!/usr/bin/env python3
"""
Seed script to create default message templates
Run this after setting up a new user account
"""

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import uuid
from datetime import datetime, timezone

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

DEFAULT_TEMPLATES = [
    {
        "name": "Payment Reminder - Friendly",
        "category": "Payment Reminder",
        "content": "Hi {client_name}! Just a friendly reminder that your payment of ${client_balance} is due. Please let me know if you have any questions. Thanks!",
        "variables": ["client_name", "client_balance"]
    },
    {
        "name": "Payment Reminder - Urgent",
        "category": "Payment Reminder",
        "content": "Hello {client_name}, your payment of ${client_balance} is now overdue. Please contact us immediately to resolve this matter. Thank you.",
        "variables": ["client_name", "client_balance"]
    },
    {
        "name": "Follow Up - Application Status",
        "category": "Follow Up",
        "content": "Hi {client_name}! I wanted to follow up on your application. Do you have any questions or need any additional information from us?",
        "variables": ["client_name"]
    },
    {
        "name": "Follow Up - Meeting",
        "category": "Follow Up",
        "content": "Hello {client_name}, thank you for meeting with us today. As discussed, I'll send over the documents by end of day. Please let me know if you need anything else!",
        "variables": ["client_name"]
    },
    {
        "name": "Introduction - New Client",
        "category": "Introduction",
        "content": "Hi {client_name}! Welcome to our service. I'm excited to work with you. Please don't hesitate to reach out if you have any questions. Looking forward to helping your business grow!",
        "variables": ["client_name"]
    },
    {
        "name": "Thank You - Payment Received",
        "category": "Thank You",
        "content": "Thank you {client_name}! We've received your payment. We appreciate your business and look forward to continuing to serve you.",
        "variables": ["client_name"]
    },
    {
        "name": "Thank You - Referral",
        "category": "Thank You",
        "content": "Hi {client_name}! Thank you so much for referring {referral_name} to us. We truly appreciate your trust in our services!",
        "variables": ["client_name", "referral_name"]
    },
    {
        "name": "Appointment - Confirmation",
        "category": "Appointment",
        "content": "Hi {client_name}! This confirms your appointment on {appointment_date} at {appointment_time}. Please let me know if you need to reschedule. See you soon!",
        "variables": ["client_name", "appointment_date", "appointment_time"]
    },
    {
        "name": "Appointment - Reminder",
        "category": "Appointment",
        "content": "Hello {client_name}, just a reminder about your appointment tomorrow at {appointment_time}. Please call if you need to reschedule. Thanks!",
        "variables": ["client_name", "appointment_time"]
    },
    {
        "name": "General - Check In",
        "category": "General",
        "content": "Hi {client_name}! Just checking in to see how things are going with your business. Is there anything we can help you with?",
        "variables": ["client_name"]
    }
]

async def seed_templates_for_user(user_id: str):
    """Seed default templates for a specific user"""
    print(f"Seeding templates for user: {user_id}")
    
    # Check if user already has templates
    existing_count = await db.templates.count_documents({"user_id": user_id})
    if existing_count > 0:
        print(f"User already has {existing_count} templates. Skipping...")
        return
    
    now = datetime.now(timezone.utc).isoformat()
    
    templates_to_insert = []
    for template_data in DEFAULT_TEMPLATES:
        template_doc = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "name": template_data["name"],
            "category": template_data["category"],
            "content": template_data["content"],
            "variables": template_data["variables"],
            "use_count": 0,
            "created_at": now,
            "updated_at": now
        }
        templates_to_insert.append(template_doc)
    
    # Insert all templates
    await db.templates.insert_many(templates_to_insert)
    print(f"Successfully created {len(templates_to_insert)} default templates")

async def seed_all_users():
    """Seed templates for all existing users"""
    users = await db.users.find({}, {"id": 1}).to_list(1000)
    print(f"Found {len(users)} users")
    
    for user in users:
        await seed_templates_for_user(user["id"])
    
    print("Template seeding completed!")

async def main():
    if len(sys.argv) > 1:
        # Seed for specific user
        user_id = sys.argv[1]
        await seed_templates_for_user(user_id)
    else:
        # Seed for all users
        await seed_all_users()
    
    client.close()

if __name__ == "__main__":
    asyncio.run(main())