"""
Database Models for Portfolio Optimization Dashboard
Comprehensive schema for portfolios, assets, prices, and optimization results
"""

from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, ForeignKey, Index, Enum as SQLEnum, JSON, DECIMAL
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from enum import Enum
from datetime import datetime
from typing import Dict, List, Optional, Any
import uuid

Base = declarative_base()


class OptimizationMethod(Enum):
    """Portfolio optimization methods"""
    MEAN_VARIANCE = "mean_variance"
    BLACK_LITTERMAN = "black_litterman"
    RISK_PARITY = "risk_parity"
    HIERARCHICAL_RISK_PARITY = "hierarchical_risk_parity"
    MINIMUM_VARIANCE = "minimum_variance"
    MAXIMUM_SHARPE = "maximum_sharpe"


class DataQuality(Enum):
    """Data quality levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


class PortfolioStatus(Enum):
    """Portfolio status"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DRAFT = "draft"


class User(Base):
    """User accounts"""
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    
    # Preferences
    default_currency = Column(String(3), default="USD")
    risk_tolerance = Column(Integer, default=5)  # 1-10 scale
    preferred_optimization_method = Column(SQLEnum(OptimizationMethod), default=OptimizationMethod.MEAN_VARIANCE)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)
    is_premium = Column(Boolean, default=False)
    
    # Relationships
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    optimization_results = relationship("OptimizationResult", back_populates="user")


class Asset(Base):
    """Asset information and metadata"""
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    
    # Classification
    asset_type = Column(String(50))  # stock, bond, etf, mutual_fund, crypto, etc.
    sector = Column(String(100))
    industry = Column(String(100))
    category = Column(String(100))
    
    # Market Information
    exchange = Column(String(50))
    currency = Column(String(3), default="USD")
    country = Column(String(50))
    market_cap = Column(DECIMAL(20, 2))
    
    # Company Information
    website = Column(String(500))
    description = Column(Text)
    headquarters = Column(String(200))
    employees = Column(Integer)
    founded_year = Column(Integer)
    
    # Trading Information
    average_volume = Column(DECIMAL(20, 2))
    beta = Column(Float)
    pe_ratio = Column(Float)
    dividend_yield = Column(Float)
    fifty_two_week_high = Column(DECIMAL(10, 4))
    fifty_two_week_low = Column(DECIMAL(10, 4))
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_data_update = Column(DateTime)
    is_active = Column(Boolean, default=True)
    data_quality_score = Column(Float, default=1.0)
    
    # Relationships
    price_history = relationship("PriceHistory", back_populates="asset", cascade="all, delete-orphan")
    portfolio_holdings = relationship("PortfolioHolding", back_populates="asset")
    
    # Indexes
    __table_args__ = (
        Index('idx_asset_sector_industry', 'sector', 'industry'),
        Index('idx_asset_type_currency', 'asset_type', 'currency'),
        Index('idx_asset_market_cap', 'market_cap'),
    )


class Portfolio(Base):
    """User portfolios"""
    __tablename__ = "portfolios"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Portfolio Information
    name = Column(String(255), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(PortfolioStatus), default=PortfolioStatus.ACTIVE)
    
    # Portfolio Parameters
    base_currency = Column(String(3), default="USD")
    total_value = Column(DECIMAL(20, 2), default=0)
    risk_tolerance = Column(Integer, default=5)  # 1-10 scale
    investment_objective = Column(String(100))  # growth, income, balanced, etc.
    time_horizon_years = Column(Integer)
    
    # Constraints
    max_position_size = Column(Float, default=0.4)  # 40% max per position
    min_position_size = Column(Float, default=0.01)  # 1% min per position
    max_sector_allocation = Column(Float, default=0.5)  # 50% max per sector
    
    # Performance Tracking
    inception_date = Column(DateTime, default=func.now())
    last_rebalance_date = Column(DateTime)
    target_rebalance_frequency_days = Column(Integer, default=30)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="portfolios")
    holdings = relationship("PortfolioHolding", back_populates="portfolio", cascade="all, delete-orphan")
    optimization_results = relationship("OptimizationResult", back_populates="portfolio")
    performance_snapshots = relationship("PerformanceSnapshot", back_populates="portfolio", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index('idx_portfolio_user_status', 'user_id', 'status'),
        Index('idx_portfolio_created', 'created_at'),
    )


