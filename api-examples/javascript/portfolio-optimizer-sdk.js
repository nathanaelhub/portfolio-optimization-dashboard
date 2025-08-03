/**
 * Portfolio Optimizer JavaScript SDK
 * 
 * Modern ES6+ client library for the Portfolio Optimization API.
 * Supports both Node.js and browser environments with TypeScript definitions.
 * 
 * Installation:
 *   npm install @portfolio-optimizer/sdk
 * 
 * Usage:
 *   import { PortfolioOptimizer } from '@portfolio-optimizer/sdk';
 *   
 *   const client = new PortfolioOptimizer({ apiKey: 'your_api_key' });
 *   const result = await client.optimizePortfolio({
 *     symbols: ['AAPL', 'MSFT', 'GOOGL'],
 *     method: 'markowitz'
 *   });
 */

// Types and interfaces (TypeScript definitions)
/**
 * @typedef {Object} OptimizationConstraints
 * @property {number} [maxWeight] - Maximum weight per asset
 * @property {number} [minWeight] - Minimum weight per asset
 * @property {Object.<string, number>} [sectorLimits] - Sector weight limits
 * @property {number} [liquidityThreshold] - Minimum liquidity requirement
 * @property {number} [esgScoreMin] - Minimum ESG score
 */

/**
 * @typedef {Object} OptimizationRequest
 * @property {string[]} symbols - Asset symbols to optimize
 * @property {string} method - Optimization method
 * @property {OptimizationConstraints} [constraints] - Portfolio constraints
 * @property {number} [riskTolerance] - Risk tolerance (0-1)
 * @property {number} [timeHorizon] - Investment time horizon in days
 * @property {string} [rebalancingFrequency] - Rebalancing frequency
 */

/**
 * @typedef {Object} OptimizationResult
 * @property {Object.<string, number>} weights - Optimal portfolio weights
 * @property {number} expectedReturn - Expected annual return
 * @property {number} volatility - Portfolio volatility
 * @property {number} sharpeRatio - Sharpe ratio
 * @property {number} executionTime - Optimization execution time
 * @property {string} methodUsed - Optimization method used
 * @property {Object} [riskMetrics] - Additional risk metrics
 * @property {Array} [efficientFrontier] - Efficient frontier points
 */

/**
 * Portfolio Optimizer API Client Configuration
 * @typedef {Object} ClientConfig
 * @property {string} apiKey - Your API key
 * @property {string} [baseUrl] - API base URL
 * @property {number} [timeout] - Request timeout in milliseconds
 * @property {number} [maxRetries] - Maximum number of retries
 * @property {number} [retryDelay] - Delay between retries in milliseconds
 */

// Custom error classes
class PortfolioOptimizerError extends Error {
  constructor(message, code = null, details = null) {
    super(message);
    this.name = 'PortfolioOptimizerError';
    this.code = code;
    this.details = details;
  }
}

