/**
 * Finn Finance Strategy Tools
 *
 * Financial strategy tools: portfolio risk analysis, loan rate comparison.
 */

// ─── analyze_portfolio_risk ──────────────────────────────────────

export interface AnalyzePortfolioInput {
  assets: Array<{
    name: string;
    type: string;
    value: number;
    sector?: string;
  }>;
}

export interface PortfolioRiskResult {
  total_value: number;
  diversification_score: number;
  risk_level: 'low' | 'medium' | 'high';
  sector_distribution: Array<{ sector: string; percentage: number; value: number }>;
  asset_type_distribution: Array<{ type: string; percentage: number; value: number }>;
  risk_metrics: {
    sharpe_ratio: number;
    value_at_risk_95: number;
    max_drawdown: number;
    beta: number;
    volatility: number;
  };
  recommendations: string[];
}

export const ANALYZE_PORTFOLIO_RISK_TOOL = {
  name: 'analyze_portfolio_risk',
  description: 'Analysiere das Risiko eines Portfolios. Berechnet Diversifikations-Score, Sektor-Verteilung und Risiko-Kennzahlen (Sharpe, VaR, Max Drawdown).',
  input_schema: {
    type: 'object',
    properties: {
      assets: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name des Assets' },
            type: { type: 'string', description: 'Typ (Aktie, ETF, Anleihe, Krypto, Immobilie, Rohstoff)' },
            value: { type: 'number', description: 'Aktueller Wert in EUR' },
            sector: { type: 'string', description: 'Sektor (Tech, Healthcare, Finance, etc.)' },
          },
          required: ['name', 'type', 'value'],
        },
        description: 'Liste der Portfolio-Assets',
      },
    },
    required: ['assets'],
  },
};

export async function analyzePortfolioRisk(input: AnalyzePortfolioInput): Promise<PortfolioRiskResult> {
  const { assets } = input;

  const totalValue = assets.reduce((sum, a) => sum + a.value, 0);

  // Sector distribution
  const sectorMap = new Map<string, number>();
  for (const asset of assets) {
    const sector = asset.sector || 'Sonstige';
    sectorMap.set(sector, (sectorMap.get(sector) || 0) + asset.value);
  }
  const sectorDistribution = Array.from(sectorMap.entries()).map(([sector, value]) => ({
    sector,
    percentage: Math.round((value / totalValue) * 1000) / 10,
    value,
  })).sort((a, b) => b.value - a.value);

  // Asset type distribution
  const typeMap = new Map<string, number>();
  for (const asset of assets) {
    typeMap.set(asset.type, (typeMap.get(asset.type) || 0) + asset.value);
  }
  const assetTypeDistribution = Array.from(typeMap.entries()).map(([type, value]) => ({
    type,
    percentage: Math.round((value / totalValue) * 1000) / 10,
    value,
  })).sort((a, b) => b.value - a.value);

  // Diversification score (0-100)
  const uniqueSectors = sectorMap.size;
  const uniqueTypes = typeMap.size;
  const assetCount = assets.length;
  const maxSectorConcentration = Math.max(...sectorDistribution.map(s => s.percentage));

  let diversificationScore = 0;
  diversificationScore += Math.min(30, assetCount * 5); // Up to 30 for number of assets
  diversificationScore += Math.min(25, uniqueSectors * 5); // Up to 25 for sector variety
  diversificationScore += Math.min(20, uniqueTypes * 7); // Up to 20 for type variety
  diversificationScore += Math.max(0, 25 - (maxSectorConcentration - 20) * 0.5); // Penalty for concentration
  diversificationScore = Math.min(100, Math.max(0, Math.round(diversificationScore)));

  // Risk level
  const riskLevel = diversificationScore >= 65 ? 'low' : diversificationScore >= 35 ? 'medium' : 'high';

  // Mock risk metrics
  const hasCrypto = assets.some(a => a.type.toLowerCase().includes('krypto') || a.type.toLowerCase().includes('crypto'));
  const hasEquities = assets.some(a => a.type.toLowerCase().includes('aktie') || a.type.toLowerCase().includes('etf'));

  const baseVolatility = hasCrypto ? 0.25 : hasEquities ? 0.15 : 0.08;
  const volatility = baseVolatility + (1 - diversificationScore / 100) * 0.1;

  const recommendations: string[] = [];
  if (maxSectorConcentration > 40) recommendations.push(`Sektorkonzentration reduzieren: ${sectorDistribution[0].sector} hat ${maxSectorConcentration}%`);
  if (uniqueTypes < 3) recommendations.push('Mehr Asset-Klassen hinzufuegen (Anleihen, Immobilien, Rohstoffe)');
  if (hasCrypto && typeMap.get('Krypto')! / totalValue > 0.2) recommendations.push('Krypto-Anteil auf unter 20% reduzieren');
  if (!assets.some(a => a.type.toLowerCase().includes('anleihe'))) recommendations.push('Anleihen als Stabilitaetskomponente hinzufuegen');
  if (assetCount < 5) recommendations.push('Mindestens 5-10 verschiedene Assets fuer bessere Diversifikation');
  if (diversificationScore >= 65) recommendations.push('Portfolio ist gut diversifiziert - regelmaessiges Rebalancing empfohlen');

  return {
    total_value: totalValue,
    diversification_score: diversificationScore,
    risk_level: riskLevel,
    sector_distribution: sectorDistribution,
    asset_type_distribution: assetTypeDistribution,
    risk_metrics: {
      sharpe_ratio: Math.round((0.8 + diversificationScore / 100 * 1.2) * 100) / 100,
      value_at_risk_95: Math.round(totalValue * volatility * 1.65 * 100) / 100,
      max_drawdown: Math.round((15 + (1 - diversificationScore / 100) * 25) * 10) / 10,
      beta: Math.round((0.8 + Math.random() * 0.4) * 100) / 100,
      volatility: Math.round(volatility * 10000) / 100,
    },
    recommendations,
  };
}

