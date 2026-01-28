/**
 * Cash Flow Calculator Tool
 *
 * Analyzes cash flow with:
 * - Operating cash flow
 * - Investing cash flow
 * - Financing cash flow
 * - Net cash change
 * - Free cash flow
 */

import { formatCurrency, formatPercentage } from '../config';

export interface CashFlowInput {
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  beginning_cash?: number;
  capital_expenditures?: number;
  period?: string;
}

export interface CashFlowResult {
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  net_cash_change: number;
  beginning_cash: number;
  ending_cash: number;
  free_cash_flow: number | null;
  cash_flow_status: 'strong' | 'healthy' | 'weak' | 'critical';
  metrics: {
    operating: string;
    investing: string;
    financing: string;
    net_change: string;
    ending_cash: string;
    free_cash_flow: string | null;
  };
  formatted_output: string;
}

/**
 * Calculate Cash Flow Statement
 */
export async function calculateCashFlow(input: CashFlowInput): Promise<CashFlowResult> {
  const {
    operating_cash_flow,
    investing_cash_flow,
    financing_cash_flow,
    beginning_cash = 0,
    capital_expenditures,
    period = 'Aktueller Zeitraum',
  } = input;

  // Calculations
  const net_cash_change = operating_cash_flow + investing_cash_flow + financing_cash_flow;
  const ending_cash = beginning_cash + net_cash_change;

  // Free Cash Flow (if CapEx provided)
  let free_cash_flow: number | null = null;
  if (capital_expenditures !== undefined) {
    free_cash_flow = operating_cash_flow - Math.abs(capital_expenditures);
  }

  // Cash flow status evaluation
  let cash_flow_status: CashFlowResult['cash_flow_status'];
  if (operating_cash_flow > 0 && net_cash_change > 0 && ending_cash > 0) {
    cash_flow_status = operating_cash_flow > Math.abs(investing_cash_flow) ? 'strong' : 'healthy';
  } else if (operating_cash_flow > 0 && ending_cash > 0) {
    cash_flow_status = 'healthy';
  } else if (ending_cash > 0) {
    cash_flow_status = 'weak';
  } else {
    cash_flow_status = 'critical';
  }

  // Format metrics
  const metrics = {
    operating: formatCashFlowValue(operating_cash_flow),
    investing: formatCashFlowValue(investing_cash_flow),
    financing: formatCashFlowValue(financing_cash_flow),
    net_change: formatCashFlowValue(net_cash_change),
    ending_cash: formatCurrency(ending_cash),
    free_cash_flow: free_cash_flow !== null ? formatCashFlowValue(free_cash_flow) : null,
  };

  // Generate formatted output
  const formatted_output = `
💰 **CASH FLOW STATEMENT**
Periode: ${period}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**OPERATIVER CASHFLOW** ${getCashFlowIndicator(operating_cash_flow)}
  Cashflow aus Geschäftstätigkeit     ${metrics.operating}
  ${getOperatingCashFlowNote(operating_cash_flow)}

**INVESTITIONS-CASHFLOW** ${getCashFlowIndicator(investing_cash_flow)}
  Cashflow aus Investitionstätigkeit  ${metrics.investing}
  ${getInvestingCashFlowNote(investing_cash_flow)}

**FINANZIERUNGS-CASHFLOW** ${getCashFlowIndicator(financing_cash_flow)}
  Cashflow aus Finanzierungstätigkeit ${metrics.financing}
  ${getFinancingCashFlowNote(financing_cash_flow)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**ZUSAMMENFASSUNG**

  Anfangsbestand liquide Mittel      ${formatCurrency(beginning_cash)}
  Netto-Cashflow-Veränderung         ${metrics.net_change}
                                     ─────────────────
  **Endbestand liquide Mittel**      ${metrics.ending_cash}

${free_cash_flow !== null ? `
**FREE CASH FLOW**
  Operativer Cashflow                ${formatCurrency(operating_cash_flow)}
  - Investitionen (CapEx)            ${formatCurrency(-Math.abs(capital_expenditures!))}
                                     ─────────────────
  **Free Cash Flow**                 ${metrics.free_cash_flow}
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**STATUS:** ${getStatusEmoji(cash_flow_status)} ${getStatusLabel(cash_flow_status)}

${getCashFlowRecommendations(operating_cash_flow, investing_cash_flow, financing_cash_flow, net_cash_change, ending_cash, cash_flow_status)}
`;

  return {
    operating_cash_flow,
    investing_cash_flow,
    financing_cash_flow,
    net_cash_change,
    beginning_cash,
    ending_cash,
    free_cash_flow,
    cash_flow_status,
    metrics,
    formatted_output,
  };
}

function formatCashFlowValue(value: number): string {
  const formatted = formatCurrency(Math.abs(value));
  return value >= 0 ? `+${formatted}` : `-${formatted}`;
}

function getCashFlowIndicator(value: number): string {
  if (value > 0) return '📈';
  if (value < 0) return '📉';
  return '➡️';
}

function getOperatingCashFlowNote(value: number): string {
  if (value > 0) return '(Kerngeschäft generiert Cash)';
  if (value < 0) return '(Kerngeschäft verbraucht Cash ⚠️)';
  return '';
}

function getInvestingCashFlowNote(value: number): string {
  if (value < 0) return '(Investitionen in Wachstum)';
  if (value > 0) return '(Verkauf von Vermögenswerten)';
  return '';
}

function getFinancingCashFlowNote(value: number): string {
  if (value > 0) return '(Kapitalaufnahme/Finanzierung)';
  if (value < 0) return '(Schuldenrückzahlung/Dividenden)';
  return '';
}

function getStatusEmoji(status: CashFlowResult['cash_flow_status']): string {
  const emojis = {
    strong: '🌟',
    healthy: '✅',
    weak: '⚠️',
    critical: '❌',
  };
  return emojis[status];
}

function getStatusLabel(status: CashFlowResult['cash_flow_status']): string {
  const labels = {
    strong: 'Starke Liquidität',
    healthy: 'Gesunde Liquidität',
    weak: 'Schwache Liquidität',
    critical: 'Kritische Liquidität',
  };
  return labels[status];
}

function getCashFlowRecommendations(
  operating: number,
  investing: number,
  financing: number,
  netChange: number,
  endingCash: number,
  status: CashFlowResult['cash_flow_status']
): string {
  const recommendations: string[] = ['**ANALYSE & EMPFEHLUNGEN:**'];

  // Operating cash flow analysis
  if (operating > 0) {
    recommendations.push('✅ Positiver operativer Cashflow - Geschäftsmodell generiert Cash');
  } else {
    recommendations.push('⚠️ Negativer operativer Cashflow - Working Capital prüfen');
  }

  // Investment analysis
  if (investing < 0 && operating > Math.abs(investing)) {
    recommendations.push('✅ Investitionen werden durch operatives Geschäft finanziert');
  } else if (investing < 0 && operating < Math.abs(investing)) {
    recommendations.push('⚠️ Investitionen übersteigen operativen Cashflow');
  }

  // Financing analysis
  if (financing < 0 && operating > 0) {
    recommendations.push('✅ Schuldenrückzahlung durch eigene Kraft möglich');
  } else if (financing > 0 && operating < 0) {
    recommendations.push('⚠️ Abhängigkeit von externer Finanzierung');
  }

  // Overall status recommendations
  if (status === 'critical') {
    recommendations.push('');
    recommendations.push('❌ **DRINGEND:** Sofortige Maßnahmen zur Liquiditätssicherung erforderlich!');
    recommendations.push('  • Forderungsmanagement beschleunigen');
    recommendations.push('  • Zahlungsziele mit Lieferanten verhandeln');
    recommendations.push('  • Nicht-essentielle Ausgaben stoppen');
  } else if (status === 'weak') {
    recommendations.push('');
    recommendations.push('⚠️ **Optimierung empfohlen:**');
    recommendations.push('  • Cash Conversion Cycle verbessern');
    recommendations.push('  • Lagerbestände optimieren');
  }

  return recommendations.join('\n');
}

/**
 * Tool definition for OpenAI
 */
export const CASH_FLOW_CALCULATOR_TOOL = {
  name: 'calculate_cash_flow',
  description: `Analysiert den Cashflow eines Unternehmens.

Nutze dieses Tool wenn der User fragt nach:
- Cashflow-Analyse, Cash Flow Statement
- Liquidität, Zahlungsfähigkeit
- Free Cash Flow
- "Wie viel Cash generieren wir?"`,
  input_schema: {
    type: 'object' as const,
    properties: {
      operating_cash_flow: {
        type: 'number' as const,
        description: 'Cashflow aus operativer Geschäftstätigkeit in Euro',
      },
      investing_cash_flow: {
        type: 'number' as const,
        description: 'Cashflow aus Investitionstätigkeit in Euro (negativ = Investitionen)',
      },
      financing_cash_flow: {
        type: 'number' as const,
        description: 'Cashflow aus Finanzierungstätigkeit in Euro',
      },
      beginning_cash: {
        type: 'number' as const,
        description: 'Anfangsbestand liquide Mittel in Euro (optional)',
      },
      capital_expenditures: {
        type: 'number' as const,
        description: 'Investitionsausgaben für Free Cash Flow Berechnung (optional)',
      },
      period: {
        type: 'string' as const,
        description: 'Betrachtungszeitraum (z.B. "Q4 2024")',
      },
    },
    required: ['operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow'],
  },
};
