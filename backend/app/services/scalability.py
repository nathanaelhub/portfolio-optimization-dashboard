"""
Scalability Services and Architecture Components

This module provides services and utilities for handling scalability concerns
including load balancing, service discovery, and distributed system coordination.
"""

import asyncio
import hashlib
import json
import socket
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum

import aiohttp
from pydantic import BaseModel

from app.core.config import settings
from app.monitoring.logger import get_logger
from app.database.cache import cache_manager

logger = get_logger(__name__)


class ServiceStatus(Enum):
    """Service health status enumeration."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class ServiceInstance:
    """Represents a service instance in the system."""
    service_id: str
    host: str
    port: int
    status: ServiceStatus = ServiceStatus.UNKNOWN
    last_heartbeat: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    load_score: float = 0.0
    version: str = "unknown"


class ServiceRegistry:
    """
    Service registry for managing service instances and health.
    
    Provides service discovery, health monitoring, and load balancing
    capabilities for distributed systems.
    """
    
    def __init__(self):
        self.services: Dict[str, List[ServiceInstance]] = {}
        self.health_check_interval = 30  # seconds
        self.heartbeat_timeout = 90  # seconds
        self.monitoring_task = None
        self.instance_id = self._generate_instance_id()
    
    def _generate_instance_id(self) -> str:
        """Generate unique instance ID."""
        hostname = socket.gethostname()
        timestamp = int(time.time())
        return f"{hostname}-{timestamp}"
    
    async def register_service(
        self,
        service_name: str,
        host: str,
        port: int,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Register a service instance.
        
        Args:
            service_name: Name of the service
            host: Host address
            port: Port number
            metadata: Additional service metadata
            
        Returns:
            Service instance ID
        """
        service_id = f"{service_name}-{self.instance_id}"
        
        instance = ServiceInstance(
            service_id=service_id,
            host=host,
            port=port,
            status=ServiceStatus.HEALTHY,
            last_heartbeat=datetime.utcnow(),
            metadata=metadata or {},
            version=getattr(settings, 'APP_VERSION', 'unknown')
        )
        
        if service_name not in self.services:
            self.services[service_name] = []
        
        # Remove existing instance with same ID
        self.services[service_name] = [
            s for s in self.services[service_name] 
            if s.service_id != service_id
        ]
        
        self.services[service_name].append(instance)
        
        logger.info(
            f"Service registered: {service_name}",
            service_id=service_id,
            host=host,
            port=port,
            metadata=metadata
        )
        
        # Start health monitoring if not already running
        if not self.monitoring_task:
            self.monitoring_task = asyncio.create_task(self._health_monitor())
        
        return service_id
    
    async def deregister_service(self, service_name: str, service_id: str) -> bool:
        """
        Deregister a service instance.
        
        Args:
            service_name: Name of the service
            service_id: Service instance ID
            
        Returns:
            True if deregistered successfully
        """
        if service_name not in self.services:
            return False
        
        original_count = len(self.services[service_name])
        self.services[service_name] = [
            s for s in self.services[service_name] 
            if s.service_id != service_id
        ]
        
        deregistered = len(self.services[service_name]) < original_count
        
        if deregistered:
            logger.info(
                f"Service deregistered: {service_name}",
                service_id=service_id
            )
        
        return deregistered
    
    async def heartbeat(self, service_name: str, service_id: str, load_score: Optional[float] = None) -> bool:
        """
        Send heartbeat for a service instance.
        
        Args:
            service_name: Name of the service
            service_id: Service instance ID
            load_score: Current load score (0.0 to 1.0)
            
        Returns:
            True if heartbeat was accepted
        """
        if service_name not in self.services:
            return False
        
        for instance in self.services[service_name]:
            if instance.service_id == service_id:
                instance.last_heartbeat = datetime.utcnow()
                instance.status = ServiceStatus.HEALTHY
                
                if load_score is not None:
                    instance.load_score = max(0.0, min(1.0, load_score))
                
                return True
        
        return False
    
    def get_healthy_instances(self, service_name: str) -> List[ServiceInstance]:
        """Get all healthy instances of a service."""
        if service_name not in self.services:
            return []
        
        return [
            instance for instance in self.services[service_name]
            if instance.status == ServiceStatus.HEALTHY
        ]
    
    def select_instance(
        self, 
        service_name: str, 
        strategy: str = "round_robin",
        exclude_ids: Optional[List[str]] = None
    ) -> Optional[ServiceInstance]:
        """
        Select a service instance using the specified strategy.
        
        Args:
            service_name: Name of the service
            strategy: Selection strategy (round_robin, least_loaded, random)
            exclude_ids: Instance IDs to exclude from selection
            
        Returns:
            Selected service instance or None
        """
        healthy_instances = self.get_healthy_instances(service_name)
        
        if not healthy_instances:
            return None
        
        # Filter out excluded instances
        if exclude_ids:
            healthy_instances = [
                instance for instance in healthy_instances
                if instance.service_id not in exclude_ids
            ]
        
        if not healthy_instances:
            return None
        
        if strategy == "round_robin":
            return self._round_robin_selection(service_name, healthy_instances)
        elif strategy == "least_loaded":
            return min(healthy_instances, key=lambda x: x.load_score)
        elif strategy == "random":
            import random
            return random.choice(healthy_instances)
        else:
            # Default to round robin
            return self._round_robin_selection(service_name, healthy_instances)
    
    def _round_robin_selection(self, service_name: str, instances: List[ServiceInstance]) -> ServiceInstance:
        """Round robin instance selection."""
        cache_key = f"round_robin_counter:{service_name}"
        counter = cache_manager.get(cache_key) or 0
        
        selected_instance = instances[counter % len(instances)]
        
        # Update counter
        cache_manager.set(cache_key, (counter + 1) % len(instances), ttl=3600)
        
        return selected_instance
    
    async def _health_monitor(self):
        """Background task to monitor service health."""
        while True:
            try:
                await self._check_service_health()
                await asyncio.sleep(self.health_check_interval)
            except Exception as e:
                logger.error("Error in health monitor", error=e)
                await asyncio.sleep(self.health_check_interval)
    
    async def _check_service_health(self):
        """Check health of all registered services."""
        cutoff_time = datetime.utcnow() - timedelta(seconds=self.heartbeat_timeout)
        
        for service_name, instances in self.services.items():
            for instance in instances:
                if instance.last_heartbeat and instance.last_heartbeat < cutoff_time:
                    old_status = instance.status
                    instance.status = ServiceStatus.UNHEALTHY
                    
                    if old_status != ServiceStatus.UNHEALTHY:
                        logger.warning(
                            f"Service instance marked unhealthy: {service_name}",
                            service_id=instance.service_id,
                            last_heartbeat=instance.last_heartbeat.isoformat()
                        )
                
                # Perform active health check
                if instance.status != ServiceStatus.UNHEALTHY:
                    is_healthy = await self._active_health_check(instance)
                    if not is_healthy and instance.status == ServiceStatus.HEALTHY:
                        instance.status = ServiceStatus.DEGRADED
                        logger.warning(
                            f"Service instance degraded: {service_name}",
                            service_id=instance.service_id
                        )
    
    async def _active_health_check(self, instance: ServiceInstance) -> bool:
        """Perform active health check on service instance."""
        try:
            health_url = f"http://{instance.host}:{instance.port}/health"
            
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
                async with session.get(health_url) as response:
                    return response.status == 200
                    
        except Exception:
            return False
    
    def get_service_stats(self) -> Dict[str, Any]:
        """Get statistics about registered services."""
        stats = {}
        
        for service_name, instances in self.services.items():
            status_counts = {}
            for status in ServiceStatus:
                status_counts[status.value] = len([
                    i for i in instances if i.status == status
                ])
            
            avg_load = sum(i.load_score for i in instances) / len(instances) if instances else 0
            
            stats[service_name] = {
                "total_instances": len(instances),
                "status_distribution": status_counts,
                "average_load": avg_load,
                "healthy_instances": status_counts[ServiceStatus.HEALTHY.value]
            }
        
        return stats


