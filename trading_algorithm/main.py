# main.py
import asyncio
import os
import argparse
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Import from correct locations
from trading_system.bill_ackman import BillAckmanAgent
from trading_system.michael_burry import MichaelBurryAgent
from trading_system.technical_analyst import TechnicalAnalystAgent
from trading_system.mixgo import MixGoAgent
from signals.brokers.alpaca import AlpacaBroker
from signals.brokers.mock import MockBroker
from signals.data.fetcher import DataFetcher
from signals.llm.client import LLMClient
from signals.utils.progress import progress
from signals.screener.alpaca_screener import AlpacaScreener

# Load environment variables
load_dotenv()

async def run_mixgo(args):
    """Run the MixGo trading system."""
    # Initialize progress tracking
    progress.start()
    
    try:
        # Parse tickers or use screener
        if args.tickers:
            # Use manually specified tickers
            tickers = args.tickers.split(",")
            print(f"Using manually specified tickers: {', '.join(tickers)}")
        else:
            # Use dynamic stock screener
            print("\n🎯 No tickers specified, using dynamic stock screener...")
            
            # Initialize screener (will use broker connection once available)
            screener = None
            
            # We'll initialize the screener after broker connection is established
            # For now, use default tickers and update later
            tickers = ["AAPL", "MSFT", "GOOGL"]  # Temporary, will be replaced by screener
        
        # Set dates - ensure we have both start and end dates
        if args.end_date:
            end_date = args.end_date
        else:
            # Use current date in YYYY-MM-DD format
            end_date = datetime.now().strftime("%Y-%m-%d")

        if args.start_date:
            start_date = args.start_date
        else:
            # Calculate start date (30 days before end date)
            start_date_dt = datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=30)
            start_date = start_date_dt.strftime("%Y-%m-%d")

        print(f"Analysis period: {start_date} to {end_date}")
        print(f"Analyzing tickers: {', '.join(tickers)}")
        
        # Initialize components
        data_fetcher = DataFetcher(use_cache=True)
        
        # Initialize broker
        if args.mock:
            broker = MockBroker()
            await broker.connect({})
            print("Using mock broker for trading simulation")
            
            # For mock broker, use default screening or manual tickers
            if not args.tickers:
                print("\n🎆 Mock broker detected, using default high-quality stocks for screening simulation")
                tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"][:args.max_stocks or 5]
                print(f"Selected tickers for mock trading: {', '.join(tickers)}")
        else:
            broker = AlpacaBroker()
            # Connect to broker
            broker_connected = await broker.connect({
                "api_key": os.getenv("ALPACA_API_KEY"),
                "api_secret": os.getenv("ALPACA_API_SECRET"),
                "base_url": os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets/")
            })
            
            if not broker_connected:
                print("Failed to connect to Alpaca broker. Check your API credentials.")
                return
            
            print("Connected to Alpaca broker successfully")
            
            # Initialize screener with broker connection if no manual tickers specified
            if not args.tickers:
                print("\n🎆 Initializing stock screener with broker connection...")
                screener = AlpacaScreener(broker=broker)
                
                # Screen for stocks dynamically
                try:
                    screened_stocks = screener.screen_stocks(
                        max_stocks=args.max_stocks or 5,
                        include_active=True,
                        include_movers=True,
                        include_news=True
                    )
                    
                    if screened_stocks:
                        tickers = [stock.symbol for stock in screened_stocks]
                        print(f"\n✅ Screener selected: {', '.join(tickers)}")
                    else:
                        print("\n⚠️ Screener found no stocks, using defaults")
                        tickers = screener.get_default_tickers()[:5]
                        
                except Exception as e:
                    print(f"\n⚠️ Error in stock screening: {e}")
                    print("Using default tickers as fallback")
                    tickers = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
        
        data_fetcher.broker = broker

        # Get account info and positions
        account_info = await broker.get_account_info()
        positions = await broker.get_positions()
        
        print(f"Account cash balance: ${float(account_info['cash']):,.2f}")
        print(f"Current positions: {len(positions)}")
        
        # # DEBUG: Print actual position data from Alpaca
        # print(f"\n🔍 DEBUG - Raw Alpaca positions:")
        # for i, pos in enumerate(positions):
        #     print(f"   Position {i}: {type(pos)}")
        #     print(f"   Attributes: {dir(pos)}")
        #     if hasattr(pos, 'symbol'):
        #         print(f"   Symbol: {pos.symbol}")
        #     if hasattr(pos, 'ticker'):
        #         print(f"   Ticker: {pos.ticker}")
        #     if hasattr(pos, 'qty'):
        #         print(f"   Qty: {pos.qty}")
        #     if hasattr(pos, 'avg_entry_price'):
        #         print(f"   Avg entry price: {pos.avg_entry_price}")
        #     if hasattr(pos, 'direction'):
        #         print(f"   Direction: {pos.direction}")
        #     if hasattr(pos, 'quantity'):
        #         print(f"   Quantity: {pos.quantity}")
        #     if hasattr(pos, 'average_price'):
        #         print(f"   Average price: {pos.average_price}")
        #     print(f"   ---")
        
        # Create portfolio dictionary
        portfolio = {
            "cash": float(account_info["cash"]),
            "margin_requirement": 0.5,  # 50% margin requirement
            "margin_used": 0.0,
            "positions": {}
        }
        
        # Initialize positions from actual Alpaca format
        print(f"\n🔍 DEBUG - Processing {len(positions)} positions:")
        for position in positions:
            # Get data from our Position model
            ticker = position.ticker
            direction = position.direction  # "long" or "short"
            quantity = position.quantity
            avg_price = position.average_price
            
            print(f"   Processing {ticker}: {direction} {quantity} shares at ${avg_price}")
            
            # Initialize position structure
            if ticker not in portfolio["positions"]:
                portfolio["positions"][ticker] = {
                    "long": 0,
                    "short": 0,
                    "long_cost_basis": 0.0,
                    "short_cost_basis": 0.0,
                    "short_margin_used": 0.0
                }
            
            # Set position based on direction
            if direction == "long":
                portfolio["positions"][ticker]["long"] = quantity
                portfolio["positions"][ticker]["long_cost_basis"] = avg_price
                print(f"     ✅ Set long position: {quantity} shares at ${avg_price}")
            elif direction == "short":
                portfolio["positions"][ticker]["short"] = quantity
                portfolio["positions"][ticker]["short_cost_basis"] = avg_price
                # Calculate margin used (50% of position value)
                margin = quantity * avg_price * 0.5
                portfolio["positions"][ticker]["short_margin_used"] = margin
                portfolio["margin_used"] += margin
                print(f"     ✅ Set short position: {quantity} shares at ${avg_price}")
        
        print(f"\n🔍 DEBUG - Final portfolio positions:")
        for ticker, pos in portfolio["positions"].items():
            print(f"   {ticker}: {pos}")
        
        # Prefetch necessary data to avoid rate limiting during analysis
        print("Pre-fetching market data...")
        prefetch_tasks = []
        for ticker in tickers:
            # Pass both the data_fetcher and broker to the prefetch function
            prefetch_tasks.append(asyncio.create_task(
                prefetch_ticker_data(data_fetcher, broker, ticker, start_date, end_date)
            ))

        # Wait for all prefetch tasks to complete
        await asyncio.gather(*prefetch_tasks)
        
        # Create agents
        ackman_agent = BillAckmanAgent()
        burry_agent = MichaelBurryAgent()
        technical_agent = TechnicalAnalystAgent()
        
        # Create LLM client
        model_name = args.model or "meta-llama/llama-4-scout-17b-16e-instruct"  # Updated default model
        model_provider = args.provider or "Groq"
        
        print(f"Using LLM: {model_name} from {model_provider}")
        llm_client = LLMClient(
            model_name=model_name,
            model_provider=model_provider
        )
        
        # Create MixGo agent
        mixgo_agent = MixGoAgent(
            llm_client=llm_client,
            agents=[ackman_agent, burry_agent, technical_agent]
        )
        
        # Run analysis
        progress.update_status("mixgo", None, "Running analysis")
        print("Generating trading decisions...")
        
        try:
            decisions = await mixgo_agent.analyze(
                tickers=tickers,
                data_fetcher=data_fetcher,
                portfolio=portfolio,
                end_date=end_date,
                start_date=start_date
            )
        except Exception as e:
            print(f"Error generating trading decisions: {e}")
            return
        
        # Display results
        print("\n\n===== TRADING DECISIONS =====")
        for ticker, decision in decisions.items():
            print(f"\n{ticker}:")
            print(f"  Action: {decision.action.upper()}")
            print(f"  Quantity: {decision.quantity}")
            print(f"  Confidence: {decision.confidence:.1f}%")
            print(f"  Reasoning: {decision.reasoning[:200]}..." if len(decision.reasoning) > 200 else f"  Reasoning: {decision.reasoning}")
        
        # Execute trades if not in dry run mode
        if not args.dry_run and not args.mock:
            print("\n\n===== EXECUTING TRADES =====")
            for ticker, decision in decisions.items():
                if decision.action != "hold" and decision.quantity > 0:
                    try:
                        print(f"Executing {decision.action} order for {decision.quantity} shares of {ticker}...")
                        order = await broker.place_order(
                            ticker=ticker,
                            direction=decision.action,
                            quantity=decision.quantity,
                            order_type="market"
                        )
                        print(f"Order placed: {order.order_id} - Status: {order.status}")
                    except Exception as e:
                        print(f"Error executing trade: {e}")
    
    finally:
        # Always stop progress tracking
        progress.stop()

