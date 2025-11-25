import { HyperliquidClient } from '../services/hyperliquid/HyperliquidClient';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function main() {
  try {
    const client = HyperliquidClient.getInstance();
    const symbol = 'BTC'; // Or 'HYPE'
    
    console.log(`Fetching orderbook for ${symbol}...`);
    const orderbook = await client.getOrderbook(symbol);
    
    if (!orderbook) {
        console.log('Orderbook is null or undefined');
        return;
    }
    console.log('Orderbook structure keys:', Object.keys(orderbook));
    console.log('Orderbook levels type:', Array.isArray(orderbook.levels) ? 'Array' : typeof orderbook.levels);
    if (Array.isArray(orderbook.levels)) {
        console.log('Orderbook levels length:', orderbook.levels.length);
        console.log('Level 0 type:', Array.isArray(orderbook.levels[0]) ? 'Array' : typeof orderbook.levels[0]);
        console.log('Level 0 length:', orderbook.levels[0]?.length);
        console.log('Level 0 sample:', JSON.stringify(orderbook.levels[0]?.[0]));
    }
    console.log('Full Orderbook sample (light):', JSON.stringify({
        ...orderbook,
        levels: orderbook.levels?.map((l: any[]) => l?.slice(0, 2))
    }, null, 2));

  } catch (error) {
    console.error('Error:', error);
  }
}

main();
