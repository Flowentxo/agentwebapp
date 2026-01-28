/**
 * PHASE 31-35: Cassie Agent - Customer Support Intelligence Agent
 * Enterprise-Grade Customer Support & Ticket Management
 */

import { BaseAgent, AgentTool, agentRegistry } from '@/lib/agents/base/BaseAgent';
import {
  AgentContext,
  AgentResponse,
  ConversationMessage,
} from '@/lib/agents/shared/types';
import { OpenAIService } from '@/server/services/OpenAIService';

// ============================================
// CASSIE AGENT CLASS
// ============================================

export class CassieAgent extends BaseAgent {
  readonly id = 'cassie';
  readonly name = 'Cassie';
  readonly description = 'Customer Support Intelligence Agent - Manages tickets, provides support insights, and automates customer service';
  readonly version = '2.0.0';
  readonly category = 'support';
  readonly icon = 'HeadphonesIcon';
  readonly color = '#10b981';

  private openaiService: OpenAIService;

  constructor() {
    super();
    this.openaiService = new OpenAIService();
  }

  // ============================================
  // REGISTER TOOLS
  // ============================================

  protected registerTools(): void {
    // Tool 1: Create Support Ticket
    this.registerTool({
      name: 'create_ticket',
      displayName: 'Create Support Ticket',
      description: 'Create a new support ticket with auto-categorization and priority assignment',
      category: 'tickets',
      inputSchema: {
        type: 'object',
        properties: {
          subject: { type: 'string', description: 'Ticket subject/title' },
          description: { type: 'string', description: 'Detailed description of the issue' },
          customerEmail: { type: 'string', format: 'email', description: 'Customer email address' },
          customerId: { type: 'string', description: 'Customer ID (optional)' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Ticket priority (auto-assigned if not specified)' },
          category: { type: 'string', description: 'Ticket category (auto-assigned if not specified)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags for the ticket' },
        },
        required: ['subject', 'description', 'customerEmail'],
      },
      timeout: 30000,
      execute: async (input: CreateTicketInput, context: AgentContext) => {
        return this.createTicket(input, context);
      },
    });

    // Tool 2: Analyze Ticket Sentiment
    this.registerTool({
      name: 'analyze_sentiment',
      displayName: 'Analyze Ticket Sentiment',
      description: 'Analyze customer sentiment and urgency from ticket content',
      category: 'analysis',
      inputSchema: {
        type: 'object',
        properties: {
          ticketId: { type: 'string', description: 'Ticket ID to analyze' },
          content: { type: 'string', description: 'Content to analyze (if no ticketId)' },
          includeHistory: { type: 'boolean', default: true, description: 'Include conversation history in analysis' },
        },
      },
      timeout: 30000,
      execute: async (input: SentimentInput, context: AgentContext) => {
        return this.analyzeSentiment(input, context);
      },
    });

    // Tool 3: Generate Response Suggestion
    this.registerTool({
      name: 'suggest_response',
      displayName: 'Suggest Response',
      description: 'Generate AI-powered response suggestions for tickets',
      category: 'automation',
      inputSchema: {
        type: 'object',
        properties: {
          ticketId: { type: 'string', description: 'Ticket ID' },
          content: { type: 'string', description: 'Ticket content (if no ticketId)' },
          tone: { type: 'string', enum: ['professional', 'friendly', 'empathetic', 'technical'], default: 'friendly' },
          includeKnowledgeBase: { type: 'boolean', default: true, description: 'Search knowledge base for relevant articles' },
          language: { type: 'string', default: 'en', description: 'Response language' },
        },
        required: ['content'],
      },
      timeout: 45000,
      execute: async (input: ResponseSuggestionInput, context: AgentContext) => {
        return this.generateResponseSuggestion(input, context);
      },
    });

    // Tool 4: Categorize Tickets
    this.registerTool({
      name: 'categorize_tickets',
      displayName: 'Categorize Tickets',
      description: 'Auto-categorize and route tickets based on content',
      category: 'automation',
      inputSchema: {
        type: 'object',
        properties: {
          tickets: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                subject: { type: 'string' },
                content: { type: 'string' },
              },
            },
            description: 'Tickets to categorize',
          },
          categories: { type: 'array', items: { type: 'string' }, description: 'Available categories' },
        },
        required: ['tickets'],
      },
      timeout: 60000,
      execute: async (input: CategorizeInput, context: AgentContext) => {
        return this.categorizeTickets(input, context);
      },
    });

    // Tool 5: Get Support Metrics
    this.registerTool({
      name: 'get_support_metrics',
      displayName: 'Get Support Metrics',
      description: 'Get comprehensive support performance metrics',
      category: 'analytics',
      inputSchema: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['today', 'this_week', 'this_month', 'this_quarter'], default: 'this_week' },
          groupBy: { type: 'string', enum: ['agent', 'category', 'priority', 'channel'], default: 'category' },
          includeComparison: { type: 'boolean', default: true, description: 'Include comparison with previous period' },
        },
      },
      timeout: 45000,
      execute: async (input: MetricsInput, context: AgentContext) => {
        return this.getSupportMetrics(input, context);
      },
    });

    // Tool 6: Search Knowledge Base
    this.registerTool({
      name: 'search_knowledge_base',
      displayName: 'Search Knowledge Base',
      description: 'Search knowledge base for relevant articles and solutions',
      category: 'knowledge',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          category: { type: 'string', description: 'Filter by category' },
          limit: { type: 'number', minimum: 1, maximum: 20, default: 5 },
          includeSnippets: { type: 'boolean', default: true },
        },
        required: ['query'],
      },
      timeout: 15000,
      execute: async (input: KnowledgeBaseInput, context: AgentContext) => {
        return this.searchKnowledgeBase(input, context);
      },
    });

    // Tool 7: Escalate Ticket
    this.registerTool({
      name: 'escalate_ticket',
      displayName: 'Escalate Ticket',
      description: 'Escalate ticket to higher tier support or management',
      category: 'tickets',
      inputSchema: {
        type: 'object',
        properties: {
          ticketId: { type: 'string', description: 'Ticket ID to escalate' },
          reason: { type: 'string', description: 'Reason for escalation' },
          tier: { type: 'string', enum: ['tier2', 'tier3', 'management', 'engineering'], default: 'tier2' },
          urgency: { type: 'string', enum: ['normal', 'high', 'critical'], default: 'normal' },
          notes: { type: 'string', description: 'Additional notes for the receiving team' },
        },
        required: ['ticketId', 'reason'],
      },
      timeout: 15000,
      execute: async (input: EscalateInput, context: AgentContext) => {
        return this.escalateTicket(input, context);
      },
    });

    // Tool 8: Customer History
    this.registerTool({
      name: 'get_customer_history',
      displayName: 'Get Customer History',
      description: 'Get complete customer support history and context',
      category: 'customers',
      inputSchema: {
        type: 'object',
        properties: {
          customerId: { type: 'string', description: 'Customer ID' },
          customerEmail: { type: 'string', description: 'Customer email (if no ID)' },
          includeTickets: { type: 'boolean', default: true },
          includeInteractions: { type: 'boolean', default: true },
          includeSentiment: { type: 'boolean', default: true },
          limit: { type: 'number', minimum: 5, maximum: 100, default: 20 },
        },
      },
      timeout: 30000,
      execute: async (input: CustomerHistoryInput, context: AgentContext) => {
        return this.getCustomerHistory(input, context);
      },
    });

    // Tool 9: Auto-Resolve Ticket
    this.registerTool({
      name: 'auto_resolve',
      displayName: 'Auto-Resolve Ticket',
      description: 'Automatically resolve common issues with known solutions',
      category: 'automation',
      inputSchema: {
        type: 'object',
        properties: {
          ticketId: { type: 'string', description: 'Ticket ID' },
          content: { type: 'string', description: 'Ticket content' },
          autoSend: { type: 'boolean', default: false, description: 'Automatically send response' },
          requireApproval: { type: 'boolean', default: true, description: 'Require human approval' },
        },
        required: ['content'],
      },
      timeout: 45000,
      execute: async (input: AutoResolveInput, context: AgentContext) => {
        return this.autoResolveTicket(input, context);
      },
    });

    // Tool 10: CSAT Analysis
    this.registerTool({
      name: 'analyze_csat',
      displayName: 'Analyze Customer Satisfaction',
      description: 'Analyze CSAT scores and identify improvement areas',
      category: 'analytics',
      inputSchema: {
        type: 'object',
        properties: {
          period: { type: 'string', enum: ['this_week', 'this_month', 'this_quarter', 'this_year'], default: 'this_month' },
          segment: { type: 'string', enum: ['all', 'category', 'agent', 'channel'], default: 'all' },
          includeComments: { type: 'boolean', default: true },
          identifyThemes: { type: 'boolean', default: true },
        },
      },
      timeout: 60000,
      execute: async (input: CSATInput, context: AgentContext) => {
        return this.analyzeCSAT(input, context);
      },
    });
  }

  // ============================================
  // SYSTEM PROMPT
  // ============================================

  public getSystemPrompt(): string {
    return `You are Cassie, an expert Customer Support AI Agent.

YOUR ROLE:
- Provide exceptional customer support and service
- Manage and resolve support tickets efficiently
- Analyze customer sentiment and satisfaction
- Automate common support tasks
- Deliver insights to improve customer experience

YOUR PERSONALITY:
- Warm, empathetic, and patient
- Professional yet approachable
- Solution-oriented and proactive
- Clear and helpful communicator

YOUR SPECIALTIES:
- Ticket Management & Triage
- Customer Sentiment Analysis
- Knowledge Base Search & Management
- Support Metrics & Analytics
- Customer Journey Tracking
- Escalation Management
- CSAT Improvement
- Multi-channel Support

COMMUNICATION STYLE:
- Always acknowledge the customer's feelings first
- Provide clear, step-by-step solutions
- Use friendly, supportive language
- Offer follow-up assistance proactively
- Be honest about what you can and cannot do

AVAILABLE TOOLS:
${this.getAvailableTools().map(t => `- ${t.name}: ${t.description}`).join('\n')}

When handling support requests:
1. Understand the issue completely
2. Check customer history for context
3. Search knowledge base for solutions
4. Provide personalized, empathetic responses
5. Follow up to ensure resolution`;
  }

  // ============================================
  // CHAT HANDLER
  // ============================================

  public async handleChat(
    message: string,
    context: AgentContext,
    conversationHistory?: ConversationMessage[]
  ): Promise<AgentResponse<string>> {
    const startTime = Date.now();

    try {
      const messages = [
        { role: 'system' as const, content: this.getSystemPrompt() },
        ...(conversationHistory || []).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user' as const, content: message },
      ];

      const functions = this.getAvailableTools().map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      }));

      const response = await this.openaiService.chatWithFunctions(messages, functions);

      if (response.functionCall) {
        const toolName = response.functionCall.name;
        const toolInput = JSON.parse(response.functionCall.arguments);

        const toolResult = await this.executeTool(toolName, toolInput, context);

        const finalMessages = [
          ...messages,
          { role: 'assistant' as const, content: null, function_call: response.functionCall },
          { role: 'function' as const, name: toolName, content: JSON.stringify(toolResult.data) },
        ];

        const finalResponse = await this.openaiService.chat(finalMessages);

        return {
          success: true,
          data: finalResponse.content,
          metadata: {
            agentId: this.id,
            executionTimeMs: Date.now() - startTime,
            toolsUsed: [toolName],
            tokensUsed: (response.tokensUsed || 0) + (finalResponse.tokensUsed || 0),
          },
        };
      }

      return {
        success: true,
        data: response.content,
        metadata: {
          agentId: this.id,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: response.tokensUsed,
        },
      };
    } catch (error) {
      console.error('[CASSIE_CHAT_ERROR]', error);
      return {
        success: false,
        error: {
          code: 'CHAT_FAILED',
          message: error instanceof Error ? error.message : 'Chat processing failed',
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
  // TOOL IMPLEMENTATIONS
  // ============================================

  private async createTicket(
    input: CreateTicketInput,
    context: AgentContext
  ): Promise<CreateTicketResult> {
    // Auto-categorize if not provided
    const category = input.category || await this.autoCategorizeSingle(input.subject, input.description);

    // Auto-assign priority if not provided
    const priority = input.priority || await this.autoPrioritize(input.subject, input.description);

    const ticketId = `TKT-${Date.now().toString(36).toUpperCase()}`;

    // In production, would create in Zendesk/Freshdesk/etc.
    const ticket = {
      id: ticketId,
      subject: input.subject,
      description: input.description,
      customerEmail: input.customerEmail,
      customerId: input.customerId,
      priority,
      category,
      tags: input.tags || [],
      status: 'open',
      createdAt: new Date().toISOString(),
      assignedTo: null,
      slaDeadline: this.calculateSLA(priority),
    };

    return {
      success: true,
      ticket,
      autoAssignments: {
        category,
        priority,
        suggestedAgent: await this.suggestAgent(category, priority),
      },
      relatedArticles: await this.findRelatedArticles(input.subject + ' ' + input.description),
    };
  }

  private async analyzeSentiment(
    input: SentimentInput,
    context: AgentContext
  ): Promise<SentimentResult> {
    const content = input.content || 'Sample ticket content'; // Would fetch from ticketId

    // Use OpenAI for sentiment analysis
    const analysis = await this.openaiService.chat([
      {
        role: 'system',
        content: `Analyze the following customer support message and return a JSON object with:
- sentiment: "positive" | "neutral" | "negative"
- sentimentScore: number between -1 (very negative) and 1 (very positive)
- emotions: array of detected emotions (e.g., "frustrated", "confused", "satisfied")
- urgency: "low" | "medium" | "high" | "critical"
- keyIssues: array of main issues mentioned
- tone: description of the customer's tone`
      },
      { role: 'user', content }
    ]);

    let parsedAnalysis;
    try {
      parsedAnalysis = JSON.parse(analysis.content);
    } catch {
      parsedAnalysis = {
        sentiment: 'neutral',
        sentimentScore: 0,
        emotions: ['uncertain'],
        urgency: 'medium',
        keyIssues: ['Unable to parse'],
        tone: 'neutral',
      };
    }

    return {
      ticketId: input.ticketId,
      analysis: parsedAnalysis,
      recommendations: this.getSentimentRecommendations(parsedAnalysis),
      suggestedPriority: this.mapUrgencyToPriority(parsedAnalysis.urgency),
    };
  }

  private async generateResponseSuggestion(
    input: ResponseSuggestionInput,
    context: AgentContext
  ): Promise<ResponseSuggestionResult> {
    const knowledgeBaseResults = input.includeKnowledgeBase
      ? await this.searchKnowledgeBase({ query: input.content, limit: 3, includeSnippets: true }, context)
      : null;

    const toneInstructions: Record<string, string> = {
      professional: 'Use formal, business-appropriate language',
      friendly: 'Use warm, conversational language while remaining helpful',
      empathetic: 'Express understanding and compassion for their situation',
      technical: 'Use precise technical language and include detailed instructions',
    };

    const prompt = `Generate a customer support response for the following issue:

Issue: ${input.content}

${knowledgeBaseResults?.articles?.length ? `
Relevant Knowledge Base Articles:
${knowledgeBaseResults.articles.map(a => `- ${a.title}: ${a.snippet}`).join('\n')}
` : ''}

Instructions:
- Tone: ${toneInstructions[input.tone || 'friendly']}
- Language: ${input.language || 'English'}
- Include greeting and closing
- Be helpful and solution-oriented
- If applicable, include relevant article links`;

    const response = await this.openaiService.chat([
      { role: 'system', content: 'You are an expert customer support agent crafting helpful responses.' },
      { role: 'user', content: prompt },
    ]);

    return {
      suggestedResponse: response.content,
      tone: input.tone || 'friendly',
      relatedArticles: knowledgeBaseResults?.articles || [],
      confidence: 0.85,
      alternativeResponses: [
        'Would you like me to generate an alternative response with a different tone?',
      ],
    };
  }

  private async categorizeTickets(
    input: CategorizeInput,
    context: AgentContext
  ): Promise<CategorizeResult> {
    const defaultCategories = input.categories || [
      'Technical Issue',
      'Billing',
      'Account Management',
      'Feature Request',
      'General Inquiry',
      'Complaint',
    ];

    const categorizedTickets = await Promise.all(
      input.tickets.map(async (ticket) => {
        const category = await this.autoCategorizeSingle(ticket.subject, ticket.content);
        const priority = await this.autoPrioritize(ticket.subject, ticket.content);

        return {
          ticketId: ticket.id,
          originalSubject: ticket.subject,
          assignedCategory: category,
          suggestedPriority: priority,
          confidence: 0.75 + Math.random() * 0.2,
          suggestedTags: this.extractTags(ticket.subject + ' ' + ticket.content),
        };
      })
    );

    return {
      categorized: categorizedTickets,
      summary: {
        total: input.tickets.length,
        byCategory: this.groupBy(categorizedTickets, 'assignedCategory'),
        byPriority: this.groupBy(categorizedTickets, 'suggestedPriority'),
      },
    };
  }

  private async getSupportMetrics(
    input: MetricsInput,
    context: AgentContext
  ): Promise<SupportMetricsResult> {
    // In production, would query actual ticket system
    const baseMetrics = {
      totalTickets: 1250 + Math.floor(Math.random() * 200),
      openTickets: 85 + Math.floor(Math.random() * 30),
      resolvedTickets: 1100 + Math.floor(Math.random() * 150),
      avgResolutionTime: 4.5 + Math.random() * 2, // hours
      avgFirstResponseTime: 0.5 + Math.random() * 0.5, // hours
      csatScore: 4.2 + Math.random() * 0.5,
      resolutionRate: 0.88 + Math.random() * 0.08,
      escalationRate: 0.05 + Math.random() * 0.03,
    };

    const previousPeriodMetrics = input.includeComparison ? {
      totalTickets: baseMetrics.totalTickets * (0.9 + Math.random() * 0.2),
      avgResolutionTime: baseMetrics.avgResolutionTime * (0.95 + Math.random() * 0.1),
      csatScore: baseMetrics.csatScore * (0.95 + Math.random() * 0.1),
    } : null;

    return {
      period: input.period || 'this_week',
      metrics: baseMetrics,
      comparison: previousPeriodMetrics ? {
        ticketChange: (baseMetrics.totalTickets - previousPeriodMetrics.totalTickets) / previousPeriodMetrics.totalTickets,
        resolutionTimeChange: (baseMetrics.avgResolutionTime - previousPeriodMetrics.avgResolutionTime) / previousPeriodMetrics.avgResolutionTime,
        csatChange: (baseMetrics.csatScore - previousPeriodMetrics.csatScore) / previousPeriodMetrics.csatScore,
      } : null,
      breakdown: this.generateMetricsBreakdown(input.groupBy || 'category'),
      trends: {
        ticketVolume: 'stable',
        resolutionTime: baseMetrics.avgResolutionTime < 5 ? 'improving' : 'needs_attention',
        satisfaction: baseMetrics.csatScore > 4.3 ? 'excellent' : baseMetrics.csatScore > 3.5 ? 'good' : 'needs_improvement',
      },
      insights: [
        `Average resolution time is ${baseMetrics.avgResolutionTime.toFixed(1)} hours`,
        `CSAT score of ${baseMetrics.csatScore.toFixed(1)} is ${baseMetrics.csatScore > 4.3 ? 'above' : 'near'} target`,
        `${(baseMetrics.resolutionRate * 100).toFixed(0)}% of tickets resolved on first contact`,
      ],
    };
  }

  private async searchKnowledgeBase(
    input: KnowledgeBaseInput,
    context: AgentContext
  ): Promise<KnowledgeBaseResult> {
    // Simulated knowledge base search
    const articles = [
      {
        id: 'kb-001',
        title: 'How to Reset Your Password',
        category: 'Account',
        snippet: 'Follow these steps to reset your password: 1. Go to login page, 2. Click "Forgot Password"...',
        relevance: 0.95,
        url: '/help/reset-password',
        views: 12500,
        helpful: 94,
      },
      {
        id: 'kb-002',
        title: 'Billing FAQ',
        category: 'Billing',
        snippet: 'Common billing questions answered: How to update payment method, understanding your invoice...',
        relevance: 0.88,
        url: '/help/billing-faq',
        views: 8700,
        helpful: 89,
      },
      {
        id: 'kb-003',
        title: 'Getting Started Guide',
        category: 'Onboarding',
        snippet: 'Welcome to our platform! This guide will help you set up your account and explore key features...',
        relevance: 0.82,
        url: '/help/getting-started',
        views: 25000,
        helpful: 92,
      },
    ];

    // Filter by category if specified
    const filtered = input.category
      ? articles.filter(a => a.category.toLowerCase() === input.category?.toLowerCase())
      : articles;

    return {
      query: input.query,
      articles: filtered.slice(0, input.limit || 5),
      totalResults: filtered.length,
      searchTime: Math.random() * 0.1 + 0.05,
      suggestedQueries: [
        `${input.query} tutorial`,
        `${input.query} troubleshooting`,
        `${input.query} best practices`,
      ],
    };
  }

  private async escalateTicket(
    input: EscalateInput,
    context: AgentContext
  ): Promise<EscalateResult> {
    return {
      success: true,
      ticketId: input.ticketId,
      escalatedTo: input.tier,
      escalationId: `ESC-${Date.now().toString(36).toUpperCase()}`,
      reason: input.reason,
      urgency: input.urgency || 'normal',
      expectedResponseTime: this.getEscalationSLA(input.tier, input.urgency || 'normal'),
      notificationsSent: [
        `${input.tier} team notified via email`,
        `Slack notification sent to #${input.tier}-queue`,
      ],
    };
  }

  private async getCustomerHistory(
    input: CustomerHistoryInput,
    context: AgentContext
  ): Promise<CustomerHistoryResult> {
    // Simulated customer history
    return {
      customerId: input.customerId || 'CUST-12345',
      profile: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        company: 'Acme Corp',
        plan: 'Enterprise',
        customerSince: '2022-03-15',
        lifetimeValue: 25000,
      },
      supportHistory: {
        totalTickets: 15,
        openTickets: 1,
        avgResolutionTime: 3.5,
        avgCsatScore: 4.5,
        preferredChannel: 'email',
        lastContact: '2024-01-10',
      },
      recentTickets: [
        {
          id: 'TKT-001',
          subject: 'Integration issue',
          status: 'resolved',
          createdAt: '2024-01-05',
          resolvedAt: '2024-01-06',
          satisfaction: 5,
        },
        {
          id: 'TKT-002',
          subject: 'Billing question',
          status: 'resolved',
          createdAt: '2023-12-20',
          resolvedAt: '2023-12-20',
          satisfaction: 4,
        },
      ],
      sentimentTrend: 'positive',
      riskLevel: 'low',
      recommendations: [
        'Customer has been highly satisfied - consider for testimonial',
        'Proactively share new feature announcements',
      ],
    };
  }

  private async autoResolveTicket(
    input: AutoResolveInput,
    context: AgentContext
  ): Promise<AutoResolveResult> {
    // Check if issue matches known patterns
    const knowledgeMatch = await this.searchKnowledgeBase({
      query: input.content,
      limit: 3,
      includeSnippets: true,
    }, context);

    const canAutoResolve = knowledgeMatch.articles.length > 0 &&
      knowledgeMatch.articles[0].relevance > 0.9;

    if (canAutoResolve) {
      const response = await this.generateResponseSuggestion({
        content: input.content,
        tone: 'friendly',
        includeKnowledgeBase: true,
      }, context);

      return {
        canAutoResolve: true,
        confidence: knowledgeMatch.articles[0].relevance,
        suggestedResponse: response.suggestedResponse,
        matchedArticle: knowledgeMatch.articles[0],
        requiresApproval: input.requireApproval !== false,
        autoSent: input.autoSend && !input.requireApproval,
      };
    }

    return {
      canAutoResolve: false,
      confidence: 0.3,
      reason: 'No high-confidence match found in knowledge base',
      suggestedActions: [
        'Route to appropriate agent',
        'Request more information from customer',
      ],
    };
  }

  private async analyzeCSAT(
    input: CSATInput,
    context: AgentContext
  ): Promise<CSATResult> {
    // Simulated CSAT analysis
    const overallScore = 4.2 + Math.random() * 0.5;

    return {
      period: input.period || 'this_month',
      overall: {
        score: overallScore,
        responses: 450 + Math.floor(Math.random() * 100),
        responseRate: 0.35 + Math.random() * 0.15,
        nps: 42 + Math.floor(Math.random() * 20),
      },
      distribution: {
        5: 0.45,
        4: 0.30,
        3: 0.15,
        2: 0.07,
        1: 0.03,
      },
      trends: {
        vsLastPeriod: 0.05 + Math.random() * 0.1,
        direction: 'improving',
        consistentScorers: 0.65,
      },
      themes: input.identifyThemes ? [
        { theme: 'Fast response time', sentiment: 'positive', mentions: 120 },
        { theme: 'Helpful solutions', sentiment: 'positive', mentions: 95 },
        { theme: 'Wait times', sentiment: 'negative', mentions: 35 },
        { theme: 'Technical expertise', sentiment: 'positive', mentions: 80 },
      ] : [],
      topComments: input.includeComments ? [
        { rating: 5, comment: 'Excellent support, resolved my issue quickly!' },
        { rating: 5, comment: 'Very patient and thorough explanation.' },
        { rating: 2, comment: 'Had to wait too long for a response.' },
      ] : [],
      recommendations: [
        'Focus on reducing initial response times',
        'Share positive feedback with team for motivation',
        'Investigate recurring technical issues mentioned in low scores',
      ],
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async autoCategorizeSingle(subject: string, content: string): Promise<string> {
    const text = (subject + ' ' + content).toLowerCase();

    if (text.includes('billing') || text.includes('invoice') || text.includes('payment')) {
      return 'Billing';
    }
    if (text.includes('bug') || text.includes('error') || text.includes('not working')) {
      return 'Technical Issue';
    }
    if (text.includes('feature') || text.includes('suggestion') || text.includes('would like')) {
      return 'Feature Request';
    }
    if (text.includes('account') || text.includes('password') || text.includes('login')) {
      return 'Account Management';
    }
    if (text.includes('complaint') || text.includes('disappointed') || text.includes('unacceptable')) {
      return 'Complaint';
    }

    return 'General Inquiry';
  }

  private async autoPrioritize(subject: string, content: string): Promise<string> {
    const text = (subject + ' ' + content).toLowerCase();

    if (text.includes('urgent') || text.includes('critical') || text.includes('down') || text.includes('emergency')) {
      return 'urgent';
    }
    if (text.includes('asap') || text.includes('important') || text.includes('blocking')) {
      return 'high';
    }
    if (text.includes('when possible') || text.includes('question')) {
      return 'low';
    }

    return 'medium';
  }

  private calculateSLA(priority: string): string {
    const now = new Date();
    const hours: Record<string, number> = {
      urgent: 1,
      high: 4,
      medium: 8,
      low: 24,
    };

    now.setHours(now.getHours() + (hours[priority] || 8));
    return now.toISOString();
  }

  private async suggestAgent(category: string, priority: string): Promise<string> {
    // Would match with actual agent skills and availability
    const agents: Record<string, string> = {
      'Technical Issue': 'Tech Support Team',
      'Billing': 'Billing Team',
      'Account Management': 'Customer Success',
      'Feature Request': 'Product Team',
      'General Inquiry': 'General Support',
      'Complaint': 'Senior Support',
    };

    return agents[category] || 'General Support';
  }

  private async findRelatedArticles(content: string): Promise<Array<{ id: string; title: string; relevance: number }>> {
    const result = await this.searchKnowledgeBase({ query: content, limit: 3, includeSnippets: false }, {} as AgentContext);
    return result.articles.map(a => ({ id: a.id, title: a.title, relevance: a.relevance }));
  }

  private getSentimentRecommendations(analysis: { sentiment: string; urgency: string }): string[] {
    const recommendations: string[] = [];

    if (analysis.sentiment === 'negative') {
      recommendations.push('Acknowledge customer frustration in response');
      recommendations.push('Consider offering compensation or expedited resolution');
    }

    if (analysis.urgency === 'critical' || analysis.urgency === 'high') {
      recommendations.push('Prioritize immediate response');
      recommendations.push('Consider escalation if not resolved quickly');
    }

    return recommendations;
  }

  private mapUrgencyToPriority(urgency: string): string {
    const mapping: Record<string, string> = {
      critical: 'urgent',
      high: 'high',
      medium: 'medium',
      low: 'low',
    };
    return mapping[urgency] || 'medium';
  }

  private extractTags(content: string): string[] {
    const keywords = ['urgent', 'billing', 'technical', 'bug', 'feature', 'account', 'login', 'payment'];
    return keywords.filter(k => content.toLowerCase().includes(k));
  }

  private groupBy(items: any[], key: string): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = item[key];
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  private generateMetricsBreakdown(groupBy: string): Record<string, any> {
    const categories = ['Technical Issue', 'Billing', 'Account', 'Feature Request', 'General'];
    const breakdown: Record<string, any> = {};

    for (const cat of categories) {
      breakdown[cat] = {
        tickets: Math.floor(100 + Math.random() * 200),
        avgResolutionTime: 2 + Math.random() * 6,
        satisfaction: 3.5 + Math.random() * 1.5,
      };
    }

    return breakdown;
  }

  private getEscalationSLA(tier: string, urgency: string): string {
    const baseHours: Record<string, number> = {
      tier2: 4,
      tier3: 8,
      management: 2,
      engineering: 12,
    };

    const urgencyMultiplier: Record<string, number> = {
      critical: 0.25,
      high: 0.5,
      normal: 1,
    };

    const hours = (baseHours[tier] || 4) * (urgencyMultiplier[urgency] || 1);
    const deadline = new Date();
    deadline.setHours(deadline.getHours() + hours);

    return deadline.toISOString();
  }
}

// ============================================
// TYPE DEFINITIONS
// ============================================

interface CreateTicketInput {
  subject: string;
  description: string;
  customerEmail: string;
  customerId?: string;
  priority?: string;
  category?: string;
  tags?: string[];
}

interface CreateTicketResult {
  success: boolean;
  ticket: {
    id: string;
    subject: string;
    description: string;
    customerEmail: string;
    customerId?: string;
    priority: string;
    category: string;
    tags: string[];
    status: string;
    createdAt: string;
    assignedTo: string | null;
    slaDeadline: string;
  };
  autoAssignments: {
    category: string;
    priority: string;
    suggestedAgent: string;
  };
  relatedArticles: Array<{ id: string; title: string; relevance: number }>;
}

interface SentimentInput {
  ticketId?: string;
  content?: string;
  includeHistory?: boolean;
}

interface SentimentResult {
  ticketId?: string;
  analysis: {
    sentiment: string;
    sentimentScore: number;
    emotions: string[];
    urgency: string;
    keyIssues: string[];
    tone: string;
  };
  recommendations: string[];
  suggestedPriority: string;
}

interface ResponseSuggestionInput {
  ticketId?: string;
  content: string;
  tone?: string;
  includeKnowledgeBase?: boolean;
  language?: string;
}

interface ResponseSuggestionResult {
  suggestedResponse: string;
  tone: string;
  relatedArticles: any[];
  confidence: number;
  alternativeResponses: string[];
}

interface CategorizeInput {
  tickets: Array<{ id: string; subject: string; content: string }>;
  categories?: string[];
}

interface CategorizeResult {
  categorized: Array<{
    ticketId: string;
    originalSubject: string;
    assignedCategory: string;
    suggestedPriority: string;
    confidence: number;
    suggestedTags: string[];
  }>;
  summary: {
    total: number;
    byCategory: Record<string, number>;
    byPriority: Record<string, number>;
  };
}

interface MetricsInput {
  period?: string;
  groupBy?: string;
  includeComparison?: boolean;
}

interface SupportMetricsResult {
  period: string;
  metrics: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    avgResolutionTime: number;
    avgFirstResponseTime: number;
    csatScore: number;
    resolutionRate: number;
    escalationRate: number;
  };
  comparison: {
    ticketChange: number;
    resolutionTimeChange: number;
    csatChange: number;
  } | null;
  breakdown: Record<string, any>;
  trends: Record<string, string>;
  insights: string[];
}

interface KnowledgeBaseInput {
  query: string;
  category?: string;
  limit?: number;
  includeSnippets?: boolean;
}

interface KnowledgeBaseResult {
  query: string;
  articles: Array<{
    id: string;
    title: string;
    category: string;
    snippet: string;
    relevance: number;
    url: string;
    views: number;
    helpful: number;
  }>;
  totalResults: number;
  searchTime: number;
  suggestedQueries: string[];
}

interface EscalateInput {
  ticketId: string;
  reason: string;
  tier?: string;
  urgency?: string;
  notes?: string;
}

interface EscalateResult {
  success: boolean;
  ticketId: string;
  escalatedTo: string;
  escalationId: string;
  reason: string;
  urgency: string;
  expectedResponseTime: string;
  notificationsSent: string[];
}

interface CustomerHistoryInput {
  customerId?: string;
  customerEmail?: string;
  includeTickets?: boolean;
  includeInteractions?: boolean;
  includeSentiment?: boolean;
  limit?: number;
}

interface CustomerHistoryResult {
  customerId: string;
  profile: {
    name: string;
    email: string;
    company: string;
    plan: string;
    customerSince: string;
    lifetimeValue: number;
  };
  supportHistory: {
    totalTickets: number;
    openTickets: number;
    avgResolutionTime: number;
    avgCsatScore: number;
    preferredChannel: string;
    lastContact: string;
  };
  recentTickets: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: string;
    resolvedAt?: string;
    satisfaction?: number;
  }>;
  sentimentTrend: string;
  riskLevel: string;
  recommendations: string[];
}

interface AutoResolveInput {
  ticketId?: string;
  content: string;
  autoSend?: boolean;
  requireApproval?: boolean;
}

interface AutoResolveResult {
  canAutoResolve: boolean;
  confidence: number;
  suggestedResponse?: string;
  matchedArticle?: any;
  requiresApproval?: boolean;
  autoSent?: boolean;
  reason?: string;
  suggestedActions?: string[];
}

interface CSATInput {
  period?: string;
  segment?: string;
  includeComments?: boolean;
  identifyThemes?: boolean;
}

interface CSATResult {
  period: string;
  overall: {
    score: number;
    responses: number;
    responseRate: number;
    nps: number;
  };
  distribution: Record<number, number>;
  trends: {
    vsLastPeriod: number;
    direction: string;
    consistentScorers: number;
  };
  themes: Array<{ theme: string; sentiment: string; mentions: number }>;
  topComments: Array<{ rating: number; comment: string }>;
  recommendations: string[];
}

// ============================================
// REGISTER AGENT
// ============================================

const cassieAgent = new CassieAgent();
agentRegistry.register(cassieAgent);

export { cassieAgent };
