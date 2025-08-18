import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface PerformanceData {
  date: string;
  portfolioValue: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  drawdown: number;
  volatility: number;
  sharpeRatio: number;
}

interface PerformanceAnalyticsProps {
  data: PerformanceData[];
  benchmarkName?: string;
  isDarkMode?: boolean;
  className?: string;
}

// Multi-line Performance Chart with Benchmark Comparison
const PerformanceComparisonChart: React.FC<{
  data: PerformanceData[];
  benchmarkName: string;
  isDarkMode: boolean;
  showBenchmark: boolean;
  onToggleBenchmark: (show: boolean) => void;
}> = ({ data, benchmarkName, isDarkMode, showBenchmark, onToggleBenchmark }) => {
  const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Transform data for cumulative returns
  const chartData = useMemo(() => {
    if (!data.length) return [];
    
    let portfolioCumulative = 1;
    let benchmarkCumulative = 1;
    
    return data.map((d, index) => {
      if (index > 0) {
        portfolioCumulative *= (1 + d.portfolioReturn);
        benchmarkCumulative *= (1 + d.benchmarkReturn);
      }
      
      return {
        date: d.date,
        portfolioValue: portfolioCumulative,
        benchmarkValue: benchmarkCumulative,
        portfolioReturn: d.portfolioReturn * 100,
        benchmarkReturn: d.benchmarkReturn * 100,
        rawDate: new Date(d.date)
      };
    });
  }, [data]);

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className={`p-4 rounded-lg shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold mb-2">{new Date(label).toLocaleDateString()}</p>
          <div className="space-y-1">
            <div className="flex justify-between items-center gap-4">
              <span className="text-blue-500">Portfolio:</span>
              <span className="font-medium">{((data.portfolioValue - 1) * 100).toFixed(2)}%</span>
            </div>
            {showBenchmark && (
              <div className="flex justify-between items-center gap-4">
                <span className="text-green-500">{benchmarkName}:</span>
                <span className="font-medium">{((data.benchmarkValue - 1) * 100).toFixed(2)}%</span>
              </div>
            )}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
              <div className="flex justify-between items-center gap-4">
                <span className="text-gray-500">Daily Return:</span>
                <span className={`font-medium ${data.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {data.portfolioReturn > 0 ? '+' : ''}{data.portfolioReturn.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>Portfolio</span>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showBenchmark}
              onChange={(e) => onToggleBenchmark(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>{benchmarkName}</span>
            </div>
          </label>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setBrushDomain(null)}
            className={`px-3 py-1 text-xs rounded ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Reset Zoom
          </button>
        </div>
      </div>

      {/* Main Chart */}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          onMouseMove={(e) => {
            if (e.activeLabel) {
              setHoveredDate(e.activeLabel);
            }
          }}
          onMouseLeave={() => setHoveredDate(null)}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
          <XAxis 
            dataKey="date"
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          />
          <YAxis 
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            fontSize={12}
            tickFormatter={(value) => `${((value - 1) * 100).toFixed(0)}%`}
            label={{ 
              value: 'Cumulative Return', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          <Line
            type="monotone"
            dataKey="portfolioValue"
            stroke="#3B82F6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, stroke: '#3B82F6', strokeWidth: 2, fill: '#fff' }}
          />
          
          {showBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmarkValue"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              activeDot={{ r: 4, stroke: '#10B981', strokeWidth: 2, fill: '#fff' }}
            />
          )}
          
          <ReferenceLine y={1} stroke={isDarkMode ? '#6B7280' : '#9CA3AF'} strokeDasharray="2 2" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Drawdown Visualization with Recovery Periods
const DrawdownChart: React.FC<{
  data: PerformanceData[];
  isDarkMode: boolean;
}> = ({ data, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<any>(null);

  // Calculate drawdown periods
  const drawdownData = useMemo(() => {
    if (!data.length) return [];
    
    let peak = 1;
    let currentDrawdownStart: number | null = null;
    const periods: any[] = [];
    
    const processed = data.map((d, index) => {
      const cumReturn = data.slice(0, index + 1).reduce((acc, curr) => acc * (1 + curr.portfolioReturn), 1);
      
      if (cumReturn > peak) {
        // New peak reached
        if (currentDrawdownStart !== null) {
          // End of drawdown period
          periods.push({
            start: currentDrawdownStart,
            end: index - 1,
            recovery: index,
            maxDrawdown: Math.min(...data.slice(currentDrawdownStart, index).map(x => x.drawdown))
          });
          currentDrawdownStart = null;
        }
        peak = cumReturn;
      } else if (currentDrawdownStart === null && cumReturn < peak) {
        // Start of new drawdown
        currentDrawdownStart = index;
      }
      
      return {
        date: d.date,
        drawdown: ((cumReturn - peak) / peak) * 100,
        cumReturn,
        index
      };
    });
    
    return { processed, periods };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !drawdownData.processed.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleTime()
      .domain(d3.extent(drawdownData.processed, d => new Date(d.date)) as [Date, Date])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain(d3.extent(drawdownData.processed, d => d.drawdown) as [number, number])
      .range([height, 0]);

    // Create area generator
    const area = d3.area<any>()
      .x(d => xScale(new Date(d.date)))
      .y0(yScale(0))
      .y1(d => yScale(d.drawdown))
      .curve(d3.curveMonotoneX);

    // Add area
    g.append('path')
      .datum(drawdownData.processed)
      .attr('fill', '#EF4444')
      .attr('fill-opacity', 0.3)
      .attr('stroke', '#EF4444')
      .attr('stroke-width', 2)
      .attr('d', area);

    // Add recovery period highlights
    drawdownData.periods.forEach((period, i) => {
      const startX = xScale(new Date(drawdownData.processed[period.start].date));
      const endX = xScale(new Date(drawdownData.processed[period.recovery].date));
      
      g.append('rect')
        .attr('x', startX)
        .attr('y', 0)
        .attr('width', endX - startX)
        .attr('height', height)
        .attr('fill', '#FEF3C7')
        .attr('fill-opacity', 0.2)
        .attr('stroke', '#F59E0B')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .style('cursor', 'pointer')
        .on('click', () => setSelectedPeriod(period));
    });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d3.timeFormat('%b %y')))
      .selectAll('text')
      .style('fill', isDarkMode ? '#9CA3AF' : '#6B7280');

    g.append('g')
      .call(d3.axisLeft(yScale).tickFormat(d => `${d}%`))
      .selectAll('text')
      .style('fill', isDarkMode ? '#9CA3AF' : '#6B7280');

    // Add zero line
    g.append('line')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', yScale(0))
      .attr('y2', yScale(0))
      .attr('stroke', isDarkMode ? '#6B7280' : '#9CA3AF')
      .attr('stroke-dasharray', '2,2');

    // Add labels
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .style('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .style('font-size', '12px')
      .text('Drawdown (%)');

  }, [drawdownData, isDarkMode]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Drawdown Analysis
          </h4>
          <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Click on highlighted periods to see recovery details
          </p>
        </div>
        
        {selectedPeriod && (
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h5 className={`font-medium mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Drawdown Period
            </h5>
            <div className="space-y-1 text-sm">
              <div>Duration: {selectedPeriod.recovery - selectedPeriod.start} days</div>
              <div>Max Drawdown: {selectedPeriod.maxDrawdown.toFixed(2)}%</div>
              <div>Recovery: {selectedPeriod.recovery - selectedPeriod.end} days</div>
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-center">
        <svg ref={svgRef} className="max-w-full" />
      </div>
    </div>
  );
};

// Rolling Performance Metrics
const RollingMetricsChart: React.FC<{
  data: PerformanceData[];
  isDarkMode: boolean;
  metric: 'volatility' | 'sharpeRatio';
  onMetricChange: (metric: 'volatility' | 'sharpeRatio') => void;
}> = ({ data, isDarkMode, metric, onMetricChange }) => {
  const chartData = data.map(d => ({
    date: d.date,
    value: metric === 'volatility' ? d.volatility * 100 : d.sharpeRatio,
    rawDate: new Date(d.date)
  }));

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold mb-1">{new Date(label).toLocaleDateString()}</p>
          <p className="text-sm">
            {metric === 'volatility' ? 'Volatility: ' : 'Sharpe Ratio: '}
            <span className="font-medium">
              {metric === 'volatility' 
                ? `${payload[0].value.toFixed(2)}%`
                : payload[0].value.toFixed(3)
              }
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Rolling {metric === 'volatility' ? 'Volatility' : 'Sharpe Ratio'} (30-day)
        </h4>
        
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => onMetricChange('volatility')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              metric === 'volatility'
                ? 'bg-blue-500 text-white'
                : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Volatility
          </button>
          <button
            onClick={() => onMetricChange('sharpeRatio')}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              metric === 'sharpeRatio'
                ? 'bg-blue-500 text-white'
                : isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Sharpe Ratio
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={250}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
          <XAxis 
            dataKey="date"
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            fontSize={12}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short' })}
          />
          <YAxis 
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            fontSize={12}
            tickFormatter={(value) => 
              metric === 'volatility' ? `${value.toFixed(0)}%` : value.toFixed(2)
            }
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={metric === 'volatility' ? '#F59E0B' : '#8B5CF6'}
            fill={metric === 'volatility' ? '#F59E0B' : '#8B5CF6'}
            fillOpacity={0.3}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Calendar Heatmap of Daily Returns
const CalendarHeatmap: React.FC<{
  data: PerformanceData[];
  isDarkMode: boolean;
}> = ({ data, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const years = useMemo(() => {
    const yearSet = new Set(data.map(d => new Date(d.date).getFullYear()));
    return Array.from(yearSet).sort((a, b) => b - a);
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const yearData = data.filter(d => new Date(d.date).getFullYear() === selectedYear);
    if (!yearData.length) return;

    const cellSize = 12;
    const yearWidth = 53 * cellSize;
    const yearHeight = 7 * cellSize;
    const margin = { top: 30, right: 20, bottom: 20, left: 30 };

    svg.attr('width', yearWidth + margin.left + margin.right)
       .attr('height', yearHeight + margin.top + margin.bottom);

    const g = svg.append('g')
       .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create color scale
    const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
      .domain(d3.extent(yearData, d => d.portfolioReturn * 100) as [number, number]);

    // Create time scale
    const timeWeek = d3.timeWeek;
    const countDay = (d: Date) => d.getDay();
    const formatDay = d3.timeFormat('%w');
    const formatDate = d3.timeFormat('%Y-%m-%d');

    // Add year label
    g.append('text')
      .attr('x', yearWidth / 2)
      .attr('y', -10)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', '600')
      .style('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .text(selectedYear);

    // Create data map
    const dataMap = new Map(yearData.map(d => [formatDate(new Date(d.date)), d]));

    // Add cells
    const year = new Date(selectedYear, 0, 1);
    const yearEnd = new Date(selectedYear + 1, 0, 1);
    
    g.selectAll('.day')
      .data(d3.timeDays(year, yearEnd))
      .enter().append('rect')
      .attr('class', 'day')
      .attr('width', cellSize - 1)
      .attr('height', cellSize - 1)
      .attr('x', (d: Date) => timeWeek.count(year, d) * cellSize)
      .attr('y', (d: Date) => countDay(d) * cellSize)
      .attr('fill', (d: Date) => {
        const dayData = dataMap.get(formatDate(d));
        return dayData ? colorScale(dayData.portfolioReturn * 100) : (isDarkMode ? '#374151' : '#F3F4F6');
      })
      .attr('stroke', isDarkMode ? '#1F2937' : '#FFFFFF')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer');

    // Add tooltips
    g.selectAll('.day')
      .on('mouseenter', function(event, d: Date) {
        const dayData = dataMap.get(formatDate(d));
        
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'calendar-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', isDarkMode ? '#374151' : '#FFFFFF')
          .style('color', isDarkMode ? '#F9FAFB' : '#111827')
          .style('padding', '8px 12px')
          .style('border-radius', '6px')
          .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
          .style('pointer-events', 'none')
          .style('font-size', '12px')
          .style('z-index', '1000');

        tooltip.transition()
          .duration(200)
          .style('opacity', 1);

        tooltip.html(`
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${d.toLocaleDateString()}</div>
            ${dayData ? `
              <div>Return: ${(dayData.portfolioReturn * 100).toFixed(2)}%</div>
            ` : '<div>No data</div>'}
          </div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseleave', function() {
        d3.select('.calendar-tooltip').remove();
      });

    // Add month labels
    const monthLabels = g.selectAll('.month')
      .data(d3.timeMonths(year, yearEnd))
      .enter().append('text')
      .attr('class', 'month')
      .attr('x', (d: Date) => timeWeek.count(year, d) * cellSize)
      .attr('y', -5)
      .style('font-size', '10px')
      .style('fill', isDarkMode ? '#9CA3AF' : '#6B7280')
      .text(d3.timeFormat('%b'));

    // Add day labels
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    g.selectAll('.day-label')
      .data(dayLabels)
      .enter().append('text')
      .attr('class', 'day-label')
      .attr('x', -5)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '9px')
      .style('fill', isDarkMode ? '#9CA3AF' : '#6B7280')
      .text(d => d);

  }, [data, selectedYear, isDarkMode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Daily Returns Calendar
        </h4>
        
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          className={`px-3 py-1 text-sm border rounded ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-center">
        <svg ref={svgRef} />
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-2">
        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Less</span>
        <div className="flex gap-1">
          {[-2, -1, 0, 1, 2].map(val => (
            <div
              key={val}
              className="w-3 h-3 rounded-sm"
              style={{ 
                backgroundColor: d3.scaleSequential(d3.interpolateRdYlGn)
                  .domain([-3, 3])(val)
              }}
            />
          ))}
        </div>
        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>More</span>
      </div>
    </div>
  );
};

// Main Performance Analytics Component
const PerformanceAnalytics: React.FC<PerformanceAnalyticsProps> = ({
  data,
  benchmarkName = 'S&P 500',
  isDarkMode = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'comparison' | 'drawdown' | 'rolling' | 'calendar'>('comparison');
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [rollingMetric, setRollingMetric] = useState<'volatility' | 'sharpeRatio'>('volatility');

  const tabs = [
    { id: 'comparison', label: 'Performance', icon: '📈' },
    { id: 'drawdown', label: 'Drawdown', icon: '📉' },
    { id: 'rolling', label: 'Rolling Metrics', icon: '🔄' },
    { id: 'calendar', label: 'Calendar', icon: '📅' }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? isDarkMode
                  ? 'bg-blue-900 text-blue-100 border-b-2 border-blue-400'
                  : 'bg-blue-50 text-blue-700 border-b-2 border-blue-500'
                : isDarkMode
                  ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chart Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="min-h-[400px]"
        >
          {activeTab === 'comparison' && (
            <PerformanceComparisonChart
              data={data}
              benchmarkName={benchmarkName}
              isDarkMode={isDarkMode}
              showBenchmark={showBenchmark}
              onToggleBenchmark={setShowBenchmark}
            />
          )}

          {activeTab === 'drawdown' && (
            <DrawdownChart data={data} isDarkMode={isDarkMode} />
          )}

          {activeTab === 'rolling' && (
            <RollingMetricsChart
              data={data}
              isDarkMode={isDarkMode}
              metric={rollingMetric}
              onMetricChange={setRollingMetric}
            />
          )}

          {activeTab === 'calendar' && (
            <CalendarHeatmap data={data} isDarkMode={isDarkMode} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default PerformanceAnalytics;