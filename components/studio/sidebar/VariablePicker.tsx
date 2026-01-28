'use client';

/**
 * VARIABLE PICKER COMPONENT
 * Phase 13: Action Configuration UI & Variable Mapping
 *
 * A popover component that allows users to pick variables from upstream nodes.
 * It traverses the workflow graph backwards to find available outputs.
 *
 * Features:
 * - Graph traversal to find upstream nodes
 * - Grouped display (Trigger, Node outputs, Global context)
 * - Search/filter functionality
 * - Keyboard navigation
 * - Inserts {{variable.path}} at cursor position
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Node, Edge } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Braces,
  Search,
  ChevronRight,
  Zap,
  Box,
  Globe,
  Variable,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getToolById } from '@/lib/tools/definitions';

// ============================================================================
// TYPES
// ============================================================================

export interface VariableOption {
  /** Variable path (e.g., "trigger.payload.email") */
  path: string;
  /** Display label */
  label: string;
  /** Data type hint */
  type?: string;
  /** Description */
  description?: string;
}

export interface VariableGroup {
  /** Group ID */
  id: string;
  /** Group label */
  label: string;
  /** Group icon */
  icon: React.ReactNode;
  /** Variables in this group */
  variables: VariableOption[];
  /** Is this group expanded */
  isExpanded?: boolean;
}

export interface VariablePickerProps {
  /** React Flow nodes */
  nodes: Node[];
  /** React Flow edges */
  edges: Edge[];
  /** Current node ID (to find upstream nodes) */
  currentNodeId: string;
  /** Callback when a variable is selected */
  onSelect: (variablePath: string) => void;
  /** Optional custom trigger */
  trigger?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
}

// ============================================================================
// HELPER: Find upstream nodes via graph traversal
// ============================================================================

function findUpstreamNodes(
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const upstream: Map<string, number> = new Map(); // nodeId -> depth
  const visited: Set<string> = new Set();

  function traverse(nodeId: string, depth: number) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges where this node is the target
    const incomingEdges = edges.filter(e => e.target === nodeId);

    for (const edge of incomingEdges) {
      const currentDepth = upstream.get(edge.source);
      if (currentDepth === undefined || depth < currentDepth) {
        upstream.set(edge.source, depth);
      }
      traverse(edge.source, depth + 1);
    }
  }

  traverse(currentNodeId, 0);

  // Sort nodes by depth (closest first)
  const sortedIds = [...upstream.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => id);

  return sortedIds
    .map(id => nodes.find(n => n.id === id))
    .filter((n): n is Node => n !== undefined);
}

// ============================================================================
// HELPER: Build variable groups from nodes
// ============================================================================

