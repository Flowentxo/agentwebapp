'use client';

/**
 * FILE UPLOAD ZONE
 *
 * Drag & Drop file upload for knowledge base
 */

import { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadDocument } from '@/lib/api/knowledge-base-client';

interface FileUploadZoneProps {
  onUploadComplete?: () => void;
}

export function FileUploadZone({ onUploadComplete }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileUpload(files[0]);
    }
  }, []);

  const handleFileUpload = async (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      setUploadStatus({
        type: 'error',
        message: `File type "${file.type}" is not supported. Supported: PDF, Word, Text, Markdown.`
      });
      return;
    }

    // Validate file size (50MB max)
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadStatus({
        type: 'error',
        message: `File size exceeds 50MB limit. File size: ${(file.size / 1024 / 1024).toFixed(2)}MB`
      });
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus({ type: null, message: '' });

      console.log('[FileUpload] Uploading:', file.name);

      const result = await uploadDocument(file);

      console.log('[FileUpload] Upload complete:', result);

      setUploadStatus({
        type: 'success',
        message: `Successfully uploaded "${file.name}" - ${result.parsed.chunkCount} chunks created`
      });

      // Call callback
      onUploadComplete?.();

      // Clear success message after 5 seconds
      setTimeout(() => {
        setUploadStatus({ type: null, message: '' });
      }, 5000);

    } catch (error: any) {
      console.error('[FileUpload] Upload failed:', error);
      setUploadStatus({
        type: 'error',
        message: `Upload failed: ${error.response?.data?.message || error.message}`
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative rounded-lg border-2 border-dashed p-8 text-center transition
          ${isDragging
            ? 'border-[rgb(var(--accent))] bg-[rgb(var(--accent))]/10'
            : 'border-white/20 bg-surface-1 hover:border-white/30'
          }
          ${isUploading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
        `}
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          onChange={handleFileSelect}
          accept=".pdf,.doc,.docx,.txt,.md"
          disabled={isUploading}
        />

        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            {isUploading ? (
              <Loader2 className="h-12 w-12 animate-spin text-[rgb(var(--accent))]" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[rgb(var(--accent))]/20">
                <Upload className="h-8 w-8 text-[rgb(var(--accent))]" />
              </div>
            )}

            <div>
              <p className="text-lg font-semibold text-text">
                {isUploading ? 'Uploading...' : 'Drop files here or click to upload'}
              </p>
              <p className="text-sm text-text-muted mt-2">
                Supported: PDF, Word (.docx), Text (.txt), Markdown (.md)
              </p>
              <p className="text-xs text-text-muted mt-1">
                Max file size: 50MB
              </p>
            </div>

            {!isUploading && (
              <div className="flex gap-2 mt-2">
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <FileText className="h-3 w-3" />
                  PDF
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <FileText className="h-3 w-3" />
                  Word
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <FileText className="h-3 w-3" />
                  Text
                </div>
                <div className="flex items-center gap-1 text-xs text-text-muted">
                  <FileText className="h-3 w-3" />
                  Markdown
                </div>
              </div>
            )}
          </div>
        </label>
      </div>

      {/* Status Messages */}
      <AnimatePresence>
        {uploadStatus.type && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`
              rounded-lg border p-4 flex items-start gap-3
              ${uploadStatus.type === 'success'
                ? 'border-green-500/20 bg-green-500/10'
                : 'border-red-500/20 bg-red-500/10'
              }
            `}
          >
            {uploadStatus.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <p className={`text-sm ${uploadStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                {uploadStatus.message}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
