import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface PerformanceDataPoint {
  month: string;
  portfolio: number;
  benchmark?: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  title: string;
  showBenchmark?: boolean;
  height?: number;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="font-medium text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString()}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PerformanceChart: React.FC<PerformanceChartProps> = ({
  data,
  title,
  showBenchmark = true,
  height = 320,
  className = ""
}) => {
  return (
    <div className={`financial-card ${className}`}>
      <div className="financial-card-header">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      </div>
      
      <div className="financial-card-content">
        <div className="w-full" style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="month" 
                axisLine={false} 
                tickLine={false} 
                className="text-xs text-gray-500" 
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                className="text-xs text-gray-500"
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="var(--financial-primary)"
                strokeWidth={3}
                dot={{ fill: "var(--financial-primary)", strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: "var(--financial-primary)", strokeWidth: 2 }}
                name="Your Portfolio"
                animationDuration={1000}
              />
              
              {showBenchmark && data[0]?.benchmark && (
                <Line
                  type="monotone"
                  dataKey="benchmark"
                  stroke="var(--financial-neutral)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "var(--financial-neutral)", strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: "var(--financial-neutral)", strokeWidth: 2 }}
                  name="S&P 500 Benchmark"
                  animationDuration={1200}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Performance Summary */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">+12.6%</div>
            <div className="text-sm text-gray-600">12-Month Return</div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">8.4%</div>
            <div className="text-sm text-gray-600">Annualized Volatility</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">+1.1%</div>
            <div className="text-sm text-gray-600">vs. Benchmark</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceChart;