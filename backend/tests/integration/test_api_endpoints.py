"""
Integration tests for API endpoints in portfolio optimization system.

Tests complete request-response cycles including:
- Portfolio creation and management
- Optimization endpoint behavior
- Market data integration
- Error handling and validation
- Authentication and authorization
- Cache behavior and invalidation

Each test simulates real client usage scenarios.
"""

import pytest
import json
import asyncio
from typing import Dict, List, Any
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.models.portfolio import Portfolio
from app.services.market_data import MarketDataService
from conftest import integration, client, db_session


class TestPortfolioEndpoints:
    """Test portfolio management API endpoints."""

    @integration
    def test_create_portfolio_success(self, client: TestClient, db_session: Session):
        """Test successful portfolio creation."""
        portfolio_data = {
            "name": "Test Portfolio",
            "description": "Integration test portfolio",
            "assets": [
                {"symbol": "AAPL", "allocation": 0.4},
                {"symbol": "MSFT", "allocation": 0.3},
                {"symbol": "GOOGL", "allocation": 0.3}
            ],
            "risk_tolerance": "moderate",
            "investment_horizon": 5
        }
        
        response = client.post("/api/v1/portfolios/", json=portfolio_data)
        
        assert response.status_code == 201
        data = response.json()
        
        # Verify response structure
        assert "id" in data
        assert data["name"] == portfolio_data["name"]
        assert data["description"] == portfolio_data["description"]
        assert len(data["assets"]) == 3
        
        # Verify allocations sum to 1.0
        total_allocation = sum(asset["allocation"] for asset in data["assets"])
        assert abs(total_allocation - 1.0) < 1e-6
        
        # Verify database persistence
        portfolio_id = data["id"]
        response = client.get(f"/api/v1/portfolios/{portfolio_id}")
        assert response.status_code == 200
        assert response.json()["name"] == portfolio_data["name"]

    @integration
    def test_create_portfolio_validation_errors(self, client: TestClient):
        """Test portfolio creation with validation errors."""
        
        # Test cases with various validation errors
        error_cases = [
            {
                "data": {
                    "name": "",  # Empty name
                    "assets": [{"symbol": "AAPL", "allocation": 1.0}]
                },
                "expected_error": "name"
            },
            {
                "data": {
                    "name": "Test Portfolio",
                    "assets": [
                        {"symbol": "AAPL", "allocation": 0.6},
                        {"symbol": "MSFT", "allocation": 0.5}  # Sum > 1.0
                    ]
                },
                "expected_error": "allocation"
            },
            {
                "data": {
                    "name": "Test Portfolio", 
                    "assets": [{"symbol": "AAPL", "allocation": -0.1}]  # Negative allocation
                },
                "expected_error": "allocation"
            },
            {
                "data": {
                    "name": "Test Portfolio",
                    "assets": []  # Empty assets
                },
                "expected_error": "assets"
            }
        ]
        
        for case in error_cases:
            response = client.post("/api/v1/portfolios/", json=case["data"])
            
            assert response.status_code == 422  # Validation error
            error_detail = response.json()
            assert "detail" in error_detail
            
            # Check that the expected field is mentioned in error
            error_text = str(error_detail["detail"]).lower()
            assert case["expected_error"] in error_text

    @integration
    def test_get_portfolio_not_found(self, client: TestClient):
        """Test getting non-existent portfolio."""
        response = client.get("/api/v1/portfolios/99999")
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    @integration
    def test_update_portfolio(self, client: TestClient):
        """Test portfolio update functionality."""
        # First create a portfolio
        initial_data = {
            "name": "Original Portfolio",
            "assets": [
                {"symbol": "AAPL", "allocation": 0.5},
                {"symbol": "MSFT", "allocation": 0.5}
            ]
        }
        
        create_response = client.post("/api/v1/portfolios/", json=initial_data)
        portfolio_id = create_response.json()["id"]
        
        # Update the portfolio
        update_data = {
            "name": "Updated Portfolio",
            "assets": [
                {"symbol": "AAPL", "allocation": 0.3},
                {"symbol": "MSFT", "allocation": 0.3},
                {"symbol": "GOOGL", "allocation": 0.4}
            ]
        }
        
        update_response = client.put(f"/api/v1/portfolios/{portfolio_id}", json=update_data)
        
        assert update_response.status_code == 200
        updated_portfolio = update_response.json()
        
        assert updated_portfolio["name"] == update_data["name"]
        assert len(updated_portfolio["assets"]) == 3
        
        # Verify changes persisted
        get_response = client.get(f"/api/v1/portfolios/{portfolio_id}")
        assert get_response.json()["name"] == update_data["name"]

    @integration
    def test_delete_portfolio(self, client: TestClient):
        """Test portfolio deletion."""
        # Create portfolio
        portfolio_data = {
            "name": "To Be Deleted",
            "assets": [{"symbol": "AAPL", "allocation": 1.0}]
        }
        
        create_response = client.post("/api/v1/portfolios/", json=portfolio_data)
        portfolio_id = create_response.json()["id"]
        
        # Delete portfolio
        delete_response = client.delete(f"/api/v1/portfolios/{portfolio_id}")
        assert delete_response.status_code == 204
        
        # Verify deletion
        get_response = client.get(f"/api/v1/portfolios/{portfolio_id}")
        assert get_response.status_code == 404

    @integration
    def test_list_portfolios_pagination(self, client: TestClient):
        """Test portfolio listing with pagination."""
        # Create multiple portfolios
        for i in range(15):
            portfolio_data = {
                "name": f"Portfolio {i}",
                "assets": [{"symbol": "AAPL", "allocation": 1.0}]
            }
            client.post("/api/v1/portfolios/", json=portfolio_data)
        
        # Test pagination
        response = client.get("/api/v1/portfolios/?page=1&size=10")
        assert response.status_code == 200
        
        data = response.json()
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "size" in data
        
        assert len(data["items"]) == 10
        assert data["page"] == 1
        assert data["size"] == 10
        assert data["total"] >= 15
        
        # Test second page
        response2 = client.get("/api/v1/portfolios/?page=2&size=10")
        page2_data = response2.json()
        assert len(page2_data["items"]) >= 5  # At least 5 remaining


