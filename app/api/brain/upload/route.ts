/**
 * Brain AI File Upload API
 * Endpoint: POST /api/brain/upload
 *
 * Handles file uploads, processes documents, and stores knowledge
 *
 * FinOps Integration:
 * - Pre-Check: Budget availability before processing
 * - Post-Deduction: Cost recording after successful indexing
 * - Pricing: 1MB ≈ 0.5 Credits (embedding + storage)
 */

import { NextRequest, NextResponse } from 'next/server';
import { processDocument, SUPPORTED_FILE_TYPES, MAX_FILE_SIZE } from '@/lib/brain/DocumentProcessor';
import { knowledgeIndexer, type DocumentInput } from '@/lib/brain';
import { BudgetGuard, BudgetExceededError } from '@/lib/ai/budget-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Pricing: 1MB upload ≈ 0.5 Credits = $0.0005
const CREDITS_PER_MB = 0.5;
const CREDITS_TO_USD = 0.001; // 1 Credit = $0.001

function getUserId(req: NextRequest): string {
  return req.headers.get('x-user-id') || 'demo-user';
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const formData = await req.formData();
    
    const files = formData.getAll('files') as File[];
    const category = formData.get('category') as string || 'general';
    const tagsString = formData.get('tags') as string || '';
    const tags = tagsString ? tagsString.split(',').map(t => t.trim()).filter(Boolean) : [];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Keine Dateien hochgeladen' },
        { status: 400 }
      );
    }

    if (files.length > 10) {
      return NextResponse.json(
        { success: false, error: 'Maximum 10 Dateien pro Upload' },
        { status: 400 }
      );
    }

    // =========================================================================
    // PRE-CHECK: Calculate total file size and check budget availability
    // =========================================================================
    const totalFileSizeBytes = files.reduce((sum, file) => sum + file.size, 0);
    const totalFileSizeMB = totalFileSizeBytes / (1024 * 1024);
    const estimatedCredits = totalFileSizeMB * CREDITS_PER_MB;
    const estimatedCostUsd = estimatedCredits * CREDITS_TO_USD;

    try {
      await BudgetGuard.checkBudgetAvailability(userId, estimatedCostUsd);
    } catch (error) {
      if (error instanceof BudgetExceededError) {
        return NextResponse.json(
          {
            success: false,
            error: 'Budget-Limit erreicht',
            errorCode: 'BUDGET_EXCEEDED',
            message: error.message,
            budgetDetails: {
              dailyLimit: error.details.dailyLimit,
              currentSpend: error.details.currentSpend,
              estimatedCost: error.details.estimatedCost,
              remainingBudget: error.details.remainingBudget,
            },
          },
          { status: 402 } // Payment Required
        );
      }
      throw error;
    }

    const results: Array<{
      filename: string;
      success: boolean;
      error?: string;
      documentId?: string;
      wordCount?: number;
    }> = [];

    const documentsToIndex: DocumentInput[] = [];

    // Process each file
    for (const file of files) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        results.push({
          filename: file.name,
          success: false,
          error: `Datei zu groß (max. ${MAX_FILE_SIZE / 1024 / 1024}MB)`,
        });
        continue;
      }

      // Validate file type
      const isSupported = Object.keys(SUPPORTED_FILE_TYPES).includes(file.type) ||
        file.name.match(/\.(pdf|docx|txt|md|csv|json)$/i);
      
      if (!isSupported) {
        results.push({
          filename: file.name,
          success: false,
          error: 'Nicht unterstütztes Dateiformat',
        });
        continue;
      }

      // Read file buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Process document
      const processingResult = await processDocument(buffer, file.name, file.type);

      if (!processingResult.success || !processingResult.document) {
        results.push({
          filename: file.name,
          success: false,
          error: processingResult.error || 'Fehler beim Verarbeiten',
        });
        continue;
      }

      // Prepare for indexing
      documentsToIndex.push({
        title: processingResult.document.title,
        content: processingResult.document.content,
        workspaceId: 'default-workspace',
        createdBy: userId,
        metadata: {
          ...processingResult.document.metadata,
          category,
          tags,
          sourceType: 'upload' as const,
          source: 'file-upload',
        },
      });

      results.push({
        filename: file.name,
        success: true,
        wordCount: processingResult.document.metadata.wordCount,
      });
    }

    // Index successfully processed documents
    let totalIndexedBytes = 0;
    if (documentsToIndex.length > 0) {
      try {
        const indexResults = await knowledgeIndexer.indexDocuments(documentsToIndex);

        // Update results with document IDs
        indexResults.forEach((indexResult, idx) => {
          const originalResult = results.find(
            (r) =>
              r.success &&
              r.filename === documentsToIndex[idx]?.metadata?.originalFilename
          );
          if (originalResult && indexResult.id) {
            originalResult.documentId = indexResult.id;
            // Track indexed bytes for cost calculation
            const matchingFile = files.find((f) => f.name === originalResult.filename);
            if (matchingFile) {
              totalIndexedBytes += matchingFile.size;
            }
          }
        });

        // =========================================================================
        // POST-DEDUCTION: Record spending after successful indexing
        // =========================================================================
        if (totalIndexedBytes > 0) {
          const indexedSizeMB = totalIndexedBytes / (1024 * 1024);
          const actualCredits = indexedSizeMB * CREDITS_PER_MB;
          const actualCostUsd = actualCredits * CREDITS_TO_USD;

          // Estimate tokens based on content size (~4 chars per token)
          const totalChars = documentsToIndex.reduce(
            (sum, doc) => sum + (doc.content?.length || 0),
            0
          );
          const estimatedTokens = Math.ceil(totalChars / 4);

          await BudgetGuard.recordSpending(userId, {
            agentId: 'knowledge-indexer',
            model: 'text-embedding-3-small',
            promptTokens: estimatedTokens,
            completionTokens: 0,
            totalTokens: estimatedTokens,
            costUsd: actualCostUsd,
            metadata: {
              category: 'KNOWLEDGE_INDEXING',
              documentsIndexed: documentsToIndex.length,
              totalSizeMB: indexedSizeMB,
              creditsUsed: actualCredits,
            },
          });
        }
      } catch (indexError) {
        console.warn('[Upload API] Indexing failed, documents prepared but not indexed:', indexError);
        // Documents are processed but not indexed (DB might be unavailable)
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: successCount > 0,
      message: failCount > 0 
        ? `${successCount} von ${files.length} Dateien erfolgreich verarbeitet`
        : `${successCount} Datei(en) erfolgreich verarbeitet`,
      results,
      statistics: {
        totalFiles: files.length,
        successCount,
        failCount,
        totalWords: results.reduce((sum, r) => sum + (r.wordCount || 0), 0),
      },
    });
  } catch (error) {
    console.error('[Upload API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Fehler beim Hochladen der Dateien',
        message: error instanceof Error ? error.message : 'Unbekannter Fehler',
      },
      { status: 500 }
    );
  }
}

// GET to return supported file types
export async function GET() {
  return NextResponse.json({
    success: true,
    supportedTypes: Object.entries(SUPPORTED_FILE_TYPES).map(([mime, info]) => ({
      mimeType: mime,
      extension: info.ext,
      name: info.name,
      maxSizeMB: info.maxSize / 1024 / 1024,
    })),
    maxFilesPerUpload: 10,
    maxFileSizeMB: MAX_FILE_SIZE / 1024 / 1024,
  });
}
