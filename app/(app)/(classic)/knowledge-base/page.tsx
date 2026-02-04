'use client';

/**
 * KNOWLEDGE BASE PAGE (RAG)
 *
 * Complete knowledge base management dashboard with RAG
 */

import { useState, useEffect } from 'react';
import { FileUploadZone } from '@/components/knowledge-base/FileUploadZone';
import { KnowledgeFileList } from '@/components/knowledge-base/KnowledgeFileList';
import { SemanticSearch } from '@/components/knowledge-base/SemanticSearch';
import { getKnowledgeFiles, getKnowledgeBaseStats, KnowledgeFile } from '@/lib/api/knowledge-base-client';
import { Brain, Database, FileText, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function KnowledgeBasePage() {
  const [files, setFiles] = useState<KnowledgeFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<{
    totalEmbeddings: number;
    totalFiles: number;
    avgChunksPerFile: number;
  } | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);

      // Load files
      const filesResponse = await getKnowledgeFiles();
      setFiles(filesResponse.files);

      // Load stats
      const statsResponse = await getKnowledgeBaseStats();
      setStats(statsResponse.stats);

    } catch (error: any) {
      console.error('[KnowledgeBase] Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-surface-0">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[rgb(var(--accent))]/20">
              <Brain className="h-6 w-6 text-[rgb(var(--accent))]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text">Knowledge Base (RAG)</h1>
              <p className="text-sm text-text-muted mt-1">
                Upload documents and search with AI-powered semantic search
              </p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              icon={FileText}
              label="Total Documents"
              value={stats.totalFiles}
              color="#8B5CF6"
            />
            <StatCard
              icon={Database}
              label="Total Chunks"
              value={stats.totalEmbeddings}
              color="#10B981"
            />
            <StatCard
              icon={Zap}
              label="Avg Chunks/File"
              value={Math.round(stats.avgChunksPerFile)}
              color="#F59E0B"
            />
          </div>
        )}

        {/* Semantic Search */}
        <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text">Semantic Search</h2>
            <p className="text-sm text-text-muted mt-1">
              Ask questions in natural language across all your documents
            </p>
          </div>
          <SemanticSearch />
        </div>

        {/* File Upload */}
        <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-text">Upload Documents</h2>
            <p className="text-sm text-text-muted mt-1">
              Add documents to your knowledge base for semantic search
            </p>
          </div>
          <FileUploadZone onUploadComplete={loadData} />
        </div>

        {/* File List */}
        <div className="rounded-lg border border-white/10 bg-surface-1 p-6">
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-text">Your Documents</h2>
                <p className="text-sm text-text-muted mt-1">
                  {files.length} document{files.length !== 1 ? 's' : ''} in knowledge base
                </p>
              </div>
              {files.length > 0 && (
                <button
                  onClick={loadData}
                  className="text-sm text-[rgb(var(--accent))] hover:underline"
                >
                  Refresh
                </button>
              )}
            </div>
          </div>

          <KnowledgeFileList
            files={files}
            isLoading={isLoading}
            onFileDeleted={loadData}
          />
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: any;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-white/10 bg-surface-1 p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20` }}
        >
          <Icon className="h-5 w-5" style={{ color }} />
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-2xl font-bold text-text">{value.toLocaleString()}</p>
        <p className="text-xs text-text-muted">{label}</p>
      </div>
    </motion.div>
  );
}
