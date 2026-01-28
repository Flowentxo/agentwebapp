/**
 * JOBS & SCHEDULING CLIENT API
 *
 * Client-side functions for job queue and workflow scheduling
 */

import { apiClient } from './client';

// ============================================================
// JOB TYPES
// ============================================================

export interface JobStatus {
  id: string;
  name: string;
  state: 'completed' | 'failed' | 'delayed' | 'active' | 'waiting';
  progress: number;
  data: any;
  returnValue?: any;
  failedReason?: string;
  processedOn?: number;
  finishedOn?: number;
  attemptsMade?: number;
}

export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface AllQueueStats {
  workflow_execution: QueueStats;
  scheduled_workflow: QueueStats;
}

export interface ScheduledWorkflow {
  jobId: string;
  name: string;
  data: {
    workflowId: string;
    userId: string;
    inputs: Record<string, any>;
    cronExpression?: string;
  };
  nextRun?: number;
  cronExpression?: string;
}

export interface CronExample {
  expression: string;
  description: string;
}

// ============================================================
// JOB QUEUE FUNCTIONS
// ============================================================

/**
 * Get statistics for all job queues
 */
export async function getJobQueueStats(): Promise<{
  success: boolean;
  stats: AllQueueStats;
}> {
  const { data } = await apiClient.get('/jobs/stats');
  return data;
}

/**
 * Get specific job status
 */
export async function getJobStatus(
  jobType: string,
  jobId: string
): Promise<{
  success: boolean;
  job: JobStatus;
}> {
  const { data } = await apiClient.get(`/jobs/${jobType}/${jobId}`);
  return data;
}

/**
 * Get all jobs for a specific queue
 */
export async function getJobs(
  jobType: string,
  state: 'completed' | 'failed' | 'delayed' | 'active' | 'waiting' = 'active'
): Promise<{
  success: boolean;
  jobs: JobStatus[];
  count: number;
}> {
  const { data } = await apiClient.get(`/jobs/${jobType}`, {
    params: { state },
  });
  return data;
}

/**
 * Retry a failed job
 */
export async function retryJob(
  jobType: string,
  jobId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.post(`/jobs/${jobType}/${jobId}/retry`);
  return data;
}

/**
 * Remove a job from the queue
 */
export async function removeJob(
  jobType: string,
  jobId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.delete(`/jobs/${jobType}/${jobId}`);
  return data;
}

/**
 * Pause queue processing
 */
export async function pauseQueue(
  jobType: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.post(`/jobs/${jobType}/pause`);
  return data;
}

/**
 * Resume queue processing
 */
export async function resumeQueue(
  jobType: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.post(`/jobs/${jobType}/resume`);
  return data;
}

/**
 * Clean old jobs from queue
 */
export async function cleanQueue(
  jobType: string,
  grace: number = 3600000,
  limit: number = 1000
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.post(`/jobs/${jobType}/clean`, {
    grace,
    limit,
  });
  return data;
}

// ============================================================
// WORKFLOW SCHEDULING FUNCTIONS
// ============================================================

/**
 * Execute workflow immediately (background)
 */
export async function executeWorkflow(
  workflowId: string,
  inputs: Record<string, any> = {}
): Promise<{
  success: boolean;
  jobId: string;
  message: string;
}> {
  const { data } = await apiClient.post('/scheduling/execute', {
    workflowId,
    inputs,
  });
  return data;
}

/**
 * Schedule workflow with cron expression
 */
export async function scheduleWorkflow(options: {
  workflowId: string;
  cronExpression: string;
  inputs?: Record<string, any>;
  maxRuns?: number;
}): Promise<{
  success: boolean;
  jobId: string;
  scheduleName: string;
  message: string;
}> {
  const { data } = await apiClient.post('/scheduling/schedule', options);
  return data;
}

/**
 * Get all scheduled workflows
 */
export async function getScheduledWorkflows(): Promise<{
  success: boolean;
  schedules: ScheduledWorkflow[];
  count: number;
}> {
  const { data } = await apiClient.get('/scheduling/schedules');
  return data;
}

/**
 * Cancel scheduled workflow
 */
export async function cancelScheduledWorkflow(
  scheduleName: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.delete(`/scheduling/schedules/${scheduleName}`);
  return data;
}

/**
 * Get workflow job status
 */
export async function getWorkflowJobStatus(
  jobId: string
): Promise<{
  success: boolean;
  job: {
    id: string;
    state: string;
    progress: number;
    data: any;
    returnValue?: any;
    failedReason?: string;
  };
}> {
  const { data } = await apiClient.get(`/scheduling/job/${jobId}`);
  return data;
}

/**
 * Retry failed workflow job
 */
export async function retryWorkflowJob(
  jobId: string
): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.post(`/scheduling/job/${jobId}/retry`);
  return data;
}

/**
 * Get cron expression examples
 */
export async function getCronExamples(): Promise<{
  success: boolean;
  examples: CronExample[];
}> {
  const { data } = await apiClient.get('/scheduling/cron-examples');
  return data;
}
