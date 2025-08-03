import json
import pickle
from typing import Any, Optional
from datetime import timedelta
from app.database.connection import get_redis
import hashlib

class CacheService:
    def __init__(self):
        self.redis = get_redis()
        self.default_ttl = 3600  # 1 hour default

    def _make_key(self, prefix: str, *args) -> str:
        """Create a cache key from prefix and arguments"""
        key_data = f"{prefix}:{':'.join(str(arg) for arg in args)}"
        return hashlib.md5(key_data.encode()).hexdigest()

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache"""
        try:
            data = self.redis.get(key)
            if data:
                return pickle.loads(data)
        except Exception as e:
            print(f"Cache get error: {e}")
        return None

    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache with optional TTL"""
        try:
            serialized = pickle.dumps(value)
            return self.redis.set(key, serialized, ex=ttl or self.default_ttl)
        except Exception as e:
            print(f"Cache set error: {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete key from cache"""
        try:
            return bool(self.redis.delete(key))
        except Exception as e:
            print(f"Cache delete error: {e}")
            return False

    def get_market_data(self, symbol: str, period: str = "1y") -> Optional[Any]:
        """Get cached market data"""
        key = self._make_key("market_data", symbol, period)
        return self.get(key)

    def set_market_data(self, symbol: str, period: str, data: Any, ttl: int = 1800) -> bool:
        """Cache market data for 30 minutes"""
        key = self._make_key("market_data", symbol, period)
        return self.set(key, data, ttl)

    def get_optimization_result(self, portfolio_hash: str, strategy: str) -> Optional[Any]:
        """Get cached optimization result"""
        key = self._make_key("optimization", portfolio_hash, strategy)
        return self.get(key)

    def set_optimization_result(self, portfolio_hash: str, strategy: str, result: Any, ttl: int = 7200) -> bool:
        """Cache optimization result for 2 hours"""
        key = self._make_key("optimization", portfolio_hash, strategy)
        return self.set(key, result, ttl)

    def get_efficient_frontier(self, symbols_hash: str) -> Optional[Any]:
        """Get cached efficient frontier"""
        key = self._make_key("efficient_frontier", symbols_hash)
        return self.get(key)

    def set_efficient_frontier(self, symbols_hash: str, frontier_data: Any, ttl: int = 3600) -> bool:
        """Cache efficient frontier for 1 hour"""
        key = self._make_key("efficient_frontier", symbols_hash)
        return self.set(key, frontier_data, ttl)

    def get_stock_info(self, symbol: str) -> Optional[Any]:
        """Get cached stock information"""
        key = self._make_key("stock_info", symbol)
        return self.get(key)

    def set_stock_info(self, symbol: str, info: Any, ttl: int = 86400) -> bool:
        """Cache stock info for 24 hours"""
        key = self._make_key("stock_info", symbol)
        return self.set(key, info, ttl)

    def get_correlation_matrix(self, symbols_hash: str) -> Optional[Any]:
        """Get cached correlation matrix"""
        key = self._make_key("correlation", symbols_hash)
        return self.get(key)

    def set_correlation_matrix(self, symbols_hash: str, matrix: Any, ttl: int = 3600) -> bool:
        """Cache correlation matrix for 1 hour"""
        key = self._make_key("correlation", symbols_hash)
        return self.set(key, matrix, ttl)

    def invalidate_portfolio_cache(self, portfolio_id: int):
        """Invalidate all cache entries related to a portfolio"""
        pattern = f"*portfolio:{portfolio_id}*"
        try:
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
        except Exception as e:
            print(f"Cache invalidation error: {e}")

    def get_cache_stats(self) -> dict:
        """Get cache statistics"""
        try:
            info = self.redis.info()
            return {
                "connected_clients": info.get("connected_clients", 0),
                "used_memory": info.get("used_memory_human", "0B"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
                "total_commands_processed": info.get("total_commands_processed", 0)
            }
        except Exception:
            return {"error": "Unable to fetch cache stats"}

# Global cache instance
cache = CacheService()