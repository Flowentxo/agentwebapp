'use client';

/**
 * Flowent Inbox v3 - StickyComposer Component
 * Bottom-fixed chat input with auto-resize and send functionality
 *
 * Features:
 * - Auto-resize textarea (max 5 lines)
 * - Send on Enter, newline on Shift+Enter
 * - Send button with loading state
 * - Disabled state while streaming
 * - Character count (optional)
 * - Attachment button (future)
 */

import { useState, useRef, useCallback, useMemo, KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Loader2, AtSign } from 'lucide-react';
import { agentPersonas } from '@/lib/agents/personas';

interface StickyComposerProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  showAttachments?: boolean;
}

export function StickyComposer({
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  showAttachments = false,
}: StickyComposerProps) {
  const [message, setMessage] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  // Filter active agents for mention dropdown
  const filteredAgents = useMemo(() => {
    const active = agentPersonas.filter(a => a.status === 'active' && a.available);
    if (!mentionFilter) return active;
    return active.filter(a =>
      a.name.toLowerCase().startsWith(mentionFilter.toLowerCase()) ||
      a.id.toLowerCase().startsWith(mentionFilter.toLowerCase())
    );
  }, [mentionFilter]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    setShowMentions(false);
    onSend(message.trim());
    setMessage('');
    textareaRef.current?.focus();
  }, [message, canSend, onSend]);

  const handleMentionSelect = useCallback((agentName: string) => {
    // Replace the partial @mention with the full @AgentName
    const atIndex = message.lastIndexOf('@');
    const before = atIndex >= 0 ? message.substring(0, atIndex) : message;
    setMessage(before + '@' + agentName + ' ');
    setShowMentions(false);
    setMentionFilter('');
    setSelectedMentionIndex(0);
    textareaRef.current?.focus();
  }, [message]);

  const handleChange = useCallback((value: string) => {
    setMessage(value.slice(0, maxLength));

    // Detect @mention typing
    const atIndex = value.lastIndexOf('@');
    if (atIndex >= 0) {
      const afterAt = value.substring(atIndex + 1);
      // Only show dropdown if there's no space after @ (still typing the mention)
      if (!afterAt.includes(' ') && !afterAt.includes('\n')) {
        setShowMentions(true);
        setMentionFilter(afterAt);
        setSelectedMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
    setMentionFilter('');
  }, [maxLength]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle mention dropdown navigation
    if (showMentions && filteredAgents.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(i => Math.min(i + 1, filteredAgents.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(i => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleMentionSelect(filteredAgents[selectedMentionIndex].name);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 border-t-2 border-border bg-card/95 backdrop-blur-sm p-4 relative">
      {/* @-Mention Dropdown */}
      {showMentions && filteredAgents.length > 0 && (
        <div className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 animate-mention-dropdown">
          {filteredAgents.map((agent, index) => (
            <button
              key={agent.id}
              onMouseDown={(e) => {
                e.preventDefault();
                handleMentionSelect(agent.name);
              }}
              className={cn(
                'w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors',
                index === selectedMentionIndex
                  ? 'bg-gray-100 dark:bg-zinc-800'
                  : 'hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              )}
            >
              <div
                className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-900 dark:text-white">{agent.name}</span>
                <span className="ml-1.5 text-xs text-gray-400 dark:text-zinc-500">{agent.role}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-3 p-3 bg-muted/50 rounded-2xl border-2 border-border',
          'focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/20',
          'transition-all duration-200',
          disabled && 'opacity-50'
        )}
      >
        {/* Attachment Button (optional) */}
        {showAttachments && (
          <button
            className="flex-shrink-0 p-2 text-muted-foreground hover:text-muted-foreground transition-colors rounded-lg hover:bg-slate-200"
            title="Attach file"
            disabled={disabled}
          >
            <Paperclip className="w-5 h-5" />
          </button>
        )}

        {/* Textarea */}
        <TextareaAutosize
          ref={textareaRef}
          value={message}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled || isLoading}
          minRows={1}
          maxRows={5}
          className={cn(
            'flex-1 resize-none bg-transparent text-sm text-foreground',
            'placeholder-slate-400 focus:outline-none',
            'scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent'
          )}
        />

        {/* Character count (when close to limit) */}
        {message.length > maxLength * 0.8 && (
          <span
            className={cn(
              'flex-shrink-0 text-xs',
              message.length >= maxLength ? 'text-red-500' : 'text-muted-foreground'
            )}
          >
            {message.length}/{maxLength}
          </span>
        )}

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
            canSend
              ? 'bg-primary hover:bg-primary/90 text-white shadow-sm'
              : 'bg-slate-200 text-muted-foreground cursor-not-allowed'
          )}
          title={canSend ? 'Send message' : 'Type a message to send'}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Hint */}
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-muted-foreground">
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">Enter</kbd> to send
        </span>
        <span>
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">@</kbd> to mention agent
        </span>
      </div>
    </div>
  );
}
