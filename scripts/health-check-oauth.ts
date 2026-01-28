#!/usr/bin/env node

/**
 * OAuth2 Health Check Script
 *
 * Verifies OAuth2 system health after deployment
 *
 * Usage: npx tsx scripts/health-check-oauth.ts
 */

import { getDb } from '@/lib/db';
import { sql } from 'drizzle-orm';

const db = getDb();

interface HealthCheckResult {
  check: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

const results: HealthCheckResult[] = [];

async function checkDatabase() {
  console.log('\n📊 Checking database connection...');

  try {
    await db.execute(sql`SELECT 1`);
    results.push({
      check: 'Database Connection',
      status: 'pass',
      message: 'Database is accessible',
    });
  } catch (error: any) {
    results.push({
      check: 'Database Connection',
      status: 'fail',
      message: 'Cannot connect to database',
      details: error.message,
    });
  }
}

async function checkIntegrationsTable() {
  console.log('📊 Checking integrations table...');

  try {
    const result = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'integrations'
      )
    `);

    const exists = result.rows[0]?.exists;

    if (exists) {
      results.push({
        check: 'Integrations Table',
        status: 'pass',
        message: 'Table exists',
      });
    } else {
      results.push({
        check: 'Integrations Table',
        status: 'fail',
        message: 'Table does not exist - run migration',
      });
    }
  } catch (error: any) {
    results.push({
      check: 'Integrations Table',
      status: 'fail',
      message: 'Error checking table',
      details: error.message,
    });
  }
}

async function checkIndexes() {
  console.log('📊 Checking indexes...');

  try {
    const result = await db.execute(sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'integrations'
    `);

    const indexes = result.rows.map((row: any) => row.indexname);
    const expectedIndexes = [
      'idx_integrations_user',
      'idx_integrations_status',
      'idx_integrations_expires',
      'idx_integrations_provider',
    ];

    const missingIndexes = expectedIndexes.filter((idx) => !indexes.includes(idx));

    if (missingIndexes.length === 0) {
      results.push({
        check: 'Database Indexes',
        status: 'pass',
        message: 'All indexes present',
        details: indexes,
      });
    } else {
      results.push({
        check: 'Database Indexes',
        status: 'warn',
        message: 'Some indexes missing',
        details: { missing: missingIndexes, existing: indexes },
      });
    }
  } catch (error: any) {
    results.push({
      check: 'Database Indexes',
      status: 'fail',
      message: 'Error checking indexes',
      details: error.message,
    });
  }
}

async function checkIntegrationCount() {
  console.log('📊 Checking integration records...');

  try {
    const result = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'connected') as connected,
        COUNT(*) FILTER (WHERE status = 'error') as errors
      FROM integrations
    `);

    const stats = result.rows[0] as any;

    results.push({
      check: 'Integration Records',
      status: 'pass',
      message: `${stats.total} total, ${stats.connected} connected, ${stats.errors} errors`,
      details: stats,
    });

    if (parseInt(stats.errors) > parseInt(stats.connected) * 0.1) {
      results.push({
        check: 'Error Rate',
        status: 'warn',
        message: 'High error rate detected',
        details: stats,
      });
    }
  } catch (error: any) {
    results.push({
      check: 'Integration Records',
      status: 'fail',
      message: 'Error checking records',
      details: error.message,
    });
  }
}

async function checkExpiringTokens() {
  console.log('📊 Checking expiring tokens...');

  try {
    const result = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM integrations
      WHERE expires_at < NOW() + INTERVAL '5 minutes'
        AND status = 'connected'
    `);

    const count = parseInt((result.rows[0] as any).count);

    if (count === 0) {
      results.push({
        check: 'Expiring Tokens',
        status: 'pass',
        message: 'No tokens expiring soon',
      });
    } else if (count < 10) {
      results.push({
        check: 'Expiring Tokens',
        status: 'warn',
        message: `${count} tokens expiring within 5 minutes`,
      });
    } else {
      results.push({
        check: 'Expiring Tokens',
        status: 'fail',
        message: `${count} tokens expiring soon - check refresh job`,
      });
    }
  } catch (error: any) {
    results.push({
      check: 'Expiring Tokens',
      status: 'fail',
      message: 'Error checking token expiry',
      details: error.message,
    });
  }
}

function checkEnvironmentVariables() {
  console.log('📊 Checking environment variables...');

  const requiredVars = [
    'ENCRYPTION_KEY',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'NEXT_PUBLIC_APP_URL',
    'DATABASE_URL',
  ];

  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length === 0) {
    results.push({
      check: 'Environment Variables',
      status: 'pass',
      message: 'All required variables set',
    });
  } else {
    results.push({
      check: 'Environment Variables',
      status: 'fail',
      message: 'Missing environment variables',
      details: missingVars,
    });
  }

  // Check encryption key length
  const encryptionKey = process.env.ENCRYPTION_KEY;
  if (encryptionKey && encryptionKey.length !== 64) {
    results.push({
      check: 'Encryption Key',
      status: 'fail',
      message: `Encryption key must be 64 characters (current: ${encryptionKey.length})`,
    });
  } else if (encryptionKey) {
    results.push({
      check: 'Encryption Key',
      status: 'pass',
      message: 'Encryption key valid',
    });
  }
}

function printResults() {
  console.log('\n===========================================');
  console.log('🏥 OAuth2 Health Check Results');
  console.log('===========================================\n');

  const passCount = results.filter((r) => r.status === 'pass').length;
  const warnCount = results.filter((r) => r.status === 'warn').length;
  const failCount = results.filter((r) => r.status === 'fail').length;

  results.forEach((result) => {
    const emoji = {
      pass: '✅',
      warn: '⚠️',
      fail: '❌',
    }[result.status];

    console.log(`${emoji} ${result.check}: ${result.message}`);
    if (result.details) {
      console.log(`   Details:`, result.details);
    }
  });

  console.log('\n===========================================');
  console.log('Summary:');
  console.log(`✅ Passed: ${passCount}`);
  console.log(`⚠️  Warnings: ${warnCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('===========================================\n');

  const overallHealth = failCount === 0 ? 'HEALTHY' : 'UNHEALTHY';
  const emoji = failCount === 0 ? '🟢' : '🔴';

  console.log(`${emoji} Overall Status: ${overallHealth}\n`);

  // Exit with appropriate code
  process.exit(failCount > 0 ? 1 : 0);
}

async function main() {
  console.log('🏥 Starting OAuth2 Health Check...\n');

  try {
    // Run all checks
    checkEnvironmentVariables();
    await checkDatabase();
    await checkIntegrationsTable();
    await checkIndexes();
    await checkIntegrationCount();
    await checkExpiringTokens();

    // Print results
    printResults();
  } catch (error) {
    console.error('\n❌ Health check failed:', error);
    process.exit(1);
  }
}

main();
