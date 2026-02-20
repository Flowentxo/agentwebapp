'use client';

/**
 * Flowent Inbox - Clean AI-First Landing Page
 *
 * Minimal omnibar design. The system auto-routes requests
 * to the best agent via RoutingService (Claude Haiku).
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useCreateThread } from '@/lib/hooks/useInbox';
import { sendMessage } from '@/lib/api/inbox-service';
import { VicyOmnibar } from '@/components/vicy/VicyOmnibar';

export default function InboxPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createThread = useCreateThread();

  const handleSubmit = useCallback(async (content: string) => {
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const subject = content.length > 60 ? content.substring(0, 57) + '...' : content;
      const thread = await createThread.mutateAsync({
        subject,
        agentId: 'omni',
        agentName: 'AI Assistant',
      });

      await sendMessage(thread.id, content);
      router.push(`/inbox/${thread.id}`);
    } catch (err) {
      console.error('[INBOX] Failed to create conversation:', err);
      setIsSubmitting(false);
    }
  }, [isSubmitting, createThread, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6 relative">
      {/* Animated mesh gradient background */}
      <div className="mesh-bg" />
      <div className="w-full max-w-2xl relative z-10">
        {/* Violet Sparkles Logo with Aura */}
        <div className="relative flex justify-center mb-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-gradient-to-r from-purple-500/10 to-blue-500/10 blur-[100px]" />
          </div>
          <div
            className="relative w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.20), rgba(139, 92, 246, 0.08))',
              boxShadow: '0 0 60px rgba(139, 92, 246, 0.2), 0 0 120px rgba(139, 92, 246, 0.08)',
            }}
          >
            <Sparkles className="w-7 h-7 text-violet-400" />
          </div>
        </div>

        {/* Title */}
        <h1 className="text-center text-lg font-semibold text-zinc-400 tracking-tight mb-6">
          Wie kann ich dir helfen?
        </h1>

        {/* Quick Action Pills */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[
            { emoji: '\u{1F4DD}', label: 'E-Mail', prompt: 'Schreibe eine freundliche E-Mail an einen Kunden bezueglich...' },
            { emoji: '\u{1F50D}', label: 'Markt-Check', prompt: 'Recherchiere aktuelle Immobilienpreise in...' },
            { emoji: '\u2696\uFE0F', label: 'Vertrag', prompt: 'Analysiere diesen Vertrag auf rechtliche Risiken:' },
            { emoji: '\u{1F4B0}', label: 'ROI', prompt: 'Berechne die Rendite fuer folgendes Objekt:' },
          ].map((pill) => (
            <button
              key={pill.label}
              onClick={() => handleSubmit(pill.prompt)}
              disabled={isSubmitting}
              className="pill-hover flex items-center gap-1.5 bg-zinc-800/50 border border-white/[0.10] hover:border-purple-500/30 rounded-full px-4 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-all disabled:opacity-50"
            >
              <span>{pill.emoji}</span>
              <span>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Omnibar */}
        <VicyOmnibar onSubmit={handleSubmit} isSubmitting={isSubmitting} />
      </div>
    </div>
  );
}
