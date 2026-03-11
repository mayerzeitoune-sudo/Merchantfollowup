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
  analyzeDeal: (clientId) => axios.post(`${API}/ai/analyze-deal`, { client_id: clientId })
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
  getEnrollments: (campaignId, status) => axios.get(`${API}/campaigns/enhanced/${campaignId}/enrollments`, { params: { status } })
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
  release: (id) => axios.delete(`${API}/phone-numbers/${id}`)
};

// Contacts/Messaging API
export const contactsApi = {
  getConversation: (clientId, fromNumber) => axios.get(`${API}/contacts/${clientId}/conversation`, { 
    params: { from_number: fromNumber } 
  }),
  getChains: (clientId) => axios.get(`${API}/contacts/${clientId}/chains`),
  sendSms: (clientId, message, fromNumber) => axios.post(`${API}/contacts/${clientId}/send-sms`, null, { 
    params: { message, from_number: fromNumber } 
  }),
  initiateCall: (clientId, fromNumber) => axios.post(`${API}/contacts/${clientId}/initiate-call`, null, {
    params: { from_number: fromNumber }
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

// AI API (Enhanced)
export const aiApi = {
  matchResponse: (incomingMessage, keywords) => 
    axios.post(`${API}/ai/match-response`, { incoming_message: incomingMessage, keywords }),
  suggest: (conversationContext, tone, action) => 
    axios.post(`${API}/ai/suggest`, { conversation_context: conversationContext, tone, action }),
  rewrite: (message, tone) => 
    axios.post(`${API}/ai/rewrite`, null, { params: { message, tone } })
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
  updateMemberRole: (memberId, role) => axios.put(`${API}/team/members/${memberId}/role`, null, { params: { role } }),
  removeMember: (memberId) => axios.delete(`${API}/team/members/${memberId}`),
  cancelInvite: (inviteId) => axios.delete(`${API}/team/invites/${inviteId}`)
};

