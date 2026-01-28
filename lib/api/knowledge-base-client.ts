/**
 * KNOWLEDGE BASE CLIENT API
 *
 * Client-side functions for knowledge base management
 */

import { apiClient } from './client';

export interface KnowledgeFile {
  id: string;
  userId: string;
  workspaceId?: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  storageProvider: string;
  storageKey: string;
  url?: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed' | 'deleted';
  processingError?: string;
  visibility: 'private' | 'workspace' | 'public';
  metadata: {
    wordCount?: number;
    pageCount?: number;
    chunkCount?: number;
    isKnowledgeBase?: boolean;
    author?: string;
    tags?: string[];
    description?: string;
  };
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  id: string;
  fileId: string;
  chunkId: string;
  content: string;
  similarity: number;
  metadata?: {
    pageNumber?: number;
    startIndex: number;
    endIndex: number;
    wordCount: number;
  };
}

export interface KnowledgeBaseStats {
  totalEmbeddings: number;
  totalFiles: number;
  avgChunksPerFile: number;
}

/**
 * Upload document to knowledge base
 */
export async function uploadDocument(file: File): Promise<{
  success: boolean;
  file: KnowledgeFile;
  parsed: {
    wordCount: number;
    pageCount?: number;
    chunkCount: number;
  };
}> {
  const formData = new FormData();
  formData.append('file', file);

  const { data } = await apiClient.post('/knowledge-base/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });

  return data;
}

/**
 * Search knowledge base
 */
export async function searchKnowledgeBase(options: {
  query: string;
  fileId?: string;
  limit?: number;
  minSimilarity?: number;
}): Promise<{
  success: boolean;
  results: SearchResult[];
  count: number;
}> {
  const { data } = await apiClient.post('/knowledge-base/search', options);
  return data;
}

/**
 * List all knowledge base files
 */
export async function getKnowledgeFiles(): Promise<{
  success: boolean;
  files: KnowledgeFile[];
  count: number;
}> {
  const { data } = await apiClient.get('/knowledge-base/files');
  return data;
}

/**
 * Delete knowledge base file
 */
export async function deleteKnowledgeFile(fileId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const { data } = await apiClient.delete(`/knowledge-base/files/${fileId}`);
  return data;
}

/**
 * Get knowledge base statistics
 */
export async function getKnowledgeBaseStats(): Promise<{
  success: boolean;
  stats: KnowledgeBaseStats;
}> {
  const { data } = await apiClient.get('/knowledge-base/stats');
  return data;
}
