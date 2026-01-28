import { Logger } from '../utils/logger'
import * as XLSX from 'xlsx'
import { parse as parseCSV } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'

const logger = new Logger('DataSourceService')

export interface DataSource {
  id: string
  name: string
  type: 'csv' | 'json' | 'postgresql' | 'google-sheets' | 'excel'
  status: 'connected' | 'disconnected' | 'syncing' | 'error'
  lastSync?: string
  recordCount?: number
  columns?: string[]
  connectionInfo?: any
  error?: string
}

export interface DataRecord {
  [key: string]: any
}

export interface DataQueryResult {
  data: DataRecord[]
  columns: string[]
  rowCount: number
  metadata: {
    source: string
    timestamp: string
    queryTime: number
  }
}

export class DataSourceService {
  private static instance: DataSourceService
  private dataSources: Map<string, DataSource> = new Map()
  private dataCache: Map<string, DataRecord[]> = new Map()
  private readonly UPLOAD_DIR = path.join(process.cwd(), 'uploads')

  private constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.UPLOAD_DIR)) {
      fs.mkdirSync(this.UPLOAD_DIR, { recursive: true })
    }
  }

  public static getInstance(): DataSourceService {
    if (!DataSourceService.instance) {
      DataSourceService.instance = new DataSourceService()
    }
    return DataSourceService.instance
  }

  /**
   * Add a new data source from uploaded file
   */
  public async addFileDataSource(
    file: Express.Multer.File,
    name?: string
  ): Promise<DataSource> {
    const startTime = Date.now()
    const sourceId = `file-${Date.now()}`
    const fileName = file.originalname
    const fileType = this.detectFileType(fileName)

    logger.info(`Adding file data source: ${fileName} (${fileType})`)

    try {
      // Parse the file based on type
      let data: DataRecord[]
      let columns: string[]

      if (fileType === 'csv') {
        const content = file.buffer.toString('utf-8')
        data = parseCSV(content, {
          columns: true,
          skip_empty_lines: true,
          trim: true
        })
        columns = data.length > 0 ? Object.keys(data[0]) : []
      } else if (fileType === 'json') {
        const content = file.buffer.toString('utf-8')
        const parsed = JSON.parse(content)
        data = Array.isArray(parsed) ? parsed : [parsed]
        columns = data.length > 0 ? Object.keys(data[0]) : []
      } else if (fileType === 'excel') {
        const workbook = XLSX.read(file.buffer, { type: 'buffer' })
        const sheetName = workbook.SheetNames[0]
        data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName])
        columns = data.length > 0 ? Object.keys(data[0]) : []
      } else {
        throw new Error(`Unsupported file type: ${fileType}`)
      }

      // Store data in cache
      this.dataCache.set(sourceId, data)

      // Create data source metadata
      const dataSource: DataSource = {
        id: sourceId,
        name: name || fileName,
        type: fileType as any,
        status: 'connected',
        lastSync: new Date().toISOString(),
        recordCount: data.length,
        columns,
        connectionInfo: {
          fileName,
          fileSize: file.size,
          uploadDate: new Date().toISOString()
        }
      }

      this.dataSources.set(sourceId, dataSource)

      const queryTime = Date.now() - startTime
      logger.info(`✅ Data source added: ${sourceId} (${data.length} records, ${queryTime}ms)`)

      return dataSource
    } catch (error: any) {
      logger.error(`Failed to add data source: ${error.message}`)
      const dataSource: DataSource = {
        id: sourceId,
        name: name || fileName,
        type: fileType as any,
        status: 'error',
        error: error.message
      }
      this.dataSources.set(sourceId, dataSource)
      throw error
    }
  }

  /**
   * Query data from a specific source
   */
  public async queryData(
    sourceId: string,
    options?: {
      limit?: number
      offset?: number
      filter?: (record: DataRecord) => boolean
      sort?: { column: string; order: 'asc' | 'desc' }
    }
  ): Promise<DataQueryResult> {
    const startTime = Date.now()
    logger.info(`Querying data from source: ${sourceId}`)

    const source = this.dataSources.get(sourceId)
    if (!source) {
      throw new Error(`Data source not found: ${sourceId}`)
    }

    if (source.status === 'error') {
      throw new Error(`Data source is in error state: ${source.error}`)
    }

    let data = this.dataCache.get(sourceId)
    if (!data) {
      throw new Error(`Data not loaded for source: ${sourceId}`)
    }

    // Apply filter
    if (options?.filter) {
      data = data.filter(options.filter)
    }

    // Apply sorting
    if (options?.sort) {
      const { column, order } = options.sort
      data = [...data].sort((a, b) => {
        const aVal = a[column]
        const bVal = b[column]
        if (aVal < bVal) return order === 'asc' ? -1 : 1
        if (aVal > bVal) return order === 'asc' ? 1 : -1
        return 0
      })
    }

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || data.length
    const paginatedData = data.slice(offset, offset + limit)

    const queryTime = Date.now() - startTime

    const result: DataQueryResult = {
      data: paginatedData,
      columns: source.columns || [],
      rowCount: data.length,
      metadata: {
        source: source.name,
        timestamp: new Date().toISOString(),
        queryTime
      }
    }

    logger.info(`✅ Query completed: ${paginatedData.length} rows returned (${queryTime}ms)`)
    return result
  }

  /**
   * Get all registered data sources
   */
  public getDataSources(): DataSource[] {
    return Array.from(this.dataSources.values())
  }

  /**
   * Get specific data source
   */
  public getDataSource(sourceId: string): DataSource | undefined {
    return this.dataSources.get(sourceId)
  }

  /**
   * Remove a data source
   */
  public removeDataSource(sourceId: string): boolean {
    this.dataCache.delete(sourceId)
    return this.dataSources.delete(sourceId)
  }

  /**
   * Sync/refresh a data source
   */
  public async syncDataSource(sourceId: string): Promise<DataSource> {
    const source = this.dataSources.get(sourceId)
    if (!source) {
      throw new Error(`Data source not found: ${sourceId}`)
    }

    source.status = 'syncing'
    this.dataSources.set(sourceId, source)

    // Simulate sync delay for file-based sources
    await new Promise(resolve => setTimeout(resolve, 1000))

    source.status = 'connected'
    source.lastSync = new Date().toISOString()
    this.dataSources.set(sourceId, source)

    logger.info(`✅ Data source synced: ${sourceId}`)
    return source
  }

  /**
   * Detect file type from filename
   */
  private detectFileType(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'csv':
        return 'csv'
      case 'json':
        return 'json'
      case 'xlsx':
      case 'xls':
        return 'excel'
      default:
        return 'unknown'
    }
  }

  /**
   * Get aggregated statistics for a data source
   */
  public async getStatistics(
    sourceId: string,
    column: string
  ): Promise<{
    count: number
    sum?: number
    avg?: number
    min?: number
    max?: number
    distinct?: number
  }> {
    const data = this.dataCache.get(sourceId)
    if (!data) {
      throw new Error(`Data not loaded for source: ${sourceId}`)
    }

    const values = data.map(record => record[column]).filter(v => v !== undefined && v !== null)
    const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(Number)

    const stats: any = {
      count: values.length,
      distinct: new Set(values).size
    }

    if (numericValues.length > 0) {
      stats.sum = numericValues.reduce((a, b) => a + b, 0)
      stats.avg = stats.sum / numericValues.length
      stats.min = Math.min(...numericValues)
      stats.max = Math.max(...numericValues)
    }

    return stats
  }

  /**
   * Group data by column and aggregate
   */
  public async groupBy(
    sourceId: string,
    groupColumn: string,
    aggregateColumn: string,
    aggregateFunction: 'sum' | 'avg' | 'count' | 'min' | 'max'
  ): Promise<{ [key: string]: number }> {
    const data = this.dataCache.get(sourceId)
    if (!data) {
      throw new Error(`Data not loaded for source: ${sourceId}`)
    }

    const groups: { [key: string]: number[] } = {}

    data.forEach(record => {
      const groupValue = String(record[groupColumn] || 'N/A')
      const aggregateValue = Number(record[aggregateColumn])

      if (!groups[groupValue]) {
        groups[groupValue] = []
      }

      if (!isNaN(aggregateValue)) {
        groups[groupValue].push(aggregateValue)
      }
    })

    const result: { [key: string]: number } = {}

    Object.entries(groups).forEach(([key, values]) => {
      switch (aggregateFunction) {
        case 'sum':
          result[key] = values.reduce((a, b) => a + b, 0)
          break
        case 'avg':
          result[key] = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
          break
        case 'count':
          result[key] = values.length
          break
        case 'min':
          result[key] = values.length > 0 ? Math.min(...values) : 0
          break
        case 'max':
          result[key] = values.length > 0 ? Math.max(...values) : 0
          break
      }
    })

    return result
  }
}

export default DataSourceService
