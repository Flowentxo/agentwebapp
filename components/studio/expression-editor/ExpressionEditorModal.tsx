'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Node } from 'reactflow';
import {
  X,
  Code2,
  Eye,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Braces,
  Type,
  Hash,
  ToggleLeft,
  List,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { VariableTreeView, VariableTreeItem } from './VariableTreeView';
import {
  useExpressionPreview,
  WorkflowContext,
  extractAvailableVariables
} from './useExpressionPreview';

interface ExpressionEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialValue: string;
  onSave: (value: string) => void;
  workflowContext: WorkflowContext;
  title?: string;
  placeholder?: string;
}

/**
 * Format preview value for display
 */
function formatPreviewValue(value: any): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2);
  }
  return String(value);
}

/**
 * Get type icon component
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
 * Convert available variables to tree structure
 */
function buildVariableTree(
  variables: ReturnType<typeof extractAvailableVariables>,
  nodes: Node[]
): VariableTreeItem[] {
  const tree: VariableTreeItem[] = [];

  // Add system variables
  const systemVars: VariableTreeItem[] = [
    {
      path: '$json',
      label: '$json',
      type: 'object',
      description: 'Current item data',
      source: 'system'
    },
    {
      path: '$itemIndex',
      label: '$itemIndex',
      type: 'number',
      description: 'Current item index',
      source: 'system'
    },
    {
      path: '$itemCount',
      label: '$itemCount',
      type: 'number',
      description: 'Total item count',
      source: 'system'
    }
  ];

  tree.push({
    path: '',
    label: 'Item Context',
    type: 'object',
    source: 'system',
    children: systemVars
  });

  // Add input methods
  const inputMethods: VariableTreeItem[] = [
    {
      path: '$input.first()',
      label: 'first()',
      type: 'object',
      description: 'First input item',
      source: 'system'
    },
    {
      path: '$input.last()',
      label: 'last()',
      type: 'object',
      description: 'Last input item',
      source: 'system'
    },
    {
      path: '$input.all()',
      label: 'all()',
      type: 'array',
      description: 'All input items',
      source: 'system'
    },
    {
      path: '$input.item',
      label: 'item',
      type: 'object',
      description: 'Current input item',
      source: 'system'
    }
  ];

  tree.push({
    path: '$input',
    label: '$input',
    type: 'object',
    source: 'system',
    description: 'Input data accessors',
    children: inputMethods
  });

  // Group node outputs
  const nodeOutputMap = new Map<string, VariableTreeItem>();

  variables
    .filter(v => v.path.startsWith('$node['))
    .forEach(v => {
      const nodeMatch = v.path.match(/\$node\["([^"]+)"\]/);
      if (nodeMatch) {
        const nodeName = nodeMatch[1];
        if (!nodeOutputMap.has(nodeName)) {
          nodeOutputMap.set(nodeName, {
            path: `$node["${nodeName}"].json`,
            label: nodeName,
            type: 'object',
            source: 'node',
            description: `Output from ${nodeName}`,
            children: []
          });
        }
      }
    });

  // Add trigger data
  const triggerVars = variables.filter(v => v.path.startsWith('trigger.'));
  if (triggerVars.length > 0) {
    const triggerChildren: VariableTreeItem[] = triggerVars.map(v => ({
      path: v.path,
      label: v.label.replace('trigger.payload.', ''),
      type: v.type as any,
      description: v.description,
      source: 'trigger' as const,
      value: v.value
    }));

    tree.push({
      path: 'trigger',
      label: 'Trigger Data',
      type: 'object',
      source: 'trigger',
      children: triggerChildren
    });
  }

  // Add node outputs
  nodeOutputMap.forEach(nodeItem => {
    tree.push(nodeItem);
  });

  // Add global variables
  const globalVars = variables.filter(v => v.path.startsWith('global.'));
  if (globalVars.length > 0) {
    const globalChildren: VariableTreeItem[] = globalVars.map(v => ({
      path: v.path,
      label: v.label.replace('global.', ''),
      type: v.type as any,
      description: v.description,
      source: 'global' as const,
      value: v.value
    }));

    tree.push({
      path: 'global',
      label: 'Global Variables',
      type: 'object',
      source: 'global',
      children: globalChildren
    });
  }

  return tree;
}

