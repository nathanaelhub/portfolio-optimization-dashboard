/**
 * Lazy-loaded components for improved performance.
 * 
 * Implements code splitting and lazy loading for heavy components
 * to reduce initial bundle size and improve loading times.
 */

import React, { Suspense, lazy, ComponentType } from 'react';
import { CircularProgress, Box, Typography, Skeleton } from '@mui/material';

// Loading fallback components
const ComponentLoadingFallback: React.FC<{ message?: string }> = ({ 
  message = "Loading component..." 
}) => (
  <Box
    display="flex"
    flexDirection="column"
    alignItems="center"
    justifyContent="center"
    minHeight="200px"
    gap={2}
  >
    <CircularProgress size={40} />
    <Typography variant="body2" color="textSecondary">
      {message}
    </Typography>
  </Box>
);

const ChartLoadingFallback: React.FC = () => (
  <Box p={2}>
    <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
    <Skeleton variant="rectangular" width="100%" height={300} />
    <Box display="flex" gap={2} mt={2}>
      <Skeleton variant="rectangular" width={80} height={24} />
      <Skeleton variant="rectangular" width={80} height={24} />
      <Skeleton variant="rectangular" width={80} height={24} />
    </Box>
  </Box>
);

const FormLoadingFallback: React.FC = () => (
  <Box p={2}>
    <Skeleton variant="text" width="30%" height={40} sx={{ mb: 3 }} />
    {[...Array(4)].map((_, index) => (
      <Box key={index} mb={3}>
        <Skeleton variant="text" width="20%" height={24} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" width="100%" height={56} />
      </Box>
    ))}
    <Box display="flex" gap={2} mt={3}>
      <Skeleton variant="rectangular" width={100} height={36} />
      <Skeleton variant="rectangular" width={100} height={36} />
    </Box>
  </Box>
);

// Lazy-loaded components for different sections
export const LazyPortfolioOptimizationForm = lazy(() => 
  import('../forms/PortfolioOptimizationForm').then(module => ({
    default: module.PortfolioOptimizationForm
  }))
);

export const LazyOptimizationResults = lazy(() => 
  import('../results/OptimizationResults').then(module => ({
    default: module.OptimizationResults
  }))
);

export const LazyPortfolioAnalytics = lazy(() => 
  import('../analytics/PortfolioAnalytics').then(module => ({
    default: module.PortfolioAnalytics
  }))
);

export const LazyAdvancedCharts = lazy(() => 
  import('../visualizations/AdvancedCharts').then(module => ({
    default: module.AdvancedCharts
  }))
);

export const LazyPortfolioComparison = lazy(() => 
  import('../comparison/PortfolioComparison').then(module => ({
    default: module.PortfolioComparison
  }))
);

export const LazyRiskAnalysis = lazy(() => 
  import('../risk/RiskAnalysis').then(module => ({
    default: module.RiskAnalysis
  }))
);

export const LazyBacktesting = lazy(() => 
  import('../backtesting/Backtesting').then(module => ({
    default: module.Backtesting
  }))
);

export const LazyReportGenerator = lazy(() => 
  import('../reports/ReportGenerator').then(module => ({
    default: module.ReportGenerator
  }))
);

export const LazyDataImport = lazy(() => 
  import('../import/DataImport').then(module => ({
    default: module.DataImport
  }))
);

export const LazyUserSettings = lazy(() => 
  import('../settings/UserSettings').then(module => ({
    default: module.UserSettings
  }))
);

// Wrapper components with appropriate loading states
export const PortfolioOptimizationForm: React.FC<any> = (props) => (
  <Suspense fallback={<FormLoadingFallback />}>
    <LazyPortfolioOptimizationForm {...props} />
  </Suspense>
);

export const OptimizationResults: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyOptimizationResults {...props} />
  </Suspense>
);

export const PortfolioAnalytics: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyPortfolioAnalytics {...props} />
  </Suspense>
);

export const AdvancedCharts: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyAdvancedCharts {...props} />
  </Suspense>
);

export const PortfolioComparison: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentLoadingFallback message="Loading portfolio comparison..." />}>
    <LazyPortfolioComparison {...props} />
  </Suspense>
);

export const RiskAnalysis: React.FC<any> = (props) => (
  <Suspense fallback={<ChartLoadingFallback />}>
    <LazyRiskAnalysis {...props} />
  </Suspense>
);

export const Backtesting: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentLoadingFallback message="Loading backtesting module..." />}>
    <LazyBacktesting {...props} />
  </Suspense>
);

export const ReportGenerator: React.FC<any> = (props) => (
  <Suspense fallback={<ComponentLoadingFallback message="Loading report generator..." />}>
    <LazyReportGenerator {...props} />
  </Suspense>
);

