/**
 * AGENT BUILDER SERVICE
 *
 * Core service for creating, deploying, and managing custom agents.
 * This is where the magic happens - agents building agents.
 */

import { getDb } from '../../lib/db/connection';
import {
  agentBlueprints,
  agentInstances,
  agentCreationRequests,
  agentTeams,
  teamMembers,
  type AgentBlueprint,
  type AgentInstance,
  type NewAgentBlueprint,
  type NewAgentInstance,
  type NewAgentCreationRequest,
  type AgentCreationRequest
} from '../../lib/db/schema-agent-factory';
import { eq, and } from 'drizzle-orm';
import { logger } from '../../lib/logger';

// Import centralized OpenAI client and config
import { openai } from '../../lib/ai/openai-client';
import { OPENAI_MODEL, AI_TEMPERATURE } from '../../lib/ai/config';

export interface AgentRequirements {
  purpose: string;
  skills: string[];
  integrations: string[];
  personality?: 'professional' | 'friendly' | 'technical' | 'creative';
  learningMode?: 'static' | 'adaptive' | 'evolutionary';
}

export interface AgentCreationProgress {
  stage: 'analyzing' | 'designing' | 'implementing' | 'testing' | 'deploying' | 'completed';
  progress: number; // 0-100
  message: string;
  details?: any;
}

export class AgentBuilderService {
  private static instance: AgentBuilderService;
  private db = getDb();

  private constructor() {
    logger.info('🏭 AgentBuilderService initialized');
  }

  static getInstance(): AgentBuilderService {
    if (!AgentBuilderService.instance) {
      AgentBuilderService.instance = new AgentBuilderService();
    }
    return AgentBuilderService.instance;
  }

  /**
   * Main entry point: Create a new personalized agent
   */
  async createAgent(
    userId: string,
    userRequest: string,
    onProgress?: (progress: AgentCreationProgress) => void
  ): Promise<AgentInstance> {
    logger.info(`[AgentBuilder] Starting agent creation for user: ${userId}`);
    logger.info(`[AgentBuilder] Request: "${userRequest}"`);

    // Create creation request record
    const [creationRequest] = await this.db
      .insert(agentCreationRequests)
      .values({
        userId,
        request: userRequest,
        status: 'analyzing'
      })
      .returning();

    try {
      // STAGE 1: Analyze Requirements (CREATOR Agent)
      onProgress?.({
        stage: 'analyzing',
        progress: 10,
        message: '🧠 CREATOR analyzing your requirements...'
      });

      const requirements = await this.analyzeRequirements(userRequest);

      await this.db
        .update(agentCreationRequests)
        .set({
          analyzedRequirements: requirements as any,
          status: 'designing'
        })
        .where(eq(agentCreationRequests.id, creationRequest.id));

      // STAGE 2: Design Blueprint (CREATOR Agent)
      onProgress?.({
        stage: 'designing',
        progress: 30,
        message: '✨ CREATOR designing your agent blueprint...',
        details: requirements
      });

      const blueprint = await this.designBlueprint(userId, requirements);

      await this.db
        .update(agentCreationRequests)
        .set({
          proposedBlueprintId: blueprint.id,
          status: 'implementing'
        })
        .where(eq(agentCreationRequests.id, creationRequest.id));

      // STAGE 3: Implement (CODER Agent)
      onProgress?.({
        stage: 'implementing',
        progress: 60,
        message: '💻 CODER implementing agent logic...',
        details: { blueprintId: blueprint.id }
      });

      // For now, we'll use the blueprint directly
      // In future: CODER could generate custom code/functions

      // STAGE 4: Deploy Instance
      onProgress?.({
        stage: 'deploying',
        progress: 90,
        message: '🚀 Deploying your personalized agent...'
      });

      const instance = await this.deployInstance(blueprint.id, userId);

      await this.db
        .update(agentCreationRequests)
        .set({
          createdAgentId: instance.id,
          status: 'completed',
          completedAt: new Date()
        })
        .where(eq(agentCreationRequests.id, creationRequest.id));

      // STAGE 5: Complete
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: `✅ ${blueprint.name} is ready to work!`,
        details: { instanceId: instance.id }
      });

