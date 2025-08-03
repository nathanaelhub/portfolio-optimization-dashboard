"""
Export/Import Service for Portfolio Data
Supports multiple formats: CSV, Excel, JSON, PDF reports, and XML
"""

import asyncio
import pandas as pd
import numpy as np
import json
import xml.etree.ElementTree as ET
from typing import Dict, List, Optional, Any, Union, BinaryIO
from datetime import datetime, date
import io
import zipfile
import logging
from dataclasses import dataclass, asdict
from enum import Enum
import base64

# PDF generation
try:
    from reportlab.lib.pagesizes import letter, A4
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import inch
    from reportlab.lib import colors
    from reportlab.graphics.shapes import Drawing
    from reportlab.graphics.charts.linecharts import HorizontalLineChart
    from reportlab.graphics.charts.piecharts import Pie
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_, desc

from ..database.database import get_db_session
from ..database.models import (
    Portfolio, PortfolioHolding, Asset, PriceHistory, 
    OptimizationResult, PerformanceSnapshot, User
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ExportFormat(Enum):
    """Supported export formats"""
    CSV = "csv"
    EXCEL = "xlsx"
    JSON = "json"
    PDF = "pdf"
    XML = "xml"
    ZIP = "zip"


class ImportFormat(Enum):
    """Supported import formats"""
    CSV = "csv"
    EXCEL = "xlsx"
    JSON = "json"
    XML = "xml"


@dataclass
class ExportOptions:
    """Export configuration options"""
    format: ExportFormat
    include_historical_data: bool = True
    include_optimization_results: bool = True
    include_performance_metrics: bool = True
    date_range_days: Optional[int] = None
    custom_fields: List[str] = None
    password_protect: bool = False
    password: Optional[str] = None


@dataclass
class ImportResult:
    """Result of import operation"""
    success: bool
    records_imported: int
    records_failed: int
    errors: List[str]
    warnings: List[str]
    summary: Dict[str, Any]


class DataExporter:
    """Handles data export to various formats"""
    
    def __init__(self):
        self.supported_formats = [fmt.value for fmt in ExportFormat]
        
    async def export_portfolio(self, portfolio_id: int, options: ExportOptions) -> bytes:
        """Export portfolio data in specified format"""
        
        logger.info(f"Exporting portfolio {portfolio_id} as {options.format.value}")
        
        # Get portfolio data
        portfolio_data = await self._get_portfolio_data(portfolio_id, options)
        
        if options.format == ExportFormat.CSV:
            return await self._export_to_csv(portfolio_data)
        elif options.format == ExportFormat.EXCEL:
            return await self._export_to_excel(portfolio_data)
        elif options.format == ExportFormat.JSON:
            return await self._export_to_json(portfolio_data)
        elif options.format == ExportFormat.PDF:
            return await self._export_to_pdf(portfolio_data)
        elif options.format == ExportFormat.XML:
            return await self._export_to_xml(portfolio_data)
        elif options.format == ExportFormat.ZIP:
            return await self._export_to_zip(portfolio_data)
        else:
            raise ValueError(f"Unsupported export format: {options.format}")
    
    async def _get_portfolio_data(self, portfolio_id: int, options: ExportOptions) -> Dict[str, Any]:
        """Retrieve comprehensive portfolio data"""
        
        with get_db_session() as session:
            # Get portfolio with related data
            portfolio = session.query(Portfolio).options(
                joinedload(Portfolio.user),
                joinedload(Portfolio.holdings).joinedload(PortfolioHolding.asset)
            ).filter(Portfolio.id == portfolio_id).first()
            
            if not portfolio:
                raise ValueError(f"Portfolio {portfolio_id} not found")
            
            data = {
                'portfolio_info': {
                    'id': portfolio.id,
                    'name': portfolio.name,
                    'description': portfolio.description,
                    'created_at': portfolio.created_at.isoformat(),
                    'total_value': float(portfolio.total_value) if portfolio.total_value else 0,
                    'risk_tolerance': portfolio.risk_tolerance,
                    'base_currency': portfolio.base_currency,
                    'investment_objective': portfolio.investment_objective,
                    'owner': {
                        'username': portfolio.user.username,
                        'email': portfolio.user.email,
                        'full_name': portfolio.user.full_name
                    }
                },
                'holdings': [],
                'export_metadata': {
                    'exported_at': datetime.now().isoformat(),
                    'export_options': asdict(options),
                    'data_version': '1.0'
                }
            }
            
            # Get holdings data
            for holding in portfolio.holdings:
                holding_data = {
                    'symbol': holding.asset.symbol,
                    'name': holding.asset.name,
                    'asset_type': holding.asset.asset_type,
                    'sector': holding.asset.sector,
                    'industry': holding.asset.industry,
                    'target_allocation': float(holding.target_allocation),
                    'current_allocation': float(holding.current_allocation),
                    'shares': float(holding.shares),
                    'average_cost': float(holding.average_cost),
                    'current_price': float(holding.current_price),
                    'current_value': float(holding.current_value),
                    'unrealized_gain_loss': float(holding.unrealized_gain_loss),
                    'unrealized_gain_loss_pct': float(holding.unrealized_gain_loss_pct)
                }
                data['holdings'].append(holding_data)
            
            # Get historical price data if requested
            if options.include_historical_data:
                data['historical_data'] = await self._get_historical_data(
                    portfolio, options.date_range_days
                )
            
            # Get optimization results if requested
            if options.include_optimization_results:
                data['optimization_results'] = await self._get_optimization_results(portfolio_id)
            
            # Get performance metrics if requested
            if options.include_performance_metrics:
                data['performance_metrics'] = await self._get_performance_metrics(portfolio_id)
            
            return data
    
    async def _get_historical_data(self, portfolio: Portfolio, days: int = None) -> Dict[str, List]:
        """Get historical price data for portfolio assets"""
        
        if days is None:
            days = 365  # Default to 1 year
        
        cutoff_date = datetime.now() - pd.Timedelta(days=days)
        historical_data = {}
        
        with get_db_session() as session:
            for holding in portfolio.holdings:
                prices = session.query(PriceHistory).filter(
                    and_(
                        PriceHistory.asset_id == holding.asset_id,
                        PriceHistory.date >= cutoff_date
                    )
                ).order_by(PriceHistory.date).all()
                
                historical_data[holding.asset.symbol] = [
                    {
                        'date': price.date.isoformat(),
                        'open': float(price.open_price),
                        'high': float(price.high_price),
                        'low': float(price.low_price),
                        'close': float(price.close_price),
                        'adjusted_close': float(price.adjusted_close),
                        'volume': int(price.volume),
                        'daily_return': float(price.daily_return) if price.daily_return else None,
                        'volatility_20d': float(price.volatility_20d) if price.volatility_20d else None
                    }
                    for price in prices
                ]
        
        return historical_data
    
    async def _get_optimization_results(self, portfolio_id: int) -> List[Dict]:
        """Get optimization results for portfolio"""
        
        with get_db_session() as session:
            results = session.query(OptimizationResult).filter(
                OptimizationResult.portfolio_id == portfolio_id
            ).order_by(desc(OptimizationResult.created_at)).limit(10).all()
            
            return [
                {
                    'id': result.id,
                    'method': result.method.value,
                    'created_at': result.created_at.isoformat(),
                    'expected_return': float(result.expected_return) if result.expected_return else None,
                    'expected_volatility': float(result.expected_volatility) if result.expected_volatility else None,
                    'sharpe_ratio': float(result.sharpe_ratio) if result.sharpe_ratio else None,
                    'optimized_weights': result.optimized_weights,
                    'confidence_score': float(result.confidence_score),
                    'used_ml_predictions': result.used_ml_predictions,
                    'market_regime': result.market_regime
                }
                for result in results
            ]
    
    async def _get_performance_metrics(self, portfolio_id: int) -> Dict[str, Any]:
        """Get performance metrics for portfolio"""
        
        with get_db_session() as session:
            # Get recent performance snapshots
            snapshots = session.query(PerformanceSnapshot).filter(
                PerformanceSnapshot.portfolio_id == portfolio_id
            ).order_by(desc(PerformanceSnapshot.snapshot_date)).limit(252).all()  # 1 year of daily data
            
            if not snapshots:
                return {}
            
            # Calculate performance metrics
            values = [float(s.total_value) for s in reversed(snapshots)]
            dates = [s.snapshot_date.isoformat() for s in reversed(snapshots)]
            
            if len(values) > 1:
                returns = np.diff(values) / values[:-1]
                
                performance_metrics = {
                    'total_return': (values[-1] - values[0]) / values[0] if values[0] > 0 else 0,
                    'annual_return': np.mean(returns) * 252 if len(returns) > 0 else 0,
                    'annual_volatility': np.std(returns) * np.sqrt(252) if len(returns) > 1 else 0,
                    'sharpe_ratio': (np.mean(returns) / np.std(returns)) * np.sqrt(252) if len(returns) > 1 and np.std(returns) > 0 else 0,
                    'max_drawdown': min([(values[i] - max(values[:i+1])) / max(values[:i+1]) for i in range(1, len(values))]) if len(values) > 1 else 0,
                    'current_value': values[-1],
                    'peak_value': max(values),
                    'value_history': list(zip(dates, values)),
                    'return_history': list(zip(dates[1:], returns.tolist()))
                }
            else:
                performance_metrics = {
                    'current_value': values[0],
                    'value_history': list(zip(dates, values))
                }
            
            return performance_metrics
    
    async def _export_to_csv(self, data: Dict[str, Any]) -> bytes:
        """Export data to CSV format"""
        
        output = io.StringIO()
        
        # Export holdings as main CSV
        holdings_df = pd.DataFrame(data['holdings'])
        holdings_df.to_csv(output, index=False)
        
        # Add portfolio info as comments
        output.write(f"\n# Portfolio: {data['portfolio_info']['name']}\n")
        output.write(f"# Created: {data['portfolio_info']['created_at']}\n")
        output.write(f"# Total Value: {data['portfolio_info']['total_value']}\n")
        output.write(f"# Exported: {data['export_metadata']['exported_at']}\n")
        
        return output.getvalue().encode('utf-8')
    
    async def _export_to_excel(self, data: Dict[str, Any]) -> bytes:
        """Export data to Excel format with multiple sheets"""
        
        output = io.BytesIO()
        
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            # Portfolio summary sheet
            portfolio_summary = pd.DataFrame([data['portfolio_info']])
            portfolio_summary.to_excel(writer, sheet_name='Portfolio Summary', index=False)
            
            # Holdings sheet
            holdings_df = pd.DataFrame(data['holdings'])
            holdings_df.to_excel(writer, sheet_name='Holdings', index=False)
            
            # Historical data sheets (if available)
            if 'historical_data' in data:
                for symbol, hist_data in data['historical_data'].items():
                    if hist_data:  # Only create sheet if data exists
                        hist_df = pd.DataFrame(hist_data)
                        sheet_name = f'{symbol}_History'[:31]  # Excel sheet name limit
                        hist_df.to_excel(writer, sheet_name=sheet_name, index=False)
            
            # Optimization results sheet (if available)
            if 'optimization_results' in data and data['optimization_results']:
                opt_df = pd.DataFrame(data['optimization_results'])
                opt_df.to_excel(writer, sheet_name='Optimization Results', index=False)
            
            # Performance metrics (if available)
            if 'performance_metrics' in data and data['performance_metrics']:
                perf_data = data['performance_metrics'].copy()
                # Convert nested data to separate items
                if 'value_history' in perf_data:
                    value_history = pd.DataFrame(perf_data.pop('value_history'), columns=['Date', 'Value'])
                    value_history.to_excel(writer, sheet_name='Value History', index=False)
                
                if 'return_history' in perf_data:
                    return_history = pd.DataFrame(perf_data.pop('return_history'), columns=['Date', 'Return'])
                    return_history.to_excel(writer, sheet_name='Return History', index=False)
                
                # Remaining performance metrics
                perf_df = pd.DataFrame([perf_data])
                perf_df.to_excel(writer, sheet_name='Performance Metrics', index=False)
        
        return output.getvalue()
    
    async def _export_to_json(self, data: Dict[str, Any]) -> bytes:
        """Export data to JSON format"""
        
        # Convert numpy types to native Python types for JSON serialization
        def convert_numpy_types(obj):
            if isinstance(obj, np.integer):
                return int(obj)
            elif isinstance(obj, np.floating):
                return float(obj)
            elif isinstance(obj, np.ndarray):
                return obj.tolist()
            elif isinstance(obj, dict):
                return {key: convert_numpy_types(value) for key, value in obj.items()}
            elif isinstance(obj, list):
                return [convert_numpy_types(item) for item in obj]
            return obj
        
        clean_data = convert_numpy_types(data)
        json_str = json.dumps(clean_data, indent=2, default=str)
        
        return json_str.encode('utf-8')
    
    async def _export_to_pdf(self, data: Dict[str, Any]) -> bytes:
        """Export data to PDF report format"""
        
        if not HAS_REPORTLAB:
            raise ImportError("ReportLab is required for PDF export. Install with: pip install reportlab")
        
        output = io.BytesIO()
        doc = SimpleDocTemplate(output, pagesize=letter)
        styles = getSampleStyleSheet()
        story = []
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        story.append(Paragraph(f"Portfolio Report: {data['portfolio_info']['name']}", title_style))
        story.append(Spacer(1, 20))
        
        # Portfolio Summary
        story.append(Paragraph("Portfolio Summary", styles['Heading2']))
        
        portfolio_info = data['portfolio_info']
        summary_data = [
            ['Portfolio Name', portfolio_info['name']],
            ['Total Value', f"${portfolio_info['total_value']:,.2f}"],
            ['Risk Tolerance', f"{portfolio_info['risk_tolerance']}/10"],
            ['Investment Objective', portfolio_info.get('investment_objective', 'N/A')],
            ['Created Date', portfolio_info['created_at'][:10]],
            ['Owner', portfolio_info['owner']['full_name']]
        ]
        
        summary_table = Table(summary_data)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 14),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Holdings Table
        story.append(Paragraph("Portfolio Holdings", styles['Heading2']))
        
        holdings_data = [['Symbol', 'Name', 'Allocation', 'Shares', 'Current Price', 'Value', 'Gain/Loss']]
        for holding in data['holdings']:
            holdings_data.append([
                holding['symbol'],
                holding['name'][:20] + '...' if len(holding['name']) > 20 else holding['name'],
                f"{holding['current_allocation']:.1%}",
                f"{holding['shares']:.2f}",
                f"${holding['current_price']:.2f}",
                f"${holding['current_value']:,.2f}",
                f"{holding['unrealized_gain_loss_pct']:.1%}"
            ])
        
        holdings_table = Table(holdings_data)
        holdings_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(holdings_table)
        
        # Performance Metrics (if available)
        if 'performance_metrics' in data and data['performance_metrics']:
            story.append(PageBreak())
            story.append(Paragraph("Performance Metrics", styles['Heading2']))
            
            perf = data['performance_metrics']
            perf_data = [
                ['Total Return', f"{perf.get('total_return', 0):.1%}"],
                ['Annual Return', f"{perf.get('annual_return', 0):.1%}"],
                ['Annual Volatility', f"{perf.get('annual_volatility', 0):.1%}"],
                ['Sharpe Ratio', f"{perf.get('sharpe_ratio', 0):.2f}"],
                ['Max Drawdown', f"{perf.get('max_drawdown', 0):.1%}"],
                ['Current Value', f"${perf.get('current_value', 0):,.2f}"],
                ['Peak Value', f"${perf.get('peak_value', 0):,.2f}"]
            ]
            
            perf_table = Table(perf_data)
            perf_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            story.append(perf_table)
        
        # Footer
        story.append(Spacer(1, 30))
        footer_text = f"Generated on {data['export_metadata']['exported_at'][:19]} | Portfolio Optimization Dashboard"
        story.append(Paragraph(footer_text, styles['Normal']))
        
        doc.build(story)
        return output.getvalue()
    
    async def _export_to_xml(self, data: Dict[str, Any]) -> bytes:
        """Export data to XML format"""
        
        root = ET.Element("PortfolioExport")
        
        # Portfolio info
        portfolio_elem = ET.SubElement(root, "Portfolio")
        for key, value in data['portfolio_info'].items():
            if isinstance(value, dict):
                sub_elem = ET.SubElement(portfolio_elem, key)
                for sub_key, sub_value in value.items():
                    sub_sub_elem = ET.SubElement(sub_elem, sub_key)
                    sub_sub_elem.text = str(sub_value)
            else:
                elem = ET.SubElement(portfolio_elem, key)
                elem.text = str(value)
        
        # Holdings
        holdings_elem = ET.SubElement(root, "Holdings")
        for holding in data['holdings']:
            holding_elem = ET.SubElement(holdings_elem, "Holding")
            for key, value in holding.items():
                elem = ET.SubElement(holding_elem, key)
                elem.text = str(value)
        
        # Historical data (if available)
        if 'historical_data' in data:
            hist_elem = ET.SubElement(root, "HistoricalData")
            for symbol, hist_data in data['historical_data'].items():
                symbol_elem = ET.SubElement(hist_elem, "Asset", symbol=symbol)
                for price_data in hist_data:
                    price_elem = ET.SubElement(symbol_elem, "PriceData")
                    for key, value in price_data.items():
                        elem = ET.SubElement(price_elem, key)
                        elem.text = str(value) if value is not None else ""
        
        # Export metadata
        metadata_elem = ET.SubElement(root, "ExportMetadata")
        for key, value in data['export_metadata'].items():
            elem = ET.SubElement(metadata_elem, key)
            elem.text = str(value)
        
        # Convert to string
        ET.indent(root, space="  ", level=0)
        xml_str = ET.tostring(root, encoding='unicode')
        
        return xml_str.encode('utf-8')
    
    async def _export_to_zip(self, data: Dict[str, Any]) -> bytes:
        """Export data as ZIP file containing multiple formats"""
        
        output = io.BytesIO()
        
        with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            portfolio_name = data['portfolio_info']['name'].replace(' ', '_')
            
            # CSV export
            csv_data = await self._export_to_csv(data)
            zip_file.writestr(f"{portfolio_name}_holdings.csv", csv_data)
            
            # JSON export
            json_data = await self._export_to_json(data)
            zip_file.writestr(f"{portfolio_name}_complete.json", json_data)
            
            # Excel export
            excel_data = await self._export_to_excel(data)
            zip_file.writestr(f"{portfolio_name}_detailed.xlsx", excel_data)
            
            # XML export
            xml_data = await self._export_to_xml(data)
            zip_file.writestr(f"{portfolio_name}_structured.xml", xml_data)
            
            # PDF export (if ReportLab available)
            if HAS_REPORTLAB:
                try:
                    pdf_data = await self._export_to_pdf(data)
                    zip_file.writestr(f"{portfolio_name}_report.pdf", pdf_data)
                except Exception as e:
                    logger.warning(f"PDF generation failed: {e}")
            
            # Add README
            readme_content = f"""Portfolio Export Package
========================

Portfolio: {data['portfolio_info']['name']}
Exported: {data['export_metadata']['exported_at']}

Files included:
- {portfolio_name}_holdings.csv: Basic holdings data in CSV format
- {portfolio_name}_complete.json: Complete portfolio data in JSON format
- {portfolio_name}_detailed.xlsx: Detailed Excel workbook with multiple sheets
- {portfolio_name}_structured.xml: Structured XML export
- {portfolio_name}_report.pdf: Professional PDF report (if available)

Import these files back into the system using the import functionality.
"""
            zip_file.writestr("README.txt", readme_content.encode('utf-8'))
        
        return output.getvalue()


