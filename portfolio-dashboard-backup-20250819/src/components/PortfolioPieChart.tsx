import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface Holding {
  symbol: string;
  allocation: number;
  value: number;
}

interface PortfolioPieChartProps {
  holdings: Holding[];
  className?: string;
}

const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16', '#F97316'];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border rounded-lg shadow-lg">
        <p className="font-semibold">{data.symbol}</p>
        <p className="text-sm">Allocation: {data.allocation}%</p>
        <p className="text-sm">Value: ${data.value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const renderLabel = ({ symbol, allocation }: any) => {
  return `${symbol} ${allocation}%`;
};

export const PortfolioPieChart: React.FC<PortfolioPieChartProps> = ({ 
  holdings, 
  className = "" 
}) => {
  const chartData = holdings.map(holding => ({
    symbol: holding.symbol,
    allocation: holding.allocation,
    value: holding.value
  }));

  const totalValue = holdings.reduce((sum, holding) => sum + holding.value, 0);

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Portfolio Allocation</h3>
      
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={renderLabel}
            outerRadius={80}
            fill="#8884d8"
            dataKey="allocation"
            animationBegin={0}
            animationDuration={800}
          >
            {chartData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Total Holdings:</span>
          <span className="font-semibold ml-2">{holdings.length}</span>
        </div>
        <div>
          <span className="text-gray-600">Total Value:</span>
          <span className="font-semibold ml-2">${totalValue.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};