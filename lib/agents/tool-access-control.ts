/**
 * Tool Access Control - Defines which tools each agent can use
 *
 * Each agent has a set of allowed tools they can invoke.
 * This prevents agents from executing tools outside their domain.
 *
 * Tool Categories:
 * - CRM: Customer relationship management (HubSpot, Salesforce)
 * - Communication: Email, messaging, notifications
 * - Data: Database queries, analytics, reporting
 * - Code: Code generation, execution, debugging
 * - Document: Document processing, PDF, templates
 * - Finance: Budget, billing, payments
 * - Security: Audit, compliance, access control
 * - Workflow: Automation, scheduling, orchestration
 * - AI: Model invocation, embedding, analysis
 */

// Define all available tools in the system
export type ToolId =
  // CRM Tools
  | 'hubspot-create-contact'
  | 'hubspot-update-contact'
  | 'hubspot-get-deals'
  | 'hubspot-create-deal'
  | 'hubspot-get-companies'
  | 'salesforce-query'
  | 'salesforce-create-lead'
  | 'crm-sync'
  // Communication Tools
  | 'email-send'
  | 'email-draft'
  | 'email-search'
  | 'email-template'
  | 'slack-send'
  | 'slack-channel-list'
  | 'notification-push'
  | 'notification-email'
  | 'sms-send'
  // Data Tools
  | 'database-query'
  | 'database-insert'
  | 'database-update'
  | 'analytics-query'
  | 'analytics-report'
  | 'data-export'
  | 'data-import'
  | 'chart-generate'
  // Code Tools
  | 'code-execute'
  | 'code-analyze'
  | 'code-format'
  | 'code-review'
  | 'git-commit'
  | 'git-push'
  | 'git-pull'
  | 'npm-install'
  | 'docker-run'
  // Document Tools
  | 'document-parse'
  | 'pdf-generate'
  | 'pdf-extract'
  | 'template-render'
  | 'spreadsheet-parse'
  | 'spreadsheet-generate'
  // Finance Tools
  | 'budget-check'
  | 'budget-update'
  | 'billing-invoice'
  | 'billing-subscription'
  | 'payment-process'
  | 'payment-refund'
  | 'financial-report'
  | 'roi-calculate'
  | 'forecast-generate'
  // Security Tools
  | 'audit-log'
  | 'audit-report'
  | 'compliance-check'
  | 'access-review'
  | 'security-scan'
  | 'vulnerability-report'
  // Workflow Tools
  | 'workflow-trigger'
  | 'workflow-pause'
  | 'workflow-resume'
  | 'workflow-cancel'
  | 'schedule-create'
  | 'schedule-update'
  | 'schedule-delete'
  | 'task-create'
  | 'task-update'
  // AI Tools
  | 'ai-chat'
  | 'ai-analyze'
  | 'ai-summarize'
  | 'ai-translate'
  | 'ai-sentiment'
  | 'ai-embedding'
  | 'ai-image-generate'
  | 'ai-transcribe'
  // Research Tools
  | 'web-search'
  | 'web-scrape'
  | 'research-compile'
  | 'trend-analyze'
  // Motion/Video Tools
  | 'video-analyze'
  | 'video-transcribe'
  | 'motion-generate'
  | 'storyboard-create'
  | 'animation-generate'
  // Audio Tools
  | 'audio-transcribe'
  | 'audio-analyze'
  | 'podcast-edit'
  | 'voice-generate';

