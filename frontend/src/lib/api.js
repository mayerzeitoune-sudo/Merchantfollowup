import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Clients API
export const clientsApi = {
  getAll: () => axios.get(`${API}/clients`),
  getOne: (id) => axios.get(`${API}/clients/${id}`),
  create: (data) => axios.post(`${API}/clients`, data),
  update: (id, data) => axios.put(`${API}/clients/${id}`, data),
  delete: (id) => axios.delete(`${API}/clients/${id}`)
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

// Dashboard API
export const dashboardApi = {
  getStats: () => axios.get(`${API}/dashboard/stats`)
};

// AI API
export const aiApi = {
  matchResponse: (incomingMessage, keywords) => 
    axios.post(`${API}/ai/match-response`, { incoming_message: incomingMessage, keywords })
};
