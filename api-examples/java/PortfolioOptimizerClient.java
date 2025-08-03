/**
 * Portfolio Optimizer Java SDK
 * 
 * Enterprise-grade Java client library for the Portfolio Optimization API.
 * Includes Spring Boot integration, comprehensive error handling, and async support.
 * 
 * Maven dependency:
 * <dependency>
 *     <groupId>com.portfolio-optimizer</groupId>
 *     <artifactId>portfolio-optimizer-sdk</artifactId>
 *     <version>1.0.0</version>
 * </dependency>
 * 
 * Usage:
 * PortfolioOptimizerClient client = new PortfolioOptimizerClient("your_api_key");
 * OptimizationResult result = client.optimizePortfolio(
 *     OptimizationRequest.builder()
 *         .symbols(Arrays.asList("AAPL", "MSFT", "GOOGL"))
 *         .method("markowitz")
 *         .build()
 * );
 */

package com.portfoliooptimizer.sdk;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionException;
import java.util.logging.Logger;

/**
 * Custom exceptions for Portfolio Optimizer SDK
 */
class PortfolioOptimizerException extends Exception {
    private final String code;
    private final Object details;

    public PortfolioOptimizerException(String message, String code, Object details) {
        super(message);
        this.code = code;
        this.details = details;
    }

    public String getCode() { return code; }
    public Object getDetails() { return details; }
}

class AuthenticationException extends PortfolioOptimizerException {
    public AuthenticationException(String message) {
        super(message, "AUTH_ERROR", null);
    }
}

class RateLimitException extends PortfolioOptimizerException {
    private final int retryAfter;

    public RateLimitException(String message, int retryAfter) {
        super(message, "RATE_LIMIT", null);
        this.retryAfter = retryAfter;
    }

    public int getRetryAfter() { return retryAfter; }
}

class ValidationException extends PortfolioOptimizerException {
    public ValidationException(String message, Object errors) {
        super(message, "VALIDATION_ERROR", errors);
    }
}

/**
 * Data classes for API requests and responses
 */
class OptimizationConstraints {
    @JsonProperty("max_weight")
    private Double maxWeight;
    
    @JsonProperty("min_weight")
    private Double minWeight;
    
    @JsonProperty("sector_limits")
    private Map<String, Double> sectorLimits;
    
    @JsonProperty("liquidity_threshold")
    private Double liquidityThreshold;
    
    @JsonProperty("esg_score_min")
    private Double esgScoreMin;

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final OptimizationConstraints constraints = new OptimizationConstraints();

        public Builder maxWeight(Double maxWeight) {
            constraints.maxWeight = maxWeight;
            return this;
        }

        public Builder minWeight(Double minWeight) {
            constraints.minWeight = minWeight;
            return this;
        }

        public Builder sectorLimits(Map<String, Double> sectorLimits) {
            constraints.sectorLimits = sectorLimits;
            return this;
        }

        public Builder liquidityThreshold(Double liquidityThreshold) {
            constraints.liquidityThreshold = liquidityThreshold;
            return this;
        }

        public Builder esgScoreMin(Double esgScoreMin) {
            constraints.esgScoreMin = esgScoreMin;
            return this;
        }

        public OptimizationConstraints build() {
            return constraints;
        }
    }

    // Getters and setters
    public Double getMaxWeight() { return maxWeight; }
    public void setMaxWeight(Double maxWeight) { this.maxWeight = maxWeight; }
    
    public Double getMinWeight() { return minWeight; }
    public void setMinWeight(Double minWeight) { this.minWeight = minWeight; }
    
    public Map<String, Double> getSectorLimits() { return sectorLimits; }
    public void setSectorLimits(Map<String, Double> sectorLimits) { this.sectorLimits = sectorLimits; }
    
    public Double getLiquidityThreshold() { return liquidityThreshold; }
    public void setLiquidityThreshold(Double liquidityThreshold) { this.liquidityThreshold = liquidityThreshold; }
    
    public Double getEsgScoreMin() { return esgScoreMin; }
    public void setEsgScoreMin(Double esgScoreMin) { this.esgScoreMin = esgScoreMin; }
}

class OptimizationRequest {
    private List<String> symbols;
    private String method;
    private OptimizationConstraints constraints;
    
    @JsonProperty("risk_tolerance")
    private Double riskTolerance;
    
    @JsonProperty("time_horizon")
    private Integer timeHorizon;
    
    @JsonProperty("rebalancing_frequency")
    private String rebalancingFrequency;

    // Builder pattern
    public static Builder builder() {
        return new Builder();
    }

    public static class Builder {
        private final OptimizationRequest request = new OptimizationRequest();

        public Builder symbols(List<String> symbols) {
            request.symbols = symbols;
            return this;
        }

        public Builder method(String method) {
            request.method = method;
            return this;
        }

        public Builder constraints(OptimizationConstraints constraints) {
            request.constraints = constraints;
            return this;
        }

        public Builder riskTolerance(Double riskTolerance) {
            request.riskTolerance = riskTolerance;
            return this;
        }

        public Builder timeHorizon(Integer timeHorizon) {
            request.timeHorizon = timeHorizon;
            return this;
        }

        public Builder rebalancingFrequency(String rebalancingFrequency) {
            request.rebalancingFrequency = rebalancingFrequency;
            return this;
        }

        public OptimizationRequest build() {
            return request;
        }
    }

    // Getters and setters
    public List<String> getSymbols() { return symbols; }
    public void setSymbols(List<String> symbols) { this.symbols = symbols; }
    
    public String getMethod() { return method; }
    public void setMethod(String method) { this.method = method; }
    
    public OptimizationConstraints getConstraints() { return constraints; }
    public void setConstraints(OptimizationConstraints constraints) { this.constraints = constraints; }
    
    public Double getRiskTolerance() { return riskTolerance; }
    public void setRiskTolerance(Double riskTolerance) { this.riskTolerance = riskTolerance; }
    
    public Integer getTimeHorizon() { return timeHorizon; }
    public void setTimeHorizon(Integer timeHorizon) { this.timeHorizon = timeHorizon; }
    
    public String getRebalancingFrequency() { return rebalancingFrequency; }
    public void setRebalancingFrequency(String rebalancingFrequency) { this.rebalancingFrequency = rebalancingFrequency; }
}

class OptimizationResult {
    private Map<String, Double> weights;
    
    @JsonProperty("expected_return")
    private Double expectedReturn;
    
    private Double volatility;
    
    @JsonProperty("sharpe_ratio")
    private Double sharpeRatio;
    
    @JsonProperty("execution_time")
    private Double executionTime;
    
    @JsonProperty("method_used")
    private String methodUsed;
    
    @JsonProperty("risk_metrics")
    private Map<String, Object> riskMetrics;
    
    @JsonProperty("efficient_frontier")
    private List<Map<String, Double>> efficientFrontier;

    // Getters and setters
    public Map<String, Double> getWeights() { return weights; }
    public void setWeights(Map<String, Double> weights) { this.weights = weights; }
    
    public Double getExpectedReturn() { return expectedReturn; }
    public void setExpectedReturn(Double expectedReturn) { this.expectedReturn = expectedReturn; }
    
    public Double getVolatility() { return volatility; }
    public void setVolatility(Double volatility) { this.volatility = volatility; }
    
    public Double getSharpeRatio() { return sharpeRatio; }
    public void setSharpeRatio(Double sharpeRatio) { this.sharpeRatio = sharpeRatio; }
    
    public Double getExecutionTime() { return executionTime; }
    public void setExecutionTime(Double executionTime) { this.executionTime = executionTime; }
    
    public String getMethodUsed() { return methodUsed; }
    public void setMethodUsed(String methodUsed) { this.methodUsed = methodUsed; }
    
    public Map<String, Object> getRiskMetrics() { return riskMetrics; }
    public void setRiskMetrics(Map<String, Object> riskMetrics) { this.riskMetrics = riskMetrics; }
    
    public List<Map<String, Double>> getEfficientFrontier() { return efficientFrontier; }
    public void setEfficientFrontier(List<Map<String, Double>> efficientFrontier) { this.efficientFrontier = efficientFrontier; }
}

