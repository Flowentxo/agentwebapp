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
    // Store the node data in the drag event
    event.dataTransfer.setData('application/reactflow', JSON.stringify(item));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="group flex items-center gap-3 p-3 rounded-xl cursor-grab active:cursor-grabbing
        bg-card/5 hover:bg-card/10 border border-white/10 hover:border-white/20
        transition-all duration-200 hover:shadow-lg hover:shadow-black/20"
    >
      <div
        className="flex items-center justify-center w-9 h-9 rounded-lg"
        style={{ backgroundColor: `${item.color}20` }}
      >
        <Icon className="w-5 h-5" style={{ color: item.color }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{item.label}</p>
        <p className="text-xs text-white/50 truncate">{item.description}</p>
      </div>
    </div>
  );
}

// ============================================
// SIDEBAR COMPONENT
// ============================================

export function PipelineSidebar() {
  return (
    <aside className="w-64 h-full flex flex-col bg-[#0F0F12]/95 backdrop-blur-xl border-r border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white">Components</h2>
        <p className="text-xs text-white/50 mt-1">Drag nodes to the canvas</p>
      </div>

      {/* Search (optional, can expand later) */}
      <div className="flex-shrink-0 p-3">
        <input
          type="text"
          placeholder="Search nodes..."
          className="w-full px-3 py-2 text-sm rounded-lg bg-card/5 border border-white/10
            text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50
            focus:ring-1 focus:ring-indigo-500/50 transition-all"
        />
      </div>

      {/* Categories */}
      <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {nodeCategories.map((category) => (
          <div key={category.title}>
            <h3 className="px-1 mb-2 text-xs font-semibold text-white/40 uppercase tracking-wider">
              {category.title}
            </h3>
            <div className="space-y-2">
              {category.items.map((item) => (
                <DraggableItem key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Hint */}
      <div className="flex-shrink-0 p-4 border-t border-white/10">
        <p className="text-xs text-white/30 text-center">
          Connect nodes by dragging from handles
        </p>
      </div>
    </aside>
  );
}
