import React, { useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ScatterChart, ReferenceDot } from 'recharts';

interface PortfolioPoint {
  risk: number;
  return: number;
  name: string;
  allocation?: Record<string, number>;
  sharpeRatio?: number;
}

interface EfficientFrontierProps {
  efficientFrontier: PortfolioPoint[];
  currentPortfolio: PortfolioPoint;
  optimalPortfolio: PortfolioPoint;
  onPortfolioSelect?: (portfolio: PortfolioPoint) => void;
}

const EfficientFrontier: React.FC<EfficientFrontierProps> = ({
  efficientFrontier,
  currentPortfolio,
  optimalPortfolio,
  onPortfolioSelect
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<PortfolioPoint | null>(null);
  const [showEducationalTooltip, setShowEducationalTooltip] = useState(false);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const point = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg max-w-xs">
          <h3 className="font-semibold text-gray-800 mb-2">{point.name}</h3>
          <div className="space-y-1 text-sm">
            <p><span className="font-medium">Expected Return:</span> {formatPercentage(point.return)}</p>
            <p><span className="font-medium">Risk (Volatility):</span> {formatPercentage(point.risk)}</p>
            {point.sharpeRatio && (
              <p><span className="font-medium">Sharpe Ratio:</span> {point.sharpeRatio.toFixed(3)}</p>
            )}
          </div>
          {point.allocation && (
            <div className="mt-3 pt-2 border-t border-gray-100">
              <p className="font-medium text-xs text-gray-600 mb-1">Top Holdings:</p>
              {Object.entries(point.allocation)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([asset, weight]) => (
                  <p key={asset} className="text-xs text-gray-600">
                    {asset}: {formatPercentage(weight)}
                  </p>
                ))}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const EducationalTooltip = () => (
    <div className="absolute top-4 left-4 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm z-10">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold text-blue-800 text-sm mb-2">
            📈 Understanding the Efficient Frontier
          </h4>
          <p className="text-blue-700 text-xs leading-relaxed">
            This curve shows the best possible portfolios - each point offers the highest return 
            for its level of risk. Your current portfolio and the AI-suggested optimal portfolio 
            are marked for comparison.
          </p>
        </div>
        <button 
          onClick={() => setShowEducationalTooltip(false)}
          className="text-blue-600 hover:text-blue-800 ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Risk-Return Profile</h2>
        <button 
          onClick={() => setShowEducationalTooltip(true)}
          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          title="Learn about efficient frontier"
        >
          ℹ️ What is this?
        </button>
      </div>

      {showEducationalTooltip && <EducationalTooltip />}

      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              type="number" 
              dataKey="risk" 
              domain={['dataMin - 0.01', 'dataMax + 0.01']}
              tickFormatter={formatPercentage}
              label={{ value: 'Risk (Volatility)', position: 'insideBottom', offset: -10 }}
            />
            <YAxis 
              type="number" 
              dataKey="return" 
              domain={['dataMin - 0.01', 'dataMax + 0.01']}
              tickFormatter={formatPercentage}
              label={{ value: 'Expected Return', angle: -90, position: 'insideLeft' }}
            />
            <Tooltip content={<CustomTooltip />} />
            
            {/* Efficient Frontier Curve */}
            <Line 
              type="monotone" 
              dataKey="return" 
              data={efficientFrontier}
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 6, fill: '#3b82f6' }}
            />

            {/* Current Portfolio */}
            <ReferenceDot 
              x={currentPortfolio.risk} 
              y={currentPortfolio.return}
              r={8}
              fill="#ef4444"
              stroke="#dc2626"
              strokeWidth={2}
              label={{ value: "Current", position: "top" }}
            />

            {/* Optimal Portfolio */}
            <ReferenceDot 
              x={optimalPortfolio.risk} 
              y={optimalPortfolio.return}
              r={8}
              fill="#10b981"
              stroke="#059669"
              strokeWidth={2}
              label={{ value: "Optimal", position: "top" }}
            />

            {/* Interactive frontier points */}
            <Scatter 
              data={efficientFrontier} 
              fill="#3b82f6" 
              fillOpacity={0.6}
              onClick={(data) => onPortfolioSelect?.(data)}
              style={{ cursor: 'pointer' }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center mt-4 space-x-6 text-sm">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-500 rounded-full mr-2"></div>
          <span>Efficient Frontier</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-red-500 rounded-full mr-2"></div>
          <span>Your Current Portfolio</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-green-500 rounded-full mr-2"></div>
          <span>AI Recommended Portfolio</span>
        </div>
      </div>

      {/* Performance Comparison */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
          <h3 className="font-medium text-red-800 mb-2">Current Portfolio</h3>
          <div className="space-y-1 text-sm text-red-700">
            <p>Return: {formatPercentage(currentPortfolio.return)}</p>
            <p>Risk: {formatPercentage(currentPortfolio.risk)}</p>
            {currentPortfolio.sharpeRatio && (
              <p>Sharpe: {currentPortfolio.sharpeRatio.toFixed(3)}</p>
            )}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <h3 className="font-medium text-green-800 mb-2">Optimal Portfolio</h3>
          <div className="space-y-1 text-sm text-green-700">
            <p>Return: {formatPercentage(optimalPortfolio.return)}</p>
            <p>Risk: {formatPercentage(optimalPortfolio.risk)}</p>
            {optimalPortfolio.sharpeRatio && (
              <p>Sharpe: {optimalPortfolio.sharpeRatio.toFixed(3)}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EfficientFrontier;