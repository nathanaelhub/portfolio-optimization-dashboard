import React, { useState, useEffect } from 'react';
import { Tutorial, TutorialStep, getTutorial } from '../services/educationalContent';
import { usePortfolio } from '../contexts/PortfolioContext';
import { motion, AnimatePresence } from 'framer-motion';

interface InteractiveTutorialProps {
  tutorialId: string;
  onComplete?: () => void;
  onSkip?: () => void;
}

const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
  tutorialId,
  onComplete,
  onSkip
}) => {
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<Record<number, any>>({});
  const [isValidated, setIsValidated] = useState(true);
  
  const { state, dispatch } = usePortfolio();

  useEffect(() => {
    const loadedTutorial = getTutorial(tutorialId);
    if (loadedTutorial) {
      setTutorial(loadedTutorial);
    }
  }, [tutorialId]);

  if (!tutorial) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentTutorialStep = tutorial.steps[currentStep];
  const progress = ((currentStep + 1) / tutorial.steps.length) * 100;

  const handleNext = () => {
    if (currentStep < tutorial.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setIsValidated(true);
    } else {
      onComplete?.();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setIsValidated(true);
    }
  };

  const handleStepData = (data: any) => {
    setStepData({ ...stepData, [currentStep]: data });
    
    // Validate if required
    if (currentTutorialStep.validation?.required) {
      const isValid = currentTutorialStep.validation.condition
        ? currentTutorialStep.validation.condition(data)
        : Boolean(data);
      setIsValidated(isValid);
    }
  };

  const renderInteractiveComponent = (step: TutorialStep) => {
    if (!step.interactive) return null;

    switch (step.interactive.component) {
      case 'PortfolioPieChart':
        return <PortfolioPieChart {...step.interactive.props} />;
      case 'AssetClassComparison':
        return <AssetClassComparison {...step.interactive.props} />;
      case 'RiskToleranceQuiz':
        return <RiskToleranceQuiz {...step.interactive.props} onComplete={handleStepData} />;
      case 'AssetSelector':
        return <AssetSelector {...step.interactive.props} onSelect={handleStepData} />;
      case 'RiskReturnScatter':
        return <RiskReturnScatter {...step.interactive.props} />;
      case 'VolatilitySimulator':
        return <VolatilitySimulator {...step.interactive.props} />;
      case 'CorrelationSimulator':
        return <CorrelationSimulator {...step.interactive.props} />;
      case 'RebalancingCostCalculator':
        return <RebalancingCostCalculator {...step.interactive.props} onCalculate={handleStepData} />;
      default:
        return <div>Interactive component: {step.interactive.component}</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{tutorial.title}</h2>
                <p className="text-sm text-gray-600">
                  {tutorial.estimatedTime} min • {tutorial.difficulty}
                </p>
              </div>
            </div>
            
            <button
              onClick={onSkip}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            Step {currentStep + 1} of {tutorial.steps.length}
          </p>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Step Title */}
              <h3 className="text-lg font-semibold text-gray-900">
                {currentTutorialStep.title}
              </h3>

              {/* Step Content */}
              <p className="text-gray-700 leading-relaxed">
                {currentTutorialStep.content}
              </p>

              {/* Interactive Component */}
              <div className="bg-gray-50 rounded-lg p-6">
                {renderInteractiveComponent(currentTutorialStep)}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="p-6 border-t border-gray-200">
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Previous
            </button>

            <div className="flex space-x-2">
              {tutorial.steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : index < currentStep
                      ? 'bg-blue-300'
                      : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={handleNext}
              disabled={!isValidated}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                !isValidated
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {currentStep === tutorial.steps.length - 1 ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Interactive Components for Tutorials

const PortfolioPieChart: React.FC<{ data: any[] }> = ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="relative h-64">
        {/* Simple pie chart visualization */}
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {data.map((item, index) => {
            const startAngle = data.slice(0, index).reduce((sum, d) => sum + d.value, 0) * 3.6;
            const endAngle = startAngle + item.value * 3.6;
            const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
            const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
            const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
            const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
            const largeArc = item.value > 50 ? 1 : 0;
            
            return (
              <path
                key={index}
                d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            );
          })}
        </svg>
      </div>
      <div className="flex justify-center space-x-6">
        {data.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <div className={`w-4 h-4 rounded`} style={{ backgroundColor: item.color }}></div>
            <span className="text-sm text-gray-700">{item.name}: {item.value}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const AssetClassComparison: React.FC<{ showRiskReturn: boolean; highlightTradeoffs: boolean }> = ({ 
  showRiskReturn, 
  highlightTradeoffs 
}) => {
  const assetClasses = [
    { name: 'Cash', return: 2, risk: 1, color: '#10B981' },
    { name: 'Bonds', return: 4, risk: 5, color: '#3B82F6' },
    { name: 'Stocks', return: 8, risk: 15, color: '#F59E0B' },
    { name: 'Real Estate', return: 6, risk: 10, color: '#8B5CF6' }
  ];

  return (
    <div className="space-y-6">
      {showRiskReturn && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Expected Return</h4>
            {assetClasses.map((asset, index) => (
              <div key={index} className="flex items-center mb-2">
                <span className="w-20 text-sm text-gray-600">{asset.name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 ml-2">
                  <div
                    className="h-4 rounded-full"
                    style={{ 
                      width: `${asset.return * 10}%`,
                      backgroundColor: asset.color
                    }}
                  />
                </div>
                <span className="ml-2 text-sm font-medium">{asset.return}%</span>
              </div>
            ))}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Risk (Volatility)</h4>
            {assetClasses.map((asset, index) => (
              <div key={index} className="flex items-center mb-2">
                <span className="w-20 text-sm text-gray-600">{asset.name}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 ml-2">
                  <div
                    className="h-4 rounded-full"
                    style={{ 
                      width: `${asset.risk * 5}%`,
                      backgroundColor: asset.color
                    }}
                  />
                </div>
                <span className="ml-2 text-sm font-medium">{asset.risk}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {highlightTradeoffs && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Key Tradeoffs</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Higher returns require accepting more volatility</li>
            <li>• Cash preserves capital but loses to inflation</li>
            <li>• Stocks offer growth but can lose value short-term</li>
            <li>• Mix assets to balance growth and stability</li>
          </ul>
        </div>
      )}
    </div>
  );
};

const RiskToleranceQuiz: React.FC<{ questions: string[]; onComplete: (data: any) => void }> = ({ 
  questions, 
  onComplete 
}) => {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);

  const options = [
    { value: 1, label: 'Very Conservative' },
    { value: 2, label: 'Conservative' },
    { value: 3, label: 'Moderate' },
    { value: 4, label: 'Aggressive' },
    { value: 5, label: 'Very Aggressive' }
  ];

  const handleAnswer = (value: number) => {
    const newAnswers = { ...answers, [currentQuestion]: value };
    setAnswers(newAnswers);
    
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      // Calculate risk score
      const avgScore = Object.values(newAnswers).reduce((a, b) => a + b, 0) / questions.length;
      onComplete({ riskScore: avgScore, answers: newAnswers });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h4 className="font-medium text-gray-900 mb-2">
          Question {currentQuestion + 1} of {questions.length}
        </h4>
        <p className="text-gray-700">{questions[currentQuestion]}</p>
      </div>
      
      <div className="space-y-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => handleAnswer(option.value)}
            className={`w-full p-4 text-left rounded-lg border-2 transition-colors ${
              answers[currentQuestion] === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="font-medium">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const AssetSelector: React.FC<{ 
  categories: string[]; 
  showEducation: boolean; 
  onSelect: (data: any) => void 
}> = ({ categories, showEducation, onSelect }) => {
  const [selected, setSelected] = useState<Record<string, number>>({});
  
  const handleAllocationChange = (category: string, value: number) => {
    const newSelected = { ...selected, [category]: value };
    setSelected(newSelected);
    
    const total = Object.values(newSelected).reduce((sum, val) => sum + val, 0);
    onSelect({ allocations: newSelected, total });
  };

  const total = Object.values(selected).reduce((sum, val) => sum + val, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {categories.map((category) => (
          <div key={category}>
            <div className="flex justify-between mb-2">
              <label className="font-medium text-gray-700">{category}</label>
              <span className="text-sm font-medium text-gray-600">
                {selected[category] || 0}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={selected[category] || 0}
              onChange={(e) => handleAllocationChange(category, parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        ))}
      </div>
      
      <div className={`text-center p-4 rounded-lg ${
        Math.abs(total - 100) < 0.01 
          ? 'bg-green-50 text-green-800' 
          : 'bg-red-50 text-red-800'
      }`}>
        <span className="font-medium">Total Allocation: {total}%</span>
        {Math.abs(total - 100) >= 0.01 && (
          <p className="text-sm mt-1">Allocations must sum to 100%</p>
        )}
      </div>
      
      {showEducation && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-800 mb-2">Asset Selection Tips</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Start with broad market index funds</li>
            <li>• Consider your investment timeline</li>
            <li>• Don't forget international exposure</li>
            <li>• Keep some allocation to bonds for stability</li>
          </ul>
        </div>
      )}
    </div>
  );
};

const RiskReturnScatter: React.FC<{ assets: string[]; showRiskPremium: boolean }> = ({ 
  assets, 
  showRiskPremium 
}) => {
  const assetData = {
    'Cash': { risk: 1, return: 2 },
    'Bonds': { risk: 5, return: 4 },
    'Stocks': { risk: 15, return: 8 },
    'Crypto': { risk: 40, return: 15 }
  };

  return (
    <div className="relative h-64 bg-gray-50 rounded-lg p-4">
      {/* Axes */}
      <div className="absolute bottom-4 left-4 right-4 top-4 border-l-2 border-b-2 border-gray-400">
        {/* X-axis label */}
        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-sm text-gray-600">
          Risk (Volatility %)
        </div>
        {/* Y-axis label */}
        <div className="absolute -left-12 top-1/2 transform -translate-y-1/2 -rotate-90 text-sm text-gray-600">
          Return %
        </div>
        
        {/* Plot points */}
        {assets.map((asset) => {
          const data = assetData[asset];
          if (!data) return null;
          
          const x = (data.risk / 50) * 100; // Scale to percentage
          const y = 100 - (data.return / 20) * 100; // Invert and scale
          
          return (
            <div
              key={asset}
              className="absolute w-3 h-3 bg-blue-600 rounded-full transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${x}%`, top: `${y}%` }}
              title={`${asset}: ${data.risk}% risk, ${data.return}% return`}
            >
              <span className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium whitespace-nowrap">
                {asset}
              </span>
            </div>
          );
        })}
        
        {/* Risk premium line */}
        {showRiskPremium && (
          <div className="absolute bottom-0 left-0 w-full h-full">
            <svg className="w-full h-full">
              <line
                x1="0"
                y1="100%"
                x2="100%"
                y2="0"
                stroke="#10B981"
                strokeWidth="2"
                strokeDasharray="5,5"
              />
              <text x="60%" y="40%" fill="#10B981" fontSize="12" fontWeight="bold">
                Risk Premium Line
              </text>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
};

const VolatilitySimulator: React.FC<{ compareAssets: boolean; timeHorizon: number[] }> = ({ 
  compareAssets, 
  timeHorizon 
}) => {
  const [selectedHorizon, setSelectedHorizon] = useState(timeHorizon[0]);
  const [isSimulating, setIsSimulating] = useState(false);

  const handleSimulate = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <label className="font-medium text-gray-700 mr-3">Time Horizon:</label>
          <select
            value={selectedHorizon}
            onChange={(e) => setSelectedHorizon(Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded-lg"
          >
            {timeHorizon.map((years) => (
              <option key={years} value={years}>{years} Year{years > 1 ? 's' : ''}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={handleSimulate}
          disabled={isSimulating}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </button>
      </div>
      
      {compareAssets && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-medium text-green-800 mb-2">Low Volatility (Bonds)</h4>
            <div className="space-y-2">
              <div className="text-sm text-green-700">Range: -5% to +10%</div>
              <div className="text-sm text-green-700">Typical Year: +4%</div>
              <div className="text-sm text-green-700">Worst Year: -2%</div>
            </div>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-medium text-orange-800 mb-2">High Volatility (Stocks)</h4>
            <div className="space-y-2">
              <div className="text-sm text-orange-700">Range: -30% to +40%</div>
              <div className="text-sm text-orange-700">Typical Year: +8%</div>
              <div className="text-sm text-orange-700">Worst Year: -25%</div>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-100 rounded-lg p-4 h-48 flex items-center justify-center">
        {isSimulating ? (
          <div className="text-gray-600">Simulating portfolio paths...</div>
        ) : (
          <div className="text-gray-500">Click "Run Simulation" to see volatility in action</div>
        )}
      </div>
    </div>
  );
};

const CorrelationSimulator: React.FC<{ 
  adjustableCorrelation: boolean; 
  showPortfolioEffect: boolean 
}> = ({ adjustableCorrelation, showPortfolioEffect }) => {
  const [correlation, setCorrelation] = useState(0.5);
  
  return (
    <div className="space-y-6">
      {adjustableCorrelation && (
        <div>
          <div className="flex justify-between mb-2">
            <label className="font-medium text-gray-700">Correlation Level</label>
            <span className="text-sm font-medium text-gray-600">
              {correlation.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-1"
            max="1"
            step="0.1"
            value={correlation}
            onChange={(e) => setCorrelation(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Perfect Negative</span>
            <span>No Correlation</span>
            <span>Perfect Positive</span>
          </div>
        </div>
      )}
      
      {showPortfolioEffect && (
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">15%</div>
            <div className="text-sm text-gray-600">Asset A Volatility</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-900">20%</div>
            <div className="text-sm text-gray-600">Asset B Volatility</div>
          </div>
          <div>
            <div className={`text-2xl font-bold ${
              correlation < 0.3 ? 'text-green-600' : 'text-orange-600'
            }`}>
              {(17.5 - (1 - Math.abs(correlation)) * 5).toFixed(1)}%
            </div>
            <div className="text-sm text-gray-600">Portfolio Volatility</div>
          </div>
        </div>
      )}
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-medium text-blue-800 mb-2">Correlation Insights</h4>
        <p className="text-sm text-blue-700">
          {correlation < -0.5 && 'Strong negative correlation provides excellent diversification!'}
          {correlation >= -0.5 && correlation < 0.3 && 'Low correlation offers good diversification benefits.'}
          {correlation >= 0.3 && correlation < 0.7 && 'Moderate correlation provides some diversification.'}
          {correlation >= 0.7 && 'High correlation reduces diversification benefits significantly.'}
        </p>
      </div>
    </div>
  );
};

const RebalancingCostCalculator: React.FC<{ 
  includeTaxes: boolean; 
  showBreakeven: boolean; 
  onCalculate: (data: any) => void 
}> = ({ includeTaxes, showBreakeven, onCalculate }) => {
  const [portfolioValue, setPortfolioValue] = useState(100000);
  const [rebalanceFrequency, setRebalanceFrequency] = useState('quarterly');
  const [tradingCost, setTradingCost] = useState(10);
  const [taxRate, setTaxRate] = useState(0.15);
  
  const calculateCosts = () => {
    const frequencyMap = { monthly: 12, quarterly: 4, annually: 1 };
    const tradesPerYear = frequencyMap[rebalanceFrequency] || 4;
    const tradingCosts = tradesPerYear * tradingCost * 2; // Buy and sell
    const turnover = 0.2; // Assume 20% turnover per rebalance
    const taxableSales = includeTaxes ? portfolioValue * turnover * tradesPerYear * 0.1 : 0; // 10% gains
    const taxes = taxableSales * taxRate;
    const totalCost = tradingCosts + taxes;
    const costPercentage = (totalCost / portfolioValue) * 100;
    
    const result = {
      tradingCosts,
      taxes,
      totalCost,
      costPercentage,
      breakeven: showBreakeven ? totalCost / portfolioValue * 100 : null
    };
    
    onCalculate(result);
    
    return result;
  };

  const costs = calculateCosts();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Portfolio Value
          </label>
          <input
            type="number"
            value={portfolioValue}
            onChange={(e) => setPortfolioValue(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Rebalance Frequency
          </label>
          <select
            value={rebalanceFrequency}
            onChange={(e) => setRebalanceFrequency(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annually">Annually</option>
          </select>
        </div>
      </div>
      
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-3">Annual Cost Breakdown</h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-700">Trading Costs:</span>
            <span className="font-medium">${costs.tradingCosts.toFixed(2)}</span>
          </div>
          {includeTaxes && (
            <div className="flex justify-between">
              <span className="text-gray-700">Estimated Taxes:</span>
              <span className="font-medium">${costs.taxes.toFixed(2)}</span>
            </div>
          )}
          <div className="pt-2 border-t border-gray-300">
            <div className="flex justify-between">
              <span className="font-medium text-gray-900">Total Annual Cost:</span>
              <span className="font-bold text-gray-900">${costs.totalCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-1">
              <span>As % of Portfolio:</span>
              <span>{costs.costPercentage.toFixed(2)}%</span>
            </div>
          </div>
        </div>
      </div>
      
      {showBreakeven && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-800 mb-2">Breakeven Analysis</h4>
          <p className="text-sm text-yellow-700">
            Rebalancing must improve returns by at least {costs.costPercentage.toFixed(2)}% 
            annually to justify these costs.
          </p>
        </div>
      )}
    </div>
  );
};

export default InteractiveTutorial;