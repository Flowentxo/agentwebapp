/**
 * TypeScript Interfaces for OAuth2 Integrations System
 */

/**
 * OAuth2 Provider types
 */
export type OAuthProvider = 'google' | 'microsoft' | 'slack' | 'github';

/**
 * Google service types
 */
export type GoogleService = 'gmail' | 'calendar' | 'drive';

/**
 * Integration categories for filtering
 */
export type IntegrationCategory = 'all' | 'communication' | 'development' | 'productivity';

/**
 * Integration connection status
 */
export type IntegrationStatus = 'not_connected' | 'connecting' | 'connected' | 'error';

/**
 * Connected user profile information
 */
export interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  lastSync?: Date;
}

/**
 * Integration error details
 */
export interface IntegrationError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

/**
 * OAuth2 scope definition
 */
export interface OAuthScope {
  scope: string;
  description: string;
  required: boolean;
}

/**
 * Integration definition
 */
export interface Integration {
  // Identity
  id: string;
  name: string;
  provider: OAuthProvider;
  service: string; // e.g., 'gmail', 'calendar', 'outlook'
  category: IntegrationCategory;

  // UI
  icon: React.ComponentType<{ size?: string | number; className?: string }>;
  color: string;
  description: string;
  features: string[];

  // OAuth
  scopes: OAuthScope[];
  authUrl?: string;

  // State
  status: IntegrationStatus;
  connectedUser?: ConnectedUser;
  error?: IntegrationError;

  // Metadata
  lastConnectedAt?: Date;
  metadata?: Record<string, any>;
}

/**
 * OAuth initiate request
 */
export interface OAuthInitiateRequest {
  provider: OAuthProvider;
  service: string;
}

/**
 * OAuth initiate response
 */
export interface OAuthInitiateResponse {
  authUrl: string;
  service: string;
}

/**
 * OAuth disconnect request
 */
export interface OAuthDisconnectRequest {
  provider: OAuthProvider;
  service: string;
}

/**
 * OAuth refresh request
 */
export interface OAuthRefreshRequest {
  provider: OAuthProvider;
  service: string;
}

/**
 * API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Integration card props
 */
export interface IntegrationCardProps {
  integration: Integration;
  onConnect: (integration: Integration) => void;
  onDisconnect: (integration: Integration) => void;
  onRefresh: (integration: Integration) => void;
}

/**
 * OAuth button props
 */
export interface OAuthButtonProps {
  provider: OAuthProvider;
  service: string;
  isLoading?: boolean;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Connected profile props
 */
export interface ConnectedProfileProps {
  user: ConnectedUser;
  onRefresh: () => void;
  onDisconnect: () => void;
  isRefreshing?: boolean;
}

/**
 * Status badge props
 */
export interface StatusBadgeProps {
  status: IntegrationStatus;
  className?: string;
}

/**
 * Integrations section props
 */
export interface IntegrationsSectionProps {
  initialCategory?: IntegrationCategory;
  onCategoryChange?: (category: IntegrationCategory) => void;
}

/**
 * Use integrations hook return type
 */
export interface UseIntegrationsReturn {
  integrations: Integration[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  connectIntegration: (integration: Integration) => Promise<void>;
  disconnectIntegration: (integration: Integration) => Promise<void>;
  refreshIntegration: (integration: Integration) => Promise<void>;
}

/**
 * Toast notification
 */
export interface ToastNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  duration?: number;
}
