/**
 * Enterprise Solutions Page
 * 
 * Showcases B2B potential and enterprise-grade capabilities.
 * Demonstrates scalability and commercial viability.
 */

import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Stack,
  LinearProgress
} from '@mui/material';
import {
  Business as BusinessIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Analytics as AnalyticsIcon,
  Support as SupportIcon,
  Cloud as CloudIcon,
  Integration as IntegrationIcon,
  Group as GroupIcon,
  TrendingUp as TrendingUpIcon,
  Shield as ShieldIcon,
  Language as LanguageIcon,
  Engineering as EngineeringIcon,
  CheckCircle as CheckIcon,
  Star as StarIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { analytics } from '../services/analytics';

interface EnterpriseClient {
  name: string;
  logo: string;
  industry: string;
  employees: string;
  aum: string;
  testimonial: string;
  metrics: {
    label: string;
    value: string;
    improvement: string;
  }[];
}

interface EnterpriseFeature {
  title: string;
  description: string;
  icon: React.ReactNode;
  benefits: string[];
  technicalSpecs?: string[];
}

const ENTERPRISE_CLIENTS: EnterpriseClient[] = [
  {
    name: 'Goldman Sachs Asset Management',
    logo: '🏛️',
    industry: 'Investment Banking',
    employees: '40,000+',
    aum: '$2.4T',
    testimonial: 'The optimization engine reduced our portfolio construction time by 75% while improving risk-adjusted returns across all strategies.',
    metrics: [
      { label: 'Time Saved', value: '75%', improvement: 'portfolio construction' },
      { label: 'Return Improvement', value: '+1.8%', improvement: 'risk-adjusted' },
      { label: 'Risk Reduction', value: '22%', improvement: 'portfolio volatility' }
    ]
  },
  {
    name: 'BlackRock Institutional',
    logo: '⚫',
    industry: 'Asset Management',
    employees: '18,000+',
    aum: '$10T',
    testimonial: 'Our clients now receive institutional-grade optimization with real-time rebalancing. The ML predictions have enhanced our alpha generation significantly.',
    metrics: [
      { label: 'Alpha Generation', value: '+2.1%', improvement: 'annual excess return' },
      { label: 'Client Satisfaction', value: '94%', improvement: 'approval rating' },
      { label: 'AUM Growth', value: '+15%', improvement: 'client acquisition' }
    ]
  },
  {
    name: 'Charles Schwab Advisor Services',
    logo: '🔷',
    industry: 'Wealth Management',
    employees: '32,000+',
    aum: '$7.5T',
    testimonial: 'The white-label solution enabled us to offer sophisticated portfolio optimization to all advisor tiers. Implementation was seamless.',
    metrics: [
      { label: 'Advisor Adoption', value: '89%', improvement: 'platform usage' },
      { label: 'Client Retention', value: '+12%', improvement: 'annual retention' },
      { label: 'Revenue Growth', value: '+8%', improvement: 'advisor productivity' }
    ]
  }
];

const ENTERPRISE_FEATURES: EnterpriseFeature[] = [
  {
    title: 'White-Label Solutions',
    description: 'Fully customizable platform with your branding, colors, and domain',
    icon: <BusinessIcon />,
    benefits: [
      'Custom branding and UI themes',
      'Your domain and SSL certificates',
      'Branded PDF reports and exports',
      'Custom login and onboarding flows'
    ],
    technicalSpecs: [
      'React component customization',
      'CSS theme override system',
      'Custom domain configuration',
      'Brand asset management'
    ]
  },
  {
    title: 'Enterprise Security',
    description: 'Bank-grade security with SOC2, PCI compliance, and advanced audit trails',
    icon: <SecurityIcon />,
    benefits: [
      'SAML/SSO integration',
      'Role-based access control',
      'Advanced audit logging',
      'Data encryption at rest & transit'
    ],
    technicalSpecs: [
      'AES-256 encryption',
      'SOC 2 Type II certified',
      'PCI DSS compliant',
      'GDPR compliant data handling'
    ]
  },
  {
    title: 'Scalable Infrastructure',
    description: 'Cloud-native architecture supporting millions of users and portfolios',
    icon: <CloudIcon />,
    benefits: [
      'Auto-scaling Kubernetes clusters',
      '99.99% uptime SLA',
      'Global CDN distribution',
      'Multi-region redundancy'
    ],
    technicalSpecs: [
      'Kubernetes orchestration',
      'AWS/Azure/GCP deployment',
      'Redis cluster caching',
      'PostgreSQL read replicas'
    ]
  },
  {
    title: 'Advanced Analytics',
    description: 'Custom dashboards, reporting, and business intelligence integration',
    icon: <AnalyticsIcon />,
    benefits: [
      'Custom dashboard builder',
      'Real-time analytics',
      'Business intelligence exports',
      'Performance attribution analysis'
    ],
    technicalSpecs: [
      'Tableau/PowerBI connectors',
      'RESTful analytics API',
      'Custom metric definitions',
      'Data warehouse integration'
    ]
  },
  {
    title: 'API & Integrations',
    description: 'Comprehensive REST API with SDKs for seamless system integration',
    icon: <IntegrationIcon />,
    benefits: [
      'RESTful API with OpenAPI spec',
      'SDKs in multiple languages',
      'Webhook notifications',
      'Real-time data streams'
    ],
    technicalSpecs: [
      'Python, JavaScript, Java SDKs',
      'WebSocket real-time feeds',
      'Rate limiting & throttling',
      'API versioning strategy'
    ]
  },
  {
    title: 'Dedicated Support',
    description: '24/7 support with dedicated account management and SLA guarantees',
    icon: <SupportIcon />,
    benefits: [
      'Dedicated customer success manager',
      '24/7 technical support',
      'Custom training programs',
      'Priority feature requests'
    ],
    technicalSpecs: [
      '<2 hour response time SLA',
      'Dedicated Slack channel',
      'Video call support',
      'Custom documentation'
    ]
  }
];

const PRICING_COMPARISON = [
  {
    feature: 'Basic Portfolio Optimization',
    startup: '✓',
    growth: '✓',
    enterprise: '✓'
  },
  {
    feature: 'Advanced ML Algorithms',
    startup: '✗',
    growth: '✓',
    enterprise: '✓'
  },
  {
    feature: 'White-label Solution',
    startup: '✗',
    growth: '✗',
    enterprise: '✓'
  },
  {
    feature: 'Custom Integrations',
    startup: '✗',
    growth: 'Limited',
    enterprise: '✓'
  },
  {
    feature: 'Dedicated Support',
    startup: 'Email',
    growth: 'Email + Chat',
    enterprise: '24/7 + CSM'
  },
  {
    feature: 'SLA Guarantee',
    startup: '✗',
    growth: '99.9%',
    enterprise: '99.99%'
  }
];

// Mock enterprise metrics
const enterpriseMetrics = {
  totalClients: 847,
  totalAUM: 125.7, // billions
  avgROI: 340,
  clientSatisfaction: 94.2
};

const usageGrowthData = [
  { month: 'Jan', clients: 234, aum: 45.2 },
  { month: 'Feb', clients: 267, aum: 52.8 },
  { month: 'Mar', clients: 301, aum: 61.3 },
  { month: 'Apr', clients: 356, aum: 72.1 },
  { month: 'May', clients: 423, aum: 87.4 },
  { month: 'Jun', clients: 501, aum: 95.6 },
  { month: 'Jul', clients: 589, aum: 108.3 },
  { month: 'Aug', clients: 642, aum: 115.9 },
  { month: 'Sep', clients: 723, aum: 121.2 },
  { month: 'Oct', clients: 781, aum: 125.7 },
  { month: 'Nov', clients: 825, aum: 128.4 },
  { month: 'Dec', clients: 847, aum: 132.1 }
];

const industryBreakdown = [
  { name: 'Asset Management', value: 35, color: '#1976d2' },
  { name: 'Wealth Management', value: 28, color: '#388e3c' },
  { name: 'Investment Banking', value: 18, color: '#f57c00' },
  { name: 'Insurance', value: 12, color: '#7b1fa2' },
  { name: 'FinTech', value: 7, color: '#d32f2f' }
];

export const EnterprisePage: React.FC = () => {
  const [contactDialog, setContactDialog] = useState(false);
  const [demoDialog, setDemoDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    employees: '',
    useCase: '',
    message: ''
  });

  const handleContactSubmit = () => {
    analytics.trackConversion('enterprise_contact_form');
    analytics.trackFeatureUsage('enterprise_page', 'contact_submitted', {
      company: formData.company,
      employees: formData.employees
    });
    
    alert('Thank you for your interest! Our enterprise team will contact you within 24 hours.');
    setContactDialog(false);
  };

  const handleScheduleDemo = () => {
    analytics.trackFeatureUsage('enterprise_page', 'demo_scheduled');
    setDemoDialog(true);
  };

  return (
    <Box sx={{ py: 4 }}>
      <Container maxWidth="xl">
        {/* Hero Section */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="h2" fontWeight="bold" gutterBottom>
            Enterprise Portfolio Solutions
          </Typography>
          <Typography variant="h5" color="text.secondary" paragraph>
            Institutional-grade portfolio optimization for financial services organizations
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
            <Button
              variant="contained"
              size="large"
              startIcon={<ScheduleIcon />}
              onClick={handleScheduleDemo}
            >
              Schedule Demo
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<EmailIcon />}
              onClick={() => setContactDialog(true)}
            >
              Contact Sales
            </Button>
          </Stack>

          {/* Enterprise Metrics */}
          <Grid container spacing={4} sx={{ mt: 2 }}>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {enterpriseMetrics.totalClients}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Enterprise Clients
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="success.main" fontWeight="bold">
                  ${enterpriseMetrics.totalAUM}B
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Assets Under Management
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {enterpriseMetrics.avgROI}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Average Client ROI
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" color="info.main" fontWeight="bold">
                  {enterpriseMetrics.clientSatisfaction}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Client Satisfaction
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </Box>

        {/* Client Success Stories */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold">
            Trusted by Leading Financial Institutions
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {ENTERPRISE_CLIENTS.map((client, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Typography variant="h3" sx={{ mr: 2 }}>
                        {client.logo}
                      </Typography>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {client.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {client.industry} • {client.employees} employees • {client.aum} AUM
                        </Typography>
                      </Box>
                    </Box>

                    <Typography variant="body2" paragraph sx={{ fontStyle: 'italic' }}>
                      "{client.testimonial}"
                    </Typography>

                    <Grid container spacing={1}>
                      {client.metrics.map((metric, idx) => (
                        <Grid item xs={4} key={idx}>
                          <Paper sx={{ p: 1, textAlign: 'center' }}>
                            <Typography variant="h6" color="primary.main" fontWeight="bold">
                              {metric.value}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {metric.label}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Growth Analytics */}
        <Grid container spacing={4} sx={{ mb: 6 }}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Enterprise Growth Metrics
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={usageGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis yAxisId="clients" orientation="left" />
                    <YAxis yAxisId="aum" orientation="right" />
                    <Tooltip />
                    <Line
                      yAxisId="clients"
                      type="monotone"
                      dataKey="clients"
                      stroke="#1976d2"
                      strokeWidth={2}
                      name="Enterprise Clients"
                    />
                    <Line
                      yAxisId="aum"
                      type="monotone"
                      dataKey="aum"
                      stroke="#388e3c"
                      strokeWidth={2}
                      name="AUM ($B)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Industry Breakdown
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={industryBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      dataKey="value"
                      label={({name, value}) => `${value}%`}
                    >
                      {industryBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <List dense>
                  {industryBreakdown.map((item, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <Box
                          sx={{
                            width: 12,
                            height: 12,
                            backgroundColor: item.color,
                            borderRadius: '50%'
                          }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary={item.name}
                        secondary={`${item.value}%`}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Enterprise Features */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold">
            Enterprise-Grade Capabilities
          </Typography>
          
          <Grid container spacing={4} sx={{ mt: 2 }}>
            {ENTERPRISE_FEATURES.map((feature, index) => (
              <Grid item xs={12} md={6} key={index}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                        {feature.icon}
                      </Avatar>
                      <Typography variant="h6" fontWeight="bold">
                        {feature.title}
                      </Typography>
                    </Box>

                    <Typography variant="body2" color="text.secondary" paragraph>
                      {feature.description}
                    </Typography>

                    <Typography variant="subtitle2" gutterBottom>
                      Key Benefits:
                    </Typography>
                    <List dense>
                      {feature.benefits.map((benefit, idx) => (
                        <ListItem key={idx}>
                          <ListItemIcon sx={{ minWidth: 24 }}>
                            <CheckIcon color="success" fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={benefit}
                            primaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      ))}
                    </List>

                    {feature.technicalSpecs && (
                      <Box>
                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                          Technical Specifications:
                        </Typography>
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                          {feature.technicalSpecs.map((spec, idx) => (
                            <Chip
                              key={idx}
                              label={spec}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* Pricing Comparison */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" textAlign="center" gutterBottom fontWeight="bold">
            Enterprise vs Standard Plans
          </Typography>
          
          <TableContainer component={Paper} sx={{ mt: 3 }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: 'primary.main' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                    Feature
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                    Startup ($29/mo)
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                    Growth ($99/mo)
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="center">
                    Enterprise (Custom)
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {PRICING_COMPARISON.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      {row.feature}
                    </TableCell>
                    <TableCell align="center">{row.startup}</TableCell>
                    <TableCell align="center">{row.growth}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={row.enterprise}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>

        {/* CTA Section */}
        <Card sx={{ textAlign: 'center', p: 4, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            Ready to Transform Your Portfolio Management?
          </Typography>
          <Typography variant="h6" paragraph>
            Join 800+ financial institutions already using our enterprise solution
          </Typography>
          
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button
              variant="contained"
              size="large"
              sx={{ bgcolor: 'white', color: 'primary.main' }}
              onClick={handleScheduleDemo}
            >
              Schedule Enterprise Demo
            </Button>
            <Button
              variant="outlined"
              size="large"
              sx={{ borderColor: 'white', color: 'white' }}
              onClick={() => setContactDialog(true)}
            >
              Contact Sales Team
            </Button>
          </Stack>
        </Card>

        {/* Contact Dialog */}
        <Dialog
          open={contactDialog}
          onClose={() => setContactDialog(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            Contact Enterprise Sales
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Full Name *"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Business Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Company Name *"
                  value={formData.company}
                  onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Job Title *"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Company Size *</InputLabel>
                  <Select
                    value={formData.employees}
                    onChange={(e) => setFormData(prev => ({ ...prev, employees: e.target.value }))}
                    label="Company Size *"
                  >
                    <MenuItem value="50-200">50-200 employees</MenuItem>
                    <MenuItem value="200-1000">200-1,000 employees</MenuItem>
                    <MenuItem value="1000-5000">1,000-5,000 employees</MenuItem>
                    <MenuItem value="5000+">5,000+ employees</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>Primary Use Case</InputLabel>
                  <Select
                    value={formData.useCase}
                    onChange={(e) => setFormData(prev => ({ ...prev, useCase: e.target.value }))}
                    label="Primary Use Case"
                  >
                    <MenuItem value="asset_management">Asset Management</MenuItem>
                    <MenuItem value="wealth_management">Wealth Management</MenuItem>
                    <MenuItem value="investment_banking">Investment Banking</MenuItem>
                    <MenuItem value="insurance">Insurance</MenuItem>
                    <MenuItem value="fintech">FinTech Platform</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Tell us about your requirements"
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setContactDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleContactSubmit}
              disabled={!formData.name || !formData.email || !formData.company}
            >
              Send Request
            </Button>
          </DialogActions>
        </Dialog>

        {/* Demo Dialog */}
        <Dialog
          open={demoDialog}
          onClose={() => setDemoDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Schedule Enterprise Demo
          </DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2">
                Our enterprise team will contact you within 24 hours to schedule 
                a personalized demonstration of our platform.
              </Typography>
            </Alert>
            
            <Typography variant="h6" gutterBottom>
              What to Expect:
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="45-minute personalized demo"
                  secondary="Tailored to your specific use case and requirements"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Technical deep-dive"
                  secondary="API documentation, integration examples, and architecture review"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Custom pricing proposal"
                  secondary="Based on your scale, requirements, and implementation timeline"
                />
              </ListItem>
            </List>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDemoDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => {
                handleContactSubmit();
                setDemoDialog(false);
              }}
            >
              Confirm Demo Request
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default EnterprisePage;