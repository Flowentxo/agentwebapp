// ============================================================================
// LEVEL 11: AUTOMATION PIPELINES SLICE
// ============================================================================

import type { StateCreator } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export type PipelineTriggerType = 'manual' | 'schedule' | 'webhook';
export type PipelineStatus = 'idle' | 'running' | 'completed' | 'failed' | 'paused';
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface PipelineStep {
  id: string;
  agentId: string;
  agentName: string;
  agentColor: string;
  instruction: string;
  order: number;
  status: StepStatus;
  result?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  tokensUsed?: number;
}

export interface PipelineRun {
  id: string;
  pipelineId: string;
  status: PipelineStatus;
  startedAt: Date;
  completedAt?: Date;
  stepResults: {
    stepId: string;
    status: StepStatus;
    result?: string;
    error?: string;
    tokensUsed?: number;
  }[];
  totalTokensUsed: number;
  totalCost: number;
}

export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  triggerType: PipelineTriggerType;
  steps: PipelineStep[];
  isActive: boolean;
  status: PipelineStatus;
  createdAt: Date;
  updatedAt: Date;
  lastRunAt?: Date;
  runCount: number;
  runs: PipelineRun[];
}

export interface PipelineSlice {
  // State
  pipelines: Pipeline[];
  currentRunningPipelineId: string | null;
  currentStepIndex: number;
  pipelineStreamingContent: string | null;

  // Actions
  createPipeline: (data: CreatePipelineData) => string;
  updatePipeline: (id: string, updates: Partial<Pipeline>) => void;
  deletePipeline: (id: string) => void;
  togglePipelineActive: (id: string) => void;
  addStepToPipeline: (pipelineId: string, step: Omit<PipelineStep, 'id' | 'order' | 'status'>) => void;
  removeStepFromPipeline: (pipelineId: string, stepId: string) => void;
  updateStep: (pipelineId: string, stepId: string, updates: Partial<PipelineStep>) => void;
  reorderSteps: (pipelineId: string, stepIds: string[]) => void;
  runPipeline: (id: string) => Promise<void>;
  stopPipeline: (id: string) => void;
  getPipelineById: (id: string) => Pipeline | undefined;
  getActivePipelines: () => Pipeline[];
}

export interface CreatePipelineData {
  name: string;
  description?: string;
  triggerType?: PipelineTriggerType;
  steps?: Omit<PipelineStep, 'id' | 'order' | 'status'>[];
}

// ============================================================================
// SLICE CREATOR
// ============================================================================

export const createPipelineSlice: StateCreator<
  PipelineSlice & {
    // External dependencies from main store
    agents: { id: string; name: string; color: string; config: any }[];
    openaiApiKey: string | null;
    hasApiKey: () => boolean;
    addToast: (toast: { message: string; type: 'success' | 'error' | 'info' | 'warning' }) => void;
    addLog: (log: any) => void;
  },
  [],
  [],
  PipelineSlice
