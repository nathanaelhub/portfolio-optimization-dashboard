import React, { useState, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { usePortfolio, portfolioSelectors } from '../contexts/PortfolioContext';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { RecommendationExplanation, ContextualWarning, SharpeRatioTooltip, DiversificationTooltip, RebalancingTooltip } from './EducationalTooltip';
import { RecommendationEngine, WarningSystem } from '../services/educationalContent';

interface AllocationData {
  symbol: string;
  name: string;
  current: number;
  target: number;
  difference: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  color: string;
}

const COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6b7280'
];

const OptimizationResults: React.FC = () => {
  const { state } = usePortfolio();
  const [activeTab, setActiveTab] = useState<'allocation' | 'performance' | 'changes' | 'explanation'>('allocation');
  const [isExporting, setIsExporting] = useState(false);
  const [warnings, setWarnings] = useState<any[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  const [explanation, setExplanation] = useState<any>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  if (!state.optimizationResult) {
    return (
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">No Optimization Results</h3>
          <p className="text-gray-500">Run a portfolio optimization to see results here.</p>
        </div>
      </div>
    );
  }

  const { optimizationResult, holdings } = state;
  const allocationDifferences = portfolioSelectors.getAllocationDifference(holdings, optimizationResult.weights);

  // Generate recommendation explanation and warnings
  useEffect(() => {
    if (optimizationResult) {
      // Generate explanation
      const currentPortfolio = {
        weights: holdings.reduce((acc, h) => ({ ...acc, [h.symbol]: h.allocation / 100 }), {}),
        sharpe_ratio: 0.5, // Mock current sharpe
        volatility: 0.18 // Mock current volatility
      };
      
      const generatedExplanation = RecommendationEngine.generateExplanation(
        currentPortfolio,
        optimizationResult,
        { minWeight: 0.05, maxWeight: 0.4 },
        optimizationResult.method_used
      );
      setExplanation(generatedExplanation);

      // Generate warnings
      const portfolioWarnings = WarningSystem.analyzePortfolio(optimizationResult);
      setWarnings(portfolioWarnings);
    }
  }, [optimizationResult, holdings]);

  // Prepare data for charts
  const allocationData: AllocationData[] = Object.entries(allocationDifferences).map(([symbol, data], index) => ({
    symbol,
    name: holdings.find(h => h.symbol === symbol)?.name || symbol,
    current: data.current,
    target: data.target,
    difference: data.difference,
    action: data.action,
    color: COLORS[index % COLORS.length]
  }));

  const currentPieData = allocationData
    .filter(d => d.current > 0)
    .map(d => ({ name: d.symbol, value: d.current, color: d.color }));

  const targetPieData = allocationData
    .filter(d => d.target > 0)
    .map(d => ({ name: d.symbol, value: d.target, color: d.color }));

  const comparisonBarData = allocationData
    .filter(d => d.current > 0 || d.target > 0)
    .map(d => ({
      symbol: d.symbol,
      current: d.current,
      target: d.target
    }));

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-800">{data.name}</p>
          <p className="text-sm text-blue-600">
            Allocation: {formatPercentage(data.value)}
          </p>
        </div>
      );
    }
    return null;
  };

  const exportToPDF = async () => {
    if (!resultsRef.current) return;
    
    setIsExporting(true);
    try {
      const canvas = await html2canvas(resultsRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save('portfolio-optimization-results.pdf');
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    const csvData = [
      ['Symbol', 'Name', 'Current Allocation (%)', 'Target Allocation (%)', 'Difference (%)', 'Action'],
      ...allocationData.map(d => [
        d.symbol,
        d.name,
        d.current.toFixed(2),
        d.target.toFixed(2),
        d.difference.toFixed(2),
        d.action
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'portfolio-optimization-results.csv';
    a.click();
    
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <div ref={resultsRef} className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Optimization Results</h2>
              <p className="text-gray-600">
                Method: {optimizationResult.method_used.replace('_', ' ').toUpperCase()} | 
                Confidence: {(optimizationResult.confidence_score * 100).toFixed(0)}%
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={exportToPDF}
                disabled={isExporting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 transition-colors text-sm"
              >
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'allocation', label: 'Allocation Comparison', icon: '📊' },
              { id: 'performance', label: 'Performance Metrics', icon: '📈' },
              { id: 'changes', label: 'Required Changes', icon: '🔄' },
              { id: 'explanation', label: 'Why These Changes?', icon: '💡' }
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

        {/* Warnings Section */}
        {warnings.filter(w => !dismissedWarnings.has(w.id)).length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Portfolio Alerts</h3>
            <div className="space-y-3">
              {warnings
                .filter(w => !dismissedWarnings.has(w.id))
                .slice(0, 3) // Show only top 3 warnings
                .map((warning) => (
                  <ContextualWarning
                    key={warning.id}
                    warning={warning}
                    onDismiss={() => {
                      const newDismissed = new Set(dismissedWarnings);
                      newDismissed.add(warning.id);
                      setDismissedWarnings(newDismissed);
                    }}
                  />
                ))}
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'allocation' && (
            <div className="space-y-8">
              {/* Pie Charts Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Current Allocation</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${formatPercentage(value)}`}
                          labelLine={false}
                        >
                          {currentPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Optimized Allocation</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={targetPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${formatPercentage(value)}`}
                          labelLine={false}
                        >
                          {targetPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Bar Chart Comparison */}
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Side-by-Side Comparison</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonBarData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="symbol" />
                      <YAxis tickFormatter={formatPercentage} />
                      <Tooltip formatter={(value: number) => formatPercentage(value)} />
                      <Legend />
                      <Bar dataKey="current" fill="#ef4444" name="Current" />
                      <Bar dataKey="target" fill="#10b981" name="Optimized" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'performance' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  label: 'Expected Return',
                  value: formatPercentage(optimizationResult.risk_metrics.expected_return * 100),
                  icon: '💰',
                  color: 'text-green-600',
                  tooltip: 'Expected annual return based on historical data and optimization model.'
                },
                {
                  label: 'Volatility',
                  value: formatPercentage(optimizationResult.risk_metrics.volatility * 100),
                  icon: '📊',
                  color: 'text-blue-600',
                  tooltip: 'volatility'
                },
                {
                  label: 'Sharpe Ratio',
                  value: optimizationResult.risk_metrics.sharpe_ratio.toFixed(3),
                  icon: '📈',
                  color: 'text-purple-600',
                  tooltip: 'sharpe-ratio'
                },
                ...(optimizationResult.risk_metrics.sortino_ratio ? [{
                  label: 'Sortino Ratio',
                  value: optimizationResult.risk_metrics.sortino_ratio.toFixed(3),
                  icon: '📉',
                  color: 'text-orange-600'
                }] : []),
                ...(optimizationResult.risk_metrics.max_drawdown ? [{
                  label: 'Max Drawdown',
                  value: formatPercentage(Math.abs(optimizationResult.risk_metrics.max_drawdown) * 100),
                  icon: '⚠️',
                  color: 'text-red-600'
                }] : []),
                ...(optimizationResult.risk_metrics.var_95 ? [{
                  label: 'VaR (95%)',
                  value: formatPercentage(Math.abs(optimizationResult.risk_metrics.var_95) * 100),
                  icon: '🛡️',
                  color: 'text-gray-600'
                }] : [])
              ].map((metric, index) => {
                const MetricWrapper = metric.tooltip && metric.tooltip.length > 20 
                  ? ({ children }: { children: React.ReactNode }) => 
                      <div title={metric.tooltip}>{children}</div>
                  : metric.tooltip === 'sharpe-ratio' 
                    ? SharpeRatioTooltip
                    : ({ children }: { children: React.ReactNode }) => <>{children}</>;

                return (
                  <MetricWrapper key={index}>
                    <div className="bg-gray-50 rounded-lg p-6 cursor-help">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{metric.icon}</span>
                        <span className={`text-2xl font-bold ${metric.color}`}>
                          {metric.value}
                        </span>
                      </div>
                      <h4 className="font-semibold text-gray-700">{metric.label}</h4>
                    </div>
                  </MetricWrapper>
                );
              })}
            </div>
          )}

          {activeTab === 'changes' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-800 mb-2">Rebalancing Summary</h3>
                <p className="text-blue-700 text-sm">
                  {optimizationResult.rebalancing_needed
                    ? `Rebalancing is recommended. ${optimizationResult.estimated_cost ? `Estimated cost: ${formatPercentage(optimizationResult.estimated_cost * 100)}` : ''}`
                    : 'Your current allocation is already well-optimized. No significant changes needed.'
                  }
                </p>
              </div>

              {/* Changes Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Current
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {allocationData
                      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
                      .map((item, index) => (
                        <tr key={item.symbol} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{item.symbol}</div>
                            <div className="text-sm text-gray-500">{item.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercentage(item.current)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formatPercentage(item.target)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`font-medium ${
                              item.difference > 0 ? 'text-green-600' : 
                              item.difference < 0 ? 'text-red-600' : 'text-gray-600'
                            }`}>
                              {item.difference > 0 ? '+' : ''}{formatPercentage(item.difference)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              item.action === 'BUY' ? 'bg-green-100 text-green-800' :
                              item.action === 'SELL' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {item.action}
                            </span>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'explanation' && explanation && (
            <div className="space-y-6">
              <RecommendationExplanation 
                explanation={explanation}
                className="mb-6"
              />
              
              {/* Educational Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DiversificationTooltip>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 cursor-help">
                    <h4 className="font-semibold text-green-800 mb-3">🌱 Diversification Benefits</h4>
                    <p className="text-green-700 text-sm mb-3">
                      Your optimized portfolio spreads risk across multiple assets and sectors, 
                      reducing the impact of any single investment's poor performance.
                    </p>
                    <div className="text-xs text-green-600">
                      Click to learn more about diversification principles
                    </div>
                  </div>
                </DiversificationTooltip>

                <SharpeRatioTooltip>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 cursor-help">
                    <h4 className="font-semibold text-blue-800 mb-3">📊 Risk-Adjusted Performance</h4>
                    <p className="text-blue-700 text-sm mb-3">
                      The optimization focuses on maximizing returns while carefully managing risk, 
                      as measured by the Sharpe ratio and other risk metrics.
                    </p>
                    <div className="text-xs text-blue-600">
                      Click to learn more about risk-adjusted returns
                    </div>
                  </div>
                </SharpeRatioTooltip>
              </div>

              {/* Next Steps */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 className="font-semibold text-gray-900 mb-4">🚀 Next Steps</h4>
                <div className="space-y-3">
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">1</div>
                    <div>
                      <div className="font-medium text-gray-900">Review the Changes</div>
                      <div className="text-sm text-gray-600">Check the "Required Changes" tab to understand exactly what trades are needed</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">2</div>
                    <div>
                      <div className="font-medium text-gray-900">Consider Transaction Costs</div>
                      <div className="text-sm text-gray-600">Factor in trading fees and tax implications before implementing changes</div>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs font-bold mr-3 mt-0.5">3</div>
                    <div>
                      <div className="font-medium text-gray-900">Implement Gradually</div>
                      <div className="text-sm text-gray-600">Consider making changes over time to reduce market timing risk</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explanation */}
        <div className="border-t border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Explanation</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed">
              {optimizationResult.explanation}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationResults;