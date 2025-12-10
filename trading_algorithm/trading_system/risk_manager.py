# trading_system/risk_manager.py
from typing import Dict, List, Optional, Tuple
import polars as pl
import numpy as np
from signals.data.models import AnalystSignal

class RiskManager:
    """
    Advanced risk management using Kelly Criterion for position sizing,
    portfolio concentration limits, and correlation-based adjustments.
    Fully optimized with Polars for maximum performance.
    """
    
    def __init__(
        self, 
        max_position_pct: float = 0.05,      # Max 5% per position
        max_risk_per_trade: float = 0.02,    # Max 2% risk per trade
        max_sector_exposure: float = 0.25,    # Max 25% per sector
        max_total_equity_exposure: float = 1.0,  # Max 100% in equities
        kelly_multiplier: float = 0.25        # Conservative Kelly sizing (25% of full Kelly)
    ):
        """
        Initialize the enhanced risk manager.
        
        Args:
            max_position_pct: Maximum position size as percentage of portfolio
            max_risk_per_trade: Maximum risk per trade as percentage of portfolio
            max_sector_exposure: Maximum exposure to any single sector
            max_total_equity_exposure: Maximum total equity exposure
            kelly_multiplier: Multiplier to apply to Kelly criterion (for safety)
        """
        self.max_position_pct = max_position_pct
        self.max_risk_per_trade = max_risk_per_trade
        self.max_sector_exposure = max_sector_exposure
        self.max_total_equity_exposure = max_total_equity_exposure
        self.kelly_multiplier = kelly_multiplier
        
        # Trading performance tracking for Kelly calculation
        self.trade_history = []
        
    def analyze(self, tickers: List[str], prices_dict: Dict, portfolio: Dict, end_date: str) -> Dict[str, AnalystSignal]:
        """
        Generate risk management signals with Kelly Criterion position sizing.
        
        Args:
            tickers: List of tickers to analyze
            prices_dict: Dictionary of price DataFrames by ticker (Polars)
            portfolio: Current portfolio state
            end_date: Analysis end date
            
        Returns:
            dict: Ticker-to-signal mapping with optimized position sizes
        """
        signals = {}
        portfolio_value = self._calculate_portfolio_value(portfolio)
        
        print(f"\n🛡️ Risk Manager Analysis - Portfolio Value: ${portfolio_value:,.2f}")
        
        for ticker in tickers:
            try:
                # Get price data for analysis (expecting Polars DataFrame)
                price_df = prices_dict.get(ticker, pl.DataFrame())
                if price_df.is_empty():
                    signals[ticker] = self._create_default_signal(ticker, portfolio_value)
                    continue
                
                # Calculate market metrics using optimized Polars operations
                current_price = self._get_current_price(price_df)
                volatility = self._calculate_volatility_polars(price_df)
                atr = self._calculate_atr_polars(price_df)
                
                # Calculate Kelly-optimized position size
                kelly_fraction = self._calculate_kelly_fraction_polars(price_df, volatility)
                
                # Apply risk constraints
                risk_metrics = self._calculate_risk_metrics(
                    ticker=ticker,
                    current_price=current_price,
                    volatility=volatility,
                    atr=atr,
                    kelly_fraction=kelly_fraction,
                    portfolio_value=portfolio_value,
                    portfolio=portfolio
                )
                
                # Create comprehensive risk signal
                signals[ticker] = AnalystSignal(
                    signal="risk_management",
                    confidence=risk_metrics["confidence"],
                    reasoning={
                        "current_price": current_price,
                        "volatility_annual": volatility,
                        "atr_14d": atr,
                        "kelly_fraction": kelly_fraction,
                        "kelly_adjusted": risk_metrics["kelly_adjusted"],
                        "max_position_value": risk_metrics["max_position_value"],
                        "max_shares_kelly": risk_metrics["max_shares_kelly"],
                        "max_shares_risk": risk_metrics["max_shares_risk"],
                        "max_shares_concentration": risk_metrics["max_shares_concentration"],
                        "recommended_shares": risk_metrics["recommended_shares"],
                        "stop_loss_price": risk_metrics["stop_loss_price"],
                        "stop_loss_pct": risk_metrics["stop_loss_pct"],
                        "risk_per_share": risk_metrics["risk_per_share"],
                        "position_risk_pct": risk_metrics["position_risk_pct"],
                        "portfolio_exposure_pct": risk_metrics["portfolio_exposure_pct"]
                    },
                    max_position_size=risk_metrics["recommended_shares"]
                )
                
                # Log risk analysis
                print(f"  📊 {ticker}:")
                print(f"    -> Price: ${current_price:.2f} | Vol: {volatility:.1%} | ATR: ${atr:.2f}")
                print(f"    -> Kelly: {kelly_fraction:.1%} → {risk_metrics['kelly_adjusted']:.1%} (adj)")
                print(f"    -> Max Shares: {risk_metrics['recommended_shares']:,} (${risk_metrics['recommended_shares'] * current_price:,.0f})")
                print(f"    -> Stop Loss: ${risk_metrics['stop_loss_price']:.2f} ({risk_metrics['stop_loss_pct']:.1%})")
                
            except Exception as e:
                print(f"    ⚠️ Error analyzing {ticker}: {e}")
                signals[ticker] = self._create_default_signal(ticker, portfolio_value)
        
        return signals
    
    def _get_current_price(self, price_df: pl.DataFrame) -> float:
        """Extract current price using optimized Polars operation."""
        try:
            if price_df.is_empty():
                return 100.0
            
            price = price_df.select(pl.col("close")).tail(1).item()
            
            # Handle None values and ensure valid price
            if price is None or np.isnan(price) or price <= 0:
                return 100.0  # Default fallback price
                
            return float(price)
        except Exception:
            return 100.0  # Default fallback price
    
    def _calculate_kelly_fraction_polars(self, price_df: pl.DataFrame, volatility: float) -> float:
        """
        Calculate Kelly Criterion fraction using optimized Polars operations.
        
        Kelly Formula: f = (bp - q) / b
        Where:
        - f = fraction of capital to wager
        - b = odds of winning (b to 1) 
        - p = probability of winning
        - q = probability of losing (1 - p)
        """
        try:
            if price_df.height < 30:
                return 0.02  # Conservative default for insufficient data
                
            # Calculate daily returns using efficient Polars operations
            returns_df = price_df.select([
                pl.col("close"),
                pl.col("close").pct_change().alias("returns")
            ]).drop_nulls()
            
            if returns_df.height < 10:
                return 0.02
                
            # Get returns as numpy array for statistical calculations
            returns_array = returns_df.get_column("returns").to_numpy()
            
            # Calculate win/loss statistics
            positive_returns = returns_array[returns_array > 0]
            negative_returns = returns_array[returns_array < 0]
            
            if len(positive_returns) == 0 or len(negative_returns) == 0:
                return 0.02  # Conservative default
                
            # Kelly calculation parameters
            win_probability = len(positive_returns) / len(returns_array)
            avg_win = np.mean(positive_returns)
            avg_loss = abs(np.mean(negative_returns))
            
            if avg_loss == 0 or avg_win == 0:
                return 0.02  # Avoid division by zero
                
            # Kelly fraction calculation
            win_loss_ratio = avg_win / avg_loss  # b in Kelly formula
            kelly_fraction = (win_probability * win_loss_ratio - (1 - win_probability)) / win_loss_ratio
            
            # Apply safety constraints and validation
            kelly_fraction = max(0.0, min(kelly_fraction, 0.20))  # Cap at 20%
            
            # Additional safety check based on volatility
            if volatility > 0.5:  # High volatility stocks get lower Kelly
                kelly_fraction = kelly_fraction * 0.5
            
            return kelly_fraction
            
        except Exception as e:
            print(f"    ⚠️ Error in Kelly calculation: {e}")
            return 0.02  # Conservative fallback
    
    def _calculate_volatility_polars(self, price_df: pl.DataFrame, period: int = 20) -> float:
        """Calculate annualized volatility using optimized Polars operations."""
        try:
            if price_df.height < period:
                return 0.15  # Default 15% annual volatility
                
            # Calculate volatility using efficient Polars chain
            vol_result = price_df.select([
                pl.col("close").pct_change().alias("returns")
            ]).drop_nulls().select([
                pl.col("returns").std().alias("daily_vol")
            ])
            
            if vol_result.height == 0:
                return 0.15
                
            daily_vol = vol_result.item()
            if daily_vol is None or np.isnan(daily_vol):
                return 0.15
                
            # Annualize volatility (252 trading days)
            annual_vol = daily_vol * np.sqrt(252)
            
            # Apply reasonable bounds
            return max(0.05, min(annual_vol, 1.0))  # Cap between 5% and 100%
            
        except Exception as e:
            print(f"    ⚠️ Error in volatility calculation: {e}")
            return 0.15  # Default volatility on error
    
    def _calculate_atr_polars(self, price_df: pl.DataFrame, period: int = 14) -> float:
        """Calculate Average True Range using optimized Polars operations."""
        try:
            if price_df.height < period + 1:
                current_price = self._get_current_price(price_df)
                return current_price * 0.02  # Default to 2% of price
                
            # Calculate ATR using efficient Polars operations
            atr_df = price_df.select([
                pl.col("high"),
                pl.col("low"), 
                pl.col("close"),
                pl.col("close").shift(1).alias("prev_close")
            ]).with_columns([
                # Calculate True Range components in one operation
                (pl.col("high") - pl.col("low")).alias("hl"),
                (pl.col("high") - pl.col("prev_close")).abs().alias("hc"),
                (pl.col("low") - pl.col("prev_close")).abs().alias("lc")
            ]).with_columns([
                # True Range is the maximum of the three components
                pl.max_horizontal(["hl", "hc", "lc"]).alias("true_range")
            ]).drop_nulls().select([
                # Calculate ATR as rolling mean of True Range
                pl.col("true_range").rolling_mean(window_size=period).alias("atr")
            ]).drop_nulls()
            
            if atr_df.height == 0:
                current_price = self._get_current_price(price_df)
                return current_price * 0.02
                
            # Get the most recent ATR value
            latest_atr = atr_df.select(pl.col("atr")).tail(1).item()
            
            if latest_atr is None or np.isnan(latest_atr):
                current_price = self._get_current_price(price_df)
                return current_price * 0.02
                
            return float(latest_atr)
            
        except Exception as e:
            print(f"    ⚠️ Error in ATR calculation: {e}")
            current_price = self._get_current_price(price_df)
            return current_price * 0.02
    
    def _calculate_risk_metrics(
        self, 
        ticker: str,
        current_price: float,
        volatility: float,
        atr: float,
        kelly_fraction: float,
        portfolio_value: float,
        portfolio: Dict
    ) -> Dict:
        """
        Calculate comprehensive risk metrics and position sizing.
        """
        try:
            # Validate inputs and handle None values
            current_price = max(0.01, current_price or 100.0)
            volatility = max(0.01, volatility or 0.15)
            atr = max(0.01, atr or (current_price * 0.02))
            kelly_fraction = max(0.0, min(kelly_fraction or 0.02, 1.0))
            portfolio_value = max(1000.0, portfolio_value or 10000.0)
            
            # 1. Kelly-based position sizing (conservative)
            kelly_adjusted = kelly_fraction * self.kelly_multiplier
            kelly_position_value = portfolio_value * kelly_adjusted
            max_shares_kelly = int(kelly_position_value / current_price) if current_price > 0 else 0
            
            # 2. Risk-based position sizing (based on max risk per trade)
            risk_per_share = max(atr * 2.0, current_price * 0.02)  # 2x ATR or 2% of price
            max_risk_value = portfolio_value * self.max_risk_per_trade
            max_shares_risk = int(max_risk_value / risk_per_share) if risk_per_share > 0 else 0
            
            # 3. Concentration limit (max position size)
            max_position_value = portfolio_value * self.max_position_pct
            max_shares_concentration = int(max_position_value / current_price) if current_price > 0 else 0
            
            # 4. Take the minimum of all constraints (most conservative)
            recommended_shares = min(
                max_shares_kelly, 
                max_shares_risk, 
                max_shares_concentration
            )
            recommended_shares = max(0, recommended_shares)  # Ensure non-negative
            
            # 5. Calculate stop loss levels based on volatility
            stop_loss_pct = min(0.08, max(0.02, volatility * 1.5))  # 2-8% based on volatility
            stop_loss_price = current_price * (1 - stop_loss_pct)
            
            # 6. Calculate position risk metrics
            position_value = recommended_shares * current_price
            position_risk = recommended_shares * risk_per_share
            position_risk_pct = (position_risk / portfolio_value) if portfolio_value > 0 else 0
            portfolio_exposure_pct = (position_value / portfolio_value) if portfolio_value > 0 else 0
            
            # 7. Confidence scoring based on data quality and risk constraints
            data_quality_score = min(1.0, kelly_fraction * 2)  # Higher Kelly = better data
            constraint_score = 1.0 if recommended_shares > 0 else 0.3
            confidence = min(95.0, 30.0 + (data_quality_score * constraint_score * 65.0))
            
            return {
                "kelly_adjusted": float(kelly_adjusted),
                "max_position_value": float(max_position_value),
                "max_shares_kelly": int(max_shares_kelly),
                "max_shares_risk": int(max_shares_risk),
                "max_shares_concentration": int(max_shares_concentration),
                "recommended_shares": int(recommended_shares),
                "stop_loss_price": float(stop_loss_price),
                "stop_loss_pct": float(stop_loss_pct),
                "risk_per_share": float(risk_per_share),
                "position_risk_pct": float(position_risk_pct),
                "portfolio_exposure_pct": float(portfolio_exposure_pct),
                "confidence": float(confidence)
            }
        except Exception as e:
            print(f"    ⚠️ Error in risk metrics calculation: {e}")
            return self._get_default_risk_metrics(portfolio_value, current_price)
    
    def _get_default_risk_metrics(self, portfolio_value: float, current_price: float) -> Dict:
        """Get conservative default risk metrics when calculation fails."""
        max_position_value = portfolio_value * (self.max_position_pct / 2)  # Extra conservative
        recommended_shares = int(max_position_value / current_price) if current_price > 0 else 0
        
        return {
            "kelly_adjusted": 0.01,
            "max_position_value": max_position_value,
            "max_shares_kelly": recommended_shares,
            "max_shares_risk": recommended_shares,
            "max_shares_concentration": recommended_shares,
            "recommended_shares": recommended_shares,
            "stop_loss_price": current_price * 0.95,
            "stop_loss_pct": 0.05,
            "risk_per_share": current_price * 0.02,
            "position_risk_pct": 0.01,
            "portfolio_exposure_pct": 0.025,
            "confidence": 25.0
        }
    
    def optimize_portfolio_allocation(
        self, 
        trading_decisions: Dict, 
        portfolio_value: float
    ) -> Dict:
        """
        Optimize portfolio allocation using risk-adjusted returns and correlation.
        
        Args:
            trading_decisions: Dictionary of trading decisions with confidence scores
            portfolio_value: Total portfolio value
            
        Returns:
            Optimized allocation dictionary
        """
        print(f"\n🎯 Portfolio Optimization - Total Value: ${portfolio_value:,.2f}")
        
        # Filter for non-hold decisions with proper attribute checking
        active_decisions = {}
        for ticker, decision in trading_decisions.items():
            if (hasattr(decision, 'action') and decision.action != "hold" and 
                hasattr(decision, 'quantity') and decision.quantity > 0):
                active_decisions[ticker] = decision
        
        if not active_decisions:
            print("   ℹ️ No active trading decisions to optimize")
            return {}
        
        # Calculate risk-adjusted scores
        risk_scores = {}
        total_risk_score = 0
        
        for ticker, decision in active_decisions.items():
            # Risk-adjusted score: confidence weighted by risk metrics
            base_confidence = getattr(decision, 'confidence', 50.0)
            risk_adjustment = 1.0  # Could be enhanced with volatility data from reasoning
            
            # Apply confidence-based scaling
            confidence_factor = base_confidence / 100.0
            risk_scores[ticker] = confidence_factor * risk_adjustment
            total_risk_score += risk_scores[ticker]
        
        # Allocate capital based on risk-adjusted scores
        optimized_allocation = {}
        total_allocated_value = 0
        
        for ticker, decision in active_decisions.items():
            if total_risk_score > 0:
                # Base allocation proportional to risk score
                allocation_pct = risk_scores[ticker] / total_risk_score
                
                # Apply concentration limits
                allocation_pct = min(allocation_pct, self.max_position_pct)
                
                allocation_value = portfolio_value * allocation_pct
                total_allocated_value += allocation_value
                
                optimized_allocation[ticker] = {
                    "allocation_pct": allocation_pct,
                    "allocation_value": allocation_value,
                    "risk_score": risk_scores[ticker],
                    "original_confidence": getattr(decision, 'confidence', 50.0)
                }
                
                print(f"   📍 {ticker}: {allocation_pct:.1%} (${allocation_value:,.0f}) | Confidence: {getattr(decision, 'confidence', 50.0):.1f}%")
        
        allocation_pct_total = total_allocated_value / portfolio_value if portfolio_value > 0 else 0
        print(f"   💼 Total Allocated: ${total_allocated_value:,.0f} ({allocation_pct_total:.1%})")
        
        return optimized_allocation
    
    def _calculate_portfolio_value(self, portfolio: Dict) -> float:
        """Calculate total portfolio value with robust error handling."""
        try:
            # Get cash component with null safety
            cash = portfolio.get("cash", 0)
            if cash is None:
                cash = 0
            cash = float(cash)
            
            # Calculate position values from Alpaca format
            positions_value = 0.0
            positions = portfolio.get("positions", {})
            
            if isinstance(positions, dict):
                for ticker, position in positions.items():
                    if not isinstance(position, dict):
                        continue
                    
                    # Read Alpaca position format: {"long": qty, "long_cost_basis": price, "short": qty, "short_cost_basis": price}
                    long_qty = position.get("long", 0) or 0
                    short_qty = position.get("short", 0) or 0
                    long_price = position.get("long_cost_basis", 0) or 0
                    short_price = position.get("short_cost_basis", 0) or 0
                    
                    # Calculate position values
                    if long_qty and long_price:
                        positions_value += float(long_qty) * float(long_price)
                    
                    if short_qty and short_price:
                        # For short positions, we count the market value
                        positions_value += float(short_qty) * float(short_price)
            
            total_value = cash + positions_value
            
            # Ensure minimum portfolio value for calculations
            return max(total_value, 10000.0)
            
        except Exception as e:
            print(f"Warning: Error calculating portfolio value: {e}")
            return 10000.0  # Default minimum portfolio value
    
    def _create_default_signal(self, ticker: str, portfolio_value: float) -> AnalystSignal:
        """Create a conservative default risk signal when data is insufficient."""
        max_position_value = portfolio_value * (self.max_position_pct / 2)  # Extra conservative
        
        return AnalystSignal(
            signal="risk_management",
            confidence=25.0,  # Low confidence due to insufficient data
            reasoning={
                "note": "Insufficient price data for detailed risk analysis",
                "max_position_value": max_position_value,
                "recommended_shares": 0,
                "kelly_fraction": 0.01,  # Very conservative
                "volatility_annual": 0.20,  # Assume higher volatility
                "stop_loss_pct": 0.05,  # 5% stop loss
                "current_price": 100.0,  # Default price
                "atr_14d": 2.0,  # Default ATR
                "kelly_adjusted": 0.0025,
                "portfolio_exposure_pct": 0.0
            },
            max_position_size=0
        )

    def get_portfolio_summary(self, portfolio: Dict, current_prices: Dict = None) -> Dict:
        """
        Generate a comprehensive portfolio risk summary for Alpaca format.
        """
        portfolio_value = self._calculate_portfolio_value(portfolio)
        positions = portfolio.get("positions", {})
        
        summary = {
            "total_value": portfolio_value,
            "cash": portfolio.get("cash", 0),
            "cash_pct": portfolio.get("cash", 0) / portfolio_value if portfolio_value > 0 else 0,
            "positions_count": 0,
            "long_exposure": 0.0,
            "short_exposure": 0.0,
            "net_exposure": 0.0,
            "gross_exposure": 0.0,
            "largest_position_pct": 0.0,
            "risk_metrics": {
                "within_risk_limits": True,
                "max_position_limit_pct": self.max_position_pct * 100,
                "max_risk_per_trade_pct": self.max_risk_per_trade * 100
            }
        }
        
        # Calculate exposures from Alpaca position format
        try:
            if isinstance(positions, dict):
                for ticker, position in positions.items():
                    if not isinstance(position, dict):
                        continue
                    
                    # Read Alpaca position format
                    long_qty = position.get("long", 0) or 0
                    short_qty = position.get("short", 0) or 0
                    long_price = position.get("long_cost_basis", 0) or 0
                    short_price = position.get("short_cost_basis", 0) or 0
                    
                    # Count active positions
                    if long_qty > 0 or short_qty > 0:
                        summary["positions_count"] += 1
                    
                    # Calculate long exposure
                    if long_qty and long_price:
                        long_value = float(long_qty) * float(long_price)
                        summary["long_exposure"] += long_value
                        
                        # Check concentration limits
                        position_pct = long_value / portfolio_value if portfolio_value > 0 else 0
                        summary["largest_position_pct"] = max(summary["largest_position_pct"], position_pct)
                    
                    # Calculate short exposure
                    if short_qty and short_price:
                        short_value = float(short_qty) * float(short_price)
                        summary["short_exposure"] += short_value
                        
                        # Check concentration limits for short positions too
                        position_pct = short_value / portfolio_value if portfolio_value > 0 else 0
                        summary["largest_position_pct"] = max(summary["largest_position_pct"], position_pct)
        
        except Exception as e:
            print(f"Warning: Error calculating portfolio exposures: {e}")
        
        # Calculate derived metrics
        summary["net_exposure"] = summary["long_exposure"] - summary["short_exposure"]
        summary["gross_exposure"] = summary["long_exposure"] + summary["short_exposure"]
        
        # Update cash percentage based on actual positions
        if summary["positions_count"] > 0:
            cash_value = portfolio.get("cash", 0)
            summary["cash_pct"] = cash_value / portfolio_value if portfolio_value > 0 else 0
        
        # Risk limit validation
        summary["risk_metrics"]["within_risk_limits"] = (
            summary["largest_position_pct"] <= self.max_position_pct
        )
        
        return summary
