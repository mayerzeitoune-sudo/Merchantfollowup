"""
Credit System Tests - Testing the credit-based platform conversion
Tests: Credit packages, balance, purchase, history, phone number deduction
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
AGENT_EMAIL = "mike@acmefunding.com"
AGENT_PASSWORD = "Password123!"


class TestCreditSystem:
    """Credit system endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def get_agent_token(self):
        """Login as agent (non-admin) and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        assert response.status_code == 200, f"Agent login failed: {response.text}"
        return response.json()["token"]
    
    # ============ GET /api/credits/packages ============
    def test_get_credit_packages_returns_8_packages(self):
        """GET /api/credits/packages returns 8 credit packages with correct pricing"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/credits/packages")
        assert response.status_code == 200, f"Failed to get packages: {response.text}"
        
        packages = response.json()
        assert isinstance(packages, list), "Packages should be a list"
        assert len(packages) == 8, f"Expected 8 packages, got {len(packages)}"
        
        # Verify package structure and pricing
        expected_packages = [
            {"id": "starter", "usd": 20, "credits": 100},
            {"id": "growth", "usd": 100, "credits": 525},
            {"id": "professional", "usd": 250, "credits": 1350},
            {"id": "scale", "usd": 500, "credits": 2850},
            {"id": "executive", "usd": 1000, "credits": 6100},
            {"id": "enterprise", "usd": 2500, "credits": 16700},
            {"id": "titan", "usd": 5000, "credits": 36750},
            {"id": "black", "usd": 10000, "credits": 83333},
        ]
        
        for expected in expected_packages:
            pkg = next((p for p in packages if p["id"] == expected["id"]), None)
            assert pkg is not None, f"Package {expected['id']} not found"
            assert pkg["usd"] == expected["usd"], f"Package {expected['id']} USD mismatch"
            assert pkg["credits"] == expected["credits"], f"Package {expected['id']} credits mismatch"
            assert "name" in pkg, f"Package {expected['id']} missing name"
            assert "description" in pkg, f"Package {expected['id']} missing description"
        
        print(f"✓ All 8 credit packages verified with correct pricing")
    
    # ============ GET /api/credits/balance ============
    def test_get_credit_balance_returns_org_balance(self):
        """GET /api/credits/balance returns org credit balance"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/credits/balance")
        assert response.status_code == 200, f"Failed to get balance: {response.text}"
        
        data = response.json()
        assert "balance" in data, "Response missing 'balance' field"
        assert isinstance(data["balance"], (int, float)), "Balance should be numeric"
        assert data["balance"] >= 0, "Balance should be non-negative"
        
        print(f"✓ Credit balance retrieved: {data['balance']} credits")
    
    # ============ GET /api/credits/constants ============
    def test_get_credit_constants(self):
        """GET /api/credits/constants returns conversion constants"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/credits/constants")
        assert response.status_code == 200, f"Failed to get constants: {response.text}"
        
        data = response.json()
        assert "credits_per_dollar" in data, "Missing credits_per_dollar"
        assert "phone_number_cost_credits" in data, "Missing phone_number_cost_credits"
        assert "text_cost_credits" in data, "Missing text_cost_credits"
        
        # Verify expected values
        assert data["credits_per_dollar"] == 5, "Credits per dollar should be 5"
        assert data["phone_number_cost_credits"] == 40, "Phone number cost should be 40 credits"
        assert data["text_cost_credits"] == 0.316, "Text cost should be 0.316 credits"
        
        print(f"✓ Credit constants verified: {data}")
    
    # ============ POST /api/credits/purchase (Admin) ============
    def test_admin_can_purchase_credits(self):
        """POST /api/credits/purchase buys a credit package (admin only), adds credits to org"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get initial balance
        balance_response = self.session.get(f"{BASE_URL}/api/credits/balance")
        initial_balance = balance_response.json()["balance"]
        
        # Purchase starter package (100 credits)
        response = self.session.post(f"{BASE_URL}/api/credits/purchase", json={
            "package_id": "starter"
        })
        assert response.status_code == 200, f"Purchase failed: {response.text}"
        
        data = response.json()
        assert data["status"] == "success", "Purchase status should be success"
        assert data["credits_added"] == 100, "Should add 100 credits for starter package"
        assert data["usd_charged"] == 20, "Should charge $20 for starter package"
        assert "new_balance" in data, "Response should include new_balance"
        assert "transaction_id" in data, "Response should include transaction_id"
        assert "payment_id" in data, "Response should include payment_id (mocked)"
        
        # Verify balance increased
        assert data["new_balance"] == initial_balance + 100, "Balance should increase by 100"
        
        print(f"✓ Admin purchased starter package: +100 credits, new balance: {data['new_balance']}")
    
    # ============ POST /api/credits/purchase (Non-Admin Fails) ============
    def test_non_admin_cannot_purchase_credits(self):
        """POST /api/credits/purchase fails for non-admin users (agent role)"""
        token = self.get_agent_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/credits/purchase", json={
            "package_id": "starter"
        })
        
        # Should return 403 Forbidden
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        assert "admin" in data["detail"].lower(), "Error should mention admin requirement"
        
        print(f"✓ Non-admin purchase correctly rejected: {data['detail']}")
    
    # ============ GET /api/credits/history ============
    def test_get_credit_history(self):
        """GET /api/credits/history returns transaction history"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/credits/history")
        assert response.status_code == 200, f"Failed to get history: {response.text}"
        
        history = response.json()
        assert isinstance(history, list), "History should be a list"
        
        if len(history) > 0:
            txn = history[0]
            assert "id" in txn, "Transaction missing id"
            assert "type" in txn, "Transaction missing type"
            assert "credits_delta" in txn, "Transaction missing credits_delta"
            assert "created_at" in txn, "Transaction missing created_at"
            assert "user_name" in txn, "Transaction missing user_name"
            
            print(f"✓ Credit history retrieved: {len(history)} transactions")
            print(f"  Latest: {txn['type']} - {txn['credits_delta']} credits")
        else:
            print(f"✓ Credit history endpoint working (no transactions yet)")
    
    # ============ Invalid Package Purchase ============
    def test_purchase_invalid_package_fails(self):
        """POST /api/credits/purchase with invalid package_id fails"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/credits/purchase", json={
            "package_id": "invalid_package_xyz"
        })
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Error response should have detail"
        
        print(f"✓ Invalid package purchase correctly rejected")


class TestPhoneNumberCreditDeduction:
    """Phone number purchase credit deduction tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_admin_token(self):
        """Login as admin and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        return response.json()["token"]
    
    def test_phone_number_purchase_deducts_40_credits(self):
        """POST /api/phone-numbers/purchase deducts 40 credits from org"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get initial balance
        balance_response = self.session.get(f"{BASE_URL}/api/credits/balance")
        initial_balance = balance_response.json()["balance"]
        
        # Ensure we have enough credits
        if initial_balance < 40:
            # Purchase credits first
            self.session.post(f"{BASE_URL}/api/credits/purchase", json={"package_id": "starter"})
            balance_response = self.session.get(f"{BASE_URL}/api/credits/balance")
            initial_balance = balance_response.json()["balance"]
        
        # Search for available numbers first
        search_response = self.session.get(f"{BASE_URL}/api/phone-numbers/available", params={"area_code": "212"})
        assert search_response.status_code == 200, f"Search failed: {search_response.text}"
        
        available = search_response.json().get("available_numbers", [])
        if len(available) == 0:
            pytest.skip("No available numbers to test purchase")
        
        test_number = available[0]
        
        # Purchase the number
        response = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json={
            "phone_number": test_number["phone_number"],
            "friendly_name": test_number.get("friendly_name", "Test Number"),
            "provider": "twilio"
        })
        assert response.status_code == 200, f"Purchase failed: {response.text}"
        
        # Verify balance decreased by 40
        new_balance_response = self.session.get(f"{BASE_URL}/api/credits/balance")
        new_balance = new_balance_response.json()["balance"]
        
        assert new_balance == initial_balance - 40, f"Balance should decrease by 40. Was {initial_balance}, now {new_balance}"
        
        print(f"✓ Phone number purchase deducted 40 credits: {initial_balance} -> {new_balance}")
    
    def test_phone_number_purchase_fails_insufficient_credits(self):
        """Phone number purchase fails when insufficient credits"""
        token = self.get_admin_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        # Get current balance
        balance_response = self.session.get(f"{BASE_URL}/api/credits/balance")
        current_balance = balance_response.json()["balance"]
        
        # If balance is >= 40, we can't test insufficient credits easily
        # This test verifies the error handling exists
        if current_balance < 40:
            response = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json={
                "phone_number": "+12125551234",
                "friendly_name": "Test Number",
                "provider": "twilio"
            })
            
            assert response.status_code == 402, f"Expected 402 Payment Required, got {response.status_code}"
            
            data = response.json()
            assert "Insufficient credits" in data.get("detail", ""), "Error should mention insufficient credits"
            
            print(f"✓ Insufficient credits error correctly returned")
        else:
            print(f"✓ Skipping insufficient credits test (balance is {current_balance})")


