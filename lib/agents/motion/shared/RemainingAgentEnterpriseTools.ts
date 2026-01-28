/**
 * RemainingAgentEnterpriseTools - Enterprise Tools for Chip, Dot, Clide, and Spec
 *
 * NO MOCKS - All tools use real AI processing via MotionAIService
 *
 * This module provides enterprise-ready tools for:
 * - Chip (Sales Agent)
 * - Dot (HR/Recruiting Agent)
 * - Clide (Customer Success Agent)
 * - Spec (Market Research Agent)
 */

import { motionAI } from '../services/MotionAIService';
import { memoryService } from '../services/MemoryService';
import type { MotionTool, MotionAgentContext } from './types';

// ============================================
// CHIP (SALES) ENTERPRISE TOOLS
// ============================================

export function createChipEnterpriseLeadScoringTool(): MotionTool<
  {
    leads: Array<{
      id: string;
      company: string;
      contact: string;
      email?: string;
      industry?: string;
      companySize?: string;
      interactions?: Array<{ type: string; date: string }>;
      source?: string;
    }>;
    scoringCriteria?: string[];
  },
  {
    scoredLeads: Array<{
      id: string;
      company: string;
      score: number;
      grade: 'A' | 'B' | 'C' | 'D';
      factors: Array<{ factor: string; impact: 'positive' | 'negative'; weight: number }>;
      nextBestAction: string;
      estimatedValue: string;
      conversionProbability: string;
    }>;
    insights: string[];
    prioritizationStrategy: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'score_leads',
    displayName: 'Score Leads',
    description: 'AI-powered lead scoring with conversion probability',
    category: 'analytics',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        leads: { type: 'array' },
        scoringCriteria: { type: 'array', items: { type: 'string' } },
      },
      required: ['leads'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        scoredLeads: Array<{
          id: string;
          company: string;
          score: number;
          grade: 'A' | 'B' | 'C' | 'D';
          factors: Array<{ factor: string; impact: 'positive' | 'negative'; weight: number }>;
          nextBestAction: string;
          estimatedValue: string;
          conversionProbability: string;
        }>;
        insights: string[];
        prioritizationStrategy: string;
      }>({
        data: input,
        analysisType: 'lead_scoring',
        outputSchema: {
          type: 'object',
          properties: {
            scoredLeads: { type: 'array' },
            insights: { type: 'array' },
            prioritizationStrategy: { type: 'string' },
          },
          required: ['scoredLeads', 'insights', 'prioritizationStrategy'],
        },
      });
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

export function createChipEnterpriseProposalTool(): MotionTool<
  {
    clientName: string;
    projectScope: string;
    budget?: string;
    timeline?: string;
    keyRequirements: string[];
    competitiveContext?: string;
  },
  {
    proposal: {
      title: string;
      executiveSummary: string;
      scopeOfWork: string;
      deliverables: Array<{ item: string; description: string; timeline: string }>;
      pricing: { total: string; breakdown: Array<{ item: string; cost: string }> };
      timeline: Array<{ phase: string; duration: string; deliverables: string[] }>;
      whyUs: string[];
      nextSteps: string[];
    };
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'generate_proposal',
    displayName: 'Generate Sales Proposal',
    description: 'AI-powered sales proposal generation',
    category: 'document',
    creditCost: 150,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        clientName: { type: 'string' },
        projectScope: { type: 'string' },
        budget: { type: 'string' },
        timeline: { type: 'string' },
        keyRequirements: { type: 'array', items: { type: 'string' } },
        competitiveContext: { type: 'string' },
      },
      required: ['clientName', 'projectScope', 'keyRequirements'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateDocument({
        type: 'proposal',
        title: `Proposal for ${input.clientName}`,
        sections: ['executive_summary', 'scope', 'deliverables', 'pricing', 'timeline', 'why_us'],
        context: JSON.stringify(input),
        data: input,
        format: 'markdown',
      });

      const structuredResult = await motionAI.generateStructuredOutput<{
        proposal: {
          title: string;
          executiveSummary: string;
          scopeOfWork: string;
          deliverables: Array<{ item: string; description: string; timeline: string }>;
          pricing: { total: string; breakdown: Array<{ item: string; cost: string }> };
          timeline: Array<{ phase: string; duration: string; deliverables: string[] }>;
          whyUs: string[];
          nextSteps: string[];
        };
      }>(
        `Structure this proposal: ${result.content}`,
        'Convert the proposal into structured JSON format.',
        {
          type: 'object',
          properties: { proposal: { type: 'object' } },
          required: ['proposal'],
        }
      );

      return { ...structuredResult.result, metadata: { tokensUsed: result.tokensUsed + structuredResult.tokensUsed } };
    },
  };
}

