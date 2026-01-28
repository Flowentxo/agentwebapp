/**
 * Centralized Winston Logger Module
 * Provides consistent, structured logging across the application
 * Replaces console.log with proper log levels and file output
 */

import winston from 'winston';

// Determine log level based on environment
const logLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug');

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ level, message, timestamp, namespace, ...meta }) => {
    const ns = namespace ? `[${namespace}]` : '';
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level} ${ns} ${message}${metaStr}`;
  })
);

// JSON format for file output (production-friendly)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [
  // Console transport - always enabled
  new winston.transports.Console({
    format: consoleFormat,
  }),
];

// Add file transports only in Node.js environment (not Edge runtime)
if (typeof window === 'undefined' && process.env.NEXT_RUNTIME !== 'edge') {
  try {
    transports.push(
      // Error log file
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      }),
      // Combined log file
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: fileFormat,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
      })
    );
  } catch {
    // File transports may fail in some environments, continue without them
  }
}

// Create the base winston logger
const winstonLogger = winston.createLogger({
  level: logLevel,
  defaultMeta: { service: 'sintra-ai' },
  transports,
  // Don't exit on handled exceptions
  exitOnError: false,
});

/**
 * Namespaced Logger class for consistent module-level logging
 */
class Logger {
  private namespace: string;

  constructor(namespace: string = '') {
    this.namespace = namespace;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.debug(message, { namespace: this.namespace, ...meta });
  }

  info(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.info(message, { namespace: this.namespace, ...meta });
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.warn(message, { namespace: this.namespace, ...meta });
  }

  error(message: string, meta?: Record<string, unknown>): void {
    winstonLogger.error(message, { namespace: this.namespace, ...meta });
  }

  /**
   * Log with custom level
   */
  log(level: string, message: string, meta?: Record<string, unknown>): void {
    winstonLogger.log(level, message, { namespace: this.namespace, ...meta });
  }

  /**
   * Create a child logger with additional namespace
   */
  child(childNamespace: string): Logger {
    const newNamespace = this.namespace
      ? `${this.namespace}:${childNamespace}`
      : childNamespace;
    return new Logger(newNamespace);
  }
}

/**
 * Factory function to create a namespaced logger
 * @param namespace - The namespace/module name for the logger
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

// Default logger instance
export const logger = new Logger();

// Export the raw winston logger for advanced use cases
export const rawLogger = winstonLogger;

// Export Logger class for type annotations
export { Logger };

export default logger;
