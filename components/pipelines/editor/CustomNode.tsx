'use client';

import { memo, useMemo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Zap,
  Clock,
  Globe,
  Mail,
  MessageSquare,
  GitBranch,
  Filter,
  Database,
  Code2,
  Send,
  Bot,
  Sparkles,
  Box,
  AlertCircle,
  BarChart3,
  Scale,
  Briefcase,
  Play,
  Loader2,
  type LucideIcon,
} from 'lucide-react';
import { PipelineNodeData, usePipelineStore } from '../store/usePipelineStore';
import { NodeStatusWrapper } from './NodeStatusWrapper';

// ============================================
// AGENT CONFIGURATION
// ============================================

interface AgentConfig {
  id: string;
  name: string;
  icon: LucideIcon;
  gradient: string;
  color: string;
  bgColor: string;
}

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  dexter: {
    id: 'dexter',
    name: 'Dexter',
    icon: BarChart3,
    gradient: 'from-blue-500 to-cyan-500',
    color: '#3B82F6',
    bgColor: 'rgba(59, 130, 246, 0.15)',
  },
  emmie: {
    id: 'emmie',
    name: 'Emmie',
    icon: Mail,
    gradient: 'from-purple-500 to-pink-500',
    color: '#A855F7',
    bgColor: 'rgba(168, 85, 247, 0.15)',
  },
  cassie: {
    id: 'cassie',
    name: 'Cassie',
    icon: Sparkles,
    gradient: 'from-green-500 to-emerald-500',
    color: '#22C55E',
    bgColor: 'rgba(34, 197, 94, 0.15)',
  },
  kai: {
    id: 'kai',
    name: 'Kai',
    icon: Code2,
    gradient: 'from-orange-500 to-amber-500',
    color: '#F97316',
    bgColor: 'rgba(249, 115, 22, 0.15)',
  },
  finn: {
    id: 'finn',
    name: 'Finn',
    icon: Briefcase,
    gradient: 'from-emerald-500 to-teal-500',
    color: '#10B981',
    bgColor: 'rgba(16, 185, 129, 0.15)',
  },
  lex: {
    id: 'lex',
    name: 'Lex',
    icon: Scale,
    gradient: 'from-slate-500 to-gray-500',
    color: '#64748B',
    bgColor: 'rgba(100, 116, 139, 0.15)',
  },
};

const DEFAULT_AGENT_CONFIG: AgentConfig = {
  id: 'default',
  name: 'AI Agent',
  icon: Bot,
  gradient: 'from-violet-500 to-purple-500',
  color: '#8B5CF6',
  bgColor: 'rgba(139, 92, 246, 0.15)',
};

// ============================================
// ICON MAP (for non-agent nodes)
// ============================================

