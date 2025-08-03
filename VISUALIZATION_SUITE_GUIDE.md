# Advanced Visualization Suite Guide

## 🎨 Overview

The Portfolio Optimization Dashboard features a comprehensive visualization suite built with **D3.js** and **Recharts**, designed for clarity, usability, and accessibility. The suite provides interactive, real-time financial visualizations that make complex portfolio data immediately understandable.

## 🏗️ Architecture

### Component Structure
```
frontend/src/components/visualizations/
├── PortfolioAllocationCharts.tsx    # Allocation visualizations
├── PerformanceAnalytics.tsx         # Performance analysis charts
├── RiskVisualizations.tsx           # Risk analysis components
├── RealTimeDashboard.tsx           # Live data dashboard
├── InteractiveFeatures.tsx         # Shared interactive features
└── index.ts                        # Main exports and utilities
```

### Technology Stack
- **D3.js v7**: Custom visualizations with advanced interactions
- **Recharts**: React-friendly charting library for standard charts
- **Framer Motion**: Smooth animations and transitions
- **html2canvas**: Chart export functionality
- **TypeScript**: Full type safety for complex data structures

## 📊 Portfolio Allocation Visualizations

### 1. Animated Donut Chart with Drill-down
**Location**: `PortfolioAllocationCharts.tsx`

**Features**:
- **Sector-based allocation** with smooth animations
- **Click-to-drill-down** into individual holdings
- **Dynamic tooltips** with allocation details
- **Color-coded sectors** with consistent palette
- **Responsive design** adapting to screen size

**Usage**:
```typescript
<PortfolioAllocationCharts
  holdings={portfolioHoldings}
  isDarkMode={isDarkMode}
  onHoldingClick={(holding) => console.log('Selected:', holding)}
/>
```

**Key Interactions**:
- Click sector segments to drill down into holdings
- Hover for detailed tooltips with value and percentage
- Smooth transitions between drill-down levels
- Reset button to return to sector view

### 2. Interactive Treemap
**Purpose**: Position sizes and performance visualization

**Features**:
- **Size represents allocation** - larger rectangles = bigger positions
- **Color indicates performance** - green for gains, red for losses
- **Nested layout** for sector groupings
- **Click interactions** for detailed views
- **Performance labels** overlay on rectangles

**Visual Design**:
- Rectangle size proportional to portfolio allocation
- Color intensity based on performance magnitude
- Clear labeling for symbols and percentage changes
- Hover effects with detailed information

### 3. Sankey Diagram for Rebalancing
**Purpose**: Visualize allocation changes from current to target

**Features**:
- **Flow visualization** showing rebalancing movements
- **Color-coded flows** - green for increases, red for decreases
- **Interactive nodes** with allocation details
- **Smooth curved connections** between current and target
- **Quantified flow thickness** based on change magnitude

**Implementation Details**:
```typescript
// Sankey flow calculation
const links = currentAllocations.map(current => {
  const target = targetAllocations.find(t => t.symbol === current.symbol);
  const change = target.allocation - current.allocation;
  return {
    source: `current-${current.symbol}`,
    target: `target-${current.symbol}`,
    value: Math.abs(change),
    change: change
  };
});
```

### 4. Grouped Bar Chart Comparison
**Purpose**: Current vs target allocation comparison

**Features**:
- **Side-by-side bars** for easy comparison
- **Sorted by allocation size** for clarity
- **Color distinction** between current and target
- **Percentage labels** on bars
- **Interactive tooltips** with detailed breakdowns

## 📈 Performance Analytics

### 1. Multi-line Chart with Benchmark Comparison
**Location**: `PerformanceAnalytics.tsx`

**Features**:
- **Cumulative return tracking** over time
- **Benchmark overlay** with toggle visibility
- **Interactive brush selection** for time range zooming
- **Synchronized tooltips** showing both portfolio and benchmark
- **Reference lines** at break-even points

