import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';
import { getValidToken, forceLogout } from '@/lib/auth/get-token';

/**
 * Centralized Axios client for all API calls
 * - Handles authentication (cookies + Bearer token)
 * - Consistent base URL
 * - Hard redirect to /login on 401
 */

const API_BASE_URL = typeof window !== 'undefined'
  ? '/api'
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api');

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add valid (non-expired) auth token
apiClient.interceptors.request.use(
  (config) => {
    config.withCredentials = true;

    if (typeof window !== 'undefined') {
      const token = getValidToken(); // Checks expiration (60s buffer)
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - redirect to /login only when a sent token was rejected
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url;
      const hadAuthHeader = !!error.config?.headers?.Authorization;

      // Only force logout if we actually sent a token and it was rejected
      // Skip auth-related endpoints (login, refresh, logout)
      if ((status === 401 || status === 403) && hadAuthHeader && !url?.includes('/auth/')) {
        forceLogout();
      }

      // 429 on auth endpoints means refresh loop → force logout
      if (status === 429 && url?.includes('/auth/')) {
        forceLogout();
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Type-safe API client methods
 */
export const api = {
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),

  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),

  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
};

export default apiClient;

/**
 * Helper to handle API errors consistently
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred';
}
