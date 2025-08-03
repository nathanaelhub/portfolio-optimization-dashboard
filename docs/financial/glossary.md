# Financial Glossary

A comprehensive glossary of financial terms used in the Portfolio Optimization Dashboard.

## A

**Alpha (α)**
- Risk-adjusted excess return of a portfolio relative to a benchmark
- Formula: α = R_p - [R_f + β(R_m - R_f)]
- Interpretation: Positive alpha indicates outperformance

**Asset Allocation**
- The process of dividing investments among different asset categories
- Strategic: Long-term mix based on goals and risk tolerance
- Tactical: Short-term adjustments based on market conditions

**Autocorrelation**
- Correlation of a time series with a delayed copy of itself
- Important for detecting patterns in return data
- Violation of independence assumption in classical models

## B

**Beta (β)**
- Measure of systematic risk relative to the market
- Formula: β = Cov(R_p, R_m) / Var(R_m)
- β > 1: More volatile than market; β < 1: Less volatile than market

**Black-Litterman Model**
- Portfolio optimization model that combines market equilibrium with investor views
- Addresses instability issues in mean-variance optimization
- Uses Bayesian approach to update expected returns

**Brinson Attribution**
- Method to decompose portfolio performance into allocation and selection effects
- Allocation Effect: Impact of sector/asset class weighting decisions
- Selection Effect: Impact of security selection within sectors

## C

**CAPM (Capital Asset Pricing Model)**
- Model describing relationship between systematic risk and expected return
- Formula: E(R_i) = R_f + β_i[E(R_m) - R_f]
- Foundation for risk-adjusted performance measurement

**Calmar Ratio**
- Risk-adjusted return metric using maximum drawdown as risk measure
- Formula: Annual Return / |Maximum Drawdown|
- Higher values indicate better risk-adjusted performance

**Correlation (ρ)**
- Statistical measure of linear relationship between two variables
- Range: -1 (perfect negative) to +1 (perfect positive)
- ρ = 0 indicates no linear relationship

**Covariance Matrix (Σ)**
- Matrix showing covariances between all pairs of assets
- Diagonal elements are variances, off-diagonal are covariances
- Central to mean-variance optimization

**CVaR (Conditional Value at Risk)**
- Expected loss beyond the VaR threshold
- Also known as Expected Shortfall (ES)
- Coherent risk measure unlike VaR

## D

**Diversification**
- Risk reduction through combining imperfectly correlated assets
- Systematic risk cannot be diversified away
- Optimal diversification considers correlations, not just number of assets

**Drawdown**
- Peak-to-trough decline in portfolio value
- Maximum Drawdown: Largest observed drawdown over a period
- Used to assess downside risk and recovery potential

## E

**Efficient Frontier**
- Set of optimal portfolios offering highest expected return for each risk level
- Represents the boundary of the feasible mean-variance space
- Foundation of modern portfolio theory

**Expected Return (μ)**
- Anticipated return of an asset or portfolio
- Can be estimated using historical mean, CAPM, or other models
- Key input to portfolio optimization

## F

**Factor Model**
- Model explaining asset returns through exposure to common factors
- Types: Single-factor (CAPM), Multi-factor (Fama-French)
- Used for risk attribution and portfolio construction

**Fama-French Model**
- Three-factor model explaining returns through:
  - Market risk (beta)
  - Size effect (SMB - Small Minus Big)
  - Value effect (HML - High Minus Low)

## H

**Holding Period Return**
- Total return over a specific investment period
- Formula: (Ending Value - Beginning Value + Dividends) / Beginning Value
- Can be annualized for comparison across different periods

## I

**Information Ratio**
- Measure of risk-adjusted active return
- Formula: (Portfolio Return - Benchmark Return) / Tracking Error
- Higher values indicate better active management skill

## J

**Jensen's Alpha**
- Risk-adjusted performance measure based on CAPM
- Represents excess return after adjusting for systematic risk
- Named after Michael Jensen

## L

**Lagrange Multipliers**
- Mathematical technique for constrained optimization
- Used to solve mean-variance optimization problems
- Each constraint has an associated multiplier (shadow price)

## M

**Markowitz Optimization**
- Mathematical framework for portfolio optimization
- Minimizes risk for a given level of expected return
- Foundation of modern portfolio theory

**Maximum Drawdown**
- Largest peak-to-trough decline in portfolio value
- Key measure of downside risk
- Used in risk management and performance evaluation

