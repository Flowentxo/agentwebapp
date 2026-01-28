/**
 * Document Parser Utilities
 * Handles parsing of PDF, DOCX, TXT, CSV files and URL content extraction
 */

import fs from 'fs';
import path from 'path';
import * as pdfParse from 'pdf-parse';
// Note: For DOCX parsing, we'll use a simpler approach or add mammoth library

export interface ParsedDocument {
  text: string;
  metadata: {
    title?: string;
    author?: string;
    pages?: number;
    wordCount: number;
    fileType: string;
    fileSize?: number;
    encoding?: string;
  };
}

/**
 * Parse PDF file
 */
export async function parsePDF(filePath: string): Promise<ParsedDocument> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const pdfParseFunc = (pdfParse as any).default || pdfParse;
    const data = await pdfParseFunc(dataBuffer);

    return {
      text: data.text,
      metadata: {
        title: data.info?.Title || path.basename(filePath, '.pdf'),
        author: data.info?.Author,
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).length,
        fileType: 'pdf',
        fileSize: dataBuffer.length,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse TXT file
 */
export async function parseTXT(filePath: string): Promise<ParsedDocument> {
  try {
    const text = fs.readFileSync(filePath, 'utf-8');

    return {
      text,
      metadata: {
        title: path.basename(filePath, '.txt'),
        wordCount: text.split(/\s+/).length,
        fileType: 'txt',
        fileSize: Buffer.byteLength(text, 'utf-8'),
        encoding: 'utf-8',
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse TXT: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse CSV file
 */
export async function parseCSV(filePath: string): Promise<ParsedDocument> {
  try {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');

    // Convert CSV to readable text format
    const text = lines.map((line, idx) => {
      if (idx === 0) {
        return `Headers: ${line}`;
      }
      return `Row ${idx}: ${line}`;
    }).join('\n');

    return {
      text,
      metadata: {
        title: path.basename(filePath, '.csv'),
        wordCount: text.split(/\s+/).length,
        fileType: 'csv',
        fileSize: Buffer.byteLength(csvContent, 'utf-8'),
        encoding: 'utf-8',
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse DOCX file (simplified approach using plain text extraction)
 * For production, consider using 'mammoth' library for better formatting
 */
export async function parseDOCX(filePath: string): Promise<ParsedDocument> {
  try {
    // For now, we'll handle DOCX as binary and extract what we can
    // In production, use: import mammoth from 'mammoth';

    // Placeholder implementation - returns basic info
    const stats = fs.statSync(filePath);

    return {
      text: `[DOCX Document: ${path.basename(filePath)}]\n\nNote: Full DOCX parsing requires additional setup. Please convert to PDF or TXT for full text extraction.`,
      metadata: {
        title: path.basename(filePath, '.docx'),
        wordCount: 0,
        fileType: 'docx',
        fileSize: stats.size,
      },
    };
  } catch (error) {
    throw new Error(`Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from URL
 */
export async function extractTextFromURL(url: string): Promise<ParsedDocument> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';

    // Handle different content types
    if (contentType.includes('text/html')) {
      const html = await response.text();

      // Simple HTML text extraction (remove tags)
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]+>/g, '') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return {
        text,
        metadata: {
          title: extractTitleFromHTML(html) || new URL(url).hostname,
          wordCount: text.split(/\s+/).length,
          fileType: 'html',
        },
      };
    } else if (contentType.includes('text/plain')) {
      const text = await response.text();
      return {
        text,
        metadata: {
          title: new URL(url).hostname,
          wordCount: text.split(/\s+/).length,
          fileType: 'txt',
        },
      };
    } else {
      throw new Error(`Unsupported content type: ${contentType}`);
    }
  } catch (error) {
    throw new Error(`Failed to extract text from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Helper: Extract title from HTML
 */
function extractTitleFromHTML(html: string): string | null {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return titleMatch ? titleMatch[1].trim() : null;
}

/**
 * Main document parser - auto-detects file type
 */
export async function parseDocument(filePath: string): Promise<ParsedDocument> {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case '.pdf':
      return parsePDF(filePath);
    case '.txt':
    case '.md':
      return parseTXT(filePath);
    case '.csv':
      return parseCSV(filePath);
    case '.docx':
      return parseDOCX(filePath);
    default:
      throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Validate file size (max 10MB)
 */
export function validateFileSize(filePath: string, maxSizeMB: number = 10): boolean {
  const stats = fs.statSync(filePath);
  const maxBytes = maxSizeMB * 1024 * 1024;
  return stats.size <= maxBytes;
}

/**
 * Get supported file extensions
 */
export function getSupportedExtensions(): string[] {
  return ['.pdf', '.txt', '.md', '.csv', '.docx'];
}
