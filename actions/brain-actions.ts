'use server';

/**
 * Brain AI Server Actions
 * Knowledge Graph Data & Analytics
 *
 * @version 1.0.0
 */

import { getDb } from '@/lib/db';
import {
  brainExternalDocuments,
  brainKnowledgeEdges,
  brainExternalChunks,
} from '@/lib/db/schema-connected-intelligence';
import { brainMemories } from '@/lib/db/schema-brain-memory';
import { eq, sql, desc, and, gte } from 'drizzle-orm';
import { createLogger } from '@/lib/logger';

const logger = createLogger('brain-actions');

// ============================================================================
// TYPES
// ============================================================================

export interface GraphNode {
  id: string;
  label: string;
  type: 'document' | 'memory' | 'idea' | 'meeting' | 'external';
  sourceType?: string; // pdf, notion, web, etc.
  color: string;
  size: number;
  connections: number;
  metadata?: {
    createdAt?: string;
    fileSize?: number;
    chunkCount?: number;
    category?: string;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: number; // 0-1 similarity score
  type: 'similarity' | 'reference' | 'related';
}

export interface KnowledgeGraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalDocuments: number;
    totalConnections: number;
    storageUsedMB: number;
    storageLimitMB: number;
  };
}

// ============================================================================
// COLOR MAPPING
// ============================================================================

const SOURCE_TYPE_COLORS: Record<string, string> = {
  pdf: '#EF4444',       // Red
  notion: '#000000',    // Black
  web: '#3B82F6',       // Blue
  google_drive: '#34A853', // Green
  slack: '#4A154B',     // Purple
  github: '#24292E',    // Dark gray
  confluence: '#0052CC', // Blue
  upload: '#F59E0B',    // Amber
  text: '#8B5CF6',      // Violet
  default: '#6B7280',   // Gray
};

const NODE_TYPE_COLORS: Record<string, string> = {
  document: '#10B981',  // Emerald
  memory: '#3B82F6',    // Blue
  idea: '#F59E0B',      // Amber
  meeting: '#8B5CF6',   // Violet
  external: '#EC4899',  // Pink
};

function getNodeColor(type: string, sourceType?: string): string {
  if (sourceType && SOURCE_TYPE_COLORS[sourceType]) {
    return SOURCE_TYPE_COLORS[sourceType];
  }
  return NODE_TYPE_COLORS[type] || NODE_TYPE_COLORS.document;
}

// ============================================================================
// KNOWLEDGE GRAPH DATA
// ============================================================================

/**
 * Get Knowledge Graph data for visualization
 * Includes nodes (documents, memories) and edges (similarity-based connections)
 */
