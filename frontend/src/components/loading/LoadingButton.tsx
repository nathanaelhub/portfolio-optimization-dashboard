import React from 'react';
import LoadingSpinner from './LoadingSpinner';

interface LoadingButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loadingText?: string;
  spinnerVariant?: 'default' | 'dots' | 'bars' | 'ring' | 'pulse';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  children,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loadingText,
  spinnerVariant = 'default',
  onClick,
  type = 'button',
  className = ''
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: loading || disabled 
      ? 'bg-blue-400 text-white cursor-not-allowed'
      : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
    secondary: loading || disabled
      ? 'bg-gray-300 text-gray-500 border border-gray-300 cursor-not-allowed'
      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 active:bg-gray-100',
    success: loading || disabled
      ? 'bg-green-400 text-white cursor-not-allowed'
      : 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 active:bg-green-800',
    danger: loading || disabled
      ? 'bg-red-400 text-white cursor-not-allowed'
      : 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    warning: loading || disabled
      ? 'bg-yellow-400 text-white cursor-not-allowed'
      : 'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 active:bg-yellow-800'
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg'
  };

  const spinnerSizes = {
    sm: 'sm' as const,
    md: 'sm' as const,
    lg: 'md' as const
  };

  const widthClass = fullWidth ? 'w-full' : '';

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      onClick={isDisabled ? undefined : onClick}
      disabled={isDisabled}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${widthClass}
        ${className}
      `}
    >
      {loading && (
        <div className="mr-2 flex items-center">
          <LoadingSpinner
            size={spinnerSizes[size]}
            color={variant === 'secondary' ? 'gray' : 'white'}
            variant={spinnerVariant}
          />
        </div>
      )}
      
      <span className={loading ? 'opacity-75' : ''}>
        {loading && loadingText ? loadingText : children}
      </span>

      {/* Loading overlay for smooth transition */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="animate-pulse opacity-50"></div>
        </div>
      )}
    </button>
  );
};

export default LoadingButton;