/**
 * Balance Sheet Generator Tool
 *
 * Generates balance sheet with:
 * - Assets (current & non-current)
 * - Liabilities (current & long-term)
 * - Equity
 * - Key financial ratios
 */

import { formatCurrency, formatPercentage, FINANCIAL_THRESHOLDS } from '../config';

export interface BalanceSheetInput {
  assets: {
    current_assets: number;
    non_current_assets: number;
    details?: {
      cash?: number;
      receivables?: number;
      inventory?: number;
      property_plant_equipment?: number;
      intangibles?: number;
    };
  };
  liabilities: {
    current_liabilities: number;
    long_term_liabilities: number;
    details?: {
      accounts_payable?: number;
      short_term_debt?: number;
      long_term_debt?: number;
    };
  };
  equity: number;
  period?: string;
}

export interface BalanceSheetResult {
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
  ratios: {
    current_ratio: number;
    quick_ratio: number | null;
    debt_to_equity: number;
    debt_to_assets: number;
    equity_ratio: number;
  };
  health_status: 'excellent' | 'good' | 'acceptable' | 'concerning' | 'critical';
  metrics: {
    total_assets: string;
    total_liabilities: string;
    total_equity: string;
    current_ratio: string;
    debt_to_equity: string;
    equity_ratio: string;
  };
  formatted_output: string;
}

/**
 * Validation warnings for balance sheet
 */
interface BalanceSheetValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive balance sheet validation
 */
