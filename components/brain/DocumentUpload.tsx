'use client';

import { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Loader, File } from 'lucide-react';
import { DocumentInsightsPanel } from './DocumentInsightsPanel';

interface UploadedDocument {
  filename: string;
  fileType: string;
  fileSize: number;
  wordCount: number;
  pageCount?: number;
  chunks: number;
  insights: {
    summary: string;
    keyTopics: string[];
    actionItems: string[];
    entities: {
      people: string[];
      organizations: string[];
      locations: string[];
    };
    sentiment: {
      overall: 'positive' | 'negative' | 'neutral';
      score: number;
    };
  };
  memoryIds: string[];
}

export function DocumentUpload() {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadFile(files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);
    setUploadedDoc(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/brain/upload', {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user',
        },
        body: formData,
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadedDoc(result.data);
    } catch (err: any) {
      setError(err.message || 'Failed to upload document');
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getSentimentColor = (sentiment: string) => {
    const colors: Record<string, string> = {
      positive: 'text-green-400',
      neutral: 'text-muted-foreground',
      negative: 'text-red-400',
    };
    return colors[sentiment] || 'text-muted-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30">
          <Upload className="h-5 w-5 text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold oracle-text-primary-color">Document Upload</h2>
          <p className="text-sm oracle-text-secondary-color">Upload PDF, DOCX, TXT, or Markdown files to Brain AI</p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10'
            : 'border-gray-700 bg-gradient-to-br from-gray-800/50 to-gray-900/30 hover:border-blue-500/50 hover:bg-blue-500/10'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.doc,.txt,.md,.csv"
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-4">
            <Loader className="h-12 w-12 text-blue-400 animate-spin" />
            <p className="oracle-text-primary-color font-medium">Processing document...</p>
            <p className="text-sm oracle-text-secondary-color">Extracting text, analyzing content, storing in Brain AI</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/30">
              <FileText className="h-8 w-8 text-blue-400" />
            </div>
            <div>
              <p className="oracle-text-primary-color font-medium mb-1">
                Drag & drop your document here
              </p>
              <p className="text-sm oracle-text-secondary-color">
                or click to browse (PDF, DOCX, TXT, MD, CSV)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs oracle-text-tertiary-color">
              <File className="h-3 w-3" />
              <span>Max file size: 10MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-400 font-medium">Upload Failed</p>
            <p className="text-sm oracle-text-secondary-color mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success with Insights */}
      {uploadedDoc && (
        <div className="space-y-4">
          {/* Success Header */}
          <div className="rounded-xl bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 p-4 flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-green-400 font-medium mb-2">Document Processed Successfully!</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="oracle-text-secondary-color">File:</span>
                  <p className="oracle-text-primary-color font-medium truncate">{uploadedDoc.filename}</p>
                </div>
                <div>
                  <span className="oracle-text-secondary-color">Size:</span>
                  <p className="oracle-text-primary-color font-medium">{formatFileSize(uploadedDoc.fileSize)}</p>
                </div>
                <div>
                  <span className="oracle-text-secondary-color">Words:</span>
                  <p className="oracle-text-primary-color font-medium">{uploadedDoc.wordCount?.toLocaleString() || 'N/A'}</p>
                </div>
                <div>
                  <span className="oracle-text-secondary-color">Chunks:</span>
                  <p className="oracle-text-primary-color font-medium">{uploadedDoc.chunks} stored in Brain AI</p>
                </div>
              </div>
            </div>
          </div>

          {/* AI Insights - New Component */}
          {uploadedDoc.insights && (
            <DocumentInsightsPanel
              insights={uploadedDoc.insights}
              fileName={uploadedDoc.filename}
            />
          )}
        </div>
      )}
    </div>
  );
}
