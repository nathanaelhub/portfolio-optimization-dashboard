#!/usr/bin/env node

/**
 * Performance Testing Script for Portfolio Optimization Dashboard
 * 
 * Tests frontend performance, API response times, and optimization algorithms.
 * Run before making the application public to ensure acceptable performance.
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');
const axios = require('axios');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const PERFORMANCE_THRESHOLDS = {
  pageLoad: 3000,        // Page should load within 3 seconds
  apiResponse: 1000,     // API should respond within 1 second
  optimization: 5000,    // Portfolio optimization within 5 seconds
  renderTime: 100,       // Component render time under 100ms
  memoryUsage: 100,      // Max 100MB memory usage
  cumulativeLayoutShift: 0.1,  // CLS under 0.1
  firstContentfulPaint: 1500,  // FCP under 1.5s
  largestContentfulPaint: 2500 // LCP under 2.5s
};

class PerformanceTester {
  constructor() {
    this.browser = null;
    this.results = {
      frontend: {},
      backend: {},
      summary: {},
      timestamp: new Date().toISOString()
    };
  }

  async initialize() {
    console.log('🚀 Starting Performance Testing Suite...\n');
    
    // Launch browser with performance monitoring
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--enable-precise-memory-info'
      ]
    });
  }

  async testFrontendPerformance() {
    console.log('📊 Testing Frontend Performance...');
    
    const page = await this.browser.newPage();
    
    // Enable performance monitoring
    await page.setCacheEnabled(false);
    await page.setViewport({ width: 1920, height: 1080 });
    
    // Start performance measurement
    const startTime = Date.now();
    
    // Navigate to the application
    const response = await page.goto(FRONTEND_URL, { 
      waitUntil: 'networkidle2',
      timeout: 10000 
    });
    
    const loadTime = Date.now() - startTime;
    
    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        memoryUsage: performance.memory ? {
          used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
          total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
          limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
        } : null
      };
    });
    
    // Test Core Web Vitals
    const coreWebVitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const vitals = {};
          
          entries.forEach((entry) => {
            if (entry.entryType === 'largest-contentful-paint') {
              vitals.lcp = entry.startTime;
            }
            if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
              vitals.cls = (vitals.cls || 0) + entry.value;
            }
          });
          
          resolve(vitals);
        });
        
        observer.observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] });
        
        // Timeout after 5 seconds
        setTimeout(() => resolve({}), 5000);
      });
    });
    
    // Test component rendering performance
    const componentRenderTime = await this.testComponentRenderTime(page);
    
    // Test responsive design
    const responsiveTests = await this.testResponsiveness(page);
    
    this.results.frontend = {
      pageLoad: {
        time: loadTime,
        passed: loadTime < PERFORMANCE_THRESHOLDS.pageLoad,
        threshold: PERFORMANCE_THRESHOLDS.pageLoad
      },
      performanceMetrics,
      coreWebVitals: {
        ...coreWebVitals,
        lcp: { 
          value: coreWebVitals.lcp || 0, 
          passed: (coreWebVitals.lcp || 0) < PERFORMANCE_THRESHOLDS.largestContentfulPaint 
        },
        cls: { 
          value: coreWebVitals.cls || 0, 
          passed: (coreWebVitals.cls || 0) < PERFORMANCE_THRESHOLDS.cumulativeLayoutShift 
        }
      },
      componentRenderTime,
      responsiveTests,
      memoryUsage: {
        ...performanceMetrics.memoryUsage,
        passed: performanceMetrics.memoryUsage ? 
          performanceMetrics.memoryUsage.used < PERFORMANCE_THRESHOLDS.memoryUsage : true
      }
    };
    
    await page.close();
    console.log('✅ Frontend performance testing completed\n');
  }

  async testComponentRenderTime(page) {
    console.log('  🔧 Testing component render times...');
    
    const renderTimes = {};
    
    // Test portfolio input form
    const portfolioFormTime = await page.evaluate(() => {
      const start = performance.now();
      // Simulate form interaction
      const event = new CustomEvent('test-render');
      document.dispatchEvent(event);
      return performance.now() - start;
    });
    
    renderTimes.portfolioForm = {
      time: portfolioFormTime,
      passed: portfolioFormTime < PERFORMANCE_THRESHOLDS.renderTime
    };
    
    return renderTimes;
  }

  async testResponsiveness(page) {
    console.log('  📱 Testing responsive design...');
    
    const viewports = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1920, height: 1080 }
    ];
    
    const responsiveResults = {};
    
    for (const viewport of viewports) {
      await page.setViewport(viewport);
      await page.waitForTimeout(500); // Allow for responsive adjustments
      
      const isResponsive = await page.evaluate(() => {
        // Check for horizontal scroll
        const hasHorizontalScroll = document.body.scrollWidth > window.innerWidth;
        
        // Check for proper mobile menu
        const mobileMenu = document.querySelector('[data-testid="mobile-menu"]');
        const desktopMenu = document.querySelector('[data-testid="desktop-menu"]');
        
        return {
          hasHorizontalScroll,
          hasMobileMenu: !!mobileMenu,
          hasDesktopMenu: !!desktopMenu,
          elementsVisible: document.querySelectorAll('*').length > 0
        };
      });
      
      responsiveResults[viewport.name] = {
        viewport,
        responsive: !isResponsive.hasHorizontalScroll && isResponsive.elementsVisible,
        details: isResponsive
      };
    }
    
    return responsiveResults;
  }

  async testBackendPerformance() {
    console.log('🖥️  Testing Backend Performance...');
    
    const endpoints = [
      { path: '/health', method: 'GET', name: 'Health Check' },
      { path: '/api/v1/assets', method: 'GET', name: 'Asset List' },
      { path: '/api/v1/optimize', method: 'POST', name: 'Portfolio Optimization', 
        data: { 
          symbols: ['AAPL', 'MSFT', 'GOOGL'], 
          method: 'markowitz' 
        } 
      }
    ];
    
    this.results.backend.endpoints = {};
    
    for (const endpoint of endpoints) {
      try {
        const startTime = Date.now();
        
        const config = {
          method: endpoint.method,
          url: `${BACKEND_URL}${endpoint.path}`,
          timeout: 10000,
          ...(endpoint.data && { data: endpoint.data })
        };
        
        const response = await axios(config);
        const responseTime = Date.now() - startTime;
        
        const threshold = endpoint.name === 'Portfolio Optimization' ? 
          PERFORMANCE_THRESHOLDS.optimization : PERFORMANCE_THRESHOLDS.apiResponse;
        
        this.results.backend.endpoints[endpoint.name] = {
          responseTime,
          status: response.status,
          passed: responseTime < threshold,
          threshold,
          dataSize: JSON.stringify(response.data).length
        };
        
        console.log(`  ✅ ${endpoint.name}: ${responseTime}ms`);
        
      } catch (error) {
        this.results.backend.endpoints[endpoint.name] = {
          error: error.message,
          passed: false
        };
        console.log(`  ❌ ${endpoint.name}: ${error.message}`);
      }
    }
    
    console.log('✅ Backend performance testing completed\n');
  }

  async testDatabasePerformance() {
    console.log('🗄️  Testing Database Performance...');
    
    try {
      // Test complex portfolio query
      const startTime = Date.now();
      
      const response = await axios.get(`${BACKEND_URL}/api/v1/portfolios?limit=100`);
      const queryTime = Date.now() - startTime;
      
      this.results.backend.database = {
        complexQuery: {
          time: queryTime,
          passed: queryTime < 500,
          recordCount: Array.isArray(response.data) ? response.data.length : 0
        }
      };
      
      console.log(`  ✅ Complex query: ${queryTime}ms`);
      
    } catch (error) {
      this.results.backend.database = {
        error: error.message,
        passed: false
      };
      console.log(`  ❌ Database test failed: ${error.message}`);
    }
    
    console.log('✅ Database performance testing completed\n');
  }

  async testCrossBrowserCompatibility() {
    console.log('🌐 Testing Cross-Browser Compatibility...');
    
    // Note: This is a simplified test. In production, you'd use tools like Selenium Grid
    // or BrowserStack for comprehensive cross-browser testing
    
    const browsers = ['chromium']; // Add 'firefox', 'webkit' for full testing
    const compatibility = {};
    
    for (const browserName of browsers) {
      try {
        const browser = await puppeteer.launch({ 
          product: browserName === 'firefox' ? 'firefox' : 'chrome',
          headless: true 
        });
        
        const page = await browser.newPage();
        
        // Test basic functionality
        await page.goto(FRONTEND_URL, { waitUntil: 'networkidle2' });
        
        const basicFunctionality = await page.evaluate(() => {
          return {
            hasReact: !!window.React || !!document.querySelector('[data-reactroot]'),
            hasES6Support: typeof Promise !== 'undefined',
            hasLocalStorage: typeof localStorage !== 'undefined',
            hasWebGL: !!document.createElement('canvas').getContext('webgl'),
            viewportMeta: !!document.querySelector('meta[name="viewport"]')
          };
        });
        
        compatibility[browserName] = {
          supported: true,
          features: basicFunctionality
        };
        
        await browser.close();
        console.log(`  ✅ ${browserName}: Compatible`);
        
      } catch (error) {
        compatibility[browserName] = {
          supported: false,
          error: error.message
        };
        console.log(`  ❌ ${browserName}: ${error.message}`);
      }
    }
    
    this.results.crossBrowser = compatibility;
    console.log('✅ Cross-browser testing completed\n');
  }

  generateSummary() {
    console.log('📋 Generating Performance Summary...');
    
    const summary = {
      overall: 'PASS',
      details: {
        frontend: 'PASS',
        backend: 'PASS',
        crossBrowser: 'PASS'
      },
      issues: [],
      recommendations: []
    };
    
    // Check frontend results
    if (this.results.frontend.pageLoad && !this.results.frontend.pageLoad.passed) {
      summary.details.frontend = 'FAIL';
      summary.issues.push(`Page load time (${this.results.frontend.pageLoad.time}ms) exceeds threshold`);
      summary.recommendations.push('Optimize bundle size and implement code splitting');
    }
    
    if (this.results.frontend.memoryUsage && !this.results.frontend.memoryUsage.passed) {
      summary.details.frontend = 'FAIL';
      summary.issues.push(`Memory usage (${this.results.frontend.memoryUsage.used}MB) exceeds threshold`);
      summary.recommendations.push('Investigate memory leaks and optimize component rendering');
    }
    
    // Check backend results
    Object.entries(this.results.backend.endpoints || {}).forEach(([name, result]) => {
      if (!result.passed) {
        summary.details.backend = 'FAIL';
        summary.issues.push(`${name} response time exceeds threshold`);
        summary.recommendations.push(`Optimize ${name} endpoint performance`);
      }
    });
    
    // Check responsive design
    if (this.results.frontend.responsiveTests) {
      Object.entries(this.results.frontend.responsiveTests).forEach(([device, result]) => {
        if (!result.responsive) {
          summary.details.frontend = 'FAIL';
          summary.issues.push(`Responsive design issues on ${device}`);
          summary.recommendations.push(`Fix responsive layout for ${device} devices`);
        }
      });
    }
    
    // Overall status
    if (summary.details.frontend === 'FAIL' || 
        summary.details.backend === 'FAIL' || 
        summary.details.crossBrowser === 'FAIL') {
      summary.overall = 'FAIL';
    }
    
    this.results.summary = summary;
    
    return summary;
  }

  async generateReport() {
    const reportPath = path.join(__dirname, '..', 'performance-report.json');
    
    const report = {
      ...this.results,
      metadata: {
        testDuration: Date.now() - new Date(this.results.timestamp).getTime(),
        thresholds: PERFORMANCE_THRESHOLDS,
        environment: {
          nodeVersion: process.version,
          platform: process.platform,
          frontendUrl: FRONTEND_URL,
          backendUrl: BACKEND_URL
        }
      }
    };
    
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`📄 Full report saved to: ${reportPath}`);
    return reportPath;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  displayResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 PERFORMANCE TEST RESULTS');
    console.log('='.repeat(60));
    
    const summary = this.results.summary;
    
    console.log(`\n🎯 Overall Status: ${summary.overall === 'PASS' ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Frontend: ${summary.details.frontend === 'PASS' ? '✅' : '❌'} ${summary.details.frontend}`);
    console.log(`   Backend:  ${summary.details.backend === 'PASS' ? '✅' : '❌'} ${summary.details.backend}`);
    console.log(`   Cross-Browser: ${summary.details.crossBrowser === 'PASS' ? '✅' : '❌'} ${summary.details.crossBrowser}`);
    
    if (summary.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      summary.issues.forEach(issue => console.log(`   • ${issue}`));
    }
    
    if (summary.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      summary.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

// Main execution
async function runPerformanceTests() {
  const tester = new PerformanceTester();
  
  try {
    await tester.initialize();
    
    // Run all performance tests
    await tester.testFrontendPerformance();
    await tester.testBackendPerformance();
    await tester.testDatabasePerformance();
    await tester.testCrossBrowserCompatibility();
    
    // Generate summary and report
    tester.generateSummary();
    await tester.generateReport();
    
    // Display results
    tester.displayResults();
    
    // Exit with appropriate code
    const success = tester.results.summary.overall === 'PASS';
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Performance testing failed:', error);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

// Run if called directly
if (require.main === module) {
  runPerformanceTests();
}

module.exports = { PerformanceTester, PERFORMANCE_THRESHOLDS };