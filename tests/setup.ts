/**
 * Global test setup file for Stake Games platform
 * This file runs before all tests and sets up the testing environment
 */

import { beforeAll, afterAll, afterEach } from 'vitest'

// Global test configuration
beforeAll(async () => {
  // Setup that runs once before all tests
  console.log('🧪 Setting up test environment...')
  
  // Set test environment variables
  process.env.NODE_ENV = 'test'
  process.env.DATABASE_URL = 'postgresql://test:test@localhost:5433/stake_games_test'
  process.env.REDIS_URL = 'redis://localhost:6380'
})

afterEach(() => {
  // Cleanup after each test
  // Clear any mocks or test data
})

afterAll(async () => {
  // Cleanup that runs once after all tests
  console.log('🧪 Tearing down test environment...')
})

// Global test utilities
export const testHelpers = {
  /**
   * Wait for a specified amount of time
   * Useful for testing async operations
   */
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Generate a random test user
   */
  createTestUser: () => ({
    id: `test-user-${Date.now()}`,
    username: `testuser${Math.random().toString(36).slice(2)}`,
    email: `test${Math.random().toString(36).slice(2)}@example.com`,
  }),
  
  /**
   * Create a mock game session
   */
  createTestGameSession: (gameType = 'crash') => ({
    id: `test-session-${Date.now()}`,
    gameType,
    status: 'pending',
    betAmount: 10.00,
    createdAt: new Date(),
  }),
}