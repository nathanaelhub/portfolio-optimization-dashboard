import React from 'react';

// Define types for the component props
interface Holding {
  symbol: string;
  allocation: number;
  value: number;
}

interface OptimizationMetrics {
  sharpe_ratio: number;
  volatility: number;
  expected_return: number;
}

interface OptimizationResult {
  optimal_weights: { [symbol: string]: number };
  metrics: OptimizationMetrics;
}

interface OptimizationComparisonProps {
  currentHoldings: Holding[];
  optimizationResult: OptimizationResult | null;
  loading?: boolean;
  totalValue: number;
}

// Animation component for progress bars
const AnimatedProgressBar: React.FC<{ 
  percentage: number; 
  color: string; 
  delay?: number;
}> = ({ percentage, color, delay = 0 }) => {
  const [animatedWidth, setAnimatedWidth] = React.useState(0);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedWidth(percentage);
    }, delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);

  return (
    <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${color}`}
        style={{ width: `${animatedWidth}%` }}
      />
    </div>
  );
};

// Component for displaying percentage changes with color coding
const PercentageChange: React.FC<{ 
  current: number; 
  optimized: number; 
  format?: 'percentage' | 'decimal';
  label: string;
}> = ({ current, optimized, format = 'decimal', label }) => {
  const change = optimized - current;
  const percentChange = current !== 0 ? (change / current) * 100 : 0;
  const isImprovement = change > 0;
  
  const formatValue = (value: number) => {
    if (format === 'percentage') {
      return `${(value * 100).toFixed(1)}%`;
    }
    return value.toFixed(2);
  };

  return (
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-1">{label}</p>
      <div className="flex items-center justify-center space-x-2">
        <span className="text-lg font-semibold">{formatValue(current)}</span>
        <span className="text-gray-400">→</span>
        <span className="text-lg font-semibold">{formatValue(optimized)}</span>
      </div>
      <div className={`flex items-center justify-center mt-1 ${
        isImprovement ? 'text-green-600' : 'text-red-600'
      }`}>
        <span className="text-sm font-medium">
          {isImprovement ? '↗' : '↘'} {Math.abs(percentChange).toFixed(1)}%
        </span>
      </div>
    </div>
  );
};

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="animate-pulse">
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <div className="bg-gray-200 rounded-lg h-64"></div>
      <div className="bg-gray-200 rounded-lg h-64"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gray-200 rounded-lg h-24"></div>
      <div className="bg-gray-200 rounded-lg h-24"></div>
      <div className="bg-gray-200 rounded-lg h-24"></div>
    </div>
  </div>
);

const OptimizationComparison: React.FC<OptimizationComparisonProps> = ({
  currentHoldings,
  optimizationResult,
  loading = false,
  totalValue
}) => {
  // Calculate current portfolio metrics (mock values for demonstration)
  const currentMetrics = {
    sharpe_ratio: 1.2, // This would come from your backend calculation
    volatility: 0.22,
    expected_return: 0.08
  };

  // Calculate optimized allocations with actual values
  const optimizedHoldings = React.useMemo(() => {
    if (!optimizationResult) return [];
    
    return Object.entries(optimizationResult.optimal_weights).map(([symbol, weight]) => ({
      symbol,
      allocation: weight * 100,
      value: weight * totalValue
    }));
  }, [optimizationResult, totalValue]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-6">Optimization Analysis</h3>
        <LoadingSkeleton />
      </div>
    );
  }

  if (!optimizationResult) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Optimization Analysis</h3>
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600">Run optimization to see the comparison</p>
        </div>
      </div>
    );
  }

  const maxAllocation = Math.max(
    ...currentHoldings.map(h => h.allocation),
    ...optimizedHoldings.map(h => h.allocation)
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 transition-all duration-500 ease-in-out">
      <h3 className="text-xl font-semibold text-gray-800 mb-6">Optimization Analysis</h3>
      
      {/* Allocation Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Current Allocation */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-3 h-3 bg-blue-500 rounded-full mr-2"></span>
            Current Allocation
          </h4>
          <div className="space-y-4">
            {currentHoldings.map((holding, index) => (
              <div key={holding.symbol} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{holding.symbol}</span>
                  <span className="text-sm font-semibold text-gray-600">
                    {holding.allocation.toFixed(1)}%
                  </span>
                </div>
                <AnimatedProgressBar
                  percentage={(holding.allocation / maxAllocation) * 100}
                  color="bg-blue-500"
                  delay={index * 100}
                />
                <div className="text-xs text-gray-500">
                  ${holding.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optimized Allocation */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
            Optimized Allocation
          </h4>
          <div className="space-y-4">
            {optimizedHoldings.map((holding, index) => (
              <div key={holding.symbol} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">{holding.symbol}</span>
                  <span className="text-sm font-semibold text-gray-600">
                    {holding.allocation.toFixed(1)}%
                  </span>
                </div>
                <AnimatedProgressBar
                  percentage={(holding.allocation / maxAllocation) * 100}
                  color="bg-green-500"
                  delay={index * 100 + 200}
                />
                <div className="text-xs text-gray-500">
                  ${holding.value.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Metrics Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sharpe Ratio */}
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-lg p-6 transform transition-all duration-300 hover:scale-105">
          <PercentageChange
            current={currentMetrics.sharpe_ratio}
            optimized={optimizationResult.metrics.sharpe_ratio}
            label="Sharpe Ratio"
          />
        </div>

        {/* Risk Reduction (Volatility) */}
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg p-6 transform transition-all duration-300 hover:scale-105">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">Risk Reduction</p>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-lg font-semibold">{(currentMetrics.volatility * 100).toFixed(1)}%</span>
              <span className="text-gray-400">→</span>
              <span className="text-lg font-semibold">{(optimizationResult.metrics.volatility * 100).toFixed(1)}%</span>
            </div>
            <div className={`flex items-center justify-center mt-1 ${
              optimizationResult.metrics.volatility < currentMetrics.volatility 
                ? 'text-green-600' 
                : 'text-red-600'
            }`}>
              <span className="text-sm font-medium">
                {optimizationResult.metrics.volatility < currentMetrics.volatility ? '↓' : '↑'} 
                {Math.abs(((optimizationResult.metrics.volatility - currentMetrics.volatility) / currentMetrics.volatility) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Expected Return */}
        <div className="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-6 transform transition-all duration-300 hover:scale-105">
          <PercentageChange
            current={currentMetrics.expected_return}
            optimized={optimizationResult.metrics.expected_return}
            format="percentage"
            label="Expected Return"
          />
        </div>
      </div>

      {/* Summary Card */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 rounded-lg p-6 border border-indigo-100">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Optimization Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <span className="text-gray-700">
              Risk-adjusted returns improved by{' '}
              <span className="font-semibold text-green-600">
                {(((optimizationResult.metrics.sharpe_ratio - currentMetrics.sharpe_ratio) / currentMetrics.sharpe_ratio) * 100).toFixed(1)}%
              </span>
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
            <span className="text-gray-700">
              Portfolio volatility{' '}
              {optimizationResult.metrics.volatility < currentMetrics.volatility ? 'reduced' : 'increased'} by{' '}
              <span className={`font-semibold ${
                optimizationResult.metrics.volatility < currentMetrics.volatility 
                  ? 'text-green-600' 
                  : 'text-red-600'
              }`}>
                {Math.abs(((optimizationResult.metrics.volatility - currentMetrics.volatility) / currentMetrics.volatility) * 100).toFixed(1)}%
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationComparison;