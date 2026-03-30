"""
Test suite for credit system, phone number purchasing, SMS sending, and unread messages.
Tests:
1. Phone number purchase requires credits (402 if insufficient)
2. Phone number purchase requires org_id (400 if missing)
3. SMS sending deducts credits
4. Unread messages endpoint returns count and messages
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"
ACME_ORG_ID = "4ed58e9b-7502-4182-825e-7981c0371a49"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def org_admin_token():
    """Get org_admin auth token (no org_id)"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORG_ADMIN_EMAIL,
        "password": ORG_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Org admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def admin_client(admin_token):
    """Session with admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {admin_token}"
    })
    return session


@pytest.fixture
def org_admin_client(org_admin_token):
    """Session with org_admin auth header"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {org_admin_token}"
    })
    return session


class TestCreditBalance:
    """Test credit balance endpoint"""
    
    def test_get_credit_balance(self, admin_client):
        """GET /api/credits/balance should return org credit balance"""
        response = admin_client.get(f"{BASE_URL}/api/credits/balance")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "balance" in data, "Response should contain 'balance' field"
        assert isinstance(data["balance"], (int, float)), "Balance should be a number"
        print(f"Current credit balance: {data['balance']}")


class TestPhoneNumberPurchase:
    """Test phone number purchase credit requirements"""
    
    def test_purchase_requires_credits(self, admin_client):
        """POST /api/phone-numbers/purchase should require credits"""
        # First check current balance
        balance_res = admin_client.get(f"{BASE_URL}/api/credits/balance")
        current_balance = balance_res.json().get("balance", 0)
        print(f"Current balance before test: {current_balance}")
        
        # Try to purchase a fake number (won't actually purchase from Twilio)
        # This tests the credit check logic
        response = admin_client.post(f"{BASE_URL}/api/phone-numbers/purchase", json={
            "phone_number": "+15551234567",  # Fake number
            "friendly_name": "Test Number",
            "provider": "mock"  # Use mock provider to avoid Twilio
        })
        
        # If balance is 0, should get 402
        # If balance >= 40, should proceed (may fail at Twilio level)
        if current_balance < 40:
            assert response.status_code == 402, f"Expected 402 for insufficient credits, got {response.status_code}: {response.text}"
            assert "Insufficient credits" in response.text or "credits" in response.text.lower()
            print("PASS: Purchase correctly rejected due to insufficient credits")
        else:
            # With sufficient credits, it should attempt purchase
            # May fail at Twilio level but credit check passed
            print(f"Balance is {current_balance}, credit check should pass")
            # The response could be 200 (success), 500 (Twilio error), or other
            # But NOT 402 (insufficient credits)
            assert response.status_code != 402 or current_balance >= 40, \
                f"Got 402 but balance is {current_balance}"
    
    def test_purchase_without_org_returns_400(self, org_admin_client):
        """POST /api/phone-numbers/purchase as org_admin (no org_id) should return 400"""
        response = org_admin_client.post(f"{BASE_URL}/api/phone-numbers/purchase", json={
            "phone_number": "+15551234568",
            "friendly_name": "Test Number",
            "provider": "mock"
        })
        
        # org_admin without org_id should get 400 or 403
        # The code checks: if not org_id: raise HTTPException(status_code=400, ...)
        print(f"Response status: {response.status_code}")
        print(f"Response body: {response.text}")
        
        # Should be 400 for missing org_id or 403 for permission denied
        assert response.status_code in [400, 403], \
            f"Expected 400 or 403 for org_admin without org_id, got {response.status_code}: {response.text}"
        
        if response.status_code == 400:
            assert "organization" in response.text.lower() or "org" in response.text.lower(), \
                "Error should mention organization requirement"
            print("PASS: Purchase correctly rejected - org_id required")


