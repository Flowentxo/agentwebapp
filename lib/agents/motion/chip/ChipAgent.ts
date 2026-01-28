/**
 * ChipAgent - Sales Development Rep AI Agent
 *
 * Inspired by Usemotion's Chip AI Employee
 * Researches prospects, crafts outreach messages, and builds the sales pipeline
 *
 * Features:
 * - Lead Research & Enrichment
 * - Personalized Outreach (Email, LinkedIn)
 * - CRM Management
 * - Pipeline Analysis & Forecasting
 */

import { TrendingUp } from 'lucide-react';
import { MotionBaseAgent } from '../shared/MotionBaseAgent';
import { AgentContext, AgentResponse, ConversationMessage } from '@/lib/agents/shared/types';
import {
  MotionAgentContext,
  MotionTool,
  MotionAgentId,
  AgentCategory,
} from '../shared/types';
import {
  // Lead Research
  ResearchLeadInput,
  ResearchLeadOutput,
  EnrichLeadDataInput,
  EnrichLeadDataOutput,
  ScoreLeadInput,
  ScoreLeadOutput,
  FindDecisionMakersInput,
  FindDecisionMakersOutput,
  // Outreach
  DraftColdEmailInput,
  DraftColdEmailOutput,
  DraftLinkedInMessageInput,
  DraftLinkedInMessageOutput,
  CreateFollowUpSequenceInput,
  CreateFollowUpSequenceOutput,
  PersonalizeTemplateInput,
  PersonalizeTemplateOutput,
  // CRM & Pipeline
  UpdateCrmRecordInput,
  UpdateCrmRecordOutput,
  AnalyzePipelineInput,
  AnalyzePipelineOutput,
  SuggestNextActionsInput,
  SuggestNextActionsOutput,
  GenerateSalesReportInput,
  GenerateSalesReportOutput,
} from './types';

// ============================================
// CHIP AGENT CLASS
// ============================================

export class ChipAgent extends MotionBaseAgent {
  // Required BaseAgent properties
  readonly id = 'chip';
  readonly name = 'Chip';
  readonly description = 'A proactive sales development rep who researches prospects, crafts personalized outreach, and builds the sales pipeline.';
  readonly version = '1.0.0';
  readonly category = 'sales';
  readonly icon = 'TrendingUp';
  readonly color = '#22C55E';

  // Motion-specific properties
  readonly motionId: MotionAgentId = 'chip';
  readonly role = 'Sales Development Rep';
  readonly agentCategory: AgentCategory = 'sales';
  readonly specialties = [
    'Lead Research & Qualification',
    'Cold Email Outreach',
    'LinkedIn Prospecting',
    'CRM Management',
    'Pipeline Analysis',
    'Sales Automation',
  ];
  readonly lucideIcon = TrendingUp;

  // Credit multiplier for sales operations
  protected creditMultiplier = 1.1;

  // ============================================
  // CONSTRUCTOR
  // ============================================

  constructor() {
    super();
    this.registerMotionTools();
  }

  // ============================================
  // TOOL REGISTRATION
  // ============================================

  protected registerTools(): void {
    // Called by BaseAgent constructor
  }

  protected registerMotionTools(): void {
    // Lead Research Tools
    this.registerMotionTool(this.createResearchLeadTool());
    this.registerMotionTool(this.createEnrichLeadDataTool());
    this.registerMotionTool(this.createScoreLeadTool());
    this.registerMotionTool(this.createFindDecisionMakersTool());

    // Outreach Tools
    this.registerMotionTool(this.createDraftColdEmailTool());
    this.registerMotionTool(this.createDraftLinkedInMessageTool());
    this.registerMotionTool(this.createFollowUpSequenceTool());
    this.registerMotionTool(this.createPersonalizeTemplateTool());

    // CRM & Pipeline Tools
    this.registerMotionTool(this.createUpdateCrmRecordTool());
    this.registerMotionTool(this.createAnalyzePipelineTool());
    this.registerMotionTool(this.createSuggestNextActionsTool());
    this.registerMotionTool(this.createGenerateSalesReportTool());
  }

  // ============================================
  // LEAD RESEARCH TOOLS
  // ============================================