class PortfolioHolding(Base):
    """Individual holdings within portfolios"""
    __tablename__ = "portfolio_holdings"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    
    # Position Information
    target_allocation = Column(Float, nullable=False)  # Target percentage (0-1)
    current_allocation = Column(Float, nullable=False)  # Current percentage (0-1)
    shares = Column(DECIMAL(20, 6), default=0)
    average_cost = Column(DECIMAL(10, 4), default=0)
    current_price = Column(DECIMAL(10, 4), default=0)
    current_value = Column(DECIMAL(20, 2), default=0)
    
    # Performance Metrics
    unrealized_gain_loss = Column(DECIMAL(20, 2), default=0)
    unrealized_gain_loss_pct = Column(Float, default=0)
    total_return = Column(Float, default=0)
    
    # Trading Information
    last_trade_date = Column(DateTime)
    last_price_update = Column(DateTime)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="holdings")
    asset = relationship("Asset", back_populates="portfolio_holdings")
    
    # Constraints
    __table_args__ = (
        Index('idx_holding_portfolio_asset', 'portfolio_id', 'asset_id'),
        Index('idx_holding_allocation', 'target_allocation'),
    )


class PriceHistory(Base):
    """Historical price data for assets"""
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    
    # Price Data
    date = Column(DateTime, nullable=False, index=True)
    open_price = Column(DECIMAL(12, 4), nullable=False)
    high_price = Column(DECIMAL(12, 4), nullable=False)
    low_price = Column(DECIMAL(12, 4), nullable=False)
    close_price = Column(DECIMAL(12, 4), nullable=False)
    adjusted_close = Column(DECIMAL(12, 4), nullable=False)
    volume = Column(DECIMAL(20, 0), default=0)
    
    # Calculated Fields
    daily_return = Column(Float)
    volatility_20d = Column(Float)  # 20-day rolling volatility
    sma_20 = Column(DECIMAL(12, 4))  # 20-day simple moving average
    sma_50 = Column(DECIMAL(12, 4))  # 50-day simple moving average
    rsi = Column(Float)  # Relative Strength Index
    
    # Data Quality
    data_quality = Column(SQLEnum(DataQuality), default=DataQuality.GOOD)
    data_source = Column(String(50), default="yahoo_finance")
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="price_history")
    
    # Constraints and Indexes
    __table_args__ = (
        Index('idx_price_asset_date', 'asset_id', 'date'),
        Index('idx_price_date', 'date'),
        Index('idx_price_quality', 'data_quality'),
    )


class OptimizationResult(Base):
    """Portfolio optimization results"""
    __tablename__ = "optimization_results"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String(36), unique=True, index=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    
    # Optimization Parameters
    method = Column(SQLEnum(OptimizationMethod), nullable=False)
    risk_tolerance = Column(Integer, nullable=False)
    target_return = Column(Float)
    
    # Constraints Used
    max_position_size = Column(Float, default=0.4)
    min_position_size = Column(Float, default=0.01)
    sector_constraints = Column(JSON)  # Sector allocation limits
    
    # ML Enhancement Flags
    used_ml_predictions = Column(Boolean, default=False)
    used_regime_adjustment = Column(Boolean, default=False)
    market_regime = Column(String(50))
    
    # Results
    optimized_weights = Column(JSON, nullable=False)  # {symbol: weight}
    expected_return = Column(Float)
    expected_volatility = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float)
    var_95 = Column(Float)  # Value at Risk (95%)
    cvar_95 = Column(Float)  # Conditional Value at Risk (95%)
    
    # Frontier Data
    efficient_frontier_points = Column(JSON)  # List of risk/return points
    
    # Performance Metrics
    confidence_score = Column(Float, default=0.7)
    backtesting_sharpe = Column(Float)
    backtesting_return = Column(Float)
    backtesting_volatility = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    computation_time_seconds = Column(Float)
    data_date_range_start = Column(DateTime)
    data_date_range_end = Column(DateTime)
    
    # Implementation Status
    is_implemented = Column(Boolean, default=False)
    implementation_date = Column(DateTime)
    
    # Relationships
    user = relationship("User", back_populates="optimization_results")
    portfolio = relationship("Portfolio", back_populates="optimization_results")
    
    # Indexes
    __table_args__ = (
        Index('idx_optimization_portfolio_method', 'portfolio_id', 'method'),
        Index('idx_optimization_created', 'created_at'),
        Index('idx_optimization_sharpe', 'sharpe_ratio'),
    )


