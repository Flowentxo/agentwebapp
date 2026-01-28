/**
 * AlfredAgent - Executive Assistant AI Agent
 *
 * Inspired by Usemotion's Alfred AI Employee
 * Manages emails, calendar, meetings, and daily operations
 *
 * ENTERPRISE VERSION - All tools use real AI processing
 * NO MOCKS - Powered by MotionAIService
 *
 * Features:
 * - AI-powered email drafting and management
 * - Intelligent calendar optimization and scheduling
 * - Smart meeting preparation and follow-ups
 * - AI-driven task prioritization
 * - Travel planning assistance
 * - Document organization
 */

import { UserCheck } from 'lucide-react';
import { MotionBaseAgent } from '../shared/MotionBaseAgent';
import { AgentContext, AgentResponse, ConversationMessage } from '@/lib/agents/shared/types';
import {
  MotionAgentContext,
  MotionTool,
  MotionAgentId,
  AgentCategory,
  JSONSchemaDefinition,
} from '../shared/types';
import { CREDIT_COSTS, TOOL_CATEGORIES } from '../shared/constants';
import { MOTION_AGENTS } from '../config';
import { motionAI } from '../services/MotionAIService';
import { memoryService } from '../services/MemoryService';
import { getAllAlfredEnterpriseTools } from './AlfredEnterpriseTools';

// ============================================
// ALFRED TOOL INPUT/OUTPUT TYPES
// ============================================

// Email Tools
interface DraftEmailInput {
  to: string[];
  cc?: string[];
  subject: string;
  context: string;
  tone?: 'formal' | 'casual' | 'friendly' | 'professional';
  includeSignature?: boolean;
}

interface DraftEmailOutput {
  subject: string;
  body: string;
  suggestedFollowUp?: string;
}

interface SummarizeEmailsInput {
  emails: Array<{
    from: string;
    subject: string;
    body: string;
    date: string;
  }>;
  maxSummaryLength?: number;
}

interface SummarizeEmailsOutput {
  summary: string;
  actionItems: string[];
  urgentItems: string[];
  responseNeeded: Array<{
    from: string;
    subject: string;
    priority: 'high' | 'medium' | 'low';
  }>;
}

// Calendar Tools
interface ScheduleMeetingInput {
  title: string;
  attendees: string[];
  duration: number; // minutes
  preferredTimes?: string[];
  description?: string;
  location?: string;
  isVirtual?: boolean;
}

interface ScheduleMeetingOutput {
  success: boolean;
  meetingId?: string;
  scheduledTime?: string;
  meetingLink?: string;
  conflictsFound?: string[];
  alternativeTimes?: string[];
}

interface OptimizeCalendarInput {
  date: string;
  preferences?: {
    focusTimeBlocks?: boolean;
    meetingBatching?: boolean;
    bufferBetweenMeetings?: number;
  };
}

interface OptimizeCalendarOutput {
  originalSchedule: Array<{
    time: string;
    event: string;
  }>;
  optimizedSchedule: Array<{
    time: string;
    event: string;
    change?: string;
  }>;
  suggestions: string[];
  focusTimeGained?: number;
}

// Task Tools
interface PrioritizeTasksInput {
  tasks: Array<{
    id: string;
    title: string;
    deadline?: string;
    estimatedTime?: number;
    importance?: 'high' | 'medium' | 'low';
  }>;
  availableHours?: number;
}

interface PrioritizeTasksOutput {
  prioritizedTasks: Array<{
    id: string;
    title: string;
    priority: number;
    suggestedTime?: string;
    reasoning: string;
  }>;
  unscheduledTasks: string[];
  recommendations: string[];
}

// Meeting Tools
interface PrepareMeetingInput {
  meetingTitle: string;
  attendees: string[];
  agenda?: string[];
  previousMeetingNotes?: string;
  context?: string;
}

interface PrepareMeetingOutput {
  briefing: string;
  keyPoints: string[];
  suggestedQuestions: string[];
  attendeeInfo: Array<{
    name: string;
    role?: string;
    lastInteraction?: string;
  }>;
  suggestedAgenda: string[];
}

interface SummarizeMeetingInput {
  transcript: string;
  meetingTitle: string;
  attendees: string[];
}

