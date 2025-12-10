import { Router } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// Python AI service URL (configure via environment variable)
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Analyze portfolio with all AI agents (no auth for testing with mock data)
router.post('/analyze-portfolio', async (req, res) => {
  try {
    const { tickers, portfolio, startDate, endDate, modelName, modelProvider } = req.body;

    // Validate request
    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Tickers array is required' });
    }

    if (!portfolio) {
      return res.status(400).json({ error: 'Portfolio data is required' });
    }

    // Call Python AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/analysis`,
      {
        tickers,
        portfolio,
        start_date: startDate,
        end_date: endDate,
        model_name: modelName || 'llama-3.3-70b-versatile',
        model_provider: modelProvider || 'Groq'
      },
      {
        timeout: 120000 // 2 minute timeout for analysis
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Error calling AI analysis service:', error.message);
    res.status(500).json({
      error: 'Failed to analyze portfolio',
      detail: error.response?.data?.detail || error.message
    });
  }
});

// Generate trading signal for a specific ticker
router.post('/generate-signal', async (req, res) => {
  try {
    const { ticker, agent, startDate, endDate } = req.body;

    if (!ticker) {
      return res.status(400).json({ error: 'Ticker is required' });
    }

    // Call Python AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/signals`,
      {
        ticker,
        agent,
        start_date: startDate,
        end_date: endDate
      },
      {
        timeout: 60000 // 1 minute timeout
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Error generating signal:', error.message);
    res.status(500).json({
      error: 'Failed to generate signal',
      detail: error.response?.data?.detail || error.message
    });
  }
});

// Generate batch signals for multiple tickers
router.post('/generate-batch-signals', async (req, res) => {
  try {
    const { tickers, startDate, endDate } = req.body;

    if (!tickers || !Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({ error: 'Tickers array is required' });
    }

    // Call Python AI service
    const response = await axios.post(
      `${AI_SERVICE_URL}/api/signals/batch`,
      {
        tickers,
        start_date: startDate,
        end_date: endDate
      },
      {
        timeout: 120000 // 2 minute timeout for batch
      }
    );

    res.json(response.data);
  } catch (error: any) {
    console.error('Error generating batch signals:', error.message);
    res.status(500).json({
      error: 'Failed to generate batch signals',
      detail: error.response?.data?.detail || error.message
    });
  }
});

// Get list of available AI agents
router.get('/agents', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/api/signals/agents`);
    res.json(response.data);
  } catch (error: any) {
    console.error('Error fetching agents:', error.message);
    res.status(500).json({
      error: 'Failed to fetch agents',
      detail: error.message
    });
  }
});

// Health check for AI service
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 5000 });
    res.json({
      status: 'healthy',
      aiService: response.data
    });
  } catch (error: any) {
    res.status(503).json({
      status: 'unhealthy',
      error: 'AI service is not available',
      detail: error.message
    });
  }
});

export default router;
