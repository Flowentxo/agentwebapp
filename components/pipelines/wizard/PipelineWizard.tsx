'use client';

/**
 * PipelineWizard Component
 *
 * Multi-step "Consultant-to-Solution" wizard for creating new pipelines:
 * 1. Persona Selection - Choose your business type
 * 2. Pain Point Diagnosis - Identify challenges
 * 3. Strategy Proposal - AI generates tailored solutions
 * 4. Pipeline Generation - Full workflow built from strategy
 *
 * Also includes a "Vorlagen" (Templates) tab for pre-built templates.
 *
 * Phase I: Dynamic Discovery Engine
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Wand2,
  Search,
  Clock,
  TrendingUp,
  Users,
  Target,
  Zap,
  Bot,
  ChevronRight,
  Star,
  Download,
  ArrowRight,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  FileText,
  Plus,
  Brain,
  GitBranch,
  BarChart,
  MessageSquare,
  Database,
  Share2,
  Layers,
} from 'lucide-react';
import { MiniGraphPreview } from './MiniGraphPreview';
import { usePipelineStore } from '@/components/pipelines/store/usePipelineStore';
import type {
  PipelineTemplateListItem,
  TemplatesApiResponse,
  TemplateCategory,
  TemplateComplexity,
} from '@/lib/types/pipeline-templates';

// Discovery Engine Steps
import { PersonaStep } from './steps/PersonaStep';
import { PainPointStep } from './steps/PainPointStep';
import { StrategyStep, type Strategy } from './steps/StrategyStep';
import { type BusinessPersona, getPersonaById } from '@/lib/pipelines/business-personas';
import { type PainPoint, getPainPointById } from '@/lib/pipelines/pain-points';

// ============================================================================
// Types & Constants
// ============================================================================

interface PipelineWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialPrompt?: string;
  userId?: string;
}

type WizardTab = 'consultant' | 'templates';
type WizardStep = 'persona' | 'pain-points' | 'strategy' | 'ghost-analysis' | 'generating' | 'complete' | 'error';

type GenerationState =
  | 'idle'
  | 'analyzing'
  | 'designing'
  | 'building'
  | 'connecting'
  | 'finalizing'
  | 'complete'
  | 'error';

const GENERATION_STEPS: { state: GenerationState; messageDe: string; icon: React.ElementType }[] = [
  { state: 'analyzing', messageDe: 'Konstruiere Pipeline...', icon: Brain },
  { state: 'designing', messageDe: 'Integriere Agenten...', icon: GitBranch },
  { state: 'building', messageDe: 'Erstelle Nodes...', icon: Zap },
  { state: 'connecting', messageDe: 'Verbinde Datenflüsse...', icon: ArrowRight },
  { state: 'finalizing', messageDe: 'Finalisiere Setup...', icon: CheckCircle },
];

const GHOST_ANALYSIS_STEPS = [
  'Lese Anforderung...',
  'Erkenne Branche...',
  'Identifiziere Herausforderungen...',
  'Entwickle Strategien...',
];

// Category definitions with German labels
const CATEGORIES: { id: TemplateCategory | 'all'; labelDe: string; icon: React.ElementType }[] = [
  { id: 'all', labelDe: 'Alle', icon: Sparkles },
  { id: 'sales', labelDe: 'Verkauf', icon: Target },
  { id: 'automation', labelDe: 'Automatisierung', icon: Zap },
  { id: 'customer-support', labelDe: 'Kundenservice', icon: MessageSquare },
  { id: 'marketing', labelDe: 'Marketing', icon: TrendingUp },
  { id: 'data-analysis', labelDe: 'Daten', icon: BarChart },
];

const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Bot, Target, TrendingUp, Users, Clock, BarChart, FileText, Sparkles,
  Brain, GitBranch, MessageSquare, Database, Share2, Layers,
};

const COMPLEXITY_LABELS: Record<TemplateComplexity, { label: string; color: string }> = {
  beginner: { label: 'Einsteiger', color: '#10B981' },
  intermediate: { label: 'Fortgeschritten', color: '#F59E0B' },
  advanced: { label: 'Experte', color: '#EF4444' },
};

const STEP_LABELS: Record<string, string> = {
  persona: 'Branche',
  'pain-points': 'Herausforderungen',
  strategy: 'Strategie',
};

// ============================================================================
// Skeleton Component
// ============================================================================

function TemplateCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-5 animate-pulse">
      <div className="mb-4 rounded-lg bg-muted h-[100px]" />
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-muted" />
        <div className="flex-1">
          <div className="h-5 bg-muted rounded w-3/4 mb-2" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="h-10 bg-muted rounded mb-4" />
      <div className="flex justify-between pt-3 border-t border-border">
        <div className="h-4 bg-muted rounded w-20" />
        <div className="h-4 bg-muted rounded w-16" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PipelineWizard({ isOpen, onClose, initialPrompt, userId }: PipelineWizardProps) {
  const router = useRouter();

  // Active tab
  const [activeTab, setActiveTab] = useState<WizardTab>('consultant');

  // Discovery Engine state
  const [wizardStep, setWizardStep] = useState<WizardStep>('persona');
  const [selectedPersona, setSelectedPersona] = useState<BusinessPersona | null>(null);
  const [selectedPainPoints, setSelectedPainPoints] = useState<PainPoint[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Generation animation state
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Ghost Analysis state (Smart-Entry)
  const [ghostResult, setGhostResult] = useState<{
    strategies: Strategy[];
    summary: string;
    personaId: string;
    painPointIds: string[];
  } | null>(null);
  const [ghostAnalysisStep, setGhostAnalysisStep] = useState(0);

  // Template state
  const [templates, setTemplates] = useState<PipelineTemplateListItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // ============================================================================
  // Reset on open
  // ============================================================================

  useEffect(() => {
    if (isOpen) {
      setActiveTab('consultant');
      setSelectedPersona(null);
      setSelectedPainPoints([]);
      setGenerationError(null);
      setGenerationState('idle');
      setCurrentStepIndex(0);
      setSelectedCategory('all');
      setSearchQuery('');
      setGhostResult(null);
      setGhostAnalysisStep(0);
      fetchTemplates();

      // Smart-Entry: if user typed a substantial prompt, run ghost analysis
      if (initialPrompt && initialPrompt.trim().length > 15) {
        setWizardStep('ghost-analysis');
        runGhostAnalysis(initialPrompt.trim());
      } else {
        setWizardStep('persona');
      }
    }
  }, [isOpen]);

  // ============================================================================
  // Template Fetching
  // ============================================================================

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);
    try {
      const response = await fetch('/api/pipelines/templates');
      const data: TemplatesApiResponse = await response.json();
      if (!data.success) throw new Error('Failed to load templates');
      setTemplates(data.data.templates);
    } catch (error: any) {
      console.error('[PipelineWizard] Failed to fetch templates:', error);
      setTemplatesError('Vorlagen konnten nicht geladen werden');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesCategory = selectedCategory === 'all' || template.templateCategory === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.businessBenefit || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  // ============================================================================
  // Generation Animation
  // ============================================================================

  useEffect(() => {
    if (generationState === 'analyzing') {
      let stepIndex = 0;
      const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < GENERATION_STEPS.length) {
          setCurrentStepIndex(stepIndex);
          setGenerationState(GENERATION_STEPS[stepIndex].state);
        }
      }, 1200);
      return () => clearInterval(interval);
    }
  }, [generationState]);

  // ============================================================================
  // Ghost Analysis (Smart-Entry)
  // ============================================================================

  const runGhostAnalysis = useCallback(async (prompt: string) => {
    setGhostAnalysisStep(0);

    // Animated step progress
    const interval = setInterval(() => {
      setGhostAnalysisStep((prev) =>
        prev < GHOST_ANALYSIS_STEPS.length - 1 ? prev + 1 : prev
      );
    }, 1000);

    try {
      const res = await fetch('/api/pipelines/analyze-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data.success && !data.fallback && data.strategies?.length > 0) {
        // Resolve persona and pain points from IDs
        const persona = getPersonaById(data.personaId);
        const painPoints = (data.painPointIds || [])
          .map((id: string) => getPainPointById(id))
          .filter(Boolean) as PainPoint[];

        if (persona) setSelectedPersona(persona);
        if (painPoints.length > 0) setSelectedPainPoints(painPoints);

        setGhostResult({
          strategies: data.strategies,
          summary: data.summary || '',
          personaId: data.personaId,
          painPointIds: data.painPointIds || [],
        });
        setWizardStep('strategy');
      } else {
        // Fallback: start at persona step
        setWizardStep('persona');
      }
    } catch (error) {
      console.error('[PipelineWizard] Ghost analysis error:', error);
      setWizardStep('persona');
    } finally {
      clearInterval(interval);
    }
  }, []);

  // ============================================================================
  // Discovery Engine Handlers
  // ============================================================================

  const handlePersonaSelect = (persona: BusinessPersona) => {
    setSelectedPersona(persona);
    setWizardStep('pain-points');
  };

  const handlePainPointsNext = (painPoints: PainPoint[]) => {
    setSelectedPainPoints(painPoints);
    setWizardStep('strategy');
  };

  const handleStrategySelect = async (strategy: Strategy, enhancedPrompt: string) => {
    setWizardStep('generating');
    setGenerationState('analyzing');
    setCurrentStepIndex(0);
    setGenerationError(null);

    // Use userId from props (from useSession), fallback to empty string
    const authUserId = userId || '';
    if (!authUserId) {
      setWizardStep('error');
      setGenerationState('error');
      setGenerationError('Nicht authentifiziert. Bitte melden Sie sich erneut an.');
      return;
    }

    try {
      // Step 1: Generate full pipeline from enhanced prompt
      const response = await fetch('/api/pipelines/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authUserId,
        },
        body: JSON.stringify({ prompt: enhancedPrompt }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Pipeline konnte nicht generiert werden');
      }

      // Step 2: Save to DB (sequential, no setTimeout)
      setGenerationState('finalizing');
      setCurrentStepIndex(4);

      const pipelineName = data.pipeline.name || strategy.name || 'AI Generated Pipeline';

      const saveResponse = await fetch('/api/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': authUserId,
        },
        body: JSON.stringify({
          name: pipelineName,
          description: data.pipeline.description || strategy.description || '',
          nodes: data.pipeline.nodes || [],
          edges: data.pipeline.edges || [],
          status: 'draft',
        }),
      });

      const saveData = await saveResponse.json();
      if (!saveResponse.ok || !saveData.success || !saveData.pipeline?.id) {
        throw new Error(saveData.error || 'Pipeline konnte nicht gespeichert werden');
      }

      // Step 3: Load into Zustand, dispatch event, navigate
      const savedPipelineId = saveData.pipeline.id;

      const { loadPipeline } = usePipelineStore.getState();
      loadPipeline(
        savedPipelineId,
        data.pipeline.nodes || [],
        data.pipeline.edges || [],
        pipelineName
      );

      window.dispatchEvent(new Event('pipeline-created'));

      setGenerationState('complete');
      setWizardStep('complete');

      // Brief pause to show success checkmark, then navigate to cockpit
      setTimeout(() => {
        onClose();
        router.push(`/pipelines/${savedPipelineId}`);
      }, 1200);
    } catch (error: any) {
      console.error('[PipelineWizard] Generation/Save error:', error);
      setWizardStep('error');
      setGenerationState('error');
      setGenerationError(error.message || 'Pipeline konnte nicht generiert werden.');
    }
  };

  // ============================================================================
  // Template Handlers
  // ============================================================================

  const handleSelectTemplate = async (template: PipelineTemplateListItem) => {
    try {
      const response = await fetch('/api/pipelines/templates/clone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': 'demo-user' },
        body: JSON.stringify({ templateId: template.id }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Template konnte nicht kopiert werden');
      onClose();
      router.push(`/studio?id=${data.data.workflowId}`);
    } catch {
      onClose();
      router.push(`/studio?template=${template.id}`);
    }
  };

  const handleStartFromScratch = () => {
    onClose();
    router.push('/studio');
  };

  const getIcon = (iconName: string | null) => ICON_MAP[iconName || 'Zap'] || Zap;

  const currentGenStep = GENERATION_STEPS[currentStepIndex];

  // Progress dots for wizard steps
  const wizardStepIndex = wizardStep === 'persona' ? 0 : wizardStep === 'pain-points' ? 1 : 2;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Wizard Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 md:inset-8 lg:inset-12 rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-white/[0.06]"
            style={{ backgroundColor: 'var(--vicy-bg)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-5 border-b border-white/[0.06]">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                  <Wand2 className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-white">
                    Neue Pipeline erstellen
                  </h1>
                  <p className="text-xs text-white/40 mt-0.5">
                    Lassen Sie sich beraten oder wählen Sie eine Vorlage
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Tab Switcher */}
                <div className="flex bg-white/[0.03] rounded-lg p-0.5 border border-white/[0.06]">
                  <button
                    onClick={() => setActiveTab('consultant')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'consultant'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      KI-Berater
                    </span>
                  </button>
                  <button
                    onClick={() => setActiveTab('templates')}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                      activeTab === 'templates'
                        ? 'bg-violet-600 text-white shadow-sm'
                        : 'text-white/50 hover:text-white/80'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      Vorlagen
                    </span>
                  </button>
                </div>

                <button
                  onClick={onClose}
                  className="p-2 hover:bg-white/[0.05] rounded-xl text-white/40 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <AnimatePresence mode="wait">
                {activeTab === 'consultant' ? (
                  <motion.div
                    key="consultant"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="h-full flex flex-col"
                  >
                    {/* Progress Indicator (only for persona/pain-points/strategy steps) */}
                    {['persona', 'pain-points', 'strategy'].includes(wizardStep) && (
                      <div className="flex items-center justify-center gap-8 py-4 border-b border-white/[0.04]">
                        {['persona', 'pain-points', 'strategy'].map((step, i) => (
                          <div key={step} className="flex items-center gap-2">
                            <div
                              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                                i < wizardStepIndex
                                  ? 'bg-violet-500 text-white'
                                  : i === wizardStepIndex
                                  ? 'bg-violet-500/20 text-violet-400 border border-violet-500/40'
                                  : 'bg-white/[0.04] text-white/30'
                              }`}
                            >
                              {i < wizardStepIndex ? (
                                <CheckCircle className="w-3.5 h-3.5" />
                              ) : (
                                i + 1
                              )}
                            </div>
                            <span
                              className={`text-xs font-medium ${
                                i <= wizardStepIndex ? 'text-white/70' : 'text-white/30'
                              }`}
                            >
                              {STEP_LABELS[step]}
                            </span>
                            {i < 2 && (
                              <div className={`w-12 h-px ${i < wizardStepIndex ? 'bg-violet-500' : 'bg-white/[0.06]'}`} />
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Step Content */}
                    <div className="flex-1 overflow-auto p-8">
                      <AnimatePresence mode="wait">
                        {/* Ghost Analysis (Smart-Entry) */}
                        {wizardStep === 'ghost-analysis' && (
                          <motion.div
                            key="ghost-analysis"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="flex flex-col items-center justify-center h-full"
                          >
                            <motion.div
                              initial={{ scale: 0.8, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              className="text-center"
                            >
                              <div className="relative w-16 h-16 mx-auto mb-6">
                                <div className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Brain className="w-8 h-8 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
                                </div>
                              </div>

                              <h3 className="text-lg font-medium text-white mb-2">
                                Analysiere Anforderung...
                              </h3>
                              <p className="text-sm text-white/40 mb-6 max-w-md mx-auto">
                                {initialPrompt && initialPrompt.length > 60
                                  ? `"${initialPrompt.substring(0, 60)}..."`
                                  : `"${initialPrompt}"`}
                              </p>

                              <div className="space-y-2 mt-4">
                                {GHOST_ANALYSIS_STEPS.map((step, i) => (
                                  <motion.div
                                    key={step}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{
                                      opacity: i <= ghostAnalysisStep ? 1 : 0.3,
                                      x: 0,
                                    }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-2 text-sm"
                                  >
                                    {i < ghostAnalysisStep ? (
                                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                                    ) : i === ghostAnalysisStep ? (
                                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                                    ) : (
                                      <div className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0" />
                                    )}
                                    <span className={i <= ghostAnalysisStep ? 'text-white/70' : 'text-white/30'}>
                                      {step}
                                    </span>
                                  </motion.div>
                                ))}
                              </div>
                            </motion.div>
                          </motion.div>
                        )}

                        {/* Step 1: Persona Selection */}
                        {wizardStep === 'persona' && (
                          <motion.div
                            key="persona"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full"
                          >
                            <PersonaStep
                              onSelect={handlePersonaSelect}
                              preselectedPersonaId={ghostResult?.personaId}
                            />
                          </motion.div>
                        )}

                        {/* Step 2: Pain Points */}
                        {wizardStep === 'pain-points' && selectedPersona && (
                          <motion.div
                            key="pain-points"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full"
                          >
                            <PainPointStep
                              persona={selectedPersona}
                              onBack={() => setWizardStep('persona')}
                              onNext={handlePainPointsNext}
                              preselectedPainPointIds={ghostResult?.painPointIds}
                            />
                          </motion.div>
                        )}

                        {/* Step 3: Strategy Proposal */}
                        {wizardStep === 'strategy' && selectedPersona && (
                          <motion.div
                            key="strategy"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="h-full"
                          >
                            <StrategyStep
                              persona={selectedPersona}
                              painPoints={selectedPainPoints}
                              onBack={() => {
                                setWizardStep('pain-points');
                              }}
                              onSelect={handleStrategySelect}
                              preloadedStrategies={ghostResult?.strategies}
                              analysisSummary={ghostResult?.summary}
                            />
                          </motion.div>
                        )}

                        {/* Generating State */}
                        {wizardStep === 'generating' && (
                          <motion.div
                            key="generating"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full"
                          >
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                              className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 p-0.5 mb-6"
                            >
                              <div className="w-full h-full rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--vicy-bg)' }}>
                                {currentGenStep && <currentGenStep.icon className="w-8 h-8 text-violet-400" />}
                              </div>
                            </motion.div>
                            <h3 className="text-lg font-semibold text-white mb-2">
                              {currentGenStep?.messageDe || 'Generiere Pipeline...'}
                            </h3>
                            <p className="text-sm text-white/40 mb-8">
                              Dies dauert normalerweise 5-10 Sekunden
                            </p>
                            <div className="space-y-3 w-full max-w-md">
                              {GENERATION_STEPS.map((step, index) => {
                                const isActive = index === currentStepIndex;
                                const isComplete = index < currentStepIndex;
                                const StepIcon = step.icon;
                                return (
                                  <motion.div
                                    key={step.state}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                                      isActive ? 'bg-violet-500/10 border border-violet-500/30' : ''
                                    } ${isComplete ? 'opacity-50' : ''}`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                      isComplete ? 'bg-green-500/20' : isActive ? 'bg-violet-500/20' : 'bg-white/[0.04]'
                                    }`}>
                                      {isComplete ? (
                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                      ) : isActive ? (
                                        <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                                      ) : (
                                        <StepIcon className="w-4 h-4 text-white/30" />
                                      )}
                                    </div>
                                    <span className={`text-sm ${isActive ? 'text-white font-medium' : 'text-white/40'}`}>
                                      {step.messageDe}
                                    </span>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}

                        {/* Complete State */}
                        {wizardStep === 'complete' && (
                          <motion.div
                            key="complete"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center h-full"
                          >
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ type: 'spring', delay: 0.2 }}
                              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-6"
                            >
                              <CheckCircle className="w-10 h-10 text-green-400" />
                            </motion.div>
                            <h3 className="text-xl font-semibold text-white mb-2">Pipeline erstellt!</h3>
                            <p className="text-white/40">Weiterleitung zum Cockpit...</p>
                          </motion.div>
                        )}

                        {/* Error State */}
                        {wizardStep === 'error' && (
                          <motion.div
                            key="error"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-full"
                          >
                            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                            <h3 className="text-lg font-medium text-white mb-2">Fehler</h3>
                            <p className="text-sm text-white/50 mb-6 text-center max-w-md">
                              {generationError}
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => setWizardStep('strategy')}
                                className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
                              >
                                Zurück
                              </button>
                              <button
                                onClick={() => {
                                  setWizardStep('persona');
                                  setGenerationError(null);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Neu starten
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Bottom: Start from scratch */}
                    {['persona', 'pain-points', 'strategy'].includes(wizardStep) && (
                      <div className="px-8 py-4 border-t border-white/[0.04]">
                        <button
                          onClick={handleStartFromScratch}
                          className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.1] hover:border-white/[0.2] text-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                          <Plus size={16} />
                          Von Grund auf neu starten
                        </button>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  /* Templates Tab */
                  <motion.div
                    key="templates"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="h-full flex flex-col"
                  >
                    {/* Search & Filters */}
                    <div className="p-6 border-b border-white/[0.06]">
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="relative flex-1 min-w-[200px]">
                          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                          <input
                            type="text"
                            placeholder="Vorlagen durchsuchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-violet-500 transition-all"
                          />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          {CATEGORIES.map((category) => {
                            const Icon = category.icon;
                            return (
                              <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                                  selectedCategory === category.id
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-white/[0.03] text-white/40 hover:text-white/70'
                                }`}
                              >
                                <Icon size={14} />
                                {category.labelDe}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Templates Grid */}
                    <div className="flex-1 overflow-auto p-6">
                      {isLoadingTemplates && (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                          {[...Array(6)].map((_, i) => <TemplateCardSkeleton key={i} />)}
                        </div>
                      )}

                      {templatesError && !isLoadingTemplates && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <AlertCircle size={48} className="text-red-500/50 mb-4" />
                          <p className="text-white/40">{templatesError}</p>
                          <button
                            onClick={fetchTemplates}
                            className="mt-4 flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
                          >
                            <RefreshCw size={14} />
                            Erneut laden
                          </button>
                        </div>
                      )}

                      {!isLoadingTemplates && !templatesError && (
                        <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                          {filteredTemplates.map((template) => {
                            const Icon = getIcon(template.iconName);
                            const complexityInfo = COMPLEXITY_LABELS[template.complexity || 'beginner'];
                            return (
                              <motion.button
                                key={template.id}
                                whileHover={{ scale: 1.02, y: -2 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleSelectTemplate(template)}
                                className="group relative bg-white/[0.02] border border-white/[0.06] rounded-xl p-5 text-left hover:bg-white/[0.04] hover:border-white/[0.1] transition-all overflow-hidden"
                              >
                                <div
                                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{
                                    background: `radial-gradient(circle at 50% 0%, ${template.colorAccent}15 0%, transparent 60%)`,
                                  }}
                                />
                                {template.roiBadge && (
                                  <div className="absolute top-3 right-3">
                                    <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                      {template.roiBadge}
                                    </span>
                                  </div>
                                )}
                                <div className="relative">
                                  <div className="mb-4 rounded-lg bg-white/[0.02] p-2 border border-white/[0.04]">
                                    <MiniGraphPreview nodes={template.nodes} edges={template.edges} width={200} height={100} />
                                  </div>
                                  <div className="flex items-start gap-3 mb-3">
                                    <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${template.colorAccent}20` }}>
                                      <Icon size={18} style={{ color: template.colorAccent }} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <h3 className="font-semibold text-white group-hover:text-violet-200 transition-colors truncate">
                                        {template.name}
                                      </h3>
                                      <p className="text-xs text-white/40">
                                        {CATEGORIES.find((c) => c.id === template.templateCategory)?.labelDe || 'Sonstige'}
                                        {' · '}
                                        <span style={{ color: complexityInfo.color }}>{complexityInfo.label}</span>
                                      </p>
                                    </div>
                                  </div>
                                  <p className="text-sm text-white/40 line-clamp-2 mb-4">
                                    {template.businessBenefit || template.description}
                                  </p>
                                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.04]">
                                    <div className="flex items-center gap-3 text-xs text-white/30">
                                      {template.estimatedSetupMinutes && (
                                        <span className="flex items-center gap-1">
                                          <Clock size={12} />
                                          {template.estimatedSetupMinutes} Min.
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {template.rating > 0 && (
                                        <span className="flex items-center gap-0.5 text-yellow-400 text-xs">
                                          <Star size={12} fill="currentColor" />
                                          {template.rating.toFixed(1)}
                                        </span>
                                      )}
                                      {template.downloadCount > 0 && (
                                        <span className="flex items-center gap-0.5 text-white/30 text-xs">
                                          <Download size={12} />
                                          {template.downloadCount > 1000 ? `${(template.downloadCount / 1000).toFixed(1)}k` : template.downloadCount}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                  <ChevronRight className="w-5 h-5 text-violet-400" />
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      )}

                      {!isLoadingTemplates && !templatesError && filteredTemplates.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <Search size={48} className="text-white/20 mb-4" />
                          <p className="text-white/40">Keine Vorlagen gefunden</p>
                          <p className="text-sm text-white/30 mt-1">Versuchen Sie eine andere Suche oder Kategorie</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom: Start from scratch */}
                    <div className="px-6 py-4 border-t border-white/[0.04]">
                      <button
                        onClick={handleStartFromScratch}
                        className="w-full py-2.5 rounded-xl border border-dashed border-white/[0.1] hover:border-white/[0.2] text-white/30 hover:text-white/60 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus size={16} />
                        Von Grund auf neu starten
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PipelineWizard;
