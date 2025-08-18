/**
 * Web Worker manager for portfolio optimization.
 * 
 * Manages worker lifecycle, message passing, and provides
 * a clean interface for optimization computations.
 */

import { performanceMonitor } from '../utils/performance';

// Types for worker communication
export interface OptimizationRequest {
  method: 'markowitz' | 'max_sharpe' | 'min_variance' | 'risk_parity' | 'efficient_frontier';
  expectedReturns: number[];
  covarianceMatrix: number[][];
  constraints?: {
    minWeight?: number;
    maxWeight?: number;
    targetReturn?: number;
    maxVolatility?: number;
  };
  parameters?: {
    targetReturn?: number;
    riskFreeRate?: number;
    numPoints?: number;
  };
}

export interface OptimizationResult {
  weights?: number[];
  expectedReturn?: number;
  volatility?: number;
  sharpeRatio?: number;
  frontierPoints?: Array<{
    expectedReturn: number;
    volatility: number;
    weights: number[];
  }>;
  computationTime: number;
  fromCache?: boolean;
  error?: string;
}

export interface MonteCarloRequest {
  expectedReturns: number[];
  covarianceMatrix: number[][];
  weights: number[];
  timeHorizon: number;
  numSimulations?: number;
}

export interface MonteCarloResult {
  finalValues: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    percentiles: {
      p5: number;
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
    };
  };
  samplePaths: number[][];
  computationTime: number;
  error?: string;
}

export interface WorkerMessage {
  type: string;
  payload: any;
  id?: string;
}

export interface WorkerPerformance {
  computations: number;
  totalTime: number;
  cacheHits: number;
  cacheSize: number;
  avgComputationTime: number;
}

/**
 * Web Worker pool manager
 */
class WorkerPool {
  private workers: Worker[] = [];
  private availableWorkers: Worker[] = [];
  private busyWorkers: Set<Worker> = new Set();
  private pendingTasks: Array<{
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    message: WorkerMessage;
  }> = [];
  private messageHandlers: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();
  
  constructor(private poolSize: number = navigator.hardwareConcurrency || 4) {
    this.initializePool();
  }
  
  private initializePool() {
    for (let i = 0; i < this.poolSize; i++) {
      try {
        const worker = new Worker('/workers/optimizationWorker.js');
        
        worker.onmessage = (event) => {
          this.handleWorkerMessage(worker, event.data);
        };
        
        worker.onerror = (error) => {
          console.error('Worker error:', error);
          this.handleWorkerError(worker, new Error(error.message));
        };
        
        this.workers.push(worker);
        this.availableWorkers.push(worker);
        
        // Initialize worker
        this.sendMessage(worker, { type: 'initialize' }, false);
        
      } catch (error) {
        console.error('Failed to create worker:', error);
      }
    }
  }
  
  private handleWorkerMessage(worker: Worker, message: WorkerMessage) {
    const { type, payload, id } = message;
    
    if (type === 'initialized') {
      console.log('Worker initialized');
      return;
    }
    
    if (id && this.messageHandlers.has(id)) {
      const handler = this.messageHandlers.get(id)!;
      this.messageHandlers.delete(id);
      clearTimeout(handler.timeout);
      
      // Mark worker as available
      this.busyWorkers.delete(worker);
      this.availableWorkers.push(worker);
      
      // Process pending tasks
      this.processPendingTasks();
      
      if (type === 'error') {
        handler.reject(new Error(payload.message));
      } else {
        handler.resolve(payload);
      }
    }
  }
  
  private handleWorkerError(worker: Worker, error: Error) {
    // Find all pending messages for this worker and reject them
    this.messageHandlers.forEach((handler, id) => {
      clearTimeout(handler.timeout);
      handler.reject(error);
    });
    this.messageHandlers.clear();
    
    // Remove worker from busy set
    this.busyWorkers.delete(worker);
    
    // Try to recreate the worker
    this.recreateWorker(worker);
  }
  
