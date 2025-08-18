import React from 'react';

interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'chart' | 'metrics' | 'avatar' | 'button' | 'list';
  lines?: number;
  width?: string;
  height?: string;
  className?: string;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  variant = 'text',
  lines = 3,
  width = 'w-full',
  height = 'h-4',
  className = '',
  animate = true
}) => {
  const baseClasses = `bg-gray-200 rounded ${animate ? 'animate-pulse' : ''}`;
  
  const renderVariant = () => {
    switch (variant) {
      case 'card':
        return (
          <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
            <div className={`${baseClasses} h-6 w-3/4 mb-4`}></div>
            <div className={`${baseClasses} h-4 w-full mb-2`}></div>
            <div className={`${baseClasses} h-4 w-5/6 mb-4`}></div>
            <div className={`${baseClasses} h-32 w-full rounded-lg`}></div>
          </div>
        );
      
      case 'chart':
        return (
          <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 ${className}`}>
            <div className={`${baseClasses} h-6 w-1/2 mb-6`}></div>
            <div className="flex items-end space-x-2 h-64">
              {[...Array(8)].map((_, i) => (
                <div 
                  key={i}
                  className={`${baseClasses} w-8 rounded-t`}
                  style={{ height: `${Math.random() * 60 + 40}%` }}
                ></div>
              ))}
            </div>
            <div className="flex justify-between mt-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`${baseClasses} h-3 w-8`}></div>
              ))}
            </div>
          </div>
        );
      
      case 'metrics':
        return (
          <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${className}`}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                <div className={`${baseClasses} h-4 w-1/2 mb-3`}></div>
                <div className={`${baseClasses} h-8 w-3/4 mb-2`}></div>
                <div className={`${baseClasses} h-3 w-1/3`}></div>
              </div>
            ))}
          </div>
        );
      
      case 'avatar':
        return (
          <div className={`${baseClasses} rounded-full ${width} ${height} ${className}`}></div>
        );
      
      case 'button':
        return (
          <div className={`${baseClasses} ${width} h-12 rounded-lg ${className}`}></div>
        );
      
      case 'list':
        return (
          <div className={`space-y-4 ${className}`}>
            {[...Array(lines)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className={`${baseClasses} h-12 w-12 rounded-full flex-shrink-0`}></div>
                <div className="flex-1 space-y-2">
                  <div className={`${baseClasses} h-4 w-3/4`}></div>
                  <div className={`${baseClasses} h-3 w-1/2`}></div>
                </div>
                <div className={`${baseClasses} h-8 w-20 rounded-md`}></div>
              </div>
            ))}
          </div>
        );
      
      case 'text':
      default:
        return (
          <div className={`space-y-3 ${className}`}>
            {[...Array(lines)].map((_, i) => (
              <div 
                key={i}
                className={`${baseClasses} ${height} ${
                  i === lines - 1 ? 'w-3/4' : width
                }`}
              ></div>
            ))}
          </div>
        );
    }
  };

  return renderVariant();
};

export default LoadingSkeleton;