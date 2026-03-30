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
- Credit-based economy for platform features
- Phone number purchasing and assignment
- Dark mode support

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── credits.py    — Credit packages, balance, purchases, grants
│   │   ├── payments.py   — Stripe Checkout integration
│   │   ├── sms.py        — Twilio SMS send/receive/webhook
│   │   ├── enhanced.py   — Enhanced campaigns
│   │   ├── gmail.py      — Gmail OAuth
│   │   ├── organizations.py
│   │   └── phone_blower.py
│   ├── server.py          — Main FastAPI app (monolith ~5900 lines)
│   └── .env               — MONGO_URL, TWILIO_*, STRIPE_API_KEY
├── frontend/
│   ├── src/
│   │   ├── pages/         — Inbox, CreditShop, PhoneNumbers, etc.
│   │   ├── components/    — DashboardLayout, UI components
│   │   ├── context/       — AuthContext, ThemeContext
│   │   └── lib/api.js     — API client
└── memory/
    └── PRD.md
```

## What's Been Implemented

### Session — March 30, 2026
- **Stripe Live Integration**: Real Stripe Checkout for credit purchases using user's live keys. Backend creates checkout sessions, frontend redirects to Stripe, polls status on return, credits granted atomically with double-credit prevention. Webhook handler also processes payments.
- **Data Isolation Overhaul (15+ endpoints)**: Fixed `update_client`, `delete_client`, `bulk_delete_clients`, `update_client_pipeline`, `phone-numbers update/delete`, `dashboard/stats`, `reminders`, `followups`, `campaigns`, `funded/stats`, `funded/deals`, `funded/analytics`, `lead_forms`, `team/stats` — all now use `get_accessible_user_ids` for proper org scoping.
- **Duplicate Phone Number Prevention**: Purchase endpoint rejects numbers already owned by any org (HTTP 409).
- **Inbound SMS Routing Fix**: Webhook now prefers phone number records with org_id to prevent cross-org message routing.
- **Area Code Popup Removed**: Removed from Inbox per user request.
- **Conversation Data Cleanup**: Fixed misrouted inbound messages attributed to wrong org.

### Previous Sessions (completed)
- Twilio Live Integration (10DLC via Messaging Service SID)
- Org Admin Credit Granting UI
- Phone number formatting fix
- Credit bypass fix
- Dark mode UI fixes
- Unread message notifications
- Inbox smart sorting rewrite
- Google OAuth, Privacy Policy, Terms of Service pages
- Signup form overhaul, branding updates
- Org admin impersonation feature
- Billing system

## Prioritized Backlog

### P0
- Test end-to-end Stripe purchase flow (live)
- Continue refactoring server.py monolith

### P1
- Support Email UI on Settings page
- Real email sending for OTPs (SendGrid/Resend integration)
- Bulk user upload backend

### P2
- Email Inbox view
- Auto-import leads from emails
- Voice call functionality (Twilio)

## Key DB Collections
- `users`: id, name, email, phone, role, org_id
- `clients`: id, name, user_id, org_id, phone, tags, pipeline_stage
- `organizations`: id, name, owner_id, credit_balance
- `phone_numbers`: id, phone_number, assigned_user_id, org_id, twilio_sid, twilio_purchased
- `conversations`: id, user_id, client_id, direction, content, from_number, timestamp
- `credit_transactions`: id, org_id, user_id, type, source, credits_delta, usd_amount
- `payment_transactions`: id, session_id, org_id, user_id, package_id, amount_usd, credits, payment_status, status

## Key API Endpoints
- `POST /api/payments/checkout` — Create Stripe checkout session
- `GET /api/payments/checkout/status/{session_id}` — Poll payment status
- `POST /api/webhook/stripe` — Stripe webhook (no auth)
- `GET /api/inbox/threads` — Org-scoped inbox threads
- `POST /api/sms/send` — Send SMS via Twilio Messaging Service
- `GET /api/phone-numbers/owned` — Role-scoped phone numbers
- `GET /api/dashboard/stats` — Org-scoped dashboard stats

## 3rd Party Integrations
- **Twilio** (Live): SMS via Messaging Service SID for 10DLC compliance
- **Stripe** (Live): Credit purchases via Checkout Sessions
- **MongoDB**: Primary database
- **Google OAuth**: Gmail linking (requires user Google Cloud config)

## Test Credentials
- Org Admin: orgadmin@merchant.com / Admin123!
- Admin (Acme): john@acmefunding.com / Password123!