class AuthenticationError extends PortfolioOptimizerError {
  constructor(message = 'Authentication failed') {
    super(message, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

class RateLimitError extends PortfolioOptimizerError {
  constructor(message = 'Rate limit exceeded', retryAfter = null) {
    super(message, 'RATE_LIMIT');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

class ValidationError extends PortfolioOptimizerError {
  constructor(message = 'Validation error', errors = null) {
    super(message, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Portfolio Optimizer API Client
 * 
 * A comprehensive JavaScript client for the Portfolio Optimization API with
 * automatic retries, rate limiting, and comprehensive error handling.
 */
class PortfolioOptimizer {
  /**
   * Create a new Portfolio Optimizer client.
   * 
   * @param {ClientConfig} config - Client configuration
   */
  constructor(config) {
    if (!config.apiKey) {
      throw new Error('API key is required');
    }
    
    this.apiKey = config.apiKey;
    this.baseUrl = (config.baseUrl || 'https://api.portfolio-optimizer.com/v1').replace(/\/$/, '');
    this.timeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    
    // Setup default headers
    this.defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'PortfolioOptimizer-JS-SDK/1.0.0'
    };
  }

  /**
   * Make HTTP request with retry logic and error handling.
   * 
   * @private
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} [data] - Request body data
   * @param {Object} [params] - Query parameters
   * @returns {Promise<Object>} Response data
   */
  async _makeRequest(method, endpoint, data = null, params = null) {
    const url = new URL(`${this.baseUrl}/${endpoint.replace(/^\//, '')}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          url.searchParams.append(key, value.toString());
        }
      });
    }

    const requestConfig = {
      method,
      headers: { ...this.defaultHeaders },
      signal: AbortSignal.timeout(this.timeout)
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      requestConfig.body = JSON.stringify(data);
    }

    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), requestConfig);
        
        // Handle different response codes
        if (response.ok) {
          return await response.json();
        }
        
        const errorData = await response.json().catch(() => ({}));
        
        switch (response.status) {
          case 401:
            throw new AuthenticationError(errorData.message || 'Invalid API key');
          
          case 429:
            const retryAfter = parseInt(response.headers.get('Retry-After')) || this.retryDelay;
            if (attempt < this.maxRetries) {
              await this._sleep(retryAfter);
              continue;
            }
            throw new RateLimitError(errorData.message, retryAfter);
          
          case 400:
            throw new ValidationError(
              errorData.message || 'Validation error',
              errorData.errors
            );
          
          default:
            throw new PortfolioOptimizerError(
              errorData.message || `HTTP ${response.status}`,
              response.status,
              errorData
            );
        }
        
      } catch (error) {
        lastError = error;
        
        if (error instanceof AuthenticationError || 
            error instanceof ValidationError) {
          throw error;
        }
        
        if (attempt < this.maxRetries) {
          await this._sleep(this.retryDelay * Math.pow(2, attempt));
          continue;
        }
      }
    }
    
    throw lastError || new PortfolioOptimizerError('Max retries exceeded');
  }

  /**
   * Sleep for specified milliseconds.
   * @private
   * @param {number} ms - Milliseconds to sleep
   */
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Optimize a portfolio using the specified method and constraints.
   * 
   * @param {OptimizationRequest} request - Optimization request parameters
   * @returns {Promise<OptimizationResult>} Optimization results
   * 
   * @example
   * const result = await client.optimizePortfolio({
   *   symbols: ['AAPL', 'MSFT', 'GOOGL', 'BND'],
   *   method: 'markowitz',
   *   constraints: {
   *     maxWeight: 0.4,
   *     minWeight: 0.05
   *   }
   * });
   * 
   * console.log(`Expected return: ${(result.expectedReturn * 100).toFixed(2)}%`);
   * console.log(`Sharpe ratio: ${result.sharpeRatio.toFixed(2)}`);
   */
  async optimizePortfolio(request) {
    const startTime = Date.now();
    
    const response = await this._makeRequest('POST', '/optimize', request);
    
    return {
      ...response,
      executionTime: (Date.now() - startTime) / 1000
    };
  }

  /**
   * Generate efficient frontier for given assets.
   * 
   * @param {string[]} symbols - Asset symbols
   * @param {number} [numPoints=100] - Number of points on the frontier
   * @param {string} [method='markowitz'] - Optimization method
   * @returns {Promise<Array>} Efficient frontier points
   */
  async getEfficientFrontier(symbols, numPoints = 100, method = 'markowitz') {
    const data = {
      symbols,
      numPoints,
      method
    };
    
    const response = await this._makeRequest('POST', '/efficient-frontier', data);
    return response.frontierPoints;
  }

  /**
   * Calculate comprehensive risk metrics for a portfolio.
   * 
   * @param {Object.<string, number>} weights - Portfolio weights
   * @param {string[]} [symbols] - Asset symbols (optional if included in weights)
   * @returns {Promise<Object>} Risk metrics
   */
  async calculateRiskMetrics(weights, symbols = null) {
    const data = { weights };
    if (symbols) {
      data.symbols = symbols;
    }
    
    const response = await this._makeRequest('POST', '/risk-metrics', data);
    return response.riskMetrics;
  }

  /**
   * Backtest a portfolio over a specified period.
   * 
   * @param {Object.<string, number>} weights - Portfolio weights
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {string} [rebalancingFrequency='monthly'] - Rebalancing frequency
   * @returns {Promise<Object>} Backtesting results
   */
  async backtestPortfolio(weights, startDate, endDate, rebalancingFrequency = 'monthly') {
    const data = {
      weights,
      startDate,
      endDate,
      rebalancingFrequency
    };
    
    const response = await this._makeRequest('POST', '/backtest', data);
    return response.backtestResults;
  }

  /**
   * Retrieve market data for specified symbols.
   * 
   * @param {string[]} symbols - Asset symbols
   * @param {string} [startDate] - Start date (YYYY-MM-DD)
   * @param {string} [endDate] - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Market data
   */
  async getMarketData(symbols, startDate = null, endDate = null) {
    const params = { symbols: symbols.join(',') };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response = await this._makeRequest('GET', '/market-data', null, params);
    return response.marketData;
  }

  /**
   * Get machine learning predictions for assets.
   * 
   * @param {string[]} symbols - Asset symbols
   * @param {number} [predictionHorizon=30] - Prediction horizon in days
   * @returns {Promise<Object>} ML predictions with confidence intervals
   */
  async getMlPredictions(symbols, predictionHorizon = 30) {
    const data = {
      symbols,
      predictionHorizon
    };
    
    const response = await this._makeRequest('POST', '/ml-predictions', data);
    return response.predictions;
  }

  /**
   * Get real-time portfolio updates via WebSocket.
   * 
   * @param {string[]} symbols - Symbols to monitor
   * @param {Function} onUpdate - Callback for updates
   * @param {Function} [onError] - Error callback
   * @returns {WebSocket} WebSocket connection
   */
  subscribeToRealTimeUpdates(symbols, onUpdate, onError = console.error) {
    const wsUrl = this.baseUrl.replace('https://', 'wss://').replace('http://', 'ws://');
    const ws = new WebSocket(`${wsUrl}/ws?symbols=${symbols.join(',')}&token=${this.apiKey}`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onUpdate(data);
      } catch (error) {
        onError(error);
      }
    };
    
    ws.onerror = onError;
    
    return ws;
  }

  /**
   * Batch multiple optimization requests.
   * 
   * @param {OptimizationRequest[]} requests - Array of optimization requests
   * @returns {Promise<OptimizationResult[]>} Array of optimization results
   */
  async batchOptimize(requests) {
    const data = { requests };
    const response = await this._makeRequest('POST', '/batch-optimize', data);
    return response.results;
  }
}

// Convenience functions for common use cases

/**
 * Quick portfolio optimization with minimal setup.
 * 
 * @param {string[]} symbols - Asset symbols to optimize
 * @param {string} apiKey - Your API key
 * @param {string} [method='markowitz'] - Optimization method
 * @returns {Promise<OptimizationResult>} Optimization results
 */
async function quickOptimize(symbols, apiKey, method = 'markowitz') {
  const client = new PortfolioOptimizer({ apiKey });
  return await client.optimizePortfolio({ symbols, method });
}

/**
 * Create a balanced portfolio with equal weights.
 * 
 * @param {string[]} symbols - Asset symbols
 * @returns {Object.<string, number>} Equal-weighted portfolio
 */
function createEqualWeightPortfolio(symbols) {
  const weight = 1 / symbols.length;
  return symbols.reduce((portfolio, symbol) => {
    portfolio[symbol] = weight;
    return portfolio;
  }, {});
}

// Example usage and demonstrations
async function exampleUsage() {
  try {
    // Initialize client
    const client = new PortfolioOptimizer({
      apiKey: 'your_api_key_here',
      timeout: 30000,
      maxRetries: 3
    });

    // Define portfolio symbols
    const symbols = ['AAPL', 'MSFT', 'GOOGL', 'BND', 'VTI'];

    // Optimize portfolio with constraints
    const optimizationResult = await client.optimizePortfolio({
      symbols,
      method: 'markowitz',
      constraints: {
        maxWeight: 0.4,
        minWeight: 0.05,
        sectorLimits: {
          'technology': 0.6
        }
      },
      riskTolerance: 0.5
    });

    console.log('Optimization Results:');
    console.log(`Expected Return: ${(optimizationResult.expectedReturn * 100).toFixed(2)}%`);
    console.log(`Volatility: ${(optimizationResult.volatility * 100).toFixed(2)}%`);
    console.log(`Sharpe Ratio: ${optimizationResult.sharpeRatio.toFixed(2)}`);
    console.log(`Execution Time: ${optimizationResult.executionTime.toFixed(2)}s`);

    console.log('\nOptimal Weights:');
    Object.entries(optimizationResult.weights).forEach(([symbol, weight]) => {
      console.log(`  ${symbol}: ${(weight * 100).toFixed(2)}%`);
    });

    // Generate efficient frontier
    const frontier = await client.getEfficientFrontier(symbols, 50);
    console.log(`\nEfficient Frontier: ${frontier.length} points generated`);

    // Calculate risk metrics
    const riskMetrics = await client.calculateRiskMetrics(optimizationResult.weights);
    console.log(`\nValue at Risk (95%): ${(riskMetrics.var95 * 100).toFixed(2)}%`);

    // Get ML predictions
    const predictions = await client.getMlPredictions(symbols);
    console.log('\nML Predictions:');
    Object.entries(predictions).forEach(([symbol, prediction]) => {
      console.log(`  ${symbol}: ${(prediction.expectedReturn * 100).toFixed(2)}% (confidence: ${(prediction.confidence * 100).toFixed(1)}%)`);
    });

  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.error('Authentication failed. Please check your API key.');
    } else if (error instanceof RateLimitError) {
      console.error(`Rate limit exceeded. Retry after ${error.retryAfter}s`);
    } else if (error instanceof ValidationError) {
      console.error('Validation error:', error.errors);
    } else {
      console.error('Optimization failed:', error.message);
    }
  }
}

// Export for different module systems
if (typeof module !== 'undefined' && module.exports) {
  // Node.js
  module.exports = {
    PortfolioOptimizer,
    PortfolioOptimizerError,
    AuthenticationError,
    RateLimitError,
    ValidationError,
    quickOptimize,
    createEqualWeightPortfolio
  };
} else if (typeof window !== 'undefined') {
  // Browser
  window.PortfolioOptimizer = PortfolioOptimizer;
  window.quickOptimize = quickOptimize;
}

// ES6 module export (for bundlers)
export {
  PortfolioOptimizer,
  PortfolioOptimizerError,
  AuthenticationError,
  RateLimitError,
  ValidationError,
  quickOptimize,
  createEqualWeightPortfolio
};

export default PortfolioOptimizer;