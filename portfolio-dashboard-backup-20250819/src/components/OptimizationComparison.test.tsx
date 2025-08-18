import React from 'react';
import OptimizationComparison from './OptimizationComparison';

// Simple test to validate component structure and props
const TestComponent: React.FC = () => {
  const mockHoldings = [
    { symbol: 'AAPL', allocation: 30, value: 50000 },
    { symbol: 'GOOGL', allocation: 25, value: 41667 },
    { symbol: 'MSFT', allocation: 25, value: 41667 },
    { symbol: 'AMZN', allocation: 20, value: 33333 }
  ];

  const mockOptimizationResult = {
    optimal_weights: { AAPL: 0.35, GOOGL: 0.25, MSFT: 0.25, AMZN: 0.15 },
    metrics: { sharpe_ratio: 1.45, volatility: 0.18, expected_return: 0.12 }
  };

  return (
    <div>
      {/* Test loading state */}
      <OptimizationComparison
        currentHoldings={mockHoldings}
        optimizationResult={null}
        loading={true}
        totalValue={166667}
      />
      
      {/* Test no result state */}
      <OptimizationComparison
        currentHoldings={mockHoldings}
        optimizationResult={null}
        loading={false}
        totalValue={166667}
      />
      
      {/* Test with results */}
      <OptimizationComparison
        currentHoldings={mockHoldings}
        optimizationResult={mockOptimizationResult}
        loading={false}
        totalValue={166667}
      />
    </div>
  );
};

export default TestComponent;