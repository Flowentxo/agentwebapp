/**
 * PHASE 61-65: Automation Rules Engine
 * Event-driven automation rule processing
 */

import { publishAgentEvent } from '@/lib/events/EventBus';

// ============================================
// TYPES
// ============================================

export interface AutomationRule {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: RuleTrigger;
  conditions: RuleCondition[];
  actions: RuleAction[];
  cooldown?: number;
  maxExecutionsPerHour?: number;
  priority: number;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    lastTriggered?: Date;
    executionCount: number;
    lastError?: string;
  };
}

export interface RuleTrigger {
  type: TriggerType;
  config: Record<string, unknown>;
  filters?: Array<{
    field: string;
    operator: ConditionOperator;
    value: unknown;
  }>;
}

export type TriggerType =
  | 'event'
  | 'webhook'
  | 'schedule'
  | 'data_change'
  | 'threshold'
  | 'pattern'
  | 'manual';

export interface RuleCondition {
  id: string;
  field: string;
  operator: ConditionOperator;
  value: unknown;
  logic?: 'and' | 'or';
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_equal'
  | 'less_equal'
  | 'in'
  | 'not_in'
  | 'is_empty'
  | 'is_not_empty'
  | 'matches_regex';

export interface RuleAction {
  id: string;
  type: ActionType;
  config: Record<string, unknown>;
  delay?: number;
  retryOnFailure?: boolean;
  maxRetries?: number;
}

export type ActionType =
  | 'send_email'
  | 'send_notification'
  | 'call_webhook'
  | 'update_record'
  | 'create_record'
  | 'delete_record'
  | 'trigger_workflow'
  | 'assign_task'
  | 'send_slack'
  | 'call_agent'
  | 'run_script'
  | 'set_variable';

export interface RuleExecutionResult {
  ruleId: string;
  triggered: boolean;
  conditionsMet: boolean;
  actionsExecuted: number;
  actionResults: Array<{
    actionId: string;
    success: boolean;
    result?: unknown;
    error?: string;
  }>;
  duration: number;
  timestamp: Date;
}

export interface IncomingEvent {
  type: string;
  source: string;
  data: Record<string, unknown>;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface RuleStats {
  ruleId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  avgExecutionTime: number;
  lastExecution?: Date;
  executionsByDay: Array<{ date: string; count: number }>;
}

// ============================================
// AUTOMATION RULES ENGINE
// ============================================

export class AutomationRulesEngine {
  private rules: Map<string, AutomationRule> = new Map();
  private executionHistory: Map<string, RuleExecutionResult[]> = new Map();
  private cooldowns: Map<string, Date> = new Map();
  private hourlyExecutions: Map<string, number[]> = new Map();

  constructor() {
    this.loadDemoRules();
  }

  // ============================================
  // RULE MANAGEMENT
  // ============================================

  /**
   * Create a new automation rule
   */
  public createRule(
    workspaceId: string,
    data: {
      name: string;
      description?: string;
      trigger: RuleTrigger;
      conditions?: RuleCondition[];
      actions: RuleAction[];
      priority?: number;
      cooldown?: number;
      maxExecutionsPerHour?: number;
      createdBy: string;
    }
  ): AutomationRule {
    const rule: AutomationRule = {
      id: `rule-${crypto.randomUUID().slice(0, 8)}`,
      workspaceId,
      name: data.name,
      description: data.description || '',
      enabled: true,
      trigger: data.trigger,
      conditions: data.conditions || [],
      actions: data.actions.map((a, i) => ({
        ...a,
        id: a.id || `action-${i + 1}`,
      })),
      cooldown: data.cooldown,
      maxExecutionsPerHour: data.maxExecutionsPerHour,
      priority: data.priority || 0,
      metadata: {
        createdBy: data.createdBy,
        createdAt: new Date(),
        updatedAt: new Date(),
        executionCount: 0,
      },
    };

    this.rules.set(rule.id, rule);
    this.executionHistory.set(rule.id, []);

    return rule;
  }

