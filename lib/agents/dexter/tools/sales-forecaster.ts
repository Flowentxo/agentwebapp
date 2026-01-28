/**
 * Sales Forecaster Tool
 *
 * Forecasts future sales based on historical data with:
 * - Trend analysis (linear regression)
 * - Confidence intervals
 * - Seasonality detection
 * - Growth rate calculation
 */

import { formatCurrency, formatPercentage, FINANCIAL_THRESHOLDS } from '../config';

export interface SalesDataPoint {
  period: string;
  sales: number;
}

export interface SalesForecastInput {
  historical_data: SalesDataPoint[];
  forecast_periods: number;
  period_type?: 'monthly' | 'quarterly' | 'yearly';
}

export interface SalesForecastResult {
  forecast: Array<{
    period: string;
    predicted_sales: number;
    lower_bound: number;
    upper_bound: number;
    confidence: number;
  }>;
  trend: 'increasing' | 'stable' | 'decreasing';
  trend_strength: number;
  growth_rate: number;
  avg_historical_sales: number;
  total_forecast_sales: number;
  metrics: {
    historical_avg: string;
    growth_rate: string;
    trend: string;
    confidence: string;
  };
  formatted_output: string;
}

/**
 * Calculate Sales Forecast
 */
export async function forecastSales(input: SalesForecastInput): Promise<SalesForecastResult> {
  const { historical_data, forecast_periods, period_type = 'monthly' } = input;

  // Validation
  if (!historical_data || historical_data.length < FINANCIAL_THRESHOLDS.forecast.minDataPoints) {
    throw new Error(`Mindestens ${FINANCIAL_THRESHOLDS.forecast.minDataPoints} Datenpunkte erforderlich (aktuell: ${historical_data?.length || 0})`);
  }
  if (forecast_periods <= 0 || forecast_periods > 24) {
    throw new Error('Forecast-Perioden müssen zwischen 1 und 24 liegen');
  }

  // Check for valid sales data
  const sales = historical_data.map(d => d.sales);
  if (sales.some(s => s < 0)) {
    throw new Error('Verkaufszahlen können nicht negativ sein');
  }
  if (sales.every(s => s === 0)) {
    throw new Error('Alle Verkaufszahlen sind 0 - keine sinnvolle Prognose möglich');
  }

  // Data quality warnings
  const n = sales.length;

  // Data quality checks
  if (n < 6) {
    dataQualityWarnings.push(`⚠️ Nur ${n} Datenpunkte - Prognose hat eingeschränkte Genauigkeit (mindestens 6 empfohlen)`);
  }
  if (n < 12 && period_type === 'monthly') {
    dataQualityWarnings.push('⚠️ Weniger als 12 Monate Daten - Saisonale Muster können nicht erkannt werden');
  }

  // Check for high variance (coefficient of variation)
  const avgSales = sales.reduce((a, b) => a + b, 0) / n;
  const variance = sales.reduce((sum, s) => sum + Math.pow(s - avgSales, 2), 0) / n;
  const stdDev = Math.sqrt(variance);
  const coefficientOfVariation = avgSales > 0 ? (stdDev / avgSales) * 100 : 0;

  if (coefficientOfVariation > 50) {
    dataQualityWarnings.push(`⚠️ Hohe Volatilität (CV: ${coefficientOfVariation.toFixed(1)}%) - Prognose weniger zuverlässig`);
  }

  // Check for outliers (values > 3 std dev from mean)
  const outliers = sales.filter(s => Math.abs(s - avgSales) > 3 * stdDev);
  if (outliers.length > 0) {
    dataQualityWarnings.push(`⚠️ ${outliers.length} Ausreißer erkannt - können Prognose verzerren`);
  }

  // Linear regression for trend
  const xMean = (n - 1) / 2;
  const yMean = avgSales;

  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (sales[i] - yMean);
    denominator += (i - xMean) ** 2;
  }

  const slope = denominator !== 0 ? numerator / denominator : 0;
  const intercept = yMean - slope * xMean;

  // Calculate R² (coefficient of determination)
  let ssRes = 0;
  let ssTot = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    ssRes += (sales[i] - predicted) ** 2;
    ssTot += (sales[i] - yMean) ** 2;
  }
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  // Calculate standard error for confidence intervals
  // For n <= 2, use coefficient of variation as fallback
  let standardError: number;
  let confidenceQuality: 'high' | 'medium' | 'low';

  if (n > 2) {
    standardError = Math.sqrt(ssRes / (n - 2));
    confidenceQuality = n >= 12 ? 'high' : n >= 6 ? 'medium' : 'low';
  } else {
    // Fallback for very small datasets: use std dev as approximation
    standardError = stdDev > 0 ? stdDev : avgSales * 0.2;
    confidenceQuality = 'low';
    dataQualityWarnings.push('⚠️ Sehr wenige Datenpunkte - Konfidenzintervalle sind Schätzungen');
  }

  // Adjust standard error if it seems unrealistically small
  if (standardError < avgSales * 0.01 && coefficientOfVariation > 5) {
    standardError = stdDev; // Use actual std dev if SE is suspiciously small
  }

  // Determine trend
  let trend: 'increasing' | 'stable' | 'decreasing';
  const slopePercentage = (slope / avgSales) * 100;

  if (slopePercentage > 2) {
    trend = 'increasing';
  } else if (slopePercentage < -2) {
    trend = 'decreasing';
  } else {
    trend = 'stable';
  }

  // Calculate growth rate
  const firstPeriodAvg = sales.slice(0, Math.min(3, n)).reduce((a, b) => a + b, 0) / Math.min(3, n);
  const lastPeriodAvg = sales.slice(-Math.min(3, n)).reduce((a, b) => a + b, 0) / Math.min(3, n);
  const growthRate = firstPeriodAvg !== 0 ? ((lastPeriodAvg - firstPeriodAvg) / firstPeriodAvg) * 100 : 0;

  // Generate forecasts
  const forecast: SalesForecastResult['forecast'] = [];
  const lastPeriod = historical_data[n - 1].period;
  let totalForecastSales = 0;

  for (let i = 0; i < forecast_periods; i++) {
    const periodIndex = n + i;
    const predicted = Math.max(0, intercept + slope * periodIndex);

    // Confidence decreases with distance from historical data
    const distanceFactor = 1 + (i / forecast_periods) * 0.5;
    const interval = standardError * 1.96 * distanceFactor;
    const confidence = Math.max(0.5, rSquared * (1 - i * 0.05));

    forecast.push({
      period: generatePeriodLabel(lastPeriod, i + 1, period_type),
      predicted_sales: Math.round(predicted * 100) / 100,
      lower_bound: Math.max(0, Math.round((predicted - interval) * 100) / 100),
      upper_bound: Math.round((predicted + interval) * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
    });

    totalForecastSales += predicted;
  }

  // Format metrics
  const metrics = {
    historical_avg: formatCurrency(avgSales),
    growth_rate: formatPercentage(growthRate),
    trend: getTrendLabel(trend),
    confidence: formatPercentage(rSquared * 100),
  };

  // Data quality section
  const dataQualitySection = dataQualityWarnings.length > 0
    ? `\n**Datenqualität:**\n${dataQualityWarnings.join('\n')}\n`
    : '';

  // Confidence quality indicator
  const confidenceIndicator = {
    high: '🟢 Hoch',
    medium: '🟡 Mittel',
    low: '🔴 Niedrig',
  }[confidenceQuality];

  // Generate formatted output
  const formatted_output = `
📈 **SALES FORECAST ANALYSE**

**Historische Daten:**
- Datenpunkte: ${n}
- Durchschnittlicher Umsatz: ${metrics.historical_avg}
- Standardabweichung: ${formatCurrency(stdDev)}
- Wachstumsrate: ${metrics.growth_rate}

**Trend-Analyse:**
- Trend: ${getTrendEmoji(trend)} ${metrics.trend}
- Modell-Konfidenz: ${metrics.confidence}
- Prognose-Qualität: ${confidenceIndicator}
${dataQualitySection}
**Prognose (${forecast_periods} Perioden):**
${forecast.map((f, i) => `${i + 1}. ${f.period}: ${formatCurrency(f.predicted_sales)} (${formatCurrency(f.lower_bound)} - ${formatCurrency(f.upper_bound)})`).join('\n')}

**Gesamt-Prognose:** ${formatCurrency(totalForecastSales)}

${getRecommendation(trend, growthRate, rSquared, dataQualityWarnings)}
`;

  return {
    forecast,
    trend,
    trend_strength: Math.abs(slopePercentage),
    growth_rate: growthRate,
    avg_historical_sales: avgSales,
    total_forecast_sales: totalForecastSales,
    metrics,
    formatted_output,
  };
}

