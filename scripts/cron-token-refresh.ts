#!/usr/bin/env node

/**
 * Token Refresh Cron Job
 *
 * Automatically refreshes OAuth2 tokens that are expiring soon
 * Run this script every minute via cron or scheduler
 *
 * Usage: npx tsx scripts/cron-token-refresh.ts
 *
 * Cron schedule (every minute):
 * * * * * * cd /app && npx tsx scripts/cron-token-refresh.ts >> /var/log/token-refresh.log 2>&1
 */

import { getDb } from '@/lib/db';
import { integrations } from '@/lib/db/schema';
import { eq, and, lt } from 'drizzle-orm';
import { refreshAccessToken, encrypt, decrypt } from '@/lib/auth/oauth';
import { oauthMonitor } from '@/lib/monitoring/oauth-monitor';

const db = getDb();

interface RefreshResult {
  integrationId: string;
  userId: string;
  provider: string;
  service: string;
  success: boolean;
  error?: string;
  duration: number;
}

const results: RefreshResult[] = [];

async function refreshExpiringTokens() {
  console.log('\n===========================================');
  console.log('♻️  OAuth2 Token Refresh Cron Job');
  console.log('===========================================');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  const startTime = Date.now();

  try {
    // Find tokens expiring in next 5 minutes
    const expiringIntegrations = await db
      .select()
      .from(integrations)
      .where(
        and(
          eq(integrations.status, 'connected'),
          lt(integrations.expiresAt, new Date(Date.now() + 5 * 60 * 1000)) // 5 minutes
        )
      );

    console.log(`📊 Found ${expiringIntegrations.length} tokens expiring soon\n`);

    if (expiringIntegrations.length === 0) {
      console.log('✅ No tokens need refreshing\n');
      return;
    }

    // Refresh each integration
    for (const integration of expiringIntegrations) {
      await refreshSingleIntegration(integration);
    }

    // Print summary
    printSummary();

    // Calculate total duration
    const totalDuration = Date.now() - startTime;
    console.log(`\n⏱️  Total duration: ${totalDuration}ms`);
    console.log('===========================================\n');

    // Exit with appropriate code
    const failedCount = results.filter((r) => !r.success).length;
    process.exit(failedCount > 0 ? 1 : 0);
  } catch (error) {
    console.error('\n❌ Cron job failed:', error);
    process.exit(1);
  }
}

async function refreshSingleIntegration(integration: typeof integrations.$inferSelect) {
  const startTime = Date.now();

  console.log(`♻️  Refreshing: ${integration.provider}/${integration.service} (${integration.userId})`);

  try {
    // Decrypt refresh token
    const refreshToken = decrypt(integration.refreshToken!);

    // Request new access token
    const tokens = await refreshAccessToken({
      provider: integration.provider as any,
      refreshToken,
    });

    // Encrypt new tokens
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = tokens.refresh_token
      ? encrypt(tokens.refresh_token)
      : integration.refreshToken;

    // Calculate new expiry time
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Update database
    await db
      .update(integrations)
      .set({
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        expiresAt,
        status: 'connected',
        updatedAt: new Date(),
        metadata: {
          ...((integration.metadata as any) || {}),
          lastSyncAt: new Date().toISOString(),
        },
      })
      .where(eq(integrations.id, integration.id));

    const duration = Date.now() - startTime;

    results.push({
      integrationId: integration.id,
      userId: integration.userId,
      provider: integration.provider,
      service: integration.service,
      success: true,
      duration,
    });

    // Log to monitoring
    oauthMonitor.logRefresh(
      integration.provider,
      integration.service,
      integration.userId,
      true,
      duration
    );

    console.log(`✅ Success (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;

    console.error(`❌ Failed: ${error.message}`);

    // Update integration to error state
    await db
      .update(integrations)
      .set({
        status: 'error',
        updatedAt: new Date(),
        metadata: {
          ...((integration.metadata as any) || {}),
          lastError: {
            timestamp: new Date().toISOString(),
            message: `Token refresh failed: ${error.message}`,
          },
        },
      })
      .where(eq(integrations.id, integration.id));

    results.push({
      integrationId: integration.id,
      userId: integration.userId,
      provider: integration.provider,
      service: integration.service,
      success: false,
      error: error.message,
      duration,
    });

    // Log to monitoring
    oauthMonitor.logRefresh(
      integration.provider,
      integration.service,
      integration.userId,
      false,
      duration,
      {
        code: 'refresh_failed',
        message: error.message,
      }
    );
  }
}

function printSummary() {
  console.log('\n===========================================');
  console.log('📊 Refresh Summary');
  console.log('===========================================\n');

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.filter((r) => !r.success).length;
  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / results.length;

  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Failed: ${failedCount}`);
  console.log(`⏱️  Average duration: ${avgDuration.toFixed(0)}ms\n`);

  // Group by provider
  const byProvider = results.reduce((acc, r) => {
    if (!acc[r.provider]) {
      acc[r.provider] = { success: 0, failed: 0 };
    }
    if (r.success) {
      acc[r.provider].success++;
    } else {
      acc[r.provider].failed++;
    }
    return acc;
  }, {} as Record<string, { success: number; failed: number }>);

  console.log('By Provider:');
  for (const [provider, stats] of Object.entries(byProvider)) {
    console.log(`  ${provider}: ${stats.success} ✅ / ${stats.failed} ❌`);
  }

  // List failures
  const failures = results.filter((r) => !r.success);
  if (failures.length > 0) {
    console.log('\nFailed Refreshes:');
    failures.forEach((f) => {
      console.log(`  • ${f.provider}/${f.service} (${f.userId}): ${f.error}`);
    });
  }
}

// Run the job
refreshExpiringTokens();
