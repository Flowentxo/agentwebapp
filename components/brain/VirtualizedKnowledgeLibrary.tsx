'use client';

/**
 * Virtualized Knowledge Library
 * Optimized for rendering large document lists
 *
 * NOTE: Stub component - react-window integration disabled for build compatibility
 */

import { useState, useCallback, useRef } from 'react';
import {
  Upload, FileText, Trash2, Download, Grid, List as ListIcon,
  Search, Filter, ChevronDown, MoreVertical
} from 'lucide-react';

interface Document {
  id: string;
  title: string;
  content: string;
  metadata: {
    tags?: string[];
    category?: string;
    sourceType?: string;
    createdAt?: string;
  };
  tokenCount: number;
  createdBy: string;
}

interface VirtualizedKnowledgeLibraryProps {
  initialDocuments?: Document[];
}

export function VirtualizedKnowledgeLibrary({
  initialDocuments = []
}: VirtualizedKnowledgeLibraryProps) {
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    tags: [] as string[],
  });
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());

  const listRef = useRef<any>(null);

  // Load more documents (pagination)
  const loadMoreDocuments = useCallback(async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/brain/query?page=${page + 1}&limit=50&search=${filters.search}`
      );

      if (response.ok) {
        const data = await response.json();
        const newDocs = data.results || [];

        if (newDocs.length === 0) {
          setHasMore(false);
        } else {
          setDocuments(prev => [...prev, ...newDocs]);
          setPage(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  }, [page, loading, hasMore, filters.search]);

  // Check if item is loaded
  const isItemLoaded = (index: number) => !hasMore || index < documents.length;

  // Handle file upload with chunking
  const handleFileUpload = async (files: FileList) => {
    setUploading(true);

    try {
      const documentsToUpload = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const content = await file.text();

        documentsToUpload.push({
          title: file.name,
          content,
          metadata: {
            sourceType: 'upload',
            uploadedAt: new Date().toISOString(),
          },
        });
      }

      const response = await fetch('/api/brain/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents: documentsToUpload,
          createdBy: 'current-user',
        }),
      });

      if (response.ok) {
        // Refresh document list
        setDocuments([]);
        setPage(1);
        setHasMore(true);
        await loadMoreDocuments();
      }
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploading(false);
    }
  };

  // Bulk delete selected documents
  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;

    try {
      // API call to delete documents
      for (const docId of Array.from(selectedDocs)) {
        await fetch(`/api/brain/documents/${docId}`, {
          method: 'DELETE',
        });
      }

      // Remove from local state
      setDocuments(prev => prev.filter(doc => !selectedDocs.has(doc.id)));
      setSelectedDocs(new Set());
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  // Toggle document selection
  const handleSelectDoc = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Handle single document delete
  const handleDelete = async (docId: string) => {
    try {
      await fetch(`/api/brain/documents/${docId}`, {
        method: 'DELETE',
      });
      setDocuments(prev => prev.filter(doc => doc.id !== docId));
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  // Handle document download
  const handleDownload = (doc: Document) => {
    const dataStr = JSON.stringify(doc, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${doc.title}-${Date.now()}.json`;
    link.click();
  };

  // Export documents to JSON
  const handleExport = (format: 'json' | 'csv') => {
    const docsToExport = Array.from(selectedDocs).length > 0
      ? documents.filter(doc => selectedDocs.has(doc.id))
      : documents;

    if (format === 'json') {
      const dataStr = JSON.stringify(docsToExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brain-documents-${Date.now()}.json`;
      link.click();
    } else if (format === 'csv') {
      const csvContent = [
        ['ID', 'Title', 'Category', 'Tags', 'Created At'],
        ...docsToExport.map(doc => [
          doc.id,
          doc.title,
          doc.metadata.category || '',
          (doc.metadata.tags || []).join(';'),
          doc.metadata.createdAt || '',
        ]),
      ]
        .map(row => row.join(','))
        .join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `brain-documents-${Date.now()}.csv`;
      link.click();
    }
  };

  // Toggle document selection
  const toggleSelection = (docId: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(docId)) {
        next.delete(docId);
      } else {
        next.add(docId);
      }
      return next;
    });
  };

  // Row renderer for virtual list
  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    if (!isItemLoaded(index)) {
      return (
        <div style={style} className="document-row loading">
          Loading...
        </div>
      );
    }

    const doc = documents[index];
    const isSelected = selectedDocs.has(doc.id);

    return (
      <div style={style} className={`document-row ${isSelected ? 'selected' : ''}`}>
        <div className="document-row-content">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleSelection(doc.id)}
            className="document-checkbox"
          />

          <FileText size={20} className="document-icon" />

          <div className="document-info">
            <div className="document-title">{doc.title}</div>
            <div className="document-meta">
              {doc.metadata.category && (
                <span className="document-category">{doc.metadata.category}</span>
              )}
              {doc.metadata.tags && doc.metadata.tags.length > 0 && (
                <div className="document-tags">
                  {doc.metadata.tags.slice(0, 3).map((tag, i) => (
                    <span key={i} className="document-tag">{tag}</span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="document-stats">
            <span>{doc.tokenCount} tokens</span>
            <span>{new Date(doc.metadata.createdAt || '').toLocaleDateString()}</span>
          </div>

          <div className="document-actions">
            <button
              onClick={() => handleExport('json')}
              className="action-btn"
              title="Download"
            >
              <Download size={16} />
            </button>
            <button
              onClick={() => toggleSelection(doc.id)}
              className="action-btn"
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="virtualized-knowledge-library">
      {/* Header */}
      <div className="library-header">
        <h2>Knowledge Library</h2>
        <div className="library-header-actions">
          <div className="view-toggle">
            <button
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'active' : ''}
              title="List view"
            >
              <ListIcon size={16} />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={viewMode === 'grid' ? 'active' : ''}
              title="Grid view"
            >
              <Grid size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="library-toolbar">
        <div className="toolbar-search">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search documents..."
            value={filters.search}
            onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            className="toolbar-search-input"
          />
        </div>

        <div className="toolbar-actions">
          {selectedDocs.size > 0 && (
            <>
              <button onClick={handleBulkDelete} className="toolbar-btn danger">
                <Trash2 size={16} />
                Delete ({selectedDocs.size})
              </button>
              <button onClick={() => handleExport('json')} className="toolbar-btn">
                <Download size={16} />
                Export JSON
              </button>
              <button onClick={() => handleExport('csv')} className="toolbar-btn">
                <Download size={16} />
                Export CSV
              </button>
            </>
          )}
        </div>
      </div>

      {/* Upload Area */}
      <div className="upload-area-compact">
        <label className="upload-label">
          <Upload size={20} />
          <span>{uploading ? 'Uploading...' : 'Upload Documents'}</span>
          <input
            type="file"
            multiple
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="upload-input"
            disabled={uploading}
          />
        </label>
      </div>

      {/* Virtualized List */}
      <div className="documents-container">
        {documents.length === 0 ? (
          <div className="empty-state">
            <FileText size={48} />
            <p>No documents found</p>
            <p className="text-sm text-muted-foreground">
              Upload documents to get started
            </p>
          </div>
        ) : (
          <div className="documents-list" style={{ maxHeight: '600px', overflow: 'auto' }}>
            {documents.map((doc, index) => (
              <div key={doc.id} className="document-row" style={{ height: '80px', padding: '1rem', borderBottom: '1px solid #eee' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedDocs.has(doc.id)}
                      onChange={() => handleSelectDoc(doc.id)}
                    />
                    <FileText size={24} />
                    <div>
                      <div className="font-medium">{doc.title}</div>
                      <div className="text-sm text-muted-foreground">{doc.metadata.category || doc.createdBy}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleDownload(doc)} className="p-2">
                      <Download size={16} />
                    </button>
                    <button onClick={() => handleDelete(doc.id)} className="p-2">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {loading && <div className="p-4 text-center">Loading more...</div>}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="library-footer">
        <span>{documents.length} documents loaded</span>
        {selectedDocs.size > 0 && <span>{selectedDocs.size} selected</span>}
        {loading && <span>Loading more...</span>}
      </div>
    </div>
  );
}
