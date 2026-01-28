'use client';

import { useState, useCallback } from 'react';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Edit2,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  MoreHorizontal,
  Activity,
  Calendar,
  Webhook,
  Search,
  TrendingUp,
  GitBranch,
  Command,
  RefreshCw,
  Wand2,
  Sparkles,
  LayoutGrid,
  Star,
  Mail,
  Target,
  Share2,
  FileText,
  Brain,
  Database,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  useDashboardStore,
  usePipelines,
  useCurrentRunningPipelineId,
  usePipelineStreamingContent,
  useCurrentStepIndex,
  useHasHydrated,
} from '@/store/useDashboardStore';
import type { Pipeline, PipelineStatus } from '@/store/slices/createPipelineSlice';
import { PipelineBuilder } from '@/components/pipelines/PipelineBuilder';
import { PipelineWizard } from '@/components/pipelines/wizard/PipelineWizard';
import { TemplateGallery } from '@/components/pipelines/editor/TemplateGallery';
import { UserProfileBox } from '@/components/shell/UserProfileBox';
import { getStarterTemplates } from '@/lib/studio/template-library';
import { cn } from '@/lib/utils';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getStatusColor(status: PipelineStatus): string {
  switch (status) {
    case 'running':
      return 'text-blue-400 bg-blue-500/20';
    case 'completed':
      return 'text-emerald-400 bg-emerald-500/20';
    case 'failed':
      return 'text-red-400 bg-red-500/20';
    case 'paused':
      return 'text-amber-400 bg-amber-500/20';
    default:
      return 'text-white/60 bg-card/10';
  }
}

