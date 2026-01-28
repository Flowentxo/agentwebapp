/**
 * Advanced Chunking Service for Brain AI
 *
 * Implements semantic chunking with:
 * - Meaning-based chunk boundaries
 * - Overlapping chunks for context preservation
 * - Smart sizing based on content type
 * - Metadata extraction per chunk
 */

import { OpenAI } from 'openai';

interface ChunkMetadata {
  chunkIndex: number;
  totalChunks: number;
  startOffset: number;
  endOffset: number;
  overlap: {
    before: number;
    after: number;
  };
  contentType: 'text' | 'code' | 'table' | 'list' | 'heading';
  entities: string[];
  keywords: string[];
  summary?: string;
}

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  embedding?: number[];
  tokenCount: number;
}

interface ChunkingOptions {
  maxChunkSize: number;        // Max tokens per chunk
  minChunkSize: number;        // Min tokens per chunk
  overlapSize: number;         // Overlap tokens between chunks
  preserveSentences: boolean;  // Don't split mid-sentence
  extractEntities: boolean;    // Extract named entities
  generateSummaries: boolean;  // Generate chunk summaries
}

const DEFAULT_OPTIONS: ChunkingOptions = {
  maxChunkSize: 512,
  minChunkSize: 100,
  overlapSize: 50,
  preserveSentences: true,
  extractEntities: true,
  generateSummaries: false, // Expensive, use sparingly
};

