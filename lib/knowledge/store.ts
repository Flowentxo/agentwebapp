/**
 * Knowledge Store - In-Memory
 * Sprint 3 - Knowledge MVP
 * Features: PII-Redaction, Dedupe, Chunking, Index, Search, Ask, Rate-Limit, Cache
 */

import { KnowledgeItem, Chunk, SearchResult, AskResponse } from "./types";

// ========== PII REDACTION ==========
const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_REGEX = /\+?\d[\d\s\-()]{7,}\d/g;

function redactPII(text: string): { text: string; emails: number; phones: number } {
  let emails = 0;
  let phones = 0;

  text = text.replace(EMAIL_REGEX, () => {
    emails++;
    return "[REDACTED_EMAIL]";
  });

  text = text.replace(PHONE_REGEX, () => {
    phones++;
    return "[REDACTED_PHONE]";
  });

  return { text, emails, phones };
}

// ========== DEDUPE (djb2 hash) ==========
function djb2Hash(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i);
  }
  return hash >>> 0; // unsigned
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().trim().replace(/\s+/g, " ");
}

// ========== CHUNKING ==========
const MIN_CHUNK_SIZE = 400;
const MAX_CHUNK_SIZE = 800;
const MAX_CHUNKS_PER_ITEM = 32;

function chunkText(text: string): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    const sentences = para.split(/(?<=[.!?])\s+/);

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > MAX_CHUNK_SIZE && currentChunk.length >= MIN_CHUNK_SIZE) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += (currentChunk ? " " : "") + sentence;
      }

      if (chunks.length >= MAX_CHUNKS_PER_ITEM) {
        break;
      }
    }

    if (chunks.length >= MAX_CHUNKS_PER_ITEM) {
      break;
    }
  }

  if (currentChunk.trim() && chunks.length < MAX_CHUNKS_PER_ITEM) {
    chunks.push(currentChunk.trim());
  }

  return chunks.slice(0, MAX_CHUNKS_PER_ITEM);
}

// ========== TOKENIZATION ==========
const STOPWORDS = new Set(["the", "and", "oder", "und", "der", "die", "das", "a", "an", "to", "of", "in", "is", "it", "that", "this"]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t));
}

// ========== STORE ==========
class KnowledgeStore {
  private items: Map<string, KnowledgeItem> = new Map();
  private chunks: Map<string, Chunk> = new Map();
  private itemCounter = 0;
  private chunkCounter = 0;

  // Dedupe tracking: normTitle+hash -> itemId
  private dedupeMap: Map<string, string> = new Map();

  // Inverted index: term -> Set<chunkId>
  private index: Map<string, Set<string>> = new Map();

  // Document frequency: term -> count
  private df: Map<string, number> = new Map();

  // Ask Cache (LRU, max 20)
  private askCache: Map<string, { answer: string; sources: AskResponse["sources"]; ts: number }> = new Map();
  private readonly MAX_CACHE_SIZE = 20;

  // Rate Limiter: clientId -> timestamps[]
  private rateLimitMap: Map<string, number[]> = new Map();
  private readonly RATE_LIMIT = 5;
  private readonly RATE_WINDOW_MS = 60000;

