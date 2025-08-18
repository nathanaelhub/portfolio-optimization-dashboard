/**
 * Memoized components for performance optimization.
 * 
 * Implements React.memo and other memoization techniques to prevent
 * unnecessary re-renders and improve application performance.
 */

import React, { memo, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Info,
  Delete,
  Edit,
  Visibility
} from '@mui/icons-material';

// Types for component props
interface PortfolioCardProps {
  id: string;
  name: string;
  value: number;
  change: number;
  changePercent: number;
  allocation: Record<string, number>;
  riskLevel: 'Low' | 'Medium' | 'High';
  lastUpdated: string;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

interface AssetRowProps {
  symbol: string;
  name: string;
  allocation: number;
  value: number;
  change: number;
  changePercent: number;
  onClick?: (symbol: string) => void;
  isSelected?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  loading?: boolean;
}

interface ChartContainerProps {
  title: string;
  data: any[];
  height: number;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}

// Memoized Portfolio Card Component
export const PortfolioCard = memo<PortfolioCardProps>(({
  id,
  name,
  value,
  change,
  changePercent,
  allocation,
  riskLevel,
  lastUpdated,
  onView,
  onEdit,
  onDelete
}) => {
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  }, []);
  
  const formatPercent = useCallback((percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  }, []);
  
  const riskColor = useMemo(() => {
    switch (riskLevel) {
      case 'Low': return 'success';
      case 'Medium': return 'warning';
      case 'High': return 'error';
      default: return 'default';
    }
  }, [riskLevel]);
  
  const changeColor = useMemo(() => {
    return change >= 0 ? '#4caf50' : '#f44336';
  }, [change]);
  
  const topAllocations = useMemo(() => {
    return Object.entries(allocation)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);
  }, [allocation]);
  
  const handleView = useCallback(() => onView(id), [onView, id]);
  const handleEdit = useCallback(() => onEdit(id), [onEdit, id]);
  const handleDelete = useCallback(() => onDelete(id), [onDelete, id]);
  
  return (
    <Card elevation={1} sx={{ height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Typography variant="h6" component="h3" noWrap>
            {name}
          </Typography>
          <Box display="flex" gap={0.5}>
            <Tooltip title="View Details">
              <IconButton size="small" onClick={handleView}>
                <Visibility fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Edit Portfolio">
              <IconButton size="small" onClick={handleEdit}>
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Portfolio">
              <IconButton size="small" onClick={handleDelete}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box mb={2}>
          <Typography variant="h4" component="div" gutterBottom>
            {formatCurrency(value)}
          </Typography>
          <Box display="flex" alignItems="center" gap={1}>
            {change >= 0 ? (
              <TrendingUp sx={{ color: changeColor, fontSize: 20 }} />
            ) : (
              <TrendingDown sx={{ color: changeColor, fontSize: 20 }} />
            )}
            <Typography variant="body2" sx={{ color: changeColor }}>
              {formatCurrency(change)} ({formatPercent(changePercent)})
            </Typography>
          </Box>
        </Box>
        
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" color="textSecondary">
              Risk Level
            </Typography>
            <Chip
              label={riskLevel}
              size="small"
              color={riskColor as any}
              variant="outlined"
            />
          </Box>
          
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Top Holdings
          </Typography>
          {topAllocations.map(([symbol, percent]) => (
            <Box key={symbol} display="flex" justifyContent="space-between" mb={0.5}>
              <Typography variant="body2">{symbol}</Typography>
              <Typography variant="body2">{(percent * 100).toFixed(1)}%</Typography>
            </Box>
          ))}
        </Box>
        
        <Typography variant="caption" color="textSecondary">
          Updated: {new Date(lastUpdated).toLocaleDateString()}
        </Typography>
      </CardContent>
    </Card>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for better memoization
  return (
    prevProps.id === nextProps.id &&
    prevProps.name === nextProps.name &&
    prevProps.value === nextProps.value &&
    prevProps.change === nextProps.change &&
    prevProps.changePercent === nextProps.changePercent &&
    prevProps.riskLevel === nextProps.riskLevel &&
    prevProps.lastUpdated === nextProps.lastUpdated &&
    JSON.stringify(prevProps.allocation) === JSON.stringify(nextProps.allocation)
  );
});

PortfolioCard.displayName = 'PortfolioCard';

// Memoized Asset Row Component
export const AssetRow = memo<AssetRowProps>(({
  symbol,
  name,
  allocation,
  value,
  change,
  changePercent,
  onClick,
  isSelected = false
}) => {
  const handleClick = useCallback(() => {
    onClick?.(symbol);
  }, [onClick, symbol]);
  
  const changeColor = useMemo(() => {
    return change >= 0 ? '#4caf50' : '#f44336';
  }, [change]);
  
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }, []);
  
  return (
    <Box
      display="flex"
      alignItems="center"
      p={2}
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        backgroundColor: isSelected ? 'action.selected' : 'transparent',
        '&:hover': onClick ? { backgroundColor: 'action.hover' } : {},
        borderRadius: 1
      }}
      onClick={handleClick}
    >
      <Box flex="0 0 80px">
        <Typography variant="subtitle2" fontWeight={600}>
          {symbol}
        </Typography>
      </Box>
      
      <Box flex="1">
        <Typography variant="body2" color="textSecondary" noWrap>
          {name}
        </Typography>
      </Box>
      
      <Box flex="0 0 100px" textAlign="right">
        <Typography variant="body2">
          {(allocation * 100).toFixed(2)}%
        </Typography>
      </Box>
      
      <Box flex="0 0 120px" textAlign="right">
        <Typography variant="body2">
          {formatCurrency(value)}
        </Typography>
      </Box>
      
      <Box flex="0 0 100px" textAlign="right">
        <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
          {change >= 0 ? (
            <TrendingUp sx={{ color: changeColor, fontSize: 16 }} />
          ) : (
            <TrendingDown sx={{ color: changeColor, fontSize: 16 }} />
          )}
          <Typography variant="body2" sx={{ color: changeColor }}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </Typography>
        </Box>
      </Box>
    </Box>
  );
});

