import CryptoJS from 'crypto-js';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../.env') });

const apiKey = process.env.ONRAMP_API_LIVE_KEY;
const apiSecret = process.env.ONRAMP_APP_LIVE_SECRET_KEY;

async function createOrder() {
  try {
    const body = {
      coinId: '54',
      chainId: '3',
      coinAmount: '20.00',
    };

    let payload = {
      timestamp: Date.now(),
      body,
    };

    payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = CryptoJS.enc.Hex.stringify(
      CryptoJS.HmacSHA512(payload, apiSecret)
    );

    const res = await axios({
      url: 'https://api.onramp.money/onramp-merchants/widget/createOrder',
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        'X-ONRAMP-SIGNATURE': signature,
        'X-ONRAMP-APIKEY': apiKey,
        'X-ONRAMP-PAYLOAD': payload,
      },
      data: body,
    });

    console.log(res.data);
  } catch (err) {
    console.log(err?.response?.data);
  }
}

createOrder();