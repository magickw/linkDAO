import { defineConfig, devices } from '@playwright/test';

/**
 * Cross-Browser Compatibility Testing Configuration
 * for Support Documentation System
 */
export default defineConfig({
  testDir: './src/components/Support/__tests__/e2e',
  
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
    ['html', { outputFolder: 'test-results/support-documentation/playwright-report' }],
    ['junit', { outputFile: 'test-results/support-documentation/junit-playwright.xml' }],
    ['json', { outputFile: 'test-results/support-documentation/test-results.json' }]
  ],
  
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 10000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable accessibility testing
        contextOptions: {
          reducedMotion: 'reduce'
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

    /* Accessibility testing with specific configurations */
    {
      name: 'accessibility-chrome',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          forcedColors: 'active',
          reducedMotion: 'reduce'
        }
      },
      testMatch: '**/accessibility.e2e.test.ts'
    },

    /* Performance testing */
    {
      name: 'performance-chrome',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      testMatch: '**/performance.e2e.test.ts'
    },

    /* Slow network testing */
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          offline: false,
          // Simulate slow 3G
          extraHTTPHeaders: {
            'Connection': 'keep-alive'
          }
        }
      },
      testMatch: '**/network.e2e.test.ts'
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/components/Support/__tests__/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./src/components/Support/__tests__/e2e/global-teardown.ts'),

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Test timeout */
  timeout: 30000,
  
  /* Expect timeout */
  expect: {
    timeout: 5000,
  },

  /* Output directory */
  outputDir: 'test-results/support-documentation/playwright-artifacts',
});