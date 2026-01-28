/**
 * GlobalAlert - System Warning Banner
 *
 * A prominent alert banner for critical system notifications.
 * Uses hazard stripe patterns and neon accents for visibility.
 *
 * Part of the Deep Space Command Core design system.
 */

'use client';

import { memo } from 'react';
import { AlertTriangle, XCircle, Info, CheckCircle, X } from 'lucide-react';

type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';

interface GlobalAlertProps {
  severity: AlertSeverity;
  title: string;
  message: string;
  code?: string;
  timestamp?: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const severityConfig = {
  info: {
    icon: Info,
    bgClass: 'bg-neon-blue/5',
    borderClass: 'border-neon-blue/30',
    textClass: 'text-neon-blue',
    glowClass: 'glow-text-blue',
    stripesClass: '',
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-neon-amber/5',
    borderClass: 'border-neon-amber/30',
    textClass: 'text-neon-amber',
    glowClass: 'glow-text-amber',
    stripesClass: 'hazard-stripes',
  },
  critical: {
    icon: XCircle,
    bgClass: 'bg-neon-red/5',
    borderClass: 'border-neon-red/30',
    textClass: 'text-neon-red',
    glowClass: 'glow-text-red',
    stripesClass: 'hazard-stripes-critical',
  },
  success: {
    icon: CheckCircle,
    bgClass: 'bg-neon-emerald/5',
    borderClass: 'border-neon-emerald/30',
    textClass: 'text-neon-emerald',
    glowClass: 'glow-text-emerald',
    stripesClass: '',
  },
};

function GlobalAlertComponent({
  severity,
  title,
  message,
  code,
  timestamp,
  dismissible = false,
  onDismiss,
}: GlobalAlertProps) {
  const config = severityConfig[severity];
  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`
        relative overflow-hidden rounded-lg border
        ${config.bgClass} ${config.borderClass}
        animate-fade-in-up
      `}
    >
      {/* Hazard stripes overlay for warning/critical */}
      {config.stripesClass && (
        <div
          className={`absolute inset-0 ${config.stripesClass} opacity-30 pointer-events-none`}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex items-start gap-4 p-4">
        {/* Icon with glow */}
        <div className={`flex-shrink-0 ${config.textClass}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-center gap-3 mb-1">
            <h4 className={`font-semibold text-sm ${config.textClass} ${config.glowClass}`}>
              {title}
            </h4>

            {/* Error code badge */}
            {code && (
              <span className="px-2 py-0.5 bg-card/5 border border-white/10 rounded text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {code}
              </span>
            )}
          </div>

          {/* Message */}
          <p className="text-sm text-slate-300 leading-relaxed">
            {message}
          </p>

          {/* Timestamp */}
          {timestamp && (
            <p className="mt-2 text-[11px] font-mono text-muted-foreground">
              {timestamp}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-card/5 text-muted-foreground hover:text-slate-300 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Animated border accent */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-[2px] ${config.textClass.replace('text-', 'bg-')}`}
        style={{
          background: `linear-gradient(90deg, transparent, currentColor, transparent)`,
          opacity: 0.5,
        }}
      />
    </div>
  );
}

export const GlobalAlert = memo(GlobalAlertComponent);
export default GlobalAlert;
