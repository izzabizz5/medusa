import axios from 'axios';
import { clearAuth } from './auth';

// Separate client for the link-management-service (port 4002)
const lmsApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_LMS_URL || 'http://localhost:4002',
  withCredentials: true,
});

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
  withCredentials: true, // send the httpOnly session cookie on every request
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      clearAuth();
      window.location.href = '/auth/login';
    }
    return Promise.reject(err);
  },
);

export default api;

// Auth
export const authApi = {
  register: (data: { email: string; password: string; fullName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

// Reference Photos
export const photosApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/reference-photos', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  list: () => api.get('/reference-photos'),
  getSignedUrl: (id: string) => api.get(`/reference-photos/${id}/url`),
  retryFailed: () => api.post('/reference-photos/retry-failed'),
};

// Matches
export const matchesApi = {
  list: (status?: string) => api.get('/matches', { params: status ? { status } : {} }),
  confirm: (id: string) => api.post(`/matches/${id}/confirm`),
  reject: (id: string) => api.post(`/matches/${id}/reject`),
  requestTakedown: (id: string, type: 'platform' | 'dmca') =>
    api.post(`/matches/${id}/takedown`, { type }),
};

// Link Management (talks to port 4002)
export const urlsApi = {
  list: () => lmsApi.get('/target-urls'),
  pendingReview: () => lmsApi.get('/target-urls/pending-review'),
  create: (data: { url: string; platform: string; label?: string }) =>
    lmsApi.post('/target-urls', data),
  toggle: (id: string) => lmsApi.patch(`/target-urls/${id}/toggle`),
  label: (id: string, isGood: boolean) =>
    lmsApi.patch(`/target-urls/${id}/label`, { isGood }),
  setPriority: (id: string, priority: number | null) =>
    lmsApi.patch(`/target-urls/${id}/priority`, { priority }),
  remove: (id: string) => lmsApi.delete(`/target-urls/${id}`),
  triggerDiscover: (source: string, value?: string) =>
    lmsApi.post('/target-urls/discover', { source, value }),
};

// Admin — profile management + impersonation
export const adminApi = {
  listUsers: () => api.get('/admin/users'),
  createProfile: (data: { name: string; email?: string }) =>
    api.post('/admin/users', data),
  impersonate: (id: string) => api.post(`/admin/impersonate/${id}`),
  exitImpersonation: () => api.post('/admin/impersonate/exit'),
};

// Takedowns
export const takedownsApi = {
  listMine: () => api.get('/takedowns/mine'),
  // Admin
  listAll: (status?: string) => api.get('/takedowns', { params: status ? { status } : {} }),
  approve: (id: string, notes?: string) => api.post(`/takedowns/${id}/approve`, { notes }),
  reject: (id: string, notes?: string) => api.post(`/takedowns/${id}/reject`, { notes }),
};
