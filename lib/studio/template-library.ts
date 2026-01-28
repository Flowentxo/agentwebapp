/**
 * WORKFLOW TEMPLATE LIBRARY
 *
 * Pre-built workflow templates for common use cases
 */

import { WorkflowTemplate } from './types';

// ============================================================================
// CUSTOMER SUPPORT TEMPLATES
// ============================================================================

export const CUSTOMER_SUPPORT_AGENT: WorkflowTemplate = {
  id: 'template-customer-support',
  name: 'Customer Support Agent',
  description: 'Automated customer support workflow that handles inquiries, categorizes issues, and provides personalized responses.',
  category: 'customer-support',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['support', 'automation', 'email'],
  useCase: 'Automatically respond to customer support emails with AI-powered personalized answers.',
  estimatedTime: '2-3 minutes',
  icon: 'MessageSquare',
  color: '#8B5CF6',
  downloads: 1247,
  rating: 4.8,
  requiredIntegrations: ['email'],
  requiredVariables: ['customer_email', 'customer_message'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Email Received',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'Mail',
        color: '#3B82F6'
      }
    },
    {
      id: 'skill-1',
      type: 'llm-agent',
      position: { x: 100, y: 250 },
      data: {
        label: 'Analyze Request',
        category: 'skill',
        skillType: 'customer-support',
        model: 'gpt-5.1',
        temperature: 0.7,
        systemPrompt: 'You are a helpful customer support agent. Analyze the customer inquiry and categorize it as: technical, billing, or general.',
        query: '{{customer_message}}',
        outputVariable: 'analysis_result',
        icon: 'Brain',
        color: '#06B6D4'
      }
    },
    {
      id: 'logic-1',
      type: 'condition',
      position: { x: 100, y: 400 },
      data: {
        label: 'Route by Category',
        category: 'logic',
        logicType: 'condition',
        condition: '{{analysis_result.category}} === "technical"',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: -100, y: 550 },
      data: {
        label: 'Technical Response',
        category: 'skill',
        skillType: 'customer-support',
        model: 'gpt-5.1',
        temperature: 0.5,
        systemPrompt: 'You are a technical support specialist. Provide detailed technical solutions.',
        query: '{{customer_message}}',
        outputVariable: 'response',
        icon: 'Code2',
        color: '#10B981'
      }
    },
    {
      id: 'skill-3',
      type: 'llm-agent',
      position: { x: 300, y: 550 },
      data: {
        label: 'General Response',
        category: 'skill',
        skillType: 'customer-support',
        model: 'gpt-5.1',
        temperature: 0.7,
        systemPrompt: 'You are a friendly customer support agent. Provide helpful and empathetic responses.',
        query: '{{customer_message}}',
        outputVariable: 'response',
        icon: 'MessageSquare',
        color: '#8B5CF6'
      }
    },
    {
      id: 'action-1',
      type: 'send-email',
      position: { x: 100, y: 700 },
      data: {
        label: 'Send Response',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{customer_email}}',
          subject: 'Re: Your Support Request',
          body: '{{response}}'
        },
        icon: 'Mail',
        color: '#3B82F6'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e2', source: 'skill-1', target: 'logic-1', type: 'smoothstep' },
    { id: 'e3', source: 'logic-1', target: 'skill-2', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e4', source: 'logic-1', target: 'skill-3', sourceHandle: 'false', type: 'smoothstep' },
    { id: 'e5', source: 'skill-2', target: 'action-1', type: 'smoothstep' },
    { id: 'e6', source: 'skill-3', target: 'action-1', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// DATA ANALYSIS TEMPLATES
// ============================================================================

export const DATA_ANALYSIS_PIPELINE: WorkflowTemplate = {
  id: 'template-data-analysis',
  name: 'Data Analysis Pipeline',
  description: 'Automated data analysis workflow that collects data, performs analysis, and generates insights with visualizations.',
  category: 'data-analysis',
  difficulty: 'intermediate',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['data', 'analysis', 'reporting'],
  useCase: 'Analyze sales data, identify trends, and generate weekly reports automatically.',
  estimatedTime: '5-10 minutes',
  icon: 'BarChart',
  color: '#06B6D4',
  downloads: 892,
  rating: 4.6,
  requiredVariables: ['data_source', 'report_recipients'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Weekly Schedule',
        category: 'trigger',
        triggerType: 'time-based',
        schedule: '0 9 * * 1', // Every Monday at 9 AM
        icon: 'Clock',
        color: '#8B5CF6'
      }
    },
    {
      id: 'action-1',
      type: 'api-call',
      position: { x: 100, y: 250 },
      data: {
        label: 'Fetch Data',
        category: 'action',
        actionType: 'update-database',
        parameters: {
          operation: 'query',
          table: 'sales'
        },
        outputVariable: 'sales_data',
        icon: 'Database',
        color: '#14B8A6'
      }
    },
    {
      id: 'skill-1',
      type: 'llm-agent',
      position: { x: 100, y: 400 },
      data: {
        label: 'Analyze Trends',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-5.1',
        temperature: 0.3,
        systemPrompt: 'You are a data analyst. Analyze sales data and identify key trends, growth patterns, and anomalies.',
        query: 'Analyze this sales data: {{sales_data}}',
        outputVariable: 'analysis',
        icon: 'TrendingUp',
        color: '#06B6D4'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'Generate Report',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.6,
        systemPrompt: 'Create a professional weekly sales report with executive summary, key metrics, and recommendations.',
        query: 'Create a report based on this analysis: {{analysis}}',
        outputVariable: 'report',
        icon: 'FileText',
        color: '#F97316'
      }
    },
    {
      id: 'action-2',
      type: 'send-email',
      position: { x: 100, y: 700 },
      data: {
        label: 'Send Report',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{report_recipients}}',
          subject: 'Weekly Sales Analysis Report',
          body: '{{report}}'
        },
        icon: 'Mail',
        color: '#3B82F6'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'action-1', type: 'smoothstep' },
    { id: 'e2', source: 'action-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e3', source: 'skill-1', target: 'skill-2', type: 'smoothstep' },
    { id: 'e4', source: 'skill-2', target: 'action-2', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// CONTENT CREATION TEMPLATES
// ============================================================================

export const CONTENT_GENERATOR: WorkflowTemplate = {
  id: 'template-content-generator',
  name: 'AI Content Generator',
  description: 'Generate high-quality blog posts, social media content, and marketing copy with AI assistance.',
  category: 'content-creation',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['content', 'writing', 'marketing'],
  useCase: 'Create SEO-optimized blog posts and social media content automatically.',
  estimatedTime: '3-5 minutes',
  icon: 'PenTool',
  color: '#F97316',
  downloads: 1543,
  rating: 4.9,
  requiredVariables: ['topic', 'target_audience'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Manual Trigger',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'Zap',
        color: '#F59E0B'
      }
    },
    {
      id: 'skill-1',
      type: 'web-search',
      position: { x: 100, y: 250 },
      data: {
        label: 'Research Topic',
        category: 'skill',
        skillType: 'web-search',
        query: '{{topic}} latest trends',
        numResults: 10,
        provider: 'duckduckgo',
        outputVariable: 'research_results',
        icon: 'Search',
        color: '#0EA5E9'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 100, y: 400 },
      data: {
        label: 'Generate Outline',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.8,
        systemPrompt: 'Create a detailed blog post outline with engaging headlines and key points.',
        query: 'Create an outline for: {{topic}}\n\nResearch: {{research_results}}',
        outputVariable: 'outline',
        icon: 'FileText',
        color: '#F97316'
      }
    },
    {
      id: 'skill-3',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'Write Content',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.9,
        systemPrompt: 'Write engaging, SEO-optimized content based on the outline. Target audience: {{target_audience}}',
        query: 'Write full blog post for this outline: {{outline}}',
        outputVariable: 'blog_post',
        icon: 'PenTool',
        color: '#F97316'
      }
    },
    {
      id: 'skill-4',
      type: 'llm-agent',
      position: { x: 100, y: 700 },
      data: {
        label: 'Generate Social Posts',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.8,
        systemPrompt: 'Create 3 engaging social media posts (Twitter, LinkedIn, Facebook) to promote this blog post.',
        query: 'Create social posts for: {{blog_post}}',
        outputVariable: 'social_posts',
        icon: 'Share2',
        color: '#EC4899'
      }
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 100, y: 850 },
      data: {
        label: 'Output Results',
        category: 'action',
        outputVariable: 'final_content',
        icon: 'CheckCircle',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e2', source: 'skill-1', target: 'skill-2', type: 'smoothstep' },
    { id: 'e3', source: 'skill-2', target: 'skill-3', type: 'smoothstep' },
    { id: 'e4', source: 'skill-3', target: 'skill-4', type: 'smoothstep' },
    { id: 'e5', source: 'skill-4', target: 'output-1', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// RESEARCH TEMPLATES
// ============================================================================

export const RESEARCH_ASSISTANT: WorkflowTemplate = {
  id: 'template-research-assistant',
  name: 'AI Research Assistant',
  description: 'Comprehensive research workflow that searches the web, synthesizes information, and generates detailed reports.',
  category: 'research',
  difficulty: 'intermediate',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['research', 'analysis', 'reporting'],
  useCase: 'Conduct in-depth research on any topic and generate comprehensive research reports.',
  estimatedTime: '5-8 minutes',
  icon: 'Search',
  color: '#EC4899',
  downloads: 726,
  rating: 4.7,
  requiredVariables: ['research_topic', 'depth'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Start Research',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'Zap',
        color: '#F59E0B'
      }
    },
    {
      id: 'skill-1',
      type: 'web-search',
      position: { x: 100, y: 250 },
      data: {
        label: 'Web Search',
        category: 'skill',
        skillType: 'web-search',
        query: '{{research_topic}}',
        numResults: 20,
        provider: 'duckduckgo',
        outputVariable: 'search_results',
        icon: 'Search',
        color: '#0EA5E9'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 100, y: 400 },
      data: {
        label: 'Synthesize Findings',
        category: 'skill',
        skillType: 'research',
        model: 'gpt-5.1',
        temperature: 0.5,
        systemPrompt: 'You are a research analyst. Synthesize information from multiple sources into a coherent summary.',
        query: 'Synthesize these search results: {{search_results}}',
        outputVariable: 'synthesis',
        icon: 'Brain',
        color: '#EC4899'
      }
    },
    {
      id: 'skill-3',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'Generate Report',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.6,
        systemPrompt: 'Create a comprehensive research report with executive summary, key findings, analysis, and conclusions.',
        query: 'Create research report for: {{research_topic}}\n\nFindings: {{synthesis}}',
        outputVariable: 'report',
        icon: 'FileText',
        color: '#F97316'
      }
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 100, y: 700 },
      data: {
        label: 'Output Report',
        category: 'action',
        outputVariable: 'report',
        icon: 'CheckCircle',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e2', source: 'skill-1', target: 'skill-2', type: 'smoothstep' },
    { id: 'e3', source: 'skill-2', target: 'skill-3', type: 'smoothstep' },
    { id: 'e4', source: 'skill-3', target: 'output-1', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// AUTOMATION TEMPLATES
// ============================================================================

export const EMAIL_AUTOMATION: WorkflowTemplate = {
  id: 'template-email-automation',
  name: 'Smart Email Automation',
  description: 'Intelligent email automation that categorizes, prioritizes, and auto-responds to emails.',
  category: 'automation',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['email', 'automation', 'productivity'],
  useCase: 'Automatically process incoming emails, categorize them, and send appropriate responses.',
  estimatedTime: '2-4 minutes',
  icon: 'Mail',
  color: '#3B82F6',
  downloads: 1891,
  rating: 4.8,
  requiredIntegrations: ['email'],
  requiredVariables: ['email_content', 'sender'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Email Received',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'Mail',
        color: '#3B82F6'
      }
    },
    {
      id: 'skill-1',
      type: 'llm-agent',
      position: { x: 100, y: 250 },
      data: {
        label: 'Categorize Email',
        category: 'skill',
        skillType: 'customer-support',
        model: 'gpt-5.1',
        temperature: 0.3,
        systemPrompt: 'Categorize this email as: urgent, important, normal, or spam. Also extract key information.',
        query: '{{email_content}}',
        outputVariable: 'category',
        icon: 'Tags',
        color: '#8B5CF6'
      }
    },
    {
      id: 'logic-1',
      type: 'condition',
      position: { x: 100, y: 400 },
      data: {
        label: 'Is Urgent?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{category.priority}} === "urgent"',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'action-1',
      type: 'send-slack-message',
      position: { x: -100, y: 550 },
      data: {
        label: 'Alert Team',
        category: 'action',
        actionType: 'send-slack-message',
        parameters: {
          channel: '#urgent',
          message: 'Urgent email from {{sender}}: {{category.summary}}'
        },
        icon: 'AlertCircle',
        color: '#EF4444'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 300, y: 550 },
      data: {
        label: 'Generate Response',
        category: 'skill',
        skillType: 'customer-support',
        model: 'gpt-5.1',
        temperature: 0.7,
        systemPrompt: 'Generate a professional email response based on the category and content.',
        query: 'Respond to: {{email_content}}',
        outputVariable: 'response',
        icon: 'MessageSquare',
        color: '#8B5CF6'
      }
    },
    {
      id: 'action-2',
      type: 'send-email',
      position: { x: 100, y: 700 },
      data: {
        label: 'Send Response',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{sender}}',
          subject: 'Re: {{category.subject}}',
          body: '{{response}}'
        },
        icon: 'Send',
        color: '#3B82F6'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e2', source: 'skill-1', target: 'logic-1', type: 'smoothstep' },
    { id: 'e3', source: 'logic-1', target: 'action-1', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e4', source: 'logic-1', target: 'skill-2', sourceHandle: 'false', type: 'smoothstep' },
    { id: 'e5', source: 'action-1', target: 'action-2', type: 'smoothstep' },
    { id: 'e6', source: 'skill-2', target: 'action-2', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// INTEGRATION TEMPLATES
// ============================================================================

export const LEAD_QUALIFICATION: WorkflowTemplate = {
  id: 'template-lead-qualification',
  name: 'Lead Qualification Workflow',
  description: 'Automated lead qualification that scores leads, enriches data, and routes to sales team.',
  category: 'integration',
  difficulty: 'advanced',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['sales', 'crm', 'automation'],
  useCase: 'Automatically qualify and score incoming leads, enrich with data, and assign to sales reps.',
  estimatedTime: '8-12 minutes',
  icon: 'Users',
  color: '#10B981',
  downloads: 534,
  rating: 4.5,
  requiredIntegrations: ['crm', 'email'],
  requiredVariables: ['lead_email', 'lead_company'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Lead',
        category: 'trigger',
        triggerType: 'webhook',
        icon: 'Webhook',
        color: '#10B981'
      }
    },
    {
      id: 'skill-1',
      type: 'web-search',
      position: { x: 100, y: 250 },
      data: {
        label: 'Research Company',
        category: 'skill',
        skillType: 'web-search',
        query: '{{lead_company}} company information',
        numResults: 10,
        provider: 'duckduckgo',
        outputVariable: 'company_info',
        icon: 'Search',
        color: '#0EA5E9'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 100, y: 400 },
      data: {
        label: 'Score Lead',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-5.1',
        temperature: 0.3,
        systemPrompt: 'Score this lead from 1-100 based on company size, industry, and fit. Provide reasoning.',
        query: 'Score lead: {{lead_company}}\n\nInfo: {{company_info}}',
        outputVariable: 'lead_score',
        icon: 'Target',
        color: '#06B6D4'
      }
    },
    {
      id: 'logic-1',
      type: 'condition',
      position: { x: 100, y: 550 },
      data: {
        label: 'High Quality?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{lead_score.score}} > 70',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'action-1',
      type: 'update-database',
      position: { x: -100, y: 700 },
      data: {
        label: 'Assign to Sales',
        category: 'action',
        actionType: 'update-database',
        parameters: {
          table: 'leads',
          operation: 'update',
          data: { status: 'qualified', assigned_to: 'sales_team' }
        },
        icon: 'UserPlus',
        color: '#10B981'
      }
    },
    {
      id: 'action-2',
      type: 'send-email',
      position: { x: 300, y: 700 },
      data: {
        label: 'Nurture Email',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{lead_email}}',
          subject: 'Thanks for your interest',
          body: 'Personalized nurture email'
        },
        icon: 'Mail',
        color: '#3B82F6'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e2', source: 'skill-1', target: 'skill-2', type: 'smoothstep' },
    { id: 'e3', source: 'skill-2', target: 'logic-1', type: 'smoothstep' },
    { id: 'e4', source: 'logic-1', target: 'action-1', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e5', source: 'logic-1', target: 'action-2', sourceHandle: 'false', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// HIGH-VALUE STARTER TEMPLATES (USER REQUESTED)
// These templates allow users to have a complete workflow in 30 seconds
// ============================================================================

export const SMART_EMAIL_TRIAGE: WorkflowTemplate = {
  id: 'template-smart-email-triage',
  name: '📧 Smart Email Triage',
  description: 'Automatically categorize and prioritize incoming emails, draft responses, and route to approval before sending.',
  category: 'automation',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['email', 'ai', 'approval', 'automation', 'starter'],
  useCase: 'Email trigger → AI Analysis → Condition → Approval → Reply',
  estimatedTime: '2-3 minutes',
  icon: 'Mail',
  color: '#3B82F6',
  downloads: 2450,
  rating: 4.9,
  requiredIntegrations: ['email'],
  requiredVariables: ['email_from', 'email_subject', 'email_body'],
  nodes: [
    {
      id: 'trigger-email',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Email Received',
        category: 'trigger',
        triggerType: 'email-received',
        icon: 'Mail',
        color: '#3B82F6'
      }
    },
    {
      id: 'ai-analyze',
      type: 'llm-agent',
      position: { x: 100, y: 250 },
      data: {
        label: 'AI Analysis',
        category: 'skill',
        skillType: 'email-analysis',
        model: 'gpt-5.1',
        temperature: 0.3,
        systemPrompt: `Analyze this email and return JSON:
{
  "priority": "urgent" | "high" | "normal" | "low",
  "category": "support" | "sales" | "billing" | "general",
  "sentiment": "positive" | "neutral" | "negative",
  "requires_response": true | false,
  "summary": "<one line summary>",
  "suggested_response": "<draft response if requires_response is true>"
}`,
        query: 'From: {{email_from}}\nSubject: {{email_subject}}\n\n{{email_body}}',
        outputVariable: 'email_analysis',
        icon: 'Brain',
        color: '#8B5CF6'
      }
    },
    {
      id: 'condition-urgent',
      type: 'condition',
      position: { x: 100, y: 400 },
      data: {
        label: 'Is Urgent?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{email_analysis.priority}} === "urgent" || {{email_analysis.priority}} === "high"',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'approval-node',
      type: 'human-approval',
      position: { x: -100, y: 550 },
      data: {
        label: 'Approve Response',
        category: 'approval',
        approvalMessage: 'Please review and approve this AI-generated response',
        timeout: 3600,
        notifySlack: true,
        previewData: {
          type: 'email',
          summary: '{{email_analysis.suggested_response}}',
          details: {
            to: '{{email_from}}',
            subject: 'Re: {{email_subject}}'
          }
        },
        icon: 'UserCheck',
        color: '#F59E0B'
      }
    },
    {
      id: 'send-reply',
      type: 'send-email',
      position: { x: -100, y: 700 },
      data: {
        label: 'Send Response',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{email_from}}',
          subject: 'Re: {{email_subject}}',
          body: '{{email_analysis.suggested_response}}'
        },
        icon: 'Send',
        color: '#10B981'
      }
    },
    {
      id: 'label-normal',
      type: 'update-database',
      position: { x: 300, y: 550 },
      data: {
        label: 'Archive & Label',
        category: 'action',
        actionType: 'update-database',
        parameters: {
          operation: 'update',
          table: 'emails',
          data: { label: '{{email_analysis.category}}', priority: '{{email_analysis.priority}}' }
        },
        icon: 'Tag',
        color: '#06B6D4'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-email', target: 'ai-analyze', type: 'smoothstep' },
    { id: 'e2', source: 'ai-analyze', target: 'condition-urgent', type: 'smoothstep' },
    { id: 'e3', source: 'condition-urgent', target: 'approval-node', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e4', source: 'approval-node', target: 'send-reply', sourceHandle: 'approved', type: 'smoothstep' },
    { id: 'e5', source: 'condition-urgent', target: 'label-normal', sourceHandle: 'false', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const LEAD_ENRICHMENT_PIPELINE: WorkflowTemplate = {
  id: 'template-lead-enrichment',
  name: '🎯 Lead Enrichment',
  description: 'When a new lead comes in via webhook, research the company with AI, enrich lead data, and update CRM automatically.',
  category: 'sales',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['lead', 'crm', 'enrichment', 'webhook', 'starter'],
  useCase: 'Webhook trigger → AI Research → CRM Update',
  estimatedTime: '1-2 minutes',
  icon: 'Target',
  color: '#10B981',
  downloads: 1890,
  rating: 4.8,
  requiredIntegrations: ['crm'],
  requiredVariables: ['lead_email', 'lead_name', 'lead_company'],
  nodes: [
    {
      id: 'trigger-webhook',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Lead Webhook',
        category: 'trigger',
        triggerType: 'webhook',
        webhookPath: '/leads/new',
        icon: 'Webhook',
        color: '#10B981'
      }
    },
    {
      id: 'web-research',
      type: 'web-search',
      position: { x: 100, y: 250 },
      data: {
        label: 'Research Company',
        category: 'skill',
        skillType: 'web-search',
        query: '{{lead_company}} company information funding employees',
        numResults: 10,
        provider: 'duckduckgo',
        outputVariable: 'company_research',
        icon: 'Search',
        color: '#0EA5E9'
      }
    },
    {
      id: 'ai-enrich',
      type: 'llm-agent',
      position: { x: 100, y: 400 },
      data: {
        label: 'AI Lead Enrichment',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-5.1',
        temperature: 0.3,
        systemPrompt: `You are a lead enrichment AI. Analyze the research data and extract:
- Company size (employees)
- Industry
- Funding status
- Key decision makers (if found)
- Company description
- Estimated annual revenue

Return structured JSON with these fields.`,
        query: 'Lead: {{lead_name}} at {{lead_company}}\nEmail: {{lead_email}}\n\nResearch:\n{{company_research}}',
        outputVariable: 'enriched_data',
        icon: 'Brain',
        color: '#8B5CF6'
      }
    },
    {
      id: 'ai-score',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'Score Lead',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-5.1',
        temperature: 0.2,
        systemPrompt: 'Score this lead 1-100 based on company size, industry fit, and growth potential. Return JSON: { "score": number, "reasoning": string, "category": "hot" | "warm" | "cold" }',
        query: 'Enriched data: {{enriched_data}}',
        outputVariable: 'lead_score',
        icon: 'Target',
        color: '#F59E0B'
      }
    },
    {
      id: 'crm-update',
      type: 'crm-update-lead',
      position: { x: 100, y: 700 },
      data: {
        label: 'Update CRM',
        category: 'action',
        actionType: 'crm-update-lead',
        parameters: {
          leadId: '{{lead_id}}',
          company_size: '{{enriched_data.employees}}',
          industry: '{{enriched_data.industry}}',
          lead_score: '{{lead_score.score}}',
          score_category: '{{lead_score.category}}',
          enriched: true
        },
        icon: 'Database',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-webhook', target: 'web-research', type: 'smoothstep' },
    { id: 'e2', source: 'web-research', target: 'ai-enrich', type: 'smoothstep' },
    { id: 'e3', source: 'ai-enrich', target: 'ai-score', type: 'smoothstep' },
    { id: 'e4', source: 'ai-score', target: 'crm-update', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const CONTENT_REPURPOSING: WorkflowTemplate = {
  id: 'template-content-repurposing',
  name: '✍️ Content Repurposing',
  description: 'Transform a blog post into LinkedIn post and Tweet, get approval, then post to social media.',
  category: 'content-creation',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['content', 'social', 'linkedin', 'twitter', 'approval', 'starter'],
  useCase: 'Manual trigger → AI Blog→LinkedIn → AI Blog→Tweet → Approval → Post',
  estimatedTime: '2-3 minutes',
  icon: 'Share2',
  color: '#EC4899',
  downloads: 1650,
  rating: 4.7,
  requiredIntegrations: ['linkedin', 'twitter'],
  requiredVariables: ['blog_post_content', 'blog_post_title'],
  nodes: [
    {
      id: 'trigger-manual',
      type: 'trigger',
      position: { x: 250, y: 100 },
      data: {
        label: 'New Blog Post',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'FileText',
        color: '#EC4899'
      }
    },
    {
      id: 'ai-linkedin',
      type: 'llm-agent',
      position: { x: 100, y: 250 },
      data: {
        label: 'Generate LinkedIn Post',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.8,
        systemPrompt: `Transform this blog post into an engaging LinkedIn post.
- Professional yet approachable tone
- Include relevant hashtags
- Add a hook in the first line
- Include a call-to-action
- Max 1500 characters`,
        query: 'Blog Title: {{blog_post_title}}\n\n{{blog_post_content}}',
        outputVariable: 'linkedin_post',
        icon: 'Linkedin',
        color: '#0077B5'
      }
    },
    {
      id: 'ai-tweet',
      type: 'llm-agent',
      position: { x: 400, y: 250 },
      data: {
        label: 'Generate Tweet',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.9,
        systemPrompt: `Transform this blog post into an engaging tweet thread (3-5 tweets).
- Punchy, attention-grabbing first tweet
- Break down key insights
- Include relevant hashtags
- Each tweet max 280 characters`,
        query: 'Blog Title: {{blog_post_title}}\n\n{{blog_post_content}}',
        outputVariable: 'tweet_thread',
        icon: 'Twitter',
        color: '#1DA1F2'
      }
    },
    {
      id: 'approval-social',
      type: 'human-approval',
      position: { x: 250, y: 400 },
      data: {
        label: 'Review & Approve',
        category: 'approval',
        approvalMessage: 'Please review the generated social media content before posting',
        timeout: 86400,
        notifyEmail: true,
        previewData: {
          type: 'social-media',
          summary: 'LinkedIn + Twitter posts ready for review',
          details: {
            linkedin: '{{linkedin_post}}',
            twitter: '{{tweet_thread}}'
          }
        },
        icon: 'UserCheck',
        color: '#F59E0B'
      }
    },
    {
      id: 'post-linkedin',
      type: 'api-call',
      position: { x: 100, y: 550 },
      data: {
        label: 'Post to LinkedIn',
        category: 'action',
        actionType: 'api-call',
        parameters: {
          endpoint: 'linkedin/posts',
          method: 'POST',
          body: { content: '{{linkedin_post}}' }
        },
        icon: 'Send',
        color: '#0077B5'
      }
    },
    {
      id: 'post-twitter',
      type: 'api-call',
      position: { x: 400, y: 550 },
      data: {
        label: 'Post Tweet Thread',
        category: 'action',
        actionType: 'api-call',
        parameters: {
          endpoint: 'twitter/tweets',
          method: 'POST',
          body: { thread: '{{tweet_thread}}' }
        },
        icon: 'Send',
        color: '#1DA1F2'
      }
    },
    {
      id: 'output-success',
      type: 'output',
      position: { x: 250, y: 700 },
      data: {
        label: 'Content Published',
        category: 'action',
        outputVariable: 'publish_result',
        icon: 'CheckCircle',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-manual', target: 'ai-linkedin', type: 'smoothstep' },
    { id: 'e2', source: 'trigger-manual', target: 'ai-tweet', type: 'smoothstep' },
    { id: 'e3', source: 'ai-linkedin', target: 'approval-social', type: 'smoothstep' },
    { id: 'e4', source: 'ai-tweet', target: 'approval-social', type: 'smoothstep' },
    { id: 'e5', source: 'approval-social', target: 'post-linkedin', sourceHandle: 'approved', type: 'smoothstep' },
    { id: 'e6', source: 'approval-social', target: 'post-twitter', sourceHandle: 'approved', type: 'smoothstep' },
    { id: 'e7', source: 'post-linkedin', target: 'output-success', type: 'smoothstep' },
    { id: 'e8', source: 'post-twitter', target: 'output-success', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const INVOICE_PROCESSING: WorkflowTemplate = {
  id: 'template-invoice-processing',
  name: '🧾 Invoice Processing',
  description: 'Extract data from invoice emails using AI, request approval for payments, then update finance database.',
  category: 'automation',
  difficulty: 'intermediate',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['invoice', 'finance', 'extraction', 'approval', 'starter'],
  useCase: 'Email trigger → AI Extract → Approval → Finance DB',
  estimatedTime: '3-4 minutes',
  icon: 'FileText',
  color: '#F59E0B',
  downloads: 1420,
  rating: 4.8,
  requiredIntegrations: ['email', 'database'],
  requiredVariables: ['email_body', 'email_attachments'],
  nodes: [
    {
      id: 'trigger-invoice-email',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Invoice Email Received',
        category: 'trigger',
        triggerType: 'email-received',
        filter: 'subject contains "invoice" OR subject contains "Rechnung"',
        icon: 'Mail',
        color: '#F59E0B'
      }
    },
    {
      id: 'ai-extract',
      type: 'llm-agent',
      position: { x: 100, y: 250 },
      data: {
        label: 'AI Extract Invoice Data',
        category: 'skill',
        skillType: 'data-extraction',
        model: 'gpt-5.1',
        temperature: 0.1,
        systemPrompt: `Extract invoice information and return JSON:
{
  "vendor_name": string,
  "invoice_number": string,
  "invoice_date": "YYYY-MM-DD",
  "due_date": "YYYY-MM-DD",
  "total_amount": number,
  "currency": "EUR" | "USD" | string,
  "line_items": [{ "description": string, "amount": number }],
  "tax_amount": number,
  "payment_terms": string,
  "bank_details": { "iban": string, "bic": string } | null
}

Be precise with numbers. Return null for fields you cannot extract.`,
        query: 'Email content:\n{{email_body}}\n\nAttachment content:\n{{email_attachments}}',
        outputVariable: 'invoice_data',
        icon: 'Brain',
        color: '#8B5CF6'
      }
    },
    {
      id: 'condition-amount',
      type: 'condition',
      position: { x: 100, y: 400 },
      data: {
        label: 'Amount > €1000?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{invoice_data.total_amount}} > 1000',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'approval-high',
      type: 'human-approval',
      position: { x: -100, y: 550 },
      data: {
        label: 'Manager Approval',
        category: 'approval',
        approvalMessage: 'High-value invoice requires manager approval',
        timeout: 172800,
        notifyEmail: true,
        notifySlack: true,
        assignToRole: 'finance_manager',
        previewData: {
          type: 'invoice',
          summary: '{{invoice_data.vendor_name}} - {{invoice_data.currency}} {{invoice_data.total_amount}}',
          details: {
            invoice_number: '{{invoice_data.invoice_number}}',
            due_date: '{{invoice_data.due_date}}',
            line_items: '{{invoice_data.line_items}}'
          }
        },
        icon: 'UserCheck',
        color: '#EF4444'
      }
    },
    {
      id: 'approval-auto',
      type: 'human-approval',
      position: { x: 300, y: 550 },
      data: {
        label: 'Quick Review',
        category: 'approval',
        approvalMessage: 'Standard invoice - quick review',
        timeout: 86400,
        notifyEmail: true,
        previewData: {
          type: 'invoice',
          summary: '{{invoice_data.vendor_name}} - {{invoice_data.currency}} {{invoice_data.total_amount}}',
          details: {
            invoice_number: '{{invoice_data.invoice_number}}'
          }
        },
        icon: 'UserCheck',
        color: '#F59E0B'
      }
    },
    {
      id: 'db-update',
      type: 'update-database',
      position: { x: 100, y: 700 },
      data: {
        label: 'Update Finance DB',
        category: 'action',
        actionType: 'update-database',
        parameters: {
          operation: 'insert',
          table: 'invoices',
          data: {
            vendor: '{{invoice_data.vendor_name}}',
            invoice_number: '{{invoice_data.invoice_number}}',
            amount: '{{invoice_data.total_amount}}',
            currency: '{{invoice_data.currency}}',
            due_date: '{{invoice_data.due_date}}',
            status: 'approved',
            approved_at: '{{now}}'
          }
        },
        icon: 'Database',
        color: '#10B981'
      }
    },
    {
      id: 'notify-finance',
      type: 'send-slack-message',
      position: { x: 100, y: 850 },
      data: {
        label: 'Notify Finance Team',
        category: 'action',
        actionType: 'send-slack-message',
        parameters: {
          channel: '#finance',
          message: '✅ Invoice {{invoice_data.invoice_number}} from {{invoice_data.vendor_name}} ({{invoice_data.currency}} {{invoice_data.total_amount}}) has been approved and recorded.'
        },
        icon: 'Bell',
        color: '#3B82F6'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-invoice-email', target: 'ai-extract', type: 'smoothstep' },
    { id: 'e2', source: 'ai-extract', target: 'condition-amount', type: 'smoothstep' },
    { id: 'e3', source: 'condition-amount', target: 'approval-high', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e4', source: 'condition-amount', target: 'approval-auto', sourceHandle: 'false', type: 'smoothstep' },
    { id: 'e5', source: 'approval-high', target: 'db-update', sourceHandle: 'approved', type: 'smoothstep' },
    { id: 'e6', source: 'approval-auto', target: 'db-update', sourceHandle: 'approved', type: 'smoothstep' },
    { id: 'e7', source: 'db-update', target: 'notify-finance', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const DAILY_BRIEFING: WorkflowTemplate = {
  id: 'template-daily-briefing',
  name: '📰 Daily Briefing',
  description: 'Every morning, AI summarizes your calendar, emails, and tasks, then sends you a personalized briefing email.',
  category: 'automation',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['briefing', 'summary', 'schedule', 'email', 'starter'],
  useCase: 'Schedule trigger → AI Summarize → Send Email',
  estimatedTime: '1-2 minutes',
  icon: 'Calendar',
  color: '#8B5CF6',
  downloads: 2100,
  rating: 4.9,
  requiredIntegrations: ['calendar', 'email'],
  requiredVariables: ['user_email', 'user_name'],
  nodes: [
    {
      id: 'trigger-schedule',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Every Morning 7:00 AM',
        category: 'trigger',
        triggerType: 'time-based',
        schedule: '0 7 * * 1-5', // Monday to Friday at 7 AM
        timezone: 'Europe/Berlin',
        icon: 'Clock',
        color: '#8B5CF6'
      }
    },
    {
      id: 'fetch-calendar',
      type: 'api-call',
      position: { x: 100, y: 250 },
      data: {
        label: 'Fetch Today\'s Calendar',
        category: 'action',
        actionType: 'api-call',
        parameters: {
          endpoint: 'calendar/events',
          method: 'GET',
          params: { date: 'today' }
        },
        outputVariable: 'calendar_events',
        icon: 'Calendar',
        color: '#3B82F6'
      }
    },
    {
      id: 'fetch-emails',
      type: 'api-call',
      position: { x: 100, y: 400 },
      data: {
        label: 'Fetch Unread Emails',
        category: 'action',
        actionType: 'api-call',
        parameters: {
          endpoint: 'email/unread',
          method: 'GET',
          params: { limit: 20 }
        },
        outputVariable: 'unread_emails',
        icon: 'Mail',
        color: '#06B6D4'
      }
    },
    {
      id: 'ai-summarize',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'AI Daily Summary',
        category: 'skill',
        skillType: 'summarization',
        model: 'gpt-5.1',
        temperature: 0.7,
        systemPrompt: `Create a friendly, professional daily briefing email. Include:

1. 🌅 **Good Morning Greeting** - Personalized with day of week
2. 📅 **Today's Agenda** - List meetings with times and key attendees
3. 📧 **Email Highlights** - Top 5 important unread emails summarized
4. ⚡ **Focus Tip** - One productivity suggestion based on the day's schedule
5. 🎯 **Today's Priority** - Suggest one thing to focus on

Keep it concise, scannable, and actionable. Use emojis sparingly.`,
        query: 'Calendar Events:\n{{calendar_events}}\n\nUnread Emails:\n{{unread_emails}}\n\nUser: {{user_name}}',
        outputVariable: 'daily_briefing',
        icon: 'Brain',
        color: '#8B5CF6'
      }
    },
    {
      id: 'send-briefing',
      type: 'send-email',
      position: { x: 100, y: 700 },
      data: {
        label: 'Send Briefing Email',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{user_email}}',
          subject: '🌅 Your Daily Briefing - {{today_date}}',
          body: '{{daily_briefing}}'
        },
        icon: 'Send',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-schedule', target: 'fetch-calendar', type: 'smoothstep' },
    { id: 'e2', source: 'fetch-calendar', target: 'fetch-emails', type: 'smoothstep' },
    { id: 'e3', source: 'fetch-emails', target: 'ai-summarize', type: 'smoothstep' },
    { id: 'e4', source: 'ai-summarize', target: 'send-briefing', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// CRM-NATIVE TEMPLATES (SINTRA'S KILLER FEATURE!)
// ============================================================================

export const LEAD_SCORING_AGENT: WorkflowTemplate = {
  id: 'template-lead-scoring-crm',
  name: '🎯 Lead Scoring Agent',
  description: 'CRM-native agent that analyzes lead behavior in real-time, auto-scores, and prioritizes (Hot/Warm/Cold). Triggers actions based on engagement.',
  category: 'crm',
  difficulty: 'beginner',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['crm', 'lead-scoring', 'automation', 'sales'],
  useCase: 'Automatically score leads when they engage (email opens, website visits, form submissions) and route to sales team.',
  estimatedTime: '3-5 minutes',
  icon: 'Target',
  color: '#F59E0B',
  downloads: 0,
  rating: 5.0,
  requiredIntegrations: ['crm', 'email'],
  requiredVariables: ['lead_id', 'lead_email', 'lead_company'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Lead Activity Detected',
        category: 'trigger',
        triggerType: 'event-based',
        eventName: 'lead.activity',
        icon: 'Zap',
        color: '#F59E0B'
      }
    },
    {
      id: 'data-1',
      type: 'crm-pipeline',
      position: { x: 100, y: 250 },
      data: {
        label: 'Get Lead Data',
        category: 'data',
        dataSource: 'crm_pipeline',
        query: 'lead_id = {{lead_id}}',
        outputVariable: 'lead_data',
        icon: 'Database',
        color: '#06B6D4'
      }
    },
    {
      id: 'skill-1',
      type: 'llm-agent',
      position: { x: 100, y: 400 },
      data: {
        label: 'AI Lead Scorer',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-5.1',
        temperature: 0.2,
        systemPrompt: `You are a Lead Scoring AI for a CRM system.

Analyze lead data and score from 0-100 based on:
- Email engagement (opens, clicks)
- Website visits & page views
- Company size & industry fit
- Job title & seniority
- Time since last interaction

Return JSON with:
{
  "score": <0-100>,
  "category": "hot" | "warm" | "cold",
  "reasoning": "<brief explanation>",
  "next_action": "<recommended next step>"
}`,
        query: `Score this lead:
Lead Data: {{lead_data}}
Recent Activity: Email opened 3x, visited pricing page`,
        outputVariable: 'lead_score',
        icon: 'Brain',
        color: '#8B5CF6'
      }
    },
    {
      id: 'logic-1',
      type: 'condition',
      position: { x: 100, y: 550 },
      data: {
        label: 'Is Hot Lead?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{lead_score.score}} >= 80',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'action-1',
      type: 'crm-update-lead',
      position: { x: -100, y: 700 },
      data: {
        label: 'Mark as Hot & Assign',
        category: 'action',
        actionType: 'crm-update-lead',
        parameters: {
          leadId: '{{lead_id}}',
          status: 'hot',
          score: '{{lead_score.score}}',
          assignTo: 'sales_team_lead'
        },
        icon: 'Flame',
        color: '#EF4444'
      }
    },
    {
      id: 'action-2',
      type: 'send-slack-message',
      position: { x: -100, y: 850 },
      data: {
        label: '🔥 Alert Sales Team',
        category: 'action',
        actionType: 'send-slack-message',
        parameters: {
          channel: '#hot-leads',
          message: '🔥 HOT LEAD ALERT!\n\nLead: {{lead_data.name}} from {{lead_company}}\nScore: {{lead_score.score}}/100\nReason: {{lead_score.reasoning}}\nNext Action: {{lead_score.next_action}}'
        },
        icon: 'Bell',
        color: '#EF4444'
      }
    },
    {
      id: 'action-3',
      type: 'crm-update-lead',
      position: { x: 300, y: 700 },
      data: {
        label: 'Update Score Only',
        category: 'action',
        actionType: 'crm-update-lead',
        parameters: {
          leadId: '{{lead_id}}',
          score: '{{lead_score.score}}',
          category: '{{lead_score.category}}'
        },
        icon: 'RefreshCw',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'data-1', type: 'smoothstep' },
    { id: 'e2', source: 'data-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e3', source: 'skill-1', target: 'logic-1', type: 'smoothstep' },
    { id: 'e4', source: 'logic-1', target: 'action-1', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e5', source: 'action-1', target: 'action-2', type: 'smoothstep' },
    { id: 'e6', source: 'logic-1', target: 'action-3', sourceHandle: 'false', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const COLD_CALL_AUTOMATION: WorkflowTemplate = {
  id: 'template-cold-call-automation',
  name: '📞 Cold Call Automation Agent',
  description: 'CRM-aware agent that reads pipeline data, suggests best call times, generates personalized scripts, and logs calls automatically.',
  category: 'crm',
  difficulty: 'intermediate',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['cold-calling', 'sales', 'crm', 'automation'],
  useCase: 'Prepare for cold calls with AI-generated personalized scripts and auto-log call outcomes in CRM.',
  estimatedTime: '5-8 minutes',
  icon: 'Phone',
  color: '#3B82F6',
  downloads: 0,
  rating: 5.0,
  requiredIntegrations: ['crm', 'calendar'],
  requiredVariables: ['lead_id', 'sales_rep_id'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Schedule Call Task',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'Calendar',
        color: '#3B82F6'
      }
    },
    {
      id: 'data-1',
      type: 'crm-pipeline',
      position: { x: 100, y: 250 },
      data: {
        label: 'Get Lead & Company Info',
        category: 'data',
        dataSource: 'crm_pipeline',
        query: 'lead_id = {{lead_id}}',
        outputVariable: 'lead_info',
        icon: 'Database',
        color: '#06B6D4'
      }
    },
    {
      id: 'skill-1',
      type: 'web-search',
      position: { x: 100, y: 400 },
      data: {
        label: 'Research Company',
        category: 'skill',
        skillType: 'web-search',
        query: '{{lead_info.company}} recent news',
        numResults: 5,
        provider: 'duckduckgo',
        outputVariable: 'company_research',
        icon: 'Search',
        color: '#0EA5E9'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'Generate Call Script',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.7,
        systemPrompt: `You are a Cold Calling Script Generator.

Create a personalized cold call script with:
1. Opening (hook based on recent company news)
2. Value proposition
3. 3 qualifying questions
4. Objection handling
5. Close (ask for meeting)

Keep it conversational and natural.`,
        query: `Generate cold call script for:
Lead: {{lead_info.name}} - {{lead_info.title}}
Company: {{lead_info.company}}
Research: {{company_research}}`,
        outputVariable: 'call_script',
        icon: 'FileText',
        color: '#F97316'
      }
    },
    {
      id: 'skill-3',
      type: 'llm-agent',
      position: { x: 100, y: 700 },
      data: {
        label: 'Suggest Best Call Time',
        category: 'skill',
        skillType: 'planning',
        model: 'gpt-5.1',
        temperature: 0.3,
        systemPrompt: `Based on lead data and timezone, suggest the 3 best times to call today.
Consider: Industry, job role, timezone.
Return times in format: "2:00 PM EST"`,
        query: `Lead: {{lead_info}}`,
        outputVariable: 'best_times',
        icon: 'Clock',
        color: '#8B5CF6'
      }
    },
    {
      id: 'action-1',
      type: 'crm-log-call',
      position: { x: 100, y: 850 },
      data: {
        label: 'Create Call Task',
        category: 'action',
        actionType: 'crm-log-call',
        parameters: {
          leadId: '{{lead_id}}',
          salesRepId: '{{sales_rep_id}}',
          callScript: '{{call_script}}',
          suggestedTimes: '{{best_times}}',
          status: 'scheduled'
        },
        icon: 'CheckSquare',
        color: '#10B981'
      }
    },
    {
      id: 'output-1',
      type: 'output',
      position: { x: 100, y: 1000 },
      data: {
        label: 'Show Script to Rep',
        category: 'action',
        outputVariable: 'call_script',
        icon: 'CheckCircle',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'data-1', type: 'smoothstep' },
    { id: 'e2', source: 'data-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e3', source: 'skill-1', target: 'skill-2', type: 'smoothstep' },
    { id: 'e4', source: 'skill-2', target: 'skill-3', type: 'smoothstep' },
    { id: 'e5', source: 'skill-3', target: 'action-1', type: 'smoothstep' },
    { id: 'e6', source: 'action-1', target: 'output-1', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

export const DEAL_INTELLIGENCE_AGENT: WorkflowTemplate = {
  id: 'template-deal-intelligence',
  name: '💰 Deal Intelligence Agent',
  description: 'Detects stuck deals, analyzes why they\'re stalled, suggests next-best-action, and generates follow-up emails/WhatsApp messages.',
  category: 'crm',
  difficulty: 'advanced',
  author: 'Flowent AI',
  version: '1.0.0',
  tags: ['deal-management', 'sales', 'crm', 'ai-insights'],
  useCase: 'Identify deals that haven\'t moved in 7+ days and generate personalized re-engagement strategies.',
  estimatedTime: '8-12 minutes',
  icon: 'TrendingUp',
  color: '#10B981',
  downloads: 0,
  rating: 5.0,
  requiredIntegrations: ['crm', 'email', 'whatsapp'],
  requiredVariables: ['deal_id'],
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Daily Scan (9 AM)',
        category: 'trigger',
        triggerType: 'time-based',
        schedule: '0 9 * * *',
        icon: 'Clock',
        color: '#8B5CF6'
      }
    },
    {
      id: 'data-1',
      type: 'crm-pipeline',
      position: { x: 100, y: 250 },
      data: {
        label: 'Find Stuck Deals',
        category: 'data',
        dataSource: 'crm_pipeline',
        query: 'status = "in_progress" AND days_since_update >= 7',
        outputVariable: 'stuck_deals',
        icon: 'Database',
        color: '#06B6D4'
      }
    },
    {
      id: 'logic-1',
      type: 'loop',
      position: { x: 100, y: 400 },
      data: {
        label: 'For Each Deal',
        category: 'logic',
        logicType: 'loop',
        iterations: '{{stuck_deals.length}}',
        icon: 'RefreshCw',
        color: '#6366F1'
      }
    },
    {
      id: 'skill-1',
      type: 'llm-agent',
      position: { x: 100, y: 550 },
      data: {
        label: 'Analyze Why Stuck',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-5.1',
        temperature: 0.4,
        systemPrompt: `You are a Deal Intelligence AI.

Analyze why this deal is stuck based on:
- Last interaction date
- Deal stage
- Customer signals (email opens, website visits)
- Previous objections/concerns

Return JSON:
{
  "stuck_reason": "<reason>",
  "urgency": "high" | "medium" | "low",
  "next_best_action": "<specific action>",
  "suggested_message": "<personalized message>"
}`,
        query: `Analyze deal: {{current_deal}}`,
        outputVariable: 'deal_analysis',
        icon: 'Brain',
        color: '#EC4899'
      }
    },
    {
      id: 'skill-2',
      type: 'llm-agent',
      position: { x: 100, y: 700 },
      data: {
        label: 'Generate Follow-up',
        category: 'skill',
        skillType: 'content-generation',
        model: 'gpt-5.1',
        temperature: 0.8,
        systemPrompt: `Generate a warm, personalized follow-up message.

Tone: Friendly but professional
Goal: Re-engage without being pushy
Include: Value reminder + gentle nudge`,
        query: `Create follow-up for:
Deal: {{current_deal.name}}
Analysis: {{deal_analysis}}`,
        outputVariable: 'follow_up_message',
        icon: 'Mail',
        color: '#3B82F6'
      }
    },
    {
      id: 'logic-2',
      type: 'condition',
      position: { x: 100, y: 850 },
      data: {
        label: 'Preferred Channel?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{current_deal.preferred_channel}} === "whatsapp"',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'action-1',
      type: 'send-whatsapp',
      position: { x: -100, y: 1000 },
      data: {
        label: 'Send WhatsApp',
        category: 'action',
        actionType: 'send-whatsapp',
        parameters: {
          to: '{{current_deal.phone}}',
          message: '{{follow_up_message}}'
        },
        icon: 'MessageCircle',
        color: '#25D366'
      }
    },
    {
      id: 'action-2',
      type: 'send-email',
      position: { x: 300, y: 1000 },
      data: {
        label: 'Send Email',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{current_deal.email}}',
          subject: 'Quick follow-up on {{current_deal.name}}',
          body: '{{follow_up_message}}'
        },
        icon: 'Mail',
        color: '#3B82F6'
      }
    },
    {
      id: 'action-3',
      type: 'crm-update-deal',
      position: { x: 100, y: 1150 },
      data: {
        label: 'Log Activity',
        category: 'action',
        actionType: 'crm-update-deal',
        parameters: {
          dealId: '{{current_deal.id}}',
          activity: 'AI-generated follow-up sent',
          notes: '{{deal_analysis.stuck_reason}}'
        },
        icon: 'CheckCircle',
        color: '#10B981'
      }
    }
  ],
  edges: [
    { id: 'e1', source: 'trigger-1', target: 'data-1', type: 'smoothstep' },
    { id: 'e2', source: 'data-1', target: 'logic-1', type: 'smoothstep' },
    { id: 'e3', source: 'logic-1', target: 'skill-1', type: 'smoothstep' },
    { id: 'e4', source: 'skill-1', target: 'skill-2', type: 'smoothstep' },
    { id: 'e5', source: 'skill-2', target: 'logic-2', type: 'smoothstep' },
    { id: 'e6', source: 'logic-2', target: 'action-1', sourceHandle: 'true', type: 'smoothstep' },
    { id: 'e7', source: 'logic-2', target: 'action-2', sourceHandle: 'false', type: 'smoothstep' },
    { id: 'e8', source: 'action-1', target: 'action-3', type: 'smoothstep' },
    { id: 'e9', source: 'action-2', target: 'action-3', type: 'smoothstep' }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // 🚀 HIGH-VALUE STARTER TEMPLATES (Most Popular)
  SMART_EMAIL_TRIAGE,
  LEAD_ENRICHMENT_PIPELINE,
  CONTENT_REPURPOSING,
  INVOICE_PROCESSING,
  DAILY_BRIEFING,
  // Standard templates
  CUSTOMER_SUPPORT_AGENT,
  DATA_ANALYSIS_PIPELINE,
  CONTENT_GENERATOR,
  RESEARCH_ASSISTANT,
  EMAIL_AUTOMATION,
  LEAD_QUALIFICATION,
  // 🔥 CRM-NATIVE TEMPLATES (SINTRA'S UNIQUE VALUE!)
  LEAD_SCORING_AGENT,
  COLD_CALL_AUTOMATION,
  DEAL_INTELLIGENCE_AGENT
];

/**
 * Get starter/recommended templates for empty state
 * These are the top 3 most valuable templates for new users
 */
export function getStarterTemplates(limit: number = 3): WorkflowTemplate[] {
  // Return the 5 high-value starter templates first, sorted by downloads
  const starters = [
    SMART_EMAIL_TRIAGE,
    LEAD_ENRICHMENT_PIPELINE,
    CONTENT_REPURPOSING,
    INVOICE_PROCESSING,
    DAILY_BRIEFING
  ];
  return starters.slice(0, limit);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): WorkflowTemplate[] {
  return WORKFLOW_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return WORKFLOW_TEMPLATES.find(t => t.id === id);
}

/**
 * Get popular templates (sorted by downloads)
 */
export function getPopularTemplates(limit: number = 3): WorkflowTemplate[] {
  return [...WORKFLOW_TEMPLATES]
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, limit);
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return WORKFLOW_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
