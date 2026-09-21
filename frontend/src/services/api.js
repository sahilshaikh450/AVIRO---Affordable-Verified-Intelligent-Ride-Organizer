import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL;

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// =========================================================
// PUBLIC AUTH ENDPOINTS
// In requests par purana JWT attach nahi hoga
// =========================================================

const publicEndpoints = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/auth/verify-otp',
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

    // Login/register etc. par old token mat bhejo
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

    // =====================================================
    // 401 ONLY FOR PROTECTED API REQUESTS
    // =====================================================

    if (status === 401 && !isPublicEndpoint) {

      console.warn(
        'Session expired. Redirecting to login...'
      );

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

    // Login ka actual backend error normally return hone do
    return Promise.reject(error);
  }
);

export default api;
