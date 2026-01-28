'use client';

/**
 * CanvasErrorBoundary Component
 *
 * Error boundary specifically designed for the Studio canvas and workflow nodes.
 * Provides graceful error recovery with options to:
 * - Reload the canvas
 * - Export workflow backup
 * - View error details
 *
 * @version 1.0.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, ChevronDown, ChevronUp, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';

// =====================================================
// TYPES
// =====================================================

interface CanvasErrorBoundaryProps {
  children: ReactNode;
  /** Callback when canvas needs to be reloaded */
  onReload?: () => void;
  /** Current workflow data for backup export */
  workflowData?: {
    nodes: unknown[];
    edges: unknown[];
    name?: string;
    id?: string;
  };
  /** Fallback component override */
  fallback?: ReactNode;
  /** Error callback for logging/monitoring */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface CanvasErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

// =====================================================
// ERROR BOUNDARY COMPONENT
// =====================================================

export class CanvasErrorBoundary extends Component<CanvasErrorBoundaryProps, CanvasErrorBoundaryState> {
  constructor(props: CanvasErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<CanvasErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to console for development
    console.error('[CanvasErrorBoundary] Canvas error caught:', error);
    console.error('[CanvasErrorBoundary] Component stack:', errorInfo.componentStack);

    // Update state with error info
    this.setState({ errorInfo });

    // Call external error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log to monitoring service in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.logErrorToService(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo): void {
    // Placeholder for production error logging (Sentry, LogRocket, etc.)
    try {
      const errorPayload = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };

      // Could send to /api/logs/client-error endpoint
      console.log('[CanvasErrorBoundary] Would log to service:', errorPayload);
    } catch {
      // Silently fail logging
    }
  }

  handleReload = (): void => {
    // Reset error state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });

    // Call reload callback
    this.props.onReload?.();
  };

  handleExportBackup = (): void => {
    const { workflowData } = this.props;
    const { error } = this.state;

    // Create backup object with workflow data and error context
    const backup = {
      exportedAt: new Date().toISOString(),
      source: 'CanvasErrorBoundary',
      error: {
        message: error?.message,
        stack: error?.stack,
      },
      workflow: workflowData || {
        nodes: [],
        edges: [],
        name: 'Unknown Workflow',
      },
    };

    // Create and download JSON file
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `workflow-backup-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  renderErrorDetails(): ReactNode {
    const { error, errorInfo, showDetails } = this.state;

    if (!showDetails) return null;

    return (
      <div className="mt-4 w-full max-w-2xl rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-left">
        <div className="space-y-3">
          {/* Error Message */}
          <div>
            <h4 className="text-sm font-medium text-destructive">Error Message</h4>
            <pre className="mt-1 overflow-x-auto rounded bg-zinc-900 p-2 text-xs text-zinc-300">
              {error?.message || 'Unknown error'}
            </pre>
          </div>

          {/* Stack Trace */}
          {error?.stack && (
            <div>
              <h4 className="text-sm font-medium text-destructive">Stack Trace</h4>
              <pre className="mt-1 max-h-40 overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-400">
                {error.stack}
              </pre>
            </div>
          )}

          {/* Component Stack */}
          {errorInfo?.componentStack && (
            <div>
              <h4 className="text-sm font-medium text-destructive">Component Stack</h4>
              <pre className="mt-1 max-h-32 overflow-auto rounded bg-zinc-900 p-2 text-xs text-zinc-400">
                {errorInfo.componentStack}
              </pre>
            </div>
          )}
        </div>
      </div>
    );
  }

  render(): ReactNode {
    const { hasError, showDetails } = this.state;
    const { children, fallback, workflowData } = this.props;

    if (!hasError) {
      return children;
    }

    // Custom fallback override
    if (fallback) {
      return fallback;
    }

    // Default error UI
    return (
      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-background to-muted/50 p-8">
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <div className="relative mb-6">
            <div className="absolute inset-0 animate-ping rounded-full bg-destructive/20" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 ring-2 ring-destructive/30">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
          </div>

          {/* Error Title */}
          <h2 className="mb-2 text-2xl font-bold text-foreground">
            Canvas Error
          </h2>

          {/* Error Description */}
          <p className="mb-6 max-w-md text-muted-foreground">
            Something went wrong while rendering the workflow canvas.
            Your work has been preserved and can be recovered.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={this.handleReload}
              className="gap-2"
              variant="default"
            >
              <RefreshCw className="h-4 w-4" />
              Reload Canvas
            </Button>

            <Button
              onClick={this.handleExportBackup}
              className="gap-2"
              variant="outline"
              disabled={!workflowData?.nodes?.length}
            >
              <Download className="h-4 w-4" />
              Export Backup
            </Button>

            <Button
              onClick={this.toggleDetails}
              className="gap-2"
              variant="ghost"
            >
              <Bug className="h-4 w-4" />
              {showDetails ? 'Hide' : 'Show'} Details
              {showDetails ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Error Details (collapsible) */}
          {this.renderErrorDetails()}

          {/* Help Text */}
          <p className="mt-6 text-xs text-muted-foreground">
            If this error persists, please contact support with the error details above.
          </p>
        </div>
      </div>
    );
  }
}

// =====================================================
// HOOK FOR FUNCTIONAL COMPONENTS
// =====================================================

/**
 * Hook to manually trigger error boundary
 * Useful for catching async errors that React boundaries can't catch
 */
export function useCanvasErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);

  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}

// =====================================================
// DEFAULT EXPORT
// =====================================================

export default CanvasErrorBoundary;
