import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// =========================================================
// PUBLIC AUTH ENDPOINTS
// =========================================================
const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
  '/auth/resend-otp',
  '/auth/login-verify-otp',
];

// =========================================================
// REQUEST INTERCEPTOR
// =========================================================
api.interceptors.request.use(
  (config) => {
    const requestUrl = config.url || '';
    const isPublicEndpoint = publicEndpoints.some(
      (endpoint) => requestUrl.includes(endpoint)
    );

    if (!isPublicEndpoint) {
      const token = localStorage.getItem('aviro_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================
// RESPONSE INTERCEPTOR
// =========================================================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url || '';

    const isPublicEndpoint = publicEndpoints.some(
      (endpoint) => requestUrl.includes(endpoint)
    );

    if (status === 401 && !isPublicEndpoint) {
      console.warn('Session expired. Redirecting to login...');

      localStorage.removeItem('aviro_token');
      localStorage.removeItem('aviro_refresh');
      localStorage.removeItem('aviro_refresh_token');
      localStorage.removeItem('aviro_user');

      const currentPath = window.location.pathname;
      if (
        !currentPath.includes('/login') &&
        !currentPath.includes('/register')
      ) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
