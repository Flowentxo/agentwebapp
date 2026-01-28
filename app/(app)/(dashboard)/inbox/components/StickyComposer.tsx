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

import { useState, useRef, useCallback, KeyboardEvent } from 'react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '@/lib/utils';
import { Send, Paperclip, Loader2 } from 'lucide-react';

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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = message.trim().length > 0 && !isLoading && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(message.trim());
    setMessage('');
    textareaRef.current?.focus();
  }, [message, canSend, onSend]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-shrink-0 border-t-2 border-border bg-card/95 backdrop-blur-sm p-4">
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
          onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
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
          <kbd className="px-1.5 py-0.5 bg-muted border border-border rounded">Shift + Enter</kbd> for new line
        </span>
      </div>
    </div>
  );
}
