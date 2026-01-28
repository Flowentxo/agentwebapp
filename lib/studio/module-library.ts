/**
 * VISUAL AGENT STUDIO - MODULE LIBRARY
 *
 * Pre-built module templates for drag-and-drop agent building
 */

import { ModuleTemplate } from './types';
import {
  Brain,
  MessageSquare,
  FileText,
  Code2,
  Search,
  Calendar,
  Mail,
  Slack,
  Database,
  Zap,
  Clock,
  Webhook,
  GitBranch,
  Repeat,
  Timer,
  UserCheck,
  Send
} from 'lucide-react';

// ============================================================================
// SKILL MODULES
// ============================================================================

export const SKILL_MODULES: ModuleTemplate[] = [
  {
    id: 'skill-data-analysis',
    category: 'skill',
    type: 'data-analysis',
    name: 'Data Analysis',
    description: 'Analyze data, identify trends, and generate insights',
    icon: 'Brain',
    color: '#06B6D4',
    defaultConfig: {
      category: 'skill',
      skillType: 'data-analysis',
      model: 'gpt-5.1',
      temperature: 0.3,
      maxTokens: 2000,
      systemPrompt: 'You are a data analyst. Analyze the provided data and identify key trends, patterns, and insights.'
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'data', name: 'Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'analysis', name: 'Analysis', type: 'data', required: true }
    ]
  },
  {
    id: 'skill-customer-support',
    category: 'skill',
    type: 'customer-support',
    name: 'Customer Support',
    description: 'Handle customer inquiries with empathy and expertise',
    icon: 'MessageSquare',
    color: '#8B5CF6',
    defaultConfig: {
      category: 'skill',
      skillType: 'customer-support',
      model: 'gpt-5.1',
      temperature: 0.7,
      maxTokens: 1500,
      systemPrompt: 'You are a helpful customer support agent. Be friendly, empathetic, and solution-oriented.'
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'message', name: 'Customer Message', type: 'data', required: true }
    ],
    outputs: [
      { id: 'response', name: 'Response', type: 'data', required: true }
    ]
  },
  {
    id: 'skill-content-generation',
    category: 'skill',
    type: 'content-generation',
    name: 'Content Generation',
    description: 'Create high-quality content, articles, and copy',
    icon: 'FileText',
    color: '#F97316',
    defaultConfig: {
      category: 'skill',
      skillType: 'content-generation',
      model: 'gpt-5.1',
      temperature: 0.8,
      maxTokens: 3000
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'topic', name: 'Topic', type: 'data', required: true }
    ],
    outputs: [
      { id: 'content', name: 'Generated Content', type: 'data', required: true }
    ]
  },
  {
    id: 'skill-code-review',
    category: 'skill',
    type: 'code-review',
    name: 'Code Review',
    description: 'Review code for quality, security, and best practices',
    icon: 'Code2',
    color: '#10B981',
    defaultConfig: {
      category: 'skill',
      skillType: 'code-review',
      model: 'gpt-5.1',
      temperature: 0.2,
      maxTokens: 2500
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'code', name: 'Code', type: 'data', required: true }
    ],
    outputs: [
      { id: 'review', name: 'Code Review', type: 'data', required: true }
    ]
  },
  {
    id: 'skill-research',
    category: 'skill',
    type: 'research',
    name: 'Research & Synthesis',
    description: 'Research topics and synthesize information',
    icon: 'Search',
    color: '#EC4899',
    defaultConfig: {
      category: 'skill',
      skillType: 'research',
      model: 'gpt-5.1',
      temperature: 0.5,
      maxTokens: 3000
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'query', name: 'Research Query', type: 'data', required: true }
    ],
    outputs: [
      { id: 'findings', name: 'Research Findings', type: 'data', required: true }
    ]
  },
  {
    id: 'skill-web-search',
    category: 'skill',
    type: 'web-search',
    name: 'Web Search',
    description: 'Search the web in real-time using multiple providers',
    icon: 'Search',
    color: '#0EA5E9',
    defaultConfig: {
      category: 'skill',
      skillType: 'web-search',
      query: '',
      numResults: 10,
      provider: 'duckduckgo', // Default to free provider
      searchType: 'web',
      outputVariable: 'search_results'
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'query', name: 'Search Query', type: 'data', required: true }
    ],
    outputs: [
      { id: 'results', name: 'Search Results', type: 'data', required: true }
    ]
  }
];

