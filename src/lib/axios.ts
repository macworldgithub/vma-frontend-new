import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

const api = axios.create({
  // baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://vma-backend.omnisuiteai.com',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('vma_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

