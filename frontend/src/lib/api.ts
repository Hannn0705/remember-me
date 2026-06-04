'use client';

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - attach auth token
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Response interceptor - handle 401 and refresh token
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const { data } = await axios.post(`${API_BASE}/auth/refresh`, { refreshToken });
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          }
          return api(originalRequest);
        }
      } catch {
        // Refresh failed - clear tokens and redirect
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; nickname?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  sendCode: (email: string, type: string = 'REGISTER') =>
    api.post('/auth/send-code', { email, type }),
  verifyCode: (data: { email: string; code: string; type: string }) =>
    api.post('/auth/verify-code', data),
  resetPassword: (data: { email: string; code: string; newPassword: string }) =>
    api.post('/auth/reset-password', data),
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    api.post('/auth/change-password', data),
  getProfile: () => api.get('/auth/profile'),
};

// User API
export const userApi = {
  updateProfile: (data: { nickname?: string; avatarUrl?: string }) =>
    api.patch('/users/profile', data),
  search: (q: string) => api.get(`/users/search?q=${q}`),
};

// Memory (Star) API
export const memoryApi = {
  getStars: (year: number, month: number) =>
    api.get(`/memories/stars?year=${year}&month=${month}`),
  getStar: (id: string) => api.get(`/memories/stars/${id}`),
  createStar: (data: { date: string; title?: string; mood?: string; color?: string }) =>
    api.post('/memories/stars', data),
  updateStar: (id: string, data: { title?: string; mood?: string; color?: string; content?: string }) =>
    api.patch(`/memories/stars/${id}`, data),
  addMemory: (starId: string, data: { content?: string; voiceUrl?: string }) =>
    api.post(`/memories/stars/${starId}/memories`, data),
  uploadPhoto: (starId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/memories/stars/${starId}/photos`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getTimeline: () => api.get('/memories/timeline'),
};

// Partner API
export const partnerApi = {
  sendRequest: (data: { toCode: string; message?: string }) =>
    api.post('/partners/request', data),
  acceptRequest: (requestId: string) =>
    api.post(`/partners/accept/${requestId}`),
  rejectRequest: (requestId: string) =>
    api.post(`/partners/reject/${requestId}`),
  getRequests: () => api.get('/partners/requests'),
  getInfo: () => api.get('/partners/info'),
  disconnect: () => api.post('/partners/disconnect'),
};

// Letter API
export const letterApi = {
  create: (data: { receiverId: string; title: string; content: string; isDraft?: boolean; scheduledAt?: string }) =>
    api.post('/letters', data),
  getInbox: () => api.get('/letters/inbox'),
  getOutbox: () => api.get('/letters/outbox'),
  getOne: (id: string) => api.get(`/letters/${id}`),
  markAsRead: (id: string) => api.patch(`/letters/${id}/read`),
  delete: (id: string) => api.delete(`/letters/${id}`),
  schedule: (id: string, scheduledAt: string) =>
    api.post(`/letters/${id}/schedule`, { scheduledAt }),
};

// Admin API
export const adminApi = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: { page?: number; limit?: number; search?: string; role?: string; status?: string }) =>
    api.get('/admin/users', { params }),
  updateUserStatus: (id: string, isActive: boolean) =>
    api.patch(`/admin/users/${id}/status`, { isActive }),
  updateUserRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  getEmailStats: () => api.get('/admin/email-stats'),
  getConfigs: () => api.get('/admin/configs'),
  updateConfig: (key: string, value: any) =>
    api.put(`/admin/configs/${key}`, { value }),
  getEmailLogs: (params?: { page?: number; limit?: number }) =>
    api.get('/email/logs', { params }),
  getTemplates: () => api.get('/email/templates'),
  updateTemplate: (id: string, data: any) =>
    api.put(`/email/templates/${id}`, data),
  getCronJobs: () => api.get('/cron/jobs'),
  updateCronJob: (id: string, data: any) =>
    api.put(`/cron/jobs/${id}`, data),
  toggleCronJob: (id: string) =>
    api.post(`/cron/jobs/${id}/toggle`),
};

// Pet API (V3)
export const petApi = {
  create: (data: { name: string; avatar?: string }) =>
    api.post('/pet/create', data),
  getMy: () => api.get('/pet/my'),
  get: (id: string) => api.get(`/pet/${id}`),
  feed: (id: string, data?: { amount?: number }) =>
    api.post(`/pet/${id}/feed`, data || {}),
  play: (id: string, data?: { amount?: number }) =>
    api.post(`/pet/${id}/play`, data || {}),
  clean: (id: string) => api.post(`/pet/${id}/clean`),
  invite: (petId: string, inviteeId: string) =>
    api.post(`/pet/${petId}/invite`, { inviteeId }),
  respondInvite: (inviteId: string, status: string) =>
    api.post(`/pet/invite/${inviteId}/respond`, { status }),
  getInvites: () => api.get('/pet/invites/my'),
  uploadVoice: (petId: string, formData: FormData) =>
    api.post(`/pet/${petId}/voice/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getVoices: (petId: string) => api.get(`/pet/${petId}/voices`),
  getActivities: (petId: string) => api.get(`/pet/${petId}/activities`),
};
