/**
 * Plaid API Integration Component
 * 
 * Demonstrates real-world account connectivity for portfolio import.
 * Uses Plaid Link for secure bank/brokerage account connections.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Avatar,
  Grid,
  LinearProgress,
  IconButton,
  Tooltip,
  Divider,
  Paper
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  TrendingUp as InvestmentIcon,
  Security as SecurityIcon,
  Sync as SyncIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon,
  Link as LinkIcon,
  Shield as ShieldIcon
} from '@mui/icons-material';
import { analytics } from '../services/analytics';

// Mock Plaid Link implementation
interface PlaidLinkOptions {
  token: string;
  onSuccess: (publicToken: string, metadata: any) => void;
  onExit: (error: any, metadata: any) => void;
  onEvent: (eventType: string, metadata: any) => void;
}

// Mock connected accounts data
interface ConnectedAccount {
  id: string;
  institutionName: string;
  institutionId: string;
  accountName: string;
  accountType: 'investment' | 'bank' | 'credit';
  mask: string;
  balance: number;
  holdings?: Array<{
    symbol: string;
    name: string;
    quantity: number;
    price: number;
    value: number;
  }>;
  lastUpdated: string;
  status: 'connected' | 'error' | 'updating';
}

const MOCK_CONNECTED_ACCOUNTS: ConnectedAccount[] = [
  {
    id: 'acc_1',
    institutionName: 'Chase',
    institutionId: 'ins_chase',
    accountName: 'Chase Investment Account',
    accountType: 'investment',
    mask: '4242',
    balance: 125000,
    holdings: [
      { symbol: 'AAPL', name: 'Apple Inc.', quantity: 100, price: 175.50, value: 17550 },
      { symbol: 'MSFT', name: 'Microsoft Corp.', quantity: 80, price: 380.25, value: 30420 },
      { symbol: 'SPY', name: 'SPDR S&P 500 ETF', quantity: 50, price: 450.75, value: 22537.50 },
      { symbol: 'BND', name: 'Vanguard Total Bond Market', quantity: 200, price: 78.90, value: 15780 }
    ],
    lastUpdated: new Date(Date.now() - 5 * 60000).toISOString(),
    status: 'connected'
  },
  {
    id: 'acc_2',
    institutionName: 'Fidelity',
    institutionId: 'ins_fidelity',
    accountName: 'Fidelity 401(k)',
    accountType: 'investment',
    mask: '8765',
    balance: 85000,
    holdings: [
      { symbol: 'FXNAX', name: 'Fidelity US Bond Index', quantity: 500, price: 11.25, value: 5625 },
      { symbol: 'FZROX', name: 'Fidelity Zero Total Market', quantity: 400, price: 16.80, value: 6720 },
      { symbol: 'FTIHX', name: 'Fidelity Total International', quantity: 300, price: 13.45, value: 4035 }
    ],
    lastUpdated: new Date(Date.now() - 15 * 60000).toISOString(),
    status: 'connected'
  },
  {
    id: 'acc_3',
    institutionName: 'TD Ameritrade',
    institutionId: 'ins_tda',
    accountName: 'TD Ameritrade Brokerage',
    accountType: 'investment',
    mask: '1234',
    balance: 45000,
    holdings: [],
    lastUpdated: new Date(Date.now() - 2 * 60000).toISOString(),
    status: 'error'
  }
];

const SUPPORTED_INSTITUTIONS = [
  { name: 'Chase', logo: '🏦', accountTypes: ['Investment', 'Checking', 'Savings'] },
  { name: 'Fidelity', logo: '💼', accountTypes: ['Investment', '401(k)', 'IRA'] },
  { name: 'Charles Schwab', logo: '📈', accountTypes: ['Brokerage', 'Retirement'] },
  { name: 'TD Ameritrade', logo: '🎯', accountTypes: ['Trading', 'Investment'] },
  { name: 'Vanguard', logo: '⚡', accountTypes: ['Mutual Funds', 'ETFs'] },
  { name: 'Bank of America', logo: '🏛️', accountTypes: ['Merrill Lynch', 'Investment'] },
  { name: 'Wells Fargo', logo: '🐎', accountTypes: ['WellsTrade', 'Advisors'] },
  { name: 'E*TRADE', logo: '💻', accountTypes: ['Brokerage', 'Retirement'] }
];

export const PlaidIntegration: React.FC = () => {
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(MOCK_CONNECTED_ACCOUNTS);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<ConnectedAccount | null>(null);

  // Simulate Plaid Link Token creation
  useEffect(() => {
    // In real implementation, this would call your backend to create a link_token
    setTimeout(() => {
      setLinkToken('mock_link_token_' + Date.now());
    }, 1000);
  }, []);

  const handleConnectAccount = useCallback(() => {
    if (!linkToken) return;

    analytics.trackFeatureUsage('plaid_integration', 'connect_initiated');
    
    // Mock Plaid Link flow
    setIsConnecting(true);
    
    // Simulate Plaid Link popup
    setTimeout(() => {
      const mockSuccess = Math.random() > 0.2; // 80% success rate
      
      if (mockSuccess) {
        const newAccount: ConnectedAccount = {
          id: `acc_${Date.now()}`,
          institutionName: 'Demo Bank',
          institutionId: 'ins_demo',
          accountName: 'Demo Investment Account',
          accountType: 'investment',
          mask: '9999',
          balance: 75000,
          holdings: [
            { symbol: 'VTI', name: 'Vanguard Total Stock Market', quantity: 150, price: 220.50, value: 33075 },
            { symbol: 'VTIAX', name: 'Vanguard Total International', quantity: 100, price: 28.75, value: 2875 }
          ],
          lastUpdated: new Date().toISOString(),
          status: 'connected'
        };
        
        setConnectedAccounts(prev => [...prev, newAccount]);
        analytics.trackFeatureUsage('plaid_integration', 'account_connected');
      } else {
        analytics.trackError(new Error('Plaid connection failed'), { context: 'plaid_integration' });
      }
      
      setIsConnecting(false);
      setShowConnectDialog(false);
    }, 3000);
  }, [linkToken]);

  const handleRefreshAccount = useCallback((accountId: string) => {
    setConnectedAccounts(prev => 
      prev.map(acc => 
        acc.id === accountId 
          ? { ...acc, status: 'updating' as const }
          : acc
      )
    );

    analytics.trackFeatureUsage('plaid_integration', 'account_refreshed');

    // Simulate refresh
    setTimeout(() => {
      setConnectedAccounts(prev => 
        prev.map(acc => 
          acc.id === accountId 
            ? { 
                ...acc, 
                status: 'connected' as const,
                lastUpdated: new Date().toISOString(),
                balance: acc.balance * (1 + (Math.random() - 0.5) * 0.02) // ±1% change
              }
            : acc
        )
      );
    }, 2000);
  }, []);

  const handleImportPortfolio = useCallback((account: ConnectedAccount) => {
    analytics.trackFeatureUsage('plaid_integration', 'portfolio_imported', {
      institution: account.institutionName,
      holdings_count: account.holdings?.length || 0
    });
    
    // Here you would typically navigate to portfolio creation with pre-filled data
    alert(`Portfolio imported from ${account.institutionName}!\n\nHoldings: ${account.holdings?.length || 0} positions\nTotal Value: $${account.balance.toLocaleString()}`);
  }, []);

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'investment': return <InvestmentIcon />;
      case 'bank': return <BankIcon />;
      default: return <BankIcon />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'updating': return 'warning';
      default: return 'default';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <LinkIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Account Connections
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Securely connect your investment accounts via Plaid
              </Typography>
            </Box>
          </Box>

          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Secure Integration:</strong> This platform uses Plaid's bank-grade security 
              to connect with 12,000+ financial institutions. Your credentials are never stored.
            </Typography>
          </Alert>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<LinkIcon />}
              onClick={() => setShowConnectDialog(true)}
              disabled={!linkToken}
            >
              Connect New Account
            </Button>
            
            <Chip
              icon={<SecurityIcon />}
              label="256-bit SSL Encryption"
              color="success"
              variant="outlined"
            />
            
            <Chip
              icon={<ShieldIcon />}
              label="SOC 2 Type II Compliant"
              color="primary"
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      <Grid container spacing={3}>
        {connectedAccounts.map((account) => (
          <Grid item xs={12} md={6} key={account.id}>
            <Card
              sx={{
                height: '100%',
                border: account.status === 'error' ? '1px solid' : 'none',
                borderColor: 'error.main'
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getAccountIcon(account.accountType)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="h6" fontWeight="bold">
                        {account.institutionName}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {account.accountName} ••••{account.mask}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip
                      size="small"
                      label={account.status}
                      color={getStatusColor(account.status) as any}
                      icon={
                        account.status === 'connected' ? <CheckIcon /> :
                        account.status === 'error' ? <ErrorIcon /> :
                        <SyncIcon />
                      }
                    />
                    
                    <Tooltip title="Refresh Account">
                      <IconButton
                        size="small"
                        onClick={() => handleRefreshAccount(account.id)}
                        disabled={account.status === 'updating'}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>

                {account.status === 'updating' && (
                  <LinearProgress sx={{ mb: 2 }} />
                )}

                {account.status === 'error' && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                      Account connection error. Please reconnect or contact support.
                    </Typography>
                  </Alert>
                )}

                <Grid container spacing={2} sx={{ mb: 2 }}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6" color="primary.main">
                        ${account.balance.toLocaleString()}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Total Balance
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="h6">
                        {account.holdings?.length || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Holdings
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Last updated: {new Date(account.lastUpdated).toLocaleString()}
                </Typography>

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ViewIcon />}
                    onClick={() => setSelectedAccount(account)}
                    disabled={account.status !== 'connected'}
                  >
                    View Holdings
                  </Button>
                  
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<InvestmentIcon />}
                    onClick={() => handleImportPortfolio(account)}
                    disabled={account.status !== 'connected' || !account.holdings?.length}
                  >
                    Import Portfolio
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Connect Account Dialog */}
      <Dialog
        open={showConnectDialog}
        onClose={() => setShowConnectDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Connect Your Investment Account
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Demo Mode:</strong> This is a demonstration of Plaid integration. 
              In production, this would securely connect to real financial institutions.
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom>
            Supported Institutions
          </Typography>
          
          <Grid container spacing={2}>
            {SUPPORTED_INSTITUTIONS.map((institution) => (
              <Grid item xs={12} sm={6} md={4} key={institution.name}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  <Typography variant="h4" sx={{ mb: 1 }}>
                    {institution.logo}
                  </Typography>
                  <Typography variant="subtitle2" fontWeight="bold">
                    {institution.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {institution.accountTypes.join(', ')}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              Security Features
            </Typography>
            <List>
              <ListItem>
                <ListItemIcon>
                  <SecurityIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Bank-Grade Security"
                  secondary="256-bit SSL encryption and multi-factor authentication"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <ShieldIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="Read-Only Access"
                  secondary="We can only view your account information, never make transactions"
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <CheckIcon color="success" />
                </ListItemIcon>
                <ListItemText
                  primary="No Credential Storage"
                  secondary="Your banking credentials are never stored on our servers"
                />
              </ListItem>
            </List>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConnectDialog(false)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConnectAccount}
            disabled={isConnecting || !linkToken}
            startIcon={isConnecting ? <SyncIcon className="spin" /> : <LinkIcon />}
          >
            {isConnecting ? 'Connecting...' : 'Connect with Plaid'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Details Dialog */}
      <Dialog
        open={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedAccount?.institutionName} - Account Details
        </DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box>
              <Typography variant="h6" gutterBottom>
                Holdings ({selectedAccount.holdings?.length || 0})
              </Typography>
              
              {selectedAccount.holdings?.length ? (
                <List>
                  {selectedAccount.holdings.map((holding, index) => (
                    <ListItem key={index} divider>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography fontWeight="bold">
                              {holding.symbol} - {holding.name}
                            </Typography>
                            <Typography color="primary.main" fontWeight="bold">
                              ${holding.value.toLocaleString()}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" color="text.secondary">
                            {holding.quantity} shares @ ${holding.price.toFixed(2)}
                          </Typography>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Alert severity="info">
                  No holdings found for this account.
                </Alert>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAccount(null)}>
            Close
          </Button>
          {selectedAccount?.holdings?.length && (
            <Button
              variant="contained"
              onClick={() => {
                handleImportPortfolio(selectedAccount);
                setSelectedAccount(null);
              }}
            >
              Import This Portfolio
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
};

export default PlaidIntegration;