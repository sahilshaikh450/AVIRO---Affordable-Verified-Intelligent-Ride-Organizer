import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  // Render free tier can take ~50s to wake up, so 10s was too short
  timeout: 60000,
});

// =========================================================
// SERVER WAKE-UP (Render free tier sleeps after 15 min)
// =========================================================
const WAKE_TOAST_ID = 'server-waking';
const WAKE_NOTICE_MS = 8000;
let pendingRequests = 0;
let wakeTimer = null;

const requestStarted = () => {
  pendingRequests += 1;
  if (!wakeTimer) {
    wakeTimer = setTimeout(() => {
      toast.loading('Server is slow to respond (it may be waking up). Please wait…', { id: WAKE_TOAST_ID });
    }, WAKE_NOTICE_MS);
  }
};

const requestFinished = () => {
  pendingRequests = Math.max(0, pendingRequests - 1);
  if (pendingRequests === 0) {
    clearTimeout(wakeTimer);
    wakeTimer = null;
    toast.dismiss(WAKE_TOAST_ID);
  }
};

// Called once when the app opens, so the server is starting while the user reads the page
export const wakeServer = () => {
  axios.get(`${API_URL}/health`, { timeout: 120000 }).catch(() => {});
};

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

    requestStarted();
    return config;
  },
  (error) => Promise.reject(error)
);

// =========================================================
// RESPONSE INTERCEPTOR
// =========================================================
api.interceptors.response.use(
  (response) => {
    requestFinished();
    return response;
  },
  (error) => {
    requestFinished();
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
