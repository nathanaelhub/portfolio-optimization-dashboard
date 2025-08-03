"""
Application Performance Monitoring (APM) System

This module provides comprehensive APM capabilities including metrics collection,
performance monitoring, alerting, and integration with external monitoring services.
"""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from collections import defaultdict, deque
from contextlib import asynccontextmanager

import psutil
import aiohttp
from prometheus_client import Counter, Histogram, Gauge, generate_latest, CONTENT_TYPE_LATEST

from app.core.config import settings
from app.monitoring.logger import get_logger

logger = get_logger(__name__)


@dataclass
class MetricPoint:
    """A single metric data point."""
    timestamp: datetime
    value: float
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class Alert:
    """Alert configuration and state."""
    name: str
    condition: str
    threshold: float
    severity: str
    enabled: bool = True
    last_triggered: Optional[datetime] = None
    trigger_count: int = 0


class MetricsCollector:
    """
    Collect and manage application metrics.
    
    Features:
    - System metrics (CPU, memory, disk)
    - Application metrics (request count, response time)
    - Custom business metrics
    - Time-series data storage
    - Alert management
    """
    
    def __init__(self):
        # Prometheus metrics
        self.request_count = Counter(
            'http_requests_total',
            'Total HTTP requests',
            ['method', 'endpoint', 'status']
        )
        
        self.request_duration = Histogram(
            'http_request_duration_seconds',
            'HTTP request duration',
            ['method', 'endpoint']
        )
        
        self.database_query_duration = Histogram(
            'database_query_duration_seconds',
            'Database query duration',
            ['query_type']
        )
        
        self.cache_operations = Counter(
            'cache_operations_total',
            'Cache operations',
            ['operation', 'result']
        )
        
        self.optimization_duration = Histogram(
            'portfolio_optimization_duration_seconds',
            'Portfolio optimization duration',
            ['method']
        )
        
        self.active_users = Gauge(
            'active_users_current',
            'Currently active users'
        )
        
        self.system_cpu_usage = Gauge(
            'system_cpu_usage_percent',
            'System CPU usage percentage'
        )
        
        self.system_memory_usage = Gauge(
            'system_memory_usage_percent',
            'System memory usage percentage'
        )
        
        self.system_disk_usage = Gauge(
            'system_disk_usage_percent',
            'System disk usage percentage'
        )
        
        # Custom metrics storage
        self.custom_metrics: Dict[str, deque] = defaultdict(lambda: deque(maxlen=1000))
        
        # Alert configuration
        self.alerts: Dict[str, Alert] = {}
        self.setup_default_alerts()
        
        # Background tasks
        self.monitoring_tasks = []
        self.is_monitoring = False
    
    def setup_default_alerts(self):
        """Set up default system alerts."""
        self.alerts.update({
            "high_cpu_usage": Alert(
                name="High CPU Usage",
                condition="cpu_usage > threshold",
                threshold=80.0,
                severity="warning"
            ),
            "high_memory_usage": Alert(
                name="High Memory Usage", 
                condition="memory_usage > threshold",
                threshold=85.0,
                severity="warning"
            ),
            "slow_response_time": Alert(
                name="Slow Response Time",
                condition="avg_response_time > threshold",
                threshold=2000.0,  # 2 seconds
                severity="critical"
            ),
            "high_error_rate": Alert(
                name="High Error Rate",
                condition="error_rate > threshold",
                threshold=5.0,  # 5%
                severity="critical"
            ),
            "database_connection_issues": Alert(
                name="Database Connection Issues",
                condition="db_connection_errors > threshold",
                threshold=10.0,
                severity="critical"
            )
        })
    
    async def start_monitoring(self):
        """Start background monitoring tasks."""
        if self.is_monitoring:
            return
        
        self.is_monitoring = True
        
        # Start monitoring tasks
        self.monitoring_tasks = [
            asyncio.create_task(self._collect_system_metrics()),
            asyncio.create_task(self._check_alerts()),
            asyncio.create_task(self._cleanup_old_metrics())
        ]
        
        logger.info("APM monitoring started")
    
    async def stop_monitoring(self):
        """Stop background monitoring tasks."""
        self.is_monitoring = False
        
        # Cancel all monitoring tasks
        for task in self.monitoring_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
        
        logger.info("APM monitoring stopped")
    
    async def _collect_system_metrics(self):
        """Collect system-level metrics periodically."""
        while self.is_monitoring:
            try:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                self.system_cpu_usage.set(cpu_percent)
                self.record_custom_metric("system.cpu_usage", cpu_percent)
                
                # Memory usage
                memory = psutil.virtual_memory()
                memory_percent = memory.percent
                self.system_memory_usage.set(memory_percent)
                self.record_custom_metric("system.memory_usage", memory_percent)
                
                # Disk usage
                disk = psutil.disk_usage('/')
                disk_percent = (disk.used / disk.total) * 100
                self.system_disk_usage.set(disk_percent)
                self.record_custom_metric("system.disk_usage", disk_percent)
                
                # Network statistics
                network = psutil.net_io_counters()
                self.record_custom_metric("system.network_bytes_sent", network.bytes_sent)
                self.record_custom_metric("system.network_bytes_recv", network.bytes_recv)
                
                # Process-specific metrics
                process = psutil.Process()
                self.record_custom_metric("process.memory_mb", process.memory_info().rss / 1024 / 1024)
                self.record_custom_metric("process.cpu_percent", process.cpu_percent())
                self.record_custom_metric("process.open_files", len(process.open_files()))
                
            except Exception as e:
                logger.error("Error collecting system metrics", error=e)
            
            await asyncio.sleep(30)  # Collect every 30 seconds
    
    async def _check_alerts(self):
        """Check alert conditions periodically."""
        while self.is_monitoring:
            try:
                for alert_name, alert in self.alerts.items():
                    if not alert.enabled:
                        continue
                    
                    should_trigger = await self._evaluate_alert_condition(alert)
                    
                    if should_trigger:
                        await self._trigger_alert(alert)
                
            except Exception as e:
                logger.error("Error checking alerts", error=e)
            
            await asyncio.sleep(60)  # Check every minute
    
    async def _cleanup_old_metrics(self):
        """Clean up old metric data to prevent memory leaks."""
        while self.is_monitoring:
            try:
                cutoff_time = datetime.utcnow() - timedelta(hours=24)
                
                for metric_name, points in self.custom_metrics.items():
                    # Remove old points (deque automatically limits size)
                    while points and points[0].timestamp < cutoff_time:
                        points.popleft()
                
            except Exception as e:
                logger.error("Error cleaning up metrics", error=e)
            
            await asyncio.sleep(3600)  # Clean up every hour
    
    def record_request(self, method: str, endpoint: str, status_code: int, duration_seconds: float):
        """Record HTTP request metrics."""
        # Prometheus metrics
        self.request_count.labels(
            method=method,
            endpoint=endpoint,
            status=str(status_code)
        ).inc()
        
        self.request_duration.labels(
            method=method,
            endpoint=endpoint
        ).observe(duration_seconds)
        
        # Custom metrics
        self.record_custom_metric("http.requests", 1, {
            "method": method,
            "endpoint": endpoint,
            "status": str(status_code)
        })
        
        self.record_custom_metric("http.response_time_ms", duration_seconds * 1000, {
            "method": method,
            "endpoint": endpoint
        })
    
    def record_database_query(self, query_type: str, duration_seconds: float):
        """Record database query metrics."""
        self.database_query_duration.labels(query_type=query_type).observe(duration_seconds)
        
        self.record_custom_metric("database.query_time_ms", duration_seconds * 1000, {
            "query_type": query_type
        })
    
    def record_cache_operation(self, operation: str, hit: bool):
        """Record cache operation metrics."""
        result = "hit" if hit else "miss"
        self.cache_operations.labels(operation=operation, result=result).inc()
        
        self.record_custom_metric("cache.operations", 1, {
            "operation": operation,
            "result": result
        })
    
    def record_optimization(self, method: str, duration_seconds: float, success: bool):
        """Record portfolio optimization metrics."""
        self.optimization_duration.labels(method=method).observe(duration_seconds)
        
        self.record_custom_metric("optimization.duration_ms", duration_seconds * 1000, {
            "method": method
        })
        
        self.record_custom_metric("optimization.results", 1, {
            "method": method,
            "success": str(success)
        })
    
    def record_custom_metric(self, name: str, value: float, labels: Optional[Dict[str, str]] = None):
        """Record a custom metric value."""
        metric_point = MetricPoint(
            timestamp=datetime.utcnow(),
            value=value,
            labels=labels or {}
        )
        
        self.custom_metrics[name].append(metric_point)
    
    def get_metric_values(
        self, 
        name: str, 
        since: Optional[datetime] = None,
        labels: Optional[Dict[str, str]] = None
    ) -> List[MetricPoint]:
        """Get metric values with optional filtering."""
        if name not in self.custom_metrics:
            return []
        
        points = list(self.custom_metrics[name])
        
        # Filter by time
        if since:
            points = [p for p in points if p.timestamp >= since]
        
        # Filter by labels
        if labels:
            points = [
                p for p in points 
                if all(p.labels.get(k) == v for k, v in labels.items())
            ]
        
        return points
    
    def get_metric_summary(self, name: str, since: Optional[datetime] = None) -> Dict[str, Any]:
        """Get summary statistics for a metric."""
        points = self.get_metric_values(name, since)
        
        if not points:
            return {"count": 0}
        
        values = [p.value for p in points]
        
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "sum": sum(values),
            "first_timestamp": points[0].timestamp.isoformat(),
            "last_timestamp": points[-1].timestamp.isoformat()
        }
    
    async def _evaluate_alert_condition(self, alert: Alert) -> bool:
        """Evaluate if an alert condition is met."""
        try:
            if alert.name == "high_cpu_usage":
                recent_cpu = self.get_metric_values("system.cpu_usage", since=datetime.utcnow() - timedelta(minutes=5))
                if recent_cpu:
                    avg_cpu = sum(p.value for p in recent_cpu) / len(recent_cpu)
                    return avg_cpu > alert.threshold
            
            elif alert.name == "high_memory_usage":
                recent_memory = self.get_metric_values("system.memory_usage", since=datetime.utcnow() - timedelta(minutes=5))
                if recent_memory:
                    avg_memory = sum(p.value for p in recent_memory) / len(recent_memory)
                    return avg_memory > alert.threshold
            
            elif alert.name == "slow_response_time":
                recent_responses = self.get_metric_values("http.response_time_ms", since=datetime.utcnow() - timedelta(minutes=10))
                if recent_responses:
                    avg_response_time = sum(p.value for p in recent_responses) / len(recent_responses)
                    return avg_response_time > alert.threshold
            
            elif alert.name == "high_error_rate":
                recent_requests = self.get_metric_values("http.requests", since=datetime.utcnow() - timedelta(minutes=10))
                if recent_requests:
                    error_requests = [p for p in recent_requests if p.labels.get("status", "").startswith(("4", "5"))]
                    error_rate = (len(error_requests) / len(recent_requests)) * 100
                    return error_rate > alert.threshold
            
            return False
            
        except Exception as e:
            logger.error(f"Error evaluating alert condition for {alert.name}", error=e)
            return False
    
    async def _trigger_alert(self, alert: Alert):
        """Trigger an alert notification."""
        now = datetime.utcnow()
        
        # Avoid spam - don't trigger if recently triggered
        if alert.last_triggered and (now - alert.last_triggered).total_seconds() < 300:  # 5 minutes
            return
        
        alert.last_triggered = now
        alert.trigger_count += 1
        
        logger.warning(
            f"Alert triggered: {alert.name}",
            alert_name=alert.name,
            alert_severity=alert.severity,
            alert_condition=alert.condition,
            alert_threshold=alert.threshold,
            trigger_count=alert.trigger_count
        )
        
        # Send to external systems (Slack, PagerDuty, etc.)
        await self._send_alert_notification(alert)
    
    async def _send_alert_notification(self, alert: Alert):
        """Send alert notification to external systems."""
        try:
            # Example: Send to Slack webhook
            if hasattr(settings, 'SLACK_WEBHOOK_URL') and settings.SLACK_WEBHOOK_URL:
                await self._send_slack_alert(alert)
            
            # Example: Send to PagerDuty
            if hasattr(settings, 'PAGERDUTY_API_KEY') and settings.PAGERDUTY_API_KEY:
                await self._send_pagerduty_alert(alert)
            
        except Exception as e:
            logger.error("Error sending alert notification", error=e)
    
    async def _send_slack_alert(self, alert: Alert):
        """Send alert to Slack."""
        webhook_url = getattr(settings, 'SLACK_WEBHOOK_URL', None)
        if not webhook_url:
            return
        
        color = {
            "warning": "#ff9900",
            "critical": "#ff0000",
            "info": "#0099ff"
        }.get(alert.severity, "#808080")
        
        message = {
            "text": f"🚨 Alert: {alert.name}",
            "attachments": [
                {
                    "color": color,
                    "fields": [
                        {"title": "Severity", "value": alert.severity, "short": True},
                        {"title": "Condition", "value": alert.condition, "short": True},
                        {"title": "Threshold", "value": str(alert.threshold), "short": True},
                        {"title": "Trigger Count", "value": str(alert.trigger_count), "short": True}
                    ],
                    "timestamp": int(alert.last_triggered.timestamp())
                }
            ]
        }
        
        async with aiohttp.ClientSession() as session:
            await session.post(webhook_url, json=message)
    
    async def _send_pagerduty_alert(self, alert: Alert):
        """Send alert to PagerDuty."""
        # Implementation for PagerDuty integration
        pass
    
    def get_prometheus_metrics(self) -> str:
        """Get metrics in Prometheus format."""
        return generate_latest()
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get overall system health summary."""
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        
        # System metrics
        cpu_usage = self.get_metric_summary("system.cpu_usage", last_hour)
        memory_usage = self.get_metric_summary("system.memory_usage", last_hour)
        
        # Application metrics
        request_count = self.get_metric_summary("http.requests", last_hour)
        response_time = self.get_metric_summary("http.response_time_ms", last_hour)
        
        # Alert status
        active_alerts = [
            alert.name for alert in self.alerts.values()
            if alert.last_triggered and (now - alert.last_triggered).total_seconds() < 3600
        ]
        
        return {
            "timestamp": now.isoformat(),
            "status": "healthy" if not active_alerts else "degraded",
            "system": {
                "cpu_usage_avg": cpu_usage.get("avg", 0),
                "memory_usage_avg": memory_usage.get("avg", 0)
            },
            "application": {
                "requests_per_hour": request_count.get("count", 0),
                "avg_response_time_ms": response_time.get("avg", 0)
            },
            "active_alerts": active_alerts,
            "monitoring_status": "running" if self.is_monitoring else "stopped"
        }


class PerformanceProfiler:
    """Profile application performance and identify bottlenecks."""
    
    def __init__(self):
        self.profiles = {}
        self.active_profiles = {}
    
    @asynccontextmanager
    async def profile_operation(self, operation_name: str):
        """Profile a specific operation."""
        start_time = time.time()
        start_memory = psutil.Process().memory_info().rss
        
        try:
            yield
        finally:
            end_time = time.time()
            end_memory = psutil.Process().memory_info().rss
            
            profile_data = {
                "operation": operation_name,
                "duration_seconds": end_time - start_time,
                "memory_delta_mb": (end_memory - start_memory) / 1024 / 1024,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if operation_name not in self.profiles:
                self.profiles[operation_name] = []
            
            self.profiles[operation_name].append(profile_data)
            
            # Keep only last 100 profiles per operation
            if len(self.profiles[operation_name]) > 100:
                self.profiles[operation_name] = self.profiles[operation_name][-100:]
    
    def get_profile_summary(self, operation_name: str) -> Dict[str, Any]:
        """Get performance profile summary for an operation."""
        if operation_name not in self.profiles:
            return {}
        
        profiles = self.profiles[operation_name]
        durations = [p["duration_seconds"] for p in profiles]
        memory_deltas = [p["memory_delta_mb"] for p in profiles]
        
        return {
            "operation": operation_name,
            "call_count": len(profiles),
            "duration": {
                "avg_seconds": sum(durations) / len(durations),
                "min_seconds": min(durations),
                "max_seconds": max(durations)
            },
            "memory": {
                "avg_delta_mb": sum(memory_deltas) / len(memory_deltas),
                "min_delta_mb": min(memory_deltas),
                "max_delta_mb": max(memory_deltas)
            },
            "last_execution": profiles[-1]["timestamp"]
        }


# Global instances
metrics_collector = MetricsCollector()
performance_profiler = PerformanceProfiler()


# Decorator for automatic performance monitoring
def monitor_performance(operation_name: str = None):
    """Decorator to automatically monitor function performance."""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            async with performance_profiler.profile_operation(op_name):
                start_time = time.time()
                try:
                    result = await func(*args, **kwargs)
                    metrics_collector.record_custom_metric(f"function.{op_name}.success", 1)
                    return result
                except Exception as e:
                    metrics_collector.record_custom_metric(f"function.{op_name}.error", 1)
                    raise
                finally:
                    duration = time.time() - start_time
                    metrics_collector.record_custom_metric(f"function.{op_name}.duration_ms", duration * 1000)
        
        def sync_wrapper(*args, **kwargs):
            op_name = operation_name or f"{func.__module__}.{func.__name__}"
            
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                metrics_collector.record_custom_metric(f"function.{op_name}.success", 1)
                return result
            except Exception as e:
                metrics_collector.record_custom_metric(f"function.{op_name}.error", 1)
                raise
            finally:
                duration = time.time() - start_time
                metrics_collector.record_custom_metric(f"function.{op_name}.duration_ms", duration * 1000)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Health check endpoint
async def get_health_status() -> Dict[str, Any]:
    """Get comprehensive health status."""
    return metrics_collector.get_health_summary()