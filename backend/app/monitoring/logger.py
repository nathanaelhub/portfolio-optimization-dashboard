"""
Enhanced Logging System with Structured Logging and Performance Monitoring

This module provides comprehensive logging capabilities including structured logging,
performance monitoring, error tracking, and integration with external monitoring systems.
"""

import json
import logging
import sys
import time
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Union
from contextlib import contextmanager
from functools import wraps

import structlog
from structlog.stdlib import LoggerFactory, add_log_level
from pythonjsonlogger import jsonlogger

from app.core.config import settings


class PerformanceMetrics:
    """Track performance metrics for operations."""
    
    def __init__(self):
        self.metrics = {}
        self.start_times = {}
    
    def start_timer(self, operation: str):
        """Start timing an operation."""
        self.start_times[operation] = time.time()
    
    def end_timer(self, operation: str) -> float:
        """End timing and return duration in milliseconds."""
        if operation not in self.start_times:
            return 0.0
        
        duration = (time.time() - self.start_times[operation]) * 1000
        
        # Store metrics
        if operation not in self.metrics:
            self.metrics[operation] = []
        
        self.metrics[operation].append(duration)
        
        # Keep only last 1000 measurements
        if len(self.metrics[operation]) > 1000:
            self.metrics[operation] = self.metrics[operation][-1000:]
        
        del self.start_times[operation]
        return duration
    
    def get_stats(self, operation: str) -> Dict[str, float]:
        """Get statistics for an operation."""
        if operation not in self.metrics or not self.metrics[operation]:
            return {}
        
        measurements = self.metrics[operation]
        return {
            "count": len(measurements),
            "avg_ms": sum(measurements) / len(measurements),
            "min_ms": min(measurements),
            "max_ms": max(measurements),
            "total_ms": sum(measurements)
        }


