/**
 * Stripe Premium Features Integration
 * 
 * Demonstrates monetization potential with tiered pricing and
 * premium feature gating. Shows commercial viability.
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Switch,
  FormControlLabel,
  Avatar,
  Divider,
  Stack,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Diamond as PremiumIcon,
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Psychology as AIIcon,
  Assessment as ReportsIcon,
  Speed as SpeedIcon,
  Security as SecurityIcon,
  Support as SupportIcon,
  CloudSync as CloudIcon,
  Analytics as AnalyticsIcon,
  Lock as LockIcon,
  CreditCard as CardIcon
} from '@mui/icons-material';
import { analytics } from '../services/analytics';

interface PricingTier {
  id: string;
  name: string;
  price: number;
  period: 'month' | 'year';
  popular?: boolean;
  features: Array<{
    name: string;
    included: boolean;
    premium?: boolean;
    tooltip?: string;
  }>;
  limitations: {
    portfolios: number;
    optimizations: number;
    apiCalls: number;
    storage: string;
  };
  stripeProductId?: string;
}

interface PremiumFeature {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  tier: 'free' | 'pro' | 'enterprise';
  enabled: boolean;
  usage?: {
    current: number;
    limit: number;
  };
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: 'month',
    features: [
      { name: 'Basic Portfolio Optimization', included: true, tooltip: 'Markowitz optimization only' },
      { name: 'Demo Portfolios', included: true },
      { name: 'Educational Mode', included: true },
      { name: 'Basic Charts', included: true },
      { name: 'CSV Export', included: true },
      { name: 'Advanced Algorithms', included: false, premium: true },
      { name: 'Real-time Data', included: false, premium: true },
      { name: 'ML Predictions', included: false, premium: true },
      { name: 'API Access', included: false, premium: true },
      { name: 'Priority Support', included: false, premium: true }
    ],
    limitations: {
      portfolios: 3,
      optimizations: 50,
      apiCalls: 0,
      storage: '100MB'
    }
  },
  {
    id: 'pro',
    name: 'Professional',
    price: 29,
    period: 'month',
    popular: true,
    features: [
      { name: 'All Free Features', included: true },
      { name: 'Advanced Algorithms', included: true, tooltip: 'Black-Litterman, Risk Parity' },
      { name: 'Real-time Market Data', included: true },
      { name: 'ML Predictions', included: true, tooltip: '63% accuracy predictions' },
      { name: 'Professional Reports', included: true },
      { name: 'Backtesting Engine', included: true },
      { name: 'API Access', included: true, tooltip: '10,000 calls/month' },
      { name: 'Email Support', included: true },
      { name: 'White-label Options', included: false, premium: true },
      { name: 'Custom Integrations', included: false, premium: true }
    ],
    limitations: {
      portfolios: 25,
      optimizations: 1000,
      apiCalls: 10000,
      storage: '5GB'
    },
    stripeProductId: 'prod_professional'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 199,
    period: 'month',
    features: [
      { name: 'All Professional Features', included: true },
      { name: 'White-label Solution', included: true },
      { name: 'Custom Integrations', included: true },
      { name: 'Dedicated Support', included: true },
      { name: 'SLA Guarantee', included: true, tooltip: '99.99% uptime SLA' },
      { name: 'Custom ML Models', included: true },
      { name: 'Advanced Analytics', included: true },
      { name: 'Multi-tenant Dashboard', included: true },
      { name: 'Audit Logging', included: true },
      { name: 'SAML/SSO Integration', included: true }
    ],
    limitations: {
      portfolios: 999,
      optimizations: 99999,
      apiCalls: 1000000,
      storage: 'Unlimited'
    },
    stripeProductId: 'prod_enterprise'
  }
];

const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'ml_predictions',
    name: 'AI Market Predictions',
    description: 'Machine learning models with 63% directional accuracy',
    icon: <AIIcon />,
    tier: 'pro',
    enabled: false,
    usage: { current: 0, limit: 100 }
  },
  {
    id: 'advanced_algorithms',
    name: 'Advanced Optimization',
    description: 'Black-Litterman, Risk Parity, and custom algorithms',
    icon: <TrendingUpIcon />,
    tier: 'pro',
    enabled: false
  },
  {
    id: 'professional_reports',
    name: 'Professional PDF Reports',
    description: 'Institutional-grade reports with custom branding',
    icon: <ReportsIcon />,
    tier: 'pro',
    enabled: false,
    usage: { current: 2, limit: 10 }
  },
  {
    id: 'real_time_data',
    name: 'Real-time Market Data',
    description: 'Live price feeds and portfolio monitoring',
    icon: <SpeedIcon />,
    tier: 'pro',
    enabled: false
  },
  {
    id: 'api_access',
    name: 'API Access',
    description: 'RESTful API for custom integrations',
    icon: <CloudIcon />,
    tier: 'pro',
    enabled: false,
    usage: { current: 150, limit: 10000 }
  },
  {
    id: 'advanced_analytics',
    name: 'Advanced Analytics',
    description: 'Custom dashboards and deep insights',
    icon: <AnalyticsIcon />,
    tier: 'enterprise',
    enabled: false
  }
];

export const StripeIntegration: React.FC = () => {
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [checkoutDialog, setCheckoutDialog] = useState(false);
  const [selectedTier, setSelectedTier] = useState<PricingTier | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [annualBilling, setAnnualBilling] = useState(false);

  const handleUpgrade = useCallback((tier: PricingTier) => {
    setSelectedTier(tier);
    setCheckoutDialog(true);
    analytics.trackFeatureUsage('stripe_integration', 'upgrade_initiated', {
      tier: tier.id,
      price: tier.price
    });
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!selectedTier) return;

    setIsProcessing(true);
    
    try {
      // In production, this would create a Stripe Checkout session
      analytics.trackConversion('subscription_purchase');
      
      // Simulate Stripe Checkout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock successful payment
      setCurrentTier(selectedTier.id);
      alert(`✅ Successfully upgraded to ${selectedTier.name}!\n\nYour premium features are now active.`);
      
    } catch (error) {
      analytics.trackError(error as Error, { context: 'stripe_checkout' });
      alert('❌ Payment failed. Please try again.');
    } finally {
      setIsProcessing(false);
      setCheckoutDialog(false);
    }
  }, [selectedTier]);

  const handleFeatureClick = useCallback((feature: PremiumFeature) => {
    if (!feature.enabled) {
      analytics.trackFeatureUsage('stripe_integration', 'premium_feature_clicked', {
        feature: feature.id,
        tier_required: feature.tier
      });
      
      const requiredTier = PRICING_TIERS.find(t => t.id === feature.tier);
      if (requiredTier) {
        const upgrade = window.confirm(
          `This feature requires ${requiredTier.name} plan ($${requiredTier.price}/${requiredTier.period}).\n\nWould you like to upgrade?`
        );
        if (upgrade) {
          handleUpgrade(requiredTier);
        }
      }
    }
  }, [handleUpgrade]);

  const PricingCard: React.FC<{ tier: PricingTier }> = ({ tier }) => (
    <Card
      sx={{
        height: '100%',
        position: 'relative',
        border: tier.popular ? '2px solid' : '1px solid',
        borderColor: tier.popular ? 'primary.main' : 'divider',
        transform: tier.popular ? 'scale(1.05)' : 'none'
      }}
    >
      {tier.popular && (
        <Chip
          label="Most Popular"
          color="primary"
          size="small"
          sx={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1
          }}
        />
      )}
      
      <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            {tier.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center' }}>
            <Typography variant="h3" fontWeight="bold" color="primary.main">
              ${annualBilling && tier.price > 0 ? Math.round(tier.price * 10) : tier.price}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
              /{annualBilling && tier.price > 0 ? 'year' : tier.period}
            </Typography>
          </Box>
          {annualBilling && tier.price > 0 && (
            <Chip label="2 months free" color="success" size="small" sx={{ mt: 1 }} />
          )}
        </Box>

        <List dense sx={{ flexGrow: 1 }}>
          {tier.features.map((feature, index) => (
            <ListItem key={index}>
              <ListItemIcon sx={{ minWidth: 32 }}>
                {feature.included ? (
                  <CheckIcon color="success" fontSize="small" />
                ) : (
                  <CloseIcon color="disabled" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography
                      variant="body2"
                      sx={{
                        color: feature.included ? 'text.primary' : 'text.disabled',
                        textDecoration: !feature.included ? 'line-through' : 'none'
                      }}
                    >
                      {feature.name}
                    </Typography>
                    {feature.premium && (
                      <Chip label="PRO" size="small" color="primary" sx={{ ml: 1, height: 20 }} />
                    )}
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>

        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom display="block">
            Limits:
          </Typography>
          <Grid container spacing={1}>
            <Grid item xs={6}>
              <Typography variant="caption">
                {tier.limitations.portfolios} portfolios
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption">
                {tier.limitations.optimizations} optimizations/mo
              </Typography>
            </Grid>
          </Grid>
        </Box>

        <Button
          fullWidth
          variant={tier.popular ? 'contained' : 'outlined'}
          size="large"
          sx={{ mt: 2 }}
          onClick={() => handleUpgrade(tier)}
          disabled={currentTier === tier.id}
        >
          {currentTier === tier.id ? 'Current Plan' : 
           tier.price === 0 ? 'Get Started' : `Upgrade to ${tier.name}`}
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'warning.main', mr: 2 }}>
              <PremiumIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Premium Features & Pricing
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Unlock advanced capabilities for professional portfolio management
              </Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Demo Integration:</strong> This showcases Stripe payment processing. 
              In production, this would handle real subscriptions and feature gating.
            </Typography>
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={annualBilling}
                onChange={(e) => setAnnualBilling(e.target.checked)}
              />
            }
            label="Annual Billing (Save 17%)"
          />
        </CardContent>
      </Card>

      {/* Pricing Tiers */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {PRICING_TIERS.map((tier) => (
          <Grid item xs={12} md={4} key={tier.id}>
            <PricingCard tier={tier} />
          </Grid>
        ))}
      </Grid>

      {/* Premium Features Demo */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Premium Features Demo
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Click on locked features to see upgrade prompts
          </Typography>

          <Grid container spacing={2}>
            {PREMIUM_FEATURES.map((feature) => (
              <Grid item xs={12} sm={6} md={4} key={feature.id}>
                <Paper
                  sx={{
                    p: 2,
                    cursor: 'pointer',
                    opacity: feature.enabled ? 1 : 0.6,
                    border: '1px solid',
                    borderColor: feature.enabled ? 'success.main' : 'divider',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                  onClick={() => handleFeatureClick(feature)}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {feature.icon}
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ ml: 1, flexGrow: 1 }}>
                      {feature.name}
                    </Typography>
                    {!feature.enabled && <LockIcon color="disabled" fontSize="small" />}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {feature.description}
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Chip
                      label={feature.tier.toUpperCase()}
                      size="small"
                      color={
                        feature.tier === 'free' ? 'default' :
                        feature.tier === 'pro' ? 'primary' : 'secondary'
                      }
                    />
                    
                    {feature.usage && (
                      <Typography variant="caption" color="text.secondary">
                        {feature.usage.current}/{feature.usage.limit}
                      </Typography>
                    )}
                  </Box>

                  {feature.usage && (
                    <LinearProgress
                      variant="determinate"
                      value={(feature.usage.current / feature.usage.limit) * 100}
                      sx={{ mt: 1 }}
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Enterprise Features */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Enterprise Solutions
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Custom solutions for financial institutions and large organizations
          </Typography>

          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <SecurityIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Enterprise Security"
                    secondary="SAML/SSO, audit logging, compliance reporting"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <SupportIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Dedicated Support"
                    secondary="24/7 support with dedicated account manager"
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <CloudIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Custom Deployment"
                    secondary="On-premise, private cloud, or hybrid solutions"
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                  Contact Sales
                </Typography>
                <Typography variant="body2" paragraph>
                  Get a custom quote for enterprise features and volume pricing.
                </Typography>
                <Button variant="contained" size="large">
                  Schedule Demo
                </Button>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      <Dialog
        open={checkoutDialog}
        onClose={() => setCheckoutDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <CardIcon sx={{ mr: 1 }} />
            Upgrade to {selectedTier?.name}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedTier && (
            <Box>
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>Demo Checkout:</strong> This is a demonstration of Stripe integration. 
                  No actual payment will be processed.
                </Typography>
              </Alert>

              <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Order Summary
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography>{selectedTier.name} Plan</Typography>
                  <Typography fontWeight="bold">
                    ${annualBilling && selectedTier.price > 0 ? 
                      Math.round(selectedTier.price * 10) : selectedTier.price}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Billing Period
                  </Typography>
                  <Typography variant="body2">
                    {annualBilling && selectedTier.price > 0 ? 'Annual' : 'Monthly'}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">Total</Typography>
                  <Typography variant="h6" color="primary.main">
                    ${annualBilling && selectedTier.price > 0 ? 
                      Math.round(selectedTier.price * 10) : selectedTier.price}
                    /{annualBilling && selectedTier.price > 0 ? 'year' : 'month'}
                  </Typography>
                </Box>
              </Paper>

              <Typography variant="body2" color="text.secondary">
                By proceeding, you agree to our Terms of Service and Privacy Policy. 
                You can cancel your subscription at any time.
              </Typography>

              {isProcessing && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    Processing payment...
                  </Typography>
                  <LinearProgress />
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setCheckoutDialog(false)}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCheckout}
            disabled={isProcessing}
            startIcon={<CardIcon />}
          >
            {isProcessing ? 'Processing...' : 'Upgrade Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StripeIntegration;