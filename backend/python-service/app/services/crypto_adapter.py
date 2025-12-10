"""
Crypto data adapter that replaces stock market data sources with crypto-specific sources.
This adapter provides crypto price data, market metrics, and on-chain data.
"""
import requests
import polars as pl
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
from functools import lru_cache
import time

logger = logging.getLogger(__name__)


class CryptoDataAdapter:
    """
    Adapter for fetching crypto market data from various sources.
    Designed to be compatible with the trading_algorithm DataFetcher interface.
    """

    def __init__(self, use_cache: bool = True):
        """Initialize the crypto data adapter."""
        self.use_cache = use_cache
        self.cache = {}
        self.coingecko_base_url = "https://api.coingecko.com/api/v3"

        # Crypto ticker to CoinGecko ID mapping
        self.ticker_to_id = {
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "SOL": "solana",
            "ADA": "cardano",
            "DOT": "polkadot",
            "MATIC": "matic-network",
            "AVAX": "avalanche-2",
            "LINK": "chainlink",
            "UNI": "uniswap",
            "AAVE": "aave",
            "BNB": "binancecoin",
            "XRP": "ripple",
            "DOGE": "dogecoin",
            "SHIB": "shiba-inu",
            "ATOM": "cosmos",
            "NEAR": "near",
            "APT": "aptos",
            "ARB": "arbitrum",
            "OP": "optimism",
            "IMX": "immutable-x"
        }

    def _get_coingecko_id(self, ticker: str) -> str:
        """Convert ticker symbol to CoinGecko ID."""
        ticker_upper = ticker.upper()
        if ticker_upper in self.ticker_to_id:
            return self.ticker_to_id[ticker_upper]
        # Default to lowercase ticker if not in mapping
        return ticker.lower()

    def get_prices(self, ticker: str, start_date: Optional[str], end_date: str) -> pl.DataFrame:
        """
        Get historical price data for a crypto ticker.

        Args:
            ticker: Crypto ticker symbol (e.g., 'BTC', 'ETH')
            start_date: Start date in YYYY-MM-DD format (optional)
            end_date: End date in YYYY-MM-DD format

        Returns:
            Polars DataFrame with columns: timestamp, open, high, low, close, volume
        """
        try:
            coin_id = self._get_coingecko_id(ticker)

            # Calculate date range
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            if start_date:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            else:
                start_dt = end_dt - timedelta(days=30)

            # Convert to Unix timestamps
            from_timestamp = int(start_dt.timestamp())
            to_timestamp = int(end_dt.timestamp())

            # CoinGecko market chart endpoint
            url = f"{self.coingecko_base_url}/coins/{coin_id}/market_chart/range"
            params = {
                "vs_currency": "usd",
                "from": from_timestamp,
                "to": to_timestamp
            }

            logger.info(f"Fetching price data for {ticker} ({coin_id}) from {start_date} to {end_date}")

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            # Extract prices and volumes
            prices = data.get("prices", [])
            volumes = data.get("total_volumes", [])

            if not prices:
                logger.warning(f"No price data found for {ticker}")
                return pl.DataFrame()

            # Create DataFrame
            price_data = []
            volume_dict = {int(v[0]): v[1] for v in volumes}

            for price_point in prices:
                timestamp_ms = int(price_point[0])
                price = float(price_point[1])
                volume = volume_dict.get(timestamp_ms, 0.0)

                price_data.append({
                    "timestamp": datetime.fromtimestamp(timestamp_ms / 1000),
                    "open": price,  # CoinGecko doesn't provide OHLC in free tier
                    "high": price,
                    "low": price,
                    "close": price,
                    "volume": volume
                })

            df = pl.DataFrame(price_data)
            logger.info(f"Fetched {len(df)} price points for {ticker}")

            return df

        except Exception as e:
            logger.error(f"Error fetching prices for {ticker}: {e}")
            return pl.DataFrame()

    def get_financial_metrics(self, ticker: str, end_date: str) -> List[Any]:
        """
        Get financial metrics for a crypto asset.
        Adapts traditional financial metrics to crypto equivalents.

        Returns:
            List of metric objects with crypto-specific attributes
        """
        try:
            coin_id = self._get_coingecko_id(ticker)

            # Get coin data from CoinGecko
            url = f"{self.coingecko_base_url}/coins/{coin_id}"
            params = {"localization": "false", "tickers": "false", "community_data": "true", "developer_data": "true"}

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            market_data = data.get("market_data", {})

            # Create a crypto metrics object
            class CryptoMetrics:
                def __init__(self, data):
                    # Market metrics
                    self.market_cap = market_data.get("market_cap", {}).get("usd", 0)
                    self.fully_diluted_valuation = market_data.get("fully_diluted_valuation", {}).get("usd", 0)
                    self.total_volume = market_data.get("total_volume", {}).get("usd", 0)
                    self.circulating_supply = market_data.get("circulating_supply", 0)
                    self.total_supply = market_data.get("total_supply", 0)
                    self.max_supply = market_data.get("max_supply", 0)

                    # Price metrics
                    self.current_price = market_data.get("current_price", {}).get("usd", 0)
                    self.ath = market_data.get("ath", {}).get("usd", 0)
                    self.ath_change_percentage = market_data.get("ath_change_percentage", {}).get("usd", 0)
                    self.atl = market_data.get("atl", {}).get("usd", 0)

                    # Price changes
                    self.price_change_24h = market_data.get("price_change_percentage_24h", 0)
                    self.price_change_7d = market_data.get("price_change_percentage_7d", 0)
                    self.price_change_30d = market_data.get("price_change_percentage_30d", 0)
                    self.price_change_1y = market_data.get("price_change_percentage_1y", 0)

                    # Crypto-specific metrics (adapted to stock equivalents)
                    # NVT Ratio = Market Cap / Daily Volume (similar to P/E ratio)
                    if self.total_volume > 0:
                        self.nvt_ratio = self.market_cap / (self.total_volume * 365)
                    else:
                        self.nvt_ratio = None

                    # Market cap to realized cap ratio (similar to P/B ratio)
                    self.market_cap_rank = data.get("market_cap_rank", 0)

                    # Liquidity score (similar to free cash flow)
                    self.liquidity_score = market_data.get("total_volume", {}).get("usd", 0) / max(self.market_cap, 1)

                    # Supply metrics (similar to shares outstanding)
                    if self.total_supply and self.circulating_supply:
                        self.supply_ratio = self.circulating_supply / self.total_supply
                    else:
                        self.supply_ratio = None

                    # Adapted ROE equivalent (30-day return)
                    self.return_on_equity = self.price_change_30d / 100 if self.price_change_30d else 0

            metrics = CryptoMetrics(data)
            logger.info(f"Fetched financial metrics for {ticker}: Market Cap ${metrics.market_cap:,.0f}")

            return [metrics]

        except Exception as e:
            logger.error(f"Error fetching financial metrics for {ticker}: {e}")
            return []

    def get_line_items(self, ticker: str, end_date: str, line_items: List[str]) -> List[Any]:
        """
        Get financial line items for a crypto asset.
        Adapts traditional line items to crypto equivalents.
        """
        try:
            coin_id = self._get_coingecko_id(ticker)

            # Get market data
            url = f"{self.coingecko_base_url}/coins/{coin_id}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            market_data = data.get("market_data", {})

            # Create line items object
            class CryptoLineItems:
                def __init__(self, market_data):
                    # Revenue equivalent: Daily volume * 365
                    volume = market_data.get("total_volume", {}).get("usd", 0)
                    self.revenue = volume * 365 if volume else None

                    # Net income equivalent: Market cap growth
                    self.net_income = None  # Would need historical data

                    # EPS equivalent: Price change per token
                    self.earnings_per_share = market_data.get("price_change_24h", 0)

                    # Free cash flow equivalent: Trading volume
                    self.free_cash_flow = volume if volume else None

                    # Operating margin: Liquidity ratio
                    mc = market_data.get("market_cap", {}).get("usd", 1)
                    self.operating_margin = volume / mc if mc > 0 else None

                    # Gross margin: Similar to operating margin for crypto
                    self.gross_margin = self.operating_margin

                    # Debt to equity: Not applicable, set to 0
                    self.debt_to_equity = 0.0

                    # Cash and equivalents: Circulating supply * price
                    supply = market_data.get("circulating_supply", 0)
                    price = market_data.get("current_price", {}).get("usd", 0)
                    self.cash_and_equivalents = supply * price if supply and price else None

                    # Total debt: Not applicable
                    self.total_debt = 0.0

                    # Total assets: Market cap
                    self.total_assets = mc

                    # Total liabilities: Assume 0 for crypto
                    self.total_liabilities = 0.0

                    # Outstanding shares: Circulating supply
                    self.outstanding_shares = supply

                    # Dividends: Not applicable for most crypto
                    self.dividends_and_other_cash_distributions = None

            line_items_obj = CryptoLineItems(market_data)
            return [line_items_obj]

        except Exception as e:
            logger.error(f"Error fetching line items for {ticker}: {e}")
            return []

    def get_market_cap(self, ticker: str, end_date: str) -> float:
        """Get current market cap for a crypto asset."""
        try:
            coin_id = self._get_coingecko_id(ticker)

            url = f"{self.coingecko_base_url}/coins/{coin_id}"
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()

            market_cap = data.get("market_data", {}).get("market_cap", {}).get("usd", 0)
            logger.info(f"Market cap for {ticker}: ${market_cap:,.0f}")

            return market_cap

        except Exception as e:
            logger.error(f"Error fetching market cap for {ticker}: {e}")
            return 0.0

    def get_insider_trades(self, ticker: str, end_date: str, start_date: Optional[str] = None) -> List[Any]:
        """
        Get "insider trades" for crypto (whale wallet movements).
        Note: This would require blockchain explorer APIs.
        For now, returning empty list. Can be enhanced with Etherscan, etc.
        """
        logger.info(f"Insider trades (whale movements) not yet implemented for {ticker}")
        return []

    def get_company_news(self, ticker: str, end_date: str, start_date: Optional[str] = None) -> List[Any]:
        """
        Get news for a crypto asset.
        Note: This would require a crypto news API like CryptoPanic.
        For now, returning empty list.
        """
        logger.info(f"Crypto news not yet implemented for {ticker}")
        return []

    def get_current_price(self, ticker: str) -> float:
        """Get current price for a crypto asset."""
        try:
            coin_id = self._get_coingecko_id(ticker)

            url = f"{self.coingecko_base_url}/simple/price"
            params = {
                "ids": coin_id,
                "vs_currencies": "usd"
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            price = data.get(coin_id, {}).get("usd", 0.0)
            logger.info(f"Current price for {ticker}: ${price:,.2f}")

            return price

        except Exception as e:
            logger.error(f"Error fetching current price for {ticker}: {e}")
            return 0.0

    def get_batch_prices(self, tickers: List[str]) -> Dict[str, float]:
        """Get current prices for multiple tickers in one call."""
        try:
            coin_ids = [self._get_coingecko_id(ticker) for ticker in tickers]

            url = f"{self.coingecko_base_url}/simple/price"
            params = {
                "ids": ",".join(coin_ids),
                "vs_currencies": "usd"
            }

            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()

            # Map back to ticker symbols
            result = {}
            for ticker in tickers:
                coin_id = self._get_coingecko_id(ticker)
                result[ticker] = data.get(coin_id, {}).get("usd", 0.0)

            logger.info(f"Fetched batch prices for {len(tickers)} tickers")
            return result

        except Exception as e:
            logger.error(f"Error fetching batch prices: {e}")
            return {ticker: 0.0 for ticker in tickers}
