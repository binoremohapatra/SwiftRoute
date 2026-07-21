
// Hardcoded Live Render Backend (Bulletproof Fix)
const API_BASE = 'https://swiftroute-17uj.onrender.com/api/v1';

const getHeaders = (token) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const handleResponse = async (res) => {
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// Auth
export const authAPI = {
  login: (data) =>
    fetch(`${API_BASE}/auth/login`, { method: 'POST', headers: getHeaders(), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  register: (data) =>
    fetch(`${API_BASE}/auth/register`, { method: 'POST', headers: getHeaders(), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  logout: (token) =>
    fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  getMe: (token) =>
    fetch(`${API_BASE}/auth/me`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),
};

// Orders
export const orderAPI = {
  getAll: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/orders${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse);
  },

  getById: (id, token) =>
    fetch(`${API_BASE}/orders/${id}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  create: (data, token) =>
    fetch(`${API_BASE}/orders`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  updateStatus: (id, data, token) =>
    fetch(`${API_BASE}/orders/${id}/status`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  cancel: (id, token) =>
    fetch(`${API_BASE}/orders/${id}/cancel`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  accept: (id, token) =>
    fetch(`${API_BASE}/orders/${id}/accept`, { method: 'POST', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  reject: (id, token) =>
    fetch(`${API_BASE}/orders/${id}/reject`, { method: 'POST', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  track: (id, token) =>
    fetch(`${API_BASE}/orders/${id}/tracking`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  assign3PL: (id, token) =>
    fetch(`${API_BASE}/orders/${id}/assign-3pl`, { method: 'POST', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  track3PL: (id, token) =>
    fetch(`${API_BASE}/orders/${id}/3pl-tracking`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),
};

// Admin
export const adminAPI = {
  getDashboardStats: (token) =>
    fetch(`${API_BASE}/admin/dashboard-stats`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  getAnalytics: (token, period = 'daily') =>
    fetch(`${API_BASE}/admin/analytics?period=${period}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  getOrders: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/admin/orders${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse);
  },

  getUsers: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/admin/users${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse);
  },

  getAgents: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/admin/agents${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse);
  },

  toggleUserStatus: (id, isActive, token) =>
    fetch(`${API_BASE}/admin/users/${id}/status`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify({ isActive }) }).then(handleResponse),

  toggleAgentStatus: (id, isActive, token) =>
    fetch(`${API_BASE}/admin/agents/${id}/status`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify({ isActive }) }).then(handleResponse),

  resetPassword: (id, newPassword, token, userType = 'user') =>
    fetch(`${API_BASE}/admin/${userType === 'agent' ? 'agents' : 'users'}/${id}/reset-password`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify({ newPassword }) }).then(handleResponse),

  assignOrder: (data, token) =>
    fetch(`${API_BASE}/admin/assign-order`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  smartAssign: (orderId, token) =>
    fetch(`${API_BASE}/admin/smart-assign/${orderId}`, { method: 'POST', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  exportOrdersCSV: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/admin/export/orders${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' });
  },

  exportAgentsCSV: (token) =>
    fetch(`${API_BASE}/admin/export/agents`, { headers: getHeaders(token), credentials: 'include' }),

  verifyAgentBankDetails: (agentId, isVerified, token) =>
    fetch(`${API_BASE}/admin/agents/${agentId}/bank-details/verify`, {
      method: 'PATCH',
      headers: getHeaders(token),
      credentials: 'include',
      body: JSON.stringify({ isVerified })
    }).then(handleResponse),
};

// Agents
export const agentAPI = {
  getProfile: (token) =>
    fetch(`${API_BASE}/agents/profile`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  updateStatus: (status, token) =>
    fetch(`${API_BASE}/agents/status`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify({ status }) }).then(handleResponse),

  updateLocation: (data, token) =>
    fetch(`${API_BASE}/agents/location`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  getDeliveries: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/agents/deliveries${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse);
  },

  getPerformance: (token) =>
    fetch(`${API_BASE}/agents/performance`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),
};

// Profile
export const profileAPI = {
  getProfile: (token) =>
    fetch(`${API_BASE}/profile`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  updateProfile: (data, token) =>
    fetch(`${API_BASE}/profile`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  uploadAvatar: (formData, token) =>
    fetch(`${API_BASE}/profile/avatar`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      credentials: 'include',
      body: formData
    }).then(handleResponse),

  deleteAvatar: (token) =>
    fetch(`${API_BASE}/profile/avatar`, { method: 'DELETE', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  updatePassword: (data, token) =>
    fetch(`${API_BASE}/profile/password`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  getStats: (token) =>
    fetch(`${API_BASE}/profile/stats`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  getBankDetails: (token) =>
    fetch(`${API_BASE}/profile/bank-details`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  updateBankDetails: (data, token) =>
    fetch(`${API_BASE}/profile/bank-details`, { method: 'PUT', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  deleteBankDetails: (data, token) =>
    fetch(`${API_BASE}/profile/bank-details`, { method: 'DELETE', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),
};

// Notifications
export const notificationAPI = {
  getAll: (token, params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return fetch(`${API_BASE}/notifications${qs ? `?${qs}` : ''}`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse);
  },

  markRead: (id, token) =>
    fetch(`${API_BASE}/notifications/${id}/read`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  markAllRead: (token) =>
    fetch(`${API_BASE}/notifications/read-all`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  deleteNotification: (id, token) =>
    fetch(`${API_BASE}/notifications/${id}`, { method: 'DELETE', headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  getPreferences: (token) =>
    fetch(`${API_BASE}/notifications/preferences`, { headers: getHeaders(token), credentials: 'include' }).then(handleResponse),

  updatePreferences: (data, token) =>
    fetch(`${API_BASE}/notifications/preferences`, { method: 'PATCH', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),
};

// FCM
export const fcmAPI = {
  sendManualPush: (data, token) =>
    fetch(`${API_BASE}/fcm/send`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),
};

// Payments
export const paymentAPI = {
  createOrder: (data, token) =>
    fetch(`${API_BASE}/payments/create-order`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  verifyPayment: (data, token) =>
    fetch(`${API_BASE}/payments/verify`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),

  collectCash: (data, token) =>
    fetch(`${API_BASE}/payments/collect-cash`, { method: 'POST', headers: getHeaders(token), credentials: 'include', body: JSON.stringify(data) }).then(handleResponse),
};