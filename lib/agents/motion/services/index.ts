/**
 * Motion Services - Enterprise-Grade Service Layer
 *
 * Exports all services for Motion agents
 */

// AI Service
export { MotionAIService, motionAI } from './MotionAIService';
export type {
  AIGenerationOptions,
  AIAnalysisResult,
  AIContentResult,
  ContextData,
  RateLimitedOptions,
} from './MotionAIService';

// Tool Execution Service
export { ToolExecutionService, toolExecutor } from './ToolExecutionService';
export type { ToolExecutionContext, ExecutionMetrics, ExecutionLog } from './ToolExecutionService';

// Memory Service
export { MemoryService, memoryService } from './MemoryService';
export type { MemoryEntry, MemorySearchResult, MemoryContext } from './MemoryService';

// Rate Limit Service - Enterprise Rate Limiting
export {
  RateLimitService,
  rateLimiter,
  RateLimitError,
  DEFAULT_RATE_LIMITS,
} from './RateLimitService';
export type {
  RateLimitConfig,
  RateLimitContext,
  RateLimitResult,
  RateLimitMetrics,
} from './RateLimitService';

// Cache Service - Enterprise Caching
export {
  CacheService,
  cacheService,
  DEFAULT_CACHE_CONFIG,
} from './CacheService';
export type {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheOptions,
  CacheResult,
} from './CacheService';

// Circuit Breaker Service - Fault Tolerance
export {
  CircuitBreakerService,
  circuitBreaker,
  CircuitBreakerOpenError,
  DEFAULT_CIRCUIT_BREAKER_CONFIG,
} from './CircuitBreakerService';
export type {
  CircuitBreakerConfig,
  CircuitBreakerStats,
  CircuitBreakerMetrics,
  CircuitState,
} from './CircuitBreakerService';

// Logging Service - Structured Logging
export {
  LoggingService,
  logger,
  agentLogger,
  toolLogger,
  aiLogger,
  serviceLogger,
  DEFAULT_LOGGING_CONFIG,
} from './LoggingService';
export type {
  LogLevel,
  LogContext,
  LogEntry,
  LoggingConfig,
  LoggerInstance,
} from './LoggingService';

// Validation Service - Input Validation
export {
  ValidationService,
  validator,
  sanitizers,
} from './ValidationService';
export type {
  ValidationResult,
  ValidationError,
  ValidatorOptions,
  ValidationSchema,
  SchemaField,
} from './ValidationService';

// Prompt Guard Service - Injection Protection
export {
  PromptGuardService,
  promptGuard,
  PromptInjectionError,
  DEFAULT_GUARD_CONFIG,
} from './PromptGuardService';
export type {
  PromptAnalysis,
  PromptThreat,
  ThreatLevel,
  ThreatType,
  GuardConfig,
} from './PromptGuardService';

// Metrics Service - Monitoring & Metrics
export {
  MetricsService,
  metrics,
  DEFAULT_METRICS_CONFIG,
} from './MetricsService';
export type {
  MetricType,
  MetricLabels,
  MetricValue,
  Metric,
  HistogramMetric,
  HealthCheck,
  SystemHealth,
  AlertThreshold,
  Alert,
  MetricsConfig,
} from './MetricsService';

// Error Recovery Service - Resilience & Recovery
export {
  ErrorRecoveryService,
  errorRecovery,
  DEFAULT_RETRY_CONFIG,
  DEFAULT_ERROR_RECOVERY_CONFIG,
} from './ErrorRecoveryService';
export type {
  ErrorCategory,
  ErrorInfo,
  RetryConfig,
  RecoveryStrategy,
  RecoveryResult,
  FailedOperation,
  ErrorRecoveryConfig,
} from './ErrorRecoveryService';

// Integration Hub (placeholder for future)
// export { IntegrationHub, integrationHub } from './IntegrationHub';
