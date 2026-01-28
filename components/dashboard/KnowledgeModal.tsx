'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Upload,
  FileText,
  File,
  FileSpreadsheet,
  FileCode,
  Trash2,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  Database,
  HardDrive,
  Layers,
  Bot,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDashboardStore, useAgents, type KnowledgeFileState } from '@/store/useDashboardStore';

// ============================================================================
// CONSTANTS
// ============================================================================

const ACCEPTED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

const FILE_ICONS: Record<string, React.ElementType> = {
  pdf: FileText,
  txt: File,
  csv: FileSpreadsheet,
  docx: FileText,
  md: FileCode,
  unknown: File,
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  uploading: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  indexing: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  ready: { bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  error: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

// ============================================================================
// DROP ZONE COMPONENT
// ============================================================================

interface DropZoneProps {
  onFilesDropped: (files: FileList) => void;
  isUploading: boolean;
}

function DropZone({ onFilesDropped, isUploading }: DropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        onFilesDropped(e.dataTransfer.files);
      }
    },
    [onFilesDropped]
  );

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        onFilesDropped(e.target.files);
        e.target.value = '';
      }
    },
    [onFilesDropped]
  );

  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      animate={{
        scale: isDragOver ? 1.02 : 1,
        borderColor: isDragOver ? 'rgb(139, 92, 246)' : 'rgb(63, 63, 70)',
      }}
      className={`relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed cursor-pointer transition-colors ${
        isDragOver
          ? 'bg-violet-500/10 border-violet-500'
          : 'bg-card border-border hover:border-muted-foreground hover:bg-muted/50'
      } ${isUploading ? 'pointer-events-none opacity-50' : ''}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleInputChange}
        multiple
        className="hidden"
      />

      <motion.div
        animate={{ y: isDragOver ? -5 : 0 }}
        className={`p-4 rounded-2xl mb-4 ${
          isDragOver ? 'bg-violet-500/20' : 'bg-muted/50'
        }`}
      >
        {isUploading ? (
          <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
        ) : (
          <Upload
            className={`w-8 h-8 ${isDragOver ? 'text-violet-400' : 'text-muted-foreground'}`}
          />
        )}
      </motion.div>

      <p className={`text-sm font-medium mb-1 ${isDragOver ? 'text-violet-300' : 'text-foreground'}`}>
        {isDragOver ? 'Drop files here' : 'Drop files here or click to browse'}
      </p>
      <p className="text-xs text-muted-foreground">
        Supports PDF, TXT, CSV, DOCX, MD
      </p>

      {/* Decorative corners */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-border rounded-tl-lg" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-border rounded-tr-lg" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-border rounded-bl-lg" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-border rounded-br-lg" />
    </motion.div>
  );
}

// ============================================================================
// FILE ITEM COMPONENT
// ============================================================================

interface FileItemProps {
  file: KnowledgeFileState;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
  onToggleExpand: (id: string) => void;
  isExpanded: boolean;
  agents: Array<{ id: string; name: string; color: string }>;
  onToggleAgentAccess: (fileId: string, agentId: string) => void;
}

function FileItem({
  file,
  onRemove,
  onRetry,
  onToggleExpand,
  isExpanded,
  agents,
  onToggleAgentAccess,
}: FileItemProps) {
  const Icon = FILE_ICONS[file.type] || FILE_ICONS.unknown;
  const statusStyle = STATUS_STYLES[file.status];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="bg-zinc-800/50 rounded-xl border border-zinc-700/50 overflow-hidden"
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* File Icon */}
          <div className="p-2.5 rounded-lg bg-zinc-700/50 flex-shrink-0">
            <Icon className="w-5 h-5 text-zinc-400" />
          </div>

          {/* File Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{file.name}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-zinc-500">{formatFileSize(file.size)}</span>
              <span className="text-zinc-600">•</span>
              <span className="text-xs text-zinc-500">{file.type.toUpperCase()}</span>
              {file.chunks && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="text-xs text-zinc-500">{file.chunks} chunks</span>
                </>
              )}
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}
            >
              {file.status === 'uploading' && <Loader2 className="w-3 h-3 animate-spin" />}
              {file.status === 'indexing' && <Loader2 className="w-3 h-3 animate-spin" />}
              {file.status === 'ready' && <CheckCircle className="w-3 h-3" />}
              {file.status === 'error' && <AlertCircle className="w-3 h-3" />}
              <span className="capitalize">{file.status}</span>
            </span>

            {file.status === 'error' && (
              <button
                onClick={() => onRetry(file.id)}
                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 transition-colors"
                title="Retry"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => onRemove(file.id)}
              className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onToggleExpand(file.id)}
              className="p-1.5 rounded-lg bg-zinc-700/50 hover:bg-zinc-700 text-zinc-400 transition-colors"
              title="Agent Access"
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        {(file.status === 'uploading' || file.status === 'indexing') && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-3"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-zinc-500">
                {file.status === 'uploading' ? 'Uploading...' : 'Indexing...'}
              </span>
              <span className="text-xs text-zinc-400">{file.progress}%</span>
            </div>
            <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${file.progress}%` }}
                transition={{ duration: 0.3 }}
                className={`h-full rounded-full ${
                  file.status === 'uploading'
                    ? 'bg-blue-500'
                    : 'bg-gradient-to-r from-amber-500 to-orange-500'
                }`}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Agent Access Section */}
      <AnimatePresence>
        {isExpanded && file.status === 'ready' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-t border-border"
          >
            <div className="p-4 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-3">Agent Access</p>
              <div className="flex flex-wrap gap-2">
                {agents.map((agent) => {
                  const hasAccess = file.accessibleBy.includes(agent.id);
                  return (
                    <button
                      key={agent.id}
                      onClick={() => onToggleAgentAccess(file.id, agent.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        hasAccess
                          ? 'bg-opacity-20 border'
                          : 'bg-muted text-muted-foreground hover:text-foreground'
                      }`}
                      style={
                        hasAccess
                          ? {
                              backgroundColor: `${agent.color}20`,
                              borderColor: `${agent.color}40`,
                              color: agent.color,
                            }
                          : {}
                      }
                    >
                      <Bot className="w-3 h-3" />
                      {agent.name}
                      {hasAccess && <CheckCircle className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================================================
// MAIN KNOWLEDGE MODAL COMPONENT
// ============================================================================

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KnowledgeModal({ isOpen, onClose }: KnowledgeModalProps) {
  const [expandedFileId, setExpandedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Store selectors
  const files = useDashboardStore((state) => state.files);
  const isUploading = useDashboardStore((state) => state.isUploading);
  const knowledgeBase = useDashboardStore((state) => state.knowledgeBase);
  const agents = useAgents();

  // Store actions
  const uploadFile = useDashboardStore((state) => state.uploadFile);
  const removeFile = useDashboardStore((state) => state.removeFile);
  const retryIndexing = useDashboardStore((state) => state.retryIndexing);
  const toggleFileAccess = useDashboardStore((state) => state.toggleFileAccess);
  const addToast = useDashboardStore((state) => state.addToast);
  const updateKnowledgeBase = useDashboardStore((state) => state.updateKnowledgeBase);

  // Handle file upload
  const handleFilesDropped = useCallback(
    async (fileList: FileList) => {
      const files = Array.from(fileList);

      for (const file of files) {
        // Validate file type
        if (!ACCEPTED_TYPES.includes(file.type)) {
          addToast({
            message: `Unsupported file type: ${file.name}`,
            type: 'error',
          });
          continue;
        }

        // Validate file size (max 50MB)
        if (file.size > 50 * 1024 * 1024) {
          addToast({
            message: `File too large: ${file.name} (max 50MB)`,
            type: 'error',
          });
          continue;
        }

        try {
          await uploadFile(file);
          addToast({
            message: `${file.name} uploaded and indexed`,
            type: 'success',
          });

          // Update knowledge base count
          updateKnowledgeBase({
            documentCount: knowledgeBase.documentCount + 1,
            lastSyncedAt: new Date(),
          });
        } catch (error) {
          addToast({
            message: `Failed to upload ${file.name}`,
            type: 'error',
          });
        }
      }
    },
    [uploadFile, addToast, updateKnowledgeBase, knowledgeBase.documentCount]
  );

  // Handle file removal
  const handleRemove = useCallback(
    (fileId: string) => {
      removeFile(fileId);
      addToast({
        message: 'File removed from knowledge base',
        type: 'info',
      });
      updateKnowledgeBase({
        documentCount: Math.max(0, knowledgeBase.documentCount - 1),
      });
    },
    [removeFile, addToast, updateKnowledgeBase, knowledgeBase.documentCount]
  );

  // Handle retry
  const handleRetry = useCallback(
    async (fileId: string) => {
      await retryIndexing(fileId);
      addToast({
        message: 'File re-indexed successfully',
        type: 'success',
      });
    },
    [retryIndexing, addToast]
  );

  // Toggle expand
  const handleToggleExpand = useCallback((fileId: string) => {
    setExpandedFileId((prev) => (prev === fileId ? null : fileId));
  }, []);

  // Toggle agent access
  const handleToggleAgentAccess = useCallback(
    (fileId: string, agentId: string) => {
      toggleFileAccess(fileId, agentId);
    },
    [toggleFileAccess]
  );

  // Filter files
  const filteredFiles = files.filter((file) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Stats
  const totalStorage = files.reduce((sum, f) => sum + f.size, 0);
  const totalChunks = files.reduce((sum, f) => sum + (f.chunks || 0), 0);
  const readyFiles = files.filter((f) => f.status === 'ready').length;

  // Agent list for access control
  const agentList = agents.map((a) => ({ id: a.id, name: a.name, color: a.color }));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-violet-400" />
            Knowledge Base Manager
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Stats Bar */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-violet-400" />
                <span className="text-xs text-zinc-500">Documents</span>
              </div>
              <p className="text-lg font-bold text-white">{readyFiles}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-zinc-500">Chunks</span>
              </div>
              <p className="text-lg font-bold text-white">{totalChunks.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <HardDrive className="w-4 h-4 text-emerald-400" />
                <span className="text-xs text-zinc-500">Storage</span>
              </div>
              <p className="text-lg font-bold text-white">{formatFileSize(totalStorage)}</p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-800/50 border border-zinc-700/50">
              <div className="flex items-center gap-2 mb-1">
                <Bot className="w-4 h-4 text-amber-400" />
                <span className="text-xs text-zinc-500">Agents</span>
              </div>
              <p className="text-lg font-bold text-white">{agents.length}</p>
            </div>
          </div>

          {/* Upload Zone */}
          <DropZone onFilesDropped={handleFilesDropped} isUploading={isUploading} />

          {/* Search */}
          {files.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-zinc-800/50 border border-zinc-700 rounded-xl text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {/* File List */}
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {filteredFiles.map((file) => (
                <FileItem
                  key={file.id}
                  file={file}
                  onRemove={handleRemove}
                  onRetry={handleRetry}
                  onToggleExpand={handleToggleExpand}
                  isExpanded={expandedFileId === file.id}
                  agents={agentList}
                  onToggleAgentAccess={handleToggleAgentAccess}
                />
              ))}
            </AnimatePresence>

            {filteredFiles.length === 0 && files.length > 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500">No files match your search</p>
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-8">
                <p className="text-sm text-zinc-500">
                  No files uploaded yet. Drop files above to get started.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
          <p className="text-xs text-zinc-500">
            {files.length} file{files.length !== 1 ? 's' : ''} in knowledge base
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium text-white transition-colors"
          >
            Close
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KnowledgeModal;
