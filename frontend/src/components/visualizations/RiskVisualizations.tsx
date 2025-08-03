import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

interface Asset {
  symbol: string;
  name: string;
  expectedReturn: number;
  volatility: number;
  allocation: number;
}

interface CorrelationData {
  [key: string]: { [key: string]: number };
}

interface RiskFactor {
  factor: string;
  contribution: number;
  description: string;
}

interface EfficientFrontierPoint {
  risk: number;
  return: number;
  sharpeRatio: number;
  allocation: { [key: string]: number };
}

interface RiskVisualizationsProps {
  assets: Asset[];
  correlationMatrix: CorrelationData;
  efficientFrontier: EfficientFrontierPoint[];
  riskFactors: RiskFactor[];
  currentPortfolio?: EfficientFrontierPoint;
  isDarkMode?: boolean;
  className?: string;
}

// 3D Efficient Frontier (Interactive 2D with depth illusion)
const EfficientFrontierChart: React.FC<{
  data: EfficientFrontierPoint[];
  currentPortfolio?: EfficientFrontierPoint;
  assets: Asset[];
  isDarkMode: boolean;
  onPointClick?: (point: EfficientFrontierPoint) => void;
}> = ({ data, currentPortfolio, assets, isDarkMode, onPointClick }) => {
  const [hoveredPoint, setHoveredPoint] = useState<EfficientFrontierPoint | null>(null);
  const [showAssets, setShowAssets] = useState(true);

  // Create scatter plot data
  const scatterData = data.map((point, index) => ({
    x: point.risk * 100,
    y: point.return * 100,
    sharpe: point.sharpeRatio,
    index,
    allocation: point.allocation,
    // Add depth effect based on Sharpe ratio
    z: point.sharpeRatio * 10 // For color intensity
  }));

  // Individual asset data
  const assetData = assets.map(asset => ({
    x: asset.volatility * 100,
    y: asset.expectedReturn * 100,
    name: asset.symbol,
    allocation: asset.allocation
  }));

  const CustomTooltip: React.FC<any> = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const point = hoveredPoint || (data.index !== undefined ? scatterData[data.index] : null);
      
      return (
        <div className={`p-4 rounded-lg shadow-lg border min-w-[200px] ${
          isDarkMode ? 'bg-gray-800 border-gray-600 text-white' : 'bg-white border-gray-200 text-gray-900'
        }`}>
          <div className="space-y-2">
            <div className="font-semibold text-sm">
              {data.name ? `${data.name} Asset` : 'Portfolio Point'}
            </div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Risk:</span>
                <span className="font-medium">{data.x?.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between">
                <span>Return:</span>
                <span className="font-medium">{data.y?.toFixed(2)}%</span>
              </div>
              {data.sharpe !== undefined && (
                <div className="flex justify-between">
                  <span>Sharpe Ratio:</span>
                  <span className="font-medium">{data.sharpe?.toFixed(3)}</span>
                </div>
              )}
            </div>
            
            {point?.allocation && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                <div className="text-xs font-medium mb-1">Allocation:</div>
                <div className="space-y-1 max-h-20 overflow-y-auto">
                  {Object.entries(point.allocation)
                    .filter(([_, weight]) => weight > 0.01)
                    .sort(([_, a], [__, b]) => b - a)
                    .slice(0, 5)
                    .map(([symbol, weight]) => (
                      <div key={symbol} className="flex justify-between text-xs">
                        <span>{symbol}:</span>
                        <span>{(weight * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  // Color scale for Sharpe ratio
  const colorScale = d3.scaleSequential(d3.interpolateViridis)
    .domain(d3.extent(scatterData, d => d.sharpe) as [number, number]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Efficient Frontier
          </h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showAssets}
              onChange={(e) => setShowAssets(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Show Individual Assets
            </span>
          </label>
        </div>
        
        {/* Legend */}
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-yellow-500"></div>
            <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>
              Higher Sharpe Ratio →
            </span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={500}>
        <ScatterChart margin={{ top: 20, right: 20, bottom: 40, left: 40 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
          <XAxis 
            type="number"
            dataKey="x"
            name="Risk"
            unit="%"
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            fontSize={12}
            label={{ 
              value: 'Risk (Volatility %)', 
              position: 'insideBottom', 
              offset: -10,
              style: { textAnchor: 'middle' }
            }}
          />
          <YAxis 
            type="number"
            dataKey="y"
            name="Return"
            unit="%"
            stroke={isDarkMode ? '#9CA3AF' : '#6B7280'}
            fontSize={12}
            label={{ 
              value: 'Expected Return (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          
          {/* Efficient Frontier */}
          <Scatter
            name="Efficient Frontier"
            data={scatterData}
            fill="#8884d8"
            onClick={(data) => {
              if (onPointClick && data.index !== undefined) {
                onPointClick(scatterData[data.index]);
              }
            }}
          >
            {scatterData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={colorScale(entry.sharpe)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </Scatter>
          
          {/* Individual Assets */}
          {showAssets && (
            <Scatter
              name="Individual Assets"
              data={assetData}
              fill="#FF6B6B"
              shape="triangle"
            />
          )}
          
          {/* Current Portfolio */}
          {currentPortfolio && (
            <Scatter
              name="Current Portfolio"
              data={[{
                x: currentPortfolio.risk * 100,
                y: currentPortfolio.return * 100,
                sharpe: currentPortfolio.sharpeRatio
              }]}
              fill="#FF4444"
              shape="star"
              size={150}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

// Correlation Matrix with Hierarchical Clustering
const CorrelationMatrix: React.FC<{
  data: CorrelationData;
  isDarkMode: boolean;
}> = ({ data, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [clusteredOrder, setClusteredOrder] = useState<string[]>([]);

  // Simple hierarchical clustering implementation
  const performClustering = (correlationMatrix: CorrelationData) => {
    const symbols = Object.keys(correlationMatrix);
    if (symbols.length === 0) return [];

    // Calculate distance matrix (1 - correlation)
    const distances: number[][] = symbols.map(symbol1 =>
      symbols.map(symbol2 => 1 - Math.abs(correlationMatrix[symbol1][symbol2]))
    );

    // Simple agglomerative clustering
    const clusters = symbols.map((symbol, i) => ({ symbols: [symbol], index: i }));
    const mergeOrder: string[] = [];

    while (clusters.length > 1) {
      let minDistance = Infinity;
      let mergeIndices = [0, 1];

      // Find closest clusters
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const avgDistance = clusters[i].symbols
            .flatMap(s1 => clusters[j].symbols.map(s2 => distances[symbols.indexOf(s1)][symbols.indexOf(s2)]))
            .reduce((sum, d) => sum + d, 0) / (clusters[i].symbols.length * clusters[j].symbols.length);

          if (avgDistance < minDistance) {
            minDistance = avgDistance;
            mergeIndices = [i, j];
          }
        }
      }

      // Merge clusters
      const [i, j] = mergeIndices;
      const newCluster = {
        symbols: [...clusters[i].symbols, ...clusters[j].symbols],
        index: -1
      };

      clusters.splice(Math.max(i, j), 1);
      clusters.splice(Math.min(i, j), 1);
      clusters.push(newCluster);
    }

    return clusters[0].symbols;
  };

  useEffect(() => {
    const ordered = performClustering(data);
    setClusteredOrder(ordered);
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || clusteredOrder.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 80, right: 20, bottom: 20, left: 80 };
    const size = 400;
    const width = size + margin.left + margin.right;
    const height = size + margin.top + margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const n = clusteredOrder.length;
    const cellSize = size / n;

    // Color scale for correlations
    const colorScale = d3.scaleSequential(d3.interpolateRdBu)
      .domain([-1, 1]);

    // Create cells
    clusteredOrder.forEach((symbol1, i) => {
      clusteredOrder.forEach((symbol2, j) => {
        const correlation = data[symbol1]?.[symbol2] ?? 0;
        
        g.append('rect')
          .attr('x', j * cellSize)
          .attr('y', i * cellSize)
          .attr('width', cellSize)
          .attr('height', cellSize)
          .attr('fill', colorScale(correlation))
          .attr('stroke', isDarkMode ? '#1F2937' : '#FFFFFF')
          .attr('stroke-width', 0.5)
          .style('cursor', 'pointer')
          .on('mouseenter', function(event) {
            // Highlight row and column
            g.selectAll('rect')
              .style('opacity', 0.3);
            
            g.selectAll('rect')
              .filter((_, idx) => Math.floor(idx / n) === i || idx % n === j)
              .style('opacity', 1);

            // Show tooltip
            const tooltip = d3.select('body')
              .append('div')
              .attr('class', 'correlation-tooltip')
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
                <div style="font-weight: 600; margin-bottom: 4px;">${symbol1} vs ${symbol2}</div>
                <div>Correlation: ${correlation.toFixed(3)}</div>
              </div>
            `)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
          })
          .on('mouseleave', function() {
            g.selectAll('rect')
              .style('opacity', 1);
            
            d3.select('.correlation-tooltip').remove();
          });

        // Add correlation text for larger cells
        if (cellSize > 30) {
          g.append('text')
            .attr('x', j * cellSize + cellSize / 2)
            .attr('y', i * cellSize + cellSize / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .style('font-size', `${Math.min(10, cellSize / 4)}px`)
            .style('fill', Math.abs(correlation) > 0.5 ? '#FFFFFF' : (isDarkMode ? '#F9FAFB' : '#111827'))
            .style('pointer-events', 'none')
            .text(correlation.toFixed(2));
        }
      });
    });

    // Add row labels
    g.selectAll('.row-label')
      .data(clusteredOrder)
      .enter().append('text')
      .attr('class', 'row-label')
      .attr('x', -5)
      .attr('y', (d, i) => i * cellSize + cellSize / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', `${Math.min(12, cellSize * 0.8)}px`)
      .style('fill', isDarkMode ? '#D1D5DB' : '#374151')
      .text(d => d);

    // Add column labels
    g.selectAll('.col-label')
      .data(clusteredOrder)
      .enter().append('text')
      .attr('class', 'col-label')
      .attr('x', (d, i) => i * cellSize + cellSize / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'end')
      .attr('transform', (d, i) => `rotate(-45, ${i * cellSize + cellSize / 2}, -5)`)
      .style('font-size', `${Math.min(12, cellSize * 0.8)}px`)
      .style('fill', isDarkMode ? '#D1D5DB' : '#374151')
      .text(d => d);

  }, [data, clusteredOrder, isDarkMode]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Asset Correlation Matrix
        </h4>
        
        {/* Color legend */}
        <div className="flex items-center gap-2 text-xs">
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>-1</span>
          <div className="w-20 h-3 bg-gradient-to-r from-blue-600 via-white to-red-600 rounded"></div>
          <span className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>+1</span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <svg ref={svgRef} />
      </div>
      
      <div className={`text-xs text-center ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        Assets are clustered by correlation similarity. Hover over cells for details.
      </div>
    </div>
  );
};

// Risk Factor Contribution Chart
const RiskFactorChart: React.FC<{
  factors: RiskFactor[];
  isDarkMode: boolean;
}> = ({ factors, isDarkMode }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedFactor, setSelectedFactor] = useState<RiskFactor | null>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 120, bottom: 40, left: 120 };
    const width = 600 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    svg.attr('width', width + margin.left + margin.right)
       .attr('height', height + margin.top + margin.bottom);

    const g = svg.append('g')
       .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // Sort factors by contribution
    const sortedFactors = [...factors].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));

    // Scales
    const yScale = d3.scaleBand()
      .domain(sortedFactors.map(d => d.factor))
      .range([0, height])
      .padding(0.2);

    const xScale = d3.scaleLinear()
      .domain(d3.extent(sortedFactors, d => d.contribution) as [number, number])
      .range([0, width]);

    // Add bars
    g.selectAll('.bar')
      .data(sortedFactors)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => d.contribution >= 0 ? xScale(0) : xScale(d.contribution))
      .attr('y', d => yScale(d.factor)!)
      .attr('width', d => Math.abs(xScale(d.contribution) - xScale(0)))
      .attr('height', yScale.bandwidth())
      .attr('fill', d => d.contribution >= 0 ? '#10B981' : '#EF4444')
      .attr('stroke', isDarkMode ? '#374151' : '#E5E7EB')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('click', (event, d) => setSelectedFactor(d))
      .on('mouseenter', function(event, d) {
        d3.select(this).attr('opacity', 0.8);
        
        // Show tooltip
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'factor-tooltip')
          .style('opacity', 0)
          .style('position', 'absolute')
          .style('background', isDarkMode ? '#374151' : '#FFFFFF')
          .style('color', isDarkMode ? '#F9FAFB' : '#111827')
          .style('padding', '12px')
          .style('border-radius', '8px')
          .style('box-shadow', '0 4px 6px -1px rgba(0, 0, 0, 0.1)')
          .style('pointer-events', 'none')
          .style('font-size', '12px')
          .style('max-width', '200px')
          .style('z-index', '1000');

        tooltip.transition()
          .duration(200)
          .style('opacity', 1);

        tooltip.html(`
          <div>
            <div style="font-weight: 600; margin-bottom: 4px;">${d.factor}</div>
            <div style="margin-bottom: 8px;">Contribution: ${(d.contribution * 100).toFixed(2)}%</div>
            <div style="font-size: 11px; color: ${isDarkMode ? '#9CA3AF' : '#6B7280'};">${d.description}</div>
          </div>
        `)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseleave', function() {
        d3.select(this).attr('opacity', 1);
        d3.select('.factor-tooltip').remove();
      });

    // Add value labels
    g.selectAll('.value-label')
      .data(sortedFactors)
      .enter().append('text')
      .attr('class', 'value-label')
      .attr('x', d => d.contribution >= 0 ? 
        xScale(d.contribution) + 5 : 
        xScale(d.contribution) - 5
      )
      .attr('y', d => yScale(d.factor)! + yScale.bandwidth() / 2)
      .attr('text-anchor', d => d.contribution >= 0 ? 'start' : 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .text(d => `${(d.contribution * 100).toFixed(1)}%`);

    // Add factor labels
    g.selectAll('.factor-label')
      .data(sortedFactors)
      .enter().append('text')
      .attr('class', 'factor-label')
      .attr('x', -10)
      .attr('y', d => yScale(d.factor)! + yScale.bandwidth() / 2)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('font-size', '12px')
      .style('fill', isDarkMode ? '#D1D5DB' : '#374151')
      .text(d => d.factor);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call(d3.axisBottom(xScale).tickFormat(d => `${(d * 100).toFixed(0)}%`))
      .selectAll('text')
      .style('fill', isDarkMode ? '#9CA3AF' : '#6B7280');

    // Add zero line
    g.append('line')
      .attr('x1', xScale(0))
      .attr('x2', xScale(0))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', isDarkMode ? '#6B7280' : '#9CA3AF')
      .attr('stroke-width', 2);

    // Add title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -5)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', '600')
      .style('fill', isDarkMode ? '#F9FAFB' : '#111827')
      .text('Risk Factor Contributions');

  }, [factors, isDarkMode]);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <svg ref={svgRef} />
      </div>
      
      {selectedFactor && (
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
          <h5 className={`font-semibold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            {selectedFactor.factor} Details
          </h5>
          <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {selectedFactor.description}
          </p>
          <div className="mt-2">
            <span className={`text-sm font-medium ${
              selectedFactor.contribution >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {selectedFactor.contribution >= 0 ? 'Positive' : 'Negative'} contribution: {(selectedFactor.contribution * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// Scenario Analysis Spider Chart
const ScenarioSpiderChart: React.FC<{
  scenarios: Array<{
    scenario: string;
    marketReturn: number;
    portfolioReturn: number;
    volatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
  }>;
  isDarkMode: boolean;
}> = ({ scenarios, isDarkMode }) => {
  const [selectedScenario, setSelectedScenario] = useState(0);

  // Normalize data for radar chart (0-100 scale)
  const normalizeData = (scenarios: any[]) => {
    const metrics = ['marketReturn', 'portfolioReturn', 'volatility', 'maxDrawdown', 'sharpeRatio'];
    const ranges = metrics.map(metric => {
      const values = scenarios.map(s => s[metric]);
      return { min: Math.min(...values), max: Math.max(...values) };
    });

    return scenarios.map(scenario => ({
      scenario: scenario.scenario,
      'Market Return': ((scenario.marketReturn - ranges[0].min) / (ranges[0].max - ranges[0].min)) * 100,
      'Portfolio Return': ((scenario.portfolioReturn - ranges[1].min) / (ranges[1].max - ranges[1].min)) * 100,
      'Volatility': (1 - (scenario.volatility - ranges[2].min) / (ranges[2].max - ranges[2].min)) * 100, // Invert for better visualization
      'Max Drawdown': (1 - (Math.abs(scenario.maxDrawdown) - Math.abs(ranges[3].max)) / (Math.abs(ranges[3].min) - Math.abs(ranges[3].max))) * 100, // Invert
      'Sharpe Ratio': ((scenario.sharpeRatio - ranges[4].min) / (ranges[4].max - ranges[4].min)) * 100
    }));
  };

  const normalizedData = normalizeData(scenarios);
  const selectedData = normalizedData[selectedScenario];

  const radarData = Object.entries(selectedData)
    .filter(([key]) => key !== 'scenario')
    .map(([metric, value]) => ({
      metric,
      value: value as number,
      fullMark: 100
    }));

  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
          Scenario Analysis
        </h4>
        
        <select
          value={selectedScenario}
          onChange={(e) => setSelectedScenario(parseInt(e.target.value))}
          className={`px-3 py-1 text-sm border rounded ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-600 text-white' 
              : 'bg-white border-gray-300 text-gray-900'
          }`}
        >
          {scenarios.map((scenario, index) => (
            <option key={index} value={index}>
              {scenario.scenario}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <div>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid stroke={isDarkMode ? '#374151' : '#E5E7EB'} />
              <PolarAngleAxis 
                dataKey="metric" 
                tick={{ fill: isDarkMode ? '#D1D5DB' : '#374151', fontSize: 11 }}
              />
              <PolarRadiusAxis
                domain={[0, 100]}
                tick={{ fill: isDarkMode ? '#9CA3AF' : '#6B7280', fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name="Performance"
                dataKey="value"
                stroke={colors[selectedScenario]}
                fill={colors[selectedScenario]}
                fillOpacity={0.3}
                strokeWidth={2}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Scenario Details */}
        <div className="space-y-4">
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h5 className={`font-semibold mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              {scenarios[selectedScenario].scenario}
            </h5>
            
            <div className="space-y-3">
              {[
                { label: 'Market Return', value: scenarios[selectedScenario].marketReturn, format: 'percent' },
                { label: 'Portfolio Return', value: scenarios[selectedScenario].portfolioReturn, format: 'percent' },
                { label: 'Volatility', value: scenarios[selectedScenario].volatility, format: 'percent' },
                { label: 'Max Drawdown', value: scenarios[selectedScenario].maxDrawdown, format: 'percent' },
                { label: 'Sharpe Ratio', value: scenarios[selectedScenario].sharpeRatio, format: 'number' }
              ].map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    {item.label}:
                  </span>
                  <span className={`font-medium ${
                    item.value >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.format === 'percent' ? 
                      `${(item.value * 100).toFixed(1)}%` : 
                      item.value.toFixed(3)
                    }
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* All Scenarios Comparison */}
          <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <h6 className={`font-medium mb-3 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              All Scenarios
            </h6>
            
            <div className="space-y-2">
              {scenarios.map((scenario, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedScenario(index)}
                  className={`w-full p-2 text-left rounded transition-colors ${
                    selectedScenario === index
                      ? isDarkMode ? 'bg-blue-900 text-blue-100' : 'bg-blue-100 text-blue-900'
                      : isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: colors[index] }}
                    />
                    <span className="text-sm font-medium">{scenario.scenario}</span>
                  </div>
                  <div className="text-xs mt-1 opacity-75">
                    Return: {(scenario.portfolioReturn * 100).toFixed(1)}% | 
                    Risk: {(scenario.volatility * 100).toFixed(1)}%
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Main Risk Visualizations Component
const RiskVisualizations: React.FC<RiskVisualizationsProps> = ({
  assets,
  correlationMatrix,
  efficientFrontier,
  riskFactors,
  currentPortfolio,
  isDarkMode = false,
  className = ''
}) => {
  const [activeTab, setActiveTab] = useState<'frontier' | 'correlation' | 'factors' | 'scenarios'>('frontier');

  // Mock scenario data
  const mockScenarios = [
    {
      scenario: 'Bull Market',
      marketReturn: 0.15,
      portfolioReturn: 0.18,
      volatility: 0.12,
      maxDrawdown: -0.08,
      sharpeRatio: 1.5
    },
    {
      scenario: 'Bear Market',
      marketReturn: -0.20,
      portfolioReturn: -0.15,
      volatility: 0.25,
      maxDrawdown: -0.35,
      sharpeRatio: -0.6
    },
    {
      scenario: 'Normal Market',
      marketReturn: 0.08,
      portfolioReturn: 0.10,
      volatility: 0.15,
      maxDrawdown: -0.12,
      sharpeRatio: 0.67
    },
    {
      scenario: 'High Inflation',
      marketReturn: 0.05,
      portfolioReturn: 0.07,
      volatility: 0.18,
      maxDrawdown: -0.15,
      sharpeRatio: 0.39
    },
    {
      scenario: 'Recession',
      marketReturn: -0.10,
      portfolioReturn: -0.08,
      volatility: 0.22,
      maxDrawdown: -0.25,
      sharpeRatio: -0.36
    }
  ];

  const tabs = [
    { id: 'frontier', label: 'Efficient Frontier', icon: '📊' },
    { id: 'correlation', label: 'Correlations', icon: '🔗' },
    { id: 'factors', label: 'Risk Factors', icon: '⚖️' },
    { id: 'scenarios', label: 'Scenarios', icon: '🎯' }
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
          className="min-h-[500px]"
        >
          {activeTab === 'frontier' && (
            <EfficientFrontierChart
              data={efficientFrontier}
              currentPortfolio={currentPortfolio}
              assets={assets}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'correlation' && (
            <CorrelationMatrix
              data={correlationMatrix}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'factors' && (
            <RiskFactorChart
              factors={riskFactors}
              isDarkMode={isDarkMode}
            />
          )}

          {activeTab === 'scenarios' && (
            <ScenarioSpiderChart
              scenarios={mockScenarios}
              isDarkMode={isDarkMode}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default RiskVisualizations;