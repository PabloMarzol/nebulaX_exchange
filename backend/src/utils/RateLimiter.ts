/**
 * Simple rate limiter with exponential backoff
 */
export class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelay: number;
  private retryDelays = [1000, 2000, 4000, 8000]; // Exponential backoff delays

  constructor(minDelayMs: number = 200) {
    this.minDelay = minDelayMs;
  }

  /**
   * Execute a request with rate limiting
   */
  async execute<T>(fn: () => Promise<T>, retryCount = 0): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          // Enforce minimum delay between requests
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          if (timeSinceLastRequest < this.minDelay) {
            await this.sleep(this.minDelay - timeSinceLastRequest);
          }

          this.lastRequestTime = Date.now();
          const result = await fn();
          resolve(result);
        } catch (error: any) {
          // Handle 429 rate limit errors with exponential backoff
          if (error?.response?.status === 429 && retryCount < this.retryDelays.length) {
            const delay = this.retryDelays[retryCount];
            console.warn(`[RateLimiter] Rate limit hit, retrying in ${delay}ms (attempt ${retryCount + 1})`);
            await this.sleep(delay);

            // Retry the request
            try {
              const result = await this.execute(fn, retryCount + 1);
              resolve(result);
            } catch (retryError) {
              reject(retryError);
            }
          } else {
            reject(error);
          }
        }
      });

      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const fn = this.queue.shift();
      if (fn) {
        await fn();
      }
    }

    this.processing = false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the queue
   */
  clear() {
    this.queue = [];
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}
