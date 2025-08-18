import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { EducationalTooltip } from './EducationalTooltips';

interface AllocationData {
  symbol: string;
  name: string;
  allocation: number;
  value?: number;
  sector?: string;
}

interface AllocationChartProps {
  currentAllocation: AllocationData[];
  optimalAllocation: AllocationData[];
  title?: string;
  showComparison?: boolean;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
];

const AllocationChart: React.FC<AllocationChartProps> = ({
  currentAllocation,
  optimalAllocation,
  title = "Portfolio Allocation",
  showComparison = true
}) => {
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.symbol}</p>
          <p className="text-sm text-gray-600">{data.name}</p>
          <p className="text-sm">
            <span className="font-medium">Allocation:</span> {formatPercentage(data.allocation)}
          </p>
          {data.value && (
            <p className="text-sm">
              <span className="font-medium">Value:</span> ${data.value.toLocaleString()}
            </p>
          )}
          {data.sector && (
            <p className="text-sm">
              <span className="font-medium">Sector:</span> {data.sector}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const ComparisonChart = () => {
    const comparisonData = currentAllocation.map(current => {
      const optimal = optimalAllocation.find(opt => opt.symbol === current.symbol);
      return {
        symbol: current.symbol,
        current: current.allocation,
        optimal: optimal?.allocation || 0,
        difference: (optimal?.allocation || 0) - current.allocation
      };
    });

    // Add any symbols that are in optimal but not in current
    optimalAllocation.forEach(optimal => {
      if (!comparisonData.find(item => item.symbol === optimal.symbol)) {
        comparisonData.push({
          symbol: optimal.symbol,
          current: 0,
          optimal: optimal.allocation,
          difference: optimal.allocation
        });
      }
    });

    return (
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          <EducationalTooltip term="rebalancing">
            <span className="border-b border-dotted border-gray-400 cursor-help">
              Current vs Optimal Allocation
            </span>
          </EducationalTooltip>
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="symbol" />
              <YAxis tickFormatter={formatPercentage} />
              <Tooltip 
                formatter={(value: number, name: string) => [formatPercentage(value), name]}
                labelFormatter={(label) => `Symbol: ${label}`}
              />
              <Legend />
              <Bar dataKey="current" fill="#ef4444" name="Current" />
              <Bar dataKey="optimal" fill="#10b981" name="Optimal" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Rebalancing Recommendations */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">💡 Rebalancing Recommendations</h4>
          <div className="space-y-1 text-sm">
            {comparisonData
              .filter(item => Math.abs(item.difference) > 1) // Show only significant differences
              .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
              .slice(0, 5)
              .map(item => (
                <div key={item.symbol} className="flex justify-between items-center">
                  <span className="text-blue-700">{item.symbol}:</span>
                  <span className={`font-medium ${
                    item.difference > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.difference > 0 ? '+' : ''}{formatPercentage(item.difference)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">{title}</h2>
      
      <div className={`grid ${showComparison ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {/* Current Portfolio Pie Chart */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            <EducationalTooltip term="diversification">
              <span className="border-b border-dotted border-gray-400 cursor-help">
                Current Portfolio
              </span>
            </EducationalTooltip>
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentAllocation}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="allocation"
                  label={({ symbol, allocation }) => `${symbol} ${formatPercentage(allocation)}`}
                  labelLine={false}
                >
                  {currentAllocation.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Optimal Portfolio Pie Chart */}
        {showComparison && optimalAllocation.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">AI Recommended Portfolio</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={optimalAllocation}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="allocation"
                    label={({ symbol, allocation }) => `${symbol} ${formatPercentage(allocation)}`}
                    labelLine={false}
                  >
                    {optimalAllocation.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Holdings Table */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Holdings Details</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbol
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current %
                </th>
                {showComparison && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Optimal %
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sector
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentAllocation.map((holding, index) => {
                const optimal = optimalAllocation.find(opt => opt.symbol === holding.symbol);
                return (
                  <tr key={holding.symbol} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {holding.symbol}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {holding.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatPercentage(holding.allocation)}
                    </td>
                    {showComparison && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {optimal ? formatPercentage(optimal.allocation) : '0.0%'}
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {holding.sector || 'Unknown'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Chart */}
      {showComparison && optimalAllocation.length > 0 && <ComparisonChart />}
    </div>
  );
};

export default AllocationChart;