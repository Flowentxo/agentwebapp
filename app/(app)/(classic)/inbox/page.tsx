'use client';

/**
 * Flowent Inbox - Orchestration Hub Landing Page
 *
 * The system auto-routes requests to the best agent via RoutingService.
 * Users type naturally; no need to pick an agent manually.
 * Quick Start templates provide one-click workflow starters.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles, ArrowUp, Plus, Loader2 } from 'lucide-react';
import { useCreateThread } from '@/lib/hooks/useInbox';
import { sendMessage } from '@/lib/api/inbox-service';
import { getStarterTemplates } from '@/lib/studio/template-library';
import { agentPersonas } from '@/lib/agents/personas';
import { NewChatModal } from './components/NewChatModal';
import { QuickStartCard } from './components/QuickStartCard';

export default function InboxPage() {
  const router = useRouter();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const createThread = useCreateThread();

  // Get starter templates (memoized)
  const templates = useMemo(() => getStarterTemplates(4), []);

  // Get active agents for pills
  const activeAgents = useMemo(
    () => agentPersonas.filter((a) => a.status === 'active' && a.available).slice(0, 8),
    []
  );

  // Auto-focus textarea on mount
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

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    try {
      // 1. Create thread with 'omni' agent (triggers auto-routing on first message)
      const subject = trimmed.length > 60 ? trimmed.substring(0, 57) + '...' : trimmed;
      const thread = await createThread.mutateAsync({
        subject,
        agentId: 'omni',
        agentName: 'AI Assistant',
      });

      // 2. Send the first message (triggers RoutingService on backend)
      await sendMessage(thread.id, trimmed);

      // 3. Navigate to the thread
      router.push(`/inbox/${thread.id}`);
    } catch (err) {
      console.error('[INBOX] Failed to create conversation:', err);
      setIsSubmitting(false);
    }
  }, [input, isSubmitting, createThread, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTemplateClick = useCallback(
    (template: { useCase?: string; description?: string }) => {
      const text = template.useCase || template.description || '';
      setInput(text);
      textareaRef.current?.focus();
    },
    []
  );

  const handleAgentPillClick = useCallback((agentName: string) => {
    setInput(`@${agentName} `);
    textareaRef.current?.focus();
  }, []);

  const handleThreadCreated = (threadId: string) => {
    router.push(`/inbox/${threadId}`);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 overflow-y-auto">
      <div className="w-full max-w-2xl py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-zinc-800 dark:to-zinc-900 mb-4">
            <Sparkles className="w-6 h-6 text-gray-500 dark:text-zinc-400" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            What do you need help with?
          </h1>
          <p className="text-sm text-gray-500 dark:text-zinc-500">
            Describe your task or start a workflow — the system routes it to the best agent.
          </p>
        </div>

        {/* Universal Prompt Input */}
        <div className="relative group">
          <div className="relative rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-sm transition-all duration-200 focus-within:border-gray-400 dark:focus-within:border-zinc-500 universal-prompt-glow">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Analyze our Q4 revenue trends, Draft a follow-up email, Review this contract..."
              rows={1}
              disabled={isSubmitting}
              className="w-full resize-none bg-transparent px-4 pt-4 pb-12 text-[15px] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-600 focus:outline-none disabled:opacity-50"
            />

            {/* Bottom bar inside textarea */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-gray-400 dark:text-zinc-600">
                  Shift+Enter for new line
                </span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!input.trim() || isSubmitting}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-800 dark:hover:bg-gray-200 transition-all duration-150"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Quick Start Templates */}
        <div className="mt-8">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wider mb-3">
            Quick Start
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {templates.map((template, index) => (
              <QuickStartCard
                key={template.id}
                template={template}
                index={index}
                onClick={handleTemplateClick}
              />
            ))}
          </div>
        </div>

        {/* Agent Pills */}
        <div className="mt-6">
          <h2 className="text-xs font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wider mb-3">
            Or ask a specific agent
          </h2>
          <div className="flex flex-wrap gap-2">
            {activeAgents.map((agent) => (
              <button
                key={agent.id}
                onClick={() => handleAgentPillClick(agent.name)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-xs text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700 hover:text-gray-900 dark:hover:text-white transition-all"
              >
                <span
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: agent.color }}
                />
                {agent.name}
              </button>
            ))}
            <button
              onClick={() => setIsNewChatModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-gray-300 dark:border-zinc-700 text-xs text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 hover:border-gray-400 dark:hover:border-zinc-600 transition-all"
            >
              <Plus className="w-3 h-3" />
              All agents
            </button>
          </div>
        </div>
      </div>

      <NewChatModal
        open={isNewChatModalOpen}
        onOpenChange={setIsNewChatModalOpen}
        onThreadCreated={handleThreadCreated}
      />
    </div>
  );
}
