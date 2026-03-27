"""
Test suite for PHONE BLOWER Auto-Dialer and MAX AGGRESSION DRIP Trigger Words features
Tests:
1. POST /api/phone-blower/auto-dial/start - creates auto-dial session and returns simulated call result
2. GET /api/phone-blower/auto-dial/active - returns active auto-dial sessions
3. POST /api/phone-blower/auto-dial/stop - stops an auto-dial session
4. GET /api/phone-blower/twiml/blower-message - returns TwiML with AI voice message
5. POST /api/campaigns/prebuilt/max_aggression/launch - accepts trigger_words in body
6. GET /api/campaigns/{id}/trigger-words - returns stored trigger words
7. PUT /api/campaigns/{id}/trigger-words - updates trigger words
"""

import pytest
import requests
import os
import time

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


@pytest.fixture(scope="module")
def test_client_id(api_client):
    """Get a client ID from the queue for testing"""
    response = api_client.get(f"{BASE_URL}/api/phone-blower/queue")
    if response.status_code == 200:
        queue = response.json()
        if len(queue) > 0:
            return queue[0]["client"]["id"]
    pytest.skip("No leads in queue to test auto-dialer")


class TestAutoDialerStart:
    """Tests for starting auto-dialer"""
    
    def test_start_auto_dialer(self, api_client, test_client_id):
        """POST /api/phone-blower/auto-dial/start creates session and returns simulated call result"""
        # First stop any existing auto-dial for this client
        api_client.post(f"{BASE_URL}/api/phone-blower/auto-dial/stop", json={
            "client_id": test_client_id
        })
        
        # Start auto-dialer
        response = api_client.post(f"{BASE_URL}/api/phone-blower/auto-dial/start", json={
            "client_id": test_client_id,
            "interval_minutes": 5
        })
        
        # May fail if no owned numbers - that's expected
        if response.status_code == 400:
            error = response.json().get("detail", "")
            if "No owned phone numbers" in error:
                pytest.skip("No owned phone numbers available for auto-dialer test")
            if "blocked" in error.lower():
                pytest.skip(f"Client is blocked: {error}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        
        # Verify response structure
        assert "session_id" in result, "Response should have 'session_id'"
        assert "status" in result, "Response should have 'status'"
        assert result["status"] == "active", f"Expected status 'active', got {result['status']}"
        assert "message" in result, "Response should have 'message'"
        assert "first_call" in result, "Response should have 'first_call'"
        
        # Verify first call result
        first_call = result["first_call"]
        assert "from" in first_call, "First call should have 'from' number"
        assert "to" in first_call, "First call should have 'to' number"
        assert "status" in first_call, "First call should have 'status'"
        
        # Status should be 'simulated' since Twilio is not configured
        assert first_call["status"] in ["simulated", "initiated", "queued"], f"Unexpected call status: {first_call['status']}"
        
        print(f"✓ Auto-dialer started: session_id={result['session_id']}")
        print(f"  - First call status: {first_call['status']}")
        print(f"  - Total numbers: {result.get('total_numbers', 0)}")
        
        return result["session_id"]
    
    def test_start_auto_dialer_blocked_client(self, api_client):
        """POST /api/phone-blower/auto-dial/start rejects blocked clients"""
        # Try to start for a non-existent client
        response = api_client.post(f"{BASE_URL}/api/phone-blower/auto-dial/start", json={
            "client_id": "non-existent-client-id",
            "interval_minutes": 5
        })
        
        assert response.status_code == 404, f"Expected 404 for non-existent client, got {response.status_code}"
        print("✓ Auto-dialer correctly rejects non-existent client")


class TestAutoDialerActive:
    """Tests for getting active auto-dial sessions"""
    
    def test_get_active_auto_dialers(self, api_client):
        """GET /api/phone-blower/auto-dial/active returns active sessions"""
        response = api_client.get(f"{BASE_URL}/api/phone-blower/auto-dial/active")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        sessions = response.json()
        assert isinstance(sessions, list), "Expected list of sessions"
        
        # If there are active sessions, verify structure
        if len(sessions) > 0:
            session = sessions[0]
            assert "id" in session, "Session should have 'id'"
            assert "client_id" in session, "Session should have 'client_id'"
            assert "status" in session, "Session should have 'status'"
            assert session["status"] == "active", f"Expected status 'active', got {session['status']}"
            assert "total_calls_made" in session, "Session should have 'total_calls_made'"
            assert "owned_numbers" in session, "Session should have 'owned_numbers'"
            
            print(f"✓ Found {len(sessions)} active auto-dial session(s)")
            print(f"  - Client: {session.get('client_name', session['client_id'])}")
            print(f"  - Calls made: {session['total_calls_made']}")
        else:
            print("✓ No active auto-dial sessions (expected if none started)")


class TestAutoDialerStop:
    """Tests for stopping auto-dialer"""
    
    def test_stop_auto_dialer(self, api_client, test_client_id):
        """POST /api/phone-blower/auto-dial/stop stops a session"""
        # First try to start one (may fail if no numbers)
        start_response = api_client.post(f"{BASE_URL}/api/phone-blower/auto-dial/start", json={
            "client_id": test_client_id,
            "interval_minutes": 5
        })
        
        # Now stop it
        response = api_client.post(f"{BASE_URL}/api/phone-blower/auto-dial/stop", json={
            "client_id": test_client_id
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "stopped" in result, "Response should have 'stopped' count"
        
        print(f"✓ Auto-dialer stopped: {result['stopped']} session(s)")
        
        # Verify it's no longer active
        active_response = api_client.get(f"{BASE_URL}/api/phone-blower/auto-dial/active")
        active_sessions = active_response.json()
        
        for session in active_sessions:
            assert session["client_id"] != test_client_id, "Session should no longer be active for this client"
        
        print("✓ Verified session is no longer active")


class TestTwiMLBlowerMessage:
    """Tests for TwiML blower message endpoint"""
    
    def test_get_twiml_blower_message(self, api_client):
        """GET /api/phone-blower/twiml/blower-message returns TwiML with AI voice message"""
        response = api_client.get(f"{BASE_URL}/api/phone-blower/twiml/blower-message")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        # Verify content type is XML
        content_type = response.headers.get("content-type", "")
        assert "xml" in content_type.lower(), f"Expected XML content type, got {content_type}"
        
        # Verify TwiML structure
        twiml = response.text
        assert "<?xml" in twiml, "Response should be valid XML"
        assert "<Response>" in twiml, "TwiML should have <Response> element"
        assert "<Say" in twiml, "TwiML should have <Say> element"
        assert "Polly" in twiml, "TwiML should use Polly voice"
        
        # Verify the message content
        assert "pay your bill" in twiml.lower() or "pay your bill" in twiml, "TwiML should contain the blower message"
        
        print("✓ TwiML blower message returned correctly")
        print(f"  - Content type: {content_type}")
        print(f"  - Contains Polly voice: Yes")


class TestTriggerWordsLaunch:
    """Tests for launching MAX AGGRESSION DRIP with trigger words"""
    
    def test_launch_max_aggression_with_trigger_words(self, api_client):
        """POST /api/campaigns/prebuilt/max_aggression/launch accepts trigger_words in body"""
        trigger_words = ["stop", "no", "fuck you", "leave me alone", "unsubscribe"]
        
        response = api_client.post(f"{BASE_URL}/api/campaigns/prebuilt/max_aggression/launch", json={
            "name": "TEST_MAX_AGGRESSION_TRIGGER_WORDS",
            "tag": "New Lead",
            "trigger_words": trigger_words
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        
        # Verify response structure
        assert "campaign_id" in result, "Response should have 'campaign_id'"
        assert "enrolled_count" in result, "Response should have 'enrolled_count'"
        assert "message" in result, "Response should have 'message'"
        
        campaign_id = result["campaign_id"]
        print(f"✓ MAX AGGRESSION DRIP launched with trigger words")
        print(f"  - Campaign ID: {campaign_id}")
        print(f"  - Enrolled: {result['enrolled_count']} clients")
        
        return campaign_id


class TestTriggerWordsGet:
    """Tests for getting trigger words from a campaign"""
    
    def test_get_campaign_trigger_words(self, api_client):
        """GET /api/campaigns/{id}/trigger-words returns stored trigger words"""
        # First launch a campaign with trigger words
        trigger_words = ["stop", "no", "out", "fuck off", "remove me"]
        
        launch_response = api_client.post(f"{BASE_URL}/api/campaigns/prebuilt/max_aggression/launch", json={
            "name": "TEST_GET_TRIGGER_WORDS",
            "tag": "New Lead",
            "trigger_words": trigger_words
        })
        
        if launch_response.status_code != 200:
            pytest.skip(f"Could not launch campaign: {launch_response.text}")
        
        campaign_id = launch_response.json()["campaign_id"]
        
        # Get trigger words
        response = api_client.get(f"{BASE_URL}/api/campaigns/{campaign_id}/trigger-words")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert "trigger_words" in result, "Response should have 'trigger_words'"
        
        stored_words = result["trigger_words"]
        assert isinstance(stored_words, list), "trigger_words should be a list"
        
        # Verify all trigger words were stored
        for word in trigger_words:
            assert word in stored_words, f"Trigger word '{word}' not found in stored words"
        
        print(f"✓ Trigger words retrieved: {len(stored_words)} words")
        print(f"  - Words: {stored_words[:5]}...")
        
        return campaign_id


class TestTriggerWordsUpdate:
    """Tests for updating trigger words on a campaign"""
    
    def test_update_campaign_trigger_words(self, api_client):
        """PUT /api/campaigns/{id}/trigger-words updates trigger words"""
        # First launch a campaign
        launch_response = api_client.post(f"{BASE_URL}/api/campaigns/prebuilt/max_aggression/launch", json={
            "name": "TEST_UPDATE_TRIGGER_WORDS",
            "tag": "New Lead",
            "trigger_words": ["stop", "no"]
        })
        
        if launch_response.status_code != 200:
            pytest.skip(f"Could not launch campaign: {launch_response.text}")
        
        campaign_id = launch_response.json()["campaign_id"]
        
        # Update trigger words
        new_trigger_words = ["stop", "no", "quit", "cancel", "fuck you", "leave me alone", "not interested"]
        
        response = api_client.put(f"{BASE_URL}/api/campaigns/{campaign_id}/trigger-words", json={
            "trigger_words": new_trigger_words
        })
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        result = response.json()
        assert result.get("status") == "updated", f"Expected status 'updated', got {result.get('status')}"
        assert "trigger_words" in result, "Response should have 'trigger_words'"
        
        # Verify the update
        get_response = api_client.get(f"{BASE_URL}/api/campaigns/{campaign_id}/trigger-words")
        stored_words = get_response.json()["trigger_words"]
        
        assert len(stored_words) == len(new_trigger_words), f"Expected {len(new_trigger_words)} words, got {len(stored_words)}"
        
        for word in new_trigger_words:
            assert word in stored_words, f"Updated trigger word '{word}' not found"
        
        print(f"✓ Trigger words updated successfully")
        print(f"  - New count: {len(stored_words)} words")
    
    def test_update_trigger_words_nonexistent_campaign(self, api_client):
        """PUT /api/campaigns/{id}/trigger-words returns 404 for non-existent campaign"""
        response = api_client.put(f"{BASE_URL}/api/campaigns/non-existent-id/trigger-words", json={
            "trigger_words": ["stop"]
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print("✓ Correctly returns 404 for non-existent campaign")


class TestCleanup:
    """Cleanup test data"""
    
    def test_cleanup_test_campaigns(self, api_client):
        """Clean up test campaigns created during testing"""
        # Get all campaigns
        response = api_client.get(f"{BASE_URL}/api/campaigns/enhanced")
        if response.status_code != 200:
            return
        
        campaigns = response.json()
        deleted = 0
        
        for campaign in campaigns:
            if campaign.get("name", "").startswith("TEST_"):
                delete_response = api_client.delete(f"{BASE_URL}/api/campaigns/enhanced/{campaign['id']}")
                if delete_response.status_code == 200:
                    deleted += 1
        
        print(f"✓ Cleaned up {deleted} test campaigns")
    
    def test_stop_all_test_auto_dialers(self, api_client, test_client_id):
        """Stop any auto-dialers started during testing"""
        response = api_client.post(f"{BASE_URL}/api/phone-blower/auto-dial/stop", json={
            "client_id": test_client_id
        })
        print("✓ Stopped any test auto-dialers")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
