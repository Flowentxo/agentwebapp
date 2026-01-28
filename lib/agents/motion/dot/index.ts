/**
 * Dot Agent - Recruiter
 * Sources candidates, screens resumes, and coordinates the hiring process
 *
 * Capabilities:
 * - Candidate Sourcing & Boolean Search
 * - Resume Screening & Job Matching
 * - Interview Question Generation
 * - Candidate Outreach
 * - Interview Scheduling
 * - Job Description Creation
 */

// Export types
export * from './types';

// Export agent class and singleton
export { DotAgent, dotAgent, default as DotAgentClass } from './DotAgent';

// Status constants
export const DOT_STATUS = 'active' as const;
export const DOT_PRIORITY = 'medium' as const;
