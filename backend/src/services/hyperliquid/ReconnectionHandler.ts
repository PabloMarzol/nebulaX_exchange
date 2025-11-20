/**
 * ReconnectionHandler
 *
 * Manages automatic reconnection for WebSocket subscriptions with exponential backoff.
 * Ensures reliable real-time data flow even when Hyperliquid's WebSocket server restarts.
 */

export interface ReconnectionConfig {
  maxAttempts: number;
  baseDelay: number; // Base delay in milliseconds
  maxDelay: number; // Maximum delay in milliseconds
  factor: number; // Exponential backoff factor
}

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export interface ReconnectionCallback {
  onReconnect: () => Promise<void>;
  onFailed: (error: Error) => void;
  onStateChange?: (state: ConnectionState) => void;
}

export class ReconnectionHandler {
  private config: ReconnectionConfig;
  private callbacks: ReconnectionCallback;
  private attemptCount = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private state: ConnectionState = 'disconnected';
  private isShuttingDown = false;

  constructor(config: Partial<ReconnectionConfig>, callbacks: ReconnectionCallback) {
    this.config = {
      maxAttempts: config.maxAttempts || 10,
      baseDelay: config.baseDelay || 1000,
      maxDelay: config.maxDelay || 60000,
      factor: config.factor || 2,
    };
    this.callbacks = callbacks;
  }

  /**
   * Mark connection as established
   */
  connected(): void {
    this.attemptCount = 0;
    this.setState('connected');
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    console.log('[ReconnectionHandler] Connection established');
  }

  /**
   * Mark connection as lost and start reconnection attempts
   */
  disconnected(error?: Error): void {
    if (this.isShuttingDown) {
      return;
    }

    this.setState('disconnected');
    console.warn('[ReconnectionHandler] Connection lost', error?.message || '');

    // Start reconnection process
    this.scheduleReconnect();
  }

  /**
   * Schedule next reconnection attempt with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isShuttingDown) {
      return;
    }

    if (this.attemptCount >= this.config.maxAttempts) {
      const error = new Error(
        `Max reconnection attempts (${this.config.maxAttempts}) reached`
      );
      console.error('[ReconnectionHandler]', error.message);
      this.callbacks.onFailed(error);
      return;
    }

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.config.baseDelay * Math.pow(this.config.factor, this.attemptCount),
      this.config.maxDelay
    );

    this.attemptCount++;
    this.setState('reconnecting');

    console.log(
      `[ReconnectionHandler] Reconnection attempt ${this.attemptCount}/${this.config.maxAttempts} in ${delay}ms`
    );

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.callbacks.onReconnect();
        this.connected();
      } catch (error: any) {
        console.error(`[ReconnectionHandler] Reconnection attempt ${this.attemptCount} failed:`, error.message);
        this.scheduleReconnect();
      }
    }, delay);
  }

  /**
   * Force an immediate reconnection attempt
   */
  async reconnectNow(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.setState('reconnecting');

    try {
      await this.callbacks.onReconnect();
      this.connected();
    } catch (error: any) {
      console.error('[ReconnectionHandler] Immediate reconnection failed:', error.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Reset reconnection state
   */
  reset(): void {
    this.attemptCount = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setState('disconnected');
  }

  /**
   * Stop reconnection attempts
   */
  shutdown(): void {
    this.isShuttingDown = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.setState('disconnected');
    console.log('[ReconnectionHandler] Shutdown complete');
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get current attempt count
   */
  getAttemptCount(): number {
    return this.attemptCount;
  }

  /**
   * Check if currently reconnecting
   */
  isReconnecting(): boolean {
    return this.state === 'reconnecting';
  }

  /**
   * Set connection state and notify callback
   */
  private setState(state: ConnectionState): void {
    const previousState = this.state;
    this.state = state;

    if (previousState !== state && this.callbacks.onStateChange) {
      this.callbacks.onStateChange(state);
    }
  }
}

/**
 * Create a reconnection handler for a specific subscription
 */
export function createReconnectionHandler(
  name: string,
  reconnectFn: () => Promise<void>,
  config?: Partial<ReconnectionConfig>
): ReconnectionHandler {
  return new ReconnectionHandler(config || {}, {
    onReconnect: async () => {
      console.log(`[ReconnectionHandler:${name}] Attempting to reconnect...`);
      await reconnectFn();
      console.log(`[ReconnectionHandler:${name}] Reconnected successfully`);
    },
    onFailed: (error) => {
      console.error(`[ReconnectionHandler:${name}] Reconnection failed:`, error.message);
    },
    onStateChange: (state) => {
      console.log(`[ReconnectionHandler:${name}] State changed to: ${state}`);
    },
  });
}

/**
 * Utility function to wrap a WebSocket subscription with automatic reconnection
 */
export async function withReconnection<T>(
  name: string,
  subscribeFn: () => Promise<T>,
  config?: Partial<ReconnectionConfig>
): Promise<{ subscription: T; handler: ReconnectionHandler }> {
  let subscription: T;

  const handler = createReconnectionHandler(
    name,
    async () => {
      subscription = await subscribeFn();
    },
    config
  );

  // Initial subscription
  subscription = await subscribeFn();
  handler.connected();

  return { subscription, handler };
}
