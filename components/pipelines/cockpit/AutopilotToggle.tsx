'use client';

/**
 * AutopilotToggle Component
 *
 * Toggle for automatic approval decisions based on Lead-Score thresholds.
 * When enabled, approvals above/below certain scores are handled automatically.
 *
 * Vicy-Style: Deep Black (#050505) + Violet/Emerald accents
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Hand,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface AutopilotConfig {
  enabled: boolean;
  scoreThreshold: number; // General threshold (unused if using auto-approve/reject)
  autoApproveAbove: number; // Auto-approve if score >= this
  autoRejectBelow: number; // Auto-reject if score < this
}

interface AutopilotToggleProps {
  config: AutopilotConfig;
  onChange: (config: AutopilotConfig) => void;
  isDisabled?: boolean;
}

// ============================================
// DEFAULT CONFIG
// ============================================

export const DEFAULT_AUTOPILOT_CONFIG: AutopilotConfig = {
  enabled: false,
  scoreThreshold: 50,
  autoApproveAbove: 70,
  autoRejectBelow: 30,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function AutopilotToggle({
  config,
  onChange,
  isDisabled = false,
}: AutopilotToggleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localConfig, setLocalConfig] = useState<AutopilotConfig>(config);

  // Sync with props
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  const handleToggle = () => {
    const newConfig = { ...localConfig, enabled: !localConfig.enabled };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  const handleThresholdChange = (
    key: 'autoApproveAbove' | 'autoRejectBelow',
    value: number
  ) => {
    // Ensure valid range and no overlap
    let newValue = Math.max(0, Math.min(100, value));

    if (key === 'autoApproveAbove' && newValue <= localConfig.autoRejectBelow) {
      newValue = localConfig.autoRejectBelow + 1;
    }
    if (key === 'autoRejectBelow' && newValue >= localConfig.autoApproveAbove) {
      newValue = localConfig.autoApproveAbove - 1;
    }

    const newConfig = { ...localConfig, [key]: newValue };
    setLocalConfig(newConfig);
    onChange(newConfig);
  };

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
          Autopilot
        </span>
        {config.enabled && (
          <span className="text-[10px] text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10 uppercase">
            Active
          </span>
        )}
      </div>

      {/* Main Toggle Card */}
      <div
        className={cn(
          'rounded-xl border transition-all duration-300',
          config.enabled
            ? 'bg-emerald-500/5 border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.1)]'
            : 'bg-white/[0.02] border-white/[0.06]'
        )}
      >
        {/* Toggle Header */}
        <button
          onClick={handleToggle}
          disabled={isDisabled}
          className={cn(
            'w-full flex items-center gap-3 p-3 transition-colors',
            isDisabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          {/* Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
              config.enabled
                ? 'bg-emerald-500/10 text-emerald-400'
                : 'bg-white/[0.04] text-white/40'
            )}
          >
            {config.enabled ? <Bot size={20} /> : <Hand size={20} />}
          </div>

          {/* Label */}
          <div className="flex-1 text-left">
            <p className="text-sm font-medium text-white">
              {config.enabled ? 'Autopilot aktiv' : 'Manuelle Bestätigung'}
            </p>
            <p className="text-xs text-white/40">
              {config.enabled
                ? 'Entscheidungen basierend auf Score'
                : 'Alle Anfragen manuell prüfen'}
            </p>
          </div>

          {/* Toggle Switch */}
          <div
            className={cn(
              'w-11 h-6 rounded-full p-0.5 transition-colors',
              config.enabled ? 'bg-emerald-500' : 'bg-white/10'
            )}
          >
            <motion.div
              className="w-5 h-5 rounded-full bg-white shadow-sm"
              animate={{ x: config.enabled ? 20 : 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            />
          </div>
        </button>

        {/* Expanded Config (when enabled) */}
        <AnimatePresence>
          {config.enabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 space-y-4">
                {/* Divider */}
                <div className="h-px bg-white/[0.06]" />

                {/* Auto-Approve Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span className="text-xs text-white/60">Auto-Freigabe ab</span>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400">
                      {localConfig.autoApproveAbove}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localConfig.autoApproveAbove}
                    onChange={(e) =>
                      handleThresholdChange('autoApproveAbove', parseInt(e.target.value))
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                      bg-gradient-to-r from-white/10 to-emerald-500/30
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-emerald-400
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-emerald-500/30
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <p className="text-[10px] text-white/30 mt-1">
                    Score ≥ {localConfig.autoApproveAbove} → Automatisch freigegeben
                  </p>
                </div>

                {/* Auto-Reject Threshold */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingDown size={14} className="text-red-400" />
                      <span className="text-xs text-white/60">Auto-Ablehnung unter</span>
                    </div>
                    <span className="text-sm font-semibold text-red-400">
                      {localConfig.autoRejectBelow}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={localConfig.autoRejectBelow}
                    onChange={(e) =>
                      handleThresholdChange('autoRejectBelow', parseInt(e.target.value))
                    }
                    className="w-full h-1.5 rounded-full appearance-none cursor-pointer
                      bg-gradient-to-r from-red-500/30 to-white/10
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-4
                      [&::-webkit-slider-thumb]:h-4
                      [&::-webkit-slider-thumb]:rounded-full
                      [&::-webkit-slider-thumb]:bg-red-400
                      [&::-webkit-slider-thumb]:shadow-lg
                      [&::-webkit-slider-thumb]:shadow-red-500/30
                      [&::-webkit-slider-thumb]:cursor-pointer"
                  />
                  <p className="text-[10px] text-white/30 mt-1">
                    Score &lt; {localConfig.autoRejectBelow} → Automatisch abgelehnt
                  </p>
                </div>

                {/* Middle Zone Info */}
                <div className="p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle size={14} className="text-amber-400 mt-0.5" />
                    <div>
                      <p className="text-xs text-amber-400 font-medium">Grauzone</p>
                      <p className="text-[10px] text-white/40 mt-0.5">
                        Scores zwischen {localConfig.autoRejectBelow} und{' '}
                        {localConfig.autoApproveAbove} erfordern manuelle Prüfung
                      </p>
                    </div>
                  </div>
                </div>

                {/* Visual Score Bar */}
                <div className="relative h-2 rounded-full bg-white/[0.04] overflow-hidden">
                  {/* Reject Zone */}
                  <div
                    className="absolute h-full bg-red-500/40"
                    style={{ width: `${localConfig.autoRejectBelow}%` }}
                  />
                  {/* Manual Zone */}
                  <div
                    className="absolute h-full bg-amber-500/20"
                    style={{
                      left: `${localConfig.autoRejectBelow}%`,
                      width: `${localConfig.autoApproveAbove - localConfig.autoRejectBelow}%`,
                    }}
                  />
                  {/* Approve Zone */}
                  <div
                    className="absolute h-full bg-emerald-500/40"
                    style={{
                      left: `${localConfig.autoApproveAbove}%`,
                      width: `${100 - localConfig.autoApproveAbove}%`,
                    }}
                  />
                </div>

                {/* Legend */}
                <div className="flex items-center justify-between text-[10px] text-white/30">
                  <span>0</span>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded bg-red-500/40" />
                      Ablehnen
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded bg-amber-500/20" />
                      Manuell
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded bg-emerald-500/40" />
                      Freigeben
                    </span>
                  </div>
                  <span>100</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Info Text (when disabled) */}
      {!config.enabled && (
        <div className="flex items-start gap-2 text-xs text-white/30">
          <Info size={12} className="mt-0.5" />
          <span>Aktiviere Autopilot für automatische Entscheidungen basierend auf Lead-Score</span>
        </div>
      )}
    </div>
  );
}

export default AutopilotToggle;