// ============================================================================
// ACTION MODULES
// ============================================================================

export const ACTION_MODULES: ModuleTemplate[] = [
  {
    id: 'action-send-email',
    category: 'action',
    type: 'email',
    name: 'Send Email',
    description: 'Send emails via SMTP (Gmail, custom SMTP) with HTML support and variable substitution',
    icon: 'Mail',
    color: '#3B82F6',
    defaultConfig: {
      category: 'action',
      actionType: 'email',
      // Use environment SMTP config by default
      useEnvConfig: true,
      // Email fields (support {{variable}} syntax)
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      html: '',
      text: '',
      // Optional: Custom SMTP (if not using env config)
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpPassword: '',
      secure: false,
      // Optional sender info
      from: '',
      fromName: '',
      replyTo: '',
      // Priority
      priority: 'normal'
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'templateVars', name: 'Template Variables', type: 'data', required: false }
    ],
    outputs: [
      { id: 'sent', name: 'Email Result', type: 'data', required: true }
    ]
  },
  {
    id: 'action-send-slack',
    category: 'action',
    type: 'send-slack-message',
    name: 'Send Slack Message',
    description: 'Post a message to a Slack channel',
    icon: 'Slack',
    color: '#611F69',
    defaultConfig: {
      category: 'action',
      actionType: 'send-slack-message',
      parameters: {
        channel: '',
        message: ''
      }
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'message', name: 'Message', type: 'data', required: true }
    ],
    outputs: [
      { id: 'sent', name: 'Message Sent', type: 'action', required: true }
    ]
  },
  {
    id: 'action-create-task',
    category: 'action',
    type: 'create-task',
    name: 'Create Task',
    description: 'Create a new task or to-do item',
    icon: 'Zap',
    color: '#F59E0B',
    defaultConfig: {
      category: 'action',
      actionType: 'create-task',
      parameters: {
        title: '',
        description: '',
        assignee: '',
        dueDate: ''
      }
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'taskData', name: 'Task Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'created', name: 'Task Created', type: 'action', required: true }
    ]
  },
  {
    id: 'action-update-database',
    category: 'action',
    type: 'update-database',
    name: 'Update Database',
    description: 'Update records in a database',
    icon: 'Database',
    color: '#14B8A6',
    defaultConfig: {
      category: 'action',
      actionType: 'update-database',
      parameters: {
        table: '',
        operation: 'insert',
        data: {}
      }
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'data', name: 'Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'updated', name: 'Database Updated', type: 'action', required: true }
    ]
  }
];

// ============================================================================
// INTEGRATION MODULES
// ============================================================================

export const INTEGRATION_MODULES: ModuleTemplate[] = [
  {
    id: 'integration-email',
    category: 'integration',
    type: 'email',
    name: 'Email Integration',
    description: 'Connect to email services (Gmail, Outlook)',
    icon: 'Mail',
    color: '#EF4444',
    defaultConfig: {
      category: 'integration',
      integrationType: 'email',
      credentials: {}
    },
    inputs: [],
    outputs: [
      { id: 'connected', name: 'Email Connected', type: 'action', required: true }
    ]
  },
  {
    id: 'integration-slack',
    category: 'integration',
    type: 'slack',
    name: 'Slack Integration',
    description: 'Connect to Slack workspaces',
    icon: 'Slack',
    color: '#611F69',
    defaultConfig: {
      category: 'integration',
      integrationType: 'slack',
      credentials: {}
    },
    inputs: [],
    outputs: [
      { id: 'connected', name: 'Slack Connected', type: 'action', required: true }
    ]
  },
  {
    id: 'integration-calendar',
    category: 'integration',
    type: 'calendar',
    name: 'Calendar Integration',
    description: 'Connect to calendar services (Google Calendar, Outlook)',
    icon: 'Calendar',
    color: '#3B82F6',
    defaultConfig: {
      category: 'integration',
      integrationType: 'calendar',
      credentials: {}
    },
    inputs: [],
    outputs: [
      { id: 'connected', name: 'Calendar Connected', type: 'action', required: true }
    ]
  }
];

// ============================================================================
// TRIGGER MODULES
// ============================================================================

export const TRIGGER_MODULES: ModuleTemplate[] = [
  {
    id: 'trigger-time-based',
    category: 'trigger',
    type: 'time-based',
    name: 'Scheduled Trigger',
    description: 'Trigger at specific times or intervals',
    icon: 'Clock',
    color: '#8B5CF6',
    defaultConfig: {
      category: 'trigger',
      triggerType: 'time-based',
      schedule: '0 9 * * *' // Every day at 9 AM
    },
    inputs: [],
    outputs: [
      { id: 'triggered', name: 'Triggered', type: 'trigger', required: true }
    ]
  },
  {
    id: 'trigger-webhook',
    category: 'trigger',
    type: 'webhook',
    name: 'Webhook Trigger',
    description: 'Trigger via HTTP webhook',
    icon: 'Webhook',
    color: '#10B981',
    defaultConfig: {
      category: 'trigger',
      triggerType: 'webhook'
    },
    inputs: [],
    outputs: [
      { id: 'triggered', name: 'Triggered', type: 'trigger', required: true },
      { id: 'payload', name: 'Webhook Payload', type: 'data', required: true }
    ]
  },
  {
    id: 'trigger-manual',
    category: 'trigger',
    type: 'manual',
    name: 'Manual Trigger',
    description: 'Trigger manually by user action',
    icon: 'Zap',
    color: '#F59E0B',
    defaultConfig: {
      category: 'trigger',
      triggerType: 'manual'
    },
    inputs: [],
    outputs: [
      { id: 'triggered', name: 'Triggered', type: 'trigger', required: true }
    ]
  }
];

// ============================================================================
// DATA SOURCE MODULES (Phase 9)
// ============================================================================

export const DATA_SOURCE_MODULES: ModuleTemplate[] = [
  {
    id: 'data-source-database-query',
    category: 'action', // Using 'action' category for now, can extend types later
    type: 'database-query',
    name: 'Database Query',
    description: 'Execute SQL queries against PostgreSQL or MySQL databases',
    icon: 'Database',
    color: '#3B82F6',
    defaultConfig: {
      category: 'action',
      actionType: 'database-query',
      queryId: '',
      parameters: {},
      resultFormat: 'json',
      cacheEnabled: true,
      cacheTtl: 300
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'parameters', name: 'Query Parameters', type: 'data', required: false }
    ],
    outputs: [
      { id: 'data', name: 'Query Results', type: 'data', required: true },
      { id: 'rowCount', name: 'Row Count', type: 'data', required: true }
    ]
  },
  {
    id: 'data-source-webhook',
    category: 'action',
    type: 'webhook',
    name: 'Webhook',
    description: 'Execute HTTP webhooks with authentication and retry logic',
    icon: 'Zap',
    color: '#10B981',
    defaultConfig: {
      category: 'action',
      actionType: 'webhook',
      webhookId: '',
      parameters: {},
      retryEnabled: true,
      maxRetries: 3
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'parameters', name: 'Webhook Parameters', type: 'data', required: false }
    ],
    outputs: [
      { id: 'response', name: 'Webhook Response', type: 'data', required: true },
      { id: 'statusCode', name: 'Status Code', type: 'data', required: true }
    ]
  }
];

// ============================================================================
// 🔥 CRM-NATIVE MODULES (SINTRA'S KILLER FEATURE!)
// ============================================================================

