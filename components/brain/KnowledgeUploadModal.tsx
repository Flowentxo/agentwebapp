'use client';

import { useState, useCallback, useRef } from 'react';
import { 
  X, Upload, FileText, Link2, MessageSquare, Loader2, Check, AlertCircle, 
  Plus, Trash2, File, Globe, FileUp, CheckCircle2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface KnowledgeEntry {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
  progress: number;
}

interface KnowledgeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type UploadMode = 'text' | 'file' | 'url';

const categories = [
  { id: 'general', label: 'Allgemein', icon: FileText },
  { id: 'sales', label: 'Sales', icon: MessageSquare },
  { id: 'product', label: 'Produkt', icon: FileText },
  { id: 'customer', label: 'Kunden', icon: MessageSquare },
  { id: 'process', label: 'Prozesse', icon: Link2 },
];

const SUPPORTED_EXTENSIONS = ['pdf', 'docx', 'txt', 'md', 'csv', 'json'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function KnowledgeUploadModal({ isOpen, onClose, onSuccess }: KnowledgeUploadModalProps) {
  // Mode state
  const [mode, setMode] = useState<UploadMode>('text');
  
  // Text entry state
  const [entries, setEntries] = useState<KnowledgeEntry[]>([
    { id: crypto.randomUUID(), title: '', content: '', category: 'general', tags: [] }
  ]);
  
  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // URL state
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  
  // Common state
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTagInput, setCurrentTagInput] = useState<Record<string, string>>({});
  const [globalTags, setGlobalTags] = useState<string[]>([]);
  const [globalTagInput, setGlobalTagInput] = useState('');

  // Text entry handlers
  const addEntry = () => {
    setEntries([...entries, { 
      id: crypto.randomUUID(), 
      title: '', 
      content: '', 
      category: selectedCategory, 
      tags: [] 
    }]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter(e => e.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof KnowledgeEntry, value: string | string[]) => {
    setEntries(entries.map(e => 
      e.id === id ? { ...e, [field]: value } : e
    ));
  };

  const addTag = useCallback((entryId: string) => {
    const tag = currentTagInput[entryId]?.trim();
    if (tag) {
      const entry = entries.find(e => e.id === entryId);
      if (entry && !entry.tags.includes(tag)) {
        updateEntry(entryId, 'tags', [...entry.tags, tag]);
      }
      setCurrentTagInput(prev => ({ ...prev, [entryId]: '' }));
    }
  }, [currentTagInput, entries]);

  const removeTag = (entryId: string, tag: string) => {
    const entry = entries.find(e => e.id === entryId);
    if (entry) {
      updateEntry(entryId, 'tags', entry.tags.filter(t => t !== tag));
    }
  };

  // Global tag handlers
  const addGlobalTag = () => {
    const tag = globalTagInput.trim();
    if (tag && !globalTags.includes(tag)) {
      setGlobalTags([...globalTags, tag]);
      setGlobalTagInput('');
    }
  };

  const removeGlobalTag = (tag: string) => {
    setGlobalTags(globalTags.filter(t => t !== tag));
  };

  // File handlers
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const newFiles: UploadedFile[] = Array.from(files)
      .filter(file => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext && SUPPORTED_EXTENSIONS.includes(ext);
      })
      .map(file => ({
        id: crypto.randomUUID(),
        file,
        status: 'pending' as const,
        progress: 0,
      }));

    if (newFiles.length < files.length) {
      setErrorMessage(`Einige Dateien wurden übersprungen (nicht unterstütztes Format)`);
      setSubmitStatus('error');
      setTimeout(() => setSubmitStatus('idle'), 3000);
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // URL handler
  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    
    setUrlLoading(true);
    try {
      const response = await fetch('/api/brain/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          url: urlInput,
          category: selectedCategory,
          tags: globalTags,
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          resetForm();
        }, 1500);
      } else {
        throw new Error(data.error || 'Fehler beim Importieren');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
      setSubmitStatus('error');
    } finally {
      setUrlLoading(false);
    }
  };

  // Submit handlers
  const handleSubmitText = async () => {
    const validEntries = entries.filter(e => e.title.trim() && e.content.trim());
    if (validEntries.length === 0) {
      setErrorMessage('Mindestens ein Eintrag mit Titel und Inhalt ist erforderlich.');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const response = await fetch('/api/brain/knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({
          documents: validEntries.map(e => ({
            title: e.title,
            content: e.content,
            metadata: {
              category: e.category,
              tags: [...e.tags, ...globalTags],
              sourceType: 'upload',
              source: 'brain-ui',
            }
          }))
        }),
      });

      const data = await response.json();
      if (data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          resetForm();
        }, 1500);
      } else {
        throw new Error(data.error || 'Fehler beim Speichern');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
      setSubmitStatus('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitFiles = async () => {
    if (uploadedFiles.length === 0) {
      setErrorMessage('Keine Dateien ausgewählt');
      setSubmitStatus('error');
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const formData = new FormData();
      uploadedFiles.forEach(f => formData.append('files', f.file));
      formData.append('category', selectedCategory);
      formData.append('tags', globalTags.join(','));

      // Update file statuses to uploading
      setUploadedFiles(prev => prev.map(f => ({ ...f, status: 'uploading' as const })));

      const response = await fetch('/api/brain/upload', {
        method: 'POST',
        headers: {
          'x-user-id': 'demo-user',
        },
        body: formData,
      });

      const data = await response.json();
      
      // Update individual file statuses
      if (data.results) {
        setUploadedFiles(prev => prev.map(f => {
          const result = data.results.find((r: { filename: string }) => r.filename === f.file.name);
          return {
            ...f,
            status: result?.success ? 'success' : 'error',
            error: result?.error,
            progress: 100,
          };
        }));
      }

      if (data.success) {
        setSubmitStatus('success');
        setTimeout(() => {
          onSuccess?.();
          onClose();
          resetForm();
        }, 1500);
      } else {
        throw new Error(data.error || 'Einige Dateien konnten nicht verarbeitet werden');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Ein Fehler ist aufgetreten');
      setSubmitStatus('error');
      setUploadedFiles(prev => prev.map(f => 
        f.status === 'uploading' ? { ...f, status: 'error', error: 'Upload fehlgeschlagen' } : f
      ));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = () => {
    if (mode === 'text') return handleSubmitText();
    if (mode === 'file') return handleSubmitFiles();
    if (mode === 'url') return handleUrlImport();
  };

  const resetForm = () => {
    setEntries([{ id: crypto.randomUUID(), title: '', content: '', category: 'general', tags: [] }]);
    setUploadedFiles([]);
    setUrlInput('');
    setGlobalTags([]);
    setSubmitStatus('idle');
    setErrorMessage('');
  };

  const handleKeyDown = useCallback((e: React.KeyboardEvent, entryId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(entryId);
    }
  }, [addTag]);

  const canSubmit = () => {
    if (mode === 'text') return entries.some(e => e.title.trim() && e.content.trim());
    if (mode === 'file') return uploadedFiles.length > 0;
    if (mode === 'url') return urlInput.trim().length > 0;
    return false;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-card border border-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
                <Upload className="h-5 w-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Wissen hinzufügen</h2>
                <p className="text-xs text-muted-foreground">Erweitere deine Wissensdatenbank</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-card/10 transition-colors">
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Mode Tabs */}
          <div className="px-6 pt-4 flex gap-2">
            {[
              { id: 'text' as const, label: 'Text', icon: FileText },
              { id: 'file' as const, label: 'Dateien', icon: FileUp },
              { id: 'url' as const, label: 'URL', icon: Globe },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMode(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  mode === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    : 'bg-card/5 text-muted-foreground border border-white/10 hover:bg-card/10'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-280px)] space-y-6">
            
            {/* TEXT MODE */}
            {mode === 'text' && (
              <>
                {entries.map((entry, index) => (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 rounded-2xl bg-card/5 border border-white/10 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Eintrag {index + 1}
                      </span>
                      {entries.length > 1 && (
                        <button
                          onClick={() => removeEntry(entry.id)}
                          className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Titel *</label>
                      <input
                        type="text"
                        value={entry.title}
                        onChange={(e) => updateEntry(entry.id, 'title', e.target.value)}
                        placeholder="z.B. Wichtige Kundenpräferenzen für Q1"
                        className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Kategorie</label>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => updateEntry(entry.id, 'category', cat.id)}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                              entry.category === cat.id
                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                : 'bg-card/5 text-muted-foreground border border-white/10 hover:bg-card/10'
                            }`}
                          >
                            <cat.icon className="h-3 w-3" />
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Inhalt *</label>
                      <textarea
                        value={entry.content}
                        onChange={(e) => updateEntry(entry.id, 'content', e.target.value)}
                        placeholder="Beschreibe das Wissen detailliert..."
                        rows={5}
                        className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">Tags</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {entry.tags.map((tag) => (
                          <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs">
                            {tag}
                            <button onClick={() => removeTag(entry.id, tag)} className="hover:text-white">
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={currentTagInput[entry.id] || ''}
                          onChange={(e) => setCurrentTagInput({ ...currentTagInput, [entry.id]: e.target.value })}
                          onKeyDown={(e) => handleKeyDown(e, entry.id)}
                          placeholder="Tag hinzufügen..."
                          className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
                        />
                        <button
                          onClick={() => addTag(entry.id)}
                          className="px-3 py-2 rounded-lg bg-card/5 hover:bg-card/10 text-muted-foreground text-sm transition-colors"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <button
                  onClick={addEntry}
                  className="w-full p-4 rounded-2xl border-2 border-dashed border-white/20 text-muted-foreground hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="h-5 w-5" />
                  Weiteren Eintrag hinzufügen
                </button>
              </>
            )}

            {/* FILE MODE */}
            {mode === 'file' && (
              <div className="space-y-4">
                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                    isDragging
                      ? 'border-indigo-500 bg-indigo-500/10'
                      : 'border-white/20 hover:border-white/40 bg-card/5'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt,.md,.csv,.json"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    className="hidden"
                  />
                  <div className="text-center">
                    <FileUp className={`h-12 w-12 mx-auto mb-4 ${isDragging ? 'text-indigo-400' : 'text-muted-foreground'}`} />
                    <p className="text-white font-medium mb-2">
                      {isDragging ? 'Dateien hier ablegen' : 'Dateien hierher ziehen oder klicken'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, Word, TXT, Markdown, CSV, JSON • Max. 10MB pro Datei
                    </p>
                  </div>
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    {uploadedFiles.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card/5 border border-white/10"
                      >
                        <File className="h-5 w-5 text-indigo-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{f.file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(f.file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        {f.status === 'pending' && (
                          <button
                            onClick={() => removeFile(f.id)}
                            className="p-1.5 rounded-lg hover:bg-card/10 text-muted-foreground hover:text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                        {f.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 text-indigo-400 animate-spin" />
                        )}
                        {f.status === 'success' && (
                          <CheckCircle2 className="h-4 w-4 text-green-400" />
                        )}
                        {f.status === 'error' && (
                          <AlertCircle className="h-4 w-4 text-red-400" title={f.error} />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Category & Tags for Files */}
                <div className="p-4 rounded-xl bg-card/5 border border-white/10 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Kategorie für alle Dateien</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedCategory === cat.id
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-card/5 text-muted-foreground border border-white/10 hover:bg-card/10'
                          }`}
                        >
                          <cat.icon className="h-3 w-3" />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Tags für alle Dateien</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {globalTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs">
                          {tag}
                          <button onClick={() => removeGlobalTag(tag)} className="hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={globalTagInput}
                        onChange={(e) => setGlobalTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGlobalTag())}
                        placeholder="Tag hinzufügen..."
                        className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm placeholder:text-muted-foreground"
                      />
                      <button onClick={addGlobalTag} className="px-3 py-2 rounded-lg bg-card/5 hover:bg-card/10 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* URL MODE */}
            {mode === 'url' && (
              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-card/5 border border-white/10 space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Website URL</label>
                    <input
                      type="url"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://example.com/artikel"
                      className="w-full px-4 py-3 rounded-xl bg-black/30 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Kategorie</label>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => setSelectedCategory(cat.id)}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            selectedCategory === cat.id
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-card/5 text-muted-foreground border border-white/10 hover:bg-card/10'
                          }`}
                        >
                          <cat.icon className="h-3 w-3" />
                          {cat.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {globalTags.map((tag) => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs">
                          {tag}
                          <button onClick={() => removeGlobalTag(tag)} className="hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={globalTagInput}
                        onChange={(e) => setGlobalTagInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addGlobalTag())}
                        placeholder="Tag hinzufügen..."
                        className="flex-1 px-3 py-2 rounded-lg bg-black/20 border border-white/10 text-white text-sm placeholder:text-muted-foreground"
                      />
                      <button onClick={addGlobalTag} className="px-3 py-2 rounded-lg bg-card/5 hover:bg-card/10 text-muted-foreground">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground text-center">
                  Die Webseite wird automatisch gescraped und der relevante Text extrahiert.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10 bg-black/20">
            <AnimatePresence mode="wait">
              {submitStatus === 'error' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-sm text-red-300"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  {errorMessage}
                </motion.div>
              )}
              {submitStatus === 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2 text-sm text-green-300"
                >
                  <Check className="h-4 w-4 flex-shrink-0" />
                  Wissen erfolgreich gespeichert!
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-card/5 hover:bg-card/10 text-muted-foreground text-sm font-medium transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || urlLoading || !canSubmit()}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {(isSubmitting || urlLoading) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {mode === 'file' ? 'Lade hoch...' : mode === 'url' ? 'Importiere...' : 'Speichern...'}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {mode === 'file' ? `${uploadedFiles.length} Datei(en) hochladen` : mode === 'url' ? 'URL importieren' : 'Wissen speichern'}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
