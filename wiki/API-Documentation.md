# API Documentation

**Comprehensive REST API reference for the Portfolio Optimization Dashboard**

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Conventions](#api-conventions)
4. [Core Endpoints](#core-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [SDKs & Examples](#sdks--examples)
8. [Interactive Documentation](#interactive-documentation)

---

## 🎯 Overview

The Portfolio Optimization Dashboard provides a comprehensive RESTful API for portfolio management, optimization, and analysis. The API follows OpenAPI 3.0 specification and provides real-time and batch processing capabilities.

### Key Features

- **RESTful Design**: Standard HTTP methods and status codes
- **Real-time Updates**: WebSocket support for live data
- **Comprehensive Coverage**: All dashboard features accessible via API
- **Type Safety**: Full TypeScript definitions available
- **Interactive Docs**: Swagger UI and ReDoc interfaces
- **Rate Limiting**: Fair usage policies with generous limits

### Base URLs

| Environment | Base URL | Purpose |
|-------------|----------|---------|
| **Production** | `https://api.portfolio-dashboard.com` | Live production API |
| **Staging** | `https://staging-api.portfolio-dashboard.com` | Testing environment |
| **Demo** | `https://demo-api.portfolio-dashboard.com` | Public demo with sample data |
| **Local** | `http://localhost:8000` | Development server |

---

## 🔐 Authentication

### JWT Token Authentication

The API uses JSON Web Tokens (JWT) for authentication with refresh token support.

#### Authentication Flow

```mermaid
sequenceDiagram
    participant C as Client
    participant API as API Server
    participant DB as Database
    
    C->>API: POST /auth/login (credentials)
    API->>DB: Validate user
    DB-->>API: User data
    API-->>C: Access token + Refresh token
    
    C->>API: API Request (with token)
    API->>API: Validate token
    API-->>C: Response
    
    C->>API: POST /auth/refresh (refresh token)
    API-->>C: New access token
```

#### Login Endpoint

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "email": "user@example.com",
    "name": "John Doe",
    "role": "user"
  }
}
```

#### Using Authentication

Include the access token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### Token Refresh

```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### API Key Authentication (Optional)

For server-to-server integration:

```http
X-API-Key: your-api-key-here
```

---

## 📐 API Conventions

### HTTP Methods

| Method | Usage | Idempotent |
|--------|-------|------------|
| `GET` | Retrieve resources | ✅ |
| `POST` | Create new resources | ❌ |
| `PUT` | Update/replace entire resource | ✅ |
| `PATCH` | Partial update | ❌ |
| `DELETE` | Remove resource | ✅ |

### Response Format

All API responses follow a consistent structure:

```json
{
  "success": true,
  "data": {
    // Response payload
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456789",
    "version": "1.0.0"
  }
}
```

### Error Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "allocation_percentage",
        "message": "Must be between 0 and 1"
      }
    ]
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "request_id": "req_123456789"
  }
}
```

### Pagination

Large result sets are paginated:

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 150,
      "total_pages": 8,
      "has_next": true,
      "has_prev": false
    }
  }
}
```

---

## 🔧 Core Endpoints

### Portfolio Management

#### List Portfolios

```http
GET /api/portfolios?page=1&per_page=20&sort=created_at&order=desc
```

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)
- `sort` (string): Sort field (name, created_at, updated_at)
- `order` (string): Sort order (asc, desc)
- `search` (string): Search in portfolio names

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "portfolio_123",
        "name": "Growth Portfolio",
        "description": "Long-term growth strategy",
        "created_at": "2024-01-15T10:30:00Z",
        "updated_at": "2024-01-15T10:30:00Z",
        "total_value": 100000.00,
        "return_ytd": 0.085,
        "holdings_count": 12
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 5,
      "total_pages": 1
    }
  }
}
```

#### Create Portfolio

```http
POST /api/portfolios
Content-Type: application/json

