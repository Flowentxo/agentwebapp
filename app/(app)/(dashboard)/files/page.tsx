'use client';

import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/files/FileUpload';
import {
  File,
  Image as ImageIcon,
  FileText,
  Download,
  Trash2,
  Search,
  Filter,
  Grid,
  List,
  Share2,
} from 'lucide-react';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000/api';

interface UploadedFile {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  uploadedAt: string;
  visibility?: 'private' | 'workspace' | 'public';
  metadata?: {
    width?: number;
    height?: number;
    category?: string;
    description?: string;
    tags?: string[];
  };
}

export default function FilesPage() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMimeType, setFilterMimeType] = useState<string>('');

  useEffect(() => {
    loadFiles();
  }, [filterMimeType]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const url = new URL(`${API_BASE}/files`);
      if (filterMimeType) {
        url.searchParams.set('mimeType', filterMimeType);
      }

      const response = await fetch(url.toString(), {
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (!response.ok) throw new Error('Failed to load files');

      const data = await response.json();
      setFiles(data.files || []);
    } catch (error) {
      console.error('[FILES_LOAD]', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (file: UploadedFile) => {
    setFiles((prev) => [file, ...prev]);
  };

  const handleDownload = async (file: UploadedFile) => {
    try {
      const response = await fetch(`${API_BASE}/files/${file.id}/download`, {
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (!response.ok) throw new Error('Failed to get download URL');

      const data = await response.json();

      // Open download URL in new tab
      window.open(data.downloadUrl, '_blank');
    } catch (error) {
      console.error('[FILE_DOWNLOAD]', error);
      alert('Failed to download file');
    }
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    try {
      const response = await fetch(`${API_BASE}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': 'demo-user',
        },
      });

      if (!response.ok) throw new Error('Failed to delete file');

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error) {
      console.error('[FILE_DELETE]', error);
      alert('Failed to delete file');
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
    if (mimeType.includes('pdf')) return <FileText className="w-5 h-5" />;
    return <File className="w-5 h-5" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredFiles = files.filter((file) =>
    file.originalFilename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-muted/50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">File Manager</h1>
            <p className="text-muted-foreground mt-1">
              Upload, organize, and share your files
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'grid'
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'bg-card text-muted-foreground hover:bg-muted'
                }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Upload Area */}
        <div className="bg-card rounded-xl p-6 shadow-sm">
          <FileUpload onUploadComplete={handleUploadComplete} />
        </div>

        {/* Search & Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>

          <select
            value={filterMimeType}
            onChange={(e) => setFilterMimeType(e.target.value)}
            className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            <option value="">All files</option>
            <option value="image/jpeg">Images</option>
            <option value="application/pdf">PDFs</option>
            <option value="text/plain">Text files</option>
          </select>
        </div>

        {/* Files Grid/List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground mt-4">Loading files...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl">
            <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No files found' : 'No files yet. Upload some files to get started!'}
            </p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredFiles.map((file) => (
              <div
                key={file.id}
                className="bg-card rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                {/* Thumbnail/Icon */}
                <div className="aspect-square bg-muted rounded-lg mb-3 flex items-center justify-center overflow-hidden">
                  {file.thumbnailUrl ? (
                    <img
                      src={file.thumbnailUrl}
                      alt={file.originalFilename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-muted-foreground">{getFileIcon(file.mimeType)}</div>
                  )}
                </div>

                {/* File Info */}
                <div className="space-y-2">
                  <h3 className="font-medium text-foreground truncate" title={file.originalFilename}>
                    {file.originalFilename}
                  </h3>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{formatDate(file.uploadedAt)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-sm rounded-lg hover:bg-primary/90 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </button>

                    <button
                      onClick={() => handleDelete(file.id)}
                      className="p-1.5 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card rounded-xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-muted/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="text-muted-foreground">{getFileIcon(file.mimeType)}</div>
                        <span className="text-sm font-medium text-foreground truncate max-w-md">
                          {file.originalFilename}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatFileSize(file.size)}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDate(file.uploadedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-2 text-blue-600 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(file.id)}
                          className="p-2 text-red-600 hover:bg-red-500/10 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
