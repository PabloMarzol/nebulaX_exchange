import { Router } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Python AI service URL
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// All portfolio routes require authentication
router.use(authenticate);

// Calculate portfolio metrics
router.post('/metrics', async (req, res) => {
  try {
    const { portfolio, tickers } = req.body;

    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio data is required' });
    }

    if (!tickers || !Array.isArray(tickers)) {
      return res.status(400).json({ error: 'Tickers array is required' });
    }

    // Call Python AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/portfolio/metrics`,
      {
        portfolio,
        tickers
      },
      {
        timeout: 30000 // 30 second timeout
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Error calculating portfolio metrics:', error.message);
    res.status(500).json({
      error: 'Failed to calculate portfolio metrics',
      detail: error.response?.data?.detail || error.message
    });
  }
});

// Get portfolio balance (placeholder - to be implemented with actual user data)
router.get('/balance', (req, res) => {
  // TODO: Implement with actual user portfolio data from database
  res.json({
    message: 'Portfolio balance endpoint',
    note: 'Connect this to your user database to fetch actual portfolio data'
  });
});

// Get portfolio history (placeholder - to be implemented with actual user data)
router.get('/history', (req, res) => {
  // TODO: Implement with actual portfolio history tracking
  res.json({
    message: 'Portfolio history endpoint',
    note: 'Implement portfolio history tracking in your database'
  });
});

export default router;
