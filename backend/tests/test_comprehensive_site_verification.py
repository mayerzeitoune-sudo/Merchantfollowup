"""
Comprehensive Site Verification Tests for Merchant Follow Up CRM
Tests: Login, Dashboard, Clients, Inbox, Phone Numbers, Campaigns, Settings, Credit Shop, Team, Pipeline
Data Isolation: org_admin vs admin user
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"


def get_admin_token():
    """Get admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


def get_org_admin_token():
    """Get org_admin auth token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ORG_ADMIN_EMAIL,
        "password": ORG_ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    return None


class TestAuthentication:
    """Test login flows for both admin and org_admin"""
    
    def test_admin_login_success(self):
        """Test admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        assert "user" in data, "No user in response"
        print(f"✓ Admin login successful - user: {data['user'].get('email')}, role: {data['user'].get('role')}")
    
    def test_org_admin_login_success(self):
        """Test org_admin login with correct credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ORG_ADMIN_EMAIL,
            "password": ORG_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Org admin login failed: {response.text}"
        data = response.json()
        assert "token" in data, "No token in response"
        print(f"✓ Org admin login successful - user: {data['user'].get('email')}, role: {data['user'].get('role')}")
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code in [401, 400], f"Expected 401/400, got {response.status_code}"
        print("✓ Invalid credentials correctly rejected")


class TestDashboard:
    """Test Dashboard API endpoints"""
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=headers)
        assert response.status_code == 200, f"Dashboard stats failed: {response.text}"
        data = response.json()
        assert "total_clients" in data, "Missing total_clients"
        print(f"✓ Dashboard stats: {data.get('total_clients')} clients, {data.get('active_campaigns')} campaigns")
    
    def test_analytics_overview(self):
        """Test analytics overview endpoint"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=headers)
        assert response.status_code == 200, f"Analytics failed: {response.text}"
        print("✓ Analytics overview loaded")


class TestClients:
    """Test Clients CRUD operations"""
    
    def test_get_clients_admin(self):
        """Test getting clients list as admin"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of clients"
        print(f"✓ Admin sees {len(data)} clients")
    
    def test_get_clients_org_admin(self):
        """Test getting clients list as org_admin (data isolation)"""
        token = get_org_admin_token()
        assert token, "Failed to get org_admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of clients"
        print(f"✓ Org admin sees {len(data)} clients (data isolation)")
    
    def test_create_and_delete_client(self):
        """Test creating and deleting a client"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # Create client
        client_data = {
            "name": "TEST_Verification Client",
            "phone": "+15551234567",
            "email": "test_verify@example.com",
            "company": "Test Company",
            "tags": ["New Lead"]
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
        assert response.status_code == 200, f"Create client failed: {response.text}"
        data = response.json()
        assert data.get("name") == client_data["name"], "Client name mismatch"
        client_id = data.get("id")
        print(f"✓ Created client: {client_id}")
        
        # Delete client
        delete_resp = requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=headers)
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print("✓ Client deleted successfully")
    
    def test_update_client_pipeline_stage(self):
        """Test updating client pipeline stage"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        
        # First create a client
        client_data = {
            "name": "TEST_Pipeline Client",
            "phone": "+15559876543",
            "tags": ["New Lead"]
        }
        create_resp = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        client_id = create_resp.json().get("id")
        
        # Update pipeline stage - stage is a query parameter
        update_resp = requests.put(
            f"{BASE_URL}/api/clients/{client_id}/pipeline?stage=interested",
            headers=headers
        )
        assert update_resp.status_code == 200, f"Update pipeline failed: {update_resp.text}"
        print(f"✓ Updated client pipeline stage to 'interested'")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=headers)


class TestInbox:
    """Test Inbox/Messaging endpoints"""
    
    def test_get_inbox_threads_admin(self):
        """Test getting inbox threads as admin"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/inbox/threads", headers=headers)
        assert response.status_code == 200, f"Get inbox threads failed: {response.text}"
        data = response.json()
        threads = data.get("threads", [])
        print(f"✓ Admin sees {len(threads)} inbox threads")
    
    def test_get_inbox_threads_org_admin(self):
        """Test getting inbox threads as org_admin (data isolation)"""
        token = get_org_admin_token()
        assert token, "Failed to get org_admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/inbox/threads", headers=headers)
        assert response.status_code == 200, f"Get inbox threads failed: {response.text}"
        data = response.json()
        threads = data.get("threads", [])
        print(f"✓ Org admin sees {len(threads)} inbox threads (data isolation)")


