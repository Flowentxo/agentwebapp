/**
 * Spec Agent - Competitive Intelligence
 * Monitors competitors, conducts market research, and provides strategic insights
 *
 * Capabilities:
 * - Competitor Monitoring
 * - Market Research
 * - Trend Analysis
 * - SWOT Analysis
 * - Battle Cards
 * - Strategic Reports
 */

// Export types
export * from './types';

// Export agent class and singleton
export { SpecAgent, specAgent, default as SpecAgentClass } from './SpecAgent';

// Status constants
export const SPEC_STATUS = 'active' as const;
export const SPEC_PRIORITY = 'high' as const;
