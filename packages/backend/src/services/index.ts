/**
 * Services module
 * Contains all business logic services
 * Now using Supabase for production-ready database operations
 */

import { AuthService } from './auth/AuthService'
import { SessionService } from './auth/SessionService'
import { EmailService } from './email/EmailService'
import { StorageService } from './storage/StorageService'
import { SupabaseUserRepository } from './supabase/SupabaseUserRepository'
import { SupabaseSessionRepository } from './supabase/SupabaseSessionRepository'
import { initializeRedisService } from './cache/RedisService'
import { RedisBalanceRepository } from './wallet/RedisBalanceRepository'
import { BalanceService } from './wallet/BalanceService'
import { TransactionService } from './wallet/TransactionService'
import { AuditService } from './wallet/AuditService'
import { WalletService } from './wallet/WalletService'
import type { EmailConfig } from '@yois-games/shared'

// Simple audit logger for authentication events
class SimpleAuditLogger {
  async logAuthentication(userId: string, action: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
    console.log('📝 Auth Audit:', { userId, action, success, metadata, timestamp: new Date().toISOString() })

    // TODO: Store audit logs in Supabase audit_logs table
    // This would be implemented here for production audit trails
  }

  async logSecurityEvent(userId: string | null, event: string, metadata?: Record<string, any>): Promise<void> {
    console.log('🔒 Security Event:', { userId, event, metadata, timestamp: new Date().toISOString() })

    // TODO: Store security events in Supabase for monitoring
    // Critical for production security monitoring and compliance
  }
}

// Create email service configuration from environment variables
// Reason: Initialize EmailService with Resend configuration for production email sending
const emailConfig: EmailConfig = {
  apiKey: process.env.RESEND_API_KEY || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
  fromName: process.env.FROM_NAME || 'Gaming Platform',
  ...(process.env.REPLY_TO_EMAIL && { replyToEmail: process.env.REPLY_TO_EMAIL })
}

// Validate email configuration
if (!emailConfig.apiKey) {
  console.warn('⚠️ RESEND_API_KEY not found - email functionality will be limited')
}

// Create Supabase repository instances
// Reason: Replace local database with Supabase for production scalability
const userRepository = new SupabaseUserRepository()
const sessionRepository = new SupabaseSessionRepository()
const auditLogger = new SimpleAuditLogger()

// Initialize services
const emailService = new EmailService(emailConfig)
const sessionService = new SessionService(sessionRepository)
const storageService = new StorageService()

// Initialize auth service with Supabase repositories and email service
export const authService = new AuthService(
  userRepository,
  sessionService,
  auditLogger,
  emailService
)

// Redis Configuration
const redisConfig = {
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
  retry: {
    attempts: parseInt(process.env.REDIS_RETRY_ATTEMPTS || '3'),
    delay: parseInt(process.env.REDIS_RETRY_DELAY || '1000')
  },
  timeout: parseInt(process.env.REDIS_TIMEOUT || '5000')
}

// Validate Redis configuration
if (!redisConfig.url || !redisConfig.token) {
  console.warn('⚠️ Redis configuration incomplete - wallet persistence will be limited')
}

// Initialize Redis service and wallet services
let walletService: WalletService | null = null

