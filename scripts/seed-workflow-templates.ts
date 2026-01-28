/**
 * SEED WORKFLOW TEMPLATES
 *
 * Creates pre-built workflow templates in the database
 */

import { getDb } from '../lib/db/connection';
import { workflows } from '../lib/db/schema-workflows';

const TEMPLATES = [
  {
    name: 'Customer Support Automation',
    description: 'Auto-respond to customer inquiries with AI-powered support',
    category: 'customer_support',
    tags: ['support', 'automation', 'email'],
    isTemplate: true,
    visibility: 'public' as const,
    status: 'active' as const,
    userId: 'system',
    nodes: [
      {
        id: 'trigger-1',
        type: 'custom',
        position: { x: 100, y: 200 },
        data: {
          label: 'Customer Inquiry',
          description: 'Manual trigger for customer inquiries',
          icon: 'Play',
          color: '#10B981',
          moduleType: 'trigger',
          triggerType: 'manual',
          triggerName: 'Customer Inquiry Received',
          enabled: true
        }
      },
      {
        id: 'support-agent-1',
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Customer Support Agent',
          description: 'AI-powered support response',
          icon: 'MessageCircle',
          color: '#F59E0B',
          moduleType: 'llm_agent',
          agentId: 'cassie',
          prompt: 'Analyze this customer inquiry and provide a helpful, empathetic response: {{input}}',
          temperature: 0.7,
          maxTokens: 500,
          enabled: true
        }
      },
      {
        id: 'send-email-1',
        type: 'custom',
        position: { x: 700, y: 200 },
        data: {
          label: 'Send Email Response',
          description: 'Send email to customer',
          icon: 'Mail',
          color: '#3B82F6',
          moduleType: 'api_call',
          method: 'POST',
          url: '/api/emails/send',
          body: {
            to: '{{customer_email}}',
            subject: 'Re: Your Support Request',
            body: '{{llm_response}}'
          },
          enabled: true
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'support-agent-1',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e2-3',
        source: 'support-agent-1',
        target: 'send-email-1',
        type: 'smoothstep',
        animated: true
      }
    ]
  },
  {
    name: 'Content Generation Pipeline',
    description: 'Generate blog posts with AI and save to database',
    category: 'content',
    tags: ['content', 'ai', 'automation'],
    isTemplate: true,
    visibility: 'public' as const,
    status: 'active' as const,
    userId: 'system',
    nodes: [
      {
        id: 'trigger-1',
        type: 'custom',
        position: { x: 100, y: 200 },
        data: {
          label: 'Scheduled Trigger',
          description: 'Every Monday at 9 AM',
          icon: 'Clock',
          color: '#10B981',
          moduleType: 'trigger',
          triggerType: 'scheduled',
          schedule: '0 9 * * 1',
          enabled: true
        }
      },
      {
        id: 'content-gen-1',
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Content Generator',
          description: 'Generate blog post',
          icon: 'FileText',
          color: '#F59E0B',
          moduleType: 'llm_agent',
          agentId: 'nova',
          prompt: 'Write a 500-word blog post about {{topic}}',
          temperature: 0.8,
          maxTokens: 1000,
          enabled: true
        }
      },
      {
        id: 'transform-1',
        type: 'custom',
        position: { x: 700, y: 200 },
        data: {
          label: 'Format Post',
          description: 'Transform to database format',
          icon: 'Code',
          color: '#8B5CF6',
          moduleType: 'data_transform',
          code: `return {
  title: input.split('\\n')[0],
  content: input,
  author: "AI Assistant",
  status: "draft",
  created_at: new Date().toISOString()
};`,
          enabled: true
        }
      },
      {
        id: 'database-1',
        type: 'custom',
        position: { x: 1000, y: 200 },
        data: {
          label: 'Save to Database',
          description: 'Insert blog post',
          icon: 'Database',
          color: '#3B82F6',
          moduleType: 'api_call',
          method: 'POST',
          url: '/api/blog/posts',
          body: '{{transformed_data}}',
          enabled: true
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'content-gen-1',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e2-3',
        source: 'content-gen-1',
        target: 'transform-1',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e3-4',
        source: 'transform-1',
        target: 'database-1',
        type: 'smoothstep',
        animated: true
      }
    ]
  },
  {
    name: 'Lead Qualification Pipeline',
    description: 'Qualify incoming leads and assign to sales team',
    category: 'sales',
    tags: ['sales', 'leads', 'automation'],
    isTemplate: true,
    visibility: 'public' as const,
    status: 'active' as const,
    userId: 'system',
    nodes: [
      {
        id: 'trigger-1',
        type: 'custom',
        position: { x: 100, y: 250 },
        data: {
          label: 'New Lead Webhook',
          description: 'Triggered by new lead',
          icon: 'Webhook',
          color: '#10B981',
          moduleType: 'trigger',
          triggerType: 'webhook',
          webhookUrl: '/webhooks/new-lead',
          enabled: true
        }
      },
      {
        id: 'research-1',
        type: 'custom',
        position: { x: 400, y: 250 },
        data: {
          label: 'Research Company',
          description: 'Assess lead quality',
          icon: 'Search',
          color: '#F59E0B',
          moduleType: 'llm_agent',
          agentId: 'ari',
          prompt: 'Research this company and assess lead quality: {{company_name}}',
          temperature: 0.7,
          maxTokens: 500,
          enabled: true
        }
      },
      {
        id: 'condition-1',
        type: 'custom',
        position: { x: 700, y: 250 },
        data: {
          label: 'Check Score',
          description: 'High quality lead?',
          icon: 'GitBranch',
          color: '#8B5CF6',
          moduleType: 'condition',
          condition: 'return input.qualificationScore >= 70;',
          enabled: true
        }
      },
      {
        id: 'task-1',
        type: 'custom',
        position: { x: 1000, y: 150 },
        data: {
          label: 'Create Sales Task',
          description: 'High priority follow-up',
          icon: 'CheckSquare',
          color: '#3B82F6',
          moduleType: 'api_call',
          method: 'POST',
          url: '/api/tasks',
          body: {
            title: 'Follow up with qualified lead: {{company_name}}',
            assignee: 'sales_team',
            priority: 'high'
          },
          enabled: true
        }
      },
      {
        id: 'email-1',
        type: 'custom',
        position: { x: 1000, y: 350 },
        data: {
          label: 'Nurture Email',
          description: 'Send to marketing',
          icon: 'Mail',
          color: '#EC4899',
          moduleType: 'api_call',
          method: 'POST',
          url: '/api/emails/send',
          body: {
            to: 'marketing@company.com',
            subject: 'Lead needs nurturing',
            body: 'Low qualification score: {{qualificationScore}}'
          },
          enabled: true
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'research-1',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e2-3',
        source: 'research-1',
        target: 'condition-1',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e3-4',
        source: 'condition-1',
        target: 'task-1',
        type: 'smoothstep',
        animated: true,
        label: 'High Quality'
      },
      {
        id: 'e3-5',
        source: 'condition-1',
        target: 'email-1',
        type: 'smoothstep',
        animated: true,
        label: 'Low Quality'
      }
    ]
  },
  {
    name: 'Daily Sales Report',
    description: 'Analyze sales data and send daily reports to Slack',
    category: 'analytics',
    tags: ['analytics', 'reporting', 'slack'],
    isTemplate: true,
    visibility: 'public' as const,
    status: 'active' as const,
    userId: 'system',
    nodes: [
      {
        id: 'trigger-1',
        type: 'custom',
        position: { x: 100, y: 200 },
        data: {
          label: 'Daily at 8 AM',
          description: 'Scheduled trigger',
          icon: 'Clock',
          color: '#10B981',
          moduleType: 'trigger',
          triggerType: 'scheduled',
          schedule: '0 8 * * *',
          enabled: true
        }
      },
      {
        id: 'analysis-1',
        type: 'custom',
        position: { x: 400, y: 200 },
        data: {
          label: 'Analyze Sales Data',
          description: 'AI-powered analysis',
          icon: 'BarChart',
          color: '#F59E0B',
          moduleType: 'llm_agent',
          agentId: 'dexter',
          prompt: 'Analyze yesterday\'s sales data and provide insights: {{sales_data}}',
          temperature: 0.7,
          maxTokens: 800,
          enabled: true
        }
      },
      {
        id: 'slack-1',
        type: 'custom',
        position: { x: 700, y: 200 },
        data: {
          label: 'Post to Slack',
          description: 'Send to #sales-reports',
          icon: 'MessageSquare',
          color: '#3B82F6',
          moduleType: 'api_call',
          method: 'POST',
          url: '/api/slack/send',
          body: {
            channel: '#sales-reports',
            message: '📊 Daily Sales Report\n\n{{analysis}}'
          },
          enabled: true
        }
      }
    ],
    edges: [
      {
        id: 'e1-2',
        source: 'trigger-1',
        target: 'analysis-1',
        type: 'smoothstep',
        animated: true
      },
      {
        id: 'e2-3',
        source: 'analysis-1',
        target: 'slack-1',
        type: 'smoothstep',
        animated: true
      }
    ]
  }
];

async function seedTemplates() {
  try {
    console.log('🌱 Seeding workflow templates...\n');

    const db = getDb();

    for (const template of TEMPLATES) {
      console.log(`📝 Creating template: ${template.name}`);

      await db.insert(workflows).values({
        ...template,
        templateCategory: template.category as any,
        version: '1.0.0',
      });

      console.log(`✅ Created: ${template.name}\n`);
    }

    console.log('🎉 All templates seeded successfully!\n');
    console.log('📚 Templates available:');
    TEMPLATES.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.name} (${t.category})`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding templates:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  seedTemplates();
}

export { seedTemplates };
