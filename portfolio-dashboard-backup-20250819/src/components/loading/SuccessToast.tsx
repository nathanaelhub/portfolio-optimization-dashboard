import React, { useEffect, useState } from 'react';

interface SuccessToastProps {
  message: string;
  description?: string;
  isVisible: boolean;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  variant?: 'success' | 'error' | 'warning' | 'info';
  showProgress?: boolean;
  onClose?: () => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const SuccessToast: React.FC<SuccessToastProps> = ({
  message,
  description,
  isVisible,
  duration = 5000,
  position = 'top-right',
  variant = 'success',
  showProgress = true,
  onClose,
  actionButton,
  className = ''
}) => {
  const [isShown, setIsShown] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (isVisible) {
      setIsShown(true);
      setProgress(100);

      if (showProgress) {
        const interval = setInterval(() => {
          setProgress((prev) => {
            const newProgress = prev - (100 / (duration / 100));
            if (newProgress <= 0) {
              clearInterval(interval);
              return 0;
            }
            return newProgress;
          });
        }, 100);

        return () => clearInterval(interval);
      }

      const timer = setTimeout(() => {
        setIsShown(false);
        setTimeout(() => {
          onClose?.();
        }, 300); // Allow exit animation to complete
      }, duration);

      return () => clearTimeout(timer);
    } else {
      setIsShown(false);
    }
  }, [isVisible, duration, showProgress, onClose]);

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const variantClasses = {
    success: {
      bg: 'bg-green-50 border-green-200',
      icon: 'text-green-500',
      text: 'text-green-800',
      progress: 'bg-green-500'
    },
    error: {
      bg: 'bg-red-50 border-red-200',
      icon: 'text-red-500',
      text: 'text-red-800',
      progress: 'bg-red-500'
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-200',
      icon: 'text-yellow-500',
      text: 'text-yellow-800',
      progress: 'bg-yellow-500'
    },
    info: {
      bg: 'bg-blue-50 border-blue-200',
      icon: 'text-blue-500',
      text: 'text-blue-800',
      progress: 'bg-blue-500'
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (!isVisible && !isShown) return null;

  return (
    <div className={`fixed z-50 ${positionClasses[position]} ${className}`}>
      <div
        className={`
          max-w-sm w-full shadow-lg rounded-lg border transition-all duration-300 ease-in-out transform
          ${variantClasses[variant].bg}
          ${isShown ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-2 opacity-0 scale-95'}
        `}
      >
        {/* Progress bar */}
        {showProgress && (
          <div className="h-1 w-full bg-gray-200 rounded-t-lg overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ease-linear ${variantClasses[variant].progress}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${variantClasses[variant].icon}`}>
              {getIcon()}
            </div>
            
            <div className="ml-3 w-0 flex-1">
              <p className={`text-sm font-semibold ${variantClasses[variant].text}`}>
                {message}
              </p>
              {description && (
                <p className={`mt-1 text-sm opacity-75 ${variantClasses[variant].text}`}>
                  {description}
                </p>
              )}
              
              {actionButton && (
                <div className="mt-3">
                  <button
                    onClick={actionButton.onClick}
                    className={`text-sm font-medium underline hover:no-underline ${variantClasses[variant].text}`}
                  >
                    {actionButton.label}
                  </button>
                </div>
              )}
            </div>

            <div className="ml-4 flex-shrink-0 flex">
              <button
                onClick={() => {
                  setIsShown(false);
                  setTimeout(() => onClose?.(), 300);
                }}
                className={`rounded-md inline-flex hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 ${variantClasses[variant].text}`}
              >
                <span className="sr-only">Close</span>
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuccessToast;