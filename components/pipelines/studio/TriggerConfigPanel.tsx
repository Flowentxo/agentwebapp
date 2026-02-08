'use client';

/**
 * TriggerConfigPanel Component
 *
 * Right sidebar panel for configuring pipeline triggers.
 * Supports Manual, Schedule (Cron), and Webhook trigger types.
 *
 * Vicy-Style: Deep Black (#050505)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Play,
  Clock,
  Webhook,
  Copy,
  RefreshCw,
  Check,
  AlertCircle,
  ChevronRight,
  Settings,
  Shield,
  Zap,
  Calendar,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

type TriggerType = 'manual' | 'schedule' | 'webhook';

interface ScheduleConfig {
  cronExpression: string;
  description?: string;
  timezone?: string;
}

interface WebhookConfig {
  url?: string;
  token?: string;
  isActive?: boolean;
  lastTriggeredAt?: string;
  triggerCount?: number;
}

interface TriggerConfigPanelProps {
  pipelineId: string;
  currentTrigger: TriggerType;
  scheduleConfig?: ScheduleConfig;
  webhookConfig?: WebhookConfig;
  onTriggerChange: (type: TriggerType, config?: ScheduleConfig | WebhookConfig) => void;
  isLoading?: boolean;
}

// ============================================
// CRON PRESETS
// ============================================

const CRON_PRESETS = [
  { label: 'Every minute', value: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', value: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every hour', value: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every day at midnight', value: '0 0 * * *', description: 'Runs daily at 00:00' },
  { label: 'Every Monday at 9 AM', value: '0 9 * * 1', description: 'Runs weekly on Monday' },
  { label: 'First of month', value: '0 0 1 * *', description: 'Runs on the 1st of each month' },
];

// ============================================
// HELPER COMPONENTS
// ============================================

function CopyButton({ text, className }: { text: string; className?: string }) {
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
        'p-2 rounded-lg transition-colors',
        copied
          ? 'bg-emerald-500/10 text-emerald-400'
          : 'bg-white/[0.04] text-white/40 hover:text-white/60 hover:bg-white/[0.06]',
        className
      )}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function TriggerConfigPanel({
  pipelineId,
  currentTrigger,
  scheduleConfig,
  webhookConfig,
  onTriggerChange,
  isLoading = false,
}: TriggerConfigPanelProps) {
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerType>(currentTrigger);
  const [cronExpression, setCronExpression] = useState(scheduleConfig?.cronExpression || '0 * * * *');
  const [isGeneratingWebhook, setIsGeneratingWebhook] = useState(false);

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
    } else if (type === 'webhook') {
      // Webhook config is handled by the API
      onTriggerChange(type);
    } else {
      onTriggerChange(type);
    }
  };

  const handleCronChange = (expression: string) => {
    setCronExpression(expression);
    onTriggerChange('schedule', { cronExpression: expression });
  };

  const handleRegenerateWebhook = async () => {
    setIsGeneratingWebhook(true);
    try {
      const res = await fetch(`/api/pipelines/${pipelineId}/webhooks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        onTriggerChange('webhook', data.webhook);
      }
    } catch (error) {
      console.error('Failed to regenerate webhook:', error);
    } finally {
      setIsGeneratingWebhook(false);
    }
  };

  const triggerOptions = [
    {
      type: 'manual' as const,
      icon: Play,
      label: 'Manual',
      description: 'Trigger via Run button or API',
      color: 'emerald',
    },
    {
      type: 'schedule' as const,
      icon: Clock,
      label: 'Schedule',
      description: 'Run on a cron schedule',
      color: 'blue',
    },
    {
      type: 'webhook' as const,
      icon: Webhook,
      label: 'Webhook',
      description: 'Trigger via HTTP webhook',
      color: 'violet',
    },
  ];

  return (
    <div
      className="h-full flex flex-col border-l border-white/[0.06]"
      style={{ background: '#050505' }}
    >
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-white/40" />
          <span className="text-sm font-medium text-white/80">
            Trigger Configuration
          </span>
        </div>
      </div>

      {/* Trigger Type Selection */}
      <div className="flex-shrink-0 p-4 border-b border-white/[0.06]">
        <p className="text-xs text-white/30 uppercase tracking-wider mb-3">
          Trigger Type
        </p>
        <div className="space-y-2">
          {triggerOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedTrigger === option.type;
            const colorClasses = {
              emerald: isSelected
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'hover:bg-emerald-500/5',
              blue: isSelected
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                : 'hover:bg-blue-500/5',
              violet: isSelected
                ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                : 'hover:bg-violet-500/5',
            };

            return (
              <button
                key={option.type}
                onClick={() => handleTriggerSelect(option.type)}
                disabled={isLoading}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-all',
                  'text-left',
                  isSelected
                    ? colorClasses[option.color]
                    : 'border-white/[0.06] text-white/60 hover:border-white/[0.1]',
                  colorClasses[option.color]
                )}
              >
                <div
                  className={cn(
                    'w-8 h-8 rounded-lg flex items-center justify-center',
                    isSelected ? 'bg-white/10' : 'bg-white/[0.04]'
                  )}
                >
                  <Icon size={16} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-white/30">{option.description}</p>
                </div>
                {isSelected && (
                  <Check size={16} className="text-current opacity-60" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Configuration Section */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Manual Config */}
        {selectedTrigger === 'manual' && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <Zap size={16} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">Manual Trigger</p>
                  <p className="text-xs text-white/40 mt-1">
                    This pipeline will only run when you click the Run button or
                    trigger it via the API.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                API Endpoint
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] text-xs text-white/60 font-mono truncate">
                  POST /api/pipelines/{pipelineId}/run
                </code>
                <CopyButton text={`POST /api/pipelines/${pipelineId}/run`} />
              </div>
            </div>
          </div>
        )}

        {/* Schedule Config */}
        {selectedTrigger === 'schedule' && (
          <div className="space-y-4">
            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                Cron Expression
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={cronExpression}
                  onChange={(e) => handleCronChange(e.target.value)}
                  placeholder="* * * * *"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08]
                    text-white placeholder-white/20 text-sm font-mono
                    focus:outline-none focus:border-blue-500/30 focus:ring-1 focus:ring-blue-500/20"
                />
              </div>
              <p className="text-xs text-white/30 mt-2">
                Format: minute hour day month weekday
              </p>
            </div>

            <div>
              <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                Presets
              </p>
              <div className="space-y-1">
                {CRON_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleCronChange(preset.value)}
                    className={cn(
                      'w-full flex items-center justify-between p-2.5 rounded-lg transition-colors text-left',
                      cronExpression === preset.value
                        ? 'bg-blue-500/10 text-blue-400'
                        : 'hover:bg-white/[0.04] text-white/60'
                    )}
                  >
                    <div>
                      <p className="text-sm">{preset.label}</p>
                      <p className="text-xs text-white/30">{preset.description}</p>
                    </div>
                    <code className="text-xs text-white/30 font-mono">
                      {preset.value}
                    </code>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-3">
                <Calendar size={16} className="text-blue-400 mt-0.5" />
                <div>
                  <p className="text-sm text-blue-400">Schedule Active</p>
                  <p className="text-xs text-white/40 mt-1">
                    This pipeline will run automatically based on the cron schedule.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Webhook Config */}
        {selectedTrigger === 'webhook' && (
          <div className="space-y-4">
            {webhookConfig?.url ? (
              <>
                <div>
                  <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                    Webhook URL
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/60 font-mono truncate">
                      {webhookConfig.url}
                    </code>
                    <CopyButton text={webhookConfig.url} />
                  </div>
                </div>

                {webhookConfig.token && (
                  <div>
                    <p className="text-xs text-white/30 uppercase tracking-wider mb-2">
                      Auth Token
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-xs text-white/40 font-mono">
                        •••••••••••••••••
                      </code>
                      <CopyButton text={webhookConfig.token} />
                    </div>
                    <p className="text-xs text-white/30 mt-2">
                      Include in header: <code className="text-white/50">X-Webhook-Token</code>
                    </p>
                  </div>
                )}

                <button
                  onClick={handleRegenerateWebhook}
                  disabled={isGeneratingWebhook}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                    bg-white/[0.04] border border-white/[0.08] text-white/60
                    hover:bg-white/[0.06] hover:text-white/80 transition-colors text-sm"
                >
                  <RefreshCw
                    size={14}
                    className={isGeneratingWebhook ? 'animate-spin' : ''}
                  />
                  Regenerate Token
                </button>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-white/30">Total Triggers</p>
                    <p className="text-lg font-semibold text-white mt-1">
                      {webhookConfig.triggerCount || 0}
                    </p>
                  </div>
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-xs text-white/30">Last Triggered</p>
                    <p className="text-sm text-white/60 mt-1">
                      {webhookConfig.lastTriggeredAt
                        ? new Date(webhookConfig.lastTriggeredAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <Webhook className="w-8 h-8 text-white/20 mx-auto mb-3" />
                <p className="text-sm text-white/60 mb-4">
                  No webhook configured yet
                </p>
                <button
                  onClick={handleRegenerateWebhook}
                  disabled={isGeneratingWebhook}
                  className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500
                    text-white text-sm font-medium transition-colors flex items-center gap-2 mx-auto"
                >
                  {isGeneratingWebhook ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : (
                    <Zap size={14} />
                  )}
                  Generate Webhook
                </button>
              </div>
            )}

            <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
              <div className="flex items-start gap-3">
                <Shield size={16} className="text-violet-400 mt-0.5" />
                <div>
                  <p className="text-sm text-violet-400">Security Note</p>
                  <p className="text-xs text-white/40 mt-1">
                    Keep your webhook token secret. Anyone with this token can trigger
                    your pipeline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/[0.06]">
        <p className="text-[10px] text-white/20">
          Changes are saved automatically
        </p>
      </div>
    </div>
  );
}

export default TriggerConfigPanel;
