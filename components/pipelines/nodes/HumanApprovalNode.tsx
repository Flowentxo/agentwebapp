'use client';

/**
 * HumanApprovalNode Component
 *
 * Human-in-the-loop approval node with execution status and blinking waiting state
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { UserCheck, MessageSquare, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { NodeExecutionWrapper, ExecutionDuration } from './NodeExecutionWrapper';
import { NodeExecutionStatus } from '@/hooks/useExecutionStream';

interface HumanApprovalNodeData {
  label: string;
  approvalMessage?: string;
  config?: {
    timeout?: number;
    notifyEmail?: string;
    notifySlack?: boolean;
  };
  // Execution status data
  executionStatus?: NodeExecutionStatus;
  executionOutput?: { approved?: boolean; rejectedBy?: string; approvedBy?: string };
  executionError?: string;
  startedAt?: string;
  completedAt?: string;
}

function HumanApprovalNodeComponent({ data, selected }: NodeProps<HumanApprovalNodeData>) {
  const isWaiting = data.executionStatus === 'waiting_approval';
  const wasApproved = data.executionOutput?.approved === true;
  const wasRejected = data.executionOutput?.approved === false;

  return (
    <NodeExecutionWrapper
      executionStatus={data.executionStatus}
      selected={selected}
      baseColor="orange"
    >
      <div className="min-w-[180px] bg-card relative">
        {/* Waiting overlay animation */}
        {isWaiting && (
          <motion.div
            className="absolute inset-0 rounded-xl border-2 border-orange-400 pointer-events-none"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          className={`
            !w-3 !h-3 !border-2
            ${data.executionStatus === 'running'
              ? '!bg-blue-400 !border-blue-500/30 animate-pulse'
              : isWaiting
                ? '!bg-orange-400 !border-orange-200'
                : '!bg-gray-400 !border-border'
            }
          `}
        />

        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-orange-600/20 rounded-t-lg border-b border-orange-600/30">
          <div className="flex items-center gap-2">
            <div className={`p-1 rounded ${isWaiting ? 'bg-orange-400 animate-pulse' : 'bg-orange-500'}`}>
              {isWaiting ? (
                <Loader2 size={14} className="text-white animate-spin" />
              ) : wasApproved ? (
                <CheckCircle size={14} className="text-white" />
              ) : wasRejected ? (
                <XCircle size={14} className="text-white" />
              ) : (
                <UserCheck size={14} className="text-white" />
              )}
            </div>
            <span className="text-xs font-medium text-orange-400">APPROVAL</span>
          </div>
          {data.startedAt && (
            <ExecutionDuration startedAt={data.startedAt} completedAt={data.completedAt} />
          )}
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="flex items-center gap-2 text-white">
            <UserCheck size={16} />
            <span className="font-medium">{data.label}</span>
          </div>

          <div className="mt-1 text-xs text-muted-foreground">
            {isWaiting ? 'Waiting for approval...' : 'Pauses for human approval'}
          </div>

          {data.approvalMessage && (
            <div className="mt-2 flex items-start gap-1">
              <MessageSquare size={12} className="text-muted-foreground mt-0.5 flex-shrink-0" />
              <span className="text-xs text-muted-foreground line-clamp-2">
                {data.approvalMessage}
              </span>
            </div>
          )}

          {data.config?.timeout && (
            <div className="mt-2 text-xs text-orange-400/70">
              Timeout: {data.config.timeout}s
            </div>
          )}

          {/* Waiting for approval indicator */}
          {isWaiting && (
            <motion.div
              className="mt-3 px-3 py-2 bg-orange-500/20 border border-orange-500/40 rounded-lg text-center"
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <div className="flex items-center justify-center gap-2 text-orange-400">
                <Loader2 size={14} className="animate-spin" />
                <span className="text-sm font-medium">Awaiting Decision</span>
              </div>
              <div className="mt-1 text-xs text-orange-300/70">
                Check inbox or click to approve
              </div>
            </motion.div>
          )}

          {/* Approved indicator */}
          {wasApproved && (
            <div className="mt-2 px-2 py-1 bg-green-900/30 border border-green-500/30 rounded text-xs text-green-400 flex items-center gap-1">
              <CheckCircle size={12} />
              <span>Approved{data.executionOutput?.approvedBy ? ` by ${data.executionOutput.approvedBy}` : ''}</span>
            </div>
          )}

          {/* Rejected indicator */}
          {wasRejected && (
            <div className="mt-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400 flex items-center gap-1">
              <XCircle size={12} />
              <span>Rejected{data.executionOutput?.rejectedBy ? ` by ${data.executionOutput.rejectedBy}` : ''}</span>
            </div>
          )}

          {/* Error Display */}
          {data.executionError && (
            <div className="mt-2 px-2 py-1 bg-red-900/30 border border-red-500/30 rounded text-xs text-red-400">
              {data.executionError}
            </div>
          )}
        </div>

        {/* Output Handles - Approved (top) and Rejected (bottom) */}
        <Handle
          type="source"
          position={Position.Right}
          id="approved"
          style={{ top: '40%' }}
          className={`
            !w-3 !h-3 !border-2
            ${wasApproved
              ? '!bg-green-400 !border-green-200 animate-pulse'
              : '!bg-green-500 !border-green-300'
            }
          `}
        />
        <Handle
          type="source"
          position={Position.Right}
          id="rejected"
          style={{ top: '70%' }}
          className={`
            !w-3 !h-3 !border-2
            ${wasRejected
              ? '!bg-red-400 !border-red-500/30 animate-pulse'
              : '!bg-red-500 !border-red-300'
            }
          `}
        />

        {/* Labels */}
        <div className={`absolute right-[-8px] top-[32%] text-[8px] font-medium rotate-90 ${
          wasApproved ? 'text-green-300' : 'text-green-400'
        }`}>
          OK
        </div>
        <div className={`absolute right-[-8px] top-[62%] text-[8px] font-medium rotate-90 ${
          wasRejected ? 'text-red-300' : 'text-red-400'
        }`}>
          NO
        </div>
      </div>
    </NodeExecutionWrapper>
  );
}

export const HumanApprovalNode = memo(HumanApprovalNodeComponent);
