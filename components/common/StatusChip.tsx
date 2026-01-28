'use client';

import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export type Status = 'ok' | 'degraded' | 'error';

interface StatusChipProps {
  status: Status;
  showLabel?: boolean;
  className?: string;
}

const statusConfig = {
  ok: {
    icon: CheckCircle,
    label: 'OK',
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/20',
    tooltip: 'System läuft ohne Probleme',
  },
  degraded: {
    icon: AlertTriangle,
    label: 'Eingeschränkt',
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    tooltip: 'System läuft mit Einschränkungen',
  },
  error: {
    icon: XCircle,
    label: 'Fehler',
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/20',
    tooltip: 'System hat Fehler',
  },
} as const;

/**
 * StatusChip component with icon, optional label, and tooltip.
 * AA-compliant colors with proper contrast ratios.
 */
export function StatusChip({ status, showLabel = false, className = '' }: StatusChipProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={`inline-flex h-6 items-center gap-1.5 rounded border px-2 ${config.bg} ${config.border} ${className}`}
      title={config.tooltip}
      role="status"
      aria-label={`Status: ${config.label}`}
    >
      <Icon className={`h-3.5 w-3.5 ${config.color}`} aria-hidden="true" />
      {showLabel && (
        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
      )}
    </div>
  );
}

/**
 * Get status label text for accessibility.
 */
export function getStatusLabel(status: Status): string {
  return statusConfig[status].label;
}

/**
 * Get status color classes.
 */
export function getStatusColor(status: Status): string {
  return statusConfig[status].color;
}
