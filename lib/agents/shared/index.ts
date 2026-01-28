/**
 * PHASE 5: Shared Infrastructure Services
 * Central exports for all shared agent services
 */

// Embedding Service
export {
  EmbeddingService,
  embeddingService,
  type EmbeddingServiceConfig,
  type EmbeddingResult,
  type BatchEmbeddingResult,
} from './EmbeddingService';

// Job Queue Service (BullMQ)
export {
  JobQueueService,
  jobQueueService,
  QUEUE_NAMES,
  type JobQueueConfig,
  type JobData,
  type JobResult,
  type JobHandler,
} from './JobQueueService';

// Event Bus Service
export {
  EventBusService,
  eventBus,
  EVENT_TYPES,
  type AgentEvent,
  type EventSubscription,
  type EventHandler,
} from './EventBusService';

// Re-export Redis Cache for convenience
export { RedisCache, redisCache } from '@/lib/brain/RedisCache';
