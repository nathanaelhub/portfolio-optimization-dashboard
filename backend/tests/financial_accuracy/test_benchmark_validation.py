"""
Financial accuracy validation tests against known benchmarks.

These tests validate the financial accuracy of portfolio optimization
algorithms by comparing results against established benchmarks,
academic references, and known financial formulas.

Each test includes detailed financial reasoning and expected ranges
based on financial theory and empirical evidence.
"""

import pytest
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from datetime import datetime, timedelta

from app.services.optimization import PortfolioOptimizer
from app.services.portfolio_analytics import PortfolioAnalytics
from conftest import financial, assert_financial_metric_reasonable


class TestFinancialAccuracyValidation:
    """Validate financial calculations against known benchmarks."""

    @financial
    def test_markowitz_efficiency_validation(self, portfolio_optimizer):
        """
        Test Markowitz mean-variance efficiency against academic benchmarks.
        
        Financial reasoning: Uses data from Markowitz (1952) paper where
        possible, and validates against expected theoretical relationships.
        
        Reference: Markowitz, H. (1952). "Portfolio Selection", Journal of Finance
        """
        # Historical data approximating Markowitz's original study
        # (Adjusted for modern context but maintaining relationships)
        assets = ['Stock_A', 'Stock_B', 'Stock_C', 'Bond']
        
        # Expected returns (annual) - realistic ranges
        expected_returns = np.array([0.12, 0.10, 0.08, 0.04])
        
        # Covariance matrix with realistic correlations
        # High stock-stock correlation, low stock-bond correlation
        cov_matrix = np.array([
            [0.0400, 0.0240, 0.0160, 0.0040],  # Stock A: 20% vol
            [0.0240, 0.0324, 0.0162, 0.0036],  # Stock B: 18% vol  
            [0.0160, 0.0162, 0.0256, 0.0032],  # Stock C: 16% vol
            [0.0040, 0.0036, 0.0032, 0.0016]   # Bond: 4% vol
        ])
        
        # Test 1: Minimum variance portfolio
        min_var_weights = portfolio_optimizer.minimize_variance(cov_matrix)
        min_var_vol = np.sqrt(np.dot(min_var_weights.T, np.dot(cov_matrix, min_var_weights)))
        
        # Bond should dominate minimum variance portfolio
        bond_weight = min_var_weights[3]  # Bond is index 3
        assert bond_weight > 0.7, f"Bond weight should dominate min var: {bond_weight}"
        
        # Minimum variance should be close to bond volatility
        bond_vol = np.sqrt(cov_matrix[3, 3])
        assert abs(min_var_vol - bond_vol) < 0.02, \
            f"Min var vol {min_var_vol:.3f} should be close to bond vol {bond_vol:.3f}"
        
        # Test 2: Maximum Sharpe ratio (tangency portfolio)
        risk_free_rate = 0.02
        max_sharpe_weights = portfolio_optimizer.maximize_sharpe_ratio(
            expected_returns, cov_matrix, risk_free_rate
        )
        
        portfolio_return = np.dot(max_sharpe_weights, expected_returns)
        portfolio_vol = np.sqrt(np.dot(max_sharpe_weights.T, np.dot(cov_matrix, max_sharpe_weights)))
        sharpe_ratio = (portfolio_return - risk_free_rate) / portfolio_vol
        
        # Sharpe ratio should be reasonable (0.5 to 2.0 is typical)
        assert_financial_metric_reasonable(sharpe_ratio, (0.5, 2.0), "sharpe_ratio")
        
        # Higher return assets should have higher weights in max Sharpe portfolio
        assert max_sharpe_weights[0] > max_sharpe_weights[3], \
            "High return stock should outweigh bond in max Sharpe portfolio"
        
        # Test 3: Efficient frontier monotonicity
        target_returns = np.linspace(0.04, 0.12, 10)  # Bond return to max stock return
        frontier_points = []
        
        for target_return in target_returns:
            try:
                weights = portfolio_optimizer.efficient_frontier_point(
                    expected_returns, cov_matrix, target_return
                )
                vol = np.sqrt(np.dot(weights.T, np.dot(cov_matrix, weights)))
                frontier_points.append((target_return, vol))
            except:
                continue  # Some target returns may be infeasible
        
        # Frontier should be convex (increasing volatility with return)
        frontier_points.sort(key=lambda x: x[0])  # Sort by return
        
        for i in range(1, len(frontier_points)):
            assert frontier_points[i][1] >= frontier_points[i-1][1], \
                f"Efficient frontier not convex at point {i}: " \
                f"vol {frontier_points[i-1][1]:.3f} -> {frontier_points[i][1]:.3f}"

    @financial
    def test_capm_beta_validation(self):
        """
        Test CAPM beta calculation against known relationships.
        
        Financial reasoning: Beta should satisfy theoretical properties
        from CAPM model. Market portfolio has beta = 1.0, risk-free asset
        has beta = 0.0, and beta should correlate with systematic risk.
        
        Reference: Sharpe, W.F. (1964). "Capital Asset Prices", Journal of Finance
        """
        analytics = PortfolioAnalytics()
        
        # Generate market and asset returns with known relationships
        np.random.seed(42)  # For reproducibility
        
        # Market returns (e.g., S&P 500)
        market_returns = np.random.normal(0.001, 0.02, 252)  # Daily returns
        
        # Test Asset 1: High beta stock (beta ≈ 1.5)
        true_beta_1 = 1.5
        alpha_1 = 0.0002
        idiosyncratic_1 = np.random.normal(0, 0.01, 252)
        asset_1_returns = alpha_1 + true_beta_1 * market_returns + idiosyncratic_1
        
        # Test Asset 2: Low beta stock (beta ≈ 0.6)
        true_beta_2 = 0.6
        alpha_2 = 0.0001
        idiosyncratic_2 = np.random.normal(0, 0.008, 252)
        asset_2_returns = alpha_2 + true_beta_2 * market_returns + idiosyncratic_2
        
        # Test Asset 3: Market index fund (beta ≈ 1.0)
        market_fund_returns = market_returns + np.random.normal(0, 0.001, 252)  # Small tracking error
        
        # Calculate betas
        beta_1 = analytics.calculate_beta(asset_1_returns, market_returns)
        beta_2 = analytics.calculate_beta(asset_2_returns, market_returns)
        beta_market = analytics.calculate_beta(market_fund_returns, market_returns)
        
        # Test 1: Betas should be close to true values
        assert abs(beta_1 - true_beta_1) < 0.2, \
            f"High beta stock: estimated {beta_1:.3f} vs true {true_beta_1}"
        
        assert abs(beta_2 - true_beta_2) < 0.2, \
            f"Low beta stock: estimated {beta_2:.3f} vs true {true_beta_2}"
        
        assert abs(beta_market - 1.0) < 0.1, \
            f"Market fund beta should be ~1.0: {beta_market:.3f}"
        
        # Test 2: High beta stock should have higher systematic risk
        systematic_risk_1 = beta_1 * np.std(market_returns)
        systematic_risk_2 = beta_2 * np.std(market_returns)
        
        assert systematic_risk_1 > systematic_risk_2, \
            "Higher beta stock should have higher systematic risk"
        
        # Test 3: R-squared should be reasonable for systematic risk explanation
        corr_1 = np.corrcoef(asset_1_returns, market_returns)[0, 1]
        r_squared_1 = corr_1 ** 2
        
        # High beta stock should have decent market correlation
        assert r_squared_1 > 0.3, f"R-squared too low for high beta stock: {r_squared_1:.3f}"
        
        # Test 4: Portfolio beta should be weighted average
        portfolio_weights = np.array([0.4, 0.3, 0.3])
        portfolio_returns = (0.4 * asset_1_returns + 
                           0.3 * asset_2_returns + 
                           0.3 * market_fund_returns)
        
        portfolio_beta = analytics.calculate_beta(portfolio_returns, market_returns)
        expected_portfolio_beta = (0.4 * beta_1 + 0.3 * beta_2 + 0.3 * beta_market)
        
        assert abs(portfolio_beta - expected_portfolio_beta) < 0.1, \
            f"Portfolio beta {portfolio_beta:.3f} should equal weighted average {expected_portfolio_beta:.3f}"

    @financial
    def test_black_scholes_option_pricing_validation(self):
        """
        Test option pricing calculations against Black-Scholes benchmarks.
        
        Financial reasoning: Black-Scholes formula has known analytical solutions
        for European options. We can validate our implementation against
        textbook examples and known option values.
        
        Reference: Black, F. & Scholes, M. (1973). "The Pricing of Options and 
        Corporate Liabilities", Journal of Political Economy
        """
        pytest.skip("Black-Scholes implementation not yet available")
        
        # This test would validate option pricing calculations
        # against known Black-Scholes values once options functionality
        # is implemented in the portfolio optimization system

    @financial
    def test_var_backtesting_validation(self):
        """
        Test Value-at-Risk calculations against historical backtesting.
        
        Financial reasoning: VaR models should satisfy backtesting requirements.
        For 95% VaR, we expect violations approximately 5% of the time.
        This is known as Kupiec's test for VaR validation.
        
        Reference: Kupiec, P. (1995). "Techniques for Verifying the Accuracy of Risk Models"
        """
        analytics = PortfolioAnalytics()
        
        # Generate realistic return series with known tail behavior
        np.random.seed(42)
        
        # Mix of normal and fat-tail returns (Student's t-distribution)
        normal_returns = np.random.normal(0.001, 0.015, 800)
        fat_tail_returns = np.random.standard_t(df=5, size=200) * 0.02 + 0.001
        all_returns = np.concatenate([normal_returns, fat_tail_returns])
        np.random.shuffle(all_returns)
        
        # Calculate VaR for different confidence levels
        confidence_levels = [0.95, 0.99]
        
        for confidence in confidence_levels:
            # Calculate VaR using different methods
            var_parametric = analytics.calculate_var(
                all_returns, confidence_level=confidence, method='parametric'
            )
            var_historical = analytics.calculate_var(
                all_returns, confidence_level=confidence, method='historical'
            )
            
            # Backtest VaR (count violations)
            violations_parametric = np.sum(all_returns < var_parametric)
            violations_historical = np.sum(all_returns < var_historical)
            
            expected_violations = len(all_returns) * (1 - confidence)
            violation_rate_parametric = violations_parametric / len(all_returns)
            violation_rate_historical = violations_historical / len(all_returns)
            
            # Test 1: Violation rates should be close to expected
            # Allow for sampling variation (±2% for 1000 observations)
            tolerance = 0.02
            
            assert abs(violation_rate_parametric - (1 - confidence)) < tolerance, \
                f"Parametric VaR {confidence:.0%}: {violation_rate_parametric:.2%} violations, " \
                f"expected {1-confidence:.2%}"
            
            assert abs(violation_rate_historical - (1 - confidence)) < tolerance, \
                f"Historical VaR {confidence:.0%}: {violation_rate_historical:.2%} violations, " \
                f"expected {1-confidence:.2%}"
            
            # Test 2: VaR should be negative (representing losses)
            assert var_parametric < 0, f"VaR should be negative: {var_parametric}"
            assert var_historical < 0, f"VaR should be negative: {var_historical}"
            
            # Test 3: Higher confidence should give more negative VaR
            if confidence == 0.99:
                var_95 = analytics.calculate_var(all_returns, 0.95, 'parametric')
                assert var_parametric <= var_95, \
                    f"99% VaR {var_parametric:.4f} should be <= 95% VaR {var_95:.4f}"
        
        # Test 4: Kupiec's likelihood ratio test
        # For 95% VaR, test if violation rate is statistically different from 5%
        confidence = 0.95
        var_95 = analytics.calculate_var(all_returns, confidence, 'historical')
        violations = np.sum(all_returns < var_95)
        
        n = len(all_returns)
        p = 1 - confidence  # Expected violation rate (5%)
        
        # Likelihood ratio test statistic
        if violations > 0 and violations < n:
            lr_stat = -2 * (violations * np.log(p) + (n - violations) * np.log(1 - p) -
                           violations * np.log(violations / n) - 
                           (n - violations) * np.log((n - violations) / n))
            
            # Critical value for 95% confidence (chi-squared with 1 df)
            critical_value = 3.84
            
            # Test should not reject null hypothesis that VaR is accurate
            assert lr_stat < critical_value, \
                f"VaR model rejected by Kupiec test: LR={lr_stat:.2f} > {critical_value}"

    @financial
    def test_fama_french_factor_model_validation(self):
        """
        Test factor model implementations against Fama-French benchmarks.
        
        Financial reasoning: Fama-French factors (Market, Size, Value) should
        explain significant portions of stock return variation. The model
        should produce sensible factor loadings and R-squared values.
        
        Reference: Fama, E.F. & French, K.R. (1993). "Common Risk Factors in the 
        Returns on Stocks and Bonds", Journal of Financial Economics
        """
        analytics = PortfolioAnalytics()
        
        # Simulate factor returns based on historical relationships
        np.random.seed(42)
        n_periods = 252
        
        # Factor returns (daily)
        market_factor = np.random.normal(0.0008, 0.012, n_periods)  # Market premium
        size_factor = np.random.normal(0.0002, 0.008, n_periods)    # Small minus Big (SMB)
        value_factor = np.random.normal(0.0001, 0.006, n_periods)   # High minus Low (HML)
        
        # Create stocks with known factor exposures
        stocks = {
            'Large_Growth': {  # Low size loading, low value loading
                'market_beta': 1.1,
                'size_beta': -0.3,
                'value_beta': -0.5,
                'alpha': 0.0001
            },
            'Small_Value': {   # High size loading, high value loading
                'market_beta': 1.3,
                'size_beta': 0.8,
                'value_beta': 0.6,
                'alpha': 0.0002
            },
            'Large_Blend': {   # Market-like exposures
                'market_beta': 1.0,
                'size_beta': 0.0,
                'value_beta': 0.0,
                'alpha': 0.0000
            }
        }
        
        factor_returns_matrix = np.column_stack([market_factor, size_factor, value_factor])
        
        for stock_name, true_exposures in stocks.items():
            # Generate stock returns using factor model
            true_betas = np.array([
                true_exposures['market_beta'],
                true_exposures['size_beta'], 
                true_exposures['value_beta']
            ])
            
            stock_returns = (true_exposures['alpha'] + 
                           np.dot(factor_returns_matrix, true_betas) +
                           np.random.normal(0, 0.005, n_periods))  # Idiosyncratic risk
            
            # Estimate factor loadings using regression
            estimated_betas, alpha, r_squared = analytics.estimate_factor_loadings(
                stock_returns, factor_returns_matrix
            )
            
            # Test 1: Estimated betas should be close to true values
            for i, (est_beta, true_beta) in enumerate(zip(estimated_betas, true_betas)):
                factor_names = ['Market', 'Size', 'Value']
                assert abs(est_beta - true_beta) < 0.2, \
                    f"{stock_name} {factor_names[i]} beta: estimated {est_beta:.3f} vs true {true_beta:.3f}"
            
            # Test 2: Alpha should be close to true alpha
            assert abs(alpha - true_exposures['alpha']) < 0.0005, \
                f"{stock_name} alpha: estimated {alpha:.5f} vs true {true_exposures['alpha']:.5f}"
            
            # Test 3: R-squared should be reasonable (factors should explain returns)
            assert r_squared > 0.6, \
                f"{stock_name} R-squared too low: {r_squared:.3f}"
            
            # Test 4: Factor loadings should make economic sense
            if stock_name == 'Large_Growth':
                assert estimated_betas[1] < 0, "Large stocks should have negative size loading"
                assert estimated_betas[2] < 0, "Growth stocks should have negative value loading"
            
            elif stock_name == 'Small_Value':
                assert estimated_betas[1] > 0, "Small stocks should have positive size loading"
                assert estimated_betas[2] > 0, "Value stocks should have positive value loading"
        
        # Test 5: Portfolio factor loadings should be weighted averages
        portfolio_weights = np.array([0.3, 0.4, 0.3])  # Equal weight the three stocks
        
        # Create portfolio returns
        stock_returns_matrix = []
        for stock_name in stocks.keys():
            true_exposures = stocks[stock_name]
            true_betas = np.array([
                true_exposures['market_beta'],
                true_exposures['size_beta'],
                true_exposures['value_beta']
            ])
            
            returns = (true_exposures['alpha'] + 
                      np.dot(factor_returns_matrix, true_betas) +
                      np.random.normal(0, 0.005, n_periods))
            stock_returns_matrix.append(returns)
        
        stock_returns_matrix = np.column_stack(stock_returns_matrix)
        portfolio_returns = np.dot(stock_returns_matrix, portfolio_weights)
        
        # Estimate portfolio factor loadings
        portfolio_betas, portfolio_alpha, portfolio_r2 = analytics.estimate_factor_loadings(
            portfolio_returns, factor_returns_matrix
        )
        
        # Calculate expected portfolio betas as weighted averages
        expected_portfolio_betas = np.zeros(3)
        for i, stock_name in enumerate(stocks.keys()):
            stock_betas = np.array([
                stocks[stock_name]['market_beta'],
                stocks[stock_name]['size_beta'],
                stocks[stock_name]['value_beta']
            ])
            expected_portfolio_betas += portfolio_weights[i] * stock_betas
        
        # Portfolio betas should match weighted averages
        for i, (est_beta, exp_beta) in enumerate(zip(portfolio_betas, expected_portfolio_betas)):
            factor_names = ['Market', 'Size', 'Value']
            assert abs(est_beta - exp_beta) < 0.1, \
                f"Portfolio {factor_names[i]} beta: estimated {est_beta:.3f} vs expected {exp_beta:.3f}"

    @financial
    def test_bond_duration_convexity_validation(self):
        """
        Test bond duration and convexity calculations against analytical formulas.
        
        Financial reasoning: Duration and convexity have closed-form solutions
        for bonds. Modified duration approximates price sensitivity to yield
        changes, while convexity captures the curvature of the price-yield relationship.
        
        Reference: Fabozzi, F.J. (2012). "Bond Markets, Analysis, and Strategies"
        """
        pytest.skip("Bond analytics not yet implemented")
        
        # This test would validate bond duration and convexity calculations
        # once fixed income functionality is added to the system
        
        # Example test structure:
        # - Test zero-coupon bond duration = time to maturity
        # - Test perpetual bond duration = (1 + yield) / yield  
        # - Test duration-convexity price approximation accuracy
        # - Validate against Bloomberg/Reuters bond analytics

    @financial 
    def test_correlation_stability_validation(self):
        """
        Test correlation estimation stability and accuracy.
        
        Financial reasoning: Correlation estimates should be stable over time
        and consistent with theoretical expectations. We test against known
        correlation structures and validate estimation accuracy.
        """
        analytics = PortfolioAnalytics()
        
        # Create assets with known correlation structure
        np.random.seed(42)
        n_assets = 4
        n_periods = 500
        
        # True correlation matrix (realistic financial correlations)
        true_corr = np.array([
            [1.00, 0.65, 0.45, 0.20],  # Asset 0: Tech stock
            [0.65, 1.00, 0.40, 0.15],  # Asset 1: Another tech stock
            [0.45, 0.40, 1.00, 0.25],  # Asset 2: Financial stock
            [0.20, 0.15, 0.25, 1.00]   # Asset 3: Bond
        ])
        
        # Generate correlated returns using Cholesky decomposition
        L = np.linalg.cholesky(true_corr)
        independent_returns = np.random.normal(0, 1, (n_periods, n_assets))
        correlated_returns = np.dot(independent_returns, L.T)
        
        # Add different volatilities to make realistic
        volatilities = np.array([0.25, 0.22, 0.20, 0.05])  # Stocks vs bond
        for i in range(n_assets):
            correlated_returns[:, i] *= volatilities[i]
            correlated_returns[:, i] += np.random.normal(0.0008, 0.002, n_periods)  # Add drift
        
        # Estimate correlation matrix
        estimated_corr = analytics.calculate_correlation_matrix(correlated_returns)
        
        # Test 1: Estimated correlations should be close to true values
        for i in range(n_assets):
            for j in range(n_assets):
                if i != j:  # Skip diagonal elements
                    error = abs(estimated_corr[i, j] - true_corr[i, j])
                    assert error < 0.15, \
                        f"Correlation({i},{j}): estimated {estimated_corr[i,j]:.3f} vs true {true_corr[i,j]:.3f}"
        
        # Test 2: Correlation matrix should be positive definite
        eigenvals = np.linalg.eigvals(estimated_corr)
        assert np.all(eigenvals > -1e-8), f"Correlation matrix not positive definite: {eigenvals}"
        
        # Test 3: Diagonal elements should be 1.0
        np.testing.assert_allclose(np.diag(estimated_corr), 1.0, atol=1e-10)
        
        # Test 4: Matrix should be symmetric
        np.testing.assert_allclose(estimated_corr, estimated_corr.T, atol=1e-10)
        
        # Test 5: Rolling correlation stability
        window_size = 60  # 60-day rolling window
        rolling_corrs = []
        
        for start in range(0, n_periods - window_size, 20):  # Every 20 days
            window_data = correlated_returns[start:start + window_size]
            window_corr = analytics.calculate_correlation_matrix(window_data)
            rolling_corrs.append(window_corr[0, 1])  # Track correlation between assets 0 and 1
        
        rolling_corrs = np.array(rolling_corrs)
        correlation_volatility = np.std(rolling_corrs)
        
        # Correlation should be relatively stable (not too volatile)
        assert correlation_volatility < 0.3, \
            f"Correlation too volatile: std = {correlation_volatility:.3f}"
        
        # Mean rolling correlation should be close to true value
        mean_rolling_corr = np.mean(rolling_corrs)
        true_corr_01 = true_corr[0, 1]
        assert abs(mean_rolling_corr - true_corr_01) < 0.1, \
            f"Mean rolling correlation {mean_rolling_corr:.3f} vs true {true_corr_01:.3f}"

    @financial
    def test_sharpe_ratio_benchmark_validation(self):
        """
        Test Sharpe ratio calculations against historical benchmarks.
        
        Financial reasoning: Validate Sharpe ratios against known ranges
        for different asset classes and market conditions. Historical
        equity Sharpe ratios typically range from 0.2 to 1.5.
        """
        analytics = PortfolioAnalytics()
        
        # Test different portfolio types with expected Sharpe ratio ranges
        test_cases = [
            {
                'name': 'Conservative Bond Portfolio',
                'expected_return': 0.04,
                'volatility': 0.06,
                'risk_free': 0.02,
                'expected_sharpe_range': (0.2, 0.5)
            },
            {
                'name': 'Balanced Portfolio',
                'expected_return': 0.08,
                'volatility': 0.12,
                'risk_free': 0.02,
                'expected_sharpe_range': (0.4, 0.8)
            },
            {
                'name': 'Aggressive Growth Portfolio',
                'expected_return': 0.12,
                'volatility': 0.18,
                'risk_free': 0.02,
                'expected_sharpe_range': (0.5, 1.2)
            },
            {
                'name': 'Market Index',
                'expected_return': 0.10,
                'volatility': 0.16,
                'risk_free': 0.02,
                'expected_sharpe_range': (0.4, 1.0)
            }
        ]
        
        for case in test_cases:
            # Generate returns based on expected parameters
            np.random.seed(42)
            returns = np.random.normal(
                case['expected_return'] / 252,  # Daily return
                case['volatility'] / np.sqrt(252),  # Daily volatility
                252
            )
            
            sharpe_ratio = analytics.calculate_sharpe_ratio(
                returns, case['risk_free'] / 252
            )
            
            # Annualize for comparison
            annual_sharpe = sharpe_ratio * np.sqrt(252)
            
            # Test against expected range
            min_expected, max_expected = case['expected_sharpe_range']
            assert min_expected <= annual_sharpe <= max_expected, \
                f"{case['name']}: Sharpe ratio {annual_sharpe:.3f} outside expected range " \
                f"[{min_expected}, {max_expected}]"
        
        # Test edge cases
        # Zero volatility case (should give infinite Sharpe ratio)
        constant_returns = np.full(252, 0.005)  # Constant 0.5% daily return
        infinite_sharpe = analytics.calculate_sharpe_ratio(constant_returns, 0.001)
        assert infinite_sharpe > 100 or np.isinf(infinite_sharpe), \
            "Zero volatility should give very high Sharpe ratio"
        
        # Negative excess return case
        poor_returns = np.random.normal(-0.001, 0.02, 252)  # Negative mean return
        negative_sharpe = analytics.calculate_sharpe_ratio(poor_returns, 0.0005)
        assert negative_sharpe < 0, "Negative excess returns should give negative Sharpe ratio"