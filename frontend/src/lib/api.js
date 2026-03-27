import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth interceptor to add token
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Clients API
export const clientsApi = {
  getAll: (tag) => axios.get(`${API}/clients`, { params: { tag } }),
  getOne: (id) => axios.get(`${API}/clients/${id}`),
  create: (data) => axios.post(`${API}/clients`, data),
  update: (id, data) => axios.put(`${API}/clients/${id}`, data),
  delete: (id) => axios.delete(`${API}/clients/${id}`),
  getTags: () => axios.get(`${API}/clients/tags`),
  updateBirthday: (id, birthday) => axios.put(`${API}/clients/${id}/birthday`, null, { params: { birthday } }),
  addEvent: (id, eventName, eventDate) => axios.post(`${API}/clients/${id}/events`, null, { params: { event_name: eventName, event_date: eventDate } }),
  updatePipeline: (id, stage) => axios.put(`${API}/clients/${id}/pipeline`, null, { params: { stage } }),
  generateSummary: (id) => axios.post(`${API}/clients/${id}/generate-summary`),
  getSummary: (id) => axios.get(`${API}/clients/${id}/summary`)
};

// AI Assistant API
export const aiApi = {
  generateMessage: (clientId, context) => axios.post(`${API}/ai/generate-message`, { client_id: clientId, context }),
  rewriteMessage: (message, tone) => axios.post(`${API}/ai/rewrite-message`, { message, tone }),
  analyzeDeal: (clientId) => axios.post(`${API}/ai/analyze-deal`, { client_id: clientId }),
  generateTemplate: (type, context, tone) => axios.post(`${API}/ai/generate-template`, { type, context, tone }),
  generateDripSequence: (goal, numMessages, industry, context) => axios.post(`${API}/ai/generate-drip-sequence`, { goal, num_messages: numMessages, industry, context }),
  generateRevivalMessage: (daysInactive, lastStage, industry, approach, context) => axios.post(`${API}/ai/generate-revival-message`, { days_inactive: daysInactive, last_stage: lastStage, industry, approach, context }),
  chat: (message, context) => axios.post(`${API}/ai/chat`, { message, context })
};

// Reminders API
export const remindersApi = {
  getAll: (status) => axios.get(`${API}/reminders`, { params: { status } }),
  getOne: (id) => axios.get(`${API}/reminders/${id}`),
  create: (data) => axios.post(`${API}/reminders`, data),
  update: (id, data) => axios.put(`${API}/reminders/${id}`, data),
  delete: (id) => axios.delete(`${API}/reminders/${id}`),
  send: (id) => axios.post(`${API}/reminders/${id}/send`)
};

// Follow-ups API (Enhanced)
export const followupsApi = {
  getAll: (date) => axios.get(`${API}/followups`, { params: { date } }),
  getOne: (id) => axios.get(`${API}/followups/${id}`),
  create: (data) => axios.post(`${API}/followups`, data),
  update: (id, data) => axios.put(`${API}/followups/${id}`, data),
  delete: (id) => axios.delete(`${API}/followups/${id}`),
  // Enhanced
  getToday: () => axios.get(`${API}/followups/today`),
  getMissed: () => axios.get(`${API}/followups/missed`),
  snooze: (id, snoozeUntil) => axios.post(`${API}/followups/${id}/snooze`, null, { params: { snooze_until: snoozeUntil } }),
  complete: (id, notes) => axios.post(`${API}/followups/${id}/complete`, null, { params: { notes } }),
  reschedule: (id, newDate, newTime) => axios.post(`${API}/followups/${id}/reschedule`, null, { params: { new_date: newDate, new_time: newTime } })
};

// Campaigns API (Original)
export const campaignsApi = {
  getAll: () => axios.get(`${API}/campaigns`),
  getOne: (id) => axios.get(`${API}/campaigns/${id}`),
  create: (data) => axios.post(`${API}/campaigns`, data),
  update: (id, data) => axios.put(`${API}/campaigns/${id}`, data),
  delete: (id) => axios.delete(`${API}/campaigns/${id}`)
};