**Advanced Interactions**:
```typescript
// Brush and zoom implementation
const [brushDomain, setBrushDomain] = useState<[Date, Date] | null>(null);

// Filter data based on brush selection
const filteredData = useMemo(() => {
  if (!brushDomain) return chartData;
  return chartData.filter(d => 
    new Date(d.date) >= brushDomain[0] && 
    new Date(d.date) <= brushDomain[1]
  );
}, [chartData, brushDomain]);
```

### 2. Drawdown Visualization with Recovery Periods
**Purpose**: Risk analysis through drawdown tracking

**Features**:
- **Area chart** showing portfolio drawdowns
- **Recovery period highlighting** with colored overlays
- **Interactive period selection** with detailed statistics
- **Peak-to-trough analysis** with automatic detection
- **Recovery time calculations** displayed on hover

**Statistical Calculations**:
```typescript
// Drawdown calculation
const calculateDrawdowns = (values: number[]) => {
  let peak = values[0];
  let currentDrawdownStart: number | null = null;
  const periods: DrawdownPeriod[] = [];
  
  return values.map((value, index) => {
    if (value > peak) {
      if (currentDrawdownStart !== null) {
        periods.push({
          start: currentDrawdownStart,
          end: index - 1,
          recovery: index,
          maxDrawdown: Math.min(...values.slice(currentDrawdownStart, index))
        });
        currentDrawdownStart = null;
      }
      peak = value;
    } else if (currentDrawdownStart === null && value < peak) {
      currentDrawdownStart = index;
    }
    
    return {
      index,
      value,
      drawdown: ((value - peak) / peak) * 100,
      isInDrawdown: currentDrawdownStart !== null
    };
  });
};
```

### 3. Rolling Performance Metrics
**Purpose**: Time-series analysis of risk-adjusted returns

**Features**:
- **30-day rolling volatility** with area chart
- **Rolling Sharpe ratio** calculation and display
- **Metric switching** between volatility and Sharpe
- **Trend analysis** with color-coded performance periods
- **Statistical overlays** showing percentiles

### 4. Calendar Heatmap of Daily Returns
**Purpose**: Pattern recognition in daily performance

**Features**:
- **Year-by-year view** with dropdown selection
- **Color-coded cells** based on daily return magnitude
- **Interactive hover** with return details
- **Monthly/weekly patterns** easily visible
- **Legend with performance scale** for interpretation

**D3.js Implementation**:
```typescript
// Calendar heatmap cell creation
const cells = d3.timeDays(yearStart, yearEnd)
  .map(date => {
    const dayData = dataMap.get(formatDate(date));
    return {
      date,
      value: dayData?.return || 0,
      x: timeWeek.count(yearStart, date) * cellSize,
      y: date.getDay() * cellSize
    };
  });

// Color scale for returns
const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
  .domain(d3.extent(yearData, d => d.return));
```

## 🎯 Risk Visualizations

### 1. Interactive Efficient Frontier
**Location**: `RiskVisualizations.tsx`

**Features**:
- **3D-effect visualization** using color depth for Sharpe ratios
- **Individual asset plotting** with triangular markers
- **Current portfolio highlighting** with star marker
- **Interactive point selection** with allocation details
- **Sharpe ratio color coding** using viridis color scale

**Advanced Visualization**:
```typescript
// Color scale for Sharpe ratio depth effect
const colorScale = d3.scaleSequential(d3.interpolateViridis)
  .domain(d3.extent(frontierPoints, d => d.sharpeRatio));

// 3D depth effect through color intensity
const scatterData = frontierPoints.map(point => ({
  x: point.risk * 100,
  y: point.return * 100,
  z: point.sharpeRatio * 10, // Depth factor
  color: colorScale(point.sharpeRatio)
}));
```

### 2. Correlation Matrix with Hierarchical Clustering
**Purpose**: Asset relationship analysis with intelligent grouping

**Features**:
- **Hierarchical clustering** to group similar assets
- **Heatmap visualization** with correlation strength colors
- **Interactive cell selection** with correlation details
- **Row/column highlighting** on hover
- **Dendogram-like organization** through clustering

**Clustering Algorithm**:
```typescript
// Simple agglomerative clustering implementation
const performClustering = (correlationMatrix: CorrelationData) => {
  const symbols = Object.keys(correlationMatrix);
  const distances = symbols.map(s1 =>
    symbols.map(s2 => 1 - Math.abs(correlationMatrix[s1][s2]))
  );

  const clusters = symbols.map(symbol => ({ symbols: [symbol] }));
  
  while (clusters.length > 1) {
    // Find closest clusters and merge
    const [minI, minJ] = findClosestClusters(clusters, distances);
    mergeClusters(clusters, minI, minJ);
  }
  
  return clusters[0].symbols;
};
```

### 3. Risk Factor Contribution Chart
**Purpose**: Decomposition of portfolio risk sources

**Features**:
- **Horizontal bar chart** showing factor contributions
- **Positive/negative contribution coloring** (green/red)
- **Factor descriptions** in interactive tooltips
- **Sorted by contribution magnitude** for clarity
- **Click interactions** for detailed factor analysis

### 4. Scenario Analysis Spider Chart
**Purpose**: Multi-dimensional scenario comparison

**Features**:
- **5-axis radar chart** for comprehensive scenario analysis
- **Scenario selection dropdown** for comparison
- **Normalized metrics** (0-100 scale) for fair comparison
- **Color-coded scenarios** with consistent palette
- **Detailed scenario breakdowns** in side panel

**Metrics Analyzed**:
- Market Return vs Portfolio Return
- Volatility (inverted for better visualization)
- Maximum Drawdown (inverted)
- Sharpe Ratio
- Recovery Time

## 🔧 Interactive Features

### 1. Enhanced Tooltip System
**Location**: `InteractiveFeatures.tsx`

**Features**:
- **Smart positioning** with viewport collision detection
- **Rich content support** with formatted data
- **Synchronized tooltips** across multiple charts
- **Customizable delay** and animation timing
- **Accessibility support** with proper ARIA labels

**Implementation**:
```typescript
const EnhancedTooltip: React.FC<TooltipProps> = ({
  children,
  content,
  position = 'auto',
  delay = 200
}) => {
  const calculatePosition = useCallback((triggerRect, tooltipRect) => {
    // Intelligent positioning logic
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Determine best position based on available space
    let finalPosition = position === 'auto' 
      ? getBestPosition(triggerRect, viewportWidth, viewportHeight)
      : position;
    
    return calculateCoordinates(triggerRect, tooltipRect, finalPosition);
  }, [position]);
};
```

### 2. Brush and Zoom Functionality
**Purpose**: Interactive data exploration with range selection

**Features**:
- **Time range brushing** for detailed analysis
- **Zoom controls** with smooth transitions
- **Reset functionality** to return to full view
- **Synchronized across charts** when in same context
- **Touch-friendly** for mobile devices

### 3. Chart Export System
**Purpose**: Professional chart export capabilities

**Features**:
- **Multiple formats**: PNG, SVG, PDF support
- **High-resolution export** with quality controls
- **Batch export** for multiple charts
- **Custom filename** generation
- **Progress indicators** during export

**Export Implementation**:
```typescript
const useChartExport = () => {
  const exportChart = useCallback(async (elementRef, options) => {
    const { format, filename, width, height, quality } = options;
    
    if (format === 'png') {
      const canvas = await html2canvas(elementRef.current, {
        backgroundColor: null,
        scale: quality,
        width,
        height,
        useCORS: true
      });
      
      canvas.toBlob(blob => saveAs(blob, `${filename}.png`));
    }
    // Additional format handlers...
  }, []);
};
```

### 4. Dark Mode Support
**Purpose**: Consistent theming across all visualizations

