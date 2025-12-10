"""Response models for the API."""
from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional


class AgentSignal(BaseModel):
    """Signal from a single agent."""
    agent: str = Field(..., description="Agent name")
    signal: str = Field(..., description="Trading signal: bullish, bearish, or neutral")
    confidence: float = Field(..., description="Confidence level (0-100)")
    reasoning: Dict[str, Any] = Field(..., description="Detailed reasoning from the agent")


class TradingDecision(BaseModel):
    """Trading decision for a specific ticker."""
    ticker: str = Field(..., description="Crypto ticker")
    action: str = Field(..., description="Trading action: buy, sell, short, cover, or hold")
    quantity: float = Field(..., description="Quantity to trade")
    confidence: float = Field(..., description="Confidence in the decision (0-100)")
    reasoning: str = Field(..., description="Explanation for the decision")
    agent_signals: Dict[str, AgentSignal] = Field(default={}, description="Signals from all agents")


class AnalysisResponse(BaseModel):
    """Response model for portfolio analysis."""
    decisions: Dict[str, TradingDecision] = Field(..., description="Trading decisions for each ticker")
    portfolio_summary: Dict[str, Any] = Field(..., description="Portfolio summary and metrics")
    timestamp: str = Field(..., description="Analysis timestamp")


class SignalResponse(BaseModel):
    """Response model for single signal generation."""
    ticker: str = Field(..., description="Crypto ticker")
    signal: str = Field(..., description="Trading signal")
    confidence: float = Field(..., description="Confidence level")
    reasoning: Dict[str, Any] = Field(..., description="Detailed reasoning")
    timestamp: str = Field(..., description="Signal generation timestamp")


class PortfolioMetrics(BaseModel):
    """Portfolio health metrics."""
    total_value: float = Field(..., description="Total portfolio value")
    cash: float = Field(..., description="Available cash")
    cash_pct: float = Field(..., description="Cash percentage")
    positions_count: int = Field(..., description="Number of positions")
    long_exposure: float = Field(..., description="Long exposure value")
    short_exposure: float = Field(..., description="Short exposure value")
    largest_position_pct: float = Field(..., description="Largest position as percentage")
    risk_score: float = Field(..., description="Overall risk score (0-100)")
    diversification_score: float = Field(..., description="Diversification score (0-100)")


class BatchSignalResponse(BaseModel):
    """Response model for batch signal generation."""
    signals: Dict[str, SignalResponse] = Field(..., description="Signals for each ticker")
    timestamp: str = Field(..., description="Generation timestamp")


class ErrorResponse(BaseModel):
    """Error response model."""
    error: str = Field(..., description="Error message")
    detail: Optional[str] = Field(None, description="Detailed error information")
    timestamp: str = Field(..., description="Error timestamp")