{
  "name": "Conservative Growth",
  "description": "Balanced portfolio for steady growth",
  "initial_value": 50000.00,
  "currency": "USD",
  "benchmark": "SPY"
}
```

#### Get Portfolio Details

```http
GET /api/portfolios/{portfolio_id}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "portfolio_123",
    "name": "Growth Portfolio",
    "description": "Long-term growth strategy",
    "created_at": "2024-01-15T10:30:00Z",
    "total_value": 100000.00,
    "holdings": [
      {
        "asset_symbol": "AAPL",
        "asset_name": "Apple Inc.",
        "allocation_percentage": 0.15,
        "current_value": 15000.00,
        "shares": 100.5,
        "avg_cost": 145.50
      }
    ],
    "performance": {
      "return_1d": 0.001,
      "return_1w": 0.012,
      "return_1m": 0.045,
      "return_ytd": 0.085,
      "volatility": 0.18,
      "sharpe_ratio": 1.25,
      "max_drawdown": -0.08
    }
  }
}
```

### Portfolio Optimization

#### Run Optimization

```http
POST /api/optimization/optimize
Content-Type: application/json

{
  "portfolio_id": "portfolio_123",
  "method": "markowitz",
  "objective": "max_sharpe",
  "constraints": {
    "max_weight": 0.3,
    "min_weight": 0.0,
    "sector_limits": {
      "Technology": 0.4,
      "Healthcare": 0.3
    }
  },
  "parameters": {
    "lookback_period": 252,
    "rebalance_frequency": "monthly"
  }
}
```

**Optimization Methods:**
- `markowitz` - Mean-variance optimization
- `black_litterman` - Black-Litterman model
- `risk_parity` - Equal risk contribution
- `min_volatility` - Minimum volatility
- `max_sharpe` - Maximum Sharpe ratio

**Response:**
```json
{
  "success": true,
  "data": {
    "optimization_id": "opt_456789",
    "status": "completed",
    "method": "markowitz",
    "objective": "max_sharpe",
    "results": {
      "optimal_weights": {
        "AAPL": 0.18,
        "GOOGL": 0.15,
        "MSFT": 0.12,
        "AMZN": 0.10,
        "BND": 0.25,
        "VTI": 0.20
      },
      "expected_return": 0.095,
      "expected_volatility": 0.16,
      "sharpe_ratio": 1.45,
      "optimization_time": 0.85
    },
    "efficient_frontier": [
      {"return": 0.06, "volatility": 0.10},
      {"return": 0.08, "volatility": 0.13},
      {"return": 0.10, "volatility": 0.17}
    ]
  }
}
```

#### Get Efficient Frontier

```http
GET /api/optimization/efficient-frontier/{portfolio_id}?points=50&method=markowitz
```

### Market Data

#### Get Asset Prices

```http
GET /api/market-data/prices/{symbol}?period=1y&interval=1d
```

**Parameters:**
- `period`: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
- `interval`: 1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo

#### Search Assets

```http
GET /api/market-data/search?q=apple&type=equity&limit=10
```

#### Get Market Indices

```http
GET /api/market-data/indices
```

### Risk Analysis

#### Portfolio Risk Metrics

```http
GET /api/risk/portfolio/{portfolio_id}/metrics?period=1y
```

**Response:**
```json
{
  "success": true,
  "data": {
    "value_at_risk": {
      "var_95": -0.045,
      "var_99": -0.067,
      "cvar_95": -0.058,
      "cvar_99": -0.089
    },
    "risk_metrics": {
      "volatility": 0.18,
      "beta": 1.05,
      "alpha": 0.02,
      "sharpe_ratio": 1.25,
      "sortino_ratio": 1.68,
      "information_ratio": 0.45,
      "max_drawdown": -0.12
    },
    "correlation_matrix": {
      "AAPL": {"AAPL": 1.0, "GOOGL": 0.75},
      "GOOGL": {"AAPL": 0.75, "GOOGL": 1.0}
    }
  }
}
```

### Backtesting

#### Run Backtest

```http
POST /api/backtesting/run
Content-Type: application/json

{
  "portfolio_id": "portfolio_123",
  "start_date": "2020-01-01",
  "end_date": "2023-12-31",
  "rebalance_frequency": "monthly",
  "benchmark": "SPY",
  "initial_capital": 100000
}
```

---

## ❌ Error Handling

### HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid request format |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Input validation failed |
| `AUTHENTICATION_FAILED` | Invalid credentials |
| `AUTHORIZATION_FAILED` | Insufficient permissions |
| `RESOURCE_NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `OPTIMIZATION_FAILED` | Portfolio optimization error |
| `MARKET_DATA_UNAVAILABLE` | External data source error |

---

## 🚦 Rate Limiting

### Default Limits

