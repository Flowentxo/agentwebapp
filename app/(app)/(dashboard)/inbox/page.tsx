'use client';

/**
 * Flowent Inbox - Grok-Style Command Center
 *
 * RADICAL MINIMALISM - Monochrome, distraction-free
 * Features:
 * - Centered hero with brand logo
 * - Floating capsule-style input bar with strong presence
 * - Monochrome ghost-style action pills (NO colors)
 * - NO recent conversations in center view
 * - Clean slate design
 */

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateThread } from '@/lib/hooks/useInbox';
import {
  Search,
  Sparkles,
  FileText,
  Image,
  Code,
  Loader2,
  Send,
  Mic,
  Paperclip,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

// Quick Action Pills - MONOCHROME only
const QUICK_ACTIONS = [
  { id: 'deep-search', label: 'DeepSearch', icon: Search },
  { id: 'analyze', label: 'Analyze', icon: Sparkles },
  { id: 'generate-image', label: 'Generate', icon: Image },
  { id: 'write-code', label: 'Code', icon: Code },
  { id: 'summarize', label: 'Summarize', icon: FileText },
];

export default function InboxPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);

  // Create thread mutation
  const createThreadMutation = useCreateThread();

  // Focus input on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Handle sending a message
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || createThreadMutation.isPending) return;

    try {
      const newThread = await createThreadMutation.mutateAsync({
        initialMessage: inputValue.trim(),
      });
      router.push(`/inbox/${newThread.id}`);
    } catch (error) {
      console.error('[InboxPage] Failed to create thread:', error);
    }
  };

  // Handle quick action click
  const handleQuickAction = async (actionId: string) => {
    const prefixes: Record<string, string> = {
      'deep-search': 'Search for: ',
      'analyze': 'Analyze: ',
      'generate-image': 'Generate an image of: ',
      'write-code': 'Write code to: ',
      'summarize': 'Summarize: ',
    };
    setInputValue(prefixes[actionId] || '');
    inputRef.current?.focus();
  };

  // Handle keyboard shortcut
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="relative flex-1 flex flex-col items-center justify-center min-h-screen
      bg-white dark:bg-[#0a0a0a]
      transition-colors duration-300">

      {/* Subtle Background - Dark mode only */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="hidden dark:block absolute inset-0">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              background: 'radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.02) 0%, transparent 70%)'
            }}
          />
        </div>
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-xl px-6 flex flex-col items-center">

        {/* Hero Section - Premium Brand Logo with Gradient Glow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="flex flex-col items-center mb-12"
        >
          {/* Premium Logo with Gradient Glow */}
          <div className="relative mb-4">
            {/* Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/30 to-indigo-500/30 rounded-2xl blur-2xl scale-150" />
            {/* Logo Container */}
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600
              flex items-center justify-center shadow-2xl shadow-violet-500/30">
              <span className="text-2xl font-bold text-white">F</span>
            </div>
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white tracking-tight mb-2">
            Flowent
          </h1>
          {/* Minimal Greeting */}
          <p className="text-sm text-gray-400 dark:text-zinc-600">
            What can I help you with?
          </p>
        </motion.div>

        {/* Floating Omnibar - Pill Style with Glow */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
          onSubmit={handleSubmit}
          className="w-full max-w-3xl mb-8"
        >
          <div className={cn(
            "relative w-full rounded-full transition-all duration-300",
            "bg-gray-50 dark:bg-zinc-900/80 dark:backdrop-blur-xl",
            "border",
            isInputFocused
              ? "border-gray-300 dark:border-violet-500/30 shadow-lg dark:shadow-[0_0_40px_rgba(139,92,246,0.15)]"
              : "border-gray-200 dark:border-white/10 shadow-lg dark:shadow-black/30",
            "hover:border-gray-300 dark:hover:border-white/20"
          )}>
            <div className="flex items-center h-14 px-5">
              {/* Attach Button - Far Left */}
              <button
                type="button"
                className="p-2 rounded-full text-gray-400 dark:text-zinc-600
                  hover:text-gray-600 dark:hover:text-white
                  hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                title="Attach file"
              >
                <Paperclip className="w-5 h-5" />
              </button>

              {/* Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything..."
                className="flex-1 bg-transparent text-gray-900 dark:text-white
                  placeholder:text-gray-400 dark:placeholder:text-zinc-500
                  text-base outline-none px-3"
              />

              {/* Action Buttons - Far Right */}
              <div className="flex items-center gap-1">
                {/* Voice Input Button */}
                <button
                  type="button"
                  className="p-2 rounded-full text-gray-400 dark:text-zinc-600
                    hover:text-gray-600 dark:hover:text-white
                    hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                  title="Voice input"
                >
                  <Mic className="w-5 h-5" />
                </button>

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputValue.trim() || createThreadMutation.isPending}
                  className={cn(
                    "p-2.5 rounded-full transition-all",
                    inputValue.trim()
                      ? "bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-200"
                      : "bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-600"
                  )}
                >
                  {createThreadMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.form>

        {/* Quick Action Pills - Ghost Outline Style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
          className="flex flex-wrap items-center justify-center gap-3"
        >
          {QUICK_ACTIONS.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full
                  border border-gray-200 dark:border-white/[0.08]
                  text-gray-500 dark:text-zinc-500
                  hover:text-gray-900 dark:hover:text-white
                  hover:border-gray-300 dark:hover:border-white/20
                  hover:bg-gray-50 dark:hover:bg-white/[0.04]
                  text-sm font-medium transition-all duration-200"
              >
                <Icon className="w-4 h-4" />
                {action.label}
              </button>
            );
          })}
        </motion.div>

        {/* NO Recent Conversations here - Clean Slate */}

      </div>

      {/* Keyboard Shortcut Hint - Bottom */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4
          text-xs text-gray-400 dark:text-zinc-600"
      >
        <span className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-900 rounded
            border border-gray-200 dark:border-zinc-800 font-mono text-gray-500 dark:text-zinc-500">
            /
          </kbd>
          <span>focus</span>
        </span>
        <span className="w-px h-3 bg-gray-200 dark:bg-zinc-800" />
        <span className="flex items-center gap-1.5">
          <kbd className="px-2 py-1 bg-gray-100 dark:bg-zinc-900 rounded
            border border-gray-200 dark:border-zinc-800 font-mono text-gray-500 dark:text-zinc-500">
            ↵
          </kbd>
          <span>send</span>
        </span>
      </motion.div>
    </div>
  );
}
