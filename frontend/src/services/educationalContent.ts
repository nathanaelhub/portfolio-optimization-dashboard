/**
 * Educational Content Service
 * Provides financial education content, tutorials, and explanations
 */

export interface TooltipContent {
  id: string;
  title: string;
  brief: string;
  detailed?: string;
  example?: string;
  relatedTopics?: string[];
}

export interface Tutorial {
  id: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: number; // minutes
  steps: TutorialStep[];
}

export interface TutorialStep {
  id: number;
  title: string;
  content: string;
  interactive?: {
    type: 'chart' | 'form' | 'simulation' | 'quiz';
    component: string;
    props?: any;
  };
  validation?: {
    required: boolean;
    condition?: (value: any) => boolean;
  };
}

export interface RecommendationExplanation {
  summary: string;
  reasons: string[];
  constraints: string[];
  improvements: string[];
  tradeoffs: string[];
  confidence: number;
}

export interface Warning {
  id: string;
  type: 'concentration' | 'correlation' | 'cost' | 'expectation';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  recommendation: string;
  learnMoreTopic?: string;
}

// Tooltip Content Database
export const tooltipContent: Record<string, TooltipContent> = {
  'sharpe-ratio': {
    id: 'sharpe-ratio',
    title: 'Sharpe Ratio',
    brief: 'Measures return per unit of risk. Higher is better. Like comparing cars by miles-per-gallon - you want the most return for the risk you\'re taking.',
    detailed: 'The Sharpe ratio helps investors understand whether an investment\'s returns are due to smart decisions or excessive risk. A ratio above 1.0 is good, above 2.0 is very good.',
    example: 'Portfolio A: 10% return, 10% risk = 1.0 Sharpe. Portfolio B: 12% return, 15% risk = 0.8 Sharpe. Portfolio A is better risk-adjusted.',
    relatedTopics: ['sortino-ratio', 'risk-adjusted-returns', 'volatility']
  },
  'diversification': {
    id: 'diversification',
    title: 'Diversification',
    brief: 'Don\'t put all eggs in one basket. Owning different assets that don\'t move together reduces risk without sacrificing returns.',
    detailed: 'Diversification works because different assets react differently to the same events. When stocks fall, bonds might rise, cushioning your portfolio.',
    example: 'A portfolio of only tech stocks is risky. Adding bonds, international stocks, and real estate reduces risk while maintaining growth potential.',
    relatedTopics: ['correlation', 'asset-allocation', 'modern-portfolio-theory']
  },
  'rebalancing': {
    id: 'rebalancing',
    title: 'Rebalancing',
    brief: 'Selling winners and buying losers to maintain target allocation. Like pruning a garden to keep balanced growth.',
    detailed: 'Rebalancing forces you to sell high and buy low, maintaining your risk level. It\'s disciplined profit-taking and opportunity-seeking.',
    example: 'Your 60/40 stocks/bonds portfolio becomes 70/30 after stocks surge. Rebalancing sells 10% stocks to buy bonds, locking in gains.',
    relatedTopics: ['asset-allocation', 'portfolio-drift', 'transaction-costs']
  },
  'correlation': {
    id: 'correlation',
    title: 'Correlation',
    brief: 'How similarly assets move. Low correlation between holdings reduces portfolio risk during market swings.',
    detailed: 'Correlation ranges from -1 (opposite moves) to +1 (identical moves). Zero means no relationship. Mix low-correlated assets for better diversification.',
    example: 'Stocks and bonds often have low correlation. When stocks drop in a recession, bonds may rise as investors seek safety.',
    relatedTopics: ['diversification', 'covariance', 'portfolio-construction']
  },
  'efficient-frontier': {
    id: 'efficient-frontier',
    title: 'Efficient Frontier',
    brief: 'The line showing best possible return for each risk level. Portfolios below waste potential; above are impossible.',
    detailed: 'The efficient frontier represents optimal portfolios. Each point maximizes return for its risk level using mathematical optimization.',
    example: 'If you\'re willing to accept 10% risk, the efficient frontier shows the maximum possible return - say 8%. Any other mix would return less.',
    relatedTopics: ['modern-portfolio-theory', 'optimization', 'risk-return-tradeoff']
  },
  'volatility': {
    id: 'volatility',
    title: 'Volatility',
    brief: 'How much an investment\'s value swings up and down. Higher volatility means bumpier rides but potentially higher returns.',
    detailed: 'Volatility is measured as standard deviation of returns. It\'s the primary measure of investment risk in modern portfolio theory.',
    example: 'A stock with 20% volatility might swing between +20% and -20% in a typical year. Lower volatility means smaller swings.',
    relatedTopics: ['standard-deviation', 'risk', 'beta']
  },
  'beta': {
    id: 'beta',
    title: 'Beta',
    brief: 'Measures how much a stock moves relative to the market. Beta >1 means more volatile than market, <1 means less.',
    detailed: 'Beta helps predict how a stock will behave. High-beta stocks amplify market moves; low-beta stocks are more stable.',
    example: 'Apple with beta 1.2: If market rises 10%, Apple tends to rise 12%. Utility stock with beta 0.5: Market up 10%, utility up 5%.',
    relatedTopics: ['systematic-risk', 'volatility', 'capm']
  },
  'alpha': {
    id: 'alpha',
    title: 'Alpha',
    brief: 'Extra return beyond what\'s expected from risk taken. Positive alpha means beating the market after adjusting for risk.',
    detailed: 'Alpha represents a manager\'s skill. It\'s the return that can\'t be explained by market movements or risk factors.',
    example: 'A fund with 2% alpha returned 2% more than expected given its risk. This excess return suggests skilled management.',
    relatedTopics: ['beta', 'active-management', 'risk-adjusted-returns']
  },
  'risk-tolerance': {
    id: 'risk-tolerance',
    title: 'Risk Tolerance',
    brief: 'Your ability to handle portfolio swings without panic selling. Consider both financial capacity and emotional comfort.',
    detailed: 'Risk tolerance combines your financial situation, time horizon, and psychological comfort with volatility. It guides asset allocation.',
    example: 'Young investor with stable income: High tolerance, 80% stocks. Retiree needing income: Low tolerance, 30% stocks.',
    relatedTopics: ['asset-allocation', 'investment-horizon', 'behavioral-finance']
  },
  'compound-interest': {
    id: 'compound-interest',
    title: 'Compound Interest',
    brief: 'Earning returns on your returns. Small differences in return have huge impacts over time. Time is your greatest asset.',
    detailed: 'Compound interest is why starting early matters. Money grows exponentially, not linearly, making patience profitable.',
    example: '$10,000 at 7% for 30 years becomes $76,000. Wait 10 years to start? Only $38,000. Those 10 years cost $38,000!',
    relatedTopics: ['time-value-of-money', 'investment-horizon', 'dollar-cost-averaging']
  }
};

