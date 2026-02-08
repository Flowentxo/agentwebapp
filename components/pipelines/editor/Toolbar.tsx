'use client';

/**
 * PIPELINE TOOLBAR — Floating Pill
 *
 * Glassmorphism pill that floats over the canvas.
 * Compact icon-only buttons; extra actions moved to More menu.
 */

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Play,
  Pause,
  Square,
  Save,
  ChevronLeft,
  MoreHorizontal,
  Undo2,
  Redo2,
  Settings,
  Download,
  Upload,
  Trash2,
  Copy,
  Eye,
  Loader2,
  Check,
  RotateCcw,
  LayoutTemplate,
  Wand2,
  Activity,
} from 'lucide-react';
import { usePipelineStore } from '../store/usePipelineStore';
import { useExecutionSocket } from '../hooks/useExecutionSocket';
import { AIGeneratorModal } from './AIGeneratorModal';

// ============================================
// TOOLBAR COMPONENT
// ============================================

export function PipelineToolbar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { subscribe } = useExecutionSocket();

  const {
    pipelineId,
    pipelineName,
    setPipelineName,
    setPipelineId,
    isDirty,
    isSaving,
    setSaving,
    markSaved,
    nodes,
    edges,
    viewport,
    lastSavedAt,
    isRunning: isExecuting,
    startExecution,
    resetExecution,
    setTemplateDialogOpen,
    // Control Mode UI
    showExecutionPanel,
    isPaused,
    setShowExecutionPanel,
    setIsPaused,
  } = usePipelineStore();

  const [isRunning, setIsRunning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  const getUserId = () => 'demo-user';

  // Handle Run Pipeline
  const handleRun = async () => {
    const currentPipelineId = pipelineId || searchParams.get('id');

    if (!currentPipelineId) {
      toast.error('Please save the pipeline first', {
        description: 'You need to save the pipeline before running it.',
      });
      return;
    }

    if (isDirty) {
      toast.warning('You have unsaved changes', {
        description: 'Consider saving before running to ensure the latest version is executed.',
      });
    }

    resetExecution();
    setIsRunning(true);

    try {
      const response = await fetch(`/api/pipelines/${currentPipelineId}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getUserId(),
        },
        body: JSON.stringify({
          triggerData: {
            source: 'manual',
            timestamp: new Date().toISOString(),
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      if (data.executionId) {
        subscribe(data.executionId);
        startExecution(data.executionId);
      }

      toast.success('Pipeline started!', {
        description: `Execution ID: ${data.executionId?.slice(0, 8)}...`,
      });

      console.log('[PIPELINE] Execution started:', data);
    } catch (error) {
      console.error('[PIPELINE] Run failed:', error);
      toast.error('Failed to run pipeline', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setIsRunning(false);
    }
  };

  // Handle Stop Pipeline
  const handleStop = async () => {
    const currentPipelineId = pipelineId || searchParams.get('id');
    const currentExecutionId = usePipelineStore.getState().executionId;

    if (!currentExecutionId) {
      toast.error('No active execution to stop');
      return;
    }

    try {
      const response = await fetch(`/api/pipelines/${currentPipelineId}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getUserId(),
        },
        body: JSON.stringify({
          executionId: currentExecutionId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to stop execution');
      }

      resetExecution();
      setIsRunning(false);
      setIsPaused(false);
      setShowExecutionPanel(false);
      toast.success('Pipeline stopped', {
        description: 'Execution has been terminated.',
      });
    } catch (error) {
      console.error('[PIPELINE] Stop failed:', error);
      toast.error('Failed to stop pipeline', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Handle Pause Pipeline
  const handlePause = async () => {
    const currentPipelineId = pipelineId || searchParams.get('id');
    const currentExecutionId = usePipelineStore.getState().executionId;

    if (!currentExecutionId) {
      toast.error('No active execution to pause');
      return;
    }

    try {
      const response = await fetch(`/api/pipelines/${currentPipelineId}/pause`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': getUserId(),
        },
        body: JSON.stringify({
          executionId: currentExecutionId,
          paused: !isPaused,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to pause execution');
      }

      const newPausedState = !isPaused;
      setIsPaused(newPausedState);
      toast.success(newPausedState ? 'Pipeline paused' : 'Pipeline resumed', {
        description: newPausedState
          ? 'Execution is paused. Click again to resume.'
          : 'Execution will continue.',
      });
    } catch (error) {
      console.error('[PIPELINE] Pause failed:', error);
      toast.error('Failed to pause pipeline', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  // Toggle Live Execution Panel
  const handleToggleExecutionPanel = () => {
    setShowExecutionPanel(!showExecutionPanel);
  };

  // Auto-show execution panel when execution starts
  const handleRunWithPanel = async () => {
    setShowExecutionPanel(true);
    await handleRun();
  };

  // Handle Reset Execution
  const handleResetExecution = () => {
    resetExecution();
    setIsRunning(false);
    setIsPaused(false);
    toast.info('Execution state cleared');
    setShowMenu(false);
  };

  // Handle Save Pipeline
  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const currentPipelineId = pipelineId || searchParams.get('id');

      if (currentPipelineId) {
        const response = await fetch(`/api/pipelines/${currentPipelineId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': getUserId(),
          },
          body: JSON.stringify({
            name: pipelineName,
            nodes,
            edges,
            viewport,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to update pipeline');
        }

        const data = await response.json();
        markSaved();
        toast.success('Pipeline saved!', {
          description: `Last saved at ${new Date().toLocaleTimeString()}`,
        });
        console.log('[PIPELINE] Updated:', data.pipeline.id);
      } else {
        const response = await fetch('/api/pipelines', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': getUserId(),
          },
          body: JSON.stringify({
            name: pipelineName,
            nodes,
            edges,
            viewport,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to create pipeline');
        }

        const data = await response.json();
        const newId = data.pipeline.id;

        setPipelineId(newId);

        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set('id', newId);
        window.history.replaceState({}, '', newUrl.toString());

        markSaved();
        toast.success('Pipeline created!', {
          description: 'Your workflow has been saved.',
        });
        console.log('[PIPELINE] Created:', newId);
      }
    } catch (error) {
      console.error('[PIPELINE] Save failed:', error);
      toast.error('Failed to save pipeline', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
      setSaving(false);
    }
  }, [pipelineId, pipelineName, nodes, edges, viewport, searchParams, setSaving, markSaved, setPipelineId]);

  // Handle Back Navigation
  const handleBack = () => {
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      );
      if (!confirmed) return;
    }
    window.close();
    router.push('/pipelines');
  };

  // Handle Export JSON
  const handleExport = () => {
    const data = {
      name: pipelineName,
      nodes,
      edges,
      viewport,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${pipelineName.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Pipeline exported!');
    setShowMenu(false);
  };

  // Handle Import JSON
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);

        if (data.nodes && data.edges) {
          usePipelineStore.getState().loadPipeline(
            null,
            data.nodes,
            data.edges,
            data.name || 'Imported Pipeline',
            data.viewport
          );
          toast.success('Pipeline imported!');
        } else {
          throw new Error('Invalid pipeline format');
        }
      } catch (error) {
        toast.error('Failed to import pipeline', {
          description: 'Invalid file format',
        });
      }
    };
    input.click();
    setShowMenu(false);
  };

  // Handle Delete
  const handleDelete = async () => {
    if (!pipelineId) {
      usePipelineStore.getState().clearPipeline();
      toast.success('Pipeline cleared');
      setShowMenu(false);
      return;
    }

    const confirmed = window.confirm(
      'Are you sure you want to delete this pipeline? This action cannot be undone.'
    );
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/pipelines/${pipelineId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': getUserId(),
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      toast.success('Pipeline deleted');
      usePipelineStore.getState().clearPipeline();
      window.close();
      router.push('/pipelines');
    } catch (error) {
      toast.error('Failed to delete pipeline');
    }
    setShowMenu(false);
  };

  // Save button tooltip
  const getSaveTooltip = () => {
    if (isSaving) return 'Saving...';
    if (!isDirty && lastSavedAt) return `Saved ${formatLastSaved()}`;
    return 'Save (Ctrl+S)';
  };

  const formatLastSaved = () => {
    if (!lastSavedAt) return null;
    const diff = Date.now() - lastSavedAt.getTime();
    if (diff < 60000) return 'just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSavedAt.toLocaleTimeString();
  };

  const hasExecutionState = Object.keys(usePipelineStore.getState().nodeStatus).length > 0;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
      <div
        className="flex items-center gap-1.5 px-3 py-2 rounded-2xl"
        style={{
          backgroundColor: 'rgba(17, 17, 17, 0.9)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Back */}
        <button
          onClick={handleBack}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors"
          title="Back to Pipelines"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Pipeline Name */}
        {isEditing ? (
          <input
            type="text"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            autoFocus
            className="bg-transparent text-white font-medium text-sm px-2 py-1 border border-violet-500 rounded focus:outline-none max-w-[140px]"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 group max-w-[140px]"
          >
            <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors truncate">
              {pipelineName}
            </span>
            {isDirty && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" title="Unsaved changes" />
            )}
          </button>
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-white/10" />

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors disabled:opacity-50
            ${isDirty
              ? 'text-violet-400 hover:bg-violet-500/20'
              : 'text-white/40 hover:text-white/60 hover:bg-white/5'
            }`}
          title={getSaveTooltip()}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : !isDirty && lastSavedAt ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </button>

        {/* Magic (AI Generator) */}
        <button
          onClick={() => setShowAIGenerator(true)}
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 hover:text-violet-300 transition-colors"
          title="Generate with AI"
        >
          <Wand2 className="w-4 h-4" />
        </button>

        {/* Execution Controls */}
        {isExecuting ? (
          <>
            {/* Pause Button */}
            <button
              onClick={handlePause}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                ${isPaused
                  ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                }`}
              title={isPaused ? 'Resume Execution' : 'Pause Execution'}
            >
              {isPaused ? (
                <Play className="w-4 h-4" />
              ) : (
                <Pause className="w-4 h-4" />
              )}
            </button>

            {/* Stop Button */}
            <button
              onClick={handleStop}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 hover:text-red-300 transition-colors"
              title="Stop Execution"
            >
              <Square className="w-4 h-4" />
            </button>

            {/* Live Logs Toggle */}
            <button
              onClick={handleToggleExecutionPanel}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
                ${showExecutionPanel
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
                }`}
              title={showExecutionPanel ? 'Hide Live Logs' : 'Show Live Logs'}
            >
              <Activity className="w-4 h-4" />
            </button>
          </>
        ) : (
          /* Run Button */
          <button
            onClick={handleRunWithPanel}
            disabled={isRunning || nodes.length === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 transition-colors disabled:opacity-40"
            title={isRunning ? 'Starting...' : 'Run Pipeline'}
          >
            {isRunning ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
        )}

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div
                className="absolute right-0 top-full mt-2 w-48 rounded-xl overflow-hidden z-20"
                style={{
                  backgroundColor: 'rgba(17, 17, 17, 0.95)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                }}
              >
                {/* Templates */}
                <button
                  onClick={() => {
                    setTemplateDialogOpen(true);
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <LayoutTemplate className="w-4 h-4" />
                  Templates
                </button>
                {/* Preview */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
                {/* Undo / Redo */}
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/40 cursor-not-allowed"
                  disabled
                >
                  <Undo2 className="w-4 h-4" />
                  Undo
                </button>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/40 cursor-not-allowed"
                  disabled
                >
                  <Redo2 className="w-4 h-4" />
                  Redo
                </button>
                <hr className="border-white/[0.06]" />
                {/* Export / Import */}
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import JSON
                </button>
                {/* Duplicate */}
                <button
                  onClick={() => {
                    usePipelineStore.getState().setPipelineId(null);
                    usePipelineStore.getState().setPipelineName(`${pipelineName} (Copy)`);
                    usePipelineStore.getState().setDirty(true);
                    toast.info('Pipeline duplicated - save to create a copy');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                {/* Reset Execution */}
                {!isExecuting && hasExecutionState && (
                  <button
                    onClick={handleResetExecution}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Reset Execution
                  </button>
                )}
                <hr className="border-white/[0.06]" />
                {/* Settings */}
                <button className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                {/* Delete */}
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Pipeline
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
      />
    </div>
  );
}
