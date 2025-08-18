import React, { createContext, useContext, useReducer, ReactNode } from 'react';

// Types
export interface Holding {
  symbol: string;
  name?: string;
  allocation: number;
  shares?: number;
  value?: number;
  sector?: string;
}

export interface OptimizationResult {
  weights: Record<string, number>;
  risk_metrics: {
    expected_return: number;
    volatility: number;
    sharpe_ratio: number;
    sortino_ratio?: number;
    max_drawdown?: number;
    var_95?: number;
  };
  method_used: string;
  explanation: string;
  confidence_score: number;
  rebalancing_needed: boolean;
  estimated_cost?: number;
}

export interface EfficientFrontierPoint {
  expected_return: number;
  volatility: number;
  sharpe_ratio: number;
  weights?: Record<string, number>;
}

export interface PortfolioState {
  // Current portfolio
  holdings: Holding[];
  riskTolerance: number;
  investmentHorizon: number;
  
  // Optimization results
  optimizationResult: OptimizationResult | null;
  efficientFrontier: EfficientFrontierPoint[];
  
  // UI state
  isLoading: boolean;
  error: string | null;
  selectedOptimizationMethod: 'mean_variance' | 'black_litterman' | 'risk_parity' | 'hierarchical_risk_parity';
  
  // Educational settings
  showEducationalTooltips: boolean;
  dismissedTooltips: Set<string>;
}

