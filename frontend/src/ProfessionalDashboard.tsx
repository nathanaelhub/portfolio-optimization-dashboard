"use client"

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  PieChart as PieChartIcon,
  TrendingUp,
  TrendingDown,
  Settings,
  Home,
  Target,
  Activity,
  Shield,
  Bell,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  Clock,
  Calendar,
  AlertTriangle,
  DollarSign,
} from "lucide-react";

import MetricsCard from './components/MetricsCard';
import ProfessionalPieChart from './components/ProfessionalPieChart';
import PerformanceChart from './components/PerformanceChart';
import OptimizationPanel from './components/OptimizationPanel';
import RiskMetricsGrid from './components/RiskMetricsGrid';
import { StockSelector } from './components/StockSelector';

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

const portfolioData = [
  { name: "US Stocks", value: 45, amount: 111524, color: "#1e3a5f" },
  { name: "International Stocks", value: 25, amount: 61958, color: "#2563eb" },
  { name: "Bonds", value: 20, amount: 49566, color: "#10b981" },
  { name: "REITs", value: 7, amount: 17348, color: "#f59e0b" },
  { name: "Cash", value: 3, amount: 7435, color: "#6b7280" },
];

const performanceData = [
  { month: "Jan", portfolio: 220000, benchmark: 218000 },
  { month: "Feb", portfolio: 225000, benchmark: 222000 },
  { month: "Mar", portfolio: 218000, benchmark: 220000 },
  { month: "Apr", portfolio: 232000, benchmark: 228000 },
  { month: "May", portfolio: 238000, benchmark: 235000 },
  { month: "Jun", portfolio: 235000, benchmark: 237000 },
  { month: "Jul", portfolio: 242000, benchmark: 240000 },
  { month: "Aug", portfolio: 245000, benchmark: 242000 },
  { month: "Sep", portfolio: 240000, benchmark: 238000 },
  { month: "Oct", portfolio: 246000, benchmark: 244000 },
  { month: "Nov", portfolio: 248000, benchmark: 246000 },
  { month: "Dec", portfolio: 247832, benchmark: 245000 },
];

