/**
 * SINTRA Platform - Agent Connector
 * Handles integration with external agents via standardized API
 */

import { getDb } from '../db/connection';
import { externalAgents, type ExternalAgent, type NewExternalAgent } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';

export interface AgentResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  metadata?: {
    model?: string;
    tokens?: number;
    latencyMs?: number;
  };
}

export interface AgentCapability {
  name: string;
  description: string;
  parameters?: Record<string, any>;
}

export interface RegisterAgentParams {
  id: string;
  name: string;
  description?: string;
  endpoint: string;
  apiKey: string;
  capabilities?: string[];
  version?: string;
  iconUrl?: string;
  config?: {
    timeout?: number;
    retries?: number;
    rateLimit?: number;
    webhookUrl?: string;
  };
}

/**
 * Agent Connector - Main class for external agent integration
 */
export class AgentConnector {
  private static instance: AgentConnector;
  private db = getDb();

  private constructor() {}

  static getInstance(): AgentConnector {
    if (!AgentConnector.instance) {
      AgentConnector.instance = new AgentConnector();
    }
    return AgentConnector.instance;
  }

  /**
   * Register a new external agent
   */
  async registerAgent(
    params: RegisterAgentParams,
    userId: string
  ): Promise<ExternalAgent> {
    // Hash the API key for secure storage
    const apiKeyHash = crypto
      .createHash('sha256')
      .update(params.apiKey)
      .digest('hex');

    const newAgent: NewExternalAgent = {
      id: params.id,
      name: params.name,
      description: params.description || null,
      endpoint: params.endpoint,
      apiKeyHash,
      capabilities: params.capabilities || [],
      status: 'inactive',
      version: params.version || null,
      iconUrl: params.iconUrl || null,
      createdBy: userId,
      config: params.config || {},
    };

    const [agent] = await this.db
      .insert(externalAgents)
      .values(newAgent)
      .returning();

    // Perform initial health check
    await this.healthCheck(agent.id);

    return agent;
  }

  /**
   * Update existing agent
   */
  async updateAgent(
    agentId: string,
    updates: Partial<RegisterAgentParams>
  ): Promise<ExternalAgent | null> {
    const updateData: Partial<NewExternalAgent> = {
      name: updates.name,
      description: updates.description || null,
      endpoint: updates.endpoint,
      capabilities: updates.capabilities,
      version: updates.version || null,
      iconUrl: updates.iconUrl || null,
      config: updates.config,
      updatedAt: new Date(),
    };

    // Hash new API key if provided
    if (updates.apiKey) {
      updateData.apiKeyHash = crypto
        .createHash('sha256')
        .update(updates.apiKey)
        .digest('hex');
    }

    const [agent] = await this.db
      .update(externalAgents)
      .set(updateData)
      .where(eq(externalAgents.id, agentId))
      .returning();

    return agent || null;
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string): Promise<boolean> {
    const result = await this.db
      .delete(externalAgents)
      .where(eq(externalAgents.id, agentId))
      .returning();

    return result.length > 0;
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string): Promise<ExternalAgent | null> {
    const [agent] = await this.db
      .select()
      .from(externalAgents)
      .where(eq(externalAgents.id, agentId))
      .limit(1);

    return agent || null;
  }

  /**
   * List all agents
   */
  async listAgents(filters?: {
    status?: 'active' | 'inactive' | 'maintenance' | 'error';
    userId?: string;
  }): Promise<ExternalAgent[]> {
    let query = this.db.select().from(externalAgents);

    if (filters?.status) {
      query = query.where(eq(externalAgents.status, filters.status)) as any;
    }

    if (filters?.userId) {
      query = query.where(eq(externalAgents.createdBy, filters.userId)) as any;
    }

    return await query;
  }

  /**
   * Send message to external agent
   */
  async sendMessage(
    agentId: string,
    message: string,
    context?: {
      userId?: string;
      conversationId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<AgentResponse> {
    const agent = await this.getAgent(agentId);

    if (!agent) {
      return {
        success: false,
        error: `Agent ${agentId} not found`,
      };
    }

    if (agent.status !== 'active') {
      return {
        success: false,
        error: `Agent ${agentId} is not active (status: ${agent.status})`,
      };
    }

    const startTime = Date.now();

    try {
      const timeout = agent.config.timeout || 30000; // 30s default

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(agent.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${agent.apiKeyHash}`, // In production, decrypt API key
          'X-SINTRA-Agent-ID': agentId,
          'X-SINTRA-User-ID': context?.userId || 'anonymous',
        },
        body: JSON.stringify({
          message,
          conversationId: context?.conversationId,
          metadata: context?.metadata,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Agent returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const latencyMs = Date.now() - startTime;

      return {
        success: true,
        message: data.message || data.response || data.text,
        data: data.data,
        metadata: {
          model: data.model,
          tokens: data.tokens,
          latencyMs,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      // Update agent status to error
      await this.db
        .update(externalAgents)
        .set({ status: 'error', updatedAt: new Date() })
        .where(eq(externalAgents.id, agentId));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          latencyMs,
        },
      };
    }
  }

  /**
   * Health check for agent
   */
  async healthCheck(agentId: string): Promise<boolean> {
    const agent = await this.getAgent(agentId);

    if (!agent) {
      return false;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

      const response = await fetch(`${agent.endpoint}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${agent.apiKeyHash}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const isHealthy = response.ok;

      // Update agent status and last health check
      await this.db
        .update(externalAgents)
        .set({
          status: isHealthy ? 'active' : 'error',
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(externalAgents.id, agentId));

      return isHealthy;
    } catch (error) {
      // Mark as error if health check fails
      await this.db
        .update(externalAgents)
        .set({
          status: 'error',
          lastHealthCheck: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(externalAgents.id, agentId));

      return false;
    }
  }

  /**
   * Run health checks for all agents
   */
  async healthCheckAll(): Promise<Map<string, boolean>> {
    const agents = await this.listAgents();
    const results = new Map<string, boolean>();

    await Promise.all(
      agents.map(async (agent) => {
        const isHealthy = await this.healthCheck(agent.id);
        results.set(agent.id, isHealthy);
      })
    );

    return results;
  }

  /**
   * Get agent capabilities
   */
  async getCapabilities(agentId: string): Promise<AgentCapability[]> {
    const agent = await this.getAgent(agentId);

    if (!agent || agent.status !== 'active') {
      return [];
    }

    try {
      const response = await fetch(`${agent.endpoint}/capabilities`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${agent.apiKeyHash}`,
        },
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.capabilities || [];
    } catch (error) {
      console.error(`Failed to get capabilities for agent ${agentId}:`, error);
      return [];
    }
  }
}

// Export singleton instance
export const agentConnector = AgentConnector.getInstance();
