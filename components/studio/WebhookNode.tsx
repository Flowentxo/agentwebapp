'use client';

/**
 * WEBHOOK NODE COMPONENT
 *
 * Custom node for webhook/HTTP requests with visual indicators
 * Shows HTTP method, auth status, and execution status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Zap, Lock, Check, X, Loader2, RotateCw } from 'lucide-react';

interface WebhookNodeData {
  label?: string;
  description?: string;
  color?: string;
  enabled?: boolean;
  webhookId?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  url?: string;
  authType?: 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2';
  retryEnabled?: boolean;
  lastExecutionStatus?: 'success' | 'error' | 'executing' | 'retrying' | 'idle';
  lastStatusCode?: number;
  lastExecutionTime?: number; // ms
  retryCount?: number;
  currentRetryAttempt?: number;
}

// Color coding by HTTP method
const METHOD_COLORS = {
  GET: '#3B82F6',      // Blue
  POST: '#10B981',     // Green
  PUT: '#F59E0B',      // Orange
  DELETE: '#EF4444',   // Red
  PATCH: '#8B5CF6',    // Purple
  HEAD: '#6B7280',     // Gray
  OPTIONS: '#6B7280',  // Gray
};

export const WebhookNode = memo(({ data, selected }: NodeProps<WebhookNodeData>) => {
  const method = data.method || 'POST';
  const nodeColor = METHOD_COLORS[method] || data.color || '#10B981';
  const hasAuth = data.authType && data.authType !== 'none';

  return (
    <div
      className={`relative rounded-xl border-2 bg-surface-1 shadow-lg transition-all ${
        selected ? 'border-[rgb(var(--accent))] shadow-xl' : 'border-white/10'
      }`}
      style={{ minWidth: 240, minHeight: 100 }}
    >
      {/* Target Handle (Input) */}
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 border-2 border-white/20 bg-surface-0"
        style={{ background: nodeColor }}
      />

      {/* Node Content */}
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${nodeColor}20` }}
          >
            <Zap className="h-5 w-5" style={{ color: nodeColor }} />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-text truncate">
              {data.label || 'Webhook'}
            </h4>
            {data.description && (
              <p className="text-xs text-text-muted line-clamp-1">
                {data.description}
              </p>
            )}
            {data.url && (
              <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                {data.url}
              </p>
            )}
          </div>
        </div>

        {/* Method & Auth Row */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          {/* HTTP Method Badge */}
          <div
            className="px-2 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${nodeColor}20`,
              color: nodeColor
            }}
          >
            {method}
          </div>

          {/* Auth Status */}
          {hasAuth && (
            <div className="flex items-center gap-1 text-text-muted">
              <Lock className="h-3 w-3" />
              <span className="capitalize">{data.authType}</span>
            </div>
          )}

          {/* Retry Enabled */}
          {data.retryEnabled && (
            <div className="flex items-center gap-1 text-text-muted">
              <RotateCw className="h-3 w-3" />
              <span>Retry</span>
            </div>
          )}
        </div>

        {/* Status Row */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          {/* Executing Status */}
          {data.lastExecutionStatus === 'executing' && (
            <div className="flex items-center gap-1 text-blue-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Executing...</span>
            </div>
          )}

          {/* Retrying Status */}
          {data.lastExecutionStatus === 'retrying' && (
            <div className="flex items-center gap-1 text-orange-400">
              <RotateCw className="h-3 w-3 animate-spin" />
              <span>
                Retry {data.currentRetryAttempt || 1}/{data.retryCount || 3}
              </span>
            </div>
          )}

          {/* Success Status */}
          {data.lastExecutionStatus === 'success' && (
            <div className="flex items-center gap-1">
              <Check className="h-3 w-3 text-green-400" />
              <span className="text-green-400">
                {data.lastStatusCode || 200}
              </span>
              {data.lastExecutionTime !== undefined && (
                <span className="text-text-muted ml-1">
                  ({data.lastExecutionTime}ms)
                </span>
              )}
            </div>
          )}

          {/* Error Status */}
          {data.lastExecutionStatus === 'error' && (
            <div className="flex items-center gap-1">
              <X className="h-3 w-3 text-red-400" />
              <span className="text-red-400">
                {data.lastStatusCode ? `Error ${data.lastStatusCode}` : 'Failed'}
              </span>
            </div>
          )}

          {/* Idle Status */}
          {(!data.lastExecutionStatus || data.lastExecutionStatus === 'idle') && (
            <div className="flex items-center gap-1 text-text-muted">
              <Zap className="h-3 w-3" />
              <span>Ready</span>
            </div>
          )}
        </div>
      </div>

      {/* Source Handle (Output) */}
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 border-2 border-white/20 bg-surface-0"
        style={{ background: nodeColor }}
      />

      {/* Selection Indicator */}
      {selected && (
        <div
          className="absolute -inset-1 rounded-xl opacity-20 blur-sm"
          style={{ background: nodeColor }}
        />
      )}
    </div>
  );
});

WebhookNode.displayName = 'WebhookNode';
