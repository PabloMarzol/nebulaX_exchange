import axios from 'axios';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const apiKey = process.env.ONRAMP_API_LIVE_KEY;
const apiSecret = process.env.ONRAMP_APP_LIVE_SECRET_KEY;
const ONRAMP_BASE_URL = 'https://api.onramp.money';

if (!apiKey || !apiSecret) {
    console.error('Missing ONRAMP_API_LIVE_KEY or ONRAMP_APP_LIVE_SECRET_KEY');
    process.exit(1);
}

console.log('Using API Key:', apiKey.substring(0, 4) + '...');
console.log('Starting E2E Test for OnRamp Money Flow...');

async function getQuote(coinId: number, chainId: number, fiatAmount: number) {
    console.log('\n--- Getting Quote ---');
    const payload = {
        timestamp: Date.now(),
        body: {
            coinId,
            chainId,
            fiatAmount,
            fiatType: 21, // 21 is USD
            type: 1 // onramp
        }
    };
    
    // Sign
    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const payloadBase64 = payloadBuffer.toString('base64');
    const signature = crypto.createHmac('sha512', apiSecret!).update(payloadBase64).digest('hex');

    try {
        const response = await axios.post(
            `${ONRAMP_BASE_URL}/onramp/api/v2/common/transaction/quotes`,
            payload.body,
            {
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-ONRAMP-SIGNATURE': signature,
                    'X-ONRAMP-APIKEY': apiKey,
                    'X-ONRAMP-PAYLOAD': payloadBase64,
                }
            }
        );
        console.log('Quote Result:', response.data.data);
        return response.data.data;
    } catch (e: any) {
        console.error('Get Quote Failed:', e.response?.data || e.message);
        throw e;
    }
}

async function createIntent(coinId: any, chainId: any, coinAmount: number) {
    console.log('\n--- Creating Intent ---');
    const body = {
        coinId: coinId.toString(),
        chainId: chainId.toString(),
        coinAmount: coinAmount.toString(),
        lang: 'en'
    };

    const payload = {
        timestamp: Date.now(),
        body
    };

    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const payloadBase64 = payloadBuffer.toString('base64');
    const signature = crypto.createHmac('sha512', apiSecret!).update(payloadBase64).digest('hex');

    try {
        const response = await axios.post(
            `${ONRAMP_BASE_URL}/onramp-merchants/widget/createIntent`,
            body,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-ONRAMP-SIGNATURE': signature,
                    'X-ONRAMP-APIKEY': apiKey,
                    'X-ONRAMP-PAYLOAD': payloadBase64
                }
            }
        );
        console.log('Create Intent Result:', response.data);
        return response.data;
    } catch (e: any) {
        console.error('Create Intent Failed:', e.response?.data || e.message);
        // Don't throw to allow continuation
    }
}

async function createOrder(coinId: any, chainId: any, coinAmount: number) {
    console.log('\n--- Creating Order ---');
    const body = {
        coinId: coinId.toString(),
        chainId: chainId.toString(),
        coinAmount: coinAmount.toString()
    };

    const payload = {
        timestamp: Date.now(),
        body
    };

    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const payloadBase64 = payloadBuffer.toString('base64');
    const signature = crypto.createHmac('sha512', apiSecret!).update(payloadBase64).digest('hex');

    try {
        const response = await axios.post(
            `${ONRAMP_BASE_URL}/onramp-merchants/widget/createOrder`,
            body,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-ONRAMP-SIGNATURE': signature,
                    'X-ONRAMP-APIKEY': apiKey,
                    'X-ONRAMP-PAYLOAD': payloadBase64
                }
            }
        );
        console.log('Create Order Result:', response.data);
    } catch (e: any) {
        console.error('Create Order Failed:', e.response?.data || e.message);
    }
}

async function main() {
    // USDT on Polygon: coinId: 54, chainId: 3
    const coinId = 54;
    const chainId = 3; 

    try {
        // 2. Get Quote for 20 USD
        // Min amount is variable, let's use 20.
        const quote = await getQuote(coinId, chainId, 20); 
        
        if (quote) {
            const amount = quote.quantity;
            // Rounding or using exact amount? Service passes through.
            console.log(`cryptoAmount from quote: ${amount}`);
            
            // 3. Create Intent
            await createIntent(coinId, chainId, amount);

            // 4. Create Order
            await createOrder(coinId, chainId, amount);
        }
    } catch (e) {
        console.log('Flow interrupted');
    }
}

main();
