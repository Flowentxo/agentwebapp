import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import { devtools } from 'zustand/middleware';
import {
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  Viewport,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import {
  validateConnection,
  validateWorkflow,
  type ConnectionValidationResult,
  type WorkflowValidationResult,
} from '@/lib/studio/connection-validator';
import {
  layoutNodes,
  layoutHorizontal,
  layoutVertical,
  layoutCompact,
  layoutSpread,
  type LayoutDirection,
  type LayoutOptions,
} from '@/lib/studio/auto-layout';

// ============================================
// FLIGHT RECORDER TYPES (Phase 13: Time-Travel Debugging)
// ============================================

export interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeType: string;
  nodeName: string;
  stepNumber: number;
  depth?: number;
  parentStepId?: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'skipped' | 'waiting' | 'retrying' | 'timeout';
  // Core Flight Recorder data - resolved inputs/outputs
  inputsRaw?: Record<string, unknown>;
  inputsResolved?: Record<string, unknown>;
  output?: unknown;
  // Error information
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  errorDetails?: Record<string, unknown>;
  // Retry information
  retryAttempt?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  previousErrors?: string[];
  // Timing
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  waitingDurationMs?: number;
  // Cost tracking
  tokensPrompt?: number;
  tokensCompletion?: number;
  tokensTotal?: number;
  costUsd?: number;
  model?: string;
  // Branch/condition info
  branchPath?: string;
  conditionResult?: boolean;
  // External references
  externalCallId?: string;
  approvalId?: string;
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  runNumber: number;
  traceId?: string;
  triggerType: 'manual' | 'webhook' | 'schedule' | 'api' | 'event' | 'resume' | 'retry';
  triggerSource?: string;
  triggerPayload?: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'suspended' | 'timeout';
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  startedAt?: string;
  completedAt?: string;
  totalDurationMs?: number;
  totalTokensUsed?: number;
  totalCostUsd?: number;
  nodesTotal?: number;
  nodesExecuted?: number;
  nodesSucceeded?: number;
  nodesFailed?: number;
  nodesSkipped?: number;
  finalOutput?: unknown;
  userId: string;
  workspaceId?: string;
  isTest: boolean;
  versionId?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RunDetailsResponse {
  run: WorkflowRun;
  steps: ExecutionStep[];
  summary: {
    totalSteps: number;
    successfulSteps: number;
    failedSteps: number;
    skippedSteps: number;
    totalTokens: number;
    totalCost: number;
    avgStepDuration: number;
  };
}

// ============================================
// LOOP ITERATION TYPES (Phase 6: Builder Experience)
// ============================================

export interface IterationStats {
  runIndex: number;
  nodeCount: number;
  completedCount: number;
  errorCount: number;
  skippedCount: number;
  durationMs: number;
  startedAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped';
}

export interface LoopGroupSummary {
  loopId: string;
  loopName: string;
  totalIterations: number;
  completedIterations: number;
  failedIterations: number;
  skippedIterations: number;
  totalDurationMs: number;
  averageDurationMs: number;
  iterations: IterationStats[];
}

// ============================================
// TYPES
// ============================================

export interface PipelineNodeData {
  label: string;
  type: 'trigger' | 'action' | 'agent' | 'condition' | 'output';
  icon?: string;
  color?: string;
  description?: string;
  config?: Record<string, unknown>;
  [key: string]: unknown;
}

export type PipelineNode = Node<PipelineNodeData>;
export type PipelineEdge = Edge;

// Execution status types for real-time visualization
export type NodeExecutionStatus =
  | 'pending'
  | 'running'
  | 'success'
  | 'error'
  | 'suspended'
  | 'skipped'
  | 'retrying'     // Phase 7: Node is retrying after failure
  | 'continued';   // Phase 7: Node failed but workflow continued

export interface NodeExecutionOutput {
  data?: any;
  error?: string;
  duration?: number;
  timestamp?: string;
  // Phase 7: Retry tracking
  retryAttempt?: number;
  maxAttempts?: number;
  nextRetryAt?: string;
  // Phase 7: Continued on error tracking
  continuedOnError?: boolean;
  originalError?: string;
  // Phase 19: Single node execution metrics
  tokensUsed?: { prompt: number; completion: number; total: number };
  cost?: number;
  model?: string;
}

interface PipelineState {
  // State
  pipelineId: string | null;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  viewport: Viewport;
  pipelineName: string;
  isDirty: boolean;
  selectedNodeId: string | null;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // UI State - Dialogs
  templateDialogOpen: boolean;

  // UI State - Control Mode Panels
  showExecutionPanel: boolean;
  showApprovalBar: boolean;
  awaitingApprovalNodeId: string | null;
  isPaused: boolean;

  // Connection Validation State (Phase 22: Node Connectivity)
  lastConnectionError: string | null;
  workflowValidation: WorkflowValidationResult | null;

  // Execution State (Real-time visualization)
  executionId: string | null;
  isRunning: boolean;
  nodeStatus: Record<string, NodeExecutionStatus>;
  nodeOutputs: Record<string, NodeExecutionOutput>;
  executionStartTime: number | null;
  executionError: string | null;

  // Debug Mode State (Phase 13: Flight Recorder - Time-Travel Debugging)
  selectedRunId: string | null;
  runTrace: ExecutionStep[] | null;
  currentRun: WorkflowRun | null;
  runSummary: RunDetailsResponse['summary'] | null;
  isDebugMode: boolean;
  isLoadingRun: boolean;
  debugError: string | null;

  // Phase 6: Loop Iteration Selection State
  selectedIteration: number;
  loopGroupData: LoopGroupSummary | null;
  isLoadingLoopData: boolean;

  // Node & Edge Actions
  onNodesChange: (changes: NodeChange<PipelineNode>[]) => void;
  onEdgesChange: (changes: EdgeChange<PipelineEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (node: PipelineNode) => void;
  updateNode: (nodeId: string, data: Partial<PipelineNodeData>) => void;
  removeNode: (nodeId: string) => void;

  // Connection Validation Actions (Phase 22: Node Connectivity)
  isValidConnection: (connection: Connection) => boolean;
  validateCurrentWorkflow: () => WorkflowValidationResult;
  clearConnectionError: () => void;

  // Viewport Actions
  setViewport: (viewport: Viewport) => void;

  // Selection
  setSelectedNode: (nodeId: string | null) => void;

  // Pipeline Actions
  setPipelineId: (id: string | null) => void;
  setPipelineName: (name: string) => void;
  clearPipeline: () => void;
  loadPipeline: (id: string | null, nodes: PipelineNode[], edges: PipelineEdge[], name?: string, viewport?: Viewport) => void;
  setDirty: (isDirty: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  markSaved: () => void;

  // Execution Actions
  startExecution: (executionId: string) => void;
  updateNodeStatus: (nodeId: string, status: NodeExecutionStatus, output?: NodeExecutionOutput) => void;
  stopExecution: (error?: string) => void;
  resetExecution: () => void;

  // Debug Mode Actions (Phase 13: Flight Recorder)
  loadRun: (runId: string) => Promise<void>;
  exitDebugMode: () => void;
  getStepForNode: (nodeId: string) => ExecutionStep | null;

  // Phase 6: Loop Iteration Actions
  setSelectedIteration: (index: number) => void;
  loadLoopData: (executionId: string, loopId?: string) => Promise<void>;
  clearLoopData: () => void;

  // UI Actions - Dialogs
  setTemplateDialogOpen: (open: boolean) => void;

  // UI Actions - Control Mode Panels
  setShowExecutionPanel: (show: boolean) => void;
  setShowApprovalBar: (show: boolean, nodeId?: string | null) => void;
  setIsPaused: (paused: boolean) => void;

  // Auto-Layout Actions (Phase 22: Premium Features)
  autoLayout: (options?: LayoutOptions) => void;
  autoLayoutHorizontal: () => void;
  autoLayoutVertical: () => void;
  autoLayoutCompact: () => void;
  autoLayoutSpread: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialViewport: Viewport = { x: 0, y: 0, zoom: 1 };

const initialNodes: PipelineNode[] = [
  {
    id: 'start-1',
    type: 'custom',
    position: { x: 250, y: 100 },
    data: {
      label: 'Webhook Trigger',
      type: 'trigger',
      icon: 'Zap',
      color: '#22C55E', // Green
      description: 'Starts when a webhook is received',
    },
  },
];

const initialEdges: PipelineEdge[] = [];

// ============================================
// STORE
// ============================================

export const usePipelineStore = create<PipelineState>()(
  devtools(
    (set, get) => ({
      // Initial State
      pipelineId: null,
      nodes: initialNodes,
      edges: initialEdges,
      viewport: initialViewport,
      pipelineName: 'Untitled Pipeline',
      isDirty: false,
      selectedNodeId: null,
      isSaving: false,
      lastSavedAt: null,

      // UI State - Dialogs
      templateDialogOpen: false,

      // UI State - Control Mode Panels
      showExecutionPanel: false,
      showApprovalBar: false,
      awaitingApprovalNodeId: null,
      isPaused: false,

      // Connection Validation State (Phase 22: Node Connectivity)
      lastConnectionError: null,
      workflowValidation: null,

      // Execution State
      executionId: null,
      isRunning: false,
      nodeStatus: {},
      nodeOutputs: {},
      executionStartTime: null,
      executionError: null,

      // Debug Mode State (Phase 13: Flight Recorder)
      selectedRunId: null,
      runTrace: null,
      currentRun: null,
      runSummary: null,
      isDebugMode: false,
      isLoadingRun: false,
      debugError: null,

      // Phase 6: Loop Iteration State
      selectedIteration: 0,
      loopGroupData: null,
      isLoadingLoopData: false,

      // Node Changes (drag, select, remove, etc.)
      onNodesChange: (changes) => {
        set({
          nodes: applyNodeChanges(changes, get().nodes),
          isDirty: true,
          // Clear workflow validation on structure change
          workflowValidation: null,
        });
      },

      // Edge Changes
      onEdgesChange: (changes) => {
        set({
          edges: applyEdgeChanges(changes, get().edges),
          isDirty: true,
          // Clear workflow validation on structure change
          workflowValidation: null,
        });
      },

      // ============================================
      // CONNECT TWO NODES (Phase 22: Enhanced with Validation)
      // ============================================
      onConnect: (connection) => {
        const { nodes, edges } = get();

        // Validate the connection before adding
        const validationResult = validateConnection(connection, nodes, edges);

        if (!validationResult.isValid) {
          // Log the rejection and store the error
          console.warn('[CONNECTION] Rejected:', validationResult.reason);
          set({ lastConnectionError: validationResult.reason || 'Invalid connection' });
          return; // Don't add the edge
        }

        // Clear any previous error
        set({ lastConnectionError: null });

        // Create the edge with n8n-style appearance
        const newEdge = {
          ...connection,
          id: `edge-${connection.source}-${connection.sourceHandle || 'output'}-${connection.target}-${connection.targetHandle || 'input'}-${Date.now()}`,
          type: 'smoothstep',
          animated: true,
          style: {
            stroke: '#6366F1',
            strokeWidth: 2,
          },
          // Store handle information for routing
          data: {
            sourceHandle: connection.sourceHandle || 'output',
            targetHandle: connection.targetHandle || 'input',
          },
        };

        set({
          edges: addEdge(newEdge, edges),
          isDirty: true,
          // Clear workflow validation on structure change
          workflowValidation: null,
        });

        console.log('[CONNECTION] Added:', {
          source: connection.source,
          target: connection.target,
          sourceHandle: connection.sourceHandle,
          targetHandle: connection.targetHandle,
        });
      },

      // ============================================
      // CONNECTION VALIDATION ACTIONS (Phase 22)
      // ============================================

      /**
       * Check if a connection is valid (for React Flow's isValidConnection prop)
       */
      isValidConnection: (connection: Connection): boolean => {
        const { nodes, edges } = get();
        const result = validateConnection(connection, nodes, edges);
        return result.isValid;
      },

      /**
       * Validate the entire current workflow structure
       */
      validateCurrentWorkflow: (): WorkflowValidationResult => {
        const { nodes, edges } = get();
        const result = validateWorkflow(nodes, edges);
        set({ workflowValidation: result });
        return result;
      },

      /**
       * Clear the last connection error
       */
      clearConnectionError: () => {
        set({ lastConnectionError: null });
      },

      // Add a new node
      addNode: (node) => {
        set({
          nodes: [...get().nodes, node],
          isDirty: true,
        });
      },

      // Update node data
      updateNode: (nodeId, data) => {
        set({
          nodes: get().nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } }
              : node
          ),
          isDirty: true,
        });
      },

      // Remove a node
      removeNode: (nodeId) => {
        set({
          nodes: get().nodes.filter((node) => node.id !== nodeId),
          edges: get().edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
          isDirty: true,
        });
      },

      // Viewport
      setViewport: (viewport) => {
        set({ viewport, isDirty: true });
      },

      // Selection
      setSelectedNode: (nodeId) => {
        set({ selectedNodeId: nodeId });
      },

      // Pipeline ID
      setPipelineId: (id) => {
        set({ pipelineId: id });
      },

      // Pipeline name
      setPipelineName: (name) => {
        set({ pipelineName: name, isDirty: true });
      },

      // Clear everything
      clearPipeline: () => {
        set({
          pipelineId: null,
          nodes: initialNodes,
          edges: [],
          viewport: initialViewport,
          pipelineName: 'Untitled Pipeline',
          isDirty: false,
          selectedNodeId: null,
          isSaving: false,
          lastSavedAt: null,
          // Reset execution state
          executionId: null,
          isRunning: false,
          nodeStatus: {},
          nodeOutputs: {},
          executionStartTime: null,
          executionError: null,
          // Reset debug mode state
          selectedRunId: null,
          runTrace: null,
          currentRun: null,
          runSummary: null,
          isDebugMode: false,
          isLoadingRun: false,
          debugError: null,
        });
      },

      // Load a pipeline
      loadPipeline: (id, nodes, edges, name, viewport) => {
        set({
          pipelineId: id,
          nodes,
          edges,
          viewport: viewport || initialViewport,
          pipelineName: name || 'Untitled Pipeline',
          isDirty: false,
          selectedNodeId: null,
          lastSavedAt: new Date(),
        });
      },

      // Set dirty flag
      setDirty: (isDirty) => {
        set({ isDirty });
      },

      // Set saving state
      setSaving: (isSaving) => {
        set({ isSaving });
      },

      // Mark as saved
      markSaved: () => {
        set({ isDirty: false, isSaving: false, lastSavedAt: new Date() });
      },

      // ============================================
      // EXECUTION ACTIONS
      // ============================================

      // Start a new execution
      startExecution: (executionId: string) => {
        const nodes = get().nodes;
        // Initialize all nodes to pending status
        const initialStatus: Record<string, NodeExecutionStatus> = {};
        nodes.forEach((node) => {
          initialStatus[node.id] = 'pending';
        });

        set({
          executionId,
          isRunning: true,
          nodeStatus: initialStatus,
          nodeOutputs: {},
          executionStartTime: Date.now(),
          executionError: null,
        });

        console.log('[EXECUTION] Started:', executionId);
      },

      // Update status for a specific node
      updateNodeStatus: (
        nodeId: string,
        status: NodeExecutionStatus,
        output?: NodeExecutionOutput
      ) => {
        const currentStatus = get().nodeStatus;
        const currentOutputs = get().nodeOutputs;

        set({
          nodeStatus: {
            ...currentStatus,
            [nodeId]: status,
          },
          nodeOutputs: output
            ? {
                ...currentOutputs,
                [nodeId]: output,
              }
            : currentOutputs,
        });

        console.log(`[EXECUTION] Node ${nodeId} -> ${status}`, output);
      },

      // Stop execution (success or error)
      stopExecution: (error?: string) => {
        const startTime = get().executionStartTime;
        const duration = startTime ? Date.now() - startTime : 0;

        set({
          isRunning: false,
          executionError: error || null,
        });

        console.log(
          `[EXECUTION] Stopped after ${duration}ms`,
          error ? `Error: ${error}` : 'Success'
        );
      },

      // Reset execution state
      resetExecution: () => {
        set({
          executionId: null,
          isRunning: false,
          nodeStatus: {},
          nodeOutputs: {},
          executionStartTime: null,
          executionError: null,
        });

        console.log('[EXECUTION] Reset');
      },

      // ============================================
      // DEBUG MODE ACTIONS (Phase 13: Flight Recorder)
      // ============================================

      /**
       * Load a run for time-travel debugging
       * Fetches run details from the Flight Recorder API and enters debug mode
       */
      loadRun: async (runId: string) => {
        set({
          isLoadingRun: true,
          debugError: null,
        });

        try {
          const response = await fetch(`/api/runs/details/${runId}`);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load run: ${response.status}`);
          }

          const data: RunDetailsResponse = await response.json();

          // Map step statuses to node statuses for visual display
          const debugNodeStatus: Record<string, NodeExecutionStatus> = {};
          data.steps.forEach((step) => {
            // Map flight recorder status to pipeline status
            let nodeStatus: NodeExecutionStatus = 'pending';
            switch (step.status) {
              case 'success':
                nodeStatus = 'success';
                break;
              case 'failure':
                nodeStatus = 'error';
                break;
              case 'skipped':
                nodeStatus = 'skipped';
                break;
              case 'running':
                nodeStatus = 'running';
                break;
              case 'retrying':
                nodeStatus = 'retrying';
                break;
              case 'waiting':
                nodeStatus = 'suspended';
                break;
              default:
                nodeStatus = 'pending';
            }
            debugNodeStatus[step.nodeId] = nodeStatus;
          });

          set({
            selectedRunId: runId,
            runTrace: data.steps,
            currentRun: data.run,
            runSummary: data.summary,
            isDebugMode: true,
            isLoadingRun: false,
            debugError: null,
            // Apply debug node statuses
            nodeStatus: debugNodeStatus,
            // Clear any live execution state
            executionId: null,
            isRunning: false,
            executionError: null,
          });

          console.log('[DEBUG_MODE] Loaded run:', runId, data.summary);
        } catch (error: any) {
          console.error('[DEBUG_MODE] Failed to load run:', error);
          set({
            isLoadingRun: false,
            debugError: error.message || 'Failed to load run',
          });
        }
      },

      /**
       * Exit debug mode and return to editor
       */
      exitDebugMode: () => {
        set({
          selectedRunId: null,
          runTrace: null,
          currentRun: null,
          runSummary: null,
          isDebugMode: false,
          isLoadingRun: false,
          debugError: null,
          // Reset node statuses
          nodeStatus: {},
          nodeOutputs: {},
        });

        console.log('[DEBUG_MODE] Exited');
      },

      /**
       * Get the execution step for a specific node in the current run trace
       */
      getStepForNode: (nodeId: string): ExecutionStep | null => {
        const runTrace = get().runTrace;
        if (!runTrace) return null;
        return runTrace.find((step) => step.nodeId === nodeId) || null;
      },

      // ============================================
      // PHASE 6: LOOP ITERATION ACTIONS
      // ============================================

      /**
       * Set the selected iteration index for loop navigation
       */
      setSelectedIteration: (index: number) => {
        const loopData = get().loopGroupData;
        const maxIndex = loopData ? loopData.totalIterations - 1 : 0;
        const clampedIndex = Math.max(0, Math.min(index, maxIndex));

        set({ selectedIteration: clampedIndex });

        console.log('[LOOP_NAVIGATOR] Selected iteration:', clampedIndex);
      },

      /**
       * Load loop group data for an execution
       */
      loadLoopData: async (executionId: string, loopId?: string) => {
        set({ isLoadingLoopData: true });

        try {
          const url = loopId
            ? `/api/dx/executions/${executionId}/loops?loopId=${loopId}`
            : `/api/dx/executions/${executionId}/loops`;

          const response = await fetch(url);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to load loop data: ${response.status}`);
          }

          const data = await response.json();

          // If multiple loop groups, take the first one (or the specified one)
          const loopGroup = data.groups?.[0] || data;

          set({
            loopGroupData: loopGroup,
            selectedIteration: 0,
            isLoadingLoopData: false,
          });

          console.log('[LOOP_NAVIGATOR] Loaded loop data:', loopGroup.loopName, loopGroup.totalIterations, 'iterations');
        } catch (error: any) {
          console.error('[LOOP_NAVIGATOR] Failed to load loop data:', error);
          set({ isLoadingLoopData: false });
        }
      },

      /**
       * Clear loop data when exiting debug mode or switching runs
       */
      clearLoopData: () => {
        set({
          loopGroupData: null,
          selectedIteration: 0,
          isLoadingLoopData: false,
        });

        console.log('[LOOP_NAVIGATOR] Cleared');
      },

      // ============================================
      // UI ACTIONS - DIALOGS
      // ============================================

      /**
       * Open or close the template dialog
       */
      setTemplateDialogOpen: (open: boolean) => {
        set({ templateDialogOpen: open });
      },

      /**
       * Show or hide the live execution panel
       */
      setShowExecutionPanel: (show: boolean) => {
        set({ showExecutionPanel: show });
      },

      /**
       * Show or hide the approval bar and track the awaiting node
       */
      setShowApprovalBar: (show: boolean, nodeId?: string | null) => {
        set({
          showApprovalBar: show,
          awaitingApprovalNodeId: nodeId ?? null,
        });
      },

      /**
       * Set pipeline paused state
       */
      setIsPaused: (paused: boolean) => {
        set({ isPaused: paused });
      },

      // ============================================
      // AUTO-LAYOUT ACTIONS (Phase 22: Premium Features)
      // ============================================

      /**
       * Auto-arrange nodes using Dagre layout algorithm
       */
      autoLayout: (options?: LayoutOptions) => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const { nodes: layoutedNodes } = layoutNodes(nodes, edges, options);
        set({
          nodes: layoutedNodes,
          isDirty: true,
        });

        console.log('[AUTO-LAYOUT] Applied with options:', options || 'defaults');
      },

      /**
       * Apply horizontal (left-to-right) layout
       */
      autoLayoutHorizontal: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const { nodes: layoutedNodes } = layoutHorizontal(nodes, edges);
        set({
          nodes: layoutedNodes,
          isDirty: true,
        });

        console.log('[AUTO-LAYOUT] Applied horizontal layout');
      },

      /**
       * Apply vertical (top-to-bottom) layout
       */
      autoLayoutVertical: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const { nodes: layoutedNodes } = layoutVertical(nodes, edges);
        set({
          nodes: layoutedNodes,
          isDirty: true,
        });

        console.log('[AUTO-LAYOUT] Applied vertical layout');
      },

      /**
       * Apply compact layout (minimize space)
       */
      autoLayoutCompact: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const { nodes: layoutedNodes } = layoutCompact(nodes, edges);
        set({
          nodes: layoutedNodes,
          isDirty: true,
        });

        console.log('[AUTO-LAYOUT] Applied compact layout');
      },

      /**
       * Apply spread layout (maximize readability)
       */
      autoLayoutSpread: () => {
        const { nodes, edges } = get();
        if (nodes.length === 0) return;

        const { nodes: layoutedNodes } = layoutSpread(nodes, edges);
        set({
          nodes: layoutedNodes,
          isDirty: true,
        });

        console.log('[AUTO-LAYOUT] Applied spread layout');
      },
    }),
    { name: 'pipeline-store' }
  )
);

