/**
 * AI Provider Error Handler with Retry Logic
 * Handles rate limits, network errors, and API failures with exponential backoff
 * Supports both OpenAI and Anthropic
 */

export class AIError extends Error {
  constructor(
    message: string,
    public type: 'rate_limit' | 'auth' | 'network' | 'validation' | 'unknown',
    public statusCode?: number,
    public retryAfter?: number,
    public provider?: 'openai' | 'anthropic'
  ) {
    super(message);
    this.name = 'AIError';
  }
}

// Backwards compatibility
export class OpenAIError extends AIError {
  constructor(
    message: string,
    type: 'rate_limit' | 'auth' | 'network' | 'validation' | 'unknown',
    statusCode?: number,
    retryAfter?: number
  ) {
    super(message, type, statusCode, retryAfter, 'openai');
    this.name = 'OpenAIError';
  }
}

export class AnthropicError extends AIError {
  constructor(
    message: string,
    type: 'rate_limit' | 'auth' | 'network' | 'validation' | 'unknown',
    statusCode?: number,
    retryAfter?: number
  ) {
    super(message, type, statusCode, retryAfter, 'anthropic');
    this.name = 'AnthropicError';
  }
}

interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

const DEFAULT_RETRY_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Classify OpenAI API errors
 */
export function classifyOpenAIError(error: unknown): OpenAIError {
  if (error instanceof OpenAIError) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new OpenAIError(
      'Network error: Unable to reach OpenAI API',
      'network'
    );
  }

  // Handle OpenAI SDK errors
  if (typeof error === 'object' && error !== null) {
    const err = error as any;

    // Rate limit error (429)
    if (err.status === 429 || err.code === 'rate_limit_exceeded') {
      const retryAfter = err.headers?.['retry-after']
        ? parseInt(err.headers['retry-after']) * 1000
        : 5000;

      return new OpenAIError(
        'Rate limit exceeded. Please try again later.',
        'rate_limit',
        429,
        retryAfter
      );
    }

    // Authentication error (401)
    if (err.status === 401 || err.code === 'invalid_api_key') {
      return new OpenAIError(
        'Invalid OpenAI API key. Please check your configuration.',
        'auth',
        401
      );
    }

    // Validation error (400)
    if (err.status === 400 || err.code === 'invalid_request_error') {
      return new OpenAIError(
        err.message || 'Invalid request to OpenAI API',
        'validation',
        400
      );
    }

    // Server error (500+)
    if (err.status >= 500) {
      return new OpenAIError(
        'OpenAI API server error. Please try again later.',
        'network',
        err.status
      );
    }
  }

  // Unknown error
  return new OpenAIError(
    error instanceof Error ? error.message : 'Unknown error occurred',
    'unknown'
  );
}

/**
 * Classify Anthropic API errors
 */
export function classifyAnthropicError(error: unknown): AnthropicError {
  if (error instanceof AnthropicError) {
    return error;
  }

  // Handle fetch/network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return new AnthropicError(
      'Network error: Unable to reach Anthropic API',
      'network'
    );
  }

  // Handle Anthropic SDK errors
  if (typeof error === 'object' && error !== null) {
    const err = error as any;

    // Rate limit error (429)
    if (err.status === 429 || err.type === 'rate_limit_error') {
      const retryAfter = err.headers?.['retry-after']
        ? parseInt(err.headers['retry-after']) * 1000
        : err.error?.retry_after
        ? err.error.retry_after * 1000
        : 5000;

      return new AnthropicError(
        'Rate limit exceeded. Please try again later.',
        'rate_limit',
        429,
        retryAfter
      );
    }

    // Authentication error (401)
    if (err.status === 401 || err.type === 'authentication_error') {
      return new AnthropicError(
        'Invalid Anthropic API key. Please check your configuration.',
        'auth',
        401
      );
    }

    // Validation error (400)
    if (err.status === 400 || err.type === 'invalid_request_error') {
      return new AnthropicError(
        err.message || 'Invalid request to Anthropic API',
        'validation',
        400
      );
    }

    // Overloaded error (529)
    if (err.status === 529 || err.type === 'overloaded_error') {
      return new AnthropicError(
        'Anthropic API is temporarily overloaded. Please try again.',
        'rate_limit',
        529,
        10000 // Wait 10 seconds
      );
    }

    // Server error (500+)
    if (err.status >= 500) {
      return new AnthropicError(
        'Anthropic API server error. Please try again later.',
        'network',
        err.status
      );
    }
  }

  // Unknown error
  return new AnthropicError(
    error instanceof Error ? error.message : 'Unknown error occurred',
    'unknown'
  );
}

/**
 * Calculate exponential backoff delay
 */
function calculateBackoff(
  attempt: number,
  options: Required<RetryOptions>
): number {
  const delay = Math.min(
    options.initialDelay * Math.pow(options.backoffMultiplier, attempt),
    options.maxDelay
  );

  // Add jitter (±25%) to prevent thundering herd
  const jitter = delay * 0.25 * (Math.random() * 2 - 1);
  return Math.floor(delay + jitter);
}

/**
 * Wait for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: OpenAIError): boolean {
  return (
    error.type === 'rate_limit' ||
    error.type === 'network' ||
    (error.type === 'unknown' && !error.statusCode)
  );
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: OpenAIError | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const classifiedError = classifyOpenAIError(error);
      lastError = classifiedError;

      // Don't retry on auth or validation errors
      if (!isRetryableError(classifiedError)) {
        throw classifiedError;
      }

      // Don't retry if max attempts reached
      if (attempt === opts.maxRetries) {
        throw classifiedError;
      }

      // Calculate delay (use retry-after header if available)
      const delay =
        classifiedError.retryAfter || calculateBackoff(attempt, opts);

      console.log(
        `[RETRY] Attempt ${attempt + 1}/${opts.maxRetries} failed. Retrying in ${delay}ms...`,
        { error: classifiedError.message, type: classifiedError.type }
      );

      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new OpenAIError('Retry failed', 'unknown');
}

/**
 * User-friendly error messages for frontend
 */
export function getUserFriendlyMessage(error: OpenAIError): string {
  switch (error.type) {
    case 'rate_limit':
      return 'Too many requests. Please wait a moment and try again.';
    case 'auth':
      return 'Authentication error. Please contact support.';
    case 'network':
      return 'Connection error. Please check your internet and try again.';
    case 'validation':
      return 'Invalid request. Please check your input and try again.';
    default:
      return 'Something went wrong. Please try again later.';
  }
}