// ─── compare_loan_rates ──────────────────────────────────────────

export interface CompareLoanInput {
  amount: number;
  duration_months: number;
  type?: 'personal' | 'mortgage' | 'business' | 'car';
}

export interface LoanComparisonResult {
  amount: number;
  duration_months: number;
  loan_type: string;
  offers: Array<{
    bank: string;
    interest_rate: number;
    monthly_payment: number;
    total_cost: number;
    total_interest: number;
    effective_rate: number;
    special_conditions: string;
  }>;
  best_offer: string;
  savings_vs_worst: number;
}

export const COMPARE_LOAN_RATES_TOOL = {
  name: 'compare_loan_rates',
  description: 'Vergleiche Kreditkonditionen von verschiedenen Banken. Berechnet Monatsrate, Gesamtkosten und Zinsen fuer einen bestimmten Betrag und Laufzeit.',
  input_schema: {
    type: 'object',
    properties: {
      amount: {
        type: 'number',
        description: 'Kreditbetrag in EUR',
      },
      duration_months: {
        type: 'number',
        description: 'Laufzeit in Monaten (z.B. 12, 24, 36, 48, 60)',
      },
      type: {
        type: 'string',
        enum: ['personal', 'mortgage', 'business', 'car'],
        description: 'Kreditart (default: "personal")',
      },
    },
    required: ['amount', 'duration_months'],
  },
};

const MOCK_BANKS = [
  { name: 'Deutsche Kredit AG', baseRate: 3.49, special: 'Sondertilgung bis 10% p.a. kostenfrei' },
  { name: 'FinanzDirekt Bank', baseRate: 3.89, special: 'Keine Bearbeitungsgebuehren, 100% online' },
  { name: 'Sparkasse Digital', baseRate: 4.19, special: 'Flexible Ratenanpassung, persoenliche Beratung' },
  { name: 'N26 Business', baseRate: 4.49, special: 'Sofortzusage in 5 Minuten, App-basiert' },
];

const TYPE_MODIFIERS: Record<string, number> = {
  personal: 0,
  mortgage: -1.5,
  business: 0.5,
  car: -0.3,
};

export async function compareLoanRates(input: CompareLoanInput): Promise<LoanComparisonResult> {
  const { amount, duration_months, type = 'personal' } = input;
  const modifier = TYPE_MODIFIERS[type] || 0;

  // Duration affects rate: longer = slightly higher
  const durationModifier = (duration_months - 12) * 0.01;

  const offers = MOCK_BANKS.map(bank => {
    const rate = Math.round((bank.baseRate + modifier + durationModifier + (Math.random() * 0.3 - 0.15)) * 100) / 100;
    const effectiveRate = Math.round((rate + 0.1 + Math.random() * 0.2) * 100) / 100;

    // Monthly payment calculation (annuity formula)
    const monthlyRate = rate / 100 / 12;
    const monthlyPayment = monthlyRate > 0
      ? Math.round(amount * (monthlyRate * Math.pow(1 + monthlyRate, duration_months)) / (Math.pow(1 + monthlyRate, duration_months) - 1) * 100) / 100
      : Math.round(amount / duration_months * 100) / 100;

    const totalCost = Math.round(monthlyPayment * duration_months * 100) / 100;
    const totalInterest = Math.round((totalCost - amount) * 100) / 100;

    return {
      bank: bank.name,
      interest_rate: rate,
      monthly_payment: monthlyPayment,
      total_cost: totalCost,
      total_interest: totalInterest,
      effective_rate: effectiveRate,
      special_conditions: bank.special,
    };
  }).sort((a, b) => a.total_cost - b.total_cost);

  const bestOffer = offers[0];
  const worstOffer = offers[offers.length - 1];

  return {
    amount,
    duration_months,
    loan_type: type,
    offers,
    best_offer: bestOffer.bank,
    savings_vs_worst: Math.round((worstOffer.total_cost - bestOffer.total_cost) * 100) / 100,
  };
}
