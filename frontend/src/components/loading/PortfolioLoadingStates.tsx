import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../../contexts/PortfolioContext';
import LoadingSkeleton from './LoadingSkeleton';
import LoadingButton from './LoadingButton';
import SuccessToast from './SuccessToast';
import ProgressIndicator from './ProgressIndicator';
import LoadingSpinner from './LoadingSpinner';

interface PortfolioLoadingStatesProps {
  className?: string;
}

/**
 * Enhanced Portfolio component with professional loading states
 * Demonstrates real-world usage of all loading components
 */
const PortfolioLoadingStates: React.FC<PortfolioLoadingStatesProps> = ({ className = '' }) => {
  const { state } = usePortfolio();
  const [optimizationStep, setOptimizationStep] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Optimization process steps
  const optimizationSteps = [
    { 
      id: 'validation', 
      label: 'Validating Portfolio', 
      description: 'Checking asset allocations and constraints' 
    },
    { 
      id: 'market-data', 
      label: 'Fetching Market Data', 
      description: 'Retrieving real-time prices and historical data' 
    },
    { 
      id: 'risk-metrics', 
      label: 'Calculating Risk Metrics', 
      description: 'Computing returns, volatilities, and correlations' 
    },
    { 
      id: 'optimization', 
      label: 'Running Optimization', 
      description: 'Applying selected optimization algorithm' 
    },
    { 
      id: 'results', 
      label: 'Generating Results', 
      description: 'Preparing optimized allocations and analytics' 
    }
  ];

  // Simulate initial data loading
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDataLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Simulate optimization progress
  useEffect(() => {
    if (state.isLoading) {
      const progressTimer = setInterval(() => {
        setOptimizationStep(prev => {
          if (prev >= optimizationSteps.length - 1) {
            clearInterval(progressTimer);
            setShowSuccessToast(true);
            return prev;
          }
          return prev + 1;
        });
      }, 1500);

      return () => clearInterval(progressTimer);
    } else {
      setOptimizationStep(0);
    }
  }, [state.isLoading, optimizationSteps.length]);

  // Save portfolio function
  const handleSavePortfolio = async () => {
    setIsSaving(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowSuccessToast(true);
    } catch (error) {
      console.error('Save failed:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Portfolio Header */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
            <p className="text-gray-600 mt-1">Optimize your investment allocation</p>
          </div>
          
          <div className="flex space-x-3">
            <LoadingButton
              loading={isSaving}
              loadingText="Saving..."
              onClick={handleSavePortfolio}
              variant="secondary"
              size="md"
            >
              Save Portfolio
            </LoadingButton>
            
            <LoadingButton
              loading={state.isLoading}
              loadingText="Optimizing..."
              onClick={() => console.log('Start optimization')}
              variant="primary"
              size="md"
              disabled={state.holdings.length === 0}
            >
              Optimize Portfolio
            </LoadingButton>
          </div>
        </div>
      </div>

      {/* Optimization Progress */}
      {state.isLoading && (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Optimization in Progress
            </h2>
            <p className="text-gray-600">
              Please wait while we optimize your portfolio allocation...
            </p>
          </div>
          
          <ProgressIndicator
            steps={optimizationSteps}
            currentStep={optimizationStep}
            variant="horizontal"
            showDescriptions={true}
            animated={true}
          />
        </div>
      )}

      {/* Portfolio Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Holdings */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">Current Holdings</h2>
                {isDataLoading && (
                  <LoadingSpinner variant="default" size="sm" color="gray" />
                )}
              </div>
            </div>
            
            <div className="p-6">
              {isDataLoading ? (
                <LoadingSkeleton variant="list" lines={4} />
              ) : (
                <div className="space-y-4">
                  {state.holdings.map((holding, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <h3 className="font-semibold text-gray-900">{holding.symbol}</h3>
                        <p className="text-sm text-gray-600">{holding.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{holding.allocation}%</p>
                        <p className="text-sm text-green-600">+2.4%</p>
                      </div>
                    </div>
                  ))}
                  
                  {state.holdings.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No holdings added yet. Add assets to get started.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance</h2>
            
            {isDataLoading ? (
              <div className="space-y-4">
                <LoadingSkeleton variant="text" lines={1} height="h-8" width="w-3/4" />
                <LoadingSkeleton variant="text" lines={1} height="h-6" width="w-1/2" />
                <LoadingSkeleton variant="text" lines={1} height="h-8" width="w-3/4" />
                <LoadingSkeleton variant="text" lines={1} height="h-6" width="w-1/2" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold text-gray-900">$125,430</p>
                  <p className="text-sm text-green-600">+$2,340 (1.9%) today</p>
                </div>
                
                <div>
                  <p className="text-lg font-semibold text-gray-900">12.4%</p>
                  <p className="text-sm text-gray-600">Annual Return</p>
                </div>
                
                <div>
                  <p className="text-lg font-semibold text-gray-900">8.7%</p>
                  <p className="text-sm text-gray-600">Volatility</p>
                </div>
                
                <div>
                  <p className="text-lg font-semibold text-gray-900">1.42</p>
                  <p className="text-sm text-gray-600">Sharpe Ratio</p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
            
            {isDataLoading ? (
              <LoadingSkeleton variant="chart" height="h-32" />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Risk Level</span>
                  <span className="font-medium">Moderate</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '60%' }}></div>
                </div>
                <p className="text-xs text-gray-600">
                  Based on your current allocation and risk tolerance
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Portfolio Allocation</h2>
          
          {isDataLoading ? (
            <LoadingSkeleton variant="chart" />
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <span className="text-gray-500">Portfolio Pie Chart</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Efficient Frontier</h2>
          
          {isDataLoading ? (
            <LoadingSkeleton variant="chart" />
          ) : (
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <span className="text-gray-500">Efficient Frontier Chart</span>
            </div>
          )}
        </div>
      </div>

      {/* Loading States Examples */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Loading Components Demo</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Spinners</h3>
            <div className="flex space-x-3">
              <LoadingSpinner variant="default" size="sm" />
              <LoadingSpinner variant="dots" size="sm" />
              <LoadingSpinner variant="bars" size="sm" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Buttons</h3>
            <LoadingButton
              loading={true}
              loadingText="Processing..."
              variant="primary"
              size="sm"
              fullWidth
            >
              Demo Button
            </LoadingButton>
          </div>
          
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Skeleton</h3>
            <LoadingSkeleton variant="text" lines={2} animate={true} />
          </div>
        </div>
        
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => setIsDataLoading(!isDataLoading)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Toggle Loading State
          </button>
        </div>
      </div>

      {/* Success Toast */}
      <SuccessToast
        isVisible={showSuccessToast}
        message="Operation completed successfully!"
        description="Your portfolio has been optimized and saved."
        variant="success"
        position="top-right"
        duration={5000}
        showProgress={true}
        onClose={() => setShowSuccessToast(false)}
        actionButton={{
          label: 'View Details',
          onClick: () => {
            console.log('View details clicked');
            setShowSuccessToast(false);
          }
        }}
      />
    </div>
  );
};

export default PortfolioLoadingStates;