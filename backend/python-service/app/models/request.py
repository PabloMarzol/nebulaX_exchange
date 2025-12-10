"""Request models for the API."""
from pydantic import BaseModel, Field
from typing import List, Dict, Optional
from datetime import datetime


class AnalysisRequest(BaseModel):
    """Request model for portfolio analysis."""
    tickers: List[str] = Field(..., description="List of crypto tickers to analyze (e.g., ['BTC', 'ETH', 'SOL'])")
    portfolio: Dict = Field(..., description="Current portfolio state with positions and cash")
    start_date: Optional[str] = Field(None, description="Start date for analysis (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date for analysis (YYYY-MM-DD)")
    model_name: Optional[str] = Field("gpt-4o", description="LLM model to use")
    model_provider: Optional[str] = Field("OpenAI", description="LLM provider")

    class Config:
        json_schema_extra = {
            "example": {
                "tickers": ["BTC", "ETH", "SOL"],
                "portfolio": {
                    "cash": 10000.0,
                    "positions": {
                        "BTC": {"long": 0.5, "short": 0, "long_cost_basis": 45000, "short_cost_basis": 0}
                    }
                },
                "start_date": "2024-11-01",
                "end_date": "2024-12-10",
                "model_name": "gpt-4o",
                "model_provider": "OpenAI"
            }
        }


class SignalRequest(BaseModel):
    """Request model for trading signal generation."""
    ticker: str = Field(..., description="Crypto ticker to analyze")
    agent: Optional[str] = Field(None, description="Specific agent to use (bill_ackman, michael_burry, technical_analyst, risk_manager)")
    start_date: Optional[str] = Field(None, description="Start date for analysis")
    end_date: Optional[str] = Field(None, description="End date for analysis")

    class Config:
        json_schema_extra = {
            "example": {
                "ticker": "BTC",
                "agent": "bill_ackman",
                "start_date": "2024-11-01",
                "end_date": "2024-12-10"
            }
        }


class PortfolioMetricsRequest(BaseModel):
    """Request model for portfolio metrics calculation."""
    portfolio: Dict = Field(..., description="Portfolio state")
    tickers: List[str] = Field(..., description="List of tickers in portfolio")

    class Config:
        json_schema_extra = {
            "example": {
                "portfolio": {
                    "cash": 10000.0,
                    "positions": {
                        "BTC": {"long": 0.5, "short": 0, "long_cost_basis": 45000}
                    }
                },
                "tickers": ["BTC"]
            }
        }


class BatchSignalRequest(BaseModel):
    """Request model for batch signal generation."""
    tickers: List[str] = Field(..., description="List of tickers to analyze")
    start_date: Optional[str] = Field(None, description="Start date for analysis")
    end_date: Optional[str] = Field(None, description="End date for analysis")

    class Config:
        json_schema_extra = {
            "example": {
                "tickers": ["BTC", "ETH", "SOL"],
                "start_date": "2024-11-01",
                "end_date": "2024-12-10"
            }
        }
