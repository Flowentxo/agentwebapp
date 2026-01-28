/**
 * HUBSPOT STATUS DASHBOARD
 *
 * Displays HubSpot connection status, account info, and usage statistics
 */

'use client';

import React, { useEffect, useState } from 'react';
import { StatusBadge } from './StatusBadge';
import { RefreshCw, AlertCircle, CheckCircle, Activity } from 'lucide-react';

interface HubSpotAccountInfo {
  portalId?: string;
  user?: string;
  userEmail?: string;
  hubDomain?: string;
}

interface HubSpotStats {
  apiCalls24h: number;
  successCount: number;
  errorCount: number;
  rateLimitedCount: number;
  errorRate: number;
}

interface HubSpotStatusData {
  connected: boolean;
  status: 'connected' | 'disconnected';
  accountInfo?: HubSpotAccountInfo;
  lastSync?: string;
  expiresAt?: string;
  stats?: HubSpotStats;
}

export function HubSpotStatus() {
  const [status, setStatus] = useState<HubSpotStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/integrations/hubspot/status', {
        headers: {
          'x-user-id': 'demo-user', // TODO: Get from auth context
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load status');
      console.error('[HUBSPOT_STATUS] Error fetching status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setIsTesting(true);
      setTestResult(null);

      const response = await fetch('/api/integrations/hubspot/test', {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user', // TODO: Get from auth context
        },
      });

      const data = await response.json();

      setTestResult({
        success: data.success,
        message: data.message || (data.success ? 'Connection successful!' : 'Connection failed'),
      });

      // Refresh status after test
      if (data.success) {
        await fetchStatus();
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Test failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect HubSpot? This will remove access to your HubSpot data.')) {
      return;
    }

    try {
      setIsDisconnecting(true);

      const response = await fetch('/api/integrations/hubspot/disconnect', {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user', // TODO: Get from auth context
        },
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect');
      }

      // Refresh status
      await fetchStatus();
    } catch (err: any) {
      alert(`Disconnect failed: ${err.message}`);
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="hubspot-status-loading">
        <div className="spinner" aria-label="Loading" />
        <p>Loading HubSpot status...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hubspot-status-error" role="alert">
        <AlertCircle size={24} />
        <p>{error}</p>
        <button onClick={fetchStatus} className="btn-secondary btn-sm">
          Retry
        </button>
      </div>
    );
  }

  if (!status || !status.connected) {
    return (
      <div className="hubspot-status-disconnected">
        <StatusBadge status="not_connected" />
        <p>HubSpot is not connected. Please connect your account to use HubSpot features.</p>
      </div>
    );
  }

  return (
    <div className="hubspot-status-dashboard">
      {/* Header */}
      <div className="status-header">
        <div className="status-header-left">
          <h3>HubSpot Integration</h3>
          <StatusBadge status={status.status === 'connected' ? 'connected' : 'not_connected'} />
        </div>

        <div className="status-header-actions">
          <button
            onClick={handleTestConnection}
            disabled={isTesting}
            className="btn-secondary btn-sm"
            aria-label="Test connection"
          >
            {isTesting ? (
              <>
                <RefreshCw size={16} className="spinning" />
                Testing...
              </>
            ) : (
              <>
                <Activity size={16} />
                Test Connection
              </>
            )}
          </button>

          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="btn-danger btn-sm"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`test-result ${testResult.success ? 'success' : 'error'}`} role="status">
          {testResult.success ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          <p>{testResult.message}</p>
        </div>
      )}

      {/* Account Info */}
      {status.accountInfo && (
        <div className="status-section account-info">
          <h4>Account Information</h4>
          <dl className="info-grid">
            {status.accountInfo.portalId && (
              <>
                <dt>Portal ID</dt>
                <dd>{status.accountInfo.portalId}</dd>
              </>
            )}

            {status.accountInfo.user && (
              <>
                <dt>User</dt>
                <dd>{status.accountInfo.user}</dd>
              </>
            )}

            {status.accountInfo.userEmail && (
              <>
                <dt>Email</dt>
                <dd>{status.accountInfo.userEmail}</dd>
              </>
            )}

            {status.accountInfo.hubDomain && (
              <>
                <dt>Hub Domain</dt>
                <dd>
                  <a
                    href={`https://${status.accountInfo.hubDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {status.accountInfo.hubDomain}
                  </a>
                </dd>
              </>
            )}
          </dl>
        </div>
      )}

      {/* Connection Details */}
      <div className="status-section connection-details">
        <h4>Connection Details</h4>
        <dl className="info-grid">
          {status.lastSync && (
            <>
              <dt>Last Sync</dt>
              <dd>{new Date(status.lastSync).toLocaleString()}</dd>
            </>
          )}

          {status.expiresAt && (
            <>
              <dt>Token Expires</dt>
              <dd>{new Date(status.expiresAt).toLocaleString()}</dd>
            </>
          )}
        </dl>
      </div>

      {/* API Usage Statistics */}
      {status.stats && (
        <div className="status-section usage-stats">
          <h4>API Usage (Last 24 Hours)</h4>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{status.stats.apiCalls24h}</div>
              <div className="stat-label">Total API Calls</div>
            </div>

            <div className="stat-card success">
              <div className="stat-value">{status.stats.successCount}</div>
              <div className="stat-label">Successful</div>
            </div>

            <div className="stat-card error">
              <div className="stat-value">{status.stats.errorCount}</div>
              <div className="stat-label">Errors</div>
            </div>

            <div className="stat-card warning">
              <div className="stat-value">{status.stats.rateLimitedCount}</div>
              <div className="stat-label">Rate Limited</div>
            </div>
          </div>

          {/* Error Rate */}
          {status.stats.apiCalls24h > 0 && (
            <div className="error-rate-bar">
              <div className="error-rate-label">
                Error Rate: {status.stats.errorRate.toFixed(1)}%
              </div>
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{
                    width: `${Math.min(status.stats.errorRate, 100)}%`,
                    backgroundColor:
                      status.stats.errorRate > 20
                        ? 'var(--color-error)'
                        : status.stats.errorRate > 10
                        ? 'var(--color-warning)'
                        : 'var(--color-success)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Refresh Button */}
      <div className="status-footer">
        <button onClick={fetchStatus} className="btn-secondary btn-sm">
          <RefreshCw size={16} />
          Refresh Status
        </button>
      </div>
    </div>
  );
}
