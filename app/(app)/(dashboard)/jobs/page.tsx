'use client';

/**
 * JOBS & SCHEDULING DASHBOARD
 *
 * Monitor and manage background jobs and workflow scheduling
 */

import { useState, useEffect } from 'react';
import {
  getJobQueueStats,
  getJobs,
  retryJob,
  removeJob,
  pauseQueue,
  resumeQueue,
  AllQueueStats,
  JobStatus,
} from '@/lib/api/jobs-client';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Activity,
  Pause,
  Play,
  RotateCcw,
  Trash2,
  Calendar,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

type QueueType = 'workflow_execution' | 'scheduled_workflow';

export default function JobsPage() {
  const [stats, setStats] = useState<AllQueueStats | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<QueueType>('workflow_execution');
  const [selectedState, setSelectedState] = useState<
    'active' | 'waiting' | 'completed' | 'failed' | 'delayed'
  >('active');
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadStats = async () => {
    try {
      const response = await getJobQueueStats();
      setStats(response.stats);
    } catch (error) {
      console.error('[JOBS] Failed to load stats:', error);
    }
  };

  const loadJobs = async () => {
    try {
      setIsLoading(true);
      const response = await getJobs(selectedQueue, selectedState);
      setJobs(response.jobs);
    } catch (error) {
      console.error('[JOBS] Failed to load jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async (jobId: string) => {
    try {
      await retryJob(selectedQueue, jobId);
      await loadJobs();
      await loadStats();
    } catch (error: any) {
      alert(`Failed to retry job: ${error.message}`);
    }
  };

  const handleRemove = async (jobId: string) => {
    if (!confirm('Are you sure you want to remove this job?')) return;

    try {
      await removeJob(selectedQueue, jobId);
      await loadJobs();
      await loadStats();
    } catch (error: any) {
      alert(`Failed to remove job: ${error.message}`);
    }
  };

  const handlePauseQueue = async () => {
    try {
      await pauseQueue(selectedQueue);
      alert(`Queue paused: ${selectedQueue}`);
    } catch (error: any) {
      alert(`Failed to pause queue: ${error.message}`);
    }
  };

  const handleResumeQueue = async () => {
    try {
      await resumeQueue(selectedQueue);
      alert(`Queue resumed: ${selectedQueue}`);
    } catch (error: any) {
      alert(`Failed to resume queue: ${error.message}`);
    }
  };

  useEffect(() => {
    loadStats();
    loadJobs();

    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      loadStats();
      loadJobs();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedQueue, selectedState]);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgb(var(--accent))]/20">
                <Activity className="h-6 w-6 text-[rgb(var(--accent))]" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-text">Jobs & Scheduling</h1>
                <p className="text-sm text-text-muted mt-1">
                  Monitor background jobs and manage workflow scheduling
                </p>
              </div>
            </div>

            <Link
              href="/workflows/schedules"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[rgb(var(--accent))] text-white hover:opacity-90 transition"
            >
              <Calendar className="h-4 w-4" />
              View Schedules
            </Link>
          </div>
        </div>

        {/* Queue Statistics */}
        {stats && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-text">Queue Statistics</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Workflow Execution Queue */}
              <QueueStatsCard
                title="Workflow Execution"
                stats={stats.workflow_execution}
                isSelected={selectedQueue === 'workflow_execution'}
                onClick={() => setSelectedQueue('workflow_execution')}
              />

              {/* Scheduled Workflows Queue */}
              <QueueStatsCard
                title="Scheduled Workflows"
                stats={stats.scheduled_workflow}
                isSelected={selectedQueue === 'scheduled_workflow'}
                onClick={() => setSelectedQueue('scheduled_workflow')}
              />
            </div>
          </div>
        )}

        {/* Queue Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-muted">Show:</span>
            {(['active', 'waiting', 'completed', 'failed', 'delayed'] as const).map((state) => (
              <button
                key={state}
                onClick={() => setSelectedState(state)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition ${
                  selectedState === state
                    ? 'bg-[rgb(var(--accent))] text-white'
                    : 'border border-white/10 bg-surface-1 text-text hover:bg-card/5'
                }`}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePauseQueue}
              className="flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 bg-surface-1 text-text hover:bg-card/5 transition text-sm"
            >
              <Pause className="h-4 w-4" />
              Pause
            </button>
            <button
              onClick={handleResumeQueue}
              className="flex items-center gap-2 px-3 py-1 rounded-lg border border-white/10 bg-surface-1 text-text hover:bg-card/5 transition text-sm"
            >
              <Play className="h-4 w-4" />
              Resume
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text">
                {selectedQueue.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} -{' '}
                {selectedState.charAt(0).toUpperCase() + selectedState.slice(1)}
              </h2>
              <span className="text-sm text-text-muted">
                {jobs.length} job{jobs.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--accent))]" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-text-muted opacity-50 mb-4" />
              <p className="text-sm text-text-muted">No {selectedState} jobs</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {jobs.map((job, index) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={index}
                    onRetry={handleRetry}
                    onRemove={handleRemove}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface QueueStatsCardProps {
  title: string;
  stats: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  };
  isSelected: boolean;
  onClick: () => void;
}

function QueueStatsCard({ title, stats, isSelected, onClick }: QueueStatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className={`rounded-lg border p-6 cursor-pointer transition ${
        isSelected
          ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10'
          : 'border-white/10 bg-surface-1 hover:border-white/20'
      }`}
    >
      <h3 className="text-lg font-semibold text-text mb-4">{title}</h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-bold text-blue-500">{stats.active}</p>
          <p className="text-xs text-text-muted">Active</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-yellow-500">{stats.waiting}</p>
          <p className="text-xs text-text-muted">Waiting</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-purple-500">{stats.delayed}</p>
          <p className="text-xs text-text-muted">Delayed</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/10">
        <div>
          <p className="text-xl font-bold text-green-500">{stats.completed}</p>
          <p className="text-xs text-text-muted">Completed</p>
        </div>
        <div>
          <p className="text-xl font-bold text-red-500">{stats.failed}</p>
          <p className="text-xs text-text-muted">Failed</p>
        </div>
      </div>
    </motion.div>
  );
}

interface JobCardProps {
  job: JobStatus;
  index: number;
  onRetry: (jobId: string) => void;
  onRemove: (jobId: string) => void;
}

function JobCard({ job, index, onRetry, onRemove }: JobCardProps) {
  const getStateIcon = () => {
    switch (job.state) {
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'active':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'delayed':
        return <Clock className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStateBadge = () => {
    const colors = {
      completed: 'bg-green-500/20 text-green-500',
      failed: 'bg-red-500/20 text-red-500',
      active: 'bg-blue-500/20 text-blue-500',
      waiting: 'bg-yellow-500/20 text-yellow-500',
      delayed: 'bg-purple-500/20 text-purple-500',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
          colors[job.state]
        }`}
      >
        {getStateIcon()}
        {job.state}
      </span>
    );
  };

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
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-sm font-semibold text-text">{job.name}</h4>
            {getStateBadge()}
          </div>
          <p className="text-xs text-text-muted font-mono">{job.id}</p>
        </div>

        <div className="flex items-center gap-2">
          {job.state === 'failed' && (
            <button
              onClick={() => onRetry(job.id)}
              className="text-xs text-text-muted hover:text-[rgb(var(--accent))] transition flex items-center gap-1"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
          )}
          <button
            onClick={() => onRemove(job.id)}
            className="text-xs text-text-muted hover:text-red-500 transition flex items-center gap-1"
          >
            <Trash2 className="h-3 w-3" />
            Remove
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {job.state === 'active' && job.progress > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-text-muted mb-1">
            <span>Progress</span>
            <span>{job.progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-card/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[rgb(var(--accent))] to-purple-500 transition-all"
              style={{ width: `${job.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs text-text-muted">
        <div className="flex items-center gap-3">
          {job.processedOn && (
            <span>{formatDistanceToNow(new Date(job.processedOn), { addSuffix: true })}</span>
          )}
          {job.attemptsMade !== undefined && <span>Attempts: {job.attemptsMade}</span>}
        </div>
      </div>

      {/* Error Message */}
      {job.failedReason && (
        <div className="mt-3 text-xs text-red-500 bg-red-500/10 rounded px-2 py-1">
          Error: {job.failedReason}
        </div>
      )}
    </motion.div>
  );
}
