import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { getBullMQRedisOptions } from '@/lib/redis/connection';

/**
 * Validates BullMQ queue/job names according to BullMQ requirements.
 * Queue names MUST NOT contain colons (:) as they conflict with Redis key patterns.
 * @throws Error if name contains invalid characters
 */
export function validateQueueName(name: string): void {
  if (name.includes(':')) {
    throw new Error(
      `Invalid queue/job name "${name}": contains ':' which conflicts with BullMQ Redis key patterns. Use hyphens instead.`
    );
  }
  if (!name || name.trim().length === 0) {
    throw new Error('Queue/job name cannot be empty');
  }
  // Only allow alphanumeric, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(
      `Invalid queue/job name "${name}": only alphanumeric characters, hyphens, and underscores are allowed`
    );
  }
}

// Use the unified Redis options with TLS support for Redis Cloud
const connection = new Redis(getBullMQRedisOptions());

const QUEUE_NAME = 'knowledge-index';
validateQueueName(QUEUE_NAME);

export const indexQueue = new Queue(QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});

export interface IndexRevisionJob {
  revisionId: string;
}

export interface ReindexKbJob {
  kbId: string;
}

const JOB_INDEX_REVISION = 'index-revision';
const JOB_REINDEX_KB = 'reindex-kb';

// Validate job names at module initialization
validateQueueName(JOB_INDEX_REVISION);
validateQueueName(JOB_REINDEX_KB);

export async function enqueueIndexRevision(revisionId: string): Promise<void> {
  await indexQueue.add(JOB_INDEX_REVISION, { revisionId });
}

export async function enqueueReindexKb(kbId: string): Promise<void> {
  await indexQueue.add(JOB_REINDEX_KB, { kbId });
}
