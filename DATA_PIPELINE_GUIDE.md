# Data Pipeline Architecture Guide

## 🚀 Overview

The Portfolio Optimization Dashboard features a robust, production-ready data pipeline that handles market data ingestion, processing, validation, and real-time distribution. This comprehensive system ensures data quality, supports multiple export/import formats, and provides real-time updates to connected clients.

## 📊 Architecture Components

### 1. Market Data Integration (`market_data.py`)

**Purpose**: Robust market data acquisition with caching, retry logic, and quality assessment.

**Key Features**:
- **Multi-source Data Fetching**: Yahoo Finance integration with fallback mechanisms
- **Redis Caching**: 5-minute cache for real-time data, 24-hour cache for historical data
- **Rate Limiting**: 100ms delays between requests to respect API limits
- **Data Quality Assessment**: Automatic quality scoring (Excellent/Good/Fair/Poor)
- **Concurrent Processing**: Thread pool execution for multiple symbol requests
- **Retry Logic**: Exponential backoff with circuit breaker patterns

**Core Classes**:
```python
# Market data provider with caching and retry logic
provider = MarketDataProvider(cache)
historical_data = await provider.get_historical_data('AAPL', start_date, end_date)
current_prices = await provider.get_multiple_current_prices(['AAPL', 'MSFT'])
```

**Data Quality Levels**:
- **Excellent**: Complete data, logical consistency, normal volume
- **Good**: Minor issues, acceptable for most use cases
- **Fair**: Missing some fields or unusual patterns detected
- **Poor**: Significant data issues, use with caution

### 2. Database Schema (`models.py` & `database.py`)

**Purpose**: Comprehensive relational schema optimized for portfolio management and analytics.

**Key Tables**:

**Assets & Pricing**:
- `assets`: Asset metadata (sector, industry, market cap, etc.)
- `price_history`: OHLCV data with technical indicators
- `market_data`: Market indices and economic indicators

**Portfolio Management**:
- `portfolios`: Portfolio configuration and constraints
- `portfolio_holdings`: Individual positions with allocation tracking
- `performance_snapshots`: Daily portfolio performance metrics

**Optimization & ML**:
- `optimization_results`: Portfolio optimization outputs with ML flags
- `ml_predictions`: LSTM predictions and regime analysis
- `backtest_results`: Strategy performance validation

**Data Quality**:
- `data_quality_reports`: Automated quality monitoring
- Schema versioning with migration support

**Key Features**:
- **Connection Pooling**: 20 connections with overflow handling
- **Health Monitoring**: Built-in database health checks
- **Migration System**: Automated schema updates
- **Performance Optimization**: Strategic indexes and query optimization

### 3. Data Processing Pipeline (`data_pipeline.py`)

**Purpose**: Clean, validate, and enrich market data with technical indicators and risk metrics.

**Processing Stages**:

**Stage 1: Data Cleaning**
```python
# Automatic data validation and cleaning
cleaned_df, stats = data_cleaner.clean_price_data(raw_df)
```
- Remove invalid prices (negative, zero, extreme values)
- Validate price relationships (High >= Low, etc.)
- Detect outliers using statistical thresholds
- Fill missing volume data
- Remove duplicate records

**Stage 2: Technical Analysis**
```python
# Calculate 15+ technical indicators
enriched_df = statistical_calculator.calculate_technical_indicators(cleaned_df)
```
- **Moving Averages**: SMA(20, 50), EMA(12, 26)
- **Momentum**: RSI(14), MACD, Bollinger Bands
- **Volatility**: 20-day and 50-day rolling volatility
- **Volume**: Volume ratios and moving averages

**Stage 3: Risk Analytics**
```python
# Comprehensive risk metrics calculation
risk_metrics = statistical_calculator.calculate_risk_metrics(returns)
```
- **Return Metrics**: Annual return, Sharpe ratio, Sortino ratio
- **Risk Measures**: VaR(95%), CVaR, maximum drawdown
- **Distribution**: Skewness, kurtosis, beta (vs benchmark)

**Quality Assurance**:
- Data completeness validation (>80% threshold)
- Gap detection (>7 day gaps flagged)
- Freshness checks (<5 days for current data)
- Confidence scoring (0-1 scale)

### 4. Real-time Updates (`websocket_manager.py`)

**Purpose**: WebSocket-based real-time data streaming and client notifications.

**Connection Management**:
```python
# Multi-user WebSocket connection handling
connection_manager = ConnectionManager()
await connection_manager.connect(websocket, user_id, client_id)
```

**Real-time Streams**:
- **Price Updates**: 30-second intervals for active symbols
- **Portfolio Values**: 1-minute updates for portfolio performance
- **ML Predictions**: Immediate delivery of new predictions
- **Market Alerts**: Instant notifications for unusual conditions

**Subscription System**:
```python
# Flexible topic-based subscriptions
await connection_manager.subscribe(websocket, "prices:AAPL")
await connection_manager.subscribe(websocket, "portfolio:123")
await connection_manager.subscribe(websocket, "alerts:all")
```

