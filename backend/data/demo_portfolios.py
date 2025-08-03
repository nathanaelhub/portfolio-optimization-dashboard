"""
Demo Portfolio Data for Portfolio Optimization Dashboard

This module contains pre-configured sample portfolios designed to showcase
different investment strategies and risk profiles. Each portfolio includes
realistic holdings, historical performance data, and optimization results.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any
import numpy as np

# Sample portfolio configurations with realistic allocations
DEMO_PORTFOLIOS = {
    "conservative_growth": {
        "name": "Conservative Growth Portfolio",
        "description": "Low-risk balanced approach with 40% stocks, 50% bonds, and 10% alternatives. Ideal for risk-averse investors seeking steady returns with capital preservation.",
        "risk_profile": "conservative",
        "target_return": 0.06,
        "target_volatility": 0.08,
        "time_horizon": "5-10 years",
        "investment_amount": 100000.00,
        "currency": "USD",
        "benchmark": "60/40 Stock/Bond Portfolio",
        "holdings": [
            {
                "symbol": "VTI",
                "name": "Vanguard Total Stock Market ETF",
                "allocation": 0.25,
                "sector": "Broad Market",
                "asset_class": "Equity",
                "expense_ratio": 0.0003,
                "description": "Tracks the entire U.S. stock market"
            },
            {
                "symbol": "VXUS",
                "name": "Vanguard Total International Stock ETF", 
                "allocation": 0.15,
                "sector": "International",
                "asset_class": "Equity",
                "expense_ratio": 0.0008,
                "description": "Provides exposure to developed and emerging international markets"
            },
            {
                "symbol": "BND",
                "name": "Vanguard Total Bond Market ETF",
                "allocation": 0.35,
                "sector": "Fixed Income",
                "asset_class": "Bond",
                "expense_ratio": 0.0003,
                "description": "Broad exposure to U.S. investment-grade bonds"
            },
            {
                "symbol": "BNDX",
                "name": "Vanguard Total International Bond ETF",
                "allocation": 0.15,
                "sector": "International Fixed Income",
                "asset_class": "Bond", 
                "expense_ratio": 0.0008,
                "description": "International government and corporate bonds"
            },
            {
                "symbol": "VNQ",
                "name": "Vanguard Real Estate ETF",
                "allocation": 0.10,
                "sector": "Real Estate",
                "asset_class": "REIT",
                "expense_ratio": 0.0012,
                "description": "Real Estate Investment Trusts for diversification"
            }
        ],
        "performance_history": {
            "1y_return": 0.058,
            "3y_return": 0.062,
            "5y_return": 0.067,
            "ytd_return": 0.045,
            "max_drawdown": -0.085,
            "volatility": 0.079,
            "sharpe_ratio": 0.65,
            "sortino_ratio": 0.89
        },
        "optimization_results": {
            "method": "markowitz",
            "objective": "min_volatility",
            "optimized_weights": {
                "VTI": 0.28,
                "VXUS": 0.12,
                "BND": 0.38,
                "BNDX": 0.17,
                "VNQ": 0.05
            },
            "expected_return": 0.064,
            "expected_volatility": 0.076,
            "optimized_sharpe": 0.71
        }
    },

    "balanced_growth": {
        "name": "Balanced Growth Portfolio",
        "description": "Moderate-risk portfolio with 70% stocks and 30% bonds. Balances growth potential with stability for long-term wealth building.",
        "risk_profile": "moderate",
        "target_return": 0.08,
        "target_volatility": 0.12,
        "time_horizon": "10+ years",
        "investment_amount": 150000.00,
        "currency": "USD",
        "benchmark": "S&P 500",
        "holdings": [
            {
                "symbol": "SPY",
                "name": "SPDR S&P 500 ETF Trust",
                "allocation": 0.30,
                "sector": "Large Cap",
                "asset_class": "Equity",
                "expense_ratio": 0.0945,
                "description": "Tracks the S&P 500 index"
            },
            {
                "symbol": "QQQ",
                "name": "Invesco QQQ Trust",
                "allocation": 0.20,
                "sector": "Technology",
                "asset_class": "Equity",
                "expense_ratio": 0.0020,
                "description": "Tracks the Nasdaq-100 index"
            },
            {
                "symbol": "VEA",
                "name": "Vanguard FTSE Developed Markets ETF",
                "allocation": 0.15,
                "sector": "International Developed",
                "asset_class": "Equity",
                "expense_ratio": 0.0005,
                "description": "Developed international market exposure"
            },
            {
                "symbol": "VWO",
                "name": "Vanguard FTSE Emerging Markets ETF",
                "allocation": 0.05,
                "sector": "Emerging Markets",
                "asset_class": "Equity",
                "expense_ratio": 0.0008,
                "description": "Emerging market equity exposure"
            },
            {
                "symbol": "AGG",
                "name": "iShares Core U.S. Aggregate Bond ETF",
                "allocation": 0.20,
                "sector": "Fixed Income",
                "asset_class": "Bond",
                "expense_ratio": 0.0003,
                "description": "U.S. investment-grade bond market"
            },
            {
                "symbol": "TIP",
                "name": "iShares TIPS Bond ETF",
                "allocation": 0.10,
                "sector": "Inflation Protected",
                "asset_class": "Bond",
                "expense_ratio": 0.0019,
                "description": "Treasury Inflation-Protected Securities"
            }
        ],
        "performance_history": {
            "1y_return": 0.095,
            "3y_return": 0.087,
            "5y_return": 0.092,
            "ytd_return": 0.078,
            "max_drawdown": -0.142,
            "volatility": 0.118,
            "sharpe_ratio": 0.68,
            "sortino_ratio": 0.94
        },
        "optimization_results": {
            "method": "black_litterman",
            "objective": "max_sharpe",
            "optimized_weights": {
                "SPY": 0.32,
                "QQQ": 0.18,
                "VEA": 0.16,
                "VWO": 0.04,
                "AGG": 0.22,
                "TIP": 0.08
            },
            "expected_return": 0.085,
            "expected_volatility": 0.115,
            "optimized_sharpe": 0.73
        }
    },

    "aggressive_growth": {
        "name": "Aggressive Growth Portfolio",
        "description": "High-growth portfolio with 90% stocks focused on technology and growth sectors. Designed for long-term investors with high risk tolerance.",
        "risk_profile": "aggressive",
        "target_return": 0.12,
        "target_volatility": 0.18,
        "time_horizon": "15+ years",
        "investment_amount": 200000.00,
        "currency": "USD",
        "benchmark": "NASDAQ Composite",
        "holdings": [
            {
                "symbol": "AAPL",
                "name": "Apple Inc.",
                "allocation": 0.15,
                "sector": "Technology",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Consumer electronics and software giant"
            },
            {
                "symbol": "MSFT", 
                "name": "Microsoft Corporation",
                "allocation": 0.15,
                "sector": "Technology",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Cloud computing and software leader"
            },
            {
                "symbol": "GOOGL",
                "name": "Alphabet Inc. Class A",
                "allocation": 0.12,
                "sector": "Technology",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Search engine and digital advertising"
            },
            {
                "symbol": "AMZN",
                "name": "Amazon.com Inc.",
                "allocation": 0.10,
                "sector": "Consumer Discretionary",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "E-commerce and cloud computing"
            },
            {
                "symbol": "TSLA",
                "name": "Tesla Inc.",
                "allocation": 0.08,
                "sector": "Consumer Discretionary",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Electric vehicles and clean energy"
            },
            {
                "symbol": "NVDA",
                "name": "NVIDIA Corporation",
                "allocation": 0.10,
                "sector": "Technology",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Graphics processing and AI chips"
            },
            {
                "symbol": "META",
                "name": "Meta Platforms Inc.",
                "allocation": 0.08,
                "sector": "Technology",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Social media and virtual reality"
            },
            {
                "symbol": "ARKK",
                "name": "ARK Innovation ETF",
                "allocation": 0.12,
                "sector": "Innovation",
                "asset_class": "Equity",
                "expense_ratio": 0.0075,
                "description": "Disruptive innovation companies"
            },
            {
                "symbol": "HYG",
                "name": "iShares iBoxx $ High Yield Corporate Bond ETF",
                "allocation": 0.10,
                "sector": "High Yield",
                "asset_class": "Bond",
                "expense_ratio": 0.0049,
                "description": "High-yield corporate bonds"
            }
        ],
        "performance_history": {
            "1y_return": 0.145,
            "3y_return": 0.128,
            "5y_return": 0.135,
            "ytd_return": 0.118,
            "max_drawdown": -0.235,
            "volatility": 0.182,
            "sharpe_ratio": 0.65,
            "sortino_ratio": 0.87
        },
        "optimization_results": {
            "method": "risk_parity",
            "objective": "max_diversification",
            "optimized_weights": {
                "AAPL": 0.14,
                "MSFT": 0.16,
                "GOOGL": 0.11,
                "AMZN": 0.09,
                "TSLA": 0.06,
                "NVDA": 0.08,
                "META": 0.07,
                "ARKK": 0.10,
                "HYG": 0.19
            },
            "expected_return": 0.125,
            "expected_volatility": 0.175,
            "optimized_sharpe": 0.71
        }
    },

    "dividend_income": {
        "name": "Dividend Income Portfolio",
        "description": "Income-focused portfolio emphasizing high-quality dividend-paying stocks and REITs. Designed for current income with modest growth potential.",
        "risk_profile": "conservative",
        "target_return": 0.055,
        "target_volatility": 0.10,
        "time_horizon": "5+ years",
        "investment_amount": 125000.00,
        "currency": "USD",
        "benchmark": "Dividend Aristocrats Index",
        "holdings": [
            {
                "symbol": "VYM",
                "name": "Vanguard High Dividend Yield ETF",
                "allocation": 0.25,
                "sector": "High Dividend",
                "asset_class": "Equity",
                "expense_ratio": 0.0006,
                "description": "High dividend yield U.S. stocks"
            },
            {
                "symbol": "SCHD",
                "name": "Schwab US Dividend Equity ETF",
                "allocation": 0.20,
                "sector": "Dividend Growth",
                "asset_class": "Equity",
                "expense_ratio": 0.0006,
                "description": "High-quality dividend growth stocks"
            },
            {
                "symbol": "JNJ",
                "name": "Johnson & Johnson",
                "allocation": 0.08,
                "sector": "Healthcare",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Dividend aristocrat healthcare company"
            },
            {
                "symbol": "PG",
                "name": "Procter & Gamble Co.",
                "allocation": 0.07,
                "sector": "Consumer Staples",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Consumer goods with consistent dividends"
            },
            {
                "symbol": "KO",
                "name": "The Coca-Cola Company",
                "allocation": 0.06,
                "sector": "Consumer Staples",
                "asset_class": "Equity",
                "expense_ratio": 0.0000,
                "description": "Beverage company with 50+ year dividend history"
            },
            {
                "symbol": "VNQ",
                "name": "Vanguard Real Estate ETF",
                "allocation": 0.15,
                "sector": "Real Estate",
                "asset_class": "REIT",
                "expense_ratio": 0.0012,
                "description": "Real estate investment trusts"
            },
            {
                "symbol": "VTEB",
                "name": "Vanguard Tax-Exempt Bond ETF",
                "allocation": 0.19,
                "sector": "Municipal Bonds",
                "asset_class": "Bond",
                "expense_ratio": 0.0005,
                "description": "Tax-exempt municipal bonds"
            }
        ],
        "performance_history": {
            "1y_return": 0.048,
            "3y_return": 0.052,
            "5y_return": 0.058,
            "ytd_return": 0.038,
            "max_drawdown": -0.095,
            "volatility": 0.098,
            "sharpe_ratio": 0.35,
            "sortino_ratio": 0.52,
            "dividend_yield": 0.042
        },
        "optimization_results": {
            "method": "dividend_optimization",
            "objective": "max_yield_quality",
            "optimized_weights": {
                "VYM": 0.28,
                "SCHD": 0.22,
                "JNJ": 0.09,
                "PG": 0.08,
                "KO": 0.05,
                "VNQ": 0.18,
                "VTEB": 0.10
            },
            "expected_return": 0.057,
            "expected_volatility": 0.095,
            "optimized_yield": 0.045
        }
    },

    "esg_sustainable": {
        "name": "ESG Sustainable Portfolio",
        "description": "Environmental, Social, and Governance focused investments combining sustainable practices with competitive returns.",
        "risk_profile": "moderate",
        "target_return": 0.075,
        "target_volatility": 0.13,
        "time_horizon": "10+ years",
        "investment_amount": 175000.00,
        "currency": "USD",
        "benchmark": "MSCI KLD 400 Social Index",
        "holdings": [
            {
                "symbol": "ESGU",
                "name": "iShares MSCI USA ESG Select ETF",
                "allocation": 0.30,
                "sector": "ESG US Equity",
                "asset_class": "Equity",
                "expense_ratio": 0.0025,
                "description": "ESG-screened U.S. large-cap stocks"
            },
            {
                "symbol": "ESGD",
                "name": "iShares MSCI EAFE ESG Select ETF",
                "allocation": 0.20,
                "sector": "ESG International",
                "asset_class": "Equity",
                "expense_ratio": 0.0025,
                "description": "ESG-focused developed international markets"
            },
            {
                "symbol": "ICLN",
                "name": "iShares Global Clean Energy ETF",
                "allocation": 0.15,
                "sector": "Clean Energy",
                "asset_class": "Equity",
                "expense_ratio": 0.0042,
                "description": "Global clean energy companies"
            },
            {
                "symbol": "ESGE",
                "name": "iShares MSCI EM ESG Select ETF",
                "allocation": 0.10,
                "sector": "ESG Emerging Markets",
                "asset_class": "Equity",
                "expense_ratio": 0.0025,
                "description": "ESG-screened emerging market stocks"
            },
            {
                "symbol": "SUSL",
                "name": "iShares MSCI KLD 400 Social ETF",
                "allocation": 0.15,
                "sector": "Social Responsibility",
                "asset_class": "Equity",
                "expense_ratio": 0.0025,
                "description": "Socially responsible U.S. companies"
            },
            {
                "symbol": "EAGG",
                "name": "iShares ESG Aware USD Corporate Bond ETF",
                "allocation": 0.10,
                "sector": "ESG Fixed Income",
                "asset_class": "Bond",
                "expense_ratio": 0.0012,
                "description": "ESG-aware corporate bonds"
            }
        ],
        "performance_history": {
            "1y_return": 0.082,
            "3y_return": 0.074,
            "5y_return": 0.079,
            "ytd_return": 0.065,
            "max_drawdown": -0.158,
            "volatility": 0.128,
            "sharpe_ratio": 0.55,
            "sortino_ratio": 0.78,
            "esg_score": 8.2
        },
        "optimization_results": {
            "method": "esg_optimization",
            "objective": "max_esg_score",
            "optimized_weights": {
                "ESGU": 0.32,
                "ESGD": 0.18,
                "ICLN": 0.12,
                "ESGE": 0.08,
                "SUSL": 0.18,
                "EAGG": 0.12
            },
            "expected_return": 0.077,
            "expected_volatility": 0.125,
            "optimized_esg_score": 8.5
        }
    }
}

# Optimization strategy demonstrations
OPTIMIZATION_STRATEGIES = {
    "markowitz_mean_variance": {
        "name": "Markowitz Mean-Variance Optimization",
        "description": "Classic portfolio optimization maximizing return per unit of risk",
        "mathematical_foundation": "Minimize portfolio variance subject to return constraints",
        "best_for": "Risk-conscious investors seeking efficient portfolios",
        "portfolio_used": "balanced_growth",
        "results": {
            "original_sharpe": 0.68,
            "optimized_sharpe": 0.73,
            "improvement": "7.4%",
            "risk_reduction": "2.5%",
            "turnover": 0.15
        }
    },
    
    "black_litterman": {
        "name": "Black-Litterman Model", 
        "description": "Incorporates market equilibrium and investor views for more stable portfolios",
        "mathematical_foundation": "Bayesian approach combining market priors with investor views",
        "best_for": "Professional managers with market views and forecasts",
        "portfolio_used": "conservative_growth",
        "results": {
            "original_sharpe": 0.65,
            "optimized_sharpe": 0.71,
            "improvement": "9.2%",
            "tracking_error": 0.023,
            "confidence_interval": "95%"
        }
    },
    
    "risk_parity": {
        "name": "Risk Parity Strategy",
        "description": "Equal risk contribution from each asset class for true diversification",
        "mathematical_foundation": "Optimize for equal marginal contribution to portfolio risk",
        "best_for": "Investors seeking balanced risk exposure across assets",
        "portfolio_used": "aggressive_growth",
        "results": {
            "original_risk_concentration": 0.75,
            "optimized_risk_concentration": 0.35,
            "diversification_improvement": "53%",
            "volatility_reduction": "3.8%",
            "tail_risk_improvement": "12%"
        }
    }
}

# Historical backtest data showing outperformance
BACKTEST_RESULTS = {
    "conservative_growth": {
        "period": "2019-01-01 to 2024-01-01",
        "benchmark": "60/40 Portfolio",
        "results": {
            "portfolio_return": 0.347,  # 34.7% total return
            "benchmark_return": 0.289,  # 28.9% total return
            "excess_return": 0.058,     # 5.8% outperformance
            "portfolio_volatility": 0.087,
            "benchmark_volatility": 0.095,
            "portfolio_sharpe": 0.68,
            "benchmark_sharpe": 0.55,
            "max_drawdown_portfolio": -0.089,
            "max_drawdown_benchmark": -0.112,
            "win_rate": 0.62,  # 62% of months outperformed
            "tracking_error": 0.034,
            "information_ratio": 1.71
        },
        "monthly_returns": [
            0.018, 0.032, -0.015, 0.024, 0.019, -0.008, 0.026, 0.014, -0.022, 0.031,
            0.009, 0.017, 0.023, -0.012, 0.028, 0.016, -0.019, 0.021, 0.013, 0.007,
            0.025, -0.016, 0.034, 0.011, 0.020, 0.008, -0.013, 0.027, 0.015, -0.025,
            0.029, 0.012, 0.018, -0.011, 0.022, 0.016, 0.008, 0.019, -0.014, 0.026,
            0.013, 0.021, 0.009, -0.018, 0.024, 0.017, 0.011, 0.019, -0.009, 0.023,
            0.014, 0.008, 0.027, -0.016, 0.020, 0.012, 0.025, 0.007, -0.021, 0.018
        ]
    },
    
    "balanced_growth": {
        "period": "2019-01-01 to 2024-01-01", 
        "benchmark": "S&P 500",
        "results": {
            "portfolio_return": 0.412,
            "benchmark_return": 0.396,
            "excess_return": 0.016,
            "portfolio_volatility": 0.145,
            "benchmark_volatility": 0.182,
            "portfolio_sharpe": 0.73,
            "benchmark_sharpe": 0.68,
            "max_drawdown_portfolio": -0.142,
            "max_drawdown_benchmark": -0.234,
            "win_rate": 0.58,
            "tracking_error": 0.089,
            "information_ratio": 0.18
        }
    },
    
    "aggressive_growth": {
        "period": "2019-01-01 to 2024-01-01",
        "benchmark": "NASDAQ Composite", 
        "results": {
            "portfolio_return": 0.523,
            "benchmark_return": 0.487,
            "excess_return": 0.036,
            "portfolio_volatility": 0.195,
            "benchmark_volatility": 0.238,
            "portfolio_sharpe": 0.71,
            "benchmark_sharpe": 0.62,
            "max_drawdown_portfolio": -0.235,
            "max_drawdown_benchmark": -0.287,
            "win_rate": 0.55,
            "tracking_error": 0.124,
            "information_ratio": 0.29
        }
    }
}

def get_demo_portfolio(portfolio_type: str) -> Dict[str, Any]:
    """Get demo portfolio data by type."""
    return DEMO_PORTFOLIOS.get(portfolio_type, {})

def get_all_demo_portfolios() -> Dict[str, Dict[str, Any]]:
    """Get all demo portfolio configurations."""
    return DEMO_PORTFOLIOS

def get_optimization_strategy(strategy: str) -> Dict[str, Any]:
    """Get optimization strategy demonstration."""
    return OPTIMIZATION_STRATEGIES.get(strategy, {})

def get_backtest_results(portfolio_type: str) -> Dict[str, Any]:
    """Get historical backtest results for a portfolio."""
    return BACKTEST_RESULTS.get(portfolio_type, {})

def calculate_portfolio_metrics(holdings: List[Dict], prices: Dict[str, float]) -> Dict[str, float]:
    """Calculate current portfolio metrics based on holdings and prices."""
    total_value = sum(holding["allocation"] * prices.get(holding["symbol"], 100) * 1000 
                     for holding in holdings)
    
    return {
        "total_value": total_value,
        "largest_position": max(holding["allocation"] for holding in holdings),
        "number_of_positions": len(holdings),
        "average_expense_ratio": np.mean([holding.get("expense_ratio", 0) for holding in holdings]),
        "diversification_score": 1 - sum(holding["allocation"]**2 for holding in holdings)
    }