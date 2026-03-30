"""
Content Moderation and Platform Status API Tests
Tests for:
- Banned words CRUD (org_admin only for write, all users for read)
- Blacklisted numbers CRUD (org_admin only for write, all users for read)
- SMS blocking with banned words
- SMS blocking to blacklisted numbers
- Platform status endpoint (Twilio/Stripe connection status)
- Phone numbers available endpoint (503 if Twilio not configured)
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"

# Test data
TEST_CLIENT_ID = "74654ebf-a1c6-429a-89d9-c09d7c9e8abf"  # John's test client
EXISTING_BANNED_WORD = "guaranteed approval"
EXISTING_BLACKLISTED_NUMBER = "+15551234567"


class TestAuth:
    """Helper class for authentication"""
    
    @staticmethod
    def login(email: str, password: str) -> dict:
        """Login and return token and user_id"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            data = response.json()
            return {
                "token": data.get("token"),  # API returns 'token' not 'access_token'
                "user_id": data.get("user", {}).get("id")
            }
        print(f"Login failed for {email}: {response.status_code} - {response.text}")
        return None


@pytest.fixture(scope="module")
def org_admin_auth():
    """Get org_admin authentication"""
    auth = TestAuth.login(ORG_ADMIN_EMAIL, ORG_ADMIN_PASSWORD)
    if not auth:
        pytest.skip("Could not authenticate as org_admin")
    return auth


@pytest.fixture(scope="module")
def admin_auth():
    """Get regular admin authentication"""
    auth = TestAuth.login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not auth:
        pytest.skip("Could not authenticate as admin")
    return auth


@pytest.fixture
def org_admin_headers(org_admin_auth):
    """Headers for org_admin requests"""
    return {"Authorization": f"Bearer {org_admin_auth['token']}"}


@pytest.fixture
def admin_headers(admin_auth):
    """Headers for regular admin requests"""
    return {"Authorization": f"Bearer {admin_auth['token']}"}


