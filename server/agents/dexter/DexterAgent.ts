/**
 * Dexter Agent - Data Analysis
 * Analyzes structured datasets, produces KPIs, charts, and forecasts
 */

import { BaseAgent, AgentTask } from '../base/BaseAgent'
import { logger } from '../../utils/logger'

export class DexterAgent extends BaseAgent {
  constructor() {
    super({
      agentId: 'dexter',
      name: 'Dexter',
      type: 'analytics',
      version: '2.0.0',
      realDataMode: true,
      capabilities: [
        'data_analysis',
        'kpi_calculation',
        'forecasting',
        'chart_generation',
        'trend_analysis',
        'statistical_analysis'
      ],
      endpoints: [
        '/api/agents/dexter/analyze',
        '/api/agents/dexter/forecast',
        '/api/agents/dexter/kpis',
        '/api/agents/dexter/health'
      ],
      apiKeyRequired: true,
      dataSourceRequired: true
    })
  }

  protected async onInitialize(): Promise<void> {
    logger.info('[Dexter] Initializing data analysis capabilities')
    // Initialize data source connections
    // Set up OpenAI API
  }

  protected async onExecute(task: AgentTask): Promise<any> {
    switch (task.taskType) {
      case 'analyze':
        return await this.analyzeData(task.input)
      case 'forecast':
        return await this.forecastTrends(task.input)
      case 'calculate_kpis':
        return await this.calculateKPIs(task.input)
      case 'generate_chart':
        return await this.generateChart(task.input)
      default:
        throw new Error(`Unknown task type: ${task.taskType}`)
    }
  }

  protected async validateRealDataMode(): Promise<void> {
    // Check OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing. Real data mode requires valid API key.')
    }

