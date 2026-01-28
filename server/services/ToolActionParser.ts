/**
 * Tool Action Parser Service
 *
 * Detects and parses [[TOOL_ACTION: {...}]] tags in agent responses
 * and creates automatic approval requests in the inbox.
 *
 * Format: [[TOOL_ACTION: { "type": "gmail-send-message", "params": { ... } }]]
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedToolAction {
  id: string;
  type: ToolActionType;
  params: Record<string, unknown>;
  rawMatch: string;
  startIndex: number;
  endIndex: number;
}

export type ToolActionType =
  // Gmail Actions
  | 'gmail-send-message'
  | 'gmail-draft-email'
  | 'gmail-reply'
  // HubSpot Actions
  | 'hubspot-create-contact'
  | 'hubspot-update-deal'
  | 'hubspot-create-task'
  | 'hubspot-log-activity'
  // Calendar Actions
  | 'calendar-create-event'
  | 'calendar-reschedule'
  // Data Actions
  | 'data-export'
  | 'data-transform'
  | 'spreadsheet-update'
  // Workflow Actions
  | 'workflow-trigger'
  | 'workflow-schedule'
  // Generic
  | 'external-api-call'
  | 'file-operation'
  | 'custom';

export interface ToolActionMetadata {
  type: ToolActionType;
  label: string;
  description: string;
  icon: string;
  color: string;
  requiresApproval: boolean;
  estimatedCost?: number; // in micro-dollars
  agentHint?: string; // Which agent typically uses this
}

// ============================================================================
// TOOL ACTION REGISTRY
// ============================================================================

export const TOOL_ACTION_REGISTRY: Record<ToolActionType, ToolActionMetadata> = {
  // Gmail Actions
  'gmail-send-message': {
    type: 'gmail-send-message',
    label: 'Send Email',
    description: 'Send an email via Gmail',
    icon: 'Mail',
    color: '#EA4335',
    requiresApproval: true,
    agentHint: 'emmie'
  },
  'gmail-draft-email': {
    type: 'gmail-draft-email',
    label: 'Create Draft',
    description: 'Create an email draft in Gmail',
    icon: 'FileEdit',
    color: '#EA4335',
    requiresApproval: false,
    agentHint: 'emmie'
  },
  'gmail-reply': {
    type: 'gmail-reply',
    label: 'Reply to Email',
    description: 'Send a reply to an email thread',
    icon: 'Reply',
    color: '#EA4335',
    requiresApproval: true,
    agentHint: 'emmie'
  },

  // HubSpot Actions
  'hubspot-create-contact': {
    type: 'hubspot-create-contact',
    label: 'Create Contact',
    description: 'Create a new contact in HubSpot CRM',
    icon: 'UserPlus',
    color: '#FF7A59',
    requiresApproval: true,
    agentHint: 'cassie'
  },
  'hubspot-update-deal': {
    type: 'hubspot-update-deal',
    label: 'Update Deal',
    description: 'Update a deal in HubSpot',
    icon: 'TrendingUp',
    color: '#FF7A59',
    requiresApproval: true,
    agentHint: 'cassie'
  },
  'hubspot-create-task': {
    type: 'hubspot-create-task',
    label: 'Create Task',
    description: 'Create a task in HubSpot',
    icon: 'CheckSquare',
    color: '#FF7A59',
    requiresApproval: false,
    agentHint: 'cassie'
  },
  'hubspot-log-activity': {
    type: 'hubspot-log-activity',
    label: 'Log Activity',
    description: 'Log an activity on a HubSpot record',
    icon: 'Activity',
    color: '#FF7A59',
    requiresApproval: false,
    agentHint: 'cassie'
  },

  // Calendar Actions
  'calendar-create-event': {
    type: 'calendar-create-event',
    label: 'Create Event',
    description: 'Create a calendar event',
    icon: 'Calendar',
    color: '#4285F4',
    requiresApproval: true,
    agentHint: 'aura'
  },
  'calendar-reschedule': {
    type: 'calendar-reschedule',
    label: 'Reschedule Event',
    description: 'Reschedule an existing calendar event',
    icon: 'CalendarClock',
    color: '#4285F4',
    requiresApproval: true,
    agentHint: 'aura'
  },

  // Data Actions
  'data-export': {
    type: 'data-export',
    label: 'Export Data',
    description: 'Export data to a file or external system',
    icon: 'Download',
    color: '#34A853',
    requiresApproval: true,
    agentHint: 'dexter'
  },
  'data-transform': {
    type: 'data-transform',
    label: 'Transform Data',
    description: 'Apply transformations to data',
    icon: 'Shuffle',
    color: '#34A853',
    requiresApproval: false,
    agentHint: 'dexter'
  },
  'spreadsheet-update': {
    type: 'spreadsheet-update',
    label: 'Update Spreadsheet',
    description: 'Write data to a Google Sheet',
    icon: 'Table',
    color: '#34A853',
    requiresApproval: true,
    agentHint: 'dexter'
  },

  // Workflow Actions
  'workflow-trigger': {
    type: 'workflow-trigger',
    label: 'Trigger Workflow',
    description: 'Start a workflow execution',
    icon: 'Zap',
    color: '#8B5CF6',
    requiresApproval: true,
    agentHint: 'aura'
  },
  'workflow-schedule': {
    type: 'workflow-schedule',
    label: 'Schedule Workflow',
    description: 'Schedule a workflow for later execution',
    icon: 'Clock',
    color: '#8B5CF6',
    requiresApproval: true,
    agentHint: 'aura'
  },

  // Generic Actions
  'external-api-call': {
    type: 'external-api-call',
    label: 'API Call',
    description: 'Make an external API call',
    icon: 'Globe',
    color: '#6366F1',
    requiresApproval: true
  },
  'file-operation': {
    type: 'file-operation',
    label: 'File Operation',
    description: 'Perform a file operation',
    icon: 'File',
    color: '#EC4899',
    requiresApproval: true
  },
  'custom': {
    type: 'custom',
    label: 'Custom Action',
    description: 'A custom tool action',
    icon: 'Wrench',
    color: '#6B7280',
    requiresApproval: true
  }
};

// ============================================================================
// PARSER CLASS
// ============================================================================

export class ToolActionParser {
  private static instance: ToolActionParser;

  // Regex pattern to match [[TOOL_ACTION: {...}]]
  private static readonly TOOL_ACTION_PATTERN = /\[\[TOOL_ACTION:\s*(\{[\s\S]*?\})\s*\]\]/g;

  private constructor() {}

  public static getInstance(): ToolActionParser {
    if (!ToolActionParser.instance) {
      ToolActionParser.instance = new ToolActionParser();
    }
    return ToolActionParser.instance;
  }

  /**
   * Parse all tool actions from a message content
   */
  public parseToolActions(content: string): ParsedToolAction[] {
    const actions: ParsedToolAction[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    ToolActionParser.TOOL_ACTION_PATTERN.lastIndex = 0;

    while ((match = ToolActionParser.TOOL_ACTION_PATTERN.exec(content)) !== null) {
      try {
        const jsonStr = match[1];
        const parsed = JSON.parse(jsonStr);

        if (!parsed.type) {
          logger.warn('[ToolActionParser] Tool action missing type:', jsonStr);
          continue;
        }

        const action: ParsedToolAction = {
          id: uuidv4(),
          type: parsed.type as ToolActionType,
          params: parsed.params || {},
          rawMatch: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length
        };

        actions.push(action);
        logger.info(`[ToolActionParser] Found tool action: ${action.type}`, { params: action.params });
      } catch (error) {
        logger.error('[ToolActionParser] Failed to parse tool action JSON:', error);
      }
    }

    return actions;
  }

  /**
   * Check if content contains any tool actions
   */
  public hasToolActions(content: string): boolean {
    ToolActionParser.TOOL_ACTION_PATTERN.lastIndex = 0;
    return ToolActionParser.TOOL_ACTION_PATTERN.test(content);
  }

  /**
   * Remove tool action tags from content (for display)
   */
  public stripToolActions(content: string): string {
    return content.replace(ToolActionParser.TOOL_ACTION_PATTERN, '').trim();
  }

  /**
   * Get metadata for a tool action type
   */
  public getActionMetadata(type: ToolActionType): ToolActionMetadata {
    return TOOL_ACTION_REGISTRY[type] || TOOL_ACTION_REGISTRY['custom'];
  }

  /**
   * Check if an action requires user approval
   */
  public requiresApproval(type: ToolActionType): boolean {
    const metadata = this.getActionMetadata(type);
    return metadata.requiresApproval;
  }

  /**
   * Generate a human-readable preview of the action
   */
  public generatePreview(action: ParsedToolAction): string {
    const metadata = this.getActionMetadata(action.type);
    const params = action.params;

    switch (action.type) {
      case 'gmail-send-message':
        return `Send email to ${params.to || 'recipient'}: "${params.subject || 'No subject'}"`;

      case 'hubspot-create-contact':
        return `Create contact: ${params.email || params.name || 'New contact'}`;

      case 'hubspot-update-deal':
        return `Update deal: ${params.dealName || params.dealId || 'Unknown deal'}`;

      case 'calendar-create-event':
        return `Create event: ${params.title || 'Untitled'} on ${params.date || 'TBD'}`;

      case 'data-export':
        return `Export ${params.dataType || 'data'} to ${params.format || 'file'}`;

      case 'workflow-trigger':
        return `Trigger workflow: ${params.workflowName || params.workflowId || 'Unknown'}`;

      default:
        return `${metadata.label}: ${JSON.stringify(params).slice(0, 100)}...`;
    }
  }

  /**
   * Map action type to approval action type (for DB schema)
   */
  public mapToApprovalActionType(type: ToolActionType): string {
    if (type.startsWith('gmail-')) return 'send_email';
    if (type.startsWith('hubspot-')) return 'external_api_call';
    if (type.startsWith('calendar-')) return 'external_api_call';
    if (type.startsWith('data-') || type.startsWith('spreadsheet-')) return 'database_write';
    if (type.startsWith('workflow-')) return 'other';
    if (type === 'file-operation') return 'file_operation';
    if (type === 'external-api-call') return 'external_api_call';
    return 'other';
  }
}

// Singleton export
export const toolActionParser = ToolActionParser.getInstance();
