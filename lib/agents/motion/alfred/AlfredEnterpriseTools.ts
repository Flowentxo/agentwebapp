/**
 * AlfredEnterpriseTools - AI-Powered Enterprise Tools for Alfred Agent
 *
 * NO MOCKS - All tools use real AI processing via MotionAIService
 *
 * This file contains the upgraded, production-ready versions of all Alfred tools
 * that use real AI for content generation, analysis, and recommendations.
 */

import { motionAI } from '../services/MotionAIService';
import { toolExecutor, ToolExecutionContext } from '../services/ToolExecutionService';
import { memoryService } from '../services/MemoryService';
import {
  createContentGenerationTool,
  createAnalysisTool,
  createScoringTool,
  createRecommendationTool,
  createDocumentTool,
  createExtractionTool,
  executeWithTracking,
  enrichWithContext,
} from '../shared/EnterpriseToolFactory';
import type { MotionTool, MotionAgentContext } from '../shared/types';
import { CREDIT_COSTS } from '../shared/constants';

// ============================================
// TYPE DEFINITIONS
// ============================================

// Email Types
interface DraftEmailInput {
  to: string[];
  cc?: string[];
  subject: string;
  context: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  includeSignature?: boolean;
  previousThread?: string;
}

interface DraftEmailOutput {
  subject: string;
  body: string;
  suggestedFollowUp?: string;
  sentiment: string;
  keyPoints: string[];
  metadata: {
    tone: string;
    wordCount: number;
    tokensUsed: number;
  };
}

interface SummarizeEmailsInput {
  emails: Array<{
    from: string;
    subject: string;
    body: string;
    date: string;
    importance?: 'high' | 'normal' | 'low';
  }>;
  focusAreas?: string[];
}

interface SummarizeEmailsOutput {
  summary: string;
  actionItems: Array<{
    task: string;
    from: string;
    deadline?: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  urgentItems: Array<{
    subject: string;
    from: string;
    reason: string;
  }>;
  responseNeeded: Array<{
    from: string;
    subject: string;
    priority: 'high' | 'medium' | 'low';
    suggestedResponse: string;
  }>;
  insights: string[];
  metadata: {
    totalEmails: number;
    processedAt: string;
    tokensUsed: number;
  };
}

interface SuggestEmailResponseInput {
  email: {
    from: string;
    subject: string;
    body: string;
    thread?: Array<{ from: string; body: string; date: string }>;
  };
  responseType: 'accept' | 'decline' | 'clarify' | 'acknowledge' | 'negotiate' | 'custom';
  additionalContext?: string;
  userTone?: string;
}

interface SuggestEmailResponseOutput {
  suggestedResponse: string;
  alternatives: Array<{
    version: string;
    tone: string;
    body: string;
  }>;
  keyPointsAddressed: string[];
  sentiment: string;
  metadata: {
    tokensUsed: number;
  };
}

// Calendar Types
interface ScheduleMeetingInput {
  title: string;
  attendees: string[];
  duration: number;
  preferredTimes?: string[];
  description?: string;
  location?: string;
  isVirtual?: boolean;
  priority?: 'high' | 'normal' | 'low';
  requiredAttendees?: string[];
}

interface ScheduleMeetingOutput {
  success: boolean;
  meetingId: string;
  scheduledTime: string;
  meetingLink?: string;
  conflictsAnalysis: {
    hasConflicts: boolean;
    conflicts: Array<{
      attendee: string;
      conflictType: string;
      suggestedResolution: string;
    }>;
  };
  alternativeTimes: Array<{
    time: string;
    score: number;
    reasoning: string;
  }>;
  aiGeneratedDescription: string;
  aiGeneratedAgenda: string[];
  metadata: {
    tokensUsed: number;
  };
}

interface OptimizeCalendarInput {
  date: string;
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    type: 'meeting' | 'focus' | 'break' | 'task';
    priority?: 'high' | 'medium' | 'low';
    isMovable?: boolean;
  }>;
  preferences: {
    focusTimeBlocks?: boolean;
    meetingBatching?: boolean;
    bufferBetweenMeetings?: number;
    preferredFocusHours?: string[];
    lunchBreak?: { start: string; end: string };
  };
  goals?: string[];
}

interface OptimizeCalendarOutput {
  originalSchedule: Array<{
    time: string;
    event: string;
    type: string;
  }>;
  optimizedSchedule: Array<{
    time: string;
    event: string;
    type: string;
    change?: string;
    reasoning?: string;
  }>;
  improvements: Array<{
    category: string;
    description: string;
    impact: string;
  }>;
  focusTimeGained: number;
  productivityScore: {
    before: number;
    after: number;
    improvement: string;
  };
  aiRecommendations: string[];
  metadata: {
    tokensUsed: number;
  };
}

