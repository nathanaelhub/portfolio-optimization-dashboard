import React from 'react';
import { Shield, Activity, AlertTriangle, DollarSign } from 'lucide-react';
import MetricsCard from './MetricsCard';

interface RiskMetric {
  volatility: number;
  maxDrawdown: number;
  var95: number;
  expectedReturn: number;
  sharpeRatio: number;
  beta: number;
}

interface RiskMetricsGridProps {
  metrics: RiskMetric;
  className?: string;
}

const RiskMetricsGrid: React.FC<RiskMetricsGridProps> = ({ 
  metrics, 
  className = "" 
}) => {
  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-6">
        <Shield className="h-6 w-6 text-blue-600" />
        <h2 className="text-xl font-bold text-gray-900">Risk Analysis Dashboard</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Annual Volatility */}
        <MetricsCard
          title="Annual Volatility"
          value={`${(metrics.volatility * 100).toFixed(1)}%`}
          change={{ value: -2.1, label: "vs last quarter" }}
          icon={Activity}
          iconColor="text-orange-500"
          borderColor="border-l-orange-500"
          footer={{
            label: "Market Avg: 12.1%",
            value: "-30.6%",
            color: "text-green-600"
          }}
          progress={{
            value: (metrics.volatility * 100) * 4.2, // Convert to percentage for display
            label: "Risk Level"
          }}
        />

        {/* Maximum Drawdown */}
        <MetricsCard
          title="Maximum Drawdown"
          value={`${(metrics.maxDrawdown * 100).toFixed(1)}%`}
          change={{ value: -1.8, label: "improved from peak" }}
          icon={AlertTriangle}
          iconColor="text-red-500"
          borderColor="border-l-red-500"
          footer={{
            label: "Recovery: 4.2 months",
            value: "Fast",
            color: "text-green-600"
          }}
          progress={{
            value: 35,
            label: "Risk Rating"
          }}
        />

        {/* Value at Risk */}
        <MetricsCard
          title="Value at Risk (95%)"
          value={`$${Math.abs(metrics.var95 * 247832).toLocaleString()}`}
          change={{ value: -5.2, label: "risk reduction" }}
          icon={Shield}
          iconColor="text-purple-500"
          borderColor="border-l-purple-500"
          footer={{
            label: "Monthly VaR",
            value: `$${Math.abs(metrics.var95 * 247832 * 2.1).toLocaleString()}`,
            color: "text-orange-500"
          }}
          progress={{
            value: Math.abs(metrics.var95) * 1000,
            label: "Daily Risk"
          }}
        />

        {/* Expected Return */}
        <MetricsCard
          title="Expected Return"
          value={`${(metrics.expectedReturn * 100).toFixed(1)}%`}
          change={{ value: 2.4, label: "annualized projection" }}
          icon={DollarSign}
          iconColor="text-green-500"
          borderColor="border-l-green-500"
          footer={{
            label: "Market Avg: 9.2%",
            value: "+28.3%",
            color: "text-green-600"
          }}
          progress={{
            value: (metrics.expectedReturn * 100) * 6.8,
            label: "Performance"
          }}
        />
      </div>

      {/* Risk Assessment Summary */}
      <div className="financial-card">
        <div className="financial-card-header">
          <h4 className="text-lg font-semibold text-gray-900 flex items-center">
            <Shield className="h-5 w-5 mr-2 text-blue-600" />
            Risk Assessment Summary
          </h4>
        </div>
        
        <div className="financial-card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Overall Risk Level</span>
                <span className="text-sm font-medium text-orange-600">Moderate</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Risk-Adjusted Return</span>
                <span className="text-sm font-medium text-green-600">Excellent</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Diversification Score</span>
                <span className="text-sm font-medium text-green-600">8.2/10</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Correlation to Market</span>
                <span className="text-sm font-medium text-blue-600">0.73</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Beta (Market Sensitivity)</span>
                <span className="text-sm font-medium text-orange-600">{metrics.beta.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sharpe Ratio</span>
                <span className="text-sm font-medium text-green-600">{metrics.sharpeRatio.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RiskMetricsGrid;