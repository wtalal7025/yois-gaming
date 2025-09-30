/**
 * Withdrawal Management Route
 * Handles withdrawal requests, payment processing, and withdrawal history
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { WithdrawRequest } from '@yois-games/shared'
import { WalletService } from '../../services/wallet/WalletService'

// Validation schema for withdrawal request
const withdrawRequestSchema = z.object({
  amount: z.number()
    .min(10.00, 'Minimum withdrawal amount is $10.00')
    .max(50000.00, 'Maximum withdrawal amount is $50,000.00'),
  paymentMethod: z.string()
    .min(1, 'Payment method is required'),
  paymentDetails: z.object({
    // Bank account details
    bankAccount: z.string().optional(),
    routingNumber: z.string().optional(),
    accountHolderName: z.string().optional(),
    swiftCode: z.string().optional(),
    bankName: z.string().optional(),
    bankAddress: z.string().optional(),
    // Crypto withdrawal details
    walletAddress: z.string().optional(),
    currency: z.string().optional(),
    network: z.string().optional(),
    // E-wallet details
    email: z.string().email().optional(),
    accountId: z.string().optional()
  }).optional()
})

interface WithdrawRouteContext {
  walletService: WalletService
}

// Middleware to extract user from JWT token
async function authenticateUser(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return reply.status(401).send({
      success: false,
      error: 'Authorization token required'
    })
  }

  // In production, verify JWT token and extract user info
  const token = authHeader.substring(7)
    // const user = await verifyAccessToken(token)
    // request.user = user

    // For now, simulate authenticated user
    (request as any).user = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com'
  }
}

export async function withdrawRoutes(
  fastify: FastifyInstance,
  context: WithdrawRouteContext
) {
  const { walletService } = context

  /**
   * POST /wallet/withdraw
   * Process a withdrawal request
   */
  fastify.post<{
    Body: WithdrawRequest
    Reply: {
      success: boolean
      transaction?: any
      estimatedProcessingTime?: string
      fees?: number
      error?: string
    }
  }>('/withdraw', {
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['amount', 'paymentMethod'],
        properties: {
          amount: {
            type: 'number',
            minimum: 10.00,
            maximum: 50000.00
          },
          paymentMethod: {
            type: 'string',
            enum: ['bank_transfer', 'crypto', 'paypal', 'skrill']
          },
          paymentDetails: {
            type: 'object',
            properties: {
              bankAccount: { type: 'string' },
              routingNumber: { type: 'string' },
              accountHolderName: { type: 'string' },
              swiftCode: { type: 'string' },
              bankName: { type: 'string' },
              bankAddress: { type: 'string' },
              walletAddress: { type: 'string' },
              currency: { type: 'string' },
              network: { type: 'string' },
              email: { type: 'string', format: 'email' },
              accountId: { type: 'string' }
            }
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transaction: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                status: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' }
              }
            },
            estimatedProcessingTime: { type: 'string' },
            fees: { type: 'number' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    },
    preHandler: [authenticateUser, async (request: FastifyRequest, reply: FastifyReply) => {
      // Enhanced security checks for withdrawals
      const clientIp = request.ip

      // In production, implement additional security measures:
      // - Check for suspicious withdrawal patterns
      // - Verify user identity/KYC status
      // - Check withdrawal limits and cooling periods
      // - Implement additional 2FA verification

      fastify.log.info('Withdrawal attempt', {
        ip: clientIp,
        timestamp: new Date().toISOString()
      })
    }]
  }, async (request: FastifyRequest<{ Body: WithdrawRequest }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      // Validate request body
      const validationResult = withdrawRequestSchema.safeParse(request.body)

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))

        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: errors
        })
      }

      const withdrawData = validationResult.data

      // Validate balance availability before processing
      const hasBalance = await walletService.validateBalance(userId, withdrawData.amount)
      if (!hasBalance) {
        return reply.status(400).send({
          success: false,
          error: 'Insufficient balance'
        })
      }

      // Additional validation based on payment method
      if (withdrawData.paymentMethod === 'bank_transfer') {
        if (!withdrawData.paymentDetails?.bankAccount ||
          !withdrawData.paymentDetails?.routingNumber ||
          !withdrawData.paymentDetails?.accountHolderName) {
          return reply.status(400).send({
            success: false,
            error: 'Bank account details are required'
          })
        }
      }

      if (withdrawData.paymentMethod === 'crypto') {
        if (!withdrawData.paymentDetails?.walletAddress ||
          !withdrawData.paymentDetails?.currency) {
          return reply.status(400).send({
            success: false,
            error: 'Crypto wallet address and currency are required'
          })
        }

        // Basic wallet address validation (would be more comprehensive in production)
        const walletAddress = withdrawData.paymentDetails.walletAddress
        if (walletAddress.length < 26 || walletAddress.length > 62) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid wallet address format'
          })
        }
      }

      if (withdrawData.paymentMethod === 'paypal' || withdrawData.paymentMethod === 'skrill') {
        if (!withdrawData.paymentDetails?.email) {
          return reply.status(400).send({
            success: false,
            error: 'Email address is required for e-wallet withdrawals'
          })
        }
      }

      // Calculate fees based on payment method and amount
      let fees = 0
      let processingTime = ''

      switch (withdrawData.paymentMethod) {
        case 'bank_transfer':
          fees = Math.max(5.00, withdrawData.amount * 0.01) // $5 or 1%, whichever is higher
          processingTime = '1-3 business days'
          break

        case 'crypto':
          fees = withdrawData.amount * 0.005 // 0.5%
          processingTime = '30 minutes - 2 hours'
          break

        case 'paypal':
          fees = withdrawData.amount * 0.025 // 2.5%
          processingTime = 'Within 24 hours'
          break

        case 'skrill':
          fees = withdrawData.amount * 0.02 // 2%
          processingTime = 'Within 24 hours'
          break
      }

      // Check if user has enough balance including fees
      const totalAmount = withdrawData.amount + fees
      const hasBalanceWithFees = await walletService.validateBalance(userId, totalAmount)
      if (!hasBalanceWithFees) {
        return reply.status(400).send({
          success: false,
          error: `Insufficient balance. Required: $${totalAmount.toFixed(2)} (including $${fees.toFixed(2)} fees)`
        })
      }

      // Process withdrawal
      const transaction = await walletService.processWithdrawal(userId, withdrawData)

      fastify.log.info('Withdrawal processed', {
        userId,
        transactionId: transaction.id,
        amount: withdrawData.amount,
        fees,
        paymentMethod: withdrawData.paymentMethod,
        timestamp: new Date().toISOString()
      })

      return reply.send({
        success: true,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt
        },
        estimatedProcessingTime: processingTime,
        fees
      })

    } catch (error) {
      fastify.log.error('Withdrawal processing error:', error)

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Insufficient balance')) {
          return reply.status(400).send({
            success: false,
            error: 'Insufficient balance'
          })
        }

        if (error.message.includes('Minimum withdrawal')) {
          return reply.status(400).send({
            success: false,
            error: 'Amount below minimum withdrawal limit'
          })
        }

        if (error.message.includes('Maximum withdrawal')) {
          return reply.status(400).send({
            success: false,
            error: 'Amount exceeds maximum withdrawal limit'
          })
        }

        if (error.message.includes('Withdrawal failed')) {
          return reply.status(400).send({
            success: false,
            error: 'Withdrawal processing failed. Please try again.'
          })
        }
      }

      return reply.status(500).send({
        success: false,
        error: 'Withdrawal processing failed'
      })
    }
  })

  /**
   * GET /wallet/withdraw/methods
   * Get available withdrawal methods
   */
  fastify.get<{
    Reply: {
      success: boolean
      methods?: Array<{
        id: string
        name: string
        type: string
        minAmount: number
        maxAmount: number
        processingTime: string
        feeStructure: string
        isEnabled: boolean
        requirements: string[]
      }>
      error?: string
    }
  }>('/withdraw/methods', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            methods: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  type: { type: 'string' },
                  minAmount: { type: 'number' },
                  maxAmount: { type: 'number' },
                  processingTime: { type: 'string' },
                  feeStructure: { type: 'string' },
                  isEnabled: { type: 'boolean' },
                  requirements: {
                    type: 'array',
                    items: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // In production, this would be fetched from database/config
      const methods = [
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          type: 'bank',
          minAmount: 25.00,
          maxAmount: 50000.00,
          processingTime: '1-3 business days',
          feeStructure: '$5 minimum or 1% of amount',
          isEnabled: true,
          requirements: [
            'Bank account verification',
            'Valid government ID',
            'Proof of address'
          ]
        },
        {
          id: 'crypto',
          name: 'Cryptocurrency',
          type: 'crypto',
          minAmount: 10.00,
          maxAmount: 25000.00,
          processingTime: '30 minutes - 2 hours',
          feeStructure: '0.5% of amount',
          isEnabled: true,
          requirements: [
            'Valid crypto wallet address',
            'Network selection'
          ]
        },
        {
          id: 'paypal',
          name: 'PayPal',
          type: 'e-wallet',
          minAmount: 10.00,
          maxAmount: 10000.00,
          processingTime: 'Within 24 hours',
          feeStructure: '2.5% of amount',
          isEnabled: true,
          requirements: [
            'Verified PayPal account',
            'Email address verification'
          ]
        },
        {
          id: 'skrill',
          name: 'Skrill',
          type: 'e-wallet',
          minAmount: 10.00,
          maxAmount: 15000.00,
          processingTime: 'Within 24 hours',
          feeStructure: '2% of amount',
          isEnabled: true,
          requirements: [
            'Verified Skrill account',
            'Email address verification'
          ]
        }
      ]

      return reply.send({
        success: true,
        methods
      })

    } catch (error) {
      fastify.log.error('Get withdrawal methods error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve withdrawal methods'
      })
    }
  })

  /**
   * GET /wallet/withdraw/limits
   * Get user's withdrawal limits and restrictions
   */
  fastify.get<{
    Reply: {
      success: boolean
      limits?: {
        dailyLimit: number
        weeklyLimit: number
        monthlyLimit: number
        remainingDaily: number
        remainingWeekly: number
        remainingMonthly: number
        minimumAmount: number
        maximumAmount: number
        requiresKYC: boolean
        hasActiveCooldown: boolean
        cooldownEndsAt?: string
      }
      error?: string
    }
  }>('/withdraw/limits', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            limits: {
              type: 'object',
              properties: {
                dailyLimit: { type: 'number' },
                weeklyLimit: { type: 'number' },
                monthlyLimit: { type: 'number' },
                remainingDaily: { type: 'number' },
                remainingWeekly: { type: 'number' },
                remainingMonthly: { type: 'number' },
                minimumAmount: { type: 'number' },
                maximumAmount: { type: 'number' },
                requiresKYC: { type: 'boolean' },
                hasActiveCooldown: { type: 'boolean' },
                cooldownEndsAt: { type: 'string', format: 'date-time', nullable: true }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      // In production, calculate based on user's KYC status, tier, and withdrawal history
      const limits = {
        dailyLimit: 5000.00,
        weeklyLimit: 25000.00,
        monthlyLimit: 100000.00,
        remainingDaily: 5000.00,  // Would be calculated from today's withdrawals
        remainingWeekly: 25000.00, // Would be calculated from this week's withdrawals
        remainingMonthly: 100000.00, // Would be calculated from this month's withdrawals
        minimumAmount: 10.00,
        maximumAmount: 50000.00,
        requiresKYC: false, // Would check user's KYC status
        hasActiveCooldown: false, // Would check for any active withdrawal restrictions
        cooldownEndsAt: null
      }

      return reply.send({
        success: true,
        limits
      })

    } catch (error) {
      fastify.log.error('Get withdrawal limits error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve withdrawal limits'
      })
    }
  })

  /**
   * GET /wallet/withdraw/history
   * Get user's withdrawal history
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number; status?: string }
    Reply: {
      success: boolean
      withdrawals?: any[]
      pagination?: any
      error?: string
    }
  }>('/withdraw/history', {
    schema: {
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 20
          },
          offset: {
            type: 'number',
            minimum: 0,
            default: 0
          },
          status: {
            type: 'string',
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            withdrawals: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
                  fees: { type: 'number' },
                  currency: { type: 'string' },
                  paymentMethod: { type: 'string' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  completedAt: { type: 'string', format: 'date-time', nullable: true }
                }
              }
            },
            pagination: {
              type: 'object',
              properties: {
                limit: { type: 'number' },
                offset: { type: 'number' },
                total: { type: 'number' },
                hasMore: { type: 'boolean' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{
    Querystring: { limit?: number; offset?: number; status?: string }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id
      const { limit = 20, offset = 0, status } = request.query

      // In production, fetch from TransactionService with withdrawal filter
      // For now, return mock data
      const withdrawals: any[] = []

      return reply.send({
        success: true,
        withdrawals,
        pagination: {
          limit,
          offset,
          total: withdrawals.length,
          hasMore: withdrawals.length === limit
        }
      })

    } catch (error) {
      fastify.log.error('Get withdrawal history error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve withdrawal history'
      })
    }
  })

  /**
   * GET /wallet/withdraw/:id/status
   * Get withdrawal status and details
   */
  fastify.get<{
    Params: { id: string }
    Reply: {
      success: boolean
      withdrawal?: {
        id: string
        amount: number
        fees: number
        currency: string
        status: string
        paymentMethod: string
        createdAt: string
        completedAt?: string
        failureReason?: string
        estimatedCompletion?: string
      }
      error?: string
    }
  }>('/withdraw/:id/status', {
    schema: {
      security: [{ bearerAuth: [] }],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            withdrawal: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'number' },
                fees: { type: 'number' },
                currency: { type: 'string' },
                status: { type: 'string' },
                paymentMethod: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                completedAt: { type: 'string', format: 'date-time', nullable: true },
                failureReason: { type: 'string', nullable: true },
                estimatedCompletion: { type: 'string', format: 'date-time', nullable: true }
              }
            }
          }
        },
        404: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id
      const { id } = request.params

      // In production, fetch transaction from TransactionService
      // Verify it belongs to the user and is a withdrawal type

      // For now, return mock data
      const mockWithdrawal = {
        id,
        amount: 500.00,
        fees: 12.50,
        currency: 'USD',
        status: 'processing',
        paymentMethod: 'bank_transfer',
        createdAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      }

      return reply.send({
        success: true,
        withdrawal: mockWithdrawal
      })

    } catch (error) {
      fastify.log.error('Get withdrawal status error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve withdrawal status'
      })
    }
  })
}