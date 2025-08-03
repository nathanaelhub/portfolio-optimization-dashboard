/**
 * Portfolio Optimizer C#/.NET SDK
 * 
 * Complete .NET client library for the Portfolio Optimization API.
 * Supports .NET Core, comprehensive error handling, and async operations.
 * 
 * NuGet Package:
 * Install-Package PortfolioOptimizer.SDK
 * 
 * Usage:
 * var client = new PortfolioOptimizerClient("your_api_key");
 * var result = await client.OptimizePortfolioAsync(new OptimizationRequest
 * {
 *     Symbols = new[] { "AAPL", "MSFT", "GOOGL" },
 *     Method = "markowitz"
 * });
 */

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using System.ComponentModel.DataAnnotations;
using System.Linq;

namespace PortfolioOptimizer.SDK
{
    // Custom exceptions
    public class PortfolioOptimizerException : Exception
    {
        public string Code { get; }
        public object Details { get; }

        public PortfolioOptimizerException(string message, string code = null, object details = null)
            : base(message)
        {
            Code = code;
            Details = details;
        }
    }

    public class AuthenticationException : PortfolioOptimizerException
    {
        public AuthenticationException(string message = "Authentication failed")
            : base(message, "AUTH_ERROR")
        {
        }
    }

    public class RateLimitException : PortfolioOptimizerException
    {
        public int RetryAfter { get; }

        public RateLimitException(string message, int retryAfter)
            : base(message, "RATE_LIMIT")
        {
            RetryAfter = retryAfter;
        }
    }

    public class ValidationException : PortfolioOptimizerException
    {
        public ValidationException(string message, object errors = null)
            : base(message, "VALIDATION_ERROR", errors)
        {
        }
    }

    // Data models
    public class OptimizationConstraints
    {
        [JsonPropertyName("max_weight")]
        public double? MaxWeight { get; set; }

        [JsonPropertyName("min_weight")]
        public double? MinWeight { get; set; }

        [JsonPropertyName("sector_limits")]
        public Dictionary<string, double> SectorLimits { get; set; }

        [JsonPropertyName("liquidity_threshold")]
        public double? LiquidityThreshold { get; set; }

        [JsonPropertyName("esg_score_min")]
        public double? EsgScoreMin { get; set; }
    }

    public class OptimizationRequest
    {
        [Required]
        [JsonPropertyName("symbols")]
        public IEnumerable<string> Symbols { get; set; }

        [Required]
        [JsonPropertyName("method")]
        public string Method { get; set; }

        [JsonPropertyName("constraints")]
        public OptimizationConstraints Constraints { get; set; }

        [JsonPropertyName("risk_tolerance")]
        public double? RiskTolerance { get; set; }

        [JsonPropertyName("time_horizon")]
        public int? TimeHorizon { get; set; }

        [JsonPropertyName("rebalancing_frequency")]
        public string RebalancingFrequency { get; set; }
    }

    public class OptimizationResult
    {
        [JsonPropertyName("weights")]
        public Dictionary<string, double> Weights { get; set; }

        [JsonPropertyName("expected_return")]
        public double ExpectedReturn { get; set; }

        [JsonPropertyName("volatility")]
        public double Volatility { get; set; }

        [JsonPropertyName("sharpe_ratio")]
        public double SharpeRatio { get; set; }

        [JsonPropertyName("execution_time")]
        public double ExecutionTime { get; set; }

        [JsonPropertyName("method_used")]
        public string MethodUsed { get; set; }

        [JsonPropertyName("risk_metrics")]
        public Dictionary<string, object> RiskMetrics { get; set; }

        [JsonPropertyName("efficient_frontier")]
        public List<Dictionary<string, double>> EfficientFrontier { get; set; }
    }

    public class BacktestRequest
    {
        [JsonPropertyName("weights")]
        public Dictionary<string, double> Weights { get; set; }

        [JsonPropertyName("start_date")]
        public string StartDate { get; set; }

        [JsonPropertyName("end_date")]
        public string EndDate { get; set; }

        [JsonPropertyName("rebalancing_frequency")]
        public string RebalancingFrequency { get; set; }
    }

    public class EfficientFrontierRequest
    {
        [JsonPropertyName("symbols")]
        public IEnumerable<string> Symbols { get; set; }

        [JsonPropertyName("num_points")]
        public int NumPoints { get; set; }

        [JsonPropertyName("method")]
        public string Method { get; set; }
    }

    public class MlPredictionRequest
    {
        [JsonPropertyName("symbols")]
        public IEnumerable<string> Symbols { get; set; }

        [JsonPropertyName("prediction_horizon")]
        public int PredictionHorizon { get; set; }
    }

    // Client configuration
    public class PortfolioOptimizerClientOptions
    {
        public string BaseUrl { get; set; } = "https://api.portfolio-optimizer.com/v1";
        public TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(30);
        public int MaxRetries { get; set; } = 3;
        public TimeSpan RetryDelay { get; set; } = TimeSpan.FromSeconds(1);
    }

    /// <summary>
    /// Portfolio Optimizer API Client
    /// 
    /// Complete .NET client for the Portfolio Optimization API with
    /// comprehensive error handling, retry logic, and async support.
    /// </summary>
    public class PortfolioOptimizerClient : IDisposable
    {
        private readonly HttpClient _httpClient;
        private readonly PortfolioOptimizerClientOptions _options;
        private readonly JsonSerializerOptions _jsonOptions;

        /// <summary>
        /// Create a new Portfolio Optimizer client with default settings.
        /// </summary>
        /// <param name="apiKey">Your API key</param>
        public PortfolioOptimizerClient(string apiKey) 
            : this(apiKey, new PortfolioOptimizerClientOptions())
        {
        }

        /// <summary>
        /// Create a new Portfolio Optimizer client with custom settings.
        /// </summary>
        /// <param name="apiKey">Your API key</param>
        /// <param name="options">Client configuration options</param>
        public PortfolioOptimizerClient(string apiKey, PortfolioOptimizerClientOptions options)
        {
            if (string.IsNullOrWhiteSpace(apiKey))
                throw new ArgumentException("API key is required", nameof(apiKey));

            _options = options ?? new PortfolioOptimizerClientOptions();

            _httpClient = new HttpClient
            {
                BaseAddress = new Uri(_options.BaseUrl.TrimEnd('/')),
                Timeout = _options.Timeout
            };

            _httpClient.DefaultRequestHeaders.Add("Authorization", $"Bearer {apiKey}");
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "PortfolioOptimizer-CSharp-SDK/1.0.0");

            _jsonOptions = new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
                DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
            };
        }

        /// <summary>
        /// Make HTTP request with retry logic and error handling.
        /// </summary>
        private async Task<T> MakeRequestAsync<T>(HttpMethod method, string endpoint, object requestBody = null, 
            CancellationToken cancellationToken = default)
        {
            var uri = $"/{endpoint.TrimStart('/')}";
            Exception lastException = null;

            for (int attempt = 0; attempt <= _options.MaxRetries; attempt++)
            {
                try
                {
                    using var request = new HttpRequestMessage(method, uri);

                    if (requestBody != null)
                    {
                        var jsonContent = JsonSerializer.Serialize(requestBody, _jsonOptions);
                        request.Content = new StringContent(jsonContent, Encoding.UTF8, "application/json");
                    }

                    using var response = await _httpClient.SendAsync(request, cancellationToken);

                    if (response.IsSuccessStatusCode)
                    {
                        var responseContent = await response.Content.ReadAsStringAsync(cancellationToken);
                        return JsonSerializer.Deserialize<T>(responseContent, _jsonOptions);
                    }

                    // Handle error responses
                    var errorContent = await response.Content.ReadAsStringAsync(cancellationToken);
                    var errorData = new Dictionary<string, object>();
                    
                    try
                    {
                        errorData = JsonSerializer.Deserialize<Dictionary<string, object>>(errorContent, _jsonOptions);
                    }
                    catch
                    {
                        // Ignore JSON parsing errors
                    }

                    var errorMessage = errorData.TryGetValue("message", out var msg) ? msg.ToString() : "Unknown error";

                    switch ((int)response.StatusCode)
                    {
                        case 401:
                            throw new AuthenticationException(errorMessage);

                        case 429:
                            var retryAfter = response.Headers.RetryAfter?.Delta?.Seconds ?? 1;
                            if (attempt < _options.MaxRetries)
                            {
                                await Task.Delay(TimeSpan.FromSeconds(retryAfter), cancellationToken);
                                continue;
                            }
                            throw new RateLimitException(errorMessage, retryAfter);

                        case 400:
                            var errors = errorData.TryGetValue("errors", out var errs) ? errs : null;
                            throw new ValidationException(errorMessage, errors);

                        default:
                            throw new PortfolioOptimizerException(errorMessage, response.StatusCode.ToString(), errorData);
                    }
                }
                catch (PortfolioOptimizerException)
                {
                    throw;
                }
                catch (Exception ex)
                {
                    lastException = ex;
                    if (attempt < _options.MaxRetries)
                    {
                        var delay = _options.RetryDelay * Math.Pow(2, attempt);
                        await Task.Delay(delay, cancellationToken);
                        continue;
                    }
                }
            }

            throw new PortfolioOptimizerException("Max retries exceeded", "MAX_RETRIES", lastException);
        }

        /// <summary>
        /// Optimize a portfolio using the specified method and constraints.
        /// </summary>
        /// <param name="request">Optimization request parameters</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Optimization results</returns>
        /// <example>
        /// var result = await client.OptimizePortfolioAsync(new OptimizationRequest
        /// {
        ///     Symbols = new[] { "AAPL", "MSFT", "GOOGL", "BND" },
        ///     Method = "markowitz",
        ///     Constraints = new OptimizationConstraints
        ///     {
        ///         MaxWeight = 0.4,
        ///         MinWeight = 0.05
        ///     }
        /// });
        /// 
        /// Console.WriteLine($"Expected return: {result.ExpectedReturn:P2}");
        /// Console.WriteLine($"Sharpe ratio: {result.SharpeRatio:F2}");
        /// </example>
        public async Task<OptimizationResult> OptimizePortfolioAsync(OptimizationRequest request, 
            CancellationToken cancellationToken = default)
        {
            if (request == null)
                throw new ArgumentNullException(nameof(request));

            var startTime = DateTimeOffset.UtcNow;
            var result = await MakeRequestAsync<OptimizationResult>(HttpMethod.Post, "/optimize", request, cancellationToken);
            result.ExecutionTime = (DateTimeOffset.UtcNow - startTime).TotalSeconds;
            
            return result;
        }

        /// <summary>
        /// Generate efficient frontier for given assets.
        /// </summary>
        /// <param name="symbols">Asset symbols</param>
        /// <param name="numPoints">Number of points on the frontier</param>
        /// <param name="method">Optimization method</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Efficient frontier points</returns>
        public async Task<List<Dictionary<string, double>>> GetEfficientFrontierAsync(
            IEnumerable<string> symbols, int numPoints = 100, string method = "markowitz",
            CancellationToken cancellationToken = default)
        {
            var request = new EfficientFrontierRequest
            {
                Symbols = symbols,
                NumPoints = numPoints,
                Method = method
            };

            var response = await MakeRequestAsync<Dictionary<string, object>>(
                HttpMethod.Post, "/efficient-frontier", request, cancellationToken);
            
            var frontierPoints = response["frontier_points"];
            return JsonSerializer.Deserialize<List<Dictionary<string, double>>>(
                JsonSerializer.Serialize(frontierPoints), _jsonOptions);
        }

        /// <summary>
        /// Calculate comprehensive risk metrics for a portfolio.
        /// </summary>
        /// <param name="weights">Portfolio weights</param>
        /// <param name="symbols">Asset symbols (optional)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Risk metrics</returns>
        public async Task<Dictionary<string, object>> CalculateRiskMetricsAsync(
            Dictionary<string, double> weights, IEnumerable<string> symbols = null,
            CancellationToken cancellationToken = default)
        {
            var request = new Dictionary<string, object>
            {
                ["weights"] = weights
            };

            if (symbols != null)
            {
                request["symbols"] = symbols;
            }

            var response = await MakeRequestAsync<Dictionary<string, object>>(
                HttpMethod.Post, "/risk-metrics", request, cancellationToken);
            
            return (Dictionary<string, object>)response["risk_metrics"];
        }

        /// <summary>
        /// Backtest a portfolio over a specified period.
        /// </summary>
        /// <param name="weights">Portfolio weights</param>
        /// <param name="startDate">Start date</param>
        /// <param name="endDate">End date</param>
        /// <param name="rebalancingFrequency">Rebalancing frequency</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Backtesting results</returns>
        public async Task<Dictionary<string, object>> BacktestPortfolioAsync(
            Dictionary<string, double> weights, DateTime startDate, DateTime endDate,
            string rebalancingFrequency = "monthly", CancellationToken cancellationToken = default)
        {
            var request = new BacktestRequest
            {
                Weights = weights,
                StartDate = startDate.ToString("yyyy-MM-dd"),
                EndDate = endDate.ToString("yyyy-MM-dd"),
                RebalancingFrequency = rebalancingFrequency
            };

            var response = await MakeRequestAsync<Dictionary<string, object>>(
                HttpMethod.Post, "/backtest", request, cancellationToken);
            
            return (Dictionary<string, object>)response["backtest_results"];
        }

        /// <summary>
        /// Retrieve market data for specified symbols.
        /// </summary>
        /// <param name="symbols">Asset symbols</param>
        /// <param name="startDate">Start date (optional)</param>
        /// <param name="endDate">End date (optional)</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Market data</returns>
        public async Task<Dictionary<string, object>> GetMarketDataAsync(
            IEnumerable<string> symbols, DateTime? startDate = null, DateTime? endDate = null,
            CancellationToken cancellationToken = default)
        {
            var queryParams = new List<string>
            {
                $"symbols={string.Join(",", symbols)}"
            };

            if (startDate.HasValue)
                queryParams.Add($"start_date={startDate.Value:yyyy-MM-dd}");

            if (endDate.HasValue)
                queryParams.Add($"end_date={endDate.Value:yyyy-MM-dd}");

            var endpoint = $"/market-data?{string.Join("&", queryParams)}";

            var response = await MakeRequestAsync<Dictionary<string, object>>(
                HttpMethod.Get, endpoint, null, cancellationToken);
            
            return (Dictionary<string, object>)response["market_data"];
        }

        /// <summary>
        /// Get machine learning predictions for assets.
        /// </summary>
        /// <param name="symbols">Asset symbols</param>
        /// <param name="predictionHorizon">Prediction horizon in days</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>ML predictions with confidence intervals</returns>
        public async Task<Dictionary<string, object>> GetMlPredictionsAsync(
            IEnumerable<string> symbols, int predictionHorizon = 30,
            CancellationToken cancellationToken = default)
        {
            var request = new MlPredictionRequest
            {
                Symbols = symbols,
                PredictionHorizon = predictionHorizon
            };

            var response = await MakeRequestAsync<Dictionary<string, object>>(
                HttpMethod.Post, "/ml-predictions", request, cancellationToken);
            
            return (Dictionary<string, object>)response["predictions"];
        }

        /// <summary>
        /// Batch multiple optimization requests.
        /// </summary>
        /// <param name="requests">Array of optimization requests</param>
        /// <param name="cancellationToken">Cancellation token</param>
        /// <returns>Array of optimization results</returns>
        public async Task<List<OptimizationResult>> BatchOptimizeAsync(
            IEnumerable<OptimizationRequest> requests, CancellationToken cancellationToken = default)
        {
            var requestBody = new { requests };

            var response = await MakeRequestAsync<Dictionary<string, object>>(
                HttpMethod.Post, "/batch-optimize", requestBody, cancellationToken);
            
            var results = response["results"];
            return JsonSerializer.Deserialize<List<OptimizationResult>>(
                JsonSerializer.Serialize(results), _jsonOptions);
        }

        public void Dispose()
        {
            _httpClient?.Dispose();
        }
    }

    // Convenience methods and utilities
    public static class PortfolioOptimizerExtensions
    {
        /// <summary>
        /// Create an equal-weighted portfolio.
        /// </summary>
        public static Dictionary<string, double> CreateEqualWeightPortfolio(this IEnumerable<string> symbols)
        {
            var symbolList = symbols.ToList();
            var weight = 1.0 / symbolList.Count;
            
            return symbolList.ToDictionary(symbol => symbol, _ => weight);
        }

        /// <summary>
        /// Format portfolio weights as percentages.
        /// </summary>
        public static string FormatWeights(this Dictionary<string, double> weights)
        {
            var formatted = weights.Select(kvp => $"{kvp.Key}: {kvp.Value:P2}");
            return string.Join(", ", formatted);
        }
    }

    // Example program
    public class Program
    {
        public static async Task Main(string[] args)
        {
            try
            {
                // Initialize client
                using var client = new PortfolioOptimizerClient("your_api_key_here");

                // Define portfolio symbols
                var symbols = new[] { "AAPL", "MSFT", "GOOGL", "BND", "VTI" };

                // Create optimization request with constraints
                var request = new OptimizationRequest
                {
                    Symbols = symbols,
                    Method = "markowitz",
                    Constraints = new OptimizationConstraints
                    {
                        MaxWeight = 0.4,
                        MinWeight = 0.05,
                        SectorLimits = new Dictionary<string, double>
                        {
                            ["technology"] = 0.6
                        }
                    },
                    RiskTolerance = 0.5
                };

                // Optimize portfolio
                var result = await client.OptimizePortfolioAsync(request);

                Console.WriteLine("Optimization Results:");
                Console.WriteLine($"Expected Return: {result.ExpectedReturn:P2}");
                Console.WriteLine($"Volatility: {result.Volatility:P2}");
                Console.WriteLine($"Sharpe Ratio: {result.SharpeRatio:F2}");
                Console.WriteLine($"Execution Time: {result.ExecutionTime:F2}s");

                Console.WriteLine("\nOptimal Weights:");
                foreach (var (symbol, weight) in result.Weights)
                {
                    Console.WriteLine($"  {symbol}: {weight:P2}");
                }

                // Generate efficient frontier
                var frontier = await client.GetEfficientFrontierAsync(symbols, 50);
                Console.WriteLine($"\nEfficient Frontier: {frontier.Count} points generated");

                // Calculate risk metrics
                var riskMetrics = await client.CalculateRiskMetricsAsync(result.Weights);
                if (riskMetrics.TryGetValue("var_95", out var var95))
                {
                    Console.WriteLine($"\nValue at Risk (95%): {Convert.ToDouble(var95):P2}");
                }

                // Get ML predictions
                var predictions = await client.GetMlPredictionsAsync(symbols);
                Console.WriteLine("\nML Predictions:");
                foreach (var prediction in predictions)
                {
                    Console.WriteLine($"  {prediction.Key}: {prediction.Value}");
                }
            }
            catch (AuthenticationException)
            {
                Console.WriteLine("Authentication failed. Please check your API key.");
            }
            catch (RateLimitException ex)
            {
                Console.WriteLine($"Rate limit exceeded. Retry after {ex.RetryAfter} seconds.");
            }
            catch (ValidationException ex)
            {
                Console.WriteLine($"Validation error: {ex.Message}");
                Console.WriteLine($"Details: {ex.Details}");
            }
            catch (PortfolioOptimizerException ex)
            {
                Console.WriteLine($"Optimization failed: {ex.Message}");
            }
        }
    }
}