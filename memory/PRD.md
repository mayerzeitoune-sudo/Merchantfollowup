# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 23, 2026

### COMPLETED (This Session - March 23, 2026)

#### P0 Bug Fix: Phone Number Assignment in Inbox
- **Root Causes Fixed**:
  1. Numbers created by org_admin had `org_id: None` — assignment now propagates the assigned user's `org_id`
  2. Unassignment silently failed (Pydantic couldn't distinguish `null` from "not provided") — fixed with sentinel value
  3. Admin query only matched `org_id` — now also finds numbers assigned to ANY user in the admin's org
- **Files Modified**: `backend/server.py` (PhoneNumberUpdate model, get_owned_numbers, update_phone_number, purchase endpoint)

#### P0 Bug Fix: "You don't own this phone number" when sending SMS
- **Root Cause**: The send-sms, send-template, and initiate-call endpoints validated number ownership using `user_id` (the purchaser), not considering `assigned_user_id` or `org_id`
- **Fix**: All 3 endpoints now use role-based number validation:
  - `org_admin`: Can use any number
  - `admin`: Can use any number in their org (by `org_id`, `assigned_user_id`, or `user_id`)
  - `agent`: Can only use numbers assigned to them (`assigned_user_id`)
- **Files Modified**: `backend/server.py` (send_sms_to_contact, send_template_message, initiate_call)

#### Number Visibility (Privacy)
- Agents only see their own assigned numbers — verified Emily (unassigned agent) sees 0 numbers
- Admins see all org numbers for management
- No cross-org number leakage

### Previous Session Completed
- Inbox Page Redesign with split-view, phone number selector, conversation chains
- Calendar Page Redesign with stats cards
- Archive users and user history page
- Clickable notifications, Team delete buttons
- Phone Numbers state search, Phone dialer
- OTP verification, Pipeline fix, User Profile, Bulk delete
- Global search fix
- Org Admin Impersonation
- Client Data Access Fixes
- Organization Billing System
- Legal Pages (Privacy Policy, Terms of Service)
- Signup & Landing Page Overhaul
- Branding (favicon, tab title)

### Technical Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT with role-based access (org_admin, admin, team_leader, agent)

### Test Credentials
- **Org Admin**: orgadmin@merchant.com / Admin123!
- **Admin (Acme)**: john@acmefunding.com / Password123!
- **Agent (Acme)**: mike@acmefunding.com / Password123!

### Prioritized Backlog

**P0 - Critical**
- Configure live Twilio credentials (Account SID + Auth Token) for real SMS
- Refactor `server.py` monolith (~5000 lines) into modular route files
- Implement Twilio Voice call functionality

**P1 - Important**
- Support Email UI — backend exists, frontend Settings form missing
- Live Email Sending — integrate SendGrid or similar for OTP emails
- Twilio A2P 10DLC registration backend
- Bulk User Upload backend (UI exists)
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email
- Background automation for drip campaigns
- N+1 Query Optimizations

### Known Issues
- **Monolithic server.py**: Backend file too large, needs refactoring
- **Twilio Voice**: Placeholder credentials, not fully integrated
- **Bulk User Upload**: Backend endpoint is placeholder
- **SMS Sending**: MOCKED — Twilio credentials not configured (messages save but don't actually send)
- **OTP Email**: Only logs to console, no real email service
