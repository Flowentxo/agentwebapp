/**
 * Emmie Agent v2.0 - AI Reasoning & Insights
 * Provides statistical analysis, trend detection, anomaly identification,
 * and explainable AI recommendations across all platform data.
 */

import { BaseAgent, AgentTask } from '../base/BaseAgent'
import { logger } from '../../utils/logger'
import { brainAI } from '../../services/BrainAIService'
import { openAIService } from '../../services/OpenAIService'

interface DataPoint {
  timestamp: string
  value: number
  label?: string
  metadata?: Record<string, any>
}

interface StatisticalAnalysis {
  mean: number
  median: number
  stdDev: number
  variance: number
  min: number
  max: number
  range: number
  count: number
}

interface Trend {
  direction: 'increasing' | 'decreasing' | 'stable' | 'volatile'
  strength: number // 0-1
  confidence: number // 0-1
  changeRate: number // % change
  prediction?: number
}

interface Anomaly {
  timestamp: string
  value: number
  expectedValue: number
  deviation: number
  severity: 'low' | 'medium' | 'high' | 'critical'
  explanation: string
}

interface Insight {
  id: string
  type: 'trend' | 'anomaly' | 'recommendation' | 'warning' | 'opportunity'
  title: string
  description: string
  confidence: number
  impact: 'low' | 'medium' | 'high' | 'critical'
  actionable: boolean
  suggestedActions: string[]
  reasoning: string[] // Explainability chain
  dataPoints: number
  timestamp: string
}

interface Recommendation {
  id: string
  title: string
  description: string
  rationale: string
  expectedImpact: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  confidence: number
  prerequisites: string[]
  estimatedEffort: string
  relatedInsights: string[]
}

export class EmmieAgent extends BaseAgent {
  private insights: Map<string, Insight> = new Map()
  private readonly ANOMALY_THRESHOLD = 2.5 // Standard deviations
  private readonly TREND_MIN_POINTS = 5

  constructor() {
    super({
      agentId: 'emmie',
      name: 'Emmie',
      type: 'insights',
      version: '2.0.0',
      realDataMode: true,
      capabilities: [
        'statistical_analysis',
        'trend_detection',
        'anomaly_detection',
        'ai_recommendations',
        'explainable_insights',
        'predictive_analytics',
        'correlation_analysis',
        'pattern_recognition'
      ],
      endpoints: [
        '/api/unified-agents/execute (taskType: infer_insights)',
        '/api/unified-agents/execute (taskType: analyze_trends)',
        '/api/unified-agents/execute (taskType: detect_anomalies)',
        '/api/unified-agents/execute (taskType: recommend_actions)',
        '/api/unified-agents/execute (taskType: explain_anomaly)',
        '/api/unified-agents/execute (taskType: analyze_correlation)',
        '/api/unified-agents/execute (taskType: get_insights)'
      ],
      apiKeyRequired: true,
      dataSourceRequired: false
    })
  }

  protected async onInitialize(): Promise<void> {
    logger.info('[Emmie v2.0] Initializing AI reasoning and insights engine')

    // Generate initial insights from Brain AI data
    await this.generateInitialInsights()

    logger.info(`[Emmie] Initialized with ${this.insights.size} initial insights`)
  }

  protected async onExecute(task: AgentTask): Promise<any> {
    const startTime = Date.now()

    try {
      let result: any

      switch (task.taskType) {
        case 'infer_insights':
          result = await this.inferInsights(task.input)
          break
        case 'analyze_trends':
          result = await this.analyzeTrends(task.input)
          break
        case 'detect_anomalies':
          result = await this.detectAnomalies(task.input)
          break
        case 'recommend_actions':
          result = await this.recommendActions(task.input)
          break
        case 'explain_anomaly':
          result = await this.explainAnomaly(task.input)
          break
        case 'analyze_correlation':
          result = await this.analyzeCorrelation(task.input)
          break
        case 'get_insights':
          result = await this.getInsights(task.input)
          break
        default:
          throw new Error(`Unknown task type: ${task.taskType}`)
      }

      // Store execution in Brain AI
      await this.storeContext(
        {
          type: 'insight_generation',
          taskType: task.taskType,
          executionTime: Date.now() - startTime,
          insightsGenerated: result.insights?.length || 0
        },
        ['emmie', 'insights', task.taskType],
        7
      )

      return result
    } catch (error: any) {
      logger.error(`[Emmie] Task execution failed:`, error)
      throw error
    }
  }

