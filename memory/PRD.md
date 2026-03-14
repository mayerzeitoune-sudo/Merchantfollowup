# Merchant Follow Up - Product Requirements Document

## Implementation Status - March 14, 2026

### ✅ COMPLETED (This Session)

#### Archive Users Feature
- **Archive button** on each team member card
- **Archived tab** on Team page shows all archived members
- **Restore button** to bring back archived users
- **Soft delete** - users are deactivated, not permanently deleted
- Archived users cannot log in
- Activity logged when archiving/restoring users

#### User History Page (`/users/:userId/history`)
- View complete activity history for any user
- **User Info Card**: Name, email, role badge, join date
- **Stats**: Clients count, messages count, deals count
- **Activity Log Tab**: All actions performed by the user
- **Login History Tab**: Login sessions with timestamps
- History button added to team member cards

### API Endpoints Added
```
POST /api/team/members/{id}/archive - Archive a user (soft delete)
POST /api/team/members/{id}/restore - Restore an archived user
GET  /api/team/members/archived - Get all archived users
GET  /api/users/{id}/history - Get user activity and login history
```

### Previous Session Completed
- Clickable notifications → navigate to client
- Team delete buttons fixed with AlertDialog
- Phone Numbers state search (all 50 US states)
- Phone dialer with Contacts tab
- Phone number auto-formatting (+1)
- OTP verification restored
- Pipeline fix (admin permissions)
- User Profile page
- Bulk delete clients
- Global search fix

### Technical Stack
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key

### Test Credentials
- **Org Admin**: admin@merchant.com / admin123

### Files Modified/Created
- `/app/backend/server.py` - Archive/restore/history endpoints
- `/app/frontend/src/pages/Team.js` - Archive UI, History button
- `/app/frontend/src/pages/UserHistory.js` - NEW user history page
- `/app/frontend/src/lib/api.js` - Archive and history API methods
- `/app/frontend/src/App.js` - UserHistory route

### Prioritized Backlog

**P0 - Critical**
- Add Twilio credentials for real Voice calls

**P1 - Important**
- Twilio A2P 10DLC registration
- Real-time notifications (WebSocket)

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email
- Login history tracking (IP, user agent)
