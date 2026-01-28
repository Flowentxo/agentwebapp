// 🎨 Knowledge Library V2 - Modern Grid/List View
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, List, FileText, Calendar, Tag, MoreVertical, Download, Trash2, Eye } from 'lucide-react';
import { CardV2 } from '@/components/ui/card-v2';
import { ButtonV2 } from '@/components/ui/button-v2';
import { EmptyState } from './EmptyState';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  chunkCount?: number;
}

interface KnowledgeLibraryV2Props {
  searchQuery?: string;
}

export function KnowledgeLibraryV2({ searchQuery = '' }: KnowledgeLibraryV2Props) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocs, setFilteredDocs] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      );
      setFilteredDocs(filtered);
    } else {
      setFilteredDocs(documents);
    }
  }, [searchQuery, documents]);

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/brain/documents');
      const data = await response.json();
      setDocuments(data.documents || []);
      setFilteredDocs(data.documents || []);
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <CardV2 key={i} variant="elevated" padding="md">
            <div className="animate-pulse">
              <div className="h-6 w-3/4 bg-neutral-200 dark:bg-neutral-800 rounded mb-3" />
              <div className="h-4 w-full bg-neutral-200 dark:bg-neutral-800 rounded mb-2" />
              <div className="h-4 w-2/3 bg-neutral-200 dark:bg-neutral-800 rounded mb-4" />
              <div className="flex gap-2">
                <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
                <div className="h-6 w-16 bg-neutral-200 dark:bg-neutral-800 rounded-full" />
              </div>
            </div>
          </CardV2>
        ))}
      </div>
    );
  }

  if (filteredDocs.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={searchQuery ? 'No documents found' : 'No documents yet'}
        description={
          searchQuery
            ? 'Try adjusting your search query'
            : 'Upload your first document to get started with Brain AI'
        }
        illustration="documents"
        action={
          !searchQuery
            ? {
                label: 'Upload Document',
                onClick: () => console.log('Upload'),
                icon: <FileText className="h-4 w-4" />,
              }
            : undefined
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* View Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            Knowledge Library
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {filteredDocs.length} {filteredDocs.length === 1 ? 'document' : 'documents'}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ButtonV2
            variant={viewMode === 'grid' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </ButtonV2>
          <ButtonV2
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </ButtonV2>
        </div>
      </div>

      {/* Documents Grid/List */}
      <AnimatePresence mode="wait">
        {viewMode === 'grid' ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredDocs.map((doc, index) => (
              <DocumentCard key={doc.id} document={doc} index={index} />
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            {filteredDocs.map((doc, index) => (
              <DocumentListItem key={doc.id} document={doc} index={index} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Document Card (Grid View)
function DocumentCard({ document, index }: { document: Document; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <CardV2
        variant="interactive"
        padding="md"
        className="h-full relative overflow-hidden group"
      >
        {/* Document Icon */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30">
            <FileText className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Actions Menu */}
          <button className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
            <MoreVertical className="h-4 w-4 text-neutral-500" />
          </button>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2 line-clamp-2">
          {document.title}
        </h3>

        {/* Preview */}
        <p className="text-sm text-neutral-500 dark:text-neutral-400 line-clamp-3 mb-4">
          {document.content}
        </p>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {document.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-300"
              >
                <Tag className="h-3 w-3" />
                {tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="px-2 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-500">
                +{document.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-neutral-400 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(document.createdAt).toLocaleDateString()}
          </div>
          {document.chunkCount && (
            <div className="text-neutral-500">
              {document.chunkCount} chunks
            </div>
          )}
        </div>

        {/* Hover Actions */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 right-4 flex gap-2"
            >
              <ButtonV2 variant="secondary" size="sm">
                <Eye className="h-3 w-3" />
              </ButtonV2>
              <ButtonV2 variant="secondary" size="sm">
                <Download className="h-3 w-3" />
              </ButtonV2>
            </motion.div>
          )}
        </AnimatePresence>
      </CardV2>
    </motion.div>
  );
}

// Document List Item (List View)
function DocumentListItem({ document, index }: { document: Document; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <CardV2 variant="interactive" padding="md">
        <div className="flex items-center gap-4">
          {/* Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex-shrink-0">
            <FileText className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 mb-1 truncate">
              {document.title}
            </h3>
            <div className="flex items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {new Date(document.createdAt).toLocaleDateString()}
              </div>
              {document.chunkCount && (
                <div>{document.chunkCount} chunks</div>
              )}
              {document.tags && document.tags.length > 0 && (
                <div className="flex items-center gap-1">
                  <Tag className="h-3 w-3" />
                  {document.tags.slice(0, 2).join(', ')}
                  {document.tags.length > 2 && ` +${document.tags.length - 2}`}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <ButtonV2 variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
              View
            </ButtonV2>
            <ButtonV2 variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </ButtonV2>
            <button className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors">
              <MoreVertical className="h-4 w-4 text-neutral-500" />
            </button>
          </div>
        </div>
      </CardV2>
    </motion.div>
  );
}
