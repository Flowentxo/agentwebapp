/**
 * FEATURE FLAGS SYSTEM
 *
 * Phase 22: Production GTM Readiness
 *
 * Server-side feature flag management for controlled rollout of features.
 * Supports workspace-level, user-level, and global feature toggles.
 *
 * @version 1.0.0
 */

// =====================================================
// FEATURE FLAG DEFINITIONS
// =====================================================

/**
 * All available feature flags in the system.
 * Add new flags here as the platform evolves.
 */
export const FEATURE_FLAGS = {
  // Flight Recorder (Time-Travel Debugging)
  ENABLE_FLIGHT_RECORDER: 'ENABLE_FLIGHT_RECORDER',

  // Approval Center (HITL System)
  ENABLE_APPROVAL_CENTER: 'ENABLE_APPROVAL_CENTER',

  // Advanced Metrics Dashboard
  ENABLE_ADVANCED_METRICS: 'ENABLE_ADVANCED_METRICS',

  // AI Model Selection (GPT-4, Claude, etc.)
  ENABLE_MODEL_SELECTION: 'ENABLE_MODEL_SELECTION',

  // Real-time Collaboration
  ENABLE_REALTIME_COLLAB: 'ENABLE_REALTIME_COLLAB',

  // Template Marketplace
  ENABLE_MARKETPLACE: 'ENABLE_MARKETPLACE',

  // Custom Tool Builder
  ENABLE_CUSTOM_TOOLS: 'ENABLE_CUSTOM_TOOLS',

  // Webhook Triggers
  ENABLE_WEBHOOKS: 'ENABLE_WEBHOOKS',

  // Version Control (Pipeline Versioning)
  ENABLE_VERSION_CONTROL: 'ENABLE_VERSION_CONTROL',

  // Budget Guard (Cost Controls)
  ENABLE_BUDGET_GUARD: 'ENABLE_BUDGET_GUARD',

  // Side-by-Side Inspector
  ENABLE_SIDE_BY_SIDE_INSPECTOR: 'ENABLE_SIDE_BY_SIDE_INSPECTOR',

  // Data Context Panel
  ENABLE_DATA_CONTEXT_PANEL: 'ENABLE_DATA_CONTEXT_PANEL',

  // Enterprise SSO
  ENABLE_ENTERPRISE_SSO: 'ENABLE_ENTERPRISE_SSO',

  // API Key Management
  ENABLE_API_KEY_MANAGEMENT: 'ENABLE_API_KEY_MANAGEMENT',
} as const;

export type FeatureFlag = typeof FEATURE_FLAGS[keyof typeof FEATURE_FLAGS];

// =====================================================
// DEFAULT FLAG VALUES
// =====================================================

/**
 * Default values for feature flags.
 * These apply when no specific override exists.
 */
const DEFAULT_FLAGS: Record<FeatureFlag, boolean> = {
  [FEATURE_FLAGS.ENABLE_FLIGHT_RECORDER]: true,
  [FEATURE_FLAGS.ENABLE_APPROVAL_CENTER]: true,
  [FEATURE_FLAGS.ENABLE_ADVANCED_METRICS]: true,
  [FEATURE_FLAGS.ENABLE_MODEL_SELECTION]: true,
  [FEATURE_FLAGS.ENABLE_REALTIME_COLLAB]: false, // Beta
  [FEATURE_FLAGS.ENABLE_MARKETPLACE]: true,
  [FEATURE_FLAGS.ENABLE_CUSTOM_TOOLS]: true,
  [FEATURE_FLAGS.ENABLE_WEBHOOKS]: true,
  [FEATURE_FLAGS.ENABLE_VERSION_CONTROL]: true,
  [FEATURE_FLAGS.ENABLE_BUDGET_GUARD]: true,
  [FEATURE_FLAGS.ENABLE_SIDE_BY_SIDE_INSPECTOR]: true,
  [FEATURE_FLAGS.ENABLE_DATA_CONTEXT_PANEL]: true,
  [FEATURE_FLAGS.ENABLE_ENTERPRISE_SSO]: false, // Enterprise only
  [FEATURE_FLAGS.ENABLE_API_KEY_MANAGEMENT]: true,
};

