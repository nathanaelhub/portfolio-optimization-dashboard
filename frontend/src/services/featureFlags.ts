/**
 * Feature Flags Service for A/B Testing
 * 
 * Enables dynamic feature toggling and A/B testing for demo optimization.
 * Tracks performance of different UI variations and optimization strategies.
 */

import { analytics } from './analytics';

export interface FeatureFlag {
  key: string;
  enabled: boolean;
  variants?: {
    control: any;
    variant_a?: any;
    variant_b?: any;
    [key: string]: any;
  };
  rollout_percentage: number;
  user_segments?: string[];
  description: string;
}

export interface ABTestConfig {
  test_name: string;
  variants: {
    name: string;
    weight: number;
    config: any;
  }[];
  traffic_allocation: number;
  success_metrics: string[];
}

class FeatureFlagsService {
  private flags: Map<string, FeatureFlag> = new Map();
  private userVariants: Map<string, string> = new Map();
  private userId: string;

  constructor() {
    this.userId = this.getUserId();
    this.initializeFlags();
    this.loadUserVariants();
  }

  private getUserId(): string {
    // Generate consistent user ID for demo users
    let userId = localStorage.getItem('demo_user_id');
    if (!userId) {
      userId = `demo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('demo_user_id', userId);
    }
    return userId;
  }

  private initializeFlags(): void {
    const defaultFlags: FeatureFlag[] = [
      {
        key: 'guided_tour_style',
        enabled: true,
        variants: {
          control: { style: 'modal', autoStart: true },
          tooltip_style: { style: 'tooltip', autoStart: true },
          sidebar_style: { style: 'sidebar', autoStart: false }
        },
        rollout_percentage: 100,
        description: 'A/B test different guided tour presentations'
      },
      {
        key: 'optimization_ui_layout',
        enabled: true,
        variants: {
          control: { layout: 'horizontal', showProgress: true },
          vertical_layout: { layout: 'vertical', showProgress: true },
          minimal_layout: { layout: 'horizontal', showProgress: false }
        },
        rollout_percentage: 100,
        description: 'Test different optimization panel layouts'
      },
      {
        key: 'portfolio_visualization',
        enabled: true,
        variants: {
          control: { chartType: 'pie', showLabels: true },
          donut_chart: { chartType: 'donut', showLabels: true },
          treemap_chart: { chartType: 'treemap', showLabels: false }
        },
        rollout_percentage: 100,
        description: 'Test different portfolio visualization methods'
      },
      {
        key: 'dashboard_metrics_display',
        enabled: true,
        variants: {
          control: { layout: 'cards', showTrends: true, compactMode: false },
          compact_cards: { layout: 'cards', showTrends: false, compactMode: true },
          table_view: { layout: 'table', showTrends: true, compactMode: false }
        },
        rollout_percentage: 100,
        description: 'Test different dashboard metric presentations'
      },
      {
        key: 'demo_call_to_action',
        enabled: true,
        variants: {
          control: { text: 'View Source Code', style: 'button', position: 'header' },
          contact_focus: { text: 'Contact Developer', style: 'prominentButton', position: 'header' },
          github_focus: { text: 'Star on GitHub', style: 'button', position: 'footer' }
        },
        rollout_percentage: 100,
        description: 'Test different call-to-action strategies'
      },
      {
        key: 'performance_indicators',
        enabled: true,
        variants: {
          control: { showExecutionTime: true, showMemoryUsage: false, position: 'bottom' },
          detailed_metrics: { showExecutionTime: true, showMemoryUsage: true, position: 'sidebar' },
          minimal_metrics: { showExecutionTime: false, showMemoryUsage: false, position: 'hidden' }
        },
        rollout_percentage: 100,
        description: 'Test impact of showing performance metrics'
      },
      {
        key: 'onboarding_flow',
        enabled: true,
        variants: {
          control: { showWelcomeModal: true, requireTourCompletion: false, stepCount: 11 },
          streamlined: { showWelcomeModal: false, requireTourCompletion: false, stepCount: 6 },
          guided_required: { showWelcomeModal: true, requireTourCompletion: true, stepCount: 11 }
        },
        rollout_percentage: 100,
        description: 'Test different onboarding approaches'
      },
      {
        key: 'advanced_features_visibility',
        enabled: true,
        variants: {
          control: { showAdvanced: false, requireUnlock: false },
          progressive_disclosure: { showAdvanced: true, requireUnlock: true },
          always_visible: { showAdvanced: true, requireUnlock: false }
        },
        rollout_percentage: 100,
        description: 'Test advanced feature presentation strategies'
      }
    ];

    defaultFlags.forEach(flag => {
      this.flags.set(flag.key, flag);
    });
  }

  private loadUserVariants(): void {
    const savedVariants = localStorage.getItem(`feature_variants_${this.userId}`);
    if (savedVariants) {
      const parsed = JSON.parse(savedVariants);
      Object.entries(parsed).forEach(([key, variant]) => {
        this.userVariants.set(key, variant as string);
      });
    }
  }

  private saveUserVariants(): void {
    const variants = Object.fromEntries(this.userVariants);
    localStorage.setItem(`feature_variants_${this.userId}`, JSON.stringify(variants));
  }

  private assignVariant(flagKey: string, flag: FeatureFlag): string {
    // Check if user already has a variant assigned
    const existingVariant = this.userVariants.get(flagKey);
    if (existingVariant && flag.variants && flag.variants[existingVariant]) {
      return existingVariant;
    }

    // Assign new variant based on user ID hash for consistency
    const variants = Object.keys(flag.variants || { control: {} });
    const userHash = this.hashUserId(this.userId + flagKey);
    const variantIndex = userHash % variants.length;
    const assignedVariant = variants[variantIndex];

    // Save the assignment
    this.userVariants.set(flagKey, assignedVariant);
    this.saveUserVariants();

    // Track the assignment
    analytics.trackFeatureUsage('ab_test_assignment', 'assigned', {
      flag_key: flagKey,
      variant: assignedVariant,
      user_id: this.userId
    });

    return assignedVariant;
  }

  private hashUserId(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // Check if a feature flag is enabled
  isEnabled(flagKey: string): boolean {
    const flag = this.flags.get(flagKey);
    if (!flag) return false;

    // Check rollout percentage
    const userHash = this.hashUserId(this.userId + flagKey + 'rollout');
    const isInRollout = (userHash % 100) < flag.rollout_percentage;

    return flag.enabled && isInRollout;
  }

  // Get the variant configuration for a feature flag
  getVariant<T = any>(flagKey: string): T | null {
    const flag = this.flags.get(flagKey);
    if (!flag || !this.isEnabled(flagKey) || !flag.variants) {
      return null;
    }

    const variantKey = this.assignVariant(flagKey, flag);
    return flag.variants[variantKey] as T;
  }

  // Get the variant name for tracking purposes
  getVariantName(flagKey: string): string {
    const flag = this.flags.get(flagKey);
    if (!flag || !this.isEnabled(flagKey)) {
      return 'disabled';
    }

    if (!flag.variants) {
      return 'enabled';
    }

    return this.assignVariant(flagKey, flag);
  }

  // Track conversion events for A/B tests
  trackConversion(flagKey: string, conversionType: string, value?: number): void {
    const variant = this.getVariantName(flagKey);
    
    analytics.trackFeatureUsage('ab_test_conversion', 'converted', {
      flag_key: flagKey,
      variant: variant,
      conversion_type: conversionType,
      conversion_value: value,
      user_id: this.userId
    });
  }

  // Track feature usage for A/B tests
  trackFeatureUsage(flagKey: string, action: string, metadata?: Record<string, any>): void {
    const variant = this.getVariantName(flagKey);
    
    analytics.trackFeatureUsage('ab_test_usage', action, {
      flag_key: flagKey,
      variant: variant,
      user_id: this.userId,
      ...metadata
    });
  }

  // Get all active experiments for debugging
  getActiveExperiments(): Record<string, string> {
    const active: Record<string, string> = {};
    
    this.flags.forEach((flag, key) => {
      if (this.isEnabled(key)) {
        active[key] = this.getVariantName(key);
      }
    });

    return active;
  }

  // Update flag configuration (for runtime updates)
  updateFlag(flagKey: string, updates: Partial<FeatureFlag>): void {
    const existingFlag = this.flags.get(flagKey);
    if (existingFlag) {
      this.flags.set(flagKey, { ...existingFlag, ...updates });
    }
  }

  // Add new flag at runtime
  addFlag(flag: FeatureFlag): void {
    this.flags.set(flag.key, flag);
  }

  // Remove user from all experiments (for testing)
  resetUserExperiments(): void {
    this.userVariants.clear();
    localStorage.removeItem(`feature_variants_${this.userId}`);
  }
}

// Create singleton instance
export const featureFlags = new FeatureFlagsService();

// Convenience functions for common feature flag checks
export const useGuidedTourStyle = () => featureFlags.getVariant('guided_tour_style');
export const useOptimizationLayout = () => featureFlags.getVariant('optimization_ui_layout');
export const usePortfolioVisualization = () => featureFlags.getVariant('portfolio_visualization');
export const useDashboardMetrics = () => featureFlags.getVariant('dashboard_metrics_display');
export const useCallToAction = () => featureFlags.getVariant('demo_call_to_action');
export const usePerformanceIndicators = () => featureFlags.getVariant('performance_indicators');
export const useOnboardingFlow = () => featureFlags.getVariant('onboarding_flow');
export const useAdvancedFeatures = () => featureFlags.getVariant('advanced_features_visibility');

// A/B Test Component Wrapper
export const ABTestWrapper: React.FC<{
  flagKey: string;
  variants: Record<string, React.ReactNode>;
  fallback?: React.ReactNode;
}> = ({ flagKey, variants, fallback = null }) => {
  const variantName = featureFlags.getVariantName(flagKey);
  
  React.useEffect(() => {
    // Track that this component was rendered
    featureFlags.trackFeatureUsage(flagKey, 'component_rendered');
  }, [flagKey]);

  if (variants[variantName]) {
    return <>{variants[variantName]}</>;
  }

  return <>{fallback}</>;
};

// React Hook for feature flags
export const useFeatureFlag = (flagKey: string) => {
  const [isEnabled, setIsEnabled] = React.useState(featureFlags.isEnabled(flagKey));
  const [variant, setVariant] = React.useState(featureFlags.getVariant(flagKey));
  const [variantName, setVariantName] = React.useState(featureFlags.getVariantName(flagKey));

  React.useEffect(() => {
    // Re-evaluate in case flags change
    setIsEnabled(featureFlags.isEnabled(flagKey));
    setVariant(featureFlags.getVariant(flagKey));
    setVariantName(featureFlags.getVariantName(flagKey));
  }, [flagKey]);

  const trackUsage = React.useCallback((action: string, metadata?: Record<string, any>) => {
    featureFlags.trackFeatureUsage(flagKey, action, metadata);
  }, [flagKey]);

  const trackConversion = React.useCallback((conversionType: string, value?: number) => {
    featureFlags.trackConversion(flagKey, conversionType, value);
  }, [flagKey]);

  return {
    isEnabled,
    variant,
    variantName,
    trackUsage,
    trackConversion
  };
};

export default featureFlags;