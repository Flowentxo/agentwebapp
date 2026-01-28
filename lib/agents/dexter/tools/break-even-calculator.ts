/**
 * Break-Even Calculator Tool
 *
 * Calculates break-even point with:
 * - Units needed to break even
 * - Revenue needed to break even
 * - Contribution margin analysis
 * - Safety margin
 */

import { formatCurrency, formatPercentage } from '../config';

export interface BreakEvenInput {
  fixed_costs: number;
  variable_cost_per_unit: number;
  price_per_unit: number;
  current_sales_units?: number;
  target_profit?: number;
}

export interface BreakEvenResult {
  break_even_units: number;
  break_even_revenue: number;
  contribution_margin_per_unit: number;
  contribution_margin_ratio: number;
  safety_margin_units: number | null;
  safety_margin_percentage: number | null;
  units_for_target_profit: number | null;
  is_viable: boolean;
  metrics: {
    break_even_units: string;
    break_even_revenue: string;
    contribution_margin: string;
    contribution_ratio: string;
    safety_margin: string | null;
  };
  formatted_output: string;
}

/**
 * Calculate Break-Even Point
 */
export async function calculateBreakEven(input: BreakEvenInput): Promise<BreakEvenResult> {
  const {
    fixed_costs,
    variable_cost_per_unit,
    price_per_unit,
    current_sales_units,
    target_profit,
  } = input;

  // Validation
  if (fixed_costs < 0) throw new Error('Fixkosten können nicht negativ sein');
  if (variable_cost_per_unit < 0) throw new Error('Variable Kosten können nicht negativ sein');
  if (price_per_unit <= 0) throw new Error('Verkaufspreis muss positiv sein');
  if (price_per_unit <= variable_cost_per_unit) {
    throw new Error('Verkaufspreis muss höher als variable Kosten sein');
  }

  // Calculations
  const contribution_margin_per_unit = price_per_unit - variable_cost_per_unit;
  const contribution_margin_ratio = (contribution_margin_per_unit / price_per_unit) * 100;

  const break_even_units = Math.ceil(fixed_costs / contribution_margin_per_unit);
  const break_even_revenue = break_even_units * price_per_unit;

  // Safety margin (if current sales provided)
  let safety_margin_units: number | null = null;
  let safety_margin_percentage: number | null = null;

  if (current_sales_units !== undefined && current_sales_units > 0) {
    safety_margin_units = current_sales_units - break_even_units;
    safety_margin_percentage = (safety_margin_units / current_sales_units) * 100;
  }

  // Units for target profit
  let units_for_target_profit: number | null = null;
  if (target_profit !== undefined && target_profit > 0) {
    units_for_target_profit = Math.ceil((fixed_costs + target_profit) / contribution_margin_per_unit);
  }

  const is_viable = contribution_margin_per_unit > 0;

  // Format metrics
  const metrics = {
    break_even_units: `${break_even_units.toLocaleString('de-DE')} Einheiten`,
    break_even_revenue: formatCurrency(break_even_revenue),
    contribution_margin: formatCurrency(contribution_margin_per_unit),
    contribution_ratio: formatPercentage(contribution_margin_ratio),
    safety_margin: safety_margin_percentage !== null
      ? formatPercentage(safety_margin_percentage)
      : null,
  };

  // Generate formatted output
  const formatted_output = `
📊 **BREAK-EVEN ANALYSE (Gewinnschwelle)**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**EINGABEDATEN:**
  Fixkosten                     ${formatCurrency(fixed_costs)}
  Variable Kosten/Einheit       ${formatCurrency(variable_cost_per_unit)}
  Verkaufspreis/Einheit         ${formatCurrency(price_per_unit)}
${current_sales_units !== undefined ? `  Aktuelle Verkäufe            ${current_sales_units.toLocaleString('de-DE')} Einheiten` : ''}
${target_profit !== undefined ? `  Zielgewinn                   ${formatCurrency(target_profit)}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
**ERGEBNIS:**

  **Deckungsbeitrag pro Einheit**
  ${formatCurrency(price_per_unit)} - ${formatCurrency(variable_cost_per_unit)} = ${metrics.contribution_margin}
  Deckungsbeitragsquote: ${metrics.contribution_ratio}

  **BREAK-EVEN PUNKT:**
  📍 ${metrics.break_even_units}
  💰 ${metrics.break_even_revenue}

${safety_margin_units !== null ? `
**SICHERHEITSMARGE:**
  ${safety_margin_units >= 0 ? '✅' : '⚠️'} ${safety_margin_units.toLocaleString('de-DE')} Einheiten ${safety_margin_units >= 0 ? 'über' : 'unter'} Break-Even
  Sicherheitsmarge: ${metrics.safety_margin}
` : ''}
${units_for_target_profit !== null ? `
**FÜR ZIELGEWINN (${formatCurrency(target_profit!)}):**
  📈 ${units_for_target_profit.toLocaleString('de-DE')} Einheiten erforderlich
  💰 ${formatCurrency(units_for_target_profit * price_per_unit)} Umsatz erforderlich
` : ''}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${getBreakEvenRecommendations(break_even_units, safety_margin_units, safety_margin_percentage, contribution_margin_ratio)}
`;

  return {
    break_even_units,
    break_even_revenue,
    contribution_margin_per_unit,
    contribution_margin_ratio,
    safety_margin_units,
    safety_margin_percentage,
    units_for_target_profit,
    is_viable,
    metrics,
    formatted_output,
  };
}

function getBreakEvenRecommendations(
  breakEvenUnits: number,
  safetyMarginUnits: number | null,
  safetyMarginPercentage: number | null,
  contributionRatio: number
): string {
  const recommendations: string[] = ['**ANALYSE & EMPFEHLUNGEN:**'];

  if (contributionRatio >= 50) {
    recommendations.push('✅ Hoher Deckungsbeitrag - gute Preissetzungsmacht');
  } else if (contributionRatio >= 30) {
    recommendations.push('⚠️ Moderater Deckungsbeitrag - Kostenoptimierung prüfen');
  } else {
    recommendations.push('❌ Niedriger Deckungsbeitrag - Preise erhöhen oder Kosten senken');
  }

  if (safetyMarginPercentage !== null) {
    if (safetyMarginPercentage >= 25) {
      recommendations.push('✅ Gute Sicherheitsmarge - Geschäft ist robust');
    } else if (safetyMarginPercentage >= 10) {
      recommendations.push('⚠️ Moderate Sicherheitsmarge - auf Absatzschwankungen achten');
    } else if (safetyMarginPercentage >= 0) {
      recommendations.push('⚠️ Geringe Sicherheitsmarge - Risiko bei Umsatzrückgang');
    } else {
      recommendations.push('❌ Unter Break-Even - dringende Maßnahmen erforderlich!');
    }
  }

  recommendations.push('');
  recommendations.push('**Hebel zur Verbesserung:**');
  recommendations.push('• Fixkosten reduzieren → niedrigerer Break-Even');
  recommendations.push('• Verkaufspreis erhöhen → höherer Deckungsbeitrag');
  recommendations.push('• Variable Kosten senken → höhere Marge pro Einheit');

  return recommendations.join('\n');
}

/**
 * Tool definition for OpenAI
 */
export const BREAK_EVEN_CALCULATOR_TOOL = {
  name: 'calculate_break_even',
  description: `Berechnet die Gewinnschwelle (Break-Even-Point).

Nutze dieses Tool wenn der User fragt nach:
- Break-Even, Gewinnschwelle
- "Ab wann bin ich profitabel?"
- Deckungsbeitrag, Contribution Margin
- Sicherheitsmarge`,
  input_schema: {
    type: 'object' as const,
    properties: {
      fixed_costs: {
        type: 'number' as const,
        description: 'Fixkosten (Miete, Gehälter, etc.) in Euro',
      },
      variable_cost_per_unit: {
        type: 'number' as const,
        description: 'Variable Kosten pro verkaufter Einheit in Euro',
      },
      price_per_unit: {
        type: 'number' as const,
        description: 'Verkaufspreis pro Einheit in Euro',
      },
      current_sales_units: {
        type: 'number' as const,
        description: 'Aktuelle Verkaufsmenge (optional, für Sicherheitsmarge)',
      },
      target_profit: {
        type: 'number' as const,
        description: 'Zielgewinn in Euro (optional)',
      },
    },
    required: ['fixed_costs', 'variable_cost_per_unit', 'price_per_unit'],
  },
};
