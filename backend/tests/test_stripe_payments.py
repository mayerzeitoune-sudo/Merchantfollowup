"""
Stripe Payments Integration Tests
Tests for POST /api/payments/checkout, GET /api/payments/checkout/status/{session_id},
POST /api/webhook/stripe, and payment_transactions collection.
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def org_admin_token():
    """Get org_admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORG_ADMIN_EMAIL,
        "password": ORG_ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Org admin login failed: {response.text}"
    return response.json()["token"]


@pytest.fixture(scope="module")
def non_admin_token():
    """Create a non-admin user and get token"""
    import uuid
    test_email = f"test_agent_{uuid.uuid4().hex[:8]}@test.com"
    
    # Register a new user (will be agent role by default)
    reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
        "email": test_email,
        "password": "TestPass123!",
        "name": "Test Agent"
    })
    
    if reg_response.status_code != 200:
        pytest.skip("Could not create test agent user")
    
    # Verify the user
    otp = reg_response.json().get("otp")
    if otp:
        requests.post(f"{BASE_URL}/api/auth/verify", json={
            "email": test_email,
            "otp": otp
        })
    
    # Login
    login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": test_email,
        "password": "TestPass123!"
    })
    
    if login_response.status_code != 200:
        pytest.skip("Could not login as test agent")
    
    return login_response.json()["token"]


class TestPaymentsCheckout:
    """Tests for POST /api/payments/checkout endpoint"""
    
    def test_checkout_creates_valid_stripe_session(self, admin_token):
        """Test 1: POST /api/payments/checkout creates Stripe checkout session with valid URL and session_id"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "starter",
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Verify response structure
        assert "url" in data, "Response should contain 'url'"
        assert "session_id" in data, "Response should contain 'session_id'"
        
        # Verify Stripe checkout URL format
        assert data["url"].startswith("https://checkout.stripe.com"), \
            f"URL should start with 'https://checkout.stripe.com', got: {data['url']}"
        
        # Verify session_id is not empty
        assert len(data["session_id"]) > 0, "session_id should not be empty"
        
        print(f"✓ Checkout created successfully: session_id={data['session_id'][:20]}...")
        
        # Store session_id for later tests
        return data["session_id"]
    
    def test_checkout_rejects_invalid_package_id(self, admin_token):
        """Test 2: POST /api/payments/checkout rejects invalid package_id with 400"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "invalid_package_xyz",
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 400, f"Expected 400 for invalid package, got {response.status_code}"
        
        data = response.json()
        assert "detail" in data, "Error response should contain 'detail'"
        assert "invalid" in data["detail"].lower() or "package" in data["detail"].lower(), \
            f"Error message should mention invalid package: {data['detail']}"
        
        print(f"✓ Invalid package_id correctly rejected with 400: {data['detail']}")
    
    def test_checkout_rejects_non_admin_users(self, non_admin_token):
        """Test 3: POST /api/payments/checkout rejects non-admin users with 403"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "starter",
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {non_admin_token}"}
        )
        
        assert response.status_code == 403, f"Expected 403 for non-admin, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "detail" in data, "Error response should contain 'detail'"
        
        print(f"✓ Non-admin user correctly rejected with 403: {data['detail']}")
    
    def test_checkout_requires_authentication(self):
        """Test: POST /api/payments/checkout requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "starter",
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            }
        )
        
        assert response.status_code in [401, 403], f"Expected 401/403 without auth, got {response.status_code}"
        print(f"✓ Unauthenticated request correctly rejected with {response.status_code}")


