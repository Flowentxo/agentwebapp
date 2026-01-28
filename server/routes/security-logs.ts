/**
 * Security Logs API Routes
 *
 * Admin-only endpoints for security monitoring
 */

import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { adminLimiter } from '../middleware/rate-limiter';
import { getSecurityEventService, SecurityEventType, SecuritySeverity } from '../services/SecurityEventService';
import { logger } from '../utils/logger';

export const securityLogsRouter = Router();
const securityService = getSecurityEventService();

// Apply admin authentication and rate limiting
securityLogsRouter.use(requireAuth);
securityLogsRouter.use(requireRole('admin'));
securityLogsRouter.use(adminLimiter);

/**
 * GET /api/security/events
 * Get recent security events
 */
securityLogsRouter.get('/events', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const type = req.query.type as SecurityEventType | undefined;
    const severity = req.query.severity as SecuritySeverity | undefined;
    const userId = req.query.userId as string | undefined;
    const ip = req.query.ip as string | undefined;

    let events;

    if (type) {
      events = securityService.getEventsByType(type, limit);
    } else if (severity) {
      events = securityService.getEventsBySeverity(severity, limit);
    } else if (userId) {
      events = securityService.getEventsByUser(userId, limit);
    } else if (ip) {
      events = securityService.getEventsByIP(ip, limit);
    } else {
      events = securityService.getRecentEvents(limit);
    }

    res.json({
      events,
      total: events.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[SECURITY_LOGS] Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch security events' });
  }
});

/**
 * GET /api/security/statistics
 * Get security statistics
 */
securityLogsRouter.get('/statistics', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const stats = securityService.getStatistics(hours);

    res.json({
      statistics: stats,
      timeRange: `${hours} hours`,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[SECURITY_LOGS] Error fetching statistics:', error);
    res.status(500).json({ error: 'Failed to fetch security statistics' });
  }
});

/**
 * GET /api/security/suspicious-ips
 * Get list of suspicious IPs
 */
securityLogsRouter.get('/suspicious-ips', async (req, res) => {
  try {
    const threshold = parseInt(req.query.threshold as string) || 10;
    const events = securityService.getRecentEvents(500);

    // Group by IP
    const ipMap = new Map<string, number>();
    events.forEach(event => {
      if (event.ip) {
        ipMap.set(event.ip, (ipMap.get(event.ip) || 0) + 1);
      }
    });

    // Filter suspicious
    const suspiciousIPs = Array.from(ipMap.entries())
      .filter(([_, count]) => count >= threshold)
      .map(([ip, count]) => ({
        ip,
        eventCount: count,
        isSuspicious: securityService.isSuspiciousIP(ip, threshold),
        recentEvents: securityService.getEventsByIP(ip, 10)
      }))
      .sort((a, b) => b.eventCount - a.eventCount);

    res.json({
      suspiciousIPs,
      total: suspiciousIPs.length,
      threshold,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[SECURITY_LOGS] Error fetching suspicious IPs:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious IPs' });
  }
});

/**
 * GET /api/security/timeline
 * Get security events timeline
 */
securityLogsRouter.get('/timeline', async (req, res) => {
  try {
    const hours = parseInt(req.query.hours as string) || 24;
    const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
    const endDate = new Date();

    const events = securityService.getEventsByTimeRange(startDate, endDate);

    // Group by hour
    const timeline = new Map<string, { hour: string; events: typeof events; count: number }>();

    events.forEach(event => {
      const hour = new Date(event.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      if (!timeline.has(hour)) {
        timeline.set(hour, { hour, events: [], count: 0 });
      }
      const bucket = timeline.get(hour)!;
      bucket.events.push(event);
      bucket.count++;
    });

    const timelineArray = Array.from(timeline.values()).sort((a, b) =>
      a.hour.localeCompare(b.hour)
    );

    res.json({
      timeline: timelineArray,
      totalEvents: events.length,
      timeRange: { start: startDate, end: endDate },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[SECURITY_LOGS] Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

/**
 * POST /api/security/clear-old
 * Clear old security events
 */
securityLogsRouter.post('/clear-old', async (req, res) => {
  try {
    const days = parseInt(req.body.days) || 7;
    const cleared = securityService.clearOldEvents(days);

    logger.info(`[SECURITY_LOGS] Cleared ${cleared} events older than ${days} days`, {
      clearedBy: req.user?.userId
    });

    res.json({
      success: true,
      clearedCount: cleared,
      olderThanDays: days,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.error('[SECURITY_LOGS] Error clearing old events:', error);
    res.status(500).json({ error: 'Failed to clear old events' });
  }
});

/**
 * GET /api/security/health
 * Security system health check
 */
securityLogsRouter.get('/health', async (req, res) => {
  try {
    const stats = securityService.getStatistics(1); // Last hour
    const criticalEvents = stats.bySeverity.critical;
    const highEvents = stats.bySeverity.high;

    const health = {
      status: criticalEvents === 0 && highEvents < 5 ? 'healthy' : 'warning',
      criticalEvents,
      highEvents,
      totalEvents: stats.total,
      blockedThreats: stats.blocked,
      timestamp: new Date().toISOString()
    };

    res.json(health);
  } catch (error: any) {
    logger.error('[SECURITY_LOGS] Error checking security health:', error);
    res.status(500).json({ error: 'Failed to check security health' });
  }
});
