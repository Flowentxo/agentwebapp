'use client';

/**
 * VARIABLE INPUT (Magic Input)
 *
 * A smart input/textarea component that provides autocomplete for
 * variable references when the user types `{{`.
 *
 * Features:
 * - Detects `{{` trigger and shows suggestions
 * - Suggests global context, upstream node outputs, and variables
 * - Graph traversal to find upstream nodes
 * - Keyboard navigation (arrow keys, enter, escape)
 * - Works as both Input and Textarea
 *
 * Part of Phase 2: Frontend State Integration
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { createPortal } from 'react-dom';
import { Node, Edge } from 'reactflow';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  Box,
  Variable,
  Zap,
  ChevronRight,
  Search,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export interface VariableSuggestion {
  /** Display label */
  label: string;
  /** Full variable path (without braces) */
  path: string;
  /** Category for grouping */
  category: 'global' | 'trigger' | 'node' | 'variable';
  /** Optional description */
  description?: string;
  /** Icon component */
  icon?: React.ReactNode;
  /** Nested children for tree structure */
  children?: VariableSuggestion[];
}

export interface VariableInputProps {
  /** Current value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether to render as textarea */
  multiline?: boolean;
  /** Number of rows for textarea */
  rows?: number;
  /** React Flow nodes for upstream calculation */
  nodes?: Node[];
  /** React Flow edges for graph traversal */
  edges?: Edge[];
  /** Current node ID (to find upstream nodes) */
  currentNodeId?: string;
  /** Additional variable suggestions */
  customVariables?: VariableSuggestion[];
  /** Disabled state */
  disabled?: boolean;
  /** CSS class */
  className?: string;
  /** Input ID */
  id?: string;
  /** Name attribute */
  name?: string;
  /** On blur handler */
  onBlur?: () => void;
  /** On focus handler */
  onFocus?: () => void;
}

export interface VariableInputRef {
  focus: () => void;
  blur: () => void;
  insertVariable: (path: string) => void;
}

// ============================================================================
// HELPER: Find upstream nodes via graph traversal
// ============================================================================

function findUpstreamNodes(
  currentNodeId: string,
  nodes: Node[],
  edges: Edge[]
): Node[] {
  const upstream: Set<string> = new Set();
  const visited: Set<string> = new Set();

  function traverse(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    // Find all edges where this node is the target
    const incomingEdges = edges.filter(e => e.target === nodeId);

    for (const edge of incomingEdges) {
      upstream.add(edge.source);
      traverse(edge.source);
    }
  }

  traverse(currentNodeId);

  return nodes.filter(n => upstream.has(n.id));
}

// ============================================================================
// HELPER: Build suggestion list
// ============================================================================

function buildSuggestions(
  nodes: Node[],
  edges: Edge[],
  currentNodeId?: string,
  customVariables?: VariableSuggestion[]
): VariableSuggestion[] {
  const suggestions: VariableSuggestion[] = [];

  // Global context suggestions
  suggestions.push({
    label: 'Global',
    path: 'global',
    category: 'global',
    icon: <Globe size={14} />,
    children: [
      { label: 'userId', path: 'global.userId', category: 'global', description: 'Current user ID' },
      { label: 'userEmail', path: 'global.userEmail', category: 'global', description: 'User email address' },
      { label: 'userName', path: 'global.userName', category: 'global', description: 'User display name' },
      { label: 'workspaceId', path: 'global.workspaceId', category: 'global', description: 'Current workspace' },
      { label: 'timestamp', path: 'global.timestamp', category: 'global', description: 'Execution timestamp' },
      { label: 'isTest', path: 'global.isTest', category: 'global', description: 'Test mode flag' },
    ],
  });

  // Trigger data suggestions
  suggestions.push({
    label: 'Trigger',
    path: 'trigger',
    category: 'trigger',
    icon: <Zap size={14} />,
    children: [
      { label: 'type', path: 'trigger.type', category: 'trigger', description: 'Trigger type (manual/webhook/scheduled)' },
      { label: 'payload', path: 'trigger.payload', category: 'trigger', description: 'Input data/payload' },
      { label: 'timestamp', path: 'trigger.timestamp', category: 'trigger', description: 'Trigger timestamp' },
    ],
  });

  // Upstream node suggestions
  if (currentNodeId && nodes.length > 0 && edges.length > 0) {
    const upstreamNodes = findUpstreamNodes(currentNodeId, nodes, edges);

    if (upstreamNodes.length > 0) {
      const nodesSuggestion: VariableSuggestion = {
        label: 'Nodes',
        path: '',
        category: 'node',
        icon: <Box size={14} />,
        children: [],
      };

      for (const node of upstreamNodes) {
        const nodeLabel = node.data?.label || node.id;
        const nodeId = node.id;

        nodesSuggestion.children!.push({
          label: nodeLabel,
          path: nodeId,
          category: 'node',
          description: `Output from ${node.type || 'node'}`,
          children: [
            { label: 'output', path: `${nodeId}.output`, category: 'node', description: 'Full output object' },
            { label: 'output.data', path: `${nodeId}.output.data`, category: 'node', description: 'Output data' },
            { label: 'output.text', path: `${nodeId}.output.text`, category: 'node', description: 'Text response' },
            { label: 'meta.status', path: `${nodeId}.meta.status`, category: 'node', description: 'Execution status' },
            { label: 'meta.durationMs', path: `${nodeId}.meta.durationMs`, category: 'node', description: 'Execution time' },
          ],
        });
      }

      suggestions.push(nodesSuggestion);
    }
  }

  // Variables suggestions
  suggestions.push({
    label: 'Variables',
    path: 'variables',
    category: 'variable',
    icon: <Variable size={14} />,
    description: 'Custom workflow variables',
  });

  // Custom variables
  if (customVariables && customVariables.length > 0) {
    suggestions.push(...customVariables);
  }

  return suggestions;
}