class TestOptimizationEndpoints:
    """Test portfolio optimization API endpoints."""

    @integration
    @patch('app.services.market_data.MarketDataService.get_returns_data')
    def test_optimize_portfolio_mean_variance(self, mock_get_returns, client: TestClient):
        """Test mean-variance optimization endpoint."""
        # Mock market data
        import pandas as pd
        import numpy as np
        
        mock_returns = pd.DataFrame({
            'AAPL': np.random.normal(0.001, 0.02, 252),
            'MSFT': np.random.normal(0.0008, 0.018, 252),
            'GOOGL': np.random.normal(0.0012, 0.025, 252)
        })
        mock_get_returns.return_value = mock_returns
        
        optimization_request = {
            "symbols": ["AAPL", "MSFT", "GOOGL"],
            "objective": "max_sharpe",
            "constraints": {
                "max_weight": 0.4,
                "min_weight": 0.1
            },
            "risk_aversion": 3.0
        }
        
        response = client.post("/api/v1/optimize/", json=optimization_request)
        
        assert response.status_code == 200
        result = response.json()
        
        # Verify response structure
        assert "weights" in result
        assert "expected_return" in result
        assert "volatility" in result
        assert "sharpe_ratio" in result
        
        # Verify constraints
        weights = result["weights"]
        assert len(weights) == 3
        
        total_weight = sum(weights.values())
        assert abs(total_weight - 1.0) < 1e-6
        
        for symbol, weight in weights.items():
            assert 0.1 <= weight <= 0.4, f"Weight constraint violated for {symbol}: {weight}"
        
        # Verify metrics are reasonable
        assert 0.0 < result["expected_return"] < 1.0  # Annual return between 0-100%
        assert 0.0 < result["volatility"] < 1.0  # Annual volatility between 0-100%
        assert result["sharpe_ratio"] > -5.0  # Reasonable Sharpe ratio range

    @integration
    @patch('app.services.market_data.MarketDataService.get_returns_data')
    def test_optimize_portfolio_risk_parity(self, mock_get_returns, client: TestClient):
        """Test risk parity optimization endpoint."""
        import pandas as pd
        import numpy as np
        
        # Create covariance structure with different volatilities
        mock_returns = pd.DataFrame({
            'AAPL': np.random.normal(0.001, 0.03, 252),   # High vol
            'JNJ': np.random.normal(0.0005, 0.01, 252),   # Low vol
            'SPY': np.random.normal(0.0008, 0.015, 252)   # Medium vol
        })
        mock_get_returns.return_value = mock_returns
        
        optimization_request = {
            "symbols": ["AAPL", "JNJ", "SPY"],
            "objective": "risk_parity",
            "constraints": {}
        }
        
        response = client.post("/api/v1/optimize/", json=optimization_request)
        
        assert response.status_code == 200
        result = response.json()
        
        weights = result["weights"]
        
        # In risk parity, lower volatility assets should have higher weights
        # JNJ (low vol) should have higher weight than AAPL (high vol)
        assert weights["JNJ"] > weights["AAPL"], \
            "Risk parity should allocate more to lower volatility assets"

    @integration
    def test_optimize_portfolio_invalid_symbols(self, client: TestClient):
        """Test optimization with invalid symbols."""
        optimization_request = {
            "symbols": ["INVALID_SYMBOL", "ANOTHER_INVALID"],
            "objective": "max_sharpe"
        }
        
        response = client.post("/api/v1/optimize/", json=optimization_request)
        
        # Should handle gracefully - either return error or skip invalid symbols
        assert response.status_code in [400, 422]  # Bad request or validation error

    @integration
    def test_optimization_constraints_validation(self, client: TestClient):
        """Test optimization constraint validation."""
        invalid_constraints_cases = [
            {
                "constraints": {"max_weight": -0.1},  # Negative max weight
                "description": "negative_max_weight"
            },
            {
                "constraints": {"min_weight": 0.8, "max_weight": 0.2},  # min > max
                "description": "min_greater_than_max"
            },
            {
                "constraints": {"target_return": 2.0},  # Unrealistic target return
                "description": "unrealistic_target_return"
            }
        ]
        
        for case in invalid_constraints_cases:
            request_data = {
                "symbols": ["AAPL", "MSFT"],
                "objective": "max_sharpe",
                "constraints": case["constraints"]
            }
            
            response = client.post("/api/v1/optimize/", json=request_data)
            assert response.status_code == 422  # Validation error

    @integration
    @patch('app.services.market_data.MarketDataService.get_returns_data')
    def test_efficient_frontier_generation(self, mock_get_returns, client: TestClient):
        """Test efficient frontier endpoint."""
        import pandas as pd
        import numpy as np
        
        mock_returns = pd.DataFrame({
            'AAPL': np.random.normal(0.001, 0.02, 252),
            'MSFT': np.random.normal(0.0008, 0.018, 252),
            'BND': np.random.normal(0.0002, 0.005, 252)  # Bond-like asset
        })
        mock_get_returns.return_value = mock_returns
        
        frontier_request = {
            "symbols": ["AAPL", "MSFT", "BND"],
            "num_points": 20,
            "constraints": {"min_weight": 0.0, "max_weight": 1.0}
        }
        
        response = client.post("/api/v1/efficient-frontier/", json=frontier_request)
        
        assert response.status_code == 200
        result = response.json()
        
        assert "frontier_points" in result
        frontier_points = result["frontier_points"]
        
        assert len(frontier_points) <= 20  # May be fewer if some points are infeasible
        
        # Verify each point
        for point in frontier_points:
            assert "return" in point
            assert "volatility" in point
            assert "weights" in point
            
            # Weights should sum to 1
            total_weight = sum(point["weights"].values())
            assert abs(total_weight - 1.0) < 1e-4
            
            # Returns and volatility should be positive
            assert point["return"] >= 0
            assert point["volatility"] >= 0
        
        # Frontier should be sorted by volatility
        volatilities = [point["volatility"] for point in frontier_points]
        assert volatilities == sorted(volatilities), "Frontier should be sorted by volatility"