class StructuredLogger:
    """
    Enhanced structured logger with performance monitoring and error tracking.
    
    Features:
    - Structured JSON logging
    - Performance monitoring
    - Error tracking with stack traces
    - Request/response logging
    - Custom fields and correlation IDs
    """
    
    def __init__(self, name: str):
        self.name = name
        self.performance_metrics = PerformanceMetrics()
        self.logger = self._setup_logger()
    
    def _setup_logger(self) -> structlog.stdlib.BoundLogger:
        """Set up structured logger with JSON output."""
        
        # Configure structlog
        structlog.configure(
            processors=[
                # Add standard library log level
                add_log_level,
                # Add timestamp
                structlog.processors.TimeStamper(fmt="iso"),
                # Add logger name
                structlog.stdlib.add_logger_name,
                # Add stack info for exceptions
                structlog.processors.StackInfoRenderer(),
                structlog.dev.set_exc_info,
                # JSON formatting
                structlog.processors.JSONRenderer()
            ],
            context_class=dict,
            logger_factory=LoggerFactory(),
            wrapper_class=structlog.stdlib.BoundLogger,
            cache_logger_on_first_use=True,
        )
        
        # Create logger
        logger = structlog.get_logger(self.name)
        
        # Set up handlers based on environment
        if settings.ENVIRONMENT == "production":
            self._setup_production_logging()
        else:
            self._setup_development_logging()
        
        return logger
    
    def _setup_production_logging(self):
        """Set up production logging with JSON format."""
        
        # JSON formatter for structured logging
        json_formatter = jsonlogger.JsonFormatter(
            '%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d'
        )
        
        # File handler for application logs
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        file_handler = logging.FileHandler(log_dir / "application.log")
        file_handler.setFormatter(json_formatter)
        file_handler.setLevel(logging.INFO)
        
        # Error file handler
        error_handler = logging.FileHandler(log_dir / "errors.log")
        error_handler.setFormatter(json_formatter)
        error_handler.setLevel(logging.ERROR)
        
        # Console handler for critical issues
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(json_formatter)
        console_handler.setLevel(logging.WARNING)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.INFO)
        root_logger.addHandler(file_handler)
        root_logger.addHandler(error_handler)
        root_logger.addHandler(console_handler)
    
    def _setup_development_logging(self):
        """Set up development logging with readable format."""
        
        # Simple formatter for development
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.DEBUG)
        
        # Configure root logger
        root_logger = logging.getLogger()
        root_logger.setLevel(logging.DEBUG)
        root_logger.addHandler(console_handler)
    
    def debug(self, message: str, **kwargs):
        """Log debug message with structured data."""
        self.logger.debug(message, extra=kwargs)
    
    def info(self, message: str, **kwargs):
        """Log info message with structured data."""
        self.logger.info(message, extra=kwargs)
    
    def warning(self, message: str, **kwargs):
        """Log warning message with structured data."""
        self.logger.warning(message, extra=kwargs)
    
    def error(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log error message with structured data and optional exception."""
        extra_data = kwargs.copy()
        
        if error:
            extra_data.update({
                "error_type": type(error).__name__,
                "error_message": str(error),
                "stack_trace": traceback.format_exc()
            })
        
        self.logger.error(message, extra=extra_data)
    
    def critical(self, message: str, error: Optional[Exception] = None, **kwargs):
        """Log critical message with structured data."""
        extra_data = kwargs.copy()
        
        if error:
            extra_data.update({
                "error_type": type(error).__name__,
                "error_message": str(error),
                "stack_trace": traceback.format_exc()
            })
        
        self.logger.critical(message, extra=extra_data)
    
    @contextmanager
    def performance_timer(self, operation: str, **context):
        """Context manager for timing operations."""
        self.performance_metrics.start_timer(operation)
        start_time = time.time()
        
        try:
            yield
        finally:
            duration_ms = self.performance_metrics.end_timer(operation)
            
            self.info(
                f"Operation completed: {operation}",
                operation=operation,
                duration_ms=duration_ms,
                **context
            )
    
    def log_request(
        self, 
        method: str, 
        url: str, 
        status_code: int,
        duration_ms: float,
        user_id: Optional[int] = None,
        **kwargs
    ):
        """Log HTTP request with structured data."""
        self.info(
            f"HTTP Request: {method} {url}",
            request_method=method,
            request_url=url,
            response_status=status_code,
            response_time_ms=duration_ms,
            user_id=user_id,
            **kwargs
        )
    
    def log_database_query(
        self, 
        query: str, 
        duration_ms: float,
        rows_affected: Optional[int] = None,
        **kwargs
    ):
        """Log database query with performance metrics."""
        self.debug(
            "Database query executed",
            query_text=query[:200] + "..." if len(query) > 200 else query,
            query_duration_ms=duration_ms,
            rows_affected=rows_affected,
            **kwargs
        )
    
    def log_cache_operation(
        self, 
        operation: str, 
        key: str, 
        hit: bool,
        duration_ms: Optional[float] = None,
        **kwargs
    ):
        """Log cache operation."""
        self.debug(
            f"Cache {operation}",
            cache_operation=operation,
            cache_key=key,
            cache_hit=hit,
            operation_duration_ms=duration_ms,
            **kwargs
        )
    
    def log_optimization_result(
        self, 
        portfolio_id: int, 
        method: str,
        duration_ms: float,
        success: bool,
        **kwargs
    ):
        """Log portfolio optimization result."""
        level = "info" if success else "error"
        message = f"Portfolio optimization {'completed' if success else 'failed'}"
        
        log_data = {
            "portfolio_id": portfolio_id,
            "optimization_method": method,
            "optimization_duration_ms": duration_ms,
            "optimization_success": success,
            **kwargs
        }
        
        if success:
            self.info(message, **log_data)
        else:
            self.error(message, **log_data)
    
    def log_security_event(
        self, 
        event_type: str, 
        severity: str,
        user_id: Optional[int] = None,
        ip_address: Optional[str] = None,
        **kwargs
    ):
        """Log security-related events."""
        self.warning(
            f"Security event: {event_type}",
            security_event=event_type,
            security_severity=severity,
            user_id=user_id,
            ip_address=ip_address,
            **kwargs
        )
    
    def get_performance_stats(self) -> Dict[str, Dict[str, float]]:
        """Get performance statistics for all tracked operations."""
        stats = {}
        for operation in self.performance_metrics.metrics:
            stats[operation] = self.performance_metrics.get_stats(operation)
        return stats


class RequestLogger:
    """Middleware for logging HTTP requests and responses."""
    
    def __init__(self, logger: StructuredLogger):
        self.logger = logger
    
    async def log_request(self, request, call_next):
        """Log HTTP request and response."""
        start_time = time.time()
        
        # Extract request info
        method = request.method
        url = str(request.url)
        user_id = getattr(request.state, 'user_id', None)
        correlation_id = getattr(request.state, 'correlation_id', None)
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log successful request
            self.logger.log_request(
                method=method,
                url=url,
                status_code=response.status_code,
                duration_ms=duration_ms,
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            return response
            
        except Exception as e:
            # Calculate duration for failed request
            duration_ms = (time.time() - start_time) * 1000
            
            # Log failed request
            self.logger.error(
                f"Request failed: {method} {url}",
                error=e,
                request_method=method,
                request_url=url,
                response_time_ms=duration_ms,
                user_id=user_id,
                correlation_id=correlation_id
            )
            
            raise


def performance_monitor(operation_name: str = None):
    """
    Decorator for monitoring function performance.
    
    Args:
        operation_name: Name for the operation (defaults to function name)
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            op_name = operation_name or f"{func.__name__}"
            
            with logger.performance_timer(op_name):
                return await func(*args, **kwargs)
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = get_logger(func.__module__)
            op_name = operation_name or f"{func.__name__}"
            
            with logger.performance_timer(op_name):
                return func(*args, **kwargs)
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


def log_errors(logger_name: str = None):
    """
    Decorator for automatic error logging.
    
    Args:
        logger_name: Name of logger to use (defaults to function module)
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            logger = get_logger(logger_name or func.__module__)
            
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"Error in {func.__name__}",
                    error=e,
                    function_name=func.__name__,
                    function_args=str(args),
                    function_kwargs=str(kwargs)
                )
                raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            logger = get_logger(logger_name or func.__module__)
            
            try:
                return func(*args, **kwargs)
            except Exception as e:
                logger.error(
                    f"Error in {func.__name__}",
                    error=e,
                    function_name=func.__name__,
                    function_args=str(args),
                    function_kwargs=str(kwargs)
                )
                raise
        
        # Return appropriate wrapper based on function type
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Global logger instances
_loggers: Dict[str, StructuredLogger] = {}


def get_logger(name: str) -> StructuredLogger:
    """
    Get or create a structured logger instance.
    
    Args:
        name: Logger name (typically module name)
        
    Returns:
        StructuredLogger instance
    """
    if name not in _loggers:
        _loggers[name] = StructuredLogger(name)
    
    return _loggers[name]


def get_all_performance_stats() -> Dict[str, Dict[str, Dict[str, float]]]:
    """Get performance statistics from all loggers."""
    all_stats = {}
    
    for logger_name, logger in _loggers.items():
        stats = logger.get_performance_stats()
        if stats:
            all_stats[logger_name] = stats
    
    return all_stats


# Application-specific loggers
app_logger = get_logger("app")
security_logger = get_logger("security")
performance_logger = get_logger("performance")
database_logger = get_logger("database")
cache_logger = get_logger("cache")
optimization_logger = get_logger("optimization")


# Convenience functions for common logging patterns
def log_user_action(
    user_id: int, 
    action: str, 
    resource: str,
    success: bool = True,
    **kwargs
):
    """Log user action for audit trail."""
    app_logger.info(
        f"User action: {action} on {resource}",
        user_id=user_id,
        action=action,
        resource=resource,
        success=success,
        **kwargs
    )


def log_system_event(event: str, severity: str = "info", **kwargs):
    """Log system event."""
    logger_method = getattr(app_logger, severity, app_logger.info)
    logger_method(
        f"System event: {event}",
        system_event=event,
        **kwargs
    )


def log_api_error(
    endpoint: str, 
    error: Exception, 
    user_id: Optional[int] = None,
    **kwargs
):
    """Log API error with context."""
    app_logger.error(
        f"API error in {endpoint}",
        error=error,
        api_endpoint=endpoint,
        user_id=user_id,
        **kwargs
    )


def log_optimization_start(portfolio_id: int, method: str, **kwargs):
    """Log start of portfolio optimization."""
    optimization_logger.info(
        f"Starting optimization for portfolio {portfolio_id}",
        portfolio_id=portfolio_id,
        optimization_method=method,
        optimization_status="started",
        **kwargs
    )


def log_optimization_complete(
    portfolio_id: int, 
    method: str, 
    duration_ms: float,
    success: bool,
    **kwargs
):
    """Log completion of portfolio optimization."""
    optimization_logger.log_optimization_result(
        portfolio_id=portfolio_id,
        method=method,
        duration_ms=duration_ms,
        success=success,
        **kwargs
    )