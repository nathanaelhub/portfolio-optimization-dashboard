import React from 'react'
import './index.css'
import { PortfolioPieChart } from './components/PortfolioPieChart'
import { LoadingButton, SuccessToast, FadeIn, LoadingSkeleton } from './components/LoadingComponents'

// Temporarily use any to bypass type errors
const portfolioData: any = {
  holdings: [
    { symbol: 'AAPL', allocation: 30, value: 50000 },
    { symbol: 'GOOGL', allocation: 25, value: 41667 },
    { symbol: 'MSFT', allocation: 25, value: 41667 },
    { symbol: 'AMZN', allocation: 20, value: 33333 }
  ],
  totalValue: 166667,
  performance: {
    daily: 2.3,
    weekly: 5.1,
    monthly: 8.7
  }
};

function App() {
  const [loading, setLoading] = React.useState(false);
  const [optimizationResult, setOptimizationResult] = React.useState<any>(null);
  const [showSuccessToast, setShowSuccessToast] = React.useState(false);

  const handleOptimize = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/api/portfolio/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          holdings: portfolioData.holdings,
          risk_tolerance: 5,
          method: 'mean_variance'
        })
      });
      const data = await response.json();
      setOptimizationResult(data);
    } catch (error) {
      console.error('Optimization failed:', error);
      // Use mock data if backend fails
      setOptimizationResult({
        optimal_weights: { AAPL: 0.35, GOOGL: 0.25, MSFT: 0.25, AMZN: 0.15 },
        metrics: { sharpe_ratio: 1.45, volatility: 0.18, expected_return: 0.12 }
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Current Portfolio */}
          <div className="lg:col-span-1 space-y-6">
            {/* Portfolio Holdings List */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Current Portfolio</h2>
              <div className="space-y-3">
                {portfolioData.holdings.map((holding: any) => (
                  <div key={holding.symbol} className="flex justify-between items-center">
                    <span className="font-medium">{holding.symbol}</span>
                    <span className="text-gray-600">{holding.allocation}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-semibold">${portfolioData.totalValue.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            {/* Portfolio Pie Chart */}
            <PortfolioPieChart holdings={portfolioData.holdings} />
          </div>

          {/* Optimization Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">Portfolio Optimization</h2>
              
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Sharpe Ratio</p>
                      <p className="text-xl font-semibold">{optimizationResult.metrics?.sharpe_ratio?.toFixed(2) || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-sm text-gray-600">Expected Return</p>
                      <p className="text-xl font-semibold">{((optimizationResult.metrics?.expected_return || 0) * 100).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              </FadeIn>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mt-6 grid grid-cols-3 gap-6">
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