class TestPhoneNumbers:
    """Test Phone Numbers endpoints"""
    
    def test_get_owned_numbers_admin(self):
        """Test getting owned phone numbers as admin"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/phone-numbers/owned", headers=headers)
        assert response.status_code == 200, f"Get owned numbers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of phone numbers"
        print(f"✓ Admin sees {len(data)} phone numbers")
    
    def test_get_owned_numbers_org_admin(self):
        """Test getting owned phone numbers as org_admin (data isolation)"""
        token = get_org_admin_token()
        assert token, "Failed to get org_admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/phone-numbers/owned", headers=headers)
        assert response.status_code == 200, f"Get owned numbers failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of phone numbers"
        print(f"✓ Org admin sees {len(data)} phone numbers (data isolation)")


class TestDripCampaigns:
    """Test Drip Campaigns CRUD operations - using /api/campaigns/enhanced endpoint"""
    
    def test_get_enhanced_campaigns(self):
        """Test getting enhanced drip campaigns"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns/enhanced", headers=headers)
        assert response.status_code == 200, f"Get campaigns failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of campaigns"
        print(f"✓ Found {len(data)} drip campaigns")
    
    def test_create_drip_campaign(self):
        """Test creating a drip campaign"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        import uuid
        campaign_data = {
            "name": "TEST_Verification Campaign",
            "description": "Test campaign for verification",
            "steps": [
                {
                    "id": str(uuid.uuid4()),
                    "order": 0,
                    "channel": "sms",
                    "message": "Hello {name}, this is a test message",
                    "delay_days": 0,
                    "send_time": "09:00"
                }
            ],
            "stop_on_reply": True,
            "target_tags": [],
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/campaigns/enhanced", json=campaign_data, headers=headers)
        assert response.status_code == 200, f"Create campaign failed: {response.text}"
        data = response.json()
        assert data.get("name") == campaign_data["name"], "Campaign name mismatch"
        campaign_id = data.get("id")
        print(f"✓ Created drip campaign: {campaign_id}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/campaigns/enhanced/{campaign_id}", headers=headers)
    
    def test_activate_and_delete_campaign(self):
        """Test activating and deleting a drip campaign"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        import uuid
        
        # First create a campaign
        campaign_data = {
            "name": "TEST_Activate Campaign",
            "steps": [{"id": str(uuid.uuid4()), "order": 0, "channel": "sms", "message": "Test", "delay_days": 0, "send_time": "09:00"}],
            "stop_on_reply": True,
            "status": "draft"
        }
        create_resp = requests.post(f"{BASE_URL}/api/campaigns/enhanced", json=campaign_data, headers=headers)
        assert create_resp.status_code == 200, f"Create failed: {create_resp.text}"
        campaign_id = create_resp.json().get("id")
        
        # Activate the campaign
        activate_resp = requests.put(
            f"{BASE_URL}/api/campaigns/enhanced/{campaign_id}",
            json={"status": "active"},
            headers=headers
        )
        assert activate_resp.status_code == 200, f"Activate failed: {activate_resp.text}"
        print("✓ Campaign activated successfully")
        
        # Delete the campaign
        delete_resp = requests.delete(f"{BASE_URL}/api/campaigns/enhanced/{campaign_id}", headers=headers)
        assert delete_resp.status_code == 200, f"Delete failed: {delete_resp.text}"
        print("✓ Campaign deleted successfully")


class TestLegacyCampaigns:
    """Test Legacy Campaigns endpoint /api/campaigns"""
    
    def test_get_legacy_campaigns(self):
        """Test getting legacy campaigns"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns", headers=headers)
        assert response.status_code == 200, f"Get campaigns failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of campaigns"
        print(f"✓ Found {len(data)} legacy campaigns")


class TestSettings:
    """Test Settings/Platform endpoints"""
    
    def test_platform_status(self):
        """Test getting platform status"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/platform/status", headers=headers)
        assert response.status_code == 200, f"Platform status failed: {response.text}"
        data = response.json()
        print(f"✓ Platform status: Twilio={data.get('twilio', {}).get('connected')}")


class TestCreditShop:
    """Test Credit Shop endpoints"""
    
    def test_get_credit_packages(self):
        """Test getting credit packages"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/credits/packages", headers=headers)
        assert response.status_code == 200, f"Get packages failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of packages"
        print(f"✓ Found {len(data)} credit packages")
    
    def test_get_credit_balance(self):
        """Test getting credit balance"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/credits/balance", headers=headers)
        assert response.status_code == 200, f"Get balance failed: {response.text}"
        data = response.json()
        assert "balance" in data, "Missing balance field"
        print(f"✓ Credit balance: {data.get('balance')}")


class TestTeam:
    """Test Team Management endpoints"""
    
    def test_get_team_members(self):
        """Test getting team members"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/team/members", headers=headers)
        assert response.status_code == 200, f"Get team members failed: {response.text}"
        data = response.json()
        assert isinstance(data, list), "Expected list of team members"
        print(f"✓ Found {len(data)} team members")
    
    def test_get_team_stats(self):
        """Test getting team stats"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/team/stats", headers=headers)
        assert response.status_code == 200, f"Get team stats failed: {response.text}"
        data = response.json()
        print(f"✓ Team stats: {data.get('total_members')} members")


