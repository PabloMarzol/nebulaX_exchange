# Portfolio Analytics Dashboard - AI Integration Documentation

## 🎯 Overview

This document describes the complete integration of the AI-powered Portfolio Analytics Dashboard into the NebulaX Exchange platform. The integration brings multi-agent AI analysis to crypto portfolios, providing intelligent trading recommendations and risk assessment.

---

## 📋 What Was Built

### **1. Python AI Microservice** (`backend/python-service/`)

A FastAPI-based microservice that wraps the trading_algorithm AI agents:

- **Location**: `backend/python-service/`
- **Framework**: FastAPI (async Python web framework)
- **Purpose**: Run AI agents and provide portfolio analysis

#### Key Components:

- **Crypto Data Adapter** (`app/services/crypto_adapter.py`)
  - Replaces stock market APIs with crypto data sources
  - Integrates with CoinGecko API for crypto prices and metrics
  - Adapts traditional financial metrics (P/E, FCF) to crypto equivalents (NVT, protocol revenue)

- **Agent Service** (`app/services/agent_service.py`)
  - Manages AI trading agents (Bill Ackman, Michael Burry, Technical Analyst, Risk Manager)
  - Orchestrates multi-agent analysis
  - Handles LLM meta-reasoning via MixGo agent

- **API Endpoints**:
  - `POST /api/analysis` - Full portfolio analysis with all agents
  - `POST /api/signals` - Single ticker signal generation
  - `POST /api/signals/batch` - Batch signal generation
  - `POST /api/portfolio/metrics` - Portfolio health metrics
  - `GET /api/signals/agents` - List available AI agents

### **2. Node.js Backend Integration** (`backend/src/`)

Updated routes to act as API gateway between frontend and Python service:

- **AI Routes** (`backend/src/routes/ai.routes.ts`)
  - Proxy requests to Python AI service
  - Handle errors and timeouts
  - Validate request payloads

- **Portfolio Routes** (`backend/src/routes/portfolio.routes.ts`)
  - Calculate portfolio metrics
  - Fetch portfolio data

- **WebSocket Events** (`backend/src/server.ts`)
  - `subscribe:ai-signals` - Subscribe to real-time AI signals
  - `unsubscribe:ai-signals` - Unsubscribe from signals
  - `ai-signals:update` - Receive signal updates

### **3. Frontend Dashboard** (`apps/web/src/`)

A complete Portfolio Analytics Dashboard with AI insights:

#### Components:

1. **PortfolioStats** (`components/portfolio/PortfolioStats.tsx`)
   - Displays key portfolio metrics in card layout
   - Total value, cash, exposure, risk score, diversification

2. **AIInsightsPanel** (`components/portfolio/AIInsightsPanel.tsx`)
   - Shows individual agent signals and recommendations
   - Agent consensus visualization
   - Confidence scores with progress bars

3. **TradingSignalsPanel** (`components/portfolio/TradingSignalsPanel.tsx`)
   - AI-generated trading recommendations
   - Buy/Sell/Hold signals with quantities
   - Confidence scores and reasoning
   - Agent consensus breakdown

4. **AssetAllocationChart** (`components/portfolio/AssetAllocationChart.tsx`)
   - Pie chart showing portfolio allocation
   - Interactive segments
   - Allocation table with percentages

5. **RiskMetricsPanel** (`components/portfolio/RiskMetricsPanel.tsx`)
   - Overall risk score (0-100)
   - Diversification metrics
   - Position concentration warnings
   - Actionable risk recommendations

6. **PortfolioPage** (`pages/PortfolioPage.tsx`)
   - Main dashboard integrating all components
   - "Run AI Analysis" button
   - Real-time metrics updates
   - Responsive grid layout

#### API Client & Hooks:

- **AI Service Client** (`lib/api/aiService.ts`)
  - TypeScript client for all AI endpoints
  - Type-safe request/response models

- **usePortfolioAnalysis** (`hooks/portfolio/usePortfolioAnalysis.ts`)
  - React Query hook for portfolio analysis
  - Caching and automatic refetching

- **usePortfolioMetrics** (`hooks/portfolio/usePortfolioMetrics.ts`)
  - Real-time portfolio metrics updates
  - 30-second auto-refresh

- **useAISignals** (`hooks/portfolio/useAISignals.ts`)
  - WebSocket hook for real-time AI signals
  - Auto-reconnection

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│  - PortfolioPage                                            │
│  - Dashboard Components                                      │
│  - Real-time Updates (WebSocket)                            │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              Node.js Backend (Express)                       │
│  - API Gateway                                              │
│  - WebSocket Server (Socket.io)                             │
│  - Authentication                                            │
└───────┬──────────────────────────┬──────────────────────────┘
        │ HTTP                     │ HTTP
        ▼                          ▼
