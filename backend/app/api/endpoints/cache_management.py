"""
Cache Management API Endpoints

This module provides API endpoints for cache monitoring, management,
and optimization operations.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database.cache import cache_manager, redis_health_check
from app.database.query_optimizer import query_optimizer, analyze_database_performance
from app.services.cache_service import cache_service
from app.core.auth import get_current_admin_user
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/cache", tags=["cache"])


# Pydantic models
class CacheKeyRequest(BaseModel):
    """Request model for cache key operations."""
    key: str = Field(..., description="Cache key to operate on")


class CacheSetRequest(BaseModel):
    """Request model for setting cache values."""
    key: str = Field(..., description="Cache key")
    value: Any = Field(..., description="Value to cache")
    ttl: Optional[int] = Field(None, description="Time to live in seconds")


class CacheDeleteRequest(BaseModel):
    """Request model for deleting cache entries."""
    pattern: str = Field(..., description="Pattern to match for deletion (e.g., 'market:*')")


class CacheWarmRequest(BaseModel):
    """Request model for cache warming."""
    items: Optional[List[str]] = Field(
        None, 
        description="Specific items to warm (popular_portfolios, market_indices, top_stocks, recent_optimizations)"
    )


class CacheStatsResponse(BaseModel):
    """Response model for cache statistics."""
    redis_info: Dict[str, Any]
    query_performance: Dict[str, Any]
    cache_analytics: Dict[str, Any]
    recommendations: List[str]
    timestamp: str


class CacheHealthResponse(BaseModel):
    """Response model for cache health check."""
    status: str
    response_time_ms: float
    test_successful: bool
    cache_info: Dict[str, Any] = {}
    timestamp: str
    error: Optional[str] = None


# Cache monitoring endpoints
@router.get(
    "/health",
    response_model=CacheHealthResponse,
    summary="Cache Health Check",
    description="Perform comprehensive cache health check including connectivity and performance tests"
)
async def cache_health_check():
    """Perform Redis cache health check."""
    try:
        health_data = redis_health_check()
        return CacheHealthResponse(**health_data)
    except Exception as e:
        logger.error(f"Cache health check failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Cache service unavailable: {str(e)}"
        )


@router.get(
    "/stats",
    response_model=CacheStatsResponse,
    summary="Cache Statistics",
    description="Get comprehensive cache statistics, performance metrics, and recommendations",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_cache_stats():
    """Get comprehensive cache statistics and performance metrics."""
    try:
        # Get Redis info
        redis_info = cache_manager.get_cache_info()
        
        # Get query performance metrics
        query_performance = await query_optimizer.analyze_query_performance()
        
        # Get cache analytics
        cache_analytics = await cache_service.get_cache_analytics()
        
        # Generate recommendations
        recommendations = []
        
        # Check cache hit rate
        hit_rate = redis_info.get("hit_rate", 0)
        if hit_rate < 80:
            recommendations.append(
                f"Cache hit rate is {hit_rate}%. Consider optimizing cache keys or increasing TTL values."
            )
        
        # Check query performance
        if query_performance.get("summary", {}).get("avg_query_duration_ms", 0) > 500:
            recommendations.append(
                "Average query duration is high. Consider query optimization or adding indexes."
            )
        
        # Check memory usage
        used_memory = redis_info.get("used_memory", "Unknown")
        recommendations.append(f"Current Redis memory usage: {used_memory}")
        
        return CacheStatsResponse(
            redis_info=redis_info,
            query_performance=query_performance,
            cache_analytics=cache_analytics,
            recommendations=recommendations,
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache statistics: {str(e)}"
        )


# Cache management endpoints
@router.get(
    "/key/{key}",
    summary="Get Cache Value",
    description="Get value for a specific cache key",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_cache_value(key: str):
    """Get value for a specific cache key."""
    try:
        value = cache_manager.get(key)
        
        if value is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cache key '{key}' not found or expired"
            )
        
        return {
            "key": key,
            "value": value,
            "ttl": cache_manager.get_ttl(key),
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting cache value for key {key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache value: {str(e)}"
        )


@router.post(
    "/key",
    summary="Set Cache Value",
    description="Set value for a cache key with optional TTL",
    dependencies=[Depends(get_current_admin_user)]
)
async def set_cache_value(request: CacheSetRequest):
    """Set value for a cache key."""
    try:
        success = cache_manager.set(request.key, request.value, request.ttl)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to set cache value"
            )
        
        return {
            "message": f"Successfully set cache key '{request.key}'",
            "key": request.key,
            "ttl": request.ttl or cache_manager._get_ttl(request.key),
            "set_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error setting cache value for key {request.key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to set cache value: {str(e)}"
        )


@router.delete(
    "/key/{key}",
    summary="Delete Cache Key",
    description="Delete a specific cache key",
    dependencies=[Depends(get_current_admin_user)]
)
async def delete_cache_key(key: str):
    """Delete a specific cache key."""
    try:
        success = cache_manager.delete(key)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Cache key '{key}' not found"
            )
        
        return {
            "message": f"Successfully deleted cache key '{key}'",
            "deleted_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting cache key {key}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete cache key: {str(e)}"
        )


@router.delete(
    "/pattern",
    summary="Delete Cache Pattern",
    description="Delete all cache keys matching a pattern (admin only)",
    dependencies=[Depends(get_current_admin_user)]
)
async def delete_cache_pattern(request: CacheDeleteRequest):
    """Delete all cache keys matching a pattern."""
    try:
        deleted_count = cache_manager.delete_pattern(request.pattern)
        
        return {
            "message": f"Successfully deleted {deleted_count} cache keys matching pattern '{request.pattern}'",
            "pattern": request.pattern,
            "deleted_count": deleted_count,
            "deleted_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error deleting cache pattern {request.pattern}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete cache pattern: {str(e)}"
        )


@router.post(
    "/flush",
    summary="Flush Cache",
    description="Flush all or specific cache data (admin only)",
    dependencies=[Depends(get_current_admin_user)]
)
async def flush_cache(
    pattern: Optional[str] = Query(None, description="Pattern to match for selective flush")
):
    """Flush cache data."""
    try:
        success = cache_manager.flush_cache(pattern)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to flush cache"
            )
        
        message = f"Successfully flushed cache"
        if pattern:
            message += f" for pattern '{pattern}'"
        else:
            message += " (all data)"
        
        return {
            "message": message,
            "pattern": pattern,
            "flushed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error flushing cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to flush cache: {str(e)}"
        )


# Cache warming endpoints
@router.post(
    "/warm",
    summary="Warm Cache",
    description="Warm cache with frequently accessed data",
    dependencies=[Depends(get_current_admin_user)]  
)
async def warm_cache(request: CacheWarmRequest):
    """Warm cache with frequently accessed data."""
    try:
        await cache_service.warm_cache(request.items)
        
        items_warmed = request.items or ["popular_portfolios", "market_indices", "top_stocks", "recent_optimizations"]
        
        return {
            "message": f"Successfully warmed cache for {len(items_warmed)} categories",
            "items_warmed": items_warmed,
            "warmed_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error warming cache: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to warm cache: {str(e)}"
        )


# Portfolio-specific cache management
@router.delete(
    "/portfolio/{portfolio_id}",
    summary="Invalidate Portfolio Cache",
    description="Invalidate all cached data for a specific portfolio",
    dependencies=[Depends(get_current_admin_user)]
)
async def invalidate_portfolio_cache(portfolio_id: int):
    """Invalidate all cached data for a specific portfolio."""
    try:
        deleted_count = await cache_service.invalidate_portfolio_cache(portfolio_id)
        
        return {
            "message": f"Successfully invalidated cache for portfolio {portfolio_id}",
            "portfolio_id": portfolio_id,
            "deleted_count": deleted_count,
            "invalidated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error invalidating portfolio cache for {portfolio_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate portfolio cache: {str(e)}"
        )


@router.delete(
    "/market-data/{symbol}",
    summary="Invalidate Market Data Cache",
    description="Invalidate cached market data for a specific symbol",
    dependencies=[Depends(get_current_admin_user)]
)
async def invalidate_market_data_cache(symbol: str):
    """Invalidate cached market data for a specific symbol."""
    try:
        deleted_count = cache_service.market_cache.invalidate_symbol(symbol)
        
        return {
            "message": f"Successfully invalidated market data cache for {symbol}",
            "symbol": symbol,
            "deleted_count": deleted_count,
            "invalidated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error invalidating market data cache for {symbol}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invalidate market data cache: {str(e)}"
        )


# Database performance analysis
@router.get(
    "/database/performance",
    summary="Database Performance Analysis",
    description="Analyze database performance and query optimization",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_database_performance():
    """Get database performance analysis."""
    try:
        analysis = await analyze_database_performance()
        
        return {
            "database_analysis": analysis,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error analyzing database performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to analyze database performance: {str(e)}"
        )


# Query performance monitoring
@router.get(
    "/queries/performance",
    summary="Query Performance Metrics",
    description="Get query performance metrics and slow query analysis",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_query_performance():
    """Get query performance metrics."""
    try:
        performance_data = await query_optimizer.analyze_query_performance()
        
        return {
            "query_performance": performance_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting query performance: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get query performance: {str(e)}"
        )


# Cache configuration endpoints
@router.get(
    "/config",
    summary="Cache Configuration",
    description="Get current cache configuration and settings",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_cache_config():
    """Get cache configuration."""
    try:
        config = {
            "redis_config": {
                "host": "localhost",  # Don't expose actual host in production
                "port": 6379,
                "db": 0
            },
            "ttl_config": cache_manager.ttl_config,
            "cache_features": {
                "query_caching": query_optimizer.cache_enabled,
                "monitoring": query_optimizer.monitoring_enabled,
                "slow_query_threshold_ms": query_optimizer.slow_query_threshold_ms,
                "cache_warming": cache_service.warm_cache_on_startup
            }
        }
        
        return {
            "configuration": config,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting cache config: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get cache configuration: {str(e)}"
        )


@router.put(
    "/config/query-threshold",
    summary="Update Slow Query Threshold",
    description="Update the threshold for slow query detection",
    dependencies=[Depends(get_current_admin_user)]
)
async def update_slow_query_threshold(
    threshold_ms: int = Query(..., description="New threshold in milliseconds", ge=100, le=10000)
):
    """Update slow query detection threshold."""
    try:
        old_threshold = query_optimizer.slow_query_threshold_ms
        query_optimizer.slow_query_threshold_ms = threshold_ms
        
        return {
            "message": f"Successfully updated slow query threshold from {old_threshold}ms to {threshold_ms}ms",
            "old_threshold_ms": old_threshold,
            "new_threshold_ms": threshold_ms,
            "updated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error updating slow query threshold: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update slow query threshold: {str(e)}"
        )