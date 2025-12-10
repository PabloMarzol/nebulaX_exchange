import math
import polars as pl
import numpy as np
from typing import Dict, Any, List
from signals.data.models import AnalystSignal
from signals.utils.progress import progress

class TechnicalAnalystAgent:
    """
    Sophisticated technical analysis system that combines multiple trading strategies:
    1. Trend Following
    2. Mean Reversion
    3. Momentum
    4. Volatility Analysis
    5. Statistical Arbitrage Signals
    
    All operations use Polars for high-performance data processing.
    """
    
    def __init__(self):
        self.name = "technical_analyst"
        # Strategy weights for signal combination
        self.strategy_weights = {
            "trend": 0.25,
            "mean_reversion": 0.20,
            "momentum": 0.25,
            "volatility": 0.15,
            "stat_arb": 0.15,
        }
    
    def analyze(self, tickers: List[str], data_fetcher, end_date, start_date=None) -> Dict[str, AnalystSignal]:
        """Generate signals for multiple tickers based on technical analysis."""
        signals = {}
        
        for ticker in tickers:
            progress.update_status(f"{self.name}_agent", ticker, "Analyzing price data")
            
            # Get price data (now expecting Polars DataFrame)
            prices_df = data_fetcher.get_prices(ticker, start_date, end_date)
            
            if prices_df.is_empty():
                progress.update_status(f"{self.name}_agent", ticker, "Failed: No price data found")
                continue
            
            # Calculate individual technical signals
            progress.update_status(f"{self.name}_agent", ticker, "Calculating trend signals")
            trend_signals = self._calculate_trend_signals(prices_df)
            
            progress.update_status(f"{self.name}_agent", ticker, "Calculating mean reversion")
            mean_reversion_signals = self._calculate_mean_reversion_signals(prices_df)
            
            progress.update_status(f"{self.name}_agent", ticker, "Calculating momentum")
            momentum_signals = self._calculate_momentum_signals(prices_df)
            
            progress.update_status(f"{self.name}_agent", ticker, "Analyzing volatility")
            volatility_signals = self._calculate_volatility_signals(prices_df)
            
            progress.update_status(f"{self.name}_agent", ticker, "Statistical analysis")
            stat_arb_signals = self._calculate_stat_arb_signals(prices_df)
            
            # Combine all signals using weighted ensemble approach
            progress.update_status(f"{self.name}_agent", ticker, "Combining signals")
            combined_signal = self._weighted_signal_combination(
                {
                    "trend": trend_signals,
                    "mean_reversion": mean_reversion_signals,
                    "momentum": momentum_signals,
                    "volatility": volatility_signals,
                    "stat_arb": stat_arb_signals,
                }
            )
            
            # Create strategy signals for reasoning
            strategy_signals = {
                "trend_following": {
                    "signal": trend_signals["signal"],
                    "confidence": self._safe_round(trend_signals["confidence"] * 100),
                    "metrics": trend_signals["metrics"],
                },
                "mean_reversion": {
                    "signal": mean_reversion_signals["signal"],
                    "confidence": self._safe_round(mean_reversion_signals["confidence"] * 100),
                    "metrics": mean_reversion_signals["metrics"],
                },
                "momentum": {
                    "signal": momentum_signals["signal"],
                    "confidence": self._safe_round(momentum_signals["confidence"] * 100),
                    "metrics": momentum_signals["metrics"],
                },
                "volatility": {
                    "signal": volatility_signals["signal"],
                    "confidence": self._safe_round(volatility_signals["confidence"] * 100),
                    "metrics": volatility_signals["metrics"],
                },
                "statistical_arbitrage": {
                    "signal": stat_arb_signals["signal"],
                    "confidence": self._safe_round(stat_arb_signals["confidence"] * 100),
                    "metrics": stat_arb_signals["metrics"],
                },
            }
            
            # Create the final signal with safe confidence conversion
            final_confidence = self._safe_round(combined_signal["confidence"] * 100)
            
            signals[ticker] = AnalystSignal(
                signal=combined_signal["signal"],
                confidence=final_confidence,
                reasoning=strategy_signals
            )
            
            progress.update_status(f"{self.name}_agent", ticker, "Done")
        
        return signals
    
    def _safe_round(self, value):
        """Safely round a value, handling NaN and None cases"""
        try:
            if value is None or np.isnan(value) or np.isinf(value):
                return 50  # Default confidence
            return int(round(float(value)))
        except (ValueError, TypeError):
            return 50  # Default confidence

    def _calculate_trend_signals(self, prices_df: pl.DataFrame):
        """Advanced trend following strategy using multiple timeframes and indicators"""
        try:
            # Calculate EMAs for multiple timeframes using Polars
            df_with_emas = prices_df.with_columns([
                pl.col("close").ewm_mean(span=8).alias("ema_8"),
                pl.col("close").ewm_mean(span=21).alias("ema_21"),
                pl.col("close").ewm_mean(span=55).alias("ema_55")
            ])
            
            # Calculate ADX for trend strength
            adx_df = self._calculate_adx(prices_df)
            
            # Get the latest values with null safety
            latest = df_with_emas.tail(1)
            ema_8 = latest.select("ema_8").item()
            ema_21 = latest.select("ema_21").item()
            ema_55 = latest.select("ema_55").item()
            
            # Handle None values
            ema_8 = ema_8 if ema_8 is not None else 100.0
            ema_21 = ema_21 if ema_21 is not None else 100.0
            ema_55 = ema_55 if ema_55 is not None else 100.0
            
            # Determine trend direction and strength
            short_trend = ema_8 > ema_21
            medium_trend = ema_21 > ema_55
            
            # Get ADX value with null safety
            adx_value = adx_df.select("adx").tail(1).item()
            adx_value = adx_value if adx_value is not None else 25.0
            trend_strength = adx_value / 100.0
            
            if short_trend and medium_trend:
                signal = "bullish"
                confidence = trend_strength
            elif not short_trend and not medium_trend:
                signal = "bearish"
                confidence = trend_strength
            else:
                signal = "neutral"
                confidence = 0.5

            return {
                "signal": signal,
                "confidence": confidence,
                "metrics": {
                    "adx": float(adx_value),
                    "trend_strength": float(trend_strength),
                },
            }
            
        except Exception as e:
            print(f"    ⚠️ Error in trend signals calculation: {e}")
            return {
                "signal": "neutral",
                "confidence": 0.3,
                "metrics": {
                    "adx": 25.0,
                    "trend_strength": 0.25,
                    "error": str(e)
                },
            }

    def _calculate_mean_reversion_signals(self, prices_df: pl.DataFrame):
        """Mean reversion strategy using statistical measures and Bollinger Bands"""
        try:
            # Calculate z-score of price relative to moving average using Polars
            df_with_stats = prices_df.with_columns([
                pl.col("close").rolling_mean(window_size=50).alias("ma_50"),
                pl.col("close").rolling_std(window_size=50).alias("std_50")
            ]).with_columns([
                ((pl.col("close") - pl.col("ma_50")) / pl.col("std_50")).alias("z_score")
            ])
            
            # Calculate Bollinger Bands
            bb_df = self._calculate_bollinger_bands(prices_df)
            
            # Calculate RSI
            rsi_14 = self._calculate_rsi(prices_df, 14)
            rsi_28 = self._calculate_rsi(prices_df, 28)
            
            # Get latest values with null safety
            latest_z = df_with_stats.select("z_score").tail(1).item()
            latest_close = prices_df.select("close").tail(1).item()
            bb_upper = bb_df.select("bb_upper").tail(1).item()
            bb_lower = bb_df.select("bb_lower").tail(1).item()
            latest_rsi_14 = rsi_14.tail(1).item()
            latest_rsi_28 = rsi_28.tail(1).item()
            
            # Handle None values with safe defaults
            latest_z = latest_z if latest_z is not None else 0.0
            latest_close = latest_close if latest_close is not None else 100.0
            bb_upper = bb_upper if bb_upper is not None else latest_close * 1.02
            bb_lower = bb_lower if bb_lower is not None else latest_close * 0.98
            latest_rsi_14 = latest_rsi_14 if latest_rsi_14 is not None else 50.0
            latest_rsi_28 = latest_rsi_28 if latest_rsi_28 is not None else 50.0
            
            # Mean reversion signals with safe division
            if bb_upper != bb_lower:
                price_vs_bb = (latest_close - bb_lower) / (bb_upper - bb_lower)
            else:
                price_vs_bb = 0.5  # Default to middle if bands are equal
            
            # Combine signals with safe comparisons
            if latest_z < -2 and price_vs_bb < 0.2:
                signal = "bullish"
                confidence = min(abs(latest_z) / 4, 1.0)
            elif latest_z > 2 and price_vs_bb > 0.8:
                signal = "bearish"
                confidence = min(abs(latest_z) / 4, 1.0)
            else:
                signal = "neutral"
                confidence = 0.5

            return {
                "signal": signal,
                "confidence": confidence,
                "metrics": {
                    "z_score": float(latest_z),
                    "price_vs_bb": float(price_vs_bb),
                    "rsi_14": float(latest_rsi_14),
                    "rsi_28": float(latest_rsi_28),
                },
            }
            
        except Exception as e:
            print(f"    ⚠️ Error in mean reversion calculation: {e}")
            return {
                "signal": "neutral",
                "confidence": 0.3,
                "metrics": {
                    "z_score": 0.0,
                    "price_vs_bb": 0.5,
                    "rsi_14": 50.0,
                    "rsi_28": 50.0,
                    "error": str(e)
                },
            }

    def _calculate_momentum_signals(self, prices_df: pl.DataFrame):
        """Multi-factor momentum strategy using Polars"""
        try:
            # Calculate returns and momentum using Polars
            df_with_momentum = prices_df.with_columns([
                pl.col("close").pct_change().alias("returns")
            ]).with_columns([
                pl.col("returns").rolling_sum(window_size=21).alias("mom_1m"),
                pl.col("returns").rolling_sum(window_size=63).alias("mom_3m"),
                pl.col("returns").rolling_sum(window_size=126).alias("mom_6m"),
                pl.col("volume").rolling_mean(window_size=21).alias("volume_ma")
            ]).with_columns([
                (pl.col("volume") / pl.col("volume_ma")).alias("volume_momentum")
            ])
            
            # Get latest values with null safety
            latest = df_with_momentum.tail(1)
            mom_1m = latest.select("mom_1m").item() or 0
            mom_3m = latest.select("mom_3m").item() or 0
            mom_6m = latest.select("mom_6m").item() or 0
            volume_momentum = latest.select("volume_momentum").item() or 1
            
            # Handle None values
            if mom_1m is None:
                mom_1m = 0
            if mom_3m is None:
                mom_3m = 0
            if mom_6m is None:
                mom_6m = 0
            if volume_momentum is None:
                volume_momentum = 1
            
            # Calculate momentum score
            momentum_score = 0.4 * mom_1m + 0.3 * mom_3m + 0.3 * mom_6m
            
            # Volume confirmation
            volume_confirmation = volume_momentum > 1.0
            
            if momentum_score > 0.05 and volume_confirmation:
                signal = "bullish"
                confidence = min(abs(momentum_score) * 5, 1.0)
            elif momentum_score < -0.05 and volume_confirmation:
                signal = "bearish"
                confidence = min(abs(momentum_score) * 5, 1.0)
            else:
                signal = "neutral"
                confidence = 0.5

            return {
                "signal": signal,
                "confidence": confidence,
                "metrics": {
                    "momentum_1m": float(mom_1m),
                    "momentum_3m": float(mom_3m),
                    "momentum_6m": float(mom_6m),
                    "volume_momentum": float(volume_momentum),
                },
            }
            
        except Exception as e:
            print(f"    ⚠️ Error in momentum calculation: {e}")
            return {
                "signal": "neutral",
                "confidence": 0.3,
                "metrics": {
                    "momentum_1m": 0.0,
                    "momentum_3m": 0.0,
                    "momentum_6m": 0.0,
                    "volume_momentum": 1.0,
                    "error": str(e)
                },
            }

    def _calculate_volatility_signals(self, prices_df: pl.DataFrame):
        """Volatility-based trading strategy using Polars"""
        try:
            # Calculate various volatility metrics using Polars
            df_with_vol = prices_df.with_columns([
                pl.col("close").pct_change().alias("returns")
            ]).with_columns([
                (pl.col("returns").rolling_std(window_size=21) * math.sqrt(252)).alias("hist_vol")
            ]).with_columns([
                pl.col("hist_vol").rolling_mean(window_size=63).alias("vol_ma"),
                pl.col("hist_vol").rolling_std(window_size=63).alias("vol_std")
            ]).with_columns([
                (pl.col("hist_vol") / pl.col("vol_ma")).alias("vol_regime"),
                ((pl.col("hist_vol") - pl.col("vol_ma")) / pl.col("vol_std")).alias("vol_z_score")
            ])
            
            # Calculate ATR ratio
            atr_df = self._calculate_atr(prices_df)
            latest_atr = atr_df.tail(1).item()
            latest_close = prices_df.select("close").tail(1).item()
            
            # Handle None values
            latest_atr = latest_atr if latest_atr is not None else 2.0
            latest_close = latest_close if latest_close is not None else 100.0
            atr_ratio = latest_atr / latest_close
            
            # Get latest volatility metrics with null safety
            latest = df_with_vol.tail(1)
            current_vol_regime = latest.select("vol_regime").item() or 1.0
            vol_z = latest.select("vol_z_score").item() or 0.0
            hist_vol = latest.select("hist_vol").item() or 0.15
            
            # Handle None values
            if current_vol_regime is None:
                current_vol_regime = 1.0
            if vol_z is None:
                vol_z = 0.0
            if hist_vol is None:
                hist_vol = 0.15
            
            # Generate signal based on volatility regime
            if current_vol_regime < 0.8 and vol_z < -1:
                signal = "bullish"  # Low vol regime, potential for expansion
                confidence = min(abs(vol_z) / 3, 1.0)
            elif current_vol_regime > 1.2 and vol_z > 1:
                signal = "bearish"  # High vol regime, potential for contraction
                confidence = min(abs(vol_z) / 3, 1.0)
            else:
                signal = "neutral"
                confidence = 0.5

            return {
                "signal": signal,
                "confidence": confidence,
                "metrics": {
                    "historical_volatility": float(hist_vol),
                    "volatility_regime": float(current_vol_regime),
                    "volatility_z_score": float(vol_z),
                    "atr_ratio": float(atr_ratio),
                },
            }
            
        except Exception as e:
            print(f"    ⚠️ Error in volatility calculation: {e}")
            return {
                "signal": "neutral",
                "confidence": 0.3,
                "metrics": {
                    "historical_volatility": 0.15,
                    "volatility_regime": 1.0,
                    "volatility_z_score": 0.0,
                    "atr_ratio": 0.02,
                    "error": str(e)
                },
            }

    def _calculate_stat_arb_signals(self, prices_df: pl.DataFrame):
        """Statistical arbitrage signals based on price action analysis"""
        try:
            # Calculate price distribution statistics using Polars
            df_with_stats = prices_df.with_columns([
                pl.col("close").pct_change().alias("returns")
            ]).with_columns([
                pl.col("returns").rolling_skew(window_size=63).alias("skew"),
                pl.col("returns").rolling_var(window_size=63).alias("kurt_helper")
            ])
            
            # Calculate Hurst exponent
            close_values = prices_df.select("close").to_numpy().flatten()
            hurst = self._calculate_hurst_exponent(close_values)
            
            # Get latest statistical measures with null safety
            latest = df_with_stats.tail(1)
            skew = latest.select("skew").item() or 0.0
            
            # Handle None values
            if skew is None:
                skew = 0.0
            if hurst is None:
                hurst = 0.5
            
            # Generate signal based on statistical properties
            if hurst < 0.4 and skew > 1:
                signal = "bullish"
                confidence = (0.5 - hurst) * 2
            elif hurst < 0.4 and skew < -1:
                signal = "bearish"
                confidence = (0.5 - hurst) * 2
            else:
                signal = "neutral"
                confidence = 0.5

            return {
                "signal": signal,
                "confidence": confidence,
                "metrics": {
                    "hurst_exponent": float(hurst),
                    "skewness": float(skew),
                    "kurtosis": 0.0,  # Simplified for Polars compatibility
                },
            }
            
        except Exception as e:
            print(f"    ⚠️ Error in stat arb calculation: {e}")
            return {
                "signal": "neutral",
                "confidence": 0.3,
                "metrics": {
                    "hurst_exponent": 0.5,
                    "skewness": 0.0,
                    "kurtosis": 0.0,
                    "error": str(e)
                },
            }

    def _weighted_signal_combination(self, signals):
        """Combines multiple trading signals using a weighted approach"""
        try:
            # Convert signals to numeric values
            signal_values = {"bullish": 1, "neutral": 0, "bearish": -1}

            weighted_sum = 0
            total_confidence = 0

            for strategy, signal in signals.items():
                if strategy not in self.strategy_weights:
                    continue  # Skip unknown strategies
                    
                numeric_signal = signal_values.get(signal["signal"], 0)  # Default to 0 for unknown signals
                weight = self.strategy_weights[strategy]
                confidence = signal["confidence"]
                
                # Handle NaN and None values in confidence
                if confidence is None or np.isnan(confidence) or np.isinf(confidence):
                    confidence = 0.5  # Default confidence
                
                # Ensure confidence is within valid range
                confidence = max(0.0, min(float(confidence), 1.0))

                weighted_sum += numeric_signal * weight * confidence
                total_confidence += weight * confidence

            # Normalize the weighted sum
            if total_confidence > 0:
                final_score = weighted_sum / total_confidence
            else:
                final_score = 0

            # Handle NaN in final score
            if np.isnan(final_score) or np.isinf(final_score):
                final_score = 0

            # Convert back to signal
            if final_score > 0.2:
                signal = "bullish"
            elif final_score < -0.2:
                signal = "bearish"
            else:
                signal = "neutral"

            # Ensure confidence is valid
            confidence = abs(final_score)
            if np.isnan(confidence) or np.isinf(confidence):
                confidence = 0.5
            
            confidence = max(0.0, min(confidence, 1.0))

            return {"signal": signal, "confidence": float(confidence)}
            
        except Exception as e:
            print(f"    ⚠️ Error in signal combination: {e}")
            return {"signal": "neutral", "confidence": 0.5}

    # Technical indicator calculation methods using Polars
    def _calculate_rsi(self, prices_df: pl.DataFrame, period: int = 14) -> pl.Series:
        """Calculate RSI using Polars"""
        df_with_rsi = prices_df.with_columns([
            pl.col("close").diff().alias("delta")
        ]).with_columns([
            pl.when(pl.col("delta") > 0).then(pl.col("delta")).otherwise(0).alias("gain"),
            pl.when(pl.col("delta") < 0).then(-pl.col("delta")).otherwise(0).alias("loss")
        ]).with_columns([
            pl.col("gain").rolling_mean(window_size=period).alias("avg_gain"),
            pl.col("loss").rolling_mean(window_size=period).alias("avg_loss")
        ]).with_columns([
            (pl.col("avg_gain") / pl.col("avg_loss")).alias("rs")
        ]).with_columns([
            (100 - (100 / (1 + pl.col("rs")))).alias("rsi")
        ])
        
        return df_with_rsi.select("rsi")

    def _calculate_bollinger_bands(self, prices_df: pl.DataFrame, window: int = 20) -> pl.DataFrame:
        """Calculate Bollinger Bands using Polars"""
        df_with_bb = prices_df.with_columns([
            pl.col("close").rolling_mean(window_size=window).alias("sma"),
            pl.col("close").rolling_std(window_size=window).alias("std_dev")
        ]).with_columns([
            (pl.col("sma") + (pl.col("std_dev") * 2)).alias("bb_upper"),
            (pl.col("sma") - (pl.col("std_dev") * 2)).alias("bb_lower")
        ])
        
        return df_with_bb.select(["bb_upper", "bb_lower"])

    def _calculate_adx(self, prices_df: pl.DataFrame, period: int = 14) -> pl.DataFrame:
        """Calculate ADX using Polars"""
        df_with_adx = prices_df.with_columns([
            (pl.col("high") - pl.col("low")).alias("high_low"),
            (pl.col("high") - pl.col("close").shift(1)).abs().alias("high_close"),
            (pl.col("low") - pl.col("close").shift(1)).abs().alias("low_close"),
            (pl.col("high") - pl.col("high").shift(1)).alias("up_move"),
            (pl.col("low").shift(1) - pl.col("low")).alias("down_move")
        ]).with_columns([
            pl.max_horizontal(["high_low", "high_close", "low_close"]).alias("tr"),
            pl.when((pl.col("up_move") > pl.col("down_move")) & (pl.col("up_move") > 0))
              .then(pl.col("up_move"))
              .otherwise(0)
              .alias("plus_dm"),
            pl.when((pl.col("down_move") > pl.col("up_move")) & (pl.col("down_move") > 0))
              .then(pl.col("down_move"))
              .otherwise(0)
              .alias("minus_dm")
        ]).with_columns([
            (100 * pl.col("plus_dm").ewm_mean(span=period) / pl.col("tr").ewm_mean(span=period)).alias("plus_di"),
            (100 * pl.col("minus_dm").ewm_mean(span=period) / pl.col("tr").ewm_mean(span=period)).alias("minus_di")
        ]).with_columns([
            (100 * (pl.col("plus_di") - pl.col("minus_di")).abs() / (pl.col("plus_di") + pl.col("minus_di"))).alias("dx")
        ]).with_columns([
            pl.col("dx").ewm_mean(span=period).alias("adx")
        ])
        
        return df_with_adx.select(["adx", "plus_di", "minus_di"])

    def _calculate_atr(self, prices_df: pl.DataFrame, period: int = 14) -> pl.Series:
        """Calculate ATR using Polars"""
        df_with_atr = prices_df.with_columns([
            (pl.col("high") - pl.col("low")).alias("high_low"),
            (pl.col("high") - pl.col("close").shift(1)).abs().alias("high_close"),
            (pl.col("low") - pl.col("close").shift(1)).abs().alias("low_close")
        ]).with_columns([
            pl.max_horizontal(["high_low", "high_close", "low_close"]).alias("true_range")
        ]).with_columns([
            pl.col("true_range").rolling_mean(window_size=period).alias("atr")
        ])
        
        return df_with_atr.select("atr")

    def _calculate_hurst_exponent(self, price_series: np.ndarray, max_lag: int = 20) -> float:
        """Calculate Hurst exponent using numpy (no pandas dependency)"""
        if len(price_series) < max_lag * 2:
            return 0.5  # Default to random walk
            
        lags = range(2, min(max_lag, len(price_series) // 2))
        tau = []
        
        for lag in lags:
            if lag < len(price_series):
                diff = price_series[lag:] - price_series[:-lag]
                tau.append(max(1e-8, np.sqrt(np.std(diff))))
        
        if len(tau) < 2:
            return 0.5
            
        # Return the Hurst exponent from linear fit
        try:
            reg = np.polyfit(np.log(lags[:len(tau)]), np.log(tau), 1)
            return reg[0]  # Hurst exponent is the slope
        except:
            # Return 0.5 (random walk) if calculation fails
            return 0.5
