"""Signals endpoints for trading signal generation."""
from fastapi import APIRouter, HTTPException
from app.models.request import SignalRequest, BatchSignalRequest
from app.models.response import SignalResponse, BatchSignalResponse
from app.services.agent_service import AgentService
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize agent service
agent_service = AgentService()


@router.post("/", response_model=SignalResponse)
async def generate_signal(request: SignalRequest):
    """
    Generate a trading signal for a specific ticker.

    Args:
        request: Signal request with ticker and optional agent specification

    Returns:
        Trading signal with confidence and reasoning
    """
    try:
        logger.info(f"Generating signal for {request.ticker}" + (f" using {request.agent}" if request.agent else ""))

        result = await agent_service.generate_signal(
            ticker=request.ticker,
            agent=request.agent,
            start_date=request.start_date,
            end_date=request.end_date
        )

        return SignalResponse(**result)

    except Exception as e:
        logger.error(f"Error generating signal: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Signal generation failed: {str(e)}"
        )


@router.post("/batch", response_model=BatchSignalResponse)
async def generate_batch_signals(request: BatchSignalRequest):
    """
    Generate signals for multiple tickers.

    Args:
        request: Batch signal request with list of tickers

    Returns:
        Signals for all requested tickers
    """
    try:
        logger.info(f"Generating batch signals for {len(request.tickers)} tickers")

        signals = {}
        for ticker in request.tickers:
            try:
                result = await agent_service.generate_signal(
                    ticker=ticker,
                    start_date=request.start_date,
                    end_date=request.end_date
                )
                signals[ticker] = SignalResponse(**result)
            except Exception as e:
                logger.error(f"Error generating signal for {ticker}: {e}")
                # Continue with other tickers
                signals[ticker] = SignalResponse(
                    ticker=ticker,
                    signal="error",
                    confidence=0.0,
                    reasoning={"error": str(e)},
                    timestamp=datetime.now().isoformat()
                )

        return BatchSignalResponse(
            signals=signals,
            timestamp=datetime.now().isoformat()
        )

    except Exception as e:
        logger.error(f"Error in batch signal generation: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Batch signal generation failed: {str(e)}"
        )


@router.get("/agents")
async def list_agents():
    """List available AI agents."""
    return {
        "agents": [
            {
                "name": "bill_ackman",
                "description": "Value investor focusing on high-quality businesses with catalysts",
                "strategy": "Fundamental analysis, activism potential, margin of safety"
            },
            {
                "name": "michael_burry",
                "description": "Contrarian investor looking for undervalued opportunities",
                "strategy": "Deep value, market inefficiencies, contrarian positions"
            },
            {
                "name": "technical_analyst",
                "description": "Technical analysis using price action and indicators",
                "strategy": "Chart patterns, momentum, trend following"
            },
            {
                "name": "risk_manager",
                "description": "Risk management and position sizing",
                "strategy": "Kelly Criterion, portfolio optimization, risk limits"
            }
        ]
    }
