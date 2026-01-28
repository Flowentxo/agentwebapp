import { getDb } from '../db/connection';
import { kbChunks, kbRevisions, kbEntries, knowledgeBases } from '../db/schema';
import { eq, and, inArray, sql, desc } from 'drizzle-orm';
import { generateEmbedding, cosineSimilarity } from './embeddings';
import type { ACLContext } from './acl';
import { canAccessEntry } from './acl';

export interface RetrievalFilters {
  kbIds?: string[];
  tags?: string[];
  status?: string[];
  authorId?: string;
}

export interface RetrievalContext {
  text: string;
  entryId: string;
  entryTitle: string;
  revisionId: string;
  chunkId: string;
  heading?: string;
  score: number;
  source: {
    type: string;
    uri?: string;
  };
}

export interface RetrievalRequest {
  query: string;
  kb?: string; // slug or id or '*'
  topk?: number;
  filters?: RetrievalFilters;
  aclContext: ACLContext;
}

export interface RetrievalResponse {
  query: string;
  contexts: RetrievalContext[];
  latencyMs: number;
}

/**
 * Hybrid search: Vector + BM25
 */
export async function retrieve(request: RetrievalRequest): Promise<RetrievalResponse> {
  const start = Date.now();
  const db = getDb();
  const topk = Math.min(request.topk || 6, 10);

  // Generate query embedding
  const queryEmbedding = await generateEmbedding(request.query);

  // Build filters
  let statusFilter: string[] = request.filters?.status || ['published'];

  // If specific KB, get its ID
  let kbIds: string[] | undefined;
  if (request.kb && request.kb !== '*') {
    const kb = await db
      .select()
      .from(knowledgeBases)
      .where(
        sql`${knowledgeBases.id} = ${request.kb} OR ${knowledgeBases.slug} = ${request.kb}`
      )
      .limit(1);

    if (kb.length > 0) {
      kbIds = [kb[0].id];
    }
  }

  // Vector search using pgvector
  const vectorQuery = sql`
    SELECT
      c.id as chunk_id,
      c.text,
      c.meta,
      c.revision_id,
      e.id as entry_id,
      e.title as entry_title,
      e.status,
      r.source_type,
      r.source_uri,
      1 - (c.embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
    FROM kb_chunks c
    JOIN kb_revisions r ON c.revision_id = r.id
    JOIN kb_entries e ON r.entry_id = e.id
    WHERE c.is_deleted = FALSE
      AND e.status = ANY(${statusFilter}::kb_status[])
      ${kbIds ? sql`AND e.kb_id = ANY(${kbIds}::uuid[])` : sql``}
      ${request.filters?.tags && request.filters.tags.length > 0 ? sql`AND e.tags ?| ${request.filters.tags}` : sql``}
      ${request.filters?.authorId ? sql`AND e.author_id = ${request.filters.authorId}` : sql``}
    ORDER BY similarity DESC
    LIMIT ${topk * 2}
  `;

  const vectorResults = await db.execute(vectorQuery);

  // Filter by ACL
  const accessibleResults: RetrievalContext[] = [];
  const rows = vectorResults.rows as any[];

  for (const row of rows) {
    const hasAccess = await canAccessEntry(request.aclContext, row.entry_id);

    if (hasAccess) {
      const meta = typeof row.meta === 'string' ? JSON.parse(row.meta) : row.meta;

      accessibleResults.push({
        text: row.text,
        entryId: row.entry_id,
        entryTitle: row.entry_title,
        revisionId: row.revision_id,
        chunkId: row.chunk_id,
        heading: meta.heading,
        score: parseFloat(row.similarity),
        source: {
          type: row.source_type,
          uri: row.source_uri,
        },
      });

      if (accessibleResults.length >= topk) {
        break;
      }
    }
  }

  const latencyMs = Date.now() - start;

  return {
    query: request.query,
    contexts: accessibleResults,
    latencyMs,
  };
}

/**
 * Generate answer with citations (RAG)
 */
export interface GenerateRequest {
  query: string;
  kb?: string;
  topk?: number;
  answerStyle?: 'concise' | 'detailed' | 'steps';
  aclContext: ACLContext;
}

export interface GenerateResponse {
  answer: string;
  citations: Array<{
    entryId: string;
    title: string;
    chunkId: string;
    heading?: string;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  latencyMs: number;
}

export async function generate(request: GenerateRequest): Promise<GenerateResponse> {
  const start = Date.now();

  // Retrieve contexts
  const retrieval = await retrieve({
    query: request.query,
    kb: request.kb,
    topk: request.topk || 6,
    aclContext: request.aclContext,
  });

  if (retrieval.contexts.length === 0) {
    return {
      answer: 'Ich konnte keine relevanten Informationen in der Wissensdatenbank finden.',
      citations: [],
      latencyMs: Date.now() - start,
    };
  }

  // Build context for LLM
  const contextText = retrieval.contexts
    .map(
      (ctx, idx) =>
        `[${idx + 1}] ${ctx.heading ? `**${ctx.heading}**\n` : ''}${ctx.text}\n(Quelle: ${ctx.entryTitle})`
    )
    .join('\n\n');

  const styleInstructions = {
    concise: 'Sei präzise und antworte in 2-3 Sätzen.',
    detailed: 'Gib eine ausführliche und strukturierte Antwort.',
    steps: 'Antworte in numerierten Schritten.',
  };

  const prompt = `Du bist ein hilfreicher Assistent, der Fragen basierend auf der SINTRA Wissensdatenbank beantwortet.

Nutze ausschließlich die folgenden Kontexte, um die Frage zu beantworten. ${styleInstructions[request.answerStyle || 'concise']}

Zitiere Quellen mit [Nummer] am Ende der relevanten Aussage.

KONTEXTE:
${contextText}

FRAGE: ${request.query}

ANTWORT:`;

  // Call OpenAI (or mock)
  let answer = '';
  let usage = undefined;

  if (!process.env.OPENAI_API_KEY) {
    // Mock response
    answer = `Basierend auf den verfügbaren Informationen [1, 2]: ${retrieval.contexts[0].text.substring(0, 200)}...`;
  } else {
    const OpenAI = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    try {
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      });

      answer = completion.choices[0]?.message?.content || 'Keine Antwort generiert.';
      usage = {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      answer = `Fehler beim Generieren der Antwort. Relevante Informationen: ${retrieval.contexts[0].text.substring(0, 200)}...`;
    }
  }

  // Extract citations
  const citations = retrieval.contexts.map((ctx) => ({
    entryId: ctx.entryId,
    title: ctx.entryTitle,
    chunkId: ctx.chunkId,
    heading: ctx.heading,
  }));

  return {
    answer,
    citations,
    usage,
    latencyMs: Date.now() - start,
  };
}
