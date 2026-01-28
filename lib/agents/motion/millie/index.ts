/**
 * Millie Agent - Project Manager
 * Coordinates teams, tracks progress, and ensures projects are delivered on time
 *
 * Capabilities:
 * - Project Planning & Structure
 * - Task Management & Delegation
 * - Progress Tracking & Reporting
 * - Resource Allocation & Capacity Planning
 * - Risk Management
 * - Team Coordination
 */

// Export types
export * from './types';

// Export agent class and singleton
export { MillieAgent, millieAgent, default as MillieAgentClass } from './MillieAgent';

// Status constants (kept for backward compatibility)
export const MILLIE_STATUS = 'active' as const;
export const MILLIE_PRIORITY = 'high' as const;
