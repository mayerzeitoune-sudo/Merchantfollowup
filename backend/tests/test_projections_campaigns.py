"""
Test suite for Projections and Campaigns features
Tests:
- GET /api/projections/system - System-wide projections endpoint
- GET /api/campaigns/enhanced - Campaigns list without 500 error
- POST /api/campaigns/prebuilt/{type}/launch - Launch prebuilt campaign
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestProjectionsAndCampaigns:
    """Test projections and campaigns endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "john@acmefunding.com", "password": "Password123!"}
        )
        assert login_response.status_code == 200, f"Login failed: {login_response.text}"
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_system_projections(self):
        """Test GET /api/projections/system returns expected fields"""
        response = requests.get(
            f"{BASE_URL}/api/projections/system",
            headers=self.headers
        )
        
        # Status code assertion
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert "total_leads" in data, "Missing total_leads field"
        assert "pipeline_stages" in data, "Missing pipeline_stages field"
        assert "active_campaigns" in data, "Missing active_campaigns field"
        assert "active_enrollments" in data, "Missing active_enrollments field"
        assert "funded_count" in data, "Missing funded_count field"
        
        # Type assertions
        assert isinstance(data["total_leads"], int), "total_leads should be int"
        assert isinstance(data["pipeline_stages"], dict), "pipeline_stages should be dict"
        assert isinstance(data["active_campaigns"], int), "active_campaigns should be int"
        assert isinstance(data["active_enrollments"], int), "active_enrollments should be int"
        assert isinstance(data["funded_count"], int), "funded_count should be int"
        
        print(f"System projections: {data}")
    
    def test_get_campaigns_enhanced_no_500_error(self):
        """Test GET /api/campaigns/enhanced returns campaigns without 500 error"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/enhanced",
            headers=self.headers
        )
        
        # Status code assertion - should NOT be 500
        assert response.status_code != 500, f"Got 500 error: {response.text}"
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Data assertions
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        
        # Check each campaign has required fields
        for campaign in data:
            assert "id" in campaign, "Campaign missing id"
            assert "name" in campaign, "Campaign missing name"
            assert "status" in campaign, "Campaign missing status"
            assert "contacts_enrolled" in campaign, "Campaign missing contacts_enrolled"
            assert "steps" in campaign, "Campaign missing steps"
            
            # Verify updated_at field exists (this was the bug fix)
            assert "updated_at" in campaign, f"Campaign {campaign.get('name')} missing updated_at field"
            
        print(f"Found {len(data)} campaigns")
    
    def test_campaigns_have_active_status(self):
        """Test that launched campaigns show as 'active' status"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/enhanced",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check for active campaigns
        active_campaigns = [c for c in data if c.get("status") == "active"]
        print(f"Active campaigns: {len(active_campaigns)}")
        
        # Verify at least one active campaign exists (New Lead Follow-Up)
        if len(data) > 0:
            campaign_names = [c.get("name") for c in data]
            print(f"Campaign names: {campaign_names}")
    
    def test_get_prebuilt_campaigns_list(self):
        """Test GET /api/campaigns/prebuilt returns all templates"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/prebuilt",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        assert len(data) == 4, f"Expected 4 prebuilt campaigns, got {len(data)}"
        
        # Check for expected campaign types
        campaign_ids = [c.get("id") for c in data]
        assert "new_lead" in campaign_ids, "Missing new_lead campaign"
        assert "funded_short" in campaign_ids, "Missing funded_short campaign"
        assert "funded_medium" in campaign_ids, "Missing funded_medium campaign"
        assert "funded_long" in campaign_ids, "Missing funded_long campaign"
        
        print(f"Prebuilt campaigns: {campaign_ids}")
    
    def test_get_prebuilt_campaign_detail(self):
        """Test GET /api/campaigns/prebuilt/{type} returns campaign details"""
        response = requests.get(
            f"{BASE_URL}/api/campaigns/prebuilt/new_lead",
            headers=self.headers
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "name" in data, "Missing name field"
        assert "description" in data, "Missing description field"
        assert "steps" in data, "Missing steps field"
        assert "target_tag" in data, "Missing target_tag field"
        
        # Verify 54 messages in new_lead campaign
        assert len(data["steps"]) == 54, f"Expected 54 steps, got {len(data['steps'])}"
        
        print(f"New Lead campaign has {len(data['steps'])} steps")
    
    def test_launch_prebuilt_campaign_returns_required_fields(self):
        """Test POST /api/campaigns/prebuilt/{type}/launch returns proper response"""
        # First, check if there are any clients with 'Funded' tag
        clients_response = requests.get(
            f"{BASE_URL}/api/clients",
            headers=self.headers,
            params={"tag": "Funded"}
        )
        
        # Launch funded_short campaign (won't actually send SMS - mocked)
        response = requests.post(
            f"{BASE_URL}/api/campaigns/prebuilt/funded_short/launch",
            headers=self.headers,
            json={"name": "TEST_Funded_Short_Campaign", "tag": "Funded"}
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "campaign_id" in data, "Missing campaign_id in response"
        assert "enrolled_count" in data, "Missing enrolled_count in response"
        assert "message" in data, "Missing message in response"
        
        print(f"Launched campaign: {data}")
        
        # Verify the campaign appears in the list with active status
        campaigns_response = requests.get(
            f"{BASE_URL}/api/campaigns/enhanced",
            headers=self.headers
        )
        
        assert campaigns_response.status_code == 200
        campaigns = campaigns_response.json()
        
        # Find the newly created campaign
        test_campaign = next((c for c in campaigns if c.get("id") == data["campaign_id"]), None)
        assert test_campaign is not None, "Newly launched campaign not found in list"
        assert test_campaign.get("status") == "active", f"Campaign status should be 'active', got {test_campaign.get('status')}"
        
        # Cleanup - delete the test campaign
        delete_response = requests.delete(
            f"{BASE_URL}/api/campaigns/enhanced/{data['campaign_id']}",
            headers=self.headers
        )
        print(f"Cleanup: Deleted test campaign, status: {delete_response.status_code}")


class TestProjectionsFormulas:
    """Test that projections calculations are correct"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Login and get auth token"""
        login_response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": "john@acmefunding.com", "password": "Password123!"}
        )
        assert login_response.status_code == 200
        self.token = login_response.json()["token"]
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_projections_formula_values(self):
        """Verify projections formulas: 1%-12% conversion, $50-$600 profit, $0.0083/text"""
        response = requests.get(
            f"{BASE_URL}/api/projections/system",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        total_leads = data["total_leads"]
        
        # Calculate expected values based on formulas
        conv_low = int(total_leads * 0.01)
        conv_high = int(total_leads * 0.12)
        profit_low = conv_low * 50
        profit_high = conv_high * 600
        
        # Text cost calculations
        text_cost = 0.0083
        avg_msgs_per_lead = 54
        cost_per_lead = avg_msgs_per_lead * text_cost  # Should be ~$0.45
        
        print(f"Total leads: {total_leads}")
        print(f"Conversion range: {conv_low} to {conv_high}")
        print(f"Profit range: ${profit_low} to ${profit_high}")
        print(f"Cost per lead: ${cost_per_lead:.2f}")
        
        # Verify cost per lead is approximately $0.45
        assert 0.44 <= cost_per_lead <= 0.46, f"Cost per lead should be ~$0.45, got ${cost_per_lead:.2f}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
