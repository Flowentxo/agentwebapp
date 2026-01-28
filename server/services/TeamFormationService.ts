/**
 * TEAM FORMATION SERVICE
 *
 * Forms and manages agent teams for complex multi-agent tasks.
 * The intelligence that brings agents together.
 */

import { getDb } from '../../lib/db/connection';
import {
  agentTeams,
  agentInstances,
  teamMembers,
  factoryAgentMessages,
  agentTasks,
  type AgentTeam,
  type NewAgentTeam,
  type AgentInstance
} from '../../lib/db/schema-agent-factory';
import { eq, and, inArray } from 'drizzle-orm';
import { logger } from '../../lib/logger';

export interface TeamRequirements {
  mission: string;
  requiredSkills: string[];
  preferredAgents?: string[]; // Agent instance IDs
  maxSize?: number;
}

export interface TeamMemberSelection {
  agentId: string;
  agentName: string;
  role: 'leader' | 'specialist' | 'support';
  skills: string[];
  reasoning: string;
}

export class TeamFormationService {
  private static instance: TeamFormationService;
  private db = getDb();

  private constructor() {
    logger.info('🤝 TeamFormationService initialized');
  }

  static getInstance(): TeamFormationService {
    if (!TeamFormationService.instance) {
      TeamFormationService.instance = new TeamFormationService();
    }
    return TeamFormationService.instance;
  }

  /**
   * Form a team for a specific mission
   */
  async formTeam(
    userId: string,
    requirements: TeamRequirements
  ): Promise<AgentTeam> {
    logger.info(`[TeamFormation] Forming team for mission: ${requirements.mission}`);

    // Get available agents
    const availableAgents = await this.getAvailableAgents(userId, requirements);

    if (availableAgents.length === 0) {
      throw new Error('No agents available for this mission');
    }

    // Select best agents for team
    const teamSelection = await this.selectTeamMembers(availableAgents, requirements);

    if (teamSelection.length === 0) {
      throw new Error('Could not find suitable agents for this mission');
    }

    // Determine team leader
    const leader = teamSelection.find(m => m.role === 'leader') || teamSelection[0];

    // Create team
    const [team] = await this.db
      .insert(agentTeams)
      .values({
        name: this.generateTeamName(requirements.mission),
        mission: requirements.mission,
        description: `Team assembled for: ${requirements.mission}`,
        leaderId: leader.agentId,
        status: 'forming',
        ownerId: userId,
        workflow: {
          stages: ['planning', 'execution', 'review'],
          currentStage: 'planning'
        },
        sharedContext: {
          mission: requirements.mission,
          requiredSkills: requirements.requiredSkills,
          discoveries: [],
          decisions: []
        },
        startedAt: new Date()
      })
      .returning();

    // Add team members
    for (const member of teamSelection) {
      await this.db.insert(teamMembers).values({
        teamId: team.id,
        agentId: member.agentId,
        role: member.role
      });

      // Update agent status
      await this.db
        .update(agentInstances)
        .set({ status: 'collaborating' })
        .where(eq(agentInstances.id, member.agentId));
    }

    // Activate team
    await this.db
      .update(agentTeams)
      .set({ status: 'active' })
      .where(eq(agentTeams.id, team.id));

    logger.info(`[TeamFormation] ✅ Team formed: ${team.id} with ${teamSelection.length} members`);
    logger.info(`[TeamFormation] Leader: ${leader.agentName} (${leader.role})`);

    return team;
  }

  /**
   * Get available agents for team formation
   */
  private async getAvailableAgents(
    userId: string,
    requirements: TeamRequirements
  ): Promise<AgentInstance[]> {
    // Get user's agents and factory agents
    const agents = await this.db.query.agentInstances.findMany({
      where: (instances, { or, eq, and }) =>
        and(
          or(
            eq(instances.ownerId, userId),
            eq(instances.ownerId, 'system') // Factory agents
          ),
          or(
            eq(instances.status, 'idle'),
            eq(instances.status, 'working')
          )
        ),
      with: {
        blueprint: true
      }
    });

    return agents as AgentInstance[];
  }

