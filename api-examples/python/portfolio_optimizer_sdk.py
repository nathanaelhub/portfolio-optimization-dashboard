"""
Portfolio Optimizer Python SDK

Production-ready client library for the Portfolio Optimization API.
Includes async support, comprehensive error handling, and enterprise features.

Installation:
    pip install portfolio-optimizer-sdk

Usage:
    from portfolio_optimizer import PortfolioOptimizer
    
    client = PortfolioOptimizer(api_key="your_api_key")
    result = await client.optimize_portfolio(
        symbols=["AAPL", "MSFT", "GOOGL"],
        method="markowitz"
    )
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, List, Optional, Union, Any
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class OptimizationMethod(Enum):
    """Supported optimization methods."""
    MARKOWITZ = "markowitz"
    BLACK_LITTERMAN = "black_litterman"
    RISK_PARITY = "risk_parity"
    MIN_VOLATILITY = "min_volatility"
    MAX_SHARPE = "max_sharpe"

@dataclass
class OptimizationConstraints:
    """Portfolio optimization constraints."""
    max_weight: Optional[float] = None
    min_weight: Optional[float] = None
    sector_limits: Optional[Dict[str, float]] = None
    liquidity_threshold: Optional[float] = None
    esg_score_min: Optional[float] = None

@dataclass
class OptimizationRequest:
    """Portfolio optimization request parameters."""
    symbols: List[str]
    method: Union[OptimizationMethod, str]
    constraints: Optional[OptimizationConstraints] = None
    risk_tolerance: Optional[float] = None
    time_horizon: Optional[int] = None
    rebalancing_frequency: Optional[str] = None

@dataclass
class OptimizationResult:
    """Portfolio optimization results."""
    weights: Dict[str, float]
    expected_return: float
    volatility: float
    sharpe_ratio: float
    execution_time: float
    method_used: str
    risk_metrics: Optional[Dict[str, Any]] = None
    efficient_frontier: Optional[List[Dict[str, float]]] = None

class PortfolioOptimizerError(Exception):
    """Base exception class for Portfolio Optimizer SDK."""
    pass

class AuthenticationError(PortfolioOptimizerError):
    """Authentication failed."""
    pass

class RateLimitError(PortfolioOptimizerError):
    """Rate limit exceeded."""
    pass

class ValidationError(PortfolioOptimizerError):
    """Request validation failed."""
    pass

class PortfolioOptimizer:
    """
    Portfolio Optimizer API Client
    
    A comprehensive Python client for the Portfolio Optimization API with
    async support, automatic retries, and enterprise features.
    """
    
    def __init__(
        self,
        api_key: str,
        base_url: str = "https://api.portfolio-optimizer.com/v1",
        timeout: int = 30,
        max_retries: int = 3,
        retry_delay: float = 1.0
    ):
        """
        Initialize the Portfolio Optimizer client.
        
        Args:
            api_key: Your API key
            base_url: API base URL
            timeout: Request timeout in seconds
            max_retries: Maximum number of retries for failed requests
            retry_delay: Delay between retries in seconds
        """
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.max_retries = max_retries
        self.retry_delay = retry_delay
        self._session: Optional[aiohttp.ClientSession] = None
    
    async def __aenter__(self):
        """Async context manager entry."""
        await self._create_session()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self._close_session()
    
    async def _create_session(self):
        """Create aiohttp session with proper headers."""
        if self._session is None:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json',
                'User-Agent': 'PortfolioOptimizer-Python-SDK/1.0.0'
            }
            timeout = aiohttp.ClientTimeout(total=self.timeout)
            self._session = aiohttp.ClientSession(
                headers=headers,
                timeout=timeout
            )
    
    async def _close_session(self):
        """Close aiohttp session."""
        if self._session:
            await self._session.close()
            self._session = None
    
    async def _make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[Dict] = None,
        params: Optional[Dict] = None
    ) -> Dict:
        """
        Make HTTP request with retry logic and error handling.
        
        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            data: Request body data
            params: Query parameters
            
        Returns:
            Response data as dictionary
            
        Raises:
            PortfolioOptimizerError: For various API errors
        """
        if not self._session:
            await self._create_session()
        
        url = f"{self.base_url}/{endpoint.lstrip('/')}"
        
        for attempt in range(self.max_retries + 1):
            try:
                async with self._session.request(
                    method,
                    url,
                    json=data,
                    params=params
                ) as response:
                    
                    # Handle different response codes
                    if response.status == 200:
                        return await response.json()
                    elif response.status == 401:
                        raise AuthenticationError("Invalid API key")
                    elif response.status == 429:
                        if attempt < self.max_retries:
                            retry_after = int(response.headers.get('Retry-After', self.retry_delay))
                            await asyncio.sleep(retry_after)
                            continue
                        raise RateLimitError("Rate limit exceeded")
                    elif response.status == 400:
                        error_data = await response.json()
                        raise ValidationError(error_data.get('message', 'Validation error'))
                    else:
                        response.raise_for_status()
                        
            except aiohttp.ClientError as e:
                if attempt < self.max_retries:
                    await asyncio.sleep(self.retry_delay * (2 ** attempt))
                    continue
                raise PortfolioOptimizerError(f"Request failed: {str(e)}")
        
        raise PortfolioOptimizerError("Max retries exceeded")
    
    async def optimize_portfolio(
        self,
        symbols: List[str],
        method: Union[OptimizationMethod, str] = OptimizationMethod.MARKOWITZ,
        constraints: Optional[OptimizationConstraints] = None,
        **kwargs
    ) -> OptimizationResult:
        """
        Optimize a portfolio using the specified method and constraints.
        
        Args:
            symbols: List of asset symbols (e.g., ["AAPL", "MSFT", "GOOGL"])
            method: Optimization method to use
            constraints: Portfolio constraints
            **kwargs: Additional optimization parameters
            
        Returns:
            OptimizationResult with weights and performance metrics
            
        Example:
            result = await client.optimize_portfolio(
                symbols=["AAPL", "MSFT", "GOOGL", "BND"],
                method="markowitz",
                constraints=OptimizationConstraints(max_weight=0.4)
            )
            print(f"Expected return: {result.expected_return:.2%}")
            print(f"Sharpe ratio: {result.sharpe_ratio:.2f}")
        """
        if isinstance(method, OptimizationMethod):
            method = method.value
        
        request_data = {
            'symbols': symbols,
            'method': method,
            **kwargs
        }
        
        if constraints:
            request_data['constraints'] = asdict(constraints)
        
        start_time = time.time()
        response = await self._make_request('POST', '/optimize', data=request_data)
        execution_time = time.time() - start_time
        
        return OptimizationResult(
            weights=response['weights'],
            expected_return=response['expected_return'],
            volatility=response['volatility'],
            sharpe_ratio=response['sharpe_ratio'],
            execution_time=execution_time,
            method_used=response['method_used'],
            risk_metrics=response.get('risk_metrics'),
            efficient_frontier=response.get('efficient_frontier')
        )
    
    async def get_efficient_frontier(
        self,
        symbols: List[str],
        num_points: int = 100,
        method: Union[OptimizationMethod, str] = OptimizationMethod.MARKOWITZ
    ) -> List[Dict[str, float]]:
        """
        Generate efficient frontier for given assets.
        
        Args:
            symbols: List of asset symbols
            num_points: Number of points on the frontier
            method: Optimization method
            
        Returns:
            List of risk-return points
        """
        if isinstance(method, OptimizationMethod):
            method = method.value
        
        data = {
            'symbols': symbols,
            'num_points': num_points,
            'method': method
        }
        
        response = await self._make_request('POST', '/efficient-frontier', data=data)
        return response['frontier_points']
    
    async def calculate_risk_metrics(
        self,
        weights: Dict[str, float],
        symbols: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Calculate comprehensive risk metrics for a portfolio.
        
        Args:
            weights: Portfolio weights
            symbols: Asset symbols (optional if included in weights keys)
            
        Returns:
            Dictionary of risk metrics
        """
        data = {'weights': weights}
        if symbols:
            data['symbols'] = symbols
        
        response = await self._make_request('POST', '/risk-metrics', data=data)
        return response['risk_metrics']
    
    async def backtest_portfolio(
        self,
        weights: Dict[str, float],
        start_date: str,
        end_date: str,
        rebalancing_frequency: str = 'monthly'
    ) -> Dict[str, Any]:
        """
        Backtest a portfolio over a specified period.
        
        Args:
            weights: Portfolio weights
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            rebalancing_frequency: Rebalancing frequency
            
        Returns:
            Backtesting results with performance metrics
        """
        data = {
            'weights': weights,
            'start_date': start_date,
            'end_date': end_date,
            'rebalancing_frequency': rebalancing_frequency
        }
        
        response = await self._make_request('POST', '/backtest', data=data)
        return response['backtest_results']
    
    async def get_market_data(
        self,
        symbols: List[str],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Retrieve market data for specified symbols.
        
        Args:
            symbols: List of asset symbols
            start_date: Start date (optional)
            end_date: End date (optional)
            
        Returns:
            Market data for symbols
        """
        params = {'symbols': ','.join(symbols)}
        if start_date:
            params['start_date'] = start_date
        if end_date:
            params['end_date'] = end_date
        
        response = await self._make_request('GET', '/market-data', params=params)
        return response['market_data']
    
    async def get_ml_predictions(
        self,
        symbols: List[str],
        prediction_horizon: int = 30
    ) -> Dict[str, Any]:
        """
        Get machine learning predictions for assets.
        
        Args:
            symbols: List of asset symbols
            prediction_horizon: Prediction horizon in days
            
        Returns:
            ML predictions with confidence intervals
        """
        data = {
            'symbols': symbols,
            'prediction_horizon': prediction_horizon
        }
        
        response = await self._make_request('POST', '/ml-predictions', data=data)
        return response['predictions']

# Convenience functions for common use cases
async def quick_optimize(
    symbols: List[str], 
    api_key: str,
    method: str = "markowitz"
) -> OptimizationResult:
    """
    Quick portfolio optimization with minimal setup.
    
    Args:
        symbols: Asset symbols to optimize
        api_key: Your API key
        method: Optimization method
        
    Returns:
        Optimization results
    """
    async with PortfolioOptimizer(api_key) as client:
        return await client.optimize_portfolio(symbols, method)

# Example usage
async def main():
    """Example usage of the Portfolio Optimizer SDK."""
    
    # Initialize client
    async with PortfolioOptimizer("your_api_key_here") as client:
        
        # Define portfolio
        symbols = ["AAPL", "MSFT", "GOOGL", "BND", "VTI"]
        
        # Set constraints
        constraints = OptimizationConstraints(
            max_weight=0.4,
            min_weight=0.05,
            sector_limits={"technology": 0.6}
        )
        
        try:
            # Optimize portfolio
            result = await client.optimize_portfolio(
                symbols=symbols,
                method=OptimizationMethod.MARKOWITZ,
                constraints=constraints
            )
            
            print("Optimization Results:")
            print(f"Expected Return: {result.expected_return:.2%}")
            print(f"Volatility: {result.volatility:.2%}")
            print(f"Sharpe Ratio: {result.sharpe_ratio:.2f}")
            print(f"Execution Time: {result.execution_time:.2f}s")
            
            print("\nOptimal Weights:")
            for symbol, weight in result.weights.items():
                print(f"  {symbol}: {weight:.2%}")
            
            # Get efficient frontier
            frontier = await client.get_efficient_frontier(symbols)
            print(f"\nEfficient Frontier: {len(frontier)} points generated")
            
            # Calculate additional risk metrics
            risk_metrics = await client.calculate_risk_metrics(result.weights)
            print(f"\nValue at Risk (95%): {risk_metrics.get('var_95', 0):.2%}")
            
        except PortfolioOptimizerError as e:
            logger.error(f"Optimization failed: {e}")

if __name__ == "__main__":
    # Run example
    asyncio.run(main())