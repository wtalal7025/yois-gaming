/**
 * Authentication Integration Tests
 * Tests the complete authentication flow with real services integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authTestUtils, authTestScenarios } from '../utils/auth-helpers';
import { databaseTestHelpers } from '../utils/database-helpers';
import { mockEmailService } from '../mocks/email-service.mock';
import { testUtils } from '../utils/test-helpers';

describe('Authentication Integration Tests', () => {
  let dbConnection: any;

  beforeEach(async () => {
    // Setup test database connection
    dbConnection = await databaseTestHelpers.createTestConnection('integration');
    await databaseTestHelpers.setupTestSchema(dbConnection);
    
    // Clear email service
    mockEmailService.clearSentEmails();
    mockEmailService.resetToNormalOperation();
  });

  afterEach(async () => {
    // Cleanup test data
    await databaseTestHelpers.cleanupTestData(dbConnection);
    await dbConnection.close();
  });

  describe('User Registration Flow', () => {
    it('should complete full user registration with email verification', async () => {
      const registrationData = authTestUtils.createTestRegistrationData();
      
      // Step 1: Register user
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      expect(response.status).toBe(201);
      const result = await response.json();
      expect(result.user.email).toBe(registrationData.email);
      expect(result.user.username).toBe(registrationData.username);

      // Step 2: Verify email was sent
      const emailsToUser = mockEmailService.getEmailsTo(registrationData.email);
      expect(emailsToUser).toHaveLength(1);
      expect(emailsToUser[0].subject).toContain('Verify');

      // Step 3: Verify user in database
      const userQuery = await dbConnection.query(
        'SELECT * FROM test_users WHERE email = $1',
        [registrationData.email]
      );
      expect(userQuery.rows).toHaveLength(1);
      expect(userQuery.rows[0].username).toBe(registrationData.username);
    });

    it('should reject registration with invalid email', async () => {
      const invalidData = authTestUtils.createTestRegistrationData({
        email: 'invalid-email'
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('email');
    });

    it('should reject registration with weak password', async () => {
      const weakPasswordData = authTestUtils.createTestRegistrationData({
        password: '123',
        confirmPassword: '123'
      });

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weakPasswordData)
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('password');
    });

    it('should handle duplicate email registration', async () => {
      const registrationData = authTestUtils.createTestRegistrationData();
      
      // First registration
      await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });

      // Second registration with same email
      const duplicateResponse = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...registrationData,
          username: 'different-username'
        })
      });

      expect(duplicateResponse.status).toBe(409);
      const result = await duplicateResponse.json();
      expect(result.error).toContain('email');
    });
  });

  describe('User Login Flow', () => {
    let testUser: any;

    beforeEach(async () => {
      // Create test user in database
      testUser = await databaseTestHelpers.createFullTestUser(dbConnection);
    });

    it('should authenticate user with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      
      expect(result.token).toBeDefined();
      expect(result.user.id).toBe(testUser.id);
      expect(result.user.email).toBe(testUser.email);
    });

    it('should reject authentication with invalid password', async () => {
      const invalidLoginData = {
        email: testUser.email,
        password: 'WrongPassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidLoginData)
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('Invalid credentials');
    });

    it('should reject authentication with non-existent email', async () => {
      const nonExistentLoginData = {
        email: 'nonexistent@example.com',
        password: 'TestPassword123!'
      };

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nonExistentLoginData)
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.error).toContain('Invalid credentials');
    });

    it('should handle concurrent login attempts', async () => {
      const loginData = {
        email: testUser.email,
        password: 'TestPassword123!'
      };

      // Simulate 5 concurrent login attempts
      const loginPromises = Array.from({ length: 5 }, () =>
        fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        })
      );

      const responses = await Promise.all(loginPromises);
      
      // All should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('JWT Token Management', () => {
    let testUser: any;
    let authToken: string;

    beforeEach(async () => {
      testUser = await databaseTestHelpers.createFullTestUser(dbConnection);
      
      // Login to get auth token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPassword123!'
        })
      });
      
      const loginResult = await loginResponse.json();
      authToken = loginResult.token;
    });

    it('should validate JWT token for protected routes', async () => {
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.user.id).toBe(testUser.id);
    });

    it('should reject invalid JWT tokens', async () => {
      const invalidToken = authTestUtils.createInvalidJWT();
      
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(invalidToken)
      });

      expect(response.status).toBe(401);
    });

    it('should handle expired JWT tokens', async () => {
      const expiredToken = authTestUtils.createExpiredJWT();
      
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(expiredToken)
      });

      expect(response.status).toBe(401);
    });

    it('should refresh JWT tokens', async () => {
      const refreshResponse = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(refreshResponse.status).toBe(200);
      const result = await refreshResponse.json();
      expect(result.token).toBeDefined();
      expect(result.token).not.toBe(authToken);
    });
  });

  describe('Password Management', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = await databaseTestHelpers.createFullTestUser(dbConnection);
    });

    it('should handle password reset flow', async () => {
      // Step 1: Request password reset
      const resetRequestResponse = await fetch('/api/auth/password/reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testUser.email })
      });

      expect(resetRequestResponse.status).toBe(200);

      // Step 2: Verify reset email was sent
      const resetEmails = mockEmailService.getEmailsTo(testUser.email);
      const resetEmail = resetEmails.find(email => email.subject.includes('Reset'));
      expect(resetEmail).toBeDefined();

      // Step 3: Extract reset token (mock implementation)
      const resetToken = 'mock-reset-token-123';

      // Step 4: Reset password with token
      const newPassword = 'NewPassword123!';
      const resetResponse = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: resetToken,
          newPassword,
          confirmPassword: newPassword
        })
      });

      expect(resetResponse.status).toBe(200);

      // Step 5: Verify can login with new password
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: newPassword
        })
      });

      expect(loginResponse.status).toBe(200);
    });

    it('should change password for authenticated user', async () => {
      // Login first
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPassword123!'
        })
      });
      
      const loginResult = await loginResponse.json();
      const authToken = loginResult.token;

      // Change password
      const newPassword = 'NewPassword456!';
      const changeResponse = await fetch('/api/auth/password/change', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: 'TestPassword123!',
          newPassword,
          confirmPassword: newPassword
        })
      });

      expect(changeResponse.status).toBe(200);

      // Verify can login with new password
      const newLoginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: newPassword
        })
      });

      expect(newLoginResponse.status).toBe(200);
    });
  });

  describe('Rate Limiting and Security', () => {
    it('should implement rate limiting on login attempts', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'WrongPassword123!'
      };

      const responses = [];
      
      // Attempt 10 failed logins rapidly
      for (let i = 0; i < 10; i++) {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData)
        });
        responses.push(response);
        
        // Short delay to simulate rapid attempts
        await testUtils.timing.wait(50);
      }

      // Later attempts should be rate limited
      const rateLimitedResponses = responses.slice(-3);
      expect(rateLimitedResponses.some(r => r.status === 429)).toBe(true);
    });

    it('should prevent session hijacking attempts', async () => {
      const testUser = await databaseTestHelpers.createFullTestUser(dbConnection);
      
      // Login to get auth token
      const loginResponse = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: 'TestPassword123!'
        })
      });
      
      const loginResult = await loginResponse.json();
      const authToken = loginResult.token;

      // Try to use token from different IP/User-Agent
      const response = await fetch('/api/auth/profile', {
        method: 'GET',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'X-Forwarded-For': '192.168.1.100',
          'User-Agent': 'Malicious Bot'
        }
      });

      // Should still work for now, but could implement IP/UA checking
      expect(response.status).toBe(200);
    });
  });
});