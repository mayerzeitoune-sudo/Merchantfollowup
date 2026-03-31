"""
Test STRICT Data Isolation for Merchant CRM (Updated Requirements)
- org_admin should ONLY see their own personal data (not all system data)
- admin (john@acmefunding.com) should see only their org's data
- admin from org A cannot access clients from org B
- Duplicate phone number purchase prevention
- Agents should only see their own assigned data
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

# Known client IDs for testing
ORG_ADMIN_MAYER_CLIENT_ID = "e797c27f-1e30-412d-8d2f-46f66755d265"  # Mayer owned by org_admin
JOHN_MAYER_CLIENT_ID = "74654ebf-a1c6-429a-89d9-c09d7c9e8abf"  # Mayer owned by John

# Known phone number that org_admin owns
ORG_ADMIN_PHONE_NUMBER = "+15206833288"


class TestOrgAdminStrictIsolation:
    """Test that org_admin ONLY sees their own personal data (not all system data)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_org_admin(self):
        """Login as org_admin user (orgadmin@merchant.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return data
    
    def login_admin(self):
        """Login as admin user (john@acmefunding.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return data
    
    # ============== TEST 1: org_admin /api/clients - should ONLY return their own clients ==============
    
    def test_01_org_admin_clients_only_own_data(self):
        """org_admin should ONLY see their own clients, NOT all clients system-wide"""
        login_data = self.login_org_admin()
        org_admin_user_id = login_data["user"]["id"]
        
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        clients = response.json()
        
        # All clients should belong to org_admin (user_id matches)
        for client in clients:
            assert client.get("user_id") == org_admin_user_id, \
                f"FAIL: org_admin sees client {client['id']} owned by user {client.get('user_id')} - should only see own clients!"
        
        # org_admin should NOT see John's Mayer client
        client_ids = [c["id"] for c in clients]
        assert JOHN_MAYER_CLIENT_ID not in client_ids, \
            f"FAIL: org_admin can see John's Mayer client (74654ebf) - strict isolation broken!"
        
        # org_admin SHOULD see their own Mayer client
        assert ORG_ADMIN_MAYER_CLIENT_ID in client_ids, \
            f"FAIL: org_admin cannot see their own Mayer client (e797c27f)"
        
        print(f"PASS: org_admin sees ONLY their own clients ({len(clients)} clients)")
        print(f"  Client IDs: {client_ids[:5]}...")
    
    # ============== TEST 2: org_admin /api/phone-numbers/owned - should ONLY return their own numbers ==============
    
    def test_02_org_admin_phone_numbers_only_own_data(self):
        """org_admin should ONLY see numbers assigned/owned by them, NOT all numbers"""
        login_data = self.login_org_admin()
        org_admin_user_id = login_data["user"]["id"]
        
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Phone numbers owned failed: {response.text}"
        numbers = response.json()
        
        # All numbers should be assigned to or owned by org_admin
        for num in numbers:
            is_assigned = num.get("assigned_user_id") == org_admin_user_id
            is_owned = num.get("user_id") == org_admin_user_id
            assert is_assigned or is_owned, \
                f"FAIL: org_admin sees number {num['phone_number']} not assigned/owned by them - strict isolation broken!"
        
        # org_admin SHOULD see their own phone number
        phone_numbers = [n["phone_number"] for n in numbers]
        assert ORG_ADMIN_PHONE_NUMBER in phone_numbers, \
            f"FAIL: org_admin cannot see their own phone number {ORG_ADMIN_PHONE_NUMBER}"
        
        print(f"PASS: org_admin sees ONLY their own phone numbers ({len(numbers)} numbers)")
        print(f"  Numbers: {phone_numbers}")
    
    # ============== TEST 3: org_admin /api/inbox/threads - should ONLY show their own conversations ==============
    
    def test_03_org_admin_inbox_threads_only_own_data(self):
        """org_admin should ONLY see threads for their own conversations"""
        self.login_org_admin()
        
        response = self.session.get(f"{BASE_URL}/api/inbox/threads")
        assert response.status_code == 200, f"Inbox threads failed: {response.text}"
        data = response.json()
        
        threads = data.get("threads", [])
        thread_client_ids = [t["client_id"] for t in threads]
        
        # org_admin should NOT see John's Mayer in their inbox
        assert JOHN_MAYER_CLIENT_ID not in thread_client_ids, \
            f"FAIL: org_admin's inbox contains John's Mayer client - strict isolation broken!"
        
        print(f"PASS: org_admin's inbox threads are strictly isolated ({len(threads)} threads)")
        print(f"  Thread client IDs: {thread_client_ids[:5]}...")


class TestAdminOrgIsolation:
    """Test that admin (john@acmefunding.com) sees only their org's data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_admin(self):
        """Login as admin user (john@acmefunding.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return data
    
    # ============== TEST 4: admin cannot see org_admin's clients ==============
    
    def test_04_admin_cannot_see_org_admin_clients(self):
        """John (admin) should NOT see org_admin's clients"""
        self.login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        clients = response.json()
        
        client_ids = [c["id"] for c in clients]
        
        # John should NOT see org_admin's Mayer
        assert ORG_ADMIN_MAYER_CLIENT_ID not in client_ids, \
            f"FAIL: John can see org_admin's Mayer client (e797c27f) - cross-org data leakage!"
        
        # John SHOULD see his own Mayer
        assert JOHN_MAYER_CLIENT_ID in client_ids, \
            f"FAIL: John cannot see his own Mayer client (74654ebf)"
        
        print(f"PASS: John cannot see org_admin's clients ({len(clients)} clients visible)")
    
    # ============== TEST 5: admin cannot see org_admin's phone numbers ==============
    
    def test_05_admin_cannot_see_org_admin_phone_numbers(self):
        """John (admin) should NOT see org_admin's phone numbers"""
        self.login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Phone numbers owned failed: {response.text}"
        numbers = response.json()
        
        phone_numbers = [n["phone_number"] for n in numbers]
        
        # John should NOT see org_admin's phone number
        assert ORG_ADMIN_PHONE_NUMBER not in phone_numbers, \
            f"FAIL: John can see org_admin's phone number {ORG_ADMIN_PHONE_NUMBER} - cross-org data leakage!"
        
        print(f"PASS: John cannot see org_admin's phone numbers ({len(numbers)} numbers visible)")
        print(f"  Numbers: {phone_numbers}")
    
    # ============== TEST 6: admin cannot access org_admin's client conversation ==============
    
    def test_06_admin_cannot_access_org_admin_client_conversation(self):
        """John should get 404 when trying to access org_admin's client conversation"""
        self.login_admin()
        
        response = self.session.get(f"{BASE_URL}/api/contacts/{ORG_ADMIN_MAYER_CLIENT_ID}/conversation")
        
        assert response.status_code == 404, \
            f"FAIL: John can access org_admin's Mayer conversation - expected 404, got {response.status_code}"
        
        print(f"PASS: John gets 404 when accessing org_admin's client conversation")


class TestDuplicatePhoneNumberPrevention:
    """Test duplicate phone number purchase prevention"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_admin(self):
        """Login as admin user (john@acmefunding.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return data
    
    # ============== TEST 7: Duplicate phone number purchase returns 409 ==============
    
    def test_07_duplicate_phone_number_purchase_blocked(self):
        """POST /api/phone-numbers/purchase should return 409 if number already exists with twilio_purchased=true"""
        self.login_admin()
        
        # First, get an existing Twilio-purchased number
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        numbers = response.json()
        
        # Find a Twilio-purchased number
        twilio_numbers = [n for n in numbers if n.get("twilio_purchased")]
        if not twilio_numbers:
            # Try org_admin's number which should be Twilio-purchased
            existing_number = ORG_ADMIN_PHONE_NUMBER
        else:
            existing_number = twilio_numbers[0]["phone_number"]
        
        # Try to purchase the same number again
        response = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json={
            "phone_number": existing_number,
            "provider": "twilio"
        })
        
        assert response.status_code == 409, \
            f"FAIL: Expected 409 for duplicate purchase, got {response.status_code}: {response.text}"
        
        # Verify error message mentions the number is already owned
        error_detail = response.json().get("detail", "")
        assert "already owned" in error_detail.lower() or "already" in error_detail.lower(), \
            f"FAIL: Error message should mention number is already owned: {error_detail}"
        
        print(f"PASS: Duplicate phone number purchase blocked with 409 for {existing_number}")


class TestCompareDataCounts:
    """Compare data counts between org_admin and admin to verify strict isolation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_08_org_admin_sees_fewer_or_equal_clients_than_before(self):
        """org_admin should now see ONLY their own clients (fewer than all system clients)"""
        # Login as org_admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        org_admin_data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {org_admin_data['token']}"})
        
        org_admin_clients = self.session.get(f"{BASE_URL}/api/clients").json()
        org_admin_count = len(org_admin_clients)
        
        # Login as admin (John)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.session.headers.update({"Authorization": f"Bearer {response.json()['token']}"})
        
        admin_clients = self.session.get(f"{BASE_URL}/api/clients").json()
        admin_count = len(admin_clients)
        
        print(f"org_admin sees: {org_admin_count} clients (should be ONLY their own)")
        print(f"John (admin) sees: {admin_count} clients (org-scoped)")
        
        # Verify org_admin only sees their own clients
        org_admin_user_id = org_admin_data["user"]["id"]
        for client in org_admin_clients:
            assert client.get("user_id") == org_admin_user_id, \
                f"FAIL: org_admin sees client not owned by them: {client['id']}"
        
        print(f"PASS: org_admin strictly isolated - sees only {org_admin_count} own clients")
    
    def test_09_org_admin_sees_fewer_or_equal_phone_numbers_than_before(self):
        """org_admin should now see ONLY their own phone numbers"""
        # Login as org_admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        org_admin_data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {org_admin_data['token']}"})
        
        org_admin_numbers = self.session.get(f"{BASE_URL}/api/phone-numbers/owned").json()
        org_admin_count = len(org_admin_numbers)
        
        # Login as admin (John)
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.session.headers.update({"Authorization": f"Bearer {response.json()['token']}"})
        
        admin_numbers = self.session.get(f"{BASE_URL}/api/phone-numbers/owned").json()
        admin_count = len(admin_numbers)
        
        print(f"org_admin sees: {org_admin_count} phone numbers (should be ONLY their own)")
        print(f"John (admin) sees: {admin_count} phone numbers (org-scoped)")
        
        # Verify org_admin only sees their own numbers
        org_admin_user_id = org_admin_data["user"]["id"]
        for num in org_admin_numbers:
            is_assigned = num.get("assigned_user_id") == org_admin_user_id
            is_owned = num.get("user_id") == org_admin_user_id
            assert is_assigned or is_owned, \
                f"FAIL: org_admin sees number not assigned/owned by them: {num['phone_number']}"
        
        print(f"PASS: org_admin strictly isolated - sees only {org_admin_count} own phone numbers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