  /**
   * Update an existing rule
   */
  public updateRule(
    ruleId: string,
    updates: Partial<Omit<AutomationRule, 'id' | 'workspaceId' | 'metadata'>>
  ): AutomationRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const updatedRule: AutomationRule = {
      ...rule,
      ...updates,
      metadata: {
        ...rule.metadata,
        updatedAt: new Date(),
      },
    };

    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * Delete a rule
   */
  public deleteRule(ruleId: string): boolean {
    this.executionHistory.delete(ruleId);
    this.cooldowns.delete(ruleId);
    this.hourlyExecutions.delete(ruleId);
    return this.rules.delete(ruleId);
  }

  /**
   * Get rule by ID
   */
  public getRule(ruleId: string): AutomationRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * List rules for workspace
   */
  public listRules(workspaceId: string, options?: {
    enabled?: boolean;
    triggerType?: TriggerType;
  }): AutomationRule[] {
    let rules = Array.from(this.rules.values()).filter(
      (r) => r.workspaceId === workspaceId
    );

    if (options?.enabled !== undefined) {
      rules = rules.filter((r) => r.enabled === options.enabled);
    }

    if (options?.triggerType) {
      rules = rules.filter((r) => r.trigger.type === options.triggerType);
    }

    return rules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Enable/disable rule
   */
  public setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.rules.get(ruleId);
    if (!rule) return false;

    rule.enabled = enabled;
    rule.metadata.updatedAt = new Date();
    return true;
  }

  // ============================================
  // EVENT PROCESSING
  // ============================================

  /**
   * Process incoming event against all rules
   */
  public async processEvent(
    workspaceId: string,
    event: IncomingEvent
  ): Promise<RuleExecutionResult[]> {
    const results: RuleExecutionResult[] = [];
    const rules = this.listRules(workspaceId, { enabled: true });

    for (const rule of rules) {
      // Check if rule matches event type
      if (!this.matchesTrigger(rule.trigger, event)) {
        continue;
      }

      // Check cooldown
      if (this.isInCooldown(rule.id)) {
        continue;
      }

      // Check rate limit
      if (this.isRateLimited(rule.id, rule.maxExecutionsPerHour)) {
        continue;
      }

      // Execute rule
      const result = await this.executeRule(rule, event);
      results.push(result);

      // Update cooldown
      if (rule.cooldown && result.triggered) {
        this.setCooldown(rule.id, rule.cooldown);
      }

      // Track execution for rate limiting
      if (result.triggered) {
        this.trackExecution(rule.id);
      }
    }

    return results;
  }

