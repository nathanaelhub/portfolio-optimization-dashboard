/**
 * Guided Tour Component
 * 
 * Provides an interactive guided tour for first-time users to learn
 * about portfolio optimization features and navigation.
 */

import React, { useState, useEffect } from 'react';
import { 
  Button, 
  Dialog, 
  DialogContent, 
  DialogTitle, 
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Card,
  CardContent
} from '@mui/material';
import {
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Lightbulb as TipIcon
} from '@mui/icons-material';
import { getTourConfig, isDemoMode } from '../../config/demoMode';

interface TourStep {
  id: string;
  title: string;
  content: string;
  target: string;
  placement: 'top' | 'bottom' | 'left' | 'right';
  action?: 'click' | 'hover' | 'scroll';
  tips?: string[];
  nextButtonText?: string;
  skipable?: boolean;
}

interface GuidedTourProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
  autoStart?: boolean;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    title: '🎉 Welcome to Portfolio Optimization Dashboard!',
    content: 'Welcome to your comprehensive portfolio management platform. This tour will guide you through the key features and help you get started with optimizing your investments.',
    target: '.main-container',
    placement: 'bottom',
    tips: [
      'This demo contains real portfolio optimization algorithms',
      'All data is simulated but calculations are accurate',
      'You can skip this tour anytime and return later'
    ],
    nextButtonText: 'Start Tour'
  },
  {
    id: 'dashboard-overview',
    title: '📊 Portfolio Dashboard',
    content: 'This is your main portfolio dashboard. Here you can view all your portfolios, their current values, performance metrics, and key statistics at a glance.',
    target: '.portfolio-overview',
    placement: 'bottom',
    action: 'scroll',
    tips: [
      'Green indicates positive performance',
      'Click on any portfolio to view details',
      'Performance data updates in real-time'
    ]
  },
  {
    id: 'portfolio-creation',
    title: '➕ Create Your First Portfolio',
    content: 'Start by creating a new portfolio. You can add assets manually, import from CSV, or choose from our pre-built templates.',
    target: '.create-portfolio-btn',
    placement: 'bottom',
    action: 'click',
    tips: [
      'Templates are great for beginners',
      'CSV import supports major brokers',
      'You can always modify later'
    ]
  },
  {
    id: 'asset-allocation',
    title: '🥧 Asset Allocation View',
    content: 'Visualize your portfolio allocation with interactive pie charts. See how your investments are distributed across different assets, sectors, and asset classes.',
    target: '.asset-allocation',
    placement: 'right',
    tips: [
      'Hover over segments for details',
      'Drag to adjust allocations',
      'Color coding by asset class'
    ]
  },
  {
    id: 'optimization-engine',
    title: '🧠 Portfolio Optimization',
    content: 'This is where the magic happens! Use our advanced optimization algorithms to find the optimal asset allocation for your risk tolerance and return objectives.',
    target: '.optimization-panel',
    placement: 'left',
    tips: [
      'Choose from multiple optimization methods',
      'Set custom constraints and limits',
      'Results update in real-time'
    ]
  },
  {
    id: 'efficient-frontier',
    title: '📈 Efficient Frontier',
    content: 'The efficient frontier shows the optimal risk-return combinations. Your current portfolio is plotted against the optimal frontier to show improvement opportunities.',
    target: '.efficient-frontier-chart',
    placement: 'top',
    tips: [
      'Higher and left is better (more return, less risk)',
      'Interactive - click points to see allocations',
      'Updates when you change constraints'
    ]
  },
  {
    id: 'risk-analysis',
    title: '⚠️ Risk Analysis',
    content: 'Monitor your portfolio risk with comprehensive metrics including Value at Risk (VaR), volatility, Sharpe ratio, and maximum drawdown analysis.',
    target: '.risk-metrics',
    placement: 'right',
    tips: [
      'VaR shows potential losses',
      'Sharpe ratio measures risk-adjusted returns',
      'All metrics are industry-standard'
    ]
  },
  {
    id: 'performance-tracking',
    title: '📊 Performance Analytics',
    content: 'Track your portfolio performance over time with detailed charts, benchmark comparisons, and attribution analysis.',
    target: '.performance-chart',
    placement: 'bottom',
    tips: [
      'Compare against market benchmarks',
      'Zoom in on specific time periods',
      'Export data for external analysis'
    ]
  },
  {
    id: 'backtesting',
    title: '⏮️ Historical Backtesting',
    content: 'Test your portfolio strategy against historical data to see how it would have performed in different market conditions.',
    target: '.backtesting-panel',
    placement: 'left',
    tips: [
      'Test multiple time periods',
      'Include transaction costs',
      'Compare different rebalancing frequencies'
    ]
  },
  {
    id: 'data-import-export',
    title: '📁 Data Management',
    content: 'Import portfolio data from CSV files or export your optimized allocations for implementation with your broker.',
    target: '.import-export-section',
    placement: 'top',
    tips: [
      'Supports major broker CSV formats',
      'Export includes target allocations',
      'Sample files available for testing'
    ]
  },
  {
    id: 'completion',
    title: '🎓 Tour Complete!',
    content: 'Congratulations! You\'ve completed the guided tour. You\'re now ready to start optimizing your portfolios. Remember, you can always access help and documentation from the menu.',
    target: '.main-container',
    placement: 'bottom',
    tips: [
      'Try the sample portfolios first',
      'Documentation is available in the help menu',
      'Contact support if you need assistance'
    ],
    nextButtonText: 'Start Investing!'
  }
];

