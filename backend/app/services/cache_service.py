"""
High-Level Cache Service

This module provides business-logic aware caching for portfolio optimization
operations, market data, and user sessions with intelligent invalidation.
"""

import asyncio
import hashlib
import json
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union, Callable

import pandas as pd
import numpy as np
from pydantic import BaseModel

from app.database.cache import (
    cache_manager, 
    market_data_cache, 
    optimization_cache,
    session_cache,
    CacheKey
)
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheService:
    """
    High-level cache service providing business logic integration.
    
    Handles caching of complex business objects, automatic invalidation,
    and cache warming strategies.
    """
    
    def __init__(self):
        self.cache = cache_manager
        self.market_cache = market_data_cache
        self.optimization_cache = optimization_cache
        self.session_cache = session_cache
        
        # Cache warming configuration
        self.warm_cache_on_startup = True
        self.cache_warming_tasks = []
    
    # Portfolio-related caching
    async def get_portfolio_metrics(
        self, 
        portfolio_id: int,
        recalculate: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached portfolio metrics or calculate if not available.
        
        Args:
            portfolio_id: Portfolio identifier
            recalculate: Force recalculation even if cached
            
        Returns:
            Portfolio metrics dictionary
        """
        cache_key = CacheKey.portfolio_metrics(portfolio_id)
        
        if not recalculate:
            cached_metrics = self.cache.get(cache_key)
            if cached_metrics:
                logger.debug(f"Cache hit for portfolio metrics: {portfolio_id}")
                return cached_metrics
        
        # Calculate metrics (this would typically call your calculation service)
        logger.info(f"Calculating portfolio metrics for portfolio {portfolio_id}")
        
        # Placeholder for actual calculation - would integrate with your portfolio service
        metrics = await self._calculate_portfolio_metrics(portfolio_id)
        
        if metrics:
            # Cache for 5 minutes
            self.cache.set(cache_key, metrics, ttl=300)
            logger.debug(f"Cached portfolio metrics for portfolio {portfolio_id}")
        
        return metrics
    
    async def invalidate_portfolio_cache(self, portfolio_id: int):
        """Invalidate all cached data for a specific portfolio."""
        patterns = [
            f"{CacheKey.PORTFOLIO_DATA}:*:{portfolio_id}:*",
            f"{CacheKey.OPTIMIZATION_RESULT}:portfolio:{portfolio_id}:*",
            f"{CacheKey.RISK_METRICS}:portfolio:{portfolio_id}:*"
        ]
        
        total_deleted = 0
        for pattern in patterns:
            deleted = self.cache.delete_pattern(pattern)
            total_deleted += deleted
        
        logger.info(f"Invalidated {total_deleted} cache entries for portfolio {portfolio_id}")
        return total_deleted
    
    # Market data caching with intelligent updates
    async def get_market_data(
        self, 
        symbol: str, 
        period: str = "1y",
        force_refresh: bool = False
    ) -> Optional[pd.DataFrame]:
        """
        Get market data with intelligent caching.
        
        Args:
            symbol: Stock symbol
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            force_refresh: Force refresh from data source
            
        Returns:
            DataFrame with market data
        """
        if not force_refresh:
            cached_data = self.market_cache.get_stock_data(symbol, period)
            if cached_data is not None:
                # Check if data is recent enough
                if self._is_market_data_fresh(cached_data):
                    return cached_data
        
        # Fetch fresh data (placeholder - would integrate with your data service)
        logger.info(f"Fetching fresh market data for {symbol} ({period})")
        fresh_data = await self._fetch_market_data(symbol, period)
        
        if fresh_data is not None:
            self.market_cache.cache_stock_data(symbol, fresh_data, period)
        
        return fresh_data
    
    def _is_market_data_fresh(self, data: pd.DataFrame) -> bool:
        """Check if market data is fresh enough for use."""
        if data.empty:
            return False
        
        # Get the latest date in the data
        latest_date = data.index.max() if hasattr(data.index, 'max') else data['date'].max()
        now = datetime.now()
        
        # If it's weekend, data from Friday is acceptable
        if now.weekday() >= 5:  # Saturday or Sunday
            # Data should be from Friday or later
            acceptable_date = now - timedelta(days=now.weekday() - 4)
        else:
            # On weekdays, data should be from yesterday or today
            acceptable_date = now - timedelta(days=1)
        
        return pd.to_datetime(latest_date).date() >= acceptable_date.date()
    
    async def get_batch_market_data(
        self, 
        symbols: List[str], 
        period: str = "1y"
    ) -> Dict[str, pd.DataFrame]:
        """
        Get market data for multiple symbols efficiently.
        
        Uses parallel fetching and caching for optimal performance.
        """
        results = {}
        cache_misses = []
        
        # Check cache for each symbol
        for symbol in symbols:
            cached_data = self.market_cache.get_stock_data(symbol, period)
            if cached_data is not None and self._is_market_data_fresh(cached_data):
                results[symbol] = cached_data
            else:
                cache_misses.append(symbol)
        
        # Fetch missing data in parallel
        if cache_misses:
            logger.info(f"Fetching data for {len(cache_misses)} symbols: {cache_misses}")
            
            # Create tasks for parallel execution
            tasks = [
                self.get_market_data(symbol, period, force_refresh=True)
                for symbol in cache_misses
            ]
            
            # Execute in parallel
            fresh_data_list = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Process results
            for symbol, data in zip(cache_misses, fresh_data_list):
                if isinstance(data, Exception):
                    logger.error(f"Error fetching data for {symbol}: {data}")
                    continue
                
                if data is not None:
                    results[symbol] = data
        
        return results
    
    # Optimization result caching
    async def get_optimization_result(
        self, 
        portfolio_id: int, 
        method: str, 
        parameters: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached optimization result."""
        return self.optimization_cache.get_optimization_result(
            portfolio_id, method, parameters
        )
    
    async def cache_optimization_result(
        self, 
        portfolio_id: int, 
        method: str, 
        parameters: Dict[str, Any], 
        result: Dict[str, Any]
    ) -> bool:
        """Cache optimization result with metadata."""
        # Add additional metadata
        enhanced_result = {
            **result,
            "portfolio_id": portfolio_id,
            "method": method,
            "parameters": parameters,
            "cached_at": datetime.utcnow().isoformat()
        }
        
        return self.optimization_cache.cache_optimization_result(
            portfolio_id, method, parameters, enhanced_result
        )
    
    # Correlation matrix caching
    async def get_correlation_matrix(
        self, 
        symbols: List[str], 
        period: str = "1y"
    ) -> Optional[np.ndarray]:
        """Get cached correlation matrix or calculate if needed."""
        cache_key = CacheKey.correlation_matrix(symbols, period)
        
        cached_matrix = self.cache.get(cache_key)
        if cached_matrix is not None:
            return cached_matrix
        
        # Calculate correlation matrix
        logger.info(f"Calculating correlation matrix for {len(symbols)} symbols")
        
        # Get market data for all symbols
        market_data = await self.get_batch_market_data(symbols, period)
        
        if len(market_data) < len(symbols):
            logger.warning(f"Only got data for {len(market_data)}/{len(symbols)} symbols")
            return None
        
        # Calculate correlation matrix
        correlation_matrix = self._calculate_correlation_matrix(market_data)
        
        if correlation_matrix is not None:
            # Cache for 30 minutes
            self.cache.set(cache_key, correlation_matrix, ttl=1800)
        
        return correlation_matrix
    
    def _calculate_correlation_matrix(
        self, 
        market_data: Dict[str, pd.DataFrame]
    ) -> Optional[np.ndarray]:
        """Calculate correlation matrix from market data."""
        try:
            # Extract returns for each symbol
            returns_data = {}
            
            for symbol, data in market_data.items():
                if 'close' in data.columns:
                    returns = data['close'].pct_change().dropna()
                elif 'Close' in data.columns:
                    returns = data['Close'].pct_change().dropna()
                else:
                    logger.warning(f"No close price column found for {symbol}")
                    continue
                
                returns_data[symbol] = returns
            
            if not returns_data:
                return None
            
            # Create DataFrame with all returns
            returns_df = pd.DataFrame(returns_data)
            
            # Calculate correlation matrix
            correlation_matrix = returns_df.corr().values
            
            return correlation_matrix
            
        except Exception as e:
            logger.error(f"Error calculating correlation matrix: {e}")
            return None
    
    # Risk metrics caching
    async def get_risk_metrics(
        self, 
        portfolio_id: int, 
        period: str = "1y"
    ) -> Optional[Dict[str, Any]]:
        """Get cached risk metrics."""
        cache_key = CacheKey.risk_metrics(portfolio_id, period)
        
        cached_metrics = self.cache.get(cache_key)
        if cached_metrics:
            return cached_metrics
        
        # Calculate risk metrics
        logger.info(f"Calculating risk metrics for portfolio {portfolio_id}")
        risk_metrics = await self._calculate_risk_metrics(portfolio_id, period)
        
        if risk_metrics:
            # Cache for 10 minutes
            self.cache.set(cache_key, risk_metrics, ttl=600)
        
        return risk_metrics
    
    # Cache warming strategies
    async def warm_cache(self, warm_items: Optional[List[str]] = None):
        """
        Warm cache with frequently accessed data.
        
        Args:
            warm_items: Specific items to warm, or None for default strategy
        """
        if not self.warm_cache_on_startup:
            return
        
        warm_items = warm_items or [
            "popular_portfolios",
            "market_indices", 
            "top_stocks",
            "recent_optimizations"
        ]
        
        logger.info(f"Starting cache warming for: {warm_items}")
        
        warming_tasks = []
        
        if "popular_portfolios" in warm_items:
            warming_tasks.append(self._warm_popular_portfolios())
        
        if "market_indices" in warm_items:
            warming_tasks.append(self._warm_market_indices())
        
        if "top_stocks" in warm_items:
            warming_tasks.append(self._warm_top_stocks())
        
        if "recent_optimizations" in warm_items:
            warming_tasks.append(self._warm_recent_optimizations())
        
        # Execute warming tasks in parallel
        try:
            await asyncio.gather(*warming_tasks, return_exceptions=True)
            logger.info("Cache warming completed")
        except Exception as e:
            logger.error(f"Error during cache warming: {e}")
    
    async def _warm_popular_portfolios(self):
        """Warm cache with popular portfolio data."""
        # This would integrate with your portfolio service to get popular portfolios
        popular_portfolio_ids = await self._get_popular_portfolio_ids()
        
        tasks = [
            self.get_portfolio_metrics(portfolio_id)
            for portfolio_id in popular_portfolio_ids
        ]
        
        await asyncio.gather(*tasks, return_exceptions=True)
        logger.debug(f"Warmed cache for {len(popular_portfolio_ids)} popular portfolios")
    
    async def _warm_market_indices(self):
        """Warm cache with major market indices."""
        indices = ["^GSPC", "^DJI", "^IXIC", "^RUT"]  # S&P 500, Dow, NASDAQ, Russell 2000
        
        await self.get_batch_market_data(indices, "1y")
        logger.debug(f"Warmed cache for {len(indices)} market indices")
    
    async def _warm_top_stocks(self):
        """Warm cache with top stock data."""
        # Top tech stocks as example
        top_stocks = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META", "NVDA", "NFLX"]
        
        await self.get_batch_market_data(top_stocks, "1y")
        logger.debug(f"Warmed cache for {len(top_stocks)} top stocks")
    
    async def _warm_recent_optimizations(self):
        """Warm cache with recent optimization results."""
        # This would get recent optimizations from database
        recent_optimizations = await self._get_recent_optimizations()
        
        for opt in recent_optimizations:
            await self.get_optimization_result(
                opt["portfolio_id"], 
                opt["method"], 
                opt["parameters"]
            )
        
        logger.debug(f"Warmed cache for {len(recent_optimizations)} recent optimizations")
    
    # Cache analytics and monitoring
    async def get_cache_analytics(self) -> Dict[str, Any]:
        """Get comprehensive cache analytics."""
        cache_info = self.cache.get_cache_info()
        
        # Add custom analytics
        analytics = {
            "redis_info": cache_info,
            "cache_categories": await self._analyze_cache_categories(),
            "performance_metrics": await self._get_cache_performance_metrics(),
            "recommendations": await self._generate_cache_recommendations()
        }
        
        return analytics
    
    async def _analyze_cache_categories(self) -> Dict[str, int]:
        """Analyze cache usage by category."""
        # This would require scanning Redis keys (expensive operation)
        # In production, you might want to maintain counters
        categories = {
            "market_data": 0,
            "portfolios": 0,
            "optimizations": 0,
            "risk_metrics": 0,
            "sessions": 0,
            "other": 0
        }
        
        return categories
    
    async def _get_cache_performance_metrics(self) -> Dict[str, Any]:
        """Get cache performance metrics."""
        return {
            "hit_rate_percentage": 85.5,  # Placeholder - would calculate from Redis stats
            "avg_response_time_ms": 2.3,
            "memory_efficiency": 92.1,
            "eviction_rate": 0.05
        }
    
    async def _generate_cache_recommendations(self) -> List[str]:
        """Generate cache optimization recommendations."""
        recommendations = []
        
        cache_info = self.cache.get_cache_info()
        
        # Check hit rate
        hit_rate = cache_info.get("hit_rate", 0)
        if hit_rate < 80:
            recommendations.append(
                f"Cache hit rate is {hit_rate}%. Consider increasing TTL values or cache size."
            )
        
        # Check memory usage
        # This would require more detailed Redis analysis
        recommendations.append("Cache performance is optimal")
        
        return recommendations
    
    # Placeholder methods for integration points
    async def _calculate_portfolio_metrics(self, portfolio_id: int) -> Optional[Dict[str, Any]]:
        """Placeholder for portfolio metrics calculation."""
        # This would integrate with your portfolio calculation service
        return {
            "portfolio_id": portfolio_id,
            "total_value": 100000,
            "daily_return": 0.001,
            "sharpe_ratio": 1.2,
            "volatility": 0.15,
            "calculated_at": datetime.utcnow().isoformat()
        }
    
    async def _fetch_market_data(self, symbol: str, period: str) -> Optional[pd.DataFrame]:
        """Placeholder for market data fetching."""
        # This would integrate with your market data service (Yahoo Finance, Alpha Vantage, etc.)
        import yfinance as yf
        
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period)
            return data
        except Exception as e:
            logger.error(f"Error fetching market data for {symbol}: {e}")
            return None
    
    async def _calculate_risk_metrics(self, portfolio_id: int, period: str) -> Optional[Dict[str, Any]]:
        """Placeholder for risk metrics calculation."""
        return {
            "portfolio_id": portfolio_id,
            "var_95": -0.032,
            "cvar_95": -0.048,
            "max_drawdown": -0.156,
            "beta": 1.05,
            "calculated_at": datetime.utcnow().isoformat()
        }
    
    async def _get_popular_portfolio_ids(self) -> List[int]:
        """Placeholder for getting popular portfolio IDs."""
        return [1, 2, 3, 4, 5]  # Mock data
    
    async def _get_recent_optimizations(self) -> List[Dict[str, Any]]:
        """Placeholder for getting recent optimizations."""
        return [
            {"portfolio_id": 1, "method": "markowitz", "parameters": {"risk_free_rate": 0.02}},
            {"portfolio_id": 2, "method": "risk_parity", "parameters": {}},
        ]


# Global cache service instance
cache_service = CacheService()


# Decorator for automatic caching of function results
def cached_result(
    ttl: int = 300,
    cache_key_func: Optional[Callable] = None,
    invalidate_on: Optional[List[str]] = None
):
    """
    Decorator for automatic caching of function results.
    
    Args:
        ttl: Time to live in seconds
        cache_key_func: Function to generate cache key from arguments
        invalidate_on: List of events that should invalidate this cache
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Generate cache key
            if cache_key_func:
                cache_key = cache_key_func(*args, **kwargs)
            else:
                # Default key generation
                args_str = "_".join(str(arg) for arg in args)
                kwargs_str = "_".join(f"{k}:{v}" for k, v in sorted(kwargs.items()))
                key_content = f"{func.__name__}:{args_str}:{kwargs_str}"
                cache_key = hashlib.md5(key_content.encode()).hexdigest()
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for function {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = await func(*args, **kwargs) if asyncio.iscoroutinefunction(func) else func(*args, **kwargs)
            cache_manager.set(cache_key, result, ttl)
            
            logger.debug(f"Cached result for function {func.__name__}")
            return result
        
        return wrapper
    return decorator