/**
 * P&L (Profit & Loss) Calculator Tool
 *
 * Generates Profit & Loss statements with:
 * - Gross profit calculation
 * - Operating profit (EBIT)
 * - Net profit
 * - Margin analysis
 * - Performance indicators
 */

import { formatCurrency, formatPercentage, FINANCIAL_THRESHOLDS } from '../config';

export interface PnLInput {
  revenue: number;
  cost_of_goods_sold: number;
  operating_expenses: number;
  other_income?: number;
  other_expenses?: number;
  tax_rate?: number;
  period?: string;
}

export interface PnLResult {
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  gross_margin: number;
  operating_expenses: number;
  operating_profit: number;
  operating_margin: number;
  other_income: number;
  other_expenses: number;
  profit_before_tax: number;
  tax_expense: number;
  net_profit: number;
  net_margin: number;
  performance: 'excellent' | 'good' | 'acceptable' | 'poor' | 'loss';
  metrics: {
    revenue: string;
    cogs: string;
    gross_profit: string;
    gross_margin: string;
    operating_profit: string;
    operating_margin: string;
    net_profit: string;
    net_margin: string;
  };
  formatted_output: string;
}

/**
 * Calculate Profit & Loss Statement
 */
export async function calculatePnL(input: PnLInput): Promise<PnLResult> {
  const {
    revenue,
    cost_of_goods_sold,
    operating_expenses,
    other_income = 0,
    other_expenses = 0,
    tax_rate = 25,
    period = 'Aktueller Zeitraum',
  } = input;

  // Validation
  if (revenue < 0) throw new Error('Umsatz kann nicht negativ sein');
  if (cost_of_goods_sold < 0) throw new Error('Herstellungskosten können nicht negativ sein');
  if (operating_expenses < 0) throw new Error('Betriebskosten können nicht negativ sein');
  if (tax_rate < 0 || tax_rate > 100) throw new Error('Steuersatz muss zwischen 0 und 100% liegen');

  // Calculations
  const gross_profit = revenue - cost_of_goods_sold;
  const gross_margin = revenue > 0 ? (gross_profit / revenue) * 100 : 0;

  const operating_profit = gross_profit - operating_expenses;
  const operating_margin = revenue > 0 ? (operating_profit / revenue) * 100 : 0;

  const profit_before_tax = operating_profit + other_income - other_expenses;
  const tax_expense = profit_before_tax > 0 ? profit_before_tax * (tax_rate / 100) : 0;
  const net_profit = profit_before_tax - tax_expense;
  const net_margin = revenue > 0 ? (net_profit / revenue) * 100 : 0;

  // Performance evaluation
  let performance: PnLResult['performance'];
  if (net_margin >= FINANCIAL_THRESHOLDS.margins.net) {
    performance = 'excellent';
  } else if (net_margin >= FINANCIAL_THRESHOLDS.margins.net * 0.6) {
    performance = 'good';
  } else if (net_margin >= FINANCIAL_THRESHOLDS.margins.net * 0.3) {
    performance = 'acceptable';
  } else if (net_margin >= 0) {
    performance = 'poor';
  } else {
    performance = 'loss';
  }

  // Format metrics
  const metrics = {
    revenue: formatCurrency(revenue),
    cogs: formatCurrency(cost_of_goods_sold),
    gross_profit: formatCurrency(gross_profit),
    gross_margin: formatPercentage(gross_margin),
    operating_profit: formatCurrency(operating_profit),
    operating_margin: formatPercentage(operating_margin),
    net_profit: formatCurrency(net_profit),
    net_margin: formatPercentage(net_margin),
  };

  // Generate formatted output
  const formatted_output = `
📊 **GEWINN- UND VERLUSTRECHNUNG (P&L)**
Periode: ${period}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**UMSATZ**
  Nettoumsatz                    ${metrics.revenue}

**HERSTELLUNGSKOSTEN**
  Wareneinsatz/COGS             -${metrics.cogs}
                                 ─────────────────
  **BRUTTOGEWINN**               ${metrics.gross_profit}
  Bruttomarge                    ${metrics.gross_margin} ${getMarginIndicator(gross_margin, FINANCIAL_THRESHOLDS.margins.gross)}

**BETRIEBSKOSTEN**
  Betriebsaufwendungen          -${formatCurrency(operating_expenses)}
                                 ─────────────────
  **BETRIEBSERGEBNIS (EBIT)**    ${metrics.operating_profit}
  Operative Marge                ${metrics.operating_margin} ${getMarginIndicator(operating_margin, FINANCIAL_THRESHOLDS.margins.operating)}

${other_income > 0 || other_expenses > 0 ? `**SONSTIGE ERTRÄGE/AUFWENDUNGEN**
  Sonstige Erträge              +${formatCurrency(other_income)}
  Sonstige Aufwendungen         -${formatCurrency(other_expenses)}
                                 ─────────────────` : ''}
  **ERGEBNIS VOR STEUERN**       ${formatCurrency(profit_before_tax)}

**STEUERN**
  Steuern (${tax_rate}%)         -${formatCurrency(tax_expense)}
                                 ═════════════════
  **NETTOGEWINN**                ${metrics.net_profit}
  Nettomarge                     ${metrics.net_margin} ${getMarginIndicator(net_margin, FINANCIAL_THRESHOLDS.margins.net)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**BEWERTUNG:** ${getPerformanceEmoji(performance)} ${getPerformanceLabel(performance)}

${getRecommendations(gross_margin, operating_margin, net_margin, performance)}
`;

  return {
    revenue,
    cost_of_goods_sold,
    gross_profit,
    gross_margin,
    operating_expenses,
    operating_profit,
    operating_margin,
    other_income,
    other_expenses,
    profit_before_tax,
    tax_expense,
    net_profit,
    net_margin,
    performance,
    metrics,
    formatted_output,
  };
}

