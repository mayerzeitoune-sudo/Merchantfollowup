"""
Test suite for MAX AGGRESSION DRIP and PHONE BLOWER features
Tests:
1. GET /api/campaigns/prebuilt - returns MAX AGGRESSION DRIP with campaign_type 'max_aggression' and 22 steps
2. GET /api/phone-blower/queue - returns list of callable leads
3. GET /api/phone-blower/analytics - returns analytics object
4. GET /api/phone-blower/lead/{clientId} - returns full lead profile with compliance checks
5. POST /api/phone-blower/call - logs a call disposition and updates client status
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "john@acmefunding.com"
TEST_PASSWORD = "Password123!"


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip(f"Authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def api_client(auth_token):
    """Shared requests session with auth"""
    session = requests.Session()
    session.headers.update({
        "Content-Type": "application/json",
        "Authorization": f"Bearer {auth_token}"
    })
    return session


class TestMaxAggressionDrip:
    """Tests for MAX AGGRESSION DRIP prebuilt campaign"""
    
    def test_prebuilt_campaigns_returns_max_aggression(self, api_client):
        """GET /api/campaigns/prebuilt returns MAX AGGRESSION DRIP"""
        response = api_client.get(f"{BASE_URL}/api/campaigns/prebuilt")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        campaigns = response.json()
        assert isinstance(campaigns, list), "Expected list of campaigns"
        
        # Find MAX AGGRESSION DRIP
        max_aggression = None
        for c in campaigns:
            if c.get("campaign_type") == "max_aggression":
                max_aggression = c
                break
        
        assert max_aggression is not None, "MAX AGGRESSION DRIP not found in prebuilt campaigns"
        assert max_aggression.get("name") == "MAX AGGRESSION DRIP", f"Expected name 'MAX AGGRESSION DRIP', got {max_aggression.get('name')}"
        assert max_aggression.get("id") == "max_aggression", f"Expected id 'max_aggression', got {max_aggression.get('id')}"
        
        # Check step count - should be 22 weekday steps over 30 days
        total_steps = max_aggression.get("total_steps", 0)
        assert total_steps == 22, f"Expected 22 steps (weekdays only over 30 days), got {total_steps}"
        
        print(f"✓ MAX AGGRESSION DRIP found with {total_steps} steps")
    
    def test_max_aggression_detail(self, api_client):
        """GET /api/campaigns/prebuilt/max_aggression returns full details"""
        response = api_client.get(f"{BASE_URL}/api/campaigns/prebuilt/max_aggression")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        detail = response.json()
        
        # Verify structure
        assert detail.get("name") == "MAX AGGRESSION DRIP"
        assert detail.get("campaign_type") == "max_aggression"
        assert detail.get("target_tag") == "New Lead"
        assert detail.get("duration_days") == 30
        assert detail.get("weekdays_only") == True
        assert detail.get("randomize") == True
        
        # Verify send window
        send_window = detail.get("send_window", {})
        assert send_window.get("start") == "09:00", f"Expected start 09:00, got {send_window.get('start')}"
        assert send_window.get("end") == "17:00", f"Expected end 17:00, got {send_window.get('end')}"
        
        # Verify steps
        steps = detail.get("steps", [])
        assert len(steps) == 22, f"Expected 22 steps, got {len(steps)}"
        
        # Verify template bank
        template_bank = detail.get("template_bank", [])
        assert len(template_bank) == 100, f"Expected 100 message templates, got {len(template_bank)}"
        
        print(f"✓ MAX AGGRESSION DRIP detail verified: {len(steps)} steps, {len(template_bank)} templates")


class TestPhoneBlowerQueue:
    """Tests for Phone Blower call queue"""
    
    def test_get_call_queue(self, api_client):
        """GET /api/phone-blower/queue returns list of callable leads"""
        response = api_client.get(f"{BASE_URL}/api/phone-blower/queue")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        queue = response.json()
        assert isinstance(queue, list), "Expected list of leads"
        
        # Verify structure of queue items
        if len(queue) > 0:
            item = queue[0]
            assert "client" in item, "Queue item should have 'client' field"
            assert "today_attempts" in item, "Queue item should have 'today_attempts' field"
            assert "last_call" in item, "Queue item should have 'last_call' field"
            
            client = item["client"]
            assert "id" in client, "Client should have 'id'"
            assert "name" in client or "phone" in client, "Client should have 'name' or 'phone'"
        
        print(f"✓ Call queue returned {len(queue)} leads")
        return queue


class TestPhoneBlowerAnalytics:
    """Tests for Phone Blower analytics"""
    
    def test_get_analytics(self, api_client):
        """GET /api/phone-blower/analytics returns analytics object"""
        response = api_client.get(f"{BASE_URL}/api/phone-blower/analytics")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        analytics = response.json()
        
        # Verify required fields
        required_fields = [
            "total_attempts", "connects", "no_answers", "voicemails_left",
            "callbacks_requested", "positive_contacts", "applications_started",
            "wrong_numbers", "dnc_marked", "dead_leads", "connect_rate",
            "conversion_rate", "dispositions"
        ]
        
        for field in required_fields:
            assert field in analytics, f"Analytics missing required field: {field}"
        
        # Verify types
        assert isinstance(analytics["total_attempts"], int)
        assert isinstance(analytics["connect_rate"], (int, float))
        assert isinstance(analytics["dispositions"], dict)
        
        print(f"✓ Analytics returned: {analytics['total_attempts']} total attempts, {analytics['connect_rate']}% connect rate")


class TestPhoneBlowerLeadProfile:
    """Tests for Phone Blower lead profile"""
    
    def test_get_lead_profile(self, api_client):
        """GET /api/phone-blower/lead/{clientId} returns full lead profile"""
        # First get a lead from the queue
        queue_response = api_client.get(f"{BASE_URL}/api/phone-blower/queue")
        assert queue_response.status_code == 200
        
        queue = queue_response.json()
        if len(queue) == 0:
            pytest.skip("No leads in queue to test")
        
        client_id = queue[0]["client"]["id"]
        
        # Get lead profile
        response = api_client.get(f"{BASE_URL}/api/phone-blower/lead/{client_id}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        profile = response.json()
        
        # Verify structure
        assert "client" in profile, "Profile should have 'client'"
        assert "attempts" in profile, "Profile should have 'attempts'"
        assert "today_attempts" in profile, "Profile should have 'today_attempts'"
        assert "compliance" in profile, "Profile should have 'compliance'"
        assert "recommendation" in profile, "Profile should have 'recommendation'"
        assert "next_action" in profile, "Profile should have 'next_action'"
        
        # Verify compliance checks
        compliance = profile["compliance"]
        compliance_fields = [
            "is_dnc", "is_opted_out", "is_wrong_number", "is_blocked",
            "is_terminal", "cooldown_active", "attempts_exhausted",
            "in_call_window", "is_weekday", "can_call"
        ]
        for field in compliance_fields:
            assert field in compliance, f"Compliance missing field: {field}"
        
        print(f"✓ Lead profile returned for {profile['client'].get('name', client_id)}")
        print(f"  - Can call: {compliance['can_call']}")
        print(f"  - Recommendation: {profile['recommendation']}")
        
        return client_id


class TestPhoneBlowerCallLogging:
    """Tests for Phone Blower call disposition logging"""
    
    def test_log_call_disposition(self, api_client):
        """POST /api/phone-blower/call logs a call disposition"""
        # First get a lead from the queue
        queue_response = api_client.get(f"{BASE_URL}/api/phone-blower/queue")
        assert queue_response.status_code == 200
        
        queue = queue_response.json()
        if len(queue) == 0:
            pytest.skip("No leads in queue to test")
        
        client_id = queue[0]["client"]["id"]
        
        # Log a call disposition
        call_data = {
            "client_id": client_id,
            "outbound_number": "+15551234567",
            "disposition": "no_answer",
            "notes": "Test call - no answer",
            "duration_seconds": 0
        }
        
        response = api_client.post(f"{BASE_URL}/api/phone-blower/call", json=call_data)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        
        # Verify response
        assert "id" in result, "Response should have 'id'"
        assert result["client_id"] == client_id
        assert result["disposition"] == "no_answer"
        assert result["outbound_number"] == "+15551234567"
        
        print(f"✓ Call disposition logged: {result['disposition']} for client {client_id}")
        
        # Verify the call appears in lead profile
        profile_response = api_client.get(f"{BASE_URL}/api/phone-blower/lead/{client_id}")
        assert profile_response.status_code == 200
        
        profile = profile_response.json()
        assert profile["today_attempts"] >= 1, "Today's attempts should be at least 1"
        
        print(f"  - Today's attempts: {profile['today_attempts']}")
    
    def test_invalid_disposition_rejected(self, api_client):
        """POST /api/phone-blower/call rejects invalid disposition"""
        queue_response = api_client.get(f"{BASE_URL}/api/phone-blower/queue")
        queue = queue_response.json()
        if len(queue) == 0:
            pytest.skip("No leads in queue to test")
        
        client_id = queue[0]["client"]["id"]
        
        call_data = {
            "client_id": client_id,
            "outbound_number": "+15551234567",
            "disposition": "invalid_disposition",
            "notes": "Test invalid disposition"
        }
        
        response = api_client.post(f"{BASE_URL}/api/phone-blower/call", json=call_data)
        assert response.status_code == 400, f"Expected 400 for invalid disposition, got {response.status_code}"
        
        print("✓ Invalid disposition correctly rejected")


class TestPhoneBlowerSettings:
    """Tests for Phone Blower settings"""
    
    def test_get_settings(self, api_client):
        """GET /api/phone-blower/settings returns settings"""
        response = api_client.get(f"{BASE_URL}/api/phone-blower/settings")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        settings = response.json()
        
        # Verify default settings structure
        assert "max_attempts_per_day" in settings
        assert "cooldown_minutes" in settings
        assert "call_window_start" in settings
        assert "call_window_end" in settings
        
        print(f"✓ Settings returned: max {settings['max_attempts_per_day']} attempts/day, {settings['cooldown_minutes']}min cooldown")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
