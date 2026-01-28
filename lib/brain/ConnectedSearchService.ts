/**
 * Brain AI v2.0 - Connected Search Service
 *
 * Core service for managing external data source integrations:
 * - OAuth token management
 * - Document indexing pipeline
 * - Incremental sync
 * - Unified search across sources
 *
 * Supports: Google Drive, Slack, GitHub, Confluence, Notion
 */

import { getDb } from '@/lib/db/connection';
import { embeddingService } from './EmbeddingService';
import {
  brainConnectedSources,
  brainExternalDocuments,
  brainExternalChunks,
  BrainConnectedSource,
  BrainExternalDocument,
  ConnectedProvider,
  SyncStatus,
} from '@/lib/db/schema-connected-intelligence';
import { eq, and, desc, sql, inArray, like, or } from 'drizzle-orm';
import crypto from 'crypto';

// ============================================
// TYPES
// ============================================

export interface ConnectedSourceConfig {
  provider: ConnectedProvider;
  displayName?: string;
  syncFolders?: string[];
  syncFileTypes?: string[];
  syncFrequency?: 'realtime' | 'hourly' | 'daily';
  maxDocuments?: number;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  scope?: string;
}

export interface DocumentMetadata {
  externalId: string;
  externalUrl?: string;
  externalPath?: string;
  title: string;
  content: string;
  mimeType?: string;
  fileSize?: number;
  authorName?: string;
  authorEmail?: string;
  createdAt?: Date;
  modifiedAt?: Date;
  permissions?: Record<string, unknown>;
}

export interface SyncResult {
  sourceId: string;
  provider: ConnectedProvider;
  documentsIndexed: number;
  documentsUpdated: number;
  documentsDeleted: number;
  errors: string[];
  duration: number;
}

export interface SearchOptions {
  providers?: ConnectedProvider[];
  limit?: number;
  includeContent?: boolean;
  fileTypes?: string[];
  dateFrom?: Date;
  dateTo?: Date;
}

export interface SearchResult {
  id: string;
  sourceId: string;
  provider: ConnectedProvider;
  title: string;
  excerpt: string;
  url?: string;
  path?: string;
  score: number;
  authorName?: string;
  modifiedAt?: Date;
  mimeType?: string;
}

// ============================================
// CONNECTED SEARCH SERVICE
// ============================================

export class ConnectedSearchService {
  private chunkSize = 1500;
  private chunkOverlap = 200;

  // ============================================
  // SOURCE MANAGEMENT
  // ============================================

  /**
   * Connect a new external data source
   */
  async connectSource(
    workspaceId: string,
    userId: string,
    config: ConnectedSourceConfig,
    tokens: OAuthTokens,
    providerAccountId?: string,
    providerEmail?: string
  ): Promise<BrainConnectedSource> {
    const db = getDb();

    const [source] = await db
      .insert(brainConnectedSources)
      .values({
        workspaceId,
        userId,
        provider: config.provider,
        providerAccountId,
        providerEmail,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiry: tokens.expiresAt,
        tokenScope: tokens.scope,
        config: {
          syncFrequency: config.syncFrequency || 'hourly',
          maxDocuments: config.maxDocuments || 10000,
        },
        syncFolders: config.syncFolders || [],
        syncFileTypes: config.syncFileTypes || [],
        displayName: config.displayName || config.provider,
        syncStatus: 'pending',
      })
      .returning();

    console.log(`[CONNECTED_SEARCH] Source connected: ${config.provider} for user ${userId}`);

    return source;
  }

  /**
   * Get all connected sources for a workspace
   */
  async getSources(
    workspaceId: string,
    userId?: string
  ): Promise<BrainConnectedSource[]> {
    const db = getDb();

    const conditions = [eq(brainConnectedSources.workspaceId, workspaceId)];
    if (userId) {
      conditions.push(eq(brainConnectedSources.userId, userId));
    }

    return db
      .select()
      .from(brainConnectedSources)
      .where(and(...conditions))
      .orderBy(desc(brainConnectedSources.createdAt));
  }

  /**
   * Get a single source by ID
   */
  async getSource(sourceId: string): Promise<BrainConnectedSource | null> {
    const db = getDb();

    const [source] = await db
      .select()
      .from(brainConnectedSources)
      .where(eq(brainConnectedSources.id, sourceId))
      .limit(1);

    return source || null;
  }