class DataImporter:
    """Handles data import from various formats"""
    
    def __init__(self):
        self.supported_formats = [fmt.value for fmt in ImportFormat]
    
    async def import_portfolio(self, user_id: int, file_content: bytes, 
                             format: ImportFormat, filename: str = None) -> ImportResult:
        """Import portfolio data from file"""
        
        logger.info(f"Importing portfolio data as {format.value}")
        
        try:
            if format == ImportFormat.CSV:
                return await self._import_from_csv(user_id, file_content)
            elif format == ImportFormat.EXCEL:
                return await self._import_from_excel(user_id, file_content)
            elif format == ImportFormat.JSON:
                return await self._import_from_json(user_id, file_content)
            elif format == ImportFormat.XML:
                return await self._import_from_xml(user_id, file_content)
            else:
                raise ValueError(f"Unsupported import format: {format}")
                
        except Exception as e:
            logger.error(f"Import failed: {e}")
            return ImportResult(
                success=False,
                records_imported=0,
                records_failed=0,
                errors=[str(e)],
                warnings=[],
                summary={}
            )
    
    async def _import_from_csv(self, user_id: int, file_content: bytes) -> ImportResult:
        """Import portfolio from CSV file"""
        
        try:
            # Read CSV
            df = pd.read_csv(io.StringIO(file_content.decode('utf-8')))
            
            # Validate required columns
            required_columns = ['symbol', 'target_allocation']
            missing_columns = [col for col in required_columns if col not in df.columns]
            
            if missing_columns:
                return ImportResult(
                    success=False,
                    records_imported=0,
                    records_failed=len(df),
                    errors=[f"Missing required columns: {missing_columns}"],
                    warnings=[],
                    summary={}
                )
            
            # Create portfolio
            portfolio_name = f"Imported Portfolio {datetime.now().strftime('%Y%m%d_%H%M%S')}"
            
            with get_db_session() as session:
                portfolio = Portfolio(
                    user_id=user_id,
                    name=portfolio_name,
                    description="Portfolio imported from CSV file"
                )
                session.add(portfolio)
                session.flush()
                
                imported_count = 0
                failed_count = 0
                errors = []
                warnings = []
                
                for _, row in df.iterrows():
                    try:
                        # Get or create asset
                        asset = session.query(Asset).filter(Asset.symbol == row['symbol']).first()
                        if not asset:
                            asset = Asset(
                                symbol=row['symbol'],
                                name=row.get('name', row['symbol']),
                                asset_type=row.get('asset_type', 'stock'),
                                sector=row.get('sector', 'Unknown'),
                                industry=row.get('industry', 'Unknown')
                            )
                            session.add(asset)
                            session.flush()
                        
                        # Create holding
                        holding = PortfolioHolding(
                            portfolio_id=portfolio.id,
                            asset_id=asset.id,
                            target_allocation=float(row['target_allocation']),
                            current_allocation=float(row.get('current_allocation', row['target_allocation'])),
                            shares=float(row.get('shares', 0)),
                            average_cost=float(row.get('average_cost', 0)),
                            current_price=float(row.get('current_price', 0)),
                            current_value=float(row.get('current_value', 0))
                        )
                        session.add(holding)
                        imported_count += 1
                        
                    except Exception as e:
                        failed_count += 1
                        errors.append(f"Row {imported_count + failed_count}: {str(e)}")
                
                session.commit()
                
                return ImportResult(
                    success=imported_count > 0,
                    records_imported=imported_count,
                    records_failed=failed_count,
                    errors=errors,
                    warnings=warnings,
                    summary={
                        'portfolio_id': portfolio.id,
                        'portfolio_name': portfolio_name,
                        'total_holdings': imported_count
                    }
                )
                
        except Exception as e:
            return ImportResult(
                success=False,
                records_imported=0,
                records_failed=0,
                errors=[f"CSV parsing error: {str(e)}"],
                warnings=[],
                summary={}
            )
    
    async def _import_from_json(self, user_id: int, file_content: bytes) -> ImportResult:
        """Import portfolio from JSON file"""
        
        try:
            data = json.loads(file_content.decode('utf-8'))
            
            # Validate JSON structure
            if 'portfolio_info' not in data or 'holdings' not in data:
                return ImportResult(
                    success=False,
                    records_imported=0,
                    records_failed=0,
                    errors=["Invalid JSON structure. Must contain 'portfolio_info' and 'holdings'"],
                    warnings=[],
                    summary={}
                )
            
            with get_db_session() as session:
                # Create portfolio
                portfolio_info = data['portfolio_info']
                portfolio = Portfolio(
                    user_id=user_id,
                    name=portfolio_info.get('name', 'Imported Portfolio'),
                    description=portfolio_info.get('description', 'Portfolio imported from JSON'),
                    risk_tolerance=portfolio_info.get('risk_tolerance', 5),
                    base_currency=portfolio_info.get('base_currency', 'USD'),
                    investment_objective=portfolio_info.get('investment_objective')
                )
                session.add(portfolio)
                session.flush()
                
                imported_count = 0
                failed_count = 0
                errors = []
                warnings = []
                
                for holding_data in data['holdings']:
                    try:
                        # Get or create asset
                        symbol = holding_data['symbol']
                        asset = session.query(Asset).filter(Asset.symbol == symbol).first()
                        if not asset:
                            asset = Asset(
                                symbol=symbol,
                                name=holding_data.get('name', symbol),
                                asset_type=holding_data.get('asset_type', 'stock'),
                                sector=holding_data.get('sector', 'Unknown'),
                                industry=holding_data.get('industry', 'Unknown')
                            )
                            session.add(asset)
                            session.flush()
                        
                        # Create holding
                        holding = PortfolioHolding(
                            portfolio_id=portfolio.id,
                            asset_id=asset.id,
                            target_allocation=float(holding_data['target_allocation']),
                            current_allocation=float(holding_data.get('current_allocation', holding_data['target_allocation'])),
                            shares=float(holding_data.get('shares', 0)),
                            average_cost=float(holding_data.get('average_cost', 0)),
                            current_price=float(holding_data.get('current_price', 0)),
                            current_value=float(holding_data.get('current_value', 0))
                        )
                        session.add(holding)
                        imported_count += 1
                        
                    except Exception as e:
                        failed_count += 1
                        errors.append(f"Holding {holding_data.get('symbol', 'unknown')}: {str(e)}")
                
                session.commit()
                
                return ImportResult(
                    success=imported_count > 0,
                    records_imported=imported_count,
                    records_failed=failed_count,
                    errors=errors,
                    warnings=warnings,
                    summary={
                        'portfolio_id': portfolio.id,
                        'portfolio_name': portfolio.name,
                        'total_holdings': imported_count
                    }
                )
                
        except json.JSONDecodeError as e:
            return ImportResult(
                success=False,
                records_imported=0,
                records_failed=0,
                errors=[f"JSON parsing error: {str(e)}"],
                warnings=[],
                summary={}
            )
    
    async def _import_from_excel(self, user_id: int, file_content: bytes) -> ImportResult:
        """Import portfolio from Excel file"""
        
        try:
            # Read Excel file
            excel_file = pd.ExcelFile(io.BytesIO(file_content))
            
            # Look for holdings sheet
            holdings_sheet = None
            for sheet_name in excel_file.sheet_names:
                if 'holdings' in sheet_name.lower() or sheet_name == excel_file.sheet_names[0]:
                    holdings_sheet = sheet_name
                    break
            
            if not holdings_sheet:
                return ImportResult(
                    success=False,
                    records_imported=0,
                    records_failed=0,
                    errors=["No holdings sheet found in Excel file"],
                    warnings=[],
                    summary={}
                )
            
            df = pd.read_excel(excel_file, sheet_name=holdings_sheet)
            
            # Convert to CSV format and reuse CSV import logic
            csv_content = df.to_csv(index=False).encode('utf-8')
            return await self._import_from_csv(user_id, csv_content)
            
        except Exception as e:
            return ImportResult(
                success=False,
                records_imported=0,
                records_failed=0,
                errors=[f"Excel parsing error: {str(e)}"],
                warnings=[],
                summary={}
            )
    
    async def _import_from_xml(self, user_id: int, file_content: bytes) -> ImportResult:
        """Import portfolio from XML file"""
        
        try:
            root = ET.fromstring(file_content.decode('utf-8'))
            
            # Extract portfolio info
            portfolio_elem = root.find('Portfolio')
            if portfolio_elem is None:
                return ImportResult(
                    success=False,
                    records_imported=0,
                    records_failed=0,
                    errors=["Invalid XML structure. Missing Portfolio element"],
                    warnings=[],
                    summary={}
                )
            
            # Extract holdings
            holdings_elem = root.find('Holdings')
            if holdings_elem is None:
                return ImportResult(
                    success=False,
                    records_imported=0,
                    records_failed=0,
                    errors=["Invalid XML structure. Missing Holdings element"],
                    warnings=[],
                    summary={}
                )
            
            with get_db_session() as session:
                # Create portfolio
                portfolio_name = portfolio_elem.find('name')
                portfolio_name = portfolio_name.text if portfolio_name is not None else 'Imported Portfolio'
                
                portfolio = Portfolio(
                    user_id=user_id,
                    name=portfolio_name,
                    description="Portfolio imported from XML file"
                )
                session.add(portfolio)
                session.flush()
                
                imported_count = 0
                failed_count = 0
                errors = []
                
                for holding_elem in holdings_elem.findall('Holding'):
                    try:
                        symbol_elem = holding_elem.find('symbol')
                        allocation_elem = holding_elem.find('target_allocation')
                        
                        if symbol_elem is None or allocation_elem is None:
                            failed_count += 1
                            errors.append("Missing required fields: symbol or target_allocation")
                            continue
                        
                        symbol = symbol_elem.text
                        target_allocation = float(allocation_elem.text)
                        
                        # Get or create asset
                        asset = session.query(Asset).filter(Asset.symbol == symbol).first()
                        if not asset:
                            name_elem = holding_elem.find('name')
                            asset = Asset(
                                symbol=symbol,
                                name=name_elem.text if name_elem is not None else symbol,
                                asset_type='stock'
                            )
                            session.add(asset)
                            session.flush()
                        
                        # Create holding
                        holding = PortfolioHolding(
                            portfolio_id=portfolio.id,
                            asset_id=asset.id,
                            target_allocation=target_allocation,
                            current_allocation=target_allocation
                        )
                        session.add(holding)
                        imported_count += 1
                        
                    except Exception as e:
                        failed_count += 1
                        errors.append(f"Holding import error: {str(e)}")
                
                session.commit()
                
                return ImportResult(
                    success=imported_count > 0,
                    records_imported=imported_count,
                    records_failed=failed_count,
                    errors=errors,
                    warnings=[],
                    summary={
                        'portfolio_id': portfolio.id,
                        'portfolio_name': portfolio.name,
                        'total_holdings': imported_count
                    }
                )
                
        except ET.ParseError as e:
            return ImportResult(
                success=False,
                records_imported=0,
                records_failed=0,
                errors=[f"XML parsing error: {str(e)}"],
                warnings=[],
                summary={}
            )


# Example usage
async def main():
    """Example usage of export/import functionality"""
    
    # Initialize services
    exporter = DataExporter()
    importer = DataImporter()
    
    try:
        # Export example
        print("1. Exporting portfolio to JSON...")
        export_options = ExportOptions(
            format=ExportFormat.JSON,
            include_historical_data=True,
            include_optimization_results=True
        )
        
        # Would use actual portfolio ID
        # json_data = await exporter.export_portfolio(1, export_options)
        # print(f"Exported {len(json_data)} bytes")
        
        # Import example
        print("2. Import functionality ready")
        # sample_csv = b"symbol,name,target_allocation\nAAPL,Apple Inc.,0.3\nMSFT,Microsoft Corp.,0.25\nGOOGL,Alphabet Inc.,0.2"
        # result = await importer.import_portfolio(1, sample_csv, ImportFormat.CSV)
        # print(f"Import result: {result.success}, imported: {result.records_imported}")
        
    except Exception as e:
        logger.error(f"Error in main: {e}")


if __name__ == "__main__":
    asyncio.run(main())