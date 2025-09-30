/**
 * Authentication Testing Utilities
 * Provides helpers for testing authentication flows and JWT operations
 */

import { testDataGenerators } from './test-helpers';

export interface TestJWTPayload {
  userId: string;
  email: string;
  username: string;
  role?: string;
  iat?: number;
  exp?: number;
}

export interface TestAuthUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  balance: number;
  createdAt: Date;
}

/**
 * Authentication test utilities
 */
export const authTestUtils = {
  /**
   * Create a test JWT token (mock implementation)
   */
  createTestJWT: (payload: Partial<TestJWTPayload> = {}): string => {
    const now = Math.floor(Date.now() / 1000);
    const testPayload: TestJWTPayload = {
      userId: `test-user-${Math.random().toString(36).slice(2)}`,
      email: `test${Math.random().toString(36).slice(2)}@example.com`,
      username: `testuser${Math.random().toString(36).slice(2)}`,
      role: 'user',
      iat: now,
      exp: now + 3600, // 1 hour
      ...payload
    };

    // Mock JWT structure: header.payload.signature
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadStr = btoa(JSON.stringify(testPayload));
    const signature = btoa('test-signature'); // Mock signature
    
    return `${header}.${payloadStr}.${signature}`;
  },

  /**
   * Decode test JWT payload (mock implementation)
   */
  decodeTestJWT: (token: string): TestJWTPayload | null => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      
      const payload = JSON.parse(atob(parts[1]));
      return payload;
    } catch (error) {
      return null;
    }
  },

  /**
   * Create test user with authentication credentials
   */
  createTestAuthUser: (overrides: Partial<TestAuthUser> = {}): TestAuthUser => {
    const user = testDataGenerators.createTestUser(overrides);
    return {
      ...user,
      role: 'user',
      ...overrides
    };
  },

  /**
   * Create admin test user
   */
  createTestAdminUser: (overrides: Partial<TestAuthUser> = {}): TestAuthUser => {
    return authTestUtils.createTestAuthUser({
      role: 'admin',
      username: `admin${Math.random().toString(36).slice(2)}`,
      email: `admin${Math.random().toString(36).slice(2)}@example.com`,
      ...overrides
    });
  },

  /**
   * Create expired JWT token for testing
   */
  createExpiredJWT: (payload: Partial<TestJWTPayload> = {}): string => {
    const now = Math.floor(Date.now() / 1000);
    return authTestUtils.createTestJWT({
      ...payload,
      iat: now - 7200, // 2 hours ago
      exp: now - 3600  // 1 hour ago (expired)
    });
  },

  /**
   * Create JWT with invalid signature for testing
   */
  createInvalidJWT: (): string => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      userId: 'test-user',
      email: 'test@example.com',
      username: 'testuser'
    }));
    const invalidSignature = 'invalid-signature';
    
    return `${header}.${payload}.${invalidSignature}`;
  },

  /**
   * Mock authentication headers for API testing
   */
  createAuthHeaders: (token?: string): Record<string, string> => {
    if (!token) {
      token = authTestUtils.createTestJWT();
    }
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  },

  /**
   * Create test session data
   */
  createTestSession: (userId: string, overrides: any = {}) => ({
    sessionId: `test-session-${Math.random().toString(36).slice(2)}`,
    userId,
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    ipAddress: '127.0.0.1',
    userAgent: 'Test User Agent',
    isActive: true,
    ...overrides
  }),

  /**
   * Validate password requirements for testing
   */
  validateTestPassword: (password: string): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Create test login credentials
   */
  createTestCredentials: (overrides: any = {}) => ({
    email: `test${Math.random().toString(36).slice(2)}@example.com`,
    password: 'TestPassword123!',
    username: `testuser${Math.random().toString(36).slice(2)}`,
    ...overrides
  }),

  /**
   * Create test registration data
   */
  createTestRegistrationData: (overrides: any = {}) => ({
    ...authTestUtils.createTestCredentials(),
    confirmPassword: 'TestPassword123!',
    agreeToTerms: true,
    ...overrides
  }),

  /**
   * Mock authentication middleware response
   */
  createAuthContext: (user?: TestAuthUser) => {
    const testUser = user || authTestUtils.createTestAuthUser();
    return {
      user: testUser,
      isAuthenticated: true,
      token: authTestUtils.createTestJWT({
        userId: testUser.id,
        email: testUser.email,
        username: testUser.username,
        role: testUser.role
      })
    };
  },

  /**
   * Create test two-factor authentication data
   */
  createTest2FAData: (overrides: any = {}) => ({
    userId: `test-user-${Math.random().toString(36).slice(2)}`,
    secret: 'test-2fa-secret',
    code: '123456',
    isEnabled: true,
    backupCodes: ['backup1', 'backup2', 'backup3'],
    ...overrides
  }),

  /**
   * Create test password reset data
   */
  createPasswordResetData: (overrides: any = {}) => ({
    email: `test${Math.random().toString(36).slice(2)}@example.com`,
    token: `reset-token-${Math.random().toString(36).slice(2)}`,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    isUsed: false,
    ...overrides
  })
};

/**
 * Authentication test scenarios for comprehensive testing
 */
export const authTestScenarios = {
  /**
   * Valid user login flow
   */
  validLogin: {
    credentials: authTestUtils.createTestCredentials(),
    expectedResult: 'success'
  },

  /**
   * Invalid credentials scenarios
   */
  invalidCredentials: [
    {
      credentials: { email: 'invalid@example.com', password: 'wrongpassword' },
      expectedError: 'Invalid credentials'
    },
    {
      credentials: { email: 'test@example.com', password: 'wrongpassword' },
      expectedError: 'Invalid credentials'
    }
  ],

  /**
   * Password validation scenarios
   */
  passwordValidation: [
    {
      password: '123',
      expectedErrors: ['Password must be at least 8 characters long', 'Password must contain at least one uppercase letter']
    },
    {
      password: 'password',
      expectedErrors: ['Password must contain at least one uppercase letter', 'Password must contain at least one number']
    },
    {
      password: 'ValidPassword123!',
      expectedErrors: []
    }
  ],

  /**
   * JWT token scenarios
   */
  jwtTokens: {
    valid: authTestUtils.createTestJWT(),
    expired: authTestUtils.createExpiredJWT(),
    invalid: authTestUtils.createInvalidJWT(),
    malformed: 'invalid.jwt.token'
  }
};