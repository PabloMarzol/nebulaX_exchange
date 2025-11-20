import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCircuitBreaker, CircuitState, } from '../services/hyperliquid/CircuitBreaker';
describe('CircuitBreaker', () => {
    let circuitBreaker;
    beforeEach(() => {
        circuitBreaker = createCircuitBreaker('test-circuit', {
            failureThreshold: 3,
            successThreshold: 2,
            resetTimeout: 1000,
            monitoringPeriod: 5000,
        });
    });
    describe('Initial State', () => {
        it('should start in CLOSED state', () => {
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
        });
        it('should have zero failures and successes', () => {
            const stats = circuitBreaker.getStats();
            expect(stats.failures).toBe(0);
            expect(stats.successes).toBe(0);
            expect(stats.totalCalls).toBe(0);
        });
        it('should be available initially', () => {
            expect(circuitBreaker.isAvailable()).toBe(true);
        });
    });
    describe('Successful Executions', () => {
        it('should execute successful operations', async () => {
            const mockFn = vi.fn().mockResolvedValue('success');
            const result = await circuitBreaker.execute(mockFn);
            expect(result).toBe('success');
            expect(mockFn).toHaveBeenCalledOnce();
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
        });
        it('should track successful calls', async () => {
            const mockFn = vi.fn().mockResolvedValue('success');
            await circuitBreaker.execute(mockFn);
            await circuitBreaker.execute(mockFn);
            await circuitBreaker.execute(mockFn);
            const stats = circuitBreaker.getStats();
            expect(stats.totalSuccesses).toBe(3);
            expect(stats.totalCalls).toBe(3);
        });
    });
    describe('Failed Executions', () => {
        it('should propagate errors from failed operations', async () => {
            const error = new Error('Test error');
            const mockFn = vi.fn().mockRejectedValue(error);
            await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Test error');
        });
        it('should track failed calls', async () => {
            const mockFn = vi.fn().mockRejectedValue(new Error('failure'));
            try {
                await circuitBreaker.execute(mockFn);
            }
            catch { }
            const stats = circuitBreaker.getStats();
            expect(stats.totalFailures).toBe(1);
            expect(stats.failures).toBe(1);
        });
        it('should open circuit after reaching failure threshold', async () => {
            const mockFn = vi.fn().mockRejectedValue(new Error('failure'));
            // Trigger 3 failures (threshold)
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(mockFn);
                }
                catch { }
            }
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
        });
    });
    describe('Open State', () => {
        beforeEach(async () => {
            // Open the circuit by triggering failures
            const mockFn = vi.fn().mockRejectedValue(new Error('failure'));
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(mockFn);
                }
                catch { }
            }
        });
        it('should reject calls immediately when open', async () => {
            const mockFn = vi.fn().mockResolvedValue('success');
            await expect(circuitBreaker.execute(mockFn)).rejects.toThrow('Circuit is OPEN');
            expect(mockFn).not.toHaveBeenCalled();
        });
        it('should not be available when open', () => {
            expect(circuitBreaker.isAvailable()).toBe(false);
        });
        it('should transition to HALF_OPEN after reset timeout', async () => {
            // Wait for reset timeout
            await new Promise((resolve) => setTimeout(resolve, 1100));
            const mockFn = vi.fn().mockResolvedValue('success');
            await circuitBreaker.execute(mockFn);
            expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
        });
    });
    describe('Half-Open State', () => {
        beforeEach(async () => {
            // Open the circuit
            const failFn = vi.fn().mockRejectedValue(new Error('failure'));
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failFn);
                }
                catch { }
            }
            // Wait for reset timeout to transition to HALF_OPEN
            await new Promise((resolve) => setTimeout(resolve, 1100));
        });
        it('should close circuit after success threshold', async () => {
            const mockFn = vi.fn().mockResolvedValue('success');
            // Execute twice (success threshold is 2)
            await circuitBreaker.execute(mockFn);
            await circuitBreaker.execute(mockFn);
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
        });
        it('should reopen circuit on any failure', async () => {
            const mockFn = vi.fn().mockRejectedValue(new Error('failure'));
            try {
                await circuitBreaker.execute(mockFn);
            }
            catch { }
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
        });
    });
    describe('Reset Functionality', () => {
        it('should reset to CLOSED state', async () => {
            // Open the circuit
            const failFn = vi.fn().mockRejectedValue(new Error('failure'));
            for (let i = 0; i < 3; i++) {
                try {
                    await circuitBreaker.execute(failFn);
                }
                catch { }
            }
            expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
            // Reset
            circuitBreaker.reset();
            expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
            expect(circuitBreaker.isAvailable()).toBe(true);
        });
        it('should clear failure counts on reset', async () => {
            const failFn = vi.fn().mockRejectedValue(new Error('failure'));
            try {
                await circuitBreaker.execute(failFn);
            }
            catch { }
            circuitBreaker.reset();
            const stats = circuitBreaker.getStats();
            expect(stats.failures).toBe(0);
            expect(stats.successes).toBe(0);
        });
    });
    describe('Statistics', () => {
        it('should track all statistics correctly', async () => {
            const successFn = vi.fn().mockResolvedValue('success');
            const failFn = vi.fn().mockRejectedValue(new Error('failure'));
            // 2 successes
            await circuitBreaker.execute(successFn);
            await circuitBreaker.execute(successFn);
            // 1 failure
            try {
                await circuitBreaker.execute(failFn);
            }
            catch { }
            const stats = circuitBreaker.getStats();
            expect(stats.totalSuccesses).toBe(2);
            expect(stats.totalFailures).toBe(1);
            expect(stats.totalCalls).toBe(3);
            expect(stats.lastSuccessTime).toBeDefined();
            expect(stats.lastFailureTime).toBeDefined();
        });
    });
});
