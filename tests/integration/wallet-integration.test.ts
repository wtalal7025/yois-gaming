/**
 * Wallet Integration Tests
 * Tests the complete wallet and balance management system
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authTestUtils } from '../utils/auth-helpers';
import { databaseTestHelpers } from '../utils/database-helpers';
import { mockPaymentService, paymentTestScenarios } from '../mocks/payment-service.mock';
import { mockEmailService } from '../mocks/email-service.mock';
import { testUtils } from '../utils/test-helpers';

describe('Wallet Integration Tests', () => {
  let dbConnection: any;
  let testUser: any;
  let authToken: string;

  beforeEach(async () => {
    // Setup test database
    dbConnection = await databaseTestHelpers.createTestConnection('integration');
    await databaseTestHelpers.setupTestSchema(dbConnection);
    
    // Create and authenticate test user
    testUser = await databaseTestHelpers.createFullTestUser(dbConnection);
    
    // Get auth token
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
    
    // Clear mock services
    mockPaymentService.clear();
    mockEmailService.clearSentEmails();
  });

  afterEach(async () => {
    await databaseTestHelpers.cleanupTestData(dbConnection);
    await dbConnection.close();
  });

  describe('Balance Management', () => {
    it('should retrieve user balance correctly', async () => {
      const response = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.balance).toBe(testUser.balance);
      expect(result.currency).toBe('USD');
    });

    it('should update balance atomically during transactions', async () => {
      const initialBalance = testUser.balance;
      const betAmount = 50.00;

      // Simulate concurrent balance updates
      const updatePromises = Array.from({ length: 5 }, (_, i) =>
        fetch('/api/wallet/transaction', {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'bet',
            amount: betAmount,
            description: `Test bet ${i + 1}`
          })
        })
      );

      const responses = await Promise.all(updatePromises);
      
      // All transactions should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Final balance should be correct
      const finalBalanceResponse = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });
      
      const finalResult = await finalBalanceResponse.json();
      const expectedBalance = initialBalance - (betAmount * 5);
      expect(finalResult.balance).toBe(expectedBalance);
    });

    it('should prevent negative balance', async () => {
      const response = await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'bet',
          amount: testUser.balance + 100, // More than available
          description: 'Excessive bet'
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('insufficient');
    });
  });

  describe('Deposit Operations', () => {
    it('should process successful deposit with payment integration', async () => {
      const depositAmount = 100.00;
      
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: depositAmount,
          currency: 'USD',
          paymentMethodId: 'test-cc-1'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.transaction.amount).toBe(depositAmount);
      expect(result.transaction.status).toBe('success');

      // Verify balance updated
      const balanceResponse = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });
      
      const balanceResult = await balanceResponse.json();
      expect(balanceResult.balance).toBe(testUser.balance + depositAmount);

      // Verify email sent
      const emails = mockEmailService.getEmailsTo(testUser.email);
      const depositEmail = emails.find(e => e.subject.includes('Deposit'));
      expect(depositEmail).toBeDefined();
    });

    it('should handle failed deposit transaction', async () => {
      mockPaymentService.setNextOperationFailure('Card declined');
      
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: 100.00,
          currency: 'USD',
          paymentMethodId: 'test-cc-1'
        })
      });

      expect(response.status).toBe(400);
      
      // Verify balance unchanged
      const balanceResponse = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });
      
      const balanceResult = await balanceResponse.json();
      expect(balanceResult.balance).toBe(testUser.balance);
    });

    it('should enforce deposit limits', async () => {
      const largeAmount = 50000.00; // Above typical limit
      
      const response = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: largeAmount,
          currency: 'USD',
          paymentMethodId: 'test-cc-1'
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('limit');
    });
  });

  describe('Withdrawal Operations', () => {
    beforeEach(async () => {
      // Ensure user has sufficient balance for withdrawals
      await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'deposit',
          amount: 5000.00,
          description: 'Test balance for withdrawals'
        })
      });
    });

    it('should process withdrawal request', async () => {
      const withdrawalAmount = 200.00;
      
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          currency: 'USD',
          destination: 'user-bank-account'
        })
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.transaction.amount).toBe(-withdrawalAmount); // Negative for withdrawal
      expect(result.transaction.status).toBe('pending'); // Withdrawals start as pending

      // Verify balance reduced immediately
      const balanceResponse = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });
      
      const balanceResult = await balanceResponse.json();
      expect(balanceResult.balance).toBeLessThan(testUser.balance);
    });

    it('should enforce withdrawal limits', async () => {
      const excessiveAmount = 10000.00;
      
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: excessiveAmount,
          currency: 'USD',
          destination: 'user-bank-account'
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('limit');
    });

    it('should prevent withdrawal with insufficient balance', async () => {
      const excessiveAmount = testUser.balance + 1000;
      
      const response = await fetch('/api/wallet/withdraw', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: excessiveAmount,
          currency: 'USD',
          destination: 'user-bank-account'
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('insufficient');
    });
  });

  describe('Transaction History', () => {
    it('should retrieve transaction history with pagination', async () => {
      // Create multiple transactions
      for (let i = 0; i < 15; i++) {
        await fetch('/api/wallet/transaction', {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'bet',
            amount: 10.00,
            description: `Test transaction ${i + 1}`
          })
        });
      }

      // Get first page
      const response = await fetch('/api/wallet/transactions?page=1&limit=10', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.transactions).toHaveLength(10);
      expect(result.pagination.total).toBeGreaterThanOrEqual(15);
      expect(result.pagination.page).toBe(1);
    });

    it('should filter transactions by type', async () => {
      // Create different transaction types
      await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'deposit',
          amount: 100.00,
          description: 'Deposit transaction'
        })
      });

      await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'bet',
          amount: 50.00,
          description: 'Bet transaction'
        })
      });

      // Filter by deposit type
      const response = await fetch('/api/wallet/transactions?type=deposit', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(response.status).toBe(200);
      const result = await response.json();
      result.transactions.forEach((transaction: any) => {
        expect(transaction.type).toBe('deposit');
      });
    });
  });

  describe('Audit Trail', () => {
    it('should maintain complete audit trail for all transactions', async () => {
      const betAmount = 25.00;
      
      const response = await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'bet',
          amount: betAmount,
          description: 'Audit trail test'
        })
      });

      expect(response.status).toBe(200);

      // Check audit trail
      const auditResponse = await fetch('/api/wallet/audit', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(auditResponse.status).toBe(200);
      const auditResult = await auditResponse.json();
      
      const recentAudit = auditResult.auditEntries[0];
      expect(recentAudit.action).toBe('transaction');
      expect(recentAudit.amount).toBe(betAmount);
      expect(recentAudit.userId).toBe(testUser.id);
    });

    it('should track balance changes with proper checksums', async () => {
      const initialBalance = testUser.balance;
      
      // Make a transaction
      await fetch('/api/wallet/transaction', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'bet',
          amount: 30.00,
          description: 'Checksum test'
        })
      });

      // Verify balance integrity
      const integrityResponse = await fetch('/api/wallet/verify-integrity', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(integrityResponse.status).toBe(200);
      const integrityResult = await integrityResponse.json();
      expect(integrityResult.isValid).toBe(true);
    });
  });
});