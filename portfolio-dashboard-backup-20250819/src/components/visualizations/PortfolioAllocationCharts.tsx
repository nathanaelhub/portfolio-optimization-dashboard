import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Treemap } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface Holding {
  symbol: string;
  name: string;
  allocation: number;
  value: number;
  sector: string;
  change: number;
  changePercent: number;
}

interface AllocationChartsProps {
  holdings: Holding[];
  isDarkMode?: boolean;
  onHoldingClick?: (holding: Holding) => void;
  className?: string;
}

// Color schemes
const SECTOR_COLORS = {
  'Technology': '#3B82F6',
  'Healthcare': '#10B981',
  'Financial Services': '#F59E0B',
  'Consumer Discretionary': '#8B5CF6',
  'Communication': '#EF4444',
  'Industrial': '#06B6D4',
  'Consumer Staples': '#84CC16',
  'Energy': '#F97316',
  'Materials': '#6366F1',
  'Real Estate': '#EC4899',
  'Utilities': '#14B8A6',
  'Other': '#6B7280'
};

const PERFORMANCE_COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280'
};

// Animated Donut Chart with Drill-down
const AnimatedDonutChart: React.FC<{
  data: Holding[];
  isDarkMode: boolean;
  onSegmentClick: (sector: string) => void;
  selectedSector: string | null;
}> = ({ data, isDarkMode, onSegmentClick, selectedSector }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  // Aggregate data by sector
  const sectorData = useMemo(() => {
    const sectors = data.reduce((acc, holding) => {
      const sector = holding.sector || 'Other';
      if (!acc[sector]) {
        acc[sector] = { 
          sector, 
          value: 0, 
          allocation: 0, 
          count: 0,
          holdings: []
        };
      }
      acc[sector].value += holding.value;
      acc[sector].allocation += holding.allocation;
      acc[sector].count += 1;
      acc[sector].holdings.push(holding);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(sectors).sort((a: any, b: any) => b.value - a.value);
  }, [data]);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = 40;
    const radius = Math.min(dimensions.width, dimensions.height) / 2 - margin;
    const innerRadius = radius * 0.6;

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${dimensions.width / 2}, ${dimensions.height / 2})`);

    // Create pie layout
    const pie = d3.pie<any>()
      .value(d => d.value)
      .sort(null);

    const arc = d3.arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(radius)
      .cornerRadius(4);

    const hoverArc = d3.arc<any>()
      .innerRadius(innerRadius)
      .outerRadius(radius + 10)
      .cornerRadius(4);

    // Create paths
    const paths = g.selectAll('path')
      .data(pie(sectorData))
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => SECTOR_COLORS[d.data.sector] || SECTOR_COLORS.Other)
      .attr('stroke', isDarkMode ? '#1F2937' : '#FFFFFF')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .style('opacity', (d: any) => 
        selectedSector && selectedSector !== d.data.sector ? 0.3 : 1
      );

    // Add hover effects
    paths
      .on('mouseenter', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', hoverArc);
        
        // Show tooltip
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'donut-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', isDarkMode ? '#374151' : '#FFFFFF')
          .style('color', isDarkMode ? '#F9FAFB' : '#111827')
          .style('padding', '12px')
          .style('border-radius', '8px')
          .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
          .style('pointer-events', 'none')
          .style('font-size', '14px')
          .style('z-index', '1000');

        tooltip.transition()
          .duration(200)
          .style('opacity', 1);

        tooltip.html(`
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${d.data.sector}</div>
            <div>Value: $${d.data.value.toLocaleString()}</div>
            <div>Allocation: ${(d.data.allocation * 100).toFixed(1)}%</div>
            <div>Holdings: ${d.data.count}</div>
          </div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mousemove', function(event) {
        d3.select('.donut-tooltip')
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseleave', function(event, d: any) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('d', arc);
        
        d3.select('.donut-tooltip').remove();
      })
      .on('click', function(event, d: any) {
        onSegmentClick(d.data.sector);
      });

    // Add sector labels
    const labelArc = d3.arc<any>()
      .innerRadius(radius + 20)
      .outerRadius(radius + 20);

    g.selectAll('text')
      .data(pie(sectorData))
      .enter()
      .append('text')
      .attr('transform', (d: any) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .style('fill', isDarkMode ? '#D1D5DB' : '#374151')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('pointer-events', 'none')
      .text((d: any) => {
        const percentage = (d.data.allocation * 100).toFixed(0);
        return percentage > 5 ? `${percentage}%` : '';
      });

    // Add center text
    const centerText = g.append('g')
      .attr('class', 'center-text');

    centerText.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', -10)
      .style('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .style('font-size', '24px')
      .style('font-weight', '700')
      .text('Portfolio');

    centerText.append('text')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('y', 15)
      .style('fill', isDarkMode ? '#9CA3AF' : '#6B7280')
      .style('font-size', '14px')
      .text('Allocation');

  }, [sectorData, dimensions, isDarkMode, selectedSector]);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ maxWidth: '400px', maxHeight: '400px' }}
      />
    </div>
  );
};

