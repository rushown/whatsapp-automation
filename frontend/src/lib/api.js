import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 15000,
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('wa_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('wa_token');
      localStorage.removeItem('wa_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;