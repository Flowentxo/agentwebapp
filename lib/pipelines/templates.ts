/**
 * Pipeline Templates
 *
 * Pre-defined workflow templates for quick starts.
 * Each template includes nodes and edges that can be loaded into the Pipeline Studio.
 *
 * @version 2.0.0 - Now uses FlowentTemplate unified schema
 */

import { PipelineNode, PipelineEdge } from '@/components/pipelines/store/usePipelineStore';
import {
  FlowentTemplate,
  TemplateRequirement,
  TemplateCategory,
  TemplateDifficulty,
} from '@/lib/studio/types';

// ============================================
// LEGACY TEMPLATE INTERFACE (DEPRECATED)
// ============================================

/**
 * @deprecated Use FlowentTemplate instead
 */
export interface PipelineTemplate {
  id: string;
  name: string;
  description: string;
  category: 'finance' | 'support' | 'marketing' | 'operations' | 'general';
  icon: string;
  color: string;
  nodes: PipelineNode[];
  edges: PipelineEdge[];
  tags: string[];
}

// ============================================
// CATEGORY METADATA
// ============================================

export const TEMPLATE_CATEGORIES = {
  all: { label: 'All Templates', icon: 'LayoutGrid', color: '#6366F1' },
  finance: { label: 'Finance', icon: 'Coins', color: '#10B981' },
  support: { label: 'Support', icon: 'HeadphonesIcon', color: '#F59E0B' },
  marketing: { label: 'Marketing', icon: 'Megaphone', color: '#EC4899' },
  operations: { label: 'Operations', icon: 'Settings', color: '#8B5CF6' },
  general: { label: 'General', icon: 'Zap', color: '#06B6D4' },
} as const;

// ============================================
// TEMPLATE: FINANCE - INVOICE ANALYSIS
// ============================================