  /**
   * Update OAuth tokens for a source
   */
  async updateTokens(
    sourceId: string,
    tokens: OAuthTokens
  ): Promise<void> {
    const db = getDb();

    await db
      .update(brainConnectedSources)
      .set({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken || undefined,
        tokenExpiry: tokens.expiresAt || undefined,
        tokenScope: tokens.scope || undefined,
        updatedAt: new Date(),
      })
      .where(eq(brainConnectedSources.id, sourceId));

    console.log(`[CONNECTED_SEARCH] Tokens updated for source: ${sourceId}`);
  }

  /**
   * Disconnect a source
   */
  async disconnectSource(sourceId: string): Promise<void> {
    const db = getDb();

    // Documents are cascade deleted via FK constraint
    await db
      .delete(brainConnectedSources)
      .where(eq(brainConnectedSources.id, sourceId));

    console.log(`[CONNECTED_SEARCH] Source disconnected: ${sourceId}`);
  }

  /**
   * Update sync status
   */
  async updateSyncStatus(
    sourceId: string,
    status: SyncStatus,
    error?: string
  ): Promise<void> {
    const db = getDb();

    await db
      .update(brainConnectedSources)
      .set({
        syncStatus: status,
        lastSyncAt: status === 'completed' ? new Date() : undefined,
        lastSyncError: error || null,
        updatedAt: new Date(),
      })
      .where(eq(brainConnectedSources.id, sourceId));
  }

  // ============================================
  // DOCUMENT INDEXING
  // ============================================