// ============================================
// SELECTORS
// ============================================

export const selectPipelineId = (state: PipelineState) => state.pipelineId;
export const selectNodes = (state: PipelineState) => state.nodes;
export const selectEdges = (state: PipelineState) => state.edges;
export const selectViewport = (state: PipelineState) => state.viewport;
export const selectPipelineName = (state: PipelineState) => state.pipelineName;
export const selectIsDirty = (state: PipelineState) => state.isDirty;
export const selectSelectedNodeId = (state: PipelineState) => state.selectedNodeId;
export const selectIsSaving = (state: PipelineState) => state.isSaving;
export const selectLastSavedAt = (state: PipelineState) => state.lastSavedAt;

// Get the currently selected node
export const selectSelectedNode = (state: PipelineState): PipelineNode | null => {
  if (!state.selectedNodeId) return null;
  return state.nodes.find((node) => node.id === state.selectedNodeId) || null;
};

// Hook to get selected node with data
export const useSelectedNode = () => {
  return usePipelineStore((state) => selectSelectedNode(state));
};

// ============================================
// EXECUTION SELECTORS
// ============================================

export const selectExecutionId = (state: PipelineState) => state.executionId;
export const selectIsRunning = (state: PipelineState) => state.isRunning;
export const selectNodeStatus = (state: PipelineState) => state.nodeStatus;
export const selectNodeOutputs = (state: PipelineState) => state.nodeOutputs;
export const selectExecutionStartTime = (state: PipelineState) => state.executionStartTime;
export const selectExecutionError = (state: PipelineState) => state.executionError;

