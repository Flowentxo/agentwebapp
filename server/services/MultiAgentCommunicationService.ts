/**
 * MULTI-AGENT COMMUNICATION SERVICE
 *
 * Enable agents to communicate, delegate, and coordinate tasks
 * - Agent-to-agent messaging
 * - Task delegation and handoffs
 * - Collaborative workflows
 * - Event-driven communication
 */

import { EventEmitter } from 'events';
import { getDb } from '@/lib/db';
import { pgTable, uuid, varchar, text, timestamp, jsonb, index, boolean } from 'drizzle-orm/pg-core';
import { eq, and, desc, sql } from 'drizzle-orm';

// Agent Messages Schema
export const agentCommunications = pgTable('agent_communications', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Sender and Receiver
  fromAgentId: varchar('from_agent_id', { length: 255 }).notNull(),
  toAgentId: varchar('to_agent_id', { length: 255 }).notNull(),

  // Message
  messageType: varchar('message_type', { length: 50 }).notNull(), // request, response, delegate, notify, handoff
  subject: varchar('subject', { length: 500 }),
  content: text('content').notNull(),

  // Metadata
  metadata: jsonb('metadata').$type<{
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    taskId?: string;
    workflowId?: string;
    context?: Record<string, any>;
    requiredCapabilities?: string[];
  }>(),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, delivered, read, processed, failed
  processedAt: timestamp('processed_at'),

  // Response tracking
  replyToId: uuid('reply_to_id'),
  requiresResponse: boolean('requires_response').default(false),
  responseReceived: boolean('response_received').default(false),

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: uuid('workspace_id'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  deliveredAt: timestamp('delivered_at'),

}, (table) => ({
  fromAgentIdx: index('agent_communications_from_agent_idx').on(table.fromAgentId),
  toAgentIdx: index('agent_communications_to_agent_idx').on(table.toAgentId),
  statusIdx: index('agent_communications_status_idx').on(table.status),
  createdAtIdx: index('agent_communications_created_at_idx').on(table.createdAt),
}));

export type AgentCommunication = typeof agentCommunications.$inferSelect;
export type NewAgentCommunication = typeof agentCommunications.$inferInsert;

// Task Delegation Schema
export const agentDelegations = pgTable('agent_delegations', {
  id: uuid('id').primaryKey().defaultRandom(),

  // Delegation details
  taskId: varchar('task_id', { length: 255 }).notNull(),
  taskName: varchar('task_name', { length: 500 }).notNull(),
  taskDescription: text('task_description'),

  // Agents
  delegatedBy: varchar('delegated_by', { length: 255 }).notNull(), // Delegating agent
  delegatedTo: varchar('delegated_to', { length: 255 }).notNull(), // Receiving agent

  // Task data
  taskData: jsonb('task_data').$type<{
    input?: any;
    context?: Record<string, any>;
    requirements?: string[];
    deadline?: string;
  }>(),

  // Status
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, accepted, in_progress, completed, failed, rejected
  result: jsonb('result'),
  error: text('error'),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  acceptedAt: timestamp('accepted_at'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),

  // Ownership
  userId: varchar('user_id', { length: 255 }).notNull(),
  workspaceId: uuid('workspace_id'),

}, (table) => ({
  taskIdIdx: index('agent_delegations_task_id_idx').on(table.taskId),
  delegatedByIdx: index('agent_delegations_delegated_by_idx').on(table.delegatedBy),
  delegatedToIdx: index('agent_delegations_delegated_to_idx').on(table.delegatedTo),
  statusIdx: index('agent_delegations_status_idx').on(table.status),
  createdAtIdx: index('agent_delegations_created_at_idx').on(table.createdAt),
}));

export type AgentDelegation = typeof agentDelegations.$inferSelect;
export type NewAgentDelegation = typeof agentDelegations.$inferInsert;

/**
 * Multi-Agent Communication Service
 */
