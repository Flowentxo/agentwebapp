'use client';

/**
 * PainPointStep - Step 2 of Discovery Engine
 *
 * Shows pain points filtered by the selected persona.
 * Multi-select (min 1, max 5) with severity badges.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  AlertCircle,
  Info,
  Check,
  Sparkles,
} from 'lucide-react';
import { getPainPointsForPersona, type PainPoint } from '@/lib/pipelines/pain-points';
import type { BusinessPersona } from '@/lib/pipelines/business-personas';

interface PainPointStepProps {
  persona: BusinessPersona;
  onBack: () => void;
  onNext: (painPoints: PainPoint[]) => void;
  preselectedPainPointIds?: string[];
}

const SEVERITY_CONFIG = {
  high: {
    icon: AlertTriangle,
    label: 'Hoch',
    color: 'text-red-400',
    bg: 'bg-red-400/10',
    border: 'border-red-400/20',
  },
  medium: {
    icon: AlertCircle,
    label: 'Mittel',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
  low: {
    icon: Info,
    label: 'Niedrig',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
};

export function PainPointStep({ persona, onBack, onNext, preselectedPainPointIds }: PainPointStepProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(preselectedPainPointIds || [])
  );
  const painPoints = getPainPointsForPersona(persona.id);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 5) {
        next.add(id);
      }
      return next;
    });
  };

  const handleNext = () => {
    const selected = painPoints.filter((pp) => selectedIds.has(pp.id));
    onNext(selected);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-6">
        <div
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs mb-3"
          style={{
            backgroundColor: `${persona.color}15`,
            color: persona.color,
          }}
        >
          {persona.titleDE}
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Welche Herausforderungen möchten Sie lösen?
        </h2>
        <p className="text-sm text-white/50">
          Wählen Sie 1-5 Herausforderungen aus. Je mehr Sie auswählen, desto umfangreicher wird die Lösung.
        </p>
      </div>

      {/* KI-Empfehlung Banner */}
      {preselectedPainPointIds && preselectedPainPointIds.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-violet-500/[0.08] border border-violet-500/20 max-w-[600px] mx-auto w-full">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span className="text-xs text-violet-300">
            KI hat {preselectedPainPointIds.length} Herausforderungen erkannt
          </span>
        </div>
      )}

      {/* Pain Point Cards */}
      <div className="flex-1 overflow-y-auto space-y-3 max-w-[600px] mx-auto w-full pr-1">
        {painPoints.map((pp, index) => {
          const isSelected = selectedIds.has(pp.id);
          const severity = SEVERITY_CONFIG[pp.severity];
          const SeverityIcon = severity.icon;

          return (
            <motion.button
              key={pp.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => toggleSelection(pp.id)}
              className={`
                w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer
                ${
                  isSelected
                    ? 'bg-violet-500/[0.08] border-violet-500/40'
                    : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.1]'
                }
              `}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox */}
                <div
                  className={`
                    mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0
                    transition-all duration-200
                    ${
                      isSelected
                        ? 'bg-violet-500 border-violet-500'
                        : 'border-white/20 bg-transparent'
                    }
                  `}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-medium text-white">
                      {pp.titleDE}
                    </h3>
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${severity.bg} ${severity.color} ${severity.border} border`}
                    >
                      <SeverityIcon className="w-2.5 h-2.5" />
                      {severity.label}
                    </span>
                  </div>
                  <p className="text-xs text-white/40 leading-relaxed">
                    {pp.descriptionDE}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
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

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/30">
            {selectedIds.size}/5 ausgewählt
          </span>
          <button
            onClick={handleNext}
            disabled={selectedIds.size === 0}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
              ${
                selectedIds.size > 0
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.2)]'
                  : 'bg-white/[0.04] text-white/30 cursor-not-allowed'
              }
            `}
          >
            Weiter
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