// Enhanced Drip Campaigns API
export const enhancedCampaignsApi = {
  getAll: (status) => axios.get(`${API}/campaigns/enhanced`, { params: { status } }),
  getOne: (id) => axios.get(`${API}/campaigns/enhanced/${id}`),
  create: (data) => axios.post(`${API}/campaigns/enhanced`, data),
  update: (id, data) => axios.put(`${API}/campaigns/enhanced/${id}`, data),
  delete: (id) => axios.delete(`${API}/campaigns/enhanced/${id}`),
  enrollContacts: (campaignId, clientIds) => axios.post(`${API}/campaigns/enhanced/${campaignId}/enroll`, clientIds),
  stopForContact: (campaignId, clientId, reason) => axios.post(`${API}/campaigns/enhanced/${campaignId}/stop/${clientId}`, null, { params: { reason } }),
  resumeForContact: (campaignId, clientId) => axios.post(`${API}/campaigns/enhanced/${campaignId}/resume/${clientId}`),
  getEnrollments: (campaignId, status) => axios.get(`${API}/campaigns/enhanced/${campaignId}/enrollments`, { params: { status } }),
  // Pre-built campaigns
  getPrebuilt: () => axios.get(`${API}/campaigns/prebuilt`),
  getPrebuiltDetail: (type) => axios.get(`${API}/campaigns/prebuilt/${type}`),
  launchPrebuilt: (type, data) => axios.post(`${API}/campaigns/prebuilt/${type}/launch`, data),
  removeClient: (campaignId, clientId) => axios.post(`${API}/campaigns/${campaignId}/remove-client/${clientId}`),
  getClientActiveCampaigns: (clientId) => axios.get(`${API}/campaigns/client/${clientId}/active`),
  processDue: () => axios.post(`${API}/campaigns/process-due`),
  getSystemProjections: () => axios.get(`${API}/projections/system`)
};

// Phone Blower API
export const phoneBlowerApi = {
  getSettings: () => axios.get(`${API}/phone-blower/settings`),
  updateSettings: (data) => axios.put(`${API}/phone-blower/settings`, data),
  getLeadProfile: (clientId) => axios.get(`${API}/phone-blower/lead/${clientId}`),
  logCall: (data) => axios.post(`${API}/phone-blower/call`, data),
  getAnalytics: () => axios.get(`${API}/phone-blower/analytics`),
  getQueue: () => axios.get(`${API}/phone-blower/queue`),
};

// SMS Providers API
export const smsProvidersApi = {
  getAll: () => axios.get(`${API}/sms-providers`),
  create: (data) => axios.post(`${API}/sms-providers`, data),
  delete: (id) => axios.delete(`${API}/sms-providers/${id}`),
  activate: (id) => axios.put(`${API}/sms-providers/${id}/activate`)
};

// Phone Numbers API
export const phoneNumbersApi = {
  searchAvailable: (areaCode, country = 'US', limit = 20) => 
    axios.get(`${API}/phone-numbers/available`, { params: { area_code: areaCode, country, limit } }),
  purchase: (data) => axios.post(`${API}/phone-numbers/purchase`, data),
  getOwned: () => axios.get(`${API}/phone-numbers/owned`),
  release: (id) => axios.delete(`${API}/phone-numbers/${id}`),
  setDefault: (id) => axios.put(`${API}/phone-numbers/${id}/set-default`),
  getDefault: () => axios.get(`${API}/phone-numbers/default`),
  update: (id, data) => axios.put(`${API}/phone-numbers/${id}`, data),
  getPurchaseStatus: () => axios.get(`${API}/phone-numbers/purchase-status`),
  getSettings: () => axios.get(`${API}/settings/phone-numbers`),
  updateSettings: (data) => axios.put(`${API}/settings/phone-numbers`, data),
  requestDeletion: (id) => axios.post(`${API}/phone-numbers/${id}/request-deletion`)
};

// Contacts/Messaging API
export const contactsApi = {
  getConversation: (clientId, fromNumber) => axios.get(`${API}/contacts/${clientId}/conversation`, { 
    params: { from_number: fromNumber } 
  }),
  getChains: (clientId) => axios.get(`${API}/contacts/${clientId}/chains`),
  sendSms: (clientId, data) => axios.post(`${API}/contacts/${clientId}/send-sms`, data),
  initiateCall: (clientId, fromNumber) => axios.post(`${API}/contacts/${clientId}/initiate-call`, null, {
    params: { from_number: fromNumber }
  }),
  // Simulate inbound SMS for testing reply context feature
  simulateInbound: (clientId, message, fromNumber) => axios.post(`${API}/sms/simulate-inbound`, {
    client_id: clientId,
    message: message,
    from_number: fromNumber
  })
};

// Inbox API
export const inboxApi = {
  getConversations: (params) => axios.get(`${API}/inbox/conversations`, { params }),
  markRead: (clientId) => axios.post(`${API}/inbox/mark-read/${clientId}`),
  search: (query) => axios.get(`${API}/inbox/search`, { params: { query } })
};

// Gift Store API
export const giftsApi = {
  getCatalog: (category) => axios.get(`${API}/gifts/catalog`, { params: { category } }),
  getCategories: () => axios.get(`${API}/gifts/categories`),
  createOrder: (data) => axios.post(`${API}/gifts/orders`, data),
  getOrders: () => axios.get(`${API}/gifts/orders`),
  getUpcomingEvents: () => axios.get(`${API}/gifts/upcoming-events`)
};

// Domains & Email API
export const domainsApi = {
  getAll: () => axios.get(`${API}/domains`),
  create: (data) => axios.post(`${API}/domains`, data),
  getDnsInstructions: (id) => axios.get(`${API}/domains/${id}/dns-instructions`),
  verify: (id) => axios.post(`${API}/domains/${id}/verify`),
  delete: (id) => axios.delete(`${API}/domains/${id}`),
  getMarketplace: () => axios.get(`${API}/domains/marketplace`)
};

export const emailAccountsApi = {
  getAll: () => axios.get(`${API}/email-accounts`),
  create: (data) => axios.post(`${API}/email-accounts`, data),
  delete: (id) => axios.delete(`${API}/email-accounts/${id}`)
};

// Message Templates API
export const templatesApi = {
  getAll: (category) => axios.get(`${API}/templates`, { params: { category } }),
  getOne: (id) => axios.get(`${API}/templates/${id}`),
  create: (data) => axios.post(`${API}/templates`, data),
  update: (id, data) => axios.put(`${API}/templates/${id}`, data),
  delete: (id) => axios.delete(`${API}/templates/${id}`),
  getCategories: () => axios.get(`${API}/templates/categories`),
  use: (id) => axios.post(`${API}/templates/${id}/use`),
  sendToContact: (clientId, templateId, variables, fromNumber) => 
    axios.post(`${API}/contacts/${clientId}/send-template`, { 
      template_id: templateId, 
      variables: variables,
      from_number: fromNumber
    })
};

// Dashboard API
export const dashboardApi = {
  getStats: () => axios.get(`${API}/dashboard/stats`)
};

