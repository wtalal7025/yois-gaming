/**
 * End-to-End User Journey Tests
 * Tests complete user workflows from registration to gaming
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';
import { authTestUtils } from '../utils/auth-helpers';
import { databaseTestHelpers } from '../utils/database-helpers';
import { testUtils } from '../utils/test-helpers';

test.describe('Complete User Journey E2E Tests', () => {
  let context: BrowserContext;
  let page: Page;
  let testUser: any;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
    
    // Setup clean test environment
    await databaseTestHelpers.resetTestEnvironment();
    testUser = testUtils.generateRandomUser();
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('New user registration to first game play journey', async () => {
    // Navigate to home page
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Gaming Platform');

    // Click register button
    await page.click('[data-testid="register-button"]');
    await expect(page.locator('[data-testid="register-modal"]')).toBeVisible();

    // Fill registration form
    await page.fill('[data-testid="register-email"]', testUser.email);
    await page.fill('[data-testid="register-username"]', testUser.username);
    await page.fill('[data-testid="register-password"]', testUser.password);
    await page.fill('[data-testid="register-confirm-password"]', testUser.password);
    await page.check('[data-testid="terms-checkbox"]');

    // Submit registration
    await page.click('[data-testid="register-submit"]');
    
    // Wait for success message
    await expect(page.locator('[data-testid="success-message"]')).toContainText('registered successfully');

    // Simulate email verification (mock verification endpoint)
    const verificationToken = await testUtils.generateVerificationToken(testUser.email);
    await page.goto(`/auth/verify?token=${verificationToken}`);
    await expect(page.locator('[data-testid="verification-success"]')).toBeVisible();

    // Login with verified account
    await page.goto('/');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');

    // Verify user is logged in
    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-balance"]')).toContainText('0.00');

    // Navigate to deposit page
    await page.click('[data-testid="deposit-button"]');
    await expect(page.locator('[data-testid="deposit-modal"]')).toBeVisible();

    // Make first deposit
    await page.fill('[data-testid="deposit-amount"]', '100.00');
    await page.selectOption('[data-testid="payment-method"]', 'test-card');
    await page.click('[data-testid="deposit-submit"]');

    // Wait for deposit confirmation
    await expect(page.locator('[data-testid="deposit-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="user-balance"]')).toContainText('100.00');

    // Navigate to games lobby
    await page.click('[data-testid="games-link"]');
    await expect(page.locator('[data-testid="games-lobby"]')).toBeVisible();

    // Select and play first game (Sugar Rush)
    await page.click('[data-testid="game-card-sugar-rush"]');
    await expect(page.locator('[data-testid="game-container"]')).toBeVisible();
    await expect(page.locator('h1')).toContainText('Sugar Rush');

    // Place first bet
    await page.fill('[data-testid="bet-amount-input"]', '10.00');
    await page.click('[data-testid="spin-button"]');

    // Wait for game result
    await expect(page.locator('[data-testid="game-result"]')).toBeVisible();
    
    // Verify balance updated
    const updatedBalance = await page.locator('[data-testid="user-balance"]').textContent();
    expect(parseFloat(updatedBalance || '0')).not.toBe(100.00); // Balance should have changed

    // Check game history
    await page.click('[data-testid="game-history-tab"]');
    await expect(page.locator('[data-testid="history-entry"]').first()).toBeVisible();
  });

  test('Multi-game session with balance management', async () => {
    // Setup authenticated user with balance
    await authTestUtils.loginUser(page, testUser);
    await testUtils.setUserBalance(testUser.id, 500.00);
    
    await page.goto('/games');
    await expect(page.locator('[data-testid="user-balance"]')).toContainText('500.00');

    const gamesToPlay = [
      { name: 'mines', bet: 25.00 },
      { name: 'sugar-rush', bet: 30.00 },
      { name: 'limbo', bet: 40.00 }
    ];

    let currentBalance = 500.00;

    for (const game of gamesToPlay) {
      // Navigate to game
      await page.click(`[data-testid="game-card-${game.name}"]`);
      await expect(page.locator(`[data-testid="game-${game.name}"]`)).toBeVisible();

      // Place bet
      await page.fill('[data-testid="bet-amount-input"]', game.bet.toString());
      
      if (game.name === 'mines') {
        await page.selectOption('[data-testid="mine-count"]', '3');
        await page.click('[data-testid="start-game"]');
        
        // Make a few safe moves then cash out
        await page.click('[data-testid="grid-cell-0"]');
        await page.click('[data-testid="grid-cell-1"]');
        await page.click('[data-testid="cashout-button"]');
      } else {
        await page.click('[data-testid="play-button"]');
      }

      // Wait for result and verify balance updated
      await expect(page.locator('[data-testid="game-result"]')).toBeVisible();
      
      const newBalanceText = await page.locator('[data-testid="user-balance"]').textContent();
      const newBalance = parseFloat(newBalanceText || '0');
      expect(newBalance).not.toBe(currentBalance);
      currentBalance = newBalance;

      // Return to games lobby
      await page.click('[data-testid="back-to-lobby"]');
      await expect(page.locator('[data-testid="games-lobby"]')).toBeVisible();
    }

    // Verify transaction history
    await page.click('[data-testid="wallet-link"]');
    await expect(page.locator('[data-testid="transaction-history"]')).toBeVisible();
    
    const transactions = page.locator('[data-testid="transaction-row"]');
    await expect(transactions).toHaveCount(gamesToPlay.length);
  });

  test('Profile management and settings update', async () => {
    await authTestUtils.loginUser(page, testUser);
    await page.goto('/profile');

    // Update profile information
    await page.click('[data-testid="edit-profile-button"]');
    await page.fill('[data-testid="profile-display-name"]', 'Updated Display Name');
    await page.selectOption('[data-testid="timezone-select"]', 'America/New_York');
    await page.check('[data-testid="email-notifications"]');
    await page.click('[data-testid="save-profile"]');

    // Verify success message
    await expect(page.locator('[data-testid="profile-updated"]')).toBeVisible();

    // Change password
    await page.click('[data-testid="change-password-tab"]');
    await page.fill('[data-testid="current-password"]', testUser.password);
    await page.fill('[data-testid="new-password"]', 'NewPassword123!');
    await page.fill('[data-testid="confirm-new-password"]', 'NewPassword123!');
    await page.click('[data-testid="change-password-submit"]');

    // Verify password change success
    await expect(page.locator('[data-testid="password-changed"]')).toBeVisible();

    // Test login with new password
    await page.click('[data-testid="logout-button"]');
    await page.click('[data-testid="login-button"]');
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', 'NewPassword123!');
    await page.click('[data-testid="login-submit"]');

    await expect(page.locator('[data-testid="user-profile"]')).toBeVisible();
  });

  test('Withdrawal request workflow', async () => {
    // Setup user with sufficient balance
    await authTestUtils.loginUser(page, testUser);
    await testUtils.setUserBalance(testUser.id, 1000.00);
    
    await page.goto('/wallet');
    await expect(page.locator('[data-testid="user-balance"]')).toContainText('1000.00');

    // Initiate withdrawal
    await page.click('[data-testid="withdraw-button"]');
    await expect(page.locator('[data-testid="withdraw-modal"]')).toBeVisible();

    await page.fill('[data-testid="withdraw-amount"]', '250.00');
    await page.selectOption('[data-testid="withdrawal-method"]', 'bank-transfer');
    await page.fill('[data-testid="bank-account"]', 'TEST-ACCOUNT-123');
    await page.click('[data-testid="withdraw-submit"]');

    // Verify withdrawal request submitted
    await expect(page.locator('[data-testid="withdrawal-pending"]')).toBeVisible();
    
    // Check transaction history shows pending withdrawal
    await page.click('[data-testid="transaction-history-tab"]');
    const pendingWithdrawal = page.locator('[data-testid="transaction-row"]').first();
    await expect(pendingWithdrawal).toContainText('Withdrawal');
    await expect(pendingWithdrawal).toContainText('Pending');
    await expect(pendingWithdrawal).toContainText('250.00');

    // Verify balance is immediately reduced
    await expect(page.locator('[data-testid="user-balance"]')).toContainText('750.00');
  });

  test('Game favorites and recent games functionality', async () => {
    await authTestUtils.loginUser(page, testUser);
    await page.goto('/games');

    // Add games to favorites
    const favoriteGames = ['mines', 'sugar-rush', 'crash'];
    
    for (const gameId of favoriteGames) {
      await page.hover(`[data-testid="game-card-${gameId}"]`);
      await page.click(`[data-testid="favorite-button-${gameId}"]`);
      await expect(page.locator(`[data-testid="favorite-button-${gameId}"]`)).toHaveClass(/favorited/);
    }

    // Check favorites section
    await page.click('[data-testid="favorites-tab"]');
    const favoritesList = page.locator('[data-testid="favorites-grid"] [data-testid^="game-card-"]');
    await expect(favoritesList).toHaveCount(favoriteGames.length);

    // Play a game to add to recent
    await page.click('[data-testid="game-card-limbo"]');
    await page.fill('[data-testid="bet-amount-input"]', '20.00');
    await page.fill('[data-testid="target-multiplier"]', '2.5');
    await page.click('[data-testid="play-button"]');
    await expect(page.locator('[data-testid="game-result"]')).toBeVisible();

    // Return to lobby and check recent games
    await page.click('[data-testid="back-to-lobby"]');
    await page.click('[data-testid="recent-games-tab"]');
    
    const recentGame = page.locator('[data-testid="recent-games-grid"] [data-testid="game-card-limbo"]');
    await expect(recentGame).toBeVisible();
  });

  test('Responsive mobile experience', async ({ browser }) => {
    // Test with mobile viewport
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 }
    });
    const mobilePage = await mobileContext.newPage();

    await authTestUtils.loginUser(mobilePage, testUser);
    await mobilePage.goto('/');

    // Test mobile navigation
    await mobilePage.click('[data-testid="mobile-menu-toggle"]');
    await expect(mobilePage.locator('[data-testid="mobile-menu"]')).toBeVisible();
    
    await mobilePage.click('[data-testid="mobile-games-link"]');
    await expect(mobilePage.locator('[data-testid="games-lobby"]')).toBeVisible();

    // Test mobile game interface
    await mobilePage.click('[data-testid="game-card-sugar-rush"]');
    await expect(mobilePage.locator('[data-testid="mobile-game-interface"]')).toBeVisible();

    // Test mobile-optimized controls
    await mobilePage.fill('[data-testid="mobile-bet-input"]', '15.00');
    await mobilePage.click('[data-testid="mobile-spin-button"]');
    await expect(mobilePage.locator('[data-testid="game-result"]')).toBeVisible();

    await mobileContext.close();
  });

  test('Session timeout and re-authentication', async () => {
    await authTestUtils.loginUser(page, testUser);
    await page.goto('/games');

    // Simulate session timeout by clearing auth token
    await page.evaluate(() => {
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
    });

    // Try to make an authenticated request
    await page.click('[data-testid="game-card-mines"]');
    await page.fill('[data-testid="bet-amount-input"]', '25.00');
    await page.click('[data-testid="start-game"]');

    // Should redirect to login
    await expect(page.locator('[data-testid="login-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="session-expired-message"]')).toBeVisible();

    // Re-authenticate
    await page.fill('[data-testid="login-email"]', testUser.email);
    await page.fill('[data-testid="login-password"]', testUser.password);
    await page.click('[data-testid="login-submit"]');

    // Should return to previous game
    await expect(page.locator('[data-testid="game-mines"]')).toBeVisible();
    await expect(page.locator('[data-testid="bet-amount-input"]')).toHaveValue('25.00');
  });
});