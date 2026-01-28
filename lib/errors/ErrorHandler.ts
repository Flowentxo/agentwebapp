/**
 * CENTRALIZED ERROR HANDLING SYSTEM
 * 
 * Provides comprehensive error handling, logging, and user-friendly error messages
 * for the entire application.
 */

import { logger } from '@/lib/logger';

export interface AppError extends Error {
  code: string;
  statusCode: number;
  context?: Record<string, any>;
  isOperational?: boolean;
}

export class SystemError extends Error implements AppError {
  code: string;
  statusCode: number;
  context?: Record<string, any>;
  isOperational: boolean;

  constructor(
    message: string,
    code: string = 'SYSTEM_ERROR',
    statusCode: number = 500,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends SystemError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', 400, context);
  }
}

export class AuthenticationError extends SystemError {
  constructor(message: string = 'Authentication required', context?: Record<string, any>) {
    super(message, 'AUTHENTICATION_ERROR', 401, context);
  }
}

export class AuthorizationError extends SystemError {
  constructor(message: string = 'Insufficient permissions', context?: Record<string, any>) {
    super(message, 'AUTHORIZATION_ERROR', 403, context);
  }
}

export class NotFoundError extends SystemError {
  constructor(message: string = 'Resource not found', context?: Record<string, any>) {
    super(message, 'NOT_FOUND', 404, context);
  }
}

export class ConflictError extends SystemError {
  constructor(message: string = 'Resource conflict', context?: Record<string, any>) {
    super(message, 'CONFLICT', 409, context);
  }
}

export class RateLimitError extends SystemError {
  constructor(message: string = 'Rate limit exceeded', context?: Record<string, any>) {
    super(message, 'RATE_LIMIT', 429, context);
  }
}

export class NetworkError extends SystemError {
  constructor(message: string = 'Network request failed', context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', 502, context);
  }
}

export class DatabaseError extends SystemError {
  constructor(message: string = 'Database operation failed', context?: Record<string, any>) {
    super(message, 'DATABASE_ERROR', 500, context);
  }
}

export class ExternalServiceError extends SystemError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'EXTERNAL_SERVICE_ERROR', 502, context);
  }
}

export class ConfigurationError extends SystemError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 'CONFIGURATION_ERROR', 500, context);
  }
}

/**
 * Error Handler Class
 */
export class ErrorHandler {
  private static instance: ErrorHandler;

  private constructor() {}

  public static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and log an error
   */
  public handle(error: Error | AppError, context?: string): void {
    const isAppError = 'code' in error;
    const appError = isAppError ? error as AppError : this.wrapError(error);

    // Log the error
    this.logError(appError, context);

    // Store error for monitoring
    this.trackError(appError);

    // Notify external services if needed
    this.notifyExternalServices(appError);
  }

  /**
   * Create a user-friendly error message
   */
  public createUserMessage(error: Error | AppError): string {
    const appError = 'code' in error ? error as AppError : this.wrapError(error);

    switch (appError.code) {
      case 'VALIDATION_ERROR':
        return 'Bitte überprüfen Sie Ihre Eingaben.';
      case 'AUTHENTICATION_ERROR':
        return 'Bitte melden Sie sich an, um fortzufahren.';
      case 'AUTHORIZATION_ERROR':
        return 'Sie haben nicht die erforderlichen Berechtigungen.';
      case 'NOT_FOUND':
        return 'Die angeforderte Ressource wurde nicht gefunden.';
      case 'CONFLICT':
        return 'Es gab einen Konflikt mit der angeforderten Aktion.';
      case 'RATE_LIMIT':
        return 'Zu viele Anfragen. Bitte versuchen Sie es später erneut.';
      case 'NETWORK_ERROR':
        return 'Netzwerkfehler aufgetreten. Bitte überprüfen Sie Ihre Internetverbindung.';
      case 'DATABASE_ERROR':
        return 'Ein Datenbankfehler ist aufgetreten. Unser Team wurde benachrichtigt.';
      case 'EXTERNAL_SERVICE_ERROR':
        return 'Ein externer Dienst ist temporär nicht verfügbar.';
      case 'CONFIGURATION_ERROR':
        return 'Ein Konfigurationsfehler ist aufgetreten.';
      case 'SYSTEM_ERROR':
      default:
        return 'Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut.';
    }
  }

