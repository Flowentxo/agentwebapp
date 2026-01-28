'use client';

/**
 * VersionHistory Component
 *
 * Phase 8: Versioning & Deployment Lifecycle
 *
 * Provides a slide-out panel showing:
 * - List of all published versions
 * - Current live version indicator
 * - Restore to draft functionality
 * - Rollback to version functionality
 * - Version preview (read-only)
 */

import { useState, useCallback, useEffect } from 'react';
import {
  X,
  History,
  ChevronRight,
  RotateCcw,
  Eye,
  Radio,
  Clock,
  User,
  GitBranch,
  GitCommit,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ArrowUpCircle,
} from 'lucide-react';
import { usePipelineStore } from '@/components/pipelines/store/usePipelineStore';

// ============================================================================
// TYPES
// ============================================================================

interface VersionInfo {
  id: string;
  versionNumber: number;
  name: string;
  description?: string | null;
  changelog?: string | null;
  createdBy: string;
  createdAt: string;
  isLive: boolean;
  nodeCount: number;
  edgeCount: number;
}

interface VersionHistoryProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// VERSION CARD
// ============================================================================

interface VersionCardProps {
  version: VersionInfo;
  isExpanded: boolean;
  onToggle: () => void;
  onRestore: () => void;
  onRollback: () => void;
  onPreview: () => void;
  isRestoring: boolean;
  isRollingBack: boolean;
}

