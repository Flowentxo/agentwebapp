'use client';

/**
 * PIPELINE TOOLBAR
 *
 * IMPORTANT: This component should ONLY contain buttons that trigger store actions.
 * Modal/Dialog rendering is handled at the ROOT level (PipelineEditorPage).
 *
 * Template Gallery: Uses `setTemplateDialogOpen(true)` - rendered via Portal at root
 * AI Generator: Rendered here temporarily (should also be moved to root)
 */

import { useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  Play,
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
  Cloud,
  CloudOff,
  RotateCcw,
  LayoutTemplate,
  Wand2,
} from 'lucide-react';
import { usePipelineStore } from '../store/usePipelineStore';
import { useExecutionSocket } from '../hooks/useExecutionSocket';
// REMOVED: TemplateGallery import - now rendered at root level via Portal
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
    // Execution state
    isRunning: isExecuting,
    startExecution,
    resetExecution,
    // Template Dialog - controlled via store
    setTemplateDialogOpen,
  } = usePipelineStore();

  const [isRunning, setIsRunning] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  // REMOVED: const [showTemplates, setShowTemplates] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Get user ID from headers (in real app, this would come from auth context)
  const getUserId = () => {
    // For demo purposes, return a consistent demo user ID
    return 'demo-user';
  };

  // Handle Run Pipeline
  const handleRun = async () => {
    const currentPipelineId = pipelineId || searchParams.get('id');

    if (!currentPipelineId) {
      toast.error('Please save the pipeline first', {
        description: 'You need to save the pipeline before running it.',
      });
      return;
    }

    // Warn if there are unsaved changes
    if (isDirty) {
      toast.warning('You have unsaved changes', {
        description: 'Consider saving before running to ensure the latest version is executed.',
      });
    }

    // Reset any previous execution state
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

      // Subscribe to real-time updates for this execution
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

  // Handle Reset Execution (clear visual state)
  const handleResetExecution = () => {
    resetExecution();
    toast.info('Execution state cleared');
  };

  // Handle Save Pipeline
  const handleSave = useCallback(async () => {
    setSaving(true);

    try {
      const currentPipelineId = pipelineId || searchParams.get('id');

      if (currentPipelineId) {
        // UPDATE existing pipeline
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
        // CREATE new pipeline
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

        // Update store with new ID
        setPipelineId(newId);

        // Update URL without reload
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
    // Close the tab since it's opened in a new window
    window.close();
    // Fallback: navigate to pipelines list
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
            null, // New pipeline
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

  // Format last saved time
  const formatLastSaved = () => {
    if (!lastSavedAt) return null;
    const diff = Date.now() - lastSavedAt.getTime();
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    return lastSavedAt.toLocaleTimeString();
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 bg-[#0F0F12]/95 backdrop-blur-xl border-b border-white/10">
      {/* Left Section: Back + Title */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleBack}
          className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-colors"
          title="Back to Pipelines"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="h-6 w-px bg-card/10" />

        {/* Editable Title */}
        {isEditing ? (
          <input
            type="text"
            value={pipelineName}
            onChange={(e) => setPipelineName(e.target.value)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
            autoFocus
            className="bg-transparent text-white font-medium text-sm px-2 py-1 border border-indigo-500 rounded focus:outline-none"
          />
        ) : (
          <button
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-2 group"
          >
            <span className="text-sm font-medium text-white group-hover:text-indigo-400 transition-colors">
              {pipelineName}
            </span>
            {isDirty && (
              <span className="w-2 h-2 rounded-full bg-amber-500" title="Unsaved changes" />
            )}
          </button>
        )}

        {/* Save Status */}
        <div className="flex items-center gap-1.5 text-xs text-white/40">
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSavedAt ? (
            <>
              <Cloud className="w-3 h-3 text-green-400" />
              <span>{formatLastSaved()}</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3 h-3" />
              <span>Not saved</span>
            </>
          )}
        </div>
      </div>

      {/* Center Section: Undo/Redo (optional) */}
      <div className="flex items-center gap-1">
        <button
          className="p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-card/5 transition-colors disabled:opacity-30"
          title="Undo"
          disabled
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-lg text-white/40 hover:text-white/60 hover:bg-card/5 transition-colors disabled:opacity-30"
          title="Redo"
          disabled
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>

      {/* Right Section: Actions */}
      <div className="flex items-center gap-2">
        {/* AI Generator Button */}
        <button
          onClick={() => setShowAIGenerator(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
            bg-gradient-to-r from-violet-500/20 to-purple-500/20
            hover:from-violet-500/30 hover:to-purple-500/30
            text-violet-300 hover:text-violet-200
            border border-violet-500/30 hover:border-violet-500/50
            transition-all"
          title="Generate with AI"
        >
          <Wand2 className="w-4 h-4" />
          <span className="hidden sm:inline">Magic</span>
        </button>

        {/* Templates Button - Opens dialog via store (rendered at root level) */}
        <button
          onClick={() => setTemplateDialogOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-colors text-sm"
          title="Browse Templates"
        >
          <LayoutTemplate className="w-4 h-4" />
          <span className="hidden sm:inline">Templates</span>
        </button>

        {/* Preview Button */}
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-colors text-sm"
          title="Preview"
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Preview</span>
        </button>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
            ${isDirty
              ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25'
              : 'bg-card/10 hover:bg-card/20 text-white'
            }
            disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : !isDirty && lastSavedAt ? (
            <Check className="w-4 h-4 text-green-400" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isSaving ? 'Saving...' : isDirty ? 'Save' : 'Saved'}
          </span>
        </button>

        {/* Reset Execution Button (only show after execution) */}
        {!isExecuting && Object.keys(usePipelineStore.getState().nodeStatus).length > 0 && (
          <button
            onClick={handleResetExecution}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-colors text-sm"
            title="Clear execution state"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        {/* Run Button */}
        <button
          onClick={handleRun}
          disabled={isRunning || isExecuting || nodes.length === 0}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed shadow-lg
            ${isExecuting
              ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/25'
              : 'bg-green-600 hover:bg-green-500 shadow-green-500/25'
            }`}
        >
          {isRunning || isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span>{isExecuting ? 'Executing...' : isRunning ? 'Starting...' : 'Run'}</span>
        </button>

        {/* More Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-card/10 transition-colors"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl bg-[#1A1A1F] border border-white/10 shadow-xl z-20 overflow-hidden">
                <button
                  onClick={() => {
                    // Duplicate logic - create a copy
                    usePipelineStore.getState().setPipelineId(null);
                    usePipelineStore.getState().setPipelineName(`${pipelineName} (Copy)`);
                    usePipelineStore.getState().setDirty(true);
                    toast.info('Pipeline duplicated - save to create a copy');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-card/10 transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Duplicate
                </button>
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-card/10 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export JSON
                </button>
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-card/10 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Import JSON
                </button>
                <button className="w-full flex items-center gap-3 px-4 py-3 text-sm text-white/80 hover:bg-card/10 transition-colors">
                  <Settings className="w-4 h-4" />
                  Settings
                </button>
                <hr className="border-white/10" />
                <button
                  onClick={handleDelete}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Pipeline
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* REMOVED: Template Gallery Modal - Now rendered at ROOT level via Portal */}
      {/* The TemplateGallery is controlled via usePipelineStore.templateDialogOpen */}
      {/* and rendered in the parent PipelineEditorPage component */}

      {/* AI Generator Modal */}
      <AIGeneratorModal
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
      />
    </header>
  );
}
