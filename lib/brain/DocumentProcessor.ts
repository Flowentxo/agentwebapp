/**
 * Document Processor Service
 * Handles parsing of various file formats for Brain AI knowledge ingestion
 */

import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';

export interface ProcessedDocument {
  title: string;
  content: string;
  metadata: {
    originalFilename: string;
    fileType: string;
    fileSize: number;
    pageCount?: number;
    wordCount: number;
    extractedAt: string;
  };
}

export interface ProcessingResult {
  success: boolean;
  document?: ProcessedDocument;
  error?: string;
}

/**
 * Process a file buffer and extract text content
 */
export async function processDocument(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<ProcessingResult> {
  try {
    const fileType = getFileType(mimeType, filename);
    
    let content: string;
    let pageCount: number | undefined;

    switch (fileType) {
      case 'pdf':
        const pdfResult = await processPDF(buffer);
        content = pdfResult.content;
        pageCount = pdfResult.pageCount;
        break;
      
      case 'docx':
        content = await processDOCX(buffer);
        break;
      
      case 'txt':
      case 'md':
        content = buffer.toString('utf-8');
        break;
      
      case 'csv':
        content = processCSV(buffer.toString('utf-8'));
        break;
      
      case 'json':
        content = processJSON(buffer.toString('utf-8'));
        break;
      
      default:
        return {
          success: false,
          error: `Nicht unterstütztes Dateiformat: ${fileType}`,
        };
    }

    // Clean and normalize content
    content = cleanContent(content);
    
    if (!content || content.trim().length < 10) {
      return {
        success: false,
        error: 'Konnte keinen verwertbaren Text aus der Datei extrahieren',
      };
    }

    // Generate title from filename
    const title = generateTitle(filename);

    return {
      success: true,
      document: {
        title,
        content,
        metadata: {
          originalFilename: filename,
          fileType,
          fileSize: buffer.length,
          pageCount,
          wordCount: countWords(content),
          extractedAt: new Date().toISOString(),
        },
      },
    };
  } catch (error) {
    console.error('[DocumentProcessor] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Fehler beim Verarbeiten der Datei',
    };
  }
}

/**
 * Process PDF file
 */
async function processPDF(buffer: Buffer): Promise<{ content: string; pageCount: number }> {
  const data = await pdfParse(buffer);
  return {
    content: data.text,
    pageCount: data.numpages,
  };
}

/**
 * Process DOCX file
 */
async function processDOCX(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

/**
 * Process CSV to readable text
 */
function processCSV(csvContent: string): string {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return '';
  
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = lines.slice(1);
  
  let content = `Tabelle mit ${rows.length} Zeilen und ${headers.length} Spalten.\n\n`;
  content += `Spalten: ${headers.join(', ')}\n\n`;
  
  // Include first 50 rows as readable text
  rows.slice(0, 50).forEach((row, idx) => {
    const values = row.split(',').map(v => v.trim());
    content += `Zeile ${idx + 1}: `;
    headers.forEach((header, i) => {
      if (values[i]) {
        content += `${header}: ${values[i]}; `;
      }
    });
    content += '\n';
  });
  
  if (rows.length > 50) {
    content += `\n... und ${rows.length - 50} weitere Zeilen`;
  }
  
  return content;
}

/**
 * Process JSON to readable text
 */
function processJSON(jsonContent: string): string {
  try {
    const data = JSON.parse(jsonContent);
    return formatJsonAsText(data);
  } catch {
    return jsonContent;
  }
}

function formatJsonAsText(data: unknown, prefix = ''): string {
  if (data === null || data === undefined) return '';
  
  if (Array.isArray(data)) {
    return data.map((item, idx) => 
      `${prefix}${idx + 1}. ${formatJsonAsText(item)}`
    ).join('\n');
  }
  
  if (typeof data === 'object') {
    return Object.entries(data as Record<string, unknown>)
      .map(([key, value]) => {
        if (typeof value === 'object' && value !== null) {
          return `${prefix}${key}:\n${formatJsonAsText(value, prefix + '  ')}`;
        }
        return `${prefix}${key}: ${value}`;
      })
      .join('\n');
  }
  
  return String(data);
}

/**
 * Determine file type from MIME type or extension
 */
function getFileType(mimeType: string, filename: string): string {
  const mimeMap: Record<string, string> = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'doc',
    'text/plain': 'txt',
    'text/markdown': 'md',
    'text/csv': 'csv',
    'application/json': 'json',
  };
  
  if (mimeMap[mimeType]) {
    return mimeMap[mimeType];
  }
  
  // Fallback to extension
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  return ext;
}

/**
 * Clean and normalize text content
 */
function cleanContent(content: string): string {
  return content
    // Replace multiple whitespace with single space
    .replace(/\s+/g, ' ')
    // Replace multiple newlines with double newline
    .replace(/(\r?\n\s*){3,}/g, '\n\n')
    // Remove control characters
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Trim
    .trim();
}

/**
 * Generate a clean title from filename
 */
function generateTitle(filename: string): string {
  return filename
    // Remove extension
    .replace(/\.[^.]+$/, '')
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Capitalize first letter of each word
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/**
 * Count words in content
 */
function countWords(content: string): number {
  return content.split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Supported file types
 */
export const SUPPORTED_FILE_TYPES = {
  'application/pdf': { ext: 'pdf', name: 'PDF', maxSize: 10 * 1024 * 1024 }, // 10MB
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', name: 'Word', maxSize: 10 * 1024 * 1024 },
  'text/plain': { ext: 'txt', name: 'Text', maxSize: 1 * 1024 * 1024 }, // 1MB
  'text/markdown': { ext: 'md', name: 'Markdown', maxSize: 1 * 1024 * 1024 },
  'text/csv': { ext: 'csv', name: 'CSV', maxSize: 5 * 1024 * 1024 }, // 5MB
  'application/json': { ext: 'json', name: 'JSON', maxSize: 5 * 1024 * 1024 },
};

export const SUPPORTED_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES).map(t => t.ext);
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
