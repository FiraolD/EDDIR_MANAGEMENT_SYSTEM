"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.settingsAPI = exports.reportsAPI = exports.notificationsAPI = exports.usersAPI = exports.organizationsAPI = exports.dashboardAPI = exports.transactionsAPI = exports.claimsAPI = exports.contributionsAPI = exports.membersAPI = exports.authAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5020/api';
const api = axios_1.default.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000,
});
// Request interceptor to add token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});
// Response interceptor to handle token refresh
api.interceptors.response.use((response) => response, async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
            try {
                const response = await axios_1.default.post(`${API_URL}/auth/refresh`, {
                    refreshToken,
                });
                const { accessToken } = response.data;
                localStorage.setItem('accessToken', accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            }
            catch (refreshError) {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
                window.location.href = '/';
                return Promise.reject(refreshError);
            }
        }
    }
    return Promise.reject(error);
});
// ==================== AUTH API ====================
exports.authAPI = {
    login: (identifier, password) => api.post('/auth/login', { identifier, password }),
    register: (data) => api.post('/auth/register', data),
    refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
    logout: () => api.post('/auth/logout'),
    getMe: () => api.get('/auth/me'),
    changePassword: (currentPassword, newPassword) => api.post('/auth/change-password', { currentPassword, newPassword }),
    forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
    resetPassword: (token, newPassword) => api.post('/auth/reset-password', { token, newPassword }),
};
// ==================== MEMBERS API ====================
exports.membersAPI = {
    getAll: (params) => api.get('/members', { params }),
    getById: (id) => api.get(`/members/${id}`),
    create: (data) => api.post('/members', data),
    update: (id, data) => api.put(`/members/${id}`, data),
    updateStatus: (id, status) => api.put(`/members/${id}/status`, { status }),
    delete: (id) => api.delete(`/members/${id}`),
    export: () => api.get('/members/export', { responseType: 'blob' }),
    getStats: () => api.get('/members/stats'),
};
// ==================== CONTRIBUTIONS API ====================
exports.contributionsAPI = {
    getAll: (params) => api.get('/contributions', { params }),
    getById: (id) => api.get(`/contributions/${id}`),
    create: (data) => api.post('/contributions', data),
    update: (id, data) => api.put(`/contributions/${id}`, data),
    delete: (id) => api.delete(`/contributions/${id}`),
    export: () => api.get('/contributions/export', { responseType: 'blob' }),
    getStats: () => api.get('/contributions/stats'),
    // Finance-only endpoints
    reconcile: (data) => api.post('/contributions/reconcile', data),
};
// ==================== CLAIMS API ====================
exports.claimsAPI = {
    getAll: (params) => api.get('/claims', { params }),
    getById: (id) => api.get(`/claims/${id}`),
    create: (data) => api.post('/claims', data),
    advance: (id) => api.put(`/claims/${id}/advance`),
    updateStatus: (id, status) => api.put(`/claims/${id}/status`, { status }),
    delete: (id) => api.delete(`/claims/${id}`),
    export: () => api.get('/claims/export', { responseType: 'blob' }),
    getStats: () => api.get('/claims/stats'),
    // Finance-only endpoint
    pay: (id) => api.put(`/claims/${id}/pay`),
};
// ==================== TRANSACTIONS API ====================
exports.transactionsAPI = {
    getAll: (params) => api.get('/transactions', { params }),
    getById: (id) => api.get(`/transactions/${id}`),
    export: () => api.get('/transactions/export', { responseType: 'blob' }),
    getStats: () => api.get('/transactions/stats'),
    // Finance-only endpoint
    reconcile: () => api.post('/transactions/reconcile'),
};
// ==================== DASHBOARD API ====================
exports.dashboardAPI = {
    getStats: () => api.get('/dashboard/stats'),
    getChartData: (period) => api.get('/dashboard/chart', { params: { period } }),
    getRecentActivity: (limit) => api.get('/dashboard/recent', { params: { limit } }),
};
// ==================== ORGANIZATIONS API ====================
exports.organizationsAPI = {
    getAll: (params) => api.get('/organizations', { params }),
    getById: (id) => api.get(`/organizations/${id}`),
    create: (data) => api.post('/organizations', data),
    update: (id, data) => api.put(`/organizations/${id}`, data),
    updateStatus: (id, status) => api.put(`/organizations/${id}/status`, { status }),
    delete: (id) => api.delete(`/organizations/${id}`),
    assignLeader: (id, userId) => api.post(`/organizations/${id}/assign-leader`, { userId }),
    getStats: (id) => api.get(`/organizations/${id}/stats`),
};
// ==================== USERS API ====================
exports.usersAPI = {
    getAll: (params) => api.get('/users', { params }),
    getById: (id) => api.get(`/users/${id}`),
    updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
    updateStatus: (id, isActive) => api.put(`/users/${id}/status`, { is_active: isActive }),
    delete: (id) => api.delete(`/users/${id}`),
    getPermissions: () => api.get('/users/me/permissions'),
};
// ==================== NOTIFICATIONS API ====================
exports.notificationsAPI = {
    getAll: (params) => api.get('/notifications', { params }),
    getById: (id) => api.get(`/notifications/${id}`),
    markAsRead: (id) => api.put(`/notifications/${id}/read`),
    markAllAsRead: () => api.put('/notifications/read-all'),
    delete: (id) => api.delete(`/notifications/${id}`),
    getUnreadCount: () => api.get('/notifications/unread/count'),
};
// ==================== REPORTS API ====================
exports.reportsAPI = {
    generate: (type, params) => api.post(`/reports/${type}`, params, { responseType: 'blob' }),
    getReportList: () => api.get('/reports'),
    download: (reportId) => api.get(`/reports/${reportId}/download`, { responseType: 'blob' }),
};
// ==================== SETTINGS API ====================
exports.settingsAPI = {
    getAll: () => api.get('/settings'),
    getByKey: (key) => api.get(`/settings/${key}`),
    update: (key, value) => api.put(`/settings/${key}`, { value }),
    updateMultiple: (settings) => api.put('/settings', { settings }),
};
// Default export for the api instance
exports.default = api;
