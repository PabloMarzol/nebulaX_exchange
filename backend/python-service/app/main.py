"""
FastAPI application for AI trading analysis service.
This service provides endpoints for portfolio analysis and trading signal generation.
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging

from app.routers import analysis, signals, portfolio
from app.utils.logging_config import setup_logging

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown events."""
    logger.info("🚀 Starting AI Trading Analysis Service")
    yield
    logger.info("👋 Shutting down AI Trading Analysis Service")


app = FastAPI(
    title="AI Trading Analysis Service",
    description="Multi-agent AI system for crypto portfolio analysis and trading signals",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this based on your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(signals.router, prefix="/api/signals", tags=["Signals"])
app.include_router(portfolio.router, prefix="/api/portfolio", tags=["Portfolio"])


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "AI Trading Analysis Service",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "AI Trading Analysis Service",
        "docs": "/docs",
        "health": "/health"
    }


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
