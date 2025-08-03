"""
Security middleware for portfolio optimization system.

Implements comprehensive security measures including rate limiting,
security headers, CORS configuration, and request validation.
"""

import time
import json
import logging
from typing import Dict, List, Optional, Callable
from datetime import datetime, timedelta
from ipaddress import AddressValueError, IPv4Address, IPv6Address
from urllib.parse import urlparse

from fastapi import Request, Response, HTTPException, status
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.types import ASGIApp
from redis import Redis
import user_agents

from app.core.config import settings
from app.security.validators import SecurityValidator

logger = logging.getLogger(__name__)

# Rate limiting configuration
RATE_LIMITS = {
    "auth": {"requests": 5, "window": 300},      # 5 requests per 5 minutes for auth
    "api": {"requests": 100, "window": 60},      # 100 requests per minute for API
    "optimization": {"requests": 10, "window": 60}, # 10 optimizations per minute
    "upload": {"requests": 5, "window": 60},     # 5 uploads per minute
    "export": {"requests": 20, "window": 60},    # 20 exports per minute
}

# Suspicious patterns that trigger additional logging
SUSPICIOUS_PATTERNS = [
    "union select", "drop table", "insert into", "delete from",
    "<script", "javascript:", "vbscript:", "onload=", "onerror=",
    "../", "..\\", "/etc/passwd", "/windows/system32",
    "sleep(", "waitfor delay", "benchmark(",
]

# Known bot user agents (partial list)
BOT_PATTERNS = [
    "bot", "crawler", "spider", "scraper", "curl", "wget",
    "python-requests", "postman", "insomnia"
]


