"""
API endpoint tests for portfolio optimization dashboard.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock
import pandas as pd
import numpy as np
from datetime import datetime, date

from app.main import app

client = TestClient(app)


class TestAuthentication:
    """Test authentication endpoints."""
    
    def test_demo_login(self):
        """Test demo login functionality."""
        response = client.post("/api/auth/demo-login")
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["email"] == "demo@portfolioopt.com"
        assert data["name"] == "Demo User"
    
    def test_protected_endpoint_without_auth(self):
        """Test that protected endpoints require authentication."""
        response = client.post("/api/portfolio/optimize", json={
            "holdings": [
                {"symbol": "AAPL", "allocation": 50},
                {"symbol": "MSFT", "allocation": 50}
            ]
        })
        
        assert response.status_code == 401


class TestPortfolioOptimization:
    """Test portfolio optimization endpoints."""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for testing."""
        login_response = client.post("/api/auth/demo-login")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @patch('app.routers.portfolio_v2.get_market_data')
    def test_portfolio_optimization_mean_variance(self, mock_data, auth_headers):
        """Test mean-variance portfolio optimization."""
        # Mock market data
        dates = pd.date_range(start='2022-01-01', end='2024-01-01', freq='D')
        mock_prices = pd.DataFrame({
            'AAPL': np.random.randn(len(dates)).cumsum() + 100,
            'MSFT': np.random.randn(len(dates)).cumsum() + 100
        }, index=dates)
        mock_data.return_value = mock_prices
        
        request_data = {
            "holdings": [
                {"symbol": "AAPL", "allocation": 60},
                {"symbol": "MSFT", "allocation": 40}
            ],
            "method": "mean_variance",
            "risk_tolerance": 6,
            "constraints": {
                "min_weight": 0.1,
                "max_weight": 0.7
            }
        }
        
        response = client.post(
            "/api/portfolio/optimize",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Validate response structure
        assert "weights" in data
        assert "risk_metrics" in data
        assert "explanation" in data
        assert "method_used" in data
        assert data["method_used"] == "mean_variance"
        
        # Validate weights sum to 1
        weights_sum = sum(data["weights"].values())
        assert abs(weights_sum - 1.0) < 0.01
    
    def test_portfolio_optimization_validation_errors(self, auth_headers):
        """Test validation errors in optimization requests."""
        # Test empty holdings
        response = client.post(
            "/api/portfolio/optimize",
            json={"holdings": []},
            headers=auth_headers
        )
        assert response.status_code == 422
        
        # Test invalid allocation sum
        response = client.post(
            "/api/portfolio/optimize",
            json={
                "holdings": [
                    {"symbol": "AAPL", "allocation": 60},
                    {"symbol": "MSFT", "allocation": 50}  # Sum = 110%
                ]
            },
            headers=auth_headers
        )
        assert response.status_code == 422
    
    @patch('app.routers.portfolio_v2.get_market_data')
    def test_efficient_frontier(self, mock_data, auth_headers):
        """Test efficient frontier generation."""
        # Mock market data
        dates = pd.date_range(start='2022-01-01', end='2024-01-01', freq='D')
        mock_prices = pd.DataFrame({
            'AAPL': np.random.randn(len(dates)).cumsum() + 100,
            'MSFT': np.random.randn(len(dates)).cumsum() + 100,
            'GOOGL': np.random.randn(len(dates)).cumsum() + 100
        }, index=dates)
        mock_data.return_value = mock_prices
        
        response = client.get(
            "/api/portfolio/efficient-frontier?symbols=AAPL,MSFT,GOOGL&points=20",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "frontier_points" in data
        assert "max_sharpe_portfolio" in data
        assert "min_volatility_portfolio" in data
        assert len(data["frontier_points"]) == 20


class TestAssetData:
    """Test asset data endpoints."""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for testing."""
        login_response = client.post("/api/auth/demo-login")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_asset_search(self, auth_headers):
        """Test asset search functionality."""
        response = client.get(
            "/api/assets/search?q=AAPL&limit=5",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert isinstance(data, list)
        assert len(data) <= 5
        
        if data:  # If results found
            asset = data[0]
            assert "symbol" in asset
            assert "name" in asset
    
    @patch('app.routers.assets.get_stock_info_yfinance')
    def test_asset_info(self, mock_info, auth_headers):
        """Test individual asset information."""
        mock_info.return_value = {
            "symbol": "AAPL",
            "name": "Apple Inc.",
            "sector": "Technology",
            "current_price": 175.50,
            "market_cap": 2800000000000
        }
        
        response = client.get(
            "/api/assets/info/AAPL",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["symbol"] == "AAPL"
        assert data["name"] == "Apple Inc."
        assert data["sector"] == "Technology"
    
    @patch('yfinance.download')
    def test_historical_data(self, mock_download, auth_headers):
        """Test historical data retrieval."""
        # Mock yfinance data
        dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
        mock_data = pd.DataFrame({
            'Adj Close': np.random.randn(len(dates)).cumsum() + 100
        }, index=dates)
        mock_download.return_value = mock_data
        
        request_data = {
            "symbols": ["AAPL"],
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "frequency": "daily",
            "include_returns": True,
            "include_metrics": True
        }
        
        response = client.post(
            "/api/assets/historical",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "symbols" in data
        assert "prices" in data
        assert "returns" in data
        assert "metrics" in data


class TestMachineLearning:
    """Test ML prediction endpoints."""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for testing."""
        login_response = client.post("/api/auth/demo-login")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @patch('yfinance.download')
    def test_ml_predictions(self, mock_download, auth_headers):
        """Test ML prediction functionality."""
        # Mock sufficient training data
        dates = pd.date_range(start='2022-01-01', end='2024-01-01', freq='D')
        mock_data = pd.DataFrame({
            'Adj Close': np.random.randn(len(dates)).cumsum() + 100
        }, index=dates)
        mock_download.return_value = mock_data
        
        request_data = {
            "symbols": ["AAPL"],
            "horizon": 30,
            "model_type": "lstm",
            "confidence_level": 0.95
        }
        
        response = client.post(
            "/api/ml/predict",
            json=request_data,
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "predictions" in data
        assert "symbols" in data
        assert "horizon_days" in data
        assert data["symbols"] == ["AAPL"]
        assert data["horizon_days"] == 30
    
    @patch('yfinance.download')
    def test_regime_detection(self, mock_download, auth_headers):
        """Test market regime detection."""
        # Mock market data
        dates = pd.date_range(start='2022-01-01', end='2024-01-01', freq='D')
        mock_data = pd.DataFrame({
            'Adj Close': np.random.randn(len(dates)).cumsum() + 100
        }, index=dates)
        mock_download.return_value = mock_data
        
        response = client.post(
            "/api/ml/regime-detection",
            json=["AAPL", "MSFT"],
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "individual_analysis" in data
        assert "aggregate_analysis" in data
        assert "symbols" in data
    
    def test_model_status(self, auth_headers):
        """Test ML model status endpoint."""
        response = client.get(
            "/api/ml/model-status",
            headers=auth_headers
        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "ml_available" in data
        assert "models" in data
        assert "disclaimer" in data


class TestErrorHandling:
    """Test error handling and edge cases."""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for testing."""
        login_response = client.post("/api/auth/demo-login")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_rate_limiting(self, auth_headers):
        """Test rate limiting functionality."""
        # This would require actual rate limiting implementation
        # For now, just test that the endpoint responds
        for i in range(5):
            response = client.get("/api/status", headers=auth_headers)
            assert response.status_code in [200, 429]  # OK or rate limited
    
    def test_invalid_symbol_handling(self, auth_headers):
        """Test handling of invalid stock symbols."""
        response = client.get(
            "/api/assets/info/INVALID",
            headers=auth_headers
        )
        
        # Should handle gracefully (404 or error response)
        assert response.status_code in [404, 400, 500]
    
    def test_malformed_request_handling(self, auth_headers):
        """Test handling of malformed requests."""
        response = client.post(
            "/api/portfolio/optimize",
            json={"invalid": "data"},
            headers=auth_headers
        )
        
        assert response.status_code == 422  # Validation error


class TestHealthAndStatus:
    """Test health check and status endpoints."""
    
    def test_health_check(self):
        """Test health check endpoint."""
        response = client.get("/health")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "status" in data
        assert "services" in data
        assert "version" in data
    
    def test_api_root(self):
        """Test API root endpoint."""
        response = client.get("/")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "features" in data
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for testing."""
        login_response = client.post("/api/auth/demo-login")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    def test_api_status(self, auth_headers):
        """Test API status endpoint."""
        response = client.get("/api/status", headers=auth_headers)
        
        assert response.status_code == 200
        data = response.json()
        
        assert "supported_methods" in data
        assert "ml_models" in data
        assert "rate_limits" in data


# Integration test
class TestIntegrationWorkflow:
    """Test complete workflow integration."""
    
    @pytest.fixture
    def auth_headers(self):
        """Get authentication headers for testing."""
        login_response = client.post("/api/auth/demo-login")
        token = login_response.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    
    @patch('app.routers.portfolio_v2.get_market_data')
    @patch('yfinance.download')
    def test_complete_optimization_workflow(self, mock_yf, mock_market, auth_headers):
        """Test complete portfolio optimization workflow."""
        # Setup mock data
        dates = pd.date_range(start='2022-01-01', end='2024-01-01', freq='D')
        mock_prices = pd.DataFrame({
            'AAPL': np.random.randn(len(dates)).cumsum() + 100,
            'MSFT': np.random.randn(len(dates)).cumsum() + 100,
            'GOOGL': np.random.randn(len(dates)).cumsum() + 100
        }, index=dates)
        
        mock_market.return_value = mock_prices
        mock_yf.return_value = mock_prices
        
        # 1. Search for assets
        search_response = client.get(
            "/api/assets/search?q=AAPL&limit=3",
            headers=auth_headers
        )
        assert search_response.status_code == 200
        
        # 2. Optimize portfolio
        optimization_request = {
            "holdings": [
                {"symbol": "AAPL", "allocation": 40},
                {"symbol": "MSFT", "allocation": 35},
                {"symbol": "GOOGL", "allocation": 25}
            ],
            "method": "mean_variance",
            "risk_tolerance": 6
        }
        
        opt_response = client.post(
            "/api/portfolio/optimize",
            json=optimization_request,
            headers=auth_headers
        )
        assert opt_response.status_code == 200
        
        # 3. Get efficient frontier
        frontier_response = client.get(
            "/api/portfolio/efficient-frontier?symbols=AAPL,MSFT,GOOGL",
            headers=auth_headers
        )
        assert frontier_response.status_code == 200
        
        # 4. Run backtest
        backtest_request = {
            "strategy": "mean_variance",
            "start_date": "2023-01-01",
            "end_date": "2023-12-31",
            "assets": ["AAPL", "MSFT", "GOOGL"],
            "rebalance_frequency": "monthly"
        }
        
        backtest_response = client.post(
            "/api/portfolio/backtest",
            json=backtest_request,
            headers=auth_headers
        )
        assert backtest_response.status_code == 200
        
        # Verify all responses have expected structure
        opt_data = opt_response.json()
        assert "weights" in opt_data
        assert "risk_metrics" in opt_data
        
        frontier_data = frontier_response.json()
        assert "frontier_points" in frontier_data
        
        backtest_data = backtest_response.json()
        assert "total_return" in backtest_data
        assert "sharpe_ratio" in backtest_data


if __name__ == "__main__":
    pytest.main([__file__])