"""
Pydantic schemas for portfolio optimization API endpoints.
"""

from pydantic import BaseModel, Field, validator, root_validator
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
    
    @validator('symbol')
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
    
    @root_validator
    def validate_weights(cls, values):
        """Ensure min_weight <= max_weight."""
        min_w, max_w = values.get('min_weight', 0), values.get('max_weight', 1)
        if min_w > max_w:
            raise ValueError("min_weight cannot be greater than max_weight")
        return values
    
    class Config:
        schema_extra = {
            "example": {
                "min_weight": 0.05,
                "max_weight": 0.35,
                "sector_limits": {"Technology": 0.40, "Healthcare": 0.25},
                "long_only": True
            }
        }


class MarketView(BaseModel):
    """Market view for Black-Litterman optimization."""
    asset: str = Field(..., description="Asset symbol")
    expected_return: float = Field(..., description="Expected annual return (e.g., 0.12 for 12%)")
    confidence: float = Field(0.5, ge=0, le=1, description="Confidence in view (0-1)")
    
    class Config:
        schema_extra = {
            "example": {
                "asset": "AAPL",
                "expected_return": 0.15,
                "confidence": 0.75
            }
        }


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
    
    @validator('holdings')
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
    
    @root_validator
    def validate_black_litterman(cls, values):
        """Validate Black-Litterman specific requirements."""
        method = values.get('method')
        if method == OptimizationMethod.BLACK_LITTERMAN:
            market_views = values.get('market_views')
            market_caps = values.get('market_caps')
            
            if not market_views:
                raise ValueError("Market views required for Black-Litterman optimization")
            if not market_caps:
                raise ValueError("Market capitalizations required for Black-Litterman optimization")
        
        return values
    
    class Config:
        schema_extra = {
            "example": {
                "holdings": [
                    {"symbol": "AAPL", "allocation": 30},
                    {"symbol": "MSFT", "allocation": 25},
                    {"symbol": "GOOGL", "allocation": 20},
                    {"symbol": "AMZN", "allocation": 15},
                    {"symbol": "TSLA", "allocation": 10}
                ],
                "method": "mean_variance",
                "risk_tolerance": 6,
                "investment_horizon": 5,
                "constraints": {
                    "min_weight": 0.05,
                    "max_weight": 0.35
                }
            }
        }


class RiskMetrics(BaseModel):
    """Comprehensive risk metrics."""
    expected_return: float = Field(..., description="Expected annual return")
    volatility: float = Field(..., description="Annual volatility")
    sharpe_ratio: float = Field(..., description="Sharpe ratio")
    sortino_ratio: Optional[float] = Field(None, description="Sortino ratio")
    calmar_ratio: Optional[float] = Field(None, description="Calmar ratio")
    max_drawdown: Optional[float] = Field(None, description="Maximum drawdown")
    var_95: Optional[float] = Field(None, description="Value at Risk (95%)")
    var_99: Optional[float] = Field(None, description="Value at Risk (99%)")
    cvar_95: Optional[float] = Field(None, description="Conditional VaR (95%)")
    beta: Optional[float] = Field(None, description="Beta vs market")
    
    class Config:
        schema_extra = {
            "example": {
                "expected_return": 0.085,
                "volatility": 0.145,
                "sharpe_ratio": 0.448,
                "sortino_ratio": 0.612,
                "max_drawdown": -0.187,
                "var_95": -0.023
            }
        }


class OptimizationResult(BaseModel):
    """Portfolio optimization result."""
    weights: Dict[str, float] = Field(..., description="Optimal portfolio weights")
    risk_metrics: RiskMetrics = Field(..., description="Portfolio risk metrics")
    method_used: OptimizationMethod = Field(..., description="Optimization method used")
    explanation: str = Field(..., description="Plain English explanation of results")
    confidence_score: float = Field(..., ge=0, le=1, description="Confidence in optimization (0-1)")
    rebalancing_needed: bool = Field(..., description="Whether rebalancing is recommended")
    estimated_cost: Optional[float] = Field(None, description="Estimated transaction cost")
    regime_analysis: Optional[Dict] = Field(None, description="Market regime analysis")
    
    class Config:
        schema_extra = {
            "example": {
                "weights": {
                    "AAPL": 0.25,
                    "MSFT": 0.30,
                    "GOOGL": 0.20,
                    "AMZN": 0.15,
                    "TSLA": 0.10
                },
                "risk_metrics": {
                    "expected_return": 0.085,
                    "volatility": 0.145,
                    "sharpe_ratio": 0.448
                },
                "method_used": "mean_variance",
                "explanation": "This portfolio maximizes risk-adjusted returns...",
                "confidence_score": 0.78,
                "rebalancing_needed": True
            }
        }


