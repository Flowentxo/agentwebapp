#!/usr/bin/env node
/**
 * Flush old BullMQ queue keys from Redis
 *
 * This script removes legacy queue keys that contain colons (e.g., "knowledge:index")
 * which conflict with BullMQ's internal Redis key structure.
 *
 * Run: npx ts-node scripts/flush-redis-queues.ts
 */

import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

async function flushOldQueueKeys() {
  const redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  try {
    console.log('🔍 Connecting to Redis...');
    await redis.ping();
    console.log('✅ Connected to Redis');

    // Find all BullMQ keys with legacy colon patterns
    console.log('\n🔍 Scanning for legacy queue keys with colons...');
    const legacyPatterns = [
      'bull:knowledge:index:*',
      'bull:sintra:reindex:*',
      'knowledge:index:*',
      'sintra:reindex:*',
    ];

    let totalDeleted = 0;

    for (const pattern of legacyPatterns) {
      console.log(`\n  Scanning pattern: ${pattern}`);
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        console.log(`  Found ${keys.length} keys`);
        for (const key of keys) {
          console.log(`    - ${key}`);
        }

        const deleted = await redis.del(...keys);
        totalDeleted += deleted;
        console.log(`  ✅ Deleted ${deleted} keys`);
      } else {
        console.log(`  No keys found`);
      }
    }

    // Show current BullMQ queues
    console.log('\n🔍 Current BullMQ queues:');
    const queueKeys = await redis.keys('bull:knowledge-index:*');
    if (queueKeys.length > 0) {
      console.log(`  ✅ Found ${queueKeys.length} keys for queue "knowledge-index"`);
      const uniqueQueues = new Set(queueKeys.map(k => k.split(':')[1]));
      uniqueQueues.forEach(q => console.log(`    - ${q}`));
    } else {
      console.log('  ℹ️  No queue keys found (queue not initialized yet)');
    }

    console.log(`\n✅ Cleanup complete! Total keys deleted: ${totalDeleted}`);

    if (totalDeleted > 0) {
      console.log('\n⚠️  Important: Restart your workers to initialize clean queues');
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await redis.quit();
  }
}

// Auto-run when executed directly
flushOldQueueKeys();
