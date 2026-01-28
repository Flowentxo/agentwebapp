import { Express } from 'express'
import { agentRouter } from './routes/agents'
import { authRouter } from './routes/auth'
import { authEnhancedRouter } from './routes/auth-enhanced'
import { userRouter } from './routes/users'
import { automationRouter } from './routes/automation'
import { chatRouter } from './routes/chat'
import { brainRouter } from './routes/brain'
import dexterRouter from './routes/dexter'
import { knowledgeRouter } from './routes/knowledge'
import { unifiedAgentsRouter } from './routes/unified-agents'
import { exportRouter } from './routes/export'
import { boardRouter } from './routes/board'
import collaborationsRouter from './routes/collaborations'
import collaborationsSSERouter from './routes/collaborations-sse'
import collaborationAnalyticsRouter from './routes/collaboration-analytics'
import { agentMetricsRouter } from './routes/agent-metrics'
import { securityLogsRouter } from './routes/security-logs'
import filesRouter from './routes/files'
import agentFactoryRouter from './routes/agent-factory'
import workflowsRouter from './routes/workflows'
import workflowExecutionsRouter from './routes/workflow-executions'
import knowledgeBaseRouter from './routes/knowledge-base'
import multiAgentRouter from './routes/multi-agent'
import oauthIntegrationsRouter from './routes/oauth-integrations'
import jobsRouter from './routes/jobs'
import schedulingRouter from './routes/scheduling'
import rbacRouter from './routes/rbac'
import computerUseRouter from './routes/computer-use'
import customToolsRouter from './routes/custom-tools'
import customToolsAdvancedRouter from './routes/custom-tools-advanced'
import dbConnectionsRouter from './routes/db-connections'
import teamsRouter from './routes/teams'
import { learningRouter } from './routes/learning'
import { brainUploadRouter } from './routes/brain-upload'
import { businessIdeasRouter } from './routes/business-ideas'
import calendarRouter from './routes/calendar'
import predictionsRouter from './routes/predictions'
import { analyticsRouter } from './routes/analytics'
import healthRouter from './routes/health'
import inboxArtifactsRouter from './routes/inbox-artifacts'
import { apiLimiter, loginLimiter } from './middleware/rate-limiter'

export function registerRoutes(app: Express) {
  // ============================================================================
  // HEALTH CHECK ROUTES (No rate limiting for probes)
  // ============================================================================
  app.use('/api/health', healthRouter)

  // ============================================================================
  // ROUTES WITH RATE LIMITING
  // ============================================================================

  // Apply general API rate limiting to all /api routes
  app.use('/api/', apiLimiter)

  // Authentication (with brute-force protection)
  app.use('/api/auth-v2', loginLimiter, authEnhancedRouter)
  app.use('/api/auth', loginLimiter, authEnhancedRouter)
  app.use('/api/users', userRouter)

  // Core SINTRA.AI v3 Routes
  app.use('/api/analytics', analyticsRouter) // NEW: Analytics Bridge
  app.use('/api/unified-agents', unifiedAgentsRouter) // All 12 agents unified API
  app.use('/api/export', exportRouter) // Universal export service
  app.use('/api/brain', brainRouter) // Brain AI context & memory
  app.use('/api/brain', brainUploadRouter) // Brain AI document upload
  app.use('/api/learning', learningRouter) // Daily Learning Questions
  app.use('/api/business-ideas', businessIdeasRouter) // Proactive Business Ideas
  app.use('/api/knowledge', knowledgeRouter) // Knowledge base
  app.use('/api/board', boardRouter) // Board & Kanban management
  app.use('/api/collaborations', collaborationsSSERouter) // SSE Streaming
  app.use('/api/collaborations', collaborationsRouter) // Collaboration Lab V2
  app.use('/api/collaboration-analytics', collaborationAnalyticsRouter) // Analytics & Insights

  // Legacy agent-specific routes (maintained for backward compatibility)
  app.use('/api/agents/dexter', dexterRouter)
  app.use('/api/agents', agentMetricsRouter) // Agent metrics & ratings
  app.use('/api/agents', agentRouter)
  app.use('/api/agents', chatRouter)

  // Automation & Workflows
  app.use('/api/automation', automationRouter)

  // Security Monitoring (Admin-only)
  app.use('/api/security', securityLogsRouter)

  // File Management
  app.use('/api/files', filesRouter)

  // Agent Studio Workflows
  app.use('/api/workflows', workflowsRouter)
  app.use('/api/workflow-executions', workflowExecutionsRouter)

  // Knowledge Base & RAG
  app.use('/api/knowledge-base', knowledgeBaseRouter)

  // Multi-Agent Communication & Coordination
  app.use('/api/multi-agent', multiAgentRouter)

  // OAuth Integrations (Gmail, Slack, etc.)
  app.use('/api/integrations', oauthIntegrationsRouter)

  // Agent Factory (Personalized Agent Creation)
  app.use('/api/agent-factory', agentFactoryRouter)

  // Background Jobs & Scheduling
  app.use('/api/jobs', jobsRouter)
  app.use('/api/scheduling', schedulingRouter)

  // RBAC & Permissions
  app.use('/api/rbac', rbacRouter)

  // Computer Use Agent (Browser Automation)
  app.use('/api/computer-use', computerUseRouter)

  // Custom Tools & API Connectors (Phase 8 & 9)
  app.use('/api/custom-tools', customToolsRouter)
  app.use('/api/custom-tools', customToolsAdvancedRouter) // Database Queries & Webhooks (Phase 9)

  // Database Connections (Phase 9 Sprint 2 Epic 6)
  app.use('/api/db-connections', dbConnectionsRouter)

  // Multi-Agent Teams (Phase 2)
  app.use('/api/teams', teamsRouter)

  // Calendar Integration & Predictive Context Engine (Brain AI)
  app.use('/api/calendar', calendarRouter)
  app.use('/api/predictions', predictionsRouter)

  // Inbox & Artifacts (Flowent Inbox v2)
  app.use('/api/inbox', inboxArtifactsRouter)
}