// Interactive Tutorials
export const tutorials: Tutorial[] = [
  {
    id: 'first-portfolio',
    title: 'Building Your First Portfolio',
    description: 'Learn the basics of portfolio construction, from choosing assets to setting allocations.',
    difficulty: 'beginner',
    estimatedTime: 15,
    steps: [
      {
        id: 1,
        title: 'Welcome to Portfolio Building',
        content: 'A portfolio is a collection of investments. Like a balanced meal, a good portfolio mixes different types of assets for better health.',
        interactive: {
          type: 'chart',
          component: 'PortfolioPieChart',
          props: { 
            data: [
              { name: 'Stocks', value: 60, color: '#3B82F6' },
              { name: 'Bonds', value: 30, color: '#10B981' },
              { name: 'Cash', value: 10, color: '#F59E0B' }
            ]
          }
        }
      },
      {
        id: 2,
        title: 'Understanding Asset Classes',
        content: 'Stocks offer growth but volatility. Bonds provide stability and income. Cash preserves capital but barely beats inflation.',
        interactive: {
          type: 'chart',
          component: 'AssetClassComparison',
          props: {
            showRiskReturn: true,
            highlightTradeoffs: true
          }
        }
      },
      {
        id: 3,
        title: 'Setting Your Asset Mix',
        content: 'Your mix depends on goals and risk tolerance. Younger investors can handle more stocks. Near retirement? More bonds for stability.',
        interactive: {
          type: 'form',
          component: 'RiskToleranceQuiz',
          props: {
            questions: [
              'What is your investment timeline?',
              'How would you react to a 20% portfolio drop?',
              'What is your primary investment goal?'
            ]
          }
        },
        validation: {
          required: true
        }
      },
      {
        id: 4,
        title: 'Choosing Specific Investments',
        content: 'Start with broad index funds for instant diversification. Add individual stocks only after mastering the basics.',
        interactive: {
          type: 'simulation',
          component: 'AssetSelector',
          props: {
            categories: ['Large Cap', 'International', 'Bonds', 'REITs'],
            showEducation: true
          }
        }
      },
      {
        id: 5,
        title: 'Review and Optimize',
        content: 'Our optimizer will suggest improvements to your portfolio, balancing risk and return based on historical data and modern portfolio theory.',
        interactive: {
          type: 'chart',
          component: 'BeforeAfterComparison',
          props: {
            showMetrics: true,
            animateTransition: true
          }
        }
      }
    ]
  },
  {
    id: 'risk-return',
    title: 'Understanding Risk vs Return',
    description: 'Explore the fundamental relationship between risk and return in investing.',
    difficulty: 'beginner',
    estimatedTime: 10,
    steps: [
      {
        id: 1,
        title: 'The Risk-Return Relationship',
        content: 'Higher returns require taking more risk. There\'s no free lunch in investing - every extra percent of return costs some peace of mind.',
        interactive: {
          type: 'chart',
          component: 'RiskReturnScatter',
          props: {
            assets: ['Cash', 'Bonds', 'Stocks', 'Crypto'],
            showRiskPremium: true
          }
        }
      },
      {
        id: 2,
        title: 'Measuring Risk',
        content: 'Risk is measured by volatility - how much returns vary. A calm lake vs choppy seas. Both can get you there, but one\'s a smoother ride.',
        interactive: {
          type: 'simulation',
          component: 'VolatilitySimulator',
          props: {
            compareAssets: true,
            timeHorizon: [1, 5, 20]
          }
        }
      },
      {
        id: 3,
        title: 'Risk-Adjusted Returns',
        content: 'Smart investing means maximizing return per unit of risk. The Sharpe ratio helps identify investments with the best risk-reward balance.',
        interactive: {
          type: 'chart',
          component: 'SharpeRatioComparison',
          props: {
            showCalculation: true,
            includeExamples: true
          }
        }
      },
      {
        id: 4,
        title: 'Your Risk Profile',
        content: 'Your ideal risk level depends on timeline, goals, and temperament. Match your portfolio to your personal situation.',
        interactive: {
          type: 'quiz',
          component: 'RiskProfileAssessment',
          props: {
            factors: ['age', 'income', 'goals', 'experience', 'psychology']
          }
        },
        validation: {
          required: true
        }
      }
    ]
  },
  {
    id: 'diversification-simulation',
    title: 'Why Diversification Works',
    description: 'See diversification in action through interactive simulations.',
    difficulty: 'intermediate',
    estimatedTime: 12,
    steps: [
      {
        id: 1,
        title: 'The Power of Non-Correlation',
        content: 'When assets zigzag differently, portfolio volatility drops. Watch how combining uncorrelated assets smooths the ride.',
        interactive: {
          type: 'simulation',
          component: 'CorrelationSimulator',
          props: {
            adjustableCorrelation: true,
            showPortfolioEffect: true
          }
        }
      },
      {
        id: 2,
        title: 'Diversification Across Asset Classes',
        content: 'Different asset classes shine in different conditions. Stocks for growth, bonds for stability, commodities for inflation protection.',
        interactive: {
          type: 'simulation',
          component: 'MarketScenarioSimulator',
          props: {
            scenarios: ['Bull Market', 'Recession', 'Inflation', 'Stagflation'],
            comparePortfolios: true
          }
        }
      },
      {
        id: 3,
        title: 'Geographic Diversification',
        content: 'Don\'t bet everything on one country. International exposure protects against local economic problems and captures global growth.',
        interactive: {
          type: 'chart',
          component: 'GlobalMarketMap',
          props: {
            showCorrelations: true,
            historicalReturns: true
          }
        }
      },
      {
        id: 4,
        title: 'Optimal Diversification',
        content: 'Too little diversification means unnecessary risk. Too much means diluted returns. Find your sweet spot.',
        interactive: {
          type: 'simulation',
          component: 'DiversificationOptimizer',
          props: {
            showDiminishingReturns: true,
            costAnalysis: true
          }
        }
      }
    ]
  },
  {
    id: 'rebalancing-strategy',
    title: 'When to Rebalance',
    description: 'Learn optimal rebalancing strategies to maintain your target allocation.',
    difficulty: 'intermediate',
    estimatedTime: 10,
    steps: [
      {
        id: 1,
        title: 'Why Rebalance?',
        content: 'Market movements shift your allocation. Rebalancing maintains your risk level and forces buying low, selling high.',
        interactive: {
          type: 'simulation',
          component: 'PortfolioDriftSimulator',
          props: {
            showDriftEffect: true,
            compareStrategies: true
          }
        }
      },
      {
        id: 2,
        title: 'Rebalancing Strategies',
        content: 'Calendar rebalancing: Fixed schedule. Threshold rebalancing: When allocation drifts too far. Each has pros and cons.',
        interactive: {
          type: 'chart',
          component: 'RebalancingStrategyComparison',
          props: {
            strategies: ['Calendar', 'Threshold', 'Hybrid'],
            showCosts: true,
            showReturns: true
          }
        }
      },
      {
        id: 3,
        title: 'Cost Considerations',
        content: 'Rebalancing has costs: taxes and trading fees. Balance maintaining allocation with minimizing expenses.',
        interactive: {
          type: 'simulation',
          component: 'RebalancingCostCalculator',
          props: {
            includeTaxes: true,
            showBreakeven: true
          }
        }
      },
      {
        id: 4,
        title: 'Your Rebalancing Plan',
        content: 'Create a personalized rebalancing strategy based on your situation, tax status, and transaction costs.',
        interactive: {
          type: 'form',
          component: 'RebalancingPlanBuilder',
          props: {
            factors: ['account_type', 'tax_bracket', 'trading_costs', 'time_commitment']
          }
        },
        validation: {
          required: true
        }
      }
    ]
  }
];

