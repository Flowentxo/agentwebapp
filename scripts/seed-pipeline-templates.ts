/**
 * PIPELINE TEMPLATE SEEDER
 *
 * Seeds 3 "Golden Standard" pipeline templates into the database:
 * 1. Morning Briefing - Schedule Trigger -> Agent -> Email
 * 2. Lead Qualifier - Webhook -> Agent -> Condition -> HubSpot
 * 3. Support Auto-Reply - Manual -> Agent -> Human Approval -> Email
 *
 * Usage: npx tsx scripts/seed-pipeline-templates.ts
 */

import { getDb } from '../lib/db';
import { workflows } from '../lib/db/schema-workflows';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TEMPLATE 1: MORNING BRIEFING
// Schedule Trigger (08:00) -> Agent "News Summary" -> Email Action
// ============================================================================

const MORNING_BRIEFING_TEMPLATE = {
  id: uuidv4(),
  name: 'Morning Briefing',
  description: 'Automated daily news and task summary delivered to your inbox every morning at 8 AM. Perfect for staying informed without manual effort.',
  nodes: [
    {
      id: 'trigger-morning',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'Daily 8 AM Trigger',
        category: 'trigger',
        triggerType: 'time-based',
        schedule: '0 8 * * *',
        icon: 'Clock',
        color: '#8B5CF6',
        description: 'Runs every day at 8:00 AM'
      }
    },
    {
      id: 'agent-news',
      type: 'agent',
      position: { x: 100, y: 280 },
      data: {
        label: 'News Summary Agent',
        category: 'skill',
        skillType: 'research',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 2000,
        systemPrompt: `You are a professional news curator and executive assistant.

Your task is to create a concise, well-organized morning briefing that includes:
1. Top 5 business/tech news headlines with brief summaries
2. Market overview (major indices direction)
3. Weather forecast for the day
4. Key calendar events and reminders
5. A motivational quote to start the day

Format the briefing in a clean, scannable format with sections clearly labeled.
Use bullet points for easy reading.
Keep the total briefing under 500 words.`,
        query: 'Create today\'s morning briefing with the latest news, market overview, and daily agenda.',
        outputVariable: 'morning_briefing',
        icon: 'Brain',
        color: '#06B6D4'
      }
    },
    {
      id: 'action-email',
      type: 'action',
      position: { x: 100, y: 460 },
      data: {
        label: 'Send Briefing Email',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{user_email}}',
          subject: 'Your Morning Briefing - {{current_date}}',
          body: '{{morning_briefing}}'
        },
        icon: 'Mail',
        color: '#3B82F6'
      }
    }
  ],
  edges: [
    {
      id: 'e1-morning',
      source: 'trigger-morning',
      target: 'agent-news',
      type: 'smoothstep',
      animated: false
    },
    {
      id: 'e2-morning',
      source: 'agent-news',
      target: 'action-email',
      type: 'smoothstep',
      animated: false
    }
  ],
  status: 'active' as const,
  visibility: 'public' as const,
  isTemplate: true,
  templateCategory: 'automation' as const,
  tags: ['automation', 'email', 'news', 'daily', 'briefing', 'productivity'],
  version: '1.0.0',
  userId: 'system',
  executionCount: 0
};

// ============================================================================
// TEMPLATE 2: LEAD QUALIFIER
// Webhook Trigger -> Agent "Analyze Lead" -> Condition "Is Hot?" -> HubSpot
// ============================================================================

