/**
 * DOCUMENT PARSER SERVICE
 *
 * Extract text and metadata from various document formats:
 * - PDF files (pdf-parse)
 * - Microsoft Word (.docx)
 * - Plain text files
 * - Markdown files
 * - CSV files
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { createReadStream } from 'fs';
import { Buffer } from 'buffer';
import { getDb } from '@/lib/db';
import { brainMemories } from '@/lib/db/schema';
import OpenAI from 'openai';
import { logger } from '../utils/logger';

// Lazy initialization to prevent crash when API key is missing
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

export interface DocumentMetadata {
  title?: string;
  author?: string;
  subject?: string;
  creator?: string;
  producer?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  wordCount?: number;
}

export interface ParsedDocument {
  text: string;
  metadata: DocumentMetadata;
  chunks: TextChunk[];
  summary?: string;
}

export interface TextChunk {
  id: string;
  text: string;
  pageNumber?: number;
  startIndex: number;
  endIndex: number;
  wordCount: number;
}

export class DocumentParserService {
  private static readonly CHUNK_SIZE = 1000; // words per chunk
  private static readonly CHUNK_OVERLAP = 100; // overlap between chunks

  /**
   * Parse a document from buffer
   */
  async parseDocument(
    buffer: Buffer,
    filename: string,
    mimeType: string
  ): Promise<ParsedDocument> {
    console.log('[DocumentParser] Parsing document:', {
      filename,
      mimeType,
      size: buffer.length
    });

    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.parsePDF(buffer);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/msword':
          return await this.parseWord(buffer);

        case 'text/plain':
        case 'text/markdown':
        case 'text/csv':
          return await this.parseText(buffer, mimeType);

        default:
          throw new Error(`Unsupported document type: ${mimeType}`);
      }
    } catch (error: any) {
      console.error('[DocumentParser] Parsing failed:', error);
      throw new Error(`Failed to parse document: ${error.message}`);
    }
  }

  /**
   * Parse PDF document
   */
  private async parsePDF(buffer: Buffer): Promise<ParsedDocument> {
    const data = await pdfParse(buffer);

    const metadata: DocumentMetadata = {
      title: data.info?.Title,
      author: data.info?.Author,
      subject: data.info?.Subject,
      creator: data.info?.Creator,
      producer: data.info?.Producer,
      creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined,
      modificationDate: data.info?.ModDate ? new Date(data.info.ModDate) : undefined,
      pageCount: data.numpages,
      wordCount: this.countWords(data.text)
    };

    const chunks = this.createChunks(data.text);

    return {
      text: data.text,
      metadata,
      chunks
    };
  }

  /**
   * Parse Word document
   */
  private async parseWord(buffer: Buffer): Promise<ParsedDocument> {
    const result = await mammoth.extractRawText({ buffer });
    const text = result.value;

    const metadata: DocumentMetadata = {
      wordCount: this.countWords(text)
    };

    const chunks = this.createChunks(text);

    return {
      text,
      metadata,
      chunks
    };
  }

  /**
   * Parse text document
   */
  private async parseText(buffer: Buffer, mimeType: string): Promise<ParsedDocument> {
    const text = buffer.toString('utf-8');

    const metadata: DocumentMetadata = {
      wordCount: this.countWords(text)
    };

    const chunks = this.createChunks(text);

    return {
      text,
      metadata,
      chunks
    };
  }

  /**
   * Create text chunks for RAG
   */
  private createChunks(text: string): TextChunk[] {
    const words = text.split(/\s+/);
    const chunks: TextChunk[] = [];
    let chunkIndex = 0;

    for (let i = 0; i < words.length; i += DocumentParserService.CHUNK_SIZE - DocumentParserService.CHUNK_OVERLAP) {
      const chunkWords = words.slice(i, i + DocumentParserService.CHUNK_SIZE);
      const chunkText = chunkWords.join(' ');

      if (chunkText.trim().length === 0) continue;

      chunks.push({
        id: `chunk-${chunkIndex}`,
        text: chunkText,
        startIndex: i,
        endIndex: i + chunkWords.length,
        wordCount: chunkWords.length
      });

      chunkIndex++;
    }

    console.log('[DocumentParser] Created', chunks.length, 'chunks');
    return chunks;
  }

  /**
   * Count words in text
   */
  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Extract keywords from document using simple frequency analysis
   */
  extractKeywords(text: string, limit: number = 10): string[] {
    // Remove common words (stop words)
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which',
      'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every', 'both',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
      'only', 'own', 'same', 'so', 'than', 'too', 'very'
    ]);

    // Count word frequency
    const words = text.toLowerCase().match(/\b[a-z]{3,}\b/g) || [];
    const frequency: Record<string, number> = {};

    for (const word of words) {
      if (!stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    }

    // Sort by frequency and return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([word]) => word);
  }

  /**
   * Generate a simple summary (first N words)
   */
  generateSummary(text: string, maxWords: number = 100): string {
    const words = text.split(/\s+/);
    return words.slice(0, maxWords).join(' ') + (words.length > maxWords ? '...' : '');
  }

  /**
   * Extract AI-powered insights from document
   */
  async extractInsights(text: string, filename: string): Promise<any> {
    try {
      const response = await getOpenAIClient().chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert document analyst. Extract key insights, topics, and actionable information from documents.

Analyze the document and provide:
1. Summary (2-3 sentences)
2. Key Topics (5-10 main topics)
3. Action Items (if any)
4. Important Entities (categorized: people, organizations, locations)
5. Sentiment (overall and confidence score 0-1)

Return as JSON with this exact structure:
{
  "summary": "...",
  "keyTopics": ["topic1", "topic2", ...],
  "actionItems": ["action1", "action2", ...],
  "entities": {
    "people": ["person1", "person2", ...],
    "organizations": ["org1", "org2", ...],
    "locations": ["loc1", "loc2", ...]
  },
  "sentiment": {
    "overall": "positive|neutral|negative",
    "score": 0.85
  }
}`,
          },
          {
            role: 'user',
            content: `Document: ${filename}\n\nContent (first 4000 chars):\n${text.slice(0, 4000)}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      });

      const insights = JSON.parse(response.choices[0].message?.content || '{}');
      logger.info(`[DOCUMENT_PARSER] Extracted insights from ${filename}`);

      // Ensure proper structure
      return {
        summary: insights.summary || 'No summary available',
        keyTopics: insights.keyTopics || [],
        actionItems: insights.actionItems || [],
        entities: {
          people: insights.entities?.people || [],
          organizations: insights.entities?.organizations || [],
          locations: insights.entities?.locations || [],
        },
        sentiment: {
          overall: insights.sentiment?.overall || 'neutral',
          score: insights.sentiment?.score || 0.5,
        },
      };
    } catch (error) {
      logger.error('[DOCUMENT_PARSER] Failed to extract insights:', error);
      return {
        summary: 'Failed to extract insights',
        keyTopics: [],
        actionItems: [],
        entities: {
          people: [],
          organizations: [],
          locations: [],
        },
        sentiment: {
          overall: 'neutral',
          score: 0.5,
        },
      };
    }
  }

  /**
   * Store document in Brain AI memory
   */
  async storeInBrainMemory(
    userId: string,
    parsed: ParsedDocument,
    filename: string,
    insights: any
  ): Promise<string[]> {
    try {
      const db = getDb();
      const memoryIds: string[] = [];

      // Store each chunk as separate memory
      for (const chunk of parsed.chunks) {
        const [memory] = await db
          .insert(brainMemories)
          .values({
            agentId: 'document-parser',
            context: {
              type: 'document',
              fileName: filename,
              chunkId: chunk.id,
              totalChunks: parsed.chunks.length,
              text: chunk.text,
              metadata: parsed.metadata,
              insights: chunk.id === 'chunk-0' ? insights : undefined, // Only first chunk has insights
            },
            tags: [
              'document',
              'uploaded',
              ...(insights.keyTopics || []).slice(0, 5),
            ],
            importance: 7, // Documents are important
          })
          .returning();

        memoryIds.push(memory.id);
      }

      logger.info(`[DOCUMENT_PARSER] Stored ${memoryIds.length} chunks in Brain AI memory`);
      return memoryIds;
    } catch (error) {
      logger.error('[DOCUMENT_PARSER] Failed to store in memory:', error);
      throw error;
    }
  }

  /**
   * Process uploaded document end-to-end with Brain AI integration
   */
  async processDocumentForBrain(
    buffer: Buffer,
    filename: string,
    mimeType: string,
    userId: string
  ): Promise<{
    parsed: ParsedDocument;
    insights: any;
    memoryIds: string[];
  }> {
    try {
      // Step 1: Parse document
      const parsed = await this.parseDocument(buffer, filename, mimeType);

      // Step 2: Extract AI insights
      const insights = await this.extractInsights(parsed.text, filename);

      // Step 3: Store in Brain AI
      const memoryIds = await this.storeInBrainMemory(userId, parsed, filename, insights);

      logger.info(`[DOCUMENT_PARSER] Successfully processed document: ${filename}`);

      return { parsed, insights, memoryIds };
    } catch (error) {
      logger.error('[DOCUMENT_PARSER] Document processing failed:', error);
      throw error;
    }
  }
}

// Singleton instance
export const documentParserService = new DocumentParserService();
