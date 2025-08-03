import React, { useState, useEffect } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import { EducationalTooltip } from './EducationalTooltip';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface MLInsight {
  symbol: string;
  forecast_return: number;
  confidence_lower: number;
  confidence_upper: number;
  model_confidence: number;
}

interface MarketRegime {
  current_regime: string;
  regime_id: number;
  confidence: number;
  regime_probabilities: Record<string, number>;
  recommended_adjustments: Record<string, string>;
}

interface FeatureImportance {
  [key: string]: number;
}

const MLInsightsPanel: React.FC = () => {
  const { state } = usePortfolio();
  const [activeTab, setActiveTab] = useState<'predictions' | 'regime' | 'features' | 'sentiment'>('predictions');
  const [mlEnabled, setMlEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // Mock data - in production would come from API
  const mockPredictions: MLInsight[] = [
    { symbol: 'AAPL', forecast_return: 0.12, confidence_lower: 0.05, confidence_upper: 0.19, model_confidence: 0.78 },
    { symbol: 'MSFT', forecast_return: 0.09, confidence_lower: 0.02, confidence_upper: 0.16, model_confidence: 0.82 },
    { symbol: 'GOOGL', forecast_return: 0.14, confidence_lower: 0.07, confidence_upper: 0.21, model_confidence: 0.75 },
    { symbol: 'TSLA', forecast_return: 0.08, confidence_lower: -0.05, confidence_upper: 0.21, model_confidence: 0.68 }
  ];

  const mockRegime: MarketRegime = {
    current_regime: 'Sideways Market',
    regime_id: 1,
    confidence: 0.72,
    regime_probabilities: {
      'Bear Market': 0.15,
      'Sideways Market': 0.72,
      'Bull Market': 0.13
    },
    recommended_adjustments: {
      'risk_adjustment': 'Maintain moderate risk levels',
      'asset_allocation': 'Focus on dividend-paying stocks and balanced allocation',
      'rebalancing': 'Standard rebalancing frequency'
    }
  };

  const mockFeatureImportance: FeatureImportance = {
    'Historical Returns': 0.35,
    'Volume Patterns': 0.25,
    'Volatility': 0.20,
    'Technical Indicators': 0.12,
    'Market Sentiment': 0.08
  };

  const mockSentiment = [
    { symbol: 'AAPL', sentiment: 0.65, trend: 'positive', news_count: 8 },
    { symbol: 'MSFT', sentiment: 0.45, trend: 'neutral', news_count: 5 },
    { symbol: 'GOOGL', sentiment: -0.15, trend: 'negative', news_count: 12 },
    { symbol: 'TSLA', sentiment: 0.85, trend: 'positive', news_count: 15 }
  ];

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatConfidence = (value: number) => `${(value * 100).toFixed(0)}%`;

  const getRegimeColor = (regime: string) => {
    switch (regime) {
      case 'Bull Market': return 'text-green-600 bg-green-50 border-green-200';
      case 'Bear Market': return 'text-red-600 bg-red-50 border-red-200';
      case 'Sideways Market': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getSentimentColor = (sentiment: number) => {
    if (sentiment > 0.3) return 'text-green-600';
    if (sentiment < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentEmoji = (sentiment: number) => {
    if (sentiment > 0.3) return '😊';
    if (sentiment < -0.3) return '☹️';
    return '😐';
  };

  if (!mlEnabled) {
    return (
      <div className="max-w-6xl mx-auto p-4 lg:p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-700 mb-2">ML Features Disabled</h3>
          <p className="text-gray-500 mb-4">Machine learning insights are currently disabled.</p>
          <button
            onClick={() => setMlEnabled(true)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Enable ML Insights
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 lg:p-6">
      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">ML-Enhanced Insights</h2>
              <p className="text-gray-600">
                Machine learning analysis and predictions for your portfolio
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-sm text-gray-600">Models Active</span>
              </div>
              
              <button
                onClick={() => setMlEnabled(false)}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                Disable ML
              </button>
            </div>
          </div>
        </div>

        {/* ML Status Banner */}
        <div className="p-4 bg-blue-50 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <div className="font-medium text-blue-900">AI Models Status</div>
                <div className="text-sm text-blue-700">LSTM Predictions • HMM Regime • Anomaly Detection</div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-sm text-blue-900 font-medium">Confidence: 78%</div>
              <div className="text-xs text-blue-700">Last updated: 2 min ago</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'predictions', label: 'Return Predictions', icon: '🎯' },
              { id: 'regime', label: 'Market Regime', icon: '📈' },
              { id: 'features', label: 'Feature Importance', icon: '⚖️' },
              { id: 'sentiment', label: 'Market Sentiment', icon: '📰' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'predictions' && (
            <div className="space-y-6">
              {/* Prediction Overview */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">30-Day Return Forecasts</h3>
                <p className="text-blue-700 text-sm mb-4">
                  LSTM neural network predictions based on 252 days of historical data, 
                  including price, volume, and technical indicators.
                </p>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">4</div>
                    <div className="text-sm text-blue-700">Assets Analyzed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">78%</div>
                    <div className="text-sm text-blue-700">Avg Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">252</div>
                    <div className="text-sm text-blue-700">Training Days</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-900">30</div>
                    <div className="text-sm text-blue-700">Forecast Days</div>
                  </div>
                </div>
              </div>

              {/* Predictions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Asset
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Forecast Return
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Confidence Range
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Model Confidence
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Signal Strength
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {mockPredictions.map((prediction, index) => {
                      const signalStrength = Math.abs(prediction.forecast_return) * prediction.model_confidence;
                      const isPositive = prediction.forecast_return > 0;
                      
                      return (
                        <tr key={prediction.symbol} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{prediction.symbol}</div>
                            <div className="text-sm text-gray-500">30-day horizon</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className={`text-lg font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(prediction.forecast_return)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatPercentage(prediction.confidence_lower)} to {formatPercentage(prediction.confidence_upper)}
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                              <div 
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${prediction.model_confidence * 100}%` }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-gray-900">
                              {formatConfidence(prediction.model_confidence)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                  <div 
                                    className={`h-2 rounded-full ${signalStrength > 0.1 ? 'bg-green-500' : signalStrength > 0.05 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(signalStrength * 500, 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                              <span className="ml-2 text-xs text-gray-600">
                                {signalStrength > 0.1 ? 'Strong' : signalStrength > 0.05 ? 'Moderate' : 'Weak'}
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Prediction Visualization */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Forecast Visualization</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={mockPredictions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="symbol" />
                      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip 
                        formatter={(value: number) => [formatPercentage(value), 'Forecast Return']}
                        labelFormatter={(label) => `Asset: ${label}`}
                      />
                      <Bar dataKey="forecast_return" fill="#3B82F6" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'regime' && (
            <div className="space-y-6">
              {/* Current Regime Status */}
              <div className={`border rounded-lg p-6 ${getRegimeColor(mockRegime.current_regime)}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold mb-2">Current Market Regime</h3>
                    <div className="text-2xl font-bold">{mockRegime.current_regime}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm opacity-75">Confidence</div>
                    <div className="text-3xl font-bold">{formatConfidence(mockRegime.confidence)}</div>
                  </div>
                </div>
                
                <p className="text-sm opacity-90">
                  The Hidden Markov Model identifies the current market as moving sideways, 
                  with moderate volatility and mixed directional signals.
                </p>
              </div>

              {/* Regime Probabilities */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Regime Probabilities</h4>
                  <div className="space-y-3">
                    {Object.entries(mockRegime.regime_probabilities).map(([regime, probability]) => (
                      <div key={regime} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{regime}</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${probability * 100}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900 w-12">
                            {formatPercentage(probability)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Recommended Adjustments</h4>
                  <div className="space-y-3">
                    {Object.entries(mockRegime.recommended_adjustments).map(([key, value]) => (
                      <div key={key}>
                        <div className="font-medium text-gray-700 text-sm capitalize">
                          {key.replace('_', ' ')}:
                        </div>
                        <div className="text-sm text-gray-600 mt-1">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Regime History */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Regime History</h4>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { date: 'Jan', regime: 2 },
                      { date: 'Feb', regime: 2 },
                      { date: 'Mar', regime: 0 },
                      { date: 'Apr', regime: 0 },
                      { date: 'May', regime: 1 },
                      { date: 'Jun', regime: 1 },
                      { date: 'Jul', regime: 1 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis 
                        domain={[0, 2]} 
                        tickFormatter={(value) => ['Bear', 'Sideways', 'Bull'][value]} 
                      />
                      <Tooltip 
                        formatter={(value: number) => [['Bear Market', 'Sideways Market', 'Bull Market'][value], 'Regime']}
                      />
                      <Line type="stepAfter" dataKey="regime" stroke="#3B82F6" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'features' && (
            <div className="space-y-6">
              {/* Feature Importance Overview */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">What Drives the Predictions?</h3>
                <p className="text-blue-700 text-sm">
                  Feature importance shows which factors most influence return predictions. 
                  Higher values indicate stronger predictive power in the LSTM model.
                </p>
              </div>

              {/* Feature Importance Chart */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Feature Importance</h4>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={Object.entries(mockFeatureImportance).map(([feature, importance]) => ({
                          feature: feature.replace('_', ' '),
                          importance
                        }))}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                        <YAxis type="category" dataKey="feature" width={120} />
                        <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Importance']} />
                        <Bar dataKey="importance" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Feature Explanations</h4>
                  <div className="space-y-4">
                    {Object.entries(mockFeatureImportance).map(([feature, importance]) => {
                      const explanations = {
                        'Historical Returns': 'Past price movements and trends',
                        'Volume Patterns': 'Trading volume and liquidity indicators',
                        'Volatility': 'Price stability and uncertainty measures',
                        'Technical Indicators': 'RSI, moving averages, momentum',
                        'Market Sentiment': 'News sentiment and market mood'
                      };
                      
                      return (
                        <div key={feature} className="flex items-start space-x-3">
                          <div className="w-16 text-right">
                            <span className="text-sm font-medium text-blue-600">
                              {(importance * 100).toFixed(0)}%
                            </span>
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm">{feature}</div>
                            <div className="text-xs text-gray-600 mt-1">
                              {explanations[feature as keyof typeof explanations]}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Model Architecture */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">LSTM Model Architecture</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-blue-600 font-bold">252</span>
                    </div>
                    <div className="font-medium text-gray-900">Input Window</div>
                    <div className="text-sm text-gray-600">Days of historical data</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-green-600 font-bold">50+50</span>
                    </div>
                    <div className="font-medium text-gray-900">LSTM Layers</div>
                    <div className="text-sm text-gray-600">Hidden units per layer</div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <span className="text-purple-600 font-bold">30</span>
                    </div>
                    <div className="font-medium text-gray-900">Forecast Horizon</div>
                    <div className="text-sm text-gray-600">Days ahead prediction</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'sentiment' && (
            <div className="space-y-6">
              {/* Sentiment Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {mockSentiment.map((item) => (
                  <div key={item.symbol} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{item.symbol}</span>
                      <span className="text-2xl">{getSentimentEmoji(item.sentiment)}</span>
                    </div>
                    <div className={`text-lg font-bold ${getSentimentColor(item.sentiment)}`}>
                      {item.sentiment > 0 ? '+' : ''}{(item.sentiment * 100).toFixed(0)}%
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {item.news_count} news items • {item.trend}
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-2">
                      <div 
                        className={`h-1 rounded-full ${getSentimentColor(item.sentiment).includes('green') ? 'bg-green-500' : getSentimentColor(item.sentiment).includes('red') ? 'bg-red-500' : 'bg-yellow-500'}`}
                        style={{ width: `${Math.abs(item.sentiment) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Sentiment Trends */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Sentiment Trends</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { date: 'Mon', AAPL: 0.5, MSFT: 0.3, GOOGL: -0.1, TSLA: 0.7 },
                      { date: 'Tue', AAPL: 0.6, MSFT: 0.4, GOOGL: -0.2, TSLA: 0.8 },
                      { date: 'Wed', AAPL: 0.7, MSFT: 0.5, GOOGL: -0.1, TSLA: 0.9 },
                      { date: 'Thu', AAPL: 0.65, MSFT: 0.45, GOOGL: -0.15, TSLA: 0.85 },
                      { date: 'Fri', AAPL: 0.65, MSFT: 0.45, GOOGL: -0.15, TSLA: 0.85 }
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, 'Sentiment']} />
                      <Line type="monotone" dataKey="AAPL" stroke="#3B82F6" strokeWidth={2} />
                      <Line type="monotone" dataKey="MSFT" stroke="#10B981" strokeWidth={2} />
                      <Line type="monotone" dataKey="GOOGL" stroke="#F59E0B" strokeWidth={2} />
                      <Line type="monotone" dataKey="TSLA" stroke="#8B5CF6" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sentiment Insights */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                <h4 className="text-lg font-semibold text-yellow-800 mb-3">💡 Sentiment Insights</h4>
                <ul className="text-yellow-700 text-sm space-y-2">
                  <li>• TSLA shows strong positive sentiment with high news volume - possible catalyst</li>
                  <li>• GOOGL sentiment remains negative despite recent price stability</li>
                  <li>• Overall portfolio sentiment is moderately positive at +32%</li>
                  <li>• Consider sentiment divergence from price action for contrarian opportunities</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* ML Disclaimer */}
        <div className="border-t border-gray-200 p-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div className="text-gray-800 font-medium text-sm mb-1">Important Disclaimer</div>
                <p className="text-gray-600 text-xs leading-relaxed">
                  Machine learning predictions are based on historical data and statistical patterns. 
                  They do not guarantee future performance and should be used as one factor among many in investment decisions. 
                  All models include confidence scores to indicate reliability. Past performance does not predict future results.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MLInsightsPanel;