# Merchant Follow Up CRM — Product Requirements Document

## Original Problem Statement
Full-stack CRM for merchant follow-up with SMS (Twilio), credit-based economy, multi-org support, and role-based access control.

## User Personas
- **Org Admin**: Super admin who manages the platform. Sees ONLY their own personal data by default. Uses Impersonation feature to view other orgs.
- **Admin**: Manages their own organization, buys credits, assigns numbers. Sees all data within their org only.
- **Agent/User**: Works within their assigned org, uses assigned phone numbers. Sees only their own data.

## Core Requirements
- JWT authentication with role-based access (org_admin, admin, agent)
- Client management with pipeline stages
- SMS messaging via Twilio (10DLC compliant via Messaging Service SID)
- Credit-based economy for platform features (Stripe payments)
- Phone number purchasing and assignment (unique constraint enforced at DB level)
- Dark mode support
- Twilio is PLATFORM-LEVEL integration (one account for all orgs, keys never exposed to users)
- Strict data isolation: no cross-org leaks, no cross-user message visibility

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── credits.py    — Credit packages, balance, purchases, grants
│   │   ├── payments.py   — Stripe Checkout integration
│   │   ├── sms.py        — Twilio SMS send/receive/webhook
│   │   ├── enhanced.py   — Enhanced campaigns
│   │   ├── gmail.py      — Gmail OAuth (dynamic redirect)
│   │   ├── organizations.py
│   │   ├── moderation.py — Content moderation
│   │   └── phone_blower.py
│   ├── server.py          — Main FastAPI app (~6200 lines)
│   └── .env               — MONGO_URL, TWILIO_*, STRIPE_API_KEY
├── frontend/
│   ├── src/
│   │   ├── pages/         — Inbox, CreditShop, PhoneNumbers, Settings, etc.
│   │   ├── components/    — DashboardLayout, UI components
│   │   ├── context/       — AuthContext, ThemeContext
│   │   └── lib/api.js     — API client (platformApi, paymentsApi, etc.)
└── memory/
    └── PRD.md
```

## What's Been Implemented

### Session — March 31, 2026 (Latest)
- **Strict Data Isolation for org_admin**: Modified `get_accessible_user_ids` to return only org_admin's own user_id. Updated `get_owned_numbers` endpoint to only return numbers assigned/owned by org_admin. Fixed 3 SMS send endpoints to restrict org_admin to their own numbers.
- **Inbox Thread Ownership Guard**: Added client ownership cross-check in `get_inbox_threads` so threads only appear for clients the user actually owns.
- **Historical Data Cleanup**: Removed 4 orphaned conversations that leaked across user boundaries.
- **Unique Phone Number Index**: Added MongoDB unique index on `phone_numbers.phone_number` to prevent duplicate purchases at DB level.

### Session — March 30, 2026
- **Stripe Live Integration**: Checkout sessions on user's live Stripe account.
- **Data Isolation Overhaul**: 15+ endpoints now use `get_accessible_user_ids` for proper org scoping.
- **Twilio Number Search Fix**: Falls back to showing available numbers when specific area code has no inventory.
- **Duplicate Phone Number Prevention**: HTTP 409 if number already purchased by any org.

### Previous Sessions (completed)
- Twilio Live Integration (10DLC via Messaging Service SID)
- Twilio credentials migrated from .env to MongoDB (survives deployments)
- Dynamic webhook URL resolution via request headers
- Inbound SMS webhook duplicate client fix
- Org Admin Credit Granting UI
- Credit bypass fix, dark mode fixes, unread notifications
- Inbox smart sorting, mismatch modal, viewing indicator
- Google OAuth, Privacy/Terms pages, Signup overhaul, Branding
- Content Moderation system (banned words + blacklisted numbers)

## Prioritized Backlog

### P1
- Refactor `server.py` monolith into `routes/` directory (6200+ lines)
- Bulk user upload backend
- Support Email UI on Settings page
- Real email sending for OTPs (SendGrid/Resend)

### P2
- Email Inbox view
- Twilio Voice call functionality
- Auto-import leads from emails

### P3
- A2P 10DLC registration UI
- Real-time notifications via WebSockets

## Key DB Collections
- `users`: id, name, email, phone, role, org_id
- `clients`: id, name, user_id, org_id, phone, tags, pipeline_stage
- `organizations`: id, name, owner_id, credit_balance
- `phone_numbers`: id, phone_number (UNIQUE INDEX), assigned_user_id, org_id, twilio_sid, twilio_purchased
- `conversations`: id, user_id, client_id, direction, content, from_number, timestamp
- `credit_transactions`: id, org_id, user_id, type, source, credits_delta, usd_amount
- `payment_transactions`: id, session_id, org_id, user_id, package_id, amount_usd, credits, payment_status
- `system_config`: key, account_sid, auth_token, messaging_service_sid, updated_at (Twilio creds)

## Key API Endpoints
- `GET /api/platform/status` — Platform integration status (Twilio, Stripe)
- `POST /api/platform/twilio-config` — Save Twilio credentials to MongoDB
- `POST /api/payments/checkout` — Create Stripe checkout session
- `GET /api/phone-numbers/owned` — Org-scoped phone numbers (strict isolation)
- `GET /api/inbox/threads` — Org-scoped inbox threads with client ownership check
- `POST /api/sms/send` — Send SMS via Twilio Messaging Service

## 3rd Party Integrations
- **Twilio** (Live, Platform-level): SMS via Messaging Service SID for 10DLC
- **Stripe** (Live, User's account): Credit purchases via Checkout Sessions
- **MongoDB**: Primary database (with unique indexes for data integrity)
- **Google OAuth**: Gmail linking

## Test Credentials
- Org Admin: orgadmin@merchant.com / Admin123!
- Admin (Acme): john@acmefunding.com / Password123!