export function createChipEnterprisePipelineAnalysisTool(): MotionTool<
  {
    opportunities: Array<{
      id: string;
      name: string;
      value: number;
      stage: string;
      probability: number;
      expectedCloseDate: string;
      lastActivity?: string;
    }>;
    period?: string;
  },
  {
    pipelineHealth: {
      totalValue: number;
      weightedValue: number;
      averageDealSize: number;
      averageSalesCycle: string;
      winRate: string;
    };
    stageAnalysis: Array<{
      stage: string;
      count: number;
      value: number;
      avgTimeInStage: string;
      conversionRate: string;
      bottleneck: boolean;
    }>;
    atRiskDeals: Array<{ id: string; name: string; risk: string; recommendation: string }>;
    forecast: { best: number; likely: number; worst: number };
    recommendations: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'analyze_pipeline',
    displayName: 'Analyze Sales Pipeline',
    description: 'AI-powered sales pipeline analysis with forecasting',
    category: 'analytics',
    creditCost: 100,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        opportunities: { type: 'array' },
        period: { type: 'string' },
      },
      required: ['opportunities'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        pipelineHealth: {
          totalValue: number;
          weightedValue: number;
          averageDealSize: number;
          averageSalesCycle: string;
          winRate: string;
        };
        stageAnalysis: Array<{
          stage: string;
          count: number;
          value: number;
          avgTimeInStage: string;
          conversionRate: string;
          bottleneck: boolean;
        }>;
        atRiskDeals: Array<{ id: string; name: string; risk: string; recommendation: string }>;
        forecast: { best: number; likely: number; worst: number };
        recommendations: string[];
      }>({
        data: input,
        analysisType: 'sales_pipeline_analysis',
        outputSchema: {
          type: 'object',
          properties: {
            pipelineHealth: { type: 'object' },
            stageAnalysis: { type: 'array' },
            atRiskDeals: { type: 'array' },
            forecast: { type: 'object' },
            recommendations: { type: 'array' },
          },
          required: ['pipelineHealth', 'stageAnalysis', 'atRiskDeals', 'forecast', 'recommendations'],
        },
      });
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

// ============================================
// DOT (HR/RECRUITING) ENTERPRISE TOOLS
// ============================================

export function createDotEnterpriseScreenResumeTool(): MotionTool<
  {
    resume: string;
    jobDescription: string;
    requiredSkills: string[];
    preferredSkills?: string[];
    experienceLevel?: string;
  },
  {
    candidateProfile: {
      name: string;
      currentRole: string;
      yearsExperience: number;
      education: string;
      keySkills: string[];
    };
    matchScore: number;
    skillsAnalysis: {
      matched: string[];
      missing: string[];
      additional: string[];
    };
    strengths: string[];
    concerns: string[];
    recommendedQuestions: string[];
    recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
    reasoning: string;
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'screen_resume',
    displayName: 'Screen Resume',
    description: 'AI-powered resume screening and candidate analysis',
    category: 'analytics',
    creditCost: 75,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        resume: { type: 'string' },
        jobDescription: { type: 'string' },
        requiredSkills: { type: 'array', items: { type: 'string' } },
        preferredSkills: { type: 'array', items: { type: 'string' } },
        experienceLevel: { type: 'string' },
      },
      required: ['resume', 'jobDescription', 'requiredSkills'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        candidateProfile: {
          name: string;
          currentRole: string;
          yearsExperience: number;
          education: string;
          keySkills: string[];
        };
        matchScore: number;
        skillsAnalysis: { matched: string[]; missing: string[]; additional: string[] };
        strengths: string[];
        concerns: string[];
        recommendedQuestions: string[];
        recommendation: 'strong_yes' | 'yes' | 'maybe' | 'no';
        reasoning: string;
      }>({
        data: input,
        analysisType: 'resume_screening',
        outputSchema: {
          type: 'object',
          properties: {
            candidateProfile: { type: 'object' },
            matchScore: { type: 'number' },
            skillsAnalysis: { type: 'object' },
            strengths: { type: 'array' },
            concerns: { type: 'array' },
            recommendedQuestions: { type: 'array' },
            recommendation: { type: 'string' },
            reasoning: { type: 'string' },
          },
          required: ['candidateProfile', 'matchScore', 'skillsAnalysis', 'strengths', 'concerns', 'recommendation', 'reasoning'],
        },
      });
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