// Recommendation Explanation Engine
export class RecommendationEngine {
  static generateExplanation(
    currentPortfolio: any,
    optimizedPortfolio: any,
    constraints: any,
    method: string
  ): RecommendationExplanation {
    const explanation: RecommendationExplanation = {
      summary: '',
      reasons: [],
      constraints: [],
      improvements: [],
      tradeoffs: [],
      confidence: 0
    };

    // Generate summary based on optimization method
    switch (method) {
      case 'mean_variance':
        explanation.summary = 'Optimized for the best risk-adjusted returns using Modern Portfolio Theory.';
        break;
      case 'risk_parity':
        explanation.summary = 'Balanced risk contributions across all assets for more stable performance.';
        break;
      case 'black_litterman':
        explanation.summary = 'Combined market equilibrium with your views for a personalized allocation.';
        break;
      default:
        explanation.summary = 'Optimized portfolio allocation based on historical data and constraints.';
    }

    // Analyze changes and generate reasons
    const significantChanges = this.identifySignificantChanges(currentPortfolio, optimizedPortfolio);
    
    significantChanges.forEach(change => {
      if (change.increase) {
        explanation.reasons.push(
          `Increased ${change.asset} allocation by ${change.amount}% due to favorable risk-return profile`
        );
      } else {
        explanation.reasons.push(
          `Reduced ${change.asset} allocation by ${Math.abs(change.amount)}% to improve diversification`
        );
      }
    });

    // Document active constraints
    if (constraints.minWeight > 0) {
      explanation.constraints.push(
        `Minimum ${(constraints.minWeight * 100).toFixed(0)}% allocation per asset ensures diversification`
      );
    }
    if (constraints.maxWeight < 1) {
      explanation.constraints.push(
        `Maximum ${(constraints.maxWeight * 100).toFixed(0)}% allocation prevents over-concentration`
      );
    }

    // Calculate improvements
    const improvements = this.calculateImprovements(currentPortfolio, optimizedPortfolio);
    explanation.improvements = improvements;

    // Identify tradeoffs
    explanation.tradeoffs = this.identifyTradeoffs(currentPortfolio, optimizedPortfolio);

    // Calculate confidence score
    explanation.confidence = this.calculateConfidence(optimizedPortfolio);

    return explanation;
  }

