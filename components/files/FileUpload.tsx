'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

interface FileUploadProps {
  workspaceId?: string;
  onUploadComplete?: (file: UploadedFile) => void;
  maxSize?: number; // in MB
  accept?: Record<string, string[]>;
}

interface UploadedFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
}

interface UploadStatus {
  file: File;
  status: 'uploading' | 'success' | 'error';
  progress: number;
  uploadedFile?: UploadedFile;
  error?: string;
}

export function FileUpload({
  workspaceId,
  onUploadComplete,
  maxSize = 50, // 50MB default
  accept = {
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/vnd.ms-excel': ['.xls'],
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    'text/plain': ['.txt'],
    'text/csv': ['.csv'],
  }
}: FileUploadProps) {
  const [uploads, setUploads] = useState<UploadStatus[]>([]);

  const uploadFile = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('visibility', 'workspace');

    if (workspaceId) {
      formData.append('workspaceId', workspaceId);
    }

    try {
      const response = await fetch(`${API_BASE}/files/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user',
          ...(workspaceId && { 'x-workspace-id': workspaceId }),
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      return data.file as UploadedFile;
    } catch (error) {
      console.error('[FILE_UPLOAD]', error);
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Initialize upload status for all files
    const newUploads: UploadStatus[] = acceptedFiles.map((file) => ({
      file,
      status: 'uploading' as const,
      progress: 0,
    }));

    setUploads((prev) => [...prev, ...newUploads]);

    // Upload files sequentially
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const uploadIndex = uploads.length + i;

      try {
        // Simulate progress (since FormData upload doesn't provide progress)
        setUploads((prev) => {
          const updated = [...prev];
          updated[uploadIndex] = { ...updated[uploadIndex], progress: 50 };
          return updated;
        });

        const uploadedFile = await uploadFile(file);

        setUploads((prev) => {
          const updated = [...prev];
          updated[uploadIndex] = {
            ...updated[uploadIndex],
            status: 'success',
            progress: 100,
            uploadedFile,
          };
          return updated;
        });

        onUploadComplete?.(uploadedFile);
      } catch (error) {
        setUploads((prev) => {
          const updated = [...prev];
          updated[uploadIndex] = {
            ...updated[uploadIndex],
            status: 'error',
            progress: 0,
            error: error instanceof Error ? error.message : 'Upload failed',
          };
          return updated;
        });
      }
    }
  }, [uploads.length, workspaceId, onUploadComplete]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxSize: maxSize * 1024 * 1024, // Convert MB to bytes
  });

  const removeUpload = (index: number) => {
    setUploads((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-200
          ${
            isDragActive
              ? 'border-primary bg-primary/5 scale-[1.02]'
              : 'border-border hover:border-primary hover:bg-muted/50'
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-3">
          <div
            className={`
              p-4 rounded-full transition-all
              ${isDragActive ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}
            `}
          >
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <p className="text-lg font-medium text-foreground">
              {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse (max {maxSize}MB per file)
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {Object.keys(accept).map((mimeType) => (
              <span
                key={mimeType}
                className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded"
              >
                {accept[mimeType].join(', ')}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Upload Progress */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Uploads</h3>

          {uploads.map((upload, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg"
            >
              {/* Icon */}
              <div className="flex-shrink-0">
                {upload.status === 'uploading' && (
                  <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                {upload.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {upload.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
              </div>

              {/* File info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {upload.file.name}
                  </p>
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    {formatFileSize(upload.file.size)}
                  </span>
                </div>

                {upload.status === 'uploading' && (
                  <div className="mt-1 bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}

                {upload.status === 'success' && (
                  <p className="text-xs text-green-600 mt-1">Upload complete</p>
                )}

                {upload.status === 'error' && (
                  <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                )}
              </div>

              {/* Remove button */}
              <button
                onClick={() => removeUpload(index)}
                className="flex-shrink-0 p-1 hover:bg-muted rounded transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
