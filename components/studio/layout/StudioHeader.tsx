'use client';

/**
 * StudioHeader Component
 *
 * Handles the top header bar of the Visual Agent Studio including:
 * - Title and status display
 * - Mode switching (Guided/Advanced)
 * - Save, Test Run, and action buttons
 * - More menu with additional options
 *
 * @version 1.0.0
 */

import { useState, useCallback, memo } from 'react';
import {
  LayoutGrid,
  Save,
  Play,
  MoreHorizontal,
  Database,
  History,
  Loader2,
} from 'lucide-react';
import { Workflow } from '@/lib/api/workflows-client';

// =====================================================
// TYPES
// =====================================================

export type StudioMode = 'guided' | 'advanced';

export interface StudioHeaderProps {
  /** Current mode (guided or advanced) */
  mode: StudioMode;
  /** Callback when mode changes */
  onModeChange: (mode: StudioMode) => void;
  /** Current workflow being edited */
  currentWorkflow: Workflow | null;
  /** Whether the pipeline is currently executing */
  isExecuting: boolean;
  /** Whether debug mode is active */
  isDebugMode: boolean;
  /** Current run data for debug mode */
  currentRun?: { runNumber: number } | null;
  /** Data context panel visibility state */
  showDataContext: boolean;
  /** Run history panel visibility state */
  showRunHistory: boolean;
  /** Execution stream progress (0-100) */
  executionProgress: number;
  /** Execution stream status */
  executionStatus: 'idle' | 'connecting' | 'running' | 'completed' | 'error';
  /** Callback for save action */
  onSave: () => void;
  /** Callback for execute pipeline */
  onExecute: () => void;
  /** Callback for toggling data context panel */
  onToggleDataContext: () => void;
  /** Callback for toggling run history */
  onToggleRunHistory: () => void;
  /** Callback for opening variables panel */
  onOpenVariables: () => void;
  /** Callback for opening connections dialog */
  onOpenConnections: () => void;
  /** Callback for opening tool registry */
  onOpenToolRegistry: () => void;
  /** Callback for save as template */
  onSaveAsTemplate: () => void;
  /** Callback for opening version history */
  onOpenVersionHistory: () => void;
}

// =====================================================
// COMPONENT
// =====================================================

export const StudioHeader = memo(function StudioHeader({
  mode,
  onModeChange,
  currentWorkflow,
  isExecuting,
  isDebugMode,
  currentRun,
  showDataContext,
  showRunHistory,
  executionProgress,
  executionStatus,
  onSave,
  onExecute,
  onToggleDataContext,
  onToggleRunHistory,
  onOpenVariables,
  onOpenConnections,
  onOpenToolRegistry,
  onSaveAsTemplate,
  onOpenVersionHistory,
}: StudioHeaderProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleMoreMenuItemClick = useCallback((action: () => void) => {
    action();
    setShowMoreMenu(false);
  }, []);

  return (
    <div className="flex items-center gap-4 border-b-2 border-border px-4 py-3 bg-card/95 backdrop-blur-xl">
      {/* Left: Title & Status */}
      <div className="flex items-center gap-2">
        <LayoutGrid className="h-5 w-5 text-primary" />
        <div>
          <div className="text-sm font-semibold text-foreground">Agent Studio</div>
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground">
              {currentWorkflow?.status || 'Draft'}
            </span>
            <span>Last tested: 5 min ago</span>
            <span className="text-muted-foreground">- Unsaved changes</span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="ml-auto flex items-center gap-2">
        {/* Mode Switcher */}
        <div className="rounded-full bg-muted p-1 text-xs border border-border">
          <button
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              mode === 'guided'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onModeChange('guided')}
          >
            Guided
          </button>
          <button
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              mode === 'advanced'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
            onClick={() => onModeChange('advanced')}
          >
            Advanced
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Save Button */}
          <button
            onClick={onSave}
            className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm flex items-center gap-1 hover:bg-primary/90 transition-colors"
          >
            <Save className="h-4 w-4" />
            Save
          </button>

          {/* Test Run Button */}
          <button
            onClick={onExecute}
            disabled={isExecuting || !currentWorkflow}
            className="px-3 py-2 rounded-xl bg-card text-foreground text-sm font-medium flex items-center gap-1 border-2 border-border disabled:opacity-50 disabled:cursor-not-allowed hover:bg-muted/50 hover:border-border transition-colors"
          >
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Test Run
              </>
            )}
          </button>

          {/* Data Context Button */}
          <button
            onClick={onToggleDataContext}
            className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 border-2 transition-colors ${
              showDataContext
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-600'
                : 'bg-card border-border text-foreground hover:bg-muted/50 hover:border-border'
            }`}
            title="Toggle Data Context Panel"
          >
            <Database className="h-4 w-4" />
            {executionStatus !== 'idle' && (
              <span className="text-xs">{executionProgress}%</span>
            )}
          </button>

          {/* Run History Button */}
          <button
            onClick={onToggleRunHistory}
            disabled={!currentWorkflow}
            className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-1 border-2 transition-colors ${
              showRunHistory || isDebugMode
                ? 'bg-primary/10 border-primary/30 text-primary'
                : 'bg-card border-border text-foreground hover:bg-muted/50 hover:border-border'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Run History (Time-Travel Debug)"
          >
            <History className="h-4 w-4" />
            {isDebugMode && currentRun && (
              <span className="text-xs">#{currentRun.runNumber}</span>
            )}
          </button>

          {/* More Menu */}
          <div className="relative">
            <button
              className="px-3 py-2 rounded-xl bg-card text-foreground text-sm font-medium flex items-center gap-1 border-2 border-border hover:bg-muted/50 hover:border-border transition-colors"
              onClick={() => setShowMoreMenu(!showMoreMenu)}
            >
              <MoreHorizontal className="h-4 w-4" />
              More
            </button>
            {showMoreMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-[9]"
                  onClick={() => setShowMoreMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-56 rounded-xl border-2 border-border bg-card shadow-lg z-10">
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-foreground font-medium"
                    onClick={() => handleMoreMenuItemClick(onOpenVariables)}
                  >
                    Variables
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-foreground font-medium"
                    onClick={() => handleMoreMenuItemClick(onOpenConnections)}
                  >
                    Connections
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-foreground font-medium"
                    onClick={() => handleMoreMenuItemClick(onOpenToolRegistry)}
                  >
                    Tools
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-foreground font-medium"
                    onClick={() => handleMoreMenuItemClick(onSaveAsTemplate)}
                  >
                    Save as Template
                  </button>
                  <button
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 text-foreground font-medium"
                    onClick={() => handleMoreMenuItemClick(onOpenVersionHistory)}
                  >
                    Version History
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default StudioHeader;