// =====================================================
// ENVIRONMENT OVERRIDES
// =====================================================

/**
 * Get flag value from environment variable.
 * Environment variables take precedence over defaults.
 *
 * Convention: FEATURE_FLAG_<FLAG_NAME>=true|false
 */
function getEnvOverride(flag: FeatureFlag): boolean | null {
  const envKey = `FEATURE_FLAG_${flag}`;
  const envValue = process.env[envKey];

  if (envValue === undefined || envValue === '') {
    return null;
  }

  return envValue.toLowerCase() === 'true' || envValue === '1';
}

// =====================================================
// WORKSPACE OVERRIDES (In-Memory Cache)
// =====================================================

/**
 * In-memory cache for workspace-specific flag overrides.
 * In production, this would be backed by Redis or database.
 */
const workspaceOverrides: Map<string, Map<FeatureFlag, boolean>> = new Map();

/**
 * Set a workspace-specific flag override.
 */
export function setWorkspaceFlag(
  workspaceId: string,
  flag: FeatureFlag,
  enabled: boolean
): void {
  if (!workspaceOverrides.has(workspaceId)) {
    workspaceOverrides.set(workspaceId, new Map());
  }
  workspaceOverrides.get(workspaceId)!.set(flag, enabled);
}

/**
 * Remove a workspace-specific flag override.
 */
export function removeWorkspaceFlag(workspaceId: string, flag: FeatureFlag): void {
  workspaceOverrides.get(workspaceId)?.delete(flag);
}

/**
 * Clear all overrides for a workspace.
 */
export function clearWorkspaceFlags(workspaceId: string): void {
  workspaceOverrides.delete(workspaceId);
}

// =====================================================
// USER OVERRIDES (Beta/Alpha Access)
// =====================================================

const userOverrides: Map<string, Map<FeatureFlag, boolean>> = new Map();

/**
 * Grant a user access to a beta feature.
 */
export function setUserFlag(userId: string, flag: FeatureFlag, enabled: boolean): void {
  if (!userOverrides.has(userId)) {
    userOverrides.set(userId, new Map());
  }
  userOverrides.get(userId)!.set(flag, enabled);
}

/**
 * Remove a user-specific flag override.
 */
export function removeUserFlag(userId: string, flag: FeatureFlag): void {
  userOverrides.get(userId)?.delete(flag);
}

// =====================================================
// MAIN API
// =====================================================

export interface FeatureFlagContext {
  workspaceId?: string;
  userId?: string;
  plan?: 'free' | 'pro' | 'enterprise';
}

/**
 * Check if a feature is enabled for a given context.
 *
 * Resolution order (first match wins):
 * 1. User-specific override
 * 2. Workspace-specific override
 * 3. Environment variable override
 * 4. Plan-based access (enterprise features)
 * 5. Default value
 *
 * @example
 * ```ts
 * if (isFeatureEnabled('ENABLE_FLIGHT_RECORDER', { workspaceId: 'ws-123' })) {
 *   // Show Flight Recorder UI
 * }
 * ```
 */
export function isFeatureEnabled(
  flag: FeatureFlag,
  context: FeatureFlagContext = {}
): boolean {
  const { workspaceId, userId, plan } = context;

  // 1. Check user-specific override (for beta access)
  if (userId && userOverrides.has(userId)) {
    const userValue = userOverrides.get(userId)!.get(flag);
    if (userValue !== undefined) {
      return userValue;
    }
  }

  // 2. Check workspace-specific override
  if (workspaceId && workspaceOverrides.has(workspaceId)) {
    const workspaceValue = workspaceOverrides.get(workspaceId)!.get(flag);
    if (workspaceValue !== undefined) {
      return workspaceValue;
    }
  }

  // 3. Check environment variable override
  const envOverride = getEnvOverride(flag);
  if (envOverride !== null) {
    return envOverride;
  }

  // 4. Plan-based access (enterprise features)
  if (isEnterpriseOnlyFeature(flag) && plan !== 'enterprise') {
    return false;
  }

  // 5. Return default value
  return DEFAULT_FLAGS[flag] ?? false;
}

