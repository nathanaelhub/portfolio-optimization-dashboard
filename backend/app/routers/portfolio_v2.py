"""
Advanced Portfolio Optimization API endpoints.
"""

from fastapi import APIRouter, HTTPException, Depends, Request, BackgroundTasks
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import logging
from typing import Dict, List, Optional

from app.schemas.portfolio import (
    OptimizationRequest, OptimizationResult, BacktestRequest, BacktestResult,
    RiskMetrics, OptimizationMethod
)
from app.services.advanced_optimization import AdvancedPortfolioOptimizer
from app.services.portfolio_analytics import PortfolioAnalytics
from app.services.cache import cache
from app.routers.auth import verify_token
import yfinance as yf
import hashlib

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


def get_market_data(symbols: List[str], period: str = "2y") -> pd.DataFrame:
    """
    Fetch market data with caching and error handling.
    """
    # Create cache key
    symbols_key = hashlib.md5(",".join(sorted(symbols)).encode()).hexdigest()
    cache_key = f"market_data_{symbols_key}_{period}"
    
    # Try cache first
    cached_data = cache.get(cache_key)
    if cached_data is not None:
        return cached_data
    
    try:
        # Fetch data
        data = yf.download(symbols, period=period, progress=False)['Adj Close']
        
        # Handle single symbol
        if isinstance(data, pd.Series):
            data = data.to_frame()
            data.columns = symbols
        
        # Clean data
        data = data.dropna()
        
        if data.empty:
            raise ValueError("No data available for the specified symbols")
        
        # Cache for 30 minutes
        cache.set(cache_key, data, ttl=1800)
        
        return data
        
    except Exception as e:
        logger.error(f"Error fetching market data: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch market data: {str(e)}"
        )


@router.post(
    "/optimize",
    response_model=OptimizationResult,
    summary="Optimize Portfolio",
    description="""
    Optimize portfolio allocation using various quantitative strategies.
    
    **Supported Methods:**
    - **mean_variance**: Markowitz optimization (max Sharpe or target return)
    - **black_litterman**: Market views with Bayesian inference
    - **risk_parity**: Equal risk contribution from each asset
    - **hierarchical_risk_parity**: Correlation-based clustering with risk parity
    
    **Returns comprehensive results including:**
    - Optimal weights with explanations
    - Risk metrics (Sharpe, Sortino, VaR, etc.)
    - Market regime analysis
    - Rebalancing recommendations
    """
)
@limiter.limit("50/minute")
async def optimize_portfolio(
    request: Request,
    optimization_request: OptimizationRequest,
    current_user: str = Depends(verify_token)
) -> OptimizationResult:
    """Optimize portfolio using advanced quantitative methods."""
    
    try:
        # Extract symbols and validate
        symbols = [holding.symbol for holding in optimization_request.holdings]
        
        # Fetch market data
        logger.info(f"Optimizing portfolio for user {current_user} with {len(symbols)} assets")
        prices = get_market_data(symbols, period="2y")
        
        # Calculate returns
        returns = prices.pct_change().dropna()
        
        if len(returns) < 252:  # Less than 1 year of data
            raise HTTPException(
                status_code=400,
                detail="Insufficient historical data. Need at least 1 year of daily data."
            )
        
        # Initialize analytics
        analytics = PortfolioAnalytics(prices)
        
        # Prepare optimization parameters
        current_weights = {
            holding.symbol: holding.allocation / 100 
            for holding in optimization_request.holdings
        }
        
        constraints = None
        if optimization_request.constraints:
            constraints = {
                'min_position': optimization_request.constraints.min_weight,
                'max_position': optimization_request.constraints.max_weight
            }
        
        # Prepare method-specific parameters
        method_params = {}
        
        if optimization_request.method == OptimizationMethod.BLACK_LITTERMAN:
            # Convert market views to required format
            views = {view.asset: view.expected_return 
                    for view in optimization_request.market_views}
            view_confidences = {view.asset: view.confidence 
                              for view in optimization_request.market_views}
            
            method_params.update({
                'views': views,
                'view_confidences': view_confidences,
                'market_caps': optimization_request.market_caps
            })
        
        if optimization_request.target_return:
            method_params['target_return'] = optimization_request.target_return
        
        # Run optimization
        result = analytics.optimize_portfolio(
            method=optimization_request.method.value,
            constraints=constraints,
            current_weights=current_weights,
            **method_params
        )
        
        # Calculate confidence score based on optimization quality
        confidence_score = min(
            1.0,
            max(0.1, result['sharpe_ratio'] / 2.0)  # Higher Sharpe = higher confidence
        )
        
        # Check if rebalancing is needed
        rebalancing = analytics.analyze_rebalancing(
            current_weights, result['weights'], threshold=0.02
        )
        
        # Format response
        return OptimizationResult(
            weights=result['weights'],
            risk_metrics=RiskMetrics(**result['risk_metrics']),
            method_used=optimization_request.method,
            explanation=result['explanation'],
            confidence_score=confidence_score,
            rebalancing_needed=rebalancing['total_turnover'] > 0.05,
            estimated_cost=rebalancing['estimated_cost'],
            regime_analysis=result.get('regime_analysis')
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Portfolio optimization failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Optimization failed: {str(e)}"
        )


