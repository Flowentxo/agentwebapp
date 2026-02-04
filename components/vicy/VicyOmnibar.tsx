'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';

interface VicyOmnibarProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function VicyOmnibar({
  onSubmit,
  isSubmitting = false,
  placeholder = 'How can I help you today',
}: VicyOmnibarProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 160) + 'px';
  }, [input]);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) return;
    onSubmit(trimmed);
    setInput('');
  }, [input, isSubmitting, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="vicy-omnibar">
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        disabled={isSubmitting}
        className="w-full resize-none bg-transparent px-5 pt-4 pb-12 text-[15px] placeholder-zinc-600 focus:outline-none disabled:opacity-50"
        style={{ color: 'var(--vicy-text-primary)' }}
      />

      {/* Bottom bar */}
      <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'var(--vicy-text-tertiary)' }}>
          Shift+Enter for new line
        </span>

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isSubmitting}
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-white text-black disabled:opacity-20 disabled:cursor-not-allowed hover:bg-zinc-200 transition-all duration-150"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
}
