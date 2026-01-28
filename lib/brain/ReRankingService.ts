/**
 * Re-Ranking Service for Brain AI
 *
 * Implements multiple re-ranking strategies:
 * - Cross-encoder re-ranking (semantic similarity)
 * - BM25 lexical scoring
 * - Reciprocal Rank Fusion (RRF)
 * - Diversity re-ranking (MMR)
 * - Recency boosting
 * - User preference learning
 */

import { OpenAI } from 'openai';
import type { SearchResult } from './BrainDatabaseService';

// Re-export for convenience
export type { SearchResult };

export interface RankedResult extends SearchResult {
  originalRank: number;
  finalScore: number;
  rankingFactors: {
    semanticScore: number;
    lexicalScore: number;
    recencyScore: number;
    diversityScore: number;
    userPreferenceScore: number;
  };
}

interface ReRankingOptions {
  strategy: 'cross-encoder' | 'bm25' | 'rrf' | 'hybrid';
  maxResults: number;
  recencyWeight: number;       // 0-1
  diversityWeight: number;     // 0-1
  userPreferenceWeight: number; // 0-1
  diversityThreshold: number;  // MMR lambda
}

const DEFAULT_OPTIONS: ReRankingOptions = {
  strategy: 'hybrid',
  maxResults: 10,
  recencyWeight: 0.1,
  diversityWeight: 0.15,
  userPreferenceWeight: 0.1,
  diversityThreshold: 0.7,
};

export class ReRankingService {
  private openai: OpenAI | null = null;
  private userPreferences: Map<string, Map<string, number>> = new Map();

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Main re-ranking method
   */
  async rerank(
    query: string,
    results: SearchResult[],
    userId?: string,
    options: Partial<ReRankingOptions> = {}
  ): Promise<RankedResult[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    if (results.length === 0) return [];

    console.log(`[ReRankingService] Re-ranking ${results.length} results with strategy: ${opts.strategy}`);

    // 1. Calculate base scores based on strategy
    let rankedResults: RankedResult[];

    switch (opts.strategy) {
      case 'cross-encoder':
        rankedResults = await this.crossEncoderRerank(query, results);
        break;
      case 'bm25':
        rankedResults = this.bm25Rerank(query, results);
        break;
      case 'rrf':
        rankedResults = this.rrfRerank(query, results);
        break;
      case 'hybrid':
      default:
        rankedResults = await this.hybridRerank(query, results);
    }

    // 2. Apply recency boost
    if (opts.recencyWeight > 0) {
      rankedResults = this.applyRecencyBoost(rankedResults, opts.recencyWeight);
    }

    // 3. Apply diversity re-ranking (MMR)
    if (opts.diversityWeight > 0) {
      rankedResults = this.applyDiversityRerank(
        rankedResults,
        opts.diversityThreshold,
        opts.diversityWeight
      );
    }

    // 4. Apply user preference boost
    if (userId && opts.userPreferenceWeight > 0) {
      rankedResults = this.applyUserPreferences(
        rankedResults,
        userId,
        opts.userPreferenceWeight
      );
    }

    // 5. Calculate final scores and sort
    rankedResults = this.calculateFinalScores(rankedResults);

    // 6. Return top results
    return rankedResults.slice(0, opts.maxResults);
  }

  /**
   * Cross-encoder re-ranking using AI model
   * Most accurate but slowest
   */
  private async crossEncoderRerank(
    query: string,
    results: SearchResult[]
  ): Promise<RankedResult[]> {
    if (!this.openai || results.length === 0) {
      return this.convertToRankedResults(results);
    }

    try {
      // Use GPT to score relevance
      const scoringPrompt = `Rate the relevance of each document to the query on a scale of 0-100.
Query: "${query}"

Documents:
${results.map((r, i) => `[${i}] ${r.title}: ${r.content.slice(0, 200)}...`).join('\n\n')}

Return ONLY a JSON array of scores like: [85, 72, 45, ...]`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a relevance scoring system. Return only JSON.' },
          { role: 'user', content: scoringPrompt },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      const content = response.choices[0]?.message?.content || '[]';
      const scores: number[] = JSON.parse(content.match(/\[[\d,\s]+\]/)?.[0] || '[]');

      return results.map((result, index) => ({
        ...result,
        originalRank: index,
        finalScore: 0,
        rankingFactors: {
          semanticScore: (scores[index] || 50) / 100,
          lexicalScore: 0,
          recencyScore: 0,
          diversityScore: 0,
          userPreferenceScore: 0,
        },
      }));
    } catch (error) {
      console.error('[ReRankingService] Cross-encoder failed, falling back:', error);
      return this.convertToRankedResults(results);
    }
  }