class TestCheckoutStatus:
    """Tests for GET /api/payments/checkout/status/{session_id} endpoint"""
    
    def test_status_returns_valid_response_for_session(self, admin_token):
        """Test 4: GET /api/payments/checkout/status/{session_id} returns status for valid session"""
        # First create a checkout session
        checkout_response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "growth",
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert checkout_response.status_code == 200, f"Checkout creation failed: {checkout_response.text}"
        session_id = checkout_response.json()["session_id"]
        
        # Now check the status
        status_response = requests.get(
            f"{BASE_URL}/api/payments/checkout/status/{session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert status_response.status_code == 200, f"Expected 200, got {status_response.status_code}: {status_response.text}"
        
        data = status_response.json()
        
        # Verify response structure
        assert "status" in data, "Response should contain 'status'"
        assert "payment_status" in data, "Response should contain 'payment_status'"
        assert "session_id" in data, "Response should contain 'session_id'"
        
        # For unpaid sessions, status should be 'open' and payment_status should be 'unpaid'
        assert data["status"] in ["open", "complete", "expired"], \
            f"Status should be open/complete/expired, got: {data['status']}"
        assert data["payment_status"] in ["unpaid", "paid", "no_payment_required"], \
            f"Payment status should be unpaid/paid/no_payment_required, got: {data['payment_status']}"
        
        # Verify package details are included
        assert "amount_usd" in data, "Response should contain 'amount_usd'"
        assert "credits" in data, "Response should contain 'credits'"
        assert "package_name" in data, "Response should contain 'package_name'"
        
        print(f"✓ Status check successful: status={data['status']}, payment_status={data['payment_status']}")
        print(f"  Package: {data['package_name']}, Credits: {data['credits']}, Amount: ${data['amount_usd']}")
    
    def test_status_returns_error_for_invalid_session(self, admin_token):
        """Test 5: GET /api/payments/checkout/status/{invalid_id} returns appropriate error"""
        invalid_session_id = "cs_test_invalid_session_id_12345"
        
        status_response = requests.get(
            f"{BASE_URL}/api/payments/checkout/status/{invalid_session_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        # Should return 404 (transaction not found) or 502 (Stripe error)
        assert status_response.status_code in [404, 502], \
            f"Expected 404 or 502 for invalid session, got {status_response.status_code}: {status_response.text}"
        
        print(f"✓ Invalid session_id correctly returns error: {status_response.status_code}")


class TestPaymentTransactions:
    """Tests for payment_transactions collection"""
    
    def test_transaction_record_created_after_checkout(self, admin_token):
        """Test 6: payment_transactions collection has correct record after checkout creation"""
        # Create a checkout session
        checkout_response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": "professional",
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert checkout_response.status_code == 200, f"Checkout creation failed: {checkout_response.text}"
        session_id = checkout_response.json()["session_id"]
        
        # Check payment history to verify transaction was recorded
        history_response = requests.get(
            f"{BASE_URL}/api/payments/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert history_response.status_code == 200, f"History fetch failed: {history_response.text}"
        
        transactions = history_response.json()
        
        # Find our transaction
        our_txn = None
        for txn in transactions:
            if txn.get("session_id") == session_id:
                our_txn = txn
                break
        
        assert our_txn is not None, f"Transaction with session_id {session_id} not found in history"
        
        # Verify transaction fields
        assert our_txn.get("package_id") == "professional", \
            f"Expected package_id 'professional', got: {our_txn.get('package_id')}"
        assert our_txn.get("package_name") == "Professional", \
            f"Expected package_name 'Professional', got: {our_txn.get('package_name')}"
        assert our_txn.get("amount_usd") == 250.00, \
            f"Expected amount_usd 250.00, got: {our_txn.get('amount_usd')}"
        assert our_txn.get("credits") == 1350, \
            f"Expected credits 1350, got: {our_txn.get('credits')}"
        assert our_txn.get("payment_status") == "initiated", \
            f"Expected payment_status 'initiated', got: {our_txn.get('payment_status')}"
        assert our_txn.get("status") == "pending", \
            f"Expected status 'pending', got: {our_txn.get('status')}"
        
        print(f"✓ Transaction record verified:")
        print(f"  session_id: {session_id[:20]}...")
        print(f"  package: {our_txn['package_name']} ({our_txn['credits']} credits)")
        print(f"  amount: ${our_txn['amount_usd']}")
        print(f"  status: {our_txn['status']}, payment_status: {our_txn['payment_status']}")


class TestStripeWebhook:
    """Tests for POST /api/webhook/stripe endpoint"""
    
    def test_webhook_endpoint_exists_and_returns_200(self):
        """Test 7: POST /api/webhook/stripe endpoint exists and returns 200"""
        # Send a minimal request to the webhook endpoint
        # Note: We're not testing actual Stripe signature validation, just that the endpoint exists
        response = requests.post(
            f"{BASE_URL}/api/webhook/stripe",
            data=b"{}",  # Empty JSON body
            headers={"Content-Type": "application/json"}
        )
        
        # The endpoint should return 200 even for invalid/empty payloads
        # (it handles errors gracefully and returns {"status": "error"} or {"status": "ok"})
        assert response.status_code == 200, \
            f"Expected 200 from webhook endpoint, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "status" in data, "Webhook response should contain 'status'"
        
        print(f"✓ Webhook endpoint exists and returns 200: {data}")


class TestAllPackages:
    """Test checkout works for all 8 credit packages"""
    
    @pytest.mark.parametrize("package_id,expected_usd,expected_credits", [
        ("starter", 20.00, 100),
        ("growth", 100.00, 525),
        ("professional", 250.00, 1350),
        ("scale", 500.00, 2850),
        ("executive", 1000.00, 6100),
        ("enterprise", 2500.00, 16700),
        ("titan", 5000.00, 36750),
        ("black", 10000.00, 83333),
    ])
    def test_checkout_all_packages(self, admin_token, package_id, expected_usd, expected_credits):
        """Test checkout works for each package with correct amounts"""
        response = requests.post(
            f"{BASE_URL}/api/payments/checkout",
            json={
                "package_id": package_id,
                "origin_url": "https://merchant-crm-dev.preview.emergentagent.com"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert response.status_code == 200, f"Checkout failed for {package_id}: {response.text}"
        
        data = response.json()
        assert "url" in data and "session_id" in data
        
        # Verify the transaction was created with correct values
        history_response = requests.get(
            f"{BASE_URL}/api/payments/history",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        transactions = history_response.json()
        our_txn = next((t for t in transactions if t.get("session_id") == data["session_id"]), None)
        
        assert our_txn is not None, f"Transaction not found for {package_id}"
        assert our_txn.get("amount_usd") == expected_usd, \
            f"Expected ${expected_usd} for {package_id}, got ${our_txn.get('amount_usd')}"
        assert our_txn.get("credits") == expected_credits, \
            f"Expected {expected_credits} credits for {package_id}, got {our_txn.get('credits')}"
        
        print(f"✓ {package_id}: ${expected_usd} -> {expected_credits} credits")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
