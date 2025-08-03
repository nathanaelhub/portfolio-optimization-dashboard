"""
Input validation and sanitization for portfolio optimization system.

Implements comprehensive input validation to prevent injection attacks,
ensure data integrity, and maintain system security.
"""

import re
import html
import bleach
from typing import Any, Dict, List, Optional, Union
from decimal import Decimal, InvalidOperation
from datetime import datetime, date
from pydantic import BaseModel, validator, Field
from sqlalchemy import text

# Allowed HTML tags and attributes for rich text content
ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'ol', 'ul', 'li']
ALLOWED_ATTRIBUTES = {}

# Financial validation constants
MAX_ALLOCATION_PRECISION = 6  # 6 decimal places for allocation percentages
MAX_EXPECTED_RETURN = 2.0     # 200% annual return (extreme upper bound)
MIN_EXPECTED_RETURN = -0.5    # -50% annual return (extreme lower bound)
MAX_VOLATILITY = 1.0          # 100% annual volatility
MIN_VOLATILITY = 0.001        # 0.1% annual volatility (minimum meaningful)
MAX_PORTFOLIO_SIZE = 1000     # Maximum number of assets in portfolio
MAX_SYMBOL_LENGTH = 10        # Maximum length for asset symbols
MAX_NAME_LENGTH = 100         # Maximum length for portfolio/asset names
MAX_DESCRIPTION_LENGTH = 1000 # Maximum length for descriptions


