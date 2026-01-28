/**
 * OpsController.ts
 *
 * Phase 7: Operational Intelligence Layer
 *
 * REST API endpoints for the Operations Dashboard.
 * Provides access to metrics, search, alerts, and queue health.
 *
 * Endpoints:
 * - GET  /ops/dashboard          - Dashboard summary metrics
 * - GET  /ops/workflows/:id      - Workflow-specific metrics
 * - GET  /ops/workflows/top      - Top workflows by activity
 * - POST /ops/search             - Search executions
 * - GET  /ops/timeseries/:metric - Time series data
 * - GET  /ops/costs              - Cost breakdown
 * - GET  /ops/queues             - Queue health
 * - GET  /ops/queues/:name       - Single queue details
 * - POST /ops/queues/:name/pause - Pause queue
 * - POST /ops/queues/:name/resume - Resume queue
 * - GET  /ops/alerts/rules       - List alert rules
 * - POST /ops/alerts/rules       - Create alert rule
 * - PUT  /ops/alerts/rules/:id   - Update alert rule
 * - DELETE /ops/alerts/rules/:id - Delete alert rule
 * - GET  /ops/alerts/incidents   - List incidents
 * - POST /ops/alerts/incidents/:id/acknowledge - Acknowledge
 * - POST /ops/alerts/incidents/:id/resolve - Resolve
 */

import { Router, Request, Response, NextFunction } from 'express';
import { getMetricsService } from '../services/monitoring/MetricsService';
import { getExecutionSearchService } from '../services/monitoring/ExecutionSearchService';
import { getAlertingService } from '../services/monitoring/AlertingService';
import { getQueueMonitor } from '../services/monitoring/QueueMonitor';
import { AlertConditionType, AlertSeverity } from '@/lib/db/schema-monitoring';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  userId?: string;
  workspaceId?: string;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Require admin or ops role for access.
 */
function requireOpsAccess(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // In production, check for admin/ops role
  // For now, just ensure authenticated
  if (!req.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }
  next();
}

// ============================================================================
// CONTROLLER
// ============================================================================

