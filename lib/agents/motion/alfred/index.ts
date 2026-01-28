/**
 * Alfred Agent Exports
 * Executive Assistant AI Agent
 *
 * ENTERPRISE VERSION - All tools use real AI processing
 */

export { AlfredAgent, alfredAgent } from './AlfredAgent';
export {
  alfredEnterpriseTools,
  getAllAlfredEnterpriseTools,
  // Individual tool exports for customization
  createEnterpriseDraftEmailTool,
  createEnterpriseSummarizeEmailsTool,
  createEnterpriseSuggestEmailResponseTool,
  createEnterpriseDraftFollowUpTool,
  createEnterpriseScheduleMeetingTool,
  createEnterpriseOptimizeCalendarTool,
  createEnterpriseFindAvailableSlotsTool,
  createEnterprisePrioritizeTasksTool,
  createEnterpriseDailyBriefingTool,
  createEnterprisePrepareMeetingTool,
  createEnterpriseSummarizeMeetingTool,
  createEnterpriseMeetingAgendaTool,
} from './AlfredEnterpriseTools';
export default AlfredAgent;
