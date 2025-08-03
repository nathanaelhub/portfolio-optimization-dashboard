"""
Comprehensive error handling and validation middleware.
"""

from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
import traceback
from typing import Dict, Any
import time
from datetime import datetime

logger = logging.getLogger(__name__)


class ErrorHandler:
    """Centralized error handling for the API."""
    
    @staticmethod
    def create_error_response(
        error_code: str,
        message: str,
        details: Dict[str, Any] = None,
        status_code: int = 500
    ) -> Dict[str, Any]:
        """Create standardized error response."""
        response = {
            "error": {
                "code": error_code,
                "message": message,
                "timestamp": datetime.now().isoformat(),
                "type": "api_error"
            }
        }
        
        if details:
            response["error"]["details"] = details
            
        return response


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    logger.warning(f"Validation error on {request.url}: {exc.errors()}")
    
    # Extract field-specific errors
    field_errors = {}
    for error in exc.errors():
        field = " -> ".join(str(loc) for loc in error["loc"])
        field_errors[field] = error["msg"]
    
    error_response = ErrorHandler.create_error_response(
        error_code="VALIDATION_ERROR",
        message="Invalid request data",
        details={
            "field_errors": field_errors,
            "request_body": str(exc.body) if hasattr(exc, 'body') else None
        },
        status_code=422
    )
    
    return JSONResponse(
        status_code=422,
        content=error_response
    )


async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions."""
    logger.info(f"HTTP {exc.status_code} on {request.url}: {exc.detail}")
    
    # Map common HTTP errors to user-friendly messages
    error_messages = {
        400: "Invalid request parameters",
        401: "Authentication required",
        403: "Access denied",
        404: "Resource not found",
        429: "Rate limit exceeded",
        500: "Internal server error"
    }
    
    user_message = error_messages.get(exc.status_code, exc.detail)
    
    error_response = ErrorHandler.create_error_response(
        error_code=f"HTTP_{exc.status_code}",
        message=user_message,
        details={"original_detail": exc.detail} if exc.detail != user_message else None,
        status_code=exc.status_code
    )
    
    return JSONResponse(
        status_code=exc.status_code,
        content=error_response
    )


async def starlette_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette HTTP exceptions."""
    return await http_exception_handler(request, HTTPException(status_code=exc.status_code, detail=exc.detail))


async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions."""
    request_id = getattr(request.state, 'request_id', id(request))
    
    logger.error(
        f"Unhandled exception in request {request_id}: {type(exc).__name__}: {str(exc)}",
        exc_info=True
    )
    
    # Different handling for development vs production
    import os
    is_development = os.getenv("ENVIRONMENT", "development") == "development"
    
    details = None
    if is_development:
        details = {
            "exception_type": type(exc).__name__,
            "exception_args": str(exc),
            "traceback": traceback.format_exc().split('\n')
        }
    
    error_response = ErrorHandler.create_error_response(
        error_code="INTERNAL_ERROR",
        message="An unexpected error occurred. Please try again later.",
        details=details,
        status_code=500
    )
    
    return JSONResponse(
        status_code=500,
        content=error_response
    )


class FinancialDataError(Exception):
    """Custom exception for financial data errors."""
    def __init__(self, message: str, error_code: str = "FINANCIAL_DATA_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class OptimizationError(Exception):
    """Custom exception for portfolio optimization errors."""
    def __init__(self, message: str, error_code: str = "OPTIMIZATION_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class MLModelError(Exception):
    """Custom exception for ML model errors."""
    def __init__(self, message: str, error_code: str = "ML_MODEL_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


async def financial_data_exception_handler(request: Request, exc: FinancialDataError):
    """Handle financial data specific errors."""
    logger.warning(f"Financial data error on {request.url}: {exc.message}")
    
    error_response = ErrorHandler.create_error_response(
        error_code=exc.error_code,
        message=exc.message,
        details={"suggestion": "Please check symbol validity and try again"},
        status_code=400
    )
    
    return JSONResponse(status_code=400, content=error_response)


async def optimization_exception_handler(request: Request, exc: OptimizationError):
    """Handle optimization specific errors."""
    logger.warning(f"Optimization error on {request.url}: {exc.message}")
    
    error_response = ErrorHandler.create_error_response(
        error_code=exc.error_code,
        message=exc.message,
        details={
            "suggestion": "Try adjusting constraints or using different optimization method"
        },
        status_code=400
    )
    
    return JSONResponse(status_code=400, content=error_response)


async def ml_model_exception_handler(request: Request, exc: MLModelError):
    """Handle ML model specific errors."""
    logger.warning(f"ML model error on {request.url}: {exc.message}")
    
    error_response = ErrorHandler.create_error_response(
        error_code=exc.error_code,
        message=exc.message,
        details={
            "suggestion": "ML models require sufficient historical data (2+ years)"
        },
        status_code=400
    )
    
    return JSONResponse(status_code=400, content=error_response)


def setup_error_handlers(app):
    """Set up all error handlers for the FastAPI app."""
    
    # Validation errors
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    
    # HTTP errors  
    app.add_exception_handler(HTTPException, http_exception_handler)
    app.add_exception_handler(StarletteHTTPException, starlette_exception_handler)
    
    # Custom domain errors
    app.add_exception_handler(FinancialDataError, financial_data_exception_handler)
    app.add_exception_handler(OptimizationError, optimization_exception_handler)
    app.add_exception_handler(MLModelError, ml_model_exception_handler)
    
    # General exception fallback
    app.add_exception_handler(Exception, general_exception_handler)


class RequestLoggingMiddleware:
    """Middleware to log request details for debugging."""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Generate request ID
            request_id = f"{int(time.time())}-{id(request) % 10000}"
            request.state.request_id = request_id
            
            start_time = time.time()
            
            # Log request
            logger.info(
                f"Request {request_id}: {request.method} {request.url} "
                f"from {request.client.host if request.client else 'unknown'}"
            )
            
            async def send_wrapper(message):
                if message["type"] == "http.response.start":
                    duration = time.time() - start_time
                    status_code = message["status"]
                    
                    log_level = logging.INFO
                    if status_code >= 400:
                        log_level = logging.WARNING
                    if status_code >= 500:
                        log_level = logging.ERROR
                    
                    logger.log(
                        log_level,
                        f"Request {request_id}: {status_code} "
                        f"({duration:.3f}s)"
                    )
                
                await send(message)
            
            await self.app(scope, receive, send_wrapper)
        else:
            await self.app(scope, receive, send)