// Tool definitions with descriptions
export interface ToolDefinition {
  id: ToolId;
  name: string;
  description: string;
  category: 'crm' | 'communication' | 'data' | 'code' | 'document' | 'finance' | 'security' | 'workflow' | 'ai' | 'research' | 'motion' | 'audio';
  requiresAuth?: boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

// Agent tool permissions
export interface AgentToolPermissions {
  agentId: string;
  allowedTools: ToolId[];
  deniedTools?: ToolId[];
  /** Custom tool restrictions (e.g., read-only) */
  restrictions?: Record<ToolId, {
    readOnly?: boolean;
    requiresApproval?: boolean;
    maxCallsPerMinute?: number;
  }>;
}

/**
 * Tool Access Configuration per Agent
 *
 * Principles:
 * 1. Least Privilege: Agents only get tools they need
 * 2. Domain Separation: CRM agents don't get code tools
 * 3. Risk Mitigation: High-risk tools require approval
 */
export const agentToolPermissions: AgentToolPermissions[] = [
  // DEXTER - Financial Analyst & Data Expert
  {
    agentId: 'dexter',
    allowedTools: [
      // Data Tools
      'database-query',
      'analytics-query',
      'analytics-report',
      'data-export',
      'chart-generate',
      // Finance Tools
      'budget-check',
      'financial-report',
      'roi-calculate',
      'forecast-generate',
      // AI Tools
      'ai-analyze',
      'ai-summarize',
    ],
    restrictions: {
      'database-query': { readOnly: true },
      'data-export': { requiresApproval: true },
    },
  },

  // CASSIE - Customer Support
  {
    agentId: 'cassie',
    allowedTools: [
      // CRM Tools
      'hubspot-create-contact',
      'hubspot-update-contact',
      'hubspot-get-deals',
      'hubspot-get-companies',
      'crm-sync',
      // Communication Tools
      'email-send',
      'email-draft',
      'email-search',
      'email-template',
      'notification-push',
      // AI Tools
      'ai-chat',
      'ai-summarize',
      'ai-sentiment',
      'ai-translate',
      // Task Tools
      'task-create',
      'task-update',
    ],
    restrictions: {
      'hubspot-create-contact': { maxCallsPerMinute: 10 },
    },
  },

  // EMMIE - Email Manager
  {
    agentId: 'emmie',
    allowedTools: [
      // Communication Tools
      'email-send',
      'email-draft',
      'email-search',
      'email-template',
      'notification-email',
      // Document Tools
      'template-render',
      // AI Tools
      'ai-summarize',
      'ai-translate',
      // Workflow Tools
      'schedule-create',
      'schedule-update',
    ],
  },

  // AURA - Brand Strategist / Workflow Orchestration
  {
    agentId: 'aura',
    allowedTools: [
      // Workflow Tools
      'workflow-trigger',
      'workflow-pause',
      'workflow-resume',
      'workflow-cancel',
      'schedule-create',
      'schedule-update',
      'schedule-delete',
      'task-create',
      'task-update',
      // AI Tools
      'ai-analyze',
      'ai-summarize',
      // Research Tools
      'trend-analyze',
    ],
  },

  // KAI - Code Assistant
  {
    agentId: 'kai',
    allowedTools: [
      // Code Tools
      'code-execute',
      'code-analyze',
      'code-format',
      'code-review',
      'git-commit',
      'git-push',
      'git-pull',
      'npm-install',
      'docker-run',
      // AI Tools
      'ai-chat',
      'ai-analyze',
    ],
    restrictions: {
      'code-execute': { requiresApproval: true },
      'docker-run': { requiresApproval: true },
      'git-push': { requiresApproval: true },
    },
  },

  // LEX - Legal Advisor
  {
    agentId: 'lex',
    allowedTools: [
      // Document Tools
      'document-parse',
      'pdf-extract',
      'template-render',
      // AI Tools
      'ai-analyze',
      'ai-summarize',
      // Security Tools
      'compliance-check',
      // Research Tools
      'web-search',
      'research-compile',
    ],
  },

  // FINN - Finance Expert
  {
    agentId: 'finn',
    allowedTools: [
      // Finance Tools
      'budget-check',
      'budget-update',
      'billing-invoice',
      'billing-subscription',
      'financial-report',
      'roi-calculate',
      'forecast-generate',
      // Data Tools
      'database-query',
      'analytics-query',
      'chart-generate',
      // AI Tools
      'ai-analyze',
    ],
    restrictions: {
      'budget-update': { requiresApproval: true },
      'billing-invoice': { requiresApproval: true },
    },
  },

  // NOVA - Research & Insights
  {
    agentId: 'nova',
    allowedTools: [
      // Research Tools
      'web-search',
      'web-scrape',
      'research-compile',
      'trend-analyze',
      // Data Tools
      'analytics-query',
      'analytics-report',
      'chart-generate',
      // AI Tools
      'ai-analyze',
      'ai-summarize',
      'ai-translate',
    ],
  },

  // VINCE - Video Producer
  {
    agentId: 'vince',
    allowedTools: [
      // Motion/Video Tools
      'video-analyze',
      'video-transcribe',
      'storyboard-create',
      // AI Tools
      'ai-analyze',
      'ai-summarize',
      // Document Tools
      'template-render',
    ],
  },

  // MILO - Motion Designer
  {
    agentId: 'milo',
    allowedTools: [
      // Motion/Video Tools
      'motion-generate',
      'animation-generate',
      'storyboard-create',
      // AI Tools
      'ai-analyze',
      'ai-image-generate',
    ],
  },

  // ARI - AI Automation Specialist
  {
    agentId: 'ari',
    allowedTools: [
      // Workflow Tools
      'workflow-trigger',
      'workflow-pause',
      'workflow-resume',
      'workflow-cancel',
      'schedule-create',
      'schedule-update',
      'schedule-delete',
      'task-create',
      'task-update',
      // AI Tools
      'ai-chat',
      'ai-analyze',
      'ai-embedding',
      // Data Tools
      'database-query',
      'data-import',
      'data-export',
    ],
  },

  // VERA - Security & Compliance
  {
    agentId: 'vera',
    allowedTools: [
      // Security Tools
      'audit-log',
      'audit-report',
      'compliance-check',
      'access-review',
      'security-scan',
      'vulnerability-report',
      // AI Tools
      'ai-analyze',
      // Data Tools
      'database-query',
    ],
    restrictions: {
      'database-query': { readOnly: true },
    },
  },

  // ECHO - Voice & Audio Assistant
  {
    agentId: 'echo',
    allowedTools: [
      // Audio Tools
      'audio-transcribe',
      'audio-analyze',
      'podcast-edit',
      'voice-generate',
      // AI Tools
      'ai-transcribe',
      'ai-summarize',
      'ai-translate',
      // Communication Tools
      'notification-push',
    ],
  },

  // OMNI - Multi-Agent Orchestrator
  {
    agentId: 'omni',
    allowedTools: [
      // Workflow Tools (full access)
      'workflow-trigger',
      'workflow-pause',
      'workflow-resume',
      'workflow-cancel',
      'schedule-create',
      'schedule-update',
      'schedule-delete',
      'task-create',
      'task-update',
      // AI Tools
      'ai-chat',
      'ai-analyze',
      // Communication Tools
      'notification-push',
      'notification-email',
    ],
  },

  // BUDDY - Financial Intelligence Assistant
  {
    agentId: 'buddy',
    allowedTools: [
      // Finance Tools
      'budget-check',
      'budget-update',
      'financial-report',
      'roi-calculate',
      // AI Tools
      'ai-analyze',
      'ai-summarize',
      // Data Tools
      'analytics-query',
      'chart-generate',
      // Notification
      'notification-push',
    ],
    restrictions: {
      'budget-update': { requiresApproval: true },
    },
  },
];

/**
 * Check if an agent can use a specific tool
 */
export function canAgentUseTool(agentId: string, toolId: ToolId): boolean {
  const permissions = agentToolPermissions.find(p => p.agentId === agentId);

  if (!permissions) {
    console.warn(`[TOOL_ACCESS] No permissions found for agent: ${agentId}`);
    return false;
  }

  // Check if explicitly denied
  if (permissions.deniedTools?.includes(toolId)) {
    return false;
  }

  // Check if allowed
  return permissions.allowedTools.includes(toolId);
}

/**
 * Get tool restrictions for an agent
 */
export function getToolRestrictions(agentId: string, toolId: ToolId): {
  readOnly?: boolean;
  requiresApproval?: boolean;
  maxCallsPerMinute?: number;
} | undefined {
  const permissions = agentToolPermissions.find(p => p.agentId === agentId);

  if (!permissions?.restrictions) {
    return undefined;
  }

  return permissions.restrictions[toolId];
}

/**
 * Get all allowed tools for an agent
 */
export function getAgentAllowedTools(agentId: string): ToolId[] {
  const permissions = agentToolPermissions.find(p => p.agentId === agentId);
  return permissions?.allowedTools || [];
}

/**
 * Get all agents that can use a specific tool
 */
export function getAgentsWithToolAccess(toolId: ToolId): string[] {
  return agentToolPermissions
    .filter(p => p.allowedTools.includes(toolId) && !p.deniedTools?.includes(toolId))
    .map(p => p.agentId);
}

/**
 * Validate tool execution request
 */
export interface ToolExecutionValidation {
  allowed: boolean;
  reason?: string;
  requiresApproval?: boolean;
  readOnly?: boolean;
}

export function validateToolExecution(
  agentId: string,
  toolId: ToolId
): ToolExecutionValidation {
  if (!canAgentUseTool(agentId, toolId)) {
    return {
      allowed: false,
      reason: `Agent "${agentId}" does not have permission to use tool "${toolId}"`,
    };
  }

  const restrictions = getToolRestrictions(agentId, toolId);

  return {
    allowed: true,
    requiresApproval: restrictions?.requiresApproval,
    readOnly: restrictions?.readOnly,
  };
}