interface SummarizeMeetingOutput {
  summary: string;
  keyDecisions: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
    deadline?: string;
  }>;
  followUpRequired: boolean;
  suggestedFollowUpEmail?: string;
}

// ============================================
// ALFRED AGENT CLASS
// ============================================

export class AlfredAgent extends MotionBaseAgent {
  // Required BaseAgent properties
  readonly id = 'alfred';
  readonly name = 'Alfred';
  readonly description = 'Your personal executive assistant who manages emails, calendar, meetings, and daily operations with precision and efficiency.';
  readonly version = '1.0.0';
  readonly category = 'operations';
  readonly icon = 'UserCheck';
  readonly color = '#6366F1';

  // Motion-specific properties
  readonly motionId: MotionAgentId = 'alfred';
  readonly role = 'Executive Assistant';
  readonly agentCategory: AgentCategory = 'operations';
  readonly specialties = [
    'Email Management & Drafting',
    'Calendar Optimization',
    'Meeting Scheduling & Prep',
    'Task Prioritization',
    'Travel Planning',
    'Document Organization',
  ];
  readonly lucideIcon = UserCheck;

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
    // Called by BaseAgent constructor, but we use registerMotionTools
  }

  protected registerMotionTools(): void {
    // Register all Enterprise AI-powered tools
    // NO MOCKS - All tools use real AI processing via MotionAIService
    const enterpriseTools = getAllAlfredEnterpriseTools();

    for (const tool of enterpriseTools) {
      this.registerMotionTool(tool as MotionTool<unknown, unknown>);
    }

    console.log(`[ALFRED] Registered ${enterpriseTools.length} enterprise AI-powered tools`);
  }

  // Legacy tool creators preserved for backwards compatibility
  // These are no longer used - Enterprise tools are loaded from AlfredEnterpriseTools.ts

  private registerLegacyTools(): void {
    // Email Tools
    this.registerMotionTool(this.createDraftEmailTool());
    this.registerMotionTool(this.createSummarizeEmailsTool());
    this.registerMotionTool(this.createSuggestEmailResponseTool());

    // Calendar Tools
    this.registerMotionTool(this.createScheduleMeetingTool());
    this.registerMotionTool(this.createOptimizeCalendarTool());
    this.registerMotionTool(this.createFindAvailableSlotsTool());

    // Task Tools
    this.registerMotionTool(this.createPrioritizeTasksTool());
    this.registerMotionTool(this.createCreateDailyBriefingTool());

    // Meeting Tools
    this.registerMotionTool(this.createPrepareMeetingTool());
    this.registerMotionTool(this.createSummarizeMeetingTool());
    this.registerMotionTool(this.createCreateMeetingAgendaTool());
    this.registerMotionTool(this.createDraftFollowUpTool());
  }

  // ============================================
  // EMAIL TOOLS
  // ============================================

  private createDraftEmailTool(): MotionTool<DraftEmailInput, DraftEmailOutput> {
    return {
      name: 'draft_email',
      displayName: 'Draft Email',
      description: 'Draft a professional email based on context and recipient',
      category: 'email',
      creditCost: CREDIT_COSTS.COMPLEX_TOOL,
      requiresApproval: true, // Requires approval before sending
      requiredIntegrations: ['gmail'],
      inputSchema: {
        type: 'object',
        properties: {
          to: {
            type: 'array',
            items: { type: 'string' },
            description: 'Email recipients',
          },
          cc: {
            type: 'array',
            items: { type: 'string' },
            description: 'CC recipients',
          },
          subject: {
            type: 'string',
            description: 'Email subject',
          },
          context: {
            type: 'string',
            description: 'Context or purpose of the email',
          },
          tone: {
            type: 'string',
            enum: ['formal', 'casual', 'friendly', 'professional'],
            description: 'Desired tone of the email',
          },
          includeSignature: {
            type: 'boolean',
            description: 'Whether to include email signature',
          },
        },
        required: ['to', 'subject', 'context'],
      },
      execute: async (input, context) => {
        // In production, this would use OpenAI to generate the email
        const { to, cc, subject, context: emailContext, tone = 'professional', includeSignature = true } = input;

        // Simulate email generation
        const body = this.generateEmailBody(emailContext, tone);

        return {
          subject,
          body: includeSignature ? `${body}\n\nBest regards,\n${context.preferences?.defaultEmailSignature || 'Your signature'}` : body,
          suggestedFollowUp: 'Follow up in 3 days if no response',
        };
      },
    };
  }

  private createSummarizeEmailsTool(): MotionTool<SummarizeEmailsInput, SummarizeEmailsOutput> {
    return {
      name: 'summarize_emails',
      displayName: 'Summarize Emails',
      description: 'Summarize a batch of emails and extract action items',
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
              },
            },
            description: 'Emails to summarize',
          },
          maxSummaryLength: {
            type: 'number',
            description: 'Maximum length of summary in words',
          },
        },
        required: ['emails'],
      },
      execute: async (input, context) => {
        const { emails, maxSummaryLength = 200 } = input;

        // Analyze emails and generate summary
        const summary = `You have ${emails.length} emails to review. Key topics include: ${emails.map(e => e.subject).slice(0, 3).join(', ')}.`;

        const actionItems = emails
          .filter(e => e.body.toLowerCase().includes('action') || e.body.toLowerCase().includes('please'))
          .map(e => `Review: ${e.subject} from ${e.from}`);

        const urgentItems = emails
          .filter(e => e.subject.toLowerCase().includes('urgent') || e.subject.toLowerCase().includes('asap'))
          .map(e => `URGENT: ${e.subject} from ${e.from}`);

        const responseNeeded = emails
          .filter(e => e.body.includes('?'))
          .map(e => ({
            from: e.from,
            subject: e.subject,
            priority: e.subject.toLowerCase().includes('urgent') ? 'high' as const : 'medium' as const,
          }));

        return {
          summary,
          actionItems,
          urgentItems,
          responseNeeded,
        };
      },
    };
  }

  private createSuggestEmailResponseTool(): MotionTool<{ email: { from: string; subject: string; body: string }; responseType: string }, { suggestedResponse: string; alternatives: string[] }> {
    return {
      name: 'suggest_email_response',
      displayName: 'Suggest Email Response',
      description: 'Generate response suggestions for an email',
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
            },
          },
          responseType: {
            type: 'string',
            enum: ['accept', 'decline', 'clarify', 'acknowledge', 'custom'],
          },
        },
        required: ['email', 'responseType'],
      },
      execute: async (input, context) => {
        const { email, responseType } = input;

        const responses: Record<string, string> = {
          accept: `Thank you for reaching out, ${email.from.split('@')[0]}. I would be happy to proceed with this. Please let me know the next steps.`,
          decline: `Thank you for your email. Unfortunately, I won't be able to accommodate this request at this time. I appreciate your understanding.`,
          clarify: `Thank you for your message. Could you please provide more details about the following: [specific points]? This will help me better address your request.`,
          acknowledge: `Thank you for your email. I've received this and will review it shortly. I'll get back to you within [timeframe].`,
          custom: `Thank you for your email regarding "${email.subject}". [Your response here]`,
        };

        return {
          suggestedResponse: responses[responseType] || responses.acknowledge,
          alternatives: [
            responses.accept,
            responses.acknowledge,
          ].filter(r => r !== responses[responseType]),
        };
      },
    };
  }

  // ============================================
  // CALENDAR TOOLS
  // ============================================

  private createScheduleMeetingTool(): MotionTool<ScheduleMeetingInput, ScheduleMeetingOutput> {
    return {
      name: 'schedule_meeting',
      displayName: 'Schedule Meeting',
      description: 'Find optimal time and schedule a meeting with attendees',
      category: 'calendar',
      creditCost: CREDIT_COSTS.COMPLEX_TOOL,
      requiresApproval: true,
      requiredIntegrations: ['calendar'],
      inputSchema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Meeting title' },
          attendees: { type: 'array', items: { type: 'string' } },
          duration: { type: 'number', description: 'Duration in minutes' },
          preferredTimes: { type: 'array', items: { type: 'string' } },
          description: { type: 'string' },
          location: { type: 'string' },
          isVirtual: { type: 'boolean' },
        },
        required: ['title', 'attendees', 'duration'],
      },
      execute: async (input, context) => {
        // In production, integrate with Google Calendar / Outlook API
        const meetingId = crypto.randomUUID();
        const scheduledTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        return {
          success: true,
          meetingId,
          scheduledTime,
          meetingLink: input.isVirtual ? `https://meet.example.com/${meetingId}` : undefined,
          alternativeTimes: [
            new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          ],
        };
      },
    };
  }

  private createOptimizeCalendarTool(): MotionTool<OptimizeCalendarInput, OptimizeCalendarOutput> {
    return {
      name: 'optimize_calendar',
      displayName: 'Optimize Calendar',
      description: 'Analyze and optimize calendar for better productivity',
      category: 'calendar',
      creditCost: CREDIT_COSTS.COMPLEX_TOOL,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date to optimize (YYYY-MM-DD)' },
          preferences: {
            type: 'object',
            properties: {
              focusTimeBlocks: { type: 'boolean' },
              meetingBatching: { type: 'boolean' },
              bufferBetweenMeetings: { type: 'number' },
            },
          },
        },
        required: ['date'],
      },
      execute: async (input, context) => {
        // Simulate calendar optimization
        return {
          originalSchedule: [
            { time: '09:00', event: 'Team Standup' },
            { time: '10:00', event: 'Client Call' },
            { time: '11:30', event: 'Review Meeting' },
            { time: '14:00', event: 'Project Discussion' },
          ],
          optimizedSchedule: [
            { time: '09:00', event: 'Team Standup', change: undefined },
            { time: '09:30', event: 'Client Call', change: 'Moved earlier' },
            { time: '10:30', event: 'Review Meeting', change: 'Moved earlier' },
            { time: '11:00-14:00', event: 'Focus Time Block', change: 'Added' },
            { time: '14:00', event: 'Project Discussion', change: undefined },
          ],
          suggestions: [
            'Batch meetings in the morning to create afternoon focus time',
            'Add 15-minute buffers between back-to-back meetings',
            'Consider moving recurring meetings to batch days',
          ],
          focusTimeGained: 180,
        };
      },
    };
  }

  private createFindAvailableSlotsTool(): MotionTool<{ duration: number; dateRange: { start: string; end: string }; attendees?: string[] }, { slots: Array<{ start: string; end: string; score: number }> }> {
    return {
      name: 'find_available_slots',
      displayName: 'Find Available Time Slots',
      description: 'Find available time slots for meetings',
      category: 'calendar',
      creditCost: CREDIT_COSTS.SIMPLE_TOOL,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          duration: { type: 'number', description: 'Required duration in minutes' },
          dateRange: {
            type: 'object',
            properties: {
              start: { type: 'string' },
              end: { type: 'string' },
            },
          },
          attendees: { type: 'array', items: { type: 'string' } },
        },
        required: ['duration', 'dateRange'],
      },
      execute: async (input, context) => {
        // Simulate finding available slots
        const now = new Date();
        return {
          slots: [
            {
              start: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
              end: new Date(now.getTime() + 24 * 60 * 60 * 1000 + input.duration * 60 * 1000).toISOString(),
              score: 0.95,
            },
            {
              start: new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(),
              end: new Date(now.getTime() + 48 * 60 * 60 * 1000 + input.duration * 60 * 1000).toISOString(),
              score: 0.85,
            },
          ],
        };
      },
    };
  }

  // ============================================
  // TASK TOOLS
  // ============================================

  private createPrioritizeTasksTool(): MotionTool<PrioritizeTasksInput, PrioritizeTasksOutput> {
    return {
      name: 'prioritize_tasks',
      displayName: 'Prioritize Tasks',
      description: 'Analyze and prioritize tasks based on urgency and importance',
      category: 'project',
      creditCost: CREDIT_COSTS.COMPLEX_TOOL,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          tasks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                title: { type: 'string' },
                deadline: { type: 'string' },
                estimatedTime: { type: 'number' },
                importance: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
          availableHours: { type: 'number' },
        },
        required: ['tasks'],
      },
      execute: async (input, context) => {
        const { tasks, availableHours = 8 } = input;

        // Score and prioritize tasks
        const scored = tasks.map((task, idx) => {
          let score = 0;
          if (task.importance === 'high') score += 3;
          if (task.importance === 'medium') score += 2;
          if (task.importance === 'low') score += 1;
          if (task.deadline) {
            const daysUntil = Math.ceil((new Date(task.deadline).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
            if (daysUntil <= 1) score += 5;
            else if (daysUntil <= 3) score += 3;
            else if (daysUntil <= 7) score += 1;
          }
          return { ...task, score, originalIdx: idx };
        });

        scored.sort((a, b) => b.score - a.score);

        let hoursUsed = 0;
        const prioritized = [];
        const unscheduled = [];

        for (const task of scored) {
          const taskHours = (task.estimatedTime || 60) / 60;
          if (hoursUsed + taskHours <= availableHours) {
            prioritized.push({
              id: task.id,
              title: task.title,
              priority: prioritized.length + 1,
              suggestedTime: `${Math.floor(hoursUsed)}:${((hoursUsed % 1) * 60).toString().padStart(2, '0')}`,
              reasoning: task.importance === 'high' ? 'High importance task' : task.deadline ? 'Upcoming deadline' : 'Standard priority',
            });
            hoursUsed += taskHours;
          } else {
            unscheduled.push(task.id);
          }
        }

        return {
          prioritizedTasks: prioritized,
          unscheduledTasks: unscheduled,
          recommendations: [
            prioritized.length < tasks.length ? 'Consider delegating or rescheduling lower priority tasks' : 'All tasks can be completed today',
            'Start with the highest priority items in the morning',
            'Block 25% of your time for unexpected tasks',
          ],
        };
      },
    };
  }

  private createCreateDailyBriefingTool(): MotionTool<{ date?: string }, { briefing: string; topPriorities: string[]; schedule: Array<{ time: string; event: string }>; reminders: string[] }> {
    return {
      name: 'create_daily_briefing',
      displayName: 'Create Daily Briefing',
      description: 'Generate a comprehensive daily briefing with schedule and priorities',
      category: 'project',
      creditCost: CREDIT_COSTS.DOCUMENT_GENERATION,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date for briefing (defaults to today)' },
        },
        required: [],
      },
      execute: async (input, context) => {
        const date = input.date || new Date().toISOString().split('T')[0];

        return {
          briefing: `Good morning! Here's your briefing for ${date}. You have 4 meetings scheduled today, with 3 high-priority tasks to complete. Your first meeting is at 9:00 AM.`,
          topPriorities: [
            'Complete Q4 budget review',
            'Prepare for client presentation',
            'Review team performance reports',
          ],
          schedule: [
            { time: '09:00', event: 'Team Standup (15 min)' },
            { time: '10:00', event: 'Client Call - Acme Corp (1 hour)' },
            { time: '13:00', event: 'Lunch with Marketing Lead' },
            { time: '15:00', event: 'Project Review (2 hours)' },
          ],
          reminders: [
            'Send follow-up email to John (pending 2 days)',
            'Review contract before 3 PM meeting',
            'Prepare expense report by end of week',
          ],
        };
      },
    };
  }

  // ============================================
  // MEETING TOOLS
  // ============================================

  private createPrepareMeetingTool(): MotionTool<PrepareMeetingInput, PrepareMeetingOutput> {
    return {
      name: 'prepare_meeting',
      displayName: 'Prepare Meeting Brief',
      description: 'Create a comprehensive meeting preparation brief',
      category: 'communication',
      creditCost: CREDIT_COSTS.DOCUMENT_GENERATION,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          meetingTitle: { type: 'string' },
          attendees: { type: 'array', items: { type: 'string' } },
          agenda: { type: 'array', items: { type: 'string' } },
          previousMeetingNotes: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['meetingTitle', 'attendees'],
      },
      execute: async (input, context) => {
        const { meetingTitle, attendees, agenda, previousMeetingNotes, context: meetingContext } = input;

        return {
          briefing: `Meeting: ${meetingTitle}\nAttendees: ${attendees.join(', ')}\n\n${meetingContext || 'Standard meeting preparation.'}`,
          keyPoints: [
            'Review action items from last meeting',
            'Discuss current progress and blockers',
            'Align on next steps and timelines',
          ],
          suggestedQuestions: [
            'What are the main blockers we need to address?',
            'Are we on track to meet our deadlines?',
            'What resources do we need to proceed?',
          ],
          attendeeInfo: attendees.map(a => ({
            name: a,
            role: 'Team Member',
            lastInteraction: '3 days ago',
          })),
          suggestedAgenda: agenda || [
            'Opening and introductions (5 min)',
            'Review of previous action items (10 min)',
            'Main discussion topics (30 min)',
            'Next steps and action items (10 min)',
            'Q&A and closing (5 min)',
          ],
        };
      },
    };
  }

  private createSummarizeMeetingTool(): MotionTool<SummarizeMeetingInput, SummarizeMeetingOutput> {
    return {
      name: 'summarize_meeting',
      displayName: 'Summarize Meeting',
      description: 'Generate meeting summary with action items from transcript',
      category: 'communication',
      creditCost: CREDIT_COSTS.DOCUMENT_GENERATION,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          transcript: { type: 'string' },
          meetingTitle: { type: 'string' },
          attendees: { type: 'array', items: { type: 'string' } },
        },
        required: ['transcript', 'meetingTitle', 'attendees'],
      },
      execute: async (input, context) => {
        const { transcript, meetingTitle, attendees } = input;

        // In production, use AI to analyze transcript
        return {
          summary: `Meeting "${meetingTitle}" with ${attendees.length} participants. Key discussions covered project updates, timeline adjustments, and resource allocation.`,
          keyDecisions: [
            'Approved new project timeline',
            'Allocated additional resources to Phase 2',
            'Scheduled follow-up for next week',
          ],
          actionItems: [
            { task: 'Update project plan', assignee: attendees[0], deadline: 'End of week' },
            { task: 'Send updated requirements', assignee: attendees[1], deadline: 'Tomorrow' },
            { task: 'Schedule stakeholder review', assignee: attendees[0], deadline: 'Next Monday' },
          ],
          followUpRequired: true,
          suggestedFollowUpEmail: `Subject: Meeting Summary - ${meetingTitle}\n\nHi team,\n\nThank you for attending today's meeting. Here's a summary of our key decisions and action items...\n\nBest regards`,
        };
      },
    };
  }

  private createCreateMeetingAgendaTool(): MotionTool<{ topic: string; duration: number; objectives: string[] }, { agenda: Array<{ time: string; item: string; owner?: string }> }> {
    return {
      name: 'create_meeting_agenda',
      displayName: 'Create Meeting Agenda',
      description: 'Generate a structured meeting agenda',
      category: 'communication',
      creditCost: CREDIT_COSTS.SIMPLE_TOOL,
      requiresApproval: false,
      inputSchema: {
        type: 'object',
        properties: {
          topic: { type: 'string' },
          duration: { type: 'number', description: 'Duration in minutes' },
          objectives: { type: 'array', items: { type: 'string' } },
        },
        required: ['topic', 'duration', 'objectives'],
      },
      execute: async (input, context) => {
        const { topic, duration, objectives } = input;
        const timePerItem = Math.floor((duration - 10) / (objectives.length + 2)); // Reserve time for intro/outro

        const agenda = [
          { time: '0-5 min', item: 'Welcome and introductions' },
          ...objectives.map((obj, idx) => ({
            time: `${5 + idx * timePerItem}-${5 + (idx + 1) * timePerItem} min`,
            item: obj,
          })),
          { time: `${duration - 5}-${duration} min`, item: 'Summary and next steps' },
        ];

        return { agenda };
      },
    };
  }

  private createDraftFollowUpTool(): MotionTool<{ meetingTitle: string; recipients: string[]; actionItems: string[]; nextMeeting?: string }, { email: { subject: string; body: string } }> {
    return {
      name: 'draft_follow_up',
      displayName: 'Draft Follow-Up Email',
      description: 'Draft a follow-up email after a meeting',
      category: 'email',
      creditCost: CREDIT_COSTS.COMPLEX_TOOL,
      requiresApproval: true,
      inputSchema: {
        type: 'object',
        properties: {
          meetingTitle: { type: 'string' },
          recipients: { type: 'array', items: { type: 'string' } },
          actionItems: { type: 'array', items: { type: 'string' } },
          nextMeeting: { type: 'string' },
        },
        required: ['meetingTitle', 'recipients', 'actionItems'],
      },
      execute: async (input, context) => {
        const { meetingTitle, recipients, actionItems, nextMeeting } = input;

        const actionItemsList = actionItems.map((item, idx) => `${idx + 1}. ${item}`).join('\n');

        return {
          email: {
            subject: `Follow-up: ${meetingTitle}`,
            body: `Hi team,

Thank you for your time in today's meeting. Here's a summary of our action items:

${actionItemsList}

${nextMeeting ? `Our next meeting is scheduled for ${nextMeeting}.` : 'I will send a calendar invite for our next meeting shortly.'}

Please let me know if you have any questions.

Best regards`,
          },
        };
      },
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private generateEmailBody(context: string, tone: string): string {
    const toneStyles: Record<string, { greeting: string; closing: string }> = {
      formal: { greeting: 'Dear', closing: 'Sincerely' },
      casual: { greeting: 'Hey', closing: 'Cheers' },
      friendly: { greeting: 'Hi', closing: 'Thanks' },
      professional: { greeting: 'Hello', closing: 'Best regards' },
    };

    const style = toneStyles[tone] || toneStyles.professional;

    return `${style.greeting},

I hope this email finds you well.

${context}

Please let me know if you have any questions or need further information.

${style.closing},`;
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
      // Get system prompt
      const systemPrompt = this.getSystemPrompt();

      // Build context from memory service
      const memoryContext = await memoryService.buildAgentContext({
        userId: context.userId || 'default-user',
        workspaceId: context.workspaceId || 'default-workspace',
        agentId: this.motionId,
      });

      // Enrich system prompt with user context
      const enrichedSystemPrompt = `${systemPrompt}

USER CONTEXT:
- User Profile: ${memoryContext.userProfile.name || 'Unknown User'}
- Communication Style: ${memoryContext.userProfile.communicationStyle || 'professional'}
- Recent Context: ${memoryContext.contextSummary || 'No recent context'}
${memoryContext.userProfile.preferences ? `- Preferences: ${JSON.stringify(memoryContext.userProfile.preferences)}` : ''}`;

      // Build conversation messages
      const messages = [
        { role: 'system' as const, content: enrichedSystemPrompt },
        ...(conversationHistory || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      // Generate AI response using MotionAIService
      const aiResponse = await motionAI.generateContent(
        message,
        enrichedSystemPrompt,
        {
          style: 'professional',
          format: 'text',
        }
      );

      // Store conversation in memory for context building
      await memoryService.storeConversation(
        {
          userId: context.userId || 'default-user',
          workspaceId: context.workspaceId || 'default-workspace',
          agentId: this.motionId,
        },
        context.sessionId || crypto.randomUUID(),
        [
          ...(conversationHistory || []),
          { role: 'user', content: message },
          { role: 'assistant', content: aiResponse.content },
        ]
      );

      return {
        success: true,
        data: aiResponse.content,
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
          toolsUsed: [],
          correlationId: crypto.randomUUID(),
          tokensUsed: aiResponse.metadata.tokensUsed,
          model: 'enterprise-ai',
        },
      };
    } catch (error) {
      console.error('[ALFRED] Chat error:', error);
      return {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : String(error),
          retryable: true,
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
    return `You are Alfred, an expert Executive Assistant AI.

YOUR ROLE:
- Manage emails, calendar, and daily operations with precision
- Schedule and optimize meetings for maximum productivity
- Draft professional communications in the appropriate tone
- Prioritize tasks and create actionable daily plans
- Prepare meeting briefs and generate follow-up summaries

YOUR PERSONALITY:
- Professional, efficient, and anticipatory
- Proactive in identifying needs before they're expressed
- Detail-oriented with excellent organizational skills
- Warm but business-appropriate in communications

YOUR SPECIALTIES:
${this.specialties.map(s => `- ${s}`).join('\n')}

AVAILABLE TOOLS:
${this.getMotionTools().map(t => `- ${t.displayName}: ${t.description}`).join('\n')}

GUIDELINES:
1. Always confirm understanding before taking action
2. Ask clarifying questions when needed
3. Provide options when multiple approaches are viable
4. Be proactive in suggesting optimizations
5. Respect user preferences for communication style and working hours

When drafting communications, match the user's preferred tone and style. When scheduling, consider time zones, working hours, and buffer time between meetings.`;
  }

  // ============================================
  // CONTEXT ENRICHMENT
  // ============================================

  protected async getAgentSpecificContext(context: MotionAgentContext): Promise<Record<string, unknown>> {
    return {
      agentRole: 'Executive Assistant',
      availableTools: this.getMotionTools().map(t => t.name),
      userPreferences: context.preferences,
      connectedIntegrations: context.integrations.filter(i => i.isConnected).map(i => i.provider),
    };
  }
}

// Export singleton instance
export const alfredAgent = new AlfredAgent();

export default AlfredAgent;
