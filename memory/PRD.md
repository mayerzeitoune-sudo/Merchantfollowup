# Merchant Follow Up CRM — Product Requirements Document

## Original Problem Statement
Full-stack CRM for merchant follow-up with SMS (Twilio), credit-based economy, multi-org support, and role-based access control.

## User Personas
- **Org Admin**: Super admin who sees all orgs, grants credits, manages platform
- **Admin**: Manages their own organization, buys credits, assigns numbers
- **Agent/User**: Works within their assigned org, uses assigned phone numbers

## Core Requirements
- JWT authentication with role-based access (org_admin, admin, agent)
- Client management with pipeline stages
- SMS messaging via Twilio (10DLC compliant via Messaging Service SID)
- Credit-based economy for platform features (Stripe payments)
- Phone number purchasing and assignment
- Dark mode support
- Twilio is PLATFORM-LEVEL integration (one account for all orgs, keys never exposed to users)

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
│   │   └── phone_blower.py
│   ├── server.py          — Main FastAPI app (~5950 lines)
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

### Session — March 30, 2026 (Latest)
- **Stripe Live Integration**: Checkout sessions on user's live Stripe account. Backend creates sessions, frontend redirects, polls status, credits granted atomically.
- **Data Isolation Overhaul**: 15+ endpoints now use `get_accessible_user_ids` for proper org scoping. Fixed cross-org conversation leaks and duplicate phone number issues.
- **Platform Integrations Status**: New Settings tab showing Twilio + Stripe connection status (green badges, no keys exposed). Removed old "SMS Providers" tab where users could add their own keys.
- **Twilio Number Search Fix**: Falls back to showing available numbers when specific area code has no inventory.
- **Gmail OAuth Fix**: Dynamic redirect using stored origin (no hardcoded FRONTEND_URL).
- **Duplicate Phone Number Prevention**: HTTP 409 if number already purchased by any org.
- **Area Code Popup Removed**: No longer shows when clicking a client in Inbox.

### Previous Sessions (completed)
- Twilio Live Integration (10DLC via Messaging Service SID)
- Org Admin Credit Granting UI
- Credit bypass fix, dark mode fixes, unread notifications
- Inbox smart sorting, mismatch modal, viewing indicator
- Google OAuth, Privacy/Terms pages, Signup overhaul, Branding

## Prioritized Backlog

### P0
- **DEPLOY NOW** — Production is running old code
- Content Moderation System (banned words + blacklisted numbers, org_admin managed)

### P1
- Support Email UI on Settings page
- Real email sending for OTPs (SendGrid/Resend)
- Bulk user upload backend

### P2
- Email Inbox view, Auto-import leads, Voice calls
- Refactor server.py monolith into routes/

## Key DB Collections
- `users`: id, name, email, phone, role, org_id
- `clients`: id, name, user_id, org_id, phone, tags, pipeline_stage
- `organizations`: id, name, owner_id, credit_balance
- `phone_numbers`: id, phone_number, assigned_user_id, org_id, twilio_sid, twilio_purchased
- `conversations`: id, user_id, client_id, direction, content, from_number, timestamp
- `credit_transactions`: id, org_id, user_id, type, source, credits_delta, usd_amount
- `payment_transactions`: id, session_id, org_id, user_id, package_id, amount_usd, credits, payment_status

## Key API Endpoints
- `GET /api/platform/status` — Platform integration status (Twilio, Stripe)
- `POST /api/payments/checkout` — Create Stripe checkout session
- `GET /api/payments/checkout/status/{session_id}` — Poll payment status
- `POST /api/webhook/stripe` — Stripe webhook (no auth)
- `GET /api/phone-numbers/available` — Search Twilio numbers (with fallback)
- `GET /api/inbox/threads` — Org-scoped inbox threads
- `POST /api/sms/send` — Send SMS via Twilio Messaging Service

## 3rd Party Integrations
- **Twilio** (Live, Platform-level): SMS via Messaging Service SID for 10DLC
- **Stripe** (Live, User's account): Credit purchases via Checkout Sessions
- **MongoDB**: Primary database
- **Google OAuth**: Gmail linking

## Test Credentials
- Org Admin: orgadmin@merchant.com / Admin123!
- Admin (Acme): john@acmefunding.com / Password123!
