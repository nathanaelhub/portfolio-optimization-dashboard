import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

// Types for the portfolio holdings data
interface Holding {
  symbol: string;
  allocation: number;
  value: number;
}

interface PortfolioPieChartProps {
  holdings: Holding[];
  className?: string;
}

// Professional color palette for financial dashboard
const COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#8B5CF6', // Purple
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange-red
];

// Custom tooltip component
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold text-gray-800">{data.symbol}</p>
        <p className="text-sm text-gray-600">
          Allocation: <span className="font-medium">{data.allocation}%</span>
        </p>
        <p className="text-sm text-gray-600">
          Value: <span className="font-medium">${data.value.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
};

// Custom label component for percentage display
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-sm font-medium"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// Custom legend component
const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-wrap justify-center gap-4 mt-4">
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm font-medium text-gray-700">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

const PortfolioPieChart: React.FC<PortfolioPieChartProps> = ({ 
  holdings, 
  className = "" 
}) => {
  // Transform holdings data for Recharts
  const chartData = holdings.map((holding, index) => ({
    ...holding,
    fill: COLORS[index % COLORS.length]
  }));

  return (
    <div className={`w-full ${className}`}>
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
          Portfolio Allocation
        </h3>
        
        <div className="w-full h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                fill="#8884d8"
                dataKey="allocation"
                animationBegin={0}
                animationDuration={800}
              >
                {chartData.map((entry: any, index: number) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill}
                    className="hover:opacity-80 transition-opacity duration-200 cursor-pointer"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary information */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Holdings</p>
              <p className="text-xl font-semibold text-gray-800">{holdings.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-xl font-semibold text-gray-800">
                ${holdings.reduce((sum, holding) => sum + holding.value, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PortfolioPieChart;