import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for end-to-end testing.
 * 
 * Configures test environments, browsers, and settings
 * for comprehensive E2E testing of the portfolio optimization dashboard.
 */

export default defineConfig({
  testDir: './tests',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ...(process.env.CI ? [['github']] : [['list']])
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 30000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable Chrome DevTools Protocol for performance monitoring
        launchOptions: {
          args: ['--enable-features=NetworkService']
        }
      },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    {
      name: 'Microsoft Edge',
      use: { ...devices['Desktop Edge'], channel: 'msedge' },
    },
    {
      name: 'Google Chrome',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },

    /* Accessibility testing with screen reader simulation */
    {
      name: 'accessibility',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate screen reader behavior
        forcedColors: 'active',
        reducedMotion: 'reduce'
      },
      testMatch: '**/accessibility.spec.ts'
    },

    /* Performance testing configuration */
    {
      name: 'performance',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-features=NetworkService',
            '--enable-logging=stderr',
            '--v=1'
          ]
        }
      },
      testMatch: '**/performance.spec.ts'
    }
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      cwd: '../frontend',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'python -m uvicorn app.main:app --host 0.0.0.0 --port 8000',
      cwd: '../backend',
      port: 8000,
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./global-setup.ts'),
  globalTeardown: require.resolve('./global-teardown.ts'),

  /* Test timeout */
  timeout: 60000,

  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Maximum number of failures */
  maxFailures: process.env.CI ? 10 : undefined,

  /* Output directory */
  outputDir: 'test-results/',
  
  /* Preserve output on failure */
  preserveOutput: 'failures-only',

  /* Update snapshots */
  updateSnapshots: 'missing',
});