class TestBannedWords:
    """Tests for banned words CRUD operations"""
    
    def test_get_banned_words_any_user(self, admin_headers):
        """Test 4: GET /api/moderation/banned-words returns all banned words for any authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/moderation/banned-words",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check that existing banned word is present
        words = [entry["word"] for entry in data]
        assert EXISTING_BANNED_WORD in words, f"Expected '{EXISTING_BANNED_WORD}' in banned words list"
        print(f"✓ GET banned-words returned {len(data)} words including '{EXISTING_BANNED_WORD}'")
    
    def test_add_banned_word_org_admin_only(self, org_admin_headers):
        """Test 1: POST /api/moderation/banned-words adds a banned word (org_admin only)"""
        test_word = "TEST_BANNED_WORD_12345"
        
        response = requests.post(
            f"{BASE_URL}/api/moderation/banned-words",
            headers=org_admin_headers,
            json={"word": test_word, "reason": "Test reason"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["word"] == test_word.lower(), f"Expected word '{test_word.lower()}', got '{data.get('word')}'"
        assert "id" in data, "Response should contain 'id'"
        
        # Cleanup - delete the test word
        word_id = data["id"]
        cleanup = requests.delete(
            f"{BASE_URL}/api/moderation/banned-words/{word_id}",
            headers=org_admin_headers
        )
        assert cleanup.status_code == 200, f"Cleanup failed: {cleanup.text}"
        print(f"✓ org_admin successfully added and removed banned word '{test_word}'")
    
    def test_add_banned_word_regular_admin_rejected(self, admin_headers):
        """Test 2: POST /api/moderation/banned-words rejects regular admin with 403"""
        response = requests.post(
            f"{BASE_URL}/api/moderation/banned-words",
            headers=admin_headers,
            json={"word": "should_not_be_added", "reason": "Test"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Regular admin correctly rejected with 403 when trying to add banned word")
    
    def test_delete_banned_word_org_admin_only(self, org_admin_headers):
        """Test 3: DELETE /api/moderation/banned-words/{id} removes word (org_admin only)"""
        # First add a word to delete
        test_word = "TEST_DELETE_WORD_67890"
        add_response = requests.post(
            f"{BASE_URL}/api/moderation/banned-words",
            headers=org_admin_headers,
            json={"word": test_word, "reason": "To be deleted"}
        )
        assert add_response.status_code == 200, f"Failed to add test word: {add_response.text}"
        word_id = add_response.json()["id"]
        
        # Now delete it
        delete_response = requests.delete(
            f"{BASE_URL}/api/moderation/banned-words/{word_id}",
            headers=org_admin_headers
        )
        assert delete_response.status_code == 200, f"Expected 200, got {delete_response.status_code}: {delete_response.text}"
        
        # Verify it's gone
        get_response = requests.get(
            f"{BASE_URL}/api/moderation/banned-words",
            headers=org_admin_headers
        )
        words = [entry["word"] for entry in get_response.json()]
        assert test_word.lower() not in words, f"Word '{test_word}' should have been deleted"
        print(f"✓ org_admin successfully deleted banned word '{test_word}'")


class TestBlacklistedNumbers:
    """Tests for blacklisted phone numbers CRUD operations"""
    
    def test_get_blacklisted_numbers_any_user(self, admin_headers):
        """GET /api/moderation/blacklisted-numbers returns all blacklisted numbers for any authenticated user"""
        response = requests.get(
            f"{BASE_URL}/api/moderation/blacklisted-numbers",
            headers=admin_headers
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check that existing blacklisted number is present
        numbers = [entry["phone_number"] for entry in data]
        assert EXISTING_BLACKLISTED_NUMBER in numbers, f"Expected '{EXISTING_BLACKLISTED_NUMBER}' in blacklisted numbers"
        print(f"✓ GET blacklisted-numbers returned {len(data)} numbers including '{EXISTING_BLACKLISTED_NUMBER}'")
    
    def test_add_blacklisted_number_org_admin_only(self, org_admin_headers):
        """Test 5: POST /api/moderation/blacklisted-numbers adds a blacklisted number (org_admin only)"""
        test_number = "+19995551234"
        
        response = requests.post(
            f"{BASE_URL}/api/moderation/blacklisted-numbers",
            headers=org_admin_headers,
            json={"phone_number": test_number, "reason": "Test blacklist"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "id" in data, "Response should contain 'id'"
        assert data["phone_number"] == test_number, f"Expected '{test_number}', got '{data.get('phone_number')}'"
        
        # Cleanup
        number_id = data["id"]
        cleanup = requests.delete(
            f"{BASE_URL}/api/moderation/blacklisted-numbers/{number_id}",
            headers=org_admin_headers
        )
        assert cleanup.status_code == 200, f"Cleanup failed: {cleanup.text}"
        print(f"✓ org_admin successfully added and removed blacklisted number '{test_number}'")
    
    def test_add_blacklisted_number_regular_admin_rejected(self, admin_headers):
        """POST /api/moderation/blacklisted-numbers rejects regular admin with 403"""
        response = requests.post(
            f"{BASE_URL}/api/moderation/blacklisted-numbers",
            headers=admin_headers,
            json={"phone_number": "+19998887777", "reason": "Test"}
        )
        assert response.status_code == 403, f"Expected 403, got {response.status_code}: {response.text}"
        print("✓ Regular admin correctly rejected with 403 when trying to add blacklisted number")


class TestSMSModeration:
    """Tests for SMS content moderation enforcement"""
    
    def test_send_sms_with_banned_word_blocked(self, admin_headers, admin_auth):
        """Test 6: Sending SMS with banned word returns 400 error with specific message"""
        # Use the existing banned word "guaranteed approval"
        message_with_banned_word = f"Hello! We offer {EXISTING_BANNED_WORD} for your loan application."
        
        response = requests.post(
            f"{BASE_URL}/api/contacts/{TEST_CLIENT_ID}/send-sms",
            headers=admin_headers,
            json={"message": message_with_banned_word}
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", "")
        assert "blocked" in detail.lower() or "prohibited" in detail.lower(), \
            f"Expected error message about blocked/prohibited word, got: {detail}"
        assert EXISTING_BANNED_WORD in detail.lower(), \
            f"Expected banned word '{EXISTING_BANNED_WORD}' in error message, got: {detail}"
        print(f"✓ SMS with banned word '{EXISTING_BANNED_WORD}' correctly blocked with 400")
    
    def test_send_sms_to_blacklisted_number_blocked(self, admin_headers, admin_auth):
        """Test 7: Sending SMS to blacklisted number returns 400 error"""
        # Use the /api/sms/send endpoint with the blacklisted number
        response = requests.post(
            f"{BASE_URL}/api/sms/send",
            headers=admin_headers,
            params={"user_id": admin_auth["user_id"]},
            json={
                "to": EXISTING_BLACKLISTED_NUMBER,
                "message": "Test message to blacklisted number",
                "client_id": "test"
            }
        )
        
        assert response.status_code == 400, f"Expected 400, got {response.status_code}: {response.text}"
        
        data = response.json()
        detail = data.get("detail", "")
        assert "blacklist" in detail.lower() or "cannot send" in detail.lower(), \
            f"Expected error about blacklisted number, got: {detail}"
        print(f"✓ SMS to blacklisted number '{EXISTING_BLACKLISTED_NUMBER}' correctly blocked with 400")


class TestPlatformStatus:
    """Tests for platform status endpoint"""
    
    def test_platform_status_returns_twilio_stripe_connected(self, admin_headers):
        """Test 8: GET /api/platform/status returns twilio connected=true and stripe connected=true"""
        response = requests.get(
            f"{BASE_URL}/api/platform/status",
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        
        # Check Twilio status
        assert "twilio" in data, "Response should contain 'twilio' key"
        assert data["twilio"]["connected"] == True, f"Expected twilio.connected=true, got {data['twilio']}"
        
        # Check Stripe status
        assert "stripe" in data, "Response should contain 'stripe' key"
        assert data["stripe"]["connected"] == True, f"Expected stripe.connected=true, got {data['stripe']}"
        
        print(f"✓ Platform status: Twilio connected={data['twilio']['connected']}, Stripe connected={data['stripe']['connected']}")


class TestPhoneNumbersAvailable:
    """Tests for phone numbers available endpoint"""
    
    def test_phone_numbers_available_returns_real_numbers(self, admin_headers):
        """Test 11: GET /api/phone-numbers/available returns real Twilio numbers (not fake placeholders)"""
        response = requests.get(
            f"{BASE_URL}/api/phone-numbers/available",
            headers=admin_headers,
            params={"area_code": "415", "country": "US", "limit": 5}
        )
        
        # Should return 200 with real numbers since Twilio is configured
        # OR 503 if Twilio is not configured (which is also valid per requirements)
        assert response.status_code in [200, 503], f"Expected 200 or 503, got {response.status_code}: {response.text}"
        
        if response.status_code == 503:
            data = response.json()
            assert "not configured" in data.get("detail", "").lower(), \
                f"Expected 'not configured' message, got: {data}"
            print("✓ Phone numbers endpoint returns 503 when Twilio not configured (no fake numbers)")
        else:
            data = response.json()
            # Response can be a list or an object with 'available_numbers' key
            if isinstance(data, dict):
                numbers = data.get("available_numbers", [])
            else:
                numbers = data
            
            assert isinstance(numbers, list), "Response should contain a list of phone numbers"
            if len(numbers) > 0:
                # Verify structure of returned numbers
                first_number = numbers[0]
                assert "phone_number" in first_number, "Each number should have 'phone_number' field"
                # Verify it's a real phone number format (starts with +1)
                assert first_number["phone_number"].startswith("+1"), \
                    f"Phone number should start with +1, got: {first_number['phone_number']}"
            print(f"✓ Phone numbers endpoint returned {len(numbers)} real Twilio numbers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
