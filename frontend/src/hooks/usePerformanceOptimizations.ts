/**
 * Performance optimization hooks for React components.
 * 
 * Provides custom hooks for memoization, virtualization, debouncing,
 * and other performance optimization patterns.
 */

import { 
  useCallback, 
  useMemo, 
  useRef, 
  useEffect, 
  useState,
  DependencyList,
  RefObject
} from 'react';
import { debounce, throttle } from 'lodash';

/**
 * Enhanced useCallback with dependency comparison logging in development.
 */
export function useOptimizedCallback<T extends (...args: any[]) => any>(
  callback: T,
  deps: DependencyList,
  debugName?: string
): T {
  const previousDeps = useRef<DependencyList>();
  
  // Log dependency changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && debugName) {
      if (previousDeps.current) {
        const changedDeps = deps.map((dep, index) => ({
          index,
          prev: previousDeps.current?.[index],
          current: dep,
          changed: previousDeps.current?.[index] !== dep
        })).filter(item => item.changed);
        
        if (changedDeps.length > 0) {
          console.log(`[${debugName}] Dependencies changed:`, changedDeps);
        }
      }
      previousDeps.current = deps;
    }
  });
  
  return useCallback(callback, deps);
}

/**
 * Enhanced useMemo with performance timing in development.
 */
export function useOptimizedMemo<T>(
  factory: () => T,
  deps: DependencyList,
  debugName?: string
): T {
  return useMemo(() => {
    if (process.env.NODE_ENV === 'development' && debugName) {
      const start = performance.now();
      const result = factory();
      const end = performance.now();
      
      if (end - start > 5) { // Log if computation takes more than 5ms
        console.log(`[${debugName}] Computation took ${(end - start).toFixed(2)}ms`);
      }
      
      return result;
    }
    
    return factory();
  }, deps);
}

/**
 * Debounced value hook for expensive operations.
 */
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

/**
 * Debounced callback hook.
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: DependencyList = []
): T {
  const debouncedCallback = useMemo(
    () => debounce(callback, delay),
    [delay, ...deps]
  );
  
  useEffect(() => {
    return () => {
      debouncedCallback.cancel();
    };
  }, [debouncedCallback]);
  
  return debouncedCallback as T;
}

/**
 * Throttled callback hook.
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  limit: number,
  deps: DependencyList = []
): T {
  const throttledCallback = useMemo(
    () => throttle(callback, limit),
    [limit, ...deps]
  );
  
  useEffect(() => {
    return () => {
      throttledCallback.cancel();
    };
  }, [throttledCallback]);
  
  return throttledCallback as T;
}

/**
 * Intersection observer hook for lazy loading.
 */
export function useIntersectionObserver(
  targetRef: RefObject<Element>,
  options: IntersectionObserverInit = {}
): boolean {
  const [isIntersecting, setIsIntersecting] = useState(false);
  
  useEffect(() => {
    if (!targetRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );
    
    observer.observe(targetRef.current);
    
    return () => {
      observer.disconnect();
    };
  }, [targetRef, options]);
  
  return isIntersecting;
}

/**
 * Virtual scrolling hook for large lists.
 */
interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function useVirtualScroll<T>(
  items: T[],
  options: VirtualScrollOptions
) {
  const [scrollTop, setScrollTop] = useState(0);
  const { itemHeight, containerHeight, overscan = 5 } = options;
  
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
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange.startIndex, visibleRange.endIndex]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;
  
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll,
    startIndex: visibleRange.startIndex,
    endIndex: visibleRange.endIndex
  };
}

/**
 * Previous value hook for comparison.
 */
export function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>();
  
  useEffect(() => {
    ref.current = value;
  });
  
  return ref.current;
}

/**
 * Stable reference hook that only updates when dependencies change.
 */
export function useStableReference<T>(
  factory: () => T,
  deps: DependencyList
): T {
  const ref = useRef<T>();
  const depsRef = useRef<DependencyList>();
  
  if (!depsRef.current || !shallowEqual(deps, depsRef.current)) {
    ref.current = factory();
    depsRef.current = deps;
  }
  
  return ref.current as T;
}

/**
 * Async operation hook with loading state and error handling.
 */
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsyncOperation<T, Args extends any[]>(
  operation: (...args: Args) => Promise<T>,
  deps: DependencyList = []
): [AsyncState<T>, (...args: Args) => Promise<void>] {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null
  });
  
  const execute = useCallback(async (...args: Args) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await operation(...args);
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error : new Error(String(error))
      }));
    }
  }, deps);
  
  return [state, execute];
}

