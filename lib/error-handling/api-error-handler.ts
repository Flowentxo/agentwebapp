/**
 * 🔌 API Error Handler
 * Comprehensive server-side error handling with German messages
 */

import { NextRequest, NextResponse } from 'next/server';

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  CONFLICT_ERROR = 'CONFLICT_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE_ERROR = 'SERVICE_UNAVAILABLE_ERROR',
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

// German error messages
const ERROR_MESSAGES = {
  [ErrorType.VALIDATION_ERROR]: {
    title: 'Validierungsfehler',
    message: 'Die bereitgestellten Daten sind ungültig.',
    suggestion: 'Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut.',
  },
  [ErrorType.AUTHENTICATION_ERROR]: {
    title: 'Authentifizierung fehlgeschlagen',
    message: 'Sie müssen angemeldet sein, um auf diese Ressource zuzugreifen.',
    suggestion: 'Bitte melden Sie sich an und versuchen Sie es erneut.',
  },
  [ErrorType.AUTHORIZATION_ERROR]: {
    title: 'Zugriff verweigert',
    message: 'Sie haben keine Berechtigung für diese Aktion.',
    suggestion: 'Kontaktieren Sie Ihren Administrator für weitere Unterstützung.',
  },
  [ErrorType.NOT_FOUND_ERROR]: {
    title: 'Ressource nicht gefunden',
    message: 'Die angeforderte Ressource konnte nicht gefunden werden.',
    suggestion: 'Überprüfen Sie die URL oder navigieren Sie zurück zur Hauptseite.',
  },
  [ErrorType.CONFLICT_ERROR]: {
    title: 'Konflikt',
    message: 'Ein Konflikt ist mit dem aktuellen Zustand der Ressource aufgetreten.',
    suggestion: 'Versuchen Sie es später erneut oder aktualisieren Sie die Seite.',
  },
  [ErrorType.RATE_LIMIT_ERROR]: {
    title: 'Rate Limit überschritten',
    message: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
    suggestion: 'Versuchen Sie es in ein paar Minuten erneut.',
  },
  [ErrorType.EXTERNAL_API_ERROR]: {
    title: 'Externer Service-Fehler',
    message: 'Ein externer Service konnte nicht erreicht werden.',
    suggestion: 'Versuchen Sie es später erneut. Falls das Problem bestehen bleibt, kontaktieren Sie den Support.',
  },
  [ErrorType.DATABASE_ERROR]: {
    title: 'Datenbankfehler',
    message: 'Ein Problem mit der Datenbankverbindung ist aufgetreten.',
    suggestion: 'Versuchen Sie es später erneut. Falls das Problem bestehen bleibt, kontaktieren Sie den Support.',
  },
  [ErrorType.NETWORK_ERROR]: {
    title: 'Netzwerkfehler',
    message: 'Ein Netzwerkproblem ist aufgetreten.',
    suggestion: 'Überprüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.',
  },
  [ErrorType.TIMEOUT_ERROR]: {
    title: 'Zeitüberschreitung',
    message: 'Die Anfrage hat zu lange gedauert.',
    suggestion: 'Versuchen Sie es mit einer einfacheren Anfrage oder später erneut.',
  },
  [ErrorType.INTERNAL_SERVER_ERROR]: {
    title: 'Interner Serverfehler',
    message: 'Ein unerwarteter Fehler ist aufgetreten.',
    suggestion: 'Versuchen Sie es später erneut. Falls das Problem bestehen bleibt, kontaktieren Sie den Support.',
  },
  [ErrorType.SERVICE_UNAVAILABLE_ERROR]: {
    title: 'Service nicht verfügbar',
    message: 'Der Service ist momentan nicht verfügbar.',
    suggestion: 'Versuchen Sie es später erneut. Wir arbeiten daran, den Service schnellstmöglich wiederherzustellen.',
  },
};

