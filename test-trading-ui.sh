#!/bin/bash

echo "========================================"
echo "  Testing Trading UI Setup"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "  Run: cp .env.example .env"
    exit 1
fi
echo -e "${GREEN}✓ .env file exists${NC}"

# Check if Hyperliquid credentials are configured
if grep -q "0x\.\.\." .env; then
    echo -e "${YELLOW}⚠ Warning: Hyperliquid credentials not configured in .env${NC}"
    echo "  Edit .env and set:"
    echo "    - HYPERLIQUID_WALLET=0xYourMainWalletAddress"
    echo "    - HYPERLIQUID_API_PRIVATE_KEY=0xYourApiWalletPrivateKey"
    echo ""
    echo -e "${YELLOW}  Without valid credentials, you'll see empty data.${NC}"
    echo -e "${YELLOW}  You can still test the UI components though!${NC}"
    echo ""
else
    echo -e "${GREEN}✓ Hyperliquid credentials configured${NC}"
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${RED}✗ Dependencies not installed${NC}"
    echo "  Run: pnpm install"
    exit 1
fi
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""
echo "========================================"
echo "  How to Start the Servers"
echo "========================================"
echo ""
echo "1. Start Backend (in one terminal):"
echo "   ${GREEN}cd /home/user/nebulaX_exchange${NC}"
echo "   ${GREEN}pnpm --filter backend dev${NC}"
echo ""
echo "2. Start Frontend (in another terminal):"
echo "   ${GREEN}cd /home/user/nebulaX_exchange${NC}"
echo "   ${GREEN}pnpm --filter web dev${NC}"
echo ""
echo "3. Open browser:"
echo "   ${GREEN}http://localhost:5173${NC}"
echo ""
echo "========================================"
echo "  What to Expect"
echo "========================================"
echo ""
echo "With VALID Hyperliquid credentials:"
echo "  ✓ Live price updates"
echo "  ✓ Real-time orderbook"
echo "  ✓ Trading charts with candles"
echo "  ✓ Ability to place orders"
echo "  ✓ View positions & open orders"
echo ""
echo "Without credentials (or with testnet):"
echo "  ⚠ UI components will load"
echo "  ⚠ But data will be empty/loading"
echo "  ⚠ WebSocket will connect but no Hyperliquid data"
echo ""
echo "========================================"
echo "  Troubleshooting"
echo "========================================"
echo ""
echo "If you see 'Loading...' everywhere:"
echo "  1. Check backend logs for errors"
echo "  2. Verify Hyperliquid credentials in .env"
echo "  3. Open browser console (F12) for errors"
echo "  4. Check WebSocket connection in Network tab"
echo ""
echo "Common issues:"
echo "  • Authentication: Backend needs valid JWT_SECRET"
echo "  • Database: You may see DB errors (optional for testing)"
echo "  • CORS: Make sure FRONTEND_URL=http://localhost:5173"
echo ""