  /**
   * Intelligent team member selection
   */
  private async selectTeamMembers(
    availableAgents: AgentInstance[],
    requirements: TeamRequirements
  ): Promise<TeamMemberSelection[]> {
    const selections: TeamMemberSelection[] = [];

    // Score each agent based on required skills
    const scoredAgents = availableAgents.map(agent => {
      const blueprint = (agent as any).blueprint;
      const agentSkills = blueprint.skills || [];

      // Calculate skill match score
      const matchedSkills = requirements.requiredSkills.filter(skill =>
        agentSkills.some((as: string) =>
          as.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(as.toLowerCase())
        )
      );

      const skillScore = matchedSkills.length / Math.max(requirements.requiredSkills.length, 1);

      // Bonus for factory agents (CREATOR, CODER, SAP)
      const factoryBonus = ['CREATOR', 'CODER', 'SAP-CONNECT'].includes(blueprint.name) ? 0.2 : 0;

      return {
        agent,
        blueprint,
        score: skillScore + factoryBonus,
        matchedSkills
      };
    });

    // Sort by score
    scoredAgents.sort((a, b) => b.score - a.score);

    // Select top agents (up to maxSize)
    const maxSize = requirements.maxSize || 5;
    const topAgents = scoredAgents.slice(0, Math.min(maxSize, scoredAgents.length));

    // Assign roles
    for (let i = 0; i < topAgents.length; i++) {
      const { agent, blueprint, matchedSkills } = topAgents[i];

      let role: 'leader' | 'specialist' | 'support' = 'specialist';

      if (i === 0) {
        // First agent is leader (usually CREATOR for agent-building tasks)
        role = 'leader';
      } else if (blueprint.preferredRole) {
        role = blueprint.preferredRole as any;
      }

      selections.push({
        agentId: agent.id,
        agentName: blueprint.name,
        role,
        skills: matchedSkills,
        reasoning: `Matched ${matchedSkills.length}/${requirements.requiredSkills.length} required skills`
      });
    }

    logger.info(`[TeamFormation] Selected ${selections.length} agents:`, selections.map(s => `${s.agentName} (${s.role})`));

    return selections;
  }

  /**
   * Generate team name based on mission
   */
  private generateTeamName(mission: string): string {
    const words = mission.split(' ').slice(0, 3);
    return `Team ${words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`;
  }

  /**
   * Send message within team
   */
  async sendTeamMessage(
    fromAgentId: string,
    teamId: string,
    messageType: string,
    content: any,
    priority: 'low' | 'normal' | 'high' | 'critical' = 'normal'
  ): Promise<void> {
    await this.db.insert(factoryAgentMessages).values({
      fromAgentId,
      toAgentId: null, // Broadcast to team
      teamId,
      type: messageType,
      content,
      priority
    });

    logger.info(`[Team ${teamId}] Message from ${fromAgentId}: ${messageType}`);
  }

  /**
   * Update shared team context
   */
  async updateSharedContext(
    teamId: string,
    updates: {
      discoveries?: any[];
      decisions?: any[];
      status?: string;
    }
  ): Promise<void> {
    const team = await this.db.query.agentTeams.findFirst({
      where: eq(agentTeams.id, teamId)
    });

    if (!team) {
      throw new Error('Team not found');
    }

    const sharedContext = (team.sharedContext as any) || {};

    if (updates.discoveries) {
      sharedContext.discoveries = [...(sharedContext.discoveries || []), ...updates.discoveries];
    }

    if (updates.decisions) {
      sharedContext.decisions = [...(sharedContext.decisions || []), ...updates.decisions];
    }

    await this.db
      .update(agentTeams)
      .set({
        sharedContext,
        updatedAt: new Date()
      } as any)
      .where(eq(agentTeams.id, teamId));

    logger.info(`[Team ${teamId}] Shared context updated`);
  }

  /**
   * Complete team mission
   */
  async completeTeam(teamId: string, result?: any): Promise<void> {
    // Get team members
    const members = await this.db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId)
    });

    // Update team status
    await this.db
      .update(agentTeams)
      .set({
        status: 'completed',
        completedAt: new Date()
      })
      .where(eq(agentTeams.id, teamId));

    // Release agents back to idle
    const agentIds = members.map(m => m.agentId);
    if (agentIds.length > 0) {
      await this.db
        .update(agentInstances)
        .set({ status: 'idle' })
        .where(inArray(agentInstances.id, agentIds));
    }

    logger.info(`[Team ${teamId}] ✅ Mission completed, ${members.length} agents released`);
  }

  /**
   * Get team details with members
   */
  async getTeam(teamId: string): Promise<any> {
    const team = await this.db.query.agentTeams.findFirst({
      where: eq(agentTeams.id, teamId),
      with: {
        leader: {
          with: {
            blueprint: true
          }
        },
        members: {
          with: {
            agent: {
              with: {
                blueprint: true
              }
            }
          }
        }
      }
    });

    return team;
  }

  /**
   * Get all active teams for user
   */
  async getUserTeams(userId: string): Promise<AgentTeam[]> {
    return await this.db.query.agentTeams.findMany({
      where: and(
        eq(agentTeams.ownerId, userId),
        eq(agentTeams.status, 'active')
      ),
      with: {
        leader: {
          with: { blueprint: true }
        },
        members: {
          with: {
            agent: {
              with: { blueprint: true }
            }
          }
        }
      }
    });
  }

  /**
   * Dissolve team (emergency stop)
   */
  async dissolveTeam(teamId: string): Promise<void> {
    await this.db
      .update(agentTeams)
      .set({
        status: 'dissolved',
        completedAt: new Date()
      })
      .where(eq(agentTeams.id, teamId));

    // Release all agents
    const members = await this.db.query.teamMembers.findMany({
      where: eq(teamMembers.teamId, teamId)
    });

    const agentIds = members.map(m => m.agentId);
    if (agentIds.length > 0) {
      await this.db
        .update(agentInstances)
        .set({ status: 'idle' })
        .where(inArray(agentInstances.id, agentIds));
    }

    logger.info(`[Team ${teamId}] 🛑 Team dissolved`);
  }
}

// Export singleton
export const teamFormation = TeamFormationService.getInstance();
