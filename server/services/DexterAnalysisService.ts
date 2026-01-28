import OpenAI from 'openai'
import { Logger } from '../utils/logger'
import { OpenAIValidationService } from './OpenAIValidationService'
import { DataSourceService, DataQueryResult } from './DataSourceService'

const logger = new Logger('DexterAnalysisService')

export interface AnalysisRequest {
  query: string
  dataSourceId?: string
  timeRange?: string
  context?: any
}

export interface ChartData {
  type: 'line' | 'bar' | 'pie' | 'scatter'
  title: string
  data: any[]
  xAxis?: string
  yAxis?: string
  labels?: string[]
}

export interface AnalysisResult {
  id: string
  query: string
  summary: string
  insights: string[]
  charts: ChartData[]
  data: any
  statistics?: {
    totalRecords: number
    processedRecords: number
    timeRange?: string
    dataSource: string
  }
  timestamp: string
  processingTime: number
}

export class DexterAnalysisService {
  private static instance: DexterAnalysisService
  private openaiService: OpenAIValidationService
  private dataSourceService: DataSourceService

  // DEXTER v2 Configuration
  public static readonly VERSION = '2.0.0'
  public static readonly REAL_DATA_MODE = true
  public static readonly NO_DUMMY_OUTPUT = true

  private constructor() {
    this.openaiService = OpenAIValidationService.getInstance()
    this.dataSourceService = DataSourceService.getInstance()
    logger.info(`🚀 DEXTER v${DexterAnalysisService.VERSION} initialized (Real Data Mode: ${DexterAnalysisService.REAL_DATA_MODE})`)
  }

  public static getInstance(): DexterAnalysisService {
    if (!DexterAnalysisService.instance) {
      DexterAnalysisService.instance = new DexterAnalysisService()
    }
    return DexterAnalysisService.instance
  }

  /**
   * Get DEXTER version and configuration
   */
  public getVersion(): { version: string; realDataMode: boolean; noDummyOutput: boolean } {
    return {
      version: DexterAnalysisService.VERSION,
      realDataMode: DexterAnalysisService.REAL_DATA_MODE,
      noDummyOutput: DexterAnalysisService.NO_DUMMY_OUTPUT
    }
  }

  /**
   * Main analysis function
   * ⚠️ NO DUMMY OUTPUT POLICY: This function MUST return real data-driven results only
   */
  public async analyze(request: AnalysisRequest): Promise<AnalysisResult> {
    const startTime = Date.now()
    logger.info(`Starting analysis: "${request.query}"`)

    // ✅ Core Directive #2: OpenAI API Key Validation
    // Validate OpenAI API key before any analysis begins
    logger.info('🔑 Step 1/3: Validating OpenAI API Key...')
    const validation = await this.openaiService.validateApiKey(true) // Force fresh validation
    if (!validation.isValid) {
      const errorMsg = `⚠️ Your OpenAI API key is invalid or missing. Please update it in Settings > Integrations. Error: ${validation.error}`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }
    logger.info('✅ OpenAI API key validated successfully')

    // ✅ Core Directive #3: Data Source Verification
    // Verify that a valid data source is connected and accessible
    logger.info('🗄️ Step 2/3: Verifying Data Source...')
    let queryResult: DataQueryResult | null = null
    if (request.dataSourceId) {
      try {
        // Check if data source exists and is accessible
        const dataSource = this.dataSourceService.getDataSource(request.dataSourceId)
        if (!dataSource) {
          throw new Error(`❌ No valid data source found. Please connect a data source to proceed.`)
        }
        if (dataSource.status === 'error') {
          throw new Error(`❗ Connected data source is not responding or schema mismatch detected: ${dataSource.error}`)
        }
        if (dataSource.status === 'disconnected') {
          throw new Error(`⚠️ Data source is disconnected. Please reconnect and try again.`)
        }

        // Query the data and validate schema
        queryResult = await this.dataSourceService.queryData(request.dataSourceId)

        // Validate we have actual data
        if (!queryResult || queryResult.rowCount === 0) {
          throw new Error(`❌ No data available in the connected source. Please upload or connect a data source with records.`)
        }
        if (!queryResult.columns || queryResult.columns.length === 0) {
          throw new Error(`❗ Schema mismatch detected: No columns found in data source.`)
        }

        logger.info(`✅ Data source verified: ${queryResult.rowCount} records, ${queryResult.columns.length} columns`)
      } catch (error: any) {
        logger.error(`Data source verification failed: ${error.message}`)
        throw new Error(`Failed to load data: ${error.message}`)
      }
    } else {
      // ✅ Core Directive #1: No Dummy Output Policy
      // If no data source is provided, we MUST NOT generate dummy insights
      const errorMsg = `❌ No valid data source found. Please connect a data source to proceed.`
      logger.error(errorMsg)
      throw new Error(errorMsg)
    }

    // ✅ Core Directive #4: Real Data Analysis Flow
    logger.info('📊 Step 3/3: Performing Real Data Analysis...')
    const client = await this.openaiService.getClient()
    if (!client) {
      throw new Error('⚠️ OpenAI client not available after validation. Please try again.')
    }

    const analysisIntent = await this.determineIntent(client, request.query, queryResult)
    logger.info(`Analysis intent determined: ${analysisIntent.type}`)

    // ✅ Perform analysis based on REAL data only
    let analysisData: any = {}
    let charts: ChartData[] = []
    let insights: string[] = []

    // IMPORTANT: queryResult is guaranteed to exist here (validated above)
    analysisData = await this.performDataAnalysis(
      queryResult!,
      analysisIntent,
      request.dataSourceId!
    )

    // Generate charts from REAL calculated data
    charts = this.generateCharts(analysisData, analysisIntent)

    // Generate insights based on REAL statistics and calculations
    insights = await this.generateInsights(client, request.query, analysisData, queryResult!)

    // Generate summary
    const summary = await this.generateSummary(client, request.query, analysisData, insights)

    const processingTime = Date.now() - startTime

    // ✅ Core Directive #5: Export Real Results Only
    const result: AnalysisResult = {
      id: `analysis-${Date.now()}`,
      query: request.query,
      summary,
      insights,
      charts,
      data: analysisData,
      statistics: {
        totalRecords: queryResult!.rowCount,
        processedRecords: queryResult!.data.length,
        timeRange: request.timeRange,
        dataSource: queryResult!.metadata.source
      },
      timestamp: new Date().toISOString(),
      processingTime
    }

    logger.info(`✅ Real data analysis completed successfully in ${processingTime}ms`)
    logger.info(`📈 Results: ${insights.length} insights, ${charts.length} charts, ${result.statistics.totalRecords} records analyzed`)
    return result
  }

