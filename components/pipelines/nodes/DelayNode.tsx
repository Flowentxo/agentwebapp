'use client';

/**
 * DelayNode Component
 *
 * Wait/delay node for timing control with execution status
 */

import { memo, useEffect, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Clock, Loader2 } from 'lucide-react';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';

interface DelayNodeData {
  label: string;
  delay?: number; // in milliseconds
  config?: Record<string, unknown>;
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: unknown;
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

function formatDelay(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

function DelayNodeComponent({ data, selected }: NodeProps<DelayNodeData>) {
  const delay = data.delay || 1000;
  const [elapsedTime, setElapsedTime] = useState(0);

  // Live countdown when running
  useEffect(() => {
    if (data.executionStatus === 'running' && data.startedAt) {
      const interval = setInterval(() => {
        const elapsed = Date.now() - new Date(data.startedAt!).getTime();
        setElapsedTime(elapsed);
      }, 100);
      return () => clearInterval(interval);
    } else {
      setElapsedTime(0);
    }
  }, [data.executionStatus, data.startedAt]);

  const progress = data.executionStatus === 'running'
    ? Math.min((elapsedTime / delay) * 100, 100)
    : data.executionStatus === 'completed' ? 100 : 0;

  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor="gray"
    >
      <div className="min-w-[140px] bg-card">
        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className={`
            !w-3 !h-3 !border-2
            ${data.executionStatus === 'running'
              ? '!bg-blue-400 !border-blue-500/30 animate-pulse'
              : '!bg-gray-400 !border-border'
            }
          `}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-gray-600/20 rounded-t-lg border-b border-gray-600/30">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-muted/500 rounded">
              {data.executionStatus === 'running' ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <Clock size={14} className="text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-muted-foreground">DELAY</span>
          </div>
          {data.startedAt && (
            <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            <Clock size={16} />
            <span className="font-medium">{data.label}</span>
          </div>

          <div className="mt-2 px-2 py-1 bg-gray-800 rounded text-center relative overflow-hidden">
            {/* Progress bar behind text */}
            {data.executionStatus === 'running' && (
              <div
                className="absolute inset-0 bg-blue-500/20 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            )}
            <span className={`text-lg font-mono relative z-10 ${
              data.executionStatus === 'running' ? 'text-blue-300' :
              data.executionStatus === 'completed' ? 'text-green-300' :
              'text-gray-300'
            }`}>
              {data.executionStatus === 'running'
                ? formatDelay(Math.max(0, delay - elapsedTime))
                : formatDelay(delay)
              }
            </span>
          </div>

          {/* Status text */}
          {data.executionStatus === 'running' && (
            <div className="mt-2 text-center text-xs text-blue-400">
              Waiting...
            </div>
          )}

          {data.executionStatus === 'completed' && (
            <div className="mt-2 text-center text-xs text-green-400">
              Completed
            </div>
          )}

          {/* Error Display */}
          {data.executionError && (
            <div className="mt-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
              {data.executionError}
            </div>
          )}
        </div>

        {/* Output Handle */}
        <Handle
          type="source"
          position={Position.Right}
          className={`
            !w-3 !h-3 !border-2
            ${data.executionStatus === 'completed'
              ? '!bg-green-400 !border-green-200'
              : data.executionStatus === 'running'
                ? '!bg-blue-400 !border-blue-500/30 animate-pulse'
                : '!bg-muted/500 !border-border'
            }
          `}
        />
      </div>
    </NodeExecutionWrapper>
  );
}

export const DelayNode = memo(DelayNodeComponent);
