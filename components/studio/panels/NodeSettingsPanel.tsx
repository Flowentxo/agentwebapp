'use client';

/**
 * NodeSettingsPanel Component
 *
 * Provides UI controls for configuring node-level execution settings:
 * - Retry Policy (max attempts, backoff delay)
 * - Error Handling Strategy (stop vs continue)
 * - Timeout configuration
 *
 * Part of Phase 7: Resilience & Reliability
 */

import { useState, useCallback, useEffect } from 'react';
import {
  RefreshCcw,
  AlertTriangle,
  Clock,
  Shield,
  ChevronDown,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
  Info,
} from 'lucide-react';
import {
  RetryPolicy,
  OnErrorAction,
  NodeSettings,
  DEFAULT_RETRY_POLICY,
  DEFAULT_ON_ERROR,
} from '@/types/workflow';

// ============================================================================
// TYPES
// ============================================================================

interface NodeSettingsPanelProps {
  /** Current node settings */
  settings: Partial<NodeSettings>;
  /** Callback when settings change */
  onChange: (settings: Partial<NodeSettings>) => void;
  /** Node type for contextual help */
  nodeType?: string;
  /** Whether the panel is collapsed by default */
  defaultCollapsed?: boolean;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

interface TooltipProps {
  text: string;
  children: React.ReactNode;
}

function Tooltip({ text, children }: TooltipProps) {
  return (
    <div className="relative group inline-flex items-center">
      {children}
      <div className="absolute left-full ml-2 hidden group-hover:block z-50">
        <div className="bg-slate-800 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap max-w-xs">
          {text}
        </div>
      </div>
    </div>
  );
}

interface SliderProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  showValue?: boolean;
  unit?: string;
}

