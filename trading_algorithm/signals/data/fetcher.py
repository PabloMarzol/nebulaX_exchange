# mixgo/data/fetcher.py
import asyncio
import os
import random
import polars as pl
import requests
from datetime import datetime
from typing import List, Dict, Any, Optional

from signals.data.cache import get_cache
from signals.data.models import Price, FinancialMetrics, LineItem, InsiderTrade, CompanyNews

class DataFetcher:
    """
    Handles fetching financial and market data with caching and error handling.
    """
    
    def __init__(self, use_cache: bool = True):
        """
        Initialize the data fetcher.
        
        Args:
            use_cache: Whether to use data caching
        """
        self.use_cache = use_cache
        self.cache = get_cache() if use_cache else None
        self.api_key = os.environ.get("FINANCIAL_DATASETS_API_KEY")
        self.base_url = "https://api.financialdatasets.ai"
        self.search_url = "https://api.financialdatasets.ai/financial-metrics/tickers"
    
    async def fetch_with_rate_limit(self, fetch_func, *args, **kwargs):
        """
        Execute a fetch function with proper rate limiting.
        
        Args:
            fetch_func: Function to execute
            *args, **kwargs: Arguments to pass to the function
            
        Returns:
            The result of the function or None on failure
        """
        max_retries = 5
        base_delay = 5  # seconds
        
        for attempt in range(max_retries):
            try:
                # Add a small delay between calls to prevent bursts
                await asyncio.sleep(random.uniform(0.5, 2.5))
                
                # Call the function
                result = fetch_func(*args, **kwargs)
                return result
            except Exception as e:
                error_str = str(e).lower()
                
                # Check if it's a rate limit error
                if "429" in error_str or "throttled" in error_str:
                    # Try to extract wait time
                    wait_time = 0
                    try:
                        if "expected available in" in error_str:
                            wait_str = error_str.split("expected available in")[1]
                            if "second" in wait_str:
                                wait_seconds = int(wait_str.split("second")[0].strip())
                                wait_time = wait_seconds + 1  # Add buffer
                    except:
                        pass
                    
                    # Default to exponential backoff if no specific time found
                    if wait_time <= 0:
                        wait_time = base_delay * (2 ** attempt) + random.uniform(0, 1)
                    
                    print(f"Rate limited. Waiting {wait_time:.1f} seconds before retry...")
                    await asyncio.sleep(wait_time)
                    continue
                elif "404" in error_str or "no data found" in error_str:
                    # Data not found - log and return empty result
                    print(f"Data not found: {e}")
                    return None if "dataframe" not in str(type(fetch_func)).lower() else pl.DataFrame()
                else:
                    # Other error - log and retry with backoff
                    print(f"Error in fetch: {e}")
                    await asyncio.sleep(base_delay * (2 ** attempt))
                    
        print(f"Max retries exceeded for fetch operation")
        return None if "dataframe" not in str(type(fetch_func)).lower() else pl.DataFrame()
    
    def get_prices_from_alpaca(self, ticker: str, start_date: Optional[str], end_date: str, broker) -> pl.DataFrame:
        """
        Fetch historical price data from Alpaca using IEX feed (free for paper accounts).
        Returns Polars DataFrame.
        
        Args:
            ticker: Ticker symbol
            start_date: Start date in YYYY-MM-DD format (optional)
            end_date: End date in YYYY-MM-DD format
            broker: Connected Alpaca broker instance
            
        Returns:
            Polars DataFrame with price data (date, open, high, low, close, volume)
        """
        try:
            # Ensure start_date is provided, if not default to 1 year before end_date
            if not start_date:
                from datetime import datetime, timedelta
                end_date_dt = datetime.strptime(end_date, "%Y-%m-%d")
                start_date = (end_date_dt - timedelta(days=365)).strftime("%Y-%m-%d")
            
            # Add a day to end_date to include that day's data
            from datetime import datetime, timedelta
            end_date_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
            end_date_str = end_date_dt.strftime("%Y-%m-%d")
            
            # Format dates for Alpaca API - use ISO format without time component
            start_iso = start_date 
            end_iso = end_date_str  
            
            print(f"Fetching price data for {ticker} from {start_iso} to {end_iso} using IEX feed")
            
            # Get price data from Alpaca using IEX feed (free for paper accounts)
            timeframe = "1Day"
            
            # Try with IEX feed first (free)
            try:
                bars = broker.api.get_bars(
                    ticker, 
                    timeframe, 
                    start=start_iso,
                    end=end_iso,
                    feed='iex'  # Use IEX feed which is free for paper accounts
                ).df
            except Exception as iex_error:
                print(f"IEX feed failed for {ticker}: {iex_error}")
                # Fallback to default feed
                print(f"Trying default feed for {ticker}...")
                bars = broker.api.get_bars(
                    ticker, 
                    timeframe, 
                    start=start_iso,
                    end=end_iso
                ).df
            
            if bars.empty:
                print(f"No price data found in Alpaca for {ticker} between {start_date} and {end_date}")
                return pl.DataFrame()
            
            # Convert pandas DataFrame to Polars DataFrame
            bars = bars.reset_index()
            bars = bars.rename(columns={
                'timestamp': 'date',
                'open': 'open',
                'high': 'high',
                'low': 'low',
                'close': 'close',
                'volume': 'volume'
            })
            
            # Convert to Polars DataFrame
            df = pl.DataFrame({
                'date': bars['date'].tolist(),
                'open': bars['open'].tolist(),
                'high': bars['high'].tolist(),
                'low': bars['low'].tolist(),
                'close': bars['close'].tolist(),
                'volume': bars['volume'].tolist()
            })
            
            print(f"Successfully fetched {df.height} days of price data for {ticker}")
            return df
            
        except Exception as e:
            print(f"Error fetching prices from Alpaca for {ticker}: {e}")
            return pl.DataFrame()
    
    
    def get_prices(self, ticker: str, start_date: Optional[str], end_date: str) -> pl.DataFrame:
        """
        Fetch historical price data, preferring Alpaca if available.
        Returns Polars DataFrame.
        
        Args:
            ticker: Ticker symbol
            start_date: Start date (optional)
            end_date: End date
            
        Returns:
            Polars DataFrame with price data
        """
        # Try Alpaca first if broker is available
        if hasattr(self, 'broker') and self.broker is not None:
            try:
                price_df = self.get_prices_from_alpaca(ticker, start_date, end_date, self.broker)
                if not price_df.is_empty():
                    return price_df
                else:
                    print(f"No data from Alpaca for {ticker}, trying Financial Datasets API...")
            except Exception as e:
                print(f"Error fetching prices from Alpaca for {ticker}: {e}")
                print("Falling back to Financial Datasets API...")
        try:
            # Build request URL for Financial Datasets API
            url = f"{self.base_url}/prices/?ticker={ticker}&interval=day&interval_multiplier=1"
            
            # Ensure start_date is always provided
            # If not explicitly passed, default to 1 year before end_date
            if not start_date:
                from datetime import datetime, timedelta
                end_date_dt = datetime.strptime(end_date, "%Y-%m-%d")
                default_start_date = (end_date_dt - timedelta(days=365)).strftime("%Y-%m-%d")
                url += f"&start_date={default_start_date}"
            else:
                url += f"&start_date={start_date}"
                
            url += f"&end_date={end_date}"
            
            print(f"Fetching price data for {ticker} from Financial Datasets API...")
            
            # Make API request
            headers = {}
            if self.api_key:
                headers["X-API-KEY"] = self.api_key
                
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                print(f"Error fetching prices for {ticker}: {response.status_code} - {response.text}")
                return pl.DataFrame()
                
            # Parse response
            data = response.json()
            prices = [Price(**p) for p in data.get("prices", [])]
            
            if not prices:
                print(f"No price data found in Financial Datasets API for {ticker}")
                return pl.DataFrame()
                
            # Convert to Polars DataFrame
            price_data = [p.model_dump() for p in prices]
            df = pl.DataFrame(price_data)
            
            # Convert time column to date and set proper structure
            df = df.with_columns([
                pl.col("time").str.to_datetime().alias("date")
            ]).drop("time").sort("date")
            
            print(f"Successfully fetched {df.height} days of price data for {ticker} from Financial Datasets API")
            return df
            
        except Exception as e:
            print(f"Error in get_prices for {ticker}: {e}")
            return pl.DataFrame()
    
    def get_financial_metrics(self, ticker: str, end_date: str, period: str = "ttm", limit: int = 5) -> List[FinancialMetrics]:
        """
        Fetch financial metrics for a ticker with graceful error handling.
        
        Args:
            ticker: Ticker symbol
            end_date: End date
            period: Period type (default: "ttm")
            limit: Max number of records to return
            
        Returns:
            List of FinancialMetric objects
        """
        try:
            url = f"{self.base_url}/financial-metrics/?ticker={ticker}&report_period_lte={end_date}&limit={limit}&period={period}"
            
            headers = {}
            if self.api_key:
                headers["X-API-KEY"] = self.api_key
                
            response = requests.get(url, headers=headers)
            
            # Handle specific error cases gracefully
            if response.status_code == 400:
                # Check if it's an invalid ticker error
                try:
                    error_data = response.json()
                    if "Invalid TICKER" in error_data.get("error", ""):
                        print(f"⚠️ Ticker {ticker} not recognized by Financial Datasets API - skipping financial metrics")
                        return []
                except:
                    pass
                print(f"Bad request for {ticker} financial metrics: {response.status_code} - {response.text}")
                return []
            elif response.status_code == 402:
                print(f"Financial Datasets API credits exhausted for {ticker} - skipping financial metrics")
                return []
            elif response.status_code == 429:
                print(f"Rate limited for {ticker} financial metrics - skipping to avoid delays")
                return []
            elif response.status_code != 200:
                print(f"Error fetching financial metrics for {ticker}: {response.status_code} - {response.text}")
                return []
                
            data = response.json()
            return [FinancialMetrics(**m) for m in data.get("financial_metrics", [])]
            
        except Exception as e:
            print(f"Error in get_financial_metrics for {ticker}: {e}")
            return []
    
    def get_line_items(
        self, 
        ticker: str, 
        end_date: str, 
        line_items: Optional[List[str]] = None,
        period: str = "ttm", 
        limit: int = 5
    ) -> List[LineItem]:
        """
        Fetch specific financial line items for a ticker.
        
        Args:
            ticker: Ticker symbol
            end_date: End date
            line_items: List of line items to fetch (default: common items)
            period: Period type (default: "ttm")
            limit: Max number of records to return
            
        Returns:
            List of LineItem objects
        """
        try:
            # Default to common line items if none provided
            if line_items is None:
                line_items = [
                    "revenue",
                    "net_income",
                    "earnings_per_share",
                    "free_cash_flow",
                    "operating_margin",
                    "gross_margin",
                    "debt_to_equity",
                    "return_on_equity",
                    "cash_and_equivalents",
                    "total_debt",
                    "total_assets",
                    "total_liabilities",
                    "outstanding_shares"
                ]
            
            url = f"{self.base_url}/financials/search/line-items"
            
            headers = {}
            if self.api_key:
                headers["X-API-KEY"] = self.api_key
                headers["Content-Type"] = "application/json"
                
            body = {
                "tickers": [ticker],
                "line_items": line_items,
                "end_date": end_date,
                "period": period,
                "limit": limit,
            }
            
            response = requests.post(url, headers=headers, json=body)
            
            # Handle specific error cases gracefully
            if response.status_code == 400:
                # Check if it's an invalid ticker error
                try:
                    error_data = response.json()
                    if "Invalid TICKER" in error_data.get("error", "") or "Please provide a valid" in error_data.get("message", ""):
                        print(f"⚠️ Ticker {ticker} not recognized by Financial Datasets API - skipping line items")
                        return []
                except:
                    pass
                print(f"Bad request for {ticker} line items: {response.status_code} - {response.text}")
                return []
            elif response.status_code == 402:
                print(f"Financial Datasets API credits exhausted for {ticker} - skipping line items")
                return []
            elif response.status_code == 429:
                print(f"Rate limited for {ticker} line items - skipping to avoid delays")
                return []
            elif response.status_code != 200:
                print(f"Error fetching line items for {ticker}: {response.status_code} - {response.text}")
                return []
                
            data = response.json()
            return [LineItem(**item) for item in data.get("search_results", [])]
            
        except Exception as e:
            print(f"Error in get_line_items for {ticker}: {e}")
            return []
    
    def get_insider_trades(
        self, 
        ticker: str, 
        end_date: str,
        start_date: Optional[str] = None,
        limit: int = 50
    ) -> List[InsiderTrade]:
        """
        Fetch insider trades for a ticker.
        
        Args:
            ticker: Ticker symbol
            end_date: End date
            start_date: Start date (optional)
            limit: Max number of records to return
            
        Returns:
            List of InsiderTrade objects
        """
        try:
            url = f"{self.base_url}/insider-trades/?ticker={ticker}&filing_date_lte={end_date}"
            if start_date:
                url += f"&filing_date_gte={start_date}"
            url += f"&limit={limit}"
            
            headers = {}
            if self.api_key:
                headers["X-API-KEY"] = self.api_key
                
            response = requests.get(url, headers=headers)
            
            # Handle specific error cases gracefully
            if response.status_code == 400:
                # Check if it's an invalid ticker error
                try:
                    error_data = response.json()
                    if "Invalid TICKER" in error_data.get("error", "") or "Please provide a valid" in error_data.get("message", ""):
                        print(f"⚠️ Ticker {ticker} not recognized by Financial Datasets API - skipping insider trades")
                        return []
                except:
                    pass
                print(f"Bad request for {ticker} insider trades: {response.status_code} - {response.text}")
                return []
            elif response.status_code == 402:
                print(f"Financial Datasets API credits exhausted for {ticker} - skipping insider trades")
                return []
            elif response.status_code == 429:
                print(f"Rate limited for {ticker} insider trades - skipping to avoid delays")
                return []
            elif response.status_code != 200:
                print(f"Error fetching insider trades for {ticker}: {response.status_code} - {response.text}")
                return []
                
            data = response.json()
            return [InsiderTrade(**trade) for trade in data.get("insider_trades", [])]
            
        except Exception as e:
            print(f"Error in get_insider_trades for {ticker}: {e}")
            return []
    
    def get_company_news(
        self, 
        ticker: str, 
        end_date: str,
        start_date: Optional[str] = None,
        limit: int = 50
    ) -> List[CompanyNews]:
        """
        Fetch company news for a ticker using Alpaca News API.
        
        Args:
            ticker: Ticker symbol
            end_date: End date
            start_date: Start date (optional)
            limit: Max number of records to return
            
        Returns:
            List of CompanyNews objects
        """
        try:
            # Try Alpaca News API first if broker is available
            if hasattr(self, 'broker') and self.broker is not None:
                return self._get_company_news_from_alpaca(ticker, end_date, start_date, limit)
            
            # Fallback to Financial Datasets API
            return self._get_company_news_from_financial_datasets(ticker, end_date, start_date, limit)
            
        except Exception as e:
            print(f"Error in get_company_news for {ticker}: {e}")
            return []
    
    def _get_company_news_from_alpaca(
        self, 
        ticker: str, 
        end_date: str,
        start_date: Optional[str] = None,
        limit: int = 50
    ) -> List[CompanyNews]:
        """
        Fetch company news from Alpaca API.
        """
        try:
            from datetime import datetime, timedelta
            
            # Set up date range
            if start_date:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            else:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                start_dt = end_dt - timedelta(days=30)  # Default to 30 days
            
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            # Format dates for Alpaca API
            start_formatted = start_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            end_formatted = end_dt.strftime("%Y-%m-%dT%H:%M:%SZ")
            
            url = "https://data.alpaca.markets/v1beta1/news"
            params = {
                "symbols": ticker,
                "start": start_formatted,
                "end": end_formatted,
                "sort": "desc",
                "limit": min(limit, 50)  # Alpaca API limit
            }
            
            # Use broker's API headers for authentication
            headers = {
                "APCA-API-KEY-ID": os.getenv("ALPACA_API_KEY"),
                "APCA-API-SECRET-KEY": os.getenv("ALPACA_API_SECRET")
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                news_articles = data.get("news", [])
                
                # Convert to CompanyNews objects
                company_news = []
                for article in news_articles:
                    # Only include articles that mention our ticker
                    if ticker.upper() in [s.upper() for s in article.get("symbols", [])]:
                        try:
                            # Map Alpaca news format to our CompanyNews model
                            # Handle missing fields gracefully
                            news_item = CompanyNews(
                                ticker=ticker,
                                title=article.get("headline", ""),
                                author=article.get("author", "Alpaca News"),
                                source=article.get("source", "Alpaca News"),
                                date=article.get("created_at", ""),
                                url=article.get("url", ""),
                                sentiment=None  # Alpaca doesn't provide sentiment
                            )
                            company_news.append(news_item)
                        except Exception as parse_error:
                            print(f"Error parsing news item for {ticker}: {parse_error}")
                            # Create a minimal news item if parsing fails
                            try:
                                minimal_news = CompanyNews(
                                    ticker=ticker,
                                    title=article.get("headline", "News Update"),
                                    author="Alpaca News",
                                    source="Alpaca News", 
                                    date=article.get("created_at", ""),
                                    url=article.get("url", ""),
                                    sentiment=None
                                )
                                company_news.append(minimal_news)
                            except:
                                # Skip this article if we can't parse it at all
                                continue
                
                print(f"Successfully fetched {len(company_news)} news articles for {ticker} from Alpaca")
                return company_news
            else:
                print(f"Error fetching Alpaca news for {ticker}: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"Error fetching Alpaca news for {ticker}: {e}")
            return []
    
    def _get_company_news_from_financial_datasets(
        self, 
        ticker: str, 
        end_date: str,
        start_date: Optional[str] = None,
        limit: int = 50
    ) -> List[CompanyNews]:
        """
        Fallback: Fetch company news from Financial Datasets API.
        """
        try:
            url = f"{self.base_url}/news/?ticker={ticker}&end_date={end_date}"
            if start_date:
                url += f"&start_date={start_date}"
            url += f"&limit={limit}"
            
            headers = {}
            if self.api_key:
                headers["X-API-KEY"] = self.api_key
                
            response = requests.get(url, headers=headers)
            if response.status_code != 200:
                print(f"Error fetching Financial Datasets news for {ticker}: {response.status_code} - {response.text}")
                return []
                
            data = response.json()
            return [CompanyNews(**news) for news in data.get("news", [])]
            
        except Exception as e:
            print(f"Error fetching Financial Datasets news for {ticker}: {e}")
            return []
    
    
    def set_prices(self, ticker: str, price_data: list):
        """
        Store price data in the cache.
        
        Args:
            ticker: Ticker symbol
            price_data: List of price data dictionaries
        """
        # If using cache, store the data
        if self.use_cache and self.cache:
            self.cache.set_prices(ticker, price_data)
    
    
    def get_market_cap(self, ticker: str, end_date: str) -> Optional[float]:
        """
        Get market cap for a ticker as of end_date.
        
        Args:
            ticker: Ticker symbol
            end_date: Date to get market cap for
            
        Returns:
            Market cap value or None if not available
        """
        try:
            # Get from financial metrics
            metrics = self.get_financial_metrics(ticker, end_date, limit=1)
            if metrics and metrics[0].market_cap is not None:
                return metrics[0].market_cap
                
            return None
            
        except Exception as e:
            print(f"Error in get_market_cap for {ticker}: {e}")
            return None