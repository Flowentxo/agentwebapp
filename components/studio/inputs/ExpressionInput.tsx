'use client';

/**
 * ExpressionInput.tsx
 * Phase 6: Builder Experience Enhancement
 *
 * Smart autocomplete input that triggers on `{{` keystroke.
 * Fetches schema tree from POST /api/dx/discover/:workflowId
 * and presents a searchable tree view for variable selection.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Code2,
  Database,
  Globe,
  Braces,
  Hash,
  Type,
  ToggleLeft,
  List,
  Box,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/contexts/ThemeContext';

// ============================================================================
// TYPES
// ============================================================================

export interface VariablePath {
  path: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'unknown';
  label: string;
  description?: string;
  sampleValue?: any;
  priority?: number;
}

export interface NodeSchema {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  paths: VariablePath[];
}

export interface SchemaDiscoveryResult {
  nodes: NodeSchema[];
  globalVariables: VariablePath[];
  credentialHints?: Array<{ id: string; name: string; provider: string }>;
}

export interface ExpressionInputProps {
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Workflow ID for schema discovery */
  workflowId: string;
  /** Current node ID (to exclude from upstream nodes) */
  currentNodeId?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether this is a multiline input */
  multiline?: boolean;
  /** Number of rows for multiline */
  rows?: number;
  /** Additional className */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Label for accessibility */
  label?: string;
  /** Error message */
  error?: string;
  /** Show inline preview of resolved value */
  showPreview?: boolean;
  /** Preview value (resolved expression) */
  previewValue?: any;
}

interface TreeNode {
  id: string;
  label: string;
  type: 'node' | 'global' | 'path';
  path?: string;
  valueType?: string;
  description?: string;
  sampleValue?: any;
  children?: TreeNode[];
  isExpanded?: boolean;
  priority?: number;
}

// ============================================================================
// ICON HELPERS
// ============================================================================

function getTypeIcon(type: string) {
  switch (type) {
    case 'string':
      return <Type className="w-3.5 h-3.5 text-green-400" />;
    case 'number':
      return <Hash className="w-3.5 h-3.5 text-blue-400" />;
    case 'boolean':
      return <ToggleLeft className="w-3.5 h-3.5 text-yellow-400" />;
    case 'array':
      return <List className="w-3.5 h-3.5 text-purple-400" />;
    case 'object':
      return <Braces className="w-3.5 h-3.5 text-orange-400" />;
    default:
      return <Box className="w-3.5 h-3.5 text-zinc-400" />;
  }
}

function getNodeIcon(nodeType: string) {
  const type = nodeType.toLowerCase();
  if (type.includes('http') || type.includes('api') || type.includes('webhook')) {
    return <Globe className="w-4 h-4 text-blue-400" />;
  }
  if (type.includes('database') || type.includes('sql') || type.includes('query')) {
    return <Database className="w-4 h-4 text-emerald-400" />;
  }
  if (type.includes('code') || type.includes('function') || type.includes('script')) {
    return <Code2 className="w-4 h-4 text-amber-400" />;
  }
  return <Box className="w-4 h-4 text-zinc-400" />;
}

// ============================================================================
// TREE ITEM COMPONENT
// ============================================================================

interface TreeItemProps {
  node: TreeNode;
  depth: number;
  searchQuery: string;
  onSelect: (path: string) => void;
  onToggle: (nodeId: string) => void;
  selectedPath: string | null;
}

