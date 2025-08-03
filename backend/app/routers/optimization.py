from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Optional
from app.services.optimization import PortfolioOptimizer

router = APIRouter()

class HoldingInput(BaseModel):
    symbol: str
    allocation: float

class OptimizationRequest(BaseModel):
    holdings: List[HoldingInput]
    risk_tolerance: int = 5
    investment_horizon: int = 10
    strategy: str = "max_sharpe"  # max_sharpe, min_volatility, risk_parity, black_litterman
    constraints: Optional[Dict[str, List[float]]] = None
    views: Optional[Dict[str, float]] = None
    view_confidences: Optional[Dict[str, float]] = None

class PortfolioMetrics(BaseModel):
    expected_return: float
    volatility: float
    sharpe_ratio: float
    sortino_ratio: Optional[float] = None
    var_95: Optional[float] = None
    max_drawdown: Optional[float] = None
    weights: Dict[str, float]

@router.post("/optimize", response_model=PortfolioMetrics)
async def optimize_portfolio(request: OptimizationRequest):
    """
    Optimize portfolio based on specified strategy and constraints
    """
    try:
        symbols = [holding.symbol for holding in request.holdings]
        optimizer = PortfolioOptimizer(symbols)
        
        # Fetch data and calculate returns/risk
        optimizer.fetch_data()
        
        # Choose optimization strategy
        if request.strategy == "max_sharpe":
            result = optimizer.optimize_max_sharpe(request.constraints)
        elif request.strategy == "min_volatility":
            result = optimizer.optimize_min_volatility(request.constraints)
        elif request.strategy == "risk_parity":
            result = optimizer.optimize_risk_parity()
        elif request.strategy == "black_litterman":
            if not request.views:
                raise HTTPException(status_code=400, detail="Views required for Black-Litterman optimization")
            result = optimizer.black_litterman_optimization(
                request.views, 
                request.view_confidences or {}
            )
        else:
            raise HTTPException(status_code=400, detail="Invalid optimization strategy")
        
        return PortfolioMetrics(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Optimization failed: {str(e)}")

@router.post("/efficient-frontier")
async def generate_efficient_frontier(request: OptimizationRequest):
    """
    Generate efficient frontier points for visualization
    """
    try:
        symbols = [holding.symbol for holding in request.holdings]
        optimizer = PortfolioOptimizer(symbols)
        
        frontier_points = optimizer.generate_efficient_frontier(num_points=30)
        
        return {
            "frontier_points": frontier_points,
            "symbols": symbols
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Efficient frontier generation failed: {str(e)}")

@router.post("/analyze-portfolio", response_model=PortfolioMetrics)
async def analyze_current_portfolio(request: OptimizationRequest):
    """
    Analyze current portfolio performance and metrics
    """
    try:
        symbols = [holding.symbol for holding in request.holdings]
        current_weights = {holding.symbol: holding.allocation / 100 for holding in request.holdings}
        
        optimizer = PortfolioOptimizer(symbols)
        optimizer.fetch_data()
        
        metrics = optimizer.calculate_portfolio_metrics(current_weights)
        
        return PortfolioMetrics(**metrics)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portfolio analysis failed: {str(e)}")

@router.get("/market-data/{symbol}")
async def get_market_data(symbol: str, period: str = "1y"):
    """
    Get historical market data for a specific symbol
    """
    try:
        import yfinance as yf
        
        ticker = yf.Ticker(symbol)
        hist = ticker.history(period=period)
        
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No data found for symbol {symbol}")
        
        # Calculate basic metrics
        returns = hist['Close'].pct_change().dropna()
        
        data = {
            "symbol": symbol,
            "current_price": float(hist['Close'].iloc[-1]),
            "price_change_1d": float(hist['Close'].iloc[-1] - hist['Close'].iloc[-2]),
            "price_change_1d_pct": float((hist['Close'].iloc[-1] / hist['Close'].iloc[-2] - 1) * 100),
            "volatility_annual": float(returns.std() * (252 ** 0.5)),
            "return_annual": float((hist['Close'].iloc[-1] / hist['Close'].iloc[0]) ** (252 / len(hist)) - 1),
            "historical_prices": [
                {
                    "date": date.strftime("%Y-%m-%d"),
                    "close": float(price)
                }
                for date, price in hist['Close'].items()
            ][-60:]  # Last 60 days
        }
        
        return data
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Market data retrieval failed: {str(e)}")

@router.post("/backtest")
async def backtest_strategy(request: OptimizationRequest):
    """
    Backtest optimization strategy over historical periods
    """
    try:
        symbols = [holding.symbol for holding in request.holdings]
        optimizer = PortfolioOptimizer(symbols, period="5y")  # Use longer period for backtesting
        
        # Fetch data
        prices = optimizer.fetch_data()
        
        # Simple backtest: rebalance monthly
        monthly_returns = []
        rebalance_dates = prices.resample('M').last().index
        
        for i in range(1, len(rebalance_dates) - 12):  # Leave 12 months for out-of-sample
            # Use 2 years of data for optimization
            start_date = rebalance_dates[max(0, i-24)]
            end_date = rebalance_dates[i]
            
            # Create optimizer with historical data
            hist_prices = prices[start_date:end_date]
            
            if len(hist_prices) < 252:  # Need at least 1 year of data
                continue
                
            temp_optimizer = PortfolioOptimizer(symbols)
            temp_optimizer.prices = hist_prices
            temp_optimizer.calculate_returns_and_risk()
            
            # Optimize
            if request.strategy == "max_sharpe":
                result = temp_optimizer.optimize_max_sharpe()
            elif request.strategy == "min_volatility":
                result = temp_optimizer.optimize_min_volatility()
            else:
                result = temp_optimizer.optimize_max_sharpe()  # Default
            
            # Calculate next month's return
            next_month_start = rebalance_dates[i]
            next_month_end = rebalance_dates[i + 1] if i + 1 < len(rebalance_dates) else prices.index[-1]
            
            next_month_prices = prices[next_month_start:next_month_end]
            if len(next_month_prices) > 1:
                monthly_return = ((next_month_prices.iloc[-1] / next_month_prices.iloc[0] - 1) * 
                                pd.Series(result['weights'])).sum()
                monthly_returns.append({
                    "date": next_month_start.strftime("%Y-%m-%d"),
                    "return": float(monthly_return),
                    "weights": result['weights']
                })
        
        # Calculate backtest metrics
        if monthly_returns:
            returns_series = [r['return'] for r in monthly_returns]
            total_return = np.prod([1 + r for r in returns_series]) - 1
            annual_return = (1 + total_return) ** (12 / len(returns_series)) - 1
            annual_volatility = np.std(returns_series) * (12 ** 0.5)
            sharpe_ratio = annual_return / annual_volatility if annual_volatility > 0 else 0
            
            return {
                "backtest_results": monthly_returns,
                "summary_metrics": {
                    "total_return": float(total_return),
                    "annual_return": float(annual_return),
                    "annual_volatility": float(annual_volatility),
                    "sharpe_ratio": float(sharpe_ratio),
                    "num_periods": len(monthly_returns)
                }
            }
        else:
            raise HTTPException(status_code=400, detail="Insufficient data for backtesting")
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Backtesting failed: {str(e)}")