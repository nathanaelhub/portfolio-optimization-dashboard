"""
Unit tests for portfolio performance metrics calculations.

Tests comprehensive performance analysis including:
- Return calculations (simple, log, excess returns)
- Risk-adjusted performance metrics (Sharpe, Sortino, Calmar)
- Attribution analysis (Brinson, factor-based)
- Benchmark comparison metrics
- Time-series performance analysis

Each test includes financial reasoning for expected behavior.
"""

import pytest
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Tuple

from app.services.portfolio_analytics import PortfolioAnalytics
from conftest import (
    assert_financial_metric_reasonable,
    unit, financial, performance
)


class TestReturnCalculations:
    """Test different return calculation methodologies."""

    @unit
    @financial
    def test_simple_returns_calculation(self):
        """
        Test simple return calculation: R_t = (P_t - P_{t-1}) / P_{t-1}
        
        Financial reasoning: Simple returns are intuitive and additive
        across assets but not across time periods.
        """
        analytics = PortfolioAnalytics()
        
        # Test with known values
        prices = [100, 110, 99, 108.9]
        expected_returns = [0.10, -0.10, 0.10]  # 10%, -10%, 10%
        
        simple_returns = analytics.calculate_simple_returns(prices)
        
        np.testing.assert_array_almost_equal(
            simple_returns, expected_returns, decimal=6
        )
        
        # Test properties
        assert len(simple_returns) == len(prices) - 1, \
            "Should have n-1 returns for n prices"
        
        # Test edge case: zero price (should handle gracefully)
        with pytest.raises((ValueError, ZeroDivisionError)):
            analytics.calculate_simple_returns([100, 0, 50])

    @unit
    @financial
    def test_log_returns_calculation(self):
        """
        Test logarithmic return calculation: r_t = ln(P_t / P_{t-1})
        
        Financial reasoning: Log returns are time-additive and
        approximately normal for small returns. Better for
        statistical analysis and portfolio theory.
        """
        analytics = PortfolioAnalytics()
        
        # Test with prices that give nice log returns
        prices = [100, 100 * np.exp(0.1), 100 * np.exp(0.05)]
        expected_log_returns = [0.1, -0.05]  # From exp(0.1) to exp(0.05)
        
        log_returns = analytics.calculate_log_returns(prices)
        
        np.testing.assert_array_almost_equal(
            log_returns, expected_log_returns, decimal=6
        )
        
        # Test time-additivity property
        # log(P_2/P_0) = log(P_2/P_1) + log(P_1/P_0)
        cumulative_log_return = np.sum(log_returns)
        direct_log_return = np.log(prices[-1] / prices[0])
        
        np.testing.assert_almost_equal(
            cumulative_log_return, direct_log_return, decimal=10
        )

    @unit
    @financial
    def test_excess_returns_calculation(self):
        """
        Test excess return calculation against benchmark and risk-free rate.
        
        Financial reasoning: Excess returns measure active performance
        above a benchmark or risk-free rate. Critical for evaluating
        manager skill and risk-adjusted performance.
        """
        analytics = PortfolioAnalytics()
        
        # Portfolio and benchmark returns
        portfolio_returns = np.array([0.02, -0.01, 0.03, 0.01, -0.005])
        benchmark_returns = np.array([0.015, 0.005, 0.025, 0.008, 0.002])
        risk_free_rate = 0.001  # Daily risk-free rate
        
        # Excess returns vs benchmark (active returns)
        active_returns = analytics.calculate_excess_returns(
            portfolio_returns, benchmark_returns
        )
        expected_active = portfolio_returns - benchmark_returns
        
        np.testing.assert_array_almost_equal(active_returns, expected_active, decimal=10)
        
        # Excess returns vs risk-free rate
        risk_adjusted_returns = analytics.calculate_excess_returns(
            portfolio_returns, risk_free_rate
        )
        expected_risk_adjusted = portfolio_returns - risk_free_rate
        
        np.testing.assert_array_almost_equal(
            risk_adjusted_returns, expected_risk_adjusted, decimal=10
        )
        
        # Test statistical properties
        assert np.mean(active_returns) != 0 or np.std(active_returns) > 0, \
            "Active returns should show some difference from benchmark"

    @unit
    @financial
    def test_cumulative_returns_calculation(self):
        """
        Test cumulative return calculation for performance tracking.
        
        Financial reasoning: Cumulative returns show total portfolio
        growth over time. Should compound correctly for reinvested returns.
        """
        analytics = PortfolioAnalytics()
        
        # Simple test case
        simple_returns = [0.10, -0.05, 0.08, -0.02]
        
        # Calculate cumulative returns (compound growth)
        cumulative_returns = analytics.calculate_cumulative_returns(simple_returns)
        
        # Manual calculation: (1+r1)*(1+r2)*...*(1+rn) - 1
        expected_cumulative = []
        cumulative_factor = 1.0
        
        for ret in simple_returns:
            cumulative_factor *= (1 + ret)
            expected_cumulative.append(cumulative_factor - 1)
        
        np.testing.assert_array_almost_equal(
            cumulative_returns, expected_cumulative, decimal=10
        )
        
        # Test final cumulative return
        final_cumulative = cumulative_returns[-1]
        expected_final = np.prod([1 + r for r in simple_returns]) - 1
        
        np.testing.assert_almost_equal(final_cumulative, expected_final, decimal=10)
        
        # Test monotonic property (for positive returns)
        positive_returns = [0.02, 0.01, 0.03, 0.015]
        positive_cumulative = analytics.calculate_cumulative_returns(positive_returns)
        
        for i in range(1, len(positive_cumulative)):
            assert positive_cumulative[i] > positive_cumulative[i-1], \
                "Cumulative returns should be monotonic for positive returns"


