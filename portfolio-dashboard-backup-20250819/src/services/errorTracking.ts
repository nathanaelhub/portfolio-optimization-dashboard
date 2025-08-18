/**
 * Error Tracking Service with Sentry Integration
 * 
 * Comprehensive error monitoring, performance tracking, and user session replay
 * for production-ready error tracking and debugging capabilities.
 */

import * as Sentry from '@sentry/react';
import { BrowserTracing } from '@sentry/tracing';
import { analytics } from './analytics';

// Environment configuration
const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN || '';
const ENVIRONMENT = process.env.NODE_ENV || 'development';
const APP_VERSION = process.env.REACT_APP_VERSION || '1.0.0';
const DEBUG_MODE = process.env.NODE_ENV === 'development';

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  portfolioId?: string;
  optimizationMethod?: string;
  additionalData?: Record<string, any>;
}

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  tags?: Record<string, string>;
}

class ErrorTrackingService {
  private isInitialized = false;
  private userId: string | null = null;

  constructor() {
    this.initializeSentry();
  }

  private initializeSentry(): void {
    if (!SENTRY_DSN || this.isInitialized) {
      if (DEBUG_MODE && !SENTRY_DSN) {
        console.warn('Sentry DSN not provided. Error tracking disabled.');
      }
      return;
    }

    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        environment: ENVIRONMENT,
        release: APP_VERSION,
        
        // Performance monitoring
        integrations: [
          new BrowserTracing({
            // Capture interactions and navigation
            routingInstrumentation: Sentry.reactRouterV6Instrumentation(
              React.useEffect,
              useLocation,
              useNavigationType,
              createRoutesFromChildren,
              matchRoutes
            ),
            
            // Track specific operations
            tracePropagationTargets: [
              'localhost',
              /^https:\/\/api\.portfolio-dashboard\.com/,
              /^https:\/\/portfolio-dashboard\.com/
            ],
          }),
        ],

        // Capture rate for performance monitoring
        tracesSampleRate: ENVIRONMENT === 'production' ? 0.1 : 1.0,
        
        // Session replay for debugging
        replaysSessionSampleRate: ENVIRONMENT === 'production' ? 0.01 : 0.1,
        replaysOnErrorSampleRate: 1.0,

        // Error filtering
        beforeSend(event, hint) {
          // Filter out common non-critical errors
          const error = hint.originalException;
          
          if (error && typeof error === 'object') {
            const errorMessage = (error as Error).message;
            
            // Filter out extension errors
            if (errorMessage?.includes('Extension') || 
                errorMessage?.includes('chrome-extension')) {
              return null;
            }

            // Filter out network errors that are not actionable
            if (errorMessage?.includes('Network Error') && 
                !errorMessage.includes('portfolio') &&
                !errorMessage.includes('optimization')) {
              return null;
            }
          }

          // Add custom context for demo environment
          if (event.contexts) {
            event.contexts.demo = {
              mode: 'demo',
              version: APP_VERSION,
              features_enabled: localStorage.getItem('demo_features') || 'default'
            };
          }

          return event;
        },

        // Debug mode
        debug: DEBUG_MODE,

        // Capture user interactions
        initialScope: {
          tags: {
            component: 'portfolio-dashboard',
            version: APP_VERSION,
            environment: ENVIRONMENT
          }
        }
      });

      this.isInitialized = true;
      
      if (DEBUG_MODE) {
        console.log('Sentry initialized successfully');
      }
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  // Set user context
  setUser(userId: string, userData?: Record<string, any>): void {
    if (!this.isInitialized) return;

    this.userId = userId;
    
    Sentry.setUser({
      id: userId,
      ...userData,
      demo_user: true,
      session_start: new Date().toISOString()
    });

    if (DEBUG_MODE) {
      console.log('Sentry user context set:', userId);
    }
  }

  // Add breadcrumb for user actions
  addBreadcrumb(message: string, category: string = 'user_action', data?: Record<string, any>): void {
    if (!this.isInitialized) return;

    Sentry.addBreadcrumb({
      message,
      category,
      level: 'info',
      data: {
        timestamp: new Date().toISOString(),
        ...data
      }
    });
  }

  // Capture exceptions with context
  captureException(error: Error, context?: ErrorContext): void {
    if (!this.isInitialized) {
      console.error('Error (Sentry not initialized):', error);
      return;
    }

    // Add context to Sentry scope
    Sentry.withScope(scope => {
      if (context) {
        scope.setContext('error_context', context);
        
        // Set tags for filtering
        if (context.component) scope.setTag('component', context.component);
        if (context.action) scope.setTag('action', context.action);
        if (context.optimizationMethod) scope.setTag('optimization_method', context.optimizationMethod);
      }

      // Add user context if available
      if (this.userId) {
        scope.setUser({ id: this.userId });
      }

      // Add extra context
      scope.setExtra('user_agent', navigator.userAgent);
      scope.setExtra('url', window.location.href);
      scope.setExtra('timestamp', new Date().toISOString());

      // Capture the exception
      Sentry.captureException(error);
    });

    // Also track in Google Analytics for cross-reference
    analytics.trackError(error, context);

    if (DEBUG_MODE) {
      console.error('Error captured by Sentry:', error, context);
    }
  }

  // Capture custom messages
  captureMessage(message: string, level: 'fatal' | 'error' | 'warning' | 'info' | 'debug' = 'info', context?: ErrorContext): void {
    if (!this.isInitialized) {
      console.log(`Message (${level}):`, message);
      return;
    }

    Sentry.withScope(scope => {
      scope.setLevel(level);
      
      if (context) {
        scope.setContext('message_context', context);
      }

      Sentry.captureMessage(message);
    });
  }

  // Performance monitoring
  startTransaction(name: string, operation: string = 'navigation'): any {
    if (!this.isInitialized) return null;

    return Sentry.startTransaction({
      name,
      op: operation,
      tags: {
        demo_mode: true,
        user_id: this.userId || 'anonymous'
      }
    });
  }

  // Track performance metrics
  trackPerformance(metric: PerformanceMetric): void {
    if (!this.isInitialized) return;

    // Add performance breadcrumb
    this.addBreadcrumb(
      `Performance: ${metric.name} = ${metric.value}${metric.unit}`,
      'performance',
      {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit,
        ...metric.tags
      }
    );

    // Track in analytics as well
    analytics.trackPerformance(metric.name, metric.value);
  }

  // Portfolio optimization specific error tracking
  trackOptimizationError(error: Error, optimizationData: {
    method: string;
    assetCount: number;
    executionTime?: number;
    inputData?: any;
  }): void {
    this.captureException(error, {
      component: 'portfolio_optimization',
      action: 'optimization_failed',
      optimizationMethod: optimizationData.method,
      additionalData: {
        asset_count: optimizationData.assetCount,
        execution_time: optimizationData.executionTime,
        input_data_size: JSON.stringify(optimizationData.inputData || {}).length
      }
    });
  }

  // ML model error tracking
  trackMLError(error: Error, modelData: {
    modelType: string;
    predictionType: string;
    inputFeatures?: number;
    modelVersion?: string;
  }): void {
    this.captureException(error, {
      component: 'ml_prediction',
      action: 'prediction_failed',
      additionalData: {
        model_type: modelData.modelType,
        prediction_type: modelData.predictionType,
        input_features: modelData.inputFeatures,
        model_version: modelData.modelVersion
      }
    });
  }

  // API error tracking
  trackAPIError(error: Error, apiData: {
    endpoint: string;
    method: string;
    statusCode?: number;
    responseTime?: number;
  }): void {
    this.captureException(error, {
      component: 'api_client',
      action: 'api_request_failed',
      additionalData: {
        endpoint: apiData.endpoint,
        http_method: apiData.method,
        status_code: apiData.statusCode,
        response_time: apiData.responseTime
      }
    });
  }

  // UI component error tracking
  trackComponentError(error: Error, componentData: {
    componentName: string;
    props?: any;
    state?: any;
    userAction?: string;
  }): void {
    this.captureException(error, {
      component: componentData.componentName,
      action: componentData.userAction || 'component_error',
      additionalData: {
        component_props: JSON.stringify(componentData.props || {}),
        component_state: JSON.stringify(componentData.state || {}),
        user_action: componentData.userAction
      }
    });
  }

  // Track critical user flows
  trackUserFlow(flowName: string, step: string, success: boolean, metadata?: Record<string, any>): void {
    this.addBreadcrumb(
      `User Flow: ${flowName} - ${step} (${success ? 'success' : 'failure'})`,
      'user_flow',
      {
        flow_name: flowName,
        step: step,
        success: success,
        ...metadata
      }
    );

    if (!success) {
      this.captureMessage(
        `User flow failure: ${flowName} at step ${step}`,
        'warning',
        {
          component: 'user_flow',
          action: flowName,
          additionalData: {
            step: step,
            ...metadata
          }
        }
      );
    }
  }

  // Session management
  startSession(sessionData?: Record<string, any>): void {
    this.addBreadcrumb(
      'Session started',
      'session',
      {
        session_id: Date.now().toString(),
        ...sessionData
      }
    );
  }

  endSession(sessionStats?: Record<string, any>): void {
    this.addBreadcrumb(
      'Session ended',
      'session',
      {
        duration: sessionStats?.duration,
        pages_visited: sessionStats?.pagesVisited,
        features_used: sessionStats?.featuresUsed
      }
    );
  }

  // Get current session ID for correlation
  getSessionId(): string | null {
    if (!this.isInitialized) return null;
    
    const hub = Sentry.getCurrentHub();
    const scope = hub.getScope();
    return scope?.getRequestSession()?.id || null;
  }

  // Force flush for critical errors
  async flush(timeout: number = 2000): Promise<boolean> {
    if (!this.isInitialized) return false;
    
    return Sentry.flush(timeout);
  }
}