AssetRow.displayName = 'AssetRow';

// Memoized Metric Card Component
export const MetricCard = memo<MetricCardProps>(({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'primary',
  loading = false
}) => {
  const changeColor = useMemo(() => {
    if (change === undefined) return 'textSecondary';
    return change >= 0 ? 'success.main' : 'error.main';
  }, [change]);
  
  const changeIcon = useMemo(() => {
    if (change === undefined) return null;
    return change >= 0 ? <TrendingUp fontSize="small" /> : <TrendingDown fontSize="small" />;
  }, [change]);
  
  const formattedChange = useMemo(() => {
    if (change === undefined) return null;
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}${changeLabel || '%'}`;
  }, [change, changeLabel]);
  
  return (
    <Card elevation={1}>
      <CardContent>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Typography variant="body2" color="textSecondary">
            {title}
          </Typography>
          {icon && (
            <Box sx={{ color: `${color}.main` }}>
              {icon}
            </Box>
          )}
        </Box>
        
        <Typography variant="h4" component="div" gutterBottom>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        
        {change !== undefined && (
          <Box display="flex" alignItems="center" gap={0.5}>
            <Box sx={{ color: changeColor, display: 'flex', alignItems: 'center' }}>
              {changeIcon}
            </Box>
            <Typography variant="body2" sx={{ color: changeColor }}>
              {formattedChange}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
});

MetricCard.displayName = 'MetricCard';

// Memoized Chart Container Component
export const ChartContainer = memo<ChartContainerProps>(({
  title,
  data,
  height,
  children,
  onRefresh,
  refreshing = false
}) => {
  const handleRefresh = useCallback(() => {
    onRefresh?.();
  }, [onRefresh]);
  
  return (
    <Card elevation={1}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h3">
            {title}
          </Typography>
          {onRefresh && (
            <Tooltip title="Refresh Data">
              <IconButton
                size="small"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <Info fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        
        {refreshing && <LinearProgress sx={{ mb: 2 }} />}
        
        <Box height={height}>
          {children}
        </Box>
        
        <Typography variant="caption" color="textSecondary" display="block" mt={1}>
          {data.length} data points
        </Typography>
      </CardContent>
    </Card>
  );
});

ChartContainer.displayName = 'ChartContainer';

// Higher-order component for adding memoization
export function withMemoization<P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(Component, areEqual);
  MemoizedComponent.displayName = `Memoized(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

// Memoized list virtualization component
interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  keyExtractor: (item: T, index: number) => string;
  overscan?: number;
}

export const VirtualizedList = memo(<T,>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  keyExtractor,
  overscan = 5
}: VirtualizedListProps<T>) => {
  const [scrollTop, setScrollTop] = React.useState(0);
  
  const visibleRange = useMemo(() => {
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + visibleCount + overscan,
      items.length - 1
    );
    
    return {
      startIndex: Math.max(0, startIndex - overscan),
      endIndex,
      visibleCount
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        actualIndex: visibleRange.startIndex + index,
        key: keyExtractor(item, visibleRange.startIndex + index)
      }));
  }, [items, visibleRange, keyExtractor]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return (
    <Box
      sx={{ 
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <Box sx={{ height: totalHeight, position: 'relative' }}>
        <Box sx={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, actualIndex, key }) => {
            const style: React.CSSProperties = {
              height: itemHeight,
              position: 'relative'
            };
            
            return (
              <Box key={key}>
                {renderItem(item, actualIndex, style)}
              </Box>
            );
          })}
        </Box>
      </Box>
    </Box>
  );
}) as <T>(props: VirtualizedListProps<T>) => JSX.Element;

