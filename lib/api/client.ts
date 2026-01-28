import axios, { AxiosInstance, AxiosRequestConfig, AxiosError } from 'axios';

/**
 * Centralized Axios client for all API calls
 * - Handles authentication (cookies)
 * - Consistent base URL
 * - Error handling
 * - Request/response interceptors
 */

// Get backend API URL from environment
// Client-side: use Next.js API routes as proxy (handles auth cookies correctly)
// Server-side: connect directly to backend
const API_BASE_URL = typeof window !== 'undefined'
  ? '/api' // Client-side: use Next.js API routes
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api'); // Server-side: direct to backend

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - ALWAYS add auth token if available
// This ensures the Authorization header is sent with every request
apiClient.interceptors.request.use(
  (config) => {
    // Ensure withCredentials is always true for cookie-based auth
    config.withCredentials = true;

    // Add auth token from localStorage if available (for cross-origin requests)
    // This is the primary auth method when cookies can't be used cross-origin
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('accessToken');

      // EMERGENCY DEBUG LOG
      console.log('DEBUG: LocalStorage content for accessToken:', token ? `FOUND (${token.substring(0, 8)}...)` : 'MISSING');

      if (token && token.length > 10) {
        // ALWAYS set the header, even if already set (our token is authoritative)
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    // Log request in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`, {
        hasAuth: !!config.headers.Authorization,
        withCredentials: config.withCredentials
      });
    }
    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

/**
 * Check if we have any auth credentials stored
 * Used to decide whether to log 401 as expected or unexpected
 */
function hasStoredCredentials(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(localStorage.getItem('accessToken') || localStorage.getItem('token'));
}

// Response interceptor - handle common errors
apiClient.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] Response from ${response.config.url}:`, response.status);
    }
    return response;
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url;

      console.error(`[API] Error ${status} from ${url}:`, error.response.data);

      // 401: Unauthorized - log the error but DON'T clear tokens
      // This prevents auth loops when backend is temporarily unavailable
      // Let the AuthContext handle session management
      if (status === 401 && !url?.includes('/auth/login')) {
        const hadCredentials = hasStoredCredentials();

        if (hadCredentials) {
          console.warn('[API] Unauthorized - session may be expired');
          // Dispatch event to notify AuthContext - DO NOT clear tokens here
          // The AuthContext will validate and handle re-login if needed
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized', {
              detail: { url, timestamp: Date.now() }
            }));
          }
        } else {
          // Expected 401 when not logged in - just log at info level
          console.log('[API] Unauthorized - user not logged in (expected behavior)');
        }
        // DON'T clear tokens here - let AuthContext manage auth state
      }

      // 403: Forbidden
      if (status === 403) {
        console.error('[API] Forbidden - insufficient permissions');
      }

      // 500: Internal Server Error
      if (status >= 500) {
        console.error('[API] Server error - please try again later');
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('[API] No response received:', error.message);
    } else {
      // Something else happened
      console.error('[API] Error:', error.message);
    }

    return Promise.reject(error);
  }
);

/**
 * Type-safe API client methods
 */
export const api = {
  /**
   * GET request
   */
  get: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.get<T>(url, config),

  /**
   * POST request
   */
  post: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.post<T>(url, data, config),

  /**
   * PUT request
   */
  put: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.put<T>(url, data, config),

  /**
   * PATCH request
   */
  patch: <T = any>(url: string, data?: any, config?: AxiosRequestConfig) =>
    apiClient.patch<T>(url, data, config),

  /**
   * DELETE request
   */
  delete: <T = any>(url: string, config?: AxiosRequestConfig) =>
    apiClient.delete<T>(url, config),
};

/**
 * Raw axios instance for advanced use cases
 */
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
