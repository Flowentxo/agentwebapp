'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { useCreateThread } from '@/lib/hooks/useInbox';
import { sendMessage } from '@/lib/api/inbox-service';
import { useInboxSocket } from '@/lib/socket';
import { VicyOmnibar } from './VicyOmnibar';
import { VicyChatInterface } from './VicyChatInterface';
import { SwarmPanel } from './SwarmPanel';

interface WarRoomState {
  phase: 'idle' | 'submitting' | 'chatting' | 'error';
  threadId: string | null;
  initialPrompt: string | null;
  errorMessage: string | null;
}

const INITIAL_STATE: WarRoomState = {
  phase: 'idle',
  threadId: null,
  initialPrompt: null,
  errorMessage: null,
};

export function WarRoomShell() {
  const createThread = useCreateThread();
  const { joinThread } = useInboxSocket();
  const [state, setState] = useState<WarRoomState>(INITIAL_STATE);

  // Sync URL after transition to chat (no Next.js navigation)
  useEffect(() => {
    if (state.phase === 'chatting' && state.threadId) {
      window.history.replaceState(null, '', `/v4/${state.threadId}`);
    }
  }, [state.phase, state.threadId]);

  // Handle browser back button
  useEffect(() => {
    const handlePopState = () => {
      const isHome = window.location.pathname === '/v4' || window.location.pathname === '/v4/';
      if (isHome && state.phase === 'chatting') {
        setState(INITIAL_STATE);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [state.phase]);

  // Submit handler: create thread -> join room -> send message -> transition
  const handleSubmit = useCallback(async (content: string) => {
    setState((prev) => ({
      ...prev,
      phase: 'submitting',
      initialPrompt: content,
      errorMessage: null,
    }));

    try {
      const subject = content.length > 60 ? content.substring(0, 57) + '...' : content;
      const thread = await createThread.mutateAsync({
        subject,
        agentId: 'omni',
        agentName: 'AI Assistant',
      });

      // Join the thread room immediately so SwarmPanel can receive socket events
      joinThread(thread.id);

      // Send the message
      await sendMessage(thread.id, content);

      // Update state with threadId (still submitting - SwarmPanel will call onReady)
      setState((prev) => ({
        ...prev,
        threadId: thread.id,
      }));
    } catch (err) {
      console.error('[WAR_ROOM] Failed to create conversation:', err);
      setState((prev) => ({
        ...prev,
        phase: 'error',
        errorMessage: err instanceof Error ? err.message : 'Konversation konnte nicht erstellt werden',
      }));
      // Auto-recover to idle after 3 seconds
      setTimeout(() => setState(INITIAL_STATE), 3000);
    }
  }, [createThread, joinThread]);

  // SwarmPanel signals the first message arrived -> transition to chat
  const handleSwarmReady = useCallback(() => {
    setState((prev) => {
      if (prev.phase !== 'submitting') return prev;
      return { ...prev, phase: 'chatting' };
    });
  }, []);

  // Back handler: reset to home
  const handleBack = useCallback(() => {
    setState(INITIAL_STATE);
    window.history.replaceState(null, '', '/v4');
  }, []);

  const isHome = state.phase === 'idle' || state.phase === 'error';
  const isSubmitting = state.phase === 'submitting';
  const isChat = state.phase === 'chatting';

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: 'var(--vicy-bg)' }}>
      <AnimatePresence mode="wait">
        {/* HOME VIEW */}
        {isHome && (
          <motion.div
            key="home"
            className="flex-1 flex flex-col items-center justify-center px-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40, transition: { duration: 0.3 } }}
          >
            <div className="w-full max-w-[640px]">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(139, 92, 246, 0.05))',
                    boxShadow: '0 0 40px rgba(139, 92, 246, 0.08)',
                  }}
                >
                  <Sparkles className="w-5 h-5 text-violet-400" />
                </div>
              </div>

              {/* Title */}
              <h1
                className="text-center text-xl font-medium mb-8"
                style={{ color: 'var(--vicy-text-primary)' }}
              >
                How can I help?
              </h1>

              {/* Omnibar */}
              <div className="relative">
                <VicyOmnibar
                  onSubmit={handleSubmit}
                  isSubmitting={false}
                />
              </div>

              {/* Error toast */}
              {state.errorMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 text-center text-sm text-red-400"
                >
                  {state.errorMessage}
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* SWARM VIEW (submitting) */}
        {isSubmitting && (
          <SwarmPanel
            key="swarm"
            threadId={state.threadId}
            prompt={state.initialPrompt}
            onReady={handleSwarmReady}
          />
        )}

        {/* CHAT VIEW */}
        {isChat && state.threadId && (
          <motion.div
            key="chat"
            className="flex-1 flex flex-col min-h-0"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <VicyChatInterface
              threadId={state.threadId}
              onBack={handleBack}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
