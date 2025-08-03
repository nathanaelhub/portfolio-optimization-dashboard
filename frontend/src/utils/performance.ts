/**
 * Performance utilities and monitoring for React application.
 * 
 * Provides tools for measuring performance, optimizing bundle loading,
 * and monitoring application health metrics.
 */

// Performance measurement utilities
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];
  
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }
  
  constructor() {
    this.initializeObservers();
  }
  
  private initializeObservers() {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      return;
    }
    
    try {
      // Observe navigation timing
      const navObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            this.recordNavigationMetrics(entry as PerformanceNavigationTiming);
          }
        }
      });
      navObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navObserver);
      
      // Observe resource loading
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'resource') {
            this.recordResourceMetrics(entry as PerformanceResourceTiming);
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
      
      // Observe long tasks
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'longtask') {
            this.recordLongTask(entry);
          }
        }
      });
      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
      
      // Observe largest contentful paint
      const lcpObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'largest-contentful-paint') {
            this.recordMetric('lcp', entry.startTime);
          }
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);
      
      // Observe first input delay
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'first-input') {
            const fid = (entry as any).processingStart - entry.startTime;
            this.recordMetric('fid', fid);
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);
      
    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }
  
  private recordNavigationMetrics(entry: PerformanceNavigationTiming) {
    const metrics = {
      'dns-lookup': entry.domainLookupEnd - entry.domainLookupStart,
      'tcp-connect': entry.connectEnd - entry.connectStart,
      'ssl-handshake': entry.connectEnd - entry.secureConnectionStart,
      'ttfb': entry.responseStart - entry.requestStart,
      'download': entry.responseEnd - entry.responseStart,
      'dom-parse': entry.domInteractive - entry.responseEnd,
      'dom-ready': entry.domContentLoadedEventEnd - entry.domContentLoadedEventStart,
      'load-complete': entry.loadEventEnd - entry.loadEventStart,
      'total-load-time': entry.loadEventEnd - entry.navigationStart
    };
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (value > 0) {
        this.recordMetric(key, value);
      }
    });
  }
  
  private recordResourceMetrics(entry: PerformanceResourceTiming) {
    const resourceType = this.getResourceType(entry.name);
    const loadTime = entry.responseEnd - entry.startTime;
    
    this.recordMetric(`resource-${resourceType}`, loadTime);
    
    // Track specific resource patterns
    if (entry.name.includes('chunk') || entry.name.includes('.js')) {
      this.recordMetric('js-chunk-load', loadTime);
    }
    
    if (entry.name.includes('.css')) {
      this.recordMetric('css-load', loadTime);
    }
    
    if (entry.name.includes('/api/')) {
      this.recordMetric('api-request', loadTime);
    }
  }
  
  private recordLongTask(entry: PerformanceEntry) {
    this.recordMetric('long-task', entry.duration);
    
    if (entry.duration > 100) {
      console.warn('Long task detected:', {
        duration: entry.duration,
        startTime: entry.startTime,
        name: entry.name
      });
    }
  }
  
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'javascript';
    if (url.includes('.css')) return 'stylesheet';
    if (url.includes('.png') || url.includes('.jpg') || url.includes('.svg')) return 'image';
    if (url.includes('/api/')) return 'api';
    if (url.includes('.woff') || url.includes('.ttf')) return 'font';
    return 'other';
  }
  
  recordMetric(name: string, value: number) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const values = this.metrics.get(name)!;
    values.push(value);
    
    // Keep only last 100 measurements
    if (values.length > 100) {
      values.shift();
    }
  }
  
  getMetrics(): Record<string, any> {
    const summary: Record<string, any> = {};
    
    this.metrics.forEach((values, name) => {
      if (values.length === 0) return;
      
      const sorted = [...values].sort((a, b) => a - b);
      summary[name] = {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p90: sorted[Math.floor(sorted.length * 0.9)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)]
      };
    });
    
    return summary;
  }
  
  measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    return fn().finally(() => {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    });
  }
  
  measureSync<T>(name: string, fn: () => T): T {
    const start = performance.now();
    try {
      return fn();
    } finally {
      const duration = performance.now() - start;
      this.recordMetric(name, duration);
    }
  }
  
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics.clear();
  }
}

