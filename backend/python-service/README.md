# AI Trading Analysis Service

Python FastAPI microservice for AI-powered crypto portfolio analysis and trading signal generation.

## Features

- **Multi-Agent AI System**: Integrates signals from multiple trading agents
  - Bill Ackman Agent (Value Investing)
  - Michael Burry Agent (Contrarian)
  - Technical Analyst Agent
  - Risk Manager

- **LLM Meta-Reasoning**: Uses **Groq/Llama** (default) or GPT-4/Claude to synthesize agent signals
- **Crypto Data Adapter**: Fetches crypto market data from CoinGecko
- **Portfolio Analytics**: Calculate risk metrics and portfolio health
- **RESTful API**: FastAPI with automatic OpenAPI documentation

## Setup

### Local Development

1. **Configure root .env file** (in project root, not in python-service folder):
```bash
# Add to ../../.env (root directory)
GROQ_API_KEY=your_groq_api_key_here
AI_SERVICE_URL=http://localhost:8000
```

2. Install dependencies:
```bash
cd backend/python-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. Run the service:
```bash
uvicorn app.main:app --reload --port 8000
```

**Note**: The service automatically loads environment variables from the root `.env` file (two directories up).

4. Access the API docs:
```
http://localhost:8000/docs
```

### Docker

1. Build the image:
```bash
docker build -t ai-trading-service .
```

2. Run the container:
```bash
# Mount root .env file
docker run -p 8000:8000 \
  -v $(pwd)/../../.env:/app/.env:ro \
  ai-trading-service
```

## API Endpoints

### Analysis

- `POST /api/analysis` - Run full portfolio analysis
  - Analyzes multiple tickers with all agents
  - Returns trading decisions with confidence scores

### Signals

- `POST /api/signals` - Generate signal for a single ticker
- `POST /api/signals/batch` - Generate signals for multiple tickers
- `GET /api/signals/agents` - List available agents

### Portfolio

- `POST /api/portfolio/metrics` - Calculate portfolio health metrics

## Example Request

```bash
curl -X POST "http://localhost:8000/api/analysis" \
  -H "Content-Type: application/json" \
  -d '{
    "tickers": ["BTC", "ETH", "SOL"],
    "portfolio": {
      "cash": 10000,
      "positions": {
        "BTC": {"long": 0.5, "short": 0, "long_cost_basis": 45000}
      }
    },
    "start_date": "2024-11-01",
    "end_date": "2024-12-10",
    "model_name": "llama-3.3-70b-versatile",
    "model_provider": "Groq"
  }'
```

## Integration with Node.js Backend

The Node.js backend calls this service via HTTP:

```typescript
const response = await axios.post('http://localhost:8000/api/analysis', {
  tickers: ['BTC', 'ETH'],
  portfolio: userPortfolio,
  model_name: 'llama-3.3-70b-versatile',  // Default
  model_provider: 'Groq'                   // Default
});
```

## Data Sources

- **Price Data**: CoinGecko API
- **Market Metrics**: CoinGecko API
- **On-chain Data**: (To be implemented with blockchain explorers)

## Environment Variables

All environment variables are configured in the **root `.env` file** (not in this directory):

- **`GROQ_API_KEY`** - Groq API key for Llama models (default provider, **required**)
- `OPENAI_API_KEY` - OpenAI API key for GPT models (optional)
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models (optional)
- `COINGECKO_API_KEY` - CoinGecko API key (optional, for higher rate limits)
- `AI_SERVICE_URL` - Service URL for backend integration (default: http://localhost:8000)

**Get a free Groq API key**: https://console.groq.com/keys

## Default LLM Model

The service uses **Llama 3.3 70B Versatile** via Groq by default. This model:
- Is extremely fast (Groq's inference is blazing fast)
- Has a generous free tier
- Performs well for financial analysis tasks
- Supports 128K context window

To use a different model, specify `model_name` and `model_provider` in your API requests.
