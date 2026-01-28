/**
 * PHASE 46-48: AI Response Generator
 * Intelligent response generation for customer support
 */

import OpenAI from 'openai';
import { SentimentAnalyzer, SentimentAnalysisResult } from './SentimentAnalyzer';
import { KnowledgeBaseManager, KnowledgeArticle } from './KnowledgeBaseManager';

// ============================================
// TYPES
// ============================================

export interface ResponseContext {
  ticketId: string;
  workspaceId: string;
  customerId: string;
  customerName?: string;
  issue: string;
  category?: string;
  previousMessages?: Array<{
    role: 'customer' | 'agent';
    content: string;
    timestamp: Date;
  }>;
  customerHistory?: {
    totalTickets: number;
    avgSatisfaction: number;
    lifetimeValue: number;
    accountAge: number;
    isVIP: boolean;
  };
  agentName?: string;
  companyName?: string;
  tone?: 'formal' | 'friendly' | 'professional' | 'empathetic';
}

export interface GeneratedResponse {
  content: string;
  confidence: number;
  tone: string;
  sentiment: SentimentAnalysisResult;
  suggestedActions: string[];
  relatedArticles: KnowledgeArticle[];
  isAutoResolvable: boolean;
  escalationRecommended: boolean;
  responseTime: number;
  metadata: {
    templateUsed?: string;
    knowledgeSourced: boolean;
    personalized: boolean;
    language: string;
  };
}

export interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  tone: string;
  useCount: number;
  satisfactionRate: number;
}

export interface QuickReply {
  id: string;
  label: string;
  content: string;
  category: string;
}

// ============================================
// RESPONSE GENERATOR CLASS
// ============================================

