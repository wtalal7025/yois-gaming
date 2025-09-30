/**
 * Redis Transaction Repository
 * Persistent transaction storage using Upstash Redis
 * Implements the TransactionRepository interface for TransactionService
 */

import { getRedisService } from '../cache/RedisService'
import type { Transaction, TransactionType, TransactionStatus, TransactionFilter, TransactionHistory } from '@yois-games/shared'

// Internal transaction type that matches what TransactionService expects
interface ServiceTransaction {
  id: string
  userId: string
  type: TransactionType
  amount: number
  currency: string
  status: TransactionStatus
  metadata?: Record<string, any>
  reference?: string
  relatedTransactionId?: string
  createdAt: string
  updatedAt: string
}

export class RedisTransactionRepository {
  private readonly keyPrefix = 'transaction'
  private readonly userTransactionsPrefix = 'user_transactions'
  private readonly gameTransactionsPrefix = 'game_transactions'

  /**
   * Get Redis service instance
   */
  private getRedis() {
    return getRedisService()
  }

  /**
   * Generate Redis key for a transaction
   */
  private getTransactionKey(id: string): string {
    return `${this.keyPrefix}:${id}`
  }

  /**
   * Generate Redis key for user transactions list
   */
  private getUserTransactionsKey(userId: string): string {
    return `${this.userTransactionsPrefix}:${userId}`
  }

  /**
   * Generate Redis key for game round transactions list
   */
  private getGameTransactionsKey(gameRoundId: string): string {
    return `${this.gameTransactionsPrefix}:${gameRoundId}`
  }

  /**
   * Convert internal service transaction to shared Transaction type
   */
  private toSharedTransaction(serviceTransaction: ServiceTransaction): Transaction {
    return {
      id: serviceTransaction.id,
      userId: serviceTransaction.userId,
      type: serviceTransaction.type,
      amount: serviceTransaction.amount,
      balanceBefore: (serviceTransaction.metadata?.balanceBefore as number) || 0,
      balanceAfter: (serviceTransaction.metadata?.balanceAfter as number) || 0,
      gameType: serviceTransaction.metadata?.gameType as string,
      gameSessionId: serviceTransaction.metadata?.gameSessionId as string,
      referenceId: serviceTransaction.reference || '',
      description: serviceTransaction.metadata?.description as string,
      metadata: serviceTransaction.metadata || {},
      status: serviceTransaction.status,
      processedAt: serviceTransaction.updatedAt,
      createdAt: serviceTransaction.createdAt
    }
  }

