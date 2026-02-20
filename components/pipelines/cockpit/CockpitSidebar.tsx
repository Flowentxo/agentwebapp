'use client';

/**
 * CockpitSidebar Component
 *
 * Right sidebar container for the Pipeline Cockpit.
 * Houses TriggerCockpit, AutopilotToggle, ApprovalQueuePanel, and LiveStepTracker.
 *
 * Vicy-Style: Deep Black (#0f172a) + Subtle borders
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Activity, X } from 'lucide-react';
import { cn } from '@/lib/utils';

import { TriggerCockpit, TriggerType } from './TriggerCockpit';
import { AutopilotConfig } from './AutopilotToggle';
import { GovernancePanel } from './GovernancePanel';
import { ApprovalQueuePanel, ApprovalRequest } from './ApprovalQueuePanel';
import { LiveStepTracker, ExecutionStep } from './LiveStepTracker';
import { LivePulse } from './LivePulse';

// ============================================
// TYPES
// ============================================

interface ScheduleConfig {
  cronExpression: string;
  nextRun?: string;
  timezone?: string;
}

interface WebhookConfig {
  url?: string;
  token?: string;
  isActive?: boolean;
}

interface CockpitSidebarProps {
  pipelineId: string;

  // Trigger Config
  currentTrigger: TriggerType;
  scheduleConfig?: ScheduleConfig;
  webhookConfig?: WebhookConfig;
  onTriggerChange: (type: TriggerType, config?: ScheduleConfig | WebhookConfig) => void;
  onRunNow?: () => void;

  // Autopilot Config
  autopilotConfig: AutopilotConfig;
  onAutopilotChange: (config: AutopilotConfig) => void;

  // Approval Queue
  pendingApprovals: ApprovalRequest[];
  onApprove: (approvalId: string, comment?: string) => Promise<void>;
  onReject: (approvalId: string, reason?: string) => Promise<void>;

  // Live Execution
  executionSteps: ExecutionStep[];
  isRunning: boolean;
  isDryRun?: boolean;
  activeNodeId?: string | null;
  onNodeClick?: (nodeId: string) => void;

  // UI
  onClose?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function CockpitSidebar({
  pipelineId,
  currentTrigger,
  scheduleConfig,
  webhookConfig,
  onTriggerChange,
  onRunNow,
  autopilotConfig,
  onAutopilotChange,
  pendingApprovals,
  onApprove,
  onReject,
  executionSteps,
  isRunning,
  isDryRun = false,
  activeNodeId,
  onNodeClick,
  onClose,
}: CockpitSidebarProps) {
  // Determine what to show based on state
  const hasPendingApprovals = pendingApprovals.length > 0;
  const hasExecutionSteps = executionSteps.length > 0 || isRunning;

  return (
    <div
      className="h-full flex flex-col border-l border-white/[0.06]"
      style={{ background: '#0f172a', width: '384px' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/80">Cockpit</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/30 hover:text-white/50 hover:bg-white/[0.04] transition-colors"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Section: Trigger & Automation */}
        <div className="p-4 space-y-6 border-b border-white/[0.04]">
          {/* Trigger Cockpit */}
          <TriggerCockpit
            pipelineId={pipelineId}
            currentTrigger={currentTrigger}
            scheduleConfig={scheduleConfig}
            webhookConfig={webhookConfig}
            onTriggerChange={onTriggerChange}
            onRunNow={onRunNow}
            isRunning={isRunning}
          />

          {/* Governance Panel (replaces AutopilotToggle) */}
          <GovernancePanel
            config={autopilotConfig}
            onChange={onAutopilotChange}
          />
        </div>

        {/* Section: Pending Approvals (conditionally shown) */}
        <AnimatePresence>
          {hasPendingApprovals && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-white/[0.04]"
            >
              <div className="p-4">
                <ApprovalQueuePanel
                  approvals={pendingApprovals}
                  onApprove={onApprove}
                  onReject={onReject}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Section: Live Pulse (replaces LiveStepTracker) */}
        <AnimatePresence>
          {hasExecutionSteps && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="flex-1"
            >
              <LivePulse
                steps={executionSteps}
                isRunning={isRunning}
                isDryRun={isDryRun}
                activeNodeId={activeNodeId}
                onNodeClick={onNodeClick}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State: When no execution and no approvals */}
        {!hasExecutionSteps && !hasPendingApprovals && (
          <div className="p-6 text-center">
            <div className="w-12 h-12 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center mx-auto mb-3">
              <Activity className="w-6 h-6 text-white/20" />
            </div>
            <p className="text-sm text-white/40">Ready to run</p>
            <p className="text-xs text-white/20 mt-1">
              Start the pipeline to see live execution
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-2 border-t border-white/[0.04]">
        <p className="text-[10px] text-white/20 text-center">
          Pipeline ID: {pipelineId.slice(0, 8)}...
        </p>
      </div>
    </div>
  );
}

export default CockpitSidebar;
