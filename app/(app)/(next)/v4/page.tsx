'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { useCreateThread } from '@/lib/hooks/useInbox';
import { sendMessage } from '@/lib/api/inbox-service';
import { VicyOmnibar } from '@/components/vicy/VicyOmnibar';

export default function VicyHomePage() {
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
      router.push(`/v4/${thread.id}`);
    } catch (err) {
      console.error('[VICY] Failed to create conversation:', err);
      setIsSubmitting(false);
    }
  }, [isSubmitting, createThread, router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-6">
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
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
}
