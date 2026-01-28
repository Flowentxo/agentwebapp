/**
 * IntegrationsSection Component
 *
 * Main container for integrations with category filtering and grid layout
 */

'use client';

import React, { useState, useMemo } from 'react';
import { IntegrationsSectionProps, IntegrationCategory, Integration } from '@/types/integrations';
import { useIntegrations, useOAuthCallback } from '@/hooks/useIntegrations';
import {
  INTEGRATIONS,
  INTEGRATION_CATEGORIES,
  getIntegrationsByCategory,
} from '@/lib/integrations/definitions';
import { IntegrationCard } from './IntegrationCard';

export function IntegrationsSection({
  initialCategory = 'all',
  onCategoryChange,
}: IntegrationsSectionProps) {
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>(initialCategory);

  // Handle OAuth callback (success/error from redirect)
  useOAuthCallback();

  // State management
  const {
    integrations: connectedIntegrations,
    isLoading,
    error,
    connectIntegration,
    disconnectIntegration,
    refreshIntegration,
  } = useIntegrations();

  // Merge static definitions with connection status
  const mergedIntegrations = useMemo(() => {
    return INTEGRATIONS.map((definition) => {
      // Find matching connected integration
      const connected = connectedIntegrations.find(
        (ci) => ci.provider === definition.provider && ci.service === definition.service
      );

      // Merge with connection status
      return {
        ...definition,
        status: connected?.status || 'not_connected',
        connectedUser: connected?.connectedUser,
        error: connected?.error,
        lastConnectedAt: connected?.lastConnectedAt,
      } as Integration;
    });
  }, [connectedIntegrations]);

  // Filter by category
  const filteredIntegrations = useMemo(() => {
    if (activeCategory === 'all') {
      return mergedIntegrations;
    }
    return mergedIntegrations.filter((i) => i.category === activeCategory);
  }, [mergedIntegrations, activeCategory]);

  // Handle category change
  const handleCategoryChange = (category: IntegrationCategory) => {
    setActiveCategory(category);
    onCategoryChange?.(category);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="integrations-section">
        <div className="integrations-loading">
          <div className="spinner-large" aria-label="Loading integrations">
            <svg className="spinner" viewBox="0 0 50 50">
              <circle
                className="spinner-circle"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                strokeWidth="4"
              />
            </svg>
          </div>
          <p>Loading integrations...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="integrations-section">
        <div className="integrations-error" role="alert">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
            <circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="3" />
            <path
              d="M24 14V26"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="24" cy="34" r="2" fill="currentColor" />
          </svg>
          <h3>Failed to load integrations</h3>
          <p>{error.message}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn-primary"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="integrations-section" aria-labelledby="integrations-heading">
      {/* Header */}
      <header className="integrations-header">
        <div>
          <h2 id="integrations-heading">Integrations</h2>
          <p className="integrations-subtitle">
            Connect your favorite tools and services to enhance your workflow
          </p>
        </div>

        {/* Stats */}
        <div className="integrations-stats">
          <div className="stat">
            <span className="stat-value">
              {connectedIntegrations.filter((i) => i.status === 'connected').length}
            </span>
            <span className="stat-label">Connected</span>
          </div>
          <div className="stat">
            <span className="stat-value">{INTEGRATIONS.length}</span>
            <span className="stat-label">Available</span>
          </div>
        </div>
      </header>

      {/* Category Filter */}
      <nav className="integrations-categories" aria-label="Filter by category">
        {INTEGRATION_CATEGORIES.map((category) => (
          <button
            key={category.id}
            type="button"
            onClick={() => handleCategoryChange(category.id as IntegrationCategory)}
            className={`category-btn ${
              activeCategory === category.id ? 'active' : ''
            }`}
            aria-current={activeCategory === category.id ? 'true' : undefined}
          >
            <span className="category-label">{category.label}</span>
            <span className="category-count">{category.count}</span>
          </button>
        ))}
      </nav>

      {/* Integrations Grid */}
      <div className="integrations-grid">
        {filteredIntegrations.length > 0 ? (
          filteredIntegrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onConnect={connectIntegration}
              onDisconnect={disconnectIntegration}
              onRefresh={refreshIntegration}
            />
          ))
        ) : (
          <div className="integrations-empty">
            <p>No integrations found in this category</p>
          </div>
        )}
      </div>

      {/* Footer Help Text */}
      <footer className="integrations-footer">
        <p>
          <strong>Need help?</strong> Check out our{' '}
          <a href="/docs/integrations" className="link">
            integration guides
          </a>{' '}
          or{' '}
          <a href="/support" className="link">
            contact support
          </a>
          .
        </p>
      </footer>
    </section>
  );
}