  private static identifySignificantChanges(current: any, optimized: any): any[] {
    const changes = [];
    const threshold = 0.05; // 5% change threshold

    for (const asset in optimized.weights) {
      const currentWeight = current.weights?.[asset] || 0;
      const optimizedWeight = optimized.weights[asset];
      const change = optimizedWeight - currentWeight;

      if (Math.abs(change) > threshold) {
        changes.push({
          asset,
          amount: (change * 100).toFixed(1),
          increase: change > 0
        });
      }
    }

    return changes.sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }

  private static calculateImprovements(current: any, optimized: any): string[] {
    const improvements = [];

    // Sharpe ratio improvement
    const sharpeImprovement = (optimized.sharpe_ratio - (current.sharpe_ratio || 0.5)) / (current.sharpe_ratio || 0.5) * 100;
    if (sharpeImprovement > 5) {
      improvements.push(`${sharpeImprovement.toFixed(0)}% better risk-adjusted returns (Sharpe ratio)`);
    }

    // Volatility reduction
    const volReduction = (1 - optimized.volatility / (current.volatility || 0.20)) * 100;
    if (volReduction > 5) {
      improvements.push(`${volReduction.toFixed(0)}% lower portfolio volatility`);
    }

    // Diversification improvement
    const diversificationScore = this.calculateDiversificationScore(optimized);
    if (diversificationScore > 0.7) {
      improvements.push('Improved diversification across uncorrelated assets');
    }

    return improvements;
  }

