/**
 * VISUAL AGENT STUDIO - TYPE DEFINITIONS
 *
 * Core types for the visual agent builder system
 */

import { Node, Edge } from 'reactflow';

// ============================================================================
// MODULE TYPES
// ============================================================================

export type ModuleCategory = 'skill' | 'action' | 'integration' | 'trigger' | 'logic';

export type SkillType =
  | 'data-analysis'
  | 'customer-support'
  | 'content-generation'
  | 'code-review'
  | 'research'
  | 'planning';

export type ActionType =
  | 'send-email'
  | 'send-slack-message'
  | 'create-task'
  | 'update-database'
  | 'run-analysis'
  | 'generate-report';

export type IntegrationType =
  | 'email'
  | 'slack'
  | 'calendar'
  | 'crm'
  | 'database'
  | 'api';

export type TriggerType =
  | 'time-based'
  | 'event-based'
  | 'manual'
  | 'webhook'
  | 'email-received';

export type LogicType =
  | 'condition'
  | 'loop'
  | 'switch'
  | 'delay';

// ============================================================================
// MODULE CONFIGURATION
// ============================================================================

export interface BaseModuleConfig {
  id: string;
  category: ModuleCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  enabled: boolean;
}

export interface SkillModuleConfig extends BaseModuleConfig {
  category: 'skill';
  skillType: SkillType;
  model?: 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3';
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface ActionModuleConfig extends BaseModuleConfig {
  category: 'action';
  actionType: ActionType;
  parameters: Record<string, any>;
}

export interface IntegrationModuleConfig extends BaseModuleConfig {
  category: 'integration';
  integrationType: IntegrationType;
  credentials?: {
    apiKey?: string;
    webhookUrl?: string;
    [key: string]: any;
  };
}

export interface TriggerModuleConfig extends BaseModuleConfig {
  category: 'trigger';
  triggerType: TriggerType;
  schedule?: string; // cron expression for time-based
  eventName?: string; // for event-based
}

export interface LogicModuleConfig extends BaseModuleConfig {
  category: 'logic';
  logicType: LogicType;
  condition?: string;
  iterations?: number;
}

export type ModuleConfig =
  | SkillModuleConfig
  | ActionModuleConfig
  | IntegrationModuleConfig
  | TriggerModuleConfig
  | LogicModuleConfig;

// ============================================================================
// CANVAS & WORKFLOW
// ============================================================================

export interface AgentWorkflow {
  id: string;
  name: string;
  description: string;
  nodes: Node[];
  edges: Edge[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  zoom: number;
  mode: 'edit' | 'preview' | 'test';
}

// ============================================================================
// MODULE LIBRARY
// ============================================================================

export interface ModuleTemplate {
  id: string;
  category: ModuleCategory;
  type: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  defaultConfig: Partial<ModuleConfig>;
  inputs: ModulePort[];
  outputs: ModulePort[];
}

export interface ModulePort {
  id: string;
  name: string;
  type: 'data' | 'trigger' | 'action';
  required: boolean;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface AgentConfiguration {
  id: string;
  name: string;
  description: string;
  personality: 'professional' | 'friendly' | 'technical' | 'creative';
  workflow: AgentWorkflow;
  settings: {
    learningMode: 'static' | 'adaptive' | 'evolutionary';
    autoRetry: boolean;
    errorHandling: 'stop' | 'continue' | 'notify';
    logging: 'minimal' | 'standard' | 'verbose';
  };
}

// ============================================================================
// PREVIEW & TESTING
// ============================================================================

export interface TestCase {
  id: string;
  name: string;
  input: any;
  expectedOutput?: any;
  status?: 'pending' | 'running' | 'passed' | 'failed';
  result?: any;
  error?: string;
}

export interface PreviewState {
  isRunning: boolean;
  currentNode: string | null;
  executionLog: ExecutionLogEntry[];
  testCases: TestCase[];
}

export interface ExecutionLogEntry {
  timestamp: Date;
  nodeId: string;
  nodeName: string;
  status: 'started' | 'completed' | 'failed';
  input?: any;
  output?: any;
  error?: string;
  duration?: number;
}

// ============================================================================
// WORKFLOW TEMPLATES (MARKETPLACE)
// ============================================================================

export type TemplateCategory =
  | 'customer-support'
  | 'data-analysis'
  | 'content-generation'
  | 'content-creation' // Alias for backwards compatibility
  | 'automation'
  | 'integration'
  | 'research'
  | 'crm'
  | 'sales'
  | 'marketing'
  | 'finance'
  | 'operations'
  | 'other';

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

// ============================================================================
// FLOWENT UNIFIED TEMPLATE ENGINE
// ============================================================================

/**
 * Template Requirement Types
 * Used for dynamic wizard configuration
 */
export type TemplateRequirementType =
  | 'api_key'
  | 'integration'
  | 'variable'
  | 'webhook_url'
  | 'database'
  | 'config';

/**
 * Provider types for API keys and integrations
 */
export type TemplateProvider =
  | 'openai'
  | 'anthropic'
  | 'slack'
  | 'resend'
  | 'gmail'
  | 'hubspot'
  | 'salesforce'
  | 'stripe'
  | 'twilio'
  | 'notion'
  | 'airtable'
  | 'zapier'
  | 'custom';

/**
 * Single requirement definition for templates
 * Powers dynamic configuration wizard
 */
export interface TemplateRequirement {
  /** Unique identifier for the requirement */
  id: string;

