"""
Market Data Integration Service
Provides robust market data with caching, retry logic, and data quality checks
"""

import asyncio
import aioredis
import yfinance as yf
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta, date
from dataclasses import dataclass, asdict
from enum import Enum
import logging
import time
import json
from concurrent.futures import ThreadPoolExecutor
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataQuality(Enum):
    """Data quality levels"""
    EXCELLENT = "excellent"
    GOOD = "good"
    FAIR = "fair"
    POOR = "poor"


@dataclass
class MarketDataPoint:
    """Individual market data point"""
    symbol: str
    timestamp: datetime
    open: float
    high: float
    low: float
    close: float
    volume: int
    adjusted_close: float
    data_quality: DataQuality
    source: str = "yahoo_finance"


@dataclass
class AssetInfo:
    """Asset information and metadata"""
    symbol: str
    name: str
    sector: str
    industry: str
    market_cap: Optional[float]
    currency: str
    exchange: str
    country: str
    website: Optional[str]
    description: Optional[str]
    last_updated: datetime


class MarketDataCache:
    """Redis-based caching for market data"""
    
    def __init__(self, redis_url: str = "redis://localhost:6379"):
        self.redis_url = redis_url
        self.redis = None
        self.default_ttl = 300  # 5 minutes for real-time data
        self.historical_ttl = 86400  # 24 hours for historical data
        
    async def connect(self):
        """Connect to Redis"""
        try:
            self.redis = await aioredis.from_url(self.redis_url)
            await self.redis.ping()
            logger.info("Connected to Redis cache")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}. Using fallback caching.")
            self.redis = None
    
    async def get(self, key: str) -> Optional[Dict]:
        """Get cached data"""
        if not self.redis:
            return None
        
        try:
            data = await self.redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            logger.warning(f"Cache get error: {e}")
            return None
    
    async def set(self, key: str, value: Dict, ttl: int = None) -> bool:
        """Set cached data"""
        if not self.redis:
            return False
        
        try:
            ttl = ttl or self.default_ttl
            await self.redis.setex(key, ttl, json.dumps(value, default=str))
            return True
        except Exception as e:
            logger.warning(f"Cache set error: {e}")
            return False
    
    async def delete(self, key: str) -> bool:
        """Delete cached data"""
        if not self.redis:
            return False
        
        try:
            await self.redis.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete error: {e}")
            return False
    
    def _make_key(self, symbol: str, data_type: str, start: date = None, end: date = None) -> str:
        """Create cache key"""
        key_parts = [f"market_data", symbol, data_type]
        if start:
            key_parts.append(f"start_{start}")
        if end:
            key_parts.append(f"end_{end}")
        return ":".join(key_parts)