      logger.info(`[AgentBuilder] ✅ Agent created: ${instance.id}`);
      return instance;

    } catch (error: any) {
      logger.error(`[AgentBuilder] ❌ Creation failed:`, error);

      await this.db
        .update(agentCreationRequests)
        .set({
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        })
        .where(eq(agentCreationRequests.id, creationRequest.id));

      throw error;
    }
  }

  /**
   * STAGE 1: Analyze user requirements using CREATOR Agent
   */
  private async analyzeRequirements(userRequest: string): Promise<AgentRequirements> {
    logger.info('[CREATOR] Analyzing requirements...');

    const analysis = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are CREATOR, the Agent Architect. Analyze user requests and extract requirements for building a custom agent.

Extract:
1. Purpose: What should this agent do?
2. Skills: What capabilities does it need?
3. Integrations: What systems should it connect to?
4. Personality: What communication style fits?
5. Learning Mode: Should it be static, adaptive, or evolutionary?

Return JSON only, no explanation.`
        },
        {
          role: 'user',
          content: `User request: "${userRequest}"\n\nExtract requirements in JSON format with keys: purpose, skills (array), integrations (array), personality, learningMode`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3
    });

    const result = JSON.parse(analysis.choices[0].message.content || '{}');

    logger.info('[CREATOR] Requirements analyzed:', result);

    return {
      purpose: result.purpose || userRequest,
      skills: result.skills || [],
      integrations: result.integrations || [],
      personality: result.personality || 'professional',
      learningMode: result.learningMode || 'adaptive'
    };
  }

  /**
   * STAGE 2: Design agent blueprint using CREATOR Agent
   */
  private async designBlueprint(
    userId: string,
    requirements: AgentRequirements
  ): Promise<AgentBlueprint> {
    logger.info('[CREATOR] Designing blueprint...');

    const design = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are CREATOR, the Agent Architect. Design complete agent blueprints.

Based on requirements, create:
1. Name: Short, memorable agent name
2. Title: Professional title (e.g., "The Data Guardian")
3. System Prompt: Complete AI instructions for the agent
4. Personality traits: Array of 3-5 traits
5. Reasoning style: e.g., "analytical", "creative", "systematic"

Return JSON only.`
        },
        {
          role: 'user',
          content: `Requirements:
Purpose: ${requirements.purpose}
Skills: ${requirements.skills.join(', ')}
Integrations: ${requirements.integrations.join(', ')}
Personality: ${requirements.personality}

Design complete agent blueprint in JSON format with keys: name, title, systemPrompt, traits (array), reasoningStyle`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7
    });

    const blueprint = JSON.parse(design.choices[0].message.content || '{}');

    logger.info('[CREATOR] Blueprint designed:', blueprint.name);

    // Create blueprint in database
    const [newBlueprint] = await this.db
      .insert(agentBlueprints)
      .values({
        name: blueprint.name || 'Custom Agent',
        title: blueprint.title || 'Personalized Assistant',
        description: requirements.purpose,
        personality: {
          voice: requirements.personality || 'professional',
          traits: blueprint.traits || ['Helpful', 'Efficient', 'Precise']
        },
        skills: requirements.skills,
        tools: [],
        integrations: requirements.integrations,
        systemPrompt: blueprint.systemPrompt || this.generateDefaultPrompt(requirements),
        reasoningStyle: blueprint.reasoningStyle || 'balanced',
        learningMode: requirements.learningMode || 'adaptive',
        canCollaborate: [],
        preferredRole: 'specialist',
        ownerId: userId,
        isPublic: false,
        category: 'custom',
        tags: requirements.skills
      })
      .returning();

    return newBlueprint;
  }

  /**
   * STAGE 3: Deploy agent instance
   */
  private async deployInstance(blueprintId: string, userId: string): Promise<AgentInstance> {
    logger.info(`[AgentBuilder] Deploying instance for blueprint: ${blueprintId}`);

    const [instance] = await this.db
      .insert(agentInstances)
      .values({
        blueprintId,
        status: 'idle',
        memory: { conversationHistory: [], context: {} },
        context: {},
        metrics: {
          totalTasks: 0,
          completedTasks: 0,
          successRate: 100,
          avgResponseTime: 0
        },
        ownerId: userId,
        lastActiveAt: new Date(),
        totalTasks: 0,
        successRate: 100
      })
      .returning();

    logger.info(`[AgentBuilder] ✅ Instance deployed: ${instance.id}`);

    return instance;
  }

  /**
   * Generate default system prompt
   */
  private generateDefaultPrompt(requirements: AgentRequirements): string {
    return `You are a specialized AI assistant designed for: ${requirements.purpose}

Your capabilities include:
${requirements.skills.map(skill => `- ${skill}`).join('\n')}

${requirements.integrations.length > 0 ? `You can integrate with: ${requirements.integrations.join(', ')}` : ''}

Communication style: ${requirements.personality}

Always be helpful, accurate, and focused on your specialized purpose.`;
  }

  /**
   * Get agent instance with blueprint
   */
  async getAgentInstance(instanceId: string): Promise<(AgentInstance & { blueprint: AgentBlueprint }) | null> {
    const instance = await this.db.query.agentInstances.findFirst({
      where: eq(agentInstances.id, instanceId),
      with: {
        blueprint: true
      }
    });

    return instance as any;
  }

  /**
   * Get all user's custom agents
   */
  async getUserAgents(userId: string): Promise<AgentInstance[]> {
    return await this.db.query.agentInstances.findMany({
      where: eq(agentInstances.ownerId, userId),
      with: {
        blueprint: true
      }
    });
  }

  /**
   * Get agent blueprints (including public ones)
   */
  async getAvailableBlueprints(userId: string): Promise<AgentBlueprint[]> {
    return await this.db.query.agentBlueprints.findMany({
      where: (blueprints, { or, eq }) =>
        or(
          eq(blueprints.ownerId, userId),
          eq(blueprints.isPublic, true)
        )
    });
  }

  /**
   * Get creation request status
   */
  async getCreationRequest(requestId: string): Promise<AgentCreationRequest | null> {
    const [request] = await this.db
      .select()
      .from(agentCreationRequests)
      .where(eq(agentCreationRequests.id, requestId))
      .limit(1);

    return request || null;
  }

  /**
   * Delete agent instance
   */
  async deleteAgent(instanceId: string, userId: string): Promise<void> {
    await this.db
      .delete(agentInstances)
      .where(
        and(
          eq(agentInstances.id, instanceId),
          eq(agentInstances.ownerId, userId)
        )
      );

    logger.info(`[AgentBuilder] Agent deleted: ${instanceId}`);
  }
}

// Export singleton instance
export const agentBuilder = AgentBuilderService.getInstance();
