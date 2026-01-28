/**
 * Flowent Inbox v2 - API Service Layer
 * Handles all HTTP requests to the inbox backend
 *
 * Phase 2: Added cursor-based pagination support
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { getValidToken, hasStoredCredentials } from '@/lib/auth/get-token';
import type {
  Thread,
  ThreadsResponse,
  ThreadDetailResponse,
  InboxMessage,
  MessageResponse,
  ArtifactSummary,
  Artifact,
  ArtifactsListResponse,
  ArtifactResponse,
  ApprovalResponse,
} from '@/types/inbox';

// =====================================================
// PAGINATION TYPES
// =====================================================

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
  total?: number;
}

export interface ThreadsPageResponse {
  threads: Thread[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessagesPageResponse {
  messages: InboxMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

// =====================================================
// API CLIENT CONFIGURATION
// =====================================================

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Create axios instance with default config
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/inbox`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include cookies for auth
  timeout: 30000, // 30 second timeout
});

/**
 * Request interceptor for auth
 * Uses centralized getValidToken() for reliable token retrieval
 */
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (simplified - only checks 'accessToken')
    const token = getValidToken();

    // EMERGENCY DEBUG LOG
    console.log('[INBOX_API] localStorage.accessToken:', token ? `FOUND (${token.substring(0, 8)}...)` : 'MISSING');

    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[INBOX_API] Authorization header SET');
    } else if (!token) {
      console.warn('[INBOX_API] NO TOKEN - request will be unauthorized!');
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Custom error class that preserves HTTP status for React Query retry logic
 */
class ApiError extends Error {
  response?: { status?: number };

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.response = { status };
  }
}

/**
 * Token refresh state to prevent rate limiting
 * - Only allow one refresh attempt every 30 seconds
 * - Track if refresh is in progress to prevent concurrent attempts
 */
let lastRefreshAttempt = 0;
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;
const REFRESH_COOLDOWN_MS = 30000; // 30 seconds between refresh attempts

/**
 * Check if we have any credentials to even attempt a refresh
 * Uses centralized hasStoredCredentials() function
 */
function hasRefreshCredentials(): boolean {
  return hasStoredCredentials();
}

/**
 * Try to refresh the access token using the refresh token
 * With rate-limiting protection to prevent 429 errors
 *
 * CRITICAL FIX: Now checks if credentials exist before attempting refresh
 * This prevents infinite 401 loops when user is not logged in
 */