┌──────────────────┐    ┌──────────────────────────────┐
│  Python AI       │    │  Hyperliquid API             │
│  Service         │    │  (Trading)                   │
│  (FastAPI)       │    └──────────────────────────────┘
└────────┬─────────┘
         │
         ├── CoinGecko API (Crypto Data)
         ├── LLM APIs (OpenAI/Groq/Anthropic)
         └── Trading Agents
             ├── Bill Ackman (Value)
             ├── Michael Burry (Contrarian)
             ├── Technical Analyst
             ├── Risk Manager
             └── MixGo (Meta-Agent)
```

---

## 🔧 Setup Instructions

### **Prerequisites**

- Node.js >= 20.0.0
- Python 3.11+
- pnpm >= 8.0.0
- API Keys (configured in root `.env` file):
  - **Groq API key** (default - for Llama models, free tier available)
  - OR OpenAI API key (for GPT-4)
  - OR Anthropic API key (for Claude models)

### **1. Configure Root Environment Variables**

All API keys are stored in the **root `.env` file**:

```bash
# Add to root .env file (if not already present)
# Add your Groq API key (default provider)
GROQ_API_KEY=your_groq_api_key_here

# Optional: Add other LLM providers
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# Backend configuration
AI_SERVICE_URL=http://localhost:8000
```

### **2. Python AI Service Setup**

```bash
# Navigate to Python service directory
cd backend/python-service

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# The service automatically loads from root .env file
# No need to create a separate .env here!

# Run the service
uvicorn app.main:app --reload --port 8000
```

The Python service will be available at: `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

**Note**: The Python service automatically loads environment variables from the root `.env` file (two directories up).

### **3. Node.js Backend Setup**

```bash
# The backend already uses the root .env file
# Just make sure AI_SERVICE_URL is set in root .env:
# AI_SERVICE_URL=http://localhost:8000

# Navigate to backend directory (if needed)
cd backend

# Install dependencies (if not already done)
pnpm install

# Run the backend
pnpm dev
```

The Node.js backend will be available at: `http://localhost:3000`

### **4. Frontend Setup**

```bash
# Navigate to web app directory
cd apps/web

# Install dependencies (if not already done)
pnpm install

# Run the frontend
pnpm dev
```

The frontend will be available at: `http://localhost:5173`

### **5. Docker Setup (Optional)**

```bash
# Build Python service image
cd backend/python-service
docker build -t nebulax-ai-service .

# Run the container (mount root .env)
docker run -p 8000:8000 \
  -v $(pwd)/../../.env:/app/.env:ro \
  nebulax-ai-service
```

---

## 📊 Usage Guide

### **Accessing the Portfolio Dashboard**

1. Navigate to the Portfolio tab in the application
2. The dashboard will automatically load with mock portfolio data
3. Click **"Run AI Analysis"** to generate trading recommendations

### **Understanding AI Insights**

#### **Agent Signals**

Each AI agent provides a signal:
- **Bullish** 🟢 - Recommend buying/holding
- **Bearish** 🔴 - Recommend selling/shorting
- **Neutral** ⚪ - No strong signal

#### **Confidence Scores**

- **75-100%**: High confidence
- **50-75%**: Medium confidence
- **0-50%**: Low confidence

#### **Trading Decisions**

The MixGo meta-agent synthesizes all signals and provides:
- **Action**: Buy, Sell, Short, Cover, or Hold
- **Quantity**: Recommended number of shares/coins
- **Reasoning**: Detailed explanation
- **Confidence**: Overall confidence in the decision

#### **Risk Metrics**

- **Risk Score** (0-100): Lower is better
  - 0-30: Low risk (green)
  - 30-60: Medium risk (yellow)
  - 60-100: High risk (red)

- **Diversification Score** (0-100): Higher is better
  - Based on number of positions and concentration

---

## 🔄 Data Flow

### **Portfolio Analysis Flow**

1. User clicks "Run AI Analysis"
2. Frontend sends request to Node.js backend (`/api/ai/analyze-portfolio`)
3. Node.js proxies request to Python service (`/api/analysis`)
4. Python service:
   - Fetches crypto data from CoinGecko
   - Runs all AI agents on each ticker
   - Uses LLM to synthesize signals (MixGo)
   - Applies risk management constraints
   - Returns trading decisions
5. Response flows back to frontend
6. Dashboard updates with new insights

### **Real-time Metrics Flow**

1. Frontend subscribes to portfolio metrics (React Query)
2. Metrics automatically refetch every 30 seconds
3. Backend calls Python service for metrics calculation
4. Python service fetches current prices and calculates:
   - Total value
   - Exposure metrics
   - Risk scores
   - Diversification scores
5. Frontend updates dashboard components

---

## 🔑 API Endpoints

### **Python AI Service**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis` | POST | Full portfolio analysis |
| `/api/signals` | POST | Generate signal for one ticker |
| `/api/signals/batch` | POST | Generate signals for multiple tickers |
| `/api/portfolio/metrics` | POST | Calculate portfolio metrics |
| `/api/signals/agents` | GET | List available agents |
| `/health` | GET | Health check |

