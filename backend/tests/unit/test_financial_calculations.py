"""
Unit tests for financial calculations in portfolio optimization.

These tests verify the accuracy of core financial algorithms including:
- Portfolio optimization (mean-variance, risk parity, etc.)
- Risk metrics (VaR, CVaR, Sharpe ratio, etc.)
- Performance metrics (returns, volatility, drawdowns)
- Edge cases and numerical stability

Financial reasoning is provided for each test to ensure accuracy.
"""

import pytest
import numpy as np
import pandas as pd
from typing import Dict, List
from unittest.mock import Mock, patch

from app.services.optimization import PortfolioOptimizer
from app.services.portfolio_analytics import PortfolioAnalytics
from conftest import (
    assert_valid_portfolio_weights, 
    assert_positive_definite_matrix,
    assert_financial_metric_reasonable,
    unit, financial, performance
)


class TestOptimizationAlgorithms:
    """Test portfolio optimization algorithms with known solutions."""

    @unit
    @financial
    def test_mean_variance_optimization_two_asset_case(self, portfolio_optimizer):
        """
        Test mean-variance optimization with analytical solution.
        
        Financial reasoning: Two-asset case has closed-form solution.
        For assets with returns μ₁, μ₂ and covariance matrix Σ,
        optimal weights can be calculated analytically.
        """
        # Two uncorrelated assets with different expected returns
        expected_returns = np.array([0.10, 0.06])  # 10% vs 6% annual
        cov_matrix = np.array([
            [0.04, 0.00],  # 20% vol, no correlation
            [0.00, 0.01]   # 10% vol
        ])
        
        # Test multiple risk aversion levels
        risk_aversions = [1.0, 2.0, 5.0, 10.0]
        
        for risk_aversion in risk_aversions:
            weights = portfolio_optimizer.mean_variance_optimization(
                expected_returns, cov_matrix, risk_aversion
            )
            
            # Verify valid weights
            assert_valid_portfolio_weights(weights)
            
            # With higher expected return and same/lower risk,
            # first asset should have higher allocation
            assert weights[0] > weights[1], \
                f"Higher return asset should have higher weight: {weights}"
            
            # Higher risk aversion should reduce allocation to riskier asset
            if risk_aversion > 1.0:
                prev_weights = portfolio_optimizer.mean_variance_optimization(
                    expected_returns, cov_matrix, 1.0
                )
                assert weights[0] <= prev_weights[0], \
                    "Higher risk aversion should reduce risky asset allocation"

    @unit
    @financial
    def test_markowitz_efficient_frontier(self, portfolio_optimizer):
        """
        Test efficient frontier calculation.
        
        Financial reasoning: Efficient frontier should be concave,
        with higher returns requiring higher risk (except for corner cases).
        """
        # Three-asset portfolio with different risk-return profiles
        expected_returns = np.array([0.12, 0.08, 0.04])  # High, medium, low return
        cov_matrix = np.array([
            [0.0400, 0.0120, 0.0040],  # High vol (20%), some correlation
            [0.0120, 0.0144, 0.0024],  # Medium vol (12%)
            [0.0040, 0.0024, 0.0036]   # Low vol (6%)
        ])
        
        # Ensure positive definite
        assert_positive_definite_matrix(cov_matrix)
        
        # Generate efficient frontier
        target_returns = np.linspace(0.04, 0.12, 10)
        frontier_data = []
        
        for target_return in target_returns:
            try:
                weights = portfolio_optimizer.efficient_frontier_point(
                    expected_returns, cov_matrix, target_return
                )
                portfolio_return = np.dot(weights, expected_returns)
                portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
                
                frontier_data.append({
                    'return': portfolio_return,
                    'volatility': portfolio_vol,
                    'weights': weights
                })
                
                # Verify constraints
                assert_valid_portfolio_weights(weights)
                assert abs(portfolio_return - target_return) < 1e-4, \
                    f"Target return not achieved: {portfolio_return} vs {target_return}"
                
            except Exception as e:
                # Some target returns may be infeasible
                assert target_return > max(expected_returns) or target_return < min(expected_returns), \
                    f"Feasible target return failed: {target_return}, error: {e}"
        
        # Verify efficient frontier properties
        assert len(frontier_data) >= 5, "Should have at least 5 feasible points"
        
        # Sort by return and check volatility is generally increasing
        frontier_data.sort(key=lambda x: x['return'])
        for i in range(1, len(frontier_data)):
            curr_vol = frontier_data[i]['volatility']
            prev_vol = frontier_data[i-1]['volatility']
            
            # Allow for small numerical errors and corner solutions
            assert curr_vol >= prev_vol - 1e-6, \
                f"Efficient frontier not convex: vol {prev_vol} -> {curr_vol}"

    @unit
    @financial 
    def test_risk_parity_optimization(self, portfolio_optimizer):
        """
        Test risk parity optimization.
        
        Financial reasoning: In risk parity, each asset contributes
        equally to portfolio risk. Risk contribution = weight × marginal risk.
        """
        # Four assets with different volatilities
        cov_matrix = np.array([
            [0.0400, 0.0080, 0.0040, 0.0020],  # 20% vol
            [0.0080, 0.0144, 0.0036, 0.0018],  # 12% vol  
            [0.0040, 0.0036, 0.0064, 0.0012],  # 8% vol
            [0.0020, 0.0018, 0.0012, 0.0016]   # 4% vol
        ])
        
        weights = portfolio_optimizer.risk_parity_optimization(cov_matrix)
        
        # Verify valid weights
        assert_valid_portfolio_weights(weights)
        
        # Calculate risk contributions
        portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
        marginal_risk = np.dot(cov_matrix, weights) / portfolio_vol
        risk_contributions = weights * marginal_risk
        
        # Risk contributions should be approximately equal
        target_contribution = 1.0 / len(weights)
        for contrib in risk_contributions:
            assert abs(contrib - target_contribution) < 0.05, \
                f"Risk contributions not equal: {risk_contributions}"
        
        # Lower volatility assets should have higher weights
        volatilities = np.sqrt(np.diag(cov_matrix))
        for i in range(len(weights)-1):
            if volatilities[i] > volatilities[i+1]:
                assert weights[i] <= weights[i+1] + 0.1, \
                    "Higher vol asset should have lower weight in risk parity"

    @unit
    @financial
    def test_black_litterman_optimization(self, portfolio_optimizer):
        """
        Test Black-Litterman model implementation.
        
        Financial reasoning: BL combines market equilibrium with
        investor views to generate expected returns that reflect
        both market consensus and personal opinions.
        """
        # Market cap weights (equilibrium portfolio)
        market_weights = np.array([0.4, 0.3, 0.2, 0.1])
        
        # Covariance matrix
        cov_matrix = np.array([
            [0.0400, 0.0120, 0.0080, 0.0040],
            [0.0120, 0.0144, 0.0072, 0.0036], 
            [0.0080, 0.0072, 0.0100, 0.0025],
            [0.0040, 0.0036, 0.0025, 0.0064]
        ])
        
        # Risk aversion parameter (typical value 2-5)
        risk_aversion = 3.0
        
        # Investor views: asset 0 will outperform asset 1 by 2%
        P = np.array([[1, -1, 0, 0]])  # View matrix
        Q = np.array([0.02])           # View values
        tau = 0.025                    # Uncertainty in prior (2.5%)
        
        # View uncertainty (higher = less confident)
        omega = np.array([[0.0001]])   # 1% standard error
        
        try:
            bl_returns, bl_cov = portfolio_optimizer.black_litterman(
                market_weights, cov_matrix, P, Q, tau, omega, risk_aversion
            )
            
            # BL returns should reflect the view
            assert bl_returns[0] > bl_returns[1], \
                "BL returns should reflect view that asset 0 > asset 1"
            
            # Optimize with BL inputs
            bl_weights = portfolio_optimizer.mean_variance_optimization(
                bl_returns, bl_cov, risk_aversion
            )
            
            assert_valid_portfolio_weights(bl_weights)
            
            # BL weights should differ from market cap weights due to views
            weight_diff = np.sum(np.abs(bl_weights - market_weights))
            assert weight_diff > 0.01, \
                "BL weights should differ from market weights when views are present"
            
        except NotImplementedError:
            pytest.skip("Black-Litterman not implemented yet")

    @unit
    @financial
    def test_optimization_edge_cases(self, portfolio_optimizer):
        """Test optimization with edge cases."""
        
        # Case 1: Single asset
        single_return = np.array([0.10])
        single_cov = np.array([[0.04]])
        
        weights = portfolio_optimizer.mean_variance_optimization(
            single_return, single_cov, risk_aversion=2.0
        )
        np.testing.assert_array_almost_equal(weights, [1.0], decimal=6)
        
        # Case 2: Identical assets
        identical_returns = np.array([0.08, 0.08, 0.08])
        identical_cov = np.array([
            [0.01, 0.01, 0.01],
            [0.01, 0.01, 0.01], 
            [0.01, 0.01, 0.01]
        ])
        
        weights = portfolio_optimizer.mean_variance_optimization(
            identical_returns, identical_cov, risk_aversion=2.0
        )
        
        # Should be equal weights (or close due to numerical precision)
        expected_weight = 1.0 / 3.0
        for w in weights:
            assert abs(w - expected_weight) < 0.1, \
                f"Identical assets should have similar weights: {weights}"
        
        # Case 3: Zero expected returns
        zero_returns = np.array([0.0, 0.0, 0.0])
        normal_cov = np.array([
            [0.04, 0.01, 0.005],
            [0.01, 0.02, 0.003],
            [0.005, 0.003, 0.01]
        ])
        
        weights = portfolio_optimizer.mean_variance_optimization(
            zero_returns, normal_cov, risk_aversion=2.0
        )
        
        # Should minimize risk (choose minimum variance portfolio)
        assert_valid_portfolio_weights(weights)
        portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(normal_cov, weights)))
        assert_financial_metric_reasonable(portfolio_vol, (0.05, 0.25), "portfolio_volatility")


