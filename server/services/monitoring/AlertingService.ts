/**
 * AlertingService.ts
 *
 * Phase 7: Operational Intelligence Layer
 *
 * Rule-based alerting engine that monitors workflow executions
 * and triggers notifications based on configurable conditions.
 *
 * Supported Alert Conditions:
 * - failure_count: X failures in Y minutes
 * - failure_rate: >X% failure rate in time window
 * - duration_threshold: Execution takes >X seconds
 * - queue_backlog: >X jobs waiting in queue
 * - error_pattern: Specific error message regex match
 * - cost_threshold: Daily cost exceeds budget
 * - custom: Custom SQL condition
 *
 * Actions:
 * - Slack notifications
 * - Email alerts
 * - Webhook callbacks
 * - PagerDuty integration
 */

import { getDb } from '@/lib/db';
import {
  sql,
  eq,
  and,
  gte,
  lte,
  inArray,
  isNull,
  or,
  desc,
} from 'drizzle-orm';
import {
  alertRules,
  alertIncidents,
  AlertRule,
  AlertIncident,
  AlertSeverity,
  AlertConditionType,
  FailureCountCondition,
  FailureRateCondition,
  DurationThresholdCondition,
  QueueBacklogCondition,
  ErrorPatternCondition,
  CostThresholdCondition,
  AlertAction,
  executionSearchIndex,
  queueHealthSnapshots,
  dailyCostAggregates,
} from '@/lib/db/schema-monitoring';
import { getQueueMonitor } from './QueueMonitor';

// ============================================================================
// TYPES
// ============================================================================

export interface AlertEvaluationResult {
  ruleId: string;
  triggered: boolean;
  reason?: string;
  context?: Record<string, any>;
}

export interface CreateAlertRuleInput {
  name: string;
  description?: string;
  workspaceId?: string;
  workflowId?: string;
  workflowTags?: string[];
  conditionType: AlertConditionType;
  conditionConfig: Record<string, any>;
  severity?: AlertSeverity;
  actions?: AlertAction[];
  cooldownMinutes?: number;
  evaluationIntervalSeconds?: number;
  isEnabled?: boolean;
}

export interface AlertNotificationResult {
  action: AlertAction;
  success: boolean;
  error?: string;
  responseData?: any;
}

export interface IncidentContext {
  failureCount?: number;
  failureRate?: number;
  windowStart?: Date;
  windowEnd?: Date;
  affectedExecutions?: string[];
  errorSamples?: string[];
  queueBacklog?: number;
  durationMs?: number;
  dailyCost?: number;
  budget?: number;
}

// ============================================================================
// ALERTING SERVICE
// ============================================================================

export class AlertingService {
  private db = getDb();
  private evaluationInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  // --------------------------------------------------------------------------
  // RULE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Create a new alert rule.
   */
  async createRule(input: CreateAlertRuleInput): Promise<AlertRule> {
    const [rule] = await this.db
      .insert(alertRules)
      .values({
        name: input.name,
        description: input.description,
        workspaceId: input.workspaceId,
        workflowId: input.workflowId,
        workflowTags: input.workflowTags,
        conditionType: input.conditionType,
        conditionConfig: input.conditionConfig,
        severity: input.severity || 'warning',
        actions: input.actions || [],
        cooldownMinutes: input.cooldownMinutes || 15,
        evaluationIntervalSeconds: input.evaluationIntervalSeconds || 60,
        isEnabled: input.isEnabled ?? true,
      })
      .returning();

    console.log(`[AlertingService] Created rule: ${rule.name} (${rule.id})`);
    return rule;
  }

  /**
   * Update an existing rule.
   */
  async updateRule(
    ruleId: string,
    updates: Partial<CreateAlertRuleInput>
  ): Promise<AlertRule | null> {
    const [rule] = await this.db
      .update(alertRules)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(alertRules.id, ruleId))
      .returning();

