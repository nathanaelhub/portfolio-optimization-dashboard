import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { LineChart, Line, ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedTooltip, InteractiveChartContainer } from './InteractiveFeatures';

interface RealTimeData {
  timestamp: Date;
  portfolioValue: number;
  dayChange: number;
  dayChangePercent: number;
  volume: number;
  volatility: number;
}

interface Holding {
  symbol: string;
  name: string;
  currentPrice: number;
  change: number;
  changePercent: number;
  allocation: number;
  value: number;
  volume: number;
}

interface Alert {
  id: string;
  type: 'rebalance' | 'risk' | 'opportunity' | 'system';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  timestamp: Date;
  action?: string;
}

interface RealTimeDashboardProps {
  initialData: RealTimeData[];
  holdings: Holding[];
  alerts: Alert[];
  isDarkMode?: boolean;
  className?: string;
  onAlertAction?: (alert: Alert) => void;
}

// Sparkline Component
const Sparkline: React.FC<{
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  showDots?: boolean;
  className?: string;
}> = ({ 
  data, 
  width = 80, 
  height = 20, 
  color = '#3B82F6', 
  showDots = false,
  className = '' 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = 2;
    const innerWidth = width - margin * 2;
    const innerHeight = height - margin * 2;

    const xScale = d3.scaleLinear()
      .domain([0, data.length - 1])
      .range([margin, innerWidth + margin]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(data) as [number, number])
      .range([innerHeight + margin, margin]);

    // Create line generator
    const line = d3.line<number>()
      .x((d, i) => xScale(i))
      .y(d => yScale(d))
      .curve(d3.curveMonotoneX);

    // Add path
    svg.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line);

    // Add dots if requested
    if (showDots) {
      svg.selectAll('.dot')
        .data(data)
        .enter().append('circle')
        .attr('class', 'dot')
        .attr('cx', (d, i) => xScale(i))
        .attr('cy', d => yScale(d))
        .attr('r', 1)
        .attr('fill', color);
    }

    // Add area fill
    const area = d3.area<number>()
      .x((d, i) => xScale(i))
      .y0(yScale(Math.min(...data)))
      .y1(d => yScale(d))
      .curve(d3.curveMonotoneX);

    svg.append('path')
      .datum(data)
      .attr('fill', color)
      .attr('fill-opacity', 0.1)
      .attr('d', area);

  }, [data, width, height, color, showDots]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className={className}
    />
  );
};