**Features**:
- **Automatic color scheme switching** for all components
- **Proper contrast ratios** for accessibility
- **Smooth transitions** between themes
- **Persistent user preference** storage
- **System preference detection** and following

### 5. Accessibility Features
**Purpose**: WCAG 2.1 AA compliance and inclusive design

**Features**:
- **Keyboard navigation** support for all interactive elements
- **Screen reader compatibility** with proper ARIA labels
- **Focus management** with visible focus indicators
- **Color-blind friendly** palettes and patterns
- **High contrast mode** support

**Keyboard Navigation**:
```typescript
const useKeyboardNavigation = (items, onSelect, isActive) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  useEffect(() => {
    if (!isActive) return;
    
    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowUp':
          setSelectedIndex(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowDown':
          setSelectedIndex(prev => Math.min(items.length - 1, prev + 1));
          break;
        case 'Enter':
        case ' ':
          onSelect(items[selectedIndex], selectedIndex);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, onSelect, isActive, selectedIndex]);
};
```

## 📱 Real-time Dashboard

### 1. Live Portfolio Value Widget
**Location**: `RealTimeDashboard.tsx`

**Features**:
- **Real-time value updates** with smooth animations
- **Change indicators** with color coding and arrows
- **Sparkline integration** showing recent trend
- **Performance metrics** displayed prominently
- **WebSocket connectivity** status indicators

### 2. Animated Holdings Table
**Purpose**: Live holdings monitoring with interactive features

**Features**:
- **Real-time price updates** with flash animations
- **Sortable columns** with persistent sort state
- **Inline sparklines** for individual holdings
- **Allocation progress bars** with smooth updates
- **Click-to-drill-down** functionality

**Animation System**:
```typescript
// Value change animation
const [isAnimating, setIsAnimating] = useState(false);
const prevValueRef = useRef(currentValue);

useEffect(() => {
  if (prevValueRef.current !== currentValue) {
    setIsAnimating(true);
    const timer = setTimeout(() => setIsAnimating(false), 300);
    prevValueRef.current = currentValue;
    return () => clearTimeout(timer);
  }
}, [currentValue]);

// Animated value display
<motion.div
  animate={{ scale: isAnimating ? 1.05 : 1 }}
  transition={{ duration: 0.3 }}
  className={isAnimating ? 'text-blue-500' : ''}
>
  ${currentValue.toLocaleString()}
</motion.div>
```

### 3. Performance Attribution Breakdown
**Purpose**: Real-time sector and factor contribution analysis

**Features**:
- **Live contribution calculations** with attribution effects
- **Sector-wise breakdowns** with allocation vs selection effects
- **Interactive bar charts** showing positive/negative contributions
- **Drill-down capabilities** into individual holdings
- **Time-series attribution** tracking over multiple periods

### 4. Alert System with Real-time Notifications
**Purpose**: Proactive portfolio monitoring and notifications

**Features**:
- **Categorized alerts** (rebalancing, risk, opportunities, system)
- **Severity levels** with appropriate visual indicators
- **Action buttons** for immediate response
- **Dismissible alerts** with slide animations
- **Sound notifications** (optional) for critical alerts

**Alert Types**:
```typescript
interface Alert {
  id: string;
  type: 'rebalance' | 'risk' | 'opportunity' | 'system';
  severity: 'low' | 'medium' | 'high';
  title: string;
  message: string;
  timestamp: Date;
  action?: string; // Optional action button text
}

// Alert severity styling
const getSeverityColor = (severity: Alert['severity']) => {
  switch (severity) {
    case 'high': return 'text-red-600 bg-red-50 border-red-200';
    case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
  }
};
```

## 🎨 Design Principles

### Visual Hierarchy
1. **Primary Information** - Large, bold typography for key metrics
2. **Secondary Details** - Smaller, muted text for supporting data
3. **Interactive Elements** - Clear hover states and focus indicators
4. **Status Indicators** - Consistent color coding throughout

