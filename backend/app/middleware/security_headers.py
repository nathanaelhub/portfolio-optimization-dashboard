"""
Security Headers Middleware

This module implements comprehensive security headers middleware to protect
against various web vulnerabilities and ensure compliance with security best practices.
"""

import re
from typing import Dict, List, Optional, Set
from urllib.parse import urlparse

from fastapi import Request, Response
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.config import settings
from app.monitoring.logger import get_logger

logger = get_logger(__name__)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Comprehensive security headers middleware.
    
    Implements security headers to protect against:
    - Cross-Site Scripting (XSS)
    - Clickjacking
    - MIME type sniffing
    - Cross-Origin attacks
    - Mixed content attacks
    - And other web vulnerabilities
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        
        # Environment-specific configurations
        self.is_production = getattr(settings, 'ENVIRONMENT', 'development') == 'production'
        self.domain = getattr(settings, 'DOMAIN', 'localhost')
        self.cdn_domains = getattr(settings, 'CDN_DOMAINS', [])
        self.analytics_domains = getattr(settings, 'ANALYTICS_DOMAINS', [])
        
        # Security policy configurations
        self.csp_config = self._build_csp_config()
        self.hsts_config = self._build_hsts_config()
        self.feature_policy_config = self._build_feature_policy_config()
    
    async def dispatch(self, request: Request, call_next):
        """Process request and add security headers to response."""
        
        # Call the next middleware/endpoint
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(request, response)
        
        return response
    
    def _add_security_headers(self, request: Request, response: Response):
        """Add all security headers to the response."""
        
        # Content Security Policy
        if self._should_add_csp(request):
            response.headers["Content-Security-Policy"] = self._get_csp_header(request)
        
        # HTTP Strict Transport Security (HSTS)
        if self.is_production and request.url.scheme == "https":
            response.headers["Strict-Transport-Security"] = self.hsts_config
        
        # X-Content-Type-Options - Prevent MIME type sniffing
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # X-Frame-Options - Prevent clickjacking
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        
        # X-XSS-Protection - Enable XSS filtering (legacy browsers)
        response.headers["X-XSS-Protection"] = "1; mode=block"
        
        # Referrer Policy - Control referrer information
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        # Permissions Policy (formerly Feature Policy)
        response.headers["Permissions-Policy"] = self.feature_policy_config
        
        # Cross-Origin Policies
        response.headers["Cross-Origin-Embedder-Policy"] = "require-corp"
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
        response.headers["Cross-Origin-Resource-Policy"] = "same-site"
        
        # Remove server information
        response.headers.pop("Server", None)
        response.headers.pop("X-Powered-By", None)
        
        # Cache Control for sensitive endpoints
        if self._is_sensitive_endpoint(request):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, private"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # Add custom security headers
        response.headers["X-Portfolio-Security"] = "enabled"
        response.headers["X-Content-Type-Options"] = "nosniff"
        
        # GDPR/Privacy headers
        if self._should_add_privacy_headers(request):
            response.headers["X-Privacy-Policy"] = f"https://{self.domain}/privacy"
            response.headers["X-GDPR-Compliant"] = "true"
    
    def _build_csp_config(self) -> Dict[str, List[str]]:
        """Build Content Security Policy configuration."""
        
        # Base CSP configuration
        csp_config = {
            "default-src": ["'self'"],
            "script-src": [
                "'self'",
                "'unsafe-inline'",  # Required for React development
                "'unsafe-eval'",   # Required for development tools
            ],
            "style-src": [
                "'self'",
                "'unsafe-inline'",  # Required for CSS-in-JS
                "fonts.googleapis.com"
            ],
            "font-src": [
                "'self'",
                "fonts.gstatic.com",
                "data:"
            ],
            "img-src": [
                "'self'",
                "data:",
                "https:",
                "blob:",
                "*.gravatar.com"
            ],
            "connect-src": [
                "'self'",
                f"https://api.{self.domain}",
                f"wss://api.{self.domain}",
                "https://api.github.com",  # For version checks
            ],
            "object-src": ["'none'"],
            "media-src": ["'self'"],
            "frame-src": ["'none'"],
            "child-src": ["'none'"],
            "worker-src": ["'self'", "blob:"],
            "manifest-src": ["'self'"],
            "base-uri": ["'self'"],
            "form-action": ["'self'"],
            "frame-ancestors": ["'none'"],
            "upgrade-insecure-requests": []  # Empty list for boolean directive
        }
        
        # Add CDN domains if configured
        if self.cdn_domains:
            csp_config["script-src"].extend(self.cdn_domains)
            csp_config["style-src"].extend(self.cdn_domains)
            csp_config["font-src"].extend(self.cdn_domains)
            csp_config["img-src"].extend(self.cdn_domains)
        
        # Add analytics domains if configured
        if self.analytics_domains:
            csp_config["script-src"].extend(self.analytics_domains)
            csp_config["connect-src"].extend(self.analytics_domains)
        
        # Production-specific restrictions
        if self.is_production:
            # Remove unsafe directives in production
            csp_config["script-src"] = [
                src for src in csp_config["script-src"] 
                if not src.startswith("'unsafe-")
            ]
            # Add nonce or hash-based CSP for scripts
            csp_config["script-src"].append("'nonce-{nonce}'")
        
        return csp_config
    
    def _get_csp_header(self, request: Request) -> str:
        """Generate CSP header string with nonces if needed."""
        csp_parts = []
        
        for directive, sources in self.csp_config.items():
            if not sources:  # Boolean directive
                csp_parts.append(directive)
            else:
                # Replace nonce placeholder with actual nonce
                processed_sources = []
                for source in sources:
                    if "{nonce}" in source and hasattr(request.state, 'csp_nonce'):
                        processed_sources.append(source.format(nonce=request.state.csp_nonce))
                    else:
                        processed_sources.append(source)
                
                csp_parts.append(f"{directive} {' '.join(processed_sources)}")
        
        return "; ".join(csp_parts)
    
    def _build_hsts_config(self) -> str:
        """Build HTTP Strict Transport Security configuration."""
        max_age = 31536000  # 1 year
        
        hsts_parts = [f"max-age={max_age}"]
        
        if self.is_production:
            hsts_parts.append("includeSubDomains")
            hsts_parts.append("preload")
        
        return "; ".join(hsts_parts)
    
    def _build_feature_policy_config(self) -> str:
        """Build Feature Policy (Permissions Policy) configuration."""
        
        # Define feature permissions
        features = {
            "accelerometer": ["()"],
            "ambient-light-sensor": ["()"],
            "autoplay": ["()"],
            "battery": ["()"],
            "camera": ["()"],
            "clipboard-read": ["()"],
            "clipboard-write": ["(self)"],
            "display-capture": ["()"],
            "document-domain": ["()"],
            "encrypted-media": ["()"],
            "execution-while-not-rendered": ["()"],
            "execution-while-out-of-viewport": ["()"],
            "fullscreen": ["(self)"],
            "geolocation": ["()"],
            "gyroscope": ["()"],
            "magnetometer": ["()"],
            "microphone": ["()"],
            "midi": ["()"],
            "navigation-override": ["()"],
            "payment": ["()"],
            "picture-in-picture": ["()"],
            "publickey-credentials-get": ["(self)"],
            "screen-wake-lock": ["()"],
            "speaker-selection": ["()"],
            "sync-xhr": ["()"],
            "usb": ["()"],
            "web-share": ["(self)"],
            "xr-spatial-tracking": ["()"],
        }
        
        # Build feature policy string
        policy_parts = []
        for feature, allowlist in features.items():
            policy_parts.append(f"{feature}={','.join(allowlist)}")
        
        return ", ".join(policy_parts)
    
    def _should_add_csp(self, request: Request) -> bool:
        """Determine if CSP header should be added."""
        # Skip CSP for certain endpoints that might need more flexibility
        skip_csp_paths = [
            "/docs",
            "/redoc",
            "/openapi.json",
            "/health"
        ]
        
        return not any(request.url.path.startswith(path) for path in skip_csp_paths)
    
    def _is_sensitive_endpoint(self, request: Request) -> bool:
        """Check if the endpoint handles sensitive data."""
        sensitive_patterns = [
            r"^/api/auth/",
            r"^/api/users/",
            r"^/api/portfolios/",
            r"^/api/admin/",
            r"^/api/gdpr/",
        ]
        
        return any(
            re.match(pattern, request.url.path) 
            for pattern in sensitive_patterns
        )
    
    def _should_add_privacy_headers(self, request: Request) -> bool:
        """Determine if privacy-related headers should be added."""
        # Add privacy headers to user-facing pages
        return not request.url.path.startswith("/api/")