class PerformanceSnapshot(Base):
    """Daily portfolio performance snapshots"""
    __tablename__ = "performance_snapshots"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    
    # Date and Value
    snapshot_date = Column(DateTime, nullable=False, index=True)
    total_value = Column(DECIMAL(20, 2), nullable=False)
    
    # Performance Metrics
    daily_return = Column(Float)
    cumulative_return = Column(Float)
    ytd_return = Column(Float)
    
    # Risk Metrics
    portfolio_beta = Column(Float)
    portfolio_volatility = Column(Float)
    sharpe_ratio = Column(Float)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float)
    
    # Allocation Summary
    equity_allocation = Column(Float)
    fixed_income_allocation = Column(Float)
    alternative_allocation = Column(Float)
    cash_allocation = Column(Float)
    
    # Sector Allocation (JSON)
    sector_allocations = Column(JSON)
    
    # Benchmark Comparison
    benchmark_return = Column(Float)  # S&P 500 or custom benchmark
    alpha = Column(Float)
    tracking_error = Column(Float)
    information_ratio = Column(Float)
    
    # Market Conditions
    market_regime = Column(String(50))
    vix_level = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="performance_snapshots")
    
    # Constraints
    __table_args__ = (
        Index('idx_performance_portfolio_date', 'portfolio_id', 'snapshot_date'),
        Index('idx_performance_date', 'snapshot_date'),
    )


class MarketData(Base):
    """Market indices and economic indicators"""
    __tablename__ = "market_data"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Identifier
    indicator = Column(String(50), nullable=False, index=True)  # SPY, VIX, 10Y_TREASURY, etc.
    date = Column(DateTime, nullable=False, index=True)
    
    # Values
    value = Column(DECIMAL(12, 4), nullable=False)
    open_value = Column(DECIMAL(12, 4))
    high_value = Column(DECIMAL(12, 4))
    low_value = Column(DECIMAL(12, 4))
    volume = Column(DECIMAL(20, 0))
    
    # Calculated Fields
    daily_change = Column(Float)
    percent_change = Column(Float)
    
    # Data Quality
    data_quality = Column(SQLEnum(DataQuality), default=DataQuality.GOOD)
    data_source = Column(String(50), default="yahoo_finance")
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    
    # Constraints
    __table_args__ = (
        Index('idx_market_data_indicator_date', 'indicator', 'date'),
    )


class DataQualityReport(Base):
    """Data quality monitoring and reports"""
    __tablename__ = "data_quality_reports"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Report Information
    report_date = Column(DateTime, nullable=False, default=func.now())
    report_type = Column(String(50), nullable=False)  # daily, weekly, symbol_validation, etc.
    
    # Scope
    symbols_analyzed = Column(JSON)  # List of symbols
    date_range_start = Column(DateTime)
    date_range_end = Column(DateTime)
    
    # Results
    overall_quality_score = Column(Float, nullable=False)
    total_data_points = Column(Integer, default=0)
    missing_data_points = Column(Integer, default=0)
    poor_quality_points = Column(Integer, default=0)
    
    # Issues and Recommendations
    issues_found = Column(JSON)  # List of issues
    recommendations = Column(JSON)  # List of recommendations
    
    # Detailed Results
    symbol_quality_scores = Column(JSON)  # {symbol: score}
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    
    # Indexes
    __table_args__ = (
        Index('idx_quality_report_date', 'report_date'),
        Index('idx_quality_report_type', 'report_type'),
    )


class MLPrediction(Base):
    """Machine learning predictions and analysis"""
    __tablename__ = "ml_predictions"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    
    # Prediction Information
    prediction_date = Column(DateTime, nullable=False, default=func.now())
    forecast_horizon_days = Column(Integer, nullable=False)
    model_version = Column(String(50), nullable=False)
    
    # Predictions
    forecast_return = Column(Float, nullable=False)
    confidence_lower = Column(Float)
    confidence_upper = Column(Float)
    model_confidence = Column(Float, nullable=False)
    
    # Market Regime
    market_regime = Column(String(50))
    regime_confidence = Column(Float)
    
    # Feature Importance (JSON)
    feature_importance = Column(JSON)
    
    # Model Performance
    mse_score = Column(Float)
    mae_score = Column(Float)
    r2_score = Column(Float)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    asset = relationship("Asset")
    
    # Indexes
    __table_args__ = (
        Index('idx_ml_prediction_asset_date', 'asset_id', 'prediction_date'),
        Index('idx_ml_prediction_horizon', 'forecast_horizon_days'),
    )


