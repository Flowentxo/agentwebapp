'use client';

/**
 * TriggerCockpit Component
 *
 * Quick-switch UI for pipeline triggers with segmented control.
 * Supports Manual, Webhook (Realtime), and Schedule (Cron) modes.
 *
 * Vicy-Style: Deep Black (#050505) + Violet accents
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Clock,
  Webhook,
  Copy,
  Check,
  Calendar,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type TriggerType = 'manual' | 'webhook' | 'schedule';

interface ScheduleConfig {
  cronExpression: string;
  nextRun?: string;
  timezone?: string;
}

interface WebhookConfig {
  url?: string;
  token?: string;
  isActive?: boolean;
}

interface TriggerCockpitProps {
  pipelineId: string;
  currentTrigger: TriggerType;
  scheduleConfig?: ScheduleConfig;
  webhookConfig?: WebhookConfig;
  onTriggerChange: (type: TriggerType, config?: ScheduleConfig | WebhookConfig) => void;
  onRunNow?: () => void;
  isRunning?: boolean;
}

// ============================================
// HELPER COMPONENTS
// ============================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'p-1.5 rounded-lg transition-colors',
        copied
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06]'
      )}
      title={copied ? 'Copied!' : 'Copy'}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

// ============================================
// CRON PRESETS
// ============================================

const CRON_PRESETS = [
  { label: 'Every 5 min', value: '*/5 * * * *' },
  { label: 'Hourly', value: '0 * * * *' },
  { label: 'Daily 9AM', value: '0 9 * * *' },
  { label: 'Weekly Mon', value: '0 9 * * 1' },
];

// ============================================
// MAIN COMPONENT
// ============================================

export function TriggerCockpit({
  pipelineId,
  currentTrigger,
  scheduleConfig,
  webhookConfig,
  onTriggerChange,
  onRunNow,
  isRunning = false,
}: TriggerCockpitProps) {
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(currentTrigger);
  const [isExpanded, setIsExpanded] = useState(false);
  const [cronExpression, setCronExpression] = useState(
    scheduleConfig?.cronExpression || '0 * * * *'
  );

  // Sync with props
  useEffect(() => {
    setSelectedTrigger(currentTrigger);
    if (scheduleConfig?.cronExpression) {
      setCronExpression(scheduleConfig.cronExpression);
    }
  }, [currentTrigger, scheduleConfig]);

  const handleTriggerSelect = (type: TriggerType) => {
    setSelectedTrigger(type);
    if (type === 'schedule') {
      onTriggerChange(type, { cronExpression });
    } else {
      onTriggerChange(type);
    }
  };

  const handleCronChange = (expression: string) => {
    setCronExpression(expression);
    onTriggerChange('schedule', { cronExpression: expression });
  };

  const triggerOptions: { type: TriggerType; icon: React.ElementType; label: string }[] = [
    { type: 'manual', icon: Play, label: 'Manual' },
    { type: 'webhook', icon: Webhook, label: 'Realtime' },
    { type: 'schedule', icon: Clock, label: 'Zeitplan' },
  ];

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 uppercase tracking-wider font-medium">
          Trigger
        </span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded text-white/30 hover:text-white/50 transition-colors"
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Segmented Control */}
      <div className="flex p-1 rounded-xl bg-white/[0.02] border border-white/[0.06]">
        {triggerOptions.map((option) => {
          const Icon = option.icon;
          const isActive = selectedTrigger === option.type;

          return (
            <button
              key={option.type}
              onClick={() => handleTriggerSelect(option.type)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg',
                'text-xs font-medium transition-all',
                isActive
                  ? 'bg-violet-500/20 text-violet-400 shadow-sm'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.02]'
              )}
            >
              <Icon size={14} />
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Expanded Configuration */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pt-2 space-y-3">
              {/* Manual Config */}
              {selectedTrigger === 'manual' && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                  <div className="flex items-center gap-2 text-xs text-white/40 mb-3">
                    <Zap size={12} />
                    <span>Click to run pipeline</span>
                  </div>
                  <button
                    onClick={onRunNow}
                    disabled={isRunning}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                      'text-sm font-medium transition-all',
                      isRunning
                        ? 'bg-violet-500/20 text-violet-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-violet-600 to-violet-500 text-white hover:from-violet-500 hover:to-violet-400 shadow-lg shadow-violet-500/20'
                    )}
                  >
                    {isRunning ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play size={14} />
                        Jetzt ausführen
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Webhook Config */}
              {selectedTrigger === 'webhook' && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                  {webhookConfig?.url ? (
                    <>
                      <div>
                        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                          Webhook URL
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] text-[11px] text-white/50 font-mono truncate">
                            {webhookConfig.url}
                          </code>
                          <CopyButton text={webhookConfig.url} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <div
                          className={cn(
                            'w-1.5 h-1.5 rounded-full',
                            webhookConfig.isActive ? 'bg-emerald-400' : 'bg-white/20'
                          )}
                        />
                        <span className="text-white/40">
                          {webhookConfig.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-2">
                      <p className="text-xs text-white/40 mb-2">No webhook configured</p>
                      <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                        Generate Webhook
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Schedule Config */}
              {selectedTrigger === 'schedule' && (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] space-y-3">
                  {/* Cron Input */}
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1.5">
                      Cron Expression
                    </p>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => handleCronChange(e.target.value)}
                      placeholder="* * * * *"
                      className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.06]
                        text-white placeholder-white/20 text-sm font-mono
                        focus:outline-none focus:border-violet-500/30 focus:ring-1 focus:ring-violet-500/20"
                    />
                  </div>

                  {/* Quick Presets */}
                  <div className="flex flex-wrap gap-1.5">
                    {CRON_PRESETS.map((preset) => (
                      <button
                        key={preset.value}
                        onClick={() => handleCronChange(preset.value)}
                        className={cn(
                          'px-2 py-1 rounded-lg text-[10px] transition-colors',
                          cronExpression === preset.value
                            ? 'bg-violet-500/20 text-violet-400'
                            : 'bg-white/[0.04] text-white/40 hover:text-white/60'
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Next Run */}
                  {scheduleConfig?.nextRun && (
                    <div className="flex items-center gap-2 text-xs text-white/40">
                      <Calendar size={12} />
                      <span>Next: {new Date(scheduleConfig.nextRun).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compact Info (when collapsed) */}
      {!isExpanded && (
        <div className="flex items-center gap-2 text-xs text-white/30">
          {selectedTrigger === 'manual' && (
            <>
              <Zap size={12} />
              <span>Click Run to execute</span>
            </>
          )}
          {selectedTrigger === 'webhook' && webhookConfig?.url && (
            <>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="truncate">{webhookConfig.url.split('/').pop()}</span>
            </>
          )}
          {selectedTrigger === 'schedule' && (
            <>
              <Clock size={12} />
              <span className="font-mono">{cronExpression}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TriggerCockpit;