export const GuidedTour: React.FC<GuidedTourProps> = ({
  open,
  onClose,
  onComplete,
  autoStart = false
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [hasStarted, setHasStarted] = useState(false);

  const tourConfig = getTourConfig();

  useEffect(() => {
    if (open && autoStart && !hasStarted) {
      setIsActive(true);
      setHasStarted(true);
    }
  }, [open, autoStart, hasStarted]);

  useEffect(() => {
    // Check if user has completed tour before
    const tourCompleted = localStorage.getItem('tour_completed');
    if (tourCompleted && !isDemoMode()) {
      return;
    }

    // Auto-highlight current step element
    if (isActive && TOUR_STEPS[currentStep]) {
      const targetElement = document.querySelector(TOUR_STEPS[currentStep].target);
      if (targetElement) {
        targetElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
        
        // Add highlight class
        targetElement.classList.add('tour-highlight');
        
        // Remove highlight after step
        return () => {
          targetElement.classList.remove('tour-highlight');
        };
      }
    }
  }, [currentStep, isActive]);

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleStepClick = (stepIndex: number) => {
    setCurrentStep(stepIndex);
  };

  const handleSkip = () => {
    onClose();
    localStorage.setItem('tour_skipped', 'true');
  };

  const handleComplete = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    localStorage.setItem('tour_completed', 'true');
    onComplete();
    setIsActive(false);
  };

  const handleStart = () => {
    setIsActive(true);
    setCurrentStep(0);
    setHasStarted(true);
  };

  const currentTourStep = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  if (!open) return null;

  return (
    <>
      {/* Tour Dialog */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: '500px'
          }
        }}
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          pb: 1
        }}>
          <Typography variant="h5" component="div">
            {!isActive ? 'Welcome Tour' : currentTourStep.title}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {!isActive ? (
            // Welcome screen
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <TipIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Welcome to Portfolio Optimization Dashboard!
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Take a guided tour to learn about our advanced portfolio optimization features
                and get the most out of your investment analysis.
              </Typography>
              
              <Box sx={{ my: 3 }}>
                <Chip 
                  icon={<CheckCircle />} 
                  label={`${TOUR_STEPS.length} steps`} 
                  color="primary" 
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label="5 minutes" 
                  variant="outlined" 
                  sx={{ mr: 1 }}
                />
                <Chip 
                  label="Interactive" 
                  variant="outlined" 
                />
              </Box>

              <Typography variant="body2" color="text.secondary" paragraph>
                You'll learn about:
              </Typography>
              
              <Box sx={{ textAlign: 'left', maxWidth: '400px', mx: 'auto' }}>
                {[
                  'Portfolio creation and management',
                  'Advanced optimization algorithms', 
                  'Risk analysis and metrics',
                  'Performance tracking and backtesting',
                  'Data import and export features'
                ].map((feature, index) => (
                  <Typography key={index} variant="body2" sx={{ mb: 1 }}>
                    • {feature}
                  </Typography>
                ))}
              </Box>
            </Box>
          ) : (
            // Tour content
            <Box>
              {/* Progress stepper */}
              <Box sx={{ mb: 3 }}>
                <Stepper activeStep={currentStep} alternativeLabel>
                  {TOUR_STEPS.map((step, index) => (
                    <Step 
                      key={step.id} 
                      completed={completedSteps.has(index)}
                      sx={{ cursor: 'pointer' }}
                      onClick={() => handleStepClick(index)}
                    >
                      <StepLabel>{`Step ${index + 1}`}</StepLabel>
                    </Step>
                  ))}
                </Stepper>
              </Box>

              {/* Step content */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {currentTourStep.title}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {currentTourStep.content}
                  </Typography>

                  {/* Tips section */}
                  {currentTourStep.tips && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        💡 Pro Tips:
                      </Typography>
                      {currentTourStep.tips.map((tip, index) => (
                        <Typography 
                          key={index} 
                          variant="body2" 
                          color="text.secondary"
                          sx={{ mb: 0.5 }}
                        >
                          • {tip}
                        </Typography>
                      ))}
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Step indicator */}
              <Box sx={{ textAlign: 'center', mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Step {currentStep + 1} of {TOUR_STEPS.length}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 3 }}>
          {!isActive ? (
            <>
              <Button onClick={handleSkip} color="inherit">
                Skip Tour
              </Button>
              <Button 
                onClick={handleStart} 
                variant="contained" 
                startIcon={<StartIcon />}
                size="large"
              >
                Start Tour
              </Button>
            </>
          ) : (
            <>
              <Box>
                <Button 
                  onClick={handleBack} 
                  disabled={isFirstStep}
                  startIcon={<BackIcon />}
                >
                  Back
                </Button>
                <Button onClick={handleSkip} sx={{ ml: 1 }}>
                  Skip Tour
                </Button>
              </Box>
              
              <Button 
                onClick={handleNext}
                variant="contained"
                endIcon={isLastStep ? <CompleteIcon /> : <NextIcon />}
              >
                {isLastStep 
                  ? (currentTourStep.nextButtonText || 'Complete Tour')
                  : (currentTourStep.nextButtonText || 'Next')
                }
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Tour highlight styles */}
      <style>
        {`
          .tour-highlight {
            position: relative;
            z-index: 1000;
            box-shadow: 0 0 0 4px rgba(25, 118, 210, 0.4) !important;
            border-radius: 8px;
            transition: box-shadow 0.3s ease;
          }
          
          .tour-highlight::before {
            content: '';
            position: absolute;
            top: -8px;
            left: -8px;
            right: -8px;
            bottom: -8px;
            border: 2px solid #1976d2;
            border-radius: 12px;
            pointer-events: none;
            animation: pulse 2s infinite;
          }
          
          @keyframes pulse {
            0% {
              box-shadow: 0 0 0 0 rgba(25, 118, 210, 0.7);
            }
            70% {
              box-shadow: 0 0 0 10px rgba(25, 118, 210, 0);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(25, 118, 210, 0);
            }
          }
        `}
      </style>
    </>
  );
};

export default GuidedTour;