import React, { useState } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  title: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, title, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-gray-800 text-white text-sm rounded-lg p-3 max-w-xs shadow-lg">
            <h4 className="font-semibold mb-1">{title}</h4>
            <p className="text-gray-200">{content}</p>
            <div className={`absolute w-2 h-2 bg-gray-800 transform rotate-45 ${
              position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' :
              position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' :
              position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' :
              'right-full top-1/2 -translate-y-1/2 -mr-1'
            }`}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export const educationalTooltips = {
  diversification: {
    title: "🎯 Diversification",
    content: "Spreading investments across different assets reduces risk. Like not putting all eggs in one basket - if one investment falls, others can balance it out."
  },
  
  correlation: {
    title: "🔗 Correlation",
    content: "How investments move together. Low correlation means when one goes down, another might go up, reducing overall portfolio swings and smoothing returns."
  },
  
  rebalancing: {
    title: "⚖️ Rebalancing",
    content: "Regularly adjusting portfolio back to target weights. More frequent rebalancing maintains your strategy but costs more in fees and taxes."
  },
  
  sharpeRatio: {
    title: "📊 Sharpe Ratio",
    content: "Measures return per unit of risk. Higher is better - it means you're getting more reward for each bit of risk you take. Above 1.0 is good."
  },
  
  sortinoRatio: {
    title: "📉 Sortino Ratio",
    content: "Like Sharpe but only counts downside risk. Better for real-world decisions since investors mainly worry about losing money, not volatility."
  },
  
  efficientFrontier: {
    title: "📈 Efficient Frontier",
    content: "The sweet spot curve showing maximum return for each risk level. Portfolios below this line are inefficient - you can do better."
  },
  
  volatility: {
    title: "📊 Volatility",
    content: "How much your portfolio value bounces around. Higher volatility means bigger swings up and down. Stomach for volatility varies by person."
  },
  
  betaCoefficient: {
    title: "β Beta",
    content: "How much your portfolio moves compared to the market. Beta of 1 = moves with market, >1 = more volatile, <1 = less volatile than market."
  },
  
  expectedReturn: {
    title: "💰 Expected Return",
    content: "Predicted average annual gain based on historical data and models. Remember: past performance doesn't guarantee future results!"
  },
  
  riskTolerance: {
    title: "🎚️ Risk Tolerance",
    content: "Your comfort level with portfolio swings. Consider both financial ability and emotional willingness to handle losses during market downturns."
  }
};

// Component for rendering educational tooltips
export const EducationalTooltip: React.FC<{ 
  term: keyof typeof educationalTooltips; 
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ term, children, position = 'top' }) => {
  const tooltip = educationalTooltips[term];
  return (
    <Tooltip title={tooltip.title} content={tooltip.content} position={position}>
      {children}
    </Tooltip>
  );
};

// Interactive educational panel component
export const EducationalPanel: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'metrics' | 'strategies'>('basics');

  if (!isOpen) return null;

  const tabs = {
    basics: {
      title: 'Portfolio Basics',
      concepts: ['diversification', 'correlation', 'volatility', 'riskTolerance'] as const
    },
    metrics: {
      title: 'Performance Metrics',
      concepts: ['sharpeRatio', 'sortinoRatio', 'betaCoefficient', 'expectedReturn'] as const
    },
    strategies: {
      title: 'Optimization',
      concepts: ['efficientFrontier', 'rebalancing'] as const
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full m-4 max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-2xl font-bold text-gray-800">📚 Learn Portfolio Optimization</h2>
          <button 
            onClick={onClose}
            className="text-gray-600 hover:text-gray-800 text-xl"
          >
            ✕
          </button>
        </div>
        
        <div className="flex border-b">
          {Object.entries(tabs).map(([key, tab]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as keyof typeof tabs)}
              className={`px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === key 
                  ? 'border-b-2 border-blue-500 text-blue-600' 
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.title}
            </button>
          ))}
        </div>
        
        <div className="p-6 overflow-y-auto max-h-96">
          <div className="grid gap-4">
            {tabs[activeTab].concepts.map((concept) => {
              const tooltip = educationalTooltips[concept];
              return (
                <div key={concept} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">{tooltip.title}</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{tooltip.content}</p>
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-sm text-gray-600">
            💡 Hover over any term with a dotted underline throughout the app for quick explanations
          </p>
        </div>
      </div>
    </div>
  );
};

export default EducationalTooltip;