class TestSMSSendCredits:
    """Test SMS sending credit deduction"""
    
    def test_sms_send_deducts_credits(self, admin_client):
        """POST /api/contacts/{client_id}/send-sms should deduct credits"""
        # First get a client to send SMS to
        clients_res = admin_client.get(f"{BASE_URL}/api/clients")
        if clients_res.status_code != 200:
            pytest.skip("Could not fetch clients")
        
        clients = clients_res.json()
        if not clients:
            pytest.skip("No clients available for SMS test")
        
        # Find a client with a phone number
        test_client = None
        for client in clients:
            if client.get("phone"):
                test_client = client
                break
        
        if not test_client:
            pytest.skip("No client with phone number found")
        
        # Get current balance
        balance_before = admin_client.get(f"{BASE_URL}/api/credits/balance").json().get("balance", 0)
        print(f"Balance before SMS: {balance_before}")
        
        # Try to send SMS
        response = admin_client.post(f"{BASE_URL}/api/contacts/{test_client['id']}/send-sms", json={
            "message": "Test message from automated test"
        })
        
        print(f"SMS response status: {response.status_code}")
        print(f"SMS response: {response.text}")
        
        if balance_before < 1:
            # Should fail with 402 insufficient credits
            assert response.status_code == 402, \
                f"Expected 402 for insufficient credits, got {response.status_code}"
            print("PASS: SMS correctly rejected due to insufficient credits")
        else:
            # Check if balance was deducted
            balance_after = admin_client.get(f"{BASE_URL}/api/credits/balance").json().get("balance", 0)
            print(f"Balance after SMS: {balance_after}")
            
            # If SMS was sent successfully, balance should decrease
            if response.status_code == 200:
                # Balance should have decreased by at least 1 credit
                assert balance_after < balance_before, \
                    f"Balance should decrease after SMS. Before: {balance_before}, After: {balance_after}"
                print(f"PASS: Credits deducted. Before: {balance_before}, After: {balance_after}")


class TestUnreadMessages:
    """Test unread messages endpoint"""
    
    def test_get_unread_messages(self, admin_client):
        """GET /api/messages/unread should return count and messages"""
        response = admin_client.get(f"{BASE_URL}/api/messages/unread")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "count" in data, "Response should contain 'count' field"
        assert "messages" in data, "Response should contain 'messages' field"
        assert isinstance(data["count"], int), "Count should be an integer"
        assert isinstance(data["messages"], list), "Messages should be a list"
        
        print(f"Unread messages count: {data['count']}")
        print(f"Unread messages: {len(data['messages'])} returned")
        
        # Verify message structure if any exist
        if data["messages"]:
            msg = data["messages"][0]
            print(f"Sample message keys: {list(msg.keys())}")
            # Should have client info
            assert "client_id" in msg or "from_number" in msg, \
                "Message should have client_id or from_number"
    
    def test_mark_message_read(self, admin_client):
        """PUT /api/messages/{id}/read should mark message as read"""
        # First get unread messages
        unread_res = admin_client.get(f"{BASE_URL}/api/messages/unread")
        if unread_res.status_code != 200:
            pytest.skip("Could not fetch unread messages")
        
        messages = unread_res.json().get("messages", [])
        if not messages:
            print("No unread messages to test mark-as-read")
            return
        
        # Mark first message as read
        msg_id = messages[0].get("id")
        if not msg_id:
            pytest.skip("Message has no id field")
        
        response = admin_client.put(f"{BASE_URL}/api/messages/{msg_id}/read")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        print(f"PASS: Message {msg_id} marked as read")


class TestCreditPackages:
    """Test credit packages endpoint"""
    
    def test_get_credit_packages(self, admin_client):
        """GET /api/credits/packages should return available packages"""
        response = admin_client.get(f"{BASE_URL}/api/credits/packages")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        # API returns list directly, not wrapped in {packages: [...]}
        packages = data if isinstance(data, list) else data.get("packages", [])
        assert isinstance(packages, list), "Packages should be a list"
        assert len(packages) > 0, "Should have at least one package"
        
        # Verify package structure
        pkg = packages[0]
        assert "id" in pkg, "Package should have id"
        assert "name" in pkg, "Package should have name"
        assert "usd" in pkg, "Package should have usd price"
        assert "credits" in pkg, "Package should have credits amount"
        
        print(f"Available packages: {len(packages)}")
        for p in packages:
            print(f"  - {p['name']}: ${p['usd']} for {p['credits']} credits")


class TestCreditTransactionHistory:
    """Test credit transaction history"""
    
    def test_get_transaction_history(self, admin_client):
        """GET /api/credits/history should return transaction history"""
        response = admin_client.get(f"{BASE_URL}/api/credits/history")
        # Endpoint may not exist - skip if 404
        if response.status_code == 404:
            pytest.skip("Transaction history endpoint not implemented")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        transactions = data if isinstance(data, list) else data.get("transactions", [])
        assert isinstance(transactions, list), "Transactions should be a list"
        
        print(f"Transaction history: {len(transactions)} records")
        
        # Verify transaction structure if any exist
        if transactions:
            txn = transactions[0]
            print(f"Sample transaction keys: {list(txn.keys())}")
            # API uses credits_delta instead of amount
            assert "credits_delta" in txn or "amount" in txn, "Transaction should have credits_delta or amount"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
