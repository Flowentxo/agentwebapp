/**
 * Brain AI v3.0 - Connected Sources Hub
 *
 * Integration Hub for managing external data sources:
 * - OAuth connection management
 * - Source status monitoring
 * - Sync controls and settings
 * - Integration health dashboard
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FolderSync,
  Cloud,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Settings,
  ExternalLink,
  Loader2,
  Plus,
  Clock,
  Database,
  FileText,
  HardDrive,
  MessageSquare,
  GitBranch,
  BookOpen,
  Layers,
  ChevronRight,
  Shield,
  Zap,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

type SourceProvider = 'google_drive' | 'slack' | 'github' | 'confluence' | 'notion';
type SyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

interface ConnectedSource {
  id: string;
  workspaceId: string;
  provider: SourceProvider;
  name: string;
  status: 'active' | 'inactive' | 'error';
  syncStatus: SyncStatus;
  lastSyncedAt: string | null;
  lastError: string | null;
  documentCount: number;
  config: Record<string, unknown>;
  createdAt: string;
}

interface ProviderConfig {
  id: SourceProvider;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  features: string[];
  setupInstructions: string;
  isAvailable: boolean;
}

// ============================================
// PROVIDER CONFIGURATIONS
// ============================================

const PROVIDERS: ProviderConfig[] = [
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Connect your Google Drive to search and index documents, spreadsheets, and presentations.',
    icon: <HardDrive className="w-6 h-6" />,
    color: '#4285f4',
    features: ['Full-text search', 'Real-time sync', 'Folder filtering', 'Permission-aware'],
    setupInstructions: 'Click Connect to authorize Brain AI to access your Google Drive files.',
    isAvailable: true,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Index Slack messages and threads to surface relevant conversations and decisions.',
    icon: <MessageSquare className="w-6 h-6" />,
    color: '#4a154b',
    features: ['Channel indexing', 'Thread context', 'User mentions', 'File attachments'],
    setupInstructions: 'Install the Brain AI app in your Slack workspace to enable message indexing.',
    isAvailable: true,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Search through repositories, issues, pull requests, and documentation.',
    icon: <GitBranch className="w-6 h-6" />,
    color: '#24292e',
    features: ['Code search', 'Issue tracking', 'PR context', 'Wiki indexing'],
    setupInstructions: 'Connect your GitHub account to enable repository and issue indexing.',
    isAvailable: true,
  },
  {
    id: 'confluence',
    name: 'Confluence',
    description: 'Index your Confluence spaces, pages, and documentation for comprehensive search.',
    icon: <BookOpen className="w-6 h-6" />,
    color: '#0052cc',
    features: ['Space filtering', 'Page hierarchy', 'Attachment indexing', 'Comment context'],
    setupInstructions: 'Authorize Brain AI to access your Atlassian Confluence instance.',
    isAvailable: false,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Connect Notion workspaces to search across pages, databases, and wikis.',
    icon: <Layers className="w-6 h-6" />,
    color: '#000000',
    features: ['Database search', 'Page content', 'Block-level indexing', 'Relation support'],
    setupInstructions: 'Install the Brain AI integration in your Notion workspace.',
    isAvailable: false,
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function ConnectedSourcesHub() {
  const [sources, setSources] = useState<ConnectedSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = useState<SourceProvider | null>(null);
  const [syncingSourceId, setSyncingSourceId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderConfig | null>(null);

  // Fetch connected sources
  const fetchSources = useCallback(async () => {
    try {
      const response = await fetch('/api/brain/connected/sources');
      if (!response.ok) throw new Error('Failed to fetch sources');
      const data = await response.json();
      setSources(data.sources || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sources');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSources();
  }, [fetchSources]);

  // Connect new source
  const handleConnect = async (provider: SourceProvider) => {
    setConnectingProvider(provider);

    try {
      const response = await fetch('/api/brain/connected/sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, action: 'initiate' }),
      });

      if (!response.ok) throw new Error('Failed to initiate connection');

      const data = await response.json();

      // Open OAuth popup
      if (data.authUrl) {
        const popup = window.open(
          data.authUrl,
          'oauth-popup',
          'width=600,height=700,left=200,top=100'
        );

        // Poll for completion
        const checkPopup = setInterval(() => {
          if (popup?.closed) {
            clearInterval(checkPopup);
            setConnectingProvider(null);
            fetchSources(); // Refresh sources
          }
        }, 500);
      }
    } catch (err) {
      console.error('Connection failed:', err);
      setConnectingProvider(null);
    }
  };

  // Trigger sync
  const handleSync = async (sourceId: string) => {
    setSyncingSourceId(sourceId);

    try {
      const response = await fetch(`/api/brain/connected/sources/${sourceId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sync' }),
      });

      if (!response.ok) throw new Error('Sync failed');

      // Poll for sync status
      const pollSync = setInterval(async () => {
        const statusResponse = await fetch(`/api/brain/connected/sources/${sourceId}`);
        const statusData = await statusResponse.json();

        if (statusData.source.syncStatus !== 'syncing') {
          clearInterval(pollSync);
          setSyncingSourceId(null);
          fetchSources();
        }
      }, 2000);
    } catch (err) {
      console.error('Sync failed:', err);
      setSyncingSourceId(null);
    }
  };

  // Disconnect source
  const handleDisconnect = async (sourceId: string) => {
    if (!confirm('Are you sure you want to disconnect this source? All indexed data will be removed.')) {
      return;
    }

    try {
      const response = await fetch(`/api/brain/connected/sources/${sourceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to disconnect');

      fetchSources();
    } catch (err) {
      console.error('Disconnect failed:', err);
    }
  };

  // Get provider config by id
  const getProviderConfig = (id: SourceProvider): ProviderConfig | undefined => {
    return PROVIDERS.find(p => p.id === id);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="sources-hub-loading">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p>Loading connected sources...</p>
      </div>
    );
  }

  return (
    <div className="sources-hub">
      {/* Header */}
      <div className="sources-hub-header">
        <div>
          <h1>Connected Sources</h1>
          <p>Manage your external data integrations and sync settings</p>
        </div>
        <button
          className="sources-add-button"
          onClick={() => setShowAddModal(true)}
        >
          <Plus className="w-4 h-4" />
          Add Integration
        </button>
      </div>

      {/* Stats Overview */}
      <div className="sources-stats">
        <div className="sources-stat-card">
          <Database className="w-5 h-5" />
          <div>
            <span className="sources-stat-value">{sources.length}</span>
            <span className="sources-stat-label">Connected Sources</span>
          </div>
        </div>
        <div className="sources-stat-card">
          <FileText className="w-5 h-5" />
          <div>
            <span className="sources-stat-value">
              {sources.reduce((acc, s) => acc + s.documentCount, 0).toLocaleString()}
            </span>
            <span className="sources-stat-label">Indexed Documents</span>
          </div>
        </div>
        <div className="sources-stat-card">
          <Check className="w-5 h-5" />
          <div>
            <span className="sources-stat-value">
              {sources.filter(s => s.status === 'active').length}
            </span>
            <span className="sources-stat-label">Active Syncs</span>
          </div>
        </div>
      </div>

      {/* Connected Sources List */}
      {sources.length > 0 ? (
        <div className="sources-list">
          <h2>Your Integrations</h2>
          <div className="sources-grid">
            {sources.map(source => {
              const provider = getProviderConfig(source.provider);
              const isSyncing = syncingSourceId === source.id || source.syncStatus === 'syncing';

              return (
                <div
                  key={source.id}
                  className={`source-card ${source.status}`}
                >
                  <div className="source-card-header">
                    <div
                      className="source-card-icon"
                      style={{ backgroundColor: `${provider?.color}20`, color: provider?.color }}
                    >
                      {provider?.icon}
                    </div>
                    <div className="source-card-info">
                      <h3>{source.name}</h3>
                      <span className="source-card-provider">{provider?.name}</span>
                    </div>
                    <StatusBadge status={source.status} syncStatus={source.syncStatus} />
                  </div>

                  <div className="source-card-stats">
                    <div className="source-stat">
                      <FileText className="w-4 h-4" />
                      <span>{source.documentCount.toLocaleString()} documents</span>
                    </div>
                    {source.lastSyncedAt && (
                      <div className="source-stat">
                        <Clock className="w-4 h-4" />
                        <span>Last sync: {formatRelativeTime(source.lastSyncedAt)}</span>
                      </div>
                    )}
                  </div>

                  {source.lastError && (
                    <div className="source-card-error">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{source.lastError}</span>
                    </div>
                  )}

                  <div className="source-card-actions">
                    <button
                      className="source-action-button"
                      onClick={() => handleSync(source.id)}
                      disabled={isSyncing}
                    >
                      {isSyncing ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                      {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button className="source-action-button secondary">
                      <Settings className="w-4 h-4" />
                    </button>
                    <button
                      className="source-action-button danger"
                      onClick={() => handleDisconnect(source.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="sources-empty">
          <Cloud className="w-12 h-12" />
          <h3>No sources connected</h3>
          <p>Connect your first integration to start indexing and searching your external data.</p>
          <button
            className="sources-add-button"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="w-4 h-4" />
            Add Your First Integration
          </button>
        </div>
      )}

      {/* Available Integrations */}
      <div className="sources-available">
        <h2>Available Integrations</h2>
        <div className="providers-grid">
          {PROVIDERS.map(provider => {
            const isConnected = sources.some(s => s.provider === provider.id);
            const isConnecting = connectingProvider === provider.id;

            return (
              <div
                key={provider.id}
                className={`provider-card ${!provider.isAvailable ? 'coming-soon' : ''} ${isConnected ? 'connected' : ''}`}
                onClick={() => {
                  if (provider.isAvailable && !isConnected) {
                    setSelectedProvider(provider);
                    setShowAddModal(true);
                  }
                }}
              >
                <div
                  className="provider-card-icon"
                  style={{ backgroundColor: `${provider.color}20`, color: provider.color }}
                >
                  {provider.icon}
                </div>
                <div className="provider-card-content">
                  <h3>
                    {provider.name}
                    {!provider.isAvailable && <span className="coming-soon-badge">Coming Soon</span>}
                    {isConnected && <span className="connected-badge"><Check className="w-3 h-3" /> Connected</span>}
                  </h3>
                  <p>{provider.description}</p>
                  <div className="provider-features">
                    {provider.features.slice(0, 2).map(feature => (
                      <span key={feature} className="provider-feature">{feature}</span>
                    ))}
                  </div>
                </div>
                {provider.isAvailable && !isConnected && (
                  <ChevronRight className="w-5 h-5 provider-arrow" />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Integration Modal */}
      {showAddModal && (
        <div className="sources-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="sources-modal" onClick={e => e.stopPropagation()}>
            <div className="sources-modal-header">
              <h2>
                {selectedProvider ? (
                  <>
                    <div
                      className="modal-provider-icon"
                      style={{ backgroundColor: `${selectedProvider.color}20`, color: selectedProvider.color }}
                    >
                      {selectedProvider.icon}
                    </div>
                    Connect {selectedProvider.name}
                  </>
                ) : (
                  'Add Integration'
                )}
              </h2>
              <button onClick={() => { setShowAddModal(false); setSelectedProvider(null); }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedProvider ? (
              <div className="sources-modal-body">
                <p className="modal-description">{selectedProvider.description}</p>

                <div className="modal-features">
                  <h4><Zap className="w-4 h-4" /> Features</h4>
                  <ul>
                    {selectedProvider.features.map(feature => (
                      <li key={feature}>
                        <Check className="w-4 h-4" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="modal-security">
                  <Shield className="w-4 h-4" />
                  <span>Your data is encrypted and never shared with third parties.</span>
                </div>

                <div className="modal-instructions">
                  <p>{selectedProvider.setupInstructions}</p>
                </div>

                <button
                  className="modal-connect-button"
                  onClick={() => {
                    handleConnect(selectedProvider.id);
                    setShowAddModal(false);
                    setSelectedProvider(null);
                  }}
                  disabled={connectingProvider !== null}
                  style={{ backgroundColor: selectedProvider.color }}
                >
                  {connectingProvider === selectedProvider.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-4 h-4" />
                      Connect {selectedProvider.name}
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="sources-modal-body">
                <p>Select an integration to connect:</p>
                <div className="modal-providers-list">
                  {PROVIDERS.filter(p => p.isAvailable).map(provider => {
                    const isConnected = sources.some(s => s.provider === provider.id);

                    return (
                      <button
                        key={provider.id}
                        className={`modal-provider-item ${isConnected ? 'connected' : ''}`}
                        onClick={() => !isConnected && setSelectedProvider(provider)}
                        disabled={isConnected}
                      >
                        <div
                          className="modal-provider-icon"
                          style={{ backgroundColor: `${provider.color}20`, color: provider.color }}
                        >
                          {provider.icon}
                        </div>
                        <span>{provider.name}</span>
                        {isConnected && <Check className="w-4 h-4 text-green-500" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx global>{`
        .sources-hub {
          padding: 24px;
          background: var(--bg-primary, #0f0f1a);
          min-height: 100vh;
        }

        .sources-hub-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          gap: 16px;
          color: var(--text-secondary, #999);
        }

        .sources-hub-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .sources-hub-header h1 {
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 4px;
        }

        .sources-hub-header p {
          font-size: 14px;
          color: var(--text-tertiary, #666);
        }

        .sources-add-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--color-primary, #7c3aed);
          border: none;
          border-radius: 8px;
          color: white;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .sources-add-button:hover {
          background: var(--color-primary-dark, #6d28d9);
          transform: translateY(-1px);
        }

        .sources-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 32px;
        }

        .sources-stat-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border: 1px solid var(--border-color, #2a2a4a);
        }

        .sources-stat-card > svg {
          color: var(--color-primary, #7c3aed);
        }

        .sources-stat-value {
          display: block;
          font-size: 24px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .sources-stat-label {
          font-size: 13px;
          color: var(--text-tertiary, #666);
        }

        .sources-list h2,
        .sources-available h2 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 16px;
        }

        .sources-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
          gap: 16px;
          margin-bottom: 40px;
        }

        .source-card {
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border: 1px solid var(--border-color, #2a2a4a);
          padding: 20px;
          transition: all 0.2s;
        }

        .source-card:hover {
          border-color: var(--color-primary, #7c3aed);
        }

        .source-card.error {
          border-color: #ef4444;
        }

        .source-card-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 16px;
        }

        .source-card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .source-card-info {
          flex: 1;
        }

        .source-card-info h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 2px;
        }

        .source-card-provider {
          font-size: 13px;
          color: var(--text-tertiary, #666);
        }

        .source-card-stats {
          display: flex;
          gap: 16px;
          margin-bottom: 16px;
        }

        .source-stat {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--text-secondary, #999);
        }

        .source-stat svg {
          opacity: 0.6;
        }

        .source-card-error {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 8px;
          margin-bottom: 16px;
          font-size: 13px;
          color: #ef4444;
        }

        .source-card-actions {
          display: flex;
          gap: 8px;
        }

        .source-action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid var(--border-color, #3a3a5a);
          border-radius: 6px;
          color: var(--text-primary, #fff);
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .source-action-button:hover:not(:disabled) {
          background: var(--bg-tertiary-hover, #3a3a5a);
        }

        .source-action-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .source-action-button.secondary {
          padding: 8px;
        }

        .source-action-button.danger {
          padding: 8px;
        }

        .source-action-button.danger:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: #ef4444;
          color: #ef4444;
        }

        .sources-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 16px;
          border: 2px dashed var(--border-color, #2a2a4a);
          margin-bottom: 40px;
          text-align: center;
        }

        .sources-empty svg {
          color: var(--text-tertiary, #666);
          margin-bottom: 16px;
        }

        .sources-empty h3 {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 8px;
        }

        .sources-empty p {
          font-size: 14px;
          color: var(--text-secondary, #999);
          margin-bottom: 24px;
          max-width: 400px;
        }

        .providers-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 16px;
        }

        .provider-card {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 20px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 12px;
          border: 1px solid var(--border-color, #2a2a4a);
          cursor: pointer;
          transition: all 0.2s;
        }

        .provider-card:hover:not(.coming-soon):not(.connected) {
          border-color: var(--color-primary, #7c3aed);
          transform: translateY(-2px);
        }

        .provider-card.coming-soon {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .provider-card.connected {
          cursor: default;
          border-color: #10b981;
        }

        .provider-card-icon {
          width: 48px;
          height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          flex-shrink: 0;
        }

        .provider-card-content {
          flex: 1;
        }

        .provider-card-content h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 6px;
        }

        .coming-soon-badge {
          padding: 2px 8px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 4px;
          font-size: 10px;
          font-weight: 500;
          color: var(--text-tertiary, #666);
          text-transform: uppercase;
        }

        .connected-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 8px;
          background: rgba(16, 185, 129, 0.2);
          border-radius: 4px;
          font-size: 11px;
          font-weight: 500;
          color: #10b981;
        }

        .provider-card-content p {
          font-size: 13px;
          color: var(--text-secondary, #999);
          line-height: 1.5;
          margin-bottom: 12px;
        }

        .provider-features {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .provider-feature {
          padding: 3px 8px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 4px;
          font-size: 11px;
          color: var(--text-secondary, #999);
        }

        .provider-arrow {
          color: var(--text-tertiary, #666);
          flex-shrink: 0;
          margin-top: 12px;
        }

        /* Modal Styles */
        .sources-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .sources-modal {
          width: 100%;
          max-width: 480px;
          background: var(--bg-secondary, #1a1a2e);
          border-radius: 16px;
          border: 1px solid var(--border-color, #2a2a4a);
          overflow: hidden;
        }

        .sources-modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color, #2a2a4a);
        }

        .sources-modal-header h2 {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary, #fff);
        }

        .sources-modal-header button {
          background: none;
          border: none;
          color: var(--text-secondary, #999);
          cursor: pointer;
          padding: 4px;
        }

        .sources-modal-header button:hover {
          color: var(--text-primary, #fff);
        }

        .modal-provider-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .sources-modal-body {
          padding: 24px;
        }

        .modal-description {
          font-size: 14px;
          color: var(--text-secondary, #999);
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .modal-features {
          margin-bottom: 24px;
        }

        .modal-features h4 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary, #fff);
          margin-bottom: 12px;
        }

        .modal-features ul {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .modal-features li {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          font-size: 14px;
          color: var(--text-secondary, #999);
        }

        .modal-features li svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .modal-security {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 13px;
          color: var(--text-secondary, #999);
        }

        .modal-security svg {
          color: #10b981;
          flex-shrink: 0;
        }

        .modal-instructions {
          padding: 16px;
          background: rgba(124, 58, 237, 0.1);
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .modal-instructions p {
          font-size: 14px;
          color: var(--text-primary, #fff);
          line-height: 1.5;
        }

        .modal-connect-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 14px;
          border: none;
          border-radius: 10px;
          color: white;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .modal-connect-button:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }

        .modal-connect-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-providers-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 16px;
        }

        .modal-provider-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: var(--bg-tertiary, #2a2a4a);
          border: 1px solid transparent;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
          text-align: left;
        }

        .modal-provider-item:hover:not(:disabled) {
          border-color: var(--color-primary, #7c3aed);
        }

        .modal-provider-item:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .modal-provider-item span {
          flex: 1;
          font-size: 15px;
          font-weight: 500;
          color: var(--text-primary, #fff);
        }

        @media (max-width: 768px) {
          .sources-hub-header {
            flex-direction: column;
            gap: 16px;
          }

          .sources-stats {
            grid-template-columns: 1fr;
          }

          .sources-grid,
          .providers-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: 'active' | 'inactive' | 'error';
  syncStatus: SyncStatus;
}

function StatusBadge({ status, syncStatus }: StatusBadgeProps) {
  const getStatusConfig = () => {
    if (syncStatus === 'syncing') {
      return { label: 'Syncing', color: '#3b82f6', icon: <RefreshCw className="w-3 h-3 animate-spin" /> };
    }
    switch (status) {
      case 'active':
        return { label: 'Connected', color: '#10b981', icon: <Check className="w-3 h-3" /> };
      case 'error':
        return { label: 'Error', color: '#ef4444', icon: <AlertTriangle className="w-3 h-3" /> };
      case 'inactive':
      default:
        return { label: 'Inactive', color: '#f59e0b', icon: <X className="w-3 h-3" /> };
    }
  };

  const config = getStatusConfig();

  return (
    <span
      className="status-badge"
      style={{
        backgroundColor: `${config.color}20`,
        color: config.color
      }}
    >
      {config.icon}
      {config.label}

      <style jsx>{`
        .status-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
      `}</style>
    </span>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default ConnectedSourcesHub;
