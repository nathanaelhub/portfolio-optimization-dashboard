/**
 * Test suite for visualization components (charts and graphs).
 * 
 * Tests D3.js and Recharts integration, interactive features,
 * responsive design, and accessibility compliance.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

import { 
  PortfolioAllocationCharts,
  PerformanceAnalytics,
  RiskVisualizations,
  RealTimeDashboard
} from '../../components/visualizations';
import { mockPortfolioData, mockMarketData } from '../setup';

// Mock data for visualization components
const mockHoldings = [
  { symbol: 'AAPL', name: 'Apple Inc.', allocation: 0.35, value: 35000, sector: 'Technology', change: 2.5, changePercent: 1.67 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 0.30, value: 30000, sector: 'Technology', change: 1.8, changePercent: 1.2 },
  { symbol: 'JPM', name: 'JPMorgan Chase', allocation: 0.20, value: 20000, sector: 'Financial', change: -0.5, changePercent: -0.3 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', allocation: 0.15, value: 15000, sector: 'Healthcare', change: 0.8, changePercent: 0.5 }
];

const mockPerformanceData = [
  { date: '2023-01-01', portfolioValue: 98000, portfolioReturn: -0.02, benchmarkReturn: -0.015, drawdown: 0, volatility: 0.15, sharpeRatio: 0.8 },
  { date: '2023-02-01', portfolioValue: 102000, portfolioReturn: 0.02, benchmarkReturn: 0.018, drawdown: 0, volatility: 0.16, sharpeRatio: 0.82 },
  { date: '2023-03-01', portfolioValue: 105000, portfolioReturn: 0.05, benchmarkReturn: 0.04, drawdown: 0, volatility: 0.14, sharpeRatio: 0.85 }
];

const mockRiskData = {
  assets: [
    { symbol: 'AAPL', expectedReturn: 0.12, volatility: 0.20, allocation: 0.35 },
    { symbol: 'MSFT', expectedReturn: 0.10, volatility: 0.18, allocation: 0.30 },
    { symbol: 'JPM', expectedReturn: 0.08, volatility: 0.22, allocation: 0.20 },
    { symbol: 'JNJ', expectedReturn: 0.06, volatility: 0.12, allocation: 0.15 }
  ],
  correlationMatrix: {
    AAPL: { AAPL: 1.0, MSFT: 0.65, JPM: 0.42, JNJ: 0.25 },
    MSFT: { AAPL: 0.65, MSFT: 1.0, JPM: 0.38, JNJ: 0.22 },
    JPM: { AAPL: 0.42, MSFT: 0.38, JPM: 1.0, JNJ: 0.15 },
    JNJ: { AAPL: 0.25, MSFT: 0.22, JPM: 0.15, JNJ: 1.0 }
  },
  efficientFrontier: [
    { risk: 0.10, return: 0.06, sharpeRatio: 0.5, allocation: { AAPL: 0.1, MSFT: 0.1, JPM: 0.3, JNJ: 0.5 } },
    { risk: 0.15, return: 0.09, sharpeRatio: 0.6, allocation: { AAPL: 0.2, MSFT: 0.3, JPM: 0.3, JNJ: 0.2 } },
    { risk: 0.20, return: 0.12, sharpeRatio: 0.7, allocation: { AAPL: 0.4, MSFT: 0.3, JPM: 0.2, JNJ: 0.1 } }
  ]
};

describe('PortfolioAllocationCharts', () => {
  const defaultProps = {
    holdings: mockHoldings,
    isDarkMode: false,
    onHoldingClick: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Donut Chart', () => {
    it('renders donut chart with correct data', () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      expect(screen.getByTestId('donut-chart')).toBeInTheDocument();
      
      // Should show all sectors
      expect(screen.getByText('Technology')).toBeInTheDocument();
      expect(screen.getByText('Financial')).toBeInTheDocument();
      expect(screen.getByText('Healthcare')).toBeInTheDocument();
    });

    it('handles click interactions for drill-down', async () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      const techSector = screen.getByTestId('sector-segment-Technology');
      await userEvent.click(techSector);

      // Should drill down to show individual holdings
      await waitFor(() => {
        expect(screen.getByText('AAPL')).toBeInTheDocument();
        expect(screen.getByText('MSFT')).toBeInTheDocument();
      });

      // Should show reset button
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
    });

    it('shows tooltips on hover', async () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      const segment = screen.getByTestId('sector-segment-Technology');
      fireEvent.mouseEnter(segment);

      await waitFor(() => {
        const tooltip = screen.getByTestId('chart-tooltip');
        expect(tooltip).toBeInTheDocument();
        expect(within(tooltip).getByText('Technology')).toBeInTheDocument();
        expect(within(tooltip).getByText('65.0%')).toBeInTheDocument(); // AAPL + MSFT
      });
    });

    it('animates transitions smoothly', async () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      // Mock animation frame
      const mockRequestAnimationFrame = jest.fn(cb => setTimeout(cb, 16));
      global.requestAnimationFrame = mockRequestAnimationFrame;

      const segment = screen.getByTestId('sector-segment-Technology');
      await userEvent.click(segment);

      expect(mockRequestAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Treemap Visualization', () => {
    it('renders treemap with position sizes', () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      // Switch to treemap view
      const treemapTab = screen.getByRole('tab', { name: /treemap/i });
      fireEvent.click(treemapTab);

      expect(screen.getByTestId('treemap-chart')).toBeInTheDocument();
      
      // Rectangles should be sized by allocation
      const aaplRect = screen.getByTestId('treemap-rect-AAPL');
      const jnjRect = screen.getByTestId('treemap-rect-JNJ');
      
      // AAPL (35%) should be larger than JNJ (15%)
      const aaplSize = parseInt(aaplRect.getAttribute('width')) * parseInt(aaplRect.getAttribute('height'));
      const jnjSize = parseInt(jnjRect.getAttribute('width')) * parseInt(jnjRect.getAttribute('height'));
      
      expect(aaplSize).toBeGreaterThan(jnjSize);
    });

    it('colors rectangles by performance', () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      const treemapTab = screen.getByRole('tab', { name: /treemap/i });
      fireEvent.click(treemapTab);

      // Positive performance should be green
      const aaplRect = screen.getByTestId('treemap-rect-AAPL');
      expect(aaplRect).toHaveClass('fill-green-500');

      // Negative performance should be red
      const jpmRect = screen.getByTestId('treemap-rect-JPM');
      expect(jpmRect).toHaveClass('fill-red-500');
    });
  });

  describe('Sankey Diagram', () => {
    it('renders rebalancing flows', () => {
      const propsWithRebalancing = {
        ...defaultProps,
        targetAllocations: [
          { symbol: 'AAPL', allocation: 0.30 }, // Decrease from 0.35
          { symbol: 'MSFT', allocation: 0.35 }, // Increase from 0.30
          { symbol: 'JPM', allocation: 0.20 },  // No change
          { symbol: 'JNJ', allocation: 0.15 }   // No change
        ]
      };

      render(<PortfolioAllocationCharts {...propsWithRebalancing} />);

      const sankeyTab = screen.getByRole('tab', { name: /rebalancing/i });
      fireEvent.click(sankeyTab);

      expect(screen.getByTestId('sankey-diagram')).toBeInTheDocument();
      
      // Should show flows
      expect(screen.getByTestId('flow-AAPL-decrease')).toBeInTheDocument();
      expect(screen.getByTestId('flow-MSFT-increase')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('provides keyboard navigation', async () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      const chart = screen.getByTestId('donut-chart');
      chart.focus();

      // Should be able to navigate with arrow keys
      fireEvent.keyDown(chart, { key: 'ArrowRight' });
      
      await waitFor(() => {
        expect(screen.getByTestId('sector-segment-Technology')).toHaveClass('focused');
      });
    });

    it('has proper ARIA labels', () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      const chart = screen.getByTestId('donut-chart');
      expect(chart).toHaveAttribute('role', 'img');
      expect(chart).toHaveAttribute('aria-label', 'Portfolio allocation by sector');
    });

    it('provides screen reader descriptions', () => {
      render(<PortfolioAllocationCharts {...defaultProps} />);

      // Should have hidden description for screen readers
      expect(screen.getByTestId('chart-description')).toHaveAttribute('aria-hidden', 'false');
      expect(screen.getByText(/technology sector represents 65% of portfolio/i)).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('adapts colors for dark mode', () => {
      render(<PortfolioAllocationCharts {...defaultProps} isDarkMode={true} />);

      const chart = screen.getByTestId('donut-chart');
      expect(chart).toHaveClass('dark-theme');
      
      // Text should be light colored
      expect(screen.getByText('Technology')).toHaveClass('text-gray-100');
    });
  });
});

describe('PerformanceAnalytics', () => {
  const defaultProps = {
    data: mockPerformanceData,
    benchmarkName: 'S&P 500',
    isDarkMode: false,
    className: ''
  };

  describe('Multi-line Chart', () => {
    it('renders portfolio and benchmark lines', () => {
      render(<PerformanceAnalytics {...defaultProps} />);

      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('line')).toBeInTheDocument(); // Portfolio line
      
      // Should show legend
      expect(screen.getByText('Portfolio')).toBeInTheDocument();
      expect(screen.getByText('S&P 500')).toBeInTheDocument();
    });

    it('supports brush selection for time range zooming', async () => {
      render(<PerformanceAnalytics {...defaultProps} />);

      const brushArea = screen.getByTestId('brush-area');
      
      // Simulate brush selection
      fireEvent.mouseDown(brushArea, { clientX: 100, clientY: 50 });
      fireEvent.mouseMove(brushArea, { clientX: 200, clientY: 50 });
      fireEvent.mouseUp(brushArea, { clientX: 200, clientY: 50 });

      await waitFor(() => {
        expect(screen.getByTestId('reset-zoom-button')).toBeInTheDocument();
      });
    });
  });

  describe('Drawdown Visualization', () => {
    it('renders drawdown area chart', () => {
      render(<PerformanceAnalytics {...defaultProps} />);

      const drawdownTab = screen.getByRole('tab', { name: /drawdown/i });
      fireEvent.click(drawdownTab);

      expect(screen.getByTestId('area-chart')).toBeInTheDocument();
      expect(screen.getByTestId('area')).toBeInTheDocument();
    });

    it('highlights recovery periods', () => {
      const dataWithDrawdown = [
        ...mockPerformanceData,
        { date: '2023-04-01', portfolioValue: 95000, drawdown: -0.095, volatility: 0.18, sharpeRatio: 0.7 },
        { date: '2023-05-01', portfolioValue: 103000, drawdown: 0, volatility: 0.16, sharpeRatio: 0.82 }
      ];

      render(<PerformanceAnalytics {...defaultProps} data={dataWithDrawdown} />);

      const drawdownTab = screen.getByRole('tab', { name: /drawdown/i });
      fireEvent.click(drawdownTab);

      // Should highlight recovery period
      expect(screen.getByTestId('recovery-period')).toBeInTheDocument();
    });
  });

  describe('Rolling Metrics', () => {
    it('displays rolling volatility and Sharpe ratio', () => {
      render(<PerformanceAnalytics {...defaultProps} />);

      const metricsTab = screen.getByRole('tab', { name: /metrics/i });
      fireEvent.click(metricsTab);

      expect(screen.getByTestId('rolling-volatility-chart')).toBeInTheDocument();
      
      // Should have toggle for different metrics
      const sharpeToggle = screen.getByRole('button', { name: /sharpe ratio/i });
      fireEvent.click(sharpeToggle);

      expect(screen.getByTestId('rolling-sharpe-chart')).toBeInTheDocument();
    });
  });

  describe('Calendar Heatmap', () => {
    it('renders daily returns heatmap', () => {
      const dailyReturnsData = Array.from({ length: 365 }, (_, i) => ({
        date: new Date(2023, 0, i + 1).toISOString().split('T')[0],
        return: (Math.random() - 0.5) * 0.04 // Random daily returns
      }));

      render(<PerformanceAnalytics {...defaultProps} dailyReturns={dailyReturnsData} />);

      const calendarTab = screen.getByRole('tab', { name: /calendar/i });
      fireEvent.click(calendarTab);

      expect(screen.getByTestId('calendar-heatmap')).toBeInTheDocument();
      
      // Should show year selector
      expect(screen.getByRole('combobox', { name: /year/i })).toBeInTheDocument();
    });

    it('colors cells based on return magnitude', () => {
      const testData = [
        { date: '2023-01-01', return: 0.03 },  // Strong positive
        { date: '2023-01-02', return: -0.03 }, // Strong negative
        { date: '2023-01-03', return: 0.001 }  // Neutral
      ];

      render(<PerformanceAnalytics {...defaultProps} dailyReturns={testData} />);

      const calendarTab = screen.getByRole('tab', { name: /calendar/i });
      fireEvent.click(calendarTab);

      const strongPositive = screen.getByTestId('calendar-cell-2023-01-01');
      const strongNegative = screen.getByTestId('calendar-cell-2023-01-02');
      const neutral = screen.getByTestId('calendar-cell-2023-01-03');

      expect(strongPositive).toHaveClass('fill-green-600');
      expect(strongNegative).toHaveClass('fill-red-600');
      expect(neutral).toHaveClass('fill-gray-200');
    });
  });
});

describe('RiskVisualizations', () => {
  const defaultProps = {
    assets: mockRiskData.assets,
    correlationMatrix: mockRiskData.correlationMatrix,
    efficientFrontier: mockRiskData.efficientFrontier,
    currentPortfolio: { risk: 0.16, return: 0.10, sharpeRatio: 0.625 },
    isDarkMode: false
  };

  describe('Efficient Frontier', () => {
    it('renders 3D-effect efficient frontier', () => {
      render(<RiskVisualizations {...defaultProps} />);

      expect(screen.getByTestId('efficient-frontier-chart')).toBeInTheDocument();
      
      // Should show frontier points with Sharpe ratio color coding
      const frontierPoints = screen.getAllByTestId(/frontier-point-/);
      expect(frontierPoints.length).toBe(3);
    });

    it('highlights current portfolio position', () => {
      render(<RiskVisualizations {...defaultProps} />);

      const currentPortfolioMarker = screen.getByTestId('current-portfolio-marker');
      expect(currentPortfolioMarker).toBeInTheDocument();
      expect(currentPortfolioMarker).toHaveClass('current-portfolio');
    });

    it('allows selection of frontier points', async () => {
      const mockOnPointSelect = jest.fn();
      render(<RiskVisualizations {...defaultProps} onPointSelect={mockOnPointSelect} />);

      const frontierPoint = screen.getByTestId('frontier-point-1');
      await userEvent.click(frontierPoint);

      expect(mockOnPointSelect).toHaveBeenCalledWith(mockRiskData.efficientFrontier[1]);
    });
  });

  describe('Correlation Matrix', () => {
    it('renders correlation heatmap with clustering', () => {
      render(<RiskVisualizations {...defaultProps} />);

      const correlationTab = screen.getByRole('tab', { name: /correlation/i });
      fireEvent.click(correlationTab);

      expect(screen.getByTestId('correlation-heatmap')).toBeInTheDocument();
      
      // Should show all asset pairs
      expect(screen.getByTestId('correlation-cell-AAPL-MSFT')).toBeInTheDocument();
      expect(screen.getByTestId('correlation-cell-JPM-JNJ')).toBeInTheDocument();
    });

    it('highlights rows and columns on hover', async () => {
      render(<RiskVisualizations {...defaultProps} />);

      const correlationTab = screen.getByRole('tab', { name: /correlation/i });
      fireEvent.click(correlationTab);

      const cell = screen.getByTestId('correlation-cell-AAPL-MSFT');
      fireEvent.mouseEnter(cell);

      await waitFor(() => {
        expect(screen.getByTestId('row-highlight-AAPL')).toBeInTheDocument();
        expect(screen.getByTestId('col-highlight-MSFT')).toBeInTheDocument();
      });
    });

    it('shows correlation values in tooltips', async () => {
      render(<RiskVisualizations {...defaultProps} />);

      const correlationTab = screen.getByRole('tab', { name: /correlation/i });
      fireEvent.click(correlationTab);

      const cell = screen.getByTestId('correlation-cell-AAPL-MSFT');
      fireEvent.mouseEnter(cell);

      await waitFor(() => {
        const tooltip = screen.getByTestId('correlation-tooltip');
        expect(within(tooltip).getByText('AAPL vs MSFT')).toBeInTheDocument();
        expect(within(tooltip).getByText('0.65')).toBeInTheDocument();
      });
    });
  });

  describe('Risk Factor Contribution', () => {
    it('renders horizontal bar chart of risk factors', () => {
      const riskFactors = [
        { factor: 'Market Risk', contribution: 0.65, description: 'Systematic market risk' },
        { factor: 'Sector Risk', contribution: 0.25, description: 'Technology sector concentration' },
        { factor: 'Specific Risk', contribution: 0.10, description: 'Company-specific risk' }
      ];

      render(<RiskVisualizations {...defaultProps} riskFactors={riskFactors} />);

      const factorsTab = screen.getByRole('tab', { name: /risk factors/i });
      fireEvent.click(factorsTab);

      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
      
      // Should show all risk factors
      expect(screen.getByText('Market Risk')).toBeInTheDocument();
      expect(screen.getByText('Sector Risk')).toBeInTheDocument();
      expect(screen.getByText('Specific Risk')).toBeInTheDocument();
    });

    it('colors bars by contribution sign', () => {
      const mixedFactors = [
        { factor: 'Positive Factor', contribution: 0.3, description: 'Positive contribution' },
        { factor: 'Negative Factor', contribution: -0.1, description: 'Negative contribution' }
      ];

      render(<RiskVisualizations {...defaultProps} riskFactors={mixedFactors} />);

      const factorsTab = screen.getByRole('tab', { name: /risk factors/i });
      fireEvent.click(factorsTab);

      const positiveBar = screen.getByTestId('factor-bar-positive');
      const negativeBar = screen.getByTestId('factor-bar-negative');

      expect(positiveBar).toHaveClass('fill-green-500');
      expect(negativeBar).toHaveClass('fill-red-500');
    });
  });

  describe('Scenario Analysis Spider Chart', () => {
    it('renders radar chart with scenario metrics', () => {
      const scenarios = [
        {
          name: 'Bull Market',
          metrics: { return: 85, volatility: 40, maxDrawdown: 80, sharpeRatio: 90, recoveryTime: 85 }
        },
        {
          name: 'Bear Market', 
          metrics: { return: 20, volatility: 85, maxDrawdown: 25, sharpeRatio: 15, recoveryTime: 30 }
        }
      ];

      render(<RiskVisualizations {...defaultProps} scenarios={scenarios} />);

      const scenarioTab = screen.getByRole('tab', { name: /scenarios/i });
      fireEvent.click(scenarioTab);

      expect(screen.getByTestId('radar-chart')).toBeInTheDocument();
      
      // Should show scenario selector
      const scenarioSelect = screen.getByRole('combobox', { name: /scenario/i });
      expect(scenarioSelect).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('stacks charts vertically on mobile', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<RiskVisualizations {...defaultProps} />);

      const chartsContainer = screen.getByTestId('risk-charts-container');
      expect(chartsContainer).toHaveClass('flex-col');
    });

    it('reduces chart complexity on small screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 320,
      });

      render(<RiskVisualizations {...defaultProps} />);

      const correlationMatrix = screen.getByTestId('correlation-heatmap');
      // Should show simplified version
      expect(correlationMatrix).toHaveClass('simplified');
    });
  });
});

describe('RealTimeDashboard', () => {
  const mockRealTimeData = [
    { timestamp: new Date('2023-01-01T09:30:00'), portfolioValue: 100000, dayChange: 0, dayChangePercent: 0, volume: 0, volatility: 0.15 },
    { timestamp: new Date('2023-01-01T10:00:00'), portfolioValue: 101000, dayChange: 1000, dayChangePercent: 1.0, volume: 50000, volatility: 0.16 }
  ];

  const mockAlerts = [
    { id: '1', type: 'rebalance', severity: 'medium', title: 'Rebalancing Needed', message: 'Portfolio drift detected', timestamp: new Date(), action: 'Rebalance' }
  ];

  const defaultProps = {
    initialData: mockRealTimeData,
    holdings: mockHoldings,
    alerts: mockAlerts,
    isDarkMode: false,
    className: '',
    onAlertAction: jest.fn()
  };

  describe('Live Portfolio Value Widget', () => {
    it('displays current portfolio value with sparkline', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      expect(screen.getByText('$101,000')).toBeInTheDocument();
      expect(screen.getByTestId('portfolio-sparkline')).toBeInTheDocument();
      
      // Should show daily change
      expect(screen.getByText('+$1,000')).toBeInTheDocument();
      expect(screen.getByText('(+1.00%)')).toBeInTheDocument();
    });

    it('animates value changes', async () => {
      const { rerender } = render(<RealTimeDashboard {...defaultProps} />);

      // Update with new data
      const newData = [
        ...mockRealTimeData,
        { timestamp: new Date(), portfolioValue: 102000, dayChange: 2000, dayChangePercent: 2.0, volume: 75000, volatility: 0.17 }
      ];

      rerender(<RealTimeDashboard {...defaultProps} initialData={newData} />);

      // Should animate the value change
      await waitFor(() => {
        const valueElement = screen.getByTestId('animated-value');
        expect(valueElement).toHaveClass('animate-pulse');
      });
    });
  });

  describe('Real-time Holdings Table', () => {
    it('renders holdings with live price updates', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      const holdingsTable = screen.getByRole('table', { name: /live holdings/i });
      expect(holdingsTable).toBeInTheDocument();

      // Should show all holdings
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('JPM')).toBeInTheDocument();
      expect(screen.getByText('JNJ')).toBeInTheDocument();
    });

    it('supports sorting by different columns', async () => {
      render(<RealTimeDashboard {...defaultProps} />);

      const allocationHeader = screen.getByRole('columnheader', { name: /allocation/i });
      await userEvent.click(allocationHeader);

      // Should sort by allocation descending
      const rows = screen.getAllByTestId(/holding-row-/);
      const firstRowSymbol = within(rows[0]).getByTestId('symbol').textContent;
      expect(firstRowSymbol).toBe('AAPL'); // Highest allocation
    });

    it('shows inline sparklines for each holding', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      // Each holding should have a sparkline
      expect(screen.getByTestId('sparkline-AAPL')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-MSFT')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-JPM')).toBeInTheDocument();
      expect(screen.getByTestId('sparkline-JNJ')).toBeInTheDocument();
    });

    it('highlights price changes with flash animations', async () => {
      const { rerender } = render(<RealTimeDashboard {...defaultProps} />);

      // Update holdings with price changes
      const updatedHoldings = mockHoldings.map(h => 
        h.symbol === 'AAPL' ? { ...h, change: 5.0, changePercent: 3.33 } : h
      );

      rerender(<RealTimeDashboard {...defaultProps} holdings={updatedHoldings} />);

      await waitFor(() => {
        const aaplRow = screen.getByTestId('holding-row-AAPL');
        expect(aaplRow).toHaveClass('flash-green');
      });
    });
  });

  describe('Performance Attribution Chart', () => {
    it('displays sector contribution breakdown', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      expect(screen.getByTestId('attribution-chart')).toBeInTheDocument();
      
      // Should show allocation and selection effects
      expect(screen.getByText('Allocation Effect')).toBeInTheDocument();
      expect(screen.getByText('Selection Effect')).toBeInTheDocument();
    });

    it('shows positive and negative contributions with different colors', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      const techBar = screen.getByTestId('attribution-bar-Technology');
      const financeBar = screen.getByTestId('attribution-bar-Financial');

      // Technology should be positive (green), Financial negative (red)
      expect(techBar).toHaveClass('fill-green-500');
      expect(financeBar).toHaveClass('fill-red-500');
    });
  });

  describe('Alert Panel', () => {
    it('displays real-time alerts with proper categorization', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      const alertsPanel = screen.getByTestId('alerts-panel');
      expect(alertsPanel).toBeInTheDocument();

      expect(screen.getByText('Alerts (1)')).toBeInTheDocument();
      expect(screen.getByText('Rebalancing Needed')).toBeInTheDocument();
    });

    it('handles alert actions and dismissal', async () => {
      render(<RealTimeDashboard {...defaultProps} />);

      const actionButton = screen.getByRole('button', { name: /rebalance/i });
      await userEvent.click(actionButton);

      expect(defaultProps.onAlertAction).toHaveBeenCalledWith(mockAlerts[0]);

      // Should be able to dismiss alerts
      const dismissButton = screen.getByRole('button', { name: /dismiss/i });
      await userEvent.click(dismissButton);

      await waitFor(() => {
        expect(screen.queryByText('Rebalancing Needed')).not.toBeInTheDocument();
      });
    });

    it('shows different alert severities with appropriate styling', () => {
      const mixedAlerts = [
        { ...mockAlerts[0], severity: 'high' },
        { id: '2', type: 'opportunity', severity: 'low', title: 'Investment Opportunity', message: 'New opportunity detected', timestamp: new Date() }
      ];

      render(<RealTimeDashboard {...defaultProps} alerts={mixedAlerts} />);

      const highSeverityAlert = screen.getByTestId('alert-high-severity');
      const lowSeverityAlert = screen.getByTestId('alert-low-severity');

      expect(highSeverityAlert).toHaveClass('border-red-200', 'bg-red-50');
      expect(lowSeverityAlert).toHaveClass('border-blue-200', 'bg-blue-50');
    });
  });

  describe('Connection Status', () => {
    it('shows connection status indicator', () => {
      render(<RealTimeDashboard {...defaultProps} />);

      expect(screen.getByText('Connected')).toBeInTheDocument();
      
      const statusIndicator = screen.getByTestId('connection-status');
      expect(statusIndicator).toHaveClass('bg-green-500', 'animate-pulse');
    });

    it('handles disconnected state', () => {
      render(<RealTimeDashboard {...defaultProps} isConnected={false} />);

      expect(screen.getByText('Disconnected')).toBeInTheDocument();
      
      const statusIndicator = screen.getByTestId('connection-status');
      expect(statusIndicator).toHaveClass('bg-red-500');
    });
  });

  describe('Real-time Updates', () => {
    it('simulates live data updates', async () => {
      jest.useFakeTimers();
      
      render(<RealTimeDashboard {...defaultProps} />);

      // Should update every 2 seconds
      jest.advanceTimersByTime(2000);

      await waitFor(() => {
        // Portfolio value should have changed
        expect(screen.queryByText('$101,000')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });

    it('maintains performance with frequent updates', async () => {
      const startTime = performance.now();
      
      render(<RealTimeDashboard {...defaultProps} />);

      // Simulate many rapid updates
      for (let i = 0; i < 100; i++) {
        const event = new CustomEvent('portfolioUpdate', {
          detail: { portfolioValue: 100000 + i * 100 }
        });
        window.dispatchEvent(event);
      }

      const endTime = performance.now();
      const updateTime = endTime - startTime;

      // Should handle updates efficiently
      expect(updateTime).toBeLessThan(100);
    });
  });
});