  /**
   * Execute a specific rule
   */
  public async executeRule(
    rule: AutomationRule,
    event: IncomingEvent
  ): Promise<RuleExecutionResult> {
    const startTime = Date.now();

    const result: RuleExecutionResult = {
      ruleId: rule.id,
      triggered: false,
      conditionsMet: false,
      actionsExecuted: 0,
      actionResults: [],
      duration: 0,
      timestamp: new Date(),
    };

    try {
      // Evaluate conditions
      if (!this.evaluateConditions(rule.conditions, event.data)) {
        result.conditionsMet = false;
        result.duration = Date.now() - startTime;
        return result;
      }

      result.conditionsMet = true;
      result.triggered = true;

      // Execute actions
      for (const action of rule.actions) {
        const actionResult = await this.executeAction(action, event.data);
        result.actionResults.push(actionResult);

        if (actionResult.success) {
          result.actionsExecuted++;
        }

        // Stop if action failed and not retrying
        if (!actionResult.success && !action.retryOnFailure) {
          break;
        }
      }

      // Update rule metadata
      rule.metadata.lastTriggered = new Date();
      rule.metadata.executionCount++;

      // Store in history
      this.storeExecutionResult(rule.id, result);

      // Emit event
      await publishAgentEvent(
        'automation.executed',
        { agentId: 'aura', workspaceId: rule.workspaceId },
        { ruleId: rule.id, result }
      );
    } catch (error) {
      rule.metadata.lastError = error instanceof Error ? error.message : 'Unknown error';
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Test a rule without executing actions
   */
  public testRule(
    rule: AutomationRule,
    testEvent: IncomingEvent
  ): {
    wouldTrigger: boolean;
    triggerMatch: boolean;
    conditionsResult: Array<{
      conditionId: string;
      field: string;
      result: boolean;
      reason: string;
    }>;
    actionsToExecute: string[];
  } {
    const triggerMatch = this.matchesTrigger(rule.trigger, testEvent);

    const conditionsResult = rule.conditions.map((condition) => {
      const result = this.evaluateCondition(condition, testEvent.data);
      return {
        conditionId: condition.id,
        field: condition.field,
        result,
        reason: result
          ? 'Condition met'
          : `${condition.field} ${condition.operator} ${condition.value} is false`,
      };
    });

    const allConditionsMet = conditionsResult.every((c) => c.result);

    return {
      wouldTrigger: triggerMatch && allConditionsMet,
      triggerMatch,
      conditionsResult,
      actionsToExecute: rule.actions.map((a) => a.type),
    };
  }

  // ============================================
  // ANALYTICS
  // ============================================

  /**
   * Get rule statistics
   */
  public getRuleStats(ruleId: string, days: number = 30): RuleStats | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;

    const history = this.executionHistory.get(ruleId) || [];
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const recentHistory = history.filter((h) => h.timestamp >= cutoff);

    const successfulExecutions = recentHistory.filter(
      (h) => h.triggered && h.actionsExecuted === h.actionResults.length
    ).length;

    const failedExecutions = recentHistory.filter(
      (h) => h.triggered && h.actionsExecuted < h.actionResults.length
    ).length;

    const avgExecutionTime =
      recentHistory.length > 0
        ? recentHistory.reduce((sum, h) => sum + h.duration, 0) / recentHistory.length
        : 0;

    // Group by day
    const byDay = new Map<string, number>();
    for (const exec of recentHistory) {
      const day = exec.timestamp.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) || 0) + 1);
    }

