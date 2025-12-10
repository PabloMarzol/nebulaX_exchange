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

if (!apiKey || !apiSecret) {
    console.error('Missing ONRAMP_API_LIVE_KEY or ONRAMP_APP_LIVE_SECRET_KEY');
    process.exit(1);
}

console.log('Using API Key:', apiKey.substring(0, 4) + '...');
console.log('Using Secret:', apiSecret.substring(0, 4) + '...');

async function testEndpoints() {
  try {
    // 1. Check Server Timestamp
    console.log('\n--- Checking Server Timestamp ---');
    const tsResponse = await axios.get('https://api.onramp.money/onramp/api/v2/common/public/currentTimestamp');
    const serverTs = tsResponse.data.data;
    const localTs = Date.now();
    console.log('Server Timestamp:', serverTs);
    console.log('Local Timestamp: ', localTs);
    console.log('Diff (ms):', Math.abs(serverTs - localTs));

    const timestamp = serverTs; // Use server timestamp for subsequent requests

    // 2. Try createIntent (Widget Flow)
    console.log('\n--- Testing createIntent (Widget Flow) ---');
    const intentBody = {
        coinId: '54',         // USDT
        chainId: '3',         // MATIC
        coinAmount: '2.00',
        lang: 'en'
    };
    
    const intentPayload = {
        timestamp,
        body: intentBody
    };
    
    const intentPayloadBase64 = Buffer.from(JSON.stringify(intentPayload)).toString('base64');
    const intentSignature = crypto.createHmac('sha512', apiSecret!).update(intentPayloadBase64).digest('hex');
    
    try {
        const intentRes = await axios.post(
            'https://api.onramp.money/onramp-merchants/widget/createIntent',
            intentBody,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-ONRAMP-SIGNATURE': intentSignature,
                    'X-ONRAMP-APIKEY': apiKey,
                    'X-ONRAMP-PAYLOAD': intentPayloadBase64
                }
            }
        );
        console.log('createIntent Success:', intentRes.data);
    } catch (e: any) {
        console.log('createIntent Failed:', e.response?.data || e.message);
    }

    // 3. Try createOrder (Whitelabel Flow)
    console.log('\n--- Testing createOrder (Whitelabel Flow) ---');
    const orderBody = {
        coinId: '54',
        chainId: '3',
        coinAmount: '2.00',
    };

    const orderPayload = {
        timestamp,
        body: orderBody
    };

    const orderPayloadBase64 = Buffer.from(JSON.stringify(orderPayload)).toString('base64');
    const orderSignature = crypto.createHmac('sha512', apiSecret!).update(orderPayloadBase64).digest('hex');

    try {
        const orderRes = await axios.post(
            'https://api.onramp.money/onramp-merchants/widget/createOrder',
            orderBody,
            {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-ONRAMP-SIGNATURE': orderSignature,
                    'X-ONRAMP-APIKEY': apiKey,
                    'X-ONRAMP-PAYLOAD': orderPayloadBase64
                }
            }
        );
        console.log('createOrder Success:', orderRes.data);
    } catch (e: any) {
        console.log('createOrder Failed:', e.response?.data || e.message);
    }

  } catch (error: any) {
    console.error('Global Error:', error.message);
  }
}

testEndpoints();