// Bundle analysis utilities
export class BundleAnalyzer {
  private loadedChunks: Set<string> = new Set();
  private chunkLoadTimes: Map<string, number> = new Map();
  
  recordChunkLoad(chunkName: string, loadTime: number) {
    this.loadedChunks.add(chunkName);
    this.chunkLoadTimes.set(chunkName, loadTime);
  }
  
  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks);
  }
  
  getChunkLoadTime(chunkName: string): number | undefined {
    return this.chunkLoadTimes.get(chunkName);
  }
  
  getTotalChunkSize(): Promise<number> {
    return Promise.all(
      Array.from(this.loadedChunks).map(chunk => this.getChunkSize(chunk))
    ).then(sizes => sizes.reduce((total, size) => total + size, 0));
  }
  
  private async getChunkSize(chunkName: string): Promise<number> {
    try {
      const response = await fetch(chunkName, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch {
      return 0;
    }
  }
  
  getUnusedChunks(): string[] {
    // This would analyze which chunks are loaded but not actively used
    // Implementation would depend on how chunks are tracked
    return [];
  }
}

// Memory monitoring utilities
export class MemoryMonitor {
  private samples: Array<{ timestamp: number; used: number; total: number }> = [];
  private intervalId: number | null = null;
  
  start(intervalMs: number = 5000) {
    if (this.intervalId) return;
    
    this.intervalId = window.setInterval(() => {
      this.takeSample();
    }, intervalMs);
  }
  
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
  
  takeSample() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.samples.push({
        timestamp: Date.now(),
        used: memory.usedJSHeapSize || 0,
        total: memory.totalJSHeapSize || 0
      });
      
      // Keep only last 100 samples
      if (this.samples.length > 100) {
        this.samples.shift();
      }
    }
  }
  
  getMemoryUsage() {
    if (this.samples.length === 0) return null;
    
    const latest = this.samples[this.samples.length - 1];
    const trend = this.samples.length > 1 
      ? latest.used - this.samples[0].used 
      : 0;
    
    return {
      current: latest.used,
      total: latest.total,
      percentage: (latest.used / latest.total) * 100,
      trend,
      samples: this.samples.length
    };
  }
  
  detectMemoryLeaks(): boolean {
    if (this.samples.length < 10) return false;
    
    // Simple leak detection: consistent upward trend
    const recentSamples = this.samples.slice(-10);
    const increases = recentSamples.reduce((count, sample, index) => {
      if (index === 0) return count;
      return sample.used > recentSamples[index - 1].used ? count + 1 : count;
    }, 0);
    
    return increases >= 8; // 8 out of 9 increases suggests a leak
  }
}

// Component performance utilities
export function measureComponentRender<P extends object>(
  Component: React.ComponentType<P>,
  name?: string
): React.ComponentType<P> {
  const componentName = name || Component.displayName || Component.name || 'Unknown';
  
  return React.memo((props: P) => {
    const monitor = PerformanceMonitor.getInstance();
    
    React.useLayoutEffect(() => {
      monitor.recordMetric(`render-${componentName}`, performance.now());
    });
    
    return React.createElement(Component, props);
  });
}

// API performance utilities
export class APIPerformanceTracker {
  private static instance: APIPerformanceTracker;
  private requests: Map<string, Array<{ duration: number; status: number; timestamp: number }>> = new Map();
  
  static getInstance(): APIPerformanceTracker {
    if (!APIPerformanceTracker.instance) {
      APIPerformanceTracker.instance = new APIPerformanceTracker();
    }
    return APIPerformanceTracker.instance;
  }
  
  trackRequest(url: string, duration: number, status: number) {
    const endpoint = this.normalizeEndpoint(url);
    
    if (!this.requests.has(endpoint)) {
      this.requests.set(endpoint, []);
    }
    
    const requests = this.requests.get(endpoint)!;
    requests.push({
      duration,
      status,
      timestamp: Date.now()
    });
    
    // Keep only last 50 requests per endpoint
    if (requests.length > 50) {
      requests.shift();
    }
  }
  
  private normalizeEndpoint(url: string): string {
    // Remove query parameters and IDs for grouping
    return url.replace(/\?.*$/, '')
              .replace(/\/\d+/g, '/:id')
              .replace(/\/[a-f0-9-]{36}/g, '/:uuid');
  }
  
  getEndpointStats(endpoint: string) {
    const requests = this.requests.get(endpoint);
    if (!requests || requests.length === 0) return null;
    
    const durations = requests.map(r => r.duration);
    const sorted = [...durations].sort((a, b) => a - b);
    
    return {
      count: requests.length,
      avgDuration: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      minDuration: sorted[0],
      maxDuration: sorted[sorted.length - 1],
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p90: sorted[Math.floor(sorted.length * 0.9)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      errorRate: requests.filter(r => r.status >= 400).length / requests.length,
      recentRequests: requests.slice(-10)
    };
  }
  
  getAllStats() {
    const stats: Record<string, any> = {};
    this.requests.forEach((_, endpoint) => {
      stats[endpoint] = this.getEndpointStats(endpoint);
    });
    return stats;
  }
}

// Performance reporting utilities
export class PerformanceReporter {
  private static instance: PerformanceReporter;
  
  static getInstance(): PerformanceReporter {
    if (!PerformanceReporter.instance) {
      PerformanceReporter.instance = new PerformanceReporter();
    }
    return PerformanceReporter.instance;
  }
  
  async generateReport() {
    const monitor = PerformanceMonitor.getInstance();
    const apiTracker = APIPerformanceTracker.getInstance();
    const memoryMonitor = new MemoryMonitor();
    
    memoryMonitor.takeSample();
    
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
      performance: monitor.getMetrics(),
      api: apiTracker.getAllStats(),
      memory: memoryMonitor.getMemoryUsage(),
      vitals: await this.getWebVitals()
    };
    
    return report;
  }
  
  private getConnectionInfo() {
    const nav = navigator as any;
    if ('connection' in nav) {
      return {
        effectiveType: nav.connection.effectiveType,
        downlink: nav.connection.downlink,
        rtt: nav.connection.rtt,
        saveData: nav.connection.saveData
      };
    }
    return null;
  }
  
  private async getWebVitals() {
    return new Promise((resolve) => {
      // This would integrate with web-vitals library in a real implementation
      resolve({
        cls: null,
        fid: null,
        fcp: null,
        lcp: null,
        ttfb: null
      });
    });
  }
  
  sendReport(report: any, endpoint: string = '/api/performance') {
    if (process.env.NODE_ENV === 'production') {
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      }).catch(error => {
        console.warn('Failed to send performance report:', error);
      });
    } else {
      console.log('Performance Report:', report);
    }
  }
}

// Global performance setup
export function initializePerformanceMonitoring() {
  const monitor = PerformanceMonitor.getInstance();
  const memoryMonitor = new MemoryMonitor();
  const reporter = PerformanceReporter.getInstance();
  
  // Start memory monitoring
  memoryMonitor.start();
  
  // Send performance report periodically in production
  if (process.env.NODE_ENV === 'production') {
    setInterval(async () => {
      const report = await reporter.generateReport();
      reporter.sendReport(report);
    }, 5 * 60 * 1000); // Every 5 minutes
  }
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    monitor.destroy();
    memoryMonitor.stop();
  });
  
  return { monitor, memoryMonitor, reporter };
}

// Utility functions for common performance patterns
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T => {
  let inThrottle: boolean;
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  }) as T;
};

export const memoize = <T extends (...args: any[]) => any>(
  func: T,
  getKey: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T => {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey(...args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    return result;
  }) as T;
};

// Export global instances
export const performanceMonitor = PerformanceMonitor.getInstance();
export const apiPerformanceTracker = APIPerformanceTracker.getInstance();
export const performanceReporter = PerformanceReporter.getInstance();