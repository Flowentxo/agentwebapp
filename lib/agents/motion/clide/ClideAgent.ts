/**
 * ClideAgent - Client Success Manager AI Agent
 *
 * Inspired by Usemotion's Clide AI Employee
 * Ensures client satisfaction, prevents churn, and drives account growth
 *
 * Features:
 * - Client Health Monitoring
 * - Churn Risk Detection
 * - Onboarding & Success Planning
 * - Upsell Opportunity Identification
 */

import { Heart } from 'lucide-react';
import { MotionBaseAgent } from '../shared/MotionBaseAgent';
import { AgentContext, AgentResponse, ConversationMessage } from '@/lib/agents/shared/types';
import {
  MotionAgentContext,
  MotionTool,
  MotionAgentId,
  AgentCategory,
} from '../shared/types';
import {
  // Client Health
  CalculateHealthScoreInput,
  CalculateHealthScoreOutput,
  IdentifyChurnRiskInput,
  IdentifyChurnRiskOutput,
  AnalyzeUsagePatternsInput,
  AnalyzeUsagePatternsOutput,
  GenerateQbrReportInput,
  GenerateQbrReportOutput,
  // Communication
  DraftCheckInEmailInput,
  DraftCheckInEmailOutput,
  CreateOnboardingPlanInput,
  CreateOnboardingPlanOutput,
  RespondToFeedbackInput,
  RespondToFeedbackOutput,
  // Growth
  IdentifyUpsellOpportunitiesInput,
  IdentifyUpsellOpportunitiesOutput,
  CreateSuccessPlanInput,
  CreateSuccessPlanOutput,
  // Analytics
  AnalyzeNpsFeedbackInput,
  AnalyzeNpsFeedbackOutput,
  GenerateRetentionReportInput,
  GenerateRetentionReportOutput,
} from './types';

// ============================================
// CLIDE AGENT CLASS
// ============================================

export class ClideAgent extends MotionBaseAgent {
  readonly id = 'clide';
  readonly name = 'Clide';
  readonly description = 'A dedicated client success manager who ensures customer satisfaction, handles support, and drives retention.';
  readonly version = '1.0.0';
  readonly category = 'support';
  readonly icon = 'Heart';
  readonly color = '#EF4444';

  readonly motionId: MotionAgentId = 'clide';
  readonly role = 'Client Success Manager';
  readonly agentCategory: AgentCategory = 'support';
  readonly specialties = [
    'Client Onboarding',
    'Health Score Monitoring',
    'Churn Prevention',
    'Upsell Identification',
    'Customer Feedback Analysis',
    'Success Metrics Tracking',
  ];
  readonly lucideIcon = Heart;

  protected creditMultiplier = 1.0;

  constructor() {
    super();
    this.registerMotionTools();
  }

  protected registerTools(): void {}

  protected registerMotionTools(): void {
    // Client Health Tools
    this.registerMotionTool(this.createCalculateHealthScoreTool());
    this.registerMotionTool(this.createIdentifyChurnRiskTool());
    this.registerMotionTool(this.createAnalyzeUsagePatternsTool());
    this.registerMotionTool(this.createGenerateQbrReportTool());

    // Communication Tools
    this.registerMotionTool(this.createDraftCheckInEmailTool());
    this.registerMotionTool(this.createOnboardingPlanTool());
    this.registerMotionTool(this.createRespondToFeedbackTool());

    // Growth Tools
    this.registerMotionTool(this.createIdentifyUpsellOpportunitiesTool());
    this.registerMotionTool(this.createSuccessPlanTool());

    // Analytics Tools
    this.registerMotionTool(this.createAnalyzeNpsFeedbackTool());
    this.registerMotionTool(this.createGenerateRetentionReportTool());
  }

  // ============================================
  // CLIENT HEALTH TOOLS
  // ============================================

