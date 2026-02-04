'use client';

import { cn } from '@/lib/utils';
import { CheckCircle, Circle, Loader2, XCircle } from 'lucide-react';

export interface PipelineStep {
  id: string;
  label: string;
  agentName: string;
  agentColor: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
}

interface WorkflowPipelineCardProps {
  steps: PipelineStep[];
  workflowName?: string;
}

const statusConfig = {
  completed: {
    icon: CheckCircle,
    dotClass: 'bg-emerald-400',
    textClass: 'text-emerald-400',
    lineClass: 'bg-emerald-400/30',
  },
  in_progress: {
    icon: Loader2,
    dotClass: 'bg-violet-500 animate-status-pulse',
    textClass: 'text-violet-400',
    lineClass: 'bg-violet-500/30',
  },
  pending: {
    icon: Circle,
    dotClass: 'bg-zinc-600',
    textClass: 'text-zinc-500',
    lineClass: 'bg-zinc-700/30',
  },
  failed: {
    icon: XCircle,
    dotClass: 'bg-red-400',
    textClass: 'text-red-400',
    lineClass: 'bg-red-400/30',
  },
};

export function WorkflowPipelineCard({ steps, workflowName }: WorkflowPipelineCardProps) {
  if (!steps || steps.length === 0) return null;

  const completedCount = steps.filter((s) => s.status === 'completed').length;

  return (
    <div className="mx-auto max-w-md my-4">
      <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
            {workflowName || 'Workflow'}
          </span>
          <span className="text-[10px] text-gray-400 dark:text-zinc-600">
            {completedCount}/{steps.length} steps
          </span>
        </div>

        {/* Steps */}
        <div className="space-y-0">
          {steps.map((step, index) => {
            const config = statusConfig[step.status];
            const Icon = config.icon;
            const isLast = index === steps.length - 1;

            return (
              <div key={step.id} className="flex items-stretch gap-3">
                {/* Timeline column */}
                <div className="flex flex-col items-center w-5 flex-shrink-0">
                  {/* Status icon */}
                  <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                    {step.status === 'in_progress' ? (
                      <Loader2 className={cn('w-4 h-4 animate-spin', config.textClass)} />
                    ) : step.status === 'completed' ? (
                      <CheckCircle className={cn('w-4 h-4', config.textClass)} />
                    ) : step.status === 'failed' ? (
                      <XCircle className={cn('w-4 h-4', config.textClass)} />
                    ) : (
                      <Circle className={cn('w-4 h-4', config.textClass)} />
                    )}
                  </div>
                  {/* Connecting line */}
                  {!isLast && (
                    <div className={cn('w-0.5 flex-1 min-h-[16px]', config.lineClass)} />
                  )}
                </div>

                {/* Step content */}
                <div className="flex-1 pb-3">
                  <p
                    className={cn(
                      'text-sm font-medium leading-5',
                      step.status === 'pending'
                        ? 'text-gray-400 dark:text-zinc-600'
                        : 'text-gray-900 dark:text-white'
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: step.agentColor }}>
                    {step.agentName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
