# Merchant Follow Up - Product Requirements Document

## Original Problem Statement
Build a comprehensive SMS platform "Merchant Follow Up" for automated payment reminders and lead follow-up with:
- Customer data input and management
- Automated SMS/Email payment reminders
- Smart drip campaigns with auto-stop on reply
- AI-powered follow-up suggestions
- Lead capture from multiple sources
- Dead lead revival automation
- SMS compliance tools
- Performance analytics
- Multi-provider SMS support (Twilio, Telnyx, Vonage, Plivo, Bandwidth)
- Funded deals tracking and payment management
- Team collaboration with roles
- **Multi-Organization Architecture**

## Implementation Status - March 2026

### ✅ COMPLETED FEATURES (This Session - March 14, 2026)

#### OTP Verification Restored
- Registration now requires OTP verification (was previously auto-login)
- New user registration returns OTP for testing (`otp` field in response)
- Simplified OTP input component using 6 individual input fields (replaced buggy input-otp library)
- VerifyOTP page properly handles digit entry, backspace, and paste
- First user gets `admin` role, subsequent users get `agent` role

#### Team Leader Role Assignment Fixed
- `team_leader` added to valid_roles list in `update_member_role` endpoint
- Role dropdown on Team page now shows all roles: Admin, Team Leader, Agent, Viewer
- Admins can change user roles to Team Leader via dropdown

#### Agent Assignment to Team Leaders
- Team Leaders can have agents assigned to them
- "Agents" button visible on Team Leader cards
- Dialog shows assigned agents and available agents to assign
- Backend endpoint: `POST /api/team/leaders/{leader_id}/agents`

#### Team Leader Dashboard (My Team)
- `/my-team` page for Team Leaders to view their agents
- Shows agent stats: clients count, messages sent/received, deals
- "View Clients" button navigates to agent's clients page
- Backend endpoint: `GET /api/team-leader/dashboard`

#### View Agent Clients (AgentClients Page)
- `/team/agent/:agentId/clients` route working
- Team Leaders can view their assigned agents' clients
- Search functionality by name, phone, or email
- View and Message buttons for each client

#### AI Conversation Summary
- Client Profile page (`/clients/:clientId`) has AI Summary card
- "Generate" button triggers AI analysis of conversations
- Shows: summary, sentiment, key topics, deal likelihood, suggested action
- Fixed import to use `LlmChat` and `UserMessage` from emergentintegrations
- Backend endpoints: `GET/POST /api/clients/{client_id}/ai-summary`

#### Global Search
- Search bar in header searches clients, messages, deals
- Searches by name, phone, email, company, notes
- Dropdown shows categorized results with quick navigation

#### Phone Dialer
- Floating phone button in bottom-right corner
- Full dial pad (1-9, *, 0, #) with number display
- "Calling From" dropdown for phone number selection
- Quick Contacts with search functionality
- Twilio Voice integration (MOCKED - credentials not configured)
- Backend endpoint: `POST /api/calls/initiate`

#### Activity Logging
- `log_activity` helper function for audit trail
- Activity logged on client creation
- Activity logs displayed on Client Profile page

### ✅ PREVIOUSLY COMPLETED FEATURES

#### Multi-Organization Architecture
- Three-Tier Role Hierarchy: Org Admin > Admin > Team Leader > Agent > Viewer
- Organization Management Page at `/organizations`
- Data scoping by organization_id

#### Gmail Integration
- Google OAuth 2.0 with PKCE
- Send emails directly from the app

#### Funded Deals & Projections
- Complete funded deal lifecycle tracking
- Payment schedule management

#### AI Integration (GPT-5.2)
- Message generation and rewriting
- Deal analysis with health scores

### Technical Stack
- **Backend**: FastAPI + MongoDB + Motor
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT tokens with role-based access
- **SMS**: Twilio (SMS working, Voice mocked)

### Database Collections
- **users**: Includes `role`, `org_id`, `team_leader_id`, `team_id`
- **organizations**: Multi-tenancy support
- **clients**: Customer data with AI summaries
- **conversations**: Message history
- **activity_logs**: Audit trail
- **calls**: Call records (for Twilio Voice)

### Key API Endpoints

#### Authentication
- `POST /api/auth/register` - Returns OTP for verification
- `POST /api/auth/verify` - Verify OTP and get token
- `POST /api/auth/login` - Login with email/password

#### Team Management
- `GET /api/team/members` - List team members
- `PUT /api/team/members/{id}/role` - Update member role (includes team_leader)
- `POST /api/team/leaders/{id}/agents` - Assign agent to leader
- `GET /api/team-leader/dashboard` - Team leader stats and agents
- `GET /api/team/agent/{id}/clients` - View agent's clients

#### AI Features
- `GET/POST /api/clients/{id}/ai-summary` - AI conversation summary
- `POST /api/ai/generate-message` - Generate AI message
- `POST /api/ai/analyze-deal` - Deal health analysis

#### Calling
- `POST /api/calls/initiate` - Initiate outbound call
- `POST /api/calls/{id}/end` - End active call

#### Search
- `GET /api/search?q={query}` - Global search (clients, messages, deals)

## Prioritized Backlog

### P0 - Critical (Next Steps)
1. ✅ ~~OTP Verification Restored~~ COMPLETE
2. ✅ ~~Team Leader Role Assignment~~ COMPLETE
3. ✅ ~~AI Conversation Summary~~ COMPLETE
4. Configure Twilio credentials for real Voice calls
5. Implement SMS delivery webhooks

### P1 - Important
1. Data scoping by organization_id across ALL endpoints
2. Twilio A2P 10DLC Backend Integration
3. Bulk Upload Backend Implementation
4. Notifications system (real-time)

### P2 - Nice to Have
1. Email Inbox View for Gmail integration
2. Auto-import leads from email
3. Advanced reporting exports
4. Background job scheduler for automated campaigns

## Test Credentials
- **Org Admin**: admin@merchant.com / admin123
- **Test registration**: Any email, OTP returned in response

## Test Reports
- `/app/test_reports/iteration_9.json` - Latest tests (17/17 PASS)
- `/app/test_reports/pytest/otp_team_features_results.xml`

## Known Mocked Features
1. **Twilio Voice** - Returns `mock_initiated` when credentials not set
2. **A2P 10DLC Registration** - UI exists, no backend implementation

## Recent Changes Log
- **March 14, 2026**: 
  - Restored OTP verification flow
  - Fixed Team Leader role assignment
  - Implemented AI conversation summary
  - Fixed agent assignment to team leaders
  - Added activity logging to client creation
  - All 17 backend tests passing
