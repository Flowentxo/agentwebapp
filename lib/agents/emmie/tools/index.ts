/**
 * Emmie Tools - Index
 *
 * Exports all Emmie Gmail tools and utilities
 */

// Tool definitions - Single email operations
export {
  GMAIL_SEARCH_TOOL,
  GMAIL_READ_TOOL,
  GMAIL_SEND_TOOL,
  GMAIL_REPLY_TOOL,
  GMAIL_GET_THREAD_TOOL,
  GMAIL_ARCHIVE_TOOL,
  GMAIL_LABEL_TOOL,
  GMAIL_TRASH_TOOL,
  GMAIL_DRAFT_TOOL,
  GMAIL_MARK_READ_TOOL,
  GMAIL_STATS_TOOL,
  // Batch operations
  GMAIL_BATCH_ARCHIVE_TOOL,
  GMAIL_BATCH_TRASH_TOOL,
  GMAIL_BATCH_MARK_READ_TOOL,
  GMAIL_BATCH_LABEL_TOOL,
  EMMIE_BATCH_TOOLS,
  // Templates
  EMAIL_USE_TEMPLATE_TOOL,
  EMAIL_LIST_TEMPLATES_TOOL,
  // Collections
  EMMIE_GMAIL_TOOLS,
  EMMIE_ALL_TOOLS,
  EMMIE_COMPLETE_TOOLS,
  // Utilities
  TOOL_DISPLAY_NAMES,
  TOOL_EMOJIS,
  getToolDisplay,
} from './gmail-tools';

// AI-powered tool definitions
export {
  GMAIL_SUMMARIZE_INBOX_TOOL,
  GMAIL_EXTRACT_ACTION_ITEMS_TOOL,
  GMAIL_SCHEDULE_SEND_TOOL,
  GMAIL_SEMANTIC_SEARCH_TOOL,
  GMAIL_GENERATE_REPLY_TOOL,
  GMAIL_CONTACT_HISTORY_TOOL,
  GMAIL_FIND_ATTACHMENTS_TOOL,
  GMAIL_UNSUBSCRIBE_SUGGESTIONS_TOOL,
  GMAIL_TRANSLATE_TOOL,
  GMAIL_SNOOZE_TOOL,
  EMMIE_AI_TOOLS,
  AI_TOOL_DISPLAY_NAMES,
  AI_TOOL_EMOJIS,
  getAIToolDisplay,
} from './ai-tools';

// Tool executor
export {
  executeGmailTool,
  validateToolArgs,
  requiresConfirmation,
  getToolActionDescription,
  formatToolResultForChat,
  type ToolExecutionContext,
  type ToolExecutionLog,
} from './tool-executor';

// AI Tool executor
export {
  executeAITool,
} from './ai-tool-executor';