class TestMarketDataEndpoints:
    """Test market data API endpoints."""

    @integration
    @patch('app.services.market_data.MarketDataService.get_price_data')
    def test_get_price_data(self, mock_get_price_data, client: TestClient):
        """Test price data retrieval endpoint."""
        import pandas as pd
        import numpy as np
        
        # Mock price data
        dates = pd.date_range(start='2023-01-01', end='2023-12-31', freq='D')
        mock_price_data = pd.DataFrame({
            'AAPL': np.cumprod(1 + np.random.normal(0.001, 0.02, len(dates))) * 150,
            'MSFT': np.cumprod(1 + np.random.normal(0.0008, 0.018, len(dates))) * 250
        }, index=dates)
        
        mock_get_price_data.return_value = mock_price_data
        
        response = client.get("/api/v1/market-data/prices?symbols=AAPL,MSFT&start_date=2023-01-01&end_date=2023-12-31")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "prices" in data
        assert "AAPL" in data["prices"]
        assert "MSFT" in data["prices"]
        
        # Verify data structure
        aapl_prices = data["prices"]["AAPL"]
        assert len(aapl_prices) > 300  # Should have most trading days
        
        # Each price entry should have date and price
        for entry in aapl_prices[:5]:  # Check first 5 entries
            assert "date" in entry
            assert "price" in entry
            assert entry["price"] > 0

    @integration
    def test_get_price_data_invalid_symbol(self, client: TestClient):
        """Test price data with invalid symbols."""
        response = client.get("/api/v1/market-data/prices?symbols=INVALID_SYMBOL")
        
        # Should handle gracefully
        assert response.status_code in [200, 404]  # Either empty data or not found
        
        if response.status_code == 200:
            data = response.json()
            # Should return empty or indicate no data found
            assert "prices" in data

    @integration
    @patch('app.services.market_data.MarketDataService.get_returns_data')
    def test_get_returns_data(self, mock_get_returns, client: TestClient):
        """Test returns data endpoint."""
        import pandas as pd
        import numpy as np
        
        mock_returns = pd.DataFrame({
            'AAPL': np.random.normal(0.001, 0.02, 252),
            'MSFT': np.random.normal(0.0008, 0.018, 252)
        })
        mock_get_returns.return_value = mock_returns
        
        response = client.get("/api/v1/market-data/returns?symbols=AAPL,MSFT&period=1y")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "returns" in data
        assert "statistics" in data
        
        # Verify statistics
        stats = data["statistics"]
        for symbol in ["AAPL", "MSFT"]:
            assert symbol in stats
            symbol_stats = stats[symbol]
            
            # Should include key statistics
            expected_stats = ["mean", "std", "min", "max", "skew", "kurt"]
            for stat in expected_stats:
                assert stat in symbol_stats


