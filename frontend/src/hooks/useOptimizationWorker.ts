/**
 * React hook for portfolio optimization using Web Workers.
 * 
 * Provides a clean interface for running optimization algorithms
 * with loading states, error handling, and caching.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { 
  workerManager, 
  OptimizationRequest, 
  OptimizationResult, 
  MonteCarloRequest, 
  MonteCarloResult,
  WorkerPerformance
} from '../workers/WorkerManager';
import { useDebouncedCallback } from './usePerformanceOptimizations';

// Types for hook state
interface OptimizationState {
  result: OptimizationResult | null;
  loading: boolean;
  error: string | null;
  progress?: number;
}

interface SimulationState {
  result: MonteCarloResult | null;
  loading: boolean;
  error: string | null;
  progress?: number;
}

interface WorkerStats {
  performance: WorkerPerformance | null;
  status: any;
  lastUpdated: Date | null;
}

/**
 * Hook for portfolio optimization
 */
export function usePortfolioOptimization() {
  const [state, setState] = useState<OptimizationState>({
    result: null,
    loading: false,
    error: null
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const optimizationCacheRef = useRef<Map<string, OptimizationResult>>(new Map());
  
  const optimize = useCallback(async (request: OptimizationRequest) => {
    // Generate cache key
    const cacheKey = JSON.stringify({
      method: request.method,
      expectedReturns: request.expectedReturns,
      covarianceMatrix: request.covarianceMatrix,
      constraints: request.constraints,
      parameters: request.parameters
    });
    
    // Check cache first
    if (optimizationCacheRef.current.has(cacheKey)) {
      const cachedResult = optimizationCacheRef.current.get(cacheKey)!;
      setState({
        result: { ...cachedResult, fromCache: true },
        loading: false,
        error: null
      });
      return cachedResult;
    }
    
    // Cancel any ongoing optimization
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0
    }));
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min((prev.progress || 0) + 10, 90)
        }));
      }, 200);
      
      const result = await workerManager.optimizePortfolio(request);
      
      clearInterval(progressInterval);
      
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }
      
      // Cache the result
      optimizationCacheRef.current.set(cacheKey, result);
      
      // Limit cache size
      if (optimizationCacheRef.current.size > 50) {
        const firstKey = optimizationCacheRef.current.keys().next().value;
        optimizationCacheRef.current.delete(firstKey);
      }
      
      setState({
        result,
        loading: false,
        error: null,
        progress: 100
      });
      
      return result;
      
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      
      setState({
        result: null,
        loading: false,
        error: errorMessage,
        progress: 0
      });
      
      throw error;
    }
  }, []);
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        loading: false,
        progress: 0
      }));
    }
  }, []);
  
  const clearCache = useCallback(() => {
    optimizationCacheRef.current.clear();
    workerManager.clearCache();
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    ...state,
    optimize,
    cancel,
    clearCache,
    cacheSize: optimizationCacheRef.current.size
  };
}

/**
 * Hook for Monte Carlo simulations
 */
export function useMonteCarloSimulation() {
  const [state, setState] = useState<SimulationState>({
    result: null,
    loading: false,
    error: null
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  
  const simulate = useCallback(async (request: MonteCarloRequest) => {
    // Cancel any ongoing simulation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0
    }));
    
    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setState(prev => ({
          ...prev,
          progress: Math.min((prev.progress || 0) + 5, 95)
        }));
      }, 100);
      
      const result = await workerManager.runMonteCarloSimulation(request);
      
      clearInterval(progressInterval);
      
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }
      
      setState({
        result,
        loading: false,
        error: null,
        progress: 100
      });
      
      return result;
      
    } catch (error) {
      if (abortControllerRef.current?.signal.aborted) {
        return null;
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Simulation failed';
      
      setState({
        result: null,
        loading: false,
        error: errorMessage,
        progress: 0
      });
      
      throw error;
    }
  }, []);
  
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setState(prev => ({
        ...prev,
        loading: false,
        progress: 0
      }));
    }
  }, []);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return {
    ...state,
    simulate,
    cancel
  };
}

/**
 * Hook for efficient frontier generation
 */
export function useEfficientFrontier() {
  const [state, setState] = useState<OptimizationState>({
    result: null,
    loading: false,
    error: null
  });
  
  const frontierCacheRef = useRef<Map<string, OptimizationResult>>(new Map());
  
  const generateFrontier = useCallback(async (
    expectedReturns: number[],
    covarianceMatrix: number[][],
    numPoints: number = 50,
    constraints?: OptimizationRequest['constraints']
  ) => {
    const cacheKey = JSON.stringify({
      expectedReturns,
      covarianceMatrix,
      numPoints,
      constraints
    });
    
    if (frontierCacheRef.current.has(cacheKey)) {
      const cachedResult = frontierCacheRef.current.get(cacheKey)!;
      setState({
        result: { ...cachedResult, fromCache: true },
        loading: false,
        error: null
      });
      return cachedResult;
    }
    
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      progress: 0
    }));
    
    try {
      const result = await workerManager.optimizePortfolio({
        method: 'efficient_frontier',
        expectedReturns,
        covarianceMatrix,
        constraints,
        parameters: { numPoints }
      });
      
      frontierCacheRef.current.set(cacheKey, result);
      
      setState({
        result,
        loading: false,
        error: null,
        progress: 100
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Frontier generation failed';
      
      setState({
        result: null,
        loading: false,
        error: errorMessage
      });
      
      throw error;
    }
  }, []);
  
  const clearCache = useCallback(() => {
    frontierCacheRef.current.clear();
  }, []);
  
  return {
    ...state,
    generateFrontier,
    clearCache,
    cacheSize: frontierCacheRef.current.size
  };
}

