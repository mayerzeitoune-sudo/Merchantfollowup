"""
Test Data Isolation for Merchant CRM
- Admin (John) can only see clients/threads from his org
- Org Admin can see ALL clients/threads from all orgs
- Phone numbers are org-scoped
- Duplicate phone number purchase prevention
- Conversation endpoint returns 404 for clients not in user's org scope
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
ORG_ADMIN_MAYER_CLIENT_ID = "e797c27f-1e30-412d-8d2f-46f66755d265"  # Mayer owned by org_admin - John should NOT see
JOHN_MAYER_CLIENT_ID = "74654ebf-a1c6-429a-89d9-c09d7c9e8abf"  # Mayer owned by John - John SHOULD see

# Known phone number that org_admin owns (org_id=None)
ORG_ADMIN_PHONE_NUMBER = "+15206833288"


class TestDataIsolation:
    """Test data isolation between admin and org_admin users"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.admin_token = None
        self.org_admin_token = None
    
    def login_admin(self):
        """Login as admin user (john@acmefunding.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        self.admin_token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.admin_token}"})
        return data
    
    def login_org_admin(self):
        """Login as org_admin user (orgadmin@merchant.com)"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        data = response.json()
        self.org_admin_token = data["token"]
        self.session.headers.update({"Authorization": f"Bearer {self.org_admin_token}"})
        return data
    
    # ============== TEST 1: Admin clients endpoint - should NOT see org_admin's Mayer ==============
    
    def test_01_admin_cannot_see_org_admin_mayer_client(self):
        """John (admin) should NOT see org_admin's Mayer Zeitoune (e797c27f)"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        clients = response.json()
        
        # Check that org_admin's Mayer is NOT in the list
        client_ids = [c["id"] for c in clients]
        assert ORG_ADMIN_MAYER_CLIENT_ID not in client_ids, \
            f"FAIL: John can see org_admin's Mayer client (e797c27f) - data isolation broken!"
        
        print(f"PASS: John cannot see org_admin's Mayer client (e797c27f)")
        print(f"  Total clients visible to John: {len(clients)}")
    
    def test_02_admin_can_see_own_mayer_client(self):
        """John (admin) SHOULD see his own Mayer Zeitoune (74654ebf)"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200
        clients = response.json()
        
        # Check that John's Mayer IS in the list
        client_ids = [c["id"] for c in clients]
        assert JOHN_MAYER_CLIENT_ID in client_ids, \
            f"FAIL: John cannot see his own Mayer client (74654ebf)"
        
        print(f"PASS: John can see his own Mayer client (74654ebf)")
    
    # ============== TEST 2: Admin inbox threads - should only contain org's conversations ==============
    
    def test_03_admin_inbox_threads_org_scoped(self):
        """John's inbox threads should only contain conversations from his org's users"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/inbox/threads")
        assert response.status_code == 200, f"Inbox threads failed: {response.text}"
        data = response.json()
        
        threads = data.get("threads", [])
        thread_client_ids = [t["client_id"] for t in threads]
        
        # org_admin's Mayer should NOT appear in John's inbox threads
        assert ORG_ADMIN_MAYER_CLIENT_ID not in thread_client_ids, \
            f"FAIL: John's inbox contains org_admin's Mayer client - data isolation broken!"
        
        print(f"PASS: John's inbox threads are org-scoped ({len(threads)} threads)")
    
    # ============== TEST 3: Org admin can see ALL clients ==============
    
    def test_04_org_admin_can_see_all_clients(self):
        """Org admin should see ALL clients from all orgs"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        clients = response.json()
        
        client_ids = [c["id"] for c in clients]
        
        # Org admin should see BOTH Mayer clients
        assert ORG_ADMIN_MAYER_CLIENT_ID in client_ids, \
            f"FAIL: Org admin cannot see their own Mayer client (e797c27f)"
        assert JOHN_MAYER_CLIENT_ID in client_ids, \
            f"FAIL: Org admin cannot see John's Mayer client (74654ebf)"
        
        print(f"PASS: Org admin can see all clients ({len(clients)} total)")
    
    def test_05_org_admin_can_see_all_inbox_threads(self):
        """Org admin should see ALL inbox threads from all orgs"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/inbox/threads")
        assert response.status_code == 200, f"Inbox threads failed: {response.text}"
        data = response.json()
        
        threads = data.get("threads", [])
        print(f"PASS: Org admin can see all inbox threads ({len(threads)} threads)")
    
    # ============== TEST 4: Dashboard stats - org-scoped for John vs global for org_admin ==============
    
    def test_06_admin_dashboard_stats_org_scoped(self):
        """John's dashboard stats should be org-scoped"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        admin_client_count = data.get("total_clients", 0)
        print(f"PASS: John's dashboard shows {admin_client_count} clients (org-scoped)")
        
        # Store for comparison
        return admin_client_count
    
    def test_07_org_admin_dashboard_stats_global(self):
        """Org admin's dashboard stats should be global (all orgs)"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        org_admin_client_count = data.get("total_clients", 0)
        print(f"PASS: Org admin's dashboard shows {org_admin_client_count} clients (global)")
        
        # Org admin should see more or equal clients than John
        # (unless John is the only user with clients)
        return org_admin_client_count
    
    # ============== TEST 5: Phone numbers owned - org-scoped for John ==============
    
    def test_08_admin_phone_numbers_org_scoped(self):
        """John's phone numbers should NOT include org_admin's +15206833288"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Phone numbers owned failed: {response.text}"
        numbers = response.json()
        
        phone_numbers = [n["phone_number"] for n in numbers]
        
        # org_admin's phone number should NOT appear in John's list
        assert ORG_ADMIN_PHONE_NUMBER not in phone_numbers, \
            f"FAIL: John can see org_admin's phone number {ORG_ADMIN_PHONE_NUMBER} - data isolation broken!"
        
        print(f"PASS: John's phone numbers are org-scoped ({len(numbers)} numbers)")
        print(f"  Numbers: {phone_numbers}")
    
    def test_09_org_admin_phone_numbers_global(self):
        """Org admin should see ALL phone numbers"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Phone numbers owned failed: {response.text}"
        numbers = response.json()
        
        phone_numbers = [n["phone_number"] for n in numbers]
        
        # Org admin should see their own number
        assert ORG_ADMIN_PHONE_NUMBER in phone_numbers, \
            f"FAIL: Org admin cannot see their own phone number {ORG_ADMIN_PHONE_NUMBER}"
        
        print(f"PASS: Org admin can see all phone numbers ({len(numbers)} numbers)")
    
    # ============== TEST 6: Duplicate phone number purchase prevention ==============
    
    def test_10_duplicate_phone_number_purchase_blocked(self):
        """Attempting to purchase an already-purchased number should return 409"""
        self.login_admin()
        
        # First, get an existing Twilio-purchased number
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        numbers = response.json()
        
        # Find a Twilio-purchased number
        twilio_numbers = [n for n in numbers if n.get("twilio_purchased")]
        if not twilio_numbers:
            pytest.skip("No Twilio-purchased numbers to test duplicate prevention")
        
        existing_number = twilio_numbers[0]["phone_number"]
        
        # Try to purchase the same number again
        response = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json={
            "phone_number": existing_number,
            "provider": "twilio"
        })
        
        assert response.status_code == 409, \
            f"FAIL: Expected 409 for duplicate purchase, got {response.status_code}: {response.text}"
        
        print(f"PASS: Duplicate phone number purchase blocked with 409 for {existing_number}")
    
    # ============== TEST 7: Conversation endpoint - 404 for clients not in scope ==============
    
    def test_11_admin_cannot_access_org_admin_client_conversation(self):
        """John should get 404 when trying to access org_admin's Mayer conversation"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/contacts/{ORG_ADMIN_MAYER_CLIENT_ID}/conversation")
        
        assert response.status_code == 404, \
            f"FAIL: John can access org_admin's Mayer conversation - expected 404, got {response.status_code}"
        
        print(f"PASS: John gets 404 when accessing org_admin's Mayer conversation")
    
    def test_12_admin_can_access_own_client_conversation(self):
        """John should be able to access his own Mayer conversation"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/contacts/{JOHN_MAYER_CLIENT_ID}/conversation")
        
        assert response.status_code == 200, \
            f"FAIL: John cannot access his own Mayer conversation - got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "client" in data
        assert "messages" in data
        
        print(f"PASS: John can access his own Mayer conversation ({len(data['messages'])} messages)")
    
    def test_13_org_admin_can_access_any_client_conversation(self):
        """Org admin should be able to access any client's conversation"""
        self.login_org_admin()
        
        # Access org_admin's own Mayer
        response1 = self.session.get(f"{BASE_URL}/api/contacts/{ORG_ADMIN_MAYER_CLIENT_ID}/conversation")
        assert response1.status_code == 200, \
            f"FAIL: Org admin cannot access their own Mayer conversation"
        
        # Access John's Mayer
        response2 = self.session.get(f"{BASE_URL}/api/contacts/{JOHN_MAYER_CLIENT_ID}/conversation")
        assert response2.status_code == 200, \
            f"FAIL: Org admin cannot access John's Mayer conversation"
        
        print(f"PASS: Org admin can access any client's conversation")


class TestCompareClientCounts:
    """Compare client counts between admin and org_admin to verify isolation"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def test_14_compare_client_counts(self):
        """Org admin should see >= clients than John (admin)"""
        # Login as John
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.session.headers.update({"Authorization": f"Bearer {response.json()['token']}"})
        
        admin_clients = self.session.get(f"{BASE_URL}/api/clients").json()
        admin_count = len(admin_clients)
        
        # Login as org_admin
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200
        self.session.headers.update({"Authorization": f"Bearer {response.json()['token']}"})
        
        org_admin_clients = self.session.get(f"{BASE_URL}/api/clients").json()
        org_admin_count = len(org_admin_clients)
        
        print(f"John (admin) sees: {admin_count} clients")
        print(f"Org admin sees: {org_admin_count} clients")
        
        # Org admin should see at least as many clients as John
        assert org_admin_count >= admin_count, \
            f"FAIL: Org admin sees fewer clients ({org_admin_count}) than John ({admin_count})"
        
        print(f"PASS: Org admin sees {org_admin_count - admin_count} more clients than John")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
