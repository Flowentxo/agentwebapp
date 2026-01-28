/**
 * POLICY ENGINE SERVICE
 *
 * Content filtering, guardrails, and compliance enforcement
 */

import { getDb } from '@/lib/db';
import {
  policies,
  policyViolations,
  Policy,
  NewPolicy,
  PolicyViolation,
} from '@/lib/db/schema-rbac';
import { eq, and } from 'drizzle-orm';

// ============================================================
// POLICY TYPES
// ============================================================

export enum PolicyType {
  CONTENT_FILTER = 'content_filter',
  RATE_LIMIT = 'rate_limit',
  DATA_RETENTION = 'data_retention',
  GUARDRAIL = 'guardrail',
  COMPLIANCE = 'compliance',
}

export enum ViolationSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ContentFilterConfig {
  blockedKeywords?: string[];
  blockedPatterns?: string[]; // Regex patterns
  allowedDomains?: string[];
  maxLength?: number;
  requireApproval?: boolean;
  customRules?: Array<{
    name: string;
    pattern: string;
    action: 'block' | 'warn' | 'log';
  }>;
}

export interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  scope: 'user' | 'workspace' | 'global';
  bypassRoles?: string[];
}

export interface GuardrailConfig {
  maxTokens?: number;
  allowedModels?: string[];
  requireApproval?: boolean;
  approvers?: string[];
  costLimit?: {
    amount: number;
    currency: string;
    period: 'day' | 'week' | 'month';
  };
}

export interface PolicyCheckResult {
  allowed: boolean;
  violations: Array<{
    policyId: string;
    policyName: string;
    violationType: string;
    severity: ViolationSeverity;
    message: string;
    blockedContent?: string;
  }>;
  warnings: string[];
}

// ============================================================
// POLICY ENGINE SERVICE
// ============================================================

export class PolicyEngineService {
  private db = getDb();

  /**
   * Create policy
   */
  async createPolicy(policy: {
    name: string;
    type: PolicyType;
    workspaceId?: string;
    config: any;
    actions: string[];
    enabled?: boolean;
    createdBy?: string;
  }): Promise<Policy> {
    const [newPolicy] = await this.db
      .insert(policies)
      .values({
        ...policy,
        enabled: policy.enabled ?? true,
      })
      .returning();

    console.log(`[POLICY_ENGINE] Created policy: ${policy.name} (${policy.type})`);

    return newPolicy;
  }

  /**
   * Get active policies
   */
  async getActivePolicies(
    type?: PolicyType,
    workspaceId?: string
  ): Promise<Policy[]> {
    const conditions = [eq(policies.enabled, true)];

    if (type) {
      conditions.push(eq(policies.type, type));
    }

    if (workspaceId) {
      conditions.push(eq(policies.workspaceId, workspaceId));
    }

    return await this.db
      .select()
      .from(policies)
      .where(and(...conditions));
  }

  /**
   * Check content against content filter policies
   */
  async checkContent(
    content: string,
    workspaceId?: string,
    userId?: string
  ): Promise<PolicyCheckResult> {
    const contentPolicies = await this.getActivePolicies(
      PolicyType.CONTENT_FILTER,
      workspaceId
    );

    const violations: PolicyCheckResult['violations'] = [];
    const warnings: string[] = [];

    for (const policy of contentPolicies) {
      const config = policy.config as ContentFilterConfig;

      // Check blocked keywords
      if (config.blockedKeywords) {
        for (const keyword of config.blockedKeywords) {
          const regex = new RegExp(`\\b${this.escapeRegex(keyword)}\\b`, 'gi');
          if (regex.test(content)) {
            violations.push({
              policyId: policy.id,
              policyName: policy.name,
              violationType: 'blocked_keyword',
              severity: ViolationSeverity.HIGH,
              message: `Content contains blocked keyword: "${keyword}"`,
              blockedContent: keyword,
            });

            // Log violation
            await this.logViolation({
              policyId: policy.id,
              userId,
              workspaceId,
              resource: 'content',
              violationType: 'blocked_keyword',
              severity: ViolationSeverity.HIGH,
              blockedContent: keyword,
              actionTaken: 'blocked',
            });
          }
        }
      }

      // Check blocked patterns
      if (config.blockedPatterns) {
        for (const pattern of config.blockedPatterns) {
          try {
            const regex = new RegExp(pattern, 'gi');
            const matches = content.match(regex);
            if (matches) {
              violations.push({
                policyId: policy.id,
                policyName: policy.name,
                violationType: 'blocked_pattern',
                severity: ViolationSeverity.HIGH,
                message: `Content matches blocked pattern: ${pattern}`,
                blockedContent: matches[0],
              });

              await this.logViolation({
                policyId: policy.id,
                userId,
                workspaceId,
                resource: 'content',
                violationType: 'blocked_pattern',
                severity: ViolationSeverity.HIGH,
                blockedContent: matches[0],
                actionTaken: 'blocked',
              });
            }
          } catch (error) {
            console.error(`[POLICY_ENGINE] Invalid regex pattern: ${pattern}`, error);
          }
        }
      }

      // Check max length
      if (config.maxLength && content.length > config.maxLength) {
        warnings.push(
          `Content exceeds maximum length of ${config.maxLength} characters`
        );
      }

      // Custom rules
      if (config.customRules) {
        for (const rule of config.customRules) {
          try {
            const regex = new RegExp(rule.pattern, 'gi');
            if (regex.test(content)) {
              if (rule.action === 'block') {
                violations.push({
                  policyId: policy.id,
                  policyName: policy.name,
                  violationType: `custom_rule:${rule.name}`,
                  severity: ViolationSeverity.MEDIUM,
                  message: `Custom rule "${rule.name}" triggered`,
                });
              } else if (rule.action === 'warn') {
                warnings.push(`Custom rule "${rule.name}" triggered`);
              }

              if (rule.action !== 'log') {
                await this.logViolation({
                  policyId: policy.id,
                  userId,
                  workspaceId,
                  resource: 'content',
                  violationType: `custom_rule:${rule.name}`,
                  severity: ViolationSeverity.MEDIUM,
                  actionTaken: rule.action,
                });
              }
            }
          } catch (error) {
            console.error(
              `[POLICY_ENGINE] Invalid custom rule pattern: ${rule.pattern}`,
              error
            );
          }
        }
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Check guardrails (AI model usage limits)
   */
  async checkGuardrails(
    options: {
      model?: string;
      tokens?: number;
      userId?: string;
      workspaceId?: string;
    }
  ): Promise<PolicyCheckResult> {
    const { model, tokens, userId, workspaceId } = options;

    const guardrailPolicies = await this.getActivePolicies(
      PolicyType.GUARDRAIL,
      workspaceId
    );

    const violations: PolicyCheckResult['violations'] = [];
    const warnings: string[] = [];

    for (const policy of guardrailPolicies) {
      const config = policy.config as GuardrailConfig;

      // Check max tokens
      if (config.maxTokens && tokens && tokens > config.maxTokens) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          violationType: 'max_tokens_exceeded',
          severity: ViolationSeverity.MEDIUM,
          message: `Request exceeds maximum token limit of ${config.maxTokens}`,
        });

        await this.logViolation({
          policyId: policy.id,
          userId,
          workspaceId,
          resource: 'ai_request',
          violationType: 'max_tokens_exceeded',
          severity: ViolationSeverity.MEDIUM,
          context: { requestedTokens: tokens, maxTokens: config.maxTokens },
          actionTaken: 'blocked',
        });
      }

      // Check allowed models
      if (config.allowedModels && model && !config.allowedModels.includes(model)) {
        violations.push({
          policyId: policy.id,
          policyName: policy.name,
          violationType: 'model_not_allowed',
          severity: ViolationSeverity.HIGH,
          message: `Model "${model}" is not in the allowed list`,
        });

        await this.logViolation({
          policyId: policy.id,
          userId,
          workspaceId,
          resource: 'ai_request',
          violationType: 'model_not_allowed',
          severity: ViolationSeverity.HIGH,
          context: { requestedModel: model, allowedModels: config.allowedModels },
          actionTaken: 'blocked',
        });
      }

      // Approval required
      if (config.requireApproval) {
        warnings.push('This request requires approval from authorized personnel');
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      warnings,
    };
  }

  /**
   * Log policy violation
   */
  async logViolation(violation: {
    policyId: string;
    userId?: string;
    workspaceId?: string;
    resource?: string;
    resourceId?: string;
    violationType: string;
    severity: ViolationSeverity;
    context?: any;
    blockedContent?: string;
    actionTaken?: string;
  }): Promise<PolicyViolation> {
    const [policyViolation] = await this.db
      .insert(policyViolations)
      .values(violation)
      .returning();

    console.log(
      `[POLICY_ENGINE] Violation logged: ${violation.violationType} (${violation.severity})`
    );

    return policyViolation;
  }

  /**
   * Get policy violations
   */
  async getViolations(filters: {
    policyId?: string;
    userId?: string;
    workspaceId?: string;
    severity?: ViolationSeverity;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<PolicyViolation[]> {
    const { policyId, userId, workspaceId, severity, limit = 100 } = filters;

    const conditions = [];

    if (policyId) conditions.push(eq(policyViolations.policyId, policyId));
    if (userId) conditions.push(eq(policyViolations.userId, userId));
    if (workspaceId) conditions.push(eq(policyViolations.workspaceId, workspaceId));
    if (severity) conditions.push(eq(policyViolations.severity, severity));

    return await this.db
      .select()
      .from(policyViolations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(policyViolations.detectedAt)
      .limit(limit);
  }

  /**
   * Update policy
   */
  async updatePolicy(
    policyId: string,
    updates: {
      name?: string;
      enabled?: boolean;
      config?: any;
      actions?: string[];
    }
  ): Promise<Policy> {
    const [updated] = await this.db
      .update(policies)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(policies.id, policyId))
      .returning();

    console.log(`[POLICY_ENGINE] Updated policy: ${policyId}`);

    return updated;
  }

  /**
   * Delete policy
   */
  async deletePolicy(policyId: string): Promise<void> {
    await this.db.delete(policies).where(eq(policies.id, policyId));

    console.log(`[POLICY_ENGINE] Deleted policy: ${policyId}`);
  }

  /**
   * Helper: Escape regex special characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Initialize default policies
   */
  async initializeDefaultPolicies(): Promise<void> {
    console.log('[POLICY_ENGINE] Initializing default policies...');

    const defaultPolicies = [
      {
        name: 'PII Protection',
        type: PolicyType.CONTENT_FILTER,
        config: {
          blockedPatterns: [
            '\\b\\d{3}-\\d{2}-\\d{4}\\b', // SSN
            '\\b\\d{16}\\b', // Credit card
            '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b', // Email (example)
          ],
          blockedKeywords: ['password', 'secret', 'api_key', 'private_key'],
        },
        actions: ['block', 'log', 'notify'],
      },
      {
        name: 'Token Limit',
        type: PolicyType.GUARDRAIL,
        config: {
          maxTokens: 8000,
          allowedModels: ['gpt-5.1', 'gpt-5', 'gpt-4o-mini', 'gpt-4', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'],
        },
        actions: ['block', 'log'],
      },
    ];

    for (const policy of defaultPolicies) {
      try {
        const existing = await this.db
          .select()
          .from(policies)
          .where(eq(policies.name, policy.name))
          .limit(1);

        if (existing.length === 0) {
          await this.createPolicy(policy as any);
        }
      } catch (error) {
        console.error(`[POLICY_ENGINE] Failed to create policy ${policy.name}:`, error);
      }
    }

    console.log('[POLICY_ENGINE] Default policies initialized');
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

export const policyEngineService = new PolicyEngineService();