class SecurityHeaders:
    """
    Security headers configuration.
    
    Implements comprehensive security headers following OWASP guidelines
    and modern web security best practices.
    """
    
    @staticmethod
    def get_security_headers(request: Request) -> Dict[str, str]:
        """
        Get security headers for response.
        
        Args:
            request: FastAPI request object
            
        Returns:
            Dictionary of security headers
        """
        # Content Security Policy - strict policy for financial application
        csp_directives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https:",
            "connect-src 'self' https://api.example.com wss://localhost:* ws://localhost:*",
            "media-src 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            "upgrade-insecure-requests"
        ]
        
        headers = {
            # Prevent XSS attacks
            "X-XSS-Protection": "1; mode=block",
            
            # Prevent content type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # Content Security Policy
            "Content-Security-Policy": "; ".join(csp_directives),
            
            # Strict Transport Security (HTTPS only)
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            
            # Referrer Policy
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "camera=(), microphone=(), location=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=()"
            ),
            
            # Prevent caching of sensitive data
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            "Pragma": "no-cache",
            "Expires": "0",
            
            # Server identification
            "Server": "Portfolio-API",
            
            # Cross-Origin policies
            "Cross-Origin-Embedder-Policy": "require-corp",
            "Cross-Origin-Opener-Policy": "same-origin",
            "Cross-Origin-Resource-Policy": "same-origin",
        }
        
        return headers


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Advanced rate limiting middleware with Redis backend.
    
    Implements sliding window rate limiting with different limits
    for different endpoint categories and user types.
    """
    
    def __init__(self, app: ASGIApp, redis_client: Redis):
        super().__init__(app)
        self.redis = redis_client
        self.rate_limit_prefix = "rate_limit:"
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting."""
        
        # Get client identifier (IP address or user ID)
        client_id = self._get_client_identifier(request)
        
        # Determine rate limit category
        category = self._get_rate_limit_category(request.url.path)
        
        # Check rate limit
        if not self._check_rate_limit(client_id, category):
            logger.warning(f"Rate limit exceeded for {client_id} on {category}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": f"Too many requests for {category}",
                    "retry_after": RATE_LIMITS[category]["window"]
                },
                headers={"Retry-After": str(RATE_LIMITS[category]["window"])}
            )
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = self._get_remaining_requests(client_id, category)
        reset_time = self._get_reset_time(client_id, category)
        
        response.headers["X-RateLimit-Limit"] = str(RATE_LIMITS[category]["requests"])
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_time)
        
        return response
    
    def _get_client_identifier(self, request: Request) -> str:
        """
        Get unique client identifier for rate limiting.
        
        Args:
            request: FastAPI request
            
        Returns:
            Client identifier string
        """
        # Try to get user ID from JWT token if authenticated
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            # In real implementation, would decode JWT to get user ID
            # For now, use IP address
            pass
        
        # Get client IP address
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        else:
            client_ip = request.client.host if request.client else "unknown"
        
        # Validate IP address format
        try:
            # Try to parse as IPv4 or IPv6
            IPv4Address(client_ip)
        except AddressValueError:
            try:
                IPv6Address(client_ip)
            except AddressValueError:
                client_ip = "invalid"
        
        return f"ip:{client_ip}"
    
    def _get_rate_limit_category(self, path: str) -> str:
        """
        Determine rate limit category based on request path.
        
        Args:
            path: Request path
            
        Returns:
            Rate limit category
        """
        if path.startswith("/api/v1/auth/"):
            return "auth"
        elif path.startswith("/api/v1/optimize"):
            return "optimization"
        elif "upload" in path or "import" in path:
            return "upload"
        elif "export" in path or "download" in path:
            return "export"
        else:
            return "api"
    
    def _check_rate_limit(self, client_id: str, category: str) -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            client_id: Client identifier
            category: Rate limit category
            
        Returns:
            True if within limit
        """
        key = f"{self.rate_limit_prefix}{category}:{client_id}"
        limit = RATE_LIMITS[category]["requests"]
        window = RATE_LIMITS[category]["window"]
        
        current_time = int(time.time())
        
        try:
            # Use sliding window with Redis sorted sets
            pipe = self.redis.pipeline()
            
            # Remove expired entries
            pipe.zremrangebyscore(key, 0, current_time - window)
            
            # Count current requests
            pipe.zcard(key)
            
            # Add current request
            pipe.zadd(key, {str(current_time): current_time})
            
            # Set expiration
            pipe.expire(key, window)
            
            results = pipe.execute()
            current_requests = results[1]
            
            return current_requests < limit
            
        except Exception as e:
            logger.error(f"Rate limiting error: {e}")
            # Fail open - allow request if Redis is down
            return True
    
    def _get_remaining_requests(self, client_id: str, category: str) -> int:
        """Get remaining requests for client."""
        key = f"{self.rate_limit_prefix}{category}:{client_id}"
        limit = RATE_LIMITS[category]["requests"]
        window = RATE_LIMITS[category]["window"]
        
        try:
            current_time = int(time.time())
            self.redis.zremrangebyscore(key, 0, current_time - window)
            current_requests = self.redis.zcard(key)
            return max(0, limit - current_requests)
        except Exception:
            return limit
    
    def _get_reset_time(self, client_id: str, category: str) -> int:
        """Get rate limit reset time."""
        window = RATE_LIMITS[category]["window"]
        return int(time.time()) + window


class SecurityMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security middleware.
    
    Implements security headers, request validation, suspicious activity
    detection, and comprehensive logging.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.security_headers = SecurityHeaders()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with security measures."""
        
        start_time = time.time()
        
        # Log request details
        await self._log_request(request)
        
        # Validate request
        validation_error = await self._validate_request(request)
        if validation_error:
            return validation_error
        
        # Check for suspicious activity
        if await self._detect_suspicious_activity(request):
            logger.warning(f"Suspicious activity detected from {request.client.host}")
            # Could implement additional actions like temporary blocking
        
        # Process request
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Request processing error: {e}")
            response = JSONResponse(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                content={"error": "Internal server error"}
            )
        
        # Add security headers
        security_headers = self.security_headers.get_security_headers(request)
        for header, value in security_headers.items():
            response.headers[header] = value
        
        # Log response
        processing_time = time.time() - start_time
        await self._log_response(request, response, processing_time)
        
        return response
    
    async def _log_request(self, request: Request) -> None:
        """Log incoming request details."""
        
        # Get client information
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Parse user agent
        ua = user_agents.parse(user_agent)
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "path": str(request.url.path),
            "query_params": dict(request.query_params),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "browser": f"{ua.browser.family} {ua.browser.version_string}",
            "os": f"{ua.os.family} {ua.os.version_string}",
            "is_bot": ua.is_bot,
            "headers": dict(request.headers)
        }
        
        # Remove sensitive headers from logs
        if "authorization" in log_data["headers"]:
            log_data["headers"]["authorization"] = "[REDACTED]"
        
        logger.info(f"Request: {json.dumps(log_data)}")
    
    async def _validate_request(self, request: Request) -> Optional[JSONResponse]:
        """
        Validate request for security issues.
        
        Args:
            request: FastAPI request
            
        Returns:
            Error response if validation fails, None otherwise
        """
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length:
            try:
                size = int(content_length)
                max_size = 10 * 1024 * 1024  # 10MB limit
                if size > max_size:
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={"error": "Request too large"}
                    )
            except ValueError:
                pass
        
        # Validate Content-Type for POST/PUT requests
        if request.method in ["POST", "PUT", "PATCH"]:
            content_type = request.headers.get("content-type", "")
            allowed_types = [
                "application/json",
                "application/x-www-form-urlencoded",
                "multipart/form-data"
            ]
            
            if not any(ct in content_type for ct in allowed_types):
                return JSONResponse(
                    status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
                    content={"error": "Unsupported media type"}
                )
        
        # Check for suspicious URL patterns
        path = str(request.url.path).lower()
        query = str(request.url.query).lower()
        
        for pattern in SUSPICIOUS_PATTERNS:
            if pattern in path or pattern in query:
                logger.warning(f"Suspicious pattern '{pattern}' in request from {request.client.host}")
                return JSONResponse(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    content={"error": "Invalid request"}
                )
        
        return None
    
    async def _detect_suspicious_activity(self, request: Request) -> bool:
        """
        Detect suspicious activity patterns.
        
        Args:
            request: FastAPI request
            
        Returns:
            True if suspicious activity detected
        """
        suspicious_indicators = []
        
        # Check user agent
        user_agent = request.headers.get("user-agent", "").lower()
        
        # Missing or suspicious user agent
        if not user_agent or user_agent in ["", "-", "null"]:
            suspicious_indicators.append("missing_user_agent")
        
        # Bot detection
        for bot_pattern in BOT_PATTERNS:
            if bot_pattern in user_agent:
                suspicious_indicators.append("bot_user_agent")
                break
        
        # Check for automation tools
        automation_tools = ["selenium", "phantomjs", "headless"]
        if any(tool in user_agent for tool in automation_tools):
            suspicious_indicators.append("automation_tool")
        
        # Check request patterns
        if request.method == "GET" and len(str(request.url.query)) > 1000:
            suspicious_indicators.append("long_query_string")
        
        # Check for directory traversal attempts
        path = str(request.url.path)
        if "../" in path or "..\\" in path:
            suspicious_indicators.append("directory_traversal")
        
        # Check for unusual headers
        suspicious_headers = ["x-real-ip", "x-cluster-client-ip", "x-forwarded"]
        for header in request.headers:
            if any(sus_header in header.lower() for sus_header in suspicious_headers):
                # Could indicate proxy/load balancer misconfiguration
                pass
        
        # Log suspicious indicators
        if suspicious_indicators:
            logger.warning(f"Suspicious indicators: {suspicious_indicators} from {request.client.host}")
        
        return len(suspicious_indicators) >= 2  # Threshold for suspicious activity
    
    async def _log_response(
        self, 
        request: Request, 
        response: Response, 
        processing_time: float
    ) -> None:
        """Log response details."""
        
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": request.method,
            "path": str(request.url.path),
            "status_code": response.status_code,
            "processing_time_ms": round(processing_time * 1000, 2),
            "response_size": len(response.body) if hasattr(response, 'body') else 0
        }
        
        # Log level based on status code
        if response.status_code >= 500:
            logger.error(f"Response: {json.dumps(log_data)}")
        elif response.status_code >= 400:
            logger.warning(f"Response: {json.dumps(log_data)}")
        else:
            logger.info(f"Response: {json.dumps(log_data)}")


