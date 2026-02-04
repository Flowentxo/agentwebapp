'use client';

/**
 * WORKFLOW EXECUTIONS PAGE
 *
 * Complete monitoring dashboard for workflow executions
 */

import { useState } from 'react';
import { ExecutionDashboard } from '@/components/monitoring/ExecutionDashboard';
import { LiveExecutionViewer } from '@/components/monitoring/LiveExecutionViewer';

export default function WorkflowExecutionsPage() {
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  return (
    <div className="h-full bg-surface-0">
      <ExecutionDashboard onViewExecution={setSelectedExecutionId} />

      {selectedExecutionId && (
        <LiveExecutionViewer
          executionId={selectedExecutionId}
          isOpen={!!selectedExecutionId}
          onClose={() => setSelectedExecutionId(null)}
        />
      )}
    </div>
  );
}
