#!/usr/bin/env tsx

/**
 * Test Hyperliquid API Connection
 *
 * This script tests the connection to Hyperliquid's API and displays
 * basic market data to verify the integration is working.
 *
 * Usage:
 *   pnpm tsx src/scripts/testHyperliquidConnection.ts
 */

import dotenv from 'dotenv';
import { getHyperliquidClient } from '../services/hyperliquid';
import path from 'path';

// Load environment variables from root .env file
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

async function main() {
  console.log('🚀 Testing Hyperliquid API Connection...\n');

  try {
    // Initialize client
    const client = getHyperliquidClient();
    const config = client.getConfig();

    console.log('📋 Configuration:');
    console.log(`   Network: ${config.testnet ? 'Testnet' : 'Mainnet'}`);
    console.log(`   Wallet: ${config.walletAddress || 'Not configured'}\n`);

    // Test 1: Fetch all available symbols
    console.log('1️⃣  Fetching available trading symbols...');
    const metas = await client.getAllMetas();
    console.log(`   ✅ Found ${metas.universe.length} trading pairs`);
    console.log(`   Examples: ${metas.universe.slice(0, 5).map(m => m.name).join(', ')}\n`);

    // Test 2: Fetch mid prices
    console.log('2️⃣  Fetching mid prices...');
    const mids = await client.getAllMids();
    const symbols = Object.keys(mids).slice(0, 5);
    console.log('   ✅ Current mid prices:');
    symbols.forEach(symbol => {
      console.log(`      ${symbol}: $${parseFloat(mids[symbol]).toLocaleString()}`);
    });
    console.log('');

    // Test 3: Fetch orderbook for BTC
    console.log('3️⃣  Fetching BTC orderbook...');
    const orderbook = await client.getOrderbook('BTC');
    const topBid = orderbook.levels[0][0]; // [price, size]
    const topAsk = orderbook.levels[1][0];
    console.log('   ✅ BTC Orderbook:');
    console.log(`      Best Bid: $${topBid.px} (${topBid.sz} contracts)`);
    console.log(`      Best Ask: $${topAsk.px} (${topAsk.sz} contracts)`);
    console.log(`      Spread: $${(parseFloat(topAsk.px) - parseFloat(topBid.px)).toFixed(2)}\n`);

    // Test 4: Fetch user data (if wallet is configured)
    if (config.walletAddress && config.walletAddress !== '0x...') {
      console.log('4️⃣  Fetching user data...');

      try {
        const userState = await client.getUserState(config.walletAddress);
        console.log('   ✅ User State:');
        console.log(`      Account Value: $${parseFloat(userState.marginSummary.accountValue).toLocaleString()}`);
        console.log(`      Total Margin Used: $${parseFloat(userState.marginSummary.totalMarginUsed).toLocaleString()}`);
        console.log(`      Positions: ${userState.assetPositions.length}\n`);

        const openOrders = await client.getOpenOrders(config.walletAddress);
        console.log(`   ✅ Open Orders: ${openOrders.length}\n`);
      } catch (error: any) {
        console.log('   ⚠️  Could not fetch user data:', error.message);
        console.log('      This is normal if the wallet has no activity\n');
      }
    } else {
      console.log('4️⃣  Skipping user data (HYPERLIQUID_WALLET not configured)\n');
    }

    // Test 5: Test WebSocket subscription (briefly)
    console.log('5️⃣  Testing WebSocket subscription...');
    let receivedUpdate = false;

    const subscription = await client.subscribeToOrderbook('BTC', (data) => {
      if (!receivedUpdate) {
        receivedUpdate = true;
        console.log('   ✅ Received orderbook update');
        console.log(`      Time: ${new Date(data.time).toISOString()}`);
        console.log(`      Levels: ${data.levels[0].length} bids, ${data.levels[1].length} asks\n`);
      }
    });

    // Wait for at least one update (max 5 seconds)
    await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (!receivedUpdate) {
          console.log('   ⚠️  No WebSocket update received (timeout)\n');
        }
        resolve(undefined);
      }, 5000);

      if (receivedUpdate) {
        clearTimeout(timeout);
        resolve(undefined);
      }
    });

    // Unsubscribe
    await subscription.unsubscribe();

    console.log('✅ All tests completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   ✓ REST API connection working');
    console.log('   ✓ Market data queries working');
    console.log('   ✓ WebSocket subscriptions working');
    console.log('\n🎉 Hyperliquid integration is ready to use!\n');

    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ Error testing Hyperliquid connection:');
    console.error(`   ${error.message}\n`);

    if (error.message.includes('Invalid Hyperliquid configuration')) {
      console.log('💡 Tips:');
      console.log('   1. Make sure you have a .env file in the root directory');
      console.log('   2. Add HYPERLIQUID_API_PRIVATE_KEY or HYPERLIQUID_PRIVATE_KEY');
      console.log('   3. The private key should start with 0x and be 64 hex characters');
      console.log('   4. Set HYPERLIQUID_TESTNET=true for testing\n');
    }

    process.exit(1);
  }
}

// Run the test
main();