export function createDotEnterpriseJobDescriptionTool(): MotionTool<
  {
    title: string;
    department: string;
    level: string;
    responsibilities: string[];
    requirements: string[];
    benefits?: string[];
    companyInfo?: string;
    tone?: 'formal' | 'casual' | 'startup';
  },
  {
    jobDescription: {
      title: string;
      summary: string;
      aboutCompany: string;
      responsibilities: string[];
      requirements: { required: string[]; preferred: string[] };
      benefits: string[];
      applicationInstructions: string;
    };
    seoKeywords: string[];
    inclusivityScore: number;
    suggestions: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'create_job_description',
    displayName: 'Create Job Description',
    description: 'AI-powered job description generation with inclusivity analysis',
    category: 'document',
    creditCost: 100,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        department: { type: 'string' },
        level: { type: 'string' },
        responsibilities: { type: 'array', items: { type: 'string' } },
        requirements: { type: 'array', items: { type: 'string' } },
        benefits: { type: 'array', items: { type: 'string' } },
        companyInfo: { type: 'string' },
        tone: { type: 'string', enum: ['formal', 'casual', 'startup'] },
      },
      required: ['title', 'department', 'level', 'responsibilities', 'requirements'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<{
        jobDescription: {
          title: string;
          summary: string;
          aboutCompany: string;
          responsibilities: string[];
          requirements: { required: string[]; preferred: string[] };
          benefits: string[];
          applicationInstructions: string;
        };
        seoKeywords: string[];
        inclusivityScore: number;
        suggestions: string[];
      }>(
        `Create a job description:
Title: ${input.title}
Department: ${input.department}
Level: ${input.level}
Responsibilities: ${input.responsibilities.join(', ')}
Requirements: ${input.requirements.join(', ')}
Tone: ${input.tone || 'professional'}`,
        `You are an HR expert. Create compelling, inclusive job descriptions that attract diverse talent.`,
        {
          type: 'object',
          properties: {
            jobDescription: { type: 'object' },
            seoKeywords: { type: 'array' },
            inclusivityScore: { type: 'number' },
            suggestions: { type: 'array' },
          },
          required: ['jobDescription', 'seoKeywords', 'inclusivityScore', 'suggestions'],
        }
      );
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

// ============================================
// CLIDE (CUSTOMER SUCCESS) ENTERPRISE TOOLS
// ============================================

export function createClideEnterpriseChurnPredictionTool(): MotionTool<
  {
    customers: Array<{
      id: string;
      name: string;
      accountValue: number;
      lastLogin?: string;
      usageMetrics?: Record<string, number>;
      supportTickets?: number;
      npsScore?: number;
      contractEndDate?: string;
    }>;
    lookbackDays?: number;
  },
  {
    predictions: Array<{
      customerId: string;
      customerName: string;
      churnRisk: 'low' | 'medium' | 'high' | 'critical';
      churnProbability: number;
      riskFactors: string[];
      recommendedActions: string[];
      estimatedTimeToChurn: string;
    }>;
    summary: {
      totalAtRisk: number;
      revenueAtRisk: number;
      topRiskFactors: string[];
    };
    preventionStrategy: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'predict_churn',
    displayName: 'Predict Customer Churn',
    description: 'AI-powered churn prediction with intervention recommendations',
    category: 'analytics',
    creditCost: 100,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        customers: { type: 'array' },
        lookbackDays: { type: 'number' },
      },
      required: ['customers'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        predictions: Array<{
          customerId: string;
          customerName: string;
          churnRisk: 'low' | 'medium' | 'high' | 'critical';
          churnProbability: number;
          riskFactors: string[];
          recommendedActions: string[];
          estimatedTimeToChurn: string;
        }>;
        summary: { totalAtRisk: number; revenueAtRisk: number; topRiskFactors: string[] };
        preventionStrategy: string[];
      }>({
        data: input,
        analysisType: 'churn_prediction',
        outputSchema: {
          type: 'object',
          properties: {
            predictions: { type: 'array' },
            summary: { type: 'object' },
            preventionStrategy: { type: 'array' },
          },
          required: ['predictions', 'summary', 'preventionStrategy'],
        },
      });
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

export function createClideEnterpriseHealthScoreTool(): MotionTool<
  {
    customer: {
      id: string;
      name: string;
      contractValue: number;
      startDate: string;
      usageData: Record<string, number>;
      supportHistory: Array<{ type: string; resolved: boolean }>;
      engagementScore?: number;
      expansionHistory?: Array<{ date: string; amount: number }>;
    };
  },
  {
    healthScore: {
      overall: number;
      trend: 'improving' | 'stable' | 'declining';
      components: Array<{ name: string; score: number; weight: number; trend: string }>;
    };
    insights: string[];
    recommendations: Array<{ action: string; priority: 'high' | 'medium' | 'low'; expectedImpact: string }>;
    expansionOpportunities: string[];
    riskIndicators: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'calculate_health_score',
    displayName: 'Calculate Customer Health Score',
    description: 'AI-powered customer health scoring with recommendations',
    category: 'analytics',
    creditCost: 50,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        customer: { type: 'object' },
      },
      required: ['customer'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateScore({
        subject: 'customer health',
        criteria: [
          { name: 'Product Usage', weight: 30, description: 'Active usage of core features' },
          { name: 'Engagement', weight: 25, description: 'Interaction with success team' },
          { name: 'Support Health', weight: 20, description: 'Ticket volume and resolution' },
          { name: 'Growth Potential', weight: 15, description: 'Expansion indicators' },
          { name: 'Relationship', weight: 10, description: 'Executive sponsor engagement' },
        ],
        data: input.customer,
        maxScore: 100,
      });

      const recommendations = await motionAI.generateRecommendations({
        context: 'customer success improvement',
        data: { customer: input.customer, healthScore: result },
        focusAreas: ['engagement', 'expansion', 'risk mitigation'],
        maxRecommendations: 5,
      });

      return {
        healthScore: {
          overall: result.overallScore,
          trend: result.overallScore > 70 ? 'improving' : result.overallScore > 50 ? 'stable' : 'declining',
          components: result.criteriaScores.map((c) => ({
            name: c.criterion,
            score: c.score,
            weight: c.maxScore,
            trend: 'stable',
          })),
        },
        insights: [result.summary],
        recommendations: recommendations.recommendations.map((r) => ({
          action: r.description,
          priority: r.priority,
          expectedImpact: r.impact,
        })),
        expansionOpportunities: recommendations.recommendations
          .filter((r) => r.title.toLowerCase().includes('expand'))
          .map((r) => r.description),
        riskIndicators: result.criteriaScores
          .filter((c) => c.score < c.maxScore * 0.5)
          .map((c) => `Low ${c.criterion}: ${c.reasoning}`),
        metadata: { tokensUsed: recommendations.tokensUsed },
      };
    },
  };
}

