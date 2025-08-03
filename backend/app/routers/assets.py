"""
Asset data and market information API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from slowapi import Limiter
from slowapi.util import get_remote_address
import pandas as pd
import numpy as np
from datetime import datetime, timedelta, date
import logging
from typing import List, Optional, Dict, Any
import yfinance as yf
import asyncio

from app.schemas.portfolio import AssetSearchResponse, HistoricalDataRequest
from app.services.cache import cache
from app.routers.auth import verify_token
import hashlib
import re

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)

# Common stock database for search
COMMON_STOCKS = [
    {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Discretionary", "exchange": "NASDAQ"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Automotive", "exchange": "NASDAQ"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial Services", "exchange": "NYSE"},
    {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare", "exchange": "NYSE"},
    {"symbol": "V", "name": "Visa Inc.", "sector": "Financial Services", "exchange": "NYSE"},
    {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Staples", "exchange": "NYSE"},
    {"symbol": "UNH", "name": "UnitedHealth Group Inc.", "sector": "Healthcare", "exchange": "NYSE"},
    {"symbol": "HD", "name": "Home Depot Inc.", "sector": "Consumer Discretionary", "exchange": "NYSE"},
    {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financial Services", "exchange": "NYSE"},
    {"symbol": "BAC", "name": "Bank of America Corp.", "sector": "Financial Services", "exchange": "NYSE"},
    {"symbol": "ADBE", "name": "Adobe Inc.", "sector": "Technology", "exchange": "NASDAQ"},
    {"symbol": "DIS", "name": "Walt Disney Co.", "sector": "Communication Services", "exchange": "NYSE"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "sector": "Communication Services", "exchange": "NASDAQ"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "sector": "Technology", "exchange": "NYSE"},
    {"symbol": "XOM", "name": "Exxon Mobil Corp.", "sector": "Energy", "exchange": "NYSE"},
    {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Consumer Staples", "exchange": "NYSE"},
    {"symbol": "KO", "name": "Coca-Cola Co.", "sector": "Consumer Staples", "exchange": "NYSE"},
    {"symbol": "PFE", "name": "Pfizer Inc.", "sector": "Healthcare", "exchange": "NYSE"},
    {"symbol": "VZ", "name": "Verizon Communications Inc.", "sector": "Communication Services", "exchange": "NYSE"},
    {"symbol": "INTC", "name": "Intel Corporation", "sector": "Technology", "exchange": "NASDAQ"},
    
    # ETFs
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF Trust", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "sector": "ETF", "exchange": "NASDAQ"},
    {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "VEA", "name": "Vanguard FTSE Developed Markets ETF", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "VWO", "name": "Vanguard FTSE Emerging Markets ETF", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "AGG", "name": "iShares Core US Aggregate Bond ETF", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "BND", "name": "Vanguard Total Bond Market ETF", "sector": "ETF", "exchange": "NASDAQ"},
    {"symbol": "GLD", "name": "SPDR Gold Shares", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "VNQ", "name": "Vanguard Real Estate ETF", "sector": "ETF", "exchange": "NYSE"},
    {"symbol": "DBC", "name": "Invesco DB Commodity Index Tracking Fund", "sector": "ETF", "exchange": "NYSE"},
]


async def get_stock_info_yfinance(symbol: str) -> Dict[str, Any]:
    """Fetch detailed stock information from yfinance."""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="5d")
        
        if hist.empty:
            return None
        
        current_price = hist['Close'].iloc[-1]
        
        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "sector": info.get("sector"),
            "market_cap": info.get("marketCap"),
            "current_price": float(current_price),
            "currency": info.get("currency", "USD"),
            "exchange": info.get("exchange")
        }
    except Exception as e:
        logger.warning(f"Failed to fetch info for {symbol}: {e}")
        return None


@router.get(
    "/search",
    response_model=List[AssetSearchResponse],
    summary="Search Assets",
    description="""
    Search for stocks and ETFs with autocomplete functionality.
    
    **Features:**
    - Fuzzy matching on symbol and company name
    - Real-time price data
    - Sector and market cap information
    - Exchange information
    - Cached results for performance
    
    **Parameters:**
    - q: Search query (symbol or company name)
    - limit: Maximum number of results (default: 10)
    - include_etfs: Include ETFs in results (default: true)
    """
)
@limiter.limit("100/minute")
async def search_assets(
    request: Request,
    q: str = Query(..., description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results"),
    include_etfs: bool = Query(True, description="Include ETFs"),
    current_user: str = Depends(verify_token)
) -> List[AssetSearchResponse]:
    """Search for assets with autocomplete."""
    
    try:
        # Normalize query
        query = q.upper().strip()
        
        if len(query) < 1:
            raise HTTPException(status_code=400, detail="Query too short")
        
        # Check cache
        cache_key = f"asset_search_{hashlib.md5(f'{query}_{limit}_{include_etfs}'.encode()).hexdigest()}"
        cached_results = cache.get(cache_key)
        
        if cached_results:
            return cached_results
        
        # Filter stocks
        filtered_stocks = []
        
        for stock in COMMON_STOCKS:
            # Skip ETFs if not requested
            if not include_etfs and stock["sector"] == "ETF":
                continue
            
            # Match symbol or name
            if (query in stock["symbol"] or 
                query.lower() in stock["name"].lower()):
                
                # Get current price if possible
                stock_info = await get_stock_info_yfinance(stock["symbol"])
                
                if stock_info:
                    filtered_stocks.append(AssetSearchResponse(**stock_info))
                else:
                    # Fallback to basic info
                    filtered_stocks.append(AssetSearchResponse(
                        symbol=stock["symbol"],
                        name=stock["name"],
                        sector=stock["sector"],
                        exchange=stock["exchange"]
                    ))
                
                if len(filtered_stocks) >= limit:
                    break
        
        # If we need more results, try yfinance search for the exact query
        if len(filtered_stocks) < limit and re.match(r'^[A-Z]{1,5}$', query):
            try:
                yf_info = await get_stock_info_yfinance(query)
                if yf_info and not any(s.symbol == query for s in filtered_stocks):
                    filtered_stocks.append(AssetSearchResponse(**yf_info))
            except:
                pass
        
        # Sort by relevance (exact symbol match first)
        filtered_stocks.sort(
            key=lambda x: (
                0 if x.symbol == query else
                1 if x.symbol.startswith(query) else
                2 if query in x.name.upper() else 3
            )
        )
        
        result = filtered_stocks[:limit]
        
        # Cache for 1 hour
        cache.set(cache_key, result, ttl=3600)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Asset search failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Asset search failed"
        )


@router.get(
    "/info/{symbol}",
    response_model=AssetSearchResponse,
    summary="Get Asset Information",
    description="""
    Get detailed information about a specific asset.
    
    **Returns:**
    - Current price and market cap
    - Sector and industry classification
    - Exchange information
    - Financial metrics
    """
)
@limiter.limit("200/minute")
async def get_asset_info(
    request: Request,
    symbol: str,
    current_user: str = Depends(verify_token)
) -> AssetSearchResponse:
    """Get detailed asset information."""
    
    try:
        symbol = symbol.upper().strip()
        
        # Check cache
        cache_key = f"asset_info_{symbol}"
        cached_info = cache.get(cache_key)
        
        if cached_info:
            return AssetSearchResponse(**cached_info)
        
        # Get info from yfinance
        stock_info = await get_stock_info_yfinance(symbol)
        
        if not stock_info:
            raise HTTPException(
                status_code=404,
                detail=f"Asset {symbol} not found"
            )
        
        # Cache for 4 hours
        cache.set(cache_key, stock_info, ttl=14400)
        
        return AssetSearchResponse(**stock_info)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Asset info retrieval failed for {symbol}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve asset information for {symbol}"
        )


@router.post(
    "/historical",
    summary="Get Historical Data",
    description="""
    Fetch historical price data for multiple assets.
    
    **Features:**
    - Multiple assets in single request
    - Configurable date range and frequency
    - Calculated returns and volatility
    - Basic statistical metrics
    - Correlation analysis
    
    **Supported frequencies:**
    - daily: Daily price data
    - weekly: Weekly aggregated data
    - monthly: Monthly aggregated data
    """
)
@limiter.limit("50/minute")
async def get_historical_data(
    request: Request,
    data_request: HistoricalDataRequest,
    current_user: str = Depends(verify_token)
):
    """Get historical price data for assets."""
    
    try:
        symbols = data_request.symbols
        start_date = data_request.start_date
        end_date = data_request.end_date or datetime.now().date()
        
        # Validate date range
        if start_date >= end_date:
            raise HTTPException(
                status_code=400,
                detail="start_date must be before end_date"
            )
        
        # Check cache
        cache_key = f"historical_{hashlib.md5(f'{symbols}_{start_date}_{end_date}_{data_request.frequency}'.encode()).hexdigest()}"
        cached_data = cache.get(cache_key)
        
        if cached_data:
            return cached_data
        
        # Fetch data
        try:
            data = yf.download(
                symbols,
                start=start_date.strftime('%Y-%m-%d'),
                end=(end_date + timedelta(days=1)).strftime('%Y-%m-%d'),
                progress=False
            )
            
            if data.empty:
                raise HTTPException(
                    status_code=404,
                    detail="No data found for the specified symbols and date range"
                )
            
            # Handle single symbol
            if len(symbols) == 1:
                if 'Adj Close' in data.columns:
                    prices = data['Adj Close'].to_frame()
                    prices.columns = symbols
                else:
                    prices = data['Close'].to_frame()
                    prices.columns = symbols
            else:
                prices = data['Adj Close'] if 'Adj Close' in data.columns else data['Close']
            
            # Resample if needed
            if data_request.frequency == "weekly":
                prices = prices.resample('W').last()
            elif data_request.frequency == "monthly":
                prices = prices.resample('M').last()
            
            # Clean data
            prices = prices.dropna()
            
            if prices.empty:
                raise HTTPException(
                    status_code=404,
                    detail="No valid data after cleaning"
                )
            
            # Prepare response
            result = {
                "symbols": symbols,
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat(),
                "frequency": data_request.frequency,
                "data_points": len(prices),
                "prices": {
                    "dates": [d.strftime('%Y-%m-%d') for d in prices.index],
                    "values": {symbol: prices[symbol].tolist() for symbol in symbols if symbol in prices.columns}
                }
            }
            
            # Add returns if requested
            if data_request.include_returns:
                returns = prices.pct_change().dropna()
                result["returns"] = {
                    "dates": [d.strftime('%Y-%m-%d') for d in returns.index],
                    "values": {symbol: returns[symbol].tolist() for symbol in symbols if symbol in returns.columns}
                }
            
            # Add metrics if requested
            if data_request.include_metrics:
                returns = prices.pct_change().dropna()
                
                # Annualization factor
                freq_factor = {
                    "daily": 252,
                    "weekly": 52,
                    "monthly": 12
                }[data_request.frequency]
                
                metrics = {}
                for symbol in symbols:
                    if symbol in returns.columns:
                        ret_series = returns[symbol]
                        metrics[symbol] = {
                            "total_return": float((prices[symbol].iloc[-1] / prices[symbol].iloc[0]) - 1),
                            "annual_return": float(ret_series.mean() * freq_factor),
                            "annual_volatility": float(ret_series.std() * np.sqrt(freq_factor)),
                            "sharpe_ratio": float((ret_series.mean() * freq_factor) / (ret_series.std() * np.sqrt(freq_factor))) if ret_series.std() > 0 else 0,
                            "max_drawdown": float(((prices[symbol] / prices[symbol].expanding().max()) - 1).min()),
                            "skewness": float(ret_series.skew()),
                            "kurtosis": float(ret_series.kurtosis())
                        }
                
                result["metrics"] = metrics
                
                # Correlation matrix if multiple assets
                if len(symbols) > 1:
                    corr_matrix = returns.corr()
                    result["correlation_matrix"] = corr_matrix.to_dict()
            
            # Cache for appropriate duration
            cache_duration = {
                "daily": 1800,    # 30 minutes
                "weekly": 3600,   # 1 hour
                "monthly": 7200   # 2 hours
            }[data_request.frequency]
            
            cache.set(cache_key, result, ttl=cache_duration)
            
            return result
            
        except Exception as e:
            logger.error(f"Data fetch failed: {e}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to fetch historical data: {str(e)}"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Historical data request failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Historical data request failed"
        )


@router.get(
    "/market-summary",
    summary="Market Summary",
    description="""
    Get current market summary and key indicators.
    
    **Returns:**
    - Major indices performance
    - Sector performance
    - Market volatility indicators
    - Top gainers and losers
    """
)
@limiter.limit("60/minute")
async def get_market_summary(
    request: Request,
    current_user: str = Depends(verify_token)
):
    """Get market summary and key indicators."""
    
    try:
        # Check cache
        cache_key = "market_summary"
        cached_summary = cache.get(cache_key)
        
        if cached_summary:
            return cached_summary
        
        # Major indices
        indices = ["^GSPC", "^DJI", "^IXIC", "^RUT", "^VIX"]
        index_names = {
            "^GSPC": "S&P 500",
            "^DJI": "Dow Jones",
            "^IXIC": "NASDAQ",
            "^RUT": "Russell 2000", 
            "^VIX": "VIX"
        }
        
        try:
            # Fetch index data
            index_data = yf.download(indices, period="5d", progress=False)
            
            market_data = {}
            for idx in indices:
                if idx in index_data['Close'].columns:
                    prices = index_data['Close'][idx].dropna()
                    if len(prices) >= 2:
                        current = prices.iloc[-1]
                        previous = prices.iloc[-2]
                        change = (current - previous) / previous
                        
                        market_data[index_names[idx]] = {
                            "symbol": idx,
                            "current": float(current),
                            "change": float(change),
                            "change_percent": float(change * 100)
                        }
            
            # Sector ETFs for sector performance
            sector_etfs = {
                "XLK": "Technology",
                "XLF": "Financial",
                "XLV": "Healthcare", 
                "XLE": "Energy",
                "XLI": "Industrial",
                "XLY": "Consumer Discretionary",
                "XLP": "Consumer Staples",
                "XLU": "Utilities",
                "XLB": "Materials"
            }
            
            sector_data = {}
            try:
                sector_prices = yf.download(list(sector_etfs.keys()), period="5d", progress=False)
                
                for etf, sector in sector_etfs.items():
                    if etf in sector_prices['Close'].columns:
                        prices = sector_prices['Close'][etf].dropna()
                        if len(prices) >= 2:
                            current = prices.iloc[-1]
                            previous = prices.iloc[-2]
                            change = (current - previous) / previous
                            
                            sector_data[sector] = {
                                "symbol": etf,
                                "change_percent": float(change * 100)
                            }
            except:
                logger.warning("Failed to fetch sector data")
            
            result = {
                "timestamp": datetime.now().isoformat(),
                "indices": market_data,
                "sectors": sector_data,
                "market_sentiment": "Neutral",  # Could be enhanced with sentiment analysis
                "volatility_level": market_data.get("VIX", {}).get("current", 20)
            }
            
            # Cache for 5 minutes
            cache.set(cache_key, result, ttl=300)
            
            return result
            
        except Exception as e:
            logger.error(f"Market data fetch failed: {e}")
            # Return cached data or minimal response
            return {
                "timestamp": datetime.now().isoformat(),
                "indices": {},
                "sectors": {},
                "market_sentiment": "Unknown",
                "error": "Market data temporarily unavailable"
            }
        
    except Exception as e:
        logger.error(f"Market summary failed: {e}")
        raise HTTPException(
            status_code=500,
            detail="Market summary unavailable"
        )