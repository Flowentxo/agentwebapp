'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Filter, FileText, Globe, MessageSquare, Calendar, Tag,
  MoreVertical, Edit2, Trash2, Download, ExternalLink, RefreshCw,
  ChevronDown, X, Loader2, Brain, Folder, CheckSquare, Square, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Types
interface KnowledgeItem {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  sourceType: 'upload' | 'url' | 'agent' | 'conversation';
  source?: string;
  wordCount: number;
  createdAt: string;
  updatedAt?: string;
}

interface KnowledgeLibraryProps {
  onEditItem?: (item: KnowledgeItem) => void;
  onRefresh?: () => void;
}

const categories = [
  { id: 'all', label: 'Alle', icon: Folder },
  { id: 'general', label: 'Allgemein', icon: FileText },
  { id: 'sales', label: 'Sales', icon: MessageSquare },
  { id: 'product', label: 'Produkt', icon: FileText },
  { id: 'customer', label: 'Kunden', icon: MessageSquare },
  { id: 'process', label: 'Prozesse', icon: FileText },
];

const sourceTypeLabels: Record<string, { label: string; icon: typeof FileText }> = {
  upload: { label: 'Hochgeladen', icon: FileText },
  url: { label: 'Web Import', icon: Globe },
  agent: { label: 'AI Agent', icon: Brain },
  conversation: { label: 'Konversation', icon: MessageSquare },
};

// Mock data for demonstration
const mockKnowledgeItems: KnowledgeItem[] = [
  {
    id: '1',
    title: 'Q4 Sales Strategie 2024',
    content: 'Unsere Q4 Strategie fokussiert sich auf Enterprise-Kunden im DACH-Raum. Hauptziele sind: 1) Erhöhung der durchschnittlichen Deal-Größe um 25%, 2) Reduzierung des Sales-Cycles auf unter 60 Tage, 3) Aufbau von 3 strategischen Partnerschaften...',
    category: 'sales',
    tags: ['strategie', 'q4', 'enterprise'],
    sourceType: 'upload',
    wordCount: 1250,
    createdAt: '2024-12-15T10:30:00Z',
  },
  {
    id: '2',
    title: 'Produkt-Roadmap 2025',
    content: 'Die Produkt-Roadmap für 2025 umfasst drei Hauptbereiche: AI-Integration, Enterprise-Features und Performance-Optimierung. Q1 Fokus liegt auf dem Brain AI System...',
    category: 'product',
    tags: ['roadmap', '2025', 'ai'],
    sourceType: 'upload',
    source: 'roadmap-2025.pdf',
    wordCount: 3420,
    createdAt: '2024-12-10T14:00:00Z',
  },
  {
    id: '3',
    title: 'Best Practices für Lead Nurturing',
    content: 'Effektives Lead Nurturing erfordert eine Kombination aus personalisiertem Content, timing-optimierter Kommunikation und datengesteuerter Entscheidungsfindung...',
    category: 'sales',
    tags: ['leads', 'nurturing', 'best-practices'],
    sourceType: 'url',
    source: 'https://example.com/lead-nurturing-guide',
    wordCount: 2100,
    createdAt: '2024-12-08T09:15:00Z',
  },
  {
    id: '4',
    title: 'Kundenanalyse: Acme Corp',
    content: 'Acme Corp ist ein Enterprise-Kunde mit 500+ Mitarbeitern. Hauptansprechpartner ist Max Mustermann (CTO). Aktuelle Herausforderungen: Skalierung der Infrastruktur, KI-Integration...',
    category: 'customer',
    tags: ['acme', 'enterprise', 'analyse'],
    sourceType: 'agent',
    wordCount: 890,
    createdAt: '2024-12-05T16:45:00Z',
  },
];

export function KnowledgeLibrary({ onEditItem, onRefresh }: KnowledgeLibraryProps) {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'wordCount'>('date');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [freshnessFilter, setFreshnessFilter] = useState<'all' | 'fresh' | 'aging' | 'stale'>('all');
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [loadingSummaryId, setLoadingSummaryId] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  // Fetch knowledge items
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchKnowledge();
  }, []);

  const fetchKnowledge = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/brain/knowledge/list', {
        headers: { 'x-user-id': 'demo-user' },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.items?.length > 0) {
          setItems(data.items);
        } else {
          setItems(mockKnowledgeItems);
        }
      } else {
        setItems(mockKnowledgeItems);
      }
    } catch {
      setItems(mockKnowledgeItems);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = useCallback(() => {
    fetchedRef.current = false;
    fetchKnowledge();
    onRefresh?.();
  }, [onRefresh]);

  const handleDelete = async (id: string) => {
    if (!confirm('Möchtest du diesen Eintrag wirklich löschen?')) return;
    
    try {
      await fetch(`/api/brain/knowledge/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'demo-user' },
      });
      setItems(prev => prev.filter(item => item.id !== id));
    } catch {
      console.warn('Delete failed, removing from local state');
      setItems(prev => prev.filter(item => item.id !== id));
    }
    setActionMenuId(null);
  };

  const handleExport = (item: KnowledgeItem) => {
    const markdown = `# ${item.title}\n\n${item.content}\n\n---\n\nKategorie: ${item.category}\nTags: ${item.tags.join(', ')}\nErstellt: ${new Date(item.createdAt).toLocaleDateString('de-DE')}`;
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
    setActionMenuId(null);
  };

  // Get all unique tags
  const allTags = [...new Set(items.flatMap(item => item.tags))];

  // Filter and sort items
  const filteredItems = items
    .filter(item => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedTags.length > 0 && !selectedTags.some(tag => item.tags.includes(tag))) return false;
      if (freshnessFilter !== 'all' && getFreshness(item.createdAt) !== freshnessFilter) return false;
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return item.title.toLowerCase().includes(query) ||
               item.content.toLowerCase().includes(query) ||
               item.tags.some(tag => tag.toLowerCase().includes(query));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'wordCount') return b.wordCount - a.wordCount;
      return 0;
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Heute';
    if (days === 1) return 'Gestern';
    if (days < 7) return `Vor ${days} Tagen`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Freshness helper
  const getFreshness = (dateString: string): 'fresh' | 'aging' | 'stale' => {
    const days = Math.floor((Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24));
    if (days < 30) return 'fresh';
    if (days < 90) return 'aging';
    return 'stale';
  };

  const freshnessColors = { fresh: 'bg-green-500', aging: 'bg-yellow-500', stale: 'bg-red-500' };
  const freshnessLabels = { fresh: 'Aktuell', aging: 'Älter', stale: 'Veraltet' };

  // Multi-select handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`${selectedIds.size} Einträge wirklich löschen?`)) return;
    for (const id of selectedIds) {
      try {
        await fetch(`/api/brain/knowledge/${id}`, { method: 'DELETE', headers: { 'x-user-id': 'demo-user' } });
      } catch { /* continue */ }
    }
    setItems(prev => prev.filter(item => !selectedIds.has(item.id)));
    setSelectedIds(new Set());
  };

  const handleAISummary = async (item: KnowledgeItem) => {
    if (aiSummaries[item.id]) return; // Already cached
    setLoadingSummaryId(item.id);
    try {
      const response = await fetch('/api/brain/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `Fasse diesen Text in 3 kurzen Bullet Points zusammen: ${item.content.slice(0, 2000)}`,
          useSemanticSearch: false,
        }),
      });
      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let result = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          result += decoder.decode(value, { stream: true });
        }
        setAiSummaries(prev => ({ ...prev, [item.id]: result }));
      }
    } catch {
      setAiSummaries(prev => ({ ...prev, [item.id]: 'Zusammenfassung konnte nicht erstellt werden.' }));
    } finally {
      setLoadingSummaryId(null);
    }
  };

  const handleBulkExport = () => {
    const selected = items.filter(item => selectedIds.has(item.id));
    const content = selected.map(item =>
      `# ${item.title}\n\n${item.content}\n\n---\nKategorie: ${item.category}\nTags: ${item.tags.join(', ')}\nErstellt: ${new Date(item.createdAt).toLocaleDateString('de-DE')}\n`
    ).join('\n\n===\n\n');
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-export-${selected.length}-items.md`;
    a.click();
    URL.revokeObjectURL(url);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-500/30">
            <Brain className="h-5 w-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Wissensbibliothek</h2>
            <p className="text-xs text-muted-foreground">{filteredItems.length} Einträge</p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="p-2 rounded-lg hover:bg-card/10 text-muted-foreground hover:text-white transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wissen durchsuchen..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-card/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 rounded-xl border transition-all flex items-center gap-2 ${
              showFilters || selectedCategory !== 'all' || selectedTags.length > 0
                ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                : 'bg-card/5 border-white/10 text-muted-foreground hover:bg-card/10'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span className="text-sm">Filter</span>
            {(selectedCategory !== 'all' || selectedTags.length > 0) && (
              <span className="w-5 h-5 rounded-full bg-indigo-500 text-white text-xs flex items-center justify-center">
                {(selectedCategory !== 'all' ? 1 : 0) + selectedTags.length}
              </span>
            )}
          </button>
        </div>

        {/* Filter Panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 rounded-xl bg-card/5 border border-white/10 space-y-4">
                {/* Categories */}
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

                {/* Tags */}
                {allTags.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => setSelectedTags(prev => 
                            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                          )}
                          className={`px-2 py-1 rounded-lg text-xs transition-all ${
                            selectedTags.includes(tag)
                              ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                              : 'bg-card/5 text-muted-foreground border border-white/10 hover:bg-card/10'
                          }`}
                        >
                          #{tag}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sort */}
                <div className="flex items-center gap-4">
                  <label className="text-xs font-medium text-muted-foreground">Sortieren:</label>
                  <div className="flex gap-2">
                    {[
                      { id: 'date' as const, label: 'Datum' },
                      { id: 'title' as const, label: 'Titel' },
                      { id: 'wordCount' as const, label: 'Länge' },
                    ].map((sort) => (
                      <button
                        key={sort.id}
                        onClick={() => setSortBy(sort.id)}
                        className={`px-2 py-1 rounded-lg text-xs transition-all ${
                          sortBy === sort.id
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-muted-foreground hover:text-white'
                        }`}
                      >
                        {sort.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Freshness Filter */}
                <div className="flex items-center gap-4">
                  <label className="text-xs font-medium text-muted-foreground">Aktualität:</label>
                  <div className="flex gap-2">
                    {([
                      { id: 'all' as const, label: 'Alle' },
                      { id: 'fresh' as const, label: 'Aktuell (<30d)' },
                      { id: 'aging' as const, label: 'Älter (30-90d)' },
                      { id: 'stale' as const, label: 'Veraltet (>90d)' },
                    ]).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFreshnessFilter(f.id)}
                        className={`px-2 py-1 rounded-lg text-xs transition-all ${
                          freshnessFilter === f.id
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : 'text-muted-foreground hover:text-white'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Clear Filters */}
                {(selectedCategory !== 'all' || selectedTags.length > 0 || freshnessFilter !== 'all') && (
                  <button
                    onClick={() => { setSelectedCategory('all'); setSelectedTags([]); setFreshnessFilter('all'); }}
                    className="text-xs text-indigo-400 hover:text-indigo-300"
                  >
                    Filter zurücksetzen
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between px-4 py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
        >
          <div className="flex items-center gap-3">
            <button onClick={selectAll} className="text-indigo-300 hover:text-indigo-200 transition-colors">
              {selectedIds.size === filteredItems.length ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
            </button>
            <span className="text-sm text-indigo-300 font-medium">{selectedIds.size} ausgewählt</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleBulkExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-medium hover:bg-indigo-500/30 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Exportieren
            </button>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Löschen
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-white transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Select All Toggle (when no selection) */}
      {!isLoading && filteredItems.length > 0 && selectedIds.size === 0 && (
        <div className="flex items-center gap-2 px-1">
          <button
            onClick={selectAll}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors"
          >
            <Square className="h-3.5 w-3.5" />
            Alle auswählen
          </button>
        </div>
      )}

      {/* Knowledge List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Keine Einträge gefunden</p>
          <p className="text-xs text-muted-foreground mt-1">Füge Wissen hinzu oder passe die Filter an</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-xl bg-card/5 border border-white/10 overflow-hidden hover:border-white/20 transition-all"
            >
              {/* Item Header */}
              <div
                className="p-4 cursor-pointer"
                onClick={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
              >
                <div className="flex items-start justify-between">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                    className="mr-3 mt-1 flex-shrink-0 text-muted-foreground hover:text-white transition-colors"
                  >
                    {selectedIds.has(item.id) ? <CheckSquare className="h-4 w-4 text-indigo-400" /> : <Square className="h-4 w-4" />}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Freshness Dot */}
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${freshnessColors[getFreshness(item.createdAt)]}`}
                        title={freshnessLabels[getFreshness(item.createdAt)]}
                      />
                      {sourceTypeLabels[item.sourceType] && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-card/5 text-xs text-muted-foreground">
                          {(() => { const Icon = sourceTypeLabels[item.sourceType].icon; return <Icon className="h-3 w-3" />; })()}
                          {sourceTypeLabels[item.sourceType].label}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                    </div>
                    <h3 className="text-white font-medium truncate">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.content}</p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4 relative">
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedItem === item.id ? 'rotate-180' : ''}`} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId(actionMenuId === item.id ? null : item.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-card/10 text-muted-foreground"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>

                    {/* Action Menu */}
                    <AnimatePresence>
                      {actionMenuId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-8 w-40 rounded-xl bg-gray-800 border border-white/10 shadow-xl z-10 overflow-hidden"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { onEditItem?.(item); setActionMenuId(null); }}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-card/10 flex items-center gap-2"
                          >
                            <Edit2 className="h-4 w-4" />
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => handleExport(item)}
                            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-card/10 flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Exportieren
                          </button>
                          {item.source && item.sourceType === 'url' && (
                            <a
                              href={item.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-card/10 flex items-center gap-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              Quelle öffnen
                            </a>
                          )}
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Löschen
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Tags */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {item.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 text-xs">
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Expanded Content */}
              <AnimatePresence>
                {expandedItem === item.id && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-white/10 pt-4 space-y-4">
                      <p className="text-sm text-gray-300 whitespace-pre-wrap">{item.content}</p>

                      {/* AI Summary Section */}
                      {aiSummaries[item.id] ? (
                        <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-xs font-medium text-indigo-300">AI Summary</span>
                          </div>
                          <p className="text-sm text-gray-300 whitespace-pre-wrap">{aiSummaries[item.id]}</p>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAISummary(item); }}
                          disabled={loadingSummaryId === item.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-500/10 text-indigo-300 text-xs font-medium hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                        >
                          {loadingSummaryId === item.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5" />
                          )}
                          {loadingSummaryId === item.id ? 'Wird erstellt...' : 'AI Summary'}
                        </button>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{item.wordCount.toLocaleString()} Wörter</span>
                        {item.source && (
                          <span className="truncate max-w-xs" title={item.source}>
                            Quelle: {item.source}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