class BacktestResult(Base):
    """Backtesting results for strategies and models"""
    __tablename__ = "backtest_results"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Backtest Information
    strategy_name = Column(String(255), nullable=False)
    backtest_start_date = Column(DateTime, nullable=False)
    backtest_end_date = Column(DateTime, nullable=False)
    
    # Strategy Parameters
    optimization_method = Column(SQLEnum(OptimizationMethod))
    rebalance_frequency_days = Column(Integer, default=30)
    used_ml_enhancements = Column(Boolean, default=False)
    strategy_parameters = Column(JSON)  # Additional parameters
    
    # Performance Results
    total_return = Column(Float, nullable=False)
    annual_return = Column(Float, nullable=False)
    annual_volatility = Column(Float, nullable=False)
    sharpe_ratio = Column(Float, nullable=False)
    sortino_ratio = Column(Float)
    max_drawdown = Column(Float, nullable=False)
    calmar_ratio = Column(Float)
    
    # Risk Metrics
    var_95 = Column(Float)
    cvar_95 = Column(Float)
    beta = Column(Float)
    alpha = Column(Float)
    
    # Benchmark Comparison
    benchmark_return = Column(Float)
    benchmark_volatility = Column(Float)
    tracking_error = Column(Float)
    information_ratio = Column(Float)
    
    # Trade Statistics
    total_trades = Column(Integer, default=0)
    winning_trades = Column(Integer, default=0)
    win_rate = Column(Float)
    average_trade_return = Column(Float)
    
    # Detailed Results (JSON)
    monthly_returns = Column(JSON)
    drawdown_periods = Column(JSON)
    sector_performance = Column(JSON)
    
    # Metadata
    created_at = Column(DateTime, default=func.now())
    computation_time_seconds = Column(Float)
    
    # Indexes
    __table_args__ = (
        Index('idx_backtest_strategy_date', 'strategy_name', 'backtest_start_date'),
        Index('idx_backtest_sharpe', 'sharpe_ratio'),
    )


# Database utilities and functions
def create_tables(engine):
    """Create all tables"""
    Base.metadata.create_all(bind=engine)


def get_table_info():
    """Get information about all tables"""
    tables = {}
    for table_name, table in Base.metadata.tables.items():
        tables[table_name] = {
            'columns': [col.name for col in table.columns],
            'indexes': [idx.name for idx in table.indexes],
            'foreign_keys': [fk.column.table.name for fk in table.foreign_keys]
        }
    return tables


# Sample data creation functions
def create_sample_data(session):
    """Create sample data for testing"""
    
    # Create sample user
    user = User(
        email="test@example.com",
        username="testuser",
        hashed_password="hashed_password_here",
        full_name="Test User",
        risk_tolerance=6
    )
    session.add(user)
    session.flush()
    
    # Create sample assets
    assets = [
        Asset(symbol="AAPL", name="Apple Inc.", sector="Technology", industry="Consumer Electronics", 
              exchange="NASDAQ", currency="USD", country="US"),
        Asset(symbol="MSFT", name="Microsoft Corporation", sector="Technology", industry="Software",
              exchange="NASDAQ", currency="USD", country="US"),
        Asset(symbol="GOOGL", name="Alphabet Inc.", sector="Technology", industry="Internet Services",
              exchange="NASDAQ", currency="USD", country="US"),
        Asset(symbol="AMZN", name="Amazon.com Inc.", sector="Consumer Discretionary", industry="E-commerce",
              exchange="NASDAQ", currency="USD", country="US"),
        Asset(symbol="TSLA", name="Tesla Inc.", sector="Consumer Discretionary", industry="Automotive",
              exchange="NASDAQ", currency="USD", country="US")
    ]
    
    for asset in assets:
        session.add(asset)
    session.flush()
    
    # Create sample portfolio
    portfolio = Portfolio(
        user_id=user.id,
        name="Sample Portfolio",
        description="A sample diversified portfolio",
        risk_tolerance=6,
        investment_objective="growth",
        time_horizon_years=10
    )
    session.add(portfolio)
    session.flush()
    
    # Create sample holdings
    holdings = [
        PortfolioHolding(portfolio_id=portfolio.id, asset_id=assets[0].id, target_allocation=0.25, current_allocation=0.25),
        PortfolioHolding(portfolio_id=portfolio.id, asset_id=assets[1].id, target_allocation=0.25, current_allocation=0.25),
        PortfolioHolding(portfolio_id=portfolio.id, asset_id=assets[2].id, target_allocation=0.20, current_allocation=0.20),
        PortfolioHolding(portfolio_id=portfolio.id, asset_id=assets[3].id, target_allocation=0.20, current_allocation=0.20),
        PortfolioHolding(portfolio_id=portfolio.id, asset_id=assets[4].id, target_allocation=0.10, current_allocation=0.10)
    ]
    
    for holding in holdings:
        session.add(holding)
    
    session.commit()
    
    return user.id, portfolio.id