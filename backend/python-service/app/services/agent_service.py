"""
Agent service that wraps the trading_algorithm AI agents.
Provides a simplified interface for the FastAPI endpoints.
"""
import sys
import os
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime, timedelta
import logging

# Add trading_algorithm to Python path
trading_algo_path = Path(__file__).parent.parent.parent.parent.parent / "trading_algorithm"
sys.path.insert(0, str(trading_algo_path))

from app.services.crypto_adapter import CryptoDataAdapter
from app.models.response import AgentSignal, TradingDecision, PortfolioMetrics

logger = logging.getLogger(__name__)


class AgentService:
    """Service for managing AI trading agents."""

    def __init__(self):
        """Initialize the agent service."""
        self.data_fetcher = CryptoDataAdapter(use_cache=True)
        self._agents_initialized = False
        self._agents = {}

    def _initialize_agents(self):
        """Lazy initialization of trading agents."""
        if self._agents_initialized:
            return

        try:
            # Import trading agents
            from trading_system.bill_ackman import BillAckmanAgent
            from trading_system.michael_burry import MichaelBurryAgent
            from trading_system.technical_analyst import TechnicalAnalystAgent
            from trading_system.risk_manager import RiskManager

            self._agents = {
                "bill_ackman": BillAckmanAgent(),
                "michael_burry": MichaelBurryAgent(),
                "technical_analyst": TechnicalAnalystAgent(),
                "risk_manager": RiskManager()
            }

            self._agents_initialized = True
            logger.info("Trading agents initialized successfully")

        except Exception as e:
            logger.error(f"Error initializing agents: {e}")
            raise

    async def run_full_analysis(
        self,
        tickers: List[str],
        portfolio: Dict,
        start_date: str = None,
        end_date: str = None,
        model_name: str = "llama-3.3-70b-versatile",
        model_provider: str = "Groq"
    ) -> Dict[str, Any]:
        """
        Run full portfolio analysis with all agents.

        Args:
            tickers: List of crypto tickers to analyze
            portfolio: Current portfolio state
            start_date: Analysis start date
            end_date: Analysis end date
            model_name: LLM model to use (default: llama-3.3-70b-versatile)
            model_provider: LLM provider (default: Groq)

        Returns:
            Dictionary with decisions and portfolio summary
        """
        self._initialize_agents()

        try:
            # Import MixGo agent and LLM client
            from trading_system.mixgo import MixGoAgent
            from signals.llm.client import LLMClient

            # Set default dates
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            if not start_date:
                start_dt = datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=30)
                start_date = start_dt.strftime("%Y-%m-%d")

            logger.info(f"Running full analysis for {len(tickers)} tickers from {start_date} to {end_date}")

            # Create LLM client
            llm_client = LLMClient(
                model_name=model_name,
                model_provider=model_provider
            )

            # Get individual agents (excluding risk manager for MixGo)
            agents_list = [
                self._agents["bill_ackman"],
                self._agents["michael_burry"],
                self._agents["technical_analyst"]
            ]

            # Create MixGo agent
            mixgo_agent = MixGoAgent(
                llm_client=llm_client,
                agents=agents_list
            )

            # Run analysis
            decisions_raw = await mixgo_agent.analyze(
                tickers=tickers,
                data_fetcher=self.data_fetcher,
                portfolio=portfolio,
                end_date=end_date,
                start_date=start_date,
                verbose=False
            )

            # Convert to response format
            decisions = {}
            for ticker, decision in decisions_raw.items():
                # Get all agent signals for this ticker
                agent_signals = {}
                for agent_name, agent in self._agents.items():
                    if agent_name != "risk_manager":
                        try:
                            signals = agent.analyze([ticker], self.data_fetcher, end_date, start_date)
                            if ticker in signals:
                                signal = signals[ticker]
                                agent_signals[agent_name] = AgentSignal(
                                    agent=agent_name,
                                    signal=signal.signal,
                                    confidence=signal.confidence,
                                    reasoning=signal.reasoning
                                )
                        except Exception as e:
                            logger.error(f"Error getting signal from {agent_name} for {ticker}: {e}")

                decisions[ticker] = TradingDecision(
                    ticker=ticker,
                    action=decision.action,
                    quantity=decision.quantity,
                    confidence=decision.confidence,
                    reasoning=decision.reasoning,
                    agent_signals=agent_signals
                )

            # Calculate portfolio summary
            portfolio_summary = self._calculate_portfolio_summary(portfolio, tickers)

            return {
                "decisions": decisions,
                "portfolio_summary": portfolio_summary,
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error in full analysis: {e}")
            raise

    async def generate_signal(
        self,
        ticker: str,
        agent: str = None,
        start_date: str = None,
        end_date: str = None
    ) -> Dict[str, Any]:
        """
        Generate a trading signal for a specific ticker.

        Args:
            ticker: Crypto ticker to analyze
            agent: Specific agent to use (optional)
            start_date: Analysis start date
            end_date: Analysis end date

        Returns:
            Signal data
        """
        self._initialize_agents()

        try:
            # Set default dates
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            if not start_date:
                start_dt = datetime.strptime(end_date, "%Y-%m-%d") - timedelta(days=30)
                start_date = start_dt.strftime("%Y-%m-%d")

            # Use specific agent or all agents
            if agent and agent in self._agents:
                agent_obj = self._agents[agent]
                signals = agent_obj.analyze([ticker], self.data_fetcher, end_date, start_date)

                if ticker in signals:
                    signal = signals[ticker]
                    return {
                        "ticker": ticker,
                        "signal": signal.signal,
                        "confidence": signal.confidence,
                        "reasoning": signal.reasoning,
                        "timestamp": datetime.now().isoformat()
                    }
            else:
                # Get signals from all agents
                all_signals = {}
                for agent_name, agent_obj in self._agents.items():
                    if agent_name != "risk_manager":
                        try:
                            signals = agent_obj.analyze([ticker], self.data_fetcher, end_date, start_date)
                            if ticker in signals:
                                all_signals[agent_name] = signals[ticker].model_dump()
                        except Exception as e:
                            logger.error(f"Error getting signal from {agent_name}: {e}")

                return {
                    "ticker": ticker,
                    "signal": "neutral",
                    "confidence": 50.0,
                    "reasoning": all_signals,
                    "timestamp": datetime.now().isoformat()
                }

            return {
                "ticker": ticker,
                "signal": "neutral",
                "confidence": 0.0,
                "reasoning": {"error": "No signal generated"},
                "timestamp": datetime.now().isoformat()
            }

        except Exception as e:
            logger.error(f"Error generating signal for {ticker}: {e}")
            raise

    def calculate_portfolio_metrics(self, portfolio: Dict, tickers: List[str]) -> PortfolioMetrics:
        """
        Calculate portfolio health metrics.

        Args:
            portfolio: Portfolio state
            tickers: List of tickers in portfolio

        Returns:
            Portfolio metrics
        """
        try:
            cash = portfolio.get("cash", 0)
            positions = portfolio.get("positions", {})

            # Calculate position values
            long_exposure = 0.0
            short_exposure = 0.0
            position_values = []

            # Get current prices
            current_prices = self.data_fetcher.get_batch_prices(tickers)

            for ticker, position in positions.items():
                current_price = current_prices.get(ticker, 0)

                long_qty = position.get("long", 0)
                short_qty = position.get("short", 0)

                long_value = long_qty * current_price
                short_value = short_qty * current_price

                long_exposure += long_value
                short_exposure += short_value

                if long_value > 0:
                    position_values.append(long_value)
                if short_value > 0:
                    position_values.append(short_value)

            total_value = cash + long_exposure - short_exposure
            cash_pct = cash / total_value if total_value > 0 else 0

            # Calculate largest position percentage
            largest_position_pct = max(position_values) / total_value if position_values and total_value > 0 else 0

            # Calculate risk score (0-100, lower is better)
            # Based on concentration and leverage
            concentration_risk = largest_position_pct * 100
            leverage_risk = (short_exposure / total_value * 100) if total_value > 0 else 0
            risk_score = min(100, (concentration_risk + leverage_risk) / 2)

            # Calculate diversification score (0-100, higher is better)
            num_positions = len([v for v in position_values if v > 0])
            if num_positions == 0:
                diversification_score = 0
            elif num_positions == 1:
                diversification_score = 20
            elif num_positions <= 3:
                diversification_score = 50
            elif num_positions <= 5:
                diversification_score = 75
            else:
                diversification_score = 90

            # Adjust for concentration
            if largest_position_pct > 0.5:
                diversification_score *= 0.5
            elif largest_position_pct > 0.3:
                diversification_score *= 0.75

            return PortfolioMetrics(
                total_value=total_value,
                cash=cash,
                cash_pct=cash_pct,
                positions_count=num_positions,
                long_exposure=long_exposure,
                short_exposure=short_exposure,
                largest_position_pct=largest_position_pct,
                risk_score=risk_score,
                diversification_score=diversification_score
            )

        except Exception as e:
            logger.error(f"Error calculating portfolio metrics: {e}")
            raise

    def _calculate_portfolio_summary(self, portfolio: Dict, tickers: List[str]) -> Dict[str, Any]:
        """Calculate portfolio summary."""
        try:
            metrics = self.calculate_portfolio_metrics(portfolio, tickers)
            return metrics.model_dump()
        except Exception as e:
            logger.error(f"Error calculating portfolio summary: {e}")
            return {}