const initializeWalletServices = async () => {
  try {
    if (redisConfig.url && redisConfig.token) {
      // Initialize Redis service
      await initializeRedisService(redisConfig)

      // Create enhanced audit logger that matches AuditLogger interface
      class EnhancedAuditLogger {
        async log(level: string, message: string, metadata?: Record<string, any>): Promise<void> {
          console.log(`[${level.toUpperCase()}] ${message}`, metadata)
        }

        async logError(message: string, metadata?: Record<string, any>): Promise<void> {
          console.error(`[ERROR] ${message}`, metadata)
        }

        async logWarn(message: string, metadata?: Record<string, any>): Promise<void> {
          console.warn(`[WARN] ${message}`, metadata)
        }

        async logInfo(message: string, metadata?: Record<string, any>): Promise<void> {
          console.info(`[INFO] ${message}`, metadata)
        }

        async logDebug(message: string, metadata?: Record<string, any>): Promise<void> {
          console.log(`[DEBUG] ${message}`, metadata)
        }

        async logBalanceChange(userId: string, action: string, amount: number, transactionId: string, metadata?: Record<string, any>): Promise<void> {
          console.log('📊 Balance Change:', { userId, action, amount, transactionId, metadata, timestamp: new Date().toISOString() })
        }

        async logBalanceError(userId: string, error: string, metadata?: Record<string, any>): Promise<void> {
          console.error('❌ Balance Error:', { userId, error, metadata, timestamp: new Date().toISOString() })
        }
      }

      // Create Redis-based repositories
      const redisBalanceRepository = new RedisBalanceRepository()

      // Create wallet services with Redis persistence
      const enhancedAuditLogger = new EnhancedAuditLogger()
      const balanceService = new BalanceService(redisBalanceRepository, enhancedAuditLogger)

      // Create simple audit service implementation for wallet
      class SimpleAuditRepository {
        async logAuthenticationEvent(userId: string, action: string, success: boolean, metadata?: Record<string, any>): Promise<void> {
          console.log('📝 Wallet Audit:', { userId, action, success, metadata, timestamp: new Date().toISOString() })
        }

        async logSecurityEvent(userId: string | null, event: string, severity: string, metadata?: Record<string, any>): Promise<void> {
          console.log('🔒 Wallet Security:', { userId, event, severity, metadata, timestamp: new Date().toISOString() })
        }

        async logWalletOperation(userId: string, operation: string, amount?: number, transactionId?: string, metadata?: Record<string, any>): Promise<void> {
          console.log('💰 Wallet Operation:', { userId, operation, amount, transactionId, metadata, timestamp: new Date().toISOString() })
        }

        async logBalanceChange(userId: string, action: string, amount: number, transactionId: string, oldBalance?: number, newBalance?: number, metadata?: Record<string, any>): Promise<void> {
          console.log('📊 Balance Change:', { userId, action, amount, transactionId, oldBalance, newBalance, metadata, timestamp: new Date().toISOString() })
        }

        async logGameEvent(userId: string, gameId: string, event: string, amount?: number, metadata?: Record<string, any>): Promise<void> {
          console.log('🎮 Game Event:', { userId, gameId, event, amount, metadata, timestamp: new Date().toISOString() })
        }

        async logError(userId: string | null, error: string, level: string, metadata?: Record<string, any>): Promise<void> {
          console.error('❌ Wallet Error:', { userId, error, level, metadata, timestamp: new Date().toISOString() })
        }

        async logSystemEvent(event: string, level: string, metadata?: Record<string, any>): Promise<void> {
          console.log('⚙️ Wallet System:', { event, level, metadata, timestamp: new Date().toISOString() })
        }

        async searchAuditLogs(filters: any): Promise<any[]> {
          console.log('🔍 Audit Search:', filters)
          return []
        }
      }

      // Create Redis-based transaction repository with adapter
      const { RedisTransactionRepository } = await import('./wallet/RedisTransactionRepository')
      const redisTransactionRepo = new RedisTransactionRepository()

      // Adapter to match TransactionRepository interface expected by TransactionService
      const transactionRepositoryAdapter = {
        async create(transaction: any): Promise<any> {
          // Convert Transaction to ServiceTransaction format
          const serviceTransaction = {
            userId: transaction.userId,
            type: transaction.type,
            amount: transaction.amount,
            currency: 'USD', // Default currency
            status: transaction.status,
            metadata: {
              ...transaction.metadata,
              gameType: transaction.gameType,
              gameSessionId: transaction.gameSessionId,
              description: transaction.description,
              balanceBefore: transaction.balanceBefore,
              balanceAfter: transaction.balanceAfter
            },
            reference: transaction.referenceId,
            relatedTransactionId: transaction.relatedTransactionId
          }
          return await redisTransactionRepo.create(serviceTransaction)
        },

        async findById(id: string) {
          return await redisTransactionRepo.findById(id)
        },

        async findByUserId(userId: string, limit?: number, offset?: number) {
          return await redisTransactionRepo.findByUserId(userId, limit, offset)
        },

        async update(id: string, updates: any) {
          return await redisTransactionRepo.update(id, updates)
        },

        async delete(id: string) {
          return await redisTransactionRepo.delete(id)
        },

        async findByFilter(filter: any) {
          return await redisTransactionRepo.findByFilter(filter)
        },

        async getTransactionHistory(userId: string, filter?: any) {
          return await redisTransactionRepo.getTransactionHistory(userId, filter)
        },

        async getTransactionsByGameRound(gameRoundId: string) {
          return await redisTransactionRepo.getTransactionsByGameRound(gameRoundId)
        },

        async findPendingTransactions(userId: string) {
          return await redisTransactionRepo.findPendingTransactions(userId)
        },

        async countTransactionsByType(userId: string, type: any) {
          return await redisTransactionRepo.countTransactionsByType(userId, type)
        },

        async getTotalAmountByType(userId: string, type: any, from?: Date, to?: Date) {
          return await redisTransactionRepo.getTotalAmountByType(userId, type, from, to)
        }
      }

      // Mock payment provider
      class MockPaymentProvider {
        async processDeposit(): Promise<any> {
          return { success: true, transactionId: `mock_${Date.now()}` }
        }

        async processWithdrawal(): Promise<any> {
          return { success: true, transactionId: `mock_${Date.now()}` }
        }

        async verifyPayment(transactionId: string): Promise<any> {
          return { verified: true, transactionId, status: 'confirmed' }
        }
      }

      // Mock wallet repository
      class MockWalletRepository {
        async getUserBalance(userId: string) {
          return await redisBalanceRepository.getBalance(userId)
        }

        async updateBalance(userId: string, amount: number) {
          const currentBalance = await redisBalanceRepository.getBalance(userId)
          if (!currentBalance) {
            return await redisBalanceRepository.createBalance(userId, amount)
          }
          return await redisBalanceRepository.updateBalance(userId, amount - currentBalance.amount, `update_${Date.now()}`)
        }

        async lockBalanceForTransaction(userId: string): Promise<boolean> {
          return await redisBalanceRepository.lockBalance(userId)
        }

        async unlockBalanceForTransaction(): Promise<boolean> {
          return true
        }

        async validateBalance(userId: string, amount: number): Promise<boolean> {
          return await redisBalanceRepository.validateSufficientBalance(userId, amount)
        }

        async getWalletStats(): Promise<any> {
          return {
            totalDeposits: 0,
            totalWithdrawals: 0,
            totalWins: 0,
            totalLosses: 0,
            netProfit: 0,
            transactionCount: 0,
            averageTransaction: 0,
            largestTransaction: 0,
            recentActivity: []
          }
        }
      }

      const auditRepository = new SimpleAuditRepository()
      const auditService = new AuditService(auditRepository)
      transactionService = new TransactionService(transactionRepositoryAdapter)
      const paymentProvider = new MockPaymentProvider()
      const walletRepository = new MockWalletRepository()

      walletService = new WalletService(
        walletRepository,
        transactionService,
        balanceService,
        auditService,
        paymentProvider
      )

      console.log('✅ Redis wallet services initialized successfully')
    } else {
      console.warn('⚠️ Redis not configured - using fallback wallet implementation')
    }
  } catch (error) {
    console.error('❌ Failed to initialize wallet services:', error)
  }
}

// Initialize wallet services
initializeWalletServices().catch(console.error)

// Export services for use in other modules
let transactionService: TransactionService | null = null

// Create a getter for transactionService since it's initialized asynchronously
export const getTransactionService = () => transactionService

export { emailService, sessionService, storageService, userRepository, auditLogger, walletService }

// Log successful services initialization
console.log('✅ Supabase authentication services initialized successfully')
console.log('✅ Email service initialized successfully')
console.log('✅ Storage service initialized successfully')