/**
 * Hook for worker performance monitoring
 */
export function useWorkerStats() {
  const [stats, setStats] = useState<WorkerStats>({
    performance: null,
    status: null,
    lastUpdated: null
  });
  
  const updateStats = useCallback(async () => {
    try {
      const [performance, status] = await Promise.all([
        workerManager.getPerformanceStats(),
        workerManager.getStatus()
      ]);
      
      setStats({
        performance,
        status,
        lastUpdated: new Date()
      });
      
    } catch (error) {
      console.error('Failed to update worker stats:', error);
    }
  }, []);
  
  // Debounced version to prevent excessive updates
  const debouncedUpdateStats = useDebouncedCallback(updateStats, 1000);
  
  // Auto-update stats periodically
  useEffect(() => {
    updateStats(); // Initial load
    
    const interval = setInterval(updateStats, 10000); // Every 10 seconds
    
    return () => clearInterval(interval);
  }, [updateStats]);
  
  return {
    ...stats,
    refresh: debouncedUpdateStats
  };
}

/**
 * Hook for batch optimization operations
 */
export function useBatchOptimization() {
  const [results, setResults] = useState<Map<string, OptimizationResult>>(new Map());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const runBatch = useCallback(async (
    requests: Array<OptimizationRequest & { id: string }>
  ) => {
    setLoading(true);
    setError(null);
    setProgress(0);
    setResults(new Map());
    
    try {
      const batchResults = new Map<string, OptimizationResult>();
      
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        
        try {
          const result = await workerManager.optimizePortfolio(request);
          batchResults.set(request.id, result);
          
          setProgress(((i + 1) / requests.length) * 100);
          setResults(new Map(batchResults));
          
        } catch (requestError) {
          console.error(`Batch optimization failed for ${request.id}:`, requestError);
          
          batchResults.set(request.id, {
            computationTime: 0,
            error: requestError instanceof Error ? requestError.message : 'Unknown error'
          });
        }
      }
      
      setLoading(false);
      return batchResults;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Batch optimization failed';
      setError(errorMessage);
      setLoading(false);
      throw error;
    }
  }, []);
  
  return {
    results,
    loading,
    progress,
    error,
    runBatch
  };
}

/**
 * Hook for optimization comparison
 */
export function useOptimizationComparison() {
  const [comparisons, setComparisons] = useState<{
    [key: string]: OptimizationResult;
  }>({});
  const [loading, setLoading] = useState(false);
  
  const compareOptimizations = useCallback(async (
    expectedReturns: number[],
    covarianceMatrix: number[][],
    methods: Array<OptimizationRequest['method']>,
    constraints?: OptimizationRequest['constraints']
  ) => {
    setLoading(true);
    
    try {
      const promises = methods.map(method =>
        workerManager.optimizePortfolio({
          method,
          expectedReturns,
          covarianceMatrix,
          constraints,
          parameters: method === 'max_sharpe' ? { riskFreeRate: 0.02 } : undefined
        }).then(result => ({ method, result }))
      );
      
      const results = await Promise.all(promises);
      
      const comparisonResults: { [key: string]: OptimizationResult } = {};
      results.forEach(({ method, result }) => {
        comparisonResults[method] = result;
      });
      
      setComparisons(comparisonResults);
      setLoading(false);
      
      return comparisonResults;
      
    } catch (error) {
      setLoading(false);
      throw error;
    }
  }, []);
  
  const clearComparisons = useCallback(() => {
    setComparisons({});
  }, []);
  
  return {
    comparisons,
    loading,
    compareOptimizations,
    clearComparisons
  };
}

/**
 * Hook for real-time optimization updates
 */
export function useRealtimeOptimization(
  expectedReturns: number[],
  covarianceMatrix: number[][],
  method: OptimizationRequest['method'],
  constraints?: OptimizationRequest['constraints'],
  updateInterval: number = 5000
) {
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const optimizeRef = useRef<() => Promise<void>>();
  
  optimizeRef.current = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const optimization = await workerManager.optimizePortfolio({
        method,
        expectedReturns,
        covarianceMatrix,
        constraints
      });
      
      setResult(optimization);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Optimization failed');
    } finally {
      setLoading(false);
    }
  }, [method, expectedReturns, covarianceMatrix, constraints, loading]);
  
  // Set up periodic updates
  useEffect(() => {
    const interval = setInterval(() => {
      optimizeRef.current?.();
    }, updateInterval);
    
    // Initial optimization
    optimizeRef.current?.();
    
    return () => clearInterval(interval);
  }, [updateInterval]);
  
  return {
    result,
    loading,
    error,
    refresh: optimizeRef.current
  };
}