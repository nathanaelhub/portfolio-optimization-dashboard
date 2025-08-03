"""
Test configuration and fixtures for portfolio optimization system.
Provides reusable test data, database setup, and utility functions.
"""

import pytest
import asyncio
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any
from unittest.mock import Mock, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database.database import get_db, Base
from app.services.optimization import PortfolioOptimizer
from app.services.market_data import MarketDataService
from app.models.portfolio import Portfolio


# Test Database Setup
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client(db_session):
    """Create a test client with database override."""
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# Financial Test Data Generators
class TestDataGenerator:
    """Generates realistic test data for portfolio optimization scenarios."""
    
    @staticmethod
    def generate_returns_data(
        symbols: List[str], 
        periods: int = 252,
        seed: int = 42
    ) -> pd.DataFrame:
        """
        Generate realistic stock returns with correlation structure.
        
        Financial reasoning: Uses factor model to create correlated returns
        that mimic real market behavior with sector correlations.
        """
        np.random.seed(seed)
        
        # Market factor (affects all stocks)
        market_factor = np.random.normal(0.0008, 0.02, periods)  # ~20% annual vol
        
        # Sector factors
        sector_factors = {
            'TECH': np.random.normal(0.0012, 0.025, periods),
            'FINANCE': np.random.normal(0.0006, 0.018, periods),
            'HEALTHCARE': np.random.normal(0.0009, 0.016, periods),
            'ENERGY': np.random.normal(0.0003, 0.035, periods),
            'CONSUMER': np.random.normal(0.0007, 0.015, periods)
        }
        
        # Stock-specific parameters
        stock_params = {
            'AAPL': {'beta': 1.2, 'sector': 'TECH', 'idio_vol': 0.015},
            'MSFT': {'beta': 1.1, 'sector': 'TECH', 'idio_vol': 0.018},
            'JPM': {'beta': 1.3, 'sector': 'FINANCE', 'idio_vol': 0.020},
            'JNJ': {'beta': 0.7, 'sector': 'HEALTHCARE', 'idio_vol': 0.012},
            'XOM': {'beta': 1.4, 'sector': 'ENERGY', 'idio_vol': 0.025},
            'PG': {'beta': 0.6, 'sector': 'CONSUMER', 'idio_vol': 0.010}
        }
        
        returns_data = {}
        for symbol in symbols:
            if symbol in stock_params:
                params = stock_params[symbol]
                # Multi-factor model: r = alpha + beta*market + sector + idiosyncratic
                returns = (
                    0.0005 +  # alpha
                    params['beta'] * market_factor +
                    0.3 * sector_factors[params['sector']] +
                    np.random.normal(0, params['idio_vol'], periods)
                )
            else:
                # Default parameters for unknown stocks
                returns = (0.0005 + 
                          1.0 * market_factor + 
                          np.random.normal(0, 0.020, periods))
            
            returns_data[symbol] = returns
        
        return pd.DataFrame(returns_data)
    
    @staticmethod
    def generate_price_data(
        symbols: List[str], 
        periods: int = 252,
        initial_prices: Dict[str, float] = None
    ) -> pd.DataFrame:
        """Generate realistic price data from returns."""
        if initial_prices is None:
            initial_prices = {symbol: np.random.uniform(50, 300) for symbol in symbols}
        
        returns_df = TestDataGenerator.generate_returns_data(symbols, periods)
        prices_data = {}
        
        for symbol in symbols:
            returns = returns_df[symbol].values
            prices = [initial_prices.get(symbol, 100)]
            
            for ret in returns:
                prices.append(prices[-1] * (1 + ret))
            
            prices_data[symbol] = prices[1:]  # Remove initial price
        
        dates = pd.date_range(start='2023-01-01', periods=periods, freq='D')
        return pd.DataFrame(prices_data, index=dates)
    
    @staticmethod
    def generate_covariance_matrix(symbols: List[str], annual: bool = True) -> np.ndarray:
        """
        Generate realistic covariance matrix with proper structure.
        
        Financial reasoning: Ensures positive definite matrix with
        realistic correlation structure and volatility levels.
        """
        n = len(symbols)
        
        # Generate correlation matrix
        correlations = np.random.uniform(0.1, 0.7, (n, n))
        correlations = (correlations + correlations.T) / 2  # Make symmetric
        np.fill_diagonal(correlations, 1.0)
        
        # Ensure positive definite
        eigenvals, eigenvecs = np.linalg.eigh(correlations)
        eigenvals = np.maximum(eigenvals, 0.01)  # Minimum eigenvalue
        correlations = eigenvecs @ np.diag(eigenvals) @ eigenvecs.T
        
        # Generate realistic volatilities (5% to 40% annual)
        volatilities = np.random.uniform(0.05, 0.40, n)
        if not annual:
            volatilities = volatilities / np.sqrt(252)  # Convert to daily
        
        # Convert correlation to covariance
        vol_matrix = np.outer(volatilities, volatilities)
        covariance = correlations * vol_matrix
        
        return covariance
    
    @staticmethod
    def generate_portfolio_scenarios() -> Dict[str, Dict]:
        """Generate various portfolio test scenarios."""
        return {
            'basic_portfolio': {
                'symbols': ['AAPL', 'MSFT', 'JPM', 'JNJ'],
                'expected_returns': [0.12, 0.10, 0.08, 0.06],
                'allocations': [0.3, 0.3, 0.2, 0.2],
                'description': 'Balanced 4-asset portfolio'
            },
            
            'large_portfolio': {
                'symbols': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'JPM', 'BAC', 
                           'JNJ', 'PFE', 'XOM', 'CVX', 'PG', 'KO'],
                'expected_returns': [0.12, 0.11, 0.13, 0.14, 0.20, 0.08, 0.07,
                                   0.06, 0.05, 0.04, 0.05, 0.04, 0.03],
                'allocations': None,  # To be optimized
                'description': '13-asset diversified portfolio'
            },
            
            'high_correlation': {
                'symbols': ['AAPL', 'MSFT', 'GOOGL'],  # All tech stocks
                'expected_returns': [0.12, 0.11, 0.13],
                'correlation_override': 0.8,  # High correlation
                'description': 'High correlation tech portfolio'
            },
            
            'single_asset': {
                'symbols': ['AAPL'],
                'expected_returns': [0.12],
                'allocations': [1.0],
                'description': 'Single asset edge case'
            },
            
            'zero_return_asset': {
                'symbols': ['AAPL', 'CASH', 'JPM'],
                'expected_returns': [0.12, 0.0, 0.08],
                'allocations': [0.4, 0.2, 0.4],
                'description': 'Portfolio with zero-return asset'
            },
            
            'negative_return_asset': {
                'symbols': ['AAPL', 'BOND', 'REIT'],
                'expected_returns': [0.12, -0.02, 0.04],
                'allocations': [0.6, 0.2, 0.2],
                'description': 'Portfolio with negative expected return asset'
            }
        }


