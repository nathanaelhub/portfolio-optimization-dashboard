"""
JWT Authentication and Authorization system for portfolio optimization.

Implements secure JWT authentication with refresh tokens, role-based access control,
and comprehensive security measures.
"""

import jwt
import bcrypt
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from redis import Redis
import logging

from app.database.database import get_db
from app.models.user import User
from app.core.config import settings
from app.security.validators import SecurityValidator

logger = logging.getLogger(__name__)

# Security configuration
ACCESS_TOKEN_EXPIRE_MINUTES = 15  # Short-lived access tokens
REFRESH_TOKEN_EXPIRE_DAYS = 30    # Longer refresh token validity
PASSWORD_MIN_LENGTH = 8
PASSWORD_REQUIRE_UPPERCASE = True
PASSWORD_REQUIRE_LOWERCASE = True  
PASSWORD_REQUIRE_NUMBERS = True
PASSWORD_REQUIRE_SPECIAL = True
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_DURATION_MINUTES = 15

# JWT algorithms and security
ALGORITHM = "HS256"
AUDIENCE = "portfolio-optimization"
ISSUER = "portfolio-dashboard"

# Password complexity regex
PASSWORD_PATTERN = r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$'

security = HTTPBearer()


class SecurityError(Exception):
    """Base exception for security-related errors."""
    pass


class AuthenticationError(SecurityError):
    """Authentication failed."""
    pass


class AuthorizationError(SecurityError):
    """Authorization/permission denied."""
    pass


class TokenBlacklistManager:
    """
    Manages JWT token blacklisting using Redis.
    
    Provides functionality to blacklist tokens and check if tokens
    are revoked for enhanced security.
    """
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.blacklist_prefix = "blacklisted_token:"
        self.user_tokens_prefix = "user_tokens:"
    
    def blacklist_token(self, jti: str, exp: datetime) -> None:
        """
        Add token to blacklist.
        
        Args:
            jti: JWT ID (unique token identifier)
            exp: Token expiration time
        """
        # Calculate TTL to expire blacklist entry when token would expire naturally
        ttl = int((exp - datetime.now(timezone.utc)).total_seconds())
        if ttl > 0:
            self.redis.setex(f"{self.blacklist_prefix}{jti}", ttl, "1")
    
    def is_token_blacklisted(self, jti: str) -> bool:
        """
        Check if token is blacklisted.
        
        Args:
            jti: JWT ID to check
            
        Returns:
            True if token is blacklisted
        """
        return bool(self.redis.get(f"{self.blacklist_prefix}{jti}"))
    
    def blacklist_all_user_tokens(self, user_id: int) -> None:
        """
        Blacklist all tokens for a specific user.
        
        Args:
            user_id: User ID whose tokens should be blacklisted
        """
        # Get all active tokens for user
        token_pattern = f"{self.user_tokens_prefix}{user_id}:*"
        token_keys = self.redis.keys(token_pattern)
        
        for token_key in token_keys:
            token_data = self.redis.get(token_key)
            if token_data:
                # Extract JTI and blacklist token
                jti = token_key.decode().split(":")[-1]
                # Set blacklist with remaining TTL
                ttl = self.redis.ttl(token_key)
                if ttl > 0:
                    self.redis.setex(f"{self.blacklist_prefix}{jti}", ttl, "1")
        
        # Remove user token tracking
        for token_key in token_keys:
            self.redis.delete(token_key)
    
    def track_user_token(self, user_id: int, jti: str, exp: datetime) -> None:
        """
        Track active token for user.
        
        Args:
            user_id: User ID
            jti: JWT ID
            exp: Token expiration
        """
        ttl = int((exp - datetime.now(timezone.utc)).total_seconds())
        if ttl > 0:
            self.redis.setex(f"{self.user_tokens_prefix}{user_id}:{jti}", ttl, "1")


