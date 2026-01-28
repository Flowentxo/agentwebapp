# 🎨 React Components Guide - OAuth2 Integrations

**Complete Component Architecture** for modern, accessible OAuth2 integrations panel.

---

## 📦 **Component Architecture**

```
<IntegrationsSection>                    (Container - State Management)
  ├── <CategoryTabs />                   (Filter tabs)
  ├── <div className="integrations-grid">
  │   ├── <IntegrationCard>              (Individual integration)
  │   │   ├── <IntegrationHeader>
  │   │   │   ├── <IntegrationIcon />
  │   │   │   ├── <StatusBadge />
  │   │   ├── <IntegrationBody>
  │   │   │   ├── Description
  │   │   │   ├── <FeaturesList />
  │   │   │   ├── {status === 'not_connected' && <OAuthButton />}
  │   │   │   ├── {status === 'connecting' && <LoadingState />}
  │   │   │   ├── {status === 'connected' && <ConnectedProfile />}
  │   │   │   └── {status === 'error' && <ErrorState />}
  └── <Toast />                          (Notifications)
```

---

## 🔧 **Component Implementations**

### **1. OAuthButton Component**

```tsx
// components/integrations/OAuthButton.tsx

import React from 'react';
import { OAuthButtonProps } from '@/types/integrations';

/**
 * Official Google/Microsoft/Slack OAuth Button
 *
 * Features:
 * - Official brand styling (Google Blue, Microsoft Dark, etc.)
 * - Loading states
 * - Keyboard accessible
 * - ARIA labels
 */
export function OAuthButton({
  provider,
  service,
  isLoading = false,
  disabled = false,
  onClick,
  className = '',
}: OAuthButtonProps) {
  const providerConfig = {
    google: {
      label: 'Sign in with Google',
      className: 'oauth-btn-google',
      icon: <GoogleIcon />,
    },
    microsoft: {
      label: 'Sign in with Microsoft',
      className: 'oauth-btn-microsoft',
      icon: <MicrosoftIcon />,
    },
    slack: {
      label: 'Sign in with Slack',
      className: 'oauth-btn-slack',
      icon: <SlackIcon />,
    },
    github: {
      label: 'Sign in with GitHub',
      className: 'oauth-btn-github',
      icon: <GitHubIcon />,
    },
  };

  const config = providerConfig[provider];

  return (
    <button
      type="button"
      className={`oauth-btn ${config.className} ${className}`}
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-label={`Connect ${service} using ${provider}`}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <>
          <Spinner className="oauth-btn-icon" />
          <span>Connecting...</span>
        </>
      ) : (
        <>
          {config.icon}
          <span>{config.label}</span>
        </>
      )}
    </button>
  );
}

// Google Icon Component
function GoogleIcon() {
  return (
    <svg className="oauth-btn-icon" viewBox="0 0 48 48" fill="none">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={`spinner ${className}`}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
    >
      <circle cx="12" cy="12" r="10" strokeWidth="3" strokeDasharray="32" />
    </svg>
  );
}
```

---

### **2. StatusBadge Component**

```tsx
// components/integrations/StatusBadge.tsx

import React from 'react';
import { Check, Loader2, AlertCircle, Circle } from 'lucide-react';
import { StatusBadgeProps } from '@/types/integrations';

/**
 * Status indicator badge
 *
 * Visual states:
 * - Connected: Green with glow
 * - Connecting: Blue with spinner
 * - Error: Red
 * - Not Connected: Gray
 */
export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const statusConfig = {
    connected: {
      label: 'Connected',
      icon: Check,
      className: 'status-badge connected',
    },
    connecting: {
      label: 'Connecting...',
      icon: Loader2,
      className: 'status-badge connecting',
      animated: true,
    },
    error: {
      label: 'Error',
      icon: AlertCircle,
      className: 'status-badge error',
    },
    not_connected: {
      label: 'Not Connected',
      icon: Circle,
      className: 'status-badge not-connected',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`${config.className} ${className}`}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon
        size={12}
        className={config.animated ? 'animate-spin' : ''}
      />
      <span>{config.label}</span>
    </span>
  );
}
```

---

### **3. ConnectedProfile Component**

```tsx
// components/integrations/ConnectedProfile.tsx

import React from 'react';
import { Clock, RefreshCw } from 'lucide-react';
import { ConnectedProfileProps } from '@/types/integrations';
import { formatTimeAgo } from '@/lib/utils';

/**
 * Connected user profile display
 *
 * Shows:
 * - User avatar
 * - Name & email
 * - Last sync time
 * - Action buttons (Resync, Disconnect)
 */
export function ConnectedProfile({
  user,
  onRefresh,
  onDisconnect,
  isRefreshing = false,
}: ConnectedProfileProps) {
  return (
    <div className="connected-profile">
      <img
        src={user.avatar || '/default-avatar.png'}
        alt={user.name}
        className="connected-profile-avatar"
        loading="lazy"
      />

      <div className="connected-profile-info">
        <h4 className="connected-profile-name">{user.name}</h4>
        <p className="connected-profile-email">{user.email}</p>

        {user.lastSync && (
          <span className="connected-profile-sync">
            <Clock size={12} />
            Last synced: {formatTimeAgo(user.lastSync)}
          </span>
        )}
      </div>

      <div className="connected-profile-actions">
        <button
          type="button"
          className="btn-secondary"
          onClick={onRefresh}
          disabled={isRefreshing}
          aria-label="Refresh integration"
        >
          <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          {isRefreshing ? 'Syncing...' : 'Resync'}
        </button>

        <button
          type="button"
          className="btn-danger"
          onClick={onDisconnect}
          aria-label="Disconnect integration"
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}
```

