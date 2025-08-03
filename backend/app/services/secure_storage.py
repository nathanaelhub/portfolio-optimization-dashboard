"""
Secure storage service for sensitive files and documents.

Implements encrypted file storage with access controls, audit logging,
and secure file operations for portfolio documents and user uploads.
"""

import os
import hashlib
import secrets
from typing import Dict, Any, Optional, List, BinaryIO
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dataclasses import dataclass
from enum import Enum
import logging
import mimetypes
import tempfile

from sqlalchemy.orm import Session
from redis import Redis

from app.security.encryption import get_encryption_service, EncryptionService
from app.security.validators import SecurityValidator
from app.core.config import settings

logger = logging.getLogger(__name__)

# File storage configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {
    '.pdf', '.csv', '.xlsx', '.xls', '.json', '.txt',
    '.png', '.jpg', '.jpeg', '.doc', '.docx'
}
QUARANTINE_DAYS = 30
TEMP_FILE_CLEANUP_HOURS = 24


class FileCategory(Enum):
    """Categories of files for storage organization."""
    
    PORTFOLIO_IMPORT = "portfolio_import"    # CSV/Excel portfolio imports
    FINANCIAL_REPORT = "financial_report"   # Generated reports and exports
    USER_DOCUMENT = "user_document"         # User-uploaded documents
    SYSTEM_BACKUP = "system_backup"         # System-generated backups
    COMPLIANCE_DOC = "compliance_doc"       # Compliance and audit documents
    TEMP_FILE = "temp_file"                 # Temporary processing files


class FileAccessLevel(Enum):
    """Access levels for file security."""
    
    PRIVATE = "private"           # User can only access their own files
    SHARED = "shared"             # File can be shared with specific users
    ADMIN_ONLY = "admin_only"     # Only administrators can access
    PUBLIC = "public"             # Public access (not recommended for sensitive data)


@dataclass
class StoredFile:
    """Metadata for a stored file."""
    
    file_id: str
    original_filename: str
    storage_path: str
    file_size: int
    content_type: str
    category: FileCategory
    access_level: FileAccessLevel
    owner_user_id: int
    encryption_key_id: str
    file_hash: str
    created_at: datetime
    accessed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    is_quarantined: bool = False
    metadata: Dict[str, Any] = None


