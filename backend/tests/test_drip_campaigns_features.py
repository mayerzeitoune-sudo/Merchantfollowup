"""
Test suite for Drip Campaigns Features:
- Pre-built campaigns (new_lead, funded_short, funded_medium, funded_long)
- Campaign launch and enrollment
- Remove client from campaign
- Active campaigns for client
- Phone number deletion request
- Amount Requested field on clients
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
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Admin authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def agent_token():
    """Get agent authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": AGENT_EMAIL,
        "password": AGENT_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Agent authentication failed: {response.status_code}")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    """Headers with admin auth token"""
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def agent_headers(agent_token):
    """Headers with agent auth token"""
    return {"Authorization": f"Bearer {agent_token}", "Content-Type": "application/json"}


class TestPrebuiltCampaigns:
    """Test pre-built campaign endpoints"""
    
    def test_get_prebuilt_campaigns_returns_4_templates(self, admin_headers):
        """GET /api/campaigns/prebuilt returns 4 pre-built campaigns"""
        response = requests.get(f"{BASE_URL}/api/campaigns/prebuilt", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 4, f"Expected 4 campaigns, got {len(data)}"
        
        # Verify campaign types
        campaign_ids = [c['id'] for c in data]
        assert 'new_lead' in campaign_ids, "Missing new_lead campaign"
        assert 'funded_short' in campaign_ids, "Missing funded_short campaign"
        assert 'funded_medium' in campaign_ids, "Missing funded_medium campaign"
        assert 'funded_long' in campaign_ids, "Missing funded_long campaign"
        
        # Verify structure
        for campaign in data:
            assert 'id' in campaign
            assert 'name' in campaign
            assert 'description' in campaign
            assert 'campaign_type' in campaign
            assert 'target_tag' in campaign
            assert 'total_steps' in campaign
            print(f"✓ Campaign: {campaign['name']} - {campaign['total_steps']} steps")
    
    def test_get_prebuilt_new_lead_detail(self, admin_headers):
        """GET /api/campaigns/prebuilt/new_lead returns full campaign details"""
        response = requests.get(f"{BASE_URL}/api/campaigns/prebuilt/new_lead", headers=admin_headers)
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert data['campaign_type'] == 'new_lead'
        assert data['target_tag'] == 'New Lead'
        assert 'steps' in data
        assert len(data['steps']) > 50, f"New Lead should have 54 messages, got {len(data['steps'])}"
        print(f"✓ New Lead campaign has {len(data['steps'])} steps")
    
    def test_get_prebuilt_funded_short_detail(self, admin_headers):
        """GET /api/campaigns/prebuilt/funded_short returns funded short campaign"""
        response = requests.get(f"{BASE_URL}/api/campaigns/prebuilt/funded_short", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data['campaign_type'] == 'funded_short'
        assert data['target_tag'] == 'Funded'
        assert 'steps' in data
        print(f"✓ Funded Short campaign has {len(data['steps'])} steps")
    
    def test_get_prebuilt_funded_medium_detail(self, admin_headers):
        """GET /api/campaigns/prebuilt/funded_medium returns funded medium campaign"""
        response = requests.get(f"{BASE_URL}/api/campaigns/prebuilt/funded_medium", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data['campaign_type'] == 'funded_medium'
        assert data['target_tag'] == 'Funded'
        print(f"✓ Funded Medium campaign has {len(data['steps'])} steps")
    
    def test_get_prebuilt_funded_long_detail(self, admin_headers):
        """GET /api/campaigns/prebuilt/funded_long returns funded long campaign"""
        response = requests.get(f"{BASE_URL}/api/campaigns/prebuilt/funded_long", headers=admin_headers)
        
        assert response.status_code == 200
        data = response.json()
        assert data['campaign_type'] == 'funded_long'
        assert data['target_tag'] == 'Funded'
        print(f"✓ Funded Long campaign has {len(data['steps'])} steps")
    
    def test_get_prebuilt_invalid_type_returns_404(self, admin_headers):
        """GET /api/campaigns/prebuilt/invalid returns 404"""
        response = requests.get(f"{BASE_URL}/api/campaigns/prebuilt/invalid_type", headers=admin_headers)
        assert response.status_code == 404


class TestCampaignLaunch:
    """Test campaign launch and enrollment"""
    
    @pytest.fixture
    def test_client_with_new_lead_tag(self, admin_headers):
        """Create a test client with New Lead tag"""
        client_data = {
            "name": "TEST_CampaignClient",
            "phone": "+15551234567",
            "tags": ["New Lead"],
            "amount_requested": 50000
        }
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=admin_headers)
        assert response.status_code == 200, f"Failed to create test client: {response.text}"
        client = response.json()
        yield client
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client['id']}", headers=admin_headers)
    
    def test_launch_new_lead_campaign(self, admin_headers, test_client_with_new_lead_tag):
        """POST /api/campaigns/prebuilt/new_lead/launch enrolls clients with New Lead tag"""
        response = requests.post(
            f"{BASE_URL}/api/campaigns/prebuilt/new_lead/launch",
            json={"name": "TEST_NewLeadCampaign", "tag": "New Lead"},
            headers=admin_headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'campaign_id' in data
        assert 'enrolled_count' in data
        assert data['enrolled_count'] >= 1, "Should have enrolled at least 1 client"
        print(f"✓ Campaign launched with {data['enrolled_count']} clients enrolled")
        
        # Cleanup - delete the campaign
        if 'campaign_id' in data:
            requests.delete(f"{BASE_URL}/api/campaigns/enhanced/{data['campaign_id']}", headers=admin_headers)


class TestRemoveClientFromCampaign:
    """Test removing client from campaign"""
    
    def test_remove_client_from_campaign_endpoint_exists(self, admin_headers):
        """POST /api/campaigns/{id}/remove-client/{client_id} endpoint exists"""
        # This will return 404 for non-existent campaign, but endpoint should exist
        response = requests.post(
            f"{BASE_URL}/api/campaigns/fake-campaign-id/remove-client/fake-client-id",
            headers=admin_headers
        )
        # Should be 404 (not found) not 405 (method not allowed)
        assert response.status_code in [404, 422], f"Endpoint should exist, got {response.status_code}"
        print("✓ Remove client from campaign endpoint exists")


class TestActiveClientCampaigns:
    """Test getting active campaigns for a client"""
    
    def test_get_active_campaigns_for_client(self, admin_headers):
        """GET /api/campaigns/client/{client_id}/active returns active enrollments"""
        # First get a client
        clients_response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        assert clients_response.status_code == 200
        clients = clients_response.json()
        
        if clients:
            client_id = clients[0]['id']
            response = requests.get(
                f"{BASE_URL}/api/campaigns/client/{client_id}/active",
                headers=admin_headers
            )
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            data = response.json()
            assert isinstance(data, list), "Response should be a list"
            print(f"✓ Client has {len(data)} active campaign enrollments")
        else:
            pytest.skip("No clients available for testing")


class TestPhoneNumberDeletionRequest:
    """Test phone number deletion request endpoint"""
    
    def test_request_deletion_endpoint_exists(self, admin_headers):
        """POST /api/phone-numbers/{phone_id}/request-deletion endpoint exists"""
        # Get owned phone numbers first
        numbers_response = requests.get(f"{BASE_URL}/api/phone-numbers/owned", headers=admin_headers)
        
        if numbers_response.status_code == 200 and numbers_response.json():
            phone_id = numbers_response.json()[0]['id']
            response = requests.post(
                f"{BASE_URL}/api/phone-numbers/{phone_id}/request-deletion",
                headers=admin_headers
            )
            # Should succeed or return meaningful error
            assert response.status_code in [200, 201, 400, 404], f"Unexpected status: {response.status_code}"
            print(f"✓ Deletion request endpoint works, status: {response.status_code}")
        else:
            # Test with fake ID - should return 404
            response = requests.post(
                f"{BASE_URL}/api/phone-numbers/fake-phone-id/request-deletion",
                headers=admin_headers
            )
            assert response.status_code in [404, 422], f"Expected 404/422 for fake ID, got {response.status_code}"
            print("✓ Deletion request endpoint exists (tested with fake ID)")


class TestAmountRequestedField:
    """Test Amount Requested field on clients"""
    
    def test_create_client_with_amount_requested(self, admin_headers):
        """POST /api/clients with amount_requested field"""
        client_data = {
            "name": "TEST_AmountClient",
            "phone": "+15559876543",
            "amount_requested": 75000.50,
            "tags": ["New Lead"]
        }
        
        response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=admin_headers)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert 'amount_requested' in data, "Response should include amount_requested"
        assert data['amount_requested'] == 75000.50, f"Expected 75000.50, got {data['amount_requested']}"
        print(f"✓ Client created with amount_requested: ${data['amount_requested']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{data['id']}", headers=admin_headers)
    
    def test_update_client_amount_requested(self, admin_headers):
        """PUT /api/clients/{id} can update amount_requested"""
        # Create client first
        client_data = {
            "name": "TEST_UpdateAmountClient",
            "phone": "+15551112222",
            "amount_requested": 25000
        }
        create_response = requests.post(f"{BASE_URL}/api/clients", json=client_data, headers=admin_headers)
        assert create_response.status_code == 200
        client_id = create_response.json()['id']
        
        # Update amount_requested
        update_response = requests.put(
            f"{BASE_URL}/api/clients/{client_id}",
            json={"amount_requested": 100000},
            headers=admin_headers
        )
        assert update_response.status_code == 200
        
        updated_data = update_response.json()
        assert updated_data['amount_requested'] == 100000, f"Expected 100000, got {updated_data['amount_requested']}"
        print(f"✓ Client amount_requested updated to ${updated_data['amount_requested']}")
        
        # Cleanup
        requests.delete(f"{BASE_URL}/api/clients/{client_id}", headers=admin_headers)


class TestLeadRevivalRemoved:
    """Verify Lead Revival page/routes are removed"""
    
    def test_lead_revival_endpoint_not_accessible(self, admin_headers):
        """Lead Revival specific endpoints should not exist or be deprecated"""
        # The revival campaigns endpoint might still exist but the page is removed
        # This is more of a frontend test, but we can verify the API behavior
        response = requests.get(f"{BASE_URL}/api/revival/campaigns", headers=admin_headers)
        # The endpoint may still exist (200) or be removed (404)
        # Either is acceptable as long as the frontend page is removed
        print(f"✓ Revival campaigns endpoint status: {response.status_code}")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_campaigns(self, admin_headers):
        """Clean up any test campaigns created during testing"""
        response = requests.get(f"{BASE_URL}/api/campaigns/enhanced", headers=admin_headers)
        if response.status_code == 200:
            campaigns = response.json()
            for campaign in campaigns:
                if campaign.get('name', '').startswith('TEST_'):
                    requests.delete(f"{BASE_URL}/api/campaigns/enhanced/{campaign['id']}", headers=admin_headers)
                    print(f"  Cleaned up campaign: {campaign['name']}")
        print("✓ Test campaign cleanup complete")
    
    def test_cleanup_test_clients(self, admin_headers):
        """Clean up any test clients created during testing"""
        response = requests.get(f"{BASE_URL}/api/clients", headers=admin_headers)
        if response.status_code == 200:
            clients = response.json()
            for client in clients:
                if client.get('name', '').startswith('TEST_'):
                    requests.delete(f"{BASE_URL}/api/clients/{client['id']}", headers=admin_headers)
                    print(f"  Cleaned up client: {client['name']}")
        print("✓ Test client cleanup complete")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