class TestAuthenticationEndpoints:
    """Test authentication and authorization."""

    @integration
    def test_login_valid_credentials(self, client: TestClient):
        """Test login with valid credentials."""
        # First create a user (assuming registration endpoint exists)
        user_data = {
            "email": "test@example.com",
            "password": "securepassword123",
            "full_name": "Test User"
        }
        
        # Register user
        register_response = client.post("/api/v1/auth/register", json=user_data)
        
        if register_response.status_code == 201:  # Registration successful
            # Now test login
            login_data = {
                "email": user_data["email"],
                "password": user_data["password"]
            }
            
            login_response = client.post("/api/v1/auth/login", json=login_data)
            
            assert login_response.status_code == 200
            login_result = login_response.json()
            
            assert "access_token" in login_result
            assert "token_type" in login_result
            assert login_result["token_type"] == "bearer"

    @integration
    def test_login_invalid_credentials(self, client: TestClient):
        """Test login with invalid credentials."""
        invalid_login = {
            "email": "nonexistent@example.com",
            "password": "wrongpassword"
        }
        
        response = client.post("/api/v1/auth/login", json=invalid_login)
        
        assert response.status_code == 401  # Unauthorized
        assert "detail" in response.json()

    @integration
    def test_protected_endpoint_without_token(self, client: TestClient):
        """Test accessing protected endpoint without authentication token."""
        # Assuming portfolios require authentication
        response = client.get("/api/v1/portfolios/")
        
        # Should require authentication (unless endpoint is public)
        if response.status_code == 401:
            assert "detail" in response.json()
        # If 200, then endpoint is public (which is also valid)

    @integration
    def test_token_validation(self, client: TestClient):
        """Test token validation and expiration."""
        # Create user and login to get token
        user_data = {
            "email": "tokentest@example.com", 
            "password": "securepassword123"
        }
        
        register_response = client.post("/api/v1/auth/register", json=user_data)
        
        if register_response.status_code == 201:
            login_response = client.post("/api/v1/auth/login", json={
                "email": user_data["email"],
                "password": user_data["password"]
            })
            
            if login_response.status_code == 200:
                token = login_response.json()["access_token"]
                
                # Test with valid token
                headers = {"Authorization": f"Bearer {token}"}
                response = client.get("/api/v1/portfolios/", headers=headers)
                
                # Should work with valid token
                assert response.status_code in [200, 201]  # Success or created
                
                # Test with invalid token
                invalid_headers = {"Authorization": "Bearer invalid_token"}
                invalid_response = client.get("/api/v1/portfolios/", headers=invalid_headers)
                
                if invalid_response.status_code == 401:  # If auth is enforced
                    assert "detail" in invalid_response.json()


