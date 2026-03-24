# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 24, 2026

### COMPLETED (This Session)

#### Feature: Phone Number Purchasing for All Roles
- **Admins** can purchase numbers → goes to org, must assign to a rep
- **Agents/Reps** can purchase numbers → auto-assigned to themselves
- **Org Admin** can toggle `allow_rep_purchases` per organization (Organizations page dialog)
- **Admin** can set `rep_monthly_number_limit` per rep (Settings > Phone Numbers tab, defaults to 0 = no limit)
- Agent purchase blocked when org disables rep purchases or monthly limit reached
- Files: `backend/server.py`, `backend/routes/organizations.py`, `frontend/src/pages/PhoneNumbers.js`, `frontend/src/pages/Settings.js`, `frontend/src/pages/Organizations.js`, `frontend/src/lib/api.js`
- Testing: 12/12 backend + all frontend UI flows passed

#### Bug Fix: Phone Number Assignment in Inbox
- Fixed org_id propagation on assignment
- Fixed unassignment (was silently failing)
- Admin sees all org numbers, agent sees only assigned

#### Bug Fix: "You don't own this phone number" SMS Error
- Fixed send-sms, send-template, initiate-call endpoints to use role-based number validation

### Technical Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind + Shadcn/UI
- **Auth**: JWT with role-based access (org_admin, admin, team_leader, agent)

### Test Credentials
- **Org Admin**: orgadmin@merchant.com / Admin123!
- **Admin (Acme)**: john@acmefunding.com / Password123!
- **Agent (Acme)**: mike@acmefunding.com / Password123!

### Prioritized Backlog

**P0 - Critical**
- Configure live Twilio credentials (Account SID + Auth Token) for real SMS
- Refactor `server.py` monolith (~5000 lines) into modular route files
- Twilio Voice call functionality

**P1 - Important**
- Support Email UI — backend exists, frontend Settings form missing
- Live Email Sending — integrate email service for OTP emails
- Twilio A2P 10DLC registration backend
- Bulk User Upload backend
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email
- Background automation for drip campaigns

### Known Issues
- **SMS Sending**: MOCKED — Twilio credentials not configured
- **OTP Email**: Only logs to console, no real email service
- **Monolithic server.py**: ~5000 lines, needs refactoring
