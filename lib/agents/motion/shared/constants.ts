/**
 * Motion Agents Constants
 * Constant values for Usemotion-style AI Agents
 */

// ============================================
// AGENT IDS
// ============================================

export const MOTION_AGENT_IDS = {
  ALFRED: 'alfred',
  SUKI: 'suki',
  MILLIE: 'millie',
  CHIP: 'chip',
  DOT: 'dot',
  CLIDE: 'clide',
  SPEC: 'spec',
} as const;

export const ALL_MOTION_AGENT_IDS = Object.values(MOTION_AGENT_IDS);

// ============================================
// TOOL CATEGORIES
// ============================================

export const TOOL_CATEGORIES = {
  EMAIL: 'email',
  CALENDAR: 'calendar',
  COMMUNICATION: 'communication',
  CRM: 'crm',
  PROJECT: 'project',
  RESEARCH: 'research',
  CONTENT: 'content',
  ANALYTICS: 'analytics',
  DOCUMENT: 'document',
  INTEGRATION: 'integration',
} as const;

// ============================================
// SKILL CONSTANTS
// ============================================

export const SKILL_TRIGGER_TYPES = {
  MANUAL: 'manual',
  SCHEDULED: 'scheduled',
  EVENT: 'event',
} as const;

export const SKILL_VISIBILITY = {
  PRIVATE: 'private',
  TEAM: 'team',
  WORKSPACE: 'workspace',
} as const;

export const SKILL_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ARCHIVED: 'archived',
} as const;

export const SKILL_STEP_TYPES = {
  TOOL: 'tool',
  PROMPT: 'prompt',
  CONDITION: 'condition',
  LOOP: 'loop',
  HUMAN_APPROVAL: 'human_approval',
  DELAY: 'delay',
} as const;

export const SKILL_EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  AWAITING_APPROVAL: 'awaiting_approval',
} as const;

// ============================================
// APPROVAL CONSTANTS
// ============================================

export const APPROVAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export const APPROVAL_REQUIRED_ACTIONS = {
  SEND_EMAIL: 'send_email',
  SEND_MESSAGE: 'send_message',
  CREATE_MEETING: 'create_meeting',
  UPDATE_CRM: 'update_crm',
  POST_SOCIAL: 'post_social',
  SEND_OUTREACH: 'send_outreach',
  SCHEDULE_INTERVIEW: 'schedule_interview',
  CREATE_DOCUMENT: 'create_document',
} as const;

// ============================================
// ERROR CODES
// ============================================

export const TOOL_ERROR_CODES = {
  EXECUTION_FAILED: 'EXECUTION_FAILED',
  TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  RATE_LIMITED: 'RATE_LIMITED',
  INTEGRATION_ERROR: 'INTEGRATION_ERROR',
  TIMEOUT: 'TIMEOUT',
  INSUFFICIENT_CREDITS: 'INSUFFICIENT_CREDITS',
  APPROVAL_REQUIRED: 'APPROVAL_REQUIRED',
  APPROVAL_DENIED: 'APPROVAL_DENIED',
} as const;

export const AGENT_ERROR_CODES = {
  ...TOOL_ERROR_CODES,
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  CONTEXT_INVALID: 'CONTEXT_INVALID',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  SKILL_EXECUTION_FAILED: 'SKILL_EXECUTION_FAILED',
  CONVERSATION_NOT_FOUND: 'CONVERSATION_NOT_FOUND',
} as const;

// ============================================
// CREDIT CONSTANTS
// ============================================

export const CREDIT_OPERATION_TYPES = {
  CHAT: 'chat',
  TOOL_EXECUTION: 'tool_execution',
  SKILL_RUN: 'skill_run',
  DOCUMENT_GENERATION: 'document_generation',
  RESEARCH: 'research',
} as const;

export const CREDIT_COSTS = {
  CHAT_MESSAGE: 5,
  SIMPLE_TOOL: 10,
  COMPLEX_TOOL: 50,
  SKILL_RUN: 100,
  DOCUMENT_GENERATION: 200,
  RESEARCH_TASK: 500,
  INTEGRATION_SYNC: 25,
} as const;

export const CREDIT_PLANS = {
  STARTER: 'starter',
  LIGHT: 'light',
  STANDARD: 'standard',
  PLUS: 'plus',
  ENTERPRISE: 'enterprise',
} as const;

// ============================================
// RATE LIMIT CONSTANTS
// ============================================

export const RATE_LIMIT_WINDOWS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
} as const;

export const DEFAULT_RATE_LIMITS = {
  CHAT_PER_MINUTE: 60,
  TOOL_PER_MINUTE: 30,
  SKILL_PER_MINUTE: 10,
  CHAT_PER_HOUR: 500,
  TOOL_PER_HOUR: 200,
  SKILL_PER_HOUR: 50,
} as const;

