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
});

if (import.meta.env.DEV) {
  console.log('API Base URL:', api.defaults.baseURL);
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const squadId = localStorage.getItem('attendx_active_squad_id');
  if (squadId) config.headers['x-squad-id'] = squadId;
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
        data: err.response?.data
      });
    }
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;