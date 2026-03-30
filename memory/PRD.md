# Merchant Follow Up CRM — PRD

## Product Overview
CRM platform for merchant payment follow-ups with SMS automation, credit-based billing, and multi-org support.

## Architecture
- **Backend**: FastAPI + Motor (async MongoDB)
- **Frontend**: React + Tailwind CSS + Shadcn/UI
- **Database**: MongoDB
- **Integrations**: Twilio (SMS/Voice via Messaging Service), Google OAuth

## Auth & Roles
- `org_admin` — Super admin across all orgs (impersonation, credit grants)
- `admin` — Org-level admin (manages team, clients, campaigns)
- `agent` — Individual user (sees assigned clients/numbers)

## Credit System
- Platform costs in credits (1 USD = 5 credits)
- Business metrics (deals, pipeline) in USD
- Admin Credit Shop for purchasing packages
- Org Admin can grant credits to any org
- Phone number purchase: 40 credits
- SMS send: 1 credit per message
- org_admin without org_id cannot bypass credits

## Twilio Integration (LIVE — A2P Compliant)
- Messaging Service SID: MGe8c2388e2bd76b308c013071f7f848a6
- All sends route through Messaging Service for 10DLC compliance
- New purchases auto-add to Messaging Service
- Webhooks: /api/sms/webhook/inbound (Form data + TwiML), /api/sms/webhook/status
- Phone search: SMS-enabled only, respects area code (no toll-free fallback)
- Mock numbers blocked from sending with clear error
- Status callback on all outbound messages

## Completed Features
- [x] User auth with JWT + role-based access
- [x] Multi-org management with impersonation
- [x] Client management with phone formatting (fixed)
- [x] Credit-based billing system with admin grants
- [x] Phone number search/purchase (live Twilio, SMS-enabled filter)
- [x] SMS sending (live, A2P compliant, delivered)
- [x] Inbound SMS webhook (Form data, TwiML response)
- [x] Status callback webhook
- [x] Campaign system with trigger words
- [x] Phone Blower auto-dialer
- [x] Dark mode (ThemeContext) — comprehensive fix across all pages
- [x] Privacy Policy & Terms of Service
- [x] Message status indicators (delivered/failed/undelivered)
- [x] Credit bypass fix (mandatory deduction for all purchases)
- [x] Unread message notification badge (sidebar + client dots)
- [x] Message ordering fix (chronological: oldest top, newest bottom)

## Test Credentials
- Org Admin: orgadmin@merchant.com / Admin123!
- Admin: john@acmefunding.com / Password123!
- Agent: mike@acmefunding.com / Password123!

## Remaining Tasks
### P1
- Support Email UI on Settings page
- A2P 10DLC registration backend helper
- Backend for bulk user uploads

### P2
- Real-time notifications (WebSockets)
- Email Inbox view
- Auto-import leads from emails
- Refactor server.py monolith into routes/