  private static identifyTradeoffs(current: any, optimized: any): string[] {
    const tradeoffs = [];

    // Check if reducing high performers
    const highPerformers = this.identifyHighPerformers(current);
    highPerformers.forEach(asset => {
      if (optimized.weights[asset] < current.weights[asset]) {
        tradeoffs.push(`Reduced allocation to recent winner ${asset} for better risk balance`);
      }
    });

    // Check if increasing volatility for return
    if (optimized.volatility > current.volatility) {
      tradeoffs.push('Accepting slightly higher volatility for improved expected returns');
    }

    // Check sector concentration
    const sectorConcentration = this.calculateSectorConcentration(optimized);
    if (sectorConcentration > 0.4) {
      tradeoffs.push('Some sector concentration remains to capture growth opportunities');
    }

    return tradeoffs;
  }

  private static calculateConfidence(portfolio: any): number {
    let confidence = 0.7; // Base confidence

    // Adjust based on data quality
    if (portfolio.data_points > 252 * 3) confidence += 0.1; // 3+ years of data
    if (portfolio.sharpe_ratio > 1.0) confidence += 0.1;
    if (portfolio.max_drawdown < 0.2) confidence += 0.05;
    if (portfolio.correlation_matrix_condition < 30) confidence += 0.05; // Well-conditioned

    return Math.min(confidence, 0.95);
  }