// ============================================
// LLM CONSTANTS
// ============================================

export const LLM_MODELS = {
  DEFAULT: 'gpt-4o-mini',
  PREMIUM: 'gpt-4-turbo',
  FAST: 'gpt-3.5-turbo',
} as const;

export const LLM_DEFAULTS = {
  MAX_TOKENS: 4000,
  TEMPERATURE: 0.7,
  TOP_P: 1,
  FREQUENCY_PENALTY: 0.5,
  PRESENCE_PENALTY: 0.5,
} as const;

// ============================================
// TIMEOUT CONSTANTS
// ============================================

export const TIMEOUTS = {
  TOOL_EXECUTION: 30000, // 30 seconds
  SKILL_STEP: 60000, // 1 minute
  SKILL_TOTAL: 300000, // 5 minutes
  APPROVAL_DEFAULT: 86400000, // 24 hours
  CONVERSATION_IDLE: 1800000, // 30 minutes
  INTEGRATION_SYNC: 60000, // 1 minute
} as const;

// ============================================
// PAGINATION CONSTANTS
// ============================================

export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1,
} as const;

// ============================================
// CONVERSATION CONSTANTS
// ============================================

export const CONVERSATION = {
  MAX_MESSAGES_IN_CONTEXT: 20,
  MAX_TOKENS_IN_CONTEXT: 8000,
  SUMMARY_THRESHOLD: 50, // Summarize after 50 messages
} as const;

// ============================================
// EVENT TYPES
// ============================================

export const MOTION_EVENT_TYPES = {
  // Agent events
  AGENT_CHAT_STARTED: 'agent.chat.started',
  AGENT_CHAT_COMPLETED: 'agent.chat.completed',
  AGENT_TOOL_EXECUTED: 'agent.tool.executed',
  AGENT_ERROR: 'agent.error',
  // Skill events
  SKILL_CREATED: 'skill.created',
  SKILL_UPDATED: 'skill.updated',
  SKILL_DELETED: 'skill.deleted',
  SKILL_EXECUTION_STARTED: 'skill.execution.started',
  SKILL_EXECUTION_COMPLETED: 'skill.execution.completed',
  SKILL_EXECUTION_FAILED: 'skill.execution.failed',
  // Approval events
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_APPROVED: 'approval.approved',
  APPROVAL_REJECTED: 'approval.rejected',
  APPROVAL_EXPIRED: 'approval.expired',
  // Credit events
  CREDIT_USED: 'credit.used',
  CREDIT_THRESHOLD_WARNING: 'credit.threshold.warning',
  CREDIT_EXHAUSTED: 'credit.exhausted',
} as const;

// ============================================
// INTEGRATION PROVIDERS
// ============================================

export const INTEGRATION_PROVIDERS = {
  // Email
  GMAIL: 'gmail',
  OUTLOOK: 'outlook',
  // Calendar
  GOOGLE_CALENDAR: 'calendar',
  OUTLOOK_CALENDAR: 'outlook_calendar',
  // Communication
  SLACK: 'slack',
  TEAMS: 'teams',
  ZOOM: 'zoom',
  // CRM
  SALESFORCE: 'salesforce',
  HUBSPOT: 'hubspot',
  // Project Management
  JIRA: 'jira',
  ASANA: 'asana',
  NOTION: 'notion',
  LINEAR: 'linear',
  // Social
  LINKEDIN: 'linkedin',
  TWITTER: 'twitter',
  // Support
  INTERCOM: 'intercom',
  ZENDESK: 'zendesk',
  // HR/Recruiting
  GREENHOUSE: 'greenhouse',
  LEVER: 'lever',
  // Research
  CRUNCHBASE: 'crunchbase',
} as const;

// ============================================
// CACHE KEYS
// ============================================

export const CACHE_KEYS = {
  AGENT_CONTEXT: 'motion:agent:context',
  USER_PREFERENCES: 'motion:user:preferences',
  CREDIT_BALANCE: 'motion:credits:balance',
  RATE_LIMIT: 'motion:ratelimit',
  CONVERSATION: 'motion:conversation',
  SKILL: 'motion:skill',
} as const;

export const CACHE_TTL = {
  AGENT_CONTEXT: 3600, // 1 hour
  USER_PREFERENCES: 86400, // 24 hours
  CREDIT_BALANCE: 300, // 5 minutes
  RATE_LIMIT: 60, // 1 minute
  CONVERSATION: 1800, // 30 minutes
  SKILL: 3600, // 1 hour
} as const;
