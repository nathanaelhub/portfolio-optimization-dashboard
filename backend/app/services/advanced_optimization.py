"""
Advanced Portfolio Optimization Module

This module implements sophisticated portfolio optimization techniques used by
quantitative finance professionals. It includes Markowitz optimization,
Black-Litterman models, and risk parity approaches with comprehensive risk metrics.

Author: Portfolio Optimization System
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union
from scipy.optimize import minimize, OptimizeResult
from scipy.stats import norm
from scipy.cluster.hierarchy import linkage, fcluster
from scipy.spatial.distance import squareform
import warnings
from datetime import datetime, timedelta


class AdvancedPortfolioOptimizer:
    """
    A comprehensive portfolio optimization system implementing multiple
    quantitative strategies used by institutional investors.
    
    This class provides:
    - Mean-Variance Optimization (Markowitz)
    - Black-Litterman Model for incorporating market views
    - Risk Parity and Hierarchical Risk Parity
    - Comprehensive risk metrics and stress testing
    """
    
    def __init__(self, returns: pd.DataFrame, risk_free_rate: float = 0.02):
        """
        Initialize the portfolio optimizer with historical return data.
        
        Args:
            returns: DataFrame of asset returns (assets as columns)
            risk_free_rate: Annual risk-free rate (default 2%)
        """
        self.returns = returns
        self.assets = returns.columns.tolist()
        self.n_assets = len(self.assets)
        self.risk_free_rate = risk_free_rate / 252  # Convert to daily
        
        # Precompute statistics
        self._calculate_statistics()
        
    def _calculate_statistics(self):
        """Calculate and cache basic statistics from return data."""
        # Expected returns (annualized)
        self.expected_returns = self.returns.mean() * 252
        
        # Covariance matrix with Ledoit-Wolf shrinkage for stability
        self.cov_matrix = self._shrinkage_covariance(self.returns)
        
        # Correlation matrix for risk parity
        self.corr_matrix = self.returns.corr()
        
    def _shrinkage_covariance(self, returns: pd.DataFrame, 
                             shrinkage_factor: Optional[float] = None) -> pd.DataFrame:
        """
        Calculate covariance matrix with Ledoit-Wolf shrinkage.
        
        Shrinkage helps stabilize the covariance matrix estimation,
        especially important when the number of observations is small
        relative to the number of assets. This reduces estimation error
        and helps avoid singular matrices.
        
        Args:
            returns: DataFrame of returns
            shrinkage_factor: Manual shrinkage factor (0-1), None for automatic
            
        Returns:
            Shrunk covariance matrix
        """
        # Sample covariance
        sample_cov = returns.cov() * 252  # Annualized
        
        # Shrinkage target: constant correlation model
        avg_corr = returns.corr().values[np.triu_indices_from(returns.corr().values, k=1)].mean()
        std_devs = returns.std() * np.sqrt(252)
        target = avg_corr * np.outer(std_devs, std_devs)
        np.fill_diagonal(target, np.diag(sample_cov))
        
        if shrinkage_factor is None:
            # Ledoit-Wolf optimal shrinkage
            n = len(returns)
            
            # Calculate optimal shrinkage intensity
            # This minimizes expected loss between estimated and true covariance
            numerator = 0
            denominator = 0
            
            for i in range(len(returns.columns)):
                for j in range(len(returns.columns)):
                    if i != j:
                        cov_ij = np.cov(returns.iloc[:, i], returns.iloc[:, j])[0, 1]
                        var_cov = np.var(returns.iloc[:, i] * returns.iloc[:, j])
                        numerator += var_cov - cov_ij**2
                        denominator += (cov_ij - target[i, j])**2
            
            shrinkage_factor = max(0, min(1, numerator / (n * denominator))) if denominator > 0 else 0
        
        # Apply shrinkage
        shrunk_cov = shrinkage_factor * target + (1 - shrinkage_factor) * sample_cov
        
        return pd.DataFrame(shrunk_cov, index=returns.columns, columns=returns.columns)
    
    def mean_variance_optimization(self, 
                                 target_return: Optional[float] = None,
                                 constraints: Optional[Dict] = None,
                                 max_position: float = 0.40,
                                 min_position: float = 0.0) -> Dict:
        """
        Markowitz Mean-Variance Optimization with practical constraints.
        
        This is the foundation of modern portfolio theory. It finds the
        portfolio weights that minimize risk (variance) for a given expected
        return, or maximize return for a given risk level.
        
        Why it works: Diversification reduces risk without sacrificing return
        by combining assets that don't move perfectly together.
        
        Args:
            target_return: Target annual return (None for max Sharpe)
            constraints: Custom constraints dict
            max_position: Maximum weight per asset (default 40%)
            min_position: Minimum weight per asset (default 0% - long only)
            
        Returns:
            Dict with optimal weights and performance metrics
        """
        n = self.n_assets
        
        # Initial guess: equal weights
        x0 = np.ones(n) / n
        
        # Objective function
        if target_return is None:
            # Maximize Sharpe ratio
            def objective(weights):
                portfolio_return = np.dot(weights, self.expected_returns)
                portfolio_vol = np.sqrt(np.dot(weights, np.dot(self.cov_matrix, weights)))
                # Negative Sharpe (we minimize)
                return -(portfolio_return - self.risk_free_rate * 252) / portfolio_vol
        else:
            # Minimize variance
            def objective(weights):
                return np.dot(weights, np.dot(self.cov_matrix, weights))
        
        # Constraints
        cons = [{'type': 'eq', 'fun': lambda x: np.sum(x) - 1}]  # Weights sum to 1
        
        if target_return is not None:
            # Target return constraint
            cons.append({
                'type': 'eq',
                'fun': lambda x: np.dot(x, self.expected_returns) - target_return
            })
        
        # Bounds for each weight
        bounds = tuple((min_position, max_position) for _ in range(n))
        
        # Add custom constraints if provided
        if constraints:
            for asset, (min_w, max_w) in constraints.items():
                if asset in self.assets:
                    idx = self.assets.index(asset)
                    bounds = list(bounds)
                    bounds[idx] = (min_w, max_w)
                    bounds = tuple(bounds)
        
        # Optimize
        try:
            result = minimize(objective, x0, method='SLSQP', 
                            bounds=bounds, constraints=cons,
                            options={'ftol': 1e-9, 'maxiter': 1000})
            
            if not result.success:
                warnings.warn(f"Optimization did not converge: {result.message}")
            
            weights = result.x
            
        except Exception as e:
            warnings.warn(f"Optimization failed: {str(e)}. Returning equal weights.")
            weights = x0
        
        # Calculate portfolio metrics
        portfolio_return = np.dot(weights, self.expected_returns)
        portfolio_vol = np.sqrt(np.dot(weights, np.dot(self.cov_matrix, weights)))
        sharpe_ratio = (portfolio_return - self.risk_free_rate * 252) / portfolio_vol
        
        # Create weight dictionary
        weight_dict = {asset: weight for asset, weight in zip(self.assets, weights) 
                      if weight > 1e-4}  # Filter out tiny weights
        
        return {
            'weights': weight_dict,
            'expected_return': portfolio_return,
            'volatility': portfolio_vol,
            'sharpe_ratio': sharpe_ratio,
            'optimization_method': 'mean_variance',
            'explanation': self._explain_mv_allocation(weight_dict, sharpe_ratio)
        }
    
    def black_litterman(self,
                       market_caps: Dict[str, float],
                       views: Dict[str, float],
                       view_confidences: Dict[str, float],
                       tau: float = 0.025) -> Dict:
        """
        Black-Litterman Model: Blend market equilibrium with investor views.
        
        This model starts with the market portfolio (weighted by market cap)
        as a neutral prior, then adjusts expected returns based on your views.
        The beauty is that it provides a systematic way to incorporate opinions
        without abandoning the wisdom of the market.
        
        Why use it: Pure historical returns are noisy. Market cap weights
        represent the aggregate view of all investors. Your views adjust
        this baseline in a mathematically consistent way.
        
        Args:
            market_caps: Dict of market capitalizations
            views: Dict of expected returns for specific assets
            view_confidences: Dict of confidence levels (0-1) for each view
            tau: Uncertainty in the prior (default 0.025)
            
        Returns:
            Dict with posterior weights and metrics
        """
        # Calculate market cap weights
        total_cap = sum(market_caps.values())
        market_weights = np.array([market_caps.get(asset, 0) / total_cap 
                                  for asset in self.assets])
        
        # Prior: Equilibrium returns implied by market weights
        # This assumes the market portfolio is efficient
        lam = (self.expected_returns.mean() - self.risk_free_rate * 252) / \
              (self.cov_matrix.values.diagonal().mean())
        equilibrium_returns = lam * np.dot(self.cov_matrix, market_weights)
        
        # Set up views
        P = []  # View matrix
        Q = []  # View returns
        omega_diag = []  # Uncertainty in views
        
        for i, asset in enumerate(self.assets):
            if asset in views:
                view_vector = np.zeros(self.n_assets)
                view_vector[i] = 1
                P.append(view_vector)
                Q.append(views[asset])
                # Higher confidence = lower uncertainty
                confidence = view_confidences.get(asset, 0.5)
                omega_diag.append(tau * (1 - confidence) / confidence)
        
        if not P:  # No views provided
            return self.mean_variance_optimization()
        
        P = np.array(P)
        Q = np.array(Q)
        Omega = np.diag(omega_diag)
        
        # Black-Litterman formula
        # Posterior covariance
        inv_cov = np.linalg.inv(self.cov_matrix)
        posterior_cov = np.linalg.inv(inv_cov + tau * P.T @ np.linalg.inv(Omega) @ P)
        
        # Posterior expected returns
        posterior_returns = posterior_cov @ (inv_cov @ equilibrium_returns + 
                                            tau * P.T @ np.linalg.inv(Omega) @ Q)
        
        # Update expected returns
        self.expected_returns = pd.Series(posterior_returns, index=self.assets)
        
        # Optimize with new returns
        result = self.mean_variance_optimization()
        
        result['optimization_method'] = 'black_litterman'
        result['equilibrium_returns'] = dict(zip(self.assets, equilibrium_returns))
        result['posterior_returns'] = dict(zip(self.assets, posterior_returns))
        result['explanation'] = self._explain_bl_allocation(result['weights'], views)
        
        return result
    
    def risk_parity(self) -> Dict:
        """
        Risk Parity: Equal risk contribution from each asset.
        
        Traditional portfolios often have risk concentrated in a few assets
        (e.g., 60/40 portfolio has ~90% risk from stocks). Risk parity
        ensures each asset contributes equally to portfolio risk.
        
        Why use it: More stable performance across different market regimes.
        Works well when you don't have strong views on expected returns.
        
        Returns:
            Dict with risk parity weights and metrics
        """
        def risk_contribution(weights):
            """Calculate risk contribution of each asset."""
            portfolio_vol = np.sqrt(np.dot(weights, np.dot(self.cov_matrix, weights)))
            marginal_contrib = np.dot(self.cov_matrix, weights) / portfolio_vol
            contrib = weights * marginal_contrib
            return contrib
        
        def objective(weights):
            """Minimize variance of risk contributions."""
            contrib = risk_contribution(weights)
            return np.var(contrib)
        
        # Constraints
        cons = [{'type': 'eq', 'fun': lambda x: np.sum(x) - 1}]
        bounds = tuple((0.001, 1) for _ in range(self.n_assets))
        
        # Initial guess: inverse volatility
        inv_vols = 1 / np.sqrt(np.diag(self.cov_matrix))
        x0 = inv_vols / inv_vols.sum()
        
        # Optimize
        result = minimize(objective, x0, method='SLSQP',
                         bounds=bounds, constraints=cons,
                         options={'ftol': 1e-9})
        
        weights = result.x
        
        # Calculate metrics
        portfolio_return = np.dot(weights, self.expected_returns)
        portfolio_vol = np.sqrt(np.dot(weights, np.dot(self.cov_matrix, weights)))
        sharpe_ratio = (portfolio_return - self.risk_free_rate * 252) / portfolio_vol
        
        # Risk contributions
        contrib = risk_contribution(weights)
        
        weight_dict = {asset: weight for asset, weight in zip(self.assets, weights)
                      if weight > 1e-4}
        
        contrib_dict = {asset: cont for asset, cont in zip(self.assets, contrib)
                       if asset in weight_dict}
        
        return {
            'weights': weight_dict,
            'expected_return': portfolio_return,
            'volatility': portfolio_vol,
            'sharpe_ratio': sharpe_ratio,
            'risk_contributions': contrib_dict,
            'optimization_method': 'risk_parity',
            'explanation': self._explain_rp_allocation(weight_dict, contrib_dict)
        }
    
    def hierarchical_risk_parity(self) -> Dict:
        """
        Hierarchical Risk Parity: Risk parity with correlation clustering.
        
        HRP first groups similar assets using hierarchical clustering,
        then applies risk parity within and across clusters. This is more
        stable than traditional optimization as it doesn't require matrix inversion.
        
        Why use it: Robust to estimation error, works well with many assets,
        captures the hierarchical structure of markets (sectors, industries).
        
        Returns:
            Dict with HRP weights and metrics
        """
        # Calculate distance matrix
        corr = self.corr_matrix.values
        dist = np.sqrt(0.5 * (1 - corr))
        
        # Hierarchical clustering
        condensed_dist = squareform(dist)
        link = linkage(condensed_dist, method='single')
        
        # Recursive bisection
        def recursive_bisection(indices, weights_subset):
            """Recursively split clusters and allocate weights."""
            if len(indices) == 1:
                return {indices[0]: weights_subset}
            
            # Split into two clusters
            clusters = fcluster(link, 2, criterion='maxclust')
            cluster_items = [[] for _ in range(2)]
            
            for i, idx in enumerate(indices):
                cluster_items[clusters[i] - 1].append(idx)
            
            # Calculate cluster variances
            cluster_vars = []
            for items in cluster_items:
                if items:
                    cluster_cov = self.cov_matrix.iloc[items, items].values
                    cluster_var = np.sum(cluster_cov)
                    cluster_vars.append(cluster_var)
                else:
                    cluster_vars.append(np.inf)
            
            # Allocate between clusters (inverse variance)
            alloc1 = 1 / cluster_vars[0] if cluster_vars[0] < np.inf else 0
            alloc2 = 1 / cluster_vars[1] if cluster_vars[1] < np.inf else 0
            total_alloc = alloc1 + alloc2
            
            if total_alloc > 0:
                alloc1 /= total_alloc
                alloc2 /= total_alloc
            else:
                alloc1 = alloc2 = 0.5
            
            # Recursive allocation
            weights = {}
            if cluster_items[0]:
                weights.update(recursive_bisection(cluster_items[0], 
                                                 weights_subset * alloc1))
            if cluster_items[1]:
                weights.update(recursive_bisection(cluster_items[1], 
                                                 weights_subset * alloc2))
            
            return weights
        
        # Get HRP weights
        all_indices = list(range(self.n_assets))
        idx_weights = recursive_bisection(all_indices, 1.0)
        
        # Map to asset names
        weights = np.zeros(self.n_assets)
        for idx, weight in idx_weights.items():
            weights[idx] = weight
        
        # Calculate metrics
        portfolio_return = np.dot(weights, self.expected_returns)
        portfolio_vol = np.sqrt(np.dot(weights, np.dot(self.cov_matrix, weights)))
        sharpe_ratio = (portfolio_return - self.risk_free_rate * 252) / portfolio_vol
        
        weight_dict = {asset: weight for asset, weight in zip(self.assets, weights)
                      if weight > 1e-4}
        
        return {
            'weights': weight_dict,
            'expected_return': portfolio_return,
            'volatility': portfolio_vol,
            'sharpe_ratio': sharpe_ratio,
            'optimization_method': 'hierarchical_risk_parity',
            'explanation': self._explain_hrp_allocation(weight_dict)
        }
    
    def calculate_risk_metrics(self, weights: Dict[str, float]) -> Dict:
        """
        Calculate comprehensive risk metrics for a portfolio.
        
        These metrics help understand different aspects of risk:
        - Sharpe: Risk-adjusted returns
        - Sortino: Downside risk-adjusted returns
        - Calmar: Return vs maximum drawdown
        - VaR/CVaR: Tail risk measures
        
        Args:
            weights: Portfolio weights dict
            
        Returns:
            Dict of risk metrics with explanations
        """
        # Convert weights to array
        w = np.array([weights.get(asset, 0) for asset in self.assets])
        
        # Portfolio returns
        portfolio_returns = self.returns @ w
        
        # Basic metrics
        annual_return = portfolio_returns.mean() * 252
        annual_vol = portfolio_returns.std() * np.sqrt(252)
        
        # Sharpe Ratio
        sharpe = (annual_return - self.risk_free_rate * 252) / annual_vol
        
        # Sortino Ratio (only downside volatility)
        downside_returns = portfolio_returns[portfolio_returns < 0]
        downside_vol = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0
        sortino = (annual_return - self.risk_free_rate * 252) / downside_vol if downside_vol > 0 else np.inf
        
        # Maximum Drawdown
        cumulative = (1 + portfolio_returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Calmar Ratio
        calmar = annual_return / abs(max_drawdown) if max_drawdown != 0 else np.inf
        
        # Value at Risk (95% and 99%)
        var_95 = np.percentile(portfolio_returns, 5)
        var_99 = np.percentile(portfolio_returns, 1)
        
        # Conditional Value at Risk (CVaR)
        cvar_95 = portfolio_returns[portfolio_returns <= var_95].mean()
        cvar_99 = portfolio_returns[portfolio_returns <= var_99].mean()
        
        return {
            'annual_return': annual_return,
            'annual_volatility': annual_vol,
            'sharpe_ratio': sharpe,
            'sortino_ratio': sortino,
            'calmar_ratio': calmar,
            'max_drawdown': max_drawdown,
            'var_95': var_95,
            'var_99': var_99,
            'cvar_95': cvar_95,
            'cvar_99': cvar_99,
            'risk_interpretation': self._interpret_risk_metrics(sharpe, sortino, max_drawdown, var_95)
        }
    
    def monte_carlo_simulation(self, weights: Dict[str, float], 
                             n_simulations: int = 10000,
                             time_horizon: int = 252) -> Dict:
        """
        Monte Carlo simulation for stress testing and scenario analysis.
        
        This simulates thousands of possible future paths for your portfolio
        based on historical statistics. Helps understand the range of possible
        outcomes and probability of extreme events.
        
        Args:
            weights: Portfolio weights
            n_simulations: Number of simulation paths
            time_horizon: Days to simulate forward
            
        Returns:
            Dict with simulation results and statistics
        """
        # Convert weights to array
        w = np.array([weights.get(asset, 0) for asset in self.assets])
        
        # Portfolio parameters
        portfolio_return = np.dot(w, self.expected_returns) / 252  # Daily
        portfolio_vol = np.sqrt(np.dot(w, np.dot(self.cov_matrix / 252, w)))  # Daily
        
        # Generate random walks
        np.random.seed(42)  # For reproducibility
        returns = np.random.normal(portfolio_return, portfolio_vol, 
                                 (n_simulations, time_horizon))
        
        # Calculate paths
        price_paths = np.cumprod(1 + returns, axis=1)
        
        # Final values
        final_values = price_paths[:, -1]
        
        # Statistics
        percentiles = np.percentile(final_values, [5, 25, 50, 75, 95])
        probability_loss = np.mean(final_values < 1)
        expected_value = np.mean(final_values)
        
        # Worst case scenarios
        worst_outcomes = np.sort(final_values)[:int(n_simulations * 0.01)]
        
        return {
            'expected_final_value': expected_value,
            'median_final_value': percentiles[2],
            'percentile_5': percentiles[0],
            'percentile_95': percentiles[4],
            'probability_of_loss': probability_loss,
            'worst_1_percent_outcomes': worst_outcomes.tolist(),
            'simulation_summary': self._summarize_simulation(expected_value, 
                                                           probability_loss,
                                                           percentiles)
        }
    
    def _explain_mv_allocation(self, weights: Dict[str, float], 
                              sharpe: float) -> str:
        """Explain mean-variance optimization results in plain English."""
        top_holdings = sorted(weights.items(), key=lambda x: x[1], reverse=True)[:3]
        
        explanation = f"""
