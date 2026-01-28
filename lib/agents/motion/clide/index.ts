/**
 * Clide Agent - Client Success Manager
 * Manages client relationships, monitors health, and drives retention
 *
 * Capabilities:
 * - Client Onboarding
 * - Health Score Monitoring
 * - Churn Prevention
 * - Upsell Identification
 * - Customer Feedback Analysis
 * - Success Metrics Tracking
 */

// Export types
export * from './types';

// Export agent class and singleton
export { ClideAgent, clideAgent, default as ClideAgentClass } from './ClideAgent';

// Status constants
export const CLIDE_STATUS = 'active' as const;
export const CLIDE_PRIORITY = 'high' as const;
