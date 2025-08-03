import React, { useState, useEffect, useRef } from 'react';
import { usePortfolio, portfolioActions } from '../contexts/PortfolioContext';
import { getTooltipContent, TooltipContent } from '../services/educationalContent';

interface EducationalTooltipProps {
  topic: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  showOnHover?: boolean;
  alwaysVisible?: boolean;
  customContent?: TooltipContent;
}

const EducationalTooltip: React.FC<EducationalTooltipProps> = ({
  topic,
  children,
  position = 'top',
  className = '',
  showOnHover = true,
  alwaysVisible = false,
  customContent
}) => {
  const { state, dispatch } = usePortfolio();
  const [isVisible, setIsVisible] = useState(alwaysVisible);
  const [showExpanded, setShowExpanded] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const content = customContent || getTooltipContent(topic);
  const isDismissed = state.dismissedTooltips.has(topic);

  useEffect(() => {
    if (alwaysVisible) {
      setIsVisible(true);
    }
  }, [alwaysVisible]);

  // Don't render if educational tooltips are disabled or if this one is dismissed
  if (!state.showEducationalTooltips || isDismissed || !content) {
    return <>{children}</>;
  }

  const handleMouseEnter = () => {
    if (showOnHover) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (showOnHover && !alwaysVisible) {
      setIsVisible(false);
      setShowExpanded(false);
    }
  };

  const handleDismiss = () => {
    dispatch(portfolioActions.dismissTooltip(topic));
    setIsVisible(false);
  };

  const getPositionClasses = () => {
    const baseClasses = 'absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 max-w-sm';
    
    switch (position) {
      case 'top':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
      case 'bottom':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 mt-2`;
      case 'left':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 mr-2`;
      case 'right':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 ml-2`;
      default:
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 mb-2`;
    }
  };

  const getArrowClasses = () => {
    const baseClasses = 'absolute w-3 h-3 bg-white border transform rotate-45';
    
    switch (position) {
      case 'top':
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 -mt-1.5 border-r border-b border-l-0 border-t-0`;
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 -translate-x-1/2 -mb-1.5 border-l border-t border-r-0 border-b-0`;
      case 'left':
        return `${baseClasses} left-full top-1/2 -translate-y-1/2 -ml-1.5 border-t border-r border-l-0 border-b-0`;
      case 'right':
        return `${baseClasses} right-full top-1/2 -translate-y-1/2 -mr-1.5 border-l border-b border-r-0 border-t-0`;
      default:
        return `${baseClasses} top-full left-1/2 -translate-x-1/2 -mt-1.5 border-r border-b border-l-0 border-t-0`;
    }
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      
      {isVisible && (
        <div ref={tooltipRef} className={getPositionClasses()}>
          {/* Arrow */}
          <div className={getArrowClasses()} />
          
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-semibold text-gray-900 text-sm pr-2">{content.title}</h4>
            <button
              onClick={handleDismiss}
              className="text-gray-400 hover:text-gray-600 ml-2 flex-shrink-0"
              title="Dismiss this tooltip"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Brief Content */}
          <p className="text-gray-700 text-xs leading-relaxed mb-3">
            {content.brief}
          </p>
          
          {/* Example (if available and not expanded) */}
          {content.example && !showExpanded && (
            <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
              <div className="text-green-800 font-medium text-xs mb-1">Example:</div>
              <p className="text-green-700 text-xs">{content.example}</p>
            </div>
          )}
          
          {/* Expand Button */}
          {(content.detailed || content.relatedTopics) && (
            <button
              onClick={() => setShowExpanded(!showExpanded)}
              className="text-blue-600 hover:text-blue-800 text-xs font-medium mb-2 flex items-center"
            >
              {showExpanded ? 'Show Less' : 'Learn More'}
              <svg 
                className={`w-3 h-3 ml-1 transition-transform ${showExpanded ? 'rotate-180' : ''}`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
          
          {/* Expanded Content */}
          {showExpanded && (
            <div className="space-y-3">
              {content.detailed && (
                <div>
                  <div className="text-gray-800 font-medium text-xs mb-1">More Information:</div>
                  <p className="text-gray-700 text-xs leading-relaxed">{content.detailed}</p>
                </div>
              )}
              
              {content.example && (
                <div className="bg-green-50 border border-green-200 rounded p-2">
                  <div className="text-green-800 font-medium text-xs mb-1">Example:</div>
                  <p className="text-green-700 text-xs">{content.example}</p>
                </div>
              )}
              
              {content.relatedTopics && (
                <div>
                  <div className="text-gray-800 font-medium text-xs mb-1">Related Concepts:</div>
                  <div className="flex flex-wrap gap-1">
                    {content.relatedTopics.map((concept, index) => (
                      <span 
                        key={index}
                        className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs"
                      >
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Actions */}
          <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
            <button
              onClick={() => dispatch(portfolioActions.toggleEducationalTooltips())}
              className="text-gray-500 hover:text-gray-700 text-xs"
              title="Disable all educational tooltips"
            >
              Disable tooltips
            </button>
            
            <div className="flex items-center space-x-2">
              <div className="flex items-center text-xs text-gray-500">
                <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Educational
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Recommendation Explanation Component
export const RecommendationExplanation: React.FC<{
  explanation: any;
  className?: string;
}> = ({ explanation, className = '' }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const confidenceColor = explanation.confidence > 0.8 ? 'text-green-600' : 
                          explanation.confidence > 0.6 ? 'text-yellow-600' : 'text-red-600';

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Why These Recommendations?
          </h3>
          <p className="text-gray-600 text-sm">{explanation.summary}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-gray-500">Confidence</div>
          <div className={`text-lg font-bold ${confidenceColor}`}>
            {(explanation.confidence * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Expandable Sections */}
      <div className="space-y-3">
        {/* Main Reasons */}
        {explanation.reasons.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('reasons')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">
                Key Changes ({explanation.reasons.length})
              </span>
              <svg 
                className={`w-5 h-5 transition-transform ${
                  expandedSection === 'reasons' ? 'rotate-180' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'reasons' && (
              <div className="px-4 pb-4">
                <ul className="space-y-2">
                  {explanation.reasons.map((reason: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Improvements */}
        {explanation.improvements.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('improvements')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">
                Expected Improvements ({explanation.improvements.length})
              </span>
              <svg 
                className={`w-5 h-5 transition-transform ${
                  expandedSection === 'improvements' ? 'rotate-180' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'improvements' && (
              <div className="px-4 pb-4">
                <ul className="space-y-2">
                  {explanation.improvements.map((improvement: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-green-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{improvement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Constraints */}
        {explanation.constraints.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('constraints')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">
                Active Constraints ({explanation.constraints.length})
              </span>
              <svg 
                className={`w-5 h-5 transition-transform ${
                  expandedSection === 'constraints' ? 'rotate-180' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'constraints' && (
              <div className="px-4 pb-4">
                <ul className="space-y-2">
                  {explanation.constraints.map((constraint: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-yellow-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{constraint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Tradeoffs */}
        {explanation.tradeoffs.length > 0 && (
          <div className="border border-gray-200 rounded-lg">
            <button
              onClick={() => toggleSection('tradeoffs')}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">
                Important Tradeoffs ({explanation.tradeoffs.length})
              </span>
              <svg 
                className={`w-5 h-5 transition-transform ${
                  expandedSection === 'tradeoffs' ? 'rotate-180' : ''
                }`}
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {expandedSection === 'tradeoffs' && (
              <div className="px-4 pb-4">
                <ul className="space-y-2">
                  {explanation.tradeoffs.map((tradeoff: string, index: number) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-orange-600 rounded-full mt-2 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 text-sm">{tradeoff}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Educational Note */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start">
          <svg className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <div className="text-blue-800 font-medium text-xs mb-1">Understanding the Analysis</div>
            <p className="text-blue-700 text-xs">
              This analysis is based on historical data and mathematical optimization. 
              Past performance doesn't guarantee future results, and all investments carry risk.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Contextual Warning Component
export const ContextualWarning: React.FC<{
  warning: any;
  onDismiss?: () => void;
  className?: string;
}> = ({ warning, onDismiss, className = '' }) => {
  const severityColors = {
    low: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    high: 'bg-red-50 border-red-200 text-red-800'
  };

  const severityIcons = {
    low: '⚠️',
    medium: '🚨',
    high: '🛑'
  };

  return (
    <div className={`border rounded-lg p-4 ${severityColors[warning.severity]} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start">
          <span className="text-lg mr-3 flex-shrink-0">{severityIcons[warning.severity]}</span>
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">{warning.title}</h4>
            <p className="text-sm mb-2 opacity-90">{warning.message}</p>
            <p className="text-xs font-medium">
              Recommendation: {warning.recommendation}
            </p>
            
            {warning.learnMoreTopic && (
              <EducationalTooltip topic={warning.learnMoreTopic}>
                <button className="text-xs underline mt-2 hover:no-underline">
                  Learn more about {warning.learnMoreTopic.replace('-', ' ')}
                </button>
              </EducationalTooltip>
            )}
          </div>
        </div>
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-current opacity-60 hover:opacity-100 ml-2 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

// Convenience components for common use cases
export const SharpeRatioTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip topic="sharpe-ratio">{children}</EducationalTooltip>
);

export const EfficientFrontierTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip topic="efficient-frontier">{children}</EducationalTooltip>
);

export const CorrelationTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip topic="correlation">{children}</EducationalTooltip>
);

export const VolatilityTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip topic="volatility">{children}</EducationalTooltip>
);

export const DiversificationTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip topic="diversification">{children}</EducationalTooltip>
);

export const RebalancingTooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <EducationalTooltip topic="rebalancing">{children}</EducationalTooltip>
);

export default EducationalTooltip;