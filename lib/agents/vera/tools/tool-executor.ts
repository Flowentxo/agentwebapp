/**
 * Vera Tool Executor
 *
 * Executes security & compliance tools based on OpenAI function call responses.
 */

import { auditPasswordStrength, AuditPasswordInput } from './security-tools';
import { scanUrlSafety, ScanUrlInput } from './security-tools';
import { generateGdprReport, GdprReportInput } from './security-tools';
import { checkCve, CheckCveInput } from './security-tools';
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
  audit_password_strength: 'Passwort-Audit',
  scan_url_safety: 'URL-Sicherheitscheck',
  generate_gdpr_report: 'DSGVO-Bericht',
  check_cve: 'CVE-Schwachstellencheck',
};

export function getVeraToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeVeraTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[VERA_TOOL] Executing ${toolName}`, { userId });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'audit_password_strength': {
        const input: AuditPasswordInput = { password: args.password };
        const auditResult = await auditPasswordStrength(input);
        result = {
          success: true,
          data: auditResult,
          summary: `Passwort-Score: ${auditResult.score}/100 (${auditResult.strength}) - ${auditResult.recommendations.length} Empfehlungen`,
        };
        break;
      }

      case 'scan_url_safety': {
        const input: ScanUrlInput = { url: args.url };
        const scanResult = await scanUrlSafety(input);
        result = {
          success: true,
          data: scanResult,
          summary: `URL ${scanResult.safe ? 'sicher' : 'UNSICHER'}: ${scanResult.risk_level} (Score: ${scanResult.risk_score}/100)`,
        };
        break;
      }

      case 'generate_gdpr_report': {
        const input: GdprReportInput = { user_id: args.user_id };
        const reportResult = await generateGdprReport(input);
        result = {
          success: true,
          data: reportResult,
          summary: `DSGVO-Bericht ${reportResult.report_id} erstellt - ${reportResult.data_categories.length} Datenkategorien`,
        };
        break;
      }

      case 'check_cve': {
        const input: CheckCveInput = { product: args.product, version: args.version };
        const cveResult = await checkCve(input);
        result = {
          success: true,
          data: cveResult,
          summary: `${cveResult.total_cves} CVEs fuer ${cveResult.product} ${cveResult.version} (${cveResult.critical} kritisch, ${cveResult.high} hoch)`,
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
    console.log(`[VERA_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    try {
      await toolLoggingService.quickLog(
        userId, 'vera', toolName,
        { ...args, password: args.password ? '***REDACTED***' : undefined },
        { success: result.success, summary: result.summary, error: result.error },
        executionTime, context.sessionId
      );
    } catch (logError) {
      console.error('[VERA_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[VERA_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getVeraToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'vera', toolName,
        { ...args, password: '***REDACTED***' },
        { success: false, error: error.message, summary: errorResult.summary },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