// Get status for a specific node
export const selectNodeStatusById = (nodeId: string) => (state: PipelineState) =>
  state.nodeStatus[nodeId] || null;

// Get output for a specific node
export const selectNodeOutputById = (nodeId: string) => (state: PipelineState) =>
  state.nodeOutputs[nodeId] || null;

// Hook to get node status by ID
export const useNodeStatus = (nodeId: string) => {
  return usePipelineStore((state) => state.nodeStatus[nodeId] || null);
};

// Hook to get node output by ID
export const useNodeOutput = (nodeId: string) => {
  return usePipelineStore((state) => state.nodeOutputs[nodeId] || null);
};

// ============================================
// DEBUG MODE SELECTORS (Phase 13: Flight Recorder)
// ============================================

export const selectSelectedRunId = (state: PipelineState) => state.selectedRunId;
export const selectRunTrace = (state: PipelineState) => state.runTrace;
export const selectCurrentRun = (state: PipelineState) => state.currentRun;
export const selectRunSummary = (state: PipelineState) => state.runSummary;
export const selectIsDebugMode = (state: PipelineState) => state.isDebugMode;
export const selectIsLoadingRun = (state: PipelineState) => state.isLoadingRun;
export const selectDebugError = (state: PipelineState) => state.debugError;

// Get step for a specific node in debug mode
export const selectStepForNode = (nodeId: string) => (state: PipelineState) => {
  if (!state.runTrace) return null;
  return state.runTrace.find((step) => step.nodeId === nodeId) || null;
};

