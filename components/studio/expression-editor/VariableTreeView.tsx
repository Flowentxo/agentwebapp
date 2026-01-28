'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Hash,
  Type,
  ToggleLeft,
  Braces,
  List,
  Workflow,
  Database,
  Globe,
  Zap
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';

/**
 * Variable item in the tree
 */
export interface VariableTreeItem {
  path: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'unknown';
  description?: string;
  value?: any;
  children?: VariableTreeItem[];
  source?: 'node' | 'trigger' | 'global' | 'system';
  nodeId?: string;
}

interface VariableTreeViewProps {
  variables: VariableTreeItem[];
  onSelectVariable: (path: string) => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

/**
 * Get icon for variable type
 */
function getTypeIcon(type: string) {
  switch (type) {
    case 'string': return Type;
    case 'number': return Hash;
    case 'boolean': return ToggleLeft;
    case 'object': return Braces;
    case 'array': return List;
    default: return Braces;
  }
}

/**
 * Get icon for variable source
 */
function getSourceIcon(source?: string) {
  switch (source) {
    case 'node': return Workflow;
    case 'trigger': return Zap;
    case 'global': return Globe;
    case 'system': return Database;
    default: return Braces;
  }
}

/**
 * Get color for variable type
 */
function getTypeColor(type: string, isDark: boolean) {
  const colors: Record<string, string> = {
    string: isDark ? 'text-green-400' : 'text-green-600',
    number: isDark ? 'text-blue-400' : 'text-blue-600',
    boolean: isDark ? 'text-orange-400' : 'text-orange-600',
    object: isDark ? 'text-purple-400' : 'text-purple-600',
    array: isDark ? 'text-cyan-400' : 'text-cyan-600',
    unknown: isDark ? 'text-zinc-400' : 'text-muted-foreground',
  };
  return colors[type] || colors.unknown;
}

/**
 * Tree node component
 */
function TreeNode({
  item,
  depth = 0,
  onSelect,
  searchQuery,
  isDark
}: {
  item: VariableTreeItem;
  depth?: number;
  onSelect: (path: string) => void;
  searchQuery?: string;
  isDark: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(depth < 2);
  const hasChildren = item.children && item.children.length > 0;
  const TypeIcon = getTypeIcon(item.type);
  const SourceIcon = getSourceIcon(item.source);

  // Highlight search matches
  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-400/30 text-yellow-200 rounded px-0.5">
          {part}
        </span>
      ) : part
    );
  };

  // Filter children based on search
  const filteredChildren = useMemo(() => {
    if (!searchQuery || !item.children) return item.children;
    return item.children.filter(child =>
      child.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      child.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (child.children && child.children.length > 0)
    );
  }, [item.children, searchQuery]);

  // Auto-expand if search matches children
  const shouldAutoExpand = useMemo(() => {
    if (!searchQuery) return false;
    return filteredChildren && filteredChildren.length > 0;
  }, [searchQuery, filteredChildren]);

  const isExpandedState = searchQuery ? shouldAutoExpand : isExpanded;

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-pointer transition-colors group",
          isDark
            ? "hover:bg-card/5"
            : "hover:bg-muted"
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => hasChildren ? setIsExpanded(!isExpanded) : null}
        onDoubleClick={() => onSelect(item.path)}
      >
        {/* Expand/Collapse Toggle */}
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
          {hasChildren ? (
            isExpandedState ? (
              <ChevronDown className={cn("w-3.5 h-3.5", isDark ? "text-zinc-400" : "text-muted-foreground")} />
            ) : (
              <ChevronRight className={cn("w-3.5 h-3.5", isDark ? "text-zinc-400" : "text-muted-foreground")} />
            )
          ) : null}
        </div>

        {/* Source Icon (for root nodes) */}
        {depth === 0 && (
          <SourceIcon className={cn("w-4 h-4 flex-shrink-0", isDark ? "text-zinc-400" : "text-muted-foreground")} />
        )}

        {/* Type Icon */}
        <TypeIcon className={cn("w-3.5 h-3.5 flex-shrink-0", getTypeColor(item.type, isDark))} />

        {/* Label */}
        <span className={cn(
          "text-sm font-medium truncate flex-1",
          isDark ? "text-white" : "text-zinc-900"
        )}>
          {highlightMatch(item.label)}
        </span>

        {/* Type Badge */}
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded font-mono opacity-60 group-hover:opacity-100 transition-opacity",
          isDark ? "bg-card/5 text-zinc-400" : "bg-muted text-muted-foreground"
        )}>
          {item.type}
        </span>

        {/* Insert Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect(item.path);
          }}
          className={cn(
            "opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded text-xs font-medium transition-all",
            isDark
              ? "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
              : "bg-purple-100 text-purple-600 hover:bg-purple-200"
          )}
        >
          Insert
        </button>
      </div>

      {/* Children */}
      <AnimatePresence initial={false}>
        {isExpandedState && filteredChildren && filteredChildren.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {filteredChildren.map((child) => (
              <TreeNode
                key={child.path}
                item={child}
                depth={depth + 1}
                onSelect={onSelect}
                searchQuery={searchQuery}
                isDark={isDark}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Variable Tree View component
 * Displays available variables in a searchable tree structure
 */
export function VariableTreeView({
  variables,
  onSelectVariable,
  searchQuery = '',
  onSearchChange
}: VariableTreeViewProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery);

  const effectiveSearchQuery = searchQuery || localSearchQuery;
  const handleSearchChange = onSearchChange || setLocalSearchQuery;

  // Filter variables based on search
  const filteredVariables = useMemo(() => {
    if (!effectiveSearchQuery) return variables;

    const query = effectiveSearchQuery.toLowerCase();

    const filterRecursive = (items: VariableTreeItem[]): VariableTreeItem[] => {
      return items.filter(item => {
        const matchesSelf =
          item.label.toLowerCase().includes(query) ||
          item.path.toLowerCase().includes(query);

        if (item.children && item.children.length > 0) {
          const filteredChildren = filterRecursive(item.children);
          if (filteredChildren.length > 0) {
            return true;
          }
        }

        return matchesSelf;
      });
    };

    return filterRecursive(variables);
  }, [variables, effectiveSearchQuery]);

  // Group variables by source
  const groupedVariables = useMemo(() => {
    const groups: Record<string, VariableTreeItem[]> = {
      system: [],
      trigger: [],
      node: [],
      global: [],
    };

    filteredVariables.forEach(v => {
      const source = v.source || 'node';
      if (groups[source]) {
        groups[source].push(v);
      } else {
        groups.node.push(v);
      }
    });

    return groups;
  }, [filteredVariables]);

  return (
    <div className={cn(
      "flex flex-col h-full",
      isDark ? "bg-zinc-900" : "bg-card"
    )}>
      {/* Search Header */}
      <div className={cn(
        "p-3 border-b",
        isDark ? "border-white/10" : "border-border"
      )}>
        <div className="relative">
          <Search className={cn(
            "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4",
            isDark ? "text-zinc-400" : "text-muted-foreground"
          )} />
          <input
            type="text"
            value={effectiveSearchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search variables..."
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm rounded-lg border transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
              isDark
                ? "bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                : "bg-muted/50 border-border text-zinc-900 placeholder:text-muted-foreground"
            )}
          />
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredVariables.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Braces className={cn(
              "w-10 h-10 mb-2",
              isDark ? "text-zinc-600" : "text-slate-300"
            )} />
            <p className={cn(
              "text-sm",
              isDark ? "text-zinc-400" : "text-muted-foreground"
            )}>
              {effectiveSearchQuery ? 'No variables match your search' : 'No variables available'}
            </p>
            {effectiveSearchQuery && (
              <button
                onClick={() => handleSearchChange('')}
                className={cn(
                  "mt-2 text-xs px-3 py-1.5 rounded-lg transition-colors",
                  isDark
                    ? "bg-card/5 text-zinc-400 hover:bg-card/10"
                    : "bg-muted text-muted-foreground hover:bg-slate-200"
                )}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {/* System Variables */}
            {groupedVariables.system.length > 0 && (
              <div className="mb-3">
                <div className={cn(
                  "text-xs font-medium uppercase tracking-wider px-2 py-1",
                  isDark ? "text-zinc-500" : "text-muted-foreground"
                )}>
                  System
                </div>
                {groupedVariables.system.map(item => (
                  <TreeNode
                    key={item.path}
                    item={item}
                    onSelect={onSelectVariable}
                    searchQuery={effectiveSearchQuery}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}

            {/* Trigger Data */}
            {groupedVariables.trigger.length > 0 && (
              <div className="mb-3">
                <div className={cn(
                  "text-xs font-medium uppercase tracking-wider px-2 py-1",
                  isDark ? "text-zinc-500" : "text-muted-foreground"
                )}>
                  Trigger Data
                </div>
                {groupedVariables.trigger.map(item => (
                  <TreeNode
                    key={item.path}
                    item={item}
                    onSelect={onSelectVariable}
                    searchQuery={effectiveSearchQuery}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}

            {/* Node Outputs */}
            {groupedVariables.node.length > 0 && (
              <div className="mb-3">
                <div className={cn(
                  "text-xs font-medium uppercase tracking-wider px-2 py-1",
                  isDark ? "text-zinc-500" : "text-muted-foreground"
                )}>
                  Node Outputs
                </div>
                {groupedVariables.node.map(item => (
                  <TreeNode
                    key={item.path}
                    item={item}
                    onSelect={onSelectVariable}
                    searchQuery={effectiveSearchQuery}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}

            {/* Global Variables */}
            {groupedVariables.global.length > 0 && (
              <div className="mb-3">
                <div className={cn(
                  "text-xs font-medium uppercase tracking-wider px-2 py-1",
                  isDark ? "text-zinc-500" : "text-muted-foreground"
                )}>
                  Global Variables
                </div>
                {groupedVariables.global.map(item => (
                  <TreeNode
                    key={item.path}
                    item={item}
                    onSelect={onSelectVariable}
                    searchQuery={effectiveSearchQuery}
                    isDark={isDark}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Hint */}
      <div className={cn(
        "p-2 border-t text-xs",
        isDark ? "border-white/10 text-zinc-500" : "border-border text-muted-foreground"
      )}>
        <span>Double-click to insert • Use </span>
        <code className={cn(
          "px-1 py-0.5 rounded",
          isDark ? "bg-card/5 text-purple-400" : "bg-muted text-purple-600"
        )}>
          {'{{path}}'}
        </code>
        <span> syntax</span>
      </div>
    </div>
  );
}

export default VariableTreeView;
