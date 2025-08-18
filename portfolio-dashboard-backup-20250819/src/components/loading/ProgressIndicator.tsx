import React from 'react';

interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: 'horizontal' | 'vertical' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showDescriptions?: boolean;
  animated?: boolean;
  className?: string;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep,
  variant = 'horizontal',
  size = 'md',
  showLabels = true,
  showDescriptions = false,
  animated = true,
  className = ''
}) => {
  const sizeClasses = {
    sm: {
      circle: 'w-6 h-6 text-xs',
      line: 'h-0.5',
      text: 'text-xs',
      spacing: 'space-x-2'
    },
    md: {
      circle: 'w-8 h-8 text-sm',
      line: 'h-1',
      text: 'text-sm',
      spacing: 'space-x-4'
    },
    lg: {
      circle: 'w-10 h-10 text-base',
      line: 'h-1.5',
      text: 'text-base',
      spacing: 'space-x-6'
    }
  };

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'completed';
    if (stepIndex === currentStep) return 'current';
    return 'pending';
  };

  const getStepClasses = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    const baseClasses = `${sizeClasses[size].circle} rounded-full flex items-center justify-center font-semibold transition-all duration-300`;
    
    switch (status) {
      case 'completed':
        return `${baseClasses} bg-green-500 text-white`;
      case 'current':
        return `${baseClasses} bg-blue-500 text-white ${animated ? 'animate-pulse' : ''}`;
      case 'pending':
        return `${baseClasses} bg-gray-200 text-gray-500`;
      default:
        return baseClasses;
    }
  };

  const getLineClasses = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    const baseClasses = `${sizeClasses[size].line} transition-all duration-500`;
    
    if (status === 'completed') {
      return `${baseClasses} bg-green-500`;
    }
    return `${baseClasses} bg-gray-200`;
  };

  const renderStepIcon = (stepIndex: number) => {
    const status = getStepStatus(stepIndex);
    
    if (status === 'completed') {
      return (
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      );
    }
    
    if (status === 'current' && animated) {
      return (
        <div className="animate-spin">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      );
    }
    
    return stepIndex + 1;
  };

  const renderHorizontal = () => (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            <div className={getStepClasses(index)}>
              {renderStepIcon(index)}
            </div>
            
            {showLabels && (
              <div className="mt-2 text-center">
                <div className={`font-medium ${sizeClasses[size].text} ${
                  getStepStatus(index) === 'current' ? 'text-blue-600' : 
                  getStepStatus(index) === 'completed' ? 'text-green-600' : 'text-gray-500'
                }`}>
                  {step.label}
                </div>
                
                {showDescriptions && step.description && (
                  <div className={`${sizeClasses[size].text} text-gray-500 mt-1 max-w-20`}>
                    {step.description}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {index < steps.length - 1 && (
            <div className={`flex-1 mx-4 ${getLineClasses(index)}`}></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderVertical = () => (
    <div className={`flex flex-col space-y-4 ${className}`}>
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-start">
          <div className="flex flex-col items-center">
            <div className={getStepClasses(index)}>
              {renderStepIcon(index)}
            </div>
            
            {index < steps.length - 1 && (
              <div className={`w-0.5 h-12 mt-2 ${getLineClasses(index)}`}></div>
            )}
          </div>
          
          {showLabels && (
            <div className="ml-4 flex-1">
              <div className={`font-medium ${sizeClasses[size].text} ${
                getStepStatus(index) === 'current' ? 'text-blue-600' : 
                getStepStatus(index) === 'completed' ? 'text-green-600' : 'text-gray-500'
              }`}>
                {step.label}
              </div>
              
              {showDescriptions && step.description && (
                <div className={`${sizeClasses[size].text} text-gray-500 mt-1`}>
                  {step.description}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  const renderCircular = () => {
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const progress = (currentStep / (steps.length - 1)) * 100;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <div className={`flex flex-col items-center ${className}`}>
        <div className="relative">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className={animated ? 'transition-all duration-500 ease-in-out' : ''}
            />
          </svg>
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {Math.round(progress)}%
              </div>
              <div className="text-sm text-gray-500">
                {currentStep + 1} of {steps.length}
              </div>
            </div>
          </div>
        </div>
        
        {showLabels && (
          <div className="mt-4 text-center">
            <div className="font-medium text-blue-600">
              {steps[currentStep]?.label}
            </div>
            {showDescriptions && steps[currentStep]?.description && (
              <div className="text-sm text-gray-500 mt-1">
                {steps[currentStep].description}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  switch (variant) {
    case 'vertical':
      return renderVertical();
    case 'circular':
      return renderCircular();
    case 'horizontal':
    default:
      return renderHorizontal();
  }
};

export default ProgressIndicator;