import asyncio
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

async def test_run():
    """Run MixGo with test parameters."""
    from main import run_mixgo
    from argparse import Namespace
    
    # Create test arguments
    args = Namespace(
        tickers="AAPL,MSFT,GOOGL",
        start_date="2023-01-01",
        end_date="2024-01-01",
        mock=True,
        dry_run=True,
        model="llama-3.3-70b-versatile", 
        provider="Groq"
    )
    
    # Run MixGo
    await run_mixgo(args)

if __name__ == "__main__":
    asyncio.run(test_run())