export class MultiAgentCommunicationService extends EventEmitter {
  /**
   * Send message from one agent to another
   */
  async sendMessage(options: {
    fromAgentId: string;
    toAgentId: string;
    messageType: 'request' | 'response' | 'delegate' | 'notify' | 'handoff';
    subject?: string;
    content: string;
    metadata?: any;
    userId: string;
    workspaceId?: string;
    requiresResponse?: boolean;
    replyToId?: string;
  }): Promise<AgentCommunication> {
    const db = getDb();

    const [message] = await db.insert(agentCommunications).values({
      fromAgentId: options.fromAgentId,
      toAgentId: options.toAgentId,
      messageType: options.messageType,
      subject: options.subject,
      content: options.content,
      metadata: options.metadata || {},
      userId: options.userId,
      workspaceId: options.workspaceId,
      requiresResponse: options.requiresResponse || false,
      replyToId: options.replyToId,
      status: 'delivered',
      deliveredAt: new Date()
    }).returning();

    console.log('[AgentComm] Message sent:', {
      id: message.id,
      from: options.fromAgentId,
      to: options.toAgentId,
      type: options.messageType
    });

    // Emit event for real-time delivery
    this.emit('message', message);
    this.emit(`message:${options.toAgentId}`, message);

    return message;
  }

  /**
   * Get messages for an agent
   */
  async getMessages(options: {
    agentId: string;
    userId: string;
    status?: string;
    limit?: number;
  }): Promise<AgentCommunication[]> {
    const db = getDb();

    const conditions = [
      eq(agentCommunications.toAgentId, options.agentId),
      eq(agentCommunications.userId, options.userId)
    ];

    if (options.status) {
      conditions.push(eq(agentCommunications.status, options.status));
    }

    const messages = await db
      .select()
      .from(agentCommunications)
      .where(and(...conditions))
      .orderBy(desc(agentCommunications.createdAt))
      .limit(options.limit || 50);

    return messages;
  }

  /**
   * Mark message as read/processed
   */
  async markMessageProcessed(messageId: string): Promise<void> {
    const db = getDb();

    await db
      .update(agentCommunications)
      .set({
        status: 'processed',
        processedAt: new Date()
      })
      .where(eq(agentCommunications.id, messageId));

    console.log('[AgentComm] Message processed:', messageId);
  }

  /**
   * Delegate task to another agent
   */
  async delegateTask(options: {
    taskId: string;
    taskName: string;
    taskDescription?: string;
    delegatedBy: string;
    delegatedTo: string;
    taskData?: any;
    userId: string;
    workspaceId?: string;
  }): Promise<AgentDelegation> {
    const db = getDb();

    const [delegation] = await db.insert(agentDelegations).values({
      taskId: options.taskId,
      taskName: options.taskName,
      taskDescription: options.taskDescription,
      delegatedBy: options.delegatedBy,
      delegatedTo: options.delegatedTo,
      taskData: options.taskData || {},
      userId: options.userId,
      workspaceId: options.workspaceId,
      status: 'pending'
    }).returning();

    console.log('[AgentComm] Task delegated:', {
      id: delegation.id,
      task: options.taskName,
      from: options.delegatedBy,
      to: options.delegatedTo
    });

    // Send notification message
    await this.sendMessage({
      fromAgentId: options.delegatedBy,
      toAgentId: options.delegatedTo,
      messageType: 'delegate',
      subject: `Task Delegation: ${options.taskName}`,
      content: `You have been delegated a new task: ${options.taskName}`,
      metadata: {
        delegationId: delegation.id,
        taskId: options.taskId
      },
      userId: options.userId,
      workspaceId: options.workspaceId,
      requiresResponse: true
    });

    // Emit event
    this.emit('delegation', delegation);
    this.emit(`delegation:${options.delegatedTo}`, delegation);

    return delegation;
  }

  /**
   * Accept delegated task
   */
  async acceptTask(delegationId: string): Promise<AgentDelegation> {
    const db = getDb();

    const [delegation] = await db
      .update(agentDelegations)
      .set({
        status: 'accepted',
        acceptedAt: new Date()
      })
      .where(eq(agentDelegations.id, delegationId))
      .returning();

    console.log('[AgentComm] Task accepted:', delegationId);

    this.emit('task:accepted', delegation);

    return delegation;
  }

  /**
   * Start working on delegated task
   */
  async startTask(delegationId: string): Promise<AgentDelegation> {
    const db = getDb();

    const [delegation] = await db
      .update(agentDelegations)
      .set({
        status: 'in_progress',
        startedAt: new Date()
      })
      .where(eq(agentDelegations.id, delegationId))
      .returning();

    console.log('[AgentComm] Task started:', delegationId);

    this.emit('task:started', delegation);

    return delegation;
  }