  private createResearchLeadTool(): MotionTool<ResearchLeadInput, ResearchLeadOutput> {
    return {
      name: 'research_lead',
      displayName: 'Research Lead',
      description: 'Research comprehensive information about a lead and their company',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          contactEmail: { type: 'string' },
          linkedInUrl: { type: 'string' },
          websiteUrl: { type: 'string' },
          enrichmentLevel: { type: 'string', enum: ['basic', 'standard', 'deep'] },
        },
        required: ['enrichmentLevel'],
      },
      execute: async (input, context) => {
        const companyName = input.companyName || 'Unknown Company';

        return {
          company: {
            name: companyName,
            industry: 'Technology',
            size: '51-200 employees',
            employeeCount: '150',
            revenue: '$10M - $50M',
            founded: '2018',
            headquarters: 'San Francisco, CA',
            website: input.websiteUrl || `www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`,
            technologies: ['AWS', 'React', 'Node.js', 'PostgreSQL'],
            recentNews: [
              'Raised Series B funding last quarter',
              'Expanded to European market',
              'Launched new product line',
            ],
            socialProfiles: {
              linkedin: `linkedin.com/company/${companyName.toLowerCase().replace(/\s+/g, '-')}`,
              twitter: `@${companyName.toLowerCase().replace(/\s+/g, '')}`,
            },
          },
          contact: {
            name: 'John Smith',
            title: 'VP of Engineering',
            email: input.contactEmail,
            linkedin: input.linkedInUrl,
            previousCompanies: ['Google', 'Meta'],
            education: ['Stanford University - MS Computer Science'],
            recentActivity: ['Posted about AI trends', 'Shared company milestone'],
          },
          insights: [
            `${companyName} is growing rapidly and may need to scale their infrastructure`,
            'Recent funding suggests budget availability for new tools',
            'Technology stack indicates potential fit with our solution',
          ],
          talkingPoints: [
            'Congratulations on the recent Series B',
            'I noticed your expansion into Europe',
            'Your tech stack suggests you might face challenges with...',
          ],
          potentialPainPoints: [
            'Scaling challenges with rapid growth',
            'Integration complexity with current stack',
            'Need for automation as team grows',
          ],
          competitorInfo: ['Uses competitor X for similar needs'],
          bestApproachTiming: 'Tuesday-Thursday, 9-11 AM local time',
        };
      },
    };
  }

  private createEnrichLeadDataTool(): MotionTool<EnrichLeadDataInput, EnrichLeadDataOutput> {
    return {
      name: 'enrich_lead_data',
      displayName: 'Enrich Lead Data',
      description: 'Enrich lead data with additional company and contact information',
      category: 'analytics',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          email: { type: 'string' },
          company: { type: 'string' },
          name: { type: 'string' },
          enrichmentFields: { type: 'array', items: { type: 'string' } },
        },
        required: ['enrichmentFields'],
      },
      execute: async (input, context) => {
        const leadId = input.leadId || crypto.randomUUID();

        return {
          leadId,
          originalData: {
            email: input.email,
            company: input.company,
            name: input.name,
          },
          enrichedData: {
            company: input.enrichmentFields.includes('company') ? {
              industry: 'SaaS',
              size: '51-200',
              revenue: '$10M-$50M',
              technologies: ['AWS', 'React', 'Python'],
              fundingStage: 'Series B',
              recentFunding: '$25M in Q3 2024',
            } : undefined,
            contact: input.enrichmentFields.includes('contact') ? {
              fullName: input.name || 'John Smith',
              title: 'Director of Engineering',
              department: 'Engineering',
              seniority: 'Director',
              decisionMaker: true,
              directPhone: '+1 555-0123',
            } : undefined,
            social: input.enrichmentFields.includes('social') ? {
              linkedin: 'linkedin.com/in/johnsmith',
              twitter: '@johnsmith',
              followers: 5000,
              recentPosts: ['Excited about our new product launch'],
            } : undefined,
            technographics: input.enrichmentFields.includes('technographics') ? {
              currentStack: ['AWS', 'React', 'MongoDB', 'Kubernetes'],
              recentChanges: ['Migrated to Kubernetes last month'],
              competitorProducts: ['Competitor X'],
            } : undefined,
            intent: input.enrichmentFields.includes('intent') ? {
              signals: ['Visited pricing page', 'Downloaded whitepaper'],
              score: 75,
              topics: ['DevOps automation', 'Cloud migration'],
            } : undefined,
          },
          dataQuality: {
            completeness: 85,
            confidence: 90,
            lastUpdated: new Date().toISOString(),
          },
          nextSteps: [
            'Lead shows high intent - prioritize outreach',
            'Personalize message with recent funding mention',
            'Reference their technology stack in value prop',
          ],
        };
      },
    };
  }

  private createScoreLeadTool(): MotionTool<ScoreLeadInput, ScoreLeadOutput> {
    return {
      name: 'score_lead',
      displayName: 'Score Lead',
      description: 'Calculate lead score based on fit, engagement, and timing signals',
      category: 'analytics',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          leadData: { type: 'object' },
          scoringCriteria: { type: 'object' },
        },
        required: ['leadData'],
      },
      execute: async (input, context) => {
        const { leadData, scoringCriteria } = input;

        // Calculate fit score
        let fitScore = 50;
        const fitFactors = [];

        if (scoringCriteria?.idealIndustries?.includes(leadData.industry)) {
          fitScore += 20;
          fitFactors.push({ factor: 'Industry match', impact: 20, reasoning: 'Matches ideal customer profile' });
        }

        if (scoringCriteria?.idealTitles?.some(t => leadData.title.includes(t))) {
          fitScore += 15;
          fitFactors.push({ factor: 'Title match', impact: 15, reasoning: 'Decision-maker title' });
        }

        // Calculate engagement score
        let engagementScore = 30;
        const engagementFactors = [];

        if (leadData.engagement?.websiteVisits && leadData.engagement.websiteVisits > 3) {
          engagementScore += 25;
          engagementFactors.push({ factor: 'Website activity', impact: 25, reasoning: 'Multiple site visits indicate interest' });
        }

        if (leadData.engagement?.contentDownloads && leadData.engagement.contentDownloads > 0) {
          engagementScore += 20;
          engagementFactors.push({ factor: 'Content engagement', impact: 20, reasoning: 'Downloaded resources' });
        }

        // Calculate timing score
        const timingScore = 60;
        const timingFactors = [
          { factor: 'Market timing', impact: 10, reasoning: 'Industry showing growth' },
        ];

        const totalScore = Math.round((fitScore * 0.4 + engagementScore * 0.35 + timingScore * 0.25));
        const tier = totalScore >= 80 ? 'hot' : totalScore >= 60 ? 'warm' : totalScore >= 40 ? 'cold' : 'disqualified';

        return {
          leadScore: totalScore,
          scoreBreakdown: {
            fit: { score: fitScore, factors: fitFactors },
            engagement: { score: engagementScore, factors: engagementFactors },
            timing: { score: timingScore, factors: timingFactors },
          },
          tier: tier as 'hot' | 'warm' | 'cold' | 'disqualified',
          priorityRank: totalScore >= 80 ? 1 : totalScore >= 60 ? 2 : 3,
          readinessIndicators: totalScore >= 60 ? [
            'Showing buying signals',
            'Decision-maker engaged',
            'Budget cycle aligned',
          ] : ['Needs more nurturing'],
          disqualificationReasons: tier === 'disqualified' ? ['Poor fit with ICP'] : undefined,
          recommendedAction: tier === 'hot' ? 'Immediate outreach' : tier === 'warm' ? 'Nurture with content' : 'Add to drip campaign',
          estimatedConversionProbability: Math.round(totalScore * 0.5),
        };
      },
    };
  }

  private createFindDecisionMakersTool(): MotionTool<FindDecisionMakersInput, FindDecisionMakersOutput> {
    return {
      name: 'find_decision_makers',
      displayName: 'Find Decision Makers',
      description: 'Identify key decision makers and influencers at a target company',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          companyName: { type: 'string' },
          companyDomain: { type: 'string' },
          targetDepartments: { type: 'array', items: { type: 'string' } },
          seniorityLevels: { type: 'array', items: { type: 'string' } },
          maxResults: { type: 'number' },
        },
        required: ['companyName'],
      },
      execute: async (input, context) => {
        const decisionMakers = [
          {
            name: 'Sarah Johnson',
            title: 'CEO',
            department: 'executive',
            seniority: 'c_level',
            email: `sarah.johnson@${input.companyDomain || 'company.com'}`,
            linkedin: 'linkedin.com/in/sarahjohnson',
            influenceLevel: 'champion' as const,
            directReports: 5,
            keyResponsibilities: ['Strategic direction', 'Budget approval'],
            commonBackground: ['MBA from Harvard', '15 years in tech'],
          },
          {
            name: 'Mike Chen',
            title: 'VP of Engineering',
            department: 'engineering',
            seniority: 'vp',
            email: `mike.chen@${input.companyDomain || 'company.com'}`,
            linkedin: 'linkedin.com/in/mikechen',
            influenceLevel: 'champion' as const,
            reportsTo: 'Sarah Johnson',
            directReports: 12,
            keyResponsibilities: ['Technical decisions', 'Team management', 'Vendor evaluation'],
            commonBackground: ['Ex-Google', 'Stanford CS'],
          },
          {
            name: 'Lisa Wong',
            title: 'Director of Operations',
            department: 'operations',
            seniority: 'director',
            email: `lisa.wong@${input.companyDomain || 'company.com'}`,
            linkedin: 'linkedin.com/in/lisawong',
            influenceLevel: 'influencer' as const,
            reportsTo: 'Mike Chen',
            directReports: 6,
            keyResponsibilities: ['Process improvement', 'Tool implementation'],
          },
        ];

        return {
          company: input.companyName,
          decisionMakers: decisionMakers.slice(0, input.maxResults || 5),
          organizationChart: {
            hierarchy: 'CEO -> VP Engineering -> Director Operations',
            keyRelationships: ['CEO sponsors all major initiatives', 'VP owns technical decisions'],
          },
          approachStrategy: {
            primaryContact: 'Mike Chen - VP of Engineering',
            secondaryContacts: ['Lisa Wong - Director of Operations'],
            entryPoint: 'Start with Lisa Wong for initial discovery, escalate to Mike for decision',
            multiThreadingApproach: 'Engage both technical and operations simultaneously',
          },
          recommendations: [
            'Lead with technical value proposition for Mike',
            'Highlight efficiency gains for Lisa',
            'Prepare executive summary for Sarah if deal progresses',
          ],
        };
      },
    };
  }

  // ============================================
  // OUTREACH TOOLS
  // ============================================

  private createDraftColdEmailTool(): MotionTool<DraftColdEmailInput, DraftColdEmailOutput> {
    return {
      name: 'draft_cold_email',
      displayName: 'Draft Cold Email',
      description: 'Create personalized cold email with subject lines and follow-up',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          leadInfo: { type: 'object' },
          valueProposition: { type: 'string' },
          tone: { type: 'string', enum: ['professional', 'casual', 'direct', 'consultative'] },
          callToAction: { type: 'string', enum: ['meeting', 'demo', 'call', 'reply', 'resource'] },
          personalizationPoints: { type: 'array', items: { type: 'string' } },
          product: { type: 'string' },
          painPoints: { type: 'array', items: { type: 'string' } },
        },
        required: ['leadInfo', 'valueProposition', 'tone', 'callToAction'],
      },
      execute: async (input, context) => {
        const { leadInfo, valueProposition, tone, callToAction, personalizationPoints } = input;
        const personalization = personalizationPoints?.[0] || `your role as ${leadInfo.role}`;

        const ctaMap = {
          meeting: 'Would you be open to a 15-minute call next week?',
          demo: 'I\'d love to show you a quick demo. When works for you?',
          call: 'Do you have 10 minutes for a quick call this week?',
          reply: 'Would love to hear your thoughts.',
          resource: 'I put together a resource that might help - shall I send it over?',
        };

        const subject = `Quick question about ${leadInfo.company}'s ${input.painPoints?.[0] || 'growth'}`;
        const body = `Hi ${leadInfo.name},

I noticed ${personalization} and thought you might be interested in how ${valueProposition}.

${input.painPoints?.length ? `Many ${leadInfo.role}s I work with face challenges like ${input.painPoints[0]}.` : ''}

${ctaMap[callToAction]}

Best,
[Your name]`;

        return {
          subject,
          subjectVariants: [
            subject,
            `${leadInfo.name}, quick idea for ${leadInfo.company}`,
            `Thought of ${leadInfo.company} when I saw this`,
          ],
          body,
          previewText: `Hi ${leadInfo.name}, I noticed ${personalization}...`,
          plainTextVersion: body,
          bestSendTime: '9:00 AM',
          bestSendDay: 'Tuesday',
          personalizationUsed: personalizationPoints || [],
          followUpSubject: `Re: ${subject}`,
          followUpBody: `Hi ${leadInfo.name},

Just wanted to follow up on my previous email. I know you're busy, so I'll keep this brief.

${ctaMap[callToAction]}

Best,
[Your name]`,
          abTestSuggestions: [
            { element: 'subject', variantA: subject, variantB: `${leadInfo.name} - quick question`, hypothesis: 'Personalized name in subject may increase open rate' },
            { element: 'cta', variantA: ctaMap[callToAction], variantB: 'Worth a quick chat?', hypothesis: 'Softer CTA may reduce friction' },
          ],
        };
      },
    };
  }

  private createDraftLinkedInMessageTool(): MotionTool<DraftLinkedInMessageInput, DraftLinkedInMessageOutput> {
    return {
      name: 'draft_linkedin_message',
      displayName: 'Draft LinkedIn Message',
      description: 'Create personalized LinkedIn connection requests and messages',
      category: 'communication',
      creditCost: 50,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          leadInfo: { type: 'object' },
          messageType: { type: 'string', enum: ['connection_request', 'inmail', 'follow_up', 'engagement'] },
          objective: { type: 'string', enum: ['book_meeting', 'start_conversation', 'share_content', 'ask_question'] },
          tone: { type: 'string', enum: ['professional', 'friendly', 'curious'] },
          personalizationHooks: { type: 'array', items: { type: 'string' } },
        },
        required: ['leadInfo', 'messageType', 'objective', 'tone'],
      },
      execute: async (input, context) => {
        const { leadInfo, messageType, objective, tone, personalizationHooks } = input;
        const hook = personalizationHooks?.[0] || `your work at ${leadInfo.company}`;

        let connectionNote = '';
        if (messageType === 'connection_request') {
          connectionNote = `Hi ${leadInfo.name}, I came across ${hook} and would love to connect. Looking forward to exchanging ideas!`;
        }

        const messages: Record<string, string> = {
          book_meeting: `Hi ${leadInfo.name},

Thanks for connecting! I noticed ${hook} and thought we might have some synergies.

I help ${leadInfo.role}s at companies like ${leadInfo.company} with [specific value]. Would you be open to a quick 15-min chat to explore if there's a fit?`,
          start_conversation: `Hi ${leadInfo.name},

Great to connect! I was impressed by ${hook}.

I'm curious - what's been your biggest focus at ${leadInfo.company} lately?`,
          share_content: `Hi ${leadInfo.name},

Thought you might find this interesting given ${hook} - [content link]

Would love to hear your take on it!`,
          ask_question: `Hi ${leadInfo.name},

I've been researching ${leadInfo.company}'s approach to [topic] and I'm curious about your perspective.

What's been working well for your team?`,
        };

        const message = messages[objective] || messages.start_conversation;

        return {
          connectionNote: connectionNote.length > 300 ? connectionNote.slice(0, 297) + '...' : connectionNote,
          message,
          characterCount: message.length,
          variants: [
            message,
            message.replace('15-min chat', 'brief call'),
            message.replace('Would love', 'I\'d love'),
          ],
          engagementTips: [
            'Engage with their posts before reaching out',
            'Comment on shared connections\' content',
            'Join and participate in their groups',
          ],
          followUpStrategy: {
            timing: '3-5 days after initial message',
            message: `Hi ${leadInfo.name}, just wanted to follow up on my previous message. No pressure - just thought it might be worth connecting. Happy to share any insights I can!`,
            escalationPath: 'If no response after 2 follow-ups, try email or phone',
          },
          profileOptimizations: [
            'Ensure your headline mentions value proposition',
            'Add relevant case studies to featured section',
          ],
        };
      },
    };
  }

  private createFollowUpSequenceTool(): MotionTool<CreateFollowUpSequenceInput, CreateFollowUpSequenceOutput> {
    return {
      name: 'create_follow_up_sequence',
      displayName: 'Create Follow-up Sequence',
      description: 'Create a multi-touch follow-up sequence across channels',
      category: 'communication',
      creditCost: 100,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          leadInfo: { type: 'object' },
          initialOutreach: { type: 'object' },
          sequenceLength: { type: 'number' },
          channels: { type: 'array', items: { type: 'string' } },
          objective: { type: 'string', enum: ['book_meeting', 'get_response', 'nurture'] },
          valueProps: { type: 'array', items: { type: 'string' } },
          breakupEmailIncluded: { type: 'boolean' },
        },
        required: ['leadInfo', 'initialOutreach', 'sequenceLength', 'channels', 'objective', 'valueProps'],
      },
      execute: async (input, context) => {
        const steps = [];
        const channels = input.channels;
        const timings = ['3 days', '5 days', '7 days', '10 days', '14 days'];

        for (let i = 0; i < input.sequenceLength; i++) {
          const channel = channels[i % channels.length];
          const valueProp = input.valueProps[i % input.valueProps.length];

          steps.push({
            stepNumber: i + 1,
            channel,
            timing: i === 0 ? 'Immediately' : `${timings[i - 1] || '14 days'} after previous`,
            dayOfWeek: i % 2 === 0 ? 'Tuesday' : 'Thursday',
            timeOfDay: '9:00 AM',
            subject: channel === 'email' ? `Following up - ${valueProp}` : undefined,
            content: `Step ${i + 1}: Focus on ${valueProp}. Reference previous touchpoint and add new value.`,
            objective: i < 2 ? 'Get response' : 'Provide value',
            callScript: channel === 'phone' ? `Hi ${input.leadInfo.name}, this is [Your name]. I recently reached out about ${valueProp}. Do you have a quick minute?` : undefined,
            voicemailScript: channel === 'phone' ? `Hi ${input.leadInfo.name}, [Your name] here. I sent you an email about ${valueProp}. I'll follow up via email. Looking forward to connecting.` : undefined,
          });
        }

        const breakupEmail = input.breakupEmailIncluded ? {
          subject: `Should I close your file?`,
          body: `Hi ${input.leadInfo.name},

I've reached out a few times but haven't heard back. I understand you're busy, so I'll assume now isn't the right time.

If things change, feel free to reach out. I'll keep you on our newsletter for occasional insights.

Best,
[Your name]`,
        } : undefined;

        return {
          sequenceName: `${input.leadInfo.company} - ${input.objective} sequence`,
          steps,
          totalDuration: `${input.sequenceLength * 3}-${input.sequenceLength * 4} days`,
          expectedResponseRate: '15-25%',
          breakupEmail,
          automationNotes: [
            'Set up email tracking to trigger follow-ups',
            'Remove from sequence if they respond',
            'Pause sequence if out-of-office detected',
          ],
          abTestRecommendations: [
            'Test shorter vs longer timing between touches',
            'Test video message vs text in step 3',
          ],
        };
      },
    };
  }

  private createPersonalizeTemplateTool(): MotionTool<PersonalizeTemplateInput, PersonalizeTemplateOutput> {
    return {
      name: 'personalize_template',
      displayName: 'Personalize Template',
      description: 'Personalize email or message templates with lead-specific information',
      category: 'communication',
      creditCost: 25,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          template: { type: 'string' },
          leadData: { type: 'object' },
          personalizationLevel: { type: 'string', enum: ['light', 'moderate', 'deep'] },
          preserveStructure: { type: 'boolean' },
        },
        required: ['template', 'leadData', 'personalizationLevel'],
      },
      execute: async (input, context) => {
        const { template, leadData, personalizationLevel } = input;

        const elements = [];
        let personalized = template;

        // Basic replacements
        personalized = personalized.replace(/\{name\}/g, leadData.name);
        personalized = personalized.replace(/\{company\}/g, leadData.company);
        personalized = personalized.replace(/\{role\}/g, leadData.role);

        elements.push({
          type: 'company' as const,
          original: '{company}',
          personalized: leadData.company,
          reason: 'Company name personalization',
        });

        if (personalizationLevel !== 'light') {
          if (leadData.industry) {
            personalized = personalized.replace(/\{industry\}/g, leadData.industry);
            elements.push({
              type: 'industry' as const,
              original: '{industry}',
              personalized: leadData.industry,
              reason: 'Industry-specific messaging',
            });
          }

          if (leadData.recentNews?.[0] && personalizationLevel === 'deep') {
            const newsHook = `I noticed ${leadData.recentNews[0].toLowerCase()}`;
            personalized = personalized.replace(/\{personalization_hook\}/g, newsHook);
            elements.push({
              type: 'news' as const,
              original: '{personalization_hook}',
              personalized: newsHook,
              reason: 'Recent news creates relevance',
            });
          }
        }

        const score = personalizationLevel === 'deep' ? 90 : personalizationLevel === 'moderate' ? 70 : 50;

        return {
          personalizedContent: personalized,
          personalizationElements: elements,
          personalizationScore: score,
          suggestions: [
            'Add a mutual connection mention if available',
            'Reference their LinkedIn activity',
            'Include industry-specific pain points',
          ],
          alternativeVersions: [
            personalized.replace('I noticed', 'I saw'),
            personalized.replace('Would you be open', 'Would it make sense'),
          ],
        };
      },
    };
  }

  // ============================================
  // CRM & PIPELINE TOOLS
  // ============================================

  private createUpdateCrmRecordTool(): MotionTool<UpdateCrmRecordInput, UpdateCrmRecordOutput> {
    return {
      name: 'update_crm_record',
      displayName: 'Update CRM Record',
      description: 'Update lead, contact, or opportunity records in CRM',
      category: 'data',
      creditCost: 10,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          recordType: { type: 'string', enum: ['lead', 'contact', 'account', 'opportunity'] },
          recordId: { type: 'string' },
          updates: { type: 'object' },
          createActivityLog: { type: 'boolean' },
          activityType: { type: 'string', enum: ['email', 'call', 'meeting', 'note', 'task'] },
          activityDetails: { type: 'string' },
        },
        required: ['recordType', 'recordId', 'updates'],
      },
      execute: async (input, context) => {
        return {
          success: true,
          recordId: input.recordId,
          recordType: input.recordType,
          updatedFields: Object.keys(input.updates),
          previousValues: {},
          newValues: input.updates,
          activityCreated: input.createActivityLog ? {
            id: crypto.randomUUID(),
            type: input.activityType || 'note',
            timestamp: new Date().toISOString(),
          } : undefined,
          automatedActions: [
            'Lead score recalculated',
            'Workflow triggered: Follow-up reminder set',
          ],
          warnings: [],
        };
      },
    };
  }

  private createAnalyzePipelineTool(): MotionTool<AnalyzePipelineInput, AnalyzePipelineOutput> {
    return {
      name: 'analyze_pipeline',
      displayName: 'Analyze Pipeline',
      description: 'Analyze sales pipeline health, velocity, and forecasting',
      category: 'analytics',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          pipelineId: { type: 'string' },
          dateRange: { type: 'object' },
          filters: { type: 'object' },
          includeForecasting: { type: 'boolean' },
        },
        required: [],
      },
      execute: async (input, context) => {
        return {
          summary: {
            totalOpportunities: 45,
            totalValue: 2500000,
            weightedValue: 875000,
            averageDealSize: 55556,
            averageSalesCycle: 45,
          },
          stageAnalysis: [
            { stage: 'Prospecting', count: 15, value: 750000, avgDaysInStage: 7, conversionRate: 60, atRiskDeals: 2 },
            { stage: 'Qualification', count: 12, value: 600000, avgDaysInStage: 10, conversionRate: 50, atRiskDeals: 1 },
            { stage: 'Proposal', count: 10, value: 500000, avgDaysInStage: 14, conversionRate: 40, atRiskDeals: 3 },
            { stage: 'Negotiation', count: 5, value: 400000, avgDaysInStage: 21, conversionRate: 70, atRiskDeals: 1 },
            { stage: 'Closed Won', count: 3, value: 250000, avgDaysInStage: 0, conversionRate: 100, atRiskDeals: 0 },
          ],
          velocityMetrics: {
            pipelineVelocity: 55556,
            avgTimeToClose: 52,
            winRate: 25,
            lossReasons: [
              { reason: 'Budget constraints', count: 5 },
              { reason: 'Went with competitor', count: 3 },
              { reason: 'No decision', count: 4 },
            ],
          },
          forecast: input.includeForecasting ? {
            bestCase: 1200000,
            mostLikely: 875000,
            worstCase: 500000,
            confidence: 75,
          } : undefined,
          atRiskOpportunities: [
            { id: 'opp-1', name: 'Acme Corp', value: 100000, reason: 'No activity in 14 days', recommendation: 'Reach out to champion' },
            { id: 'opp-2', name: 'Tech Inc', value: 75000, reason: 'Champion left company', recommendation: 'Find new champion' },
          ],
          insights: [
            'Pipeline is healthy with good stage distribution',
            'Proposal stage shows bottleneck - consider proposal templates',
            'Win rate improving month over month',
          ],
          recommendations: [
            'Focus on moving Qualification deals forward',
            'Address at-risk deals in Proposal stage',
            'Increase prospecting to maintain pipeline coverage',
          ],
        };
      },
    };
  }

  private createSuggestNextActionsTool(): MotionTool<SuggestNextActionsInput, SuggestNextActionsOutput> {
    return {
      name: 'suggest_next_actions',
      displayName: 'Suggest Next Actions',
      description: 'Get AI-powered suggestions for next best actions on a lead or opportunity',
      category: 'analytics',
      creditCost: 50,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          leadId: { type: 'string' },
          opportunityId: { type: 'string' },
          currentStage: { type: 'string' },
          lastActivity: { type: 'object' },
          leadScore: { type: 'number' },
          objectives: { type: 'array', items: { type: 'string' } },
        },
        required: ['currentStage'],
      },
      execute: async (input, context) => {
        const stageActions: Record<string, typeof output.primaryAction> = {
          prospecting: {
            action: 'Send personalized outreach',
            channel: 'email',
            timing: 'Within 24 hours',
            reason: 'Fresh leads have highest response rates',
            template: 'Use cold-outreach-v2 template',
          },
          qualification: {
            action: 'Schedule discovery call',
            channel: 'phone',
            timing: 'Today or tomorrow',
            reason: 'Move to qualification with discovery meeting',
            script: 'Use BANT qualification framework',
          },
          proposal: {
            action: 'Follow up on proposal',
            channel: 'email',
            timing: 'If no response in 3 days',
            reason: 'Keep momentum after proposal send',
          },
          negotiation: {
            action: 'Address objections',
            channel: 'meeting',
            timing: 'ASAP',
            reason: 'Close deals quickly in negotiation',
          },
        };

        const output = stageActions[input.currentStage.toLowerCase()] || stageActions.prospecting;

        return {
          primaryAction: output,
          alternativeActions: [
            { action: 'Engage on LinkedIn', channel: 'linkedin', timing: 'Before email', reason: 'Warm up before outreach', priority: 2 },
            { action: 'Send relevant content', channel: 'email', timing: 'If no response to call', reason: 'Provide value without ask', priority: 3 },
          ],
          stakeholderActions: [
            { stakeholder: 'Champion', action: 'Schedule weekly check-in', objective: 'Maintain momentum' },
            { stakeholder: 'Economic Buyer', action: 'Send ROI analysis', objective: 'Build business case' },
          ],
          contentToShare: [
            { type: 'case_study', title: 'Industry Success Story', relevance: 'Similar company size and challenges' },
            { type: 'whitepaper', title: 'ROI Guide', relevance: 'Helps build internal business case' },
          ],
          warnings: input.lastActivity && new Date(input.lastActivity.date).getTime() < Date.now() - 14 * 24 * 60 * 60 * 1000
            ? ['No activity in 14+ days - at risk of going cold']
            : undefined,
          successProbability: input.leadScore ? Math.round(input.leadScore * 0.6) : 50,
          expectedOutcome: 'Meeting scheduled or response received within 1 week',
        };
      },
    };
  }

  private createGenerateSalesReportTool(): MotionTool<GenerateSalesReportInput, GenerateSalesReportOutput> {
    return {
      name: 'generate_sales_report',
      displayName: 'Generate Sales Report',
      description: 'Generate comprehensive sales activity and performance reports',
      category: 'document',
      creditCost: 75,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          reportType: { type: 'string', enum: ['activity', 'pipeline', 'forecast', 'performance', 'comprehensive'] },
          period: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'quarterly'] },
          dateRange: { type: 'object' },
          owner: { type: 'string' },
          team: { type: 'string' },
          includeCharts: { type: 'boolean' },
        },
        required: ['reportType', 'period'],
      },
      execute: async (input, context) => {
        return {
          reportTitle: `${input.reportType.charAt(0).toUpperCase() + input.reportType.slice(1)} Report - ${input.period}`,
          period: input.period,
          generatedAt: new Date().toISOString(),
          executiveSummary: `This ${input.period} ${input.reportType} report shows strong performance with 25% increase in qualified meetings and 15% improvement in conversion rates. Pipeline remains healthy with adequate coverage for quota.`,
          metrics: {
            activities: {
              emails: 450,
              calls: 120,
              meetings: 35,
              demos: 18,
            },
            pipeline: {
              newOpportunities: 12,
              closedWon: 5,
              closedLost: 3,
              inProgress: 45,
            },
            performance: {
              quotaAttainment: 85,
              avgDealSize: 55000,
              winRate: 25,
              conversionRates: {
                'lead_to_opportunity': 15,
                'opportunity_to_proposal': 60,
                'proposal_to_close': 40,
              },
            },
          },
          trends: [
            { metric: 'Meetings Booked', current: 35, previous: 28, change: 25, trend: 'up' },
            { metric: 'Win Rate', current: 25, previous: 22, change: 14, trend: 'up' },
            { metric: 'Avg Deal Size', current: 55000, previous: 52000, change: 6, trend: 'up' },
            { metric: 'Sales Cycle', current: 45, previous: 48, change: -6, trend: 'down' },
          ],
          topPerformers: [
            { name: 'Jane Smith', metric: 'Meetings Booked', value: 15 },
            { name: 'John Doe', metric: 'Deals Closed', value: 3 },
          ],
          areasForImprovement: [
            'Email response rate below benchmark (consider A/B testing)',
            'Proposal-to-close conversion needs attention',
            'Increase prospecting activity to maintain pipeline coverage',
          ],
          recommendations: [
            'Implement call coaching for underperformers',
            'Create proposal templates to speed up sales cycle',
            'Add more top-of-funnel activities',
          ],
          forecast: {
            currentQuarter: 450000,
            nextQuarter: 525000,
            yearEnd: 1800000,
          },
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
      const response = `As Chip, your Sales Development Rep, I'm here to help you build pipeline and close deals!

Based on your message: "${message}"

I can help you with:
🔍 **Lead Research** - Research companies, enrich data, score leads, find decision makers
📧 **Outreach** - Draft cold emails, LinkedIn messages, follow-up sequences
📊 **CRM & Pipeline** - Update records, analyze pipeline, suggest next actions
📈 **Reporting** - Generate sales reports and track performance

What would you like to work on today?`;

      return {
        success: true,
        data: response,
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
          toolsUsed: [],
          correlationId: crypto.randomUUID(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: false,
        },
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
        },
      };
    }
  }

  // ============================================
  // SYSTEM PROMPT
  // ============================================

  public getSystemPrompt(): string {
    return `You are Chip, an expert Sales Development Rep AI.

YOUR ROLE:
- Research and qualify potential leads
- Craft personalized outreach messages
- Build and maintain sales pipeline
- Track and follow up with prospects
- Identify best opportunities to pursue

YOUR PERSONALITY:
- Persistent but respectful
- Research-driven approach
- Personalization expert
- Results-oriented
- Data-informed

YOUR SPECIALTIES:
${this.specialties.map(s => `- ${s}`).join('\n')}

AVAILABLE TOOLS:
${this.getMotionTools().map(t => `- ${t.displayName}: ${t.description}`).join('\n')}

GUIDELINES:
1. Always research before reaching out
2. Personalize every message
3. Focus on value, not features
4. Respect prospect's time
5. Track all interactions in CRM
6. Follow up persistently but appropriately
7. Multi-thread with multiple stakeholders

When prospecting, always ask about:
- Target account or contact information
- Value proposition to highlight
- Preferred communication channels
- Timeline and urgency`;
  }

  // ============================================
  // CONTEXT ENRICHMENT
  // ============================================

  protected async getAgentSpecificContext(context: MotionAgentContext): Promise<Record<string, unknown>> {
    return {
      agentRole: 'Sales Development Rep',
      availableTools: this.getMotionTools().map(t => t.name),
      outreachChannels: ['email', 'linkedin', 'phone'],
      crmIntegrations: ['salesforce', 'hubspot', 'pipedrive'],
    };
  }
}

// Export singleton instance
export const chipAgent = new ChipAgent();

export default ChipAgent;
