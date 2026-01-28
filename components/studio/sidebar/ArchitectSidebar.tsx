'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Wand2,
  Bug,
  RefreshCw,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Trash2,
  History,
  Lightbulb,
  Code,
  Zap,
  MessageSquare,
  X,
  Maximize2,
  Minimize2,
  Settings,
  Layout,
  Plus,
} from 'lucide-react';
import { useTheme } from '@/lib/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { useArchitect, ArchitectMode, ArchitectMessage } from '@/hooks/useArchitect';

// ============================================================================
// Types
// ============================================================================

interface ArchitectSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyWorkflow: (nodes: any[], edges: any[]) => void;
  currentNodes?: any[];
  currentEdges?: any[];
  lastError?: {
    message: string;
    nodeId?: string;
    nodeName?: string;
  };
  className?: string;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ElementType;
  prompt: string;
  mode: ArchitectMode;
}

// ============================================================================
// Constants
// ============================================================================

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'build',
    label: 'Build from Scratch',
    icon: Plus,
    prompt: 'Create a new workflow that ',
    mode: 'create',
  },
  {
    id: 'modify',
    label: 'Refactor Workflow',
    icon: RefreshCw,
    prompt: 'Modify the current workflow to ',
    mode: 'modify',
  },
  {
    id: 'fix',
    label: 'Fix Error',
    icon: Bug,
    prompt: 'Fix the error in this workflow',
    mode: 'fix',
  },
  {
    id: 'optimize',
    label: 'Optimize Layout',
    icon: Layout,
    prompt: 'Optimize the layout of this workflow',
    mode: 'modify',
  },
];

const EXAMPLE_PROMPTS = [
  'When I receive a webhook, send an email notification',
  'Every hour, fetch data from an API and save to database',
  'If the amount is over $1000, send to approval, otherwise auto-approve',
  'When a new lead comes in, create HubSpot contact and notify on Slack',
  'Generate AI summary of incoming documents and store results',
];

// ============================================================================
// Sub-Components
// ============================================================================