class SecurityValidator:
    """
    Comprehensive input validation and sanitization utility.
    
    Provides methods to validate and sanitize all user inputs
    to prevent injection attacks and ensure data integrity.
    """
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 255, allow_html: bool = False) -> str:
        """
        Sanitize string input to prevent XSS and injection attacks.
        
        Args:
            value: Input string to sanitize
            max_length: Maximum allowed length
            allow_html: Whether to allow HTML tags (sanitized)
            
        Returns:
            Sanitized string
            
        Raises:
            ValueError: If input is invalid or too long
        """
        if not isinstance(value, str):
            raise ValueError("Input must be a string")
        
        # Remove null bytes and control characters
        value = value.replace('\x00', '').replace('\r', '')
        
        # Trim whitespace
        value = value.strip()
        
        # Check length
        if len(value) > max_length:
            raise ValueError(f"Input too long: {len(value)} > {max_length}")
        
        if allow_html:
            # Sanitize HTML but allow safe tags
            value = bleach.clean(value, tags=ALLOWED_TAGS, attributes=ALLOWED_ATTRIBUTES)
        else:
            # Escape HTML entities
            value = html.escape(value)
        
        return value
    
    @staticmethod
    def validate_asset_symbol(symbol: str) -> str:
        """
        Validate and sanitize asset symbol.
        
        Args:
            symbol: Asset symbol (e.g., 'AAPL', 'MSFT')
            
        Returns:
            Validated symbol in uppercase
            
        Raises:
            ValueError: If symbol format is invalid
        """
        if not isinstance(symbol, str):
            raise ValueError("Symbol must be a string")
        
        symbol = symbol.strip().upper()
        
        # Validate symbol format (alphanumeric, dots, hyphens allowed)
        if not re.match(r'^[A-Z0-9.-]{1,10}$', symbol):
            raise ValueError(f"Invalid symbol format: {symbol}")
        
        # Additional validation for common patterns
        if symbol.startswith('.') or symbol.endswith('.'):
            raise ValueError("Symbol cannot start or end with a dot")
        
        if '..' in symbol:
            raise ValueError("Symbol cannot contain consecutive dots")
        
        return symbol
    
    @staticmethod
    def validate_allocation(allocation: Union[float, str, Decimal]) -> Decimal:
        """
        Validate portfolio allocation percentage.
        
        Args:
            allocation: Allocation as decimal (0.0-1.0) or percentage (0-100)
            
        Returns:
            Validated allocation as Decimal (0.0-1.0)
            
        Raises:
            ValueError: If allocation is invalid
        """
        try:
            if isinstance(allocation, str):
                allocation = float(allocation.strip('%'))
            
            allocation = Decimal(str(allocation))
        except (ValueError, InvalidOperation):
            raise ValueError(f"Invalid allocation format: {allocation}")
        
        # If value is > 1, assume it's a percentage
        if allocation > 1:
            if allocation > 100:
                raise ValueError(f"Allocation cannot exceed 100%: {allocation}")
            allocation = allocation / 100
        
        if allocation < 0:
            raise ValueError(f"Allocation cannot be negative: {allocation}")
        
        if allocation > 1:
            raise ValueError(f"Allocation cannot exceed 100%: {allocation}")
        
        # Round to specified precision
        return allocation.quantize(Decimal('0.000001'))
    
    @staticmethod
    def validate_expected_return(expected_return: Union[float, str]) -> float:
        """
        Validate expected return value.
        
        Args:
            expected_return: Expected annual return as decimal
            
        Returns:
            Validated expected return
            
        Raises:
            ValueError: If return is outside reasonable bounds
        """
        try:
            if isinstance(expected_return, str):
                expected_return = float(expected_return.strip('%'))
            
            expected_return = float(expected_return)
        except ValueError:
            raise ValueError(f"Invalid expected return format: {expected_return}")
        
        # If value is large, assume it's a percentage
        if abs(expected_return) > 10:
            expected_return = expected_return / 100
        
        if expected_return < MIN_EXPECTED_RETURN:
            raise ValueError(f"Expected return too low: {expected_return:.2%} < {MIN_EXPECTED_RETURN:.2%}")
        
        if expected_return > MAX_EXPECTED_RETURN:
            raise ValueError(f"Expected return too high: {expected_return:.2%} > {MAX_EXPECTED_RETURN:.2%}")
        
        return expected_return
    
    @staticmethod
    def validate_volatility(volatility: Union[float, str]) -> float:
        """
        Validate volatility (standard deviation) value.
        
        Args:
            volatility: Annual volatility as decimal
            
        Returns:
            Validated volatility
            
        Raises:
            ValueError: If volatility is outside reasonable bounds
        """
        try:
            if isinstance(volatility, str):
                volatility = float(volatility.strip('%'))
            
            volatility = float(volatility)
        except ValueError:
            raise ValueError(f"Invalid volatility format: {volatility}")
        
        # If value is large, assume it's a percentage
        if volatility > 10:
            volatility = volatility / 100
        
        if volatility < 0:
            raise ValueError(f"Volatility cannot be negative: {volatility}")
        
        if volatility < MIN_VOLATILITY:
            raise ValueError(f"Volatility too low: {volatility:.4f} < {MIN_VOLATILITY:.4f}")
        
        if volatility > MAX_VOLATILITY:
            raise ValueError(f"Volatility too high: {volatility:.2%} > {MAX_VOLATILITY:.2%}")
        
        return volatility
    
    @staticmethod
    def validate_date_range(start_date: Union[str, date], end_date: Union[str, date]) -> tuple[date, date]:
        """
        Validate date range for historical data queries.
        
        Args:
            start_date: Start date
            end_date: End date
            
        Returns:
            Tuple of validated dates
            
        Raises:
            ValueError: If date range is invalid
        """
        if isinstance(start_date, str):
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            except ValueError:
                raise ValueError(f"Invalid start date format: {start_date}")
        
        if isinstance(end_date, str):
            try:
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                raise ValueError(f"Invalid end date format: {end_date}")
        
        if start_date >= end_date:
            raise ValueError("Start date must be before end date")
        
        # Validate reasonable date range
        today = date.today()
        if start_date > today:
            raise ValueError("Start date cannot be in the future")
        
        if end_date > today:
            end_date = today
        
        # Limit historical range to prevent excessive data queries
        max_years_back = 50
        earliest_date = date(today.year - max_years_back, 1, 1)
        if start_date < earliest_date:
            raise ValueError(f"Start date too far in past: {start_date} < {earliest_date}")
        
        return start_date, end_date
    
    @staticmethod
    def validate_portfolio_constraints(constraints: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate portfolio optimization constraints.
        
        Args:
            constraints: Dictionary of constraint parameters
            
        Returns:
            Validated constraints dictionary
            
        Raises:
            ValueError: If constraints are invalid or contradictory
        """
        validated = {}
        
        # Validate weight constraints
        if 'min_weight' in constraints:
            min_weight = SecurityValidator.validate_allocation(constraints['min_weight'])
            validated['min_weight'] = float(min_weight)
        
        if 'max_weight' in constraints:
            max_weight = SecurityValidator.validate_allocation(constraints['max_weight'])
            validated['max_weight'] = float(max_weight)
        
        # Check for contradictory weight constraints
        if 'min_weight' in validated and 'max_weight' in validated:
            if validated['min_weight'] > validated['max_weight']:
                raise ValueError("Minimum weight cannot exceed maximum weight")
        
        # Validate return constraints
        if 'target_return' in constraints:
            target_return = SecurityValidator.validate_expected_return(constraints['target_return'])
            validated['target_return'] = target_return
        
        if 'min_return' in constraints:
            min_return = SecurityValidator.validate_expected_return(constraints['min_return'])
            validated['min_return'] = min_return
        
        if 'max_return' in constraints:
            max_return = SecurityValidator.validate_expected_return(constraints['max_return'])
            validated['max_return'] = max_return
        
        # Validate volatility constraints
        if 'max_volatility' in constraints:
            max_vol = SecurityValidator.validate_volatility(constraints['max_volatility'])
            validated['max_volatility'] = max_vol
        
        if 'target_volatility' in constraints:
            target_vol = SecurityValidator.validate_volatility(constraints['target_volatility'])
            validated['target_volatility'] = target_vol
        
        # Validate sector constraints
        if 'sector_limits' in constraints:
            sector_limits = constraints['sector_limits']
            if not isinstance(sector_limits, dict):
                raise ValueError("Sector limits must be a dictionary")
            
            validated_sectors = {}
            for sector, limit in sector_limits.items():
                sector = SecurityValidator.sanitize_string(sector, 50)
                limit = SecurityValidator.validate_allocation(limit)
                validated_sectors[sector] = float(limit)
            
            validated['sector_limits'] = validated_sectors
        
        return validated


class SQLSafetyValidator:
    """
    SQL injection prevention utilities.
    
    Provides methods to safely construct SQL queries and validate
    database parameters to prevent SQL injection attacks.
    """
    
    # Allowed column names for dynamic sorting (whitelist approach)
    ALLOWED_SORT_COLUMNS = {
        'portfolios': ['id', 'name', 'created_at', 'updated_at', 'total_value'],
        'assets': ['symbol', 'name', 'sector', 'current_price', 'market_cap'],
        'holdings': ['allocation', 'value', 'change_percent', 'symbol']
    }
    
    # Allowed sort directions
    ALLOWED_SORT_DIRECTIONS = ['asc', 'desc', 'ASC', 'DESC']
    
    @staticmethod
    def validate_sort_parameter(table: str, column: str, direction: str = 'asc') -> tuple[str, str]:
        """
        Validate SQL sort parameters to prevent injection.
        
        Args:
            table: Table name for column validation
            column: Column name to sort by
            direction: Sort direction ('asc' or 'desc')
            
        Returns:
            Tuple of validated (column, direction)
            
        Raises:
            ValueError: If parameters are invalid
        """
        # Validate table name
        if table not in SQLSafetyValidator.ALLOWED_SORT_COLUMNS:
            raise ValueError(f"Invalid table for sorting: {table}")
        
        # Validate column name (whitelist approach)
        if column not in SQLSafetyValidator.ALLOWED_SORT_COLUMNS[table]:
            raise ValueError(f"Invalid sort column for {table}: {column}")
        
        # Validate sort direction
        if direction.lower() not in ['asc', 'desc']:
            raise ValueError(f"Invalid sort direction: {direction}")
        
        return column, direction.upper()
    
    @staticmethod
    def validate_limit_offset(limit: Union[int, str], offset: Union[int, str] = 0) -> tuple[int, int]:
        """
        Validate LIMIT and OFFSET parameters for pagination.
        
        Args:
            limit: Maximum number of records to return
            offset: Number of records to skip
            
        Returns:
            Tuple of validated (limit, offset)
            
        Raises:
            ValueError: If parameters are invalid
        """
        try:
            limit = int(limit)
            offset = int(offset)
        except ValueError:
            raise ValueError("Limit and offset must be integers")
        
        if limit < 1:
            raise ValueError("Limit must be positive")
        
        if limit > 1000:  # Prevent excessive data retrieval
            raise ValueError("Limit cannot exceed 1000")
        
        if offset < 0:
            raise ValueError("Offset cannot be negative")
        
        return limit, offset
    
    @staticmethod
    def create_safe_filter_query(table: str, filters: Dict[str, Any]) -> tuple[str, Dict[str, Any]]:
        """
        Create safe WHERE clause with parameterized queries.
        
        Args:
            table: Table name for validation
            filters: Dictionary of filter parameters
            
        Returns:
            Tuple of (WHERE clause, parameters dict)
            
        Raises:
            ValueError: If filters contain invalid parameters
        """
        if not isinstance(filters, dict):
            raise ValueError("Filters must be a dictionary")
        
        where_clauses = []
        parameters = {}
        
        # Define allowed filters per table
        allowed_filters = {
            'portfolios': {
                'user_id': int,
                'name': str,
                'risk_tolerance': str,
                'created_after': datetime,
                'created_before': datetime
            },
            'assets': {
                'symbol': str,
                'sector': str,
                'market_cap_min': float,
                'market_cap_max': float
            },
            'holdings': {
                'portfolio_id': int,
                'symbol': str,
                'allocation_min': float,
                'allocation_max': float
            }
        }
        
        if table not in allowed_filters:
            raise ValueError(f"Invalid table for filtering: {table}")
        
        table_filters = allowed_filters[table]
        
        for key, value in filters.items():
            if key not in table_filters:
                raise ValueError(f"Invalid filter for {table}: {key}")
            
            expected_type = table_filters[key]
            
            # Type validation and conversion
            if expected_type == int:
                try:
                    value = int(value)
                except ValueError:
                    raise ValueError(f"Invalid integer value for {key}: {value}")
            elif expected_type == float:
                try:
                    value = float(value)
                except ValueError:
                    raise ValueError(f"Invalid float value for {key}: {value}")
            elif expected_type == str:
                value = SecurityValidator.sanitize_string(str(value), 100)
            elif expected_type == datetime:
                if isinstance(value, str):
                    try:
                        value = datetime.fromisoformat(value)
                    except ValueError:
                        raise ValueError(f"Invalid datetime format for {key}: {value}")
            
            # Create parameterized query fragment
            param_name = f"filter_{key}_{len(parameters)}"
            
            if key.endswith('_min'):
                base_column = key[:-4]  # Remove '_min' suffix
                where_clauses.append(f"{base_column} >= :{param_name}")
            elif key.endswith('_max'):
                base_column = key[:-4]  # Remove '_max' suffix
                where_clauses.append(f"{base_column} <= :{param_name}")
            elif key.endswith('_after'):
                base_column = key[:-6]  # Remove '_after' suffix
                where_clauses.append(f"{base_column} > :{param_name}")
            elif key.endswith('_before'):
                base_column = key[:-7]  # Remove '_before' suffix
                where_clauses.append(f"{base_column} < :{param_name}")
            else:
                where_clauses.append(f"{key} = :{param_name}")
            
            parameters[param_name] = value
        
        where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"
        return where_clause, parameters


# Pydantic models for request validation
class PortfolioCreateRequest(BaseModel):
    """Validated portfolio creation request."""
    
    name: str = Field(..., min_length=1, max_length=MAX_NAME_LENGTH)
    description: Optional[str] = Field(None, max_length=MAX_DESCRIPTION_LENGTH)
    risk_tolerance: str = Field(..., regex=r'^(conservative|moderate|aggressive)$')
    investment_horizon: int = Field(..., ge=1, le=50)  # 1-50 years
    
    @validator('name')
    def validate_name(cls, v):
        return SecurityValidator.sanitize_string(v, MAX_NAME_LENGTH)
    
    @validator('description')
    def validate_description(cls, v):
        if v is not None:
            return SecurityValidator.sanitize_string(v, MAX_DESCRIPTION_LENGTH, allow_html=True)
        return v


class AssetAllocationRequest(BaseModel):
    """Validated asset allocation request."""
    
    symbol: str = Field(..., min_length=1, max_length=MAX_SYMBOL_LENGTH)
    allocation: Union[float, str] = Field(...)
    
    @validator('symbol')
    def validate_symbol(cls, v):
        return SecurityValidator.validate_asset_symbol(v)
    
    @validator('allocation')
    def validate_allocation(cls, v):
        return float(SecurityValidator.validate_allocation(v))


class OptimizationRequest(BaseModel):
    """Validated portfolio optimization request."""
    
    symbols: List[str] = Field(..., min_items=1, max_items=MAX_PORTFOLIO_SIZE)
    objective: str = Field(..., regex=r'^(max_sharpe|min_volatility|max_return|risk_parity|target_return)$')
    constraints: Optional[Dict[str, Any]] = Field(default_factory=dict)
    risk_aversion: Optional[float] = Field(None, ge=0.1, le=100.0)
    
    @validator('symbols')
    def validate_symbols(cls, v):
        validated_symbols = []
        seen_symbols = set()
        
        for symbol in v:
            validated_symbol = SecurityValidator.validate_asset_symbol(symbol)
            
            if validated_symbol in seen_symbols:
                raise ValueError(f"Duplicate symbol: {validated_symbol}")
            
            seen_symbols.add(validated_symbol)
            validated_symbols.append(validated_symbol)
        
        return validated_symbols
    
    @validator('constraints')
    def validate_constraints(cls, v):
        if v:
            return SecurityValidator.validate_portfolio_constraints(v)
        return v


class MarketDataRequest(BaseModel):
    """Validated market data request."""
    
    symbols: List[str] = Field(..., min_items=1, max_items=50)  # Limit API calls
    start_date: Optional[str] = Field(None, regex=r'^\d{4}-\d{2}-\d{2}$')
    end_date: Optional[str] = Field(None, regex=r'^\d{4}-\d{2}-\d{2}$')
    period: Optional[str] = Field('1y', regex=r'^(1d|5d|1mo|3mo|6mo|1y|2y|5y|10y|ytd|max)$')
    
    @validator('symbols')
    def validate_symbols(cls, v):
        return [SecurityValidator.validate_asset_symbol(symbol) for symbol in v]
    
    @validator('start_date', 'end_date')
    def validate_dates(cls, v):
        if v:
            try:
                datetime.strptime(v, '%Y-%m-%d')
            except ValueError:
                raise ValueError(f"Invalid date format: {v}")
        return v
    
    @validator('end_date')
    def validate_date_range(cls, v, values):
        if v and 'start_date' in values and values['start_date']:
            start_date, end_date = SecurityValidator.validate_date_range(values['start_date'], v)
            return end_date.isoformat()
        return v