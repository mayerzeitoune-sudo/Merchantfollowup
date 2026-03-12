"""
Test Multi-Organization Architecture
- Login as org_admin returns role=org_admin
- Organizations CRUD endpoints (org_admin only)
- Add/Remove users to organizations
- Stats endpoint
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestOrgAdminLogin:
    """Test org_admin login and role verification"""
    
    def test_login_org_admin_returns_correct_role(self):
        """Login as org_admin should return role=org_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Token not in response"
        assert "user" in data, "User not in response"
        assert data["user"]["role"] == "org_admin", f"Expected role=org_admin, got {data['user']['role']}"
        assert data["user"]["email"] == "admin@merchant.com"
        print(f"✓ Login successful, role={data['user']['role']}")


class TestOrganizationsAPI:
    """Test Organizations CRUD endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for org_admin"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        assert response.status_code == 200
        self.token = response.json()["token"]
        self.created_org_ids = []
        yield
        # Cleanup created orgs
        for org_id in self.created_org_ids:
            try:
                requests.delete(
                    f"{BASE_URL}/api/organizations/{org_id}",
                    params={"authorization": f"Bearer {self.token}"}
                )
            except:
                pass
    
    def test_get_organizations_list(self):
        """Get list of all organizations"""
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to get orgs: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Response should be a list"
        print(f"✓ Got {len(data)} organizations")
    
    def test_get_organization_stats(self):
        """Get organization stats overview"""
        response = requests.get(
            f"{BASE_URL}/api/organizations/stats/overview",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to get stats: {response.text}"
        
        data = response.json()
        assert "total_organizations" in data
        assert "total_users" in data
        assert "total_admins" in data
        assert "total_clients" in data
        print(f"✓ Stats: {data['total_organizations']} orgs, {data['total_users']} users")
    
    def test_create_organization(self):
        """Create a new organization"""
        org_name = "TEST_Acme Corporation"
        response = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": org_name, "description": "Test organization"},
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to create org: {response.text}"
        
        data = response.json()
        assert data["name"] == org_name
        assert "id" in data
        assert data["is_active"] == True
        self.created_org_ids.append(data["id"])
        print(f"✓ Created organization: {data['name']} (id={data['id']})")
        return data["id"]
    
    def test_create_organization_duplicate_name_fails(self):
        """Creating org with duplicate name should fail"""
        org_name = "TEST_Duplicate Org"
        # Create first
        response1 = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": org_name},
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response1.status_code == 200
        self.created_org_ids.append(response1.json()["id"])
        
        # Try duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": org_name},
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response2.status_code == 400, "Should fail with duplicate name"
        print("✓ Duplicate org name correctly rejected")
    
    def test_get_organization_details(self):
        """Get single organization details"""
        # Create org first
        create_resp = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": "TEST_Details Org"},
            params={"authorization": f"Bearer {self.token}"}
        )
        org_id = create_resp.json()["id"]
        self.created_org_ids.append(org_id)
        
        # Get details
        response = requests.get(
            f"{BASE_URL}/api/organizations/{org_id}",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to get org: {response.text}"
        
        data = response.json()
        assert data["id"] == org_id
        assert "user_count" in data
        assert "admin_count" in data
        assert "client_count" in data
        print(f"✓ Got org details: {data['name']}, {data['user_count']} users")
    
    def test_delete_organization(self):
        """Delete an organization"""
        # Create org first
        create_resp = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": "TEST_To Delete Org"},
            params={"authorization": f"Bearer {self.token}"}
        )
        org_id = create_resp.json()["id"]
        
        # Delete it
        response = requests.delete(
            f"{BASE_URL}/api/organizations/{org_id}",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to delete org: {response.text}"
        
        # Verify deleted
        get_resp = requests.get(
            f"{BASE_URL}/api/organizations/{org_id}",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert get_resp.status_code == 404, "Org should be deleted"
        print("✓ Organization deleted successfully")


class TestOrganizationUsers:
    """Test adding/removing users to organizations"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: login and create test org"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        self.token = response.json()["token"]
        
        # Create test org
        org_resp = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": "TEST_User Management Org"},
            params={"authorization": f"Bearer {self.token}"}
        )
        self.org_id = org_resp.json()["id"]
        self.created_user_ids = []
        yield
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/organizations/{self.org_id}",
            params={"authorization": f"Bearer {self.token}"}
        )
    
    def test_add_user_to_organization(self):
        """Add a new user to organization"""
        response = requests.post(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            json={
                "name": "TEST_John Doe",
                "email": "test_john@testorg.com",
                "password": "testpass123",
                "role": "user"
            },
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to add user: {response.text}"
        
        data = response.json()
        assert "user_id" in data
        assert data["email"] == "test_john@testorg.com"
        assert data["role"] == "user"
        self.created_user_ids.append(data["user_id"])
        print(f"✓ Added user: {data['name']} ({data['role']})")
        return data["user_id"]
    
    def test_add_admin_user_to_organization(self):
        """Add an admin user to organization"""
        response = requests.post(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            json={
                "name": "TEST_Admin Jane",
                "email": "test_jane_admin@testorg.com",
                "password": "adminpass123",
                "role": "admin"
            },
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to add admin: {response.text}"
        
        data = response.json()
        assert data["role"] == "admin"
        self.created_user_ids.append(data["user_id"])
        print(f"✓ Added admin user: {data['name']}")
    
    def test_list_organization_users(self):
        """List users in an organization"""
        # Add a user first
        requests.post(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            json={
                "name": "TEST_List User",
                "email": "test_list_user@testorg.com",
                "password": "pass123",
                "role": "user"
            },
            params={"authorization": f"Bearer {self.token}"}
        )
        
        # List users
        response = requests.get(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to list users: {response.text}"
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        print(f"✓ Listed {len(data)} users in organization")
    
    def test_remove_user_from_organization(self):
        """Remove a user from organization"""
        # Add user first
        add_resp = requests.post(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            json={
                "name": "TEST_Remove User",
                "email": "test_remove_user@testorg.com",
                "password": "pass123",
                "role": "user"
            },
            params={"authorization": f"Bearer {self.token}"}
        )
        user_id = add_resp.json()["user_id"]
        
        # Remove user
        response = requests.delete(
            f"{BASE_URL}/api/organizations/{self.org_id}/users/{user_id}",
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 200, f"Failed to remove user: {response.text}"
        print("✓ User removed from organization")
    
    def test_cannot_create_org_admin_user(self):
        """Should not be able to create org_admin users"""
        response = requests.post(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            json={
                "name": "TEST_Fake OrgAdmin",
                "email": "test_fake_orgadmin@testorg.com",
                "password": "pass123",
                "role": "org_admin"
            },
            params={"authorization": f"Bearer {self.token}"}
        )
        assert response.status_code == 403, "Should not allow creating org_admin"
        print("✓ Correctly prevented org_admin user creation")


class TestNonOrgAdminAccess:
    """Test that non-org_admin users cannot access org management"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup: create a regular user"""
        # Login as org_admin first
        admin_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "admin@merchant.com",
            "password": "admin123"
        })
        self.admin_token = admin_resp.json()["token"]
        
        # Create test org and user
        org_resp = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": "TEST_Access Control Org"},
            params={"authorization": f"Bearer {self.admin_token}"}
        )
        self.org_id = org_resp.json()["id"]
        
        # Create regular user
        user_resp = requests.post(
            f"{BASE_URL}/api/organizations/{self.org_id}/users",
            json={
                "name": "TEST_Regular User",
                "email": "test_regular@testorg.com",
                "password": "userpass123",
                "role": "user"
            },
            params={"authorization": f"Bearer {self.admin_token}"}
        )
        
        # Login as regular user
        login_resp = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "test_regular@testorg.com",
            "password": "userpass123"
        })
        if login_resp.status_code == 200:
            self.user_token = login_resp.json()["token"]
        else:
            self.user_token = None
        
        yield
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/organizations/{self.org_id}",
            params={"authorization": f"Bearer {self.admin_token}"}
        )
    
    def test_regular_user_cannot_list_organizations(self):
        """Regular user should not be able to list all organizations"""
        if not self.user_token:
            pytest.skip("Could not create test user")
        
        response = requests.get(
            f"{BASE_URL}/api/organizations",
            params={"authorization": f"Bearer {self.user_token}"}
        )
        assert response.status_code == 403, f"Should be forbidden, got {response.status_code}"
        print("✓ Regular user correctly denied access to organizations list")
    
    def test_regular_user_cannot_create_organization(self):
        """Regular user should not be able to create organizations"""
        if not self.user_token:
            pytest.skip("Could not create test user")
        
        response = requests.post(
            f"{BASE_URL}/api/organizations",
            json={"name": "TEST_Unauthorized Org"},
            params={"authorization": f"Bearer {self.user_token}"}
        )
        assert response.status_code == 403, f"Should be forbidden, got {response.status_code}"
        print("✓ Regular user correctly denied organization creation")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
