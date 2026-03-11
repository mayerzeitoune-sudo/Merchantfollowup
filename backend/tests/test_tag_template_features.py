"""
Test suite for Tag Manager and Template/Call features
Tests:
1. Tag editing on Client Profile page
2. Tag editing on Inbox/Contacts page
3. Quick template sending with from_number
4. Phone call initiation with from_number
5. Template sending with from_number parameter
"""

import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestTagAndTemplateFeatures:
    """Test tag editing and template/call features with from_number"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test data"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login with test credentials
        login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        
        if login_response.status_code != 200:
            # Try alternate credentials
            login_response = self.session.post(f"{BASE_URL}/api/auth/login", json={
                "email": "template_test@example.com",
                "password": "password123"
            })
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            self.token = token
        else:
            pytest.skip("Authentication failed - skipping tests")
        
        yield
        
        # Cleanup - delete test data
        pass
    
    # ============== TAG EDITING TESTS ==============
    
    def test_get_available_tags(self):
        """Test getting available tags list"""
        response = self.session.get(f"{BASE_URL}/api/clients/tags")
        assert response.status_code == 200
        data = response.json()
        assert "tags" in data
        assert len(data["tags"]) > 0
        # Verify expected tags exist
        expected_tags = ["New Lead", "Contacted", "Interested", "Follow Up", "Funded"]
        for tag in expected_tags:
            assert tag in data["tags"], f"Expected tag '{tag}' not found"
        print(f"PASS: Available tags retrieved - {len(data['tags'])} tags")
    
    def test_create_client_with_tags(self):
        """Test creating a client with tags"""
        client_data = {
            "name": f"TEST_TagClient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}",
            "email": f"test_{uuid.uuid4().hex[:8]}@example.com",
            "tags": ["New Lead", "Interested"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == client_data["name"]
        assert "New Lead" in data["tags"]
        assert "Interested" in data["tags"]
        
        # Store client_id for cleanup
        self.test_client_id = data["id"]
        print(f"PASS: Client created with tags - {data['tags']}")
        return data["id"]
    
    def test_update_client_tags(self):
        """Test updating client tags (add/remove)"""
        # First create a client
        client_id = self.test_create_client_with_tags()
        
        # Update tags - add new tag
        update_response = self.session.put(f"{BASE_URL}/api/clients/{client_id}", json={
            "tags": ["New Lead", "Interested", "Follow Up"]
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert "Follow Up" in data["tags"]
        print(f"PASS: Tag added - now has {data['tags']}")
        
        # Update tags - remove a tag
        update_response = self.session.put(f"{BASE_URL}/api/clients/{client_id}", json={
            "tags": ["Interested", "Follow Up"]
        })
        assert update_response.status_code == 200
        data = update_response.json()
        assert "New Lead" not in data["tags"]
        assert "Interested" in data["tags"]
        print(f"PASS: Tag removed - now has {data['tags']}")
        
        # Verify persistence with GET
        get_response = self.session.get(f"{BASE_URL}/api/clients/{client_id}")
        assert get_response.status_code == 200
        data = get_response.json()
        assert "New Lead" not in data["tags"]
        assert "Interested" in data["tags"]
        assert "Follow Up" in data["tags"]
        print(f"PASS: Tags persisted correctly - {data['tags']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    def test_filter_clients_by_tag(self):
        """Test filtering clients by tag"""
        # Create clients with different tags
        client1_data = {
            "name": f"TEST_FilterClient1_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}",
            "tags": ["New Lead"]
        }
        client2_data = {
            "name": f"TEST_FilterClient2_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}",
            "tags": ["Funded"]
        }
        
        resp1 = self.session.post(f"{BASE_URL}/api/clients", json=client1_data)
        resp2 = self.session.post(f"{BASE_URL}/api/clients", json=client2_data)
        
        client1_id = resp1.json()["id"]
        client2_id = resp2.json()["id"]
        
        # Filter by "New Lead" tag
        filter_response = self.session.get(f"{BASE_URL}/api/clients", params={"tag": "New Lead"})
        assert filter_response.status_code == 200
        data = filter_response.json()
        
        # Verify filtered results
        client_names = [c["name"] for c in data]
        assert client1_data["name"] in client_names
        # client2 should not be in results (has "Funded" tag)
        print(f"PASS: Tag filter works - found {len(data)} clients with 'New Lead' tag")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client1_id}")
        self.session.delete(f"{BASE_URL}/api/clients/{client2_id}")
    
    # ============== PHONE NUMBER TESTS ==============
    
    def test_get_owned_phone_numbers(self):
        """Test getting owned phone numbers"""
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} owned phone numbers")
        return data
    
    def test_purchase_phone_number(self):
        """Test purchasing/adding a phone number"""
        phone_data = {
            "phone_number": f"+1555{uuid.uuid4().hex[:7]}",
            "friendly_name": "Test Number",
            "provider": "twilio"
        }
        
        response = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json=phone_data)
        assert response.status_code == 200
        data = response.json()
        assert data["phone_number"] == phone_data["phone_number"]
        assert data["friendly_name"] == phone_data["friendly_name"]
        print(f"PASS: Phone number purchased - {data['phone_number']}")
        
        # Store for later tests
        self.test_phone_id = data["id"]
        self.test_phone_number = data["phone_number"]
        return data
    
    # ============== TEMPLATE TESTS ==============
    
    def test_get_templates(self):
        """Test getting message templates"""
        response = self.session.get(f"{BASE_URL}/api/templates")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"PASS: Retrieved {len(data)} templates")
        return data
    
    def test_create_template(self):
        """Test creating a message template"""
        template_data = {
            "name": f"TEST_Template_{uuid.uuid4().hex[:8]}",
            "category": "Follow Up",
            "content": "Hi {client_name}, this is a follow-up message. Your balance is ${client_balance}.",
            "variables": ["client_name", "client_balance"]
        }
        
        response = self.session.post(f"{BASE_URL}/api/templates", json=template_data)
        assert response.status_code == 200
        data = response.json()
        assert data["name"] == template_data["name"]
        assert data["content"] == template_data["content"]
        print(f"PASS: Template created - {data['name']}")
        
        self.test_template_id = data["id"]
        return data
    
    # ============== SEND TEMPLATE WITH FROM_NUMBER TESTS ==============
    
    def test_send_template_with_from_number(self):
        """Test sending template message with specific from_number"""
        # First create a client
        client_data = {
            "name": f"TEST_TemplateRecipient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}",
            "balance": 1500.00
        }
        client_resp = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = client_resp.json()["id"]
        
        # Create a phone number
        phone_data = {
            "phone_number": f"+1555{uuid.uuid4().hex[:7]}",
            "friendly_name": "Template Test Number",
            "provider": "twilio"
        }
        phone_resp = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json=phone_data)
        phone_number = phone_resp.json()["phone_number"]
        phone_id = phone_resp.json()["id"]
        
        # Create a template
        template_data = {
            "name": f"TEST_SendTemplate_{uuid.uuid4().hex[:8]}",
            "category": "Payment Reminder",
            "content": "Hi {client_name}, your balance is ${client_balance}. Please pay soon.",
            "variables": ["client_name", "client_balance"]
        }
        template_resp = self.session.post(f"{BASE_URL}/api/templates", json=template_data)
        template_id = template_resp.json()["id"]
        
        # Send template with from_number
        send_data = {
            "template_id": template_id,
            "variables": {},
            "from_number": phone_number
        }
        
        send_response = self.session.post(
            f"{BASE_URL}/api/contacts/{client_id}/send-template",
            json=send_data
        )
        
        assert send_response.status_code == 200
        data = send_response.json()
        assert "message_id" in data
        assert data["from_number"] == phone_number
        assert client_data["name"] in data["content"]  # Variable substituted
        print(f"PASS: Template sent with from_number - {data['from_number']}")
        
        # Verify message in conversation
        conv_response = self.session.get(
            f"{BASE_URL}/api/contacts/{client_id}/conversation",
            params={"from_number": phone_number}
        )
        assert conv_response.status_code == 200
        messages = conv_response.json()["messages"]
        assert len(messages) > 0
        assert messages[-1]["from_number"] == phone_number
        print(f"PASS: Message stored with correct from_number in conversation")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        self.session.delete(f"{BASE_URL}/api/phone-numbers/{phone_id}")
        self.session.delete(f"{BASE_URL}/api/templates/{template_id}")
    
    def test_send_template_without_from_number(self):
        """Test sending template message without from_number (default)"""
        # Create a client
        client_data = {
            "name": f"TEST_DefaultRecipient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}",
            "balance": 2000.00
        }
        client_resp = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = client_resp.json()["id"]
        
        # Create a template
        template_data = {
            "name": f"TEST_DefaultTemplate_{uuid.uuid4().hex[:8]}",
            "category": "General",
            "content": "Hello {client_name}!",
            "variables": ["client_name"]
        }
        template_resp = self.session.post(f"{BASE_URL}/api/templates", json=template_data)
        template_id = template_resp.json()["id"]
        
        # Send template without from_number
        send_data = {
            "template_id": template_id,
            "variables": {}
        }
        
        send_response = self.session.post(
            f"{BASE_URL}/api/contacts/{client_id}/send-template",
            json=send_data
        )
        
        assert send_response.status_code == 200
        data = send_response.json()
        assert "message_id" in data
        assert data["from_number"] is None  # No from_number specified
        print(f"PASS: Template sent without from_number (default)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        self.session.delete(f"{BASE_URL}/api/templates/{template_id}")
    
    # ============== CALL INITIATION WITH FROM_NUMBER TESTS ==============
    
    def test_initiate_call_with_from_number(self):
        """Test initiating call with specific from_number"""
        # Create a client
        client_data = {
            "name": f"TEST_CallRecipient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}"
        }
        client_resp = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = client_resp.json()["id"]
        
        # Create a phone number
        phone_data = {
            "phone_number": f"+1555{uuid.uuid4().hex[:7]}",
            "friendly_name": "Call Test Number",
            "provider": "twilio"
        }
        phone_resp = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json=phone_data)
        phone_number = phone_resp.json()["phone_number"]
        phone_id = phone_resp.json()["id"]
        
        # Initiate call with from_number
        call_response = self.session.post(
            f"{BASE_URL}/api/contacts/{client_id}/initiate-call",
            params={"from_number": phone_number}
        )
        
        assert call_response.status_code == 200
        data = call_response.json()
        assert "call_id" in data
        assert data["from_number"] == phone_number
        assert data["client_phone"] == client_data["phone"]
        print(f"PASS: Call initiated with from_number - {data['from_number']}")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        self.session.delete(f"{BASE_URL}/api/phone-numbers/{phone_id}")
    
    def test_initiate_call_without_from_number(self):
        """Test initiating call without from_number (default)"""
        # Create a client
        client_data = {
            "name": f"TEST_DefaultCallRecipient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}"
        }
        client_resp = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = client_resp.json()["id"]
        
        # Initiate call without from_number
        call_response = self.session.post(
            f"{BASE_URL}/api/contacts/{client_id}/initiate-call"
        )
        
        assert call_response.status_code == 200
        data = call_response.json()
        assert "call_id" in data
        assert data["from_number"] is None  # No from_number specified
        print(f"PASS: Call initiated without from_number (default)")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    # ============== CONVERSATION CHAIN TESTS ==============
    
    def test_get_conversation_chains(self):
        """Test getting conversation chains for a client"""
        # Create a client
        client_data = {
            "name": f"TEST_ChainClient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}"
        }
        client_resp = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = client_resp.json()["id"]
        
        # Get chains (should have default)
        chains_response = self.session.get(f"{BASE_URL}/api/contacts/{client_id}/chains")
        assert chains_response.status_code == 200
        data = chains_response.json()
        assert "chains" in data
        assert len(data["chains"]) > 0
        print(f"PASS: Retrieved {len(data['chains'])} conversation chains")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
    
    def test_send_sms_with_from_number(self):
        """Test sending SMS with specific from_number"""
        # Create a client
        client_data = {
            "name": f"TEST_SMSRecipient_{uuid.uuid4().hex[:8]}",
            "phone": f"+1555{uuid.uuid4().hex[:7]}"
        }
        client_resp = self.session.post(f"{BASE_URL}/api/clients", json=client_data)
        client_id = client_resp.json()["id"]
        
        # Create a phone number
        phone_data = {
            "phone_number": f"+1555{uuid.uuid4().hex[:7]}",
            "friendly_name": "SMS Test Number",
            "provider": "twilio"
        }
        phone_resp = self.session.post(f"{BASE_URL}/api/phone-numbers/purchase", json=phone_data)
        phone_number = phone_resp.json()["phone_number"]
        phone_id = phone_resp.json()["id"]
        
        # Send SMS with from_number
        sms_response = self.session.post(
            f"{BASE_URL}/api/contacts/{client_id}/send-sms",
            params={"message": "Test message", "from_number": phone_number}
        )
        
        assert sms_response.status_code == 200
        data = sms_response.json()
        assert "message_id" in data
        assert data["from_number"] == phone_number
        print(f"PASS: SMS sent with from_number - {data['from_number']}")
        
        # Verify in conversation
        conv_response = self.session.get(
            f"{BASE_URL}/api/contacts/{client_id}/conversation",
            params={"from_number": phone_number}
        )
        assert conv_response.status_code == 200
        messages = conv_response.json()["messages"]
        assert len(messages) > 0
        assert messages[-1]["from_number"] == phone_number
        print(f"PASS: SMS stored with correct from_number")
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/clients/{client_id}")
        self.session.delete(f"{BASE_URL}/api/phone-numbers/{phone_id}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
