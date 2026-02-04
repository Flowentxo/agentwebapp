/**
 * PROMPT REGISTRY & LAB PAGE
 *
 * Phase 4.1 - Admin page for managing prompts with versioning.
 *
 * Features:
 * - Prompt list with search and filtering
 * - Monaco-based prompt editor
 * - Version history with rollback
 * - Integrated playground for testing
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  FileText,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle,
  Play,
  Save,
  History,
  RefreshCw,
  Trash2,
  Copy,
  ChevronRight,
  Tag,
  Zap,
} from 'lucide-react';
import PromptPlayground from '@/components/admin/prompts/PromptPlayground';

// ============================================================================
// TYPES
// ============================================================================

interface PromptVersion {
  id: string;
  promptId: string;
  version: number;
  content: string;
  changeNote?: string;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  metrics?: {
    avgResponseTime?: number;
    avgTokenUsage?: number;
    successRate?: number;
    testCount?: number;
  };
}

interface Prompt {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: 'system' | 'agent' | 'tool' | 'template' | 'experiment' | 'custom';
  agentId?: string;
  tags?: string[];
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  activeVersionId?: string;
  activeVersionContent?: string;
  versionCount?: number;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// CATEGORY CONFIG
// ============================================================================

const CATEGORY_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  system: { label: 'System', color: 'purple', icon: <Zap className="w-3.5 h-3.5" /> },
  agent: { label: 'Agent', color: 'cyan', icon: <FileText className="w-3.5 h-3.5" /> },
  tool: { label: 'Tool', color: 'amber', icon: <Play className="w-3.5 h-3.5" /> },
  template: { label: 'Template', color: 'emerald', icon: <Copy className="w-3.5 h-3.5" /> },
  experiment: { label: 'Experiment', color: 'pink', icon: <Zap className="w-3.5 h-3.5" /> },
  custom: { label: 'Custom', color: 'blue', icon: <Tag className="w-3.5 h-3.5" /> },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: 'Entwurf', color: 'white/50' },
  active: { label: 'Aktiv', color: 'emerald' },
  deprecated: { label: 'Veraltet', color: 'amber' },
  archived: { label: 'Archiviert', color: 'red' },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PromptRegistryPage() {
  // State
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [versions, setVersions] = useState<PromptVersion[]>([]);
  const [editedContent, setEditedContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPlayground, setShowPlayground] = useState(false);
  const [showNewPromptModal, setShowNewPromptModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // ────────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ────────────────────────────────────────────────────────────────────────────

  const fetchPrompts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryFilter) params.set('category', categoryFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/admin/prompts?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch prompts');

      const data = await res.json();
      setPrompts(data.data || []);
    } catch (error) {
      console.error('[PROMPTS_PAGE] Error fetching prompts:', error);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  const fetchVersions = async (promptId: string) => {
    try {
      const res = await fetch(`/api/admin/prompts/${promptId}/versions`);
      if (!res.ok) throw new Error('Failed to fetch versions');

      const data = await res.json();
      setVersions(data.data || []);
    } catch (error) {
      console.error('[PROMPTS_PAGE] Error fetching versions:', error);
    }
  };

  useEffect(() => {
    fetchPrompts();
  }, [fetchPrompts]);

  useEffect(() => {
    if (selectedPrompt) {
      setEditedContent(selectedPrompt.activeVersionContent || '');
      fetchVersions(selectedPrompt.id);
    }
  }, [selectedPrompt]);

  // ────────────────────────────────────────────────────────────────────────────
  // Actions
  // ────────────────────────────────────────────────────────────────────────────

  const handleSelectPrompt = (prompt: Prompt) => {
    setSelectedPrompt(prompt);
    setShowPlayground(false);
  };

  const handleSaveVersion = async () => {
    if (!selectedPrompt) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/prompts/${selectedPrompt.id}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editedContent,
          changeNote: 'Updated via Prompt Manager',
          setActive: true,
        }),
      });

      if (!res.ok) throw new Error('Failed to save version');

      // Refresh data
      await fetchPrompts();
      await fetchVersions(selectedPrompt.id);

      // Update selected prompt
      const updatedPrompt = prompts.find((p) => p.id === selectedPrompt.id);
      if (updatedPrompt) {
        setSelectedPrompt({ ...updatedPrompt, activeVersionContent: editedContent });
      }
    } catch (error) {
      console.error('[PROMPTS_PAGE] Error saving version:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleActivateVersion = async (versionId: string) => {
    if (!selectedPrompt) return;

    try {
      const res = await fetch(`/api/admin/prompts/${selectedPrompt.id}/versions/${versionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });

      if (!res.ok) throw new Error('Failed to activate version');

      // Refresh data
      await fetchPrompts();
      await fetchVersions(selectedPrompt.id);
    } catch (error) {
      console.error('[PROMPTS_PAGE] Error activating version:', error);
    }
  };

  const handleCreatePrompt = async (data: {
    slug: string;
    name: string;
    description?: string;
    category: string;
    initialContent: string;
  }) => {
    try {
      const res = await fetch('/api/admin/prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create prompt');
      }

      const result = await res.json();
      setShowNewPromptModal(false);
      await fetchPrompts();
      setSelectedPrompt(result.data);
    } catch (error: any) {
      console.error('[PROMPTS_PAGE] Error creating prompt:', error);
      alert(error.message || 'Failed to create prompt');
    }
  };

  const hasChanges = selectedPrompt && editedContent !== (selectedPrompt.activeVersionContent || '');

  // ────────────────────────────────────────────────────────────────────────────
  // Render
  // ────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════
          Header
      ═══════════════════════════════════════════════════════════════ */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Link
              href="/admin"
              className="p-2 -ml-2 rounded-lg hover:bg-card/10 text-white/60 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-violet-400" />
              <span>Prompt Registry</span>
            </h1>
          </div>
          <p className="text-white/50 ml-10">
            Verwalte System-Prompts mit Versionierung und Playground
          </p>
        </div>

        <button
          onClick={() => setShowNewPromptModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Neuer Prompt</span>
        </button>
      </header>

      {/* ═══════════════════════════════════════════════════════════════
          Main Content - 3 Column Layout
      ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* ─────────────────────────────────────────────────────────────
            Left Column: Prompt List
        ───────────────────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 glass-command-panel p-4 flex flex-col">
          {/* Search */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-card/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-violet-500/50"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-4">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-card/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="">Alle Kategorien</option>
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-1.5 bg-card/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-violet-500/50"
            >
              <option value="">Alle Status</option>
              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          {/* Prompt List */}
          <div className="flex-1 overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-white/40">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
            ) : prompts.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Keine Prompts gefunden</p>
              </div>
            ) : (
              prompts.map((prompt) => {
                const categoryConfig = CATEGORY_CONFIG[prompt.category] || CATEGORY_CONFIG.custom;
                const statusConfig = STATUS_CONFIG[prompt.status] || STATUS_CONFIG.draft;
                const isSelected = selectedPrompt?.id === prompt.id;

                return (
                  <button
                    key={prompt.id}
                    onClick={() => handleSelectPrompt(prompt)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      isSelected
                        ? 'bg-violet-500/20 border-violet-500/30'
                        : 'bg-card/5 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">
                          {prompt.name}
                        </p>
                        <p className="text-xs text-white/40 truncate mt-0.5">
                          {prompt.slug}
                        </p>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 flex-shrink-0 transition-transform ${
                          isSelected ? 'text-violet-400 rotate-90' : 'text-white/30'
                        }`}
                      />
                    </div>

                    <div className="flex items-center gap-2 mt-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-${categoryConfig.color}-500/20 text-${categoryConfig.color}-400 border border-${categoryConfig.color}-500/30`}
                      >
                        {categoryConfig.icon}
                        {categoryConfig.label}
                      </span>

                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs rounded-full ${
                          prompt.status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-card/10 text-white/50'
                        }`}
                      >
                        {statusConfig.label}
                      </span>

                      <span className="text-xs text-white/30 ml-auto">
                        v{prompt.versionCount || 1}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─────────────────────────────────────────────────────────────
            Center Column: Editor
        ───────────────────────────────────────────────────────────── */}
        <main className="flex-1 glass-command-panel p-4 flex flex-col min-w-0">
          {selectedPrompt ? (
            <>
              {/* Prompt Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {selectedPrompt.name}
                  </h2>
                  <p className="text-xs text-white/40">
                    {selectedPrompt.slug}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowPlayground(!showPlayground)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                      showPlayground
                        ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                        : 'bg-card/5 border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Play className="w-4 h-4" />
                    <span className="text-sm">Playground</span>
                  </button>

                  <button
                    onClick={handleSaveVersion}
                    disabled={!hasChanges || saving}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-colors ${
                      hasChanges
                        ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30'
                        : 'bg-card/5 border-white/10 text-white/30 cursor-not-allowed'
                    }`}
                  >
                    {saving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span className="text-sm">Speichern</span>
                  </button>
                </div>
              </div>

              {/* Editor */}
              <div className="flex-1 min-h-0">
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-full p-4 bg-muted/30 border border-border rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-primary/50"
                  placeholder="Prompt content..."
                  spellCheck={false}
                />
              </div>

              {/* Status Bar */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span>{editedContent.length.toLocaleString()} Zeichen</span>
                  <span>~{Math.ceil(editedContent.length / 4).toLocaleString()} Tokens</span>
                </div>
                {hasChanges && (
                  <span className="text-xs text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Ungespeicherte Änderungen
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/40">
              <div className="text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Wähle einen Prompt aus der Liste</p>
              </div>
            </div>
          )}
        </main>

        {/* ─────────────────────────────────────────────────────────────
            Right Column: Version History / Playground
        ───────────────────────────────────────────────────────────── */}
        <aside className="w-80 flex-shrink-0 glass-command-panel p-4 flex flex-col">
          {showPlayground && selectedPrompt ? (
            <PromptPlayground
              promptVersionId={selectedPrompt.activeVersionId}
              systemPrompt={editedContent}
            />
          ) : (
            <>
              <div className="flex items-center gap-2 mb-4">
                <History className="w-5 h-5 text-violet-400" />
                <h3 className="text-sm font-semibold text-white">Versionen</h3>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2">
                {versions.length === 0 ? (
                  <div className="text-center py-8 text-white/40">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Versionen</p>
                  </div>
                ) : (
                  versions.map((version) => (
                    <div
                      key={version.id}
                      className={`p-3 rounded-lg border transition-all ${
                        version.isActive
                          ? 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-card/5 border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          Version {version.version}
                        </span>
                        {version.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                            <CheckCircle className="w-3 h-3" />
                            Aktiv
                          </span>
                        ) : (
                          <button
                            onClick={() => handleActivateVersion(version.id)}
                            className="text-xs text-violet-400 hover:underline"
                          >
                            Aktivieren
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-white/50 mb-2">
                        {version.changeNote || 'Keine Notiz'}
                      </p>

                      <div className="flex items-center justify-between text-xs text-white/30">
                        <span>
                          {new Date(version.createdAt).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {version.metrics?.testCount && version.metrics.testCount > 0 && (
                          <span className="flex items-center gap-1">
                            <Play className="w-3 h-3" />
                            {version.metrics.testCount} Tests
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          New Prompt Modal
      ═══════════════════════════════════════════════════════════════ */}
      {showNewPromptModal && (
        <NewPromptModal
          onClose={() => setShowNewPromptModal(false)}
          onCreate={handleCreatePrompt}
        />
      )}
    </div>
  );
}

// ============================================================================
// NEW PROMPT MODAL
// ============================================================================

function NewPromptModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: {
    slug: string;
    name: string;
    description?: string;
    category: string;
    initialContent: string;
  }) => void;
}) {
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('agent');
  const [initialContent, setInitialContent] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({ slug, name, description, category, initialContent });
  };

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="glass-command-panel w-full max-w-lg p-6 m-4">
        <h2 className="text-xl font-bold text-white mb-4">Neuer Prompt</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slug) setSlug(generateSlug(e.target.value));
              }}
              className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500/50"
              placeholder="z.B. Dexter System Prompt"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Slug *
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(generateSlug(e.target.value))}
              className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-white font-mono text-sm focus:outline-none focus:border-violet-500/50"
              placeholder="z.B. dexter-system-prompt"
              required
            />
            <p className="text-xs text-white/40 mt-1">
              Nur Kleinbuchstaben, Zahlen und Bindestriche
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Kategorie *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500/50"
            >
              {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Beschreibung
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-violet-500/50"
              placeholder="Optionale Beschreibung"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-1">
              Initialer Inhalt *
            </label>
            <textarea
              value={initialContent}
              onChange={(e) => setInitialContent(e.target.value)}
              className="w-full h-32 px-3 py-2 bg-card/5 border border-white/10 rounded-lg text-white font-mono text-sm resize-none focus:outline-none focus:border-violet-500/50"
              placeholder="You are..."
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-violet-500/20 border border-violet-500/30 text-violet-400 rounded-lg hover:bg-violet-500/30 transition-colors"
            >
              Erstellen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
