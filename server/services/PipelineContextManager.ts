/**
 * PipelineContextManager
 *
 * Manages shared context/scratchpad for pipeline executions.
 * Enables AI agents to share knowledge without strict variable mapping.
 *
 * Uses Redis for fast ephemeral state with 24h TTL.
 */

import Redis from 'ioredis';

// =====================================================
// TYPES
// =====================================================

export interface ContextEntry {
  key: string;
  value: any;
  sourceNode: string;
  nodeType: string;
  timestamp: number;
  summary?: string; // Optional human-readable summary
}

export interface ContextArtifact {
  id: string;
  type: 'file' | 'image' | 'code' | 'data' | 'text';
  name: string;
  content: string; // Base64 for binary, raw for text
  mimeType?: string;
  sourceNode: string;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface ExecutionContext {
  executionId: string;
  pipelineId: string;
  startedAt: number;
  entries: ContextEntry[];
  artifacts: ContextArtifact[];
  variables: Record<string, any>;
  nodeOutputs: Record<string, any>;
}

export interface ContextSummaryOptions {
  maxLength?: number;
  includeArtifacts?: boolean;
  focusNodes?: string[];
  format?: 'narrative' | 'structured' | 'compact';
}

// =====================================================
// REDIS KEY HELPERS
// =====================================================

const CONTEXT_PREFIX = 'pipeline:context:';
const ARTIFACTS_PREFIX = 'pipeline:artifacts:';
const OUTPUTS_PREFIX = 'pipeline:outputs:';
const META_PREFIX = 'pipeline:meta:';
const DEFAULT_TTL = 60 * 60 * 24; // 24 hours

function getContextKey(executionId: string): string {
  return `${CONTEXT_PREFIX}${executionId}`;
}

function getArtifactsKey(executionId: string): string {
  return `${ARTIFACTS_PREFIX}${executionId}`;
}

function getOutputsKey(executionId: string): string {
  return `${OUTPUTS_PREFIX}${executionId}`;
}

function getMetaKey(executionId: string): string {
  return `${META_PREFIX}${executionId}`;
}

// =====================================================
// PIPELINE CONTEXT MANAGER
// =====================================================

export class PipelineContextManager {
  private redis: Redis | null = null;
  private localCache: Map<string, ExecutionContext> = new Map();
  private redisErrorLogged: boolean = false;

  constructor() {
    this.initRedis();
  }

  private initRedis(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryDelayOnFailover: 100,
        lazyConnect: true,
        enableOfflineQueue: false,
        connectTimeout: 3000,
      });

      this.redis.on('error', () => {
        // Log only once to avoid spam
        if (!this.redisErrorLogged) {
          console.warn('[PipelineContextManager] Redis unavailable, using local cache');
          this.redisErrorLogged = true;
        }
        this.redis = null;
      });