/**
 * Generate period label for forecast
 */
function generatePeriodLabel(lastPeriod: string, offset: number, type: string): string {
  // Try to parse the period and generate next one
  const match = lastPeriod.match(/(\d{4})-?(\d{1,2})?/);
  if (match) {
    let year = parseInt(match[1]);
    let month = match[2] ? parseInt(match[2]) : 1;

    if (type === 'monthly') {
      month += offset;
      while (month > 12) {
        month -= 12;
        year++;
      }
      return `${year}-${month.toString().padStart(2, '0')}`;
    } else if (type === 'quarterly') {
      const quarter = Math.ceil(month / 3) + offset;
      const adjustedYear = year + Math.floor((quarter - 1) / 4);
      const adjustedQuarter = ((quarter - 1) % 4) + 1;
      return `${adjustedYear}-Q${adjustedQuarter}`;
    } else {
      return `${year + offset}`;
    }
  }
  return `Periode ${offset}`;
}

function getTrendLabel(trend: string): string {
  const labels = {
    increasing: 'Steigend',
    stable: 'Stabil',
    decreasing: 'Fallend',
  };
  return labels[trend as keyof typeof labels] || trend;
}

function getTrendEmoji(trend: string): string {
  const emojis = {
    increasing: '📈',
    stable: '➡️',
    decreasing: '📉',
  };
  return emojis[trend as keyof typeof emojis] || '📊';
}