/**
 * Check if a feature is an enterprise-only feature.
 */
function isEnterpriseOnlyFeature(flag: FeatureFlag): boolean {
  const enterpriseFlags: FeatureFlag[] = [
    FEATURE_FLAGS.ENABLE_ENTERPRISE_SSO,
    FEATURE_FLAGS.ENABLE_REALTIME_COLLAB,
  ];
  return enterpriseFlags.includes(flag);
}

/**
 * Get all enabled features for a context.
 *
 * @example
 * ```ts
 * const features = getEnabledFeatures({ workspaceId: 'ws-123', plan: 'pro' });
 * // ['ENABLE_FLIGHT_RECORDER', 'ENABLE_APPROVAL_CENTER', ...]
 * ```
 */
export function getEnabledFeatures(context: FeatureFlagContext = {}): FeatureFlag[] {
  return Object.values(FEATURE_FLAGS).filter((flag) =>
    isFeatureEnabled(flag, context)
  );
}

/**
 * Get all feature flags with their current values for a context.
 *
 * @example
 * ```ts
 * const flags = getAllFlags({ workspaceId: 'ws-123' });
 * // { ENABLE_FLIGHT_RECORDER: true, ENABLE_ENTERPRISE_SSO: false, ... }
 * ```
 */
export function getAllFlags(
  context: FeatureFlagContext = {}
): Record<FeatureFlag, boolean> {
  const result: Partial<Record<FeatureFlag, boolean>> = {};

  for (const flag of Object.values(FEATURE_FLAGS)) {
    result[flag] = isFeatureEnabled(flag, context);
  }

  return result as Record<FeatureFlag, boolean>;
}

// =====================================================
// REACT HOOK SUPPORT (Client-Side)
// =====================================================

/**
 * Serialize flags for client-side hydration.
 * Call this in getServerSideProps or API routes.
 */
export function serializeFlags(context: FeatureFlagContext = {}): string {
  return JSON.stringify(getAllFlags(context));
}

/**
 * Deserialize flags on the client.
 */
export function deserializeFlags(serialized: string): Record<FeatureFlag, boolean> {
  try {
    return JSON.parse(serialized);
  } catch {
    return {} as Record<FeatureFlag, boolean>;
  }
}

// =====================================================
// ADMIN UTILITIES
// =====================================================

/**
 * Bulk set flags for multiple workspaces.
 * Useful for rollouts or rollbacks.
 */
export function bulkSetWorkspaceFlags(
  workspaceIds: string[],
  flags: Partial<Record<FeatureFlag, boolean>>
): void {
  for (const workspaceId of workspaceIds) {
    for (const [flag, enabled] of Object.entries(flags)) {
      setWorkspaceFlag(workspaceId, flag as FeatureFlag, enabled);
    }
  }
}

/**
 * Get statistics about flag usage.
 */
export function getFlagStats(): {
  totalFlags: number;
  workspacesWithOverrides: number;
  usersWithOverrides: number;
} {
  return {
    totalFlags: Object.keys(FEATURE_FLAGS).length,
    workspacesWithOverrides: workspaceOverrides.size,
    usersWithOverrides: userOverrides.size,
  };
}

// =====================================================
// EXPORTS
// =====================================================

export default {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getEnabledFeatures,
  getAllFlags,
  setWorkspaceFlag,
  removeWorkspaceFlag,
  clearWorkspaceFlags,
  setUserFlag,
  removeUserFlag,
  serializeFlags,
  deserializeFlags,
  bulkSetWorkspaceFlags,
  getFlagStats,
};
