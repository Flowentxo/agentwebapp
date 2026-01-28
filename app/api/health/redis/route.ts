import { NextResponse } from 'next/server';
import Redis from 'ioredis';
import { getRedisOptions, isRedisConfigured } from '@/lib/redis/connection';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health/redis
 * Test Redis connectivity and return detailed status
 * Updated to use the unified Redis connection with TLS support for Redis Cloud
 */
export async function GET() {
  const startTime = Date.now();

  // Check if Redis is configured
  if (!isRedisConfigured()) {
    return NextResponse.json({
      status: 'not_configured',
      timestamp: new Date().toISOString(),
      message: 'Redis is not configured. Set REDIS_URL or REDIS_HOST environment variable.',
      recommendations: [
        'Set REDIS_URL in environment (e.g., rediss://user:pass@host:port)',
        'Or set REDIS_HOST, REDIS_PORT, REDIS_PASSWORD individually',
        'For Redis Cloud, use rediss:// (with double s) for TLS'
      ]
    }, { status: 200 });
  }

  let client: Redis | null = null;

  try {
    // Use unified Redis options with TLS support
    const options = getRedisOptions({
      connectTimeout: 5000, // 5 second timeout for health check
      commandTimeout: 3000,
    });

    client = new Redis(options);

    // Test connectivity with timeout
    const connectivityStart = Date.now();

    // Race between ping and timeout
    const pingPromise = client.ping();
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Connection timeout (5s)')), 5000)
    );

    const pingResult = await Promise.race([pingPromise, timeoutPromise]);
    const connectivityTime = Date.now() - connectivityStart;

    // Test SET/GET
    const setGetStart = Date.now();
    const testKey = 'health_check_test_' + Date.now();
    await client.setex(testKey, 10, 'test_value');
    const getValue = await client.get(testKey);
    await client.del(testKey);
    const setGetTime = Date.now() - setGetStart;

    // Test INFO
    const infoStart = Date.now();
    const info = await client.info('server');
    const infoTime = Date.now() - infoStart;

    await client.quit();

    const responseTime = Date.now() - startTime;

    const recommendations: string[] = [];
    if (connectivityTime > 1000) {
      recommendations.push('Redis connection time is high - check network latency');
    }
    if (connectivityTime > 100) {
      recommendations.push('Redis latency is elevated - consider Redis location');
    }

    // Parse Redis URL to check TLS status
    const redisUrl = process.env.REDIS_URL || '';
    const useTls = redisUrl.startsWith('rediss://');

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      responseTime,
      details: {
        connected: true,
        tlsEnabled: useTls,
        tests: {
          ping: {
            status: pingResult === 'PONG' ? 'passed' : 'failed',
            latency: connectivityTime,
            result: pingResult,
          },
          setGet: {
            status: getValue === 'test_value' ? 'passed' : 'failed',
            latency: setGetTime,
          },
          info: {
            status: 'passed',
            latency: infoTime,
          }
        },
        serverInfo: {
          version: info.match(/redis_version:(.+)/)?.[1]?.trim() || 'unknown',
          uptime: info.match(/uptime_in_seconds:(\d+)/)?.[1] || 'unknown',
          used_memory: info.match(/used_memory_human:(\S+)/)?.[1] || 'unknown',
          connected_clients: info.match(/connected_clients:(\d+)/)?.[1] || 'unknown'
        }
      },
      recommendations
    };

    return NextResponse.json(healthData, { status: 200 });

  } catch (error: any) {
    // Cleanup client if it exists
    if (client) {
      try {
        await client.quit();
      } catch {
        // Ignore quit errors
      }
    }

    const responseTime = Date.now() - startTime;

    let errorType = 'connection';
    let recommendations: string[] = [];

    const errorMessage = error.message || '';

    if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('connection refused')) {
      errorType = 'connection-refused';
      recommendations = [
        'Check if Redis server is running',
        'Verify REDIS_URL environment variable',
        'Check firewall settings for Redis port'
      ];
    } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
      errorType = 'timeout';
      recommendations = [
        'Redis server may be overloaded',
        'Check network connectivity to Redis Cloud',
        'Verify Redis Cloud instance is active'
      ];
    } else if (errorMessage.includes('NOAUTH') || errorMessage.includes('AUTH') || errorMessage.includes('authentication')) {
      errorType = 'authentication';
      recommendations = [
        'Verify Redis password in REDIS_URL',
        'For Redis Cloud: use format rediss://default:PASSWORD@host:port',
        'Check Redis ACL configuration'
      ];
    } else if (errorMessage.includes('certificate') || errorMessage.includes('TLS') || errorMessage.includes('SSL')) {
      errorType = 'tls-error';
      recommendations = [
        'Use rediss:// (with double s) for Redis Cloud TLS',
        'Check if Redis Cloud requires TLS',
        'Verify certificate configuration'
      ];
    } else if (errorMessage.includes('WRONGPASS')) {
      errorType = 'wrong-password';
      recommendations = [
        'The Redis password is incorrect',
        'Check REDIS_URL password value',
        'Regenerate password in Redis Cloud dashboard'
      ];
    } else {
      errorType = 'general';
      recommendations = [
        'Check Redis logs for detailed error',
        'Verify Redis server status',
        `Error: ${errorMessage.substring(0, 100)}`
      ];
    }

    // Mask the URL password for security
    const maskedUrl = (process.env.REDIS_URL || 'not-set').replace(/:([^@]+)@/, ':***@');

    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      responseTime,
      error: {
        message: errorMessage.substring(0, 200),
        type: errorType
      },
      details: {
        connected: false,
        url: maskedUrl,
        tlsExpected: (process.env.REDIS_URL || '').startsWith('rediss://')
      },
      recommendations
    }, { status: 503 });
  }
}
