"""
GDPR Compliance API Endpoints

This module provides API endpoints for GDPR compliance including consent management,
data requests, privacy settings, and user rights implementation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, EmailStr

from app.services.gdpr_compliance import (
    gdpr_service,
    ConsentType,
    DataProcessingPurpose,
    UserRightType,
    record_user_consent,
    check_processing_consent
)
from app.core.auth import get_current_user
from app.core.logging import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/gdpr", tags=["GDPR Compliance"])


# Pydantic models
class ConsentRequest(BaseModel):
    """Request model for recording consent."""
    consent_type: str = Field(..., description="Type of consent (essential, analytics, marketing, etc.)")
    purpose: str = Field(..., description="Purpose for data processing")
    granted: bool = Field(..., description="Whether consent is granted")


class BulkConsentRequest(BaseModel):
    """Request model for recording multiple consents."""
    consents: Dict[str, Dict[str, bool]] = Field(
        ..., 
        description="Nested dictionary of consent_type -> purpose -> granted",
        example={
            "analytics": {
                "service_provision": True,
                "analytics": False
            },
            "marketing": {
                "marketing": False
            }
        }
    )


class DataRequestSubmission(BaseModel):
    """Request model for submitting GDPR data requests."""
    request_type: str = Field(..., description="Type of request (access, erasure, portability, etc.)")
    details: Optional[str] = Field(None, description="Additional details about the request")
    contact_email: Optional[EmailStr] = Field(None, description="Contact email for the request")


class PrivacySettings(BaseModel):
    """Model for privacy settings."""
    analytics_consent: bool = Field(..., description="Consent for analytics")
    marketing_consent: bool = Field(..., description="Consent for marketing")
    personalization_consent: bool = Field(..., description="Consent for personalization")
    third_party_consent: bool = Field(..., description="Consent for third-party integrations")


class ConsentResponse(BaseModel):
    """Response model for consent operations."""
    success: bool
    consent_id: Optional[str] = None
    message: str
    timestamp: str


class DataRequestResponse(BaseModel):
    """Response model for data requests."""
    request_id: str
    request_type: str
    status: str
    submitted_at: str
    estimated_completion: Optional[str] = None


# Consent management endpoints
@router.post(
    "/consent",
    response_model=ConsentResponse,
    summary="Record User Consent",
    description="Record a single consent decision for data processing"
)
async def record_consent(
    consent_request: ConsentRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Record a single consent decision."""
    try:
        # Validate consent type and purpose
        try:
            consent_type = ConsentType(consent_request.consent_type)
            purpose = DataProcessingPurpose(consent_request.purpose)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid consent type or purpose: {str(e)}"
            )
        
        # Extract client information
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Record consent
        consent_id = await gdpr_service.record_consent(
            user_id=current_user.id,
            consent_type=consent_type,
            purpose=purpose,
            granted=consent_request.granted,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return ConsentResponse(
            success=True,
            consent_id=consent_id,
            message=f"Consent {'granted' if consent_request.granted else 'withdrawn'} successfully",
            timestamp=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Error recording consent for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record consent"
        )


@router.post(
    "/consent/bulk",
    response_model=Dict[str, ConsentResponse],
    summary="Record Multiple Consents",
    description="Record multiple consent decisions in a single request"
)
async def record_bulk_consent(
    bulk_consent: BulkConsentRequest,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Record multiple consent decisions."""
    try:
        # Extract client information
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Record all consents
        consent_ids = await record_user_consent(
            user_id=current_user.id,
            consents=bulk_consent.consents,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        # Build response
        responses = {}
        for key, consent_id in consent_ids.items():
            responses[key] = ConsentResponse(
                success=True,
                consent_id=consent_id,
                message="Consent recorded successfully",
                timestamp=datetime.utcnow().isoformat()
            )
        
        return responses
        
    except Exception as e:
        logger.error(f"Error recording bulk consent for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to record consents"
        )


@router.get(
    "/consent",
    summary="Get User Consents",
    description="Get all consent decisions for the current user"
)
async def get_user_consents(current_user = Depends(get_current_user)):
    """Get all consents for the current user."""
    try:
        consents = await gdpr_service.get_user_consents(current_user.id)
        
        return {
            "user_id": current_user.id,
            "consents": consents,
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving consents for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve consents"
        )


@router.get(
    "/consent/check/{consent_type}/{purpose}",
    summary="Check Specific Consent",
    description="Check if user has granted consent for specific processing"
)
async def check_consent(
    consent_type: str,
    purpose: str,
    current_user = Depends(get_current_user)
):
    """Check if user has granted specific consent."""
    try:
        # Validate parameters
        try:
            consent_type_enum = ConsentType(consent_type)
            purpose_enum = DataProcessingPurpose(purpose)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid consent type or purpose: {str(e)}"
            )
        
        # Check consent
        granted = await gdpr_service.check_consent(
            current_user.id,
            consent_type_enum,
            purpose_enum
        )
        
        return {
            "user_id": current_user.id,
            "consent_type": consent_type,
            "purpose": purpose,
            "granted": granted,
            "checked_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking consent for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check consent"
        )


# Data request endpoints
@router.post(
    "/data-request",
    response_model=DataRequestResponse,
    summary="Submit Data Request",
    description="Submit a GDPR data request (access, erasure, portability, etc.)"
)
async def submit_data_request(
    data_request: DataRequestSubmission,
    current_user = Depends(get_current_user)
):
    """Submit a GDPR data request."""
    try:
        # Validate request type
        try:
            request_type = UserRightType(data_request.request_type)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid request type: {data_request.request_type}"
            )
        
        # Submit request
        request_id = await gdpr_service.submit_data_request(
            user_id=current_user.id,
            request_type=request_type,
            metadata={
                "details": data_request.details,
                "contact_email": data_request.contact_email
            }
        )
        
        # Calculate estimated completion time
        estimated_completion = None
        if request_type in [UserRightType.ACCESS, UserRightType.PORTABILITY]:
            estimated_completion = (datetime.utcnow() + timedelta(days=30)).isoformat()
        
        return DataRequestResponse(
            request_id=request_id,
            request_type=data_request.request_type,
            status="submitted",
            submitted_at=datetime.utcnow().isoformat(),
            estimated_completion=estimated_completion
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting data request for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit data request"
        )


@router.get(
    "/data-requests",
    summary="Get Data Requests",
    description="Get all data requests submitted by the current user"
)
async def get_data_requests(current_user = Depends(get_current_user)):
    """Get all data requests for the current user."""
    try:
        # This would fetch from database in actual implementation
        summary = await gdpr_service.get_data_processing_summary(current_user.id)
        
        return {
            "user_id": current_user.id,
            "data_requests": summary.get("data_requests", []),
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving data requests for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve data requests"
        )


@router.get(
    "/data-request/{request_id}/status",
    summary="Get Data Request Status",
    description="Get the status of a specific data request"
)
async def get_data_request_status(
    request_id: str,
    current_user = Depends(get_current_user)
):
    """Get status of a specific data request."""
    try:
        # In actual implementation, verify user owns the request
        # and fetch from database
        
        return {
            "request_id": request_id,
            "user_id": current_user.id,
            "status": "processing",
            "progress": 50,
            "estimated_completion": (datetime.utcnow() + timedelta(days=15)).isoformat(),
            "last_updated": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving data request status: {request_id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve request status"
        )


# Privacy settings endpoints
@router.get(
    "/privacy-settings",
    summary="Get Privacy Settings",
    description="Get current privacy settings and consent status"
)
async def get_privacy_settings(current_user = Depends(get_current_user)):
    """Get user's privacy settings."""
    try:
        privacy_settings = await gdpr_service.get_privacy_settings(current_user.id)
        
        return {
            "user_id": current_user.id,
            "privacy_settings": privacy_settings,
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving privacy settings for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve privacy settings"
        )


@router.put(
    "/privacy-settings",
    summary="Update Privacy Settings",
    description="Update privacy settings and consent preferences"
)
async def update_privacy_settings(
    settings: PrivacySettings,
    request: Request,
    current_user = Depends(get_current_user)
):
    """Update user's privacy settings."""
    try:
        # Convert settings to consent format
        consents = {
            "analytics": {
                "analytics": settings.analytics_consent
            },
            "marketing": {
                "marketing": settings.marketing_consent
            },
            "personalization": {
                "service_provision": settings.personalization_consent
            },
            "third_party": {
                "service_provision": settings.third_party_consent
            }
        }
        
        # Extract client information
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
        
        # Record consents
        consent_ids = await record_user_consent(
            user_id=current_user.id,
            consents=consents,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        return {
            "success": True,
            "message": "Privacy settings updated successfully",
            "consent_ids": consent_ids,
            "updated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error updating privacy settings for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update privacy settings"
        )


# Data processing information endpoints
@router.get(
    "/processing-summary",
    summary="Get Data Processing Summary",
    description="Get summary of data processing activities for the user"
)
async def get_processing_summary(current_user = Depends(get_current_user)):
    """Get data processing summary for the user."""
    try:
        summary = await gdpr_service.get_data_processing_summary(current_user.id)
        
        return {
            "user_id": current_user.id,
            "processing_summary": summary,
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving processing summary for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve processing summary"
        )


@router.get(
    "/data-categories",
    summary="Get Data Categories",
    description="Get information about data categories processed by the system"
)
async def get_data_categories():
    """Get information about data categories."""
    return {
        "data_categories": gdpr_service.data_categories,
        "retention_periods": {
            purpose.value: f"{period.days} days"
            for purpose, period in gdpr_service.data_retention_periods.items()
        },
        "legal_bases": [
            "consent",
            "contract",
            "legal_obligation",
            "vital_interests",
            "public_task",
            "legitimate_interests"
        ],
        "retrieved_at": datetime.utcnow().isoformat()
    }


@router.get(
    "/user-rights",
    summary="Get User Rights Information",
    description="Get information about GDPR user rights"
)
async def get_user_rights():
    """Get information about GDPR user rights."""
    return {
        "user_rights": {
            "access": {
                "name": "Right of Access",
                "description": "Right to obtain confirmation of data processing and access to personal data",
                "article": "Article 15"
            },
            "rectification": {
                "name": "Right to Rectification",
                "description": "Right to correct inaccurate or incomplete personal data",
                "article": "Article 16"
            },
            "erasure": {
                "name": "Right to Erasure (Right to be Forgotten)",
                "description": "Right to request deletion of personal data under certain circumstances",
                "article": "Article 17"
            },
            "restriction": {
                "name": "Right to Restriction of Processing",
                "description": "Right to limit the processing of personal data under certain circumstances",
                "article": "Article 18"
            },
            "portability": {
                "name": "Right to Data Portability",
                "description": "Right to receive personal data in a structured, machine-readable format",
                "article": "Article 20"
            },
            "objection": {
                "name": "Right to Object",
                "description": "Right to object to processing of personal data under certain circumstances",
                "article": "Article 21"
            }
        },
        "how_to_exercise": "Submit a request through the /gdpr/data-request endpoint or contact our privacy team",
        "response_time": "30 days (may be extended by 2 additional months for complex requests)",
        "retrieved_at": datetime.utcnow().isoformat()
    }


# Cookie consent endpoints
@router.get(
    "/cookie-settings",
    summary="Get Cookie Settings",
    description="Get current cookie consent settings"
)
async def get_cookie_settings(current_user = Depends(get_current_user)):
    """Get cookie consent settings."""
    try:
        # Check various cookie-related consents
        essential_consent = await gdpr_service.check_consent(
            current_user.id, ConsentType.ESSENTIAL, DataProcessingPurpose.SERVICE_PROVISION
        )
        analytics_consent = await gdpr_service.check_consent(
            current_user.id, ConsentType.ANALYTICS, DataProcessingPurpose.ANALYTICS
        )
        marketing_consent = await gdpr_service.check_consent(
            current_user.id, ConsentType.MARKETING, DataProcessingPurpose.MARKETING
        )
        
        return {
            "user_id": current_user.id,
            "cookie_settings": {
                "essential": {
                    "enabled": essential_consent,
                    "required": True,
                    "description": "Required for basic site functionality"
                },
                "analytics": {
                    "enabled": analytics_consent,
                    "required": False,
                    "description": "Help us improve the site with usage analytics"
                },
                "marketing": {
                    "enabled": marketing_consent,
                    "required": False,
                    "description": "Personalized marketing and advertisements"
                }
            },
            "retrieved_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error retrieving cookie settings for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve cookie settings"
        )


# Utility endpoint for checking processing consent
@router.get(
    "/can-process/{purpose}",
    summary="Check Processing Permission",
    description="Check if data can be processed for a specific purpose"
)
async def can_process_data(
    purpose: str,
    current_user = Depends(get_current_user)
):
    """Check if data can be processed for a specific purpose."""
    try:
        # Validate purpose
        try:
            purpose_enum = DataProcessingPurpose(purpose)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid processing purpose: {purpose}"
            )
        
        # Check consent
        can_process = await check_processing_consent(current_user.id, purpose_enum)
        
        return {
            "user_id": current_user.id,
            "purpose": purpose,
            "can_process": can_process,
            "checked_at": datetime.utcnow().isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking processing consent for user {current_user.id}", error=e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check processing consent"
        )