const financeInvoiceAnalysis: PipelineTemplate = {
  id: 'finance-invoice-analysis',
  name: 'Invoice Analysis Pipeline',
  description: 'Automatically analyze incoming invoices, extract key data with AI, and send summary emails to the finance team.',
  category: 'finance',
  icon: 'FileText',
  color: '#10B981',
  tags: ['invoice', 'automation', 'email', 'AI'],
  nodes: [
    {
      id: 'webhook-invoice-1',
      type: 'custom',
      position: { x: 100, y: 200 },
      data: {
        label: 'Invoice Webhook',
        type: 'trigger',
        icon: 'Globe',
        color: '#22C55E',
        description: 'Receives invoice data from external systems',
        config: {
          method: 'POST',
          path: '/webhooks/invoice',
        },
      },
    },
    {
      id: 'dexter-analyze-1',
      type: 'custom',
      position: { x: 400, y: 200 },
      data: {
        label: 'Analyze Invoice',
        type: 'agent',
        icon: 'Bot',
        color: '#8B5CF6',
        description: 'AI-powered invoice analysis',
        config: {
          agentId: 'dexter',
          agentName: 'Dexter',
          model: 'gpt-4-turbo-preview',
          temperature: '0.3',
          userPrompt: `Analyze the following invoice data and extract:
1. Invoice number
2. Vendor name
3. Total amount
4. Due date
5. Line items summary
6. Any potential issues or discrepancies

Invoice Data:
{{webhook-invoice-1.body}}`,
        },
      },
    },
    {
      id: 'email-summary-1',
      type: 'custom',
      position: { x: 700, y: 200 },
      data: {
        label: 'Send Summary Email',
        type: 'action',
        icon: 'Mail',
        color: '#3B82F6',
        description: 'Email analysis to finance team',
        config: {
          to: 'finance@company.com',
          subject: 'Invoice Analysis: {{dexter-analyze-1.data.response}}',
          body: `New invoice analyzed:

{{dexter-analyze-1.data.response}}

---
Processed automatically by AI Pipeline`,
        },
      },
    },
    {
      id: 'output-result-1',
      type: 'custom',
      position: { x: 1000, y: 200 },
      data: {
        label: 'Pipeline Result',
        type: 'output',
        icon: 'Send',
        color: '#F97316',
        description: 'Returns the analysis result',
        config: {
          responseType: 'json',
          template: '{"success": true, "analysis": "{{dexter-analyze-1.data.response}}"}',
        },
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'webhook-invoice-1', target: 'dexter-analyze-1' },
    { id: 'e2-3', source: 'dexter-analyze-1', target: 'email-summary-1' },
    { id: 'e3-4', source: 'email-summary-1', target: 'output-result-1' },
  ],
};

// ============================================
// TEMPLATE: SUPPORT - TICKET CLASSIFIER
// ============================================

const supportTicketClassifier: PipelineTemplate = {
  id: 'support-ticket-classifier',
  name: 'Ticket Classifier & Router',
  description: 'Classify incoming support tickets by urgency and route them to the appropriate team via Slack.',
  category: 'support',
  icon: 'MessageSquare',
  color: '#F59E0B',
  tags: ['support', 'classification', 'slack', 'routing'],
  nodes: [
    {
      id: 'webhook-ticket-1',
      type: 'custom',
      position: { x: 100, y: 250 },
      data: {
        label: 'New Ticket',
        type: 'trigger',
        icon: 'Globe',
        color: '#22C55E',
        description: 'Receives new support ticket',
        config: {
          method: 'POST',
          path: '/webhooks/support-ticket',
        },
      },
    },
    {
      id: 'cassie-classify-1',
      type: 'custom',
      position: { x: 400, y: 250 },
      data: {
        label: 'Classify Ticket',
        type: 'agent',
        icon: 'Bot',
        color: '#8B5CF6',
        description: 'AI classifies ticket urgency',
        config: {
          agentId: 'cassie',
          agentName: 'Cassie',
          model: 'gpt-4-turbo-preview',
          temperature: '0.2',
          userPrompt: `Analyze this support ticket and classify it:

Ticket Subject: {{webhook-ticket-1.body.subject}}
Ticket Body: {{webhook-ticket-1.body.message}}
Customer: {{webhook-ticket-1.body.customer_email}}

Respond with a JSON object containing:
- urgency: "high", "medium", or "low"
- category: "billing", "technical", "general", or "feedback"
- suggested_response: A brief suggested response
- escalate: true or false`,
        },
      },
    },
    {
      id: 'condition-urgency-1',
      type: 'custom',
      position: { x: 700, y: 250 },
      data: {
        label: 'Check Urgency',
        type: 'condition',
        icon: 'GitBranch',
        color: '#EAB308',
        description: 'Route based on urgency level',
        config: {
          field: 'cassie-classify-1.data.response',
          operator: 'contains',
          value: 'high',
        },
      },
    },
    {
      id: 'slack-urgent-1',
      type: 'custom',
      position: { x: 1000, y: 150 },
      data: {
        label: 'Alert Urgent Channel',
        type: 'action',
        icon: 'MessageSquare',
        color: '#3B82F6',
        description: 'Post to #urgent-support',
        config: {
          channel: '#urgent-support',
          message: `🚨 HIGH PRIORITY TICKET

Customer: {{webhook-ticket-1.body.customer_email}}
Subject: {{webhook-ticket-1.body.subject}}

AI Analysis: {{cassie-classify-1.data.response}}`,
        },
      },
    },
    {
      id: 'slack-normal-1',
      type: 'custom',
      position: { x: 1000, y: 350 },
      data: {
        label: 'Post to Support Queue',
        type: 'action',
        icon: 'MessageSquare',
        color: '#3B82F6',
        description: 'Post to #support-queue',
        config: {
          channel: '#support-queue',
          message: `📬 New Support Ticket

Customer: {{webhook-ticket-1.body.customer_email}}
Subject: {{webhook-ticket-1.body.subject}}

AI Analysis: {{cassie-classify-1.data.response}}`,
        },
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'webhook-ticket-1', target: 'cassie-classify-1' },
    { id: 'e2-3', source: 'cassie-classify-1', target: 'condition-urgency-1' },
    { id: 'e3-4a', source: 'condition-urgency-1', target: 'slack-urgent-1', sourceHandle: 'true' },
    { id: 'e3-4b', source: 'condition-urgency-1', target: 'slack-normal-1', sourceHandle: 'false' },
  ],
};

// ============================================
// TEMPLATE: MARKETING - COLD EMAIL GENERATOR
// ============================================

const marketingColdEmail: PipelineTemplate = {
  id: 'marketing-cold-email',
  name: 'Cold Email Campaign Generator',
  description: 'Generate personalized cold emails on a schedule, using AI to craft compelling messages stored in your database.',
  category: 'marketing',
  icon: 'Mail',
  color: '#EC4899',
  tags: ['email', 'outreach', 'AI', 'scheduled'],
  nodes: [
    {
      id: 'schedule-daily-1',
      type: 'custom',
      position: { x: 100, y: 200 },
      data: {
        label: 'Daily Schedule',
        type: 'trigger',
        icon: 'Clock',
        color: '#22C55E',
        description: 'Runs every day at 9 AM',
        config: {
          interval: 'daily',
          time: '09:00',
        },
      },
    },
    {
      id: 'db-fetch-leads-1',
      type: 'custom',
      position: { x: 400, y: 200 },
      data: {
        label: 'Fetch Leads',
        type: 'action',
        icon: 'Database',
        color: '#3B82F6',
        description: 'Get pending leads from database',
        config: {
          operation: 'select',
          query: "SELECT * FROM leads WHERE status = 'pending' AND last_contacted IS NULL LIMIT 10",
        },
      },
    },
    {
      id: 'emmie-generate-1',
      type: 'custom',
      position: { x: 700, y: 200 },
      data: {
        label: 'Generate Email',
        type: 'agent',
        icon: 'Bot',
        color: '#8B5CF6',
        description: 'AI generates personalized email',
        config: {
          agentId: 'emmie',
          agentName: 'Emmie',
          model: 'gpt-4-turbo-preview',
          temperature: '0.7',
          userPrompt: `Generate a personalized cold email for these leads:

{{db-fetch-leads-1.data}}

For each lead, create:
1. A compelling subject line
2. A personalized opening that references their company
3. A clear value proposition
4. A specific call to action

Keep each email under 150 words. Be professional but conversational.`,
        },
      },
    },
    {
      id: 'db-save-emails-1',
      type: 'custom',
      position: { x: 1000, y: 200 },
      data: {
        label: 'Save Drafts',
        type: 'action',
        icon: 'Database',
        color: '#3B82F6',
        description: 'Store generated emails',
        config: {
          operation: 'insert',
          query: "INSERT INTO email_drafts (lead_id, subject, body, generated_at) VALUES ($1, $2, $3, NOW())",
        },
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'schedule-daily-1', target: 'db-fetch-leads-1' },
    { id: 'e2-3', source: 'db-fetch-leads-1', target: 'emmie-generate-1' },
    { id: 'e3-4', source: 'emmie-generate-1', target: 'db-save-emails-1' },
  ],
};

// ============================================
// TEMPLATE: OPERATIONS - DATA SYNC
// ============================================

const operationsDataSync: PipelineTemplate = {
  id: 'operations-data-sync',
  name: 'CRM Data Sync Pipeline',
  description: 'Sync customer data between your webhook endpoint and database with AI-powered data validation.',
  category: 'operations',
  icon: 'RefreshCw',
  color: '#8B5CF6',
  tags: ['sync', 'database', 'validation', 'CRM'],
  nodes: [
    {
      id: 'webhook-crm-1',
      type: 'custom',
      position: { x: 100, y: 200 },
      data: {
        label: 'CRM Webhook',
        type: 'trigger',
        icon: 'Globe',
        color: '#22C55E',
        description: 'Receives CRM updates',
        config: {
          method: 'POST',
          path: '/webhooks/crm-sync',
        },
      },
    },
    {
      id: 'code-validate-1',
      type: 'custom',
      position: { x: 400, y: 200 },
      data: {
        label: 'Validate Data',
        type: 'action',
        icon: 'Code2',
        color: '#3B82F6',
        description: 'Validate and transform data',
        config: {
          language: 'javascript',
          code: `// Validate incoming CRM data
const data = input.body;
return {
  valid: !!(data.email && data.name),
  normalized: {
    email: data.email?.toLowerCase().trim(),
    name: data.name?.trim(),
    company: data.company || 'Unknown',
    updated_at: new Date().toISOString()
  }
};`,
        },
      },
    },
    {
      id: 'condition-valid-1',
      type: 'custom',
      position: { x: 700, y: 200 },
      data: {
        label: 'Is Valid?',
        type: 'condition',
        icon: 'GitBranch',
        color: '#EAB308',
        description: 'Check if data is valid',
        config: {
          field: 'code-validate-1.data.valid',
          operator: 'equals',
          value: 'true',
        },
      },
    },
    {
      id: 'db-upsert-1',
      type: 'custom',
      position: { x: 1000, y: 100 },
      data: {
        label: 'Update Database',
        type: 'action',
        icon: 'Database',
        color: '#3B82F6',
        description: 'Upsert customer record',
        config: {
          operation: 'upsert',
          query: `INSERT INTO customers (email, name, company, updated_at)
VALUES ($1, $2, $3, $4)
ON CONFLICT (email) DO UPDATE SET name = $2, company = $3, updated_at = $4`,
        },
      },
    },
    {
      id: 'output-error-1',
      type: 'custom',
      position: { x: 1000, y: 300 },
      data: {
        label: 'Return Error',
        type: 'output',
        icon: 'Send',
        color: '#EF4444',
        description: 'Return validation error',
        config: {
          responseType: 'json',
          template: '{"success": false, "error": "Invalid data provided"}',
        },
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'webhook-crm-1', target: 'code-validate-1' },
    { id: 'e2-3', source: 'code-validate-1', target: 'condition-valid-1' },
    { id: 'e3-4a', source: 'condition-valid-1', target: 'db-upsert-1', sourceHandle: 'true' },
    { id: 'e3-4b', source: 'condition-valid-1', target: 'output-error-1', sourceHandle: 'false' },
  ],
};

// ============================================
// TEMPLATE: GENERAL - SIMPLE WEBHOOK RESPONDER
// ============================================

const generalWebhookResponder: PipelineTemplate = {
  id: 'general-webhook-responder',
  name: 'AI Webhook Responder',
  description: 'A simple template that receives webhooks, processes with AI, and returns a response. Great starting point!',
  category: 'general',
  icon: 'Zap',
  color: '#06B6D4',
  tags: ['starter', 'simple', 'webhook', 'AI'],
  nodes: [
    {
      id: 'webhook-input-1',
      type: 'custom',
      position: { x: 150, y: 200 },
      data: {
        label: 'Webhook Input',
        type: 'trigger',
        icon: 'Globe',
        color: '#22C55E',
        description: 'Receives incoming requests',
        config: {
          method: 'POST',
          path: '/api/process',
        },
      },
    },
    {
      id: 'agent-process-1',
      type: 'custom',
      position: { x: 500, y: 200 },
      data: {
        label: 'AI Processing',
        type: 'agent',
        icon: 'Bot',
        color: '#8B5CF6',
        description: 'Process with AI',
        config: {
          agentId: 'dexter',
          agentName: 'Dexter',
          model: 'gpt-4-turbo-preview',
          temperature: '0.5',
          userPrompt: 'Process the following data and provide insights:\n\n{{webhook-input-1.body}}',
        },
      },
    },
    {
      id: 'output-response-1',
      type: 'custom',
      position: { x: 850, y: 200 },
      data: {
        label: 'Send Response',
        type: 'output',
        icon: 'Send',
        color: '#F97316',
        description: 'Return the result',
        config: {
          responseType: 'json',
          template: '{"success": true, "result": "{{agent-process-1.data.response}}"}',
        },
      },
    },
  ],
  edges: [
    { id: 'e1-2', source: 'webhook-input-1', target: 'agent-process-1' },
    { id: 'e2-3', source: 'agent-process-1', target: 'output-response-1' },
  ],
};

// ============================================
// EXPORT ALL TEMPLATES
// ============================================

export const PIPELINE_TEMPLATES: PipelineTemplate[] = [
  generalWebhookResponder,
  financeInvoiceAnalysis,
  supportTicketClassifier,
  marketingColdEmail,
  operationsDataSync,
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getTemplateById(id: string): PipelineTemplate | undefined {
  return PIPELINE_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): PipelineTemplate[] {
  if (category === 'all') {
    return PIPELINE_TEMPLATES;
  }
  return PIPELINE_TEMPLATES.filter((t) => t.category === category);
}

export function searchTemplates(query: string): PipelineTemplate[] {
  const lowerQuery = query.toLowerCase();
  return PIPELINE_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

// ============================================================================
// FLOWENT UNIFIED TEMPLATES (v2.0)
// ============================================================================

/**
 * Invoice Analysis Pipeline - FlowentTemplate Version
 * Full template with dynamic requirements for configuration wizard
 */
const flowentInvoiceAnalysis: FlowentTemplate = {
  id: 'finance-invoice-analysis',
  name: 'Invoice Analysis Pipeline',
  description: 'Automatically analyze incoming invoices, extract key data with AI, and send summary emails to the finance team.',
  category: 'finance',
  difficulty: 'intermediate',

  // Dynamic requirements for wizard
  requirements: [
    {
      id: 'openai_api_key',
      type: 'api_key',
      provider: 'openai',
      label: 'OpenAI API Key',
      description: 'Required for AI-powered invoice analysis',
      placeholder: 'sk-...',
      required: true,
      icon: 'Sparkles',
      targetNodeIds: ['dexter-analyze-1'],
      configPath: 'config.apiKey',
    },
    {
      id: 'webhook_url',
      type: 'webhook_url',
      label: 'Webhook Endpoint',
      description: 'URL where your invoices will be sent',
      placeholder: 'https://your-domain.com/webhooks/invoice',
      required: false,
      icon: 'Globe',
      targetNodeIds: ['webhook-invoice-1'],
      configPath: 'config.path',
    },
    {
      id: 'finance_email',
      type: 'variable',
      label: 'Finance Team Email',
      description: 'Email address to receive invoice summaries',
      placeholder: 'finance@company.com',
      required: true,
      icon: 'Mail',
      targetNodeIds: ['email-summary-1'],
      configPath: 'config.to',
    },
  ],

  // Visual
  icon: 'FileText',
  color: '#10B981',

  // Metadata
  author: 'Flowent Team',
  version: '2.0.0',
  tags: ['invoice', 'automation', 'email', 'AI', 'finance'],
  useCase: 'Automate invoice processing and analysis',
  estimatedSetupMinutes: 5,
  targetAudience: ['Finance Teams', 'Accountants', 'Operations'],
  useCases: [
    'Automatic invoice data extraction',
    'Finance team notifications',
    'Invoice validation',
  ],

  // Business Value
  roiBadge: '10x faster',
  businessBenefit: 'Reduce manual invoice processing time by 90%',

  // Social Proof
  isFeatured: true,
  downloadCount: 1250,
  rating: 4.8,
  ratingCount: 42,

  // Workflow
  nodes: financeInvoiceAnalysis.nodes as any[],
  edges: financeInvoiceAnalysis.edges as any[],

  // Timestamps
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Support Ticket Classifier - FlowentTemplate Version
 */
const flowentTicketClassifier: FlowentTemplate = {
  id: 'support-ticket-classifier',
  name: 'Ticket Classifier & Router',
  description: 'Classify incoming support tickets by urgency and route them to the appropriate team via Slack.',
  category: 'customer-support',
  difficulty: 'intermediate',

  requirements: [
    {
      id: 'openai_api_key',
      type: 'api_key',
      provider: 'openai',
      label: 'OpenAI API Key',
      description: 'Required for AI ticket classification',
      placeholder: 'sk-...',
      required: true,
      icon: 'Sparkles',
      targetNodeIds: ['cassie-classify-1'],
      configPath: 'config.apiKey',
    },
    {
      id: 'slack_webhook',
      type: 'integration',
      provider: 'slack',
      label: 'Slack Workspace',
      description: 'Connect your Slack workspace for notifications',
      required: true,
      icon: 'MessageSquare',
      targetNodeIds: ['slack-urgent-1', 'slack-normal-1'],
    },
    {
      id: 'urgent_channel',
      type: 'variable',
      label: 'Urgent Channel',
      description: 'Slack channel for high-priority tickets',
      placeholder: '#urgent-support',
      defaultValue: '#urgent-support',
      required: true,
      icon: 'Hash',
      targetNodeIds: ['slack-urgent-1'],
      configPath: 'config.channel',
    },
    {
      id: 'normal_channel',
      type: 'variable',
      label: 'Support Queue Channel',
      description: 'Slack channel for normal tickets',
      placeholder: '#support-queue',
      defaultValue: '#support-queue',
      required: true,
      icon: 'Hash',
      targetNodeIds: ['slack-normal-1'],
      configPath: 'config.channel',
    },
  ],

  icon: 'MessageSquare',
  color: '#F59E0B',

  author: 'Flowent Team',
  version: '2.0.0',
  tags: ['support', 'classification', 'slack', 'routing', 'AI'],
  useCase: 'Intelligent ticket routing based on urgency',
  estimatedSetupMinutes: 8,
  targetAudience: ['Support Teams', 'Customer Success'],
  useCases: [
    'Automatic ticket classification',
    'Priority-based routing',
    'Slack notifications',
  ],

  roiBadge: '5x faster response',
  businessBenefit: 'Reduce ticket response time by 80%',

  isFeatured: true,
  downloadCount: 980,
  rating: 4.7,
  ratingCount: 38,

  nodes: supportTicketClassifier.nodes as any[],
  edges: supportTicketClassifier.edges as any[],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Cold Email Campaign Generator - FlowentTemplate Version
 */
const flowentColdEmail: FlowentTemplate = {
  id: 'marketing-cold-email',
  name: 'Cold Email Campaign Generator',
  description: 'Generate personalized cold emails on a schedule, using AI to craft compelling messages stored in your database.',
  category: 'marketing',
  difficulty: 'advanced',

  requirements: [
    {
      id: 'openai_api_key',
      type: 'api_key',
      provider: 'openai',
      label: 'OpenAI API Key',
      description: 'Required for AI email generation',
      placeholder: 'sk-...',
      required: true,
      icon: 'Sparkles',
      targetNodeIds: ['emmie-generate-1'],
      configPath: 'config.apiKey',
    },
    {
      id: 'database_connection',
      type: 'database',
      label: 'Database Connection',
      description: 'PostgreSQL connection for leads and email drafts',
      placeholder: 'postgresql://user:pass@host:5432/db',
      required: true,
      icon: 'Database',
      targetNodeIds: ['db-fetch-leads-1', 'db-save-emails-1'],
    },
    {
      id: 'schedule_time',
      type: 'config',
      label: 'Daily Schedule Time',
      description: 'Time to run the campaign daily',
      placeholder: '09:00',
      defaultValue: '09:00',
      required: true,
      icon: 'Clock',
      targetNodeIds: ['schedule-daily-1'],
      configPath: 'config.time',
    },
    {
      id: 'leads_limit',
      type: 'variable',
      label: 'Leads Per Run',
      description: 'Maximum leads to process per execution',
      placeholder: '10',
      defaultValue: '10',
      required: false,
      icon: 'Users',
    },
  ],

  icon: 'Mail',
  color: '#EC4899',

  author: 'Flowent Team',
  version: '2.0.0',
  tags: ['email', 'outreach', 'AI', 'scheduled', 'marketing'],
  useCase: 'Automated cold email campaign generation',
  estimatedSetupMinutes: 12,
  targetAudience: ['Sales Teams', 'Marketing Teams', 'Growth Teams'],
  useCases: [
    'Lead nurturing automation',
    'Personalized outreach at scale',
    'Email campaign scheduling',
  ],

  roiBadge: '20x more emails',
  businessBenefit: 'Generate 100+ personalized emails daily',

  isFeatured: false,
  downloadCount: 756,
  rating: 4.5,
  ratingCount: 29,

  nodes: marketingColdEmail.nodes as any[],
  edges: marketingColdEmail.edges as any[],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * CRM Data Sync Pipeline - FlowentTemplate Version
 */
const flowentDataSync: FlowentTemplate = {
  id: 'operations-data-sync',
  name: 'CRM Data Sync Pipeline',
  description: 'Sync customer data between your webhook endpoint and database with AI-powered data validation.',
  category: 'operations',
  difficulty: 'intermediate',

  requirements: [
    {
      id: 'database_connection',
      type: 'database',
      label: 'Database Connection',
      description: 'PostgreSQL connection for customer data',
      placeholder: 'postgresql://user:pass@host:5432/db',
      required: true,
      icon: 'Database',
      targetNodeIds: ['db-upsert-1'],
    },
    {
      id: 'webhook_secret',
      type: 'config',
      label: 'Webhook Secret',
      description: 'Secret for validating incoming webhooks',
      placeholder: 'your-webhook-secret',
      required: false,
      icon: 'Key',
      targetNodeIds: ['webhook-crm-1'],
      configPath: 'config.secret',
    },
  ],

  icon: 'RefreshCw',
  color: '#8B5CF6',

  author: 'Flowent Team',
  version: '2.0.0',
  tags: ['sync', 'database', 'validation', 'CRM', 'operations'],
  useCase: 'Real-time CRM data synchronization',
  estimatedSetupMinutes: 6,
  targetAudience: ['Operations Teams', 'Data Teams', 'DevOps'],
  useCases: [
    'Customer data sync',
    'Data validation',
    'Multi-system integration',
  ],

  roiBadge: 'Real-time sync',
  businessBenefit: 'Keep customer data in sync across all systems',

  isFeatured: false,
  downloadCount: 534,
  rating: 4.6,
  ratingCount: 21,

  nodes: operationsDataSync.nodes as any[],
  edges: operationsDataSync.edges as any[],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};

/**
 * Simple Webhook Responder - FlowentTemplate Version
 */
const flowentWebhookResponder: FlowentTemplate = {
  id: 'general-webhook-responder',
  name: 'AI Webhook Responder',
  description: 'A simple template that receives webhooks, processes with AI, and returns a response. Great starting point!',
  category: 'automation',
  difficulty: 'beginner',

  requirements: [
    {
      id: 'openai_api_key',
      type: 'api_key',
      provider: 'openai',
      label: 'OpenAI API Key',
      description: 'Required for AI processing',
      placeholder: 'sk-...',
      required: true,
      icon: 'Sparkles',
      targetNodeIds: ['agent-process-1'],
      configPath: 'config.apiKey',
    },
  ],

  icon: 'Zap',
  color: '#06B6D4',

  author: 'Flowent Team',
  version: '2.0.0',
  tags: ['starter', 'simple', 'webhook', 'AI', 'beginner'],
  useCase: 'Simple webhook to AI processing',
  estimatedSetupMinutes: 3,
  targetAudience: ['Developers', 'No-Code Builders', 'Everyone'],
  useCases: [
    'Quick AI integration',
    'Webhook processing',
    'API endpoint creation',
  ],

  roiBadge: 'Quick start',
  businessBenefit: 'Get started with AI automation in minutes',

  isFeatured: true,
  downloadCount: 2100,
  rating: 4.9,
  ratingCount: 87,

  nodes: generalWebhookResponder.nodes as any[],
  edges: generalWebhookResponder.edges as any[],

  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// ============================================
// UNIFIED TEMPLATE EXPORT (FlowentTemplate[])
// ============================================

/**
 * All templates in unified FlowentTemplate format
 * Use this for new implementations
 */
export const FLOWENT_TEMPLATES: FlowentTemplate[] = [
  flowentWebhookResponder,
  flowentInvoiceAnalysis,
  flowentTicketClassifier,
  flowentColdEmail,
  flowentDataSync,
];

// ============================================
// UNIFIED HELPER FUNCTIONS
// ============================================

/**
 * Get FlowentTemplate by ID
 */
export function getFlowentTemplateById(id: string): FlowentTemplate | undefined {
  return FLOWENT_TEMPLATES.find((t) => t.id === id);
}

/**
 * Get FlowentTemplates by category
 */
export function getFlowentTemplatesByCategory(category: string): FlowentTemplate[] {
  if (category === 'all') {
    return FLOWENT_TEMPLATES;
  }
  return FLOWENT_TEMPLATES.filter((t) => t.category === category);
}

/**
 * Search FlowentTemplates
 */
export function searchFlowentTemplates(query: string): FlowentTemplate[] {
  const lowerQuery = query.toLowerCase();
  return FLOWENT_TEMPLATES.filter(
    (t) =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.description.toLowerCase().includes(lowerQuery) ||
      t.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get featured FlowentTemplates
 */
export function getFeaturedTemplates(): FlowentTemplate[] {
  return FLOWENT_TEMPLATES.filter((t) => t.isFeatured);
}

/**
 * Get templates sorted by popularity
 */
export function getPopularTemplates(limit: number = 5): FlowentTemplate[] {
  return [...FLOWENT_TEMPLATES]
    .sort((a, b) => (b.downloadCount || 0) - (a.downloadCount || 0))
    .slice(0, limit);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: TemplateDifficulty): FlowentTemplate[] {
  return FLOWENT_TEMPLATES.filter((t) => t.difficulty === difficulty);
}
