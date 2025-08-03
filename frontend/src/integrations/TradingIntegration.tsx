/**
 * Trading Platform Integration (Alpaca/TD Ameritrade Simulation)
 * 
 * Demonstrates live trading capabilities with paper trading simulation.
 * Shows real-world applicability for automated portfolio rebalancing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  Switch,
  FormControlLabel,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  TrendingUp as TradingIcon,
  PlayArrow as ExecuteIcon,
  Pause as PauseIcon,
  Timeline as ChartIcon,
  Security as SecurityIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Settings as SettingsIcon,
  AccountBalance as AccountIcon,
  ShowChart as ShowChartIcon,
  Speed as SpeedIcon
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { analytics } from '../services/analytics';

interface TradingAccount {
  id: string;
  broker: 'alpaca' | 'td_ameritrade' | 'interactive_brokers';
  accountNumber: string;
  accountType: 'paper' | 'live';
  balance: number;
  buyingPower: number;
  dayTradeCount: number;
  portfolioValue: number;
  status: 'connected' | 'disconnected' | 'error';
  lastUpdated: string;
}

interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  value: number;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  timestamp: string;
  reason?: string;
}

interface RebalanceOrder {
  symbol: string;
  currentAllocation: number;
  targetAllocation: number;
  currentValue: number;
  targetValue: number;
  action: 'buy' | 'sell' | 'hold';
  quantity: number;
  estimatedPrice: number;
}

const MOCK_TRADING_ACCOUNTS: TradingAccount[] = [
  {
    id: 'alpaca_demo',
    broker: 'alpaca',
    accountNumber: 'PA2K4N7XYZ89',
    accountType: 'paper',
    balance: 50000,
    buyingPower: 200000, // 4:1 margin
    dayTradeCount: 0,
    portfolioValue: 125750,
    status: 'connected',
    lastUpdated: new Date().toISOString()
  },
  {
    id: 'td_demo',
    broker: 'td_ameritrade',
    accountNumber: '123456789',
    accountType: 'paper',
    balance: 75000,
    buyingPower: 75000,
    dayTradeCount: 2,
    portfolioValue: 98450,
    status: 'connected',
    lastUpdated: new Date().toISOString()
  }
];

const MOCK_RECENT_TRADES: Trade[] = [
  {
    id: 'trade_1',
    symbol: 'AAPL',
    side: 'buy',
    quantity: 25,
    price: 175.50,
    value: 4387.50,
    status: 'filled',
    timestamp: new Date(Date.now() - 5 * 60000).toISOString()
  },
  {
    id: 'trade_2',
    symbol: 'SPY',
    side: 'sell',
    quantity: 10,
    price: 450.25,
    value: 4502.50,
    status: 'filled',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString()
  },
  {
    id: 'trade_3',
    symbol: 'MSFT',
    side: 'buy',
    quantity: 15,
    price: 380.00,
    value: 5700.00,
    status: 'pending',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString()
  }
];

// Mock rebalance suggestions
const MOCK_REBALANCE_ORDERS: RebalanceOrder[] = [
  {
    symbol: 'AAPL',
    currentAllocation: 0.18,
    targetAllocation: 0.15,
    currentValue: 22635,
    targetValue: 18843.75,
    action: 'sell',
    quantity: 22,
    estimatedPrice: 175.50
  },
  {
    symbol: 'MSFT',
    currentAllocation: 0.10,
    targetAllocation: 0.12,
    currentValue: 12575,
    targetValue: 15090,
    action: 'buy',
    quantity: 7,
    estimatedPrice: 380.25
  },
  {
    symbol: 'BND',
    currentAllocation: 0.20,
    targetAllocation: 0.25,
    currentValue: 25150,
    targetValue: 31437.50,
    action: 'buy',
    quantity: 80,
    estimatedPrice: 78.90
  }
];

const BROKER_CONFIGS = {
  alpaca: {
    name: 'Alpaca Markets',
    logo: '🦙',
    features: ['Commission-free', 'API-first', 'Fractional shares'],
    limitations: ['US markets only', 'No options trading']
  },
  td_ameritrade: {
    name: 'TD Ameritrade',
    logo: '🎯',
    features: ['Full market access', 'Options trading', 'Advanced orders'],
    limitations: ['API rate limits', 'Commission on some trades']
  },
  interactive_brokers: {
    name: 'Interactive Brokers',
    logo: '📊',
    features: ['Global markets', 'Low fees', 'Professional tools'],
    limitations: ['Complex API', 'Minimum balance required']
  }
};

export const TradingIntegration: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [connectedAccounts, setConnectedAccounts] = useState<TradingAccount[]>(MOCK_TRADING_ACCOUNTS);
  const [recentTrades, setRecentTrades] = useState<Trade[]>(MOCK_RECENT_TRADES);
  const [rebalanceDialog, setRebalanceDialog] = useState(false);
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [autoRebalance, setAutoRebalance] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<TradingAccount | null>(null);

  // Simulate real-time trade updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRecentTrades(prev => {
        return prev.map(trade => {
          if (trade.status === 'pending' && Math.random() > 0.7) {
            return { ...trade, status: 'filled' as const };
          }
          return trade;
        });
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleExecuteRebalance = useCallback(async () => {
    setIsRebalancing(true);
    analytics.trackFeatureUsage('trading_integration', 'rebalance_executed');

    try {
      // Simulate API calls to broker
      for (let i = 0; i < MOCK_REBALANCE_ORDERS.length; i++) {
        const order = MOCK_REBALANCE_ORDERS[i];
        
        // Simulate order placement delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (order.action !== 'hold') {
          const newTrade: Trade = {
            id: `rebalance_${Date.now()}_${i}`,
            symbol: order.symbol,
            side: order.action,
            quantity: order.quantity,
            price: order.estimatedPrice,
            value: order.quantity * order.estimatedPrice,
            status: 'pending',
            timestamp: new Date().toISOString()
          };
          
          setRecentTrades(prev => [newTrade, ...prev]);
        }
      }

      // Simulate successful completion
      setTimeout(() => {
        setRecentTrades(prev => 
          prev.map(trade => 
            trade.id.startsWith('rebalance_') && trade.status === 'pending'
              ? { ...trade, status: 'filled' as const }
              : trade
          )
        );
      }, 3000);

    } catch (error) {
      analytics.trackError(error as Error, { context: 'trading_rebalance' });
    } finally {
      setIsRebalancing(false);
      setRebalanceDialog(false);
    }
  }, []);

  const handleConnectBroker = useCallback((broker: keyof typeof BROKER_CONFIGS) => {
    analytics.trackFeatureUsage('trading_integration', 'broker_connect_initiated', { broker });
    
    // Simulate OAuth flow
    alert(`In production, this would initiate OAuth flow with ${BROKER_CONFIGS[broker].name}.\n\nDemo: Connection would be established securely.`);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'success';
      case 'error': return 'error';
      case 'disconnected': return 'warning';
      default: return 'default';
    }
  };

  const getTradeStatusColor = (status: string) => {
    switch (status) {
      case 'filled': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Box>
      {/* Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
              <TradingIcon />
            </Avatar>
            <Box>
              <Typography variant="h5" fontWeight="bold">
                Live Trading Integration
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Execute optimized portfolios with automated rebalancing
              </Typography>
            </Box>
          </Box>

          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Paper Trading Mode:</strong> This demonstration uses simulated trading. 
              In production, this connects to real brokers for live trading execution.
            </Typography>
          </Alert>

          <FormControlLabel
            control={
              <Switch
                checked={autoRebalance}
                onChange={(e) => setAutoRebalance(e.target.checked)}
              />
            }
            label="Auto-Rebalance on Optimization"
          />
        </CardContent>
      </Card>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab label="Connected Accounts" />
          <Tab label="Recent Trades" />
          <Tab label="Connect Broker" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          {connectedAccounts.map((account) => (
            <Grid item xs={12} md={6} key={account.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography variant="h4" sx={{ mr: 2 }}>
                        {BROKER_CONFIGS[account.broker].logo}
                      </Typography>
                      <Box>
                        <Typography variant="h6" fontWeight="bold">
                          {BROKER_CONFIGS[account.broker].name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.accountNumber} • {account.accountType.toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Chip
                      size="small"
                      label={account.status}
                      color={getStatusColor(account.status) as any}
                      icon={
                        account.status === 'connected' ? <CheckIcon /> :
                        account.status === 'error' ? <ErrorIcon /> :
                        <WarningIcon />
                      }
                    />
                  </Box>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                        <Typography variant="h6" color="primary.main">
                          {formatCurrency(account.portfolioValue)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Portfolio Value
                        </Typography>
                      </Paper>
                    </Grid>
                    <Grid item xs={6}>
                      <Paper sx={{ p: 1.5, textAlign: 'center' }}>
                        <Typography variant="h6" color="success.main">
                          {formatCurrency(account.buyingPower)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Buying Power
                        </Typography>
                      </Paper>
                    </Grid>
                  </Grid>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Day trades used: {account.dayTradeCount}/3
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<ShowChartIcon />}
                      onClick={() => setSelectedAccount(account)}
                    >
                      View Details
                    </Button>
                    
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ExecuteIcon />}
                      onClick={() => setRebalanceDialog(true)}
                      disabled={account.status !== 'connected'}
                    >
                      Rebalance
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {activeTab === 1 && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Trades
            </Typography>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Symbol</TableCell>
                    <TableCell>Side</TableCell>
                    <TableCell align="right">Quantity</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Value</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTrades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell fontWeight="bold">{trade.symbol}</TableCell>
                      <TableCell>
                        <Chip
                          label={trade.side.toUpperCase()}
                          size="small"
                          color={trade.side === 'buy' ? 'success' : 'error'}
                        />
                      </TableCell>
                      <TableCell align="right">{trade.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(trade.price)}</TableCell>
                      <TableCell align="right">{formatCurrency(trade.value)}</TableCell>
                      <TableCell>
                        <Chip
                          label={trade.status}
                          size="small"
                          color={getTradeStatusColor(trade.status) as any}
                        />
                      </TableCell>
                      <TableCell>
                        {new Date(trade.timestamp).toLocaleTimeString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {activeTab === 2 && (
        <Grid container spacing={3}>
          {Object.entries(BROKER_CONFIGS).map(([key, config]) => (
            <Grid item xs={12} md={4} key={key}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ textAlign: 'center', mb: 2 }}>
                    <Typography variant="h2" sx={{ mb: 1 }}>
                      {config.logo}
                    </Typography>
                    <Typography variant="h6" fontWeight="bold">
                      {config.name}
                    </Typography>
                  </Box>

                  <Typography variant="subtitle2" gutterBottom>
                    Features:
                  </Typography>
                  <List dense>
                    {config.features.map((feature, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 24 }}>
                          <CheckIcon color="success" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={feature}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Typography variant="subtitle2" gutterBottom sx={{ mt: 1 }}>
                    Limitations:
                  </Typography>
                  <List dense>
                    {config.limitations.map((limitation, index) => (
                      <ListItem key={index}>
                        <ListItemIcon sx={{ minWidth: 24 }}>
                          <WarningIcon color="warning" fontSize="small" />
                        </ListItemIcon>
                        <ListItemText
                          primary={limitation}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>

                  <Box sx={{ mt: 'auto', pt: 2 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleConnectBroker(key as keyof typeof BROKER_CONFIGS)}
                    >
                      Connect {config.name}
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Rebalance Dialog */}
      <Dialog
        open={rebalanceDialog}
        onClose={() => setRebalanceDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Portfolio Rebalancing
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              The following trades will be executed to rebalance your portfolio to the optimized allocation.
            </Typography>
          </Alert>

          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Current %</TableCell>
                  <TableCell align="right">Target %</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Est. Value</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {MOCK_REBALANCE_ORDERS.map((order, index) => (
                  <TableRow key={index}>
                    <TableCell fontWeight="bold">{order.symbol}</TableCell>
                    <TableCell align="right">
                      {(order.currentAllocation * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell align="right">
                      {(order.targetAllocation * 100).toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={order.action.toUpperCase()}
                        size="small"
                        color={
                          order.action === 'buy' ? 'success' :
                          order.action === 'sell' ? 'error' : 'default'
                        }
                      />
                    </TableCell>
                    <TableCell align="right">{order.quantity}</TableCell>
                    <TableCell align="right">
                      {formatCurrency(order.quantity * order.estimatedPrice)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {isRebalancing && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Executing trades...
              </Typography>
              <LinearProgress />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRebalanceDialog(false)} disabled={isRebalancing}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleExecuteRebalance}
            disabled={isRebalancing}
            startIcon={isRebalancing ? <SpeedIcon /> : <ExecuteIcon />}
          >
            {isRebalancing ? 'Executing...' : 'Execute Rebalance'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Account Details Dialog */}
      <Dialog
        open={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Account Details - {selectedAccount && BROKER_CONFIGS[selectedAccount.broker].name}
        </DialogTitle>
        <DialogContent>
          {selectedAccount && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="primary.main">
                      {formatCurrency(selectedAccount.balance)}
                    </Typography>
                    <Typography variant="caption">Cash Balance</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={6}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(selectedAccount.portfolioValue)}
                    </Typography>
                    <Typography variant="caption">Portfolio Value</Typography>
                  </Paper>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Account Information
              </Typography>
              <List dense>
                <ListItem>
                  <ListItemText
                    primary="Account Number"
                    secondary={selectedAccount.accountNumber}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Account Type"
                    secondary={selectedAccount.accountType.toUpperCase()}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Day Trade Count"
                    secondary={`${selectedAccount.dayTradeCount}/3`}
                  />
                </ListItem>
                <ListItem>
                  <ListItemText
                    primary="Last Updated"
                    secondary={new Date(selectedAccount.lastUpdated).toLocaleString()}
                  />
                </ListItem>
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedAccount(null)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TradingIntegration;