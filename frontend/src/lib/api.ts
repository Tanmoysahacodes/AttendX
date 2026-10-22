import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const isNative = typeof window !== 'undefined' && Capacitor.isNativePlatform();
const isLocalBrowser = typeof window !== 'undefined' &&
  !isNative &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

const api = axios.create({
  baseURL: isLocalBrowser
    ? 'http://localhost:3000/api'
    : (import.meta.env.VITE_API_URL || 'https://attendx-syic.onrender.com/api'),
  timeout: 45000, // 45 seconds to handle Render free-tier cold starts gracefully
});

if (import.meta.env.DEV) {
  console.log('API Base URL:', api.defaults.baseURL);
}

// Auth endpoints that should NEVER send previous user's stale credentials or squad ID
const AUTH_ENDPOINTS = ['/auth/login', '/auth/login/player'];

api.interceptors.request.use(config => {
  const requestUrl: string = config.url || '';
  const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => requestUrl.includes(ep));

  // Only attach authorization and squad headers on non-auth requests
  if (!isAuthEndpoint) {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    const squadId = localStorage.getItem('attendx_active_squad_id');
    if (squadId) config.headers['x-squad-id'] = squadId;
  }
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (import.meta.env.DEV) {
      console.error('API Error:', {
        url: err.config?.url,
        status: err.response?.status,
        message: err.message,
        data: err.response?.data,
      });
    }

    const requestUrl: string = err.config?.url || '';
    const isAuthEndpoint = AUTH_ENDPOINTS.some(ep => requestUrl.includes(ep));

    // Only auto-redirect on 401 for protected endpoints, not for login itself.
    // On Capacitor native, use hash navigation instead of full href reload to
    // avoid breaking the Android WebView routing.
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem('token');
      localStorage.removeItem('attendx_user');
      if (isNative) {
        // For Capacitor Android: use React Router navigation (set flag, let AuthContext handle it)
        window.dispatchEvent(new CustomEvent('attendx:session-expired'));
      } else {
        window.location.href = '/login';
      }
    }

    return Promise.reject(err);
  }
);

export default api;