class CSPNonceMiddleware(BaseHTTPMiddleware):
    """
    Middleware to generate and inject CSP nonces for scripts and styles.
    
    This middleware generates unique nonces for each request to enable
    strict CSP policies without unsafe-inline directives.
    """
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        """Generate CSP nonce and attach to request state."""
        import secrets
        
        # Generate cryptographically secure nonce
        nonce = secrets.token_urlsafe(32)
        request.state.csp_nonce = nonce
        
        # Process request
        response = await call_next(request)
        
        # Inject nonce into HTML responses
        if (response.headers.get("content-type", "").startswith("text/html") and 
            hasattr(response, "body")):
            
            # This would typically be handled by template engine
            # For example, in Jinja2 templates: <script nonce="{{ csp_nonce }}">
            pass
        
        return response


class CORSSecurityMiddleware(BaseHTTPMiddleware):
    """
    Enhanced CORS middleware with security considerations.
    
    Provides more granular control over CORS policies than standard
    CORS middleware, with security-focused defaults.
    """
    
    def __init__(
        self,
        app: ASGIApp,
        allowed_origins: Optional[List[str]] = None,
        allowed_methods: Optional[List[str]] = None,
        allowed_headers: Optional[List[str]] = None,
        max_age: int = 86400
    ):
        super().__init__(app)
        
        self.allowed_origins = allowed_origins or self._get_default_origins()
        self.allowed_methods = allowed_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        self.allowed_headers = allowed_headers or [
            "Accept",
            "Accept-Language",
            "Content-Language",
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "X-CSRFToken"
        ]
        self.max_age = max_age
    
    def _get_default_origins(self) -> List[str]:
        """Get default allowed origins based on configuration."""
        origins = []
        
        if hasattr(settings, 'FRONTEND_URL'):
            origins.append(settings.FRONTEND_URL)
        
        if hasattr(settings, 'DOMAIN'):
            origins.extend([
                f"https://{settings.DOMAIN}",
                f"https://www.{settings.DOMAIN}",
            ])
        
        # Allow localhost in development
        if not self.is_production:
            origins.extend([
                "http://localhost:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3000",
            ])
        
        return origins
    
    async def dispatch(self, request: Request, call_next):
        """Handle CORS requests with security checks."""
        origin = request.headers.get("origin")
        
        # Handle preflight requests
        if request.method == "OPTIONS":
            return self._handle_preflight(request, origin)
        
        # Process actual request
        response = await call_next(request)
        
        # Add CORS headers to response
        if origin and self._is_origin_allowed(origin):
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Vary"] = "Origin"
        
        return response
    
    def _handle_preflight(self, request: Request, origin: Optional[str]) -> Response:
        """Handle CORS preflight requests."""
        from fastapi import Response
        
        if not origin or not self._is_origin_allowed(origin):
            return Response(status_code=403, content="CORS: Origin not allowed")
        
        requested_method = request.headers.get("Access-Control-Request-Method")
        if requested_method not in self.allowed_methods:
            return Response(status_code=403, content="CORS: Method not allowed")
        
        requested_headers = request.headers.get("Access-Control-Request-Headers")
        if requested_headers:
            headers = [h.strip() for h in requested_headers.split(",")]
            if not all(h.lower() in [ah.lower() for ah in self.allowed_headers] for h in headers):
                return Response(status_code=403, content="CORS: Headers not allowed")
        
        # Create preflight response
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Methods"] = ", ".join(self.allowed_methods)
        response.headers["Access-Control-Allow-Headers"] = ", ".join(self.allowed_headers)
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = str(self.max_age)
        response.headers["Vary"] = "Origin"
        
        return response
    
    def _is_origin_allowed(self, origin: str) -> bool:
        """Check if origin is allowed."""
        # Exact match
        if origin in self.allowed_origins:
            return True
        
        # Wildcard support (be very careful with this)
        for allowed_origin in self.allowed_origins:
            if allowed_origin == "*":
                # Only allow wildcard in development
                return not getattr(settings, 'ENVIRONMENT', 'development') == 'production'
            
            # Subdomain matching
            if allowed_origin.startswith("*."):
                domain = allowed_origin[2:]
                parsed_origin = urlparse(origin)
                if parsed_origin.netloc.endswith(f".{domain}") or parsed_origin.netloc == domain:
                    return True
        
        return False
    
    @property
    def is_production(self) -> bool:
        """Check if running in production environment."""
        return getattr(settings, 'ENVIRONMENT', 'development') == 'production'


