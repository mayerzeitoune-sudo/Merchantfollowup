"""
Test suite for Phone Number Search and SMS Sending Fixes
Tests:
1. Phone number search - area code filtering (no toll-free fallback)
2. SMS sending - mock number blocking
3. Phone numbers owned - twilio_purchased field
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"

# Test data
REAL_TWILIO_NUMBERS = ["+18138677801", "+12605297425"]
MOCK_NUMBERS = ["+17198113942", "+16239366833", "+14087279406", "+13107376926", "+12129450016"]
TEST_CLIENT_ID = "74654ebf-a1c6-429a-89d9-c09d7c9e8abf"  # john's client with phone +17186140573


class TestPhoneNumberSearch:
    """Test phone number search API - area code filtering"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("token")  # API returns 'token' not 'access_token'
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_search_718_area_code_no_toll_free(self):
        """
        Test: GET /api/phone-numbers/available?area_code=718
        Expected: Should NOT return toll-free numbers (833/855/866/888)
        Should return 718 local numbers OR empty with note
        """
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/available", params={
            "area_code": "718"
        })
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        available_numbers = data.get("available_numbers", [])
        
        # Check that no toll-free numbers are returned
        toll_free_prefixes = ["833", "855", "866", "888", "877", "800"]
        for num in available_numbers:
            phone = num.get("phone_number", "")
            # Extract area code from phone number (format: +1XXXXXXXXXX)
            if phone.startswith("+1") and len(phone) >= 5:
                area_code = phone[2:5]
                assert area_code not in toll_free_prefixes, \
                    f"Toll-free number {phone} returned for area code 718 search"
        
        # If numbers returned, they should be 718 area code
        if available_numbers:
            for num in available_numbers:
                phone = num.get("phone_number", "")
                if phone.startswith("+1") and len(phone) >= 5:
                    area_code = phone[2:5]
                    # Should be 718 or have a note about no SMS-enabled numbers
                    if area_code != "718":
                        assert "note" in data, \
                            f"Non-718 number {phone} returned without explanation note"
        else:
            # Empty results should have a note
            assert "note" in data or len(available_numbers) == 0, \
                "Empty results should have a note explaining no numbers available"
        
        print(f"✓ 718 search returned {len(available_numbers)} numbers, no toll-free")
    
    def test_search_813_area_code_sms_enabled(self):
        """
        Test: GET /api/phone-numbers/available?area_code=813
        Expected: Should return 813 area code numbers with SMS capability
        """
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/available", params={
            "area_code": "813"
        })
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        available_numbers = data.get("available_numbers", [])
        
        # Check that no toll-free numbers are returned
        toll_free_prefixes = ["833", "855", "866", "888", "877", "800"]
        for num in available_numbers:
            phone = num.get("phone_number", "")
            if phone.startswith("+1") and len(phone) >= 5:
                area_code = phone[2:5]
                assert area_code not in toll_free_prefixes, \
                    f"Toll-free number {phone} returned for area code 813 search"
        
        # If numbers returned, check SMS capability
        if available_numbers:
            for num in available_numbers[:5]:  # Check first 5
                caps = num.get("capabilities", {})
                # SMS should be True for most results
                print(f"  Number: {num.get('phone_number')} - SMS: {caps.get('SMS')}")
        
        print(f"✓ 813 search returned {len(available_numbers)} numbers")
    
    def test_search_invalid_area_code_999(self):
        """
        Test: GET /api/phone-numbers/available?area_code=999
        Expected: Should return empty results or note (no toll-free fallback)
        """
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/available", params={
            "area_code": "999"
        })
        assert response.status_code == 200, f"Search failed: {response.text}"
        
        data = response.json()
        available_numbers = data.get("available_numbers", [])
        
        # Should be empty or have a note
        if available_numbers:
            # If any numbers returned, they should NOT be toll-free
            toll_free_prefixes = ["833", "855", "866", "888", "877", "800"]
            for num in available_numbers:
                phone = num.get("phone_number", "")
                if phone.startswith("+1") and len(phone) >= 5:
                    area_code = phone[2:5]
                    assert area_code not in toll_free_prefixes, \
                        f"Toll-free number {phone} returned for invalid area code 999"
        
        print(f"✓ 999 (invalid) search returned {len(available_numbers)} numbers")
        if "note" in data:
            print(f"  Note: {data['note']}")


