/**
 * Motion Agents Configuration
 * Usemotion-style AI Agents System Configuration
 */

import {
  UserCheck,
  Megaphone,
  FolderKanban,
  TrendingUp,
  Users,
  Heart,
  Telescope,
  type LucideIcon,
} from 'lucide-react';

// ============================================
// AGENT CONFIGURATION
// ============================================

export interface MotionAgentConfig {
  id: string;
  name: string;
  role: string;
  description: string;
  category: 'operations' | 'marketing' | 'sales' | 'hr' | 'support' | 'research';
  color: string;
  icon: LucideIcon;
  creditCostMultiplier: number;
  maxConcurrentExecutions: number;
  specialties: string[];
  requiredIntegrations?: string[];
}

export const MOTION_AGENTS: Record<string, MotionAgentConfig> = {
  alfred: {
    id: 'alfred',
    name: 'Alfred',
    role: 'Executive Assistant',
    description: 'Your personal executive assistant who manages emails, calendar, meetings, and daily operations with precision and efficiency.',
    category: 'operations',
    color: '#6366F1',
    icon: UserCheck,
    creditCostMultiplier: 1.0,
    maxConcurrentExecutions: 5,
    specialties: [
      'Email Management & Drafting',
      'Calendar Optimization',
      'Meeting Scheduling & Prep',
      'Task Prioritization',
      'Travel Planning',
      'Document Organization',
    ],
    requiredIntegrations: ['gmail', 'calendar', 'slack'],
  },
  suki: {
    id: 'suki',
    name: 'Suki',
    role: 'Marketing Associate',
    description: 'A creative marketing specialist who crafts compelling content, manages campaigns, and drives brand engagement.',
    category: 'marketing',
    color: '#EC4899',
    icon: Megaphone,
    creditCostMultiplier: 1.2,
    maxConcurrentExecutions: 3,
    specialties: [
      'Content Creation & Writing',
      'Social Media Management',
      'SEO Optimization',
      'Campaign Planning',
      'Brand Voice Development',
      'Marketing Analytics',
    ],
    requiredIntegrations: ['twitter', 'linkedin', 'hubspot'],
  },
  millie: {
    id: 'millie',
    name: 'Millie',
    role: 'Project Manager',
    description: 'An organized project manager who keeps teams aligned, tracks progress, and ensures projects are delivered on time.',
    category: 'operations',
    color: '#F59E0B',
    icon: FolderKanban,
    creditCostMultiplier: 1.0,
    maxConcurrentExecutions: 5,
    specialties: [
      'Project Planning & Tracking',
      'Task Assignment & Delegation',
      'Resource Allocation',
      'Progress Reporting',
      'Risk Management',
      'Team Coordination',
    ],
    requiredIntegrations: ['jira', 'asana', 'notion'],
  },
  chip: {
    id: 'chip',
    name: 'Chip',
    role: 'Sales Development Rep',
    description: 'A proactive sales rep who researches prospects, crafts outreach, and helps build your sales pipeline.',
    category: 'sales',
    color: '#22C55E',
    icon: TrendingUp,
    creditCostMultiplier: 1.1,
    maxConcurrentExecutions: 10,
    specialties: [
      'Lead Research & Enrichment',
      'Cold Outreach Drafting',
      'CRM Management',
      'Pipeline Analysis',
      'Follow-up Sequences',
      'Meeting Booking',
    ],
    requiredIntegrations: ['salesforce', 'hubspot', 'linkedin'],
  },
  dot: {
    id: 'dot',
    name: 'Dot',
    role: 'Recruiter',
    description: 'A talent acquisition specialist who sources candidates, screens resumes, and coordinates the hiring process.',
    category: 'hr',
    color: '#8B5CF6',
    icon: Users,
    creditCostMultiplier: 1.0,
    maxConcurrentExecutions: 5,
    specialties: [
      'Candidate Sourcing',
      'Resume Screening',
      'Interview Scheduling',
      'Job Description Writing',
      'Candidate Communication',
      'Hiring Pipeline Management',
    ],
    requiredIntegrations: ['linkedin', 'greenhouse', 'lever'],
  },
  clide: {
    id: 'clide',
    name: 'Clide',
    role: 'Client Success Manager',
    description: 'A dedicated client success manager who ensures customer satisfaction, handles support, and drives retention.',
    category: 'support',
    color: '#EF4444',
    icon: Heart,
    creditCostMultiplier: 1.0,
    maxConcurrentExecutions: 5,
    specialties: [
      'Client Onboarding',
      'Health Score Monitoring',
      'Churn Prevention',
      'Upsell Identification',
      'Customer Feedback Analysis',
      'Success Metrics Tracking',
    ],
    requiredIntegrations: ['intercom', 'zendesk', 'hubspot'],
  },
  spec: {
    id: 'spec',
    name: 'Spec',
    role: 'Competitive Intelligence',
    description: 'A strategic researcher who monitors competitors, analyzes market trends, and provides actionable insights.',
    category: 'research',
    color: '#0EA5E9',
    icon: Telescope,
    creditCostMultiplier: 1.3,
    maxConcurrentExecutions: 3,
    specialties: [
      'Competitor Monitoring',
      'Market Research',
      'Trend Analysis',
      'SWOT Analysis',
      'Industry Reports',
      'Strategic Recommendations',
    ],
    requiredIntegrations: ['web', 'linkedin', 'crunchbase'],
  },
};

// ============================================
// CREDIT SYSTEM CONFIGURATION
// ============================================

export interface CreditPlan {
  id: string;
  name: string;
  monthlyCredits: number;
  priceUSD: number;
  overageRateUSD: number;
  features: string[];
}

