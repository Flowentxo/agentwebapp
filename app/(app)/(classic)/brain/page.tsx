'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Upload,
  Lightbulb,
  GraduationCap,
  Zap,
  Database,
  TrendingUp,
} from 'lucide-react';
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
import { BrainChat } from '@/components/brain/BrainChat';
import { PipelineWizard } from '@/components/pipelines/wizard/PipelineWizard';
import { getKnowledgeStorageStats, type StorageStats, type GraphNode } from '@/actions/brain-actions';
import { HardDrive, List, Network, Keyboard } from 'lucide-react';
import { Omnibar } from '@/components/brain/Omnibar';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'knowledge' | 'meetings' | 'ideas' | 'learning'>('overview');
  const [knowledgeSubTab, setKnowledgeSubTab] = useState<'library' | 'graph'>('library');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showFocusedChatModal, setShowFocusedChatModal] = useState(false);
  const [selectedGraphNodes, setSelectedGraphNodes] = useState<GraphNode[]>([]);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const { showToast } = useToast();

  // Live metrics state
  const [brainMetrics, setBrainMetrics] = useState<{
    activeMemory: number;
    indexedPercent: number;
    ideaCount: number;
  } | null>(null);
  const [recentActivity, setRecentActivity] = useState<{ type: string; title: string; time: string }[]>([]);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPipelineWizard, setShowPipelineWizard] = useState(false);
  const [pipelineInitialData, setPipelineInitialData] = useState<{ title?: string; description?: string } | null>(null);

  // Keyboard shortcuts for Brain page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return;

      // Tab switching with number keys 1-5
      const tabKeys: Record<string, typeof activeTab> = {
        '1': 'overview', '2': 'knowledge', '3': 'meetings', '4': 'ideas', '5': 'learning',
      };
      if (tabKeys[e.key]) {
        e.preventDefault();
        setActiveTab(tabKeys[e.key]);
        return;
      }

      // '/' → Open Omnibar (Ctrl+K equivalent)
      if (e.key === '/') {
        e.preventDefault();
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true }));
        return;
      }

      // 'u' → Open upload modal
      if (e.key === 'u') {
        e.preventDefault();
        setShowUploadModal(true);
        return;
      }

      // 'c' → Open focused chat modal
      if (e.key === 'c') {
        e.preventDefault();
        setShowFocusedChatModal(true);
        return;
      }

      // '?' → Toggle shortcuts overlay
      if (e.key === '?') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
        return;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Load storage stats and live metrics on mount
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

  // Load live brain metrics
  useEffect(() => {
    async function loadMetrics() {
      try {
        const [analyticsRes, ideasRes] = await Promise.all([
          fetch('/api/brain/analytics?period=30d', { headers: { 'x-workspace-id': 'default-workspace' } }),
          fetch('/api/business-ideas?status=new').catch(() => null),
        ]);

        let activeMemory = 0;
        let indexedPercent = 0;
        if (analyticsRes.ok) {
          const json = await analyticsRes.json();
          const data = json.data;
          activeMemory = data?.usage?.totalDocuments || 0;
          const successRate = data?.quality?.searchSuccessRate || 0;
          indexedPercent = Math.round(successRate * 100);
        }

        let ideaCount = 0;
        if (ideasRes && ideasRes.ok) {
          const ideasJson = await ideasRes.json();
          ideaCount = Array.isArray(ideasJson.data) ? ideasJson.data.length : (ideasJson.count || 0);
        }

        setBrainMetrics({ activeMemory, indexedPercent: indexedPercent || 0, ideaCount });

        // Load recent activity from knowledge items
        try {
          const knowledgeRes = await fetch('/api/brain/knowledge/list?limit=3&sort=newest', {
            headers: { 'x-workspace-id': 'default-workspace' },
          });
          if (knowledgeRes.ok) {
            const kJson = await knowledgeRes.json();
            const items = kJson.data || kJson.documents || [];
            if (Array.isArray(items)) {
              const now = Date.now();
              setRecentActivity(items.slice(0, 3).map((doc: any) => {
                const created = new Date(doc.createdAt || doc.created_at || now);
                const diffH = Math.max(1, Math.round((now - created.getTime()) / (1000 * 60 * 60)));
                const timeStr = diffH < 24 ? `${diffH}h` : `${Math.round(diffH / 24)}d`;
                return {
                  type: doc.category || doc.type || 'Doc',
                  title: doc.title || doc.name || 'Unnamed',
                  time: timeStr,
                };
              }));
            }
          }
        } catch {
          // silently fail - feed stays empty
        }
      } catch (error) {
        console.warn('[Brain] Failed to load metrics:', error);
      }
    }
    loadMetrics();
  }, []);

  // Tab configuration
  const tabs = useMemo(() => [
    { id: 'overview' as const, label: 'Übersicht', icon: <Brain className="h-4 w-4" /> },
    { id: 'knowledge' as const, label: 'Wissen', icon: <Database className="h-4 w-4" /> },
    { id: 'meetings' as const, label: 'Meeting Intel', icon: <Zap className="h-4 w-4" /> },
    { id: 'ideas' as const, label: 'Ideen', icon: <Lightbulb className="h-4 w-4" /> },
    { id: 'learning' as const, label: 'Learning', icon: <GraduationCap className="h-4 w-4" /> },
  ], []);

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

        {/* TAB STATS BAR */}
        {brainMetrics && (
          <div className="flex items-center gap-6 px-4 py-2 rounded-xl bg-card/[0.03] border border-white/5 text-xs">
            {activeTab === 'overview' && (
              <>
                <span className="text-white/40">Total Docs: <span className="text-white/70 font-medium">{brainMetrics.activeMemory}</span></span>
                <span className="text-white/10">|</span>
                <span className="text-white/40">Indexed: <span className="text-white/70 font-medium">{brainMetrics.indexedPercent}%</span></span>
                <span className="text-white/10">|</span>
                <span className="text-white/40">Ideas: <span className="text-white/70 font-medium">{brainMetrics.ideaCount}</span></span>
              </>
            )}
            {activeTab === 'knowledge' && (
              <>
                <span className="text-white/40">Dokumente: <span className="text-white/70 font-medium">{brainMetrics.activeMemory}</span></span>
                <span className="text-white/10">|</span>
                <span className="text-white/40">Storage: <span className="text-white/70 font-medium">{storageStats?.storageUsedMB || '—'} MB</span></span>
              </>
            )}
            {activeTab === 'meetings' && (
              <>
                <span className="text-white/40">Context Engine: <span className="text-white/70 font-medium">Active</span></span>
              </>
            )}
            {activeTab === 'ideas' && (
              <>
                <span className="text-white/40">Ideas: <span className="text-white/70 font-medium">{brainMetrics.ideaCount}</span></span>
              </>
            )}
            {activeTab === 'learning' && (
              <>
                <span className="text-white/40">Learning Module: <span className="text-white/70 font-medium">Active</span></span>
              </>
            )}
          </div>
        )}

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
                        <p className="text-sm font-bold text-indigo-400">{brainMetrics ? `${brainMetrics.indexedPercent}% Indexed` : '—'}</p>
                      </div>
                    </div>

                    {/* Persistent Chat (replaces one-shot search) */}
                    <div className="rounded-[24px] border border-white/5 bg-card/[0.02] overflow-hidden">
                      <BrainChat compact />
                    </div>
                  </div>

                  {/* Bottom Stats */}
                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="p-5 bg-card/5 rounded-[32px] border border-white/5 group-hover:bg-card/[0.08] transition-colors">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Active Memory</p>
                      <p className="text-2xl font-bold">{brainMetrics ? brainMetrics.activeMemory.toLocaleString('de-DE') : '—'}</p>
                    </div>
                    <div className="p-5 bg-card/5 rounded-[32px] border border-white/5 group-hover:bg-card/[0.08] transition-colors">
                      <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1">AI Context</p>
                      <p className="text-2xl font-bold text-green-400">{brainMetrics ? `${brainMetrics.indexedPercent}%` : '—'}</p>
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
                  {recentActivity.length > 0 ? recentActivity.map((item, i) => (
                    <div key={i} className="p-3 bg-card/5 rounded-xl border border-white/5">
                      <div className="flex justify-between text-[10px] mb-1">
                        <span className="text-indigo-400 font-bold uppercase">{item.type}</span>
                        <span className="text-white/30">{item.time}</span>
                      </div>
                      <p className="text-xs font-medium text-white/70">{item.title}</p>
                    </div>
                  )) : (
                    <div className="p-3 bg-card/5 rounded-xl border border-white/5">
                      <p className="text-xs text-white/40">Noch keine Aktivitäten</p>
                    </div>
                  )}
                </div>
              </BentoCard>

              {/* STRATEGY FORGE (Small Card) */}
              <BentoCard delay={0.4} className="flex flex-col bg-gradient-to-br from-white/[0.03] to-indigo-500/[0.03]">
                <div className="p-2 bg-teal-500/10 rounded-xl w-fit border border-teal-500/20 mb-4">
                  <Lightbulb className="h-5 w-5 text-teal-400" />
                </div>
                <p className="text-sm text-white/40 mb-2">Strategy Forge</p>
                <p className="text-2xl font-bold">{brainMetrics ? `${brainMetrics.ideaCount} Ideas` : '— Ideas'}</p>
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
            <BusinessIdeas
              onConvertToPipeline={(idea) => {
                setPipelineInitialData({
                  title: idea.title,
                  description: `${idea.description}\n\nSteps: ${idea.steps?.join(', ') || ''}\nMetrics: ${idea.metrics?.join(', ') || ''}`,
                });
                setShowPipelineWizard(true);
              }}
            />
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

      {/* Pipeline Wizard (triggered from Ideas→Pipeline bridge) */}
      <PipelineWizard
        isOpen={showPipelineWizard}
        onClose={() => {
          setShowPipelineWizard(false);
          setPipelineInitialData(null);
        }}
        initialPrompt={pipelineInitialData ? `${pipelineInitialData.title}: ${pipelineInitialData.description}` : undefined}
      />

      {/* Omnibar (Ctrl+K / Cmd+K) */}
      <Omnibar />

      {/* Keyboard Shortcuts Overlay */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center"
            onClick={() => setShowShortcuts(false)}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-[#1A1D24] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <Keyboard className="h-5 w-5 text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Keyboard Shortcuts</h3>
              </div>
              <div className="space-y-3">
                {[
                  { keys: '1-5', desc: 'Switch tabs (Overview → Learning)' },
                  { keys: '/', desc: 'Focus search input' },
                  { keys: 'U', desc: 'Open upload modal' },
                  { keys: 'C', desc: 'Open chat modal' },
                  { keys: 'Ctrl+K', desc: 'Open command palette' },
                  { keys: '?', desc: 'Toggle this overlay' },
                ].map((shortcut) => (
                  <div key={shortcut.keys} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-white/70">{shortcut.desc}</span>
                    <kbd className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-white/60">{shortcut.keys}</kbd>
                  </div>
                ))}
              </div>
              <p className="text-xs text-white/30 mt-4 text-center">Press ? or Esc to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
