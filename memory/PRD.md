# Merchant Follow Up - Product Requirements Document

## Core Product
Full-stack MCA CRM with role-based access, Twilio SMS/Voice, automated drip campaigns, and credit-based billing.

## Credit System Rules
- **1 dollar = 5 credits** (organization-wide, not user-specific)
- **Credits** = platform costs: phone numbers (40 cr), texts (0.316 cr), user fees (500 cr/mo)
- **USD** = business revenue: deal amounts, funded volumes, collections, projected revenue, pipeline values
- **Credit Shop** = only place to buy credits (shows USD pricing)
- **Admins** can purchase credits; non-admins can view balance only

## Implementation Status

### Completed - Session 5 (March 27, 2026)
**Bug Fixes:**
- Dashboard "Shop Numbers" search fixed (extracted `available_numbers` from API response)
- Inbox area code suggestion: "$1.00/month" → "40 credits/number"
- Buy button in Inbox auto-fills area code + auto-searches on PhoneNumbers page via `?area=` param

**Dark Mode:**
- ThemeContext with localStorage persistence (`mf-theme`)
- Toggle in desktop + mobile header (sun/moon icons)
- Tailwind `darkMode: ['class']` — sidebar, header, content area all support dark mode

**Revenue Display Clarification:**
- Reverted projected revenue, deal values, pipeline values back to USD (real business money)
- Platform costs stay in credits (phone numbers, texts, billing fees)
- Clear separation: Credits = platform spend, USD = business revenue

### Completed - Session 4
- Credit system backend, Credit Shop page, global header balance
- Dashboard Buy Phone Numbers widget, USD→credits for platform costs
- Phone Blower auto-dialer, campaign trigger words

### Key Files
- `backend/routes/credits.py`: Credit system
- `frontend/src/context/ThemeContext.js`: Dark mode
- `frontend/src/pages/CreditShop.js`: Credit store
- `frontend/src/components/DashboardLayout.js`: Header + sidebar + dark mode

## Prioritized Backlog
**P0**: Wire Stripe, configure Twilio credentials, refactor server.py
**P1**: Support Email UI, A2P 10DLC, bulk uploads, WebSocket notifications
**P2**: Email Inbox, auto-import leads

## Credentials
- Admin: `john@acmefunding.com` / `Password123!`
- Agent: `mike@acmefunding.com` / `Password123!`
- Org Admin: `orgadmin@merchant.com` / `Admin123!`
