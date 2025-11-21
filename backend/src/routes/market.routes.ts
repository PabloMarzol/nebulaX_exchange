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
      // Get specific symbol price (from cache first, then API)
      const cachedPrice = marketDataService.getCachedMidPrice(symbol);
      if (cachedPrice) {
        return res.json({
          success: true,
          data: { [symbol]: cachedPrice },
          cached: true,
        });
      }

      // Fallback to API
      const allMids = await hlClient.getAllMids();
      const price = allMids?.mids?.[symbol] || null;

      return res.json({
        success: true,
        data: { [symbol]: price },
        cached: false,
      });
    }

    // Get all prices (from cache first, then API)
    const cachedPrices = marketDataService.getAllCachedMidPrices();
    if (cachedPrices.size > 0) {
      const pricesObj: Record<string, string> = {};
      cachedPrices.forEach((price, sym) => {
        pricesObj[sym] = price;
      });
      return res.json({
        success: true,
        data: pricesObj,
        cached: true,
      });
    }

    // Fallback to API
    const allMids = await hlClient.getAllMids();
    res.json({
      success: true,
      data: allMids?.mids || {},
      cached: false,
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

    // Try to get from cache first
    const cachedOrderbook = marketDataService.getCachedOrderbook(symbol);
    if (cachedOrderbook) {
      return res.json({
        success: true,
        data: cachedOrderbook,
        cached: true,
      });
    }

    // Fallback to API
    const orderbook = await hlClient.getOrderbook(symbol);
    res.json({
      success: true,
      data: orderbook,
      cached: false,
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

    const { symbol, interval, startTime, endTime } = validation.data;

    // Try to get from cache first
    const cachedCandles = marketDataService.getCachedCandles(symbol, interval);
    if (cachedCandles.length > 0) {
      return res.json({
        success: true,
        data: cachedCandles,
        cached: true,
      });
    }

    // Fallback to API
    const options: any = {};
    if (startTime) options.startTime = parseInt(startTime);
    if (endTime) options.endTime = parseInt(endTime);

    // Default to last 24 hours if no time range specified
    if (!startTime && !endTime) {
      options.startTime = Date.now() - 24 * 60 * 60 * 1000;
      options.endTime = Date.now();
    }

    const candles = await hlClient.getCandles(symbol, interval, options);
    res.json({
      success: true,
      data: candles,
      cached: false,
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

    // Fetch 24h candles to calculate stats
    const endTime = Date.now();
    const startTime = endTime - 24 * 60 * 60 * 1000;

    const candles = await hlClient.getCandles(symbol, '1h', {
      startTime,
      endTime,
    });

    if (candles.length === 0) {
      return res.json({
        success: true,
        data: null,
      });
    }

    // Calculate 24h stats
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