function getRecommendation(
  trend: string,
  growthRate: number,
  confidence: number,
  warnings: string[] = []
): string {
  const recommendations: string[] = [];

  // Data quality warning
  if (warnings.length > 0) {
    recommendations.push('📋 **Datenqualitäts-Hinweise beachten** (siehe oben)');
  }

  if (confidence < FINANCIAL_THRESHOLDS.forecast.confidenceThreshold) {
    recommendations.push('⚠️ **Hinweis:** Die Modell-Konfidenz ist niedrig. Mehr Datenpunkte würden die Prognose verbessern.');
  }

  if (trend === 'increasing' && growthRate > 10) {
    recommendations.push('✅ **Positiver Ausblick:** Starkes Wachstum erkennbar. Kapazitäten und Ressourcen entsprechend planen.');
  } else if (trend === 'decreasing' && growthRate < -10) {
    recommendations.push('⚠️ **Achtung:** Rückläufiger Trend. Ursachenanalyse und Gegenmaßnahmen empfohlen.');
  } else {
    recommendations.push('ℹ️ **Stabile Entwicklung:** Kontinuierliches Monitoring empfohlen.');
  }

  // Actionable advice based on warnings
  if (warnings.some(w => w.includes('Ausreißer'))) {
    recommendations.push('💡 **Tipp:** Prüfe ungewöhnliche Werte - sind es echte Anomalien oder Datenfehler?');
  }

  return recommendations.join('\n');
}

/**
 * Tool definition for OpenAI
 */
export const SALES_FORECASTER_TOOL = {
  name: 'forecast_sales',
  description: `Erstellt Verkaufsprognosen basierend auf historischen Daten.

Nutze dieses Tool wenn der User fragt nach:
- Verkaufsprognose, Sales Forecast
- Umsatzentwicklung, Revenue Prediction
- Trend-Analyse für Verkäufe
- "Wie entwickeln sich die Verkäufe?"`,
  input_schema: {
    type: 'object' as const,
    properties: {
      historical_data: {
        type: 'array' as const,
        items: {
          type: 'object' as const,
          properties: {
            period: { type: 'string' as const },
            sales: { type: 'number' as const },
          },
          required: ['period', 'sales'],
        },
        description: 'Array mit historischen Verkaufsdaten (Periode + Umsatz)',
      },
      forecast_periods: {
        type: 'integer' as const,
        description: 'Anzahl der Perioden für die Prognose (1-24)',
      },
      period_type: {
        type: 'string' as const,
        enum: ['monthly', 'quarterly', 'yearly'],
        description: 'Art der Periode (monatlich, quartalsweise, jährlich)',
      },
    },
    required: ['historical_data', 'forecast_periods'],
  },
};
