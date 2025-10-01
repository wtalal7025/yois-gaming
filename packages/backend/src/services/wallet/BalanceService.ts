/**
 * Balance Service
 * Handles balance calculations, updates, and validation
 * with atomic operations and concurrency protection
 */

import type { Balance } from '@yois-games/shared'

// Reason: Interface for database operations, will be implemented with actual DB later
interface BalanceRepository {
  getBalance(userId: string): Promise<Balance | null>
  updateBalance(userId: string, amount: number, transactionId: string): Promise<Balance>
  lockBalance(userId: string): Promise<boolean>
  unlockBalance(userId: string): Promise<boolean>
  validateSufficientBalance(userId: string, amount: number): Promise<boolean>
  createBalance(userId: string, initialAmount: number): Promise<Balance>
  getBalanceHistory(userId: string, limit?: number): Promise<Balance[]>
  freezeBalance(userId: string, amount: number, reason: string): Promise<boolean>
  unfreezeBalance(userId: string, amount: number): Promise<boolean>
}

interface AuditLogger {
  logBalanceChange(userId: string, action: string, amount: number, transactionId: string, metadata?: Record<string, any>): Promise<void>
  logBalanceError(userId: string, error: string, metadata?: Record<string, any>): Promise<void>
}

export class BalanceService {
  private balanceRepository: BalanceRepository
  private auditLogger: AuditLogger

  // Reason: In-memory locks to prevent concurrent balance modifications
  private balanceLocks: Set<string> = new Set()

  constructor(balanceRepository: BalanceRepository, auditLogger: AuditLogger) {
    this.balanceRepository = balanceRepository
    this.auditLogger = auditLogger
  }

  /**
   * Get user's current balance
   * @param userId - User ID
   * @returns Promise with balance or null if not found
   */
  async getBalance(userId: string): Promise<Balance | null> {
    try {
      const balance = await this.balanceRepository.getBalance(userId)

      if (!balance) {
        // Create initial balance for new user
        return await this.balanceRepository.createBalance(userId, 100.00) // Starting bonus
      }

      return balance
    } catch (error) {
      await this.auditLogger.logBalanceError(userId, 'get_balance_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to retrieve balance')
    }
  }

  /**
   * Add amount to user's balance
   * @param userId - User ID
   * @param amount - Amount to add (must be positive)
   * @param transactionId - Associated transaction ID
   * @returns Promise with updated balance
   */
  async addBalance(userId: string, amount: number, transactionId: string): Promise<Balance> {
    if (amount <= 0) {
      throw new Error('Amount to add must be positive')
    }

    return await this.updateBalanceAtomic(userId, amount, transactionId, 'add_balance')
  }

  /**
   * Deduct amount from user's balance
   * @param userId - User ID
   * @param amount - Amount to deduct (must be positive)
   * @param transactionId - Associated transaction ID
   * @returns Promise with updated balance
   */
  async deductBalance(userId: string, amount: number, transactionId: string): Promise<Balance> {
    if (amount <= 0) {
      throw new Error('Amount to deduct must be positive')
    }

    // Validate sufficient balance before deduction
    const hasSufficientBalance = await this.balanceRepository.validateSufficientBalance(userId, amount)
    if (!hasSufficientBalance) {
      await this.auditLogger.logBalanceError(userId, 'insufficient_balance', {
        requestedAmount: amount,
        transactionId
      })
      throw new Error('Insufficient balance')
    }

    return await this.updateBalanceAtomic(userId, -amount, transactionId, 'deduct_balance')
  }

