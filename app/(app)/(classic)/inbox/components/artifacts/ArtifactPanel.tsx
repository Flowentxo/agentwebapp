'use client';

/**
 * ArtifactPanel - Split-view panel for viewing and editing artifacts
 * Slides in from the right side when an artifact is opened
 *
 * Now uses React Query for lazy loading artifact content
 */

import React, { useEffect, useState, useMemo } from 'react';
import {
  X,
  Save,
  Download,
  RotateCcw,
  FileCode,
  FileText,
  Mail,
  Table,
  Maximize2,
  Minimize2,
  Loader2,
  AlertTriangle,
  FileJson,
  FileType,
} from 'lucide-react';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import { useArtifact, useUpdateArtifact } from '@/lib/hooks/useInbox';
import { CodeViewer } from './viewers/CodeViewer';
import { DocumentViewer } from './viewers/DocumentViewer';
import type { ArtifactType } from '@/types/inbox';

interface ArtifactPanelProps {
  isMobile?: boolean;
}

// Icon mapping
const artifactIcons: Record<ArtifactType, React.ElementType> = {
  code: FileCode,
  markdown: FileText,
  email_draft: Mail,
  data_table: Table,
  json: FileJson,
  html: FileType,
};

export function ArtifactPanel({ isMobile = false }: ArtifactPanelProps) {
  const {
    activeArtifactId,
    isArtifactPanelOpen,
    closeArtifact,
    setActiveArtifact,
  } = useInboxStore();

  // Lazy load artifact content using React Query
  const {
    data: artifact,
    isLoading,
    isError,
    error,
    refetch,
  } = useArtifact(activeArtifactId);

  // Update artifact mutation
  const updateArtifactMutation = useUpdateArtifact();

  // Local state for editing
  const [localContent, setLocalContent] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync local content when artifact loads
  useEffect(() => {
    if (artifact) {
      setLocalContent(artifact.content);
      setHasChanges(false);
      // Update the store with the full artifact data
      setActiveArtifact(artifact);
    }
  }, [artifact, setActiveArtifact]);

  // Handle content changes
  const handleContentChange = (newContent: string) => {
    setLocalContent(newContent);
    setHasChanges(newContent !== artifact?.content);
  };

  // Save changes using mutation
  const handleSave = async () => {
    if (!hasChanges || !artifact) return;

    await updateArtifactMutation.mutateAsync({
      artifactId: artifact.id,
      data: { content: localContent },
    });

    setHasChanges(false);
  };

  // Revert changes
  const handleRevert = () => {
    if (artifact) {
      setLocalContent(artifact.content);
      setHasChanges(false);
    }
  };

  // Download artifact
  const handleDownload = () => {
    if (!artifact) return;

    const blob = new Blob([localContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.title || 'artifact.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isArtifactPanelOpen) {
        if (isFullscreen) {
          setIsFullscreen(false);
        } else {
          closeArtifact();
        }
      }
      // Save with Cmd/Ctrl + S
      if ((e.metaKey || e.ctrlKey) && e.key === 's' && isArtifactPanelOpen && hasChanges) {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isArtifactPanelOpen, isFullscreen, closeArtifact, hasChanges]);

  // Don't render if panel not open or no artifact ID
  if (!activeArtifactId || !isArtifactPanelOpen) return null;

  // Get icon (use FileCode as fallback during loading)
  const Icon = artifact ? (artifactIcons[artifact.type] || FileCode) : FileCode;
  const isSaving = updateArtifactMutation.isPending;

  // Render viewer based on artifact type
  const renderViewer = () => {
    if (!artifact) return null;

    switch (artifact.type) {
      case 'code':
        return (
          <CodeViewer
            content={localContent}
            language={artifact.language}
            onChange={handleContentChange}
            readOnly={false}
          />
        );
      case 'markdown':
      case 'email_draft':
        return (
          <DocumentViewer
            content={localContent}
            type={artifact.type}
            onChange={handleContentChange}
            readOnly={false}
          />
        );
      case 'data_table':
      case 'json':
        return (
          <CodeViewer
            content={localContent}
            language="json"
            onChange={handleContentChange}
            readOnly={false}
          />
        );
      case 'html':
        return (
          <CodeViewer
            content={localContent}
            language="html"
            onChange={handleContentChange}
            readOnly={false}
          />
        );
      default:
        return (
          <div className="flex items-center justify-center h-full text-white/40">
            Unsupported artifact type: {artifact.type}
          </div>
        );
    }
  };

  // Loading state
  const renderLoading = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
      <p className="text-sm text-zinc-500">Loading artifact...</p>
    </div>
  );

  // Error state
  const renderError = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20">
        <AlertTriangle className="w-8 h-8 text-red-400" />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-zinc-100 mb-2">
          Failed to load artifact
        </h3>
        <p className="text-sm text-zinc-500 max-w-xs mb-4">
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </p>
      </div>
      <button
        onClick={() => refetch()}
        className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium rounded-lg transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  // Mobile: Full screen overlay
  if (isMobile) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col animate-in slide-in-from-bottom duration-300" style={{ backgroundColor: 'var(--vicy-bg)' }}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={closeArtifact}
              className="p-2 -ml-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-2 min-w-0">
              {isLoading ? (
                <Loader2 size={18} className="flex-shrink-0 text-violet-400 animate-spin" />
              ) : (
                <Icon size={18} className="flex-shrink-0 text-violet-400" />
              )}
              <h3 className="font-medium text-white truncate">
                {artifact?.title || 'Loading...'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {hasChanges && (
              <button
                onClick={handleRevert}
                className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.04] transition-colors"
                title="Revert changes"
              >
                <RotateCcw size={18} />
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`p-2 rounded-lg transition-colors ${
                hasChanges
                  ? 'text-violet-400 hover:bg-violet-500/10'
                  : 'text-white/30 cursor-not-allowed'
              }`}
              title="Save changes"
            >
              {isSaving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && renderLoading()}
          {isError && !isLoading && renderError()}
          {artifact && !isLoading && !isError && renderViewer()}
        </div>

        {/* Mobile Footer */}
        {hasChanges && (
          <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20">
            <p className="text-sm text-amber-400 text-center">
              You have unsaved changes
            </p>
          </div>
        )}
      </div>
    );
  }

  // Desktop: Slide-in panel
  return (
    <div
      className={`flex flex-col bg-[#111] border-l border-white/[0.06] transition-all duration-300 ease-out ${
        isFullscreen
          ? 'fixed inset-0 z-50 border-l-0'
          : 'relative'
      }`}
      style={{
        boxShadow: '-8px 0 32px -8px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-violet-500/20"
          >
            {isLoading ? (
              <Loader2 size={16} className="text-violet-400 animate-spin" />
            ) : (
              <Icon size={16} className="text-violet-400" />
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-white truncate">
              {artifact?.title || 'Loading...'}
            </h3>
            <p className="text-xs text-white/40">
              {artifact ? (
                <>
                  {artifact.language || artifact.type} • v{artifact.version}
                  {hasChanges && (
                    <span className="text-amber-400 ml-2">• Modified</span>
                  )}
                </>
              ) : (
                'Fetching content...'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {hasChanges && (
            <button
              onClick={handleRevert}
              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
              title="Revert changes"
            >
              <RotateCcw size={16} />
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={!artifact}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Download"
          >
            <Download size={16} />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={closeArtifact}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.04] transition-colors"
            title="Close panel"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {isLoading && renderLoading()}
        {isError && !isLoading && renderError()}
        {artifact && !isLoading && !isError && renderViewer()}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-t border-white/10">
        <div className="text-xs text-white/40">
          Press <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">Esc</kbd> to close
          {' • '}
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono">Cmd+S</kbd> to save
        </div>

        <button
          onClick={handleSave}
          disabled={!hasChanges || isSaving || !artifact}
          className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            hasChanges && artifact
              ? 'bg-violet-500 hover:bg-violet-400 text-white'
              : 'bg-white/[0.04] text-white/30 cursor-not-allowed'
          }`}
        >
          {isSaving && <Loader2 size={14} className="animate-spin" />}
          {isSaving ? 'Saving...' : hasChanges ? 'Save Changes' : 'No Changes'}
        </button>
      </div>
    </div>
  );
}