**Mean Reversion**
- Tendency for asset prices to return to long-term average
- Important assumption in many portfolio models
- Can be tested using statistical methods

**Monte Carlo Simulation**
- Numerical method using random sampling
- Used to model portfolio performance under uncertainty
- Provides distribution of possible outcomes

## O

**Optimization**
- Mathematical process of finding the best solution
- In finance: finding optimal portfolio weights
- Types: Unconstrained, constrained, robust

## P

**Portfolio Theory**
- Mathematical framework for optimal portfolio construction
- Modern Portfolio Theory (Markowitz, 1952)
- Extensions: Black-Litterman, Behavioral Portfolio Theory

## Q

**Quadratic Programming**
- Optimization method for problems with quadratic objective function
- Standard approach for mean-variance optimization
- Solvers: OSQP, CVXOPT, Gurobi

**Quantile**
- Value below which a certain percentage of observations fall
- 5th percentile often used for Value at Risk
- Alternative to normal distribution assumptions

## R

**Rebalancing**
- Process of realigning portfolio weights to target allocation
- Frequency: Daily, monthly, quarterly, or threshold-based
- Balances transaction costs with tracking error

**Risk Parity**
- Portfolio construction approach equalizing risk contributions
- Each asset contributes equally to portfolio risk
- Alternative to market-cap or equal weighting

**Risk-Free Rate**
- Return on risk-free investment (e.g., Treasury bills)
- Used as baseline for risk premium calculations
- Key input to Sharpe ratio and CAPM

## S

**Sharpe Ratio**
- Risk-adjusted return measure
- Formula: (Portfolio Return - Risk-Free Rate) / Portfolio Standard Deviation
- Higher values indicate better risk-adjusted performance

**Sortino Ratio**
- Risk-adjusted return using downside deviation
- Formula: (Portfolio Return - Target Return) / Downside Deviation
- Focuses on harmful volatility only

**Standard Deviation (σ)**
- Measure of return volatility
- Square root of variance
- Commonly used as risk measure in portfolio theory

## T

**Tracking Error**
- Standard deviation of active returns (portfolio minus benchmark)
- Measures consistency of active management
- Used in information ratio calculation

**Turnover**
- Measure of portfolio trading activity
- High turnover increases transaction costs
- Balance with performance improvement

## U

**Utility Function**
- Mathematical representation of investor preferences
- Common form: U = μ - (λ/2)σ² (mean-variance utility)
- λ represents risk aversion parameter

## V

**Value at Risk (VaR)**
- Maximum expected loss over a specific time horizon at given confidence level
- Common measures: 1-day 95% VaR, 1-day 99% VaR
- Regulatory requirement for financial institutions

**Variance**
- Statistical measure of return dispersion
- Square of standard deviation
- Used as risk measure in mean-variance optimization

**Volatility**
- Measure of price fluctuation (standard deviation of returns)
- Can be historical, implied, or forecasted
- Key risk metric in portfolio management

## W

**Weight Constraints**
- Restrictions on portfolio allocation to individual assets
- Types: Long-only, leverage, concentration limits
- Impact optimization solution and risk characteristics

## Mathematical Symbols

| Symbol | Meaning |
|--------|---------|
| μ | Expected return (mu) |
| σ | Standard deviation (sigma) |
| ρ | Correlation coefficient (rho) |
| Σ | Covariance matrix (capital sigma) |
| w | Portfolio weights |
| λ | Risk aversion parameter (lambda) |
| β | Beta (systematic risk) |
| α | Alpha (excess return) |
| ε | Error term (epsilon) |
| Ω | Uncertainty matrix (omega) |

## Common Financial Formulas

### Sharpe Ratio
```
S = (R_p - R_f) / σ_p
```

### Portfolio Return
```
R_p = Σ w_i * R_i
```

### Portfolio Variance
```
σ_p² = w^T * Σ * w
```

### Beta
```
β = Cov(R_p, R_m) / Var(R_m)
```

### CAPM
```
E(R_i) = R_f + β_i * [E(R_m) - R_f]
```

### Value at Risk (Parametric)
```
VaR_α = -μ + σ * Φ^(-1)(α)
```

### Information Ratio
```
IR = (R_p - R_b) / TE
```

### Tracking Error
```
TE = σ(R_p - R_b)
```

---

*This glossary is continuously updated to reflect current industry terminology and mathematical notation. For additional terms or clarification, please refer to our [methodology documentation](methodology.md) or contact our support team.*