class CORSConfig:
    """
    CORS configuration for the application.
    
    Implements secure CORS settings for the portfolio optimization
    frontend and any authorized third-party integrations.
    """
    
    @staticmethod
    def get_cors_middleware() -> CORSMiddleware:
        """
        Get configured CORS middleware.
        
        Returns:
            Configured CORS middleware
        """
        # Determine allowed origins based on environment
        if settings.ENVIRONMENT == "development":
            allowed_origins = [
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
                "http://127.0.0.1:3001"
            ]
        elif settings.ENVIRONMENT == "staging":
            allowed_origins = [
                "https://staging.portfolio-dashboard.com",
                "https://staging-api.portfolio-dashboard.com"
            ]
        else:  # production
            allowed_origins = [
                "https://portfolio-dashboard.com",
                "https://www.portfolio-dashboard.com",
                "https://app.portfolio-dashboard.com"
            ]
        
        return CORSMiddleware(
            allow_origins=allowed_origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
            allow_headers=[
                "Accept",
                "Accept-Language",
                "Content-Language",
                "Content-Type",
                "Authorization",
                "X-Requested-With",
                "X-CSRFToken"
            ],
            expose_headers=[
                "X-RateLimit-Limit",
                "X-RateLimit-Remaining", 
                "X-RateLimit-Reset"
            ],
            max_age=86400  # 24 hours
        )


