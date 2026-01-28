/**
 * Enhanced RAG Pipeline - Advanced Retrieval-Augmented Generation
 *
 * Features:
 * - Hybrid Search (Semantic + Keyword)
 * - Cross-Encoder Re-Ranking
 * - Query Expansion
 * - Chunk Fusion
 * - Source Attribution
 * - Confidence Scoring
 */

import { modelRouter, GenerationResult, RouterOptions } from './ModelRouter';
import { embeddingService } from './EmbeddingService';
import { brainDbService, SearchResult } from './BrainDatabaseService';
import { reRankingService } from './ReRankingService';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface RAGConfig {
  retrieval: {
    strategy: 'hybrid' | 'semantic' | 'keyword';
    topK: number;
    minRelevance: number;
    useReranking: boolean;
    expandQuery: boolean;
    filterDocumentIds?: string[]; // Only search within these document IDs (for focused chat)
  };
  generation: {
    model?: string;
    temperature: number;
    maxTokens: number;
    includeSourcesInPrompt: boolean;
    streamResponse: boolean;
  };
  fusion: {
    enabled: boolean;
    maxChunksPerSource: number;
    overlapThreshold: number;
  };
}

export interface RAGSource {
  id: string;
  title: string;
  excerpt: string;
  relevance: number;
  sourceType: 'document' | 'meeting' | 'email' | 'external' | 'idea';
  metadata?: Record<string, unknown>;
}

export interface RAGResponse {
  answer: string;
  confidence: 'low' | 'medium' | 'high' | 'critical';
  confidenceScore: number;
  sources: RAGSource[];
  tokensUsed: number;
  latencyMs: number;
  model: string;
  reasoning?: string;
  followUpQuestions?: string[];
}

export interface QueryExpansion {
  original: string;
  expanded: string[];
  synonyms: string[];
  entities: string[];
}

// ============================================
// DEFAULT CONFIGURATION
// ============================================

const DEFAULT_CONFIG: RAGConfig = {
  retrieval: {
    strategy: 'hybrid',
    topK: 10,
    minRelevance: 0.3,
    useReranking: true,
    expandQuery: true
  },
  generation: {
    temperature: 0.7,
    maxTokens: 2000,
    includeSourcesInPrompt: true,
    streamResponse: false
  },
  fusion: {
    enabled: true,
    maxChunksPerSource: 3,
    overlapThreshold: 0.7
  }
};

// ============================================
// ENHANCED RAG SERVICE
// ============================================

export class EnhancedRAGService {
  private static instance: EnhancedRAGService;
  private config: RAGConfig;

  private constructor(config?: Partial<RAGConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[EnhancedRAG] Initialized with config:', this.config);
  }

  public static getInstance(config?: Partial<RAGConfig>): EnhancedRAGService {
    if (!EnhancedRAGService.instance) {
      EnhancedRAGService.instance = new EnhancedRAGService(config);
    }
    return EnhancedRAGService.instance;
  }

