'use client';

/**
 * AgentNode Component
 *
 * AI Agent execution node with execution status visualization
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Bot, MessageSquare, Loader2 } from 'lucide-react';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';
import { NodeCostHeaderBadge } from './NodeCostBadge';

interface AgentNodeData {
  label: string;
  subType?: string;
  agentId?: string;
  prompt?: string;
  config?: Record<string, unknown>;
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: unknown;
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

const agentColors: Record<string, { bg: string; border: string; accent: string; text: string }> = {
  dexter: { bg: 'bg-blue-600/20', border: 'border-blue-600', accent: 'bg-blue-500', text: 'text-blue-400' },
  cassie: { bg: 'bg-pink-600/20', border: 'border-pink-600', accent: 'bg-pink-500', text: 'text-pink-400' },
  emmie: { bg: 'bg-purple-600/20', border: 'border-purple-600', accent: 'bg-purple-500', text: 'text-purple-400' },
  kai: { bg: 'bg-cyan-600/20', border: 'border-cyan-600', accent: 'bg-cyan-500', text: 'text-cyan-400' },
  default: { bg: 'bg-blue-600/20', border: 'border-blue-600', accent: 'bg-blue-500', text: 'text-blue-400' },
};

function AgentNodeComponent({ data, selected }: NodeProps<AgentNodeData>) {
  const colors = agentColors[data.agentId || 'default'] || agentColors.default;

  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor="blue"
    >
      <div className="min-w-[180px] bg-card">
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
        <div className={`flex items-center justify-between gap-2 px-3 py-2 ${colors.bg} rounded-t-lg border-b ${colors.border}/30`}>
          <div className="flex items-center gap-2">
            <div className={`p-1 ${colors.accent} rounded`}>
              {data.executionStatus === 'running' ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : (
                <Bot size={14} className="text-white" />
              )}
            </div>
            <span className={`text-xs font-medium ${colors.text}`}>AI AGENT</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Cost Badge */}
            <NodeCostHeaderBadge
              nodeType="agent"
              config={{ agentId: data.agentId, model: data.config?.model as string }}
            />
            {data.startedAt && (
              <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            <Bot size={16} />
            <span className="font-medium">{data.label}</span>
          </div>

          {data.agentId && (
            <div className="mt-1 text-xs text-muted-foreground capitalize">
              {data.agentId}
            </div>
          )}

          {data.prompt && (
            <div className="mt-2 flex items-start gap-1">
              <MessageSquare size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-xs text-muted-foreground line-clamp-2">
                {data.prompt}
              </span>
            </div>
          )}

          {/* Running indicator */}
          {data.executionStatus === 'running' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Processing...</span>
            </div>
          )}

          {/* Output preview (when completed) */}
          {data.executionStatus === 'completed' && data.executionOutput && (
            <div className="mt-2 px-2 py-1 bg-green-900/30 border border-green-500/30 rounded text-xs text-green-400 line-clamp-2">
              {typeof data.executionOutput === 'string'
                ? data.executionOutput.substring(0, 100)
                : JSON.stringify(data.executionOutput).substring(0, 100)}...
            </div>
          )}

          {/* Execution Error Display */}
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
                : '!bg-blue-500 !border-blue-300'
            }
          `}
        />
      </div>
    </NodeExecutionWrapper>
  );
}

export const AgentNode = memo(AgentNodeComponent);
