/**
 * 🚨 Enhanced Global Error Boundary
 * Comprehensive error handling with German messages and recovery mechanisms
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, Bug, Mail } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  enableRecovery?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
}

// German error messages
const ERROR_MESSAGES = {
  // General errors
  generic: {
    title: 'Ein unerwarteter Fehler ist aufgetreten',
    description: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    action: 'Seite neu laden',
  },
  
  // Network errors
  network: {
    title: 'Netzwerkverbindung fehlgeschlagen',
    description: 'Die Verbindung zum Server konnte nicht hergestellt werden.',
    action: 'Verbindung prüfen',
  },
  
  // API errors
  api: {
    title: 'API-Anfrage fehlgeschlagen',
    description: 'Der Server konnte Ihre Anfrage nicht verarbeiten.',
    action: 'Erneut versuchen',
  },
  
  // Authentication errors
  auth: {
    title: 'Authentifizierung fehlgeschlagen',
    description: 'Ihre Sitzung ist abgelaufen oder ungültig.',
    action: 'Erneut anmelden',
  },
  
  // Permission errors
  permission: {
    title: 'Zugriff verweigert',
    description: 'Sie haben keine Berechtigung für diese Aktion.',
    action: 'Administrator kontaktieren',
  },
  
  // Validation errors
  validation: {
    title: 'Eingabefehler',
    description: 'Die eingegebenen Daten sind ungültig.',
    action: 'Eingaben überprüfen',
  },
  
  // Timeout errors
  timeout: {
    title: 'Zeitüberschreitung',
    description: 'Die Anfrage hat zu lange gedauert.',
    action: 'Erneut versuchen',
  },
  
  // Server errors
  server: {
    title: 'Serverfehler',
    description: 'Ein Problem ist auf dem Server aufgetreten.',
    action: 'Später erneut versuchen',
  },
  
  // Component errors
  component: {
    title: 'Komponentenfehler',
    description: 'Ein Fehler ist in einer Anwendungs-Komponente aufgetreten.',
    action: 'Seite neu laden',
  },
  
  // JavaScript errors
  javascript: {
    title: 'JavaScript-Fehler',
    description: 'Ein Fehler ist im Browser aufgetreten.',
    action: 'Seite neu laden',
  },
};

// Error type detection
const detectErrorType = (error: Error): keyof typeof ERROR_MESSAGES => {
  const message = error.message.toLowerCase();
  const stack = error.stack?.toLowerCase() || '';
  
  // Network errors
  if (message.includes('network') || message.includes('fetch') || message.includes('connection')) {
    return 'network';
  }
  
  // API errors
  if (message.includes('api') || message.includes('request') || message.includes('response')) {
    return 'api';
  }
  
  // Authentication errors
  if (message.includes('auth') || message.includes('unauthorized') || message.includes('token')) {
    return 'auth';
  }
  
  // Permission errors
  if (message.includes('permission') || message.includes('forbidden') || message.includes('access denied')) {
    return 'permission';
  }
  
  // Validation errors
  if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
    return 'validation';
  }
  
  // Timeout errors
  if (message.includes('timeout') || message.includes('timed out')) {
    return 'timeout';
  }
  
  // Server errors
  if (message.includes('server') || message.includes('500') || message.includes('internal')) {
    return 'server';
  }
  
  // Component errors
  if (stack.includes('react') || stack.includes('component')) {
    return 'component';
  }
  
  // Default to generic
  return 'generic';
};

// Generate unique error ID
const generateErrorId = (): string => {
  return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Recovery strategies
const RECOVERY_STRATEGIES = {
  reload: () => window.location.reload(),
  navigateHome: () => window.location.href = '/',
  clearCache: () => {
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => caches.delete(name));
      });
    }
    window.location.reload();
  },
  goBack: () => window.history.back(),
};

export class EnhancedErrorBoundary extends Component<Props, State> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  constructor(props: Props) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: generateErrorId(),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Log error for debugging
    console.group('🚨 Error Boundary Caught Error');
    console.error('Error ID:', this.state.errorId);
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component Stack:', errorInfo.componentStack);
    console.groupEnd();

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Report to error tracking service (e.g., Sentry)
    this.reportError(error, errorInfo);
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private reportError = (error: Error, errorInfo: ErrorInfo) => {
    // Report to error tracking service
    const errorReport = {
      errorId: this.state.errorId,
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      retryCount: this.state.retryCount,
    };

    // Here you would send to your error tracking service
    // Example: Sentry, LogRocket, etc.
    console.log('📊 Error Report:', errorReport);
  };

  private handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleReload = () => {
    RECOVERY_STRATEGIES.reload();
  };

  private handleNavigateHome = () => {
    RECOVERY_STRATEGIES.navigateHome();
  };

  private handleClearCache = () => {
    RECOVERY_STRATEGIES.clearCache();
  };

  private handleGoBack = () => {
    RECOVERY_STRATEGIES.goBack();
  };

  private handleReportBug = () => {
    const { error, errorInfo, errorId } = this.state;
    const subject = encodeURIComponent(`Bug Report: ${error?.message || 'Unknown Error'}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId}\n` +
      `URL: ${window.location.href}\n` +
      `Time: ${new Date().toISOString()}\n\n` +
      `Error: ${error?.message}\n\n` +
      `Stack: ${error?.stack}\n\n` +
      `Component Stack: ${errorInfo?.componentStack}`
    );
    
    window.open(`mailto:support@sintra-ai.com?subject=${subject}&body=${body}`);
  };

  private getErrorType = (): keyof typeof ERROR_MESSAGES => {
    if (!this.state.error) return 'generic';
    return detectErrorType(this.state.error);
  };

  private getErrorMessage = () => {
    const errorType = this.getErrorType();
    return ERROR_MESSAGES[errorType] || ERROR_MESSAGES.generic;
  };

  private getRecoveryActions = () => {
    const { retryCount } = this.state;
    const maxRetries = 3;
    
    const actions = [
      {
        label: 'Erneut versuchen',
        icon: RefreshCw,
        onClick: this.handleRetry,
        primary: true,
        disabled: retryCount >= maxRetries,
      },
      {
        label: 'Seite neu laden',
        icon: RefreshCw,
        onClick: this.handleReload,
      },
      {
        label: 'Zur Startseite',
        icon: Home,
        onClick: this.handleNavigateHome,
      },
    ];

    // Add cache clear option after first retry
    if (retryCount > 0) {
      actions.splice(2, 0, {
        label: 'Cache leeren',
        icon: Bug,
        onClick: this.handleClearCache,
      });
    }

    // Add go back option if there's history
    if (window.history.length > 1) {
      actions.push({
        label: 'Zurück',
        icon: () => <span>←</span>,
        onClick: this.handleGoBack,
      });
    }

    return actions;
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.getErrorMessage();
      const recoveryActions = this.getRecoveryActions();
      const { showDetails = false } = this.props;

      return (
        <div className="min-h-screen bg-muted/50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
              {/* Error Icon */}
              <div className="flex justify-center">
                <div className="flex items-center justify-center w-16 h-16 bg-red-500/20 rounded-full">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              {/* Error Title */}
              <div className="mt-6 text-center">
                <h3 className="text-lg font-medium text-foreground">
                  {errorMessage.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {errorMessage.description}
                </p>
              </div>

              {/* Error ID */}
              <div className="mt-4 text-center">
                <p className="text-xs text-muted-foreground">
                  Fehler-ID: <code className="bg-muted px-1 rounded">{this.state.errorId}</code>
                </p>
              </div>

              {/* Recovery Actions */}
              <div className="mt-6 space-y-3">
                {recoveryActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={`
                        w-full flex justify-center items-center px-4 py-2 border border-transparent 
                        rounded-md shadow-sm text-sm font-medium text-white
                        ${action.primary 
                          ? 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500' 
                          : 'bg-gray-600 hover:bg-gray-700 focus:ring-2 focus:ring-offset-2 focus:ring-gray-500'
                        }
                        ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                        transition-colors duration-200
                      `}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {action.label}
                    </button>
                  );
                })}
              </div>

              {/* Report Bug Button */}
              <div className="mt-4">
                <button
                  onClick={this.handleReportBug}
                  className="w-full flex justify-center items-center px-4 py-2 border border-border rounded-md shadow-sm text-sm font-medium text-foreground bg-card hover:bg-muted/50 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Fehler melden
                </button>
              </div>

              {/* Error Details (Collapsible) */}
              {showDetails && this.state.error && (
                <div className="mt-6">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      Technische Details anzeigen
                    </summary>
                    <div className="mt-2 p-3 bg-muted rounded-md text-xs font-mono text-foreground overflow-auto max-h-40">
                      <div className="mb-2">
                        <strong>Nachricht:</strong> {this.state.error.message}
                      </div>
                      <div className="mb-2">
                        <strong>Stack:</strong>
                        <pre className="whitespace-pre-wrap">{this.state.error.stack}</pre>
                      </div>
                      {this.state.errorInfo?.componentStack && (
                        <div>
                          <strong>Component Stack:</strong>
                          <pre className="whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Retry Count Display */}
              {this.state.retryCount > 0 && (
                <div className="mt-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Versuche: {this.state.retryCount}/3
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </EnhancedErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};

// Hook for error handling in functional components
export const useErrorHandler = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const handleError = React.useCallback((error: Error) => {
    console.error('Manual error caught:', error);
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { handleError, resetError };
};

export default EnhancedErrorBoundary;