// Lead Capture API
export const leadsApi = {
  getForms: () => axios.get(`${API}/leads/forms`),
  createForm: (data) => axios.post(`${API}/leads/forms`, data),
  importCsv: (file, autoTags) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('auto_tags', autoTags);
    return axios.post(`${API}/leads/import/csv`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  createWebhook: () => axios.post(`${API}/leads/webhook`)
};

// Analytics API
export const analyticsApi = {
  getOverview: (startDate, endDate) => axios.get(`${API}/analytics/overview`, { params: { start_date: startDate, end_date: endDate } }),
  getCampaignAnalytics: (campaignId) => axios.get(`${API}/analytics/campaigns/${campaignId}`)
};

// Appointments API
export const appointmentsApi = {
  getTypes: () => axios.get(`${API}/appointments/types`),
  createType: (data) => axios.post(`${API}/appointments/types`, data),
  getAll: (date, status) => axios.get(`${API}/appointments`, { params: { date, status } }),
  create: (data) => axios.post(`${API}/appointments`, data),
  updateStatus: (id, status) => axios.put(`${API}/appointments/${id}/status`, null, { params: { status } })
};

// Compliance API
export const complianceApi = {
  getSettings: () => axios.get(`${API}/compliance/settings`),
  updateSettings: (data) => axios.put(`${API}/compliance/settings`, data),
  getOptOuts: () => axios.get(`${API}/compliance/opt-outs`),
  addOptOut: (phoneNumber, reason) => axios.post(`${API}/compliance/opt-out`, null, { params: { phone_number: phoneNumber, reason } }),
  removeOptOut: (phoneNumber) => axios.delete(`${API}/compliance/opt-out/${phoneNumber}`)
};

// Revival Campaigns API
export const revivalApi = {
  getCampaigns: () => axios.get(`${API}/revival/campaigns`),
  createCampaign: (data) => axios.post(`${API}/revival/campaigns`, data),
  runCampaign: (id) => axios.post(`${API}/revival/campaigns/${id}/run`)
};

// Notifications API
export const notificationsApi = {
  getAll: (unreadOnly, limit) => axios.get(`${API}/notifications`, { params: { unread_only: unreadOnly, limit } }),
  markRead: (id) => axios.post(`${API}/notifications/${id}/read`),
  markAllRead: () => axios.post(`${API}/notifications/read-all`)
};

// Messages API
export const messagesApi = {
  getUnread: () => axios.get(`${API}/messages/unread`),
  markRead: (messageId) => axios.put(`${API}/messages/${messageId}/read`),
  markAllRead: () => axios.put(`${API}/messages/mark-all-read`)
};

// Segments/Tags API
export const segmentsApi = {
  getAllTags: () => axios.get(`${API}/segments/tags`),
  bulkAddTags: (clientIds, tags) => axios.post(`${API}/segments/bulk-tag`, { client_ids: clientIds, tags }),
  bulkRemoveTags: (clientIds, tags) => axios.post(`${API}/segments/bulk-remove-tag`, { client_ids: clientIds, tags }),
  getPipelineStats: () => axios.get(`${API}/segments/pipeline`)
};

// Team API
export const teamApi = {
  getMembers: () => axios.get(`${API}/team/members`),
  getInvites: () => axios.get(`${API}/team/invites`),
  getStats: () => axios.get(`${API}/team/stats`),
  inviteMember: (data) => axios.post(`${API}/team/invite`, data),
  createMember: (data) => axios.post(`${API}/team/create-member`, data),
  updateMemberRole: (memberId, role) => axios.put(`${API}/team/members/${memberId}/role`, null, { params: { role } }),
  removeMember: (memberId) => axios.delete(`${API}/team/members/${memberId}`),
  cancelInvite: (inviteId) => axios.delete(`${API}/team/invites/${inviteId}`),
  // Password reset for admins
  resetPassword: (memberId, newPassword) => axios.post(`${API}/team/members/${memberId}/reset-password`, { new_password: newPassword }),
  sendResetLink: (memberId) => axios.post(`${API}/team/members/${memberId}/send-reset-link`),
  // Team Leader management
  getLeaders: () => axios.get(`${API}/team/leaders`),
  getLeaderAgents: (leaderId) => axios.get(`${API}/team/leaders/${leaderId}/agents`),
  assignAgentToLeader: (leaderId, agentId) => axios.post(`${API}/team/leaders/${leaderId}/agents`, { agent_id: agentId }),
  removeAgentFromLeader: (leaderId, agentId) => axios.delete(`${API}/team/leaders/${leaderId}/agents/${agentId}`),
  getMyAgents: () => axios.get(`${API}/team/my-agents`),
  getAgentClients: (agentId) => axios.get(`${API}/team/agent/${agentId}/clients`),
  // Archive functionality
  archiveMember: (memberId) => axios.post(`${API}/team/members/${memberId}/archive`),
  restoreMember: (memberId) => axios.post(`${API}/team/members/${memberId}/restore`),
  getArchivedMembers: () => axios.get(`${API}/team/members/archived`)
};

// User History API
export const userHistoryApi = {
  getUserHistory: (userId) => axios.get(`${API}/users/${userId}/history`)
};


// Funded Deals API
export const fundedApi = {
  getAll: (filters) => axios.get(`${API}/funded/deals`, { params: filters }),
  getOne: (id) => axios.get(`${API}/funded/deals/${id}`),
  create: (data) => axios.post(`${API}/funded/deals`, data),
  update: (id, data) => axios.put(`${API}/funded/deals/${id}`, data),
  delete: (id) => axios.delete(`${API}/funded/deals/${id}`),
  updatePayment: (dealId, paymentNumber, data) => axios.put(`${API}/funded/deals/${dealId}/payment/${paymentNumber}`, data),
  getStats: () => axios.get(`${API}/funded/stats`),
  getCollectionsQueue: () => axios.get(`${API}/funded/collections-queue`),
  getMilestones: () => axios.get(`${API}/funded/milestones`),
  acknowledgeMilestone: (dealId) => axios.post(`${API}/funded/deals/${dealId}/milestone-acknowledged`),
  getRecent: (limit = 10) => axios.get(`${API}/funded/recent`, { params: { limit } }),
  getAnalytics: (startDate, endDate) => axios.get(`${API}/funded/analytics`, { params: { start_date: startDate, end_date: endDate } }),
  getDealTypes: () => axios.get(`${API}/funded/deal-types`)
};

// Gmail API
export const gmailApi = {
  getAuthUrl: (token) => `${API}/gmail/auth?token=${token}`,
  getStatus: (token) => axios.get(`${API}/gmail/status`, { params: { token } }),
  disconnect: (token) => axios.post(`${API}/gmail/disconnect`, null, { params: { token } }),
  sendEmail: (token, data) => axios.post(`${API}/gmail/send`, data, { params: { token } }),
  getMessages: (token, query, maxResults = 20, pageToken) => 
    axios.get(`${API}/gmail/messages`, { params: { token, query, max_results: maxResults, page_token: pageToken } }),
  getMessage: (token, messageId) => axios.get(`${API}/gmail/messages/${messageId}`, { params: { token } }),
  getLabels: (token) => axios.get(`${API}/gmail/labels`, { params: { token } })
};

// Organizations API (Org Admin only)
export const organizationsApi = {
  getAll: (token) => axios.get(`${API}/organizations`, { params: { authorization: `Bearer ${token}` } }),
  getOne: (token, id) => axios.get(`${API}/organizations/${id}`, { params: { authorization: `Bearer ${token}` } }),
  create: (token, data) => axios.post(`${API}/organizations`, data, { params: { authorization: `Bearer ${token}` } }),
  update: (token, id, data) => axios.put(`${API}/organizations/${id}`, data, { params: { authorization: `Bearer ${token}` } }),
  delete: (token, id) => axios.delete(`${API}/organizations/${id}`, { params: { authorization: `Bearer ${token}` } }),
  getUsers: (token, orgId) => axios.get(`${API}/organizations/${orgId}/users`, { params: { authorization: `Bearer ${token}` } }),
  addUser: (token, orgId, data) => axios.post(`${API}/organizations/${orgId}/users`, data, { params: { authorization: `Bearer ${token}` } }),
  removeUser: (token, orgId, userId) => axios.delete(`${API}/organizations/${orgId}/users/${userId}`, { params: { authorization: `Bearer ${token}` } }),
  getStats: (token) => axios.get(`${API}/organizations/stats/overview`, { params: { authorization: `Bearer ${token}` } }),
  getUnassignedUsers: (token) => axios.get(`${API}/organizations/unassigned/users`, { params: { authorization: `Bearer ${token}` } }),
  getUnassignedClients: (token) => axios.get(`${API}/organizations/unassigned/clients`, { params: { authorization: `Bearer ${token}` } }),
  getAllUsers: (token) => axios.get(`${API}/organizations/all/users`, { params: { authorization: `Bearer ${token}` } }),
  assignUser: (token, userId, orgId) => axios.post(`${API}/organizations/assign/user`, { user_id: userId, organization_id: orgId }, { params: { authorization: `Bearer ${token}` } }),
  assignClient: (token, clientId, orgId) => axios.post(`${API}/organizations/assign/client`, { client_id: clientId, organization_id: orgId }, { params: { authorization: `Bearer ${token}` } }),
  // Impersonation - Login as user within organization
  impersonateOrgAdmin: (token, orgId) => axios.post(`${API}/organizations/${orgId}/impersonate-admin`, {}, { params: { authorization: `Bearer ${token}` } }),
  impersonateUser: (token, userId) => axios.post(`${API}/organizations/impersonate`, { target_user_id: userId }, { params: { authorization: `Bearer ${token}` } }),
  // Billing
  getBillingOverview: (token) => axios.get(`${API}/organizations/billing/overview`, { params: { authorization: `Bearer ${token}` } }),
  getOrgBilling: (token, orgId) => axios.get(`${API}/organizations/billing/${orgId}`, { params: { authorization: `Bearer ${token}` } }),
  recordPayment: (token, data) => axios.post(`${API}/organizations/billing/payment`, data, { params: { authorization: `Bearer ${token}` } }),
  getAllPayments: (token) => axios.get(`${API}/organizations/billing/payments`, { params: { authorization: `Bearer ${token}` } })
};

// Global Search API
export const searchApi = {
  search: (query) => axios.get(`${API}/search`, { params: { q: query } })
};

// Activity Log API
export const activityApi = {
  getLog: (limit = 50, entityType = null) => axios.get(`${API}/activity`, { params: { limit, entity_type: entityType } })
};

// Client Profile API
export const clientProfileApi = {
  getProfile: (clientId) => axios.get(`${API}/clients/${clientId}/profile`),
  getAiSummary: (clientId) => axios.get(`${API}/clients/${clientId}/ai-summary`)
};

// Team Leader Dashboard API
export const teamLeaderApi = {
  getDashboard: () => axios.get(`${API}/team-leader/dashboard`)
};

// Profile API
export const profileApi = {
  update: (data) => axios.put(`${API}/profile`, data),
  changePassword: (data) => axios.post(`${API}/profile/change-password`, data)
};

// Bulk Operations API
export const bulkApi = {
  deleteClients: (clientIds) => axios.post(`${API}/clients/bulk-delete`, { client_ids: clientIds })
};

// Calling API
export const callsApi = {
  initiate: (toNumber, fromNumber) => axios.post(`${API}/calls/initiate`, { to_number: toNumber, from_number: fromNumber }),
  end: (callId) => axios.post(`${API}/calls/${callId}/end`)
};

// Support Email Settings API
export const supportEmailApi = {
  getConfig: () => axios.get(`${API}/settings/support-email`),
  saveConfig: (config) => axios.post(`${API}/settings/support-email`, config),
  testEmail: () => axios.post(`${API}/settings/support-email/test`)
};
