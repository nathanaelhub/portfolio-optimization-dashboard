import numpy as np
import pandas as pd
from typing import List, Dict, Tuple, Optional
from pypfopt import EfficientFrontier, risk_models, expected_returns, objective_functions
from pypfopt.black_litterman import BlackLittermanModel
from pypfopt.risk_models import CovarianceShrinkage
import yfinance as yf
from datetime import datetime, timedelta

class PortfolioOptimizer:
    def __init__(self, symbols: List[str], period: str = "2y"):
        self.symbols = symbols
        self.period = period
        self.prices = None
        self.mu = None
        self.S = None
        
    def fetch_data(self) -> pd.DataFrame:
        """Fetch historical price data for given symbols"""
        try:
            data = yf.download(self.symbols, period=self.period, progress=False)['Adj Close']
            if isinstance(data, pd.Series):
                data = data.to_frame()
            
            # Remove any symbols with insufficient data
            data = data.dropna(axis=1, thresh=len(data) * 0.8)
            self.prices = data
            return data
        except Exception as e:
            raise ValueError(f"Error fetching data: {str(e)}")
    
    def calculate_returns_and_risk(self) -> Tuple[pd.Series, pd.DataFrame]:
        """Calculate expected returns and covariance matrix"""
        if self.prices is None:
            self.fetch_data()
            
        # Calculate expected returns using CAPM
        self.mu = expected_returns.capm_return(self.prices)
        
        # Calculate covariance matrix with shrinkage
        self.S = CovarianceShrinkage(self.prices).ledoit_wolf()
        
        return self.mu, self.S
    
    def optimize_max_sharpe(self, constraints: Optional[Dict] = None) -> Dict:
        """Optimize for maximum Sharpe ratio"""
        if self.mu is None or self.S is None:
            self.calculate_returns_and_risk()
            
        ef = EfficientFrontier(self.mu, self.S)
        
        # Add constraints if provided
        if constraints:
            for symbol, bounds in constraints.items():
                if symbol in self.mu.index:
                    ef.add_constraint(lambda w, s=symbol, b=bounds: w[self.mu.index.get_loc(s)] >= b[0])
                    ef.add_constraint(lambda w, s=symbol, b=bounds: w[self.mu.index.get_loc(s)] <= b[1])
        
        weights = ef.max_sharpe()
        cleaned_weights = ef.clean_weights()
        
        performance = ef.portfolio_performance(verbose=False)
        
        return {
            'weights': cleaned_weights,
            'expected_return': performance[0],
            'volatility': performance[1],
            'sharpe_ratio': performance[2]
        }
    
    def optimize_min_volatility(self, constraints: Optional[Dict] = None) -> Dict:
        """Optimize for minimum volatility"""
        if self.mu is None or self.S is None:
            self.calculate_returns_and_risk()
            
        ef = EfficientFrontier(self.mu, self.S)
        
        # Add constraints if provided
        if constraints:
            for symbol, bounds in constraints.items():
                if symbol in self.mu.index:
                    ef.add_constraint(lambda w, s=symbol, b=bounds: w[self.mu.index.get_loc(s)] >= b[0])
                    ef.add_constraint(lambda w, s=symbol, b=bounds: w[self.mu.index.get_loc(s)] <= b[1])
        
        weights = ef.min_volatility()
        cleaned_weights = ef.clean_weights()
        
        performance = ef.portfolio_performance(verbose=False)
        
        return {
            'weights': cleaned_weights,
            'expected_return': performance[0],
            'volatility': performance[1],
            'sharpe_ratio': performance[2]
        }
    
    def optimize_risk_parity(self) -> Dict:
        """Risk parity optimization - equal risk contribution"""
        if self.mu is None or self.S is None:
            self.calculate_returns_and_risk()
            
        ef = EfficientFrontier(self.mu, self.S)
        ef.add_objective(objective_functions.L2_reg, gamma=0.1)
        
        # Risk parity approximation
        weights = ef.min_volatility()
        
        # Calculate risk contributions
        portfolio_vol = np.sqrt(np.dot(weights, np.dot(self.S, weights)))
        marginal_contrib = np.dot(self.S, weights) / portfolio_vol
        contrib = np.multiply(marginal_contrib, weights)
        
        cleaned_weights = ef.clean_weights()
        performance = ef.portfolio_performance(verbose=False)
        
        return {
            'weights': cleaned_weights,
            'expected_return': performance[0],
            'volatility': performance[1],
            'sharpe_ratio': performance[2],
            'risk_contributions': dict(zip(self.symbols, contrib))
        }
    
    def black_litterman_optimization(self, 
                                   views: Dict[str, float], 
                                   view_confidences: Dict[str, float]) -> Dict:
        """Black-Litterman optimization with investor views"""
        if self.mu is None or self.S is None:
            self.calculate_returns_and_risk()
        
        # Market cap weights (simplified - equal weights as proxy)
        market_caps = {symbol: 1.0 for symbol in self.symbols}
        
        bl = BlackLittermanModel(
            self.S,
            pi="market",
            market_caps=market_caps,
            risk_aversion=1
        )
        
        # Add views
        viewdict = {}
        for symbol, view in views.items():
            if symbol in self.symbols:
                viewdict[symbol] = view
        
        if viewdict:
            omega = np.diag([1/view_confidences.get(symbol, 1.0) for symbol in viewdict.keys()])
            bl.add_absolute_views(viewdict, omega)
        
        # Get posterior estimates
        ret_bl = bl.bl_returns()
        S_bl = bl.bl_cov()
        
        # Optimize
        ef = EfficientFrontier(ret_bl, S_bl)
        weights = ef.max_sharpe()
        cleaned_weights = ef.clean_weights()
        
        performance = ef.portfolio_performance(verbose=False)
        
        return {
            'weights': cleaned_weights,
            'expected_return': performance[0],
            'volatility': performance[1],
            'sharpe_ratio': performance[2],
            'views_incorporated': viewdict
        }
    
    def generate_efficient_frontier(self, num_points: int = 50) -> List[Dict]:
        """Generate points along the efficient frontier"""
        if self.mu is None or self.S is None:
            self.calculate_returns_and_risk()
        
        # Get min and max return bounds
        ef_min = EfficientFrontier(self.mu, self.S)
        ef_min.min_volatility()
        min_ret = ef_min.portfolio_performance()[0]
        
        ef_max = EfficientFrontier(self.mu, self.S)
        ef_max.max_sharpe()
        max_ret = ef_max.portfolio_performance()[0]
        
        # Generate points along frontier
        ret_range = np.linspace(min_ret, max_ret, num_points)
        frontier_points = []
        
        for target_ret in ret_range:
            try:
                ef = EfficientFrontier(self.mu, self.S)
                ef.efficient_return(target_ret)
                performance = ef.portfolio_performance(verbose=False)
                
                frontier_points.append({
                    'expected_return': performance[0],
                    'volatility': performance[1],
                    'sharpe_ratio': performance[2]
                })
            except:
                continue
        
        return frontier_points
    
    def calculate_portfolio_metrics(self, weights: Dict[str, float]) -> Dict:
        """Calculate comprehensive portfolio metrics"""
        if self.mu is None or self.S is None:
            self.calculate_returns_and_risk()
        
        # Convert weights to array
        w = np.array([weights.get(symbol, 0.0) for symbol in self.mu.index])
        
        # Portfolio return and volatility
        portfolio_return = np.dot(w, self.mu)
        portfolio_vol = np.sqrt(np.dot(w, np.dot(self.S, w)))
        sharpe_ratio = portfolio_return / portfolio_vol if portfolio_vol > 0 else 0
        
        # Calculate downside metrics
        returns = self.prices.pct_change().dropna()
        portfolio_returns = returns.dot(w)
        
        # Sortino ratio (downside deviation)
        downside_returns = portfolio_returns[portfolio_returns < 0]
        downside_std = downside_returns.std() if len(downside_returns) > 0 else 0
        sortino_ratio = portfolio_return / downside_std if downside_std > 0 else 0
        
        # Value at Risk (95%)
        var_95 = np.percentile(portfolio_returns, 5) if len(portfolio_returns) > 0 else 0
        
        # Maximum Drawdown
        cumulative = (1 + portfolio_returns).cumprod()
        running_max = cumulative.expanding().max()
        drawdown = (cumulative - running_max) / running_max
        max_drawdown = drawdown.min() if len(drawdown) > 0 else 0
        
        return {
            'expected_return': float(portfolio_return),
            'volatility': float(portfolio_vol),
            'sharpe_ratio': float(sharpe_ratio),
            'sortino_ratio': float(sortino_ratio),
            'var_95': float(var_95),
            'max_drawdown': float(max_drawdown),
            'weights': weights
        }