  /**
   * Index documents from a connected source
   */
  async indexDocuments(
    sourceId: string,
    documents: DocumentMetadata[]
  ): Promise<{ indexed: number; updated: number; errors: string[] }> {
    const db = getDb();
    const source = await this.getSource(sourceId);

    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    let indexed = 0;
    let updated = 0;
    const errors: string[] = [];

    console.log(`[CONNECTED_SEARCH] Indexing ${documents.length} documents from ${source.provider}`);

    for (const doc of documents) {
      try {
        const contentHash = this.hashContent(doc.content);

        // Check if document exists
        const [existing] = await db
          .select()
          .from(brainExternalDocuments)
          .where(
            and(
              eq(brainExternalDocuments.sourceId, sourceId),
              eq(brainExternalDocuments.externalId, doc.externalId)
            )
          )
          .limit(1);

        if (existing) {
          // Update if content changed
          if (existing.contentHash !== contentHash) {
            await this.updateDocument(existing.id, doc, contentHash);
            updated++;
          }
        } else {
          // Insert new document
          await this.insertDocument(sourceId, source.workspaceId, doc, contentHash);
          indexed++;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        errors.push(`Failed to index ${doc.title}: ${errorMessage}`);
        console.error(`[CONNECTED_SEARCH] Error indexing document:`, error);
      }
    }

    // Update documents indexed count
    await db
      .update(brainConnectedSources)
      .set({
        documentsIndexed: indexed + updated,
        updatedAt: new Date(),
      })
      .where(eq(brainConnectedSources.id, sourceId));

    console.log(`[CONNECTED_SEARCH] Indexing complete: ${indexed} new, ${updated} updated, ${errors.length} errors`);

    return { indexed, updated, errors };
  }

  /**
   * Insert a new document with embeddings
   */
  private async insertDocument(
    sourceId: string,
    workspaceId: string,
    doc: DocumentMetadata,
    contentHash: string
  ): Promise<void> {
    const db = getDb();

    // Create document embedding
    const embedding = await embeddingService.generateEmbedding(doc.content);

    // Insert document
    const [newDoc] = await db
      .insert(brainExternalDocuments)
      .values({
        sourceId,
        workspaceId,
        externalId: doc.externalId,
        externalUrl: doc.externalUrl,
        externalPath: doc.externalPath,
        title: doc.title,
        content: doc.content,
        contentHash,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        sourceMetadata: {},
        authorName: doc.authorName,
        authorEmail: doc.authorEmail,
        permissions: doc.permissions || {},
        sourceCreatedAt: doc.createdAt,
        sourceModifiedAt: doc.modifiedAt,
        indexStatus: 'indexed',
      })
      .returning();

    // Chunk content for RAG
    const chunks = this.chunkText(doc.content);

    for (let i = 0; i < chunks.length; i++) {
      const chunkEmbedding = await embeddingService.generateEmbedding(chunks[i]);

      await db.insert(brainExternalChunks).values({
        documentId: newDoc.id,
        chunkIndex: i,
        content: chunks[i],
        tokenCount: Math.ceil(chunks[i].length / 4),
        metadata: {},
      });

      // Store embedding in a separate update (pgvector)
      await db.execute(sql`
        UPDATE brain_external_chunks
        SET embedding = ${JSON.stringify(chunkEmbedding.embedding)}::vector
        WHERE id = (
          SELECT id FROM brain_external_chunks
          WHERE document_id = ${newDoc.id} AND chunk_index = ${i}
          LIMIT 1
        )
      `);
    }

    // Update document embedding
    await db.execute(sql`
      UPDATE brain_external_documents
      SET embedding = ${JSON.stringify(embedding.embedding)}::vector,
          chunk_count = ${chunks.length}
      WHERE id = ${newDoc.id}
    `);
  }

  /**
   * Update an existing document
   */
  private async updateDocument(
    documentId: string,
    doc: DocumentMetadata,
    contentHash: string
  ): Promise<void> {
    const db = getDb();

    // Delete old chunks
    await db
      .delete(brainExternalChunks)
      .where(eq(brainExternalChunks.documentId, documentId));

    // Create new embedding
    const embedding = await embeddingService.generateEmbedding(doc.content);

    // Update document
    await db
      .update(brainExternalDocuments)
      .set({
        title: doc.title,
        content: doc.content,
        contentHash,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        authorName: doc.authorName,
        authorEmail: doc.authorEmail,
        sourceModifiedAt: doc.modifiedAt,
        indexStatus: 'indexed',
        lastCheckedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(brainExternalDocuments.id, documentId));

    // Re-chunk and embed
    const chunks = this.chunkText(doc.content);

    for (let i = 0; i < chunks.length; i++) {
      const chunkEmbedding = await embeddingService.generateEmbedding(chunks[i]);

      await db.insert(brainExternalChunks).values({
        documentId,
        chunkIndex: i,
        content: chunks[i],
        tokenCount: Math.ceil(chunks[i].length / 4),
        metadata: {},
      });

      await db.execute(sql`
        UPDATE brain_external_chunks
        SET embedding = ${JSON.stringify(chunkEmbedding.embedding)}::vector
        WHERE document_id = ${documentId} AND chunk_index = ${i}
      `);
    }

    // Update document embedding
    await db.execute(sql`
      UPDATE brain_external_documents
      SET embedding = ${JSON.stringify(embedding.embedding)}::vector,
          chunk_count = ${chunks.length}
      WHERE id = ${documentId}
    `);
  }

  // ============================================
  // SEARCH
  // ============================================

  /**
   * Search across all connected sources
   */
  async search(
    workspaceId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const db = getDb();
    const limit = options.limit || 20;

    // Create query embedding
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    // Build dynamic SQL for vector search
    let searchQuery = sql`
      SELECT
        ed.id,
        ed.source_id,
        cs.provider,
        ed.title,
        ed.content,
        ed.external_url,
        ed.external_path,
        ed.author_name,
        ed.source_modified_at,
        ed.mime_type,
        1 - (ed.embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector) as similarity
      FROM brain_external_documents ed
      JOIN brain_connected_sources cs ON ed.source_id = cs.id
      WHERE ed.workspace_id = ${workspaceId}
        AND ed.is_deleted = false
        AND ed.index_status = 'indexed'
        AND cs.is_active = true
    `;

    // Add provider filter
    if (options.providers && options.providers.length > 0) {
      searchQuery = sql`${searchQuery} AND cs.provider = ANY(${options.providers})`;
    }

    // Add file type filter
    if (options.fileTypes && options.fileTypes.length > 0) {
      searchQuery = sql`${searchQuery} AND ed.mime_type = ANY(${options.fileTypes})`;
    }

    // Add date filters
    if (options.dateFrom) {
      searchQuery = sql`${searchQuery} AND ed.source_modified_at >= ${options.dateFrom}`;
    }
    if (options.dateTo) {
      searchQuery = sql`${searchQuery} AND ed.source_modified_at <= ${options.dateTo}`;
    }

    // Order by similarity and limit
    searchQuery = sql`${searchQuery}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    const results = await db.execute(searchQuery);

    return (results.rows as unknown[]).map((row: unknown) => {
      const r = row as {
        id: string;
        source_id: string;
        provider: ConnectedProvider;
        title: string;
        content: string;
        external_url: string;
        external_path: string;
        author_name: string;
        source_modified_at: Date;
        mime_type: string;
        similarity: number;
      };
      return {
        id: r.id,
        sourceId: r.source_id,
        provider: r.provider,
        title: r.title,
        excerpt: this.createExcerpt(r.content, query),
        url: r.external_url,
        path: r.external_path,
        authorName: r.author_name,
        modifiedAt: r.source_modified_at,
        mimeType: r.mime_type,
        score: r.similarity,
      };
    });
  }

  /**
   * Search within document chunks for more precise RAG
   */
  async searchChunks(
    workspaceId: string,
    query: string,
    limit = 10
  ): Promise<{ content: string; documentTitle: string; score: number }[]> {
    const db = getDb();
    const queryEmbedding = await embeddingService.generateEmbedding(query);

    const results = await db.execute(sql`
      SELECT
        ec.content,
        ed.title as document_title,
        1 - (ec.embedding <=> ${JSON.stringify(queryEmbedding.embedding)}::vector) as similarity
      FROM brain_external_chunks ec
      JOIN brain_external_documents ed ON ec.document_id = ed.id
      JOIN brain_connected_sources cs ON ed.source_id = cs.id
      WHERE ed.workspace_id = ${workspaceId}
        AND ed.is_deleted = false
        AND cs.is_active = true
      ORDER BY similarity DESC
      LIMIT ${limit}
    `);

    return (results.rows as unknown[]).map((row: unknown) => {
      const r = row as { content: string; document_title: string; similarity: number };
      return {
        content: r.content,
        documentTitle: r.document_title,
        score: r.similarity,
      };
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  /**
   * Hash content for change detection
   */
  private hashContent(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Chunk text for embedding
   */
  private chunkText(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > this.chunkSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          // Keep overlap
          const words = currentChunk.split(' ');
          const overlapWords = words.slice(-Math.floor(this.chunkOverlap / 5));
          currentChunk = overlapWords.join(' ') + ' ' + sentence;
        } else {
          currentChunk = sentence;
        }
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [text];
  }

  /**
   * Create search excerpt highlighting query terms
   */
  private createExcerpt(content: string, query: string, maxLength = 200): string {
    const queryTerms = query.toLowerCase().split(/\s+/);
    const contentLower = content.toLowerCase();

    // Find position of first query term
    let startPos = 0;
    for (const term of queryTerms) {
      const pos = contentLower.indexOf(term);
      if (pos !== -1) {
        startPos = Math.max(0, pos - 50);
        break;
      }
    }

    let excerpt = content.substring(startPos, startPos + maxLength);

    // Add ellipsis
    if (startPos > 0) excerpt = '...' + excerpt;
    if (startPos + maxLength < content.length) excerpt += '...';

    return excerpt;
  }

  /**
   * Get sync statistics for a workspace
   */
  async getSyncStats(workspaceId: string): Promise<{
    totalSources: number;
    activeSources: number;
    totalDocuments: number;
    lastSyncAt: Date | null;
    byProvider: Record<ConnectedProvider, number>;
  }> {
    const db = getDb();

    // Get sources
    const sources = await db
      .select()
      .from(brainConnectedSources)
      .where(eq(brainConnectedSources.workspaceId, workspaceId));

    // Get document counts by provider
    const docCounts = await db.execute(sql`
      SELECT cs.provider, COUNT(ed.id) as count
      FROM brain_connected_sources cs
      LEFT JOIN brain_external_documents ed ON cs.id = ed.source_id AND ed.is_deleted = false
      WHERE cs.workspace_id = ${workspaceId}
      GROUP BY cs.provider
    `);

    const byProvider: Record<ConnectedProvider, number> = {} as Record<ConnectedProvider, number>;
    for (const row of docCounts.rows as { provider: ConnectedProvider; count: string }[]) {
      byProvider[row.provider] = Number(row.count);
    }

    const lastSync = sources
      .filter(s => s.lastSyncAt)
      .sort((a, b) => (b.lastSyncAt?.getTime() || 0) - (a.lastSyncAt?.getTime() || 0))[0];

    const totalDocuments = Object.values(byProvider).reduce((a: number, b: number) => a + b, 0);

    return {
      totalSources: sources.length,
      activeSources: sources.filter(s => s.isActive).length,
      totalDocuments,
      lastSyncAt: lastSync?.lastSyncAt || null,
      byProvider,
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const connectedSearchService = new ConnectedSearchService();
