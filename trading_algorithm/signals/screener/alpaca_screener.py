# signals/screener/alpaca_screener.py
import requests
import os
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from datetime import datetime, timedelta
load_dotenv()


@dataclass
class ScreenedStock:
    """Represents a stock selected by the screener."""
    symbol: str
    reason: str
    volume: Optional[int] = None
    price_change_pct: Optional[float] = None
    market_cap: Optional[float] = None
    score: float = 0.0

class AlpacaScreener:
    """
    Stock screener using Alpaca's market data APIs to dynamically select stocks for analysis.
    """
    
    def __init__(self, broker=None):
        """
        Initialize the screener with broker connection.
        
        Args:
            broker: Connected Alpaca broker instance
        """
        self.broker = broker
        
    def get_most_active_stocks(self, by: str = "volume", top: int = 20) -> List[Dict[str, Any]]:
        """
        Get most active stocks by volume or trade count.
        
        Args:
            by: Metric for ranking ("volume" or "trades")
            top: Number of stocks to return (1-100)
            
        Returns:
            List of most active stocks data
        """
        try:
            if not self.broker or not self.broker.api:
                print("No broker connection available for screening")
                return []
            
            # Build the URL for most active stocks
            url = f"https://data.alpaca.markets/v1beta1/screener/stocks/most-actives"
            params = {
                "by": by,
                "top": min(top, 100)  # Cap at 100 as per API limit
            }
            
            # Use broker's API headers for authentication
            headers = {
                "APCA-API-KEY-ID": os.getenv("ALPACA_API_KEY"),
                "APCA-API-SECRET-KEY": os.getenv("ALPACA_API_SECRET")
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                print(f"Found {len(data.get('most_actives', []))} most active stocks by {by}")
                return data.get("most_actives", [])
            else:
                print(f"Error fetching most active stocks: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"Error in get_most_active_stocks: {e}")
            return []
    
    def get_market_movers(self, top: int = 20) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get top market movers (gainers and losers).
        
        Args:
            top: Number of gainers and losers to return each (1-50)
            
        Returns:
            Dict with 'gainers' and 'losers' lists
        """
        try:
            if not self.broker or not self.broker.api:
                print("No broker connection available for screening")
                return {"gainers": [], "losers": []}
            
            # Build the URL for market movers
            url = f"https://data.alpaca.markets/v1beta1/screener/stocks/movers"
            params = {
                "top": min(top, 50)  # Cap at 50 as per API limit
            }
            
            # Use broker's API headers for authentication
            headers = {
                "APCA-API-KEY-ID": os.getenv("ALPACA_API_KEY"),
                "APCA-API-SECRET-KEY": os.getenv("ALPACA_API_SECRET")
            }
            
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                gainers = data.get("gainers", [])
                losers = data.get("losers", [])
                print(f"Found {len(gainers)} gainers and {len(losers)} losers")
                return {"gainers": gainers, "losers": losers}
            else:
                print(f"Error fetching market movers: {response.status_code} - {response.text}")
                return {"gainers": [], "losers": []}
                
        except Exception as e:
            print(f"Error in get_market_movers: {e}")
            return {"gainers": [], "losers": []}
    
    def get_news_driven_stocks(self, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get stocks with recent news coverage that might drive price movements.
        
        Args:
            limit: Number of news articles to analyze
            
        Returns:
            List of stocks mentioned in recent news
        """
        try:
            if not self.broker or not self.broker.api:
                print("No broker connection available for news screening")
                return []
            
            # Get recent news articles (last 24 hours)
            end_date = datetime.now()
            start_date = end_date - timedelta(hours=24)
            
            # Format dates according to Alpaca API requirements (RFC-3339 format)
            # Remove microseconds and ensure proper timezone format
            start_formatted = start_date.strftime("%Y-%m-%dT%H:%M:%SZ")
            end_formatted = end_date.strftime("%Y-%m-%dT%H:%M:%SZ")
            
            url = f"https://data.alpaca.markets/v1beta1/news"
            params = {
                "start": start_formatted,
                "end": end_formatted,
                "sort": "desc",
                "limit": limit
            }
            
            # Use broker's API headers for authentication
            headers = {
                "APCA-API-KEY-ID": os.getenv("ALPACA_API_KEY"),
                "APCA-API-SECRET-KEY": os.getenv("ALPACA_API_SECRET")
            }
            
            print(f"Fetching news from {start_formatted} to {end_formatted}")
            response = requests.get(url, headers=headers, params=params)
            
            if response.status_code == 200:
                data = response.json()
                news_articles = data.get("news", [])
                
                # Extract unique symbols from news articles
                symbols_with_news = {}
                for article in news_articles:
                    symbols = article.get("symbols", [])
                    for symbol in symbols:
                        if symbol not in symbols_with_news:
                            symbols_with_news[symbol] = {
                                "symbol": symbol,
                                "news_count": 0,
                                "latest_headline": ""
                            }
                        symbols_with_news[symbol]["news_count"] += 1
                        if not symbols_with_news[symbol]["latest_headline"]:
                            symbols_with_news[symbol]["latest_headline"] = article.get("headline", "")
                
                result = list(symbols_with_news.values())
                print(f"Found {len(result)} stocks with recent news coverage")
                return result
            else:
                print(f"Error fetching news: {response.status_code} - {response.text}")
                return []
                
        except Exception as e:
            print(f"Error in get_news_driven_stocks: {e}")
            return []
    
    def _is_valid_ticker(self, symbol: str) -> bool:
        """
        Check if a ticker symbol is likely to be a valid stock (not warrant, unit, etc.).
        
        Args:
            symbol: Ticker symbol to check
            
        Returns:
            True if likely a valid stock ticker
        """
        symbol = symbol.upper()
        
        # Filter out common non-stock suffixes
        invalid_suffixes = ['W', 'U', 'R', 'WS', 'WT', 'UN', 'RT']
        
        # Check for warrant indicators (ends with W after 4+ characters)
        if len(symbol) > 4 and symbol.endswith('W'):
            return False
        
        # Check for unit indicators (ends with U after 4+ characters)
        if len(symbol) > 4 and symbol.endswith('U'):
            return False
            
        # Check for rights (ends with R after 4+ characters)
        if len(symbol) > 4 and symbol.endswith('R'):
            return False
        
        # Filter out symbols with common warrant/unit patterns
        for suffix in invalid_suffixes:
            if symbol.endswith(suffix) and len(symbol) > len(suffix):
                return False
        
        # Ensure symbol is reasonable length (1-5 characters typically)
        if len(symbol) < 1 or len(symbol) > 5:
            return False
        
        return True
    
    def screen_stocks(
        self, 
        max_stocks: int = 5,
        include_active: bool = True,
        include_movers: bool = True,
        include_news: bool = True,
        exclude_symbols: Optional[List[str]] = None
    ) -> List[ScreenedStock]:
        """
        Comprehensive stock screening combining multiple criteria.
        
        Args:
            max_stocks: Maximum number of stocks to return
            include_active: Include most active stocks
            include_movers: Include market movers (gainers/losers)
            include_news: Include stocks with recent news
            exclude_symbols: List of symbols to exclude from screening
            
        Returns:
            List of ScreenedStock objects ranked by screening score
        """
        print("\n🔍 Starting comprehensive stock screening...")
        
        if exclude_symbols is None:
            exclude_symbols = []
        
        # Convert exclude list to uppercase for consistency
        exclude_symbols = [s.upper() for s in exclude_symbols]
        
        screened_stocks = {}
        
        # 1. Get most active stocks
        if include_active:
            print("\n📊 Screening most active stocks...")
            active_stocks = self.get_most_active_stocks(by="volume", top=20)
            for stock in active_stocks:
                symbol = stock.get("symbol", "").upper()
                if symbol and symbol not in exclude_symbols and self._is_valid_ticker(symbol):
                    if symbol not in screened_stocks:
                        screened_stocks[symbol] = ScreenedStock(
                            symbol=symbol,
                            reason="High volume activity",
                            volume=stock.get("volume"),
                            score=3.0  # Base score for active stocks
                        )
                    else:
                        screened_stocks[symbol].score += 3.0
                        screened_stocks[symbol].reason += " + High volume"
        
        # 2. Get market movers
        if include_movers:
            print("\n📈 Screening market movers...")
            movers = self.get_market_movers(top=15)
            
            # Process gainers
            for gainer in movers.get("gainers", []):
                symbol = gainer.get("symbol", "").upper()
                if symbol and symbol not in exclude_symbols and self._is_valid_ticker(symbol):
                    price_change = gainer.get("change_percent", 0)
                    if symbol not in screened_stocks:
                        screened_stocks[symbol] = ScreenedStock(
                            symbol=symbol,
                            reason="Strong gainer",
                            price_change_pct=price_change,
                            score=4.0  # Higher score for significant movers
                        )
                    else:
                        screened_stocks[symbol].score += 4.0
                        screened_stocks[symbol].reason += " + Strong gainer"
                        screened_stocks[symbol].price_change_pct = price_change
            
            # Process losers (potential value opportunities)
            for loser in movers.get("losers", []):
                symbol = loser.get("symbol", "").upper()
                if symbol and symbol not in exclude_symbols and self._is_valid_ticker(symbol):
                    price_change = loser.get("change_percent", 0)
                    if symbol not in screened_stocks:
                        screened_stocks[symbol] = ScreenedStock(
                            symbol=symbol,
                            reason="Potential value opportunity",
                            price_change_pct=price_change,
                            score=2.5  # Moderate score for potential value plays
                        )
                    else:
                        screened_stocks[symbol].score += 2.5
                        screened_stocks[symbol].reason += " + Value opportunity"
                        if screened_stocks[symbol].price_change_pct is None:
                            screened_stocks[symbol].price_change_pct = price_change
        
        # 3. Get news-driven stocks
        if include_news:
            print("\n📰 Screening stocks with recent news...")
            news_stocks = self.get_news_driven_stocks(limit=30)
            for news_stock in news_stocks:
                symbol = news_stock.get("symbol", "").upper()
                news_count = news_stock.get("news_count", 0)
                if symbol and symbol not in exclude_symbols and self._is_valid_ticker(symbol) and news_count >= 2:
                    news_score = min(news_count * 1.5, 5.0)  # Cap news score at 5.0
                    if symbol not in screened_stocks:
                        screened_stocks[symbol] = ScreenedStock(
                            symbol=symbol,
                            reason=f"Recent news coverage ({news_count} articles)",
                            score=news_score
                        )
                    else:
                        screened_stocks[symbol].score += news_score
                        screened_stocks[symbol].reason += f" + News coverage ({news_count} articles)"
        
        # 4. Rank and filter results
        ranked_stocks = sorted(screened_stocks.values(), key=lambda x: x.score, reverse=True)
        
        # Take top stocks up to max_stocks limit
        final_selection = ranked_stocks[:max_stocks]
        
        print(f"\n✅ Screening complete! Selected {len(final_selection)} stocks:")
        for i, stock in enumerate(final_selection, 1):
            change_str = f" ({stock.price_change_pct:+.1f}%)" if stock.price_change_pct else ""
            print(f"  {i}. {stock.symbol}{change_str} - Score: {stock.score:.1f} - {stock.reason}")
        
        return final_selection
    
    def get_default_tickers(self) -> List[str]:
        """
        Get default tickers if screening fails.
        
        Returns:
            List of reliable default ticker symbols
        """
        return ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA"]
