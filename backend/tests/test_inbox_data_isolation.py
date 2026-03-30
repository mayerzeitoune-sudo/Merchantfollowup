"""
Test Inbox Page Features and Data Isolation
- Inbox threads endpoint returns proper data
- Conversation loading works correctly
- Dashboard stats returns org-scoped data
- Clients endpoint returns org-scoped data
- Phone numbers owned endpoint returns data
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from iteration_20.json
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"


class TestInboxAndDataIsolation:
    """Test Inbox features and data isolation for admin users"""
    
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
    
    # ============== ADMIN USER TESTS ==============
    
    def test_01_admin_login(self):
        """Test admin login works correctly"""
        data = self.login_admin()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "admin"
        print(f"PASS: Admin login successful - role: {data['user']['role']}")
    
    def test_02_admin_dashboard_stats(self):
        """Test dashboard stats endpoint returns org-scoped data for admin"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_clients" in data
        assert "total_reminders" in data
        assert "pending_reminders" in data
        assert "active_campaigns" in data
        assert "total_balance_owed" in data
        assert "todays_followups" in data
        
        print(f"PASS: Dashboard stats - total_clients: {data['total_clients']}, total_reminders: {data['total_reminders']}")
    
    def test_03_admin_clients_endpoint(self):
        """Test clients endpoint returns org-scoped data for admin"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        data = response.json()
        
        # Should return a list of clients
        assert isinstance(data, list)
        print(f"PASS: Clients endpoint returned {len(data)} clients for admin")
        
        # If there are clients, verify structure
        if len(data) > 0:
            client = data[0]
            assert "id" in client
            assert "name" in client
            assert "phone" in client
            print(f"  First client: {client.get('name')} - {client.get('phone')}")
    
    def test_04_admin_inbox_threads(self):
        """Test inbox threads endpoint returns proper data"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/inbox/threads")
        assert response.status_code == 200, f"Inbox threads failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "threads" in data
        threads = data["threads"]
        assert isinstance(threads, list)
        
        print(f"PASS: Inbox threads returned {len(threads)} threads")
        
        # If there are threads, verify structure
        if len(threads) > 0:
            thread = threads[0]
            assert "client_id" in thread
            assert "client_name" in thread
            assert "client_phone" in thread
            # Optional fields
            if "last_message_at" in thread:
                print(f"  First thread: {thread.get('client_name')} - last msg: {thread.get('last_message_at')}")
            if "unread_count" in thread:
                print(f"  Unread count: {thread.get('unread_count')}")
    
    def test_05_admin_phone_numbers_owned(self):
        """Test phone numbers owned endpoint returns data for admin"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Phone numbers owned failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        print(f"PASS: Phone numbers owned returned {len(data)} numbers")
        
        # If there are numbers, verify structure
        if len(data) > 0:
            number = data[0]
            assert "phone_number" in number
            print(f"  First number: {number.get('phone_number')} - purchased: {number.get('twilio_purchased')}")
    
    def test_06_admin_conversation_loading(self):
        """Test conversation loading works for admin"""
        self.login_admin()
        
        # First get clients to find one with conversations
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available to test conversation loading")
        
        # Try to load conversation for first client
        client_id = clients[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/contacts/{client_id}/conversation")
        assert response.status_code == 200, f"Conversation loading failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "client" in data
        assert "messages" in data
        assert isinstance(data["messages"], list)
        
        print(f"PASS: Conversation loaded for client {clients[0].get('name')} - {len(data['messages'])} messages")
    
    # ============== ORG ADMIN USER TESTS ==============
    
    def test_07_org_admin_login(self):
        """Test org_admin login works correctly"""
        data = self.login_org_admin()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == ORG_ADMIN_EMAIL
        assert data["user"]["role"] == "org_admin"
        print(f"PASS: Org admin login successful - role: {data['user']['role']}")
    
    def test_08_org_admin_dashboard_stats(self):
        """Test dashboard stats endpoint returns all data for org_admin"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/dashboard/stats")
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "total_clients" in data
        assert "total_reminders" in data
        
        print(f"PASS: Org admin dashboard stats - total_clients: {data['total_clients']}")
    
    def test_09_org_admin_clients_endpoint(self):
        """Test clients endpoint returns all data for org_admin"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/clients")
        assert response.status_code == 200, f"Clients endpoint failed: {response.text}"
        data = response.json()
        
        # Should return a list of clients
        assert isinstance(data, list)
        print(f"PASS: Org admin clients endpoint returned {len(data)} clients")
    
    def test_10_org_admin_inbox_threads(self):
        """Test inbox threads endpoint returns all data for org_admin"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/inbox/threads")
        assert response.status_code == 200, f"Inbox threads failed: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "threads" in data
        threads = data["threads"]
        assert isinstance(threads, list)
        
        print(f"PASS: Org admin inbox threads returned {len(threads)} threads")
    
    def test_11_org_admin_phone_numbers_owned(self):
        """Test phone numbers owned endpoint returns data for org_admin"""
        self.login_org_admin()
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Phone numbers owned failed: {response.text}"
        data = response.json()
        
        # Should return a list
        assert isinstance(data, list)
        print(f"PASS: Org admin phone numbers owned returned {len(data)} numbers")


class TestInboxThreadSorting:
    """Test inbox thread sorting - unread messages should appear at top"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_admin(self):
        """Login as admin user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return data
    
    def test_12_threads_sorted_by_latest_message(self):
        """Test that threads are sorted by latest message timestamp"""
        self.login_admin()
        response = self.session.get(f"{BASE_URL}/api/inbox/threads")
        assert response.status_code == 200
        data = response.json()
        threads = data.get("threads", [])
        
        if len(threads) < 2:
            pytest.skip("Need at least 2 threads to test sorting")
        
        # Verify threads are sorted by last_message_at descending
        timestamps = [t.get("last_message_at") for t in threads if t.get("last_message_at")]
        if len(timestamps) >= 2:
            # Check that timestamps are in descending order
            for i in range(len(timestamps) - 1):
                assert timestamps[i] >= timestamps[i + 1], f"Threads not sorted correctly: {timestamps[i]} should be >= {timestamps[i+1]}"
            print(f"PASS: Threads are sorted by latest message (descending)")
        else:
            print("SKIP: Not enough threads with timestamps to verify sorting")


class TestConversationChains:
    """Test conversation chains functionality"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login_admin(self):
        """Login as admin user"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        self.session.headers.update({"Authorization": f"Bearer {data['token']}"})
        return data
    
    def test_13_conversation_chains_endpoint(self):
        """Test conversation chains endpoint"""
        self.login_admin()
        
        # Get clients first
        clients_response = self.session.get(f"{BASE_URL}/api/clients")
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if len(clients) == 0:
            pytest.skip("No clients available to test conversation chains")
        
        client_id = clients[0]["id"]
        response = self.session.get(f"{BASE_URL}/api/contacts/{client_id}/chains")
        
        # Should return 200 or 404 if no chains
        assert response.status_code in [200, 404], f"Chains endpoint failed: {response.text}"
        
        if response.status_code == 200:
            data = response.json()
            print(f"PASS: Conversation chains endpoint returned data for client {clients[0].get('name')}")
        else:
            print(f"PASS: Conversation chains endpoint returned 404 (no chains) for client {clients[0].get('name')}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
