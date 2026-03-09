import requests
import sys
import json
from datetime import datetime, timedelta

class SMSPlatformTester:
    def __init__(self, base_url="https://payment-reminder-sms.preview.emergentagent.com"):
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
        
        if success and 'user_id' in response:
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
            "password": self.test_user_password
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
        data = {
            "client_id": self.created_client_id,
            "amount_due": 150.50,
            "due_date": tomorrow,
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

    def test_send_reminder(self):
        """Test sending reminder (should fail without SMS provider)"""
        if not self.created_reminder_id:
            self.log_result("Send Reminder", False, "No reminder ID available")
            return False
            
        success, response, status = self.make_request('POST', f'reminders/{self.created_reminder_id}/send', expected_status=400)
        
        # Should fail with 400 because no SMS provider is configured
        if not success and status == 400 and 'SMS provider' in response.get('detail', ''):
            self.log_result("Send Reminder (Expected Failure)", True)
            return True
        else:
            self.log_result("Send Reminder", False, f"Unexpected response - Status: {status}, Response: {response}")
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

        # Test client operations
        self.test_create_client()
        self.test_get_clients()
        self.test_get_client_by_id()
        self.test_update_client()

        # Test SMS provider operations first (needed for send reminder)
        self.test_create_sms_provider()
        self.test_get_sms_providers()

        # Test reminder operations
        self.test_create_reminder()
        self.test_get_reminders()
        self.test_send_reminder_with_provider()  # Now should work

        # Test follow-up operations
        self.test_create_followup()
        self.test_get_followups()

        # Test campaign operations
        self.test_create_campaign()
        self.test_get_campaigns()

        # Test AI functionality
        self.test_ai_match_response()

        # Test dashboard
        self.test_dashboard_stats()

        # Cleanup
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