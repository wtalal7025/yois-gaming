/**
 * Vitest Browser Configuration for Component and Browser Testing
 * Enhanced configuration for browser-based testing with Playwright integration
 */

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    // Browser mode configuration
    browser: {
      enabled: true,
      provider: 'playwright',
      headless: true,
      instances: [
        {
          browser: 'chromium',
          setupFiles: ['./tests/utils/browser-setup.ts']
        },
        {
          browser: 'firefox', 
          setupFiles: ['./tests/utils/browser-setup.ts']
        },
        {
          browser: 'webkit',
          setupFiles: ['./tests/utils/browser-setup.ts']
        }
      ],
      
      // Browser API configuration
      api: {
        port: 63315,
        host: 'localhost'
      },
      
      // UI configuration
      ui: !process.env.CI,
      
      // Viewport settings
      viewport: {
        width: 1280,
        height: 720
      },
      
      // Screenshot configuration
      screenshotFailures: true,
      screenshotDirectory: '__screenshots__'
    },

    // Test matching patterns
    include: [
      '**/*.browser.{test,spec}.{js,ts,tsx}',
      '**/browser/**/*.{test,spec}.{js,ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/*.e2e.{test,spec}.{js,ts,tsx}'
    ],

    // Global configuration
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    
    // Coverage configuration
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**',
        'tests/**'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 85,
          statements: 85
        }
      }
    },

    // Performance settings
    testTimeout: 30000,
    hookTimeout: 10000,
    
    // Reporting
    reporters: process.env.CI ? ['verbose', 'junit'] : ['verbose'],
    outputFile: {
      junit: './test-results/vitest-browser-junit.xml'
    }
  },

  resolve: {
    alias: {
      '@stake-games/shared': resolve(__dirname, '../../packages/shared/src'),
      '@stake-games/game-engine': resolve(__dirname, '../../packages/game-engine/src'),
      '@stake-games/frontend': resolve(__dirname, '../../packages/frontend/src'),
      '@stake-games/backend': resolve(__dirname, '../../packages/backend/src'),
      '@': resolve(__dirname, '../../')
    }
  },

  // Plugin configuration
  plugins: [],
  
  // Optimize dependencies
  optimizeDeps: {
    include: ['@testing-library/dom', '@testing-library/user-event']
  }
})