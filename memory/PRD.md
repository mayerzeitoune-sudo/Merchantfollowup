# Merchant Follow Up CRM — Product Requirements Document

## Original Problem Statement
Full-stack CRM for merchant follow-up with SMS (Twilio), credit-based economy, multi-org support, and role-based access control.

## User Personas
- **Org Admin**: Super admin who manages the platform. Sees ONLY their own personal data by default. Uses Impersonation feature to view other orgs.
- **Admin**: Manages their own organization, buys credits, assigns numbers. Sees all data within their org only.
- **Agent/User**: Works within their assigned org, uses assigned phone numbers. Sees only their own data.

## Core Architecture Principles
1. **Phone number owner is source of truth** — whoever purchased/is assigned a number is the ONLY one who sees messages on it
2. **Client ownership drives data visibility** — inbox threads and conversations are scoped by client ownership, not message `user_id`
3. **External credentials stored in MongoDB** — not in `.env` files (deployment caching issues). Both Twilio and Stripe keys use `platform_config` collection.
4. **Dynamic webhook URLs** — use `request.base_url`, never hardcoded URLs

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── credits.py, payments.py, sms.py, moderation.py, gmail.py, etc.
│   ├── server.py (~6350 lines)
│   └── .env
├── frontend/
│   ├── src/pages/    — Inbox.js, CreditShop.js, Settings.js, etc.
│   ├── src/lib/api.js
└── memory/PRD.md
```

## What's Been Implemented

### Session — March 31, 2026 (Latest)
- **Stripe keys migrated to MongoDB**: `get_stripe_creds()` helper reads from `platform_config` collection first, falls back to `.env`. Mirrors Twilio pattern exactly.
- **Stripe config API**: `POST /api/admin/stripe-config` saves & verifies keys, `GET /api/admin/stripe-config` returns status. Org_admin only.
- **Stripe config UI**: Settings page shows Stripe status card + config form for org_admin. "Update Stripe Credentials" dialog when already connected.
- **Platform status updated**: `GET /api/platform/status` now checks Stripe from MongoDB instead of `.env`.
- **Stripe webhook updated**: `/api/webhook/stripe` now uses `get_stripe_creds()` from MongoDB.
- **Restricted key support**: Stripe verification handles `PermissionError` for restricted keys (`rk_live_...`).

### Previous Sessions
- Inbound SMS routing fix, Frontend auto-refresh, Client-based inbox threads
- Strict data isolation, org_admin only sees personal data
- Twilio credentials migrated to MongoDB
- Dynamic webhook URL resolution
- Content moderation, org admin impersonation
- Google OAuth, Privacy/Terms pages, branding
- Credit system, Stripe live integration

## Prioritized Backlog

### P0
- Deploy to production (user must click Deploy on Emergent platform)

### P1
- Refactor `server.py` monolith into `routes/` directory (6350+ lines)
- Support Email UI on Settings page
- Bulk user upload backend

### P2
- Email Inbox view
- Twilio Voice call functionality

### P3
- A2P 10DLC registration UI
- Real-time notifications via WebSockets

## Key DB Collections
- `users`: id, name, email, role, org_id
- `clients`: id, name, user_id, org_id, phone, pipeline_stage
- `phone_numbers`: id, phone_number (UNIQUE INDEX), user_id, assigned_user_id, org_id, twilio_purchased
- `conversations`: id, user_id, client_id, direction, content, from_number, timestamp
- `platform_config`: key="twilio_creds" | key="stripe_creds" — stores API credentials that survive deployments

## Test Credentials
- Org Admin: orgadmin@merchant.com / Admin123!
- Admin (Acme): john@acmefunding.com / Password123!
