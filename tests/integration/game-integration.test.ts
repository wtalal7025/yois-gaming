/**
 * Game Integration Tests
 * Tests all 6 games with real authentication and balance integration
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authTestUtils } from '../utils/auth-helpers';
import { databaseTestHelpers } from '../utils/database-helpers';
import { gameTestHelpers } from '../utils/game-helpers';
import { mockPaymentService } from '../mocks/payment-service.mock';

describe('Game Integration Tests', () => {
  let dbConnection: any;
  let testUser: any;
  let authToken: string;
  const initialBalance = 1000.00;

  beforeEach(async () => {
    // Setup test database
    dbConnection = await databaseTestHelpers.createTestConnection('integration');
    await databaseTestHelpers.setupTestSchema(dbConnection);
    
    // Create user with balance for gaming
    testUser = await databaseTestHelpers.createFullTestUser(dbConnection, {
      balance: initialBalance
    });
    
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
  });

  afterEach(async () => {
    await databaseTestHelpers.cleanupTestData(dbConnection);
    await dbConnection.close();
  });

  describe('Mines Game Integration', () => {
    it('should complete full game session with balance integration', async () => {
      const betAmount = 50.00;
      
      // Start game session
      const startResponse = await fetch('/api/games/mines/start', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount,
          mineCount: 3
        })
      });

      expect(startResponse.status).toBe(200);
      const gameData = await startResponse.json();
      expect(gameData.sessionId).toBeDefined();
      expect(gameData.balance).toBe(initialBalance - betAmount);

      // Make safe moves
      const safePositions = [0, 1, 4]; // Known safe positions for test
      for (const position of safePositions) {
        const moveResponse = await fetch('/api/games/mines/reveal', {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: gameData.sessionId,
            position
          })
        });

        expect(moveResponse.status).toBe(200);
        const moveResult = await moveResponse.json();
        expect(moveResult.revealed).toBe(true);
        expect(moveResult.isMine).toBe(false);
      }

      // Cash out
      const cashOutResponse = await fetch('/api/games/mines/cashout', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: gameData.sessionId
        })
      });

      expect(cashOutResponse.status).toBe(200);
      const cashOutResult = await cashOutResponse.json();
      expect(cashOutResult.winAmount).toBeGreaterThan(betAmount);
      expect(cashOutResult.balance).toBeGreaterThan(initialBalance - betAmount);
    });

    it('should handle insufficient balance for mines game', async () => {
      const excessiveBet = initialBalance + 100;
      
      const response = await fetch('/api/games/mines/start', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount: excessiveBet,
          mineCount: 5
        })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.error).toContain('insufficient');
    });
  });

  describe('Sugar Rush Game Integration', () => {
    it('should complete Sugar Rush game with balance deduction and payout', async () => {
      const betAmount = 75.00;
      
      const gameResponse = await fetch('/api/games/sugar-rush/play', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount
        })
      });

      expect(gameResponse.status).toBe(200);
      const result = await gameResponse.json();
      expect(result.betAmount).toBe(betAmount);
      expect(result.multiplier).toBeGreaterThanOrEqual(0);
      expect(typeof result.winAmount).toBe('number');
      
      // Verify balance updated correctly
      const expectedBalance = initialBalance - betAmount + result.winAmount;
      expect(Math.abs(result.newBalance - expectedBalance)).toBeLessThan(0.01);
    });
  });

  describe('Bars Game Integration', () => {
    it('should play bars game with payline validation', async () => {
      const betAmount = 25.00;
      
      const gameResponse = await fetch('/api/games/bars/spin', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount,
          paylines: 10
        })
      });

      expect(gameResponse.status).toBe(200);
      const result = await gameResponse.json();
      expect(result.reels).toHaveLength(5);
      expect(result.paylines).toHaveLength(10);
      expect(typeof result.totalWin).toBe('number');
      
      const expectedBalance = initialBalance - betAmount + result.totalWin;
      expect(Math.abs(result.balance - expectedBalance)).toBeLessThan(0.01);
    });
  });

  describe('Dragon Tower Game Integration', () => {
    it('should complete dragon tower climb with multiplier progression', async () => {
      const betAmount = 40.00;
      
      // Start tower climb
      const startResponse = await fetch('/api/games/dragon-tower/start', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount,
          difficulty: 'medium'
        })
      });

      expect(startResponse.status).toBe(200);
      const gameData = await startResponse.json();
      
      // Climb levels
      for (let level = 0; level < 3; level++) {
        const climbResponse = await fetch('/api/games/dragon-tower/climb', {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: gameData.sessionId,
            choice: 0 // First option
          })
        });

        expect(climbResponse.status).toBe(200);
        const climbResult = await climbResponse.json();
        if (climbResult.gameOver) break;
        expect(climbResult.currentMultiplier).toBeGreaterThan(1.0);
      }
    });
  });

  describe('Crash Game Integration', () => {
    it('should handle crash game bet and auto-cashout', async () => {
      const betAmount = 60.00;
      const autoCashout = 2.5;
      
      const betResponse = await fetch('/api/games/crash/bet', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount,
          autoCashout
        })
      });

      expect(betResponse.status).toBe(200);
      const result = await betResponse.json();
      expect(result.betPlaced).toBe(true);
      expect(result.autoCashout).toBe(autoCashout);
      
      // Balance should be reduced by bet amount
      expect(result.balance).toBe(initialBalance - betAmount);
    });
  });

  describe('Limbo Game Integration', () => {
    it('should play limbo with target multiplier', async () => {
      const betAmount = 30.00;
      const targetMultiplier = 5.0;
      
      const gameResponse = await fetch('/api/games/limbo/play', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          betAmount,
          targetMultiplier
        })
      });

      expect(gameResponse.status).toBe(200);
      const result = await gameResponse.json();
      expect(result.targetMultiplier).toBe(targetMultiplier);
      expect(result.actualMultiplier).toBeGreaterThan(0);
      
      const isWin = result.actualMultiplier >= targetMultiplier;
      const expectedWin = isWin ? betAmount * targetMultiplier : 0;
      const expectedBalance = initialBalance - betAmount + expectedWin;
      expect(Math.abs(result.balance - expectedBalance)).toBeLessThan(0.01);
    });
  });

  describe('Cross-Game Session Management', () => {
    it('should maintain session state across different games', async () => {
      // Play mines game
      await fetch('/api/games/mines/start', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ betAmount: 20.00, mineCount: 2 })
      });

      // Switch to sugar rush
      const sugarResponse = await fetch('/api/games/sugar-rush/play', {
        method: 'POST',
        headers: {
          ...authTestUtils.createAuthHeaders(authToken),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ betAmount: 30.00 })
      });

      expect(sugarResponse.status).toBe(200);
      
      // Check game history includes both games
      const historyResponse = await fetch('/api/games/history', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });

      expect(historyResponse.status).toBe(200);
      const history = await historyResponse.json();
      expect(history.games.length).toBeGreaterThanOrEqual(2);
      
      const gameTypes = history.games.map((g: any) => g.gameType);
      expect(gameTypes).toContain('mines');
      expect(gameTypes).toContain('sugar-rush');
    });

    it('should handle concurrent game sessions properly', async () => {
      // Start multiple game sessions concurrently
      const gamePromises = [
        fetch('/api/games/limbo/play', {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ betAmount: 10.00, targetMultiplier: 2.0 })
        }),
        fetch('/api/games/sugar-rush/play', {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ betAmount: 15.00 })
        })
      ];

      const responses = await Promise.all(gamePromises);
      
      // All games should succeed or properly handle concurrency
      responses.forEach(response => {
        expect([200, 429].includes(response.status)).toBe(true); // Success or rate limited
      });

      // Final balance should be consistent
      const balanceResponse = await fetch('/api/wallet/balance', {
        method: 'GET',
        headers: authTestUtils.createAuthHeaders(authToken)
      });
      
      const balanceResult = await balanceResponse.json();
      expect(typeof balanceResult.balance).toBe('number');
      expect(balanceResult.balance).toBeLessThanOrEqual(initialBalance);
    });
  });

  describe('Game Error Handling', () => {
    it('should handle authentication failures in all games', async () => {
      const invalidToken = 'invalid-token';
      
      const gameTypes = ['mines', 'sugar-rush', 'bars', 'dragon-tower', 'crash', 'limbo'];
      
      for (const gameType of gameTypes) {
        const endpoint = gameType === 'bars' ? 'spin' : 
                        gameType === 'crash' ? 'bet' : 'play';
        
        const response = await fetch(`/api/games/${gameType}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${invalidToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ betAmount: 10.00 })
        });

        expect(response.status).toBe(401);
        const result = await response.json();
        expect(result.error).toContain('unauthorized');
      }
    });

    it('should validate bet amounts consistently across games', async () => {
      const invalidBetAmount = -50.00;
      
      const gameRequests = [
        { game: 'mines', endpoint: 'start', body: { betAmount: invalidBetAmount, mineCount: 3 } },
        { game: 'sugar-rush', endpoint: 'play', body: { betAmount: invalidBetAmount } },
        { game: 'limbo', endpoint: 'play', body: { betAmount: invalidBetAmount, targetMultiplier: 2.0 } }
      ];

      for (const { game, endpoint, body } of gameRequests) {
        const response = await fetch(`/api/games/${game}/${endpoint}`, {
          method: 'POST',
          headers: {
            ...authTestUtils.createAuthHeaders(authToken),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });

        expect(response.status).toBe(400);
        const result = await response.json();
        expect(result.error).toContain('invalid bet');
      }
    });
  });
});