/**
 * Portfolio Optimizer API Client
 * 
 * Enterprise-grade Java client for the Portfolio Optimization API with
 * comprehensive error handling, retry logic, and async support.
 */
public class PortfolioOptimizerClient {
    private static final Logger logger = Logger.getLogger(PortfolioOptimizerClient.class.getName());
    
    private final String apiKey;
    private final String baseUrl;
    private final Duration timeout;
    private final int maxRetries;
    private final Duration retryDelay;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    /**
     * Create a new Portfolio Optimizer client with default settings.
     * 
     * @param apiKey Your API key
     */
    public PortfolioOptimizerClient(String apiKey) {
        this(apiKey, "https://api.portfolio-optimizer.com/v1", Duration.ofSeconds(30), 3, Duration.ofSeconds(1));
    }

    /**
     * Create a new Portfolio Optimizer client with custom settings.
     * 
     * @param apiKey Your API key
     * @param baseUrl API base URL
     * @param timeout Request timeout
     * @param maxRetries Maximum number of retries
     * @param retryDelay Delay between retries
     */
    public PortfolioOptimizerClient(String apiKey, String baseUrl, Duration timeout, int maxRetries, Duration retryDelay) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new IllegalArgumentException("API key is required");
        }
        
        this.apiKey = apiKey;
        this.baseUrl = baseUrl.replaceAll("/$", "");
        this.timeout = timeout;
        this.maxRetries = maxRetries;
        this.retryDelay = retryDelay;
        
        // Configure HTTP client
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(timeout)
                .build();
        
        // Configure JSON mapper
        this.objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
        objectMapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);
        objectMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
    }

    /**
     * Make HTTP request with retry logic and error handling.
     * 
     * @param method HTTP method
     * @param endpoint API endpoint
     * @param requestBody Request body (can be null)
     * @param responseClass Response class type
     * @return Response object
     * @throws PortfolioOptimizerException On API errors
     */
    private <T> T makeRequest(String method, String endpoint, Object requestBody, Class<T> responseClass) 
            throws PortfolioOptimizerException {
        
        String url = baseUrl + "/" + endpoint.replaceAll("^/", "");
        
        Exception lastException = null;
        
        for (int attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                HttpRequest.Builder requestBuilder = HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .timeout(timeout)
                        .header("Authorization", "Bearer " + apiKey)
                        .header("Content-Type", "application/json")
                        .header("User-Agent", "PortfolioOptimizer-Java-SDK/1.0.0");

                // Add request body for POST/PUT requests
                if (requestBody != null) {
                    String jsonBody = objectMapper.writeValueAsString(requestBody);
                    requestBuilder.method(method, HttpRequest.BodyPublishers.ofString(jsonBody));
                } else {
                    requestBuilder.method(method, HttpRequest.BodyPublishers.noBody());
                }

                HttpRequest request = requestBuilder.build();
                HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

                // Handle response
                if (response.statusCode() == 200) {
                    return objectMapper.readValue(response.body(), responseClass);
                }
                
                // Parse error response
                Map<String, Object> errorResponse = Collections.emptyMap();
                try {
                    errorResponse = objectMapper.readValue(response.body(), Map.class);
                } catch (JsonProcessingException ignored) {}
                
                String errorMessage = (String) errorResponse.getOrDefault("message", "Unknown error");
                
                switch (response.statusCode()) {
                    case 401:
                        throw new AuthenticationException(errorMessage);
                    
                    case 429:
                        int retryAfter = Integer.parseInt(response.headers().firstValue("Retry-After").orElse("1"));
                        if (attempt < maxRetries) {
                            Thread.sleep(retryAfter * 1000);
                            continue;
                        }
                        throw new RateLimitException(errorMessage, retryAfter);
                    
                    case 400:
                        throw new ValidationException(errorMessage, errorResponse.get("errors"));
                    
                    default:
                        throw new PortfolioOptimizerException(errorMessage, String.valueOf(response.statusCode()), errorResponse);
                }
                
            } catch (PortfolioOptimizerException e) {
                throw e;
            } catch (Exception e) {
                lastException = e;
                if (attempt < maxRetries) {
                    try {
                        Thread.sleep(retryDelay.toMillis() * (long) Math.pow(2, attempt));
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        throw new PortfolioOptimizerException("Request interrupted", "INTERRUPTED", null);
                    }
                    continue;
                }
            }
        }
        
        throw new PortfolioOptimizerException("Max retries exceeded", "MAX_RETRIES", lastException);
    }

    /**
     * Optimize a portfolio using the specified method and constraints.
     * 
     * @param request Optimization request parameters
     * @return Optimization results
     * @throws PortfolioOptimizerException On API errors
     * 
     * @example
     * OptimizationResult result = client.optimizePortfolio(
     *     OptimizationRequest.builder()
     *         .symbols(Arrays.asList("AAPL", "MSFT", "GOOGL", "BND"))
     *         .method("markowitz")
     *         .constraints(OptimizationConstraints.builder()
     *             .maxWeight(0.4)
     *             .minWeight(0.05)
     *             .build())
     *         .build()
     * );
     * 
     * System.out.printf("Expected return: %.2f%%\n", result.getExpectedReturn() * 100);
     * System.out.printf("Sharpe ratio: %.2f\n", result.getSharpeRatio());
     */
    public OptimizationResult optimizePortfolio(OptimizationRequest request) throws PortfolioOptimizerException {
        long startTime = System.currentTimeMillis();
        OptimizationResult result = makeRequest("POST", "/optimize", request, OptimizationResult.class);
        result.setExecutionTime((System.currentTimeMillis() - startTime) / 1000.0);
        return result;
    }

    /**
     * Optimize a portfolio asynchronously.
     * 
     * @param request Optimization request parameters
     * @return CompletableFuture with optimization results
     */
    public CompletableFuture<OptimizationResult> optimizePortfolioAsync(OptimizationRequest request) {
        return CompletableFuture.supplyAsync(() -> {
            try {
                return optimizePortfolio(request);
            } catch (PortfolioOptimizerException e) {
                throw new CompletionException(e);
            }
        });
    }

    /**
     * Generate efficient frontier for given assets.
     * 
     * @param symbols Asset symbols
     * @param numPoints Number of points on the frontier
     * @param method Optimization method
     * @return Efficient frontier points
     * @throws PortfolioOptimizerException On API errors
     */
    public List<Map<String, Double>> getEfficientFrontier(List<String> symbols, int numPoints, String method) 
            throws PortfolioOptimizerException {
        
        Map<String, Object> request = Map.of(
            "symbols", symbols,
            "num_points", numPoints,
            "method", method
        );
        
        Map<String, Object> response = makeRequest("POST", "/efficient-frontier", request, Map.class);
        return (List<Map<String, Double>>) response.get("frontier_points");
    }

    /**
     * Calculate comprehensive risk metrics for a portfolio.
     * 
     * @param weights Portfolio weights
     * @param symbols Asset symbols (optional)
     * @return Risk metrics
     * @throws PortfolioOptimizerException On API errors
     */
    public Map<String, Object> calculateRiskMetrics(Map<String, Double> weights, List<String> symbols) 
            throws PortfolioOptimizerException {
        
        Map<String, Object> request = new HashMap<>();
        request.put("weights", weights);
        if (symbols != null) {
            request.put("symbols", symbols);
        }
        
        Map<String, Object> response = makeRequest("POST", "/risk-metrics", request, Map.class);
        return (Map<String, Object>) response.get("risk_metrics");
    }

    /**
     * Backtest a portfolio over a specified period.
     * 
     * @param weights Portfolio weights
     * @param startDate Start date
     * @param endDate End date
     * @param rebalancingFrequency Rebalancing frequency
     * @return Backtesting results
     * @throws PortfolioOptimizerException On API errors
     */
    public Map<String, Object> backtestPortfolio(Map<String, Double> weights, LocalDate startDate, 
            LocalDate endDate, String rebalancingFrequency) throws PortfolioOptimizerException {
        
        Map<String, Object> request = Map.of(
            "weights", weights,
            "start_date", startDate.toString(),
            "end_date", endDate.toString(),
            "rebalancing_frequency", rebalancingFrequency
        );
        
        Map<String, Object> response = makeRequest("POST", "/backtest", request, Map.class);
        return (Map<String, Object>) response.get("backtest_results");
    }

    /**
     * Retrieve market data for specified symbols.
     * 
     * @param symbols Asset symbols
     * @param startDate Start date (optional)
     * @param endDate End date (optional)
     * @return Market data
     * @throws PortfolioOptimizerException On API errors
     */
    public Map<String, Object> getMarketData(List<String> symbols, LocalDate startDate, LocalDate endDate) 
            throws PortfolioOptimizerException {
        
        String endpoint = "/market-data?symbols=" + String.join(",", symbols);
        if (startDate != null) {
            endpoint += "&start_date=" + startDate.toString();
        }
        if (endDate != null) {
            endpoint += "&end_date=" + endDate.toString();
        }
        
        Map<String, Object> response = makeRequest("GET", endpoint, null, Map.class);
        return (Map<String, Object>) response.get("market_data");
    }

    /**
     * Get machine learning predictions for assets.
     * 
     * @param symbols Asset symbols
     * @param predictionHorizon Prediction horizon in days
     * @return ML predictions with confidence intervals
     * @throws PortfolioOptimizerException On API errors
     */
    public Map<String, Object> getMlPredictions(List<String> symbols, int predictionHorizon) 
            throws PortfolioOptimizerException {
        
        Map<String, Object> request = Map.of(
            "symbols", symbols,
            "prediction_horizon", predictionHorizon
        );
        
        Map<String, Object> response = makeRequest("POST", "/ml-predictions", request, Map.class);
        return (Map<String, Object>) response.get("predictions");
    }

    /**
     * Example usage and demonstration.
     */
    public static void main(String[] args) {
        try {
            // Initialize client
            PortfolioOptimizerClient client = new PortfolioOptimizerClient("your_api_key_here");

            // Define portfolio symbols
            List<String> symbols = Arrays.asList("AAPL", "MSFT", "GOOGL", "BND", "VTI");

            // Create optimization request with constraints
            OptimizationRequest request = OptimizationRequest.builder()
                    .symbols(symbols)
                    .method("markowitz")
                    .constraints(OptimizationConstraints.builder()
                            .maxWeight(0.4)
                            .minWeight(0.05)
                            .sectorLimits(Map.of("technology", 0.6))
                            .build())
                    .riskTolerance(0.5)
                    .build();

            // Optimize portfolio
            OptimizationResult result = client.optimizePortfolio(request);

            System.out.println("Optimization Results:");
            System.out.printf("Expected Return: %.2f%%\n", result.getExpectedReturn() * 100);
            System.out.printf("Volatility: %.2f%%\n", result.getVolatility() * 100);
            System.out.printf("Sharpe Ratio: %.2f\n", result.getSharpeRatio());
            System.out.printf("Execution Time: %.2fs\n", result.getExecutionTime());

            System.out.println("\nOptimal Weights:");
            result.getWeights().forEach((symbol, weight) -> 
                System.out.printf("  %s: %.2f%%\n", symbol, weight * 100));

            // Generate efficient frontier
            List<Map<String, Double>> frontier = client.getEfficientFrontier(symbols, 50, "markowitz");
            System.out.printf("\nEfficient Frontier: %d points generated\n", frontier.size());

            // Calculate risk metrics
            Map<String, Object> riskMetrics = client.calculateRiskMetrics(result.getWeights(), null);
            Object var95 = riskMetrics.get("var_95");
            if (var95 instanceof Number) {
                System.out.printf("\nValue at Risk (95%%): %.2f%%\n", ((Number) var95).doubleValue() * 100);
            }

        } catch (AuthenticationException e) {
            System.err.println("Authentication failed. Please check your API key.");
        } catch (RateLimitException e) {
            System.err.printf("Rate limit exceeded. Retry after %d seconds.\n", e.getRetryAfter());
        } catch (ValidationException e) {
            System.err.println("Validation error: " + e.getMessage());
            System.err.println("Details: " + e.getDetails());
        } catch (PortfolioOptimizerException e) {
            System.err.println("Optimization failed: " + e.getMessage());
        }
    }
}