export async function getBrainGraphData(
  workspaceId: string = 'default-workspace'
): Promise<{ success: boolean; data?: KnowledgeGraphData; error?: string }> {
  try {
    const db = getDb();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    let totalStorageBytes = 0;

    // 1. Fetch External Documents
    const documents = await db
      .select({
        id: brainExternalDocuments.id,
        title: brainExternalDocuments.title,
        mimeType: brainExternalDocuments.mimeType,
        fileSize: brainExternalDocuments.fileSize,
        chunkCount: brainExternalDocuments.chunkCount,
        sourceMetadata: brainExternalDocuments.sourceMetadata,
        indexedAt: brainExternalDocuments.indexedAt,
      })
      .from(brainExternalDocuments)
      .where(
        and(
          eq(brainExternalDocuments.workspaceId, workspaceId),
          eq(brainExternalDocuments.isDeleted, false)
        )
      )
      .orderBy(desc(brainExternalDocuments.indexedAt))
      .limit(100);

    // Convert documents to nodes
    for (const doc of documents) {
      const sourceType = getSourceTypeFromMime(doc.mimeType || '');
      const metadata = doc.sourceMetadata as Record<string, unknown> || {};

      nodes.push({
        id: doc.id,
        label: truncateLabel(doc.title, 30),
        type: 'document',
        sourceType,
        color: getNodeColor('document', sourceType),
        size: calculateNodeSize(doc.chunkCount || 1),
        connections: 0, // Will be updated after edge calculation
        metadata: {
          createdAt: doc.indexedAt?.toISOString(),
          fileSize: doc.fileSize || 0,
          chunkCount: doc.chunkCount || 0,
          category: (metadata.category as string) || 'general',
        },
      });

      totalStorageBytes += doc.fileSize || 0;
    }

    // 2. Fetch Brain Memories (limited)
    try {
      const memories = await db
        .select({
          id: brainMemories.id,
          content: brainMemories.content,
          memoryType: brainMemories.memoryType,
          importance: brainMemories.importance,
          createdAt: brainMemories.createdAt,
        })
        .from(brainMemories)
        .orderBy(desc(brainMemories.importance))
        .limit(30);

      for (const memory of memories) {
        const content = memory.content as Record<string, unknown>;
        const label = (content.title as string) || (content.summary as string) || 'Memory';

        nodes.push({
          id: memory.id,
          label: truncateLabel(label, 25),
          type: mapMemoryType(memory.memoryType),
          color: NODE_TYPE_COLORS[mapMemoryType(memory.memoryType)],
          size: calculateNodeSize(memory.importance || 5),
          connections: 0,
          metadata: {
            createdAt: memory.createdAt?.toISOString(),
            category: memory.memoryType,
          },
        });
      }
    } catch (e) {
      logger.warn('[Graph] Could not fetch memories:', e);
    }

    // 3. Fetch existing Knowledge Edges
    try {
      const existingEdges = await db
        .select()
        .from(brainKnowledgeEdges)
        .where(eq(brainKnowledgeEdges.workspaceId, workspaceId))
        .limit(200);

      for (const edge of existingEdges) {
        // Only add edge if both nodes exist
        const sourceExists = nodes.some((n) => n.id === edge.sourceId);
        const targetExists = nodes.some((n) => n.id === edge.targetId);

        if (sourceExists && targetExists) {
          edges.push({
            source: edge.sourceId,
            target: edge.targetId,
            strength: parseFloat(edge.strength?.toString() || '0.5'),
            type: edge.edgeType === 'references' ? 'reference' : 'related',
          });
        }
      }
    } catch (e) {
      logger.warn('[Graph] Could not fetch edges:', e);
    }

    // 4. Generate similarity-based edges if we have few edges
    // This simulates vector similarity for documents with similar categories/types
    if (edges.length < 10 && nodes.length >= 2) {
      const docNodes = nodes.filter((n) => n.type === 'document');

      for (let i = 0; i < docNodes.length; i++) {
        for (let j = i + 1; j < docNodes.length; j++) {
          const similarity = calculateSimulatedSimilarity(docNodes[i], docNodes[j]);

          if (similarity >= 0.85) {
            edges.push({
              source: docNodes[i].id,
              target: docNodes[j].id,
              strength: similarity,
              type: 'similarity',
            });
          }
        }
      }
    }

    // 5. Update connection counts on nodes
    for (const edge of edges) {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);
      if (sourceNode) sourceNode.connections++;
      if (targetNode) targetNode.connections++;
    }

    // 6. Calculate stats
    const stats = {
      totalDocuments: nodes.filter((n) => n.type === 'document').length,
      totalConnections: edges.length,
      storageUsedMB: Math.round((totalStorageBytes / (1024 * 1024)) * 10) / 10,
      storageLimitMB: 1024, // 1GB limit (configurable per plan)
    };

    logger.info(`[Graph] Loaded ${nodes.length} nodes, ${edges.length} edges`);

    return {
      success: true,
      data: { nodes, edges, stats },
    };
  } catch (error) {
    logger.error('[Graph] Error loading graph data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load graph data',
    };
  }
}

// ============================================================================
// STORAGE ANALYTICS
// ============================================================================

export interface StorageStats {
  totalDocuments: number;
  totalChunks: number;
  storageUsedMB: number;
  storageLimitMB: number;
  percentUsed: number;
  bySourceType: Array<{
    sourceType: string;
    count: number;
    sizeMB: number;
  }>;
}

