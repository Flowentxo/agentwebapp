/**
 * Cassie Tool Executor
 *
 * Executes customer support tools based on OpenAI function call responses.
 */

import { createTicket, CreateTicketInput } from './support-tools';
import { checkTicketStatus, CheckTicketInput } from './support-tools';
import { searchKnowledgeBase, SearchKBInput } from './support-tools';
import { escalateToHuman, EscalateInput } from './support-tools';
import { getTicketStats, GetTicketStatsInput } from './support-tools';
import { toolLoggingService } from '@/server/services/ToolLoggingService';

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  summary: string;
}

export interface ToolExecutionContext {
  userId: string;
  workspaceId?: string;
  sessionId?: string;
  agentId?: string;
}

const TOOL_DISPLAY_NAMES: Record<string, string> = {
  create_ticket: 'Ticket erstellen',
  check_ticket_status: 'Ticket-Status pruefen',
  search_knowledge_base: 'Wissensdatenbank durchsuchen',
  escalate_to_human: 'An Mitarbeiter eskalieren',
  get_ticket_stats: 'Ticket-Statistiken',
};

export function getCassieToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeCassieTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[CASSIE_TOOL] Executing ${toolName}`, { userId, args });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'create_ticket': {
        const wsId = context.workspaceId || 'default';
        const input: CreateTicketInput = {
          user: args.user,
          issue: args.issue,
          priority: args.priority || 'medium',
        };
        const ticketResult = await createTicket(input, wsId);
        result = {
          success: true,
          data: ticketResult,
          summary: `Ticket ${ticketResult.ticket_id} erstellt (${ticketResult.priority}) - Antwort in ${ticketResult.estimated_response_time}`,
        };
        break;
      }

      case 'check_ticket_status': {
        const wsId = context.workspaceId || 'default';
        const input: CheckTicketInput = { ticket_id: args.ticket_id };
        const statusResult = await checkTicketStatus(input, wsId);
        result = {
          success: true,
          data: statusResult,
          summary: `Ticket ${statusResult.ticket_id}: ${statusResult.status} (${statusResult.priority}) - Zugewiesen an ${statusResult.assigned_to}`,
        };
        break;
      }

      case 'search_knowledge_base': {
        const input: SearchKBInput = { query: args.query };
        const searchResult = await searchKnowledgeBase(input);
        result = {
          success: true,
          data: searchResult,
          summary: `${searchResult.total_results} Ergebnis(se) gefunden fuer "${args.query}"`,
        };
        break;
      }

      case 'escalate_to_human': {
        const wsId = context.workspaceId || 'default';
        const input: EscalateInput = {
          ticket_id: args.ticket_id,
          reason: args.reason,
        };
        const escResult = await escalateToHuman(input, wsId);
        result = {
          success: true,
          data: escResult,
          summary: `Ticket ${escResult.ticket_id} eskaliert an ${escResult.assigned_team} - Antwort in ${escResult.estimated_human_response}`,
        };
        break;
      }

      case 'get_ticket_stats': {
        const wsId = context.workspaceId || 'default';
        const input: GetTicketStatsInput = { days: args.days };
        const statsResult = await getTicketStats(input, wsId);
        result = {
          success: true,
          data: statsResult,
          summary: `${statsResult.total_tickets} Tickets in ${statsResult.period_days} Tagen`,
        };
        break;
      }

      default:
        result = {
          success: false,
          error: `Unbekanntes Tool: ${toolName}`,
          summary: `Tool "${toolName}" ist nicht implementiert`,
        };
    }

    const executionTime = Date.now() - startTime;
    console.log(`[CASSIE_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'cassie', toolName,
        args,
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[CASSIE_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[CASSIE_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getCassieToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'cassie', toolName, args,
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
