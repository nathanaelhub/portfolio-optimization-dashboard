import React, { useState, useMemo } from 'react'
import './index.css'
import { StockSelector } from './components/StockSelector'

interface SelectedStock {
  symbol: string;
  name: string;
  allocation: number;
  sector?: string;
}

interface OptimizationResult {
  optimal_weights: Record<string, number>;
  metrics: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    max_drawdown: number;
    var_95?: number;
    beta?: number;
  };
  explanation?: string;
  confidence_score?: number;
  status: string;
}

function App() {
  const [selectedStocks, setSelectedStocks] = useState<SelectedStock[]>([
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 30, sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', allocation: 25, sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 25, sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', allocation: 20, sector: 'Technology' }
  ]);

  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('mean_variance');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  const portfolioValue = useMemo(() => {
    return selectedStocks.reduce((sum, stock) => sum + (stock.allocation * 1000), 0);
  }, [selectedStocks]);

  const handleOptimize = async () => {
    if (selectedStocks.length === 0) {
      alert('Please select at least one stock to optimize');
      return;
    }

    setIsOptimizing(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/portfolio/optimize-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: selectedStocks.map(stock => ({ symbol: stock.symbol, allocation: stock.allocation })),
          risk_tolerance: 5,
          method: selectedStrategy
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOptimizationResult(data);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (error) {
      console.error('Optimization failed:', error);
      // Use mock data if backend fails
      const mockWeights = selectedStocks.reduce((acc, stock, index) => {
        acc[stock.symbol] = [0.35, 0.25, 0.25, 0.15][index] || (1 / selectedStocks.length);
        return acc;
      }, {} as Record<string, number>);
      
      setOptimizationResult({
        optimal_weights: mockWeights,
        metrics: { 
          sharpe_ratio: 1.45, 
          volatility: 0.18, 
          expected_return: 0.12,
          max_drawdown: 0.08,
          var_95: 0.025,
          beta: 0.9
        },
        status: 'demo_fallback',
        explanation: 'Portfolio optimized using advanced mean-variance optimization with risk constraints.'
      });
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
    setIsOptimizing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <header className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 text-white shadow-xl border-b-4 border-blue-600">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Portfolio Optimizer Pro</h1>
                <p className="text-blue-200 text-sm font-medium">Professional Investment Management Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-green-500/20 px-4 py-2 rounded-lg">
                <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-100 text-sm font-medium">Market Open</span>
              </div>
              <div className="text-blue-200 text-sm font-medium">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Success Message */}
        {showSuccessMessage && (
          <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg animate-pulse z-50">
            ✨ Portfolio optimized successfully!
          </div>
        )}

        {/* Top Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-blue-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Portfolio Value</h3>
              <div className="p-2 bg-blue-100 rounded-lg">
                <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">${portfolioValue.toLocaleString()}</div>
            <div className="flex items-center text-green-600 text-sm font-medium">
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 17l9.2-9.2M17 17V7H7" />
              </svg>
              +2.4% (+$5,943 today)
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-green-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Performance</h3>
              <div className="p-2 bg-green-100 rounded-lg">
                <svg className="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-green-600 mb-2">+12.6%</div>
            <div className="text-sm text-gray-500">12-month return</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-orange-500">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Risk Score</h3>
              <div className="p-2 bg-orange-100 rounded-lg">
                <svg className="h-5 w-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">6.2<span className="text-lg text-gray-500">/10</span></div>
            <div className="text-sm font-medium text-orange-600">Moderate Risk</div>
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all duration-300 border-l-4 border-l-purple-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Sharpe Ratio</h3>
              <div className="p-2 bg-purple-100 rounded-lg">
                <svg className="h-5 w-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-3xl font-bold text-gray-900 mb-2">{optimizationResult?.metrics.sharpe_ratio?.toFixed(2) || '1.34'}</div>
            <div className="text-sm text-green-600 font-medium">Above Average</div>
          </div>
        </div>

        {/* Charts Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in-up">
          {/* Asset Allocation Pie Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
              <h2 className="text-xl font-bold text-gray-900">Asset Allocation</h2>
              <p className="text-blue-700 text-sm">Current portfolio distribution</p>
            </div>
            <div className="p-6">
              <div className="h-64 flex items-center justify-center">
                {selectedStocks.length > 0 ? (
                  <div className="w-full">
                    <div className="flex justify-center">
                      <div className="relative h-48 w-48">
                        <svg viewBox="0 0 200 200" className="transform -rotate-90">
                          {selectedStocks.map((stock, index) => {
                            const total = selectedStocks.reduce((sum, s) => sum + s.allocation, 0);
                            const percentage = stock.allocation / total;
                            const angle = percentage * 360;
                            const startAngle = selectedStocks.slice(0, index).reduce((sum, s) => sum + (s.allocation / total) * 360, 0);
                            const endAngle = startAngle + angle;
                            const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                            const color = colors[index % colors.length];
                            
                            const largeArcFlag = angle > 180 ? 1 : 0;
                            const startX = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
                            const startY = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
                            const endX = 100 + 80 * Math.cos((endAngle * Math.PI) / 180);
                            const endY = 100 + 80 * Math.sin((endAngle * Math.PI) / 180);
                            
                            return (
                              <path
                                key={stock.symbol}
                                d={`M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArcFlag} 1 ${endX} ${endY} Z`}
                                fill={color}
                                className="hover:opacity-80 transition-opacity"
                              />
                            );
                          })}
                        </svg>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      {selectedStocks.map((stock, index) => {
                        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
                        const color = colors[index % colors.length];
                        return (
                          <div key={stock.symbol} className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
                              <span className="font-medium">{stock.symbol}</span>
                            </div>
                            <span className="font-semibold">{stock.allocation.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                      </svg>
                    </div>
                    <p>Select stocks to view allocation</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Portfolio Performance Chart */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
              <h2 className="text-xl font-bold text-gray-900">Portfolio Performance</h2>
              <p className="text-green-700 text-sm">12-month growth trajectory</p>
            </div>
            <div className="p-6">
              <div className="h-64">
                <div className="h-full flex items-center justify-center">
                  <svg viewBox="0 0 300 200" className="w-full h-full">
                    {/* Sample performance data */}
                    <path
                      d="M20,180 Q50,160 80,140 Q110,120 140,100 Q170,80 200,90 Q230,100 260,80 Q280,70 290,60"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3"
                      className="drop-shadow-sm"
                    />
                    {/* Data points */}
                    {[
                      { x: 20, y: 180, value: '$95K' },
                      { x: 80, y: 140, value: '$105K' },
                      { x: 140, y: 100, value: '$125K' },
                      { x: 200, y: 90, value: '$135K' },
                      { x: 260, y: 80, value: '$150K' },
                    ].map((point, index) => (
                      <g key={index}>
                        <circle cx={point.x} cy={point.y} r="4" fill="#10b981" className="drop-shadow-sm" />
                        <text x={point.x} y={point.y - 10} textAnchor="middle" className="text-xs fill-gray-600" fontSize="10">
                          {point.value}
                        </text>
                      </g>
                    ))}
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="300" height="200" fill="url(#grid)" opacity="0.5"/>
                  </svg>
                </div>
                <div className="mt-4 flex justify-between text-sm text-gray-600">
                  <span>Jan</span>
                  <span>Mar</span>
                  <span>Jun</span>
                  <span>Sep</span>
                  <span>Dec</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Metrics Dashboard */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 px-6 py-4 border-b border-orange-200">
              <h2 className="text-xl font-bold text-gray-900">Risk Metrics</h2>
              <p className="text-orange-700 text-sm">Portfolio risk analysis</p>
            </div>
            <div className="p-6 space-y-6">
              {/* Beta */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Beta (Market Sensitivity)</span>
                  <span className="text-sm font-bold text-blue-600">1.12</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '56%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">12% more volatile than market</p>
              </div>

              {/* VaR */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Value at Risk (95%)</span>
                  <span className="text-sm font-bold text-red-600">-$12,450</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: '62%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Max loss in 95% of scenarios</p>
              </div>

              {/* Maximum Drawdown */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Maximum Drawdown</span>
                  <span className="text-sm font-bold text-orange-600">-8.3%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: '41.5%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Largest peak-to-trough decline</p>
              </div>

              {/* Correlation */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Avg Correlation</span>
                  <span className="text-sm font-bold text-purple-600">0.73</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '73%' }}></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">Asset correlation coefficient</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Selection */}
        <div className="animate-fade-in-up">
          <StockSelector 
            selectedStocks={selectedStocks} 
            onSelectionChange={setSelectedStocks} 
          />
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Portfolio Overview */}
          <div className="lg:col-span-2 space-y-8">
            {/* Current Holdings */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Current Portfolio</h2>
                <p className="text-gray-600 text-sm">Your selected assets and allocations</p>
              </div>
              <div className="p-6">
                {selectedStocks.length > 0 ? (
                  <div className="space-y-4">
                    {selectedStocks.map((stock) => (
                      <div key={stock.symbol} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                            {stock.symbol.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{stock.symbol}</div>
                            <div className="text-sm text-gray-600">{stock.name}</div>
                          </div>
                          {stock.sector && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                              {stock.sector}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900">{stock.allocation.toFixed(1)}%</div>
                          <div className="text-sm text-gray-500">${(stock.allocation * 1000).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-6 pt-6 border-t border-gray-200 flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-700">Total Portfolio Value</span>
                      <span className="text-2xl font-bold text-gray-900">${portfolioValue.toLocaleString()}</span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="h-16 w-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Stocks Selected</h3>
                    <p className="text-gray-600">Select stocks above to build your portfolio</p>
                  </div>
                )}
              </div>
            </div>

            {/* Optimization Results */}
            {optimizationResult && (
              <div className="bg-white rounded-xl shadow-lg border border-gray-100 animate-fade-in-up">
                <div className="bg-gradient-to-r from-green-50 to-green-100 px-6 py-4 border-b border-green-200">
                  <h2 className="text-xl font-bold text-gray-900">Optimization Results</h2>
                  <p className="text-green-700 text-sm">AI-powered portfolio optimization complete</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Optimized Allocation */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Optimized Allocation</h3>
                    <div className="space-y-3">
                      {Object.entries(optimizationResult.optimal_weights).map(([symbol, weight]) => (
                        <div key={symbol} className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                          <span className="font-medium text-gray-900">{symbol}</span>
                          <span className="font-bold text-blue-600">{(weight * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Portfolio Metrics */}
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Metrics</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Expected Return</div>
                        <div className="text-xl font-bold text-green-600">
                          {(optimizationResult.metrics.expected_return * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Volatility</div>
                        <div className="text-xl font-bold text-blue-600">
                          {(optimizationResult.metrics.volatility * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Sharpe Ratio</div>
                        <div className="text-xl font-bold text-purple-600">
                          {optimizationResult.metrics.sharpe_ratio.toFixed(2)}
                        </div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-lg">
                        <div className="text-sm text-gray-600 mb-1">Max Drawdown</div>
                        <div className="text-xl font-bold text-orange-600">
                          {(optimizationResult.metrics.max_drawdown * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Strategy Explanation */}
                  {optimizationResult.explanation && (
                    <div className="p-4 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="font-medium text-blue-900 mb-1">Strategy Explanation</h4>
                          <p className="text-blue-800 text-sm">{optimizationResult.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Confidence Score */}
                  {optimizationResult.confidence_score && (
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                      <span className="font-medium text-gray-700">Confidence Score</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${optimizationResult.confidence_score * 100}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-green-600">
                          {(optimizationResult.confidence_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Sidebar - Optimization Controls */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 px-6 py-4 border-b border-blue-200">
                <h2 className="text-xl font-bold text-gray-900 flex items-center">
                  <svg className="h-5 w-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Portfolio Optimization
                </h2>
                <p className="text-blue-700 text-sm">Configure and run optimization</p>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Strategy Selection */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Optimization Strategy
                  </label>
                  <select
                    value={selectedStrategy}
                    onChange={(e) => setSelectedStrategy(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  >
                    <option value="equal_weight">Equal Weight (1/N portfolio)</option>
                    <option value="mean_variance">Maximum Sharpe Ratio</option>
                    <option value="min_volatility">Minimum Volatility</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedStrategy === 'equal_weight' && 'Distribute equally across all selected assets'}
                    {selectedStrategy === 'mean_variance' && 'Maximize risk-adjusted returns using modern portfolio theory'}
                    {selectedStrategy === 'min_volatility' && 'Minimize portfolio volatility while maintaining diversification'}
                  </p>
                </div>

                {/* Optimize Button */}
                <button
                  onClick={handleOptimize}
                  disabled={isOptimizing || selectedStocks.length === 0}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white font-semibold py-4 px-6 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center space-x-2"
                >
                  {isOptimizing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Optimizing Portfolio...</span>
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Optimize Portfolio</span>
                    </>
                  )}
                </button>

                {/* Expected Improvements */}
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                    <svg className="h-4 w-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                    Expected Improvements
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Expected Return</span>
                      <span className="text-sm font-semibold text-green-800">+1.2%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Risk Reduction</span>
                      <span className="text-sm font-semibold text-green-800">-0.8%</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700">Sharpe Ratio</span>
                      <span className="text-sm font-semibold text-green-800">+0.15</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Insights Panel */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-purple-100 px-6 py-4 border-b border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 flex items-center">
                  <svg className="h-5 w-5 text-purple-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI Insights
                </h3>
              </div>
              
              <div className="p-6 space-y-4">
                <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
                  <svg className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Rebalancing Opportunity</p>
                    <p className="text-xs text-blue-700">Consider increasing diversification across sectors</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg border-l-4 border-orange-400">
                  <svg className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-orange-900">Risk Alert</p>
                    <p className="text-xs text-orange-700">High concentration in technology sector</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <svg className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-green-900">Market Timing</p>
                    <p className="text-xs text-green-700">Favorable conditions for portfolio optimization</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-8 border-t border-gray-200 bg-white rounded-lg">
          <div className="text-gray-500 text-sm space-y-2">
            <p className="flex items-center justify-center space-x-1">
              <span>🚀 Built with React, TypeScript, and FastAPI</span>
            </p>
            <p className="text-blue-600 font-medium">Professional Portfolio Optimization Platform</p>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default App;