    return {
      ruleId,
      totalExecutions: recentHistory.length,
      successfulExecutions,
      failedExecutions,
      avgExecutionTime,
      lastExecution: recentHistory[recentHistory.length - 1]?.timestamp,
      executionsByDay: Array.from(byDay.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /**
   * Get overall automation stats for workspace
   */
  public getWorkspaceStats(workspaceId: string): {
    totalRules: number;
    enabledRules: number;
    totalExecutions: number;
    successRate: number;
    topRules: Array<{ id: string; name: string; executions: number }>;
    byTriggerType: Record<string, number>;
  } {
    const rules = this.listRules(workspaceId);
    const enabledRules = rules.filter((r) => r.enabled);

    let totalExecutions = 0;
    let successfulExecutions = 0;

    const ruleExecutions: Array<{ id: string; name: string; executions: number }> = [];
    const byTriggerType: Record<string, number> = {};

    for (const rule of rules) {
      const history = this.executionHistory.get(rule.id) || [];
      totalExecutions += history.length;
      successfulExecutions += history.filter(
        (h) => h.triggered && h.actionsExecuted === h.actionResults.length
      ).length;

      ruleExecutions.push({
        id: rule.id,
        name: rule.name,
        executions: history.length,
      });

      byTriggerType[rule.trigger.type] = (byTriggerType[rule.trigger.type] || 0) + 1;
    }

    return {
      totalRules: rules.length,
      enabledRules: enabledRules.length,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      topRules: ruleExecutions.sort((a, b) => b.executions - a.executions).slice(0, 5),
      byTriggerType,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private matchesTrigger(trigger: RuleTrigger, event: IncomingEvent): boolean {
    // Check trigger type
    if (trigger.type === 'event') {
      const eventType = trigger.config.eventType as string;
      if (eventType && eventType !== '*' && eventType !== event.type) {
        return false;
      }
    }

    // Check trigger filters
    if (trigger.filters) {
      for (const filter of trigger.filters) {
        const value = this.getNestedValue(event.data, filter.field);
        if (!this.evaluateOperator(filter.operator, value, filter.value)) {
          return false;
        }
      }
    }

    return true;
  }

  private evaluateConditions(
    conditions: RuleCondition[],
    data: Record<string, unknown>
  ): boolean {
    if (conditions.length === 0) return true;

    let result = true;
    let currentLogic: 'and' | 'or' = 'and';

    for (const condition of conditions) {
      const conditionResult = this.evaluateCondition(condition, data);

      if (currentLogic === 'and') {
        result = result && conditionResult;
      } else {
        result = result || conditionResult;
      }

      currentLogic = condition.logic || 'and';
    }

    return result;
  }

  private evaluateCondition(
    condition: RuleCondition,
    data: Record<string, unknown>
  ): boolean {
    const value = this.getNestedValue(data, condition.field);
    return this.evaluateOperator(condition.operator, value, condition.value);
  }

  private evaluateOperator(
    operator: ConditionOperator,
    actual: unknown,
    expected: unknown
  ): boolean {
    switch (operator) {
      case 'equals':
        return actual === expected;
      case 'not_equals':
        return actual !== expected;
      case 'contains':
        return String(actual).includes(String(expected));
      case 'not_contains':
        return !String(actual).includes(String(expected));
      case 'starts_with':
        return String(actual).startsWith(String(expected));
      case 'ends_with':
        return String(actual).endsWith(String(expected));
      case 'greater_than':
        return Number(actual) > Number(expected);
      case 'less_than':
        return Number(actual) < Number(expected);
      case 'greater_equal':
        return Number(actual) >= Number(expected);
      case 'less_equal':
        return Number(actual) <= Number(expected);
      case 'in':
        return Array.isArray(expected) && expected.includes(actual);
      case 'not_in':
        return Array.isArray(expected) && !expected.includes(actual);
      case 'is_empty':
        return actual === null || actual === undefined || actual === '' ||
               (Array.isArray(actual) && actual.length === 0);
      case 'is_not_empty':
        return actual !== null && actual !== undefined && actual !== '' &&
               (!Array.isArray(actual) || actual.length > 0);
      case 'matches_regex':
        try {
          return new RegExp(String(expected)).test(String(actual));
        } catch {
          return false;
        }
      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private async executeAction(
    action: RuleAction,
    data: Record<string, unknown>
  ): Promise<{ actionId: string; success: boolean; result?: unknown; error?: string }> {
    try {
      // Add delay if specified
      if (action.delay) {
        await new Promise((resolve) => setTimeout(resolve, action.delay));
      }

      let result: unknown;

      switch (action.type) {
        case 'send_email':
          result = await this.sendEmail(action.config, data);
          break;
        case 'send_notification':
          result = await this.sendNotification(action.config, data);
          break;
        case 'call_webhook':
          result = await this.callWebhook(action.config, data);
          break;
        case 'update_record':
          result = await this.updateRecord(action.config, data);
          break;
        case 'create_record':
          result = await this.createRecord(action.config, data);
          break;
        case 'trigger_workflow':
          result = await this.triggerWorkflow(action.config, data);
          break;
        case 'send_slack':
          result = await this.sendSlack(action.config, data);
          break;
        case 'call_agent':
          result = await this.callAgent(action.config, data);
          break;
        case 'set_variable':
          result = this.setVariable(action.config, data);
          break;
        default:
          result = { executed: true, type: action.type };
      }

      return { actionId: action.id, success: true, result };
    } catch (error) {
      return {
        actionId: action.id,
        success: false,
        error: error instanceof Error ? error.message : 'Action failed',
      };
    }
  }

  // Action implementations (simulated)
  private async sendEmail(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(100);
    return {
      sent: true,
      to: this.interpolate(config.to as string, data),
      subject: this.interpolate(config.subject as string, data),
    };
  }

  private async sendNotification(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(50);
    return {
      sent: true,
      channel: config.channel,
      message: this.interpolate(config.message as string, data),
    };
  }

  private async callWebhook(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(150);
    return {
      called: true,
      url: config.url,
      status: 200,
    };
  }

  private async updateRecord(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(50);
    return {
      updated: true,
      recordType: config.recordType,
      recordId: config.recordId,
    };
  }

  private async createRecord(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(50);
    return {
      created: true,
      recordType: config.recordType,
      recordId: `rec-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  private async triggerWorkflow(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(100);
    return {
      triggered: true,
      workflowId: config.workflowId,
      executionId: `exec-${crypto.randomUUID().slice(0, 8)}`,
    };
  }

  private async sendSlack(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(100);
    return {
      sent: true,
      channel: config.channel,
      message: this.interpolate(config.message as string, data),
    };
  }

  private async callAgent(config: Record<string, unknown>, data: Record<string, unknown>): Promise<unknown> {
    await this.delay(200);
    return {
      called: true,
      agentId: config.agentId,
      response: 'Agent task completed',
    };
  }

  private setVariable(config: Record<string, unknown>, data: Record<string, unknown>): unknown {
    return {
      set: true,
      variable: config.name,
      value: this.interpolate(String(config.value), data),
    };
  }

  private interpolate(template: string, data: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(data, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private isInCooldown(ruleId: string): boolean {
    const cooldownUntil = this.cooldowns.get(ruleId);
    if (!cooldownUntil) return false;
    return new Date() < cooldownUntil;
  }

  private setCooldown(ruleId: string, seconds: number): void {
    this.cooldowns.set(ruleId, new Date(Date.now() + seconds * 1000));
  }

  private isRateLimited(ruleId: string, maxPerHour?: number): boolean {
    if (!maxPerHour) return false;

    const executions = this.hourlyExecutions.get(ruleId) || [];
    const hourAgo = Date.now() - 3600000;
    const recentExecutions = executions.filter((t) => t > hourAgo);

    return recentExecutions.length >= maxPerHour;
  }

  private trackExecution(ruleId: string): void {
    const executions = this.hourlyExecutions.get(ruleId) || [];
    executions.push(Date.now());

    // Keep only last hour
    const hourAgo = Date.now() - 3600000;
    const recentExecutions = executions.filter((t) => t > hourAgo);
    this.hourlyExecutions.set(ruleId, recentExecutions);
  }

  private storeExecutionResult(ruleId: string, result: RuleExecutionResult): void {
    const history = this.executionHistory.get(ruleId) || [];
    history.push(result);

    // Keep only last 1000 executions
    if (history.length > 1000) {
      history.shift();
    }

    this.executionHistory.set(ruleId, history);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private loadDemoRules(): void {
    // Load some demo rules
    const demoRules: Omit<AutomationRule, 'id'>[] = [
      {
        workspaceId: 'default',
        name: 'New Lead Assignment',
        description: 'Automatically assign new leads to sales reps',
        enabled: true,
        trigger: {
          type: 'event',
          config: { eventType: 'lead.created' },
        },
        conditions: [
          {
            id: 'c1',
            field: 'data.source',
            operator: 'equals',
            value: 'website',
          },
        ],
        actions: [
          {
            id: 'a1',
            type: 'update_record',
            config: {
              recordType: 'lead',
              recordId: '{{data.id}}',
              updates: { assignee: 'auto-assigned' },
            },
          },
          {
            id: 'a2',
            type: 'send_notification',
            config: {
              channel: 'sales',
              message: 'New lead assigned: {{data.name}}',
            },
          },
        ],
        priority: 10,
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        },
      },
      {
        workspaceId: 'default',
        name: 'High-Value Deal Alert',
        description: 'Alert when deal value exceeds threshold',
        enabled: true,
        trigger: {
          type: 'event',
          config: { eventType: 'deal.updated' },
        },
        conditions: [
          {
            id: 'c1',
            field: 'data.value',
            operator: 'greater_than',
            value: 50000,
          },
        ],
        actions: [
          {
            id: 'a1',
            type: 'send_slack',
            config: {
              channel: '#sales-wins',
              message: '🎉 High-value deal: {{data.name}} - ${{data.value}}',
            },
          },
        ],
        priority: 20,
        metadata: {
          createdBy: 'system',
          createdAt: new Date(),
          updatedAt: new Date(),
          executionCount: 0,
        },
      },
    ];

    for (const rule of demoRules) {
      const fullRule: AutomationRule = {
        ...rule,
        id: `rule-${crypto.randomUUID().slice(0, 8)}`,
      };
      this.rules.set(fullRule.id, fullRule);
      this.executionHistory.set(fullRule.id, []);
    }
  }
}

// Export singleton
export const automationRulesEngine = new AutomationRulesEngine();
