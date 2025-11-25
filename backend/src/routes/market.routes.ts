import { Router, Request, Response } from 'express';
import { HyperliquidClient } from '../services/hyperliquid/HyperliquidClient.js';
import { MarketDataService } from '../services/hyperliquid/MarketDataService.js';
import { z } from 'zod';

const router = Router();
const hlClient = HyperliquidClient.getInstance();
const marketDataService = MarketDataService.getInstance();

// Validation schemas
const orderbookQuerySchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
});

const candlesQuerySchema = z.object({
  symbol: z.string().min(1, 'Symbol is required'),
  interval: z.string().default('1h'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

const symbolQuerySchema = z.object({
  symbol: z.string().optional(),
});

/**
 * GET /api/market/symbols
 * Get all available trading symbols with metadata
 */
router.get('/symbols', async (req: Request, res: Response) => {
  try {
    const metas = await hlClient.getMetaAndAssetContexts();

    // Transform the data for frontend consumption
    const symbols = metas.universe.map((meta) => ({
      symbol: meta.name,
      maxLeverage: meta.maxLeverage,
      onlyIsolated: meta.onlyIsolated,
    }));

    res.json({
      success: true,
      data: {
        symbols,
        universe: metas.universe,
      },
    });
  } catch (error) {
    console.error('Error fetching symbols:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trading symbols',
    });
  }
});

/**
 * GET /api/market/prices
 * Get current mid prices for all or specific symbols
 */
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const validation = symbolQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const { symbol } = validation.data;

    if (symbol) {
      // Get specific symbol price from WebSocket cache only
      const cachedPrice = marketDataService.getCachedMidPrice(symbol);
      return res.json({
        success: true,
        data: { [symbol]: cachedPrice || null },
        cached: true,
      });
    }

    // Get all prices from WebSocket cache only
    const cachedPrices = marketDataService.getAllCachedMidPrices();
    const pricesObj: Record<string, string> = {};
    cachedPrices.forEach((price, sym) => {
      pricesObj[sym] = price;
    });

    res.json({
      success: true,
      data: pricesObj,
      cached: true,
    });
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices',
    });
  }
});

/**
 * GET /api/market/orderbook
 * Get orderbook snapshot for a specific symbol
 */
router.get('/orderbook', async (req: Request, res: Response) => {
  try {
    const validation = orderbookQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const { symbol } = validation.data;

    // Get orderbook from WebSocket cache
    const cachedOrderbook = marketDataService.getCachedOrderbook(symbol);
    
    if (!cachedOrderbook) {
      const snapshot = await hlClient.getOrderbook(symbol);
      return res.json({
        success: true,
        data: snapshot,
        cached: false,
      });
    }

    res.json({
      success: true,
      data: cachedOrderbook,
      cached: true,
    });
  } catch (error) {
    console.error('Error fetching orderbook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch orderbook',
    });
  }
});

/**
 * GET /api/market/candles
 * Get candle/kline data for a specific symbol
 */
router.get('/candles', async (req: Request, res: Response) => {
  try {
    const validation = candlesQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const { symbol, interval } = validation.data;

    // Get candles from WebSocket cache
    const cachedCandles = marketDataService.getCachedCandles(symbol, interval);
    
    // If cache is empty, fetch snapshot from API
    if (cachedCandles.length === 0) {
      const now = Date.now();
      // Default to 24h of data if no time range provided
      const start = validation.data.startTime ? parseInt(validation.data.startTime) : now - 24 * 60 * 60 * 1000;
      const end = validation.data.endTime ? parseInt(validation.data.endTime) : now;

      // Map interval string to Hyperliquid format if needed, but SDK usually handles '1h', '1m' etc.
      
      const snapshot = await hlClient.getCandleSnapshot({
        symbol,
        interval,
        startTime: start,
        endTime: end,
      });

      return res.json({
        success: true,
        data: snapshot,
        cached: false,
      });
    }

    res.json({
      success: true,
      data: cachedCandles,
      cached: true,
    });
  } catch (error) {
    console.error('Error fetching candles:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch candles',
    });
  }
});

/**
 * GET /api/market/meta
 * Get market metadata including universe info
 */
router.get('/meta', async (req: Request, res: Response) => {
  try {
    const metas = await hlClient.getMetaAndAssetContexts();
    res.json({
      success: true,
      data: metas,
    });
  } catch (error) {
    console.error('Error fetching market metadata:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market metadata',
    });
  }
});

/**
 * GET /api/market/24h-stats
 * Get 24-hour statistics for a specific symbol
 */
router.get('/24h-stats', async (req: Request, res: Response) => {
  try {
    const validation = symbolQuerySchema.safeParse(req.query);
    if (!validation.success) {
      return res.status(400).json({
        success: false,
        error: validation.error.errors,
      });
    }

    const { symbol } = validation.data;

    if (!symbol) {
      return res.status(400).json({
        success: false,
        error: 'Symbol is required',
      });
    }

    // Get 24h candles from WebSocket cache
    const candles = marketDataService.getCachedCandles(symbol, '1h');

    if (candles.length === 0) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Calculate 24h stats from cached candles
    const open = parseFloat(candles[0].o);
    const close = parseFloat(candles[candles.length - 1].c);
    const high = Math.max(...candles.map((c: any) => parseFloat(c.h)));
    const low = Math.min(...candles.map((c: any) => parseFloat(c.l)));
    const volume = candles.reduce((sum: number, c: any) => sum + parseFloat(c.v), 0);
    const change = close - open;
    const changePercent = (change / open) * 100;

    res.json({
      success: true,
      data: {
        symbol,
        open,
        high,
        low,
        close,
        volume,
        change,
        changePercent,
        timestamp: Date.now(),
      },
    });
  } catch (error) {
    console.error('Error fetching 24h stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch 24h statistics',
    });
  }
});

export default router;
