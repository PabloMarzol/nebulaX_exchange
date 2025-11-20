/**
 * RetryHandler
 *
 * Implements retry logic with exponential backoff for transient failures.
 *
 * Features:
 * - Exponential backoff with jitter
 * - Configurable max retries
 * - Configurable base delay and max delay
 * - Retry only on specific error types
 * - Timeout support
 */

export interface RetryConfig {
  maxRetries: number; // Maximum number of retry attempts
  baseDelay: number; // Initial delay in ms
  maxDelay: number; // Maximum delay in ms
  factor: number; // Exponential backoff factor (e.g., 2 for doubling)
  jitter: boolean; // Add randomness to delay to prevent thundering herd
  timeout?: number; // Optional timeout for entire operation (ms)
  retryableErrors?: string[]; // List of error names/codes that should trigger retry
}

export interface RetryStats {
  attempts: number;
  totalRetries: number;
  lastError: Error | null;
  lastAttemptTime: number | null;
}

/**
 * Determine if an error is retryable
 */
function isRetryableError(error: any, retryableErrors?: string[]): boolean {
  if (!retryableErrors || retryableErrors.length === 0) {
    // Default retryable errors
    return (
      error.code === 'ECONNRESET' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'EAI_AGAIN' ||
      error.message?.includes('timeout') ||
      error.message?.includes('network') ||
      error.message?.includes('ECONNRESET') ||
      error.statusCode === 429 || // Rate limit
      error.statusCode === 502 || // Bad gateway
      error.statusCode === 503 || // Service unavailable
      error.statusCode === 504 // Gateway timeout
    );
  }

  // Check against custom retryable errors
  return (
    retryableErrors.includes(error.name) ||
    retryableErrors.includes(error.code) ||
    retryableErrors.some((pattern) => error.message?.includes(pattern))
  );
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateDelay(attempt: number, config: RetryConfig): number {
  // Calculate exponential delay
  let delay = Math.min(config.baseDelay * Math.pow(config.factor, attempt), config.maxDelay);

  // Add jitter if enabled (randomness between 0-100% of calculated delay)
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5);
  }

  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * RetryHandler class
 *
 * Provides retry logic with exponential backoff for operations.
 */
export class RetryHandler {
  private totalRetries: number = 0;
  private lastError: Error | null = null;
  private lastAttemptTime: number | null = null;

  constructor(private config: RetryConfig) {
    console.log(`[RetryHandler] Initialized with config:`, config);
  }

  /**
   * Execute a function with retry logic
   */
  async execute<T>(fn: () => Promise<T>, context?: string): Promise<T> {
    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      this.lastAttemptTime = Date.now();

      // Check timeout
      if (this.config.timeout && Date.now() - startTime > this.config.timeout) {
        const timeoutError = new Error(
          `Operation timed out after ${this.config.timeout}ms (${attempt} attempts)`
        );
        timeoutError.name = 'RetryTimeoutError';
        throw timeoutError;
      }

      try {
        const result = await fn();

        if (attempt > 0) {
          console.log(
            `[RetryHandler] ${context || 'Operation'} succeeded after ${attempt} retries`
          );
        }

        return result;
      } catch (error: any) {
        lastError = error;
        this.lastError = error;

        // Check if error is retryable
        if (!isRetryableError(error, this.config.retryableErrors)) {
          console.log(
            `[RetryHandler] ${context || 'Operation'} failed with non-retryable error:`,
            error.message
          );
          throw error;
        }

        // Check if we've exhausted retries
        if (attempt >= this.config.maxRetries) {
          console.log(
            `[RetryHandler] ${context || 'Operation'} failed after ${this.config.maxRetries} retries:`,
            error.message
          );
          throw error;
        }

        // Calculate delay and wait
        const delay = calculateDelay(attempt, this.config);
        console.log(
          `[RetryHandler] ${context || 'Operation'} failed (attempt ${attempt + 1}/${
            this.config.maxRetries + 1
          }). Retrying in ${delay}ms... Error: ${error.message}`
        );

        this.totalRetries++;
        await sleep(delay);
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError!;
  }

  /**
   * Get retry statistics
   */
  getStats(): RetryStats {
    return {
      attempts: this.config.maxRetries + 1,
      totalRetries: this.totalRetries,
      lastError: this.lastError,
      lastAttemptTime: this.lastAttemptTime,
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.totalRetries = 0;
    this.lastError = null;
    this.lastAttemptTime = null;
  }
}

/**
 * Create a retry handler with default config
 */
export function createRetryHandler(config?: Partial<RetryConfig>): RetryHandler {
  const defaultConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
    factor: 2, // Double each time
    jitter: true,
  };

  return new RetryHandler({ ...defaultConfig, ...config });
}

/**
 * Standalone retry function with exponential backoff
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('https://api.example.com'),
 *   { maxRetries: 5, baseDelay: 2000 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
  context?: string
): Promise<T> {
  const handler = createRetryHandler(config);
  return handler.execute(fn, context);
}
