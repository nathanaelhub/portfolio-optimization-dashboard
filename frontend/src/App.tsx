import React, { useState, useEffect } from 'react';
import { PortfolioProvider, usePortfolio } from './contexts/PortfolioContext';
import PortfolioInputForm from './components/PortfolioInputForm';
import OptimizationResults from './components/OptimizationResults';
import EfficientFrontierChart from './components/EfficientFrontierChart';
import RiskAnalysisPanel from './components/RiskAnalysisPanel';
import MLInsightsPanel from './components/MLInsightsPanel';
import ErrorBoundary, { ChartErrorBoundary, FormErrorBoundary } from './components/ErrorBoundary';
import EducationalTooltip, { SharpeRatioTooltip, EfficientFrontierTooltip } from './components/EducationalTooltip';
import TutorialManager from './components/TutorialManager';

// Navigation component
const Navigation: React.FC = () => {
  const { state, dispatch } = usePortfolio();
  
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Title */}
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 00-2-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9z" />
                </svg>
              </div>
            </div>
            <div className="ml-3">
              <h1 className="text-xl font-bold text-gray-900">Portfolio Optimizer</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Professional quantitative finance tools</p>
            </div>
          </div>

          {/* Educational Toggle */}
          <div className="flex items-center space-x-4">
            <EducationalTooltip topic="diversification" position="bottom">
              <button
                onClick={() => dispatch({ type: 'TOGGLE_EDUCATIONAL_TOOLTIPS' })}
                className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  state.showEducationalTooltips
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="hidden sm:inline">Educational Mode</span>
                <span className="sm:hidden">Help</span>
              </button>
            </EducationalTooltip>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Main dashboard content
const Dashboard: React.FC = () => {
  const { state } = usePortfolio();
  const [activeSection, setActiveSection] = useState<'input' | 'results' | 'frontier' | 'risk' | 'ml'>('input');
  const [isMobile, setIsMobile] = useState(false);

  // Handle responsive design
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-switch to results when optimization completes
  useEffect(() => {
    if (state.optimizationResult && activeSection === 'input') {
      setActiveSection('results');
    }
  }, [state.optimizationResult, activeSection]);

  const navigationItems = [
    { id: 'input', label: 'Portfolio Setup', icon: '⚙️', available: true },
    { id: 'results', label: 'Results', icon: '📊', available: !!state.optimizationResult },
    { id: 'frontier', label: 'Efficient Frontier', icon: '📈', available: !!state.optimizationResult },
    { id: 'risk', label: 'Risk Analysis', icon: '🛡️', available: !!state.optimizationResult },
    { id: 'ml', label: 'ML Insights', icon: '🤖', available: true }
  ];

  const renderMobileNavigation = () => (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="flex space-x-1 overflow-x-auto">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => item.available && setActiveSection(item.id as any)}
            disabled={!item.available}
            className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeSection === item.id
                ? 'bg-blue-600 text-white'
                : item.available
                ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                : 'text-gray-400 cursor-not-allowed'
            }`}
          >
            <span className="mr-2">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );

  const renderDesktopNavigation = () => (
    <div className="bg-white border-r border-gray-200 w-64 flex-shrink-0">
      <div className="p-6">
        <nav className="space-y-2">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => item.available && setActiveSection(item.id as any)}
              disabled={!item.available}
              className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeSection === item.id
                  ? 'bg-blue-600 text-white'
                  : item.available
                  ? 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  : 'text-gray-400 cursor-not-allowed'
              }`}
            >
              <span className="mr-3 text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Progress Indicator */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Progress</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Portfolio Setup</span>
              <span className="text-green-600">✓</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Optimization</span>
              <span className={state.optimizationResult ? 'text-green-600' : 'text-gray-400'}>
                {state.optimizationResult ? '✓' : '○'}
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span>Analysis</span>
              <span className={state.optimizationResult ? 'text-green-600' : 'text-gray-400'}>
                {state.optimizationResult ? '✓' : '○'}
              </span>
            </div>
          </div>
        </div>

        {/* Educational Note */}
        {state.showEducationalTooltips && (
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-blue-800">Educational Mode</h4>
                <p className="text-xs text-blue-700 mt-1">
                  Hover over elements to learn about portfolio optimization concepts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'input':
        return (
          <FormErrorBoundary>
            <PortfolioInputForm />
          </FormErrorBoundary>
        );
      case 'results':
        return (
          <ChartErrorBoundary>
            <OptimizationResults />
          </ChartErrorBoundary>
        );
      case 'frontier':
        return (
          <ChartErrorBoundary>
            <EfficientFrontierChart />
          </ChartErrorBoundary>
        );
      case 'risk':
        return (
          <ChartErrorBoundary>
            <RiskAnalysisPanel />
          </ChartErrorBoundary>
        );
      case 'ml':
        return (
          <ChartErrorBoundary>
            <MLInsightsPanel />
          </ChartErrorBoundary>
        );
      default:
        return (
          <FormErrorBoundary>
            <PortfolioInputForm />
          </FormErrorBoundary>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <div className="flex">
        {/* Desktop Sidebar */}
        {!isMobile && renderDesktopNavigation()}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Mobile Navigation */}
          {isMobile && renderMobileNavigation()}
          
          {/* Content Area */}
          <main className="flex-1 overflow-y-auto">
            <div className="py-6">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-4"></div>
              <div>
                <div className="font-medium text-gray-900">Optimizing Portfolio</div>
                <div className="text-sm text-gray-600">This may take a few moments...</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Error Display */}
      {state.error && (
        <div className="fixed bottom-4 right-4 max-w-md bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg z-50">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700 mt-1">{state.error}</p>
            </div>
            <button
              onClick={() => dispatch({ type: 'SET_ERROR', payload: null })}
              className="ml-4 text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Tutorial Manager */}
      <TutorialManager 
        autoStart={false}
        userLevel="beginner"
        onComplete={(tutorialId) => {
          console.log(`Tutorial completed: ${tutorialId}`);
        }}
      />
    </div>
  );
};

// Main App component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <PortfolioProvider>
        <Dashboard />
      </PortfolioProvider>
    </ErrorBoundary>
  );
};

export default App;