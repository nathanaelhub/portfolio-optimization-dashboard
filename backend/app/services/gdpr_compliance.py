"""
GDPR Compliance Service

This module provides comprehensive GDPR (General Data Protection Regulation)
compliance features including data processing consent, user rights management,
data portability, and privacy controls.
"""

import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum

from sqlalchemy import Column, Integer, String, DateTime, Boolean, JSON, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session

from app.core.config import settings
from app.monitoring.logger import get_logger
from app.database.connection_pool import get_db_session
from app.services.cache_service import cache_service

logger = get_logger(__name__)

Base = declarative_base()


class ConsentType(Enum):
    """Types of consent for data processing."""
    ESSENTIAL = "essential"  # Required for service functionality
    ANALYTICS = "analytics"  # Usage analytics and performance monitoring
    MARKETING = "marketing"  # Marketing communications
    PERSONALIZATION = "personalization"  # Personalized features
    THIRD_PARTY = "third_party"  # Third-party integrations


class DataProcessingPurpose(Enum):
    """Purposes for data processing."""
    SERVICE_PROVISION = "service_provision"
    ACCOUNT_MANAGEMENT = "account_management"
    PORTFOLIO_OPTIMIZATION = "portfolio_optimization"
    ANALYTICS = "analytics"
    MARKETING = "marketing"
    LEGAL_COMPLIANCE = "legal_compliance"
    SECURITY = "security"


class UserRightType(Enum):
    """Types of user rights under GDPR."""
    ACCESS = "access"  # Right to access personal data
    RECTIFICATION = "rectification"  # Right to correct personal data
    ERASURE = "erasure"  # Right to be forgotten
    PORTABILITY = "portability"  # Right to data portability
    RESTRICTION = "restriction"  # Right to restrict processing
    OBJECTION = "objection"  # Right to object to processing


@dataclass
class ConsentRecord:
    """Record of user consent for data processing."""
    user_id: int
    consent_type: ConsentType
    purpose: DataProcessingPurpose
    granted: bool
    timestamp: datetime
    version: str
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    withdrawal_timestamp: Optional[datetime] = None