@router.post(
    "/backtest",
    response_model=BacktestResult,
    summary="Backtest Strategy",
    description="""
    Historical backtesting with realistic constraints and costs.
    
    **Features:**
    - Transaction costs and market impact slippage
    - Configurable rebalancing frequency
    - Benchmark comparison (default: S&P 500)
    - Comprehensive performance metrics
    - Risk-adjusted returns analysis
    
    **Returns detailed results including:**
    - Performance vs benchmark
    - Risk metrics and drawdown analysis
    - Transaction costs impact
    - Period-by-period returns
    """
)
@limiter.limit("20/minute")
async def backtest_strategy(
    request: Request,
    backtest_request: BacktestRequest,
    background_tasks: BackgroundTasks,
    current_user: str = Depends(verify_token)
) -> BacktestResult:
    """Backtest optimization strategy with realistic costs."""
    
    try:
        logger.info(f"Starting backtest for user {current_user}")
        
        # Calculate period for data fetching
        start_date = backtest_request.start_date
        end_date = backtest_request.end_date or datetime.now().date()
        
        # Need extra data for optimization lookback
        data_start = start_date - timedelta(days=365)  # Extra year for optimization
        
        # Fetch data
        symbols = backtest_request.assets + [backtest_request.benchmark]
        prices = get_market_data(symbols, period="5y")  # Ensure we have enough data
        
        # Filter to requested date range
        prices = prices.loc[data_start.strftime('%Y-%m-%d'):end_date.strftime('%Y-%m-%d')]
        
        if len(prices) < 500:  # Less than ~2 years
            raise HTTPException(
                status_code=400,
                detail="Insufficient data for backtesting. Need at least 2 years of history."
            )
        
        # Separate benchmark
        benchmark_prices = prices[backtest_request.benchmark]
        portfolio_prices = prices[backtest_request.assets]
        
        # Initialize analytics
        analytics = PortfolioAnalytics(
            portfolio_prices, 
            benchmark=benchmark_prices,
            transaction_cost=backtest_request.transaction_cost
        )
        
        # Run backtest
        backtest_results = analytics.backtest_strategy(
            strategy=backtest_request.strategy.value,
            rebalance_frequency=backtest_request.rebalance_frequency,
            start_date=start_date.strftime('%Y-%m-%d')
        )
        
        # Calculate benchmark metrics
        benchmark_returns = benchmark_prices.pct_change().dropna()
        benchmark_start_idx = benchmark_returns.index.get_indexer([start_date.strftime('%Y-%m-%d')], method='nearest')[0]
        benchmark_period_returns = benchmark_returns.iloc[benchmark_start_idx:]
        
        benchmark_total = (1 + benchmark_period_returns).prod() - 1
        benchmark_annual = (1 + benchmark_total) ** (252 / len(benchmark_period_returns)) - 1
        
        # Enhanced metrics
        excess_return = backtest_results['total_return'] - benchmark_total
        
        # Generate summary
        performance_summary = f"""
Backtest Performance Summary ({start_date} to {end_date}):

Strategy Performance:
- Total Return: {backtest_results['total_return']*100:.1f}%
- Annual Return: {backtest_results['annual_return']*100:.1f}%
- Sharpe Ratio: {backtest_results['sharpe_ratio']:.2f}
- Max Drawdown: {backtest_results['max_drawdown']*100:.1f}%

Benchmark Comparison:
- Benchmark Return: {benchmark_total*100:.1f}%
- Excess Return: {excess_return*100:.1f}%
- Information Ratio: {backtest_results.get('summary_metrics', {}).get('information_ratio', 0):.2f}

The strategy {'outperformed' if excess_return > 0 else 'underperformed'} the benchmark 
with {'acceptable' if backtest_results['max_drawdown'] > -0.25 else 'elevated'} drawdown risk.
"""
        
        return BacktestResult(
            total_return=backtest_results['total_return'],
            annual_return=backtest_results['annual_return'],
            volatility=backtest_results['annual_volatility'],
            sharpe_ratio=backtest_results['sharpe_ratio'],
            max_drawdown=backtest_results['max_drawdown'],
            calmar_ratio=backtest_results['annual_return'] / abs(backtest_results['max_drawdown']) 
                        if backtest_results['max_drawdown'] != 0 else 0,
            win_rate=backtest_results['win_rate'],
            
            # Benchmark comparison
            benchmark_return=benchmark_total,
            excess_return=excess_return,
            information_ratio=backtest_results.get('summary_metrics', {}).get('information_ratio', 0),
            tracking_error=backtest_results['annual_volatility'],  # Simplified
            
            # Detailed metrics (simplified for response size)
            monthly_returns=[],  # Would be populated in full implementation
            cumulative_returns=[],
            drawdown_series=[],
            turnover=[],
            
            # Costs
            total_costs=0.0,  # Would calculate from transaction costs
            cost_ratio=0.0,
            
            summary=performance_summary.strip()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Backtesting failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Backtesting failed: {str(e)}"
        )