// Hook for debug mode state
export const useDebugMode = () => {
  return usePipelineStore(useShallow((state) => ({
    isDebugMode: state.isDebugMode,
    currentRun: state.currentRun,
    runTrace: state.runTrace,
    runSummary: state.runSummary,
    isLoadingRun: state.isLoadingRun,
    debugError: state.debugError,
    loadRun: state.loadRun,
    exitDebugMode: state.exitDebugMode,
    getStepForNode: state.getStepForNode,
  })));
};

// Hook to get step data for a specific node
export const useStepForNode = (nodeId: string) => {
  return usePipelineStore((state) => {
    if (!state.runTrace) return null;
    return state.runTrace.find((step) => step.nodeId === nodeId) || null;
  });
};

// ============================================
// UI STATE SELECTORS
// ============================================

export const selectTemplateDialogOpen = (state: PipelineState) => state.templateDialogOpen;

// Hook for template dialog
export const useTemplateDialog = () => {
  return usePipelineStore(useShallow((state) => ({
    isOpen: state.templateDialogOpen,
    setTemplateDialogOpen: state.setTemplateDialogOpen,
  })));
};

// ============================================
// CONTROL MODE UI SELECTORS
// ============================================

export const selectShowExecutionPanel = (state: PipelineState) => state.showExecutionPanel;
export const selectShowApprovalBar = (state: PipelineState) => state.showApprovalBar;
export const selectAwaitingApprovalNodeId = (state: PipelineState) => state.awaitingApprovalNodeId;
export const selectIsPaused = (state: PipelineState) => state.isPaused;