class RateLimitByIPMiddleware(BaseHTTPMiddleware):
    """
    Rate limiting middleware based on IP address.
    
    Provides additional rate limiting specifically for security headers
    and prevents abuse of security-sensitive endpoints.
    """
    
    def __init__(self, app: ASGIApp, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.ip_requests: Dict[str, List[float]] = {}
    
    async def dispatch(self, request: Request, call_next):
        """Apply rate limiting by IP address."""
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Clean old requests
        self._clean_old_requests(current_time)
        
        # Check rate limit
        if self._is_rate_limited(client_ip, current_time):
            from fastapi import Response
            response = Response(
                status_code=429,
                content="Rate limit exceeded",
                headers={
                    "Retry-After": "60",
                    "X-RateLimit-Limit": str(self.requests_per_minute),
                    "X-RateLimit-Remaining": "0",
                    "X-RateLimit-Reset": str(int(current_time) + 60)
                }
            )
            return response
        
        # Record request
        if client_ip not in self.ip_requests:
            self.ip_requests[client_ip] = []
        self.ip_requests[client_ip].append(current_time)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        remaining = max(0, self.requests_per_minute - len(self.ip_requests.get(client_ip, [])))
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(int(current_time) + 60)
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address from request."""
        # Check for forwarded headers (from load balancers/proxies)
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fall back to direct connection IP
        return request.client.host if request.client else "unknown"
    
    def _clean_old_requests(self, current_time: float):
        """Remove old request records."""
        cutoff_time = current_time - 60  # 1 minute ago
        
        for ip in list(self.ip_requests.keys()):
            self.ip_requests[ip] = [
                req_time for req_time in self.ip_requests[ip]
                if req_time > cutoff_time
            ]
            
            # Remove empty entries
            if not self.ip_requests[ip]:
                del self.ip_requests[ip]
    
    def _is_rate_limited(self, client_ip: str, current_time: float) -> bool:
        """Check if IP is rate limited."""
        if client_ip not in self.ip_requests:
            return False
        
        # Count requests in the last minute
        cutoff_time = current_time - 60
        recent_requests = [
            req_time for req_time in self.ip_requests[client_ip]
            if req_time > cutoff_time
        ]
        
        return len(recent_requests) >= self.requests_per_minute


# Utility functions for CSP nonce handling
def generate_nonce() -> str:
    """Generate a cryptographically secure nonce."""
    import secrets
    return secrets.token_urlsafe(32)


def get_csp_script_tag(nonce: str, src: Optional[str] = None, content: Optional[str] = None) -> str:
    """Generate script tag with CSP nonce."""
    if src:
        return f'<script nonce="{nonce}" src="{src}"></script>'
    elif content:
        return f'<script nonce="{nonce}">{content}</script>'
    else:
        return f'<script nonce="{nonce}"></script>'


def get_csp_style_tag(nonce: str, href: Optional[str] = None, content: Optional[str] = None) -> str:
    """Generate style tag with CSP nonce."""
    if href:
        return f'<link nonce="{nonce}" rel="stylesheet" href="{href}">'
    elif content:
        return f'<style nonce="{nonce}">{content}</style>'
    else:
        return f'<style nonce="{nonce}"></style>'