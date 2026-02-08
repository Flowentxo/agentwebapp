'use client';

/**
 * PipelineWizard Component
 *
 * Enterprise-grade wizard for creating new pipelines with:
 * - AI-powered generation from natural language (German & English)
 * - Database-backed template gallery with real data
 * - Skeleton loading states
 * - Business-centric design with ROI badges
 *
 * Part of Phase 7: AI Workflow Wizard - Enterprise Templates
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

import { getValidToken } from '@/lib/auth/get-token';
import type {
  PipelineTemplateListItem,
  TemplatesApiResponse,
  TemplateCategory,
  TemplateComplexity,
} from '@/lib/types/pipeline-templates';

// ============================================================================
// Types & Constants
// ============================================================================

interface PipelineWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

type GenerationState =
  | 'idle'
  | 'analyzing'
  | 'designing'
  | 'building'
  | 'connecting'
  | 'finalizing'
  | 'complete'
  | 'error';

const GENERATION_STEPS: { state: GenerationState; message: string; messageDe: string; icon: React.ElementType }[] = [
  { state: 'analyzing', message: 'Analyzing requirements...', messageDe: 'Analysiere Anforderungen...', icon: Brain },
  { state: 'designing', message: 'Designing architecture...', messageDe: 'Entwerfe Architektur...', icon: GitBranch },
  { state: 'building', message: 'Building nodes...', messageDe: 'Erstelle Nodes...', icon: Zap },
  { state: 'connecting', message: 'Connecting data flows...', messageDe: 'Verbinde Datenflüsse...', icon: ArrowRight },
  { state: 'finalizing', message: 'Finalizing pipeline...', messageDe: 'Finalisiere Pipeline...', icon: CheckCircle },
];

// Category definitions with German labels
const CATEGORIES: { id: TemplateCategory | 'all'; label: string; labelDe: string; icon: React.ElementType }[] = [
  { id: 'all', label: 'All', labelDe: 'Alle', icon: Sparkles },
  { id: 'sales', label: 'Sales', labelDe: 'Verkauf', icon: Target },
  { id: 'automation', label: 'Automation', labelDe: 'Automatisierung', icon: Zap },
  { id: 'customer-support', label: 'Support', labelDe: 'Kundenservice', icon: MessageSquare },
  { id: 'marketing', label: 'Marketing', labelDe: 'Marketing', icon: TrendingUp },
  { id: 'data-analysis', label: 'Data', labelDe: 'Daten', icon: BarChart },
];

// Icon mapping
const ICON_MAP: Record<string, React.ElementType> = {
  Zap, Bot, Target, TrendingUp, Users, Clock, BarChart, FileText, Sparkles,
  Brain, GitBranch, MessageSquare, Database, Share2, Layers,
};

// Example prompts (German)
const EXAMPLE_PROMPTS = [
  'Wenn ein neuer Lead eingeht, analysiere die Firma, bewerte sie und leite Hot-Leads an Slack weiter',
  'Jeden Morgen um 8 Uhr meinen Kalender zusammenfassen und mir ein E-Mail-Briefing senden',
  'Bei einem Support-Ticket automatisch eine Antwort entwerfen und auf meine Freigabe warten',
  'Eingehende E-Mails auf Dringlichkeit prüfen und mich bei wichtigen sofort per Slack benachrichtigen',
];

// Complexity labels (German)
const COMPLEXITY_LABELS: Record<TemplateComplexity, { label: string; color: string }> = {
  beginner: { label: 'Einsteiger', color: '#10B981' },
  intermediate: { label: 'Fortgeschritten', color: '#F59E0B' },
  advanced: { label: 'Experte', color: '#EF4444' },
};

// ============================================================================
// Skeleton Components
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

export function PipelineWizard({ isOpen, onClose }: PipelineWizardProps) {
  const router = useRouter();

  // Template data state
  const [templates, setTemplates] = useState<PipelineTemplateListItem[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  // UI state
  const [prompt, setPrompt] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [generationState, setGenerationState] = useState<GenerationState>('idle');
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // ============================================================================
  // Data Fetching
  // ============================================================================

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    setTemplatesError(null);

    try {
      const response = await fetch('/api/pipelines/templates');
      const data: TemplatesApiResponse = await response.json();

      if (!data.success) {
        throw new Error('Failed to load templates');
      }

      setTemplates(data.data.templates);
    } catch (error: any) {
      console.error('[PipelineWizard] Failed to fetch templates:', error);
      setTemplatesError('Vorlagen konnten nicht geladen werden');
    } finally {
      setIsLoadingTemplates(false);
    }
  }, []);

  // Fetch templates when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      // Reset UI state
      setPrompt('');
      setSelectedCategory('all');
      setSearchQuery('');
      setGenerationState('idle');
      setGenerationError(null);
      setCurrentStepIndex(0);
    }
  }, [isOpen, fetchTemplates]);

  // ============================================================================
  // Template Filtering
  // ============================================================================

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesCategory =
        selectedCategory === 'all' || template.templateCategory === selectedCategory;
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
      const steps = GENERATION_STEPS;
      let stepIndex = 0;

      const interval = setInterval(() => {
        stepIndex++;
        if (stepIndex < steps.length) {
          setCurrentStepIndex(stepIndex);
          setGenerationState(steps[stepIndex].state);
        }
      }, 1200);

      return () => clearInterval(interval);
    }
  }, [generationState]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleGenerate = async () => {
    if (!prompt.trim() || prompt.length < 10) {
      setGenerationError('Bitte beschreiben Sie Ihren Workflow detaillierter (mindestens 10 Zeichen)');
      return;
    }

    setGenerationState('analyzing');
    setGenerationError(null);
    setCurrentStepIndex(0);

    try {
      // Get JWT token and extract user ID
      const token = getValidToken();
      let userId = 'demo-user';

      if (token) {
        try {
          // Decode JWT payload (base64 decode the middle part)
          const payload = JSON.parse(atob(token.split('.')[1]));
          userId = payload.userId || payload.sub || payload.id || 'demo-user';
          console.log('[PipelineWizard] Using authenticated userId:', userId);
        } catch (e) {
          console.warn('[PipelineWizard] Failed to decode token, using demo-user');
        }
      }

      const response = await fetch('/api/pipelines/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId,
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Pipeline konnte nicht generiert werden');
      }

      setGenerationState('complete');

      // Use async IIFE inside setTimeout to save pipeline to database
      setTimeout(async () => {
        try {
          // STEP 1: Save the generated pipeline to database
          const saveResponse = await fetch('/api/pipelines', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId,
            },
            body: JSON.stringify({
              name: data.pipeline.name || 'AI Generated Pipeline',
              description: data.pipeline.description || '',
              nodes: data.pipeline.nodes || [],
              edges: data.pipeline.edges || [],
              status: 'draft',
            }),
          });

          const saveData = await saveResponse.json();

          // Validate response - API returns { success, pipeline: { id, ... } }
          if (!saveResponse.ok || !saveData.success || !saveData.pipeline?.id) {
            console.error('[PipelineWizard] Invalid API response:', saveData);
            throw new Error(saveData.error || 'Pipeline ID missing from response');
          }

          const savedPipelineId = saveData.pipeline.id;
          const pipelineName = data.pipeline.name || 'AI Generated Pipeline';
          console.log('[PipelineWizard] Pipeline saved to database:', savedPipelineId);

          // STEP 2: Load into editor store WITH the database ID
          const { loadPipeline } = usePipelineStore.getState();
          loadPipeline(
            savedPipelineId,
            data.pipeline.nodes || [],
            data.pipeline.edges || [],
            pipelineName
          );

          // STEP 3: Notify sidebar to refetch from database
          window.dispatchEvent(new Event('pipeline-created'));
          console.log('[PipelineWizard] Dispatched pipeline-created event for sidebar refresh');

          onClose();
          // STEP 4: Navigate to studio with the saved pipeline ID
          router.push(`/studio?id=${savedPipelineId}`);
        } catch (error: any) {
          console.error('[PipelineWizard] Failed to save pipeline:', error);
          setGenerationState('error');
          setGenerationError('Pipeline wurde generiert, konnte aber nicht gespeichert werden.');
        }
      }, 1500);
    } catch (error: any) {
      console.error('Generation error:', error);
      setGenerationState('error');
      setGenerationError(error.message || 'Pipeline konnte nicht generiert werden. Bitte versuchen Sie es erneut.');
    }
  };

  const handleSelectTemplate = async (template: PipelineTemplateListItem) => {
    try {
      // Clone the template
      const response = await fetch('/api/pipelines/templates/clone', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': 'demo-user',
        },
        body: JSON.stringify({ templateId: template.id }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Template konnte nicht kopiert werden');
      }

      onClose();
      router.push(`/studio?id=${data.data.workflowId}`);
    } catch (error: any) {
      console.error('Clone error:', error);
      // Fallback: Navigate to studio with template param
      onClose();
      router.push(`/studio?template=${template.id}`);
    }
  };

  const handleStartFromScratch = () => {
    onClose();
    router.push('/studio');
  };

  const getIcon = (iconName: string | null) => {
    return ICON_MAP[iconName || 'Zap'] || Zap;
  };

  const currentStep = GENERATION_STEPS[currentStepIndex];

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
            className="fixed inset-4 md:inset-8 lg:inset-12 bg-card rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden border border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-border bg-gradient-to-r from-gray-900 to-gray-800">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600">
                    <Wand2 className="w-6 h-6 text-white" />
                  </div>
                  Neue Pipeline erstellen
                </h1>
                <p className="text-muted-foreground mt-1">
                  Beschreiben Sie Ihre Automatisierung oder wählen Sie eine Vorlage
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-muted rounded-xl text-muted-foreground hover:text-white transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden flex">
              {/* Left Panel - AI Generator */}
              <div className="w-[480px] border-r border-border flex flex-col bg-card/50">
                <div className="p-8 flex-1 overflow-auto">
                  {/* AI Section Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-500/30">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">KI Pipeline-Generator</h2>
                      <p className="text-sm text-muted-foreground">Beschreiben Sie Ihren Workflow</p>
                    </div>
                  </div>

                  {/* Generation States */}
                  <AnimatePresence mode="wait">
                    {generationState === 'idle' || generationState === 'error' ? (
                      <motion.div
                        key="input"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                      >
                        {/* Input Area */}
                        <div className="relative">
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="z.B. Wenn ein neuer Lead über das Webformular eingeht, analysiere die Firmendaten mit KI, bewerte den Lead und sende bei hohem Score eine Slack-Nachricht an das Vertriebsteam..."
                            className="w-full h-40 p-4 bg-muted/50 border border-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 resize-none transition-all"
                          />
                          <div className="absolute bottom-3 right-3 text-xs text-muted-foreground">
                            {prompt.length} / 500
                          </div>
                        </div>

                        {/* Error Message */}
                        {generationError && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-start gap-3"
                          >
                            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm text-red-400">{generationError}</p>
                              <button
                                onClick={() => setGenerationError(null)}
                                className="text-xs text-red-300 hover:text-red-200 mt-1 flex items-center gap-1"
                              >
                                <RefreshCw size={12} />
                                Erneut versuchen
                              </button>
                            </div>
                          </motion.div>
                        )}

                        {/* Generate Button */}
                        <button
                          onClick={handleGenerate}
                          disabled={!prompt.trim() || prompt.length < 10}
                          className="w-full mt-4 py-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-violet-500/25"
                        >
                          <Wand2 size={20} />
                          Pipeline zaubern
                          <Sparkles size={16} className="opacity-70" />
                        </button>

                        {/* Example Prompts */}
                        <div className="mt-6">
                          <p className="text-sm text-muted-foreground mb-3">Beispiele zum Ausprobieren:</p>
                          <div className="space-y-2">
                            {EXAMPLE_PROMPTS.map((example, index) => (
                              <button
                                key={index}
                                onClick={() => setPrompt(example)}
                                className="w-full text-left p-3 rounded-lg bg-muted/30 hover:bg-muted/60 border border-border/50 text-sm text-muted-foreground hover:text-gray-300 transition-all"
                              >
                                "{example.slice(0, 70)}..."
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ) : generationState === 'complete' ? (
                      <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-16"
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
                        <p className="text-muted-foreground text-center">Weiterleitung zum Editor...</p>
                      </motion.div>
                    ) : (
                      /* Generating Animation */
                      <motion.div
                        key="generating"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="py-12"
                      >
                        <div className="flex flex-col items-center mb-8">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                            className="w-16 h-16 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 p-0.5 mb-6"
                          >
                            <div className="w-full h-full rounded-full bg-card flex items-center justify-center">
                              {currentStep && <currentStep.icon className="w-8 h-8 text-violet-400" />}
                            </div>
                          </motion.div>
                          <h3 className="text-lg font-semibold text-white mb-2">
                            {currentStep?.messageDe || 'Generiere...'}
                          </h3>
                          <p className="text-sm text-muted-foreground">Dies dauert normalerweise 5-10 Sekunden</p>
                        </div>

                        <div className="space-y-3">
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
                                className={`
                                  flex items-center gap-3 p-3 rounded-lg transition-all
                                  ${isActive ? 'bg-violet-500/10 border border-violet-500/30' : ''}
                                  ${isComplete ? 'opacity-50' : ''}
                                `}
                              >
                                <div
                                  className={`
                                    w-8 h-8 rounded-lg flex items-center justify-center
                                    ${isComplete ? 'bg-green-500/20' : isActive ? 'bg-violet-500/20' : 'bg-muted'}
                                  `}
                                >
                                  {isComplete ? (
                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                  ) : isActive ? (
                                    <Loader2 className="w-4 h-4 text-violet-400 animate-spin" />
                                  ) : (
                                    <StepIcon className="w-4 h-4 text-muted-foreground" />
                                  )}
                                </div>
                                <span
                                  className={`
                                    text-sm font-medium
                                    ${isActive ? 'text-white' : isComplete ? 'text-muted-foreground' : 'text-muted-foreground'}
                                  `}
                                >
                                  {step.messageDe}
                                </span>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Start from Scratch */}
                <div className="p-6 border-t border-border">
                  <button
                    onClick={handleStartFromScratch}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-border hover:border-gray-600 text-muted-foreground hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Von Grund auf neu starten
                  </button>
                </div>
              </div>

              {/* Right Panel - Templates */}
              <div className="flex-1 flex flex-col bg-background">
                {/* Search & Filters */}
                <div className="p-6 border-b border-border">
                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search
                        size={18}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                      />
                      <input
                        type="text"
                        placeholder="Vorlagen durchsuchen..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-muted border border-border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 transition-all"
                      />
                    </div>

                    {/* Category Pills */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {CATEGORIES.map((category) => {
                        const Icon = category.icon;
                        const isActive = selectedCategory === category.id;

                        return (
                          <button
                            key={category.id}
                            onClick={() => setSelectedCategory(category.id)}
                            className={`
                              flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all
                              ${isActive
                                ? 'bg-violet-600 text-white'
                                : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-white'
                              }
                            `}
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
                  {/* Loading State */}
                  {isLoadingTemplates && (
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, i) => (
                        <TemplateCardSkeleton key={i} />
                      ))}
                    </div>
                  )}

                  {/* Error State */}
                  {templatesError && !isLoadingTemplates && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <AlertCircle size={48} className="text-red-500/50 mb-4" />
                      <p className="text-muted-foreground">{templatesError}</p>
                      <button
                        onClick={fetchTemplates}
                        className="mt-4 flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300"
                      >
                        <RefreshCw size={14} />
                        Erneut laden
                      </button>
                    </div>
                  )}

                  {/* Templates */}
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
                            className="group relative bg-card border border-border rounded-xl p-5 text-left hover:border-border hover:bg-muted/50 transition-all overflow-hidden"
                          >
                            {/* Glow effect */}
                            <div
                              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              style={{
                                background: `radial-gradient(circle at 50% 0%, ${template.colorAccent}15 0%, transparent 60%)`,
                              }}
                            />

                            {/* ROI Badge */}
                            {template.roiBadge && (
                              <div className="absolute top-3 right-3">
                                <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-green-500/20 text-green-400 border border-green-500/30">
                                  {template.roiBadge}
                                </span>
                              </div>
                            )}

                            {/* Featured Badge */}
                            {template.isFeatured && !template.roiBadge && (
                              <div className="absolute top-3 right-3">
                                <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-orange-500/20 text-orange-400 border border-orange-500/30">
                                  Beliebt
                                </span>
                              </div>
                            )}

                            <div className="relative">
                              {/* Mini Graph Preview */}
                              <div className="mb-4 rounded-lg bg-muted/50 p-2 border border-border/50">
                                <MiniGraphPreview
                                  nodes={template.nodes}
                                  edges={template.edges}
                                  width={200}
                                  height={100}
                                />
                              </div>

                              {/* Header */}
                              <div className="flex items-start gap-3 mb-3">
                                <div
                                  className="p-2 rounded-lg flex-shrink-0"
                                  style={{ backgroundColor: `${template.colorAccent}20` }}
                                >
                                  <Icon size={18} style={{ color: template.colorAccent }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-white group-hover:text-violet-200 transition-colors truncate">
                                    {template.name}
                                  </h3>
                                  <p className="text-xs text-muted-foreground">
                                    {CATEGORIES.find(c => c.id === template.templateCategory)?.labelDe || 'Sonstige'}
                                    {' • '}
                                    <span style={{ color: complexityInfo.color }}>{complexityInfo.label}</span>
                                  </p>
                                </div>
                              </div>

                              {/* Business Benefit */}
                              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                {template.businessBenefit || template.description}
                              </p>

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  {template.estimatedSetupMinutes && (
                                    <span className="flex items-center gap-1">
                                      <Clock size={12} />
                                      {template.estimatedSetupMinutes} Min. Setup
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
                                    <span className="flex items-center gap-0.5 text-muted-foreground text-xs">
                                      <Download size={12} />
                                      {template.downloadCount > 1000
                                        ? `${(template.downloadCount / 1000).toFixed(1)}k`
                                        : template.downloadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Hover Arrow */}
                            <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                              <ChevronRight className="w-5 h-5 text-violet-400" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  )}

                  {/* No Results */}
                  {!isLoadingTemplates && !templatesError && filteredTemplates.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16">
                      <Search size={48} className="text-foreground mb-4" />
                      <p className="text-muted-foreground">Keine Vorlagen gefunden</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Versuchen Sie eine andere Suche oder Kategorie
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export default PipelineWizard;
