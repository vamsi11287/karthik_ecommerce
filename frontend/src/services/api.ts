import axios, { type AxiosError } from 'axios';

// Base API URL targeting the backend server
export const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

// Generate or retrieve persistent guest session ID
const getSessionId = (): string => {
  let sessionId = localStorage.getItem('ecommerce_session_id');
  if (!sessionId) {
    sessionId = 'sess_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('ecommerce_session_id', sessionId);
  }
  return sessionId;
};

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Required for HttpOnly auth cookies
  headers: {
    'Content-Type': 'application/json',
    'x-session-id': getSessionId(),
  },
});

// Request interceptor to automatically attach Authorization Bearer token from storage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('ecommerce_auth_token') || localStorage.getItem('token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ success?: boolean; message?: string; errors?: any }>) => {
    const customMessage =
      error.response?.data?.message ||
      (typeof error.response?.data === 'string' ? error.response.data : error.message) ||
      'An unexpected network error occurred';
    return Promise.reject(new Error(customMessage));
  }
);

export default apiClient;