export default function ProfessionalDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [allocationView, setAllocationView] = useState("current");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [showBenchmark, setShowBenchmark] = useState(true);
  const [selectedStocks, setSelectedStocks] = useState<SelectedStock[]>([
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 30, sector: 'Technology' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', allocation: 25, sector: 'Technology' },
    { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 25, sector: 'Technology' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.', allocation: 20, sector: 'Technology' }
  ]);

  const portfolioValue = useMemo(() => {
    return selectedStocks.reduce((sum, stock) => sum + (stock.allocation * 1000), 0);
  }, [selectedStocks]);

  const chartData = useMemo(() => {
    const colors = ["#1e3a5f", "#2563eb", "#10b981", "#f59e0b", "#6b7280", "#8b5cf6", "#ef4444", "#06b6d4"];
    return selectedStocks.map((stock, index) => ({
      name: stock.symbol,
      value: stock.allocation,
      amount: stock.allocation * 1000,
      color: colors[index % colors.length]
    }));
  }, [selectedStocks]);

  const optimizedData = useMemo(() => {
    if (!optimizationResult?.optimal_weights) return chartData;
    
    const colors = ["#1e3a5f", "#2563eb", "#10b981", "#f59e0b", "#6b7280", "#8b5cf6", "#ef4444", "#06b6d4"];
    return Object.entries(optimizationResult.optimal_weights).map(([symbol, weight], index) => ({
      name: symbol,
      value: Math.round(weight * 100),
      amount: Math.round(weight * portfolioValue),
      color: colors[index % colors.length]
    }));
  }, [optimizationResult, portfolioValue]);

  const handleOptimize = async (strategy: string, riskTolerance: number, timeHorizon: string) => {
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
          risk_tolerance: riskTolerance,
          method: strategy
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setOptimizationResult(data);
      setAllocationView("optimized");
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
          max_drawdown: 0.08,
          var_95: 0.025,
          beta: 0.9
        },
        status: 'demo_fallback',
        explanation: 'Using fallback data due to API error'
      });
      setAllocationView("optimized");
    }
    setIsOptimizing(false);
  };

  const riskMetrics = {
    volatility: optimizationResult?.metrics.volatility || 0.084,
    maxDrawdown: optimizationResult?.metrics.max_drawdown || 0.123,
    var95: optimizationResult?.metrics.var_95 || 0.025,
    expectedReturn: optimizationResult?.metrics.expected_return || 0.118,
    sharpeRatio: optimizationResult?.metrics.sharpe_ratio || 1.34,
    beta: optimizationResult?.metrics.beta || 0.89
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Portfolio Optimizer Pro</h1>
                <p className="text-xs text-gray-500">Professional Investment Management</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm text-gray-600 font-medium">Market Open</span>
            </div>
            <div className="text-sm text-gray-500 font-medium">
              {new Date().toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}
            </div>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell className="h-5 w-5" />
            </button>
            <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">JD</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Professional Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-4rem)]">
          <nav className="p-4 space-y-2">
            {[
              { id: 'overview', label: 'Overview', icon: Home },
              { id: 'portfolio', label: 'Portfolio', icon: PieChartIcon },
              { id: 'optimization', label: 'Optimization', icon: Target },
              { id: 'performance', label: 'Performance', icon: Activity },
              { id: 'risk', label: 'Risk Analysis', icon: Shield },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={activeTab === item.id ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-6">
          <div className="max-w-7xl mx-auto">
            {/* Top Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricsCard
                title="Total Portfolio Value"
                value={`$${portfolioValue.toLocaleString()}`}
                change={{ value: 2.4, label: "+$5,943 today" }}
                icon={BarChart3}
                iconColor="text-blue-600"
                borderColor="border-l-blue-600"
                footer={{
                  label: "vs. last month",
                  value: "+8.2%",
                  color: "text-green-600"
                }}
                progress={{
                  value: 82,
                  label: "Growth Target"
                }}
              />

              <MetricsCard
                title="Today's Performance"
                value="+$5,943"
                change={{ value: 2.45, label: "since market open" }}
                icon={TrendingUp}
                iconColor="text-green-600"
                borderColor="border-l-green-600"
                footer={{
                  label: "Best performer",
                  value: "AAPL +4.2%",
                  color: "text-green-600"
                }}
              />

              <MetricsCard
                title="Risk Score"
                value="6.2"
                change={{ value: -0.3, label: "reduced risk" }}
                icon={Shield}
                iconColor="text-orange-500"
                borderColor="border-l-orange-500"
                footer={{
                  label: "Risk Level",
                  value: "Moderate",
                  color: "text-orange-600"
                }}
                progress={{
                  value: 62,
                  label: "Risk Rating"
                }}
              />

              <MetricsCard
                title="Sharpe Ratio"
                value={riskMetrics.sharpeRatio.toFixed(2)}
                change={{ value: 12.5, label: "above average" }}
                icon={Activity}
                iconColor="text-blue-500"
                borderColor="border-l-blue-500"
                footer={{
                  label: "Benchmark: 0.89",
                  value: "+50.6%",
                  color: "text-green-600"
                }}
                progress={{
                  value: 67,
                  label: "Efficiency"
                }}
              />
            </div>

            {/* Stock Selection */}
            <div className="mb-8 animate-fade-in-up">
              <StockSelector 
                selectedStocks={selectedStocks} 
                onSelectionChange={setSelectedStocks} 
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Portfolio Allocation */}
              <div className="lg:col-span-2 space-y-6">
                <div className="financial-card">
                  <div className="financial-card-header">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Asset Allocation</h3>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setAllocationView("current")}
                          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                            allocationView === "current" 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          Current
                        </button>
                        <button
                          onClick={() => setAllocationView("optimized")}
                          disabled={!optimizationResult}
                          className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                            allocationView === "optimized" 
                              ? 'bg-blue-100 text-blue-700' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          Optimized
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="financial-card-content">
                    {allocationView === "current" ? (
                      <ProfessionalPieChart 
                        data={chartData} 
                        title="" 
                        className="border-0 shadow-none"
                      />
                    ) : (
                      <ProfessionalPieChart 
                        data={optimizedData} 
                        title="" 
                        className="border-0 shadow-none"
                      />
                    )}
                    
                    {optimizationResult && allocationView === "optimized" && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-blue-900">Optimization Result</span>
                          <span className="text-xs text-blue-600 font-medium">
                            Confidence: {((optimizationResult.confidence_score || 0.85) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <p className="text-sm text-blue-800">
                          {optimizationResult.explanation || "Portfolio optimized successfully with improved risk-return profile."}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Performance Chart */}
                <PerformanceChart 
                  data={performanceData}
                  title="Portfolio Performance"
                  showBenchmark={showBenchmark}
                />
              </div>

              {/* Right Sidebar */}
              <div className="space-y-6">
                <OptimizationPanel 
                  onOptimize={handleOptimize}
                  isOptimizing={isOptimizing}
                />
                
                {/* AI Insights */}
                <div className="financial-card">
                  <div className="financial-card-header">
                    <div className="flex items-center space-x-2">
                      <Activity className="h-5 w-5 text-purple-600" />
                      <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
                    </div>
                  </div>
                  
                  <div className="financial-card-content space-y-3">
                    <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Rebalancing Opportunity</p>
                        <p className="text-xs text-blue-700">
                          Consider increasing international exposure by 5%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-lg">
                      <Shield className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-orange-900">Risk Alert</p>
                        <p className="text-xs text-orange-700">
                          High concentration in tech sector detected
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3 p-3 bg-green-50 rounded-lg">
                      <Clock className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Market Timing</p>
                        <p className="text-xs text-green-700">
                          Good time to rebalance based on market conditions
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Risk Metrics Grid */}
            <div className="mt-8 animate-fade-in-up">
              <RiskMetricsGrid metrics={riskMetrics} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}