// Create singleton instance
export const errorTracking = new ErrorTrackingService();

// React Error Boundary integration
export const withErrorBoundary = Sentry.withErrorBoundary;

// HOC for component error tracking
export const withSentryProfiling = Sentry.withProfiler;

// Hook for React components
export const useSentryTransaction = (name: string, operation: string = 'component') => {
  const [transaction, setTransaction] = React.useState<any>(null);

  React.useEffect(() => {
    const tx = errorTracking.startTransaction(name, operation);
    setTransaction(tx);

    return () => {
      if (tx) {
        tx.finish();
      }
    };
  }, [name, operation]);

  return transaction;
};

// Convenience functions
export const captureException = (error: Error, context?: ErrorContext) => {
  errorTracking.captureException(error, context);
};

export const captureMessage = (message: string, level?: 'fatal' | 'error' | 'warning' | 'info' | 'debug', context?: ErrorContext) => {
  errorTracking.captureMessage(message, level, context);
};

export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  errorTracking.addBreadcrumb(message, category, data);
};

export const trackOptimizationError = (error: Error, data: any) => {
  errorTracking.trackOptimizationError(error, data);
};

export const trackMLError = (error: Error, data: any) => {
  errorTracking.trackMLError(error, data);
};

export const setUser = (userId: string, userData?: Record<string, any>) => {
  errorTracking.setUser(userId, userData);
};

// Initialize user context for demo
if (typeof window !== 'undefined') {
  const demoUserId = localStorage.getItem('demo_user_id');
  if (demoUserId) {
    errorTracking.setUser(demoUserId, {
      demo_mode: true,
      session_start: new Date().toISOString()
    });
  }
}

export default errorTracking;