VirtualizedList.displayName = 'VirtualizedList';

// Memoized data grid component
interface DataGridProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    width?: number;
    render?: (value: any, row: T, index: number) => React.ReactNode;
  }>;
  onRowClick?: (row: T, index: number) => void;
  selectedRows?: Set<number>;
  sortBy?: keyof T;
  sortDirection?: 'asc' | 'desc';
  onSort?: (column: keyof T) => void;
}

export const DataGrid = memo(<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  selectedRows = new Set(),
  sortBy,
  sortDirection = 'asc',
  onSort
}: DataGridProps<T>) => {
  const handleRowClick = useCallback((row: T, index: number) => {
    onRowClick?.(row, index);
  }, [onRowClick]);
  
  const handleSort = useCallback((column: keyof T) => {
    onSort?.(column);
  }, [onSort]);
  
  const sortedData = useMemo(() => {
    if (!sortBy) return data;
    
    return [...data].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortBy, sortDirection]);
  
  return (
    <Box>
      {/* Header */}
      <Box display="flex" p={1} sx={{ backgroundColor: 'grey.100', fontWeight: 600 }}>
        {columns.map(column => (
          <Box
            key={String(column.key)}
            flex={column.width ? `0 0 ${column.width}px` : 1}
            sx={{ cursor: onSort ? 'pointer' : 'default' }}
            onClick={() => handleSort(column.key)}
          >
            <Typography variant="subtitle2">
              {column.label}
              {sortBy === column.key && (
                <span>{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>
              )}
            </Typography>
          </Box>
        ))}
      </Box>
      
      {/* Data Rows */}
      {sortedData.map((row, index) => (
        <Box
          key={index}
          display="flex"
          p={1}
          sx={{
            cursor: onRowClick ? 'pointer' : 'default',
            backgroundColor: selectedRows.has(index) ? 'action.selected' : 'transparent',
            '&:hover': onRowClick ? { backgroundColor: 'action.hover' } : {},
            borderBottom: '1px solid',
            borderColor: 'divider'
          }}
          onClick={() => handleRowClick(row, index)}
        >
          {columns.map(column => (
            <Box
              key={String(column.key)}
              flex={column.width ? `0 0 ${column.width}px` : 1}
            >
              {column.render
                ? column.render(row[column.key], row, index)
                : String(row[column.key])
              }
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}) as <T extends Record<string, any>>(props: DataGridProps<T>) => JSX.Element;

DataGrid.displayName = 'DataGrid';