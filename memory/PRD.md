# Merchant Follow Up - Product Requirements Document

## Original Problem Statement
Build an SMS platform called "Merchant Follow Up" for automated payment reminder text messages with:
- Customer data input and management
- Automated SMS payment reminders
- Client dashboard with stats
- Calendar for follow-up scheduling
- Drip campaign builder with keyword-based auto-replies
- AI-powered similar response detection (yes/yea/yeah = same intent)
- Multi-provider SMS support (Twilio, Telnyx, Vonage, Plivo, Bandwidth)
- Auth with email/password, SMS verification, forgot password
- White and orange branding

## User Personas

### Primary: Small Business Owner/Merchant
- Needs to collect payments from customers
- Wants automated reminder system
- Limited technical knowledge
- Needs mobile-friendly interface

### Secondary: Accounts Receivable Manager
- Manages multiple customer accounts
- Needs bulk operations
- Values reporting and tracking

## Core Requirements (Static)

### Authentication
- [x] Email/password registration
- [x] OTP verification via SMS
- [x] Forgot password flow
- [x] JWT-based session management

### Client Management
- [x] CRUD operations for clients
- [x] Store name, phone, email, company, notes
- [x] Track balance owed per client
- [x] Tags and filtering system
- [x] Birthday and special events tracking

### Payment Reminders
- [x] Schedule reminders with amount and due date
- [x] Custom message templates
- [x] Track reminder status (pending/sent/failed)
- [x] Manual send trigger
- [x] Start/end date scheduling
- [x] Day-of-week selection
- [x] Preview of reminder count

### Calendar & Follow-ups
- [x] Schedule follow-up calls/SMS
- [x] Visual calendar view
- [x] Mark as complete functionality

### Drip Campaigns
- [x] Create multi-step campaigns
- [x] Keyword trigger system
- [x] AI-powered semantic matching (GPT-5.2)
- [x] Configurable delays between messages

### SMS Provider Integration
- [x] Multi-provider support (Twilio, Telnyx, Vonage, Plivo, Bandwidth)
- [x] Configurable credentials per provider
- [x] Active provider selection
- [x] MOCKED: Actual SMS sending (requires provider credentials)

### Message Templates (NEW - March 2026)
- [x] Create/edit/delete message templates
- [x] Categories for organization
- [x] Variable substitution ({client_name}, {client_balance}, etc.)
- [x] Quick template buttons in messaging UI
- [x] Template selection dialog with preview
- [x] Use count tracking

### Contact Messaging
- [x] View conversation history
- [x] Send direct messages
- [x] Send template messages
- [x] Initiate calls (placeholder)

### Expansion Features (UI Placeholders)
- [x] Phone number marketplace
- [x] Gift store with product catalog
- [x] Domain & email management

## What's Been Implemented

### March 10, 2026
- **Message Templates Feature (COMPLETE)**
  - Backend CRUD endpoints for templates
  - Template management page with categories
  - Variable extraction and substitution
  - Integration with Contacts page for sending
  - Quick template buttons and selection dialog
  - Fixed duplicate API definitions in frontend

### Previous Sessions
**Backend (FastAPI + MongoDB)**
- Complete REST API with JWT authentication
- User registration with OTP verification
- Clients, Reminders, Follow-ups, Campaigns CRUD
- SMS provider configuration storage
- AI response matching endpoint using GPT-5.2
- Dashboard statistics API
- Templates CRUD and send-to-contact endpoints

**Frontend (React + Tailwind + Shadcn)**
- Login/Register/OTP verification/Forgot password pages
- Dashboard with stats cards and quick actions
- Clients management with table and forms
- Reminders page with advanced scheduling
- Calendar page with follow-up scheduling
- Campaigns page with AI testing tool
- Settings page with multi-provider configuration
- Contacts/Messaging page with templates
- Templates management page
- Phone Numbers marketplace (placeholder)
- Gift Store page (placeholder)
- Domains & Email page (placeholder)
- White/orange "Merchant Blaze" theme
- Responsive design for mobile

## Deployment Status
- **Health Check: PASSED** ✅ (March 10, 2026)
- Ready for Kubernetes deployment on Emergent
- No blockers or warnings found

## Prioritized Backlog

### P0 - Critical (Before Production)
1. Connect actual SMS providers (Twilio integration ready)
2. Implement real SMS sending when provider configured
3. Add SMS delivery status webhooks

### P1 - Important
1. Bulk import clients from CSV
2. Campaign analytics dashboard
3. Scheduled reminder automation (cron job)
4. Fix OTP input component usability

### P2 - Nice to Have
1. Client payment history
2. Invoice generation
3. Integration with payment processors
4. Team/multi-user support
5. Custom branding options
6. Real gift delivery service integration
7. Real domain registrar integration

## Technical Architecture

```
Frontend: React 19 + Tailwind CSS + Shadcn/UI
Backend: FastAPI + Motor (async MongoDB)
Database: MongoDB
AI: OpenAI GPT-5.2 via Emergent Integrations
Auth: JWT with bcrypt password hashing
```

## Key API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/verify_otp
- POST /api/auth/forgot_password

### Clients
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/{id}
- GET /api/clients/tags

### Reminders
- GET/POST /api/reminders
- GET/PUT/DELETE /api/reminders/{id}
- POST /api/reminders/{id}/send

### Templates
- GET/POST /api/templates
- GET/PUT/DELETE /api/templates/{id}
- POST /api/templates/{id}/use
- GET /api/templates/categories

### Contacts/Messaging
- GET /api/contacts/{client_id}/conversation
- POST /api/contacts/{client_id}/send-sms
- POST /api/contacts/{client_id}/send-template
- POST /api/contacts/{client_id}/initiate-call

### Dashboard
- GET /api/dashboard/stats

## Database Schema

### users
```json
{
  "id": "uuid",
  "email": "string",
  "name": "string",
  "hashed_password": "string",
  "otp": "string",
  "is_verified": "boolean"
}
```

### clients
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "notes": "string",
  "balance": "number",
  "tags": ["string"],
  "birthday": "date",
  "special_events": [{"name": "string", "date": "date"}]
}
```

### message_templates
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "category": "string",
  "content": "string",
  "variables": ["string"],
  "use_count": "number"
}
```

### conversations
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "client_id": "uuid",
  "template_id": "uuid (optional)",
  "direction": "inbound|outbound",
  "content": "string",
  "timestamp": "datetime",
  "status": "sent|pending_provider|failed"
}
```

## Known Issues

1. **OTP Input Component** - The InputOTP component has usability issues during automated testing (low priority)
2. **SMS Sending** - All SMS functionality is mocked; requires provider credentials for real sending

## Mocked Features
- Phone number purchasing (UI only)
- Browser-based calling (UI only)
- Gift ordering and delivery (UI only)
- Domain purchasing (UI only)
- All SMS/voice functionality (requires provider setup)

## Test Credentials
- Email: template_test@example.com
- Password: password123
