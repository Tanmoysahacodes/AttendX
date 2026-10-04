import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://attendx-syic.onrender.com/api',
});

if (import.meta.env.DEV) {
  console.log('API Base URL:', api.defaults.baseURL);
}

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
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