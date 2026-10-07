
import axios from 'axios';

const API_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

// Attach JWT token to every request
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

// Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired. Redirecting to login...');

      localStorage.removeItem('aviro_token');
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