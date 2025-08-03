"""
Encrypted database fields for sensitive data storage.

Provides SQLAlchemy custom field types that automatically encrypt/decrypt
sensitive data when storing/retrieving from the database.
"""

import json
from typing import Any, Dict, Optional, Union
import logging

from sqlalchemy import TypeDecorator, Text, String, LargeBinary
from sqlalchemy.engine import Dialect
from sqlalchemy.orm import declarative_mixin

from app.security.encryption import get_encryption_service

logger = logging.getLogger(__name__)


class EncryptedType(TypeDecorator):
    """
    Base class for encrypted database field types.
    
    Automatically encrypts data when storing and decrypts when loading.
    Handles encryption errors gracefully and provides audit logging.
    """
    
    impl = Text
    cache_ok = True
    
    def __init__(self, field_name: str = None, **kwargs):
        """
        Initialize encrypted field type.
        
        Args:
            field_name: Field name for encryption context
            **kwargs: Additional SQLAlchemy arguments
        """
        self.field_name = field_name or "unknown_field"
        super().__init__(**kwargs)
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """
        Encrypt value before storing in database.
        
        Args:
            value: Raw value to encrypt
            dialect: SQLAlchemy dialect
            
        Returns:
            Encrypted value as JSON string
        """
        if value is None:
            return None
        
        try:
            # Get encryption service (Redis client would be injected in real implementation)
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
            
            # Convert value to string if needed
            if not isinstance(value, str):
                value = str(value)
            
            # Encrypt the value
            encrypted_data = encryption_service.encrypt_sensitive_field(value, self.field_name)
            
            # Return as JSON string for database storage
            return json.dumps(encrypted_data)
            
        except Exception as e:
            logger.error(f"Failed to encrypt field {self.field_name}: {e}")
            # In production, this might raise an exception instead of storing plaintext
            raise ValueError(f"Encryption failed for field {self.field_name}")
    
    def process_result_value(self, value: Optional[str], dialect: Dialect) -> Optional[str]:
        """
        Decrypt value after loading from database.
        
        Args:
            value: Encrypted value from database
            dialect: SQLAlchemy dialect
            
        Returns:
            Decrypted value
        """
        if value is None:
            return None
        
        try:
            # Parse encrypted data
            encrypted_data = json.loads(value)
            
            # Get encryption service
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
            
            # Decrypt the value
            decrypted_value = encryption_service.decrypt_sensitive_field(encrypted_data, self.field_name)
            
            return decrypted_value
            
        except Exception as e:
            logger.error(f"Failed to decrypt field {self.field_name}: {e}")
            # Return None for corrupted data rather than crashing
            return None


class EncryptedString(EncryptedType):
    """Encrypted string field for sensitive text data."""
    
    impl = Text
    
    def __init__(self, length: int = None, field_name: str = None, **kwargs):
        """
        Initialize encrypted string field.
        
        Args:
            length: Maximum string length
            field_name: Field name for encryption context
            **kwargs: Additional SQLAlchemy arguments
        """
        if length:
            self.impl = String(length)
        super().__init__(field_name=field_name, **kwargs)


class EncryptedJSON(EncryptedType):
    """Encrypted JSON field for complex data structures."""
    
    impl = Text
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """
        Serialize and encrypt JSON data.
        
        Args:
            value: Dictionary or JSON-serializable object
            dialect: SQLAlchemy dialect
            
        Returns:
            Encrypted JSON string
        """
        if value is None:
            return None
        
        try:
            # Get encryption service
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
            
            # Serialize to JSON first
            json_string = json.dumps(value, default=str)
            
            # Encrypt the JSON string
            encrypted_data = encryption_service.encrypt_sensitive_field(json_string, self.field_name)
            
            # Return as JSON string for database storage
            return json.dumps(encrypted_data)
            
        except Exception as e:
            logger.error(f"Failed to encrypt JSON field {self.field_name}: {e}")
            raise ValueError(f"JSON encryption failed for field {self.field_name}")
    
    def process_result_value(self, value: Optional[str], dialect: Dialect) -> Optional[Dict[str, Any]]:
        """
        Decrypt and deserialize JSON data.
        
        Args:
            value: Encrypted JSON from database
            dialect: SQLAlchemy dialect
            
        Returns:
            Deserialized dictionary
        """
        if value is None:
            return None
        
        try:
            # Parse encrypted data
            encrypted_data = json.loads(value)
            
            # Get encryption service
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
            
            # Decrypt the value
            decrypted_json = encryption_service.decrypt_sensitive_field(encrypted_data, self.field_name)
            
            # Parse JSON
            return json.loads(decrypted_json)
            
        except Exception as e:
            logger.error(f"Failed to decrypt JSON field {self.field_name}: {e}")
            return None