/**
 * Expression Editor Modal
 *
 * A full-featured modal for editing expressions with:
 * - Variable Selector (left panel) - searchable tree view
 * - Expression Area (center) - text editor with syntax highlighting
 * - Preview Area (right panel) - live evaluation results
 */
export function ExpressionEditorModal({
  isOpen,
  onClose,
  initialValue,
  onSave,
  workflowContext,
  title = 'Edit Expression',
  placeholder = 'Enter expression using {{variable}} syntax...'
}: ExpressionEditorModalProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [expression, setExpression] = useState(initialValue);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get available variables
  const availableVariables = useMemo(
    () => extractAvailableVariables(workflowContext),
    [workflowContext]
  );

  // Build variable tree
  const variableTree = useMemo(
    () => buildVariableTree(availableVariables, workflowContext.nodes),
    [availableVariables, workflowContext.nodes]
  );

  // Real-time expression preview
  const { result, isEvaluating } = useExpressionPreview(
    expression,
    workflowContext,
    200
  );

  // Reset expression when modal opens
  useEffect(() => {
    if (isOpen) {
      setExpression(initialValue);
    }
  }, [isOpen, initialValue]);

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isOpen]);

  // Insert variable at cursor position
  const insertVariable = useCallback((path: string) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    const insertText = `{{${path}}}`;
    const newValue =
      expression.substring(0, start) +
      insertText +
      expression.substring(end);

    setExpression(newValue);

    // Set cursor after inserted text
    setTimeout(() => {
      const newPosition = start + insertText.length;
      textarea.setSelectionRange(newPosition, newPosition);
      textarea.focus();
    }, 0);
  }, [expression]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave(expression);
    onClose();
  }, [expression, onSave, onClose]);

  // Handle copy result
  const handleCopyResult = useCallback(() => {
    const textToCopy = formatPreviewValue(result.value);
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result.value]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Cmd/Ctrl + Enter to save
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }

      // Escape to close
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleSave, onClose]);

  // Render highlighted expression
  const renderHighlightedExpression = () => {
    if (!expression) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(expression)) !== null) {
      // Text before variable
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className={isDark ? "text-zinc-300" : "text-muted-foreground"}>
            {expression.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Variable
      const variablePath = match[1].trim();
      const isValid = availableVariables.some(
        v => v.path === variablePath || v.label === variablePath
      );

      parts.push(
        <span
          key={`var-${match.index}`}
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded font-mono text-xs mx-0.5",
            isValid
              ? isDark
                ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                : "bg-purple-100 text-purple-700 border border-purple-200"
              : isDark
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "bg-red-500/20 text-red-700 border border-red-500/30"
          )}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < expression.length) {
      parts.push(
        <span key={`text-${lastIndex}`} className={isDark ? "text-zinc-300" : "text-muted-foreground"}>
          {expression.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  if (!isOpen) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn(
              "fixed inset-8 z-50 flex flex-col rounded-2xl overflow-hidden shadow-2xl",
              isDark
                ? "bg-zinc-900 border border-white/10"
                : "bg-card border border-border"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-6 py-4 border-b",
              isDark ? "border-white/10 bg-zinc-800/50" : "border-border bg-muted/50"
            )}>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-lg",
                  isDark ? "bg-purple-500/20" : "bg-purple-100"
                )}>
                  <Code2 className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <h2 className={cn(
                    "text-lg font-semibold",
                    isDark ? "text-white" : "text-zinc-900"
                  )}>
                    {title}
                  </h2>
                  <p className={cn(
                    "text-sm",
                    isDark ? "text-zinc-400" : "text-muted-foreground"
                  )}>
                    Use {'{{path}}'} syntax to reference variables
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onClose}
                  className={cn(
                    "p-2 rounded-lg transition-colors",
                    isDark
                      ? "hover:bg-card/10 text-zinc-400"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content - 3 Column Layout */}
            <div className="flex-1 flex overflow-hidden">
              {/* Left Panel - Variable Selector */}
              <div className={cn(
                "w-72 border-r flex-shrink-0",
                isDark ? "border-white/10" : "border-border"
              )}>
                <VariableTreeView
                  variables={variableTree}
                  onSelectVariable={insertVariable}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                />
              </div>

              {/* Center Panel - Expression Editor */}
              <div className="flex-1 flex flex-col min-w-0">
                <div className={cn(
                  "px-4 py-2 border-b flex items-center gap-2",
                  isDark ? "border-white/10 bg-zinc-800/30" : "border-border bg-muted/50/50"
                )}>
                  <Code2 className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-muted-foreground")} />
                  <span className={cn(
                    "text-sm font-medium",
                    isDark ? "text-zinc-300" : "text-muted-foreground"
                  )}>
                    Expression
                  </span>
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  {/* Preview Layer */}
                  <div className="relative">
                    <div
                      className={cn(
                        "absolute inset-0 p-4 pointer-events-none whitespace-pre-wrap break-words font-mono text-sm",
                        isDark ? "text-zinc-300" : "text-muted-foreground"
                      )}
                      style={{ color: 'transparent' }}
                    >
                      {renderHighlightedExpression()}
                    </div>

                    {/* Actual Textarea */}
                    <textarea
                      ref={textareaRef}
                      value={expression}
                      onChange={(e) => setExpression(e.target.value)}
                      placeholder={placeholder}
                      spellCheck={false}
                      className={cn(
                        "w-full h-64 p-4 rounded-lg border resize-none font-mono text-sm",
                        "focus:outline-none focus:ring-2 focus:ring-purple-500/50",
                        isDark
                          ? "bg-zinc-800/50 border-white/10 text-white placeholder:text-zinc-500"
                          : "bg-card border-border text-zinc-900 placeholder:text-muted-foreground",
                        "caret-purple-500"
                      )}
                    />
                  </div>

                  {/* Syntax Help */}
                  <div className={cn(
                    "mt-4 p-3 rounded-lg flex items-start gap-2",
                    isDark ? "bg-zinc-800/50" : "bg-muted/50"
                  )}>
                    <HelpCircle className={cn(
                      "w-4 h-4 mt-0.5 flex-shrink-0",
                      isDark ? "text-zinc-500" : "text-muted-foreground"
                    )} />
                    <div className={cn(
                      "text-xs space-y-1",
                      isDark ? "text-zinc-400" : "text-muted-foreground"
                    )}>
                      <p>
                        <strong>Syntax:</strong> Use{' '}
                        <code className={cn(
                          "px-1 py-0.5 rounded",
                          isDark ? "bg-card/5 text-purple-400" : "bg-slate-200 text-purple-600"
                        )}>
                          {'{{$json.field}}'}
                        </code>{' '}
                        for current item,{' '}
                        <code className={cn(
                          "px-1 py-0.5 rounded",
                          isDark ? "bg-card/5 text-purple-400" : "bg-slate-200 text-purple-600"
                        )}>
                          {'{{$node["Name"].json.field}}'}
                        </code>{' '}
                        for node outputs.
                      </p>
                      <p>
                        <strong>Tip:</strong> Double-click variables in the left panel to insert them at cursor position.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Preview */}
              <div className={cn(
                "w-80 border-l flex-shrink-0 flex flex-col",
                isDark ? "border-white/10" : "border-border"
              )}>
                <div className={cn(
                  "px-4 py-2 border-b flex items-center justify-between",
                  isDark ? "border-white/10 bg-zinc-800/30" : "border-border bg-muted/50/50"
                )}>
                  <div className="flex items-center gap-2">
                    <Eye className={cn("w-4 h-4", isDark ? "text-zinc-400" : "text-muted-foreground")} />
                    <span className={cn(
                      "text-sm font-medium",
                      isDark ? "text-zinc-300" : "text-muted-foreground"
                    )}>
                      Preview
                    </span>
                  </div>

                  {isEvaluating && (
                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                  )}
                </div>

                <div className="flex-1 p-4 overflow-auto">
                  {/* Status Badge */}
                  <div className={cn(
                    "flex items-center gap-2 p-2 rounded-lg mb-3",
                    result.success
                      ? isDark
                        ? "bg-green-500/10 border border-green-500/20"
                        : "bg-green-50 border border-green-200"
                      : isDark
                        ? "bg-red-500/10 border border-red-500/20"
                        : "bg-red-500/10 border border-red-500/30"
                  )}>
                    {result.success ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={cn(
                      "text-sm font-medium",
                      result.success
                        ? isDark ? "text-green-400" : "text-green-700"
                        : isDark ? "text-red-400" : "text-red-700"
                    )}>
                      {result.success ? 'Valid Expression' : 'Error'}
                    </span>

                    {result.success && (
                      <span className={cn(
                        "ml-auto text-xs px-2 py-0.5 rounded",
                        isDark ? "bg-card/5 text-zinc-400" : "bg-muted text-muted-foreground"
                      )}>
                        {result.valueType}
                      </span>
                    )}
                  </div>

                  {/* Error Message */}
                  {!result.success && result.error && (
                    <div className={cn(
                      "p-3 rounded-lg mb-3 text-sm",
                      isDark
                        ? "bg-red-500/10 text-red-300 border border-red-500/20"
                        : "bg-red-500/10 text-red-700 border border-red-500/30"
                    )}>
                      {result.error}
                    </div>
                  )}

                  {/* Preview Result */}
                  {result.success && (
                    <div className="relative">
                      <div className={cn(
                        "flex items-center justify-between mb-2"
                      )}>
                        <span className={cn(
                          "text-xs font-medium uppercase tracking-wider",
                          isDark ? "text-zinc-500" : "text-muted-foreground"
                        )}>
                          Result
                        </span>
                        <button
                          onClick={handleCopyResult}
                          className={cn(
                            "flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors",
                            isDark
                              ? "hover:bg-card/5 text-zinc-400"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          {copied ? (
                            <>
                              <Check className="w-3 h-3 text-green-500" />
                              <span className="text-green-500">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      <pre className={cn(
                        "p-3 rounded-lg text-sm font-mono overflow-auto max-h-64",
                        isDark
                          ? "bg-zinc-800 text-zinc-100 border border-white/5"
                          : "bg-muted/50 text-foreground border border-border"
                      )}>
                        {formatPreviewValue(result.value)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className={cn(
              "flex items-center justify-between px-6 py-4 border-t",
              isDark ? "border-white/10 bg-zinc-800/50" : "border-border bg-muted/50"
            )}>
              <div className={cn(
                "text-xs",
                isDark ? "text-zinc-500" : "text-muted-foreground"
              )}>
                <kbd className={cn(
                  "px-1.5 py-0.5 rounded",
                  isDark ? "bg-card/10" : "bg-slate-200"
                )}>
                  Esc
                </kbd>
                {' '}to cancel{' • '}
                <kbd className={cn(
                  "px-1.5 py-0.5 rounded",
                  isDark ? "bg-card/10" : "bg-slate-200"
                )}>
                  {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                </kbd>
                {' + '}
                <kbd className={cn(
                  "px-1.5 py-0.5 rounded",
                  isDark ? "bg-card/10" : "bg-slate-200"
                )}>
                  Enter
                </kbd>
                {' '}to save
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isDark
                      ? "hover:bg-card/10 text-zinc-300"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!result.success}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    result.success
                      ? "bg-purple-500 hover:bg-purple-600 text-white"
                      : isDark
                        ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                        : "bg-slate-200 text-muted-foreground cursor-not-allowed"
                  )}
                >
                  Save Expression
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  // Render in portal
  if (typeof window === 'undefined') return null;
  return createPortal(modalContent, document.body);
}

export default ExpressionEditorModal;
