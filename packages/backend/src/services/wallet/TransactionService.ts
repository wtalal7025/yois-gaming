/**
 * Transaction Service
 * Handles all transaction operations including creation, updates,
 * status management, and history retrieval
 */

import type {
  Transaction,
  CreateTransactionRequest,
  TransactionFilter,
  TransactionHistory,
  TransactionType,
  TransactionStatus
} from '@yois-games/shared'

import {
  TransactionTypeEnum,
  TransactionStatusEnum
} from '@yois-games/shared'

// Reason: Interface for database operations, will be implemented with actual DB later
interface TransactionRepository {
  create(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction>
  findById(id: string): Promise<Transaction | null>
  findByUserId(userId: string, limit?: number, offset?: number): Promise<Transaction[]>
  update(id: string, updates: Partial<Transaction>): Promise<Transaction | null>
  delete(id: string): Promise<boolean>
  findByFilter(filter: TransactionFilter): Promise<Transaction[]>
  getTransactionHistory(userId: string, filter?: TransactionFilter): Promise<TransactionHistory>
  getTransactionsByGameRound(gameRoundId: string): Promise<Transaction[]>
  findPendingTransactions(userId: string): Promise<Transaction[]>
  countTransactionsByType(userId: string, type: TransactionType): Promise<number>
  getTotalAmountByType(userId: string, type: TransactionType, from?: Date, to?: Date): Promise<number>
}

export class TransactionService {
  private transactionRepository: TransactionRepository

  constructor(transactionRepository: TransactionRepository) {
    this.transactionRepository = transactionRepository
  }