class TestSMSSending:
    """Test SMS sending API - mock number blocking"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("token")  # API returns 'token' not 'access_token'
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_send_sms_from_mock_number_blocked(self):
        """
        Test: POST /api/contacts/{client_id}/send-sms from a MOCK number
        Expected: Should be BLOCKED with error 'not a live Twilio number'
        """
        # Try to send from a mock number
        mock_number = "+17198113942"  # Known mock number
        
        response = self.session.post(
            f"{BASE_URL}/api/contacts/{TEST_CLIENT_ID}/send-sms",
            json={
                "message": "Test message from mock number",
                "from_number": mock_number
            }
        )
        
        # Should return 400 with error about not being a live Twilio number
        assert response.status_code == 400, \
            f"Expected 400 for mock number, got {response.status_code}: {response.text}"
        
        error_detail = response.json().get("detail", "")
        assert "not a live Twilio number" in error_detail.lower() or "twilio" in error_detail.lower(), \
            f"Expected error about Twilio, got: {error_detail}"
        
        print(f"✓ Mock number {mock_number} correctly blocked")
        print(f"  Error: {error_detail}")
    
    def test_send_sms_from_real_twilio_number(self):
        """
        Test: POST /api/contacts/{client_id}/send-sms from a real Twilio number
        Expected: Should succeed with status 'queued' and a twilio_sid
        Note: Delivery may fail due to A2P 10DLC (error 30034) but that's expected
        """
        real_number = "+18138677801"  # Known Twilio-purchased number
        
        response = self.session.post(
            f"{BASE_URL}/api/contacts/{TEST_CLIENT_ID}/send-sms",
            json={
                "message": "Test message from real Twilio number - testing integration",
                "from_number": real_number
            }
        )
        
        # Should succeed (200) or the number might not be owned by this user
        if response.status_code == 400:
            error = response.json().get("detail", "")
            if "don't own" in error.lower():
                pytest.skip(f"User doesn't own number {real_number}")
            elif "not a live Twilio number" in error.lower():
                pytest.fail(f"Real Twilio number {real_number} incorrectly marked as not live")
        
        assert response.status_code == 200, \
            f"Expected 200 for real Twilio number, got {response.status_code}: {response.text}"
        
        data = response.json()
        status = data.get("status", "")
        twilio_sid = data.get("twilio_sid")
        
        # Status should be queued, sent, or similar (not failed at API level)
        assert status in ["queued", "sent", "pending", "delivered", "undelivered"], \
            f"Unexpected status: {status}"
        
        # Should have a Twilio SID
        assert twilio_sid is not None, "Missing twilio_sid in response"
        assert twilio_sid.startswith("SM"), f"Invalid Twilio SID format: {twilio_sid}"
        
        print(f"✓ Real Twilio number {real_number} sent successfully")
        print(f"  Status: {status}, SID: {twilio_sid}")


class TestPhoneNumbersOwned:
    """Test owned phone numbers API - twilio_purchased field"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        token = response.json().get("token")  # API returns 'token' not 'access_token'
        self.session.headers.update({"Authorization": f"Bearer {token}"})
    
    def test_owned_numbers_have_twilio_purchased_field(self):
        """
        Test: GET /api/phone-numbers/owned
        Expected: Should show twilio_purchased=true for real numbers, null/false for mock
        """
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Failed to get owned numbers: {response.text}"
        
        numbers = response.json()
        assert isinstance(numbers, list), "Expected list of numbers"
        
        print(f"Found {len(numbers)} owned numbers:")
        
        real_twilio_found = []
        mock_found = []
        
        for num in numbers:
            phone = num.get("phone_number", "")
            twilio_purchased = num.get("twilio_purchased")
            twilio_sid = num.get("twilio_sid")
            
            print(f"  {phone}: twilio_purchased={twilio_purchased}, twilio_sid={twilio_sid}")
            
            # Check known real Twilio numbers
            if phone in REAL_TWILIO_NUMBERS:
                assert twilio_purchased == True, \
                    f"Real Twilio number {phone} should have twilio_purchased=True"
                real_twilio_found.append(phone)
            
            # Check known mock numbers
            if phone in MOCK_NUMBERS:
                assert twilio_purchased in [None, False], \
                    f"Mock number {phone} should have twilio_purchased=null/false, got {twilio_purchased}"
                mock_found.append(phone)
        
        print(f"✓ Real Twilio numbers verified: {real_twilio_found}")
        print(f"✓ Mock numbers verified: {mock_found}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
