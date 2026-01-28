'use client';

/**
 * DATABASE QUERY NODE COMPONENT
 *
 * Custom node for database queries with visual indicators
 * Shows query type, parameters, and cache status
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Database, Zap, Check, X, Clock } from 'lucide-react';

interface DatabaseQueryNodeData {
  label?: string;
  description?: string;
  color?: string;
  enabled?: boolean;
  queryId?: string;
  queryType?: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'CUSTOM';
  parameterCount?: number;
  cacheEnabled?: boolean;
  lastExecutionStatus?: 'success' | 'error' | 'idle';
  lastExecutionTime?: number; // ms
  fromCache?: boolean;
  rowCount?: number;
}

// Color coding by query type
const QUERY_TYPE_COLORS = {
  SELECT: '#3B82F6',   // Blue
  INSERT: '#10B981',   // Green
  UPDATE: '#F59E0B',   // Orange
  DELETE: '#EF4444',   // Red
  CUSTOM: '#6B7280',   // Gray
};

export const DatabaseQueryNode = memo(({ data, selected }: NodeProps<DatabaseQueryNodeData>) => {
  const queryType = data.queryType || 'SELECT';
  const nodeColor = QUERY_TYPE_COLORS[queryType] || data.color || '#3B82F6';
  const paramCount = data.parameterCount || 0;

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
            <Database className="h-5 w-5" style={{ color: nodeColor }} />
          </div>

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-text truncate">
              {data.label || 'Database Query'}
            </h4>
            {data.description && (
              <p className="text-xs text-text-muted line-clamp-1">
                {data.description}
              </p>
            )}
          </div>
        </div>

        {/* Query Info */}
        <div className="mt-3 flex items-center gap-2 text-xs">
          {/* Query Type Badge */}
          <div
            className="px-2 py-0.5 rounded font-medium"
            style={{
              backgroundColor: `${nodeColor}20`,
              color: nodeColor
            }}
          >
            {queryType}
          </div>

          {/* Parameter Count */}
          {paramCount > 0 && (
            <div className="text-text-muted">
              • {paramCount} param{paramCount !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Status Row */}
        <div className="mt-2 flex items-center gap-3 text-xs">
          {/* Cache Status */}
          {data.cacheEnabled && (
            <div className="flex items-center gap-1 text-text-muted">
              <Zap className="h-3 w-3" />
              {data.fromCache ? 'Cached' : 'Cache (5m)'}
            </div>
          )}

          {/* Last Execution Status */}
          {data.lastExecutionStatus && data.lastExecutionStatus !== 'idle' && (
            <div className="flex items-center gap-1">
              {data.lastExecutionStatus === 'success' ? (
                <>
                  <Check className="h-3 w-3 text-green-400" />
                  <span className="text-green-400">
                    {data.lastExecutionTime ? `${data.lastExecutionTime}ms` : 'Success'}
                  </span>
                  {data.rowCount !== undefined && (
                    <span className="text-text-muted ml-1">
                      ({data.rowCount} row{data.rowCount !== 1 ? 's' : ''})
                    </span>
                  )}
                </>
              ) : (
                <>
                  <X className="h-3 w-3 text-red-400" />
                  <span className="text-red-400">Error</span>
                </>
              )}
            </div>
          )}

          {/* Idle Status */}
          {(!data.lastExecutionStatus || data.lastExecutionStatus === 'idle') && (
            <div className="flex items-center gap-1 text-text-muted">
              <Clock className="h-3 w-3" />
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

DatabaseQueryNode.displayName = 'DatabaseQueryNode';
