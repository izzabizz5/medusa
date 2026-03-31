import axios from 'axios';
import Cookies from 'js-cookie';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      Cookies.remove('accessToken');
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
};

// Matches
export const matchesApi = {
  list: (status?: string) => api.get('/matches', { params: status ? { status } : {} }),
  confirm: (id: string) => api.post(`/matches/${id}/confirm`),
  reject: (id: string) => api.post(`/matches/${id}/reject`),
  requestTakedown: (id: string, type: 'platform' | 'dmca') =>
    api.post(`/matches/${id}/takedown`, { type }),
};

// Takedowns
export const takedownsApi = {
  listMine: () => api.get('/takedowns/mine'),
  // Admin
  listAll: (status?: string) => api.get('/takedowns', { params: status ? { status } : {} }),
  approve: (id: string, notes?: string) => api.post(`/takedowns/${id}/approve`, { notes }),
  reject: (id: string, notes?: string) => api.post(`/takedowns/${id}/reject`, { notes }),
};