/**
 * Hook for Control Mode UI state and actions
 */
export const useControlModeUI = () => {
  return usePipelineStore(useShallow((state) => ({
    showExecutionPanel: state.showExecutionPanel,
    showApprovalBar: state.showApprovalBar,
    awaitingApprovalNodeId: state.awaitingApprovalNodeId,
    isPaused: state.isPaused,
    setShowExecutionPanel: state.setShowExecutionPanel,
    setShowApprovalBar: state.setShowApprovalBar,
    setIsPaused: state.setIsPaused,
  })));
};

// ============================================
// CONNECTION VALIDATION SELECTORS (Phase 22)
// ============================================

export const selectLastConnectionError = (state: PipelineState) => state.lastConnectionError;
export const selectWorkflowValidation = (state: PipelineState) => state.workflowValidation;

/**
 * Hook for connection validation state and actions
 */
export const useConnectionValidation = () => {
  return usePipelineStore(useShallow((state) => ({
    lastConnectionError: state.lastConnectionError,
    workflowValidation: state.workflowValidation,
    isValidConnection: state.isValidConnection,
    validateCurrentWorkflow: state.validateCurrentWorkflow,
    clearConnectionError: state.clearConnectionError,
  })));
};

/**
 * Hook to check if workflow is valid (for save/publish buttons)
 */
