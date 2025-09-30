/**
 * Wallet Service
 * Core wallet operations including balance management,
 * deposits, withdrawals, and transaction coordination
 */

import type {
  Balance,
  Transaction,
  DepositRequest,
  WithdrawalRequest,
  TransferRequest,
  WalletStats
} from '@yois-games/shared'

import {
  TransactionTypeEnum,
  TransactionStatusEnum
} from '@yois-games/shared'

import { TransactionService } from './TransactionService'
import { BalanceService } from './BalanceService'
import { AuditService } from './AuditService'

// Reason: Interface for database operations, will be implemented with actual DB later
interface WalletRepository {
  getUserBalance(userId: string): Promise<Balance | null>
  updateBalance(userId: string, amount: number): Promise<Balance>
  lockBalanceForTransaction(userId: string, transactionId: string): Promise<boolean>
  unlockBalanceForTransaction(transactionId: string): Promise<boolean>
  validateBalance(userId: string, amount: number): Promise<boolean>
  getWalletStats(userId: string): Promise<WalletStats>
}

interface PaymentProvider {
  processDeposit(request: DepositRequest): Promise<{ success: boolean; transactionId?: string; error?: string }>
  processWithdrawal(request: WithdrawalRequest): Promise<{ success: boolean; transactionId?: string; error?: string }>
  verifyPayment(transactionId: string): Promise<{ verified: boolean; amount?: number; status?: string }>
}

export class WalletService {
  private walletRepository: WalletRepository
  private transactionService: TransactionService
  private balanceService: BalanceService
  private auditService: AuditService
  private paymentProvider: PaymentProvider

  constructor(
    walletRepository: WalletRepository,
    transactionService: TransactionService,
    balanceService: BalanceService,
    auditService: AuditService,
    paymentProvider: PaymentProvider
  ) {
    this.walletRepository = walletRepository
    this.transactionService = transactionService
    this.balanceService = balanceService
    this.auditService = auditService
    this.paymentProvider = paymentProvider
  }

  /**
   * Get user's current balance
   * @param userId - User ID
   * @returns Promise with user balance
   */
  async getBalance(userId: string): Promise<Balance> {
    try {
      const balance = await this.walletRepository.getUserBalance(userId)

      if (!balance) {
        // Initialize balance for new user
        return await this.walletRepository.updateBalance(userId, 100.00) // Starting bonus
      }

      return balance
    } catch (error) {
      await this.auditService.logError(userId, 'get_balance_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to retrieve balance')
    }
  }