  /**
   * Check if error should be logged
   */
  private shouldLogError(error: AppError): boolean {
    // Don't log authentication errors in production to avoid noise
    if (error.code === 'AUTHENTICATION_ERROR' && process.env.NODE_ENV === 'production') {
      return false;
    }

    // Always log system errors and configuration errors
    if (error.code === 'SYSTEM_ERROR' || error.code === 'CONFIGURATION_ERROR') {
      return true;
    }

    // Log operational errors
    return error.isOperational !== false;
  }

  /**
   * Log error with context
   */
  private logError(error: AppError, context?: string): void {
    if (!this.shouldLogError(error)) {
      return;
    }

    const logData = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      errorContext: error.context,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      operationContext: context
    };

    // Use appropriate log level based on error severity
    if (error.statusCode >= 500) {
      logger.error('System Error', logData);
    } else if (error.statusCode >= 400) {
      logger.warn('Client Error', logData);
    } else {
      logger.info('Error', logData);
    }
  }

  /**
   * Track error for monitoring
   */
  private trackError(error: AppError): void {
    // In production, send to monitoring service (e.g., Sentry)
    if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
      // Server-side error tracking
      try {
        // Import dynamically to avoid bundling issues
        import('@sentry/node').then(Sentry => {
          Sentry.captureException(error);
        }).catch(() => {
          // Sentry not available, continue
        });
      } catch {
        // Silently fail if tracking is not available
      }
    } else if (typeof window !== 'undefined') {
      // Client-side error tracking
      try {
        import('@sentry/browser').then(Sentry => {
          Sentry.captureException(error);
        }).catch(() => {
          // Sentry not available, continue
        });
      } catch {
        // Silently fail if tracking is not available
      }
    }
  }

  /**
   * Notify external services if needed
   */
  private notifyExternalServices(error: AppError): void {
    // Critical system errors might need immediate notification
    if (error.code === 'DATABASE_ERROR' || error.code === 'CONFIGURATION_ERROR') {
      // Could implement Slack/email notifications here
      logger.warn('Critical Error Detected', {
        error: error.message,
        code: error.code,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Wrap a regular Error into an AppError
   */
  private wrapError(error: Error): AppError {
    return new SystemError(
      error.message,
      'WRAPPED_ERROR',
      500,
      { originalError: error.name, stack: error.stack }
    );
  }

  /**
   * Async error wrapper for promise handling
   */
  public async handleAsync<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      this.handle(error as Error, context);
      throw error;
    }
  }

  /**
   * Sync error wrapper for function handling
   */
  public handleSync<T>(
    operation: () => T,
    context?: string
  ): T {
    try {
      return operation();
    } catch (error) {
      this.handle(error as Error, context);
      throw error;
    }
  }

  /**
   * Create error boundary for React components
   */
  public createErrorBoundary() {
    return {
      componentDidCatch: (error: Error, errorInfo: any) => {
        this.handle(error, 'React Component Error');
        console.error('React Error Boundary:', error, errorInfo);
      }
    };
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

/**
 * Utility functions for common error scenarios
 */
export const createValidationError = (message: string, field?: string, value?: any) => {
  return new ValidationError(message, { field, value });
};

export const createNetworkError = (url: string, status?: number) => {
  return new NetworkError(`Network request failed for ${url}`, { url, status });
};

export const createDatabaseError = (operation: string, details?: any) => {
  return new DatabaseError(`Database operation failed: ${operation}`, { operation, details });
};

export const createExternalServiceError = (service: string, operation: string) => {
  return new ExternalServiceError(`External service error: ${service} - ${operation}`, { service, operation });
};