  protected async validateRealDataMode(): Promise<void> {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key required for AI reasoning and insights')
    }
  }

  protected checkApiKey(): boolean {
    return !!process.env.OPENAI_API_KEY
  }

  protected checkDataSource(): boolean {
    return true // Brain AI is always available
  }

  /**
   * Infer insights from data using AI reasoning
   */
  private async inferInsights(input: {
    dataPoints: DataPoint[]
    context?: string
    minConfidence?: number
  }): Promise<{
    insights: Insight[]
    summary: string
    statistics: StatisticalAnalysis
  }> {
    const { dataPoints, context, minConfidence = 0.6 } = input

    if (!dataPoints || dataPoints.length === 0) {
      return {
        insights: [],
        summary: 'No data points provided for analysis.',
        statistics: this.getEmptyStats()
      }
    }

    // Calculate statistics
    const statistics = this.calculateStatistics(dataPoints.map(dp => dp.value))

    // Detect trends
    const trend = this.detectTrend(dataPoints)

    // Detect anomalies
    const anomalies = this.findAnomalies(dataPoints, statistics)

    // Generate AI-powered insights
    const insights: Insight[] = []

    // Add trend insight
    if (trend.confidence >= minConfidence) {
      const trendInsight: Insight = {
        id: `insight_${Date.now()}_trend`,
        type: 'trend',
        title: `${trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)} Trend Detected`,
        description: `Data shows a ${trend.direction} trend with ${Math.round(trend.strength * 100)}% strength and ${Math.round(Math.abs(trend.changeRate))}% change rate.`,
        confidence: trend.confidence,
        impact: this.assessImpact(trend.strength),
        actionable: trend.direction !== 'stable',
        suggestedActions: this.generateTrendActions(trend),
        reasoning: [
          `Analyzed ${dataPoints.length} data points`,
          `Trend strength: ${Math.round(trend.strength * 100)}%`,
          `Confidence level: ${Math.round(trend.confidence * 100)}%`,
          `Change rate: ${Math.round(trend.changeRate * 100) / 100}%`
        ],
        dataPoints: dataPoints.length,
        timestamp: new Date().toISOString()
      }
      insights.push(trendInsight)
      this.insights.set(trendInsight.id, trendInsight)
    }

    // Add anomaly insights
    for (const anomaly of anomalies) {
      const anomalyInsight: Insight = {
        id: `insight_${Date.now()}_anomaly_${Math.random().toString(36).substr(2, 9)}`,
        type: 'anomaly',
        title: `${anomaly.severity.charAt(0).toUpperCase() + anomaly.severity.slice(1)} Anomaly Detected`,
        description: anomaly.explanation,
        confidence: Math.min(1, Math.abs(anomaly.deviation) / this.ANOMALY_THRESHOLD),
        impact: anomaly.severity,
        actionable: anomaly.severity === 'high' || anomaly.severity === 'critical',
        suggestedActions: this.generateAnomalyActions(anomaly),
        reasoning: [
          `Expected value: ${Math.round(anomaly.expectedValue * 100) / 100}`,
          `Actual value: ${Math.round(anomaly.value * 100) / 100}`,
          `Deviation: ${Math.round(anomaly.deviation * 100) / 100} standard deviations`,
          `Severity: ${anomaly.severity}`
        ],
        dataPoints: 1,
        timestamp: anomaly.timestamp
      }
      insights.push(anomalyInsight)
      this.insights.set(anomalyInsight.id, anomalyInsight)
    }

    // Generate AI summary
    const summary = await this.generateInsightSummary(insights, statistics, context)

    return {
      insights,
      summary,
      statistics
    }
  }

  /**
   * Analyze trends in time-series data
   */
  private async analyzeTrends(input: {
    dataPoints: DataPoint[]
    windowSize?: number
  }): Promise<{
    trend: Trend
    forecast: Array<{ timestamp: string; predictedValue: number; confidence: number }>
    reasoning: string[]
  }> {
    const { dataPoints, windowSize = 7 } = input

    if (dataPoints.length < this.TREND_MIN_POINTS) {
      return {
        trend: {
          direction: 'stable',
          strength: 0,
          confidence: 0,
          changeRate: 0
        },
        forecast: [],
        reasoning: [`Insufficient data points. Need at least ${this.TREND_MIN_POINTS} points.`]
      }
    }

    const trend = this.detectTrend(dataPoints)

    // Simple linear forecast
    const forecast = this.generateForecast(dataPoints, windowSize)

    const reasoning = [
      `Analyzed ${dataPoints.length} data points`,
      `Detected ${trend.direction} trend`,
      `Trend strength: ${Math.round(trend.strength * 100)}%`,
      `Average change rate: ${Math.round(trend.changeRate * 100) / 100}%`,
      `Forecast confidence: ${Math.round(trend.confidence * 100)}%`,
      `Generated ${forecast.length} forecast points`
    ]

    return {
      trend,
      forecast,
      reasoning
    }
  }

  /**
   * Detect anomalies in data
   */
  private async detectAnomalies(input: {
    dataPoints: DataPoint[]
    threshold?: number
  }): Promise<{
    anomalies: Anomaly[]
    totalAnalyzed: number
    anomalyRate: number
  }> {
    const { dataPoints, threshold = this.ANOMALY_THRESHOLD } = input

    const statistics = this.calculateStatistics(dataPoints.map(dp => dp.value))
    const anomalies = this.findAnomalies(dataPoints, statistics, threshold)

    return {
      anomalies,
      totalAnalyzed: dataPoints.length,
      anomalyRate: dataPoints.length > 0 ? anomalies.length / dataPoints.length : 0
    }
  }

  /**
   * Generate actionable recommendations using AI
   */
  private async recommendActions(input: {
    domain?: string
    context?: string
    recentInsights?: string[]
  }): Promise<{
    recommendations: Recommendation[]
    priorityOrder: string[]
  }> {
    const { domain = 'general', context, recentInsights = [] } = input

    try {
      // Get recent insights
      const insights = Array.from(this.insights.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 10)

      const insightsText = insights.map(i =>
        `- ${i.type}: ${i.title} (confidence: ${Math.round(i.confidence * 100)}%)`
      ).join('\n')

      // Generate recommendations using AI
      const response = await openAIService.generateChatCompletion([
        {
          role: 'system',
          content: 'You are an AI insights advisor. Generate 3-5 actionable recommendations based on data insights. Respond in JSON format with an array of recommendations, each having: id, title, description, rationale, expectedImpact, priority (low/medium/high/critical), confidence (0-1), prerequisites (array), estimatedEffort, relatedInsights (array).'
        },
        {
          role: 'user',
          content: `Domain: ${domain}\n${context ? `Context: ${context}\n` : ''}Recent insights:\n${insightsText}\n\nGenerate recommendations:`
        }
      ], {
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        temperature: 0.4,
        maxTokens: 800
      })

      let recommendations: Recommendation[] = []
      try {
        const parsed = JSON.parse(response.message)
        recommendations = Array.isArray(parsed) ? parsed : parsed.recommendations || []
      } catch (parseError) {
        // Fallback recommendations
        recommendations = this.generateFallbackRecommendations(insights)
      }

      const priorityOrder = recommendations
        .sort((a, b) => {
          const priorityValues = { critical: 4, high: 3, medium: 2, low: 1 }
          return priorityValues[b.priority] - priorityValues[a.priority]
        })
        .map(r => r.id)

      return {
        recommendations,
        priorityOrder
      }
    } catch (error: any) {
      logger.error('[Emmie] Recommendation generation failed:', error)

      const insights = Array.from(this.insights.values()).slice(0, 5)
      return {
        recommendations: this.generateFallbackRecommendations(insights),
        priorityOrder: []
      }
    }
  }

  /**
   * Explain an anomaly with reasoning chain
   */
  private async explainAnomaly(input: {
    timestamp: string
    value: number
    expectedValue?: number
  }): Promise<{
    explanation: string
    reasoning: string[]
    possibleCauses: string[]
    suggestedActions: string[]
    confidence: number
  }> {
    const { timestamp, value, expectedValue } = input

    const reasoning: string[] = []
    const possibleCauses: string[] = []
    const suggestedActions: string[] = []

    reasoning.push(`Analyzing anomaly at ${timestamp}`)
    reasoning.push(`Observed value: ${Math.round(value * 100) / 100}`)

    if (expectedValue !== undefined) {
      const deviation = Math.abs(value - expectedValue)
      reasoning.push(`Expected value: ${Math.round(expectedValue * 100) / 100}`)
      reasoning.push(`Deviation: ${Math.round(deviation * 100) / 100}`)

      if (value > expectedValue) {
        possibleCauses.push('Unexpected spike in activity')
        possibleCauses.push('Data quality issue or outlier')
        possibleCauses.push('System behavior change')
        suggestedActions.push('Verify data source accuracy')
        suggestedActions.push('Check for system changes at this time')
      } else {
        possibleCauses.push('Unexpected drop in activity')
        possibleCauses.push('System downtime or performance issue')
        possibleCauses.push('Missing data')
        suggestedActions.push('Check system logs for errors')
        suggestedActions.push('Verify data collection process')
      }
    }

    const explanation = `Anomaly detected at ${timestamp} with value ${Math.round(value * 100) / 100}${expectedValue ? ` (expected ~${Math.round(expectedValue * 100) / 100})` : ''}. This represents a significant deviation from normal patterns.`

    return {
      explanation,
      reasoning,
      possibleCauses,
      suggestedActions,
      confidence: expectedValue ? 0.85 : 0.6
    }
  }

  /**
   * Analyze correlation between two data series
   */
  private async analyzeCorrelation(input: {
    series1: DataPoint[]
    series2: DataPoint[]
    label1?: string
    label2?: string
  }): Promise<{
    correlation: number
    strength: 'none' | 'weak' | 'moderate' | 'strong' | 'very strong'
    direction: 'positive' | 'negative' | 'none'
    pValue: number
    interpretation: string
    reasoning: string[]
  }> {
    const { series1, series2, label1 = 'Series 1', label2 = 'Series 2' } = input

    // Ensure equal length
    const minLength = Math.min(series1.length, series2.length)
    const values1 = series1.slice(0, minLength).map(dp => dp.value)
    const values2 = series2.slice(0, minLength).map(dp => dp.value)

    // Calculate Pearson correlation
    const correlation = this.calculateCorrelation(values1, values2)

    // Determine strength and direction
    const absCorr = Math.abs(correlation)
    let strength: 'none' | 'weak' | 'moderate' | 'strong' | 'very strong'
    if (absCorr < 0.2) strength = 'none'
    else if (absCorr < 0.4) strength = 'weak'
    else if (absCorr < 0.6) strength = 'moderate'
    else if (absCorr < 0.8) strength = 'strong'
    else strength = 'very strong'

    const direction = correlation > 0.1 ? 'positive' : correlation < -0.1 ? 'negative' : 'none'

    // Simple p-value estimation (not statistically rigorous)
    const pValue = Math.max(0.001, 1 - absCorr)

    const interpretation = `${label1} and ${label2} show a ${strength} ${direction} correlation (r = ${Math.round(correlation * 1000) / 1000}). ${
      absCorr > 0.5
        ? 'These variables appear to be related and may influence each other.'
        : 'These variables show little to no relationship.'
    }`

    const reasoning = [
      `Analyzed ${minLength} paired data points`,
      `Correlation coefficient: ${Math.round(correlation * 1000) / 1000}`,
      `Strength: ${strength}`,
      `Direction: ${direction}`,
      `Estimated p-value: ${Math.round(pValue * 1000) / 1000}`
    ]

    return {
      correlation,
      strength,
      direction,
      pValue,
      interpretation,
      reasoning
    }
  }

  /**
   * Get stored insights
   */
  private async getInsights(input: {
    type?: Insight['type']
    minConfidence?: number
    limit?: number
  }): Promise<{
    insights: Insight[]
    total: number
  }> {
    const { type, minConfidence = 0, limit = 20 } = input

    let insights = Array.from(this.insights.values())

    if (type) {
      insights = insights.filter(i => i.type === type)
    }

    insights = insights
      .filter(i => i.confidence >= minConfidence)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit)

    return {
      insights,
      total: this.insights.size
    }
  }

  /**
   * Statistical calculations
   */
  private calculateStatistics(values: number[]): StatisticalAnalysis {
    if (values.length === 0) {
      return this.getEmptyStats()
    }

    const sorted = [...values].sort((a, b) => a - b)
    const sum = values.reduce((a, b) => a + b, 0)
    const mean = sum / values.length

    const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length
    const stdDev = Math.sqrt(variance)

    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)]

    return {
      mean,
      median,
      stdDev,
      variance,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      range: sorted[sorted.length - 1] - sorted[0],
      count: values.length
    }
  }

  private getEmptyStats(): StatisticalAnalysis {
    return {
      mean: 0,
      median: 0,
      stdDev: 0,
      variance: 0,
      min: 0,
      max: 0,
      range: 0,
      count: 0
    }
  }

  /**
   * Trend detection using linear regression
   */
  private detectTrend(dataPoints: DataPoint[]): Trend {
    if (dataPoints.length < this.TREND_MIN_POINTS) {
      return {
        direction: 'stable',
        strength: 0,
        confidence: 0,
        changeRate: 0
      }
    }

    const values = dataPoints.map(dp => dp.value)
    const n = values.length

    // Calculate linear regression slope
    const xValues = Array.from({ length: n }, (_, i) => i)
    const xMean = (n - 1) / 2
    const yMean = values.reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let denominator = 0

    for (let i = 0; i < n; i++) {
      numerator += (xValues[i] - xMean) * (values[i] - yMean)
      denominator += Math.pow(xValues[i] - xMean, 2)
    }

    const slope = numerator / denominator

    // Calculate R-squared for confidence
    const predictions = xValues.map(x => yMean + slope * (x - xMean))
    const ssRes = values.reduce((sum, val, i) => sum + Math.pow(val - predictions[i], 2), 0)
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0)
    const rSquared = ssTot === 0 ? 0 : 1 - (ssRes / ssTot)

    const absSlope = Math.abs(slope)
    const direction = absSlope < 0.01 ? 'stable' :
                     slope > 0 ? 'increasing' :
                     slope < 0 ? 'decreasing' : 'volatile'

    const changeRate = yMean === 0 ? 0 : (slope / yMean) * 100

    return {
      direction,
      strength: Math.min(1, Math.abs(rSquared)),
      confidence: Math.max(0, Math.min(1, rSquared)),
      changeRate,
      prediction: predictions[predictions.length - 1]
    }
  }

  /**
   * Find anomalies using statistical methods
   */
  private findAnomalies(
    dataPoints: DataPoint[],
    stats: StatisticalAnalysis,
    threshold: number = this.ANOMALY_THRESHOLD
  ): Anomaly[] {
    const anomalies: Anomaly[] = []

    for (const dp of dataPoints) {
      const zScore = stats.stdDev === 0 ? 0 : Math.abs((dp.value - stats.mean) / stats.stdDev)

      if (zScore > threshold) {
        const severity: Anomaly['severity'] =
          zScore > 4 ? 'critical' :
          zScore > 3 ? 'high' :
          zScore > 2.5 ? 'medium' : 'low'

        anomalies.push({
          timestamp: dp.timestamp,
          value: dp.value,
          expectedValue: stats.mean,
          deviation: zScore,
          severity,
          explanation: `Value deviates ${Math.round(zScore * 100) / 100} standard deviations from mean (${Math.round(stats.mean * 100) / 100})`
        })
      }
    }

    return anomalies
  }

  /**
   * Generate forecast points
   */
  private generateForecast(
    dataPoints: DataPoint[],
    steps: number
  ): Array<{ timestamp: string; predictedValue: number; confidence: number }> {
    const trend = this.detectTrend(dataPoints)

    if (trend.prediction === undefined) {
      return []
    }

    const forecast: Array<{ timestamp: string; predictedValue: number; confidence: number }> = []
    const lastTimestamp = new Date(dataPoints[dataPoints.length - 1].timestamp)

    for (let i = 1; i <= steps; i++) {
      const futureTimestamp = new Date(lastTimestamp.getTime() + i * 24 * 60 * 60 * 1000)
      const predictedValue = trend.prediction! + (trend.changeRate / 100) * trend.prediction! * i
      const confidence = Math.max(0.3, trend.confidence - (i * 0.05))

      forecast.push({
        timestamp: futureTimestamp.toISOString(),
        predictedValue: Math.max(0, predictedValue),
        confidence
      })
    }

    return forecast
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length
    if (n === 0) return 0

    const xMean = x.reduce((a, b) => a + b, 0) / n
    const yMean = y.reduce((a, b) => a + b, 0) / n

    let numerator = 0
    let xDenominator = 0
    let yDenominator = 0

    for (let i = 0; i < n; i++) {
      const xDiff = x[i] - xMean
      const yDiff = y[i] - yMean
      numerator += xDiff * yDiff
      xDenominator += xDiff * xDiff
      yDenominator += yDiff * yDiff
    }

    const denominator = Math.sqrt(xDenominator * yDenominator)
    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Helper methods
   */
  private assessImpact(strength: number): Insight['impact'] {
    if (strength > 0.8) return 'critical'
    if (strength > 0.6) return 'high'
    if (strength > 0.3) return 'medium'
    return 'low'
  }

  private generateTrendActions(trend: Trend): string[] {
    const actions: string[] = []
    if (trend.direction === 'increasing') {
      actions.push('Monitor for sustained growth')
      actions.push('Allocate resources to support trend')
      actions.push('Identify driving factors')
    } else if (trend.direction === 'decreasing') {
      actions.push('Investigate root causes')
      actions.push('Implement corrective measures')
      actions.push('Set up alerts for further decline')
    } else if (trend.direction === 'volatile') {
      actions.push('Stabilize underlying processes')
      actions.push('Identify sources of variability')
      actions.push('Implement smoothing mechanisms')
    }
    return actions
  }

  private generateAnomalyActions(anomaly: Anomaly): string[] {
    const actions: string[] = []
    if (anomaly.severity === 'critical' || anomaly.severity === 'high') {
      actions.push('Immediate investigation required')
      actions.push('Notify relevant stakeholders')
      actions.push('Check system logs and data sources')
    }
    actions.push('Document anomaly for future reference')
    actions.push('Verify data accuracy')
    return actions
  }

  private async generateInsightSummary(
    insights: Insight[],
    statistics: StatisticalAnalysis,
    context?: string
  ): Promise<string> {
    if (insights.length === 0) {
      return 'No significant insights detected in the analyzed data.'
    }

    const summaryPoints = [
      `Analyzed data with mean ${Math.round(statistics.mean * 100) / 100} and std dev ${Math.round(statistics.stdDev * 100) / 100}`,
      `Detected ${insights.length} insight(s)`,
      ...insights.slice(0, 3).map(i => `- ${i.title}`)
    ]

    return summaryPoints.join('\n')
  }

  private generateFallbackRecommendations(insights: Insight[]): Recommendation[] {
    const recommendations: Recommendation[] = []

    if (insights.some(i => i.type === 'anomaly' && (i.impact === 'high' || i.impact === 'critical'))) {
      recommendations.push({
        id: 'rec_investigate_anomalies',
        title: 'Investigate Critical Anomalies',
        description: 'Multiple high-impact anomalies detected. Immediate investigation recommended.',
        rationale: 'Anomalies may indicate system issues or data quality problems.',
        expectedImpact: 'Prevent potential incidents and improve data quality',
        priority: 'critical',
        confidence: 0.9,
        prerequisites: ['Access to system logs', 'Data source verification'],
        estimatedEffort: '2-4 hours',
        relatedInsights: insights.filter(i => i.type === 'anomaly').map(i => i.id)
      })
    }

    if (insights.some(i => i.type === 'trend' && i.impact === 'high')) {
      recommendations.push({
        id: 'rec_capitalize_trends',
        title: 'Capitalize on Detected Trends',
        description: 'Strong trends identified. Consider strategic adjustments.',
        rationale: 'Trends provide opportunities for optimization and growth.',
        expectedImpact: 'Improved performance and resource allocation',
        priority: 'high',
        confidence: 0.8,
        prerequisites: ['Stakeholder alignment', 'Resource availability'],
        estimatedEffort: '1-2 weeks',
        relatedInsights: insights.filter(i => i.type === 'trend').map(i => i.id)
      })
    }

    return recommendations
  }

  private async generateInitialInsights(): Promise<void> {
    // Get Brain AI stats
    const stats = brainAI.getStats()

    // Generate sample insights based on Brain AI data
    if (stats.totalMemories > 0) {
      const insight: Insight = {
        id: `insight_initial_${Date.now()}`,
        type: 'opportunity',
        title: 'Knowledge Base Growing',
        description: `Brain AI now contains ${stats.totalMemories} memory entries across ${Object.keys(stats.categories).length} categories.`,
        confidence: 1.0,
        impact: 'medium',
        actionable: true,
        suggestedActions: ['Leverage accumulated knowledge for better insights', 'Consider knowledge management strategies'],
        reasoning: [
          `Total memories: ${stats.totalMemories}`,
          `Vector embeddings: ${stats.totalVectors}`,
          `Categories: ${Object.keys(stats.categories).length}`
        ],
        dataPoints: stats.totalMemories,
        timestamp: new Date().toISOString()
      }

      this.insights.set(insight.id, insight)
    }
  }
}
