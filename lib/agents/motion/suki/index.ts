/**
 * Suki Agent - Marketing Associate
 * Creates compelling content, manages campaigns, and drives brand engagement
 *
 * Capabilities:
 * - Content Creation & Writing (Blog, Social, Ads, Email, Landing Pages)
 * - Social Media Management
 * - SEO Optimization & Analytics
 * - Campaign Planning & Scheduling
 * - Brand Voice Development
 * - Marketing Analytics & A/B Testing
 */

// Export types
export * from './types';

// Export agent class and singleton
export { SukiAgent, sukiAgent, default as SukiAgentClass } from './SukiAgent';

// Status constants (kept for backward compatibility)
export const SUKI_STATUS = 'active' as const;
export const SUKI_PRIORITY = 'high' as const;
