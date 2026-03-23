import requests
import sys
import json
from datetime import datetime, timedelta

class SMSPlatformTester:
    def __init__(self, base_url="https://merchant-crm-dev.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_user_email = "testuser@example.com"
        self.test_user_password = "testpass123"
        self.created_client_id = None
        self.created_reminder_id = None
        self.created_followup_id = None
        self.created_campaign_id = None
        self.created_provider_id = None
        
        # Organization and impersonation test data
        self.org_admin_token = None
        self.org_admin_user_id = None
        self.created_org_id = None
        self.org_admin_user = None
        self.regular_admin_token = None
        self.regular_admin_user_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details
        })

    def make_request(self, method, endpoint, data=None, expected_status=200, auth_required=True):
        """Make HTTP request with error handling"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=10)

            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
            except:
                response_data = {"raw_response": response.text}

            return success, response_data, response.status_code

        except Exception as e:
            return False, {"error": str(e)}, 0

    # ============== AUTH TESTS ==============
    
    def test_register_user(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "email": test_email,
            "password": "testpass123",
            "name": "Test User",
            "phone": "+1234567890"
        }
        
        success, response, status = self.make_request('POST', 'auth/register', data, 200, False)
        
        if success and 'otp' in response:
            self.test_user_email = test_email
            self.log_result("User Registration", True)
            return response.get('otp')
        else:
            self.log_result("User Registration", False, f"Status: {status}, Response: {response}")
            return None

    def test_verify_otp(self, otp):
        """Test OTP verification"""
        if not otp:
            self.log_result("OTP Verification", False, "No OTP provided")
            return False
            
        data = {
            "email": self.test_user_email,
            "otp": otp
        }
        
        success, response, status = self.make_request('POST', 'auth/verify', data, 200, False)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_result("OTP Verification", True)
            return True
        else:
            self.log_result("OTP Verification", False, f"Status: {status}, Response: {response}")
            return False

    def test_login(self):
        """Test user login"""
        data = {
            "email": self.test_user_email,
            "password": "testpass123"  # Use the correct password
        }
        
        success, response, status = self.make_request('POST', 'auth/login', data, 200, False)
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.log_result("User Login", True)
            return True
        else:
            self.log_result("User Login", False, f"Status: {status}, Response: {response}")
            return False

    def test_forgot_password(self):
        """Test forgot password"""
        data = {"email": self.test_user_email}
        
        success, response, status = self.make_request('POST', 'auth/forgot-password', data, 200, False)
        
        if success and 'message' in response:
            self.log_result("Forgot Password", True)
            return response.get('otp')
        else:
            self.log_result("Forgot Password", False, f"Status: {status}, Response: {response}")
            return None

    def test_get_user_profile(self):
        """Test get current user profile"""
        success, response, status = self.make_request('GET', 'auth/me', expected_status=200)
        
        if success and 'email' in response:
            self.log_result("Get User Profile", True)
            return True
        else:
            self.log_result("Get User Profile", False, f"Status: {status}, Response: {response}")
            return False

    # ============== CLIENT TESTS ==============
    
    def test_create_client(self):
        """Test client creation"""
        data = {
            "name": "Test Client",
            "email": "client@example.com",
            "phone": "+1987654321",
            "company": "Test Company",
            "notes": "Test client for API testing",
            "balance": 150.50
        }
        
        success, response, status = self.make_request('POST', 'clients', data, 200)
        
        if success and 'id' in response:
            self.created_client_id = response['id']
            self.log_result("Create Client", True)
            return True
        else:
            self.log_result("Create Client", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_clients(self):
        """Test get all clients"""
        success, response, status = self.make_request('GET', 'clients', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Get All Clients", True)
            return True
        else:
            self.log_result("Get All Clients", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_client_by_id(self):
        """Test get client by ID"""
        if not self.created_client_id:
            self.log_result("Get Client by ID", False, "No client ID available")
            return False
            
        success, response, status = self.make_request('GET', f'clients/{self.created_client_id}', expected_status=200)
        
        if success and response.get('id') == self.created_client_id:
            self.log_result("Get Client by ID", True)
            return True
        else:
            self.log_result("Get Client by ID", False, f"Status: {status}, Response: {response}")
            return False

    def test_update_client(self):
        """Test client update"""
        if not self.created_client_id:
            self.log_result("Update Client", False, "No client ID available")
            return False
            
        data = {
            "name": "Updated Test Client",
            "balance": 200.00
        }
        
        success, response, status = self.make_request('PUT', f'clients/{self.created_client_id}', data, 200)
        
        if success and response.get('name') == "Updated Test Client":
            self.log_result("Update Client", True)
            return True
        else:
            self.log_result("Update Client", False, f"Status: {status}, Response: {response}")
            return False

    # ============== REMINDER TESTS ==============
    
    def test_create_reminder(self):
        """Test reminder creation"""
        if not self.created_client_id:
            self.log_result("Create Reminder", False, "No client ID available")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        next_week = (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
        data = {
            "client_id": self.created_client_id,
            "amount_due": 150.50,
            "start_date": tomorrow,
            "end_date": next_week,
            "message": "Test payment reminder message"
        }
        
        success, response, status = self.make_request('POST', 'reminders', data, 200)
        
        if success and 'id' in response:
            self.created_reminder_id = response['id']
            self.log_result("Create Reminder", True)
            return True
        else:
            self.log_result("Create Reminder", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_reminders(self):
        """Test get all reminders"""
        success, response, status = self.make_request('GET', 'reminders', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Get All Reminders", True)
            return True
        else:
            self.log_result("Get All Reminders", False, f"Status: {status}, Response: {response}")
            return False

    def test_send_reminder_with_provider(self):
        """Test sending reminder with SMS provider configured"""
        if not self.created_reminder_id:
            self.log_result("Send Reminder with Provider", False, "No reminder ID available")
            return False
            
        success, response, status = self.make_request('POST', f'reminders/{self.created_reminder_id}/send', expected_status=200)
        
        if success and 'message' in response and 'sent_at' in response:
            self.log_result("Send Reminder with Provider", True)
            return True
        else:
            self.log_result("Send Reminder with Provider", False, f"Status: {status}, Response: {response}")
            return False

    # ============== FOLLOW-UP TESTS ==============
    
    def test_create_followup(self):
        """Test follow-up creation"""
        if not self.created_client_id:
            self.log_result("Create Follow-up", False, "No client ID available")
            return False
            
        tomorrow = (datetime.now() + timedelta(days=1)).strftime('%Y-%m-%d')
        data = {
            "client_id": self.created_client_id,
            "title": "Payment Follow-up Call",
            "description": "Call client about overdue payment",
            "scheduled_date": tomorrow,
            "scheduled_time": "14:00",
            "reminder_type": "call"
        }
        
        success, response, status = self.make_request('POST', 'followups', data, 200)
        
        if success and 'id' in response:
            self.created_followup_id = response['id']
            self.log_result("Create Follow-up", True)
            return True
        else:
            self.log_result("Create Follow-up", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_followups(self):
        """Test get all follow-ups"""
        success, response, status = self.make_request('GET', 'followups', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Get All Follow-ups", True)
            return True
        else:
            self.log_result("Get All Follow-ups", False, f"Status: {status}, Response: {response}")
            return False

    # ============== CAMPAIGN TESTS ==============
    
    def test_create_campaign(self):
        """Test campaign creation"""
        data = {
            "name": "Test Payment Campaign",
            "description": "Automated payment reminder campaign",
            "initial_message": "Hi {name}, this is a reminder about your payment of ${amount}. Reply YES to confirm.",
            "triggers": [
                {
                    "keywords": ["yes", "confirm", "ok"],
                    "response_message": "Thank you for confirming! We've received your response.",
                    "action": "reply"
                }
            ],
            "delay_hours": 24,
            "follow_up_messages": ["This is a follow-up reminder about your payment."],
            "status": "draft"
        }
        
        success, response, status = self.make_request('POST', 'campaigns', data, 200)
        
        if success and 'id' in response:
            self.created_campaign_id = response['id']
            self.log_result("Create Campaign", True)
            return True
        else:
            self.log_result("Create Campaign", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_campaigns(self):
        """Test get all campaigns"""
        success, response, status = self.make_request('GET', 'campaigns', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Get All Campaigns", True)
            return True
        else:
            self.log_result("Get All Campaigns", False, f"Status: {status}, Response: {response}")
            return False

    # ============== SMS PROVIDER TESTS ==============
    
    def test_create_sms_provider(self):
        """Test SMS provider creation"""
        data = {
            "provider": "twilio",
            "account_sid": "test_account_sid",
            "auth_token": "test_auth_token",
            "from_number": "+1234567890",
            "is_active": True
        }
        
        success, response, status = self.make_request('POST', 'sms-providers', data, 200)
        
        if success and 'id' in response:
            self.created_provider_id = response['id']
            self.log_result("Create SMS Provider", True)
            return True
        else:
            self.log_result("Create SMS Provider", False, f"Status: {status}, Response: {response}")
            return False

    def test_get_sms_providers(self):
        """Test get SMS providers"""
        success, response, status = self.make_request('GET', 'sms-providers', expected_status=200)
        
        if success and isinstance(response, list):
            self.log_result("Get SMS Providers", True)
            return True
        else:
            self.log_result("Get SMS Providers", False, f"Status: {status}, Response: {response}")
            return False

    # ============== ORGANIZATION & IMPERSONATION TESTS ==============
    
    def test_create_org_admin_user(self):
        """Test logging in as existing org_admin user"""
        # Use the existing org_admin user that was promoted
        test_email = "test_162441@example.com"  # The first user that was promoted to org_admin
        data = {
            "email": test_email,
            "password": "testpass123"
        }
        
        success, response, status = self.make_request('POST', 'auth/login', data, 200, False)
        
        if success and 'token' in response:
            self.org_admin_token = response['token']
            self.org_admin_user_id = response['user']['id']
            self.org_admin_user = {
                "email": test_email,
                "password": "testpass123",
                "id": self.org_admin_user_id,
                "name": response['user']['name']
            }
            
            # Verify the user has org_admin role
            if response['user'].get('role') == 'org_admin':
                self.log_result("Login as Org Admin User", True)
                return True
            else:
                self.log_result("Login as Org Admin User", False, f"User role is {response['user'].get('role')}, expected org_admin")
                return False
        else:
            self.log_result("Login as Org Admin User", False, f"Login failed: Status {status}, Response: {response}")
            return False

    def test_create_organization(self):
        """Test creating an organization"""
        if not self.org_admin_token:
            self.log_result("Create Organization", False, "No org admin token available")
            return False
            
        data = {
            "name": f"Test Organization {datetime.now().strftime('%H%M%S')}",
            "description": "Test organization for API testing"
        }
        
        # Use query parameter for authorization as per the API design
        success, response, status = self.make_request('POST', f'organizations?authorization=Bearer {self.org_admin_token}', data, 200, False)
        
        if success and 'id' in response:
            self.created_org_id = response['id']
            self.log_result("Create Organization", True)
            return True
        else:
            self.log_result("Create Organization", False, f"Status: {status}, Response: {response}")
            return False

    def test_create_regular_admin_in_org(self):
        """Test creating a regular admin user in the organization"""
        if not self.org_admin_token or not self.created_org_id:
            self.log_result("Create Regular Admin in Org", False, "Missing org admin token or org ID")
            return False
            
        admin_email = f"admin_{datetime.now().strftime('%H%M%S')}@example.com"
        data = {
            "name": "Regular Admin User",
            "email": admin_email,
            "password": "admin123",
            "role": "admin"
        }
        
        success, response, status = self.make_request('POST', f'organizations/{self.created_org_id}/users?authorization=Bearer {self.org_admin_token}', data, 200, False)
        
        if success and 'user_id' in response:
            self.regular_admin_user_id = response['user_id']
            
            # Now login as the regular admin to get their token
            login_data = {
                "email": admin_email,
                "password": "admin123"
            }
            
            login_success, login_response, login_status = self.make_request('POST', 'auth/login', login_data, 200, False)
            
            if login_success and 'token' in login_response:
                self.regular_admin_token = login_response['token']
                self.log_result("Create Regular Admin in Org", True)
                return True
            else:
                self.log_result("Create Regular Admin in Org", False, f"Admin login failed: {login_response}")
                return False
        else:
            self.log_result("Create Regular Admin in Org", False, f"Status: {status}, Response: {response}")
            return False

    def test_impersonate_org_admin_success(self):
        """Test successful impersonation as org admin"""
        if not self.org_admin_token or not self.created_org_id:
            self.log_result("Impersonate Org Admin - Success", False, "Missing org admin token or org ID")
            return False
            
        success, response, status = self.make_request('POST', f'organizations/{self.created_org_id}/impersonate-admin?authorization=Bearer {self.org_admin_token}', {}, 200, False)
        
        expected_fields = ['token', 'user', 'impersonator', 'message']
        if success and all(field in response for field in expected_fields):
            # Verify the response structure
            user_data = response.get('user', {})
            impersonator_data = response.get('impersonator', {})
            
            if (user_data.get('is_impersonation') == True and 
                'id' in user_data and 'email' in user_data and 
                'id' in impersonator_data and 'email' in impersonator_data):
                self.log_result("Impersonate Org Admin - Success", True)
                return True
            else:
                self.log_result("Impersonate Org Admin - Success", False, f"Invalid response structure: {response}")
                return False
        else:
            self.log_result("Impersonate Org Admin - Success", False, f"Status: {status}, Response: {response}")
            return False

    def test_impersonate_org_admin_unauthorized(self):
        """Test impersonation fails for non-org_admin users"""
        if not self.regular_admin_token or not self.created_org_id:
            self.log_result("Impersonate Org Admin - Unauthorized", False, "Missing regular admin token or org ID")
            return False
            
        # Try to impersonate using regular admin token (should fail with 403)
        success, response, status = self.make_request('POST', f'organizations/{self.created_org_id}/impersonate-admin?authorization=Bearer {self.regular_admin_token}', {}, 403, False)
        
        if success:  # success here means we got the expected 403 status
            self.log_result("Impersonate Org Admin - Unauthorized", True)
            return True
        else:
            self.log_result("Impersonate Org Admin - Unauthorized", False, f"Expected 403, got {status}: {response}")
            return False

    def test_impersonate_specific_user_success(self):
        """Test successful impersonation of specific user"""
        if not self.org_admin_token or not self.regular_admin_user_id:
            self.log_result("Impersonate Specific User - Success", False, "Missing org admin token or target user ID")
            return False
            
        data = {
            "target_user_id": self.regular_admin_user_id
        }
        
        success, response, status = self.make_request('POST', f'organizations/impersonate?authorization=Bearer {self.org_admin_token}', data, 200, False)
        
        expected_fields = ['token', 'user', 'impersonator', 'message']
        if success and all(field in response for field in expected_fields):
            user_data = response.get('user', {})
            impersonator_data = response.get('impersonator', {})
            
            if (user_data.get('is_impersonation') == True and 
                user_data.get('id') == self.regular_admin_user_id and
                'id' in impersonator_data and 'email' in impersonator_data):
                self.log_result("Impersonate Specific User - Success", True)
                return True
            else:
                self.log_result("Impersonate Specific User - Success", False, f"Invalid response structure: {response}")
                return False
        else:
            self.log_result("Impersonate Specific User - Success", False, f"Status: {status}, Response: {response}")
            return False

    def test_impersonate_specific_user_unauthorized(self):
        """Test impersonation fails for non-org_admin users"""
        if not self.regular_admin_token or not self.regular_admin_user_id:
            self.log_result("Impersonate Specific User - Unauthorized", False, "Missing regular admin token or target user ID")
            return False
            
        data = {
            "target_user_id": self.regular_admin_user_id
        }
        
        # Try to impersonate using regular admin token (should fail with 403)
        success, response, status = self.make_request('POST', f'organizations/impersonate?authorization=Bearer {self.regular_admin_token}', data, 403, False)
        
        if success:  # success here means we got the expected 403 status
            self.log_result("Impersonate Specific User - Unauthorized", True)
            return True
        else:
            self.log_result("Impersonate Specific User - Unauthorized", False, f"Expected 403, got {status}: {response}")
            return False

    def test_impersonate_org_admin_forbidden(self):
        """Test that org_admin cannot impersonate another org_admin"""
        if not self.org_admin_token or not self.org_admin_user_id:
            self.log_result("Impersonate Org Admin - Forbidden", False, "Missing org admin token or user ID")
            return False
            
        # Try to impersonate another org_admin (should fail with 403)
        data = {
            "target_user_id": self.org_admin_user_id  # Try to impersonate self (org_admin)
        }
        
        success, response, status = self.make_request('POST', f'organizations/impersonate?authorization=Bearer {self.org_admin_token}', data, 403, False)
        
        if success:  # success here means we got the expected 403 status
            self.log_result("Impersonate Org Admin - Forbidden", True)
            return True
        else:
            self.log_result("Impersonate Org Admin - Forbidden", False, f"Expected 403, got {status}: {response}")
            return False

    def test_list_organizations(self):
        """Test listing organizations as org_admin"""
        if not self.org_admin_token:
            self.log_result("List Organizations", False, "No org admin token available")
            return False
            
        success, response, status = self.make_request('GET', f'organizations?authorization=Bearer {self.org_admin_token}', expected_status=200, auth_required=False)
        
        if success and isinstance(response, list):
            # Check if our created org is in the list
            org_found = any(org.get('id') == self.created_org_id for org in response)
            if org_found:
                self.log_result("List Organizations", True)
                return True
            else:
                self.log_result("List Organizations", False, f"Created org not found in list: {response}")
                return False
        else:
            self.log_result("List Organizations", False, f"Status: {status}, Response: {response}")
            return False

    # ============== AI TESTS ==============
    
    def test_ai_match_response(self):
        """Test AI response matching"""
        data = {
            "incoming_message": "yeah sure I'll pay",
            "keywords": ["yes", "confirm", "sure", "ok"]
        }
        
        success, response, status = self.make_request('POST', 'ai/match-response', data, 200)
        
        if success and 'matched' in response:
            self.log_result("AI Response Matching", True)
            return True
        else:
            self.log_result("AI Response Matching", False, f"Status: {status}, Response: {response}")
            return False

    # ============== DASHBOARD TESTS ==============
    
    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        success, response, status = self.make_request('GET', 'dashboard/stats', expected_status=200)
        
        expected_fields = ['total_clients', 'total_reminders', 'pending_reminders', 'sent_reminders', 
                          'active_campaigns', 'total_balance_owed', 'todays_followups', 'recent_reminders']
        
        if success and all(field in response for field in expected_fields):
            self.log_result("Dashboard Statistics", True)
            return True
        else:
            self.log_result("Dashboard Statistics", False, f"Status: {status}, Missing fields in response: {response}")
            return False

    # ============== CLEANUP TESTS ==============
    
    def cleanup_test_data(self):
        """Clean up created test data"""
        cleanup_results = []
        
        # Delete reminder
        if self.created_reminder_id:
            success, _, _ = self.make_request('DELETE', f'reminders/{self.created_reminder_id}', expected_status=200)
            cleanup_results.append(f"Reminder: {'✅' if success else '❌'}")
        
        # Delete follow-up
        if self.created_followup_id:
            success, _, _ = self.make_request('DELETE', f'followups/{self.created_followup_id}', expected_status=200)
            cleanup_results.append(f"Follow-up: {'✅' if success else '❌'}")
        
        # Delete campaign
        if self.created_campaign_id:
            success, _, _ = self.make_request('DELETE', f'campaigns/{self.created_campaign_id}', expected_status=200)
            cleanup_results.append(f"Campaign: {'✅' if success else '❌'}")
        
        # Delete SMS provider
        if self.created_provider_id:
            success, _, _ = self.make_request('DELETE', f'sms-providers/{self.created_provider_id}', expected_status=200)
            cleanup_results.append(f"SMS Provider: {'✅' if success else '❌'}")
        
        # Delete client (should be last due to dependencies)
        if self.created_client_id:
            success, _, _ = self.make_request('DELETE', f'clients/{self.created_client_id}', expected_status=200)
            cleanup_results.append(f"Client: {'✅' if success else '❌'}")
        
        print(f"\n🧹 Cleanup Results: {', '.join(cleanup_results)}")

    def run_all_tests(self):
        """Run all API tests"""
        print(f"🚀 Starting SMS Platform API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)

        # Test registration and authentication flow
        otp = self.test_register_user()
        if otp:
            self.test_verify_otp(otp)
        else:
            # Try login with existing user
            self.test_login()

        if not self.token:
            print("❌ Authentication failed - cannot continue with protected routes")
            return False

        # Test user profile
        self.test_get_user_profile()
        
        # Test forgot password
        self.test_forgot_password()

        # Test organization and impersonation features
        print("\n🏢 Testing Organization & Impersonation Features...")
        self.test_create_org_admin_user()
        if self.org_admin_token:
            self.test_create_organization()
            if self.created_org_id:
                self.test_create_regular_admin_in_org()
                self.test_list_organizations()
                
                # Test impersonation endpoints
                print("\n🎭 Testing Impersonation Endpoints...")
                self.test_impersonate_org_admin_success()
                self.test_impersonate_org_admin_unauthorized()
                
                if self.regular_admin_user_id:
                    self.test_impersonate_specific_user_success()
                    self.test_impersonate_specific_user_unauthorized()
                    self.test_impersonate_org_admin_forbidden()

        # Test client operations
        print("\n👥 Testing Client Operations...")
        self.test_create_client()
        self.test_get_clients()
        self.test_get_client_by_id()
        self.test_update_client()

        # Test SMS provider operations first (needed for send reminder)
        print("\n📱 Testing SMS Provider Operations...")
        self.test_create_sms_provider()
        self.test_get_sms_providers()

        # Test reminder operations
        print("\n⏰ Testing Reminder Operations...")
        self.test_create_reminder()
        self.test_get_reminders()
        self.test_send_reminder_with_provider()  # Now should work

        # Test follow-up operations
        print("\n📋 Testing Follow-up Operations...")
        self.test_create_followup()
        self.test_get_followups()

        # Test campaign operations
        print("\n📢 Testing Campaign Operations...")
        self.test_create_campaign()
        self.test_get_campaigns()

        # Test AI functionality
        print("\n🤖 Testing AI Functionality...")
        self.test_ai_match_response()

        # Test dashboard
        print("\n📊 Testing Dashboard...")
        self.test_dashboard_stats()

        # Cleanup
        print("\n🧹 Cleaning up test data...")
        self.cleanup_test_data()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed - check details above")
            return False

def main():
    tester = SMSPlatformTester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())