function getMarginIndicator(margin: number, threshold: number): string {
  if (margin >= threshold) return '✅';
  if (margin >= threshold * 0.7) return '⚠️';
  return '❌';
}

function getPerformanceEmoji(performance: PnLResult['performance']): string {
  const emojis = {
    excellent: '🌟',
    good: '✅',
    acceptable: '⚠️',
    poor: '⚠️',
    loss: '❌',
  };
  return emojis[performance];
}

function getPerformanceLabel(performance: PnLResult['performance']): string {
  const labels = {
    excellent: 'Hervorragende Performance',
    good: 'Gute Performance',
    acceptable: 'Akzeptable Performance',
    poor: 'Schwache Performance',
    loss: 'Verlustperiode',
  };
  return labels[performance];
}

function getRecommendations(
  grossMargin: number,
  operatingMargin: number,
  netMargin: number,
  performance: PnLResult['performance']
): string {
  const recommendations: string[] = ['**HANDLUNGSEMPFEHLUNGEN:**'];

  if (grossMargin < FINANCIAL_THRESHOLDS.margins.gross) {
    recommendations.push('• Bruttomarge unter Zielwert: Preisgestaltung oder Einkaufskosten optimieren');
  }

  if (operatingMargin < FINANCIAL_THRESHOLDS.margins.operating) {
    recommendations.push('• Operative Marge verbessern: Betriebskosten analysieren und reduzieren');
  }

  if (netMargin < FINANCIAL_THRESHOLDS.margins.net) {
    recommendations.push('• Nettomarge erhöhen: Steueroptimierung und Effizienzsteigerung prüfen');
  }

  if (performance === 'loss') {
    recommendations.push('• **DRINGEND:** Verlustquellen identifizieren und Restrukturierung prüfen');
  }

  if (performance === 'excellent') {
    recommendations.push('• Weiter so! Prüfe Investitions- und Wachstumsmöglichkeiten');
  }

  return recommendations.length > 1 ? recommendations.join('\n') : '';
}

/**
 * Tool definition for OpenAI
 */
export const PNL_CALCULATOR_TOOL = {
  name: 'calculate_pnl',
  description: `Erstellt eine Gewinn- und Verlustrechnung (P&L Statement).

Nutze dieses Tool wenn der User fragt nach:
- P&L, GuV, Gewinn- und Verlustrechnung
- Bruttogewinn, Nettogewinn, EBIT
- Margenanalyse (Brutto-, Betriebs-, Nettomarge)
- "Wie profitabel ist mein Unternehmen?"`,
  input_schema: {
    type: 'object' as const,
    properties: {
      revenue: {
        type: 'number' as const,
        description: 'Gesamtumsatz/Nettoerlöse in Euro',
      },
      cost_of_goods_sold: {
        type: 'number' as const,
        description: 'Herstellungskosten/Wareneinsatz (COGS) in Euro',
      },
      operating_expenses: {
        type: 'number' as const,
        description: 'Betriebskosten (Vertrieb, Verwaltung, etc.) in Euro',
      },
      other_income: {
        type: 'number' as const,
        description: 'Sonstige Erträge in Euro (optional)',
      },
      other_expenses: {
        type: 'number' as const,
        description: 'Sonstige Aufwendungen in Euro (optional)',
      },
      tax_rate: {
        type: 'number' as const,
        description: 'Steuersatz in Prozent (Standard: 25%)',
      },
      period: {
        type: 'string' as const,
        description: 'Betrachtungszeitraum (z.B. "Q4 2024", "Jahr 2024")',
      },
    },
    required: ['revenue', 'cost_of_goods_sold', 'operating_expenses'],
  },
};
