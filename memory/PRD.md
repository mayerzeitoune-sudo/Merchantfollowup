# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 23, 2026

### COMPLETED (This Session - March 23, 2026)

#### P0 Bug Fix: Phone Number Assignment in Inbox
- **Root Causes Fixed**:
  1. Numbers created by org_admin had `org_id: None` — assignment now propagates the assigned user's `org_id`
  2. Unassignment silently failed (Pydantic couldn't distinguish `null` from "not provided") — fixed with sentinel value
  3. Admin query only matched `org_id` — now also finds numbers assigned to ANY user in the admin's org
- **Files Modified**: `backend/server.py` (PhoneNumberUpdate model, get_owned_numbers, update_phone_number, purchase endpoint)
- **Testing**: 12/12 backend + all frontend UI flows passed

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
- **SMS Sending**: MOCKED — Twilio credentials not configured
- **OTP Email**: Only logs to console, no real email service

### Key API Endpoints
- `GET /api/phone-numbers/owned` — Role-based phone number retrieval
- `PUT /api/phone-numbers/{phone_id}` — Assign/unassign numbers with org_id propagation
- `POST /api/phone-numbers/purchase` — Purchase numbers with org_id inheritance
