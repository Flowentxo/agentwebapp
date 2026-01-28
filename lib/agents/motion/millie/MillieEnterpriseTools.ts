/**
 * MillieEnterpriseTools - AI-Powered Enterprise Tools for Millie Agent
 *
 * NO MOCKS - All tools use real AI processing via MotionAIService
 *
 * Project Manager with AI-powered project planning, task management,
 * progress tracking, and resource allocation.
 */

import { motionAI } from '../services/MotionAIService';
import { memoryService } from '../services/MemoryService';
import type { MotionTool, MotionAgentContext } from '../shared/types';

// ============================================
// PROJECT PLANNING TOOLS
// ============================================

/**
 * AI-powered Project Plan Creator
 */
export function createEnterpriseProjectPlanTool(): MotionTool<
  {
    projectName: string;
    description: string;
    goals: string[];
    deadline: string;
    teamMembers: Array<{ name: string; role: string; capacity?: number }>;
    constraints?: string[];
    budget?: string;
    methodology?: 'agile' | 'waterfall' | 'hybrid' | 'kanban';
  },
  {
    projectId: string;
    projectName: string;
    executiveSummary: string;
    phases: Array<{
      id: string;
      name: string;
      description: string;
      startDate: string;
      endDate: string;
      tasks: Array<{ id: string; title: string; assignee?: string; estimate: string }>;
      deliverables: string[];
    }>;
    milestones: Array<{
      id: string;
      name: string;
      date: string;
      criteria: string[];
      phase: string;
    }>;
    risks: Array<{
      id: string;
      description: string;
      probability: 'low' | 'medium' | 'high';
      impact: 'low' | 'medium' | 'high';
      mitigation: string;
    }>;
    criticalPath: string[];
    estimatedCompletion: string;
    successCriteria: string[];
    resourcePlan: Array<{ member: string; allocation: string; primaryPhase: string }>;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'create_project_plan',
    displayName: 'Create Project Plan',
    description: 'AI-powered comprehensive project planning with phases, risks, and resource allocation',
    category: 'project',
    creditCost: 150,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        description: { type: 'string' },
        goals: { type: 'array', items: { type: 'string' } },
        deadline: { type: 'string' },
        teamMembers: { type: 'array' },
        constraints: { type: 'array', items: { type: 'string' } },
        budget: { type: 'string' },
        methodology: { type: 'string', enum: ['agile', 'waterfall', 'hybrid', 'kanban'] },
      },
      required: ['projectName', 'description', 'goals', 'deadline', 'teamMembers'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
        executiveSummary: string;
        phases: Array<{
          id: string;
          name: string;
          description: string;
          startDate: string;
          endDate: string;
          tasks: Array<{ id: string; title: string; assignee?: string; estimate: string }>;
          deliverables: string[];
        }>;
        milestones: Array<{
          id: string;
          name: string;
          date: string;
          criteria: string[];
          phase: string;
        }>;
        risks: Array<{
          id: string;
          description: string;
          probability: 'low' | 'medium' | 'high';
          impact: 'low' | 'medium' | 'high';
          mitigation: string;
        }>;
        criticalPath: string[];
        successCriteria: string[];
        resourcePlan: Array<{ member: string; allocation: string; primaryPhase: string }>;
      }>(
        `Create a comprehensive project plan:
Project: ${input.projectName}
Description: ${input.description}
Goals: ${input.goals.join(', ')}
Deadline: ${input.deadline}
Team: ${input.teamMembers.map((m) => `${m.name} (${m.role})`).join(', ')}
Methodology: ${input.methodology || 'agile'}
Constraints: ${input.constraints?.join(', ') || 'none specified'}
Budget: ${input.budget || 'not specified'}`,
        `You are an expert project manager. Create detailed, realistic project plans that:
- Break down work into logical phases
- Identify dependencies and critical path
- Assess and mitigate risks
- Allocate resources effectively
- Set clear milestones and success criteria`,
        {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            phases: { type: 'array' },
            milestones: { type: 'array' },
            risks: { type: 'array' },
            criticalPath: { type: 'array' },
            successCriteria: { type: 'array' },
            resourcePlan: { type: 'array' },
          },
          required: ['executiveSummary', 'phases', 'milestones', 'risks', 'criticalPath', 'successCriteria', 'resourcePlan'],
        }
      );

      return {
        projectId: crypto.randomUUID(),
        projectName: input.projectName,
        ...result.result,
        estimatedCompletion: input.deadline,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Task Breakdown Tool
 */
export function createEnterpriseBreakdownTasksTool(): MotionTool<
  {
    taskTitle: string;
    taskDescription: string;
    complexity: 'simple' | 'moderate' | 'complex';
    maxSubtasks?: number;
    includeEstimates?: boolean;
    assignTeamMembers?: string[];
    acceptanceCriteria?: string[];
  },
  {
    originalTask: { title: string; description: string };
    subtasks: Array<{
      id: string;
      title: string;
      description: string;
      estimate?: string;
      assignee?: string;
      dependencies: string[];
      acceptanceCriteria: string[];
      priority: 'high' | 'medium' | 'low';
    }>;
    totalEstimate: string;
    suggestedOrder: string[];
    technicalConsiderations: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'breakdown_tasks',
    displayName: 'Breakdown Tasks',
    description: 'AI-powered intelligent task decomposition with estimates and dependencies',
    category: 'project',
    creditCost: 50,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        taskTitle: { type: 'string' },
        taskDescription: { type: 'string' },
        complexity: { type: 'string', enum: ['simple', 'moderate', 'complex'] },
        maxSubtasks: { type: 'number' },
        includeEstimates: { type: 'boolean' },
        assignTeamMembers: { type: 'array', items: { type: 'string' } },
        acceptanceCriteria: { type: 'array', items: { type: 'string' } },
      },
      required: ['taskTitle', 'taskDescription', 'complexity'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        subtasks: Array<{
          id: string;
          title: string;
          description: string;
          estimate?: string;
          assignee?: string;
          dependencies: string[];
          acceptanceCriteria: string[];
          priority: 'high' | 'medium' | 'low';
        }>;
        totalEstimate: string;
        suggestedOrder: string[];
        technicalConsiderations: string[];
      }>({
        data: {
          task: { title: input.taskTitle, description: input.taskDescription },
          complexity: input.complexity,
          maxSubtasks: input.maxSubtasks || 10,
          includeEstimates: input.includeEstimates !== false,
          teamMembers: input.assignTeamMembers,
          acceptanceCriteria: input.acceptanceCriteria,
        },
        analysisType: 'task_decomposition',
        outputSchema: {
          type: 'object',
          properties: {
            subtasks: { type: 'array' },
            totalEstimate: { type: 'string' },
            suggestedOrder: { type: 'array' },
            technicalConsiderations: { type: 'array' },
          },
          required: ['subtasks', 'totalEstimate', 'suggestedOrder', 'technicalConsiderations'],
        },
      });

      return {
        originalTask: { title: input.taskTitle, description: input.taskDescription },
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Sprint Planning Tool
 */
export function createEnterpriseSprintPlanTool(): MotionTool<
  {
    sprintName: string;
    sprintGoal: string;
    durationDays: number;
    teamCapacity: Array<{ member: string; availableHours: number }>;
    backlogItems: Array<{ id: string; title: string; estimate: number; priority: string }>;
    previousVelocity?: number;
  },
  {
    sprintId: string;
    sprintName: string;
    sprintGoal: string;
    startDate: string;
    endDate: string;
    selectedItems: Array<{
      id: string;
      title: string;
      estimate: number;
      assignee: string;
      reasoning: string;
    }>;
    totalPoints: number;
    capacityUtilization: string;
    riskAssessment: {
      overcommitRisk: 'low' | 'medium' | 'high';
      dependencyRisks: string[];
      recommendations: string[];
    };
    dailyGoals: Array<{ day: number; goals: string[] }>;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'create_sprint_plan',
    displayName: 'Create Sprint Plan',
    description: 'AI-powered sprint planning with capacity analysis and risk assessment',
    category: 'project',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        sprintName: { type: 'string' },
        sprintGoal: { type: 'string' },
        durationDays: { type: 'number' },
        teamCapacity: { type: 'array' },
        backlogItems: { type: 'array' },
        previousVelocity: { type: 'number' },
      },
      required: ['sprintName', 'sprintGoal', 'durationDays', 'teamCapacity', 'backlogItems'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
        selectedItems: Array<{
          id: string;
          title: string;
          estimate: number;
          assignee: string;
          reasoning: string;
        }>;
        totalPoints: number;
        capacityUtilization: string;
        riskAssessment: {
          overcommitRisk: 'low' | 'medium' | 'high';
          dependencyRisks: string[];
          recommendations: string[];
        };
        dailyGoals: Array<{ day: number; goals: string[] }>;
      }>(
        `Plan sprint:
Sprint: ${input.sprintName}
Goal: ${input.sprintGoal}
Duration: ${input.durationDays} days
Team Capacity: ${input.teamCapacity.map((t) => `${t.member}: ${t.availableHours}h`).join(', ')}
Previous Velocity: ${input.previousVelocity || 'unknown'}
Backlog Items: ${JSON.stringify(input.backlogItems)}`,
        `You are an agile coach. Plan sprints that:
- Balance team capacity with sprint goals
- Consider dependencies and risks
- Set realistic daily goals
- Maximize value delivery`,
        {
          type: 'object',
          properties: {
            selectedItems: { type: 'array' },
            totalPoints: { type: 'number' },
            capacityUtilization: { type: 'string' },
            riskAssessment: { type: 'object' },
            dailyGoals: { type: 'array' },
          },
          required: ['selectedItems', 'totalPoints', 'capacityUtilization', 'riskAssessment', 'dailyGoals'],
        }
      );

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + input.durationDays * 24 * 60 * 60 * 1000);

      return {
        sprintId: crypto.randomUUID(),
        sprintName: input.sprintName,
        sprintGoal: input.sprintGoal,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

// ============================================
// REPORTING & ANALYTICS TOOLS
// ============================================

/**
 * AI-powered Status Report Generator
 */
export function createEnterpriseGenerateStatusReportTool(): MotionTool<
  {
    projectName: string;
    reportPeriod: string;
    completedTasks: Array<{ title: string; assignee: string; completedDate: string }>;
    inProgressTasks: Array<{ title: string; assignee: string; progress: number }>;
    blockers?: Array<{ description: string; severity: string }>;
    upcomingMilestones?: Array<{ name: string; date: string }>;
    metrics?: Record<string, number>;
    audience?: 'executive' | 'team' | 'stakeholder';
  },
  {
    reportId: string;
    title: string;
    executiveSummary: string;
    healthStatus: 'on-track' | 'at-risk' | 'off-track';
    sections: Array<{
      title: string;
      content: string;
      highlights?: string[];
    }>;
    keyMetrics: Array<{ metric: string; value: string; trend: 'up' | 'down' | 'stable'; insight: string }>;
    risks: string[];
    recommendations: string[];
    nextSteps: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'generate_status_report',
    displayName: 'Generate Status Report',
    description: 'AI-powered project status reports tailored to audience',
    category: 'document',
    creditCost: 100,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        reportPeriod: { type: 'string' },
        completedTasks: { type: 'array' },
        inProgressTasks: { type: 'array' },
        blockers: { type: 'array' },
        upcomingMilestones: { type: 'array' },
        metrics: { type: 'object' },
        audience: { type: 'string', enum: ['executive', 'team', 'stakeholder'] },
      },
      required: ['projectName', 'reportPeriod', 'completedTasks', 'inProgressTasks'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateDocument({
        type: 'report',
        title: `${input.projectName} - Status Report`,
        sections: ['executive_summary', 'progress', 'blockers', 'metrics', 'next_steps'],
        context: `
Project: ${input.projectName}
Period: ${input.reportPeriod}
Audience: ${input.audience || 'team'}
Completed: ${input.completedTasks.length} tasks
In Progress: ${input.inProgressTasks.length} tasks
Blockers: ${input.blockers?.length || 0}`,
        data: input,
        format: 'markdown',
      });

      // Generate structured analysis
      const analysis = await motionAI.analyzeData<{
        healthStatus: 'on-track' | 'at-risk' | 'off-track';
        keyMetrics: Array<{ metric: string; value: string; trend: 'up' | 'down' | 'stable'; insight: string }>;
        risks: string[];
        recommendations: string[];
        nextSteps: string[];
      }>({
        data: input,
        analysisType: 'project_health_assessment',
        outputSchema: {
          type: 'object',
          properties: {
            healthStatus: { type: 'string' },
            keyMetrics: { type: 'array' },
            risks: { type: 'array' },
            recommendations: { type: 'array' },
            nextSteps: { type: 'array' },
          },
          required: ['healthStatus', 'keyMetrics', 'risks', 'recommendations', 'nextSteps'],
        },
      });

      return {
        reportId: crypto.randomUUID(),
        title: result.title,
        executiveSummary: result.sections[0]?.content || '',
        ...analysis.result,
        sections: result.sections,
        metadata: { tokensUsed: result.tokensUsed + analysis.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Blocker Identifier
 */
export function createEnterpriseIdentifyBlockersTool(): MotionTool<
  {
    projectData: {
      tasks: Array<{ id: string; title: string; status: string; assignee: string; dueDate?: string; dependencies?: string[] }>;
      teamMembers: Array<{ name: string; currentWorkload: number }>;
      recentComments?: Array<{ taskId: string; text: string; author: string }>;
    };
    analysisDepth?: 'quick' | 'thorough';
  },
  {
    blockers: Array<{
      id: string;
      type: 'dependency' | 'resource' | 'technical' | 'external' | 'process';
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      affectedTasks: string[];
      affectedMembers: string[];
      suggestedResolution: string;
      estimatedImpact: string;
    }>;
    riskAreas: Array<{
      area: string;
      riskLevel: 'high' | 'medium' | 'low';
      indicators: string[];
    }>;
    immediateActions: string[];
    preventiveMeasures: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'identify_blockers',
    displayName: 'Identify Blockers',
    description: 'AI-powered detection and analysis of project blockers',
    category: 'analytics',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        projectData: { type: 'object' },
        analysisDepth: { type: 'string', enum: ['quick', 'thorough'] },
      },
      required: ['projectData'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        blockers: Array<{
          id: string;
          type: 'dependency' | 'resource' | 'technical' | 'external' | 'process';
          severity: 'critical' | 'high' | 'medium' | 'low';
          description: string;
          affectedTasks: string[];
          affectedMembers: string[];
          suggestedResolution: string;
          estimatedImpact: string;
        }>;
        riskAreas: Array<{ area: string; riskLevel: 'high' | 'medium' | 'low'; indicators: string[] }>;
        immediateActions: string[];
        preventiveMeasures: string[];
      }>({
        data: input.projectData,
        analysisType: 'blocker_detection',
        outputSchema: {
          type: 'object',
          properties: {
            blockers: { type: 'array' },
            riskAreas: { type: 'array' },
            immediateActions: { type: 'array' },
            preventiveMeasures: { type: 'array' },
          },
          required: ['blockers', 'riskAreas', 'immediateActions', 'preventiveMeasures'],
        },
      });

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

// ============================================
// RESOURCE MANAGEMENT TOOLS
// ============================================

/**
 * AI-powered Workload Analyzer
 */
export function createEnterpriseAnalyzeWorkloadTool(): MotionTool<
  {
    teamMembers: Array<{
      name: string;
      role: string;
      assignedTasks: Array<{ title: string; estimate: number; deadline: string }>;
      capacity: number;
      skills?: string[];
    }>;
    timeframe: string;
    includeRecommendations?: boolean;
  },
  {
    analysis: Array<{
      member: string;
      role: string;
      totalWorkload: number;
      capacity: number;
      utilizationRate: string;
      status: 'underutilized' | 'optimal' | 'overloaded';
      taskBreakdown: Array<{ task: string; hours: number }>;
      riskFactors: string[];
    }>;
    teamSummary: {
      averageUtilization: string;
      bottlenecks: string[];
      underutilized: string[];
      overloaded: string[];
    };
    balancingRecommendations: Array<{
      action: string;
      from?: string;
      to?: string;
      task?: string;
      impact: string;
    }>;
    forecasts: Array<{
      member: string;
      nextWeekStatus: string;
      riskLevel: 'low' | 'medium' | 'high';
    }>;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'analyze_workload',
    displayName: 'Analyze Workload',
    description: 'AI-powered team workload analysis with balancing recommendations',
    category: 'analytics',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        teamMembers: { type: 'array' },
        timeframe: { type: 'string' },
        includeRecommendations: { type: 'boolean' },
      },
      required: ['teamMembers', 'timeframe'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        analysis: Array<{
          member: string;
          role: string;
          totalWorkload: number;
          capacity: number;
          utilizationRate: string;
          status: 'underutilized' | 'optimal' | 'overloaded';
          taskBreakdown: Array<{ task: string; hours: number }>;
          riskFactors: string[];
        }>;
        teamSummary: {
          averageUtilization: string;
          bottlenecks: string[];
          underutilized: string[];
          overloaded: string[];
        };
        balancingRecommendations: Array<{
          action: string;
          from?: string;
          to?: string;
          task?: string;
          impact: string;
        }>;
        forecasts: Array<{ member: string; nextWeekStatus: string; riskLevel: 'low' | 'medium' | 'high' }>;
      }>({
        data: { teamMembers: input.teamMembers, timeframe: input.timeframe },
        analysisType: 'workload_analysis',
        outputSchema: {
          type: 'object',
          properties: {
            analysis: { type: 'array' },
            teamSummary: { type: 'object' },
            balancingRecommendations: { type: 'array' },
            forecasts: { type: 'array' },
          },
          required: ['analysis', 'teamSummary', 'balancingRecommendations', 'forecasts'],
        },
      });

      return {
        ...result.result,
        metadata: { tokensUsed: result.tokensUsed },
      };
    },
  };
}

/**
 * AI-powered Resource Allocation Suggester
 */
export function createEnterpriseSuggestResourceAllocationTool(): MotionTool<
  {
    project: { name: string; phases: Array<{ name: string; requiredSkills: string[]; estimatedEffort: number }> };
    availableResources: Array<{ name: string; skills: string[]; availability: number; hourlyRate?: number }>;
    constraints?: { budget?: number; deadline?: string; priorities?: string[] };
    optimizationGoal?: 'cost' | 'speed' | 'quality' | 'balanced';
  },
  {
    allocationPlan: Array<{
      phase: string;
      assignments: Array<{
        resource: string;
        allocation: number;
        reasoning: string;
        skillMatch: string;
      }>;
      coverage: string;
      gaps: string[];
    }>;
    summary: {
      totalCost: string;
      totalHours: number;
      resourceUtilization: Record<string, string>;
      completionEstimate: string;
    };
    alternatives: Array<{
      scenario: string;
      tradeoffs: string;
      impact: string;
    }>;
    risks: string[];
    recommendations: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'suggest_resource_allocation',
    displayName: 'Suggest Resource Allocation',
    description: 'AI-powered optimal resource allocation with multiple scenarios',
    category: 'project',
    creditCost: 100,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'object' },
        availableResources: { type: 'array' },
        constraints: { type: 'object' },
        optimizationGoal: { type: 'string', enum: ['cost', 'speed', 'quality', 'balanced'] },
      },
      required: ['project', 'availableResources'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateRecommendations({
        context: 'resource allocation optimization',
        data: input,
        focusAreas: ['skill matching', 'capacity optimization', 'cost efficiency', 'risk mitigation'],
        maxRecommendations: 10,
      });

      // Generate detailed allocation plan
      const allocationResult = await motionAI.generateStructuredOutput<{
        allocationPlan: Array<{
          phase: string;
          assignments: Array<{ resource: string; allocation: number; reasoning: string; skillMatch: string }>;
          coverage: string;
          gaps: string[];
        }>;
        summary: {
          totalCost: string;
          totalHours: number;
          resourceUtilization: Record<string, string>;
          completionEstimate: string;
        };
        alternatives: Array<{ scenario: string; tradeoffs: string; impact: string }>;
        risks: string[];
      }>(
        `Create resource allocation for:
Project: ${input.project.name}
Phases: ${input.project.phases.map((p) => p.name).join(', ')}
Resources: ${input.availableResources.map((r) => `${r.name} (${r.skills.join(', ')})`).join(', ')}
Goal: ${input.optimizationGoal || 'balanced'}`,
        'Create an optimal resource allocation plan considering skills, availability, and constraints.',
        {
          type: 'object',
          properties: {
            allocationPlan: { type: 'array' },
            summary: { type: 'object' },
            alternatives: { type: 'array' },
            risks: { type: 'array' },
          },
          required: ['allocationPlan', 'summary', 'alternatives', 'risks'],
        }
      );

      return {
        ...allocationResult.result,
        recommendations: result.recommendations.map((r) => r.description),
        metadata: { tokensUsed: result.tokensUsed + allocationResult.tokensUsed },
      };
    },
  };
}

// ============================================
// EXPORT ALL ENTERPRISE TOOLS
// ============================================

export const millieEnterpriseTools = {
  // Project Planning
  createProjectPlan: createEnterpriseProjectPlanTool,
  breakdownTasks: createEnterpriseBreakdownTasksTool,
  createSprintPlan: createEnterpriseSprintPlanTool,

  // Reporting & Analytics
  generateStatusReport: createEnterpriseGenerateStatusReportTool,
  identifyBlockers: createEnterpriseIdentifyBlockersTool,

  // Resource Management
  analyzeWorkload: createEnterpriseAnalyzeWorkloadTool,
  suggestResourceAllocation: createEnterpriseSuggestResourceAllocationTool,
};

/**
 * Get all Millie enterprise tools as an array
 */
export function getAllMillieEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createEnterpriseProjectPlanTool(),
    createEnterpriseBreakdownTasksTool(),
    createEnterpriseSprintPlanTool(),
    createEnterpriseGenerateStatusReportTool(),
    createEnterpriseIdentifyBlockersTool(),
    createEnterpriseAnalyzeWorkloadTool(),
    createEnterpriseSuggestResourceAllocationTool(),
  ];
}

export default millieEnterpriseTools;