class EncryptedLargeBinary(EncryptedType):
    """Encrypted binary field for file data and large objects."""
    
    impl = LargeBinary
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[bytes]:
        """
        Encrypt binary data.
        
        Args:
            value: Binary data to encrypt
            dialect: SQLAlchemy dialect
            
        Returns:
            Encrypted binary data
        """
        if value is None:
            return None
        
        try:
            # Get encryption service
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
            
            # Convert to bytes if needed
            if isinstance(value, str):
                value = value.encode('utf-8')
            
            # For large binary data, we need to handle it differently
            # This is a simplified version - production would use the FileEncryption class
            encrypted_data = encryption_service.encrypt_sensitive_field(
                value.decode('utf-8', errors='ignore'), 
                self.field_name
            )
            
            # Return encrypted data as bytes
            return json.dumps(encrypted_data).encode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to encrypt binary field {self.field_name}: {e}")
            raise ValueError(f"Binary encryption failed for field {self.field_name}")
    
    def process_result_value(self, value: Optional[bytes], dialect: Dialect) -> Optional[bytes]:
        """
        Decrypt binary data.
        
        Args:
            value: Encrypted binary data from database
            dialect: SQLAlchemy dialect
            
        Returns:
            Decrypted binary data
        """
        if value is None:
            return None
        
        try:
            # Parse encrypted data
            encrypted_data = json.loads(value.decode('utf-8'))
            
            # Get encryption service
            from app.core.config import get_redis_client
            redis_client = get_redis_client()
            encryption_service = get_encryption_service(redis_client)
            
            # Decrypt the value
            decrypted_string = encryption_service.decrypt_sensitive_field(encrypted_data, self.field_name)
            
            return decrypted_string.encode('utf-8')
            
        except Exception as e:
            logger.error(f"Failed to decrypt binary field {self.field_name}: {e}")
            return None


class PersonallyIdentifiableData(EncryptedJSON):
    """Specialized encrypted field for PII data with user context."""
    
    def __init__(self, **kwargs):
        super().__init__(field_name="pii_data", **kwargs)
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """Encrypt PII data with additional user context."""
        if value is None:
            return None
        
        try:
            # Get user ID from current context (this would be properly injected)
            # For now, we'll use the general encryption method
            return super().process_bind_param(value, dialect)
            
        except Exception as e:
            logger.error(f"Failed to encrypt PII data: {e}")
            raise ValueError("PII encryption failed")


class FinancialData(EncryptedJSON):
    """Specialized encrypted field for financial data."""
    
    def __init__(self, **kwargs):
        super().__init__(field_name="financial_data", **kwargs)
    
    def process_bind_param(self, value: Any, dialect: Dialect) -> Optional[str]:
        """Encrypt financial data with additional validation."""
        if value is None:
            return None
        
        # Validate financial data structure
        if isinstance(value, dict):
            # Ensure required financial fields are present
            financial_fields = ['portfolio_value', 'allocations', 'returns']
            if not any(field in value for field in financial_fields):
                logger.warning("Financial data missing expected fields")
        
        return super().process_bind_param(value, dialect)


@declarative_mixin
class EncryptedFieldMixin:
    """
    Mixin class for models with encrypted fields.
    
    Provides utility methods for working with encrypted data
    and handling encryption-related errors.
    """
    
    def get_decrypted_field(self, field_name: str) -> Any:
        """
        Get decrypted value for a field.
        
        Args:
            field_name: Name of encrypted field
            
        Returns:
            Decrypted field value
        """
        try:
            encrypted_value = getattr(self, field_name)
            
            if encrypted_value is None:
                return None
            
            # The field type handles decryption automatically
            return encrypted_value
            
        except Exception as e:
            logger.error(f"Failed to decrypt field {field_name}: {e}")
            return None
    
    def set_encrypted_field(self, field_name: str, value: Any) -> None:
        """
        Set value for an encrypted field.
        
        Args:
            field_name: Name of encrypted field
            value: Value to encrypt and store
        """
        try:
            # The field type handles encryption automatically
            setattr(self, field_name, value)
            
        except Exception as e:
            logger.error(f"Failed to encrypt field {field_name}: {e}")
            raise ValueError(f"Encryption failed for field {field_name}")
    
    def rotate_field_encryption(self, field_name: str) -> bool:
        """
        Rotate encryption for a specific field.
        
        Args:
            field_name: Name of field to rotate encryption for
            
        Returns:
            True if rotation successful
        """
        try:
            # Get current value (decrypted)
            current_value = getattr(self, field_name)
            
            if current_value is None:
                return True
            
            # Force re-encryption by setting the value again
            # This will use the latest encryption key
            setattr(self, field_name, current_value)
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to rotate encryption for field {field_name}: {e}")
            return False