class TestRiskMetrics:
    """Test risk measurement calculations."""

    @unit
    @financial
    def test_value_at_risk_calculation(self):
        """
        Test VaR calculation methods.
        
        Financial reasoning: VaR should increase with confidence level
        and portfolio volatility. Normal VaR should be consistent
        with historical VaR for normal distributions.
        """
        # Generate normal returns for testing
        np.random.seed(42)
        returns = np.random.normal(0.001, 0.02, 1000)  # 1% daily return, 2% daily vol
        
        analytics = PortfolioAnalytics()
        
        # Test different confidence levels
        confidence_levels = [0.95, 0.99, 0.999]
        var_values = []
        
        for confidence in confidence_levels:
            # Parametric VaR (assumes normal distribution)
            var_normal = analytics.calculate_var(
                returns, confidence_level=confidence, method='parametric'
            )
            
            # Historical VaR
            var_historical = analytics.calculate_var(
                returns, confidence_level=confidence, method='historical'
            )
            
            # Monte Carlo VaR
            var_monte_carlo = analytics.calculate_var(
                returns, confidence_level=confidence, method='monte_carlo'
            )
            
            var_values.append({
                'confidence': confidence,
                'parametric': var_normal,
                'historical': var_historical,
                'monte_carlo': var_monte_carlo
            })
            
            # VaR should be negative (loss)
            assert var_normal < 0, f"VaR should be negative: {var_normal}"
            assert var_historical < 0, f"Historical VaR should be negative: {var_historical}"
            
            # Reasonable range for 2% daily vol
            assert_financial_metric_reasonable(
                abs(var_normal), (0.01, 0.10), f"VaR_{confidence}"
            )
        
        # Higher confidence should give higher VaR (more negative)
        for i in range(1, len(var_values)):
            prev_var = var_values[i-1]['parametric']
            curr_var = var_values[i]['parametric']
            assert curr_var <= prev_var, \
                f"Higher confidence should give higher VaR: {prev_var} vs {curr_var}"

    @unit
    @financial
    def test_conditional_value_at_risk(self):
        """
        Test CVaR (Expected Shortfall) calculation.
        
        Financial reasoning: CVaR should be more negative than VaR
        as it measures expected loss beyond VaR threshold.
        """
        # Skewed returns (fat tails)
        np.random.seed(42)
        normal_returns = np.random.normal(0.001, 0.02, 900)
        tail_returns = np.random.normal(-0.05, 0.01, 100)  # Fat left tail
        returns = np.concatenate([normal_returns, tail_returns])
        np.random.shuffle(returns)
        
        analytics = PortfolioAnalytics()
        
        confidence_level = 0.95
        var_95 = analytics.calculate_var(returns, confidence_level, method='historical')
        cvar_95 = analytics.calculate_cvar(returns, confidence_level)
        
        # CVaR should be more negative than VaR
        assert cvar_95 <= var_95, f"CVaR ({cvar_95}) should be <= VaR ({var_95})"
        
        # Both should be negative
        assert var_95 < 0 and cvar_95 < 0, "Both VaR and CVaR should be negative"
        
        # Test with different confidence levels
        cvar_99 = analytics.calculate_cvar(returns, 0.99)
        assert cvar_99 <= cvar_95, "Higher confidence CVaR should be more negative"

    @unit
    @financial
    def test_sharpe_ratio_calculation(self):
        """
        Test Sharpe ratio calculation.
        
        Financial reasoning: Sharpe ratio = (return - risk_free) / volatility
        Should be scale-invariant and increase with better risk-adjusted returns.
        """
        analytics = PortfolioAnalytics()
        
        # Test cases
        test_cases = [
            {
                'returns': [0.01] * 252,  # Constant 1% daily return
                'risk_free': 0.0025,      # 0.25% daily risk-free rate
                'expected_sharpe': float('inf')  # Zero volatility case
            },
            {
                'returns': np.random.normal(0.001, 0.02, 252),  # Normal returns
                'risk_free': 0.0001,  # 0.01% daily risk-free
                'expected_range': (0, 2)  # Reasonable Sharpe range
            }
        ]
        
        for case_idx, case in enumerate(test_cases):
            returns = np.array(case['returns'])
            risk_free_rate = case['risk_free']
            
            sharpe = analytics.calculate_sharpe_ratio(returns, risk_free_rate)
            
            if 'expected_sharpe' in case:
                if case['expected_sharpe'] == float('inf'):
                    # Zero volatility case
                    assert sharpe > 100 or np.isinf(sharpe), \
                        f"Zero volatility should give very high Sharpe: {sharpe}"
                else:
                    np.testing.assert_almost_equal(sharpe, case['expected_sharpe'], decimal=2)
            
            elif 'expected_range' in case:
                min_sharpe, max_sharpe = case['expected_range']
                assert min_sharpe <= sharpe <= max_sharpe, \
                    f"Sharpe ratio {sharpe} outside expected range {case['expected_range']}"
        
        # Test negative Sharpe ratio
        poor_returns = np.random.normal(-0.001, 0.02, 252)  # Negative mean return
        poor_sharpe = analytics.calculate_sharpe_ratio(poor_returns, 0.0001)
        assert poor_sharpe < 0, f"Negative excess returns should give negative Sharpe: {poor_sharpe}"

    @unit
    @financial
    def test_maximum_drawdown_calculation(self):
        """
        Test maximum drawdown calculation.
        
        Financial reasoning: Maximum drawdown measures worst peak-to-trough
        decline. Should be negative and between -100% and 0%.
        """
        analytics = PortfolioAnalytics()
        
        # Test case 1: Monotonic decline
        declining_prices = [100, 95, 90, 85, 80, 75]
        mdd_decline = analytics.calculate_maximum_drawdown(declining_prices)
        expected_mdd = (75 - 100) / 100  # -25%
        np.testing.assert_almost_equal(mdd_decline, expected_mdd, decimal=4)
        
        # Test case 2: Recovery after drawdown
        recovery_prices = [100, 110, 90, 95, 105, 85, 100]
        mdd_recovery = analytics.calculate_maximum_drawdown(recovery_prices)
        # Max drawdown should be (85-110)/110 = -22.7%
        expected_mdd_recovery = (85 - 110) / 110
        np.testing.assert_almost_equal(mdd_recovery, expected_mdd_recovery, decimal=3)
        
        # Test case 3: No drawdown (always increasing)
        increasing_prices = [100, 105, 110, 115, 120]
        mdd_none = analytics.calculate_maximum_drawdown(increasing_prices)
        assert mdd_none >= -1e-10, f"No drawdown case should be ~0: {mdd_none}"
        
        # Test properties
        assert -1.0 <= mdd_decline <= 0.0, "MDD should be between -100% and 0%"
        assert -1.0 <= mdd_recovery <= 0.0, "MDD should be between -100% and 0%"

    @unit
    @financial
    def test_tracking_error_calculation(self):
        """
        Test tracking error calculation.
        
        Financial reasoning: Tracking error measures volatility of
        excess returns relative to benchmark. Should be positive.
        """
        analytics = PortfolioAnalytics()
        
        # Generate correlated portfolio and benchmark returns
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.0008, 0.015, 252)
        
        # Portfolio with some tracking error
        portfolio_returns = 0.8 * benchmark_returns + np.random.normal(0.0002, 0.005, 252)
        
        tracking_error = analytics.calculate_tracking_error(portfolio_returns, benchmark_returns)
        
        # Should be positive
        assert tracking_error > 0, f"Tracking error should be positive: {tracking_error}"
        
        # Should be reasonable (typically 1-10% annually)
        annual_te = tracking_error * np.sqrt(252)
        assert_financial_metric_reasonable(annual_te, (0.005, 0.15), "annual_tracking_error")
        
        # Perfect tracking should give zero tracking error
        perfect_tracking = analytics.calculate_tracking_error(benchmark_returns, benchmark_returns)
        assert perfect_tracking < 1e-10, f"Perfect tracking should give ~0 TE: {perfect_tracking}"

    @unit
    @financial
    def test_information_ratio_calculation(self):
        """
        Test information ratio calculation.
        
        Financial reasoning: Information ratio = active_return / tracking_error
        Measures risk-adjusted active return relative to benchmark.
        """
        analytics = PortfolioAnalytics()
        
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.0008, 0.015, 252)
        
        # Portfolio with positive alpha
        alpha = 0.0002  # 2bp daily alpha
        portfolio_returns = benchmark_returns + alpha + np.random.normal(0, 0.005, 252)
        
        info_ratio = analytics.calculate_information_ratio(portfolio_returns, benchmark_returns)
        
        # Should be positive given positive alpha
        assert info_ratio > 0, f"Positive alpha should give positive IR: {info_ratio}"
        
        # Reasonable range for information ratio (-2 to 2 is typical)
        assert_financial_metric_reasonable(info_ratio, (-3, 3), "information_ratio")
        
        # Test with negative alpha
        negative_alpha_returns = benchmark_returns - 0.0003 + np.random.normal(0, 0.005, 252)
        negative_ir = analytics.calculate_information_ratio(negative_alpha_returns, benchmark_returns)
        assert negative_ir < 0, f"Negative alpha should give negative IR: {negative_ir}"


