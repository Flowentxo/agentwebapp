'use client';

/**
 * ThinkingBlock - Gemini-like thinking UI
 * Shows real-time processing stages, tool calls, and elapsed time
 * during agent response generation.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Check, AlertCircle, ChevronDown, ChevronUp, Brain, Zap } from 'lucide-react';

interface ToolCallInfo {
  id: string;
  name: string;
  displayName: string;
  status: string;
  args?: any;
  result?: any;
}

interface ThinkingBlockProps {
  agentName: string;
  agentColor: string;
  processingStage?: { stage: string; agentName: string; label: string } | null;
  toolCalls: ToolCallInfo[];
  isVisible: boolean;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

function ToolCallStatusIcon({ status, color }: { status: string; color: string }) {
  switch (status) {
    case 'running':
      return <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color }} />;
    case 'completed':
      return <Check className="w-3.5 h-3.5 text-emerald-400" />;
    case 'failed':
      return <AlertCircle className="w-3.5 h-3.5 text-red-400" />;
    default:
      return <div className="w-3.5 h-3.5 rounded-full border border-white/20" />;
  }
}

export function ThinkingBlock({
  agentName,
  agentColor,
  processingStage,
  toolCalls,
  isVisible,
}: ThinkingBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Collect processing stage history for display
  const [stageHistory, setStageHistory] = useState<string[]>([]);
  const lastStageRef = useRef<string | null>(null);

  // Start timer when thinking begins
  useEffect(() => {
    if (isVisible && startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      intervalRef.current = setInterval(() => {
        if (startTimeRef.current) {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }, 1000);
    }

    if (!isVisible) {
      // Reset when hidden
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
      startTimeRef.current = null;
      setElapsed(0);
      setStageHistory([]);
      lastStageRef.current = null;
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isVisible]);

  // Track processing stage changes
  useEffect(() => {
    if (processingStage && processingStage.label !== lastStageRef.current) {
      lastStageRef.current = processingStage.label;
      setStageHistory(prev => {
        if (prev.includes(processingStage.label)) return prev;
        return [...prev, processingStage.label];
      });
    }
  }, [processingStage]);

  // Has any running tool call
  const hasRunningTools = useMemo(
    () => toolCalls.some(t => t.status === 'running'),
    [toolCalls]
  );

  // Current display name
  const displayAgent = processingStage?.agentName || agentName;

  if (!isVisible) return null;

  return (
    <div className="px-4 py-3">
      <div
        className={cn(
          'relative rounded-2xl overflow-hidden border transition-all duration-300',
          'bg-gradient-to-br from-white/[0.03] to-white/[0.01]',
          'border-white/[0.08]'
        )}
      >
        {/* Animated top border accent */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px] animate-pulse"
          style={{
            background: `linear-gradient(90deg, transparent, ${agentColor}60, transparent)`,
          }}
        />

        {/* Header - always visible */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.02] transition-colors"
        >
          {/* Thinking icon with pulse */}
          <div className="relative">
            <Brain
              className="w-[18px] h-[18px] animate-pulse"
              style={{ color: agentColor }}
            />
            <div
              className="absolute -inset-1 rounded-full animate-ping opacity-20"
              style={{ backgroundColor: agentColor }}
            />
          </div>

          {/* Label */}
          <div className="flex-1 text-left">
            <span className="text-sm text-white/70">
              <span className="font-medium text-white/90">{displayAgent}</span>
              {' '}is thinking
              <span className="inline-flex ml-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '200ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '400ms' }}>.</span>
              </span>
            </span>
          </div>

          {/* Timer */}
          <span className="text-xs text-white/30 font-mono tabular-nums">
            {formatElapsed(elapsed)}
          </span>

          {/* Expand toggle */}
          {(toolCalls.length > 0 || stageHistory.length > 1) && (
            isExpanded
              ? <ChevronUp className="w-4 h-4 text-white/30" />
              : <ChevronDown className="w-4 h-4 text-white/30" />
          )}
        </button>

        {/* Expanded details */}
        {isExpanded && (toolCalls.length > 0 || stageHistory.length > 0) && (
          <div className="px-4 pb-3 space-y-1.5">
            {/* Processing stage history */}
            {stageHistory.length > 0 && toolCalls.length === 0 && (
              <div className="space-y-1">
                {stageHistory.map((label, i) => {
                  const isCurrent = label === processingStage?.label;
                  return (
                    <div key={i} className="flex items-center gap-2.5 py-0.5">
                      {isCurrent ? (
                        <Loader2
                          className="w-3.5 h-3.5 animate-spin flex-shrink-0"
                          style={{ color: agentColor }}
                        />
                      ) : (
                        <Check className="w-3.5 h-3.5 text-emerald-400/60 flex-shrink-0" />
                      )}
                      <span
                        className={cn(
                          'text-xs',
                          isCurrent ? 'text-white/60' : 'text-white/30'
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Tool calls */}
            {toolCalls.length > 0 && (
              <div className="space-y-1">
                {toolCalls.map((tool) => (
                  <div
                    key={tool.id}
                    className={cn(
                      'flex items-center gap-2.5 py-1 px-2.5 rounded-lg transition-colors',
                      tool.status === 'running' && 'bg-white/[0.03]'
                    )}
                  >
                    <ToolCallStatusIcon status={tool.status} color={agentColor} />
                    <span
                      className={cn(
                        'text-xs flex-1',
                        tool.status === 'running'
                          ? 'text-white/60'
                          : tool.status === 'completed'
                          ? 'text-white/40'
                          : tool.status === 'failed'
                          ? 'text-red-400/60'
                          : 'text-white/30'
                      )}
                    >
                      {tool.displayName || tool.name}
                    </span>
                    {tool.status === 'running' && (
                      <Zap className="w-3 h-3 text-amber-400/50 animate-pulse" />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Current stage label (when tool calls are also showing) */}
            {processingStage && toolCalls.length > 0 && (
              <div className="flex items-center gap-2 pt-1 border-t border-white/[0.04]">
                <Loader2
                  className="w-3 h-3 animate-spin"
                  style={{ color: agentColor }}
                />
                <span className="text-[11px] text-white/40">
                  {processingStage.label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
