-- Initialize Portfolio Optimization Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables first
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    total_value DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS stock_info (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    sector VARCHAR(100),
    industry VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    symbol VARCHAR(20) REFERENCES stock_info(symbol),
    quantity DECIMAL(15,4) NOT NULL,
    purchase_price DECIMAL(10,4),
    current_price DECIMAL(10,4),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    symbol VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    open_price DECIMAL(10,4),
    high_price DECIMAL(10,4),
    low_price DECIMAL(10,4),
    close_price DECIMAL(10,4),
    volume BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, date)
);

CREATE TABLE IF NOT EXISTS optimization_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
    optimization_type VARCHAR(50) NOT NULL,
    expected_return DECIMAL(8,6),
    volatility DECIMAL(8,6),
    sharpe_ratio DECIMAL(8,6),
    weights JSONB,
    constraints JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_market_data_symbol_date ON market_data(symbol, date);
CREATE INDEX IF NOT EXISTS idx_holdings_portfolio_id ON holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_optimization_results_portfolio_id ON optimization_results(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);

-- Insert some common stock information
INSERT INTO stock_info (symbol, name, sector, industry) VALUES
('AAPL', 'Apple Inc.', 'Technology', 'Consumer Electronics'),
('MSFT', 'Microsoft Corporation', 'Technology', 'Software'),
('GOOGL', 'Alphabet Inc.', 'Technology', 'Internet Content & Information'),
('AMZN', 'Amazon.com Inc.', 'Consumer Discretionary', 'Internet & Direct Marketing Retail'),
('TSLA', 'Tesla Inc.', 'Consumer Discretionary', 'Auto Manufacturers'),
('META', 'Meta Platforms Inc.', 'Technology', 'Internet Content & Information'),
('NVDA', 'NVIDIA Corporation', 'Technology', 'Semiconductors'),
('SPY', 'SPDR S&P 500 ETF', 'ETF', 'Exchange Traded Fund'),
('QQQ', 'Invesco QQQ Trust', 'ETF', 'Exchange Traded Fund'),
('VTI', 'Vanguard Total Stock Market ETF', 'ETF', 'Exchange Traded Fund'),
('BRK.B', 'Berkshire Hathaway Inc.', 'Financial Services', 'Insurance'),
('JPM', 'JPMorgan Chase & Co.', 'Financial Services', 'Banks'),
('JNJ', 'Johnson & Johnson', 'Healthcare', 'Drug Manufacturers'),
('PG', 'Procter & Gamble Co.', 'Consumer Staples', 'Household & Personal Products'),
('V', 'Visa Inc.', 'Financial Services', 'Credit Services'),
('MA', 'Mastercard Inc.', 'Financial Services', 'Credit Services'),
('HD', 'Home Depot Inc.', 'Consumer Discretionary', 'Home Improvement Retail'),
('DIS', 'Walt Disney Co.', 'Communication Services', 'Entertainment'),
('NFLX', 'Netflix Inc.', 'Communication Services', 'Entertainment'),
('KO', 'Coca-Cola Co.', 'Consumer Staples', 'Beverages')
ON CONFLICT (symbol) DO NOTHING;