"""
Example usage of the advanced portfolio optimization system.

This demonstrates how to use the optimization classes with real-world scenarios.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from advanced_optimization import AdvancedPortfolioOptimizer
from portfolio_analytics import PortfolioAnalytics


def generate_sample_data():
    """Generate sample return data for demonstration."""
    np.random.seed(42)
    dates = pd.date_range(end=datetime.now(), periods=504, freq='D')
    
    # Simulate returns for different asset classes
    assets = ['STOCKS', 'BONDS', 'REAL_ESTATE', 'COMMODITIES', 'INTL_STOCKS']
    
    # Annual return and volatility assumptions
    params = {
        'STOCKS': {'return': 0.10, 'vol': 0.16},
        'BONDS': {'return': 0.04, 'vol': 0.05},
        'REAL_ESTATE': {'return': 0.08, 'vol': 0.12},
        'COMMODITIES': {'return': 0.06, 'vol': 0.20},
        'INTL_STOCKS': {'return': 0.09, 'vol': 0.18}
    }
    
    # Correlation matrix
    corr_matrix = np.array([
        [1.00, 0.15, 0.60, 0.30, 0.75],  # STOCKS
        [0.15, 1.00, 0.20, -0.10, 0.10],  # BONDS
        [0.60, 0.20, 1.00, 0.40, 0.50],  # REAL_ESTATE
        [0.30, -0.10, 0.40, 1.00, 0.25],  # COMMODITIES
        [0.75, 0.10, 0.50, 0.25, 1.00]   # INTL_STOCKS
    ])
    
    # Generate correlated returns
    L = np.linalg.cholesky(corr_matrix)
    
    returns_data = {}
    for i, asset in enumerate(assets):
        daily_return = params[asset]['return'] / 252
        daily_vol = params[asset]['vol'] / np.sqrt(252)
        
        # Generate random returns
        random_returns = np.random.normal(daily_return, daily_vol, len(dates))
        returns_data[asset] = random_returns
    
    # Apply correlation
    returns_matrix = np.array(list(returns_data.values())).T
    correlated_returns = returns_matrix @ L.T
    
    # Create DataFrame
    returns_df = pd.DataFrame(correlated_returns, 
                            index=dates, 
                            columns=assets)
    
    # Create price series
    prices_df = (1 + returns_df).cumprod() * 100
    
    return returns_df, prices_df


def example_mean_variance_optimization():
    """Example: Traditional Markowitz optimization."""
    print("=" * 60)
    print("EXAMPLE 1: Mean-Variance Optimization")
    print("=" * 60)
    
    # Generate sample data
    returns, prices = generate_sample_data()
    
    # Initialize optimizer
    optimizer = AdvancedPortfolioOptimizer(returns)
    
    # Run optimization
    result = optimizer.mean_variance_optimization(
        max_position=0.35,  # No more than 35% in any asset
        min_position=0.05   # At least 5% in each asset
    )
    
    print("\nOptimal Weights:")
    for asset, weight in result['weights'].items():
        print(f"  {asset}: {weight*100:.1f}%")
    
    print(f"\nExpected Annual Return: {result['expected_return']*100:.1f}%")
    print(f"Annual Volatility: {result['volatility']*100:.1f}%")
    print(f"Sharpe Ratio: {result['sharpe_ratio']:.2f}")
    
    print("\nExplanation:")
    print(result['explanation'])
    
    # Calculate risk metrics
    risk_metrics = optimizer.calculate_risk_metrics(result['weights'])
    print(f"\nValue at Risk (95%): {risk_metrics['var_95']*100:.1f}%")
    print(f"Maximum Drawdown: {risk_metrics['max_drawdown']*100:.1f}%")
    
    return result


def example_black_litterman():
    """Example: Black-Litterman with investor views."""
    print("\n" + "=" * 60)
    print("EXAMPLE 2: Black-Litterman Model")
    print("=" * 60)
    
    returns, prices = generate_sample_data()
    optimizer = AdvancedPortfolioOptimizer(returns)
    
    # Market capitalizations (example values)
    market_caps = {
        'STOCKS': 40e12,
        'BONDS': 30e12,
        'REAL_ESTATE': 15e12,
        'COMMODITIES': 5e12,
        'INTL_STOCKS': 25e12
    }
    
    # Investor views
    views = {
        'STOCKS': 0.12,  # Bullish on stocks (12% expected return)
        'BONDS': 0.03,   # Bearish on bonds (3% expected return)
        'COMMODITIES': 0.10  # Bullish on commodities
    }
    
    # Confidence in views (0-1 scale)
    view_confidences = {
        'STOCKS': 0.75,      # High confidence
        'BONDS': 0.60,       # Moderate confidence
        'COMMODITIES': 0.40  # Low confidence
    }
    
    # Run Black-Litterman
    result = optimizer.black_litterman(
        market_caps=market_caps,
        views=views,
        view_confidences=view_confidences
    )
    
    print("\nMarket Cap Weights vs Optimal Weights:")
    total_cap = sum(market_caps.values())
    for asset in optimizer.assets:
        market_weight = market_caps.get(asset, 0) / total_cap
        optimal_weight = result['weights'].get(asset, 0)
        print(f"  {asset}: Market {market_weight*100:.1f}% → Optimal {optimal_weight*100:.1f}%")
    
    print("\nPosterior Expected Returns (incorporating views):")
    for asset, ret in result['posterior_returns'].items():
        print(f"  {asset}: {ret*100:.1f}%")
    
    print("\nExplanation:")
    print(result['explanation'])
    
    return result


def example_risk_parity():
    """Example: Risk Parity allocation."""
    print("\n" + "=" * 60)
    print("EXAMPLE 3: Risk Parity")
    print("=" * 60)
    
    returns, prices = generate_sample_data()
    optimizer = AdvancedPortfolioOptimizer(returns)
    
    # Run Risk Parity
    result = optimizer.risk_parity()
    
    print("\nRisk Parity Weights:")
    for asset, weight in result['weights'].items():
        print(f"  {asset}: {weight*100:.1f}%")
    
    print("\nRisk Contributions (should be ~equal):")
    for asset, contrib in result['risk_contributions'].items():
        print(f"  {asset}: {contrib*100:.1f}%")
    
    print("\nExplanation:")
    print(result['explanation'])
    
    # Compare to equal weight
    equal_weights = {asset: 1/len(optimizer.assets) for asset in optimizer.assets}
    equal_metrics = optimizer.calculate_risk_metrics(equal_weights)
    rp_metrics = optimizer.calculate_risk_metrics(result['weights'])
    
    print("\nRisk Parity vs Equal Weight:")
    print(f"  Sharpe Ratio: {rp_metrics['sharpe_ratio']:.2f} vs {equal_metrics['sharpe_ratio']:.2f}")
    print(f"  Max Drawdown: {rp_metrics['max_drawdown']*100:.1f}% vs {equal_metrics['max_drawdown']*100:.1f}%")
    
    return result


def example_full_analytics():
    """Example: Complete portfolio analytics workflow."""
    print("\n" + "=" * 60)
    print("EXAMPLE 4: Complete Portfolio Analytics")
    print("=" * 60)
    
    returns, prices = generate_sample_data()
    
    # Initialize analytics
    analytics = PortfolioAnalytics(prices)
    
    # 1. Detect market regime
    print("\n1. Market Regime Detection:")
    regime = analytics.detect_market_regime()
    print(f"   Current Regime: {regime['regime']} (confidence: {regime['confidence']:.1%})")
    print(f"   Recommendation: {regime['recommendation']}")
    
    # 2. Optimize portfolio
    print("\n2. Portfolio Optimization:")
    result = analytics.optimize_portfolio(
        method='mean_variance',
        max_position=0.40,
        min_position=0.05
    )
    
    for asset, weight in result['weights'].items():
        print(f"   {asset}: {weight*100:.1f}%")
    
    # 3. Stress test
    print("\n3. Stress Testing:")
    stress_results = analytics.stress_test_portfolio(result['weights'])
    
    for scenario, impact in stress_results['scenario_results'].items():
        print(f"   {scenario}: {impact['worst_case_loss']*100:.1f}% potential loss")
    
    print(f"\n   {stress_results['stress_test_summary']}")
    
    # 4. Backtest strategy
    print("\n4. Strategy Backtest:")
    backtest = analytics.backtest_strategy(
        strategy='mean_variance',
        rebalance_frequency='monthly'
    )
    
    print(f"   Annual Return: {backtest['annual_return']*100:.1f}%")
    print(f"   Sharpe Ratio: {backtest['sharpe_ratio']:.2f}")
    print(f"   Max Drawdown: {backtest['max_drawdown']*100:.1f}%")
    print(f"   Win Rate: {backtest['win_rate']*100:.1f}%")
    
    # 5. Monte Carlo simulation
    print("\n5. Monte Carlo Simulation (1-year horizon):")
    simulation = result['risk_metrics']  # Already includes basic metrics
    
    optimizer = AdvancedPortfolioOptimizer(returns)
    mc_results = optimizer.monte_carlo_simulation(
        weights=result['weights'],
        n_simulations=10000,
        time_horizon=252
    )
    
    print(f"   Expected Return: {(mc_results['expected_final_value']-1)*100:.1f}%")
    print(f"   5th Percentile: {(mc_results['percentile_5']-1)*100:.1f}%")
    print(f"   95th Percentile: {(mc_results['percentile_95']-1)*100:.1f}%")
    print(f"   Probability of Loss: {mc_results['probability_of_loss']*100:.1f}%")
    
    return analytics


def example_rebalancing_analysis():
    """Example: Analyzing rebalancing needs."""
    print("\n" + "=" * 60)
    print("EXAMPLE 5: Rebalancing Analysis")
    print("=" * 60)
    
    returns, prices = generate_sample_data()
    analytics = PortfolioAnalytics(prices)
    
    # Current portfolio (drifted from targets)
    current_weights = {
        'STOCKS': 0.45,      # Target was 0.35
        'BONDS': 0.15,       # Target was 0.25
        'REAL_ESTATE': 0.20, # Target was 0.20
        'COMMODITIES': 0.08, # Target was 0.10
        'INTL_STOCKS': 0.12  # Target was 0.10
    }
    
    # Get optimal weights
    result = analytics.optimize_portfolio(method='mean_variance')
    
    # Analyze rebalancing
    rebalancing = analytics.analyze_rebalancing(
        current_weights=current_weights,
        target_weights=result['weights'],
        threshold=0.03  # 3% threshold
    )
    
    print("\nRequired Trades:")
    for asset, trade in rebalancing['priority_trades'].items():
        action = trade['action']
        change = trade['change']
        print(f"  {asset}: {action} {abs(change)*100:.1f}% "
              f"({trade['current_weight']*100:.1f}% → {trade['target_weight']*100:.1f}%)")
    
    print(f"\nTotal Turnover: {rebalancing['total_turnover']*100:.1f}%")
    print(f"Estimated Cost: {rebalancing['cost_as_percent']:.2f}%")
    print(f"\nRecommendation: {rebalancing['recommendation']}")
    
    return rebalancing


if __name__ == "__main__":
    # Run all examples
    print("ADVANCED PORTFOLIO OPTIMIZATION EXAMPLES")
    print("========================================\n")
    
    # Example 1: Mean-Variance
    mv_result = example_mean_variance_optimization()
    
    # Example 2: Black-Litterman
    bl_result = example_black_litterman()
    
    # Example 3: Risk Parity
    rp_result = example_risk_parity()
    
    # Example 4: Full Analytics
    analytics = example_full_analytics()
    
    # Example 5: Rebalancing
    rebalancing = example_rebalancing_analysis()
    
    print("\n" + "=" * 60)
    print("All examples completed successfully!")
    print("=" * 60)