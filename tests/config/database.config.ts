/**
 * Database Configuration for Testing
 * Provides isolated test database setup and management
 */

export interface TestDatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  schema?: string;
}

export interface TestRedisConfig {
  host: string;
  port: number;
  db: number;
  password?: string;
}

/**
 * Test database configuration
 * Uses separate databases for different test types
 */
export const testDatabaseConfig: Record<string, TestDatabaseConfig> = {
  unit: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: 'stake_games_test_unit',
    username: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    ssl: false,
    schema: 'public'
  },
  
  integration: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: 'stake_games_test_integration',
    username: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    ssl: false,
    schema: 'public'
  },
  
  security: {
    host: process.env.TEST_DB_HOST || 'localhost',
    port: parseInt(process.env.TEST_DB_PORT || '5433'),
    database: 'stake_games_test_security',
    username: process.env.TEST_DB_USER || 'test',
    password: process.env.TEST_DB_PASSWORD || 'test',
    ssl: false,
    schema: 'public'
  }
};

/**
 * Test Redis configuration
 * Uses separate Redis databases for different test types
 */
export const testRedisConfig: Record<string, TestRedisConfig> = {
  unit: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
    db: 1,
    password: process.env.TEST_REDIS_PASSWORD
  },
  
  integration: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
    db: 2,
    password: process.env.TEST_REDIS_PASSWORD
  },
  
  security: {
    host: process.env.TEST_REDIS_HOST || 'localhost',
    port: parseInt(process.env.TEST_REDIS_PORT || '6380'),
    db: 3,
    password: process.env.TEST_REDIS_PASSWORD
  }
};

/**
 * Database connection utilities for tests
 */
export const databaseTestUtils = {
  /**
   * Get database connection string for test type
   */
  getConnectionString(testType: 'unit' | 'integration' | 'security'): string {
    const config = testDatabaseConfig[testType];
    return `postgresql://${config.username}:${config.password}@${config.host}:${config.port}/${config.database}`;
  },
  
  /**
   * Get Redis connection string for test type
   */
  getRedisConnectionString(testType: 'unit' | 'integration' | 'security'): string {
    const config = testRedisConfig[testType];
    return `redis://${config.password ? `:${config.password}@` : ''}${config.host}:${config.port}/${config.db}`;
  },
  
  /**
   * Generate test database name with timestamp for isolation
   */
  generateTestDatabaseName(testType: string): string {
    const timestamp = Date.now();
    return `stake_games_test_${testType}_${timestamp}`;
  }
};