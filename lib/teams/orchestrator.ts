/**
 * TEAM ORCHESTRATOR
 * Coordinates multiple agents to work together on complex tasks
 *
 * Philosophy: "The conductor doesn't make a sound, but makes all the sound possible"
 * - Smart task routing
 * - Context sharing
 * - Error handling
 * - Performance optimization
 */

import { getAgentById } from '@/lib/agents/personas';
import { TraceLogger } from '@/lib/tracing/trace-logger';
import { generateAgentResponse, ChatMessage } from '@/lib/ai/openai-service';

export interface TeamMember {
  agentId: string;
  role?: string; // Optional role in the team
  order: number; // Execution order
}

export interface TeamConfig {
  teamId: string;
  name: string;
  members: TeamMember[];
  orchestratorType: 'sequential' | 'parallel' | 'conditional' | 'hierarchical';
  settings?: {
    maxRounds?: number;
    timeout?: number;
    fallbackBehavior?: 'error' | 'partial' | 'retry';
  };
}

export interface ExecutionContext {
  userInput: string;
  currentStep: number;
  sharedMemory: Map<string, any>;
  history: ExecutionStep[];
}

export interface ExecutionStep {
  stepNumber: number;
  agentId: string;
  input: string;
  output: string;
  latencyMs: number;
  tokens?: number;
  decision: {
    action: 'complete' | 'handoff' | 'error';
    nextAgentId?: string;
    reason?: string;
  };
}

export interface ExecutionResult {
  success: boolean;
  finalOutput: string;
  steps: ExecutionStep[];
  totalLatencyMs: number;
  totalTokens: number;
  error?: string;
}

/**
 * SEQUENTIAL ORCHESTRATOR
 * Agents work one after another in order
 *
 * Example: Research → Analysis → Report
 */
export class SequentialOrchestrator {
  private team: TeamConfig;
  private trace?: TraceLogger;

  constructor(team: TeamConfig, trace?: TraceLogger) {
    this.team = team;
    this.trace = trace;
  }

