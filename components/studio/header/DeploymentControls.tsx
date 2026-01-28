'use client';

/**
 * DeploymentControls Component
 *
 * Phase 8: Versioning & Deployment Lifecycle
 *
 * Provides UI for:
 * - Publishing drafts as new versions
 * - Viewing current live version
 * - Toggling live status (active/inactive)
 * - Opening version history panel
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Rocket,
  History,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Radio,
  Power,
  PowerOff,
  X,
} from 'lucide-react';
import { usePipelineStore } from '@/components/pipelines/store/usePipelineStore';

// ============================================================================
// TYPES
// ============================================================================

interface VersionInfo {
  id: string;
  versionNumber: number;
  name: string;
  changelog?: string | null;
  createdBy: string;
  createdAt: string;
  isLive: boolean;
}

interface DeploymentState {
  currentLiveVersionId: string | null;
  currentLiveVersionNumber: number | null;
  liveStatus: 'active' | 'inactive' | 'archived';
  hasUnpublishedChanges: boolean;
  versions: VersionInfo[];
}

interface DeploymentControlsProps {
  onOpenVersionHistory: () => void;
}

// ============================================================================
// PUBLISH MODAL
// ============================================================================

interface PublishModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPublish: (changelog: string, activate: boolean) => Promise<void>;
  isPublishing: boolean;
  currentVersion: number | null;
}

function PublishModal({
  isOpen,
  onClose,
  onPublish,
  isPublishing,
  currentVersion,
}: PublishModalProps) {
  const [changelog, setChangelog] = useState('');
  const [activate, setActivate] = useState(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onPublish(changelog, activate);
    setChangelog('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card rounded-xl border border-slate-700 shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <Rocket className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Publish Version</h3>
              <p className="text-sm text-muted-foreground">
                {currentVersion
                  ? `Creating v${currentVersion + 1}`
                  : 'Creating v1'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Changelog */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              Changelog (optional)
            </label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg bg-slate-800 border border-slate-600
                text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50
                focus:ring-1 focus:ring-green-500/50 resize-none"
            />
          </div>

          {/* Activate Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <Radio className="w-4 h-4 text-green-400" />
              <div>
                <p className="text-sm font-medium text-white">Activate after publishing</p>
                <p className="text-xs text-muted-foreground">
                  Start accepting triggers immediately
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setActivate(!activate)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                activate ? 'bg-green-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 rounded-full bg-card transition-transform ${
                  activate ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* Warning if not activating */}
          {!activate && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-200/80">
                The workflow will be published but remain inactive. You can activate it
                later from the deployment controls.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPublishing}
              className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
                bg-slate-700 text-gray-300 hover:bg-slate-600
                transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPublishing}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
                bg-green-600 text-white hover:bg-green-500
                transition-colors disabled:opacity-50"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Publish
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function DeploymentControls({ onOpenVersionHistory }: DeploymentControlsProps) {
  const pipelineId = usePipelineStore((s) => s.pipelineId);
  const isDirty = usePipelineStore((s) => s.isDirty);

  const [deploymentState, setDeploymentState] = useState<DeploymentState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch deployment state
  const fetchDeploymentState = useCallback(async () => {
    if (!pipelineId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/versions`, {
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch deployment state');
      }

      const data = await response.json();
      if (data.success) {
        setDeploymentState({
          currentLiveVersionId: data.data.currentLiveVersionId,
          currentLiveVersionNumber: data.data.currentLiveVersionNumber,
          liveStatus: data.data.liveStatus || 'inactive',
          hasUnpublishedChanges: data.data.hasUnpublishedChanges,
          versions: data.data.versions || [],
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch state');
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId]);

  // Fetch on mount and when pipeline changes
  useEffect(() => {
    fetchDeploymentState();
  }, [fetchDeploymentState]);

  // Publish handler
  const handlePublish = useCallback(
    async (changelog: string, activate: boolean) => {
      if (!pipelineId) return;

      setIsPublishing(true);

      try {
        const response = await fetch(`/api/pipelines/${pipelineId}/versions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'demo-user',
          },
          body: JSON.stringify({ changelog, activate }),
        });

        if (!response.ok) {
          throw new Error('Failed to publish');
        }

        // Refresh state
        await fetchDeploymentState();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to publish');
      } finally {
        setIsPublishing(false);
      }
    },
    [pipelineId, fetchDeploymentState]
  );

  // Toggle live status
  const handleToggleStatus = useCallback(
    async (newStatus: 'active' | 'inactive') => {
      if (!pipelineId) return;

      try {
        const response = await fetch(`/api/pipelines/${pipelineId}/versions/status`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'demo-user',
          },
          body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to update status');
        }

        await fetchDeploymentState();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update status');
      } finally {
        setIsStatusDropdownOpen(false);
      }
    },
    [pipelineId, fetchDeploymentState]
  );

  // Don't render if no pipeline
  if (!pipelineId) return null;

  const isLive = deploymentState?.liveStatus === 'active';
  const hasPublishedVersion = !!deploymentState?.currentLiveVersionId;
  const showUnpublishedIndicator = isDirty || deploymentState?.hasUnpublishedChanges;

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Live Status Indicator */}
        {hasPublishedVersion && (
          <div className="relative">
            <button
              onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isLive
                  ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  : 'bg-slate-700/50 text-muted-foreground hover:bg-slate-700'
              }`}
            >
              {isLive ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Live: v{deploymentState.currentLiveVersionNumber}
                </>
              ) : (
                <>
                  <PowerOff className="w-3 h-3" />
                  Inactive: v{deploymentState.currentLiveVersionNumber}
                </>
              )}
              <ChevronDown className="w-3 h-3" />
            </button>

            {/* Status Dropdown */}
            {isStatusDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStatusDropdownOpen(false)}
                />
                <div className="absolute top-full right-0 mt-1 w-48 bg-slate-800 rounded-lg border border-slate-700 shadow-xl z-50 overflow-hidden">
                  <button
                    onClick={() => handleToggleStatus('active')}
                    disabled={isLive}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      isLive
                        ? 'bg-green-500/10 text-green-400 cursor-default'
                        : 'text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    <Power className="w-4 h-4" />
                    Activate
                    {isLive && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                  </button>
                  <button
                    onClick={() => handleToggleStatus('inactive')}
                    disabled={!isLive}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
                      !isLive
                        ? 'bg-slate-700/50 text-muted-foreground cursor-default'
                        : 'text-gray-300 hover:bg-slate-700'
                    }`}
                  >
                    <PowerOff className="w-4 h-4" />
                    Deactivate
                    {!isLive && <CheckCircle2 className="w-4 h-4 ml-auto" />}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Unpublished Changes Indicator */}
        {showUnpublishedIndicator && (
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-xs">
            <AlertTriangle className="w-3 h-3" />
            <span>Unsaved</span>
          </div>
        )}

        {/* Publish Button */}
        <button
          onClick={() => setIsPublishModalOpen(true)}
          disabled={isLoading || isPublishing}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium
            bg-green-600 text-white hover:bg-green-500
            transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPublishing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Rocket className="w-4 h-4" />
          )}
          Publish
        </button>

        {/* Version History Button */}
        <button
          onClick={onOpenVersionHistory}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium
            bg-slate-700 text-gray-300 hover:bg-slate-600
            transition-colors"
        >
          <History className="w-4 h-4" />
          History
        </button>
      </div>

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg bg-red-500/90 text-white shadow-lg">
          <XCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-2 p-1 rounded hover:bg-card/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Publish Modal */}
      <PublishModal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        onPublish={handlePublish}
        isPublishing={isPublishing}
        currentVersion={deploymentState?.currentLiveVersionNumber || null}
      />
    </>
  );
}

export default DeploymentControls;