async def prefetch_ticker_data(data_fetcher, broker, ticker, start_date, end_date):
    """Prefetch data for a ticker with rate limiting"""
    # Implement rate limiting for API calls
    semaphore = asyncio.Semaphore(1)  # Only 1 request at a time per ticker
    
    async def fetch_with_rate_limit(func, *args, **kwargs):
        async with semaphore:
            try:
                result = func(*args, **kwargs)
                # Add delay to avoid throttling
                await asyncio.sleep(1)
                return result
            except Exception as e:
                print(f"Error fetching data for {ticker}: {e}")
                # Add longer delay on error
                await asyncio.sleep(2)
                return None
    
    # Get price data directly from Alpaca
    progress.update_status("data_fetcher", ticker, "Fetching price data from Alpaca")
    price_df = data_fetcher.get_prices_from_alpaca(ticker, start_date, end_date, broker)
    
    # Continue with other data from financial datasets API
    progress.update_status("data_fetcher", ticker, "Fetching financial metrics")
    await fetch_with_rate_limit(data_fetcher.get_financial_metrics, ticker, end_date)
    
    # Use valid line items only
    line_items = [
        "revenue",
        "net_income",
        "earnings_per_share",
        "free_cash_flow",
        "operating_margin",
        "gross_margin",
        "debt_to_equity",
        "cash_and_equivalents",
        "total_debt",
        "total_assets",
        "total_liabilities",
        "outstanding_shares"
    ]
    
    progress.update_status("data_fetcher", ticker, "Fetching financial line items")
    await fetch_with_rate_limit(
        data_fetcher.get_line_items,
        ticker, 
        end_date,
        line_items=line_items
    )
    
    progress.update_status("data_fetcher", ticker, "Fetching insider trades")
    await fetch_with_rate_limit(
        data_fetcher.get_insider_trades,
        ticker,
        end_date,
        start_date=start_date
    )
    
    progress.update_status("data_fetcher", ticker, "Fetching company news")
    await fetch_with_rate_limit(
        data_fetcher.get_company_news,
        ticker,
        end_date,
        start_date=start_date
    )
    
    progress.update_status("data_fetcher", ticker, "Data prefetch complete")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MixGo Trading System")
    parser.add_argument("--tickers", type=str, help="Comma-separated list of tickers to trade (if not provided, uses dynamic screener)")
    parser.add_argument("--max-stocks", type=int, default=5, help="Maximum number of stocks to screen (default: 5)")
    parser.add_argument("--start-date", type=str, help="Start date for analysis (YYYY-MM-DD)")
    parser.add_argument("--end-date", type=str, help="End date for analysis (YYYY-MM-DD)")
    parser.add_argument("--mock", action="store_true", help="Use mock broker for testing")
    parser.add_argument("--dry-run", action="store_true", help="Don't execute trades, just analyze")
    parser.add_argument("--model", type=str, help="LLM model to use")
    parser.add_argument("--provider", type=str, help="LLM provider (Groq, OpenAI, Anthropic)")
    
    args = parser.parse_args()
    
    # Run the application
    asyncio.run(run_mixgo(args))