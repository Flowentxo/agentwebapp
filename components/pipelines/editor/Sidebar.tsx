'use client';

import { DragEvent } from 'react';
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
  X,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// TYPES
// ============================================

export interface DraggableNodeItem {
  id: string;
  label: string;
  type: 'trigger' | 'action' | 'agent' | 'condition' | 'output';
  icon: LucideIcon;
  color: string;
  description: string;
}

interface NodeCategory {
  title: string;
  items: DraggableNodeItem[];
}

// ============================================
// NODE DEFINITIONS
// ============================================

const nodeCategories: NodeCategory[] = [
  {
    title: 'Triggers',
    items: [
      {
        id: 'webhook',
        label: 'Webhook',
        type: 'trigger',
        icon: Zap,
        color: '#22C55E',
        description: 'Triggered by HTTP request',
      },
      {
        id: 'schedule',
        label: 'Schedule',
        type: 'trigger',
        icon: Clock,
        color: '#22C55E',
        description: 'Runs on a schedule',
      },
    ],
  },
  {
    title: 'Actions',
    items: [
      {
        id: 'http-request',
        label: 'HTTP Request',
        type: 'action',
        icon: Globe,
        color: '#3B82F6',
        description: 'Make API calls',
      },
      {
        id: 'email',
        label: 'Send Email',
        type: 'action',
        icon: Mail,
        color: '#3B82F6',
        description: 'Send an email',
      },
      {
        id: 'database',
        label: 'Database Query',
        type: 'action',
        icon: Database,
        color: '#3B82F6',
        description: 'Query a database',
      },
      {
        id: 'code',
        label: 'Code',
        type: 'action',
        icon: Code2,
        color: '#3B82F6',
        description: 'Run custom code',
      },
    ],
  },
  {
    title: 'AI Agents',
    items: [
      {
        id: 'dexter',
        label: 'Dexter',
        type: 'agent',
        icon: Bot,
        color: '#A855F7',
        description: 'Data Analysis Agent',
      },
      {
        id: 'emmie',
        label: 'Emmie',
        type: 'agent',
        icon: MessageSquare,
        color: '#A855F7',
        description: 'Email Assistant Agent',
      },
      {
        id: 'cassie',
        label: 'Cassie',
        type: 'agent',
        icon: Sparkles,
        color: '#A855F7',
        description: 'Customer Support Agent',
      },
    ],
  },
  {
    title: 'Logic',
    items: [
      {
        id: 'condition',
        label: 'If/Else',
        type: 'condition',
        icon: GitBranch,
        color: '#F59E0B',
        description: 'Conditional branching',
      },
      {
        id: 'filter',
        label: 'Filter',
        type: 'condition',
        icon: Filter,
        color: '#F59E0B',
        description: 'Filter data',
      },
    ],
  },
  {
    title: 'Output',
    items: [
      {
        id: 'response',
        label: 'Response',
        type: 'output',
        icon: Send,
        color: '#EC4899',
        description: 'Send response back',
      },
    ],
  },
];

// ============================================
// DRAGGABLE ITEM COMPONENT
// ============================================

interface DraggableItemProps {
  item: DraggableNodeItem;
}

function DraggableItem({ item }: DraggableItemProps) {
  const Icon = item.icon;

  const onDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing
        hover:bg-white/[0.04] border border-white/[0.06] hover:border-white/10
        transition-all duration-200"
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg"
        style={{ backgroundColor: `${item.color}15` }}
      >
        <Icon className="w-5 h-5" style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.label}</p>
        <p className="text-xs text-white/40 truncate">{item.description}</p>
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

interface PipelineSidebarProps {
  onClose?: () => void;
}

export function PipelineSidebar({ onClose }: PipelineSidebarProps) {
  return (
    <aside
      className="w-64 h-full flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'rgba(17, 17, 17, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06] flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">Components</h2>
          <p className="text-xs text-white/40 mt-1">Drag to canvas</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white/60 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="flex-shrink-0 p-3">
        <input
          type="text"
          placeholder="Search nodes..."
          className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/[0.06]
            text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50
            focus:ring-1 focus:ring-violet-500/50 transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {nodeCategories.map((category) => (
          <div key={category.title}>
            <h3 className="px-1 mb-2 text-xs font-semibold text-white/30 uppercase tracking-wider">
              {category.title}
            </h3>
            <div className="space-y-1.5">
              {category.items.map((item) => (
                <DraggableItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Hint */}
      <div className="flex-shrink-0 p-4 border-t border-white/[0.06]">
        <p className="text-xs text-white/20 text-center">
          Connect nodes by dragging from handles
        </p>
      </div>
    </aside>
  );
}
