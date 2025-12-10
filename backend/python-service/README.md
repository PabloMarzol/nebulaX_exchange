# AI Trading Analysis Service

Python FastAPI microservice for AI-powered crypto portfolio analysis and trading signal generation.

## Features

- **Multi-Agent AI System**: Integrates signals from multiple trading agents
  - Bill Ackman Agent (Value Investing)
  - Michael Burry Agent (Contrarian)
  - Technical Analyst Agent
  - Risk Manager

- **LLM Meta-Reasoning**: Uses GPT-4/Llama to synthesize agent signals
- **Crypto Data Adapter**: Fetches crypto market data from CoinGecko
- **Portfolio Analytics**: Calculate risk metrics and portfolio health
- **RESTful API**: FastAPI with automatic OpenAPI documentation

## Setup

### Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your API keys
```

3. Run the service:
```bash
uvicorn app.main:app --reload
```

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
docker run -p 8000:8000 --env-file .env ai-trading-service
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
    "model_name": "gpt-4o",
    "model_provider": "OpenAI"
  }'
```

## Integration with Node.js Backend

The Node.js backend calls this service via HTTP:

```typescript
const response = await axios.post('http://python-service:8000/api/analysis', {
  tickers: ['BTC', 'ETH'],
  portfolio: userPortfolio
});
```

## Data Sources

- **Price Data**: CoinGecko API
- **Market Metrics**: CoinGecko API
- **On-chain Data**: (To be implemented with blockchain explorers)

## Environment Variables

- `OPENAI_API_KEY` - OpenAI API key for GPT models
- `GROQ_API_KEY` - Groq API key for Llama models
- `ANTHROPIC_API_KEY` - Anthropic API key for Claude models
- `COINGECKO_API_KEY` - CoinGecko API key (optional)
- `PORT` - Service port (default: 8000)
- `LOG_LEVEL` - Logging level (default: INFO)
