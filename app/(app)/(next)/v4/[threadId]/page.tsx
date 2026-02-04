'use client';

import { useParams } from 'next/navigation';
import { VicyChatInterface } from '@/components/vicy/VicyChatInterface';

export default function VicyThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;

  return <VicyChatInterface threadId={threadId} />;
}