class TestRiskAdjustedMetrics:
    """Test risk-adjusted performance metrics."""

    @unit
    @financial
    def test_sortino_ratio_calculation(self):
        """
        Test Sortino ratio calculation.
        
        Financial reasoning: Sortino ratio only penalizes downside volatility,
        making it more appropriate than Sharpe for asymmetric return distributions.
        Should be higher than Sharpe ratio when returns are positively skewed.
        """
        analytics = PortfolioAnalytics()
        
        # Create returns with positive skew (more upside than downside)
        np.random.seed(42)
        base_returns = np.random.normal(0.001, 0.015, 200)
        
        # Add some large positive outliers
        positive_outliers = np.random.exponential(0.02, 20)
        skewed_returns = np.concatenate([base_returns, positive_outliers])
        np.random.shuffle(skewed_returns)
        
        risk_free_rate = 0.0005
        target_return = risk_free_rate  # MAR = risk-free rate
        
        sortino_ratio = analytics.calculate_sortino_ratio(
            skewed_returns, target_return
        )
        
        # Compare with Sharpe ratio
        sharpe_ratio = analytics.calculate_sharpe_ratio(
            skewed_returns, risk_free_rate
        )
        
        # Sortino should be higher for positively skewed returns
        assert sortino_ratio >= sharpe_ratio, \
            f"Sortino ({sortino_ratio:.3f}) should be >= Sharpe ({sharpe_ratio:.3f})"
        
        # Test with symmetric returns - should be similar to Sharpe
        symmetric_returns = np.random.normal(0.001, 0.015, 200)
        sortino_symmetric = analytics.calculate_sortino_ratio(
            symmetric_returns, target_return
        )
        sharpe_symmetric = analytics.calculate_sharpe_ratio(
            symmetric_returns, risk_free_rate
        )
        
        # Should be close for symmetric distributions
        ratio_difference = abs(sortino_symmetric - sharpe_symmetric)
        assert ratio_difference < 0.2, \
            f"Sortino and Sharpe should be close for symmetric returns: {ratio_difference}"

    @unit
    @financial
    def test_calmar_ratio_calculation(self):
        """
        Test Calmar ratio calculation.
        
        Financial reasoning: Calmar ratio = Annual Return / Max Drawdown
        Measures return per unit of worst-case loss. Useful for
        assessing downside risk management.
        """
        analytics = PortfolioAnalytics()
        
        # Create price series with known drawdown
        initial_price = 100
        prices = [initial_price]
        
        # Create a specific pattern: growth, drawdown, recovery
        price_changes = [0.02, 0.01, 0.03, -0.05, -0.03, -0.02, 0.04, 0.03, 0.02]
        
        for change in price_changes:
            prices.append(prices[-1] * (1 + change))
        
        # Calculate returns (252 trading days assumption)
        returns = [(prices[i]/prices[i-1] - 1) for i in range(1, len(prices))]
        
        calmar_ratio = analytics.calculate_calmar_ratio(returns, periods_per_year=252)
        
        # Verify components
        annual_return = (np.prod([1 + r for r in returns]) ** (252/len(returns))) - 1
        max_drawdown = analytics.calculate_maximum_drawdown(prices)
        
        expected_calmar = annual_return / abs(max_drawdown) if max_drawdown != 0 else float('inf')
        
        if not np.isinf(expected_calmar):
            np.testing.assert_almost_equal(calmar_ratio, expected_calmar, decimal=4)
        
        # Calmar should be positive for positive returns and negative MDD
        if annual_return > 0 and max_drawdown < 0:
            assert calmar_ratio > 0, f"Calmar should be positive: {calmar_ratio}"

    @unit
    @financial
    def test_treynor_ratio_calculation(self):
        """
        Test Treynor ratio calculation.
        
        Financial reasoning: Treynor ratio = (Return - Risk_free) / Beta
        Measures excess return per unit of systematic risk.
        Useful for comparing portfolios with different market exposures.
        """
        analytics = PortfolioAnalytics()
        
        # Generate correlated portfolio and market returns
        np.random.seed(42)
        market_returns = np.random.normal(0.0008, 0.02, 252)
        
        # Portfolio with known beta
        true_beta = 1.2
        alpha = 0.0002
        idiosyncratic_risk = np.random.normal(0, 0.01, 252)
        
        portfolio_returns = alpha + true_beta * market_returns + idiosyncratic_risk
        
        risk_free_rate = 0.0001
        
        treynor_ratio = analytics.calculate_treynor_ratio(
            portfolio_returns, market_returns, risk_free_rate
        )
        
        # Calculate beta for verification
        beta = analytics.calculate_beta(portfolio_returns, market_returns)
        
        # Manual Treynor calculation
        excess_return = np.mean(portfolio_returns) - risk_free_rate
        expected_treynor = excess_return / beta
        
        np.testing.assert_almost_equal(treynor_ratio, expected_treynor, decimal=6)
        
        # Beta should be close to true beta
        assert abs(beta - true_beta) < 0.3, f"Estimated beta {beta} far from true {true_beta}"
        
        # Treynor should be reasonable
        annual_treynor = treynor_ratio * 252
        assert_financial_metric_reasonable(annual_treynor, (-0.5, 0.5), "annual_treynor")

    @unit
    @financial
    def test_jensen_alpha_calculation(self):
        """
        Test Jensen's alpha calculation.
        
        Financial reasoning: Jensen's alpha = Portfolio_Return - (Risk_free + Beta * (Market_Return - Risk_free))
        Measures risk-adjusted excess return vs CAPM prediction.
        """
        analytics = PortfolioAnalytics()
        
        # Generate data with known alpha
        np.random.seed(42)
        market_returns = np.random.normal(0.0008, 0.02, 252)
        risk_free_rate = 0.0001
        
        true_alpha = 0.0003  # 3bp daily alpha
        true_beta = 1.1
        
        portfolio_returns = (risk_free_rate + true_alpha + 
                           true_beta * (market_returns - risk_free_rate) +
                           np.random.normal(0, 0.005, 252))
        
        jensen_alpha = analytics.calculate_jensen_alpha(
            portfolio_returns, market_returns, risk_free_rate
        )
        
        # Should be close to true alpha (allow for sampling error)
        assert abs(jensen_alpha - true_alpha) < 0.0002, \
            f"Jensen alpha {jensen_alpha} far from true {true_alpha}"
        
        # Test with zero alpha portfolio
        zero_alpha_returns = (risk_free_rate + 
                             true_beta * (market_returns - risk_free_rate) +
                             np.random.normal(0, 0.005, 252))
        
        zero_jensen_alpha = analytics.calculate_jensen_alpha(
            zero_alpha_returns, market_returns, risk_free_rate
        )
        
        assert abs(zero_jensen_alpha) < 0.0001, \
            f"Zero alpha portfolio should have ~0 Jensen alpha: {zero_jensen_alpha}"


