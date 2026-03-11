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

## Implementation Status - December 2025

### ✅ COMPLETED FEATURES

#### Core Features
- **Authentication**: JWT-based login/register, OTP verification (UI needs improvement)
- **Client Management**: CRUD operations, tags, notes, pipeline stages, balance tracking, address field
- **Message Templates**: Create/edit templates, variable substitution, quick send from inbox
- **Branding**: Company logo integrated into Login, Register pages, and Dashboard sidebar with professional styling
- **Tag Management (NEW)**: Inline tag editing on Client Profile page, Inbox/Contacts page with visual editor
- **Phone Number Tracking (NEW)**: Template sending and call initiation now properly track which from_number is being used

#### Smart Drip Campaigns (NEW)
- Multi-step automated sequences
- SMS and Email channel support
- Auto-stop on reply feature
- Manual resume capability
- Enroll contacts individually or by tags
- Track campaign progress per contact
- Trigger-based responses

#### Follow-Up Reminder System (NEW)
- Today's follow-ups dashboard
- Snooze, complete, reschedule actions
- Priority levels (high/normal/low)
- Miss detection for past-due follow-ups
- Client info integration

#### Performance Analytics (NEW)
- Messages sent/received tracking
- Response rate calculation
- Top templates by usage
- Campaign performance metrics
- Engagement tips

#### Lead Capture (NEW)
- Embeddable lead capture forms
- CSV import with auto-tagging
- Webhook endpoints for Zapier/Make
- Auto-enroll in campaigns

#### Dead Lead Revival (NEW)
- Target inactive leads by days
- Filter by tags
- Customizable revival messages
- Track revival success rate

#### SMS Compliance (NEW)
- STOP keyword detection
- Opt-out management
- Auto-reply on unsubscribe
- Quiet hours configuration
- Do Not Contact list
- Compliance best practices

#### Contact Segmentation (ENHANCED)
- Pipeline stages (new → won/lost)
- Bulk tag operations
- Filter by tags and stage
- Extended tag library

#### AI Integration
- Response matching using GPT-5.2
- AI suggestions for follow-ups
- Message rewriting with tone adjustment

#### Placeholder Features (UI Only)
- Phone number marketplace
- Browser-based calling
- Gift store
- Domain management

### Technical Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT tokens

### API Version: 2.0.0

## Database Collections
- users, clients, conversations
- message_templates, reminder_schedules
- followups, appointments
- enhanced_campaigns, campaign_enrollments
- lead_forms, lead_webhooks
- revival_campaigns
- opt_outs, compliance_settings
- notifications

## Key API Endpoints

### Authentication
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/verify_otp

### Clients & Contacts
- GET/POST /api/clients
- GET/PUT/DELETE /api/clients/{id}
- PUT /api/clients/{id}/pipeline

### Enhanced Campaigns
- GET/POST /api/campaigns/enhanced
- POST /api/campaigns/enhanced/{id}/enroll
- POST /api/campaigns/enhanced/{id}/stop/{client_id}
- POST /api/campaigns/enhanced/{id}/resume/{client_id}

### Follow-ups
- GET /api/followups/today
- GET /api/followups/missed
- POST /api/followups/{id}/snooze
- POST /api/followups/{id}/complete

### Lead Capture
- GET/POST /api/leads/forms
- POST /api/leads/import/csv
- POST /api/leads/webhook

### Analytics
- GET /api/analytics/overview
- GET /api/analytics/campaigns/{id}

### Compliance
- GET/PUT /api/compliance/settings
- GET /api/compliance/opt-outs
- POST/DELETE /api/compliance/opt-out

### Revival
- GET/POST /api/revival/campaigns
- POST /api/revival/campaigns/{id}/run

### AI
- POST /api/ai/suggest
- POST /api/ai/rewrite

## Prioritized Backlog

### P0 - Critical (Before Production)
1. Connect actual SMS provider (Twilio) for real message sending
2. Implement SMS delivery webhooks
3. Background job scheduler for automated campaigns

### P1 - Important
1. Multi-user team accounts with roles
2. Mobile push notifications
3. Calendar sync (Google/Outlook)
4. Email channel integration (SendGrid/Resend)
5. Appointment booking with links

### P2 - Nice to Have
1. Real-time conversation updates (WebSocket)
2. Bulk message sending
3. Advanced reporting exports
4. Client payment tracking
5. Invoice generation
6. Real gift delivery integration
7. Domain registrar integration

## Test Credentials
- Email: template_test@example.com
- Password: password123

## Known Issues
1. OTP input component has usability issues
2. All SMS/Voice functionality is mocked (requires provider setup)

## Mocked Features (UI Placeholders)
- Phone number purchasing
- Browser-based calling  
- Gift ordering and delivery
- Domain purchasing
- Actual SMS sending (pending provider credentials)
