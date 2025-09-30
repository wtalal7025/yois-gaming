/**
 * Redis Balance Repository
 * Implements persistent balance storage using Redis instead of in-memory data
 * Provides atomic balance operations with Redis-based locking and persistence
 */

import { getRedisService } from '../cache/RedisService'
import type { Balance } from '@stake-games/shared'

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

export class RedisBalanceRepository implements BalanceRepository {
  private redis = getRedisService()

  /**
   * Generate balance key for Redis storage
   * @param userId - User ID
   * @returns Redis key for balance storage
   */
  private getBalanceKey(userId: string): string {
    return this.redis.generateBalanceKey(userId)
  }

  /**
   * Generate balance history key for Redis storage
   * @param userId - User ID
   * @returns Redis key for balance history
   */
  private getBalanceHistoryKey(userId: string): string {
    return this.redis.generateKey('balance_history', userId)
  }

  /**
   * Generate balance lock key for Redis
   * @param userId - User ID
   * @returns Redis key for balance lock
   */
  private getBalanceLockKey(userId: string): string {
    return this.redis.generateKey('balance_lock', userId)
  }

  /**
   * Generate frozen balance key for Redis
   * @param userId - User ID
   * @returns Redis key for frozen balance
   */
  private getFrozenBalanceKey(userId: string): string {
    return this.redis.generateKey('frozen_balance', userId)
  }

  /**
   * Get user balance from Redis
   * @param userId - User ID
   * @returns Promise with balance or null
   */
  async getBalance(userId: string): Promise<Balance | null> {
    try {
      console.log(`🔍 RedisBalanceRepository: Getting balance for user ${userId}`)
      
      const balanceKey = this.getBalanceKey(userId)
      const balanceData = await this.redis.hgetall<Balance>(balanceKey)
      
      if (!balanceData || Object.keys(balanceData).length === 0) {
        console.log(`📝 RedisBalanceRepository: No balance found for user ${userId}`)
        return null
      }

      // Reason: Ensure proper data types for Redis-stored data
      const balance: Balance = {
        id: balanceData.id || `balance_${userId}`,
        userId: balanceData.userId || userId,
        amount: typeof balanceData.amount === 'string' ? parseFloat(balanceData.amount) : balanceData.amount,
        currency: balanceData.currency || 'USD',
        lastUpdated: balanceData.lastUpdated || new Date().toISOString(),
        createdAt: balanceData.createdAt || new Date().toISOString(),
        updatedAt: balanceData.updatedAt || new Date().toISOString()
      }

      console.log(`✅ RedisBalanceRepository: Retrieved balance ${balance.amount} for user ${userId}`)
      return balance
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to get balance for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Update user balance in Redis
   * @param userId - User ID
   * @param amount - Amount to add (can be negative)
   * @param transactionId - Associated transaction ID
   * @returns Promise with updated balance
   */
  async updateBalance(userId: string, amount: number, transactionId: string): Promise<Balance> {
    try {
      console.log(`🔧 RedisBalanceRepository: Updating balance for user ${userId} by ${amount}`)
      
      const balanceKey = this.getBalanceKey(userId)
      const currentBalance = await this.getBalance(userId)
      
      if (!currentBalance) {
        throw new Error(`Balance not found for user ${userId}`)
      }

      const newAmount = currentBalance.amount + amount
      if (newAmount < 0) {
        throw new Error('Insufficient balance')
      }

      const updatedBalance: Balance = {
        ...currentBalance,
        amount: newAmount,
        lastUpdated: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // Reason: Store balance as hash for efficient field updates
      await this.redis.hset(balanceKey, 'amount', updatedBalance.amount.toString())
      await this.redis.hset(balanceKey, 'lastUpdated', updatedBalance.lastUpdated)
      await this.redis.hset(balanceKey, 'updatedAt', updatedBalance.updatedAt)

      // Store in balance history for audit trail
      await this.addToBalanceHistory(userId, updatedBalance, transactionId)

      console.log(`✅ RedisBalanceRepository: Updated balance to ${updatedBalance.amount} for user ${userId}`)
      return updatedBalance
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to update balance for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Lock balance for atomic operations
   * @param userId - User ID
   * @returns Promise with lock success status
   */
  async lockBalance(userId: string): Promise<boolean> {
    try {
      console.log(`🔒 RedisBalanceRepository: Locking balance for user ${userId}`)
      
      const lockKey = this.getBalanceLockKey(userId)
      const lockValue = `lock_${Date.now()}`
      const lockTTL = 30 // 30 seconds lock TTL
      
      // Reason: Use SET with NX and EX for atomic lock acquisition
      const lockAcquired = await this.redis.set(lockKey, lockValue, lockTTL)
      
      if (lockAcquired) {
        console.log(`✅ RedisBalanceRepository: Acquired balance lock for user ${userId}`)
      } else {
        console.log(`⚠️ RedisBalanceRepository: Failed to acquire balance lock for user ${userId}`)
      }
      
      return lockAcquired
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to lock balance for user ${userId}:`, error)
      return false
    }
  }

  /**
   * Unlock balance
   * @param userId - User ID
   * @returns Promise with unlock success status
   */
  async unlockBalance(userId: string): Promise<boolean> {
    try {
      console.log(`🔓 RedisBalanceRepository: Unlocking balance for user ${userId}`)
      
      const lockKey = this.getBalanceLockKey(userId)
      const deleted = await this.redis.delete(lockKey)
      
      if (deleted) {
        console.log(`✅ RedisBalanceRepository: Released balance lock for user ${userId}`)
      }
      
      return deleted
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to unlock balance for user ${userId}:`, error)
      return false
    }
  }

  /**
   * Validate sufficient balance for transaction
   * @param userId - User ID
   * @param amount - Amount to validate
   * @returns Promise with validation result
   */
  async validateSufficientBalance(userId: string, amount: number): Promise<boolean> {
    try {
      console.log(`🔍 RedisBalanceRepository: Validating ${amount} balance for user ${userId}`)
      
      const balance = await this.getBalance(userId)
      if (!balance) {
        console.log(`❌ RedisBalanceRepository: No balance found for user ${userId}`)
        return false
      }

      const frozenAmount = await this.getFrozenAmount(userId)
      const availableBalance = balance.amount - frozenAmount
      const hasSufficientBalance = availableBalance >= amount

      console.log(`📊 RedisBalanceRepository: User ${userId} - Available: ${availableBalance}, Required: ${amount}, Valid: ${hasSufficientBalance}`)
      return hasSufficientBalance
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to validate balance for user ${userId}:`, error)
      return false
    }
  }

  /**
   * Create initial balance for new user
   * @param userId - User ID
   * @param initialAmount - Starting balance amount
   * @returns Promise with created balance
   */
  async createBalance(userId: string, initialAmount: number): Promise<Balance> {
    try {
      console.log(`🆕 RedisBalanceRepository: Creating balance for user ${userId} with ${initialAmount}`)
      
      const balanceKey = this.getBalanceKey(userId)
      const now = new Date()
      
      const balance: Balance = {
        id: `balance_${userId}`,
        userId,
        amount: initialAmount,
        currency: 'USD',
        lastUpdated: now.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString()
      }

      // Reason: Store as hash for efficient field access and updates
      await this.redis.hset(balanceKey, 'id', balance.id)
      await this.redis.hset(balanceKey, 'userId', userId)
      await this.redis.hset(balanceKey, 'amount', initialAmount.toString())
      await this.redis.hset(balanceKey, 'currency', balance.currency)
      await this.redis.hset(balanceKey, 'lastUpdated', now.toISOString())
      await this.redis.hset(balanceKey, 'createdAt', now.toISOString())
      await this.redis.hset(balanceKey, 'updatedAt', now.toISOString())

      // Initialize balance history
      await this.addToBalanceHistory(userId, balance, 'initial_balance')

      console.log(`✅ RedisBalanceRepository: Created balance for user ${userId}`)
      return balance
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to create balance for user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Get balance history for user
   * @param userId - User ID
   * @param limit - Number of history records to retrieve
   * @returns Promise with balance history array
   */
  async getBalanceHistory(userId: string, limit: number = 50): Promise<Balance[]> {
    try {
      console.log(`📚 RedisBalanceRepository: Getting balance history for user ${userId}, limit: ${limit}`)
      
      const historyKey = this.getBalanceHistoryKey(userId)
      const historyEntries = await this.redis.keys(`${historyKey}:*`)
      
      if (historyEntries.length === 0) {
        console.log(`📝 RedisBalanceRepository: No balance history found for user ${userId}`)
        return []
      }

      // Reason: Get recent entries and sort by timestamp
      const sortedKeys = historyEntries
        .sort((a, b) => {
          const timestampA = parseInt(a.split(':').pop() || '0')
          const timestampB = parseInt(b.split(':').pop() || '0')
          return timestampB - timestampA // Descending order (newest first)
        })
        .slice(0, limit)

      const history: Balance[] = []
      for (const key of sortedKeys) {
        const historyData = await this.redis.hgetall<any>(key)
        if (historyData && Object.keys(historyData).length > 0) {
          history.push({
            id: historyData.id,
            userId: historyData.userId,
            amount: typeof historyData.amount === 'string' ? parseFloat(historyData.amount) : historyData.amount,
            currency: historyData.currency,
            lastUpdated: historyData.lastUpdated || new Date().toISOString(),
            createdAt: historyData.createdAt || new Date().toISOString(),
            updatedAt: historyData.updatedAt || new Date().toISOString()
          })
        }
      }

      console.log(`✅ RedisBalanceRepository: Retrieved ${history.length} balance history entries for user ${userId}`)
      return history
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to get balance history for user ${userId}:`, error)
      return []
    }
  }

  /**
   * Freeze balance amount
   * @param userId - User ID
   * @param amount - Amount to freeze
   * @param reason - Reason for freezing
   * @returns Promise with freeze success status
   */
  async freezeBalance(userId: string, amount: number, reason: string): Promise<boolean> {
    try {
      console.log(`🧊 RedisBalanceRepository: Freezing ${amount} balance for user ${userId}, reason: ${reason}`)
      
      const frozenKey = this.getFrozenBalanceKey(userId)
      const currentFrozen = await this.getFrozenAmount(userId)
      const newFrozenAmount = currentFrozen + amount

      await this.redis.hset(frozenKey, 'amount', newFrozenAmount.toString())
      await this.redis.hset(frozenKey, 'reason', reason)
      await this.redis.hset(frozenKey, 'updatedAt', new Date().toISOString())

      console.log(`✅ RedisBalanceRepository: Froze ${amount} balance for user ${userId}, total frozen: ${newFrozenAmount}`)
      return true
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to freeze balance for user ${userId}:`, error)
      return false
    }
  }

  /**
   * Unfreeze balance amount
   * @param userId - User ID
   * @param amount - Amount to unfreeze
   * @returns Promise with unfreeze success status
   */
  async unfreezeBalance(userId: string, amount: number): Promise<boolean> {
    try {
      console.log(`🔥 RedisBalanceRepository: Unfreezing ${amount} balance for user ${userId}`)
      
      const frozenKey = this.getFrozenBalanceKey(userId)
      const currentFrozen = await this.getFrozenAmount(userId)
      
      if (currentFrozen < amount) {
        throw new Error('Cannot unfreeze more than frozen amount')
      }

      const newFrozenAmount = currentFrozen - amount

      if (newFrozenAmount === 0) {
        await this.redis.delete(frozenKey)
      } else {
        await this.redis.hset(frozenKey, 'amount', newFrozenAmount.toString())
        await this.redis.hset(frozenKey, 'updatedAt', new Date().toISOString())
      }

      console.log(`✅ RedisBalanceRepository: Unfroze ${amount} balance for user ${userId}, remaining frozen: ${newFrozenAmount}`)
      return true
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to unfreeze balance for user ${userId}:`, error)
      return false
    }
  }

  /**
   * Get frozen balance amount
   * @param userId - User ID
   * @returns Promise with frozen amount
   */
  private async getFrozenAmount(userId: string): Promise<number> {
    try {
      const frozenKey = this.getFrozenBalanceKey(userId)
      const frozenData = await this.redis.hget(frozenKey, 'amount')
      return frozenData ? parseFloat(frozenData) : 0
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to get frozen amount for user ${userId}:`, error)
      return 0
    }
  }

  /**
   * Add balance record to history
   * @param userId - User ID
   * @param balance - Balance record
   * @param transactionId - Associated transaction ID
   */
  private async addToBalanceHistory(userId: string, balance: Balance, transactionId: string): Promise<void> {
    try {
      const historyKey = `${this.getBalanceHistoryKey(userId)}:${Date.now()}`
      
      await this.redis.hset(historyKey, 'id', balance.id || `balance_${userId}`)
      await this.redis.hset(historyKey, 'userId', userId)
      await this.redis.hset(historyKey, 'amount', balance.amount.toString())
      await this.redis.hset(historyKey, 'currency', balance.currency)
      await this.redis.hset(historyKey, 'lastUpdated', balance.lastUpdated)
      await this.redis.hset(historyKey, 'createdAt', balance.createdAt || new Date().toISOString())
      await this.redis.hset(historyKey, 'updatedAt', balance.updatedAt || new Date().toISOString())

      // Set expiry for history records (30 days)
      await this.redis.expire(historyKey, 30 * 24 * 60 * 60)

      console.log(`📚 RedisBalanceRepository: Added balance history entry for user ${userId}`)
    } catch (error) {
      console.error(`❌ RedisBalanceRepository: Failed to add balance history for user ${userId}:`, error)
    }
  }
}