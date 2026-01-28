'use client';

/**
 * Flowent Horizon - Floating Composer
 * Grok-style floating input with voice mode integration
 *
 * Features:
 * - Fixed bottom positioning with glassmorphism
 * - Voice mode trigger with visual feedback
 * - Prompt starters when empty
 * - @mention support
 * - Keyboard shortcuts
 */

import { useState, useRef, useCallback, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Mic,
  MicOff,
  Paperclip,
  Sparkles,
  AtSign,
  ArrowUp,
  Loader2,
  X,
  Zap,
  Lightbulb,
  Code,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface PromptStarter {
  icon: React.ElementType;
  label: string;
  prompt: string;
  color: string;
}

interface HorizonComposerProps {
  onSend: (content: string) => void;
  onVoiceModeStart?: () => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  agentName?: string;
  showVoiceButton?: boolean;
  showPromptStarters?: boolean;
  className?: string;
}

// ============================================================================
// PROMPT STARTERS
// ============================================================================

const promptStarters: PromptStarter[] = [
  {
    icon: Lightbulb,
    label: 'Explain',
    prompt: 'Explain how ',
    color: 'text-amber-400',
  },
  {
    icon: Code,
    label: 'Code',
    prompt: 'Write code that ',
    color: 'text-emerald-400',
  },
  {
    icon: FileText,
    label: 'Summarize',
    prompt: 'Summarize ',
    color: 'text-blue-400',
  },
  {
    icon: Zap,
    label: 'Automate',
    prompt: 'Create an automation for ',
    color: 'text-violet-400',
  },
];

// ============================================================================
// COMPONENT
// ============================================================================

export function HorizonComposer({
  onSend,
  onVoiceModeStart,
  placeholder,
  disabled = false,
  isLoading = false,
  agentName = 'AI',
  showVoiceButton = true,
  showPromptStarters = true,
  className = '',
}: HorizonComposerProps) {
  const [content, setContent] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    }
  }, []);

  useEffect(() => {
    adjustHeight();
  }, [content, adjustHeight]);

  // Handle send
  const handleSend = useCallback(() => {
    if (!content.trim() || disabled || isLoading) return;
    onSend(content.trim());
    setContent('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [content, disabled, isLoading, onSend]);

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter to send (without shift)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
    },
    [handleSend]
  );

  // Handle prompt starter
  const handlePromptStarter = useCallback((prompt: string) => {
    setContent(prompt);
    textareaRef.current?.focus();
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.selectionStart = prompt.length;
        textareaRef.current.selectionEnd = prompt.length;
      }
    }, 0);
  }, []);

  const canSend = content.trim().length > 0 && !disabled && !isLoading;

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn('horizon-composer', className)}
    >
      {/* Prompt Starters */}
      <AnimatePresence>
        {showPromptStarters && content.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 mb-3 overflow-x-auto scrollbar-none pb-1 px-1"
          >
            <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold flex-shrink-0">
              Try:
            </span>
            {promptStarters.map((starter) => {
              const Icon = starter.icon;
              return (
                <button
                  key={starter.label}
                  onClick={() => handlePromptStarter(starter.prompt)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-xl flex-shrink-0',
                    'horizon-glass transition-all duration-200',
                    'text-xs text-slate-600 dark:text-slate-300',
                    'hover:scale-[1.02] hover:bg-white/80 dark:hover:bg-white/10'
                  )}
                >
                  <Icon className={cn('w-3 h-3', starter.color)} />
                  <span>{starter.label}</span>
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Indicator */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="flex items-center gap-2 mb-3 px-1"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 dark:bg-violet-500/20 border border-violet-500/20">
              <Sparkles className="w-3 h-3 text-violet-500 animate-pulse" />
              <span className="text-xs text-violet-600 dark:text-violet-400">
                {agentName} is thinking...
              </span>
              <span className="flex gap-0.5">
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1 h-1 bg-violet-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Composer */}
      <div
        className={cn(
          'horizon-composer-inner',
          isFocused && 'ring-2 ring-primary/20 dark:ring-cyan-500/20'
        )}
      >
        {/* Attachment Button */}
        <button
          type="button"
          className="flex-shrink-0 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg hover:bg-slate-200/50 dark:hover:bg-white/5"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder || `Message ${agentName}...`}
          disabled={disabled}
          rows={1}
          className="horizon-composer-input"
          style={{ maxHeight: '160px' }}
        />

        {/* Voice Mode Button */}
        {showVoiceButton && onVoiceModeStart && (
          <button
            type="button"
            onClick={onVoiceModeStart}
            className={cn(
              'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
              'bg-gradient-to-br from-cyan-500 to-violet-500',
              'text-white shadow-lg shadow-cyan-500/20',
              'hover:shadow-xl hover:shadow-cyan-500/30 hover:scale-105',
              'active:scale-95'
            )}
            title="Voice mode"
          >
            <Mic className="w-4 h-4" />
          </button>
        )}

        {/* Send Button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          className={cn(
            'flex-shrink-0 p-2.5 rounded-xl transition-all duration-200',
            canSend
              ? 'bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
          )}
          title="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Keyboard Hints */}
      <div className="flex items-center justify-between mt-2 px-2">
        <div className="flex items-center gap-3 text-[10px] text-slate-400 dark:text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[9px]">
              Enter
            </kbd>
            <span>send</span>
          </span>
          <span className="hidden sm:flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded font-mono text-[9px]">
              Shift+Enter
            </kbd>
            <span>new line</span>
          </span>
        </div>
        {content.length > 0 && (
          <span className="text-[10px] text-slate-400 dark:text-slate-500">
            {content.length.toLocaleString()} chars
          </span>
        )}
      </div>
    </motion.div>
  );
}

export default HorizonComposer;
