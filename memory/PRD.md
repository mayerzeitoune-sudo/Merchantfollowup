# Merchant Follow Up - Product Requirements Document

## Core Product
Full-stack MCA (Merchant Cash Advance) CRM with role-based access (org_admin, admin, team_leader, agent), Twilio SMS/Voice integration, automated drip campaigns, and a **credit-based billing platform**.

## Credit System (Implemented March 27, 2026)

### Architecture
- **1 dollar = 5 credits**
- Credits are **organization-wide**, not user-specific
- Only admins can purchase credits
- All in-app purchases use credits (USD only in Credit Shop)
- Atomic MongoDB operations for safe balance mutations
- Full transaction ledger (credit_transactions collection)

### Credit Packages
| Tier | USD | Credits | Discount |
|------|-----|---------|----------|
| Starter | $20 | 100 | 0% |
| Growth | $100 | 525 | 4.76% |
| Professional | $250 | 1,350 | 7.41% |
| Scale | $500 | 2,850 | 12.28% |
| Executive | $1,000 | 6,100 | 18.03% |
| Enterprise | $2,500 | 16,700 | 25.15% |
| Titan | $5,000 | 36,750 | 31.97% |
| Black | $10,000 | 83,333 | 40% |

### Credit Costs
- Phone number: 40 credits
- Text message: 0.316 credits
- Per user/month: 500 credits

### Key Files
- `backend/routes/credits.py`: Full credit system (packages, balance, purchase, deduction, history)
- `frontend/src/pages/CreditShop.js`: Premium dark UI credit store
- `frontend/src/components/DashboardLayout.js`: Global header credit balance + sidebar

## Implementation Status

### Completed - Session 4 (March 27, 2026)
- Credit system backend (packages, purchase, deduction, balance, history, constants)
- Credit Shop page (premium dark design, 8 tiers, checkout flow, purchase history)
- Global header credit balance (desktop + mobile, links to Credit Shop)
- Dashboard "Buy Phone Numbers" widget with credit pricing
- Dashboard Organization Credits card
- Phone number purchase deducts 40 credits from org
- Insufficient credits protection (402 error)
- Admin-only purchasing (403 for non-admins)
- Converted USD → credits: PhoneNumbers, Projections, DripCampaigns, Billing, Organizations
- Phone Blower 5-min auto-dialer (backend + frontend)
- MAX AGGRESSION DRIP trigger words (15 pre-built stop words + custom)
- **Status**: VERIFIED (iteration_18.json — 100% pass, 12/12 backend + all frontend)

### Completed - Previous Sessions
- Drip campaigns, phone number management, org admin impersonation
- Client data access, billing system, Google OAuth, legal pages
- Signup/landing page overhaul, branding
- MAX AGGRESSION DRIP campaign (198 steps, hourly 9-5 M-F, 30 days)
- Phone Blower base page (queue, dispositions, analytics, compliance)
- APScheduler background processing
- Twilio pricing (8x base rate, 0.316 credits/text)
- Auto-enrollment for new leads

## Tech Stack
- **Backend**: FastAPI + MongoDB (Motor) + APScheduler
- **Frontend**: React + Tailwind + Shadcn/UI
- **Auth**: JWT with role-based access
- **Integrations**: Twilio (MOCKED), Payment (MOCKED)

## Prioritized Backlog

### P0 - Critical
- Configure live Twilio credentials (SID + Auth Token)
- Wire Stripe for real credit purchases
- Refactor server.py monolith (~5500 lines)

### P1 - Important
- Support Email UI on Settings page
- Twilio A2P 10DLC registration
- Bulk user uploads
- Real-time notifications (WebSocket)

### P2 - Nice to Have
- Email Inbox view
- Auto-import leads from email

## Credentials
- Org Admin: `orgadmin@merchant.com` / `Admin123!`
- Admin: `john@acmefunding.com` / `Password123!`
- Agent: `mike@acmefunding.com` / `Password123!`

## Test Reports
- `/app/test_reports/iteration_18.json` — Credit system: 100% (12/12 backend + all frontend)
- `/app/test_reports/iteration_17.json` — Phone Blower + Trigger Words: 100%
