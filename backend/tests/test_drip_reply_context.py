"""
Test suite for Drip Campaign Reply Context Feature
Tests the ability to track and display original outbound messages when customers reply
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestDripReplyContextFeature:
    """Tests for drip campaign reply context feature"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        self.token = None
        self.test_client_id = None
        
    def get_auth_token(self):
        """Get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        self.token = response.json().get("token")
        self.session.headers.update({"Authorization": f"Bearer {self.token}"})
        return self.token
    
    def create_test_client(self):
        """Create a test client for messaging tests"""
        response = self.session.post(f"{BASE_URL}/api/clients", json={
            "name": f"TEST_ReplyContext_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}",
            "email": "test@example.com",
            "tags": ["New Lead"]
        })
        assert response.status_code == 200, f"Failed to create client: {response.text}"
        self.test_client_id = response.json()["id"]
        return self.test_client_id
    
    def cleanup_test_client(self):
        """Delete test client"""
        if self.test_client_id:
            self.session.delete(f"{BASE_URL}/api/clients/{self.test_client_id}")
    
    # ============== SEND SMS ENDPOINT TESTS ==============
    
    def test_send_sms_basic(self):
        """Test basic SMS sending without campaign info"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            response = self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "Hello, this is a test message"
            })
            
            assert response.status_code == 200, f"Send SMS failed: {response.text}"
            data = response.json()
            assert "message_id" in data
            assert data.get("status") in ["sent", "pending_provider"]
            print(f"✓ Basic SMS sent successfully: {data['message_id']}")
        finally:
            self.cleanup_test_client()
    
    def test_send_sms_with_campaign_info(self):
        """Test SMS sending with campaign_id and campaign_name parameters"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # Send SMS with campaign info
            response = self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "Welcome to our drip campaign!",
                "campaign_id": "test-campaign-123",
                "campaign_name": "Welcome Series"
            })
            
            assert response.status_code == 200, f"Send SMS with campaign failed: {response.text}"
            data = response.json()
            assert "message_id" in data
            print(f"✓ SMS with campaign info sent: {data['message_id']}")
            
            # Verify the message was stored with campaign info by fetching conversation
            conv_response = self.session.get(f"{BASE_URL}/api/contacts/{client_id}/conversation")
            assert conv_response.status_code == 200
            messages = conv_response.json().get("messages", [])
            
            # Find our message
            campaign_msg = next((m for m in messages if m.get("campaign_name") == "Welcome Series"), None)
            assert campaign_msg is not None, "Campaign message not found in conversation"
            assert campaign_msg.get("campaign_id") == "test-campaign-123"
            print(f"✓ Campaign info stored correctly in message")
        finally:
            self.cleanup_test_client()
    
    # ============== SIMULATE INBOUND ENDPOINT TESTS ==============
    
    def test_simulate_inbound_basic(self):
        """Test simulating an inbound SMS reply"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # First send an outbound message
            self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "Hi there! How can we help you today?"
            })
            
            # Simulate inbound reply
            response = self.session.post(f"{BASE_URL}/api/sms/simulate-inbound", json={
                "client_id": client_id,
                "message": "I'm interested in your services"
            })
            
            assert response.status_code == 200, f"Simulate inbound failed: {response.text}"
            data = response.json()
            assert "message_id" in data
            assert data.get("client_name") is not None
            print(f"✓ Simulated inbound SMS created: {data['message_id']}")
        finally:
            self.cleanup_test_client()
    
    def test_simulate_inbound_with_responding_to_context(self):
        """Test that simulated inbound links to last outbound message"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # Send outbound message with campaign info
            outbound_msg = "Special offer: Get 20% off your first purchase!"
            self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": outbound_msg,
                "campaign_id": "promo-campaign-456",
                "campaign_name": "Summer Promo"
            })
            
            # Simulate customer reply
            response = self.session.post(f"{BASE_URL}/api/sms/simulate-inbound", json={
                "client_id": client_id,
                "message": "Yes, I want the discount!"
            })
            
            assert response.status_code == 200, f"Simulate inbound failed: {response.text}"
            data = response.json()
            
            # Verify responding_to context is populated
            assert data.get("responding_to") is not None, "responding_to should be populated"
            assert outbound_msg[:50] in data.get("responding_to", ""), "responding_to should contain original message"
            assert data.get("campaign_name") == "Summer Promo", "campaign_name should be inherited"
            print(f"✓ Inbound message has responding_to context: {data['responding_to'][:50]}...")
            print(f"✓ Campaign name inherited: {data['campaign_name']}")
        finally:
            self.cleanup_test_client()
    
    def test_simulate_inbound_no_prior_outbound(self):
        """Test simulating inbound when there's no prior outbound message"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # Simulate inbound without any prior outbound
            response = self.session.post(f"{BASE_URL}/api/sms/simulate-inbound", json={
                "client_id": client_id,
                "message": "Hello, I found your number online"
            })
            
            assert response.status_code == 200, f"Simulate inbound failed: {response.text}"
            data = response.json()
            assert "message_id" in data
            # responding_to should be None when no prior outbound
            assert data.get("responding_to") is None, "responding_to should be None when no prior outbound"
            print(f"✓ Inbound without prior outbound handled correctly")
        finally:
            self.cleanup_test_client()
    
    # ============== CONVERSATION ENDPOINT TESTS ==============
    
    def test_conversation_returns_responding_to_field(self):
        """Test that GET conversation returns messages with responding_to field"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # Send outbound with campaign
            self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "Follow up: Did you receive our proposal?",
                "campaign_name": "Follow Up Campaign"
            })
            
            # Simulate reply
            self.session.post(f"{BASE_URL}/api/sms/simulate-inbound", json={
                "client_id": client_id,
                "message": "Yes, I'm reviewing it now"
            })
            
            # Get conversation
            response = self.session.get(f"{BASE_URL}/api/contacts/{client_id}/conversation")
            assert response.status_code == 200, f"Get conversation failed: {response.text}"
            
            data = response.json()
            messages = data.get("messages", [])
            assert len(messages) >= 2, "Should have at least 2 messages"
            
            # Find inbound message
            inbound_msg = next((m for m in messages if m.get("direction") == "inbound"), None)
            assert inbound_msg is not None, "Inbound message not found"
            
            # Verify responding_to and campaign_name fields exist
            assert "responding_to" in inbound_msg, "responding_to field should exist"
            assert "campaign_name" in inbound_msg, "campaign_name field should exist"
            
            print(f"✓ Conversation includes responding_to: {inbound_msg.get('responding_to', '')[:50]}...")
            print(f"✓ Conversation includes campaign_name: {inbound_msg.get('campaign_name')}")
        finally:
            self.cleanup_test_client()
    
    def test_conversation_outbound_has_campaign_name(self):
        """Test that outbound messages have campaign_name when sent from campaign"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # Send outbound with campaign info
            self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "Welcome to our newsletter!",
                "campaign_id": "newsletter-001",
                "campaign_name": "Newsletter Signup"
            })
            
            # Get conversation
            response = self.session.get(f"{BASE_URL}/api/contacts/{client_id}/conversation")
            assert response.status_code == 200
            
            messages = response.json().get("messages", [])
            outbound_msg = next((m for m in messages if m.get("direction") == "outbound"), None)
            
            assert outbound_msg is not None, "Outbound message not found"
            assert outbound_msg.get("campaign_name") == "Newsletter Signup", "campaign_name should be set"
            assert outbound_msg.get("campaign_id") == "newsletter-001", "campaign_id should be set"
            
            print(f"✓ Outbound message has campaign_name: {outbound_msg.get('campaign_name')}")
        finally:
            self.cleanup_test_client()
    
    # ============== EDGE CASES ==============
    
    def test_multiple_outbound_messages_reply_links_to_latest(self):
        """Test that reply links to the most recent outbound message"""
        self.get_auth_token()
        client_id = self.create_test_client()
        
        try:
            # Send first outbound
            self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "First message - old",
                "campaign_name": "Campaign A"
            })
            
            # Send second outbound
            self.session.post(f"{BASE_URL}/api/contacts/{client_id}/send-sms", json={
                "message": "Second message - latest",
                "campaign_name": "Campaign B"
            })
            
            # Simulate reply
            response = self.session.post(f"{BASE_URL}/api/sms/simulate-inbound", json={
                "client_id": client_id,
                "message": "Replying to your message"
            })
            
            assert response.status_code == 200
            data = response.json()
            
            # Should link to the latest (second) message
            assert "Second message" in data.get("responding_to", ""), "Should link to latest outbound"
            assert data.get("campaign_name") == "Campaign B", "Should inherit latest campaign name"
            
            print(f"✓ Reply correctly links to latest outbound message")
        finally:
            self.cleanup_test_client()
    
    def test_invalid_client_id_returns_404(self):
        """Test that invalid client_id returns 404"""
        self.get_auth_token()
        
        response = self.session.post(f"{BASE_URL}/api/sms/simulate-inbound", json={
            "client_id": "non-existent-client-id",
            "message": "Test message"
        })
        
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"
        print(f"✓ Invalid client_id correctly returns 404")


class TestExistingTestClient:
    """Tests using the existing test client mentioned in the request"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test fixtures"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        # Test client ID from the request
        self.test_client_id = "2f6e8b4e-072b-4bb4-8ea3-8c2308861556"
        
    def get_auth_token(self):
        """Get authentication token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return token
        return None
    
    def test_existing_client_conversation(self):
        """Test fetching conversation for existing test client"""
        token = self.get_auth_token()
        if not token:
            pytest.skip("Could not authenticate")
        
        response = self.session.get(f"{BASE_URL}/api/contacts/{self.test_client_id}/conversation")
        
        # Client may or may not exist
        if response.status_code == 200:
            data = response.json()
            messages = data.get("messages", [])
            print(f"✓ Found {len(messages)} messages for test client")
            
            # Check if any messages have responding_to or campaign_name
            for msg in messages:
                if msg.get("responding_to"):
                    print(f"  - Message has responding_to: {msg['responding_to'][:50]}...")
                if msg.get("campaign_name"):
                    print(f"  - Message has campaign_name: {msg['campaign_name']}")
        else:
            print(f"Test client not found (status {response.status_code}) - this is OK for new environments")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