// Message Component
function ChatMessage({
  message,
  isDark,
  onApply,
  onCopy,
}: {
  message: ArchitectMessage;
  isDark: boolean;
  onApply?: () => void;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [showWorkflow, setShowWorkflow] = useState(false);

  const handleCopy = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    }
  };

  const isUser = message.role === 'user';
  const hasWorkflow = message.workflow && message.workflow.nodes.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
          isUser
            ? isDark
              ? 'bg-indigo-500'
              : 'bg-indigo-600'
            : isDark
            ? 'bg-gradient-to-br from-violet-500 to-purple-600'
            : 'bg-gradient-to-br from-violet-500 to-purple-600'
        )}
      >
        {isUser ? (
          <span className="text-white text-xs font-medium">You</span>
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Content */}
      <div
        className={cn(
          'flex-1 max-w-[85%]',
          isUser && 'flex flex-col items-end'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5',
            isUser
              ? isDark
                ? 'bg-indigo-500/20 text-indigo-100'
                : 'bg-indigo-100 text-indigo-900'
              : isDark
              ? 'bg-slate-800 text-slate-200'
              : 'bg-white text-slate-800 shadow-sm border border-slate-200'
          )}
        >
          {/* Status Indicator */}
          {message.status === 'streaming' && (
            <div className="flex items-center gap-2 mb-2">
              <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
              <span className="text-xs text-indigo-400">Thinking...</span>
            </div>
          )}

          {message.status === 'error' && (
            <div className="flex items-center gap-2 mb-2 text-red-400">
              <XCircle className="w-3 h-3" />
              <span className="text-xs">Error occurred</span>
            </div>
          )}

          {/* Message Content */}
          <div className="text-sm whitespace-pre-wrap">{message.content}</div>

          {/* Suggestions */}
          {message.suggestions && message.suggestions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-slate-200/20">
              <div className="flex items-center gap-1.5 mb-2">
                <Lightbulb className="w-3 h-3 text-yellow-400" />
                <span className="text-xs text-slate-400">Suggestions</span>
              </div>
              <ul className="space-y-1">
                {message.suggestions.map((suggestion, idx) => (
                  <li
                    key={idx}
                    className={cn(
                      'text-xs px-2 py-1 rounded',
                      isDark ? 'bg-slate-700/50' : 'bg-slate-100'
                    )}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Errors */}
          {message.errors && message.errors.length > 0 && (
            <div className="mt-3 pt-3 border-t border-red-500/20">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3 h-3 text-red-400" />
                <span className="text-xs text-red-400">Issues Found</span>
              </div>
              <ul className="space-y-1">
                {message.errors.map((error, idx) => (
                  <li
                    key={idx}
                    className="text-xs text-red-300 px-2 py-1 rounded bg-red-500/10"
                  >
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Workflow Preview */}
          {hasWorkflow && (
            <div className="mt-3 pt-3 border-t border-slate-200/20">
              <button
                onClick={() => setShowWorkflow(!showWorkflow)}
                className={cn(
                  'flex items-center gap-2 text-xs transition-colors',
                  isDark
                    ? 'text-indigo-400 hover:text-indigo-300'
                    : 'text-indigo-600 hover:text-indigo-700'
                )}
              >
                {showWorkflow ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )}
                <Code className="w-3 h-3" />
                <span>
                  Generated {message.workflow!.nodes.length} nodes, {message.workflow!.edges.length} edges
                </span>
              </button>

              <AnimatePresence>
                {showWorkflow && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="mt-2 overflow-hidden"
                  >
                    <pre
                      className={cn(
                        'text-xs p-3 rounded-lg overflow-x-auto max-h-48',
                        isDark ? 'bg-slate-900' : 'bg-slate-100'
                      )}
                    >
                      {JSON.stringify(message.workflow, null, 2)}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Apply Button */}
              <button
                onClick={onApply}
                className={cn(
                  'mt-3 w-full py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all',
                  isDark
                    ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                )}
              >
                <Zap className="w-4 h-4" />
                Apply to Canvas
              </button>
            </div>
          )}
        </div>

        {/* Actions (for assistant messages) */}
        {!isUser && message.status === 'complete' && (
          <div className="flex items-center gap-2 mt-1 px-2">
            <button
              onClick={handleCopy}
              className={cn(
                'p-1 rounded transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
              )}
              title="Copy response"
            >
              {copied ? (
                <Check className="w-3 h-3 text-green-400" />
              ) : (
                <Copy className={cn('w-3 h-3', isDark ? 'text-slate-500' : 'text-slate-400')} />
              )}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Quick Action Button
function QuickActionButton({
  action,
  isDark,
  onClick,
  disabled,
}: {
  action: QuickAction;
  isDark: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const Icon = action.icon;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all',
        isDark
          ? 'bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50'
          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 disabled:opacity-50'
      )}
    >
      <Icon className="w-4 h-4" />
      {action.label}
    </button>
  );
}

// Example Prompt Chip
function ExamplePromptChip({
  prompt,
  isDark,
  onClick,
}: {
  prompt: string;
  isDark: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-xs px-3 py-1.5 rounded-full transition-all text-left',
        isDark
          ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-300'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800'
      )}
    >
      {prompt}
    </button>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ArchitectSidebar({
  isOpen,
  onClose,
  onApplyWorkflow,
  currentNodes = [],
  currentEdges = [],
  lastError,
  className,
}: ArchitectSidebarProps) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // State
  const [inputValue, setInputValue] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedMode, setSelectedMode] = useState<ArchitectMode>('create');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Architect hook
  const {
    messages,
    isLoading,
    sessionId,
    sendMessage,
    clearMessages,
    applyWorkflow,
  } = useArchitect({
    currentNodes,
    currentEdges,
    onWorkflowApplied: (nodes, edges) => {
      onApplyWorkflow(nodes, edges);
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle send
  const handleSend = useCallback(async () => {
    if (!inputValue.trim() || isLoading) return;

    const prompt = inputValue.trim();
    setInputValue('');
    await sendMessage(prompt, selectedMode);
  }, [inputValue, isLoading, selectedMode, sendMessage]);

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle quick action
  const handleQuickAction = (action: QuickAction) => {
    setSelectedMode(action.mode);
    if (action.id === 'fix' && lastError) {
      setInputValue(`Fix the error: ${lastError.message}`);
    } else {
      setInputValue(action.prompt);
    }
    inputRef.current?.focus();
  };

  // Handle example prompt
  const handleExamplePrompt = (prompt: string) => {
    setInputValue(prompt);
    setSelectedMode('create');
    inputRef.current?.focus();
  };

  // Handle apply from message
  const handleApplyFromMessage = (message: ArchitectMessage) => {
    if (message.workflow) {
      applyWorkflow(message.workflow);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className={cn(
        'fixed right-0 top-0 h-full flex flex-col z-50',
        isExpanded ? 'w-[600px]' : 'w-[400px]',
        isDark ? 'bg-slate-900 border-l border-slate-700' : 'bg-slate-50 border-l border-slate-200',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex-shrink-0 px-4 py-3 border-b flex items-center justify-between',
          isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className={cn('font-semibold', isDark ? 'text-white' : 'text-slate-900')}>
              Workflow Architect
            </h2>
            <p className={cn('text-xs', isDark ? 'text-slate-400' : 'text-slate-500')}>
              AI-powered workflow builder
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            )}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <Minimize2 className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
            ) : (
              <Maximize2 className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
            )}
          </button>

          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className={cn(
                'p-2 rounded-lg transition-colors',
                isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
              )}
              title="Clear conversation"
            >
              <Trash2 className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
            </button>
          )}

          <button
            onClick={onClose}
            className={cn(
              'p-2 rounded-lg transition-colors',
              isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'
            )}
          >
            <X className={cn('w-4 h-4', isDark ? 'text-slate-400' : 'text-slate-500')} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div
        className={cn(
          'flex-shrink-0 px-4 py-3 border-b',
          isDark ? 'border-slate-700/50' : 'border-slate-200'
        )}
      >
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <QuickActionButton
              key={action.id}
              action={action}
              isDark={isDark}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
            />
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          // Empty State
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h3 className={cn('text-lg font-semibold mb-2', isDark ? 'text-white' : 'text-slate-900')}>
              Build Workflows with AI
            </h3>
            <p className={cn('text-sm mb-6', isDark ? 'text-slate-400' : 'text-slate-600')}>
              Describe what you want to automate and I'll build the workflow for you.
            </p>

            <div className="space-y-2 w-full">
              <p className={cn('text-xs font-medium', isDark ? 'text-slate-500' : 'text-slate-500')}>
                Try these examples:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {EXAMPLE_PROMPTS.map((prompt, idx) => (
                  <ExamplePromptChip
                    key={idx}
                    prompt={prompt}
                    isDark={isDark}
                    onClick={() => handleExamplePrompt(prompt)}
                  />
                ))}
              </div>
            </div>

            {/* Error Hint */}
            {lastError && (
              <div
                className={cn(
                  'mt-6 p-3 rounded-lg w-full text-left',
                  isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-100'
                )}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={cn('text-sm font-medium', isDark ? 'text-red-400' : 'text-red-700')}>
                      Error Detected
                    </p>
                    <p className={cn('text-xs mt-1', isDark ? 'text-red-300/70' : 'text-red-600')}>
                      {lastError.message}
                    </p>
                    <button
                      onClick={() => handleQuickAction(QUICK_ACTIONS.find((a) => a.id === 'fix')!)}
                      className={cn(
                        'mt-2 text-xs px-3 py-1 rounded-full transition-colors',
                        isDark
                          ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      )}
                    >
                      Fix this error →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // Messages List
          <>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                isDark={isDark}
                onApply={() => handleApplyFromMessage(message)}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input Area */}
      <div
        className={cn(
          'flex-shrink-0 p-4 border-t',
          isDark ? 'bg-slate-900/80 border-slate-700' : 'bg-white border-slate-200'
        )}
      >
        {/* Mode Indicator */}
        <div className="flex items-center gap-2 mb-2">
          <span className={cn('text-xs', isDark ? 'text-slate-500' : 'text-slate-500')}>
            Mode:
          </span>
          <div className="flex gap-1">
            {(['create', 'modify', 'fix'] as ArchitectMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setSelectedMode(mode)}
                className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium transition-colors capitalize',
                  selectedMode === mode
                    ? isDark
                      ? 'bg-indigo-500/20 text-indigo-400'
                      : 'bg-indigo-100 text-indigo-700'
                    : isDark
                    ? 'text-slate-500 hover:text-slate-400'
                    : 'text-slate-500 hover:text-slate-700'
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder={
                selectedMode === 'create'
                  ? 'Describe the workflow you want to build...'
                  : selectedMode === 'modify'
                  ? 'Describe how to modify the workflow...'
                  : 'Describe the error to fix...'
              }
              rows={2}
              disabled={isLoading}
              className={cn(
                'w-full px-4 py-3 rounded-xl text-sm resize-none transition-colors',
                isDark
                  ? 'bg-slate-800 text-white placeholder-slate-500 border border-slate-700 focus:border-indigo-500'
                  : 'bg-slate-100 text-slate-900 placeholder-slate-400 border border-slate-200 focus:border-indigo-500'
              )}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className={cn(
              'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-all',
              inputValue.trim() && !isLoading
                ? 'bg-indigo-500 text-white hover:bg-indigo-400'
                : isDark
                ? 'bg-slate-800 text-slate-600'
                : 'bg-slate-200 text-slate-400'
            )}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Session Info */}
        {sessionId && (
          <div className="flex items-center gap-2 mt-2">
            <MessageSquare className={cn('w-3 h-3', isDark ? 'text-slate-600' : 'text-slate-400')} />
            <span className={cn('text-xs', isDark ? 'text-slate-600' : 'text-slate-400')}>
              Session: {sessionId.slice(0, 8)}... ({messages.length} messages)
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