// Live Portfolio Value Widget
const LivePortfolioValue: React.FC<{
  currentValue: number;
  change: number;
  changePercent: number;
  sparklineData: number[];
  isDarkMode: boolean;
}> = ({ currentValue, change, changePercent, sparklineData, isDarkMode }) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValueRef = useRef(currentValue);

  useEffect(() => {
    if (prevValueRef.current !== currentValue) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevValueRef.current = currentValue;
      return () => clearTimeout(timer);
    }
  }, [currentValue]);

  const isPositive = change >= 0;

  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className={`text-sm font-medium ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            Portfolio Value
          </div>
          <motion.div
            className={`text-3xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            } ${isAnimating ? 'text-blue-500' : ''}`}
            animate={{ scale: isAnimating ? 1.05 : 1 }}
            transition={{ duration: 0.3 }}
          >
            ${currentValue.toLocaleString()}
          </motion.div>
        </div>
        
        <div className="text-right">
          <Sparkline
            data={sparklineData}
            width={100}
            height={40}
            color={isPositive ? '#10B981' : '#EF4444'}
          />
        </div>
      </div>
      
      <div className="flex items-center justify-between">
        <div className={`flex items-center gap-2 ${
          isPositive ? 'text-green-600' : 'text-red-600'
        }`}>
          <svg className={`w-4 h-4 ${isPositive ? 'rotate-0' : 'rotate-180'}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="font-semibold">
            {isPositive ? '+' : ''}${Math.abs(change).toLocaleString()}
          </span>
          <span className="text-sm">
            ({isPositive ? '+' : ''}{changePercent.toFixed(2)}%)
          </span>
        </div>
        
        <div className={`text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
          Today
        </div>
      </div>
    </div>
  );
};

// Real-time Holdings Table
const RealTimeHoldingsTable: React.FC<{
  holdings: Holding[];
  isDarkMode: boolean;
  onHoldingClick?: (holding: Holding) => void;
}> = ({ holdings, isDarkMode, onHoldingClick }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Holding;
    direction: 'asc' | 'desc';
  }>({ key: 'allocation', direction: 'desc' });

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      return sortConfig.direction === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [holdings, sortConfig]);

  const handleSort = (key: keyof Holding) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  return (
    <div className={`rounded-xl border overflow-hidden ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Live Holdings
        </h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className={isDarkMode ? 'bg-gray-750' : 'bg-gray-50'}>
            <tr>
              {[
                { key: 'symbol', label: 'Symbol' },
                { key: 'currentPrice', label: 'Price' },
                { key: 'changePercent', label: 'Change' },
                { key: 'allocation', label: 'Allocation' },
                { key: 'value', label: 'Value' },
                { key: 'volume', label: 'Volume' }
              ].map(({ key, label }) => (
                <th
                  key={key}
                  onClick={() => handleSort(key as keyof Holding)}
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer hover:bg-opacity-75 ${
                    isDarkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {label}
                    {sortConfig.key === key && (
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d={
                          sortConfig.direction === 'asc' 
                            ? "M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L10 4.414 6.707 7.707a1 1 0 01-1.414 0z"
                            : "M14.707 12.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L10 15.586l3.293-3.293a1 1 0 011.414 0z"
                        } clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {sortedHoldings.map((holding, index) => (
              <motion.tr
                key={holding.symbol}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onHoldingClick?.(holding)}
                className={`cursor-pointer transition-colors ${
                  isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                }`}
              >
                <td className="px-4 py-4 whitespace-nowrap">
                  <div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                      {holding.symbol}
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {holding.name}
                    </div>
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    ${holding.currentPrice.toFixed(2)}
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className={`font-medium ${
                      holding.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {holding.changePercent >= 0 ? '+' : ''}{holding.changePercent.toFixed(2)}%
                    </div>
                    <Sparkline
                      data={Array.from({ length: 10 }, () => 
                        holding.currentPrice * (1 + (Math.random() - 0.5) * 0.02)
                      )}
                      width={50}
                      height={20}
                      color={holding.changePercent >= 0 ? '#10B981' : '#EF4444'}
                    />
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {(holding.allocation * 100).toFixed(1)}%
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
                    <div
                      className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${holding.allocation * 100}%` }}
                    />
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    ${holding.value.toLocaleString()}
                  </div>
                </td>
                
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                    {holding.volume.toLocaleString()}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Performance Attribution Chart
const PerformanceAttributionChart: React.FC<{
  data: Array<{
    sector: string;
    contribution: number;
    allocation: number;
    selection: number;
  }>;
  isDarkMode: boolean;
}> = ({ data, isDarkMode }) => {
  const chartRef = useRef<HTMLDivElement>(null);

  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <h3 className={`text-lg font-semibold mb-4 ${
        isDarkMode ? 'text-white' : 'text-gray-900'
      }`}>
        Performance Attribution
      </h3>
      
      <div ref={chartRef}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <XAxis 
              dataKey="sector" 
              stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
              fontSize={12}
            />
            <YAxis 
              stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
              fontSize={12}
              tickFormatter={(value) => `${(value * 100).toFixed(1)}%`}
            />
            <Bar dataKey="allocation" fill="#3B82F6" name="Allocation Effect" />
            <Bar dataKey="selection" fill="#10B981" name="Selection Effect" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            Allocation Effect
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
            Selection Effect
          </span>
        </div>
      </div>
    </div>
  );
};

// Alert Panel
const AlertPanel: React.FC<{
  alerts: Alert[];
  isDarkMode: boolean;
  onAlertAction?: (alert: Alert) => void;
  onDismissAlert?: (alertId: string) => void;
}> = ({ alerts, isDarkMode, onAlertAction, onDismissAlert }) => {
  const getSeverityColor = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getSeverityIcon = (severity: Alert['severity']) => {
    switch (severity) {
      case 'high': return '🚨';
      case 'medium': return '⚠️';
      case 'low': return 'ℹ️';
    }
  };

  const getTypeIcon = (type: Alert['type']) => {
    switch (type) {
      case 'rebalance': return '⚖️';
      case 'risk': return '🛡️';
      case 'opportunity': return '💡';
      case 'system': return '⚙️';
    }
  };

  return (
    <div className={`p-6 rounded-xl border ${
      isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-semibold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Alerts ({alerts.length})
        </h3>
        
        {alerts.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Live
            </span>
          </div>
        )}
      </div>
      
      <div className="space-y-3 max-h-80 overflow-y-auto">
        <AnimatePresence>
          {alerts.map((alert, index) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.1 }}
              className={`p-4 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600' 
                  : getSeverityColor(alert.severity)
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <span className="text-lg">
                      {getTypeIcon(alert.type)} {getSeverityIcon(alert.severity)}
                    </span>
                  </div>
                  
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${
                      isDarkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {alert.title}
                    </div>
                    <div className={`text-sm mt-1 ${
                      isDarkMode ? 'text-gray-300' : 'text-gray-600'
                    }`}>
                      {alert.message}
                    </div>
                    <div className={`text-xs mt-2 ${
                      isDarkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}>
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-1">
                  {alert.action && (
                    <button
                      onClick={() => onAlertAction?.(alert)}
                      className={`px-3 py-1 text-xs rounded font-medium transition-colors ${
                        isDarkMode
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {alert.action}
                    </button>
                  )}
                  
                  <button
                    onClick={() => onDismissAlert?.(alert.id)}
                    className={`p-1 rounded transition-colors ${
                      isDarkMode
                        ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-600'
                        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        
        {alerts.length === 0 && (
          <div className={`text-center py-8 ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            <div className="text-4xl mb-2">✅</div>
            <div className="text-sm">No alerts at this time</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Real-time Dashboard Component
const RealTimeDashboard: React.FC<RealTimeDashboardProps> = ({
  initialData,
  holdings,
  alerts,
  isDarkMode = false,
  className = '',
  onAlertAction
}) => {
  const [realTimeData, setRealTimeData] = useState<RealTimeData[]>(initialData);
  const [currentAlerts, setCurrentAlerts] = useState<Alert[]>(alerts);
  const [isConnected, setIsConnected] = useState(true);

  // Simulate real-time data updates
  useEffect(() => {
    const interval = setInterval(() => {
      const lastValue = realTimeData[realTimeData.length - 1]?.portfolioValue || 100000;
      const change = (Math.random() - 0.5) * 1000;
      const newValue = Math.max(0, lastValue + change);
      
      const newDataPoint: RealTimeData = {
        timestamp: new Date(),
        portfolioValue: newValue,
        dayChange: change,
        dayChangePercent: (change / lastValue) * 100,
        volume: Math.floor(Math.random() * 1000000),
        volatility: Math.random() * 0.3
      };

      setRealTimeData(prev => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-100); // Keep last 100 points
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [realTimeData]);

  const currentValue = realTimeData[realTimeData.length - 1]?.portfolioValue || 0;
  const currentChange = realTimeData[realTimeData.length - 1]?.dayChange || 0;
  const currentChangePercent = realTimeData[realTimeData.length - 1]?.dayChangePercent || 0;
  
  const sparklineData = realTimeData.slice(-20).map(d => d.portfolioValue);

  // Mock performance attribution data
  const attributionData = [
    { sector: 'Technology', contribution: 0.02, allocation: 0.015, selection: 0.005 },
    { sector: 'Healthcare', contribution: 0.008, allocation: -0.002, selection: 0.01 },
    { sector: 'Finance', contribution: -0.005, allocation: -0.01, selection: 0.005 },
    { sector: 'Energy', contribution: 0.012, allocation: 0.008, selection: 0.004 },
    { sector: 'Consumer', contribution: 0.003, allocation: 0.001, selection: 0.002 }
  ];

  const handleDismissAlert = useCallback((alertId: string) => {
    setCurrentAlerts(prev => prev.filter(alert => alert.id !== alertId));
  }, []);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <h2 className={`text-2xl font-bold ${
          isDarkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Real-time Dashboard
        </h2>
        
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}></div>
          <span className={`text-sm ${
            isDarkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <LivePortfolioValue
          currentValue={currentValue}
          change={currentChange}
          changePercent={currentChangePercent}
          sparklineData={sparklineData}
          isDarkMode={isDarkMode}
        />
        
        {[
          { label: 'Day High', value: Math.max(...sparklineData), format: 'currency' },
          { label: 'Day Low', value: Math.min(...sparklineData), format: 'currency' },
          { label: 'Volume', value: realTimeData[realTimeData.length - 1]?.volume || 0, format: 'number' }
        ].map((metric, index) => (
          <div key={index} className={`p-6 rounded-xl border ${
            isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className={`text-sm font-medium mb-2 ${
              isDarkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              {metric.label}
            </div>
            <div className={`text-2xl font-bold ${
              isDarkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {metric.format === 'currency' 
                ? `$${metric.value.toLocaleString()}`
                : metric.value.toLocaleString()
              }
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Holdings Table */}
        <div className="lg:col-span-2">
          <RealTimeHoldingsTable
            holdings={holdings}
            isDarkMode={isDarkMode}
          />
        </div>
        
        {/* Alerts Panel */}
        <div>
          <AlertPanel
            alerts={currentAlerts}
            isDarkMode={isDarkMode}
            onAlertAction={onAlertAction}
            onDismissAlert={handleDismissAlert}
          />
        </div>
      </div>

      {/* Performance Attribution */}
      <PerformanceAttributionChart
        data={attributionData}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default RealTimeDashboard;