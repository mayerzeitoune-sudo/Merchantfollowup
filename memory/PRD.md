# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 27, 2026

### COMPLETED (This Session - Fork 3)

#### Phone Blower 5-Minute Auto-Dialer
- **START AUTO-DIAL** button on each lead's profile card in the Phone Blower page
- Calls every 5 minutes, rotating through all org-owned phone numbers
- AI voice (Amazon Polly.Matthew) plays: *"If you would like these phone calls to stop. Pay your bill. You know who to contact."*
- TwiML endpoint: `GET /api/phone-blower/twiml/blower-message`
- Auto-dial sessions stored in `auto_dial_sessions` collection
- Active sessions panel at top of page with stop controls
- APScheduler processes due sessions every 2 minutes
- Business hours enforcement (9-5 ET, weekdays)
- Compliance checks (DNC, opt-out, wrong number) before each call
- **Note: Calls are SIMULATED until Twilio credentials are configured**
- **Status**: VERIFIED (iteration_17.json — 100% pass)

#### MAX AGGRESSION DRIP — Stop Trigger Words
- When selecting MAX AGGRESSION DRIP, a **2-step dialog** appears:
  - **Step 1: Trigger Words** — 15 pre-built stop words (stop, no, out, fuck you, fuck off, unsubscribe, remove, quit, cancel, leave me alone, do not contact, take me off, opt out, not interested, wrong number)
  - **Step 2: Review & Launch** — campaign name, cost preview, trigger words summary, message preview
- Users can remove pre-built words and add custom ones
- Trigger words stored in `trigger_words` array on the `enhanced_campaigns` document
- Inbound SMS webhook checks trigger words and auto-removes leads from campaigns
- Backend endpoints: `GET/PUT /api/campaigns/{id}/trigger-words`
- **Status**: VERIFIED (iteration_17.json — 100% pass)

### COMPLETED (Previous Session - Fork 2)

#### MAX AGGRESSION DRIP Campaign
- 100 aggressive message templates, hourly 9-5 M-F, 30 days
- **Status**: VERIFIED

#### PHONE BLOWER Page (Base)
- Call queue, lead profile card, 13 dispositions, compliance guardrails, analytics
- **Status**: VERIFIED

#### Twilio Pricing — 8x Base Rate ($0.0632/msg)
- System-wide pricing update across projections and campaign previews
- **Status**: VERIFIED

#### APScheduler Background Processing
- Hourly 9AM-5PM ET for high-intensity campaigns
- Daily 10:45 AM ET for standard campaigns
- Every 2 min for auto-dial sessions
- **Status**: VERIFIED

### COMPLETED (Earlier Sessions)

- Drip Campaign System (54-msg New Lead + 3 Funded Deal campaigns)
- Phone Number Management (purchase, assign, delete)
- Org Admin Impersonation
- Client Data Access Fixes
- Billing System ($100/user/month)
- Google OAuth + Legal Pages (Privacy, Terms)
- Signup & Landing Page Overhaul
- Branding (Merchant Followup favicon/title)
- Auto-enrollment for new leads into matching campaigns
- Projections Page Overhaul

### Technical Stack
- **Backend**: FastAPI + MongoDB (Motor async driver) + APScheduler
- **Frontend**: React + Tailwind + Shadcn/UI
- **Auth**: JWT with role-based access (org_admin, admin, team_leader, agent)
- **Integrations**: Twilio (SMS + Voice — requires user credentials)

### Key Files
- `backend/routes/phone_blower.py`: Auto-dialer, TwiML, call queue, dispositions
- `backend/routes/enhanced.py`: Campaigns, projections, trigger words
- `backend/routes/sms.py`: Inbound SMS with trigger word checking
- `backend/campaign_templates.py`: All pre-built campaign templates
- `backend/server.py`: Main app, APScheduler, route registration
- `frontend/src/pages/PhoneBlower.js`: Phone Blower UI with auto-dial controls
- `frontend/src/pages/DripCampaigns.js`: Campaign management, trigger words step
- `frontend/src/lib/api.js`: All API definitions

### Prioritized Backlog

**P0 - Critical**
- Configure live Twilio credentials (SID + Auth Token) for real SMS/Voice
- Refactor `server.py` monolith (~5500 lines) into modular routes

**P1 - Important**
- Support Email UI on Settings page
- Email service integration for OTPs
- Twilio A2P 10DLC registration
- Bulk User Upload
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email

### Known Issues
- **SMS/Voice**: MOCKED — Twilio credentials not configured
- **Monolithic server.py**: ~5500 lines, needs continued refactoring

### Test Reports
- `/app/test_reports/iteration_17.json` — All tests passed (11/11 backend, all frontend verified)
- `/app/test_reports/iteration_16.json` — Previous session all tests passed

### Credentials
- Org Admin: `orgadmin@merchant.com` / `Admin123!`
- Admin: `john@acmefunding.com` / `Password123!`
- Agent: `mike@acmefunding.com` / `Password123!`