class PasswordManager:
    """
    Secure password hashing and validation.
    
    Uses bcrypt for password hashing with configurable rounds
    and comprehensive password complexity validation.
    """
    
    @staticmethod
    def hash_password(password: str) -> str:
        """
        Hash password using bcrypt.
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
        """
        # Generate salt and hash password
        salt = bcrypt.gensalt(rounds=12)  # Secure cost factor
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """
        Verify password against hash.
        
        Args:
            password: Plain text password
            hashed_password: Stored hash
            
        Returns:
            True if password matches
        """
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception as e:
            logger.error(f"Password verification error: {e}")
            return False
    
    @staticmethod
    def validate_password_strength(password: str) -> List[str]:
        """
        Validate password complexity requirements.
        
        Args:
            password: Password to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        if len(password) < PASSWORD_MIN_LENGTH:
            errors.append(f"Password must be at least {PASSWORD_MIN_LENGTH} characters long")
        
        if PASSWORD_REQUIRE_UPPERCASE and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if PASSWORD_REQUIRE_LOWERCASE and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if PASSWORD_REQUIRE_NUMBERS and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one number")
        
        if PASSWORD_REQUIRE_SPECIAL and not any(c in '@$!%*?&' for c in password):
            errors.append("Password must contain at least one special character (@$!%*?&)")
        
        # Check for common weak patterns
        if password.lower() in ['password', '12345678', 'qwerty', 'admin']:
            errors.append("Password is too common and easily guessed")
        
        return errors


class RateLimiter:
    """
    Rate limiting for authentication attempts.
    
    Prevents brute force attacks by limiting login attempts
    per user and IP address.
    """
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.user_attempts_prefix = "login_attempts_user:"
        self.ip_attempts_prefix = "login_attempts_ip:"
    
    def is_user_locked_out(self, user_id: int) -> bool:
        """
        Check if user is locked out due to failed attempts.
        
        Args:
            user_id: User ID to check
            
        Returns:
            True if user is locked out
        """
        key = f"{self.user_attempts_prefix}{user_id}"
        attempts = self.redis.get(key)
        
        if attempts and int(attempts) >= MAX_LOGIN_ATTEMPTS:
            return True
        
        return False
    
    def is_ip_locked_out(self, ip_address: str) -> bool:
        """
        Check if IP address is locked out.
        
        Args:
            ip_address: IP address to check
            
        Returns:
            True if IP is locked out
        """
        key = f"{self.ip_attempts_prefix}{ip_address}"
        attempts = self.redis.get(key)
        
        if attempts and int(attempts) >= MAX_LOGIN_ATTEMPTS * 3:  # Higher threshold for IPs
            return True
        
        return False
    
    def record_failed_attempt(self, user_id: int, ip_address: str) -> None:
        """
        Record failed login attempt.
        
        Args:
            user_id: User ID for failed attempt
            ip_address: IP address of attempt
        """
        # Record user attempt
        user_key = f"{self.user_attempts_prefix}{user_id}"
        pipe = self.redis.pipeline()
        pipe.incr(user_key)
        pipe.expire(user_key, LOCKOUT_DURATION_MINUTES * 60)
        
        # Record IP attempt
        ip_key = f"{self.ip_attempts_prefix}{ip_address}"
        pipe.incr(ip_key)
        pipe.expire(ip_key, LOCKOUT_DURATION_MINUTES * 60)
        
        pipe.execute()
    
    def clear_failed_attempts(self, user_id: int, ip_address: str) -> None:
        """
        Clear failed attempts after successful login.
        
        Args:
            user_id: User ID to clear
            ip_address: IP address to clear
        """
        self.redis.delete(f"{self.user_attempts_prefix}{user_id}")
        self.redis.delete(f"{self.ip_attempts_prefix}{ip_address}")


class JWTManager:
    """
    JWT token creation and validation.
    
    Handles creation of access and refresh tokens with proper
    claims and security measures.
    """
    
    def __init__(self, blacklist_manager: TokenBlacklistManager):
        self.blacklist_manager = blacklist_manager
    
    def create_access_token(self, user_id: int, email: str, roles: List[str] = None) -> str:
        """
        Create JWT access token.
        
        Args:
            user_id: User ID
            email: User email
            roles: User roles/permissions
            
        Returns:
            JWT access token
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        jti = secrets.token_urlsafe(32)
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "roles": roles or [],
            "type": "access",
            "iat": now,
            "exp": exp,
            "aud": AUDIENCE,
            "iss": ISSUER,
            "jti": jti
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
        
        # Track token for potential blacklisting
        self.blacklist_manager.track_user_token(user_id, jti, exp)
        
        return token
    
    def create_refresh_token(self, user_id: int, email: str) -> str:
        """
        Create JWT refresh token.
        
        Args:
            user_id: User ID
            email: User email
            
        Returns:
            JWT refresh token
        """
        now = datetime.now(timezone.utc)
        exp = now + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        jti = secrets.token_urlsafe(32)
        
        payload = {
            "sub": str(user_id),
            "email": email,
            "type": "refresh",
            "iat": now,
            "exp": exp,
            "aud": AUDIENCE,
            "iss": ISSUER,
            "jti": jti
        }
        
        token = jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)
        
        # Track refresh token
        self.blacklist_manager.track_user_token(user_id, jti, exp)
        
        return token
    
    def verify_token(self, token: str, token_type: str = "access") -> Dict[str, Any]:
        """
        Verify and decode JWT token.
        
        Args:
            token: JWT token to verify
            token_type: Expected token type ('access' or 'refresh')
            
        Returns:
            Decoded token payload
            
        Raises:
            AuthenticationError: If token is invalid
        """
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[ALGORITHM],
                audience=AUDIENCE,
                issuer=ISSUER
            )
            
            # Verify token type
            if payload.get("type") != token_type:
                raise AuthenticationError(f"Invalid token type: expected {token_type}")
            
            # Check if token is blacklisted
            jti = payload.get("jti")
            if jti and self.blacklist_manager.is_token_blacklisted(jti):
                raise AuthenticationError("Token has been revoked")
            
            return payload
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.InvalidTokenError as e:
            raise AuthenticationError(f"Invalid token: {e}")
    
    def revoke_token(self, token: str) -> None:
        """
        Revoke (blacklist) a token.
        
        Args:
            token: Token to revoke
        """
        try:
            # Decode without verification to get JTI and expiration
            payload = jwt.decode(token, options={"verify_signature": False})
            jti = payload.get("jti")
            exp = datetime.fromtimestamp(payload.get("exp"), tz=timezone.utc)
            
            if jti:
                self.blacklist_manager.blacklist_token(jti, exp)
                
        except Exception as e:
            logger.error(f"Error revoking token: {e}")


