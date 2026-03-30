"""
Twilio Integration Tests
Tests for:
- Phone number search (live Twilio API)
- Owned phone numbers retrieval
- SMS status endpoint
- Inbound/Status webhooks (form-encoded POST)
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")


@pytest.fixture
def auth_headers(admin_token):
    """Headers with auth token"""
    return {"Authorization": f"Bearer {admin_token}"}


class TestSMSStatus:
    """Test SMS configuration status endpoint"""
    
    def test_sms_status_returns_configured(self, auth_headers):
        """GET /api/sms/status should return configured: true when Twilio credentials are set"""
        response = requests.get(f"{BASE_URL}/api/sms/status", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "configured" in data, "Response should have 'configured' field"
        # Twilio credentials are configured in backend/.env
        assert data["configured"] == True, f"Expected configured=True, got {data}"
        print(f"SMS Status: {data}")


class TestPhoneNumberSearch:
    """Test live Twilio phone number search"""
    
    def test_search_available_numbers_with_area_code(self, auth_headers):
        """GET /api/phone-numbers/available?area_code=813&limit=3 should return SMS-capable numbers"""
        response = requests.get(
            f"{BASE_URL}/api/phone-numbers/available",
            params={"area_code": "813", "limit": 3},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "available_numbers" in data, "Response should have 'available_numbers' field"
        assert "provider_configured" in data, "Response should have 'provider_configured' field"
        
        # Verify Twilio is configured (not mock data)
        assert data["provider_configured"] == True, f"Expected provider_configured=True (live Twilio), got {data}"
        
        numbers = data["available_numbers"]
        print(f"Found {len(numbers)} available numbers for area code 813")
        
        # Verify at least one number returned
        assert len(numbers) > 0, "Should return at least one available number"
        
        # Verify each number has SMS capability
        for num in numbers:
            assert "phone_number" in num, "Number should have phone_number field"
            assert "capabilities" in num, "Number should have capabilities field"
            caps = num["capabilities"]
            # SMS should be True since we filter by sms_enabled=True
            assert caps.get("SMS") == True, f"Number {num['phone_number']} should have SMS=True, got {caps}"
            print(f"  {num['phone_number']} - SMS: {caps.get('SMS')}, Voice: {caps.get('voice')}")
    
    def test_search_available_numbers_different_area_code(self, auth_headers):
        """Test search with different area code (305 - Miami)"""
        response = requests.get(
            f"{BASE_URL}/api/phone-numbers/available",
            params={"area_code": "305", "limit": 2},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["provider_configured"] == True, "Should use live Twilio"
        
        numbers = data["available_numbers"]
        print(f"Found {len(numbers)} available numbers for area code 305")
        
        for num in numbers:
            caps = num.get("capabilities", {})
            assert caps.get("SMS") == True, f"Number should have SMS capability: {num}"


class TestOwnedPhoneNumbers:
    """Test owned phone numbers retrieval"""
    
    def test_get_owned_numbers(self, auth_headers):
        """GET /api/phone-numbers/owned should return user's owned phone numbers"""
        response = requests.get(f"{BASE_URL}/api/phone-numbers/owned", headers=auth_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        print(f"Found {len(data)} owned phone numbers")
        
        for num in data:
            assert "phone_number" in num, "Each number should have phone_number field"
            assert "id" in num, "Each number should have id field"
            print(f"  {num.get('phone_number')} - {num.get('friendly_name', 'No name')} - Twilio: {num.get('twilio_purchased')}")


class TestSMSWebhooks:
    """Test SMS webhooks (form-encoded POST as Twilio sends)"""
    
    def test_inbound_webhook_returns_twiml(self):
        """POST /api/sms/webhook/inbound with form data should return TwiML XML"""
        # Twilio sends form-encoded POST data
        form_data = {
            "From": "+15551234567",
            "To": "+18135551234",
            "Body": "Test inbound message",
            "MessageSid": "SM_TEST_123456",
            "AccountSid": "AC_TEST",
            "NumMedia": "0"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sms/webhook/inbound",
            data=form_data,  # form-encoded, not JSON
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Should return TwiML XML
        content_type = response.headers.get("content-type", "")
        assert "xml" in content_type.lower(), f"Expected XML content-type, got {content_type}"
        
        # Verify it's valid TwiML
        assert '<?xml version="1.0"' in response.text, f"Should return XML declaration: {response.text}"
        assert "<Response>" in response.text, f"Should contain TwiML Response element: {response.text}"
        
        print(f"Inbound webhook response: {response.text}")
    
    def test_inbound_webhook_empty_body(self):
        """POST /api/sms/webhook/inbound with empty body should return empty TwiML"""
        form_data = {
            "From": "+15551234567",
            "To": "+18135551234",
            "Body": "",  # Empty body
            "MessageSid": "SM_TEST_EMPTY",
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sms/webhook/inbound",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "<Response>" in response.text, "Should return TwiML even for empty body"
    
    def test_status_webhook_returns_twiml(self):
        """POST /api/sms/webhook/status with form data should return TwiML XML"""
        form_data = {
            "MessageSid": "SM_TEST_STATUS_123",
            "MessageStatus": "delivered",
            "To": "+15551234567",
            "From": "+18135551234",
            "ErrorCode": ""
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sms/webhook/status",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Should return TwiML XML
        content_type = response.headers.get("content-type", "")
        assert "xml" in content_type.lower(), f"Expected XML content-type, got {content_type}"
        
        assert '<?xml version="1.0"' in response.text, f"Should return XML: {response.text}"
        assert "<Response>" in response.text, f"Should contain TwiML Response: {response.text}"
        
        print(f"Status webhook response: {response.text}")
    
    def test_status_webhook_with_error_code(self):
        """POST /api/sms/webhook/status with error code should still return TwiML"""
        form_data = {
            "MessageSid": "SM_TEST_ERROR_123",
            "MessageStatus": "failed",
            "To": "+15551234567",
            "From": "+18135551234",
            "ErrorCode": "30003"  # Twilio error code
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sms/webhook/status",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert "<Response>" in response.text, "Should return TwiML even for error status"


class TestLegacyInboundEndpoint:
    """Test legacy /api/sms/inbound endpoint"""
    
    def test_legacy_inbound_returns_twiml(self):
        """POST /api/sms/inbound (legacy) should return TwiML XML"""
        form_data = {
            "From": "+15559876543",
            "To": "+18135559999",
            "Body": "Legacy endpoint test",
            "MessageSid": "SM_LEGACY_TEST_123"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/sms/inbound",
            data=form_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        content_type = response.headers.get("content-type", "")
        assert "xml" in content_type.lower(), f"Expected XML content-type, got {content_type}"
        
        assert "<Response>" in response.text, f"Should return TwiML: {response.text}"
        print(f"Legacy inbound response: {response.text}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
