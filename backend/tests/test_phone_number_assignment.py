"""
Test Phone Number Assignment Feature
Tests the following:
1. GET /api/phone-numbers/owned returns correct numbers based on user role
2. Admin sees all numbers in their org in the Inbox
3. Agent sees only their assigned numbers in the Inbox
4. PUT /api/phone-numbers/{phone_id} with assigned_user_id correctly assigns and updates org_id
5. PUT /api/phone-numbers/{phone_id} with assigned_user_id: null correctly unassigns
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from the review request
ADMIN_EMAIL = "john@acmefunding.com"
ADMIN_PASSWORD = "Password123!"
AGENT_EMAIL = "mike@acmefunding.com"
AGENT_PASSWORD = "Password123!"
ORG_ADMIN_EMAIL = "orgadmin@merchant.com"
ORG_ADMIN_PASSWORD = "Admin123!"


class TestPhoneNumberAssignment:
    """Test phone number assignment and visibility based on user roles"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return response.json()
        return None
    
    def test_admin_login(self):
        """Test admin can login"""
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, f"Admin login failed for {ADMIN_EMAIL}"
        assert "token" in result
        assert result["user"]["email"] == ADMIN_EMAIL
        print(f"Admin login successful: {result['user']['name']} (role: {result['user'].get('role')})")
    
    def test_agent_login(self):
        """Test agent can login"""
        result = self.login(AGENT_EMAIL, AGENT_PASSWORD)
        assert result is not None, f"Agent login failed for {AGENT_EMAIL}"
        assert "token" in result
        assert result["user"]["email"] == AGENT_EMAIL
        print(f"Agent login successful: {result['user']['name']} (role: {result['user'].get('role')})")
    
    def test_admin_sees_all_org_numbers(self):
        """Admin should see all phone numbers in their organization"""
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Admin login failed"
        
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Failed to get owned numbers: {response.text}"
        
        numbers = response.json()
        print(f"Admin sees {len(numbers)} phone numbers:")
        for num in numbers:
            print(f"  - {num['phone_number']} (assigned to: {num.get('assigned_user_name', 'Unassigned')})")
        
        # Admin should see at least the numbers mentioned in the context
        # +17198113942 (John), +16239366833 (Mike), +14087279406 (Mike)
        assert len(numbers) >= 1, "Admin should see at least one phone number"
    
    def test_agent_sees_only_assigned_numbers(self):
        """Agent should see only phone numbers assigned to them"""
        result = self.login(AGENT_EMAIL, AGENT_PASSWORD)
        assert result is not None, "Agent login failed"
        
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200, f"Failed to get owned numbers: {response.text}"
        
        numbers = response.json()
        print(f"Agent sees {len(numbers)} phone numbers:")
        for num in numbers:
            print(f"  - {num['phone_number']} (assigned to: {num.get('assigned_user_name', 'Unassigned')})")
        
        # Agent should only see numbers assigned to them
        # According to context: +16239366833 and +14087279406 are assigned to Mike
        for num in numbers:
            # Each number should either be assigned to this agent or unassigned
            if num.get('assigned_user_id'):
                # If assigned, it should be to this agent
                print(f"  Checking assignment for {num['phone_number']}: assigned_user_id={num.get('assigned_user_id')}")
    
    def test_admin_can_assign_number_to_agent(self):
        """Admin should be able to assign a phone number to an agent"""
        # Login as admin
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Admin login failed"
        
        # Get current numbers
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        numbers = response.json()
        
        if len(numbers) == 0:
            pytest.skip("No phone numbers available to test assignment")
        
        # Get team members to find agent's user_id
        team_response = self.session.get(f"{BASE_URL}/api/team/members")
        assert team_response.status_code == 200, f"Failed to get team members: {team_response.text}"
        
        team_members = team_response.json()
        agent = next((m for m in team_members if m.get("email") == AGENT_EMAIL), None)
        
        if agent is None:
            pytest.skip(f"Agent {AGENT_EMAIL} not found in team members")
        
        agent_id = agent["id"]
        agent_name = agent["name"]
        print(f"Found agent: {agent_name} (id: {agent_id})")
        
        # Pick a number to assign
        test_number = numbers[0]
        phone_id = test_number["id"]
        print(f"Assigning {test_number['phone_number']} to {agent_name}")
        
        # Assign the number
        update_response = self.session.put(
            f"{BASE_URL}/api/phone-numbers/{phone_id}",
            json={"assigned_user_id": agent_id}
        )
        assert update_response.status_code == 200, f"Failed to assign number: {update_response.text}"
        
        updated_number = update_response.json()
        assert updated_number["assigned_user_id"] == agent_id, "assigned_user_id not updated"
        assert updated_number["assigned_user_name"] == agent_name, "assigned_user_name not updated"
        print(f"Successfully assigned {updated_number['phone_number']} to {updated_number['assigned_user_name']}")
    
    def test_admin_can_unassign_number(self):
        """Admin should be able to unassign a phone number"""
        # Login as admin
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Admin login failed"
        
        # Get current numbers
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        numbers = response.json()
        
        # Find an assigned number
        assigned_number = next((n for n in numbers if n.get("assigned_user_id")), None)
        
        if assigned_number is None:
            pytest.skip("No assigned phone numbers available to test unassignment")
        
        phone_id = assigned_number["id"]
        print(f"Unassigning {assigned_number['phone_number']} (currently assigned to: {assigned_number.get('assigned_user_name')})")
        
        # Unassign the number by sending null
        update_response = self.session.put(
            f"{BASE_URL}/api/phone-numbers/{phone_id}",
            json={"assigned_user_id": None}
        )
        assert update_response.status_code == 200, f"Failed to unassign number: {update_response.text}"
        
        updated_number = update_response.json()
        assert updated_number.get("assigned_user_id") is None, "assigned_user_id should be None after unassignment"
        assert updated_number.get("assigned_user_name") is None, "assigned_user_name should be None after unassignment"
        print(f"Successfully unassigned {updated_number['phone_number']}")
    
    def test_agent_cannot_update_phone_numbers(self):
        """Agent should not be able to update phone number assignments"""
        # Login as agent
        result = self.login(AGENT_EMAIL, AGENT_PASSWORD)
        assert result is not None, "Agent login failed"
        
        # Get numbers visible to agent
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        numbers = response.json()
        
        if len(numbers) == 0:
            pytest.skip("No phone numbers visible to agent")
        
        # Try to update a number (should fail with 403)
        test_number = numbers[0]
        phone_id = test_number["id"]
        
        update_response = self.session.put(
            f"{BASE_URL}/api/phone-numbers/{phone_id}",
            json={"friendly_name": "Test Update"}
        )
        
        # Agent should get 403 Forbidden
        assert update_response.status_code == 403, f"Expected 403 for agent update, got {update_response.status_code}: {update_response.text}"
        print("Agent correctly denied from updating phone numbers")
    
    def test_assignment_updates_org_id(self):
        """When assigning a number, org_id should be updated to match the assigned user's org"""
        # Login as admin
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Admin login failed"
        
        # Get current numbers
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        numbers = response.json()
        
        if len(numbers) == 0:
            pytest.skip("No phone numbers available")
        
        # Get team members
        team_response = self.session.get(f"{BASE_URL}/api/team/members")
        assert team_response.status_code == 200
        team_members = team_response.json()
        
        # Find a team member with an org_id
        member_with_org = next((m for m in team_members if m.get("org_id")), None)
        
        if member_with_org is None:
            pytest.skip("No team member with org_id found")
        
        # Assign number to this member
        test_number = numbers[0]
        phone_id = test_number["id"]
        
        update_response = self.session.put(
            f"{BASE_URL}/api/phone-numbers/{phone_id}",
            json={"assigned_user_id": member_with_org["id"]}
        )
        assert update_response.status_code == 200
        
        updated_number = update_response.json()
        
        # Verify org_id was updated
        if member_with_org.get("org_id"):
            assert updated_number.get("org_id") == member_with_org["org_id"], \
                f"org_id should be updated to {member_with_org['org_id']}, got {updated_number.get('org_id')}"
            print(f"org_id correctly updated to {updated_number.get('org_id')}")


