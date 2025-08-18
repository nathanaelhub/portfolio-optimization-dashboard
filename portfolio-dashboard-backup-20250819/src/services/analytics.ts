/**
 * Google Analytics 4 Integration
 * 
 * Comprehensive tracking for demo usage, user behavior, and conversion metrics.
 * Provides detailed insights for recruiters and stakeholders.
 */

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

export interface AnalyticsEvent {
  event_name: string;
  event_category: string;
  event_label?: string;
  value?: number;
  custom_parameters?: Record<string, any>;
}

export interface UserProperties {
  user_type: 'demo' | 'registered' | 'guest';
  portfolio_count: number;
  optimization_method_preference: string;
  session_duration?: number;
}

class AnalyticsService {
  private isInitialized = false;
  private readonly GA_MEASUREMENT_ID = process.env.REACT_APP_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX';
  private readonly DEBUG_MODE = process.env.NODE_ENV === 'development';

  constructor() {
    this.initializeGA4();
  }

  private initializeGA4(): void {
    if (typeof window === 'undefined' || this.isInitialized) return;

    // Load Google Analytics 4 script
    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${this.GA_MEASUREMENT_ID}`;
    document.head.appendChild(script);

    // Initialize dataLayer and gtag
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag(...args: any[]) {
      window.dataLayer.push(args);
    };

    // Configure GA4
    window.gtag('js', new Date());
    window.gtag('config', this.GA_MEASUREMENT_ID, {
      debug_mode: this.DEBUG_MODE,
      anonymize_ip: true, // GDPR compliance
      allow_ad_personalization_signals: false,
      allow_google_signals: false,
      custom_map: {
        'custom_user_type': 'user_type',
        'custom_portfolio_count': 'portfolio_count',
        'custom_optimization_method': 'optimization_method'
      }
    });

    this.isInitialized = true;

    if (this.DEBUG_MODE) {
      console.log('Google Analytics 4 initialized with ID:', this.GA_MEASUREMENT_ID);
    }
  }

  // Track page views
  trackPageView(page_title: string, page_location: string): void {
    if (!this.isInitialized) return;

    window.gtag('event', 'page_view', {
      page_title,
      page_location,
      send_page_view: true
    });

    if (this.DEBUG_MODE) {
      console.log('Page view tracked:', { page_title, page_location });
    }
  }

  // Track demo-specific events
  trackDemoEvent(event: AnalyticsEvent): void {
    if (!this.isInitialized) return;

    const eventData = {
      event_category: event.event_category,
      event_label: event.event_label,
      value: event.value,
      custom_parameters: {
        demo_mode: true,
        timestamp: new Date().toISOString(),
        ...event.custom_parameters
      }
    };

    window.gtag('event', event.event_name, eventData);

    if (this.DEBUG_MODE) {
      console.log('Demo event tracked:', event.event_name, eventData);
    }
  }

  // Portfolio optimization tracking
  trackOptimization(data: {
    method: string;
    asset_count: number;
    execution_time: number;
    success: boolean;
    user_type: string;
  }): void {
    this.trackDemoEvent({
      event_name: 'portfolio_optimization',
      event_category: 'Portfolio Management',
      event_label: data.method,
      value: Math.round(data.execution_time * 1000), // Convert to milliseconds
      custom_parameters: {
        optimization_method: data.method,
        asset_count: data.asset_count,
        execution_time_ms: Math.round(data.execution_time * 1000),
        success: data.success,
        user_type: data.user_type
      }
    });
  }

  // User engagement tracking
  trackEngagement(action: string, category: string, label?: string, value?: number): void {
    this.trackDemoEvent({
      event_name: 'user_engagement',
      event_category: category,
      event_label: label,
      value,
      custom_parameters: {
        engagement_action: action,
        engagement_category: category,
        engagement_label: label
      }
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, action: string, metadata?: Record<string, any>): void {
    this.trackDemoEvent({
      event_name: 'feature_usage',
      event_category: 'Features',
      event_label: `${feature}_${action}`,
      custom_parameters: {
        feature_name: feature,
        feature_action: action,
        ...metadata
      }
    });
  }

  // Demo completion tracking
  trackDemoCompletion(data: {
    demo_type: string;
    completion_rate: number;
    time_spent: number;
    features_used: string[];
  }): void {
    this.trackDemoEvent({
      event_name: 'demo_completion',
      event_category: 'Demo Experience',
      event_label: data.demo_type,
      value: data.completion_rate,
      custom_parameters: {
        demo_type: data.demo_type,
        completion_rate: data.completion_rate,
        time_spent_seconds: data.time_spent,
        features_used: data.features_used.join(','),
        total_features_used: data.features_used.length
      }
    });
  }

  // Guided tour tracking
  trackGuidedTour(action: 'started' | 'completed' | 'skipped' | 'step_completed', step?: number): void {
    this.trackDemoEvent({
      event_name: 'guided_tour',
      event_category: 'Onboarding',
      event_label: action,
      value: step,
      custom_parameters: {
        tour_action: action,
        step_number: step,
        timestamp: new Date().toISOString()
      }
    });
  }

  // CSV import/export tracking
  trackDataOperation(operation: 'csv_import' | 'csv_export', data: {
    file_size?: number;
    row_count?: number;
    success: boolean;
    error_message?: string;
  }): void {
    this.trackDemoEvent({
      event_name: 'data_operation',
      event_category: 'Data Management',
      event_label: operation,
      value: data.row_count,
      custom_parameters: {
        operation_type: operation,
        file_size_bytes: data.file_size,
        row_count: data.row_count,
        success: data.success,
        error_message: data.error_message
      }
    });
  }

  // Performance tracking
  trackPerformance(metric: string, value: number, category = 'Performance'): void {
    this.trackDemoEvent({
      event_name: 'performance_metric',
      event_category: category,
      event_label: metric,
      value: Math.round(value),
      custom_parameters: {
        metric_name: metric,
        metric_value: value,
        measurement_unit: this.getMetricUnit(metric)
      }
    });
  }

  // Error tracking (complementary to Sentry)
  trackError(error: Error, context?: Record<string, any>): void {
    this.trackDemoEvent({
      event_name: 'javascript_error',
      event_category: 'Errors',
      event_label: error.name,
      custom_parameters: {
        error_message: error.message,
        error_stack: error.stack?.substring(0, 500), // Truncate for GA limits
        error_context: JSON.stringify(context || {}),
        user_agent: navigator.userAgent,
        url: window.location.href
      }
    });
  }

  // Conversion tracking for demo to contact/hire
  trackConversion(conversion_type: 'contact_form' | 'github_visit' | 'linkedin_visit' | 'resume_download'): void {
    this.trackDemoEvent({
      event_name: 'conversion',
      event_category: 'Conversions',
      event_label: conversion_type,
      value: 1,
      custom_parameters: {
        conversion_type,
        conversion_timestamp: new Date().toISOString(),
        referrer: document.referrer
      }
    });

    // Also track as a GA4 conversion event
    window.gtag('event', 'generate_lead', {
      currency: 'USD',
      value: 1.0, // Arbitrary value for tracking
      lead_type: conversion_type
    });
  }

  // Set user properties
  setUserProperties(properties: UserProperties): void {
    if (!this.isInitialized) return;

    window.gtag('config', this.GA_MEASUREMENT_ID, {
      user_properties: {
        user_type: properties.user_type,
        portfolio_count: properties.portfolio_count,
        optimization_method_preference: properties.optimization_method_preference,
        session_duration: properties.session_duration
      }
    });

    if (this.DEBUG_MODE) {
      console.log('User properties set:', properties);
    }
  }

  // Enhanced ecommerce tracking for demo "value"
  trackDemoValue(action: string, value: number): void {
    window.gtag('event', 'purchase', {
      transaction_id: `demo_${Date.now()}`,
      value: value,
      currency: 'USD',
      items: [{
        item_id: 'demo_engagement',
        item_name: 'Portfolio Optimization Demo',
        item_category: 'Demo Experience',
        item_variant: action,
        quantity: 1,
        price: value
      }]
    });
  }

  private getMetricUnit(metric: string): string {
    const units: Record<string, string> = {
      'optimization_time': 'milliseconds',
      'api_response_time': 'milliseconds',
      'bundle_size': 'bytes',
      'memory_usage': 'mb',
      'cpu_usage': 'percent'
    };
    return units[metric] || 'count';
  }

  // Session tracking
  private sessionStartTime = Date.now();

  getSessionDuration(): number {
    return Math.round((Date.now() - this.sessionStartTime) / 1000);
  }

  trackSessionEnd(): void {
    const sessionDuration = this.getSessionDuration();
    this.trackDemoEvent({
      event_name: 'session_end',
      event_category: 'Session',
      event_label: 'demo_session',
      value: sessionDuration,
      custom_parameters: {
        session_duration_seconds: sessionDuration,
        session_end_timestamp: new Date().toISOString()
      }
    });
  }
}

// Create singleton instance
export const analytics = new AnalyticsService();

// Convenience functions for common tracking scenarios
export const trackPortfolioOptimization = (method: string, assetCount: number, executionTime: number, success: boolean) => {
  analytics.trackOptimization({
    method,
    asset_count: assetCount,
    execution_time: executionTime,
    success,
    user_type: 'demo'
  });
};

export const trackFeatureClick = (feature: string, action: string = 'click') => {
  analytics.trackFeatureUsage(feature, action);
};

export const trackDemoInteraction = (interaction: string, category: string = 'Demo Interaction') => {
  analytics.trackEngagement(interaction, category);
};

export const trackConversionEvent = (type: 'contact_form' | 'github_visit' | 'linkedin_visit' | 'resume_download') => {
  analytics.trackConversion(type);
};

// Auto-track page views on route changes
export const trackPageView = (title: string, path: string) => {
  analytics.trackPageView(title, `${window.location.origin}${path}`);
};

// Clean up on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    analytics.trackSessionEnd();
  });
}

export default analytics;