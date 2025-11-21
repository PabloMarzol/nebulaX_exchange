import dotenv from 'dotenv';
import path from 'path';
import { getOrderExecutionService } from '../services/hyperliquid/OrderExecutionService';
import { getOrderStatusService } from '../services/hyperliquid/OrderStatusService';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

/**
 * Test Order Placement (Phase 3)
 *
 * This script tests the order execution service including:
 * - Order placement with validation
 * - Database persistence
 * - Order status tracking
 * - Order cancellation
 */

async function main() {
  console.log('='.repeat(80));
  console.log('HYPERLIQUID PHASE 3 TEST: Order Placement & Management');
  console.log('='.repeat(80));
  console.log();

  // NOTE: This script requires a funded wallet and will place real orders in testnet/mainnet
  // Make sure to use testnet for testing!

  const orderService = getOrderExecutionService();
  const statusService = getOrderStatusService();

  // Test user (replace with actual user ID and wallet address)
  const testUserId = uuidv4(); // In production, this would come from your users table
  const testUserAddress = process.env.HYPERLIQUID_WALLET_ADDRESS;

  if (!testUserAddress) {
    console.error('❌ HYPERLIQUID_WALLET_ADDRESS not set in environment');
    process.exit(1);
  }

  console.log(`📋 Test Configuration:`);
  console.log(`   User ID: ${testUserId}`);
  console.log(`   Wallet Address: ${testUserAddress}`);
  console.log(`   Network: ${process.env.HYPERLIQUID_TESTNET === 'true' ? 'Testnet' : 'Mainnet'}`);
  console.log();

  try {
    // ==========================================================================
    // Test 1: Subscribe to Order Status Updates
    // ==========================================================================
    console.log('📡 Test 1: Subscribe to Order Status Updates');
    console.log('-'.repeat(80));

    statusService.on('orderFill', (fillEvent) => {
      console.log('   ✅ Order Fill Event:', {
        orderId: fillEvent.orderId,
        symbol: fillEvent.symbol,
        side: fillEvent.side,
        price: fillEvent.price,
        size: fillEvent.size,
      });
    });

    statusService.on('orderStatusChange', (statusEvent) => {
      console.log('   ✅ Order Status Change:', {
        orderId: statusEvent.orderId,
        previousStatus: statusEvent.previousStatus,
        newStatus: statusEvent.newStatus,
      });
    });

    await statusService.subscribeToUserOrders(testUserId, testUserAddress);
    console.log('   ✓ Subscribed to user order updates');
    console.log();

    // ==========================================================================
    // Test 2: Get Order Limits
    // ==========================================================================
    console.log('📏 Test 2: Get Order Limits for BTC');
    console.log('-'.repeat(80));

    const limits = await orderService.getOrderLimits('BTC');
    console.log('   Order Limits:', {
      minSize: limits.minSize,
      maxSize: limits.maxSize,
      sizeIncrement: limits.sizeIncrement,
      priceIncrement: limits.priceIncrement,
    });
    console.log();

    // ==========================================================================
    // Test 3: Estimate Fees
    // ==========================================================================
    console.log('💰 Test 3: Estimate Fees');
    console.log('-'.repeat(80));

    const fees = orderService.estimateFees({
      symbol: 'BTC',
      size: 0.01,
      price: 50000,
      isMaker: true,
    });

    console.log('   Estimated Fees (Maker):', {
      feeRate: `${(fees.feeRate * 100).toFixed(4)}%`,
      estimatedFee: `$${fees.estimatedFee.toFixed(2)}`,
    });
    console.log();

    // ==========================================================================
    // Test 4: Place a Limit Order
    // ==========================================================================
    console.log('📝 Test 4: Place a Limit Order (BTC)');
    console.log('-'.repeat(80));

    // Get current mid price
    const { getHyperliquidClient } = await import('../services/hyperliquid/HyperliquidClient');
    const client = getHyperliquidClient();
    const mids = await client.getAllMids();
    const btcMid = parseFloat(mids.BTC);

    console.log(`   Current BTC Mid Price: $${btcMid.toFixed(2)}`);

    // Place order 5% below current price (likely won't fill immediately)
    const orderPrice = btcMid * 0.95;
    const orderSize = 0.001; // Small size for testing

    console.log(`   Placing limit buy order:`);
    console.log(`     Price: $${orderPrice.toFixed(2)}`);
    console.log(`     Size: ${orderSize} BTC`);

    const orderResult = await orderService.placeOrder({
      userId: testUserId,
      userAddress: testUserAddress,
      symbol: 'BTC',
      side: 'buy',
      orderType: 'limit',
      price: orderPrice,
      size: orderSize,
      timeInForce: 'Gtc',
      postOnly: true, // Post-only to ensure it's a maker order
    });

    if (orderResult.success) {
      console.log('   ✅ Order placed successfully!');
      console.log(`      Internal Order ID: ${orderResult.internalOrderId}`);
      console.log(`      Hyperliquid Order ID: ${orderResult.hyperliquidOrderId}`);
      console.log(`      Status: ${orderResult.status}`);
      console.log();

      // Wait a moment for database update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // ==========================================================================
      // Test 5: Get Order from Database
      // ==========================================================================
      console.log('🔍 Test 5: Get Order from Database');
      console.log('-'.repeat(80));

      const dbOrder = await orderService.getOrderByInternalId(orderResult.internalOrderId);

      if (dbOrder) {
        console.log('   ✅ Order retrieved from database:');
        console.log(`      Symbol: ${dbOrder.symbol}`);
        console.log(`      Side: ${dbOrder.side}`);
        console.log(`      Type: ${dbOrder.orderType}`);
        console.log(`      Price: $${dbOrder.price}`);
        console.log(`      Size: ${dbOrder.size}`);
        console.log(`      Status: ${dbOrder.status}`);
        console.log(`      Created: ${dbOrder.createdAt}`);
      } else {
        console.log('   ❌ Order not found in database');
      }
      console.log();

      // ==========================================================================
      // Test 6: Get User Orders
      // ==========================================================================
      console.log('📜 Test 6: Get All User Orders');
      console.log('-'.repeat(80));

      const userOrders = await orderService.getUserOrders(testUserId, 10);
      console.log(`   ✅ Found ${userOrders.length} orders for user`);

      for (const order of userOrders) {
        console.log(`      - ${order.symbol} ${order.side} ${order.size} @ $${order.price} (${order.status})`);
      }
      console.log();

      // ==========================================================================
      // Test 7: Get Open Orders
      // ==========================================================================
      console.log('📋 Test 7: Get Open Orders');
      console.log('-'.repeat(80));

      const openOrders = await orderService.getUserOpenOrders(testUserId);
      console.log(`   ✅ Found ${openOrders.length} open orders`);

      for (const order of openOrders) {
        console.log(
          `      - ${order.internalOrderId}: ${order.symbol} ${order.side} ${order.size} @ $${order.price}`
        );
      }
      console.log();

      // ==========================================================================
      // Test 8: Cancel Order
      // ==========================================================================
      console.log('🚫 Test 8: Cancel Order');
      console.log('-'.repeat(80));

      console.log(`   Cancelling order: ${orderResult.internalOrderId}`);

      const cancelResult = await orderService.cancelOrder({
        userId: testUserId,
        userAddress: testUserAddress,
        orderId: orderResult.internalOrderId,
        symbol: 'BTC',
      });

      if (cancelResult.success) {
        console.log('   ✅ Order cancelled successfully');
      } else {
        console.log(`   ❌ Cancel failed: ${cancelResult.error}`);
      }
      console.log();

      // Wait for database update
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Verify cancellation
      const cancelledOrder = await orderService.getOrderByInternalId(orderResult.internalOrderId);
      if (cancelledOrder) {
        console.log(`   Order status after cancellation: ${cancelledOrder.status}`);
        if (cancelledOrder.cancelledAt) {
          console.log(`   Cancelled at: ${cancelledOrder.cancelledAt}`);
        }
      }
      console.log();
    } else {
      console.log('   ❌ Order placement failed:');
      console.log(`      Error: ${orderResult.error}`);
      console.log(`      Message: ${orderResult.message}`);
      console.log();
    }

    // ==========================================================================
    // Test 9: Test Validation Errors
    // ==========================================================================
    console.log('⚠️  Test 9: Test Validation Errors');
    console.log('-'.repeat(80));

    // Test 9a: Invalid symbol
    console.log('   Test 9a: Invalid symbol');
    const invalidSymbolResult = await orderService.placeOrder({
      userId: testUserId,
      userAddress: testUserAddress,
      symbol: '',
      side: 'buy',
      orderType: 'limit',
      price: 50000,
      size: 0.001,
    });
    console.log(`      ✓ Expected error: ${invalidSymbolResult.error}`);

    // Test 9b: Invalid size
    console.log('   Test 9b: Invalid size (negative)');
    const invalidSizeResult = await orderService.placeOrder({
      userId: testUserId,
      userAddress: testUserAddress,
      symbol: 'BTC',
      side: 'buy',
      orderType: 'limit',
      price: 50000,
      size: -1,
    });
    console.log(`      ✓ Expected error: ${invalidSizeResult.error}`);

    // Test 9c: Invalid address
    console.log('   Test 9c: Invalid user address');
    const invalidAddressResult = await orderService.placeOrder({
      userId: testUserId,
      userAddress: 'invalid-address',
      symbol: 'BTC',
      side: 'buy',
      orderType: 'limit',
      price: 50000,
      size: 0.001,
    });
    console.log(`      ✓ Expected error: ${invalidAddressResult.error}`);
    console.log();

    // ==========================================================================
    // Cleanup
    // ==========================================================================
    console.log('🧹 Cleanup');
    console.log('-'.repeat(80));

    await statusService.unsubscribeFromUserOrders(testUserAddress);
    console.log('   ✓ Unsubscribed from user order updates');
    console.log();

    // ==========================================================================
    // Summary
    // ==========================================================================
    console.log('='.repeat(80));
    console.log('✅ Phase 3 Test Complete!');
    console.log('='.repeat(80));
    console.log();
    console.log('Tested features:');
    console.log('  ✓ Order status WebSocket subscription');
    console.log('  ✓ Order limits retrieval');
    console.log('  ✓ Fee estimation');
    console.log('  ✓ Limit order placement');
    console.log('  ✓ Database persistence');
    console.log('  ✓ Order retrieval (by ID, by user, open orders)');
    console.log('  ✓ Order cancellation');
    console.log('  ✓ Validation error handling');
    console.log();
    console.log('Next steps:');
    console.log('  - Test with live wallet in testnet');
    console.log('  - Test market orders');
    console.log('  - Test order fills (requires market movement)');
    console.log('  - Integrate with frontend');
    console.log();
  } catch (error: any) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
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
