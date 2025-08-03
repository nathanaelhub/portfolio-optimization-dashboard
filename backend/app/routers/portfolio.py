from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
import yfinance as yf
import pandas as pd
import numpy as np

router = APIRouter()

class StockInfo(BaseModel):
    symbol: str
    name: str
    sector: Optional[str] = None
    market_cap: Optional[float] = None
    current_price: Optional[float] = None

@router.get("/search/{query}")
async def search_stocks(query: str, limit: int = 10):
    """
    Search for stocks by symbol or name
    """
    # Common stocks database (in production, use a proper stock database API)
    common_stocks = [
        {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Technology"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Discretionary"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Automotive"},
        {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Technology"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology"},
        {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "sector": "ETF"},
        {"symbol": "QQQ", "name": "Invesco QQQ Trust", "sector": "ETF"},
        {"symbol": "VTI", "name": "Vanguard Total Stock Market ETF", "sector": "ETF"},
        {"symbol": "BRK.B", "name": "Berkshire Hathaway Inc.", "sector": "Financial"},
        {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial"},
        {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare"},
        {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Staples"},
        {"symbol": "V", "name": "Visa Inc.", "sector": "Financial"},
        {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financial"},
        {"symbol": "HD", "name": "Home Depot Inc.", "sector": "Consumer Discretionary"},
        {"symbol": "DIS", "name": "Walt Disney Co.", "sector": "Entertainment"},
        {"symbol": "NFLX", "name": "Netflix Inc.", "sector": "Entertainment"},
        {"symbol": "KO", "name": "Coca-Cola Co.", "sector": "Consumer Staples"}
    ]
    
    query = query.upper()
    
    # Filter stocks by symbol or name
    results = []
    for stock in common_stocks:
        if (query in stock["symbol"] or 
            query.lower() in stock["name"].lower()):
            results.append(stock)
            
        if len(results) >= limit:
            break
    
    return results

@router.get("/info/{symbol}")
async def get_stock_info(symbol: str):
    """
    Get detailed information about a specific stock
    """
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        hist = ticker.history(period="1y")
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"Stock {symbol} not found")
        
        # Calculate basic metrics
        current_price = hist['Close'].iloc[-1]
        year_high = hist['High'].max()
        year_low = hist['Low'].min()
        
        returns = hist['Close'].pct_change().dropna()
        volatility = returns.std() * (252 ** 0.5)  # Annualized volatility
        
        return {
            "symbol": symbol,
            "name": info.get("longName", symbol),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "market_cap": info.get("marketCap"),
            "current_price": float(current_price),
            "year_high": float(year_high),
            "year_low": float(year_low),
            "volatility": float(volatility),
            "dividend_yield": info.get("dividendYield"),
            "pe_ratio": info.get("trailingPE"),
            "description": info.get("longBusinessSummary", "")[:500] + "..." if info.get("longBusinessSummary") else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching stock info: {str(e)}")

@router.get("/correlation-matrix")
async def get_correlation_matrix(symbols: str):
    """
    Get correlation matrix for a list of symbols
    """
    try:
        symbol_list = symbols.split(",")
        
        # Fetch data
        data = yf.download(symbol_list, period="2y", progress=False)['Adj Close']
        
        if isinstance(data, pd.Series):
            data = data.to_frame()
        
        # Calculate returns
        returns = data.pct_change().dropna()
        
        # Calculate correlation matrix
        correlation_matrix = returns.corr()
        
        return {
            "symbols": list(correlation_matrix.columns),
            "correlation_matrix": correlation_matrix.values.tolist()
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating correlation matrix: {str(e)}")

@router.get("/sectors")
async def get_sector_allocation(symbols: str):
    """
    Get sector allocation for a list of symbols
    """
    try:
        symbol_list = symbols.split(",")
        sector_data = {}
        
        for symbol in symbol_list:
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                sector = info.get("sector", "Unknown")
                
                if sector not in sector_data:
                    sector_data[sector] = []
                sector_data[sector].append(symbol)
                
            except:
                # If we can't get sector info, put in Unknown
                if "Unknown" not in sector_data:
                    sector_data["Unknown"] = []
                sector_data["Unknown"].append(symbol)
        
        return sector_data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error getting sector allocation: {str(e)}")

@router.post("/validate")
async def validate_portfolio(holdings: List[Dict[str, any]]):
    """
    Validate portfolio holdings and check for issues
    """
    try:
        issues = []
        total_allocation = sum(holding.get("allocation", 0) for holding in holdings)
        
        # Check total allocation
        if abs(total_allocation - 100) > 0.01:
            issues.append({
                "type": "allocation_error",
                "message": f"Total allocation is {total_allocation:.1f}%, should be 100%"
            })
        
        # Check for duplicate symbols
        symbols = [holding.get("symbol", "").upper() for holding in holdings]
        duplicates = set([symbol for symbol in symbols if symbols.count(symbol) > 1])
        if duplicates:
            issues.append({
                "type": "duplicate_symbols",
                "message": f"Duplicate symbols found: {', '.join(duplicates)}"
            })
        
        # Check if symbols exist
        invalid_symbols = []
        for holding in holdings:
            symbol = holding.get("symbol", "").upper()
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period="5d")
                if hist.empty:
                    invalid_symbols.append(symbol)
            except:
                invalid_symbols.append(symbol)
        
        if invalid_symbols:
            issues.append({
                "type": "invalid_symbols",
                "message": f"Invalid or inactive symbols: {', '.join(invalid_symbols)}"
            })
        
        # Check for over-concentration
        for holding in holdings:
            allocation = holding.get("allocation", 0)
            if allocation > 50:
                issues.append({
                    "type": "concentration_risk",
                    "message": f"{holding.get('symbol')} has {allocation}% allocation - consider diversifying"
                })
        
        return {
            "is_valid": len(issues) == 0,
            "issues": issues,
            "total_allocation": total_allocation
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error validating portfolio: {str(e)}")