import express, { Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import { spawn } from 'child_process'
import { OpenAIValidationService } from '../services/OpenAIValidationService'
import { DataSourceService } from '../services/DataSourceService'
import { DexterAnalysisService } from '../services/DexterAnalysisService'
import { Logger } from '../utils/logger'

const router = express.Router()
const logger = new Logger('DexterRoutes')

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.json', '.xlsx', '.xls']
    const ext = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'))
    if (allowedTypes.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error(`File type not supported. Allowed: ${allowedTypes.join(', ')}`))
    }
  }
})

/**
 * GET /api/dexter/validate-api-key
 * Validate OpenAI API key
 */
router.get('/validate-api-key', async (req: Request, res: Response) => {
  try {
    const forceRefresh = req.query.force === 'true'
    const validationService = OpenAIValidationService.getInstance()
    const result = await validationService.validateApiKey(forceRefresh)

    res.json({
      success: true,
      validation: result
    })
  } catch (error: any) {
    logger.error('API key validation error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/dexter/data-sources
 * Get all registered data sources
 */
router.get('/data-sources', async (req: Request, res: Response) => {
  try {
    const dataSourceService = DataSourceService.getInstance()
    const sources = dataSourceService.getDataSources()

    res.json({
      success: true,
      dataSources: sources,
      count: sources.length
    })
  } catch (error: any) {
    logger.error('Get data sources error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/dexter/upload-data
 * Upload a data file (CSV, JSON, Excel)
 */
router.post('/upload-data', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      })
    }

    const name = req.body.name || req.file.originalname
    const dataSourceService = DataSourceService.getInstance()
    const dataSource = await dataSourceService.addFileDataSource(req.file, name)

    logger.info(`File uploaded successfully: ${dataSource.id}`)

    res.json({
      success: true,
      dataSource,
      message: `Data source added: ${dataSource.recordCount} records loaded`
    })
  } catch (error: any) {
    logger.error('Upload data error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/dexter/data-sources/:id
 * Get specific data source details
 */
router.get('/data-sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const dataSourceService = DataSourceService.getInstance()
    const dataSource = dataSourceService.getDataSource(id)

    if (!dataSource) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      })
    }

    res.json({
      success: true,
      dataSource
    })
  } catch (error: any) {
    logger.error('Get data source error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/dexter/data-sources/:id/sync
 * Sync/refresh a data source
 */
router.post('/data-sources/:id/sync', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const dataSourceService = DataSourceService.getInstance()
    const dataSource = await dataSourceService.syncDataSource(id)

    res.json({
      success: true,
      dataSource,
      message: 'Data source synced successfully'
    })
  } catch (error: any) {
    logger.error('Sync data source error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * DELETE /api/dexter/data-sources/:id
 * Remove a data source
 */
router.delete('/data-sources/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const dataSourceService = DataSourceService.getInstance()
    const removed = dataSourceService.removeDataSource(id)

    if (!removed) {
      return res.status(404).json({
        success: false,
        error: 'Data source not found'
      })
    }

    res.json({
      success: true,
      message: 'Data source removed successfully'
    })
  } catch (error: any) {
    logger.error('Remove data source error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/dexter/analyze
 * Perform data analysis
 */
router.post('/analyze', async (req: Request, res: Response) => {
  try {
    const { query, dataSourceId, timeRange, context } = req.body

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      })
    }

    const analysisService = DexterAnalysisService.getInstance()
    const result = await analysisService.analyze({
      query,
      dataSourceId,
      timeRange,
      context
    })

    logger.info(`Analysis completed: ${result.id} (${result.processingTime}ms)`)

    res.json({
      success: true,
      analysis: result
    })
  } catch (error: any) {
    logger.error('Analysis error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * GET /api/dexter/quick-stats
 * Get quick statistics for dashboard
 */
router.get('/quick-stats', async (req: Request, res: Response) => {
  try {
    const dataSourceService = DataSourceService.getInstance()
    const sources = dataSourceService.getDataSources()

    const stats = {
      totalDataSources: sources.length,
      connectedSources: sources.filter(s => s.status === 'connected').length,
      totalRecords: sources.reduce((sum, s) => sum + (s.recordCount || 0), 0),
      lastUpdate: sources.length > 0 ? sources[0].lastSync : new Date().toISOString()
    }

    res.json({
      success: true,
      stats
    })
  } catch (error: any) {
    logger.error('Quick stats error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * POST /api/dexter/query-data
 * Query data from a specific source
 */
router.post('/query-data', async (req: Request, res: Response) => {
  try {
    const { sourceId, limit, offset, filter, sort } = req.body

    if (!sourceId) {
      return res.status(400).json({
        success: false,
        error: 'sourceId is required'
      })
    }

    const dataSourceService = DataSourceService.getInstance()
    const result = await dataSourceService.queryData(sourceId, {
      limit,
      offset,
      sort
    })

    res.json({
      success: true,
      result
    })
  } catch (error: any) {
    logger.error('Query data error:', error.message)
    res.status(500).json({
      success: false,
      error: error.message
    })
  }
})

/**
 * Get conversation history (legacy support)
 */
router.get('/history/:conversation_id', async (req, res) => {
  try {
    const { conversation_id } = req.params;
    const { limit = 10 } = req.query;

    const pythonScript = path.join(__dirname, '../../dexter_agent_runner.py');

    const python = spawn('python', [
      pythonScript,
      JSON.stringify({
        action: 'history',
        conversation_id,
        limit: Number(limit)
      })
    ]);

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      output += data.toString();
    });

    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    python.on('close', (code) => {
      if (code !== 0) {
        return res.status(500).json({
          success: false,
          error: 'Failed to load history',
          details: errorOutput
        });
      }

      try {
        const result = JSON.parse(output);
        res.json({
          success: true,
          data: result
        });
      } catch (parseError) {
        res.status(500).json({
          success: false,
          error: 'Failed to parse history',
          raw: output
        });
      }
    });

  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Health check & version info
 */
router.get('/health', (req, res) => {
  const analysisService = DexterAnalysisService.getInstance()
  const versionInfo = analysisService.getVersion()
  const validationService = OpenAIValidationService.getInstance()

  res.json({
    success: true,
    service: 'DEXTER v2 - Data Analysis Agent',
    status: 'online',
    version: versionInfo.version,
    realDataMode: versionInfo.realDataMode,
    noDummyOutput: versionInfo.noDummyOutput,
    apiKeyConfigured: !!process.env.OPENAI_API_KEY,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/agents/dexter/version
 * Get detailed version and configuration info
 */
router.get('/version', (req, res) => {
  const analysisService = DexterAnalysisService.getInstance()
  const versionInfo = analysisService.getVersion()
  const dataSourceService = DataSourceService.getInstance()
  const dataSources = dataSourceService.getDataSources()

  res.json({
    success: true,
    agent: 'DEXTER v2',
    version: versionInfo.version,
    configuration: {
      realDataMode: versionInfo.realDataMode,
      noDummyOutput: versionInfo.noDummyOutput,
      strictValidation: true,
      requireDataSource: true,
      validateApiKey: true
    },
    status: {
      apiKeyConfigured: !!process.env.OPENAI_API_KEY,
      dataSourcesConnected: dataSources.filter(ds => ds.status === 'connected').length,
      totalDataSources: dataSources.length
    },
    policies: {
      dummyOutputDisabled: true,
      placeholderResultsDisabled: true,
      simulatedDataDisabled: true,
      realTimeVerificationEnabled: true,
      dataIntegrityCheckEnabled: true
    },
    timestamp: new Date().toISOString()
  });
});

export default router
