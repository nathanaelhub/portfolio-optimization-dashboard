import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { usePortfolio } from '../contexts/PortfolioContext';

interface RiskDecompositionData {
  asset: string;
  sector: string;
  contribution: number;
  volatility: number;
  beta: number;
  var_contribution: number;
}

interface CorrelationData {
  source: string;
  target: string;
  correlation: number;
}

interface StressScenario {
  name: string;
  description: string;
  impact: number;
  probability: number;
  timeframe: string;
}

const RiskAnalysisPanel: React.FC = () => {
  const { state } = usePortfolio();
  const correlationRef = useRef<SVGSVGElement>(null);
  const [activeTab, setActiveTab] = useState<'decomposition' | 'correlation' | 'stress' | 'drawdown'>('decomposition');
  const [dimensions, setDimensions] = useState({ width: 500, height: 400 });

  // Mock data - in production, this would come from the backend
  const mockRiskDecomposition: RiskDecompositionData[] = [
    { asset: 'AAPL', sector: 'Technology', contribution: 35.2, volatility: 24.5, beta: 1.15, var_contribution: 28.3 },
    { asset: 'MSFT', sector: 'Technology', contribution: 28.1, volatility: 22.1, beta: 0.95, var_contribution: 25.7 },
    { asset: 'GOOGL', sector: 'Technology', contribution: 20.4, volatility: 26.8, beta: 1.08, var_contribution: 23.1 },
    { asset: 'TSLA', sector: 'Consumer Discretionary', contribution: 16.3, volatility: 45.2, beta: 2.01, var_contribution: 22.9 }
  ];

  const mockCorrelationData: CorrelationData[] = [
    { source: 'AAPL', target: 'MSFT', correlation: 0.73 },
    { source: 'AAPL', target: 'GOOGL', correlation: 0.68 },
    { source: 'AAPL', target: 'TSLA', correlation: 0.51 },
    { source: 'MSFT', target: 'GOOGL', correlation: 0.71 },
    { source: 'MSFT', target: 'TSLA', correlation: 0.45 },
    { source: 'GOOGL', target: 'TSLA', correlation: 0.48 }
  ];

  const mockStressScenarios: StressScenario[] = [
    {
      name: 'Market Crash',
      description: '2008-style financial crisis with 40% market decline',
      impact: -32.5,
      probability: 0.05,
      timeframe: '6 months'
    },
    {
      name: 'Tech Bubble Burst',
      description: 'Technology sector correction similar to dot-com crash',
      impact: -28.7,
      probability: 0.08,
      timeframe: '12 months'
    },
    {
      name: 'Interest Rate Spike',
      description: 'Rapid increase in interest rates by 3-4%',
      impact: -15.2,
      probability: 0.15,
      timeframe: '3 months'
    },
    {
      name: 'Inflation Surge',
      description: 'Sustained inflation above 8% annually',
      impact: -12.8,
      probability: 0.20,
      timeframe: '18 months'
    }
  ];

  // Generate correlation matrix heatmap
  useEffect(() => {
    if (!correlationRef.current || activeTab !== 'correlation') return;

    const svg = d3.select(correlationRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = dimensions.width - margin.left - margin.right;
    const height = dimensions.height - margin.top - margin.bottom;

    // Get unique assets
    const assets = Array.from(new Set([
      ...mockCorrelationData.map(d => d.source),
      ...mockCorrelationData.map(d => d.target)
    ])).sort();

    // Create correlation matrix
    const correlationMatrix: Record<string, Record<string, number>> = {};
    assets.forEach(asset => {
      correlationMatrix[asset] = {};
      assets.forEach(other => {
        if (asset === other) {
          correlationMatrix[asset][other] = 1.0;
        } else {
          const correlation = mockCorrelationData.find(
            d => (d.source === asset && d.target === other) ||
                 (d.source === other && d.target === asset)
          );
          correlationMatrix[asset][other] = correlation ? correlation.correlation : 0;
        }
      });
    });

    const g = svg
      .attr('width', dimensions.width)
      .attr('height', dimensions.height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const xScale = d3.scaleBand()
      .domain(assets)
      .range([0, width])
      .padding(0.1);

    const yScale = d3.scaleBand()
      .domain(assets)
      .range([0, height])
      .padding(0.1);

    const colorScale = d3.scaleSequential()
      .domain([-1, 1])
      .interpolator(d3.interpolateRdYlBu);

    // Add cells
    assets.forEach(source => {
      assets.forEach(target => {
        const correlation = correlationMatrix[source][target];
        
        g.append('rect')
          .attr('x', xScale(target))
          .attr('y', yScale(source))
          .attr('width', xScale.bandwidth())
          .attr('height', yScale.bandwidth())
          .attr('fill', colorScale(correlation))
          .attr('stroke', '#fff')
          .attr('stroke-width', 1)
          .style('cursor', 'pointer')
          .on('mouseover', function(event) {
            // Tooltip
            const tooltip = d3.select('body')
              .append('div')
              .attr('class', 'correlation-tooltip')
              .style('position', 'absolute')
              .style('background', 'rgba(0,0,0,0.8)')
              .style('color', 'white')
              .style('padding', '8px')
              .style('border-radius', '4px')
              .style('font-size', '12px')
              .style('pointer-events', 'none')
              .style('z-index', '1000')
              .html(`${source} vs ${target}<br/>Correlation: ${correlation.toFixed(3)}`);

            tooltip
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          })
          .on('mouseout', function() {
            d3.selectAll('.correlation-tooltip').remove();
          });

        // Add correlation values
        if (Math.abs(correlation) > 0.1) {
          g.append('text')
            .attr('x', xScale(target)! + xScale.bandwidth() / 2)
            .attr('y', yScale(source)! + yScale.bandwidth() / 2)
            .attr('text-anchor', 'middle')
            .attr('dominant-baseline', 'middle')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('fill', Math.abs(correlation) > 0.6 ? 'white' : 'black')
            .text(correlation.toFixed(2));
        }
      });
    });

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px');

    g.append('g')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px');

    // Add title
    g.append('text')
      .attr('x', width / 2)
      .attr('y', -20)
      .attr('text-anchor', 'middle')
      .attr('font-size', '14px')
      .attr('font-weight', 'bold')
      .text('Asset Correlation Matrix');

  }, [dimensions, activeTab, mockCorrelationData]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const container = correlationRef.current?.parentElement;
      if (container) {
        const { width } = container.getBoundingClientRect();
        setDimensions({
          width: Math.max(400, width - 40),
          height: Math.max(300, (width - 40) * 0.8)
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSectorColor = (sector: string) => {
    const colors: Record<string, string> = {
      'Technology': '#3b82f6',
      'Consumer Discretionary': '#10b981',
      'Healthcare': '#f59e0b',
      'Financials': '#8b5cf6',
      'Energy': '#ef4444',
      'Industrials': '#06b6d4'
    };
    return colors[sector] || '#6b7280';
  };

  const getRiskLevel = (contribution: number) => {
    if (contribution > 30) return { level: 'High', color: 'text-red-600 bg-red-50' };
    if (contribution > 20) return { level: 'Medium', color: 'text-yellow-600 bg-yellow-50' };
    return { level: 'Low', color: 'text-green-600 bg-green-50' };
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Risk Analysis</h2>
              <p className="text-gray-600">
                Comprehensive risk assessment and decomposition of your portfolio
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-sm">
              <h3 className="font-semibold text-blue-800 text-sm mb-2">📊 Risk Insights</h3>
              <p className="text-blue-700 text-xs">
                Understanding risk sources helps optimize diversification and identify concentration risks.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'decomposition', label: 'Risk Decomposition', icon: '🔍' },
              { id: 'correlation', label: 'Correlations', icon: '🔗' },
              { id: 'stress', label: 'Stress Tests', icon: '⚡' },
              { id: 'drawdown', label: 'Drawdown Analysis', icon: '📉' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'decomposition' && (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4">
                  <div className="text-sm opacity-90">Portfolio Volatility</div>
                  <div className="text-2xl font-bold">
                    {state.optimizationResult ? 
                      `${(state.optimizationResult.risk_metrics.volatility * 100).toFixed(1)}%` : 
                      '18.5%'
                    }
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4">
                  <div className="text-sm opacity-90">Diversification Ratio</div>
                  <div className="text-2xl font-bold">0.73</div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4">
                  <div className="text-sm opacity-90">Concentration Risk</div>
                  <div className="text-2xl font-bold">Medium</div>
                </div>
              </div>

              {/* Risk Decomposition Table */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Risk Contribution by Asset</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Asset
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sector
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Risk Contribution
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Volatility
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Beta
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          VaR Contribution
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockRiskDecomposition.map((item, index) => {
                        const riskLevel = getRiskLevel(item.contribution);
                        return (
                          <tr key={item.asset} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="font-medium text-gray-900">{item.asset}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span 
                                className="inline-flex px-2 py-1 text-xs font-semibold rounded-full text-white"
                                style={{ backgroundColor: getSectorColor(item.sector) }}
                              >
                                {item.sector}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-1">
                                  <div className="text-sm font-medium text-gray-900">
                                    {item.contribution.toFixed(1)}%
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                                    <div 
                                      className="bg-blue-600 h-2 rounded-full"
                                      style={{ width: `${item.contribution}%` }}
                                    ></div>
                                  </div>
                                </div>
                                <span className={`ml-2 px-2 py-1 text-xs rounded-full ${riskLevel.color}`}>
                                  {riskLevel.level}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.volatility.toFixed(1)}%
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.beta.toFixed(2)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.var_contribution.toFixed(1)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'correlation' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Asset Correlation Heatmap</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Higher correlations (red) indicate assets move together, reducing diversification benefits
                </p>
              </div>
              
              <div className="flex justify-center">
                <svg ref={correlationRef} className="border border-gray-200 rounded-lg" />
              </div>

              {/* Color Legend */}
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span>Strong Negative (-1.0)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-yellow-400 rounded"></div>
                  <span>No Correlation (0.0)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span>Strong Positive (1.0)</span>
                </div>
              </div>

              {/* Correlation Insights */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-semibold text-red-800 mb-2">High Correlations</h4>
                  <ul className="text-sm text-red-700 space-y-1">
                    {mockCorrelationData
                      .filter(d => d.correlation > 0.7)
                      .map(d => (
                        <li key={`${d.source}-${d.target}`}>
                          {d.source} ↔ {d.target}: {d.correlation.toFixed(2)}
                        </li>
                      ))}
                  </ul>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">Diversification Opportunities</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    {mockCorrelationData
                      .filter(d => d.correlation < 0.6)
                      .map(d => (
                        <li key={`${d.source}-${d.target}`}>
                          {d.source} ↔ {d.target}: {d.correlation.toFixed(2)}
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'stress' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Stress Test Scenarios</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Potential portfolio performance under adverse market conditions
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockStressScenarios.map((scenario, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-6">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="text-lg font-semibold text-gray-800">{scenario.name}</h4>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        scenario.impact > -20 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {scenario.impact > 0 ? '+' : ''}{scenario.impact.toFixed(1)}%
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">{scenario.description}</p>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Probability:</span>
                        <span className="font-medium">{(scenario.probability * 100).toFixed(0)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Timeframe:</span>
                        <span className="font-medium">{scenario.timeframe}</span>
                      </div>
                    </div>

                    {/* Impact Bar */}
                    <div className="mt-4">
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                          className={`h-3 rounded-full ${
                            scenario.impact > -20 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.abs(scenario.impact) * 2}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stress Test Summary */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h4 className="font-semibold text-gray-800 mb-3">Portfolio Resilience Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">-32.5%</div>
                    <div className="text-sm text-gray-600">Worst Case Scenario</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">-17.1%</div>
                    <div className="text-sm text-gray-600">Average Stress Impact</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">73%</div>
                    <div className="text-sm text-gray-600">Recovery Probability</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'drawdown' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Historical Drawdown Analysis</h3>
                <p className="text-gray-600 text-sm mb-6">
                  Peak-to-trough declines help understand portfolio downside risk
                </p>
              </div>

              {/* Drawdown Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-red-800 font-semibold text-sm">Max Drawdown</div>
                  <div className="text-2xl font-bold text-red-600">-23.4%</div>
                  <div className="text-xs text-red-600 mt-1">Mar 2020</div>
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="text-yellow-800 font-semibold text-sm">Avg Drawdown</div>
                  <div className="text-2xl font-bold text-yellow-600">-8.7%</div>
                  <div className="text-xs text-yellow-600 mt-1">Typical decline</div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="text-blue-800 font-semibold text-sm">Recovery Time</div>
                  <div className="text-2xl font-bold text-blue-600">4.2</div>
                  <div className="text-xs text-blue-600 mt-1">Months (avg)</div>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="text-green-800 font-semibold text-sm">Calmar Ratio</div>
                  <div className="text-2xl font-bold text-green-600">0.64</div>
                  <div className="text-xs text-green-600 mt-1">Return/Max DD</div>
                </div>
              </div>

              {/* Drawdown Periods */}
              <div>
                <h4 className="font-semibold text-gray-800 mb-4">Significant Drawdown Periods</h4>
                <div className="space-y-3">
                  {[
                    { period: 'Mar 2020 - Aug 2020', drawdown: -23.4, duration: '5 months', recovery: '3 months' },
                    { period: 'Dec 2018 - Mar 2019', drawdown: -18.7, duration: '3 months', recovery: '4 months' },
                    { period: 'Feb 2018 - Apr 2018', drawdown: -12.3, duration: '2 months', recovery: '2 months' },
                    { period: 'Aug 2015 - Feb 2016', drawdown: -15.8, duration: '6 months', recovery: '8 months' }
                  ].map((dd, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{dd.period}</div>
                        <div className="text-sm text-gray-600">Duration: {dd.duration} • Recovery: {dd.recovery}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-red-600">{dd.drawdown}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Risk Insights */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Drawdown Insights</h4>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Your portfolio shows resilience with relatively quick recovery times</li>
                  <li>• Maximum drawdown is within acceptable range for a growth-oriented portfolio</li>
                  <li>• Consider increasing defensive allocations if comfort with volatility decreases</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RiskAnalysisPanel;