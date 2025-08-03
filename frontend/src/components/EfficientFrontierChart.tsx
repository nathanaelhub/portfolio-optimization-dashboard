import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { usePortfolio, EfficientFrontierPoint } from '../contexts/PortfolioContext';

interface Point {
  x: number;
  y: number;
  data: EfficientFrontierPoint;
}

interface PortfolioPosition {
  x: number;
  y: number;
  label: string;
  type: 'current' | 'optimal';
}

const EfficientFrontierChart: React.FC = () => {
  const { state } = usePortfolio();
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });
  const [showAnimation, setShowAnimation] = useState(false);

  // Mock data for demonstration - replace with actual efficient frontier data
  const mockFrontierData: EfficientFrontierPoint[] = [
    { expected_return: 0.04, volatility: 0.08, sharpe_ratio: 0.3 },
    { expected_return: 0.05, volatility: 0.09, sharpe_ratio: 0.4 },
    { expected_return: 0.06, volatility: 0.11, sharpe_ratio: 0.45 },
    { expected_return: 0.07, volatility: 0.13, sharpe_ratio: 0.48 },
    { expected_return: 0.08, volatility: 0.16, sharpe_ratio: 0.43 },
    { expected_return: 0.09, volatility: 0.19, sharpe_ratio: 0.41 },
    { expected_return: 0.10, volatility: 0.22, sharpe_ratio: 0.39 },
    { expected_return: 0.11, volatility: 0.26, sharpe_ratio: 0.37 },
    { expected_return: 0.12, volatility: 0.30, sharpe_ratio: 0.35 },
  ];

  const frontierData = state.efficientFrontier.length > 0 ? state.efficientFrontier : mockFrontierData;

  // Current and optimal portfolio positions
  const currentPortfolio: PortfolioPosition = {
    x: 0.18, // Example current volatility
    y: 0.08, // Example current return
    label: 'Current Portfolio',
    type: 'current'
  };

  const optimalPortfolio: PortfolioPosition = {
    x: state.optimizationResult?.risk_metrics.volatility || 0.15,
    y: state.optimizationResult?.risk_metrics.expected_return || 0.09,
    label: 'Optimized Portfolio',
    type: 'optimal'
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const margin = { top: 20, right: 80, bottom: 60, left: 80 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Clear previous chart
    d3.select(svgRef.current).selectAll('*').remove();

    const svg = d3.select(svgRef.current)
      .attr('width', dimensions.width)
      .attr('height', dimensions.height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xExtent = d3.extent(frontierData, d => d.volatility) as [number, number];
    const yExtent = d3.extent(frontierData, d => d.expected_return) as [number, number];

    // Add some padding to the scales
    const xPadding = (xExtent[1] - xExtent[0]) * 0.1;
    const yPadding = (yExtent[1] - yExtent[0]) * 0.1;

    const xScale = d3.scaleLinear()
      .domain([Math.max(0, xExtent[0] - xPadding), xExtent[1] + xPadding])
      .range([0, width]);

    const yScale = d3.scaleLinear()
      .domain([yExtent[0] - yPadding, yExtent[1] + yPadding])
      .range([height, 0]);

    // Create line generator for the efficient frontier
    const line = d3.line<EfficientFrontierPoint>()
      .x(d => xScale(d.volatility))
      .y(d => yScale(d.expected_return))
      .curve(d3.curveCardinal);

    // Add grid lines
    const xTicks = xScale.ticks(8);
    const yTicks = yScale.ticks(8);

    // Vertical grid lines
    g.selectAll('.grid-x')
      .data(xTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-x')
      .attr('x1', d => xScale(d))
      .attr('x2', d => xScale(d))
      .attr('y1', 0)
      .attr('y2', height)
      .attr('stroke', '#f0f0f0')
      .attr('stroke-width', 1);

    // Horizontal grid lines
    g.selectAll('.grid-y')
      .data(yTicks)
      .enter()
      .append('line')
      .attr('class', 'grid-y')
      .attr('x1', 0)
      .attr('x2', width)
      .attr('y1', d => yScale(d))
      .attr('y2', d => yScale(d))
      .attr('stroke', '#f0f0f0')
      .attr('stroke-width', 1);

    // Add axes
    const xAxis = d3.axisBottom(xScale)
      .tickFormat(d => `${(d * 100).toFixed(1)}%`);

    const yAxis = d3.axisLeft(yScale)
      .tickFormat(d => `${(d * 100).toFixed(1)}%`);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .append('text')
      .attr('x', width / 2)
      .attr('y', 40)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Volatility (Risk)');

    g.append('g')
      .call(yAxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', -50)
      .attr('x', -height / 2)
      .attr('fill', 'black')
      .style('text-anchor', 'middle')
      .style('font-size', '14px')
      .text('Expected Return');

    // Add efficient frontier curve
    const path = g.append('path')
      .datum(frontierData)
      .attr('fill', 'none')
      .attr('stroke', '#3b82f6')
      .attr('stroke-width', 3)
      .attr('d', line);

    // Animate the path drawing
    const totalLength = path.node()?.getTotalLength() || 0;
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition()
      .duration(2000)
      .ease(d3.easeLinear)
      .attr('stroke-dashoffset', 0);

    // Add interactive dots on the frontier
    const dots = g.selectAll('.frontier-dot')
      .data(frontierData)
      .enter()
      .append('circle')
      .attr('class', 'frontier-dot')
      .attr('cx', d => xScale(d.volatility))
      .attr('cy', d => yScale(d.expected_return))
      .attr('r', 0)
      .attr('fill', '#3b82f6')
      .attr('opacity', 0.7)
      .style('cursor', 'pointer');

    // Animate dots appearance
    dots.transition()
      .delay(2000)
      .duration(500)
      .attr('r', 4);

    // Add zoom and pan behavior
    const zoom = d3.zoom<SVGGElement, unknown>()
      .scaleExtent([0.5, 5])
      .on('zoom', (event) => {
        const { transform } = event;
        g.attr('transform', `translate(${margin.left + transform.x},${margin.top + transform.y}) scale(${transform.k})`);
      });

    svg.call(zoom as any);

    // Add portfolio positions
    const portfolioPositions = [currentPortfolio, optimalPortfolio];

    const portfolioDots = g.selectAll('.portfolio-dot')
      .data(portfolioPositions)
      .enter()
      .append('g')
      .attr('class', 'portfolio-dot');

    portfolioDots.append('circle')
      .attr('cx', d => xScale(d.x))
      .attr('cy', d => yScale(d.y))
      .attr('r', 8)
      .attr('fill', d => d.type === 'current' ? '#ef4444' : '#10b981')
      .attr('stroke', 'white')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .on('mouseover', function(event, d) {
        showTooltip(event, d);
        d3.select(this).transition().duration(200).attr('r', 10);
      })
      .on('mouseout', function() {
        hideTooltip();
        d3.select(this).transition().duration(200).attr('r', 8);
      });

    // Add labels for portfolio positions
    portfolioDots.append('text')
      .attr('x', d => xScale(d.x))
      .attr('y', d => yScale(d.y) - 15)
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('fill', d => d.type === 'current' ? '#ef4444' : '#10b981')
      .text(d => d.label);

    // Add hover effects for frontier dots
    dots
      .on('mouseover', function(event, d) {
        showFrontierTooltip(event, d);
        d3.select(this).transition().duration(200).attr('r', 6);
      })
      .on('mouseout', function() {
        hideTooltip();
        d3.select(this).transition().duration(200).attr('r', 4);
      });

    // Animate portfolio movement if optimization result changes
    if (showAnimation && state.optimizationResult) {
      const optimalDot = portfolioDots.filter((d: any) => d.type === 'optimal');
      
      optimalDot.select('circle')
        .transition()
        .duration(1500)
        .ease(d3.easeBounce)
        .attr('cx', xScale(optimalPortfolio.x))
        .attr('cy', yScale(optimalPortfolio.y));

      optimalDot.select('text')
        .transition()
        .duration(1500)
        .attr('x', xScale(optimalPortfolio.x))
        .attr('y', yScale(optimalPortfolio.y) - 15);
    }

  }, [frontierData, dimensions, state.optimizationResult, showAnimation]);

  const showTooltip = (event: any, d: PortfolioPosition) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`
        <div class="font-semibold">${d.label}</div>
        <div>Return: ${(d.y * 100).toFixed(1)}%</div>
        <div>Risk: ${(d.x * 100).toFixed(1)}%</div>
        <div>Sharpe: ${((d.y - 0.02) / d.x).toFixed(2)}</div>
      `);
  };

  const showFrontierTooltip = (event: any, d: EfficientFrontierPoint) => {
    if (!tooltipRef.current) return;

    const tooltip = d3.select(tooltipRef.current);
    tooltip.style('opacity', 1)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px')
      .html(`
        <div class="font-semibold">Efficient Portfolio</div>
        <div>Return: ${(d.expected_return * 100).toFixed(1)}%</div>
        <div>Risk: ${(d.volatility * 100).toFixed(1)}%</div>
        <div>Sharpe: ${d.sharpe_ratio.toFixed(2)}</div>
      `);
  };

  const hideTooltip = () => {
    if (!tooltipRef.current) return;
    d3.select(tooltipRef.current).style('opacity', 0);
  };

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = svgRef.current?.parentElement;
      if (container) {
        const { width } = container.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, width),
          height: Math.max(300, width * 0.6)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Trigger animation when optimization result changes
  useEffect(() => {
    if (state.optimizationResult) {
      setShowAnimation(true);
      const timer = setTimeout(() => setShowAnimation(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.optimizationResult]);

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Efficient Frontier</h2>
              <p className="text-gray-600">
                Risk-return tradeoff visualization. Each point represents an optimal portfolio for its risk level.
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
              <h3 className="font-semibold text-blue-800 text-sm mb-2">💡 Understanding the Chart</h3>
              <p className="text-blue-700 text-xs">
                The curve shows optimal portfolios. Points above the line are impossible, 
                points below are inefficient. Your optimal portfolio balances risk and return.
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="relative">
            <svg ref={svgRef} className="w-full" />
            
            {/* Tooltip */}
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none bg-gray-800 text-white text-sm rounded-lg p-3 opacity-0 transition-opacity duration-200 z-10"
              style={{ transform: 'translateX(-50%)' }}
            />
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap justify-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-1 bg-blue-500 rounded"></div>
              <span>Efficient Frontier</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span>Current Portfolio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span>Optimized Portfolio</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded-full opacity-70"></div>
              <span>Efficient Portfolios</span>
            </div>
          </div>

          {/* Controls */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4 items-center justify-center">
            <button
              onClick={() => {
                const svg = d3.select(svgRef.current);
                svg.transition().duration(750).call(
                  d3.zoom<SVGSVGElement, unknown>().transform as any,
                  d3.zoomIdentity
                );
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              Reset Zoom
            </button>
            
            <div className="text-xs text-gray-500 text-center">
              <p>💡 <strong>Tip:</strong> Hover over points for details • Scroll to zoom • Drag to pan</p>
            </div>
          </div>

          {/* Performance Comparison */}
          {state.optimizationResult && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="font-semibold text-red-800 mb-2">Current Portfolio</h3>
                <div className="space-y-1 text-sm text-red-700">
                  <p>Return: {(currentPortfolio.y * 100).toFixed(1)}%</p>
                  <p>Risk: {(currentPortfolio.x * 100).toFixed(1)}%</p>
                  <p>Sharpe: {((currentPortfolio.y - 0.02) / currentPortfolio.x).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold text-green-800 mb-2">Optimized Portfolio</h3>
                <div className="space-y-1 text-sm text-green-700">
                  <p>Return: {(state.optimizationResult.risk_metrics.expected_return * 100).toFixed(1)}%</p>
                  <p>Risk: {(state.optimizationResult.risk_metrics.volatility * 100).toFixed(1)}%</p>
                  <p>Sharpe: {state.optimizationResult.risk_metrics.sharpe_ratio.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EfficientFrontierChart;