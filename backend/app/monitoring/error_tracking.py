"""
Error Tracking and Monitoring System

This module provides comprehensive error tracking, exception handling,
and integration with external error monitoring services like Sentry.
"""

import json
import sys
import traceback
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Type
from dataclasses import dataclass, field
from collections import defaultdict
from contextlib import contextmanager
from functools import wraps

import sentry_sdk
from sentry_sdk.integrations.asyncio import AsyncioIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.core.config import settings
from app.monitoring.logger import get_logger

logger = get_logger(__name__)


@dataclass
class ErrorInfo:
    """Detailed error information."""
    error_id: str
    error_type: str
    error_message: str
    stack_trace: str
    timestamp: datetime
    user_id: Optional[int] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    context: Dict[str, Any] = field(default_factory=dict)
    fingerprint: Optional[str] = None
    severity: str = "error"
    count: int = 1


class ErrorTracker:
    """
    Comprehensive error tracking system.
    
    Features:
    - Error aggregation and deduplication
    - Severity classification
    - Context preservation
    - Rate limiting for error notifications
    - Integration with external services
    """
    
    def __init__(self):
        self.errors: Dict[str, ErrorInfo] = {}
        self.error_counts: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        self.notification_history: Dict[str, List[datetime]] = defaultdict(list)
        
        # Initialize Sentry if configured
        self._initialize_sentry()
        
        # Error classification rules
        self.severity_rules = {
            "critical": [
                "DatabaseError",
                "ConnectionError", 
                "SecurityException",
                "AuthenticationError"
            ],
            "high": [
                "ValidationError",
                "PermissionError",
                "TimeoutError"
            ],
            "medium": [
                "ValueError",
                "KeyError",
                "AttributeError"
            ],
            "low": [
                "UserWarning",
                "DeprecationWarning"
            ]
        }
    
    def _initialize_sentry(self):
        """Initialize Sentry error tracking if configured."""
        if hasattr(settings, 'SENTRY_DSN') and settings.SENTRY_DSN:
            sentry_sdk.init(
                dsn=settings.SENTRY_DSN,
                environment=settings.ENVIRONMENT,
                traces_sample_rate=0.1,  # 10% of transactions
                profiles_sample_rate=0.1,  # 10% of transactions for profiling
                integrations=[
                    FastApiIntegration(auto_enable=True),
                    AsyncioIntegration(),
                    SqlalchemyIntegration(),
                    RedisIntegration()
                ],
                before_send=self._sentry_before_send,
                release=getattr(settings, 'APP_VERSION', 'unknown')
            )
            logger.info("Sentry error tracking initialized")
        else:
            logger.info("Sentry not configured, using local error tracking only")
    
    def _sentry_before_send(self, event: Dict[str, Any], hint: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Process events before sending to Sentry."""
        # Filter out certain errors or add custom processing
        
        # Don't send certain errors to Sentry
        if 'exc_info' in hint:
            exc_type, exc_value, tb = hint['exc_info']
            
            # Skip common client errors
            if exc_type.__name__ in ['ValidationError', 'HTTPException']:
                return None
        
        # Add custom tags
        event.setdefault('tags', {}).update({
            'component': 'portfolio_optimization',
            'environment': settings.ENVIRONMENT
        })
        
        return event
    
    def track_error(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]] = None,
        user_id: Optional[int] = None,
        request_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        severity: Optional[str] = None
    ) -> str:
        """
        Track an error with context information.
        
        Args:
            error: Exception instance
            context: Additional context information
            user_id: ID of the user associated with the error
            request_id: Request identifier
            endpoint: API endpoint where error occurred
            severity: Override automatic severity classification
            
        Returns:
            Error ID for tracking
        """
        error_type = type(error).__name__
        error_message = str(error)
        stack_trace = traceback.format_exc()
        
        # Generate fingerprint for deduplication
        fingerprint = self._generate_fingerprint(error_type, error_message, stack_trace)
        
        # Determine severity
        if not severity:
            severity = self._classify_severity(error_type)
        
        # Check if this is a duplicate error
        if fingerprint in self.errors:
            existing_error = self.errors[fingerprint]
            existing_error.count += 1
            existing_error.timestamp = datetime.utcnow()
            error_id = existing_error.error_id
        else:
            # Create new error record
            error_id = self._generate_error_id()
            
            error_info = ErrorInfo(
                error_id=error_id,
                error_type=error_type,
                error_message=error_message,
                stack_trace=stack_trace,
                timestamp=datetime.utcnow(),
                user_id=user_id,
                request_id=request_id,
                endpoint=endpoint,
                context=context or {},
                fingerprint=fingerprint,
                severity=severity
            )
            
            self.errors[fingerprint] = error_info
        
        # Update error counts
        self._update_error_counts(error_type, severity)
        
        # Log the error
        self._log_error(self.errors[fingerprint])
        
        # Send to Sentry if configured
        self._send_to_sentry(error, context, user_id, request_id, endpoint)
        
        # Check if notification should be sent
        self._check_notification_threshold(fingerprint)
        
        return error_id
    
    def _generate_fingerprint(self, error_type: str, error_message: str, stack_trace: str) -> str:
        """Generate a fingerprint for error deduplication."""
        import hashlib
        
        # Use error type and the first few lines of stack trace
        stack_lines = stack_trace.split('\n')[:10]
        stack_signature = '\n'.join(stack_lines)
        
        fingerprint_content = f"{error_type}:{stack_signature}"
        return hashlib.md5(fingerprint_content.encode()).hexdigest()
    
    def _generate_error_id(self) -> str:
        """Generate unique error ID."""
        import uuid
        return str(uuid.uuid4())[:8]
    
    def _classify_severity(self, error_type: str) -> str:
        """Classify error severity based on error type."""
        for severity, error_types in self.severity_rules.items():
            if error_type in error_types:
                return severity
        
        return "medium"  # Default severity
    
    def _update_error_counts(self, error_type: str, severity: str):
        """Update error count statistics."""
        now = datetime.utcnow()
        hour_key = now.strftime("%Y-%m-%d-%H")
        
        self.error_counts[hour_key][error_type] += 1
        self.error_counts[hour_key][f"severity_{severity}"] += 1
        self.error_counts[hour_key]["total"] += 1
    
    def _log_error(self, error_info: ErrorInfo):
        """Log error information."""
        logger.error(
            f"Error tracked: {error_info.error_type}",
            error_id=error_info.error_id,
            error_type=error_info.error_type,
            error_message=error_info.error_message,
            severity=error_info.severity,
            user_id=error_info.user_id,
            request_id=error_info.request_id,
            endpoint=error_info.endpoint,
            error_count=error_info.count,
            **error_info.context
        )
    
    def _send_to_sentry(
        self,
        error: Exception,
        context: Optional[Dict[str, Any]],
        user_id: Optional[int],
        request_id: Optional[str],
        endpoint: Optional[str]
    ):
        """Send error to Sentry if configured."""
        try:
            with sentry_sdk.push_scope() as scope:
                # Add user context
                if user_id:
                    scope.user = {"id": user_id}
                
                # Add request context
                if request_id:
                    scope.set_tag("request_id", request_id)
                
                if endpoint:
                    scope.set_tag("endpoint", endpoint)
                
                # Add custom context
                if context:
                    for key, value in context.items():
                        scope.set_context(key, value)
                
                # Capture the exception
                sentry_sdk.capture_exception(error)
                
        except Exception as e:
            logger.error("Error sending to Sentry", error=e)
    
    def _check_notification_threshold(self, fingerprint: str):
        """Check if error should trigger a notification."""
        error_info = self.errors[fingerprint]
        
        # Don't spam notifications for the same error
        now = datetime.utcnow()
        notification_history = self.notification_history[fingerprint]
        
        # Remove old notifications (older than 1 hour)
        cutoff_time = now - timedelta(hours=1)
        self.notification_history[fingerprint] = [
            timestamp for timestamp in notification_history
            if timestamp > cutoff_time
        ]
        
        # Notification thresholds based on severity
        thresholds = {
            "critical": 1,    # Notify immediately
            "high": 5,        # Notify after 5 occurrences
            "medium": 10,     # Notify after 10 occurrences
            "low": 50         # Notify after 50 occurrences
        }
        
        threshold = thresholds.get(error_info.severity, 10)
        
        # Check if we should notify
        if (error_info.count >= threshold and 
            len(self.notification_history[fingerprint]) == 0):
            
            self._send_error_notification(error_info)
            self.notification_history[fingerprint].append(now)
    
    def _send_error_notification(self, error_info: ErrorInfo):
        """Send error notification to administrators."""
        logger.critical(
            f"Error notification: {error_info.error_type}",
            error_id=error_info.error_id,
            error_type=error_info.error_type,
            error_message=error_info.error_message,
            severity=error_info.severity,
            error_count=error_info.count,
            notification=True
        )
        
        # Here you could integrate with notification systems like:
        # - Slack
        # - Email
        # - PagerDuty
        # - Microsoft Teams
    
    def get_error_stats(self, hours: int = 24) -> Dict[str, Any]:
        """Get error statistics for the specified time period."""
        now = datetime.utcnow()
        stats = {
            "total_errors": 0,
            "unique_errors": 0,
            "by_severity": defaultdict(int),
            "by_type": defaultdict(int),
            "by_hour": defaultdict(int),
            "top_errors": []
        }
        
        # Analyze recent errors
        cutoff_time = now - timedelta(hours=hours)
        recent_errors = [
            error for error in self.errors.values()
            if error.timestamp >= cutoff_time
        ]
        
        stats["unique_errors"] = len(recent_errors)
        
        for error in recent_errors:
            stats["total_errors"] += error.count
            stats["by_severity"][error.severity] += error.count
            stats["by_type"][error.error_type] += error.count
            
            hour_key = error.timestamp.strftime("%Y-%m-%d %H:00")
            stats["by_hour"][hour_key] += error.count
        
        # Get top errors by frequency
        stats["top_errors"] = sorted(
            [
                {
                    "error_id": error.error_id,
                    "error_type": error.error_type,
                    "error_message": error.error_message[:100],
                    "count": error.count,
                    "severity": error.severity,
                    "last_seen": error.timestamp.isoformat()
                }
                for error in recent_errors
            ],
            key=lambda x: x["count"],
            reverse=True
        )[:10]
        
        return dict(stats)
    
    def get_error_details(self, error_id: str) -> Optional[Dict[str, Any]]:
        """Get detailed information about a specific error."""
        for error in self.errors.values():
            if error.error_id == error_id:
                return {
                    "error_id": error.error_id,
                    "error_type": error.error_type,
                    "error_message": error.error_message,
                    "stack_trace": error.stack_trace,
                    "timestamp": error.timestamp.isoformat(),
                    "user_id": error.user_id,
                    "request_id": error.request_id,
                    "endpoint": error.endpoint,
                    "context": error.context,
                    "severity": error.severity,
                    "count": error.count,
                    "fingerprint": error.fingerprint
                }
        
        return None
    
    def mark_error_resolved(self, error_id: str) -> bool:
        """Mark an error as resolved."""
        for fingerprint, error in self.errors.items():
            if error.error_id == error_id:
                # Remove from active errors
                del self.errors[fingerprint]
                
                logger.info(
                    f"Error marked as resolved: {error_id}",
                    error_id=error_id,
                    error_type=error.error_type
                )
                
                return True
        
        return False


# Custom exception classes for better error tracking
class BusinessLogicError(Exception):
    """Base exception for business logic errors."""
    pass


class OptimizationError(BusinessLogicError):
    """Exception for portfolio optimization errors."""
    pass


class DataValidationError(BusinessLogicError):
    """Exception for data validation errors."""
    pass


class ExternalServiceError(Exception):
    """Exception for external service integration errors."""
    pass


class SecurityException(Exception):
    """Exception for security-related errors."""
    pass


# Global error tracker instance
error_tracker = ErrorTracker()


# Decorators for automatic error tracking
def track_errors(
    severity: Optional[str] = None,
    context_func: Optional[callable] = None,
    reraise: bool = True
):
    """
    Decorator to automatically track errors in functions.
    
    Args:
        severity: Override automatic severity classification
        context_func: Function to extract context from args/kwargs
        reraise: Whether to reraise the exception after tracking
    """
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                # Extract context if function provided
                context = {}
                if context_func:
                    try:
                        context = context_func(*args, **kwargs)
                    except Exception:
                        pass
                
                # Track the error
                error_tracker.track_error(
                    error=e,
                    context=context,
                    severity=severity
                )
                
                if reraise:
                    raise
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                # Extract context if function provided
                context = {}
                if context_func:
                    try:
                        context = context_func(*args, **kwargs)
                    except Exception:
                        pass
                
                # Track the error
                error_tracker.track_error(
                    error=e,
                    context=context,
                    severity=severity
                )
                
                if reraise:
                    raise
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


@contextmanager
def error_context(**context_data):
    """Context manager to add context to errors within a block."""
    original_track_error = error_tracker.track_error
    
    def enhanced_track_error(error, context=None, **kwargs):
        # Merge context data
        merged_context = {**context_data}
        if context:
            merged_context.update(context)
        
        return original_track_error(error, context=merged_context, **kwargs)
    
    # Temporarily replace the track_error method
    error_tracker.track_error = enhanced_track_error
    
    try:
        yield
    finally:
        # Restore original method
        error_tracker.track_error = original_track_error


# Convenience functions
def track_error(
    error: Exception,
    **kwargs
) -> str:
    """Convenience function to track an error."""
    return error_tracker.track_error(error, **kwargs)


def get_error_stats(hours: int = 24) -> Dict[str, Any]:
    """Get error statistics."""
    return error_tracker.get_error_stats(hours)


def get_error_details(error_id: str) -> Optional[Dict[str, Any]]:
    """Get error details by ID."""
    return error_tracker.get_error_details(error_id)