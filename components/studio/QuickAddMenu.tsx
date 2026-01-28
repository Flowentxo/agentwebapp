'use client';

/**
 * QUICK-ADD MENU
 *
 * Phase 22: Premium Studio Features
 *
 * Command palette-style menu that appears when dragging an edge
 * to empty canvas space. Allows quick node creation and connection.
 *
 * @version 1.0.0
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Node, XYPosition } from 'reactflow';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Brain,
  MessageSquare,
  FileText,
  Code2,
  Search,
  Calendar,
  Mail,
  Slack,
  Database,
  Zap,
  Clock,
  Webhook,
  GitBranch,
  Repeat,
  Timer,
  Settings,
  Send,
  Filter,
  CheckSquare,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface QuickAddMenuProps {
  /** Position to show the menu (screen coordinates) */
  position: { x: number; y: number };
  /** Callback when a node is selected */
  onSelectNode: (nodeTemplate: QuickNodeTemplate) => void;
  /** Callback to close the menu */
  onClose: () => void;
  /** Whether the menu is open */
  isOpen: boolean;
}

export interface QuickNodeTemplate {
  id: string;
  label: string;
  description: string;
  icon: string;
  color: string;
  type: 'trigger' | 'action' | 'agent' | 'condition' | 'output' | 'logic' | 'integration';
  category: 'ai' | 'action' | 'logic' | 'integration' | 'output';
}

// ============================================================================
// QUICK NODE TEMPLATES
// ============================================================================

const QUICK_NODES: QuickNodeTemplate[] = [
  // AI / Agents
  {
    id: 'ai-agent',
    label: 'AI Agent',
    description: 'Process with AI model',
    icon: 'Brain',
    color: '#8B5CF6',
    type: 'agent',
    category: 'ai',
  },
  {
    id: 'chat-completion',
    label: 'Chat Completion',
    description: 'Generate text response',
    icon: 'MessageSquare',
    color: '#06B6D4',
    type: 'action',
    category: 'ai',
  },
  {
    id: 'summarize',
    label: 'Summarize',
    description: 'Summarize content',
    icon: 'FileText',
    color: '#10B981',
    type: 'action',
    category: 'ai',
  },

  // Actions
  {
    id: 'send-email',
    label: 'Send Email',
    description: 'Send an email message',
    icon: 'Mail',
    color: '#EF4444',
    type: 'action',
    category: 'action',
  },
  {
    id: 'send-slack',
    label: 'Send Slack',
    description: 'Post to Slack channel',
    icon: 'Slack',
    color: '#4A154B',
    type: 'action',
    category: 'action',
  },
  {
    id: 'http-request',
    label: 'HTTP Request',
    description: 'Make API call',
    icon: 'Send',
    color: '#F59E0B',
    type: 'action',
    category: 'action',
  },

  // Logic
  {
    id: 'condition',
    label: 'If/Else',
    description: 'Branch based on condition',
    icon: 'GitBranch',
    color: '#F97316',
    type: 'condition',
    category: 'logic',
  },
  {
    id: 'filter',
    label: 'Filter',
    description: 'Filter data items',
    icon: 'Filter',
    color: '#3B82F6',
    type: 'action',
    category: 'logic',
  },
  {
    id: 'loop',
    label: 'Loop',
    description: 'Iterate over items',
    icon: 'Repeat',
    color: '#6366F1',
    type: 'action',
    category: 'logic',
  },
  {
    id: 'delay',
    label: 'Delay',
    description: 'Wait for duration',
    icon: 'Timer',
    color: '#78716C',
    type: 'action',
    category: 'logic',
  },

  // Integrations
  {
    id: 'database-query',
    label: 'Database Query',
    description: 'Query database',
    icon: 'Database',
    color: '#0EA5E9',
    type: 'action',
    category: 'integration',
  },
  {
    id: 'code',
    label: 'Code',
    description: 'Run custom code',
    icon: 'Code2',
    color: '#22C55E',
    type: 'action',
    category: 'integration',
  },

  // Output
  {
    id: 'output',
    label: 'Output',
    description: 'End workflow',
    icon: 'CheckSquare',
    color: '#6366F1',
    type: 'output',
    category: 'output',
  },
];

// Icon mapping
const ICON_MAP: Record<string, any> = {
  Brain,
  MessageSquare,
  FileText,
  Code2,
  Search,
  Calendar,
  Mail,
  Slack,
  Database,
  Zap,
  Clock,
  Webhook,
  GitBranch,
  Repeat,
  Timer,
  Settings,
  Send,
  Filter,
  CheckSquare,
};

// Category labels
const CATEGORY_LABELS: Record<string, string> = {
  ai: 'AI & Agents',
  action: 'Actions',
  logic: 'Logic & Flow',
  integration: 'Integrations',
  output: 'Output',
};

// ============================================================================
// QUICK ADD MENU COMPONENT
// ============================================================================

export function QuickAddMenu({
  position,
  onSelectNode,
  onClose,
  isOpen,
}: QuickAddMenuProps) {
  const [search, setSearch] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when menu opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setSearch('');
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!search) return QUICK_NODES;
    const lowerSearch = search.toLowerCase();
    return QUICK_NODES.filter(
      (node) =>
        node.label.toLowerCase().includes(lowerSearch) ||
        node.description.toLowerCase().includes(lowerSearch)
    );
  }, [search]);

  // Group nodes by category
  const groupedNodes = useMemo(() => {
    const groups: Record<string, QuickNodeTemplate[]> = {};
    filteredNodes.forEach((node) => {
      if (!groups[node.category]) {
        groups[node.category] = [];
      }
      groups[node.category].push(node);
    });
    return groups;
  }, [filteredNodes]);

  // Handle node selection
  const handleSelect = useCallback(
    (node: QuickNodeTemplate) => {
      onSelectNode(node);
      onClose();
    },
    [onSelectNode, onClose]
  );

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] w-72 rounded-xl border border-border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-150"
      style={{
        left: position.x,
        top: position.y,
        transform: 'translate(-50%, 8px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-xs font-medium text-muted-foreground">
          Quick Add Node
        </span>
        <button
          onClick={onClose}
          className="p-1 rounded-md hover:bg-muted transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-2 border-b border-border">
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-muted/50 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
        />
      </div>

      {/* Node List */}
      <div className="max-h-80 overflow-y-auto p-2">
        {filteredNodes.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">No nodes found</p>
          </div>
        ) : (
          Object.entries(groupedNodes).map(([category, nodes]) => (
            <div key={category} className="mb-2">
              <div className="px-2 py-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {CATEGORY_LABELS[category] || category}
                </span>
              </div>
              {nodes.map((node) => {
                const Icon = ICON_MAP[node.icon] || Settings;
                return (
                  <button
                    key={node.id}
                    onClick={() => handleSelect(node)}
                    className="flex w-full items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted transition-colors group"
                  >
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${node.color}20` }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: node.color }}
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-foreground">
                        {node.label}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {node.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ))
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[9px]">Esc</kbd> to close
        </p>
      </div>
    </div>
  );
}

export default QuickAddMenu;
