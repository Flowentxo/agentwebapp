'use client';

/**
 * DeploymentModal Component
 *
 * Modal for deploying workflows to production.
 * Shows webhook URL, secret, and configuration options.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Rocket,
  Globe,
  Key,
  Copy,
  Check,
  RefreshCw,
  Shield,
  ShieldOff,
  Terminal,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Power,
  PowerOff,
  Eye,
  EyeOff,
} from 'lucide-react';

interface DeploymentData {
  workflowId: string;
  workflowName: string;
  isPublished: boolean;
  webhookSecret: string | null;
  publishedVersion: number | null;
  requireAuth: boolean;
  webhookUrl: string;
  publishedAt: string | null;
  productionExecutionCount: number | null;
  curlExample: string | null;
}

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workflowId: string;
  workflowName: string;
  onDeploymentChange?: (isPublished: boolean) => void;
}

export function DeploymentModal({
  isOpen,
  onClose,
  workflowId,
  workflowName,
  onDeploymentChange,
}: DeploymentModalProps) {
  const [deployment, setDeployment] = useState<DeploymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  // Fetch deployment status
  const fetchDeployment = useCallback(async () => {
    if (!workflowId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/deploy`, {
        headers: {
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deployment status');
      }

      const data = await response.json();
      setDeployment(data.deployment);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    if (isOpen) {
      fetchDeployment();
    }
  }, [isOpen, fetchDeployment]);

  // Copy to clipboard
  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Deploy/Undeploy workflow
  const handleDeploy = async (action: 'deploy' | 'undeploy') => {
    setActionLoading(action);
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }

      await fetchDeployment();
      onDeploymentChange?.(action === 'deploy');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Regenerate webhook secret
  const handleRegenerateSecret = async () => {
    setActionLoading('regenerate');
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
        body: JSON.stringify({ action: 'regenerate-secret' }),
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate secret');
      }

      await fetchDeployment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle require auth
  const handleToggleAuth = async () => {
    if (!deployment) return;

    setActionLoading('auth');
    setError(null);

    try {
      const response = await fetch(`/api/workflows/${workflowId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': localStorage.getItem('userId') || 'demo-user',
        },
        body: JSON.stringify({
          action: 'update-settings',
          requireAuth: !deployment.requireAuth,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      await fetchDeployment();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-card rounded-xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${deployment?.isPublished ? 'bg-green-500/20' : 'bg-muted/500/20'}`}>
                <Rocket className={`w-5 h-5 ${deployment?.isPublished ? 'text-green-400' : 'text-muted-foreground'}`} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Deploy Workflow</h2>
                <p className="text-sm text-muted-foreground">{workflowName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                <div className="flex items-center gap-2 text-red-400">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              </div>
            ) : deployment ? (
              <>
                {/* Status Toggle */}
                <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                  <div className="flex items-center gap-3">
                    {deployment.isPublished ? (
                      <>
                        <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        <span className="text-green-400 font-medium">Active</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 bg-muted/500 rounded-full" />
                        <span className="text-muted-foreground font-medium">Inactive</span>
                      </>
                    )}
                    {deployment.publishedVersion && (
                      <span className="text-xs text-muted-foreground px-2 py-0.5 bg-gray-700 rounded">
                        v{deployment.publishedVersion}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeploy(deployment.isPublished ? 'undeploy' : 'deploy')}
                    disabled={actionLoading !== null}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all
                      ${deployment.isPublished
                        ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                        : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    {actionLoading === 'deploy' || actionLoading === 'undeploy' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : deployment.isPublished ? (
                      <PowerOff size={16} />
                    ) : (
                      <Power size={16} />
                    )}
                    {deployment.isPublished ? 'Unpublish' : 'Publish'}
                  </button>
                </div>

                {deployment.isPublished && (
                  <>
                    {/* Webhook URL */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Globe size={14} />
                        Webhook URL
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg font-mono text-sm text-gray-300 overflow-x-auto">
                          {deployment.webhookUrl}
                        </div>
                        <button
                          onClick={() => copyToClipboard(deployment.webhookUrl, 'url')}
                          className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy URL"
                        >
                          {copied === 'url' ? (
                            <Check size={16} className="text-green-400" />
                          ) : (
                            <Copy size={16} className="text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Webhook Secret */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Key size={14} />
                        Webhook Secret
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex items-center px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                          <span className="font-mono text-sm text-gray-300 flex-1 overflow-x-auto">
                            {showSecret
                              ? deployment.webhookSecret
                              : '••••••••••••••••••••••••••••••••'}
                          </span>
                          <button
                            onClick={() => setShowSecret(!showSecret)}
                            className="ml-2 text-muted-foreground hover:text-gray-300 transition-colors"
                          >
                            {showSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                        <button
                          onClick={() => deployment.webhookSecret && copyToClipboard(deployment.webhookSecret, 'secret')}
                          className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                          title="Copy Secret"
                        >
                          {copied === 'secret' ? (
                            <Check size={16} className="text-green-400" />
                          ) : (
                            <Copy size={16} className="text-muted-foreground" />
                          )}
                        </button>
                        <button
                          onClick={handleRegenerateSecret}
                          disabled={actionLoading === 'regenerate'}
                          className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                          title="Regenerate Secret"
                        >
                          {actionLoading === 'regenerate' ? (
                            <Loader2 size={16} className="text-muted-foreground animate-spin" />
                          ) : (
                            <RefreshCw size={16} className="text-muted-foreground" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use this secret in the X-Webhook-Secret header to authenticate requests.
                      </p>
                    </div>

                    {/* Security Settings */}
                    <div className="p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {deployment.requireAuth ? (
                            <Shield size={20} className="text-blue-400" />
                          ) : (
                            <ShieldOff size={20} className="text-yellow-400" />
                          )}
                          <div>
                            <div className="font-medium text-white">
                              Require Authentication
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {deployment.requireAuth
                                ? 'Webhook secret is required for all requests'
                                : 'Webhook accepts unauthenticated requests'}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleToggleAuth}
                          disabled={actionLoading === 'auth'}
                          className={`
                            relative w-12 h-6 rounded-full transition-colors
                            ${deployment.requireAuth ? 'bg-blue-600' : 'bg-gray-600'}
                            disabled:opacity-50
                          `}
                        >
                          <div
                            className={`
                              absolute top-1 w-4 h-4 bg-card rounded-full transition-transform
                              ${deployment.requireAuth ? 'left-7' : 'left-1'}
                            `}
                          />
                        </button>
                      </div>
                    </div>

                    {/* cURL Example */}
                    <div>
                      <label className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                        <Terminal size={14} />
                        cURL Example
                      </label>
                      <div className="relative">
                        <pre className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg font-mono text-xs text-gray-300 overflow-x-auto whitespace-pre-wrap">
                          {deployment.curlExample || `curl -X POST "${deployment.webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Secret: ${deployment.webhookSecret}" \\
  -d '{"event": "test", "data": {"key": "value"}}'`}
                        </pre>
                        <button
                          onClick={() => copyToClipboard(deployment.curlExample || '', 'curl')}
                          className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                          title="Copy cURL"
                        >
                          {copied === 'curl' ? (
                            <Check size={14} className="text-green-400" />
                          ) : (
                            <Copy size={14} className="text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Stats */}
                    {(deployment.productionExecutionCount || 0) > 0 && (
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-800/30 border border-gray-700">
                        <div>
                          <div className="text-2xl font-bold text-white">
                            {deployment.productionExecutionCount?.toLocaleString()}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Production Executions
                          </div>
                        </div>
                        {deployment.publishedAt && (
                          <div className="ml-auto text-right">
                            <div className="text-sm text-gray-300">
                              Published
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(deployment.publishedAt).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

                {!deployment.isPublished && (
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-start gap-3">
                      <Rocket className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-medium text-blue-300 mb-1">
                          Ready to Deploy
                        </div>
                        <p className="text-sm text-blue-200/80">
                          Click "Publish" to deploy this workflow to production.
                          Once deployed, you'll receive a webhook URL that external
                          services can call to trigger your workflow.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800 bg-card/50">
            <div className="text-xs text-muted-foreground">
              {deployment?.isPublished
                ? 'Changes to the workflow require re-deployment'
                : 'Deploy to enable production webhook'}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-white transition-colors"
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default DeploymentModal;
