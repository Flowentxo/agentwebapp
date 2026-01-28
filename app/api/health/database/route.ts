import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health/database
 * Test database connectivity and return detailed status
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    const { getDb } = await import('@/lib/db');
    const { sql } = await import('drizzle-orm');
    
    const db = getDb();
    
    // Test basic connectivity
    const connectivityStart = Date.now();
    const timeResult = await db.execute(sql`SELECT NOW() as current_time`);
    const connectivityTime = Date.now() - connectivityStart;
    
    // Test pgvector extension
    const vectorStart = Date.now();
    await db.execute(sql`SELECT '1'::vector`);
    const vectorTime = Date.now() - vectorStart;
    
    // Test table query (brain_documents if exists)
    let tableTest = { status: 'not-tested' as string, count: 0 };
    try {
      const tableStart = Date.now();
      const tableResult = await db.execute(sql`SELECT COUNT(*) as count FROM brain_documents LIMIT 1`);
      const tableTime = Date.now() - tableStart;
      tableTest = {
        status: 'passed',
        count: (tableResult.rows[0] as any)?.count || 0
      };
    } catch {
      tableTest = { status: 'skipped', count: 0 };
    }
    
    const responseTime = Date.now() - startTime;
    
    const recommendations: string[] = [];
    if (connectivityTime > 2000) {
      recommendations.push('Consider database connection pooling optimization');
    }
    if (vectorTime > 500) {
      recommendations.push('pgvector extension query time is high');
    }

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        connected: true,
        currentTime: timeResult.rows[0]?.current_time,
        database: 'PostgreSQL with pgvector',
        tests: {
          connectivity: {
            status: 'passed',
            latency: connectivityTime,
            endpoint: 'SELECT NOW()'
          },
          pgvector: {
            status: 'passed',
            latency: vectorTime,
            endpoint: 'SELECT vector test'
          },
          tableQuery: {
            status: tableTest.status,
            count: tableTest.count,
            endpoint: 'SELECT from brain_documents'
          }
        }
      },
      recommendations
    };

    return NextResponse.json(healthData, { status: 200 });
    
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    let errorType = 'connection';
    let recommendations: string[] = [];
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('connection refused')) {
      errorType = 'connection-refused';
      recommendations = [
        'Check if PostgreSQL server is running',
        'Verify DATABASE_URL environment variable',
        'Check firewall settings for database port'
      ];
    } else if (error.message?.includes('authentication')) {
      errorType = 'authentication';
      recommendations = [
        'Verify database credentials in DATABASE_URL',
        'Check user permissions in PostgreSQL',
        'Ensure database exists and is accessible'
      ];
    } else if (error.message?.includes('timeout')) {
      errorType = 'timeout';
      recommendations = [
        'Check database server performance',
        'Consider increasing connection timeout',
        'Monitor database query performance'
      ];
    } else {
      errorType = 'general';
      recommendations = [
        'Check PostgreSQL logs for detailed error',
        'Verify database server status',
        'Test database connection manually'
      ];
    }

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: {
        message: error.message,
        type: errorType
      },
      details: {
        connected: false,
        databaseUrl: process.env.DATABASE_URL ? 
          `${process.env.DATABASE_URL.substring(0, 20)}...` : 
          'not-configured'
      },
      recommendations
    }, { status: 503 });
  }
}