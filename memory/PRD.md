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

### Payment Reminders
- [x] Schedule reminders with amount and due date
- [x] Custom message templates
- [x] Track reminder status (pending/sent/failed)
- [x] Manual send trigger

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

## What's Been Implemented

### Date: January 2026

**Backend (FastAPI + MongoDB)**
- Complete REST API with JWT authentication
- User registration with OTP verification
- Clients, Reminders, Follow-ups, Campaigns CRUD
- SMS provider configuration storage
- AI response matching endpoint using GPT-5.2
- Dashboard statistics API

**Frontend (React + Tailwind + Shadcn)**
- Login/Register/OTP verification/Forgot password pages
- Dashboard with stats cards and quick actions
- Clients management with table and forms
- Reminders page with status badges
- Calendar page with follow-up scheduling
- Campaigns page with AI testing tool
- Settings page with multi-provider configuration
- White/orange "Merchant Blaze" theme
- Responsive design for mobile

## Prioritized Backlog

### P0 - Critical (Before Production)
1. Connect actual SMS providers (Twilio integration ready)
2. Implement real SMS sending when provider configured
3. Add SMS delivery status webhooks

### P1 - Important
1. Bulk import clients from CSV
2. Message templates library
3. Campaign analytics dashboard
4. Scheduled reminder automation

### P2 - Nice to Have
1. Client payment history
2. Invoice generation
3. Integration with payment processors
4. Team/multi-user support
5. Custom branding options

## Technical Architecture

```
Frontend: React 19 + Tailwind CSS + Shadcn/UI
Backend: FastAPI + Motor (async MongoDB)
Database: MongoDB
AI: OpenAI GPT-5.2 via Emergent Integrations
Auth: JWT with bcrypt password hashing
```

## Next Tasks

1. **User should add SMS provider credentials** (Twilio, Telnyx, etc.) in Settings
2. Implement actual SMS sending via provider SDK
3. Add webhook endpoints for delivery status
4. Create campaign automation scheduler
5. Add bulk client import feature
