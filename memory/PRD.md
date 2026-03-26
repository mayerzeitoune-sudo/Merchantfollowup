# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 26, 2026

### COMPLETED (This Session)

#### Drip Campaign System — New Lead (54 messages)
- Daily (Days 1-30) → Every other day (10 msgs) → Weekly (8 msgs) → Monthly (6 msgs)
- "Bulk Templated Campaign" button on Drip Campaigns page
- Auto-enrolls all clients tagged "New Lead"
- Templates use `{first_name}` and `${amount_requested}` from client data
- Start button to launch campaign
- Reply detection: popup in Inbox "Response recorded, remove from campaign?" → changes tag to "Responded"

#### Drip Campaign System — Funded Deals (3 campaigns)
- **Short Term (8-12 weeks)**: 12 weekly messages, uses `{first_name}` and `{company_name}`
- **Medium Term (12-24 weeks)**: 24 weekly messages
- **Long Term (24-52 weeks)**: 52 weekly messages
- Prompt when deal moves to "Funded": select deal type → confirm → enrolled

#### Phone Number Deletion Overhaul
- Delete button removed from Phone Numbers page
- Moved to Settings > Phone Numbers tab with "Request Number Deletion" flow
- Select number → Request Deletion → "Expect admin call within 24 hours"

#### Auto-Suggest Buy Number by Area Code
- When selecting a client in Inbox whose area code doesn't match any owned number
- Popup suggests buying a local number with pricing

#### Added `amount_requested` Field to Client Model
- Available in create/update/display
- Used in New Lead drip campaign templates

#### Removed Lead Revival Page
- Removed from navigation sidebar and App routes

### Previous Session Completed
- Phone number assignment bug fix (org_id propagation, unassignment, admin visibility)
- "You don't own this phone number" SMS error fix
- Phone number purchasing for all roles (admin + agent)
- Org admin toggle for allow_rep_purchases + monthly limit
- Registration form made fully optional

### Technical Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind + Shadcn/UI
- **Auth**: JWT with role-based access (org_admin, admin, team_leader, agent)

### Key Files
- `backend/campaign_templates.py`: All 54+88 pre-built campaign templates
- `backend/routes/enhanced.py`: Campaign launch, enrollment, removal endpoints
- `frontend/src/pages/DripCampaigns.js`: Bulk Templated Campaign UI
- `frontend/src/pages/Inbox.js`: Campaign reply popup + area code suggestion

### Prioritized Backlog

**P0 - Critical**
- Configure live Twilio credentials for real SMS delivery
- Campaign message scheduler (background worker to send messages on schedule)
- Refactor `server.py` monolith into modular route files

**P1 - Important**
- Support Email UI
- Email service integration for OTPs
- Twilio A2P 10DLC registration
- Bulk User Upload
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email

### Known Issues
- **SMS Sending**: MOCKED — Twilio credentials not configured
- **Campaign Scheduler**: Messages stored but background sending not active yet
- **Monolithic server.py**: ~5000 lines, needs refactoring
