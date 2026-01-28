/**
 * WEBHOOK TRIGGER COMPONENT
 *
 * Configuration UI for webhook triggers in workflows
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, Send, Activity, AlertCircle } from 'lucide-react';

interface WebhookConfig {
  id: string;
  workflowId: string;
  enabled: boolean;
  allowedIps: string[];
  rateLimitPerMinute: number;
  description?: string;
  lastTriggeredAt?: Date;
  totalTriggers: number;
  webhookUrl?: string;
}

interface WebhookTriggerProps {
  workflowId: string;
  onConfigChange?: (config: WebhookConfig | null) => void;
}

export function WebhookTrigger({ workflowId, onConfigChange }: WebhookTriggerProps) {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [hasWebhook, setHasWebhook] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchWebhookConfig();
  }, [workflowId]);

  const fetchWebhookConfig = async () => {
    try {
      setIsLoading(true);

      const response = await fetch(`/api/webhooks/config?workflowId=${workflowId}`, {
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (response.status === 404) {
        setHasWebhook(false);
        setConfig(null);
        return;
      }

      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
        setWebhookUrl(data.config.webhookUrl);
        setHasWebhook(true);

        // Fetch stats
        await fetchStats();
      }
    } catch (error) {
      console.error('[WEBHOOK_TRIGGER] Error fetching config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`/api/webhooks/logs?workflowId=${workflowId}&limit=5`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('[WEBHOOK_TRIGGER] Error fetching stats:', error);
    }
  };

  const handleCreateWebhook = async () => {
    try {
      setIsCreating(true);

      const response = await fetch('/api/webhooks/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          workflowId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConfig(data.config);
        setSecret(data.secret);
        setWebhookUrl(data.webhookUrl);
        setHasWebhook(true);
        setShowSecret(true);

        if (onConfigChange) {
          onConfigChange(data.config);
        }
      } else {
        alert(`Failed to create webhook: ${data.message}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  const handleRegenerateSecret = async () => {
    if (!confirm('⚠️ This will invalidate the old webhook URL. Continue?')) {
      return;
    }

    try {
      setIsRegenerating(true);

      const response = await fetch('/api/webhooks/regenerate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          workflowId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSecret(data.secret);
        setWebhookUrl(data.webhookUrl);
        setShowSecret(true);
      } else {
        alert(`Failed to regenerate secret: ${data.message}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCopyUrl = () => {
    if (webhookUrl) {
      navigator.clipboard.writeText(secret || webhookUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleTestWebhook = async () => {
    try {
      setIsTesting(true);

      const testPayload = {
        test: true,
        message: 'Test webhook request from UI',
        timestamp: new Date().toISOString(),
      };

      const fullUrl = webhookUrl?.replace('****', secret || '');

      if (!fullUrl) {
        alert('No webhook URL available');
        return;
      }

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload),
      });

      const data = await response.json();

      if (data.success) {
        alert(`✅ Test successful!\nExecution ID: ${data.executionId}`);
        await fetchStats(); // Refresh stats
      } else {
        alert(`❌ Test failed: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="webhook-trigger-loading">
        <div className="spinner" />
        <p>Loading webhook configuration...</p>
      </div>
    );
  }

  return (
    <div className="webhook-trigger-container">
      <div className="webhook-trigger-header">
        <div className="header-icon">🔗</div>
        <div>
          <h3>Webhook Trigger</h3>
          <p>External API call starts workflow</p>
        </div>
      </div>

      {!hasWebhook ? (
        <div className="webhook-not-configured">
          <p>No webhook configured for this workflow.</p>
          <button onClick={handleCreateWebhook} disabled={isCreating} className="btn-primary">
            {isCreating ? 'Creating...' : 'Create Webhook'}
          </button>
        </div>
      ) : (
        <div className="webhook-configured">
          {/* Webhook URL */}
          <div className="webhook-url-section">
            <label>Webhook URL:</label>
            <div className="url-input-group">
              <input
                type="text"
                value={showSecret && secret ? webhookUrl : webhookUrl?.replace(/\/[^/]+$/, '/****')}
                readOnly
                className="webhook-url-input"
              />
              <button
                onClick={handleCopyUrl}
                className="btn-icon"
                title="Copy to clipboard"
              >
                <Copy size={16} />
                {copied && <span className="copied-tooltip">Copied!</span>}
              </button>
            </div>
            {showSecret && secret && (
              <div className="secret-warning">
                ⚠️ This secret will not be shown again. Save it now!
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="webhook-actions">
            <button
              onClick={handleRegenerateSecret}
              disabled={isRegenerating}
              className="btn-secondary btn-sm"
              title="Regenerate secret (invalidates old URL)"
            >
              <RefreshCw size={16} />
              {isRegenerating ? 'Regenerating...' : 'Regenerate'}
            </button>

            <button
              onClick={handleTestWebhook}
              disabled={isTesting || !secret}
              className="btn-secondary btn-sm"
              title="Send test request"
            >
              <Send size={16} />
              {isTesting ? 'Testing...' : 'Send Test'}
            </button>
          </div>

          {/* Stats */}
          {stats && (
            <div className="webhook-stats">
              <h4>Recent Calls (last 24h)</h4>
              <div className="stats-grid">
                <div className="stat">
                  <div className="stat-value">{stats.totalRequests}</div>
                  <div className="stat-label">Total</div>
                </div>
                <div className="stat success">
                  <div className="stat-value">{stats.successCount}</div>
                  <div className="stat-label">Success</div>
                </div>
                <div className="stat error">
                  <div className="stat-value">{stats.failedCount}</div>
                  <div className="stat-label">Failed</div>
                </div>
                <div className="stat warning">
                  <div className="stat-value">{Math.round(stats.successRate)}%</div>
                  <div className="stat-label">Success Rate</div>
                </div>
              </div>
            </div>
          )}

          {/* Info */}
          <div className="webhook-info">
            <Activity size={16} />
            <span>
              Last triggered: {config?.lastTriggeredAt ? new Date(config.lastTriggeredAt).toLocaleString() : 'Never'}
            </span>
          </div>

          <div className="webhook-info">
            <AlertCircle size={16} />
            <span>Rate Limit: {config?.rateLimitPerMinute || 100} requests/minute</span>
          </div>
        </div>
      )}
    </div>
  );
}
