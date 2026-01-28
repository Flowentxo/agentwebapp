/**
 * AGENT FACTORY DATABASE SCHEMA
 *
 * Schema for self-building agent system:
 * - Agent Blueprints (design templates)
 * - Agent Instances (running agents)
 * - Agent Teams (collaborative groups)
 * - Evolution tracking
 * - Inter-agent communication
 */

import { pgTable, uuid, varchar, text, jsonb, timestamp, integer, boolean, unique } from 'drizzle-orm/pg-core';

// ============================================
// AGENT BLUEPRINTS (The DNA)
// ============================================

export const agentBlueprints = pgTable('agent_blueprints', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Identity
  name: varchar('name', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  // Version Control
  version: integer('version').default(1).notNull(),
  parentId: uuid('parent_id'), // For evolved versions

  // Configuration
  personality: jsonb('personality').notNull(), // AgentPersonality
  skills: jsonb('skills').notNull(), // string[]
  tools: jsonb('tools').notNull(), // Tool[]
  integrations: jsonb('integrations').notNull(), // Integration[]

  // AI Configuration
  systemPrompt: text('system_prompt').notNull(),
  reasoningStyle: varchar('reasoning_style', { length: 100 }),
  learningMode: varchar('learning_mode', { length: 50 }).notNull(), // 'static' | 'adaptive' | 'evolutionary'

  // Collaboration
  canCollaborate: jsonb('can_collaborate'), // string[] - agent IDs
  preferredRole: varchar('preferred_role', { length: 50 }), // 'leader' | 'specialist' | 'support'

  // Ownership
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  isPublic: boolean('is_public').default(false),

  // Metadata
  category: varchar('category', { length: 100 }), // 'factory' | 'custom' | 'system'
  tags: jsonb('tags'), // string[]

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================
// AGENT INSTANCES (Running Agents)
// ============================================

export const agentInstances = pgTable('agent_instances', {
  id: uuid('id').primaryKey().defaultRandom(),

  blueprintId: uuid('blueprint_id').references(() => agentBlueprints.id, { onDelete: 'cascade' }).notNull(),

  // Runtime State
  status: varchar('status', { length: 50 }).notNull(), // 'idle' | 'working' | 'learning' | 'collaborating' | 'offline'
  currentTaskId: uuid('current_task_id'),

  // Memory & Context
  memory: jsonb('memory'), // ConversationMemory
  context: jsonb('context'), // Current working context

  // Performance Metrics
  metrics: jsonb('metrics'), // PerformanceMetrics

  // Ownership
  ownerId: varchar('owner_id', { length: 255 }).notNull(),

  // Activity Tracking
  lastActiveAt: timestamp('last_active_at'),
  totalTasks: integer('total_tasks').default(0),
  successRate: integer('success_rate').default(0), // Percentage

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================
// AGENT TEAMS (Collaborative Groups)
// ============================================

export const agentTeams = pgTable('agent_teams', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Mission
  name: varchar('name', { length: 255 }),
  mission: text('mission').notNull(),
  description: text('description'),

  // Leadership
  leaderId: uuid('leader_id').references(() => agentInstances.id),

  // Workflow
  workflow: jsonb('workflow'), // TeamWorkflow
  sharedContext: jsonb('shared_context'), // SharedMemory

  // Status
  status: varchar('status', { length: 50 }).notNull(), // 'forming' | 'active' | 'completed' | 'dissolved'

  // Ownership
  ownerId: varchar('owner_id', { length: 255 }).notNull(),

  // Timeline
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),

  createdAt: timestamp('created_at').defaultNow()
});

// ============================================
// TEAM MEMBERS (Many-to-Many)
// ============================================

export const teamMembers = pgTable('team_members', {
  teamId: uuid('team_id').references(() => agentTeams.id, { onDelete: 'cascade' }).notNull(),
  agentId: uuid('agent_id').references(() => agentInstances.id, { onDelete: 'cascade' }).notNull(),

  role: varchar('role', { length: 100 }), // 'leader' | 'specialist' | 'support' | custom

  joinedAt: timestamp('joined_at').defaultNow(),
  leftAt: timestamp('left_at')
}, (table) => ({
  pk: unique().on(table.teamId, table.agentId)
}));

// ============================================
// AGENT EVOLUTION (Learning History)
// ============================================

export const agentEvolution = pgTable('agent_evolution', {
  id: uuid('id').primaryKey().defaultRandom(),

  agentId: uuid('agent_id').references(() => agentBlueprints.id, { onDelete: 'cascade' }).notNull(),

  // Change Details
  changeType: varchar('change_type', { length: 100 }).notNull(), // 'optimization' | 'new_skill' | 'prompt_update' | 'personality_shift'

  before: jsonb('before'), // Snapshot before change
  after: jsonb('after'), // Snapshot after change

  // Trigger
  trigger: varchar('trigger', { length: 100 }), // 'user_feedback' | 'performance' | 'error_rate' | 'manual'
  triggerData: jsonb('trigger_data'),

  // Impact
  metrics: jsonb('metrics'), // Performance comparison
  impact: varchar('impact', { length: 50 }), // 'positive' | 'negative' | 'neutral'

  // Approval
  autoApproved: boolean('auto_approved').default(false),
  approvedBy: varchar('approved_by', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow()
});

// ============================================
// FACTORY INTER-AGENT MESSAGES
// ============================================

export const factoryAgentMessages = pgTable('factory_agent_messages', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Participants
  fromAgentId: uuid('from_agent_id').references(() => agentInstances.id, { onDelete: 'cascade' }).notNull(),
  toAgentId: uuid('to_agent_id').references(() => agentInstances.id, { onDelete: 'cascade' }),

  // Team context (if part of team collaboration)
  teamId: uuid('team_id').references(() => agentTeams.id, { onDelete: 'cascade' }),

  // Message Details
  type: varchar('type', { length: 50 }).notNull(), // 'task_request' | 'status_update' | 'collaboration_request' | 'data_share' | 'error'
  content: jsonb('content').notNull(),

  priority: varchar('priority', { length: 20 }).default('normal'), // 'low' | 'normal' | 'high' | 'critical'

  // Status
  readAt: timestamp('read_at'),
  respondedAt: timestamp('responded_at'),

  createdAt: timestamp('created_at').defaultNow()
});

// ============================================
// AGENT TASKS (Task Execution Tracking)
// ============================================

export const agentTasks = pgTable('agent_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Task Details
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  requirements: jsonb('requirements'), // Task requirements

  // Assignment
  assignedToAgentId: uuid('assigned_to_agent_id').references(() => agentInstances.id),
  assignedToTeamId: uuid('assigned_to_team_id').references(() => agentTeams.id),

  // Execution
  status: varchar('status', { length: 50 }).notNull(), // 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

  result: jsonb('result'), // Task output
  error: text('error'), // Error message if failed

  // Metrics
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  duration: integer('duration'), // seconds

  // Quality
  qualityScore: integer('quality_score'), // 0-100
  userRating: integer('user_rating'), // 1-5
  feedback: text('feedback'),

  // Ownership
  ownerId: varchar('owner_id', { length: 255 }).notNull(),

  createdAt: timestamp('created_at').defaultNow()
});

// ============================================
// AGENT SKILLS (Skill Library)
// ============================================

export const agentSkills = pgTable('agent_skills', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: varchar('name', { length: 255 }).notNull().unique(),
  category: varchar('category', { length: 100 }), // 'analysis' | 'communication' | 'integration' | 'automation'

  description: text('description'),

  // Implementation
  implementation: jsonb('implementation'), // Code or config for the skill
  requirements: jsonb('requirements'), // Required tools, APIs, etc.

  // Metadata
  difficulty: varchar('difficulty', { length: 50 }), // 'beginner' | 'intermediate' | 'advanced' | 'expert'
  isBuiltIn: boolean('is_built_in').default(false),

  createdBy: varchar('created_by', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================
// AGENT INTEGRATIONS (Integration Registry)
// ============================================

export const agentIntegrations = pgTable('agent_integrations', {
  id: uuid('id').primaryKey().defaultRandom(),

  name: varchar('name', { length: 255 }).notNull().unique(),
  type: varchar('type', { length: 100 }).notNull(), // 'sap' | 'crm' | 'email' | 'calendar' | 'custom'

  description: text('description'),

  // Configuration
  config: jsonb('config').notNull(), // Connection details, credentials reference, etc.

  // Capabilities
  capabilities: jsonb('capabilities'), // What this integration can do

  // Status
  status: varchar('status', { length: 50 }).default('active'), // 'active' | 'inactive' | 'error'

  lastTestedAt: timestamp('last_tested_at'),

  createdBy: varchar('created_by', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================
// AGENT CREATION REQUESTS (User Requests)
// ============================================

export const agentCreationRequests = pgTable('agent_creation_requests', {
  id: uuid('id').primaryKey().defaultRandom(),

  // User Request
  userId: varchar('user_id', { length: 255 }).notNull(),
  request: text('request').notNull(), // Natural language request

  // Analysis
  analyzedRequirements: jsonb('analyzed_requirements'), // What CREATOR analyzed

  // Blueprint
  proposedBlueprintId: uuid('proposed_blueprint_id').references(() => agentBlueprints.id),

  // Team Assembly
  creationTeamId: uuid('creation_team_id').references(() => agentTeams.id),

  // Status
  status: varchar('status', { length: 50 }).notNull(), // 'analyzing' | 'designing' | 'implementing' | 'testing' | 'completed' | 'failed'

  // Result
  createdAgentId: uuid('created_agent_id').references(() => agentInstances.id),
  error: text('error'),

  // Timeline
  startedAt: timestamp('started_at').defaultNow(),
  completedAt: timestamp('completed_at')
});

// ============================================
// TYPES (TypeScript Interfaces)
// ============================================

export type AgentBlueprint = typeof agentBlueprints.$inferSelect;
export type NewAgentBlueprint = typeof agentBlueprints.$inferInsert;

export type AgentInstance = typeof agentInstances.$inferSelect;
export type NewAgentInstance = typeof agentInstances.$inferInsert;

export type AgentTeam = typeof agentTeams.$inferSelect;
export type NewAgentTeam = typeof agentTeams.$inferInsert;

export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;

export type AgentEvolution = typeof agentEvolution.$inferSelect;
export type NewAgentEvolution = typeof agentEvolution.$inferInsert;

export type FactoryAgentMessage = typeof factoryAgentMessages.$inferSelect;
export type NewFactoryAgentMessage = typeof factoryAgentMessages.$inferInsert;

export type AgentTask = typeof agentTasks.$inferSelect;
export type NewAgentTask = typeof agentTasks.$inferInsert;

export type AgentSkill = typeof agentSkills.$inferSelect;
export type NewAgentSkill = typeof agentSkills.$inferInsert;

export type AgentIntegration = typeof agentIntegrations.$inferSelect;
export type NewAgentIntegration = typeof agentIntegrations.$inferInsert;

export type AgentCreationRequest = typeof agentCreationRequests.$inferSelect;
export type NewAgentCreationRequest = typeof agentCreationRequests.$inferInsert;