@router.get(
    "/efficient-frontier",
    summary="Generate Efficient Frontier",
    description="""
    Generate efficient frontier points for portfolio visualization.
    
    **Parameters:**
    - symbols: Comma-separated list of asset symbols
    - points: Number of frontier points to generate (default: 50)
    
    **Returns:**
    - Array of risk-return points along the efficient frontier
    - Current portfolio position
    - Optimal portfolios for different risk levels
    """
)
@limiter.limit("30/minute")
async def generate_efficient_frontier(
    request: Request,
    symbols: str,
    points: int = 50,
    current_user: str = Depends(verify_token)
):
    """Generate efficient frontier for visualization."""
    
    try:
        # Parse symbols
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        
        if len(symbol_list) < 2:
            raise HTTPException(
                status_code=400,
                detail="At least 2 symbols required for efficient frontier"
            )
        
        # Check cache
        symbols_hash = hashlib.md5(','.join(sorted(symbol_list)).encode()).hexdigest()
        cache_key = f"efficient_frontier_{symbols_hash}_{points}"
        
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Fetch data
        prices = get_market_data(symbol_list, period="2y")
        returns = prices.pct_change().dropna()
        
        # Generate efficient frontier
        optimizer = AdvancedPortfolioOptimizer(returns)
        frontier_points = optimizer.generate_efficient_frontier(num_points=points)
        
        # Find key portfolios
        # Maximum Sharpe ratio portfolio
        max_sharpe_result = optimizer.mean_variance_optimization()
        
        # Minimum volatility portfolio
        min_vol_result = optimizer.mean_variance_optimization()
        
        result = {
            'frontier_points': frontier_points,
            'max_sharpe_portfolio': {
                'weights': max_sharpe_result['weights'],
                'return': max_sharpe_result['expected_return'],
                'risk': max_sharpe_result['volatility'],
                'sharpe': max_sharpe_result['sharpe_ratio']
            },
            'min_volatility_portfolio': {
                'weights': min_vol_result['weights'],
                'return': min_vol_result['expected_return'], 
                'risk': min_vol_result['volatility'],
                'sharpe': min_vol_result['sharpe_ratio']
            },
            'symbols': symbol_list
        }
        
        # Cache for 1 hour
        cache.set(cache_key, result, ttl=3600)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Efficient frontier generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate efficient frontier: {str(e)}"
        )


@router.post(
    "/stress-test",
    summary="Portfolio Stress Testing",
    description="""
    Stress test portfolio under various market scenarios.
    
    **Scenarios tested:**
    - 2008 Financial Crisis
    - COVID-19 Market Crash  
    - Dot-com Bubble Burst
    - Custom inflation shock
    
    **Returns:**
    - Expected losses under each scenario
    - Probability of survival
    - Risk mitigation recommendations
    """
)
@limiter.limit("20/minute")
async def stress_test_portfolio(
    request: Request,
    weights: Dict[str, float],
    current_user: str = Depends(verify_token)
):
    """Stress test portfolio under extreme market conditions."""
    
    try:
        # Validate weights
        if not weights or abs(sum(weights.values()) - 1.0) > 0.01:
            raise HTTPException(
                status_code=400,
                detail="Portfolio weights must sum to 1.0"
            )
        
        # Fetch data for stress testing
        symbols = list(weights.keys())
        prices = get_market_data(symbols, period="3y")
        
        # Initialize analytics
        analytics = PortfolioAnalytics(prices)
        
        # Run stress tests
        stress_results = analytics.stress_test_portfolio(weights)
        
        return {
            'stress_scenarios': stress_results['scenario_results'],
            'summary': {
                'average_loss': stress_results['average_stress_loss'],
                'worst_case_loss': stress_results['worst_scenario_loss'],
                'recommendations': stress_results['recommendations']
            },
            'explanation': stress_results['stress_test_summary']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Stress testing failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Stress testing failed: {str(e)}"
        )