  private static calculateDiversificationScore(portfolio: any): number {
    // Simplified diversification score based on number of assets and weight distribution
    const numAssets = Object.keys(portfolio.weights).length;
    const weights = Object.values(portfolio.weights) as number[];
    const maxWeight = Math.max(...weights);
    
    const score = (numAssets / 10) * (1 - maxWeight) * 2;
    return Math.min(score, 1.0);
  }

  private static identifyHighPerformers(portfolio: any): string[] {
    // Mock implementation - would use actual performance data
    return [];
  }

  private static calculateSectorConcentration(portfolio: any): number {
    // Mock implementation - would use actual sector data
    return 0.3;
  }
}

// Warning Detection System
export class WarningSystem {
  static analyzePortfolio(portfolio: any, marketData?: any): Warning[] {
    const warnings: Warning[] = [];

    // Check concentration
    const concentrationWarnings = this.checkConcentration(portfolio);
    warnings.push(...concentrationWarnings);

    // Check correlation
    const correlationWarnings = this.checkCorrelation(portfolio);
    warnings.push(...correlationWarnings);

    // Check expectations
    const expectationWarnings = this.checkExpectations(portfolio);
    warnings.push(...expectationWarnings);

    // Check costs
    const costWarnings = this.checkCosts(portfolio);
    warnings.push(...costWarnings);

    return warnings;
  }

  private static checkConcentration(portfolio: any): Warning[] {
    const warnings: Warning[] = [];
    const weights = portfolio.weights || {};
    
    // Single asset concentration
    for (const [asset, weight] of Object.entries(weights)) {
      if ((weight as number) > 0.3) {
        warnings.push({
          id: `concentration-${asset}`,
          type: 'concentration',
          severity: (weight as number) > 0.5 ? 'high' : 'medium',
          title: 'High Single Asset Concentration',
          message: `${asset} represents ${((weight as number) * 100).toFixed(0)}% of your portfolio. This concentration increases risk.`,
          recommendation: 'Consider reducing this position to 20-30% maximum for better diversification.',
          learnMoreTopic: 'diversification'
        });
      }
    }

    // Sector concentration
    const sectorWeights = this.calculateSectorWeights(portfolio);
    for (const [sector, weight] of Object.entries(sectorWeights)) {
      if (weight > 0.4) {
        warnings.push({
          id: `sector-concentration-${sector}`,
          type: 'concentration',
          severity: weight > 0.6 ? 'high' : 'medium',
          title: 'High Sector Concentration',
          message: `${sector} sector represents ${(weight * 100).toFixed(0)}% of your portfolio.`,
          recommendation: 'Diversify across multiple sectors to reduce sector-specific risk.',
          learnMoreTopic: 'diversification'
        });
      }
    }

    return warnings;
  }

  private static checkCorrelation(portfolio: any): Warning[] {
    const warnings: Warning[] = [];
    
    // Check if portfolio has high internal correlation
    const avgCorrelation = this.calculateAverageCorrelation(portfolio);
    if (avgCorrelation > 0.7) {
      warnings.push({
        id: 'high-correlation',
        type: 'correlation',
        severity: avgCorrelation > 0.85 ? 'high' : 'medium',
        title: 'High Portfolio Correlation',
        message: 'Your holdings move together too closely, reducing diversification benefits.',
        recommendation: 'Add assets with lower correlation like bonds, international stocks, or commodities.',
        learnMoreTopic: 'correlation'
      });
    }

    return warnings;
  }

