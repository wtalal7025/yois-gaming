/**
 * Jest Configuration for Comprehensive Testing Suite
 * This configuration supports multiple testing scenarios:
 * - Unit tests
 * - Integration tests 
 * - Browser tests
 * - Performance tests
 */

const { pathsToModuleNameMapper } = require('ts-jest');

module.exports = {
  // Projects for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: [
        '<rootDir>/tests/**/*.{test,spec}.{js,ts,tsx}',
        '<rootDir>/tests/unit/**/*.{test,spec}.{js,ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
      collectCoverageFrom: [
        'packages/*/src/**/*.{js,ts,tsx}',
        'apps/*/src/**/*.{js,ts,tsx}',
        '!**/*.d.ts',
        '!**/node_modules/**',
        '!**/dist/**'
      ],
      coverageReporters: ['text', 'lcov', 'html', 'json'],
      coverageDirectory: '<rootDir>/coverage/unit',
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 90,
          statements: 90
        }
      }
    },
    {
      displayName: 'integration',
      testMatch: [
        '<rootDir>/tests/integration/**/*.{test,spec}.{js,ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts',
        '<rootDir>/tests/utils/integration-setup.ts'
      ],
      testTimeout: 30000,
      coverageDirectory: '<rootDir>/coverage/integration',
      // Reason: Integration tests need more time for database operations
      maxWorkers: 1 // Sequential execution for database tests
    },
    {
      displayName: 'security',
      testMatch: [
        '<rootDir>/tests/security/**/*.{test,spec}.{js,ts,tsx}'
      ],
      testEnvironment: 'node',
      setupFilesAfterEnv: [
        '<rootDir>/tests/setup.ts',
        '<rootDir>/tests/utils/security-setup.ts'
      ],
      testTimeout: 20000,
      coverageDirectory: '<rootDir>/coverage/security'
    }
  ],

  // Global configuration
  preset: 'ts-jest',
  moduleNameMapper: pathsToModuleNameMapper({
    '@stake-games/shared/*': ['<rootDir>/packages/shared/src/*'],
    '@stake-games/game-engine/*': ['<rootDir>/packages/game-engine/src/*'],
    '@stake-games/frontend/*': ['<rootDir>/packages/frontend/src/*'],
    '@stake-games/backend/*': ['<rootDir>/packages/backend/src/*']
  }),
  
  // Global coverage settings
  collectCoverageFrom: [
    'packages/*/src/**/*.{js,ts,tsx}',
    'apps/*/src/**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/*.config.*',
    '!**/coverage/**'
  ],

  // Test environment setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testEnvironment: 'node',
  
  // Module resolution
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/e2e/',
    '/playwright/'
  ],

  // Verbose output for detailed test results
  verbose: true,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'Stake Games - Test Report',
      outputPath: './coverage/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true
    }]
  ]
};