class LoadBalancer:
    """
    Application-level load balancer for distributing requests.
    
    Provides various load balancing strategies and request routing
    capabilities with health awareness.
    """
    
    def __init__(self, service_registry: ServiceRegistry):
        self.service_registry = service_registry
        self.request_counts: Dict[str, int] = {}
        self.response_times: Dict[str, List[float]] = {}
    
    async def route_request(
        self,
        service_name: str,
        request_data: Dict[str, Any],
        strategy: str = "least_loaded",
        max_retries: int = 3
    ) -> Tuple[Any, str]:
        """
        Route a request to a healthy service instance.
        
        Args:
            service_name: Target service name
            request_data: Request payload
            strategy: Load balancing strategy
            max_retries: Maximum retry attempts
            
        Returns:
            Tuple of (response_data, instance_id)
        """
        exclude_ids = []
        
        for attempt in range(max_retries + 1):
            # Select instance
            instance = self.service_registry.select_instance(
                service_name, 
                strategy=strategy,
                exclude_ids=exclude_ids
            )
            
            if not instance:
                raise Exception(f"No healthy instances available for service: {service_name}")
            
            try:
                # Make request
                start_time = time.time()
                response = await self._make_request(instance, request_data)
                response_time = time.time() - start_time
                
                # Track metrics
                self._track_request_metrics(instance.service_id, response_time, success=True)
                
                return response, instance.service_id
                
            except Exception as e:
                response_time = time.time() - start_time
                self._track_request_metrics(instance.service_id, response_time, success=False)
                
                # Mark instance as degraded and exclude from next attempts
                if instance.status == ServiceStatus.HEALTHY:
                    instance.status = ServiceStatus.DEGRADED
                
                exclude_ids.append(instance.service_id)
                
                logger.warning(
                    f"Request failed to {service_name}",
                    service_id=instance.service_id,
                    attempt=attempt + 1,
                    error=str(e)
                )
                
                if attempt == max_retries:
                    raise Exception(f"All retry attempts failed for service: {service_name}")
        
        raise Exception(f"Failed to route request to service: {service_name}")
    
    async def _make_request(self, instance: ServiceInstance, request_data: Dict[str, Any]) -> Any:
        """Make HTTP request to service instance."""
        url = f"http://{instance.host}:{instance.port}/api/process"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=request_data) as response:
                if response.status >= 400:
                    raise Exception(f"HTTP {response.status}: {await response.text()}")
                
                return await response.json()
    
    def _track_request_metrics(self, instance_id: str, response_time: float, success: bool):
        """Track request metrics for load balancing decisions."""
        # Update request count
        self.request_counts[instance_id] = self.request_counts.get(instance_id, 0) + 1
        
        # Track response times
        if instance_id not in self.response_times:
            self.response_times[instance_id] = []
        
        self.response_times[instance_id].append(response_time)
        
        # Keep only last 100 response times
        if len(self.response_times[instance_id]) > 100:
            self.response_times[instance_id] = self.response_times[instance_id][-100:]
    
    def get_instance_metrics(self, instance_id: str) -> Dict[str, Any]:
        """Get performance metrics for a service instance."""
        request_count = self.request_counts.get(instance_id, 0)
        response_times = self.response_times.get(instance_id, [])
        
        if not response_times:
            return {
                "request_count": request_count,
                "avg_response_time": 0,
                "min_response_time": 0,
                "max_response_time": 0
            }
        
        return {
            "request_count": request_count,
            "avg_response_time": sum(response_times) / len(response_times),
            "min_response_time": min(response_times),
            "max_response_time": max(response_times),
            "p95_response_time": sorted(response_times)[int(len(response_times) * 0.95)]
        }