---

### **4. IntegrationCard Component**

```tsx
// components/integrations/IntegrationCard.tsx

import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { IntegrationCardProps } from '@/types/integrations';
import { OAuthButton } from './OAuthButton';
import { StatusBadge } from './StatusBadge';
import { ConnectedProfile } from './ConnectedProfile';

/**
 * Integration Card - Main component
 *
 * Handles 4 states:
 * 1. Not Connected - Show OAuth button
 * 2. Connecting - Show loading spinner
 * 3. Connected - Show profile + actions
 * 4. Error - Show error message + retry
 */
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
      className={`integration-card ${integration.status === 'connected' ? 'success' : ''}`}
      style={{ '--integration-color': integration.color } as React.CSSProperties}
      data-integration={integration.id}
      aria-label={`${integration.name} integration`}
    >
      {/* Header */}
      <div className="integration-header">
        <div className="integration-icon" aria-hidden="true">
          <Icon size={24} />
        </div>

        <div className="integration-title-group">
          <h3 className="integration-name">{integration.name}</h3>
          <span className="integration-category">{integration.category}</span>
        </div>

        <StatusBadge status={integration.status} />
      </div>

      {/* Body */}
      <div className="integration-body">
        <p className="integration-description">{integration.description}</p>

        {/* Features list */}
        <ul className="integration-features" aria-label="Features">
          {integration.features.map((feature, index) => (
            <li key={index} className="integration-feature">
              <Check size={16} aria-hidden="true" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* State-specific content */}
        {integration.status === 'not_connected' && (
          <OAuthButton
            provider={integration.provider}
            service={integration.service}
            onClick={handleConnect}
          />
        )}

        {integration.status === 'connecting' && (
          <div className="loading-state">
            <Loader2 className="spinner" size={32} />
            <p className="loading-text">Connecting to {integration.name}...</p>
          </div>
        )}

        {integration.status === 'connected' && integration.connectedUser && (
          <ConnectedProfile
            user={integration.connectedUser}
            onRefresh={handleRefresh}
            onDisconnect={handleDisconnect}
            isRefreshing={isRefreshing}
          />
        )}

        {integration.status === 'error' && integration.error && (
          <div className="error-state">
            <p className="error-message">⚠️ {integration.error.message}</p>
            <div className="error-actions">
              {integration.error.retryable && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleConnect}
                >
                  Retry Connection
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                onClick={() => window.open('/docs/troubleshooting', '_blank')}
              >
                Learn More
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer - Privacy note */}
      <footer className="integration-footer">
        <small>
          🔒 We'll never access your data without permission.{' '}
          <a href="/privacy" target="_blank" rel="noopener">
            Learn more
          </a>
        </small>
      </footer>
    </article>
  );
}
```

---

### **5. IntegrationsSection Component (Complete)**

```tsx
// components/settings/IntegrationsSection.tsx

'use client';

import React, { useState } from 'react';
import { Mail, Calendar, HardDrive, MessageSquare, Github, Zap } from 'lucide-react';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { useIntegrations, useOAuthCallback } from '@/hooks/useIntegrations';
import type { Integration, IntegrationCategory } from '@/types/integrations';

/**
 * Integrations Section - Main container
 *
 * Features:
 * - Category filtering
 * - Grid layout (responsive)
 * - State management
 * - Real-time updates
 */
export function IntegrationsSection() {
  // Handle OAuth callback notifications
  useOAuthCallback();

  // Integration state management
  const {
    integrations,
    isLoading,
    error,
    connectIntegration,
    disconnectIntegration,
    refreshIntegration,
  } = useIntegrations();

  // Category filter
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory>('all');

  // Filter integrations by category
  const filteredIntegrations =
    activeCategory === 'all'
      ? integrations
      : integrations.filter((i) => i.category === activeCategory);

  // Category definitions
  const categories = [
    { id: 'all' as const, label: 'All', count: integrations.length },
    {
      id: 'communication' as const,
      label: 'Communication',
      count: integrations.filter((i) => i.category === 'communication').length,
    },
    {
      id: 'development' as const,
      label: 'Development',
      count: integrations.filter((i) => i.category === 'development').length,
    },
    {
      id: 'productivity' as const,
      label: 'Productivity',
      count: integrations.filter((i) => i.category === 'productivity').length,
    },
  ];

  if (isLoading) {
    return (
      <div className="integrations-loading">
        <Loader2 className="spinner" size={40} />
        <p>Loading integrations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="integrations-error">
        <AlertCircle size={48} />
        <h3>Failed to load integrations</h3>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <section className="integrations-section" aria-labelledby="integrations-title">
      {/* Header */}
      <header className="integrations-header">
        <div>
          <h2 id="integrations-title" className="integrations-title">
            Integrations
          </h2>
          <p className="integrations-subtitle">
            Connect external services to enhance your workflow
          </p>
        </div>
      </header>

      {/* Category Tabs */}
      <nav className="integrations-categories" aria-label="Integration categories">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-tab ${activeCategory === category.id ? 'active' : ''}`}
            onClick={() => setActiveCategory(category.id)}
            aria-current={activeCategory === category.id ? 'page' : undefined}
          >
            <span>{category.label}</span>
            <span className="category-count">{category.count}</span>
          </button>
        ))}
      </nav>

      {/* Integrations Grid */}
      <div className="integrations-grid">
        {filteredIntegrations.map((integration) => (
          <IntegrationCard
            key={integration.id}
            integration={integration}
            onConnect={connectIntegration}
            onDisconnect={disconnectIntegration}
            onRefresh={refreshIntegration}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredIntegrations.length === 0 && (
        <div className="integrations-empty">
          <MessageSquare size={48} />
          <h3>No integrations in this category</h3>
          <p>Try selecting a different category</p>
        </div>
      )}
    </section>
  );
}
```

---

## ♿ **Accessibility Features**

### **Keyboard Navigation**

```tsx
// All interactive elements support keyboard
<button
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleConnect();
    }
  }}
>
  Connect
</button>
```

### **ARIA Labels**

```tsx
<article aria-label={`${integration.name} integration`}>
  <button aria-label="Connect Gmail using Google">
    Sign in with Google
  </button>
  <span role="status" aria-label="Status: Connected">
    Connected
  </span>
</article>
```

### **Screen Reader Support**

```tsx
<span className="sr-only">
  {integration.name} is {integration.status}
</span>
```

---

## 📱 **Responsive Behavior**

```css
/* Desktop: 3 columns */
@media (min-width: 1024px) {
  .integrations-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Tablet: 2 columns */
@media (min-width: 768px) and (max-width: 1023px) {
  .integrations-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile: 1 column */
@media (max-width: 767px) {
  .integrations-grid {
    grid-template-columns: 1fr;
  }

  .connected-profile {
    flex-direction: column;
  }

  .connected-profile-actions {
    width: 100%;
    flex-direction: column;
  }
}
```

---

## 🔧 **State Management**

### **Local State (useState)**
- Component-level UI state (loading, modals)
- Optimistic updates

### **Custom Hook (useIntegrations)**
- Centralized integration state
- API calls
- Cache management

### **URL State (useOAuthCallback)**
- OAuth success/error notifications
- Clean URL after processing

---

## 🧪 **Testing Examples**

```tsx
// IntegrationCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { IntegrationCard } from './IntegrationCard';

test('shows OAuth button when not connected', () => {
  const integration = { status: 'not_connected', ...mockIntegration };
  render(<IntegrationCard integration={integration} />);

  expect(screen.getByText(/Sign in with Google/i)).toBeInTheDocument();
});

test('shows connected profile when connected', () => {
  const integration = {
    status: 'connected',
    connectedUser: { name: 'John Doe', email: 'john@example.com' },
    ...mockIntegration,
  };

  render(<IntegrationCard integration={integration} />);

  expect(screen.getByText('John Doe')).toBeInTheDocument();
  expect(screen.getByText('john@example.com')).toBeInTheDocument();
});

test('calls onConnect when OAuth button clicked', () => {
  const onConnect = jest.fn();
  const integration = { status: 'not_connected', ...mockIntegration };

  render(<IntegrationCard integration={integration} onConnect={onConnect} />);

  fireEvent.click(screen.getByRole('button', { name: /Sign in with Google/i }));

  expect(onConnect).toHaveBeenCalledWith(integration);
});
```

---

## ✅ **Implementation Checklist**

- [x] TypeScript interfaces defined
- [x] Custom hooks created (useIntegrations, useOAuthCallback)
- [x] OAuthButton component with official branding
- [x] StatusBadge with 4 states
- [x] ConnectedProfile with actions
- [x] IntegrationCard with state management
- [x] IntegrationsSection with grid layout
- [x] Accessibility features (ARIA, keyboard, screen reader)
- [x] Responsive design (3→2→1 columns)
- [x] Error handling & loading states
- [x] Toast notifications
- [x] CSS animations & transitions

---

**Status:** ✅ **Complete Component Architecture**
**Ready for:** Implementation + Testing

