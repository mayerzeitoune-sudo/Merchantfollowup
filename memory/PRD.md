# Merchant Follow Up - Product Requirements Document

## Original Problem Statement
Build a comprehensive SMS platform "Merchant Follow Up" for automated payment reminders and lead follow-up with multi-organization and role-based access control.

## Implementation Status - March 14, 2026

### ✅ COMPLETED (This Session)

1. **OTP Verification Restored**
   - Registration now requires OTP verification
   - Simplified OTP input using 6 individual input fields (replaced buggy library)
   - First user → admin role, subsequent users → agent role

2. **Pipeline Fix**
   - Fixed route in `/app/backend/routes/enhanced.py` to respect org_admin/admin permissions
   - Org admins and admins can now update ANY client's pipeline stage
   - Pipeline drag-and-drop fully working

3. **User Profile Page**
   - New `/profile` route with user avatar, name, email, role
   - Change Password functionality
   - Account Information form (name, phone)
   - Security section showing verified status

4. **Bulk Delete Clients**
   - Checkbox selection on Clients table
   - "Delete (n)" button appears when clients selected
   - Backend endpoint: `POST /api/clients/bulk-delete`
   - Deletes associated conversations, deals, reminders

5. **Global Search Fixed**
   - Minimum 2 characters required before search triggers
   - Proper click-outside closing
   - Clear button to reset search
   - No longer shows all clients by default

6. **Phone Dialer Updated**
   - "Calling From" dropdown loads from owned phone numbers API
   - Quick Contacts search
   - Full dial pad functionality
   - Twilio Voice integration (MOCKED without credentials)

### ✅ PREVIOUSLY COMPLETED

- Multi-Organization Architecture (Org Admin > Admin > Team Leader > Agent > Viewer)
- Team Leader Role Assignment & Dashboard
- Agent Assignment to Team Leaders
- AI Conversation Summary on Client Profile
- Gmail Integration
- Funded Deals & Projections

### API Endpoints Added This Session

```
PUT  /api/profile - Update user profile (name, phone)
POST /api/profile/change-password - Change own password
POST /api/clients/bulk-delete - Delete multiple clients
PUT  /api/clients/{id}/pipeline - Now respects admin roles
```

### Technical Stack
- **Backend**: FastAPI + MongoDB + Motor
- **Frontend**: React + Tailwind + Shadcn/UI
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key
- **Auth**: JWT + OTP verification
- **SMS/Voice**: Twilio (SMS working, Voice mocked)

### Test Credentials
- **Org Admin**: admin@merchant.com / admin123

### Known MOCKED Features
1. **Twilio Voice** - Returns mock status without credentials
2. **A2P 10DLC Registration** - UI only, no backend

### Prioritized Backlog

**P0 - Critical**
- Add Twilio credentials for real Voice calls
- Implement SMS delivery webhooks

**P1 - Important**
- Data scoping by org_id across ALL endpoints
- Twilio A2P 10DLC registration API
- Real-time Notifications via WebSocket

**P2 - Nice to Have**
- Email Inbox View
- Auto-import leads from email
- Background job scheduler

### Files Modified This Session
- `/app/backend/server.py` - Profile routes, bulk delete, logging cleanup
- `/app/backend/routes/enhanced.py` - Fixed pipeline permissions
- `/app/frontend/src/pages/Profile.js` - NEW
- `/app/frontend/src/pages/Clients.js` - Bulk delete checkboxes
- `/app/frontend/src/pages/VerifyOTP.js` - Simplified OTP input
- `/app/frontend/src/components/GlobalSearch.js` - Min 2 chars, proper close
- `/app/frontend/src/components/PhoneDialer.js` - Phone number selection
- `/app/frontend/src/components/DashboardLayout.js` - Profile link
- `/app/frontend/src/App.js` - Profile route

### Test Reports
- `/app/test_reports/iteration_9.json`
