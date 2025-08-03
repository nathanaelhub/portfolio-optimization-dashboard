import React from 'react';
import { EducationalTooltip } from './EducationalTooltips';

interface MetricsData {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  sortino_ratio?: number;
  var_95?: number;
  max_drawdown?: number;
  beta?: number;
}

interface PerformanceMetricsProps {
  currentMetrics: MetricsData;
  optimalMetrics?: MetricsData;
  showComparison?: boolean;
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  currentMetrics,
  optimalMetrics,
  showComparison = true
}) => {
  const formatPercentage = (value: number | undefined, decimals: number = 1) => 
    value !== undefined ? `${(value * 100).toFixed(decimals)}%` : 'N/A';
  
  const formatNumber = (value: number | undefined, decimals: number = 3) => 
    value !== undefined ? value.toFixed(decimals) : 'N/A';

  const getMetricColor = (current: number, optimal?: number, higherIsBetter: boolean = true) => {
    if (!optimal) return 'text-gray-700';
    
    const isCurrentBetter = higherIsBetter ? current >= optimal : current <= optimal;
    return isCurrentBetter ? 'text-green-600' : 'text-red-600';
  };

  const MetricCard: React.FC<{
    title: string;
    tooltipTerm: keyof typeof import('./EducationalTooltips').educationalTooltips;
    currentValue: string;
    optimalValue?: string;
    icon: string;
    higherIsBetter?: boolean;
    description: string;
  }> = ({ title, tooltipTerm, currentValue, optimalValue, icon, higherIsBetter = true, description }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">
              <EducationalTooltip term={tooltipTerm}>
                <span className="border-b border-dotted border-gray-400 cursor-help">
                  {title}
                </span>
              </EducationalTooltip>
            </h3>
            <p className="text-xs text-gray-500">{description}</p>
          </div>
        </div>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Current:</span>
          <span className={`text-lg font-bold ${
            showComparison && optimalValue 
              ? getMetricColor(parseFloat(currentValue.replace('%', '')), parseFloat(optimalValue.replace('%', '')), higherIsBetter)
              : 'text-gray-700'
          }`}>
            {currentValue}
          </span>
        </div>
        
        {showComparison && optimalValue && (
          <div className="flex justify-between items-center border-t pt-2">
            <span className="text-sm text-gray-600">Optimal:</span>
            <span className="text-lg font-bold text-blue-600">{optimalValue}</span>
          </div>
        )}
      </div>
    </div>
  );

  const ImprovementIndicator: React.FC<{
    current: number;
    optimal?: number;
    label: string;
    higherIsBetter?: boolean;
  }> = ({ current, optimal, label, higherIsBetter = true }) => {
    if (!optimal) return null;
    
    const improvement = optimal - current;
    const improvementPct = (improvement / Math.abs(current)) * 100;
    const isImprovement = higherIsBetter ? improvement > 0 : improvement < 0;
    
    if (Math.abs(improvementPct) < 0.1) return null; // Don't show negligible improvements
    
    return (
      <div className={`flex items-center text-sm ${isImprovement ? 'text-green-600' : 'text-red-600'}`}>
        <span className="mr-1">
          {isImprovement ? '↗️' : '↘️'}
        </span>
        <span>
          {Math.abs(improvementPct).toFixed(1)}% {isImprovement ? 'improvement' : 'decline'} in {label}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">
          Portfolio Performance Metrics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Expected Return"
            tooltipTerm="expectedReturn"
            currentValue={formatPercentage(currentMetrics.expected_return)}
            optimalValue={optimalMetrics ? formatPercentage(optimalMetrics.expected_return) : undefined}
            icon="💰"
            description="Predicted annual return"
          />
          
          <MetricCard
            title="Volatility"
            tooltipTerm="volatility"
            currentValue={formatPercentage(currentMetrics.volatility)}
            optimalValue={optimalMetrics ? formatPercentage(optimalMetrics.volatility) : undefined}
            icon="📊"
            higherIsBetter={false}
            description="Annual price fluctuation"
          />
          
          <MetricCard
            title="Sharpe Ratio"
            tooltipTerm="sharpeRatio"
            currentValue={formatNumber(currentMetrics.sharpe_ratio)}
            optimalValue={optimalMetrics ? formatNumber(optimalMetrics.sharpe_ratio) : undefined}
            icon="📈"
            description="Return per unit of risk"
          />
          
          {currentMetrics.sortino_ratio !== undefined && (
            <MetricCard
              title="Sortino Ratio"
              tooltipTerm="sortinoRatio"
              currentValue={formatNumber(currentMetrics.sortino_ratio)}
              optimalValue={optimalMetrics ? formatNumber(optimalMetrics.sortino_ratio) : undefined}
              icon="📉"
              description="Return per downside risk"
            />
          )}
          
          {currentMetrics.var_95 !== undefined && (
            <MetricCard
              title="Value at Risk (95%)"
              tooltipTerm="volatility"
              currentValue={formatPercentage(Math.abs(currentMetrics.var_95))}
              optimalValue={optimalMetrics?.var_95 ? formatPercentage(Math.abs(optimalMetrics.var_95)) : undefined}
              icon="⚠️"
              higherIsBetter={false}
              description="Worst expected daily loss"
            />
          )}
          
          {currentMetrics.max_drawdown !== undefined && (
            <MetricCard
              title="Maximum Drawdown"
              tooltipTerm="volatility"
              currentValue={formatPercentage(Math.abs(currentMetrics.max_drawdown))}
              optimalValue={optimalMetrics?.max_drawdown ? formatPercentage(Math.abs(optimalMetrics.max_drawdown)) : undefined}
              icon="📉"
              higherIsBetter={false}
              description="Largest peak-to-trough loss"
            />
          )}
        </div>
      </div>

      {/* Improvement Summary */}
      {showComparison && optimalMetrics && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-4">
            🎯 Optimization Impact Summary
          </h3>
          <div className="space-y-2">
            <ImprovementIndicator
              current={currentMetrics.expected_return}
              optimal={optimalMetrics.expected_return}
              label="expected return"
            />
            <ImprovementIndicator
              current={currentMetrics.volatility}
              optimal={optimalMetrics.volatility}
              label="volatility"
              higherIsBetter={false}
            />
            <ImprovementIndicator
              current={currentMetrics.sharpe_ratio}
              optimal={optimalMetrics.sharpe_ratio}
              label="Sharpe ratio"
            />
            {currentMetrics.sortino_ratio !== undefined && optimalMetrics.sortino_ratio !== undefined && (
              <ImprovementIndicator
                current={currentMetrics.sortino_ratio}
                optimal={optimalMetrics.sortino_ratio}
                label="Sortino ratio"
              />
            )}
          </div>
          
          {/* Overall Assessment */}
          <div className="mt-4 p-3 bg-white rounded border border-blue-200">
            <p className="text-sm text-blue-700">
              {(() => {
                const sharpeImprovement = ((optimalMetrics.sharpe_ratio - currentMetrics.sharpe_ratio) / Math.abs(currentMetrics.sharpe_ratio)) * 100;
                const returnImprovement = ((optimalMetrics.expected_return - currentMetrics.expected_return) / Math.abs(currentMetrics.expected_return)) * 100;
                
                if (sharpeImprovement > 10 && returnImprovement > 5) {
                  return "🌟 Excellent optimization potential! The recommended portfolio shows significant improvements in both risk-adjusted returns and overall performance.";
                } else if (sharpeImprovement > 5) {
                  return "👍 Good optimization opportunity. The recommended portfolio offers better risk-adjusted returns.";
                } else if (Math.abs(sharpeImprovement) < 2) {
                  return "✅ Your current portfolio is already well-optimized. Only minor improvements are possible.";
                } else {
                  return "📊 The optimization shows mixed results. Consider your personal preferences and constraints when deciding.";
                }
              })()}
            </p>
          </div>
        </div>
      )}

      {/* Risk Assessment */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-yellow-800 mb-4">
          🛡️ Risk Assessment
        </h3>
        <div className="space-y-3 text-sm text-yellow-700">
          <div className="flex items-start">
            <span className="font-medium mr-2">Risk Level:</span>
            <span>
              {currentMetrics.volatility < 0.10 ? 'Conservative (Low Risk)' :
               currentMetrics.volatility < 0.20 ? 'Moderate (Medium Risk)' :
               'Aggressive (High Risk)'}
            </span>
          </div>
          
          <div className="flex items-start">
            <span className="font-medium mr-2">Sharpe Quality:</span>
            <span>
              {currentMetrics.sharpe_ratio > 1.5 ? 'Excellent risk-adjusted returns' :
               currentMetrics.sharpe_ratio > 1.0 ? 'Good risk-adjusted returns' :
               currentMetrics.sharpe_ratio > 0.5 ? 'Fair risk-adjusted returns' :
               'Poor risk-adjusted returns'}
            </span>
          </div>
          
          <div className="flex items-start">
            <span className="font-medium mr-2">Recommendation:</span>
            <span>
              {currentMetrics.volatility > 0.25 ? 
                'Consider reducing risk through diversification' :
                currentMetrics.sharpe_ratio < 0.5 ?
                'Focus on improving risk-adjusted returns' :
                'Portfolio shows reasonable risk characteristics'
              }
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;