export function createOpsController(): Router {
  const router = Router();

  const metricsService = getMetricsService();
  const searchService = getExecutionSearchService();
  const alertingService = getAlertingService();
  const queueMonitor = getQueueMonitor();

  // --------------------------------------------------------------------------
  // DASHBOARD
  // --------------------------------------------------------------------------

  /**
   * GET /ops/dashboard
   * Get dashboard summary metrics.
   */
  router.get(
    '/dashboard',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const workspaceId = req.query.workspaceId as string | undefined;
        const metrics = await metricsService.getDashboardMetrics(workspaceId);

        res.json({
          success: true,
          data: metrics,
        });
      } catch (error) {
        console.error('[OpsController] Dashboard error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch dashboard metrics',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // WORKFLOW METRICS
  // --------------------------------------------------------------------------

  /**
   * GET /ops/workflows/top
   * Get top workflows by activity.
   */
  router.get(
    '/workflows/top',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const limit = parseInt(req.query.limit as string) || 10;
        const workspaceId = req.query.workspaceId as string | undefined;

        const timeRange = req.query.from
          ? {
              from: new Date(req.query.from as string),
              to: req.query.to
                ? new Date(req.query.to as string)
                : new Date(),
            }
          : undefined;

        const workflows = await metricsService.getTopWorkflows(
          limit,
          timeRange,
          workspaceId
        );

        res.json({
          success: true,
          data: workflows,
        });
      } catch (error) {
        console.error('[OpsController] Top workflows error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch top workflows',
        });
      }
    }
  );

  /**
   * GET /ops/workflows/:id
   * Get metrics for a specific workflow.
   */
  router.get(
    '/workflows/:id',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const workflowId = req.params.id;

        const timeRange = req.query.from
          ? {
              from: new Date(req.query.from as string),
              to: req.query.to
                ? new Date(req.query.to as string)
                : new Date(),
            }
          : undefined;

        const metrics = await metricsService.getWorkflowMetrics(
          workflowId,
          timeRange
        );

        res.json({
          success: true,
          data: metrics,
        });
      } catch (error) {
        console.error('[OpsController] Workflow metrics error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch workflow metrics',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // EXECUTION SEARCH
  // --------------------------------------------------------------------------

  /**
   * POST /ops/search
   * Search executions with filters.
   */
  router.post(
    '/search',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          query,
          status,
          workflowId,
          tags,
          dateRange,
          durationRange,
          jsonPaths,
          errorCode,
          errorMessageLike,
          triggeredBy,
          hasLoops,
          minTokens,
        } = req.body;

        const {
          limit = 50,
          offset = 0,
          cursor,
          sortBy = 'startedAt',
          sortOrder = 'desc',
          includeScore = false,
          highlight = false,
        } = req.body.options || {};

        const searchQuery = {
          query,
          status,
          workflowId,
          workspaceId: req.workspaceId,
          tags,
          dateRange: dateRange
            ? {
                from: dateRange.from ? new Date(dateRange.from) : undefined,
                to: dateRange.to ? new Date(dateRange.to) : undefined,
              }
            : undefined,
          durationRange,
          jsonPaths,
          errorCode,
          errorMessageLike,
          triggeredBy,
          hasLoops,
          minTokens,
        };

        const results = await searchService.search(searchQuery, {
          limit,
          offset,
          cursor,
          sortBy,
          sortOrder,
          includeScore,
          highlight,
        });

        res.json({
          success: true,
          data: results,
        });
      } catch (error) {
        console.error('[OpsController] Search error:', error);
        res.status(500).json({
          success: false,
          error: 'Search failed',
        });
      }
    }
  );

  /**
   * GET /ops/search/email/:email
   * Quick search by email address.
   */
  router.get(
    '/search/email/:email',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const email = decodeURIComponent(req.params.email);
        const limit = parseInt(req.query.limit as string) || 20;

        const results = await searchService.findByEmail(email, { limit });

        res.json({
          success: true,
          data: results,
        });
      } catch (error) {
        console.error('[OpsController] Email search error:', error);
        res.status(500).json({
          success: false,
          error: 'Email search failed',
        });
      }
    }
  );

  /**
   * GET /ops/search/errors
   * Find executions with error pattern.
   */
  router.get(
    '/search/errors',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const pattern = req.query.pattern as string;
        const limit = parseInt(req.query.limit as string) || 20;

        if (!pattern) {
          res.status(400).json({
            success: false,
            error: 'Pattern is required',
          });
          return;
        }

        const results = await searchService.findByErrorPattern(pattern, {
          limit,
        });

        res.json({
          success: true,
          data: results,
        });
      } catch (error) {
        console.error('[OpsController] Error search error:', error);
        res.status(500).json({
          success: false,
          error: 'Error search failed',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // TIME SERIES
  // --------------------------------------------------------------------------

  /**
   * GET /ops/timeseries/:metric
   * Get time series data for a metric.
   */
  router.get(
    '/timeseries/:metric',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const metric = req.params.metric;
        const granularity = (req.query.granularity as any) || '1h';
        const workflowId = req.query.workflowId as string | undefined;

        const from = req.query.from
          ? new Date(req.query.from as string)
          : new Date(Date.now() - 24 * 60 * 60 * 1000);
        const to = req.query.to
          ? new Date(req.query.to as string)
          : new Date();

        let data;

        switch (metric) {
          case 'executions':
            data = await metricsService.getExecutionTimeSeries(
              granularity,
              { from, to },
              workflowId,
              req.workspaceId
            );
            break;

          case 'failure-rate':
            data = await metricsService.getFailureRateTimeSeries(
              granularity,
              { from, to },
              workflowId
            );
            break;

          case 'duration':
            const percentile = parseFloat(
              (req.query.percentile as string) || '0.95'
            );
            data = await metricsService.getDurationTimeSeries(
              granularity,
              { from, to },
              percentile,
              workflowId
            );
            break;

          default:
            res.status(400).json({
              success: false,
              error: `Unknown metric: ${metric}`,
            });
            return;
        }

        res.json({
          success: true,
          data: {
            metric,
            granularity,
            timeRange: { from, to },
            series: data,
          },
        });
      } catch (error) {
        console.error('[OpsController] Time series error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch time series data',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // COST TRACKING
  // --------------------------------------------------------------------------

  /**
   * GET /ops/costs
   * Get cost breakdown.
   */
  router.get(
    '/costs',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = parseInt(req.query.days as string) || 30;
        const workspaceId = req.query.workspaceId as string | undefined;

        const from = new Date();
        from.setDate(from.getDate() - days);

        const breakdown = await metricsService.getCostBreakdown(
          { from, to: new Date() },
          workspaceId
        );

        res.json({
          success: true,
          data: breakdown,
        });
      } catch (error) {
        console.error('[OpsController] Cost breakdown error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch cost breakdown',
        });
      }
    }
  );

  /**
   * GET /ops/costs/daily
   * Get daily cost aggregates.
   */
  router.get(
    '/costs/daily',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const days = parseInt(req.query.days as string) || 30;

        const aggregates = await metricsService.getDailyCostAggregates(
          days,
          req.workspaceId
        );

        res.json({
          success: true,
          data: aggregates,
        });
      } catch (error) {
        console.error('[OpsController] Daily costs error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch daily costs',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // QUEUE HEALTH
  // --------------------------------------------------------------------------

  /**
   * GET /ops/queues
   * Get all queues health status.
   */
  router.get(
    '/queues',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const health = await queueMonitor.getAllQueuesHealth();
        const systemHealth = await queueMonitor.isSystemHealthy();

        res.json({
          success: true,
          data: {
            queues: health,
            systemHealthy: systemHealth.healthy,
            issues: systemHealth.issues,
          },
        });
      } catch (error) {
        console.error('[OpsController] Queues health error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch queue health',
        });
      }
    }
  );

  /**
   * GET /ops/queues/:name
   * Get specific queue details.
   */
  router.get(
    '/queues/:name',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const queueName = req.params.name;
        const health = await queueMonitor.getQueueHealth(queueName);

        if (!health) {
          res.status(404).json({
            success: false,
            error: 'Queue not found',
          });
          return;
        }

        const windowMinutes = parseInt(req.query.window as string) || 60;
        const metrics = await queueMonitor.getQueueMetrics(
          queueName,
          windowMinutes
        );

        const snapshots = await queueMonitor.getSnapshots(queueName, 30);

        res.json({
          success: true,
          data: {
            health,
            metrics,
            history: snapshots,
          },
        });
      } catch (error) {
        console.error('[OpsController] Queue details error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch queue details',
        });
      }
    }
  );

  /**
   * POST /ops/queues/:name/pause
   * Pause a queue.
   */
  router.post(
    '/queues/:name/pause',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const queueName = req.params.name;
        const success = await queueMonitor.pauseQueue(queueName);

        if (!success) {
          res.status(404).json({
            success: false,
            error: 'Queue not found',
          });
          return;
        }

        res.json({
          success: true,
          message: `Queue ${queueName} paused`,
        });
      } catch (error) {
        console.error('[OpsController] Pause queue error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to pause queue',
        });
      }
    }
  );

  /**
   * POST /ops/queues/:name/resume
   * Resume a paused queue.
   */
  router.post(
    '/queues/:name/resume',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const queueName = req.params.name;
        const success = await queueMonitor.resumeQueue(queueName);

        if (!success) {
          res.status(404).json({
            success: false,
            error: 'Queue not found',
          });
          return;
        }

        res.json({
          success: true,
          message: `Queue ${queueName} resumed`,
        });
      } catch (error) {
        console.error('[OpsController] Resume queue error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to resume queue',
        });
      }
    }
  );

  /**
   * POST /ops/queues/:name/retry-failed
   * Retry all failed jobs in a queue.
   */
  router.post(
    '/queues/:name/retry-failed',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const queueName = req.params.name;
        const limit = parseInt(req.body.limit) || 100;

        const retried = await queueMonitor.retryFailedJobs(queueName, limit);

        res.json({
          success: true,
          data: {
            retriedCount: retried,
          },
        });
      } catch (error) {
        console.error('[OpsController] Retry failed error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to retry jobs',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // ALERT RULES
  // --------------------------------------------------------------------------

  /**
   * GET /ops/alerts/rules
   * List alert rules.
   */
  router.get(
    '/alerts/rules',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const filters = {
          workspaceId: req.query.workspaceId as string | undefined,
          workflowId: req.query.workflowId as string | undefined,
          isEnabled:
            req.query.enabled !== undefined
              ? req.query.enabled === 'true'
              : undefined,
          conditionType: req.query.conditionType as
            | AlertConditionType
            | undefined,
        };

        const rules = await alertingService.getRules(filters);

        res.json({
          success: true,
          data: rules,
        });
      } catch (error) {
        console.error('[OpsController] List rules error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch alert rules',
        });
      }
    }
  );

  /**
   * GET /ops/alerts/rules/:id
   * Get a single alert rule.
   */
  router.get(
    '/alerts/rules/:id',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const rule = await alertingService.getRule(req.params.id);

        if (!rule) {
          res.status(404).json({
            success: false,
            error: 'Rule not found',
          });
          return;
        }

        res.json({
          success: true,
          data: rule,
        });
      } catch (error) {
        console.error('[OpsController] Get rule error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch alert rule',
        });
      }
    }
  );

  /**
   * POST /ops/alerts/rules
   * Create a new alert rule.
   */
  router.post(
    '/alerts/rules',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const {
          name,
          description,
          workflowId,
          workflowTags,
          conditionType,
          conditionConfig,
          severity,
          actions,
          cooldownMinutes,
          evaluationIntervalSeconds,
          isEnabled,
        } = req.body;

        if (!name || !conditionType || !conditionConfig) {
          res.status(400).json({
            success: false,
            error: 'name, conditionType, and conditionConfig are required',
          });
          return;
        }

        const rule = await alertingService.createRule({
          name,
          description,
          workspaceId: req.workspaceId,
          workflowId,
          workflowTags,
          conditionType,
          conditionConfig,
          severity,
          actions,
          cooldownMinutes,
          evaluationIntervalSeconds,
          isEnabled,
        });

        res.status(201).json({
          success: true,
          data: rule,
        });
      } catch (error) {
        console.error('[OpsController] Create rule error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to create alert rule',
        });
      }
    }
  );

  /**
   * PUT /ops/alerts/rules/:id
   * Update an alert rule.
   */
  router.put(
    '/alerts/rules/:id',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const rule = await alertingService.updateRule(req.params.id, req.body);

        if (!rule) {
          res.status(404).json({
            success: false,
            error: 'Rule not found',
          });
          return;
        }

        res.json({
          success: true,
          data: rule,
        });
      } catch (error) {
        console.error('[OpsController] Update rule error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to update alert rule',
        });
      }
    }
  );

  /**
   * DELETE /ops/alerts/rules/:id
   * Delete an alert rule.
   */
  router.delete(
    '/alerts/rules/:id',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await alertingService.deleteRule(req.params.id);

        res.json({
          success: true,
          message: 'Rule deleted',
        });
      } catch (error) {
        console.error('[OpsController] Delete rule error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to delete alert rule',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // ALERT INCIDENTS
  // --------------------------------------------------------------------------

  /**
   * GET /ops/alerts/incidents
   * List alert incidents.
   */
  router.get(
    '/alerts/incidents',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incidents = await alertingService.getActiveIncidents(
          req.workspaceId
        );

        res.json({
          success: true,
          data: incidents,
        });
      } catch (error) {
        console.error('[OpsController] List incidents error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to fetch incidents',
        });
      }
    }
  );

  /**
   * POST /ops/alerts/incidents/:id/acknowledge
   * Acknowledge an incident.
   */
  router.post(
    '/alerts/incidents/:id/acknowledge',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const incident = await alertingService.acknowledgeIncident(
          req.params.id,
          req.userId!
        );

        if (!incident) {
          res.status(404).json({
            success: false,
            error: 'Incident not found',
          });
          return;
        }

        res.json({
          success: true,
          data: incident,
        });
      } catch (error) {
        console.error('[OpsController] Acknowledge error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to acknowledge incident',
        });
      }
    }
  );

  /**
   * POST /ops/alerts/incidents/:id/resolve
   * Resolve an incident.
   */
  router.post(
    '/alerts/incidents/:id/resolve',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const { note } = req.body;

        const incident = await alertingService.resolveIncident(
          req.params.id,
          req.userId!,
          note
        );

        if (!incident) {
          res.status(404).json({
            success: false,
            error: 'Incident not found',
          });
          return;
        }

        res.json({
          success: true,
          data: incident,
        });
      } catch (error) {
        console.error('[OpsController] Resolve error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to resolve incident',
        });
      }
    }
  );

  /**
   * POST /ops/alerts/incidents/:id/silence
   * Silence an incident for a duration.
   */
  router.post(
    '/alerts/incidents/:id/silence',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const durationMinutes = parseInt(req.body.durationMinutes) || 60;

        const incident = await alertingService.silenceIncident(
          req.params.id,
          durationMinutes
        );

        if (!incident) {
          res.status(404).json({
            success: false,
            error: 'Incident not found',
          });
          return;
        }

        res.json({
          success: true,
          data: incident,
        });
      } catch (error) {
        console.error('[OpsController] Silence error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to silence incident',
        });
      }
    }
  );

  // --------------------------------------------------------------------------
  // SYSTEM MAINTENANCE
  // --------------------------------------------------------------------------

  /**
   * POST /ops/maintenance/refresh-views
   * Manually refresh materialized views.
   */
  router.post(
    '/maintenance/refresh-views',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        await metricsService.refreshMaterializedViews();

        res.json({
          success: true,
          message: 'Materialized views refreshed',
        });
      } catch (error) {
        console.error('[OpsController] Refresh views error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to refresh views',
        });
      }
    }
  );

  /**
   * POST /ops/maintenance/backfill-search
   * Backfill search index from executions.
   */
  router.post(
    '/maintenance/backfill-search',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const batchSize = parseInt(req.body.batchSize) || 1000;

        // Run async, return immediately
        res.json({
          success: true,
          message: 'Backfill started',
        });

        searchService
          .backfillIndex(batchSize, (indexed, total) => {
            console.log(`[Backfill] Progress: ${indexed}/${total}`);
          })
          .then((total) => {
            console.log(`[Backfill] Complete. Indexed ${total} executions`);
          })
          .catch((error) => {
            console.error('[Backfill] Error:', error);
          });
      } catch (error) {
        console.error('[OpsController] Backfill error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to start backfill',
        });
      }
    }
  );

  /**
   * POST /ops/maintenance/aggregate-costs
   * Manually aggregate daily costs.
   */
  router.post(
    '/maintenance/aggregate-costs',
    requireOpsAccess,
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const date = req.body.date ? new Date(req.body.date) : undefined;
        await metricsService.aggregateDailyCosts(date);

        res.json({
          success: true,
          message: 'Daily costs aggregated',
        });
      } catch (error) {
        console.error('[OpsController] Aggregate costs error:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to aggregate costs',
        });
      }
    }
  );

  return router;
}

export default createOpsController;
