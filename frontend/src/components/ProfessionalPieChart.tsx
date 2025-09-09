import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ChartDataItem {
  name: string;
  value: number;
  amount?: number;
  color: string;
}

interface ProfessionalPieChartProps {
  data: ChartDataItem[];
  title: string;
  showLegend?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-600">
          {data.amount && `$${data.amount.toLocaleString()} • `}{data.value}%
        </p>
      </div>
    );
  }
  return null;
};

const ProfessionalPieChart: React.FC<ProfessionalPieChartProps> = ({
  data,
  title,
  showLegend = true,
  innerRadius = 60,
  outerRadius = 120,
  className = ""
}) => {
  return (
    <div className={`financial-card ${className}`}>
      <div className="financial-card-header">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="financial-card-content">
        <div className="flex flex-col lg:flex-row items-center space-y-4 lg:space-y-0 lg:space-x-6">
          {/* Chart */}
          <div className="w-full lg:w-1/2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadius}
                  outerRadius={outerRadius}
                  paddingAngle={2}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={800}
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          {/* Legend */}
          {showLegend && (
            <div className="w-full lg:w-1/2 space-y-3">
              {data.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-gray-900">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900">{item.value}%</div>
                    {item.amount && (
                      <div className="text-sm text-gray-500">
                        ${item.amount.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfessionalPieChart;