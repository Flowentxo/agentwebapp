'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Search,
  Upload,
  Lightbulb,
  GraduationCap,
  Zap,
  Database,
  TrendingUp,
  FileText,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/useToast';

// --- COMPONENTS (shared with Budget page style) ---
import { BusinessIdeas } from '@/components/brain/BusinessIdeas';
import { DailyLearningQuestions } from '@/components/brain/DailyLearningQuestions';
import { PredictiveContextEngine } from '@/components/brain/PredictiveContextEngine';
import { KnowledgeGraph } from '@/components/brain/KnowledgeGraph';
import { InteractiveKnowledgeGraph } from '@/components/brain/InteractiveKnowledgeGraph';
import { KnowledgeUploadModal } from '@/components/brain/KnowledgeUploadModal';
import { FocusedChatModal } from '@/components/brain/FocusedChatModal';
import { KnowledgeLibrary } from '@/components/brain/KnowledgeLibrary';
import { getKnowledgeStorageStats, type StorageStats, type GraphNode } from '@/actions/brain-actions';
import { HardDrive, List, Network } from 'lucide-react';

// --- PREMIUM DESIGN TOKENS (matching Budget page) ---
const tokens = {
  bgPage: 'transparent',
  bgCard: 'rgba(255, 255, 255, 0.03)',
  glassBorder: 'rgba(255, 255, 255, 0.08)',
  accent: 'rgb(var(--accent))',
  accentAlt: 'rgb(var(--accent-alt))',
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255, 255, 255, 0.65)',
  textMuted: 'rgba(255, 255, 255, 0.4)',
  fontFamily: '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
};

// --- BENTO CARD COMPONENT (same as Budget page) ---
function BentoCard({ children, className = "", delay = 0 }: { children: React.ReactNode, className?: string, delay?: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`p-8 rounded-[40px] border border-white/10 shadow-2xl relative overflow-hidden group ${className}`}
      style={{ 
        background: tokens.bgCard,
        backdropFilter: 'blur(50px)',
        boxShadow: 'inset 0 0 20px rgba(255,255,255,0.02), 0 20px 50px rgba(0,0,0,0.3)',
      }}
    >
      {/* SPOTLIGHT EFFECT */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
           style={{ background: 'radial-gradient(600px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(255,255,255,0.06), transparent 40%)' }} />
      
      <div className="relative z-10 h-full">{children}</div>
    </motion.div>
  );
}

