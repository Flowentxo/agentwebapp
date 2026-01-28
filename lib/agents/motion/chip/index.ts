/**
 * Chip Agent - Sales Development Rep
 * Researches prospects, crafts outreach messages, and builds the sales pipeline
 *
 * Capabilities:
 * - Lead Research & Enrichment
 * - Cold Outreach (Email, LinkedIn)
 * - Follow-up Sequences
 * - CRM Management
 * - Pipeline Analysis
 * - Sales Reporting
 */

// Export types
export * from './types';

// Export agent class and singleton
export { ChipAgent, chipAgent, default as ChipAgentClass } from './ChipAgent';

// Status constants
export const CHIP_STATUS = 'active' as const;
export const CHIP_PRIORITY = 'medium' as const;
