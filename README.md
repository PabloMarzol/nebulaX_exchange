# NebulAX Exchange - Decentralized Cryptocurrency Trading Platform

A modern, non-custodial cryptocurrency exchange built with React, TypeScript, and Web3 technologies.

## Features

- 🚀 **Non-Custodial Trading** - Users maintain control of their assets
- 💱 **Crypto Swaps** - DEX aggregation via 0x Protocol
- 💰 **Fiat On-Ramp** - Buy crypto with fiat via OnRamp Money
- 📊 **Advanced Trading** - Real-time charts, order books, and trading interface
- 🤖 **AI Trading Assistant** - AI-powered market analysis and trading signals
- 🌐 **Multi-Chain Support** - Ethereum, Polygon, Arbitrum, and more
- 🎨 **Multiple Themes** - Dark, Light, and Cyber Punk themes

## Tech Stack

### Frontend
- React 18 + TypeScript
- Vite
- TailwindCSS + Radix UI
- React Query
- Viem + Wagmi
- TradingView Lightweight Charts

### Backend
- Node.js 20 + Express
- TypeScript
- PostgreSQL + Drizzle ORM
- Socket.io
- JWT Authentication

### Integrations
- **0x Protocol** - DEX aggregation
- **OnRamp Money** - Fiat on-ramp
- **Groq API** - AI trading assistant
- **Hyperliquid** - Trading (optional)

## Project Structure

```
nebulax-exchange/
├── apps/
│   └── web/              # Frontend application
├── backend/              # Backend API server
├── shared/
│   └── schema/           # Shared database schemas
├── packages/
│   ├── ui/               # Shared UI components
│   ├── config/           # Shared configuration
│   ├── types/            # Shared TypeScript types
│   └── utils/            # Shared utilities
└── docs/                 # Documentation
```

## Getting Started

### Prerequisites

- Node.js 20.x LTS
- PNPM 8.x+
- PostgreSQL 15+

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run database migrations
pnpm migrate

# Start development servers
pnpm dev:all
```

### Development

```bash
# Run frontend only
pnpm dev

# Run backend only
pnpm dev:backend

# Run both in parallel
pnpm dev:all

# Build for production
pnpm build

# Run tests
pnpm test

# Type check
pnpm type-check

# Lint
pnpm lint
```

## Documentation

- [Getting Started Guide](./docs/Project_Structure/GETTING_STARTED.md)
- [Project Structure](./docs/Project_Structure/NEW_PROJECT_STRUCTURE.md)
- [Architecture Decisions](./docs/Project_Structure/ARCHITECTURE_DECISIONS.md)
- [Tech Stack](./docs/Project_Structure/TECH_STACK.md)
- [System Design & Security](./docs/Project_Structure/SYSTEM_DESIGN_AND_SECURITY.md)
- [Implementation Checklist](./docs/Project_Structure/IMPLEMENTATION_CHECKLIST.md)

## Environment Variables

See `.env.example` for required environment variables.

## License

MIT

## Contributing

Please read our contributing guidelines before submitting PRs.