const iconMap: Record<string, LucideIcon> = {
  Zap,
  Clock,
  Globe,
  Mail,
  MessageSquare,
  GitBranch,
  Filter,
  Database,
  Code2,
  Send,
  Bot,
  Sparkles,
  Box,
  BarChart3,
  Scale,
  Briefcase,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function getAgentConfig(agentId?: string): AgentConfig {
  if (!agentId) return DEFAULT_AGENT_CONFIG;
  return AGENT_CONFIGS[agentId] || DEFAULT_AGENT_CONFIG;
}

function truncate(str: string, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

// Validation: Check if required fields are missing
function getValidationStatus(data: PipelineNodeData): { isValid: boolean; message?: string } {
  const config = data.config as Record<string, unknown> | undefined;

  switch (data.type) {
    case 'agent':
      // Agent nodes should have an agentId
      if (!config?.agentId && !data.label?.toLowerCase().match(/dexter|emmie|cassie|kai|finn|lex/)) {
        return { isValid: true }; // Default agents are valid
      }
      return { isValid: true };

    case 'action':
      // HTTP Request needs URL
      if (data.label?.toLowerCase().includes('http') && !config?.url) {
        return { isValid: false, message: 'URL required' };
      }
      // Email needs recipient
      if (data.label?.toLowerCase().includes('email') && !config?.to) {
        return { isValid: false, message: 'Recipient required' };
      }
      return { isValid: true };

    case 'trigger':
      // Webhook is usually valid by default
      return { isValid: true };

    case 'condition':
      // Condition should have a field to check
      if (!config?.field && !config?.expression) {
        return { isValid: false, message: 'Condition required' };
      }
      return { isValid: true };

    default:
      return { isValid: true };
  }
}

// ============================================
// METHOD BADGE COMPONENT
// ============================================

interface MethodBadgeProps {
  method: string;
}

function MethodBadge({ method }: MethodBadgeProps) {
  const colors: Record<string, string> = {
    GET: 'bg-green-500/20 text-green-400 border-green-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  };

  return (
    <span
      className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${colors[method] || 'bg-muted/500/20 text-muted-foreground border-gray-500/30'}`}
    >
      {method}
    </span>
  );
}

// ============================================
// INFO BADGE COMPONENT
// ============================================

interface InfoBadgeProps {
  text: string;
  color?: string;
}

function InfoBadge({ text, color = '#6366F1' }: InfoBadgeProps) {
  return (
    <span
      className="text-[9px] font-medium px-1.5 py-0.5 rounded truncate max-w-[120px] inline-block"
      style={{
        backgroundColor: `${color}20`,
        color: color,
        border: `1px solid ${color}30`
      }}
    >
      {text}
    </span>
  );
}

// ============================================
// CUSTOM NODE COMPONENT
// ============================================

function CustomNodeInner({ data, selected, id }: NodeProps<PipelineNodeData>) {
  // Get store state
  const pipelineId = usePipelineStore((s) => s.pipelineId);
  const updateNodeStatus = usePipelineStore((s) => s.updateNodeStatus);

  // Local state for single node execution
  const [isExecutingNode, setIsExecutingNode] = useState(false);

  // Handle single node execution
  const handleRunNode = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent node selection

    if (!pipelineId || isExecutingNode) return;

    setIsExecutingNode(true);
    updateNodeStatus(id, 'running');

    try {
      const response = await fetch('/api/workflow/execute-node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workflowId: pipelineId,
          nodeId: id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute node');
      }

      const result = await response.json();

      // Update node status and output together with metrics
      updateNodeStatus(id, 'success', {
        data: result.data?.output || result.data,
        duration: result.data?.duration,
        tokensUsed: result.data?.tokensUsed,
        cost: result.data?.cost,
        model: result.data?.model,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[SINGLE_NODE_EXECUTION] Error:', error);
      updateNodeStatus(id, 'error', {
        data: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsExecutingNode(false);
    }
  }, [pipelineId, id, isExecutingNode, updateNodeStatus]);

  // Get configuration
  const config = (data.config || {}) as Record<string, unknown>;

  // Determine agent config for agent nodes
  const agentId = (config.agentId as string) || id.split('-')[0];
  const agentConfig = useMemo(() => {
    if (data.type === 'agent') {
      return getAgentConfig(agentId);
    }
    return null;
  }, [data.type, agentId]);

  // Determine icon and color
  const { Icon, color, bgColor, isGradient } = useMemo(() => {
    if (data.type === 'agent' && agentConfig) {
      return {
        Icon: agentConfig.icon,
        color: agentConfig.color,
        bgColor: agentConfig.bgColor,
        isGradient: true,
        gradient: agentConfig.gradient,
      };
    }

    // Default icon from data or fallback
    const iconName = data.icon || 'Box';
    const DefaultIcon = iconMap[iconName] || Box;
    const defaultColor = data.color || '#6366F1';

    return {
      Icon: DefaultIcon,
      color: defaultColor,
      bgColor: `${defaultColor}20`,
      isGradient: false,
    };
  }, [data.type, data.icon, data.color, agentConfig]);

  // Validation status
  const validation = useMemo(() => getValidationStatus(data), [data]);

  // Extract display info based on node type
  const displayInfo = useMemo(() => {
    const info: { method?: string; badge?: string; subtitle?: string } = {};

    switch (data.type) {
      case 'trigger':
        if (config.method) {
          info.method = config.method as string;
        }
        if (config.path) {
          info.badge = truncate(config.path as string, 15);
        }
        if (config.interval) {
          info.subtitle = `Every ${config.interval}`;
        }
        break;

      case 'action':
        if (config.method) {
          info.method = config.method as string;
        }
        if (config.to) {
          info.badge = truncate(config.to as string, 20);
        }
        if (config.url) {
          info.subtitle = truncate(config.url as string, 25);
        }
        if (config.operation) {
          info.badge = (config.operation as string).toUpperCase();
        }
        break;

      case 'agent':
        if (agentConfig) {
          info.subtitle = agentConfig.name;
        }
        if (config.model) {
          info.badge = truncate(config.model as string, 15);
        }
        break;

      case 'condition':
        if (config.field && config.operator) {
          info.subtitle = `${config.field} ${config.operator} ${config.value || '?'}`;
        }
        break;

      case 'output':
        if (config.responseType) {
          info.badge = (config.responseType as string).toUpperCase();
        }
        break;
    }

    return info;
  }, [data.type, config, agentConfig]);

  return (
    <div
      className={`
        relative min-w-[200px] max-w-[240px] rounded-xl overflow-hidden
        bg-card border-2 transition-all duration-200 shadow-lg
        ${selected
          ? 'border-primary shadow-xl shadow-primary/20 scale-[1.02]'
          : 'border-border hover:border-primary/30 hover:shadow-xl'
        }
        ${!validation.isValid ? 'ring-2 ring-red-500/50 ring-offset-2 ring-offset-background' : ''}
      `}
    >
      {/* Run Node Button (top-right corner) */}
      <button
        onClick={handleRunNode}
        disabled={isExecutingNode || !pipelineId}
        className={`
          absolute -top-2 -right-2 z-20
          flex items-center justify-center w-6 h-6 rounded-full
          shadow-lg transition-all duration-200
          ${isExecutingNode
            ? 'bg-indigo-500 cursor-wait'
            : 'bg-green-500 hover:bg-green-400 hover:scale-110 cursor-pointer'
          }
          ${!pipelineId ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        title={isExecutingNode ? 'Executing...' : 'Run this node only'}
      >
        {isExecutingNode ? (
          <Loader2 className="w-3 h-3 text-white animate-spin" />
        ) : (
          <Play className="w-3 h-3 text-white fill-white" />
        )}
      </button>

      {/* Validation Warning */}
      {!validation.isValid && (
        <div className="absolute -top-2 -left-2 z-10">
          <div className="flex items-center justify-center w-5 h-5 rounded-full bg-red-500 shadow-lg animate-pulse">
            <AlertCircle className="w-3 h-3 text-white" />
          </div>
        </div>
      )}

      {/* Input Handle */}
      {data.type !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Left}
          className="!w-3.5 !h-3.5 !bg-muted !border-2 !border-border hover:!bg-primary hover:!border-primary transition-colors !-left-[7px]"
        />
      )}

      {/* Header - with gradient for agents */}
      <div
        className={`
          flex items-center gap-2.5 px-3 py-2.5
          ${data.type === 'agent' && agentConfig ? `bg-gradient-to-r ${agentConfig.gradient}` : ''}
        `}
        style={data.type !== 'agent' ? { backgroundColor: bgColor } : {}}
      >
        <div
          className={`
            flex items-center justify-center w-8 h-8 rounded-lg
            ${data.type === 'agent' ? 'bg-card/20' : ''}
          `}
          style={data.type !== 'agent' ? { backgroundColor: `${color}30` } : {}}
        >
          <Icon
            className="w-4.5 h-4.5"
            style={{ color: data.type === 'agent' ? 'white' : color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`text-sm font-semibold truncate ${data.type === 'agent' ? 'text-white' : 'text-foreground'}`}
          >
            {data.label}
          </p>
          {displayInfo.subtitle && (
            <p
              className={`text-[10px] truncate ${data.type === 'agent' ? 'text-white/70' : 'text-muted-foreground'}`}
            >
              {displayInfo.subtitle}
            </p>
          )}
        </div>

        {/* Status dot */}
        <div
          className={`w-2 h-2 rounded-full ${validation.isValid ? '' : 'animate-pulse'}`}
          style={{ backgroundColor: validation.isValid ? color : '#EF4444' }}
        />
      </div>

      {/* Info Row - Method Badge & Info Badge */}
      {(displayInfo.method || displayInfo.badge) && (
        <div className="px-3 py-2 border-t border-border flex items-center gap-2 flex-wrap">
          {displayInfo.method && <MethodBadge method={displayInfo.method} />}
          {displayInfo.badge && <InfoBadge text={displayInfo.badge} color={color} />}
        </div>
      )}

      {/* Description */}
      {data.description && (
        <div className="px-3 py-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground line-clamp-2">{data.description}</p>
        </div>
      )}

      {/* Footer - Type Badge */}
      <div className="px-3 py-2 border-t border-border flex items-center justify-between">
        <span
          className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {data.type}
        </span>

        {/* Agent-specific indicator */}
        {data.type === 'agent' && agentConfig && (
          <span className="text-[9px] text-muted-foreground/60 font-medium">
            {agentConfig.name}
          </span>
        )}

        {/* Click hint when selected */}
        {selected && (
          <span className="text-[9px] text-primary font-medium">
            Editing...
          </span>
        )}

        {/* Validation message */}
        {!validation.isValid && validation.message && (
          <span className="text-[9px] text-red-600 font-medium">
            {validation.message}
          </span>
        )}
      </div>

      {/* Output Handle */}
      {data.type !== 'output' && data.type !== 'condition' && (
        <Handle
          type="source"
          position={Position.Right}
          className="!w-3.5 !h-3.5 !bg-muted !border-2 !border-border hover:!bg-primary hover:!border-primary transition-colors !-right-[7px]"
        />
      )}

      {/* Condition - Multiple Outputs with Labels */}
      {data.type === 'condition' && (
        <>
          {/* True branch */}
          <div className="absolute right-0 top-[30%] transform translate-x-full flex items-center">
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              style={{ position: 'relative', top: 0, right: 0, transform: 'none' }}
              className="!w-3.5 !h-3.5 !bg-green-500/50 !border-2 !border-green-400 hover:!bg-green-500 transition-colors"
            />
            <span className="text-[8px] text-green-400 ml-1 font-bold">TRUE</span>
          </div>

          {/* False branch */}
          <div className="absolute right-0 top-[70%] transform translate-x-full flex items-center">
            <Handle
              type="source"
              position={Position.Right}
              id="false"
              style={{ position: 'relative', top: 0, right: 0, transform: 'none' }}
              className="!w-3.5 !h-3.5 !bg-red-500/50 !border-2 !border-red-400 hover:!bg-red-500 transition-colors"
            />
            <span className="text-[8px] text-red-400 ml-1 font-bold">FALSE</span>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// WRAPPED CUSTOM NODE (with execution status)
// ============================================

function CustomNodeComponent(props: NodeProps<PipelineNodeData>) {
  return (
    <NodeStatusWrapper nodeId={props.id}>
      <CustomNodeInner {...props} />
    </NodeStatusWrapper>
  );
}

export const CustomNode = memo(CustomNodeComponent);
