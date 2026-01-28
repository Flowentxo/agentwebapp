/**
 * Schema Discovery Service
 *
 * Phase 6: Builder Experience Enhancement
 *
 * Powers the frontend autocomplete by analyzing the workflow graph
 * and discovering available variables for expression editing.
 *
 * Key Features:
 * - Analyzes upstream nodes to find available data
 * - Uses execution history, pinned data, or AI inference
 * - Generates JSON Schema and variable paths for autocomplete
 * - Caches results for fast subsequent lookups
 *
 * Performance: Only analyzes the most recent execution, not historical data.
 */

import { getDb } from '@/lib/db';
import { Node, Edge } from 'reactflow';
import {
  nodeSchemaCache,
  nodeTypeSchemaTemplates,
  pinnedNodeData,
  workflowNodeLogs,
  JSONSchemaDefinition,
  VariablePath,
  SchemaDiscoveryResult,
  NodeSchemaCacheRecord,
} from '@/lib/db/schema-dx';
import { workflowExecutions } from '@/lib/db/schema-workflows';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('schema-discovery-service');

// ============================================================================
// TYPES
// ============================================================================

export interface DiscoveryContext {
  workflowId: string;
  currentNodeId: string;
  userId: string;
  nodes: Node[];
  edges: Edge[];
}

export interface DiscoveryOptions {
  /** Include AI-inferred schemas when no data exists */
  useAIInference?: boolean;
  /** Maximum number of upstream nodes to analyze */
  maxUpstreamNodes?: number;
  /** Include global variables ($execution, $env, etc.) */
  includeGlobals?: boolean;
  /** Force refresh (ignore cache) */
  forceRefresh?: boolean;
}

export interface AutocompleteItem {
  path: string;
  label: string;
  type: string;
  description?: string;
  example?: unknown;
  category: string;
  priority: number;
  insertText: string;
  documentation?: string;
}

export interface DiscoveryResult {
  upstreamNodes: SchemaDiscoveryResult[];
  globalVariables: VariablePath[];
  autocompleteItems: AutocompleteItem[];
  cacheHit: boolean;
  discoveryTime: number;
}

// ============================================================================
// NODE TYPE SCHEMA TEMPLATES
// ============================================================================

/**
 * Built-in schema templates for common node types
 * Used when no execution data is available
 */