### Color Strategy
- **Consistent sector colors** across all visualizations
- **Performance colors**: Green (positive), Red (negative), Gray (neutral)
- **High contrast ratios** for accessibility compliance
- **Color-blind friendly** palettes with pattern alternatives

### Animation Guidelines
- **Smooth transitions** (300ms duration) for state changes
- **Staggered animations** for list items and chart elements
- **Performance-conscious** animations with GPU acceleration
- **Reduced motion** support for accessibility preferences

### Responsive Design
- **Mobile-first approach** with progressive enhancement
- **Breakpoint-specific layouts** for optimal viewing
- **Touch-friendly interactions** with appropriate sizing
- **Adaptive chart sizing** based on container dimensions

## 🔧 Usage Examples

### Basic Integration
```typescript
import { 
  PortfolioAllocationCharts, 
  PerformanceAnalytics, 
  RiskVisualizations,
  RealTimeDashboard,
  InteractiveChartContainer
} from './components/visualizations';

// Portfolio allocation visualization
<InteractiveChartContainer
  title="Portfolio Allocation"
  exportFilename="portfolio-allocation"
  isDarkMode={isDarkMode}
  onDarkModeToggle={setDarkMode}
>
  <PortfolioAllocationCharts
    holdings={portfolioHoldings}
    isDarkMode={isDarkMode}
    onHoldingClick={handleHoldingClick}
  />
</InteractiveChartContainer>
```

### Advanced Configuration
```typescript
// Performance analytics with custom benchmark
<PerformanceAnalytics
  data={performanceData}
  benchmarkName="Russell 2000"
  isDarkMode={isDarkMode}
  className="min-h-[600px]"
/>

// Risk visualization with correlation data
<RiskVisualizations
  assets={assetData}
  correlationMatrix={correlationData}
  efficientFrontier={frontierPoints}
  riskFactors={riskFactors}
  currentPortfolio={currentPortfolioPoint}
  isDarkMode={isDarkMode}
/>
```

### Real-time Dashboard Setup
```typescript
// WebSocket connection for real-time updates
const [realTimeData, setRealTimeData] = useState([]);
const [alerts, setAlerts] = useState([]);

useEffect(() => {
  const ws = new WebSocket('ws://localhost:8000/ws');
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.type === 'portfolio_update') {
      setRealTimeData(prev => [...prev, data.payload]);
    } else if (data.type === 'alert') {
      setAlerts(prev => [data.payload, ...prev]);
    }
  };
  
  return () => ws.close();
}, []);

// Dashboard with live data
<RealTimeDashboard
  initialData={realTimeData}
  holdings={currentHoldings}
  alerts={alerts}
  isDarkMode={isDarkMode}
  onAlertAction={handleAlertAction}
/>
```

## 🚀 Best Practices

### Performance Optimization
1. **Memoization** for expensive calculations
2. **Virtual scrolling** for large datasets
3. **Debounced interactions** to prevent excessive re-renders
4. **Lazy loading** for non-critical visualizations
5. **Web Workers** for heavy computations

### Data Management
1. **Consistent data structures** across components
2. **Error boundaries** for graceful failure handling
3. **Loading states** with skeleton components
4. **Data validation** at component boundaries
5. **Caching strategies** for frequently accessed data

### Accessibility
1. **Semantic HTML** structure for screen readers
2. **ARIA labels** and descriptions for complex visualizations
3. **Keyboard navigation** support for all interactions
4. **Focus management** with logical tab order
5. **Alternative text** for data visualizations

### Testing Strategy
1. **Unit tests** for calculation functions and utilities
2. **Integration tests** for component interactions
3. **Visual regression tests** for chart rendering
4. **Accessibility tests** with automated tools
5. **Performance tests** for large datasets

---

The visualization suite provides a comprehensive foundation for financial data visualization, with emphasis on clarity, interactivity, and accessibility. Each component is designed to work independently or as part of a larger dashboard system, making it easy to integrate into existing applications or use as standalone widgets.