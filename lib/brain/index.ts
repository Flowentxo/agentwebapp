/**
 * Brain AI Module - Main Export
 * Central Intelligence and Knowledge Management System
 *
 * v2.0 - Connected Intelligence Workspace
 * - Multi-Model Router (GPT-4, Gemini Flash)
 * - Enhanced RAG Pipeline
 * - AI Writer with Role-Based Prompts
 * - Standup Generator
 */

// ============================================
// CORE SERVICES
// ============================================

export { embeddingService, EmbeddingService } from './EmbeddingService';
export type { EmbeddingResult, EmbeddingBatchResult } from './EmbeddingService';

export { knowledgeIndexer, KnowledgeIndexer } from './KnowledgeIndexer';
export type { DocumentInput, IndexedDocument, ChunkConfig } from './KnowledgeIndexer';

export { contextManager, ContextManager } from './ContextManager';
export type { SessionContext, ContextSnapshot, ContextQuery } from './ContextManager';

export { brainService, BrainService } from './BrainService';
export type { QueryOptions, QueryResult, SuggestionOptions } from './BrainService';

export { redisCache, RedisCache } from './RedisCache';
export type { CacheOptions, SessionCacheData } from './RedisCache';

// ============================================
// v2.0 - CONNECTED INTELLIGENCE
// ============================================

// Multi-Model Router
export { modelRouter, ModelRouter } from './ModelRouter';
export type {
  ModelConfig,
  RoutingDecision,
  TaskAnalysis,
  RouterOptions,
  GenerationResult,
  ModelProvider,
  ModelTier,
} from './ModelRouter';

// Enhanced RAG Pipeline
export { enhancedRAG, EnhancedRAGService } from './EnhancedRAG';
export type {
  RAGConfig,
  RAGSource,
  RAGResponse,
  QueryExpansion,
} from './EnhancedRAG';

// AI Writer
export { aiWriter, AIWriterService } from './AIWriter';
export type {
  WriterRole,
  WriterTemplate,
  WriterTone,
  WriterConfig,
  ThreadMessage,
  ThreadSummary,
  GeneratedContent,
} from './AIWriter';

// Standup Generator
export { standupGenerator, StandupGeneratorService } from './StandupGenerator';
export type {
  StandupConfig,
  ActivityItem,
  StandupReport,
} from './StandupGenerator';

// Agent Integration (Phase 3)
export { BrainClient, getBrainClient, createBrainClient } from './BrainClient';
export type {
  BrainClientConfig,
  QueryKnowledgeOptions,
  QueryKnowledgeResult,
  StoreContextOptions,
  AgentMetrics,
  AgentKnowledgeSpace,
} from './BrainClient';

export {
  AutoContextCapture,
  getAutoContextCapture,
  createAutoContextCapture,
  cleanupAllCaptures,
} from './AutoContextCapture';
export type {
  CaptureConfig,
  MessageCapture,
  ConversationSummary,
} from './AutoContextCapture';

export { agentAuth, AgentAuth } from './AgentAuth';
export type { AgentApiKey, AgentPermissions } from './AgentAuth';

export { agentMetricsTracker, AgentMetricsTracker } from './AgentMetricsTracker';
export type {
  AgentInteractionMetrics,
  AgentAlert,
} from './AgentMetricsTracker';

// ============================================
// v2.0 - CONNECTED SEARCH
// ============================================

// Connected Search Service
export {
  connectedSearchService,
  ConnectedSearchService,
} from './ConnectedSearchService';
export type {
  ConnectedSourceConfig,
  OAuthTokens,
  DocumentMetadata,
  SyncResult,
  SearchOptions,
  SearchResult,
} from './ConnectedSearchService';

// Connectors
export { googleDriveConnector, GoogleDriveConnector } from './connectors';
export type { GoogleDriveConfig, GoogleDriveFile } from './connectors';

// AI Usage Tracking (ISO 42001 Compliance)
export { aiUsageTracker, AIUsageTrackerService } from './AIUsageTracker';
export type { AIOperation, UsageRecord, UsageStats } from './AIUsageTracker';

// ============================================
// v3.0 - MEETING INTELLIGENCE
// ============================================

// Meeting Bot Service (Recall.ai Integration)
export { meetingBotService, MeetingBotService } from './MeetingBotService';
export type {
  MeetingPlatform,
  BotStatus,
  MeetingBot,
  CreateBotOptions,
  TranscriptSegment,
  MeetingTranscript,
} from './MeetingBotService';

// Meeting Intelligence Service
export {
  meetingIntelligenceService,
  MeetingIntelligenceService,
} from './MeetingIntelligenceService';
export type {
  MeetingSummary,
  TopicSegment,
  ActionItem,
  Decision,
  ParticipantInsight,
  MeetingIntelligence,
} from './MeetingIntelligenceService';
