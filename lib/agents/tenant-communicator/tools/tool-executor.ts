/**
 * Tenant Communicator Tool Executor
 *
 * Executes tenant communication tools based on OpenAI function call responses.
 */

import { generateNotice, type NoticeGeneratorInput } from './notice-generator';
import { calculateDeadline, type DeadlineCalculatorInput } from './deadline-calculator';
import { trackDelivery, type DeliveryTrackerInput } from './delivery-tracker';
import { manageCommunicationLog, type CommunicationLogInput } from './communication-log';
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
  notice_generator: 'Schreiben-Generator',
  deadline_calculator: 'Fristenrechner',
  delivery_tracker: 'Zustellnachweis-Manager',
  communication_log: 'Kommunikationsprotokoll',
};

export function getTenantCommunicatorToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeTenantCommunicatorTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext,
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[TENANT_COMM_TOOL] Executing ${toolName}`, { userId, args: summarizeArgs(args) });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'notice_generator': {
        const input: NoticeGeneratorInput = {
          notice_type: args.notice_type,
          landlord: args.landlord,
          tenant: args.tenant,
          property: args.property,
          contract_details: args.contract_details,
          reason: args.reason,
          deadline_date: args.deadline_date,
          custom_text: args.custom_text,
        };
        const noticeResult = await generateNotice(input);
        result = {
          success: !!noticeResult.document,
          data: noticeResult,
          summary: noticeResult.document
            ? `Schreiben erstellt: ${args.notice_type}, ${noticeResult.legal_references.length} Rechtsgrundlagen`
            : 'Schreiben-Erstellung fehlgeschlagen',
        };
        break;
      }

      case 'deadline_calculator': {
        const input: DeadlineCalculatorInput = {
          deadline_type: args.deadline_type,
          reference_date: args.reference_date,
          tenancy_duration_months: args.tenancy_duration_months,
          abrechnungszeitraum_end: args.abrechnungszeitraum_end,
          state: args.state,
        };
        const deadlineResult = await calculateDeadline(input);
        result = {
          success: true,
          data: deadlineResult,
          summary: `Frist berechnet: ${args.deadline_type} → ${deadlineResult.deadline_date} (${deadlineResult.legal_basis})`,
        };
        break;
      }

      case 'delivery_tracker': {
        const input: DeliveryTrackerInput = {
          action: args.action,
          notice_type: args.notice_type,
          delivery_method: args.delivery_method,
          tracking_number: args.tracking_number,
          tenant_id: args.tenant_id,
          notice_id: args.notice_id,
          delivery_date: args.delivery_date,
          witness_name: args.witness_name,
        };
        const deliveryResult = await trackDelivery(input, userId);
        result = {
          success: true,
          data: deliveryResult,
          summary: `Zustellung: ${args.action}${deliveryResult.tracking_status ? ` — Status: ${deliveryResult.tracking_status}` : ''}`,
        };
        break;
      }

      case 'communication_log': {
        const input: CommunicationLogInput = {
          action: args.action,
          entry: args.entry,
          filter: args.filter,
          export_format: args.export_format,
        };
        const logResult = await manageCommunicationLog(input, userId);
        result = {
          success: true,
          data: logResult,
          summary: `Kommunikationslog: ${args.action}${logResult.entries ? ` — ${logResult.entries.length} Eintraege` : ''}`,
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
    console.log(`[TENANT_COMM_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'tenant-communicator',
        toolName,
        summarizeArgs(args),
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId,
      );
    } catch (logError) {
      console.error('[TENANT_COMM_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[TENANT_COMM_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getTenantCommunicatorToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'tenant-communicator', toolName,
        summarizeArgs(args),
        { success: false, error: error.message, summary: `${getTenantCommunicatorToolDisplay(toolName)} fehlgeschlagen` },
        executionTime, context.sessionId,
      );
    } catch {}

    return errorResult;
  }
}

function summarizeArgs(args: Record<string, any>): Record<string, any> {
  const summary = { ...args };
  // Truncate long text fields
  if (summary.custom_text) summary.custom_text = summary.custom_text.substring(0, 200) + '...';
  if (summary.reason) summary.reason = summary.reason.substring(0, 200) + '...';
  if (summary.entry?.content) summary.entry = { ...summary.entry, content: summary.entry.content.substring(0, 200) + '...' };
  return summary;
}