  /**
   * Set user's balance to a specific amount
   * @param userId - User ID
   * @param amount - New balance amount
   * @param transactionId - Associated transaction ID
   * @param reason - Reason for balance adjustment
   * @returns Promise with updated balance
   */
  async setBalance(userId: string, amount: number, transactionId: string, reason: string = 'admin_adjustment'): Promise<Balance> {
    if (amount < 0) {
      throw new Error('Balance cannot be negative')
    }

    const currentBalance = await this.getBalance(userId)
    if (!currentBalance) {
      throw new Error('User balance not found')
    }

    const difference = amount - currentBalance.amount
    const action = difference >= 0 ? 'balance_increase' : 'balance_decrease'

    await this.auditLogger.logBalanceChange(userId, action, difference, transactionId, {
      oldBalance: currentBalance.amount,
      newBalance: amount,
      reason
    })

    return await this.updateBalanceAtomic(userId, difference, transactionId, action)
  }

  /**
   * Validate if user has sufficient balance
   * @param userId - User ID
   * @param amount - Amount to validate
   * @returns Promise with validation result
   */
  async validateSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      return await this.balanceRepository.validateSufficientBalance(userId, amount)
    } catch (error) {
      await this.auditLogger.logBalanceError(userId, 'balance_validation_failed', {
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Get balance history for user
   * @param userId - User ID
   * @param limit - Number of records to return
   * @returns Promise with balance history
   */
  async getBalanceHistory(userId: string, limit: number = 50): Promise<Balance[]> {
    try {
      if (limit > 100) {
        throw new Error('Maximum limit is 100 records')
      }

      return await this.balanceRepository.getBalanceHistory(userId, limit)
    } catch (error) {
      await this.auditLogger.logBalanceError(userId, 'balance_history_failed', {
        limit,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to retrieve balance history')
    }
  }

  /**
   * Freeze a portion of user's balance
   * @param userId - User ID
   * @param amount - Amount to freeze
   * @param reason - Reason for freezing
   * @returns Promise with freeze result
   */
  async freezeBalance(userId: string, amount: number, reason: string): Promise<boolean> {
    try {
      if (amount <= 0) {
        throw new Error('Amount to freeze must be positive')
      }

      // Validate sufficient available balance
      const hasSufficientBalance = await this.balanceRepository.validateSufficientBalance(userId, amount)
      if (!hasSufficientBalance) {
        throw new Error('Insufficient balance to freeze')
      }

      const result = await this.balanceRepository.freezeBalance(userId, amount, reason)

      if (result) {
        await this.auditLogger.logBalanceChange(userId, 'balance_frozen', amount, 'freeze_operation', {
          reason
        })
      }

      return result
    } catch (error) {
      await this.auditLogger.logBalanceError(userId, 'balance_freeze_failed', {
        amount,
        reason,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Unfreeze a portion of user's balance
   * @param userId - User ID
   * @param amount - Amount to unfreeze
   * @returns Promise with unfreeze result
   */
  async unfreezeBalance(userId: string, amount: number): Promise<boolean> {
    try {
      if (amount <= 0) {
        throw new Error('Amount to unfreeze must be positive')
      }

      const result = await this.balanceRepository.unfreezeBalance(userId, amount)

      if (result) {
        await this.auditLogger.logBalanceChange(userId, 'balance_unfrozen', amount, 'unfreeze_operation')
      }

      return result
    } catch (error) {
      await this.auditLogger.logBalanceError(userId, 'balance_unfreeze_failed', {
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Transfer balance between users atomically
   * @param fromUserId - Source user ID
   * @param toUserId - Destination user ID
   * @param amount - Amount to transfer
   * @param transactionId - Associated transaction ID
   * @returns Promise with transfer result
   */
  async transferBalance(fromUserId: string, toUserId: string, amount: number, transactionId: string): Promise<{
    fromBalance: Balance;
    toBalance: Balance;
  }> {
    if (amount <= 0) {
      throw new Error('Transfer amount must be positive')
    }

    if (fromUserId === toUserId) {
      throw new Error('Cannot transfer to the same user')
    }

    // Acquire locks for both users in consistent order to prevent deadlocks
    const userIds = [fromUserId, toUserId].sort()

    try {
      // Lock both user balances
      for (const userId of userIds) {
        await this.acquireLock(userId)
      }

      // Validate sender has sufficient balance
      const hasSufficientBalance = await this.balanceRepository.validateSufficientBalance(fromUserId, amount)
      if (!hasSufficientBalance) {
        throw new Error('Insufficient balance for transfer')
      }

      // Perform the transfer atomically
      const fromBalance = await this.balanceRepository.updateBalance(fromUserId, -amount, transactionId)
      const toBalance = await this.balanceRepository.updateBalance(toUserId, amount, transactionId)

      // Log the transfer
      await this.auditLogger.logBalanceChange(fromUserId, 'transfer_sent', -amount, transactionId, {
        recipientId: toUserId
      })

      await this.auditLogger.logBalanceChange(toUserId, 'transfer_received', amount, transactionId, {
        senderId: fromUserId
      })

      return { fromBalance, toBalance }

    } catch (error) {
      await this.auditLogger.logBalanceError(fromUserId, 'transfer_failed', {
        amount,
        recipientId: toUserId,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    } finally {
      // Release locks
      for (const userId of userIds) {
        this.releaseLock(userId)
      }
    }
  }

  /**
   * Update balance atomically with concurrency protection
   * @param userId - User ID
   * @param amount - Amount to change (positive or negative)
   * @param transactionId - Associated transaction ID
   * @param action - Action being performed
   * @returns Promise with updated balance
   */
  private async updateBalanceAtomic(userId: string, amount: number, transactionId: string, action: string): Promise<Balance> {
    try {
      // Acquire lock for this user
      await this.acquireLock(userId)

      const updatedBalance = await this.balanceRepository.updateBalance(userId, amount, transactionId)

      await this.auditLogger.logBalanceChange(userId, action, amount, transactionId, {
        newBalance: updatedBalance.amount
      })

      return updatedBalance

    } catch (error) {
      await this.auditLogger.logBalanceError(userId, `${action}_failed`, {
        amount,
        transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    } finally {
      // Release lock
      this.releaseLock(userId)
    }
  }

  /**
   * Acquire lock for user balance operations
   * @param userId - User ID to lock
   * @returns Promise that resolves when lock is acquired
   */
  private async acquireLock(userId: string): Promise<void> {
    // Wait for any existing lock to be released
    let attempts = 0
    const maxAttempts = 50 // 5 seconds timeout

    while (this.balanceLocks.has(userId)) {
      if (attempts >= maxAttempts) {
        throw new Error('Balance lock timeout - operation aborted')
      }
      await new Promise(resolve => setTimeout(resolve, 100))
      attempts++
    }

    // Acquire the lock
    this.balanceLocks.add(userId)
  }

  /**
   * Release lock for user balance operations
   * @param userId - User ID to unlock
   */
  private releaseLock(userId: string): void {
    this.balanceLocks.delete(userId)
  }

  /**
   * Get balance statistics
   * @param userId - User ID
   * @returns Promise with balance statistics
   */
  async getBalanceStats(userId: string): Promise<{
    currentBalance: number;
    availableBalance: number;
    frozenBalance: number;
    totalCredits: number;
    totalDebits: number;
    lastUpdated: Date;
  }> {
    try {
      const balance = await this.getBalance(userId)
      if (!balance) {
        throw new Error('Balance not found')
      }

      // Return basic stats (extended stats would require additional repository methods)
      return {
        currentBalance: balance.amount,
        availableBalance: balance.amount, // Assuming no frozen balance for now
        frozenBalance: 0, // Would be calculated from frozen balance records
        totalCredits: 0, // Would be calculated from transaction history
        totalDebits: 0, // Would be calculated from transaction history
        lastUpdated: balance.updatedAt ? new Date(balance.updatedAt) : new Date()
      }
    } catch (error) {
      await this.auditLogger.logBalanceError(userId, 'balance_stats_failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to retrieve balance statistics')
    }
  }
}