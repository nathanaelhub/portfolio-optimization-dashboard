"""
Data Processing Pipeline
Handles data ingestion, cleaning, validation, and statistical calculations
"""

import asyncio
import pandas as pd
import numpy as np
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, timedelta, date
from dataclasses import dataclass, asdict
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc

from .market_data import MarketDataProvider, MarketDataPoint, DataQuality
from ..database.database import get_db_session
from ..database.models import (
    Asset, PriceHistory, DataQualityReport, MarketData, 
    Portfolio, PortfolioHolding, PerformanceSnapshot
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class DataValidationResult:
    """Result of data validation"""
    is_valid: bool
    issues: List[str]
    data_quality_score: float
    recommendations: List[str]


@dataclass
class ProcessingStats:
    """Statistics from data processing"""
    total_records: int
    processed_records: int
    failed_records: int
    data_quality_score: float
    processing_time_seconds: float
    outliers_detected: int
    missing_values_filled: int


class DataCleaner:
    """Data cleaning and validation utilities"""
    
    def __init__(self):
        self.outlier_threshold = 3.0  # Standard deviations
        self.max_daily_change = 0.5   # 50% max daily change
        self.min_price = 0.01         # Minimum valid price
        self.max_price = 1000000      # Maximum valid price
    
    def clean_price_data(self, df: pd.DataFrame) -> Tuple[pd.DataFrame, ProcessingStats]:
        """Clean and validate price data"""
        start_time = datetime.now()
        original_count = len(df)
        issues = []
        
        # Make a copy to avoid modifying original
        cleaned_df = df.copy()
        
        # Sort by date
        cleaned_df = cleaned_df.sort_values('date')
        
        # 1. Remove records with invalid prices
        price_columns = ['open_price', 'high_price', 'low_price', 'close_price', 'adjusted_close']
        
        for col in price_columns:
            if col in cleaned_df.columns:
                # Remove negative or zero prices
                invalid_prices = (cleaned_df[col] <= 0) | (cleaned_df[col] < self.min_price) | (cleaned_df[col] > self.max_price)
                if invalid_prices.any():
                    logger.warning(f"Removing {invalid_prices.sum()} records with invalid {col}")
                    cleaned_df = cleaned_df[~invalid_prices]
        
        # 2. Check price relationships (High >= Low, etc.)
        if all(col in cleaned_df.columns for col in ['open_price', 'high_price', 'low_price', 'close_price']):
            # High should be >= Open, Close, Low
            # Low should be <= Open, Close, High
            invalid_relationships = (
                (cleaned_df['high_price'] < cleaned_df['low_price']) |
                (cleaned_df['high_price'] < cleaned_df['open_price']) |
                (cleaned_df['high_price'] < cleaned_df['close_price']) |
                (cleaned_df['low_price'] > cleaned_df['open_price']) |
                (cleaned_df['low_price'] > cleaned_df['close_price'])
            )
            
            if invalid_relationships.any():
                logger.warning(f"Removing {invalid_relationships.sum()} records with invalid price relationships")
                cleaned_df = cleaned_df[~invalid_relationships]
        
        # 3. Detect and handle outliers based on daily returns
        if 'close_price' in cleaned_df.columns and len(cleaned_df) > 1:
            # Calculate daily returns
            cleaned_df = cleaned_df.sort_values('date')
            cleaned_df['daily_return'] = cleaned_df['close_price'].pct_change()
            
            # Identify extreme daily changes
            extreme_changes = abs(cleaned_df['daily_return']) > self.max_daily_change
            outliers_count = extreme_changes.sum()
            
            if outliers_count > 0:
                logger.info(f"Detected {outliers_count} potential outliers with >50% daily change")
                # For now, we keep outliers but flag them for review
                cleaned_df.loc[extreme_changes, 'data_quality'] = DataQuality.FAIR.value
        
        # 4. Fill missing volume with 0 (common for some data sources)
        missing_volume_count = 0
        if 'volume' in cleaned_df.columns:
            missing_volume = cleaned_df['volume'].isna()
            missing_volume_count = missing_volume.sum()
            if missing_volume_count > 0:
                cleaned_df.loc[missing_volume, 'volume'] = 0
                logger.info(f"Filled {missing_volume_count} missing volume values with 0")
        
        # 5. Remove duplicate dates
        if 'date' in cleaned_df.columns:
            duplicates = cleaned_df.duplicated(subset=['date'], keep='first')
            duplicates_count = duplicates.sum()
            if duplicates_count > 0:
                logger.warning(f"Removing {duplicates_count} duplicate date records")
                cleaned_df = cleaned_df[~duplicates]
        
        # Calculate processing statistics
        processing_time = (datetime.now() - start_time).total_seconds()
        processed_count = len(cleaned_df)
        failed_count = original_count - processed_count
        
        # Calculate data quality score
        quality_score = min(1.0, processed_count / original_count) if original_count > 0 else 0.0
        
        # Adjust quality score based on issues found
        if outliers_count > 0:
            quality_score *= (1 - (outliers_count / processed_count) * 0.1)  # Reduce by 10% per 100% outliers
        
        stats = ProcessingStats(
            total_records=original_count,
            processed_records=processed_count,
            failed_records=failed_count,
            data_quality_score=quality_score,
            processing_time_seconds=processing_time,
            outliers_detected=outliers_count,
            missing_values_filled=missing_volume_count
        )
        
        return cleaned_df, stats
    
    def validate_data_completeness(self, df: pd.DataFrame, expected_days: int) -> DataValidationResult:
        """Validate data completeness and consistency"""
        issues = []
        recommendations = []
        
        # Check record count
        actual_days = len(df)
        completeness_ratio = actual_days / expected_days if expected_days > 0 else 0
        
        if completeness_ratio < 0.8:
            issues.append(f"Data completeness low: {actual_days}/{expected_days} days ({completeness_ratio:.1%})")
            recommendations.append("Consider using additional data sources to fill gaps")
        
        # Check for large gaps in dates
        if 'date' in df.columns and len(df) > 1:
            df_sorted = df.sort_values('date')
            date_diffs = df_sorted['date'].diff().dt.days
            large_gaps = date_diffs > 7  # More than a week gap
            
            if large_gaps.any():
                gap_count = large_gaps.sum()
                max_gap = date_diffs.max()
                issues.append(f"Found {gap_count} large date gaps (max: {max_gap} days)")
                recommendations.append("Investigate data source reliability during gap periods")
        
        # Check data freshness
        if 'date' in df.columns and len(df) > 0:
            latest_date = df['date'].max()
            days_old = (datetime.now().date() - latest_date.date()).days
            
            if days_old > 5:
                issues.append(f"Data is {days_old} days old")
                recommendations.append("Update data source for more recent information")
        
        # Calculate overall quality score
        base_score = completeness_ratio
        gap_penalty = min(0.3, (large_gaps.sum() / len(df)) * 0.5) if len(df) > 0 else 0
        freshness_penalty = min(0.2, days_old / 30 * 0.2) if 'days_old' in locals() else 0
        
        quality_score = max(0, base_score - gap_penalty - freshness_penalty)
        
        return DataValidationResult(
            is_valid=quality_score >= 0.7,
            issues=issues,
            data_quality_score=quality_score,
            recommendations=recommendations
        )


class StatisticalCalculator:
    """Calculate technical indicators and statistical measures"""
    
    def __init__(self):
        self.short_window = 20
        self.long_window = 50
        self.rsi_period = 14
    
    def calculate_technical_indicators(self, df: pd.DataFrame) -> pd.DataFrame:
        """Calculate technical indicators for price data"""
        if 'close_price' not in df.columns or len(df) < self.long_window:
            return df
        
        df = df.copy().sort_values('date')
        
        # Daily returns
        df['daily_return'] = df['close_price'].pct_change()
        
        # Moving averages
        df['sma_20'] = df['close_price'].rolling(window=self.short_window).mean()
        df['sma_50'] = df['close_price'].rolling(window=self.long_window).mean()
        
        # Exponential moving averages
        df['ema_12'] = df['close_price'].ewm(span=12).mean()
        df['ema_26'] = df['close_price'].ewm(span=26).mean()
        
        # MACD
        df['macd'] = df['ema_12'] - df['ema_26']
        df['macd_signal'] = df['macd'].ewm(span=9).mean()
        
        # Bollinger Bands
        df['bb_middle'] = df['sma_20']
        bb_std = df['close_price'].rolling(window=self.short_window).std()
        df['bb_upper'] = df['bb_middle'] + (bb_std * 2)
        df['bb_lower'] = df['bb_middle'] - (bb_std * 2)
        
        # RSI
        df['rsi'] = self._calculate_rsi(df['close_price'], self.rsi_period)
        
        # Volatility
        df['volatility_20d'] = df['daily_return'].rolling(window=self.short_window).std() * np.sqrt(252)
        df['volatility_50d'] = df['daily_return'].rolling(window=self.long_window).std() * np.sqrt(252)
        
        # Volume indicators (if volume data available)
        if 'volume' in df.columns:
            df['volume_sma_20'] = df['volume'].rolling(window=self.short_window).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma_20']
        
        return df
    
    def _calculate_rsi(self, prices: pd.Series, window: int = 14) -> pd.Series:
        """Calculate Relative Strength Index"""
        delta = prices.diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
        rs = gain / loss
        rsi = 100 - (100 / (1 + rs))
        return rsi.fillna(50)
    
    def calculate_risk_metrics(self, returns: pd.Series, benchmark_returns: pd.Series = None) -> Dict[str, float]:
        """Calculate comprehensive risk metrics"""
        if len(returns) < 30:  # Need minimum data for meaningful metrics
            return {}
        
        # Remove NaN values
        returns = returns.dropna()
        
        # Basic statistics
        mean_return = returns.mean()
        std_return = returns.std()
        
        # Annualized metrics (assuming daily returns)
        annual_return = mean_return * 252
        annual_volatility = std_return * np.sqrt(252)
        
        # Sharpe ratio (assuming 0% risk-free rate for simplicity)
        sharpe_ratio = annual_return / annual_volatility if annual_volatility > 0 else 0
        
        # Sortino ratio (downside deviation)
        downside_returns = returns[returns < 0]
        downside_deviation = downside_returns.std() * np.sqrt(252) if len(downside_returns) > 0 else 0
        sortino_ratio = annual_return / downside_deviation if downside_deviation > 0 else 0
        
        # Maximum drawdown
        cumulative_returns = (1 + returns).cumprod()
        rolling_max = cumulative_returns.expanding().max()
        drawdowns = (cumulative_returns - rolling_max) / rolling_max
        max_drawdown = drawdowns.min()
        
        # Value at Risk (95%)
        var_95 = returns.quantile(0.05)
        
        # Conditional Value at Risk (Expected Shortfall)
        cvar_95 = returns[returns <= var_95].mean() if len(returns[returns <= var_95]) > 0 else var_95
        
        # Skewness and Kurtosis
        skewness = returns.skew()
        kurtosis = returns.kurtosis()
        
        risk_metrics = {
            'annual_return': float(annual_return),
            'annual_volatility': float(annual_volatility),
            'sharpe_ratio': float(sharpe_ratio),
            'sortino_ratio': float(sortino_ratio),
            'max_drawdown': float(max_drawdown),
            'var_95': float(var_95),
            'cvar_95': float(cvar_95),
            'skewness': float(skewness),
            'kurtosis': float(kurtosis)
        }
        
        # Beta and Alpha (if benchmark provided)
        if benchmark_returns is not None and len(benchmark_returns) > 0:
            # Align dates
            aligned_returns = pd.concat([returns, benchmark_returns], axis=1).dropna()
            if len(aligned_returns) > 30:
                asset_ret = aligned_returns.iloc[:, 0]
                benchmark_ret = aligned_returns.iloc[:, 1]
                
                # Beta
                covariance = np.cov(asset_ret, benchmark_ret)[0, 1]
                benchmark_variance = np.var(benchmark_ret)
                beta = covariance / benchmark_variance if benchmark_variance > 0 else 1.0
                
                # Alpha
                benchmark_annual_return = benchmark_ret.mean() * 252
                alpha = annual_return - (benchmark_annual_return * beta)
                
                # Tracking error
                tracking_error = (asset_ret - benchmark_ret).std() * np.sqrt(252)
                
                # Information ratio
                information_ratio = alpha / tracking_error if tracking_error > 0 else 0
                
                risk_metrics.update({
                    'beta': float(beta),
                    'alpha': float(alpha),
                    'tracking_error': float(tracking_error),
                    'information_ratio': float(information_ratio)
                })
        
        return risk_metrics


class DataPipeline:
    """Main data processing pipeline"""
    
    def __init__(self, market_data_provider: MarketDataProvider):
        self.market_data_provider = market_data_provider
        self.data_cleaner = DataCleaner()
        self.statistical_calculator = StatisticalCalculator()
        self.executor = ThreadPoolExecutor(max_workers=5)
    
    async def process_asset_data(self, symbol: str, start_date: date, end_date: date = None) -> Dict[str, Any]:
        """Process historical data for a single asset"""
        if end_date is None:
            end_date = date.today()
        
        logger.info(f"Processing data for {symbol} from {start_date} to {end_date}")
        
        try:
            # 1. Fetch historical data
            historical_data = await self.market_data_provider.get_historical_data(
                symbol, start_date, end_date
            )
            
            if not historical_data:
                return {
                    'symbol': symbol,
                    'status': 'failed',
                    'error': 'No data available',
                    'records_processed': 0
                }
            
            # 2. Convert to DataFrame
            df = pd.DataFrame([asdict(point) for point in historical_data])
            df['date'] = pd.to_datetime(df['timestamp'])
            
            # 3. Clean and validate data
            cleaned_df, processing_stats = self.data_cleaner.clean_price_data(df)
            
            expected_days = (end_date - start_date).days
            validation_result = self.data_cleaner.validate_data_completeness(cleaned_df, expected_days)
            
            # 4. Calculate technical indicators
            enriched_df = self.statistical_calculator.calculate_technical_indicators(cleaned_df)
            
            # 5. Calculate risk metrics
            if 'daily_return' in enriched_df.columns:
                returns = enriched_df['daily_return'].dropna()
                risk_metrics = self.statistical_calculator.calculate_risk_metrics(returns)
            else:
                risk_metrics = {}
            
            # 6. Store processed data in database
            stored_records = await self._store_price_data(symbol, enriched_df)
            
            return {
                'symbol': symbol,
                'status': 'success',
                'records_processed': len(enriched_df),
                'records_stored': stored_records,
                'processing_stats': asdict(processing_stats),
                'validation_result': asdict(validation_result),
                'risk_metrics': risk_metrics,
                'data_quality_score': processing_stats.data_quality_score
            }
            
        except Exception as e:
            logger.error(f"Error processing data for {symbol}: {e}")
            return {
                'symbol': symbol,
                'status': 'failed',
                'error': str(e),
                'records_processed': 0
            }
    
    async def process_multiple_assets(self, symbols: List[str], start_date: date, end_date: date = None) -> Dict[str, Any]:
        """Process data for multiple assets concurrently"""
        logger.info(f"Processing data for {len(symbols)} assets")
        
        # Process assets concurrently
        tasks = [self.process_asset_data(symbol, start_date, end_date) for symbol in symbols]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Compile summary statistics
        successful_assets = []
        failed_assets = []
        total_records = 0
        quality_scores = []
        
        for symbol, result in zip(symbols, results):
            if isinstance(result, Exception):
                failed_assets.append({'symbol': symbol, 'error': str(result)})
            elif result.get('status') == 'success':
                successful_assets.append(result)
                total_records += result.get('records_processed', 0)
                quality_scores.append(result.get('data_quality_score', 0))
            else:
                failed_assets.append(result)
        
        # Calculate overall metrics
        success_rate = len(successful_assets) / len(symbols) if symbols else 0
        average_quality = np.mean(quality_scores) if quality_scores else 0
        
        summary = {
            'total_assets': len(symbols),
            'successful_assets': len(successful_assets),
            'failed_assets': len(failed_assets),
            'success_rate': success_rate,
            'total_records_processed': total_records,
            'average_data_quality': average_quality,
            'processing_timestamp': datetime.now().isoformat()
        }
        
        return {
            'summary': summary,
            'asset_results': successful_assets,
            'failures': failed_assets
        }
    
    async def _store_price_data(self, symbol: str, df: pd.DataFrame) -> int:
        """Store processed price data in database"""
        stored_count = 0
        
        try:
            with get_db_session() as session:
                # Get or create asset
                asset = session.query(Asset).filter(Asset.symbol == symbol).first()
                if not asset:
                    # Create basic asset record
                    asset = Asset(
                        symbol=symbol,
                        name=symbol,  # Will be updated with proper name later
                        asset_type='stock',
                        currency='USD'
                    )
                    session.add(asset)
                    session.flush()
                
                # Store price history
                for _, row in df.iterrows():
                    # Check if record already exists
                    existing = session.query(PriceHistory).filter(
                        and_(
                            PriceHistory.asset_id == asset.id,
                            PriceHistory.date == row['date']
                        )
                    ).first()
                    
                    if existing:
                        # Update existing record
                        for col in ['open_price', 'high_price', 'low_price', 'close_price', 'adjusted_close', 'volume']:
                            if col in row and not pd.isna(row[col]):
                                setattr(existing, col, float(row[col]))
                        
                        # Update technical indicators
                        for col in ['daily_return', 'volatility_20d', 'sma_20', 'sma_50', 'rsi']:
                            if col in row and not pd.isna(row[col]):
                                setattr(existing, col, float(row[col]))
                        
                        existing.data_quality = DataQuality(row.get('data_quality', 'good'))
                    else:
                        # Create new record
                        price_record = PriceHistory(
                            asset_id=asset.id,
                            date=row['date'],
                            open_price=float(row.get('open_price', 0)),
                            high_price=float(row.get('high_price', 0)),
                            low_price=float(row.get('low_price', 0)),
                            close_price=float(row.get('close_price', 0)),
                            adjusted_close=float(row.get('adjusted_close', row.get('close_price', 0))),
                            volume=int(row.get('volume', 0)),
                            daily_return=float(row['daily_return']) if 'daily_return' in row and not pd.isna(row['daily_return']) else None,
                            volatility_20d=float(row['volatility_20d']) if 'volatility_20d' in row and not pd.isna(row['volatility_20d']) else None,
                            sma_20=float(row['sma_20']) if 'sma_20' in row and not pd.isna(row['sma_20']) else None,
                            sma_50=float(row['sma_50']) if 'sma_50' in row and not pd.isna(row['sma_50']) else None,
                            rsi=float(row['rsi']) if 'rsi' in row and not pd.isna(row['rsi']) else None,
                            data_quality=DataQuality(row.get('data_quality', 'good'))
                        )
                        session.add(price_record)
                        stored_count += 1
                
                # Update asset metadata
                asset.last_data_update = datetime.now()
                
                session.commit()
                
        except Exception as e:
            logger.error(f"Error storing data for {symbol}: {e}")
        
        return stored_count
    
    async def generate_data_quality_report(self, symbols: List[str] = None, days: int = 30) -> Dict[str, Any]:
        """Generate comprehensive data quality report"""
        logger.info("Generating data quality report")
        
        try:
            with get_db_session() as session:
                # Get symbols to analyze
                if symbols is None:
                    # Get all assets with recent data
                    assets = session.query(Asset).filter(
                        Asset.is_active == True,
                        Asset.last_data_update.isnot(None)
                    ).limit(50).all()
                    symbols = [asset.symbol for asset in assets]
                
                if not symbols:
                    return {'error': 'No symbols to analyze'}
                
                # Get data quality report from market data provider
                quality_report = await self.market_data_provider.get_data_quality_report(symbols, days)
                
                # Store report in database
                db_report = DataQualityReport(
                    report_type='data_pipeline_quality',
                    symbols_analyzed=symbols,
                    date_range_start=date.today() - timedelta(days=days),
                    date_range_end=date.today(),
                    overall_quality_score=quality_report.get('overall_quality_score', 0),
                    symbol_quality_scores=quality_report.get('symbol_reports', {}),
                    issues_found=quality_report.get('issues', []),
                    recommendations=quality_report.get('recommendations', [])
                )
                
                session.add(db_report)
                session.commit()
                
                return quality_report
                
        except Exception as e:
            logger.error(f"Error generating data quality report: {e}")
            return {'error': str(e)}
    
    async def update_portfolio_performance(self, portfolio_id: int) -> Dict[str, Any]:
        """Update portfolio performance metrics"""
        try:
            with get_db_session() as session:
                portfolio = session.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
                if not portfolio:
                    return {'error': 'Portfolio not found'}
                
                # Get portfolio holdings with current prices
                holdings = session.query(PortfolioHolding).filter(
                    PortfolioHolding.portfolio_id == portfolio_id
                ).all()
                
                if not holdings:
                    return {'error': 'No holdings found'}
                
                # Calculate current portfolio value and performance
                total_value = 0
                weighted_returns = []
                sector_allocations = {}
                
                for holding in holdings:
                    # Get latest price
                    latest_price = session.query(PriceHistory).filter(
                        PriceHistory.asset_id == holding.asset_id
                    ).order_by(desc(PriceHistory.date)).first()
                    
                    if latest_price:
                        holding.current_price = latest_price.close_price
                        holding.current_value = holding.shares * holding.current_price
                        total_value += holding.current_value
                        
                        # Calculate unrealized gain/loss
                        if holding.average_cost > 0:
                            holding.unrealized_gain_loss = holding.current_value - (holding.shares * holding.average_cost)
                            holding.unrealized_gain_loss_pct = (holding.current_price - holding.average_cost) / holding.average_cost
                        
                        # Get asset sector for allocation tracking
                        if holding.asset.sector:
                            sector = holding.asset.sector
                            sector_allocations[sector] = sector_allocations.get(sector, 0) + holding.current_allocation
                
                # Update portfolio total value
                portfolio.total_value = total_value
                
                # Create performance snapshot
                snapshot = PerformanceSnapshot(
                    portfolio_id=portfolio_id,
                    snapshot_date=datetime.now(),
                    total_value=total_value,
                    sector_allocations=sector_allocations
                )
                
                # Calculate portfolio-level metrics (simplified)
                # In production, would calculate based on historical returns
                if total_value > 0:
                    # Get portfolio returns for risk metrics calculation
                    recent_snapshots = session.query(PerformanceSnapshot).filter(
                        PerformanceSnapshot.portfolio_id == portfolio_id
                    ).order_by(desc(PerformanceSnapshot.snapshot_date)).limit(252).all()
                    
                    if len(recent_snapshots) > 30:
                        values = [float(s.total_value) for s in reversed(recent_snapshots)]
                        returns = pd.Series(np.diff(values) / values[:-1])
                        
                        risk_metrics = self.statistical_calculator.calculate_risk_metrics(returns)
                        
                        snapshot.portfolio_volatility = risk_metrics.get('annual_volatility')
                        snapshot.sharpe_ratio = risk_metrics.get('sharpe_ratio')
                        snapshot.max_drawdown = risk_metrics.get('max_drawdown')
                
                session.add(snapshot)
                session.commit()
                
                return {
                    'portfolio_id': portfolio_id,
                    'total_value': float(total_value),
                    'holdings_updated': len(holdings),
                    'sector_allocations': sector_allocations,
                    'snapshot_created': True
                }
                
        except Exception as e:
            logger.error(f"Error updating portfolio performance: {e}")
            return {'error': str(e)}
    
    async def close(self):
        """Clean up resources"""
        if self.executor:
            self.executor.shutdown(wait=True)


# Example usage and testing
async def main():
    """Example usage of the data pipeline"""
    from .market_data import create_market_data_provider
    
    # Create market data provider and pipeline
    provider = await create_market_data_provider()
    pipeline = DataPipeline(provider)
    
    try:
        # Test symbols
        symbols = ['AAPL', 'MSFT', 'GOOGL']
        start_date = date.today() - timedelta(days=90)
        
        print("1. Processing multiple assets...")
        results = await pipeline.process_multiple_assets(symbols, start_date)
        print(f"Processed {results['summary']['successful_assets']} assets successfully")
        
        print("\n2. Generating data quality report...")
        quality_report = await pipeline.generate_data_quality_report(symbols, 30)
        print(f"Overall quality: {quality_report.get('overall_quality', 'unknown')}")
        
        print("\n3. Testing single asset processing...")
        single_result = await pipeline.process_asset_data('AAPL', start_date)
        print(f"AAPL processing: {single_result['status']}")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")
    
    finally:
        await pipeline.close()
        await provider.close()


if __name__ == "__main__":
    asyncio.run(main())