class CSRFProtection:
    """
    CSRF protection for state-changing operations.
    
    Implements CSRF token validation for POST, PUT, DELETE operations
    to prevent cross-site request forgery attacks.
    """
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.token_prefix = "csrf_token:"
        self.token_expiry = 3600  # 1 hour
    
    def generate_csrf_token(self, session_id: str) -> str:
        """
        Generate CSRF token for session.
        
        Args:
            session_id: User session identifier
            
        Returns:
            CSRF token
        """
        import secrets
        
        token = secrets.token_urlsafe(32)
        key = f"{self.token_prefix}{session_id}"
        
        try:
            self.redis.setex(key, self.token_expiry, token)
        except Exception as e:
            logger.error(f"Failed to store CSRF token: {e}")
        
        return token
    
    def validate_csrf_token(self, session_id: str, token: str) -> bool:
        """
        Validate CSRF token.
        
        Args:
            session_id: User session identifier
            token: CSRF token to validate
            
        Returns:
            True if token is valid
        """
        key = f"{self.token_prefix}{session_id}"
        
        try:
            stored_token = self.redis.get(key)
            if stored_token and stored_token.decode() == token:
                # Token is valid - remove it to prevent replay
                self.redis.delete(key)
                return True
        except Exception as e:
            logger.error(f"Failed to validate CSRF token: {e}")
        
        return False


# Middleware setup functions
def setup_security_middleware(app, redis_client: Redis = None):
    """
    Setup all security middleware for the application.
    
    Args:
        app: FastAPI application
        redis_client: Redis client for rate limiting
    """
    # Add CORS middleware first
    cors_middleware = CORSConfig.get_cors_middleware()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=cors_middleware.allow_origins,
        allow_credentials=cors_middleware.allow_credentials,
        allow_methods=cors_middleware.allow_methods,
        allow_headers=cors_middleware.allow_headers,
        expose_headers=cors_middleware.expose_headers,
        max_age=cors_middleware.max_age
    )
    
    # Add rate limiting middleware
    if redis_client:
        app.add_middleware(RateLimitMiddleware, redis_client=redis_client)
    
    # Add general security middleware
    app.add_middleware(SecurityMiddleware)
    
    logger.info("Security middleware configured")