/**
 * Performance measurement hook.
 */
export function usePerformanceMeasure(name: string, enabled: boolean = true) {
  const startTimeRef = useRef<number>();
  
  const start = useCallback(() => {
    if (enabled && performance.mark) {
      performance.mark(`${name}-start`);
      startTimeRef.current = performance.now();
    }
  }, [name, enabled]);
  
  const end = useCallback(() => {
    if (enabled && performance.mark && startTimeRef.current) {
      performance.mark(`${name}-end`);
      
      if (performance.measure) {
        performance.measure(name, `${name}-start`, `${name}-end`);
      }
      
      const duration = performance.now() - startTimeRef.current;
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      }
      
      return duration;
    }
    
    return 0;
  }, [name, enabled]);
  
  return { start, end };
}

/**
 * Memory-conscious list hook that automatically manages item lifecycle.
 */
export function useMemoryEfficientList<T>(
  items: T[],
  maxVisible: number = 100,
  keyExtractor: (item: T, index: number) => string
) {
  const [visibleStart, setVisibleStart] = useState(0);
  
  const visibleItems = useMemo(() => {
    const end = Math.min(visibleStart + maxVisible, items.length);
    return items.slice(visibleStart, end).map((item, index) => ({
      item,
      key: keyExtractor(item, visibleStart + index),
      absoluteIndex: visibleStart + index
    }));
  }, [items, visibleStart, maxVisible, keyExtractor]);
  
  const loadMore = useCallback(() => {
    if (visibleStart + maxVisible < items.length) {
      setVisibleStart(prev => prev + Math.floor(maxVisible / 2));
    }
  }, [visibleStart, maxVisible, items.length]);
  
  const reset = useCallback(() => {
    setVisibleStart(0);
  }, []);
  
  return {
    visibleItems,
    hasMore: visibleStart + maxVisible < items.length,
    loadMore,
    reset,
    totalCount: items.length,
    visibleCount: visibleItems.length
  };
}

/**
 * Render performance monitoring hook.
 */
export function useRenderPerformance(componentName: string, enabled: boolean = false) {
  const renderCount = useRef(0);
  const lastRenderTime = useRef<number>();
  
  useEffect(() => {
    if (enabled) {
      renderCount.current += 1;
      const now = performance.now();
      
      if (lastRenderTime.current) {
        const timeSinceLastRender = now - lastRenderTime.current;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(
            `[Render] ${componentName} #${renderCount.current} ` +
            `(${timeSinceLastRender.toFixed(2)}ms since last render)`
          );
        }
      }
      
      lastRenderTime.current = now;
    }
  });
  
  return {
    renderCount: renderCount.current,
    resetCount: () => { renderCount.current = 0; }
  };
}

// Utility functions
function shallowEqual(a: DependencyList, b: DependencyList): boolean {
  if (a.length !== b.length) return false;
  
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  
  return true;
}

/**
 * Component performance wrapper HOC.
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const { start, end } = usePerformanceMeasure(`render-${name}`, process.env.NODE_ENV === 'development');
    
    useEffect(() => {
      start();
      return () => {
        end();
      };
    });
    
    return <Component {...props} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName || 'Component'})`;
  
  return WrappedComponent;
}

/**
 * Hook for managing expensive computations with caching.
 */
interface ComputationCache<T> {
  [key: string]: {
    result: T;
    timestamp: number;
  };
}

export function useCachedComputation<T, Args extends any[]>(
  computation: (...args: Args) => T,
  keyGenerator: (...args: Args) => string,
  ttl: number = 5000 // 5 seconds default
): (...args: Args) => T {
  const cache = useRef<ComputationCache<T>>({});
  
  return useCallback((...args: Args): T => {
    const key = keyGenerator(...args);
    const now = Date.now();
    const cached = cache.current[key];
    
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.result;
    }
    
    const result = computation(...args);
    cache.current[key] = { result, timestamp: now };
    
    // Cleanup old entries periodically
    if (Object.keys(cache.current).length > 100) {
      const cutoff = now - ttl;
      cache.current = Object.fromEntries(
        Object.entries(cache.current)
          .filter(([, value]) => value.timestamp > cutoff)
      );
    }
    
    return result;
  }, [computation, keyGenerator, ttl]);
}