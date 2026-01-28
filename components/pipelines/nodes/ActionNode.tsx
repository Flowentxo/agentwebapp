'use client';

/**
 * ActionNode Component
 *
 * Action execution node (HTTP, Database, Email, etc.) with execution status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Code, Database, Mail, CheckCircle, Globe, Loader2 } from 'lucide-react';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';
import { NodeCostHeaderBadge } from './NodeCostBadge';

interface ActionNodeData {
  label: string;
  subType?: 'http' | 'database' | 'email' | 'end' | string;
  config?: {
    url?: string;
    method?: string;
    query?: string;
  };
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: unknown;
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

function ActionNodeComponent({ data, selected }: NodeProps<ActionNodeData>) {
  const getIcon = () => {
    if (data.executionStatus === 'running') {
      return <Loader2 size={14} className="animate-spin" />;
    }
    switch (data.subType) {
      case 'http':
        return <Globe size={14} />;
      case 'database':
        return <Database size={14} />;
      case 'email':
        return <Mail size={14} />;
      case 'end':
        return <CheckCircle size={14} />;
      default:
        return <Code size={14} />;
    }
  };

  const getSubLabel = () => {
    switch (data.subType) {
      case 'http':
        return 'HTTP Request';
      case 'database':
        return 'Database';
      case 'email':
        return 'Send Email';
      case 'end':
        return 'End';
      default:
        return 'Action';
    }
  };

  const isEndNode = data.subType === 'end';

  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor={isEndNode ? 'emerald' : 'purple'}
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
        <div className={`flex items-center justify-between gap-2 px-3 py-2 ${isEndNode ? 'bg-emerald-600/20' : 'bg-purple-600/20'} rounded-t-lg border-b ${isEndNode ? 'border-emerald-600/30' : 'border-purple-600/30'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1 ${isEndNode ? 'bg-emerald-500' : 'bg-purple-500'} rounded`}>
              {getIcon()}
            </div>
            <span className={`text-xs font-medium ${isEndNode ? 'text-emerald-400' : 'text-purple-400'}`}>
              {isEndNode ? 'END' : 'ACTION'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {/* Cost Badge */}
            <NodeCostHeaderBadge
              nodeType="action"
              config={{ subType: data.subType }}
            />
            {data.startedAt && (
              <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            {getIcon()}
            <span className="font-medium">{data.label}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{getSubLabel()}</div>

          {data.subType === 'http' && data.config?.url && (
            <div className="mt-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground font-mono truncate">
              {data.config.method || 'GET'} {data.config.url}
            </div>
          )}

          {data.subType === 'database' && data.config?.query && (
            <div className="mt-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground font-mono truncate">
              {data.config.query.slice(0, 30)}...
            </div>
          )}

          {/* Running indicator */}
          {data.executionStatus === 'running' && (
            <div className="mt-2 flex items-center gap-2 text-xs text-blue-400">
              <Loader2 size={12} className="animate-spin" />
              <span>Executing...</span>
            </div>
          )}

          {/* Output preview */}
          {data.executionStatus === 'completed' && data.executionOutput && (
            <div className="mt-2 px-2 py-1 bg-green-900/30 border border-green-500/30 rounded text-xs text-green-400 line-clamp-2">
              {typeof data.executionOutput === 'string'
                ? data.executionOutput.substring(0, 60)
                : 'Output received'}
            </div>
          )}

          {/* Error Display */}
          {data.executionError && (
            <div className="mt-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
              {data.executionError}
            </div>
          )}
        </div>

        {/* Output Handle (not for end nodes) */}
        {!isEndNode && (
          <Handle
            type="source"
            position={Position.Right}
            className={`
              !w-3 !h-3 !border-2
              ${data.executionStatus === 'completed'
                ? '!bg-green-400 !border-green-200'
                : data.executionStatus === 'running'
                  ? '!bg-blue-400 !border-blue-500/30 animate-pulse'
                  : '!bg-purple-500 !border-purple-300'
              }
            `}
          />
        )}
      </div>
    </NodeExecutionWrapper>
  );
}

export const ActionNode = memo(ActionNodeComponent);