  /**
   * Complete delegated task
   */
  async completeTask(delegationId: string, result: any): Promise<AgentDelegation> {
    const db = getDb();

    const [delegation] = await db
      .update(agentDelegations)
      .set({
        status: 'completed',
        result,
        completedAt: new Date()
      })
      .where(eq(agentDelegations.id, delegationId))
      .returning();

    console.log('[AgentComm] Task completed:', delegationId);

    // Notify delegating agent
    await this.sendMessage({
      fromAgentId: delegation.delegatedTo,
      toAgentId: delegation.delegatedBy,
      messageType: 'response',
      subject: `Task Completed: ${delegation.taskName}`,
      content: `Task "${delegation.taskName}" has been completed successfully.`,
      metadata: {
        delegationId: delegation.id,
        taskId: delegation.taskId,
        result
      },
      userId: delegation.userId,
      workspaceId: delegation.workspaceId
    });

    this.emit('task:completed', delegation);

    return delegation;
  }

  /**
   * Fail delegated task
   */
  async failTask(delegationId: string, error: string): Promise<AgentDelegation> {
    const db = getDb();

    const [delegation] = await db
      .update(agentDelegations)
      .set({
        status: 'failed',
        error,
        completedAt: new Date()
      })
      .where(eq(agentDelegations.id, delegationId))
      .returning();

    console.log('[AgentComm] Task failed:', delegationId);

    // Notify delegating agent
    await this.sendMessage({
      fromAgentId: delegation.delegatedTo,
      toAgentId: delegation.delegatedBy,
      messageType: 'response',
      subject: `Task Failed: ${delegation.taskName}`,
      content: `Task "${delegation.taskName}" has failed: ${error}`,
      metadata: {
        delegationId: delegation.id,
        taskId: delegation.taskId,
        error
      },
      userId: delegation.userId,
      workspaceId: delegation.workspaceId
    });

    this.emit('task:failed', delegation);

    return delegation;
  }

  /**
   * Get delegations for an agent
   */
  async getDelegations(options: {
    agentId: string;
    userId: string;
    direction?: 'delegated_by' | 'delegated_to';
    status?: string;
    limit?: number;
  }): Promise<AgentDelegation[]> {
    const db = getDb();

    const conditions = [eq(agentDelegations.userId, options.userId)];

    if (options.direction === 'delegated_by') {
      conditions.push(eq(agentDelegations.delegatedBy, options.agentId));
    } else if (options.direction === 'delegated_to') {
      conditions.push(eq(agentDelegations.delegatedTo, options.agentId));
    } else {
      // Both directions
      conditions.push(
        sql`(${agentDelegations.delegatedBy} = ${options.agentId} OR ${agentDelegations.delegatedTo} = ${options.agentId})`
      );
    }

    if (options.status) {
      conditions.push(eq(agentDelegations.status, options.status));
    }

    const delegations = await db
      .select()
      .from(agentDelegations)
      .where(and(...conditions))
      .orderBy(desc(agentDelegations.createdAt))
      .limit(options.limit || 50);

    return delegations;
  }

  /**
   * Get communication stats
   */
  async getStats(userId: string, workspaceId?: string): Promise<{
    totalMessages: number;
    totalDelegations: number;
    activeDelegations: number;
    completedDelegations: number;
  }> {
    const db = getDb();

    const conditions = [eq(agentCommunications.userId, userId)];
    if (workspaceId) {
      conditions.push(eq(agentCommunications.workspaceId, workspaceId));
    }

    const messagesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentCommunications)
      .where(and(...conditions));

    const delegConditions = [eq(agentDelegations.userId, userId)];
    if (workspaceId) {
      delegConditions.push(eq(agentDelegations.workspaceId, workspaceId));
    }

    const delegationsResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentDelegations)
      .where(and(...delegConditions));

    const activeResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentDelegations)
      .where(and(
        ...delegConditions,
        sql`status IN ('pending', 'accepted', 'in_progress')`
      ));

    const completedResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(agentDelegations)
      .where(and(
        ...delegConditions,
        eq(agentDelegations.status, 'completed')
      ));

    return {
      totalMessages: Number(messagesResult[0]?.count || 0),
      totalDelegations: Number(delegationsResult[0]?.count || 0),
      activeDelegations: Number(activeResult[0]?.count || 0),
      completedDelegations: Number(completedResult[0]?.count || 0)
    };
  }
}

// Singleton instance
export const multiAgentCommService = new MultiAgentCommunicationService();