class TestNumericalStability:
    """Test numerical stability of financial calculations."""

    @unit
    @financial
    def test_covariance_matrix_conditioning(self, test_data_generator):
        """
        Test handling of ill-conditioned covariance matrices.
        
        Financial reasoning: Real covariance matrices can be nearly singular
        due to high correlations or insufficient data. Optimization should
        handle these cases gracefully.
        """
        portfolio_optimizer = PortfolioOptimizer()
        
        # Create ill-conditioned matrix (high correlations)
        n_assets = 5
        correlations = np.full((n_assets, n_assets), 0.99)  # Very high correlation
        np.fill_diagonal(correlations, 1.0)
        
        volatilities = np.array([0.20, 0.18, 0.22, 0.19, 0.21])
        vol_matrix = np.outer(volatilities, volatilities)
        ill_conditioned_cov = correlations * vol_matrix
        
        # Check condition number
        condition_number = np.linalg.cond(ill_conditioned_cov)
        assert condition_number > 1e6, f"Matrix should be ill-conditioned: {condition_number}"
        
        expected_returns = np.array([0.10, 0.09, 0.11, 0.08, 0.12])
        
        # Optimization should either succeed with regularization or fail gracefully
        try:
            weights = portfolio_optimizer.mean_variance_optimization(
                expected_returns, ill_conditioned_cov, risk_aversion=2.0
            )
            
            # If successful, weights should be valid
            assert_valid_portfolio_weights(weights)
            
            # Portfolio metrics should be reasonable
            portfolio_return = np.dot(weights, expected_returns)
            portfolio_vol = np.sqrt(np.dot(weights.T, np.dot(ill_conditioned_cov, weights)))
            
            assert_financial_metric_reasonable(portfolio_return, (0.05, 0.15), "portfolio_return")
            assert_financial_metric_reasonable(portfolio_vol, (0.10, 0.30), "portfolio_volatility")
            
        except (np.linalg.LinAlgError, ValueError) as e:
            # Acceptable to fail on ill-conditioned matrices
            assert "singular" in str(e).lower() or "condition" in str(e).lower(), \
                f"Should fail due to conditioning, not other reasons: {e}"

    @unit
    @financial  
    def test_extreme_expected_returns(self, test_data_generator):
        """Test optimization with extreme expected return values."""
        portfolio_optimizer = PortfolioOptimizer()
        
        # Normal covariance matrix
        cov_matrix = test_data_generator.generate_covariance_matrix(['A', 'B', 'C'])
        
        # Test cases with extreme returns
        extreme_cases = [
            {
                'returns': np.array([100.0, 0.08, 0.06]),  # Extremely high return
                'description': 'extremely_high_return'
            },
            {
                'returns': np.array([0.08, 0.06, -50.0]),  # Extremely negative return
                'description': 'extremely_negative_return'
            },
            {
                'returns': np.array([1e-10, 1e-10, 1e-10]),  # Extremely small returns
                'description': 'extremely_small_returns'
            }
        ]
        
        for case in extreme_cases:
            expected_returns = case['returns']
            
            try:
                weights = portfolio_optimizer.mean_variance_optimization(
                    expected_returns, cov_matrix, risk_aversion=2.0
                )
                
                # If optimization succeeds, verify results
                assert_valid_portfolio_weights(weights)
                
                # Extreme positive return asset should dominate
                if case['description'] == 'extremely_high_return':
                    assert weights[0] > 0.8, \
                        f"Extreme return asset should dominate: {weights}"
                
                # Extreme negative return asset should be avoided
                elif case['description'] == 'extremely_negative_return':
                    assert weights[2] < 0.1, \
                        f"Extreme negative return asset should be avoided: {weights}"
                
            except (ValueError, OverflowError, np.linalg.LinAlgError):
                # Acceptable to fail with extreme inputs
                pass

    @unit
    @financial
    def test_small_portfolio_optimization(self):
        """Test optimization with very small position sizes."""
        portfolio_optimizer = PortfolioOptimizer()
        
        # Small expected returns (basis points)
        expected_returns = np.array([0.0001, 0.00008, 0.00012])  # 1bp, 0.8bp, 1.2bp
        
        # Small covariance matrix elements
        cov_matrix = np.array([
            [1e-8, 2e-9, 1e-9],
            [2e-9, 1.5e-8, 0.5e-9],
            [1e-9, 0.5e-9, 2e-8]
        ])
        
        weights = portfolio_optimizer.mean_variance_optimization(
            expected_returns, cov_matrix, risk_aversion=2.0
        )
        
        # Should still produce valid weights despite small numbers
        assert_valid_portfolio_weights(weights)
        
        # Highest return asset should have highest weight
        max_return_idx = np.argmax(expected_returns)
        assert weights[max_return_idx] >= max(weights) - 1e-6, \
            "Highest return asset should have highest weight"

    @performance
    @unit
    def test_large_portfolio_optimization_performance(self, performance_timer):
        """Test optimization performance with large portfolios."""
        portfolio_optimizer = PortfolioOptimizer()
        
        # Large portfolio (100 assets)
        n_assets = 100
        expected_returns = np.random.normal(0.08, 0.04, n_assets)
        
        # Generate random covariance matrix
        random_matrix = np.random.randn(n_assets, n_assets)
        cov_matrix = np.dot(random_matrix, random_matrix.T) / n_assets
        
        # Add some structure (factor model)
        market_loadings = np.random.uniform(0.5, 1.5, n_assets)
        market_factor_var = 0.02
        for i in range(n_assets):
            for j in range(n_assets):
                cov_matrix[i, j] += market_loadings[i] * market_loadings[j] * market_factor_var
        
        # Time the optimization
        with performance_timer as timer:
            weights = portfolio_optimizer.mean_variance_optimization(
                expected_returns, cov_matrix, risk_aversion=3.0
            )
        
        # Should complete within reasonable time (< 5 seconds for 100 assets)
        assert timer.elapsed < 5.0, f"Optimization too slow: {timer.elapsed:.2f}s"
        
        # Verify results
        assert_valid_portfolio_weights(weights)
        assert len(weights) == n_assets, f"Wrong number of weights: {len(weights)}"
        
        # Check for reasonable diversification (no single asset > 50%)
        max_weight = np.max(weights)
        assert max_weight < 0.5, f"Portfolio too concentrated: max weight = {max_weight}"