/**
 * WORKFLOWS API CLIENT
 *
 * Frontend client for Agent Studio workflows and templates
 */

import axios from 'axios';
import { Node, Edge } from 'reactflow';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  status: 'draft' | 'active' | 'archived';
  visibility: 'private' | 'team' | 'public';
  isTemplate: boolean;
  templateCategory?: string;
  tags: string[];
  userId: string;
  workspaceId?: string;
  version: string;
  parentWorkflowId?: string;
  executionCount: number;
  lastExecutedAt?: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  nodes?: Node[];
  edges?: Edge[];
  tags?: string[];
  status?: 'draft' | 'active' | 'archived';
  visibility?: 'private' | 'team' | 'public';
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  nodes?: Node[];
  edges?: Edge[];
  tags?: string[];
  status?: 'draft' | 'active' | 'archived';
  visibility?: 'private' | 'team' | 'public';
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  input?: any;
  output?: any;
  logs: any[];
  status: 'pending' | 'running' | 'success' | 'error';
  error?: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  userId: string;
  isTest: boolean;
  createdAt: string;
}

/**
 * Get API headers with user ID
 */
function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user-id': 'default-user', // TODO: Get from auth context
  };
}

/**
 * List all workflows (user's + public templates)
 */
export async function listWorkflows(params?: {
  status?: string;
  isTemplate?: boolean;
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ workflows: Workflow[]; total: number }> {
  const response = await axios.get(`${API_BASE_URL}/api/workflows`, {
    headers: getHeaders(),
    params,
  });
  return response.data;
}

/**
 * Get public templates only
 */
export async function listTemplates(category?: string): Promise<{ templates: Workflow[] }> {
  const response = await axios.get(`${API_BASE_URL}/api/workflows/templates`, {
    headers: getHeaders(),
    params: category ? { category } : {},
  });
  return response.data;
}

/**
 * Get a specific workflow by ID
 */
export async function getWorkflow(id: string): Promise<{ workflow: Workflow }> {
  const response = await axios.get(`${API_BASE_URL}/api/workflows/${id}`, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Create a new workflow
 */
export async function createWorkflow(data: CreateWorkflowData): Promise<{ workflow: Workflow }> {
  const response = await axios.post(`${API_BASE_URL}/api/workflows`, data, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Update an existing workflow
 */
export async function updateWorkflow(
  id: string,
  data: UpdateWorkflowData
): Promise<{ workflow: Workflow }> {
  const response = await axios.put(`${API_BASE_URL}/api/workflows/${id}`, data, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Delete a workflow
 */
export async function deleteWorkflow(id: string): Promise<{ success: boolean }> {
  const response = await axios.delete(`${API_BASE_URL}/api/workflows/${id}`, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Clone a workflow (create from template)
 */
export async function cloneWorkflow(id: string): Promise<{ workflow: Workflow }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/workflows/${id}/clone`,
    {},
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(
  id: string,
  input?: any,
  isTest: boolean = true
): Promise<{ executionId: string; status: string; message: string }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/workflows/${id}/execute`,
    { input, isTest },
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}

/**
 * Get execution history for a workflow
 */
export async function getWorkflowExecutions(
  id: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ executions: WorkflowExecution[]; total: number }> {
  const response = await axios.get(`${API_BASE_URL}/api/workflows/${id}/executions`, {
    headers: getHeaders(),
    params: { limit, offset },
  });
  return response.data;
}

/**
 * Get live execution status (for polling)
 */
export async function getExecutionStatus(executionId: string): Promise<{
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'success' | 'error';
  currentNodeId?: string;
  progress?: {
    startTime: number;
    duration: number;
  };
  logs?: any[];
  output?: any;
  error?: string;
}> {
  const response = await axios.get(
    `${API_BASE_URL}/api/workflows/executions/${executionId}/status`,
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}

// ========================================
// DEPLOYMENT MANAGEMENT
// ========================================

/**
 * Publish a workflow (draft → active)
 */
export async function publishWorkflow(
  id: string,
  changeDescription?: string
): Promise<{ workflow: Workflow; message: string }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/workflows/${id}/publish`,
    { changeDescription },
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}

/**
 * Archive a workflow (active → archived)
 */
export async function archiveWorkflow(id: string): Promise<{ workflow: Workflow; message: string }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/workflows/${id}/archive`,
    {},
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}

/**
 * Restore archived workflow (archived → draft)
 */
export async function unarchiveWorkflow(id: string): Promise<{ workflow: Workflow; message: string }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/workflows/${id}/unarchive`,
    {},
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}

/**
 * Get version history for a workflow
 */
export async function getWorkflowVersions(id: string): Promise<{
  versions: Array<{
    id: string;
    version: string;
    name: string;
    description: string | null;
    changeDescription: string | null;
    createdBy: string;
    createdAt: string;
    isCurrent: boolean;
  }>;
  currentVersion: string;
}> {
  const response = await axios.get(`${API_BASE_URL}/api/workflows/${id}/versions`, {
    headers: getHeaders(),
  });
  return response.data;
}

/**
 * Rollback workflow to a specific version
 */
export async function rollbackWorkflow(
  id: string,
  versionId: string
): Promise<{ workflow: Workflow; message: string }> {
  const response = await axios.post(
    `${API_BASE_URL}/api/workflows/${id}/rollback`,
    { versionId },
    {
      headers: getHeaders(),
    }
  );
  return response.data;
}
