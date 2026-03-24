"""
Phone Number Purchasing Feature Tests
Tests for:
- Admin can purchase phone numbers (POST /api/phone-numbers/purchase)
- Agent can purchase phone numbers and it auto-assigns to them
- Agent is blocked when org has allow_rep_purchases=false
- Agent is blocked when monthly limit is reached
- GET /api/phone-numbers/purchase-status returns correct can_purchase, limit, purchased_this_month
- GET /api/settings/phone-numbers returns org phone settings for admin
- PUT /api/settings/phone-numbers allows admin to set rep_monthly_number_limit
- Org admin can toggle allow_rep_purchases via PUT /api/organizations/{org_id}
"""

import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
AGENT_EMAIL = "mike@acmefunding.com"
AGENT_PASSWORD = "Password123!"
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"
ACME_ORG_ID = "4ed58e9b-7502-4182-825e-7981c0371a49"


class TestPhoneNumberPurchasing:
    """Test phone number purchasing feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_token(self, email, password):
        """Helper to get auth token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            return response.json().get("token")
        return None
    
    # ============== Purchase Status Tests ==============
    
    def test_admin_purchase_status(self):
        """Admin should always be able to purchase (can_purchase=true)"""
        token = self.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/phone-numbers/purchase-status",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Admin should always be able to purchase
        assert data.get("can_purchase") == True, f"Admin should be able to purchase: {data}"
        print(f"✓ Admin purchase status: can_purchase={data.get('can_purchase')}")
    
    def test_agent_purchase_status_when_allowed(self):
        """Agent should see correct purchase status when org allows rep purchases"""
        # First ensure org allows rep purchases
        org_admin_token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        assert org_admin_token, "Org admin login failed"
        
        # Enable rep purchases for the org
        update_response = self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True, "rep_monthly_number_limit": 0}
        )
        assert update_response.status_code == 200, f"Failed to update org: {update_response.text}"
        
        # Now check agent's purchase status
        agent_token = self.get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/phone-numbers/purchase-status",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Agent should be able to purchase when org allows it
        assert data.get("can_purchase") == True, f"Agent should be able to purchase when allowed: {data}"
        print(f"✓ Agent purchase status when allowed: can_purchase={data.get('can_purchase')}")
    
    def test_agent_purchase_status_when_blocked(self):
        """Agent should see can_purchase=false when org disables rep purchases"""
        # First disable rep purchases for the org
        org_admin_token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        assert org_admin_token, "Org admin login failed"
        
        update_response = self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": False}
        )
        assert update_response.status_code == 200, f"Failed to update org: {update_response.text}"
        
        # Now check agent's purchase status
        agent_token = self.get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/phone-numbers/purchase-status",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Agent should NOT be able to purchase when org disables it
        assert data.get("can_purchase") == False, f"Agent should NOT be able to purchase when blocked: {data}"
        assert "reason" in data and data["reason"], f"Should have a reason: {data}"
        print(f"✓ Agent purchase status when blocked: can_purchase={data.get('can_purchase')}, reason={data.get('reason')}")
        
        # Restore org settings
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True}
        )
    
    # ============== Phone Number Settings Tests ==============
    
    def test_admin_get_phone_settings(self):
        """Admin should be able to get phone number settings"""
        token = self.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"
        
        response = self.session.get(
            f"{BASE_URL}/api/settings/phone-numbers",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Should have the expected fields
        assert "allow_rep_purchases" in data, f"Missing allow_rep_purchases: {data}"
        assert "rep_monthly_number_limit" in data, f"Missing rep_monthly_number_limit: {data}"
        print(f"✓ Admin phone settings: allow_rep_purchases={data.get('allow_rep_purchases')}, limit={data.get('rep_monthly_number_limit')}")
    
    def test_admin_update_phone_settings(self):
        """Admin should be able to update rep monthly limit"""
        token = self.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"
        
        # Set a limit
        response = self.session.put(
            f"{BASE_URL}/api/settings/phone-numbers",
            headers={"Authorization": f"Bearer {token}"},
            json={"rep_monthly_number_limit": 5}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        get_response = self.session.get(
            f"{BASE_URL}/api/settings/phone-numbers",
            headers={"Authorization": f"Bearer {token}"}
        )
        data = get_response.json()
        assert data.get("rep_monthly_number_limit") == 5, f"Limit should be 5: {data}"
        print(f"✓ Admin updated phone settings: rep_monthly_number_limit={data.get('rep_monthly_number_limit')}")
        
        # Reset to 0 (no limit)
        self.session.put(
            f"{BASE_URL}/api/settings/phone-numbers",
            headers={"Authorization": f"Bearer {token}"},
            json={"rep_monthly_number_limit": 0}
        )
    
    # ============== Organization Settings Tests ==============
    
    def test_org_admin_toggle_allow_rep_purchases(self):
        """Org admin should be able to toggle allow_rep_purchases"""
        token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        assert token, "Org admin login failed"
        
        # Disable rep purchases
        response = self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"},
            json={"allow_rep_purchases": False}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        get_response = self.session.get(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"}
        )
        data = get_response.json()
        assert data.get("allow_rep_purchases") == False, f"allow_rep_purchases should be False: {data}"
        print(f"✓ Org admin toggled allow_rep_purchases to False")
        
        # Re-enable rep purchases
        response = self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"},
            json={"allow_rep_purchases": True}
        )
        assert response.status_code == 200
        print(f"✓ Org admin toggled allow_rep_purchases back to True")
    
    def test_org_admin_set_monthly_limit(self):
        """Org admin should be able to set rep_monthly_number_limit"""
        token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        assert token, "Org admin login failed"
        
        # Set monthly limit
        response = self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"},
            json={"rep_monthly_number_limit": 3}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify the change
        get_response = self.session.get(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"}
        )
        data = get_response.json()
        assert data.get("rep_monthly_number_limit") == 3, f"rep_monthly_number_limit should be 3: {data}"
        print(f"✓ Org admin set rep_monthly_number_limit to 3")
        
        # Reset to 0 (no limit)
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"},
            json={"rep_monthly_number_limit": 0}
        )
        print(f"✓ Org admin reset rep_monthly_number_limit to 0")
    
    # ============== Purchase Tests ==============
    
    def test_admin_can_purchase_phone_number(self):
        """Admin should be able to purchase a phone number"""
        token = self.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert token, "Admin login failed"
        
        # Generate a unique test phone number
        test_number = f"+1555{datetime.now().strftime('%H%M%S')}"
        
        response = self.session.post(
            f"{BASE_URL}/api/phone-numbers/purchase",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "phone_number": test_number,
                "friendly_name": "Test Admin Number",
                "provider": "twilio"
            }
        )
        
        # API returns 200 for successful purchase (not 201)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        assert data.get("phone_number") == test_number, f"Phone number mismatch: {data}"
        print(f"✓ Admin purchased phone number: {test_number}")
        
        # Clean up - delete the test number
        if data.get("id"):
            self.session.delete(
                f"{BASE_URL}/api/phone-numbers/{data['id']}",
                headers={"Authorization": f"Bearer {token}"}
            )
            print(f"✓ Cleaned up test phone number")
    
    def test_agent_purchase_auto_assigns(self):
        """Agent purchased number should auto-assign to them"""
        # First ensure org allows rep purchases
        org_admin_token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True, "rep_monthly_number_limit": 0}
        )
        
        agent_token = self.get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        # Get agent's user ID
        me_response = self.session.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        agent_id = me_response.json().get("id")
        
        # Generate a unique test phone number
        test_number = f"+1555{datetime.now().strftime('%H%M%S')}"
        
        response = self.session.post(
            f"{BASE_URL}/api/phone-numbers/purchase",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "phone_number": test_number,
                "friendly_name": "Test Agent Number",
                "provider": "twilio"
            }
        )
        
        # API returns 200 for successful purchase (not 201)
        assert response.status_code in [200, 201], f"Expected 200/201, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify auto-assignment
        assert data.get("assigned_user_id") == agent_id, f"Number should be auto-assigned to agent: {data}"
        print(f"✓ Agent purchased phone number and it was auto-assigned to them")
        
        # Clean up - admin deletes the test number
        admin_token = self.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        if data.get("id"):
            self.session.delete(
                f"{BASE_URL}/api/phone-numbers/{data['id']}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            print(f"✓ Cleaned up test phone number")
    
    def test_agent_blocked_when_org_disables_purchases(self):
        """Agent should be blocked from purchasing when org disables rep purchases"""
        # Disable rep purchases for the org
        org_admin_token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": False}
        )
        
        agent_token = self.get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        
        # Try to purchase
        test_number = f"+1555{datetime.now().strftime('%H%M%S')}"
        
        response = self.session.post(
            f"{BASE_URL}/api/phone-numbers/purchase",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "phone_number": test_number,
                "friendly_name": "Test Blocked Number",
                "provider": "twilio"
            }
        )
        
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print(f"✓ Agent correctly blocked from purchasing when org disables rep purchases")
        
        # Restore org settings
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True}
        )
    
    def test_agent_blocked_when_monthly_limit_reached(self):
        """Agent should be blocked when monthly purchase limit is reached"""
        org_admin_token = self.get_token(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
        agent_token = self.get_token(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_token, "Agent login failed"
        admin_token = self.get_token(ADMIN_EMAIL, ADMIN_PASSWORD)
        
        # First set a high limit to get accurate count of purchases this month
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True, "rep_monthly_number_limit": 100}
        )
        
        # Now check how many numbers the agent has purchased this month
        status_response = self.session.get(
            f"{BASE_URL}/api/phone-numbers/purchase-status",
            headers={"Authorization": f"Bearer {agent_token}"}
        )
        current_purchased = status_response.json().get("purchased_this_month", 0)
        print(f"Agent has purchased {current_purchased} numbers this month")
        
        # Set limit to current + 1 so agent can purchase one more
        new_limit = current_purchased + 1
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True, "rep_monthly_number_limit": new_limit}
        )
        print(f"Set monthly limit to {new_limit}")
        
        # Purchase one number (should succeed - at limit)
        test_number1 = f"+1555{datetime.now().strftime('%H%M%S')}"
        response1 = self.session.post(
            f"{BASE_URL}/api/phone-numbers/purchase",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "phone_number": test_number1,
                "friendly_name": "Test Limit Number 1",
                "provider": "twilio"
            }
        )
        
        # API returns 200 for successful purchase (not 201)
        assert response1.status_code in [200, 201], f"First purchase should succeed: {response1.text}"
        first_number_id = response1.json().get("id")
        print(f"✓ Agent purchased number (at limit)")
        
        # Try to purchase another number (should fail - limit exceeded)
        test_number2 = f"+1555{datetime.now().strftime('%H%M%S')}2"
        response2 = self.session.post(
            f"{BASE_URL}/api/phone-numbers/purchase",
            headers={"Authorization": f"Bearer {agent_token}"},
            json={
                "phone_number": test_number2,
                "friendly_name": "Test Limit Number 2",
                "provider": "twilio"
            }
        )
        
        assert response2.status_code == 403, f"Second purchase should fail (limit reached): {response2.text}"
        print(f"✓ Agent correctly blocked when monthly limit reached")
        
        # Clean up
        if first_number_id:
            self.session.delete(
                f"{BASE_URL}/api/phone-numbers/{first_number_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
        
        # Reset org settings
        self.session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {org_admin_token}"},
            json={"allow_rep_purchases": True, "rep_monthly_number_limit": 0}
        )
        print(f"✓ Cleaned up and reset org settings")


class TestCleanupOrgSettings:
    """Ensure org settings are restored after all tests"""
    
    def test_restore_org_settings(self):
        """Restore Acme Funding Corp settings to clean state"""
        session = requests.Session()
        session.headers.update({"Content-Type": "application/json"})
        
        # Login as org admin
        response = session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        token = response.json().get("token")
        
        # Restore settings
        update_response = session.put(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"},
            json={
                "allow_rep_purchases": True,
                "rep_monthly_number_limit": 0
            }
        )
        
        assert update_response.status_code == 200, f"Failed to restore org settings: {update_response.text}"
        
        # Verify
        get_response = session.get(
            f"{BASE_URL}/api/organizations/{ACME_ORG_ID}",
            params={"authorization": f"Bearer {token}"}
        )
        data = get_response.json()
        
        assert data.get("allow_rep_purchases") == True, f"allow_rep_purchases should be True: {data}"
        assert data.get("rep_monthly_number_limit") == 0, f"rep_monthly_number_limit should be 0: {data}"
        
        print(f"✓ Org settings restored: allow_rep_purchases=True, rep_monthly_number_limit=0")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