  /**
   * Create a new transaction
   * @param request - Transaction creation request
   * @returns Promise with created transaction
   */
  async createTransaction(request: CreateTransactionRequest): Promise<Transaction> {
    try {
      // Validate transaction data
      if (!request.userId) {
        throw new Error('User ID is required')
      }

      if (!request.type) {
        throw new Error('Transaction type is required')
      }

      if (request.amount === 0) {
        throw new Error('Transaction amount cannot be zero')
      }

      if (!request.currency) {
        throw new Error('Currency is required')
      }

      // Set default values
      const transactionData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> = {
        userId: request.userId,
        type: request.type,
        amount: request.amount,
        currency: 'USD', // Default currency - could be made configurable or passed in request
        balanceBefore: 0, // Will be set by balance service
        balanceAfter: 0, // Will be set by balance service
        status: request.status || TransactionStatusEnum.PENDING,
        processedAt: new Date().toISOString(),
        metadata: request.metadata || {},
      }

      const transaction = await this.transactionRepository.create(transactionData)
      return transaction

    } catch (error) {
      throw new Error(`Failed to create transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get transaction by ID
   * @param transactionId - Transaction ID
   * @returns Promise with transaction or null
   */
  async getTransactionById(transactionId: string): Promise<Transaction | null> {
    try {
      return await this.transactionRepository.findById(transactionId)
    } catch (error) {
      throw new Error(`Failed to get transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get user transactions with pagination
   * @param userId - User ID
   * @param limit - Number of transactions to return
   * @param offset - Number of transactions to skip
   * @returns Promise with transactions array
   */
  async getUserTransactions(userId: string, limit: number = 50, offset: number = 0): Promise<Transaction[]> {
    try {
      if (limit > 100) {
        throw new Error('Maximum limit is 100 transactions')
      }

      return await this.transactionRepository.findByUserId(userId, limit, offset)
    } catch (error) {
      throw new Error(`Failed to get user transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Update transaction status
   * @param transactionId - Transaction ID
   * @param status - New transaction status
   * @param metadata - Additional metadata to merge
   * @returns Promise with updated transaction or null
   */
  async updateTransactionStatus(
    transactionId: string,
    status: TransactionStatus,
    metadata?: Record<string, any>
  ): Promise<Transaction | null> {
    try {
      const transaction = await this.transactionRepository.findById(transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      // Validate status transitions
      if (!this.isValidStatusTransition(transaction.status, status)) {
        throw new Error(`Invalid status transition from ${transaction.status} to ${status}`)
      }

      const updates: Partial<Transaction> = {
        status
      }

      // Merge metadata if provided
      if (metadata) {
        updates.metadata = {
          ...transaction.metadata,
          ...metadata
        }
      }

      return await this.transactionRepository.update(transactionId, updates)
    } catch (error) {
      throw new Error(`Failed to update transaction status: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get transactions by filter
   * @param filter - Transaction filter criteria
   * @returns Promise with filtered transactions
   */
  async getTransactionsByFilter(filter: TransactionFilter): Promise<Transaction[]> {
    try {
      return await this.transactionRepository.findByFilter(filter)
    } catch (error) {
      throw new Error(`Failed to get filtered transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get transaction history for a user
   * @param userId - User ID
   * @param filter - Optional filter criteria
   * @returns Promise with transaction history
   */
  async getTransactionHistory(userId: string, filter?: TransactionFilter): Promise<TransactionHistory> {
    try {
      return await this.transactionRepository.getTransactionHistory(userId, filter)
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get all transactions for a specific game round
   * @param gameRoundId - Game round ID
   * @returns Promise with transactions array
   */
  async getGameRoundTransactions(gameRoundId: string): Promise<Transaction[]> {
    try {
      return await this.transactionRepository.getTransactionsByGameRound(gameRoundId)
    } catch (error) {
      throw new Error(`Failed to get game round transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get pending transactions for a user
   * @param userId - User ID
   * @returns Promise with pending transactions
   */
  async getPendingTransactions(userId: string): Promise<Transaction[]> {
    try {
      return await this.transactionRepository.findPendingTransactions(userId)
    } catch (error) {
      throw new Error(`Failed to get pending transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Cancel a pending transaction
   * @param transactionId - Transaction ID
   * @returns Promise with cancelled transaction or null
   */
  async cancelTransaction(transactionId: string): Promise<Transaction | null> {
    try {
      const transaction = await this.transactionRepository.findById(transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      if (transaction.status !== TransactionStatusEnum.PENDING) {
        throw new Error('Can only cancel pending transactions')
      }

      return await this.transactionRepository.update(transactionId, {
        status: TransactionStatusEnum.CANCELLED,
        metadata: {
          ...transaction.metadata,
          cancelledAt: new Date().toISOString(),
          cancelReason: 'Manual cancellation'
        }
      })
    } catch (error) {
      throw new Error(`Failed to cancel transaction: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Get transaction statistics for a user
   * @param userId - User ID
   * @param type - Transaction type to filter by
   * @param fromDate - Start date for statistics
   * @param toDate - End date for statistics
   * @returns Promise with statistics
   */
  async getTransactionStats(
    userId: string,
    type?: TransactionType,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{
    count: number
    totalAmount: number
    averageAmount: number
  }> {
    try {
      if (type) {
        const count = await this.transactionRepository.countTransactionsByType(userId, type)
        const totalAmount = await this.transactionRepository.getTotalAmountByType(userId, type, fromDate, toDate)
        const averageAmount = count > 0 ? totalAmount / count : 0

        return { count, totalAmount, averageAmount }
      } else {
        // Get stats for all transaction types
        const allTypes = Object.values(TransactionTypeEnum)
        let totalCount = 0
        let totalAmount = 0

        for (const transactionType of allTypes) {
          const count = await this.transactionRepository.countTransactionsByType(userId, transactionType as TransactionType)
          const amount = await this.transactionRepository.getTotalAmountByType(userId, transactionType as TransactionType, fromDate, toDate)

          totalCount += count
          totalAmount += amount
        }

        const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0
        return { count: totalCount, totalAmount, averageAmount }
      }
    } catch (error) {
      throw new Error(`Failed to get transaction statistics: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Validate if a status transition is valid
   * @param currentStatus - Current transaction status
   * @param newStatus - New transaction status
   * @returns Boolean indicating if transition is valid
   */
  private isValidStatusTransition(currentStatus: TransactionStatus, newStatus: TransactionStatus): boolean {
    const validTransitions: Record<TransactionStatus, TransactionStatus[]> = {
      [TransactionStatusEnum.PENDING]: [
        TransactionStatusEnum.COMPLETED as TransactionStatus,
        TransactionStatusEnum.FAILED as TransactionStatus,
        TransactionStatusEnum.CANCELLED as TransactionStatus
      ],
      [TransactionStatusEnum.PROCESSING]: [
        TransactionStatusEnum.COMPLETED as TransactionStatus,
        TransactionStatusEnum.FAILED as TransactionStatus
      ],
      [TransactionStatusEnum.COMPLETED]: [], // Terminal state
      [TransactionStatusEnum.FAILED]: [], // Terminal state
      [TransactionStatusEnum.CANCELLED]: [] // Terminal state
    } as any

    return validTransitions[currentStatus]?.includes(newStatus) || false
  }

  /**
   * Link transactions (for transfers or related operations)
   * @param transactionId - Main transaction ID
   * @param relatedTransactionId - Related transaction ID
   * @returns Promise with boolean result
   */
  async linkTransactions(transactionId: string, relatedTransactionId: string): Promise<boolean> {
    try {
      const transaction = await this.transactionRepository.findById(transactionId)
      if (!transaction) {
        throw new Error('Transaction not found')
      }

      const relatedTransaction = await this.transactionRepository.findById(relatedTransactionId)
      if (!relatedTransaction) {
        throw new Error('Related transaction not found')
      }

      // Update both transactions to reference each other
      await this.transactionRepository.update(transactionId, {
      })

      await this.transactionRepository.update(relatedTransactionId, {
      })

      return true
    } catch (error) {
      throw new Error(`Failed to link transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Bulk update transactions (for batch operations)
   * @param transactionIds - Array of transaction IDs
   * @param updates - Updates to apply to all transactions
   * @returns Promise with number of updated transactions
   */
  async bulkUpdateTransactions(
    transactionIds: string[],
    updates: Partial<Transaction>
  ): Promise<number> {
    try {
      let updatedCount = 0

      for (const transactionId of transactionIds) {
        const updated = await this.transactionRepository.update(transactionId, updates)
        if (updated) {
          updatedCount++
        }
      }

      return updatedCount
    } catch (error) {
      throw new Error(`Failed to bulk update transactions: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}