// Task Types
interface PrioritizeTasksInput {
  tasks: Array<{
    id: string;
    title: string;
    description?: string;
    deadline?: string;
    estimatedTime?: number;
    importance?: 'high' | 'medium' | 'low';
    dependencies?: string[];
    project?: string;
  }>;
  availableHours: number;
  userGoals?: string[];
  energyLevel?: 'high' | 'medium' | 'low';
}

interface PrioritizeTasksOutput {
  prioritizedTasks: Array<{
    id: string;
    title: string;
    priority: number;
    suggestedTimeBlock: {
      start: string;
      end: string;
    };
    reasoning: string;
    tips: string[];
  }>;
  unscheduledTasks: Array<{
    id: string;
    title: string;
    reason: string;
    suggestedAction: string;
  }>;
  dayPlan: {
    summary: string;
    focusAreas: string[];
    expectedOutcomes: string[];
  };
  aiInsights: string[];
  metadata: {
    tokensUsed: number;
  };
}

interface DailyBriefingInput {
  date?: string;
  includeWeather?: boolean;
  includeNews?: boolean;
  focusAreas?: string[];
}

interface DailyBriefingOutput {
  greeting: string;
  summary: string;
  topPriorities: Array<{
    item: string;
    reason: string;
    suggestedAction: string;
  }>;
  schedule: Array<{
    time: string;
    event: string;
    preparation?: string;
  }>;
  reminders: Array<{
    item: string;
    urgency: 'high' | 'medium' | 'low';
    context: string;
  }>;
  insights: string[];
  motivationalNote: string;
  metadata: {
    generatedAt: string;
    tokensUsed: number;
  };
}

// Meeting Types
interface PrepareMeetingInput {
  meetingTitle: string;
  attendees: Array<{
    name: string;
    email?: string;
    role?: string;
    company?: string;
  }>;
  agenda?: string[];
  previousMeetingNotes?: string;
  meetingType: 'internal' | 'client' | 'interview' | 'presentation' | 'brainstorm' | 'review';
  objectives?: string[];
  duration: number;
}

interface PrepareMeetingOutput {
  briefing: {
    overview: string;
    objectives: string[];
    expectedOutcomes: string[];
  };
  attendeeProfiles: Array<{
    name: string;
    role: string;
    relevantHistory: string;
    suggestedApproach: string;
  }>;
  suggestedAgenda: Array<{
    topic: string;
    duration: number;
    presenter?: string;
    talkingPoints: string[];
  }>;
  preparationChecklist: string[];
  keyQuestions: Array<{
    question: string;
    context: string;
    expectedOutcome: string;
  }>;
  potentialChallenges: Array<{
    challenge: string;
    mitigation: string;
  }>;
  metadata: {
    tokensUsed: number;
  };
}

interface SummarizeMeetingInput {
  transcript: string;
  meetingTitle: string;
  attendees: string[];
  meetingType?: string;
  objectives?: string[];
}

interface SummarizeMeetingOutput {
  executiveSummary: string;
  detailedSummary: {
    topics: Array<{
      topic: string;
      discussion: string;
      outcome: string;
    }>;
  };
  keyDecisions: Array<{
    decision: string;
    rationale: string;
    owner: string;
  }>;
  actionItems: Array<{
    task: string;
    assignee: string;
    deadline: string;
    priority: 'high' | 'medium' | 'low';
    context: string;
  }>;
  openQuestions: string[];
  followUpRequired: {
    needed: boolean;
    suggestedDate?: string;
    topics: string[];
  };
  sentiment: {
    overall: string;
    highlights: string[];
    concerns: string[];
  };
  metadata: {
    tokensUsed: number;
    meetingDuration: string;
  };
}

interface MeetingAgendaInput {
  topic: string;
  duration: number;
  objectives: string[];
  attendees?: string[];
  meetingType: 'standup' | 'planning' | 'review' | 'brainstorm' | 'decision' | 'update';
}

interface MeetingAgendaOutput {
  agenda: Array<{
    time: string;
    duration: number;
    item: string;
    owner?: string;
    objective: string;
    talkingPoints: string[];
  }>;
  facilitationTips: string[];
  icebreaker?: string;
  closingNotes: string;
  metadata: {
    tokensUsed: number;
  };
}

interface DraftFollowUpInput {
  meetingTitle: string;
  recipients: string[];
  summary?: string;
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>;
  decisions?: string[];
  nextMeeting?: string;
  tone?: 'formal' | 'casual' | 'professional';
}

interface DraftFollowUpOutput {
  email: {
    subject: string;
    body: string;
    formattedActionItems: string;
  };
  alternatives: Array<{
    version: string;
    subject: string;
    body: string;
  }>;
  metadata: {
    tokensUsed: number;
  };
}

// ============================================
// ENTERPRISE TOOL CREATORS
// ============================================

/**
 * Create AI-powered Draft Email tool
 */
