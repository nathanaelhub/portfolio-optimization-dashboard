import React, { useState, useEffect } from 'react';
import LoadingSkeleton from './LoadingSkeleton';
import LoadingSpinner from './LoadingSpinner';
import LoadingButton from './LoadingButton';
import SuccessToast from './SuccessToast';
import ProgressIndicator from './ProgressIndicator';

interface LoadingExamplesProps {
  className?: string;
}

const LoadingExamples: React.FC<LoadingExamplesProps> = ({ className = '' }) => {
  const [showSkeletons, setShowSkeletons] = useState(true);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [optimizationProgress, setOptimizationProgress] = useState(0);

  // Demo optimization steps
  const optimizationSteps = [
    { id: 'validate', label: 'Validating Portfolio', description: 'Checking asset allocations and constraints' },
    { id: 'fetch', label: 'Fetching Market Data', description: 'Retrieving historical prices and metrics' },
    { id: 'calculate', label: 'Calculating Metrics', description: 'Computing returns, volatilities, and correlations' },
    { id: 'optimize', label: 'Optimizing Allocations', description: 'Running optimization algorithms' },
    { id: 'complete', label: 'Complete', description: 'Portfolio optimization finished successfully' }
  ];

  // Simulate optimization process
  const handleOptimize = async () => {
    setButtonLoading(true);
    setCurrentStep(0);
    setOptimizationProgress(0);

    for (let i = 0; i < optimizationSteps.length; i++) {
      setCurrentStep(i);
      setOptimizationProgress((i / (optimizationSteps.length - 1)) * 100);
      
      // Simulate processing time for each step
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    setButtonLoading(false);
    setShowToast(true);
  };

  // Auto-hide skeletons after 3 seconds for demo
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSkeletons(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`space-y-8 p-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Loading Components Demo</h2>
        <p className="text-gray-600">Professional loading states and animations for the portfolio dashboard</p>
      </div>

      {/* Loading Skeletons Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Loading Skeletons</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Portfolio Cards Skeleton */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Portfolio Cards</h4>
            {showSkeletons ? (
              <LoadingSkeleton variant="card" />
            ) : (
              <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Portfolio</h3>
                <p className="text-gray-600 mb-2">Total Value: $125,430.50</p>
                <p className="text-gray-600 mb-4">Daily Change: +$1,234.56 (+0.98%)</p>
                <div className="bg-green-100 h-32 rounded-lg flex items-center justify-center">
                  <span className="text-green-700 font-medium">Portfolio Chart</span>
                </div>
              </div>
            )}
          </div>

          {/* Metrics Skeleton */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Performance Metrics</h4>
            {showSkeletons ? (
              <LoadingSkeleton variant="metrics" />
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: 'Annual Return', value: '12.4%', change: '+2.1%' },
                  { label: 'Volatility', value: '8.7%', change: '-0.3%' },
                  { label: 'Sharpe Ratio', value: '1.42', change: '+0.15' },
                  { label: 'Max Drawdown', value: '-4.2%', change: '+1.1%' }
                ].map((metric, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
                    <p className="text-sm text-gray-600">{metric.label}</p>
                    <p className="text-lg font-semibold text-gray-900">{metric.value}</p>
                    <p className="text-xs text-green-600">{metric.change}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chart Skeleton */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Chart Loading</h4>
          {showSkeletons ? (
            <LoadingSkeleton variant="chart" />
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Efficient Frontier</h3>
              <div className="flex items-end space-x-2 h-64">
                {[65, 45, 78, 52, 88, 42, 71, 59].map((height, i) => (
                  <div key={i} className="w-8 bg-blue-500 rounded-t" style={{ height: `${height}%` }}></div>
                ))}
              </div>
              <div className="flex justify-between mt-4">
                {['0%', '2%', '4%', '6%', '8%', '10%', '12%', '14%'].map((label, i) => (
                  <span key={i} className="text-xs text-gray-500">{label}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowSkeletons(!showSkeletons)}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            {showSkeletons ? 'Show Loaded Content' : 'Show Loading Skeletons'}
          </button>
        </div>
      </div>

      {/* Loading Spinners Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Loading Spinners</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Default</h4>
            <div className="flex justify-center">
              <LoadingSpinner variant="default" size="lg" />
            </div>
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Dots</h4>
            <div className="flex justify-center">
              <LoadingSpinner variant="dots" size="lg" />
            </div>
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Bars</h4>
            <div className="flex justify-center">
              <LoadingSpinner variant="bars" size="lg" />
            </div>
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Ring</h4>
            <div className="flex justify-center">
              <LoadingSpinner variant="ring" size="lg" />
            </div>
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Pulse</h4>
            <div className="flex justify-center">
              <LoadingSpinner variant="pulse" size="lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Loading Buttons Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Loading Buttons</h3>
        
        <div className="flex flex-wrap gap-4">
          <LoadingButton
            loading={buttonLoading}
            loadingText="Optimizing..."
            onClick={handleOptimize}
            variant="primary"
          >
            Optimize Portfolio
          </LoadingButton>
          
          <LoadingButton
            loading={false}
            variant="secondary"
            onClick={() => console.log('Secondary action')}
          >
            Secondary Action
          </LoadingButton>
          
          <LoadingButton
            loading={false}
            variant="success"
            size="sm"
            onClick={() => console.log('Success action')}
          >
            Save Changes
          </LoadingButton>
          
          <LoadingButton
            loading={false}
            variant="danger"
            size="lg"
            onClick={() => console.log('Danger action')}
          >
            Delete Portfolio
          </LoadingButton>
        </div>
      </div>

      {/* Progress Indicators Section */}
      <div className="space-y-6">
        <h3 className="text-lg font-semibold text-gray-900">Progress Indicators</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Horizontal Progress */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Horizontal Progress</h4>
            <ProgressIndicator
              steps={optimizationSteps}
              currentStep={currentStep}
              variant="horizontal"
              showDescriptions={false}
            />
          </div>

          {/* Vertical Progress */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4">Vertical Progress</h4>
            <ProgressIndicator
              steps={optimizationSteps.slice(0, 3)}
              currentStep={Math.min(currentStep, 2)}
              variant="vertical"
              showDescriptions={true}
              size="sm"
            />
          </div>
        </div>

        {/* Circular Progress */}
        <div className="flex justify-center">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-4 text-center">Circular Progress</h4>
            <ProgressIndicator
              steps={optimizationSteps}
              currentStep={currentStep}
              variant="circular"
              showDescriptions={true}
            />
          </div>
        </div>
      </div>

      {/* Success Toast */}
      <SuccessToast
        isVisible={showToast}
        message="Portfolio optimization completed!"
        description="Your optimized portfolio allocations are ready for review."
        variant="success"
        duration={5000}
        showProgress={true}
        onClose={() => setShowToast(false)}
        actionButton={{
          label: 'View Results',
          onClick: () => {
            console.log('View results clicked');
            setShowToast(false);
          }
        }}
      />

      {/* Demo Controls */}
      <div className="flex justify-center space-x-4 pt-6 border-t border-gray-200">
        <button
          onClick={() => setShowToast(true)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Show Success Toast
        </button>
        
        <button
          onClick={() => {
            setCurrentStep(0);
            setTimeout(() => setCurrentStep(1), 1000);
            setTimeout(() => setCurrentStep(2), 2000);
            setTimeout(() => setCurrentStep(3), 3000);
            setTimeout(() => setCurrentStep(4), 4000);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Demo Progress
        </button>
      </div>
    </div>
  );
};

export default LoadingExamples;