  /**
   * Determine the intent of the analysis query
   */
  private async determineIntent(
    client: OpenAI,
    query: string,
    data: DataQueryResult | null
  ): Promise<{ type: string; details: any }> {
    const columns = data?.columns.join(', ') || 'no data available'

    const prompt = `Analyze this data analysis request and determine the intent.

Query: "${query}"
Available columns: ${columns}

Determine:
1. Analysis type (trend, comparison, aggregation, correlation, forecast, summary)
2. Target columns to analyze
3. Grouping columns (if any)
4. Time-based analysis (yes/no)
5. Recommended chart types

Return JSON only: { "type": "...", "targetColumns": [], "groupBy": "...", "timeBased": false, "chartTypes": [] }`

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 300
      })

      const content = response.choices[0]?.message?.content || '{}'
      const intent = JSON.parse(content)
      return intent
    } catch (error) {
      logger.warn('Failed to determine intent, using defaults')
      return {
        type: 'summary',
        details: { targetColumns: [], groupBy: null, timeBased: false, chartTypes: ['bar'] }
      }
    }
  }

  /**
   * Perform actual data analysis
   */
  private async performDataAnalysis(
    queryResult: DataQueryResult,
    intent: any,
    sourceId: string
  ): Promise<any> {
    const { data, columns } = queryResult

    // Detect numeric columns
    const numericColumns = columns.filter(col => {
      const sampleValue = data[0]?.[col]
      return typeof sampleValue === 'number' || !isNaN(Number(sampleValue))
    })

    // Detect categorical columns
    const categoricalColumns = columns.filter(col => !numericColumns.includes(col))

    const result: any = {
      numericColumns,
      categoricalColumns,
      rowCount: data.length
    }

    // Calculate statistics for numeric columns
    result.statistics = {}
    for (const col of numericColumns.slice(0, 5)) {
      const stats = await this.dataSourceService.getStatistics(sourceId, col)
      result.statistics[col] = stats
    }

    // Group by first categorical column if exists
    if (categoricalColumns.length > 0 && numericColumns.length > 0) {
      const groupCol = categoricalColumns[0]
      const aggCol = numericColumns[0]
      result.groupedData = await this.dataSourceService.groupBy(sourceId, groupCol, aggCol, 'sum')
    }

    // Time series detection
    const dateColumns = columns.filter(col =>
      col.toLowerCase().includes('date') ||
      col.toLowerCase().includes('time') ||
      col.toLowerCase().includes('month') ||
      col.toLowerCase().includes('year')
    )

    if (dateColumns.length > 0 && numericColumns.length > 0) {
      result.timeSeries = {
        dateColumn: dateColumns[0],
        valueColumn: numericColumns[0],
        data: data.slice(0, 50).map(record => ({
          date: record[dateColumns[0]],
          value: Number(record[numericColumns[0]]) || 0
        }))
      }
    }

    // Top/Bottom analysis
    if (numericColumns.length > 0) {
      const sortCol = numericColumns[0]
      const sorted = [...data].sort((a, b) => Number(b[sortCol]) - Number(a[sortCol]))
      result.topRecords = sorted.slice(0, 10)
      result.bottomRecords = sorted.slice(-10).reverse()
    }

    return result
  }

  /**
   * Generate charts from analysis data
   */
  private generateCharts(analysisData: any, intent: any): ChartData[] {
    const charts: ChartData[] = []

    // Grouped data bar chart
    if (analysisData.groupedData) {
      const entries = Object.entries(analysisData.groupedData)
      charts.push({
        type: 'bar',
        title: 'Distribution by Category',
        data: entries.map(([key, value]) => ({ category: key, value })),
        xAxis: 'category',
        yAxis: 'value'
      })
    }

    // Time series line chart
    if (analysisData.timeSeries) {
      charts.push({
        type: 'line',
        title: 'Trend Over Time',
        data: analysisData.timeSeries.data,
        xAxis: 'date',
        yAxis: 'value'
      })
    }

    // Top records chart
    if (analysisData.topRecords && analysisData.topRecords.length > 0) {
      const firstRecord = analysisData.topRecords[0]
      const labelKey = Object.keys(firstRecord).find(k => typeof firstRecord[k] === 'string') || 'item'
      const valueKey = analysisData.numericColumns?.[0] || 'value'

      charts.push({
        type: 'bar',
        title: 'Top 10 Records',
        data: analysisData.topRecords.slice(0, 10).map((record: any) => ({
          label: record[labelKey],
          value: Number(record[valueKey]) || 0
        })),
        xAxis: 'label',
        yAxis: 'value'
      })
    }

    return charts
  }

  /**
   * Generate insights using OpenAI
   * ⚠️ NO DUMMY OUTPUT POLICY: Must return real, data-driven insights only
   */
  private async generateInsights(
    client: OpenAI,
    query: string,
    analysisData: any,
    queryResult: DataQueryResult
  ): Promise<string[]> {
    // ✅ Build prompt with REAL calculated statistics
    const statsText = Object.entries(analysisData.statistics || {})
      .map(([col, stats]: [string, any]) => {
        return `${col}: avg=${stats.avg?.toFixed(2)}, min=${stats.min}, max=${stats.max}, count=${stats.count}`
      })
      .join('\n')

    const prompt = `Based on REAL data analysis results, generate 5 key insights:

Query: "${query}"
Data Summary (REAL DATA):
- Total Records: ${analysisData.rowCount}
- Numeric Columns: ${analysisData.numericColumns?.join(', ') || 'none'}
- Categorical Columns: ${analysisData.categoricalColumns?.join(', ') || 'none'}

Real Statistics:
${statsText}

${analysisData.groupedData ? `Grouped Data: ${JSON.stringify(analysisData.groupedData)}` : ''}

Generate 5 bullet points starting with emojis (📈, 🎯, ⚠️, 💡, 🔮) that provide actionable insights based on the REAL numbers above.
Focus on actual trends, comparisons, and patterns in the data.
Return as JSON array: ["insight1", "insight2", ...]`

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 500
      })

      const content = response.choices[0]?.message?.content || '[]'
      let insights = JSON.parse(content)

      // Validate insights are not empty
      if (!Array.isArray(insights) || insights.length === 0) {
        throw new Error('No insights generated from AI')
      }

      return insights
    } catch (error) {
      logger.error('Failed to generate insights with AI')
      // ✅ Core Directive #5: Error Handling - Never return dummy insights
      throw new Error('Analysis failed: Unable to generate insights from data. Please check your OpenAI API key or try again.')
    }
  }


  /**
   * Generate summary
   */
  private async generateSummary(
    client: OpenAI,
    query: string,
    analysisData: any,
    insights: string[]
  ): Promise<string> {
    const prompt = `Create a concise summary (2-3 sentences) for this analysis:

Query: "${query}"
Key Insights: ${insights.slice(0, 3).join('; ')}
Records: ${analysisData.rowCount || 0}

Write in a professional, clear tone.`

    try {
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.5,
        max_tokens: 150
      })

      return response.choices[0]?.message?.content || 'Analysis completed successfully.'
    } catch (error) {
      return `Analysis of ${analysisData.rowCount || 0} records completed. ${insights[0] || ''}`
    }
  }
}

export default DexterAnalysisService
