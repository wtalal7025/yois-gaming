/**
 * Playwright Configuration for E2E and Cross-Browser Testing
 * Comprehensive configuration for end-to-end testing across multiple browsers
 */

import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  // Test configuration
  testDir: '../e2e',
  testMatch: /.*\.e2e\.(test|spec)\.(js|ts|tsx)$/,
  
  // Parallel execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  
  // Reporter configuration
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['json', { outputFile: 'test-results/playwright-results.json' }],
    ['junit', { outputFile: 'test-results/playwright-junit.xml' }],
    process.env.CI ? ['github'] : ['list']
  ],
  
  // Output directories
  outputDir: 'test-results/',
  
  // Global test settings
  timeout: 30 * 1000, // 30 seconds
  expect: {
    timeout: 10 * 1000, // 10 seconds for assertions
    toHaveScreenshot: {
      mode: 'only-on-failure',
      threshold: 0.2
    }
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('../utils/global-setup.ts'),
  globalTeardown: require.resolve('../utils/global-teardown.ts'),
  
  // Base URL for tests
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context settings
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Wait settings for more stable tests
    actionTimeout: 10 * 1000,
    navigationTimeout: 30 * 1000,
    
    // Accept downloads
    acceptDownloads: true
  },

  // Browser projects for cross-browser testing
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    
    // Mobile browsers
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] }
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] }
    },
    
    // Tablet browsers
    {
      name: 'tablet',
      use: { ...devices['iPad Pro'] }
    }
  ],

  // Web server configuration for local testing
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe'
  }
});