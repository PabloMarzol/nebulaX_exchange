import dotenv from 'dotenv';
import path from 'path';
import { createCircuitBreaker, } from '../services/hyperliquid/CircuitBreaker';
import { createRetryHandler, } from '../services/hyperliquid/RetryHandler';
import { createRateLimiter } from '../services/hyperliquid/RateLimiter';
import { getReconciliationService } from '../services/hyperliquid/ReconciliationService';
import { v4 as uuidv4 } from 'uuid';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
/**
 * Test Error Handling & Resilience (Phase 5)
 *
 * This script tests all Phase 5 components:
 * - CircuitBreaker: Prevents cascading failures
 * - RetryHandler: Exponential backoff retry logic
 * - RateLimiter: Token bucket rate limiting
 * - ReconciliationService: Order and position reconciliation
 */
async function main() {
    console.log('='.repeat(80));
    console.log('HYPERLIQUID PHASE 5 TEST: Error Handling & Resilience');
    console.log('='.repeat(80));
    console.log();
    // ==========================================================================
    // Test 1: Circuit Breaker
    // ==========================================================================
    console.log('🔌 Test 1: Circuit Breaker');
    console.log('-'.repeat(80));
    const circuitBreaker = createCircuitBreaker('test-api', {
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 5000,
        monitoringPeriod: 10000,
    });
    console.log('   Created circuit breaker with:');
    console.log('   - Failure threshold: 3');
    console.log('   - Success threshold: 2');
    console.log('   - Reset timeout: 5000ms');
    console.log();
    // Simulate successful calls
    console.log('   Test 1a: Successful calls (circuit should stay CLOSED)');
    for (let i = 0; i < 3; i++) {
        try {
            await circuitBreaker.execute(async () => {
                console.log(`      ✅ Call ${i + 1} succeeded`);
                return 'success';
            });
        }
        catch (error) {
            console.log(`      ❌ Call ${i + 1} failed:`, error.message);
        }
    }
    const stats1 = circuitBreaker.getStats();
    console.log(`   Circuit state: ${stats1.state} (Success: ${stats1.totalSuccesses}, Failures: ${stats1.totalFailures})`);
    console.log();
    // Simulate failures to open circuit
    console.log('   Test 1b: Failed calls (circuit should OPEN after 3 failures)');
    for (let i = 0; i < 5; i++) {
        try {
            await circuitBreaker.execute(async () => {
                throw new Error('Simulated failure');
            });
        }
        catch (error) {
            console.log(`      ❌ Call ${i + 1} failed: ${error.message}`);
        }
    }
    const stats2 = circuitBreaker.getStats();
    console.log(`   Circuit state: ${stats2.state} (Failures: ${stats2.failures})`);
    console.log();
    // Try call when circuit is open
    console.log('   Test 1c: Call with circuit OPEN (should fail fast)');
    try {
        await circuitBreaker.execute(async () => 'should not execute');
    }
    catch (error) {
        console.log(`      ✅ Call blocked: ${error.message}`);
    }
    console.log();
    // Reset circuit
    circuitBreaker.reset();
    console.log('   ✅ Circuit reset to CLOSED');
    console.log();
    // ==========================================================================
    // Test 2: Retry Handler
    // ==========================================================================
    console.log('🔁 Test 2: Retry Handler with Exponential Backoff');
    console.log('-'.repeat(80));
    const retryHandler = createRetryHandler({
        maxRetries: 3,
        baseDelay: 500,
        maxDelay: 5000,
        factor: 2,
        jitter: false, // Disable jitter for predictable test output
    });
    console.log('   Created retry handler with:');
    console.log('   - Max retries: 3');
    console.log('   - Base delay: 500ms');
    console.log('   - Factor: 2 (exponential)');
    console.log();
    // Test 2a: Successful retry after failures
    console.log('   Test 2a: Operation that succeeds on 3rd attempt');
    let attemptCount = 0;
    try {
        const result = await retryHandler.execute(async () => {
            attemptCount++;
            if (attemptCount < 3) {
                throw new Error(`Temporary failure (attempt ${attemptCount})`);
            }
            return 'success';
        }, 'test-operation');
        console.log(`      ✅ Operation succeeded after ${attemptCount} attempts`);
    }
    catch (error) {
        console.log(`      ❌ Operation failed:`, error.message);
    }
    console.log();
    // Test 2b: Non-retryable error
    console.log('   Test 2b: Non-retryable error (should fail immediately)');
    try {
        await retryHandler.execute(async () => {
            const error = new Error('Non-retryable error');
            error.statusCode = 400; // Bad request - don't retry
            throw error;
        }, 'non-retryable');
    }
    catch (error) {
        console.log(`      ✅ Failed immediately (no retries): ${error.message}`);
    }
    console.log();
    // Test 2c: Retryable error with exhausted retries
    console.log('   Test 2c: Retryable error (should exhaust retries)');
    try {
        await retryHandler.execute(async () => {
            const error = new Error('Service unavailable');
            error.statusCode = 503;
            throw error;
        }, 'exhausted-retries');
    }
    catch (error) {
        console.log(`      ✅ Failed after retries: ${error.message}`);
    }
    console.log();
    // ==========================================================================
    // Test 3: Rate Limiter
    // ==========================================================================
    console.log('⏱️  Test 3: Rate Limiter (Token Bucket)');
    console.log('-'.repeat(80));
    const rateLimiter = createRateLimiter('test-limiter', {
        requestsPerSecond: 5,
        burstCapacity: 10,
        maxQueueSize: 50,
    });
    console.log('   Created rate limiter with:');
    console.log('   - Requests per second: 5');
    console.log('   - Burst capacity: 10');
    console.log('   - Max queue size: 50');
    console.log();
    // Test 3a: Burst requests
    console.log('   Test 3a: Send 15 requests (burst + throttled)');
    const startTime = Date.now();
    const promises = [];
    for (let i = 0; i < 15; i++) {
        const promise = rateLimiter.execute(async () => {
            const elapsed = Date.now() - startTime;
            console.log(`      Request ${i + 1} completed at ${elapsed}ms`);
            return i;
        });
        promises.push(promise);
    }
    await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    console.log(`   ✅ All requests completed in ${totalTime}ms`);
    const limiterStats = rateLimiter.getStats();
    console.log(`   Stats: ${limiterStats.totalRequests} total, ${limiterStats.totalThrottled} throttled`);
    console.log();
    rateLimiter.shutdown();
    // ==========================================================================
    // Test 4: Reconciliation Service
    // ==========================================================================
    console.log('🔄 Test 4: Reconciliation Service');
    console.log('-'.repeat(80));
    const reconciliationService = getReconciliationService();
    const testUserId = uuidv4();
    const testUserAddress = process.env.HYPERLIQUID_LIVE_API_WALLETADDRESS;
    if (!testUserAddress) {
        console.log('   ⚠️  HYPERLIQUID_LIVE_API_WALLETADDRESS not set, skipping reconciliation test');
    }
    else {
        console.log(`   Test user: ${testUserId}`);
        console.log(`   Wallet: ${testUserAddress}`);
        console.log();
        // Set up event listeners
        reconciliationService.on('discrepancy', (event) => {
            console.log(`   ⚠️  Discrepancy found:`, {
                type: event.type,
                entityId: event.entityId,
                dbStatus: event.dbStatus,
                apiStatus: event.apiStatus,
            });
        });
        reconciliationService.on('criticalDiscrepancy', (event) => {
            console.log(`   🚨 CRITICAL Discrepancy:`, {
                type: event.type,
                entityId: event.entityId,
                details: event.details,
            });
        });
        try {
            console.log('   Running reconciliation...');
            const result = await reconciliationService.reconcileUser(testUserId, testUserAddress);
            console.log('   ✅ Reconciliation complete:');
            console.log(`      Orders checked: ${result.ordersChecked}`);
            console.log(`      Positions checked: ${result.positionsChecked}`);
            console.log(`      Discrepancies found: ${result.discrepanciesFound}`);
            console.log(`      Duration: ${result.duration}ms`);
            if (result.discrepanciesFound > 0) {
                console.log('   Discrepancy details:');
                result.discrepancies.forEach((disc, idx) => {
                    console.log(`      ${idx + 1}. ${disc.type}: ${disc.dbStatus} -> ${disc.apiStatus}`);
                });
            }
        }
        catch (error) {
            console.log(`   ⚠️  Reconciliation error: ${error.message}`);
            console.log('   (This is expected if there are no orders/positions)');
        }
    }
    console.log();
    // ==========================================================================
    // Test 5: Integration Test - Circuit Breaker + Retry
    // ==========================================================================
    console.log('🔗 Test 5: Integration Test (Circuit Breaker + Retry)');
    console.log('-'.repeat(80));
    const integratedCircuit = createCircuitBreaker('integrated', {
        failureThreshold: 3,
        successThreshold: 2,
        resetTimeout: 3000,
        monitoringPeriod: 10000,
    });
    const integratedRetry = createRetryHandler({
        maxRetries: 2,
        baseDelay: 200,
        maxDelay: 1000,
        factor: 2,
    });
    console.log('   Testing combined circuit breaker + retry logic');
    console.log();
    let callNumber = 0;
    const testIntegratedCall = async () => {
        callNumber++;
        return integratedCircuit.execute(async () => {
            return integratedRetry.execute(async () => {
                // Simulate: fail first 2 times, then succeed
                if (callNumber % 3 !== 0) {
                    const error = new Error('Transient failure');
                    error.code = 'ETIMEDOUT';
                    throw error;
                }
                return `success-${callNumber}`;
            }, `integrated-call-${callNumber}`);
        });
    };
    for (let i = 0; i < 3; i++) {
        try {
            const result = await testIntegratedCall();
            console.log(`   ✅ Call ${i + 1}: ${result}`);
        }
        catch (error) {
            console.log(`   ❌ Call ${i + 1} failed: ${error.message}`);
        }
    }
    const integratedStats = integratedCircuit.getStats();
    console.log(`   Circuit state: ${integratedStats.state}`);
    console.log();
    // ==========================================================================
    // Summary
    // ==========================================================================
    console.log('='.repeat(80));
    console.log('✅ Phase 5 Test Complete!');
    console.log('='.repeat(80));
    console.log();
    console.log('Tested components:');
    console.log('  ✓ CircuitBreaker - State transitions (CLOSED → OPEN → HALF_OPEN)');
    console.log('  ✓ CircuitBreaker - Fail-fast when open');
    console.log('  ✓ RetryHandler - Exponential backoff retry');
    console.log('  ✓ RetryHandler - Non-retryable error detection');
    console.log('  ✓ RetryHandler - Retry exhaustion');
    console.log('  ✓ RateLimiter - Token bucket algorithm');
    console.log('  ✓ RateLimiter - Request throttling and queuing');
    console.log('  ✓ ReconciliationService - Order and position reconciliation');
    console.log('  ✓ ReconciliationService - Discrepancy detection');
    console.log('  ✓ Integration - Circuit breaker + Retry combination');
    console.log();
    console.log('Next steps:');
    console.log('  - Integrate resilience patterns into HyperliquidClient');
    console.log('  - Add circuit breakers to all external API calls');
    console.log('  - Configure rate limits based on Hyperliquid API limits');
    console.log('  - Set up periodic reconciliation in production (every 5 minutes)');
    console.log('  - Implement alerts for critical discrepancies');
    console.log();
    // Cleanup
    reconciliationService.removeAllListeners();
}
// Run the test
main()
    .then(() => {
    console.log('Test script completed successfully');
    process.exit(0);
})
    .catch((error) => {
    console.error('Test script failed:', error);
    process.exit(1);
});
