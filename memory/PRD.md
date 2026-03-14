# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 14, 2026

### ✅ COMPLETED (This Session)

#### Inbox Page Redesign (`/inbox`)
- **New dedicated Inbox page** with split-view design
- **Left panel**: Contact list with search, **working stage filter**
- **Right panel**: Conversation view with message history
- **Phone number selector**: Dropdown showing actual phone numbers to send from
- **Features**: Quick templates, conversation chains by phone number
- **Backend fixes**: Updated 3 endpoints to use role-based access (`get_accessible_user_ids`)

#### Calendar Page Redesign (`/calendar`)
- **Improved stats cards** with colorful gradient backgrounds
- **Better calendar grid** with modern styling
- **Upcoming section** showing next 7 days of follow-ups
- **Enhanced follow-up cards** with hover actions

### Backend Fixes Applied
```
Fixed endpoints to use get_accessible_user_ids() for role-based access:
- POST /api/followups (create follow-up)
- GET /api/contacts/{client_id}/chains (conversation chains)
- POST /api/contacts/{client_id}/send-sms (send SMS)
```

### Navigation Updates
- Added `/inbox` route for new Inbox page
- Renamed old "Inbox" to "Messaging" in sidebar
- Both Inbox and Messaging (Contacts) pages available

### Previous Session Completed
- Archive users and user history page
- Clickable notifications
- Team delete buttons with AlertDialog
- Phone Numbers state search
- Phone dialer with Contacts tab
- OTP verification restored
- Pipeline fix for admin permissions
- User Profile page
- Bulk delete clients
- Global search fix

### Technical Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

### Test Credentials
- **Org Admin**: admin@merchant.com / admin123

### Files Modified/Created This Session
- `/app/frontend/src/pages/Inbox.js` - NEW inbox page
- `/app/frontend/src/pages/CalendarPage.js` - Redesigned calendar
- `/app/frontend/src/components/DashboardLayout.js` - Navigation updates
- `/app/frontend/src/App.js` - Added /inbox route
- `/app/backend/server.py` - Fixed 3 endpoints for role-based access

### Prioritized Backlog

**P0 - Critical**
- Add Twilio credentials for real Voice calls
- Refactor `server.py` monolith into resource-specific route files

**P1 - Important**
- Twilio A2P 10DLC registration backend
- Implement Bulk User Upload backend (UI exists)
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email
- Background automation for drip campaigns
- N+1 Query Optimizations

### Known Issues
- **Monolithic server.py**: Backend file is too large, needs refactoring
- **Twilio Voice**: Placeholder credentials, not fully integrated
- **Bulk User Upload**: Backend endpoint is placeholder
