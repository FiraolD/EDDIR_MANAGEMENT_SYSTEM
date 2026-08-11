import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5020/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor to add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refreshToken,
          });
          
          const { accessToken } = response.data;
          localStorage.setItem('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// ==================== AUTH API ====================
export const authAPI = {
  login: (identifier: string, password: string) =>
    api.post('/auth/login', { identifier, password }),
  
  register: (data: { email: string; phone: string; fullName: string; password: string }) =>
    api.post('/auth/register', data),
  
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  
  logout: () => api.post('/auth/logout'),
  
  getMe: () => api.get('/auth/me'),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  
  
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
};

// ==================== MEMBERS API ====================
export const membersAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; organization_id?: string | null }) =>
    api.get('/members', { params }),
  
  getById: (id: string) => api.get(`/members/${id}`),
  
  create: (data: any) => api.post('/members', data),
  
  update: (id: string, data: any) => api.put(`/members/${id}`, data),
    
  updateRole: (id: string, role: string) => api.put(`/members/${id}/role`, { role }),
  
  updateStatus: (id: string, status: string) => api.put(`/members/${id}/status`, { status }),
  
  delete: (id: string) => api.delete(`/members/${id}`),
  
  export: () => api.get('/members/export', { responseType: 'blob' }),
  
  getStats: () => api.get('/members/stats'),
};

// ==================== CONTRIBUTIONS API ====================
export const contributionsAPI = {
 getAll: (params?: { page?: number; limit?: number; search?: string; status?: string; memberId?: string; organization_id?: string | null }) =>
    api.get('/contributions', { params }),
  
  getById: (id: string) => api.get(`/contributions/${id}`),
  
  create: (data: any) => api.post('/contributions', data),
  
  update: (id: string, data: any) => api.put(`/contributions/${id}`, data),
  
  delete: (id: string) => api.delete(`/contributions/${id}`),
  
  export: () => api.get('/contributions/export', { responseType: 'blob' }),
  
  getStats: () => api.get('/contributions/stats'),
};

// ==================== CLAIMS API ====================
export const claimsAPI = {
   getAll: (params?: { page?: number; limit?: number; status?: string; memberId?: string; organization_id?: string | null }) =>
    api.get('/claims', { params }),
  
  getById: (id: string) => api.get(`/claims/${id}`),
  
 create: (data: FormData | any) => {
    if (data instanceof FormData) {
        return api.post('/claims', data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
    }
    return api.post('/claims', data);
},
  
  advance: (id: string) => api.put(`/claims/${id}/advance`),
  
  updateStatus: (id: string, status: string) => api.put(`/claims/${id}/status`, { status }),
  
  delete: (id: string) => api.delete(`/claims/${id}`),
  
  export: () => api.get('/claims/export', { responseType: 'blob' }),
  
  getStats: () => api.get('/claims/stats'),
};

// ==================== TRANSACTIONS API ====================
export const transactionsAPI = {
   getAll: (params?: { page?: number; limit?: number; search?: string; type?: string; category?: string; startDate?: string; endDate?: string; memberId?: string; organization_id?: string | null }) =>
    api.get('/transactions', { params }),
  
  getById: (id: string) => api.get(`/transactions/${id}`),
  
  export: () => api.get('/transactions/export', { responseType: 'blob' }),
  
  getStats: () => api.get('/transactions/stats'),
  
  reconcile: () => api.post('/transactions/reconcile'),
};

export const dashboardAPI = {
  getStats: (organizationId?: string | null) =>
    api.get('/dashboard/stats', { params: { organization_id: organizationId } }),
  getChartData: (period?: string, organizationId?: string | null) =>
    api.get('/dashboard/chart', { params: { period, organization_id: organizationId } }),
  getRecentActivity: (limit?: number, organizationId?: string | null) =>
    api.get('/dashboard/recent', { params: { limit, organization_id: organizationId } }),
};

// ==================== ORGANIZATIONS API ====================
export const organizationsAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.get('/organizations', { params }),
  
  getById: (id: string) => api.get(`/organizations/${id}`),
  
  create: (data: any) => api.post('/organizations', data),
  
  update: (id: string, data: any) => api.put(`/organizations/${id}`, data),
  
  updateStatus: (id: string, status: string) => api.put(`/organizations/${id}/status`, { status }),
  
  delete: (id: string) => api.delete(`/organizations/${id}`),
  
  assignLeader: (id: string, userId: string) => api.post(`/organizations/${id}/assign-leader`, { userId }),
  
  getStats: (id: string) => api.get(`/organizations/${id}/stats`),
};

// ==================== USERS API ====================
export const usersAPI = {
  getAll: (params?: { page?: number; limit?: number; search?: string; role?: string }) =>
    api.get('/users', { params }),
  
  getById: (id: string) => api.get(`/users/${id}`),
  
  updateRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }),
  
  updateStatus: (id: string, isActive: boolean) => api.put(`/users/${id}/status`, { is_active: isActive }),
  
  delete: (id: string) => api.delete(`/users/${id}`),
  
  getPermissions: () => api.get('/users/me/permissions'),
};

// ==================== NOTIFICATIONS API ====================
export const notificationsAPI = {
  getAll: (params?: { page?: number; limit?: number; unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  
  getById: (id: string) => api.get(`/notifications/${id}`),
  
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  
  markAllAsRead: () => api.put('/notifications/read-all'),
  
  delete: (id: string) => api.delete(`/notifications/${id}`),
  
  getUnreadCount: () => api.get('/notifications/unread/count'),
};

// ==================== REPORTS API ====================
export const reportsAPI = {
  generate: (type: string, params?: any) => 
    api.post(`/reports/${type}`, params, { responseType: 'blob' }),
  
  getReportList: () => api.get('/reports'),
  
  download: (reportId: string) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
};

// ==================== SETTINGS API ====================
export const settingsAPI = {
  getAll: () => api.get('/settings'),
  
  getByKey: (key: string) => api.get(`/settings/${key}`),
  
  update: (key: string, value: any) => api.put(`/settings/${key}`, { value }),
  
  updateMultiple: (settings: Record<string, any>) => api.put('/settings', { settings }),
};

// Default export for the api instance

export { api };
export default api;