'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Node } from 'reactflow';
import { Variable } from '@/lib/studio/variable-types';
import { VariableStore } from '@/lib/studio/variable-store';
import { Code2, ChevronDown, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { ExpressionEditorModal, WorkflowContext } from './expression-editor';

interface VariableInputProps {
  value: string;
  onChange: (value: string) => void;
  variableStore: VariableStore;
  placeholder?: string;
  rows?: number;
  className?: string;
  disabled?: boolean;
  /** Workflow nodes for expression editor context */
  nodes?: Node[];
  /** Node outputs for expression preview */
  nodeOutputs?: Record<string, any>;
  /** Trigger data for expression preview */
  triggerData?: any;
  /** Whether to show the expand button to open the expression editor modal */
  showExpandButton?: boolean;
}

interface AutocompleteItem {
  variable: Variable;
  displayText: string;
  insertText: string;
}

export function VariableInput({
  value,
  onChange,
  variableStore,
  placeholder = 'Enter text or use {{variable_name}}',
  rows = 3,
  className = '',
  disabled = false,
  nodes = [],
  nodeOutputs = {},
  triggerData = {},
  showExpandButton = true
}: VariableInputProps) {
  // Theme support
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteItems, setAutocompleteItems] = useState<AutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [autocompletePosition, setAutocompletePosition] = useState({ top: 0, left: 0 });
  const [isExpressionEditorOpen, setIsExpressionEditorOpen] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Get all available variables
  const variables = variableStore.getAll();

  // Build workflow context for expression editor
  const workflowContext = useMemo<WorkflowContext>(() => {
    // Convert VariableStore variables to global variables for expression context
    const globalVariables: Record<string, any> = {};
    variables.forEach(v => {
      if (v.currentValue !== undefined) {
        globalVariables[v.name] = v.currentValue;
      }
    });

    return {
      nodes,
      nodeOutputs,
      triggerData,
      globalVariables,
    };
  }, [nodes, nodeOutputs, triggerData, variables]);

  // Detect {{ trigger and show autocomplete
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);

    // Check if we're typing inside {{}}
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');
    const lastCloseBrace = textBeforeCursor.lastIndexOf('}}');

    // Show autocomplete if {{ is more recent than }}
    if (lastOpenBrace > lastCloseBrace && lastOpenBrace !== -1) {
      const searchQuery = textBeforeCursor.substring(lastOpenBrace + 2).toLowerCase();

      // Filter variables based on search
      const filtered = variables
        .filter(v =>
          v.name.toLowerCase().includes(searchQuery) ||
          v.displayName.toLowerCase().includes(searchQuery)
        )
        .map(v => ({
          variable: v,
          displayText: `${v.displayName} (${v.name})`,
          insertText: v.name
        }));

      if (filtered.length > 0) {
        setAutocompleteItems(filtered);
        setSelectedIndex(0);
        setShowAutocomplete(true);

        // Calculate autocomplete position
        const coords = getCaretCoordinates();
        setAutocompletePosition(coords);
      } else {
        setShowAutocomplete(false);
      }
    } else {
      setShowAutocomplete(false);
    }
  }, [value, cursorPosition, variables]);

  // Get caret coordinates for autocomplete positioning
  const getCaretCoordinates = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };

    const textarea = textareaRef.current;
    const rect = textarea.getBoundingClientRect();

    // Approximate position (can be improved with a library like textarea-caret)
    return {
      top: rect.bottom,
      left: rect.left + 10
    };
  };

  // Handle keyboard navigation in autocomplete
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showAutocomplete) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < autocompleteItems.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
        break;

      case 'Enter':
      case 'Tab':
        if (autocompleteItems.length > 0) {
          e.preventDefault();
          insertVariable(autocompleteItems[selectedIndex]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setShowAutocomplete(false);
        break;
    }
  };

  // Insert selected variable
  const insertVariable = (item: AutocompleteItem) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);

    // Find the {{ position
    const lastOpenBrace = textBeforeCursor.lastIndexOf('{{');

    // Replace from {{ to cursor with the variable
    const newText =
      value.substring(0, lastOpenBrace) +
      `{{${item.insertText}}}` +
      textAfterCursor;

    onChange(newText);
    setShowAutocomplete(false);

    // Set cursor after the inserted variable
    setTimeout(() => {
      const newCursorPos = lastOpenBrace + item.insertText.length + 4;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // Handle manual variable insertion from button
  const handleInsertVariable = (variable: Variable) => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const textAfterCursor = value.substring(cursorPos);

    const variableText = `{{${variable.name}}}`;
    const newText = textBeforeCursor + variableText + textAfterCursor;

    onChange(newText);

    // Set cursor after the inserted variable
    setTimeout(() => {
      const newCursorPos = cursorPos + variableText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  // Highlight variables in the text
  const renderHighlightedText = () => {
    if (!value) return null;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const regex = /\{\{([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(value)) !== null) {
      // Add text before the variable
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`}>
            {value.substring(lastIndex, match.index)}
          </span>
        );
      }

      // Add highlighted variable
      const variableName = match[1];
      const variable = variableStore.get(variableName);

      parts.push(
        <span
          key={`var-${match.index}`}
          className={cn(
            "inline-flex items-center px-1.5 py-0.5 rounded font-mono text-xs",
            variable
              ? isDark
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-purple-100 text-purple-700 border border-purple-200'
              : isDark
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : 'bg-red-500/20 text-red-700 border border-red-500/30'
          )}
        >
          {match[0]}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < value.length) {
      parts.push(
        <span key={`text-${lastIndex}`}>
          {value.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <>
      <div className="relative">
        {/* Preview Layer with Syntax Highlighting */}
        <div className="relative">
          <div
            className={cn(
              "absolute inset-0 px-3 py-2 whitespace-pre-wrap break-words pointer-events-none",
              isDark ? "text-white" : "text-zinc-900"
            )}
            style={{
              fontFamily: 'inherit',
              fontSize: 'inherit',
              lineHeight: 'inherit',
              color: 'transparent'
            }}
          >
            {renderHighlightedText()}
          </div>

          {/* Actual Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              setCursorPosition(e.target.selectionStart);
            }}
            onKeyDown={handleKeyDown}
            onSelect={(e) => {
              const target = e.target as HTMLTextAreaElement;
              setCursorPosition(target.selectionStart);
            }}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={cn(
              "w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none relative",
              isDark
                ? "bg-zinc-800 border-white/10 text-white placeholder:text-zinc-500"
                : "bg-card border-border text-zinc-900 placeholder:text-muted-foreground",
              showExpandButton && "pr-10",
              className
            )}
            style={{
              caretColor: isDark ? 'white' : 'black'
            }}
          />

          {/* Expand Button */}
          {showExpandButton && !disabled && (
            <button
              onClick={() => setIsExpressionEditorOpen(true)}
              className={cn(
                "absolute right-2 top-2 p-1.5 rounded-md transition-colors",
                isDark
                  ? "hover:bg-card/10 text-zinc-400 hover:text-white"
                  : "hover:bg-muted text-muted-foreground hover:text-muted-foreground"
              )}
              title="Open Expression Editor"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Variable Quick Insert Dropdown */}
        {variables.length > 0 && !disabled && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className={cn(
              "text-xs flex items-center gap-1",
              isDark ? "text-zinc-400" : "text-muted-foreground"
            )}>
              <Code2 className="w-3 h-3" />
              Quick insert:
            </span>
            {variables.slice(0, 5).map(variable => (
              <button
                key={variable.id}
                onClick={() => handleInsertVariable(variable)}
                className={cn(
                  "text-xs px-2 py-1 rounded border transition-colors",
                  isDark
                    ? "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border-purple-500/20 hover:border-purple-500/40"
                    : "bg-purple-50 hover:bg-purple-100 text-purple-600 border-purple-200 hover:border-purple-300"
                )}
              >
                {variable.displayName}
              </button>
            ))}
            {variables.length > 5 && (
              <span className={cn(
                "text-xs",
                isDark ? "text-zinc-400" : "text-muted-foreground"
              )}>
                +{variables.length - 5} more
              </span>
            )}
          </div>
        )}

      {/* Autocomplete Dropdown */}
      <AnimatePresence>
        {showAutocomplete && (
          <motion.div
            ref={autocompleteRef}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              "absolute z-50 mt-1 w-80 border rounded-lg shadow-2xl overflow-hidden",
              isDark
                ? "bg-zinc-900 border-white/10"
                : "bg-card border-border"
            )}
            style={{
              maxHeight: '240px'
            }}
          >
            <div className={cn(
              "p-2 border-b",
              isDark ? "border-white/10 bg-zinc-800/50" : "border-border bg-muted/50"
            )}>
              <div className={cn(
                "flex items-center gap-2 text-xs",
                isDark ? "text-zinc-400" : "text-muted-foreground"
              )}>
                <Code2 className="w-3.5 h-3.5" />
                <span>Insert Variable</span>
                <span className={cn(
                  "ml-auto",
                  isDark ? "text-zinc-500" : "text-muted-foreground"
                )}>
                  ↑↓ Navigate • Enter Select • Esc Close
                </span>
              </div>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '200px' }}>
              {autocompleteItems.map((item, index) => (
                <button
                  key={item.variable.id}
                  onClick={() => insertVariable(item)}
                  className={cn(
                    "w-full px-3 py-2 text-left transition-colors",
                    index === selectedIndex
                      ? isDark
                        ? 'bg-purple-500/20 border-l-2 border-purple-500'
                        : 'bg-purple-50 border-l-2 border-purple-500'
                      : isDark
                        ? 'hover:bg-card/5'
                        : 'hover:bg-muted/50'
                  )}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn(
                      "font-medium text-sm",
                      isDark ? "text-white" : "text-zinc-900"
                    )}>
                      {item.variable.displayName}
                    </span>
                    <code className={cn(
                      "text-xs font-mono px-1.5 py-0.5 rounded",
                      isDark
                        ? "text-purple-400 bg-purple-500/10"
                        : "text-purple-600 bg-purple-50"
                    )}>
                      {item.variable.name}
                    </code>
                  </div>
                  {item.variable.description && (
                    <p className={cn(
                      "text-xs line-clamp-1",
                      isDark ? "text-zinc-400" : "text-muted-foreground"
                    )}>
                      {item.variable.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className={cn(
                      "text-xs",
                      isDark ? "text-zinc-500" : "text-muted-foreground"
                    )}>
                      {item.variable.source.type}
                    </span>
                    {item.variable.type && (
                      <span className={cn(
                        "text-xs px-1.5 py-0.5 rounded",
                        isDark ? "bg-card/5 text-zinc-400" : "bg-muted text-muted-foreground"
                      )}>
                        {item.variable.type}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

        {/* Syntax Help */}
        <div className={cn(
          "mt-2 flex items-start gap-2 text-xs",
          isDark ? "text-zinc-400" : "text-muted-foreground"
        )}>
          <Code2 className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Type{' '}
            <code className={cn(
              "px-1 rounded",
              isDark ? "text-purple-400 bg-purple-500/10" : "text-purple-600 bg-purple-50"
            )}>
              {'{{'}
            </code>{' '}
            to insert variables.
            {showExpandButton && (
              <> Click <Maximize2 className="w-3 h-3 inline mx-0.5" /> to open the full expression editor.</>
            )}
          </span>
        </div>
      </div>

      {/* Expression Editor Modal */}
      <ExpressionEditorModal
        isOpen={isExpressionEditorOpen}
        onClose={() => setIsExpressionEditorOpen(false)}
        initialValue={value}
        onSave={onChange}
        workflowContext={workflowContext}
        title="Edit Expression"
        placeholder={placeholder}
      />
    </>
  );
}