class TestAttributionAnalysis:
    """Test performance attribution analysis."""

    @unit
    @financial
    def test_brinson_attribution(self):
        """
        Test Brinson performance attribution model.
        
        Financial reasoning: Brinson model decomposes active return into:
        - Allocation effect: (w_p - w_b) * r_b
        - Selection effect: w_b * (r_p - r_b)  
        - Interaction effect: (w_p - w_b) * (r_p - r_b)
        """
        analytics = PortfolioAnalytics()
        
        # Define sector allocations and returns
        sectors = ['Technology', 'Healthcare', 'Financial', 'Energy']
        
        # Portfolio weights
        portfolio_weights = np.array([0.40, 0.25, 0.20, 0.15])
        
        # Benchmark weights  
        benchmark_weights = np.array([0.30, 0.30, 0.25, 0.15])
        
        # Sector returns
        portfolio_returns = np.array([0.15, 0.08, 0.06, 0.12])  # Portfolio returns by sector
        benchmark_returns = np.array([0.12, 0.10, 0.08, 0.10])  # Benchmark returns by sector
        
        attribution = analytics.calculate_brinson_attribution(
            portfolio_weights, benchmark_weights,
            portfolio_returns, benchmark_returns
        )
        
        # Manual calculation for verification
        allocation_effect = np.sum((portfolio_weights - benchmark_weights) * benchmark_returns)
        selection_effect = np.sum(benchmark_weights * (portfolio_returns - benchmark_returns))
        interaction_effect = np.sum((portfolio_weights - benchmark_weights) * 
                                  (portfolio_returns - benchmark_returns))
        
        total_active_return = np.sum(portfolio_weights * portfolio_returns) - \
                            np.sum(benchmark_weights * benchmark_returns)
        
        # Verify components
        np.testing.assert_almost_equal(
            attribution['allocation_effect'], allocation_effect, decimal=6
        )
        np.testing.assert_almost_equal(
            attribution['selection_effect'], selection_effect, decimal=6
        )
        np.testing.assert_almost_equal(
            attribution['interaction_effect'], interaction_effect, decimal=6
        )
        
        # Verify total adds up
        calculated_total = (attribution['allocation_effect'] + 
                          attribution['selection_effect'] + 
                          attribution['interaction_effect'])
        
        np.testing.assert_almost_equal(calculated_total, total_active_return, decimal=6)
        
        # Test individual sector attributions
        assert len(attribution['sector_attributions']) == len(sectors)
        
        for i, sector in enumerate(sectors):
            sector_attr = attribution['sector_attributions'][sector]
            
            expected_allocation = (portfolio_weights[i] - benchmark_weights[i]) * benchmark_returns[i]
            expected_selection = benchmark_weights[i] * (portfolio_returns[i] - benchmark_returns[i])
            expected_interaction = ((portfolio_weights[i] - benchmark_weights[i]) * 
                                  (portfolio_returns[i] - benchmark_returns[i]))
            
            np.testing.assert_almost_equal(sector_attr['allocation'], expected_allocation, decimal=6)
            np.testing.assert_almost_equal(sector_attr['selection'], expected_selection, decimal=6)
            np.testing.assert_almost_equal(sector_attr['interaction'], expected_interaction, decimal=6)

    @unit
    @financial
    def test_factor_attribution(self):
        """
        Test factor-based performance attribution.
        
        Financial reasoning: Factor attribution decomposes returns into
        systematic factor exposures and specific return:
        r_p = α + Σ(β_i * f_i) + ε
        """
        analytics = PortfolioAnalytics()
        
        # Define factor returns
        factor_names = ['Market', 'Size', 'Value', 'Momentum']
        factor_returns = np.array([0.008, 0.002, -0.001, 0.003])  # Factor returns for period
        
        # Portfolio factor exposures (betas)
        factor_exposures = np.array([1.2, 0.3, -0.1, 0.4])
        
        # Portfolio return
        portfolio_return = 0.012
        
        attribution = analytics.calculate_factor_attribution(
            portfolio_return, factor_returns, factor_exposures, factor_names
        )
        
        # Calculate expected factor contributions
        factor_contributions = factor_exposures * factor_returns
        total_factor_contribution = np.sum(factor_contributions)
        specific_return = portfolio_return - total_factor_contribution
        
        # Verify calculations
        np.testing.assert_almost_equal(
            attribution['total_factor_return'], total_factor_contribution, decimal=6
        )
        np.testing.assert_almost_equal(
            attribution['specific_return'], specific_return, decimal=6
        )
        
        # Verify individual factor contributions
        for i, factor_name in enumerate(factor_names):
            expected_contribution = factor_exposures[i] * factor_returns[i]
            np.testing.assert_almost_equal(
                attribution['factor_contributions'][factor_name], expected_contribution, decimal=6
            )
        
        # Total should equal portfolio return
        total_explained = attribution['total_factor_return'] + attribution['specific_return']
        np.testing.assert_almost_equal(total_explained, portfolio_return, decimal=6)

    @unit
    @financial
    def test_style_attribution(self):
        """
        Test style-based performance attribution (growth vs value, large vs small).
        
        Financial reasoning: Style attribution analyzes performance
        across standard style dimensions to understand manager bias
        and performance sources.
        """
        analytics = PortfolioAnalytics()
        
        # Define style boxes (3x3 grid: Large/Mid/Small x Growth/Blend/Value)
        style_returns = {
            ('Large', 'Growth'): 0.015,
            ('Large', 'Blend'): 0.012,
            ('Large', 'Value'): 0.008,
            ('Mid', 'Growth'): 0.018,
            ('Mid', 'Blend'): 0.014,
            ('Mid', 'Value'): 0.010,
            ('Small', 'Growth'): 0.022,
            ('Small', 'Blend'): 0.016,
            ('Small', 'Value'): 0.012
        }
        
        # Portfolio allocations across style boxes
        portfolio_allocations = {
            ('Large', 'Growth'): 0.25,
            ('Large', 'Blend'): 0.20,
            ('Large', 'Value'): 0.15,
            ('Mid', 'Growth'): 0.15,
            ('Mid', 'Blend'): 0.10,
            ('Mid', 'Value'): 0.05,
            ('Small', 'Growth'): 0.05,
            ('Small', 'Blend'): 0.03,
            ('Small', 'Value'): 0.02
        }
        
        # Benchmark allocations (more balanced)
        benchmark_allocations = {
            ('Large', 'Growth'): 0.20,
            ('Large', 'Blend'): 0.25,
            ('Large', 'Value'): 0.20,
            ('Mid', 'Growth'): 0.10,
            ('Mid', 'Blend'): 0.12,
            ('Mid', 'Value'): 0.08,
            ('Small', 'Growth'): 0.02,
            ('Small', 'Blend'): 0.02,
            ('Small', 'Value'): 0.01
        }
        
        attribution = analytics.calculate_style_attribution(
            portfolio_allocations, benchmark_allocations, style_returns
        )
        
        # Calculate portfolio and benchmark returns
        portfolio_return = sum(weight * style_returns[style] 
                             for style, weight in portfolio_allocations.items())
        benchmark_return = sum(weight * style_returns[style] 
                             for style, weight in benchmark_allocations.items())
        
        active_return = portfolio_return - benchmark_return
        
        # Verify total attribution
        total_attribution = (attribution['size_effect'] + 
                           attribution['style_effect'] + 
                           attribution['selection_effect'])
        
        np.testing.assert_almost_equal(total_attribution, active_return, decimal=6)
        
        # Portfolio is overweight growth vs benchmark, so style effect should be positive
        # (since growth outperformed in this example)
        growth_overweight = (
            (portfolio_allocations[('Large', 'Growth')] - benchmark_allocations[('Large', 'Growth')]) +
            (portfolio_allocations[('Mid', 'Growth')] - benchmark_allocations[('Mid', 'Growth')]) +
            (portfolio_allocations[('Small', 'Growth')] - benchmark_allocations[('Small', 'Growth')])
        )
        
        if growth_overweight > 0:
            assert attribution['style_effect'] > 0, \
                "Growth overweight should contribute positively when growth outperforms"