      this.redis.connect().catch(() => {
        if (!this.redisErrorLogged) {
          console.warn('[PipelineContextManager] Redis unavailable, using local cache');
          this.redisErrorLogged = true;
        }
        this.redis = null;
      });
    } catch (error) {
      if (!this.redisErrorLogged) {
        console.warn('[PipelineContextManager] Redis init failed, using local cache');
        this.redisErrorLogged = true;
      }
      this.redis = null;
    }
  }

  // =====================================================
  // INITIALIZATION
  // =====================================================

  /**
   * Initialize context for a new execution
   */
  async initializeContext(
    executionId: string,
    pipelineId: string,
    initialVariables?: Record<string, any>
  ): Promise<void> {
    const context: ExecutionContext = {
      executionId,
      pipelineId,
      startedAt: Date.now(),
      entries: [],
      artifacts: [],
      variables: initialVariables || {},
      nodeOutputs: {},
    };

    if (this.redis) {
      await this.redis.setex(
        getMetaKey(executionId),
        DEFAULT_TTL,
        JSON.stringify(context)
      );
    } else {
      this.localCache.set(executionId, context);
    }

    console.log(`[PipelineContextManager] Initialized context for execution: ${executionId}`);
  }

  // =====================================================
  // CONTEXT ENTRIES
  // =====================================================

  /**
   * Add data to the shared context
   */
  async addToContext(
    executionId: string,
    key: string,
    value: any,
    sourceNode: string,
    options?: {
      nodeType?: string;
      summary?: string;
    }
  ): Promise<void> {
    const entry: ContextEntry = {
      key,
      value,
      sourceNode,
      nodeType: options?.nodeType || 'unknown',
      timestamp: Date.now(),
      summary: options?.summary,
    };

    if (this.redis) {
      // Use Redis list for context entries
      await this.redis.rpush(
        getContextKey(executionId),
        JSON.stringify(entry)
      );
      await this.redis.expire(getContextKey(executionId), DEFAULT_TTL);

      // Also store in node outputs hash
      await this.redis.hset(
        getOutputsKey(executionId),
        sourceNode,
        JSON.stringify(value)
      );
      await this.redis.expire(getOutputsKey(executionId), DEFAULT_TTL);
    } else {
      const context = this.localCache.get(executionId);
      if (context) {
        context.entries.push(entry);
        context.nodeOutputs[sourceNode] = value;
      }
    }

    console.log(`[PipelineContextManager] Added to context: ${key} from ${sourceNode}`);
  }

  /**
   * Get all context entries for an execution
   */
  async getContextEntries(executionId: string): Promise<ContextEntry[]> {
    if (this.redis) {
      const entries = await this.redis.lrange(getContextKey(executionId), 0, -1);
      return entries.map((e) => JSON.parse(e));
    } else {
      return this.localCache.get(executionId)?.entries || [];
    }
  }

  /**
   * Get output from a specific node
   */
  async getNodeOutput(executionId: string, nodeId: string): Promise<any> {
    if (this.redis) {
      const output = await this.redis.hget(getOutputsKey(executionId), nodeId);
      return output ? JSON.parse(output) : null;
    } else {
      return this.localCache.get(executionId)?.nodeOutputs[nodeId] || null;
    }
  }

  // =====================================================
  // CONTEXT SUMMARY (For AI Agents)
  // =====================================================

  /**
   * Generate a compressed summary of all context for injection into agent prompts
   */
  async getContextSummary(
    executionId: string,
    options: ContextSummaryOptions = {}
  ): Promise<string> {
    const {
      maxLength = 2000,
      includeArtifacts = true,
      focusNodes = [],
      format = 'narrative',
    } = options;

    const entries = await this.getContextEntries(executionId);
    const artifacts = includeArtifacts ? await this.getArtifacts(executionId) : [];

    if (entries.length === 0) {
      return 'No prior context available. This is the first step in the pipeline.';
    }

    // Filter to focus nodes if specified
    const relevantEntries = focusNodes.length > 0
      ? entries.filter((e) => focusNodes.includes(e.sourceNode))
      : entries;

    switch (format) {
      case 'structured':
        return this.generateStructuredSummary(relevantEntries, artifacts, maxLength);
      case 'compact':
        return this.generateCompactSummary(relevantEntries, artifacts, maxLength);
      case 'narrative':
      default:
        return this.generateNarrativeSummary(relevantEntries, artifacts, maxLength);
    }
  }

  private generateNarrativeSummary(
    entries: ContextEntry[],
    artifacts: ContextArtifact[],
    maxLength: number
  ): string {
    const parts: string[] = [];

    parts.push(`## Pipeline Execution Context\n`);
    parts.push(`This pipeline has completed ${entries.length} step(s) so far.\n`);

    // Group by source node
    const nodeGroups = new Map<string, ContextEntry[]>();
    for (const entry of entries) {
      const existing = nodeGroups.get(entry.sourceNode) || [];
      existing.push(entry);
      nodeGroups.set(entry.sourceNode, existing);
    }

    parts.push(`\n### Completed Steps:\n`);
    let stepNum = 1;
    for (const [nodeId, nodeEntries] of nodeGroups) {
      const firstEntry = nodeEntries[0];
      parts.push(`\n**Step ${stepNum} (${firstEntry.nodeType || 'Node'}: ${nodeId}):**`);

      for (const entry of nodeEntries) {
        if (entry.summary) {
          parts.push(`- ${entry.summary}`);
        } else {
          const valuePreview = this.truncateValue(entry.value, 200);
          parts.push(`- ${entry.key}: ${valuePreview}`);
        }
      }
      stepNum++;
    }

    // Add artifacts summary
    if (artifacts.length > 0) {
      parts.push(`\n### Generated Artifacts:`);
      for (const artifact of artifacts) {
        parts.push(`- [${artifact.type}] ${artifact.name} (from ${artifact.sourceNode})`);
      }
    }

    let summary = parts.join('\n');

    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 100) +
        `\n\n... [Summary truncated. ${entries.length} total steps, ${artifacts.length} artifacts]`;
    }

    return summary;
  }

  private generateStructuredSummary(
    entries: ContextEntry[],
    artifacts: ContextArtifact[],
    maxLength: number
  ): string {
    const structure = {
      stepCount: entries.length,
      artifactCount: artifacts.length,
      steps: entries.map((e) => ({
        node: e.sourceNode,
        type: e.nodeType,
        key: e.key,
        summary: e.summary || this.truncateValue(e.value, 100),
      })),
      artifacts: artifacts.map((a) => ({
        type: a.type,
        name: a.name,
        source: a.sourceNode,
      })),
    };

    let json = JSON.stringify(structure, null, 2);
    if (json.length > maxLength) {
      // Reduce to essential info
      const compact = {
        steps: entries.length,
        lastStep: entries[entries.length - 1]?.key || 'none',
        artifacts: artifacts.length,
      };
      json = JSON.stringify(compact);
    }

    return `Pipeline Context (JSON):\n\`\`\`json\n${json}\n\`\`\``;
  }

  private generateCompactSummary(
    entries: ContextEntry[],
    artifacts: ContextArtifact[],
    maxLength: number
  ): string {
    const lines: string[] = [`Context: ${entries.length} steps, ${artifacts.length} artifacts`];

    for (const entry of entries.slice(-5)) { // Last 5 entries
      const preview = entry.summary || this.truncateValue(entry.value, 50);
      lines.push(`• ${entry.sourceNode}: ${preview}`);
    }

    return lines.join('\n').substring(0, maxLength);
  }

  private truncateValue(value: any, maxLen: number): string {
    let str: string;
    if (typeof value === 'string') {
      str = value;
    } else if (typeof value === 'object') {
      str = JSON.stringify(value);
    } else {
      str = String(value);
    }

    if (str.length > maxLen) {
      return str.substring(0, maxLen - 3) + '...';
    }
    return str;
  }

  // =====================================================
  // ARTIFACTS
  // =====================================================

  /**
   * Store an artifact (file, image, code, etc.)
   */
  async addArtifact(
    executionId: string,
    artifact: Omit<ContextArtifact, 'id' | 'createdAt'>
  ): Promise<string> {
    const id = `artifact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullArtifact: ContextArtifact = {
      ...artifact,
      id,
      createdAt: Date.now(),
    };

    if (this.redis) {
      await this.redis.rpush(
        getArtifactsKey(executionId),
        JSON.stringify(fullArtifact)
      );
      await this.redis.expire(getArtifactsKey(executionId), DEFAULT_TTL);
    } else {
      const context = this.localCache.get(executionId);
      if (context) {
        context.artifacts.push(fullArtifact);
      }
    }

    console.log(`[PipelineContextManager] Added artifact: ${artifact.name} (${artifact.type})`);
    return id;
  }

  /**
   * Get all artifacts for an execution
   */
  async getArtifacts(executionId: string): Promise<ContextArtifact[]> {
    if (this.redis) {
      const artifacts = await this.redis.lrange(getArtifactsKey(executionId), 0, -1);
      return artifacts.map((a) => JSON.parse(a));
    } else {
      return this.localCache.get(executionId)?.artifacts || [];
    }
  }

  /**
   * Get a specific artifact by ID
   */
  async getArtifact(executionId: string, artifactId: string): Promise<ContextArtifact | null> {
    const artifacts = await this.getArtifacts(executionId);
    return artifacts.find((a) => a.id === artifactId) || null;
  }

  // =====================================================
  // VARIABLES (Explicit Pipeline Variables)
  // =====================================================

  /**
   * Set a pipeline variable
   */
  async setVariable(executionId: string, key: string, value: any): Promise<void> {
    if (this.redis) {
      const meta = await this.redis.get(getMetaKey(executionId));
      if (meta) {
        const context: ExecutionContext = JSON.parse(meta);
        context.variables[key] = value;
        await this.redis.setex(
          getMetaKey(executionId),
          DEFAULT_TTL,
          JSON.stringify(context)
        );
      }
    } else {
      const context = this.localCache.get(executionId);
      if (context) {
        context.variables[key] = value;
      }
    }
  }

  /**
   * Get a pipeline variable
   */
  async getVariable(executionId: string, key: string): Promise<any> {
    if (this.redis) {
      const meta = await this.redis.get(getMetaKey(executionId));
      if (meta) {
        const context: ExecutionContext = JSON.parse(meta);
        return context.variables[key];
      }
    } else {
      return this.localCache.get(executionId)?.variables[key];
    }
    return null;
  }

  /**
   * Get all pipeline variables
   */
  async getAllVariables(executionId: string): Promise<Record<string, any>> {
    if (this.redis) {
      const meta = await this.redis.get(getMetaKey(executionId));
      if (meta) {
        const context: ExecutionContext = JSON.parse(meta);
        return context.variables;
      }
    } else {
      return this.localCache.get(executionId)?.variables || {};
    }
    return {};
  }

  // =====================================================
  // FULL CONTEXT RETRIEVAL
  // =====================================================

  /**
   * Get the full execution context
   */
  async getFullContext(executionId: string): Promise<ExecutionContext | null> {
    if (this.redis) {
      const [meta, entries, artifacts, outputs] = await Promise.all([
        this.redis.get(getMetaKey(executionId)),
        this.redis.lrange(getContextKey(executionId), 0, -1),
        this.redis.lrange(getArtifactsKey(executionId), 0, -1),
        this.redis.hgetall(getOutputsKey(executionId)),
      ]);

      if (!meta) return null;

      const context: ExecutionContext = JSON.parse(meta);
      context.entries = entries.map((e) => JSON.parse(e));
      context.artifacts = artifacts.map((a) => JSON.parse(a));
      context.nodeOutputs = {};
      for (const [key, value] of Object.entries(outputs)) {
        context.nodeOutputs[key] = JSON.parse(value);
      }

      return context;
    } else {
      return this.localCache.get(executionId) || null;
    }
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  /**
   * Clean up context for an execution (called after completion)
   */
  async cleanupContext(executionId: string): Promise<void> {
    if (this.redis) {
      await Promise.all([
        this.redis.del(getContextKey(executionId)),
        this.redis.del(getArtifactsKey(executionId)),
        this.redis.del(getOutputsKey(executionId)),
        this.redis.del(getMetaKey(executionId)),
      ]);
    } else {
      this.localCache.delete(executionId);
    }

    console.log(`[PipelineContextManager] Cleaned up context for: ${executionId}`);
  }

  /**
   * Extend TTL for long-running executions
   */
  async extendTTL(executionId: string, additionalSeconds: number = 3600): Promise<void> {
    if (this.redis) {
      const keys = [
        getContextKey(executionId),
        getArtifactsKey(executionId),
        getOutputsKey(executionId),
        getMetaKey(executionId),
      ];

      for (const key of keys) {
        const ttl = await this.redis.ttl(key);
        if (ttl > 0) {
          await this.redis.expire(key, ttl + additionalSeconds);
        }
      }
    }
  }
}

// Singleton instance
export const pipelineContextManager = new PipelineContextManager();
