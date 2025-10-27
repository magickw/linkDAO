import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Testing Configuration for LinkDAO Admin System
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list']
  ],
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3006',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  
  projects: [
    {
      name: 'admin-chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'admin-firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'admin-safari',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1920, height: 1080 }
      },
    },
    {
      name: 'admin-mobile',
      use: { 
        ...devices['iPhone 13'],
      },
    },
  ],
  
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3006',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