export const CRM_DATA_MODULES: ModuleTemplate[] = [
  {
    id: 'crm-pipeline-source',
    category: 'action',
    type: 'crm-pipeline',
    name: '📊 CRM Pipeline Data',
    description: 'Fetch lead, deal, or contact data from your CRM pipeline',
    icon: 'Database',
    color: '#06B6D4',
    defaultConfig: {
      category: 'action',
      actionType: 'crm-pipeline',
      dataSource: 'crm_pipeline',
      query: '',
      outputVariable: 'crm_data'
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'filters', name: 'Query Filters', type: 'data', required: false }
    ],
    outputs: [
      { id: 'data', name: 'CRM Data', type: 'data', required: true },
      { id: 'count', name: 'Record Count', type: 'data', required: true }
    ]
  }
];

export const CRM_ACTION_MODULES: ModuleTemplate[] = [
  {
    id: 'crm-update-lead',
    category: 'action',
    type: 'crm-update-lead',
    name: '🎯 Update Lead',
    description: 'Update lead status, score, or assignment in CRM',
    icon: 'RefreshCw',
    color: '#F59E0B',
    defaultConfig: {
      category: 'action',
      actionType: 'crm-update-lead',
      parameters: {}
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'leadId', name: 'Lead ID', type: 'data', required: true },
      { id: 'updates', name: 'Update Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'updated', name: 'Updated Lead', type: 'data', required: true }
    ]
  },
  {
    id: 'crm-log-call',
    category: 'action',
    type: 'crm-log-call',
    name: '📞 Log Call Activity',
    description: 'Log call outcomes, notes, and next steps in CRM',
    icon: 'Phone',
    color: '#3B82F6',
    defaultConfig: {
      category: 'action',
      actionType: 'crm-log-call',
      parameters: {}
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'leadId', name: 'Lead/Contact ID', type: 'data', required: true },
      { id: 'callData', name: 'Call Details', type: 'data', required: true }
    ],
    outputs: [
      { id: 'logged', name: 'Call Log', type: 'data', required: true }
    ]
  },
  {
    id: 'crm-update-deal',
    category: 'action',
    type: 'crm-update-deal',
    name: '💰 Update Deal',
    description: 'Update deal stage, value, or add activity notes',
    icon: 'TrendingUp',
    color: '#10B981',
    defaultConfig: {
      category: 'action',
      actionType: 'crm-update-deal',
      parameters: {}
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'dealId', name: 'Deal ID', type: 'data', required: true },
      { id: 'updates', name: 'Update Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'updated', name: 'Updated Deal', type: 'data', required: true }
    ]
  },
  {
    id: 'send-whatsapp',
    category: 'action',
    type: 'send-whatsapp',
    name: '💬 Send WhatsApp',
    description: 'Send WhatsApp messages to leads or customers',
    icon: 'MessageCircle',
    color: '#25D366',
    defaultConfig: {
      category: 'action',
      actionType: 'send-whatsapp',
      parameters: {}
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'to', name: 'Phone Number', type: 'data', required: true },
      { id: 'message', name: 'Message Content', type: 'data', required: true }
    ],
    outputs: [
      { id: 'sent', name: 'Message Sent', type: 'data', required: true },
      { id: 'messageId', name: 'Message ID', type: 'data', required: true }
    ]
  }
];

// ============================================================================
// LOGIC MODULES
// ============================================================================