class MarketDataProvider:
    """Market data provider with robust error handling and retry logic"""
    
    def __init__(self, cache: MarketDataCache = None):
        self.cache = cache or MarketDataCache()
        self.session = self._create_session()
        self.executor = ThreadPoolExecutor(max_workers=10)
        self._rate_limit_delay = 0.1  # 100ms between requests
        self._last_request_time = 0
        
    def _create_session(self) -> requests.Session:
        """Create requests session with retry strategy"""
        session = requests.Session()
        
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("http://", adapter)
        session.mount("https://", adapter)
        
        return session
    
    async def _rate_limit(self):
        """Enforce rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self._last_request_time
        
        if time_since_last < self._rate_limit_delay:
            await asyncio.sleep(self._rate_limit_delay - time_since_last)
        
        self._last_request_time = time.time()
    
    async def get_historical_data(
        self, 
        symbol: str, 
        start_date: date,
        end_date: date = None,
        interval: str = "1d",
        use_cache: bool = True
    ) -> List[MarketDataPoint]:
        """Get historical market data with caching"""
        
        if end_date is None:
            end_date = date.today()
        
        # Check cache first
        cache_key = self.cache._make_key(symbol, f"historical_{interval}", start_date, end_date)
        
        if use_cache:
            cached_data = await self.cache.get(cache_key)
            if cached_data:
                logger.info(f"Cache hit for {symbol} historical data")
                return [MarketDataPoint(**point) for point in cached_data]
        
        # Rate limiting
        await self._rate_limit()
        
        try:
            # Fetch data using yfinance in thread pool
            loop = asyncio.get_event_loop()
            df = await loop.run_in_executor(
                self.executor,
                self._fetch_yfinance_data,
                symbol, start_date, end_date, interval
            )
            
            if df is None or df.empty:
                logger.warning(f"No data returned for {symbol}")
                return []
            
            # Convert to MarketDataPoint objects
            data_points = self._dataframe_to_points(df, symbol)
            
            # Cache the results
            if use_cache and data_points:
                cache_data = [asdict(point) for point in data_points]
                await self.cache.set(cache_key, cache_data, self.cache.historical_ttl)
            
            logger.info(f"Fetched {len(data_points)} data points for {symbol}")
            return data_points
            
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            return []
    
    def _fetch_yfinance_data(self, symbol: str, start_date: date, end_date: date, interval: str) -> pd.DataFrame:
        """Fetch data using yfinance (runs in thread pool)"""
        try:
            ticker = yf.Ticker(symbol)
            df = ticker.history(
                start=start_date,
                end=end_date,
                interval=interval,
                auto_adjust=False,
                prepost=False,
                threads=True
            )
            return df
        except Exception as e:
            logger.error(f"yfinance fetch error for {symbol}: {e}")
            return None
    
    def _dataframe_to_points(self, df: pd.DataFrame, symbol: str) -> List[MarketDataPoint]:
        """Convert pandas DataFrame to MarketDataPoint objects"""
        data_points = []
        
        for timestamp, row in df.iterrows():
            try:
                # Data quality assessment
                quality = self._assess_data_quality(row)
                
                point = MarketDataPoint(
                    symbol=symbol,
                    timestamp=timestamp.to_pydatetime(),
                    open=float(row.get('Open', 0)),
                    high=float(row.get('High', 0)),
                    low=float(row.get('Low', 0)),
                    close=float(row.get('Close', 0)),
                    volume=int(row.get('Volume', 0)),
                    adjusted_close=float(row.get('Adj Close', row.get('Close', 0))),
                    data_quality=quality
                )
                
                data_points.append(point)
                
            except Exception as e:
                logger.warning(f"Error processing data point for {symbol} at {timestamp}: {e}")
                continue
        
        return data_points
    
    def _assess_data_quality(self, row: pd.Series) -> DataQuality:
        """Assess the quality of a data point"""
        try:
            # Check for missing values
            required_fields = ['Open', 'High', 'Low', 'Close']
            missing_count = sum(1 for field in required_fields if pd.isna(row.get(field)))
            
            if missing_count > 0:
                return DataQuality.POOR
            
            # Check for logical consistency
            open_price = row.get('Open', 0)
            high_price = row.get('High', 0)
            low_price = row.get('Low', 0)
            close_price = row.get('Close', 0)
            
            # High should be >= Open, Close, Low
            # Low should be <= Open, Close, High
            if not (low_price <= min(open_price, close_price) <= max(open_price, close_price) <= high_price):
                return DataQuality.FAIR
            
            # Check for zero volume on trading days
            volume = row.get('Volume', 0)
            if volume == 0:
                return DataQuality.FAIR
            
            # Check for extreme price movements (>50% in one day)
            if open_price > 0:
                daily_change = abs(close_price - open_price) / open_price
                if daily_change > 0.5:
                    return DataQuality.FAIR
            
            return DataQuality.EXCELLENT
            
        except Exception:
            return DataQuality.POOR
    
    async def get_current_price(self, symbol: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """Get current/latest price information"""
        
        cache_key = self.cache._make_key(symbol, "current_price")
        
        if use_cache:
            cached_data = await self.cache.get(cache_key)
            if cached_data:
                return cached_data
        
        await self._rate_limit()
        
        try:
            loop = asyncio.get_event_loop()
            ticker_info = await loop.run_in_executor(
                self.executor,
                self._get_ticker_info,
                symbol
            )
            
            if not ticker_info:
                return None
            
            current_price_data = {
                'symbol': symbol,
                'current_price': ticker_info.get('currentPrice') or ticker_info.get('regularMarketPrice'),
                'previous_close': ticker_info.get('previousClose'),
                'open': ticker_info.get('regularMarketOpen'),
                'day_high': ticker_info.get('dayHigh') or ticker_info.get('regularMarketDayHigh'),
                'day_low': ticker_info.get('dayLow') or ticker_info.get('regularMarketDayLow'),
                'volume': ticker_info.get('volume') or ticker_info.get('regularMarketVolume'),
                'market_cap': ticker_info.get('marketCap'),
                'pe_ratio': ticker_info.get('trailingPE'),
                'dividend_yield': ticker_info.get('dividendYield'),
                'fifty_two_week_high': ticker_info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': ticker_info.get('fiftyTwoWeekLow'),
                'timestamp': datetime.now().isoformat(),
                'currency': ticker_info.get('currency', 'USD')
            }
            
            # Cache for 1 minute
            if use_cache:
                await self.cache.set(cache_key, current_price_data, 60)
            
            return current_price_data
            
        except Exception as e:
            logger.error(f"Error fetching current price for {symbol}: {e}")
            return None
    
    def _get_ticker_info(self, symbol: str) -> Dict:
        """Get ticker information using yfinance"""
        try:
            ticker = yf.Ticker(symbol)
            return ticker.info
        except Exception as e:
            logger.error(f"Error getting ticker info for {symbol}: {e}")
            return {}
    
    async def get_asset_info(self, symbol: str, use_cache: bool = True) -> Optional[AssetInfo]:
        """Get comprehensive asset information"""
        
        cache_key = self.cache._make_key(symbol, "asset_info")
        
        if use_cache:
            cached_data = await self.cache.get(cache_key)
            if cached_data:
                return AssetInfo(**cached_data)
        
        await self._rate_limit()
        
        try:
            loop = asyncio.get_event_loop()
            info = await loop.run_in_executor(
                self.executor,
                self._get_ticker_info,
                symbol
            )
            
            if not info:
                return None
            
            asset_info = AssetInfo(
                symbol=symbol,
                name=info.get('longName') or info.get('shortName', symbol),
                sector=info.get('sector', 'Unknown'),
                industry=info.get('industry', 'Unknown'),
                market_cap=info.get('marketCap'),
                currency=info.get('currency', 'USD'),
                exchange=info.get('exchange', 'Unknown'),
                country=info.get('country', 'Unknown'),
                website=info.get('website'),
                description=info.get('longBusinessSummary'),
                last_updated=datetime.now()
            )
            
            # Cache for 24 hours
            if use_cache:
                await self.cache.set(cache_key, asdict(asset_info), 86400)
            
            return asset_info
            
        except Exception as e:
            logger.error(f"Error fetching asset info for {symbol}: {e}")
            return None
    
    async def get_multiple_current_prices(self, symbols: List[str]) -> Dict[str, Dict[str, Any]]:
        """Get current prices for multiple symbols efficiently"""
        
        tasks = [self.get_current_price(symbol) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        price_data = {}
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                logger.error(f"Error fetching price for {symbol}: {result}")
                continue
            
            if result:
                price_data[symbol] = result
        
        return price_data
    
    async def validate_symbols(self, symbols: List[str]) -> Dict[str, bool]:
        """Validate that symbols exist and have data"""
        
        validation_results = {}
        
        for symbol in symbols:
            try:
                # Try to get minimal data to validate symbol
                current_price = await self.get_current_price(symbol)
                validation_results[symbol] = current_price is not None and current_price.get('current_price') is not None
                
            except Exception as e:
                logger.warning(f"Symbol validation failed for {symbol}: {e}")
                validation_results[symbol] = False
        
        return validation_results
    
    async def get_data_quality_report(self, symbols: List[str], days: int = 30) -> Dict[str, Any]:
        """Generate data quality report for symbols"""
        
        end_date = date.today()
        start_date = end_date - timedelta(days=days)
        
        quality_report = {
            'symbols_analyzed': len(symbols),
            'analysis_period_days': days,
            'symbol_reports': {},
            'overall_quality': 'unknown',
            'recommendations': []
        }
        
        total_points = 0
        quality_scores = []
        
        for symbol in symbols:
            data_points = await self.get_historical_data(symbol, start_date, end_date)
            
            if not data_points:
                quality_report['symbol_reports'][symbol] = {
                    'data_availability': False,
                    'quality_score': 0,
                    'issues': ['No data available']
                }
                continue
            
            # Analyze data quality
            quality_counts = {quality: 0 for quality in DataQuality}
            issues = []
            
            for point in data_points:
                quality_counts[point.data_quality] += 1
            
            # Calculate quality score
            total_points = len(data_points)
            if total_points > 0:
                quality_score = (
                    quality_counts[DataQuality.EXCELLENT] * 1.0 +
                    quality_counts[DataQuality.GOOD] * 0.8 +
                    quality_counts[DataQuality.FAIR] * 0.5 +
                    quality_counts[DataQuality.POOR] * 0.2
                ) / total_points
            else:
                quality_score = 0
            
            quality_scores.append(quality_score)
            
            # Check for data gaps
            if total_points < days * 0.8:  # Missing more than 20% of expected data
                issues.append(f"Data gaps detected: {total_points}/{days} days available")
            
            if quality_counts[DataQuality.POOR] > total_points * 0.1:  # More than 10% poor quality
                issues.append("High proportion of poor quality data points")
            
            quality_report['symbol_reports'][symbol] = {
                'data_availability': True,
                'total_data_points': total_points,
                'quality_distribution': {q.value: count for q, count in quality_counts.items()},
                'quality_score': quality_score,
                'issues': issues
            }
        
        # Overall quality assessment
        if quality_scores:
            avg_quality = np.mean(quality_scores)
            if avg_quality >= 0.9:
                quality_report['overall_quality'] = 'excellent'
            elif avg_quality >= 0.7:
                quality_report['overall_quality'] = 'good'
            elif avg_quality >= 0.5:
                quality_report['overall_quality'] = 'fair'
            else:
                quality_report['overall_quality'] = 'poor'
        
        # Generate recommendations
        if quality_report['overall_quality'] in ['poor', 'fair']:
            quality_report['recommendations'].append("Consider using additional data sources")
            quality_report['recommendations'].append("Implement data cleaning procedures")
        
        quality_report['recommendations'].append("Monitor data quality regularly")
        quality_report['recommendations'].append("Set up alerts for data quality issues")
        
        return quality_report
    
    async def close(self):
        """Clean up resources"""
        if self.executor:
            self.executor.shutdown(wait=True)
        
        if self.cache and self.cache.redis:
            await self.cache.redis.close()


# Convenience functions
async def create_market_data_provider(redis_url: str = "redis://localhost:6379") -> MarketDataProvider:
    """Create and initialize market data provider"""
    cache = MarketDataCache(redis_url)
    await cache.connect()
    
    provider = MarketDataProvider(cache)
    return provider


# Example usage and testing
async def main():
    """Example usage of the market data provider"""
    
    # Create provider
    provider = await create_market_data_provider()
    
    try:
        # Test symbols
        symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
        
        print("1. Validating symbols...")
        validation = await provider.validate_symbols(symbols)
        valid_symbols = [symbol for symbol, is_valid in validation.items() if is_valid]
        print(f"Valid symbols: {valid_symbols}")
        
        print("\n2. Getting current prices...")
        current_prices = await provider.get_multiple_current_prices(valid_symbols[:2])
        for symbol, price_data in current_prices.items():
            print(f"{symbol}: ${price_data.get('current_price', 'N/A')}")
        
        print("\n3. Getting historical data...")
        start_date = date.today() - timedelta(days=30)
        historical_data = await provider.get_historical_data('AAPL', start_date)
        print(f"Retrieved {len(historical_data)} historical data points for AAPL")
        
        print("\n4. Getting asset information...")
        asset_info = await provider.get_asset_info('AAPL')
        if asset_info:
            print(f"AAPL: {asset_info.name} ({asset_info.sector})")
        
        print("\n5. Data quality report...")
        quality_report = await provider.get_data_quality_report(['AAPL', 'MSFT'])
        print(f"Overall data quality: {quality_report['overall_quality']}")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
    
    finally:
        await provider.close()


if __name__ == "__main__":
    asyncio.run(main())