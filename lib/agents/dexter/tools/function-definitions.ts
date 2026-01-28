/**
 * OpenAI Function Definitions for Dexter Tools
 *
 * Defines all financial analysis tools in OpenAI function calling format
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * ROI Calculator Function Definition
 */
export const ROI_CALCULATOR_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'calculate_roi',
    description: 'Berechnet Return on Investment (ROI) mit detaillierter Finanzanalyse einschließlich Amortisationszeit, Nettogewinn und Renditeempfehlung',
    parameters: {
      type: 'object',
      properties: {
        investment_cost: {
          type: 'number',
          description: 'Initiale Investitionskosten in Euro (muss positiv sein)',
        },
        revenue_generated: {
          type: 'number',
          description: 'Generierter Gesamtumsatz über den Zeitraum in Euro',
        },
        timeframe_months: {
          type: 'number',
          description: 'Zeitraum in Monaten für die ROI-Berechnung (muss positiv sein)',
        },
        recurring_costs: {
          type: 'number',
          description: 'Optional: Monatliche wiederkehrende Kosten in Euro (Standard: 0)',
        },
      },
      required: ['investment_cost', 'revenue_generated', 'timeframe_months'],
    },
  },
};

/**
 * Sales Forecaster Function Definition
 */
export const SALES_FORECASTER_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'forecast_sales',
    description: 'Prognostiziert zukünftige Verkäufe basierend auf historischen Daten mit Trendanalyse und Konfidenzintervallen',
    parameters: {
      type: 'object',
      properties: {
        historical_data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              sales: { type: 'number' },
            },
          },
          description: 'Array mit historischen Verkaufsdaten (mindestens 3 Datenpunkte)',
        },
        forecast_periods: {
          type: 'number',
          description: 'Anzahl der Perioden für die Prognose',
        },
      },
      required: ['historical_data', 'forecast_periods'],
    },
  },
};

/**
 * P&L Calculator Function Definition
 */
export const PL_CALCULATOR_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'calculate_pnl',
    description: 'Erstellt eine Gewinn- und Verlustrechnung (P&L) mit Bruttogewinn, Betriebsgewinn und Nettogewinn',
    parameters: {
      type: 'object',
      properties: {
        revenue: { type: 'number', description: 'Gesamtumsatz' },
        cost_of_goods_sold: { type: 'number', description: 'Wareneinsatz/Herstellungskosten' },
        operating_expenses: { type: 'number', description: 'Betriebskosten' },
        other_income: { type: 'number', description: 'Sonstige Erträge' },
        other_expenses: { type: 'number', description: 'Sonstige Aufwendungen' },
        tax_rate: { type: 'number', description: 'Steuersatz in Prozent' },
      },
      required: ['revenue', 'cost_of_goods_sold', 'operating_expenses'],
    },
  },
};

/**
 * Balance Sheet Function Definition
 */
export const BALANCE_SHEET_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'generate_balance_sheet',
    description: 'Erstellt eine Bilanz mit Aktiva, Passiva und Eigenkapital sowie Finanzkennzahlen',
    parameters: {
      type: 'object',
      properties: {
        assets: {
          type: 'object',
          properties: {
            current_assets: { type: 'number' },
            non_current_assets: { type: 'number' },
          },
        },
        liabilities: {
          type: 'object',
          properties: {
            current_liabilities: { type: 'number' },
            long_term_liabilities: { type: 'number' },
          },
        },
        equity: { type: 'number' },
      },
      required: ['assets', 'liabilities', 'equity'],
    },
  },
};

/**
 * Cash Flow Function Definition
 */
export const CASH_FLOW_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'calculate_cash_flow',
    description: 'Analysiert Cashflow aus Geschäftstätigkeit, Investitions- und Finanzierungstätigkeit',
    parameters: {
      type: 'object',
      properties: {
        operating_cash_flow: { type: 'number' },
        investing_cash_flow: { type: 'number' },
        financing_cash_flow: { type: 'number' },
        beginning_cash: { type: 'number' },
      },
      required: ['operating_cash_flow', 'investing_cash_flow', 'financing_cash_flow'],
    },
  },
};

/**
 * Break-Even Function Definition
 */
export const BREAK_EVEN_FUNCTION: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'calculate_break_even',
    description: 'Berechnet Break-Even-Point (Gewinnschwelle) in Einheiten und Umsatz',
    parameters: {
      type: 'object',
      properties: {
        fixed_costs: { type: 'number', description: 'Fixkosten' },
        variable_cost_per_unit: { type: 'number', description: 'Variable Kosten pro Einheit' },
        price_per_unit: { type: 'number', description: 'Verkaufspreis pro Einheit' },
      },
      required: ['fixed_costs', 'variable_cost_per_unit', 'price_per_unit'],
    },
  },
};

/**
 * All available Dexter tools - ALL NOW FULLY IMPLEMENTED!
 */
export const DEXTER_TOOLS: ChatCompletionTool[] = [
  ROI_CALCULATOR_FUNCTION,
  SALES_FORECASTER_FUNCTION,
  PL_CALCULATOR_FUNCTION,
  BALANCE_SHEET_FUNCTION,
  CASH_FLOW_FUNCTION,
  BREAK_EVEN_FUNCTION,
];