export const LOGIC_MODULES: ModuleTemplate[] = [
  {
    id: 'logic-condition',
    category: 'logic',
    type: 'condition',
    name: 'Condition',
    description: 'Branch based on a condition (if/else)',
    icon: 'GitBranch',
    color: '#6366F1',
    defaultConfig: {
      category: 'logic',
      logicType: 'condition',
      condition: '',
      conditionConfig: {
        id: 'default_condition',
        name: 'New Condition',
        description: 'Configure condition logic',
        condition: {
          id: 'group_1',
          operator: 'AND',
          rules: [],
          groups: []
        },
        trueBranch: {
          id: 'true_branch',
          label: 'True',
          description: 'When condition is met',
          color: '#10B981'
        },
        falseBranch: {
          id: 'false_branch',
          label: 'False',
          description: 'When condition is not met',
          color: '#EF4444'
        },
        continueOnError: true,
        defaultPath: 'false',
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'data', name: 'Input Data', type: 'data', required: true }
    ],
    outputs: [
      { id: 'true', name: 'True Branch', type: 'trigger', required: true },
      { id: 'false', name: 'False Branch', type: 'trigger', required: true }
    ]
  },
  {
    id: 'logic-loop-controller',
    category: 'logic',
    type: 'loop-controller',
    name: 'Loop Controller',
    description: 'Iterate over arrays with state persistence. Routes to body for each item, then done when complete.',
    icon: 'Repeat',
    color: '#EC4899',
    defaultConfig: {
      category: 'logic',
      logicType: 'loop-controller',
      // Source array - can be a variable reference like {{nodeId.output.items}}
      arraySource: '',
      // Variable names for downstream access
      itemVariableName: 'item',
      indexVariableName: 'index',
      // Safety limit
      maxIterations: 1000
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'array', name: 'Array to Iterate', type: 'data', required: true }
    ],
    outputs: [
      { id: 'body', name: 'Loop Body', type: 'trigger', required: true },
      { id: 'done', name: 'Loop Complete', type: 'trigger', required: true }
    ]
  },
  {
    id: 'logic-loop',
    category: 'logic',
    type: 'loop',
    name: 'Loop (Legacy)',
    description: 'Repeat actions multiple times (legacy - use Loop Controller for arrays)',
    icon: 'Repeat',
    color: '#EC4899',
    defaultConfig: {
      category: 'logic',
      logicType: 'loop',
      iterations: 5
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'items', name: 'Items to Loop', type: 'data', required: true }
    ],
    outputs: [
      { id: 'each', name: 'Each Iteration', type: 'trigger', required: true },
      { id: 'complete', name: 'Loop Complete', type: 'trigger', required: true }
    ]
  },
  {
    id: 'logic-delay',
    category: 'logic',
    type: 'delay',
    name: 'Delay',
    description: 'Wait before continuing',
    icon: 'Timer',
    color: '#F97316',
    defaultConfig: {
      category: 'logic',
      logicType: 'delay'
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true }
    ],
    outputs: [
      { id: 'continue', name: 'Continue After Delay', type: 'trigger', required: true }
    ]
  },
  {
    id: 'logic-human-approval',
    category: 'logic',
    type: 'human-approval',
    name: 'Human Approval',
    description: 'Pause workflow for human review and approval (HITL)',
    icon: 'UserCheck',
    color: '#F59E0B',
    defaultConfig: {
      category: 'logic',
      logicType: 'human-approval',
      title: 'Approval Required',
      description: 'Please review and approve this action',
      timeoutMinutes: 60,
      notifyChannels: ['email', 'slack']
    },
    inputs: [
      { id: 'trigger', name: 'Trigger', type: 'trigger', required: true },
      { id: 'context', name: 'Context Data', type: 'data', required: false }
    ],
    outputs: [
      { id: 'approved', name: 'Approved', type: 'trigger', required: true },
      { id: 'rejected', name: 'Rejected', type: 'trigger', required: true }
    ]
  }
];

// ============================================================================
// COMPLETE MODULE LIBRARY
// ============================================================================

export const MODULE_LIBRARY: ModuleTemplate[] = [
  ...SKILL_MODULES,
  ...ACTION_MODULES,
  ...DATA_SOURCE_MODULES, // Phase 9: Database Queries & Webhooks
  ...CRM_DATA_MODULES,    // 🔥 CRM Pipeline Data
  ...CRM_ACTION_MODULES,  // 🔥 CRM Actions (Update Lead, Log Call, etc.)
  ...INTEGRATION_MODULES,
  ...TRIGGER_MODULES,
  ...LOGIC_MODULES
];

export const getModulesByCategory = (category: string) => {
  return MODULE_LIBRARY.filter(m => m.category === category);
};

export const getModuleById = (id: string) => {
  return MODULE_LIBRARY.find(m => m.id === id);
};