// ============================================
// SPEC (MARKET RESEARCH) ENTERPRISE TOOLS
// ============================================

export function createSpecEnterpriseCompetitorAnalysisTool(): MotionTool<
  {
    competitors: Array<{ name: string; website?: string; description?: string }>;
    analysisAreas: string[];
    industry: string;
    ownCompany?: { name: string; description: string };
  },
  {
    competitorProfiles: Array<{
      name: string;
      overview: string;
      strengths: string[];
      weaknesses: string[];
      marketPosition: string;
      keyDifferentiators: string[];
      pricingStrategy: string;
      targetMarket: string;
    }>;
    marketLandscape: {
      leaders: string[];
      challengers: string[];
      niches: string[];
      trends: string[];
    };
    opportunities: string[];
    threats: string[];
    recommendations: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'analyze_competitors',
    displayName: 'Analyze Competitors',
    description: 'AI-powered competitive intelligence analysis',
    category: 'analytics',
    creditCost: 150,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        competitors: { type: 'array' },
        analysisAreas: { type: 'array', items: { type: 'string' } },
        industry: { type: 'string' },
        ownCompany: { type: 'object' },
      },
      required: ['competitors', 'analysisAreas', 'industry'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        competitorProfiles: Array<{
          name: string;
          overview: string;
          strengths: string[];
          weaknesses: string[];
          marketPosition: string;
          keyDifferentiators: string[];
          pricingStrategy: string;
          targetMarket: string;
        }>;
        marketLandscape: { leaders: string[]; challengers: string[]; niches: string[]; trends: string[] };
        opportunities: string[];
        threats: string[];
        recommendations: string[];
      }>({
        data: input,
        analysisType: 'competitive_analysis',
        outputSchema: {
          type: 'object',
          properties: {
            competitorProfiles: { type: 'array' },
            marketLandscape: { type: 'object' },
            opportunities: { type: 'array' },
            threats: { type: 'array' },
            recommendations: { type: 'array' },
          },
          required: ['competitorProfiles', 'marketLandscape', 'opportunities', 'threats', 'recommendations'],
        },
      });
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