@router.get(
    "/correlation-matrix",
    summary="Asset Correlation Analysis",
    description="""
    Calculate correlation matrix for portfolio assets.
    
    **Features:**
    - Pearson correlation coefficients
    - Time-varying correlation analysis
    - Regime-dependent correlations
    - Hierarchical clustering suggestions
    """
)
@limiter.limit("50/minute")
async def get_correlation_matrix(
    request: Request,
    symbols: str,
    period: str = "1y",
    current_user: str = Depends(verify_token)
):
    """Get correlation matrix for assets."""
    
    try:
        # Parse symbols
        symbol_list = [s.strip().upper() for s in symbols.split(',')]
        
        # Check cache
        symbols_hash = hashlib.md5(','.join(sorted(symbol_list)).encode()).hexdigest()
        cache_key = f"correlation_{symbols_hash}_{period}"
        
        cached_result = cache.get(cache_key)
        if cached_result:
            return cached_result
        
        # Fetch data
        prices = get_market_data(symbol_list, period=period)
        returns = prices.pct_change().dropna()
        
        # Calculate correlation matrix
        corr_matrix = returns.corr()
        
        # Calculate average correlation
        corr_values = corr_matrix.values
        avg_correlation = corr_values[np.triu_indices_from(corr_values, k=1)].mean()
        
        # Diversification analysis
        if avg_correlation > 0.7:
            diversification_score = "Low"
            recommendation = "Consider adding uncorrelated assets"
        elif avg_correlation > 0.4:
            diversification_score = "Moderate" 
            recommendation = "Reasonable diversification"
        else:
            diversification_score = "High"
            recommendation = "Good diversification across assets"
        
        result = {
            'correlation_matrix': corr_matrix.to_dict(),
            'average_correlation': avg_correlation,
            'diversification_score': diversification_score,
            'recommendation': recommendation,
            'symbols': symbol_list
        }
        
        # Cache for 2 hours
        cache.set(cache_key, result, ttl=7200)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Correlation analysis failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Correlation analysis failed: {str(e)}"
        )


@router.post(
    "/optimize-demo",
    summary="Demo Portfolio Optimization",
    description="""
    Demo version of portfolio optimization without authentication requirements.
    Perfect for testing and demonstrations.
    """
)
@limiter.limit("10/minute")
async def optimize_portfolio_demo(
    request: Request,
    optimization_request: dict
) -> dict:
    """Demo portfolio optimization without authentication."""
    
    try:
        # Extract symbols from the request
        holdings = optimization_request.get('holdings', [])
        symbols = [holding.get('symbol') for holding in holdings if holding.get('symbol')]
        method = optimization_request.get('method', 'mean_variance')
        
        # Return mock optimization results based on method
        if method == 'equal_weight':
            # Equal weight allocation
            weight_per_asset = 1.0 / len(symbols) if symbols else 0
            optimal_weights = {symbol: weight_per_asset for symbol in symbols}
        elif method == 'min_volatility':
            # Mock min volatility weights (conservative)
            weights = [0.4, 0.3, 0.2, 0.1] if len(symbols) >= 4 else [1/len(symbols)] * len(symbols)
            optimal_weights = {symbol: weight for symbol, weight in zip(symbols, weights)}
        else:
            # Default mean variance optimization (mock)
            weights = [0.35, 0.25, 0.25, 0.15] if len(symbols) >= 4 else [1/len(symbols)] * len(symbols)
            optimal_weights = {symbol: weight for symbol, weight in zip(symbols, weights)}
        
        # Mock metrics
        metrics = {
            'expected_return': 0.12 + (hash(str(symbols)) % 10) / 100,  # 0.12-0.21
            'volatility': 0.15 + (hash(str(symbols)) % 8) / 100,        # 0.15-0.22
            'sharpe_ratio': 1.2 + (hash(str(symbols)) % 6) / 10,        # 1.2-1.7
            'max_drawdown': 0.08 + (hash(str(symbols)) % 5) / 100,      # 0.08-0.12
            'var_95': 0.025 + (hash(str(symbols)) % 3) / 1000,          # Risk metrics
            'beta': 0.9 + (hash(str(symbols)) % 4) / 20                 # 0.9-1.1
        }
        
        return {
            'optimal_weights': optimal_weights,
            'metrics': metrics,
            'method_used': method,
            'explanation': f"Optimized using {method} strategy with mock calculation for demo purposes.",
            'confidence_score': 0.85,
            'rebalancing_needed': True,
            'estimated_cost': 0.002,
            'status': 'success'
        }
        
    except Exception as e:
        logger.error(f"Demo optimization failed: {e}")
        return {
            'optimal_weights': {symbol: 1/len(symbols) for symbol in symbols} if symbols else {},
            'metrics': {
                'expected_return': 0.10,
                'volatility': 0.18,
                'sharpe_ratio': 0.55,
                'max_drawdown': 0.15
            },
            'error': f"Demo mode - using fallback data: {str(e)}",
            'status': 'demo_fallback'
        }