export const DataImport: React.FC<any> = (props) => (
  <Suspense fallback={<FormLoadingFallback />}>
    <LazyDataImport {...props} />
  </Suspense>
);

export const UserSettings: React.FC<any> = (props) => (
  <Suspense fallback={<FormLoadingFallback />}>
    <LazyUserSettings {...props} />
  </Suspense>
);

// Higher-order component for adding lazy loading to any component
export function withLazyLoading<P extends object>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallback?: React.ComponentType,
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>
) {
  const LazyComponent = lazy(importFunc);
  
  return React.memo((props: P) => {
    const [error, setError] = React.useState<Error | null>(null);
    const [retryCount, setRetryCount] = React.useState(0);
    
    const retry = React.useCallback(() => {
      setError(null);
      setRetryCount(count => count + 1);
    }, []);
    
    if (error && errorBoundary) {
      const ErrorBoundary = errorBoundary;
      return <ErrorBoundary error={error} retry={retry} />;
    }
    
    if (error) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          gap={2}
        >
          <Typography color="error">Failed to load component</Typography>
          <button onClick={retry}>Retry</button>
        </Box>
      );
    }
    
    return (
      <Suspense fallback={fallback ? <fallback /> : <ComponentLoadingFallback />}>
        <LazyComponent key={retryCount} {...props} />
      </Suspense>
    );
  });
}

// Route-based lazy loading components
export const LazyDashboard = lazy(() => 
  import('../../pages/Dashboard').catch(error => {
    console.error('Failed to load Dashboard:', error);
    throw error;
  })
);

export const LazyPortfolios = lazy(() => 
  import('../../pages/Portfolios').catch(error => {
    console.error('Failed to load Portfolios:', error);
    throw error;
  })
);

export const LazyAnalytics = lazy(() => 
  import('../../pages/Analytics').catch(error => {
    console.error('Failed to load Analytics:', error);
    throw error;
  })
);

export const LazyOptimization = lazy(() => 
  import('../../pages/Optimization').catch(error => {
    console.error('Failed to load Optimization:', error);
    throw error;
  })
);

export const LazyReports = lazy(() => 
  import('../../pages/Reports').catch(error => {
    console.error('Failed to load Reports:', error);
    throw error;
  })
);

// Pre-loading utilities
export const preloadComponent = (importFunc: () => Promise<any>) => {
  const componentImport = importFunc();
  return componentImport;
};

// Pre-load commonly used components
export const preloadCriticalComponents = () => {
  if (typeof window !== 'undefined') {
    // Pre-load components that are likely to be used soon
    setTimeout(() => {
      preloadComponent(() => import('../forms/PortfolioOptimizationForm'));
      preloadComponent(() => import('../results/OptimizationResults'));
    }, 2000);
    
    // Pre-load additional components on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        preloadComponent(() => import('../analytics/PortfolioAnalytics'));
        preloadComponent(() => import('../visualizations/AdvancedCharts'));
      });
    }
  }
};

// Intersection observer based lazy loading
interface IntersectionLazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  once?: boolean;
}

export const IntersectionLazyLoad: React.FC<IntersectionLazyLoadProps> = ({
  children,
  fallback = <ComponentLoadingFallback />,
  rootMargin = '50px',
  threshold = 0.1,
  once = true
}) => {
  const [isVisible, setIsVisible] = React.useState(false);
  const [hasBeenVisible, setHasBeenVisible] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasBeenVisible(true);
          
          if (once) {
            observer.disconnect();
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );
    
    if (ref.current) {
      observer.observe(ref.current);
    }
    
    return () => observer.disconnect();
  }, [rootMargin, threshold, once]);
  
  const shouldRender = once ? hasBeenVisible : isVisible;
  
  return (
    <div ref={ref}>
      {shouldRender ? children : fallback}
    </div>
  );
};

// Bundle analyzer helper (development only)
export const logBundleInfo = () => {
  if (process.env.NODE_ENV === 'development') {
    console.group('Bundle Analysis');
    console.log('Lazy components loaded:', {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown'
    });
    console.groupEnd();
  }
};

// Component for managing critical resource hints
export const ResourceHints: React.FC = () => {
  React.useEffect(() => {
    // Add preload hints for critical resources
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = '/static/js/optimization-worker.js';
    document.head.appendChild(link);
    
    return () => {
      document.head.removeChild(link);
    };
  }, []);
  
  return null;
};

// Error boundary for lazy loaded components
interface LazyErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  LazyErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
    
    // Log to error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Send to error reporting service
    }
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          gap={2}
          p={3}
        >
          <Typography variant="h6" color="error">
            Failed to load component
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
          <button
            onClick={() => this.setState({ hasError: false, error: undefined })}
            style={{
              padding: '8px 16px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: 'white',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </Box>
      );
    }
    
    return this.props.children;
  }
}