**Message Types**:
- `PRICE_UPDATE`: Real-time price changes
- `PORTFOLIO_UPDATE`: Portfolio value and allocation changes
- `OPTIMIZATION_COMPLETE`: Optimization job completion
- `ML_PREDICTION`: New ML insights
- `MARKET_ALERT`: Unusual market conditions
- `SYSTEM_STATUS`: Connection and system health

### 5. Export/Import System (`export_import.py`)

**Purpose**: Multi-format data export/import with professional reporting capabilities.

**Export Formats**:

**CSV Export**: Simple holdings data with metadata
```python
options = ExportOptions(format=ExportFormat.CSV, include_historical_data=True)
csv_data = await exporter.export_portfolio(portfolio_id, options)
```

**Excel Export**: Multi-sheet workbook
- Portfolio Summary
- Holdings Detail
- Historical Data (per symbol)
- Optimization Results
- Performance Metrics

**JSON Export**: Complete structured data
```json
{
  "portfolio_info": {...},
  "holdings": [...],
  "historical_data": {...},
  "optimization_results": [...],
  "performance_metrics": {...}
}
```

**PDF Report**: Professional report with charts and tables
- Executive summary
- Holdings breakdown
- Performance analysis
- Risk metrics
- Charts and visualizations

**XML Export**: Structured data exchange format

**ZIP Package**: All formats bundled with documentation

**Import Capabilities**:
- **CSV**: Basic holdings import with validation
- **Excel**: Multi-sheet data reconstruction
- **JSON**: Complete portfolio restoration
- **XML**: Structured data import
- **Error Handling**: Detailed validation and error reporting

## 🔧 Data Quality Framework

### Quality Assessment Criteria

**Data Completeness**:
- Record availability vs expected trading days
- Missing field detection and scoring
- Gap analysis with trend identification

**Data Consistency**:
- Price relationship validation (OHLC logic)
- Volume consistency checks
- Cross-asset correlation validation

**Data Freshness**:
- Last update timestamp tracking
- Staleness alerts (>5 days)
- Real-time data availability monitoring

**Statistical Validation**:
- Outlier detection using 3-sigma rule
- Return distribution analysis
- Volatility regime detection

### Quality Scoring Algorithm

```python
def calculate_quality_score(data_points, issues):
    base_score = completeness_ratio  # 0-1
    
    # Penalties for issues
    gap_penalty = min(0.3, gap_count / total_days * 0.5)
    freshness_penalty = min(0.2, days_since_update / 30 * 0.2)
    outlier_penalty = min(0.1, outlier_count / total_points * 0.1)
    
    final_score = max(0, base_score - gap_penalty - freshness_penalty - outlier_penalty)
    return final_score
```

### Automated Quality Reports

**Daily Reports**:
- Symbol-level quality scores
- Data availability statistics
- Issue trend analysis
- Recommended actions

**Weekly Summaries**:
- Quality trend analysis
- Data source performance
- System health metrics
- Capacity utilization

## 📈 Performance Optimization

### Caching Strategy

**Multi-Layer Caching**:
1. **Redis Cache**: Real-time data (5min TTL), Historical data (24hr TTL)
2. **Database Indexes**: Optimized queries for common access patterns
3. **Connection Pooling**: Persistent database connections

**Cache Keys**:
```python
# Structured cache key format
"market_data:{symbol}:{data_type}:start_{date}:end_{date}"
"optimization_result:{portfolio_id}:{method}:{timestamp}"
"ml_prediction:{symbol}:{horizon}:{model_version}"
```

### Database Optimization

**Strategic Indexes**:
```sql
-- Price history optimization
CREATE INDEX idx_price_asset_date ON price_history(asset_id, date);
CREATE INDEX idx_price_date ON price_history(date);

-- Portfolio performance
CREATE INDEX idx_performance_portfolio_date ON performance_snapshots(portfolio_id, snapshot_date);

-- Optimization results
CREATE INDEX idx_optimization_created ON optimization_results(created_at);
CREATE INDEX idx_optimization_sharpe ON optimization_results(sharpe_ratio);
```

**Connection Management**:
- Pool size: 20 connections
- Pool timeout: 300 seconds
- Pre-ping validation
- Automatic connection recycling

### Concurrent Processing

**Async Architecture**:
```python
# Concurrent symbol processing
tasks = [process_asset_data(symbol, start_date, end_date) for symbol in symbols]
results = await asyncio.gather(*tasks, return_exceptions=True)
```

**Thread Pool Usage**:
- Market data fetching: 10 worker threads
- File processing: 5 worker threads
- Statistical calculations: CPU-bound optimization

## 🔄 Real-time Data Flow

### Data Ingestion Pipeline

**Step 1: Market Data Collection**
```
Yahoo Finance API → Rate Limiting → Data Validation → Redis Cache → Database Storage
                                    ↓
                              Quality Assessment → Quality Reports
```