class CircuitBreaker:
    """
    Circuit breaker pattern implementation for preventing cascade failures.
    
    Protects against failures in distributed systems by monitoring
    failure rates and temporarily stopping requests to failing services.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.failure_counts: Dict[str, int] = {}
        self.success_counts: Dict[str, int] = {}
        self.last_failure_times: Dict[str, datetime] = {}
        self.states: Dict[str, str] = {}  # CLOSED, OPEN, HALF_OPEN
    
    def get_state(self, service_name: str) -> str:
        """Get current circuit breaker state for a service."""
        if service_name not in self.states:
            self.states[service_name] = "CLOSED"
        
        # Check if we should transition from OPEN to HALF_OPEN
        if (self.states[service_name] == "OPEN" and 
            service_name in self.last_failure_times):
            
            time_since_failure = datetime.utcnow() - self.last_failure_times[service_name]
            if time_since_failure.total_seconds() >= self.recovery_timeout:
                self.states[service_name] = "HALF_OPEN"
                self.success_counts[service_name] = 0
                logger.info(f"Circuit breaker HALF_OPEN: {service_name}")
        
        return self.states[service_name]
    
    def record_success(self, service_name: str):
        """Record successful request."""
        state = self.get_state(service_name)
        
        if state == "HALF_OPEN":
            self.success_counts[service_name] = self.success_counts.get(service_name, 0) + 1
            
            if self.success_counts[service_name] >= self.success_threshold:
                self.states[service_name] = "CLOSED"
                self.failure_counts[service_name] = 0
                logger.info(f"Circuit breaker CLOSED: {service_name}")
        
        elif state == "CLOSED":
            # Reset failure count on success
            self.failure_counts[service_name] = 0
    
    def record_failure(self, service_name: str):
        """Record failed request."""
        state = self.get_state(service_name)
        
        if state in ["CLOSED", "HALF_OPEN"]:
            self.failure_counts[service_name] = self.failure_counts.get(service_name, 0) + 1
            self.last_failure_times[service_name] = datetime.utcnow()
            
            if self.failure_counts[service_name] >= self.failure_threshold:
                self.states[service_name] = "OPEN"
                logger.warning(f"Circuit breaker OPEN: {service_name}")
    
    def can_execute(self, service_name: str) -> bool:
        """Check if requests can be executed for a service."""
        state = self.get_state(service_name)
        return state != "OPEN"
    
    def get_stats(self) -> Dict[str, Dict[str, Any]]:
        """Get circuit breaker statistics."""
        stats = {}
        
        for service_name in set(list(self.states.keys()) + list(self.failure_counts.keys())):
            stats[service_name] = {
                "state": self.get_state(service_name),
                "failure_count": self.failure_counts.get(service_name, 0),
                "success_count": self.success_counts.get(service_name, 0),
                "last_failure": (
                    self.last_failure_times[service_name].isoformat()
                    if service_name in self.last_failure_times
                    else None
                )
            }
        
        return stats


class DistributedTaskCoordinator:
    """
    Coordinator for distributed task execution and job scheduling.
    
    Manages task distribution across multiple worker instances
    with load balancing and fault tolerance.
    """
    
    def __init__(self, service_registry: ServiceRegistry):
        self.service_registry = service_registry
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.active_tasks: Dict[str, Dict[str, Any]] = {}
        self.completed_tasks: Dict[str, Dict[str, Any]] = {}
        self.coordinator_task = None
    
    async def start_coordinator(self):
        """Start the task coordinator."""
        if not self.coordinator_task:
            self.coordinator_task = asyncio.create_task(self._coordinate_tasks())
            logger.info("Distributed task coordinator started")
    
    async def stop_coordinator(self):
        """Stop the task coordinator."""
        if self.coordinator_task:
            self.coordinator_task.cancel()
            try:
                await self.coordinator_task
            except asyncio.CancelledError:
                pass
            logger.info("Distributed task coordinator stopped")
    
    async def submit_task(
        self,
        task_id: str,
        task_type: str,
        task_data: Dict[str, Any],
        priority: int = 5
    ) -> str:
        """
        Submit a task for distributed execution.
        
        Args:
            task_id: Unique task identifier
            task_type: Type of task to execute
            task_data: Task payload data
            priority: Task priority (1-10, higher is more important)
            
        Returns:
            Task ID
        """
        task = {
            "task_id": task_id,
            "task_type": task_type,
            "task_data": task_data,
            "priority": priority,
            "submitted_at": datetime.utcnow(),
            "status": "queued"
        }
        
        await self.task_queue.put(task)
        
        logger.info(
            f"Task submitted: {task_type}",
            task_id=task_id,
            priority=priority
        )
        
        return task_id
    
    async def _coordinate_tasks(self):
        """Main coordination loop."""
        while True:
            try:
                # Get next task from queue
                task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                
                # Find available worker
                worker_instance = self.service_registry.select_instance(
                    "optimization_worker",
                    strategy="least_loaded"
                )
                
                if worker_instance:
                    # Assign task to worker
                    await self._assign_task(task, worker_instance)
                else:
                    # No workers available, put task back in queue
                    await self.task_queue.put(task)
                    await asyncio.sleep(5)  # Wait before retrying
                
            except asyncio.TimeoutError:
                # No tasks in queue, continue
                continue
            except Exception as e:
                logger.error("Error in task coordination", error=e)
                await asyncio.sleep(5)
    
    async def _assign_task(self, task: Dict[str, Any], worker_instance: ServiceInstance):
        """Assign task to a worker instance."""
        task_id = task["task_id"]
        
        try:
            # Update task status
            task["status"] = "assigned"
            task["assigned_at"] = datetime.utcnow()
            task["worker_id"] = worker_instance.service_id
            
            self.active_tasks[task_id] = task
            
            # Send task to worker
            await self._send_task_to_worker(task, worker_instance)
            
            logger.info(
                f"Task assigned: {task['task_type']}",
                task_id=task_id,
                worker_id=worker_instance.service_id
            )
            
        except Exception as e:
            logger.error(
                f"Failed to assign task: {task_id}",
                error=e,
                worker_id=worker_instance.service_id
            )
            
            # Put task back in queue for retry
            task["status"] = "queued"
            await self.task_queue.put(task)
    
    async def _send_task_to_worker(self, task: Dict[str, Any], worker_instance: ServiceInstance):
        """Send task to worker instance."""
        url = f"http://{worker_instance.host}:{worker_instance.port}/tasks/execute"
        
        async with aiohttp.ClientSession() as session:
            async with session.post(url, json=task) as response:
                if response.status >= 400:
                    raise Exception(f"Worker returned HTTP {response.status}")
                
                # Task successfully sent
                task["status"] = "running"
                task["started_at"] = datetime.utcnow()
    
    def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a specific task."""
        if task_id in self.active_tasks:
            return self.active_tasks[task_id]
        elif task_id in self.completed_tasks:
            return self.completed_tasks[task_id]
        else:
            return None
    
    def get_coordinator_stats(self) -> Dict[str, Any]:
        """Get coordinator statistics."""
        return {
            "queued_tasks": self.task_queue.qsize(),
            "active_tasks": len(self.active_tasks),
            "completed_tasks": len(self.completed_tasks),
            "coordinator_running": self.coordinator_task is not None and not self.coordinator_task.done()
        }


