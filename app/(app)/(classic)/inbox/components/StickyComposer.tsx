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
  placeholder = 'Beschreibe deine Aufgabe...',
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
    <div
      className="absolute bottom-0 left-0 right-0 px-4 pb-8 pt-3 pointer-events-none z-30"
      style={{ background: 'linear-gradient(to top, rgba(3,7,18,0.95) 60%, transparent)' }}
    >
      <div className="pointer-events-auto relative">
        {/* @-Mention Dropdown */}
        {showMentions && filteredAgents.length > 0 && (
          <div className="absolute bottom-full left-0 right-0 mb-2 mx-auto max-w-2xl max-h-48 overflow-y-auto bg-[#171717] border border-white/[0.08] rounded-xl shadow-lg backdrop-blur-xl z-50 animate-mention-dropdown">
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
                    ? 'bg-violet-500/[0.08]'
                    : 'hover:bg-white/[0.04]'
                )}
              >
                <div
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-white">{agent.name}</span>
                  <span className="ml-1.5 text-xs text-white/40">{agent.role}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Floating Capsule Input */}
        <div
          className={cn(
            'mx-auto max-w-2xl flex items-end gap-3 p-2 pl-4 bg-white/[0.08] backdrop-blur-xl rounded-full border border-white/[0.10] shadow-2xl shadow-black/40',
            'focus-within:border-violet-500/30 focus-within:ring-1 focus-within:ring-violet-500/10',
            'transition-all duration-200',
            disabled && 'opacity-50'
          )}
        >
          {/* Attachment Button (optional) */}
          {showAttachments && (
            <button
              className="flex-shrink-0 p-2 text-white/40 hover:text-white/60 transition-colors rounded-lg hover:bg-white/[0.06]"
              title="Datei anhängen"
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
            maxRows={3}
            className={cn(
              'flex-1 resize-none bg-transparent text-sm text-white',
              'placeholder-white/40 focus:outline-none',
              'scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent'
            )}
          />

          {/* Character count (when close to limit) */}
          {message.length > maxLength * 0.8 && (
            <span
              className={cn(
                'flex-shrink-0 text-xs',
                message.length >= maxLength ? 'text-red-500' : 'text-white/40'
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
              'flex-shrink-0 p-2.5 rounded-full transition-all duration-200',
              canSend
                ? 'bg-violet-500 hover:bg-violet-400 text-white shadow-sm shadow-violet-500/25'
                : 'bg-white/[0.06] text-white/20 cursor-not-allowed'
            )}
            title={canSend ? 'Nachricht senden' : 'Nachricht eingeben'}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