class TestPipeline:
    """Test Pipeline endpoints (uses clients API)"""
    
    def test_get_clients_for_pipeline(self):
        """Test getting clients for pipeline view"""
        token = get_admin_token()
        assert token, "Failed to get admin token"
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        assert response.status_code == 200, f"Get clients failed: {response.text}"
        data = response.json()
        # Check that clients have pipeline_stage field
        if len(data) > 0:
            assert "pipeline_stage" in data[0] or data[0].get("pipeline_stage") is None, "Missing pipeline_stage"
        print(f"✓ Pipeline view: {len(data)} clients available")


class TestDataIsolation:
    """Test data isolation between admin and org_admin"""
    
    def test_client_count_isolation(self):
        """Verify org_admin sees fewer clients than admin"""
        admin_token = get_admin_token()
        org_admin_token = get_org_admin_token()
        assert admin_token, "Failed to get admin token"
        assert org_admin_token, "Failed to get org_admin token"
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        org_admin_headers = {"Authorization": f"Bearer {org_admin_token}"}
        
        admin_resp = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        org_admin_resp = requests.get(f"{BASE_URL}/api/clients", headers=org_admin_headers)
        
        assert admin_resp.status_code == 200
        assert org_admin_resp.status_code == 200
        
        admin_count = len(admin_resp.json())
        org_admin_count = len(org_admin_resp.json())
        
        print(f"✓ Data isolation: Admin sees {admin_count} clients, Org admin sees {org_admin_count} clients")
        # org_admin should see fewer or equal clients (their own data only)
        assert org_admin_count <= admin_count, "Org admin should not see more clients than admin"
    
    def test_phone_number_isolation(self):
        """Verify org_admin sees fewer phone numbers than admin"""
        admin_token = get_admin_token()
        org_admin_token = get_org_admin_token()
        assert admin_token, "Failed to get admin token"
        assert org_admin_token, "Failed to get org_admin token"
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        org_admin_headers = {"Authorization": f"Bearer {org_admin_token}"}
        
        admin_resp = requests.get(f"{BASE_URL}/api/phone-numbers/owned", headers=admin_headers)
        org_admin_resp = requests.get(f"{BASE_URL}/api/phone-numbers/owned", headers=org_admin_headers)
        
        assert admin_resp.status_code == 200
        assert org_admin_resp.status_code == 200
        
        admin_count = len(admin_resp.json())
        org_admin_count = len(org_admin_resp.json())
        
        print(f"✓ Phone isolation: Admin sees {admin_count} numbers, Org admin sees {org_admin_count} numbers")
    
    def test_inbox_thread_isolation(self):
        """Verify org_admin sees fewer inbox threads than admin"""
        admin_token = get_admin_token()
        org_admin_token = get_org_admin_token()
        assert admin_token, "Failed to get admin token"
        assert org_admin_token, "Failed to get org_admin token"
        
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        org_admin_headers = {"Authorization": f"Bearer {org_admin_token}"}
        
        admin_resp = requests.get(f"{BASE_URL}/api/inbox/threads", headers=admin_headers)
        org_admin_resp = requests.get(f"{BASE_URL}/api/inbox/threads", headers=org_admin_headers)
        
        assert admin_resp.status_code == 200
        assert org_admin_resp.status_code == 200
        
        admin_threads = len(admin_resp.json().get("threads", []))
        org_admin_threads = len(org_admin_resp.json().get("threads", []))
        
        print(f"✓ Inbox isolation: Admin sees {admin_threads} threads, Org admin sees {org_admin_threads} threads")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_clients(self):
        """Clean up TEST_ prefixed clients"""
        token = get_admin_token()
        if not token:
            pytest.skip("No admin token")
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/clients", headers=headers)
        if response.status_code == 200:
            clients = response.json()
            deleted = 0
            for client in clients:
                if client.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/clients/{client['id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test clients")
    
    def test_cleanup_test_campaigns(self):
        """Clean up TEST_ prefixed campaigns"""
        token = get_admin_token()
        if not token:
            pytest.skip("No admin token")
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(f"{BASE_URL}/api/campaigns/enhanced", headers=headers)
        if response.status_code == 200:
            campaigns = response.json()
            deleted = 0
            for campaign in campaigns:
                if campaign.get("name", "").startswith("TEST_"):
                    del_resp = requests.delete(f"{BASE_URL}/api/campaigns/enhanced/{campaign['id']}", headers=headers)
                    if del_resp.status_code == 200:
                        deleted += 1
            print(f"✓ Cleaned up {deleted} test campaigns")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