  /**
   * Convert shared Transaction to internal service transaction
   */
  private toServiceTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & {
    currency?: string,
    reference?: string,
    relatedTransactionId?: string
  }): Omit<ServiceTransaction, 'id' | 'createdAt' | 'updatedAt'> {
    const result: any = {
      userId: transaction.userId,
      type: transaction.type,
      amount: transaction.amount,
      currency: transaction.currency || 'USD',
      status: transaction.status,
      metadata: {
        ...transaction.metadata,
        gameType: transaction.gameType,
        gameSessionId: transaction.gameSessionId,
        description: transaction.description,
        balanceBefore: transaction.balanceBefore,
        balanceAfter: transaction.balanceAfter
      }
    }

    // Only include optional properties if they have values
    const reference = transaction.referenceId || transaction.reference
    if (reference) {
      result.reference = reference
    }

    if (transaction.relatedTransactionId) {
      result.relatedTransactionId = transaction.relatedTransactionId
    }

    return result as Omit<ServiceTransaction, 'id' | 'createdAt' | 'updatedAt'>
  }

  /**
   * Create a new transaction
   */
  async create(transactionData: Omit<ServiceTransaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    try {
      const id = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()

      const transaction: ServiceTransaction = {
        ...transactionData,
        id,
        createdAt: now,
        updatedAt: now
      }

      const redis = this.getRedis()

      // Store transaction
      await redis.set(this.getTransactionKey(id), JSON.stringify(transaction))

      // Add to user's transaction list
      const userKey = this.getUserTransactionsKey(transaction.userId)
      await redis.lPush(userKey, id)

      // Add to game transaction list if gameSessionId exists
      const gameSessionId = transaction.metadata?.gameSessionId
      if (gameSessionId) {
        const gameKey = this.getGameTransactionsKey(gameSessionId as string)
        await redis.lPush(gameKey, id)
      }

      // Set expiry for lists (90 days)
      await redis.expire(userKey, 90 * 24 * 60 * 60)
      if (gameSessionId) {
        await redis.expire(this.getGameTransactionsKey(gameSessionId as string), 90 * 24 * 60 * 60)
      }

      return this.toSharedTransaction(transaction)
    } catch (error) {
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Find transaction by ID
   */
  async findById(id: string): Promise<Transaction | null> {
    try {
      const redis = this.getRedis()
      const data = await redis.get(this.getTransactionKey(id))
      if (!data) return null

      const transaction: ServiceTransaction = JSON.parse(data as string)
      return this.toSharedTransaction(transaction)
    } catch (error) {
      console.error('Failed to find transaction by ID:', error)
      return null
    }
  }

  /**
   * Find transactions by user ID with pagination
   */
  async findByUserId(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    try {
      const redis = this.getRedis()
      const userKey = this.getUserTransactionsKey(userId)
      const transactionIds = await redis.lRange(userKey, offset, offset + limit - 1)

      if (!transactionIds.length) return []

      const transactions: Transaction[] = []
      for (const id of transactionIds) {
        const transaction = await this.findById(id as string)
        if (transaction) {
          transactions.push(transaction)
        }
      }

      return transactions
    } catch (error) {
      console.error('Failed to find transactions by user ID:', error)
      return []
    }
  }

  /**
   * Update transaction
   */
  async update(id: string, updates: Partial<ServiceTransaction>): Promise<Transaction | null> {
    try {
      const redis = this.getRedis()
      const existing = await redis.get(this.getTransactionKey(id))
      if (!existing) return null

      const transaction: ServiceTransaction = JSON.parse(existing as string)
      const updated: ServiceTransaction = {
        ...transaction,
        ...updates,
        updatedAt: new Date().toISOString()
      }

      await redis.set(this.getTransactionKey(id), JSON.stringify(updated))
      return this.toSharedTransaction(updated)
    } catch (error) {
      console.error('Failed to update transaction:', error)
      return null
    }
  }

  /**
   * Delete transaction
   */
  async delete(id: string): Promise<boolean> {
    try {
      const redis = this.getRedis()

      // Get transaction to find userId for cleanup
      const existing = await redis.get(this.getTransactionKey(id))
      if (!existing) return false

      const transaction: ServiceTransaction = JSON.parse(existing as string)

      // Delete transaction
      await redis.del(this.getTransactionKey(id))

      // Remove from user list
      const userKey = this.getUserTransactionsKey(transaction.userId)
      await redis.lRem(userKey, 0, id)

      // Remove from game list if exists
      const gameSessionId = transaction.metadata?.gameSessionId
      if (gameSessionId) {
        const gameKey = this.getGameTransactionsKey(gameSessionId as string)
        await redis.lRem(gameKey, 0, id)
      }

      return true
    } catch (error) {
      console.error('Failed to delete transaction:', error)
      return false
    }
  }

  /**
   * Find transactions by filter (simplified implementation)
   */
  async findByFilter(filter: TransactionFilter): Promise<Transaction[]> {
    try {
      if (!filter.userId) return []

      // Get all user transactions
      const allTransactions = await this.findByUserId(filter.userId, filter.limit || 100, filter.offset || 0)

      // Apply filters
      let filtered = allTransactions

      if (filter.type) {
        const types = Array.isArray(filter.type) ? filter.type : [filter.type]
        filtered = filtered.filter(tx => types.includes(tx.type))
      }

      if (filter.status) {
        const statuses = Array.isArray(filter.status) ? filter.status : [filter.status]
        filtered = filtered.filter(tx => statuses.includes(tx.status))
      }

      if (filter.gameType) {
        const gameTypes = Array.isArray(filter.gameType) ? filter.gameType : [filter.gameType]
        filtered = filtered.filter(tx => tx.gameType && gameTypes.includes(tx.gameType))
      }

      if (filter.fromDate) {
        filtered = filtered.filter(tx => tx.createdAt >= filter.fromDate!)
      }

      if (filter.toDate) {
        filtered = filtered.filter(tx => tx.createdAt <= filter.toDate!)
      }

      if (filter.minAmount !== undefined) {
        filtered = filtered.filter(tx => tx.amount >= filter.minAmount!)
      }

      if (filter.maxAmount !== undefined) {
        filtered = filtered.filter(tx => tx.amount <= filter.maxAmount!)
      }

      // Apply sorting
      if (filter.sortBy) {
        filtered.sort((a, b) => {
          const aVal = filter.sortBy === 'amount' ? a.amount :
            filter.sortBy === 'createdAt' ? new Date(a.createdAt).getTime() :
              new Date(a.processedAt).getTime()
          const bVal = filter.sortBy === 'amount' ? b.amount :
            filter.sortBy === 'createdAt' ? new Date(b.createdAt).getTime() :
              new Date(b.processedAt).getTime()

          return filter.sortOrder === 'desc' ? bVal - aVal : aVal - bVal
        })
      }

      return filtered
    } catch (error) {
      console.error('Failed to find transactions by filter:', error)
      return []
    }
  }

  /**
   * Get transaction history for a user
   */
  async getTransactionHistory(userId: string, filter?: TransactionFilter): Promise<TransactionHistory> {
    try {
      const transactions = filter ?
        await this.findByFilter({ ...filter, userId }) :
        await this.findByUserId(userId, 50, 0)

      const total = transactions.length
      const limit = filter?.limit || 50
      const page = Math.floor((filter?.offset || 0) / limit) + 1
      const totalPages = Math.ceil(total / limit)
      const hasMore = page < totalPages

      return {
        transactions,
        total,
        page,
        totalPages,
        hasMore
      }
    } catch (error) {
      console.error('Failed to get transaction history:', error)
      return {
        transactions: [],
        total: 0,
        page: 1,
        totalPages: 1,
        hasMore: false
      }
    }
  }

  /**
   * Get transactions for a game round
   */
  async getTransactionsByGameRound(gameRoundId: string): Promise<Transaction[]> {
    try {
      const redis = this.getRedis()
      const gameKey = this.getGameTransactionsKey(gameRoundId)
      const transactionIds = await redis.lRange(gameKey, 0, -1)

      if (!transactionIds.length) return []

      const transactions: Transaction[] = []
      for (const id of transactionIds) {
        const transaction = await this.findById(id as string)
        if (transaction) {
          transactions.push(transaction)
        }
      }

      return transactions
    } catch (error) {
      console.error('Failed to get transactions by game round:', error)
      return []
    }
  }

  /**
   * Find pending transactions for a user
   */
  async findPendingTransactions(userId: string): Promise<Transaction[]> {
    try {
      const allTransactions = await this.findByUserId(userId, 100, 0)
      return allTransactions.filter(tx => tx.status === 'pending')
    } catch (error) {
      console.error('Failed to find pending transactions:', error)
      return []
    }
  }

  /**
   * Count transactions by type for a user
   */
  async countTransactionsByType(userId: string, type: TransactionType): Promise<number> {
    try {
      const transactions = await this.findByUserId(userId, 1000, 0) // Get more transactions for counting
      return transactions.filter(tx => tx.type === type).length
    } catch (error) {
      console.error('Failed to count transactions by type:', error)
      return 0
    }
  }

  /**
   * Get total amount by transaction type for a user
   */
  async getTotalAmountByType(userId: string, type: TransactionType, from?: Date, to?: Date): Promise<number> {
    try {
      const transactions = await this.findByUserId(userId, 1000, 0) // Get more transactions for calculation
      let filtered = transactions.filter(tx => tx.type === type)

      if (from) {
        filtered = filtered.filter(tx => new Date(tx.createdAt) >= from)
      }

      if (to) {
        filtered = filtered.filter(tx => new Date(tx.createdAt) <= to)
      }

      return filtered.reduce((total, tx) => total + tx.amount, 0)
    } catch (error) {
      console.error('Failed to get total amount by type:', error)
      return 0
    }
  }
}