const EMPTY_VALIDATION_ARRAY: any[] = [];

export const useWorkflowValidity = () => {
  return usePipelineStore(useShallow((state) => {
    // Return cached validation if available
    if (state.workflowValidation) {
      return {
        isValid: state.workflowValidation.isValid,
        errors: state.workflowValidation.errors,
        warnings: state.workflowValidation.warnings,
        needsValidation: false,
      };
    }
    // No validation yet - workflow needs to be validated
    return {
      isValid: true, // Assume valid until checked
      errors: EMPTY_VALIDATION_ARRAY,
      warnings: EMPTY_VALIDATION_ARRAY,
      needsValidation: true,
    };
  }));
};

// ============================================
// AUTO-LAYOUT SELECTORS (Phase 22: Premium Features)
// ============================================

/**
 * Hook for auto-layout actions
 */
export const useAutoLayout = () => {
  return usePipelineStore(useShallow((state) => ({
    autoLayout: state.autoLayout,
    autoLayoutHorizontal: state.autoLayoutHorizontal,
    autoLayoutVertical: state.autoLayoutVertical,
    autoLayoutCompact: state.autoLayoutCompact,
    autoLayoutSpread: state.autoLayoutSpread,
  })));
};

// ============================================
// PHASE 6: LOOP ITERATION SELECTORS
// ============================================