class TestBenchmarkComparison:
    """Test benchmark comparison and relative performance metrics."""

    @unit
    @financial
    def test_information_coefficient_calculation(self):
        """
        Test Information Coefficient calculation.
        
        Financial reasoning: IC measures correlation between
        forecasted and actual returns. Higher IC indicates
        better forecasting ability.
        """
        analytics = PortfolioAnalytics()
        
        # Generate forecasted and actual returns
        np.random.seed(42)
        
        # Perfect forecasting case
        actual_returns = np.random.normal(0.01, 0.05, 50)
        perfect_forecasts = actual_returns.copy()
        
        ic_perfect = analytics.calculate_information_coefficient(
            perfect_forecasts, actual_returns
        )
        
        np.testing.assert_almost_equal(ic_perfect, 1.0, decimal=6)
        
        # No skill forecasting (random)
        random_forecasts = np.random.normal(0.01, 0.05, 50)
        ic_random = analytics.calculate_information_coefficient(
            random_forecasts, actual_returns
        )
        
        # Should be close to zero (allowing for sampling variation)
        assert abs(ic_random) < 0.3, f"Random forecasts should have low IC: {ic_random}"
        
        # Opposite forecasting (negative skill)
        opposite_forecasts = -actual_returns
        ic_opposite = analytics.calculate_information_coefficient(
            opposite_forecasts, actual_returns
        )
        
        np.testing.assert_almost_equal(ic_opposite, -1.0, decimal=6)
        
        # Test with some skill
        skilled_forecasts = 0.7 * actual_returns + 0.3 * np.random.normal(0.01, 0.05, 50)
        ic_skilled = analytics.calculate_information_coefficient(
            skilled_forecasts, actual_returns
        )
        
        assert 0.4 < ic_skilled < 0.8, f"Skilled forecasts should have moderate IC: {ic_skilled}"

    @unit
    @financial
    def test_capture_ratios_calculation(self):
        """
        Test upside and downside capture ratios.
        
        Financial reasoning: Capture ratios measure how much of
        benchmark's up/down movements the portfolio captures.
        Good managers should have high upside capture and
        low downside capture.
        """
        analytics = PortfolioAnalytics()
        
        # Generate correlated returns with asymmetric behavior
        np.random.seed(42)
        benchmark_returns = np.random.normal(0.001, 0.02, 252)
        
        # Portfolio with defensive characteristics
        # - Captures 90% of upside, 70% of downside
        portfolio_returns = []
        for bench_ret in benchmark_returns:
            if bench_ret > 0:  # Up market
                port_ret = 0.9 * bench_ret + np.random.normal(0, 0.005)
            else:  # Down market
                port_ret = 0.7 * bench_ret + np.random.normal(0, 0.005)
            portfolio_returns.append(port_ret)
        
        portfolio_returns = np.array(portfolio_returns)
        
        upside_capture, downside_capture = analytics.calculate_capture_ratios(
            portfolio_returns, benchmark_returns
        )
        
        # Should be close to designed values (allow for noise)
        assert 0.8 < upside_capture < 1.0, f"Upside capture should be ~0.9: {upside_capture}"
        assert 0.6 < downside_capture < 0.8, f"Downside capture should be ~0.7: {downside_capture}"
        
        # Test with perfect correlation (should be 1.0, 1.0)
        perfect_portfolio = benchmark_returns.copy()
        perfect_up, perfect_down = analytics.calculate_capture_ratios(
            perfect_portfolio, benchmark_returns
        )
        
        np.testing.assert_almost_equal(perfect_up, 1.0, decimal=2)
        np.testing.assert_almost_equal(perfect_down, 1.0, decimal=2)

    @unit
    @financial
    def test_batting_average_calculation(self):
        """
        Test batting average calculation.
        
        Financial reasoning: Batting average = % of periods where
        portfolio outperformed benchmark. Measures consistency
        of outperformance regardless of magnitude.
        """
        analytics = PortfolioAnalytics()
        
        # Create returns where portfolio wins 70% of the time
        n_periods = 100
        np.random.seed(42)
        
        benchmark_returns = np.random.normal(0.001, 0.02, n_periods)
        portfolio_returns = []
        
        for i, bench_ret in enumerate(benchmark_returns):
            if i < 70:  # Win 70% of periods
                port_ret = bench_ret + abs(np.random.normal(0.001, 0.005))
            else:  # Lose 30% of periods
                port_ret = bench_ret - abs(np.random.normal(0.001, 0.005))
            portfolio_returns.append(port_ret)
        
        portfolio_returns = np.array(portfolio_returns)
        
        batting_average = analytics.calculate_batting_average(
            portfolio_returns, benchmark_returns
        )
        
        # Should be close to 70%
        assert 0.65 < batting_average < 0.75, f"Batting average should be ~0.7: {batting_average}"
        
        # Test edge cases
        # Perfect outperformance
        always_win_returns = benchmark_returns + 0.001
        perfect_ba = analytics.calculate_batting_average(always_win_returns, benchmark_returns)
        assert perfect_ba == 1.0, "Perfect outperformance should give 100% batting average"
        
        # Never outperform
        always_lose_returns = benchmark_returns - 0.001
        zero_ba = analytics.calculate_batting_average(always_lose_returns, benchmark_returns)
        assert zero_ba == 0.0, "Never outperforming should give 0% batting average"

    @unit
    @financial
    def test_up_down_market_performance(self):
        """
        Test performance analysis in up vs down markets.
        
        Financial reasoning: Analyzing performance in different
        market conditions reveals manager skill and strategy
        characteristics. Some strategies work better in up/down markets.
        """
        analytics = PortfolioAnalytics()
        
        # Create clear up and down market periods
        up_market_bench = np.array([0.02, 0.015, 0.025, 0.01, 0.03])  # All positive
        down_market_bench = np.array([-0.02, -0.015, -0.025, -0.01, -0.03])  # All negative
        
        # Portfolio with good up-market, poor down-market performance
        up_market_port = np.array([0.025, 0.018, 0.030, 0.012, 0.035])  # Outperforms
        down_market_port = np.array([-0.025, -0.020, -0.030, -0.015, -0.035])  # Underperforms
        
        benchmark_returns = np.concatenate([up_market_bench, down_market_bench])
        portfolio_returns = np.concatenate([up_market_port, down_market_port])
        
        market_analysis = analytics.analyze_up_down_market_performance(
            portfolio_returns, benchmark_returns
        )
        
        # Up market analysis
        up_market_stats = market_analysis['up_market']
        assert up_market_stats['portfolio_avg'] > up_market_stats['benchmark_avg'], \
            "Portfolio should outperform in up markets"
        assert up_market_stats['outperformance'] > 0, \
            "Should have positive outperformance in up markets"
        
        # Down market analysis  
        down_market_stats = market_analysis['down_market']
        assert down_market_stats['portfolio_avg'] < down_market_stats['benchmark_avg'], \
            "Portfolio should underperform in down markets"
        assert down_market_stats['outperformance'] < 0, \
            "Should have negative outperformance in down markets"
        
        # Overall statistics
        assert market_analysis['up_market_periods'] == 5, "Should identify 5 up market periods"
        assert market_analysis['down_market_periods'] == 5, "Should identify 5 down market periods"