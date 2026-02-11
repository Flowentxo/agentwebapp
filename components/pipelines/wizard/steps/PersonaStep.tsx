'use client';

/**
 * PersonaStep - Step 1 of Discovery Engine
 *
 * 6 business persona cards in a 2x3 grid.
 * Selecting a persona seeds the AI context for subsequent steps.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Wrench,
  Home,
  GraduationCap,
  ShoppingCart,
  Megaphone,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { BUSINESS_PERSONAS, type BusinessPersona } from '@/lib/pipelines/business-personas';

// Icon mapping from string names to components
const ICON_MAP: Record<string, LucideIcon> = {
  Wrench,
  Home,
  GraduationCap,
  ShoppingCart,
  Megaphone,
  Sparkles,
};

interface PersonaStepProps {
  onSelect: (persona: BusinessPersona) => void;
  preselectedPersonaId?: string;
}

export function PersonaStep({ onSelect, preselectedPersonaId }: PersonaStepProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(preselectedPersonaId || null);

  const handleSelect = (persona: BusinessPersona) => {
    setSelectedId(persona.id);
    // Brief delay for selection animation
    setTimeout(() => onSelect(persona), 300);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-white mb-2">
          In welcher Branche sind Sie tätig?
        </h2>
        <p className="text-sm text-white/50">
          Wählen Sie Ihre Branche, damit wir die passende Lösung finden.
        </p>
      </div>

      {/* KI-Empfehlung Banner */}
      {preselectedPersonaId && (
        <div className="flex items-center gap-2 px-3 py-2 mb-4 rounded-lg bg-violet-500/[0.08] border border-violet-500/20 max-w-[600px] mx-auto w-full">
          <Sparkles className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span className="text-xs text-violet-300">KI-Empfehlung basierend auf deiner Eingabe</span>
        </div>
      )}

      {/* Persona Grid */}
      <div className="grid grid-cols-2 gap-4 max-w-[600px] mx-auto w-full">
        {BUSINESS_PERSONAS.map((persona, index) => {
          const Icon = ICON_MAP[persona.icon] || Sparkles;
          const isHovered = hoveredId === persona.id;
          const isSelected = selectedId === persona.id;

          return (
            <motion.button
              key={persona.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              onClick={() => handleSelect(persona)}
              onMouseEnter={() => setHoveredId(persona.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`
                relative group text-left p-5 rounded-xl
                border transition-all duration-300 cursor-pointer
                ${
                  isSelected
                    ? 'bg-white/[0.06] border-violet-500/60 shadow-[0_0_30px_rgba(139,92,246,0.15)]'
                    : isHovered
                    ? 'bg-white/[0.04] border-white/[0.12] shadow-[0_0_20px_rgba(139,92,246,0.08)]'
                    : 'bg-white/[0.02] border-white/[0.06]'
                }
              `}
            >
              {/* Icon */}
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 transition-transform duration-300"
                style={{
                  backgroundColor: `${persona.color}15`,
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                <Icon
                  className="w-5 h-5 transition-colors duration-300"
                  style={{ color: persona.color }}
                />
              </div>

              {/* Title */}
              <h3 className="text-sm font-medium text-white mb-1">
                {persona.titleDE}
              </h3>

              {/* Description */}
              <p className="text-xs text-white/40 leading-relaxed line-clamp-2">
                {persona.descriptionDE}
              </p>

              {/* Arrow indicator */}
              <div
                className={`
                  absolute right-4 top-1/2 -translate-y-1/2 transition-all duration-300
                  ${isHovered || isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}
                `}
              >
                <ArrowRight className="w-4 h-4 text-white/40" />
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-500 flex items-center justify-center"
                >
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