export function createSpecEnterpriseMarketTrendsTool(): MotionTool<
  {
    industry: string;
    timeframe: string;
    focusAreas?: string[];
    geographies?: string[];
  },
  {
    trends: Array<{
      trend: string;
      description: string;
      impact: 'high' | 'medium' | 'low';
      timeline: string;
      opportunities: string[];
      risks: string[];
    }>;
    marketSize: { current: string; projected: string; cagr: string };
    keyDrivers: string[];
    emergingTechnologies: string[];
    regulatoryChanges: string[];
    recommendations: string[];
    metadata: { tokensUsed: number };
  }
> {
  return {
    name: 'analyze_market_trends',
    displayName: 'Analyze Market Trends',
    description: 'AI-powered market trend analysis and forecasting',
    category: 'analytics',
    creditCost: 125,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        industry: { type: 'string' },
        timeframe: { type: 'string' },
        focusAreas: { type: 'array', items: { type: 'string' } },
        geographies: { type: 'array', items: { type: 'string' } },
      },
      required: ['industry', 'timeframe'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<{
        trends: Array<{
          trend: string;
          description: string;
          impact: 'high' | 'medium' | 'low';
          timeline: string;
          opportunities: string[];
          risks: string[];
        }>;
        marketSize: { current: string; projected: string; cagr: string };
        keyDrivers: string[];
        emergingTechnologies: string[];
        regulatoryChanges: string[];
        recommendations: string[];
      }>({
        data: input,
        analysisType: 'market_trend_analysis',
        outputSchema: {
          type: 'object',
          properties: {
            trends: { type: 'array' },
            marketSize: { type: 'object' },
            keyDrivers: { type: 'array' },
            emergingTechnologies: { type: 'array' },
            regulatoryChanges: { type: 'array' },
            recommendations: { type: 'array' },
          },
          required: ['trends', 'marketSize', 'keyDrivers', 'emergingTechnologies', 'recommendations'],
        },
      });
      return { ...result.result, metadata: { tokensUsed: result.tokensUsed } };
    },
  };
}

// ============================================
// EXPORTS
// ============================================

// Chip (Sales) Tools
export function getAllChipEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createChipEnterpriseLeadScoringTool(),
    createChipEnterpriseProposalTool(),
    createChipEnterprisePipelineAnalysisTool(),
  ];
}

// Dot (HR/Recruiting) Tools
export function getAllDotEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createDotEnterpriseScreenResumeTool(),
    createDotEnterpriseJobDescriptionTool(),
  ];
}

// Clide (Customer Success) Tools
export function getAllClideEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createClideEnterpriseChurnPredictionTool(),
    createClideEnterpriseHealthScoreTool(),
  ];
}

// Spec (Market Research) Tools
export function getAllSpecEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createSpecEnterpriseCompetitorAnalysisTool(),
    createSpecEnterpriseMarketTrendsTool(),
  ];
}

export default {
  chip: getAllChipEnterpriseTools,
  dot: getAllDotEnterpriseTools,
  clide: getAllClideEnterpriseTools,
  spec: getAllSpecEnterpriseTools,
};