// Treemap Visualization
const PortfolioTreemap: React.FC<{
  data: Holding[];
  isDarkMode: boolean;
  onHoldingClick: (holding: Holding) => void;
}> = ({ data, isDarkMode, onHoldingClick }) => {
  const treemapData = data.map((holding, index) => ({
    name: holding.symbol,
    value: holding.value,
    allocation: holding.allocation,
    change: holding.changePercent,
    sector: holding.sector,
    fullData: holding
  }));

  const CustomTreemapContent: React.FC<any> = ({ root, depth, x, y, width, height, index, payload, colors, name }) => {
    const isPositive = payload.change >= 0;
    const changeColor = isPositive ? PERFORMANCE_COLORS.positive : PERFORMANCE_COLORS.negative;
    
    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          style={{
            fill: payload.change >= 0 ? 
              `${PERFORMANCE_COLORS.positive}20` : 
              `${PERFORMANCE_COLORS.negative}20`,
            stroke: isDarkMode ? '#374151' : '#E5E7EB',
            strokeWidth: 1,
            cursor: 'pointer'
          }}
          onClick={() => onHoldingClick(payload.fullData)}
        />
        {width > 50 && height > 30 && (
          <>
            <text
              x={x + width / 2}
              y={y + height / 2 - 5}
              textAnchor="middle"
              fill={isDarkMode ? '#F9FAFB' : '#111827'}
              fontSize="12"
              fontWeight="600"
            >
              {payload.name}
            </text>
            <text
              x={x + width / 2}
              y={y + height / 2 + 10}
              textAnchor="middle"
              fill={changeColor}
              fontSize="10"
              fontWeight="500"
            >
              {payload.change > 0 ? '+' : ''}{payload.change.toFixed(1)}%
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={treemapData}
        dataKey="value"
        aspectRatio={1}
        stroke={isDarkMode ? '#374151' : '#E5E7EB'}
        content={<CustomTreemapContent />}
      />
    </ResponsiveContainer>
  );
};

// Sankey Diagram for Rebalancing
const SankeyDiagram: React.FC<{
  currentAllocations: Holding[];
  targetAllocations: Holding[];
  isDarkMode: boolean;
}> = ({ currentAllocations, targetAllocations, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = 600;
    const height = 400;
    const margin = { top: 20, right: 120, bottom: 20, left: 120 };

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create nodes and links
    const nodes: any[] = [];
    const links: any[] = [];

    // Add current allocation nodes (left side)
    currentAllocations.forEach((holding, i) => {
      nodes.push({
        id: `current-${holding.symbol}`,
        name: holding.symbol,
        value: holding.allocation,
        x: 0,
        y: (i + 0.5) * (innerHeight / currentAllocations.length),
        type: 'source'
      });
    });

    // Add target allocation nodes (right side)
    targetAllocations.forEach((holding, i) => {
      nodes.push({
        id: `target-${holding.symbol}`,
        name: holding.symbol,
        value: holding.allocation,
        x: innerWidth,
        y: (i + 0.5) * (innerHeight / targetAllocations.length),
        type: 'target'
      });

      // Create links
      const currentHolding = currentAllocations.find(h => h.symbol === holding.symbol);
      if (currentHolding) {
        const change = holding.allocation - currentHolding.allocation;
        links.push({
          source: `current-${holding.symbol}`,
          target: `target-${holding.symbol}`,
          value: Math.abs(change),
          change: change,
          symbol: holding.symbol
        });
      }
    });

    // Draw links (flows)
    const linkGenerator = d3.linkHorizontal<any, any>()
      .source(d => [d.source.x + 80, d.source.y])
      .target(d => [d.target.x - 80, d.target.y]);

    const linkData = links.map(link => ({
      ...link,
      source: nodes.find(n => n.id === link.source),
      target: nodes.find(n => n.id === link.target)
    }));

    g.selectAll('.link')
      .data(linkData)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', linkGenerator)
      .attr('fill', 'none')
      .attr('stroke', (d: any) => 
        d.change > 0 ? PERFORMANCE_COLORS.positive : 
        d.change < 0 ? PERFORMANCE_COLORS.negative : 
        PERFORMANCE_COLORS.neutral
      )
      .attr('stroke-width', (d: any) => Math.max(2, d.value * 100))
      .attr('opacity', 0.6);

    // Draw nodes
    g.selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x}, ${d.y})`);

    // Add node rectangles
    g.selectAll('.node')
      .append('rect')
      .attr('x', (d: any) => d.type === 'source' ? 0 : -80)
      .attr('y', -10)
      .attr('width', 80)
      .attr('height', 20)
      .attr('fill', (d: any) => d.type === 'source' ? '#3B82F6' : '#10B981')
      .attr('stroke', isDarkMode ? '#374151' : '#E5E7EB')
      .attr('rx', 4);

    // Add node labels
    g.selectAll('.node')
      .append('text')
      .attr('x', (d: any) => d.type === 'source' ? 40 : -40)
      .attr('y', 0)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('fill', '#FFFFFF')
      .attr('font-size', '11px')
      .attr('font-weight', '500')
      .text((d: any) => d.name);

    // Add labels
    g.append('text')
      .attr('x', 40)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Current');

    g.append('text')
      .attr('x', innerWidth - 40)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .attr('font-size', '14px')
      .attr('font-weight', '600')
      .text('Target');

  }, [currentAllocations, targetAllocations, isDarkMode]);

  return (
    <div className="flex justify-center">
      <svg ref={svgRef} className="max-w-full" />
    </div>
  );
};

// Grouped Bar Chart for Allocation Comparison
const AllocationComparisonChart: React.FC<{
  data: Holding[];
  targetAllocations?: Holding[];
  isDarkMode: boolean;
}> = ({ data, targetAllocations, isDarkMode }) => {
  const chartData = data.map(holding => {
    const target = targetAllocations?.find(t => t.symbol === holding.symbol);
    return {
      symbol: holding.symbol,
      current: holding.allocation * 100,
      target: target ? target.allocation * 100 : holding.allocation * 100,
      sector: holding.sector
    };
  }).sort((a, b) => b.current - a.current).slice(0, 10); // Top 10 holdings

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`p-3 rounded-lg shadow-lg border ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toFixed(1)}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart
        data={chartData}
        margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={isDarkMode ? '#374151' : '#E5E7EB'} 
        />
        <XAxis 
          dataKey="symbol" 
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={12}
          angle={-45}
          textAnchor="end"
          height={80}
        />
        <YAxis 
          stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
          fontSize={12}
          label={{ 
            value: 'Allocation (%)', 
            angle: -90, 
            position: 'insideLeft',
            style: { textAnchor: 'middle' }
          }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar 
          dataKey="current" 
          fill="#3B82F6" 
          name="Current"
          radius={[2, 2, 0, 0]}
        />
        {targetAllocations && (
          <Bar 
            dataKey="target" 
            fill="#10B981" 
            name="Target"
            radius={[2, 2, 0, 0]}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

// Main Portfolio Allocation Charts Component
const PortfolioAllocationCharts: React.FC<AllocationChartsProps> = ({
  holdings,
  isDarkMode = false,
  onHoldingClick,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'donut' | 'treemap' | 'sankey' | 'comparison'>('donut');
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [drilldownHoldings, setDrilldownHoldings] = useState<Holding[]>([]);

  // Mock target allocations for demonstration
  const targetAllocations = holdings.map(holding => ({
    ...holding,
    allocation: holding.allocation * (0.9 + Math.random() * 0.2) // ±10% variation
  }));

  useEffect(() => {
    if (selectedSector) {
      const sectorHoldings = holdings.filter(h => h.sector === selectedSector);
      setDrilldownHoldings(sectorHoldings);
    } else {
      setDrilldownHoldings([]);
    }
  }, [selectedSector, holdings]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-700">
        {[
          { id: 'donut', label: 'Sector Allocation', icon: '🍩' },
          { id: 'treemap', label: 'Position Sizes', icon: '📊' },
          { id: 'sankey', label: 'Rebalancing', icon: '🔄' },
          { id: 'comparison', label: 'Target vs Current', icon: '⚖️' }
        ].map(tab => (
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
          {activeTab === 'donut' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <AnimatedDonutChart
                  data={holdings}
                  isDarkMode={isDarkMode}
                  onSegmentClick={setSelectedSector}
                  selectedSector={selectedSector}
                />
              </div>
              
              {/* Drill-down detail */}
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-gray-900'
                }`}>
                  {selectedSector ? `${selectedSector} Holdings` : 'All Holdings'}
                </h3>
                
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {(selectedSector ? drilldownHoldings : holdings)
                    .sort((a, b) => b.allocation - a.allocation)
                    .map((holding, index) => (
                      <div
                        key={holding.symbol}
                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                          isDarkMode
                            ? 'bg-gray-800 hover:bg-gray-700'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => onHoldingClick?.(holding)}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: SECTOR_COLORS[holding.sector] || SECTOR_COLORS.Other }}
                          />
                          <div>
                            <div className={`font-medium ${
                              isDarkMode ? 'text-white' : 'text-gray-900'
                            }`}>
                              {holding.symbol}
                            </div>
                            <div className={`text-sm ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {holding.name}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`font-medium ${
                            isDarkMode ? 'text-white' : 'text-gray-900'
                          }`}>
                            {(holding.allocation * 100).toFixed(1)}%
                          </div>
                          <div className={`text-sm ${
                            holding.changePercent >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {holding.changePercent > 0 ? '+' : ''}{holding.changePercent.toFixed(2)}%
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'treemap' && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Position Sizes and Performance
              </h3>
              <PortfolioTreemap
                data={holdings}
                isDarkMode={isDarkMode}
                onHoldingClick={onHoldingClick || (() => {})}
              />
            </div>
          )}

          {activeTab === 'sankey' && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Rebalancing Flow
              </h3>
              <SankeyDiagram
                currentAllocations={holdings}
                targetAllocations={targetAllocations}
                isDarkMode={isDarkMode}
              />
            </div>
          )}

          {activeTab === 'comparison' && (
            <div>
              <h3 className={`text-lg font-semibold mb-4 ${
                isDarkMode ? 'text-white' : 'text-gray-900'
              }`}>
                Current vs Target Allocations
              </h3>
              <AllocationComparisonChart
                data={holdings}
                targetAllocations={targetAllocations}
                isDarkMode={isDarkMode}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Reset drill-down button */}
      {selectedSector && (
        <div className="flex justify-center">
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              isDarkMode
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            ← Back to All Sectors
          </button>
        </div>
      )}
    </div>
  );
};

export default PortfolioAllocationCharts;