| User Type | Requests/Minute | Requests/Hour | Requests/Day |
|-----------|-----------------|---------------|--------------|
| **Free** | 60 | 1,000 | 10,000 |
| **Premium** | 300 | 10,000 | 100,000 |
| **Enterprise** | 1,000 | 50,000 | 500,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1642252800
X-RateLimit-Retry-After: 60
```

### Handling Rate Limits

```python
import time
import requests

def api_request_with_retry(url, headers, max_retries=3):
    for attempt in range(max_retries):
        response = requests.get(url, headers=headers)
        
        if response.status_code == 429:
            retry_after = int(response.headers.get('X-RateLimit-Retry-After', 60))
            time.sleep(retry_after)
            continue
        
        return response
    
    raise Exception("Max retries exceeded")
```

---

## 🛠️ SDKs & Examples

### Python SDK

```python
from portfolio_dashboard import PortfolioClient

# Initialize client
client = PortfolioClient(
    base_url="https://api.portfolio-dashboard.com",
    api_key="your-api-key"
)

# Login (if using email/password)
client.login("user@example.com", "password")

# Create portfolio
portfolio = client.portfolios.create({
    "name": "My Portfolio",
    "description": "Long-term growth strategy"
})

# Add holdings
client.portfolios.add_holding(portfolio.id, {
    "symbol": "AAPL",
    "allocation": 0.15
})

# Run optimization
optimization = client.optimization.optimize(portfolio.id, {
    "method": "markowitz",
    "objective": "max_sharpe"
})

print(f"Optimal Sharpe Ratio: {optimization.results.sharpe_ratio}")
```

### JavaScript/TypeScript SDK

```typescript
import { PortfolioClient } from '@portfolio-dashboard/sdk';

const client = new PortfolioClient({
  baseUrl: 'https://api.portfolio-dashboard.com',
  apiKey: 'your-api-key'
});

// Create portfolio
const portfolio = await client.portfolios.create({
  name: 'Tech Growth Portfolio',
  description: 'Focus on technology stocks'
});

// Run optimization
const optimization = await client.optimization.optimize(portfolio.id, {
  method: 'markowitz',
  objective: 'max_sharpe',
  constraints: {
    maxWeight: 0.3,
    minWeight: 0.05
  }
});

console.log('Optimization Results:', optimization.results);
```

### cURL Examples

```bash
# Login
curl -X POST "https://api.portfolio-dashboard.com/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password"}'

# Create portfolio
curl -X POST "https://api.portfolio-dashboard.com/api/portfolios" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Growth Portfolio", "description": "Long-term growth"}'

# Get portfolio
curl -X GET "https://api.portfolio-dashboard.com/api/portfolios/portfolio_123" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 📚 Interactive Documentation

### Swagger UI

**URL**: [https://api.portfolio-dashboard.com/docs](https://api.portfolio-dashboard.com/docs)

- Interactive API explorer
- Try endpoints directly from browser
- View request/response schemas
- Download OpenAPI specification

### ReDoc

**URL**: [https://api.portfolio-dashboard.com/redoc](https://api.portfolio-dashboard.com/redoc)

- Clean, readable documentation
- Code examples in multiple languages
- Detailed schema documentation
- Print-friendly format

### OpenAPI Specification

**Download**: [https://api.portfolio-dashboard.com/openapi.json](https://api.portfolio-dashboard.com/openapi.json)

Use with tools like:
- Postman
- Insomnia
- API client generators
- Testing frameworks

---

## 🔗 Related Documentation

- [Authentication Guide](API-Authentication) - Detailed auth implementation
- [Portfolio Endpoints](API-Portfolio-Endpoints) - Complete portfolio API
- [Optimization Endpoints](API-Optimization-Endpoints) - Portfolio optimization
- [Market Data Endpoints](API-Market-Data-Endpoints) - Real-time data access
- [WebSocket API](WebSocket-API) - Real-time updates
- [Webhook Configuration](Webhook-Configuration) - Event notifications

---

<div align="center">

**🚀 Ready to build amazing portfolio applications?**

[📋 Try Interactive Docs](https://api.portfolio-dashboard.com/docs) • [💻 Download SDKs](https://github.com/yourusername/Portfolio-Optimization-Dashboard/tree/main/sdks) • [🤝 Join Community](https://discord.gg/portfolio-dashboard)

[🏠 Back to Wiki Home](Home) • [🔐 Authentication](API-Authentication) • [📊 Optimization](API-Optimization-Endpoints)

</div>