/**
 * Common Testing Utilities and Helpers
 * Shared utilities for all test types across the gaming platform
 */

import { randomBytes, createHash } from 'crypto';

/**
 * Test data generation utilities
 */
export const testDataGenerators = {
  /**
   * Generate a random test user with realistic data
   */
  createTestUser: (overrides: Partial<any> = {}) => ({
    id: `test-user-${randomBytes(8).toString('hex')}`,
    username: `testuser${Math.random().toString(36).slice(2)}`,
    email: `test${Math.random().toString(36).slice(2)}@example.com`,
    passwordHash: createHash('sha256').update('testpassword123').digest('hex'),
    balance: 1000.00,
    level: 1,
    experiencePoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: true,
    ...overrides
  }),

  /**
   * Generate a test game session
   */
  createTestGameSession: (gameType = 'crash', overrides: Partial<any> = {}) => ({
    id: `test-session-${randomBytes(8).toString('hex')}`,
    userId: `test-user-${randomBytes(8).toString('hex')}`,
    gameType,
    betAmount: 10.00,
    payout: 0.00,
    profitLoss: 0.00,
    multiplier: 1.00,
    seed: randomBytes(16).toString('hex'),
    clientSeed: randomBytes(16).toString('hex'),
    nonce: Math.floor(Math.random() * 1000000),
    isCompleted: false,
    createdAt: new Date(),
    gameData: {},
    ...overrides
  }),

  /**
   * Generate a test transaction
   */
  createTestTransaction: (overrides: Partial<any> = {}) => ({
    id: `test-transaction-${randomBytes(8).toString('hex')}`,
    userId: `test-user-${randomBytes(8).toString('hex')}`,
    type: 'bet',
    amount: 10.00,
    balanceAfter: 990.00,
    description: 'Test transaction',
    createdAt: new Date(),
    ...overrides
  }),

  /**
   * Generate realistic game statistics
   */
  createTestUserStats: (overrides: Partial<any> = {}) => ({
    id: `test-stats-${randomBytes(8).toString('hex')}`,
    userId: `test-user-${randomBytes(8).toString('hex')}`,
    totalBets: Math.floor(Math.random() * 1000),
    totalWagered: Math.random() * 10000,
    totalWon: Math.random() * 8000,
    netProfit: Math.random() * 2000 - 1000,
    biggestWin: Math.random() * 5000,
    winStreak: Math.floor(Math.random() * 10),
    currentStreak: Math.floor(Math.random() * 5),
    updatedAt: new Date(),
    ...overrides
  })
};

/**
 * Test timing utilities
 */
export const testTiming = {
  /**
   * Wait for a specified amount of time
   */
  wait: (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms)),
  
  /**
   * Wait for a condition to be true with timeout
   */
  waitForCondition: async (
    condition: () => boolean | Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error(`Condition not met within ${timeout}ms`);
  },

  /**
   * Measure execution time of a function
   */
  measureTime: async <T>(fn: () => Promise<T> | T): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    return { result, duration };
  }
};

/**
 * Test validation utilities
 */
export const testValidators = {
  /**
   * Validate that an object has all required properties
   */
  hasAllProperties: <T>(obj: any, requiredProps: (keyof T)[]): obj is T => {
    return requiredProps.every(prop => obj && typeof obj === 'object' && prop in obj);
  },

  /**
   * Validate that a number is within expected range
   */
  isInRange: (value: number, min: number, max: number): boolean => {
    return value >= min && value <= max;
  },

  /**
   * Validate that a string matches expected pattern
   */
  matchesPattern: (value: string, pattern: RegExp): boolean => {
    return pattern.test(value);
  },

  /**
   * Validate UUID format
   */
  isValidUUID: (value: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(value);
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

/**
 * Test cleanup utilities
 */
export const testCleanup = {
  /**
   * Clean up test data from database
   */
  cleanupTestData: async (testId: string): Promise<void> => {
    // Implementation would depend on database setup
    console.log(`Cleaning up test data for test: ${testId}`);
  },

  /**
   * Reset test environment state
   */
  resetTestEnvironment: async (): Promise<void> => {
    // Clear any global state that might affect tests
    console.log('Resetting test environment');
  },

  /**
   * Cleanup temporary files created during tests
   */
  cleanupTempFiles: async (pattern: string): Promise<void> => {
    console.log(`Cleaning up temporary files matching pattern: ${pattern}`);
  }
};

/**
 * Test assertion helpers
 */
export const testAssertions = {
  /**
   * Assert that two numbers are approximately equal
   */
  approximatelyEqual: (actual: number, expected: number, tolerance: number = 0.001): boolean => {
    return Math.abs(actual - expected) <= tolerance;
  },

  /**
   * Assert that an array contains specific elements
   */
  arrayContains: <T>(array: T[], elements: T[]): boolean => {
    return elements.every(element => array.includes(element));
  },

  /**
   * Assert that an object is deeply equal to expected
   */
  deepEqual: (actual: any, expected: any): boolean => {
    return JSON.stringify(actual) === JSON.stringify(expected);
  },

  /**
   * Assert that a function throws specific error
   */
  throwsError: async (fn: () => Promise<any> | any, expectedError?: string): Promise<boolean> => {
    try {
      await fn();
      return false; // Should have thrown
    } catch (error) {
      if (expectedError) {
        return error instanceof Error && error.message.includes(expectedError);
      }
      return true;
    }
  }
};

/**
 * Test performance utilities
 */
export const testPerformance = {
  /**
   * Measure memory usage during test execution
   */
  measureMemory: (): { used: number; total: number } => {
    const memUsage = process.memoryUsage();
    return {
      used: Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100, // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100 // MB
    };
  },

  /**
   * Create a performance benchmark
   */
  benchmark: async (name: string, fn: () => Promise<any> | any, iterations: number = 100) => {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      times.push(end - start);
    }

    const average = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      name,
      iterations,
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      times
    };
  }
};

/**
 * Export all utilities as a single object for convenience
 */
export const testUtils = {
  ...testDataGenerators,
  timing: testTiming,
  validators: testValidators,
  cleanup: testCleanup,
  assertions: testAssertions,
  performance: testPerformance
};