/**
 * Get knowledge storage statistics
 */
export async function getKnowledgeStorageStats(
  workspaceId: string = 'default-workspace'
): Promise<{ success: boolean; stats?: StorageStats; error?: string }> {
  try {
    const db = getDb();

    // Aggregate storage by source type
    const aggregation = await db
      .select({
        mimeType: brainExternalDocuments.mimeType,
        count: sql<number>`COUNT(*)`,
        totalSize: sql<number>`COALESCE(SUM(${brainExternalDocuments.fileSize}), 0)`,
        totalChunks: sql<number>`COALESCE(SUM(${brainExternalDocuments.chunkCount}), 0)`,
      })
      .from(brainExternalDocuments)
      .where(
        and(
          eq(brainExternalDocuments.workspaceId, workspaceId),
          eq(brainExternalDocuments.isDeleted, false)
        )
      )
      .groupBy(brainExternalDocuments.mimeType);

    let totalDocuments = 0;
    let totalChunks = 0;
    let totalSizeBytes = 0;
    const bySourceType: StorageStats['bySourceType'] = [];

    for (const row of aggregation) {
      const sourceType = getSourceTypeFromMime(row.mimeType || '');
      const count = Number(row.count) || 0;
      const size = Number(row.totalSize) || 0;
      const chunks = Number(row.totalChunks) || 0;

      totalDocuments += count;
      totalChunks += chunks;
      totalSizeBytes += size;

      bySourceType.push({
        sourceType,
        count,
        sizeMB: Math.round((size / (1024 * 1024)) * 100) / 100,
      });
    }

    const storageLimitMB = 1024; // 1GB
    const storageUsedMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;

    return {
      success: true,
      stats: {
        totalDocuments,
        totalChunks,
        storageUsedMB,
        storageLimitMB,
        percentUsed: Math.round((storageUsedMB / storageLimitMB) * 100),
        bySourceType,
      },
    };
  } catch (error) {
    logger.error('[Storage] Error getting stats:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get storage stats',
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function truncateLabel(text: string, maxLength: number): string {
  if (!text) return 'Untitled';
  return text.length > maxLength ? text.slice(0, maxLength - 3) + '...' : text;
}

function calculateNodeSize(metric: number): number {
  // Base size 10, scaled up to 30 based on importance/chunks
  return Math.min(30, Math.max(10, 10 + Math.log2(metric + 1) * 5));
}

function getSourceTypeFromMime(mimeType: string): string {
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('docx')) return 'upload';
  if (mimeType.includes('text')) return 'text';
  if (mimeType.includes('json')) return 'upload';
  if (mimeType.includes('csv')) return 'upload';
  return 'default';
}

function mapMemoryType(type: string): GraphNode['type'] {
  switch (type) {
    case 'idea':
    case 'business_idea':
      return 'idea';
    case 'meeting':
    case 'transcript':
      return 'meeting';
    case 'external':
      return 'external';
    default:
      return 'memory';
  }
}

/**
 * Simulate vector similarity based on shared attributes
 * In production, this would use actual pgvector cosine similarity
 */
function calculateSimulatedSimilarity(nodeA: GraphNode, nodeB: GraphNode): number {
  let score = 0;

  // Same source type: +0.3
  if (nodeA.sourceType === nodeB.sourceType) {
    score += 0.3;
  }

  // Same category: +0.4
  if (
    nodeA.metadata?.category &&
    nodeB.metadata?.category &&
    nodeA.metadata.category === nodeB.metadata.category
  ) {
    score += 0.4;
  }

  // Created within same week: +0.2
  if (nodeA.metadata?.createdAt && nodeB.metadata?.createdAt) {
    const diffDays = Math.abs(
      (new Date(nodeA.metadata.createdAt).getTime() -
        new Date(nodeB.metadata.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diffDays <= 7) {
      score += 0.2;
    }
  }

  // Random jitter for variation
  score += Math.random() * 0.1;

  return Math.min(1, score);
}
