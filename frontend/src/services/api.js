import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api',
  timeout: 10000,
});

// ── Request interceptor: attach JWT token to every request ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('aviro_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 (expired/invalid token) ──
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — clear everything and redirect to login
      console.warn('Session expired. Redirecting to login...');
      localStorage.removeItem('aviro_token');
      localStorage.removeItem('aviro_refresh_token');
      localStorage.removeItem('aviro_user');

      // Only redirect if not already on login/register page
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;