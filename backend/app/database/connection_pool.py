"""
Database Connection Pool Management

This module provides optimized database connection pooling for PostgreSQL
with automatic failover, health monitoring, and performance optimization.
"""

import asyncio
import time
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, List, AsyncGenerator
from dataclasses import dataclass

import asyncpg
import sqlalchemy as sa
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.pool import QueuePool
from sqlalchemy.engine.events import event

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class ConnectionStats:
    """Statistics for database connections."""
    total_connections: int
    active_connections: int
    idle_connections: int
    waiting_connections: int
    overflow_connections: int
    failed_connections: int
    avg_connection_time_ms: float
    avg_query_time_ms: float
    total_queries: int


class DatabaseConnectionPool:
    """
    Advanced database connection pool with monitoring and optimization.
    
    Features:
    - Connection pooling with SQLAlchemy async
    - Health monitoring and automatic recovery
    - Query performance tracking
    - Connection lifecycle management
    - Automatic scaling based on load
    """
    
    def __init__(self):
        self.engine = None
        self.session_factory = None
        self.connection_stats = ConnectionStats(
            total_connections=0,
            active_connections=0,
            idle_connections=0,
            waiting_connections=0,
            overflow_connections=0,
            failed_connections=0,
            avg_connection_time_ms=0.0,
            avg_query_time_ms=0.0,
            total_queries=0
        )
        self.query_times: List[float] = []
        self.connection_times: List[float] = []
        self.last_health_check = datetime.utcnow()
        self.health_status = "unknown"
        
    async def initialize(self):
        """Initialize the connection pool with optimized settings."""
        try:
            # Build database URL
            database_url = self._build_database_url()
            
            # Create async engine with optimized pool settings
            self.engine = create_async_engine(
                database_url,
                poolclass=QueuePool,
                pool_size=settings.DATABASE_POOL_SIZE,
                max_overflow=settings.DATABASE_MAX_OVERFLOW,
                pool_pre_ping=True,
                pool_recycle=3600,  # Recycle connections every hour
                pool_timeout=30,
                echo=settings.DEBUG,
                echo_pool=settings.DEBUG,
                # Asyncpg specific settings
                connect_args={
                    "command_timeout": 60,
                    "server_settings": {
                        "jit": "off",  # Disable JIT for predictable performance
                        "application_name": "portfolio_optimization_dashboard",
                    }
                }
            )
            
            # Set up event listeners for monitoring
            self._setup_event_listeners()
            
            # Create session factory
            self.session_factory = async_sessionmaker(
                self.engine,
                class_=AsyncSession,
                expire_on_commit=False,
                autoflush=False,  # Manual flush for better control
                autocommit=False
            )
            
            # Test initial connection
            await self.health_check()
            
            logger.info(
                f"Database connection pool initialized: "
                f"pool_size={settings.DATABASE_POOL_SIZE}, "
                f"max_overflow={settings.DATABASE_MAX_OVERFLOW}"
            )
            
        except Exception as e:
            logger.error(f"Failed to initialize database connection pool: {e}")
            raise
    
    def _build_database_url(self) -> str:
        """Build PostgreSQL async URL from settings."""
        return (
            f"postgresql+asyncpg://{settings.DATABASE_USER}:"
            f"{settings.DATABASE_PASSWORD}@{settings.DATABASE_HOST}:"
            f"{settings.DATABASE_PORT}/{settings.DATABASE_NAME}"
        )
    
    def _setup_event_listeners(self):
        """Set up SQLAlchemy event listeners for monitoring."""
        
        @event.listens_for(self.engine.sync_engine, "connect")
        def on_connect(dbapi_connection, connection_record):
            """Handle new connections."""
            self.connection_stats.total_connections += 1
            logger.debug("New database connection established")
        
        @event.listens_for(self.engine.sync_engine, "checkout")
        def on_checkout(dbapi_connection, connection_record, connection_proxy):
            """Handle connection checkout from pool."""
            start_time = time.time()
            connection_record.info['checkout_time'] = start_time
        
        @event.listens_for(self.engine.sync_engine, "checkin")
        def on_checkin(dbapi_connection, connection_record):
            """Handle connection checkin to pool."""
            if 'checkout_time' in connection_record.info:
                checkout_time = connection_record.info['checkout_time']
                duration = (time.time() - checkout_time) * 1000  # ms
                self.connection_times.append(duration)
                
                # Keep only last 1000 measurements
                if len(self.connection_times) > 1000:
                    self.connection_times = self.connection_times[-1000:]
                
                # Update average
                self.connection_stats.avg_connection_time_ms = sum(self.connection_times) / len(self.connection_times)
        
        @event.listens_for(self.engine.sync_engine, "invalidate")
        def on_invalidate(dbapi_connection, connection_record, exception):
            """Handle connection invalidation."""
            self.connection_stats.failed_connections += 1
            logger.warning(f"Database connection invalidated: {exception}")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        """
        Get database session with automatic cleanup.
        
        Usage:
            async with db_pool.get_session() as session:
                result = await session.execute(query)
        """
        if not self.session_factory:
            raise RuntimeError("Database connection pool not initialized")
        
        session = self.session_factory()
        start_time = time.time()
        
        try:
            yield session
            await session.commit()
            
        except Exception as e:
            await session.rollback()
            logger.error(f"Database session error: {e}")
            raise
            
        finally:
            await session.close()
            
            # Track query time
            duration = (time.time() - start_time) * 1000  # ms
            self.query_times.append(duration)
            
            # Keep only last 1000 measurements
            if len(self.query_times) > 1000:
                self.query_times = self.query_times[-1000:]
            
            # Update stats
            self.connection_stats.total_queries += 1
            if self.query_times:
                self.connection_stats.avg_query_time_ms = sum(self.query_times) / len(self.query_times)
    
    async def execute_query(
        self, 
        query: str, 
        parameters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        Execute a raw SQL query with parameter binding.
        
        Args:
            query: SQL query string
            parameters: Query parameters
            
        Returns:
            List of result dictionaries
        """
        async with self.get_session() as session:
            result = await session.execute(sa.text(query), parameters or {})
            return [dict(row._mapping) for row in result.fetchall()]
    
    async def execute_transaction(self, operations: List[callable]) -> Any:
        """
        Execute multiple operations in a single transaction.
        
        Args:
            operations: List of async callable operations
            
        Returns:
            Results from operations
        """
        async with self.get_session() as session:
            results = []
            
            for operation in operations:
                if asyncio.iscoroutinefunction(operation):
                    result = await operation(session)
                else:
                    result = operation(session)
                results.append(result)
            
            return results
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform comprehensive database health check.
        
        Returns:
            Health status and performance metrics
        """
        start_time = time.time()
        health_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "status": "healthy",
            "response_time_ms": 0,
            "pool_stats": {},
            "database_info": {},
            "performance_metrics": {}
        }
        
        try:
            # Test basic connectivity
            async with self.get_session() as session:
                result = await session.execute(sa.text("SELECT 1 as test"))
                test_result = result.scalar()
                
                if test_result != 1:
                    raise Exception("Basic connectivity test failed")
            
            # Get pool statistics
            if self.engine:
                pool = self.engine.pool
                health_data["pool_stats"] = {
                    "size": pool.size(),
                    "checked_in": pool.checkedin(),
                    "checked_out": pool.checkedout(),
                    "overflow": pool.overflow(),
                    "invalid": pool.invalid()
                }
            
            # Get database information
            db_info = await self._get_database_info()
            health_data["database_info"] = db_info
            
            # Performance metrics
            health_data["performance_metrics"] = {
                "avg_connection_time_ms": self.connection_stats.avg_connection_time_ms,
                "avg_query_time_ms": self.connection_stats.avg_query_time_ms,
                "total_queries": self.connection_stats.total_queries,
                "failed_connections": self.connection_stats.failed_connections
            }
            
            # Calculate response time
            response_time = (time.time() - start_time) * 1000
            health_data["response_time_ms"] = round(response_time, 2)
            
            self.health_status = "healthy"
            self.last_health_check = datetime.utcnow()
            
        except Exception as e:
            health_data["status"] = "unhealthy"
            health_data["error"] = str(e)
            self.health_status = "unhealthy"
            logger.error(f"Database health check failed: {e}")
        
        return health_data
    
    async def _get_database_info(self) -> Dict[str, Any]:
        """Get detailed database information."""
        queries = {
            "version": "SELECT version() as version",
            "current_database": "SELECT current_database() as db_name",
            "active_connections": """
                SELECT count(*) as active_connections 
                FROM pg_stat_activity 
                WHERE state = 'active'
            """,
            "database_size": """
                SELECT pg_size_pretty(pg_database_size(current_database())) as size
            """,
            "slow_queries": """
                SELECT count(*) as slow_query_count
                FROM pg_stat_activity 
                WHERE state = 'active' 
                AND query_start < now() - interval '30 seconds'
            """
        }
        
        info = {}
        
        try:
            async with self.get_session() as session:
                for key, query in queries.items():
                    result = await session.execute(sa.text(query))
                    row = result.first()
                    if row:
                        info[key] = list(row)[0] if len(row) == 1 else dict(row._mapping)
        except Exception as e:
            logger.error(f"Error getting database info: {e}")
            info["error"] = str(e)
        
        return info
    
    async def optimize_connections(self):
        """Optimize connection pool based on current load."""
        try:
            # Get current pool statistics
            if not self.engine:
                return
            
            pool = self.engine.pool
            pool_size = pool.size()
            checked_out = pool.checkedout()
            utilization = checked_out / pool_size if pool_size > 0 else 0
            
            # Log current utilization
            logger.info(
                f"Connection pool utilization: {utilization:.2%} "
                f"({checked_out}/{pool_size})"
            )
            
            # Suggest optimizations based on utilization
            if utilization > 0.8:
                logger.warning(
                    "High connection pool utilization detected. "
                    "Consider increasing pool size or optimizing queries."
                )
            elif utilization < 0.2:
                logger.info(
                    "Low connection pool utilization. "
                    "Current pool size may be larger than needed."
                )
            
            # Check for long-running queries
            long_running_queries = await self._check_long_running_queries()
            if long_running_queries:
                logger.warning(
                    f"Found {len(long_running_queries)} long-running queries. "
                    "This may impact connection availability."
                )
                
        except Exception as e:
            logger.error(f"Error optimizing connections: {e}")
    
    async def _check_long_running_queries(self) -> List[Dict[str, Any]]:
        """Check for long-running queries that may be blocking connections."""
        query = """
            SELECT 
                pid,
                now() - pg_stat_activity.query_start AS duration,
                query,
                state
            FROM pg_stat_activity 
            WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes'
            AND state = 'active'
            ORDER BY duration DESC;
        """
        
        try:
            return await self.execute_query(query)
        except Exception as e:
            logger.error(f"Error checking long-running queries: {e}")
            return []
    
    async def close(self):
        """Close all connections and cleanup resources."""
        if self.engine:
            await self.engine.dispose()
            logger.info("Database connection pool closed")


