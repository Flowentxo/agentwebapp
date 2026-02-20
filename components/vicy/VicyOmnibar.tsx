'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VicyOmnibarProps {
  onSubmit: (content: string) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function VicyOmnibar({
  onSubmit,
  isSubmitting = false,
  placeholder = 'Beschreibe deine Aufgabe...',
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
        <span className="text-[11px] text-zinc-500">
          Umschalt+Eingabe fuer neue Zeile
        </span>

        <button
          onClick={handleSubmit}
          disabled={!input.trim() || isSubmitting}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
            input.trim()
              ? "bg-violet-500 text-white shadow-[0_0_12px_rgba(139,92,246,0.4)] hover:bg-violet-400"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          )}
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
