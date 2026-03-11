"""
Backend API Tests for Merchant Follow Up Platform - Enhanced Features
Tests: Login, Dashboard, Drip Campaigns, Analytics, Lead Capture, Compliance, Revival
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://sms-deal-tracker.preview.emergentagent.com')

# Test credentials
TEST_EMAIL = "template_test@example.com"
TEST_PASSWORD = "password123"


class TestAuthentication:
    """Test authentication endpoints"""
    
    def test_login_success(self):
        """Test login with valid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        assert response.status_code == 200
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == TEST_EMAIL
        
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401


@pytest.fixture(scope="module")
def auth_token():
    """Get authentication token for tests"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("token")
    pytest.skip("Authentication failed - skipping authenticated tests")


@pytest.fixture
def auth_headers(auth_token):
    """Get headers with auth token"""
    return {"Authorization": f"Bearer {auth_token}"}


class TestRootAPI:
    """Test root API endpoint"""
    
    def test_api_version(self):
        """Test API returns version 2.0.0"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert data["version"] == "2.0.0"
        assert "Merchant Follow Up" in data["message"]


class TestDashboard:
    """Test dashboard endpoints"""
    
    def test_dashboard_stats(self, auth_headers):
        """Test dashboard stats endpoint"""
        response = requests.get(f"{BASE_URL}/api/dashboard/stats", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_clients" in data
        assert "total_reminders" in data
        assert "pending_reminders" in data
        assert "active_campaigns" in data
        assert "total_balance_owed" in data


class TestEnhancedCampaigns:
    """Test enhanced drip campaigns endpoints"""
    
    def test_get_enhanced_campaigns(self, auth_headers):
        """Test getting enhanced campaigns list"""
        response = requests.get(f"{BASE_URL}/api/campaigns/enhanced", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_enhanced_campaign(self, auth_headers):
        """Test creating an enhanced campaign"""
        campaign_data = {
            "name": "TEST_New Lead Follow-up",
            "description": "Automated follow-up for new leads",
            "steps": [
                {
                    "id": "step-1",
                    "order": 0,
                    "channel": "sms",
                    "message": "Hi {name}, thanks for your interest!",
                    "delay_days": 0,
                    "delay_hours": 0,
                    "delay_minutes": 0
                },
                {
                    "id": "step-2",
                    "order": 1,
                    "channel": "sms",
                    "message": "Just checking in - any questions?",
                    "delay_days": 3,
                    "delay_hours": 0,
                    "delay_minutes": 0
                }
            ],
            "triggers": [],
            "stop_on_reply": True,
            "target_tags": [],
            "status": "draft"
        }
        response = requests.post(f"{BASE_URL}/api/campaigns/enhanced", json=campaign_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_New Lead Follow-up"
        assert len(data["steps"]) == 2
        assert data["stop_on_reply"] == True
        
        # Cleanup - delete the campaign
        campaign_id = data["id"]
        requests.delete(f"{BASE_URL}/api/campaigns/enhanced/{campaign_id}", headers=auth_headers)


class TestFollowUps:
    """Test follow-up endpoints"""
    
    def test_get_todays_followups(self, auth_headers):
        """Test getting today's follow-ups"""
        response = requests.get(f"{BASE_URL}/api/followups/today", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "date" in data
        assert "followups" in data
        assert "count" in data
        assert isinstance(data["followups"], list)
    
    def test_get_missed_followups(self, auth_headers):
        """Test getting missed follow-ups"""
        response = requests.get(f"{BASE_URL}/api/followups/missed", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "followups" in data
        assert "count" in data


class TestAnalytics:
    """Test analytics endpoints"""
    
    def test_analytics_overview(self, auth_headers):
        """Test analytics overview endpoint"""
        response = requests.get(f"{BASE_URL}/api/analytics/overview", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "total_messages_sent" in data
        assert "total_replies" in data
        assert "response_rate" in data
        assert "campaigns_active" in data
        assert "top_templates" in data
        assert "top_campaigns" in data
    
    def test_analytics_with_date_range(self, auth_headers):
        """Test analytics with date range parameters"""
        response = requests.get(
            f"{BASE_URL}/api/analytics/overview",
            params={"start_date": "2026-01-01", "end_date": "2026-03-10"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "total_messages_sent" in data


class TestLeadCapture:
    """Test lead capture endpoints"""
    
    def test_get_lead_forms(self, auth_headers):
        """Test getting lead forms"""
        response = requests.get(f"{BASE_URL}/api/leads/forms", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_lead_form(self, auth_headers):
        """Test creating a lead form"""
        form_data = {
            "name": "TEST_Website Contact Form",
            "fields": [
                {"name": "name", "type": "text", "required": True, "label": "Full Name"},
                {"name": "phone", "type": "tel", "required": True, "label": "Phone"},
                {"name": "email", "type": "email", "required": False, "label": "Email"}
            ],
            "redirect_url": "https://example.com/thank-you",
            "auto_tags": ["Website Lead"]
        }
        response = requests.post(f"{BASE_URL}/api/leads/forms", json=form_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_Website Contact Form"
        assert "form_url" in data
        assert len(data["fields"]) == 3
    
    def test_create_webhook(self, auth_headers):
        """Test creating a webhook for lead capture"""
        response = requests.post(f"{BASE_URL}/api/leads/webhook", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "webhook_url" in data
        assert "id" in data


class TestCompliance:
    """Test SMS compliance endpoints"""
    
    def test_get_compliance_settings(self, auth_headers):
        """Test getting compliance settings"""
        response = requests.get(f"{BASE_URL}/api/compliance/settings", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stop_keywords" in data
        assert "opt_in_required" in data
        assert "auto_reply_on_stop" in data
        # Verify default stop keywords
        assert "STOP" in data["stop_keywords"]
        assert "UNSUBSCRIBE" in data["stop_keywords"]
    
    def test_get_opt_outs(self, auth_headers):
        """Test getting opt-out list"""
        response = requests.get(f"{BASE_URL}/api/compliance/opt-outs", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_update_compliance_settings(self, auth_headers):
        """Test updating compliance settings"""
        settings_data = {
            "stop_keywords": ["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT", "OPTOUT"],
            "opt_in_required": True,
            "auto_reply_on_stop": "You have been unsubscribed. Reply START to re-subscribe.",
            "quiet_hours_start": "21:00",
            "quiet_hours_end": "08:00"
        }
        response = requests.put(f"{BASE_URL}/api/compliance/settings", json=settings_data, headers=auth_headers)
        assert response.status_code == 200


class TestRevival:
    """Test dead lead revival endpoints"""
    
    def test_get_revival_campaigns(self, auth_headers):
        """Test getting revival campaigns"""
        response = requests.get(f"{BASE_URL}/api/revival/campaigns", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_create_revival_campaign(self, auth_headers):
        """Test creating a revival campaign"""
        campaign_data = {
            "name": "TEST_30-Day Revival",
            "days_inactive": 30,
            "target_tags": [],
            "exclude_tags": [],
            "message": "Hey {name}, just checking in to see if you're still looking for funding this quarter...",
            "channel": "sms"
        }
        response = requests.post(f"{BASE_URL}/api/revival/campaigns", json=campaign_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == "TEST_30-Day Revival"
        assert data["days_inactive"] == 30
        assert "eligible_contacts" in data


class TestSegments:
    """Test contact segmentation endpoints"""
    
    def test_get_all_tags(self, auth_headers):
        """Test getting all tags"""
        response = requests.get(f"{BASE_URL}/api/segments/tags", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "tags" in data
        assert isinstance(data["tags"], list)
        # Verify system tags exist
        tag_names = [t["tag"] for t in data["tags"]]
        assert "Hot Lead" in tag_names
        assert "Cold Lead" in tag_names
    
    def test_get_pipeline_stats(self, auth_headers):
        """Test getting pipeline statistics"""
        response = requests.get(f"{BASE_URL}/api/segments/pipeline", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "stages" in data
        assert isinstance(data["stages"], list)


class TestNotifications:
    """Test notification endpoints"""
    
    def test_get_notifications(self, auth_headers):
        """Test getting notifications"""
        response = requests.get(f"{BASE_URL}/api/notifications", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data
        assert "unread_count" in data
    
    def test_get_unread_notifications(self, auth_headers):
        """Test getting unread notifications only"""
        response = requests.get(
            f"{BASE_URL}/api/notifications",
            params={"unread_only": True, "limit": 10},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert "notifications" in data


class TestInbox:
    """Test conversation inbox endpoints"""
    
    def test_get_inbox_conversations(self, auth_headers):
        """Test getting inbox conversations"""
        response = requests.get(f"{BASE_URL}/api/inbox/conversations", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_search_conversations(self, auth_headers):
        """Test searching conversations"""
        response = requests.get(
            f"{BASE_URL}/api/inbox/search",
            params={"query": "test"},
            headers=auth_headers
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestAppointments:
    """Test appointment endpoints"""
    
    def test_get_appointment_types(self, auth_headers):
        """Test getting appointment types"""
        response = requests.get(f"{BASE_URL}/api/appointments/types", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
    
    def test_get_appointments(self, auth_headers):
        """Test getting appointments"""
        response = requests.get(f"{BASE_URL}/api/appointments", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
