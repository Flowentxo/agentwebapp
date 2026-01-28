'use client';

/**
 * ConditionNode Component
 *
 * Branching/condition node for flow control with execution status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { GitBranch, Loader2 } from 'lucide-react';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';

interface ConditionNodeData {
  label: string;
  condition?: string;
  config?: Record<string, unknown>;
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: { result?: boolean; branch?: 'true' | 'false' };
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

function ConditionNodeComponent({ data, selected }: NodeProps<ConditionNodeData>) {
  // Determine which branch was taken
  const branchTaken = data.executionOutput?.branch ||
    (data.executionOutput?.result !== undefined
      ? data.executionOutput.result ? 'true' : 'false'
      : null);

  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor="amber"
    >
      <div className="min-w-[160px] bg-card relative">
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-amber-600/20 rounded-t-lg border-b border-amber-600/30">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-500 rounded">
              {data.executionStatus === 'running' ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <GitBranch size={14} className="text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-amber-400">CONDITION</span>
          </div>
          {data.startedAt && (
            <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            <GitBranch size={16} />
            <span className="font-medium">{data.label}</span>
          </div>

          {data.condition && (
            <div className="mt-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground font-mono">
              {data.condition.length > 40
                ? `${data.condition.slice(0, 40)}...`
                : data.condition}
            </div>
          )}

          {/* Show which branch was taken */}
          {data.executionStatus === 'completed' && branchTaken && (
            <div className={`mt-2 px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${
              branchTaken === 'true'
                ? 'bg-green-900/30 border border-green-500/30 text-green-400'
                : 'bg-red-900/30 border border-red-500/30 text-red-400'
            }`}>
              <span>Result:</span>
              <span className="font-bold">{branchTaken === 'true' ? 'TRUE' : 'FALSE'}</span>
            </div>
          )}

          {/* Error Display */}
          {data.executionError && (
            <div className="mt-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
              {data.executionError}
            </div>
          )}
        </div>

        {/* Output Handles - True (top) and False (bottom) */}
        <Handle
          type="source"
          position={Position.Right}
          id="true"
          style={{ top: '35%' }}
          className={`
            !w-3 !h-3 !border-2
            ${data.executionStatus === 'completed' && branchTaken === 'true'
              ? '!bg-green-400 !border-green-200 animate-pulse'
              : '!bg-green-500 !border-green-300'
            }
          `}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="false"
          style={{ top: '65%' }}
          className={`
            !w-3 !h-3 !border-2
            ${data.executionStatus === 'completed' && branchTaken === 'false'
              ? '!bg-red-400 !border-red-500/30 animate-pulse'
              : '!bg-red-500 !border-red-300'
            }
          `}
        />

        {/* Labels for outputs */}
        <div className={`absolute right-[-24px] top-[28%] text-[10px] font-medium ${
          branchTaken === 'true' ? 'text-green-300' : 'text-green-400'
        }`}>
          T
        </div>
        <div className={`absolute right-[-24px] top-[58%] text-[10px] font-medium ${
          branchTaken === 'false' ? 'text-red-300' : 'text-red-400'
        }`}>
          F
        </div>
      </div>
    </NodeExecutionWrapper>
  );
}

export const ConditionNode = memo(ConditionNodeComponent);
