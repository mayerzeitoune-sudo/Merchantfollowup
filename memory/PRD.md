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
- **Multi-Organization Architecture** (NEW - March 2026)

## Implementation Status - March 2026

### ✅ COMPLETED FEATURES

#### Multi-Organization Architecture (NEW - March 12, 2026)
- **Three-Tier Role Hierarchy**:
  - **Org Admin (Super Admin)**: Can create/manage all organizations and has full visibility across the platform
  - **Admin**: Manages users and data only within their assigned organization
  - **User/Agent**: Can only see and manage their OWN data within their organization
- **Organization Management Page**: New page at `/organizations` visible only to org_admin users
- **Organization CRUD**: Create, view, update, and delete organizations
- **User Management within Orgs**: Add users to organizations with role assignment
- **Data Scoping**: Backend helper functions `is_admin_or_above()` and `is_org_admin()` for role-based access control
- **Team Page Fixed**: Now correctly shows "Add User", "Invite Member", and "Bulk Upload" buttons for both admin and org_admin roles
- **Files Updated/Created**:
  - `/app/backend/server.py` - Updated `get_current_user()`, `is_admin_or_above()`, role checks
  - `/app/backend/routes/organizations.py` - Full CRUD endpoints for organization management
  - `/app/frontend/src/pages/Organizations.js` - New organization management UI
  - `/app/frontend/src/pages/Team.js` - Updated role checks and ROLES array
  - `/app/frontend/src/lib/api.js` - Added `organizationsApi`
  - `/app/frontend/src/components/DashboardLayout.js` - Added Organizations nav link

#### Drip Campaign Reply Context (March 11, 2026)
- Inbound SMS Context Linking
- Campaign Context Displayed with "Responding to:" block
- Campaign Badge on messages

#### Gmail Integration (March 2026)
- Google OAuth 2.0 with PKCE
- Send emails directly from the app
- Team invitation emails via Gmail

#### Funded Deals & Projections
- Complete funded deal lifecycle tracking
- Payment schedule management
- Book value stats and analytics

#### AI Integration (GPT-5.2)
- Message generation and rewriting
- Deal analysis with health scores
- Template generation

### Technical Stack
- **Backend**: FastAPI + MongoDB + Motor
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT tokens with role-based access

### Database Collections
- **users**: Now includes `role` (org_admin/admin/user/agent/viewer), `org_id`, `org_name`
- **organizations**: New collection for multi-tenancy (id, name, description, is_active, created_at, created_by)
- **clients, conversations, deals, etc.**: All data collections support `org_id` scoping

### Key API Endpoints

#### Organizations (Org Admin Only)
- `GET /api/organizations` - List all organizations
- `POST /api/organizations` - Create organization
- `GET /api/organizations/{id}` - Get organization details
- `PUT /api/organizations/{id}` - Update organization
- `DELETE /api/organizations/{id}` - Delete organization and all data
- `GET /api/organizations/{id}/users` - List users in organization
- `POST /api/organizations/{id}/users` - Add user to organization
- `DELETE /api/organizations/{id}/users/{user_id}` - Remove user from organization
- `GET /api/organizations/stats/overview` - Platform-wide stats

#### Team Management
- `GET /api/team/members` - List team members
- `POST /api/team/create-member` - Create team member directly
- `POST /api/team/invite` - Invite via email
- `PUT /api/team/members/{id}/role` - Update member role

## Prioritized Backlog

### P0 - Critical (Before Production)
1. ~~Multi-Organization Architecture~~ ✅ COMPLETE
2. Connect actual SMS provider (Twilio) for real message sending
3. Implement SMS delivery webhooks
4. Background job scheduler for automated campaigns

### P1 - Important
1. Data scoping by organization_id across ALL endpoints (clients, deals, conversations, etc.)
2. Twilio A2P 10DLC Backend Integration
3. Fix OTP Input Component
4. Bulk Upload Backend Implementation

### P2 - Nice to Have
1. Email Inbox View for Gmail integration
2. Auto-import leads from email
3. Advanced reporting exports

## Test Credentials
- **Org Admin**: admin@merchant.com / admin123
- **Test User**: template_test@example.com / password123

## Test Reports
- `/app/test_reports/iteration_8.json` - Multi-Organization Architecture tests (14/14 PASS)

## Known Issues
1. OTP input component has usability issues (P3)
2. All SMS/Voice functionality is mocked (requires provider setup)
3. Data scoping by org_id not yet implemented across all endpoints

## Recent Changes Log
- **March 12, 2026**: Implemented Multi-Organization Architecture
  - Created role hierarchy (org_admin > admin > user)
  - Built Organizations management page
  - Updated Team page role checks
  - Added backend helper functions for role-based access
  - All 14 backend tests passing