function VersionCard({
  version,
  isExpanded,
  onToggle,
  onRestore,
  onRollback,
  onPreview,
  isRestoring,
  isRollingBack,
}: VersionCardProps) {
  const createdDate = new Date(version.createdAt);
  const formattedDate = createdDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const formattedTime = createdDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`rounded-lg border transition-all ${
        version.isLive
          ? 'border-green-500/50 bg-green-500/5'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
      }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-3">
          {/* Version Number */}
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-lg font-mono font-bold text-lg ${
              version.isLive
                ? 'bg-green-500/20 text-green-400'
                : 'bg-slate-700 text-gray-300'
            }`}
          >
            v{version.versionNumber}
          </div>

          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">
                {version.changelog || `Version ${version.versionNumber}`}
              </span>
              {version.isLive && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-[10px] font-medium">
                  <Radio className="w-3 h-3" />
                  LIVE
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate} at {formattedTime}
              </span>
              <span className="flex items-center gap-1">
                <GitCommit className="w-3 h-3" />
                {version.nodeCount} nodes
              </span>
            </div>
          </div>
        </div>

        <ChevronRight
          className={`w-5 h-5 text-muted-foreground transition-transform ${
            isExpanded ? 'rotate-90' : ''
          }`}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-slate-700/50 mt-2 pt-3 space-y-3">
          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">By:</span>
              <span className="text-gray-300 truncate">{version.createdBy}</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-800">
              <GitBranch className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Edges:</span>
              <span className="text-gray-300">{version.edgeCount}</span>
            </div>
          </div>

          {/* Description */}
          {version.description && (
            <p className="text-xs text-muted-foreground p-2 rounded bg-slate-800/50">
              {version.description}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {/* Preview */}
            <button
              onClick={onPreview}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs font-medium bg-slate-700 text-gray-300 hover:bg-slate-600
                transition-colors"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview
            </button>

            {/* Restore to Draft */}
            <button
              onClick={onRestore}
              disabled={isRestoring}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                text-xs font-medium bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30
                transition-colors disabled:opacity-50"
            >
              {isRestoring ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RotateCcw className="w-3.5 h-3.5" />
              )}
              Restore
            </button>

            {/* Rollback (make this version live) */}
            {!version.isLive && (
              <button
                onClick={onRollback}
                disabled={isRollingBack}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                  text-xs font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30
                  transition-colors disabled:opacity-50"
              >
                {isRollingBack ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ArrowUpCircle className="w-3.5 h-3.5" />
                )}
                Rollback
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VersionHistory({ isOpen, onClose }: VersionHistoryProps) {
  const pipelineId = usePipelineStore((s) => s.pipelineId);
  const loadPipeline = usePipelineStore((s) => s.loadPipeline);

  const [versions, setVersions] = useState<VersionInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [rollingBackVersionId, setRollingBackVersionId] = useState<string | null>(null);

  // Fetch versions
  const fetchVersions = useCallback(async () => {
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
        throw new Error('Failed to fetch versions');
      }

      const data = await response.json();
      if (data.success) {
        setVersions(data.data.versions || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch versions');
    } finally {
      setIsLoading(false);
    }
  }, [pipelineId]);

  // Fetch on open
  useEffect(() => {
    if (isOpen) {
      fetchVersions();
    }
  }, [isOpen, fetchVersions]);

  // Restore version to draft
  const handleRestore = useCallback(
    async (versionId: string) => {
      if (!pipelineId) return;

      setRestoringVersionId(versionId);

      try {
        const response = await fetch(`/api/pipelines/${pipelineId}/versions/restore`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'demo-user',
          },
          body: JSON.stringify({ versionId }),
        });

        if (!response.ok) {
          throw new Error('Failed to restore version');
        }

        // Reload the pipeline in the editor
        const pipelineResponse = await fetch(`/api/pipelines/${pipelineId}`, {
          headers: { 'x-user-id': 'demo-user' },
        });

        if (pipelineResponse.ok) {
          const pipelineData = await pipelineResponse.json();
          if (pipelineData.success && pipelineData.data) {
            loadPipeline(
              pipelineData.data.id,
              pipelineData.data.nodes || [],
              pipelineData.data.edges || [],
              pipelineData.data.name,
              pipelineData.data.viewport
            );
          }
        }

        // Close panel after restore
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to restore version');
      } finally {
        setRestoringVersionId(null);
      }
    },
    [pipelineId, loadPipeline, onClose]
  );

  // Rollback to version (make it live)
  const handleRollback = useCallback(
    async (versionId: string) => {
      if (!pipelineId) return;

      setRollingBackVersionId(versionId);

      try {
        const response = await fetch(`/api/pipelines/${pipelineId}/versions/rollback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': 'demo-user',
          },
          body: JSON.stringify({
            versionId,
            reason: 'Rollback via version history panel',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to rollback to version');
        }

        // Refresh versions
        await fetchVersions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to rollback');
      } finally {
        setRollingBackVersionId(null);
      }
    },
    [pipelineId, fetchVersions]
  );

  // Preview version (read-only)
  const handlePreview = useCallback((versionId: string) => {
    // TODO: Implement preview modal or read-only canvas view
    console.log('Preview version:', versionId);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-96 bg-card border-l border-slate-700 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
              <History className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Version History</h3>
              <p className="text-sm text-muted-foreground">
                {versions.length} version{versions.length !== 1 ? 's' : ''}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Loading State */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading versions...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-400">Error</p>
                <p className="text-xs text-red-300/80">{error}</p>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && versions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                <GitBranch className="w-8 h-8 text-muted-foreground" />
              </div>
              <h4 className="text-sm font-medium text-gray-300 mb-1">
                No versions yet
              </h4>
              <p className="text-xs text-muted-foreground max-w-[200px]">
                Publish your workflow to create the first version.
              </p>
            </div>
          )}

          {/* Version List */}
          {!isLoading &&
            versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                isExpanded={expandedVersionId === version.id}
                onToggle={() =>
                  setExpandedVersionId(
                    expandedVersionId === version.id ? null : version.id
                  )
                }
                onRestore={() => handleRestore(version.id)}
                onRollback={() => handleRollback(version.id)}
                onPreview={() => handlePreview(version.id)}
                isRestoring={restoringVersionId === version.id}
                isRollingBack={rollingBackVersionId === version.id}
              />
            ))}
        </div>

        {/* Footer Legend */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex flex-wrap gap-4 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <RotateCcw className="w-3 h-3" />
              <span>Restore = Load to editor</span>
            </div>
            <div className="flex items-center gap-1">
              <ArrowUpCircle className="w-3 h-3" />
              <span>Rollback = Make live</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default VersionHistory;