type PortfolioAction =
  | { type: 'SET_HOLDINGS'; payload: Holding[] }
  | { type: 'ADD_HOLDING'; payload: Holding }
  | { type: 'REMOVE_HOLDING'; payload: string }
  | { type: 'UPDATE_HOLDING'; payload: { symbol: string; updates: Partial<Holding> } }
  | { type: 'SET_RISK_TOLERANCE'; payload: number }
  | { type: 'SET_INVESTMENT_HORIZON'; payload: number }
  | { type: 'SET_OPTIMIZATION_METHOD'; payload: PortfolioState['selectedOptimizationMethod'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_OPTIMIZATION_RESULT'; payload: OptimizationResult }
  | { type: 'SET_EFFICIENT_FRONTIER'; payload: EfficientFrontierPoint[] }
  | { type: 'TOGGLE_EDUCATIONAL_TOOLTIPS' }
  | { type: 'DISMISS_TOOLTIP'; payload: string }
  | { type: 'RESET_PORTFOLIO' };

const initialState: PortfolioState = {
  holdings: [],
  riskTolerance: 5,
  investmentHorizon: 5,
  optimizationResult: null,
  efficientFrontier: [],
  isLoading: false,
  error: null,
  selectedOptimizationMethod: 'mean_variance',
  showEducationalTooltips: true,
  dismissedTooltips: new Set(),
};

function portfolioReducer(state: PortfolioState, action: PortfolioAction): PortfolioState {
  switch (action.type) {
    case 'SET_HOLDINGS':
      return { ...state, holdings: action.payload, error: null };
    
    case 'ADD_HOLDING':
      const existingIndex = state.holdings.findIndex(h => h.symbol === action.payload.symbol);
      if (existingIndex >= 0) {
        // Update existing holding
        const updatedHoldings = [...state.holdings];
        updatedHoldings[existingIndex] = { ...updatedHoldings[existingIndex], ...action.payload };
        return { ...state, holdings: updatedHoldings };
      } else {
        // Add new holding
        return { ...state, holdings: [...state.holdings, action.payload] };
      }
    
    case 'REMOVE_HOLDING':
      return {
        ...state,
        holdings: state.holdings.filter(h => h.symbol !== action.payload)
      };
    
    case 'UPDATE_HOLDING':
      return {
        ...state,
        holdings: state.holdings.map(h =>
          h.symbol === action.payload.symbol
            ? { ...h, ...action.payload.updates }
            : h
        )
      };
    
    case 'SET_RISK_TOLERANCE':
      return { ...state, riskTolerance: action.payload };
    
    case 'SET_INVESTMENT_HORIZON':
      return { ...state, investmentHorizon: action.payload };
    
    case 'SET_OPTIMIZATION_METHOD':
      return { ...state, selectedOptimizationMethod: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    
    case 'SET_OPTIMIZATION_RESULT':
      return { ...state, optimizationResult: action.payload, error: null, isLoading: false };
    
    case 'SET_EFFICIENT_FRONTIER':
      return { ...state, efficientFrontier: action.payload };
    
    case 'TOGGLE_EDUCATIONAL_TOOLTIPS':
      return { ...state, showEducationalTooltips: !state.showEducationalTooltips };
    
    case 'DISMISS_TOOLTIP':
      return {
        ...state,
        dismissedTooltips: new Set([...state.dismissedTooltips, action.payload])
      };
    
    case 'RESET_PORTFOLIO':
      return { ...initialState, dismissedTooltips: state.dismissedTooltips };
    
    default:
      return state;
  }
}

// Context
const PortfolioContext = createContext<{
  state: PortfolioState;
  dispatch: React.Dispatch<PortfolioAction>;
} | null>(null);

// Provider component
export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(portfolioReducer, initialState);

  return (
    <PortfolioContext.Provider value={{ state, dispatch }}>
      {children}
    </PortfolioContext.Provider>
  );
};

// Custom hook
export const usePortfolio = () => {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return context;
};

// Action creators (helper functions)
export const portfolioActions = {
  setHoldings: (holdings: Holding[]): PortfolioAction => ({
    type: 'SET_HOLDINGS',
    payload: holdings
  }),
  
  addHolding: (holding: Holding): PortfolioAction => ({
    type: 'ADD_HOLDING',
    payload: holding
  }),
  
  removeHolding: (symbol: string): PortfolioAction => ({
    type: 'REMOVE_HOLDING',
    payload: symbol
  }),
  
  updateHolding: (symbol: string, updates: Partial<Holding>): PortfolioAction => ({
    type: 'UPDATE_HOLDING',
    payload: { symbol, updates }
  }),
  
  setRiskTolerance: (tolerance: number): PortfolioAction => ({
    type: 'SET_RISK_TOLERANCE',
    payload: tolerance
  }),
  
  setInvestmentHorizon: (horizon: number): PortfolioAction => ({
    type: 'SET_INVESTMENT_HORIZON',
    payload: horizon
  }),
  
  setOptimizationMethod: (method: PortfolioState['selectedOptimizationMethod']): PortfolioAction => ({
    type: 'SET_OPTIMIZATION_METHOD',
    payload: method
  }),
  
  setLoading: (loading: boolean): PortfolioAction => ({
    type: 'SET_LOADING',
    payload: loading
  }),
  
  setError: (error: string | null): PortfolioAction => ({
    type: 'SET_ERROR',
    payload: error
  }),
  
  setOptimizationResult: (result: OptimizationResult): PortfolioAction => ({
    type: 'SET_OPTIMIZATION_RESULT',
    payload: result
  }),
  
  setEfficientFrontier: (frontier: EfficientFrontierPoint[]): PortfolioAction => ({
    type: 'SET_EFFICIENT_FRONTIER',
    payload: frontier
  }),
  
  toggleEducationalTooltips: (): PortfolioAction => ({
    type: 'TOGGLE_EDUCATIONAL_TOOLTIPS'
  }),
  
  dismissTooltip: (tooltipId: string): PortfolioAction => ({
    type: 'DISMISS_TOOLTIP',
    payload: tooltipId
  }),
  
  resetPortfolio: (): PortfolioAction => ({
    type: 'RESET_PORTFOLIO'
  })
};

// Selectors (derived state)
export const portfolioSelectors = {
  getTotalAllocation: (holdings: Holding[]): number =>
    holdings.reduce((sum, holding) => sum + holding.allocation, 0),
  
  isValidPortfolio: (holdings: Holding[]): boolean => {
    const total = portfolioSelectors.getTotalAllocation(holdings);
    return holdings.length > 0 && Math.abs(total - 100) < 0.01;
  },
  
  getAllocationDifference: (
    currentHoldings: Holding[],
    optimizedWeights: Record<string, number>
  ): Record<string, { current: number; target: number; difference: number; action: 'BUY' | 'SELL' | 'HOLD' }> => {
    const result: Record<string, any> = {};
    
    // Get all unique symbols
    const allSymbols = new Set([
      ...currentHoldings.map(h => h.symbol),
      ...Object.keys(optimizedWeights)
    ]);
    
    allSymbols.forEach(symbol => {
      const current = currentHoldings.find(h => h.symbol === symbol)?.allocation || 0;
      const target = (optimizedWeights[symbol] || 0) * 100;
      const difference = target - current;
      
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (Math.abs(difference) > 1) { // 1% threshold
        action = difference > 0 ? 'BUY' : 'SELL';
      }
      
      if (current > 0 || target > 0) {
        result[symbol] = { current, target, difference, action };
      }
    });
    
    return result;
  },
  
  getRiskToleranceLabel: (tolerance: number): string => {
    if (tolerance <= 2) return 'Conservative';
    if (tolerance <= 4) return 'Moderate Conservative';
    if (tolerance <= 6) return 'Moderate';
    if (tolerance <= 8) return 'Moderate Aggressive';
    return 'Aggressive';
  },
  
  getInvestmentHorizonLabel: (horizon: number): string => {
    if (horizon <= 2) return 'Short-term (≤2 years)';
    if (horizon <= 5) return 'Medium-term (3-5 years)';
    if (horizon <= 10) return 'Long-term (6-10 years)';
    return 'Very Long-term (10+ years)';
  }
};