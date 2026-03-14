"""
Test suite for OTP verification, Team Leader features, AI summary, and Phone Dialer
Tests: Registration with OTP, OTP verification, Team Leader role assignment, 
       Agent assignment to Team Leaders, Global search, AI summary, Phone Dialer
"""
import pytest
import requests
import os
import uuid
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestRegistrationWithOTP:
    """Test registration flow with OTP verification"""
    
    def test_register_new_user_returns_otp(self):
        """Registration should return OTP for verification"""
        unique_email = f"test_otp_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test OTP User"
        })
        
        print(f"Register response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Verify OTP is returned for testing
        assert "otp" in data, "OTP should be returned in response for testing"
        assert len(data["otp"]) == 6, "OTP should be 6 digits"
        assert data["requires_verification"] == True
        assert data["email"] == unique_email
        
        return unique_email, data["otp"]
    
    def test_verify_otp_success(self):
        """OTP verification should succeed with correct OTP"""
        # First register a user
        unique_email = f"test_verify_{uuid.uuid4().hex[:8]}@example.com"
        
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Verify User"
        })
        
        assert reg_response.status_code == 200
        otp = reg_response.json()["otp"]
        
        # Now verify with OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify", json={
            "email": unique_email,
            "otp": otp
        })
        
        print(f"Verify response: {verify_response.status_code} - {verify_response.json()}")
        
        assert verify_response.status_code == 200
        data = verify_response.json()
        
        assert "token" in data, "Token should be returned after verification"
        assert "user" in data
        assert data["message"] == "Account verified successfully"
    
    def test_verify_otp_invalid_fails(self):
        """OTP verification should fail with wrong OTP"""
        unique_email = f"test_invalid_{uuid.uuid4().hex[:8]}@example.com"
        
        # Register
        reg_response = requests.post(f"{BASE_URL}/api/auth/register", json={
            "email": unique_email,
            "password": "test123456",
            "name": "Test Invalid OTP"
        })
        
        assert reg_response.status_code == 200
        
        # Try to verify with wrong OTP
        verify_response = requests.post(f"{BASE_URL}/api/auth/verify", json={
            "email": unique_email,
            "otp": "000000"  # Wrong OTP
        })
        
        print(f"Invalid OTP response: {verify_response.status_code}")
        
        assert verify_response.status_code == 400
        assert "Invalid OTP" in verify_response.json().get("detail", "")


