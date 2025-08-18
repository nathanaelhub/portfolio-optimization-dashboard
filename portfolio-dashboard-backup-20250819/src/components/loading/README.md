# Loading Components Documentation

Professional loading states and animations for the Portfolio Optimization Dashboard, built with Tailwind CSS and TypeScript.

## Components Overview

### 1. LoadingSkeleton
Animated skeleton placeholders for content that's loading.

**Features:**
- Multiple variants (card, text, chart, metrics, avatar, button, list)
- Configurable pulse animation
- Responsive design
- TypeScript support

**Usage:**
```tsx
import { LoadingSkeleton } from './components/loading';

// Basic skeleton
<LoadingSkeleton variant="text" lines={3} />

// Portfolio card skeleton
<LoadingSkeleton variant="card" className="mb-4" />

// Custom chart skeleton
<LoadingSkeleton 
  variant="chart" 
  width="w-full" 
  height="h-64" 
  animate={true} 
/>
```

**Props:**
```typescript
interface LoadingSkeletonProps {
  variant?: 'card' | 'text' | 'chart' | 'metrics' | 'avatar' | 'button' | 'list';
  lines?: number;        // For text variant
  width?: string;        // Tailwind width class
  height?: string;       // Tailwind height class
  className?: string;    // Additional CSS classes
  animate?: boolean;     // Enable/disable pulse animation
}
```

### 2. LoadingSpinner
Versatile spinning loading indicators.

**Features:**
- 5 different variants (default, dots, bars, ring, pulse)
- Multiple sizes and colors
- Smooth animations
- Lightweight implementation

**Usage:**
```tsx
import { LoadingSpinner } from './components/loading';

// Basic spinner
<LoadingSpinner />

// Custom spinner
<LoadingSpinner 
  variant="dots" 
  size="lg" 
  color="blue" 
/>

// In a search input
<div className="relative">
  <input type="text" />
  {isSearching && (
    <div className="absolute right-3 top-3">
      <LoadingSpinner size="sm" />
    </div>
  )}
</div>
```

**Props:**
```typescript
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'blue' | 'gray' | 'white' | 'green' | 'red' | 'yellow';
  variant?: 'default' | 'dots' | 'bars' | 'ring' | 'pulse';
  className?: string;
}
```

### 3. LoadingButton
Interactive buttons with loading states.

**Features:**
- Built-in spinner integration
- Multiple variants and sizes
- Loading text override
- Disabled state handling
- Smooth transitions

**Usage:**
```tsx
import { LoadingButton } from './components/loading';

const [isOptimizing, setIsOptimizing] = useState(false);

const handleOptimize = async () => {
  setIsOptimizing(true);
  try {
    await optimizePortfolio();
  } finally {
    setIsOptimizing(false);
  }
};

<LoadingButton
  loading={isOptimizing}
  loadingText="Optimizing..."
  onClick={handleOptimize}
  variant="primary"
  fullWidth
>
  Optimize Portfolio
</LoadingButton>
```

**Props:**
```typescript
interface LoadingButtonProps {
  children: React.ReactNode;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loadingText?: string;
  spinnerVariant?: 'default' | 'dots' | 'bars' | 'ring' | 'pulse';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
}
```

### 4. SuccessToast
Elegant notification toasts with auto-dismiss.

**Features:**
- Multiple variants (success, error, warning, info)
- Configurable positioning
- Progress bar indicator
- Action buttons
- Smooth enter/exit animations

**Usage:**
```tsx
import { SuccessToast } from './components/loading';

const [showToast, setShowToast] = useState(false);

// Show toast after successful operation
useEffect(() => {
  if (optimizationComplete) {
    setShowToast(true);
  }
}, [optimizationComplete]);

<SuccessToast
  isVisible={showToast}
  message="Portfolio optimization completed!"
  description="Your optimized allocations are ready for review."
  variant="success"
  position="top-right"
  duration={5000}
  showProgress={true}
  onClose={() => setShowToast(false)}
  actionButton={{
    label: 'View Results',
    onClick: () => navigateToResults()
  }}
/>
```

**Props:**
```typescript
interface SuccessToastProps {
  message: string;
  description?: string;
  isVisible: boolean;
  duration?: number;    // Auto-dismiss time in ms
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  variant?: 'success' | 'error' | 'warning' | 'info';
  showProgress?: boolean;
  onClose?: () => void;
  actionButton?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}
```

### 5. ProgressIndicator
Multi-step process visualization.

**Features:**
- 3 layout variants (horizontal, vertical, circular)
- Step status tracking
- Animated progress
- Configurable labels and descriptions