# Utility functions for working with encrypted fields
def create_encrypted_field(field_type: str, field_name: str, **kwargs) -> EncryptedType:
    """
    Factory function to create encrypted field types.
    
    Args:
        field_type: Type of encrypted field ('string', 'json', 'binary', 'pii', 'financial')
        field_name: Name of the field for encryption context
        **kwargs: Additional field arguments
        
    Returns:
        Encrypted field instance
    """
    field_types = {
        'string': EncryptedString,
        'json': EncryptedJSON,
        'binary': EncryptedLargeBinary,
        'pii': PersonallyIdentifiableData,
        'financial': FinancialData
    }
    
    if field_type not in field_types:
        raise ValueError(f"Unknown encrypted field type: {field_type}")
    
    field_class = field_types[field_type]
    
    if field_type in ['pii', 'financial']:
        # These types have predefined field names
        return field_class(**kwargs)
    else:
        return field_class(field_name=field_name, **kwargs)


def validate_encrypted_field_value(value: Any, field_type: str) -> bool:
    """
    Validate value for encrypted field before storage.
    
    Args:
        value: Value to validate
        field_type: Type of encrypted field
        
    Returns:
        True if value is valid for the field type
    """
    if value is None:
        return True
    
    try:
        if field_type == 'string':
            return isinstance(value, str)
        
        elif field_type == 'json':
            # Try to serialize to JSON
            json.dumps(value, default=str)
            return True
        
        elif field_type == 'binary':
            return isinstance(value, (bytes, str))
        
        elif field_type == 'pii':
            # PII should be a dictionary with expected fields
            if not isinstance(value, dict):
                return False
            
            # Check for common PII fields
            pii_fields = ['email', 'name', 'phone', 'address', 'ssn', 'tax_id']
            return any(field in value for field in pii_fields)
        
        elif field_type == 'financial':
            # Financial data should be a dictionary with financial fields
            if not isinstance(value, dict):
                return False
            
            # Check for financial fields and validate ranges
            if 'portfolio_value' in value:
                try:
                    float(value['portfolio_value'])
                except (ValueError, TypeError):
                    return False
            
            if 'allocations' in value:
                if not isinstance(value['allocations'], dict):
                    return False
                
                # Validate allocation percentages
                total_allocation = sum(float(v) for v in value['allocations'].values())
                if abs(total_allocation - 1.0) > 0.01:  # Allow small rounding errors
                    logger.warning(f"Allocation sum {total_allocation} != 1.0")
            
            return True
        
        else:
            return False
    
    except Exception as e:
        logger.error(f"Validation failed for {field_type} field: {e}")
        return False


# Example usage in model definitions:
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base, EncryptedFieldMixin):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), nullable=False, unique=True)
    
    # Encrypted PII data
    personal_info = Column(PersonallyIdentifiableData(), nullable=True)
    
    # Encrypted financial preferences
    investment_profile = Column(FinancialData(), nullable=True)
    
    # Encrypted sensitive notes
    private_notes = Column(EncryptedString(field_name="user_notes"), nullable=True)


class Portfolio(Base, EncryptedFieldMixin):
    __tablename__ = 'portfolios'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    name = Column(String(100), nullable=False)
    
    # Encrypted portfolio data
    holdings_data = Column(FinancialData(), nullable=True)
    
    # Encrypted performance metrics
    performance_metrics = Column(EncryptedJSON(field_name="portfolio_metrics"), nullable=True)
    
    # Encrypted file attachments
    attached_documents = Column(EncryptedLargeBinary(field_name="portfolio_docs"), nullable=True)
"""