**Step 2: Data Processing**
```
Raw Data → Cleaning → Technical Analysis → Risk Metrics → Database Update → WebSocket Notification
```

**Step 3: Client Updates**
```
Database Changes → WebSocket Manager → Connection Manager → Subscribed Clients
```

### WebSocket Message Flow

**Price Updates**:
```python
# Every 30 seconds for active symbols
price_data = await market_data_provider.get_current_price(symbol)
message = WebSocketMessage(type=MessageType.PRICE_UPDATE, data=price_data)
await connection_manager.broadcast_to_subscription(f"prices:{symbol}", message)
```

**Portfolio Updates**:
```python
# Every 60 seconds for active portfolios
portfolio_value = calculate_current_value(portfolio_holdings)
message = WebSocketMessage(type=MessageType.PORTFOLIO_UPDATE, data=portfolio_data)
await connection_manager.send_to_user(user_id, message)
```

## 🚨 Error Handling & Monitoring

### Graceful Degradation

**Data Source Failures**:
- Automatic fallback to cached data
- Alternative data source routing
- User notification of reduced functionality

**Processing Errors**:
- Individual record failure isolation
- Batch processing with partial success handling
- Detailed error logging and reporting

**WebSocket Connection Issues**:
- Automatic reconnection logic
- Message queuing during disconnections
- Connection health monitoring

### Monitoring & Alerting

**System Health Metrics**:
```python
health_check = {
    "database_status": "healthy",
    "cache_status": "healthy", 
    "data_freshness": "< 5 minutes",
    "active_connections": 45,
    "processing_queue_size": 12
}
```

**Quality Alerts**:
- Data quality drops below 70%
- Missing data for >6 hours
- Processing delays >15 minutes
- WebSocket connection failures >10%

## 🔧 Deployment & Configuration

### Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://user:pass@localhost/portfolio_optimization
SQL_ECHO=false

# Redis Configuration  
REDIS_URL=redis://localhost:6379

# Market Data Settings
MARKET_DATA_CACHE_TTL=300
HISTORICAL_DATA_CACHE_TTL=86400
RATE_LIMIT_DELAY=0.1

# WebSocket Settings
WEBSOCKET_HEARTBEAT_INTERVAL=60
CONNECTION_TIMEOUT=300

# Export Settings
ENABLE_PDF_EXPORT=true
MAX_EXPORT_SIZE_MB=100
```

### Docker Configuration

```yaml
version: '3.8'
services:
  app:
    build: .
    environment:
      - DATABASE_URL=postgresql://postgres:password@db:5432/portfolio_optimization
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
      
  db:
    image: postgres:13
    environment:
      - POSTGRES_DB=portfolio_optimization
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      
  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

## 📋 Usage Examples

### Basic Data Pipeline Usage

```python
# Initialize components
from services.market_data import create_market_data_provider
from services.data_pipeline import DataPipeline

# Create pipeline
provider = await create_market_data_provider()
pipeline = DataPipeline(provider)

# Process multiple assets
symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA']
start_date = date.today() - timedelta(days=90)

results = await pipeline.process_multiple_assets(symbols, start_date)
print(f"Processed {results['summary']['successful_assets']} assets")

# Generate quality report
quality_report = await pipeline.generate_data_quality_report(symbols, 30)
print(f"Overall quality: {quality_report['overall_quality']}")
```

### WebSocket Integration

```python
# WebSocket endpoint
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: int):
    manager = await get_websocket_manager()
    await manager.handle_connection(websocket, user_id)
```

### Export/Import Operations

```python
# Export portfolio to multiple formats
from services.export_import import DataExporter, ExportOptions, ExportFormat

exporter = DataExporter()
options = ExportOptions(
    format=ExportFormat.ZIP,
    include_historical_data=True,
    include_optimization_results=True
)

zip_data = await exporter.export_portfolio(portfolio_id, options)

# Import portfolio from CSV
importer = DataImporter()
result = await importer.import_portfolio(user_id, csv_data, ImportFormat.CSV)
print(f"Imported {result.records_imported} holdings")
```

## 🎯 Best Practices

### Data Quality
1. **Always validate data** before processing
2. **Monitor quality scores** and set up alerts
3. **Use confidence intervals** in ML predictions
4. **Implement graceful degradation** for poor quality data

### Performance
1. **Cache frequently accessed data** with appropriate TTLs
2. **Use async/await** for I/O bound operations
3. **Batch database operations** when possible
4. **Monitor connection pool** utilization

### Reliability
1. **Implement retry logic** with exponential backoff
2. **Use circuit breakers** for external APIs
3. **Log errors comprehensively** with context
4. **Test failure scenarios** regularly

### Security
1. **Validate all inputs** before processing
2. **Use parameterized queries** to prevent SQL injection
3. **Implement rate limiting** for API endpoints
4. **Encrypt sensitive data** in transit and at rest

---

The data pipeline represents a production-grade solution that scales from development to enterprise deployments, ensuring data quality, performance, and reliability throughout the portfolio optimization workflow.