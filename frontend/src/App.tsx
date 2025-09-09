import React from 'react'
import './index.css'
import { PortfolioPieChart } from './components/PortfolioPieChart'
import { PortfolioGrowthChart } from './components/PortfolioGrowthChart'
import { MetricsGrid } from './components/MetricsGrid'
import { LoadingButton, SuccessToast, FadeIn } from './components/LoadingComponents'
import { StockSelector } from './components/StockSelector'

interface SelectedStock {
  symbol: string;
  name: string;
  allocation: number;
  sector?: string;
}

function App() {
  const [loading, setLoading] = React.useState(false);
  const [optimizationResult, setOptimizationResult] = React.useState<any>(null);
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);
  const [selectedStrategy, setSelectedStrategy] = React.useState('mean_variance');
  const [selectedStocks, setSelectedStocks] = React.useState<SelectedStock[]>([
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 30, sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', allocation: 25, sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 25, sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', allocation: 20, sector: 'Technology' }
  ]);

  const portfolioData = React.useMemo(() => ({
    holdings: selectedStocks.map(stock => ({
      symbol: stock.symbol,
      allocation: stock.allocation,
      value: stock.allocation * 1000 // Mock value calculation
    })),
    totalValue: selectedStocks.reduce((sum, stock) => sum + (stock.allocation * 1000), 0),
    performance: {
      daily: 2.3,
      weekly: 5.1,
      monthly: 8.7
    }
  }), [selectedStocks]);

  const handleOptimize = async () => {
    if (selectedStocks.length === 0) {
      alert('Please select at least one stock to optimize');
      return;
    }

    setLoading(true);
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
      console.log('Optimization result:', data);
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
          max_drawdown: 0.08
        },
        status: 'demo_fallback',
        explanation: 'Using fallback data due to API error'
      });
    }
    setLoading(false);
    setShowSuccessToast(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Portfolio Optimization Dashboard</h1>
          <p className="text-gray-600">Professional-grade portfolio optimization with real-time analytics</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stock Selection */}
        <div className="mb-8">
          <StockSelector 
            selectedStocks={selectedStocks} 
            onSelectionChange={setSelectedStocks} 
          />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Portfolio */}
          <div className="lg:col-span-1 space-y-6">
            {/* Portfolio Holdings List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Current Portfolio</h2>
              {portfolioData.holdings.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {portfolioData.holdings.map((holding: any) => (
                      <div key={holding.symbol} className="flex justify-between items-center">
                        <span className="font-medium">{holding.symbol}</span>
                        <span className="text-gray-600">{holding.allocation.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 pt-6 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Value</span>
                      <span className="font-semibold">${portfolioData.totalValue.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p className="text-sm">No stocks selected</p>
                  <p className="text-xs mt-1">Add stocks above to see your portfolio</p>
                </div>
              )}
            </div>
            
            {/* Portfolio Pie Chart */}
            {portfolioData.holdings.length > 0 && (
              <PortfolioPieChart holdings={portfolioData.holdings} />
            )}
          </div>

          {/* Optimization Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Portfolio Optimization</h2>
              <p className="text-gray-600 mb-6">
                Select an optimization strategy and click to optimize your portfolio.
              </p>
              
              {/* Strategy Selector */}
              <div className="mb-6">
                <label htmlFor="strategy-selector" className="block text-sm font-medium text-gray-700 mb-2">
                  Optimization Strategy
                </label>
                <select
                  id="strategy-selector"
                  value={selectedStrategy}
                  onChange={(e) => setSelectedStrategy(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equal_weight">Equal Weight (1/N portfolio)</option>
                  <option value="mean_variance">Maximum Sharpe Ratio (Mean Variance)</option>
                  <option value="min_volatility">Minimum Volatility</option>
                </select>
              </div>
              
              <LoadingButton
                onClick={handleOptimize}
                loading={loading}
              >
                Optimize Portfolio
              </LoadingButton>
            </div>
            
            {optimizationResult && (
              <FadeIn delay={200}>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">Optimization Results</h3>
                  
                  {/* Portfolio Metrics */}
                  <div className="mb-6">
                    <h4 className="font-medium mb-3">Portfolio Metrics</h4>
                    <MetricsGrid metrics={optimizationResult.metrics || {}} />
                  </div>
                  
                  {/* Optimized Weights */}
                  <div>
                    <h4 className="font-medium mb-3">Optimized Allocation</h4>
                    <div className="space-y-2">
                      {Object.entries(optimizationResult.optimal_weights || {}).map(([symbol, weight]: [string, any]) => (
                        <div key={symbol} className="flex justify-between">
                          <span>{symbol}</span>
                          <span className="font-medium">{(weight * 100).toFixed(1)}%</span>
                        </div>
                      ))}
                    </div>
                    
                    {/* Strategy Explanation */}
                    {optimizationResult.explanation && (
                      <div className="mt-4 p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-blue-800">{optimizationResult.explanation}</p>
                      </div>
                    )}
                    
                    {/* Confidence Score */}
                    {optimizationResult.confidence_score && (
                      <div className="mt-2 flex justify-between text-sm">
                        <span>Confidence Score:</span>
                        <span className="font-medium">{(optimizationResult.confidence_score * 100).toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </div>

        {/* Portfolio Growth Chart */}
        <div className="mt-6">
          <PortfolioGrowthChart />
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Daily Change</p>
            <p className="text-2xl font-semibold text-green-600">+{portfolioData.performance.daily}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Weekly Change</p>
            <p className="text-2xl font-semibold text-green-600">+{portfolioData.performance.weekly}%</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm text-gray-600">Monthly Change</p>
            <p className="text-2xl font-semibold text-green-600">+{portfolioData.performance.monthly}%</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 text-center text-gray-500 text-sm">
          <p>🚀 Built with React, TypeScript, and FastAPI</p>
          <p>✨ Professional Portfolio Optimization Dashboard</p>
        </footer>
      </main>

      {/* Success Toast */}
      <SuccessToast
        message="Portfolio optimized successfully! ✨"
        visible={showSuccessToast}
        onClose={() => setShowSuccessToast(false)}
      />
    </div>
  );
}

export default App;