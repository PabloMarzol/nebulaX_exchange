"""Portfolio endpoints for portfolio metrics and analysis."""
from fastapi import APIRouter, HTTPException
from app.models.request import PortfolioMetricsRequest
from app.models.response import PortfolioMetrics
from app.services.agent_service import AgentService
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize agent service
agent_service = AgentService()


@router.post("/metrics", response_model=PortfolioMetrics)
async def calculate_metrics(request: PortfolioMetricsRequest):
    """
    Calculate portfolio health metrics.

    This endpoint calculates:
    - Total portfolio value
    - Cash percentage
    - Position counts and exposure
    - Risk score
    - Diversification score

    Args:
        request: Portfolio metrics request with portfolio state and tickers

    Returns:
        Portfolio metrics
    """
    try:
        logger.info(f"Calculating portfolio metrics for {len(request.tickers)} tickers")

        metrics = agent_service.calculate_portfolio_metrics(
            portfolio=request.portfolio,
            tickers=request.tickers
        )

        return metrics

    except Exception as e:
        logger.error(f"Error calculating portfolio metrics: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Metrics calculation failed: {str(e)}"
        )
