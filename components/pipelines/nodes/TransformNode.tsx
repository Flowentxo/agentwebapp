'use client';

/**
 * TransformNode Component
 *
 * Data transformation node with execution status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Shuffle, Loader2 } from 'lucide-react';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';

interface TransformNodeData {
  label: string;
  transform?: string;
  config?: Record<string, unknown>;
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: unknown;
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

function TransformNodeComponent({ data, selected }: NodeProps<TransformNodeData>) {
  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor="cyan"
    >
      <div className="min-w-[160px] bg-card">
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-cyan-600/20 rounded-t-lg border-b border-cyan-600/30">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-cyan-500 rounded">
              {data.executionStatus === 'running' ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <Shuffle size={14} className="text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-cyan-400">TRANSFORM</span>
          </div>
          {data.startedAt && (
            <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            <Shuffle size={16} />
            <span className="font-medium">{data.label}</span>
          </div>

          {data.transform && (
            <div className="mt-2 px-2 py-1 bg-gray-800 rounded text-xs text-muted-foreground font-mono">
              {data.transform.length > 40
                ? `${data.transform.slice(0, 40)}...`
                : data.transform}
            </div>
          )}

          {/* Running indicator */}
          {data.executionStatus === 'running' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Transforming...</span>
            </div>
          )}

          {/* Output preview */}
          {data.executionStatus === 'completed' && data.executionOutput && (
            <div className="mt-2 px-2 py-1 bg-green-900/30 border border-green-500/30 rounded text-xs text-green-400 line-clamp-2">
              Transformed
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
                : '!bg-cyan-500 !border-cyan-300'
            }
          `}
        />
      </div>
    </NodeExecutionWrapper>
  );
}

export const TransformNode = memo(TransformNodeComponent);
