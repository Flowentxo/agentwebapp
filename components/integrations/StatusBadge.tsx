/**
 * StatusBadge Component
 *
 * Displays connection status with appropriate colors and icons
 */

import React from 'react';
import { StatusBadgeProps } from '@/types/integrations';

const StatusConfig = {
  not_connected: {
    label: 'Not Connected',
    icon: '○',
    className: 'not-connected',
    ariaLabel: 'Integration is not connected',
  },
  connecting: {
    label: 'Connecting...',
    icon: '◐',
    className: 'connecting',
    ariaLabel: 'Connection in progress',
  },
  connected: {
    label: 'Connected',
    icon: '●',
    className: 'connected',
    ariaLabel: 'Integration is connected',
  },
  error: {
    label: 'Error',
    icon: '⚠',
    className: 'error',
    ariaLabel: 'Connection error',
  },
};

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const config = StatusConfig[status];

  return (
    <span
      className={`status-badge ${config.className} ${className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      <span className="status-icon" aria-hidden="true">
        {config.icon}
      </span>
      <span className="status-label">{config.label}</span>
    </span>
  );
}
