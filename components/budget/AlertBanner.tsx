'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Info,
  XCircle,
  X,
  CheckCircle,
} from 'lucide-react';

interface BudgetAlert {
  id: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  currentUsage?: {
    tokens?: number;
    costUsd?: number;
    percentage?: number;
  };
  limit?: {
    tokens?: number;
    costUsd?: number;
  };
  isRead: boolean;
  createdAt: string;
}

export function AlertBanner() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();

    // Poll for new alerts every 30 seconds
    const interval = setInterval(loadAlerts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const response = await fetch('/api/budget/alerts?unreadOnly=true');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setAlerts(data.data);
        }
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (alertId: string) => {
    // Optimistically remove from UI
    setDismissedAlerts(prev => new Set(prev).add(alertId));

    // Mark as read in backend
    try {
      await fetch('/api/budget/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId }),
      });

      // Remove from state after successful marking
      setAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Failed to dismiss alert:', error);
      // Revert optimistic update
      setDismissedAlerts(prev => {
        const newSet = new Set(prev);
        newSet.delete(alertId);
        return newSet;
      });
    }
  };

  const handleDismissAll = async () => {
    try {
      await fetch('/api/budget/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ markAll: true }),
      });

      setAlerts([]);
    } catch (error) {
      console.error('Failed to dismiss all alerts:', error);
    }
  };

  const getAlertIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <XCircle className="h-5 w-5" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getAlertStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/10 border-red-500/30 text-red-900 dark:bg-red-900/10 dark:border-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-900 dark:bg-yellow-900/10 dark:border-yellow-800 dark:text-yellow-200';
      default:
        return 'bg-blue-500/10 border-blue-500/30 text-blue-900 dark:bg-blue-900/10 dark:border-blue-800 dark:text-blue-200';
    }
  };

  const getIconColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-500 dark:text-red-400';
      case 'warning':
        return 'text-yellow-500 dark:text-yellow-400';
      default:
        return 'text-blue-500 dark:text-blue-400';
    }
  };

  // Filter out dismissed alerts
  const visibleAlerts = alerts.filter(alert => !dismissedAlerts.has(alert.id));

  if (loading || visibleAlerts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      {/* Dismiss all button */}
      {visibleAlerts.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={handleDismissAll}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <CheckCircle className="h-4 w-4" />
            Dismiss all
          </button>
        </div>
      )}

      {/* Alert cards */}
      {visibleAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 p-4 rounded-lg border ${getAlertStyles(alert.severity)}`}
        >
          <div className={`flex-shrink-0 ${getIconColor(alert.severity)}`}>
            {getAlertIcon(alert.severity)}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{alert.message}</p>

            {alert.currentUsage && (
              <div className="mt-2 text-xs opacity-75">
                {alert.currentUsage.costUsd !== undefined && (
                  <span>
                    Current: ${alert.currentUsage.costUsd.toFixed(4)}
                    {alert.limit?.costUsd && ` / ${alert.limit.costUsd.toFixed(2)}`}
                  </span>
                )}
                {alert.currentUsage.tokens !== undefined && (
                  <span className="ml-3">
                    Tokens: {alert.currentUsage.tokens.toLocaleString()}
                    {alert.limit?.tokens && ` / ${alert.limit.tokens.toLocaleString()}`}
                  </span>
                )}
                {alert.currentUsage.percentage !== undefined && (
                  <span className="ml-3">
                    ({alert.currentUsage.percentage.toFixed(0)}%)
                  </span>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => handleDismiss(alert.id)}
            className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
            aria-label="Dismiss alert"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