Mean-Variance Optimization Results:

This portfolio maximizes risk-adjusted returns (Sharpe ratio: {sharpe:.2f}).

Top holdings:
"""
        for asset, weight in top_holdings:
            explanation += f"- {asset}: {weight*100:.1f}% - "
            
            # Find correlation with other assets
            asset_idx = self.assets.index(asset)
            avg_corr = self.corr_matrix.iloc[asset_idx].mean()
            
            if avg_corr < 0.3:
                explanation += "Low correlation provides diversification benefit\n"
            elif weight > 0.3:
                explanation += "High weight due to strong expected return\n"
            else:
                explanation += "Balanced position in the portfolio\n"
        
        explanation += f"\nThe optimization balanced expected return ({self.expected_returns.mean()*100:.1f}%) "
        explanation += "against risk to find the most efficient portfolio."
        
        return explanation
    
    def _explain_bl_allocation(self, weights: Dict[str, float], 
                              views: Dict[str, float]) -> str:
        """Explain Black-Litterman results."""
        explanation = """
Black-Litterman Optimization Results:

This portfolio blends market consensus (via market cap weights) with your specific views:

Your views incorporated:
"""
        for asset, view_return in views.items():
            if asset in weights:
                explanation += f"- {asset}: Expected {view_return*100:.1f}% return "
                explanation += f"(allocated {weights[asset]*100:.1f}%)\n"
        
        explanation += "\nThe model adjusted the market portfolio based on your confidence "
        explanation += "in these views, creating a personalized yet market-aware allocation."
        
        return explanation
    
    def _explain_rp_allocation(self, weights: Dict[str, float], 
                              contributions: Dict[str, float]) -> str:
        """Explain risk parity results."""
        explanation = """