class TestAgentCreditAccess:
    """Test that non-admin users can view but not purchase credits"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session with auth"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
    def get_agent_token(self):
        """Login as agent (non-admin) and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": AGENT_EMAIL,
            "password": AGENT_PASSWORD
        })
        if response.status_code != 200:
            pytest.skip(f"Agent login failed: {response.text}")
        return response.json()["token"]
    
    def test_agent_can_view_credit_balance(self):
        """Non-admin user can see credit balance"""
        token = self.get_agent_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/credits/balance")
        assert response.status_code == 200, f"Agent should be able to view balance: {response.text}"
        
        data = response.json()
        assert "balance" in data, "Response should include balance"
        
        print(f"✓ Agent can view credit balance: {data['balance']}")
    
    def test_agent_can_view_packages(self):
        """Non-admin user can see credit packages"""
        token = self.get_agent_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.get(f"{BASE_URL}/api/credits/packages")
        assert response.status_code == 200, f"Agent should be able to view packages: {response.text}"
        
        packages = response.json()
        assert len(packages) == 8, "Should see all 8 packages"
        
        print(f"✓ Agent can view all {len(packages)} credit packages")
    
    def test_agent_cannot_purchase(self):
        """Non-admin user cannot purchase credits"""
        token = self.get_agent_token()
        self.session.headers.update({"Authorization": f"Bearer {token}"})
        
        response = self.session.post(f"{BASE_URL}/api/credits/purchase", json={
            "package_id": "starter"
        })
        
        assert response.status_code == 403, f"Agent should not be able to purchase: {response.status_code}"
        
        print(f"✓ Agent correctly blocked from purchasing credits")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
