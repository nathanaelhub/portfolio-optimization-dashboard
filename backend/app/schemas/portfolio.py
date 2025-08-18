"""
Pydantic schemas for portfolio optimization API endpoints.
"""

from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Dict, List, Optional, Union, Literal
from datetime import datetime, date
from enum import Enum


class OptimizationMethod(str, Enum):
    """Supported optimization methods."""
    MEAN_VARIANCE = "mean_variance"
    BLACK_LITTERMAN = "black_litterman"
    RISK_PARITY = "risk_parity"
    HIERARCHICAL_RISK_PARITY = "hierarchical_risk_parity"


class RiskLevel(str, Enum):
    """Risk tolerance levels."""
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class Holding(BaseModel):
    """Individual portfolio holding."""
    symbol: str = Field(..., description="Asset symbol (e.g., AAPL)")
    allocation: float = Field(..., ge=0, le=100, description="Allocation percentage (0-100)")
    shares: Optional[float] = Field(None, description="Number of shares owned")
    value: Optional[float] = Field(None, description="Market value in USD")
    
    @field_validator('symbol')
    @classmethod
    def validate_symbol(cls, v):
        """Validate and clean symbol."""
        return v.upper().strip()
    
    class Config:
        schema_extra = {
            "example": {
                "symbol": "AAPL",
                "allocation": 25.5,
                "shares": 100,
                "value": 15000
            }
        }


class Constraints(BaseModel):
    """Portfolio optimization constraints."""
    min_weight: float = Field(0.0, ge=0, le=1, description="Minimum weight per asset")
    max_weight: float = Field(0.4, ge=0, le=1, description="Maximum weight per asset")
    sector_limits: Optional[Dict[str, float]] = Field(None, description="Maximum allocation per sector")
    asset_limits: Optional[Dict[str, Dict[str, float]]] = Field(None, description="Custom limits per asset")
    long_only: bool = Field(True, description="Long-only portfolio constraint")
    
    @model_validator(mode='after')
    def validate_weights(self):
        """Ensure min_weight <= max_weight."""
        if self.min_weight > self.max_weight:
            raise ValueError("min_weight cannot be greater than max_weight")
        return self


class MarketView(BaseModel):
    """Market view for Black-Litterman optimization."""
    assets: List[str] = Field(..., description="Assets in the view")
    view_return: float = Field(..., description="Expected return for the view")
    confidence: float = Field(..., ge=0, le=1, description="Confidence in the view (0-1)")


class OptimizationRequest(BaseModel):
    """Portfolio optimization request."""
    holdings: List[Holding] = Field(..., description="Current portfolio holdings")
    method: OptimizationMethod = Field(OptimizationMethod.MEAN_VARIANCE, description="Optimization method")
    risk_tolerance: int = Field(5, ge=1, le=10, description="Risk tolerance (1=conservative, 10=aggressive)")
    investment_horizon: int = Field(5, ge=1, le=30, description="Investment horizon in years")
    constraints: Optional[Constraints] = Field(None, description="Portfolio constraints")
    market_views: Optional[List[MarketView]] = Field(None, description="Market views for Black-Litterman")
    market_caps: Optional[Dict[str, float]] = Field(None, description="Market capitalizations for Black-Litterman")
    target_return: Optional[float] = Field(None, description="Target annual return for mean-variance")
    
    @field_validator('holdings')
    @classmethod
    def validate_holdings(cls, v):
        """Validate holdings list."""
        if not v:
            raise ValueError("At least one holding is required")
        
        symbols = [h.symbol for h in v]
        if len(symbols) != len(set(symbols)):
            raise ValueError("Duplicate symbols found in holdings")
        
        total_allocation = sum(h.allocation for h in v)
        if abs(total_allocation - 100) > 0.01:
            raise ValueError(f"Total allocation must equal 100%, got {total_allocation}%")
        
        return v


class OptimizationResult(BaseModel):
    """Portfolio optimization result."""
    method: OptimizationMethod
    optimized_weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    optimization_status: str
    risk_metrics: Dict[str, float]
    diversification_ratio: Optional[float] = None
    max_drawdown: Optional[float] = None
    
    class Config:
        schema_extra = {
            "example": {
                "method": "mean_variance",
                "optimized_weights": {"AAPL": 0.25, "MSFT": 0.20, "GOOGL": 0.15},
                "expected_return": 0.12,
                "volatility": 0.18,
                "sharpe_ratio": 0.67,
                "optimization_status": "success",
                "risk_metrics": {"var_95": -0.15, "cvar_95": -0.20}
            }
        }


class BacktestRequest(BaseModel):
    """Backtesting request."""
    holdings: List[Holding]
    start_date: date
    end_date: date
    initial_value: float = Field(100000, gt=0, description="Initial portfolio value")
    rebalance_frequency: str = Field("monthly", pattern="^(daily|weekly|monthly|quarterly|yearly)$")
    
    @field_validator('end_date')
    @classmethod  
    def validate_end_date(cls, v, info):
        """Ensure end_date is after start_date."""
        if 'start_date' in info.data and v <= info.data['start_date']:
            raise ValueError("end_date must be after start_date")
        return v


