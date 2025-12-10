# backtester.py
import asyncio
from colorama import Fore, Style
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from tqdm import tqdm
import itertools
import os
import time
import random
from dotenv import load_dotenv
import alpaca_trade_api as tradeapi

# Load environment variables
load_dotenv()

from trading_system.mixgo import MixGoAgent
from trading_system.bill_ackman import BillAckmanAgent
from trading_system.michael_burry import MichaelBurryAgent
from trading_system.technical_analyst import TechnicalAnalystAgent
from signals.data.fetcher import DataFetcher
from signals.brokers.mock import MockBroker
from signals.llm.client import LLMClient
from signals.utils.progress import progress

class Backtester:
    """
    Backtesting system for MixGo trading strategies.
    """
    
    def __init__(
        self,
        tickers: list[str],
        start_date: str,
        end_date: str,
        initial_capital: float,
        model_name: str = "meta-llama/llama-4-scout-17b-16e-instruct", 
        model_provider: str = "Groq",
        #fallback_model: str = "meta-llama/llama-4-scout-17b-16e-instruct",  
        #fallback_provider: str = "Groq",
        initial_margin_requirement: float = 0.0
    ):
        """Initialize the backtester."""
        self.tickers = tickers
        self.start_date = start_date
        self.end_date = end_date
        self.initial_capital = initial_capital
        self.model_name = model_name
        self.model_provider = model_provider
        self.initial_margin_requirement = initial_margin_requirement
        
        self.llm_client = LLMClient(model_name, model_provider)
        #self.fallback_llm_client = LLMClient(fallback_model, fallback_provider)

        # Initialize portfolio
        self.portfolio = {
            "cash": initial_capital,
            "margin_used": 0.0,
            "margin_requirement": initial_margin_requirement,
            "positions": {
                ticker: {
                    "long": 0,
                    "short": 0,
                    "long_cost_basis": 0.0,
                    "short_cost_basis": 0.0,
                    "short_margin_used": 0.0
                } for ticker in tickers
            },
            "realized_gains": {
                ticker: {
                    "long": 0.0,
                    "short": 0.0,
                } for ticker in tickers
            }
        }
        
        # Initialize components
        self.data_fetcher = DataFetcher(use_cache=True)
        self.llm_client = LLMClient(model_name, model_provider)
        
        # Initialize Alpaca API directly
        self.alpaca_api = tradeapi.REST(
            os.getenv("ALPACA_API_KEY"),
            os.getenv("ALPACA_API_SECRET"),
            os.getenv("ALPACA_BASE_URL", "https://paper-api.alpaca.markets"),
            api_version="v2"
        )
        
        # Initialize agents
        self.michael_burry_agent = MichaelBurryAgent()
        self.bill_ackman_agent = BillAckmanAgent()
        self.technical_agent = TechnicalAnalystAgent()
        
        # Initialize MixGo agent
        self.mixgo_agent = MixGoAgent(
            llm_client=self.llm_client,
            agents=[self.michael_burry_agent, self.bill_ackman_agent, self.technical_agent]
        )
        
        # Track performance
        self.portfolio_values = []
        self.performance_metrics = {
            "sharpe_ratio": 0.0,
            "sortino_ratio": 0.0,
            "max_drawdown": 0.0,
            "max_drawdown_date": None
        }
                
    async def _fetch_with_rate_limit(self, fetch_func, *args, **kwargs):
        """
        Fetch data with rate limit handling.
        
        Args:
            fetch_func: The function to call
            *args, **kwargs: Arguments to pass to the function
            
        Returns:
            The result of the function call
        """
        max_retries = 5
        base_delay = 2  # seconds
        
        for attempt in range(max_retries):
            try:
                result = fetch_func(*args, **kwargs)
                return result
            except Exception as e:
                # Check if it's a rate limit error (429)
                if "429" in str(e) or "throttled" in str(e).lower():
                    # Extract the wait time if available
                    wait_time = 0
                    try:
                        if "Expected available in" in str(e):
                            # Try to extract the number of seconds
                            wait_str = str(e).split("Expected available in")[1]
                            wait_seconds = int(wait_str.split("seconds")[0].strip())
                            wait_time = wait_seconds + 1  # Add 1 second buffer
                    except:
                        # If extraction fails, use exponential backoff
                        wait_time = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    
                    # If no specific wait time was found, use exponential backoff
                    if wait_time <= 0:
                        wait_time = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    
                    print(f"Rate limited. Waiting for {wait_time:.1f} seconds before retry...")
                    await asyncio.sleep(wait_time)
                else:
                    # If it's not a rate limit error, print it but continue
                    print(f"Error in {fetch_func.__name__}: {e}")
                    return None
                    
        print(f"Max retries exceeded for {fetch_func.__name__}")
        return None
        
    async def run_backtest(self):
        """Run the backtest over the specified date range."""
        # Generate trading day dates
        date_range = pd.date_range(self.start_date, self.end_date, freq='B')
        progress.start()
        
        try:
            # Prefetch data
            await self._prefetch_data()
            
            # Initialize portfolio values
            self.portfolio_values = [{
                "Date": date_range[0],
                "Portfolio Value": self.initial_capital
            }]
            
            # Run through each trading day
            for current_date in tqdm(date_range, desc="Backtesting"):
                # Generate lookback period (30 days before current date)
                lookback_start = (current_date - timedelta(days=30)).strftime("%Y-%m-%d")
                current_date_str = current_date.strftime("%Y-%m-%d")
                
                # Get current prices
                current_prices = await self._get_prices_for_date(current_date_str)
                if not current_prices:
                    continue
                
                # Generate trading decisions
                try:
                    decisions = await self.mixgo_agent.analyze(
                        tickers=self.tickers,
                        data_fetcher=self.data_fetcher,
                        portfolio=self.portfolio,
                        end_date=current_date_str,
                        start_date=lookback_start
                        #fallback_llm_client = "meta-llama/llama-4-scout-17b-16e-instruct",
                    )
                    for ticker, decision in decisions.items():
                        if decision.action != "hold":
                            print(f"{current_date_str} | {ticker}: {decision.action.upper()} {decision.quantity} shares @ {current_prices.get(ticker, 0):.2f} | Confidence: {decision.confidence:.1f}%")
                except Exception as e:
                    print(f"Error generating decisions for {current_date_str}: {e}")
                    # Skip this day and continue
                    continue
                
                # Execute trades
                for ticker, decision in decisions.items():
                    if decision.action != "hold" and decision.quantity > 0:
                        self._execute_trade(
                            ticker=ticker,
                            action=decision.action,
                            quantity=decision.quantity,
                            current_price=current_prices.get(ticker, 0)
                        )
                
                # Update portfolio value
                portfolio_value = self._calculate_portfolio_value(current_prices)
                self.portfolio_values.append({
                    "Date": current_date,
                    "Portfolio Value": portfolio_value
                })
            
            # Calculate performance metrics
            self._calculate_performance_metrics()
            
            return self.portfolio_values
        
        finally:
            progress.stop()
    
    async def _prefetch_data(self):
        """Prefetch necessary data for the backtest period."""
        print("\nPre-fetching data for the entire backtest period...")
        
        # Ensure we fetch data from 1 year before start date for better calculations
        prefetch_start = (datetime.strptime(self.start_date, "%Y-%m-%d") - timedelta(days=365)).strftime("%Y-%m-%d")
        
        # Store price data directly in a dictionary
        self.price_cache = {}
        
        for ticker in tqdm(self.tickers, desc="Fetching data"):
            # Get price data with direct Alpaca API call
            try:
                # Use Alpaca directly for price data
                price_df = self.get_alpaca_prices(ticker, prefetch_start, self.end_date)
                
                # Store the price data directly in our own cache
                if not price_df.empty:
                    self.price_cache[ticker] = price_df
                    
            except Exception as e:
                print(f"Error prefetching price data for {ticker}: {e}")
            
            # Add delay between API calls
            await asyncio.sleep(1)
            
            # Get fundamental data
            try:
                # These calls still use the financial datasets API
                self.data_fetcher.get_financial_metrics(ticker, self.end_date, limit=10)
                
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
                
                self.data_fetcher.get_line_items(ticker, self.end_date, line_items=line_items)
                self.data_fetcher.get_insider_trades(ticker, self.end_date, start_date=prefetch_start)
                self.data_fetcher.get_company_news(ticker, self.end_date, start_date=prefetch_start)
            except Exception as e:
                print(f"Error prefetching fundamental data for {ticker}: {e}")
            
            # Add delay between tickers
            await asyncio.sleep(2)
    
    async def _get_prices_for_date(self, date_str):
        """Get prices for all tickers for a specific date."""
        prices = {}
        target_date = datetime.strptime(date_str, "%Y-%m-%d")
        
        for ticker in self.tickers:
            try:
                # First check our internal price cache
                if hasattr(self, 'price_cache') and ticker in self.price_cache:
                    price_df = self.price_cache[ticker]
                    
                    # Find closest date in the DataFrame
                    if not price_df.empty:
                        # Convert index to dates if it's a datetime index
                        dates = price_df.index
                        if isinstance(dates[0], pd.Timestamp):
                            dates = [d.date() for d in dates]
                        else:
                            dates = [datetime.strptime(str(d), "%Y-%m-%d").date() for d in dates]
                        
                        # Find closest date
                        target_date_only = target_date.date()
                        date_diffs = [abs((d - target_date_only).days) for d in dates]
                        closest_idx = date_diffs.index(min(date_diffs))
                        
                        if date_diffs[closest_idx] <= 5:  # Within 5 days
                            prices[ticker] = float(price_df.iloc[closest_idx]["close"])
                            continue
                
                # If not in cache or not close enough, get from Alpaca
                start_date = (target_date - timedelta(days=5)).strftime("%Y-%m-%d")
                end_date = (target_date + timedelta(days=1)).strftime("%Y-%m-%d")
                price_df = self.get_alpaca_prices(ticker, start_date, end_date)
                
                if not price_df.empty:
                    latest_price = float(price_df["close"].iloc[-1])
                    prices[ticker] = latest_price
                else:
                    # If no data found, use a safe default price
                    print(f"No price data found for {ticker} on {date_str}. Using default price.")
                    prices[ticker] = 100.0
                    
            except Exception as e:
                print(f"Error getting price for {ticker} on {date_str}: {e}")
                prices[ticker] = 100.0  # Default price as fallback
        
        return prices
    
    def _execute_trade(self, ticker, action, quantity, current_price):
        """Execute a trade in the portfolio."""
        if quantity <= 0 or current_price <= 0:
            return 0

        quantity = int(quantity)  # Force integer shares
        position = self.portfolio["positions"][ticker]

        if action == "buy":
            cost = quantity * current_price
            if cost <= self.portfolio["cash"]:
                # Weighted average cost basis for the new total
                old_shares = position["long"]
                old_cost_basis = position["long_cost_basis"]
                new_shares = quantity
                total_shares = old_shares + new_shares

                if total_shares > 0:
                    total_old_cost = old_cost_basis * old_shares
                    total_new_cost = cost
                    position["long_cost_basis"] = (total_old_cost + total_new_cost) / total_shares

                position["long"] += quantity
                self.portfolio["cash"] -= cost
                return quantity
            else:
                # Calculate maximum affordable quantity
                max_quantity = int(self.portfolio["cash"] / current_price)
                if max_quantity > 0:
                    cost = max_quantity * current_price
                    old_shares = position["long"]
                    old_cost_basis = position["long_cost_basis"]
                    total_shares = old_shares + max_quantity

                    if total_shares > 0:
                        total_old_cost = old_cost_basis * old_shares
                        total_new_cost = cost
                        position["long_cost_basis"] = (total_old_cost + total_new_cost) / total_shares

                    position["long"] += max_quantity
                    self.portfolio["cash"] -= cost
                    return max_quantity
                return 0

        elif action == "sell":
            # You can only sell as many as you own
            quantity = min(quantity, position["long"])
            if quantity > 0:
                # Realized gain/loss using average cost basis
                avg_cost_per_share = position["long_cost_basis"] if position["long"] > 0 else 0
                realized_gain = (current_price - avg_cost_per_share) * quantity
                self.portfolio["realized_gains"][ticker]["long"] += realized_gain

                position["long"] -= quantity
                self.portfolio["cash"] += quantity * current_price

                if position["long"] == 0:
                    position["long_cost_basis"] = 0.0

                return quantity

        elif action == "short":
            """
            Typical short sale flow:
            1) Receive proceeds = current_price * quantity
            2) Post margin_required = proceeds * margin_ratio
            3) Net effect on cash = +proceeds - margin_required
            """
            proceeds = current_price * quantity
            margin_required = proceeds * self.portfolio["margin_requirement"]
            if margin_required <= self.portfolio["cash"]:
                # Weighted average short cost basis
                old_short_shares = position["short"]
                old_cost_basis = position["short_cost_basis"]
                new_shares = quantity
                total_shares = old_short_shares + new_shares

                if total_shares > 0:
                    total_old_cost = old_cost_basis * old_short_shares
                    total_new_cost = current_price * new_shares
                    position["short_cost_basis"] = (total_old_cost + total_new_cost) / total_shares

                position["short"] += quantity

                # Update margin usage
                position["short_margin_used"] += margin_required
                self.portfolio["margin_used"] += margin_required

                # Increase cash by proceeds, then subtract the required margin
                self.portfolio["cash"] += proceeds
                self.portfolio["cash"] -= margin_required
                return quantity
            else:
                # Calculate maximum shortable quantity
                margin_ratio = self.portfolio["margin_requirement"]
                if margin_ratio > 0:
                    max_quantity = int(self.portfolio["cash"] / (current_price * margin_ratio))
                else:
                    max_quantity = 0

                if max_quantity > 0:
                    proceeds = current_price * max_quantity
                    margin_required = proceeds * margin_ratio

                    old_short_shares = position["short"]
                    old_cost_basis = position["short_cost_basis"]
                    total_shares = old_short_shares + max_quantity

                    if total_shares > 0:
                        total_old_cost = old_cost_basis * old_short_shares
                        total_new_cost = current_price * max_quantity
                        position["short_cost_basis"] = (total_old_cost + total_new_cost) / total_shares

                    position["short"] += max_quantity
                    position["short_margin_used"] += margin_required
                    self.portfolio["margin_used"] += margin_required

                    self.portfolio["cash"] += proceeds
                    self.portfolio["cash"] -= margin_required
                    return max_quantity
                return 0

        elif action == "cover":
            """
            When covering shares:
            1) Pay cover cost = current_price * quantity
            2) Release a proportional share of the margin
            3) Net effect on cash = -cover_cost + released_margin
            """
            quantity = min(quantity, position["short"])
            if quantity > 0:
                cover_cost = quantity * current_price
                avg_short_price = position["short_cost_basis"] if position["short"] > 0 else 0
                realized_gain = (avg_short_price - current_price) * quantity

                if position["short"] > 0:
                    portion = quantity / position["short"]
                else:
                    portion = 1.0

                margin_to_release = portion * position["short_margin_used"]

                position["short"] -= quantity
                position["short_margin_used"] -= margin_to_release
                self.portfolio["margin_used"] -= margin_to_release

                # Pay the cost to cover, but get back the released margin
                self.portfolio["cash"] += margin_to_release
                self.portfolio["cash"] -= cover_cost

                self.portfolio["realized_gains"][ticker]["short"] += realized_gain

                if position["short"] == 0:
                    position["short_cost_basis"] = 0.0
                    position["short_margin_used"] = 0.0

                return quantity

        return 0
    
    def _calculate_portfolio_value(self, current_prices):
        """Calculate total portfolio value."""
        total_value = self.portfolio["cash"]

        for ticker in self.tickers:
            position = self.portfolio["positions"][ticker]
            price = current_prices.get(ticker, 0)
            if price > 0:
                # Long position value
                long_value = position["long"] * price
                total_value += long_value

                # Short position unrealized PnL = short_shares * (short_cost_basis - current_price)
                if position["short"] > 0:
                    total_value += position["short"] * (position["short_cost_basis"] - price)

        return total_value
    
    def _calculate_performance_metrics(self):
        """Calculate performance metrics for the backtest using polars."""
        import polars as pl
        
        # Convert portfolio values to a polars DataFrame
        values_df = pl.from_dicts(self.portfolio_values)
        
        # Calculate daily returns
        with pl.Config(numeric_overflow="ignore"):
            values_df = values_df.with_columns(
                pl.col("Portfolio Value").pct_change().alias("Daily Return")
            )
        
        # Drop null values from the daily returns
        clean_returns = values_df.filter(pl.col("Daily Return").is_not_null())
        
        if clean_returns.height < 2:
            return  # not enough data points

        # Assumes 252 trading days/year
        daily_risk_free_rate = 0.0434 / 252
        
        # Calculate excess returns
        clean_returns = clean_returns.with_columns(
            (pl.col("Daily Return") - daily_risk_free_rate).alias("Excess Return")
        )
        
        # Extract statistics
        mean_excess_return = clean_returns.select(pl.col("Excess Return").mean()).item()
        std_excess_return = clean_returns.select(pl.col("Excess Return").std()).item()

        # Sharpe ratio
        if std_excess_return > 1e-12:
            self.performance_metrics["sharpe_ratio"] = np.sqrt(252) * (mean_excess_return / std_excess_return)
        else:
            self.performance_metrics["sharpe_ratio"] = 0.0

        # Sortino ratio
        negative_returns = clean_returns.filter(pl.col("Excess Return") < 0)
        if negative_returns.height > 0:
            downside_std = negative_returns.select(pl.col("Excess Return").std()).item()
            if downside_std > 1e-12:
                self.performance_metrics["sortino_ratio"] = np.sqrt(252) * (mean_excess_return / downside_std)
            else:
                self.performance_metrics["sortino_ratio"] = float('inf') if mean_excess_return > 0 else 0
        else:
            self.performance_metrics["sortino_ratio"] = float('inf') if mean_excess_return > 0 else 0

        # Maximum drawdown calculation
        values = values_df.select("Portfolio Value").to_series().to_list()
        dates = values_df.select("Date").to_series().to_list()
        
        max_drawdown = 0
        peak_value = values[0]
        peak_date = dates[0]
        
        for i in range(1, len(values)):
            if values[i] > peak_value:
                peak_value = values[i]
                peak_date = dates[i]
            else:
                drawdown = (values[i] - peak_value) / peak_value
                if drawdown < max_drawdown:
                    max_drawdown = drawdown
                    self.performance_metrics["max_drawdown_date"] = peak_date.strftime('%Y-%m-%d') if hasattr(peak_date, 'strftime') else str(peak_date)
        
        self.performance_metrics["max_drawdown"] = max_drawdown * 100 
    
    def analyze_performance(self):
        """Creates a performance DataFrame, prints summary stats, and plots equity curve."""
        import polars as pl
        
        if not self.portfolio_values:
            print("No portfolio data found. Please run the backtest first.")
            return None

        # Convert to polars DataFrame
        performance_df = pl.from_dicts(self.portfolio_values)
        if performance_df.is_empty():
            print("No valid performance data to analyze.")
            return performance_df

        # Basic stats calculation
        final_portfolio_value = performance_df.select(pl.col("Portfolio Value").last()).item()
        total_return = ((final_portfolio_value - self.initial_capital) / self.initial_capital) * 100

        print(f"\n{Fore.WHITE}{Style.BRIGHT}PORTFOLIO PERFORMANCE SUMMARY:{Style.RESET_ALL}")
        print(f"Total Return: {Fore.GREEN if total_return >= 0 else Fore.RED}{total_return:.2f}%{Style.RESET_ALL}")
        
        # Print realized P&L for informational purposes only
        total_realized_gains = sum(
            self.portfolio["realized_gains"][ticker]["long"] + 
            self.portfolio["realized_gains"][ticker]["short"] 
            for ticker in self.tickers
        )
        print(f"Total Realized Gains/Losses: {Fore.GREEN if total_realized_gains >= 0 else Fore.RED}${total_realized_gains:,.2f}{Style.RESET_ALL}")

        # Print performance metrics
        print(f"\nSharpe Ratio: {Fore.YELLOW}{self.performance_metrics.get('sharpe_ratio', 0.0):.2f}{Style.RESET_ALL}")
        
        # Maximum Drawdown
        max_drawdown = self.performance_metrics.get('max_drawdown', 0.0)
        max_drawdown_date = self.performance_metrics.get('max_drawdown_date')
        if max_drawdown_date:
            print(f"Maximum Drawdown: {Fore.RED}{abs(max_drawdown):.2f}%{Style.RESET_ALL} (on {max_drawdown_date})")
        else:
            print(f"Maximum Drawdown: {Fore.RED}{abs(max_drawdown):.2f}%{Style.RESET_ALL}")

        # Calculate daily returns directly with polars
        with pl.Config(numeric_overflow="ignore"):
            performance_df = performance_df.with_columns(
                pl.col("Portfolio Value").pct_change().alias("Daily Return")
            )

        # Convert to pandas just for plotting (matplotlib works better with pandas)
        # This is the only place we use pandas, and only for visualization
        import pandas as pd
        pd_df = performance_df.to_pandas()
        pd_df = pd_df.set_index("Date")

        # Plot the portfolio value over time
        plt.figure(figsize=(12, 6))
        plt.plot(pd_df.index, pd_df["Portfolio Value"], color="blue")
        plt.title("Portfolio Value Over Time")
        plt.ylabel("Portfolio Value ($)")
        plt.xlabel("Date")
        plt.grid(True)
        plt.show()

        # Calculate performance metrics with polars
        # Win Rate
        daily_returns = performance_df.filter(pl.col("Daily Return").is_not_null())
        winning_days = daily_returns.filter(pl.col("Daily Return") > 0).height
        total_days = daily_returns.height
        win_rate = (winning_days / max(total_days, 1)) * 100
        print(f"Win Rate: {Fore.GREEN}{win_rate:.2f}%{Style.RESET_ALL}")

        # Average Win/Loss Ratio
        positive_returns = daily_returns.filter(pl.col("Daily Return") > 0)
        negative_returns = daily_returns.filter(pl.col("Daily Return") < 0)
        
        avg_win = positive_returns.select(pl.col("Daily Return").mean()).item() if positive_returns.height > 0 else 0
        avg_loss = abs(negative_returns.select(pl.col("Daily Return").mean()).item()) if negative_returns.height > 0 else 0
        
        if avg_loss != 0:
            win_loss_ratio = avg_win / avg_loss
        else:
            win_loss_ratio = float('inf') if avg_win > 0 else 0
        print(f"Win/Loss Ratio: {Fore.GREEN}{win_loss_ratio:.2f}{Style.RESET_ALL}")

        # For max consecutive wins/losses, we'll need to use a custom approach
        # This is more complex with polars, so we'll calculate it directly
        returns_binary = daily_returns.select(
            pl.when(pl.col("Daily Return") > 0).then(1).otherwise(0).alias("is_win")
        ).to_series().to_list()
        
        max_consecutive_wins = 0
        max_consecutive_losses = 0
        current_wins = 0
        current_losses = 0
        
        for r in returns_binary:
            if r == 1:
                current_wins += 1
                current_losses = 0
                max_consecutive_wins = max(max_consecutive_wins, current_wins)
            else:
                current_losses += 1
                current_wins = 0
                max_consecutive_losses = max(max_consecutive_losses, current_losses)

        print(f"Max Consecutive Wins: {Fore.GREEN}{max_consecutive_wins}{Style.RESET_ALL}")
        print(f"Max Consecutive Losses: {Fore.RED}{max_consecutive_losses}{Style.RESET_ALL}")

        return performance_df

    def get_alpaca_prices(self, ticker: str, start_date: str, end_date: str) -> pd.DataFrame:
        """
        Get historical price data directly from Alpaca.
        
        Args:
            ticker: Ticker symbol
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            
        Returns:
            DataFrame with price data
        """
        try:
            print(f"Fetching price data for {ticker} from {start_date} to {end_date}")
            
            # Get price data from Alpaca
            bars = self.alpaca_api.get_bars(
                ticker, 
                "1Day", 
                start=start_date,
                end=end_date
            ).df
            
            if bars.empty:
                print(f"No price data found in Alpaca for {ticker} between {start_date} and {end_date}")
                return pd.DataFrame()
            
            # Format to match our expected structure
            df = bars.reset_index()
            df = df.rename(columns={
                'timestamp': 'date',
                'open': 'open',
                'high': 'high',
                'low': 'low',
                'close': 'close',
                'volume': 'volume'
            })
            df = df.set_index('date')
            
            return df
        except Exception as e:
            print(f"Error fetching prices from Alpaca for {ticker}: {e}")
            return pd.DataFrame()
    
    
class BacktestDataFetcher(DataFetcher):
    """Enhanced DataFetcher with Alpaca support for backtesting."""
    
    def get_prices_from_alpaca(self, ticker: str, start_date: str, end_date: str, broker) -> pd.DataFrame:
        """
        Fetch historical price data from Alpaca instead of financial datasets API.
        
        Args:
            ticker: Ticker symbol
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            broker: Connected Alpaca broker instance
            
        Returns:
            DataFrame with price data
        """
        try:
            # Format dates for Alpaca API
            start_iso = start_date
            end_iso = end_date
            
            # Get price data from Alpaca
            timeframe = "1Day"
            bars = broker.api.get_bars(
                ticker, 
                timeframe, 
                start=start_iso,
                end=end_iso
            ).df
            
            if bars.empty:
                print(f"No price data found in Alpaca for {ticker} between {start_date} and {end_date}")
                return pd.DataFrame()
            
            # Format to match our expected structure
            df = bars.reset_index()
            df = df.rename(columns={
                'timestamp': 'date',
                'open': 'open',
                'high': 'high',
                'low': 'low',
                'close': 'close',
                'volume': 'volume'
            })
            df = df.set_index('date')
            
            return df
        except Exception as e:
            print(f"Error fetching prices from Alpaca for {ticker}: {e}")
            return pd.DataFrame()

async def main():
    """Run a backtest with Alpaca price data"""
    # Use historical dates to ensure data availability
    backtester = Backtester(
        tickers=["AAPL", "MSFT", "GOOGL", "TSLA", "NVDA"],
        start_date="2023-03-01",  # Use a date with available data
        end_date="2023-03-15",    # Use a date with available data
        initial_capital=100_000,
        model_name="llama-3.3-70b-versatile",
        model_provider="Groq"
    )
    
    # Run backtest
    await backtester.run_backtest()
    backtester.analyze_performance()

if __name__ == "__main__":
    # Set up proper asyncio event loop
    asyncio.run(main())