  // ========== CREATE ITEM ==========
  createItem(input: { type: "note" | "url"; title: string; content?: string; url?: string }): KnowledgeItem {
    const normTitle = normalizeTitle(input.title);
    const contentOrUrl = input.type === "note" ? input.content || "" : input.url || "";
    const dedupeKey = `${normTitle}:${djb2Hash(input.title + contentOrUrl)}`;

    // Dedupe check
    const existingId = this.dedupeMap.get(dedupeKey);
    if (existingId) {
      const existing = this.items.get(existingId);
      if (existing) {
        return existing;
      }
    }

    const id = `item-${Date.now()}-${++this.itemCounter}`;

    // Redact PII
    let redactedContent = input.content;
    let redactedUrl = input.url;
    let totalEmails = 0;
    let totalPhones = 0;

    if (input.type === "note" && input.content) {
      const redacted = redactPII(input.content);
      redactedContent = redacted.text;
      totalEmails += redacted.emails;
      totalPhones += redacted.phones;
    }

    if (input.type === "url" && input.url) {
      const redacted = redactPII(input.url);
      redactedUrl = redacted.text;
      totalEmails += redacted.emails;
      totalPhones += redacted.phones;
    }

    const item: KnowledgeItem = {
      id,
      type: input.type,
      title: input.title,
      content: redactedContent,
      url: redactedUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      chunkCount: 0,
      redactions: {
        emails: totalEmails,
        phones: totalPhones,
      },
    };

    this.items.set(id, item);
    this.dedupeMap.set(dedupeKey, id);

    // Chunk & Index
    if (input.type === "note" && redactedContent) {
      this.chunkAndIndexItem(item, redactedContent);
    } else if (input.type === "url" && input.title) {
      // For URLs, we index the title only (no external fetch)
      this.chunkAndIndexItem(item, input.title);
    }

    return item;
  }

  private chunkAndIndexItem(item: KnowledgeItem, text: string): void {
    const textChunks = chunkText(text);
    item.chunkCount = textChunks.length;

    textChunks.forEach((chunkText, index) => {
      const chunkId = `chunk-${item.id}-${++this.chunkCounter}`;

      // Redact PII in chunk
      const redacted = redactPII(chunkText);

      const chunk: Chunk = {
        id: chunkId,
        itemId: item.id,
        index,
        text: redacted.text,
        redactions: {
          emails: redacted.emails,
          phones: redacted.phones,
        },
      };

      this.chunks.set(chunkId, chunk);

      // Index terms
      const terms = tokenize(chunk.text);
      const uniqueTerms = new Set(terms);

      uniqueTerms.forEach((term) => {
        if (!this.index.has(term)) {
          this.index.set(term, new Set());
        }
        this.index.get(term)!.add(chunkId);

        // Update DF
        this.df.set(term, (this.df.get(term) || 0) + 1);
      });
    });
  }

  // ========== GET/DELETE ==========
  getItem(id: string): KnowledgeItem | undefined {
    return this.items.get(id);
  }

  getAllItems(): KnowledgeItem[] {
    return Array.from(this.items.values());
  }

  deleteItem(id: string): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    // Remove chunks
    const chunksToDelete: string[] = [];
    this.chunks.forEach((chunk) => {
      if (chunk.itemId === id) {
        chunksToDelete.push(chunk.id);
      }
    });

    chunksToDelete.forEach((chunkId) => {
      const chunk = this.chunks.get(chunkId);
      if (chunk) {
        // Remove from index
        const terms = tokenize(chunk.text);
        terms.forEach((term) => {
          const set = this.index.get(term);
          if (set) {
            set.delete(chunkId);
            if (set.size === 0) {
              this.index.delete(term);
            }
          }
        });
      }
      this.chunks.delete(chunkId);
    });

    // Remove from dedupe map
    const normTitle = normalizeTitle(item.title);
    const contentOrUrl = item.type === "note" ? item.content || "" : item.url || "";
    const dedupeKey = `${normTitle}:${djb2Hash(item.title + contentOrUrl)}`;
    this.dedupeMap.delete(dedupeKey);

