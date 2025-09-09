import React, { useState } from 'react';
import { Target, Zap, TrendingUp, Shield, Clock, Activity } from 'lucide-react';

interface OptimizationPanelProps {
  onOptimize: (strategy: string, riskTolerance: number, timeHorizon: string) => void;
  isOptimizing: boolean;
  className?: string;
}

const OptimizationPanel: React.FC<OptimizationPanelProps> = ({
  onOptimize,
  isOptimizing,
  className = ""
}) => {
  const [strategy, setStrategy] = useState('mean_variance');
  const [riskTolerance, setRiskTolerance] = useState(6);
  const [timeHorizon, setTimeHorizon] = useState('5-10-years');

  const handleOptimize = () => {
    onOptimize(strategy, riskTolerance, timeHorizon);
  };

  const getRiskLabel = (risk: number) => {
    if (risk <= 3) return { label: 'Conservative', color: 'text-green-600' };
    if (risk <= 7) return { label: 'Moderate', color: 'text-orange-500' };
    return { label: 'Aggressive', color: 'text-red-600' };
  };

  const riskInfo = getRiskLabel(riskTolerance);

  return (
    <div className={`financial-card ${className}`}>
      <div className="financial-card-header">
        <div className="flex items-center space-x-2">
          <Target className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Portfolio Optimization</h3>
        </div>
      </div>
      
      <div className="financial-card-content space-y-6">
        {/* Strategy Selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Optimization Strategy
          </label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="equal_weight">Equal Weight (1/N portfolio)</option>
            <option value="mean_variance">Maximum Sharpe Ratio</option>
            <option value="min_volatility">Minimum Volatility</option>
          </select>
          <p className="text-xs text-gray-500">
            {strategy === 'equal_weight' && 'Distribute equally across all assets'}
            {strategy === 'mean_variance' && 'Maximize risk-adjusted returns (Sharpe ratio)'}
            {strategy === 'min_volatility' && 'Minimize portfolio volatility and risk'}
          </p>
        </div>

        {/* Risk Tolerance Slider */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">
            Risk Tolerance
          </label>
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500">
            <span>Conservative</span>
            <span className="font-medium">{riskTolerance}/10</span>
            <span>Aggressive</span>
          </div>
          <div className="text-center">
            <span className={`text-sm font-medium ${riskInfo.color}`}>
              {riskInfo.label}
            </span>
          </div>
        </div>

        {/* Time Horizon */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Investment Time Horizon
          </label>
          <select
            value={timeHorizon}
            onChange={(e) => setTimeHorizon(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            <option value="1-3-years">1-3 Years (Short-term)</option>
            <option value="3-5-years">3-5 Years (Medium-term)</option>
            <option value="5-10-years">5-10 Years (Long-term)</option>
            <option value="10-plus-years">10+ Years (Very Long-term)</option>
          </select>
        </div>

        {/* Optimize Button */}
        <button
          onClick={handleOptimize}
          disabled={isOptimizing}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
        >
          {isOptimizing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              <span>Optimizing...</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              <span>Optimize Portfolio</span>
            </>
          )}
        </button>

        {/* Expected Improvements */}
        <div className="p-4 bg-blue-50 rounded-lg space-y-3">
          <h4 className="font-medium text-sm text-gray-900">Expected Improvements</h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Expected Return</span>
              <span className="text-sm font-medium text-green-600">+1.2%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Risk Reduction</span>
              <span className="text-sm font-medium text-green-600">-0.8%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Sharpe Ratio</span>
              <span className="text-sm font-medium text-green-600">+0.15</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizationPanel;