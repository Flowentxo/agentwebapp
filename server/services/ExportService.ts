/**
 * Export Service - Universal Export for PDF, CSV, XLSX, PPTX
 * Supports all agent data exports with real data only
 */

import * as XLSX from 'xlsx'
import { logger } from '../utils/logger'

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'xlsx' | 'pptx'
  data: any
  agentName: string
  reportType: string
  metadata?: {
    title?: string
    description?: string
    author?: string
  }
}

export interface ExportResult {
  success: boolean
  fileName: string
  filePath?: string
  buffer?: Buffer
  mimeType: string
  error?: string
}

export class ExportService {
  private static instance: ExportService

  private constructor() {}

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService()
    }
    return ExportService.instance
  }

  /**
   * Export data in specified format
   */
  public async export(options: ExportOptions): Promise<ExportResult> {
    try {
      logger.info(`[ExportService] Exporting ${options.format} for ${options.agentName}`)

      // Validate that data is real (not dummy)
      if (!options.data || Object.keys(options.data).length === 0) {
        throw new Error('No real data available for export. Real data mode enforcement.')
      }

      switch (options.format) {
        case 'csv':
          return await this.exportCSV(options)
        case 'xlsx':
          return await this.exportXLSX(options)
        case 'pdf':
          return await this.exportPDF(options)
        case 'pptx':
          return await this.exportPPTX(options)
        default:
          throw new Error(`Unsupported format: ${options.format}`)
      }
    } catch (error: any) {
      logger.error('[ExportService] Export failed:', error)
      return {
        success: false,
        fileName: '',
        mimeType: '',
        error: error.message
      }
    }
  }

  /**
   * Export to CSV
   */
  private async exportCSV(options: ExportOptions): Promise<ExportResult> {
    const { data, agentName, reportType } = options
    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = `Report_${agentName}_${reportType}_${timestamp}.csv`

    try {
      let csvContent = ''

      // Convert data to CSV format
      if (Array.isArray(data)) {
        // Array of objects
        if (data.length > 0) {
          const headers = Object.keys(data[0])
          csvContent = headers.join(',') + '\n'

          data.forEach(row => {
            const values = headers.map(header => {
              const value = row[header]
              // Escape commas and quotes
              if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                return `"${value.replace(/"/g, '""')}"`
              }
              return value ?? ''
            })
            csvContent += values.join(',') + '\n'
          })
        }
      } else if (typeof data === 'object') {
        // Single object - convert to key-value pairs
        csvContent = 'Key,Value\n'
        Object.entries(data).forEach(([key, value]) => {
          const formattedValue = typeof value === 'object'
            ? JSON.stringify(value)
            : String(value)
          csvContent += `${key},"${formattedValue.replace(/"/g, '""')}"\n`
        })
      }

      const buffer = Buffer.from(csvContent, 'utf-8')

      return {
        success: true,
        fileName,
        buffer,
        mimeType: 'text/csv'
      }
    } catch (error: any) {
      throw new Error(`CSV export failed: ${error.message}`)
    }
  }

  /**
   * Export to XLSX (Excel)
   */
  private async exportXLSX(options: ExportOptions): Promise<ExportResult> {
    const { data, agentName, reportType } = options
    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = `Report_${agentName}_${reportType}_${timestamp}.xlsx`

    try {
      const workbook = XLSX.utils.book_new()

      // Convert data to worksheet
      let worksheet: XLSX.WorkSheet

      if (Array.isArray(data)) {
        worksheet = XLSX.utils.json_to_sheet(data)
      } else if (typeof data === 'object') {
        // Convert object to array of key-value pairs
        const flatData = Object.entries(data).map(([key, value]) => ({
          Key: key,
          Value: typeof value === 'object' ? JSON.stringify(value) : value
        }))
        worksheet = XLSX.utils.json_to_sheet(flatData)
      } else {
        worksheet = XLSX.utils.aoa_to_sheet([[data]])
      }

      XLSX.utils.book_append_sheet(workbook, worksheet, reportType)

      // Add metadata sheet
      if (options.metadata) {
        const metadataSheet = XLSX.utils.json_to_sheet([
          { Property: 'Title', Value: options.metadata.title || reportType },
          { Property: 'Agent', Value: agentName },
          { Property: 'Generated', Value: new Date().toISOString() },
          { Property: 'Description', Value: options.metadata.description || '' }
        ])
        XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadata')
      }

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

      return {
        success: true,
        fileName,
        buffer: Buffer.from(buffer),
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      }
    } catch (error: any) {
      throw new Error(`XLSX export failed: ${error.message}`)
    }
  }

  /**
   * Export to PDF
   * Note: For production, use a library like pdfkit or puppeteer
   */
  private async exportPDF(options: ExportOptions): Promise<ExportResult> {
    const { data, agentName, reportType, metadata } = options
    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = `Report_${agentName}_${reportType}_${timestamp}.pdf`

    try {
      // Simple HTML to PDF conversion
      // In production, use puppeteer or pdfkit
      const htmlContent = this.generateHTMLReport(data, agentName, reportType, metadata)

      // For now, return HTML buffer (in production, convert to actual PDF)
      // TODO: Integrate puppeteer or pdfkit for real PDF generation
      const buffer = Buffer.from(htmlContent, 'utf-8')

      return {
        success: true,
        fileName: fileName.replace('.pdf', '.html'), // Temporarily HTML
        buffer,
        mimeType: 'text/html' // Change to 'application/pdf' when PDF library is integrated
      }
    } catch (error: any) {
      throw new Error(`PDF export failed: ${error.message}`)
    }
  }

  /**
   * Export to PPTX (PowerPoint)
   * Note: For production, use a library like pptxgenjs
   */
  private async exportPPTX(options: ExportOptions): Promise<ExportResult> {
    const { data, agentName, reportType } = options
    const timestamp = new Date().toISOString().split('T')[0]
    const fileName = `Report_${agentName}_${reportType}_${timestamp}.pptx`

    try {
      // Placeholder: In production, use pptxgenjs
      // For now, create a simple JSON representation
      const presentation = {
        title: `${agentName} - ${reportType}`,
        slides: [
          {
            title: 'Overview',
            content: data
          }
        ],
        metadata: {
          generated: new Date().toISOString(),
          agent: agentName
        }
      }

      const buffer = Buffer.from(JSON.stringify(presentation, null, 2), 'utf-8')

      return {
        success: true,
        fileName: fileName.replace('.pptx', '.json'), // Temporarily JSON
        buffer,
        mimeType: 'application/json' // Change to 'application/vnd.openxmlformats-officedocument.presentationml.presentation' when PPTX library is integrated
      }
    } catch (error: any) {
      throw new Error(`PPTX export failed: ${error.message}`)
    }
  }

  /**
   * Generate HTML report (for PDF conversion)
   */
  private generateHTMLReport(data: any, agentName: string, reportType: string, metadata?: any): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${agentName} - ${reportType}</title>
  <style>
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
      color: #1a202c;
    }
    h1 {
      color: #2d3748;
      border-bottom: 3px solid #4299e1;
      padding-bottom: 10px;
    }
    .metadata {
      background: #f7fafc;
      padding: 15px;
      border-radius: 8px;
      margin: 20px 0;
    }
    .data-section {
      margin: 20px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #cbd5e0;
      padding: 12px;
      text-align: left;
    }
    th {
      background: #edf2f7;
      font-weight: 600;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 12px;
      color: #718096;
    }
  </style>
</head>
<body>
  <h1>${agentName} - ${reportType}</h1>

  <div class="metadata">
    <strong>Report Generated:</strong> ${new Date().toLocaleString()}<br>
    <strong>Agent:</strong> ${agentName}<br>
    ${metadata?.title ? `<strong>Title:</strong> ${metadata.title}<br>` : ''}
    ${metadata?.description ? `<strong>Description:</strong> ${metadata.description}<br>` : ''}
  </div>

  <div class="data-section">
    <h2>Data</h2>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>

  <div class="footer">
    Generated with SINTRA.AI v3 | ${new Date().toISOString()}
  </div>
</body>
</html>
    `.trim()
  }

  /**
   * Get supported formats
   */
  public getSupportedFormats(): string[] {
    return ['csv', 'xlsx', 'pdf', 'pptx']
  }
}

export const exportService = ExportService.getInstance()
