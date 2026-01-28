import winston from 'winston'

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
})

/**
 * Logger class for namespaced logging
 */
export class Logger {
  private namespace: string

  constructor(namespace: string) {
    this.namespace = namespace
  }

  private formatMessage(message: string): string {
    return `[${this.namespace}] ${message}`
  }

  info(message: string, ...meta: any[]): void {
    logger.info(this.formatMessage(message), ...meta)
  }

  warn(message: string, ...meta: any[]): void {
    logger.warn(this.formatMessage(message), ...meta)
  }

  error(message: string, ...meta: any[]): void {
    logger.error(this.formatMessage(message), ...meta)
  }

  debug(message: string, ...meta: any[]): void {
    logger.debug(this.formatMessage(message), ...meta)
  }
}
