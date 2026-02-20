'use client';

/**
 * 🚨 Enhanced Global Error Boundary - Apple Genius Level
 * 
 * "Großartiges Design behandelt nicht nur Erfolg - es behandelt Fehler elegant."
 * 
 * Diese Komponente fängt Fehler ab und zeigt sie auf eine schöne,
 * hilfreiche Weise an, die Benutzer sich unterstützt fühlen lässt, nicht verlassen.
 */

import { Component, ReactNode, ErrorInfo } from 'react';
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

export class ErrorBoundary extends Component<Props, State> {
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

    // Auth errors: immediate stealth redirect to /login
    const msg = error.message.toLowerCase();
    if (msg.includes('auth') || msg.includes('unauthorized') || msg.includes('token') || msg.includes('401')) {
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('token');
        document.cookie = 'sintra.sid=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'accessToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
        window.location.href = '/login';
        return;
      }
    }

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
      // Stealth mode: auth errors → blank screen while redirecting (no flash)
      const errorType = this.getErrorType();
      if (errorType === 'auth') {
        return <div style={{ minHeight: '100vh', backgroundColor: '#030712' }} />;
      }

      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const errorMessage = this.getErrorMessage();
      const recoveryActions = this.getRecoveryActions();
      const { showDetails = false } = this.props;

      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          {/* Animated Background */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative max-w-2xl w-full">
            {/* Error Card */}
            <div
              className="rounded-3xl p-12 backdrop-blur-xl border border-white/10"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              }}
            >
              {/* Icon */}
              <div className="flex justify-center mb-8">
                <div
                  className="w-24 h-24 rounded-full flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    boxShadow: '0 20px 60px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  <AlertTriangle className="h-12 w-12 text-white" />
                </div>
              </div>

              {/* Headline */}
              <h1 className="text-5xl font-bold text-white text-center mb-4">
                {errorMessage.title}
              </h1>

              <p className="text-xl text-muted-foreground text-center mb-8">
                {errorMessage.description}
              </p>

              {/* Error ID */}
              <div className="text-center mb-8">
                <p className="text-sm text-muted-foreground">
                  Fehler-ID: <code className="bg-gray-800 px-2 py-1 rounded text-xs">{this.state.errorId}</code>
                </p>
              </div>

              {/* Error Details (Development) */}
              {(process.env.NODE_ENV === 'development' || showDetails) && this.state.error && (
                <div className="mb-8 p-6 rounded-2xl bg-black/40 border border-red-500/20">
                  <h3 className="text-lg font-semibold text-red-400 mb-3">Fehler Details</h3>
                  <p className="text-sm text-red-300 font-mono mb-2">
                    {this.state.error.message}
                  </p>
                  {this.state.errorInfo && (
                    <details className="mt-4">
                      <summary className="text-sm text-muted-foreground cursor-pointer hover:text-white transition">
                        Stack Trace
                      </summary>
                      <pre className="mt-2 text-xs text-muted-foreground overflow-x-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                {recoveryActions.map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={index}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      className={`
                        px-6 py-3 rounded-2xl font-semibold text-white transition-all duration-300 hover:scale-105 border border-white/20
                        ${action.primary 
                          ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700' 
                          : 'bg-card/10 hover:bg-card/20'
                        }
                        ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <Icon className="inline-block h-4 w-4 mr-2" />
                      {action.label}
                    </button>
                  );
                })}
              </div>

              {/* Report Bug Button */}
              <div className="mt-6 text-center">
                <button
                  onClick={this.handleReportBug}
                  className="text-sm text-muted-foreground hover:text-white transition inline-flex items-center gap-1"
                >
                  <Mail className="h-3 w-3" />
                  Fehler melden
                </button>
              </div>

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