const BUILTIN_TEMPLATES: Record<string, {
  schema: JSONSchemaDefinition;
  paths: VariablePath[];
  aiHint?: string;
}> = {
  // HTTP Request
  'http-request': {
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'integer', description: 'HTTP status code' },
        headers: { type: 'object', description: 'Response headers' },
        body: { type: 'object', description: 'Response body (parsed JSON)' },
        rawBody: { type: 'string', description: 'Raw response body' },
      },
    },
    paths: [
      { path: 'statusCode', type: 'number', label: 'Status Code', priority: 100 },
      { path: 'body', type: 'object', label: 'Response Body', priority: 90 },
      { path: 'headers', type: 'object', label: 'Response Headers', priority: 50 },
    ],
    aiHint: 'HTTP response with statusCode, headers, and body properties',
  },

  // HubSpot
  'hubspot': {
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'HubSpot record ID' },
        properties: {
          type: 'object',
          properties: {
            email: { type: 'string' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            company: { type: 'string' },
            phone: { type: 'string' },
            website: { type: 'string' },
          },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
    paths: [
      { path: 'id', type: 'string', label: 'Record ID', priority: 100 },
      { path: 'properties.email', type: 'string', label: 'Email', priority: 95 },
      { path: 'properties.firstname', type: 'string', label: 'First Name', priority: 90 },
      { path: 'properties.lastname', type: 'string', label: 'Last Name', priority: 90 },
      { path: 'properties.company', type: 'string', label: 'Company', priority: 80 },
      { path: 'properties.phone', type: 'string', label: 'Phone', priority: 70 },
    ],
    aiHint: 'HubSpot CRM record with id, properties (email, firstname, lastname, etc.), and timestamps',
  },

  // OpenAI / LLM
  'openai': {
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Generated text response' },
        usage: {
          type: 'object',
          properties: {
            promptTokens: { type: 'integer' },
            completionTokens: { type: 'integer' },
            totalTokens: { type: 'integer' },
          },
        },
        model: { type: 'string' },
        finishReason: { type: 'string' },
      },
    },
    paths: [
      { path: 'message', type: 'string', label: 'AI Response', priority: 100 },
      { path: 'usage.totalTokens', type: 'number', label: 'Total Tokens', priority: 60 },
      { path: 'model', type: 'string', label: 'Model Used', priority: 40 },
    ],
    aiHint: 'OpenAI/LLM response with message, usage (tokens), and model info',
  },

  // Database Query
  'database-query': {
    schema: {
      type: 'object',
      properties: {
        rows: { type: 'array', items: { type: 'object' } },
        rowCount: { type: 'integer' },
        fields: { type: 'array', items: { type: 'object' } },
      },
    },
    paths: [
      { path: 'rows', type: 'array', label: 'Result Rows', priority: 100 },
      { path: 'rowCount', type: 'number', label: 'Row Count', priority: 80 },
      { path: 'rows[0]', type: 'object', label: 'First Row', priority: 70 },
    ],
    aiHint: 'Database query result with rows array, rowCount, and field metadata',
  },

  // Email
  'email-send': {
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        messageId: { type: 'string' },
        recipients: { type: 'array', items: { type: 'string' } },
      },
    },
    paths: [
      { path: 'success', type: 'boolean', label: 'Send Success', priority: 100 },
      { path: 'messageId', type: 'string', label: 'Message ID', priority: 80 },
    ],
    aiHint: 'Email send result with success flag and messageId',
  },

  // Webhook Trigger
  'webhook': {
    schema: {
      type: 'object',
      properties: {
        body: { type: 'object', description: 'Request body' },
        headers: { type: 'object', description: 'Request headers' },
        query: { type: 'object', description: 'Query parameters' },
        method: { type: 'string' },
        path: { type: 'string' },
      },
    },
    paths: [
      { path: 'body', type: 'object', label: 'Request Body', priority: 100 },
      { path: 'headers', type: 'object', label: 'Headers', priority: 60 },
      { path: 'query', type: 'object', label: 'Query Params', priority: 70 },
      { path: 'method', type: 'string', label: 'HTTP Method', priority: 50 },
    ],
    aiHint: 'Webhook trigger data with body, headers, query params, method, and path',
  },

  // Code Node
  'code': {
    schema: {
      type: 'object',
      description: 'Custom code output - structure depends on code',
    },
    paths: [],
    aiHint: 'Custom JavaScript/TypeScript code output - analyze the code to determine schema',
  },

  // Set Variables
  'set': {
    schema: {
      type: 'object',
      description: 'Set node output - custom variables',
    },
    paths: [],
    aiHint: 'Variable assignment node - outputs the variables that were set',
  },
};

// ============================================================================
// GLOBAL VARIABLES
// ============================================================================

const GLOBAL_VARIABLES: VariablePath[] = [
  // Execution context
  { path: '$execution.id', type: 'string', label: 'Execution ID', category: 'execution', priority: 100 },
  { path: '$execution.mode', type: 'string', label: 'Execution Mode', category: 'execution', priority: 90 },
  { path: '$execution.startTime', type: 'string', label: 'Start Time', category: 'execution', priority: 80 },
  { path: '$workflow.id', type: 'string', label: 'Workflow ID', category: 'workflow', priority: 100 },
  { path: '$workflow.name', type: 'string', label: 'Workflow Name', category: 'workflow', priority: 90 },

  // Date/Time
  { path: '$now', type: 'string', label: 'Current DateTime', category: 'datetime', priority: 100 },
  { path: '$today', type: 'string', label: 'Today Date', category: 'datetime', priority: 90 },

  // Loop context (when in loop)
  { path: '$runIndex', type: 'number', label: 'Run Index', category: 'loop', priority: 100 },
  { path: '$batchIndex', type: 'number', label: 'Batch Index', category: 'loop', priority: 90 },
  { path: '$itemIndex', type: 'number', label: 'Item Index', category: 'loop', priority: 80 },
  { path: '$items', type: 'array', label: 'Current Items', category: 'loop', priority: 70 },

  // Environment
  { path: '$env.NODE_ENV', type: 'string', label: 'Node Environment', category: 'env', priority: 50 },
];

// ============================================================================
// SCHEMA DISCOVERY SERVICE
// ============================================================================

