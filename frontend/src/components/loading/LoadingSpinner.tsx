import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red' | 'yellow';
  variant?: 'default' | 'dots' | 'bars' | 'ring' | 'pulse';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'blue',
  variant = 'default',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    blue: 'border-blue-500',
    gray: 'border-gray-500',
    white: 'border-white',
    green: 'border-green-500',
    red: 'border-red-500',
    yellow: 'border-yellow-500'
  };

  const dotSizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
    xl: 'w-3 h-3'
  };

  const barSizeClasses = {
    sm: 'w-0.5 h-3',
    md: 'w-1 h-4',
    lg: 'w-1 h-6',
    xl: 'w-1.5 h-8'
  };

  const renderSpinner = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className={`flex space-x-1 ${className}`}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`${dotSizeClasses[size]} bg-${color}-500 rounded-full animate-bounce`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '0.6s'
                }}
              ></div>
            ))}
          </div>
        );

      case 'bars':
        return (
          <div className={`flex items-center space-x-1 ${className}`}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className={`${barSizeClasses[size]} bg-${color}-500 animate-pulse`}
                style={{
                  animationDelay: `${i * 0.1}s`,
                  animationDuration: '1s'
                }}
              ></div>
            ))}
          </div>
        );

      case 'ring':
        return (
          <div className={`${className}`}>
            <div className={`${sizeClasses[size]} border-4 border-gray-200 border-t-${color}-500 rounded-full animate-spin`}></div>
          </div>
        );

      case 'pulse':
        return (
          <div className={`${className}`}>
            <div className={`${sizeClasses[size]} bg-${color}-500 rounded-full animate-ping`}></div>
          </div>
        );

      case 'default':
      default:
        return (
          <div className={`${className}`}>
            <div className={`${sizeClasses[size]} border-2 ${colorClasses[color]} border-t-transparent rounded-full animate-spin`}></div>
          </div>
        );
    }
  };

  return renderSpinner();
};

export default LoadingSpinner;