  private static checkExpectations(portfolio: any): Warning[] {
    const warnings: Warning[] = [];
    
    // Check for unrealistic return expectations
    const expectedReturn = portfolio.expected_return || 0;
    if (expectedReturn > 0.15) { // 15% annual return
      warnings.push({
        id: 'high-return-expectation',
        type: 'expectation',
        severity: expectedReturn > 0.20 ? 'high' : 'medium',
        title: 'Aggressive Return Expectations',
        message: `${(expectedReturn * 100).toFixed(0)}% expected return requires high risk. Historical market average is 8-10%.`,
        recommendation: 'Consider more conservative expectations or prepare for higher volatility.',
        learnMoreTopic: 'risk-return'
      });
    }

    // Check risk level vs profile
    const volatility = portfolio.volatility || 0;
    const riskTolerance = portfolio.risk_tolerance || 5;
    if (volatility > 0.25 && riskTolerance < 4) {
      warnings.push({
        id: 'risk-mismatch',
        type: 'expectation',
        severity: 'medium',
        title: 'Risk Level Mismatch',
        message: 'Portfolio volatility exceeds your stated risk tolerance.',
        recommendation: 'Consider reducing allocation to volatile assets or reassessing your risk tolerance.',
        learnMoreTopic: 'risk-tolerance'
      });
    }

    return warnings;
  }

  private static checkCosts(portfolio: any): Warning[] {
    const warnings: Warning[] = [];
    
    // Check rebalancing frequency vs costs
    const rebalanceFreq = portfolio.rebalance_frequency || 'quarterly';
    const estimatedCost = this.estimateRebalancingCost(portfolio, rebalanceFreq);
    
    if (estimatedCost > 0.01) { // 1% annual cost
      warnings.push({
        id: 'high-rebalancing-cost',
        type: 'cost',
        severity: estimatedCost > 0.02 ? 'high' : 'medium',
        title: 'High Rebalancing Costs',
        message: `Frequent rebalancing may cost ${(estimatedCost * 100).toFixed(1)}% annually in fees and taxes.`,
        recommendation: 'Consider less frequent rebalancing or use new contributions to rebalance.',
        learnMoreTopic: 'rebalancing'
      });
    }

    return warnings;
  }

  private static calculateSectorWeights(portfolio: any): Record<string, number> {
    // Mock implementation
    return {
      'Technology': 0.35,
      'Healthcare': 0.15,
      'Financials': 0.20,
      'Consumer': 0.15,
      'Other': 0.15
    };
  }

  private static calculateAverageCorrelation(portfolio: any): number {
    // Mock implementation
    return 0.65;
  }

  private static estimateRebalancingCost(portfolio: any, frequency: string): number {
    const baseCost = 0.002; // 0.2% per rebalance
    const frequencyMultiplier = {
      'monthly': 12,
      'quarterly': 4,
      'semi-annually': 2,
      'annually': 1
    };
    
    return baseCost * (frequencyMultiplier[frequency] || 4);
  }
}

// Educational content helper functions
export const getTooltipContent = (topic: string): TooltipContent | undefined => {
  return tooltipContent[topic];
};

export const getTutorial = (id: string): Tutorial | undefined => {
  return tutorials.find(t => t.id === id);
};

export const getTutorialsByDifficulty = (difficulty: 'beginner' | 'intermediate' | 'advanced'): Tutorial[] => {
  return tutorials.filter(t => t.difficulty === difficulty);
};

export const searchEducationalContent = (query: string): TooltipContent[] => {
  const lowerQuery = query.toLowerCase();
  return Object.values(tooltipContent).filter(content => 
    content.title.toLowerCase().includes(lowerQuery) ||
    content.brief.toLowerCase().includes(lowerQuery) ||
    content.detailed?.toLowerCase().includes(lowerQuery)
  );
};