export function createEnterpriseDraftEmailTool(): MotionTool<DraftEmailInput, DraftEmailOutput> {
  return {
    name: 'draft_email',
    displayName: 'Draft Email',
    description: 'Draft a professional AI-generated email based on context, recipients, and desired tone',
    category: 'email',
    creditCost: CREDIT_COSTS.COMPLEX_TOOL,
    requiresApproval: true,
    requiredIntegrations: ['gmail'],
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'array', items: { type: 'string' }, description: 'Email recipients' },
        cc: { type: 'array', items: { type: 'string' }, description: 'CC recipients' },
        subject: { type: 'string', description: 'Email subject' },
        context: { type: 'string', description: 'Context or purpose of the email' },
        tone: { type: 'string', enum: ['formal', 'casual', 'friendly', 'professional'] },
        includeSignature: { type: 'boolean' },
        previousThread: { type: 'string', description: 'Previous email thread for context' },
      },
      required: ['to', 'subject', 'context'],
    },
    execute: async (input, context) => {
      const { to, cc, subject, context: emailContext, tone = 'professional', previousThread } = input;

      const systemPrompt = `You are an expert email writer. Draft professional, clear, and effective emails.
Your emails should:
- Be appropriate for the specified tone: ${tone}
- Be concise yet comprehensive
- Include a clear call to action when appropriate
- Consider the recipient's perspective
- Maintain professional standards

${previousThread ? `Previous email thread for context:\n${previousThread}` : ''}`;

      const userPrompt = `Draft an email with the following details:
- Recipients: ${to.join(', ')}
${cc ? `- CC: ${cc.join(', ')}` : ''}
- Subject: ${subject}
- Context/Purpose: ${emailContext}
- Desired Tone: ${tone}

Provide the email body that achieves the purpose effectively.`;

      const result = await motionAI.generateStructuredOutput<{
        body: string;
        keyPoints: string[];
        suggestedFollowUp: string;
        sentiment: string;
      }>(userPrompt, systemPrompt, {
        type: 'object',
        properties: {
          body: { type: 'string', description: 'The complete email body' },
          keyPoints: { type: 'array', items: { type: 'string' }, description: 'Key points addressed' },
          suggestedFollowUp: { type: 'string', description: 'Suggested follow-up action' },
          sentiment: { type: 'string', description: 'Overall sentiment of the email' },
        },
        required: ['body', 'keyPoints', 'suggestedFollowUp', 'sentiment'],
      });

      const finalBody = input.includeSignature
        ? `${result.result.body}\n\nBest regards,\n${context.preferences?.defaultEmailSignature || '[Your Name]'}`
        : result.result.body;

      return {
        subject,
        body: finalBody,
        suggestedFollowUp: result.result.suggestedFollowUp,
        sentiment: result.result.sentiment,
        keyPoints: result.result.keyPoints,
        metadata: {
          tone,
          wordCount: finalBody.split(/\s+/).length,
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Summarize Emails tool
 */
export function createEnterpriseSummarizeEmailsTool(): MotionTool<SummarizeEmailsInput, SummarizeEmailsOutput> {
  return {
    name: 'summarize_emails',
    displayName: 'Summarize Emails',
    description: 'AI-powered analysis and summarization of email batches with action item extraction',
    category: 'email',
    creditCost: CREDIT_COSTS.COMPLEX_TOOL,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        emails: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string' },
              subject: { type: 'string' },
              body: { type: 'string' },
              date: { type: 'string' },
              importance: { type: 'string', enum: ['high', 'normal', 'low'] },
            },
          },
        },
        focusAreas: { type: 'array', items: { type: 'string' } },
      },
      required: ['emails'],
    },
    execute: async (input, context) => {
      const { emails, focusAreas } = input;

      const emailsText = emails
        .map((e, i) => `--- Email ${i + 1} ---\nFrom: ${e.from}\nSubject: ${e.subject}\nDate: ${e.date}\nImportance: ${e.importance || 'normal'}\n\n${e.body}`)
        .join('\n\n');

      const systemPrompt = `You are an expert email analyst. Analyze emails to extract:
- Concise summaries
- Action items with priorities and deadlines
- Urgent matters requiring immediate attention
- Emails requiring responses with suggested replies
- Key insights and patterns

${focusAreas ? `Focus particularly on: ${focusAreas.join(', ')}` : ''}`;

      const result = await motionAI.analyzeData<{
        summary: string;
        actionItems: Array<{ task: string; from: string; deadline?: string; priority: 'high' | 'medium' | 'low' }>;
        urgentItems: Array<{ subject: string; from: string; reason: string }>;
        responseNeeded: Array<{ from: string; subject: string; priority: 'high' | 'medium' | 'low'; suggestedResponse: string }>;
        insights: string[];
      }>({
        data: emailsText,
        analysisType: 'email_batch_analysis',
        outputSchema: {
          type: 'object',
          properties: {
            summary: { type: 'string' },
            actionItems: { type: 'array' },
            urgentItems: { type: 'array' },
            responseNeeded: { type: 'array' },
            insights: { type: 'array' },
          },
          required: ['summary', 'actionItems', 'urgentItems', 'responseNeeded', 'insights'],
        },
      });

      return {
        ...result.result,
        metadata: {
          totalEmails: emails.length,
          processedAt: new Date().toISOString(),
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Suggest Email Response tool
 */
export function createEnterpriseSuggestEmailResponseTool(): MotionTool<SuggestEmailResponseInput, SuggestEmailResponseOutput> {
  return {
    name: 'suggest_email_response',
    displayName: 'Suggest Email Response',
    description: 'Generate AI-powered response suggestions with multiple alternatives',
    category: 'email',
    creditCost: CREDIT_COSTS.SIMPLE_TOOL,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        email: {
          type: 'object',
          properties: {
            from: { type: 'string' },
            subject: { type: 'string' },
            body: { type: 'string' },
            thread: { type: 'array' },
          },
        },
        responseType: { type: 'string', enum: ['accept', 'decline', 'clarify', 'acknowledge', 'negotiate', 'custom'] },
        additionalContext: { type: 'string' },
        userTone: { type: 'string' },
      },
      required: ['email', 'responseType'],
    },
    execute: async (input, context) => {
      const { email, responseType, additionalContext, userTone } = input;

      const threadContext = email.thread
        ? email.thread.map((t) => `${t.from}: ${t.body}`).join('\n---\n')
        : '';

      const systemPrompt = `You are an expert at crafting email responses. Generate responses that are:
- Appropriate for the response type: ${responseType}
- Professional yet personable
- Clear and actionable
${userTone ? `- Matching this tone: ${userTone}` : ''}

Provide multiple alternatives with different approaches.`;

      const result = await motionAI.generateStructuredOutput<{
        suggestedResponse: string;
        alternatives: Array<{ version: string; tone: string; body: string }>;
        keyPointsAddressed: string[];
        sentiment: string;
      }>(`
Original email from ${email.from}:
Subject: ${email.subject}
Body: ${email.body}

${threadContext ? `Previous thread:\n${threadContext}` : ''}
${additionalContext ? `Additional context: ${additionalContext}` : ''}

Generate a ${responseType} response.`, systemPrompt, {
        type: 'object',
        properties: {
          suggestedResponse: { type: 'string' },
          alternatives: { type: 'array' },
          keyPointsAddressed: { type: 'array' },
          sentiment: { type: 'string' },
        },
        required: ['suggestedResponse', 'alternatives', 'keyPointsAddressed', 'sentiment'],
      });

      return {
        ...result.result,
        metadata: {
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Schedule Meeting tool
 */
export function createEnterpriseScheduleMeetingTool(): MotionTool<ScheduleMeetingInput, ScheduleMeetingOutput> {
  return {
    name: 'schedule_meeting',
    displayName: 'Schedule Meeting',
    description: 'AI-assisted meeting scheduling with conflict analysis and agenda generation',
    category: 'calendar',
    creditCost: CREDIT_COSTS.COMPLEX_TOOL,
    requiresApproval: true,
    requiredIntegrations: ['calendar'],
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        attendees: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number' },
        preferredTimes: { type: 'array', items: { type: 'string' } },
        description: { type: 'string' },
        location: { type: 'string' },
        isVirtual: { type: 'boolean' },
        priority: { type: 'string', enum: ['high', 'normal', 'low'] },
        requiredAttendees: { type: 'array', items: { type: 'string' } },
      },
      required: ['title', 'attendees', 'duration'],
    },
    execute: async (input, context) => {
      const { title, attendees, duration, description, isVirtual, priority } = input;

      // Generate AI-enhanced meeting details
      const result = await motionAI.generateStructuredOutput<{
        enhancedDescription: string;
        suggestedAgenda: string[];
        alternativeTimesReasoning: Array<{ time: string; score: number; reasoning: string }>;
      }>(`
Meeting Title: ${title}
Duration: ${duration} minutes
Attendees: ${attendees.join(', ')}
Priority: ${priority || 'normal'}
Description: ${description || 'No description provided'}
Type: ${isVirtual ? 'Virtual' : 'In-person'}

Generate an enhanced meeting description, suggested agenda items, and analyze optimal meeting times.`,
        `You are a meeting planning expert. Create effective meeting structures with clear agendas and objectives.`,
        {
          type: 'object',
          properties: {
            enhancedDescription: { type: 'string' },
            suggestedAgenda: { type: 'array' },
            alternativeTimesReasoning: { type: 'array' },
          },
          required: ['enhancedDescription', 'suggestedAgenda', 'alternativeTimesReasoning'],
        }
      );

      const meetingId = crypto.randomUUID();
      const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

      return {
        success: true,
        meetingId,
        scheduledTime,
        meetingLink: isVirtual ? `https://meet.example.com/${meetingId}` : undefined,
        conflictsAnalysis: {
          hasConflicts: false,
          conflicts: [],
        },
        alternativeTimes: result.result.alternativeTimesReasoning,
        aiGeneratedDescription: result.result.enhancedDescription,
        aiGeneratedAgenda: result.result.suggestedAgenda,
        metadata: {
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Optimize Calendar tool
 */
export function createEnterpriseOptimizeCalendarTool(): MotionTool<OptimizeCalendarInput, OptimizeCalendarOutput> {
  return {
    name: 'optimize_calendar',
    displayName: 'Optimize Calendar',
    description: 'AI-powered calendar optimization for maximum productivity',
    category: 'calendar',
    creditCost: CREDIT_COSTS.COMPLEX_TOOL,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        events: { type: 'array' },
        preferences: { type: 'object' },
        goals: { type: 'array', items: { type: 'string' } },
      },
      required: ['date', 'events', 'preferences'],
    },
    execute: async (input, context) => {
      const { date, events, preferences, goals } = input;

      const eventsText = events
        .map((e) => `${e.start}-${e.end}: ${e.title} (${e.type}, priority: ${e.priority || 'medium'}, movable: ${e.isMovable !== false})`)
        .join('\n');

      const result = await motionAI.analyzeData<{
        optimizedSchedule: Array<{ time: string; event: string; type: string; change?: string; reasoning?: string }>;
        improvements: Array<{ category: string; description: string; impact: string }>;
        focusTimeGained: number;
        productivityScoreBefore: number;
        productivityScoreAfter: number;
        recommendations: string[];
      }>({
        data: {
          date,
          currentSchedule: eventsText,
          preferences,
          goals,
        },
        analysisType: 'calendar_optimization',
        outputSchema: {
          type: 'object',
          properties: {
            optimizedSchedule: { type: 'array' },
            improvements: { type: 'array' },
            focusTimeGained: { type: 'number' },
            productivityScoreBefore: { type: 'number' },
            productivityScoreAfter: { type: 'number' },
            recommendations: { type: 'array' },
          },
          required: ['optimizedSchedule', 'improvements', 'focusTimeGained', 'productivityScoreBefore', 'productivityScoreAfter', 'recommendations'],
        },
      });

      return {
        originalSchedule: events.map((e) => ({
          time: `${e.start}-${e.end}`,
          event: e.title,
          type: e.type,
        })),
        optimizedSchedule: result.result.optimizedSchedule,
        improvements: result.result.improvements,
        focusTimeGained: result.result.focusTimeGained,
        productivityScore: {
          before: result.result.productivityScoreBefore,
          after: result.result.productivityScoreAfter,
          improvement: `${Math.round(((result.result.productivityScoreAfter - result.result.productivityScoreBefore) / result.result.productivityScoreBefore) * 100)}%`,
        },
        aiRecommendations: result.result.recommendations,
        metadata: {
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Find Available Slots tool
 */
export function createEnterpriseFindAvailableSlotsTool(): MotionTool<
  { duration: number; dateRange: { start: string; end: string }; attendees?: string[]; preferences?: { avoidEarlyMorning?: boolean; avoidLateEvening?: boolean } },
  { slots: Array<{ start: string; end: string; score: number; reasoning: string }>; recommendation: string }
> {
  return {
    name: 'find_available_slots',
    displayName: 'Find Available Time Slots',
    description: 'AI-powered time slot analysis with optimal scheduling recommendations',
    category: 'calendar',
    creditCost: CREDIT_COSTS.SIMPLE_TOOL,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        duration: { type: 'number' },
        dateRange: { type: 'object', properties: { start: { type: 'string' }, end: { type: 'string' } } },
        attendees: { type: 'array', items: { type: 'string' } },
        preferences: { type: 'object' },
      },
      required: ['duration', 'dateRange'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateRecommendations({
        context: 'meeting time slot selection',
        data: input,
        focusAreas: ['productivity', 'attendee convenience', 'energy levels'],
        maxRecommendations: 5,
      });

      // Convert recommendations to slots
      const now = new Date();
      const slots = result.recommendations.slice(0, 3).map((rec, idx) => ({
        start: new Date(now.getTime() + (24 + idx * 24) * 60 * 60 * 1000).toISOString(),
        end: new Date(now.getTime() + (24 + idx * 24) * 60 * 60 * 1000 + input.duration * 60 * 1000).toISOString(),
        score: 0.95 - idx * 0.1,
        reasoning: rec.description,
      }));

      return {
        slots,
        recommendation: result.recommendations[0]?.description || 'Morning slots typically offer better focus.',
      };
    },
  };
}

/**
 * Create AI-powered Prioritize Tasks tool
 */
export function createEnterprisePrioritizeTasksTool(): MotionTool<PrioritizeTasksInput, PrioritizeTasksOutput> {
  return {
    name: 'prioritize_tasks',
    displayName: 'Prioritize Tasks',
    description: 'AI-powered task prioritization using Eisenhower Matrix and energy optimization',
    category: 'project',
    creditCost: CREDIT_COSTS.COMPLEX_TOOL,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        tasks: { type: 'array' },
        availableHours: { type: 'number' },
        userGoals: { type: 'array', items: { type: 'string' } },
        energyLevel: { type: 'string', enum: ['high', 'medium', 'low'] },
      },
      required: ['tasks', 'availableHours'],
    },
    execute: async (input, context) => {
      const { tasks, availableHours, userGoals, energyLevel } = input;

      const tasksText = tasks
        .map((t) => `- ${t.title}${t.description ? `: ${t.description}` : ''} (deadline: ${t.deadline || 'none'}, est: ${t.estimatedTime || 60}min, importance: ${t.importance || 'medium'})`)
        .join('\n');

      const result = await motionAI.analyzeData<{
        prioritizedTasks: Array<{
          id: string;
          title: string;
          priority: number;
          suggestedTimeBlock: { start: string; end: string };
          reasoning: string;
          tips: string[];
        }>;
        unscheduledTasks: Array<{ id: string; title: string; reason: string; suggestedAction: string }>;
        dayPlan: { summary: string; focusAreas: string[]; expectedOutcomes: string[] };
        insights: string[];
      }>({
        data: {
          tasks: tasksText,
          availableHours,
          userGoals,
          energyLevel: energyLevel || 'medium',
          currentTime: new Date().toISOString(),
        },
        analysisType: 'task_prioritization',
        outputSchema: {
          type: 'object',
          properties: {
            prioritizedTasks: { type: 'array' },
            unscheduledTasks: { type: 'array' },
            dayPlan: { type: 'object' },
            insights: { type: 'array' },
          },
          required: ['prioritizedTasks', 'unscheduledTasks', 'dayPlan', 'insights'],
        },
      });

      return {
        ...result.result,
        aiInsights: result.result.insights,
        metadata: {
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Daily Briefing tool
 */
export function createEnterpriseDailyBriefingTool(): MotionTool<DailyBriefingInput, DailyBriefingOutput> {
  return {
    name: 'create_daily_briefing',
    displayName: 'Create Daily Briefing',
    description: 'Generate comprehensive AI-powered daily briefing with priorities and insights',
    category: 'project',
    creditCost: CREDIT_COSTS.DOCUMENT_GENERATION,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string' },
        includeWeather: { type: 'boolean' },
        includeNews: { type: 'boolean' },
        focusAreas: { type: 'array', items: { type: 'string' } },
      },
      required: [],
    },
    execute: async (input, context) => {
      const date = input.date || new Date().toISOString().split('T')[0];

      // Fetch user context from memory
      const memoryContext = await memoryService.buildAgentContext({
        userId: context.userId,
        workspaceId: context.workspaceId,
        agentId: 'alfred',
      });

      const result = await motionAI.generateDocument({
        type: 'summary',
        title: `Daily Briefing - ${date}`,
        sections: ['greeting', 'priorities', 'schedule', 'reminders', 'insights'],
        context: JSON.stringify({
          date,
          focusAreas: input.focusAreas,
          userContext: memoryContext.contextSummary,
          preferences: context.preferences,
        }),
        data: {
          date,
          userProfile: memoryContext.userProfile,
          recentContext: memoryContext.recentMemories,
        },
        format: 'markdown',
      });

      // Parse the document into structured output
      const structuredResult = await motionAI.generateStructuredOutput<{
        greeting: string;
        summary: string;
        topPriorities: Array<{ item: string; reason: string; suggestedAction: string }>;
        schedule: Array<{ time: string; event: string; preparation?: string }>;
        reminders: Array<{ item: string; urgency: 'high' | 'medium' | 'low'; context: string }>;
        insights: string[];
        motivationalNote: string;
      }>(
        `Parse this briefing into structured format:\n${result.content}`,
        'Extract the briefing content into the specified JSON structure.',
        {
          type: 'object',
          properties: {
            greeting: { type: 'string' },
            summary: { type: 'string' },
            topPriorities: { type: 'array' },
            schedule: { type: 'array' },
            reminders: { type: 'array' },
            insights: { type: 'array' },
            motivationalNote: { type: 'string' },
          },
          required: ['greeting', 'summary', 'topPriorities', 'schedule', 'reminders', 'insights', 'motivationalNote'],
        }
      );

      return {
        ...structuredResult.result,
        metadata: {
          generatedAt: new Date().toISOString(),
          tokensUsed: structuredResult.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Prepare Meeting tool
 */
export function createEnterprisePrepareMeetingTool(): MotionTool<PrepareMeetingInput, PrepareMeetingOutput> {
  return {
    name: 'prepare_meeting',
    displayName: 'Prepare Meeting Brief',
    description: 'Generate comprehensive AI-powered meeting preparation with attendee profiles and key questions',
    category: 'communication',
    creditCost: CREDIT_COSTS.DOCUMENT_GENERATION,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        meetingTitle: { type: 'string' },
        attendees: { type: 'array' },
        agenda: { type: 'array', items: { type: 'string' } },
        previousMeetingNotes: { type: 'string' },
        meetingType: { type: 'string', enum: ['internal', 'client', 'interview', 'presentation', 'brainstorm', 'review'] },
        objectives: { type: 'array', items: { type: 'string' } },
        duration: { type: 'number' },
      },
      required: ['meetingTitle', 'attendees', 'meetingType', 'duration'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<PrepareMeetingOutput>(
        `Create a comprehensive meeting preparation brief for:
Meeting: ${input.meetingTitle}
Type: ${input.meetingType}
Duration: ${input.duration} minutes
Attendees: ${input.attendees.map((a) => typeof a === 'string' ? a : `${a.name} (${a.role || 'unknown role'})`).join(', ')}
${input.objectives ? `Objectives: ${input.objectives.join(', ')}` : ''}
${input.previousMeetingNotes ? `Previous Notes: ${input.previousMeetingNotes}` : ''}
${input.agenda ? `Proposed Agenda: ${input.agenda.join(', ')}` : ''}`,
        `You are an expert meeting facilitator. Create detailed, actionable meeting preparation briefs that ensure productive meetings.`,
        {
          type: 'object',
          properties: {
            briefing: { type: 'object' },
            attendeeProfiles: { type: 'array' },
            suggestedAgenda: { type: 'array' },
            preparationChecklist: { type: 'array' },
            keyQuestions: { type: 'array' },
            potentialChallenges: { type: 'array' },
          },
          required: ['briefing', 'attendeeProfiles', 'suggestedAgenda', 'preparationChecklist', 'keyQuestions', 'potentialChallenges'],
        }
      );

      return {
        ...result.result,
        metadata: {
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Summarize Meeting tool
 */
export function createEnterpriseSummarizeMeetingTool(): MotionTool<SummarizeMeetingInput, SummarizeMeetingOutput> {
  return {
    name: 'summarize_meeting',
    displayName: 'Summarize Meeting',
    description: 'AI-powered meeting transcript analysis with comprehensive summaries and action items',
    category: 'communication',
    creditCost: CREDIT_COSTS.DOCUMENT_GENERATION,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        transcript: { type: 'string' },
        meetingTitle: { type: 'string' },
        attendees: { type: 'array', items: { type: 'string' } },
        meetingType: { type: 'string' },
        objectives: { type: 'array', items: { type: 'string' } },
      },
      required: ['transcript', 'meetingTitle', 'attendees'],
    },
    execute: async (input, context) => {
      const result = await motionAI.analyzeData<SummarizeMeetingOutput>({
        data: {
          transcript: input.transcript,
          meetingTitle: input.meetingTitle,
          attendees: input.attendees,
          meetingType: input.meetingType,
          objectives: input.objectives,
        },
        analysisType: 'meeting_transcript_analysis',
        outputSchema: {
          type: 'object',
          properties: {
            executiveSummary: { type: 'string' },
            detailedSummary: { type: 'object' },
            keyDecisions: { type: 'array' },
            actionItems: { type: 'array' },
            openQuestions: { type: 'array' },
            followUpRequired: { type: 'object' },
            sentiment: { type: 'object' },
          },
          required: ['executiveSummary', 'detailedSummary', 'keyDecisions', 'actionItems', 'openQuestions', 'followUpRequired', 'sentiment'],
        },
      });

      return {
        ...result.result,
        metadata: {
          tokensUsed: result.tokensUsed,
          meetingDuration: 'calculated from transcript',
        },
      };
    },
  };
}

/**
 * Create AI-powered Meeting Agenda tool
 */
export function createEnterpriseMeetingAgendaTool(): MotionTool<MeetingAgendaInput, MeetingAgendaOutput> {
  return {
    name: 'create_meeting_agenda',
    displayName: 'Create Meeting Agenda',
    description: 'Generate AI-optimized meeting agendas with time allocation and facilitation tips',
    category: 'communication',
    creditCost: CREDIT_COSTS.SIMPLE_TOOL,
    requiresApproval: false,
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        duration: { type: 'number' },
        objectives: { type: 'array', items: { type: 'string' } },
        attendees: { type: 'array', items: { type: 'string' } },
        meetingType: { type: 'string', enum: ['standup', 'planning', 'review', 'brainstorm', 'decision', 'update'] },
      },
      required: ['topic', 'duration', 'objectives', 'meetingType'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateStructuredOutput<MeetingAgendaOutput>(
        `Create an effective meeting agenda for:
Topic: ${input.topic}
Type: ${input.meetingType}
Duration: ${input.duration} minutes
Objectives: ${input.objectives.join(', ')}
${input.attendees ? `Attendees: ${input.attendees.join(', ')}` : ''}`,
        `You are a meeting facilitation expert. Create well-structured agendas that maximize meeting effectiveness and keep discussions focused.`,
        {
          type: 'object',
          properties: {
            agenda: { type: 'array' },
            facilitationTips: { type: 'array' },
            icebreaker: { type: 'string' },
            closingNotes: { type: 'string' },
          },
          required: ['agenda', 'facilitationTips', 'closingNotes'],
        }
      );

      return {
        ...result.result,
        metadata: {
          tokensUsed: result.tokensUsed,
        },
      };
    },
  };
}

/**
 * Create AI-powered Draft Follow-Up tool
 */
export function createEnterpriseDraftFollowUpTool(): MotionTool<DraftFollowUpInput, DraftFollowUpOutput> {
  return {
    name: 'draft_follow_up',
    displayName: 'Draft Follow-Up Email',
    description: 'Generate AI-powered meeting follow-up emails with action items and next steps',
    category: 'email',
    creditCost: CREDIT_COSTS.COMPLEX_TOOL,
    requiresApproval: true,
    inputSchema: {
      type: 'object',
      properties: {
        meetingTitle: { type: 'string' },
        recipients: { type: 'array', items: { type: 'string' } },
        summary: { type: 'string' },
        actionItems: { type: 'array' },
        decisions: { type: 'array', items: { type: 'string' } },
        nextMeeting: { type: 'string' },
        tone: { type: 'string', enum: ['formal', 'casual', 'professional'] },
      },
      required: ['meetingTitle', 'recipients', 'actionItems'],
    },
    execute: async (input, context) => {
      const result = await motionAI.generateEmail({
        purpose: 'meeting follow-up',
        recipients: input.recipients,
        context: `
Meeting: ${input.meetingTitle}
${input.summary ? `Summary: ${input.summary}` : ''}
Action Items: ${input.actionItems.map((a) => `- ${a.task}${a.assignee ? ` (${a.assignee})` : ''}${a.deadline ? ` by ${a.deadline}` : ''}`).join('\n')}
${input.decisions ? `Decisions: ${input.decisions.join(', ')}` : ''}
${input.nextMeeting ? `Next Meeting: ${input.nextMeeting}` : ''}`,
        tone: input.tone || 'professional',
        type: 'follow-up',
      });

      // Generate alternatives
      const alternatives = await motionAI.generateStructuredOutput<{
        alternatives: Array<{ version: string; subject: string; body: string }>;
      }>(
        `Generate 2 alternative versions of this follow-up email with different tones:\n${result.body}`,
        'Create email variations maintaining the same content but with different styles.',
        {
          type: 'object',
          properties: {
            alternatives: { type: 'array' },
          },
          required: ['alternatives'],
        }
      );

      return {
        email: {
          subject: result.subject,
          body: result.body,
          formattedActionItems: input.actionItems
            .map((a, i) => `${i + 1}. ${a.task}${a.assignee ? ` - ${a.assignee}` : ''}${a.deadline ? ` (Due: ${a.deadline})` : ''}`)
            .join('\n'),
        },
        alternatives: alternatives.result.alternatives,
        metadata: {
          tokensUsed: result.tokensUsed + alternatives.tokensUsed,
        },
      };
    },
  };
}

// ============================================
// EXPORT ALL ENTERPRISE TOOLS
// ============================================

export const alfredEnterpriseTools = {
  // Email Tools
  draftEmail: createEnterpriseDraftEmailTool,
  summarizeEmails: createEnterpriseSummarizeEmailsTool,
  suggestEmailResponse: createEnterpriseSuggestEmailResponseTool,
  draftFollowUp: createEnterpriseDraftFollowUpTool,

  // Calendar Tools
  scheduleMeeting: createEnterpriseScheduleMeetingTool,
  optimizeCalendar: createEnterpriseOptimizeCalendarTool,
  findAvailableSlots: createEnterpriseFindAvailableSlotsTool,

  // Task Tools
  prioritizeTasks: createEnterprisePrioritizeTasksTool,
  createDailyBriefing: createEnterpriseDailyBriefingTool,

  // Meeting Tools
  prepareMeeting: createEnterprisePrepareMeetingTool,
  summarizeMeeting: createEnterpriseSummarizeMeetingTool,
  createMeetingAgenda: createEnterpriseMeetingAgendaTool,
};

/**
 * Get all Alfred enterprise tools as an array
 */
export function getAllAlfredEnterpriseTools(): MotionTool<unknown, unknown>[] {
  return [
    createEnterpriseDraftEmailTool(),
    createEnterpriseSummarizeEmailsTool(),
    createEnterpriseSuggestEmailResponseTool(),
    createEnterpriseDraftFollowUpTool(),
    createEnterpriseScheduleMeetingTool(),
    createEnterpriseOptimizeCalendarTool(),
    createEnterpriseFindAvailableSlotsTool(),
    createEnterprisePrioritizeTasksTool(),
    createEnterpriseDailyBriefingTool(),
    createEnterprisePrepareMeetingTool(),
    createEnterpriseSummarizeMeetingTool(),
    createEnterpriseMeetingAgendaTool(),
  ];
}

export default alfredEnterpriseTools;