export class ResponseGenerator {
  private openai: OpenAI;
  private sentimentAnalyzer: SentimentAnalyzer;
  private knowledgeBase: KnowledgeBaseManager;
  private templates: Map<string, ResponseTemplate> = new Map();
  private quickReplies: QuickReply[] = [];

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    this.sentimentAnalyzer = new SentimentAnalyzer();
    this.knowledgeBase = new KnowledgeBaseManager();
    this.initializeTemplates();
    this.initializeQuickReplies();
  }

  // ============================================
  // MAIN RESPONSE GENERATION
  // ============================================

  /**
   * Generate intelligent response for customer inquiry
   */
  public async generateResponse(context: ResponseContext): Promise<GeneratedResponse> {
    const startTime = Date.now();

    // Analyze customer sentiment
    const sentiment = await this.sentimentAnalyzer.analyze(context.issue);

    // Search knowledge base for relevant articles
    const kbResults = await this.knowledgeBase.search({
      workspaceId: context.workspaceId,
      query: context.issue,
      category: context.category,
      limit: 3,
    });

    // Check if auto-resolvable
    const autoResolve = await this.checkAutoResolvable(context, kbResults.results);

    // Determine response tone
    const tone = this.determineTone(context, sentiment);

    // Generate response using AI
    const aiResponse = await this.generateAIResponse(context, sentiment, kbResults.results, tone);

    // Get suggested actions
    const suggestedActions = this.determineSuggestedActions(context, sentiment, aiResponse);

    // Check if escalation is needed
    const escalationRecommended = this.shouldRecommendEscalation(sentiment, context);

    return {
      content: aiResponse.content,
      confidence: aiResponse.confidence,
      tone,
      sentiment,
      suggestedActions,
      relatedArticles: kbResults.results.map((r) => r.article),
      isAutoResolvable: autoResolve.resolvable,
      escalationRecommended,
      responseTime: Date.now() - startTime,
      metadata: {
        templateUsed: aiResponse.templateUsed,
        knowledgeSourced: kbResults.results.length > 0,
        personalized: !!context.customerName || !!context.customerHistory,
        language: 'en',
      },
    };
  }

  /**
   * Generate multiple response variations
   */
  public async generateVariations(
    context: ResponseContext,
    count: number = 3
  ): Promise<Array<{ content: string; tone: string; confidence: number }>> {
    const tones: Array<'formal' | 'friendly' | 'professional' | 'empathetic'> = [
      'formal',
      'friendly',
      'professional',
      'empathetic',
    ];

    const variations: Array<{ content: string; tone: string; confidence: number }> = [];
    const sentiment = await this.sentimentAnalyzer.analyze(context.issue);

    for (let i = 0; i < Math.min(count, tones.length); i++) {
      const response = await this.generateAIResponse(context, sentiment, [], tones[i]);
      variations.push({
        content: response.content,
        tone: tones[i],
        confidence: response.confidence,
      });
    }

    return variations;
  }

  /**
   * Suggest response based on template
   */
  public async suggestFromTemplate(
    context: ResponseContext,
    templateId: string
  ): Promise<GeneratedResponse> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    const startTime = Date.now();
    const sentiment = await this.sentimentAnalyzer.analyze(context.issue);

    // Fill template variables
    const content = this.fillTemplateVariables(template.content, context);

    return {
      content,
      confidence: 0.9,
      tone: template.tone,
      sentiment,
      suggestedActions: [],
      relatedArticles: [],
      isAutoResolvable: false,
      escalationRecommended: false,
      responseTime: Date.now() - startTime,
      metadata: {
        templateUsed: templateId,
        knowledgeSourced: false,
        personalized: true,
        language: 'en',
      },
    };
  }

  // ============================================
  // QUICK REPLIES
  // ============================================

  /**
   * Get quick replies for category
   */
  public getQuickReplies(category?: string): QuickReply[] {
    if (!category) return this.quickReplies;
    return this.quickReplies.filter((qr) => qr.category === category || qr.category === 'general');
  }

  /**
   * Apply quick reply with personalization
   */
  public applyQuickReply(replyId: string, context: ResponseContext): string {
    const reply = this.quickReplies.find((qr) => qr.id === replyId);
    if (!reply) return '';

    return this.fillTemplateVariables(reply.content, context);
  }

  // ============================================
  // TEMPLATE MANAGEMENT
  // ============================================

  /**
   * Get all templates
   */
  public getTemplates(category?: string): ResponseTemplate[] {
    const templates = Array.from(this.templates.values());
    if (!category) return templates;
    return templates.filter((t) => t.category === category);
  }

  /**
   * Create custom template
   */
  public createTemplate(template: Omit<ResponseTemplate, 'id' | 'useCount' | 'satisfactionRate'>): ResponseTemplate {
    const newTemplate: ResponseTemplate = {
      ...template,
      id: `tmpl-${crypto.randomUUID().slice(0, 8)}`,
      useCount: 0,
      satisfactionRate: 0,
    };

    this.templates.set(newTemplate.id, newTemplate);
    return newTemplate;
  }

  /**
   * Update template statistics
   */
  public updateTemplateStats(templateId: string, satisfied: boolean): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    template.useCount++;
    const currentSatisfied = template.satisfactionRate * (template.useCount - 1);
    template.satisfactionRate = (currentSatisfied + (satisfied ? 1 : 0)) / template.useCount;
  }

  // ============================================
  // RESPONSE IMPROVEMENT
  // ============================================

  /**
   * Improve existing response
   */
  public async improveResponse(
    originalResponse: string,
    feedback: string,
    context: ResponseContext
  ): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return this.improveResponseFallback(originalResponse, feedback);
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a customer support response editor. Improve the given response based on the feedback while maintaining professionalism and helpfulness.`,
          },
          {
            role: 'user',
            content: `Original Response:\n${originalResponse}\n\nFeedback:\n${feedback}\n\nPlease improve the response addressing the feedback.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || originalResponse;
    } catch {
      return this.improveResponseFallback(originalResponse, feedback);
    }
  }

  /**
   * Translate response
   */
  public async translateResponse(
    response: string,
    targetLanguage: string
  ): Promise<string> {
    if (!process.env.OPENAI_API_KEY) {
      return response; // Return original if no API
    }

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          {
            role: 'system',
            content: `You are a professional translator. Translate the following customer support response to ${targetLanguage}. Maintain the professional tone and formatting.`,
          },
          {
            role: 'user',
            content: response,
          },
        ],
        temperature: 0.3,
        max_tokens: 500,
      });

      return completion.choices[0]?.message?.content || response;
    } catch {
      return response;
    }
  }

  /**
   * Check response for issues
   */
  public analyzeResponse(response: string): {
    issues: string[];
    suggestions: string[];
    readabilityScore: number;
    professionalismScore: number;
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check length
    const wordCount = response.split(/\s+/).length;
    if (wordCount < 20) {
      issues.push('Response may be too brief');
      suggestions.push('Consider adding more detail or context');
    }
    if (wordCount > 300) {
      issues.push('Response may be too long');
      suggestions.push('Consider breaking into shorter paragraphs or bullet points');
    }

    // Check for common issues
    if (response.toLowerCase().includes('i think') || response.toLowerCase().includes('maybe')) {
      issues.push('Response contains uncertain language');
      suggestions.push('Use more confident language');
    }

    if (!/[.!?]$/.test(response.trim())) {
      issues.push('Response does not end with proper punctuation');
    }

    // Check for personalization
    if (!response.includes('you') && !response.includes('your')) {
      suggestions.push('Consider adding more personal touches');
    }

    // Calculate scores
    const readabilityScore = this.calculateReadability(response);
    const professionalismScore = this.calculateProfessionalism(response);

    return {
      issues,
      suggestions,
      readabilityScore,
      professionalismScore,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private async generateAIResponse(
    context: ResponseContext,
    sentiment: SentimentAnalysisResult,
    kbResults: Array<{ article: KnowledgeArticle; score: number }>,
    tone: string
  ): Promise<{ content: string; confidence: number; templateUsed?: string }> {
    // Check if we can use a template
    const matchingTemplate = this.findMatchingTemplate(context.category || 'general', tone);
    if (matchingTemplate && !context.previousMessages?.length) {
      return {
        content: this.fillTemplateVariables(matchingTemplate.content, context),
        confidence: 0.85,
        templateUsed: matchingTemplate.id,
      };
    }

    // Build knowledge context
    const knowledgeContext = kbResults
      .map((r) => `Article: ${r.article.title}\nContent: ${r.article.content.slice(0, 500)}`)
      .join('\n\n');

    // Generate AI response
    if (!process.env.OPENAI_API_KEY) {
      return this.generateFallbackResponse(context, sentiment, kbResults, tone);
    }

    try {
      const systemPrompt = this.buildSystemPrompt(context, tone, sentiment);
      const userPrompt = this.buildUserPrompt(context, knowledgeContext);

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const content = completion.choices[0]?.message?.content || '';

      return {
        content,
        confidence: this.calculateConfidence(content, kbResults),
      };
    } catch {
      return this.generateFallbackResponse(context, sentiment, kbResults, tone);
    }
  }

  private buildSystemPrompt(
    context: ResponseContext,
    tone: string,
    sentiment: SentimentAnalysisResult
  ): string {
    const toneGuidance = {
      formal: 'Use formal, professional language. Avoid contractions and colloquialisms.',
      friendly: 'Use warm, conversational language while remaining professional.',
      professional: 'Use clear, business-appropriate language with a helpful tone.',
      empathetic: 'Show genuine understanding and concern. Acknowledge emotions before providing solutions.',
    };

    let prompt = `You are a helpful customer support agent for ${context.companyName || 'our company'}.

TONE: ${toneGuidance[tone as keyof typeof toneGuidance] || toneGuidance.professional}

GUIDELINES:
- Be helpful and solution-oriented
- Keep responses concise but complete
- Use the customer's name when appropriate
- Provide clear next steps when applicable`;

    if (sentiment.overall === 'negative' || sentiment.urgency >= 0.7) {
      prompt += `
- The customer appears ${sentiment.overall}. Show empathy first.
- Urgency level is high. Prioritize quick resolution.`;
    }

    if (context.customerHistory?.isVIP) {
      prompt += `
- This is a VIP customer. Provide premium-level service.`;
    }

    return prompt;
  }

  private buildUserPrompt(context: ResponseContext, knowledgeContext: string): string {
    let prompt = `Customer Issue: ${context.issue}`;

    if (context.category) {
      prompt += `\nCategory: ${context.category}`;
    }

    if (context.previousMessages?.length) {
      prompt += `\n\nPrevious Conversation:\n`;
      for (const msg of context.previousMessages.slice(-5)) {
        prompt += `${msg.role.toUpperCase()}: ${msg.content}\n`;
      }
    }

    if (knowledgeContext) {
      prompt += `\n\nRelevant Knowledge Base Articles:\n${knowledgeContext}`;
    }

    prompt += `\n\nGenerate a helpful response to the customer.`;

    return prompt;
  }

  private generateFallbackResponse(
    context: ResponseContext,
    sentiment: SentimentAnalysisResult,
    kbResults: Array<{ article: KnowledgeArticle; score: number }>,
    tone: string
  ): { content: string; confidence: number; templateUsed?: string } {
    const greeting = context.customerName
      ? `Hi ${context.customerName},`
      : 'Hello,';

    let response = greeting + '\n\n';

    // Add empathy if negative sentiment
    if (sentiment.overall === 'negative') {
      response += "I understand this situation is frustrating, and I'm here to help. ";
    } else {
      response += 'Thank you for reaching out. ';
    }

    // Add knowledge base content if available
    if (kbResults.length > 0 && kbResults[0].score > 0.5) {
      const article = kbResults[0].article;
      response += `\n\nBased on your inquiry, I found this information that should help:\n\n`;
      response += article.content.slice(0, 300) + '...\n\n';
      response += `For more details, you can check our article: "${article.title}"\n\n`;
    } else {
      response += `I'd be happy to help you with your inquiry about "${context.issue.slice(0, 50)}..."\n\n`;
      response += "Let me look into this for you. Could you please provide any additional details that might help me assist you better?\n\n";
    }

    // Add closing based on tone
    if (tone === 'friendly') {
      response += "Feel free to reach out if you have any other questions - I'm always happy to help! 😊";
    } else if (tone === 'empathetic') {
      response += 'I truly appreciate your patience, and please know we are committed to resolving this for you.';
    } else {
      response += "Please don't hesitate to contact us if you need further assistance.";
    }

    // Add agent signature
    if (context.agentName) {
      response += `\n\nBest regards,\n${context.agentName}`;
    }

    return {
      content: response,
      confidence: kbResults.length > 0 ? 0.7 : 0.5,
    };
  }

  private async checkAutoResolvable(
    context: ResponseContext,
    kbResults: Array<{ article: KnowledgeArticle; score: number }>
  ): Promise<{ resolvable: boolean; reason?: string }> {
    // High confidence KB match
    if (kbResults.length > 0 && kbResults[0].score > 0.85) {
      return { resolvable: true, reason: 'High confidence knowledge base match' };
    }

    // Simple inquiry patterns
    const simplePatterns = [
      /how (do|can) i reset/i,
      /what (is|are) (the|your) (hours|pricing|plans)/i,
      /where (can i|do i) find/i,
      /how to (change|update|cancel)/i,
    ];

    if (simplePatterns.some((pattern) => pattern.test(context.issue))) {
      return { resolvable: true, reason: 'Common inquiry pattern matched' };
    }

    return { resolvable: false };
  }

  private determineTone(
    context: ResponseContext,
    sentiment: SentimentAnalysisResult
  ): string {
    // Use explicit tone if provided
    if (context.tone) return context.tone;

    // Determine based on sentiment and customer type
    if (sentiment.overall === 'negative' || sentiment.urgency >= 0.7) {
      return 'empathetic';
    }

    if (context.customerHistory?.isVIP) {
      return 'professional';
    }

    if (context.category === 'billing' || context.category === 'legal') {
      return 'formal';
    }

    return 'friendly';
  }

  private determineSuggestedActions(
    context: ResponseContext,
    sentiment: SentimentAnalysisResult,
    response: { content: string; confidence: number }
  ): string[] {
    const actions: string[] = [];

    if (sentiment.overall === 'negative') {
      actions.push('Follow up within 24 hours to ensure satisfaction');
    }

    if (sentiment.urgency >= 0.8) {
      actions.push('Prioritize this ticket for immediate resolution');
    }

    if (response.confidence < 0.6) {
      actions.push('Consider having a senior agent review this response');
    }

    if (context.customerHistory?.isVIP) {
      actions.push('Ensure VIP customer receives priority treatment');
    }

    if (context.previousMessages && context.previousMessages.length > 3) {
      actions.push('Long conversation - consider phone call for resolution');
    }

    return actions;
  }

  private shouldRecommendEscalation(
    sentiment: SentimentAnalysisResult,
    context: ResponseContext
  ): boolean {
    // Recommend escalation for very negative sentiment
    if (sentiment.overall === 'negative' && sentiment.confidence > 0.8) {
      return true;
    }

    // VIP customers with issues
    if (context.customerHistory?.isVIP && sentiment.overall !== 'positive') {
      return true;
    }

    // Long unresolved conversation
    if (context.previousMessages && context.previousMessages.length > 5) {
      return true;
    }

    // High urgency
    if (sentiment.urgency >= 0.9) {
      return true;
    }

    return false;
  }

  private fillTemplateVariables(template: string, context: ResponseContext): string {
    const variables: Record<string, string> = {
      '{{customer_name}}': context.customerName || 'Valued Customer',
      '{{agent_name}}': context.agentName || 'Support Team',
      '{{company_name}}': context.companyName || 'Our Team',
      '{{ticket_id}}': context.ticketId,
      '{{issue}}': context.issue.slice(0, 100),
      '{{category}}': context.category || 'General',
    };

    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(key, 'g'), value);
    }

    return result;
  }

  private findMatchingTemplate(category: string, tone: string): ResponseTemplate | undefined {
    return Array.from(this.templates.values()).find(
      (t) => t.category === category && t.tone === tone
    );
  }

  private calculateConfidence(response: string, kbResults: Array<{ score: number }>): number {
    let confidence = 0.6; // Base confidence

    // Boost if KB results were used
    if (kbResults.length > 0) {
      confidence += kbResults[0].score * 0.2;
    }

    // Check response quality indicators
    if (response.length > 100 && response.length < 1000) {
      confidence += 0.1;
    }

    // Cap at 0.95
    return Math.min(confidence, 0.95);
  }

  private calculateReadability(text: string): number {
    const words = text.split(/\s+/).length;
    const sentences = text.split(/[.!?]+/).length;
    const avgWordsPerSentence = words / Math.max(sentences, 1);

    // Ideal: 15-20 words per sentence
    if (avgWordsPerSentence >= 10 && avgWordsPerSentence <= 25) {
      return 0.9;
    } else if (avgWordsPerSentence < 10) {
      return 0.7;
    } else {
      return 0.6;
    }
  }

  private calculateProfessionalism(text: string): number {
    let score = 1.0;

    // Check for unprofessional elements
    const unprofessional = [
      /\b(lol|lmao|omg)\b/i,
      /!!+/,
      /\?\?+/,
      /[A-Z]{5,}/,
      /\b(dunno|gonna|wanna|kinda)\b/i,
    ];

    for (const pattern of unprofessional) {
      if (pattern.test(text)) {
        score -= 0.15;
      }
    }

    // Check for professional elements
    if (/thank you|please|appreciate/i.test(text)) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  private improveResponseFallback(original: string, feedback: string): string {
    // Simple improvements based on common feedback
    let improved = original;

    if (feedback.toLowerCase().includes('shorter')) {
      const sentences = improved.split(/[.!?]+/);
      improved = sentences.slice(0, Math.ceil(sentences.length / 2)).join('. ') + '.';
    }

    if (feedback.toLowerCase().includes('friendl')) {
      improved = improved.replace(/Hello,/, 'Hi there!');
      improved = improved.replace(/Best regards,/, 'Cheers,');
    }

    if (feedback.toLowerCase().includes('formal')) {
      improved = improved.replace(/Hi there!/, 'Dear Customer,');
      improved = improved.replace(/Cheers,/, 'Sincerely,');
    }

    return improved;
  }

  private initializeTemplates(): void {
    const defaultTemplates: ResponseTemplate[] = [
      {
        id: 'tmpl-greeting',
        name: 'Standard Greeting',
        category: 'general',
        content: `Hi {{customer_name}},

Thank you for reaching out to {{company_name}}. I'd be happy to assist you with your inquiry.

{{content}}

Please let me know if you have any other questions.

Best regards,
{{agent_name}}`,
        variables: ['customer_name', 'company_name', 'content', 'agent_name'],
        tone: 'friendly',
        useCount: 1250,
        satisfactionRate: 0.89,
      },
      {
        id: 'tmpl-apology',
        name: 'Apology Response',
        category: 'complaint',
        content: `Dear {{customer_name}},

I sincerely apologize for the inconvenience you've experienced. This is not the level of service we strive to provide, and I completely understand your frustration.

I've looked into your case and {{content}}

We value your business and want to make this right. Please let me know if there's anything else I can do.

With apologies,
{{agent_name}}`,
        variables: ['customer_name', 'content', 'agent_name'],
        tone: 'empathetic',
        useCount: 890,
        satisfactionRate: 0.85,
      },
      {
        id: 'tmpl-technical',
        name: 'Technical Support',
        category: 'technical',
        content: `Hi {{customer_name}},

Thank you for reporting this technical issue. I've reviewed the details and here's what I found:

{{content}}

If the issue persists after following these steps, please reply with:
1. Screenshots of any error messages
2. Your browser/device information
3. Steps you've already tried

We'll get this resolved for you.

Best regards,
{{agent_name}}`,
        variables: ['customer_name', 'content', 'agent_name'],
        tone: 'professional',
        useCount: 2100,
        satisfactionRate: 0.91,
      },
      {
        id: 'tmpl-billing',
        name: 'Billing Inquiry',
        category: 'billing',
        content: `Dear {{customer_name}},

Thank you for contacting us regarding your billing inquiry.

{{content}}

For your security, any changes to billing information must be verified. If you need to update payment details, please visit your account settings or contact us with proper verification.

Sincerely,
{{agent_name}}
{{company_name}} Billing Team`,
        variables: ['customer_name', 'content', 'agent_name', 'company_name'],
        tone: 'formal',
        useCount: 780,
        satisfactionRate: 0.87,
      },
    ];

    for (const template of defaultTemplates) {
      this.templates.set(template.id, template);
    }
  }

  private initializeQuickReplies(): void {
    this.quickReplies = [
      {
        id: 'qr-thanks',
        label: 'Thank Customer',
        content: 'Thank you for your patience and understanding. We appreciate your business!',
        category: 'general',
      },
      {
        id: 'qr-followup',
        label: 'Request Follow-up',
        content: "Could you please provide more details so I can better assist you? Any screenshots or specific examples would be helpful.",
        category: 'general',
      },
      {
        id: 'qr-resolved',
        label: 'Mark Resolved',
        content: "I'm glad I could help resolve this issue! Is there anything else I can assist you with today?",
        category: 'general',
      },
      {
        id: 'qr-escalate',
        label: 'Escalating',
        content: "I'm escalating this to our specialized team who can better assist you. They will reach out within 24 hours.",
        category: 'general',
      },
      {
        id: 'qr-refund',
        label: 'Refund Process',
        content: "I've initiated the refund process for you. Please allow 5-7 business days for the amount to reflect in your account.",
        category: 'billing',
      },
      {
        id: 'qr-password',
        label: 'Password Reset',
        content: "I've sent a password reset link to your registered email. Please check your inbox and spam folder.",
        category: 'technical',
      },
    ];
  }
}

// Export singleton instance
export const responseGenerator = new ResponseGenerator();
