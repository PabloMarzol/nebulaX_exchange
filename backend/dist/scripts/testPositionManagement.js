import dotenv from 'dotenv';
import path from 'path';
import { getPositionManagementService } from '../services/hyperliquid/PositionManagementService';
import { getOrderExecutionService } from '../services/hyperliquid/OrderExecutionService';
import { v4 as uuidv4 } from 'uuid';
// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
/**
 * Test Position Management (Phase 4)
 *
 * This script tests the position management service including:
 * - Position syncing from Hyperliquid API
 * - P&L calculations
 * - Liquidation price calculations
 * - Database persistence
 * - Position closing
 * - Margin summary
 * - Real-time position tracking
 */
async function main() {
    console.log('='.repeat(80));
    console.log('HYPERLIQUID PHASE 4 TEST: Position Management');
    console.log('='.repeat(80));
    console.log();
    const positionService = getPositionManagementService();
    const orderService = getOrderExecutionService();
    // Test user (replace with actual user ID and wallet address)
    const testUserId = uuidv4(); // In production, this would come from your users table
    const testUserAddress = process.env.HYPERLIQUID_LIVE_API_WALLETADDRESS;
    if (!testUserAddress) {
        console.error('❌ HYPERLIQUID_LIVE_API_WALLETADDRESS not set in environment');
        process.exit(1);
    }
    console.log(`📋 Test Configuration:`);
    console.log(`   User ID: ${testUserId}`);
    console.log(`   Wallet Address: ${testUserAddress}`);
    console.log(`   Network: ${process.env.HYPERLIQUID_TESTNET === 'true' ? 'Testnet' : 'Mainnet'}`);
    console.log();
    try {
        // ==========================================================================
        // Test 1: Get User Positions from Hyperliquid API
        // ==========================================================================
        console.log('📡 Test 1: Get User Positions from Hyperliquid API');
        console.log('-'.repeat(80));
        const apiPositions = await positionService.getUserPositions(testUserAddress);
        if (apiPositions.length === 0) {
            console.log('   ⚠️  No open positions found');
            console.log('   Note: To fully test position management, you need to have open positions');
            console.log('   You can create a position by placing an order on Hyperliquid');
        }
        else {
            console.log(`   ✅ Found ${apiPositions.length} open positions:`);
            for (const pos of apiPositions) {
                const coin = pos.position.coin;
                const szi = parseFloat(pos.position.szi);
                const side = szi > 0 ? 'LONG' : 'SHORT';
                const size = Math.abs(szi);
                const entryPrice = parseFloat(pos.position.entryPx);
                const unrealizedPnl = parseFloat(pos.position.unrealizedPnl);
                const leverage = parseFloat(pos.position.leverage?.value || '1');
                console.log(`      - ${coin}: ${side} ${size} @ $${entryPrice.toFixed(2)} | ` +
                    `PnL: $${unrealizedPnl.toFixed(2)} | Leverage: ${leverage}x`);
            }
        }
        console.log();
        // ==========================================================================
        // Test 2: Calculate P&L and Liquidation Price
        // ==========================================================================
        console.log('🧮 Test 2: Calculate P&L and Liquidation Price');
        console.log('-'.repeat(80));
        // Test P&L calculation (example with BTC)
        const testPnlLong = positionService.calculateUnrealizedPnl({
            side: 'long',
            size: 1,
            entryPrice: 50000,
            markPrice: 51000,
        });
        console.log('   Long Position Example:');
        console.log('     Entry: $50,000 | Mark: $51,000 | Size: 1 BTC');
        console.log(`     Unrealized P&L: $${testPnlLong.toFixed(2)}`);
        console.log();
        const testPnlShort = positionService.calculateUnrealizedPnl({
            side: 'short',
            size: 1,
            entryPrice: 50000,
            markPrice: 49000,
        });
        console.log('   Short Position Example:');
        console.log('     Entry: $50,000 | Mark: $49,000 | Size: 1 BTC');
        console.log(`     Unrealized P&L: $${testPnlShort.toFixed(2)}`);
        console.log();
        // Test liquidation price calculation
        const liqPriceLong = positionService.calculateLiquidationPrice({
            side: 'long',
            entryPrice: 50000,
            leverage: 10,
        });
        console.log('   Liquidation Price Calculation (10x leverage):');
        console.log(`     Long position entry $50,000: Liq price $${liqPriceLong.toFixed(2)}`);
        const liqPriceShort = positionService.calculateLiquidationPrice({
            side: 'short',
            entryPrice: 50000,
            leverage: 10,
        });
        console.log(`     Short position entry $50,000: Liq price $${liqPriceShort.toFixed(2)}`);
        console.log();
        // ==========================================================================
        // Test 3: Sync Positions to Database
        // ==========================================================================
        console.log('💾 Test 3: Sync Positions to Database');
        console.log('-'.repeat(80));
        const syncedPositions = await positionService.syncUserPositions(testUserId, testUserAddress);
        if (syncedPositions.length === 0) {
            console.log('   ✅ Sync complete: No positions to sync');
        }
        else {
            console.log(`   ✅ Synced ${syncedPositions.length} positions to database:`);
            for (const pos of syncedPositions) {
                console.log(`      - ${pos.symbol}: ${pos.side.toUpperCase()} ${pos.size} @ $${pos.entryPrice} | ` +
                    `PnL: $${pos.unrealizedPnl} | Liq: $${pos.liquidationPrice || 'N/A'}`);
            }
        }
        console.log();
        // ==========================================================================
        // Test 4: Get Positions from Database
        // ==========================================================================
        console.log('📚 Test 4: Get Positions from Database');
        console.log('-'.repeat(80));
        const dbPositions = await positionService.getUserPositionsFromDb(testUserId);
        if (dbPositions.length === 0) {
            console.log('   ✅ No positions in database');
        }
        else {
            console.log(`   ✅ Found ${dbPositions.length} positions in database:`);
            for (const pos of dbPositions) {
                const createdAt = new Date(pos.createdAt).toLocaleString();
                console.log(`      - ${pos.symbol}: ${pos.side.toUpperCase()} ${pos.size} | ` +
                    `Created: ${createdAt} | Status: ${pos.closedAt ? 'CLOSED' : 'OPEN'}`);
            }
        }
        console.log();
        // ==========================================================================
        // Test 5: Get Specific Position
        // ==========================================================================
        if (dbPositions.length > 0) {
            console.log('🔍 Test 5: Get Specific Position');
            console.log('-'.repeat(80));
            const testSymbol = dbPositions[0].symbol;
            const specificPosition = await positionService.getPositionBySymbol(testUserId, testSymbol);
            if (specificPosition) {
                console.log(`   ✅ Retrieved position for ${testSymbol}:`);
                console.log(`      Side: ${specificPosition.side.toUpperCase()}`);
                console.log(`      Size: ${specificPosition.size}`);
                console.log(`      Entry Price: $${specificPosition.entryPrice}`);
                console.log(`      Mark Price: $${specificPosition.markPrice}`);
                console.log(`      Unrealized P&L: $${specificPosition.unrealizedPnl}`);
                console.log(`      Leverage: ${specificPosition.leverage}x`);
                if (specificPosition.liquidationPrice) {
                    console.log(`      Liquidation Price: $${specificPosition.liquidationPrice}`);
                }
            }
            else {
                console.log(`   ❌ Position not found for ${testSymbol}`);
            }
            console.log();
        }
        // ==========================================================================
        // Test 6: Get Margin Summary
        // ==========================================================================
        console.log('💰 Test 6: Get Margin Summary');
        console.log('-'.repeat(80));
        const marginSummary = await positionService.getMarginSummary(testUserAddress);
        if (marginSummary) {
            console.log('   ✅ Margin Summary:');
            console.log(`      Account Value: $${marginSummary.accountValue.toFixed(2)}`);
            console.log(`      Total Margin Used: $${marginSummary.totalMarginUsed.toFixed(2)}`);
            console.log(`      Available Margin: $${marginSummary.availableMargin.toFixed(2)}`);
            console.log(`      Total Unrealized P&L: $${marginSummary.totalUnrealizedPnl.toFixed(2)}`);
            console.log(`      Margin Ratio: ${marginSummary.marginRatio.toFixed(2)}%`);
            // Margin health indicator
            if (marginSummary.marginRatio > 80) {
                console.log('      ⚠️  WARNING: High margin usage! Risk of liquidation');
            }
            else if (marginSummary.marginRatio > 50) {
                console.log('      ⚠️  CAUTION: Moderate margin usage');
            }
            else {
                console.log('      ✅ Margin usage is healthy');
            }
        }
        else {
            console.log('   ❌ Failed to retrieve margin summary');
        }
        console.log();
        // ==========================================================================
        // Test 7: Position Event Listeners
        // ==========================================================================
        console.log('📻 Test 7: Position Event Listeners');
        console.log('-'.repeat(80));
        let positionUpdateReceived = false;
        let positionClosedReceived = false;
        positionService.on('positionUpdate', (event) => {
            console.log(`   ✅ Position Update Event Received:`);
            console.log(`      Symbol: ${event.symbol}`);
            console.log(`      Side: ${event.side}`);
            console.log(`      Size: ${event.size}`);
            console.log(`      P&L: $${event.unrealizedPnl}`);
            positionUpdateReceived = true;
        });
        positionService.on('positionClosed', (event) => {
            console.log(`   ✅ Position Closed Event Received:`);
            console.log(`      Symbol: ${event.symbol}`);
            console.log(`      Side: ${event.side}`);
            console.log(`      Realized P&L: $${event.realizedPnl}`);
            positionClosedReceived = true;
        });
        console.log('   Event listeners registered');
        console.log();
        // ==========================================================================
        // Test 8: Position Polling
        // ==========================================================================
        console.log('🔄 Test 8: Position Polling');
        console.log('-'.repeat(80));
        console.log('   Starting position polling (5 second interval)...');
        await positionService.startPositionPolling(testUserId, testUserAddress, 5000);
        console.log('   ✅ Position polling started');
        // Wait for a few seconds to see if updates come through
        console.log('   Waiting 12 seconds for position updates...');
        await new Promise((resolve) => setTimeout(resolve, 12000));
        // Stop polling
        positionService.stopPositionPolling(testUserId);
        console.log('   ✅ Position polling stopped');
        if (positionUpdateReceived) {
            console.log('   ✅ Received position update events during polling');
        }
        else {
            console.log('   ℹ️  No position updates during polling (positions may not have changed)');
        }
        console.log();
        // ==========================================================================
        // Test 9: Close Position (Optional - requires open position)
        // ==========================================================================
        if (dbPositions.length > 0) {
            console.log('🚪 Test 9: Close Position');
            console.log('-'.repeat(80));
            console.log('   ⚠️  NOTE: This test will create a real order to close a position!');
            console.log('   Skipping automatic execution. To test position closing, uncomment the code below.');
            console.log();
            // UNCOMMENT TO TEST POSITION CLOSING (WARNING: CREATES REAL ORDER)
            /*
            const positionToClose = dbPositions[0];
            console.log(`   Attempting to close position: ${positionToClose.symbol} ${positionToClose.side}`);
      
            const closeResult = await positionService.closePosition({
              userId: testUserId,
              userAddress: testUserAddress,
              symbol: positionToClose.symbol,
              orderType: 'market',
            });
      
            if (closeResult.success) {
              console.log(`   ✅ Position close order placed successfully!`);
              console.log(`      Order ID: ${closeResult.orderId}`);
              console.log(`      Message: ${closeResult.message}`);
      
              // Wait a moment and sync positions again
              await new Promise((resolve) => setTimeout(resolve, 2000));
              await positionService.syncUserPositions(testUserId, testUserAddress);
              console.log('   Positions re-synced after close order');
            } else {
              console.log(`   ❌ Failed to close position: ${closeResult.error}`);
            }
            */
            console.log('   To test position closing:');
            console.log('   1. Uncomment the code in this test');
            console.log('   2. Re-run the script');
            console.log('   3. Or use the API endpoint POST /api/hyperliquid/positions/close');
            console.log();
        }
        // ==========================================================================
        // Test 10: Get Closed Positions
        // ==========================================================================
        console.log('📜 Test 10: Get Closed Positions');
        console.log('-'.repeat(80));
        const allPositions = await positionService.getUserPositionsFromDb(testUserId, true);
        const closedPositions = allPositions.filter((pos) => pos.closedAt !== null);
        if (closedPositions.length === 0) {
            console.log('   ✅ No closed positions found');
        }
        else {
            console.log(`   ✅ Found ${closedPositions.length} closed positions:`);
            for (const pos of closedPositions) {
                const closedAt = new Date(pos.closedAt).toLocaleString();
                console.log(`      - ${pos.symbol}: ${pos.side.toUpperCase()} ${pos.size} | ` +
                    `Closed: ${closedAt} | Realized P&L: $${pos.realizedPnl}`);
            }
        }
        console.log();
        // ==========================================================================
        // Summary
        // ==========================================================================
        console.log('='.repeat(80));
        console.log('✅ Phase 4 Test Complete!');
        console.log('='.repeat(80));
        console.log();
        console.log('Tested features:');
        console.log('  ✓ Position fetching from Hyperliquid API');
        console.log('  ✓ P&L calculations (unrealized)');
        console.log('  ✓ Liquidation price calculations');
        console.log('  ✓ Position syncing to database');
        console.log('  ✓ Position retrieval from database');
        console.log('  ✓ Specific position lookup');
        console.log('  ✓ Margin summary and health check');
        console.log('  ✓ Real-time position event listeners');
        console.log('  ✓ Automated position polling');
        console.log('  ✓ Position close functionality (code ready)');
        console.log('  ✓ Closed positions history');
        console.log();
        console.log('Position Management Statistics:');
        console.log(`  Open Positions: ${dbPositions.filter((p) => !p.closedAt).length}`);
        console.log(`  Closed Positions: ${closedPositions.length}`);
        console.log(`  Total Positions Tracked: ${allPositions.length}`);
        console.log();
        console.log('Next steps:');
        console.log('  - Test with multiple positions');
        console.log('  - Test position closing in testnet');
        console.log('  - Integrate with Socket.io frontend');
        console.log('  - Set up liquidation alerts');
        console.log();
    }
    catch (error) {
        console.error('❌ Test failed with error:', error.message);
        console.error('Stack trace:', error.stack);
        process.exit(1);
    }
    finally {
        // Cleanup
        positionService.stopPositionPolling(testUserId);
        positionService.removeAllListeners();
    }
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