// Custom error class
export class APIError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly statusCode: number;
  public readonly suggestion?: string;
  public readonly errorId: string;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly context?: Record<string, any>;

  constructor(
    type: ErrorType,
    message?: string,
    options: {
      statusCode?: number;
      severity?: ErrorSeverity;
      suggestion?: string;
      requestId?: string;
      context?: Record<string, any>;
      cause?: Error;
    } = {}
  ) {
    const errorInfo = ERROR_MESSAGES[type];
    const fullMessage = message || errorInfo.message;
    
    super(fullMessage);
    this.name = 'APIError';
    this.type = type;
    this.severity = options.severity || this.getDefaultSeverity(type);
    this.statusCode = options.statusCode || this.getDefaultStatusCode(type);
    this.suggestion = options.suggestion || errorInfo.suggestion;
    this.errorId = this.generateErrorId();
    this.timestamp = new Date().toISOString();
    this.requestId = options.requestId;
    this.context = options.context;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }

    // If there's a cause error, log it
    if (options.cause) {
      console.error('Caused by:', options.cause);
    }
  }

  private getDefaultSeverity(type: ErrorType): ErrorSeverity {
    switch (type) {
      case ErrorType.INTERNAL_SERVER_ERROR:
      case ErrorType.SERVICE_UNAVAILABLE_ERROR:
      case ErrorType.DATABASE_ERROR:
        return ErrorSeverity.CRITICAL;
      case ErrorType.AUTHENTICATION_ERROR:
      case ErrorType.AUTHORIZATION_ERROR:
      case ErrorType.EXTERNAL_API_ERROR:
        return ErrorSeverity.HIGH;
      case ErrorType.RATE_LIMIT_ERROR:
      case ErrorType.TIMEOUT_ERROR:
      case ErrorType.NETWORK_ERROR:
        return ErrorSeverity.MEDIUM;
      default:
        return ErrorSeverity.LOW;
    }
  }

  private getDefaultStatusCode(type: ErrorType): number {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return 400;
      case ErrorType.AUTHENTICATION_ERROR:
        return 401;
      case ErrorType.AUTHORIZATION_ERROR:
        return 403;
      case ErrorType.NOT_FOUND_ERROR:
        return 404;
      case ErrorType.CONFLICT_ERROR:
        return 409;
      case ErrorType.RATE_LIMIT_ERROR:
        return 429;
      case ErrorType.EXTERNAL_API_ERROR:
      case ErrorType.DATABASE_ERROR:
      case ErrorType.NETWORK_ERROR:
      case ErrorType.TIMEOUT_ERROR:
      case ErrorType.INTERNAL_SERVER_ERROR:
        return 500;
      case ErrorType.SERVICE_UNAVAILABLE_ERROR:
        return 503;
      default:
        return 500;
    }
  }

  private generateErrorId(): string {
    return `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  toJSON() {
    return {
      error: {
        id: this.errorId,
        type: this.type,
        title: ERROR_MESSAGES[this.type].title,
        message: this.message,
        suggestion: this.suggestion,
        severity: this.severity,
        timestamp: this.timestamp,
        requestId: this.requestId,
        context: this.context,
      },
    };
  }
}

// Error factory functions
export const createValidationError = (message: string, context?: Record<string, any>) =>
  new APIError(ErrorType.VALIDATION_ERROR, message, { context });

export const createAuthenticationError = (message?: string, context?: Record<string, any>) =>
  new APIError(ErrorType.AUTHENTICATION_ERROR, message, { context });

export const createAuthorizationError = (message?: string, context?: Record<string, any>) =>
  new APIError(ErrorType.AUTHORIZATION_ERROR, message, { context });

export const createNotFoundError = (resource: string, context?: Record<string, any>) =>
  new APIError(ErrorType.NOT_FOUND_ERROR, `${resource} nicht gefunden`, { context });

export const createConflictError = (message: string, context?: Record<string, any>) =>
  new APIError(ErrorType.CONFLICT_ERROR, message, { context });

export const createRateLimitError = (message?: string, context?: Record<string, any>) =>
  new APIError(ErrorType.RATE_LIMIT_ERROR, message, { context });

export const createExternalAPIError = (service: string, originalError?: Error, context?: Record<string, any>) =>
  new APIError(
    ErrorType.EXTERNAL_API_ERROR,
    `Fehler beim Zugriff auf ${service}`,
    { 
      context: { service, ...context },
      cause: originalError 
    }
  );

export const createDatabaseError = (operation: string, originalError?: Error, context?: Record<string, any>) =>
  new APIError(
    ErrorType.DATABASE_ERROR,
    `Datenbankfehler bei ${operation}`,
    { 
      context: { operation, ...context },
      cause: originalError 
    }
  );

export const createNetworkError = (message?: string, context?: Record<string, any>) =>
  new APIError(ErrorType.NETWORK_ERROR, message, { context });

export const createTimeoutError = (operation: string, context?: Record<string, any>) =>
  new APIError(ErrorType.TIMEOUT_ERROR, `Zeitüberschreitung bei ${operation}`, { context });

export const createInternalServerError = (message?: string, context?: Record<string, any>) =>
  new APIError(ErrorType.INTERNAL_SERVER_ERROR, message, { context });

export const createServiceUnavailableError = (service: string, context?: Record<string, any>) =>
  new APIError(ErrorType.SERVICE_UNAVAILABLE_ERROR, `${service} ist nicht verfügbar`, { context });

// Error handler middleware
export const handleAPIError = (
  error: unknown,
  request: NextRequest,
  options: {
    includeStack?: boolean;
    logError?: boolean;
  } = {}
): NextResponse => {
  const { includeStack = false, logError = true } = options;
  
  let apiError: APIError;

  // Convert known errors to APIError
  if (error instanceof APIError) {
    apiError = error;
  } else if (error instanceof Error) {
    // Try to determine error type from the error message
    const message = error.message.toLowerCase();
    if (message.includes('validation') || message.includes('invalid')) {
      apiError = createValidationError(error.message);
    } else if (message.includes('auth') || message.includes('unauthorized')) {
      apiError = createAuthenticationError(error.message);
    } else if (message.includes('forbidden') || message.includes('permission')) {
      apiError = createAuthorizationError(error.message);
    } else if (message.includes('not found')) {
      apiError = createNotFoundError('Ressource');
    } else if (message.includes('timeout')) {
      apiError = createTimeoutError('Anfrage');
    } else {
      apiError = createInternalServerError(error.message);
    }
  } else {
    apiError = createInternalServerError('Ein unbekannter Fehler ist aufgetreten');
  }

  // Add request context
  apiError.context = {
    ...apiError.context,
    method: request.method,
    url: request.url,
    userAgent: request.headers.get('user-agent'),
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
  };

  // Log error if enabled
  if (logError) {
    console.error('API Error:', {
      errorId: apiError.errorId,
      type: apiError.type,
      message: apiError.message,
      severity: apiError.severity,
      statusCode: apiError.statusCode,
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      timestamp: apiError.timestamp,
      context: apiError.context,
      stack: includeStack ? apiError.stack : undefined,
    });
  }

  // Return error response
  const response = NextResponse.json(apiError.toJSON(), {
    status: apiError.statusCode,
  });

  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  // Add error tracking headers
  response.headers.set('X-Error-ID', apiError.errorId);
  response.headers.set('X-Error-Type', apiError.type);
  response.headers.set('X-Error-Severity', apiError.severity);

  return response;
};

// Async error handler wrapper
export const withErrorHandling = (
  handler: (request: NextRequest) => Promise<NextResponse>,
  options?: Parameters<typeof handleAPIError>[2]
) => {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      return await handler(request);
    } catch (error) {
      return handleAPIError(error, request, options);
    }
  };
};

// Validation helpers
export const validateRequired = (value: any, fieldName: string): void => {
  if (value === undefined || value === null || value === '') {
    throw createValidationError(`${fieldName} ist erforderlich`);
  }
};

export const validateEmail = (email: string): void => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw createValidationError('Ungültige E-Mail-Adresse');
  }
};

export const validateString = (value: any, fieldName: string, minLength = 0, maxLength = Infinity): void => {
  if (typeof value !== 'string') {
    throw createValidationError(`${fieldName} muss eine Zeichenkette sein`);
  }
  if (value.length < minLength) {
    throw createValidationError(`${fieldName} muss mindestens ${minLength} Zeichen lang sein`);
  }
  if (value.length > maxLength) {
    throw createValidationError(`${fieldName} darf maximal ${maxLength} Zeichen lang sein`);
  }
};

export const validateNumber = (value: any, fieldName: string, min?: number, max?: number): void => {
  const num = Number(value);
  if (isNaN(num)) {
    throw createValidationError(`${fieldName} muss eine Zahl sein`);
  }
  if (min !== undefined && num < min) {
    throw createValidationError(`${fieldName} muss größer oder gleich ${min} sein`);
  }
  if (max !== undefined && num > max) {
    throw createValidationError(`${fieldName} muss kleiner oder gleich ${max} sein`);
  }
};