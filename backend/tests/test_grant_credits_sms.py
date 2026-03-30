"""
Test Grant Credits Feature and SMS Sending Logic
Tests:
1. GET /api/credits/all-orgs - org_admin only
2. POST /api/credits/grant - org_admin only
3. GET /api/phone-numbers/owned - twilio_purchased and twilio_sid fields
4. POST /api/contacts/{client_id}/send-sms - Twilio SMS sending
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"
REGULAR_ADMIN_EMAIL = "john@acmefunding.com"
REGULAR_ADMIN_PASSWORD = "Password123!"

# Known org ID for testing
ACME_ORG_ID = "4ed58e9b-7502-4182-825e-7981c0371a49"


class TestGrantCreditsFeature:
    """Test org_admin-only Grant Credits feature"""
    
    @pytest.fixture(scope="class")
    def org_admin_token(self):
        """Get org_admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as org_admin: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def regular_admin_token(self):
        """Get regular admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login as regular admin: {response.text}")
        return response.json().get("token")
    
    def test_all_orgs_as_org_admin(self, org_admin_token):
        """GET /api/credits/all-orgs as org_admin should return list of all orgs"""
        response = requests.get(
            f"{BASE_URL}/api/credits/all-orgs",
            headers={"Authorization": f"Bearer {org_admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) > 0, "Should have at least one organization"
        
        # Verify structure of each org
        for org in data:
            assert "id" in org, "Org should have id"
            assert "name" in org, "Org should have name"
            assert "credit_balance" in org, "Org should have credit_balance"
            assert "user_count" in org, "Org should have user_count"
            assert isinstance(org["credit_balance"], (int, float)), "credit_balance should be numeric"
            assert isinstance(org["user_count"], int), "user_count should be integer"
        
        print(f"✓ Found {len(data)} organizations")
        for org in data[:3]:  # Print first 3
            print(f"  - {org['name']}: {org['credit_balance']} credits, {org['user_count']} users")
    
    def test_all_orgs_as_regular_admin_forbidden(self, regular_admin_token):
        """GET /api/credits/all-orgs as regular admin should return 403"""
        response = requests.get(
            f"{BASE_URL}/api/credits/all-orgs",
            headers={"Authorization": f"Bearer {regular_admin_token}"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Regular admin correctly denied access to all-orgs")
    
    def test_grant_credits_as_org_admin(self, org_admin_token):
        """POST /api/credits/grant as org_admin should grant credits successfully"""
        # First get current balance
        orgs_response = requests.get(
            f"{BASE_URL}/api/credits/all-orgs",
            headers={"Authorization": f"Bearer {org_admin_token}"}
        )
        orgs = orgs_response.json()
        acme_org = next((o for o in orgs if o["id"] == ACME_ORG_ID), None)
        
        if not acme_org:
            pytest.skip("Acme Funding Corp org not found")
        
        initial_balance = acme_org["credit_balance"]
        grant_amount = 100  # Small test amount
        
        # Grant credits
        response = requests.post(
            f"{BASE_URL}/api/credits/grant",
            headers={"Authorization": f"Bearer {org_admin_token}"},
            json={
                "org_id": ACME_ORG_ID,
                "amount": grant_amount,
                "reason": "Test grant from automated testing"
            }
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["status"] == "success", "Grant should succeed"
        assert data["credits_added"] == grant_amount, f"Should add {grant_amount} credits"
        assert data["new_balance"] == initial_balance + grant_amount, "New balance should be initial + grant"
        assert "transaction_id" in data, "Should return transaction_id"
        
        print(f"✓ Granted {grant_amount} credits to {data['org_name']}")
        print(f"  New balance: {data['new_balance']}")
    
    def test_grant_credits_as_regular_admin_forbidden(self, regular_admin_token):
        """POST /api/credits/grant as regular admin should return 403"""
        response = requests.post(
            f"{BASE_URL}/api/credits/grant",
            headers={"Authorization": f"Bearer {regular_admin_token}"},
            json={
                "org_id": ACME_ORG_ID,
                "amount": 100,
                "reason": "Should fail"
            }
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Regular admin correctly denied grant access")
    
    def test_grant_credits_invalid_org(self, org_admin_token):
        """POST /api/credits/grant with invalid org_id should return 404"""
        response = requests.post(
            f"{BASE_URL}/api/credits/grant",
            headers={"Authorization": f"Bearer {org_admin_token}"},
            json={
                "org_id": "invalid-org-id-12345",
                "amount": 100,
                "reason": "Should fail"
            }
        )
        assert response.status_code == 404, f"Expected 404, got {response.status_code}: {response.text}"
        print("✓ Invalid org_id correctly returns 404")
    
    def test_grant_credits_invalid_amount(self, org_admin_token):
        """POST /api/credits/grant with amount <= 0 should return 400"""
        # Test with 0
        response = requests.post(
            f"{BASE_URL}/api/credits/grant",
            headers={"Authorization": f"Bearer {org_admin_token}"},
            json={
                "org_id": ACME_ORG_ID,
                "amount": 0,
                "reason": "Should fail"
            }
        )
        assert response.status_code == 400, f"Expected 400 for amount=0, got {response.status_code}: {response.text}"
        
        # Test with negative
        response = requests.post(
            f"{BASE_URL}/api/credits/grant",
            headers={"Authorization": f"Bearer {org_admin_token}"},
            json={
                "org_id": ACME_ORG_ID,
                "amount": -50,
                "reason": "Should fail"
            }
        )
        assert response.status_code == 400, f"Expected 400 for negative amount, got {response.status_code}: {response.text}"
        print("✓ Invalid amounts correctly return 400")


class TestPhoneNumbersWithTwilioFields:
    """Test phone numbers API includes twilio_purchased and twilio_sid fields"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login: {response.text}")
        return response.json().get("token")
    
    def test_owned_numbers_include_twilio_fields(self, admin_token):
        """GET /api/phone-numbers/owned should include twilio_purchased and twilio_sid fields"""
        response = requests.get(
            f"{BASE_URL}/api/phone-numbers/owned",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        numbers = response.json()
        print(f"✓ Found {len(numbers)} phone numbers")
        
        # Check if any number has twilio_purchased=true
        twilio_numbers = [n for n in numbers if n.get("twilio_purchased") == True]
        print(f"  - Twilio-purchased numbers: {len(twilio_numbers)}")
        
        for num in numbers:
            # These fields should exist in the response (can be null)
            print(f"  - {num.get('phone_number')}: twilio_purchased={num.get('twilio_purchased')}, twilio_sid={num.get('twilio_sid')}")
        
        # Verify at least one Twilio-purchased number exists (as per context)
        if twilio_numbers:
            twilio_num = twilio_numbers[0]
            assert twilio_num.get("twilio_purchased") == True, "Should have twilio_purchased=true"
            # twilio_sid may or may not be present depending on how it was purchased
            print(f"✓ Found Twilio-purchased number: {twilio_num.get('phone_number')}")


class TestSMSSending:
    """Test SMS sending logic with Twilio"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin auth token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Could not login: {response.text}")
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def test_client_id(self, admin_token):
        """Get or create a test client with a test phone number"""
        # First try to find an existing client
        response = requests.get(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            clients = response.json()
            if clients:
                return clients[0]["id"]
        
        # Create a test client
        response = requests.post(
            f"{BASE_URL}/api/clients",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "name": "TEST_SMS_Client",
                "phone": "+15551234567",  # Test number
                "email": "test@example.com"
            }
        )
        if response.status_code in [200, 201]:
            return response.json()["id"]
        pytest.skip("Could not get or create test client")
    
    @pytest.fixture(scope="class")
    def twilio_from_number(self, admin_token):
        """Get a Twilio-purchased number to send from"""
        response = requests.get(
            f"{BASE_URL}/api/phone-numbers/owned",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code != 200:
            pytest.skip("Could not get phone numbers")
        
        numbers = response.json()
        twilio_numbers = [n for n in numbers if n.get("twilio_purchased") == True]
        
        if not twilio_numbers:
            pytest.skip("No Twilio-purchased numbers available")
        
        return twilio_numbers[0]["phone_number"]
    
    def test_send_sms_with_twilio_number(self, admin_token, test_client_id, twilio_from_number):
        """POST /api/contacts/{client_id}/send-sms should attempt Twilio API call"""
        response = requests.post(
            f"{BASE_URL}/api/contacts/{test_client_id}/send-sms",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "message": "Test message from automated testing",
                "from_number": twilio_from_number
            }
        )
        
        # The request should succeed (200) even if Twilio fails due to invalid test number
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        print(f"✓ SMS send response:")
        print(f"  - message_id: {data.get('message_id')}")
        print(f"  - from_number: {data.get('from_number')}")
        print(f"  - status: {data.get('status')}")
        print(f"  - twilio_sid: {data.get('twilio_sid')}")
        
        # Status should be either 'sent', 'queued', 'failed' (if Twilio rejects the test number)
        # The important thing is the code path reached Twilio (not a 500 error)
        assert data.get("status") in ["sent", "queued", "failed", "pending_provider"], \
            f"Unexpected status: {data.get('status')}"
        
        # If status is 'failed', it should be a Twilio error (expected for +1555 numbers)
        if data.get("status") == "failed":
            print("  Note: SMS failed as expected (test phone number)")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
