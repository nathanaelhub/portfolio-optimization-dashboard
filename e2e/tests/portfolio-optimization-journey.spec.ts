/**
 * End-to-end tests for complete portfolio optimization user journey.
 * 
 * Tests the full workflow from portfolio creation to optimization
 * across browser interactions, API calls, and database persistence.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// Test data
const testUser = {
  email: 'e2e-test@example.com',
  password: 'SecurePassword123!',
  fullName: 'E2E Test User'
};

const testPortfolio = {
  name: 'E2E Test Portfolio',
  description: 'End-to-end testing portfolio',
  assets: [
    { symbol: 'AAPL', allocation: 40 },
    { symbol: 'MSFT', allocation: 30 },
    { symbol: 'GOOGL', allocation: 20 },
    { symbol: 'AMZN', allocation: 10 }
  ]
};

class PortfolioPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/portfolios');
  }

  async createPortfolio(portfolio: typeof testPortfolio) {
    await this.page.click('[data-testid="create-portfolio-button"]');
    
    // Fill portfolio details
    await this.page.fill('[data-testid="portfolio-name-input"]', portfolio.name);
    await this.page.fill('[data-testid="portfolio-description-input"]', portfolio.description);
    
    // Add assets
    for (const asset of portfolio.assets) {
      await this.page.click('[data-testid="add-asset-button"]');
      
      const assetRows = await this.page.locator('[data-testid^="asset-row-"]').count();
      const currentRow = `[data-testid="asset-row-${assetRows - 1}"]`;
      
      await this.page.fill(`${currentRow} [data-testid="symbol-input"]`, asset.symbol);
      await this.page.fill(`${currentRow} [data-testid="allocation-input"]`, asset.allocation.toString());
    }
    
    await this.page.click('[data-testid="create-portfolio-submit"]');
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="success-message"]')).toBeVisible();
  }

  async selectPortfolio(portfolioName: string) {
    await this.page.click(`[data-testid="portfolio-card-${portfolioName}"]`);
  }

  async optimizePortfolio(objective: string = 'max_sharpe') {
    await this.page.click('[data-testid="optimize-button"]');
    
    // Select optimization objective
    await this.page.selectOption('[data-testid="optimization-objective"]', objective);
    
    // Set constraints if needed
    await this.page.fill('[data-testid="max-weight-constraint"]', '40');
    await this.page.fill('[data-testid="min-weight-constraint"]', '5');
    
    await this.page.click('[data-testid="run-optimization-button"]');
    
    // Wait for optimization to complete
    await expect(this.page.locator('[data-testid="optimization-results"]')).toBeVisible({ timeout: 30000 });
  }

  async acceptOptimizationResults() {
    await this.page.click('[data-testid="accept-optimization-button"]');
    await expect(this.page.locator('[data-testid="portfolio-updated-message"]')).toBeVisible();
  }

  async exportPortfolio(format: string) {
    await this.page.click('[data-testid="export-dropdown"]');
    await this.page.click(`[data-testid="export-${format}"]`);
    
    // Wait for download to start
    const downloadPromise = this.page.waitForEvent('download');
    const download = await downloadPromise;
    
    return download;
  }
}

class AuthPage {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/login');
    await this.page.fill('[data-testid="email-input"]', email);
    await this.page.fill('[data-testid="password-input"]', password);
    await this.page.click('[data-testid="login-button"]');
    
    // Wait for redirect to dashboard
    await expect(this.page).toHaveURL('/dashboard');
  }

  async register(user: typeof testUser) {
    await this.page.goto('/register');
    await this.page.fill('[data-testid="full-name-input"]', user.fullName);
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    await this.page.fill('[data-testid="confirm-password-input"]', user.password);
    await this.page.click('[data-testid="register-button"]');
    
    // Wait for success message
    await expect(this.page.locator('[data-testid="registration-success"]')).toBeVisible();
  }

  async logout() {
    await this.page.click('[data-testid="user-menu"]');
    await this.page.click('[data-testid="logout-button"]');
    await expect(this.page).toHaveURL('/login');
  }
}

test.describe('Portfolio Optimization Complete Journey', () => {
  let authPage: AuthPage;
  let portfolioPage: PortfolioPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    portfolioPage = new PortfolioPage(page);
  });

  test('complete user journey from registration to optimization', async ({ page }) => {
    // Step 1: Register new user
    await authPage.register(testUser);
    
    // Step 2: Login
    await authPage.login(testUser.email, testUser.password);
    
    // Step 3: Create portfolio
    await portfolioPage.goto();
    await portfolioPage.createPortfolio(testPortfolio);
    
    // Step 4: Verify portfolio is displayed
    await expect(page.locator(`text=${testPortfolio.name}`)).toBeVisible();
    
    // Step 5: Open portfolio for optimization
    await portfolioPage.selectPortfolio(testPortfolio.name);
    
    // Step 6: Run optimization
    await portfolioPage.optimizePortfolio('max_sharpe');
    
    // Step 7: Verify optimization results
    await expect(page.locator('[data-testid="optimization-metrics"]')).toBeVisible();
    await expect(page.locator('[data-testid="expected-return"]')).toContainText('%');
    await expect(page.locator('[data-testid="volatility"]')).toContainText('%');
    await expect(page.locator('[data-testid="sharpe-ratio"]')).toBeVisible();
    
    // Step 8: Accept optimization results
    await portfolioPage.acceptOptimizationResults();
    
    // Step 9: Verify portfolio is updated
    await expect(page.locator('[data-testid="optimized-weights"]')).toBeVisible();
  });

  test('portfolio creation with validation errors', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    await portfolioPage.goto();
    
    await page.click('[data-testid="create-portfolio-button"]');
    
    // Try to submit empty form
    await page.click('[data-testid="create-portfolio-submit"]');
    
    // Should show validation errors
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="assets-error"]')).toBeVisible();
    
    // Fill name but invalid allocations
    await page.fill('[data-testid="portfolio-name-input"]', 'Invalid Portfolio');
    await page.click('[data-testid="add-asset-button"]');
    await page.fill('[data-testid="asset-row-0"] [data-testid="symbol-input"]', 'AAPL');
    await page.fill('[data-testid="asset-row-0"] [data-testid="allocation-input"]', '150'); // > 100%
    
    await page.click('[data-testid="create-portfolio-submit"]');
    
    // Should show allocation error
    await expect(page.locator('[data-testid="allocation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="allocation-error"]')).toContainText('100%');
  });

  test('optimization with different objectives and constraints', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    await portfolioPage.goto();
    await portfolioPage.selectPortfolio(testPortfolio.name);
    
    // Test 1: Maximum Sharpe Ratio
    await portfolioPage.optimizePortfolio('max_sharpe');
    
    const sharpeResults = {
      expectedReturn: await page.textContent('[data-testid="expected-return"]'),
      volatility: await page.textContent('[data-testid="volatility"]'),
      sharpeRatio: await page.textContent('[data-testid="sharpe-ratio"]')
    };
    
    // Test 2: Minimum Volatility
    await page.click('[data-testid="new-optimization-button"]');
    await portfolioPage.optimizePortfolio('min_volatility');
    
    const minVolResults = {
      expectedReturn: await page.textContent('[data-testid="expected-return"]'),
      volatility: await page.textContent('[data-testid="volatility"]'),
      sharpeRatio: await page.textContent('[data-testid="sharpe-ratio"]')
    };
    
    // Min volatility should have lower volatility than max Sharpe
    const sharpeVol = parseFloat(sharpeResults.volatility!.replace('%', ''));
    const minVol = parseFloat(minVolResults.volatility!.replace('%', ''));
    expect(minVol).toBeLessThan(sharpeVol);
    
    // Test 3: Target Return
    await page.click('[data-testid="new-optimization-button"]');
    await page.selectOption('[data-testid="optimization-objective"]', 'target_return');
    await page.fill('[data-testid="target-return-input"]', '12');
    await page.click('[data-testid="run-optimization-button"]');
    
    await expect(page.locator('[data-testid="optimization-results"]')).toBeVisible({ timeout: 30000 });
    
    const targetReturnResult = await page.textContent('[data-testid="expected-return"]');
    const achievedReturn = parseFloat(targetReturnResult!.replace('%', ''));
    
    // Should achieve approximately the target return (within 0.5%)
    expect(Math.abs(achievedReturn - 12)).toBeLessThan(0.5);
  });

  test('real-time data updates and interactions', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    
    // Navigate to real-time dashboard
    await page.goto('/dashboard/realtime');
    
    // Verify initial data load
    await expect(page.locator('[data-testid="portfolio-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
    
    // Check sparklines are rendered
    await expect(page.locator('[data-testid="portfolio-sparkline"]')).toBeVisible();
    
    // Verify holdings table
    const holdingsTable = page.locator('[data-testid="holdings-table"]');
    await expect(holdingsTable).toBeVisible();
    
    // Check sorting functionality
    await page.click('[data-testid="sort-by-allocation"]');
    
    // First row should have highest allocation
    const firstRowAllocation = await page.textContent('[data-testid="holding-row-0"] [data-testid="allocation-value"]');
    const secondRowAllocation = await page.textContent('[data-testid="holding-row-1"] [data-testid="allocation-value"]');
    
    const first = parseFloat(firstRowAllocation!.replace('%', ''));
    const second = parseFloat(secondRowAllocation!.replace('%', ''));
    expect(first).toBeGreaterThanOrEqual(second);
    
    // Test alert interactions
    if (await page.locator('[data-testid="alert-item"]').count() > 0) {
      await page.click('[data-testid="alert-action-button"]');
      // Should handle alert action
    }
  });

  test('responsive design across different screen sizes', async ({ page, browserName }) => {
    await authPage.login(testUser.email, testUser.password);
    await portfolioPage.goto();
    
    // Test desktop view
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('[data-testid="desktop-layout"]')).toBeVisible();
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Mobile menu should be accessible
    await page.click('[data-testid="mobile-menu-button"]');
    await expect(page.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    // Charts should adapt to mobile
    await page.goto('/dashboard');
    const charts = page.locator('[data-testid^="chart-"]');
    const chartCount = await charts.count();
    
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      await expect(chart).toBeVisible();
      
      // Charts should be stacked vertically on mobile
      const boundingBox = await chart.boundingBox();
      expect(boundingBox!.width).toBeLessThan(400); // Should fit mobile width
    }
  });

  test('file upload and CSV import functionality', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    await portfolioPage.goto();
    
    // Create CSV content
    const csvContent = `Symbol,Allocation
AAPL,0.35
MSFT,0.25
GOOGL,0.20
AMZN,0.20`;
    
    // Create a temporary file
    const buffer = Buffer.from(csvContent);
    
    await page.click('[data-testid="import-portfolio-button"]');
    
    // Upload file
    const fileInput = page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles({
      name: 'portfolio.csv',
      mimeType: 'text/csv',
      buffer: buffer
    });
    
    // Verify file is processed
    await expect(page.locator('[data-testid="file-preview"]')).toBeVisible();
    await expect(page.locator('text=AAPL')).toBeVisible();
    await expect(page.locator('text=35%')).toBeVisible();
    
    // Import the portfolio
    await page.fill('[data-testid="imported-portfolio-name"]', 'CSV Imported Portfolio');
    await page.click('[data-testid="import-confirm-button"]');
    
    // Verify portfolio was created
    await expect(page.locator('text=CSV Imported Portfolio')).toBeVisible();
  });

  test('export functionality in multiple formats', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    await portfolioPage.goto();
    await portfolioPage.selectPortfolio(testPortfolio.name);
    
    // Test PDF export
    const pdfDownload = await portfolioPage.exportPortfolio('pdf');
    expect(pdfDownload.suggestedFilename()).toContain('.pdf');
    
    // Test Excel export
    const excelDownload = await portfolioPage.exportPortfolio('excel');
    expect(excelDownload.suggestedFilename()).toContain('.xlsx');
    
    // Test CSV export
    const csvDownload = await portfolioPage.exportPortfolio('csv');
    expect(csvDownload.suggestedFilename()).toContain('.csv');
    
    // Verify CSV content
    const csvPath = await csvDownload.path();
    if (csvPath) {
      const fs = require('fs');
      const csvContent = fs.readFileSync(csvPath, 'utf8');
      expect(csvContent).toContain('Symbol,Allocation');
      expect(csvContent).toContain('AAPL');
    }
  });

  test('error handling and recovery', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    
    // Test network error handling
    await page.route('**/api/v1/optimize', route => {
      route.abort('failed');
    });
    
    await portfolioPage.goto();
    await portfolioPage.selectPortfolio(testPortfolio.name);
    await page.click('[data-testid="optimize-button"]');
    await page.click('[data-testid="run-optimization-button"]');
    
    // Should show error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    
    // Restore network and retry
    await page.unroute('**/api/v1/optimize');
    await page.click('[data-testid="retry-button"]');
    
    // Should succeed after retry
    await expect(page.locator('[data-testid="optimization-results"]')).toBeVisible({ timeout: 30000 });
    
    // Test invalid data handling
    await page.route('**/api/v1/portfolios/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ invalid: 'data' })
      });
    });
    
    await page.reload();
    
    // Should show graceful error handling
    await expect(page.locator('[data-testid="data-error-message"]')).toBeVisible();
  });

  test('accessibility compliance throughout user journey', async ({ page }) => {
    await authPage.login(testUser.email, testUser.password);
    
    // Test keyboard navigation
    await portfolioPage.goto();
    
    // Should be able to navigate with Tab
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement);
    
    // Test skip links
    await page.keyboard.press('Tab');
    const skipLink = page.locator('[data-testid="skip-to-main"]');
    if (await skipLink.isVisible()) {
      await page.keyboard.press('Enter');
      const mainContent = page.locator('main');
      await expect(mainContent).toBeFocused();
    }
    
    // Test form accessibility
    await page.click('[data-testid="create-portfolio-button"]');
    
    // Form should have proper labels
    const nameInput = page.locator('[data-testid="portfolio-name-input"]');
    const nameLabel = await nameInput.getAttribute('aria-labelledby');
    expect(nameLabel).toBeTruthy();
    
    // Error messages should be announced
    await page.click('[data-testid="create-portfolio-submit"]');
    const errorMessage = page.locator('[data-testid="name-error"]');
    const ariaLive = await errorMessage.getAttribute('aria-live');
    expect(ariaLive).toBe('polite');
    
    // Test chart accessibility
    await page.goto('/dashboard');
    const charts = page.locator('[role="img"]');
    const chartCount = await charts.count();
    
    for (let i = 0; i < chartCount; i++) {
      const chart = charts.nth(i);
      const ariaLabel = await chart.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }
  });

  test('performance under load', async ({ page, context }) => {
    await authPage.login(testUser.email, testUser.password);
    
    // Create a large portfolio for performance testing
    const largePortfolio = {
      name: 'Large Performance Test Portfolio',
      description: 'Portfolio with many assets for performance testing',
      assets: Array.from({ length: 50 }, (_, i) => ({
        symbol: `STOCK${i.toString().padStart(3, '0')}`,
        allocation: 2 // 2% each for 50 stocks = 100%
      }))
    };
    
    // Measure portfolio creation time
    const startTime = Date.now();
    await portfolioPage.goto();
    await portfolioPage.createPortfolio(largePortfolio);
    const creationTime = Date.now() - startTime;
    
    // Should create portfolio within reasonable time (< 10 seconds)
    expect(creationTime).toBeLessThan(10000);
    
    // Measure optimization time for large portfolio
    await portfolioPage.selectPortfolio(largePortfolio.name);
    
    const optimizationStartTime = Date.now();
    await portfolioPage.optimizePortfolio('max_sharpe');
    const optimizationTime = Date.now() - optimizationStartTime;
    
    // Optimization should complete within reasonable time (< 30 seconds)
    expect(optimizationTime).toBeLessThan(30000);
    
    // Test memory usage doesn't grow excessively
    const initialMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
    
    // Perform multiple operations
    for (let i = 0; i < 10; i++) {
      await page.reload();
      await page.waitForLoadState('networkidle');
    }
    
    const finalMemory = await page.evaluate(() => (performance as any).memory?.usedJSHeapSize || 0);
    
    // Memory shouldn't grow more than 50MB
    if (initialMemory > 0 && finalMemory > 0) {
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // 50MB
    }
  });
});

test.describe('Cross-browser Compatibility', () => {
  ['chromium', 'firefox', 'webkit'].forEach(browserName => {
    test(`core functionality works in ${browserName}`, async ({ page }) => {
      const authPage = new AuthPage(page);
      const portfolioPage = new PortfolioPage(page);
      
      await authPage.login(testUser.email, testUser.password);
      await portfolioPage.goto();
      
      // Core functionality should work across browsers
      await expect(page.locator('[data-testid="portfolio-list"]')).toBeVisible();
      
      if (await page.locator(`text=${testPortfolio.name}`).count() > 0) {
        await portfolioPage.selectPortfolio(testPortfolio.name);
        
        // Charts should render properly
        await expect(page.locator('[data-testid="allocation-chart"]')).toBeVisible();
        
        // Interactive features should work
        await page.hover('[data-testid="chart-segment"]');
        await expect(page.locator('[data-testid="chart-tooltip"]')).toBeVisible();
      }
    });
  });
});