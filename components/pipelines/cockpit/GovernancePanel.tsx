'use client';

/**
 * GovernancePanel Component - 3-Mode Approval Governance
 *
 * Replaces AutopilotToggle with a segmented control offering three modes:
 * - Manual: All approvals require human decision
 * - KI-Assistiert: Auto-approve >= 80%, auto-reject <= 20%
 * - Voller Autopilot: Auto-approve >= 60%, auto-reject <= 40%
 *
 * Maps to existing AutopilotConfig interface (no API changes needed).
 *
 * Part of Phase III: Operational Cockpit
 */

import { useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Shield, Brain, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AutopilotConfig } from './AutopilotToggle';

// ============================================
// TYPES
// ============================================

type GovernanceMode = 'manual' | 'ai-assisted' | 'full-autopilot';

interface GovernancePanelProps {
  config: AutopilotConfig;
  onChange: (config: AutopilotConfig) => void;
  isDisabled?: boolean;
}

// ============================================
// MODE DEFINITIONS
// ============================================

interface ModeDefinition {
  id: GovernanceMode;
  label: string;
  icon: typeof Shield;
  description: string;
  config: AutopilotConfig;
}

const MODES: ModeDefinition[] = [
  {
    id: 'manual',
    label: 'Manuell',
    icon: Shield,
    description: 'Alle Freigaben erfordern menschliche Entscheidung',
    config: {
      enabled: false,
      scoreThreshold: 50,
      autoApproveAbove: 100, // Never auto-approve
      autoRejectBelow: 0,    // Never auto-reject
    },
  },
  {
    id: 'ai-assisted',
    label: 'KI-Assistiert',
    icon: Brain,
    description: 'Automatisch bei hoher Konfidenz (≥80%), ablehnen bei ≤20%',
    config: {
      enabled: true,
      scoreThreshold: 50,
      autoApproveAbove: 80,
      autoRejectBelow: 20,
    },
  },
  {
    id: 'full-autopilot',
    label: 'Autopilot',
    icon: Zap,
    description: 'Automatisch bei ≥60% Konfidenz, ablehnen bei ≤40%',
    config: {
      enabled: true,
      scoreThreshold: 50,
      autoApproveAbove: 60,
      autoRejectBelow: 40,
    },
  },
];

// ============================================
// HELPERS
// ============================================

function configToMode(config: AutopilotConfig): GovernanceMode {
  if (!config.enabled) return 'manual';
  if (config.autoApproveAbove >= 75) return 'ai-assisted';
  return 'full-autopilot';
}

// ============================================
// MAIN COMPONENT
// ============================================

export function GovernancePanel({
  config,
  onChange,
  isDisabled = false,
}: GovernancePanelProps) {
  const activeMode = useMemo(() => configToMode(config), [config]);

  const handleModeChange = useCallback(
    (mode: ModeDefinition) => {
      if (isDisabled) return;
      onChange(mode.config);
    },
    [onChange, isDisabled]
  );

  const activeModeIndex = MODES.findIndex((m) => m.id === activeMode);
  const activeModeDef = MODES[activeModeIndex];

  return (
    <div className={cn('space-y-3', isDisabled && 'opacity-50 pointer-events-none')}>
      {/* Section Label */}
      <div className="flex items-center gap-2">
        <Shield className="w-3.5 h-3.5 text-white/40" />
        <span className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Governance
        </span>
      </div>

      {/* Segmented Control */}
      <div className="relative flex bg-white/[0.02] rounded-xl border border-white/[0.06] p-1">
        {/* Active Indicator (animated) */}
        <motion.div
          className="absolute top-1 bottom-1 rounded-lg"
          style={{
            width: `calc(${100 / MODES.length}% - 2px)`,
            background:
              activeMode === 'manual'
                ? 'rgba(255,255,255,0.04)'
                : activeMode === 'ai-assisted'
                  ? 'rgba(139, 92, 246, 0.12)'
                  : 'rgba(16, 185, 129, 0.12)',
            border:
              activeMode === 'manual'
                ? '1px solid rgba(255,255,255,0.06)'
                : activeMode === 'ai-assisted'
                  ? '1px solid rgba(139, 92, 246, 0.2)'
                  : '1px solid rgba(16, 185, 129, 0.2)',
          }}
          animate={{
            left: `calc(${(activeModeIndex * 100) / MODES.length}% + 4px)`,
          }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        />

        {/* Mode Buttons */}
        {MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = mode.id === activeMode;

          return (
            <button
              key={mode.id}
              onClick={() => handleModeChange(mode)}
              className={cn(
                'relative flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-colors z-10',
                isActive
                  ? mode.id === 'manual'
                    ? 'text-white/80'
                    : mode.id === 'ai-assisted'
                      ? 'text-violet-400'
                      : 'text-emerald-400'
                  : 'text-white/30 hover:text-white/50'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{mode.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Mode Description */}
      <p className="text-xs text-white/30 leading-relaxed">{activeModeDef.description}</p>
    </div>
  );
}

export default GovernancePanel;