// Content type detection patterns
const CONTENT_PATTERNS = {
  code: /```[\s\S]*?```|`[^`]+`|\b(function|class|const|let|var|import|export|def|async|await)\b/,
  table: /\|[\s\S]*?\|[\s\S]*?\||\+[-+]+\+/,
  list: /^[\s]*[-*•]\s|^[\s]*\d+\.\s/m,
  heading: /^#{1,6}\s|^[A-Z][A-Za-z\s]+:$/m,
};

// Sentence boundary patterns
const SENTENCE_BOUNDARIES = /(?<=[.!?])\s+(?=[A-Z])|(?<=\n\n)/g;

// Paragraph boundary patterns
const PARAGRAPH_BOUNDARIES = /\n\n+/g;

// Section boundary patterns (headings, etc.)
const SECTION_BOUNDARIES = /(?=^#{1,6}\s)|(?=^\d+\.\s[A-Z])|(?=^[A-Z][A-Za-z\s]+:$)/gm;

export class ChunkingService {
  private openai: OpenAI | null = null;

  constructor() {
    if (process.env.OPENAI_API_KEY) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
  }

  /**
   * Main chunking method - uses semantic chunking strategy
   */
  async chunkDocument(
    documentId: string,
    content: string,
    options: Partial<ChunkingOptions> = {}
  ): Promise<DocumentChunk[]> {
    const opts = { ...DEFAULT_OPTIONS, ...options };

    // 1. Detect content type
    const contentType = this.detectContentType(content);

    // 2. Choose chunking strategy based on content
    let rawChunks: string[];

    switch (contentType) {
      case 'code':
        rawChunks = this.chunkCode(content, opts);
        break;
      case 'table':
        rawChunks = this.chunkTables(content, opts);
        break;
      default:
        rawChunks = this.chunkSemantically(content, opts);
    }

    // 3. Add overlap between chunks
    const overlappedChunks = this.addOverlap(rawChunks, opts.overlapSize);

    // 4. Build chunk objects with metadata
    const chunks: DocumentChunk[] = await Promise.all(
      overlappedChunks.map(async (chunk, index) => {
        const metadata: ChunkMetadata = {
          chunkIndex: index,
          totalChunks: overlappedChunks.length,
          startOffset: content.indexOf(chunk.core),
          endOffset: content.indexOf(chunk.core) + chunk.core.length,
          overlap: {
            before: chunk.overlapBefore.length,
            after: chunk.overlapAfter.length,
          },
          contentType: this.detectContentType(chunk.full),
          entities: opts.extractEntities ? this.extractEntities(chunk.full) : [],
          keywords: this.extractKeywords(chunk.full),
        };

        // Generate summary if enabled (expensive)
        if (opts.generateSummaries && this.openai) {
          metadata.summary = await this.generateChunkSummary(chunk.full);
        }

        return {
          id: `${documentId}_chunk_${index}`,
          content: chunk.full,
          metadata,
          tokenCount: this.estimateTokens(chunk.full),
        };
      })
    );

    console.log(`[ChunkingService] Document ${documentId} chunked into ${chunks.length} chunks`);
    return chunks;
  }

  /**
   * Semantic chunking - splits by meaning boundaries
   */
  private chunkSemantically(content: string, opts: ChunkingOptions): string[] {
    const chunks: string[] = [];

    // 1. First try to split by sections (headings)
    let segments = content.split(SECTION_BOUNDARIES).filter(s => s.trim());

    // 2. If segments are too large, split by paragraphs
    const refinedSegments: string[] = [];
    for (const segment of segments) {
      const tokens = this.estimateTokens(segment);
      if (tokens > opts.maxChunkSize) {
        // Split by paragraphs
        const paragraphs = segment.split(PARAGRAPH_BOUNDARIES).filter(p => p.trim());
        refinedSegments.push(...paragraphs);
      } else {
        refinedSegments.push(segment);
      }
    }

    // 3. Merge small segments, split large ones
    let currentChunk = '';
    let currentTokens = 0;

    for (const segment of refinedSegments) {
      const segmentTokens = this.estimateTokens(segment);

      if (segmentTokens > opts.maxChunkSize) {
        // Segment too large - split by sentences
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
          currentTokens = 0;
        }

        const sentenceChunks = this.chunkBySentences(segment, opts);
        chunks.push(...sentenceChunks);
      } else if (currentTokens + segmentTokens > opts.maxChunkSize) {
        // Would exceed max - save current and start new
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = segment;
        currentTokens = segmentTokens;
      } else {
        // Add to current chunk
        currentChunk += (currentChunk ? '\n\n' : '') + segment;
        currentTokens += segmentTokens;
      }
    }

    // Don't forget the last chunk
    if (currentChunk && this.estimateTokens(currentChunk) >= opts.minChunkSize) {
      chunks.push(currentChunk.trim());
    } else if (currentChunk && chunks.length > 0) {
      // Merge with previous if too small
      chunks[chunks.length - 1] += '\n\n' + currentChunk;
    } else if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Chunk by sentences while respecting size limits
   */
  private chunkBySentences(content: string, opts: ChunkingOptions): string[] {
    const chunks: string[] = [];
    const sentences = content.split(SENTENCE_BOUNDARIES).filter(s => s.trim());

    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = this.estimateTokens(sentence);

      if (currentTokens + sentenceTokens > opts.maxChunkSize && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Special chunking for code blocks
   */
  private chunkCode(content: string, opts: ChunkingOptions): string[] {
    const chunks: string[] = [];

    // Split by function/class definitions
    const codeBlocks = content.split(/(?=^(?:function|class|const|let|var|export|async function|def)\s)/gm);

    let currentChunk = '';
    let currentTokens = 0;

    for (const block of codeBlocks) {
      const blockTokens = this.estimateTokens(block);

      if (blockTokens > opts.maxChunkSize) {
        // Large function - split by logical breaks
        if (currentChunk) {
          chunks.push(currentChunk);
          currentChunk = '';
          currentTokens = 0;
        }

        // Split by empty lines within code
        const subBlocks = block.split(/\n\s*\n/).filter(s => s.trim());
        for (const sub of subBlocks) {
          const subTokens = this.estimateTokens(sub);
          if (currentTokens + subTokens > opts.maxChunkSize && currentChunk) {
            chunks.push(currentChunk);
            currentChunk = sub;
            currentTokens = subTokens;
          } else {
            currentChunk += (currentChunk ? '\n\n' : '') + sub;
            currentTokens += subTokens;
          }
        }
      } else if (currentTokens + blockTokens > opts.maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = block;
        currentTokens = blockTokens;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + block;
        currentTokens += blockTokens;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Special chunking for tables - keep tables together
   */
  private chunkTables(content: string, opts: ChunkingOptions): string[] {
    const chunks: string[] = [];

    // Split content, keeping tables intact
    const tablePattern = /(\|[^\n]+\|[\s\S]*?(?=\n[^|]|\n\n|$))/g;
    let lastIndex = 0;
    let match;

    const parts: { type: 'text' | 'table'; content: string }[] = [];

    while ((match = tablePattern.exec(content)) !== null) {
      // Text before table
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: content.slice(lastIndex, match.index) });
      }
      // The table itself
      parts.push({ type: 'table', content: match[1] });
      lastIndex = match.index + match[1].length;
    }

    // Remaining text
    if (lastIndex < content.length) {
      parts.push({ type: 'text', content: content.slice(lastIndex) });
    }

    // Chunk, keeping tables whole when possible
    let currentChunk = '';
    let currentTokens = 0;

    for (const part of parts) {
      const partTokens = this.estimateTokens(part.content);

      if (part.type === 'table') {
        // Try to keep table with preceding context
        if (currentTokens + partTokens <= opts.maxChunkSize) {
          currentChunk += part.content;
          currentTokens += partTokens;
        } else {
          if (currentChunk) chunks.push(currentChunk);
          currentChunk = part.content;
          currentTokens = partTokens;
        }
      } else {
        // Regular text
        if (currentTokens + partTokens > opts.maxChunkSize && currentChunk) {
          chunks.push(currentChunk);
          currentChunk = part.content;
          currentTokens = partTokens;
        } else {
          currentChunk += part.content;
          currentTokens += partTokens;
        }
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  /**
   * Add overlap between chunks for context preservation
   */
  private addOverlap(
    chunks: string[],
    overlapTokens: number
  ): { full: string; core: string; overlapBefore: string; overlapAfter: string }[] {
    return chunks.map((chunk, index) => {
      let overlapBefore = '';
      let overlapAfter = '';

      // Get overlap from previous chunk
      if (index > 0) {
        const prevChunk = chunks[index - 1];
        const prevSentences = prevChunk.split(SENTENCE_BOUNDARIES);
        let tokens = 0;
        const overlapSentences: string[] = [];

        for (let i = prevSentences.length - 1; i >= 0 && tokens < overlapTokens; i--) {
          const sentenceTokens = this.estimateTokens(prevSentences[i]);
          if (tokens + sentenceTokens <= overlapTokens * 1.5) {
            overlapSentences.unshift(prevSentences[i]);
            tokens += sentenceTokens;
          }
        }
        overlapBefore = overlapSentences.join(' ');
      }

      // Get overlap from next chunk
      if (index < chunks.length - 1) {
        const nextChunk = chunks[index + 1];
        const nextSentences = nextChunk.split(SENTENCE_BOUNDARIES);
        let tokens = 0;
        const overlapSentences: string[] = [];

        for (let i = 0; i < nextSentences.length && tokens < overlapTokens; i++) {
          const sentenceTokens = this.estimateTokens(nextSentences[i]);
          if (tokens + sentenceTokens <= overlapTokens * 1.5) {
            overlapSentences.push(nextSentences[i]);
            tokens += sentenceTokens;
          }
        }
        overlapAfter = overlapSentences.join(' ');
      }

      return {
        full: [overlapBefore, chunk, overlapAfter].filter(Boolean).join('\n\n---\n\n'),
        core: chunk,
        overlapBefore,
        overlapAfter,
      };
    });
  }

  /**
   * Detect content type
   */
  private detectContentType(content: string): 'text' | 'code' | 'table' | 'list' | 'heading' {
    if (CONTENT_PATTERNS.code.test(content)) return 'code';
    if (CONTENT_PATTERNS.table.test(content)) return 'table';
    if (CONTENT_PATTERNS.list.test(content)) return 'list';
    if (CONTENT_PATTERNS.heading.test(content)) return 'heading';
    return 'text';
  }

  /**
   * Extract named entities from text
   */
  private extractEntities(text: string): string[] {
    const entities: Set<string> = new Set();

    // Simple pattern-based extraction
    // Capitalize words (potential proper nouns)
    const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    properNouns.forEach(n => entities.add(n));

    // Email addresses
    const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails.forEach(e => entities.add(e));

    // URLs
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    urls.forEach(u => entities.add(u));

    // Numbers with context (e.g., "$1,000", "50%")
    const numbers = text.match(/[$€£][\d,]+(?:\.\d+)?|\d+(?:\.\d+)?%/g) || [];
    numbers.forEach(n => entities.add(n));

    // Dates
    const dates = text.match(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2}/g) || [];
    dates.forEach(d => entities.add(d));

    return Array.from(entities).slice(0, 20); // Limit to 20
  }

  /**
   * Extract keywords using TF-IDF-like approach
   */
  private extractKeywords(text: string): string[] {
    // Stopwords
    const stopwords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'that', 'this', 'these', 'those', 'it',
      'its', 'i', 'you', 'he', 'she', 'we', 'they', 'them', 'their', 'our',
      'der', 'die', 'das', 'und', 'oder', 'aber', 'in', 'auf', 'an', 'zu', 'für',
      'von', 'mit', 'aus', 'als', 'ist', 'war', 'sind', 'waren', 'wird', 'werden',
    ]);

    // Tokenize and count
    const words = text.toLowerCase()
      .replace(/[^\w\säöüß-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !stopwords.has(w));

    const wordCounts = new Map<string, number>();
    words.forEach(w => {
      wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
    });

    // Sort by frequency and return top keywords
    return Array.from(wordCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Generate summary for a chunk using AI
   */
  private async generateChunkSummary(content: string): Promise<string> {
    if (!this.openai) return '';

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following text in 1-2 sentences. Be concise and capture the main point.',
          },
          { role: 'user', content: content.slice(0, 2000) },
        ],
        max_tokens: 100,
        temperature: 0.3,
      });

      return response.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('[ChunkingService] Summary generation failed:', error);
      return '';
    }
  }

  /**
   * Estimate token count (rough estimate: ~4 chars per token)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }
}

// Singleton instance
export const chunkingService = new ChunkingService();