  private recreateWorker(oldWorker: Worker) {
    try {
      const index = this.workers.indexOf(oldWorker);
      if (index !== -1) {
        oldWorker.terminate();
        
        const newWorker = new Worker('/workers/optimizationWorker.js');
        newWorker.onmessage = (event) => {
          this.handleWorkerMessage(newWorker, event.data);
        };
        newWorker.onerror = (error) => {
          this.handleWorkerError(newWorker, new Error(error.message));
        };
        
        this.workers[index] = newWorker;
        this.availableWorkers.push(newWorker);
        
        // Initialize worker
        this.sendMessage(newWorker, { type: 'initialize' }, false);
      }
    } catch (error) {
      console.error('Failed to recreate worker:', error);
    }
  }
  
  private processPendingTasks() {
    while (this.pendingTasks.length > 0 && this.availableWorkers.length > 0) {
      const task = this.pendingTasks.shift()!;
      const worker = this.availableWorkers.shift()!;
      
      this.sendMessage(worker, task.message, true)
        .then(task.resolve)
        .catch(task.reject);
    }
  }
  
  private sendMessage(worker: Worker, message: WorkerMessage, track: boolean = true): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!track) {
        worker.postMessage(message);
        resolve(null);
        return;
      }
      
      const id = this.generateMessageId();
      const messageWithId = { ...message, id };
      
      // Set up timeout
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(id);
        this.busyWorkers.delete(worker);
        this.availableWorkers.push(worker);
        reject(new Error('Worker operation timed out'));
      }, 30000); // 30 second timeout
      
      this.messageHandlers.set(id, { resolve, reject, timeout });
      this.busyWorkers.add(worker);
      
      // Remove from available workers
      const index = this.availableWorkers.indexOf(worker);
      if (index !== -1) {
        this.availableWorkers.splice(index, 1);
      }
      
      worker.postMessage(messageWithId);
    });
  }
  
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  async execute(message: WorkerMessage): Promise<any> {
    if (this.availableWorkers.length > 0) {
      const worker = this.availableWorkers.shift()!;
      return this.sendMessage(worker, message);
    } else {
      // Queue the task
      return new Promise((resolve, reject) => {
        this.pendingTasks.push({ resolve, reject, message });
      });
    }
  }
  
  async getPerformanceStats(): Promise<WorkerPerformance> {
    if (this.availableWorkers.length > 0) {
      return this.execute({ type: 'get_performance', payload: {} });
    } else {
      throw new Error('No workers available for performance query');
    }
  }
  
  async clearCache(): Promise<void> {
    // Clear cache on all workers
    const promises = this.workers.map(worker => 
      this.sendMessage(worker, { type: 'clear_cache', payload: {} })
    );
    
    await Promise.all(promises);
  }
  
  terminate() {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.availableWorkers = [];
    this.busyWorkers.clear();
    this.messageHandlers.clear();
    this.pendingTasks = [];
  }
  
  getStatus() {
    return {
      totalWorkers: this.workers.length,
      availableWorkers: this.availableWorkers.length,
      busyWorkers: this.busyWorkers.size,
      pendingTasks: this.pendingTasks.length
    };
  }
}

/**
 * Main WorkerManager class
 */
export class WorkerManager {
  private static instance: WorkerManager;
  private workerPool: WorkerPool;
  private isInitialized: boolean = false;
  
