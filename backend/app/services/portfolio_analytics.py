"""
Portfolio Analytics and Optimization Integration

This module provides a high-level interface for portfolio optimization,
combining various strategies with practical considerations like transaction
costs, rebalancing, and regime detection.
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional, Union
from datetime import datetime, timedelta
from .advanced_optimization import AdvancedPortfolioOptimizer
import warnings


class PortfolioAnalytics:
    """
    Comprehensive portfolio analytics system that integrates optimization
    strategies with practical portfolio management considerations.
    """
    
    def __init__(self, 
                 prices: pd.DataFrame,
                 benchmark: Optional[pd.Series] = None,
                 transaction_cost: float = 0.001):
        """
        Initialize portfolio analytics.
        
        Args:
            prices: DataFrame of asset prices (not returns)
            benchmark: Optional benchmark price series
            transaction_cost: Cost per transaction as fraction (default 0.1%)
        """
        self.prices = prices
        self.returns = prices.pct_change().dropna()
        self.benchmark = benchmark
        self.transaction_cost = transaction_cost
        
        # Initialize optimizer
        self.optimizer = AdvancedPortfolioOptimizer(self.returns)
        
    def optimize_portfolio(self,
                          method: str = 'mean_variance',
                          constraints: Optional[Dict] = None,
                          views: Optional[Dict] = None,
                          market_caps: Optional[Dict] = None,
                          **kwargs) -> Dict:
        """
        Main interface for portfolio optimization with multiple strategies.
        
        Args:
            method: Optimization method ('mean_variance', 'black_litterman', 
                   'risk_parity', 'hierarchical_risk_parity')
            constraints: Position constraints
            views: Market views for Black-Litterman
            market_caps: Market capitalizations for Black-Litterman
            **kwargs: Additional method-specific parameters
            
        Returns:
            Optimization results with weights and analytics
        """
        # Select optimization method
        if method == 'mean_variance':
            result = self.optimizer.mean_variance_optimization(
                constraints=constraints, **kwargs)
                
        elif method == 'black_litterman':
            if not market_caps or not views:
                raise ValueError("Black-Litterman requires market_caps and views")
            
            view_confidences = kwargs.get('view_confidences', 
                                        {asset: 0.5 for asset in views})
            result = self.optimizer.black_litterman(
                market_caps, views, view_confidences, 
                tau=kwargs.get('tau', 0.025))
                
        elif method == 'risk_parity':
            result = self.optimizer.risk_parity()
            
        elif method == 'hierarchical_risk_parity':
            result = self.optimizer.hierarchical_risk_parity()
            
        else:
            raise ValueError(f"Unknown optimization method: {method}")
        
        # Add risk metrics
        result['risk_metrics'] = self.optimizer.calculate_risk_metrics(result['weights'])
        
        # Add regime analysis
        result['regime_analysis'] = self.detect_market_regime()
        
        # Add rebalancing analysis
        if 'current_weights' in kwargs:
            result['rebalancing'] = self.analyze_rebalancing(
                kwargs['current_weights'], result['weights'])
        
        return result
    
    def detect_market_regime(self, lookback_days: int = 252) -> Dict:
        """
        Detect current market regime using statistical methods.
        
        Market regimes help adjust strategy:
        - Bull market: Higher risk tolerance
        - Bear market: Focus on capital preservation
        - High volatility: Reduce leverage, increase diversification
        
        Returns:
            Dict with regime classification and recommendations
        """
        if len(self.returns) < lookback_days:
            return {"regime": "insufficient_data", "confidence": 0}
        
        recent_returns = self.returns.iloc[-lookback_days:]
        
        # Calculate regime indicators
        # 1. Trend: Average return
        avg_return = recent_returns.mean().mean() * 252
        
        # 2. Volatility regime
        recent_vol = recent_returns.std().mean() * np.sqrt(252)
        long_vol = self.returns.std().mean() * np.sqrt(252)
        vol_ratio = recent_vol / long_vol
        
        # 3. Correlation regime
        recent_corr = recent_returns.corr().values
        avg_corr = recent_corr[np.triu_indices_from(recent_corr, k=1)].mean()
        
        # 4. Drawdown analysis
        cumulative = (1 + recent_returns.mean(axis=1)).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        current_drawdown = drawdown.iloc[-1]
        
        # Classify regime
        if avg_return > 0.10 and vol_ratio < 1.2:
            regime = "bull_market"
            confidence = min(avg_return / 0.10, 1.0) * 0.8
            recommendation = "Consider higher equity allocation and growth assets"
            
        elif avg_return < -0.10 or current_drawdown < -0.15:
            regime = "bear_market"
            confidence = min(abs(avg_return) / 0.10, 1.0) * 0.8
            recommendation = "Focus on capital preservation and defensive assets"
            
        elif vol_ratio > 1.5:
            regime = "high_volatility"
            confidence = min(vol_ratio / 1.5, 1.0) * 0.8
            recommendation = "Increase diversification and reduce position sizes"
            
        elif avg_corr > 0.7:
            regime = "high_correlation"
            confidence = avg_corr
            recommendation = "Seek uncorrelated assets and alternative strategies"
            
        else:
            regime = "normal"
            confidence = 0.6
            recommendation = "Maintain strategic allocation with regular rebalancing"
        
        return {
            'regime': regime,
            'confidence': confidence,
            'indicators': {
                'annual_return': avg_return,
                'volatility_ratio': vol_ratio,
                'average_correlation': avg_corr,
                'current_drawdown': current_drawdown
            },
            'recommendation': recommendation
        }
    
    def analyze_rebalancing(self,
                           current_weights: Dict[str, float],
                           target_weights: Dict[str, float],
                           threshold: float = 0.05) -> Dict:
        """
        Analyze rebalancing requirements and costs.
        
        Args:
            current_weights: Current portfolio weights
            target_weights: Target portfolio weights
            threshold: Minimum weight change to trigger rebalance
            
        Returns:
            Dict with rebalancing analysis
        """
        trades = {}
        total_turnover = 0
        
        all_assets = set(current_weights.keys()) | set(target_weights.keys())
        
        for asset in all_assets:
            current = current_weights.get(asset, 0)
            target = target_weights.get(asset, 0)
            change = target - current
            
            if abs(change) > threshold:
                trades[asset] = {
                    'current_weight': current,
                    'target_weight': target,
                    'change': change,
                    'action': 'BUY' if change > 0 else 'SELL'
                }
                total_turnover += abs(change)
        
        # Calculate costs
        estimated_cost = total_turnover * self.transaction_cost
        
        # Prioritize trades
        priority_trades = sorted(trades.items(), 
                               key=lambda x: abs(x[1]['change']), 
                               reverse=True)[:5]
        
        return {
            'required_trades': trades,
            'priority_trades': dict(priority_trades),
            'total_turnover': total_turnover,
            'estimated_cost': estimated_cost,
            'cost_as_percent': estimated_cost * 100,
            'recommendation': self._rebalancing_recommendation(total_turnover, 
                                                              estimated_cost)
        }
    
    def backtest_strategy(self,
                         strategy: str = 'mean_variance',
                         rebalance_frequency: str = 'monthly',
                         lookback_window: int = 252,
                         start_date: Optional[str] = None) -> Dict:
        """
        Backtest optimization strategy with realistic constraints.
        
        Args:
            strategy: Optimization strategy to test
            rebalance_frequency: 'daily', 'weekly', 'monthly', 'quarterly'
            lookback_window: Days of history for each optimization
            start_date: Backtest start date
            
        Returns:
            Dict with backtest results and performance metrics
        """
        # Set rebalance frequency
        freq_map = {
            'daily': 1,
            'weekly': 5,
            'monthly': 21,
            'quarterly': 63
        }
        rebalance_days = freq_map.get(rebalance_frequency, 21)
        
        # Initialize backtest
        results = []
        weights_history = []
        
        # Start after lookback window
        start_idx = max(lookback_window, 
                       self.returns.index.get_loc(pd.to_datetime(start_date)) 
                       if start_date else lookback_window)
        
        # Run backtest
        for i in range(start_idx, len(self.returns), rebalance_days):
            # Get historical data
            hist_returns = self.returns.iloc[i-lookback_window:i]
            
            # Skip if insufficient data
            if len(hist_returns) < lookback_window * 0.8:
                continue
            
            # Create optimizer with historical data
            temp_optimizer = AdvancedPortfolioOptimizer(hist_returns)
            
            # Optimize
            try:
                if strategy == 'mean_variance':
                    opt_result = temp_optimizer.mean_variance_optimization()
                elif strategy == 'risk_parity':
                    opt_result = temp_optimizer.risk_parity()
                elif strategy == 'hierarchical_risk_parity':
                    opt_result = temp_optimizer.hierarchical_risk_parity()
                else:
                    continue
                    
                weights = opt_result['weights']
                weights_history.append({
                    'date': self.returns.index[i],
                    'weights': weights
                })
                
            except Exception as e:
                warnings.warn(f"Optimization failed at {self.returns.index[i]}: {e}")
                continue
            
            # Calculate returns until next rebalance
            end_idx = min(i + rebalance_days, len(self.returns))
            period_returns = self.returns.iloc[i:end_idx]
            
            # Portfolio returns
            weights_array = np.array([weights.get(asset, 0) 
                                    for asset in self.returns.columns])
            portfolio_returns = period_returns @ weights_array
            
            # Account for transaction costs
            if i > start_idx:
                # Calculate turnover from previous weights
                prev_weights = weights_history[-2]['weights'] if len(weights_history) > 1 else {}
                turnover = sum(abs(weights.get(asset, 0) - prev_weights.get(asset, 0)) 
                             for asset in set(weights.keys()) | set(prev_weights.keys()))
                portfolio_returns.iloc[0] -= turnover * self.transaction_cost
            
            results.extend(portfolio_returns.tolist())
        
        # Convert to series
        backtest_returns = pd.Series(results, 
                                   index=self.returns.index[start_idx:start_idx+len(results)])
        
        # Calculate performance metrics
        total_return = (1 + backtest_returns).prod() - 1
        annual_return = (1 + total_return) ** (252 / len(backtest_returns)) - 1
        annual_vol = backtest_returns.std() * np.sqrt(252)
        sharpe = (annual_return - 0.02) / annual_vol if annual_vol > 0 else 0
        
        # Maximum drawdown
        cumulative = (1 + backtest_returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min()
        
        # Compare to benchmark
        benchmark_comparison = {}
        if self.benchmark is not None:
            bench_returns = self.benchmark.pct_change().dropna()
            bench_returns = bench_returns[backtest_returns.index]
            bench_total = (1 + bench_returns).prod() - 1
            benchmark_comparison = {
                'benchmark_return': bench_total,
                'excess_return': total_return - bench_total,
                'information_ratio': ((backtest_returns - bench_returns).mean() / 
                                    (backtest_returns - bench_returns).std() * np.sqrt(252))
            }
        
        return {
            'total_return': total_return,
            'annual_return': annual_return,
            'annual_volatility': annual_vol,
            'sharpe_ratio': sharpe,
            'max_drawdown': max_drawdown,
            'win_rate': (backtest_returns > 0).mean(),
            'best_day': backtest_returns.max(),
            'worst_day': backtest_returns.min(),
            'benchmark_comparison': benchmark_comparison,
            'weights_history': weights_history[-10:],  # Last 10 rebalances
            'summary': self._summarize_backtest(annual_return, sharpe, max_drawdown)
        }
    
    def stress_test_portfolio(self,
                            weights: Dict[str, float],
                            scenarios: Optional[List[Dict]] = None) -> Dict:
        """
        Stress test portfolio under various market scenarios.
        
        Args:
            weights: Portfolio weights
            scenarios: Custom stress scenarios
            
        Returns:
            Dict with stress test results
        """
        if scenarios is None:
            # Default stress scenarios
            scenarios = [
                {
                    'name': '2008 Financial Crisis',
                    'market_return': -0.37,
                    'volatility_mult': 2.5,
                    'correlation_add': 0.3
                },
                {
                    'name': 'COVID-19 Crash',
                    'market_return': -0.20,
                    'volatility_mult': 3.0,
                    'correlation_add': 0.4
                },
                {
                    'name': 'Dot-Com Bust',
                    'market_return': -0.25,
                    'volatility_mult': 1.8,
                    'correlation_add': 0.2
                },
                {
                    'name': 'Inflation Shock',
                    'market_return': -0.15,
                    'volatility_mult': 1.5,
                    'correlation_add': 0.1
                }
            ]
        
        results = {}
        
        for scenario in scenarios:
            # Adjust covariance matrix for stress scenario
            stressed_cov = self.optimizer.cov_matrix.copy()
            
            # Increase volatility
            stressed_cov *= scenario['volatility_mult'] ** 2
            
            # Increase correlation
            corr = self.optimizer.corr_matrix.copy()
            corr[corr < 1] += scenario['correlation_add']
            corr = np.clip(corr, -1, 1)
            
            # Rebuild covariance from stressed correlation
            stds = np.sqrt(np.diag(stressed_cov))
            stressed_cov = np.outer(stds, stds) * corr
            
            # Calculate portfolio impact
            w = np.array([weights.get(asset, 0) for asset in self.optimizer.assets])
            
            stressed_vol = np.sqrt(np.dot(w, np.dot(stressed_cov, w)))
            base_vol = np.sqrt(np.dot(w, np.dot(self.optimizer.cov_matrix, w)))
            
            # Estimate losses
            expected_loss = scenario['market_return'] * np.sum(w)
            vol_loss = -2 * stressed_vol  # 2-sigma event
            total_loss = expected_loss + vol_loss
            
            results[scenario['name']] = {
                'expected_loss': expected_loss,
                'volatility_increase': (stressed_vol / base_vol - 1),
                'worst_case_loss': total_loss,
                'survival_probability': norm.cdf(-total_loss / stressed_vol)
            }
        
        # Overall assessment
        avg_loss = np.mean([r['worst_case_loss'] for r in results.values()])
        worst_loss = min([r['worst_case_loss'] for r in results.values()])
        
        return {
            'scenario_results': results,
            'average_stress_loss': avg_loss,
            'worst_scenario_loss': worst_loss,
            'stress_test_summary': self._summarize_stress_test(avg_loss, worst_loss),
            'recommendations': self._stress_test_recommendations(worst_loss)
        }
    
    def _rebalancing_recommendation(self, turnover: float, cost: float) -> str:
        """Generate rebalancing recommendation."""
        if turnover < 0.10:
            return "Minor rebalancing needed. Consider waiting to reduce costs."
        elif turnover < 0.30:
            return f"Moderate rebalancing. Cost of {cost*100:.2f}% is reasonable."
        else:
            return f"Major rebalancing required. Consider phasing trades to reduce {cost*100:.2f}% cost."
    
    def _summarize_backtest(self, annual_return: float, sharpe: float, 
                           max_dd: float) -> str:
        """Summarize backtest results."""
        return f"""
