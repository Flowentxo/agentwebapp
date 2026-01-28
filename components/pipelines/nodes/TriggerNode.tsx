'use client';

/**
 * TriggerNode Component
 *
 * Start node for pipelines (manual, webhook, schedule)
 * Updated with execution status visualization
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, Webhook, Clock, Play } from 'lucide-react';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';

interface TriggerNodeData {
  label: string;
  subType: 'manual' | 'webhook' | 'schedule';
  config?: {
    webhookUrl?: string;
    cronExpression?: string;
  };
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: unknown;
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

function TriggerNodeComponent({ data, selected }: NodeProps<TriggerNodeData>) {
  const getIcon = () => {
    switch (data.subType) {
      case 'webhook':
        return <Webhook size={16} />;
      case 'schedule':
        return <Clock size={16} />;
      default:
        return <Play size={16} />;
    }
  };

  const getSubLabel = () => {
    switch (data.subType) {
      case 'webhook':
        return 'Webhook';
      case 'schedule':
        return 'Scheduled';
      default:
        return 'Manual';
    }
  };

  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor="green"
    >
      <div className="min-w-[160px] bg-card">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-green-600/20 rounded-t-lg border-b border-green-600/30">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-green-500 rounded">
              <Zap size={14} className="text-white" />
            </div>
            <span className="text-xs font-medium text-green-400">TRIGGER</span>
          </div>
          {data.startedAt && (
            <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            {getIcon()}
            <span className="font-medium">{data.label}</span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{getSubLabel()}</div>

          {data.subType === 'webhook' && data.config?.webhookUrl && (
            <div className="mt-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground font-mono truncate">
              {data.config.webhookUrl}
            </div>
          )}

          {data.subType === 'schedule' && data.config?.cronExpression && (
            <div className="mt-2 px-2 py-1 bg-muted rounded text-xs text-muted-foreground font-mono">
              {data.config.cronExpression}
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
                : '!bg-green-500 !border-green-300'
            }
          `}
        />
      </div>
    </NodeExecutionWrapper>
  );
}

export const TriggerNode = memo(TriggerNodeComponent);