class BacktestResult(BaseModel):
    """Backtesting result."""
    total_return: float
    annualized_return: float
    volatility: float
    sharpe_ratio: float
    max_drawdown: float
    calmar_ratio: float
    sortino_ratio: float
    portfolio_values: List[Dict[str, Union[str, float]]]
    benchmark_comparison: Optional[Dict[str, float]] = None


class RiskAnalysisRequest(BaseModel):
    """Risk analysis request."""
    holdings: List[Holding]
    confidence_level: float = Field(0.95, ge=0.90, le=0.99, description="Confidence level for VaR/CVaR")
    time_horizon: int = Field(22, ge=1, le=250, description="Time horizon in days")


class RiskAnalysisResult(BaseModel):
    """Risk analysis result."""
    var: float = Field(..., description="Value at Risk")
    cvar: float = Field(..., description="Conditional Value at Risk")
    maximum_drawdown: float
    downside_deviation: float
    beta: Optional[float] = None
    correlation_matrix: Dict[str, Dict[str, float]]
    sector_exposure: Dict[str, float]
    concentration_risk: float


class RiskMetrics(BaseModel):
    """Risk metrics calculation result."""
    var_95: float = Field(..., description="Value at Risk at 95% confidence")
    cvar_95: float = Field(..., description="Conditional Value at Risk at 95% confidence")
    max_drawdown: float = Field(..., description="Maximum drawdown")
    volatility: float = Field(..., description="Annualized volatility")
    downside_deviation: float = Field(..., description="Downside deviation")
    beta: Optional[float] = Field(None, description="Beta vs benchmark")
    sharpe_ratio: float = Field(..., description="Sharpe ratio")
    sortino_ratio: float = Field(..., description="Sortino ratio")
    calmar_ratio: float = Field(..., description="Calmar ratio")


class MarketDataRequest(BaseModel):
    """Market data request."""
    symbols: List[str]
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    frequency: str = Field("daily", pattern="^(daily|weekly|monthly)$")
    
    @field_validator('symbols')
    @classmethod
    def validate_symbols(cls, v):
        """Validate and clean symbols."""
        if not v:
            raise ValueError("At least one symbol is required")
        return [s.upper().strip() for s in v]


class PortfolioPerformance(BaseModel):
    """Portfolio performance metrics."""
    total_return: float
    annualized_return: float
    volatility: float
    sharpe_ratio: float
    sortino_ratio: float
    max_drawdown: float
    calmar_ratio: float
    information_ratio: Optional[float] = None
    tracking_error: Optional[float] = None
    alpha: Optional[float] = None
    beta: Optional[float] = None
    r_squared: Optional[float] = None


class EfficientFrontierRequest(BaseModel):
    """Efficient frontier request."""
    symbols: List[str]
    num_portfolios: int = Field(100, ge=10, le=1000, description="Number of portfolios to generate")
    target_returns: Optional[List[float]] = None
    
    @field_validator('symbols')
    @classmethod
    def validate_symbols(cls, v):
        """Validate symbols."""
        if len(v) < 2:
            raise ValueError("At least 2 symbols required for efficient frontier")
        return [s.upper().strip() for s in v]


class EfficientFrontierResult(BaseModel):
    """Efficient frontier result."""
    returns: List[float]
    volatilities: List[float]
    sharpe_ratios: List[float]
    weights: List[Dict[str, float]]
    optimal_portfolio: Dict[str, Union[float, Dict[str, float]]]


# Response models
class APIResponse(BaseModel):
    """Standard API response wrapper."""
    success: bool
    message: str
    data: Optional[Union[
        OptimizationResult,
        BacktestResult, 
        RiskAnalysisResult,
        EfficientFrontierResult,
        PortfolioPerformance,
        Dict,
        List
    ]] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.now)


class AssetSearchResponse(BaseModel):
    """Asset search response."""
    symbol: str
    name: str
    exchange: str
    asset_type: str = Field(default="Stock")
    currency: str = Field(default="USD")
    country: str = Field(default="US")


class HistoricalDataRequest(BaseModel):
    """Historical data request."""
    symbols: List[str]
    start_date: date
    end_date: date
    interval: str = Field("1d", pattern="^(1d|1wk|1mo)$")
    
    @field_validator('symbols')
    @classmethod
    def validate_symbols(cls, v):
        """Validate and clean symbols."""
        if not v:
            raise ValueError("At least one symbol is required")
        return [s.upper().strip() for s in v]


class PredictionRequest(BaseModel):
    """ML prediction request."""
    symbols: List[str]
    horizon_days: int = Field(30, ge=1, le=365, description="Prediction horizon in days")
    model_type: str = Field("lstm", pattern="^(lstm|arima|prophet)$")
    
    @field_validator('symbols')
    @classmethod
    def validate_symbols(cls, v):
        """Validate and clean symbols."""
        if not v:
            raise ValueError("At least one symbol is required")
        return [s.upper().strip() for s in v]


class PredictionResult(BaseModel):
    """ML prediction result."""
    symbol: str
    predictions: List[Dict[str, Union[str, float]]]
    confidence_intervals: Optional[Dict[str, List[float]]] = None
    model_metrics: Dict[str, float]
    last_updated: datetime


class HealthCheck(BaseModel):
    """Health check response."""
    status: str = "healthy"
    timestamp: datetime = Field(default_factory=datetime.now)
    version: str = "1.0.0"
    database: str = "connected"
    cache: str = "connected"