export class SchemaDiscoveryService {
  private db = getDb();
  private templateCache: Map<string, typeof BUILTIN_TEMPLATES[string]> = new Map();

  constructor() {
    // Pre-populate template cache
    for (const [type, template] of Object.entries(BUILTIN_TEMPLATES)) {
      this.templateCache.set(type, template);
    }
  }

  // --------------------------------------------------------------------------
  // MAIN DISCOVERY METHOD
  // --------------------------------------------------------------------------

  /**
   * Discover available variables for a node's expression editor
   */
  async discoverVariables(
    context: DiscoveryContext,
    options: DiscoveryOptions = {}
  ): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const {
      useAIInference = true,
      maxUpstreamNodes = 20,
      includeGlobals = true,
      forceRefresh = false,
    } = options;

    logger.info('Starting schema discovery', {
      workflowId: context.workflowId,
      currentNodeId: context.currentNodeId,
      nodeCount: context.nodes.length,
    });

    // Find upstream nodes
    const upstreamNodeIds = this.findUpstreamNodes(
      context.currentNodeId,
      context.nodes,
      context.edges,
      maxUpstreamNodes
    );

    logger.debug('Found upstream nodes', { count: upstreamNodeIds.length, nodeIds: upstreamNodeIds });

    // Check cache first
    let cacheHit = false;
    const cachedSchemas = forceRefresh
      ? []
      : await this.getCachedSchemas(context.workflowId, upstreamNodeIds);

    if (cachedSchemas.length === upstreamNodeIds.length && !forceRefresh) {
      cacheHit = true;
    }

    // Discover schemas for each upstream node
    const upstreamResults: SchemaDiscoveryResult[] = [];

    for (const nodeId of upstreamNodeIds) {
      const node = context.nodes.find(n => n.id === nodeId);
      if (!node) continue;

      // Check if we have a cached schema
      const cached = cachedSchemas.find(c => c.nodeId === nodeId);
      if (cached && !cached.isStale) {
        upstreamResults.push(this.cacheRecordToResult(cached, node));
        continue;
      }

      // Discover schema for this node
      const result = await this.discoverNodeSchema(
        context.workflowId,
        node,
        context.userId,
        useAIInference
      );

      if (result) {
        upstreamResults.push(result);
      }
    }

    // Build autocomplete items
    const autocompleteItems = this.buildAutocompleteItems(
      upstreamResults,
      includeGlobals ? GLOBAL_VARIABLES : []
    );

    const discoveryTime = Date.now() - startTime;

    logger.info('Schema discovery complete', {
      workflowId: context.workflowId,
      upstreamCount: upstreamResults.length,
      autocompleteCount: autocompleteItems.length,
      cacheHit,
      discoveryTime,
    });

