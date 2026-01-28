'use client';

import { AgentTestPanel } from '@/components/admin/AgentTestPanel';
import '@/app/agent-test-panel.css';

export default function AgentTestsPage() {
  return (
    <div className="space-y-6">
      <AgentTestPanel />
    </div>
  );
}