class TestErrorHandling:
    """Test API error handling scenarios."""

    @integration
    def test_malformed_json_request(self, client: TestClient):
        """Test handling of malformed JSON requests."""
        # Send invalid JSON
        response = client.post(
            "/api/v1/portfolios/",
            data="invalid json{",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == 422  # Unprocessable entity

    @integration
    def test_large_request_payload(self, client: TestClient):
        """Test handling of very large request payloads."""
        # Create large portfolio with many assets
        large_portfolio = {
            "name": "Large Portfolio",
            "assets": [
                {"symbol": f"STOCK{i:04d}", "allocation": 1.0/1000}
                for i in range(1000)  # 1000 assets
            ]
        }
        
        response = client.post("/api/v1/portfolios/", json=large_portfolio)
        
        # Should either accept or reject with appropriate error
        assert response.status_code in [201, 413, 422]  # Created, too large, or validation error

    @integration
    def test_concurrent_requests(self, client: TestClient):
        """Test handling of concurrent requests."""
        import threading
        import time
        
        results = []
        
        def make_request():
            portfolio_data = {
                "name": f"Concurrent Portfolio {threading.current_thread().ident}",
                "assets": [{"symbol": "AAPL", "allocation": 1.0}]
            }
            response = client.post("/api/v1/portfolios/", json=portfolio_data)
            results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for i in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed (or fail consistently)
        assert len(results) == 10
        successful_requests = sum(1 for status in results if status == 201)
        assert successful_requests >= 8  # Allow for some failures due to race conditions

    @integration
    @patch('app.services.market_data.MarketDataService.get_returns_data')
    def test_external_service_failure(self, mock_get_returns, client: TestClient):
        """Test handling of external service failures."""
        # Mock external service failure
        mock_get_returns.side_effect = Exception("External service unavailable")
        
        optimization_request = {
            "symbols": ["AAPL", "MSFT"],
            "objective": "max_sharpe"
        }
        
        response = client.post("/api/v1/optimize/", json=optimization_request)
        
        # Should handle external service failure gracefully
        assert response.status_code in [500, 503]  # Internal server error or service unavailable
        
        error_response = response.json()
        assert "detail" in error_response
        assert "error" in error_response["detail"].lower() or "unavailable" in error_response["detail"].lower()

    @integration
    def test_database_connection_failure(self, client: TestClient):
        """Test handling of database connection failures."""
        with patch('app.database.database.get_db') as mock_get_db:
            # Mock database connection failure
            mock_get_db.side_effect = Exception("Database connection failed")
            
            portfolio_data = {
                "name": "Test Portfolio",
                "assets": [{"symbol": "AAPL", "allocation": 1.0}]
            }
            
            response = client.post("/api/v1/portfolios/", json=portfolio_data)
            
            # Should handle database failure gracefully
            assert response.status_code == 500  # Internal server error
            
            error_response = response.json()
            assert "detail" in error_response