  async execute(userInput: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const context: ExecutionContext = {
      userInput,
      currentStep: 0,
      sharedMemory: new Map(),
      history: [],
    };

    try {
      // Sort members by order
      const sortedMembers = [...this.team.members].sort((a, b) => a.order - b.order);

      // Execute each agent in sequence
      for (const member of sortedMembers) {
        const step = await this.executeAgent(member, context);
        context.history.push(step);
        context.currentStep++;

        // Check if we should stop
        if (step.decision.action === 'complete') {
          break;
        }

        if (step.decision.action === 'error') {
          throw new Error(step.decision.reason || 'Agent execution failed');
        }
      }

      const totalLatencyMs = Date.now() - startTime;
      const totalTokens = context.history.reduce((sum, step) => sum + (step.tokens || 0), 0);
      const finalOutput = context.history[context.history.length - 1]?.output || '';

      return {
        success: true,
        finalOutput,
        steps: context.history,
        totalLatencyMs,
        totalTokens,
      };
    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;
      const totalTokens = context.history.reduce((sum, step) => sum + (step.tokens || 0), 0);

      return {
        success: false,
        finalOutput: '',
        steps: context.history,
        totalLatencyMs,
        totalTokens,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeAgent(
    member: TeamMember,
    context: ExecutionContext
  ): Promise<ExecutionStep> {
    const startTime = Date.now();

    try {
      const agent = getAgentById(member.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${member.agentId}`);
      }

      // Build input with context
      const input = this.buildAgentInput(member, context);

      // Log to trace
      this.trace?.logSystemEvent(`Agent ${agent.name} starting task`, {
        agentId: member.agentId,
        step: context.currentStep,
      });

      // Call agent with real AI (returns response with tokens)
      const { output, tokens } = await this.callAgentWithMetrics(agent, input, context);

      // Determine next action
      const decision = this.determineNextAction(member, output, context);

      // Update shared memory if needed
      this.updateSharedMemory(member, output, context);

      const latencyMs = Date.now() - startTime;

      // Log to trace with real metrics
      this.trace?.logSystemEvent(`Agent ${agent.name} completed task`, {
        agentId: member.agentId,
        step: context.currentStep,
        latencyMs,
        tokens,
        decision,
      });

      return {
        stepNumber: context.currentStep,
        agentId: member.agentId,
        input,
        output,
        latencyMs,
        tokens,
        decision,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      this.trace?.logError(error as Error, {
        agentId: member.agentId,
        step: context.currentStep,
      });

      return {
        stepNumber: context.currentStep,
        agentId: member.agentId,
        input: '',
        output: '',
        latencyMs,
        decision: {
          action: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  private buildAgentInput(member: TeamMember, context: ExecutionContext): string {
    // First agent gets user input
    if (context.currentStep === 0) {
      return context.userInput;
    }

    // Subsequent agents get previous output + context
    const previousOutput = context.history[context.history.length - 1]?.output || '';

    // Include shared memory context
    const sharedContext = Array.from(context.sharedMemory.entries())
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n');

    return `
Task: ${context.userInput}

Previous Agent's Output:
${previousOutput}

Shared Team Context:
${sharedContext}

Your task: Continue working on this task based on the context above.
`.trim();
  }

  private async callAgentWithMetrics(
    agent: any,
    input: string,
    context: ExecutionContext
  ): Promise<{ output: string; tokens: number }> {
    try {
      // Build conversation history for context
      const conversationHistory: ChatMessage[] = [];

      // Add previous agent outputs as context (last 3 steps)
      const recentSteps = context.history.slice(-3);
      for (const step of recentSteps) {
        conversationHistory.push({
          role: 'user',
          content: `Previous agent input: ${step.input}`
        });
        conversationHistory.push({
          role: 'assistant',
          content: step.output
        });
      }

      // Call OpenAI with agent persona and context
      const response = await generateAgentResponse(
        agent,
        input,
        conversationHistory
      );

      return {
        output: response.content,
        tokens: response.tokensUsed
      };
    } catch (error) {
      console.error(`[ORCHESTRATOR] Error calling agent ${agent.id}:`, error);
      throw new Error(`Agent ${agent.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /* eslint-disable @typescript-eslint/no-unused-vars */
  private determineNextAction(
    member: TeamMember,
    output: string,
    context: ExecutionContext
  ): ExecutionStep['decision'] {
    /* eslint-enable @typescript-eslint/no-unused-vars */
    // Check if this is the last agent
    const isLastAgent = member.order === this.team.members.length - 1;

    if (isLastAgent) {
      return {
        action: 'complete',
        reason: 'Last agent in sequence',
      };
    }

    // Find next agent
    const nextMember = this.team.members.find((m) => m.order === member.order + 1);

    if (!nextMember) {
      return {
        action: 'complete',
        reason: 'No next agent found',
      };
    }

    return {
      action: 'handoff',
      nextAgentId: nextMember.agentId,
      reason: 'Passing to next agent',
    };
  }

  private updateSharedMemory(
    member: TeamMember,
    output: string,
    context: ExecutionContext
  ): void {
    // Extract key information and store in shared memory
    // This is a simple implementation - in reality, we'd use AI to extract relevant info

    context.sharedMemory.set(`${member.agentId}_output`, output);
    context.sharedMemory.set(`${member.agentId}_timestamp`, Date.now());
  }
}

/**
 * PARALLEL ORCHESTRATOR
 * Multiple agents work simultaneously
 *
 * Example: Research team all investigating different angles at once
 */
export class ParallelOrchestrator {
  private team: TeamConfig;
  private trace?: TraceLogger;

  constructor(team: TeamConfig, trace?: TraceLogger) {
    this.team = team;
    this.trace = trace;
  }

  async execute(userInput: string): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Execute all agents in parallel
      const stepPromises = this.team.members.map((member, index) =>
        this.executeAgent(member, userInput, index)
      );

      const steps = await Promise.all(stepPromises);

      // Combine outputs
      const finalOutput = this.combineOutputs(steps);

      const totalLatencyMs = Date.now() - startTime;
      const totalTokens = steps.reduce((sum, step) => sum + (step.tokens || 0), 0);

      return {
        success: true,
        finalOutput,
        steps,
        totalLatencyMs,
        totalTokens,
      };
    } catch (error) {
      const totalLatencyMs = Date.now() - startTime;

      return {
        success: false,
        finalOutput: '',
        steps: [],
        totalLatencyMs,
        totalTokens: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async executeAgent(
    member: TeamMember,
    userInput: string,
    stepNumber: number
  ): Promise<ExecutionStep> {
    const startTime = Date.now();

    try {
      const agent = getAgentById(member.agentId);
      if (!agent) {
        throw new Error(`Agent not found: ${member.agentId}`);
      }

      this.trace?.logSystemEvent(`Agent ${agent.name} starting parallel task`, {
        agentId: member.agentId,
        step: stepNumber,
      });

      // Call real OpenAI API for this agent
      const response = await generateAgentResponse(agent, userInput, []);

      const latencyMs = Date.now() - startTime;

      this.trace?.logSystemEvent(`Agent ${agent.name} completed parallel task`, {
        agentId: member.agentId,
        step: stepNumber,
        latencyMs,
        tokens: response.tokensUsed,
      });

      return {
        stepNumber,
        agentId: member.agentId,
        input: userInput,
        output: response.content,
        latencyMs,
        tokens: response.tokensUsed,
        decision: {
          action: 'complete',
          reason: 'Parallel execution complete',
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      this.trace?.logError(error as Error, {
        agentId: member.agentId,
        step: stepNumber,
      });

      return {
        stepNumber,
        agentId: member.agentId,
        input: userInput,
        output: '',
        latencyMs,
        decision: {
          action: 'error',
          reason: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }


  private combineOutputs(steps: ExecutionStep[]): string {
    return steps
      .map((step) => {
        const agent = getAgentById(step.agentId);
        return `**${agent?.name || 'Agent'}:**\n${step.output}`;
      })
      .join('\n\n---\n\n');
  }
}

/**
 * ORCHESTRATOR FACTORY
 * Creates the right orchestrator for a team
 */
export class OrchestratorFactory {
  static create(team: TeamConfig, trace?: TraceLogger) {
    switch (team.orchestratorType) {
      case 'sequential':
        return new SequentialOrchestrator(team, trace);
      case 'parallel':
        return new ParallelOrchestrator(team, trace);
      case 'conditional':
        // TODO: Implement conditional orchestrator
        return new SequentialOrchestrator(team, trace);
      case 'hierarchical':
        // TODO: Implement hierarchical orchestrator
        return new SequentialOrchestrator(team, trace);
      default:
        return new SequentialOrchestrator(team, trace);
    }
  }
}
