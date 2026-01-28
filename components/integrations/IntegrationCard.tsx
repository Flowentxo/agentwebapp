/**
 * IntegrationCard Component
 *
 * Main integration card with 4 states:
 * 1. Not Connected - Shows connect button
 * 2. Connecting - Shows loading state
 * 3. Connected - Shows user profile and actions
 * 4. Error - Shows error message and retry
 */

import React, { useState } from 'react';
import { IntegrationCardProps } from '@/types/integrations';
import { OAuthButton } from './OAuthButton';
import { StatusBadge } from './StatusBadge';
import { ConnectedProfile } from './ConnectedProfile';

export function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onRefresh,
}: IntegrationCardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const Icon = integration.icon;

  const handleConnect = () => {
    onConnect(integration);
  };

  const handleDisconnect = () => {
    onDisconnect(integration);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh(integration);
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <article
      className="integration-card"
      data-integration={integration.id}
      data-status={integration.status}
    >
      {/* Header */}
      <div className="integration-card-header">
        <div className="integration-icon" style={{ color: integration.color }}>
          <Icon size={32} />
        </div>

        <div className="integration-header-content">
          <h3 className="integration-name">{integration.name}</h3>
          <p className="integration-category">{integration.category}</p>
        </div>

        <StatusBadge status={integration.status} />
      </div>

      {/* Description */}
      <p className="integration-description">{integration.description}</p>

      {/* Features */}
      <ul className="integration-features" aria-label="Features">
        {integration.features.slice(0, 3).map((feature, index) => (
          <li key={index}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M13.3334 4L6.00002 11.3333L2.66669 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {feature}
          </li>
        ))}
      </ul>

      {/* Scopes (collapsible) */}
      <details className="integration-scopes">
        <summary>
          Required Permissions ({integration.scopes.length})
        </summary>
        <ul>
          {integration.scopes.map((scope, index) => (
            <li key={index}>
              <span className="scope-name">{scope.scope}</span>
              <span className="scope-description">{scope.description}</span>
              {scope.required && (
                <span className="scope-badge" aria-label="Required">
                  Required
                </span>
              )}
            </li>
          ))}
        </ul>
      </details>

      {/* State-specific Content */}
      <div className="integration-card-content">
        {/* State 1: Not Connected */}
        {integration.status === 'not_connected' && (
          <div className="state-not-connected">
            <OAuthButton
              provider={integration.provider}
              service={integration.service}
              onClick={handleConnect}
            />
          </div>
        )}

        {/* State 2: Connecting */}
        {integration.status === 'connecting' && (
          <div className="state-connecting">
            <OAuthButton
              provider={integration.provider}
              service={integration.service}
              onClick={() => {}}
              isLoading={true}
              disabled={true}
            />
            <p className="connecting-message">
              Please complete authentication in the popup window...
            </p>
          </div>
        )}

        {/* State 3: Connected */}
        {integration.status === 'connected' && integration.connectedUser && (
          <div className="state-connected">
            <ConnectedProfile
              user={integration.connectedUser}
              onRefresh={handleRefresh}
              onDisconnect={handleDisconnect}
              isRefreshing={isRefreshing}
            />
          </div>
        )}

        {/* State 4: Error */}
        {integration.status === 'error' && (
          <div className="state-error" role="alert">
            <div className="error-icon" aria-hidden="true">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>

            <div className="error-content">
              <h4 className="error-title">Connection Error</h4>
              {integration.error && (
                <>
                  <p className="error-message">{integration.error.message}</p>
                  <p className="error-timestamp">
                    {new Date(integration.error.timestamp).toLocaleString()}
                  </p>
                </>
              )}
            </div>

            {integration.error?.retryable && (
              <button
                type="button"
                onClick={handleConnect}
                className="btn-primary btn-sm"
              >
                Retry Connection
              </button>
            )}
          </div>
        )}
      </div>

      {/* Footer (Last Connected) */}
      {integration.lastConnectedAt && integration.status === 'connected' && (
        <footer className="integration-card-footer">
          Connected{' '}
          {new Date(integration.lastConnectedAt).toLocaleDateString()}
        </footer>
      )}
    </article>
  );
}
