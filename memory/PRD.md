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
3. **Twilio credentials stored in MongoDB** — not in `.env` files (deployment caching issues)
4. **Dynamic webhook URLs** — use `request.base_url`, never hardcoded URLs

## Architecture
```
/app/
├── backend/
│   ├── routes/
│   │   ├── credits.py, payments.py, sms.py, moderation.py, gmail.py, etc.
│   ├── server.py (~6200 lines)
│   └── .env
├── frontend/
│   ├── src/pages/    — Inbox.js, CreditShop.js, Settings.js, etc.
│   ├── src/lib/api.js
└── memory/PRD.md
```

## What's Been Implemented

### Session — March 31, 2026 (Latest)
- **Inbound SMS routing fix**: Webhook now resolves owner from `phone_numbers` table FIRST, then finds client within owner's org scope. Prevents cross-org client matching.
- **Frontend auto-refresh**: Conversation panel now polls every 5 seconds for new inbound messages. Thread list polls every 8 seconds.
- **Client-based inbox threads**: Threads are now aggregated by client ownership (not message `user_id`). This means even messages with null/wrong `user_id` appear correctly.
- **Conversation query fix**: Removed redundant `user_id` filter from conversation endpoint — client ownership verification is sufficient.
- **Strict data isolation**: org_admin only sees their own data, unique phone number index, 3 SMS send endpoints restricted to owned numbers.
- **Legacy webhook handler updated**: Same owner-first routing logic applied to both `routes/sms.py` and `server.py` legacy handler.

### Previous Sessions
- Stripe live integration, credit system
- Twilio credentials migrated to MongoDB
- Dynamic webhook URL resolution
- Inbound SMS duplicate client fix
- Content moderation, org admin impersonation
- Google OAuth, Privacy/Terms pages, branding

## Prioritized Backlog

### P1
- Refactor `server.py` monolith into `routes/` directory (6200+ lines)
- Bulk user upload backend
- Support Email UI on Settings page

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
- `system_config` / `platform_config`: Twilio credentials stored here

## Test Credentials
- Org Admin: orgadmin@merchant.com / Admin123!
- Admin (Acme): john@acmefunding.com / Password123!