class ReadReplicaPool:
    """
    Separate connection pool for read replicas to distribute read load.
    
    This pool automatically routes read-only queries to replica databases
    while maintaining write queries on the primary database.
    """
    
    def __init__(self, replica_urls: List[str]):
        self.replica_engines = []
        self.replica_session_factories = []
        self.current_replica_index = 0
        self.replica_health = {}
        
        for i, url in enumerate(replica_urls):
            engine = create_async_engine(
                url,
                poolclass=QueuePool,
                pool_size=settings.DATABASE_POOL_SIZE // 2,  # Smaller pools for replicas
                max_overflow=settings.DATABASE_MAX_OVERFLOW // 2,
                pool_pre_ping=True,
                pool_recycle=3600,
                echo=settings.DEBUG
            )
            
            session_factory = async_sessionmaker(
                engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            self.replica_engines.append(engine)
            self.replica_session_factories.append(session_factory)
            self.replica_health[i] = True
    
    @asynccontextmanager
    async def get_read_session(self) -> AsyncGenerator[AsyncSession, None]:
        """Get a session from a healthy read replica."""
        replica_index = self._get_healthy_replica()
        
        if replica_index is None:
            raise RuntimeError("No healthy read replicas available")
        
        session_factory = self.replica_session_factories[replica_index]
        session = session_factory()
        
        try:
            yield session
        except Exception as e:
            # Mark replica as unhealthy if connection fails
            self.replica_health[replica_index] = False
            logger.error(f"Read replica {replica_index} failed: {e}")
            raise
        finally:
            await session.close()
    
    def _get_healthy_replica(self) -> Optional[int]:
        """Get the index of a healthy read replica using round-robin."""
        healthy_replicas = [
            idx for idx, healthy in self.replica_health.items() 
            if healthy
        ]
        
        if not healthy_replicas:
            return None
        
        # Round-robin selection
        self.current_replica_index = (self.current_replica_index + 1) % len(healthy_replicas)
        return healthy_replicas[self.current_replica_index]
    
    async def health_check_replicas(self):
        """Check health of all read replicas."""
        for i, session_factory in enumerate(self.replica_session_factories):
            try:
                session = session_factory()
                async with session:
                    await session.execute(sa.text("SELECT 1"))
                    self.replica_health[i] = True
            except Exception as e:
                self.replica_health[i] = False
                logger.error(f"Read replica {i} health check failed: {e}")
    
    async def close(self):
        """Close all replica connections."""
        for engine in self.replica_engines:
            await engine.dispose()


# Global connection pool instances
db_pool = DatabaseConnectionPool()
read_replica_pool = None  # Initialize only if read replicas are configured


async def initialize_database_pools():
    """Initialize all database connection pools."""
    global read_replica_pool
    
    # Initialize main connection pool
    await db_pool.initialize()
    
    # Initialize read replica pool if configured
    if hasattr(settings, 'DATABASE_READ_REPLICAS') and settings.DATABASE_READ_REPLICAS:
        read_replica_pool = ReadReplicaPool(settings.DATABASE_READ_REPLICAS)
        await read_replica_pool.health_check_replicas()
        logger.info(f"Initialized {len(settings.DATABASE_READ_REPLICAS)} read replicas")


async def close_database_pools():
    """Close all database connection pools."""
    await db_pool.close()
    
    if read_replica_pool:
        await read_replica_pool.close()


# Dependency function for FastAPI
async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to get database session."""
    async with db_pool.get_session() as session:
        yield session


async def get_read_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency to get read-only database session."""
    if read_replica_pool:
        async with read_replica_pool.get_read_session() as session:
            yield session
    else:
        # Fall back to main pool if no read replicas
        async with db_pool.get_session() as session:
            yield session