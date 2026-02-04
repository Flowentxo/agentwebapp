'use client';

import { useState, useRef, useCallback, useMemo, KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '@/lib/utils';
import { Send, Loader2 } from 'lucide-react';
import { agentPersonas } from '@/lib/agents/personas';

interface VicyComposerProps {
  onSend: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  activeAgentId?: string;
  activeAgentName?: string;
  activeAgentColor?: string;
}

export function VicyComposer({
  onSend,
  isLoading = false,
  placeholder = 'Type a message...',
  disabled = false,
  maxLength = 4000,
  activeAgentId,
  activeAgentName,
  activeAgentColor,
}: VicyComposerProps) {
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

    const atIndex = value.lastIndexOf('@');
    if (atIndex >= 0) {
      const afterAt = value.substring(atIndex + 1);
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

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 px-4 pb-4 pt-2 relative">
      {/* @-Mention Dropdown */}
      {showMentions && filteredAgents.length > 0 && (
        <div
          className="absolute bottom-full left-4 right-4 mb-2 max-h-48 overflow-y-auto rounded-xl shadow-2xl z-50"
          style={{
            backgroundColor: 'var(--vicy-surface)',
            border: '1px solid var(--vicy-border-focus)',
          }}
        >
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
                  ? 'bg-white/[0.06]'
                  : 'hover:bg-white/[0.03]'
              )}
            >
              <div
                className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white flex-shrink-0"
                style={{ backgroundColor: agent.color }}
              >
                {agent.name.charAt(0)}
              </div>
              <span style={{ color: 'var(--vicy-text-primary)' }}>{agent.name}</span>
              <span className="text-xs" style={{ color: 'var(--vicy-text-tertiary)' }}>{agent.role}</span>
            </button>
          ))}
        </div>
      )}

      <div
        className="flex items-end gap-2 px-3 py-2.5 rounded-2xl transition-all duration-200 glass glass-focus"
      >
        {/* Active Agent Pill */}
        {activeAgentName && (
          <div
            className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1 rounded-lg text-xs font-medium vicy-agent-glow"
            style={{
              color: activeAgentColor || 'var(--vicy-text-secondary)',
              backgroundColor: (activeAgentColor || '#6b7280') + '15',
              boxShadow: activeAgentColor ? `0 0 12px ${activeAgentColor}20` : 'none',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: activeAgentColor || '#6b7280' }}
            />
            {activeAgentName}
          </div>
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
          className="flex-1 resize-none bg-transparent text-sm focus:outline-none placeholder-zinc-600"
          style={{ color: 'var(--vicy-text-primary)' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 p-2 rounded-lg transition-all duration-200',
            canSend
              ? 'bg-white text-black hover:bg-zinc-200'
              : 'text-zinc-700 cursor-not-allowed'
          )}
          title={canSend ? 'Send message' : 'Type a message to send'}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
