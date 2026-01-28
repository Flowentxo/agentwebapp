'use client';

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary for Brain AI components
 * Catches rendering errors and displays a friendly fallback UI
 */
export class BrainErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[BrainErrorBoundary] Error in ${this.props.componentName || 'component'}:`, error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20 text-center">
          <AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-red-300 mb-1">
            {this.props.componentName 
              ? `${this.props.componentName} konnte nicht geladen werden`
              : 'Komponente konnte nicht geladen werden'
            }
          </p>
          <p className="text-xs text-red-400/70 mb-4">
            {this.state.error?.message || 'Ein unerwarteter Fehler ist aufgetreten'}
          </p>
          <button 
            onClick={this.handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-card/10 hover:bg-card/15 rounded-lg text-xs font-medium text-white transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Erneut versuchen
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Minimal fallback for inline components
 */
export function MinimalErrorFallback({ message = 'Fehler beim Laden' }: { message?: string }) {
  return (
    <div className="p-4 rounded-lg bg-card/5 border border-white/10 text-center">
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * Loading skeleton for Brain components
 */
export function BrainLoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div 
          key={i} 
          className="h-4 bg-card/5 rounded"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}