class TestAdminLogin:
    """Test admin login functionality"""
    
    def test_login_admin_user(self):
        """Login as admin should return correct role"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        
        print(f"Admin login response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] in ["admin", "org_admin"]
        
        return data["token"]


class TestTeamLeaderRoleAssignment:
    """Test Team Leader role assignment from dropdown"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_create_user_with_team_leader_role(self, admin_token):
        """Should be able to create user with team_leader role"""
        unique_email = f"test_tl_{uuid.uuid4().hex[:8]}@example.com"
        
        response = requests.post(
            f"{BASE_URL}/api/team/create-member",
            json={
                "email": unique_email,
                "password": "test123456",
                "name": "Test Team Leader",
                "role": "team_leader"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Create team leader response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("role") == "team_leader", "User should have team_leader role"
        
        return data.get("id")
    
    def test_update_user_role_to_team_leader(self, admin_token):
        """Should be able to update existing user to team_leader role"""
        # First create a regular agent
        unique_email = f"test_agent_{uuid.uuid4().hex[:8]}@example.com"
        
        create_response = requests.post(
            f"{BASE_URL}/api/team/create-member",
            json={
                "email": unique_email,
                "password": "test123456",
                "name": "Test Agent to TL",
                "role": "agent"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        assert create_response.status_code == 200
        user_id = create_response.json()["id"]
        
        # Now update role to team_leader
        update_response = requests.put(
            f"{BASE_URL}/api/team/members/{user_id}/role",
            json={"role": "team_leader"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Update to team_leader response: {update_response.status_code} - {update_response.json()}")
        
        assert update_response.status_code == 200
        assert update_response.json().get("role") == "team_leader"
    
    def test_team_leader_in_valid_roles(self, admin_token):
        """team_leader should be in the list of valid roles"""
        # Try to set an invalid role - should fail
        unique_email = f"test_invalid_role_{uuid.uuid4().hex[:8]}@example.com"
        
        create_response = requests.post(
            f"{BASE_URL}/api/team/create-member",
            json={
                "email": unique_email,
                "password": "test123456",
                "name": "Test Invalid Role",
                "role": "invalid_role"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Invalid role response: {create_response.status_code}")
        
        # Should fail with 400 for invalid role
        assert create_response.status_code == 400


class TestAgentAssignmentToTeamLeader:
    """Test assigning agents to Team Leaders"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_assign_agent_to_team_leader(self, admin_token):
        """Should be able to assign an agent to a team leader"""
        # Create a team leader
        tl_email = f"test_tl_assign_{uuid.uuid4().hex[:8]}@example.com"
        tl_response = requests.post(
            f"{BASE_URL}/api/team/create-member",
            json={
                "email": tl_email,
                "password": "test123456",
                "name": "Test TL for Assignment",
                "role": "team_leader"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert tl_response.status_code == 200
        leader_id = tl_response.json()["id"]
        
        # Create an agent
        agent_email = f"test_agent_assign_{uuid.uuid4().hex[:8]}@example.com"
        agent_response = requests.post(
            f"{BASE_URL}/api/team/create-member",
            json={
                "email": agent_email,
                "password": "test123456",
                "name": "Test Agent for Assignment",
                "role": "agent"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert agent_response.status_code == 200
        agent_id = agent_response.json()["id"]
        
        # Assign agent to team leader
        assign_response = requests.post(
            f"{BASE_URL}/api/team/leaders/{leader_id}/agents",
            json={"agent_id": agent_id},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Assign agent response: {assign_response.status_code} - {assign_response.json()}")
        
        assert assign_response.status_code == 200
        assert "assigned" in assign_response.json().get("message", "").lower() or assign_response.json().get("success")


class TestTeamLeaderDashboard:
    """Test Team Leader Dashboard (My Team page)"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_team_leader_dashboard_endpoint(self, admin_token):
        """Team leader dashboard endpoint should work"""
        response = requests.get(
            f"{BASE_URL}/api/team-leader/dashboard",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Team leader dashboard response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        # Should have agents and totals
        assert "agents" in data
        assert "totals" in data
        assert "agents_count" in data["totals"]
        assert "total_clients" in data["totals"]


class TestGlobalSearch:
    """Test global search by name and phone number"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_search_by_name(self, admin_token):
        """Should be able to search clients by name"""
        # First create a client with unique name
        unique_name = f"SearchTest_{uuid.uuid4().hex[:8]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/clients",
            json={
                "name": unique_name,
                "phone": "+15551234567",
                "email": f"{unique_name.lower()}@test.com"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        
        # Now search for it
        search_response = requests.get(
            f"{BASE_URL}/api/search?q={unique_name}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Search by name response: {search_response.status_code} - {search_response.json()}")
        
        assert search_response.status_code == 200
        data = search_response.json()
        
        assert "clients" in data
        assert len(data["clients"]) > 0
        assert any(unique_name in c.get("name", "") for c in data["clients"])
    
    def test_search_by_phone(self, admin_token):
        """Should be able to search clients by phone number"""
        # Create a client with unique phone
        unique_phone = f"+1555{uuid.uuid4().hex[:7]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/clients",
            json={
                "name": "Phone Search Test",
                "phone": unique_phone
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        
        # Search by phone
        search_response = requests.get(
            f"{BASE_URL}/api/search?q={unique_phone}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Search by phone response: {search_response.status_code} - {search_response.json()}")
        
        assert search_response.status_code == 200
        data = search_response.json()
        
        assert "clients" in data
        assert len(data["clients"]) > 0


class TestAIConversationSummary:
    """Test AI conversation summary on Client Profile page"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_generate_ai_summary_endpoint(self, admin_token):
        """AI summary generation endpoint should work"""
        # First create a client
        unique_name = f"AISummaryTest_{uuid.uuid4().hex[:8]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/clients",
            json={
                "name": unique_name,
                "phone": "+15559876543"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        client_id = create_response.json()["id"]
        
        # Try to generate AI summary
        summary_response = requests.post(
            f"{BASE_URL}/api/clients/{client_id}/generate-summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"AI summary response: {summary_response.status_code} - {summary_response.json()}")
        
        assert summary_response.status_code == 200
        data = summary_response.json()
        
        # Should have summary field (even if no conversations)
        assert "summary" in data
    
    def test_get_existing_summary(self, admin_token):
        """Should be able to get existing AI summary"""
        # Create a client
        unique_name = f"GetSummaryTest_{uuid.uuid4().hex[:8]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/clients",
            json={
                "name": unique_name,
                "phone": "+15551112222"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        client_id = create_response.json()["id"]
        
        # Get summary endpoint
        get_response = requests.get(
            f"{BASE_URL}/api/clients/{client_id}/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Get summary response: {get_response.status_code} - {get_response.json()}")
        
        assert get_response.status_code == 200


class TestPhoneDialer:
    """Test Phone Dialer component functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_initiate_call_endpoint(self, admin_token):
        """Call initiation endpoint should work (mocked when Twilio not configured)"""
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            json={
                "to": "+15551234567",
                "from": "+15559876543"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Initiate call response: {response.status_code} - {response.json()}")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert "call_id" in data
        assert "status" in data
        # Should be mock_initiated when Twilio not configured
        assert data.get("status") in ["mock_initiated", "initiated", "queued"]
    
    def test_initiate_call_requires_numbers(self, admin_token):
        """Call initiation should require both to and from numbers"""
        # Missing 'to' number
        response = requests.post(
            f"{BASE_URL}/api/calls/initiate",
            json={
                "from": "+15559876543"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Missing to number response: {response.status_code}")
        
        assert response.status_code == 400


class TestClientProfile:
    """Test Client Profile page functionality"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_client_profile(self, admin_token):
        """Should be able to get full client profile"""
        # Create a client
        unique_name = f"ProfileTest_{uuid.uuid4().hex[:8]}"
        
        create_response = requests.post(
            f"{BASE_URL}/api/clients",
            json={
                "name": unique_name,
                "phone": "+15553334444",
                "company": "Test Company"
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert create_response.status_code == 200
        client_id = create_response.json()["id"]
        
        # Get profile
        profile_response = requests.get(
            f"{BASE_URL}/api/clients/{client_id}/profile",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Client profile response: {profile_response.status_code} - {profile_response.json()}")
        
        assert profile_response.status_code == 200
        data = profile_response.json()
        
        assert "client" in data
        assert "messages" in data
        assert "stats" in data
        assert data["client"]["name"] == unique_name


class TestTeamMembers:
    """Test team members listing"""
    
    @pytest.fixture
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        return response.json()["token"]
    
    def test_get_team_members(self, admin_token):
        """Should be able to get team members list"""
        response = requests.get(
            f"{BASE_URL}/api/team/members",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        
        print(f"Team members response: {response.status_code} - {response.json()[:2] if response.json() else []}")
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