  /**
   * Process deposit request
   * @param userId - User ID
   * @param request - Deposit request data
   * @returns Promise with transaction result
   */
  async processDeposit(userId: string, request: DepositRequest): Promise<Transaction> {
    try {
      // Validate deposit amount
      if (request.amount <= 0) {
        throw new Error('Deposit amount must be greater than zero')
      }

      if (request.amount < 1.00) {
        throw new Error('Minimum deposit amount is $1.00')
      }

      if (request.amount > 10000.00) {
        throw new Error('Maximum deposit amount is $10,000.00')
      }

      // Create pending transaction
      const transaction = await this.transactionService.createTransaction({
        userId,
        type: TransactionTypeEnum.DEPOSIT,
        amount: request.amount,
        currency: 'USD',
        status: TransactionStatusEnum.PENDING,
        metadata: {
          paymentMethod: request.paymentMethod,
          paymentDetails: request.paymentDetails
        }
      })

      await this.auditService.logWalletOperation(userId, 'deposit_initiated', {
        transactionId: transaction.id,
        amount: request.amount,
        paymentMethod: request.paymentMethod
      })

      // Process payment through provider (mock for demo)
      const paymentResult = await this.paymentProvider.processDeposit(request)

      if (paymentResult.success) {
        // Update transaction status
        const completedTransaction = await this.transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatusEnum.COMPLETED,
          { providerTransactionId: paymentResult.transactionId }
        )

        // Update user balance
        await this.balanceService.addBalance(userId, request.amount, transaction.id)

        await this.auditService.logWalletOperation(userId, 'deposit_completed', {
          transactionId: transaction.id,
          amount: request.amount
        })

        return completedTransaction!
      } else {
        // Update transaction status to failed
        const failedTransaction = await this.transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatusEnum.FAILED,
          { error: paymentResult.error }
        )

        await this.auditService.logWalletOperation(userId, 'deposit_failed', {
          transactionId: transaction.id,
          amount: request.amount,
          error: paymentResult.error
        })

        throw new Error(paymentResult.error || 'Deposit failed')
      }

    } catch (error) {
      await this.auditService.logError(userId, 'deposit_error', {
        amount: request.amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process withdrawal request
   * @param userId - User ID
   * @param request - Withdrawal request data
   * @returns Promise with transaction result
   */
  async processWithdrawal(userId: string, request: WithdrawalRequest): Promise<Transaction> {
    try {
      // Validate withdrawal amount
      if (request.amount <= 0) {
        throw new Error('Withdrawal amount must be greater than zero')
      }

      if (request.amount < 10.00) {
        throw new Error('Minimum withdrawal amount is $10.00')
      }

      // Check balance availability
      const hasBalance = await this.walletRepository.validateBalance(userId, request.amount)
      if (!hasBalance) {
        throw new Error('Insufficient balance')
      }

      // Create pending transaction
      const transaction = await this.transactionService.createTransaction({
        userId,
        type: TransactionTypeEnum.WITHDRAWAL,
        amount: request.amount,
        currency: 'USD',
        status: TransactionStatusEnum.PENDING,
        metadata: {
          withdrawalMethod: request.withdrawalMethod,
          withdrawalDetails: request.withdrawalDetails
        }
      })

      // Lock balance for withdrawal
      const locked = await this.walletRepository.lockBalanceForTransaction(userId, transaction.id)
      if (!locked) {
        await this.transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatusEnum.FAILED,
          { error: 'Failed to lock balance' }
        )
        throw new Error('Unable to process withdrawal at this time')
      }

      await this.auditService.logWalletOperation(userId, 'withdrawal_initiated', {
        transactionId: transaction.id,
        amount: request.amount,
        withdrawalMethod: request.withdrawalMethod
      })

      // Deduct balance first (to prevent double spending)
      await this.balanceService.deductBalance(userId, request.amount, transaction.id)

      // Process withdrawal through provider (mock for demo)
      const paymentResult = await this.paymentProvider.processWithdrawal(request)

      if (paymentResult.success) {
        // Complete transaction
        const completedTransaction = await this.transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatusEnum.COMPLETED,
          { providerTransactionId: paymentResult.transactionId }
        )

        // Unlock balance
        await this.walletRepository.unlockBalanceForTransaction(transaction.id)

        await this.auditService.logWalletOperation(userId, 'withdrawal_completed', {
          transactionId: transaction.id,
          amount: request.amount
        })

        return completedTransaction!
      } else {
        // Refund balance on failed withdrawal
        await this.balanceService.addBalance(userId, request.amount, transaction.id)

        // Update transaction status
        await this.transactionService.updateTransactionStatus(
          transaction.id,
          TransactionStatusEnum.FAILED,
          { error: paymentResult.error }
        )

        // Unlock balance
        await this.walletRepository.unlockBalanceForTransaction(transaction.id)

        await this.auditService.logWalletOperation(userId, 'withdrawal_failed', {
          transactionId: transaction.id,
          amount: request.amount,
          error: paymentResult.error
        })

        throw new Error(paymentResult.error || 'Withdrawal failed')
      }

    } catch (error) {
      await this.auditService.logError(userId, 'withdrawal_error', {
        amount: request.amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process game bet transaction
   * @param userId - User ID
   * @param amount - Bet amount
   * @param gameId - Game identifier
   * @param gameRoundId - Game round identifier
   * @returns Promise with transaction result
   */
  async processBet(userId: string, amount: number, gameId: string, gameRoundId: string): Promise<Transaction> {
    try {
      if (amount <= 0) {
        throw new Error('Bet amount must be greater than zero')
      }

      // Check balance availability
      const hasBalance = await this.walletRepository.validateBalance(userId, amount)
      if (!hasBalance) {
        throw new Error('Insufficient balance')
      }

      // Create bet transaction
      const transaction = await this.transactionService.createTransaction({
        userId,
        type: TransactionTypeEnum.BET,
        amount: -amount, // Negative for deduction
        currency: 'USD',
        status: TransactionStatusEnum.COMPLETED,
        metadata: {
          gameId,
          gameRoundId
        }
      })

      // Deduct balance
      await this.balanceService.deductBalance(userId, amount, transaction.id)

      await this.auditService.logWalletOperation(userId, 'bet_placed', {
        transactionId: transaction.id,
        amount,
        gameId,
        gameRoundId
      })

      return transaction

    } catch (error) {
      await this.auditService.logError(userId, 'bet_error', {
        amount,
        gameId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Process game win transaction
   * @param userId - User ID
   * @param amount - Win amount
   * @param gameId - Game identifier
   * @param gameRoundId - Game round identifier
   * @returns Promise with transaction result
   */
  async processWin(userId: string, amount: number, gameId: string, gameRoundId: string): Promise<Transaction> {
    try {
      if (amount <= 0) {
        throw new Error('Win amount must be greater than zero')
      }

      // Create win transaction
      const transaction = await this.transactionService.createTransaction({
        userId,
        type: TransactionTypeEnum.WIN,
        amount: amount, // Positive for addition
        currency: 'USD',
        status: TransactionStatusEnum.COMPLETED,
        metadata: {
          gameId,
          gameRoundId
        }
      })

      // Add balance
      await this.balanceService.addBalance(userId, amount, transaction.id)

      await this.auditService.logWalletOperation(userId, 'win_credited', {
        transactionId: transaction.id,
        amount,
        gameId,
        gameRoundId
      })

      return transaction

    } catch (error) {
      await this.auditService.logError(userId, 'win_error', {
        amount,
        gameId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Transfer between users (for future features like tipping)
   * @param fromUserId - Sender user ID
   * @param toUserId - Recipient user ID
   * @param request - Transfer request
   * @returns Promise with transaction results
   */
  async processTransfer(fromUserId: string, toUserId: string, request: TransferRequest): Promise<{
    debitTransaction: Transaction;
    creditTransaction: Transaction
  }> {
    try {
      if (request.amount <= 0) {
        throw new Error('Transfer amount must be greater than zero')
      }

      if (fromUserId === toUserId) {
        throw new Error('Cannot transfer to the same account')
      }

      // Check sender balance
      const hasBalance = await this.walletRepository.validateBalance(fromUserId, request.amount)
      if (!hasBalance) {
        throw new Error('Insufficient balance')
      }

      // Create debit transaction for sender
      const debitTransaction = await this.transactionService.createTransaction({
        userId: fromUserId,
        type: TransactionTypeEnum.TRANSFER_OUT,
        amount: -request.amount,
        currency: 'USD',
        status: TransactionStatusEnum.COMPLETED,
        metadata: {
          recipientId: toUserId,
          description: request.description
        }
      })

      // Create credit transaction for recipient
      const creditTransaction = await this.transactionService.createTransaction({
        userId: toUserId,
        type: TransactionTypeEnum.TRANSFER_IN,
        amount: request.amount,
        currency: 'USD',
        status: TransactionStatusEnum.COMPLETED,
        metadata: {
          senderId: fromUserId,
          description: request.description
        }
      })

      // Process balance updates atomically
      await this.balanceService.deductBalance(fromUserId, request.amount, debitTransaction.id)
      await this.balanceService.addBalance(toUserId, request.amount, creditTransaction.id)

      await this.auditService.logWalletOperation(fromUserId, 'transfer_sent', {
        transactionId: debitTransaction.id,
        amount: request.amount,
        recipientId: toUserId
      })

      await this.auditService.logWalletOperation(toUserId, 'transfer_received', {
        transactionId: creditTransaction.id,
        amount: request.amount,
        senderId: fromUserId
      })

      return { debitTransaction, creditTransaction }

    } catch (error) {
      await this.auditService.logError(fromUserId, 'transfer_error', {
        amount: request.amount,
        recipientId: toUserId,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get wallet statistics for user
   * @param userId - User ID
   * @returns Promise with wallet statistics
   */
  async getWalletStats(userId: string): Promise<WalletStats> {
    try {
      return await this.walletRepository.getWalletStats(userId)
    } catch (error) {
      await this.auditService.logError(userId, 'wallet_stats_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw new Error('Failed to retrieve wallet statistics')
    }
  }

  /**
   * Validate if user has sufficient balance
   * @param userId - User ID
   * @param amount - Amount to validate
   * @returns Promise with validation result
   */
  async validateBalance(userId: string, amount: number): Promise<boolean> {
    try {
      return await this.walletRepository.validateBalance(userId, amount)
    } catch (error) {
      await this.auditService.logError(userId, 'balance_validation_error', {
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }
}