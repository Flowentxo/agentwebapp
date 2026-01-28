/**
 * PHASE 71-75: Agent System Integration
 * Central exports and agent registry
 */

// ============================================
// AGENT EXPORTS
// ============================================

// Dexter - Financial Intelligence
export { DexterAgent, dexterAgent } from './dexter/DexterAgent';
export { DexterCapabilities } from './dexter';
export type {
  RevenueAnalysis,
  ForecastOutput,
  ProfitAndLossReport,
  BalanceSheetReport,
  CashFlowStatement,
  CustomerProfitabilityReport,
  PipelineAnalysis,
  DealIntelligence,
} from './dexter';

// Cassie - Customer Support Intelligence
export { CassieAgent } from './cassie/CassieAgent';
export { CassieCapabilities } from './cassie';
export type {
  Ticket,
  TicketQueue,
  TicketStats,
  SentimentAnalysisResult,
  KnowledgeArticle,
  GeneratedResponse,
} from './cassie';

// Aura - Workflow Orchestration
export { AuraAgent, auraAgent } from './aura/AuraAgent';
export { AuraCapabilities } from './aura';
export type {
  WorkflowDefinition,
  WorkflowExecution,
  AutomationRule,
  ScheduledTask,
  WorkflowGraph,
  ExecutionState,
} from './aura';

// Base Agent
export { BaseAgent, agentRegistry } from './base/BaseAgent';
export type {
  AgentContext,
  AgentResponse,
  ToolResult,
  AgentMessage,
  AgentCapability,
} from './shared/types';

// ============================================
// UNIFIED AGENT REGISTRY
// ============================================

import { BaseAgent, agentRegistry } from './base/BaseAgent';
import { DexterAgent } from './dexter/DexterAgent';
import { CassieAgent } from './cassie/CassieAgent';
import { AuraAgent } from './aura/AuraAgent';

/**
 * Initialize and register all agents
 */
export function initializeAgents(): void {
  // Create instances and register
  const dexter = new DexterAgent();
  const cassie = new CassieAgent();
  const aura = new AuraAgent();

  // Register with global registry
  agentRegistry.set(dexter.id, dexter);
  agentRegistry.set(cassie.id, cassie);
  agentRegistry.set(aura.id, aura);

  console.log('[AGENT_SYSTEM] Initialized agents:', Array.from(agentRegistry.keys()));
}

/**
 * Get agent by ID
 */
export function getAgent(agentId: string): BaseAgent | undefined {
  return agentRegistry.get(agentId);
}

/**
 * List all registered agents
 */
export function listAgents(): Array<{
  id: string;
  name: string;
  description: string;
  category: string;
  capabilities: string[];
  toolCount: number;
}> {
  const agents: Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    capabilities: string[];
    toolCount: number;
  }> = [];

  for (const agent of agentRegistry.values()) {
    agents.push({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      capabilities: agent.capabilities,
      toolCount: agent.getAvailableTools().length,
    });
  }

  return agents;
}

/**
 * Get agent metadata
 */
export function getAgentMetadata(agentId: string): {
  id: string;
  name: string;
  description: string;
  version: string;
  category: string;
  capabilities: string[];
  tools: Array<{
    name: string;
    displayName: string;
    description: string;
    category: string;
  }>;
} | null {
  const agent = agentRegistry.get(agentId);
  if (!agent) return null;

  return {
    id: agent.id,
    name: agent.name,
    description: agent.description,
    version: agent.version,
    category: agent.category,
    capabilities: agent.capabilities,
    tools: agent.getAvailableTools().map((t) => ({
      name: t.name,
      displayName: t.displayName,
      description: t.description,
      category: t.category,
    })),
  };
}

// ============================================
// AGENT CAPABILITIES AGGREGATION
// ============================================

import { DexterCapabilities } from './dexter';
import { CassieCapabilities } from './cassie';
import { AuraCapabilities } from './aura';

/**
 * Unified agent capabilities interface
 */
export const AgentCapabilities = {
  // Financial Intelligence (Dexter)
  finance: DexterCapabilities,

  // Customer Support (Cassie)
  support: CassieCapabilities,

  // Workflow Automation (Aura)
  automation: AuraCapabilities,

  // Cross-agent operations
  async executeMultiAgentTask(
    task: string,
    agents: string[],
    context: { workspaceId: string; userId: string }
  ) {
    const results: Record<string, unknown> = {};

    for (const agentId of agents) {
      const agent = agentRegistry.get(agentId);
      if (agent) {
        const response = await agent.handleChat(task, {
          userId: context.userId,
          workspaceId: context.workspaceId,
          sessionId: crypto.randomUUID(),
          permissions: ['read', 'execute'],
          integrations: {},
        });
        results[agentId] = response;
      }
    }

    return results;
  },

  async getUnifiedDashboard(workspaceId: string) {
    const [financeDashboard, supportDashboard, automationDashboard] = await Promise.all([
      Promise.resolve({
        revenue: { current: 125000, growth: 0.12 },
        deals: { open: 45, won: 23 },
        forecast: { nextMonth: 140000 },
      }),
      CassieCapabilities.getSupportDashboard(workspaceId),
      AuraCapabilities.getAutomationDashboard(workspaceId),
    ]);

    return {
      finance: financeDashboard,
      support: supportDashboard,
      automation: automationDashboard,
      timestamp: new Date().toISOString(),
    };
  },
};

// ============================================
// AGENT SYSTEM INITIALIZATION
// ============================================

// Auto-initialize on import
let initialized = false;

export function ensureInitialized(): void {
  if (!initialized) {
    initializeAgents();
    initialized = true;
  }
}

// Initialize immediately
ensureInitialized();

// Default export
export default AgentCapabilities;
