// Advanced Visualization Suite - Main Export File
// Comprehensive D3.js and Recharts visualization components for portfolio optimization

// Core Visualization Components
export { default as PortfolioAllocationCharts } from './PortfolioAllocationCharts';
export { default as PerformanceAnalytics } from './PerformanceAnalytics';
export { default as RiskVisualizations } from './RiskVisualizations';
export { default as RealTimeDashboard } from './RealTimeDashboard';

// Interactive Features and Utilities
export {
  EnhancedTooltip,
  SyncedTooltipProvider,
  useSyncedTooltip,
  BrushZoom,
  useChartExport,
  ExportButton,
  DarkModeToggle,
  useResponsiveContainer,
  useKeyboardNavigation,
  AccessibilityAnnouncer,
  InteractiveChartContainer
} from './InteractiveFeatures';

// Type Definitions for better TypeScript support
export interface VisualizationTheme {
  isDarkMode: boolean;
  colors: {
    primary: string;
    secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
  };
}

export interface ChartDataPoint {
  date: string | Date;
  value: number;
  [key: string]: any;
}

export interface Holding {
  symbol: string;
  name: string;
  allocation: number;
  value: number;
  sector: string;
  change: number;
  changePercent: number;
  currentPrice?: number;
  shares?: number;
  volume?: number;
}

export interface PerformanceData {
  date: string;
  portfolioValue: number;
  portfolioReturn: number;
  benchmarkReturn: number;
  drawdown: number;
  volatility: number;
  sharpeRatio: number;
}

export interface Asset {
  symbol: string;
  name: string;
  expectedReturn: number;
  volatility: number;
  allocation: number;
}

export interface EfficientFrontierPoint {
  risk: number;
  return: number;
  sharpeRatio: number;
  allocation: { [key: string]: number };
}

export interface RiskFactor {
  factor: string;
  contribution: number;
  description: string;
}

export interface Alert {
  id: string;
  type: 'rebalance' | 'risk' | 'opportunity' | 'system';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  timestamp: Date;
  action?: string;
}

// Utility Functions
export const formatCurrency = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatNumber = (value: number, compact: boolean = false): string => {
  if (compact && Math.abs(value) >= 1000000) {
    return new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(value);
  }
  return new Intl.NumberFormat('en-US').format(value);
};

// Color Schemes
export const SECTOR_COLORS = {
  'Technology': '#3B82F6',
  'Healthcare': '#10B981', 
  'Financial Services': '#F59E0B',
  'Consumer Discretionary': '#8B5CF6',
  'Communication': '#EF4444',
  'Industrial': '#06B6D4',
  'Consumer Staples': '#84CC16',
  'Energy': '#F97316',
  'Materials': '#6366F1',
  'Real Estate': '#EC4899',
  'Utilities': '#14B8A6',
  'Other': '#6B7280'
} as const;

export const PERFORMANCE_COLORS = {
  positive: '#10B981',
  negative: '#EF4444',
  neutral: '#6B7280'
} as const;

// Default Theme Configuration
export const DEFAULT_LIGHT_THEME: VisualizationTheme = {
  isDarkMode: false,
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    background: '#FFFFFF',
    surface: '#F9FAFB',
    text: '#111827',
    textSecondary: '#6B7280',
    border: '#E5E7EB'
  }
};

export const DEFAULT_DARK_THEME: VisualizationTheme = {
  isDarkMode: true,
  colors: {
    primary: '#3B82F6',
    secondary: '#9CA3AF',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#06B6D4',
    background: '#111827',
    surface: '#1F2937',
    text: '#F9FAFB',
    textSecondary: '#9CA3AF',
    border: '#374151'
  }
};

// Chart Configuration Presets
export const CHART_CONFIGS = {
  responsive: {
    maintainAspectRatio: false,
    responsive: true
  },
  animation: {
    duration: 300,
    easing: 'ease-in-out'
  },
  tooltip: {
    showDelay: 200,
    hideDelay: 100
  },
  export: {
    defaultWidth: 1200,
    defaultHeight: 800,
    quality: 2
  }
} as const;

// Accessibility Configuration
export const ACCESSIBILITY_CONFIG = {
  focusVisible: true,
  keyboardNavigation: true,
  ariaLabels: true,
  colorBlindFriendly: true,
  highContrast: false
} as const;

// Hook for managing visualization state
export const useVisualizationState = (initialTheme: VisualizationTheme = DEFAULT_LIGHT_THEME) => {
  const [theme, setTheme] = React.useState<VisualizationTheme>(initialTheme);
  const [isExporting, setIsExporting] = React.useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = React.useState<'1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'>('1M');

  const toggleDarkMode = React.useCallback(() => {
    setTheme(prev => prev.isDarkMode ? DEFAULT_LIGHT_THEME : DEFAULT_DARK_THEME);
  }, []);

  return {
    theme,
    setTheme,
    toggleDarkMode,
    isExporting,
    setIsExporting,
    selectedTimeRange,
    setSelectedTimeRange
  };
};

// Re-export React for convenience
import React from 'react';