Backtest Performance Summary:
- Annual Return: {annual_return*100:.1f}%
- Sharpe Ratio: {sharpe:.2f}
- Maximum Drawdown: {max_dd*100:.1f}%

{'✅ Strong historical performance' if sharpe > 1.0 else '⚠️ Moderate historical performance'}
{'✅ Acceptable drawdown' if max_dd > -0.25 else '⚠️ Significant drawdown risk'}
"""
    
    def _summarize_stress_test(self, avg_loss: float, worst_loss: float) -> str:
        """Summarize stress test results."""
        return f"""
Stress Test Summary:
- Average scenario loss: {avg_loss*100:.1f}%
- Worst scenario loss: {worst_loss*100:.1f}%

The portfolio {'appears resilient' if worst_loss > -0.30 else 'shows significant risk'} 
under extreme market conditions.
"""
    
    def _stress_test_recommendations(self, worst_loss: float) -> List[str]:
        """Generate recommendations based on stress test."""
        recommendations = []
        
        if worst_loss < -0.40:
            recommendations.append("Consider reducing overall portfolio risk")
            recommendations.append("Add defensive assets or hedging strategies")
        elif worst_loss < -0.25:
            recommendations.append("Portfolio shows moderate stress vulnerability")
            recommendations.append("Consider modest risk reduction")
        else:
            recommendations.append("Portfolio shows good stress resilience")
            recommendations.append("Current risk level appears appropriate")
        
        return recommendations