    return {
      upstreamNodes: upstreamResults,
      globalVariables: includeGlobals ? GLOBAL_VARIABLES : [],
      autocompleteItems,
      cacheHit,
      discoveryTime,
    };
  }

  // --------------------------------------------------------------------------
  // NODE SCHEMA DISCOVERY
  // --------------------------------------------------------------------------

  /**
   * Discover schema for a single node
   */
  private async discoverNodeSchema(
    workflowId: string,
    node: Node,
    userId: string,
    useAIInference: boolean
  ): Promise<SchemaDiscoveryResult | null> {
    const nodeType = node.type || 'unknown';
    const nodeName = node.data?.name || node.data?.label || node.id;

    // 1. Try pinned data first (fastest, user-controlled)
    const pinnedResult = await this.getSchemaFromPinnedData(workflowId, node.id, userId);
    if (pinnedResult) {
      await this.updateCache(workflowId, node.id, nodeType, nodeName, pinnedResult, 'pinned');
      return pinnedResult;
    }

    // 2. Try last execution output
    const executionResult = await this.getSchemaFromExecution(workflowId, node.id);
    if (executionResult) {
      await this.updateCache(workflowId, node.id, nodeType, nodeName, executionResult, 'execution');
      return executionResult;
    }

    // 3. Try template (built-in knowledge)
    const templateResult = this.getSchemaFromTemplate(node);
    if (templateResult) {
      await this.updateCache(workflowId, node.id, nodeType, nodeName, templateResult, 'template');
      return templateResult;
    }

    // 4. Try AI inference (slowest, fallback)
    if (useAIInference) {
      const inferredResult = await this.getSchemaFromAI(node);
      if (inferredResult) {
        await this.updateCache(workflowId, node.id, nodeType, nodeName, inferredResult, 'inferred');
        return inferredResult;
      }
    }

    return null;
  }

  /**
   * Get schema from pinned data
   */
  private async getSchemaFromPinnedData(
    workflowId: string,
    nodeId: string,
    userId: string
  ): Promise<SchemaDiscoveryResult | null> {
    const [pin] = await this.db
      .select()
      .from(pinnedNodeData)
      .where(
        and(
          eq(pinnedNodeData.workflowId, workflowId),
          eq(pinnedNodeData.nodeId, nodeId),
          eq(pinnedNodeData.userId, userId),
          eq(pinnedNodeData.isEnabled, true)
        )
      )
      .limit(1);

    if (!pin || !pin.outputSchema) {
      return null;
    }

    return {
      nodeId,
      nodeName: pin.label || nodeId,
      nodeType: 'pinned',
      schema: pin.outputSchema as JSONSchemaDefinition,
      paths: this.extractPathsFromSchema(pin.outputSchema as JSONSchemaDefinition, nodeId),
      source: 'pinned',
      confidence: 95,
      timestamp: pin.updatedAt,
    };
  }

  /**
   * Get schema from last execution
   * PERFORMANCE: Only gets the most recent execution's output
   */
  private async getSchemaFromExecution(
    workflowId: string,
    nodeId: string
  ): Promise<SchemaDiscoveryResult | null> {
    // Get most recent completed execution
    const [latestExecution] = await this.db
      .select({ id: workflowExecutions.id })
      .from(workflowExecutions)
      .where(
        and(
          eq(workflowExecutions.workflowId, workflowId),
          eq(workflowExecutions.status, 'completed')
        )
      )
      .orderBy(desc(workflowExecutions.completedAt))
      .limit(1);

    if (!latestExecution) {
      return null;
    }

    // Get node log from that execution
    const [nodeLog] = await this.db
      .select()
      .from(workflowNodeLogs)
      .where(
        and(
          eq(workflowNodeLogs.executionId, latestExecution.id),
          eq(workflowNodeLogs.nodeId, nodeId),
          eq(workflowNodeLogs.status, 'completed')
        )
      )
      .orderBy(desc(workflowNodeLogs.startedAt))
      .limit(1);

    if (!nodeLog || !nodeLog.outputData) {
      return null;
    }

    const schema = this.generateSchema(nodeLog.outputData);
    const paths = this.extractPathsFromData(nodeLog.outputData, nodeId);

    return {
      nodeId,
      nodeName: nodeLog.nodeName || nodeId,
      nodeType: nodeLog.nodeType || 'unknown',
      schema,
      paths,
      source: 'execution',
      confidence: 100,
      timestamp: nodeLog.completedAt || nodeLog.startedAt,
    };
  }

  /**
   * Get schema from built-in template
   */
  private getSchemaFromTemplate(node: Node): SchemaDiscoveryResult | null {
    const nodeType = node.type?.toLowerCase() || '';
    const template = this.templateCache.get(nodeType);

    if (!template) {
      return null;
    }

    // Add node context to paths
    const paths = template.paths.map(p => ({
      ...p,
      path: `$node.${node.id}.output.${p.path}`,
    }));

    return {
      nodeId: node.id,
      nodeName: node.data?.name || node.data?.label || node.id,
      nodeType: nodeType,
      schema: template.schema,
      paths,
      source: 'template',
      confidence: 70,
      timestamp: new Date(),
    };
  }

  /**
   * Get schema from AI inference
   * Uses LLM to guess schema based on node type
   */
  private async getSchemaFromAI(node: Node): Promise<SchemaDiscoveryResult | null> {
    const nodeType = node.type?.toLowerCase() || '';
    const template = this.templateCache.get(nodeType);

    if (!template?.aiHint) {
      // No hint available, can't infer
      return null;
    }

    // For now, use the template schema with lower confidence
    // In production, this would call an LLM
    const paths = template.paths.map(p => ({
      ...p,
      path: `$node.${node.id}.output.${p.path}`,
    }));

    return {
      nodeId: node.id,
      nodeName: node.data?.name || node.data?.label || node.id,
      nodeType: nodeType,
      schema: template.schema,
      paths,
      source: 'inferred',
      confidence: 50,
      timestamp: new Date(),
    };
  }

  // --------------------------------------------------------------------------
  // GRAPH ANALYSIS
  // --------------------------------------------------------------------------

  /**
   * Find all upstream nodes that feed into the current node
   */
  private findUpstreamNodes(
    currentNodeId: string,
    nodes: Node[],
    edges: Edge[],
    maxNodes: number
  ): string[] {
    const upstream = new Set<string>();
    const queue: string[] = [currentNodeId];
    const visited = new Set<string>();

    while (queue.length > 0 && upstream.size < maxNodes) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      // Find edges that point to this node
      const incomingEdges = edges.filter(e => e.target === nodeId);

      for (const edge of incomingEdges) {
        const sourceId = edge.source;
        if (!visited.has(sourceId) && sourceId !== currentNodeId) {
          upstream.add(sourceId);
          queue.push(sourceId);
        }
      }
    }

    // Sort by topological order (nodes closer to current node first)
    const upstreamArray = Array.from(upstream);
    return this.sortByProximity(currentNodeId, upstreamArray, edges);
  }

  /**
   * Sort upstream nodes by proximity to current node
   */
  private sortByProximity(
    currentNodeId: string,
    nodeIds: string[],
    edges: Edge[]
  ): string[] {
    const distances = new Map<string, number>();

    // BFS from current node going backwards
    const queue: Array<{ id: string; distance: number }> = [{ id: currentNodeId, distance: 0 }];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const { id, distance } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);
      distances.set(id, distance);

      const incomingEdges = edges.filter(e => e.target === id);
      for (const edge of incomingEdges) {
        if (!visited.has(edge.source)) {
          queue.push({ id: edge.source, distance: distance + 1 });
        }
      }
    }

    return nodeIds.sort((a, b) => {
      return (distances.get(a) || 999) - (distances.get(b) || 999);
    });
  }

  // --------------------------------------------------------------------------
  // SCHEMA GENERATION
  // --------------------------------------------------------------------------

  /**
   * Generate JSON Schema from data
   */
  private generateSchema(data: unknown): JSONSchemaDefinition {
    return this.inferSchema(data);
  }

  /**
   * Recursively infer schema from data
   */
  private inferSchema(value: unknown): JSONSchemaDefinition {
    if (value === null) return { type: 'null' };

    if (Array.isArray(value)) {
      return {
        type: 'array',
        items: value.length > 0 ? this.inferSchema(value[0]) : { type: 'object' },
      };
    }

    switch (typeof value) {
      case 'string':
        return { type: 'string' };
      case 'number':
        return { type: Number.isInteger(value) ? 'integer' : 'number' };
      case 'boolean':
        return { type: 'boolean' };
      case 'object':
        const properties: Record<string, JSONSchemaDefinition> = {};
        for (const [key, val] of Object.entries(value as object)) {
          properties[key] = this.inferSchema(val);
        }
        return { type: 'object', properties };
      default:
        return { type: 'string' };
    }
  }

  /**
   * Extract variable paths from schema
   */
  private extractPathsFromSchema(
    schema: JSONSchemaDefinition,
    nodeId: string,
    basePath: string = ''
  ): VariablePath[] {
    const paths: VariablePath[] = [];
    const prefix = basePath || `$node.${nodeId}.output`;

    this.traverseSchema(schema, prefix, (path, type, description) => {
      paths.push({
        path,
        type,
        label: path.split('.').pop() || path,
        description,
        priority: this.calculatePriority(path),
      });
    });

    return paths.slice(0, 100); // Limit
  }

  /**
   * Extract paths from actual data
   */
  private extractPathsFromData(data: unknown, nodeId: string): VariablePath[] {
    const paths: VariablePath[] = [];
    const prefix = `$node.${nodeId}.output`;

    this.traverseData(data, prefix, (path, value, type) => {
      paths.push({
        path,
        type,
        label: path.split('.').pop() || path,
        example: this.truncateExample(value),
        priority: this.calculatePriority(path),
      });
    });

    return paths.slice(0, 100);
  }

  /**
   * Traverse schema and call callback for each path
   */
  private traverseSchema(
    schema: JSONSchemaDefinition,
    path: string,
    callback: (path: string, type: string, description?: string) => void,
    depth: number = 0
  ): void {
    if (depth > 8) return;

    callback(path, schema.type, schema.description);

    if (schema.type === 'object' && schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        this.traverseSchema(propSchema, `${path}.${key}`, callback, depth + 1);
      }
    }

    if (schema.type === 'array' && schema.items) {
      this.traverseSchema(schema.items, `${path}[0]`, callback, depth + 1);
    }
  }

  /**
   * Traverse data and call callback for each path
   */
  private traverseData(
    data: unknown,
    path: string,
    callback: (path: string, value: unknown, type: string) => void,
    depth: number = 0
  ): void {
    if (depth > 8) return;

    const type = this.getType(data);
    callback(path, data, type);

    if (type === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data as object)) {
        this.traverseData(value, `${path}.${key}`, callback, depth + 1);
      }
    }

    if (type === 'array' && Array.isArray(data) && data.length > 0) {
      this.traverseData(data[0], `${path}[0]`, callback, depth + 1);
    }
  }

  /**
   * Get type of value
   */
  private getType(value: unknown): string {
    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    return typeof value;
  }

  /**
   * Calculate priority for a path (for sorting in autocomplete)
   */
  private calculatePriority(path: string): number {
    // Prioritize common field names
    const highPriorityFields = ['id', 'email', 'name', 'message', 'body', 'result', 'data'];
    const lastSegment = path.split('.').pop()?.toLowerCase() || '';

    if (highPriorityFields.includes(lastSegment)) {
      return 100;
    }

    // Shorter paths = higher priority
    const depth = path.split('.').length;
    return Math.max(10, 100 - depth * 10);
  }

  /**
   * Truncate example value for display
   */
  private truncateExample(value: unknown): unknown {
    if (typeof value === 'string' && value.length > 50) {
      return value.substring(0, 50) + '...';
    }
    if (Array.isArray(value)) {
      return `Array(${value.length})`;
    }
    if (typeof value === 'object' && value !== null) {
      return '{...}';
    }
    return value;
  }

  // --------------------------------------------------------------------------
  // CACHE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get cached schemas for nodes
   */
  private async getCachedSchemas(
    workflowId: string,
    nodeIds: string[]
  ): Promise<NodeSchemaCacheRecord[]> {
    if (nodeIds.length === 0) return [];

    return await this.db
      .select()
      .from(nodeSchemaCache)
      .where(
        and(
          eq(nodeSchemaCache.workflowId, workflowId),
          inArray(nodeSchemaCache.nodeId, nodeIds),
          eq(nodeSchemaCache.isStale, false)
        )
      );
  }

  /**
   * Update schema cache
   */
  private async updateCache(
    workflowId: string,
    nodeId: string,
    nodeType: string,
    nodeName: string,
    result: SchemaDiscoveryResult,
    source: 'execution' | 'pinned' | 'template' | 'inferred'
  ): Promise<void> {
    try {
      await this.db
        .insert(nodeSchemaCache)
        .values({
          workflowId,
          nodeId,
          nodeType,
          nodeName,
          outputSchema: result.schema as any,
          schemaSource: source,
          confidence: result.confidence,
          samplePaths: result.paths as any,
          sourceTimestamp: result.timestamp,
          isStale: false,
        })
        .onConflictDoUpdate({
          target: [nodeSchemaCache.workflowId, nodeSchemaCache.nodeId],
          set: {
            nodeType,
            nodeName,
            outputSchema: result.schema as any,
            schemaSource: source,
            confidence: result.confidence,
            samplePaths: result.paths as any,
            sourceTimestamp: result.timestamp,
            isStale: false,
            updatedAt: new Date(),
          },
        });
    } catch (error) {
      logger.error('Failed to update schema cache', {
        workflowId,
        nodeId,
        error: error instanceof Error ? error.message : 'Unknown',
      });
    }
  }

  /**
   * Invalidate cache for a workflow
   */
  async invalidateCache(workflowId: string, nodeIds?: string[]): Promise<void> {
    if (nodeIds && nodeIds.length > 0) {
      await this.db
        .update(nodeSchemaCache)
        .set({ isStale: true, updatedAt: new Date() })
        .where(
          and(
            eq(nodeSchemaCache.workflowId, workflowId),
            inArray(nodeSchemaCache.nodeId, nodeIds)
          )
        );
    } else {
      await this.db
        .update(nodeSchemaCache)
        .set({ isStale: true, updatedAt: new Date() })
        .where(eq(nodeSchemaCache.workflowId, workflowId));
    }
  }

  /**
   * Convert cache record to result
   */
  private cacheRecordToResult(
    cache: NodeSchemaCacheRecord,
    node: Node
  ): SchemaDiscoveryResult {
    return {
      nodeId: cache.nodeId,
      nodeName: cache.nodeName || node.data?.name || cache.nodeId,
      nodeType: cache.nodeType,
      schema: cache.outputSchema as JSONSchemaDefinition,
      paths: (cache.samplePaths as VariablePath[]) || [],
      source: cache.schemaSource as 'execution' | 'pinned' | 'inferred' | 'template',
      confidence: cache.confidence,
      timestamp: cache.sourceTimestamp || cache.updatedAt,
    };
  }

  // --------------------------------------------------------------------------
  // AUTOCOMPLETE BUILDING
  // --------------------------------------------------------------------------

  /**
   * Build autocomplete items from discovery results
   */
  private buildAutocompleteItems(
    upstreamNodes: SchemaDiscoveryResult[],
    globalVariables: VariablePath[]
  ): AutocompleteItem[] {
    const items: AutocompleteItem[] = [];

    // Add node variables
    for (const nodeResult of upstreamNodes) {
      for (const path of nodeResult.paths) {
        items.push({
          path: path.path,
          label: path.label,
          type: path.type,
          description: path.description,
          example: path.example,
          category: `${nodeResult.nodeName} (${nodeResult.nodeType})`,
          priority: path.priority || 50,
          insertText: `{{${path.path}}}`,
          documentation: this.buildDocumentation(nodeResult, path),
        });
      }
    }

    // Add global variables
    for (const global of globalVariables) {
      items.push({
        path: global.path,
        label: global.label,
        type: global.type,
        description: global.description,
        example: global.example,
        category: global.category || 'Global',
        priority: global.priority || 50,
        insertText: `{{${global.path}}}`,
      });
    }

    // Sort by priority (descending) then by label
    return items.sort((a, b) => {
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.label.localeCompare(b.label);
    });
  }

  /**
   * Build documentation for an autocomplete item
   */
  private buildDocumentation(
    nodeResult: SchemaDiscoveryResult,
    path: VariablePath
  ): string {
    const lines: string[] = [];

    lines.push(`**Source:** ${nodeResult.nodeName}`);
    lines.push(`**Type:** ${path.type}`);

    if (path.description) {
      lines.push(`\n${path.description}`);
    }

    if (path.example !== undefined) {
      lines.push(`\n**Example:** \`${JSON.stringify(path.example)}\``);
    }

    lines.push(`\n_Confidence: ${nodeResult.confidence}% (${nodeResult.source})_`);

    return lines.join('\n');
  }

  // --------------------------------------------------------------------------
  // TEMPLATE MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Register a custom template for a node type
   */
  registerTemplate(
    nodeType: string,
    template: {
      schema: JSONSchemaDefinition;
      paths: VariablePath[];
      aiHint?: string;
    }
  ): void {
    this.templateCache.set(nodeType.toLowerCase(), template);
    logger.info('Registered template', { nodeType });
  }

  /**
   * Load templates from database
   */
  async loadTemplatesFromDB(): Promise<void> {
    const templates = await this.db
      .select()
      .from(nodeTypeSchemaTemplates)
      .where(eq(nodeTypeSchemaTemplates.isActive, true));

    for (const template of templates) {
      this.templateCache.set(template.nodeType.toLowerCase(), {
        schema: template.outputSchema as JSONSchemaDefinition,
        paths: (template.commonPaths as VariablePath[]) || [],
        aiHint: template.aiPromptHint || undefined,
      });
    }

    logger.info('Loaded templates from database', { count: templates.length });
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

let schemaDiscoveryServiceInstance: SchemaDiscoveryService | null = null;

export function getSchemaDiscoveryService(): SchemaDiscoveryService {
  if (!schemaDiscoveryServiceInstance) {
    schemaDiscoveryServiceInstance = new SchemaDiscoveryService();
  }
  return schemaDiscoveryServiceInstance;
}

export default SchemaDiscoveryService;