class SecureFileStorage:
    """
    Secure file storage implementation.
    
    Provides encrypted file storage with access controls,
    virus scanning, and comprehensive audit logging.
    """
    
    def __init__(self, encryption_service: EncryptionService, storage_base_path: str):
        self.encryption_service = encryption_service
        self.storage_base_path = Path(storage_base_path)
        self.quarantine_path = self.storage_base_path / "quarantine"
        self.temp_path = self.storage_base_path / "temp"
        
        # Ensure storage directories exist
        self._ensure_directories()
    
    def _ensure_directories(self) -> None:
        """Create necessary storage directories."""
        directories = [
            self.storage_base_path,
            self.quarantine_path,
            self.temp_path,
            self.storage_base_path / "portfolio_import",
            self.storage_base_path / "financial_report",
            self.storage_base_path / "user_document",
            self.storage_base_path / "system_backup",
            self.storage_base_path / "compliance_doc"
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
            
            # Set restrictive permissions (owner read/write only)
            os.chmod(directory, 0o700)
    
    def store_file(
        self,
        file_data: bytes,
        original_filename: str,
        category: FileCategory,
        owner_user_id: int,
        access_level: FileAccessLevel = FileAccessLevel.PRIVATE,
        metadata: Dict[str, Any] = None,
        expires_in_days: Optional[int] = None
    ) -> StoredFile:
        """
        Store file securely with encryption.
        
        Args:
            file_data: File content as bytes
            original_filename: Original filename
            category: File category for organization
            owner_user_id: ID of file owner
            access_level: Access control level
            metadata: Additional file metadata
            expires_in_days: Optional expiration in days
            
        Returns:
            StoredFile metadata object
            
        Raises:
            ValueError: If file validation fails
            SecurityError: If security checks fail
        """
        # Validate file
        self._validate_file(file_data, original_filename)
        
        # Generate unique file ID
        file_id = f"{category.value}_{secrets.token_hex(16)}"
        
        # Calculate file hash for integrity checking
        file_hash = hashlib.sha256(file_data).hexdigest()
        
        # Detect content type
        content_type = mimetypes.guess_type(original_filename)[0] or 'application/octet-stream'
        
        # Encrypt file
        encrypted_file_data = self.encryption_service.encrypt_uploaded_file(
            file_data, original_filename, owner_user_id
        )
        
        # Determine storage path
        storage_subdir = self.storage_base_path / category.value
        storage_filename = f"{file_id}.enc"
        storage_path = storage_subdir / storage_filename
        
        # Store encrypted file
        with open(storage_path, 'wb') as f:
            # Store encrypted file data as JSON
            import json
            f.write(json.dumps(encrypted_file_data).encode('utf-8'))
        
        # Set restrictive file permissions
        os.chmod(storage_path, 0o600)
        
        # Calculate expiration
        expires_at = None
        if expires_in_days:
            expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
        
        # Create file metadata
        stored_file = StoredFile(
            file_id=file_id,
            original_filename=SecurityValidator.sanitize_string(original_filename, 255),
            storage_path=str(storage_path),
            file_size=len(file_data),
            content_type=content_type,
            category=category,
            access_level=access_level,
            owner_user_id=owner_user_id,
            encryption_key_id=encrypted_file_data["key_id"],
            file_hash=file_hash,
            created_at=datetime.now(timezone.utc),
            expires_at=expires_at,
            metadata=metadata or {}
        )
        
        logger.info(f"Stored encrypted file: {file_id} for user {owner_user_id}")
        
        return stored_file
    
    def retrieve_file(
        self,
        file_id: str,
        requesting_user_id: int,
        update_access_time: bool = True
    ) -> tuple[bytes, StoredFile]:
        """
        Retrieve and decrypt file.
        
        Args:
            file_id: File identifier
            requesting_user_id: ID of user requesting file
            update_access_time: Whether to update access timestamp
            
        Returns:
            Tuple of (file_data, file_metadata)
            
        Raises:
            FileNotFoundError: If file doesn't exist
            PermissionError: If user lacks access
            SecurityError: If file is corrupted or quarantined
        """
        # This would normally load from database
        # For now, we'll reconstruct from storage path
        stored_file = self._find_stored_file(file_id)
        
        if not stored_file:
            raise FileNotFoundError(f"File not found: {file_id}")
        
        # Check access permissions
        if not self._check_file_access(stored_file, requesting_user_id):
            raise PermissionError(f"Access denied to file: {file_id}")
        
        # Check if file is quarantined
        if stored_file.is_quarantined:
            raise SecurityError(f"File is quarantined: {file_id}")
        
        # Check expiration
        if stored_file.expires_at and stored_file.expires_at < datetime.now(timezone.utc):
            raise FileNotFoundError(f"File has expired: {file_id}")
        
        # Load encrypted file data
        with open(stored_file.storage_path, 'rb') as f:
            import json
            encrypted_file_data = json.loads(f.read().decode('utf-8'))
        
        # Decrypt file
        file_data, metadata = self.encryption_service.decrypt_uploaded_file(
            encrypted_file_data, stored_file.owner_user_id
        )
        
        # Verify file integrity
        calculated_hash = hashlib.sha256(file_data).hexdigest()
        if calculated_hash != stored_file.file_hash:
            logger.error(f"File integrity check failed for {file_id}")
            self._quarantine_file(stored_file)
            raise SecurityError(f"File integrity check failed: {file_id}")
        
        # Update access time if requested
        if update_access_time:
            stored_file.accessed_at = datetime.now(timezone.utc)
            # In real implementation, this would update the database
        
        logger.info(f"Retrieved file: {file_id} for user {requesting_user_id}")
        
        return file_data, stored_file
    
    def delete_file(self, file_id: str, requesting_user_id: int, secure_delete: bool = True) -> bool:
        """
        Delete file securely.
        
        Args:
            file_id: File identifier
            requesting_user_id: ID of user requesting deletion
            secure_delete: Whether to perform secure deletion
            
        Returns:
            True if file was deleted successfully
        """
        stored_file = self._find_stored_file(file_id)
        
        if not stored_file:
            return False
        
        # Check deletion permissions (owner or admin)
        if not self._check_delete_permission(stored_file, requesting_user_id):
            raise PermissionError(f"Delete permission denied for file: {file_id}")
        
        try:
            if secure_delete:
                self._secure_delete_file(Path(stored_file.storage_path))
            else:
                os.remove(stored_file.storage_path)
            
            # In real implementation, remove from database here
            
            logger.info(f"Deleted file: {file_id} by user {requesting_user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to delete file {file_id}: {e}")
            return False
    
    def list_user_files(
        self,
        user_id: int,
        category: Optional[FileCategory] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[StoredFile]:
        """
        List files accessible to user.
        
        Args:
            user_id: User ID
            category: Optional category filter
            limit: Maximum files to return
            offset: Number of files to skip
            
        Returns:
            List of accessible files
        """
        # This would normally query the database
        # For now, return empty list as placeholder
        return []
    
    def get_file_info(self, file_id: str, requesting_user_id: int) -> Optional[StoredFile]:
        """
        Get file metadata without retrieving content.
        
        Args:
            file_id: File identifier
            requesting_user_id: ID of requesting user
            
        Returns:
            File metadata if accessible
        """
        stored_file = self._find_stored_file(file_id)
        
        if not stored_file:
            return None
        
        if not self._check_file_access(stored_file, requesting_user_id):
            return None
        
        return stored_file
    
    def cleanup_expired_files(self) -> int:
        """
        Clean up expired files.
        
        Returns:
            Number of files cleaned up
        """
        cleaned_count = 0
        current_time = datetime.now(timezone.utc)
        
        # This would normally query database for expired files
        # For now, scan temp directory for old files
        
        for temp_file in self.temp_path.glob("*"):
            try:
                # Check file age
                file_age = current_time - datetime.fromtimestamp(temp_file.stat().st_mtime, timezone.utc)
                
                if file_age > timedelta(hours=TEMP_FILE_CLEANUP_HOURS):
                    self._secure_delete_file(temp_file)
                    cleaned_count += 1
                    
            except Exception as e:
                logger.error(f"Failed to clean up temp file {temp_file}: {e}")
        
        if cleaned_count > 0:
            logger.info(f"Cleaned up {cleaned_count} expired files")
        
        return cleaned_count
    
    def _validate_file(self, file_data: bytes, filename: str) -> None:
        """Validate file for security and policy compliance."""
        # Check file size
        if len(file_data) > MAX_FILE_SIZE:
            raise ValueError(f"File too large: {len(file_data)} bytes > {MAX_FILE_SIZE} bytes")
        
        # Check file extension
        file_ext = Path(filename).suffix.lower()
        if file_ext not in ALLOWED_EXTENSIONS:
            raise ValueError(f"File type not allowed: {file_ext}")
        
        # Basic malware detection (check for suspicious patterns)
        suspicious_patterns = [
            b'<script',
            b'javascript:',
            b'vbscript:',
            b'<?php',
            b'<%',
            b'<iframe'
        ]
        
        file_lower = file_data.lower()
        for pattern in suspicious_patterns:
            if pattern in file_lower:
                raise SecurityError(f"Suspicious content detected in file: {filename}")
        
        # Validate filename
        if not SecurityValidator.sanitize_string(filename, 255):
            raise ValueError("Invalid filename")
    
    def _find_stored_file(self, file_id: str) -> Optional[StoredFile]:
        """Find stored file by ID (placeholder - would query database)."""
        # This would normally query the database
        # For now, try to find file in storage directories
        
        for category in FileCategory:
            storage_path = self.storage_base_path / category.value / f"{file_id}.enc"
            if storage_path.exists():
                # Reconstruct metadata (in production, this comes from database)
                return StoredFile(
                    file_id=file_id,
                    original_filename="unknown",
                    storage_path=str(storage_path),
                    file_size=0,
                    content_type="application/octet-stream",
                    category=category,
                    access_level=FileAccessLevel.PRIVATE,
                    owner_user_id=1,  # Placeholder
                    encryption_key_id="unknown",
                    file_hash="unknown",
                    created_at=datetime.now(timezone.utc)
                )
        
        return None
    
    def _check_file_access(self, stored_file: StoredFile, user_id: int) -> bool:
        """Check if user has access to file."""
        # Owner always has access
        if stored_file.owner_user_id == user_id:
            return True
        
        # Check access level
        if stored_file.access_level == FileAccessLevel.PRIVATE:
            return False
        
        if stored_file.access_level == FileAccessLevel.PUBLIC:
            return True
        
        if stored_file.access_level == FileAccessLevel.ADMIN_ONLY:
            # This would check if user is admin
            return False  # Placeholder
        
        if stored_file.access_level == FileAccessLevel.SHARED:
            # This would check shared access permissions
            return False  # Placeholder
        
        return False
    
    def _check_delete_permission(self, stored_file: StoredFile, user_id: int) -> bool:
        """Check if user can delete file."""
        # Owner can delete
        if stored_file.owner_user_id == user_id:
            return True
        
        # Admin can delete (would check admin role)
        return False
    
    def _quarantine_file(self, stored_file: StoredFile) -> None:
        """Move file to quarantine."""
        try:
            quarantine_path = self.quarantine_path / f"{stored_file.file_id}.enc"
            
            # Move file to quarantine
            os.rename(stored_file.storage_path, quarantine_path)
            
            # Update metadata
            stored_file.is_quarantined = True
            stored_file.storage_path = str(quarantine_path)
            
            logger.warning(f"File quarantined: {stored_file.file_id}")
            
        except Exception as e:
            logger.error(f"Failed to quarantine file {stored_file.file_id}: {e}")
    
    def _secure_delete_file(self, file_path: Path) -> None:
        """Securely delete file by overwriting with random data."""
        try:
            if not file_path.exists():
                return
            
            file_size = file_path.stat().st_size
            
            # Overwrite file with random data 3 times
            with open(file_path, 'r+b') as f:
                for _ in range(3):
                    f.seek(0)
                    f.write(secrets.token_bytes(file_size))
                    f.flush()
                    os.fsync(f.fileno())
            
            # Finally remove the file
            file_path.unlink()
            
        except Exception as e:
            logger.error(f"Secure delete failed for {file_path}: {e}")
            # Fall back to regular deletion
            try:
                file_path.unlink()
            except:
                pass


class DocumentManager:
    """
    High-level document management service.
    
    Provides business logic for managing portfolio documents,
    reports, and user uploads with proper access controls.
    """
    
    def __init__(self, storage: SecureFileStorage, db: Session):
        self.storage = storage
        self.db = db
    
    def upload_portfolio_file(
        self,
        file_data: bytes,
        filename: str,
        user_id: int,
        portfolio_id: Optional[int] = None
    ) -> StoredFile:
        """
        Upload portfolio-related file.
        
        Args:
            file_data: File content
            filename: Original filename
            user_id: User ID
            portfolio_id: Optional portfolio association
            
        Returns:
            Stored file metadata
        """
        metadata = {
            "uploaded_by": user_id,
            "portfolio_id": portfolio_id,
            "upload_timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        # Determine category based on file type
        file_ext = Path(filename).suffix.lower()
        if file_ext in ['.csv', '.xlsx', '.xls']:
            category = FileCategory.PORTFOLIO_IMPORT
        else:
            category = FileCategory.USER_DOCUMENT
        
        return self.storage.store_file(
            file_data=file_data,
            original_filename=filename,
            category=category,
            owner_user_id=user_id,
            access_level=FileAccessLevel.PRIVATE,
            metadata=metadata,
            expires_in_days=365  # 1 year retention
        )
    
    def generate_portfolio_report(
        self,
        portfolio_data: Dict[str, Any],
        user_id: int,
        report_type: str = "pdf"
    ) -> StoredFile:
        """
        Generate and store portfolio report.
        
        Args:
            portfolio_data: Portfolio data for report
            user_id: User ID
            report_type: Type of report to generate
            
        Returns:
            Stored report file
        """
        # Generate report (placeholder implementation)
        report_content = self._generate_report_content(portfolio_data, report_type)
        
        filename = f"portfolio_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.{report_type}"
        
        metadata = {
            "report_type": report_type,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "portfolio_count": len(portfolio_data.get("portfolios", [])),
            "generated_by": user_id
        }
        
        return self.storage.store_file(
            file_data=report_content,
            original_filename=filename,
            category=FileCategory.FINANCIAL_REPORT,
            owner_user_id=user_id,
            access_level=FileAccessLevel.PRIVATE,
            metadata=metadata,
            expires_in_days=90  # 3 months retention for reports
        )
    
    def share_file_with_user(
        self,
        file_id: str,
        owner_user_id: int,
        target_user_id: int,
        access_duration_days: int = 30
    ) -> bool:
        """
        Share file with another user.
        
        Args:
            file_id: File to share
            owner_user_id: File owner
            target_user_id: User to share with
            access_duration_days: How long access should last
            
        Returns:
            True if sharing was successful
        """
        stored_file = self.storage.get_file_info(file_id, owner_user_id)
        
        if not stored_file:
            return False
        
        # In real implementation, this would create a sharing record in the database
        logger.info(f"File {file_id} shared by user {owner_user_id} with user {target_user_id}")
        
        return True
    
    def get_user_storage_usage(self, user_id: int) -> Dict[str, Any]:
        """
        Get storage usage statistics for user.
        
        Args:
            user_id: User ID
            
        Returns:
            Storage usage statistics
        """
        # This would query the database for user's files
        return {
            "total_files": 0,
            "total_size_bytes": 0,
            "files_by_category": {},
            "oldest_file": None,
            "newest_file": None,
            "storage_limit_bytes": 100 * 1024 * 1024,  # 100MB default limit
            "usage_percentage": 0.0
        }
    
    def _generate_report_content(self, portfolio_data: Dict[str, Any], report_type: str) -> bytes:
        """Generate report content (placeholder)."""
        if report_type == "pdf":
            # In real implementation, this would generate a PDF report
            return b"PDF report content placeholder"
        elif report_type == "csv":
            # Generate CSV content
            return b"CSV report content placeholder"
        else:
            return b"Report content placeholder"


class SecurityError(Exception):
    """Security-related error in file operations."""
    pass


# Global storage service instance
_storage_service: Optional[SecureFileStorage] = None


def get_storage_service(encryption_service: EncryptionService = None) -> SecureFileStorage:
    """
    Get global storage service instance.
    
    Args:
        encryption_service: Encryption service instance
        
    Returns:
        Storage service instance
    """
    global _storage_service
    
    if _storage_service is None:
        if encryption_service is None:
            # Get default encryption service
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
        
        # Use configured storage path or default
        storage_path = getattr(settings, 'SECURE_STORAGE_PATH', '/var/lib/portfolio-app/storage')
        
        _storage_service = SecureFileStorage(encryption_service, storage_path)
        logger.info("Secure storage service initialized")
    
    return _storage_service