const LEAD_QUALIFIER_TEMPLATE = {
  id: uuidv4(),
  name: 'Lead Qualifier',
  description: 'Automatically qualify incoming leads using AI analysis, score them as Hot/Warm/Cold, and route qualified leads to HubSpot CRM with enriched data.',
  nodes: [
    {
      id: 'trigger-webhook',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Lead Webhook',
        category: 'trigger',
        triggerType: 'webhook',
        webhookPath: '/api/webhooks/leads/new',
        icon: 'Webhook',
        color: '#10B981',
        description: 'Triggered when a new lead is captured'
      }
    },
    {
      id: 'agent-analyze',
      type: 'agent',
      position: { x: 100, y: 280 },
      data: {
        label: 'Analyze Lead',
        category: 'skill',
        skillType: 'data-analysis',
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
        maxTokens: 1500,
        systemPrompt: `You are an expert B2B Lead Qualification AI.

Analyze incoming leads and score them based on:
- Company size and industry fit
- Job title and decision-making authority
- Expressed interest and urgency signals
- Budget indicators
- Geographic fit

Return your analysis as JSON:
{
  "score": <0-100>,
  "category": "hot" | "warm" | "cold",
  "company_size": "enterprise" | "mid-market" | "smb" | "unknown",
  "decision_maker": true | false,
  "urgency": "high" | "medium" | "low",
  "recommended_action": "<next step>",
  "reasoning": "<brief explanation>"
}

Score thresholds:
- Hot (80-100): Ready to buy, high urgency, decision maker
- Warm (50-79): Interested but needs nurturing
- Cold (0-49): Low fit or no immediate interest`,
        query: 'Analyze this lead:\nEmail: {{lead_email}}\nCompany: {{lead_company}}\nTitle: {{lead_title}}\nMessage: {{lead_message}}',
        outputVariable: 'lead_analysis',
        icon: 'Target',
        color: '#F59E0B'
      }
    },
    {
      id: 'condition-hot',
      type: 'condition',
      position: { x: 100, y: 460 },
      data: {
        label: 'Is Hot Lead?',
        category: 'logic',
        logicType: 'condition',
        condition: '{{lead_analysis.score}} >= 80',
        icon: 'GitBranch',
        color: '#6366F1'
      }
    },
    {
      id: 'action-hubspot-hot',
      type: 'action',
      position: { x: -150, y: 640 },
      data: {
        label: 'Add to HubSpot (Priority)',
        category: 'action',
        actionType: 'hubspot-create-contact',
        parameters: {
          email: '{{lead_email}}',
          company: '{{lead_company}}',
          lifecycleStage: 'opportunity',
          leadStatus: 'hot',
          score: '{{lead_analysis.score}}',
          notes: '{{lead_analysis.reasoning}}',
          assignTo: 'sales_team_lead'
        },
        icon: 'Flame',
        color: '#EF4444',
        description: 'Creates priority contact in HubSpot'
      }
    },
    {
      id: 'action-hubspot-nurture',
      type: 'action',
      position: { x: 350, y: 640 },
      data: {
        label: 'Add to Nurture Sequence',
        category: 'action',
        actionType: 'hubspot-create-contact',
        parameters: {
          email: '{{lead_email}}',
          company: '{{lead_company}}',
          lifecycleStage: 'lead',
          leadStatus: '{{lead_analysis.category}}',
          score: '{{lead_analysis.score}}',
          enrollInSequence: 'nurture-sequence-1'
        },
        icon: 'Users',
        color: '#10B981',
        description: 'Adds lead to nurture campaign'
      }
    }
  ],
  edges: [
    {
      id: 'e1-lead',
      source: 'trigger-webhook',
      target: 'agent-analyze',
      type: 'smoothstep',
      animated: false
    },
    {
      id: 'e2-lead',
      source: 'agent-analyze',
      target: 'condition-hot',
      type: 'smoothstep',
      animated: false
    },
    {
      id: 'e3-lead-true',
      source: 'condition-hot',
      sourceHandle: 'true',
      target: 'action-hubspot-hot',
      type: 'smoothstep',
      animated: false,
      label: 'Yes'
    },
    {
      id: 'e4-lead-false',
      source: 'condition-hot',
      sourceHandle: 'false',
      target: 'action-hubspot-nurture',
      type: 'smoothstep',
      animated: false,
      label: 'No'
    }
  ],
  status: 'active' as const,
  visibility: 'public' as const,
  isTemplate: true,
  templateCategory: 'sales' as const,
  tags: ['sales', 'lead-scoring', 'crm', 'hubspot', 'automation', 'qualification'],
  version: '1.0.0',
  userId: 'system',
  executionCount: 0
};

// ============================================================================
// TEMPLATE 3: SUPPORT AUTO-REPLY
// Manual Trigger -> Agent "Draft Reply" -> Human Approval -> Email Action
// ============================================================================

