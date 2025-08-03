"""
Monitoring and Analytics API Endpoints

This module provides API endpoints for system monitoring, performance analytics,
error tracking, and health checks.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status, Response
from pydantic import BaseModel, Field

from app.monitoring.apm import metrics_collector, performance_profiler, get_health_status
from app.monitoring.error_tracking import error_tracker, get_error_stats, get_error_details
from app.monitoring.logger import get_all_performance_stats
from app.core.auth import get_current_admin_user, get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/monitoring", tags=["monitoring"])


# Pydantic models
class HealthResponse(BaseModel):
    """Health check response model."""
    status: str
    timestamp: str
    system: Dict[str, Any]
    application: Dict[str, Any]
    active_alerts: List[str]
    monitoring_status: str


class MetricQuery(BaseModel):
    """Query model for metric data."""
    metric_name: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    labels: Optional[Dict[str, str]] = None


class AlertConfiguration(BaseModel):
    """Model for alert configuration."""
    name: str
    condition: str
    threshold: float
    severity: str = Field(..., regex="^(info|warning|critical)$")
    enabled: bool = True


# Health and status endpoints
@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System Health Check",
    description="Get comprehensive system health status including metrics and alerts"
)
async def health_check():
    """Get system health status."""
    try:
        health_data = await get_health_status()
        return HealthResponse(**health_data)
    except Exception as e:
        logger.error("Health check failed", error=e)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Health check failed: {str(e)}"
        )


@router.get(
    "/metrics/prometheus",
    summary="Prometheus Metrics",
    description="Get metrics in Prometheus format for scraping",
    response_class=Response
)
async def get_prometheus_metrics():
    """Get metrics in Prometheus format."""
    try:
        metrics_data = metrics_collector.get_prometheus_metrics()
        return Response(
            content=metrics_data,
            media_type="text/plain; version=0.0.4; charset=utf-8"
        )
    except Exception as e:
        logger.error("Error getting Prometheus metrics", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get metrics: {str(e)}"
        )


# Performance monitoring endpoints
@router.get(
    "/performance/summary",
    summary="Performance Summary",
    description="Get overall system performance summary",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_performance_summary():
    """Get performance summary statistics."""
    try:
        # Get logger performance stats
        logger_stats = get_all_performance_stats()
        
        # Get profiler stats
        profiler_stats = {}
        for operation in performance_profiler.profiles:
            profiler_stats[operation] = performance_profiler.get_profile_summary(operation)
        
        # Get recent metrics
        now = datetime.utcnow()
        last_hour = now - timedelta(hours=1)
        
        request_metrics = metrics_collector.get_metric_summary("http.requests", last_hour)
        response_time_metrics = metrics_collector.get_metric_summary("http.response_time_ms", last_hour)
        optimization_metrics = metrics_collector.get_metric_summary("optimization.duration_ms", last_hour)
        
        return {
            "timestamp": now.isoformat(),
            "logger_performance": logger_stats,
            "profiler_performance": profiler_stats,
            "application_metrics": {
                "requests": request_metrics,
                "response_times": response_time_metrics,
                "optimizations": optimization_metrics
            }
        }
        
    except Exception as e:
        logger.error("Error getting performance summary", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get performance summary: {str(e)}"
        )


@router.post(
    "/metrics/query",
    summary="Query Metrics",
    description="Query specific metrics with filters",
    dependencies=[Depends(get_current_admin_user)]
)
async def query_metrics(query: MetricQuery):
    """Query specific metrics with time range and label filters."""
    try:
        start_time = query.start_time or (datetime.utcnow() - timedelta(hours=1))
        end_time = query.end_time or datetime.utcnow()
        
        metric_values = metrics_collector.get_metric_values(
            query.metric_name,
            since=start_time,
            labels=query.labels
        )
        
        # Convert to API response format
        data_points = [
            {
                "timestamp": point.timestamp.isoformat(),
                "value": point.value,
                "labels": point.labels
            }
            for point in metric_values
            if start_time <= point.timestamp <= end_time
        ]
        
        return {
            "metric_name": query.metric_name,
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "data_points": data_points,
            "count": len(data_points)
        }
        
    except Exception as e:
        logger.error(f"Error querying metrics for {query.metric_name}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to query metrics: {str(e)}"
        )


@router.get(
    "/performance/operations",
    summary="Operation Performance",
    description="Get performance statistics for all tracked operations",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_operation_performance():
    """Get performance statistics for all operations."""
    try:
        operations = {}
        
        # Get all available operations from profiler
        for operation_name in performance_profiler.profiles:
            operations[operation_name] = performance_profiler.get_profile_summary(operation_name)
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "operations": operations,
            "total_operations_tracked": len(operations)
        }
        
    except Exception as e:
        logger.error("Error getting operation performance", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get operation performance: {str(e)}"
        )


# Error tracking endpoints
@router.get(
    "/errors/stats",
    summary="Error Statistics",
    description="Get error statistics and trends",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_error_statistics(
    hours: int = Query(24, description="Number of hours to analyze", ge=1, le=168)
):
    """Get error statistics for the specified time period."""
    try:
        stats = get_error_stats(hours)
        
        return {
            "period_hours": hours,
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error getting error statistics", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get error statistics: {str(e)}"
        )


@router.get(
    "/errors/{error_id}",
    summary="Error Details",
    description="Get detailed information about a specific error",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_error_detail(error_id: str):
    """Get detailed information about a specific error."""
    try:
        error_details = get_error_details(error_id)
        
        if not error_details:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Error with ID '{error_id}' not found"
            )
        
        return error_details
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting error details for {error_id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get error details: {str(e)}"
        )


@router.put(
    "/errors/{error_id}/resolve",
    summary="Mark Error as Resolved",
    description="Mark a specific error as resolved",
    dependencies=[Depends(get_current_admin_user)]
)
async def resolve_error(error_id: str):
    """Mark an error as resolved."""
    try:
        success = error_tracker.mark_error_resolved(error_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Error with ID '{error_id}' not found"
            )
        
        return {
            "message": f"Error {error_id} marked as resolved",
            "error_id": error_id,
            "resolved_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resolving error {error_id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to resolve error: {str(e)}"
        )


# Alert management endpoints
@router.get(
    "/alerts",
    summary="Get Alerts",
    description="Get all configured alerts",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_alerts():
    """Get all configured alerts."""
    try:
        alerts = []
        
        for alert_name, alert in metrics_collector.alerts.items():
            alerts.append({
                "name": alert.name,
                "condition": alert.condition,
                "threshold": alert.threshold,
                "severity": alert.severity,
                "enabled": alert.enabled,
                "last_triggered": alert.last_triggered.isoformat() if alert.last_triggered else None,
                "trigger_count": alert.trigger_count
            })
        
        return {
            "alerts": alerts,
            "total_alerts": len(alerts),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error getting alerts", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get alerts: {str(e)}"
        )


@router.post(
    "/alerts",
    summary="Create Alert",
    description="Create a new alert configuration",
    dependencies=[Depends(get_current_admin_user)]
)
async def create_alert(alert_config: AlertConfiguration):
    """Create a new alert configuration."""
    try:
        from app.monitoring.apm import Alert
        
        # Check if alert already exists
        if alert_config.name in metrics_collector.alerts:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Alert '{alert_config.name}' already exists"
            )
        
        # Create new alert
        new_alert = Alert(
            name=alert_config.name,
            condition=alert_config.condition,
            threshold=alert_config.threshold,
            severity=alert_config.severity,
            enabled=alert_config.enabled
        )
        
        metrics_collector.alerts[alert_config.name] = new_alert
        
        return {
            "message": f"Alert '{alert_config.name}' created successfully",
            "alert": {
                "name": new_alert.name,
                "condition": new_alert.condition,
                "threshold": new_alert.threshold,
                "severity": new_alert.severity,
                "enabled": new_alert.enabled
            },
            "created_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating alert {alert_config.name}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create alert: {str(e)}"
        )


@router.put(
    "/alerts/{alert_name}/toggle",
    summary="Toggle Alert",
    description="Enable or disable an alert",
    dependencies=[Depends(get_current_admin_user)]
)
async def toggle_alert(alert_name: str, enabled: bool = Query(..., description="Enable or disable the alert")):
    """Enable or disable an alert."""
    try:
        if alert_name not in metrics_collector.alerts:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Alert '{alert_name}' not found"
            )
        
        alert = metrics_collector.alerts[alert_name]
        old_status = alert.enabled
        alert.enabled = enabled
        
        return {
            "message": f"Alert '{alert_name}' {'enabled' if enabled else 'disabled'}",
            "alert_name": alert_name,
            "old_status": old_status,
            "new_status": enabled,
            "updated_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error toggling alert {alert_name}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to toggle alert: {str(e)}"
        )


# System monitoring endpoints
@router.get(
    "/system/resources",
    summary="System Resources",
    description="Get current system resource usage",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_system_resources():
    """Get current system resource usage."""
    try:
        import psutil
        
        # CPU information
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory information
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk information
        disk = psutil.disk_usage('/')
        disk_io = psutil.disk_io_counters()
        
        # Network information
        network = psutil.net_io_counters()
        
        # Process information
        process = psutil.Process()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": {
                "percent": cpu_percent,
                "count": cpu_count,
                "frequency_mhz": cpu_freq.current if cpu_freq else None
            },
            "memory": {
                "total_gb": round(memory.total / 1024**3, 2),
                "available_gb": round(memory.available / 1024**3, 2),
                "used_gb": round(memory.used / 1024**3, 2),
                "percent": memory.percent
            },
            "swap": {
                "total_gb": round(swap.total / 1024**3, 2),
                "used_gb": round(swap.used / 1024**3, 2),
                "percent": swap.percent
            },
            "disk": {
                "total_gb": round(disk.total / 1024**3, 2),
                "used_gb": round(disk.used / 1024**3, 2),
                "free_gb": round(disk.free / 1024**3, 2),
                "percent": round((disk.used / disk.total) * 100, 1)
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            },
            "process": {
                "memory_mb": round(process.memory_info().rss / 1024**2, 2),
                "cpu_percent": process.cpu_percent(),
                "open_files": len(process.open_files()),
                "connections": len(process.connections())
            }
        }
        
    except Exception as e:
        logger.error("Error getting system resources", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system resources: {str(e)}"
        )


# User activity monitoring (available to regular users for their own data)
@router.get(
    "/activity/user",
    summary="User Activity",
    description="Get current user's activity metrics"
)
async def get_user_activity(current_user = Depends(get_current_user)):
    """Get activity metrics for the current user."""
    try:
        user_id = current_user.id
        
        # Get user-specific metrics from the last 24 hours
        last_24h = datetime.utcnow() - timedelta(hours=24)
        
        # This would typically query your database for user activity
        # For now, we'll return sample data
        activity_data = {
            "user_id": user_id,
            "timestamp": datetime.utcnow().isoformat(),
            "last_24_hours": {
                "login_count": 3,
                "portfolios_created": 1,
                "optimizations_run": 5,
                "api_requests": 47,
                "time_spent_minutes": 125
            },
            "session_info": {
                "current_session_duration_minutes": 32,
                "last_activity": datetime.utcnow().isoformat()
            }
        }
        
        return activity_data
        
    except Exception as e:
        logger.error(f"Error getting user activity for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get user activity: {str(e)}"
        )


# Monitoring control endpoints
@router.post(
    "/control/start",
    summary="Start Monitoring",
    description="Start background monitoring processes",
    dependencies=[Depends(get_current_admin_user)]
)
async def start_monitoring():
    """Start background monitoring processes."""
    try:
        await metrics_collector.start_monitoring()
        
        return {
            "message": "Monitoring started successfully",
            "status": "running",
            "started_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error starting monitoring", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start monitoring: {str(e)}"
        )


@router.post(
    "/control/stop",
    summary="Stop Monitoring",
    description="Stop background monitoring processes",
    dependencies=[Depends(get_current_admin_user)]
)
async def stop_monitoring():
    """Stop background monitoring processes."""
    try:
        await metrics_collector.stop_monitoring()
        
        return {
            "message": "Monitoring stopped successfully",
            "status": "stopped",
            "stopped_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error("Error stopping monitoring", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to stop monitoring: {str(e)}"
        )


@router.get(
    "/control/status",
    summary="Monitoring Status",
    description="Get current monitoring system status",
    dependencies=[Depends(get_current_admin_user)]
)
async def get_monitoring_status():
    """Get current monitoring system status."""
    try:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "monitoring_active": metrics_collector.is_monitoring,
            "active_tasks": len(metrics_collector.monitoring_tasks),
            "alerts_configured": len(metrics_collector.alerts),
            "active_alerts": len([
                alert for alert in metrics_collector.alerts.values()
                if alert.last_triggered and 
                (datetime.utcnow() - alert.last_triggered).total_seconds() < 3600
            ]),
            "metrics_collected": len(metrics_collector.custom_metrics),
            "errors_tracked": len(error_tracker.errors)
        }
        
    except Exception as e:
        logger.error("Error getting monitoring status", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get monitoring status: {str(e)}"
        )