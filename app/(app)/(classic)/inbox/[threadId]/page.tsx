'use client';

/**
 * Flowent Inbox - Thread Chat Page
 * Uses VicyChatInterface with routing feedback, artifact panel, @mention composer
 */

import { useParams } from 'next/navigation';
import { VicyChatInterface } from '@/components/vicy/VicyChatInterface';

export default function ThreadChatPage() {
  const params = useParams();
  const threadId = params.threadId as string;

  if (!threadId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-zinc-500">No thread selected</p>
      </div>
    );
  }

  return <VicyChatInterface threadId={threadId} />;
}
