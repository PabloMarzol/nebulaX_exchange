"""Analysis endpoints for full portfolio analysis."""
from fastapi import APIRouter, HTTPException
from app.models.request import AnalysisRequest
from app.models.response import AnalysisResponse, ErrorResponse
from app.services.agent_service import AgentService
from datetime import datetime
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize agent service
agent_service = AgentService()


@router.post("/", response_model=AnalysisResponse)
async def analyze_portfolio(request: AnalysisRequest):
    """
    Run full portfolio analysis with all AI agents.

    This endpoint:
    - Analyzes each ticker with all agents (Bill Ackman, Michael Burry, Technical Analyst)
    - Uses LLM meta-reasoning to combine signals
    - Applies risk management constraints
    - Returns trading decisions with confidence scores and reasoning

    Args:
        request: Analysis request with tickers, portfolio state, and parameters

    Returns:
        Analysis response with trading decisions and portfolio summary
    """
    try:
        logger.info(f"Starting portfolio analysis for {len(request.tickers)} tickers")

        result = await agent_service.run_full_analysis(
            tickers=request.tickers,
            portfolio=request.portfolio,
            start_date=request.start_date,
            end_date=request.end_date,
            model_name=request.model_name,
            model_provider=request.model_provider
        )

        logger.info("Portfolio analysis completed successfully")

        return AnalysisResponse(**result)

    except Exception as e:
        logger.error(f"Error in portfolio analysis: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/health")
async def analysis_health():
    """Health check for analysis service."""
    return {
        "status": "healthy",
        "service": "analysis",
        "timestamp": datetime.now().isoformat()
    }
