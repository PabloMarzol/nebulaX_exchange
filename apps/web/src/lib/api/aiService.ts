/**
 * AI Service API client
 * Provides methods to interact with the AI analysis endpoints
 */
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface Portfolio {
  cash: number;
  positions: {
    [ticker: string]: {
      long: number;
      short: number;
      long_cost_basis: number;
      short_cost_basis: number;
    };
  };
}

export interface AgentSignal {
  agent: string;
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: any;
}

export interface TradingDecision {
  ticker: string;
  action: 'buy' | 'sell' | 'short' | 'cover' | 'hold';
  quantity: number;
  confidence: number;
  reasoning: string;
  agent_signals: { [agent: string]: AgentSignal };
}

export interface AnalysisResponse {
  decisions: { [ticker: string]: TradingDecision };
  portfolio_summary: PortfolioMetrics;
  timestamp: string;
}

export interface PortfolioMetrics {
  total_value: number;
  cash: number;
  cash_pct: number;
  positions_count: number;
  long_exposure: number;
  short_exposure: number;
  largest_position_pct: number;
  risk_score: number;
  diversification_score: number;
}

export interface Agent {
  name: string;
  description: string;
  strategy: string;
}

/**
 * Analyze portfolio with all AI agents
 */
export async function analyzePortfolio(
  tickers: string[],
  portfolio: Portfolio,
  options?: {
    startDate?: string;
    endDate?: string;
    modelName?: string;
    modelProvider?: string;
  }
): Promise<AnalysisResponse> {
  const response = await axios.post(`${API_BASE_URL}/api/ai/analyze-portfolio`, {
    tickers,
    portfolio,
    startDate: options?.startDate,
    endDate: options?.endDate,
    modelName: options?.modelName || 'gpt-4o',
    modelProvider: options?.modelProvider || 'OpenAI'
  });

  return response.data;
}

/**
 * Generate trading signal for a single ticker
 */
export async function generateSignal(
  ticker: string,
  options?: {
    agent?: string;
    startDate?: string;
    endDate?: string;
  }
): Promise<any> {
  const response = await axios.post(`${API_BASE_URL}/api/ai/generate-signal`, {
    ticker,
    agent: options?.agent,
    startDate: options?.startDate,
    endDate: options?.endDate
  });

  return response.data;
}

/**
 * Generate batch signals for multiple tickers
 */
export async function generateBatchSignals(
  tickers: string[],
  options?: {
    startDate?: string;
    endDate?: string;
  }
): Promise<any> {
  const response = await axios.post(`${API_BASE_URL}/api/ai/generate-batch-signals`, {
    tickers,
    startDate: options?.startDate,
    endDate: options?.endDate
  });

  return response.data;
}

/**
 * Get list of available AI agents
 */
export async function getAgents(): Promise<{ agents: Agent[] }> {
  const response = await axios.get(`${API_BASE_URL}/api/ai/agents`);
  return response.data;
}

/**
 * Calculate portfolio metrics
 */
export async function calculatePortfolioMetrics(
  portfolio: Portfolio,
  tickers: string[]
): Promise<PortfolioMetrics> {
  const response = await axios.post(`${API_BASE_URL}/api/portfolio/metrics`, {
    portfolio,
    tickers
  });

  return response.data;
}

/**
 * Check AI service health
 */
export async function checkAIServiceHealth(): Promise<any> {
  const response = await axios.get(`${API_BASE_URL}/api/ai/health`);
  return response.data;
}
