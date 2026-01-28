'use client';

/**
 * NodeControlToolbar.tsx
 * Phase 6: Builder Experience Enhancement
 *
 * Floating toolbar overlay for node pinning and loop debugging.
 * Shows pin status, allows toggling pins, and displays loop stats.
 *
 * Features:
 * - Pin button with toggle (yellow border when pinned)
 * - Loop iteration stats badge
 * - Quick actions: View output, Copy path
 */

import { useState, useCallback, useMemo } from 'react';
import {
  Pin,
  PinOff,
  Play,
  Eye,
  Copy,
  Check,
  Loader2,
  Repeat,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export type PinMode = 'always' | 'on_error' | 'development' | 'disabled';

export interface PinnedDataInfo {
  id: string;
  mode: PinMode;
  isEnabled: boolean;
  label?: string;
  usageCount: number;
  lastUsedAt?: string;
  createdAt: string;
}

export interface LoopStats {
  totalIterations: number;
  completedIterations: number;
  failedIterations: number;
  currentIteration?: number;
  averageDurationMs?: number;
}

export interface NodeControlToolbarProps {
  /** Node ID */
  nodeId: string;
  /** Node name for display */
  nodeName: string;
  /** Workflow ID */
  workflowId: string;
  /** Pin status info */
  pinnedData?: PinnedDataInfo | null;
  /** Loop stats (for loop nodes) */
  loopStats?: LoopStats | null;
  /** Is this node in a running loop? */
  isLoopNode?: boolean;
  /** Callback when pin is toggled */
  onPinToggle?: (nodeId: string, pin: boolean, mode?: PinMode) => Promise<void>;
  /** Callback to view node output */
  onViewOutput?: (nodeId: string) => void;
  /** Callback to copy node path */
  onCopyPath?: (nodeId: string, nodeName: string) => void;
  /** Callback to run just this node */
  onRunNode?: (nodeId: string) => void;
  /** Callback to delete pin */
  onDeletePin?: (nodeId: string) => Promise<void>;
  /** Position relative to node */
  position?: 'top' | 'bottom' | 'right';
  /** Additional className */
  className?: string;
}

// ============================================================================
// PIN MODE CONFIG
// ============================================================================

const PIN_MODE_CONFIG: Record<
  PinMode,
  { label: string; description: string; color: string }
> = {
  always: {
    label: 'Always',
    description: 'Skip execution, always use pinned data',
    color: '#EAB308', // Yellow
  },
  on_error: {
    label: 'On Error',
    description: 'Use pinned data as fallback if execution fails',
    color: '#F97316', // Orange
  },
  development: {
    label: 'Development',
    description: 'Only use in dev/test mode',
    color: '#8B5CF6', // Purple
  },
  disabled: {
    label: 'Disabled',
    description: 'Pin exists but is not active',
    color: '#6B7280', // Gray
  },
};

// ============================================================================
// COMPONENT
// ============================================================================

export function NodeControlToolbar({
  nodeId,
  nodeName,
  workflowId,
  pinnedData,
  loopStats,
  isLoopNode = false,
  onPinToggle,
  onViewOutput,
  onCopyPath,
  onRunNode,
  onDeletePin,
  position = 'top',
  className,
}: NodeControlToolbarProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [isPinning, setIsPinning] = useState(false);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const isPinned = pinnedData?.isEnabled ?? false;
  const currentMode = pinnedData?.mode ?? 'development';

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handlePinToggle = useCallback(async () => {
    if (!onPinToggle) return;

    setIsPinning(true);
    try {
      await onPinToggle(nodeId, !isPinned, currentMode);
    } catch (err) {
      console.error('[NodeControlToolbar] Pin toggle failed:', err);
    } finally {
      setIsPinning(false);
    }
  }, [nodeId, isPinned, currentMode, onPinToggle]);

  const handleModeChange = useCallback(
    async (mode: PinMode) => {
      if (!onPinToggle) return;

      setShowModeDropdown(false);
      setIsPinning(true);
      try {
        await onPinToggle(nodeId, true, mode);
      } catch (err) {
        console.error('[NodeControlToolbar] Mode change failed:', err);
      } finally {
        setIsPinning(false);
      }
    },
    [nodeId, onPinToggle]
  );

  const handleCopyPath = useCallback(() => {
    const path = `{{$node["${nodeName}"].json}}`;
    navigator.clipboard.writeText(path);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopyPath?.(nodeId, nodeName);
  }, [nodeId, nodeName, onCopyPath]);

  const handleDeletePin = useCallback(async () => {
    if (!onDeletePin) return;

    setShowMoreMenu(false);
    setIsPinning(true);
    try {
      await onDeletePin(nodeId);
    } catch (err) {
      console.error('[NodeControlToolbar] Delete pin failed:', err);
    } finally {
      setIsPinning(false);
    }
  }, [nodeId, onDeletePin]);

  // ============================================================================
  // COMPUTED
  // ============================================================================

  const positionClasses = useMemo(() => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  }, [position]);

  const modeConfig = PIN_MODE_CONFIG[currentMode];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.1 }}
      className={cn(
        'absolute z-50 flex items-center gap-1 px-2 py-1.5 rounded-lg shadow-xl',
        isDark
          ? 'bg-zinc-900 border border-white/10'
          : 'bg-white border border-zinc-200',
        // Yellow border when pinned
        isPinned && 'border-yellow-500/50 ring-1 ring-yellow-500/20',
        positionClasses,
        className
      )}
    >
      {/* Pin Button */}
      <div className="relative">
        <button
          onClick={handlePinToggle}
          disabled={isPinning}
          className={cn(
            'p-1.5 rounded-md transition-all',
            isPinned
              ? isDark
                ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              : isDark
              ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
          )}
          title={isPinned ? 'Unpin node output' : 'Pin node output'}
        >
          {isPinning ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isPinned ? (
            <Pin className="w-4 h-4" />
          ) : (
            <PinOff className="w-4 h-4" />
          )}
        </button>

        {/* Pin Mode Dropdown */}
        {isPinned && (
          <>
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className={cn(
                'absolute -top-1 -right-1 p-0.5 rounded-full transition-colors',
                isDark
                  ? 'bg-zinc-800 hover:bg-zinc-700'
                  : 'bg-zinc-100 hover:bg-zinc-200'
              )}
            >
              <ChevronDown className="w-2.5 h-2.5 text-zinc-400" />
            </button>

            <AnimatePresence>
              {showModeDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    'absolute top-full left-0 mt-1 w-48 rounded-lg shadow-xl overflow-hidden z-10',
                    isDark
                      ? 'bg-zinc-900 border border-white/10'
                      : 'bg-white border border-zinc-200'
                  )}
                >
                  <div
                    className={cn(
                      'px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide',
                      isDark ? 'text-zinc-500 bg-zinc-800/50' : 'text-zinc-400 bg-zinc-50'
                    )}
                  >
                    Pin Mode
                  </div>
                  {Object.entries(PIN_MODE_CONFIG).map(([mode, config]) => (
                    <button
                      key={mode}
                      onClick={() => handleModeChange(mode as PinMode)}
                      className={cn(
                        'w-full px-3 py-2 text-left flex items-center gap-2 transition-colors',
                        currentMode === mode
                          ? isDark
                            ? 'bg-white/5'
                            : 'bg-zinc-100'
                          : isDark
                          ? 'hover:bg-white/5'
                          : 'hover:bg-zinc-50'
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium',
                            isDark ? 'text-white' : 'text-zinc-900'
                          )}
                        >
                          {config.label}
                        </div>
                        <div
                          className={cn(
                            'text-[10px] truncate',
                            isDark ? 'text-zinc-500' : 'text-zinc-400'
                          )}
                        >
                          {config.description}
                        </div>
                      </div>
                      {currentMode === mode && (
                        <Check className="w-3.5 h-3.5 text-primary" />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* Divider */}
      <div
        className={cn('w-px h-4', isDark ? 'bg-white/10' : 'bg-zinc-200')}
      />

      {/* Loop Stats Badge */}
      {isLoopNode && loopStats && (
        <>
          <div
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
              isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
            )}
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>
              {loopStats.completedIterations}/{loopStats.totalIterations}
            </span>
            {loopStats.failedIterations > 0 && (
              <span className="text-red-400">({loopStats.failedIterations} failed)</span>
            )}
          </div>
          <div
            className={cn('w-px h-4', isDark ? 'bg-white/10' : 'bg-zinc-200')}
          />
        </>
      )}

      {/* View Output */}
      {onViewOutput && (
        <button
          onClick={() => onViewOutput(nodeId)}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isDark
              ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
              : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
          )}
          title="View output"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}

      {/* Copy Path */}
      <button
        onClick={handleCopyPath}
        className={cn(
          'p-1.5 rounded-md transition-colors',
          copied
            ? 'text-green-400'
            : isDark
            ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
            : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
        )}
        title="Copy variable path"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      </button>

      {/* Run Node */}
      {onRunNode && (
        <button
          onClick={() => onRunNode(nodeId)}
          className={cn(
            'p-1.5 rounded-md transition-colors',
            isDark
              ? 'text-zinc-400 hover:bg-green-500/10 hover:text-green-400'
              : 'text-zinc-500 hover:bg-green-50 hover:text-green-600'
          )}
          title="Run this node only"
        >
          <Play className="w-4 h-4" />
        </button>
      )}

      {/* More Menu */}
      {isPinned && (
        <div className="relative">
          <button
            onClick={() => setShowMoreMenu(!showMoreMenu)}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              isDark
                ? 'text-zinc-400 hover:bg-white/5 hover:text-white'
                : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700'
            )}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {showMoreMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className={cn(
                  'absolute top-full right-0 mt-1 w-36 rounded-lg shadow-xl overflow-hidden z-10',
                  isDark
                    ? 'bg-zinc-900 border border-white/10'
                    : 'bg-white border border-zinc-200'
                )}
              >
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    handlePinToggle();
                  }}
                  className={cn(
                    'w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors',
                    isDark ? 'hover:bg-white/5' : 'hover:bg-zinc-50'
                  )}
                >
                  <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />
                  <span className={isDark ? 'text-zinc-200' : 'text-zinc-700'}>
                    Refresh Pin
                  </span>
                </button>
                {onDeletePin && (
                  <button
                    onClick={handleDeletePin}
                    className={cn(
                      'w-full px-3 py-2 text-left flex items-center gap-2 text-sm transition-colors',
                      isDark
                        ? 'hover:bg-red-500/10 text-red-400'
                        : 'hover:bg-red-50 text-red-600'
                    )}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Pin</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Usage Stats (small hint) */}
      {pinnedData && pinnedData.usageCount > 0 && (
        <div
          className={cn(
            'ml-1 text-[10px] px-1.5 py-0.5 rounded',
            isDark ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-400'
          )}
          title={`Used ${pinnedData.usageCount} times`}
        >
          ×{pinnedData.usageCount}
        </div>
      )}
    </motion.div>
  );
}

export default NodeControlToolbar;
