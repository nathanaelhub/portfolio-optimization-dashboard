/**
 * Professional PDF Report Generator
 * 
 * Creates institutional-grade portfolio reports with comprehensive analysis,
 * professional formatting, and customizable branding.
 */

import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Stack,
  Alert,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  FormControlLabel,
  Checkbox,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Divider
} from '@mui/material';
import {
  GetApp as DownloadIcon,
  PictureAsPdf as PdfIcon,
  Email as EmailIcon,
  Print as PrintIcon,
  Close as CloseIcon,
  Visibility as PreviewIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  Timeline as TimelineIcon
} from '@mui/icons-material';
import { 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { analytics } from '../../services/analytics';

interface ReportConfig {
  title: string;
  subtitle: string;
  clientName: string;
  reportType: 'portfolio_analysis' | 'performance_review' | 'risk_assessment' | 'optimization_results';
  sections: {
    executiveSummary: boolean;
    portfolioOverview: boolean;
    performanceAnalysis: boolean;
    riskAnalysis: boolean;
    recommendations: boolean;
    appendices: boolean;
  };
  formatting: {
    theme: 'professional' | 'modern' | 'minimal';
    colorScheme: 'blue' | 'green' | 'purple';
    includeCharts: boolean;
    includeTables: boolean;
  };
}

interface PortfolioData {
  name: string;
  totalValue: number;
  holdings: Array<{
    symbol: string;
    name: string;
    allocation: number;
    value: number;
    sector: string;
    performance: number;
  }>;
  performance: {
    ytdReturn: number;
    totalReturn: number;
    sharpeRatio: number;
    volatility: number;
    maxDrawdown: number;
    alpha: number;
    beta: number;
  };
  benchmarkComparison: {
    portfolioReturn: number;
    benchmarkReturn: number;
    excessReturn: number;
    trackingError: number;
    informationRatio: number;
  };
}

// Sample portfolio data for demonstration
const SAMPLE_PORTFOLIO: PortfolioData = {
  name: 'Balanced Growth Portfolio',
  totalValue: 1250000,
  holdings: [
    { symbol: 'AAPL', name: 'Apple Inc.', allocation: 0.15, value: 187500, sector: 'Technology', performance: 0.23 },
    { symbol: 'MSFT', name: 'Microsoft Corp.', allocation: 0.12, value: 150000, sector: 'Technology', performance: 0.18 },
    { symbol: 'SPY', name: 'SPDR S&P 500 ETF', allocation: 0.20, value: 250000, sector: 'Broad Market', performance: 0.12 },
    { symbol: 'BND', name: 'Vanguard Total Bond Market', allocation: 0.25, value: 312500, sector: 'Fixed Income', performance: 0.04 },
    { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets', allocation: 0.15, value: 187500, sector: 'International', performance: 0.08 },
    { symbol: 'GOOGL', name: 'Alphabet Inc.', allocation: 0.08, value: 100000, sector: 'Technology', performance: 0.15 },
    { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', allocation: 0.05, value: 62500, sector: 'Real Estate', performance: 0.06 }
  ],
  performance: {
    ytdReturn: 0.085,
    totalReturn: 0.147,
    sharpeRatio: 0.73,
    volatility: 0.145,
    maxDrawdown: -0.089,
    alpha: 0.021,
    beta: 0.85
  },
  benchmarkComparison: {
    portfolioReturn: 0.147,
    benchmarkReturn: 0.132,
    excessReturn: 0.015,
    trackingError: 0.034,
    informationRatio: 0.44
  }
};

const REPORT_THEMES = {
  professional: { primary: '#1976d2', secondary: '#f5f5f5', accent: '#ff9800' },
  modern: { primary: '#2e7d32', secondary: '#e8f5e8', accent: '#ff5722' },
  minimal: { primary: '#424242', secondary: '#fafafa', accent: '#9c27b0' }
};

export const PDFReportGenerator: React.FC = () => {
  const [reportConfig, setReportConfig] = useState<ReportConfig>({
    title: 'Portfolio Analysis Report',
    subtitle: 'Comprehensive Investment Review & Recommendations',
    clientName: 'Demo Client',
    reportType: 'portfolio_analysis',
    sections: {
      executiveSummary: true,
      portfolioOverview: true,
      performanceAnalysis: true,
      riskAnalysis: true,
      recommendations: true,
      appendices: false
    },
    formatting: {
      theme: 'professional',
      colorScheme: 'blue',
      includeCharts: true,
      includeTables: true
    }
  });

  const [generating, setGenerating] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const handleGenerateReport = async (action: 'download' | 'preview' | 'email') => {
    setGenerating(true);
    
    try {
      // Track report generation
      analytics.trackFeatureUsage('pdf_report_generator', 'report_generated', {
        report_type: reportConfig.reportType,
        action: action,
        sections_count: Object.values(reportConfig.sections).filter(Boolean).length
      });

      // Simulate report generation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      if (action === 'preview') {
        setPreviewOpen(true);
      } else if (action === 'download') {
        // In a real implementation, this would generate and download the PDF
        console.log('Generating PDF with config:', reportConfig);
        
        // Create a sample download link
        const element = document.createElement('a');
        element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(
          `Portfolio Analysis Report - ${new Date().toLocaleDateString()}\n\nThis would be a professionally formatted PDF report.`
        );
        element.download = `portfolio-report-${Date.now()}.pdf`;
        element.click();
      } else if (action === 'email') {
        // Simulate email sending
        alert('Report would be sent via email to the specified recipients.');
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const ReportPreview: React.FC = () => (
    <Box sx={{ p: 3, bgcolor: 'background.paper', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 4, pb: 2, borderBottom: '2px solid', borderColor: 'primary.main' }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          {reportConfig.title}
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          {reportConfig.subtitle}
        </Typography>
        <Typography variant="body1">
          Prepared for: <strong>{reportConfig.clientName}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Report Date: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </Typography>
      </Box>

      {/* Executive Summary */}
      {reportConfig.sections.executiveSummary && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Executive Summary
          </Typography>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="h6" color="success.main">
                      +{(SAMPLE_PORTFOLIO.performance.ytdReturn * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Year-to-Date Return
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6">
                      {SAMPLE_PORTFOLIO.performance.sharpeRatio.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sharpe Ratio
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="h6" color="primary.main">
                      ${(SAMPLE_PORTFOLIO.totalValue / 1000).toFixed(0)}K
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Portfolio Value
                    </Typography>
                  </Box>
                </Stack>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="body2" paragraph>
                  <strong>Portfolio Performance:</strong> The portfolio has delivered strong 
                  risk-adjusted returns, outperforming the benchmark by 
                  {(SAMPLE_PORTFOLIO.benchmarkComparison.excessReturn * 100).toFixed(1)}% 
                  with a Sharpe ratio of {SAMPLE_PORTFOLIO.performance.sharpeRatio.toFixed(2)}.
                </Typography>
                <Typography variant="body2" paragraph>
                  <strong>Risk Management:</strong> Volatility remains controlled at 
                  {(SAMPLE_PORTFOLIO.performance.volatility * 100).toFixed(1)}% with 
                  maximum drawdown limited to 
                  {Math.abs(SAMPLE_PORTFOLIO.performance.maxDrawdown * 100).toFixed(1)}%.
                </Typography>
                <Typography variant="body2">
                  <strong>Recommendation:</strong> Maintain current allocation with 
                  quarterly rebalancing to capture market opportunities while 
                  managing downside risk.
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
      )}

      {/* Portfolio Overview */}
      {reportConfig.sections.portfolioOverview && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Portfolio Overview
          </Typography>
          
          {reportConfig.formatting.includeCharts && (
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300 }}>
                  <Typography variant="h6" gutterBottom>
                    Asset Allocation
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={SAMPLE_PORTFOLIO.holdings}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={80}
                        dataKey="allocation"
                        label={({symbol, allocation}) => `${symbol}: ${(allocation * 100).toFixed(0)}%`}
                      >
                        {SAMPLE_PORTFOLIO.holdings.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={`hsl(${index * 60}, 70%, 50%)`} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `${(value * 100).toFixed(1)}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, height: 300 }}>
                  <Typography variant="h6" gutterBottom>
                    Sector Distribution
                  </Typography>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={[
                        { sector: 'Technology', allocation: 0.35 },
                        { sector: 'Fixed Income', allocation: 0.25 },
                        { sector: 'Broad Market', allocation: 0.20 },
                        { sector: 'International', allocation: 0.15 },
                        { sector: 'Real Estate', allocation: 0.05 }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="sector" angle={-45} textAnchor="end" height={60} />
                      <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                      <Tooltip formatter={(value: any) => `${(value * 100).toFixed(1)}%`} />
                      <Bar dataKey="allocation" fill="#1976d2" />
                    </BarChart>
                  </ResponsiveContainer>
                </Paper>
              </Grid>
            </Grid>
          )}

          {reportConfig.formatting.includeTables && (
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Symbol</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Allocation</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Value</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Performance</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {SAMPLE_PORTFOLIO.holdings.map((holding) => (
                    <TableRow key={holding.symbol}>
                      <TableCell fontWeight="bold">{holding.symbol}</TableCell>
                      <TableCell>{holding.name}</TableCell>
                      <TableCell align="right">{(holding.allocation * 100).toFixed(1)}%</TableCell>
                      <TableCell align="right">${holding.value.toLocaleString()}</TableCell>
                      <TableCell align="right">
                        <Chip
                          label={`${holding.performance > 0 ? '+' : ''}${(holding.performance * 100).toFixed(1)}%`}
                          color={holding.performance > 0 ? 'success' : 'error'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}

      {/* Performance Analysis */}
      {reportConfig.sections.performanceAnalysis && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Performance Analysis
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 2, height: 300 }}>
                <Typography variant="h6" gutterBottom>
                  Performance vs Benchmark
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={[
                      { month: 'Jan', portfolio: 100, benchmark: 100 },
                      { month: 'Feb', portfolio: 102, benchmark: 101 },
                      { month: 'Mar', portfolio: 98, benchmark: 96 },
                      { month: 'Apr', portfolio: 106, benchmark: 103 },
                      { month: 'May', portfolio: 109, benchmark: 107 },
                      { month: 'Jun', portfolio: 113, benchmark: 110 },
                      { month: 'Jul', portfolio: 116, benchmark: 112 },
                      { month: 'Aug', portfolio: 114, benchmark: 111 },
                      { month: 'Sep', portfolio: 118, benchmark: 115 },
                      { month: 'Oct', portfolio: 121, benchmark: 117 },
                      { month: 'Nov', portfolio: 125, benchmark: 120 },
                      { month: 'Dec', portfolio: 128, benchmark: 122 }
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="portfolio" stroke="#1976d2" strokeWidth={2} name="Portfolio" />
                    <Line type="monotone" dataKey="benchmark" stroke="#ff9800" strokeWidth={2} name="Benchmark" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2, height: 300 }}>
                <Typography variant="h6" gutterBottom>
                  Key Metrics
                </Typography>
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Total Return</Typography>
                    <Typography variant="h6">{(SAMPLE_PORTFOLIO.performance.totalReturn * 100).toFixed(1)}%</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Alpha</Typography>
                    <Typography variant="h6">{(SAMPLE_PORTFOLIO.performance.alpha * 100).toFixed(1)}%</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Beta</Typography>
                    <Typography variant="h6">{SAMPLE_PORTFOLIO.performance.beta.toFixed(2)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary">Information Ratio</Typography>
                    <Typography variant="h6">{SAMPLE_PORTFOLIO.benchmarkComparison.informationRatio.toFixed(2)}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Risk Analysis */}
      {reportConfig.sections.riskAnalysis && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Risk Analysis
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Metrics
                </Typography>
                <List>
                  <ListItem>
                    <ListItemIcon><SecurityIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Volatility"
                      secondary={`${(SAMPLE_PORTFOLIO.performance.volatility * 100).toFixed(1)}% annualized`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><TrendingUpIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Maximum Drawdown"
                      secondary={`${Math.abs(SAMPLE_PORTFOLIO.performance.maxDrawdown * 100).toFixed(1)}%`}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon><AssessmentIcon color="primary" /></ListItemIcon>
                    <ListItemText
                      primary="Tracking Error"
                      secondary={`${(SAMPLE_PORTFOLIO.benchmarkComparison.trackingError * 100).toFixed(1)}%`}
                    />
                  </ListItem>
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Risk Assessment
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Low Risk:</strong> Portfolio volatility is well-controlled 
                    and maximum drawdown remains within acceptable limits.
                  </Typography>
                </Alert>
                <Alert severity="info">
                  <Typography variant="body2">
                    <strong>Diversification:</strong> Good sector and geographic 
                    diversification reduces concentration risk.
                  </Typography>
                </Alert>
              </Paper>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Recommendations */}
      {reportConfig.sections.recommendations && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h5" gutterBottom color="primary.main">
            Recommendations
          </Typography>
          
          <Paper sx={{ p: 3 }}>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Maintain Current Allocation"
                  secondary="The current asset allocation is well-optimized for the risk-return profile."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Quarterly Rebalancing"
                  secondary="Implement quarterly rebalancing to maintain target allocations and capture market opportunities."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Consider ESG Integration"
                  secondary="Explore ESG investment options for enhanced long-term sustainability."
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Monitor Risk Factors"
                  secondary="Continue monitoring interest rate sensitivity and sector concentration risk."
                />
              </ListItem>
            </List>
          </Paper>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ textAlign: 'center', mt: 6, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
        <Typography variant="body2" color="text.secondary">
          This report was generated by the Portfolio Optimization Dashboard
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Report ID: POR-{Date.now()} | Generated: {new Date().toLocaleString()}
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <PdfIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Professional PDF Reports
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate institutional-grade portfolio analysis reports
              </Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Create comprehensive PDF reports with customizable sections, professional formatting,
              and detailed analytics suitable for client presentations and regulatory requirements.
            </Typography>
          </Alert>
        </CardContent>
      </Card>

      {/* Report Configuration */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Report Configuration
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Report Title"
                    value={reportConfig.title}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Client Name"
                    value={reportConfig.clientName}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, clientName: e.target.value }))}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Subtitle"
                    value={reportConfig.subtitle}
                    onChange={(e) => setReportConfig(prev => ({ ...prev, subtitle: e.target.value }))}
                  />
                </Grid>
              </Grid>

              <Typography variant="subtitle1" gutterBottom>
                Report Sections
              </Typography>
              <Grid container spacing={1} sx={{ mb: 3 }}>
                {Object.entries(reportConfig.sections).map(([key, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={key}>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={value}
                          onChange={(e) => setReportConfig(prev => ({
                            ...prev,
                            sections: { ...prev.sections, [key]: e.target.checked }
                          }))}
                        />
                      }
                      label={key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    />
                  </Grid>
                ))}
              </Grid>

              <Typography variant="subtitle1" gutterBottom>
                Formatting Options
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={reportConfig.formatting.theme}
                      onChange={(e) => setReportConfig(prev => ({
                        ...prev,
                        formatting: { ...prev.formatting, theme: e.target.value as any }
                      }))}
                      label="Theme"
                    >
                      <MenuItem value="professional">Professional</MenuItem>
                      <MenuItem value="modern">Modern</MenuItem>
                      <MenuItem value="minimal">Minimal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportConfig.formatting.includeCharts}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          formatting: { ...prev.formatting, includeCharts: e.target.checked }
                        }))}
                      />
                    }
                    label="Include Charts"
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={reportConfig.formatting.includeTables}
                        onChange={(e) => setReportConfig(prev => ({
                          ...prev,
                          formatting: { ...prev.formatting, includeTables: e.target.checked }
                        }))}
                      />
                    }
                    label="Include Tables"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Generate Report
              </Typography>
              
              <Stack spacing={2}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  startIcon={generating ? <CircularProgress size={20} /> : <PreviewIcon />}
                  onClick={() => handleGenerateReport('preview')}
                  disabled={generating}
                >
                  Preview Report
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleGenerateReport('download')}
                  disabled={generating}
                >
                  Download PDF
                </Button>
                
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EmailIcon />}
                  onClick={() => handleGenerateReport('email')}
                  disabled={generating}
                >
                  Email Report
                </Button>
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Report Features
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Professional formatting"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Interactive charts & tables"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Customizable branding"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckIcon color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Regulatory compliance"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { height: '90vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">Report Preview</Typography>
            <IconButton onClick={() => setPreviewOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ overflow: 'auto', height: '100%' }}>
            <ReportPreview />
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default PDFReportGenerator;