  /** Type of requirement */
  type: TemplateRequirementType;

  /** Provider (for api_key and integration types) */
  provider?: TemplateProvider;

  /** Human-readable label */
  label: string;

  /** Detailed description for the wizard */
  description: string;

  /** Placeholder text for input fields */
  placeholder?: string;

  /** Whether this requirement is mandatory */
  required: boolean;

  /** Default value if any */
  defaultValue?: string;

  /** Validation pattern (regex string) */
  validationPattern?: string;

  /** Icon name (Lucide) */
  icon?: string;

  /** Node IDs that use this requirement (for injection) */
  targetNodeIds?: string[];

  /** Config path within node data (e.g., 'config.apiKey') */
  configPath?: string;
}

/**
 * FlowentTemplate - Unified Template Interface
 *
 * Consolidates PipelineTemplate and WorkflowTemplate into a single
 * comprehensive interface for the Flowent AI Agent System.
 *
 * @version 2.0.0
 */
export interface FlowentTemplate {
  // -------------------------------------------------------------------------
  // Core Identity
  // -------------------------------------------------------------------------

  /** Unique template identifier */
  id: string;

  /** Template display name */
  name: string;

  /** Detailed description */
  description: string;

  /** Template category for filtering */
  category: TemplateCategory;

  /** Difficulty/complexity level */
  difficulty: TemplateDifficulty;

  // -------------------------------------------------------------------------
  // Workflow Definition (React Flow)
  // -------------------------------------------------------------------------

  /** React Flow nodes */
  nodes: Node[];

  /** React Flow edges */
  edges: Edge[];

  // -------------------------------------------------------------------------
  // Dynamic Requirements (Wizard Configuration)
  // -------------------------------------------------------------------------

  /**
   * Dynamic requirements for configuration wizard
   * Replaces hardcoded TEMPLATE_REQUIREMENTS mapping
   */
  requirements: TemplateRequirement[];

  // -------------------------------------------------------------------------
  // Visual & Branding
  // -------------------------------------------------------------------------

  /** Icon name (Lucide icons) */
  icon: string;

  /** Primary accent color (hex) */
  color: string;

  /** Optional thumbnail URL */
  thumbnail?: string;

  // -------------------------------------------------------------------------
  // Metadata
  // -------------------------------------------------------------------------

  /** Template author/creator */
  author: string;

  /** Semantic version (e.g., '1.0.0') */
  version: string;

  /** Searchable tags */
  tags: string[];

