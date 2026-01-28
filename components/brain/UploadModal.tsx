// 🎨 Upload Modal - Modern Drag & Drop Interface
'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload,
  X,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  FileCode,
  Check,
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { ButtonV2 } from '@/components/ui/button-v2';
import { CardV2 } from '@/components/ui/card-v2';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  onClose: () => void;
}

interface UploadFile {
  file: File;
  id: string;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function UploadModal({ onClose }: UploadModalProps) {
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      addFiles(selectedFiles);
    }
  }, []);

  const addFiles = (newFiles: File[]) => {
    const uploadFiles: UploadFile[] = newFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      progress: 0,
      status: 'pending',
    }));

    setFiles(prev => [...prev, ...uploadFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleUpload = async () => {
    setIsUploading(true);

    for (const uploadFile of files) {
      if (uploadFile.status !== 'pending') continue;

      // Update to uploading
      setFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
        )
      );

      try {
        // Simulate upload with progress
        await simulateUpload(uploadFile.id);

        // Mark as success
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id ? { ...f, status: 'success', progress: 100 } : f
          )
        );
      } catch (error) {
        // Mark as error
        setFiles(prev =>
          prev.map(f =>
            f.id === uploadFile.id
              ? { ...f, status: 'error', error: 'Upload failed' }
              : f
          )
        );
      }
    }

    setIsUploading(false);
  };

  const simulateUpload = (id: string): Promise<void> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 30;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          resolve();
        }

        setFiles(prev =>
          prev.map(f => (f.id === id ? { ...f, progress: Math.min(progress, 100) } : f))
        );
      }, 300);
    });
  };

  const allSuccessful = files.length > 0 && files.every(f => f.status === 'success');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[90vh] flex flex-col"
      >
        <CardV2 variant="elevated" padding="none" className="overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
                <Upload className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
                  Upload Documents
                </h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Add files to your knowledge base
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <X className="h-5 w-5 text-neutral-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[60vh]">
            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200',
                isDragging
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 scale-[1.02]'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-indigo-400 dark:hover:border-indigo-600'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.json"
              />

              {/* Upload Illustration */}
              <motion.div
                animate={{ y: isDragging ? -10 : 0 }}
                transition={{ type: 'spring', damping: 10 }}
                className="mx-auto mb-6"
              >
                <div className="relative w-24 h-24 mx-auto">
                  <motion.div
                    animate={{
                      scale: isDragging ? 1.1 : 1,
                      rotate: isDragging ? 5 : 0,
                    }}
                    className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 rounded-2xl"
                  />
                  <motion.div
                    animate={{
                      y: isDragging ? -5 : 0,
                    }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <Upload className="h-12 w-12 text-indigo-600 dark:text-indigo-400" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Text */}
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
                {isDragging ? 'Drop files here' : 'Drop files to upload'}
              </h3>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                or click to browse
              </p>

              {/* Browse Button */}
              <ButtonV2
                variant="primary"
                size="lg"
                onClick={() => fileInputRef.current?.click()}
              >
                Browse Files
              </ButtonV2>

              {/* Supported Formats */}
              <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-4">
                Supports: PDF, DOC, TXT, MD, CSV, XLSX, JSON
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                  Files ({files.length})
                </h4>

                <AnimatePresence>
                  {files.map((uploadFile, index) => (
                    <FileItem
                      key={uploadFile.id}
                      uploadFile={uploadFile}
                      index={index}
                      onRemove={() => removeFile(uploadFile.id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50">
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              {files.length > 0 && (
                <span>
                  {files.filter(f => f.status === 'success').length} of {files.length} uploaded
                </span>
              )}
            </div>

            <div className="flex gap-3">
              <ButtonV2 variant="secondary" onClick={onClose}>
                {allSuccessful ? 'Done' : 'Cancel'}
              </ButtonV2>
              {!allSuccessful && files.length > 0 && (
                <ButtonV2
                  variant="primary"
                  onClick={handleUpload}
                  disabled={isUploading}
                  loading={isUploading}
                  loadingText="Uploading..."
                >
                  Upload {files.length} {files.length === 1 ? 'File' : 'Files'}
                </ButtonV2>
              )}
            </div>
          </div>
        </CardV2>
      </motion.div>
    </motion.div>
  );
}

// File Item Component
function FileItem({
  uploadFile,
  index,
  onRemove,
}: {
  uploadFile: UploadFile;
  index: number;
  onRemove: () => void;
}) {
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
        return FileText;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Image;
      case 'csv':
      case 'xlsx':
        return FileSpreadsheet;
      case 'json':
      case 'js':
      case 'ts':
        return FileCode;
      default:
        return File;
    }
  };

  const Icon = getFileIcon(uploadFile.file.name);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.05 }}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-all',
        uploadFile.status === 'success'
          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20'
          : uploadFile.status === 'error'
          ? 'border-red-500/30 dark:border-red-800 bg-red-500/10 dark:bg-red-950/20'
          : 'border-neutral-200 dark:border-neutral-800'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg',
          uploadFile.status === 'success'
            ? 'bg-green-100 dark:bg-green-900/30'
            : uploadFile.status === 'error'
            ? 'bg-red-500/20 dark:bg-red-900/30'
            : 'bg-neutral-100 dark:bg-neutral-800'
        )}
      >
        {uploadFile.status === 'success' ? (
          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : uploadFile.status === 'error' ? (
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
        ) : uploadFile.status === 'uploading' ? (
          <Loader2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 animate-spin" />
        ) : (
          <Icon className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
        )}
      </div>

      {/* File Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h5 className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
            {uploadFile.file.name}
          </h5>
          <span className="text-xs text-neutral-500 dark:text-neutral-400 ml-2">
            {(uploadFile.file.size / 1024).toFixed(1)} KB
          </span>
        </div>

        {/* Progress Bar */}
        {uploadFile.status === 'uploading' && (
          <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${uploadFile.progress}%` }}
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-600"
            />
          </div>
        )}

        {/* Status Text */}
        {uploadFile.status === 'success' && (
          <p className="text-xs text-green-600 dark:text-green-400">Uploaded successfully</p>
        )}
        {uploadFile.status === 'error' && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {uploadFile.error || 'Upload failed'}
          </p>
        )}
        {uploadFile.status === 'uploading' && (
          <p className="text-xs text-indigo-600 dark:text-indigo-400">
            Uploading... {Math.round(uploadFile.progress)}%
          </p>
        )}
      </div>

      {/* Remove Button */}
      {uploadFile.status !== 'uploading' && (
        <button
          onClick={onRemove}
          className="p-2 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          <Trash2 className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
        </button>
      )}
    </motion.div>
  );
}
