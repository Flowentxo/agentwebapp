/**
 * Lex Tool Executor
 *
 * Executes legal assistant tools based on OpenAI function call responses.
 */

import { analyzeContract, ContractAnalyzeInput } from './contract-analyze';
import { draftDocument, DocumentDraftInput } from './document-draft';
import { checkCompliance, ComplianceCheckInput } from './compliance-check';
import { assessRisk, RiskAssessInput } from './risk-assess';
import { searchLegal, LegalSearchInput } from './legal-search';
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
  contract_analyze: 'Vertragsanalyse',
  document_draft: 'Dokument-Erstellung',
  compliance_check: 'Compliance-Pruefung',
  risk_assess: 'Risiko-Bewertung',
  legal_search: 'Rechtsrecherche',
};

export function getLexToolDisplay(toolName: string): string {
  return TOOL_DISPLAY_NAMES[toolName] || toolName;
}

export async function executeLexTool(
  toolName: string,
  args: Record<string, any>,
  context: ToolExecutionContext
): Promise<ToolResult> {
  const startTime = Date.now();
  const { userId } = context;

  console.log(`[LEX_TOOL] Executing ${toolName}`, { userId, args: { ...args, document_text: args.document_text?.substring(0, 100) + '...', text: args.text?.substring(0, 100) + '...' } });

  try {
    let result: ToolResult;

    switch (toolName) {
      case 'contract_analyze': {
        const input: ContractAnalyzeInput = {
          document_text: args.document_text,
          document_type: args.document_type,
          focus: args.focus || 'all',
        };
        const analyzeResult = await analyzeContract(input);
        result = {
          success: true,
          data: analyzeResult,
          summary: `Vertragsanalyse: ${analyzeResult.clauses.length} Klauseln, ${analyzeResult.parties.length} Parteien, ${analyzeResult.key_dates.length} Termine erkannt`,
        };
        break;
      }

      case 'document_draft': {
        const input: DocumentDraftInput = {
          document_type: args.document_type,
          parties: args.parties,
          key_terms: args.key_terms,
          language: args.language,
        };
        const draftResult = await draftDocument(input);
        result = {
          success: !!draftResult.document,
          data: draftResult,
          summary: draftResult.document
            ? `Dokument erstellt: ${draftResult.sections.length} Abschnitte`
            : 'Dokument-Erstellung fehlgeschlagen',
        };
        break;
      }

      case 'compliance_check': {
        const input: ComplianceCheckInput = {
          text: args.text,
          regulations: args.regulations,
          context: args.context,
        };
        const complianceResult = await checkCompliance(input);
        result = {
          success: true,
          data: complianceResult,
          summary: `Compliance-Score: ${complianceResult.score}/100 - ${complianceResult.compliant ? 'Konform' : 'Nicht konform'} (${complianceResult.issues.length} Issues)`,
        };
        break;
      }

      case 'risk_assess': {
        const input: RiskAssessInput = {
          scenario: args.scenario,
          context: args.context,
          risk_type: args.risk_type || 'all',
        };
        const riskResult = await assessRisk(input);
        result = {
          success: true,
          data: riskResult,
          summary: `Risiko: ${riskResult.overall_risk.toUpperCase()} (Score: ${riskResult.score}/100, ${riskResult.risks.length} Risiken)`,
        };
        break;
      }

      case 'legal_search': {
        const input: LegalSearchInput = {
          query: args.query,
          category: args.category,
          max_results: args.max_results,
        };
        const searchResult = await searchLegal(input);
        result = {
          success: searchResult.results.length > 0,
          data: searchResult,
          summary: `Rechtsrecherche: ${searchResult.results.length} Ergebnisse fuer "${args.query}"`,
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
    console.log(`[LEX_TOOL] ${toolName} completed in ${executionTime}ms`, {
      success: result.success,
      summary: result.summary,
    });

    // Log to database
    try {
      await toolLoggingService.quickLog(
        userId,
        'lex',
        toolName,
        { ...args, document_text: args.document_text?.substring(0, 200), text: args.text?.substring(0, 200) },
        { success: result.success, summary: result.summary, error: result.error },
        executionTime,
        context.sessionId
      );
    } catch (logError) {
      console.error('[LEX_TOOL_LOG] Failed to log:', logError);
    }

    return result;
  } catch (error: any) {
    const executionTime = Date.now() - startTime;
    console.error(`[LEX_TOOL] ${toolName} failed:`, error);

    const errorResult: ToolResult = {
      success: false,
      error: error.message,
      summary: `${getLexToolDisplay(toolName)} fehlgeschlagen: ${error.message}`,
    };

    try {
      await toolLoggingService.quickLog(
        userId, 'lex', toolName,
        { ...args, document_text: args.document_text?.substring(0, 200), text: args.text?.substring(0, 200) },
        { success: false, error: error.message, summary: `${getLexToolDisplay(toolName)} fehlgeschlagen` },
        executionTime, context.sessionId
      );
    } catch {}

    return errorResult;
  }
}
