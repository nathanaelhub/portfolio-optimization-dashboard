/**
 * Test suite for OptimizationResults component.
 * 
 * Tests visualization of optimization results, metric display,
 * chart interactions, and accessibility compliance.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import OptimizationResults from '../../components/OptimizationResults';
import { mockOptimizationResult, mockPortfolioData } from '../setup';

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

describe('OptimizationResults', () => {
  const mockProps = {
    results: mockOptimizationResult,
    originalPortfolio: mockPortfolioData,
    onAccept: vi.fn(),
    onReject: vi.fn(),
    onExport: vi.fn(),
    isLoading: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Results Display', () => {
    it('renders optimization metrics correctly', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Check key metrics are displayed
      expect(screen.getByText(/expected return/i)).toBeInTheDocument();
      expect(screen.getByText('12.5%')).toBeInTheDocument(); // Expected return
      
      expect(screen.getByText(/volatility/i)).toBeInTheDocument();
      expect(screen.getByText('15.5%')).toBeInTheDocument(); // Volatility
      
      expect(screen.getByText(/sharpe ratio/i)).toBeInTheDocument();
      expect(screen.getByText('0.806')).toBeInTheDocument(); // Sharpe ratio
    });

    it('displays asset allocation weights as percentages', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Check allocation table
      expect(screen.getByText('AAPL')).toBeInTheDocument();
      expect(screen.getByText('35.0%')).toBeInTheDocument(); // 0.35 * 100
      
      expect(screen.getByText('MSFT')).toBeInTheDocument();
      expect(screen.getByText('35.0%')).toBeInTheDocument();
      
      expect(screen.getByText('GOOGL')).toBeInTheDocument();
      expect(screen.getByText('30.0%')).toBeInTheDocument();
    });

    it('shows comparison with original portfolio', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Should show before/after comparison
      expect(screen.getByText(/before optimization/i)).toBeInTheDocument();
      expect(screen.getByText(/after optimization/i)).toBeInTheDocument();

      // Should show improvement metrics
      const improvementSection = screen.getByTestId('improvement-metrics');
      expect(within(improvementSection).getByText(/improvement/i)).toBeInTheDocument();
    });

    it('displays advanced risk metrics when expanded', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Click to expand advanced metrics
      const expandButton = screen.getByRole('button', { name: /advanced metrics/i });
      await userEvent.click(expandButton);

      await waitFor(() => {
        expect(screen.getByText(/treynor ratio/i)).toBeInTheDocument();
        expect(screen.getByText(/information ratio/i)).toBeInTheDocument();
        expect(screen.getByText(/maximum drawdown/i)).toBeInTheDocument();
        expect(screen.getByText(/value at risk/i)).toBeInTheDocument();
      });
    });

    it('formats large numbers with appropriate units', () => {
      const largePortfolioProps = {
        ...mockProps,
        originalPortfolio: {
          ...mockPortfolioData,
          totalValue: 1500000 // $1.5M
        }
      };

      render(
        <TestWrapper>
          <OptimizationResults {...largePortfolioProps} />
        </TestWrapper>
      );

      // Should format large numbers appropriately
      expect(screen.getByText('$1.5M')).toBeInTheDocument();
    });
  });

  describe('Visualization Components', () => {
    it('renders allocation pie chart', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      expect(screen.getByTestId('allocation-pie-chart')).toBeInTheDocument();
      
      // Check chart has proper data
      const chart = screen.getByTestId('pie-chart');
      expect(chart).toBeInTheDocument();
    });

    it('renders efficient frontier chart when available', () => {
      const propsWithFrontier = {
        ...mockProps,
        results: {
          ...mockOptimizationResult,
          efficientFrontier: [
            { risk: 0.10, return: 0.08, sharpeRatio: 0.6 },
            { risk: 0.15, return: 0.12, sharpeRatio: 0.8 },
            { risk: 0.20, return: 0.15, sharpeRatio: 0.7 }
          ]
        }
      };

      render(
        <TestWrapper>
          <OptimizationResults {...propsWithFrontier} />
        </TestWrapper>
      );

      expect(screen.getByTestId('efficient-frontier-chart')).toBeInTheDocument();
      
      // Should show current portfolio position on frontier
      expect(screen.getByTestId('current-portfolio-marker')).toBeInTheDocument();
    });

    it('displays correlation matrix heatmap', async () => {
      const propsWithCorrelation = {
        ...mockProps,
        results: {
          ...mockOptimizationResult,
          correlationMatrix: {
            AAPL: { AAPL: 1.0, MSFT: 0.65, GOOGL: 0.72 },
            MSFT: { AAPL: 0.65, MSFT: 1.0, GOOGL: 0.58 },
            GOOGL: { AAPL: 0.72, MSFT: 0.58, GOOGL: 1.0 }
          }
        }
      };

      render(
        <TestWrapper>
          <OptimizationResults {...propsWithCorrelation} />
        </TestWrapper>
      );

      // Click to show correlation matrix
      await userEvent.click(screen.getByRole('button', { name: /correlation matrix/i }));

      await waitFor(() => {
        expect(screen.getByTestId('correlation-heatmap')).toBeInTheDocument();
      });
    });
  });

  describe('Interactive Features', () => {
    it('handles accept button click', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByRole('button', { name: /accept/i }));

      expect(mockProps.onAccept).toHaveBeenCalledWith(mockOptimizationResult);
    });

    it('handles reject button click with confirmation', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      await userEvent.click(screen.getByRole('button', { name: /reject/i }));

      // Should show confirmation dialog
      expect(screen.getByText(/are you sure/i)).toBeInTheDocument();
      
      await userEvent.click(screen.getByRole('button', { name: /confirm/i }));

      expect(mockProps.onReject).toHaveBeenCalled();
    });

    it('exports results in different formats', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Click export dropdown
      await userEvent.click(screen.getByRole('button', { name: /export/i }));

      // Select PDF export
      await userEvent.click(screen.getByRole('menuitem', { name: /pdf/i }));

      expect(mockProps.onExport).toHaveBeenCalledWith('pdf');
    });

    it('allows drilling down into individual asset details', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Click on AAPL row
      const aaplRow = screen.getByTestId('asset-row-AAPL');
      await userEvent.click(aaplRow);

      // Should show asset detail modal
      await waitFor(() => {
        expect(screen.getByTestId('asset-detail-modal')).toBeInTheDocument();
        expect(screen.getByText(/AAPL details/i)).toBeInTheDocument();
      });
    });

    it('supports chart interaction and tooltips', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      const pieChart = screen.getByTestId('allocation-pie-chart');
      
      // Hover over chart segment
      fireEvent.mouseEnter(pieChart);

      await waitFor(() => {
        expect(screen.getByTestId('chart-tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state during optimization', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} isLoading={true} />
        </TestWrapper>
      );

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText(/optimizing portfolio/i)).toBeInTheDocument();
      
      // Action buttons should be disabled
      expect(screen.getByRole('button', { name: /accept/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /reject/i })).toBeDisabled();
    });

    it('displays error message when optimization fails', () => {
      const errorProps = {
        ...mockProps,
        error: 'Optimization failed: Insufficient data'
      };

      render(
        <TestWrapper>
          <OptimizationResults {...errorProps} />
        </TestWrapper>
      );

      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/optimization failed/i)).toBeInTheDocument();
      expect(screen.getByText(/insufficient data/i)).toBeInTheDocument();
    });

    it('handles missing or incomplete results gracefully', () => {
      const incompleteProps = {
        ...mockProps,
        results: {
          weights: { AAPL: 1.0 },
          expectedReturn: 0.10,
          volatility: null, // Missing volatility
          sharpeRatio: undefined // Missing Sharpe ratio
        }
      };

      render(
        <TestWrapper>
          <OptimizationResults {...incompleteProps} />
        </TestWrapper>
      );

      // Should show available data and handle missing gracefully
      expect(screen.getByText('10.0%')).toBeInTheDocument(); // Expected return
      expect(screen.getByText(/not available/i)).toBeInTheDocument(); // For missing metrics
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Check main container has proper role
      expect(screen.getByRole('region', { name: /optimization results/i })).toBeInTheDocument();

      // Check data tables have proper headers
      const allocationTable = screen.getByRole('table', { name: /asset allocation/i });
      expect(allocationTable).toBeInTheDocument();
      
      const headers = within(allocationTable).getAllByRole('columnheader');
      expect(headers).toHaveLength(3); // Symbol, Allocation, Change
    });

    it('provides screen reader announcements for dynamic content', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Expand advanced metrics
      await userEvent.click(screen.getByRole('button', { name: /advanced metrics/i }));

      // Should announce the change
      await waitFor(() => {
        const announcement = screen.getByRole('status');
        expect(announcement).toHaveAttribute('aria-live', 'polite');
      });
    });

    it('supports keyboard navigation through interactive elements', async () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      const acceptButton = screen.getByRole('button', { name: /accept/i });
      const rejectButton = screen.getByRole('button', { name: /reject/i });
      const exportButton = screen.getByRole('button', { name: /export/i });

      // Should be able to tab through buttons
      acceptButton.focus();
      expect(document.activeElement).toBe(acceptButton);

      await userEvent.tab();
      expect(document.activeElement).toBe(rejectButton);

      await userEvent.tab();
      expect(document.activeElement).toBe(exportButton);
    });

    it('has appropriate color contrast for metrics display', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Check that positive/negative metrics have sufficient contrast
      const positiveMetric = screen.getByTestId('positive-metric');
      const negativeMetric = screen.getByTestId('negative-metric');

      expect(positiveMetric).toHaveClass('text-green-600'); // Should use accessible green
      expect(negativeMetric).toHaveClass('text-red-600'); // Should use accessible red
    });
  });

  describe('Responsive Design', () => {
    it('adapts layout for mobile screens', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Charts should stack vertically on mobile
      const chartsContainer = screen.getByTestId('charts-container');
      expect(chartsContainer).toHaveClass('flex-col'); // Assuming Tailwind classes
    });

    it('adjusts table layout for smaller screens', () => {
      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      const allocationTable = screen.getByRole('table');
      
      // Should have horizontal scroll on small screens
      expect(allocationTable.parentElement).toHaveClass('overflow-x-auto');
    });

    it('collapses advanced sections by default on mobile', () => {
      // Mock mobile device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        configurable: true
      });

      render(
        <TestWrapper>
          <OptimizationResults {...mockProps} />
        </TestWrapper>
      );

      // Advanced metrics should be collapsed by default on mobile
      expect(screen.queryByText(/treynor ratio/i)).not.toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('efficiently renders large portfolios', () => {
      const largePortfolioResults = {
        ...mockOptimizationResult,
        weights: Object.fromEntries(
          Array.from({ length: 100 }, (_, i) => [`STOCK${i}`, 0.01])
        )
      };

      const startTime = performance.now();
      
      render(
        <TestWrapper>
          <OptimizationResults 
            {...mockProps} 
            results={largePortfolioResults}
          />
        </TestWrapper>
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render within reasonable time (< 100ms)
      expect(renderTime).toBeLessThan(100);
    });

    it('virtualizes long asset lists', () => {
      const manyAssetsResults = {
        ...mockOptimizationResult,
        weights: Object.fromEntries(
          Array.from({ length: 500 }, (_, i) => [`STOCK${i.toString().padStart(3, '0')}`, 0.002])
        )
      };

      render(
        <TestWrapper>
          <OptimizationResults 
            {...mockProps} 
            results={manyAssetsResults}
          />
        </TestWrapper>
      );

      // Should virtualize the list (not render all 500 DOM elements)
      const renderedRows = screen.getAllByTestId(/asset-row-/);
      expect(renderedRows.length).toBeLessThan(50); // Should render only visible rows
    });

    it('debounces chart interactions', async () => {
      const mockChartInteraction = vi.fn();
      
      render(
        <TestWrapper>
          <OptimizationResults 
            {...mockProps} 
            onChartInteraction={mockChartInteraction}
          />
        </TestWrapper>
      );

      const chart = screen.getByTestId('allocation-pie-chart');

      // Rapidly trigger mouse events
      for (let i = 0; i < 10; i++) {
        fireEvent.mouseMove(chart, { clientX: i * 10, clientY: i * 10 });
      }

      // Should debounce the calls
      await waitFor(() => {
        expect(mockChartInteraction).toHaveBeenCalledTimes(1);
      }, { timeout: 1000 });
    });
  });

  describe('Data Validation', () => {
    it('validates allocation percentages sum to 100%', () => {
      const invalidResults = {
        ...mockOptimizationResult,
        weights: {
          AAPL: 0.4,
          MSFT: 0.3,
          GOOGL: 0.2 // Sum = 0.9, not 1.0
        }
      };

      render(
        <TestWrapper>
          <OptimizationResults 
            {...mockProps} 
            results={invalidResults}
          />
        </TestWrapper>
      );

      // Should show validation warning
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/allocation percentages do not sum to 100%/i)).toBeInTheDocument();
    });

    it('handles negative weights appropriately', () => {
      const negativeWeightResults = {
        ...mockOptimizationResult,
        weights: {
          AAPL: 0.6,
          MSFT: 0.5,
          GOOGL: -0.1 // Short position
        }
      };

      render(
        <TestWrapper>
          <OptimizationResults 
            {...mockProps} 
            results={negativeWeightResults}
          />
        </TestWrapper>
      );

      // Should display negative weight with proper formatting
      expect(screen.getByText('-10.0%')).toBeInTheDocument();
      
      // Should show short position indicator
      expect(screen.getByTestId('short-position-indicator')).toBeInTheDocument();
    });

    it('validates metric ranges are reasonable', () => {
      const unreasonableResults = {
        ...mockOptimizationResult,
        expectedReturn: 5.0, // 500% return - unrealistic
        volatility: -0.1, // Negative volatility - impossible
        sharpeRatio: 100 // Extremely high Sharpe ratio
      };

      render(
        <TestWrapper>
          <OptimizationResults 
            {...mockProps} 
            results={unreasonableResults}
          />
        </TestWrapper>
      );

      // Should show data quality warnings
      const warnings = screen.getAllByRole('alert');
      expect(warnings.length).toBeGreaterThan(0);
      expect(screen.getByText(/unusual metric values detected/i)).toBeInTheDocument();
    });
  });
});