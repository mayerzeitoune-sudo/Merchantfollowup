#!/usr/bin/env python3
"""
Simple test script to verify templates functionality
"""

import asyncio
import os
import sys
from pathlib import Path
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Add the backend directory to the path
sys.path.append(str(Path(__file__).parent))

# Load environment variables
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

async def test_templates():
    """Test templates functionality"""
    print("Testing templates functionality...")
    
    # Get a user
    user = await db.users.find_one({})
    if not user:
        print("No users found. Please create a user first.")
        return
    
    user_id = user["id"]
    print(f"Testing with user: {user['email']}")
    
    # Check templates
    templates = await db.templates.find({"user_id": user_id}).to_list(100)
    print(f"Found {len(templates)} templates for user")
    
    if templates:
        template = templates[0]
        print(f"Sample template: {template['name']}")
        print(f"Content: {template['content']}")
        print(f"Variables: {template['variables']}")
        print(f"Category: {template['category']}")
    
    # Check clients
    clients = await db.clients.find({"user_id": user_id}).to_list(10)
    print(f"Found {len(clients)} clients for user")
    
    if clients:
        client = clients[0]
        print(f"Sample client: {client['name']} - {client['phone']}")
    
    print("Templates functionality test completed!")

async def main():
    await test_templates()
    client.close()

if __name__ == "__main__":
    asyncio.run(main())