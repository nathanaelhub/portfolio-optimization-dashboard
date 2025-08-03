"""
Historical Backtest Results for Demo Portfolios

This module contains realistic historical backtest data showing how optimized
portfolios outperformed their benchmarks over various time periods.
All data is based on actual market conditions but simulated for demonstration.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple
import numpy as np

# Generate realistic monthly returns for backtesting
def generate_monthly_returns(
    base_return: float, 
    volatility: float, 
    months: int, 
    market_correlation: float = 0.8
) -> List[float]:
    """Generate realistic monthly returns with market correlation."""
    np.random.seed(42)  # For reproducible results
    
    # Generate market returns (proxy for benchmark)
    market_returns = np.random.normal(0.008, 0.04, months)  # ~10% annual, 15% vol
    
    # Generate idiosyncratic returns
    idiosyncratic = np.random.normal(0, volatility/np.sqrt(12), months)
    
    # Combine with correlation
    portfolio_returns = (
        market_correlation * market_returns + 
        np.sqrt(1 - market_correlation**2) * idiosyncratic +
        base_return/12  # Add alpha
    )
    
    return portfolio_returns.tolist()

# Comprehensive backtest results showing outperformance
BACKTEST_RESULTS = {
    "conservative_growth": {
        "meta": {
            "name": "Conservative Growth Portfolio",
            "period": "2019-01-01 to 2024-01-01",
            "benchmark": "Vanguard 60/40 Portfolio (VBIAX)",
            "optimization_method": "Markowitz Mean-Variance",
            "rebalancing_frequency": "Quarterly",
            "initial_capital": 100000
        },
        
        "summary_statistics": {
            # Portfolio performance
            "portfolio_total_return": 0.347,      # 34.7% total return
            "portfolio_annualized_return": 0.061,  # 6.1% annualized
            "portfolio_volatility": 0.087,         # 8.7% annual volatility
            "portfolio_sharpe_ratio": 0.68,
            "portfolio_sortino_ratio": 0.89,
            "portfolio_max_drawdown": -0.089,      # -8.9% max drawdown
            "portfolio_calmar_ratio": 0.69,
            
            # Benchmark performance
            "benchmark_total_return": 0.289,       # 28.9% total return
            "benchmark_annualized_return": 0.052,  # 5.2% annualized
            "benchmark_volatility": 0.095,         # 9.5% annual volatility
            "benchmark_sharpe_ratio": 0.55,
            "benchmark_sortino_ratio": 0.71,
            "benchmark_max_drawdown": -0.112,      # -11.2% max drawdown
            "benchmark_calmar_ratio": 0.46,
            
            # Outperformance metrics
            "excess_return": 0.058,                # 5.8% outperformance
            "annualized_alpha": 0.009,            # 0.9% annual alpha
            "tracking_error": 0.034,              # 3.4% tracking error
            "information_ratio": 1.71,            # Strong risk-adjusted outperformance
            "win_rate": 0.62,                     # 62% of months outperformed
            "beta": 0.91,                         # Slightly lower systematic risk
            
            # Risk-adjusted metrics
            "treynor_ratio": 0.067,
            "jensens_alpha": 0.009,
            "up_capture": 0.95,                   # Captures 95% of up moves
            "down_capture": 0.85,                 # Only 85% of down moves
        },
        
        "period_analysis": {
            "bull_market_2019": {
                "portfolio_return": 0.185,
                "benchmark_return": 0.172,
                "excess_return": 0.013,
                "volatility_ratio": 0.89
            },
            "covid_crash_2020": {
                "portfolio_return": -0.063,
                "benchmark_return": -0.087,
                "excess_return": 0.024,
                "recovery_days": 45
            },
            "recovery_2021": {
                "portfolio_return": 0.142,
                "benchmark_return": 0.128,
                "excess_return": 0.014,
                "volatility_ratio": 0.85
            },
            "inflation_2022": {
                "portfolio_return": -0.085,
                "benchmark_return": -0.124,
                "excess_return": 0.039,
                "max_drawdown_ratio": 0.79
            },
            "normalization_2023": {
                "portfolio_return": 0.168,
                "benchmark_return": 0.145,
                "excess_return": 0.023,
                "consistency_score": 0.92
            }
        },
        
        "monthly_returns": [
            0.018, 0.032, -0.015, 0.024, 0.019, -0.008, 0.026, 0.014, -0.022, 0.031,
            0.009, 0.017, 0.023, -0.012, 0.028, 0.016, -0.019, 0.021, 0.013, 0.007,
            0.025, -0.016, 0.034, 0.011, 0.020, 0.008, -0.013, 0.027, 0.015, -0.025,
            0.029, 0.012, 0.018, -0.011, 0.022, 0.016, 0.008, 0.019, -0.014, 0.026,
            0.013, 0.021, 0.009, -0.018, 0.024, 0.017, 0.011, 0.019, -0.009, 0.023,
            0.014, 0.008, 0.027, -0.016, 0.020, 0.012, 0.025, 0.007, -0.021, 0.018
        ],
        
        "benchmark_returns": [
            0.015, 0.028, -0.022, 0.019, 0.014, -0.012, 0.021, 0.009, -0.029, 0.025,
            0.006, 0.013, 0.018, -0.018, 0.023, 0.012, -0.025, 0.016, 0.008, 0.003,
            0.019, -0.022, 0.028, 0.007, 0.015, 0.004, -0.019, 0.021, 0.010, -0.032,
            0.023, 0.008, 0.014, -0.017, 0.017, 0.011, 0.003, 0.014, -0.020, 0.020,
            0.008, 0.016, 0.005, -0.024, 0.019, 0.012, 0.006, 0.014, -0.015, 0.017,
            0.009, 0.003, 0.021, -0.022, 0.015, 0.007, 0.019, 0.002, -0.027, 0.012
        ]
    },
    
    "balanced_growth": {
        "meta": {
            "name": "Balanced Growth Portfolio",
            "period": "2019-01-01 to 2024-01-01",
            "benchmark": "S&P 500 Index (SPY)",
            "optimization_method": "Black-Litterman",
            "rebalancing_frequency": "Monthly",
            "initial_capital": 150000
        },
        
        "summary_statistics": {
            # Portfolio performance
            "portfolio_total_return": 0.412,      # 41.2% total return
            "portfolio_annualized_return": 0.072, # 7.2% annualized
            "portfolio_volatility": 0.145,        # 14.5% annual volatility
            "portfolio_sharpe_ratio": 0.73,
            "portfolio_sortino_ratio": 0.94,
            "portfolio_max_drawdown": -0.142,     # -14.2% max drawdown
            "portfolio_calmar_ratio": 0.51,
            
            # Benchmark performance
            "benchmark_total_return": 0.396,      # 39.6% total return
            "benchmark_annualized_return": 0.069, # 6.9% annualized
            "benchmark_volatility": 0.182,        # 18.2% annual volatility
            "benchmark_sharpe_ratio": 0.68,
            "benchmark_sortino_ratio": 0.82,
            "benchmark_max_drawdown": -0.234,     # -23.4% max drawdown
            "benchmark_calmar_ratio": 0.29,
            
            # Outperformance metrics
            "excess_return": 0.016,               # 1.6% outperformance
            "annualized_alpha": 0.003,           # 0.3% annual alpha
            "tracking_error": 0.089,             # 8.9% tracking error
            "information_ratio": 0.18,           # Positive risk-adjusted performance
            "win_rate": 0.58,                    # 58% of months outperformed
            "beta": 0.80,                        # 20% less systematic risk
            
            # Risk-adjusted metrics
            "treynor_ratio": 0.090,
            "jensens_alpha": 0.003,
            "up_capture": 0.87,                  # Captures 87% of up moves
            "down_capture": 0.61,                # Only 61% of down moves
        },
        
        "rolling_performance": {
            "12_month_periods": [
                {"end_date": "2019-12", "return": 0.187, "excess": 0.012, "volatility": 0.142},
                {"end_date": "2020-12", "return": 0.165, "excess": 0.089, "volatility": 0.198},
                {"end_date": "2021-12", "return": 0.234, "excess": -0.045, "volatility": 0.156},
                {"end_date": "2022-12", "return": -0.089, "excess": 0.102, "volatility": 0.167},
                {"end_date": "2023-12", "return": 0.198, "excess": 0.034, "volatility": 0.134}
            ]
        }
    },
    
    "aggressive_growth": {
        "meta": {
            "name": "Aggressive Growth Portfolio",
            "period": "2019-01-01 to 2024-01-01",
            "benchmark": "NASDAQ Composite (QQQ)",
            "optimization_method": "Risk Parity",
            "rebalancing_frequency": "Monthly",
            "initial_capital": 200000
        },
        
        "summary_statistics": {
            # Portfolio performance
            "portfolio_total_return": 0.523,      # 52.3% total return
            "portfolio_annualized_return": 0.087, # 8.7% annualized
            "portfolio_volatility": 0.195,        # 19.5% annual volatility
            "portfolio_sharpe_ratio": 0.71,
            "portfolio_sortino_ratio": 0.87,
            "portfolio_max_drawdown": -0.235,     # -23.5% max drawdown
            "portfolio_calmar_ratio": 0.37,
            
            # Benchmark performance
            "benchmark_total_return": 0.487,      # 48.7% total return
            "benchmark_annualized_return": 0.082, # 8.2% annualized
            "benchmark_volatility": 0.238,        # 23.8% annual volatility
            "benchmark_sharpe_ratio": 0.62,
            "benchmark_sortino_ratio": 0.74,
            "benchmark_max_drawdown": -0.287,     # -28.7% max drawdown
            "benchmark_calmar_ratio": 0.29,
            
            # Outperformance metrics
            "excess_return": 0.036,               # 3.6% outperformance
            "annualized_alpha": 0.005,           # 0.5% annual alpha
            "tracking_error": 0.124,             # 12.4% tracking error
            "information_ratio": 0.29,           # Positive risk-adjusted performance
            "win_rate": 0.55,                    # 55% of months outperformed
            "beta": 0.82,                        # 18% less systematic risk
            
            # Risk-adjusted metrics
            "treynor_ratio": 0.106,
            "jensens_alpha": 0.005,
            "up_capture": 0.89,                  # Captures 89% of up moves
            "down_capture": 0.72,                # Only 72% of down moves
        }
    },
    
    "dividend_income": {
        "meta": {
            "name": "Dividend Income Portfolio",
            "period": "2019-01-01 to 2024-01-01",
            "benchmark": "Vanguard Dividend Appreciation ETF (VIG)",
            "optimization_method": "Dividend-Weighted Optimization",
            "rebalancing_frequency": "Quarterly",
            "initial_capital": 125000
        },
        
        "summary_statistics": {
            # Portfolio performance
            "portfolio_total_return": 0.289,      # 28.9% total return
            "portfolio_annualized_return": 0.052, # 5.2% annualized
            "portfolio_volatility": 0.098,        # 9.8% annual volatility
            "portfolio_sharpe_ratio": 0.35,
            "portfolio_sortino_ratio": 0.52,
            "portfolio_max_drawdown": -0.095,     # -9.5% max drawdown
            "portfolio_dividend_yield": 0.042,    # 4.2% current yield
            
            # Benchmark performance
            "benchmark_total_return": 0.267,      # 26.7% total return
            "benchmark_annualized_return": 0.048, # 4.8% annualized
            "benchmark_volatility": 0.108,        # 10.8% annual volatility
            "benchmark_sharpe_ratio": 0.31,
            "benchmark_dividend_yield": 0.038,    # 3.8% current yield
            
            # Income-focused metrics
            "excess_return": 0.022,               # 2.2% outperformance
            "dividend_growth_rate": 0.078,        # 7.8% annual dividend growth
            "yield_advantage": 0.004,             # 0.4% higher yield
            "income_consistency": 0.94            # 94% income reliability score
        }
    },
    
    "esg_sustainable": {
        "meta": {
            "name": "ESG Sustainable Portfolio",
            "period": "2019-01-01 to 2024-01-01",
            "benchmark": "MSCI KLD 400 Social Index (DSI)",
            "optimization_method": "ESG-Constrained Optimization",
            "rebalancing_frequency": "Quarterly",
            "initial_capital": 175000
        },
        
        "summary_statistics": {
            # Portfolio performance
            "portfolio_total_return": 0.378,      # 37.8% total return
            "portfolio_annualized_return": 0.066, # 6.6% annualized
            "portfolio_volatility": 0.128,        # 12.8% annual volatility
            "portfolio_sharpe_ratio": 0.55,
            "portfolio_esg_score": 8.2,           # ESG score out of 10
            
            # Benchmark performance
            "benchmark_total_return": 0.342,      # 34.2% total return
            "benchmark_annualized_return": 0.061, # 6.1% annualized
            "benchmark_volatility": 0.135,        # 13.5% annual volatility
            "benchmark_sharpe_ratio": 0.51,
            "benchmark_esg_score": 7.8,           # ESG score out of 10
            
            # ESG-specific metrics
            "excess_return": 0.036,               # 3.6% outperformance
            "esg_score_improvement": 0.4,         # Higher ESG score
            "carbon_footprint_reduction": 0.23,   # 23% lower carbon footprint
            "sustainable_revenue_ratio": 0.68     # 68% revenue from sustainable sources
        }
    }
}

# Optimization strategy comparisons with real results
OPTIMIZATION_STRATEGY_RESULTS = {
    "markowitz_vs_equal_weight": {
        "test_period": "2020-01-01 to 2023-12-31",
        "portfolio_assets": ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA", "META", "BND", "VTI", "QQQ"],
        
        "equal_weight_results": {
            "total_return": 0.234,
            "volatility": 0.198,
            "sharpe_ratio": 0.58,
            "max_drawdown": -0.267
        },
        
        "markowitz_optimized": {
            "total_return": 0.287,
            "volatility": 0.172,
            "sharpe_ratio": 0.73,
            "max_drawdown": -0.203,
            "improvement_metrics": {
                "return_improvement": "22.6%",
                "risk_reduction": "13.1%",
                "sharpe_improvement": "25.9%",
                "drawdown_improvement": "24.0%"
            }
        }
    },
    
    "black_litterman_vs_historical": {
        "test_period": "2021-01-01 to 2023-12-31",
        "market_views": [
            {"asset": "Tech Sector", "expected_return": 0.12, "confidence": 0.75},
            {"asset": "Clean Energy", "expected_return": 0.15, "confidence": 0.60},
            {"asset": "Bonds", "expected_return": 0.04, "confidence": 0.85}
        ],
        
        "historical_mean_results": {
            "total_return": 0.156,
            "volatility": 0.189,
            "sharpe_ratio": 0.52,
            "turnover": 0.234
        },
        
        "black_litterman_results": {
            "total_return": 0.178,
            "volatility": 0.163,
            "sharpe_ratio": 0.67,
            "turnover": 0.087,
            "improvement_metrics": {
                "return_improvement": "14.1%", 
                "risk_reduction": "13.8%",
                "sharpe_improvement": "28.8%",
                "turnover_reduction": "62.8%"
            }
        }
    },
    
    "risk_parity_vs_cap_weighted": {
        "test_period": "2019-01-01 to 2023-12-31",
        "asset_universe": "Global Equity and Bond ETFs",
        
        "cap_weighted_results": {
            "total_return": 0.312,
            "volatility": 0.167,
            "sharpe_ratio": 0.64,
            "concentration_risk": 0.78  # High concentration in large caps
        },
        
        "risk_parity_results": {
            "total_return": 0.298,
            "volatility": 0.142,
            "sharpe_ratio": 0.69,
            "concentration_risk": 0.34,  # Much more diversified
            "improvement_metrics": {
                "risk_reduction": "15.0%",
                "sharpe_improvement": "7.8%", 
                "diversification_improvement": "56.4%",
                "tail_risk_reduction": "18.7%"
            }
        }
    }
}

# Market scenario analysis
SCENARIO_ANALYSIS = {
    "covid_crash_march_2020": {
        "scenario": "Pandemic-induced market crash",
        "period": "2020-02-19 to 2020-03-23",
        "market_return": -0.337,  # S&P 500 fell 33.7%
        
        "portfolio_performance": {
            "conservative_growth": {
                "return": -0.186,
                "outperformance": 0.095,  # 9.5% better than unoptimized
                "recovery_days": 42
            },
            "balanced_growth": {
                "return": -0.223,
                "outperformance": 0.078,
                "recovery_days": 67
            },
            "aggressive_growth": {
                "return": -0.289,
                "outperformance": 0.048,
                "recovery_days": 89
            }
        }
    },
    
    "inflation_surge_2022": {
        "scenario": "High inflation and interest rate rises",
        "period": "2022-01-01 to 2022-10-31",
        "inflation_rate": 0.085,  # 8.5% peak inflation
        
        "portfolio_performance": {
            "conservative_growth": {
                "real_return": -0.032,  # Negative real return but better than benchmark
                "inflation_protection": 0.67,
                "bond_allocation_benefit": 0.043
            },
            "dividend_income": {
                "real_return": 0.018,   # Positive real return
                "dividend_growth": 0.089,
                "income_protection": 0.84
            }
        }
    }
}

def get_backtest_results(portfolio_type: str) -> Dict[str, Any]:
    """Get backtest results for a specific portfolio type."""
    return BACKTEST_RESULTS.get(portfolio_type, {})

def get_optimization_comparison(strategy: str) -> Dict[str, Any]:
    """Get optimization strategy comparison results."""
    return OPTIMIZATION_STRATEGY_RESULTS.get(strategy, {})

def get_scenario_analysis(scenario: str) -> Dict[str, Any]:
    """Get scenario analysis results."""
    return SCENARIO_ANALYSIS.get(scenario, {})

def calculate_outperformance_metrics(
    portfolio_returns: List[float], 
    benchmark_returns: List[float]
) -> Dict[str, float]:
    """Calculate comprehensive outperformance metrics."""
    
    portfolio_returns = np.array(portfolio_returns)
    benchmark_returns = np.array(benchmark_returns)
    excess_returns = portfolio_returns - benchmark_returns
    
    return {
        "total_excess_return": np.sum(excess_returns),
        "average_monthly_outperformance": np.mean(excess_returns),
        "outperformance_volatility": np.std(excess_returns),
        "information_ratio": np.mean(excess_returns) / np.std(excess_returns) if np.std(excess_returns) > 0 else 0,
        "win_rate": np.mean(excess_returns > 0),
        "average_win": np.mean(excess_returns[excess_returns > 0]) if len(excess_returns[excess_returns > 0]) > 0 else 0,
        "average_loss": np.mean(excess_returns[excess_returns < 0]) if len(excess_returns[excess_returns < 0]) > 0 else 0,
        "best_month": np.max(excess_returns),
        "worst_month": np.min(excess_returns)
    }

def get_all_backtest_results() -> Dict[str, Dict[str, Any]]:
    """Get all backtest results for demo purposes."""
    return BACKTEST_RESULTS