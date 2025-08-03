"""
Database Query Optimization

This module provides query optimization utilities, performance monitoring,
and automated query analysis for the portfolio optimization system.
"""

import asyncio
import time
import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from contextlib import asynccontextmanager

import sqlalchemy as sa
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql import text
from sqlalchemy.dialects import postgresql

from app.database.connection_pool import db_pool
from app.database.cache import cache_manager, CacheKey
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class QueryMetrics:
    """Metrics for query performance analysis."""
    query_hash: str
    query_text: str
    execution_count: int = 0
    total_duration_ms: float = 0.0
    avg_duration_ms: float = 0.0
    min_duration_ms: float = float('inf')
    max_duration_ms: float = 0.0
    last_executed: Optional[datetime] = None
    errors: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    rows_returned: List[int] = field(default_factory=list)


class QueryOptimizer:
    """
    Comprehensive query optimization and monitoring system.
    
    Features:
    - Query performance tracking
    - Automatic query caching
    - Query plan analysis
    - Index usage monitoring
    - Slow query detection
    """
    
    def __init__(self):
        self.query_metrics: Dict[str, QueryMetrics] = {}
        self.slow_query_threshold_ms = 1000  # 1 second
        self.cache_enabled = True
        self.monitoring_enabled = True
    
    def _hash_query(self, query: str, parameters: Optional[Dict] = None) -> str:
        """Create deterministic hash for query identification."""
        # Normalize query by removing extra whitespace
        normalized_query = ' '.join(query.split())
        
        # Include parameter keys (not values) in hash for similar queries
        param_keys = sorted(parameters.keys()) if parameters else []
        
        content = f"{normalized_query}|{param_keys}"
        return hashlib.md5(content.encode()).hexdigest()
    
    @asynccontextmanager
    async def monitored_query(
        self, 
        session: AsyncSession, 
        query: str, 
        parameters: Optional[Dict] = None,
        cache_ttl: Optional[int] = None,
        description: str = ""
    ):
        """
        Context manager for monitored query execution with caching.
        
        Args:
            session: Database session
            query: SQL query string
            parameters: Query parameters
            cache_ttl: Cache time-to-live in seconds
            description: Human-readable query description
        """
        query_hash = self._hash_query(query, parameters)
        start_time = time.time()
        
        # Initialize metrics if not exists
        if query_hash not in self.query_metrics:
            self.query_metrics[query_hash] = QueryMetrics(
                query_hash=query_hash,
                query_text=query[:200] + "..." if len(query) > 200 else query
            )
        
        metrics = self.query_metrics[query_hash]
        
        # Try cache first if enabled
        cached_result = None
        if self.cache_enabled and cache_ttl:
            cache_key = f"query:{query_hash}"
            cached_result = cache_manager.get(cache_key)
            
            if cached_result is not None:
                metrics.cache_hits += 1
                logger.debug(f"Query cache hit: {description or query_hash[:8]}")
                
                # Still track execution for monitoring
                duration_ms = (time.time() - start_time) * 1000
                yield cached_result, duration_ms
                return
            else:
                metrics.cache_misses += 1
        
        try:
            # Execute query
            if parameters:
                result = await session.execute(text(query), parameters)
            else:
                result = await session.execute(text(query))
            
            # Convert to list of dictionaries
            rows = [dict(row._mapping) for row in result.fetchall()]
            
            # Cache result if enabled
            if self.cache_enabled and cache_ttl and rows:
                cache_key = f"query:{query_hash}"
                cache_manager.set(cache_key, rows, cache_ttl)
            
            # Calculate metrics
            duration_ms = (time.time() - start_time) * 1000
            
            if self.monitoring_enabled:
                self._update_metrics(metrics, duration_ms, len(rows))
            
            # Log slow queries
            if duration_ms > self.slow_query_threshold_ms:
                logger.warning(
                    f"Slow query detected ({duration_ms:.2f}ms): "
                    f"{description or query[:100]}..."
                )
            
            yield rows, duration_ms
            
        except Exception as e:
            duration_ms = (time.time() - start_time) * 1000
            metrics.errors += 1
            
            logger.error(
                f"Query execution failed ({duration_ms:.2f}ms): {e}\n"
                f"Query: {query[:200]}..."
            )
            raise
    
    def _update_metrics(self, metrics: QueryMetrics, duration_ms: float, row_count: int):
        """Update query performance metrics."""
        metrics.execution_count += 1
        metrics.total_duration_ms += duration_ms
        metrics.avg_duration_ms = metrics.total_duration_ms / metrics.execution_count
        metrics.min_duration_ms = min(metrics.min_duration_ms, duration_ms)
        metrics.max_duration_ms = max(metrics.max_duration_ms, duration_ms)
        metrics.last_executed = datetime.utcnow()
        metrics.rows_returned.append(row_count)
        
        # Keep only last 100 row counts for memory efficiency
        if len(metrics.rows_returned) > 100:
            metrics.rows_returned = metrics.rows_returned[-100:]
    
    async def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze overall query performance."""
        if not self.query_metrics:
            return {"message": "No query data available"}
        
        total_queries = sum(m.execution_count for m in self.query_metrics.values())
        total_duration = sum(m.total_duration_ms for m in self.query_metrics.values())
        total_errors = sum(m.errors for m in self.query_metrics.values())
        
        # Find slowest queries
        slow_queries = [
            {
                "query_hash": m.query_hash,
                "query_text": m.query_text,
                "avg_duration_ms": m.avg_duration_ms,
                "execution_count": m.execution_count,
                "max_duration_ms": m.max_duration_ms
            }
            for m in sorted(
                self.query_metrics.values(), 
                key=lambda x: x.avg_duration_ms, 
                reverse=True
            )[:10]
        ]
        
        # Cache efficiency
        total_cache_requests = sum(m.cache_hits + m.cache_misses for m in self.query_metrics.values())
        total_cache_hits = sum(m.cache_hits for m in self.query_metrics.values())
        cache_hit_rate = (total_cache_hits / total_cache_requests * 100) if total_cache_requests > 0 else 0
        
        return {
            "summary": {
                "total_queries": total_queries,
                "total_duration_ms": total_duration,
                "avg_query_duration_ms": total_duration / total_queries if total_queries > 0 else 0,
                "error_rate": total_errors / total_queries * 100 if total_queries > 0 else 0,
                "cache_hit_rate": round(cache_hit_rate, 2)
            },
            "slow_queries": slow_queries,
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[str]:
        """Generate performance recommendations based on metrics."""
        recommendations = []
        
        # Check for consistently slow queries
        consistently_slow = [
            m for m in self.query_metrics.values()
            if m.avg_duration_ms > self.slow_query_threshold_ms and m.execution_count > 10
        ]
        
        if consistently_slow:
            recommendations.append(
                f"Consider optimizing {len(consistently_slow)} consistently slow queries "
                f"with average duration > {self.slow_query_threshold_ms}ms"
            )
        
        # Check cache efficiency
        total_cache_requests = sum(m.cache_hits + m.cache_misses for m in self.query_metrics.values())
        total_cache_hits = sum(m.cache_hits for m in self.query_metrics.values())
        
        if total_cache_requests > 0:
            cache_hit_rate = total_cache_hits / total_cache_requests
            if cache_hit_rate < 0.5:
                recommendations.append(
                    f"Cache hit rate is low ({cache_hit_rate:.1%}). "
                    "Consider increasing cache TTL or optimizing cache keys"
                )
        
        # Check error rates
        high_error_queries = [
            m for m in self.query_metrics.values()
            if m.errors > 0 and m.execution_count > 0 and m.errors / m.execution_count > 0.1
        ]
        
        if high_error_queries:
            recommendations.append(
                f"Found {len(high_error_queries)} queries with high error rates (>10%). "
                "Review query logic and error handling"
            )
        
        return recommendations
    
    async def explain_query(
        self, 
        session: AsyncSession, 
        query: str, 
        parameters: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Get query execution plan using EXPLAIN ANALYZE.
        
        Args:
            session: Database session
            query: SQL query to analyze
            parameters: Query parameters
            
        Returns:
            Query execution plan and analysis
        """
        try:
            # Build EXPLAIN ANALYZE query
            explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"
            
            if parameters:
                result = await session.execute(text(explain_query), parameters)
            else:
                result = await session.execute(text(explain_query))
            
            plan_data = result.scalar()
            
            if not plan_data:
                return {"error": "No execution plan returned"}
            
            # Extract key metrics from execution plan
            execution_plan = plan_data[0] if isinstance(plan_data, list) else plan_data
            
            analysis = self._analyze_execution_plan(execution_plan)
            
            return {
                "execution_plan": execution_plan,
                "analysis": analysis,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error explaining query: {e}")
            return {"error": str(e)}
    
    def _analyze_execution_plan(self, plan: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze execution plan and provide recommendations."""
        analysis = {
            "execution_time_ms": plan.get("Execution Time", 0),
            "planning_time_ms": plan.get("Planning Time", 0),
            "peak_memory_usage": plan.get("Peak Memory Usage", 0),
            "issues": [],
            "recommendations": []
        }
        
        # Analyze the plan recursively
        def analyze_node(node: Dict[str, Any], depth: int = 0):
            node_type = node.get("Node Type", "")
            
            # Check for expensive operations
            if "Seq Scan" in node_type:
                analysis["issues"].append(
                    f"Sequential scan detected on {node.get('Relation Name', 'unknown table')}"
                )
                analysis["recommendations"].append(
                    f"Consider adding index for table {node.get('Relation Name', 'unknown')}"
                )
            
            # Check for high cost operations
            if node.get("Total Cost", 0) > 1000:
                analysis["issues"].append(
                    f"High cost operation: {node_type} (cost: {node.get('Total Cost')})"
                )
            
            # Check for low selectivity
            rows_planned = node.get("Plan Rows", 1)
            rows_actual = node.get("Actual Rows", 1) 
            if rows_planned > 0 and abs(rows_planned - rows_actual) / rows_planned > 0.5:
                analysis["issues"].append(
                    f"Poor cardinality estimation: planned {rows_planned}, actual {rows_actual}"
                )
                analysis["recommendations"].append(
                    "Consider updating table statistics with ANALYZE"
                )
            
            # Recursively analyze child plans
            for child in node.get("Plans", []):
                analyze_node(child, depth + 1)
        
        # Start analysis from root plan
        if "Plan" in plan:
            analyze_node(plan["Plan"])
        
        return analysis


class OptimizedQueries:
    """
    Collection of optimized queries for common operations.
    
    These queries are pre-optimized with proper indexing hints,
    efficient joins, and caching strategies.
    """
    
    def __init__(self, optimizer: QueryOptimizer):
        self.optimizer = optimizer
    
    async def get_portfolio_data(
        self, 
        session: AsyncSession, 
        portfolio_id: int
    ) -> List[Dict[str, Any]]:
        """Get portfolio data with holdings and current prices."""
        
        query = """
        SELECT 
            p.id as portfolio_id,
            p.name as portfolio_name,
            p.created_at,
            p.updated_at,
            ph.asset_symbol,
            ph.allocation_percentage,
            ph.shares,
            ph.target_allocation,
            md.current_price,
            md.previous_close,
            md.price_change_pct,
            md.updated_at as price_updated_at
        FROM portfolios p
        JOIN portfolio_holdings ph ON p.id = ph.portfolio_id
        LEFT JOIN market_data md ON ph.asset_symbol = md.symbol
        WHERE p.id = :portfolio_id
        AND p.deleted_at IS NULL
        ORDER BY ph.allocation_percentage DESC
        """
        
        async with self.optimizer.monitored_query(
            session=session,
            query=query,
            parameters={"portfolio_id": portfolio_id},
            cache_ttl=300,  # 5 minutes
            description=f"Get portfolio data for portfolio {portfolio_id}"
        ) as (result, duration):
            return result
    
    async def get_market_data_batch(
        self, 
        session: AsyncSession, 
        symbols: List[str], 
        days: int = 252
    ) -> List[Dict[str, Any]]:
        """Get historical market data for multiple symbols efficiently."""
        
        # Use array parameters for efficient IN clause
        query = """
        SELECT 
            symbol,
            date,
            open_price,
            high_price,
            low_price,
            close_price,
            volume,
            adjusted_close
        FROM market_data_history
        WHERE symbol = ANY(:symbols)
        AND date >= CURRENT_DATE - INTERVAL '%s days'
        ORDER BY symbol, date
        """ % days
        
        async with self.optimizer.monitored_query(
            session=session,
            query=query,
            parameters={"symbols": symbols},
            cache_ttl=900,  # 15 minutes
            description=f"Get market data for {len(symbols)} symbols, {days} days"
        ) as (result, duration):
            return result
    
    async def get_correlation_matrix_data(
        self, 
        session: AsyncSession, 
        symbols: List[str], 
        days: int = 252
    ) -> List[Dict[str, Any]]:
        """Get data for correlation matrix calculation with optimized query."""
        
        query = """
        WITH daily_returns AS (
            SELECT 
                symbol,
                date,
                (close_price / LAG(close_price) OVER (PARTITION BY symbol ORDER BY date) - 1) as daily_return
            FROM market_data_history
            WHERE symbol = ANY(:symbols)
            AND date >= CURRENT_DATE - INTERVAL '%s days'
            AND close_price IS NOT NULL
        )
        SELECT 
            symbol,
            date,
            daily_return
        FROM daily_returns
        WHERE daily_return IS NOT NULL
        ORDER BY date, symbol
        """ % days
        
        async with self.optimizer.monitored_query(
            session=session,
            query=query,
            parameters={"symbols": symbols},
            cache_ttl=1800,  # 30 minutes
            description=f"Get correlation data for {len(symbols)} symbols"
        ) as (result, duration):
            return result
    
    async def get_portfolio_performance_metrics(
        self, 
        session: AsyncSession, 
        portfolio_id: int, 
        start_date: str, 
        end_date: str
    ) -> List[Dict[str, Any]]:
        """Get comprehensive portfolio performance metrics."""
        
        query = """
        WITH portfolio_values AS (
            SELECT 
                pv.date,
                pv.total_value,
                pv.daily_return,
                LAG(pv.total_value) OVER (ORDER BY pv.date) as prev_value
            FROM portfolio_values pv
            WHERE pv.portfolio_id = :portfolio_id
            AND pv.date BETWEEN :start_date AND :end_date
            ORDER BY pv.date
        ),
        performance_metrics AS (
            SELECT 
                COUNT(*) as trading_days,
                AVG(daily_return) as avg_daily_return,
                STDDEV(daily_return) as daily_volatility,
                MIN(total_value) as min_value,
                MAX(total_value) as max_value,
                FIRST_VALUE(total_value) OVER (ORDER BY date) as start_value,
                LAST_VALUE(total_value) OVER (ORDER BY date ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as end_value
            FROM portfolio_values
        )
        SELECT 
            trading_days,
            avg_daily_return * 252 as annualized_return,
            daily_volatility * SQRT(252) as annualized_volatility,
            (end_value / start_value - 1) as total_return,
            min_value,
            max_value,
            start_value,
            end_value
        FROM performance_metrics
        """
        
        async with self.optimizer.monitored_query(
            session=session,
            query=query,
            parameters={
                "portfolio_id": portfolio_id,
                "start_date": start_date,
                "end_date": end_date
            },
            cache_ttl=600,  # 10 minutes
            description=f"Get performance metrics for portfolio {portfolio_id}"
        ) as (result, duration):
            return result
    
    async def get_top_performing_portfolios(
        self, 
        session: AsyncSession, 
        user_id: Optional[int] = None, 
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Get top performing portfolios with ranking."""
        
        base_query = """
        WITH portfolio_performance AS (
            SELECT 
                p.id,
                p.name,
                p.user_id,
                p.created_at,
                pv.total_return,
                pv.sharpe_ratio,
                pv.max_drawdown,
                pv.updated_at as performance_updated_at,
                ROW_NUMBER() OVER (ORDER BY pv.sharpe_ratio DESC) as rank
            FROM portfolios p
            JOIN portfolio_performance_summary pv ON p.id = pv.portfolio_id
            WHERE p.deleted_at IS NULL
            AND pv.updated_at >= CURRENT_DATE - INTERVAL '1 day'
        """
        
        if user_id:
            query = base_query + " AND p.user_id = :user_id"
            params = {"user_id": user_id, "limit": limit}
        else:
            query = base_query
            params = {"limit": limit}
        
        query += " ) SELECT * FROM portfolio_performance ORDER BY rank LIMIT :limit"
        
        async with self.optimizer.monitored_query(
            session=session,
            query=query,
            parameters=params,
            cache_ttl=300,  # 5 minutes
            description=f"Get top {limit} performing portfolios"
        ) as (result, duration):
            return result


# Global query optimizer instance
query_optimizer = QueryOptimizer()
optimized_queries = OptimizedQueries(query_optimizer)


async def create_performance_indexes():
    """Create database indexes for optimal query performance."""
    
    indexes = [
        # Portfolio-related indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id) WHERE deleted_at IS NULL",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(asset_symbol)",
        
        # Market data indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_symbol_date ON market_data_history(symbol, date DESC)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_market_data_date ON market_data_history(date DESC)",
        
        # Performance indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_values_portfolio_date ON portfolio_values(portfolio_id, date DESC)",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_performance_sharpe ON portfolio_performance_summary(sharpe_ratio DESC)",
        
        # User and session indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON users(email) WHERE deleted_at IS NULL",
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id, expires_at)",
        
        # Optimization results indexes
        "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_optimization_results_portfolio ON optimization_results(portfolio_id, created_at DESC)",
    ]
    
    async with db_pool.get_session() as session:
        for index_sql in indexes:
            try:
                await session.execute(text(index_sql))
                await session.commit()
                logger.info(f"Created index: {index_sql.split('idx_')[1].split(' ')[0] if 'idx_' in index_sql else 'unknown'}")
            except Exception as e:
                await session.rollback()
                logger.error(f"Failed to create index: {e}")


async def analyze_database_performance() -> Dict[str, Any]:
    """Analyze overall database performance and provide recommendations."""
    
    analysis_queries = {
        "table_sizes": """
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY size_bytes DESC
            LIMIT 10
        """,
        
        "index_usage": """
            SELECT 
                schemaname,
                tablename,
                indexname,
                idx_scan,
                idx_tup_read,
                idx_tup_fetch
            FROM pg_stat_user_indexes
            ORDER BY idx_scan DESC
            LIMIT 20
        """,
        
        "slow_queries": """
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                rows
            FROM pg_stat_statements
            WHERE mean_time > 100  -- Queries taking more than 100ms on average
            ORDER BY mean_time DESC
            LIMIT 10
        """,
        
        "cache_hit_ratio": """
            SELECT 
                'cache_hit_ratio' as metric,
                ROUND(
                    (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 
                    2
                ) as percentage
            FROM pg_statio_user_tables
        """
    }
    
    results = {}
    
    async with db_pool.get_session() as session:
        for metric_name, query in analysis_queries.items():
            try:
                result = await session.execute(text(query))
                results[metric_name] = [dict(row._mapping) for row in result.fetchall()]
            except Exception as e:
                logger.error(f"Error analyzing {metric_name}: {e}")
                results[metric_name] = {"error": str(e)}
    
    # Add query optimizer analysis
    results["query_optimizer_analysis"] = await query_optimizer.analyze_query_performance()
    
    return results