Risk Parity Results:

Each asset contributes equally to portfolio risk, creating a balanced risk profile:

Risk contributions:
"""
        for asset in sorted(contributions.keys()):
            explanation += f"- {asset}: {contributions[asset]*100:.1f}% of risk "
            explanation += f"(weight: {weights[asset]*100:.1f}%)\n"
        
        explanation += "\nNote: Lower volatility assets receive higher weights to equalize "
        explanation += "risk contribution. This approach works well in various market conditions."
        
        return explanation
    
    def _explain_hrp_allocation(self, weights: Dict[str, float]) -> str:
        """Explain hierarchical risk parity results."""
        explanation = """
Hierarchical Risk Parity Results:

This method grouped similar assets and applied risk parity hierarchically:

"""
        # Group by weight ranges
        large = {k: v for k, v in weights.items() if v > 0.15}
        medium = {k: v for k, v in weights.items() if 0.05 <= v <= 0.15}
        
        if large:
            explanation += "Core positions (>15%):\n"
            for asset, weight in large.items():
                explanation += f"- {asset}: {weight*100:.1f}%\n"
        
        if medium:
            explanation += "\nSatellite positions (5-15%):\n"
            for asset, weight in medium.items():
                explanation += f"- {asset}: {weight*100:.1f}%\n"
        
        explanation += "\nHRP is robust to estimation errors and doesn't require "
        explanation += "matrix inversion, making it suitable for large portfolios."
        
        return explanation
    
    def _interpret_risk_metrics(self, sharpe: float, sortino: float, 
                               max_dd: float, var_95: float) -> str:
        """Interpret risk metrics in plain English."""
        interpretation = "Risk Profile Assessment:\n\n"
        
        # Sharpe interpretation
        if sharpe > 1.5:
            interpretation += "✅ Excellent risk-adjusted returns (Sharpe > 1.5)\n"
        elif sharpe > 1.0:
            interpretation += "👍 Good risk-adjusted returns (Sharpe > 1.0)\n"
        elif sharpe > 0.5:
            interpretation += "⚠️ Moderate risk-adjusted returns (Sharpe 0.5-1.0)\n"
        else:
            interpretation += "❌ Poor risk-adjusted returns (Sharpe < 0.5)\n"
        
        # Sortino vs Sharpe
        if sortino > sharpe * 1.5:
            interpretation += "✅ Limited downside risk (high Sortino/Sharpe ratio)\n"
        
        # Drawdown
        if max_dd > -0.20:
            interpretation += f"✅ Moderate maximum drawdown ({max_dd*100:.1f}%)\n"
        else:
            interpretation += f"⚠️ Significant maximum drawdown ({max_dd*100:.1f}%)\n"
        
        # VaR
        interpretation += f"\n5% chance of daily loss exceeding {abs(var_95)*100:.1f}%"
        
        return interpretation
    
    def _summarize_simulation(self, expected: float, prob_loss: float, 
                            percentiles: np.ndarray) -> str:
        """Summarize Monte Carlo simulation results."""
        summary = f"""
Monte Carlo Simulation Summary (1 year horizon):

Expected outcome: {(expected-1)*100:.1f}% return
Probability of loss: {prob_loss*100:.1f}%

Range of outcomes:
- Worst 5%: {(percentiles[0]-1)*100:.1f}% return
- Median: {(percentiles[2]-1)*100:.1f}% return  
- Best 5%: {(percentiles[4]-1)*100:.1f}% return

This simulation shows the range of possible outcomes based on
historical volatility and expected returns.
"""
        return summary