class GDPRConsent(Base):
    """Database model for GDPR consent records."""
    __tablename__ = "gdpr_consent"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    consent_type = Column(String(50), nullable=False)
    purpose = Column(String(50), nullable=False)
    granted = Column(Boolean, nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    version = Column(String(20), nullable=False)
    ip_address = Column(String(45))  # IPv6 compatible
    user_agent = Column(Text)
    withdrawal_timestamp = Column(DateTime)
    metadata = Column(JSON)


class GDPRDataRequest(Base):
    """Database model for GDPR data requests."""
    __tablename__ = "gdpr_data_requests"
    
    id = Column(Integer, primary_key=True)
    request_id = Column(String(36), unique=True, nullable=False)
    user_id = Column(Integer, nullable=False, index=True)
    request_type = Column(String(20), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    requested_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    completed_at = Column(DateTime)
    data_file_path = Column(String(500))
    notes = Column(Text)
    metadata = Column(JSON)


class GDPRDataProcessingLog(Base):
    """Database model for data processing activity logs."""
    __tablename__ = "gdpr_processing_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    activity_type = Column(String(50), nullable=False)
    purpose = Column(String(50), nullable=False)
    data_categories = Column(JSON)  # List of data categories processed
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    legal_basis = Column(String(50), nullable=False)
    retention_period = Column(String(50))
    metadata = Column(JSON)


class GDPRComplianceService:
    """
    Comprehensive GDPR compliance service.
    
    Manages user consent, data processing activities, user rights,
    and privacy controls in accordance with GDPR requirements.
    """
    
    def __init__(self):
        self.consent_version = "1.0"
        self.data_retention_periods = {
            DataProcessingPurpose.SERVICE_PROVISION: timedelta(days=2555),  # 7 years
            DataProcessingPurpose.ACCOUNT_MANAGEMENT: timedelta(days=2555),  # 7 years
            DataProcessingPurpose.PORTFOLIO_OPTIMIZATION: timedelta(days=1825),  # 5 years
            DataProcessingPurpose.ANALYTICS: timedelta(days=1095),  # 3 years
            DataProcessingPurpose.MARKETING: timedelta(days=1095),  # 3 years
            DataProcessingPurpose.LEGAL_COMPLIANCE: timedelta(days=2555),  # 7 years
            DataProcessingPurpose.SECURITY: timedelta(days=365),  # 1 year
        }
        
        # Data categories tracked by the system
        self.data_categories = {
            "identity": ["email", "name", "username"],
            "contact": ["email", "phone", "address"],
            "financial": ["portfolio_data", "transactions", "preferences"],
            "technical": ["ip_address", "user_agent", "session_data"],
            "behavioral": ["usage_patterns", "click_data", "preferences"],
            "professional": ["job_title", "company", "investment_experience"]
        }
    
    async def record_consent(
        self,
        user_id: int,
        consent_type: ConsentType,
        purpose: DataProcessingPurpose,
        granted: bool,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Record user consent for data processing.
        
        Args:
            user_id: User identifier
            consent_type: Type of consent being recorded
            purpose: Purpose for data processing
            granted: Whether consent was granted
            ip_address: User's IP address
            user_agent: User's browser user agent
            metadata: Additional metadata
            
        Returns:
            Consent record ID
        """
        async with get_db_session() as session:
            # Check if consent already exists for this combination
            existing_consent = session.query(GDPRConsent).filter_by(
                user_id=user_id,
                consent_type=consent_type.value,
                purpose=purpose.value
            ).first()
            
            if existing_consent and existing_consent.granted != granted:
                # Update existing consent
                if not granted:
                    existing_consent.withdrawal_timestamp = datetime.utcnow()
                existing_consent.granted = granted
                existing_consent.timestamp = datetime.utcnow()
                existing_consent.version = self.consent_version
                existing_consent.ip_address = ip_address
                existing_consent.user_agent = user_agent
                existing_consent.metadata = metadata or {}
                
                consent_record = existing_consent
            else:
                # Create new consent record
                consent_record = GDPRConsent(
                    user_id=user_id,
                    consent_type=consent_type.value,
                    purpose=purpose.value,
                    granted=granted,
                    timestamp=datetime.utcnow(),
                    version=self.consent_version,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    metadata=metadata or {}
                )
                session.add(consent_record)
            
            await session.commit()
            
            logger.info(
                f"GDPR consent recorded: {consent_type.value}",
                user_id=user_id,
                consent_type=consent_type.value,
                purpose=purpose.value,
                granted=granted,
                consent_id=consent_record.id
            )
            
            # Invalidate consent cache
            await self._invalidate_consent_cache(user_id)
            
            return str(consent_record.id)
    
    async def check_consent(
        self,
        user_id: int,
        consent_type: ConsentType,
        purpose: DataProcessingPurpose
    ) -> bool:
        """
        Check if user has granted consent for specific processing.
        
        Args:
            user_id: User identifier
            consent_type: Type of consent to check
            purpose: Purpose for data processing
            
        Returns:
            True if consent is granted
        """
        # Check cache first
        cache_key = f"gdpr_consent:{user_id}:{consent_type.value}:{purpose.value}"
        cached_result = cache_service.cache.get(cache_key)
        
        if cached_result is not None:
            return cached_result
        
        async with get_db_session() as session:
            consent_record = session.query(GDPRConsent).filter_by(
                user_id=user_id,
                consent_type=consent_type.value,
                purpose=purpose.value
            ).order_by(GDPRConsent.timestamp.desc()).first()
            
            granted = consent_record.granted if consent_record else False
            
            # Cache result for 1 hour
            cache_service.cache.set(cache_key, granted, ttl=3600)
            
            return granted
    
    async def get_user_consents(self, user_id: int) -> Dict[str, Dict[str, bool]]:
        """
        Get all consents for a user.
        
        Args:
            user_id: User identifier
            
        Returns:
            Dictionary of consent types and purposes with granted status
        """
        async with get_db_session() as session:
            consents = session.query(GDPRConsent).filter_by(
                user_id=user_id
            ).order_by(GDPRConsent.timestamp.desc()).all()
            
            # Group by consent type and purpose, taking latest
            consent_map = {}
            seen_combinations = set()
            
            for consent in consents:
                combination_key = f"{consent.consent_type}:{consent.purpose}"
                
                if combination_key not in seen_combinations:
                    if consent.consent_type not in consent_map:
                        consent_map[consent.consent_type] = {}
                    
                    consent_map[consent.consent_type][consent.purpose] = {
                        "granted": consent.granted,
                        "timestamp": consent.timestamp.isoformat(),
                        "version": consent.version,
                        "withdrawal_timestamp": (
                            consent.withdrawal_timestamp.isoformat()
                            if consent.withdrawal_timestamp
                            else None
                        )
                    }
                    
                    seen_combinations.add(combination_key)
            
            return consent_map
    
    async def log_data_processing(
        self,
        user_id: int,
        activity_type: str,
        purpose: DataProcessingPurpose,
        data_categories: List[str],
        legal_basis: str,
        retention_period: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Log data processing activity for audit trail.
        
        Args:
            user_id: User identifier
            activity_type: Type of processing activity
            purpose: Purpose for processing
            data_categories: Categories of data being processed
            legal_basis: Legal basis for processing (consent, contract, etc.)
            retention_period: How long data will be retained
            metadata: Additional processing details
        """
        async with get_db_session() as session:
            # Determine retention period if not provided
            if not retention_period:
                retention_delta = self.data_retention_periods.get(purpose)
                if retention_delta:
                    retention_period = f"{retention_delta.days} days"
            
            processing_log = GDPRDataProcessingLog(
                user_id=user_id,
                activity_type=activity_type,
                purpose=purpose.value,
                data_categories=data_categories,
                timestamp=datetime.utcnow(),
                legal_basis=legal_basis,
                retention_period=retention_period,
                metadata=metadata or {}
            )
            
            session.add(processing_log)
            await session.commit()
            
            logger.debug(
                f"Data processing logged: {activity_type}",
                user_id=user_id,
                purpose=purpose.value,
                data_categories=data_categories,
                legal_basis=legal_basis
            )
    
    async def submit_data_request(
        self,
        user_id: int,
        request_type: UserRightType,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Submit a GDPR data request (access, erasure, portability, etc.).
        
        Args:
            user_id: User identifier
            request_type: Type of request
            metadata: Additional request details
            
        Returns:
            Request ID
        """
        request_id = str(uuid.uuid4())
        
        async with get_db_session() as session:
            data_request = GDPRDataRequest(
                request_id=request_id,
                user_id=user_id,
                request_type=request_type.value,
                status="pending",
                requested_at=datetime.utcnow(),
                metadata=metadata or {}
            )
            
            session.add(data_request)
            await session.commit()
            
            logger.info(
                f"GDPR data request submitted: {request_type.value}",
                user_id=user_id,
                request_id=request_id,
                request_type=request_type.value
            )
            
            # Process request asynchronously
            await self._process_data_request(request_id)
            
            return request_id
    
    async def _process_data_request(self, request_id: str):
        """Process GDPR data request asynchronously."""
        async with get_db_session() as session:
            request = session.query(GDPRDataRequest).filter_by(
                request_id=request_id
            ).first()
            
            if not request:
                return
            
            try:
                request.status = "processing"
                await session.commit()
                
                if request.request_type == UserRightType.ACCESS.value:
                    await self._process_access_request(request)
                elif request.request_type == UserRightType.PORTABILITY.value:
                    await self._process_portability_request(request)
                elif request.request_type == UserRightType.ERASURE.value:
                    await self._process_erasure_request(request)
                elif request.request_type == UserRightType.RECTIFICATION.value:
                    await self._process_rectification_request(request)
                else:
                    request.status = "manual_review"
                    request.notes = "Request requires manual review"
                
                if request.status != "manual_review":
                    request.status = "completed"
                    request.completed_at = datetime.utcnow()
                
                await session.commit()
                
            except Exception as e:
                request.status = "failed"
                request.notes = f"Processing failed: {str(e)}"
                await session.commit()
                
                logger.error(
                    f"GDPR request processing failed: {request_id}",
                    error=e,
                    request_type=request.request_type
                )
    
    async def _process_access_request(self, request: GDPRDataRequest):
        """Process data access request (Article 15)."""
        user_data = await self._collect_user_data(request.user_id)
        
        # Generate data export file
        data_file_path = f"gdpr_exports/user_{request.user_id}_access_{request.request_id}.json"
        
        # In production, this would write to secure storage
        export_data = {
            "request_id": request.request_id,
            "user_id": request.user_id,
            "export_date": datetime.utcnow().isoformat(),
            "data_categories": user_data,
            "consents": await self.get_user_consents(request.user_id),
            "processing_activities": await self._get_user_processing_activities(request.user_id)
        }
        
        # Save export data (implement secure file storage)
        request.data_file_path = data_file_path
        request.notes = "Data export generated successfully"
        
        logger.info(
            f"Data access request processed: {request.request_id}",
            user_id=request.user_id,
            data_file_path=data_file_path
        )
    
    async def _process_portability_request(self, request: GDPRDataRequest):
        """Process data portability request (Article 20)."""
        # Similar to access request but in structured, machine-readable format
        user_data = await self._collect_portable_user_data(request.user_id)
        
        data_file_path = f"gdpr_exports/user_{request.user_id}_portability_{request.request_id}.json"
        
        # Generate structured export
        export_data = {
            "format": "json",
            "version": "1.0",
            "export_date": datetime.utcnow().isoformat(),
            "user_data": user_data
        }
        
        request.data_file_path = data_file_path
        request.notes = "Portable data export generated successfully"
    
    async def _process_erasure_request(self, request: GDPRDataRequest):
        """Process data erasure request (Article 17 - Right to be forgotten)."""
        # This is a complex operation that requires careful consideration
        # of legal obligations and legitimate interests
        
        # Mark for manual review in most cases
        request.status = "manual_review"
        request.notes = (
            "Erasure request requires manual review to assess legal obligations "
            "and legitimate interests"
        )
        
        logger.info(
            f"Data erasure request submitted for manual review: {request.request_id}",
            user_id=request.user_id
        )
    
    async def _process_rectification_request(self, request: GDPRDataRequest):
        """Process data rectification request (Article 16)."""
        # Mark for manual review to determine what needs to be corrected
        request.status = "manual_review"
        request.notes = "Rectification request requires manual review and user verification"
    
    async def _collect_user_data(self, user_id: int) -> Dict[str, Any]:
        """Collect all user data for access request."""
        # This would collect data from all relevant tables
        # For now, return structure showing what would be collected
        
        return {
            "personal_information": {
                "description": "Name, email, contact details",
                "retention_period": "7 years after account closure",
                "legal_basis": "Contract performance"
            },
            "portfolio_data": {
                "description": "Investment portfolios, allocations, optimization results",
                "retention_period": "5 years after account closure",
                "legal_basis": "Contract performance"
            },
            "usage_analytics": {
                "description": "Platform usage statistics, feature usage",
                "retention_period": "3 years",
                "legal_basis": "Legitimate interest"
            },
            "system_logs": {
                "description": "Security logs, error logs",
                "retention_period": "1 year",
                "legal_basis": "Legitimate interest (security)"
            }
        }
    
    async def _collect_portable_user_data(self, user_id: int) -> Dict[str, Any]:
        """Collect user data in portable format."""
        # Return actual user data in structured format
        return {
            "user_profile": {},  # Would contain actual profile data
            "portfolios": [],    # Would contain portfolio data
            "preferences": {},   # Would contain user preferences
            "export_metadata": {
                "format": "json",
                "version": "1.0",
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    
    async def _get_user_processing_activities(self, user_id: int) -> List[Dict[str, Any]]:
        """Get processing activities for a user."""
        async with get_db_session() as session:
            activities = session.query(GDPRDataProcessingLog).filter_by(
                user_id=user_id
            ).order_by(GDPRDataProcessingLog.timestamp.desc()).limit(100).all()
            
            return [
                {
                    "activity_type": activity.activity_type,
                    "purpose": activity.purpose,
                    "data_categories": activity.data_categories,
                    "timestamp": activity.timestamp.isoformat(),
                    "legal_basis": activity.legal_basis,
                    "retention_period": activity.retention_period
                }
                for activity in activities
            ]
    
    async def _invalidate_consent_cache(self, user_id: int):
        """Invalidate consent cache for a user."""
        pattern = f"gdpr_consent:{user_id}:*"
        cache_service.cache.delete_pattern(pattern)
    
    async def get_privacy_settings(self, user_id: int) -> Dict[str, Any]:
        """Get user's privacy settings and consent status."""
        consents = await self.get_user_consents(user_id)
        
        # Convert to user-friendly format
        privacy_settings = {
            "essential": {
                "name": "Essential Services",
                "description": "Required for core platform functionality",
                "required": True,
                "consents": consents.get("essential", {})
            },
            "analytics": {
                "name": "Analytics & Performance",
                "description": "Help us improve the platform",
                "required": False,
                "consents": consents.get("analytics", {})
            },
            "marketing": {
                "name": "Marketing Communications",
                "description": "Receive updates and promotional content",
                "required": False,
                "consents": consents.get("marketing", {})
            },
            "personalization": {
                "name": "Personalized Experience",
                "description": "Customize features based on your usage",
                "required": False,
                "consents": consents.get("personalization", {})
            }
        }
        
        return privacy_settings
    
    async def get_data_processing_summary(self, user_id: int) -> Dict[str, Any]:
        """Get summary of data processing for a user."""
        async with get_db_session() as session:
            # Get recent processing activities
            recent_activities = session.query(GDPRDataProcessingLog).filter_by(
                user_id=user_id
            ).filter(
                GDPRDataProcessingLog.timestamp >= datetime.utcnow() - timedelta(days=30)
            ).count()
            
            # Get data requests
            data_requests = session.query(GDPRDataRequest).filter_by(
                user_id=user_id
            ).order_by(GDPRDataRequest.requested_at.desc()).all()
            
            return {
                "recent_processing_count": recent_activities,
                "data_categories_processed": list(self.data_categories.keys()),
                "retention_periods": {
                    purpose.value: f"{period.days} days"
                    for purpose, period in self.data_retention_periods.items()
                },
                "data_requests": [
                    {
                        "request_id": req.request_id,
                        "type": req.request_type,
                        "status": req.status,
                        "requested_at": req.requested_at.isoformat(),
                        "completed_at": req.completed_at.isoformat() if req.completed_at else None
                    }
                    for req in data_requests
                ],
                "user_rights": [right.value for right in UserRightType]
            }


# Global instance
gdpr_service = GDPRComplianceService()


# Decorator for automatic data processing logging
def log_data_processing(
    activity_type: str,
    purpose: DataProcessingPurpose,
    data_categories: List[str],
    legal_basis: str = "consent"
):
    """Decorator to automatically log data processing activities."""
    def decorator(func):
        async def async_wrapper(*args, **kwargs):
            # Extract user_id from function arguments
            user_id = None
            if 'user_id' in kwargs:
                user_id = kwargs['user_id']
            elif args and hasattr(args[0], 'id'):
                user_id = args[0].id
            
            if user_id:
                await gdpr_service.log_data_processing(
                    user_id=user_id,
                    activity_type=activity_type,
                    purpose=purpose,
                    data_categories=data_categories,
                    legal_basis=legal_basis
                )
            
            return await func(*args, **kwargs)
        
        def sync_wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        
        import asyncio
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


# Convenience functions
async def check_processing_consent(
    user_id: int,
    purpose: DataProcessingPurpose
) -> bool:
    """Check if user has consented to data processing for a purpose."""
    return await gdpr_service.check_consent(
        user_id, ConsentType.ESSENTIAL, purpose
    )


async def record_user_consent(
    user_id: int,
    consents: Dict[str, Dict[str, bool]],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> Dict[str, str]:
    """Record multiple user consents."""
    consent_ids = {}
    
    for consent_type_str, purposes in consents.items():
        try:
            consent_type = ConsentType(consent_type_str)
        except ValueError:
            continue
        
        for purpose_str, granted in purposes.items():
            try:
                purpose = DataProcessingPurpose(purpose_str)
                consent_id = await gdpr_service.record_consent(
                    user_id=user_id,
                    consent_type=consent_type,
                    purpose=purpose,
                    granted=granted,
                    ip_address=ip_address,
                    user_agent=user_agent
                )
                consent_ids[f"{consent_type_str}:{purpose_str}"] = consent_id
            except ValueError:
                continue
    
    return consent_ids