class AuthService:
    """
    Main authentication service.
    
    Provides high-level authentication operations including
    registration, login, token refresh, and user management.
    """
    
    def __init__(self, db: Session, redis_client: Redis):
        self.db = db
        self.blacklist_manager = TokenBlacklistManager(redis_client)
        self.jwt_manager = JWTManager(self.blacklist_manager)
        self.rate_limiter = RateLimiter(redis_client)
        self.password_manager = PasswordManager()
    
    async def register_user(
        self, 
        email: str, 
        password: str, 
        full_name: str,
        ip_address: str
    ) -> Dict[str, Any]:
        """
        Register new user with validation.
        
        Args:
            email: User email
            password: User password
            full_name: User's full name
            ip_address: Registration IP address
            
        Returns:
            User data and tokens
            
        Raises:
            ValueError: If registration data is invalid
            AuthenticationError: If registration fails
        """
        # Sanitize inputs
        email = SecurityValidator.sanitize_string(email.lower(), 255)
        full_name = SecurityValidator.sanitize_string(full_name, 100)
        
        # Validate email format
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', email):
            raise ValueError("Invalid email format")
        
        # Validate password strength
        password_errors = self.password_manager.validate_password_strength(password)
        if password_errors:
            raise ValueError(f"Password validation failed: {'; '.join(password_errors)}")
        
        # Check if user already exists
        existing_user = self.db.query(User).filter(User.email == email).first()
        if existing_user:
            raise AuthenticationError("User already exists")
        
        # Hash password
        hashed_password = self.password_manager.hash_password(password)
        
        # Create user
        user = User(
            email=email,
            hashed_password=hashed_password,
            full_name=full_name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            registration_ip=ip_address
        )
        
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        
        # Create tokens
        access_token = self.jwt_manager.create_access_token(user.id, user.email, ["user"])
        refresh_token = self.jwt_manager.create_refresh_token(user.id, user.email)
        
        logger.info(f"User registered: {email} from IP {ip_address}")
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "created_at": user.created_at
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def authenticate_user(
        self, 
        email: str, 
        password: str, 
        ip_address: str
    ) -> Dict[str, Any]:
        """
        Authenticate user login.
        
        Args:
            email: User email
            password: User password
            ip_address: Login IP address
            
        Returns:
            User data and tokens
            
        Raises:
            AuthenticationError: If authentication fails
        """
        email = SecurityValidator.sanitize_string(email.lower(), 255)
        
        # Get user
        user = self.db.query(User).filter(User.email == email).first()
        if not user:
            raise AuthenticationError("Invalid credentials")
        
        # Check rate limiting
        if self.rate_limiter.is_user_locked_out(user.id):
            raise AuthenticationError(f"Account locked due to too many failed attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes.")
        
        if self.rate_limiter.is_ip_locked_out(ip_address):
            raise AuthenticationError(f"IP address locked due to too many failed attempts. Try again in {LOCKOUT_DURATION_MINUTES} minutes.")
        
        # Verify password
        if not self.password_manager.verify_password(password, user.hashed_password):
            self.rate_limiter.record_failed_attempt(user.id, ip_address)
            raise AuthenticationError("Invalid credentials")
        
        # Check if user is active
        if not user.is_active:
            raise AuthenticationError("Account is disabled")
        
        # Clear failed attempts on successful login
        self.rate_limiter.clear_failed_attempts(user.id, ip_address)
        
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        user.last_login_ip = ip_address
        self.db.commit()
        
        # Create tokens
        access_token = self.jwt_manager.create_access_token(user.id, user.email, ["user"])
        refresh_token = self.jwt_manager.create_refresh_token(user.id, user.email)
        
        logger.info(f"User authenticated: {email} from IP {ip_address}")
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "full_name": user.full_name,
                "last_login": user.last_login
            },
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
    
    async def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Refresh access token using refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            New access token
            
        Raises:
            AuthenticationError: If refresh token is invalid
        """
        # Verify refresh token
        payload = self.jwt_manager.verify_token(refresh_token, "refresh")
        
        user_id = int(payload["sub"])
        email = payload["email"]
        
        # Verify user still exists and is active
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            raise AuthenticationError("User not found or inactive")
        
        # Create new access token
        access_token = self.jwt_manager.create_access_token(user.id, user.email, ["user"])
        
        return {
            "access_token": access_token,
            "token_type": "bearer"
        }
    
    async def logout_user(self, access_token: str, refresh_token: str = None) -> None:
        """
        Logout user by revoking tokens.
        
        Args:
            access_token: Access token to revoke
            refresh_token: Optional refresh token to revoke
        """
        # Revoke access token
        self.jwt_manager.revoke_token(access_token)
        
        # Revoke refresh token if provided
        if refresh_token:
            self.jwt_manager.revoke_token(refresh_token)
        
        logger.info("User logged out")
    
    async def logout_all_sessions(self, user_id: int) -> None:
        """
        Logout user from all sessions.
        
        Args:
            user_id: User ID to logout from all sessions
        """
        self.blacklist_manager.blacklist_all_user_tokens(user_id)
        logger.info(f"All sessions terminated for user {user_id}")


# FastAPI dependencies
async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
    request: Request = None
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Args:
        credentials: HTTP Bearer token
        db: Database session
        request: FastAPI request object
        
    Returns:
        Current user object
        
    Raises:
        HTTPException: If authentication fails
    """
    try:
        # Get Redis client (this would be injected in real implementation)
        redis_client = None  # Placeholder - should be injected
        blacklist_manager = TokenBlacklistManager(redis_client) if redis_client else None
        jwt_manager = JWTManager(blacklist_manager) if blacklist_manager else JWTManager(None)
        
        # Verify token
        payload = jwt_manager.verify_token(credentials.credentials, "access")
        user_id = int(payload["sub"])
        
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise AuthenticationError("User not found")
        
        if not user.is_active:
            raise AuthenticationError("User account is disabled")
        
        return user
        
    except AuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        logger.error(f"Authentication error: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def require_role(required_roles: List[str]):
    """
    Dependency to require specific roles.
    
    Args:
        required_roles: List of required roles
        
    Returns:
        Dependency function
    """
    def role_checker(current_user: User = Depends(get_current_user)):
        # This would check user roles against required_roles
        # Implementation depends on how roles are stored
        return current_user
    
    return role_checker


# Admin role dependency
admin_required = Depends(require_role(["admin"]))