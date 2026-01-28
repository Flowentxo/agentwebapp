// CRITICAL: Load environment variables FIRST before any other imports
import './env-loader'; // Auto-restart trigger

import { createServer } from 'http'
import { app, setupErrorHandling } from './app'
import { initializeSocketIO } from './socket'
import { registerRoutes } from './routes'
import { logger } from './utils/logger'

// SINTRA.AI v3 - Core Services
import { agentManager } from './services/AgentManager'
import { automationScheduler } from './scheduler/automationTasks'
import { predictionScheduler } from './services/PredictionSchedulerService'
import { initializeToolExecutors } from './services/ToolExecutorRegistry'
import { jobQueueService } from './services/JobQueueService'
import { processKnowledgeFile } from './jobs/processKnowledgeFile'

// Phase 12: Tool Execution Layer
import { initializeTools } from './services/tools'

// Workflow Cleanup Worker (Smart Cleanup for suspended/zombie workflows)
import { startCleanupWorker, stopCleanupWorker } from './workers/WorkflowCleanupWorker'

// Log Retention Worker (Hybrid Storage cleanup - prune old logs, delete from blob storage)
import { startLogRetentionWorker, stopLogRetentionWorker } from './workers/LogRetentionWorker'

const server = createServer(app)

// Initialize Socket.IO
const io = initializeSocketIO(server)

// Make Socket.IO available to routes via app
app.set('io', io)

// Register all API routes
// This must happen BEFORE error handling but AFTER middleware
registerRoutes(app)

// Setup centralized error handling (must be last middleware)
setupErrorHandling()

const PORT = process.env.PORT || 4000

// Initialize SINTRA.AI v3 System
async function initializeSystem() {
  try {
    logger.info('═══════════════════════════════════════════')
    logger.info('🚀 SINTRA.AI v3 - System Initialization')
    logger.info('═══════════════════════════════════════════')

    // Initialize Custom Tool Executors (Phase 8)
    initializeToolExecutors()
    logger.info('✅ Custom tool executors initialized')

    // Initialize Tool Execution Layer (Phase 12) - Gmail, HubSpot, etc.
    initializeTools()
    logger.info('✅ Tool Execution Layer initialized (Gmail, HubSpot tools)')

    // Initialize Job Queue for background processing
    jobQueueService.initializeQueue('document_processing', async (job) => {
      const jobData = job.data as { fileId?: string; userId?: string; workspaceId?: string; action?: string }
      logger.info(`[JOB_QUEUE] Processing knowledge file: ${jobData.fileId || 'unknown'}`)
      await processKnowledgeFile(job.data as any)
      return { success: true, fileId: jobData.fileId }
    })
    logger.info('✅ Job queue initialized (document processing)')

    // Initialize Agent Manager (which initializes Brain AI and all 12 agents)
    await agentManager.initializeAll()

    // Start automation scheduler
    automationScheduler.startAllTasks()
    logger.info('✅ Automation scheduler initialized')

    // Start prediction scheduler (Brain AI Predictive Context Engine)
    predictionScheduler.start()
    logger.info('✅ Predictive Context Engine scheduler started')

    // Start Workflow Cleanup Worker (handles zombie detection + suspended workflow cleanup)
    startCleanupWorker()
    logger.info('✅ Workflow Cleanup Worker started (zombie detection + suspension cleanup)')

    // Start Log Retention Worker (hybrid storage cleanup - prune after 7 days, delete after 90 days)
    startLogRetentionWorker()
    logger.info('✅ Log Retention Worker started (hybrid storage cleanup)')

    // Start server on 127.0.0.1 to avoid IPv6 issues with Next.js proxy
    // Using '0.0.0.0' would also work but 127.0.0.1 is more explicit for local dev
    const HOST = process.env.HOST || '0.0.0.0'
    server.listen(Number(PORT), HOST, () => {
      logger.info('═══════════════════════════════════════════')
      logger.info(`✅ Server running on ${HOST}:${PORT}`)
      logger.info(`✅ WebSocket server ready`)
      logger.info(`✅ All 12 agents operational`)
      logger.info(`✅ Brain AI connected`)
      logger.info(`✅ Real Data Mode: ENFORCED`)
      logger.info('═══════════════════════════════════════════')
      logger.info('📊 System Status:')
      const stats = agentManager.getSystemStats()
      logger.info(`   - Total Agents: ${stats.totalAgents}`)
      logger.info(`   - Brain AI Memory: ${stats.brainAI.totalMemories} records`)
      logger.info(`   - System Health: ${agentManager.isSystemHealthy() ? 'HEALTHY' : 'DEGRADED'}`)
      logger.info('═══════════════════════════════════════════')
      logger.info('🌐 Available at:')
      logger.info(`   - API: http://localhost:${PORT}`)
      logger.info(`   - Health: http://localhost:${PORT}/api/unified-agents/health`)
      logger.info(`   - Agents: http://localhost:${PORT}/api/unified-agents`)
      logger.info('═══════════════════════════════════════════')
    })
  } catch (error: any) {
    logger.error('❌ System initialization failed:', error)
    logger.error('Stack:', error.stack)
    process.exit(1)
  }
}

// Start the system
initializeSystem()
