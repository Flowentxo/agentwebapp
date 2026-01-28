'use client';

/**
 * Flowent Inbox v3 - Thread Chat Page
 * Grok-style chat interface using the new ChatInterface component
 */

import { useParams } from 'next/navigation';
import { ChatInterface } from '../components/ChatInterface';

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

  return <ChatInterface threadId={threadId} />;
}