async function tryRefreshToken(): Promise<string | null> {
  const now = Date.now();

  // CRITICAL: Don't attempt refresh if no credentials exist
  if (!hasRefreshCredentials()) {
    return null;
  }

  // Check cooldown - don't attempt refresh if we just tried
  if (now - lastRefreshAttempt < REFRESH_COOLDOWN_MS) {
    return null;
  }

  // If a refresh is already in progress, wait for it
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  lastRefreshAttempt = now;

  refreshPromise = (async () => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/auth/refresh`,
        {},
        { withCredentials: true }
      );
      if (response.data?.ok && response.data?.accessToken) {
        // Store new token in localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('accessToken', response.data.accessToken);
        }
        return response.data.accessToken;
      }
      return null;
    } catch (error: any) {
      // If we get 429 Too Many Requests, extend the cooldown
      if (error.response?.status === 429) {
        lastRefreshAttempt = now + 60000; // Add extra 60 seconds to cooldown
      }
      // If we get 401/403, the refresh token is invalid - notify auth context
      if (error.response?.status === 401 || error.response?.status === 403) {
        handleAuthFailure();
      }
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Handle authentication failure
 * CRITICAL FIX: Instead of clearing tokens, dispatch an event
 * This prevents auth loops when backend is temporarily unavailable
 * The AuthContext should listen for this event and handle re-login if needed
 */
function handleAuthFailure() {
  if (typeof window !== 'undefined') {
    // Dispatch event for AuthContext to handle
    window.dispatchEvent(new CustomEvent('auth:unauthorized', {
      detail: { source: 'inbox-service', timestamp: Date.now() }
    }));
  }
}

/**
 * Response interceptor for error handling
 * CRITICAL: Preserves response.status for React Query retry decisions
 * Handles 401 errors with token refresh attempt
 *
 * CRITICAL FIX: Added credential check before attempting refresh
 * to prevent 401 loops when user is not logged in
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ error?: string; message?: string }>) => {
    const status = error.response?.status;
    const message = error.response?.data?.error ||
                    error.response?.data?.message ||
                    error.message ||
                    'An unexpected error occurred';

    // Handle 401 Unauthorized - try to refresh token ONLY if we have credentials
    if (status === 401 && error.config && !(error.config as any)._retry) {
      (error.config as any)._retry = true;

      // Check if we have credentials before attempting refresh
      if (!hasRefreshCredentials()) {
        const apiError = new ApiError('Authentication required. Please log in.', 401);
        return Promise.reject(apiError);
      }

      const newToken = await tryRefreshToken();

      if (newToken) {
        error.config.headers.Authorization = `Bearer ${newToken}`;
        return apiClient.request(error.config);
      } else {
        handleAuthFailure();
      }
    }

    // Return ApiError with status preserved for retry logic
    const apiError = new ApiError(message, status);
    return Promise.reject(apiError);
  }
);

// =====================================================
// THREAD OPERATIONS
// =====================================================

/**
 * Fetch all threads for the current user (legacy - no pagination)
 */
export async function getThreads(options?: {
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<Thread[]> {
  const params = new URLSearchParams();
  if (options?.status) params.append('status', options.status);
  if (options?.limit) params.append('limit', options.limit.toString());
  if (options?.offset) params.append('offset', options.offset.toString());

  const response = await apiClient.get<ThreadsResponse>(
    `/threads${params.toString() ? `?${params.toString()}` : ''}`
  );

  return response.data.threads;
}

/**
 * Fetch threads with cursor-based pagination and optional filters
 * @param cursor - Timestamp cursor for pagination (ISO string of lastMessageAt)
 * @param limit - Number of threads per page (default 20)
 * @param status - Optional status filter
 * @param search - Optional search query (searches subject, preview, agentName)
 * @param agentId - Optional agent filter
 */
export async function getThreadsPaginated(options: {
  cursor?: string;
  limit?: number;
  status?: string;
  search?: string;
  agentId?: string;
}): Promise<ThreadsPageResponse> {
  const params = new URLSearchParams();
  if (options.cursor) params.append('cursor', options.cursor);
  params.append('limit', (options.limit || 20).toString());
  if (options.status) params.append('status', options.status);
  if (options.search?.trim()) params.append('search', options.search.trim());
  if (options.agentId) params.append('agentId', options.agentId);

  const response = await apiClient.get<ThreadsPageResponse>(
    `/threads${params.toString() ? `?${params.toString()}` : ''}`
  );

  // Handle legacy response format (array only) and new format (with pagination)
  if (Array.isArray(response.data)) {
    const threads = response.data as unknown as Thread[];
    return {
      threads,
      nextCursor: null,
      hasMore: false,
    };
  }

  return {
    threads: response.data.threads || [],
    nextCursor: response.data.nextCursor || null,
    hasMore: response.data.hasMore || false,
  };
}

/**
 * Fetch a single thread with its messages
 */
export async function getThread(threadId: string): Promise<{
  thread: Thread;
  messages: InboxMessage[];
}> {
  const response = await apiClient.get<ThreadDetailResponse>(`/threads/${threadId}`);
  return {
    thread: response.data.thread,
    messages: response.data.messages,
  };
}

/**
 * Fetch messages for a specific thread (legacy - no pagination)
 */
export async function getThreadMessages(threadId: string): Promise<InboxMessage[]> {
  const response = await apiClient.get<ThreadDetailResponse>(`/threads/${threadId}`);
  return response.data.messages;
}

/**
 * Fetch messages with cursor-based pagination
 * Messages are fetched in reverse chronological order (newest first)
 * The UI should reverse them for display (oldest at top)
 *
 * @param threadId - Thread ID
 * @param cursor - Timestamp cursor (ISO string of createdAt) for fetching older messages
 * @param limit - Number of messages per page (default 50)
 */
export async function getThreadMessagesPaginated(
  threadId: string,
  options: {
    cursor?: string;
    limit?: number;
  }
): Promise<MessagesPageResponse> {
  const params = new URLSearchParams();
  if (options.cursor) params.append('cursor', options.cursor);
  params.append('limit', (options.limit || 50).toString());

  const response = await apiClient.get<MessagesPageResponse>(
    `/threads/${threadId}/messages?${params.toString()}`
  );

  // Handle legacy response format
  if (Array.isArray(response.data)) {
    const messages = response.data as unknown as InboxMessage[];
    return {
      messages,
      nextCursor: null,
      hasMore: false,
    };
  }

  // Handle case where response has 'messages' instead of direct data
  if ('messages' in response.data && Array.isArray(response.data.messages)) {
    return {
      messages: response.data.messages,
      nextCursor: response.data.nextCursor || null,
      hasMore: response.data.hasMore || false,
    };
  }

  return {
    messages: [],
    nextCursor: null,
    hasMore: false,
  };
}

/**
 * Send a new message to a thread
 */
export async function sendMessage(
  threadId: string,
  content: string,
  options?: {
    type?: 'text';
    role?: 'user';
    agentId?: string;
  }
): Promise<InboxMessage> {
  const response = await apiClient.post<MessageResponse>(`/threads/${threadId}/messages`, {
    content,
    type: options?.type || 'text',
    role: options?.role || 'user',
    agentId: options?.agentId,
  });

  return response.data.message;
}

/**
 * Mark a thread as read
 */
export async function markThreadAsRead(threadId: string): Promise<void> {
  await apiClient.post(`/threads/${threadId}/mark-read`);
}

/**
 * Mark a thread as unread (sets unreadCount = 1)
 */
export async function markThreadAsUnread(threadId: string): Promise<Thread> {
  const response = await apiClient.post<{ success: boolean; thread: Thread }>(
    `/threads/${threadId}/mark-unread`
  );
  return response.data.thread;
}

/**
 * Update thread status (archive, activate, etc.)
 */
export async function updateThreadStatus(
  threadId: string,
  status: 'active' | 'archived'
): Promise<Thread> {
  const response = await apiClient.patch<{ success: boolean; thread: Thread }>(
    `/threads/${threadId}/status`,
    { status }
  );
  return response.data.thread;
}

/**
 * Archive a thread
 */
export async function archiveThread(threadId: string): Promise<Thread> {
  return updateThreadStatus(threadId, 'archived');
}

/**
 * Unarchive a thread (restore to active)
 */
export async function unarchiveThread(threadId: string): Promise<Thread> {
  return updateThreadStatus(threadId, 'active');
}

/**
 * Delete a thread (soft delete - moves to trash)
 * @param permanent - If true, permanently deletes the thread
 */
export async function deleteThread(
  threadId: string,
  permanent: boolean = false
): Promise<void> {
  await apiClient.delete(`/threads/${threadId}`, {
    params: { permanent: permanent ? 'true' : 'false' },
  });
}

/**
 * Create a new thread
 * @param data - Thread creation data
 */
export async function createThread(data?: {
  subject?: string;
  agentId?: string;
  agentName?: string;
}): Promise<Thread> {
  const response = await apiClient.post<{ success: boolean; thread: Thread }>('/threads', {
    subject: data?.subject || 'New Conversation',
    agentId: data?.agentId,
    agentName: data?.agentName,
  });
  return response.data.thread;
}

// =====================================================
// ARTIFACT OPERATIONS
// =====================================================

/**
 * Fetch artifacts for a thread (lightweight list)
 */
export async function getArtifacts(threadId: string): Promise<ArtifactSummary[]> {
  const response = await apiClient.get<ArtifactsListResponse>(`/artifacts/${threadId}`);
  return response.data.artifacts;
}

/**
 * Fetch a single artifact with full content
 */
export async function getArtifactContent(artifactId: string): Promise<Artifact> {
  const response = await apiClient.get<ArtifactResponse>(`/artifacts/item/${artifactId}`);
  return response.data.artifact;
}

/**
 * Create a new artifact
 */
export async function createArtifact(data: {
  threadId?: string;
  messageId?: string;
  type: string;
  title: string;
  content: string;
  language?: string;
  metadata?: Record<string, unknown>;
}): Promise<Artifact> {
  const response = await apiClient.post<ArtifactResponse>('/artifacts', data);
  return response.data.artifact;
}

/**
 * Update an artifact
 */
export async function updateArtifact(
  artifactId: string,
  data: {
    content?: string;
    title?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<Artifact> {
  const response = await apiClient.put<ArtifactResponse>(`/artifacts/${artifactId}`, data);
  return response.data.artifact;
}

/**
 * Delete an artifact
 */
export async function deleteArtifact(artifactId: string): Promise<void> {
  await apiClient.delete(`/artifacts/${artifactId}`);
}

// =====================================================
// APPROVAL OPERATIONS
// =====================================================

/**
 * Approve a pending approval request
 */
export async function approveWorkflow(approvalId: string): Promise<ApprovalResponse> {
  const response = await apiClient.post<ApprovalResponse>(`/approvals/${approvalId}/approve`);
  return response.data;
}

/**
 * Reject a pending approval request
 */
export async function rejectWorkflow(
  approvalId: string,
  comment?: string
): Promise<ApprovalResponse> {
  const response = await apiClient.post<ApprovalResponse>(`/approvals/${approvalId}/reject`, {
    comment,
  });
  return response.data;
}

// =====================================================
// EXPORT DEFAULT CLIENT
// =====================================================

export const inboxApi = {
  // Threads
  getThreads,
  getThread,
  getThreadMessages,
  sendMessage,
  markThreadAsRead,
  markThreadAsUnread,
  updateThreadStatus,
  archiveThread,
  unarchiveThread,
  deleteThread,
  createThread,

  // Artifacts
  getArtifacts,
  getArtifactContent,
  createArtifact,
  updateArtifact,
  deleteArtifact,

  // Approvals
  approveWorkflow,
  rejectWorkflow,
};

export default inboxApi;
