"""
Test Stripe Config Migration Feature
Tests the migration of Stripe API keys from .env to MongoDB.
Covers: POST/GET /api/admin/stripe-config, platform/status stripe field,
and payments endpoints using DB-stored keys.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration_23.json
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"
REGULAR_ADMIN_EMAIL = "john@acmefunding.com"
REGULAR_ADMIN_PASSWORD = "Password123!"


class TestStripeConfigAuth:
    """Test authentication and authorization for Stripe config endpoints"""
    
    @pytest.fixture(scope="class")
    def org_admin_token(self):
        """Get org_admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def regular_admin_token(self):
        """Get regular admin token (not org_admin)"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Regular admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_get_stripe_config_requires_auth(self):
        """GET /api/admin/stripe-config should require authentication"""
        response = requests.get(f"{BASE_URL}/api/admin/stripe-config")
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_post_stripe_config_requires_auth(self):
        """POST /api/admin/stripe-config should require authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/stripe-config", json={
            "secret_key": "sk_test_fake"
        })
        assert response.status_code in [401, 403], f"Expected 401/403, got {response.status_code}"
    
    def test_get_stripe_config_rejects_non_org_admin(self, regular_admin_token):
        """GET /api/admin/stripe-config should reject non-org_admin users"""
        headers = {"Authorization": f"Bearer {regular_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stripe-config", headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-org_admin, got {response.status_code}"
        data = response.json()
        assert "admin" in data.get("detail", "").lower() or "global" in data.get("detail", "").lower()
    
    def test_post_stripe_config_rejects_non_org_admin(self, regular_admin_token):
        """POST /api/admin/stripe-config should reject non-org_admin users"""
        headers = {"Authorization": f"Bearer {regular_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/stripe-config", json={
            "secret_key": "sk_test_fake"
        }, headers=headers)
        assert response.status_code == 403, f"Expected 403 for non-org_admin, got {response.status_code}"


class TestStripeConfigCRUD:
    """Test Stripe config CRUD operations for org_admin"""
    
    @pytest.fixture(scope="class")
    def org_admin_token(self):
        """Get org_admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_get_stripe_config_org_admin_success(self, org_admin_token):
        """GET /api/admin/stripe-config should work for org_admin"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stripe-config", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        # Should return configured status
        assert "configured" in data, f"Response missing 'configured' field: {data}"
        # If configured, should have source and key_prefix
        if data.get("configured"):
            assert data.get("source") == "database", f"Expected source=database, got {data.get('source')}"
            assert "key_prefix" in data, f"Missing key_prefix in response: {data}"
    
    def test_post_stripe_config_requires_secret_key(self, org_admin_token):
        """POST /api/admin/stripe-config should require secret_key"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/stripe-config", json={
            "publishable_key": "pk_test_fake"
        }, headers=headers)
        assert response.status_code == 400, f"Expected 400 for missing secret_key, got {response.status_code}"
        data = response.json()
        assert "secret" in data.get("detail", "").lower() or "required" in data.get("detail", "").lower()
    
    def test_post_stripe_config_validates_key(self, org_admin_token):
        """POST /api/admin/stripe-config should validate the Stripe key"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/admin/stripe-config", json={
            "secret_key": "sk_test_invalid_key_12345"
        }, headers=headers)
        # Should fail validation with invalid key
        assert response.status_code == 400, f"Expected 400 for invalid key, got {response.status_code}"
        data = response.json()
        assert "invalid" in data.get("detail", "").lower() or "authentication" in data.get("detail", "").lower()


class TestPlatformStatusStripe:
    """Test platform/status endpoint returns Stripe status correctly"""
    
    @pytest.fixture(scope="class")
    def org_admin_token(self):
        """Get org_admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        return response.json().get("token")
    
    @pytest.fixture(scope="class")
    def regular_admin_token(self):
        """Get regular admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": REGULAR_ADMIN_EMAIL,
            "password": REGULAR_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Regular admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_platform_status_org_admin_sees_stripe(self, org_admin_token):
        """GET /api/platform/status should return stripe status for org_admin"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/platform/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # org_admin should see stripe field
        assert "stripe" in data, f"org_admin should see stripe field: {data}"
        assert "connected" in data["stripe"], f"stripe should have connected field: {data['stripe']}"
        # Based on context, Stripe keys are already saved in MongoDB
        assert data["stripe"]["connected"] == True, f"Expected stripe.connected=True since keys are in DB: {data}"
    
    def test_platform_status_non_org_admin_no_stripe(self, regular_admin_token):
        """GET /api/platform/status should NOT return stripe status for non-org_admin"""
        headers = {"Authorization": f"Bearer {regular_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/platform/status", headers=headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        # Non-org_admin should NOT see stripe field
        assert "stripe" not in data, f"Non-org_admin should NOT see stripe field: {data}"
        # But should still see twilio
        assert "twilio" in data, f"Should still see twilio field: {data}"


class TestPaymentsUseDBKeys:
    """Test that payments endpoints use DB-stored Stripe keys"""
    
    @pytest.fixture(scope="class")
    def org_admin_token(self):
        """Get org_admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_checkout_endpoint_works_with_db_keys(self, org_admin_token):
        """POST /api/payments/checkout should work using DB-stored keys"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.post(f"{BASE_URL}/api/payments/checkout", json={
            "package_id": "starter",
            "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
        }, headers=headers)
        # Should either succeed (200) or fail with a Stripe-related error (not "not configured")
        if response.status_code == 200:
            data = response.json()
            assert "url" in data, f"Checkout response should have url: {data}"
            assert "session_id" in data, f"Checkout response should have session_id: {data}"
            print(f"Checkout session created successfully: {data.get('session_id')}")
        else:
            # If it fails, it should NOT be because Stripe is not configured
            data = response.json()
            detail = data.get("detail", "")
            assert "not configured" not in detail.lower(), f"Stripe should be configured from DB: {detail}"
            # Other errors (like restricted key permissions) are acceptable
            print(f"Checkout failed with: {detail} (status: {response.status_code})")
    
    def test_checkout_status_endpoint_exists(self, org_admin_token):
        """GET /api/payments/checkout/status/{session_id} endpoint should exist"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        # Use a fake session ID - should return 404 or similar, not 500
        response = requests.get(f"{BASE_URL}/api/payments/checkout/status/cs_test_fake_session", headers=headers)
        # Should return 404 (not found) or 502 (Stripe error), not 500 (not configured)
        assert response.status_code in [404, 502], f"Expected 404/502, got {response.status_code}: {response.text}"


class TestStripeConfigDataPersistence:
    """Test that Stripe config is properly persisted in MongoDB"""
    
    @pytest.fixture(scope="class")
    def org_admin_token(self):
        """Get org_admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        return response.json().get("token")
    
    def test_stripe_config_shows_database_source(self, org_admin_token):
        """GET /api/admin/stripe-config should show source=database when configured"""
        headers = {"Authorization": f"Bearer {org_admin_token}"}
        response = requests.get(f"{BASE_URL}/api/admin/stripe-config", headers=headers)
        assert response.status_code == 200
        data = response.json()
        if data.get("configured"):
            assert data.get("source") == "database", f"Expected source=database: {data}"
            assert "updated_at" in data, f"Should have updated_at timestamp: {data}"
            print(f"Stripe config from DB - key_prefix: {data.get('key_prefix')}, updated_at: {data.get('updated_at')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
