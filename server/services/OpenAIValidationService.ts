import OpenAI from 'openai'
import { Logger } from '../utils/logger'

const logger = new Logger('OpenAIValidationService')

export interface ValidationResult {
  isValid: boolean
  error?: string
  models?: string[]
  keyPreview?: string
}

export class OpenAIValidationService {
  private static instance: OpenAIValidationService
  private apiKey: string | undefined
  private client: OpenAI | undefined
  private lastValidation: ValidationResult | null = null
  private validationTimestamp: number = 0
  private readonly CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

  private constructor() {
    this.apiKey = process.env.OPENAI_API_KEY
    if (this.apiKey) {
      this.client = new OpenAI({ apiKey: this.apiKey })
    }
  }

  public static getInstance(): OpenAIValidationService {
    if (!OpenAIValidationService.instance) {
      OpenAIValidationService.instance = new OpenAIValidationService()
    }
    return OpenAIValidationService.instance
  }

  /**
   * Validate the OpenAI API key
   * Uses cached result if validation was done recently
   */
  public async validateApiKey(forceRefresh: boolean = false): Promise<ValidationResult> {
    // Return cached result if still valid
    const now = Date.now()
    if (!forceRefresh && this.lastValidation && (now - this.validationTimestamp) < this.CACHE_DURATION) {
      logger.info('Returning cached validation result')
      return this.lastValidation
    }

    // Check if API key exists
    if (!this.apiKey) {
      const result: ValidationResult = {
        isValid: false,
        error: 'OpenAI API key not found in environment variables'
      }
      this.lastValidation = result
      this.validationTimestamp = now
      logger.warn('API key not found')
      return result
    }

    // Validate key format
    if (!this.apiKey.startsWith('sk-')) {
      const result: ValidationResult = {
        isValid: false,
        error: 'Invalid API key format (must start with sk-)',
        keyPreview: this.getKeyPreview()
      }
      this.lastValidation = result
      this.validationTimestamp = now
      logger.warn('Invalid API key format')
      return result
    }

    // Test API key with actual request
    try {
      logger.info('Testing API key with models endpoint...')
      const response = await this.client!.models.list()
      const models = response.data.map(m => m.id).slice(0, 5) // First 5 models

      const result: ValidationResult = {
        isValid: true,
        models,
        keyPreview: this.getKeyPreview()
      }
      this.lastValidation = result
      this.validationTimestamp = now
      logger.info(`✅ API key validated successfully. Models: ${models.join(', ')}`)
      return result
    } catch (error: any) {
      const result: ValidationResult = {
        isValid: false,
        error: error.message || 'Failed to validate API key',
        keyPreview: this.getKeyPreview()
      }
      this.lastValidation = result
      this.validationTimestamp = now
      logger.error('API key validation failed:', error.message)
      return result
    }
  }

  /**
   * Get OpenAI client (only if validated)
   */
  public async getClient(): Promise<OpenAI | null> {
    const validation = await this.validateApiKey()
    if (!validation.isValid) {
      logger.warn('Cannot provide client - API key not valid')
      return null
    }
    return this.client || null
  }

  /**
   * Get a preview of the API key (first 8 and last 4 characters)
   */
  private getKeyPreview(): string {
    if (!this.apiKey) return 'none'
    const start = this.apiKey.substring(0, 8)
    const end = this.apiKey.substring(this.apiKey.length - 4)
    return `${start}...${end}`
  }

  /**
   * Update API key at runtime
   */
  public updateApiKey(newKey: string): void {
    this.apiKey = newKey
    this.client = new OpenAI({ apiKey: newKey })
    this.lastValidation = null
    this.validationTimestamp = 0
    logger.info('API key updated, validation cache cleared')
  }

  /**
   * Get current validation status without making a new request
   */
  public getLastValidation(): ValidationResult | null {
    return this.lastValidation
  }

  /**
   * Check if the cached validation is still fresh
   */
  public isCachedValidationFresh(): boolean {
    const now = Date.now()
    return this.lastValidation !== null && (now - this.validationTimestamp) < this.CACHE_DURATION
  }
}

export default OpenAIValidationService