### **Node.js Backend (Proxy)**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/analyze-portfolio` | POST | Analyze portfolio |
| `/api/ai/generate-signal` | POST | Generate single signal |
| `/api/ai/generate-batch-signals` | POST | Generate batch signals |
| `/api/ai/agents` | GET | List agents |
| `/api/ai/health` | GET | Check AI service health |
| `/api/portfolio/metrics` | POST | Calculate metrics |

---

## 🎨 Customization

### **Adding Custom Tickers**

Edit `apps/web/src/pages/PortfolioPage.tsx`:

```typescript
const MOCK_TICKERS = ['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC'];
```

### **Adjusting Agent Weights**

Edit `trading_algorithm/config.yaml`:

```yaml
agents:
  weights:
    bill_ackman: 0.35
    michael_burry: 0.35
    technical_analyst: 0.30
```

### **Changing LLM Model**

The default model is **Llama 3.3 70B** via Groq. To use a different model:

```typescript
analyzePortfolio(tickers, portfolio, {
  modelName: 'llama-3.3-70b-versatile',  // Default (Groq)
  modelProvider: 'Groq'                   // Default

  // Or use OpenAI:
  // modelName: 'gpt-4o',
  // modelProvider: 'OpenAI'

  // Or use Anthropic:
  // modelName: 'claude-3-5-sonnet-20241022',
  // modelProvider: 'Anthropic'
});
```

**Available Groq Models**:
- `llama-3.3-70b-versatile` (default, recommended)
- `llama-3.1-70b-versatile`
- `mixtral-8x7b-32768`
- `gemma2-9b-it`

### **Adding New Crypto to CoinGecko Mapping**

Edit `backend/python-service/app/services/crypto_adapter.py`:

```python
self.ticker_to_id = {
    "BTC": "bitcoin",
    "ETH": "ethereum",
    "YOUR_TOKEN": "coingecko-id",  # Add your mapping
    # ...
}
```

---

## 🧪 Testing

### **Test Python Service**

```bash
cd backend/python-service

# Test health endpoint
curl http://localhost:8000/health

# Test analysis (with example payload)
curl -X POST http://localhost:8000/api/analysis \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BTC"],
    "portfolio": {
      "cash": 10000,
      "positions": {}
    }
  }'
```

### **Test Node.js Backend**

```bash
# Test AI service health
curl http://localhost:3000/api/ai/health

# Test agents list
curl http://localhost:3000/api/ai/agents
```

---

## 🐛 Troubleshooting

### **Python Service Won't Start**

1. Check Python version: `python --version` (should be 3.11+)
2. Verify API keys in `.env`
3. Check logs for import errors
4. Ensure trading_algorithm path is correct

### **"Failed to analyze portfolio" Error**

1. Check Python service is running (`http://localhost:8000/health`)
2. Verify `AI_SERVICE_URL` in Node.js backend `.env`
3. Check API keys are valid
4. Look at Python service logs for errors

### **No Data in Dashboard**

1. Open browser console (F12) for errors
2. Check Network tab for failed API calls
3. Verify backend is running (`http://localhost:3000`)
4. Check CORS configuration

### **CoinGecko Rate Limiting**

Free tier allows 50 calls/minute. If you hit limits:
1. Add delays between requests
2. Enable caching in crypto adapter
3. Get CoinGecko Pro API key
4. Use alternative data sources

---

## 🚀 Next Steps & Enhancements

### **Immediate Improvements**

1. **Connect to Real Portfolio Data**
   - Replace `MOCK_PORTFOLIO` with actual user portfolio from database
   - Integrate with Hyperliquid positions

2. **Add Authentication**
   - Protect AI routes with auth middleware
   - Implement user-specific portfolios

3. **Implement Portfolio History**
   - Track analysis results over time
   - Show performance of AI recommendations

### **Advanced Features**

4. **Backtesting Dashboard**
   - Test AI strategies on historical data
   - Compare performance metrics

5. **Custom Agent Configuration**
   - Let users adjust agent weights
   - Create custom agent combinations

6. **Alert System**
   - Push notifications for high-confidence signals
   - Email alerts for portfolio risks

7. **Paper Trading**
   - Test AI recommendations without real money
   - Track hypothetical portfolio performance

8. **Social Features**
   - Share insights with other users
   - Community signal voting

9. **Enhanced Crypto Metrics**
   - On-chain data integration
   - Whale wallet tracking
   - Protocol revenue metrics

10. **Multi-Portfolio Support**
    - Manage multiple portfolios
    - Compare strategies

---

## 📚 Additional Resources

- **Trading Algorithm Docs**: `/trading_algorithm/README.md`
- **Python Service Docs**: `/backend/python-service/README.md`
- **FastAPI Docs**: https://fastapi.tiangolo.com/
- **CoinGecko API**: https://www.coingecko.com/en/api/documentation
- **React Query**: https://tanstack.com/query/latest

---

## 👥 Support

For issues or questions:
1. Check this documentation
2. Review logs in Python service and Node.js backend
3. Open an issue on GitHub

---

**Built with ❤️ for NebulaX Exchange**
