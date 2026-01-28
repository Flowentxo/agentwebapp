/**
 * Dexter Financial Analyst Agent - Configuration
 *
 * Central configuration for Dexter using OpenAI GPT-4,
 * financial thresholds, and agent metadata
 */

import OpenAI from 'openai';

/**
 * OpenAI API Configuration for Dexter
 */
export const DEXTER_OPENAI_CONFIG = {
  apiKey: process.env.OPENAI_API_KEY!,
  model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
  temperature: 0.0, // Deterministic for financial calculations
  stream: true,
};

/**
 * Create OpenAI client instance
 */
export function createOpenAIClient(): OpenAI {
  return new OpenAI({
    apiKey: DEXTER_OPENAI_CONFIG.apiKey,
  });
}

/**
 * Financial Thresholds for analysis
 */
export const FINANCIAL_THRESHOLDS = {
  roi: {
    excellent: 20.0,
    good: 10.0,
    acceptable: 5.0,
  },
  margins: {
    gross: 40.0,
    net: 15.0,
    operating: 20.0,
  },
  liquidity: {
    currentRatio: 2.0,
    quickRatio: 1.0,
  },
  leverage: {
    debtToEquity: 1.5,
    debtToAssets: 0.5,
  },
  forecast: {
    confidenceThreshold: 0.75,
    minDataPoints: 3,
  },
} as const;

/**
 * Dexter Agent Metadata
 */
export const DEXTER_METADATA = {
  id: 'dexter',
  name: 'Dexter',
  role: 'Financial Analyst & Data Expert',
  version: '4.0.0', // Updated for OpenAI
  capabilities: [
    'ROI Calculator',
    'Sales Forecaster',
    'P&L Statement Generator',
    'Balance Sheet Analysis',
    'Cash Flow Statement',
    'Break-Even Analysis',
  ],
  description: 'Expert financial analyst powered by OpenAI GPT-4o-mini with specialized financial analysis tools',
  provider: 'OpenAI',
  model: DEXTER_OPENAI_CONFIG.model,
} as const;

/**
 * Output Formatting Configuration
 */
export const OUTPUT_CONFIG = {
  currency: {
    symbol: '€',
    decimals: 2,
  },
  percentage: {
    decimals: 2,
  },
  dateFormat: 'YYYY-MM-DD',
} as const;

/**
 * Format currency value
 */
export function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('de-DE', {
    minimumFractionDigits: OUTPUT_CONFIG.currency.decimals,
    maximumFractionDigits: OUTPUT_CONFIG.currency.decimals,
  })} ${OUTPUT_CONFIG.currency.symbol}`;
}

/**
 * Format percentage value
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(OUTPUT_CONFIG.percentage.decimals)}%`;
}

/**
 * Validate OpenAI API Key
 */
export function validateApiKey(): boolean {
  const key = DEXTER_OPENAI_CONFIG.apiKey;
  return Boolean(key && key.startsWith('sk-'));
}
