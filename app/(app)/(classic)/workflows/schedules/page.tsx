'use client';

/**
 * WORKFLOW SCHEDULING PAGE
 *
 * Create and manage scheduled workflows with cron expressions
 */

import { useState, useEffect } from 'react';
import {
  getScheduledWorkflows,
  cancelScheduledWorkflow,
  scheduleWorkflow,
  getCronExamples,
  ScheduledWorkflow,
  CronExample,
} from '@/lib/api/jobs-client';
import { listWorkflows, Workflow } from '@/lib/api/workflows-client';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Loader2,
  Info,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

export default function WorkflowSchedulesPage() {
  const [schedules, setSchedules] = useState<ScheduledWorkflow[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [cronExamples, setCronExamples] = useState<CronExample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = async () => {
    try {
      setIsLoading(true);

      const [schedulesResponse, workflowsResponse, cronResponse] = await Promise.all([
        getScheduledWorkflows(),
        listWorkflows(),
        getCronExamples(),
      ]);

      setSchedules(schedulesResponse.schedules);
      setWorkflows(workflowsResponse.workflows);
      setCronExamples(cronResponse.examples);
    } catch (error) {
      console.error('[SCHEDULES] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelSchedule = async (scheduleName: string) => {
    if (!confirm('Are you sure you want to cancel this schedule?')) return;

    try {
      await cancelScheduledWorkflow(scheduleName);
      await loadData();
    } catch (error: any) {
      alert(`Failed to cancel schedule: ${error.message}`);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgb(var(--accent))]/20">
                <Calendar className="h-6 w-6 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text">Workflow Schedules</h1>
                <p className="text-sm text-text-muted mt-1">
                  Create and manage automated workflow execution schedules
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--accent))] text-white hover:opacity-90 transition"
            >
              <Plus className="h-4 w-4" />
              Create Schedule
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={Calendar}
            label="Active Schedules"
            value={schedules.length}
            color="#8B5CF6"
          />
          <StatCard
            icon={Clock}
            label="Total Workflows"
            value={workflows.length}
            color="#10B981"
          />
          <StatCard
            icon={Calendar}
            label="Executions Today"
            value={0}
            color="#F59E0B"
          />
        </div>

        {/* Schedules List */}
        <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">Active Schedules</h2>
              <span className="text-sm text-text-muted">
                {schedules.length} schedule{schedules.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--accent))]" />
            </div>
          ) : schedules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-text-muted opacity-50 mb-4" />
              <p className="text-sm text-text-muted">No scheduled workflows</p>
              <p className="text-xs text-text-muted mt-1">Click "Create Schedule" to get started</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {schedules.map((schedule, index) => {
                  const workflow = workflows.find((w) => w.id === schedule.data.workflowId);
                  return (
                    <ScheduleCard
                      key={schedule.jobId}
                      schedule={schedule}
                      workflow={workflow}
                      index={index}
                      onCancel={handleCancelSchedule}
                    />
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* Create Schedule Modal */}
      {showCreateModal && (
        <CreateScheduleModal
          workflows={workflows}
          cronExamples={cronExamples}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-surface-1 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-text">{value.toLocaleString()}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </motion.div>
  );
}

interface ScheduleCardProps {
  schedule: ScheduledWorkflow;
  workflow?: Workflow;
  index: number;
  onCancel: (scheduleName: string) => void;
}

function ScheduleCard({ schedule, workflow, index, onCancel }: ScheduleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ delay: index * 0.05 }}
      className="rounded-lg border border-white/10 bg-surface-0 p-4 hover:border-white/20 transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-text mb-1">
            {workflow?.name || schedule.data.workflowId}
          </h4>
          <p className="text-xs text-text-muted mb-2">{workflow?.description}</p>

          <div className="flex items-center gap-3 text-xs text-text-muted">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="font-mono">{schedule.cronExpression || schedule.data.cronExpression}</span>
            </div>
            {schedule.nextRun && (
              <span>
                Next: {format(new Date(schedule.nextRun), 'MMM d, HH:mm')}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onCancel(schedule.name)}
          className="text-xs text-text-muted hover:text-red-500 transition flex items-center gap-1"
        >
          <Trash2 className="h-3 w-3" />
          Cancel
        </button>
      </div>

      {/* Job ID */}
      <div className="text-xs text-text-muted font-mono">
        Job ID: {schedule.jobId}
      </div>
    </motion.div>
  );
}

interface CreateScheduleModalProps {
  workflows: Workflow[];
  cronExamples: CronExample[];
  onClose: () => void;
  onCreated: () => void;
}

function CreateScheduleModal({ workflows, cronExamples, onClose, onCreated }: CreateScheduleModalProps) {
  const [selectedWorkflow, setSelectedWorkflow] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [maxRuns, setMaxRuns] = useState<number | undefined>(undefined);
  const [isCreating, setIsCreating] = useState(false);
  const [showExamples, setShowExamples] = useState(false);

  const handleCreate = async () => {
    if (!selectedWorkflow) {
      alert('Please select a workflow');
      return;
    }

    if (!cronExpression) {
      alert('Please enter a cron expression');
      return;
    }

    try {
      setIsCreating(true);

      await scheduleWorkflow({
        workflowId: selectedWorkflow,
        cronExpression,
        maxRuns,
      });

      onCreated();
    } catch (error: any) {
      alert(`Failed to create schedule: ${error.message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-surface-1 rounded-lg border border-white/10 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-text">Create Workflow Schedule</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Workflow Selection */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Select Workflow
            </label>
            <select
              value={selectedWorkflow}
              onChange={(e) => setSelectedWorkflow(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-surface-0 text-text focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20 outline-none"
            >
              <option value="">Choose a workflow...</option>
              {workflows.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cron Expression */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-text">
                Cron Expression
              </label>
              <button
                onClick={() => setShowExamples(!showExamples)}
                className="text-xs text-[rgb(var(--accent))] hover:underline flex items-center gap-1"
              >
                <Info className="h-3 w-3" />
                {showExamples ? 'Hide' : 'Show'} Examples
              </button>
            </div>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 9 * * 1-5"
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-surface-0 text-text font-mono focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20 outline-none"
            />
            <p className="text-xs text-text-muted mt-1">
              Format: minute hour day month weekday
            </p>

            {/* Cron Examples */}
            {showExamples && (
              <div className="mt-4 space-y-2 p-4 rounded-lg bg-surface-0 border border-white/10">
                <p className="text-xs font-semibold text-text mb-2">Common Patterns:</p>
                {cronExamples.map((example, index) => (
                  <button
                    key={index}
                    onClick={() => setCronExpression(example.expression)}
                    className="w-full text-left px-3 py-2 rounded bg-card/5 hover:bg-card/10 transition"
                  >
                    <code className="text-xs text-[rgb(var(--accent))]">
                      {example.expression}
                    </code>
                    <p className="text-xs text-text-muted mt-1">{example.description}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Max Runs */}
          <div>
            <label className="block text-sm font-medium text-text mb-2">
              Max Runs (Optional)
            </label>
            <input
              type="number"
              value={maxRuns || ''}
              onChange={(e) => setMaxRuns(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Unlimited"
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-surface-0 text-text focus:border-[rgb(var(--accent))] focus:ring-2 focus:ring-[rgb(var(--accent))]/20 outline-none"
            />
            <p className="text-xs text-text-muted mt-1">
              Leave empty for unlimited executions
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 text-text hover:bg-card/5 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isCreating}
              className="px-4 py-2 rounded-lg bg-[rgb(var(--accent))] text-white hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  Create Schedule
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
