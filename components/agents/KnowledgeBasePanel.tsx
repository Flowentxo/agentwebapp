'use client';

/**
 * KNOWLEDGE BASE PANEL
 *
 * Upload and manage files for RAG-powered agent knowledge
 */

import { useState, useRef } from 'react';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  chunkCount?: number;
  uploadedAt: Date;
}

interface KnowledgeBasePanelProps {
  agentId?: string;
}

const SUPPORTED_FILE_TYPES = [
  '.pdf',
  '.txt',
  '.md',
  '.docx',
  '.doc',
  '.csv',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function KnowledgeBasePanel({ agentId }: KnowledgeBasePanelProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];

      // Validate file type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!SUPPORTED_FILE_TYPES.includes(fileExtension)) {
        alert(`File type ${fileExtension} is not supported`);
        continue;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        alert(`File ${file.name} is too large (max ${formatFileSize(MAX_FILE_SIZE)})`);
        continue;
      }

      try {
        await uploadFile(file);
      } catch (error) {
        console.error('Upload failed:', error);
      }
    }

    setIsUploading(false);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadFile = async (file: File) => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;

    // Add to files list with pending status
    const newFile: UploadedFile = {
      id: tempId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      status: 'pending',
      uploadedAt: new Date(),
    };

    setFiles((prev) => [...prev, newFile]);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);
      if (agentId) {
        formData.append('agentId', agentId);
      }

      // Update status to processing
      setFiles((prev) =>
        prev.map((f) => (f.id === tempId ? { ...f, status: 'processing' } : f))
      );

      const response = await fetch('/api/knowledge-base/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const result = await response.json();

      // Update with real ID and completed status
      setFiles((prev) =>
        prev.map((f) =>
          f.id === tempId
            ? {
                ...f,
                id: result.id,
                status: 'completed',
                chunkCount: result.chunkCount,
              }
            : f
        )
      );
    } catch (error) {
      console.error('Upload error:', error);

      // Mark as failed
      setFiles((prev) =>
        prev.map((f) => (f.id === tempId ? { ...f, status: 'failed' } : f))
      );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const handleRemoveFile = async (fileId: string) => {
    try {
      await fetch(`/api/knowledge-base/${fileId}`, {
        method: 'DELETE',
      });

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-purple-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-text mb-2">Knowledge Base</h3>
        <p className="text-sm text-text-muted">
          Upload files to give your agent custom knowledge. Supported formats: PDF, TXT, MD, DOCX, CSV
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={SUPPORTED_FILE_TYPES.join(',')}
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        <Upload
          className={`h-12 w-12 mx-auto mb-4 transition-colors ${
            isDragging ? 'text-primary' : 'text-text-muted'
          }`}
        />

        <h4 className="text-lg font-medium text-text mb-2">
          {isDragging ? 'Drop files here' : 'Upload Knowledge Files'}
        </h4>

        <p className="text-sm text-text-muted mb-4">
          Drag & drop files here, or click to browse
        </p>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Uploading...
            </>
          ) : (
            'Choose Files'
          )}
        </button>

        <p className="text-xs text-text-muted mt-4">
          Max file size: {formatFileSize(MAX_FILE_SIZE)}
        </p>
      </div>

      {/* Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-text">
            Uploaded Files ({files.length})
          </h4>

          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border bg-surface"
              >
                <div className="flex items-center gap-3 flex-1">
                  <File className="h-5 w-5 text-text-muted flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text truncate">
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>{formatFileSize(file.fileSize)}</span>
                      {file.chunkCount && (
                        <>
                          <span>•</span>
                          <span>{file.chunkCount} chunks</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {getStatusIcon(file.status)}
                  {file.status === 'completed' && (
                    <button
                      onClick={() => handleRemoveFile(file.id)}
                      className="p-1 rounded hover:bg-red-500/10 text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="rounded-lg border border-border bg-surface p-4">
        <h4 className="text-sm font-medium text-text mb-2">💡 How it works</h4>
        <ul className="text-xs text-text-muted space-y-1">
          <li>• Files are automatically processed and chunked</li>
          <li>• Vector embeddings are generated for semantic search</li>
          <li>• Your agent will search this knowledge when answering</li>
          <li>• Supports context-aware retrieval (RAG)</li>
        </ul>
      </div>
    </div>
  );
}
