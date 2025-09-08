import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock historical performance data over 12 months
const mockData = [
  { month: 'Jan', value: 100000 },
  { month: 'Feb', value: 102500 },
  { month: 'Mar', value: 98750 },
  { month: 'Apr', value: 105200 },
  { month: 'May', value: 108900 },
  { month: 'Jun', value: 112400 },
  { month: 'Jul', value: 115800 },
  { month: 'Aug', value: 119200 },
  { month: 'Sep', value: 123600 },
  { month: 'Oct', value: 128400 },
  { month: 'Nov', value: 135200 },
  { month: 'Dec', value: 166667 }, // Current value from portfolioData
];

export const PortfolioGrowthChart: React.FC = () => {
  const formatValue = (value: number) => {
    return `$${(value / 1000).toFixed(0)}k`;
  };

  const formatTooltipValue = (value: number) => {
    return [`$${value.toLocaleString()}`, 'Portfolio Value'];
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold mb-4">Portfolio Growth</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="month" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              tickFormatter={formatValue}
              stroke="#6b7280"
              fontSize={12}
            />
            <Tooltip 
              formatter={formatTooltipValue}
              labelStyle={{ color: '#374151' }}
              contentStyle={{ 
                backgroundColor: '#f9fafb', 
                border: '1px solid #e5e7eb',
                borderRadius: '6px'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm text-gray-600">
          12-month portfolio performance showing growth from $100,000 to $166,667
        </p>
      </div>
    </div>
  );
};