function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  disabled = false,
  showValue = true,
  unit = '',
}: SliderProps) {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="flex items-center gap-3">
      <div className="relative flex-1">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`w-full h-2 rounded-lg appearance-none cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            bg-slate-700`}
          style={{
            background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${percentage}%, #334155 ${percentage}%, #334155 100%)`,
          }}
        />
      </div>
      {showValue && (
        <span className="text-sm font-mono text-gray-300 min-w-[60px] text-right">
          {value}
          {unit}
        </span>
      )}
    </div>
  );
}

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
}: ToggleSwitchProps) {
  const sizeClasses = size === 'sm' ? 'w-8 h-4' : 'w-10 h-5';
  const dotSizeClasses = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const dotTranslate = size === 'sm' ? 'translate-x-4' : 'translate-x-5';

  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex items-center rounded-full transition-colors
        ${sizeClasses}
        ${checked ? 'bg-indigo-600' : 'bg-slate-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block rounded-full bg-card transition-transform
          ${dotSizeClasses}
          ${checked ? dotTranslate : 'translate-x-0.5'}`}
      />
    </button>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function NodeSettingsPanel({
  settings,
  onChange,
  nodeType,
  defaultCollapsed = false,
}: NodeSettingsPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  // Extract current settings with defaults
  const retryEnabled = (settings?.retryPolicy?.maxAttempts ?? 1) > 1;
  const maxAttempts = settings?.retryPolicy?.maxAttempts ?? DEFAULT_RETRY_POLICY.maxAttempts;
  const backoffMs = settings?.retryPolicy?.backoffMs ?? DEFAULT_RETRY_POLICY.backoffMs;
  const exponentialBackoff = settings?.retryPolicy?.exponentialBackoff ?? true;
  const onError = settings?.onError ?? DEFAULT_ON_ERROR;
  const timeoutMs = settings?.timeoutMs ?? 60000;

  // Update a specific setting
  const updateSettings = useCallback(
    (updates: Partial<NodeSettings>) => {
      onChange({
        ...settings,
        ...updates,
      });
    },
    [settings, onChange]
  );

  // Update retry policy
  const updateRetryPolicy = useCallback(
    (updates: Partial<RetryPolicy>) => {
      updateSettings({
        retryPolicy: {
          maxAttempts: settings?.retryPolicy?.maxAttempts ?? 1,
          backoffMs: settings?.retryPolicy?.backoffMs ?? 1000,
          exponentialBackoff: settings?.retryPolicy?.exponentialBackoff ?? true,
          ...updates,
        },
      });
    },
    [settings, updateSettings]
  );

  // Toggle retry on/off
  const toggleRetry = useCallback(
    (enabled: boolean) => {
      updateRetryPolicy({
        maxAttempts: enabled ? 3 : 1, // Default to 3 attempts when enabled
      });
    },
    [updateRetryPolicy]
  );

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-700/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium text-white">Execution Settings</span>
        </div>
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div className="px-4 pb-4 space-y-5">
          {/* Retry Strategy Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RefreshCcw className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium text-gray-200">Retry on Failure</span>
                <Tooltip text="Automatically retry the node if it fails due to transient errors like timeouts or network issues">
                  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                </Tooltip>
              </div>
              <ToggleSwitch
                checked={retryEnabled}
                onChange={toggleRetry}
              />
            </div>

            {retryEnabled && (
              <div className="ml-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
                {/* Max Attempts */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Max Attempts</label>
                    <span className="text-xs text-muted-foreground">
                      {maxAttempts} {maxAttempts === 1 ? 'attempt' : 'attempts'}
                    </span>
                  </div>
                  <Slider
                    value={maxAttempts}
                    min={1}
                    max={5}
                    onChange={(value) => updateRetryPolicy({ maxAttempts: value })}
                    showValue={false}
                  />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>

                {/* Backoff Delay */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-muted-foreground">Initial Delay</label>
                    <span className="text-xs text-muted-foreground">
                      {backoffMs >= 1000 ? `${backoffMs / 1000}s` : `${backoffMs}ms`}
                    </span>
                  </div>
                  <Slider
                    value={backoffMs}
                    min={500}
                    max={5000}
                    step={500}
                    onChange={(value) => updateRetryPolicy({ backoffMs: value })}
                    showValue={false}
                  />
                </div>

                {/* Exponential Backoff Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Exponential Backoff</span>
                    <Tooltip text="Double the delay after each failed attempt (1s -> 2s -> 4s)">
                      <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                    </Tooltip>
                  </div>
                  <ToggleSwitch
                    checked={exponentialBackoff}
                    onChange={(checked) => updateRetryPolicy({ exponentialBackoff: checked })}
                    size="sm"
                  />
                </div>

                {/* Preview of retry delays */}
                {maxAttempts > 1 && (
                  <div className="bg-card/50 rounded-md p-2 text-xs">
                    <div className="text-muted-foreground mb-1">Retry Schedule:</div>
                    <div className="flex flex-wrap gap-1">
                      {Array.from({ length: maxAttempts - 1 }, (_, i) => {
                        const delay = exponentialBackoff
                          ? backoffMs * Math.pow(2, i)
                          : backoffMs;
                        return (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded bg-slate-700 text-gray-300"
                          >
                            {i + 1}: {delay >= 1000 ? `${delay / 1000}s` : `${delay}ms`}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50" />

          {/* Error Handling Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-gray-200">On Final Failure</span>
              <Tooltip text="What should happen if the node fails after all retry attempts">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </Tooltip>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => updateSettings({ onError: 'stop' })}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                  ${
                    onError === 'stop'
                      ? 'border-red-500/50 bg-red-500/10 text-red-300'
                      : 'border-slate-600 hover:border-slate-500 text-muted-foreground hover:text-gray-300'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      onError === 'stop' ? 'border-red-400 bg-red-400' : 'border-gray-500'
                    }`}
                  />
                  <span className="text-sm font-medium">Stop Workflow</span>
                </div>
                <span className="text-[10px] opacity-60">Halt execution immediately</span>
              </button>

              <button
                onClick={() => updateSettings({ onError: 'continue' })}
                className={`flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                  ${
                    onError === 'continue'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                      : 'border-slate-600 hover:border-slate-500 text-muted-foreground hover:text-gray-300'
                  }`}
              >
                <div className="flex items-center gap-1.5">
                  <div
                    className={`w-3 h-3 rounded-full border-2 ${
                      onError === 'continue' ? 'border-amber-400 bg-amber-400' : 'border-gray-500'
                    }`}
                  />
                  <span className="text-sm font-medium">Continue</span>
                </div>
                <span className="text-[10px] opacity-60">Skip and proceed</span>
              </button>
            </div>

            {onError === 'continue' && (
              <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-md border border-amber-500/20">
                <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-200/80">
                  The workflow will continue even if this node fails. Downstream nodes may receive
                  null/empty data.
                </p>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50" />

          {/* Timeout Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-gray-200">Timeout</span>
              <Tooltip text="Maximum time to wait for this node to complete before timing out">
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </Tooltip>
            </div>

            <div className="space-y-2">
              <Slider
                value={timeoutMs / 1000}
                min={5}
                max={300}
                step={5}
                onChange={(value) => updateSettings({ timeoutMs: value * 1000 })}
                unit="s"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>5s</span>
                <span>1m</span>
                <span>2m</span>
                <span>3m</span>
                <span>5m</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NodeSettingsPanel;