    // Verify data source is connected
    // This would check actual database/API connections in production
  }

  protected checkApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  protected checkDataSource(): boolean {
    // In production, this would check actual data source connections
    return true
  }

  /**
   * Analyze real data - no dummy outputs
   */
  private async analyzeData(input: any): Promise<any> {
    if (!input.data || !Array.isArray(input.data) || input.data.length === 0) {
      throw new Error('No real data provided. Real data mode enforcement.')
    }

    // Calculate basic statistics
    const values = input.data.map((d: any) => typeof d === 'object' ? d.value : d)
    const numericValues = values.filter((v: any) => typeof v === 'number')

    if (numericValues.length === 0) {
      throw new Error('No numeric values found in dataset')
    }

    const sum = numericValues.reduce((a: number, b: number) => a + b, 0)
    const mean = sum / numericValues.length
    const sortedValues = [...numericValues].sort((a, b) => a - b)
    const median = sortedValues[Math.floor(sortedValues.length / 2)]
    const min = Math.min(...numericValues)
    const max = Math.max(...numericValues)
    const variance = numericValues.reduce((acc: number, val: number) => acc + Math.pow(val - mean, 2), 0) / numericValues.length
    const stdDev = Math.sqrt(variance)

    // Detect trend
    let trend = 'stable'
    if (numericValues.length >= 3) {
      const firstThird = numericValues.slice(0, Math.floor(numericValues.length / 3))
      const lastThird = numericValues.slice(-Math.floor(numericValues.length / 3))
      const firstAvg = firstThird.reduce((a: number, b: number) => a + b, 0) / firstThird.length
      const lastAvg = lastThird.reduce((a: number, b: number) => a + b, 0) / lastThird.length
      const change = ((lastAvg - firstAvg) / firstAvg) * 100

      if (change > 10) trend = 'increasing'
      else if (change < -10) trend = 'decreasing'
    }

    const analysis = {
      summary: {
        count: numericValues.length,
        sum,
        mean,
        median,
        min,
        max,
        stdDev,
        variance,
        trend
      },
      insights: [
        `Dataset contains ${numericValues.length} numeric values`,
        `Average value: ${mean.toFixed(2)}`,
        `Trend detected: ${trend}`,
        `Variance: ${variance.toFixed(2)}`,
        trend === 'increasing' ? 'Positive momentum observed' : trend === 'decreasing' ? 'Declining trend detected' : 'Stable pattern'
      ],
      metrics: {
        dataQuality: numericValues.length > 10 ? 'good' : 'limited',
        completeness: (numericValues.length / input.data.length) * 100,
        reliability: stdDev < mean * 0.3 ? 'high' : 'moderate'
      },
      timestamp: new Date().toISOString()
    }

    // Store analysis in Brain AI
    this.storeContext({
      type: 'data_analysis',
      summary: analysis.summary,
      insights: analysis.insights
    }, ['analysis', 'statistics'], 7)

    return analysis
  }

  /**
   * Forecast trends using simple linear regression
   */
  private async forecastTrends(input: any): Promise<any> {
    if (!input.data || !Array.isArray(input.data) || input.data.length < 3) {
      throw new Error('Insufficient data for forecasting. Minimum 3 data points required.')
    }

    const periods = input.periods || 3
    const values = input.data.map((d: any, i: number) => ({
      x: i,
      y: typeof d === 'object' ? d.value : d
    }))

    // Simple linear regression
    const n = values.length
    const sumX = values.reduce((acc: number, v: any) => acc + v.x, 0)
    const sumY = values.reduce((acc: number, v: any) => acc + v.y, 0)
    const sumXY = values.reduce((acc: number, v: any) => acc + v.x * v.y, 0)
    const sumX2 = values.reduce((acc: number, v: any) => acc + v.x * v.x, 0)

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    const intercept = (sumY - slope * sumX) / n

    // Generate forecast
    const forecast = []
    for (let i = 0; i < periods; i++) {
      const x = n + i
      const predicted = slope * x + intercept
      forecast.push({
        period: x + 1,
        value: Math.round(predicted * 100) / 100,
        confidence: Math.max(0.6, 0.95 - (i * 0.1))
      })
    }

    // Calculate R-squared for model quality
    const meanY = sumY / n
    const ssTotal = values.reduce((acc: number, v: any) => acc + Math.pow(v.y - meanY, 2), 0)
    const ssResidual = values.reduce((acc: number, v: any) => {
      const predicted = slope * v.x + intercept
      return acc + Math.pow(v.y - predicted, 2)
    }, 0)
    const rSquared = 1 - (ssResidual / ssTotal)

    const result = {
      forecast,
      model: {
        type: 'linear-regression',
        slope,
        intercept,
        rSquared: Math.round(rSquared * 1000) / 1000,
        quality: rSquared > 0.7 ? 'high' : rSquared > 0.4 ? 'moderate' : 'low'
      },
      confidence: Math.round(rSquared * 100),
      timestamp: new Date().toISOString()
    }

    // Store forecast in Brain AI
    this.storeContext({
      type: 'forecast',
      periods,
      model: result.model,
      forecast: forecast.slice(0, 2)
    }, ['forecast', 'prediction'], 8)

    return result
  }

  /**
   * Calculate KPIs from real data
   */
  private async calculateKPIs(input: any): Promise<any> {
    if (!input.data || typeof input.data !== 'object') {
      throw new Error('No real data provided for KPI calculation')
    }

    const data = input.data
    const period = input.period || 'current'
    const previousData = input.previousData

    const kpis: any = {}

    // Revenue KPIs
    if (data.revenue !== undefined) {
      kpis.revenue = {
        value: data.revenue,
        change: previousData?.revenue ? ((data.revenue - previousData.revenue) / previousData.revenue) * 100 : 0,
        trend: previousData?.revenue ? (data.revenue > previousData.revenue ? 'up' : 'down') : 'stable'
      }
    }

    // Customer KPIs
    if (data.customers !== undefined) {
      kpis.customers = {
        value: data.customers,
        change: previousData?.customers ? ((data.customers - previousData.customers) / previousData.customers) * 100 : 0,
        trend: previousData?.customers ? (data.customers > previousData.customers ? 'up' : 'down') : 'stable'
      }
    }

    // Conversion Rate
    if (data.conversions !== undefined && data.visits !== undefined) {
      kpis.conversionRate = {
        value: (data.conversions / data.visits) * 100,
        format: 'percentage'
      }
    }

    // Average Order Value
    if (data.revenue !== undefined && data.orders !== undefined) {
      kpis.averageOrderValue = {
        value: data.orders > 0 ? data.revenue / data.orders : 0,
        format: 'currency'
      }
    }

    const result = {
      kpis,
      period,
      calculatedAt: new Date().toISOString(),
      dataPoints: Object.keys(kpis).length,
      summary: `${Object.keys(kpis).length} KPIs calculated for ${period}`
    }

    // Store KPIs in Brain AI
    this.storeContext({
      type: 'kpi_calculation',
      kpis,
      period
    }, ['kpi', 'metrics', period], 7)

    return result
  }

  /**
   * Generate chart configuration from real data
   */
  private async generateChart(input: any): Promise<any> {
    if (!input.data || !Array.isArray(input.data) || input.data.length === 0) {
      throw new Error('No real data provided for chart generation')
    }

    const chartType = input.chartType || 'line'
    const data = input.data

    const chartData = data.map((item: any, index: number) => ({
      x: item.label || item.x || `Point ${index + 1}`,
      y: item.value || item.y || 0
    }))

    return {
      chartType,
      data: chartData,
      config: {
        title: input.title || 'Data Visualization',
        xLabel: input.xLabel || 'X Axis',
        yLabel: input.yLabel || 'Y Axis',
        colors: input.colors || ['#4299e1', '#48bb78', '#ed8936'],
        legend: input.legend !== false
      },
      metadata: {
        dataPoints: chartData.length,
        generatedAt: new Date().toISOString(),
        realData: true
      },
      timestamp: new Date().toISOString()
    }
  }
}