    this.items.delete(id);
    return true;
  }

  // ========== SEARCH ==========
  search(query: string, limit: number = 5): SearchResult[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const chunkScores: Map<string, number> = new Map();
    const N = this.chunks.size;

    queryTerms.forEach((term) => {
      const chunkIds = this.index.get(term);
      if (!chunkIds) return;

      const df = this.df.get(term) || 1;
      const idf = 1 + Math.log(1 + N / (1 + df));

      chunkIds.forEach((chunkId) => {
        const chunk = this.chunks.get(chunkId);
        if (!chunk) return;

        const terms = tokenize(chunk.text);
        const tf = terms.filter((t) => t === term).length;
        const score = tf * idf;

        chunkScores.set(chunkId, (chunkScores.get(chunkId) || 0) + score);
      });
    });

    // Group by itemId
    const itemScores: Map<string, { score: number; chunkIndices: number[] }> = new Map();

    chunkScores.forEach((score, chunkId) => {
      const chunk = this.chunks.get(chunkId);
      if (!chunk) return;

      const existing = itemScores.get(chunk.itemId) || { score: 0, chunkIndices: [] };
      existing.score += score;
      existing.chunkIndices.push(chunk.index);
      itemScores.set(chunk.itemId, existing);
    });

    // Convert to results
    const results: SearchResult[] = [];
    itemScores.forEach((data, itemId) => {
      const item = this.items.get(itemId);
      if (!item) return;

      results.push({
        itemId: item.id,
        title: item.title,
        score: data.score,
        url: item.url,
        chunkIndices: data.chunkIndices,
      });
    });

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, limit);
  }

  // ========== ASK ==========
  ask(query: string, debug: boolean = false): AskResponse {
    // Check cache
    const cached = this.askCache.get(query);
    if (cached && Date.now() - cached.ts < 60000) {
      // Cache hit within 1 minute
      return { answer: cached.answer, sources: cached.sources };
    }

    const results = this.search(query, 3);
    if (results.length === 0) {
      return {
        answer: "Keine passenden Inhalte gefunden.",
        sources: [],
      };
    }

    // Get top chunks for extractive answer
    const topChunks: Array<{ chunk: Chunk; score: number }> = [];

    results.forEach((result) => {
      result.chunkIndices.forEach((idx) => {
        // Find chunk by itemId + index
        this.chunks.forEach((chunk) => {
          if (chunk.itemId === result.itemId && chunk.index === idx) {
            topChunks.push({ chunk, score: result.score });
          }
        });
      });
    });

    topChunks.sort((a, b) => b.score - a.score);

    // Extractive answer: first 1-2 sentences from top 1-2 chunks
    let answerText = "";
    const topTwo = topChunks.slice(0, 2);

    topTwo.forEach(({ chunk }) => {
      const sentences = chunk.text.split(/[.!?]\s+/).filter((s) => s.trim().length > 0);
      const firstSentences = sentences.slice(0, 2).join(". ");
      if (firstSentences) {
        answerText += (answerText ? " " : "") + firstSentences;
        if (!firstSentences.endsWith(".")) answerText += ".";
      }
    });

    if (!answerText) {
      answerText = "Keine passenden Inhalte gefunden.";
    }

    const sources = results.map((r) => ({
      itemId: r.itemId,
      title: r.title,
      score: r.score,
      url: r.url,
    }));

    // Update cache (LRU)
    this.askCache.set(query, { answer: answerText, sources, ts: Date.now() });
    if (this.askCache.size > this.MAX_CACHE_SIZE) {
      // Remove oldest
      const oldest = Array.from(this.askCache.entries()).sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) {
        this.askCache.delete(oldest[0]);
      }
    }

    const response: AskResponse = {
      answer: answerText,
      sources,
    };

    if (debug) {
      response.debug = {
        chunks: topChunks.slice(0, 5).map((tc) => ({
          itemId: tc.chunk.itemId,
          chunkIndex: tc.chunk.index,
          text: tc.chunk.text,
          score: tc.score,
        })),
      };
    }

    return response;
  }

  // ========== RATE LIMITER ==========
  checkRateLimit(clientId: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const timestamps = this.rateLimitMap.get(clientId) || [];

    // Remove timestamps outside window
    const validTimestamps = timestamps.filter((ts) => now - ts < this.RATE_WINDOW_MS);

    if (validTimestamps.length >= this.RATE_LIMIT) {
      this.rateLimitMap.set(clientId, validTimestamps);
      return { allowed: false, remaining: 0 };
    }

    validTimestamps.push(now);
    this.rateLimitMap.set(clientId, validTimestamps);

    return { allowed: true, remaining: this.RATE_LIMIT - validTimestamps.length };
  }
}

export const knowledgeStore = new KnowledgeStore();