// ============================================================================
// HELPER: Filter suggestions based on query
// ============================================================================

function filterSuggestions(
  suggestions: VariableSuggestion[],
  query: string
): VariableSuggestion[] {
  if (!query) return suggestions;

  const lowerQuery = query.toLowerCase();

  function filterRecursive(items: VariableSuggestion[]): VariableSuggestion[] {
    const results: VariableSuggestion[] = [];

    for (const item of items) {
      const matches =
        item.label.toLowerCase().includes(lowerQuery) ||
        item.path.toLowerCase().includes(lowerQuery) ||
        item.description?.toLowerCase().includes(lowerQuery);

      if (item.children && item.children.length > 0) {
        const filteredChildren = filterRecursive(item.children);
        if (filteredChildren.length > 0) {
          results.push({ ...item, children: filteredChildren });
        } else if (matches) {
          results.push(item);
        }
      } else if (matches) {
        results.push(item);
      }
    }

    return results;
  }

  return filterRecursive(suggestions);
}

// ============================================================================
// HELPER: Flatten suggestions for keyboard navigation
// ============================================================================

function flattenSuggestions(suggestions: VariableSuggestion[]): VariableSuggestion[] {
  const flat: VariableSuggestion[] = [];

  function flatten(items: VariableSuggestion[], depth = 0) {
    for (const item of items) {
      // Only add leaf nodes (items with paths that can be selected)
      if (!item.children || item.children.length === 0) {
        if (item.path) flat.push(item);
      } else {
        flatten(item.children, depth + 1);
      }
    }
  }

  flatten(suggestions);
  return flat;
}

// ============================================================================
// SUGGESTION DROPDOWN COMPONENT
// ============================================================================

interface SuggestionDropdownProps {
  suggestions: VariableSuggestion[];
  query: string;
  selectedIndex: number;
  onSelect: (suggestion: VariableSuggestion) => void;
  onHover: (index: number) => void;
  position: { top: number; left: number };
}

