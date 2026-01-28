'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Database,
  Brain,
  RefreshCw,
  X,
  FileText,
  Layers,
  HardDrive,
  Cpu,
  CheckCircle,
} from 'lucide-react';
import {
  useDashboardStore,
  useDocumentCount,
  useIsSyncing,
  useLastSyncedAt,
  useKnowledgeBase,
} from '@/store/useDashboardStore';
import { useRelativeTime, useStoreHydration } from '@/hooks/useHydratedStore';

// ============================================================================
// KNOWLEDGE BASE DETAILS POPUP
// ============================================================================

interface KnowledgeBasePopupProps {
  isOpen: boolean;
  onClose: () => void;
}

function KnowledgeBasePopup({ isOpen, onClose }: KnowledgeBasePopupProps) {
  const knowledgeBase = useKnowledgeBase();
  const lastSyncedAt = useLastSyncedAt();
  const relativeTime = useRelativeTime(lastSyncedAt);

  const stats = [
    {
      icon: FileText,
      label: 'Documents',
      value: knowledgeBase.documentCount.toLocaleString(),
      color: 'text-violet-400',
      bgColor: 'bg-violet-500/10',
    },
    {
      icon: Layers,
      label: 'Chunks',
      value: knowledgeBase.totalChunks.toLocaleString(),
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      icon: Cpu,
      label: 'Dimensions',
      value: knowledgeBase.vectorDimensions.toLocaleString(),
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      icon: HardDrive,
      label: 'Storage',
      value: `${knowledgeBase.storageUsedMb.toFixed(1)} MB`,
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 rounded-xl shadow-2xl overflow-hidden z-50 min-w-[320px]
              bg-white dark:bg-zinc-900/90
              dark:backdrop-blur-xl
              border border-gray-200 dark:border-white/[0.08]"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-white/[0.06]">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-violet-400" />
                <h4 className="text-sm font-semibold text-foreground">Knowledge Base Details</h4>
              </div>
              <button
                onClick={onClose}
                className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stats Grid */}
            <div className="p-4 grid grid-cols-2 gap-3">
              {stats.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`p-1.5 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                    </div>
                    <span className="text-xs text-muted-foreground">{stat.label}</span>
                  </div>
                  <p className="text-lg font-bold text-foreground tabular-nums">{stat.value}</p>
                </motion.div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-zinc-400">Last synced: {relativeTime}</span>
                </div>
                <span className="text-xs text-zinc-500">OpenAI Embeddings</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// KNOWLEDGE BASE CARD COMPONENT
// ============================================================================

interface KnowledgeBaseCardProps {
  index?: number;
  isLoading?: boolean;
  onClick?: () => void; // Level 5: Opens KnowledgeModal
}

export function KnowledgeBaseCard({ index = 0, isLoading = false, onClick }: KnowledgeBaseCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isHydrated = useStoreHydration();

  // Store selectors
  const documentCount = useDocumentCount();
  const isSyncing = useIsSyncing();
  const lastSyncedAt = useLastSyncedAt();
  const syncKnowledgeBase = useDashboardStore((state) => state.syncKnowledgeBase);

  // Relative time display
  const relativeTime = useRelativeTime(lastSyncedAt);

  const handleSync = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card expansion
    if (!isSyncing) {
      await syncKnowledgeBase();
    }
  }, [isSyncing, syncKnowledgeBase]);

  const handleCardClick = useCallback(() => {
    if (!isSyncing) {
      // Level 5: If onClick prop is provided, open KnowledgeModal instead of popup
      if (onClick) {
        onClick();
      } else {
        setIsExpanded((prev) => !prev);
      }
    }
  }, [isSyncing, onClick]);

  // Show skeleton during hydration
  if (!isHydrated || isLoading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
        className="relative p-5 rounded-2xl
          bg-white dark:bg-zinc-900/40
          dark:backdrop-blur-xl
          border border-gray-200 dark:border-white/[0.06]
          shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
          dark:ring-1 dark:ring-inset dark:ring-white/[0.02]"
      >
        <div className="animate-pulse">
          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-white/[0.04]" />
          <div className="mt-4 h-4 w-24 rounded bg-gray-100 dark:bg-white/[0.04]" />
          <div className="mt-2 h-8 w-20 rounded bg-gray-100 dark:bg-white/[0.04]" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 + index * 0.05 }}
      className={`relative p-5 rounded-2xl transition-all duration-300 group overflow-hidden cursor-pointer
        bg-white dark:bg-zinc-900/40
        dark:backdrop-blur-xl
        border border-gray-200 dark:border-white/[0.06]
        shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)] dark:shadow-none
        dark:ring-1 dark:ring-inset dark:ring-white/[0.02]
        hover:border-violet-300 hover:shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-2px_rgba(0,0,0,0.05)] dark:hover:ring-violet-500/10 dark:hover:shadow-[0_0_30px_rgba(139,92,246,0.08)] ${
        isSyncing ? 'dark:ring-violet-500/20 border-violet-400' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Syncing Background Animation */}
      <AnimatePresence>
        {isSyncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-r from-violet-500/5 via-purple-500/10 to-violet-500/5 animate-pulse"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative flex items-start justify-between z-10">
        <div className="p-2.5 rounded-xl w-fit bg-violet-500 dark:bg-violet-500/10 border border-violet-500 dark:border-violet-500/20">
          {isSyncing ? (
            <RefreshCw className="w-5 h-5 text-white dark:text-violet-400 animate-spin" />
          ) : (
            <Database className="w-5 h-5 text-white dark:text-violet-400" />
          )}
        </div>

        {/* Sync Button */}
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className={`p-1.5 rounded-lg transition-all ${
            isSyncing
              ? 'bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 cursor-not-allowed'
              : 'bg-gray-100 dark:bg-zinc-800/50 text-zinc-500 hover:text-zinc-700 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-zinc-800'
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Content */}
      <div className="relative mt-4 z-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">Knowledge Base</p>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-3xl font-black text-gray-900 dark:text-white tabular-nums group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
            {isSyncing ? (
              <span className="flex items-center gap-2">
                <span className="text-lg">Syncing...</span>
              </span>
            ) : (
              `${documentCount} Docs`
            )}
          </p>
        </div>
      </div>

      {/* Subtext */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative mt-2 text-[10px] text-zinc-500 z-10"
      >
        {isSyncing ? 'Indexing documents...' : `Synced ${relativeTime}`}
      </motion.p>

      {/* Expandable Hint */}
      {!isSyncing && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative mt-1 text-[10px] text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity z-10"
        >
          {onClick ? 'Click to manage' : 'Click for details'}
        </motion.p>
      )}

      {/* Details Popup */}
      <KnowledgeBasePopup
        isOpen={isExpanded}
        onClose={() => setIsExpanded(false)}
      />
    </motion.div>
  );
}

export default KnowledgeBaseCard;