function TreeItem({
  node,
  depth,
  searchQuery,
  onSelect,
  onToggle,
  selectedPath,
}: TreeItemProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = node.path === selectedPath;

  // Highlight matching text
  const highlightMatch = (text: string) => {
    if (!searchQuery) return text;
    const regex = new RegExp(`(${searchQuery})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <span key={i} className="bg-yellow-500/30 text-yellow-200 rounded px-0.5">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  const handleClick = () => {
    if (node.type === 'path' && node.path) {
      onSelect(node.path);
    } else if (hasChildren) {
      onToggle(node.id);
    }
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full text-left px-2 py-1.5 flex items-center gap-2 rounded-md transition-colors',
          isSelected
            ? 'bg-primary/20 border-l-2 border-primary'
            : isDark
            ? 'hover:bg-white/5'
            : 'hover:bg-zinc-100',
          node.type === 'path' && 'cursor-pointer'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/Collapse Icon */}
        {hasChildren ? (
          <span className="w-4 h-4 flex items-center justify-center">
            {node.isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
            )}
          </span>
        ) : (
          <span className="w-4 h-4" />
        )}

        {/* Node/Type Icon */}
        {node.type === 'node' ? (
          getNodeIcon(node.valueType || '')
        ) : node.type === 'global' ? (
          <Sparkles className="w-4 h-4 text-purple-400" />
        ) : (
          getTypeIcon(node.valueType || 'unknown')
        )}

        {/* Label */}
        <span
          className={cn(
            'flex-1 text-sm truncate',
            node.type === 'path'
              ? isDark
                ? 'text-zinc-200'
                : 'text-zinc-700'
              : isDark
              ? 'text-white font-medium'
              : 'text-zinc-900 font-medium'
          )}
        >
          {highlightMatch(node.label)}
        </span>

        {/* Type Badge */}
        {node.type === 'path' && node.valueType && (
          <span
            className={cn(
              'text-[10px] px-1.5 py-0.5 rounded font-mono',
              isDark ? 'bg-white/5 text-zinc-500' : 'bg-zinc-100 text-zinc-500'
            )}
          >
            {node.valueType}
          </span>
        )}
      </button>

      {/* Children */}
      <AnimatePresence>
        {hasChildren && node.isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {node.children!.map((child) => (
              <TreeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                searchQuery={searchQuery}
                onSelect={onSelect}
                onToggle={onToggle}
                selectedPath={selectedPath}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ExpressionInput({
  value,
  onChange,
  workflowId,
  currentNodeId,
  placeholder = 'Enter value or type {{ for variables',
  multiline = false,
  rows = 3,
  className,
  disabled = false,
  label,
  error,
  showPreview = false,
  previewValue,
}: ExpressionInputProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  // Refs
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // State
  const [showPopover, setShowPopover] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [schemaData, setSchemaData] = useState<SchemaDiscoveryResult | null>(null);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [triggerPosition, setTriggerPosition] = useState<number | null>(null);

  // ============================================================================
  // FETCH SCHEMA DATA
  // ============================================================================

  const fetchSchemaData = useCallback(async () => {
    if (!workflowId) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/dx/discover/${workflowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentNodeId,
          includeGlobals: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch schema');
      }

      const data: SchemaDiscoveryResult = await response.json();
      setSchemaData(data);
    } catch (err) {
      console.error('[ExpressionInput] Schema discovery failed:', err);
      // Use fallback global variables
      setSchemaData({
        nodes: [],
        globalVariables: [
          { path: '$execution.id', type: 'string', label: 'Execution ID' },
          { path: '$workflow.id', type: 'string', label: 'Workflow ID' },
          { path: '$workflow.name', type: 'string', label: 'Workflow Name' },
          { path: '$now', type: 'string', label: 'Current Timestamp' },
          { path: '$runIndex', type: 'number', label: 'Loop Run Index' },
          { path: '$batchIndex', type: 'number', label: 'Batch Index' },
          { path: '$itemIndex', type: 'number', label: 'Item Index' },
        ],
      });
    } finally {
      setIsLoading(false);
    }
  }, [workflowId, currentNodeId]);

  // ============================================================================
  // BUILD TREE STRUCTURE
  // ============================================================================

  useEffect(() => {
    if (!schemaData) return;

    const nodes: TreeNode[] = [];

    // Add global variables section
    if (schemaData.globalVariables.length > 0) {
      nodes.push({
        id: 'globals',
        label: 'Global Variables',
        type: 'global',
        isExpanded: true,
        children: schemaData.globalVariables.map((v) => ({
          id: `global-${v.path}`,
          label: v.label || v.path,
          type: 'path' as const,
          path: `{{${v.path}}}`,
          valueType: v.type,
          description: v.description,
          sampleValue: v.sampleValue,
          priority: v.priority || 50,
        })),
      });
    }

    // Add upstream nodes
    schemaData.nodes.forEach((node) => {
      const nodeTree: TreeNode = {
        id: `node-${node.nodeId}`,
        label: node.nodeName || node.nodeId,
        type: 'node',
        valueType: node.nodeType,
        isExpanded: false,
        children: node.paths.map((p) => ({
          id: `${node.nodeId}-${p.path}`,
          label: p.label || p.path.split('.').pop() || p.path,
          type: 'path' as const,
          path: `{{$node["${node.nodeName || node.nodeId}"].json.${p.path}}}`,
          valueType: p.type,
          description: p.description,
          sampleValue: p.sampleValue,
          priority: p.priority || 50,
        })),
      };
      nodes.push(nodeTree);
    });

    setTreeNodes(nodes);
  }, [schemaData]);

  // ============================================================================
  // FILTER TREE BY SEARCH
  // ============================================================================

  const filteredTree = useMemo(() => {
    if (!searchQuery) return treeNodes;

    const query = searchQuery.toLowerCase();

    const filterNode = (node: TreeNode): TreeNode | null => {
      // Check if this node matches
      const labelMatches = node.label.toLowerCase().includes(query);
      const pathMatches = node.path?.toLowerCase().includes(query);

      // Filter children
      const filteredChildren = node.children
        ?.map((child) => filterNode(child))
        .filter(Boolean) as TreeNode[];

      // Include if matches or has matching children
      if (labelMatches || pathMatches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          isExpanded: true,
          children: filteredChildren,
        };
      }

      return null;
    };

    return treeNodes.map((node) => filterNode(node)).filter(Boolean) as TreeNode[];
  }, [treeNodes, searchQuery]);

  // ============================================================================
  // POPOVER POSITIONING
  // ============================================================================

  const updatePopoverPosition = useCallback(() => {
    if (!inputRef.current) return;

    const rect = inputRef.current.getBoundingClientRect();
    setPopoverPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 400),
    });
  }, []);

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    const newCursorPos = e.target.selectionStart || 0;

    onChange(newValue);
    setCursorPosition(newCursorPos);

    // Check for {{ trigger
    const textBeforeCursor = newValue.substring(0, newCursorPos);
    const lastTrigger = textBeforeCursor.lastIndexOf('{{');
    const lastClose = textBeforeCursor.lastIndexOf('}}');

    if (lastTrigger > lastClose && lastTrigger !== -1) {
      // Extract search query after {{
      const query = textBeforeCursor.substring(lastTrigger + 2);
      setSearchQuery(query);
      setTriggerPosition(lastTrigger);

      if (!showPopover) {
        setShowPopover(true);
        updatePopoverPosition();
        fetchSchemaData();
      }
    } else {
      setShowPopover(false);
      setTriggerPosition(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showPopover) return;

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setShowPopover(false);
        break;

      case 'Enter':
        if (selectedPath) {
          e.preventDefault();
          insertPath(selectedPath);
        }
        break;

      case 'ArrowDown':
      case 'ArrowUp':
        // TODO: Implement tree navigation with keyboard
        break;
    }
  };

  // ============================================================================
  // PATH INSERTION
  // ============================================================================

  const insertPath = (path: string) => {
    if (triggerPosition === null || !inputRef.current) return;

    const beforeTrigger = value.substring(0, triggerPosition);
    const afterCursor = value.substring(cursorPosition);

    const newValue = beforeTrigger + path + afterCursor;
    onChange(newValue);

    // Move cursor after inserted path
    const newCursorPos = triggerPosition + path.length;
    setTimeout(() => {
      inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
      inputRef.current?.focus();
    }, 0);

    setShowPopover(false);
    setTriggerPosition(null);
    setSearchQuery('');
  };

  // ============================================================================
  // TREE TOGGLE
  // ============================================================================

  const handleToggle = (nodeId: string) => {
    setTreeNodes((prev) =>
      prev.map((node) => {
        if (node.id === nodeId) {
          return { ...node, isExpanded: !node.isExpanded };
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map((child) =>
              child.id === nodeId ? { ...child, isExpanded: !child.isExpanded } : child
            ),
          };
        }
        return node;
      })
    );
  };

  // ============================================================================
  // CLICK OUTSIDE
  // ============================================================================

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ============================================================================
  // WINDOW RESIZE
  // ============================================================================

  useEffect(() => {
    if (showPopover) {
      updatePopoverPosition();
      window.addEventListener('resize', updatePopoverPosition);
      window.addEventListener('scroll', updatePopoverPosition, true);
      return () => {
        window.removeEventListener('resize', updatePopoverPosition);
        window.removeEventListener('scroll', updatePopoverPosition, true);
      };
    }
  }, [showPopover, updatePopoverPosition]);

  // ============================================================================
  // RENDER HIGHLIGHTED VALUE
  // ============================================================================

  const renderHighlightedValue = () => {
    if (!value) return null;

    const regex = /(\{\{[^}]+\}\})/g;
    const parts = value.split(regex);

    return parts.map((part, i) => {
      if (regex.test(part)) {
        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center px-1 py-0.5 rounded font-mono text-xs mx-0.5',
              isDark
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'bg-purple-100 text-purple-700 border border-purple-200'
            )}
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // ============================================================================
  // RENDER INPUT
  // ============================================================================

  const inputProps = {
    ref: inputRef as any,
    value,
    onChange: handleInputChange,
    onKeyDown: handleKeyDown,
    onFocus: () => {
      updatePopoverPosition();
    },
    placeholder,
    disabled,
    'aria-label': label,
    className: cn(
      'w-full rounded-lg transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary/50',
      isDark
        ? 'bg-zinc-900 border border-white/10 text-white placeholder:text-zinc-500'
        : 'bg-white border border-zinc-200 text-zinc-900 placeholder:text-zinc-400',
      error && 'border-red-500 focus:ring-red-500/50',
      multiline ? 'px-3 py-2 resize-none' : 'h-10 px-4',
      className
    ),
  };

  // ============================================================================
  // POPOVER CONTENT
  // ============================================================================

  const popoverContent = showPopover && (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'fixed z-[9999] rounded-xl shadow-2xl overflow-hidden',
        isDark
          ? 'bg-zinc-900 border border-white/10'
          : 'bg-white border border-zinc-200'
      )}
      style={{
        top: popoverPosition.top,
        left: popoverPosition.left,
        width: popoverPosition.width,
        maxHeight: '400px',
      }}
    >
      {/* Search Header */}
      <div
        className={cn(
          'p-3 border-b flex items-center gap-2',
          isDark ? 'border-white/10 bg-zinc-800/50' : 'border-zinc-100 bg-zinc-50'
        )}
      >
        <Search className="w-4 h-4 text-zinc-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search variables..."
          autoFocus
          className={cn(
            'flex-1 bg-transparent border-none outline-none text-sm',
            isDark ? 'text-white placeholder:text-zinc-500' : 'text-zinc-900 placeholder:text-zinc-400'
          )}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="p-1 rounded hover:bg-white/10"
          >
            <X className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        )}
      </div>

      {/* Tree Content */}
      <div className="overflow-y-auto" style={{ maxHeight: '340px' }}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className={cn('ml-2 text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              Discovering variables...
            </span>
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="py-8 text-center">
            <Code2 className="w-8 h-8 mx-auto text-zinc-400 mb-2" />
            <p className={cn('text-sm', isDark ? 'text-zinc-400' : 'text-zinc-500')}>
              No variables found
            </p>
          </div>
        ) : (
          <div className="py-2">
            {filteredTree.map((node) => (
              <TreeItem
                key={node.id}
                node={node}
                depth={0}
                searchQuery={searchQuery}
                onSelect={insertPath}
                onToggle={handleToggle}
                selectedPath={selectedPath}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className={cn(
          'px-3 py-2 border-t text-xs flex items-center gap-4',
          isDark ? 'border-white/10 text-zinc-500 bg-zinc-800/30' : 'border-zinc-100 text-zinc-400 bg-zinc-50'
        )}
      >
        <span>↑↓ Navigate</span>
        <span>Enter Select</span>
        <span>Esc Close</span>
      </div>
    </motion.div>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="relative">
      {/* Label */}
      {label && (
        <label
          className={cn(
            'block text-sm font-medium mb-1.5',
            isDark ? 'text-zinc-300' : 'text-zinc-700'
          )}
        >
          {label}
        </label>
      )}

      {/* Input */}
      {multiline ? (
        <textarea {...inputProps} rows={rows} />
      ) : (
        <input type="text" {...inputProps} />
      )}

      {/* Preview */}
      {showPreview && previewValue !== undefined && (
        <div
          className={cn(
            'mt-1.5 px-2 py-1 rounded text-xs font-mono',
            isDark ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'
          )}
        >
          Preview: {JSON.stringify(previewValue)}
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}

      {/* Hint */}
      <p
        className={cn(
          'mt-1.5 text-xs flex items-center gap-1',
          isDark ? 'text-zinc-500' : 'text-zinc-400'
        )}
      >
        <Code2 className="w-3 h-3" />
        Type{' '}
        <code
          className={cn(
            'px-1 rounded',
            isDark ? 'bg-purple-500/10 text-purple-400' : 'bg-purple-50 text-purple-600'
          )}
        >
          {'{{'}
        </code>{' '}
        to insert variables
      </p>

      {/* Portal Popover */}
      <AnimatePresence>
        {showPopover && typeof window !== 'undefined' && createPortal(popoverContent, document.body)}
      </AnimatePresence>
    </div>
  );
}

export default ExpressionInput;
