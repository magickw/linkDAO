import { defineConfig, devices } from '@playwright/test';

/**
 * Service Worker Cache Enhancement E2E Testing Configuration
 * Comprehensive testing for offline/online transitions and cache strategies
 */
export default defineConfig({
  testDir: './src/services/__tests__/e2e/cache-enhancement',
  
  /* Run tests in files in parallel */
  fullyParallel: true,
  
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'test-results/cache-enhancement/playwright-report' }],
    ['junit', { outputFile: 'test-results/cache-enhancement/junit-playwright.xml' }],
    ['json', { outputFile: 'test-results/cache-enhancement/test-results.json' }]
  ],
  
  /* Shared settings for all projects */
  use: {
    /* Base URL */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
    
    /* Global timeout for each action */
    actionTimeout: 15000,
    
    /* Global timeout for navigation */
    navigationTimeout: 30000,
    
    /* Enable service worker testing */
    serviceWorkers: 'allow',
    
    /* Enable offline testing */
    offline: false,
  },

  /* Configure projects for cache testing scenarios */
  projects: [
    // Desktop browsers for comprehensive testing
    {
      name: 'chromium-cache',
      use: { 
        ...devices['Desktop Chrome'],
        // Enable service worker debugging
        launchOptions: {
          args: ['--enable-service-worker-script-full-code-cache']
        }
      },
    },

    {
      name: 'firefox-cache',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit-cache',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile testing for cache performance
    {
      name: 'mobile-chrome-cache',
      use: { 
        ...devices['Pixel 5'],
        // Simulate mobile network conditions
        contextOptions: {
          offline: false
        }
      },
    },

    // Offline/Online transition testing
    {
      name: 'offline-transitions',
      use: {
        ...devices['Desktop Chrome'],
        contextOptions: {
          offline: false // Will be toggled during tests
        }
      },
      testMatch: '**/offline-transitions.e2e.test.ts'
    },

    // Network condition testing
    {
      name: 'slow-network-cache',
      use: {
        ...devices['Desktop Chrome'],
        // Simulate slow 3G for cache effectiveness testing
        contextOptions: {
          offline: false
        }
      },
      testMatch: '**/network-conditions.e2e.test.ts'
    },

    // Cache strategy specific testing
    {
      name: 'cache-strategies',
      use: {
        ...devices['Desktop Chrome'],
        // Enable detailed cache inspection
        launchOptions: {
          args: ['--enable-precise-memory-info', '--enable-service-worker-script-full-code-cache']
        }
      },
      testMatch: '**/cache-strategies.e2e.test.ts'
    },

    // Background sync testing
    {
      name: 'background-sync',
      use: {
        ...devices['Desktop Chrome'],
        // Enable background sync testing
        contextOptions: {
          permissions: ['background-sync']
        }
      },
      testMatch: '**/background-sync.e2e.test.ts'
    }
  ],

  /* Global setup and teardown */
  globalSetup: require.resolve('./src/services/__tests__/e2e/cache-enhancement/global-setup.ts'),
  globalTeardown: require.resolve('./src/services/__tests__/e2e/cache-enhancement/global-teardown.ts'),

  /* Run local dev server before starting tests */
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },

  /* Test timeout */
  timeout: 60000, // Longer timeout for cache operations
  
  /* Expect timeout */
  expect: {
    timeout: 10000,
  },

  /* Output directory */
  outputDir: 'test-results/cache-enhancement/playwright-artifacts',
});