  private createCalculateHealthScoreTool(): MotionTool<CalculateHealthScoreInput, CalculateHealthScoreOutput> {
    return {
      name: 'calculate_health_score',
      displayName: 'Calculate Health Score',
      description: 'Calculate comprehensive client health score based on multiple metrics',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          clientName: { type: 'string' },
          metrics: { type: 'object' },
          historicalData: { type: 'object' },
        },
        required: ['clientId', 'metrics'],
      },
      execute: async (input, context) => {
        const { metrics } = input;

        // Calculate component scores
        const engagementScore = Math.min(100, metrics.loginFrequency * 5);
        const adoptionScore = metrics.featureAdoption;
        const supportScore = Math.max(0, 100 - metrics.supportTickets * 10);
        const sentimentScore = metrics.npsScore ? (metrics.npsScore + 100) / 2 : 70;
        const growthScore = metrics.activeUsers && metrics.totalLicenses
          ? (metrics.activeUsers / metrics.totalLicenses) * 100 : 75;

        const overallScore = Math.round(
          engagementScore * 0.25 +
          adoptionScore * 0.25 +
          supportScore * 0.2 +
          sentimentScore * 0.15 +
          growthScore * 0.15
        );

        const previousScore = input.historicalData?.previousHealthScore;
        const trend = !previousScore ? 'stable' : overallScore > previousScore + 5 ? 'improving' : overallScore < previousScore - 5 ? 'declining' : 'stable';
        const riskLevel = overallScore >= 80 ? 'low' : overallScore >= 60 ? 'medium' : overallScore >= 40 ? 'high' : 'critical';

        return {
          overallScore,
          components: {
            engagement: { score: engagementScore, breakdown: `${metrics.loginFrequency} logins/month` },
            adoption: { score: adoptionScore, breakdown: `${metrics.featureAdoption}% feature adoption` },
            support: { score: supportScore, breakdown: `${metrics.supportTickets} open tickets` },
            sentiment: { score: sentimentScore, breakdown: metrics.npsScore ? `NPS: ${metrics.npsScore}` : 'No NPS data' },
            growth: { score: growthScore, breakdown: `${metrics.activeUsers || 'N/A'}/${metrics.totalLicenses || 'N/A'} active users` },
          },
          trend,
          trendDetails: trend === 'improving' ? 'Health improved since last review' : trend === 'declining' ? 'Health has decreased - attention needed' : 'Health is stable',
          riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical',
          recommendedActions: riskLevel === 'critical' ? [
            { action: 'Schedule executive sponsor call immediately', priority: 'high', expectedImpact: 'Address concerns at highest level' },
            { action: 'Create intervention plan', priority: 'high', expectedImpact: 'Structured approach to recovery' },
          ] : riskLevel === 'high' ? [
            { action: 'Schedule check-in call this week', priority: 'high', expectedImpact: 'Understand concerns early' },
            { action: 'Review support tickets for patterns', priority: 'medium', expectedImpact: 'Identify systemic issues' },
          ] : [
            { action: 'Schedule regular QBR', priority: 'medium', expectedImpact: 'Maintain relationship' },
          ],
          alertTriggers: riskLevel !== 'low' ? [`Risk level: ${riskLevel}`, `${metrics.daysSinceLastContact} days since last contact`] : [],
          nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      },
    };
  }

  private createIdentifyChurnRiskTool(): MotionTool<IdentifyChurnRiskInput, IdentifyChurnRiskOutput> {
    return {
      name: 'identify_churn_risk',
      displayName: 'Identify Churn Risk',
      description: 'Analyze client data to identify churn risk and recommended interventions',
      category: 'analytics',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          clientName: { type: 'string' },
          lookbackDays: { type: 'number' },
          currentMetrics: { type: 'object' },
        },
        required: ['clientId', 'currentMetrics'],
      },
      execute: async (input, context) => {
        const { currentMetrics } = input;
        const riskFactors = [];
        let riskScore = 0;

        if (currentMetrics.daysSinceLastLogin && currentMetrics.daysSinceLastLogin > 14) {
          riskScore += 25;
          riskFactors.push({ factor: 'Low engagement', impact: 'high' as const, evidence: `${currentMetrics.daysSinceLastLogin} days since last login`, weight: 25 });
        }

        if (currentMetrics.usageDecline && currentMetrics.usageDecline > 30) {
          riskScore += 20;
          riskFactors.push({ factor: 'Usage decline', impact: 'high' as const, evidence: `${currentMetrics.usageDecline}% decline in usage`, weight: 20 });
        }

        if (currentMetrics.npsScore && currentMetrics.npsScore < 0) {
          riskScore += 15;
          riskFactors.push({ factor: 'Negative sentiment', impact: 'medium' as const, evidence: `NPS score: ${currentMetrics.npsScore}`, weight: 15 });
        }

        if (currentMetrics.recentTicketVolume && currentMetrics.recentTicketVolume > 5) {
          riskScore += 10;
          riskFactors.push({ factor: 'High support volume', impact: 'medium' as const, evidence: `${currentMetrics.recentTicketVolume} recent tickets`, weight: 10 });
        }

        const riskLevel = riskScore >= 50 ? 'critical' : riskScore >= 35 ? 'high' : riskScore >= 20 ? 'medium' : 'low';
        const renewalProbability = Math.max(10, 100 - riskScore);

        return {
          riskScore,
          riskLevel: riskLevel as 'low' | 'medium' | 'high' | 'critical',
          riskFactors,
          earlyWarningSignals: riskFactors.map(f => f.evidence),
          recommendedInterventions: [
            { action: 'Executive sponsor outreach', priority: 1, timing: 'Within 24 hours', expectedImpact: 'Build executive relationship', owner: 'CSM' },
            { action: 'Value realization workshop', priority: 2, timing: 'This week', expectedImpact: 'Demonstrate ROI', owner: 'CSM' },
            { action: 'Technical review', priority: 3, timing: 'Next week', expectedImpact: 'Resolve technical blockers', owner: 'Solutions' },
          ],
          renewalProbability,
          saveabilityScore: riskScore < 70 ? 80 : 50,
          comparableCases: ['Similar account saved with executive outreach', 'Comparable situation resolved with success plan'],
        };
      },
    };
  }

  private createAnalyzeUsagePatternsTool(): MotionTool<AnalyzeUsagePatternsInput, AnalyzeUsagePatternsOutput> {
    return {
      name: 'analyze_usage_patterns',
      displayName: 'Analyze Usage Patterns',
      description: 'Analyze client usage patterns to identify opportunities and concerns',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          period: { type: 'string', enum: ['week', 'month', 'quarter', 'year'] },
          features: { type: 'array', items: { type: 'string' } },
          compareToBaseline: { type: 'boolean' },
        },
        required: ['clientId', 'period'],
      },
      execute: async (input, context) => {
        const features = input.features || ['Dashboard', 'Reports', 'API', 'Integrations', 'Admin'];

        return {
          summary: {
            overallUsage: 'Moderate',
            trend: 'stable',
            changePercentage: 5,
          },
          featureUsage: features.map((feature, i) => ({
            feature,
            usageCount: 100 - i * 15,
            uniqueUsers: 10 - i,
            trend: i < 2 ? 'up' : 'stable',
            percentOfTotal: Math.round((100 - i * 15) / 5),
          })) as AnalyzeUsagePatternsOutput['featureUsage'],
          userSegments: [
            { segment: 'Power Users', userCount: 5, avgUsage: 'Daily', behavior: 'Use all features extensively' },
            { segment: 'Regular Users', userCount: 15, avgUsage: 'Weekly', behavior: 'Focus on core features' },
            { segment: 'Light Users', userCount: 10, avgUsage: 'Monthly', behavior: 'Occasional usage' },
          ],
          unusedFeatures: ['Advanced Analytics', 'Custom Workflows'],
          adoptionOpportunities: [
            { feature: 'Advanced Analytics', currentAdoption: 10, potentialValue: 'Increased insights', recommendation: 'Schedule training session' },
            { feature: 'Custom Workflows', currentAdoption: 5, potentialValue: 'Time savings', recommendation: 'Demo to key users' },
          ],
          peakUsageTimes: ['Tuesday 10 AM', 'Wednesday 2 PM', 'Thursday 11 AM'],
          insights: [
            'Power users drive majority of value',
            'Mobile usage increasing',
            'API usage indicates technical maturity',
          ],
          recommendations: [
            'Create power user community',
            'Onboard light users to core features',
            'Promote unused features through in-app messaging',
          ],
        };
      },
    };
  }

  private createGenerateQbrReportTool(): MotionTool<GenerateQbrReportInput, GenerateQbrReportOutput> {
    return {
      name: 'generate_qbr_report',
      displayName: 'Generate QBR Report',
      description: 'Generate comprehensive Quarterly Business Review report',
      category: 'document',
      creditCost: 150,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          clientName: { type: 'string' },
          quarterPeriod: { type: 'string' },
          includeExecutiveSummary: { type: 'boolean' },
          metrics: { type: 'object' },
        },
        required: ['clientId', 'clientName', 'quarterPeriod'],
      },
      execute: async (input, context) => {
        const { clientName, quarterPeriod, metrics } = input;

        return {
          reportTitle: `Quarterly Business Review - ${clientName} - ${quarterPeriod}`,
          executiveSummary: `${clientName} has shown strong engagement this quarter with ${metrics?.adoption || 75}% feature adoption and ${metrics?.userGrowth || 10}% user growth. We continue to see value realization and recommend expanding usage of advanced features.`,
          sections: [
            { title: 'Usage Overview', content: 'Platform usage remained strong with daily active users increasing.', metrics: { 'Daily Active Users': '+15%', 'Feature Adoption': `${metrics?.adoption || 75}%` } },
            { title: 'Support Summary', content: `${metrics?.supportTickets || 3} support tickets this quarter, all resolved within SLA.`, metrics: { 'Tickets': String(metrics?.supportTickets || 3), 'Resolution Time': '4 hours avg' } },
            { title: 'Value Delivered', content: 'Significant ROI achieved through automation and efficiency gains.', metrics: { 'ROI': `${metrics?.roi || 150}%`, 'Time Saved': '40 hours/month' } },
          ],
          achievements: metrics?.keyMilestones || ['Completed integration', 'Onboarded new team', 'Achieved adoption milestone'],
          challenges: ['Initial learning curve for new users', 'Need for additional training'],
          recommendations: ['Expand to additional departments', 'Implement advanced workflows', 'Schedule admin training'],
          successStories: ['Reduced manual processes by 60%', 'Improved team collaboration'],
          roadmapPreview: ['New dashboard features in Q1', 'API enhancements coming', 'Mobile app improvements'],
          actionItems: [
            { item: 'Schedule training for new features', owner: 'CSM', dueDate: 'Next 2 weeks', status: 'pending' },
            { item: 'Review expansion opportunity', owner: 'AE', dueDate: 'End of month', status: 'pending' },
          ],
          nextQbrDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        };
      },
    };
  }

  // ============================================
  // COMMUNICATION TOOLS
  // ============================================

  private createDraftCheckInEmailTool(): MotionTool<DraftCheckInEmailInput, DraftCheckInEmailOutput> {
    return {
      name: 'draft_check_in_email',
      displayName: 'Draft Check-in Email',
      description: 'Create personalized check-in emails based on client situation',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          contactName: { type: 'string' },
          checkInReason: { type: 'string', enum: ['regular', 'concern', 'celebration', 'renewal', 'onboarding_progress'] },
          lastInteraction: { type: 'string' },
          specificTopics: { type: 'array', items: { type: 'string' } },
          tone: { type: 'string', enum: ['formal', 'friendly', 'concerned'] },
        },
        required: ['clientName', 'contactName', 'checkInReason', 'tone'],
      },
      execute: async (input, context) => {
        const { contactName, clientName, checkInReason, tone } = input;

        const subjects: Record<string, string> = {
          regular: `Checking in - ${clientName}`,
          concern: `Let's connect - ${clientName}`,
          celebration: `Congratulations! - ${clientName}`,
          renewal: `Upcoming renewal - ${clientName}`,
          onboarding_progress: `Your progress with ${clientName}`,
        };

        const bodies: Record<string, string> = {
          regular: `Hi ${contactName},\n\nI wanted to check in and see how things are going with ${clientName}. Is there anything I can help with?\n\nBest,\n[Your name]`,
          concern: `Hi ${contactName},\n\nI noticed some changes in your usage patterns and wanted to reach out to see if there's anything we can help with. Would you have time for a quick call this week?\n\nBest,\n[Your name]`,
          celebration: `Hi ${contactName},\n\nI just wanted to say congratulations on [achievement]! It's been great seeing ${clientName}'s success.\n\nBest,\n[Your name]`,
          renewal: `Hi ${contactName},\n\nYour renewal is coming up and I wanted to discuss how we can continue supporting ${clientName}'s success. Can we schedule a call?\n\nBest,\n[Your name]`,
          onboarding_progress: `Hi ${contactName},\n\nGreat progress on your onboarding! I wanted to check in and see how the team is feeling about the platform.\n\nBest,\n[Your name]`,
        };

        return {
          subject: subjects[checkInReason],
          body: bodies[checkInReason],
          callToAction: 'Would you have 15 minutes for a quick call this week?',
          variants: [bodies[checkInReason], bodies[checkInReason].replace('check in', 'touch base')],
          followUpPlan: {
            noResponseAction: 'Send follow-up email',
            noResponseTiming: '3 business days',
          },
          attachmentSuggestions: checkInReason === 'renewal' ? ['Renewal proposal', 'Value summary'] : [],
          bestSendTime: 'Tuesday 10 AM local time',
        };
      },
    };
  }

  private createOnboardingPlanTool(): MotionTool<CreateOnboardingPlanInput, CreateOnboardingPlanOutput> {
    return {
      name: 'create_onboarding_plan',
      displayName: 'Create Onboarding Plan',
      description: 'Create comprehensive client onboarding plan',
      category: 'document',
      creditCost: 100,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          contractValue: { type: 'string' },
          productPackage: { type: 'string' },
          stakeholders: { type: 'array', items: { type: 'object' } },
          goals: { type: 'array', items: { type: 'string' } },
          timeline: { type: 'number' },
          complexity: { type: 'string', enum: ['simple', 'standard', 'complex', 'enterprise'] },
        },
        required: ['clientName', 'productPackage', 'stakeholders', 'goals', 'timeline', 'complexity'],
      },
      execute: async (input, context) => {
        const { clientName, timeline, complexity, goals } = input;
        const phases = complexity === 'enterprise' ? 4 : complexity === 'complex' ? 3 : 2;

        return {
          planName: `${clientName} Onboarding Plan`,
          totalDuration: `${timeline} days`,
          phases: Array(phases).fill(null).map((_, i) => ({
            name: ['Discovery & Setup', 'Configuration', 'Training', 'Go-Live'][i],
            duration: `${Math.round(timeline / phases)} days`,
            objectives: [`Complete ${['setup', 'config', 'training', 'launch'][i]}`],
            tasks: [
              { task: `Phase ${i + 1} task 1`, owner: 'csm', dueDate: 'Week 1', dependencies: [] },
              { task: `Phase ${i + 1} task 2`, owner: 'client', dueDate: 'Week 2', dependencies: [`Phase ${i + 1} task 1`] },
            ] as CreateOnboardingPlanOutput['phases'][0]['tasks'],
            milestones: [`Phase ${i + 1} complete`],
            successCriteria: [`${['Setup', 'Configuration', 'Training', 'Launch'][i]} verified`],
          })),
          kickoffAgenda: ['Introductions', 'Goals review', 'Timeline walkthrough', 'Q&A'],
          trainingPlan: [
            { topic: 'Platform basics', audience: 'All users', format: 'Webinar', duration: '1 hour' },
            { topic: 'Admin training', audience: 'Admins', format: '1:1', duration: '2 hours' },
          ],
          successMetrics: goals.map(goal => ({
            metric: goal,
            target: 'TBD',
            measurementMethod: 'Monthly review',
          })),
          riskMitigation: [
            { risk: 'Resource availability', mitigation: 'Identify backup contacts' },
            { risk: 'Technical blockers', mitigation: 'Escalation path defined' },
          ],
          communicationPlan: ['Weekly status calls', 'Bi-weekly stakeholder updates', 'Monthly exec summary'],
        };
      },
    };
  }

  private createRespondToFeedbackTool(): MotionTool<RespondToFeedbackInput, RespondToFeedbackOutput> {
    return {
      name: 'respond_to_feedback',
      displayName: 'Respond to Feedback',
      description: 'Create appropriate response to client feedback',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          feedbackType: { type: 'string', enum: ['complaint', 'suggestion', 'praise', 'question', 'nps_response'] },
          feedbackContent: { type: 'string' },
          urgency: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        },
        required: ['clientName', 'feedbackType', 'feedbackContent', 'urgency'],
      },
      execute: async (input, context) => {
        const { clientName, feedbackType, feedbackContent, urgency } = input;
        const escalate = urgency === 'critical' || feedbackType === 'complaint';

        return {
          responseEmail: {
            subject: `Re: Your feedback - ${clientName}`,
            body: feedbackType === 'complaint'
              ? `Thank you for sharing your concerns. We take this seriously and will address it immediately. Let me schedule a call to discuss.`
              : feedbackType === 'praise'
              ? `Thank you so much for the kind words! We're thrilled to hear about your success.`
              : `Thank you for your feedback. We appreciate you taking the time to share your thoughts.`,
          },
          internalNotes: `Feedback from ${clientName}: ${feedbackType} - ${feedbackContent}`,
          escalationNeeded: escalate,
          escalationDetails: escalate ? {
            to: 'Customer Success Manager',
            reason: `${urgency} ${feedbackType} requires immediate attention`,
            suggestedAction: 'Schedule call within 24 hours',
          } : undefined,
          followUpActions: [
            { action: 'Log feedback in CRM', owner: 'CSM', timing: 'Immediately' },
            { action: 'Schedule follow-up', owner: 'CSM', timing: '1 week' },
          ],
          categoryTags: [feedbackType, urgency],
          sentimentAnalysis: {
            sentiment: feedbackType === 'complaint' ? 'negative' : feedbackType === 'praise' ? 'positive' : 'neutral',
            intensity: urgency === 'critical' ? 'high' : 'medium',
            keyThemes: ['Product feedback'],
          },
        };
      },
    };
  }

  // ============================================
  // GROWTH TOOLS
  // ============================================

  private createIdentifyUpsellOpportunitiesTool(): MotionTool<IdentifyUpsellOpportunitiesInput, IdentifyUpsellOpportunitiesOutput> {
    return {
      name: 'identify_upsell_opportunities',
      displayName: 'Identify Upsell Opportunities',
      description: 'Analyze client data to identify expansion opportunities',
      category: 'analytics',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientId: { type: 'string' },
          clientName: { type: 'string' },
          currentProducts: { type: 'array', items: { type: 'string' } },
          usageData: { type: 'object' },
          contractDetails: { type: 'object' },
        },
        required: ['clientId', 'clientName', 'currentProducts', 'contractDetails'],
      },
      execute: async (input, context) => {
        const { clientName, usageData, contractDetails } = input;

        return {
          opportunities: [
            {
              product: 'Premium Tier',
              reason: usageData?.featureLimitsHit?.length ? 'Hitting feature limits' : 'Power user behavior',
              estimatedValue: contractDetails.value * 0.5,
              confidence: 'high',
              bestTiming: 'Next QBR',
              stakeholder: 'VP Operations',
              talkingPoints: ['Increased limits', 'Advanced features', 'Priority support'],
            },
            {
              product: 'Additional Seats',
              reason: 'User growth potential',
              estimatedValue: contractDetails.value * 0.3,
              confidence: 'medium',
              bestTiming: 'Q1 planning',
              stakeholder: 'HR Lead',
              talkingPoints: ['Team expansion', 'Onboarding efficiency', 'Volume discount'],
            },
          ],
          expansionPotential: {
            score: 75,
            analysis: `${clientName} shows strong expansion potential based on usage patterns and engagement`,
          },
          crossSellOpportunities: [
            { product: 'Training Package', fit: 'New team members', approach: 'Bundle with renewal' },
          ],
          recommendedApproach: 'Start with value review, transition to expansion discussion',
          objectionHandling: [
            { objection: 'Budget constraints', response: 'Demonstrate ROI and phased approach' },
            { objection: 'Need more time', response: 'Show current usage and future needs' },
          ],
          timeline: 'Initiate discussion 60 days before renewal',
        };
      },
    };
  }

  private createSuccessPlanTool(): MotionTool<CreateSuccessPlanInput, CreateSuccessPlanOutput> {
    return {
      name: 'create_success_plan',
      displayName: 'Create Success Plan',
      description: 'Create comprehensive success plan for client',
      category: 'document',
      creditCost: 100,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          clientName: { type: 'string' },
          clientGoals: { type: 'array', items: { type: 'string' } },
          currentChallenges: { type: 'array', items: { type: 'string' } },
          stakeholders: { type: 'array', items: { type: 'object' } },
          timeline: { type: 'number' },
        },
        required: ['clientName', 'clientGoals', 'currentChallenges', 'stakeholders', 'timeline'],
      },
      execute: async (input, context) => {
        const { clientName, clientGoals, timeline } = input;

        return {
          planTitle: `${clientName} Success Plan`,
          executiveSummary: `This plan outlines the path to achieving ${clientName}'s key objectives over the next ${timeline} months.`,
          objectives: clientGoals.map((goal, i) => ({
            objective: goal,
            keyResults: [`Achieve ${goal}`, 'Measure and track progress', 'Report on outcomes'],
            timeline: `Month ${Math.ceil((i + 1) * (timeline / clientGoals.length))}`,
            owner: 'CSM',
          })),
          milestones: clientGoals.map((goal, i) => ({
            milestone: `Complete: ${goal}`,
            targetDate: new Date(Date.now() + (i + 1) * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            successCriteria: ['Stakeholder sign-off', 'Metrics achieved'],
            dependencies: i > 0 ? [clientGoals[i - 1]] : [],
          })),
          actionPlan: [
            { phase: 'Foundation', actions: ['Define metrics', 'Align stakeholders'], duration: '1 month' },
            { phase: 'Execution', actions: ['Implement changes', 'Track progress'], duration: `${timeline - 2} months` },
            { phase: 'Review', actions: ['Measure outcomes', 'Plan next phase'], duration: '1 month' },
          ],
          riskAssessment: [
            { risk: 'Resource constraints', likelihood: 'medium', impact: 'medium', mitigation: 'Identify alternatives early' },
          ],
          communicationCadence: {
            checkIns: 'Bi-weekly calls',
            reviews: 'Monthly business reviews',
            escalations: '24-hour response time',
          },
          successMetrics: clientGoals.map(goal => ({
            metric: goal,
            baseline: 'Current state',
            target: 'Goal achievement',
            measurementFrequency: 'Monthly',
          })),
        };
      },
    };
  }

  // ============================================
  // ANALYTICS TOOLS
  // ============================================

  private createAnalyzeNpsFeedbackTool(): MotionTool<AnalyzeNpsFeedbackInput, AnalyzeNpsFeedbackOutput> {
    return {
      name: 'analyze_nps_feedback',
      displayName: 'Analyze NPS Feedback',
      description: 'Analyze NPS responses and extract actionable insights',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          responses: { type: 'array', items: { type: 'object' } },
          period: { type: 'string', enum: ['month', 'quarter', 'year'] },
          comparePrevious: { type: 'boolean' },
        },
        required: ['responses', 'period'],
      },
      execute: async (input, context) => {
        const { responses } = input;
        const promoters = responses.filter(r => r.score >= 9);
        const passives = responses.filter(r => r.score >= 7 && r.score < 9);
        const detractors = responses.filter(r => r.score < 7);

        const nps = Math.round((promoters.length / responses.length - detractors.length / responses.length) * 100);

        return {
          overallNps: nps,
          breakdown: {
            promoters: { count: promoters.length, percentage: Math.round((promoters.length / responses.length) * 100) },
            passives: { count: passives.length, percentage: Math.round((passives.length / responses.length) * 100) },
            detractors: { count: detractors.length, percentage: Math.round((detractors.length / responses.length) * 100) },
          },
          trend: { direction: 'stable', change: 0 },
          themes: [
            { theme: 'Product quality', sentiment: 'positive', frequency: 5, exampleQuotes: ['Great product!'] },
            { theme: 'Support response', sentiment: 'positive', frequency: 3, exampleQuotes: ['Quick support'] },
          ],
          actionableInsights: [
            'Promoters cite product quality most often',
            'Detractors mention pricing concerns',
          ],
          recommendedActions: [
            { action: 'Follow up with detractors', impactedSegment: 'Detractors', priority: 'high' },
            { action: 'Ask promoters for referrals', impactedSegment: 'Promoters', priority: 'medium' },
          ],
        };
      },
    };
  }

  private createGenerateRetentionReportTool(): MotionTool<GenerateRetentionReportInput, GenerateRetentionReportOutput> {
    return {
      name: 'generate_retention_report',
      displayName: 'Generate Retention Report',
      description: 'Generate comprehensive retention and churn analysis report',
      category: 'document',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['month', 'quarter', 'year'] },
          cohortAnalysis: { type: 'boolean' },
          includeForecasting: { type: 'boolean' },
          segments: { type: 'array', items: { type: 'string' } },
        },
        required: ['period'],
      },
      execute: async (input, context) => {
        return {
          summary: {
            retentionRate: 92,
            churnRate: 8,
            netRevenue: 1500000,
            mrrChange: 50000,
          },
          retentionBySegment: [
            { segment: 'Enterprise', retentionRate: 95, churnRate: 5, revenue: 800000, trend: 'up' },
            { segment: 'SMB', retentionRate: 88, churnRate: 12, revenue: 700000, trend: 'stable' },
          ],
          churnAnalysis: {
            churned: 5,
            revenue: 120000,
            topReasons: [
              { reason: 'Budget cuts', count: 2, percentage: 40 },
              { reason: 'Competitor', count: 1, percentage: 20 },
              { reason: 'Merger', count: 2, percentage: 40 },
            ],
            preventableChurn: 60,
          },
          atRiskAccounts: [
            { accountName: 'Acme Corp', riskScore: 75, reason: 'Low engagement', recommendedAction: 'Schedule check-in' },
          ],
          cohortAnalysis: input.cohortAnalysis ? [
            { cohort: 'Q1 2024', month1: 100, month3: 95, month6: 92, month12: 88 },
            { cohort: 'Q2 2024', month1: 100, month3: 94, month6: 90, month12: 0 },
          ] : undefined,
          forecast: input.includeForecasting ? {
            nextPeriod: 91,
            confidence: 85,
            factors: ['Seasonality', 'Market trends'],
          } : undefined,
          recommendations: [
            'Focus on SMB engagement',
            'Implement early warning system',
            'Increase touchpoints with at-risk accounts',
          ],
        };
      },
    };
  }

  // ============================================
  // CHAT HANDLING
  // ============================================

  public async handleChat(
    message: string,
    context: AgentContext,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse<string>> {
    const startTime = Date.now();

    try {
      const response = `As Clide, your Client Success Manager, I'm here to help you keep customers happy and growing!

Based on your message: "${message}"

I can help you with:
💚 **Client Health** - Calculate health scores, identify churn risk, analyze usage
📧 **Communication** - Draft check-ins, onboarding plans, feedback responses
📈 **Growth** - Find upsell opportunities, create success plans
📊 **Analytics** - Analyze NPS feedback, generate retention reports

What would you like to work on today?`;

      return {
        success: true,
        data: response,
        metadata: { agentId: this.id, executionTimeMs: Date.now() - startTime, toolsUsed: [], correlationId: crypto.randomUUID() },
      };
    } catch (error) {
      return {
        success: false,
        error: { code: 'EXECUTION_FAILED', message: error instanceof Error ? error.message : String(error), retryable: false },
        metadata: { agentId: this.id, executionTimeMs: Date.now() - startTime },
      };
    }
  }

  public getSystemPrompt(): string {
    return `You are Clide, an expert Client Success Manager AI.

YOUR ROLE:
- Ensure client satisfaction and success
- Monitor and improve client health
- Prevent churn through proactive engagement
- Identify growth opportunities
- Build lasting client relationships

YOUR PERSONALITY:
- Empathetic and caring
- Proactive problem solver
- Data-driven decision maker
- Relationship builder

GUIDELINES:
1. Put client success first
2. Be proactive, not reactive
3. Use data to identify issues early
4. Celebrate client wins
5. Always follow up on commitments`;
  }

  protected async getAgentSpecificContext(context: MotionAgentContext): Promise<Record<string, unknown>> {
    return { agentRole: 'Client Success Manager', availableTools: this.getMotionTools().map(t => t.name) };
  }
}

export const clideAgent = new ClideAgent();
export default ClideAgent;