class BacktestRequest(BaseModel):
    """Backtesting request parameters."""
    strategy: OptimizationMethod = Field(..., description="Strategy to backtest")
    start_date: date = Field(..., description="Backtest start date")
    end_date: Optional[date] = Field(None, description="Backtest end date (default: today)")
    initial_value: float = Field(100000, gt=0, description="Initial portfolio value")
    rebalance_frequency: Literal["daily", "weekly", "monthly", "quarterly"] = Field(
        "monthly", description="Rebalancing frequency"
    )
    transaction_cost: float = Field(0.001, ge=0, le=0.1, description="Transaction cost as fraction")
    slippage: float = Field(0.0005, ge=0, le=0.01, description="Market impact slippage")
    benchmark: str = Field("SPY", description="Benchmark symbol for comparison")
    assets: List[str] = Field(..., description="Assets to include in backtest")
    constraints: Optional[Constraints] = Field(None, description="Portfolio constraints")
    
    @validator('end_date')
    def validate_end_date(cls, v, values):
        """Ensure end_date is after start_date."""
        start_date = values.get('start_date')
        if v and start_date and v <= start_date:
            raise ValueError("end_date must be after start_date")
        return v
    
    @validator('assets')
    def validate_assets(cls, v):
        """Validate assets list."""
        if len(v) < 2:
            raise ValueError("At least 2 assets required for backtesting")
        if len(set(v)) != len(v):
            raise ValueError("Duplicate assets found")
        return [asset.upper().strip() for asset in v]
    
    class Config:
        schema_extra = {
            "example": {
                "strategy": "mean_variance",
                "start_date": "2020-01-01",
                "end_date": "2023-12-31",
                "initial_value": 100000,
                "rebalance_frequency": "monthly",
                "transaction_cost": 0.001,
                "benchmark": "SPY",
                "assets": ["AAPL", "MSFT", "GOOGL", "AMZN"]
            }
        }


class BacktestResult(BaseModel):
    """Backtesting results."""
    total_return: float = Field(..., description="Total strategy return")
    annual_return: float = Field(..., description="Annualized return")
    volatility: float = Field(..., description="Annual volatility")
    sharpe_ratio: float = Field(..., description="Sharpe ratio")
    max_drawdown: float = Field(..., description="Maximum drawdown")
    calmar_ratio: float = Field(..., description="Calmar ratio")
    win_rate: float = Field(..., description="Percentage of profitable periods")
    
    # Benchmark comparison
    benchmark_return: float = Field(..., description="Benchmark total return")
    excess_return: float = Field(..., description="Excess return vs benchmark")
    information_ratio: float = Field(..., description="Information ratio")
    tracking_error: float = Field(..., description="Tracking error vs benchmark")
    
    # Detailed metrics
    monthly_returns: List[float] = Field(..., description="Monthly return series")
    cumulative_returns: List[float] = Field(..., description="Cumulative return series")
    drawdown_series: List[float] = Field(..., description="Drawdown series")
    turnover: List[float] = Field(..., description="Monthly turnover")
    
    # Costs and efficiency
    total_costs: float = Field(..., description="Total transaction costs")
    cost_ratio: float = Field(..., description="Costs as % of returns")
    
    summary: str = Field(..., description="Performance summary")
    
    class Config:
        schema_extra = {
            "example": {
                "total_return": 0.42,
                "annual_return": 0.12,
                "volatility": 0.16,
                "sharpe_ratio": 0.68,
                "max_drawdown": -0.18,
                "benchmark_return": 0.35,
                "excess_return": 0.07,
                "information_ratio": 0.45,
                "summary": "Strategy outperformed benchmark with moderate volatility..."
            }
        }


class AssetSearchResponse(BaseModel):
    """Asset search response."""
    symbol: str = Field(..., description="Asset symbol")
    name: str = Field(..., description="Company name")
    sector: Optional[str] = Field(None, description="Sector")
    market_cap: Optional[float] = Field(None, description="Market capitalization")
    current_price: Optional[float] = Field(None, description="Current price")
    currency: str = Field("USD", description="Price currency")
    exchange: Optional[str] = Field(None, description="Stock exchange")
    
    class Config:
        schema_extra = {
            "example": {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "sector": "Technology",
                "market_cap": 2800000000000,
                "current_price": 175.50,
                "exchange": "NASDAQ"
            }
        }


class HistoricalDataRequest(BaseModel):
    """Historical data request."""
    symbols: List[str] = Field(..., description="Asset symbols")
    start_date: date = Field(..., description="Start date")
    end_date: Optional[date] = Field(None, description="End date (default: today)")
    frequency: Literal["daily", "weekly", "monthly"] = Field("daily", description="Data frequency")
    include_returns: bool = Field(True, description="Include calculated returns")
    include_metrics: bool = Field(True, description="Include basic statistics")
    
    @validator('symbols')
    def validate_symbols(cls, v):
        """Validate symbols."""
        if not v:
            raise ValueError("At least one symbol required")
        return [s.upper().strip() for s in v]
    
    class Config:
        schema_extra = {
            "example": {
                "symbols": ["AAPL", "MSFT", "GOOGL"],
                "start_date": "2022-01-01",
                "end_date": "2023-12-31",
                "frequency": "daily",
                "include_returns": True
            }
        }


class PredictionRequest(BaseModel):
    """ML prediction request."""
    symbols: List[str] = Field(..., description="Assets to predict")
    horizon: int = Field(30, ge=1, le=252, description="Prediction horizon in days")
    model_type: Literal["lstm", "regime_detection"] = Field("lstm", description="ML model type")
    confidence_level: float = Field(0.95, ge=0.5, le=0.99, description="Confidence level for intervals")
    
    @validator('symbols')
    def validate_symbols(cls, v):
        """Validate symbols."""
        if not v:
            raise ValueError("At least one symbol required")
        if len(v) > 10:
            raise ValueError("Maximum 10 symbols allowed")
        return [s.upper().strip() for s in v]
    
    class Config:
        schema_extra = {
            "example": {
                "symbols": ["AAPL", "MSFT"],
                "horizon": 30,
                "model_type": "lstm",
                "confidence_level": 0.95
            }
        }