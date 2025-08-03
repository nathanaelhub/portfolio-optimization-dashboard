/**
 * Demo Mode Configuration
 * 
 * Configures the application for demonstration purposes with pre-loaded data,
 * instant login, and guided tours for showcasing platform capabilities.
 */

export interface DemoUser {
  id: string;
  email: string;
  name: string;
  password: string;
  role: 'demo_user';
  features: string[];
}

export interface DemoPortfolio {
  id: string;
  name: string;
  description: string;
  riskProfile: 'conservative' | 'moderate' | 'aggressive';
  totalValue: number;
  holdings: Array<{
    symbol: string;
    name: string;
    allocation: number;
    value: number;
    sector: string;
  }>;
  performance: {
    ytdReturn: number;
    totalReturn: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
  };
}

export const DEMO_CONFIG = {
  // Demo mode settings
  enabled: process.env.REACT_APP_DEMO_MODE === 'true',
  autoLogin: process.env.REACT_APP_DEMO_AUTO_LOGIN === 'true',
  showDemoNotice: process.env.REACT_APP_SHOW_DEMO_NOTICE !== 'false',
  resetInterval: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  
  // Demo user credentials
  user: {
    id: 'demo-user-001',
    email: 'demo@portfolio-dashboard.com',
    name: 'Demo User',
    password: 'DemoPass2024!',
    role: 'demo_user' as const,
    features: [
      'portfolio_optimization',
      'risk_analysis', 
      'backtesting',
      'csv_import_export',
      'real_time_data',
      'guided_tour'
    ]
  } as DemoUser,

  // Demo portfolios pre-loaded in the system
  portfolios: [
    {
      id: 'demo-conservative-001',
      name: 'Conservative Growth Portfolio',
      description: 'Low-risk balanced approach with steady returns and capital preservation',
      riskProfile: 'conservative' as const,
      totalValue: 100000,
      holdings: [
        { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF', allocation: 0.25, value: 25000, sector: 'Broad Market' },
        { symbol: 'VXUS', name: 'Vanguard Total International Stock ETF', allocation: 0.15, value: 15000, sector: 'International' },
        { symbol: 'BND', name: 'Vanguard Total Bond Market ETF', allocation: 0.35, value: 35000, sector: 'Fixed Income' },
        { symbol: 'BNDX', name: 'Vanguard Total International Bond ETF', allocation: 0.15, value: 15000, sector: 'International Bonds' },
        { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', allocation: 0.10, value: 10000, sector: 'Real Estate' }
      ],
      performance: {
        ytdReturn: 0.045,
        totalReturn: 0.347,
        sharpeRatio: 0.68,
        volatility: 0.087,
        maxDrawdown: -0.089
      }
    },
    {
      id: 'demo-balanced-001', 
      name: 'Balanced Growth Portfolio',
      description: 'Moderate-risk portfolio balancing growth potential with stability',
      riskProfile: 'moderate' as const,
      totalValue: 150000,
      holdings: [
        { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust', allocation: 0.30, value: 45000, sector: 'Large Cap' },
        { symbol: 'QQQ', name: 'Invesco QQQ Trust', allocation: 0.20, value: 30000, sector: 'Technology' },
        { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets ETF', allocation: 0.15, value: 22500, sector: 'International' },
        { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets ETF', allocation: 0.05, value: 7500, sector: 'Emerging Markets' },
        { symbol: 'AGG', name: 'iShares Core U.S. Aggregate Bond ETF', allocation: 0.20, value: 30000, sector: 'Fixed Income' },
        { symbol: 'TIP', name: 'iShares TIPS Bond ETF', allocation: 0.10, value: 15000, sector: 'Inflation Protected' }
      ],
      performance: {
        ytdReturn: 0.078,
        totalReturn: 0.412,
        sharpeRatio: 0.73,
        volatility: 0.145,
        maxDrawdown: -0.142
      }
    },
    {
      id: 'demo-aggressive-001',
      name: 'Aggressive Growth Portfolio', 
      description: 'High-growth portfolio focused on technology and growth sectors',
      riskProfile: 'aggressive' as const,
      totalValue: 200000,
      holdings: [
        { symbol: 'AAPL', name: 'Apple Inc.', allocation: 0.15, value: 30000, sector: 'Technology' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', allocation: 0.15, value: 30000, sector: 'Technology' },
        { symbol: 'GOOGL', name: 'Alphabet Inc. Class A', allocation: 0.12, value: 24000, sector: 'Technology' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', allocation: 0.10, value: 20000, sector: 'Consumer Discretionary' },
        { symbol: 'TSLA', name: 'Tesla Inc.', allocation: 0.08, value: 16000, sector: 'Electric Vehicles' },
        { symbol: 'NVDA', name: 'NVIDIA Corporation', allocation: 0.10, value: 20000, sector: 'Technology' },
        { symbol: 'META', name: 'Meta Platforms Inc.', allocation: 0.08, value: 16000, sector: 'Technology' },
        { symbol: 'ARKK', name: 'ARK Innovation ETF', allocation: 0.12, value: 24000, sector: 'Innovation' },
        { symbol: 'HYG', name: 'iShares High Yield Corporate Bond ETF', allocation: 0.10, value: 20000, sector: 'High Yield' }
      ],
      performance: {
        ytdReturn: 0.118,
        totalReturn: 0.523,
        sharpeRatio: 0.71,
        volatility: 0.195,
        maxDrawdown: -0.235
      }
    }
  ] as DemoPortfolio[],

  // Demo features and restrictions
  features: {
    // Enable all features for demonstration
    portfolioOptimization: true,
    riskAnalysis: true,
    backtesting: true,
    csvImportExport: true,
    realTimeData: true,
    customConstraints: true,
    
    // Demo-specific features
    guidedTour: true,
    demoDataReset: true,
    performanceComparison: true,
    
    // Restrictions in demo mode
    maxPortfolios: 10,
    maxAssetsPerPortfolio: 50,
    dataExportLimit: 1000,
    apiCallsPerHour: 100
  },

  // Guided tour configuration
  tour: {
    enabled: true,
    autoStart: true,
    steps: [
      {
        target: '.portfolio-overview',
        title: 'Portfolio Overview',
        content: 'This is your portfolio dashboard showing current allocations, performance metrics, and key statistics.',
        placement: 'bottom'
      },
      {
        target: '.optimization-panel',
        title: 'Portfolio Optimization',
        content: 'Use our advanced optimization algorithms to find the optimal asset allocation for your risk tolerance and return objectives.',
        placement: 'right'
      },
      {
        target: '.risk-metrics',
        title: 'Risk Analysis',
        content: 'Monitor portfolio risk with comprehensive metrics including VaR, volatility, Sharpe ratio, and drawdown analysis.',
        placement: 'left'
      },
      {
        target: '.performance-chart',
        title: 'Performance Tracking',
        content: 'Track your portfolio performance over time with interactive charts and benchmark comparisons.',
        placement: 'top'
      },
      {
        target: '.asset-allocation',
        title: 'Asset Allocation',
        content: 'View and modify your current asset allocation with our intuitive pie charts and allocation tools.',
        placement: 'bottom'
      }
    ]
  },

  // Demo data refresh settings
  dataRefresh: {
    portfolioValues: 30000, // 30 seconds
    marketData: 60000, // 1 minute  
    riskMetrics: 300000, // 5 minutes
    performanceData: 900000 // 15 minutes
  },

  // Demo notifications and messages
  messages: {
    welcomeMessage: {
      title: '🎉 Welcome to Portfolio Optimization Dashboard Demo!',
      content: 'Explore our advanced portfolio optimization features with pre-loaded sample data. All features are fully functional in demo mode.',
      type: 'success',
      duration: 5000
    },
    demoNotice: {
      title: '📊 Demo Mode Active',
      content: 'You\'re using the demo version with sample data. Data resets daily. Sign up for full access to your own portfolios.',
      type: 'info',
      persistent: true
    },
    dataResetNotice: {
      title: '🔄 Demo Data Reset',
      content: 'Demo data has been reset to original state. All sample portfolios and performance data have been restored.',
      type: 'info',
      duration: 3000
    }
  },

  // Sample market data for demo
  mockMarketData: {
    // Simulated real-time price updates
    priceUpdates: {
      'AAPL': { price: 184.92, change: 2.15, changePercent: 1.18 },
      'MSFT': { price: 376.44, change: -1.23, changePercent: -0.33 },
      'GOOGL': { price: 139.25, change: 3.89, changePercent: 2.87 },
      'SPY': { price: 465.25, change: 1.45, changePercent: 0.31 },
      'QQQ': { price: 381.75, change: -2.33, changePercent: -0.61 },
      'VTI': { price: 216.45, change: 0.89, changePercent: 0.41 }
    },
    
    // Market indices for context
    marketIndices: {
      'S&P 500': { value: 4567.89, change: 12.34, changePercent: 0.27 },
      'NASDAQ': { value: 14234.56, change: -45.67, changePercent: -0.32 },
      'DOW JONES': { value: 34567.89, change: 89.12, changePercent: 0.26 }
    }
  },

  // Demo optimization results
  optimizationResults: {
    'markowitz': {
      expectedReturn: 0.095,
      expectedVolatility: 0.16,
      sharpeRatio: 1.45,
      optimizationTime: 0.85,
      efficientFrontier: [
        { return: 0.06, volatility: 0.10 },
        { return: 0.08, volatility: 0.13 },
        { return: 0.10, volatility: 0.17 },
        { return: 0.12, volatility: 0.22 }
      ]
    },
    'black_litterman': {
      expectedReturn: 0.088,
      expectedVolatility: 0.14,
      sharpeRatio: 1.52,
      optimizationTime: 1.23,
      confidenceLevel: 0.95
    },
    'risk_parity': {
      expectedReturn: 0.082,
      expectedVolatility: 0.12,
      sharpeRatio: 1.38,
      optimizationTime: 0.67,
      riskContribution: 'Equal'
    }
  }
} as const;

// Demo utility functions
export const isDemoMode = (): boolean => {
  return DEMO_CONFIG.enabled;
};

export const getDemoUser = (): DemoUser => {
  return DEMO_CONFIG.user;
};

export const getDemoPortfolios = (): DemoPortfolio[] => {
  return DEMO_CONFIG.portfolios;
};

export const shouldAutoLogin = (): boolean => {
  return DEMO_CONFIG.enabled && DEMO_CONFIG.autoLogin;
};

export const shouldShowDemoNotice = (): boolean => {
  return DEMO_CONFIG.enabled && DEMO_CONFIG.showDemoNotice;
};

export const getDemoFeatures = () => {
  return DEMO_CONFIG.features;
};

export const getTourConfig = () => {
  return DEMO_CONFIG.tour;
};

// Demo data management
export const resetDemoData = (): void => {
  if (!isDemoMode()) return;
  
  // Reset localStorage demo data
  localStorage.removeItem('demo_portfolios');
  localStorage.removeItem('demo_user_preferences');
  localStorage.removeItem('demo_optimization_history');
  
  // Restore original demo portfolios
  localStorage.setItem('demo_portfolios', JSON.stringify(DEMO_CONFIG.portfolios));
  
  // Show reset notification
  console.log('Demo data has been reset to original state');
};

// Auto-reset timer
export const setupDemoReset = (): void => {
  if (!isDemoMode()) return;
  
  const lastReset = localStorage.getItem('demo_last_reset');
  const now = Date.now();
  
  if (!lastReset || (now - parseInt(lastReset)) > DEMO_CONFIG.resetInterval) {
    resetDemoData();
    localStorage.setItem('demo_last_reset', now.toString());
  }
  
  // Set up next auto-reset
  setTimeout(() => {
    resetDemoData();
    localStorage.setItem('demo_last_reset', Date.now().toString());
    setupDemoReset(); // Recursive setup for continuous resets
  }, DEMO_CONFIG.resetInterval);
};

export default DEMO_CONFIG;