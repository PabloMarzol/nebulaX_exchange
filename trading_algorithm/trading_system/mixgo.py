from typing import Dict, List, Any, TypedDict
import polars as pl
from pydantic import BaseModel, Field
from signals.data.models import AnalystSignal
from signals.llm.client import LLMClient
from signals.llm.prompts import MEGA_AGENT_PROMPT
from signals.utils.progress import progress

class MegaAgentDecision(BaseModel):
    """Final trading decision model."""
    action: str = Field(description="Trading action: buy, sell, short, cover, or hold")
    quantity: int = Field(description="Number of shares to trade")
    confidence: float = Field(description="Confidence in the decision (0-100)")
    reasoning: str = Field(description="Explanation for the decision")

class TickerContext(TypedDict):
    """Context information for a ticker's decision."""
    ticker: str
    signals: Dict[str, Any]
    position: Dict[str, Any]
    price: float
    cash: float
    portfolio_context: Dict[str, Any]

class MixGoAgent:
    """
    MixGo agent that integrates signals from multiple analysts and uses
    LLM-powered meta-reasoning to make final trading decisions.
    """
    
    def __init__(self, llm_client: LLMClient, agents=None):
        """
        Initialize the MixGo agent.
        
        Args:
            llm_client: LLM client for meta-reasoning
            agents: List of analyst agents to use (defaults to the three core agents)
        """
        self.llm_client = llm_client
        
        # Import RiskManager at the top level since we always need it
        from trading_system.risk_manager import RiskManager
        
        # Import other agents only if needed
        if agents is None:
            from trading_system.bill_ackman import BillAckmanAgent
            from trading_system.michael_burry import MichaelBurryAgent
            from trading_system.technical_analyst import TechnicalAnalystAgent
            
            self.agents = [
                BillAckmanAgent(),
                MichaelBurryAgent(),
                TechnicalAnalystAgent()
            ]
        else:
            self.agents = agents
            
        # Always initialize risk manager
        self.risk_manager = RiskManager()
    
    async def analyze(
        self, 
        #fallback_llm_agent: str,
        tickers: List[str], 
        data_fetcher, 
        portfolio, 
        end_date, 
        start_date=None, 
        verbose = False,
    ) -> Dict[str, MegaAgentDecision]:
        """
        Generate trading decisions by combining signals from all agents
        and applying LLM meta-reasoning.
        
        Args:
            tickers: List of tickers to analyze
            data_fetcher: Data fetching service
            portfolio: Current portfolio state
            end_date: Analysis end date
            start_date: Analysis start date
            
        Returns:
            dict: Ticker-to-decision mapping with quantities and reasoning
        """
        # Step 1: Collect signals from all agents + risk management
        progress.update_status("mixgo_agent", None, "Collecting signals from all agents")
        all_signals = {}
        
        # Collect price data for risk analysis
        prices_dict = {}
        for ticker in tickers:
            try:
                price_df = data_fetcher.get_prices(ticker, start_date, end_date)
                prices_dict[ticker] = price_df
            except Exception as e:
                print(f"Warning: Could not fetch prices for {ticker}: {e}")
                prices_dict[ticker] = pl.DataFrame()
        
        # Get signals from trading agents
        for agent in self.agents:
            agent_signals = agent.analyze(tickers, data_fetcher, end_date, start_date)
            all_signals[agent.name] = agent_signals
        
        # Get risk management signals
        risk_signals = self.risk_manager.analyze(tickers, prices_dict, portfolio, end_date)
        all_signals["risk_manager"] = risk_signals
        
        # Step 2: Organize signals by ticker
        ticker_signals = {ticker: {} for ticker in tickers}
        for agent_name, agent_signals in all_signals.items():
            for ticker, signal in agent_signals.items():
                ticker_signals[ticker][agent_name] = signal.model_dump()
        
        # Step 3: Generate decisions with LLM meta-reasoning
        decisions = {}
        progress.update_status("mixgo_agent", None, "Generating trading decisions")
        
        for ticker in tickers:
            progress.update_status("mixgo_agent", ticker, "Applying LLM meta-reasoning")
            
            # Get current position and cash information
            position = self._get_position_info(portfolio, ticker)
            cash = portfolio.get("cash", 0)
            current_price = self._get_current_price(data_fetcher, ticker, end_date)
            
            # Prepare the context for the LLM
            context = TickerContext(
                ticker=ticker,
                signals=ticker_signals[ticker],
                position=position,
                price=current_price,
                cash=cash,
                portfolio_context={
                    "total_value": self._calculate_portfolio_value(portfolio),
                    "exposure": self._calculate_portfolio_exposure(portfolio),
                    "margin_used": portfolio.get("margin_used", 0),
                    "margin_requirement": portfolio.get("margin_requirement", 0)
                }
            )
            
            # Call the LLM for meta-reasoning and decision
            decision = await self.llm_client.generate_decision(
                context=context,
                system_prompt=MEGA_AGENT_PROMPT,
                output_model=MegaAgentDecision,
                verbose = verbose
            )
            
            # Apply risk management constraints
            decision = self._apply_risk_constraints(decision, ticker, all_signals)
            
            print(f"Decision from LLM for {ticker}: {decisions}")
            decisions[ticker] = decision
            progress.update_status("mixgo_agent", ticker, "Decision generated")
        
        progress.update_status("mixgo_agent", None, "All decisions generated")
        
        # Step 4: Apply portfolio-level risk optimization
        optimized_decisions = self._optimize_portfolio_decisions(decisions, portfolio)
        
        return optimized_decisions
    
    def _calculate_portfolio_value(self, portfolio: Dict) -> float:
        """Calculate total portfolio value including cash and positions."""
        try:
            cash = float(portfolio.get("cash", 0))
            positions_value = 0
            positions = portfolio.get("positions", {})
            
            if isinstance(positions, dict):
                for ticker, position in positions.items():
                    if isinstance(position, dict):
                        # Handle different position structures
                        shares = position.get("shares", 0)
                        avg_price = position.get("average_price", 0)
                        
                        if shares and avg_price:
                            positions_value += shares * avg_price
            
            return max(cash + positions_value, 10000)  # Minimum portfolio value
        except Exception:
            return 10000  # Default portfolio value
    
    def _apply_risk_constraints(self, decision: MegaAgentDecision, ticker: str, all_signals: Dict) -> MegaAgentDecision:
        """
        Apply risk management constraints to individual trading decisions.
        """
        # Get risk management signal for this ticker
        risk_signal = all_signals.get("risk_manager", {}).get(ticker)
        
        if not risk_signal or decision.action == "hold":
            return decision
        
        # Get risk constraints
        max_position_size = risk_signal.max_position_size or 0
        risk_reasoning = risk_signal.reasoning or {}
        
        # Apply position size limits
        if decision.quantity > max_position_size:
            original_qty = decision.quantity
            decision.quantity = max_position_size
            
            # Update reasoning to reflect risk adjustment
            risk_adjustment_note = f" [Risk-adjusted from {original_qty:,} to {max_position_size:,} shares based on Kelly Criterion and portfolio limits]"
            decision.reasoning += risk_adjustment_note
        
        # Reduce confidence if position was significantly reduced
        if max_position_size == 0:
            decision.action = "hold"
            decision.quantity = 0
            decision.confidence = min(decision.confidence, 30.0)
            decision.reasoning += " [Position blocked by risk management - insufficient risk budget]"
        elif decision.quantity < (risk_signal.max_position_size or 1) * 0.5:
            decision.confidence = min(decision.confidence, 70.0)
        
        return decision
    
    def _optimize_portfolio_decisions(self, decisions: Dict[str, MegaAgentDecision], portfolio: Dict) -> Dict[str, MegaAgentDecision]:
        """
        Apply portfolio-level optimization and risk management.
        """
        portfolio_value = self._calculate_portfolio_value(portfolio)
        
        # Use risk manager's portfolio optimization
        allocation = self.risk_manager.optimize_portfolio_allocation(decisions, portfolio_value)
        
        # Apply allocation adjustments if needed
        optimized_decisions = decisions.copy()
        
        # Log portfolio summary
        summary = self.risk_manager.get_portfolio_summary(portfolio)
        print(f"\n💼 Portfolio Summary:")
        print(f"   💰 Total Value: ${summary['total_value']:,.2f}")
        print(f"   💵 Cash: ${summary['cash']:,.2f} ({summary['cash_pct']:.1%})")
        print(f"   📊 Positions: {summary['positions_count']}")
        print(f"   📈 Long Exposure: ${summary['long_exposure']:,.2f}")
        print(f"   📉 Short Exposure: ${summary['short_exposure']:,.2f}")
        print(f"   🎯 Largest Position: {summary['largest_position_pct']:.1%}")
        
        if not summary['risk_metrics']['within_risk_limits']:
            print(f"   ⚠️  Warning: Portfolio exceeds risk limits!")
        
        return optimized_decisions
    
    def _get_position_info(self, portfolio, ticker):
        """Extract position information for a specific ticker."""
        positions = portfolio.get("positions", {})
        ticker_position = positions.get(ticker, {})
        
        return {
            "long": ticker_position.get("long", 0),
            "short": ticker_position.get("short", 0),
            "long_cost_basis": ticker_position.get("long_cost_basis", 0),
            "short_cost_basis": ticker_position.get("short_cost_basis", 0),
            "short_margin_used": ticker_position.get("short_margin_used", 0)
        }
    
    def _get_current_price(self, data_fetcher, ticker, end_date):
        """Get the current price for a ticker."""
        try:
            # Try to get the most recent price using Polars
            prices_df = data_fetcher.get_prices(ticker, None, end_date)
            if not prices_df.is_empty():
                # Use Polars syntax to get the last close price
                return float(prices_df.select(pl.col("close")).tail(1).item())
        except Exception as e:
            print(f"Error fetching price for {ticker}: {e}")
        
        # Default fallback value if price can't be fetched
        return 0.0
    
    def _calculate_portfolio_value(self, portfolio):
        """Calculate total portfolio value including positions and cash."""
        cash = portfolio.get("cash", 0)
        positions = portfolio.get("positions", {})
        
        position_value = 0
        for ticker_pos in positions.values():
            long_value = ticker_pos.get("long", 0) * ticker_pos.get("long_cost_basis", 0)
            # Short positions represent a liability, so we subtract them
            short_value = ticker_pos.get("short", 0) * ticker_pos.get("short_cost_basis", 0)
            position_value += long_value - short_value
        
        return cash + position_value
    
    def _calculate_portfolio_exposure(self, portfolio):
        """Calculate portfolio exposure metrics."""
        positions = portfolio.get("positions", {})
        
        long_exposure = 0
        short_exposure = 0
        for ticker_pos in positions.values():
            long_value = ticker_pos.get("long", 0) * ticker_pos.get("long_cost_basis", 0)
            short_value = ticker_pos.get("short", 0) * ticker_pos.get("short_cost_basis", 0)
            long_exposure += long_value
            short_exposure += short_value
        
        return {
            "long": long_exposure,
            "short": short_exposure,
            "gross": long_exposure + short_exposure,
            "net": long_exposure - short_exposure
        }