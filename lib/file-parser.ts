// ============================================================================
// FILE PARSER UTILITY - Level 8: RAG-Lite Context Injection
// ============================================================================
// Extracts text content from various file formats for AI context injection

/**
 * Supported file types for parsing
 */
export type SupportedFileType = 'txt' | 'md' | 'csv' | 'pdf' | 'json' | 'unknown';

/**
 * Result of file parsing
 */
export interface ParseResult {
  success: boolean;
  content: string;
  charCount: number;
  error?: string;
  fileType: SupportedFileType;
}

/**
 * Maximum content length to prevent memory issues (approx 100k chars ~ 25k tokens)
 */
const MAX_CONTENT_LENGTH = 100000;

/**
 * Detect file type from MIME type or extension
 */
export function detectFileType(file: File): SupportedFileType {
  const mimeMap: Record<string, SupportedFileType> = {
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
    'application/pdf': 'pdf',
    'application/json': 'json',
  };

  // Check MIME type first
  if (mimeMap[file.type]) {
    return mimeMap[file.type];
  }

  // Fallback to extension
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (ext && ['txt', 'md', 'csv', 'pdf', 'json'].includes(ext)) {
    return ext as SupportedFileType;
  }

  return 'unknown';
}

/**
 * Parse a text-based file (txt, md, csv, json)
 */
async function parseTextFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    const truncated = text.slice(0, MAX_CONTENT_LENGTH);

    return {
      success: true,
      content: truncated,
      charCount: truncated.length,
      fileType: detectFileType(file),
    };
  } catch (error: any) {
    return {
      success: false,
      content: '',
      charCount: 0,
      error: error.message || 'Failed to read text file',
      fileType: 'txt',
    };
  }
}

/**
 * Parse CSV file with basic formatting
 */
async function parseCsvFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    const lines = text.split('\n');

    // Format CSV as a readable table description
    let formatted = '';
    const headers = lines[0]?.split(',').map(h => h.trim()) || [];

    if (headers.length > 0) {
      formatted += `Table Columns: ${headers.join(', ')}\n\n`;
      formatted += `Data (${lines.length - 1} rows):\n`;

      // Include first 100 rows for context
      const dataRows = lines.slice(1, 101);
      dataRows.forEach((row, index) => {
        const values = row.split(',').map(v => v.trim());
        formatted += `Row ${index + 1}: ${headers.map((h, i) => `${h}=${values[i] || 'N/A'}`).join(', ')}\n`;
      });

      if (lines.length > 101) {
        formatted += `... and ${lines.length - 101} more rows\n`;
      }
    } else {
      formatted = text;
    }

    const truncated = formatted.slice(0, MAX_CONTENT_LENGTH);

    return {
      success: true,
      content: truncated,
      charCount: truncated.length,
      fileType: 'csv',
    };
  } catch (error: any) {
    return {
      success: false,
      content: '',
      charCount: 0,
      error: error.message || 'Failed to parse CSV file',
      fileType: 'csv',
    };
  }
}

/**
 * Parse JSON file with formatting
 */
async function parseJsonFile(file: File): Promise<ParseResult> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    const formatted = JSON.stringify(parsed, null, 2);
    const truncated = formatted.slice(0, MAX_CONTENT_LENGTH);

    return {
      success: true,
      content: truncated,
      charCount: truncated.length,
      fileType: 'json',
    };
  } catch (error: any) {
    return {
      success: false,
      content: '',
      charCount: 0,
      error: error.message || 'Failed to parse JSON file',
      fileType: 'json',
    };
  }
}

/**
 * Parse PDF file using pdf.js
 * Uses dynamic import to avoid SSR issues
 */
async function parsePdfFile(file: File): Promise<ParseResult> {
  try {
    // Dynamic import of pdfjs-dist
    const pdfjsLib = await import('pdfjs-dist');

    // Set worker source (use CDN for simplicity)
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const numPages = pdf.numPages;

    // Extract text from each page
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');

      fullText += `[Page ${pageNum}]\n${pageText}\n\n`;

      // Check if we've exceeded max length
      if (fullText.length > MAX_CONTENT_LENGTH) {
        fullText = fullText.slice(0, MAX_CONTENT_LENGTH);
        fullText += `\n... (truncated, ${numPages - pageNum} more pages)`;
        break;
      }
    }

    return {
      success: true,
      content: fullText.trim(),
      charCount: fullText.length,
      fileType: 'pdf',
    };
  } catch (error: any) {
    console.error('[PDF_PARSE_ERROR]', error);
    return {
      success: false,
      content: '',
      charCount: 0,
      error: error.message || 'Failed to parse PDF file',
      fileType: 'pdf',
    };
  }
}

/**
 * Main file parser function
 * Automatically detects file type and extracts text content
 */
export async function parseFile(file: File): Promise<ParseResult> {
  const fileType = detectFileType(file);

  switch (fileType) {
    case 'txt':
    case 'md':
      return parseTextFile(file);

    case 'csv':
      return parseCsvFile(file);

    case 'json':
      return parseJsonFile(file);

    case 'pdf':
      return parsePdfFile(file);

    default:
      // Try to read as text for unknown types
      try {
        return await parseTextFile(file);
      } catch {
        return {
          success: false,
          content: '',
          charCount: 0,
          error: `Unsupported file type: ${file.type || 'unknown'}`,
          fileType: 'unknown',
        };
      }
  }
}

/**
 * Estimate token count from text (rough estimate: ~4 chars per token)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Truncate content to fit within token limit
 */
export function truncateToTokenLimit(text: string, maxTokens: number = 8000): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;

  return text.slice(0, maxChars) + '\n... [Content truncated to fit context window]';
}

/**
 * Format multiple files into a context string for AI
 */
export function formatFilesAsContext(
  files: Array<{ name: string; content: string; type: string }>
): string {
  if (files.length === 0) return '';

  let context = '=== KNOWLEDGE BASE CONTEXT ===\n\n';

  files.forEach((file, index) => {
    context += `--- Document ${index + 1}: ${file.name} (${file.type.toUpperCase()}) ---\n`;
    context += file.content;
    context += '\n\n';
  });

  context += '=== END OF KNOWLEDGE BASE ===\n';

  return truncateToTokenLimit(context);
}