  /**
   * BM25 lexical re-ranking
   * Fast and effective for keyword matching
   */
  private bm25Rerank(query: string, results: SearchResult[]): RankedResult[] {
    const k1 = 1.5; // Term frequency saturation
    const b = 0.75; // Length normalization

    // Calculate average document length
    const avgDl = results.reduce((sum, r) => sum + r.content.length, 0) / results.length;

    // Query terms
    const queryTerms = this.tokenize(query);

    // Calculate IDF for each query term
    const idf = new Map<string, number>();
    const N = results.length;

    for (const term of queryTerms) {
      const df = results.filter(r =>
        this.tokenize(r.content + ' ' + r.title).includes(term)
      ).length;
      idf.set(term, Math.log((N - df + 0.5) / (df + 0.5) + 1));
    }

    return results.map((result, index) => {
      const docTerms = this.tokenize(result.content + ' ' + result.title);
      const dl = result.content.length;

      let bm25Score = 0;
      for (const term of queryTerms) {
        const tf = docTerms.filter(t => t === term).length;
        const termIdf = idf.get(term) || 0;
        const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgDl)));
        bm25Score += termIdf * tfNorm;
      }

      // Normalize to 0-1 range
      const normalizedScore = Math.min(1, bm25Score / 10);

      return {
        ...result,
        originalRank: index,
        finalScore: 0,
        rankingFactors: {
          semanticScore: result.similarity,
          lexicalScore: normalizedScore,
          recencyScore: 0,
          diversityScore: 0,
          userPreferenceScore: 0,
        },
      };
    });
  }

  /**
   * Reciprocal Rank Fusion (RRF)
   * Combines multiple ranking signals
   */
  private rrfRerank(query: string, results: SearchResult[]): RankedResult[] {
    const k = 60; // RRF constant

    // Get BM25 rankings
    const bm25Ranked = this.bm25Rerank(query, results)
      .sort((a, b) => b.rankingFactors.lexicalScore - a.rankingFactors.lexicalScore);

    // Get semantic rankings (already sorted by similarity)
    const semanticRanked = [...results].sort((a, b) => b.similarity - a.similarity);

    // Calculate RRF scores
    const rrfScores = new Map<string, number>();

    bm25Ranked.forEach((result, rank) => {
      const score = 1 / (k + rank + 1);
      rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + score);
    });

    semanticRanked.forEach((result, rank) => {
      const score = 1 / (k + rank + 1);
      rrfScores.set(result.id, (rrfScores.get(result.id) || 0) + score);
    });

    return results.map((result, index) => ({
      ...result,
      originalRank: index,
      finalScore: 0,
      rankingFactors: {
        semanticScore: result.similarity,
        lexicalScore: bm25Ranked.find(r => r.id === result.id)?.rankingFactors.lexicalScore || 0,
        recencyScore: 0,
        diversityScore: 1, // RRF score used as diversity proxy
        userPreferenceScore: 0,
      },
    }));
  }

  /**
   * Hybrid re-ranking combining multiple signals
   */
  private async hybridRerank(
    query: string,
    results: SearchResult[]
  ): Promise<RankedResult[]> {
    // 1. Get BM25 scores
    const bm25Results = this.bm25Rerank(query, results);

    // 2. Combine with semantic scores
    return bm25Results.map(result => ({
      ...result,
      rankingFactors: {
        ...result.rankingFactors,
        // Hybrid score: 60% semantic + 40% lexical
        semanticScore: result.similarity * 0.6 + result.rankingFactors.lexicalScore * 0.4,
      },
    }));
  }

  /**
   * Apply recency boost
   */
  private applyRecencyBoost(
    results: RankedResult[],
    weight: number
  ): RankedResult[] {
    const now = Date.now();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    return results.map(result => {
      const updatedAt = result.updatedAt || result.createdAt;
      if (!updatedAt) {
        return {
          ...result,
          rankingFactors: { ...result.rankingFactors, recencyScore: 0.5 },
        };
      }

      const age = now - new Date(updatedAt).getTime();
      let recencyScore: number;

      if (age < oneWeek) {
        recencyScore = 1.0;
      } else if (age < oneMonth) {
        recencyScore = 0.8;
      } else if (age < oneMonth * 3) {
        recencyScore = 0.6;
      } else if (age < oneMonth * 12) {
        recencyScore = 0.4;
      } else {
        recencyScore = 0.2;
      }

      return {
        ...result,
        rankingFactors: {
          ...result.rankingFactors,
          recencyScore: recencyScore * weight,
        },
      };
    });
  }

  /**
   * Apply diversity re-ranking using Maximal Marginal Relevance (MMR)
   */
  private applyDiversityRerank(
    results: RankedResult[],
    lambda: number,
    weight: number
  ): RankedResult[] {
    if (results.length <= 1) return results;

    const selected: RankedResult[] = [];
    const remaining = [...results];

    // Always select the best result first
    selected.push(remaining.shift()!);

    while (remaining.length > 0 && selected.length < results.length) {
      let bestScore = -Infinity;
      let bestIndex = 0;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];

        // Calculate relevance score
        const relevance = candidate.rankingFactors.semanticScore;

        // Calculate max similarity to already selected documents
        const maxSimilarity = Math.max(
          ...selected.map(s => this.calculateTextSimilarity(candidate.content, s.content))
        );

        // MMR score: lambda * relevance - (1 - lambda) * maxSimilarity
        const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;

        if (mmrScore > bestScore) {
          bestScore = mmrScore;
          bestIndex = i;
        }
      }

      const selected_item = remaining.splice(bestIndex, 1)[0];
      selected_item.rankingFactors.diversityScore = weight * (1 - Math.max(
        ...selected.slice(0, -1).map(s =>
          this.calculateTextSimilarity(selected_item.content, s.content)
        ),
        0
      ));
      selected.push(selected_item);
    }

    return selected;
  }

  /**
   * Apply user preference learning
   */
  private applyUserPreferences(
    results: RankedResult[],
    userId: string,
    weight: number
  ): RankedResult[] {
    const preferences = this.userPreferences.get(userId);

    if (!preferences || preferences.size === 0) {
      return results;
    }

    return results.map(result => {
      let preferenceScore = 0;
      let matchCount = 0;

      // Check if result matches user's preferred topics/keywords
      const resultTerms = this.tokenize(result.title + ' ' + result.content);

      for (const [term, score] of preferences.entries()) {
        if (resultTerms.includes(term)) {
          preferenceScore += score;
          matchCount++;
        }
      }

      const normalizedScore = matchCount > 0 ? preferenceScore / matchCount : 0;

      return {
        ...result,
        rankingFactors: {
          ...result.rankingFactors,
          userPreferenceScore: normalizedScore * weight,
        },
      };
    });
  }

  /**
   * Calculate final scores and sort
   */
  private calculateFinalScores(results: RankedResult[]): RankedResult[] {
    return results
      .map(result => {
        const { rankingFactors } = result;

        // Weighted combination of all factors
        const finalScore =
          rankingFactors.semanticScore * 0.5 +
          rankingFactors.lexicalScore * 0.2 +
          rankingFactors.recencyScore * 0.1 +
          rankingFactors.diversityScore * 0.1 +
          rankingFactors.userPreferenceScore * 0.1;

        return {
          ...result,
          finalScore: Math.min(1, Math.max(0, finalScore)),
        };
      })
      .sort((a, b) => b.finalScore - a.finalScore);
  }

  /**
   * Record user interaction for preference learning
   */
  recordUserInteraction(
    userId: string,
    resultId: string,
    content: string,
    interactionType: 'click' | 'bookmark' | 'copy' | 'share'
  ): void {
    const weights = {
      click: 0.1,
      bookmark: 0.5,
      copy: 0.3,
      share: 0.4,
    };

    if (!this.userPreferences.has(userId)) {
      this.userPreferences.set(userId, new Map());
    }

    const preferences = this.userPreferences.get(userId)!;
    const terms = this.tokenize(content).slice(0, 10);
    const weight = weights[interactionType];

    for (const term of terms) {
      const currentScore = preferences.get(term) || 0;
      preferences.set(term, Math.min(1, currentScore + weight));
    }

    console.log(`[ReRankingService] Recorded ${interactionType} for user ${userId}`);
  }

  /**
   * Helper: Convert SearchResult to RankedResult
   */
  private convertToRankedResults(results: SearchResult[]): RankedResult[] {
    return results.map((result, index) => ({
      ...result,
      originalRank: index,
      finalScore: result.similarity,
      rankingFactors: {
        semanticScore: result.similarity,
        lexicalScore: 0,
        recencyScore: 0,
        diversityScore: 0,
        userPreferenceScore: 0,
      },
    }));
  }

  /**
   * Helper: Tokenize text for BM25
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\säöüß]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }

  /**
   * Helper: Calculate text similarity (Jaccard)
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.tokenize(text1));
    const tokens2 = new Set(this.tokenize(text2));

    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

// Singleton instance
export const reRankingService = new ReRankingService();
