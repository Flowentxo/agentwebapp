/**
 * ROI Calculator Tool
 *
 * Calculates Return on Investment with detailed analysis including:
 * - ROI percentage
 * - Payback period
 * - Net profit
 * - Annualized ROI
 * - Investment recommendation
 */

import { formatCurrency, formatPercentage, FINANCIAL_THRESHOLDS } from '../config';

export interface ROIInput {
  investment_cost: number;
  revenue_generated: number;
  timeframe_months: number;
  recurring_costs?: number;
}

export interface ROIResult {
  roi_percentage: number;
  roi_category: 'excellent' | 'good' | 'acceptable' | 'poor' | 'negative';
  payback_period_months: number | null;
  net_profit: number;
  total_costs: number;
  annualized_roi: number;
  recommendation: string;
  metrics: {
    investment: string;
    revenue: string;
    total_costs: string;
    net_profit: string;
    roi: string;
    annualized_roi: string;
    payback_period: string;
  };
  formatted_output: string;
}

/**
 * Calculate Return on Investment
 */
export async function calculateROI(input: ROIInput): Promise<ROIResult> {
  const { investment_cost, revenue_generated, timeframe_months, recurring_costs = 0 } = input;

  // Validation
  if (investment_cost <= 0) {
    throw new Error('Investment cost must be positive');
  }
  if (revenue_generated < 0) {
    throw new Error('Revenue cannot be negative');
  }
  if (timeframe_months <= 0) {
    throw new Error('Timeframe must be positive');
  }
  if (recurring_costs < 0) {
    throw new Error('Recurring costs cannot be negative');
  }

  // Calculations
  const total_recurring_costs = recurring_costs * timeframe_months;
  const total_costs = investment_cost + total_recurring_costs;
  const net_profit = revenue_generated - total_costs;
  const roi_percentage = (net_profit / investment_cost) * 100;

  // Annualized ROI
  const years = timeframe_months / 12;
  const annualized_roi = years > 0 ? roi_percentage / years : roi_percentage;

  // Payback Period (months until break-even)
  let payback_period_months: number | null = null;
  let payback_exceeds_timeframe = false;
  let payback_warning: string | null = null;

  const monthly_net_income = timeframe_months > 0
    ? (revenue_generated - total_recurring_costs) / timeframe_months
    : 0;

  if (monthly_net_income > 0) {
    payback_period_months = Math.ceil(investment_cost / monthly_net_income);

    // Check if payback exceeds project timeframe
    if (payback_period_months > timeframe_months) {
      payback_exceeds_timeframe = true;
      payback_warning = `⚠️ WARNUNG: Amortisation (${payback_period_months} Monate) länger als Projektzeitraum (${timeframe_months} Monate)!`;
    }
  } else if (net_profit < 0) {
    // No payback possible - project loses money
    payback_warning = '❌ Keine Amortisation möglich - Projekt ist nicht rentabel.';
  }

  // ROI Category
  let roi_category: ROIResult['roi_category'];
  if (roi_percentage >= FINANCIAL_THRESHOLDS.roi.excellent) {
    roi_category = 'excellent';
  } else if (roi_percentage >= FINANCIAL_THRESHOLDS.roi.good) {
    roi_category = 'good';
  } else if (roi_percentage >= FINANCIAL_THRESHOLDS.roi.acceptable) {
    roi_category = 'acceptable';
  } else if (roi_percentage >= 0) {
    roi_category = 'poor';
  } else {
    roi_category = 'negative';
  }

  // Recommendation (with payback warning)
  const recommendation = generateRecommendation(
    roi_category,
    roi_percentage,
    payback_period_months,
    timeframe_months,
    payback_warning,
    payback_exceeds_timeframe
  );

  // Formatted metrics
  const metrics = {
    investment: formatCurrency(investment_cost),
    revenue: formatCurrency(revenue_generated),
    total_costs: formatCurrency(total_costs),
    net_profit: formatCurrency(net_profit),
    roi: formatPercentage(roi_percentage),
    annualized_roi: formatPercentage(annualized_roi),
    payback_period: payback_period_months ? `${payback_period_months} Monate` : 'N/A',
  };

  // Payback display with warning
  let paybackDisplay = '';
  if (payback_period_months) {
    paybackDisplay = `- Amortisationszeit: ${metrics.payback_period}`;
    if (payback_exceeds_timeframe) {
      paybackDisplay += ' ⚠️';
    }
    paybackDisplay += '\n';
  }

  // Formatted output
  const formatted_output = `
📊 **ROI-ANALYSE ERGEBNIS**

**Investment-Details:**
- Initiale Investition: ${metrics.investment}
- Generierte Revenue: ${metrics.revenue}
- Zeitraum: ${timeframe_months} Monate
${recurring_costs > 0 ? `- Laufende Kosten: ${formatCurrency(recurring_costs)}/Monat\n` : ''}
**Finanz-Kennzahlen:**
- Gesamtkosten: ${metrics.total_costs}
- Nettogewinn: ${metrics.net_profit}
- **ROI: ${metrics.roi}** (${getRatingEmoji(roi_category)} ${roi_category.toUpperCase()})
- Annualisierter ROI: ${metrics.annualized_roi}
${paybackDisplay}${payback_warning ? `\n${payback_warning}\n` : ''}
**Bewertung:**
${recommendation}
`;

  return {
    roi_percentage,
    roi_category,
    payback_period_months,
    net_profit,
    total_costs,
    annualized_roi,
    recommendation,
    metrics,
    formatted_output,
  };
}

/**
 * Generate investment recommendation
 */
function generateRecommendation(
  category: ROIResult['roi_category'],
  roi: number,
  paybackMonths: number | null,
  timeframeMonths: number,
  paybackWarning: string | null,
  paybackExceedsTimeframe: boolean
): string {
  const recommendations: string[] = [];

  // Add payback warning first if exists
  if (paybackWarning) {
    recommendations.push(paybackWarning);
    recommendations.push('');
  }

  switch (category) {
    case 'excellent':
      recommendations.push('✅ **Exzellente Investition!** Der ROI von ' + formatPercentage(roi) + ' ist hervorragend.');
      if (paybackMonths && paybackMonths < 12 && !paybackExceedsTimeframe) {
        recommendations.push('Die Amortisationszeit von ' + paybackMonths + ' Monaten ist sehr kurz.');
      }
      if (paybackExceedsTimeframe) {
        recommendations.push('**Empfehlung:** Trotz hohem ROI dauert die Amortisation länger als der Projektzeitraum. Prüfe längerfristige Planung.');
      } else {
        recommendations.push('**Empfehlung:** Investition stark empfohlen. Prüfe Skalierungsmöglichkeiten.');
      }
      break;

    case 'good':
      recommendations.push('✅ **Gute Investition.** Der ROI von ' + formatPercentage(roi) + ' liegt über dem Marktdurchschnitt.');
      if (paybackMonths && !paybackExceedsTimeframe) {
        recommendations.push('Amortisation nach ' + paybackMonths + ' Monaten ist akzeptabel.');
      } else if (paybackExceedsTimeframe) {
        recommendations.push('**Hinweis:** Die Amortisation erfolgt erst nach dem geplanten Zeitraum.');
      }
      recommendations.push('**Empfehlung:** Investition empfohlen. Analysiere Risiken und Wettbewerb.');
      break;

    case 'acceptable':
      recommendations.push('⚠️ **Akzeptable Investition.** Der ROI von ' + formatPercentage(roi) + ' ist moderat.');
      if (paybackExceedsTimeframe) {
        recommendations.push('**Kritisch:** Amortisation erst nach Projektende - Risiko erhöht.');
      }
      recommendations.push('**Empfehlung:** Investition möglich, aber vergleiche mit Alternativen. Optimiere Kosten wenn möglich.');
      break;

    case 'poor':
      recommendations.push('⚠️ **Niedrige Rendite.** Der ROI von ' + formatPercentage(roi) + ' ist unterdurchschnittlich.');
      if (paybackExceedsTimeframe) {
        recommendations.push('**Kritisch:** Bei diesem Tempo dauert die Amortisation zu lange.');
      }
      recommendations.push('**Empfehlung:** Überdenke die Investition. Suche nach Optimierungsmöglichkeiten oder besseren Alternativen.');
      break;

    case 'negative':
      recommendations.push('❌ **Verlustgeschäft.** Der ROI von ' + formatPercentage(roi) + ' ist negativ.');
      recommendations.push('**Empfehlung:** Investition NICHT empfohlen. Revenue reicht nicht zur Deckung der Kosten.');
      break;
  }

  return recommendations.join('\n');
}

/**
 * Get rating emoji
 */
function getRatingEmoji(category: ROIResult['roi_category']): string {
  const emojis = {
    excellent: '🌟',
    good: '✅',
    acceptable: '⚠️',
    poor: '⚠️',
    negative: '❌',
  };
  return emojis[category];
}

/**
 * Tool definition for Anthropic
 */
export const ROI_CALCULATOR_TOOL = {
  name: 'calculate_roi',
  description: `Berechnet Return on Investment (ROI) für Projekte oder Investitionen.

Nutze dieses Tool wenn der User fragt nach:
- ROI-Berechnung, Rentabilität, Profitabilität
- "Lohnt sich die Investition?"
- Amortisationszeit, Payback Period
- Investment-Bewertung

Das Tool gibt detaillierte Finanzanalyse mit Empfehlungen zurück.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      investment_cost: {
        type: 'number' as const,
        description: 'Initiale Investitionskosten in Euro',
      },
      revenue_generated: {
        type: 'number' as const,
        description: 'Generierte Einnahmen über den Zeitraum in Euro',
      },
      timeframe_months: {
        type: 'integer' as const,
        description: 'Zeitraum in Monaten',
      },
      recurring_costs: {
        type: 'number' as const,
        description: 'Optional: Monatliche laufende Kosten in Euro',
      },
    },
    required: ['investment_cost', 'revenue_generated', 'timeframe_months'],
  },
};