  private constructor() {
    this.workerPool = new WorkerPool();
  }
  
  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }
  
  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      // Wait a bit for workers to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      this.isInitialized = true;
      console.log('WorkerManager initialized with', this.workerPool.getStatus().totalWorkers, 'workers');
    } catch (error) {
      console.error('Failed to initialize WorkerManager:', error);
      throw error;
    }
  }
  
  /**
   * Optimize portfolio using specified method
   */
  async optimizePortfolio(request: OptimizationRequest): Promise<OptimizationResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      const result = await this.workerPool.execute({
        type: 'optimize',
        payload: request
      });
      
      const totalTime = performance.now() - startTime;
      
      // Record performance metrics
      performanceMonitor.recordMetric('portfolio-optimization', totalTime);
      performanceMonitor.recordMetric(`optimization-${request.method}`, totalTime);
      
      return {
        ...result,
        totalComputationTime: totalTime
      };
      
    } catch (error) {
      performanceMonitor.recordMetric('optimization-error', performance.now() - startTime);
      throw new Error(`Portfolio optimization failed: ${error.message}`);
    }
  }
  
  /**
   * Run Monte Carlo simulation
   */
  async runMonteCarloSimulation(request: MonteCarloRequest): Promise<MonteCarloResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      const result = await this.workerPool.execute({
        type: 'monte_carlo',
        payload: request
      });
      
      const totalTime = performance.now() - startTime;
      performanceMonitor.recordMetric('monte-carlo-simulation', totalTime);
      
      return result;
      
    } catch (error) {
      performanceMonitor.recordMetric('monte-carlo-error', performance.now() - startTime);
      throw new Error(`Monte Carlo simulation failed: ${error.message}`);
    }
  }
  
  /**
   * Calculate portfolio metrics
   */
  async calculatePortfolioMetrics(weights: number[], returnsData: number[][]): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    const startTime = performance.now();
    
    try {
      const result = await this.workerPool.execute({
        type: 'calculate_metrics',
        payload: {
          portfolioWeights: weights,
          returnsData
        }
      });
      
      performanceMonitor.recordMetric('portfolio-metrics', performance.now() - startTime);
      
      return result;
      
    } catch (error) {
      throw new Error(`Portfolio metrics calculation failed: ${error.message}`);
    }
  }
  
  /**
   * Get worker performance statistics
   */
  async getPerformanceStats(): Promise<WorkerPerformance> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    return this.workerPool.getPerformanceStats();
  }
  
  /**
   * Clear optimization cache
   */
  async clearCache(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    
    await this.workerPool.clearCache();
  }
  
  /**
   * Get worker pool status
   */
  getStatus() {
    return {
      ...this.workerPool.getStatus(),
      isInitialized: this.isInitialized
    };
  }
  
  /**
   * Terminate all workers
   */
  terminate() {
    this.workerPool.terminate();
    this.isInitialized = false;
  }
}

/**
 * Convenience functions for common operations
 */
export const workerManager = WorkerManager.getInstance();

export async function optimizeMaxSharpe(
  expectedReturns: number[],
  covarianceMatrix: number[][],
  riskFreeRate: number = 0.02,
  constraints?: OptimizationRequest['constraints']
): Promise<OptimizationResult> {
  return workerManager.optimizePortfolio({
    method: 'max_sharpe',
    expectedReturns,
    covarianceMatrix,
    constraints,
    parameters: { riskFreeRate }
  });
}

export async function optimizeMinVariance(
  expectedReturns: number[],
  covarianceMatrix: number[][],
  constraints?: OptimizationRequest['constraints']
): Promise<OptimizationResult> {
  return workerManager.optimizePortfolio({
    method: 'min_variance',
    expectedReturns,
    covarianceMatrix,
    constraints
  });
}

export async function optimizeRiskParity(
  expectedReturns: number[],
  covarianceMatrix: number[][],
  constraints?: OptimizationRequest['constraints']
): Promise<OptimizationResult> {
  return workerManager.optimizePortfolio({
    method: 'risk_parity',
    expectedReturns,
    covarianceMatrix,
    constraints
  });
}

export async function generateEfficientFrontier(
  expectedReturns: number[],
  covarianceMatrix: number[][],
  numPoints: number = 50,
  constraints?: OptimizationRequest['constraints']
): Promise<OptimizationResult> {
  return workerManager.optimizePortfolio({
    method: 'efficient_frontier',
    expectedReturns,
    covarianceMatrix,
    constraints,
    parameters: { numPoints }
  });
}

export async function runPortfolioSimulation(
  expectedReturns: number[],
  covarianceMatrix: number[][],
  weights: number[],
  timeHorizonDays: number,
  numSimulations: number = 10000
): Promise<MonteCarloResult> {
  return workerManager.runMonteCarloSimulation({
    expectedReturns,
    covarianceMatrix,
    weights,
    timeHorizon: timeHorizonDays,
    numSimulations
  });
}

// Initialize the worker manager when the module is loaded
if (typeof window !== 'undefined') {
  workerManager.initialize().catch(error => {
    console.error('Failed to initialize WorkerManager:', error);
  });
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    workerManager.terminate();
  });
}