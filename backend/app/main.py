from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import time
import logging
import os
from contextlib import asynccontextmanager
from app.routers import portfolio_v2, assets, ml_predictions, auth
from app.database.connection import create_tables, test_db_connection, test_redis_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Rate limiter
limiter = Limiter(key_func=get_remote_address)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup
    logger.info("Starting Portfolio Optimization API...")
    
    # Test connections
    if not test_db_connection():
        logger.error("Database connection failed!")
    else:
        logger.info("Database connection successful")
        
    if not test_redis_connection():
        logger.warning("Redis connection failed - caching disabled")
    else:
        logger.info("Redis connection successful")
    
    # Create database tables
    try:
        create_tables()
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Database setup failed: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Portfolio Optimization API...")

# Create FastAPI app
app = FastAPI(
    title="Portfolio Optimization API",
    description="""
    Advanced Portfolio Optimization API for quantitative finance applications.
    
    ## Features
    
    * **Multiple Optimization Strategies**: Mean-Variance, Black-Litterman, Risk Parity
    * **Comprehensive Risk Metrics**: Sharpe, Sortino, VaR, Maximum Drawdown
    * **Historical Backtesting**: Transaction costs, slippage, benchmark comparison
    * **Machine Learning**: LSTM predictions, regime detection
    * **Real-time Data**: Asset search, historical prices, market data
    * **Professional Grade**: Rate limiting, caching, error handling
    
    ## Authentication
    
    Most endpoints require authentication. Use `/api/auth/demo-login` for testing.
    
    ## Rate Limits
    
    - General endpoints: 100 requests/minute
    - ML endpoints: 10 requests/minute
    - Data endpoints: 50 requests/minute
    """,
    version="2.0.0",
    contact={
        "name": "Portfolio Optimization Team",
        "email": "support@portfolioopt.com",
    },
    license_info={
        "name": "MIT License",
        "url": "https://opensource.org/licenses/MIT",
    },
    lifespan=lifespan
)

# Add rate limiting middleware
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# Security middleware
app.add_middleware(
    TrustedHostMiddleware, 
    allowed_hosts=["localhost", "127.0.0.1", "*.portfolioopt.com"]
)

# CORS middleware
cors_origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")
cors_origins.extend([
    "https://portfolio-optimization-dashboard.vercel.app",
    "https://portfolio-optimizer.vercel.app"
])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time to response headers."""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response

# Set up comprehensive error handling
from app.middleware.error_handling import setup_error_handlers, RequestLoggingMiddleware
setup_error_handlers(app)

# Add request logging middleware
app.add_middleware(RequestLoggingMiddleware)

# Include routers
app.include_router(
    auth.router, 
    prefix="/api/auth", 
    tags=["Authentication"],
    responses={404: {"description": "Not found"}}
)

app.include_router(
    portfolio_v2.router, 
    prefix="/api/portfolio", 
    tags=["Portfolio Optimization"],
    responses={404: {"description": "Not found"}}
)

app.include_router(
    assets.router, 
    prefix="/api/assets", 
    tags=["Asset Data"],
    responses={404: {"description": "Not found"}}
)

app.include_router(
    ml_predictions.router, 
    prefix="/api/ml", 
    tags=["Machine Learning"],
    responses={404: {"description": "Not found"}}
)

@app.get(
    "/",
    summary="API Root",
    description="Welcome endpoint with API information"
)
async def root():
    """API root endpoint with basic information."""
    return {
        "message": "Portfolio Optimization API v2.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/health",
        "features": [
            "Portfolio Optimization",
            "Risk Analytics", 
            "Historical Backtesting",
            "ML Predictions",
            "Real-time Market Data"
        ]
    }

@app.get(
    "/health",
    summary="Health Check",
    description="Check API and database connectivity"
)
async def health_check():
    """Comprehensive health check endpoint."""
    db_status = test_db_connection()
    redis_status = test_redis_connection()
    
    return {
        "status": "healthy" if db_status else "degraded",
        "timestamp": time.time(),
        "services": {
            "database": "connected" if db_status else "disconnected",
            "redis": "connected" if redis_status else "disconnected",
            "api": "operational"
        },
        "version": "2.0.0"
    }

@app.get(
    "/api/status",
    summary="API Status",
    description="Detailed API status and metrics"
)
@limiter.limit("10/minute")
async def api_status(request: Request):
    """Get detailed API status and performance metrics."""
    return {
        "uptime": "operational",
        "rate_limits": {
            "general": "100/minute",
            "ml": "10/minute", 
            "data": "50/minute"
        },
        "supported_methods": [
            "mean_variance",
            "black_litterman", 
            "risk_parity",
            "hierarchical_risk_parity"
        ],
        "ml_models": [
            "lstm_returns",
            "regime_detection"
        ]
    }