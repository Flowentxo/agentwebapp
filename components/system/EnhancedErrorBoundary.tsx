/**
 * ENHANCED ERROR BOUNDARY COMPONENT
 * 
 * Provides comprehensive error handling for React components with
 * graceful fallback UI and error reporting.
 */

'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { errorHandler } from '@/lib/errors/ErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  showDetails?: boolean;
  level?: 'page' | 'component' | 'section';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  errorId: string;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Auth errors: immediate redirect to /login
    const msg = error.message.toLowerCase();
    if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('token') || msg.includes('401')) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/login';
        return;
      }
    }

    // Log error to our centralized error handler
    errorHandler.handle(error, `ErrorBoundary-${this.props.level || 'component'}`);

    // Store error info for display
    this.setState({ errorInfo });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI based on level
      if (this.props.level === 'page') {
        return <PageLevelError 
          error={this.state.error} 
          errorInfo={this.state.errorInfo}
          errorId={this.state.errorId}
          showDetails={this.props.showDetails}
          onReload={this.handleReload}
          onGoHome={this.handleGoHome}
        />;
      }

      if (this.props.level === 'section') {
        return <SectionLevelError 
          error={this.state.error} 
          onReset={this.handleReset}
        />;
      }

      // Default component-level error
      return <ComponentLevelError 
        error={this.state.error} 
        onReset={this.handleReset}
      />;
    }

    return this.props.children;
  }
}

/**
 * Page-level error display
 */
function PageLevelError({ 
  error, 
  errorInfo, 
  errorId, 
  showDetails = false, 
  onReload, 
  onGoHome 
}: {
  error: Error | null;
  errorInfo: any;
  errorId: string;
  showDetails?: boolean;
  onReload: () => void;
  onGoHome: () => void;
}) {
  return (
    <div className="min-h-screen bg-surface-0 flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center">
        <div className="mb-8">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-text mb-2">
            Etwas ist schiefgelaufen
          </h1>
          <p className="text-text-muted">
            Es ist ein unerwarteter Fehler aufgetreten. Unser Team wurde automatisch benachrichtigt.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={onReload} className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Seite neu laden
            </Button>
            <Button onClick={onGoHome} variant="outline" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              Zur Startseite
            </Button>
          </div>

          {showDetails && error && (
            <details className="text-left mt-6 p-4 bg-surface-1 rounded-lg border border-white/10">
              <summary className="cursor-pointer text-sm font-medium text-text-muted mb-2 flex items-center gap-2">
                <Bug className="w-4 h-4" />
                Technische Details
              </summary>
              <div className="text-xs text-text-muted space-y-2">
                <div>
                  <strong>Fehler-ID:</strong> {errorId}
                </div>
                <div>
                  <strong>Nachricht:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack Trace:</strong>
                    <pre className="mt-1 p-2 bg-surface-0 rounded text-xs overflow-auto max-h-32">
                      {error.stack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Section-level error display
 */
function SectionLevelError({ 
  error, 
  onReset 
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div className="p-6 bg-red-500/5 border border-red-500/20 rounded-lg">
      <div className="flex items-center gap-3 mb-3">
        <AlertTriangle className="w-5 h-5 text-red-400" />
        <h3 className="font-medium text-red-400">
          Fehler in diesem Bereich
        </h3>
      </div>
      <p className="text-sm text-text-muted mb-4">
        {error?.message || 'Ein Fehler ist in diesem Bereich aufgetreten.'}
      </p>
      <Button onClick={onReset} size="sm" variant="outline">
        Erneut versuchen
      </Button>
    </div>
  );
}

/**
 * Component-level error display
 */
function ComponentLevelError({ 
  error, 
  onReset 
}: {
  error: Error | null;
  onReset: () => void;
}) {
  return (
    <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-orange-400">
          Komponentenfehler
        </span>
      </div>
      <p className="text-xs text-text-muted mb-3">
        {error?.message || 'Ein Fehler ist in dieser Komponente aufgetreten.'}
      </p>
      <Button onClick={onReset} size="sm" variant="ghost" className="text-xs">
        Erneut versuchen
      </Button>
    </div>
  );
}

/**
 * Hook for using error boundary functionality
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error, context?: string) => {
    setError(error);
    errorHandler.handle(error, context);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
}

/**
 * HOC for adding error boundary to components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}