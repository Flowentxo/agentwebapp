/**
 * Custom Hook: useIntegrations
 *
 * Manages OAuth2 integrations state and API calls
 * Provides connect, disconnect, refresh functionality
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Integration,
  IntegrationStatus,
  UseIntegrationsReturn,
  OAuthInitiateResponse,
} from '@/types/integrations';
import { useToast } from '@/hooks/useToast';

/**
 * Main hook for managing integrations
 *
 * @returns Integration state and management functions
 *
 * @example
 * ```tsx
 * function IntegrationsPage() {
 *   const {
 *     integrations,
 *     isLoading,
 *     connectIntegration,
 *     disconnectIntegration
 *   } = useIntegrations();
 *
 *   return (
 *     <div>
 *       {integrations.map(integration => (
 *         <IntegrationCard
 *           key={integration.id}
 *           integration={integration}
 *           onConnect={connectIntegration}
 *           onDisconnect={disconnectIntegration}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useIntegrations(): UseIntegrationsReturn {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { showToast } = useToast();

  /**
   * Fetch integrations from API
   */
  const fetchIntegrations = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/integrations');

      if (!response.ok) {
        throw new Error('Failed to fetch integrations');
      }

      const data = await response.json();
      setIntegrations(data.integrations || []);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      showToast({
        type: 'error',
        title: 'Failed to load integrations',
        message: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  /**
   * Initial load
   */
  useEffect(() => {
    fetchIntegrations();
  }, [fetchIntegrations]);

  /**
   * Update integration status locally
   */
  const updateIntegrationStatus = useCallback(
    (integrationId: string, status: IntegrationStatus, updates?: Partial<Integration>) => {
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.id === integrationId
            ? { ...integration, status, ...updates }
            : integration
        )
      );
    },
    []
  );

  /**
   * Connect integration (start OAuth flow)
   *
   * @param integration - Integration to connect
   */
  const connectIntegration = useCallback(
    async (integration: Integration) => {
      try {
        // Update status to connecting
        updateIntegrationStatus(integration.id, 'connecting');

        // Call initiate endpoint
        const response = await fetch(`/api/oauth/${integration.provider}/initiate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service: integration.service,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to initiate OAuth flow');
        }

        const data: OAuthInitiateResponse = await response.json();

        // Redirect to OAuth authorization URL
        window.location.href = data.authUrl;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Connection failed';

        // Update to error state
        updateIntegrationStatus(integration.id, 'error', {
          error: {
            code: 'connection_failed',
            message: errorMessage,
            timestamp: new Date(),
            retryable: true,
          },
        });

        showToast({
          type: 'error',
          title: 'Connection failed',
          message: errorMessage,
        });
      }
    },
    [updateIntegrationStatus, showToast]
  );

  /**
   * Disconnect integration
   *
   * @param integration - Integration to disconnect
   */
  const disconnectIntegration = useCallback(
    async (integration: Integration) => {
      // Confirmation dialog
      const confirmed = window.confirm(
        `Disconnect ${integration.name}?\n\nThis will stop all syncing and revoke access.`
      );

      if (!confirmed) return;

      try {
        // Optimistic update
        updateIntegrationStatus(integration.id, 'not_connected', {
          connectedUser: undefined,
          error: undefined,
        });

        // Call disconnect endpoint
        const response = await fetch('/api/oauth/disconnect', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: integration.provider,
            service: integration.service,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to disconnect');
        }

        showToast({
          type: 'success',
          title: 'Disconnected successfully',
          message: `${integration.name} has been disconnected`,
        });

        // Refetch to sync with server
        await fetchIntegrations();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Disconnection failed';

        // Revert optimistic update
        updateIntegrationStatus(integration.id, 'connected');

        showToast({
          type: 'error',
          title: 'Disconnection failed',
          message: errorMessage,
        });
      }
    },
    [updateIntegrationStatus, showToast, fetchIntegrations]
  );

  /**
   * Refresh integration (renew token)
   *
   * @param integration - Integration to refresh
   */
  const refreshIntegration = useCallback(
    async (integration: Integration) => {
      try {
        // Optimistic update
        updateIntegrationStatus(integration.id, 'connecting');

        // Call refresh endpoint
        const response = await fetch('/api/oauth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: integration.provider,
            service: integration.service,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to refresh token');
        }

        const data = await response.json();

        // Update to connected state
        updateIntegrationStatus(integration.id, 'connected', {
          connectedUser: integration.connectedUser
            ? {
                ...integration.connectedUser,
                lastSync: new Date(),
              }
            : undefined,
        });

        showToast({
          type: 'success',
          title: 'Sync successful',
          message: `${integration.name} has been refreshed`,
        });

        // Refetch to get updated data
        await fetchIntegrations();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Refresh failed';

        // Update to error state
        updateIntegrationStatus(integration.id, 'error', {
          error: {
            code: 'refresh_failed',
            message: errorMessage,
            timestamp: new Date(),
            retryable: true,
          },
        });

        showToast({
          type: 'error',
          title: 'Refresh failed',
          message: `${errorMessage}. Please try disconnecting and reconnecting.`,
        });
      }
    },
    [updateIntegrationStatus, showToast, fetchIntegrations]
  );

  return {
    integrations,
    isLoading,
    error,
    refetch: fetchIntegrations,
    connectIntegration,
    disconnectIntegration,
    refreshIntegration,
  };
}

/**
 * Hook to handle OAuth callback
 *
 * Checks URL parameters for OAuth callback and shows appropriate feedback
 *
 * @example
 * ```tsx
 * function IntegrationsPage() {
 *   useOAuthCallback();
 *   // ...
 * }
 * ```
 */
export function useOAuthCallback() {
  const { showToast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const error = params.get('error');
    const provider = params.get('provider');
    const account = params.get('account');

    if (success === 'true' && provider) {
      showToast({
        type: 'success',
        title: 'Connected successfully!',
        message: account
          ? `${provider} connected as ${account}`
          : `${provider} has been connected to your account`,
        duration: 5000,
      });

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (success) {
      // Legacy format: Parse success message (e.g., "google_gmail_connected")
      const [prov, service] = success.replace('_connected', '').split('_');
      const serviceName = service?.charAt(0).toUpperCase() + service?.slice(1) || prov;

      showToast({
        type: 'success',
        title: 'Connected successfully!',
        message: `${serviceName} has been connected to your account`,
        duration: 5000,
      });

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    if (error) {
      // Parse error code
      const errorMessages: Record<string, string> = {
        access_denied: 'You denied access. You can try again anytime.',
        invalid_state: 'Security validation failed. Please try again.',
        session_expired: 'Session expired. Please try again.',
        token_exchange_failed: 'Failed to complete authentication. Please try again.',
        profile_fetch_failed: 'Failed to fetch profile information.',
        connection_failed: 'Connection failed. Please try again.',
      };

      const message = errorMessages[error] || error || 'An unknown error occurred';

      showToast({
        type: 'error',
        title: 'Connection failed',
        message,
        duration: 7000,
      });

      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [showToast]);
}

// ============================================
// PROVIDER DEFINITIONS (for UI)
// ============================================

export interface ProviderDefinition {
  id: string;
  name: string;
  category: 'email' | 'crm' | 'chat' | 'calendar' | 'storage' | 'analytics';
  icon: string;
  description: string;
  color: string;
}

export const AVAILABLE_PROVIDERS: ProviderDefinition[] = [
  // Email
  {
    id: 'google',
    name: 'Google Workspace',
    category: 'email',
    icon: 'Mail',
    description: 'Gmail, Calendar, Drive',
    color: '#EA4335',
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    category: 'email',
    icon: 'Mail',
    description: 'Email and Calendar',
    color: '#0078D4',
  },

  // CRM
  {
    id: 'hubspot',
    name: 'HubSpot',
    category: 'crm',
    icon: 'Users',
    description: 'Contacts, Deals, Tickets',
    color: '#FF7A59',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    category: 'crm',
    icon: 'Cloud',
    description: 'Enterprise CRM',
    color: '#00A1E0',
  },

  // Chat
  {
    id: 'slack',
    name: 'Slack',
    category: 'chat',
    icon: 'MessageSquare',
    description: 'Team Communication',
    color: '#4A154B',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    category: 'chat',
    icon: 'MessageSquare',
    description: 'Team Collaboration',
    color: '#6264A7',
  },

  // Storage
  {
    id: 'drive',
    name: 'Google Drive',
    category: 'storage',
    icon: 'HardDrive',
    description: 'Cloud Storage',
    color: '#4285F4',
  },
  {
    id: 'notion',
    name: 'Notion',
    category: 'storage',
    icon: 'FileText',
    description: 'Workspace & Docs',
    color: '#000000',
  },
];

/**
 * Hook to get provider status merged with definitions
 */
export function useProvidersWithStatus() {
  const { integrations, isLoading, refetch } = useIntegrations();

  const providers = AVAILABLE_PROVIDERS.map((provider) => {
    const connection = integrations.find(
      (i) => i.provider === provider.id || i.id === provider.id
    );

    return {
      ...provider,
      isConnected: connection?.status === 'connected',
      status: connection?.status || 'not_connected',
      connectedAs: connection?.connectedUser?.email,
      lastSync: connection?.connectedUser?.lastSync,
    };
  });

  return {
    providers,
    isLoading,
    refetch,
  };
}