**Usage:**
```tsx
import { ProgressIndicator } from './components/loading';

const optimizationSteps = [
  { id: 'validate', label: 'Validating Data', description: 'Checking portfolio constraints' },
  { id: 'fetch', label: 'Fetching Market Data', description: 'Retrieving asset prices' },
  { id: 'calculate', label: 'Calculating Metrics', description: 'Computing risk metrics' },
  { id: 'optimize', label: 'Optimizing', description: 'Running optimization algorithm' },
  { id: 'complete', label: 'Complete', description: 'Optimization finished' }
];

<ProgressIndicator
  steps={optimizationSteps}
  currentStep={currentStepIndex}
  variant="horizontal"
  showDescriptions={true}
  animated={true}
/>
```

**Props:**
```typescript
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface ProgressIndicatorProps {
  steps: Step[];
  currentStep: number;
  variant?: 'horizontal' | 'vertical' | 'circular';
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  showDescriptions?: boolean;
  animated?: boolean;
  className?: string;
}
```

## Implementation Examples

### Portfolio Optimization Flow
```tsx
import React, { useState } from 'react';
import { 
  LoadingButton, 
  ProgressIndicator, 
  SuccessToast, 
  LoadingSkeleton 
} from './components/loading';

const PortfolioOptimizer: React.FC = () => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const steps = [
    { id: 'validate', label: 'Validating Portfolio' },
    { id: 'fetch', label: 'Fetching Market Data' },
    { id: 'calculate', label: 'Calculating Metrics' },
    { id: 'optimize', label: 'Optimizing Allocations' },
    { id: 'complete', label: 'Complete' }
  ];

  const handleOptimize = async () => {
    setIsOptimizing(true);
    setShowResults(false);
    
    for (let i = 0; i < steps.length; i++) {
      setCurrentStep(i);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    setIsOptimizing(false);
    setShowResults(true);
    setShowSuccess(true);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="space-y-6">
        {/* Optimization Button */}
        <div className="text-center">
          <LoadingButton
            loading={isOptimizing}
            loadingText="Optimizing..."
            onClick={handleOptimize}
            variant="primary"
            size="lg"
            disabled={isOptimizing}
          >
            Optimize Portfolio
          </LoadingButton>
        </div>

        {/* Progress Indicator */}
        {isOptimizing && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <ProgressIndicator
              steps={steps}
              currentStep={currentStep}
              variant="horizontal"
              showDescriptions={false}
              animated={true}
            />
          </div>
        )}

        {/* Results Section */}
        {showResults ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Optimized Allocation</h3>
              {/* Results content */}
            </div>
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-4">Performance Metrics</h3>
              {/* Metrics content */}
            </div>
          </div>
        ) : isOptimizing && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <LoadingSkeleton variant="card" />
            <LoadingSkeleton variant="card" />
          </div>
        )}
      </div>

      {/* Success Toast */}
      <SuccessToast
        isVisible={showSuccess}
        message="Portfolio optimization completed!"
        description="Your new allocation strategy is ready for review."
        variant="success"
        duration={5000}
        onClose={() => setShowSuccess(false)}
        actionButton={{
          label: 'Download Report',
          onClick: () => console.log('Download report')
        }}
      />
    </div>
  );
};
```

### Data Loading with Skeleton
```tsx
import React, { useState, useEffect } from 'react';
import { LoadingSkeleton } from './components/loading';

const PortfolioDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchPortfolioData()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <LoadingSkeleton variant="metrics" />
        <LoadingSkeleton variant="chart" />
        <LoadingSkeleton variant="list" lines={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Actual content */}
    </div>
  );
};
```

## Best Practices

1. **Consistent Loading States**: Use the same loading components throughout your app for consistency.

2. **Progressive Loading**: Show skeletons for the overall structure, then individual spinners for specific actions.

3. **User Feedback**: Always provide feedback for actions that take more than 200ms.

4. **Accessibility**: All components include proper ARIA labels and keyboard navigation support.

5. **Performance**: Components are optimized with minimal re-renders and efficient animations.

6. **Responsive Design**: All components work seamlessly across different screen sizes.

## Styling Customization

The components use Tailwind CSS classes and can be customized by:

1. **Using className prop**: Add additional Tailwind classes
2. **CSS Custom Properties**: Override animation durations and colors
3. **Tailwind Config**: Modify the theme colors in `tailwind.config.js`

```css
/* Custom animation speeds */
.loading-fast {
  animation-duration: 0.5s;
}

.loading-slow {
  animation-duration: 2s;
}
```

## Animation Performance

All animations use CSS transforms and opacity for optimal performance:
- Hardware acceleration enabled
- No layout thrashing
- Smooth 60fps animations
- Respects user's reduced motion preferences

```css
@media (prefers-reduced-motion: reduce) {
  .animate-spin,
  .animate-pulse,
  .animate-bounce {
    animation: none;
  }
}
```