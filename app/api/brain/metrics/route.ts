/**
 * Brain AI Metrics & Monitoring API
 * SECURED: JWT Authentication Required
 * Endpoint: GET /api/brain/metrics
 * Provides detailed metrics for monitoring and alerting
 */

import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { brainDocuments, brainContexts, brainQueryLogs } from '@/lib/db/schema';
import { redisCache } from '@/lib/brain/RedisCache';
import { sql } from 'drizzle-orm';
import { withAuth, AuthConfigs } from '@/lib/auth/jwt-middleware';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (req: NextRequest, auth) => {
  const startTime = Date.now();

  try {
    console.log(`[BRAIN_METRICS] User: ${auth.userId} accessing metrics`);

    const db = getDb();
    const metrics: any = {
      timestamp: new Date().toISOString(),
      status: 'ok',
      metrics: {},
      user: auth.userId, // Include user ID for audit trail
    };

    // Document Metrics
    const docStats = await db.execute(sql`
      SELECT
        COUNT(*) as total_documents,
        COUNT(*) FILTER (WHERE is_active = true) as active_documents,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as documents_24h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as documents_7d,
        SUM(token_count) as total_tokens,
        AVG(token_count) as avg_tokens_per_doc
      FROM brain_documents
    `);

    metrics.metrics.documents = {
      total: parseInt((docStats.rows[0] as any).total_documents) || 0,
      active: parseInt((docStats.rows[0] as any).active_documents) || 0,
      last24h: parseInt((docStats.rows[0] as any).documents_24h) || 0,
      last7d: parseInt((docStats.rows[0] as any).documents_7d) || 0,
      totalTokens: parseInt((docStats.rows[0] as any).total_tokens) || 0,
      avgTokensPerDoc: Math.round(parseFloat((docStats.rows[0] as any).avg_tokens_per_doc) || 0),
    };

    // Context Metrics
    const contextStats = await db.execute(sql`
      SELECT
        COUNT(*) as total_contexts,
        COUNT(*) FILTER (WHERE is_active = true) as active_contexts,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as contexts_24h,
        AVG(relevance_score) as avg_relevance_score,
        COUNT(DISTINCT session_id) as unique_sessions,
        COUNT(DISTINCT user_id) as unique_users
      FROM brain_contexts
    `);

    metrics.metrics.contexts = {
      total: parseInt((contextStats.rows[0] as any).total_contexts) || 0,
      active: parseInt((contextStats.rows[0] as any).active_contexts) || 0,
      last24h: parseInt((contextStats.rows[0] as any).contexts_24h) || 0,
      avgRelevanceScore: Math.round(parseFloat((contextStats.rows[0] as any).avg_relevance_score) || 0),
      uniqueSessions: parseInt((contextStats.rows[0] as any).unique_sessions) || 0,
      uniqueUsers: parseInt((contextStats.rows[0] as any).unique_users) || 0,
    };

    // Query Metrics
    const queryStats = await db.execute(sql`
      SELECT
        COUNT(*) as total_queries,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as queries_1h,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') as queries_24h,
        AVG(response_time) as avg_response_time,
        AVG(result_count) as avg_result_count,
        COUNT(*) FILTER (WHERE was_helpful = true) as helpful_queries,
        COUNT(*) FILTER (WHERE was_helpful = false) as unhelpful_queries
      FROM brain_query_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
    `);

    const totalQueries = parseInt((queryStats.rows[0] as any).total_queries) || 0;
    const helpfulQueries = parseInt((queryStats.rows[0] as any).helpful_queries) || 0;
    const unhelpfulQueries = parseInt((queryStats.rows[0] as any).unhelpful_queries) || 0;
    const feedbackTotal = helpfulQueries + unhelpfulQueries;
    const helpfulPercentage = feedbackTotal > 0 ? (helpfulQueries / feedbackTotal) * 100 : 0;

    metrics.metrics.queries = {
      total7d: totalQueries,
      last1h: parseInt((queryStats.rows[0] as any).queries_1h) || 0,
      last24h: parseInt((queryStats.rows[0] as any).queries_24h) || 0,
      avgResponseTime: Math.round(parseFloat((queryStats.rows[0] as any).avg_response_time) || 0),
      avgResultCount: Math.round(parseFloat((queryStats.rows[0] as any).avg_result_count) || 0),
      helpfulPercentage: Math.round(helpfulPercentage * 10) / 10,
      feedbackCount: feedbackTotal,
    };

    // Top Queries
    const topQueries = await db.execute(sql`
      SELECT query, COUNT(*) as count
      FROM brain_query_logs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY count DESC
      LIMIT 10
    `);

    metrics.metrics.topQueries = (topQueries.rows as any[]).map(row => ({
      query: row.query,
      count: parseInt(row.count),
    }));

    // Redis Cache Metrics
    const redisStats = await redisCache.getStats();
    metrics.metrics.cache = {
      connected: redisStats.connected,
      keys: redisStats.keys,
      memory: redisStats.memory,
    };

    // Performance Alerts
    metrics.alerts = [];

    // Alert: High average response time
    if (metrics.metrics.queries.avgResponseTime > 1000) {
      metrics.alerts.push({
        severity: 'warning',
        type: 'performance',
        message: `High average query response time: ${metrics.metrics.queries.avgResponseTime}ms`,
      });
    }

    // Alert: Low helpfulness score
    if (metrics.metrics.queries.helpfulPercentage < 70 && feedbackTotal > 10) {
      metrics.alerts.push({
        severity: 'warning',
        type: 'quality',
        message: `Low query helpfulness: ${metrics.metrics.queries.helpfulPercentage}%`,
      });
    }

    // Alert: Redis disconnected
    if (!redisStats.connected) {
      metrics.alerts.push({
        severity: 'warning',
        type: 'infrastructure',
        message: 'Redis cache is disconnected (degraded mode)',
      });
    }

    // Alert: High query volume
    if (metrics.metrics.queries.last1h > 1000) {
      metrics.alerts.push({
        severity: 'info',
        type: 'traffic',
        message: `High query volume: ${metrics.metrics.queries.last1h} queries in last hour`,
      });
    }

    // Set status based on alerts
    const hasCriticalAlerts = metrics.alerts.some((a: any) => a.severity === 'critical');
    const hasWarnings = metrics.alerts.some((a: any) => a.severity === 'warning');

    if (hasCriticalAlerts) {
      metrics.status = 'critical';
    } else if (hasWarnings) {
      metrics.status = 'warning';
    }

    metrics.responseTime = Date.now() - startTime;

    return NextResponse.json(metrics);
  } catch (error: any) {
    console.error('[BRAIN_METRICS] Error:', error);
    return NextResponse.json(
      {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        user: auth.userId,
      },
      { status: 500 }
    );
  }
}, AuthConfigs.brain);