@pytest.fixture
def test_data_generator():
    """Provide test data generator instance."""
    return TestDataGenerator()


@pytest.fixture
def basic_portfolio_data(test_data_generator):
    """Generate basic portfolio test data."""
    scenarios = test_data_generator.generate_portfolio_scenarios()
    return scenarios['basic_portfolio']


@pytest.fixture
def sample_returns_data(test_data_generator):
    """Generate sample returns data for testing."""
    symbols = ['AAPL', 'MSFT', 'JPM', 'JNJ']
    return test_data_generator.generate_returns_data(symbols)


@pytest.fixture
def sample_covariance_matrix(test_data_generator):
    """Generate sample covariance matrix for testing."""
    symbols = ['AAPL', 'MSFT', 'JPM', 'JNJ']
    return test_data_generator.generate_covariance_matrix(symbols)


@pytest.fixture
def mock_market_data_service():
    """Mock market data service for testing."""
    service = Mock(spec=MarketDataService)
    
    # Mock return data
    sample_data = pd.DataFrame({
        'AAPL': [0.01, -0.02, 0.015, 0.008],
        'MSFT': [0.008, -0.015, 0.012, 0.006],
        'JPM': [0.005, -0.018, 0.010, 0.004],
        'JNJ': [0.003, -0.008, 0.005, 0.002]
    })
    
    service.get_returns_data = AsyncMock(return_value=sample_data)
    service.get_price_data = AsyncMock(return_value=sample_data * 100)  # Mock prices
    service.is_market_open = Mock(return_value=True)
    
    return service


@pytest.fixture
def portfolio_optimizer():
    """Create portfolio optimizer instance for testing."""
    return PortfolioOptimizer()


# Utility functions for test assertions
def assert_valid_portfolio_weights(weights: np.ndarray, tolerance: float = 1e-6):
    """Assert that portfolio weights are valid (sum to 1, non-negative)."""
    assert len(weights) > 0, "Weights array cannot be empty"
    assert np.all(weights >= -tolerance), f"Negative weights found: {weights}"
    assert abs(np.sum(weights) - 1.0) < tolerance, f"Weights don't sum to 1: {np.sum(weights)}"


def assert_positive_definite_matrix(matrix: np.ndarray):
    """Assert that matrix is positive definite."""
    eigenvals = np.linalg.eigvals(matrix)
    assert np.all(eigenvals > 0), f"Matrix is not positive definite, eigenvals: {eigenvals}"


def assert_financial_metric_reasonable(
    metric_value: float, 
    expected_range: Tuple[float, float],
    metric_name: str
):
    """Assert that financial metric is within reasonable range."""
    min_val, max_val = expected_range
    assert min_val <= metric_value <= max_val, \
        f"{metric_name} = {metric_value} is outside reasonable range [{min_val}, {max_val}]"


# Performance testing utilities
@pytest.fixture
def performance_timer():
    """Timer utility for performance testing."""
    import time
    
    class Timer:
        def __init__(self):
            self.times = []
        
        def __enter__(self):
            self.start = time.time()
            return self
        
        def __exit__(self, *args):
            self.end = time.time()
            self.elapsed = self.end - self.start
            self.times.append(self.elapsed)
    
    return Timer()


# Marker decorators for test categorization
slow = pytest.mark.slow
financial = pytest.mark.financial
integration = pytest.mark.integration
unit = pytest.mark.unit
performance = pytest.mark.performance
external = pytest.mark.external