function validateBalanceSheetInput(input: BalanceSheetInput): BalanceSheetValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { assets, liabilities, equity } = input;

  // Required field validation
  if (assets.current_assets === undefined || assets.current_assets === null) {
    errors.push('Umlaufvermögen (current_assets) ist erforderlich');
  }
  if (assets.non_current_assets === undefined || assets.non_current_assets === null) {
    errors.push('Anlagevermögen (non_current_assets) ist erforderlich');
  }
  if (liabilities.current_liabilities === undefined || liabilities.current_liabilities === null) {
    errors.push('Kurzfristige Verbindlichkeiten (current_liabilities) sind erforderlich');
  }
  if (liabilities.long_term_liabilities === undefined || liabilities.long_term_liabilities === null) {
    errors.push('Langfristige Verbindlichkeiten (long_term_liabilities) sind erforderlich');
  }
  if (equity === undefined || equity === null) {
    errors.push('Eigenkapital (equity) ist erforderlich');
  }

  // Negative values check
  if (assets.current_assets < 0) {
    errors.push('Umlaufvermögen kann nicht negativ sein');
  }
  if (assets.non_current_assets < 0) {
    errors.push('Anlagevermögen kann nicht negativ sein');
  }
  if (liabilities.current_liabilities < 0) {
    errors.push('Kurzfristige Verbindlichkeiten können nicht negativ sein');
  }
  if (liabilities.long_term_liabilities < 0) {
    errors.push('Langfristige Verbindlichkeiten können nicht negativ sein');
  }

  // Detail consistency validation
  if (assets.details) {
    const detailSum =
      (assets.details.cash || 0) +
      (assets.details.receivables || 0) +
      (assets.details.inventory || 0);

    // Check if current asset details exceed current_assets total
    if (detailSum > assets.current_assets * 1.01) { // 1% tolerance for rounding
      warnings.push(`Detailsumme Umlaufvermögen (${detailSum.toFixed(2)}) übersteigt current_assets (${assets.current_assets.toFixed(2)})`);
    }

    // Check individual detail values
    if (assets.details.cash !== undefined && assets.details.cash < 0) {
      errors.push('Liquide Mittel (cash) können nicht negativ sein');
    }
    if (assets.details.receivables !== undefined && assets.details.receivables < 0) {
      errors.push('Forderungen (receivables) können nicht negativ sein');
    }
    if (assets.details.inventory !== undefined && assets.details.inventory < 0) {
      errors.push('Vorräte (inventory) können nicht negativ sein');
    }

    // Non-current asset details
    const nonCurrentDetailSum =
      (assets.details.property_plant_equipment || 0) +
      (assets.details.intangibles || 0);

    if (nonCurrentDetailSum > assets.non_current_assets * 1.01) {
      warnings.push(`Detailsumme Anlagevermögen (${nonCurrentDetailSum.toFixed(2)}) übersteigt non_current_assets (${assets.non_current_assets.toFixed(2)})`);
    }
  }

  // Liability detail consistency
  if (liabilities.details) {
    const currentLiabDetailSum =
      (liabilities.details.accounts_payable || 0) +
      (liabilities.details.short_term_debt || 0);

    if (currentLiabDetailSum > liabilities.current_liabilities * 1.01) {
      warnings.push(`Kurzfristige Verbindlichkeiten Details übersteigen Gesamtsumme`);
    }

    if (liabilities.details.accounts_payable !== undefined && liabilities.details.accounts_payable < 0) {
      errors.push('Verbindlichkeiten aus L&L können nicht negativ sein');
    }
    if (liabilities.details.short_term_debt !== undefined && liabilities.details.short_term_debt < 0) {
      errors.push('Kurzfristige Kredite können nicht negativ sein');
    }
    if (liabilities.details.long_term_debt !== undefined && liabilities.details.long_term_debt < 0) {
      errors.push('Langfristige Darlehen können nicht negativ sein');
    }
  }

  // Balance sheet equation check (preliminary)
  const totalAssets = assets.current_assets + assets.non_current_assets;
  const totalLiabilities = liabilities.current_liabilities + liabilities.long_term_liabilities;
  const expectedEquity = totalAssets - totalLiabilities;
  const equityDifference = Math.abs(expectedEquity - equity);
  const tolerancePercent = totalAssets > 0 ? (equityDifference / totalAssets) * 100 : 0;

  if (equityDifference > 0.01) { // More than 1 cent difference
    if (tolerancePercent > 5) {
      errors.push(`Bilanz ist nicht ausgeglichen! Differenz: ${equityDifference.toFixed(2)}€ (${tolerancePercent.toFixed(1)}%)`);
    } else {
      warnings.push(`Geringfügige Bilanz-Differenz: ${equityDifference.toFixed(2)}€ (${tolerancePercent.toFixed(2)}%) - möglicherweise Rundung`);
    }
  }

  // Extreme values check
  const maxReasonableValue = 1e15; // 1 quadrillion (more than world GDP)
  if (totalAssets > maxReasonableValue) {
    warnings.push('Vermögenswerte scheinen ungewöhnlich hoch zu sein - bitte überprüfen');
  }
  if (totalLiabilities > maxReasonableValue) {
    warnings.push('Verbindlichkeiten scheinen ungewöhnlich hoch zu sein - bitte überprüfen');
  }

  // Zero values check
  if (totalAssets === 0 && totalLiabilities === 0 && equity === 0) {
    warnings.push('Alle Werte sind 0 - leere Bilanz');
  }

  // Negative equity warning (not necessarily an error)
  if (equity < 0) {
    warnings.push(`Negatives Eigenkapital (${equity.toFixed(2)}€) - Unternehmen ist bilanziell überschuldet`);
  }

  // Unusual ratios
  if (totalAssets > 0 && equity > 0 && (equity / totalAssets) > 1) {
    warnings.push('Eigenkapital übersteigt Gesamtvermögen - bitte Daten prüfen');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate Balance Sheet
 */
export async function generateBalanceSheet(input: BalanceSheetInput): Promise<BalanceSheetResult> {
  const { assets, liabilities, equity, period = 'Stichtag' } = input;

  // Comprehensive validation
  const validation = validateBalanceSheetInput(input);

  if (!validation.isValid) {
    throw new Error(`Validierungsfehler:\n- ${validation.errors.join('\n- ')}`);
  }

  // Store validation warnings for output
  const validationWarnings = validation.warnings;

  // Legacy validation (kept for backwards compatibility)
  if (assets.current_assets < 0 || assets.non_current_assets < 0) {
    throw new Error('Vermögenswerte können nicht negativ sein');
  }
  if (liabilities.current_liabilities < 0 || liabilities.long_term_liabilities < 0) {
    throw new Error('Verbindlichkeiten können nicht negativ sein');
  }

  // Calculations
  const total_assets = assets.current_assets + assets.non_current_assets;
  const total_liabilities = liabilities.current_liabilities + liabilities.long_term_liabilities;
  const total_equity = equity;

  // Check if balanced (Assets = Liabilities + Equity)
  const expected_equity = total_assets - total_liabilities;
  const is_balanced = Math.abs(expected_equity - equity) < 0.01;

  // Calculate ratios
  const current_ratio = liabilities.current_liabilities > 0
    ? assets.current_assets / liabilities.current_liabilities
    : assets.current_assets > 0 ? 999 : 0;

  // Quick ratio (if we have inventory data)
  let quick_ratio: number | null = null;
  if (assets.details?.inventory !== undefined && liabilities.current_liabilities > 0) {
    quick_ratio = (assets.current_assets - assets.details.inventory) / liabilities.current_liabilities;
  }

  const debt_to_equity = equity > 0 ? total_liabilities / equity : 999;
  const debt_to_assets = total_assets > 0 ? total_liabilities / total_assets : 0;
  const equity_ratio = total_assets > 0 ? (equity / total_assets) * 100 : 0;

  // Health status evaluation
  let health_status: BalanceSheetResult['health_status'];
  if (
    current_ratio >= FINANCIAL_THRESHOLDS.liquidity.currentRatio &&
    debt_to_equity <= FINANCIAL_THRESHOLDS.leverage.debtToEquity &&
    equity_ratio >= 30
  ) {
    health_status = 'excellent';
  } else if (
    current_ratio >= 1.5 &&
    debt_to_equity <= 2 &&
    equity_ratio >= 25
  ) {
    health_status = 'good';
  } else if (
    current_ratio >= 1 &&
    debt_to_equity <= 3 &&
    equity_ratio >= 15
  ) {
    health_status = 'acceptable';
  } else if (current_ratio >= 0.8 && equity > 0) {
    health_status = 'concerning';
  } else {
    health_status = 'critical';
  }

  // Format metrics
  const metrics = {
    total_assets: formatCurrency(total_assets),
    total_liabilities: formatCurrency(total_liabilities),
    total_equity: formatCurrency(total_equity),
    current_ratio: current_ratio.toFixed(2),
    debt_to_equity: debt_to_equity.toFixed(2),
    equity_ratio: formatPercentage(equity_ratio),
  };

  // Generate formatted output
  const formatted_output = `
📋 **BILANZ (Balance Sheet)**
${period}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                         **AKTIVA**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**UMLAUFVERMÖGEN**                    ${formatCurrency(assets.current_assets)}
${assets.details?.cash !== undefined ? `  Liquide Mittel                     ${formatCurrency(assets.details.cash)}` : ''}
${assets.details?.receivables !== undefined ? `  Forderungen                        ${formatCurrency(assets.details.receivables)}` : ''}
${assets.details?.inventory !== undefined ? `  Vorräte                            ${formatCurrency(assets.details.inventory)}` : ''}

**ANLAGEVERMÖGEN**                    ${formatCurrency(assets.non_current_assets)}
${assets.details?.property_plant_equipment !== undefined ? `  Sachanlagen                        ${formatCurrency(assets.details.property_plant_equipment)}` : ''}
${assets.details?.intangibles !== undefined ? `  Immaterielle Vermögenswerte        ${formatCurrency(assets.details.intangibles)}` : ''}
                                      ─────────────────
**SUMME AKTIVA**                      ${metrics.total_assets}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                        **PASSIVA**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**KURZFRISTIGE VERBINDLICHKEITEN**    ${formatCurrency(liabilities.current_liabilities)}
${liabilities.details?.accounts_payable !== undefined ? `  Verbindlichkeiten aus L&L          ${formatCurrency(liabilities.details.accounts_payable)}` : ''}
${liabilities.details?.short_term_debt !== undefined ? `  Kurzfristige Kredite               ${formatCurrency(liabilities.details.short_term_debt)}` : ''}

**LANGFRISTIGE VERBINDLICHKEITEN**    ${formatCurrency(liabilities.long_term_liabilities)}
${liabilities.details?.long_term_debt !== undefined ? `  Langfristige Darlehen              ${formatCurrency(liabilities.details.long_term_debt)}` : ''}
                                      ─────────────────
**SUMME VERBINDLICHKEITEN**           ${metrics.total_liabilities}

**EIGENKAPITAL**                      ${metrics.total_equity}
                                      ─────────────────
**SUMME PASSIVA**                     ${formatCurrency(total_liabilities + total_equity)}

${!is_balanced ? `⚠️ ACHTUNG: Bilanz ist nicht ausgeglichen! Differenz: ${formatCurrency(expected_equity - equity)}` : ''}
${validationWarnings.length > 0 ? `\n**Datenqualitäts-Hinweise:**\n${validationWarnings.map(w => `⚠️ ${w}`).join('\n')}` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                     **KENNZAHLEN**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Liquidität:**
  Current Ratio                       ${metrics.current_ratio} ${getRatioIndicator(current_ratio, FINANCIAL_THRESHOLDS.liquidity.currentRatio)}
${quick_ratio !== null ? `  Quick Ratio                         ${quick_ratio.toFixed(2)} ${getRatioIndicator(quick_ratio, FINANCIAL_THRESHOLDS.liquidity.quickRatio)}` : ''}

**Kapitalstruktur:**
  Debt-to-Equity                      ${metrics.debt_to_equity} ${getRatioIndicator(FINANCIAL_THRESHOLDS.leverage.debtToEquity, debt_to_equity)}
  Eigenkapitalquote                   ${metrics.equity_ratio} ${equity_ratio >= 30 ? '✅' : equity_ratio >= 20 ? '⚠️' : '❌'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**STATUS:** ${getStatusEmoji(health_status)} ${getStatusLabel(health_status)}

${getBalanceSheetRecommendations(current_ratio, debt_to_equity, equity_ratio, health_status)}
`;

  return {
    total_assets,
    total_liabilities,
    total_equity,
    is_balanced,
    ratios: {
      current_ratio,
      quick_ratio,
      debt_to_equity,
      debt_to_assets,
      equity_ratio,
    },
    health_status,
    metrics,
    formatted_output,
  };
}

function getRatioIndicator(value: number, threshold: number): string {
  if (value >= threshold) return '✅';
  if (value >= threshold * 0.7) return '⚠️';
  return '❌';
}

function getStatusEmoji(status: BalanceSheetResult['health_status']): string {
  const emojis = {
    excellent: '🌟',
    good: '✅',
    acceptable: '⚠️',
    concerning: '⚠️',
    critical: '❌',
  };
  return emojis[status];
}

function getStatusLabel(status: BalanceSheetResult['health_status']): string {
  const labels = {
    excellent: 'Exzellente Finanzstruktur',
    good: 'Gute Finanzstruktur',
    acceptable: 'Akzeptable Finanzstruktur',
    concerning: 'Bedenkliche Finanzstruktur',
    critical: 'Kritische Finanzstruktur',
  };
  return labels[status];
}

function getBalanceSheetRecommendations(
  currentRatio: number,
  debtToEquity: number,
  equityRatio: number,
  status: BalanceSheetResult['health_status']
): string {
  const recommendations: string[] = ['**ANALYSE & EMPFEHLUNGEN:**'];

  // Liquidity analysis
  if (currentRatio < FINANCIAL_THRESHOLDS.liquidity.currentRatio) {
    recommendations.push(`⚠️ Current Ratio unter Zielwert (${FINANCIAL_THRESHOLDS.liquidity.currentRatio})`);
    recommendations.push('  → Umlaufvermögen erhöhen oder kurzfristige Schulden reduzieren');
  } else {
    recommendations.push('✅ Gute kurzfristige Liquidität');
  }

  // Leverage analysis
  if (debtToEquity > FINANCIAL_THRESHOLDS.leverage.debtToEquity) {
    recommendations.push(`⚠️ Verschuldungsgrad über Zielwert (${FINANCIAL_THRESHOLDS.leverage.debtToEquity})`);
    recommendations.push('  → Eigenkapital stärken oder Fremdkapital reduzieren');
  } else {
    recommendations.push('✅ Gesunder Verschuldungsgrad');
  }

  // Equity analysis
  if (equityRatio < 20) {
    recommendations.push('⚠️ Niedrige Eigenkapitalquote - erhöhtes Risiko');
  } else if (equityRatio > 50) {
    recommendations.push('ℹ️ Hohe Eigenkapitalquote - ggf. Leverage-Potential nutzen');
  }

  if (status === 'critical') {
    recommendations.push('');
    recommendations.push('❌ **DRINGEND:** Finanzielle Restrukturierung empfohlen');
  }

  return recommendations.join('\n');
}

/**
 * Tool definition for OpenAI
 */
export const BALANCE_SHEET_GENERATOR_TOOL = {
  name: 'generate_balance_sheet',
  description: `Erstellt eine Bilanz mit Vermögens-, Schulden- und Eigenkapitalanalyse.

Nutze dieses Tool wenn der User fragt nach:
- Bilanz, Balance Sheet
- Vermögensübersicht, Aktiva/Passiva
- Finanzkennzahlen (Current Ratio, Debt-to-Equity)
- "Wie ist unsere Finanzstruktur?"`,
  input_schema: {
    type: 'object' as const,
    properties: {
      assets: {
        type: 'object' as const,
        properties: {
          current_assets: {
            type: 'number' as const,
            description: 'Umlaufvermögen in Euro',
          },
          non_current_assets: {
            type: 'number' as const,
            description: 'Anlagevermögen in Euro',
          },
          details: {
            type: 'object' as const,
            properties: {
              cash: { type: 'number' as const },
              receivables: { type: 'number' as const },
              inventory: { type: 'number' as const },
              property_plant_equipment: { type: 'number' as const },
              intangibles: { type: 'number' as const },
            },
            description: 'Detaillierte Aufschlüsselung (optional)',
          },
        },
        required: ['current_assets', 'non_current_assets'],
      },
      liabilities: {
        type: 'object' as const,
        properties: {
          current_liabilities: {
            type: 'number' as const,
            description: 'Kurzfristige Verbindlichkeiten in Euro',
          },
          long_term_liabilities: {
            type: 'number' as const,
            description: 'Langfristige Verbindlichkeiten in Euro',
          },
          details: {
            type: 'object' as const,
            properties: {
              accounts_payable: { type: 'number' as const },
              short_term_debt: { type: 'number' as const },
              long_term_debt: { type: 'number' as const },
            },
            description: 'Detaillierte Aufschlüsselung (optional)',
          },
        },
        required: ['current_liabilities', 'long_term_liabilities'],
      },
      equity: {
        type: 'number' as const,
        description: 'Eigenkapital in Euro',
      },
      period: {
        type: 'string' as const,
        description: 'Stichtag (z.B. "31.12.2024")',
      },
    },
    required: ['assets', 'liabilities', 'equity'],
  },
};