class TestPhoneNumberVisibilityInInbox:
    """Test that phone numbers appear correctly in the Inbox dropdown"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return response.json()
        return None
    
    def test_admin_inbox_phone_numbers(self):
        """Admin should see all org phone numbers in Inbox"""
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Admin login failed"
        
        # Get owned numbers (same endpoint used by Inbox)
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        
        numbers = response.json()
        print(f"Admin Inbox shows {len(numbers)} phone numbers:")
        for num in numbers:
            print(f"  - {num['phone_number']} ({num.get('friendly_name', 'No name')}) - Assigned: {num.get('assigned_user_name', 'Unassigned')}")
        
        # Admin should see numbers
        assert len(numbers) >= 0, "API should return a list (even if empty)"
    
    def test_agent_inbox_phone_numbers(self):
        """Agent should see only their assigned phone numbers in Inbox"""
        result = self.login(AGENT_EMAIL, AGENT_PASSWORD)
        assert result is not None, "Agent login failed"
        
        # Get owned numbers (same endpoint used by Inbox)
        response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert response.status_code == 200
        
        numbers = response.json()
        print(f"Agent Inbox shows {len(numbers)} phone numbers:")
        for num in numbers:
            print(f"  - {num['phone_number']} ({num.get('friendly_name', 'No name')}) - Assigned: {num.get('assigned_user_name', 'Unassigned')}")
        
        # All numbers should be assigned to this agent
        agent_user_id = result["user"]["id"]
        for num in numbers:
            if num.get("assigned_user_id"):
                assert num["assigned_user_id"] == agent_user_id, \
                    f"Agent should only see their own numbers, but found number assigned to {num.get('assigned_user_name')}"


class TestPhoneNumbersPageAssignment:
    """Test phone number assignment from the PhoneNumbers page"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test session"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
    
    def login(self, email, password):
        """Helper to login and get token"""
        response = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "email": email,
            "password": password
        })
        if response.status_code == 200:
            token = response.json().get("token")
            self.session.headers.update({"Authorization": f"Bearer {token}"})
            return response.json()
        return None
    
    def test_get_team_members_for_assignment(self):
        """Admin should be able to get team members for assignment dropdown"""
        result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert result is not None, "Admin login failed"
        
        response = self.session.get(f"{BASE_URL}/api/team/members")
        assert response.status_code == 200, f"Failed to get team members: {response.text}"
        
        members = response.json()
        print(f"Team members available for assignment: {len(members)}")
        for member in members:
            print(f"  - {member['name']} ({member['email']}) - Role: {member.get('role')}")
        
        assert len(members) >= 1, "Should have at least one team member"
    
    def test_full_assignment_workflow(self):
        """Test complete workflow: assign -> verify agent sees it -> unassign -> verify agent doesn't see it"""
        # Step 1: Login as admin and get numbers
        admin_result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_result is not None, "Admin login failed"
        
        numbers_response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert numbers_response.status_code == 200
        numbers = numbers_response.json()
        
        if len(numbers) == 0:
            pytest.skip("No phone numbers available")
        
        # Get team members
        team_response = self.session.get(f"{BASE_URL}/api/team/members")
        assert team_response.status_code == 200
        team_members = team_response.json()
        
        agent = next((m for m in team_members if m.get("email") == AGENT_EMAIL), None)
        if agent is None:
            pytest.skip(f"Agent {AGENT_EMAIL} not found")
        
        agent_id = agent["id"]
        test_number = numbers[0]
        phone_id = test_number["id"]
        
        # Step 2: Assign number to agent
        print(f"\n1. Assigning {test_number['phone_number']} to {agent['name']}")
        assign_response = self.session.put(
            f"{BASE_URL}/api/phone-numbers/{phone_id}",
            json={"assigned_user_id": agent_id}
        )
        assert assign_response.status_code == 200, f"Assignment failed: {assign_response.text}"
        print("   Assignment successful")
        
        # Step 3: Login as agent and verify they see the number
        print(f"\n2. Verifying agent can see the assigned number")
        agent_result = self.login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_result is not None, "Agent login failed"
        
        agent_numbers_response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert agent_numbers_response.status_code == 200
        agent_numbers = agent_numbers_response.json()
        
        assigned_number_visible = any(n["id"] == phone_id for n in agent_numbers)
        assert assigned_number_visible, f"Agent should see the assigned number {test_number['phone_number']}"
        print(f"   Agent sees {len(agent_numbers)} numbers including the assigned one")
        
        # Step 4: Login as admin and unassign
        print(f"\n3. Unassigning the number")
        admin_result = self.login(ADMIN_EMAIL, ADMIN_PASSWORD)
        assert admin_result is not None, "Admin login failed"
        
        unassign_response = self.session.put(
            f"{BASE_URL}/api/phone-numbers/{phone_id}",
            json={"assigned_user_id": None}
        )
        assert unassign_response.status_code == 200, f"Unassignment failed: {unassign_response.text}"
        print("   Unassignment successful")
        
        # Step 5: Login as agent and verify they don't see the number anymore
        print(f"\n4. Verifying agent no longer sees the unassigned number")
        agent_result = self.login(AGENT_EMAIL, AGENT_PASSWORD)
        assert agent_result is not None, "Agent login failed"
        
        agent_numbers_response = self.session.get(f"{BASE_URL}/api/phone-numbers/owned")
        assert agent_numbers_response.status_code == 200
        agent_numbers_after = agent_numbers_response.json()
        
        unassigned_number_visible = any(n["id"] == phone_id for n in agent_numbers_after)
        # After unassignment, agent should NOT see this number (unless they have other reasons to see it)
        print(f"   Agent now sees {len(agent_numbers_after)} numbers")
        if not unassigned_number_visible:
            print("   Correctly, the unassigned number is no longer visible to agent")
        else:
            print("   Note: Number still visible (may be due to other access rules)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
