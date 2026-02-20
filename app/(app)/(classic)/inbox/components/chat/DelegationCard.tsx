'use client';

/**
 * Glass Cockpit - Delegation Card
 * Visualizes Omni → Agent delegation in the chat stream.
 * Shows which agent is handling a subtask with status indicators.
 */

import { memo, useMemo } from 'react';
import {
  ArrowRight,
  Bot,
  BarChart3,
  Scale,
  Telescope,
  Mail,
  Code2,
  Wallet,
  Headphones,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ToolCallData {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  args?: Record<string, any>;
  result?: {
    success?: boolean;
    data?: any;
    error?: string;
    summary?: string;
  };
}

interface DelegationCardProps {
  tool: ToolCallData;
}

// Agent metadata for visualization
const AGENT_META: Record<string, { name: string; color: string; icon: any }> = {
  dexter: { name: 'Dexter', color: '#3B82F6', icon: BarChart3 },
  lex: { name: 'Lex', color: '#64748B', icon: Scale },
  nova: { name: 'Nova', color: '#06B6D4', icon: Telescope },
  emmie: { name: 'Emmie', color: '#8B5CF6', icon: Mail },
  kai: { name: 'Kai', color: '#10B981', icon: Code2 },
  buddy: { name: 'Buddy', color: '#F59E0B', icon: Wallet },
  cassie: { name: 'Cassie', color: '#10B981', icon: Headphones },
};

function DelegationCardComponent({ tool }: DelegationCardProps) {
  const agentId = tool.args?.agent_id || tool.args?.agentId || '';
  const task = tool.args?.task || tool.args?.message || '';
  const meta = AGENT_META[agentId] || { name: agentId, color: '#7C3AED', icon: Sparkles };
  const AgentIcon = meta.icon;

  const statusConfig = useMemo(() => {
    switch (tool.status) {
      case 'running':
        return {
          label: 'Arbeitet...',
          borderClass: 'border-l-2',
          pulseClass: 'animate-pulse',
          icon: <Loader2 className="w-4 h-4 animate-spin" style={{ color: meta.color }} />,
        };
      case 'completed':
        return {
          label: 'Abgeschlossen',
          borderClass: 'border-l-2',
          pulseClass: '',
          icon: <Check className="w-4 h-4 text-emerald-400" />,
        };
      case 'failed':
        return {
          label: 'Fehlgeschlagen',
          borderClass: 'border-l-2',
          pulseClass: '',
          icon: <AlertCircle className="w-4 h-4 text-red-400" />,
        };
      default:
        return {
          label: 'Delegiert...',
          borderClass: 'border-l-2',
          pulseClass: 'animate-pulse',
          icon: <ArrowRight className="w-4 h-4 text-zinc-400" />,
        };
    }
  }, [tool.status, meta.color]);

  // Truncate task to 120 chars
  const truncatedTask = task.length > 120 ? task.substring(0, 117) + '...' : task;

  // Summary from result
  const summary = tool.result?.summary || tool.result?.data?.summary;

  return (
    <div
      className={cn(
        'rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur-sm mt-2',
        statusConfig.borderClass
      )}
      style={{ borderLeftColor: meta.color }}
    >
      {/* Header: Omni → Agent */}
      <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800/40">
        <Bot className="w-4 h-4 text-violet-400 flex-shrink-0" />
        <span className="text-xs font-medium text-zinc-400">Omni</span>
        <ArrowRight className="w-3 h-3 text-zinc-600" />
        <div
          className="flex items-center gap-1.5"
        >
          <div
            className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: meta.color }}
          >
            <AgentIcon className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-semibold text-zinc-200">{meta.name}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {statusConfig.icon}
          <span className="text-[10px] text-zinc-500">{statusConfig.label}</span>
        </div>
      </div>

      {/* Task description */}
      {truncatedTask && (
        <div className="px-4 py-2 border-t border-white/5">
          <p className="text-xs text-zinc-400 leading-relaxed">
            {truncatedTask}
          </p>
        </div>
      )}

      {/* Result summary (only when completed) */}
      {tool.status === 'completed' && summary && (
        <div className="px-4 py-2 border-t border-white/5 bg-emerald-500/5">
          <p className="text-xs text-emerald-300/80 leading-relaxed">
            {typeof summary === 'string' && summary.length > 200
              ? summary.substring(0, 197) + '...'
              : summary}
          </p>
        </div>
      )}

      {/* Error message */}
      {tool.status === 'failed' && tool.result?.error && (
        <div className="px-4 py-2 border-t border-white/5 bg-red-500/5">
          <p className="text-xs text-red-300/80">{tool.result.error}</p>
        </div>
      )}
    </div>
  );
}

export const DelegationCard = memo(DelegationCardComponent);
