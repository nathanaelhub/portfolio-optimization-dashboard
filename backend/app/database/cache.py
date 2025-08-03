"""
Redis Cache Implementation for Portfolio Optimization Dashboard

This module provides a comprehensive caching layer using Redis to improve
performance for frequently accessed data including market data, optimization
results, and user sessions.
"""

import json
import pickle
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Union

import redis
import pandas as pd
import numpy as np
from pydantic import BaseModel

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


class CacheKey:
    """Standardized cache key generation for consistent naming."""
    
    # Prefixes for different data types
    USER_SESSION = "session"
    MARKET_DATA = "market"
    OPTIMIZATION_RESULT = "optimization"
    PORTFOLIO_DATA = "portfolio"
    RISK_METRICS = "risk"
    FINANCIAL_DATA = "financial"
    API_RESPONSE = "api"
    
    @staticmethod
    def user_session(user_id: int) -> str:
        return f"{CacheKey.USER_SESSION}:user:{user_id}"
    
    @staticmethod
    def market_data(symbol: str, period: str = "1y") -> str:
        return f"{CacheKey.MARKET_DATA}:symbol:{symbol}:period:{period}"
    
    @staticmethod
    def optimization_result(portfolio_id: int, method: str, params_hash: str) -> str:
        return f"{CacheKey.OPTIMIZATION_RESULT}:portfolio:{portfolio_id}:method:{method}:hash:{params_hash}"
    
    @staticmethod
    def portfolio_metrics(portfolio_id: int) -> str:
        return f"{CacheKey.PORTFOLIO_DATA}:metrics:{portfolio_id}"
    
    @staticmethod
    def risk_metrics(portfolio_id: int, period: str) -> str:
        return f"{CacheKey.RISK_METRICS}:portfolio:{portfolio_id}:period:{period}"
    
    @staticmethod
    def correlation_matrix(symbols: List[str], period: str) -> str:
        symbol_key = "_".join(sorted(symbols))
        return f"{CacheKey.FINANCIAL_DATA}:correlation:{symbol_key}:period:{period}"
    
    @staticmethod
    def api_endpoint(endpoint: str, params_hash: str) -> str:
        return f"{CacheKey.API_RESPONSE}:endpoint:{endpoint}:hash:{params_hash}"


