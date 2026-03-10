import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Clients API
export const clientsApi = {
  getAll: () => axios.get(`${API}/clients`),
  getOne: (id) => axios.get(`${API}/clients/${id}`),
  create: (data) => axios.post(`${API}/clients`, data),
  update: (id, data) => axios.put(`${API}/clients/${id}`, data),
  delete: (id) => axios.delete(`${API}/clients/${id}`),
  updateBirthday: (id, birthday) => axios.put(`${API}/clients/${id}/birthday`, null, { params: { birthday } }),
  addEvent: (id, eventName, eventDate) => axios.post(`${API}/clients/${id}/events`, null, { params: { event_name: eventName, event_date: eventDate } })
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

// Follow-ups API
export const followupsApi = {
  getAll: (date) => axios.get(`${API}/followups`, { params: { date } }),
  getOne: (id) => axios.get(`${API}/followups/${id}`),
  create: (data) => axios.post(`${API}/followups`, data),
  update: (id, data) => axios.put(`${API}/followups/${id}`, data),
  delete: (id) => axios.delete(`${API}/followups/${id}`)
};

// Campaigns API
export const campaignsApi = {
  getAll: () => axios.get(`${API}/campaigns`),
  getOne: (id) => axios.get(`${API}/campaigns/${id}`),
  create: (data) => axios.post(`${API}/campaigns`, data),
  update: (id, data) => axios.put(`${API}/campaigns/${id}`, data),
  delete: (id) => axios.delete(`${API}/campaigns/${id}`)
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
  getConversation: (clientId) => axios.get(`${API}/contacts/${clientId}/conversation`),
  sendSms: (clientId, message) => axios.post(`${API}/contacts/${clientId}/send-sms`, null, { params: { message } }),
  initiateCall: (clientId) => axios.post(`${API}/contacts/${clientId}/initiate-call`)
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

// Dashboard API
export const dashboardApi = {
  getStats: () => axios.get(`${API}/dashboard/stats`)
};

// AI API
export const aiApi = {
  matchResponse: (incomingMessage, keywords) => 
    axios.post(`${API}/ai/match-response`, { incoming_message: incomingMessage, keywords })
};