  /** Primary use case description */
  useCase: string;

  /** Estimated setup time (e.g., '5-10 minutes') */
  estimatedSetupMinutes?: number;

  /** Target audience (e.g., ['Sales Teams', 'Marketers']) */
  targetAudience?: string[];

  /** Specific use cases for this template */
  useCases?: string[];

  // -------------------------------------------------------------------------
  // Business Value (Enterprise Features)
  // -------------------------------------------------------------------------

  /** ROI badge text (e.g., '10x faster') */
  roiBadge?: string;

  /** Business benefit description */
  businessBenefit?: string;

  // -------------------------------------------------------------------------
  // Social Proof & Discovery
  // -------------------------------------------------------------------------

  /** Featured in gallery */
  isFeatured?: boolean;

  /** Number of times cloned/used */
  downloadCount?: number;

  /** Average rating (0-5) */
  rating?: number;

  /** Number of ratings */
  ratingCount?: number;

  // -------------------------------------------------------------------------
  // Template Status
  // -------------------------------------------------------------------------

  /** Template status */
  status?: 'draft' | 'active' | 'archived';

  /** Visibility level */
  visibility?: 'private' | 'team' | 'public';

  /** Is this a template (vs regular workflow) */
  isTemplate?: boolean;

  // -------------------------------------------------------------------------
  // Timestamps
  // -------------------------------------------------------------------------

  /** Creation timestamp */
  createdAt: number | Date | string;

  /** Last update timestamp */
  updatedAt: number | Date | string;
}

/**
 * Lightweight template for list views
 * Optimized for gallery rendering performance
 */
export interface FlowentTemplateListItem {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;

  // Visual
  icon: string;
  color: string;

  // Metrics
  isFeatured?: boolean;
  downloadCount?: number;
  rating?: number;
  ratingCount?: number;

  // Preview data
  nodeCount: number;
  edgeCount: number;
  requirementCount: number;

  // Tags for search
  tags: string[];

  // Business value
  roiBadge?: string;
  estimatedSetupMinutes?: number;
}

/**
 * @deprecated Use FlowentTemplate instead
 * Legacy interface maintained for backwards compatibility
 */
export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;

  // Metadata
  author: string;
  version: string;
  tags: string[];
  useCase: string;
  estimatedTime?: string; // e.g., "2-5 minutes"

  // Visual
  icon: string;
  color: string;
  thumbnail?: string;

  // Workflow Definition
  nodes: Node[];
  edges: Edge[];

  // Statistics
  downloads?: number;
  rating?: number;

  // Requirements (legacy format)
  requiredIntegrations?: string[];
  requiredVariables?: string[];

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// ============================================================================
// CUSTOM TOOLS (FUNCTION CALLING)
// ============================================================================

export type ToolParameterType = 'string' | 'number' | 'boolean' | 'object' | 'array';

export interface ToolParameter {
  name: string;
  type: ToolParameterType;
  description: string;
  required: boolean;
  default?: any;
  enum?: string[]; // For string type with predefined values
}

export interface CustomTool {
  id: string;
  name: string;
  description: string;

  // Parameters
  parameters: ToolParameter[];

  // Implementation
  code: string; // JavaScript function code
  runtime: 'javascript' | 'python'; // Future: support Python

  // Security & Validation
  timeout: number; // Max execution time in ms
  maxMemory?: number; // Max memory usage in MB
  allowedAPIs?: string[]; // Whitelist of allowed APIs

  // Metadata
  author: string;
  version: string;
  tags: string[];
  category: 'utility' | 'data' | 'api' | 'transformation' | 'validation';

  // Testing
  testCases?: ToolTestCase[];

  // Status
  verified: boolean; // Admin-verified tools
  public: boolean; // Available to all users

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

export interface ToolTestCase {
  id: string;
  name: string;
  input: Record<string, any>;
  expectedOutput: any;
  shouldPass: boolean;
}

export interface ToolExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  executionTime: number;
  logs?: string[];
}