  /**
   * Main RAG query method
   */
  public async query(
    question: string,
    workspaceId: string,
    userId?: string,
    options?: Partial<RAGConfig>
  ): Promise<RAGResponse> {
    const startTime = Date.now();
    const config = { ...this.config, ...options };

    try {
      // Step 1: Query Expansion
      let expandedQueries: string[] = [question];
      if (config.retrieval.expandQuery) {
        const expansion = await this.expandQuery(question);
        expandedQueries = [question, ...expansion.expanded];
      }

      // Step 2: Retrieve Documents
      const allResults: SearchResult[] = [];
      for (const query of expandedQueries.slice(0, 3)) {
        const results = await this.retrieve(query, workspaceId, config);
        allResults.push(...results);
      }

      // Step 3: Deduplicate and Re-rank
      const uniqueResults = this.deduplicateResults(allResults);
      let rankedResults: SearchResult[];

      if (config.retrieval.useReranking && uniqueResults.length > 0) {
        rankedResults = await this.rerankResults(question, uniqueResults, userId);
      } else {
        rankedResults = uniqueResults.slice(0, config.retrieval.topK);
      }

      // Step 4: Chunk Fusion
      let fusedContext: string;
      if (config.fusion.enabled) {
        fusedContext = this.fuseChunks(rankedResults, config);
      } else {
        fusedContext = rankedResults
          .map(r => `### ${r.title}\n${r.content}`)
          .join('\n\n---\n\n');
      }

      // Step 5: Generate Answer
      const response = await this.generateAnswer(
        question,
        fusedContext,
        rankedResults,
        config
      );

      // Step 6: Calculate Confidence
      const confidenceScore = this.calculateConfidence(rankedResults, response);
      const confidence = this.scoreToLevel(confidenceScore);

      // Step 7: Generate Follow-up Questions
      const followUpQuestions = await this.generateFollowUps(
        question,
        response.content,
        rankedResults
      );

      const latencyMs = Date.now() - startTime;

      return {
        answer: response.content,
        confidence,
        confidenceScore,
        sources: rankedResults.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          excerpt: r.content.slice(0, 200) + '...',
          relevance: r.similarity,
          sourceType: this.determineSourceType(r),
          metadata: r.metadata as Record<string, unknown>
        })),
        tokensUsed: response.tokensUsed.total,
        latencyMs,
        model: response.model,
        followUpQuestions
      };
    } catch (error) {
      console.error('[EnhancedRAG] Query error:', error);

      return {
        answer: 'Es gab einen Fehler bei der Verarbeitung deiner Anfrage. Bitte versuche es erneut.',
        confidence: 'low',
        confidenceScore: 0,
        sources: [],
        tokensUsed: 0,
        latencyMs: Date.now() - startTime,
        model: 'error'
      };
    }
  }

  /**
   * Stream RAG response
   */
  public async *queryStream(
    question: string,
    workspaceId: string,
    userId?: string,
    options?: Partial<RAGConfig>
  ): AsyncGenerator<{ type: 'chunk' | 'sources' | 'done'; data: unknown }> {
    const startTime = Date.now();
    const config = { ...this.config, ...options };

    try {
      // Retrieve and rank
      const results = await this.retrieve(question, workspaceId, config);
      const rankedResults = config.retrieval.useReranking
        ? await this.rerankResults(question, results, userId)
        : results;

      // Yield sources first
      yield {
        type: 'sources',
        data: rankedResults.slice(0, 5).map(r => ({
          id: r.id,
          title: r.title,
          relevance: r.similarity
        }))
      };

      // Fuse context
      const fusedContext = this.fuseChunks(rankedResults, config);

      // Build prompt
      const prompt = this.buildPrompt(question, fusedContext, rankedResults);

      // Stream generation
      const stream = modelRouter.generateStream(
        this.getSystemPrompt(),
        prompt,
        { preferQuality: true }
      );

      let fullContent = '';
      for await (const chunk of stream) {
        if (typeof chunk === 'string') {
          fullContent += chunk;
          yield { type: 'chunk', data: chunk };
        }
      }

      // Final result
      yield {
        type: 'done',
        data: {
          confidence: this.scoreToLevel(this.calculateConfidence(rankedResults, { content: fullContent } as GenerationResult)),
          latencyMs: Date.now() - startTime
        }
      };
    } catch (error) {
      console.error('[EnhancedRAG] Stream error:', error);
      yield { type: 'chunk', data: 'Fehler bei der Verarbeitung.' };
      yield { type: 'done', data: { confidence: 'low', latencyMs: Date.now() - startTime } };
    }
  }

  // ============================================
  // RETRIEVAL METHODS
  // ============================================

  private async retrieve(
    query: string,
    workspaceId: string,
    config: RAGConfig
  ): Promise<SearchResult[]> {
    const strategy = config.retrieval.strategy;
    const limit = config.retrieval.topK * 2; // Fetch more for re-ranking
    const filterIds = config.retrieval.filterDocumentIds;

    let queryEmbedding: number[] | undefined;

    if (strategy !== 'keyword') {
      try {
        const embResult = await embeddingService.generateEmbedding(query);
        queryEmbedding = embResult.embedding;
      } catch (err) {
        console.warn('[EnhancedRAG] Embedding failed, falling back to keyword search:', err);
      }
    }

    let results: SearchResult[];

    if (strategy === 'hybrid' || (strategy === 'semantic' && queryEmbedding)) {
      results = await brainDbService.hybridSearch(workspaceId, query, queryEmbedding, limit, filterIds);
    } else {
      results = await brainDbService.fulltextSearch(workspaceId, query, limit, filterIds);
    }

    // Additional filter for document IDs if provided (safety check)
    if (filterIds && filterIds.length > 0) {
      const filterSet = new Set(filterIds);
      results = results.filter(r => filterSet.has(r.id));
      console.log(`[EnhancedRAG] Filtered to ${results.length} results from ${filterIds.length} allowed documents`);
    }

    return results;
  }

  private async rerankResults(
    query: string,
    results: SearchResult[],
    userId?: string
  ): Promise<SearchResult[]> {
    if (results.length === 0) return [];

    try {
      const ranked = await reRankingService.rerank(query, results, userId, {
        strategy: 'hybrid',
        maxResults: this.config.retrieval.topK,
        recencyWeight: 0.15,
        diversityWeight: 0.1
      });

      return ranked.map(r => ({
        ...r,
        similarity: r.finalScore
      }));
    } catch (error) {
      console.warn('[EnhancedRAG] Re-ranking failed:', error);
      return results.slice(0, this.config.retrieval.topK);
    }
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Map<string, SearchResult>();

    for (const result of results) {
      const existing = seen.get(result.id);
      if (!existing || result.similarity > existing.similarity) {
        seen.set(result.id, result);
      }
    }

    return Array.from(seen.values())
      .sort((a, b) => b.similarity - a.similarity);
  }

  // ============================================
  // QUERY EXPANSION
  // ============================================

  private async expandQuery(query: string): Promise<QueryExpansion> {
    try {
      const result = await modelRouter.generate(
        `You are a query expansion expert. Given a search query, generate:
1. 2-3 alternative phrasings
2. Key synonyms
3. Named entities

Respond in JSON format:
{
  "expanded": ["alt1", "alt2"],
  "synonyms": ["syn1", "syn2"],
  "entities": ["entity1"]
}`,
        `Query: "${query}"`,
        { preferSpeed: true, forceModel: 'gemini-flash' }
      );

      try {
        const jsonMatch = result.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            original: query,
            expanded: parsed.expanded || [],
            synonyms: parsed.synonyms || [],
            entities: parsed.entities || []
          };
        }
      } catch {
        // Parse failed
      }
    } catch (error) {
      console.warn('[EnhancedRAG] Query expansion failed:', error);
    }

    return {
      original: query,
      expanded: [],
      synonyms: [],
      entities: []
    };
  }

  // ============================================
  // CHUNK FUSION
  // ============================================

  private fuseChunks(results: SearchResult[], config: RAGConfig): string {
    if (results.length === 0) return '';

    // Group by source/parent document
    const bySource = new Map<string, SearchResult[]>();

    for (const result of results) {
      const sourceId = (result.metadata as Record<string, unknown>)?.parentDocumentId as string || result.id;

      if (!bySource.has(sourceId)) {
        bySource.set(sourceId, []);
      }
      bySource.get(sourceId)!.push(result);
    }

    // Take top chunks from each source
    const fusedChunks: string[] = [];

    for (const [_sourceId, chunks] of bySource) {
      const topChunks = chunks
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, config.fusion.maxChunksPerSource);

      // Sort by position if available
      topChunks.sort((a, b) => {
        const posA = (a.metadata as Record<string, unknown>)?.chunkIndex as number || 0;
        const posB = (b.metadata as Record<string, unknown>)?.chunkIndex as number || 0;
        return posA - posB;
      });

      // Merge adjacent chunks
      const mergedContent = topChunks.map(c => c.content).join('\n\n');

      fusedChunks.push(`### ${topChunks[0].title}\n${mergedContent}`);
    }

    return fusedChunks.join('\n\n---\n\n');
  }

  // ============================================
  // GENERATION
  // ============================================

  private async generateAnswer(
    question: string,
    context: string,
    sources: SearchResult[],
    config: RAGConfig
  ): Promise<GenerationResult> {
    const prompt = this.buildPrompt(question, context, sources);
    const systemPrompt = this.getSystemPrompt();

    const routerOptions: RouterOptions = {
      preferQuality: sources.some(s => s.similarity > 0.7),
      preferSpeed: sources.every(s => s.similarity < 0.5)
    };

    if (config.generation.model) {
      routerOptions.forceModel = config.generation.model;
    }

    return modelRouter.generate(systemPrompt, prompt, routerOptions);
  }

  private getSystemPrompt(): string {
    return `Du bist ein intelligenter Wissensassistent für Unternehmen. Deine Aufgabe ist es, Fragen basierend auf dem bereitgestellten Kontext präzise zu beantworten.

REGELN:
1. Antworte NUR basierend auf dem Kontext. Wenn der Kontext nicht ausreicht, sage das ehrlich.
2. Zitiere relevante Quellen in deiner Antwort mit [Quelle: Titel].
3. Strukturiere komplexe Antworten mit Überschriften und Aufzählungen.
4. Bleibe faktisch und professionell.
5. Wenn Informationen widersprüchlich sind, weise darauf hin.
6. Antworte in der Sprache der Frage (Deutsch/Englisch).`;
  }

  private buildPrompt(
    question: string,
    context: string,
    sources: SearchResult[]
  ): string {
    const sourceList = sources
      .slice(0, 5)
      .map((s, i) => `[${i + 1}] ${s.title} (Relevanz: ${Math.round(s.similarity * 100)}%)`)
      .join('\n');

    return `KONTEXT AUS DER WISSENSBASIS:

${context || 'Kein relevanter Kontext gefunden.'}

---

VERFÜGBARE QUELLEN:
${sourceList || 'Keine Quellen'}

---

FRAGE: ${question}

Beantworte die Frage basierend auf dem obigen Kontext. Verweise auf Quellen in eckigen Klammern.`;
  }

  // ============================================
  // CONFIDENCE SCORING
  // ============================================

  private calculateConfidence(sources: SearchResult[], response: GenerationResult): number {
    if (sources.length === 0) return 0;

    // Factor 1: Average relevance of top sources
    const topSources = sources.slice(0, 5);
    const avgRelevance = topSources.reduce((sum, s) => sum + s.similarity, 0) / topSources.length;

    // Factor 2: Number of high-relevance sources
    const highRelevanceCount = sources.filter(s => s.similarity > 0.7).length;
    const sourceQuality = Math.min(1, highRelevanceCount / 3);

    // Factor 3: Response length (longer = more detailed = higher confidence if sources good)
    const responseLengthFactor = Math.min(1, response.content.length / 500);

    // Factor 4: Model quality
    const modelFactor = response.model.includes('gpt-4') ? 1.0 : 0.8;

    // Weighted combination
    const confidence =
      avgRelevance * 0.4 +
      sourceQuality * 0.3 +
      responseLengthFactor * 0.15 +
      modelFactor * 0.15;

    return Math.min(1, confidence);
  }

  private scoreToLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
    if (score >= 0.85) return 'critical';
    if (score >= 0.7) return 'high';
    if (score >= 0.4) return 'medium';
    return 'low';
  }

  // ============================================
  // FOLLOW-UP QUESTIONS
  // ============================================

  private async generateFollowUps(
    question: string,
    answer: string,
    sources: SearchResult[]
  ): Promise<string[]> {
    try {
      const result = await modelRouter.generate(
        'Generate 2-3 relevant follow-up questions based on the Q&A. Respond with a JSON array of strings.',
        `Question: ${question}\n\nAnswer: ${answer}\n\nTopics covered: ${sources.map(s => s.title).join(', ')}`,
        { preferSpeed: true, forceModel: 'gemini-flash' }
      );

      try {
        const jsonMatch = result.content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]).slice(0, 3);
        }
      } catch {
        // Parse failed
      }
    } catch (error) {
      console.warn('[EnhancedRAG] Follow-up generation failed:', error);
    }

    return [];
  }

  // ============================================
  // HELPERS
  // ============================================

  private determineSourceType(result: SearchResult): RAGSource['sourceType'] {
    const metadata = result.metadata as Record<string, unknown>;

    if (metadata?.sourceType === 'meeting') return 'meeting';
    if (metadata?.sourceType === 'email') return 'email';
    if (metadata?.isExternal) return 'external';
    if (result.title.toLowerCase().includes('idee') || result.title.toLowerCase().includes('idea')) return 'idea';

    return 'document';
  }

  /**
   * Update configuration
   */
  public updateConfig(config: Partial<RAGConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  public getConfig(): RAGConfig {
    return { ...this.config };
  }
}

export const enhancedRAG = EnhancedRAGService.getInstance();