export const CREDIT_PLANS: Record<string, CreditPlan> = {
  starter: {
    id: 'starter',
    name: 'Starter',
    monthlyCredits: 10000,
    priceUSD: 49,
    overageRateUSD: 0.0025,
    features: ['3 AI Agents', 'Basic Skills', 'Email Support'],
  },
  light: {
    id: 'light',
    name: 'Light',
    monthlyCredits: 25000,
    priceUSD: 99,
    overageRateUSD: 0.0022,
    features: ['5 AI Agents', 'Advanced Skills', 'Priority Support'],
  },
  standard: {
    id: 'standard',
    name: 'Standard',
    monthlyCredits: 100000,
    priceUSD: 299,
    overageRateUSD: 0.0019,
    features: ['All 7 AI Agents', 'Custom Skills', 'Dedicated Support'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    monthlyCredits: 250000,
    priceUSD: 599,
    overageRateUSD: 0.0015,
    features: ['All Agents', 'Unlimited Skills', 'SLA Support', 'API Access'],
  },
};

export const CREDIT_COSTS = {
  chatMessage: 5,
  simpleToolExecution: 10,
  complexToolExecution: 50,
  skillRun: 100,
  documentGeneration: 200,
  researchTask: 500,
  integrationSync: 25,
} as const;

// ============================================
// LLM CONFIGURATION
// ============================================

export const LLM_CONFIG = {
  defaultModel: 'gpt-4o-mini',
  premiumModel: 'gpt-4-turbo',
  maxTokens: 4000,
  temperature: 0.7,
  topP: 1,
  frequencyPenalty: 0.5,
  presencePenalty: 0.5,
  streamingEnabled: true,
} as const;

// ============================================
// RATE LIMITS
// ============================================

export const RATE_LIMITS = {
  perMinute: {
    chat: 60,
    toolExecution: 30,
    skillRun: 10,
  },
  perHour: {
    chat: 500,
    toolExecution: 200,
    skillRun: 50,
  },
  perDay: {
    chat: 5000,
    toolExecution: 2000,
    skillRun: 500,
  },
} as const;

// ============================================
// SKILL SYSTEM CONFIGURATION
// ============================================

export type SkillTriggerType = 'manual' | 'scheduled' | 'event';
export type SkillVisibility = 'private' | 'team' | 'workspace';
export type SkillStepType = 'tool' | 'prompt' | 'condition' | 'loop' | 'human_approval';

export interface SkillStepConfig {
  id: string;
  type: SkillStepType;
  name: string;
  config: Record<string, unknown>;
  onSuccess?: string; // next step id
  onFailure?: string; // fallback step id
}

export interface SkillConfig {
  id: string;
  name: string;
  displayName: string;
  description: string;
  agentId: string;
  triggerType: SkillTriggerType;
  triggerConfig: {
    cronExpression?: string;
    eventType?: string;
    eventFilter?: Record<string, unknown>;
  };
  steps: SkillStepConfig[];
  inputSchema?: Record<string, unknown>;
  outputFormat: 'text' | 'json' | 'markdown' | 'html';
  visibility: SkillVisibility;
  estimatedCredits: number;
  timeout: number; // ms
}

// ============================================
// APPROVAL WORKFLOW CONFIGURATION
// ============================================

export const APPROVAL_REQUIRED_ACTIONS = [
  'send_email',
  'send_message',
  'create_meeting',
  'update_crm',
  'post_social',
  'send_outreach',
  'schedule_interview',
  'create_document',
] as const;

export type ApprovalRequiredAction = typeof APPROVAL_REQUIRED_ACTIONS[number];

export interface ApprovalConfig {
  action: ApprovalRequiredAction;
  requiresApproval: boolean;
  autoApproveAfterMs?: number; // Auto-approve after timeout
  notifyChannel?: 'email' | 'slack' | 'inApp';
}

export const DEFAULT_APPROVAL_CONFIG: Record<ApprovalRequiredAction, ApprovalConfig> = {
  send_email: { action: 'send_email', requiresApproval: true, notifyChannel: 'inApp' },
  send_message: { action: 'send_message', requiresApproval: true, notifyChannel: 'inApp' },
  create_meeting: { action: 'create_meeting', requiresApproval: true, notifyChannel: 'inApp' },
  update_crm: { action: 'update_crm', requiresApproval: false },
  post_social: { action: 'post_social', requiresApproval: true, notifyChannel: 'slack' },
  send_outreach: { action: 'send_outreach', requiresApproval: true, notifyChannel: 'inApp' },
  schedule_interview: { action: 'schedule_interview', requiresApproval: true, notifyChannel: 'email' },
  create_document: { action: 'create_document', requiresApproval: false },
};

// ============================================
// INTEGRATION CONFIGURATION
// ============================================

export const SUPPORTED_INTEGRATIONS = [
  'gmail',
  'calendar',
  'slack',
  'notion',
  'jira',
  'asana',
  'hubspot',
  'salesforce',
  'linkedin',
  'twitter',
  'intercom',
  'zendesk',
  'greenhouse',
  'lever',
  'zoom',
  'teams',
  'crunchbase',
] as const;

export type SupportedIntegration = typeof SUPPORTED_INTEGRATIONS[number];

// ============================================
// EXPORT ALL CONFIG
// ============================================

export const MOTION_CONFIG = {
  agents: MOTION_AGENTS,
  credits: {
    plans: CREDIT_PLANS,
    costs: CREDIT_COSTS,
  },
  llm: LLM_CONFIG,
  rateLimits: RATE_LIMITS,
  approvals: DEFAULT_APPROVAL_CONFIG,
  integrations: SUPPORTED_INTEGRATIONS,
} as const;

export default MOTION_CONFIG;