function SuggestionDropdown({
  suggestions,
  query,
  selectedIndex,
  onSelect,
  onHover,
  position,
}: SuggestionDropdownProps) {
  const flatSuggestions = useMemo(() => flattenSuggestions(suggestions), [suggestions]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'global': return <Globe size={12} className="text-blue-400" />;
      case 'trigger': return <Zap size={12} className="text-yellow-400" />;
      case 'node': return <Box size={12} className="text-purple-400" />;
      case 'variable': return <Variable size={12} className="text-green-400" />;
      default: return null;
    }
  };

  if (flatSuggestions.length === 0) {
    return (
      <div
        className="fixed z-[9999] bg-card border border-white/10 rounded-lg shadow-2xl overflow-hidden"
        style={{ top: position.top, left: position.left, minWidth: 280 }}
      >
        <div className="px-3 py-2 text-sm text-muted-foreground italic">
          No matching variables
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed z-[9999] bg-card border border-white/10 rounded-lg shadow-2xl overflow-hidden"
      style={{ top: position.top, left: position.left, minWidth: 280, maxWidth: 400 }}
    >
      {/* Search indicator */}
      {query && (
        <div className="px-3 py-1.5 border-b border-white/10 flex items-center gap-2 text-xs text-muted-foreground">
          <Search size={12} />
          Filtering: {query}
        </div>
      )}

      {/* Suggestion list */}
      <div className="max-h-64 overflow-y-auto">
        {flatSuggestions.map((suggestion, index) => (
          <button
            key={suggestion.path}
            className={`
              w-full px-3 py-2 flex items-center gap-2 text-left text-sm
              transition-colors cursor-pointer
              ${selectedIndex === index ? 'bg-blue-600/30' : 'hover:bg-card/5'}
            `}
            onClick={() => onSelect(suggestion)}
            onMouseEnter={() => onHover(index)}
          >
            {getCategoryIcon(suggestion.category)}
            <span className="flex-1 font-mono text-xs text-cyan-400">
              {`{{${suggestion.path}}}`}
            </span>
            {suggestion.description && (
              <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                {suggestion.description}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-1.5 border-t border-white/10 text-xs text-muted-foreground flex items-center gap-3">
        <span>↑↓ Navigate</span>
        <span>↵ Select</span>
        <span>Esc Cancel</span>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const VariableInput = forwardRef<VariableInputRef, VariableInputProps>(
  function VariableInput(
    {
      value,
      onChange,
      placeholder,
      multiline = false,
      rows = 3,
      nodes = [],
      edges = [],
      currentNodeId,
      customVariables,
      disabled = false,
      className = '',
      id,
      name,
      onBlur,
      onFocus,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [cursorPosition, setCursorPosition] = useState({ top: 0, left: 0 });
    const [triggerStart, setTriggerStart] = useState<number | null>(null);

    // Build suggestions
    const allSuggestions = useMemo(
      () => buildSuggestions(nodes, edges, currentNodeId, customVariables),
      [nodes, edges, currentNodeId, customVariables]
    );

    const filteredSuggestions = useMemo(
      () => filterSuggestions(allSuggestions, query),
      [allSuggestions, query]
    );

    const flatSuggestions = useMemo(
      () => flattenSuggestions(filteredSuggestions),
      [filteredSuggestions]
    );

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      blur: () => inputRef.current?.blur(),
      insertVariable: (path: string) => {
        const element = inputRef.current;
        if (!element) return;

        const start = element.selectionStart || 0;
        const before = value.slice(0, start);
        const after = value.slice(element.selectionEnd || start);
        const insertion = `{{${path}}}`;

        onChange(before + insertion + after);

        // Move cursor after insertion
        requestAnimationFrame(() => {
          const newPos = start + insertion.length;
          element.setSelectionRange(newPos, newPos);
          element.focus();
        });
      },
    }));

    // Calculate cursor pixel position
    const updateCursorPosition = useCallback(() => {
      const element = inputRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      const lineHeight = parseInt(style.lineHeight) || 20;

      // Create a hidden span to measure text width
      const span = document.createElement('span');
      span.style.font = style.font;
      span.style.position = 'absolute';
      span.style.visibility = 'hidden';
      span.style.whiteSpace = 'pre';

      const cursorIndex = element.selectionStart || 0;
      const textBeforeCursor = value.slice(0, cursorIndex);

      // For textarea, handle multiple lines
      if (multiline) {
        const lines = textBeforeCursor.split('\n');
        span.textContent = lines[lines.length - 1];
        document.body.appendChild(span);

        const textWidth = span.offsetWidth;
        const lineIndex = lines.length - 1;

        document.body.removeChild(span);

        setCursorPosition({
          top: rect.top + window.scrollY + (lineIndex + 1) * lineHeight + 4,
          left: Math.min(rect.left + window.scrollX + textWidth + 8, window.innerWidth - 300),
        });
      } else {
        span.textContent = textBeforeCursor;
        document.body.appendChild(span);

        const textWidth = span.offsetWidth;
        document.body.removeChild(span);

        setCursorPosition({
          top: rect.bottom + window.scrollY + 4,
          left: Math.min(rect.left + window.scrollX + textWidth + 8, window.innerWidth - 300),
        });
      }
    }, [value, multiline]);

    // Handle input changes
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const cursorPos = e.target.selectionStart || 0;

        onChange(newValue);

        // Check for trigger sequence
        if (cursorPos >= 2) {
          const lastTwo = newValue.slice(cursorPos - 2, cursorPos);

          if (lastTwo === '{{') {
            setTriggerStart(cursorPos - 2);
            setShowSuggestions(true);
            setQuery('');
            setSelectedIndex(0);
            updateCursorPosition();
            return;
          }
        }

        // If suggestions are showing, update query
        if (showSuggestions && triggerStart !== null) {
          // Check if we're still in the variable reference
          const textAfterTrigger = newValue.slice(triggerStart, cursorPos);

          if (textAfterTrigger.includes('}}')) {
            // Variable closed, hide suggestions
            setShowSuggestions(false);
            setTriggerStart(null);
          } else if (!textAfterTrigger.startsWith('{{')) {
            // Trigger deleted, hide suggestions
            setShowSuggestions(false);
            setTriggerStart(null);
          } else {
            // Update query (text between {{ and cursor)
            const queryText = textAfterTrigger.slice(2);
            setQuery(queryText);
            setSelectedIndex(0);
            updateCursorPosition();
          }
        }
      },
      [onChange, showSuggestions, triggerStart, updateCursorPosition]
    );

    // Handle selection
    const handleSelect = useCallback(
      (suggestion: VariableSuggestion) => {
        if (triggerStart === null) return;

        const element = inputRef.current;
        if (!element) return;

        const cursorPos = element.selectionStart || 0;
        const before = value.slice(0, triggerStart);
        const after = value.slice(cursorPos);
        const insertion = `{{${suggestion.path}}}`;

        onChange(before + insertion + after);

        setShowSuggestions(false);
        setTriggerStart(null);
        setQuery('');

        // Move cursor after insertion
        requestAnimationFrame(() => {
          const newPos = triggerStart + insertion.length;
          element.setSelectionRange(newPos, newPos);
          element.focus();
        });
      },
      [value, onChange, triggerStart]
    );

    // Handle keyboard navigation
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent) => {
        if (!showSuggestions) return;

        switch (e.key) {
          case 'ArrowDown':
            e.preventDefault();
            setSelectedIndex(i => Math.min(i + 1, flatSuggestions.length - 1));
            break;

          case 'ArrowUp':
            e.preventDefault();
            setSelectedIndex(i => Math.max(i - 1, 0));
            break;

          case 'Enter':
          case 'Tab':
            if (flatSuggestions[selectedIndex]) {
              e.preventDefault();
              handleSelect(flatSuggestions[selectedIndex]);
            }
            break;

          case 'Escape':
            e.preventDefault();
            setShowSuggestions(false);
            setTriggerStart(null);
            break;
        }
      },
      [showSuggestions, flatSuggestions, selectedIndex, handleSelect]
    );

    // Close suggestions on outside click
    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
          setShowSuggestions(false);
          setTriggerStart(null);
        }
      };

      if (showSuggestions) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [showSuggestions]);

    // Base input classes
    const baseClasses = `
      w-full px-3 py-2 rounded-lg
      bg-gray-800/50 border border-white/10
      text-white text-sm font-mono
      placeholder:text-muted-foreground
      focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
      disabled:opacity-50 disabled:cursor-not-allowed
      transition-colors
      ${className}
    `;

    const inputProps = {
      ref: inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>,
      id,
      name,
      value,
      onChange: handleChange,
      onKeyDown: handleKeyDown,
      onBlur,
      onFocus,
      placeholder,
      disabled,
      className: baseClasses,
      spellCheck: false,
      autoComplete: 'off',
    };

    return (
      <>
        {multiline ? (
          <textarea {...inputProps} rows={rows} />
        ) : (
          <input {...inputProps} type="text" />
        )}

        {/* Suggestions dropdown (portal to body) */}
        {showSuggestions &&
          typeof document !== 'undefined' &&
          createPortal(
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.1 }}
              >
                <SuggestionDropdown
                  suggestions={filteredSuggestions}
                  query={query}
                  selectedIndex={selectedIndex}
                  onSelect={handleSelect}
                  onHover={setSelectedIndex}
                  position={cursorPosition}
                />
              </motion.div>
            </AnimatePresence>,
            document.body
          )}
      </>
    );
  }
);

export default VariableInput;