function getStatusIcon(status: PipelineStatus) {
  switch (status) {
    case 'running':
      return <Activity className="w-4 h-4 animate-pulse" />;
    case 'completed':
      return <CheckCircle className="w-4 h-4" />;
    case 'failed':
      return <XCircle className="w-4 h-4" />;
    case 'paused':
      return <Pause className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
}

function getTriggerIcon(type: Pipeline['triggerType']) {
  switch (type) {
    case 'manual':
      return <Play className="w-3.5 h-3.5" />;
    case 'schedule':
      return <Calendar className="w-3.5 h-3.5" />;
    case 'webhook':
      return <Webhook className="w-3.5 h-3.5" />;
  }
}

function formatDate(date: Date | undefined): string {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleDateString('de-DE', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subValue?: string;
}

function StatCard({ title, value, icon: Icon, color, subValue }: StatCardProps) {
  return (
    <div className="relative overflow-hidden p-6 rounded-2xl bg-card/[0.02] border border-white/5 hover:border-white/10 transition-all group">
      <div className={`absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity ${color}`}>
        <Icon className="w-8 h-8 opacity-20" />
      </div>
      <div className="relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-card/5 border border-white/5 ${color}`}>
          <Icon className="w-5 h-5 text-white/80" />
        </div>
        <div className="text-2xl font-bold text-white mb-1 tracking-tight">{value}</div>
        <div className="text-xs font-medium text-white/40 uppercase tracking-wider">{title}</div>
        {subValue && <div className="mt-2 text-xs text-white/20">{subValue}</div>}
      </div>
    </div>
  );
}

// ============================================================================
// PIPELINE CARD COMPONENT
// ============================================================================

interface PipelineCardProps {
  pipeline: Pipeline;
  isRunning: boolean;
  currentStepIndex: number;
  streamingContent: string | null;
  onRun: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
}

function PipelineCard({
  pipeline,
  isRunning,
  currentStepIndex,
  streamingContent,
  onRun,
  onStop,
  onEdit,
  onDelete,
  onToggleActive,
}: PipelineCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={cn(
        "group relative flex flex-col rounded-2xl border transition-all",
        isRunning
          ? "border-indigo-500/50 bg-indigo-500/5"
          : "border-white/5 bg-card/[0.02] hover:border-white/10 hover:bg-card/[0.04]"
      )}
    >
      {/* Card Header */}
      <div className="p-5 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "p-3 rounded-xl border",
                pipeline.isActive ? "bg-indigo-500/10 border-indigo-500/20" : "bg-zinc-500/10 border-white/5"
              )}
            >
              <GitBranch className={cn("w-5 h-5", pipeline.isActive ? "text-indigo-400" : "text-white/20")} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">{pipeline.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${getStatusColor(
                    pipeline.status
                  )}`}
                >
                  {getStatusIcon(pipeline.status)}
                  {pipeline.status.charAt(0).toUpperCase() + pipeline.status.slice(1)}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-card/10 text-white/60">
                  {getTriggerIcon(pipeline.triggerType)}
                  {pipeline.triggerType}
                </span>
              </div>
            </div>
          </div>

          {/* Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 rounded-lg hover:bg-card/10 transition-colors"
            >
              <MoreHorizontal className="w-5 h-5 text-white/60" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-full mt-1 z-20 w-48 rounded-xl bg-[#252538] border border-white/10 shadow-xl overflow-hidden">
                  <button
                    onClick={() => {
                      onEdit();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-white/80 hover:bg-card/10 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Pipeline bearbeiten
                  </button>
                  <button
                    onClick={() => {
                      onToggleActive();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-white/80 hover:bg-card/10 transition-colors"
                  >
                    {pipeline.isActive ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Deaktivieren
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Aktivieren
                      </>
                    )}
                  </button>
                  <hr className="border-white/10" />
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-left text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Pipeline löschen
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {pipeline.description && (
          <p className="text-sm text-white/50 mt-3 line-clamp-2">{pipeline.description}</p>
        )}
      </div>

      {/* Steps Visualization */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {pipeline.steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-shrink-0">
              <div
                className={cn(
                  "relative w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all border-2",
                  isRunning && index === currentStepIndex
                    ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-[#1a1a2e]"
                    : "",
                  step.status === 'completed'
                    ? "bg-emerald-500/20 text-emerald-400"
                    : step.status === 'running'
                    ? "bg-blue-500/20 text-blue-400"
                    : step.status === 'failed'
                    ? "bg-red-500/20 text-red-400"
                    : "bg-card/10 text-white/60"
                )}
                style={{
                  borderColor: step.agentColor,
                }}
                title={`${step.agentName}: ${step.instruction.slice(0, 50)}...`}
              >
                {index + 1}
              </div>
              {index < pipeline.steps.length - 1 && (
                <ChevronRight className="w-4 h-4 text-white/20 mx-0.5" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Running Progress */}
      {isRunning && streamingContent && (
        <div className="px-5 pb-3">
          <div className="p-3 rounded-lg bg-muted/30 border border-indigo-500/20">
            <p className="text-xs text-indigo-400 mb-1">
              Schritt {currentStepIndex + 1}: {pipeline.steps[currentStepIndex]?.agentName}
            </p>
            <p className="text-sm text-white/70 line-clamp-3">{streamingContent}</p>
          </div>
        </div>
      )}

      {/* Card Footer */}
      <div className="mt-auto px-5 py-4 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-white/40">
          <span>{pipeline.steps.length} Schritte</span>
          <span>{pipeline.runCount} Runs</span>
          <span>Letzter Run: {formatDate(pipeline.lastRunAt)}</span>
        </div>

        {isRunning ? (
          <button
            onClick={onStop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <Pause className="w-4 h-4" />
            Stop
          </button>
        ) : (
          <button
            onClick={onRun}
            disabled={!pipeline.isActive || pipeline.steps.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs font-bold uppercase tracking-wider"
          >
            <Play className="w-4 h-4" />
            Run
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// STARTER KIT CARD COMPONENT - Enterprise AI Design
// ============================================================================

interface StarterKitCardProps {
  template: {
    id: string;
    name: string;
    description: string;
    icon?: string;
    color?: string;
    nodes: unknown[];
    rating?: number;
    useCase?: string;
  };
  onClick: () => void;
}

function StarterKitCard({ template, onClick }: StarterKitCardProps) {
  // Icon mapping for templates
  const ICON_MAP: Record<string, LucideIcon> = {
    Mail, Target, Share2, FileText, Calendar, Brain, Database, Zap,
  };
  const Icon = ICON_MAP[template.icon || 'Zap'] || Zap;

  // Gradient colors based on template type
  const getGradientClass = (icon?: string) => {
    switch (icon) {
      case 'Mail':
        return 'from-blue-500/5 to-cyan-500/5';
      case 'Target':
        return 'from-emerald-500/5 to-teal-500/5';
      case 'Share2':
        return 'from-violet-500/5 to-purple-500/5';
      case 'FileText':
        return 'from-orange-500/5 to-amber-500/5';
      case 'Calendar':
        return 'from-pink-500/5 to-rose-500/5';
      case 'Brain':
        return 'from-indigo-500/5 to-blue-500/5';
      default:
        return 'from-violet-500/5 to-indigo-500/5';
    }
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative flex flex-col text-left rounded-xl overflow-hidden transition-all duration-300",
        "bg-card/40 backdrop-blur-sm border border-border",
        "hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-500/10",
        "hover:-translate-y-1"
      )}
    >
      {/* Subtle gradient background */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-300",
        getGradientClass(template.icon)
      )} />

      {/* Card Content */}
      <div className="relative z-10 p-6">
        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          {/* Icon Container */}
          <div
            className="relative flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{
              backgroundColor: `${template.color}15`,
            }}
          >
            <Icon
              size={24}
              style={{ color: template.color }}
              className="transition-all duration-300 group-hover:drop-shadow-lg"
            />
            {/* Glow effect on hover */}
            <div
              className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-50 blur-lg transition-opacity duration-300"
              style={{ backgroundColor: template.color }}
            />
          </div>

          {/* Title & Rating */}
          <div className="flex-1 min-w-0">
            <h5 className="text-white font-semibold text-base truncate group-hover:text-violet-200 transition-colors duration-200">
              {template.name}
            </h5>
            {template.rating && (
              <div className="flex items-center gap-1.5 mt-1">
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      size={10}
                      className={cn(
                        i < Math.floor(template.rating!) ? "text-yellow-400" : "text-white/10"
                      )}
                      fill={i < Math.floor(template.rating!) ? "currentColor" : "none"}
                    />
                  ))}
                </div>
                <span className="text-xs text-white/40">{template.rating.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4 leading-relaxed">
          {template.description}
        </p>
      </div>

      {/* Footer */}
      <div className="relative z-10 mt-auto px-6 py-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between">
          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs text-white/40">
            <span className="flex items-center gap-1">
              <GitBranch size={12} />
              {template.nodes.length} Nodes
            </span>
            <span className="px-2 py-0.5 rounded-full bg-card/5 text-white/50">
              {template.useCase?.split('→')[0]?.trim() || 'Automation'}
            </span>
          </div>

          {/* Setup Button */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-violet-400 group-hover:text-violet-300 transition-colors">
            <span>Setup</span>
            <ArrowRight
              size={14}
              className="transition-transform duration-200 group-hover:translate-x-1"
            />
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PipelinesPage() {
  const hasHydrated = useHasHydrated();
  const pipelines = usePipelines();
  const currentRunningPipelineId = useCurrentRunningPipelineId();
  const streamingContent = usePipelineStreamingContent();
  const currentStepIndex = useCurrentStepIndex();

  const runPipeline = useDashboardStore((s) => s.runPipeline);
  const stopPipeline = useDashboardStore((s) => s.stopPipeline);
  const deletePipeline = useDashboardStore((s) => s.deletePipeline);
  const togglePipelineActive = useDashboardStore((s) => s.togglePipelineActive);

  const [showBuilder, setShowBuilder] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showTemplateGallery, setShowTemplateGallery] = useState(false);
  const [editingPipelineId, setEditingPipelineId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const handleEdit = useCallback((pipelineId: string) => {
    setEditingPipelineId(pipelineId);
    setShowBuilder(true);
  }, []);

  const handleCloseBuilder = useCallback(() => {
    setShowBuilder(false);
    setEditingPipelineId(null);
  }, []);

  const handleCreateNew = useCallback(() => {
    setShowWizard(true);
  }, []);

  const handleCloseWizard = useCallback(() => {
    setShowWizard(false);
  }, []);

  // Filter pipelines
  const filteredPipelines = pipelines.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive);
    return matchesSearch && matchesStatus;
  });

  // Stats
  const totalRuns = pipelines.reduce((acc, p) => acc + p.runCount, 0);
  const activePipelinesCount = pipelines.filter((p) => p.isActive).length;
  const successRate = totalRuns > 0
    ? Math.round((pipelines.filter(p => p.status === 'completed').length / pipelines.length) * 100)
    : 0;

  if (!hasHydrated) {
    return (
      <div className="min-h-full bg-transparent flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
          <span className="text-xs text-white/30 uppercase tracking-widest font-bold">Lade Pipelines...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-transparent overflow-hidden relative font-sans w-full max-w-[1600px] mx-auto px-6 lg:px-8">
      {/* Enterprise Header */}
      <div className="mb-10 flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
            <span className="opacity-50">SYSTEM</span>
            <span className="opacity-30">/</span>
            <span>PIPELINES</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
              Automation Hub
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-card/10 text-white/50 border border-white/10">
              Level 11
            </span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <button
            className="flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-card/5 px-4 text-xs font-bold text-white/60 transition-colors hover:bg-card/10 hover:text-white uppercase tracking-wider"
            onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))}
          >
            <Command className="w-3 h-3" />
            <span className="hidden sm:inline">Schnellaktionen</span>
            <kbd className="hidden rounded border border-white/10 bg-card/5 px-1.5 py-0.5 text-[10px] font-mono sm:inline ml-2">
              ⌘K
            </kbd>
          </button>
          <UserProfileBox />
        </div>
      </div>

      {/* Content */}
      <div className="space-y-10 animate-in fade-in duration-500 slide-in-from-bottom-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <StatCard
            title="Gesamt Pipelines"
            value={pipelines.length}
            icon={Zap}
            color="text-indigo-400"
          />
          <StatCard
            title="Aktive Pipelines"
            value={activePipelinesCount}
            icon={Activity}
            color="text-emerald-400"
          />
          <StatCard
            title="Derzeit Laufend"
            value={currentRunningPipelineId ? 1 : 0}
            icon={Clock}
            color="text-blue-400"
            subValue={currentRunningPipelineId ? "System verarbeitet..." : "System im Leerlauf"}
          />
          <StatCard
            title="Ausführungen (Gesamt)"
            value={totalRuns}
            icon={TrendingUp}
            color="text-amber-400"
          />
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Suche..."
                className="bg-card/5 border border-white/10 text-white text-sm rounded-xl focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 block w-64 pl-10 p-2.5 placeholder-white/20 transition-all hover:bg-card/[0.07]"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-1 p-1 bg-card/5 rounded-xl border border-white/10">
              {(['all', 'active', 'inactive'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                    statusFilter === f
                      ? "bg-card/10 text-white shadow-sm"
                      : "text-white/40 hover:text-white/60"
                  )}
                >
                  {f === 'all' ? 'Alle' : f === 'active' ? 'Aktiv' : 'Inaktiv'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowTemplateGallery(true)}
              className="flex items-center gap-2 bg-card/5 hover:bg-card/10 border border-white/10 hover:border-white/20 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Vorlagen</span>
            </button>
            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40"
            >
              <Wand2 className="w-4 h-4" />
              <span>Neue Pipeline</span>
            </button>
          </div>
        </div>

        {/* Pipelines Grid */}
        {filteredPipelines.length === 0 ? (
          <div className="mt-12">
            {/* Empty State Header */}
            <div className="text-center py-12 rounded-2xl border border-dashed border-white/10 bg-card/[0.01] mb-12">
              <div className="relative inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 mb-6">
                <Zap className="w-8 h-8 text-violet-400" />
                <div className="absolute inset-0 rounded-2xl bg-violet-500/20 blur-xl opacity-50" />
              </div>
              {pipelines.length === 0 ? (
                <>
                  <h3 className="text-white font-semibold text-xl mb-2">Keine Pipelines vorhanden</h3>
                  <p className="text-white/50 text-sm max-w-md mx-auto mb-8">
                    Erstellen Sie Ihre erste Automatisierung mit KI oder wählen Sie ein vorkonfiguriertes Starter-Kit.
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={() => setShowTemplateGallery(true)}
                      className="inline-flex items-center gap-2 bg-card/5 hover:bg-card/10 border border-white/10 hover:border-white/20 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all"
                    >
                      <LayoutGrid className="w-5 h-5" />
                      Vorlage wählen
                    </button>
                    <button
                      onClick={handleCreateNew}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40"
                    >
                      <Wand2 className="w-5 h-5" />
                      Mit KI erstellen
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <h3 className="text-white font-semibold text-lg">Keine Ergebnisse</h3>
                  <p className="text-white/50 text-sm mt-2">
                    Keine Pipelines gefunden für Ihre Suche.
                  </p>
                </>
              )}
            </div>

            {/* Recommended Starter Kits - Full Width Section */}
            {pipelines.length === 0 && (
              <div className="w-full">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-amber-500/20">
                      <Sparkles className="w-5 h-5 text-orange-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold text-lg">Empfohlene Starter-Kits</h4>
                      <p className="text-white/40 text-sm">Vorkonfigurierte Automatisierungen für sofortigen Start</p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-full text-xs font-semibold bg-gradient-to-r from-orange-500/20 to-amber-500/20 text-orange-400 border border-orange-500/20">
                    30 Sekunden Setup
                  </span>
                </div>

                {/* Starter Kit Cards Grid - 3 columns on 2xl */}
                <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6">
                  {getStarterTemplates(3).map((template) => (
                    <StarterKitCard
                      key={template.id}
                      template={template}
                      onClick={() => setShowTemplateGallery(true)}
                    />
                  ))}
                </div>

                {/* View All Link */}
                <div className="mt-8 text-center">
                  <button
                    onClick={() => setShowTemplateGallery(true)}
                    className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors group"
                  >
                    <span>Alle Vorlagen anzeigen</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-6">
            {filteredPipelines.map((pipeline) => (
              <PipelineCard
                key={pipeline.id}
                pipeline={pipeline}
                isRunning={currentRunningPipelineId === pipeline.id}
                currentStepIndex={
                  currentRunningPipelineId === pipeline.id ? currentStepIndex : 0
                }
                streamingContent={
                  currentRunningPipelineId === pipeline.id ? streamingContent : null
                }
                onRun={() => runPipeline(pipeline.id)}
                onStop={() => stopPipeline(pipeline.id)}
                onEdit={() => handleEdit(pipeline.id)}
                onDelete={() => {
                  if (confirm(`Möchten Sie "${pipeline.name}" wirklich löschen?`)) {
                    deletePipeline(pipeline.id);
                  }
                }}
                onToggleActive={() => togglePipelineActive(pipeline.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pipeline Builder Modal */}
      <PipelineBuilder
        isOpen={showBuilder}
        onClose={handleCloseBuilder}
        editingPipelineId={editingPipelineId}
      />

      {/* Pipeline Wizard Modal (AI Generator & Templates) */}
      <PipelineWizard
        isOpen={showWizard}
        onClose={handleCloseWizard}
      />

      {/* Template Gallery Modal */}
      <TemplateGallery
        isOpen={showTemplateGallery}
        onClose={() => setShowTemplateGallery(false)}
      />
    </div>
  );
}
