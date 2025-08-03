# Financial Methodology Documentation

This document provides a comprehensive overview of the financial theories, mathematical formulations, and algorithmic implementations used in the Portfolio Optimization Dashboard.

## Table of Contents

1. [Overview](#overview)
2. [Modern Portfolio Theory](#modern-portfolio-theory)
3. [Optimization Algorithms](#optimization-algorithms)
4. [Risk Metrics](#risk-metrics)
5. [Performance Attribution](#performance-attribution)
6. [Monte Carlo Simulation](#monte-carlo-simulation)
7. [Backtesting Framework](#backtesting-framework)
8. [Assumptions and Limitations](#assumptions-and-limitations)

## Overview

The Portfolio Optimization Dashboard implements academically rigorous financial models based on Nobel Prize-winning research. Our implementations are validated against benchmark datasets and academic literature to ensure accuracy and reliability.

### Core Principles

1. **Mean Reversion**: Asset returns tend to revert to their long-term mean
2. **Diversification**: Combining uncorrelated assets reduces portfolio risk
3. **Risk-Return Tradeoff**: Higher expected returns require accepting higher risk
4. **Market Efficiency**: Prices reflect all available information (semi-strong form)
5. **Rational Investors**: Investors are risk-averse and utility-maximizing

### Mathematical Notation

Throughout this document, we use the following notation:

- **μ**: Expected return vector (N×1)
- **Σ**: Covariance matrix (N×N)
- **w**: Portfolio weight vector (N×1)
- **r**: Return vector (N×1 or T×N for time series)
- **N**: Number of assets
- **T**: Number of time periods
- **ρ**: Correlation coefficient
- **σ**: Standard deviation (volatility)
- **λ**: Risk aversion parameter

## Modern Portfolio Theory

### Theoretical Foundation

Modern Portfolio Theory (MPT), developed by Harry Markowitz in 1952, provides the mathematical foundation for optimal portfolio construction. The theory assumes investors are rational and risk-averse, seeking to maximize expected return for a given level of risk.

### Mean-Variance Optimization

#### Mathematical Formulation

The classic mean-variance optimization problem can be formulated as:

```
Minimize: (1/2) * w^T * Σ * w - λ * μ^T * w

Subject to:
- Σ w_i = 1 (budget constraint)
- w_i ≥ 0 (long-only constraint, optional)
- w_i ≤ w_max (individual asset weight limits, optional)
```

Where:
- **w^T * Σ * w** is the portfolio variance
- **μ^T * w** is the expected portfolio return
- **λ** is the risk aversion parameter

#### Implementation Details

Our implementation uses quadratic programming with the following steps:

1. **Data Preprocessing**:
   ```python
   # Calculate expected returns using sample mean
   μ = np.mean(returns, axis=0)
   
   # Calculate covariance matrix with bias correction
   Σ = np.cov(returns.T, bias=False)
   
   # Handle numerical stability
   Σ = Σ + np.eye(len(Σ)) * 1e-8
   ```

2. **Optimization Setup**:
   ```python
   # Objective function: minimize (1/2) * w^T * Σ * w
   P = Σ
   q = -λ * μ
   
   # Equality constraint: sum(w) = 1
   A_eq = np.ones((1, N))
   b_eq = np.array([1.0])
   
   # Inequality constraints: w >= min_weight, w <= max_weight
   A_ub = np.vstack([-np.eye(N), np.eye(N)])
   b_ub = np.hstack([-min_weight * np.ones(N), max_weight * np.ones(N)])
   ```

3. **Solver Selection**:
   - **OSQP**: For large problems (N > 100)
   - **CVXOPT**: For medium problems (10 < N ≤ 100)
   - **Scipy**: For small problems (N ≤ 10)

### Efficient Frontier

The efficient frontier represents the set of optimal portfolios offering the highest expected return for each level of risk.

#### Mathematical Derivation

For a target return μ_target, the minimum variance portfolio is found by solving:

```
Minimize: (1/2) * w^T * Σ * w

Subject to:
- μ^T * w = μ_target
- Σ w_i = 1
- Additional constraints (if any)
```

#### Analytical Solution

When no additional constraints are present, the analytical solution is:

```
w* = (Σ^(-1) * A) / (1^T * Σ^(-1) * A) * λ_1 + (Σ^(-1) * μ) / (μ^T * Σ^(-1) * μ) * λ_2

Where A = [1, μ] and λ_1, λ_2 are Lagrange multipliers
```

#### Implementation

```python
def generate_efficient_frontier(mu, Sigma, num_points=50):
    """Generate efficient frontier points."""
    # Calculate portfolio with minimum variance
    inv_Sigma = np.linalg.inv(Sigma)
    ones = np.ones((len(mu), 1))
    
    # Calculate key quantities
    A = mu.T @ inv_Sigma @ ones
    B = mu.T @ inv_Sigma @ mu
    C = ones.T @ inv_Sigma @ ones
    
    # Discriminant for feasible returns
    D = B * C - A**2
    
    # Generate target returns
    mu_min = A / C
    mu_max = np.max(mu)
    target_returns = np.linspace(mu_min, mu_max, num_points)
    
    frontier_points = []
    for mu_target in target_returns:
        # Calculate optimal weights
        g = inv_Sigma @ ones
        h = inv_Sigma @ mu
        
        w = (g * (B - A * mu_target) + h * (C * mu_target - A)) / D
        
        # Calculate portfolio statistics
        portfolio_return = mu.T @ w
        portfolio_risk = np.sqrt(w.T @ Sigma @ w)
        
        frontier_points.append({
            'return': portfolio_return,
            'risk': portfolio_risk,
            'weights': w.flatten()
        })
    
    return frontier_points
```

## Optimization Algorithms

### Maximum Sharpe Ratio

The Sharpe ratio measures risk-adjusted returns and is defined as:

```
Sharpe Ratio = (E[R_p] - R_f) / σ_p
```

Where:
- **E[R_p]**: Expected portfolio return
- **R_f**: Risk-free rate
- **σ_p**: Portfolio standard deviation

#### Optimization Problem

```
Maximize: (μ^T * w - R_f) / sqrt(w^T * Σ * w)

Subject to:
- Σ w_i = 1
- w_i ≥ 0 (optional)
```

#### Solution Method

This non-linear problem can be converted to a linear problem using the transformation y = w/k where k = w^T * Σ * w:

```python
def optimize_max_sharpe(mu, Sigma, risk_free_rate=0.02):
    """Optimize for maximum Sharpe ratio."""
    excess_returns = mu - risk_free_rate
    
    # Use analytical solution when possible
    if np.all(excess_returns > 0):
        # Analytical solution for unconstrained case
        inv_Sigma = np.linalg.inv(Sigma)
        numerator = inv_Sigma @ excess_returns
        denominator = np.sum(numerator)
        
        weights = numerator / denominator
        
        # Normalize to sum to 1
        weights = weights / np.sum(weights)
    else:
        # Use numerical optimization for constrained case
        weights = solve_quadratic_program(mu, Sigma, excess_returns)
    
    return weights
```

### Risk Parity

Risk parity allocates equal risk contribution from each asset, rather than equal dollar amounts.

#### Mathematical Foundation

The risk contribution of asset i is:

```
RC_i = w_i * (Σ * w)_i
```

For equal risk contributions:

```
RC_i = (1/N) * w^T * Σ * w  for all i
```

#### Optimization Problem

```
Minimize: Σ_i (RC_i - (1/N) * w^T * Σ * w)^2

Subject to:
- Σ w_i = 1
- w_i ≥ 0
```

#### Iterative Solution

```python
def optimize_risk_parity(Sigma, max_iterations=1000, tolerance=1e-6):
    """Optimize for risk parity using iterative algorithm."""
    N = len(Sigma)
    weights = np.ones(N) / N  # Equal weight initialization
    
    for iteration in range(max_iterations):
        # Calculate marginal risk contributions
        portfolio_var = weights.T @ Sigma @ weights
        marginal_contrib = Sigma @ weights
        risk_contrib = weights * marginal_contrib
        
        # Target risk contribution (equal for all assets)
        target_contrib = portfolio_var / N
        
        # Update weights based on risk contribution differences
        risk_ratios = target_contrib / risk_contrib
        new_weights = weights * np.sqrt(risk_ratios)
        
        # Normalize weights
        new_weights = new_weights / np.sum(new_weights)
        
        # Check convergence
        if np.max(np.abs(new_weights - weights)) < tolerance:
            break
            
        weights = new_weights
    
    return weights
```

### Black-Litterman Model

The Black-Litterman model combines market equilibrium with investor views to generate expected returns.

#### Mathematical Framework

The model combines:
1. **Prior** (market equilibrium): τΣ
2. **Views** (investor opinions): P, Q, Ω

The posterior expected returns are:

```
μ_BL = [(τΣ)^(-1) + P^T * Ω^(-1) * P]^(-1) * [(τΣ)^(-1) * μ_prior + P^T * Ω^(-1) * Q]
```

Where:
- **τ**: Scaling factor (typically 0.01-0.05)
- **P**: View matrix (K×N)
- **Q**: View returns (K×1)
- **Ω**: View uncertainty matrix (K×K)

#### Implementation

```python
def black_litterman_optimization(mu_prior, Sigma, P, Q, Omega, tau=0.025):
    """
    Black-Litterman optimization with investor views.
    
    Parameters:
    - mu_prior: Prior expected returns (market equilibrium)
    - Sigma: Covariance matrix
    - P: View matrix (each row represents a view)
    - Q: View returns
    - Omega: View uncertainty matrix
    - tau: Scaling parameter
    """
    # Prior precision matrix
    tau_Sigma_inv = np.linalg.inv(tau * Sigma)
    
    # View precision matrix
    P_Omega_inv_P = P.T @ np.linalg.inv(Omega) @ P
    
    # Posterior covariance matrix
    M_inv = tau_Sigma_inv + P_Omega_inv_P
    M = np.linalg.inv(M_inv)
    
    # Posterior expected returns
    mu_bl = M @ (tau_Sigma_inv @ mu_prior + P.T @ np.linalg.inv(Omega) @ Q)
    
    # Posterior covariance matrix
    Sigma_bl = M + Sigma
    
    return mu_bl, Sigma_bl
```

## Risk Metrics

### Value at Risk (VaR)

VaR estimates the maximum loss over a specific time horizon at a given confidence level.

#### Parametric VaR

Assumes returns are normally distributed:

```
VaR_α = -μ * Δt + σ * sqrt(Δt) * Φ^(-1)(α)
```

Where:
- **α**: Confidence level (e.g., 0.05 for 95% VaR)
- **Φ^(-1)**: Inverse standard normal CDF
- **Δt**: Time horizon

#### Historical VaR

Uses historical return distribution:

```python
def calculate_historical_var(returns, confidence_level=0.05):
    """Calculate historical VaR."""
    return -np.percentile(returns, confidence_level * 100)
```

#### Monte Carlo VaR

Uses simulation for complex portfolios:

```python
def monte_carlo_var(mu, Sigma, weights, num_simulations=10000, 
                   confidence_level=0.05, time_horizon=1):
    """Calculate VaR using Monte Carlo simulation."""
    # Portfolio parameters
    portfolio_mu = weights.T @ mu * time_horizon
    portfolio_sigma = np.sqrt(weights.T @ Sigma @ weights * time_horizon)
    
    # Generate random portfolio returns
    random_returns = np.random.normal(portfolio_mu, portfolio_sigma, num_simulations)
    
    # Calculate VaR
    var = -np.percentile(random_returns, confidence_level * 100)
    
    return var
```

### Conditional Value at Risk (CVaR)

CVaR measures the expected loss beyond the VaR threshold:

```
CVaR_α = E[L | L ≥ VaR_α]
```

Implementation:

```python
def calculate_cvar(returns, confidence_level=0.05):
    """Calculate Conditional Value at Risk."""
    var = calculate_historical_var(returns, confidence_level)
    # Expected loss beyond VaR
    tail_losses = returns[returns <= -var]
    cvar = -np.mean(tail_losses) if len(tail_losses) > 0 else var
    return cvar
```

### Maximum Drawdown

Maximum drawdown measures the largest peak-to-trough decline:

```python
def calculate_max_drawdown(returns):
    """Calculate maximum drawdown from return series."""
    cumulative_returns = np.cumprod(1 + returns)
    running_max = np.maximum.accumulate(cumulative_returns)
    drawdown = (cumulative_returns - running_max) / running_max
    max_drawdown = np.min(drawdown)
    return max_drawdown
```

### Tracking Error

Measures the standard deviation of the difference between portfolio and benchmark returns:

```python
def calculate_tracking_error(portfolio_returns, benchmark_returns):
    """Calculate tracking error."""
    active_returns = portfolio_returns - benchmark_returns
    return np.std(active_returns, ddof=1)
```

## Performance Attribution

### Brinson Model

The Brinson model decomposes portfolio performance into allocation and selection effects.

#### Mathematical Framework

Total excess return = Allocation Effect + Selection Effect + Interaction Effect

```
Allocation Effect = Σ (w_p,i - w_b,i) * r_b,i
Selection Effect = Σ w_b,i * (r_p,i - r_b,i)  
Interaction Effect = Σ (w_p,i - w_b,i) * (r_p,i - r_b,i)
```

Where:
- **w_p,i**: Portfolio weight in sector i
- **w_b,i**: Benchmark weight in sector i
- **r_p,i**: Portfolio return in sector i
- **r_b,i**: Benchmark return in sector i

#### Implementation

```python
def brinson_attribution(portfolio_weights, portfolio_returns, 
                       benchmark_weights, benchmark_returns):
    """
    Perform Brinson attribution analysis.
    
    Returns:
    - allocation_effect: Return due to asset allocation decisions
    - selection_effect: Return due to security selection
    - interaction_effect: Interaction between allocation and selection
    """
    # Weight differences
    weight_diff = portfolio_weights - benchmark_weights
    
    # Return differences
    return_diff = portfolio_returns - benchmark_returns
    
    # Attribution effects
    allocation_effect = np.sum(weight_diff * benchmark_returns)
    selection_effect = np.sum(benchmark_weights * return_diff)
    interaction_effect = np.sum(weight_diff * return_diff)
    
    total_effect = allocation_effect + selection_effect + interaction_effect
    
    return {
        'allocation_effect': allocation_effect,
        'selection_effect': selection_effect,
        'interaction_effect': interaction_effect,
        'total_effect': total_effect
    }
```

### Factor-Based Attribution

Decomposes returns based on risk factors (Fama-French, etc.):

```python
def factor_attribution(returns, factor_returns, factor_loadings):
    """
    Attribute returns to risk factors.
    
    Parameters:
    - returns: Portfolio returns
    - factor_returns: Factor return matrix (T×K)
    - factor_loadings: Factor loadings (N×K)
    
    Returns:
    - factor_contributions: Attribution to each factor
    - specific_return: Idiosyncratic return
    """
    # Calculate factor contributions
    factor_contributions = factor_loadings @ factor_returns.T
    
    # Specific (idiosyncratic) return
    predicted_returns = np.sum(factor_contributions, axis=1)
    specific_return = returns - predicted_returns
    
    return factor_contributions, specific_return
```

## Monte Carlo Simulation

### Theoretical Foundation

Monte Carlo simulation generates thousands of possible future scenarios to estimate portfolio performance distributions.

#### Geometric Brownian Motion

Asset prices follow the stochastic differential equation:

```
dS_t = μ * S_t * dt + σ * S_t * dW_t
```

Where:
- **dW_t**: Wiener process (random walk)
- **μ**: Drift (expected return)
- **σ**: Volatility

#### Discrete Time Simulation

```python
def monte_carlo_simulation(mu, Sigma, weights, initial_value=100000, 
                          time_horizon=252, num_simulations=10000):
    """
    Perform Monte Carlo simulation for portfolio.
    
    Parameters:
    - mu: Expected returns (annual)
    - Sigma: Covariance matrix (annual)
    - weights: Portfolio weights
    - initial_value: Starting portfolio value
    - time_horizon: Simulation period (days)
    - num_simulations: Number of scenarios
    """
    # Portfolio parameters
    portfolio_mu = weights.T @ mu / 252  # Daily return
    portfolio_sigma = np.sqrt(weights.T @ Sigma @ weights / 252)  # Daily volatility
    
    # Generate random returns
    dt = 1.0  # Daily time step
    random_shocks = np.random.normal(0, 1, (num_simulations, time_horizon))
    
    # Simulate price paths
    paths = np.zeros((num_simulations, time_horizon + 1))
    paths[:, 0] = initial_value
    
    for t in range(time_horizon):
        # Geometric Brownian Motion
        drift = (portfolio_mu - 0.5 * portfolio_sigma**2) * dt
        diffusion = portfolio_sigma * np.sqrt(dt) * random_shocks[:, t]
        
        paths[:, t + 1] = paths[:, t] * np.exp(drift + diffusion)
    
    return paths
```

### Scenario Analysis

Generate specific scenarios for stress testing:

```python
def scenario_analysis(mu, Sigma, weights, scenarios):
    """
    Analyze portfolio performance under specific scenarios.
    
    Parameters:
    - mu: Expected returns
    - Sigma: Covariance matrix  
    - weights: Portfolio weights
    - scenarios: Dictionary of scenario shocks
    """
    results = {}
    
    for scenario_name, shocks in scenarios.items():
        # Apply shocks to expected returns
        shocked_mu = mu + shocks
        
        # Calculate portfolio impact
        portfolio_return = weights.T @ shocked_mu
        portfolio_vol = np.sqrt(weights.T @ Sigma @ weights)
        
        results[scenario_name] = {
            'return': portfolio_return,
            'volatility': portfolio_vol,
            'sharpe_ratio': portfolio_return / portfolio_vol
        }
    
    return results
```

## Backtesting Framework

### Walk-Forward Analysis

Tests strategy performance using rolling windows of historical data:

```python
def walk_forward_backtest(returns_data, optimization_func, 
                         lookback_window=252, rebalance_frequency=21):
    """
    Perform walk-forward backtesting.
    
    Parameters:
    - returns_data: Historical returns matrix (T×N)
    - optimization_func: Portfolio optimization function
    - lookback_window: Data window for optimization (days)
    - rebalance_frequency: Rebalancing frequency (days)
    """
    T, N = returns_data.shape
    portfolio_returns = []
    weights_history = []
    
    for t in range(lookback_window, T, rebalance_frequency):
        # Training data
        train_data = returns_data[t-lookback_window:t, :]
        
        # Optimize portfolio
        mu = np.mean(train_data, axis=0)
        Sigma = np.cov(train_data.T)
        weights = optimization_func(mu, Sigma)
        
        # Calculate out-of-sample returns
        end_period = min(t + rebalance_frequency, T)
        future_returns = returns_data[t:end_period, :]
        portfolio_return = future_returns @ weights
        
        portfolio_returns.extend(portfolio_return)
        weights_history.append(weights)
    
    return np.array(portfolio_returns), weights_history
```

### Performance Metrics

Calculate comprehensive performance statistics:

```python
def calculate_performance_metrics(returns, benchmark_returns=None, 
                                risk_free_rate=0.02):
    """Calculate comprehensive performance metrics."""
    # Annualized return
    annual_return = np.mean(returns) * 252
    
    # Annualized volatility
    annual_vol = np.std(returns, ddof=1) * np.sqrt(252)
    
    # Sharpe ratio
    excess_returns = returns - risk_free_rate / 252
    sharpe_ratio = np.mean(excess_returns) / np.std(excess_returns, ddof=1) * np.sqrt(252)
    
    # Maximum drawdown
    max_dd = calculate_max_drawdown(returns)
    
    # Calmar ratio
    calmar_ratio = annual_return / abs(max_dd) if max_dd != 0 else np.inf
    
    # Sortino ratio
    downside_returns = returns[returns < 0]
    downside_vol = np.std(downside_returns, ddof=1) * np.sqrt(252) if len(downside_returns) > 0 else 0
    sortino_ratio = annual_return / downside_vol if downside_vol != 0 else np.inf
    
    metrics = {
        'annual_return': annual_return,
        'annual_volatility': annual_vol,
        'sharpe_ratio': sharpe_ratio,
        'max_drawdown': max_dd,
        'calmar_ratio': calmar_ratio,
        'sortino_ratio': sortino_ratio
    }
    
    # Benchmark-relative metrics
    if benchmark_returns is not None:
        tracking_error = calculate_tracking_error(returns, benchmark_returns)
        information_ratio = np.mean(returns - benchmark_returns) / tracking_error * np.sqrt(252)
        
        metrics.update({
            'tracking_error': tracking_error * np.sqrt(252),
            'information_ratio': information_ratio
        })
    
    return metrics
```

## Assumptions and Limitations

### Key Assumptions

1. **Multivariate Normal Returns**: Returns follow a multivariate normal distribution
2. **Constant Parameters**: Expected returns and covariances are constant over time
3. **Liquid Markets**: Assets can be traded in any quantity without market impact
4. **No Transaction Costs**: Trading is frictionless with no bid-ask spreads
5. **Single Period**: Optimization is performed for a single time horizon
6. **Risk Aversion**: Investors are risk-averse with quadratic utility functions

### Limitations and Mitigations

| Limitation | Impact | Mitigation Strategy |
|------------|--------|-------------------|
| **Parameter Estimation Error** | Overconfident optimization | Robust optimization, regularization |
| **Non-Normal Returns** | Underestimated tail risk | Monte Carlo simulation, higher moments |
| **Time-Varying Parameters** | Suboptimal portfolios | Dynamic models, regime switching |
| **Transaction Costs** | Reduced net returns | Include cost models, minimize turnover |
| **Behavioral Biases** | Deviation from theory | Behavioral portfolio theory adjustments |
| **Market Impact** | Price movements from trading | Execution algorithms, gradual rebalancing |

### Model Validation

1. **Statistical Tests**:
   - Normality tests (Jarque-Bera, Shapiro-Wilk)
   - Stationarity tests (Augmented Dickey-Fuller)
   - Heteroscedasticity tests (Breusch-Pagan)

2. **Out-of-Sample Testing**:
   - Walk-forward analysis
   - Monte Carlo cross-validation
   - Sensitivity analysis

3. **Benchmark Comparison**:
   - Equal-weighted portfolios
   - Market cap-weighted indices
   - Academic factor models

### Future Enhancements

1. **Advanced Models**:
   - Robust portfolio optimization
   - Multi-period optimization
   - Regime-switching models
   - Machine learning integration

2. **Alternative Risk Measures**:
   - Downside deviation
   - Semi-variance
   - Tail risk measures
   - Spectral risk measures

3. **Behavioral Finance**:
   - Prospect theory utility
   - Mental accounting
   - Reference point dependence

---

*This methodology documentation is based on peer-reviewed academic research and industry best practices. All implementations undergo rigorous testing against benchmark datasets. For questions about specific formulations or implementations, please refer to our [academic references](references.md) or contact our quantitative research team.*