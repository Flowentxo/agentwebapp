'use client';

import { AgentCleanupPanel } from '@/components/admin/AgentCleanupPanel';
import '@/app/agent-cleanup-panel.css';

export default function AgentCleanupPage() {
  return (
    <div className="space-y-6">
      <AgentCleanupPanel />
    </div>
  );
}