# Global instances
service_registry = ServiceRegistry()
load_balancer = LoadBalancer(service_registry)
circuit_breaker = CircuitBreaker()
task_coordinator = DistributedTaskCoordinator(service_registry)


# Utility functions for easy integration
async def register_current_service():
    """Register the current service instance."""
    host = getattr(settings, 'HOST', '0.0.0.0')
    port = getattr(settings, 'PORT', 8000)
    service_name = getattr(settings, 'SERVICE_NAME', 'portfolio-backend')
    
    metadata = {
        "version": getattr(settings, 'APP_VERSION', 'unknown'),
        "environment": getattr(settings, 'ENVIRONMENT', 'development'),
        "instance_id": service_registry.instance_id
    }
    
    service_id = await service_registry.register_service(
        service_name, host, port, metadata
    )
    
    return service_id


async def send_heartbeat(service_name: str, service_id: str, load_score: float = 0.0):
    """Send heartbeat for the current service."""
    return await service_registry.heartbeat(service_name, service_id, load_score)


def get_scalability_stats() -> Dict[str, Any]:
    """Get comprehensive scalability statistics."""
    return {
        "service_registry": service_registry.get_service_stats(),
        "circuit_breaker": circuit_breaker.get_stats(),
        "task_coordinator": task_coordinator.get_coordinator_stats(),
        "timestamp": datetime.utcnow().isoformat()
    }