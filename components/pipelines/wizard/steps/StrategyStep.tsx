'use client';

/**
 * StrategyStep - Step 3 of Discovery Engine
 *
 * Calls the strategy generation API and displays 1-3 Strategy Proposal cards.
 * Selecting a strategy triggers full pipeline generation.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Zap,
  GitBranch,
  Shield,
  Clock,
  ArrowRight,
} from 'lucide-react';
import type { BusinessPersona } from '@/lib/pipelines/business-personas';
import type { PainPoint } from '@/lib/pipelines/pain-points';

// Strategy returned from API
export interface Strategy {
  name: string;
  description: string;
  nodeCount: number;
  complexity: 'simple' | 'medium' | 'advanced';
  integrations: string[];
  estimatedSetupMinutes: number;
}

interface StrategyStepProps {
  persona: BusinessPersona;
  painPoints: PainPoint[];
  onBack: () => void;
  onSelect: (strategy: Strategy, enhancedPrompt: string) => void;
  preloadedStrategies?: Strategy[];
  analysisSummary?: string;
}

const COMPLEXITY_CONFIG = {
  simple: { label: 'Einfach', color: 'text-green-400', bg: 'bg-green-400/10' },
  medium: { label: 'Mittel', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  advanced: { label: 'Fortgeschritten', color: 'text-violet-400', bg: 'bg-violet-400/10' },
};

const LOADING_STEPS = [
  'Analysiere Branche...',
  'Bewerte Herausforderungen...',
  'Entwickle Lösungsstrategien...',
  'Optimiere Workflows...',
  'Finalisiere Vorschläge...',
];

export function StrategyStep({ persona, painPoints, onBack, onSelect, preloadedStrategies, analysisSummary }: StrategyStepProps) {
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingStep, setLoadingStep] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const fetchStrategies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingStep(0);

    // Progress animation
    const interval = setInterval(() => {
      setLoadingStep((prev) => (prev < LOADING_STEPS.length - 1 ? prev + 1 : prev));
    }, 1200);

    try {
      const res = await fetch('/api/pipelines/generate-strategy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          persona,
          painPoints,
          language: 'de',
        }),
      });

      if (!res.ok) {
        throw new Error('Strategien konnten nicht generiert werden');
      }

      const data = await res.json();
      setStrategies(data.strategies || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      clearInterval(interval);
      setIsLoading(false);
    }
  }, [persona, painPoints]);

  useEffect(() => {
    if (preloadedStrategies && preloadedStrategies.length > 0) {
      setStrategies(preloadedStrategies);
      setIsLoading(false);
      return;
    }
    fetchStrategies();
  }, [fetchStrategies, preloadedStrategies]);

  const handleSelect = (strategy: Strategy, index: number) => {
    setSelectedIndex(index);

    // Build enhanced prompt from persona + pain points + strategy
    const enhancedPrompt = [
      `Erstelle ein Automatisierungs-Workflow für die Branche: ${persona.titleDE}.`,
      ``,
      `Herausforderungen die gelöst werden sollen:`,
      ...painPoints.map((pp) => `- ${pp.titleDE}: ${pp.descriptionDE}`),
      ``,
      `Gewählte Strategie: ${strategy.name}`,
      `${strategy.description}`,
      ``,
      `Benötigte Integrationen: ${strategy.integrations.join(', ')}`,
      `Geschätzte Komplexität: ${strategy.complexity}`,
    ].join('\n');

    // Brief animation delay
    setTimeout(() => onSelect(strategy, enhancedPrompt), 400);
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          {/* Animated icon */}
          <div className="relative w-16 h-16 mx-auto mb-6">
            <div className="absolute inset-0 rounded-2xl bg-violet-500/10 animate-pulse" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-violet-400 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          <h3 className="text-lg font-medium text-white mb-2">
            Ihr Berater entwickelt Lösungsvorschläge...
          </h3>

          {/* Step progress */}
          <div className="space-y-2 mt-6">
            {LOADING_STEPS.map((step, i) => (
              <motion.div
                key={step}
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: i <= loadingStep ? 1 : 0.3,
                  x: 0,
                }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-sm"
              >
                {i < loadingStep ? (
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                ) : i === loadingStep ? (
                  <Loader2 className="w-4 h-4 text-violet-400 animate-spin flex-shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-white/10 flex-shrink-0" />
                )}
                <span className={i <= loadingStep ? 'text-white/70' : 'text-white/30'}>
                  {step}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">Fehler</h3>
        <p className="text-sm text-white/50 mb-6 text-center max-w-md">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            Zurück
          </button>
          <button
            onClick={fetchStrategies}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Strategy Cards
  return (
    <div className="flex flex-col h-full">
      {/* Analysis Summary Banner (Smart-Entry) */}
      {analysisSummary && (
        <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-xl bg-violet-500/[0.08] border border-violet-500/20 max-w-[600px] mx-auto w-full">
          <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-white/70">
            <span className="text-violet-300 font-medium">Ich habe verstanden:</span>{' '}
            {analysisSummary}. Hier ist mein Plan:
          </p>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-3"
          style={{ backgroundColor: `${persona.color}15`, color: persona.color }}
        >
          {persona.titleDE} &middot; {painPoints.length > 0 ? `${painPoints.length} Herausforderungen` : 'Analyse'}
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Ihre maßgeschneiderten Lösungen
        </h2>
        <p className="text-sm text-white/50">
          Wählen Sie eine Strategie, um die Pipeline automatisch zu generieren.
        </p>
      </div>

      {/* Strategy Cards */}
      <div className="flex-1 overflow-y-auto space-y-4 max-w-[600px] mx-auto w-full">
        <AnimatePresence>
          {strategies.map((strategy, index) => {
            const complexity = COMPLEXITY_CONFIG[strategy.complexity];
            const isSelected = selectedIndex === index;

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                className={`
                  relative p-5 rounded-xl border transition-all duration-300 cursor-pointer
                  ${
                    isSelected
                      ? 'bg-violet-500/[0.1] border-violet-500/50 shadow-[0_0_40px_rgba(139,92,246,0.15)]'
                      : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                  }
                `}
                onClick={() => handleSelect(strategy, index)}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-medium text-white mb-1">
                      {strategy.name}
                    </h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      {strategy.description}
                    </p>
                  </div>
                  {index === 0 && (
                    <span className="flex-shrink-0 ml-3 px-2 py-0.5 bg-violet-500/20 text-violet-300 text-[10px] font-medium rounded-full">
                      Empfohlen
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    {strategy.nodeCount} Schritte
                  </span>
                  <span className={`flex items-center gap-1 ${complexity.color}`}>
                    <Shield className="w-3 h-3" />
                    {complexity.label}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{strategy.estimatedSetupMinutes} Min.
                  </span>
                </div>

                {/* Integrations */}
                {strategy.integrations.length > 0 && (
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                    <Zap className="w-3 h-3 text-white/30" />
                    <div className="flex flex-wrap gap-1.5">
                      {strategy.integrations.map((integration) => (
                        <span
                          key={integration}
                          className="px-2 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-[10px] text-white/50"
                        >
                          {integration}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selection indicator */}
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4 w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center"
                  >
                    <CheckCircle className="w-4 h-4 text-white" />
                  </motion.div>
                )}

                {/* Select button */}
                <div className="mt-4 flex justify-end">
                  <span className="flex items-center gap-1.5 text-xs text-violet-400 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Auswählen
                    <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/[0.06]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-sm text-white/50 hover:text-white/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück
        </button>

        <button
          onClick={fetchStrategies}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-white/40 hover:text-white/60 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Neu generieren
        </button>
      </div>
    </div>
  );
}