const SUPPORT_AUTO_REPLY_TEMPLATE = {
  id: uuidv4(),
  name: 'Support Auto-Reply',
  description: 'AI-powered customer support workflow that drafts personalized responses and routes them through human approval before sending. Perfect balance of automation and quality control.',
  nodes: [
    {
      id: 'trigger-manual',
      type: 'trigger',
      position: { x: 100, y: 100 },
      data: {
        label: 'New Support Ticket',
        category: 'trigger',
        triggerType: 'manual',
        icon: 'MessageSquare',
        color: '#8B5CF6',
        description: 'Triggered when a support ticket is received'
      }
    },
    {
      id: 'agent-draft',
      type: 'agent',
      position: { x: 100, y: 280 },
      data: {
        label: 'Draft Reply',
        category: 'skill',
        skillType: 'customer-support',
        model: 'gpt-4-turbo-preview',
        temperature: 0.7,
        maxTokens: 1500,
        systemPrompt: `You are a professional customer support agent for a SaaS company.

Your responsibilities:
1. Acknowledge the customer's concern with empathy
2. Provide a clear, helpful solution or explanation
3. Include step-by-step instructions when applicable
4. Offer additional assistance
5. Maintain a friendly but professional tone

Guidelines:
- Keep responses concise but thorough
- Use the customer's name when available
- Avoid jargon unless the customer used it first
- Include relevant links to documentation when helpful
- End with a clear next step or call to action

If you cannot solve the issue, explain what additional information is needed or offer to escalate.`,
        query: 'Draft a support response for:\nCustomer: {{customer_name}}\nEmail: {{customer_email}}\nSubject: {{ticket_subject}}\nMessage: {{ticket_message}}',
        outputVariable: 'draft_response',
        icon: 'PenTool',
        color: '#06B6D4'
      }
    },
    {
      id: 'approval-human',
      type: 'human-approval',
      position: { x: 100, y: 460 },
      data: {
        label: 'Manager Approval',
        category: 'logic',
        approvalMessage: 'Please review and approve this customer response before sending.',
        config: {
          timeout: 86400, // 24 hours
          notifyEmail: '{{manager_email}}',
          notifySlack: true,
          slackChannel: '#support-approvals'
        },
        icon: 'UserCheck',
        color: '#F59E0B'
      }
    },
    {
      id: 'action-send-email',
      type: 'action',
      position: { x: -150, y: 640 },
      data: {
        label: 'Send Response',
        category: 'action',
        actionType: 'send-email',
        parameters: {
          to: '{{customer_email}}',
          subject: 'Re: {{ticket_subject}}',
          body: '{{draft_response}}',
          replyTo: 'support@company.com'
        },
        icon: 'Mail',
        color: '#10B981',
        description: 'Sends approved response to customer'
      }
    },
    {
      id: 'action-close-ticket',
      type: 'action',
      position: { x: -150, y: 820 },
      data: {
        label: 'Update Ticket Status',
        category: 'action',
        actionType: 'update-database',
        parameters: {
          table: 'support_tickets',
          operation: 'update',
          filter: { id: '{{ticket_id}}' },
          data: {
            status: 'responded',
            respondedAt: '{{current_timestamp}}',
            respondedBy: 'ai-assisted'
          }
        },
        icon: 'CheckCircle',
        color: '#3B82F6'
      }
    },
    {
      id: 'action-escalate',
      type: 'action',
      position: { x: 350, y: 640 },
      data: {
        label: 'Escalate to Human',
        category: 'action',
        actionType: 'send-slack-message',
        parameters: {
          channel: '#support-escalations',
          message: 'Ticket #{{ticket_id}} rejected by AI review.\n\nCustomer: {{customer_name}}\nSubject: {{ticket_subject}}\n\nPlease handle manually.'
        },
        icon: 'AlertTriangle',
        color: '#EF4444',
        description: 'Routes rejected tickets to human support'
      }
    }
  ],
  edges: [
    {
      id: 'e1-support',
      source: 'trigger-manual',
      target: 'agent-draft',
      type: 'smoothstep',
      animated: false
    },
    {
      id: 'e2-support',
      source: 'agent-draft',
      target: 'approval-human',
      type: 'smoothstep',
      animated: false
    },
    {
      id: 'e3-support-approved',
      source: 'approval-human',
      sourceHandle: 'approved',
      target: 'action-send-email',
      type: 'smoothstep',
      animated: false,
      label: 'Approved'
    },
    {
      id: 'e4-support-email-done',
      source: 'action-send-email',
      target: 'action-close-ticket',
      type: 'smoothstep',
      animated: false
    },
    {
      id: 'e5-support-rejected',
      source: 'approval-human',
      sourceHandle: 'rejected',
      target: 'action-escalate',
      type: 'smoothstep',
      animated: false,
      label: 'Rejected'
    }
  ],
  status: 'active' as const,
  visibility: 'public' as const,
  isTemplate: true,
  templateCategory: 'customer-support' as const,
  tags: ['support', 'email', 'automation', 'human-in-the-loop', 'approval', 'customer-service'],
  version: '1.0.0',
  userId: 'system',
  executionCount: 0
};

// ============================================================================
// SEEDER FUNCTION
// ============================================================================

async function seedPipelineTemplates() {
  console.log('Starting Pipeline Template Seeder...\n');

  try {
    const db = getDb();

    const templates = [
      MORNING_BRIEFING_TEMPLATE,
      LEAD_QUALIFIER_TEMPLATE,
      SUPPORT_AUTO_REPLY_TEMPLATE
    ];

    console.log('Templates to seed:');
    templates.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.name} - ${t.description.slice(0, 60)}...`);
    });
    console.log('');

    // Check for existing templates
    const existingTemplates = await db
      .select()
      .from(workflows)
      .where(
        // @ts-ignore
        workflows.isTemplate === true
      );

    const existingNames = existingTemplates.map(t => t.name);
    console.log(`Found ${existingTemplates.length} existing templates in database.\n`);

    let created = 0;
    let skipped = 0;

    for (const template of templates) {
      if (existingNames.includes(template.name)) {
        console.log(`  [SKIP] "${template.name}" already exists`);
        skipped++;
        continue;
      }

      await db.insert(workflows).values({
        id: template.id,
        name: template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        status: template.status,
        visibility: template.visibility,
        isTemplate: template.isTemplate,
        templateCategory: template.templateCategory,
        tags: template.tags,
        version: template.version,
        userId: template.userId,
        executionCount: template.executionCount,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`  [CREATE] "${template.name}" created successfully`);
      created++;
    }

    console.log('\n========================================');
    console.log(`Pipeline Template Seeding Complete!`);
    console.log(`  Created: ${created}`);
    console.log(`  Skipped: ${skipped}`);
    console.log('========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

// Run the seeder
seedPipelineTemplates();
