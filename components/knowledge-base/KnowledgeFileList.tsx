'use client';

/**
 * KNOWLEDGE FILE LIST
 *
 * Display and manage knowledge base files
 */

import { useState } from 'react';
import {
  FileText,
  Trash2,
  Download,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeFile, deleteKnowledgeFile } from '@/lib/api/knowledge-base-client';
import { formatDistanceToNow } from 'date-fns';

interface KnowledgeFileListProps {
  files: KnowledgeFile[];
  isLoading: boolean;
  onFileDeleted?: () => void;
}

export function KnowledgeFileList({ files, isLoading, onFileDeleted }: KnowledgeFileListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"? This will also delete all embeddings.`)) {
      return;
    }

    try {
      setDeletingId(fileId);
      await deleteKnowledgeFile(fileId);
      console.log('[FileList] File deleted:', fileId);
      onFileDeleted?.();
    } catch (error: any) {
      console.error('[FileList] Delete failed:', error);
      alert(`Failed to delete file: ${error.message}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      ready: 'bg-green-500/20 text-green-500',
      processing: 'bg-blue-500/20 text-blue-500',
      failed: 'bg-red-500/20 text-red-500',
      uploading: 'bg-yellow-500/20 text-yellow-500'
    };

    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status as keyof typeof colors] || 'bg-muted/500/20 text-muted-foreground'}`}>
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/pdf') {
      return '📄';
    } else if (mimeType.includes('word')) {
      return '📝';
    } else if (mimeType.includes('text')) {
      return '📃';
    } else {
      return '📁';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--accent))] mx-auto mb-4" />
          <p className="text-sm text-text-muted">Loading knowledge base...</p>
        </div>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <FileText className="h-12 w-12 text-text-muted mx-auto mb-4 opacity-50" />
          <p className="text-sm text-text-muted">No documents in knowledge base</p>
          <p className="text-xs text-text-muted mt-1">Upload a document to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {files.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -100 }}
            transition={{ delay: index * 0.05 }}
            className="group rounded-lg border border-white/10 bg-surface-1 p-4 hover:border-white/20 hover:bg-card/5 transition"
          >
            <div className="flex items-start gap-4">
              {/* File Icon */}
              <div className="text-3xl flex-shrink-0">
                {getFileIcon(file.mimeType)}
              </div>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-text truncate">
                      {file.originalFilename}
                    </h4>
                    <p className="text-xs text-text-muted mt-1">
                      {formatFileSize(file.size)} • {formatDistanceToNow(new Date(file.uploadedAt), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Status Badge */}
                  {getStatusBadge(file.status)}
                </div>

                {/* Metadata */}
                {file.metadata && (
                  <div className="flex flex-wrap gap-3 text-xs text-text-muted mb-3">
                    {file.metadata.wordCount && (
                      <div className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {file.metadata.wordCount.toLocaleString()} words
                      </div>
                    )}
                    {file.metadata.pageCount && (
                      <div className="flex items-center gap-1">
                        <FileIcon className="h-3 w-3" />
                        {file.metadata.pageCount} pages
                      </div>
                    )}
                    {file.metadata.chunkCount && (
                      <div className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {file.metadata.chunkCount} chunks
                      </div>
                    )}
                  </div>
                )}

                {/* Error Message */}
                {file.status === 'failed' && file.processingError && (
                  <div className="text-xs text-red-500 bg-red-500/10 rounded px-2 py-1 mb-2">
                    Error: {file.processingError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                  {file.url && (
                    <button
                      onClick={() => window.open(file.url, '_blank')}
                      className="text-xs text-text-muted hover:text-[rgb(var(--accent))] transition flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(file.id, file.originalFilename)}
                    disabled={deletingId === file.id}
                    className="text-xs text-text-muted hover:text-red-500 transition flex items-center gap-1 disabled:opacity-50"
                  >
                    {deletingId === file.id ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