export const selectSelectedIteration = (state: PipelineState) => state.selectedIteration;
export const selectLoopGroupData = (state: PipelineState) => state.loopGroupData;
export const selectIsLoadingLoopData = (state: PipelineState) => state.isLoadingLoopData;

/**
 * Hook for loop iteration navigation
 */
export const useLoopNavigation = () => {
  return usePipelineStore(useShallow((state) => ({
    selectedIteration: state.selectedIteration,
    loopGroupData: state.loopGroupData,
    isLoadingLoopData: state.isLoadingLoopData,
    setSelectedIteration: state.setSelectedIteration,
    loadLoopData: state.loadLoopData,
    clearLoopData: state.clearLoopData,
  })));
};

/**
 * Hook to get current iteration stats
 */
export const useCurrentIterationStats = () => {
  return usePipelineStore((state) => {
    if (!state.loopGroupData) return null;
    return state.loopGroupData.iterations[state.selectedIteration] || null;
  });
};

/**
 * Hook to check if we're viewing a loop execution
 */
export const useIsLoopExecution = () => {
  return usePipelineStore((state) => !!state.loopGroupData);
};

// ============================================
// COCKPIT STATE TYPES (Pipeline Cockpit-Upgrade)
// ============================================

export interface AutopilotConfig {
  enabled: boolean;
  scoreThreshold: number;
  autoApproveAbove: number;
  autoRejectBelow: number;
}

export interface ApprovalRequest {
  id: string;
  executionId: string;
  nodeId: string;
  nodeName: string;
  nodeType?: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  requestedAt: string;
  expiresAt?: string;
  contextData?: {
    leadScore?: number;
    leadName?: string;
    leadEmail?: string;
    leadPhone?: string;
    company?: string;
    source?: string;
    action?: string;
    customFields?: Record<string, unknown>;
  };
}

export interface CockpitExecutionStep {
  id: string;
  nodeId: string;
  nodeName: string;
  nodeType: string;
  status: NodeExecutionStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  output?: unknown;
  error?: string;
  tokensUsed?: number;
  costUsd?: string;
  retryAttempt?: number;
  maxAttempts?: number;
}

// ============================================
// COCKPIT STORE SLICE
// ============================================

interface CockpitState {
  // Autopilot
  autopilotEnabled: boolean;
  autopilotConfig: AutopilotConfig;

  // Dry-Run Mode
  isDryRun: boolean;
  dryRunLogs: CockpitExecutionStep[];

  // Pending Approvals
  pendingApprovals: ApprovalRequest[];
  isLoadingApprovals: boolean;

  // Active Node in Cockpit
  cockpitActiveNodeId: string | null;
}

interface CockpitActions {
  // Autopilot
  setAutopilotConfig: (config: Partial<AutopilotConfig>) => void;
  toggleAutopilot: () => void;

  // Dry-Run
  startDryRun: () => void;
  stopDryRun: () => void;
  addDryRunLog: (step: CockpitExecutionStep) => void;
  clearDryRunLogs: () => void;

  // Pending Approvals
  loadPendingApprovals: (pipelineId: string) => Promise<void>;
  addPendingApproval: (approval: ApprovalRequest) => void;
  removePendingApproval: (approvalId: string) => void;
  clearPendingApprovals: () => void;

  // Active Node
  setCockpitActiveNode: (nodeId: string | null) => void;
}

// Default Autopilot Config
const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  enabled: false,
  scoreThreshold: 50,
  autoApproveAbove: 70,
  autoRejectBelow: 30,
};

// Create separate cockpit store for cleaner separation
import { createStore, useStore } from 'zustand';

const cockpitStore = createStore<CockpitState & CockpitActions>()((set, get) => ({
  // Initial State
  autopilotEnabled: false,
  autopilotConfig: DEFAULT_AUTOPILOT_CONFIG,
  isDryRun: false,
  dryRunLogs: [],
  pendingApprovals: [],
  isLoadingApprovals: false,
  cockpitActiveNodeId: null,

  // Autopilot Actions
  setAutopilotConfig: (config) => {
    set((state) => ({
      autopilotConfig: { ...state.autopilotConfig, ...config },
      autopilotEnabled: config.enabled ?? state.autopilotEnabled,
    }));
  },

  toggleAutopilot: () => {
    set((state) => ({
      autopilotEnabled: !state.autopilotEnabled,
      autopilotConfig: {
        ...state.autopilotConfig,
        enabled: !state.autopilotEnabled,
      },
    }));
  },

  // Dry-Run Actions
  startDryRun: () => {
    set({ isDryRun: true, dryRunLogs: [] });
  },

  stopDryRun: () => {
    set({ isDryRun: false });
  },

  addDryRunLog: (step) => {
    set((state) => ({
      dryRunLogs: [...state.dryRunLogs, step],
    }));
  },

  clearDryRunLogs: () => {
    set({ dryRunLogs: [] });
  },

  // Pending Approvals Actions
  loadPendingApprovals: async (pipelineId) => {
    set({ isLoadingApprovals: true });
    try {
      const response = await fetch(`/api/pipelines/${pipelineId}/approvals?status=pending`);
      if (response.ok) {
        const data = await response.json();
        set({ pendingApprovals: data.approvals || [] });
      }
    } catch (error) {
      console.error('[COCKPIT] Failed to load approvals:', error);
    } finally {
      set({ isLoadingApprovals: false });
    }
  },

  addPendingApproval: (approval) => {
    set((state) => ({
      pendingApprovals: [...state.pendingApprovals, approval],
    }));
  },

  removePendingApproval: (approvalId) => {
    set((state) => ({
      pendingApprovals: state.pendingApprovals.filter((a) => a.id !== approvalId),
    }));
  },

  clearPendingApprovals: () => {
    set({ pendingApprovals: [] });
  },

  // Active Node Actions
  setCockpitActiveNode: (nodeId) => {
    set({ cockpitActiveNodeId: nodeId });
  },
}));

// ============================================
// COCKPIT HOOKS
// ============================================

/**
 * Hook for Cockpit state and actions
 */
export const useCockpitStore = <T>(selector: (state: CockpitState & CockpitActions) => T): T => {
  return useStore(cockpitStore, selector);
};

/**
 * Hook for Autopilot configuration
 */
export const useAutopilot = () => {
  return useCockpitStore((state) => ({
    enabled: state.autopilotEnabled,
    config: state.autopilotConfig,
    setConfig: state.setAutopilotConfig,
    toggle: state.toggleAutopilot,
  }));
};

/**
 * Hook for Dry-Run mode
 */
export const useDryRun = () => {
  return useCockpitStore((state) => ({
    isDryRun: state.isDryRun,
    logs: state.dryRunLogs,
    start: state.startDryRun,
    stop: state.stopDryRun,
    addLog: state.addDryRunLog,
    clearLogs: state.clearDryRunLogs,
  }));
};

/**
 * Hook for Pending Approvals
 */
export const usePendingApprovals = () => {
  return useCockpitStore((state) => ({
    approvals: state.pendingApprovals,
    isLoading: state.isLoadingApprovals,
    load: state.loadPendingApprovals,
    add: state.addPendingApproval,
    remove: state.removePendingApproval,
    clear: state.clearPendingApprovals,
  }));
};

/**
 * Hook for Cockpit Active Node
 */
export const useCockpitActiveNode = () => {
  return useCockpitStore((state) => ({
    activeNodeId: state.cockpitActiveNodeId,
    setActiveNode: state.setCockpitActiveNode,
  }));
};
