/**
 * Database Testing Utilities
 * Provides helpers for database setup, seeding, and cleanup in tests
 */

import { testDataGenerators } from './test-helpers';
import { databaseTestUtils } from '../config/database.config';

export interface TestDatabaseConnection {
  query: (sql: string, params?: any[]) => Promise<any>;
  close: () => Promise<void>;
}

/**
 * Database test utilities
 */
export const databaseTestHelpers = {
  /**
   * Create test database connection (mock implementation)
   */
  createTestConnection: async (testType: 'unit' | 'integration' | 'security'): Promise<TestDatabaseConnection> => {
    const connectionString = databaseTestUtils.getConnectionString(testType);
    
    // Mock database connection
    return {
      query: async (sql: string, params?: any[]) => {
        console.log(`Mock DB Query: ${sql}`, params);
        return { rows: [], rowCount: 0 };
      },
      close: async () => {
        console.log('Mock DB connection closed');
      }
    };
  },

  /**
   * Setup test database schema
   */
  setupTestSchema: async (connection: TestDatabaseConnection): Promise<void> => {
    const schemas = [
      `CREATE TABLE IF NOT EXISTS test_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        balance DECIMAL(15,2) DEFAULT 0.00,
        level INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS test_game_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES test_users(id),
        game_type VARCHAR(50) NOT NULL,
        bet_amount DECIMAL(10,2) NOT NULL,
        payout DECIMAL(10,2) DEFAULT 0.00,
        seed VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,
      `CREATE TABLE IF NOT EXISTS test_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES test_users(id),
        type VARCHAR(20) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(15,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const schema of schemas) {
      await connection.query(schema);
    }
  },

  /**
   * Seed test database with sample data
   */
  seedTestData: async (connection: TestDatabaseConnection, options: {
    userCount?: number;
    sessionCount?: number;
    transactionCount?: number;
  } = {}): Promise<{
    users: any[];
    sessions: any[];
    transactions: any[];
  }> => {
    const { userCount = 5, sessionCount = 10, transactionCount = 20 } = options;
    
    const users = [];
    const sessions = [];
    const transactions = [];

    // Create test users
    for (let i = 0; i < userCount; i++) {
      const user = testDataGenerators.createTestUser();
      await connection.query(
        'INSERT INTO test_users (id, username, email, password_hash, balance) VALUES ($1, $2, $3, $4, $5)',
        [user.id, user.username, user.email, user.passwordHash, user.balance]
      );
      users.push(user);
    }

    // Create test game sessions
    for (let i = 0; i < sessionCount; i++) {
      const session = testDataGenerators.createTestGameSession();
      const userId = users[Math.floor(Math.random() * users.length)].id;
      session.userId = userId;
      
      await connection.query(
        'INSERT INTO test_game_sessions (id, user_id, game_type, bet_amount, payout, seed) VALUES ($1, $2, $3, $4, $5, $6)',
        [session.id, session.userId, session.gameType, session.betAmount, session.payout, session.seed]
      );
      sessions.push(session);
    }

    // Create test transactions
    for (let i = 0; i < transactionCount; i++) {
      const transaction = testDataGenerators.createTestTransaction();
      const userId = users[Math.floor(Math.random() * users.length)].id;
      transaction.userId = userId;
      
      await connection.query(
        'INSERT INTO test_transactions (id, user_id, type, amount, balance_after) VALUES ($1, $2, $3, $4, $5)',
        [transaction.id, transaction.userId, transaction.type, transaction.amount, transaction.balanceAfter]
      );
      transactions.push(transaction);
    }

    return { users, sessions, transactions };
  },

  /**
   * Clean up test database
   */
  cleanupTestData: async (connection: TestDatabaseConnection): Promise<void> => {
    const tables = ['test_transactions', 'test_game_sessions', 'test_users'];
    
    for (const table of tables) {
      await connection.query(`TRUNCATE TABLE ${table} CASCADE`);
    }
  },

  /**
   * Drop test database schema
   */
  dropTestSchema: async (connection: TestDatabaseConnection): Promise<void> => {
    const tables = ['test_transactions', 'test_game_sessions', 'test_users'];
    
    for (const table of tables) {
      await connection.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
    }
  },

  /**
   * Create database snapshot for test isolation
   */
  createSnapshot: async (connection: TestDatabaseConnection, snapshotName: string): Promise<void> => {
    console.log(`Creating database snapshot: ${snapshotName}`);
    // Implementation would depend on database system
  },

  /**
   * Restore database from snapshot
   */
  restoreSnapshot: async (connection: TestDatabaseConnection, snapshotName: string): Promise<void> => {
    console.log(`Restoring database snapshot: ${snapshotName}`);
    // Implementation would depend on database system
  },

  /**
   * Check database health and connectivity
   */
  checkHealth: async (connection: TestDatabaseConnection): Promise<boolean> => {
    try {
      await connection.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  },

  /**
   * Get database statistics for testing
   */
  getStats: async (connection: TestDatabaseConnection): Promise<{
    userCount: number;
    sessionCount: number;
    transactionCount: number;
  }> => {
    const userCount = await connection.query('SELECT COUNT(*) FROM test_users');
    const sessionCount = await connection.query('SELECT COUNT(*) FROM test_game_sessions');
    const transactionCount = await connection.query('SELECT COUNT(*) FROM test_transactions');

    return {
      userCount: parseInt(userCount.rows[0]?.count || '0'),
      sessionCount: parseInt(sessionCount.rows[0]?.count || '0'),
      transactionCount: parseInt(transactionCount.rows[0]?.count || '0')
    };
  },

  /**
   * Execute database migrations for testing
   */
  runMigrations: async (connection: TestDatabaseConnection, migrations: string[]): Promise<void> => {
    for (const migration of migrations) {
      console.log(`Running migration: ${migration}`);
      await connection.query(migration);
    }
  },

  /**
   * Create test user with associated data
   */
  createFullTestUser: async (connection: TestDatabaseConnection, overrides: any = {}) => {
    const user = testDataGenerators.createTestUser(overrides);
    
    // Insert user
    await connection.query(
      'INSERT INTO test_users (id, username, email, password_hash, balance) VALUES ($1, $2, $3, $4, $5)',
      [user.id, user.username, user.email, user.passwordHash, user.balance]
    );

    // Create some transactions for the user
    for (let i = 0; i < 3; i++) {
      const transaction = testDataGenerators.createTestTransaction({ userId: user.id });
      await connection.query(
        'INSERT INTO test_transactions (id, user_id, type, amount, balance_after) VALUES ($1, $2, $3, $4, $5)',
        [transaction.id, transaction.userId, transaction.type, transaction.amount, transaction.balanceAfter]
      );
    }

    return user;
  }
};

/**
 * Redis test utilities
 */
export const redisTestHelpers = {
  /**
   * Create test Redis connection (mock implementation)
   */
  createTestRedisConnection: async (testType: 'unit' | 'integration' | 'security') => {
    const connectionString = databaseTestUtils.getRedisConnectionString(testType);
    
    // Mock Redis connection
    const store = new Map();
    
    return {
      get: async (key: string) => store.get(key) || null,
      set: async (key: string, value: string, ttl?: number) => {
        store.set(key, value);
        if (ttl) {
          setTimeout(() => store.delete(key), ttl * 1000);
        }
      },
      del: async (key: string) => store.delete(key),
      keys: async (pattern: string) => {
        return Array.from(store.keys()).filter(key => 
          new RegExp(pattern.replace('*', '.*')).test(key)
        );
      },
      flushall: async () => store.clear(),
      quit: async () => console.log('Mock Redis connection closed')
    };
  },

  /**
   * Setup test Redis data
   */
  seedRedisData: async (redis: any, testData: Record<string, any>) => {
    for (const [key, value] of Object.entries(testData)) {
      await redis.set(key, JSON.stringify(value));
    }
  },

  /**
   * Cleanup Redis test data
   */
  cleanupRedisData: async (redis: any, pattern: string = 'test:*') => {
    const keys = await redis.keys(pattern);
    for (const key of keys) {
      await redis.del(key);
    }
  }
};