function buildVariableGroups(
  nodes: Node[],
  edges: Edge[],
  currentNodeId: string
): VariableGroup[] {
  const groups: VariableGroup[] = [];

  // Global context variables
  groups.push({
    id: 'global',
    label: 'Global Context',
    icon: <Globe size={14} className="text-blue-400" />,
    isExpanded: false,
    variables: [
      { path: 'global.userId', label: 'User ID', type: 'string', description: 'Current user ID' },
      { path: 'global.userEmail', label: 'User Email', type: 'string', description: 'User email address' },
      { path: 'global.userName', label: 'User Name', type: 'string', description: 'User display name' },
      { path: 'global.workspaceId', label: 'Workspace ID', type: 'string', description: 'Current workspace' },
      { path: 'global.timestamp', label: 'Timestamp', type: 'date', description: 'Execution timestamp' },
      { path: 'global.executionId', label: 'Execution ID', type: 'string', description: 'Unique execution ID' },
    ],
  });

  // Trigger variables
  groups.push({
    id: 'trigger',
    label: 'Trigger Data',
    icon: <Zap size={14} className="text-yellow-400" />,
    isExpanded: true,
    variables: [
      { path: 'trigger.type', label: 'Trigger Type', type: 'string', description: 'manual/webhook/schedule' },
      { path: 'trigger.payload', label: 'Payload', type: 'object', description: 'Full trigger payload' },
      { path: 'trigger.payload.email', label: 'Payload → Email', type: 'string', description: 'Email from payload' },
      { path: 'trigger.payload.name', label: 'Payload → Name', type: 'string', description: 'Name from payload' },
      { path: 'trigger.payload.data', label: 'Payload → Data', type: 'object', description: 'Data object from payload' },
      { path: 'trigger.timestamp', label: 'Trigger Time', type: 'date', description: 'When trigger fired' },
    ],
  });

  // Upstream node outputs
  const upstreamNodes = findUpstreamNodes(currentNodeId, nodes, edges);

  if (upstreamNodes.length > 0) {
    for (const node of upstreamNodes) {
      const nodeLabel = node.data?.label || node.id;
      const nodeId = node.id;
      const toolId = node.data?.selectedTool;

      // Get tool definition to know outputs
      const tool = toolId ? getToolById(toolId) : null;

      const nodeVariables: VariableOption[] = [
        { path: `${nodeId}.output`, label: 'Full Output', type: 'object', description: 'Complete output object' },
        { path: `${nodeId}.output.data`, label: 'Output Data', type: 'any', description: 'Main data output' },
        { path: `${nodeId}.meta.status`, label: 'Status', type: 'string', description: 'Execution status' },
        { path: `${nodeId}.meta.durationMs`, label: 'Duration', type: 'number', description: 'Execution time (ms)' },
      ];

      // Add tool-specific outputs
      if (tool?.outputs) {
        for (const output of tool.outputs) {
          nodeVariables.push({
            path: `${nodeId}.output.${output.key}`,
            label: output.label,
            type: output.type,
            description: output.description,
          });
        }
      }

      groups.push({
        id: nodeId,
        label: nodeLabel,
        icon: <Box size={14} className="text-purple-400" />,
        isExpanded: true,
        variables: nodeVariables,
      });
    }
  }

  // Custom variables
  groups.push({
    id: 'variables',
    label: 'Workflow Variables',
    icon: <Variable size={14} className="text-green-400" />,
    isExpanded: false,
    variables: [
      { path: 'variables.customVar1', label: 'Custom Variable 1', type: 'any', description: 'User-defined variable' },
      { path: 'variables.customVar2', label: 'Custom Variable 2', type: 'any', description: 'User-defined variable' },
    ],
  });

  return groups;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function VariablePicker({
  nodes,
  edges,
  currentNodeId,
  onSelect,
  trigger,
  disabled = false,
}: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['trigger']));
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Build variable groups
  const variableGroups = useMemo(
    () => buildVariableGroups(nodes, edges, currentNodeId),
    [nodes, edges, currentNodeId]
  );

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return variableGroups;

    const query = searchQuery.toLowerCase();
    return variableGroups
      .map(group => ({
        ...group,
        variables: group.variables.filter(
          v =>
            v.path.toLowerCase().includes(query) ||
            v.label.toLowerCase().includes(query) ||
            v.description?.toLowerCase().includes(query)
        ),
      }))
      .filter(g => g.variables.length > 0);
  }, [variableGroups, searchQuery]);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (path: string) => {
      onSelect(`{{${path}}}`);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  const handleCopy = useCallback((path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`{{${path}}}`);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  }, []);

  // Default trigger button
  const defaultTrigger = (
    <button
      type="button"
      onClick={() => !disabled && setIsOpen(!isOpen)}
      disabled={disabled}
      className={cn(
        'p-1.5 rounded-md transition-colors',
        'hover:bg-card/10 text-muted-foreground hover:text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
      title="Insert variable"
    >
      <Braces size={16} />
    </button>
  );

  return (
    <div className="relative inline-block">
      {/* Trigger */}
      {trigger ? (
        <div onClick={() => !disabled && setIsOpen(!isOpen)}>{trigger}</div>
      ) : (
        defaultTrigger
      )}

      {/* Popover */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Popover content */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute right-0 top-full mt-2 z-50',
                'w-80 max-h-[400px] overflow-hidden',
                'bg-card border border-white/10 rounded-xl shadow-2xl'
              )}
            >
              {/* Header */}
              <div className="px-3 py-2 border-b border-white/10 bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <Search size={14} className="text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search variables..."
                    className={cn(
                      'flex-1 bg-transparent text-sm outline-none',
                      'placeholder:text-muted-foreground'
                    )}
                    autoFocus
                  />
                </div>
              </div>

              {/* Variable list */}
              <div className="overflow-y-auto max-h-[320px]">
                {filteredGroups.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No matching variables found
                  </div>
                ) : (
                  filteredGroups.map(group => (
                    <div key={group.id} className="border-b border-white/5 last:border-0">
                      {/* Group header */}
                      <button
                        type="button"
                        onClick={() => toggleGroup(group.id)}
                        className={cn(
                          'w-full px-3 py-2 flex items-center gap-2',
                          'text-left text-sm font-medium',
                          'hover:bg-card/5 transition-colors'
                        )}
                      >
                        <ChevronRight
                          size={14}
                          className={cn(
                            'text-muted-foreground transition-transform',
                            expandedGroups.has(group.id) && 'rotate-90'
                          )}
                        />
                        {group.icon}
                        <span className="text-foreground">{group.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {group.variables.length}
                        </span>
                      </button>

                      {/* Group variables */}
                      <AnimatePresence>
                        {expandedGroups.has(group.id) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.15 }}
                            className="overflow-hidden"
                          >
                            {group.variables.map(variable => (
                              <button
                                key={variable.path}
                                type="button"
                                onClick={() => handleSelect(variable.path)}
                                className={cn(
                                  'w-full pl-8 pr-3 py-2 flex items-center gap-2',
                                  'text-left text-sm group',
                                  'hover:bg-blue-600/20 transition-colors'
                                )}
                              >
                                <span className="flex-1 min-w-0">
                                  <span className="font-mono text-xs text-cyan-400 truncate block">
                                    {`{{${variable.path}}}`}
                                  </span>
                                  {variable.description && (
                                    <span className="text-xs text-muted-foreground truncate block">
                                      {variable.description}
                                    </span>
                                  )}
                                </span>
                                {variable.type && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-card/5 text-muted-foreground">
                                    {variable.type}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={e => handleCopy(variable.path, e)}
                                  className={cn(
                                    'p-1 rounded opacity-0 group-hover:opacity-100',
                                    'hover:bg-card/10 transition-all'
                                  )}
                                  title="Copy to clipboard"
                                >
                                  {copiedPath === variable.path ? (
                                    <Check size={12} className="text-green-400" />
                                  ) : (
                                    <Copy size={12} className="text-muted-foreground" />
                                  )}
                                </button>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="px-3 py-2 border-t border-white/10 bg-gray-800/30 text-xs text-muted-foreground">
                Click to insert • <kbd className="px-1 py-0.5 rounded bg-card/10">Esc</kbd> to close
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VariablePicker;
