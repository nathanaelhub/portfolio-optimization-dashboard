/**
 * Educational Mode Component
 * 
 * Interactive learning system that makes portfolio optimization concepts
 * accessible to beginners while maintaining professional depth.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  Stack,
  LinearProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tabs,
  Tab,
  Grid,
  Tooltip,
  Avatar
} from '@mui/material';
import {
  School as SchoolIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  CheckCircle as CheckIcon,
  Lightbulb as LightbulbIcon,
  Quiz as QuizIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  PieChart as PieChartIcon,
  Close as CloseIcon,
  NavigateNext as NextIcon,
  NavigateBefore as BackIcon,
  Psychology as PsychologyIcon,
  Calculate as CalculateIcon,
  ShowChart as ShowChartIcon
} from '@mui/icons-material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip,
  Scatter,
  ScatterChart
} from 'recharts';
import { analytics } from '../../services/analytics';

interface LearningModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  topics: string[];
  interactive: boolean;
  completed?: boolean;
}

interface ConceptExplanation {
  term: string;
  definition: string;
  example?: string;
  formula?: string;
  visualization?: React.ReactNode;
}

const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'portfolio-basics',
    title: 'Portfolio Basics',
    description: 'Understanding portfolios, diversification, and risk-return fundamentals',
    icon: <PieChartIcon />,
    difficulty: 'beginner',
    estimatedTime: '15 min',
    topics: ['What is a portfolio?', 'Diversification benefits', 'Asset allocation', 'Risk vs Return'],
    interactive: true
  },
  {
    id: 'modern-portfolio-theory',
    title: 'Modern Portfolio Theory',
    description: 'Learn Markowitz optimization and the efficient frontier concept',
    icon: <CalculateIcon />,
    difficulty: 'intermediate',
    estimatedTime: '25 min',
    topics: ['Markowitz Model', 'Efficient Frontier', 'Sharpe Ratio', 'Optimization Math'],
    interactive: true
  },
  {
    id: 'risk-metrics',
    title: 'Risk Measurement',
    description: 'Understanding volatility, VaR, drawdowns, and other risk metrics',
    icon: <SecurityIcon />,
    difficulty: 'intermediate',
    estimatedTime: '20 min',
    topics: ['Volatility', 'Value at Risk', 'Maximum Drawdown', 'Beta & Alpha'],
    interactive: true
  },
  {
    id: 'advanced-strategies',
    title: 'Advanced Strategies',
    description: 'Black-Litterman, Risk Parity, and machine learning approaches',
    icon: <PsychologyIcon />,
    difficulty: 'advanced',
    estimatedTime: '35 min',
    topics: ['Black-Litterman', 'Risk Parity', 'Factor Models', 'ML Integration'],
    interactive: true
  }
];

const PORTFOLIO_CONCEPTS: ConceptExplanation[] = [
  {
    term: 'Diversification',
    definition: 'Spreading investments across different assets to reduce risk',
    example: 'Instead of buying only tech stocks, mix stocks, bonds, and real estate',
    visualization: (
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="body2" color="success.main">✓ Diversified Portfolio</Typography>
        <Typography variant="caption">40% Stocks, 40% Bonds, 20% Real Estate</Typography>
        <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>✗ Concentrated Portfolio</Typography>
        <Typography variant="caption">100% Tech Stocks</Typography>
      </Box>
    )
  },
  {
    term: 'Sharpe Ratio',
    definition: 'Measures risk-adjusted return - higher is better',
    formula: 'Sharpe = (Return - Risk-free Rate) / Volatility',
    example: 'A portfolio with 10% return and 15% volatility vs 3% risk-free rate: Sharpe = (10-3)/15 = 0.47'
  },
  {
    term: 'Efficient Frontier',
    definition: 'The set of optimal portfolios for each level of risk',
    example: 'Shows the best possible return for any given level of risk tolerance'
  }
];

const DIFFICULTY_COLORS = {
  beginner: '#4caf50',
  intermediate: '#ff9800',
  advanced: '#f44336'
};

export const EducationalMode: React.FC = () => {
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const [completedModules, setCompletedModules] = useState<Set<string>>(new Set());
  const [currentStep, setCurrentStep] = useState(0);
  const [conceptDialogOpen, setConceptDialogOpen] = useState(false);
  const [selectedConcept, setSelectedConcept] = useState<ConceptExplanation | null>(null);
  const [quizMode, setQuizMode] = useState(false);
  const [progress, setProgress] = useState(0);

  // Sample data for interactive visualizations
  const diversificationData = [
    { name: 'Stocks', value: 60, color: '#1976d2' },
    { name: 'Bonds', value: 30, color: '#388e3c' },
    { name: 'Real Estate', value: 10, color: '#f57c00' }
  ];

  const efficientFrontierData = [
    { risk: 5, return: 3 },
    { risk: 8, return: 5 },
    { risk: 12, return: 7 },
    { risk: 15, return: 8.5 },
    { risk: 20, return: 10 },
    { risk: 25, return: 11 }
  ];

  useEffect(() => {
    // Load saved progress
    const saved = localStorage.getItem('educational_progress');
    if (saved) {
      const { completed, progress: savedProgress } = JSON.parse(saved);
      setCompletedModules(new Set(completed));
      setProgress(savedProgress);
    }
  }, []);

  const handleModuleComplete = (moduleId: string) => {
    const newCompleted = new Set([...completedModules, moduleId]);
    setCompletedModules(newCompleted);
    
    const newProgress = (newCompleted.size / LEARNING_MODULES.length) * 100;
    setProgress(newProgress);
    
    // Save progress
    localStorage.setItem('educational_progress', JSON.stringify({
      completed: Array.from(newCompleted),
      progress: newProgress
    }));

    // Track completion
    analytics.trackFeatureUsage('educational_mode', 'module_completed', {
      module_id: moduleId,
      total_progress: newProgress
    });
  };

  const handleConceptClick = (concept: ConceptExplanation) => {
    setSelectedConcept(concept);
    setConceptDialogOpen(true);
    analytics.trackEngagement('concept_explanation_viewed', 'Educational Mode', concept.term);
  };

  const ModuleCard: React.FC<{ module: LearningModule }> = ({ module }) => {
    const isCompleted = completedModules.has(module.id);
    
    return (
      <Card
        sx={{
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: 4
          },
          border: isCompleted ? '2px solid' : '1px solid',
          borderColor: isCompleted ? 'success.main' : 'divider'
        }}
        onClick={() => setActiveModule(module.id)}
      >
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar
              sx={{
                bgcolor: DIFFICULTY_COLORS[module.difficulty],
                mr: 2
              }}
            >
              {module.icon}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" fontWeight="bold">
                {module.title}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                <Chip
                  label={module.difficulty}
                  size="small"
                  sx={{
                    bgcolor: DIFFICULTY_COLORS[module.difficulty],
                    color: 'white'
                  }}
                />
                <Chip
                  label={module.estimatedTime}
                  size="small"
                  variant="outlined"
                />
                {isCompleted && (
                  <Chip
                    label="Completed"
                    size="small"
                    color="success"
                    icon={<CheckIcon />}
                  />
                )}
              </Stack>
            </Box>
          </Box>
          
          <Typography variant="body2" color="text.secondary" paragraph>
            {module.description}
          </Typography>
          
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {module.topics.map((topic) => (
              <Chip
                key={topic}
                label={topic}
                size="small"
                variant="outlined"
                sx={{ mb: 0.5 }}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  const InteractiveLesson: React.FC<{ moduleId: string }> = ({ moduleId }) => {
    const module = LEARNING_MODULES.find(m => m.id === moduleId);
    if (!module) return null;

    if (moduleId === 'portfolio-basics') {
      return (
        <Box>
          <Typography variant="h5" gutterBottom>
            Portfolio Basics Interactive Lesson
          </Typography>
          
          <Stepper activeStep={currentStep} orientation="vertical">
            <Step>
              <StepLabel>What is a Portfolio?</StepLabel>
              <StepContent>
                <Typography paragraph>
                  A portfolio is a collection of investments held by an individual or institution.
                  Think of it as your investment "basket" containing different types of assets.
                </Typography>
                
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    💡 <strong>Example:</strong> Your portfolio might contain 60% stocks, 30% bonds, and 10% real estate.
                  </Typography>
                </Alert>

                <Box sx={{ height: 200, mb: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={diversificationData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        dataKey="value"
                        label={({name, value}) => `${name}: ${value}%`}
                      >
                        {diversificationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>

                <Button
                  variant="contained"
                  onClick={() => setCurrentStep(1)}
                  startIcon={<NextIcon />}
                >
                  Next: Why Diversify?
                </Button>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>The Power of Diversification</StepLabel>
              <StepContent>
                <Typography paragraph>
                  Diversification reduces risk by spreading investments across different asset classes.
                  When one investment goes down, others might go up, smoothing your overall returns.
                </Typography>

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: 'error.light', color: 'white' }}>
                      <Typography variant="h6">❌ All Tech Stocks</Typography>
                      <Typography variant="body2">
                        High risk - if tech crashes, you lose everything
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, bgcolor: 'success.light', color: 'white' }}>
                      <Typography variant="h6">✅ Mixed Portfolio</Typography>
                      <Typography variant="body2">
                        Lower risk - different assets balance each other
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentStep(0)}
                    startIcon={<BackIcon />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    onClick={() => setCurrentStep(2)}
                    startIcon={<NextIcon />}
                  >
                    Next: Risk vs Return
                  </Button>
                </Stack>
              </StepContent>
            </Step>

            <Step>
              <StepLabel>Risk vs Return Trade-off</StepLabel>
              <StepContent>
                <Typography paragraph>
                  In investing, higher potential returns usually come with higher risk.
                  The key is finding the right balance for your goals and comfort level.
                </Typography>

                <Box sx={{ height: 250, mb: 2 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart data={efficientFrontierData}>
                      <CartesianGrid />
                      <XAxis 
                        dataKey="risk" 
                        name="Risk (%)"
                        label={{ value: 'Risk (%)', position: 'insideBottom', offset: -5 }}
                      />
                      <YAxis 
                        dataKey="return" 
                        name="Return (%)"
                        label={{ value: 'Return (%)', angle: -90, position: 'insideLeft' }}
                      />
                      <RechartsTooltip formatter={(value, name) => [`${value}%`, name]} />
                      <Scatter dataKey="return" fill="#1976d2" />
                    </ScatterChart>
                  </ResponsiveContainer>
                </Box>

                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    🎯 <strong>Goal:</strong> Find the optimal risk-return combination for your needs!
                  </Typography>
                </Alert>

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    onClick={() => setCurrentStep(1)}
                    startIcon={<BackIcon />}
                  >
                    Back
                  </Button>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => {
                      handleModuleComplete(moduleId);
                      setActiveModule(null);
                    }}
                    startIcon={<CheckIcon />}
                  >
                    Complete Module
                  </Button>
                </Stack>
              </StepContent>
            </Step>
          </Stepper>
        </Box>
      );
    }

    // Placeholder for other modules
    return (
      <Box>
        <Typography variant="h5" gutterBottom>
          {module.title} - Coming Soon!
        </Typography>
        <Typography paragraph>
          This interactive lesson is under development. Check back soon for:
        </Typography>
        <List>
          {module.topics.map((topic) => (
            <ListItem key={topic}>
              <ListItemIcon>
                <LightbulbIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary={topic} />
            </ListItem>
          ))}
        </List>
        <Button
          variant="outlined"
          onClick={() => setActiveModule(null)}
        >
          Back to Modules
        </Button>
      </Box>
    );
  };

  if (activeModule) {
    return (
      <Box>
        <Button
          startIcon={<BackIcon />}
          onClick={() => {
            setActiveModule(null);
            setCurrentStep(0);
          }}
          sx={{ mb: 2 }}
        >
          Back to Learning Modules
        </Button>
        <InteractiveLesson moduleId={activeModule} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Avatar
          sx={{
            bgcolor: 'primary.main',
            width: 64,
            height: 64,
            mx: 'auto',
            mb: 2
          }}
        >
          <SchoolIcon sx={{ fontSize: 32 }} />
        </Avatar>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          Educational Mode
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph>
          Learn portfolio optimization from the ground up with interactive lessons
        </Typography>
        
        {/* Progress */}
        <Box sx={{ maxWidth: 400, mx: 'auto', mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Learning Progress</Typography>
            <Typography variant="body2">{Math.round(progress)}%</Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{ height: 8, borderRadius: 4 }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
            {completedModules.size} of {LEARNING_MODULES.length} modules completed
          </Typography>
        </Box>
      </Box>

      {/* Learning Modules */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {LEARNING_MODULES.map((module) => (
          <Grid item xs={12} md={6} key={module.id}>
            <ModuleCard module={module} />
          </Grid>
        ))}
      </Grid>

      {/* Quick Concepts */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            📚 Quick Concept Reference
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Click on any concept to get a detailed explanation with examples
          </Typography>
          
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 1 }}>
            {PORTFOLIO_CONCEPTS.map((concept) => (
              <Chip
                key={concept.term}
                label={concept.term}
                clickable
                onClick={() => handleConceptClick(concept)}
                icon={<LightbulbIcon />}
                variant="outlined"
              />
            ))}
          </Stack>
        </CardContent>
      </Card>

      {/* Learning Tips */}
      <Alert severity="info">
        <Typography variant="h6" gutterBottom>
          💡 Learning Tips
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <PlayIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Start with Portfolio Basics if you're new to investing"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <QuizIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Try the interactive examples - learning by doing is most effective"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 24 }}>
              <CheckIcon color="primary" fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Complete modules in order - each builds on the previous concepts"
              primaryTypographyProps={{ variant: 'body2' }}
            />
          </ListItem>
        </List>
      </Alert>

      {/* Concept Dialog */}
      <Dialog
        open={conceptDialogOpen}
        onClose={() => setConceptDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">
              {selectedConcept?.term}
            </Typography>
            <IconButton onClick={() => setConceptDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedConcept && (
            <Box>
              <Typography variant="body1" paragraph>
                {selectedConcept.definition}
              </Typography>
              
              {selectedConcept.formula && (
                <Paper sx={{ p: 2, mb: 2, bgcolor: 'background.default' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Formula:
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace">
                    {selectedConcept.formula}
                  </Typography>
                </Paper>
              )}
              
              {selectedConcept.example && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Example:
                  </Typography>
                  <Typography variant="body2">
                    {selectedConcept.example}
                  </Typography>
                </Alert>
              )}
              
              {selectedConcept.visualization && (
                <Box sx={{ mt: 2 }}>
                  {selectedConcept.visualization}
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default EducationalMode;