    return rule || null;
  }

  /**
   * Delete a rule.
   */
  async deleteRule(ruleId: string): Promise<boolean> {
    const result = await this.db
      .delete(alertRules)
      .where(eq(alertRules.id, ruleId));

    return true;
  }

  /**
   * Get all rules, optionally filtered.
   */
  async getRules(filters?: {
    workspaceId?: string;
    workflowId?: string;
    isEnabled?: boolean;
    conditionType?: AlertConditionType;
  }): Promise<AlertRule[]> {
    const conditions: any[] = [];

    if (filters?.workspaceId) {
      conditions.push(eq(alertRules.workspaceId, filters.workspaceId));
    }
    if (filters?.workflowId) {
      conditions.push(eq(alertRules.workflowId, filters.workflowId));
    }
    if (filters?.isEnabled !== undefined) {
      conditions.push(eq(alertRules.isEnabled, filters.isEnabled));
    }
    if (filters?.conditionType) {
      conditions.push(eq(alertRules.conditionType, filters.conditionType));
    }

    let query = this.db.select().from(alertRules);

    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    return await query.orderBy(desc(alertRules.createdAt));
  }

  /**
   * Get a single rule by ID.
   */
  async getRule(ruleId: string): Promise<AlertRule | null> {
    const [rule] = await this.db
      .select()
      .from(alertRules)
      .where(eq(alertRules.id, ruleId));

    return rule || null;
  }

  // --------------------------------------------------------------------------
  // RULE EVALUATION
  // --------------------------------------------------------------------------

  /**
   * Evaluate all enabled rules.
   * Called periodically by the background worker.
   */
  async evaluateAllRules(): Promise<AlertEvaluationResult[]> {
    const now = new Date();
    const results: AlertEvaluationResult[] = [];

    // Get rules that are due for evaluation
    const rules = await this.db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.isEnabled, true),
          or(
            isNull(alertRules.lastEvaluatedAt),
            lte(
              alertRules.lastEvaluatedAt,
              new Date(
                now.getTime() -
                  sql`${alertRules.evaluationIntervalSeconds} * 1000`
              )
            )
          )
        )
      );

    for (const rule of rules) {
      try {
        const result = await this.evaluateRule(rule);
        results.push(result);

        // Update last evaluated timestamp
        await this.db
          .update(alertRules)
          .set({ lastEvaluatedAt: now })
          .where(eq(alertRules.id, rule.id));

        // If triggered, create incident and send notifications
        if (result.triggered) {
          await this.handleTriggeredRule(rule, result);
        }
      } catch (error) {
        console.error(
          `[AlertingService] Error evaluating rule ${rule.id}:`,
          error
        );
        results.push({
          ruleId: rule.id,
          triggered: false,
          reason: `Evaluation error: ${error}`,
        });
      }
    }

    return results;
  }

  /**
   * Evaluate a single rule.
   */
  async evaluateRule(rule: AlertRule): Promise<AlertEvaluationResult> {
    switch (rule.conditionType) {
      case 'failure_count':
        return this.evaluateFailureCount(rule);

      case 'failure_rate':
        return this.evaluateFailureRate(rule);

      case 'duration_threshold':
        return this.evaluateDurationThreshold(rule);

      case 'queue_backlog':
        return this.evaluateQueueBacklog(rule);

      case 'error_pattern':
        return this.evaluateErrorPattern(rule);

      case 'cost_threshold':
        return this.evaluateCostThreshold(rule);

      case 'custom':
        return this.evaluateCustomCondition(rule);

      default:
        return {
          ruleId: rule.id,
          triggered: false,
          reason: `Unknown condition type: ${rule.conditionType}`,
        };
    }
  }

  // --------------------------------------------------------------------------
  // CONDITION EVALUATORS
  // --------------------------------------------------------------------------

  private async evaluateFailureCount(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as FailureCountCondition;
    const windowStart = new Date(
      Date.now() - config.windowMinutes * 60 * 1000
    );

    const conditions: any[] = [
      eq(executionSearchIndex.status, 'failed'),
      gte(executionSearchIndex.startedAt, windowStart),
    ];

    if (rule.workflowId) {
      conditions.push(eq(executionSearchIndex.workflowId, rule.workflowId));
    }

    const result = await this.db.execute(sql`
      SELECT
        COUNT(*) as failure_count,
        ARRAY_AGG(execution_id ORDER BY started_at DESC LIMIT 5) as sample_ids,
        ARRAY_AGG(DISTINCT error_message) FILTER (WHERE error_message IS NOT NULL) as error_samples
      FROM execution_search_index
      WHERE status = 'failed'
        AND started_at > ${windowStart}
        ${rule.workflowId ? sql`AND workflow_id = ${rule.workflowId}` : sql``}
    `);

    const row = result.rows[0] as any;
    const failureCount = Number(row.failure_count || 0);

    if (failureCount >= config.threshold) {
      return {
        ruleId: rule.id,
        triggered: true,
        reason: `${failureCount} failures in last ${config.windowMinutes} minutes (threshold: ${config.threshold})`,
        context: {
          failureCount,
          windowStart,
          windowEnd: new Date(),
          affectedExecutions: row.sample_ids || [],
          errorSamples: row.error_samples || [],
        },
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  private async evaluateFailureRate(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as FailureRateCondition;
    const windowStart = new Date(
      Date.now() - config.windowMinutes * 60 * 1000
    );

    const result = await this.db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'failed') as failures,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'failed')::numeric /
          NULLIF(COUNT(*), 0), 4
        ) as failure_rate
      FROM execution_search_index
      WHERE started_at > ${windowStart}
        ${rule.workflowId ? sql`AND workflow_id = ${rule.workflowId}` : sql``}
    `);

    const row = result.rows[0] as any;
    const total = Number(row.total || 0);
    const failureRate = parseFloat(row.failure_rate || '0');

    // Check minimum samples requirement
    if (total < config.minSamples) {
      return {
        ruleId: rule.id,
        triggered: false,
        reason: `Insufficient samples (${total} < ${config.minSamples})`,
      };
    }

    if (failureRate >= config.threshold) {
      return {
        ruleId: rule.id,
        triggered: true,
        reason: `Failure rate ${(failureRate * 100).toFixed(1)}% exceeds threshold ${(config.threshold * 100).toFixed(1)}%`,
        context: {
          failureRate,
          failureCount: Number(row.failures || 0),
          totalExecutions: total,
          windowStart,
          windowEnd: new Date(),
        },
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  private async evaluateDurationThreshold(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as DurationThresholdCondition;
    const windowStart = new Date(Date.now() - 10 * 60 * 1000); // Last 10 minutes

    const result = await this.db.execute(sql`
      SELECT
        execution_id,
        workflow_name,
        duration_ms
      FROM execution_search_index
      WHERE duration_ms > ${config.thresholdMs}
        AND started_at > ${windowStart}
        ${rule.workflowId ? sql`AND workflow_id = ${rule.workflowId}` : sql``}
      ORDER BY duration_ms DESC
      LIMIT 5
    `);

    if (result.rows.length > 0) {
      const slowest = result.rows[0] as any;
      return {
        ruleId: rule.id,
        triggered: true,
        reason: `Execution took ${Math.round(slowest.duration_ms / 1000)}s (threshold: ${Math.round(config.thresholdMs / 1000)}s)`,
        context: {
          durationMs: slowest.duration_ms,
          affectedExecutions: result.rows.map((r: any) => r.execution_id),
        },
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  private async evaluateQueueBacklog(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as QueueBacklogCondition;

    // Get latest queue health snapshot
    const [snapshot] = await this.db
      .select()
      .from(queueHealthSnapshots)
      .where(eq(queueHealthSnapshots.queueName, config.queueName))
      .orderBy(desc(queueHealthSnapshots.capturedAt))
      .limit(1);

    if (!snapshot) {
      return {
        ruleId: rule.id,
        triggered: false,
        reason: `No health data for queue: ${config.queueName}`,
      };
    }

    const waitingCount = snapshot.waitingCount || 0;

    if (waitingCount >= config.threshold) {
      return {
        ruleId: rule.id,
        triggered: true,
        reason: `Queue backlog: ${waitingCount} jobs waiting (threshold: ${config.threshold})`,
        context: {
          queueBacklog: waitingCount,
          activeJobs: snapshot.activeCount,
          queueName: config.queueName,
        },
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  private async evaluateErrorPattern(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as ErrorPatternCondition;
    const windowStart = new Date(Date.now() - 60 * 60 * 1000); // Last hour

    const flags = config.caseSensitive ? '' : 'i';

    const result = await this.db.execute(sql`
      SELECT
        execution_id,
        error_message
      FROM execution_search_index
      WHERE status = 'failed'
        AND started_at > ${windowStart}
        AND error_message ~* ${config.regex}
        ${rule.workflowId ? sql`AND workflow_id = ${rule.workflowId}` : sql``}
      ORDER BY started_at DESC
      LIMIT 10
    `);

    if (result.rows.length > 0) {
      return {
        ruleId: rule.id,
        triggered: true,
        reason: `Found ${result.rows.length} executions matching error pattern: ${config.regex}`,
        context: {
          affectedExecutions: result.rows.map((r: any) => r.execution_id),
          errorSamples: result.rows.map((r: any) => r.error_message),
        },
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  private async evaluateCostThreshold(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as CostThresholdCondition;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.db.execute(sql`
      SELECT
        COALESCE(SUM(total_cost_usd::numeric), 0) as daily_cost
      FROM daily_cost_aggregates
      WHERE date = ${today}
        ${rule.workspaceId ? sql`AND workspace_id = ${rule.workspaceId}` : sql``}
    `);

    const row = result.rows[0] as any;
    const dailyCost = parseFloat(row.daily_cost || '0');

    if (dailyCost >= config.dailyBudget) {
      return {
        ruleId: rule.id,
        triggered: true,
        reason: `Daily cost $${dailyCost.toFixed(2)} exceeds budget $${config.dailyBudget.toFixed(2)}`,
        context: {
          dailyCost,
          budget: config.dailyBudget,
          currency: config.currency,
        },
      };
    }

    return { ruleId: rule.id, triggered: false };
  }

  private async evaluateCustomCondition(
    rule: AlertRule
  ): Promise<AlertEvaluationResult> {
    const config = rule.conditionConfig as { sql: string };

    try {
      const result = await this.db.execute(sql.raw(config.sql));
      const triggered = result.rows.length > 0 && (result.rows[0] as any).result;

      return {
        ruleId: rule.id,
        triggered: !!triggered,
        reason: triggered ? 'Custom condition matched' : undefined,
        context: triggered ? { rawResult: result.rows[0] } : undefined,
      };
    } catch (error) {
      return {
        ruleId: rule.id,
        triggered: false,
        reason: `Custom SQL error: ${error}`,
      };
    }
  }

  // --------------------------------------------------------------------------
  // INCIDENT HANDLING
  // --------------------------------------------------------------------------

  private async handleTriggeredRule(
    rule: AlertRule,
    result: AlertEvaluationResult
  ): Promise<void> {
    const now = new Date();

    // Check cooldown period
    if (rule.lastTriggeredAt) {
      const cooldownEnd = new Date(
        rule.lastTriggeredAt.getTime() + (rule.cooldownMinutes || 15) * 60 * 1000
      );

      if (now < cooldownEnd) {
        console.log(
          `[AlertingService] Rule ${rule.id} in cooldown until ${cooldownEnd}`
        );
        return;
      }
    }

    // Create incident
    const [incident] = await this.db
      .insert(alertIncidents)
      .values({
        ruleId: rule.id,
        workflowId: rule.workflowId,
        workspaceId: rule.workspaceId,
        severity: rule.severity || 'warning',
        title: `${rule.name}: ${result.reason}`,
        description: result.reason,
        context: result.context || {},
        triggeredAt: now,
      })
      .returning();

    console.log(
      `[AlertingService] Created incident ${incident.id} for rule ${rule.name}`
    );

    // Update rule last triggered time
    await this.db
      .update(alertRules)
      .set({ lastTriggeredAt: now, updatedAt: now })
      .where(eq(alertRules.id, rule.id));

    // Execute actions
    const actions = (rule.actions as AlertAction[]) || [];
    const actionResults: AlertNotificationResult[] = [];

    for (const action of actions) {
      try {
        const actionResult = await this.executeAction(action, rule, incident);
        actionResults.push(actionResult);
      } catch (error) {
        console.error(
          `[AlertingService] Action ${action.type} failed:`,
          error
        );
        actionResults.push({
          action,
          success: false,
          error: String(error),
        });
      }
    }

    // Update incident with action results
    await this.db
      .update(alertIncidents)
      .set({ actionResults })
      .where(eq(alertIncidents.id, incident.id));
  }

  // --------------------------------------------------------------------------
  // ACTION EXECUTION
  // --------------------------------------------------------------------------

  private async executeAction(
    action: AlertAction,
    rule: AlertRule,
    incident: AlertIncident
  ): Promise<AlertNotificationResult> {
    switch (action.type) {
      case 'slack':
        return this.sendSlackNotification(action, rule, incident);

      case 'email':
        return this.sendEmailNotification(action, rule, incident);

      case 'webhook':
        return this.sendWebhookNotification(action, rule, incident);

      case 'pagerduty':
        return this.sendPagerDutyNotification(action, rule, incident);

      default:
        return {
          action,
          success: false,
          error: `Unknown action type: ${(action as any).type}`,
        };
    }
  }

  private async sendSlackNotification(
    action: AlertAction,
    rule: AlertRule,
    incident: AlertIncident
  ): Promise<AlertNotificationResult> {
    const webhookUrl = process.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      return {
        action,
        success: false,
        error: 'SLACK_WEBHOOK_URL not configured',
      };
    }

    const severityEmoji = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:',
    };

    const payload = {
      channel: action.channel || '#alerts',
      username: 'Flowent Alerting',
      icon_emoji: ':robot_face:',
      attachments: [
        {
          color:
            incident.severity === 'critical'
              ? '#dc2626'
              : incident.severity === 'error'
              ? '#f97316'
              : incident.severity === 'warning'
              ? '#eab308'
              : '#3b82f6',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${severityEmoji[incident.severity || 'warning']} *${incident.title}*`,
              },
            },
            {
              type: 'section',
              fields: [
                {
                  type: 'mrkdwn',
                  text: `*Rule:*\n${rule.name}`,
                },
                {
                  type: 'mrkdwn',
                  text: `*Severity:*\n${incident.severity}`,
                },
              ],
            },
            {
              type: 'context',
              elements: [
                {
                  type: 'mrkdwn',
                  text: `Triggered at ${incident.triggeredAt?.toISOString()}`,
                },
              ],
            },
          ],
        },
      ],
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      return {
        action,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        action,
        success: false,
        error: String(error),
      };
    }
  }

  private async sendEmailNotification(
    action: AlertAction,
    rule: AlertRule,
    incident: AlertIncident
  ): Promise<AlertNotificationResult> {
    // Email implementation would use nodemailer or similar
    // For now, log the intent
    console.log(
      `[AlertingService] Would send email to ${action.recipients?.join(', ')}:`,
      incident.title
    );

    return {
      action,
      success: true,
      responseData: { note: 'Email sending not implemented' },
    };
  }

  private async sendWebhookNotification(
    action: AlertAction,
    rule: AlertRule,
    incident: AlertIncident
  ): Promise<AlertNotificationResult> {
    if (!action.url) {
      return { action, success: false, error: 'No webhook URL specified' };
    }

    try {
      const response = await fetch(action.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'alert.triggered',
          rule: {
            id: rule.id,
            name: rule.name,
            conditionType: rule.conditionType,
          },
          incident: {
            id: incident.id,
            severity: incident.severity,
            title: incident.title,
            description: incident.description,
            context: incident.context,
            triggeredAt: incident.triggeredAt,
          },
        }),
      });

      return {
        action,
        success: response.ok,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return { action, success: false, error: String(error) };
    }
  }

  private async sendPagerDutyNotification(
    action: AlertAction,
    rule: AlertRule,
    incident: AlertIncident
  ): Promise<AlertNotificationResult> {
    if (!action.serviceKey) {
      return { action, success: false, error: 'No PagerDuty service key' };
    }

    const severityMap = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'critical',
    };

    try {
      const response = await fetch(
        'https://events.pagerduty.com/v2/enqueue',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            routing_key: action.serviceKey,
            event_action: 'trigger',
            dedup_key: `flowent-${rule.id}-${incident.id}`,
            payload: {
              summary: incident.title,
              severity: severityMap[incident.severity || 'warning'],
              source: 'Flowent AI Studio',
              custom_details: incident.context,
            },
          }),
        }
      );

      const data = await response.json();

      return {
        action,
        success: response.ok,
        error: response.ok ? undefined : data.message,
        responseData: data,
      };
    } catch (error) {
      return { action, success: false, error: String(error) };
    }
  }

  // --------------------------------------------------------------------------
  // INCIDENT MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get active incidents.
   */
  async getActiveIncidents(
    workspaceId?: string
  ): Promise<AlertIncident[]> {
    const conditions: any[] = [
      inArray(alertIncidents.status, ['active', 'acknowledged']),
    ];

    if (workspaceId) {
      conditions.push(eq(alertIncidents.workspaceId, workspaceId));
    }

    return await this.db
      .select()
      .from(alertIncidents)
      .where(and(...conditions))
      .orderBy(desc(alertIncidents.triggeredAt));
  }

  /**
   * Acknowledge an incident.
   */
  async acknowledgeIncident(
    incidentId: string,
    userId: string
  ): Promise<AlertIncident | null> {
    const [incident] = await this.db
      .update(alertIncidents)
      .set({
        status: 'acknowledged',
        acknowledgedBy: userId,
        acknowledgedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(alertIncidents.id, incidentId))
      .returning();

    return incident || null;
  }

  /**
   * Resolve an incident.
   */
  async resolveIncident(
    incidentId: string,
    userId: string,
    note?: string
  ): Promise<AlertIncident | null> {
    const [incident] = await this.db
      .update(alertIncidents)
      .set({
        status: 'resolved',
        resolvedBy: userId,
        resolvedAt: new Date(),
        resolutionNote: note,
        updatedAt: new Date(),
      })
      .where(eq(alertIncidents.id, incidentId))
      .returning();

    return incident || null;
  }

  /**
   * Silence an incident (stop notifications).
   */
  async silenceIncident(
    incidentId: string,
    durationMinutes: number
  ): Promise<AlertIncident | null> {
    const [incident] = await this.db
      .update(alertIncidents)
      .set({
        status: 'silenced',
        expiresAt: new Date(Date.now() + durationMinutes * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(alertIncidents.id, incidentId))
      .returning();

    return incident || null;
  }

  // --------------------------------------------------------------------------
  // BACKGROUND WORKER
  // --------------------------------------------------------------------------

  /**
   * Start the background evaluation loop.
   */
  start(intervalMs: number = 30000): void {
    if (this.isRunning) {
      console.log('[AlertingService] Already running');
      return;
    }

    this.isRunning = true;
    console.log(
      `[AlertingService] Starting background evaluator (interval: ${intervalMs}ms)`
    );

    this.evaluationInterval = setInterval(async () => {
      try {
        const results = await this.evaluateAllRules();
        const triggered = results.filter((r) => r.triggered);

        if (triggered.length > 0) {
          console.log(
            `[AlertingService] Triggered ${triggered.length} alerts`
          );
        }
      } catch (error) {
        console.error('[AlertingService] Evaluation error:', error);
      }
    }, intervalMs);

    // Run initial evaluation
    this.evaluateAllRules().catch(console.error);
  }

  /**
   * Stop the background evaluation loop.
   */
  stop(): void {
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
      this.evaluationInterval = null;
    }
    this.isRunning = false;
    console.log('[AlertingService] Stopped');
  }

  /**
   * Check if the service is running.
   */
  isActive(): boolean {
    return this.isRunning;
  }

  // --------------------------------------------------------------------------
  // HOOK FOR WORKFLOW ENGINE
  // --------------------------------------------------------------------------

  /**
   * Called by WorkflowExecutionEngine after each execution completes.
   * Performs quick check for failure-based rules.
   */
  async onExecutionComplete(execution: {
    id: string;
    workflowId: string;
    status: string;
    errorMessage?: string;
    durationMs?: number;
  }): Promise<void> {
    // Only check failure-related rules for failed executions
    if (execution.status !== 'failed') return;

    // Get failure_count and error_pattern rules for this workflow
    const rules = await this.db
      .select()
      .from(alertRules)
      .where(
        and(
          eq(alertRules.isEnabled, true),
          or(
            eq(alertRules.workflowId, execution.workflowId),
            isNull(alertRules.workflowId)
          ),
          inArray(alertRules.conditionType, ['failure_count', 'error_pattern'])
        )
      );

    // Evaluate matching rules immediately
    for (const rule of rules) {
      const result = await this.evaluateRule(rule);
      if (result.triggered) {
        await this.handleTriggeredRule(rule, result);
      }
    }
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

let instance: AlertingService | null = null;

export function getAlertingService(): AlertingService {
  if (!instance) {
    instance = new AlertingService();
  }
  return instance;
}

export default AlertingService;
