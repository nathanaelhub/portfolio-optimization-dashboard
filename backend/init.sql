-- Initialize Portfolio Optimization Database
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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