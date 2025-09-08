import React from 'react';

interface MetricsGridProps {
  metrics: {
    sharpe_ratio?: number;
    volatility?: number;
    expected_return?: number;
    max_drawdown?: number;
  };
}

export const MetricsGrid: React.FC<MetricsGridProps> = ({ metrics }) => {
  const metricsData = [
    {
      title: 'Sharpe Ratio',
      value: metrics.sharpe_ratio?.toFixed(2) || 'N/A',
      icon: '📊',
      description: 'Risk-adjusted return',
      color: 'text-blue-600'
    },
    {
      title: 'Annual Volatility',
      value: metrics.volatility ? `${(metrics.volatility * 100).toFixed(1)}%` : 'N/A',
      icon: '📈',
      description: 'Portfolio risk level',
      color: 'text-orange-600'
    },
    {
      title: 'Expected Return',
      value: metrics.expected_return ? `${(metrics.expected_return * 100).toFixed(1)}%` : 'N/A',
      icon: '💰',
      description: 'Projected annual return',
      color: 'text-green-600'
    },
    {
      title: 'Maximum Drawdown',
      value: metrics.max_drawdown ? `${(metrics.max_drawdown * 100).toFixed(1)}%` : 'N/A',
      icon: '⚠️',
      description: 'Worst-case scenario loss',
      color: 'text-red-600'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metricsData.map((metric, index) => (
        <div key={index} className="bg-white rounded-lg shadow p-4 border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-2xl">{metric.icon}</span>
            <span className={`text-2xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900 mb-1">
              {metric.title}
            </p>
            <p className="text-xs text-gray-500">
              {metric.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};