> = (set, get) => ({
  // Initial State
  pipelines: [],
  currentRunningPipelineId: null,
  currentStepIndex: 0,
  pipelineStreamingContent: null,

  // Actions
  createPipeline: (data) => {
    const id = `pipeline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const steps: PipelineStep[] = (data.steps || []).map((step, index) => ({
      ...step,
      id: `step-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
      order: index,
      status: 'pending' as StepStatus,
    }));

    const newPipeline: Pipeline = {
      id,
      name: data.name,
      description: data.description,
      triggerType: data.triggerType || 'manual',
      steps,
      isActive: true,
      status: 'idle',
      createdAt: new Date(),
      updatedAt: new Date(),
      runCount: 0,
      runs: [],
    };

    set(
      (state) => ({
        pipelines: [...state.pipelines, newPipeline],
      }),
      false,
      'pipelines/create'
    );

    get().addToast({
      message: `Pipeline "${data.name}" created`,
      type: 'success',
    });

    return id;
  },

  updatePipeline: (id, updates) => {
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === id
            ? { ...p, ...updates, updatedAt: new Date() }
            : p
        ),
      }),
      false,
      'pipelines/update'
    );
  },

  deletePipeline: (id) => {
    const pipeline = get().pipelines.find((p) => p.id === id);

    set(
      (state) => ({
        pipelines: state.pipelines.filter((p) => p.id !== id),
      }),
      false,
      'pipelines/delete'
    );

    if (pipeline) {
      get().addToast({
        message: `Pipeline "${pipeline.name}" deleted`,
        type: 'info',
      });
    }
  },

  togglePipelineActive: (id) => {
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === id
            ? { ...p, isActive: !p.isActive, updatedAt: new Date() }
            : p
        ),
      }),
      false,
      'pipelines/toggleActive'
    );
  },

  addStepToPipeline: (pipelineId, step) => {
    const pipeline = get().pipelines.find((p) => p.id === pipelineId);
    if (!pipeline) return;

    const newStep: PipelineStep = {
      ...step,
      id: `step-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      order: pipeline.steps.length,
      status: 'pending',
    };

    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === pipelineId
            ? { ...p, steps: [...p.steps, newStep], updatedAt: new Date() }
            : p
        ),
      }),
      false,
      'pipelines/addStep'
    );
  },

  removeStepFromPipeline: (pipelineId, stepId) => {
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === pipelineId
            ? {
                ...p,
                steps: p.steps
                  .filter((s) => s.id !== stepId)
                  .map((s, index) => ({ ...s, order: index })),
                updatedAt: new Date(),
              }
            : p
        ),
      }),
      false,
      'pipelines/removeStep'
    );
  },

  updateStep: (pipelineId, stepId, updates) => {
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === pipelineId
            ? {
                ...p,
                steps: p.steps.map((s) =>
                  s.id === stepId ? { ...s, ...updates } : s
                ),
                updatedAt: new Date(),
              }
            : p
        ),
      }),
      false,
      'pipelines/updateStep'
    );
  },

  reorderSteps: (pipelineId, stepIds) => {
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) => {
          if (p.id !== pipelineId) return p;

          const reorderedSteps = stepIds
            .map((id, index) => {
              const step = p.steps.find((s) => s.id === id);
              return step ? { ...step, order: index } : null;
            })
            .filter((s): s is PipelineStep => s !== null);

          return { ...p, steps: reorderedSteps, updatedAt: new Date() };
        }),
      }),
      false,
      'pipelines/reorderSteps'
    );
  },

  runPipeline: async (id) => {
    const store = get();
    const pipeline = store.pipelines.find((p) => p.id === id);

    if (!pipeline) {
      store.addToast({ message: 'Pipeline not found', type: 'error' });
      return;
    }

    if (pipeline.steps.length === 0) {
      store.addToast({ message: 'Pipeline has no steps', type: 'warning' });
      return;
    }

    if (!pipeline.isActive) {
      store.addToast({ message: 'Pipeline is inactive', type: 'warning' });
      return;
    }

    // Create a new run
    const runId = `run-${Date.now()}`;
    const run: PipelineRun = {
      id: runId,
      pipelineId: id,
      status: 'running',
      startedAt: new Date(),
      stepResults: [],
      totalTokensUsed: 0,
      totalCost: 0,
    };

    // Update pipeline status
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'running' as PipelineStatus,
                runs: [run, ...p.runs].slice(0, 10), // Keep last 10 runs
              }
            : p
        ),
        currentRunningPipelineId: id,
        currentStepIndex: 0,
      }),
      false,
      'pipelines/startRun'
    );

    store.addLog({
      type: 'info',
      status: 'running',
      message: `Pipeline "${pipeline.name}" started`,
      agent: 'System',
      agentColor: '#8B5CF6',
    });

    let previousResult = '';
    let totalTokens = 0;
    const stepResults: PipelineRun['stepResults'] = [];

    // Execute each step sequentially
    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];

      // Update current step index
      set({ currentStepIndex: i }, false, 'pipelines/updateStepIndex');

      // Mark step as running
      set(
        (state) => ({
          pipelines: state.pipelines.map((p) =>
            p.id === id
              ? {
                  ...p,
                  steps: p.steps.map((s) =>
                    s.id === step.id
                      ? { ...s, status: 'running' as StepStatus, startedAt: new Date() }
                      : s
                  ),
                }
              : p
          ),
        }),
        false,
        'pipelines/stepRunning'
      );

      try {
        // Build the instruction with context from previous step
        const contextualInstruction = previousResult
          ? `Context from previous step:\n${previousResult}\n\nNew instruction: ${step.instruction}`
          : step.instruction;

        // Execute the step
        const result = await executeAgentStep(
          step,
          contextualInstruction,
          store.openaiApiKey,
          store.hasApiKey(),
          (content) => set({ pipelineStreamingContent: content }, false, 'pipelines/streaming')
        );

        // Store result for next step
        previousResult = result.content;
        totalTokens += result.tokensUsed;

        // Mark step as completed
        set(
          (state) => ({
            pipelines: state.pipelines.map((p) =>
              p.id === id
                ? {
                    ...p,
                    steps: p.steps.map((s) =>
                      s.id === step.id
                        ? {
                            ...s,
                            status: 'completed' as StepStatus,
                            result: result.content,
                            tokensUsed: result.tokensUsed,
                            completedAt: new Date(),
                          }
                        : s
                    ),
                  }
                : p
            ),
            pipelineStreamingContent: null,
          }),
          false,
          'pipelines/stepCompleted'
        );

        stepResults.push({
          stepId: step.id,
          status: 'completed',
          result: result.content,
          tokensUsed: result.tokensUsed,
        });

        store.addLog({
          type: 'success',
          status: 'completed',
          message: `Step ${i + 1}: ${step.agentName} completed`,
          agent: step.agentName,
          agentColor: step.agentColor,
          tokensUsed: result.tokensUsed,
        });

      } catch (error: any) {
        // Mark step as failed
        set(
          (state) => ({
            pipelines: state.pipelines.map((p) =>
              p.id === id
                ? {
                    ...p,
                    status: 'failed' as PipelineStatus,
                    steps: p.steps.map((s) =>
                      s.id === step.id
                        ? {
                            ...s,
                            status: 'failed' as StepStatus,
                            error: error.message,
                            completedAt: new Date(),
                          }
                        : s.order > step.order
                        ? { ...s, status: 'skipped' as StepStatus }
                        : s
                    ),
                  }
                : p
            ),
            currentRunningPipelineId: null,
            pipelineStreamingContent: null,
          }),
          false,
          'pipelines/stepFailed'
        );

        stepResults.push({
          stepId: step.id,
          status: 'failed',
          error: error.message,
        });

        store.addLog({
          type: 'error',
          status: 'failed',
          message: `Pipeline "${pipeline.name}" failed at step ${i + 1}`,
          agent: step.agentName,
          agentColor: step.agentColor,
        });

        store.addToast({
          message: `Pipeline failed: ${error.message}`,
          type: 'error',
        });

        // Update run with failure
        set(
          (state) => ({
            pipelines: state.pipelines.map((p) =>
              p.id === id
                ? {
                    ...p,
                    runs: p.runs.map((r) =>
                      r.id === runId
                        ? {
                            ...r,
                            status: 'failed' as PipelineStatus,
                            completedAt: new Date(),
                            stepResults,
                            totalTokensUsed: totalTokens,
                            totalCost: totalTokens * 0.00002,
                          }
                        : r
                    ),
                  }
                : p
            ),
          }),
          false,
          'pipelines/runFailed'
        );

        return;
      }
    }

    // All steps completed successfully
    const totalCost = totalTokens * 0.00002;

    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'completed' as PipelineStatus,
                lastRunAt: new Date(),
                runCount: p.runCount + 1,
                runs: p.runs.map((r) =>
                  r.id === runId
                    ? {
                        ...r,
                        status: 'completed' as PipelineStatus,
                        completedAt: new Date(),
                        stepResults,
                        totalTokensUsed: totalTokens,
                        totalCost,
                      }
                    : r
                ),
              }
            : p
        ),
        currentRunningPipelineId: null,
        currentStepIndex: 0,
      }),
      false,
      'pipelines/runCompleted'
    );

    store.addLog({
      type: 'success',
      status: 'completed',
      message: `Pipeline "${pipeline.name}" completed (${pipeline.steps.length} steps)`,
      agent: 'System',
      agentColor: '#8B5CF6',
      tokensUsed: totalTokens,
      cost: totalCost,
    });

    store.addToast({
      message: `Pipeline "${pipeline.name}" completed successfully`,
      type: 'success',
    });
  },

  stopPipeline: (id) => {
    set(
      (state) => ({
        pipelines: state.pipelines.map((p) =>
          p.id === id
            ? {
                ...p,
                status: 'paused' as PipelineStatus,
                steps: p.steps.map((s) =>
                  s.status === 'running'
                    ? { ...s, status: 'failed' as StepStatus, error: 'Stopped by user' }
                    : s.status === 'pending'
                    ? { ...s, status: 'skipped' as StepStatus }
                    : s
                ),
              }
            : p
        ),
        currentRunningPipelineId: null,
        pipelineStreamingContent: null,
      }),
      false,
      'pipelines/stop'
    );

    get().addToast({
      message: 'Pipeline stopped',
      type: 'warning',
    });
  },

  getPipelineById: (id) => {
    return get().pipelines.find((p) => p.id === id);
  },

  getActivePipelines: () => {
    return get().pipelines.filter((p) => p.isActive);
  },
});

// ============================================================================
// HELPER: Execute Agent Step
// ============================================================================

async function executeAgentStep(
  step: PipelineStep,
  instruction: string,
  apiKey: string | null,
  hasRealAI: boolean,
  onStream: (content: string) => void
): Promise<{ content: string; tokensUsed: number }> {
  if (hasRealAI && apiKey) {
    // Real AI Mode
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-openai-api-key': apiKey,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: instruction }],
        systemPrompt: `You are ${step.agentName}, executing a step in an automation pipeline. Be concise and action-oriented.`,
        agentName: step.agentName,
        agentRole: 'Pipeline Agent',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to execute step');
    }

    // Stream the response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let content = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('0:')) {
            try {
              const textChunk = JSON.parse(line.slice(2));
              content += textChunk;
              onStream(content);
            } catch {
              const textPart = line.slice(2).replace(/^"|"$/g, '');
              content += textPart;
              onStream(content);
            }
          }
        }
      }
    }

    const tokensUsed = Math.ceil((instruction.length + content.length) / 4);
    return { content, tokensUsed };

  } else {
    // Simulation Mode
    await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

    const simulatedContent = `## ${step.agentName} Response\n\n` +
      `Processed instruction: "${instruction.slice(0, 100)}${instruction.length > 100 ? '...' : ''}"\n\n` +
      `**Simulated Result:**\n` +
      `This is a simulated response from ${step.agentName}. ` +
      `In real mode, the AI would analyze the instruction and provide actionable output.\n\n` +
      `*Generated at ${new Date().toISOString()}*`;

    onStream(simulatedContent);

    return {
      content: simulatedContent,
      tokensUsed: Math.floor(500 + Math.random() * 500),
    };
  }
}

// ============================================================================
// SELECTORS
// ============================================================================

export const selectPipelines = (state: { pipelines: Pipeline[] }) => state.pipelines;
export const selectActivePipelines = (state: { pipelines: Pipeline[] }) =>
  state.pipelines.filter((p) => p.isActive);
export const selectRunningPipeline = (state: { pipelines: Pipeline[]; currentRunningPipelineId: string | null }) =>
  state.currentRunningPipelineId ? state.pipelines.find((p) => p.id === state.currentRunningPipelineId) : null;
