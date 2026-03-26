# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 26, 2026

### COMPLETED (This Session - Fork 2)

#### Twilio Pricing Update — 8x Base Rate Sitewide
- Updated text cost from $0.0083 to **$0.0632** (8x Twilio base rate of $0.0079)
- Projections page: Cost Breakdown shows $0.0632/text, $3.41/lead (54 msgs × $0.0632)
- Added **"Estimated Costs & Projected Returns"** dark panel in Drip Campaign pre-launch dialog
  - Shows: Total Texts, Campaign Cost, Est. Conversions (1%-12%), Projected Revenue ($50-$600/lead), Net Return
  - Visible before user clicks "Start Campaign"
- **Status**: VERIFIED (iteration_15.json) — 100% pass rate

#### Bug Fix: Launched Bulk Campaigns Not Showing as "Live" (P0)
- **Root cause**: `launch_prebuilt_campaign` in `backend/routes/enhanced.py` was creating campaign documents missing `updated_at`, `triggers`, `stop_on_reply`, `target_tags`, `contacts_enrolled`, `contacts_completed`, `total_messages_sent`, `total_replies` fields
- **Impact**: `EnhancedCampaignResponse` Pydantic model required `updated_at` (no default), causing 500 validation error on `GET /api/campaigns/enhanced` — breaking the entire campaigns list
- **Fix**: Added all required fields to the launch endpoint; patched existing broken documents in MongoDB
- **Status**: VERIFIED by testing agent (iteration_14.json) — 100% pass rate

#### Projections Page Overhaul (P0)
- Updated `FundedDeals.js` (route `/funded`, sidebar label "Projections") with premium dark financial panel
- System-wide Earning Projections panel shows:
  - Total Leads (system-wide pipeline count)
  - Estimated Conversions (L × 1% to L × 12%)
  - Projected Revenue (conversions × $50 to $600 per lead)
  - Net Profit (revenue minus messaging costs)
- Detailed breakdown cards: Cost Breakdown ($0.0083/text, 54 avg msgs, $0.45/lead), Pipeline Summary, Campaign Activity
- Formula footnote at bottom of panel
- New backend endpoint: `GET /api/projections/system` in `backend/routes/enhanced.py`
- New API call: `enhancedCampaignsApi.getSystemProjections()` in `frontend/src/lib/api.js`
- **Status**: VERIFIED by testing agent (iteration_14.json) — 100% pass rate

### COMPLETED (Previous Session)

#### Drip Campaign System — New Lead (54 messages)
- Daily (Days 1-30) → Every other day (10 msgs) → Weekly (8 msgs) → Monthly (6 msgs)
- "Bulk Templated Campaign" button on Drip Campaigns page
- Auto-enrolls all clients tagged "New Lead"
- Templates use `{first_name}` and `${amount_requested}` from client data
- Start button to launch campaign
- Reply detection: popup in Inbox "Response recorded, remove from campaign?" → changes tag to "Responded"

#### Drip Campaign System — Funded Deals (3 campaigns)
- **Short Term (8-12 weeks)**: 12 weekly messages
- **Medium Term (12-24 weeks)**: 24 weekly messages
- **Long Term (24-52 weeks)**: 52 weekly messages

#### Phone Number Deletion Overhaul
- Moved to Settings > Phone Numbers tab with "Request Number Deletion" flow

#### Auto-Suggest Buy Number by Area Code
- Popup suggests buying a local number when client area code doesn't match owned numbers

#### Added `amount_requested` Field to Client Model

#### Removed Lead Revival Page

#### Phone number assignment bug fix, SMS ownership fix, purchasing for all roles
#### Registration form made fully optional
#### Org admin toggle for allow_rep_purchases + monthly limit

### Technical Stack
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Frontend**: React + Tailwind + Shadcn/UI
- **Auth**: JWT with role-based access (org_admin, admin, team_leader, agent)

### Key Files
- `backend/routes/enhanced.py`: Campaigns, projections, analytics endpoints
- `backend/campaign_templates.py`: All 54+88 pre-built campaign templates
- `frontend/src/pages/FundedDeals.js`: Projections page with system-wide earning forecasts
- `frontend/src/pages/DripCampaigns.js`: Campaign management, bulk launch
- `frontend/src/pages/Inbox.js`: Campaign reply popup + area code suggestion
- `frontend/src/lib/api.js`: All API definitions

### Prioritized Backlog

**P0 - Critical**
- Configure live Twilio credentials for real SMS delivery
- Campaign message scheduler (background worker to send messages on schedule)
- Refactor `server.py` monolith into modular route files (~5400 lines)

**P1 - Important**
- Support Email UI on Settings page
- Email service integration for OTPs
- Twilio Voice call functionality
- Twilio A2P 10DLC registration
- Bulk User Upload
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email

### Known Issues
- **SMS Sending**: MOCKED — Twilio credentials not configured
- **Campaign Scheduler**: Messages stored but background sending not active yet
- **Monolithic server.py**: ~5400 lines, needs refactoring

### Test Reports
- `/app/test_reports/iteration_14.json` — All tests passed (7/7 backend, all frontend features verified)