function Badge({ text, color = 'indigo' }: { text: string, color?: 'indigo' | 'teal' | 'green' }) {
  const colors = {
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    teal: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    green: 'bg-green-500/10 text-green-400 border-green-500/20',
  };
  return (
    <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${colors[color]}`}>
      {text}
    </span>
  );
}

// --- MAIN PAGE COMPONENT ---
export default function BrainPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'knowledge' | 'meetings' | 'ideas' | 'learning'>('overview');
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'library' | 'graph'>('library');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFocusedChatModal, setShowFocusedChatModal] = useState(false);
  const [selectedGraphNodes, setSelectedGraphNodes] = useState<GraphNode[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { showToast } = useToast();

  // Load storage stats on mount
  useEffect(() => {
    async function loadStorageStats() {
      try {
        const result = await getKnowledgeStorageStats('default-workspace');
        if (result.success && result.stats) {
          setStorageStats(result.stats);
        }
      } catch (error) {
        console.warn('[Brain] Failed to load storage stats:', error);
      }
    }
    loadStorageStats();
  }, []);

  // Tab configuration
  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Übersicht', icon: <Brain className="h-4 w-4" /> },
    { id: 'knowledge' as const, label: 'Wissen', icon: <Database className="h-4 w-4" /> },
    { id: 'meetings' as const, label: 'Meeting Intel', icon: <Zap className="h-4 w-4" /> },
    { id: 'ideas' as const, label: 'Ideen', icon: <Lightbulb className="h-4 w-4" /> },
    { id: 'learning' as const, label: 'Learning', icon: <GraduationCap className="h-4 w-4" /> },
  ], []);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setShowResults(true);
    setSearchResult('');

    try {
      const response = await fetch('/api/brain/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, useSemanticSearch: true }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) throw new Error('Query failed');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value, { stream: true });
          setSearchResult(prev => prev + text);
        }
      }
    } catch (error: unknown) {
      const err = error as Error;
      if (err.name === 'AbortError') return;
      showToast({
        type: 'error',
        title: 'Fehler bei der Suche',
        message: err.message || 'Ein unerwarteter Fehler ist aufgetreten.',
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Quick actions for the query card
  const quickActions = [
    { id: 'insights', label: 'Wichtige Insights', icon: <Sparkles className="h-4 w-4" />, query: 'Was sind die wichtigsten Insights aus meinen letzten Dokumenten?' },
    { id: 'docs', label: 'Dokumente durchsuchen', icon: <FileText className="h-4 w-4" />, query: 'Zeig mir meine letzten Dokumente und deren Kernaussagen.' },
    { id: 'ideas', label: 'Business-Ideen', icon: <Lightbulb className="h-4 w-4" />, query: 'Generiere Business-Ideen basierend auf meinem aktuellen Wissen.' },
  ];

  const handleQuickAction = (query: string) => {
    setSearchQuery(query);
    setTimeout(() => {
      const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
      handleSearch(fakeEvent);
    }, 100);
  };

  return (
    <div className="min-h-screen px-6 py-12 lg:px-12" style={{ background: tokens.bgPage, fontFamily: tokens.fontFamily }}>
      <div className="max-w-[1440px] mx-auto space-y-12">
        
        {/* EXECUTIVE HEADER */}
        <header className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Brain AI
            </h1>
            <p className="text-white/40 font-medium max-w-md leading-relaxed">
              Sales Intelligence Hub & Knowledge Central. Dein zentrales Wissensmanagement für strategische Entscheidungen.
            </p>
          </div>
          <div className="flex items-center gap-6">
            {/* Storage Stats Display */}
            {storageStats && (
              <div className="hidden md:flex items-center gap-3 px-4 py-2.5 bg-card/5 rounded-full border border-white/10">
                <HardDrive className="h-4 w-4 text-indigo-400" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/60">Knowledge Storage:</span>
                  <span className="text-xs font-bold text-white">
                    {storageStats.storageUsedMB} MB / {storageStats.storageLimitMB} MB
                  </span>
                  <div className="w-20 h-1.5 bg-card/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        storageStats.percentUsed > 80
                          ? 'bg-red-500'
                          : storageStats.percentUsed > 50
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${storageStats.percentUsed}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-6 py-3 bg-card text-black hover:bg-card/90 rounded-full text-xs font-bold uppercase tracking-widest shadow-xl shadow-white/10 transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Wissen hinzufügen
            </button>
          </div>
        </header>

        {/* TAB NAVIGATION */}
        <div className="flex gap-2 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest
                transition-all duration-200
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-card/5 text-white/40 hover:bg-card/10 hover:text-white/60 border border-white/10'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* OVERVIEW TAB CONTENT */}
        {activeTab === 'overview' && (
          <>
            {/* BENTO GRID LAYOUT - Matching Budget Page */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2 gap-6 min-h-[600px]">
              
              {/* MAIN HERO: BRAIN QUERY (Large Card) */}
              <BentoCard delay={0.1} className="md:col-span-2 lg:row-span-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Brain className="h-48 w-48 text-indigo-500" />
                </div>
                <div className="relative h-full flex flex-col justify-between z-10">
                  <div className="space-y-6">
                    <div className="flex justify-between items-start">
                      <Badge text="Brain Query" />
                      <div className="text-right">
                        <p className="text-[10px] uppercase tracking-widest text-white/30">Knowledge Density</p>
                        <p className="text-sm font-bold text-indigo-400">84% Indexed</p>
                      </div>
                    </div>

                    {/* Search Input */}
                    <form onSubmit={handleSearch} className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-white/30" />
                        <input
                          ref={searchRef}
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Frag dein Gehirn..."
                          className="w-full bg-card/5 border border-white/10 rounded-[24px] py-4 pl-14 pr-14 text-sm font-medium placeholder:text-white/30 focus:border-indigo-500/50 focus:bg-card/[0.08] outline-none transition-all"
                        />
                        <AnimatePresence>
                          {searchQuery && (
                            <motion.button
                              type="submit"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </motion.button>
                          )}
                        </AnimatePresence>
                      </div>
                    </form>

                    {/* Results or Quick Actions */}
                    <AnimatePresence mode="wait">
                      {showResults ? (
                        <motion.div
                          key="results"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="p-6 bg-card/5 rounded-[24px] border border-white/5 max-h-[300px] overflow-y-auto"
                        >
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">AI Response</span>
                            <button onClick={() => { setShowResults(false); setSearchResult(''); }} className="text-white/30 hover:text-white">
                              <Zap className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-sm leading-relaxed text-white/70 prose prose-invert prose-sm max-w-none">
                            {isSearching ? (
                              <span className="animate-pulse">Analysiere Daten...</span>
                            ) : (
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {searchResult}
                              </ReactMarkdown>
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="actions"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-3"
                        >
                          {quickActions.map((action) => (
                            <button
                              key={action.id}
                              onClick={() => handleQuickAction(action.query)}
                              className="w-full flex items-center gap-4 p-4 bg-card/[0.02] hover:bg-card/5 border border-white/5 hover:border-white/10 rounded-[20px] text-left transition-all group"
                            >
                              <div className="p-2.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group-hover:bg-indigo-500/20 transition-colors">
                                {action.icon}
                              </div>
                              <span className="text-sm font-medium text-white/70 group-hover:text-white">{action.label}</span>
                              <ChevronRight className="h-4 w-4 text-white/20 ml-auto group-hover:text-white/40 group-hover:translate-x-1 transition-all" />
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Bottom Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="p-5 bg-card/5 rounded-[32px] border border-white/5 group-hover:bg-card/[0.08] transition-colors">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Active Memory</p>
                      <p className="text-2xl font-bold">1,248</p>
                    </div>
                    <div className="p-5 bg-card/5 rounded-[32px] border border-white/5 group-hover:bg-card/[0.08] transition-colors">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">AI Context</p>
                      <p className="text-2xl font-bold text-green-400">Tier 3</p>
                    </div>
                  </div>
                </div>
              </BentoCard>

              {/* KNOWLEDGE GRAPH (Medium Card) */}
              <BentoCard delay={0.2} className="md:col-span-2 min-h-[350px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-sm font-semibold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Database className="h-4 w-4 text-accent" />
                    Wissensgraph
                  </h3>
                  <div className="px-2 py-1 bg-accent/10 border border-accent/20 rounded-lg text-[10px] font-bold text-accent">Live</div>
                </div>
                <div className="h-[280px]">
                  <KnowledgeGraph />
                </div>
              </BentoCard>

              {/* INTELLIGENCE FEED (Small Card) */}
              <BentoCard delay={0.3} className="flex flex-col">
                <div className="p-2 bg-indigo-500/10 rounded-xl w-fit border border-indigo-500/20 mb-4">
                  <TrendingUp className="h-5 w-5 text-indigo-400" />
                </div>
                <p className="text-sm text-white/40 mb-2">Intelligence Feed</p>
                <div className="space-y-3 flex-1">
                  {[
                    { type: 'Meeting', title: 'Q4 Forecast', time: '2h' },
                    { type: 'Doc', title: 'Competitor Analysis', time: '4h' },
                  ].map((item, i) => (
                    <div key={i} className="p-3 bg-card/5 rounded-xl border border-white/5">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-indigo-400 font-bold uppercase">{item.type}</span>
                        <span className="text-white/30">{item.time}</span>
                      </div>
                      <p className="text-xs font-medium text-white/70">{item.title}</p>
                    </div>
                  ))}
                </div>
              </BentoCard>

              {/* STRATEGY FORGE (Small Card) */}
              <BentoCard delay={0.4} className="flex flex-col bg-gradient-to-br from-white/[0.03] to-indigo-500/[0.03]">
                <div className="p-2 bg-teal-500/10 rounded-xl w-fit border border-teal-500/20 mb-4">
                  <Lightbulb className="h-5 w-5 text-teal-400" />
                </div>
                <p className="text-sm text-white/40 mb-2">Strategy Forge</p>
                <p className="text-2xl font-bold">3 Ideas</p>
                <p className="text-xs text-white/30 mt-1">Ready for review</p>
                <div className="mt-auto pt-4">
                  <button 
                    onClick={() => setActiveTab('ideas')}
                    className="w-full py-2.5 bg-card/5 hover:bg-card/10 rounded-xl text-xs font-bold text-white/60 hover:text-white transition-colors"
                  >
                    View All
                  </button>
                </div>
              </BentoCard>
            </div>

            {/* BOTTOM SECTION: CONTEXT ENGINE */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-8">
              <div className="lg:col-span-2 space-y-6">
                <h3 className="text-2xl font-bold text-white flex items-center gap-3">
                  <Zap className="h-6 w-6 text-white/20" />
                  Context Engine
                </h3>
                <div className="rounded-[32px] border border-white/5 bg-card/[0.02] p-8" style={{ backdropFilter: 'blur(30px)' }}>
                  <PredictiveContextEngine />
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-white">Daily Questions</h3>
                <div className="rounded-[32px] border border-white/5 bg-card/[0.02] p-8" style={{ backdropFilter: 'blur(30px)' }}>
                  <DailyLearningQuestions />
                </div>
              </div>
            </div>
          </>
        )}

        {/* MEETINGS TAB */}
        {activeTab === 'meetings' && (
          <BentoCard delay={0.1} className="min-h-[500px]">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Meeting Intelligence</h2>
              <p className="text-white/40 text-sm">Automatische Meeting-Vorbereitung mit KI-gestützten Briefings</p>
            </div>
            <PredictiveContextEngine />
          </BentoCard>
        )}

        {/* IDEAS TAB */}
        {activeTab === 'ideas' && (
          <BentoCard delay={0.1} className="min-h-[500px]">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Business-Ideen Generator</h2>
              <p className="text-white/40 text-sm">AI-generierte, datenbasierte Business-Ideen</p>
            </div>
            <BusinessIdeas />
          </BentoCard>
        )}

        {/* LEARNING TAB */}
        {activeTab === 'learning' && (
          <BentoCard delay={0.1} className="min-h-[500px]">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">Tägliche Lernfragen</h2>
              <p className="text-white/40 text-sm">Personalisierte AI-Fragen für strategisches Denken</p>
            </div>
            <DailyLearningQuestions />
          </BentoCard>
        )}

        {/* KNOWLEDGE TAB */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            {/* Sub-Tab Navigation */}
            <div className="flex items-center justify-between">
              <div className="flex gap-2 p-1 bg-card/5 rounded-xl border border-white/10">
                <button
                  onClick={() => setKnowledgeSubTab('library')}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                    ${knowledgeSubTab === 'library'
                      ? 'bg-card text-black shadow-md'
                      : 'text-white/50 hover:text-white/70 hover:bg-card/5'
                    }
                  `}
                >
                  <List className="h-4 w-4" />
                  Library
                </button>
                <button
                  onClick={() => setKnowledgeSubTab('graph')}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all
                    ${knowledgeSubTab === 'graph'
                      ? 'bg-card text-black shadow-md'
                      : 'text-white/50 hover:text-white/70 hover:bg-card/5'
                    }
                  `}
                >
                  <Network className="h-4 w-4" />
                  Graph View
                </button>
              </div>

              {/* Storage indicator for mobile */}
              {storageStats && (
                <div className="md:hidden flex items-center gap-2 text-xs text-white/50">
                  <HardDrive className="h-3.5 w-3.5" />
                  <span>{storageStats.storageUsedMB} MB / {storageStats.storageLimitMB} MB</span>
                </div>
              )}
            </div>

            {/* Sub-Tab Content */}
            <AnimatePresence mode="wait">
              {knowledgeSubTab === 'library' ? (
                <motion.div
                  key="library"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <BentoCard delay={0} className="min-h-[500px]">
                    <KnowledgeLibrary
                      onRefresh={() => showToast({ type: 'success', title: 'Aktualisiert', message: 'Wissensbibliothek wurde aktualisiert' })}
                    />
                  </BentoCard>
                </motion.div>
              ) : (
                <motion.div
                  key="graph"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  <BentoCard delay={0} className="min-h-[600px]">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-white mb-2">Knowledge Graph</h2>
                      <p className="text-white/40 text-sm">
                        Visualisiere die Verbindungen zwischen deinen Dokumenten und Wissenseinheiten
                      </p>
                    </div>
                    <InteractiveKnowledgeGraph
                      workspaceId="default-workspace"
                      onStartFocusedChat={(nodes) => {
                        setSelectedGraphNodes(nodes);
                        setShowFocusedChatModal(true);
                      }}
                    />
                  </BentoCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>


      <style jsx global>{`
        @import url('https://fonts.cdnfonts.com/css/sf-pro-display-all');
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>

      {/* Knowledge Upload Modal */}
      <KnowledgeUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => showToast({ type: 'success', title: 'Erfolg', message: 'Wissen erfolgreich gespeichert!' })}
      />

      {/* Focused Chat Modal - for scoped RAG with selected documents */}
      <FocusedChatModal
        isOpen={showFocusedChatModal}
        onClose={() => {
          setShowFocusedChatModal(false);
          setSelectedGraphNodes([]);
        }}
        selectedDocuments={selectedGraphNodes}
        workspaceId="default-workspace"
      />
    </div>
  );
}
