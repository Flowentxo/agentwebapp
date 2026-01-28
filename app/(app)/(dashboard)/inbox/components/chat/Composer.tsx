'use client';

/**
 * Flowent Inbox v3 - Composer Component
 * Sticky floating input with backdrop blur, prompt starters, and @mention support
 *
 * Features:
 * - Sticky bottom positioning with floating appearance
 * - Frosted glass backdrop blur effect
 * - Prompt starters bar for quick actions
 * - @mention support for agent tagging
 * - Keyboard shortcuts
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent, useMemo } from 'react';
import {
  Send,
  Paperclip,
  Smile,
  Sparkles,
  AtSign,
  User,
  Zap,
  Lightbulb,
  FileText,
  Code,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useInboxStore } from '@/lib/stores/useInboxStore';
import type { InboxAgent } from '@/types/inbox';

// Prompt starter suggestions
const promptStarters = [
  { icon: Lightbulb, label: 'Explain', prompt: 'Explain how ', color: 'text-amber-400' },
  { icon: Code, label: 'Code', prompt: 'Write code that ', color: 'text-emerald-400' },
  { icon: FileText, label: 'Summarize', prompt: 'Summarize ', color: 'text-blue-400' },
  { icon: Zap, label: 'Automate', prompt: 'Create an automation for ', color: 'text-violet-400' },
];

interface ComposerProps {
  onSend: (content: string) => void;
  placeholder?: string;
  disabled?: boolean;
  agentName?: string;
  showTypingHint?: boolean;
  showPromptStarters?: boolean;
}

// Agent role descriptions for the mention menu
const agentRoles: Record<string, string> = {
  dexter: 'Data Analyst',
  emmie: 'Email Manager',
  kai: 'Code Assistant',
  cassie: 'Customer Support',
  finn: 'Finance Advisor',
  lex: 'Legal Advisor',
  aura: 'Creative Director',
  nova: 'Research Assistant',
};

export function Composer({
  onSend,
  placeholder,
  disabled = false,
  agentName = 'Agent',
  showTypingHint = false,
  showPromptStarters = true,
}: ComposerProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionMenuRef = useRef<HTMLDivElement>(null);

  const { agents } = useInboxStore();

  // Filter agents based on mention query
  const filteredAgents = useMemo(() => {
    if (!mentionQuery) return agents;
    const query = mentionQuery.toLowerCase();
    return agents.filter(
      (agent) =>
        agent.name.toLowerCase().includes(query) ||
        agent.id.toLowerCase().includes(query) ||
        agentRoles[agent.id]?.toLowerCase().includes(query)
    );
  }, [agents, mentionQuery]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedMentionIndex(0);
  }, [filteredAgents.length]);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  // Handle mention selection
  const insertMention = useCallback(
    (agent: InboxAgent) => {
      if (mentionStartIndex === -1) return;

      const beforeMention = content.slice(0, mentionStartIndex);
      const afterMention = content.slice(
        mentionStartIndex + mentionQuery.length + 1 // +1 for the @ character
      );

      const newContent = `${beforeMention}@${agent.name} ${afterMention}`;
      setContent(newContent);
      setShowMentionMenu(false);
      setMentionQuery('');
      setMentionStartIndex(-1);

      // Focus back on textarea
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const cursorPos = beforeMention.length + agent.name.length + 2; // +2 for @ and space
          textareaRef.current.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
    },
    [content, mentionStartIndex, mentionQuery]
  );

  // Handle input changes and detect @ mentions
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newContent = e.target.value;
      const cursorPos = e.target.selectionStart;
      setContent(newContent);

      // Check for @ trigger
      const textBeforeCursor = newContent.slice(0, cursorPos);
      const lastAtIndex = textBeforeCursor.lastIndexOf('@');

      if (lastAtIndex !== -1) {
        // Check if @ is at start or preceded by whitespace
        const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
        const isValidTrigger = charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0;

        if (isValidTrigger) {
          const query = textBeforeCursor.slice(lastAtIndex + 1);
          // Only show menu if query doesn't contain spaces (still typing the mention)
          if (!query.includes(' ')) {
            setShowMentionMenu(true);
            setMentionQuery(query);
            setMentionStartIndex(lastAtIndex);
            return;
          }
        }
      }

      // Close menu if no valid @ found
      setShowMentionMenu(false);
      setMentionQuery('');
      setMentionStartIndex(-1);
    },
    []
  );

  // Handle send
  const handleSend = useCallback(() => {
    if (!content.trim() || disabled) return;
    onSend(content.trim());
    setContent('');
    setShowMentionMenu(false);
    // Reset height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, disabled, onSend]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Handle mention menu navigation
      if (showMentionMenu && filteredAgents.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedMentionIndex((prev) =>
            prev < filteredAgents.length - 1 ? prev + 1 : 0
          );
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedMentionIndex((prev) =>
            prev > 0 ? prev - 1 : filteredAgents.length - 1
          );
          return;
        }
        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          insertMention(filteredAgents[selectedMentionIndex]);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowMentionMenu(false);
          return;
        }
      }

      // Cmd/Ctrl + Enter to send
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSend();
        return;
      }

      // Enter without modifier to send (single line mode)
      if (e.key === 'Enter' && !e.shiftKey && !showMentionMenu) {
        e.preventDefault();
        handleSend();
        return;
      }

      // Shift + Enter for new line (let it through)
    },
    [handleSend, showMentionMenu, filteredAgents, selectedMentionIndex, insertMention]
  );

  // Close mention menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        mentionMenuRef.current &&
        !mentionMenuRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowMentionMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const canSend = content.trim().length > 0 && !disabled;

  // Render content with highlighted mentions
  const renderHighlightedContent = () => {
    // Simple regex to find @mentions
    const mentionRegex = /@(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      // Add mention with styling
      parts.push(
        <span key={match.index} className="text-blue-400 font-medium">
          {match[0]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts;
  };

  // Handle prompt starter click
  const handlePromptStarter = useCallback((prompt: string) => {
    setContent(prompt);
    textareaRef.current?.focus();
    // Move cursor to end
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = prompt.length;
        textareaRef.current.selectionEnd = prompt.length;
      }
    }, 0);
  }, []);

  return (
    <div className="sticky bottom-0 z-40">
      {/* Gradient fade at top for smooth transition */}
      <div className="h-6 bg-gradient-to-t from-white to-transparent pointer-events-none" />

      {/* Floating composer container */}
      <div className="bg-card/95 backdrop-blur-xl border-t-2 border-border">
        <div className="max-w-3xl mx-auto px-4 py-3">
          {/* Prompt Starters - Collapsible bar above input */}
          {showPromptStarters && content.length === 0 && !showTypingHint && (
            <div className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none pb-1">
              <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold flex-shrink-0">Try:</span>
              {promptStarters.map((starter) => {
                const Icon = starter.icon;
                return (
                  <button
                    key={starter.label}
                    onClick={() => handlePromptStarter(starter.prompt)}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-xl',
                      'bg-card hover:bg-muted/50 border-2 border-border',
                      'text-xs text-muted-foreground hover:text-foreground',
                      'transition-all duration-200 hover:scale-[1.02] flex-shrink-0',
                      'hover:border-primary/30'
                    )}
                  >
                    <Icon className={cn('w-3 h-3', starter.color)} />
                    <span>{starter.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Typing hint */}
          {showTypingHint && (
            <div className="flex items-center gap-2 mb-3">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 border-2 border-primary/20 rounded-xl">
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-xs text-primary">
                  {agentName} is thinking...
                </span>
                <span className="flex gap-0.5">
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </span>
              </div>
            </div>
          )}

        {/* Input container - relative for mention menu positioning */}
        <div className="relative">
          {/* Mention Menu */}
          {showMentionMenu && filteredAgents.length > 0 && (
            <div
              ref={mentionMenuRef}
              className="absolute bottom-full left-0 mb-2 w-72 max-h-64 overflow-y-auto bg-card/95 backdrop-blur-xl border-2 border-border rounded-xl shadow-lg z-50"
            >
              <div className="p-2">
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground border-b border-border mb-1">
                  <AtSign size={12} />
                  <span>Mention an agent</span>
                </div>
                {filteredAgents.map((agent, index) => (
                  <button
                    key={agent.id}
                    onClick={() => insertMention(agent)}
                    onMouseEnter={() => setSelectedMentionIndex(index)}
                    className={cn(
                      'w-full flex items-center gap-3 px-2 py-2 rounded-lg transition-colors',
                      index === selectedMentionIndex
                        ? 'bg-primary/10 text-foreground'
                        : 'hover:bg-muted/50 text-foreground'
                    )}
                  >
                    {/* Agent avatar */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                      style={{ backgroundColor: agent.color }}
                    >
                      {agent.name.charAt(0)}
                    </div>
                    {/* Agent info */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{agent.name}</span>
                        {agent.isOnline && (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {agentRoles[agent.id] || 'AI Agent'}
                      </p>
                    </div>
                    {/* Keyboard hint */}
                    {index === selectedMentionIndex && (
                      <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded text-[10px] font-mono text-muted-foreground">
                        Enter
                      </kbd>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* No results state */}
          {showMentionMenu && filteredAgents.length === 0 && (
            <div
              ref={mentionMenuRef}
              className="absolute bottom-full left-0 mb-2 w-72 bg-card/95 backdrop-blur-xl border-2 border-border rounded-xl shadow-lg z-50 p-4"
            >
              <div className="flex flex-col items-center text-center">
                <User className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm text-muted-foreground">No agents found</p>
                <p className="text-xs text-muted-foreground">Try a different name</p>
              </div>
            </div>
          )}

          <div
            className={cn(
              'flex items-end gap-2 p-2 bg-muted/50 rounded-xl border-2 transition-all duration-200',
              isFocused
                ? 'border-primary/40 ring-2 ring-primary/20'
                : 'border-border hover:border-border'
            )}
          >
            {/* Attachment button */}
            <button
              type="button"
              className="flex-shrink-0 p-2 text-muted-foreground hover:text-muted-foreground transition-colors rounded-lg hover:bg-slate-200"
              title="Attach file"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Textarea */}
            <div className="flex-1 min-w-0">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder={placeholder || `Message ${agentName}... (Type @ to mention)`}
                disabled={disabled}
                rows={1}
                className={cn(
                  'w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground',
                  'focus:outline-none resize-none',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'py-2 px-1'
                )}
                style={{ maxHeight: '200px' }}
              />
            </div>

            {/* Mention trigger button */}
            <button
              type="button"
              onClick={() => {
                const textarea = textareaRef.current;
                if (textarea) {
                  const cursorPos = textarea.selectionStart;
                  const beforeCursor = content.slice(0, cursorPos);
                  const afterCursor = content.slice(cursorPos);
                  const needsSpace = beforeCursor.length > 0 && !beforeCursor.endsWith(' ') && !beforeCursor.endsWith('\n');
                  const newContent = `${beforeCursor}${needsSpace ? ' ' : ''}@${afterCursor}`;
                  setContent(newContent);
                  setShowMentionMenu(true);
                  setMentionQuery('');
                  setMentionStartIndex(beforeCursor.length + (needsSpace ? 1 : 0));
                  textarea.focus();
                }
              }}
              className="flex-shrink-0 p-2 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-slate-200"
              title="Mention agent (@)"
            >
              <AtSign className="w-5 h-5" />
            </button>

            {/* Emoji button */}
            <button
              type="button"
              className="flex-shrink-0 p-2 text-muted-foreground hover:text-muted-foreground transition-colors rounded-lg hover:bg-slate-200"
              title="Add emoji"
            >
              <Smile className="w-5 h-5" />
            </button>

            {/* Send button */}
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={cn(
                'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
                canSend
                  ? 'bg-primary text-white hover:bg-primary/90 shadow-sm'
                  : 'bg-slate-200 text-muted-foreground cursor-not-allowed'
              )}
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

          {/* Keyboard shortcuts hint - compact */}
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">@</kbd>
                <span>mention</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">Enter</kbd>
                <span>send</span>
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-muted border border-border rounded font-mono">Shift+Enter</kbd>
                <span>new line</span>
              </span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {content.length > 0 && (
                <span>{content.length.toLocaleString()} chars</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
