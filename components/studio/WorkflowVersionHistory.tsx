'use client';

/**
 * WORKFLOW VERSION HISTORY
 *
 * Displays workflow version timeline with rollback functionality
 *
 * FIXES Applied:
 * - Added timeout for API calls to prevent infinite loading
 * - Added proper error state with retry button
 * - Console logging for debugging
 */

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  History,
  RotateCcw,
  CheckCircle,
  GitBranch,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Timeout for API calls (10 seconds)
const API_TIMEOUT_MS = 10000;

interface WorkflowVersion {
  id: string;
  version: string;
  name: string;
  description: string | null;
  changeDescription: string | null;
  createdBy: string;
  createdAt: string;
  isCurrent: boolean;
}

interface WorkflowVersionHistoryProps {
  workflowId: string;
  currentVersion: string;
  onRollback: (versionId: string) => Promise<void>;
}

export function WorkflowVersionHistory({
  workflowId,
  currentVersion,
  onRollback
}: WorkflowVersionHistoryProps) {
  const [versions, setVersions] = useState<WorkflowVersion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set([versions[0]?.id]));
  const [rollbackingVersion, setRollbackingVersion] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    console.log('[VERSION_HISTORY] Loading versions for workflow:', workflowId);
    setIsLoading(true);
    setError(null);

    try {
      // Add timeout to prevent infinite loading
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
        console.warn('[VERSION_HISTORY] Request timed out after', API_TIMEOUT_MS, 'ms');
      }, API_TIMEOUT_MS);

      try {
        const response = await fetch(`/api/workflows/${workflowId}/versions`, {
          headers: {
            'x-user-id': 'demo-user'
          },
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to load versions`);
        }

        const data = await response.json();
        console.log('[VERSION_HISTORY] Versions loaded:', data.versions?.length ?? 0);
        setVersions(data.versions || []);
        // Auto-expand latest version
        if (data.versions?.[0]) {
          setExpandedVersions(new Set([data.versions[0].id]));
        }
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        throw fetchError;
      }
    } catch (err: any) {
      const errorMessage = err?.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : err?.message || 'Failed to load versions';

      console.error('[VERSION_HISTORY] Error:', err);
      setError(errorMessage);
      setVersions([]);
    } finally {
      setIsLoading(false);
    }
  }, [workflowId]);

  useEffect(() => {
    loadVersions();
  }, [loadVersions]);

  const handleRollback = async (versionId: string) => {
    setRollbackingVersion(versionId);
    try {
      await onRollback(versionId);
      await loadVersions(); // Refresh after rollback
    } catch (error) {
      console.error('[VERSION_HISTORY] Rollback failed:', error);
    } finally {
      setRollbackingVersion(null);
    }
  };

  const toggleExpanded = (versionId: string) => {
    setExpandedVersions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(versionId)) {
        newSet.delete(versionId);
      } else {
        newSet.add(versionId);
      }
      return newSet;
    });
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--accent))]" />
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-400 opacity-70" />
        <h3 className="mt-4 text-sm font-semibold text-text">Failed to Load Versions</h3>
        <p className="mt-2 text-xs text-text-muted">{error}</p>
        <button
          onClick={loadVersions}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[rgb(var(--accent))] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  // Empty State
  if (versions.length === 0) {
    return (
      <div className="rounded-lg border border-white/10 bg-surface-0 p-8 text-center">
        <History className="mx-auto h-12 w-12 text-text-muted opacity-50" />
        <h3 className="mt-4 text-sm font-semibold text-text">No Version History</h3>
        <p className="mt-2 text-xs text-text-muted">
          Publish this workflow to create your first version
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-[rgb(var(--accent))]" />
          <h3 className="text-lg font-bold text-text">Version History</h3>
        </div>
        <span className="text-sm text-text-muted">{versions.length} version{versions.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Version Timeline */}
      <div className="space-y-3">
        {versions.map((version, index) => {
          const isExpanded = expandedVersions.has(version.id);
          const isLatest = index === 0;
          const isRollingBack = rollbackingVersion === version.id;

          return (
            <motion.div
              key={version.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`rounded-lg border bg-surface-0 transition ${
                version.isCurrent
                  ? 'border-[rgb(var(--accent))]/30 bg-[rgb(var(--accent))]/5'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {/* Version Header */}
              <button
                onClick={() => toggleExpanded(version.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  {/* Version Indicator */}
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                      version.isCurrent
                        ? 'bg-[rgb(var(--accent))]/20'
                        : 'bg-card/5'
                    }`}
                  >
                    {version.isCurrent ? (
                      <CheckCircle className="h-5 w-5 text-[rgb(var(--accent))]" />
                    ) : (
                      <GitBranch className="h-5 w-5 text-text-muted" />
                    )}
                  </div>

                  {/* Version Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-text">
                        v{version.version}
                      </span>
                      {isLatest && (
                        <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-medium text-green-400">
                          Latest
                        </span>
                      )}
                      {version.isCurrent && (
                        <span className="rounded-full bg-[rgb(var(--accent))]/20 px-2 py-0.5 text-xs font-medium text-[rgb(var(--accent))]">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                      <div className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {version.createdBy}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expand Icon */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-text-muted" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-text-muted" />
                )}
              </button>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="border-t border-white/10 px-4 pb-4 pt-3">
                  {/* Change Description */}
                  {version.changeDescription && (
                    <div className="mb-4 rounded-lg bg-card/5 p-3">
                      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-muted">
                        Version Notes
                      </h4>
                      <p className="text-sm text-text">{version.changeDescription}</p>
                    </div>
                  )}

                  {/* Rollback Button */}
                  {!version.isCurrent && (
                    <button
                      onClick={() => handleRollback(version.id)}
                      disabled={isRollingBack}
                      className="flex items-center gap-2 rounded-lg border border-white/10 bg-surface-1 px-3 py-1.5 text-sm font-semibold text-text transition hover:border-[rgb(var(--accent))]/30 hover:bg-[rgb(var(--accent))]/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isRollingBack ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Rolling back...
                        </>
                      ) : (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          Rollback to this version
                        </>
                      )}
                    </button>
                  )}

                  {version.isCurrent && (
                    <div className="flex items-center gap-2 text-xs text-[rgb(var(--accent))]">
                      <CheckCircle className="h-3.5 w-3.5" />
                      This is the active version
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Rollback Warning */}
      <div className="flex gap-3 rounded-lg bg-yellow-500/10 p-3">
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-yellow-400" />
        <div className="text-xs text-yellow-300">
          <strong>Rolling back will:</strong>
          <ul className="ml-4 mt-1 list-disc space-y-0.5">
            <li>Restore workflow to the selected version</li>
            <li>Create a new version entry for this rollback</li>
            <li>Update all active executions to use the restored workflow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