class CacheManager:
    """
    Comprehensive cache management system using Redis.
    
    Provides high-level caching operations with automatic serialization,
    compression, and TTL management for different data types.
    """
    
    def __init__(self):
        """Initialize Redis connection with configuration."""
        self.redis_client = redis.Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=False,  # We handle encoding ourselves
            socket_connect_timeout=5,
            socket_timeout=5,
            retry_on_timeout=True,
            health_check_interval=30
        )
        
        # Test connection
        try:
            self.redis_client.ping()
            logger.info("Successfully connected to Redis cache")
        except redis.ConnectionError as e:
            logger.error(f"Failed to connect to Redis: {e}")
            raise
        
        # Default TTL values (in seconds)
        self.ttl_config = {
            CacheKey.USER_SESSION: 3600,  # 1 hour
            CacheKey.MARKET_DATA: 900,    # 15 minutes
            CacheKey.OPTIMIZATION_RESULT: 1800,  # 30 minutes
            CacheKey.PORTFOLIO_DATA: 300,  # 5 minutes
            CacheKey.RISK_METRICS: 600,   # 10 minutes
            CacheKey.FINANCIAL_DATA: 1800,  # 30 minutes
            CacheKey.API_RESPONSE: 300,   # 5 minutes
        }
    
    def _get_ttl(self, key: str) -> int:
        """Get appropriate TTL based on key prefix."""
        for prefix, ttl in self.ttl_config.items():
            if key.startswith(prefix):
                return ttl
        return 300  # Default 5 minutes
    
    def _serialize_data(self, data: Any) -> bytes:
        """
        Serialize data for Redis storage with type preservation.
        
        Handles pandas DataFrames, numpy arrays, and standard Python objects.
        """
        if isinstance(data, pd.DataFrame):
            # Use pickle for DataFrames to preserve index and dtypes
            return pickle.dumps({
                'type': 'dataframe',
                'data': data.to_dict('tight')
            })
        elif isinstance(data, np.ndarray):
            # Use pickle for numpy arrays
            return pickle.dumps({
                'type': 'ndarray',
                'data': data.tolist(),
                'dtype': str(data.dtype),
                'shape': data.shape
            })
        elif isinstance(data, BaseModel):
            # Pydantic models to JSON
            return json.dumps({
                'type': 'pydantic',
                'data': data.dict(),
                'class': data.__class__.__name__
            }).encode('utf-8')
        else:
            # Standard Python objects
            return pickle.dumps({
                'type': 'standard',
                'data': data
            })
    
    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize data from Redis storage."""
        try:
            # Try JSON first (faster)
            parsed = json.loads(data.decode('utf-8'))
            if parsed.get('type') == 'pydantic':
                return parsed['data']  # Return dict for pydantic
        except (json.JSONDecodeError, UnicodeDecodeError):
            # Fall back to pickle
            parsed = pickle.loads(data)
        
        data_type = parsed.get('type')
        data_content = parsed.get('data')
        
        if data_type == 'dataframe':
            return pd.DataFrame.from_dict(data_content, orient='tight')
        elif data_type == 'ndarray':
            arr = np.array(data_content, dtype=parsed['dtype'])
            return arr.reshape(parsed['shape'])
        elif data_type == 'pydantic':
            return data_content  # Return as dict
        else:
            return data_content
    
    def get(self, key: str) -> Optional[Any]:
        """
        Retrieve data from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached data or None if not found/expired
        """
        try:
            data = self.redis_client.get(key)
            if data is None:
                return None
            
            result = self._deserialize_data(data)
            logger.debug(f"Cache hit for key: {key}")
            return result
            
        except Exception as e:
            logger.error(f"Error retrieving from cache {key}: {e}")
            return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Store data in cache with TTL.
        
        Args:
            key: Cache key
            value: Data to cache
            ttl: Time to live in seconds (uses default if None)
            
        Returns:
            True if successful, False otherwise
        """
        try:
            serialized_data = self._serialize_data(value)
            ttl = ttl or self._get_ttl(key)
            
            success = self.redis_client.setex(key, ttl, serialized_data)
            if success:
                logger.debug(f"Cached data for key: {key} (TTL: {ttl}s)")
            return success
            
        except Exception as e:
            logger.error(f"Error caching data {key}: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete data from cache."""
        try:
            result = self.redis_client.delete(key)
            if result:
                logger.debug(f"Deleted cache key: {key}")
            return bool(result)
        except Exception as e:
            logger.error(f"Error deleting cache key {key}: {e}")
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching a pattern.
        
        Args:
            pattern: Redis pattern (e.g., "market:*", "user:123:*")
            
        Returns:
            Number of keys deleted
        """
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                deleted = self.redis_client.delete(*keys)
                logger.info(f"Deleted {deleted} keys matching pattern: {pattern}")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Error deleting keys with pattern {pattern}: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache."""
        try:
            return bool(self.redis_client.exists(key))
        except Exception as e:
            logger.error(f"Error checking key existence {key}: {e}")
            return False
    
    def get_ttl(self, key: str) -> int:
        """Get remaining TTL for a key (-1 if no expiry, -2 if not exists)."""
        try:
            return self.redis_client.ttl(key)
        except Exception as e:
            logger.error(f"Error getting TTL for key {key}: {e}")
            return -2
    
    def extend_ttl(self, key: str, additional_seconds: int) -> bool:
        """Extend TTL of existing key."""
        try:
            current_ttl = self.get_ttl(key)
            if current_ttl > 0:
                new_ttl = current_ttl + additional_seconds
                return bool(self.redis_client.expire(key, new_ttl))
            return False
        except Exception as e:
            logger.error(f"Error extending TTL for key {key}: {e}")
            return False
    
    def get_cache_info(self) -> Dict[str, Any]:
        """Get Redis cache statistics and info."""
        try:
            info = self.redis_client.info()
            return {
                'used_memory': info.get('used_memory_human', 'Unknown'),
                'used_memory_peak': info.get('used_memory_peak_human', 'Unknown'),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'hit_rate': self._calculate_hit_rate(info),
            }
        except Exception as e:
            logger.error(f"Error getting cache info: {e}")
            return {}
    
    def _calculate_hit_rate(self, info: Dict) -> float:
        """Calculate cache hit rate percentage."""
        hits = info.get('keyspace_hits', 0)
        misses = info.get('keyspace_misses', 0)
        total = hits + misses
        return round((hits / total * 100) if total > 0 else 0, 2)
    
    def flush_cache(self, pattern: Optional[str] = None) -> bool:
        """
        Flush cache data.
        
        Args:
            pattern: If provided, only delete keys matching pattern.
                    If None, flush entire database.
        """
        try:
            if pattern:
                deleted = self.delete_pattern(pattern)
                logger.info(f"Flushed {deleted} keys matching pattern: {pattern}")
                return True
            else:
                self.redis_client.flushdb()
                logger.info("Flushed entire cache database")
                return True
        except Exception as e:
            logger.error(f"Error flushing cache: {e}")
            return False


class MarketDataCache:
    """Specialized cache for market data with intelligent invalidation."""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
    
    def get_stock_data(self, symbol: str, period: str = "1y") -> Optional[pd.DataFrame]:
        """Get cached stock price data."""
        key = CacheKey.market_data(symbol, period)
        return self.cache.get(key)
    
    def cache_stock_data(self, symbol: str, data: pd.DataFrame, period: str = "1y") -> bool:
        """Cache stock price data with market hours aware TTL."""
        key = CacheKey.market_data(symbol, period)
        
        # Shorter TTL during market hours, longer during off-hours
        now = datetime.now()
        is_market_hours = (
            now.weekday() < 5 and  # Monday-Friday
            9 <= now.hour < 16     # 9 AM - 4 PM EST (simplified)
        )
        
        ttl = 300 if is_market_hours else 900  # 5 min vs 15 min
        return self.cache.set(key, data, ttl)
    
    def invalidate_symbol(self, symbol: str) -> int:
        """Invalidate all cached data for a symbol."""
        pattern = f"{CacheKey.MARKET_DATA}:symbol:{symbol}:*"
        return self.cache.delete_pattern(pattern)


class OptimizationCache:
    """Specialized cache for optimization results."""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
    
    def get_optimization_result(
        self, 
        portfolio_id: int, 
        method: str, 
        params: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Get cached optimization result."""
        params_hash = self._hash_params(params)
        key = CacheKey.optimization_result(portfolio_id, method, params_hash)
        return self.cache.get(key)
    
    def cache_optimization_result(
        self, 
        portfolio_id: int, 
        method: str, 
        params: Dict[str, Any], 
        result: Dict[str, Any]
    ) -> bool:
        """Cache optimization result."""
        params_hash = self._hash_params(params)
        key = CacheKey.optimization_result(portfolio_id, method, params_hash)
        
        # Add timestamp to result
        result_with_timestamp = {
            **result,
            'cached_at': datetime.utcnow().isoformat(),
            'cache_key': key
        }
        
        return self.cache.set(key, result_with_timestamp, ttl=1800)  # 30 minutes
    
    def invalidate_portfolio_optimizations(self, portfolio_id: int) -> int:
        """Invalidate all optimization results for a portfolio."""
        pattern = f"{CacheKey.OPTIMIZATION_RESULT}:portfolio:{portfolio_id}:*"
        return self.cache.delete_pattern(pattern)
    
    def _hash_params(self, params: Dict[str, Any]) -> str:
        """Create deterministic hash of optimization parameters."""
        import hashlib
        
        # Sort parameters to ensure consistent hashing
        sorted_params = json.dumps(params, sort_keys=True)
        return hashlib.md5(sorted_params.encode()).hexdigest()[:16]


class SessionCache:
    """User session management with Redis."""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
    
    def get_user_session(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user session data."""
        key = CacheKey.user_session(user_id)
        return self.cache.get(key)
    
    def create_user_session(
        self, 
        user_id: int, 
        session_data: Dict[str, Any], 
        ttl: int = 3600
    ) -> bool:
        """Create or update user session."""
        key = CacheKey.user_session(user_id)
        session_data.update({
            'created_at': datetime.utcnow().isoformat(),
            'user_id': user_id
        })
        return self.cache.set(key, session_data, ttl)
    
    def extend_user_session(self, user_id: int, additional_seconds: int = 3600) -> bool:
        """Extend user session TTL."""
        key = CacheKey.user_session(user_id)
        return self.cache.extend_ttl(key, additional_seconds)
    
    def invalidate_user_session(self, user_id: int) -> bool:
        """Invalidate user session."""
        key = CacheKey.user_session(user_id)
        return self.cache.delete(key)


# Global cache instances
cache_manager = CacheManager()
market_data_cache = MarketDataCache(cache_manager)
optimization_cache = OptimizationCache(cache_manager)
session_cache = SessionCache(cache_manager)


def cache_decorator(
    key_template: str, 
    ttl: Optional[int] = None,
    cache_instance: CacheManager = cache_manager
):
    """
    Decorator for caching function results.
    
    Args:
        key_template: Template for cache key (can use function args)
        ttl: Time to live in seconds
        cache_instance: Cache manager instance to use
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Generate cache key from template and function arguments
            import inspect
            sig = inspect.signature(func)
            bound_args = sig.bind(*args, **kwargs)
            bound_args.apply_defaults()
            
            try:
                cache_key = key_template.format(**bound_args.arguments)
            except KeyError:
                # If template formatting fails, execute function directly
                logger.warning(f"Cache key template formatting failed for {func.__name__}")
                return func(*args, **kwargs)
            
            # Try to get from cache first
            cached_result = cache_instance.get(cache_key)
            if cached_result is not None:
                logger.debug(f"Cache hit for function {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_instance.set(cache_key, result, ttl)
            logger.debug(f"Cached result for function {func.__name__}")
            
            return result
        return wrapper
    return decorator


# Health check function
def redis_health_check() -> Dict[str, Any]:
    """
    Perform Redis health check.
    
    Returns:
        Dictionary with health status and metrics
    """
    try:
        start_time = datetime.now()
        
        # Test basic operations
        test_key = "health_check_test"
        test_value = {"timestamp": start_time.isoformat()}
        
        # Set test value
        cache_manager.set(test_key, test_value, ttl=60)
        
        # Get test value
        retrieved = cache_manager.get(test_key)
        
        # Clean up
        cache_manager.delete(test_key)
        
        # Calculate response time
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Get cache info
        cache_info = cache_manager.get_cache_info()
        
        return {
            "status": "healthy",
            "response_time_ms": round(response_time, 2),
            "test_successful": retrieved == test_value,
            "cache_info": cache_info,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat()
        }