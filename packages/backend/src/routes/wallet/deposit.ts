/**
 * Deposit Management Route
 * Handles deposit requests, payment processing, and deposit history
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { DepositRequest } from '@yois-games/shared'
import { WalletService } from '../../services/wallet/WalletService'

// Validation schema for deposit request
const depositRequestSchema = z.object({
  amount: z.number()
    .min(1.00, 'Minimum deposit amount is $1.00')
    .max(10000.00, 'Maximum deposit amount is $10,000.00'),
  paymentMethod: z.string()
    .min(1, 'Payment method is required'),
  paymentDetails: z.object({
    cardNumber: z.string().optional(),
    expiryMonth: z.string().optional(),
    expiryYear: z.string().optional(),
    cvv: z.string().optional(),
    cardholderName: z.string().optional(),
    billingAddress: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional()
    }).optional(),
    // Crypto payment details
    walletAddress: z.string().optional(),
    currency: z.string().optional(),
    // Bank transfer details
    bankAccount: z.string().optional(),
    routingNumber: z.string().optional()
  }).optional()
})

interface DepositRouteContext {
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
  const tokenParts = (authHeader || "").split(" ");
  const token = tokenParts.length > 1 ? String(tokenParts[1]) : "";
  // const user = await verifyAccessToken(token)
  // request.user = user

  // For now, simulate authenticated user
  (request as any).user = {
    id: 'user-123',
    username: 'testuser',
    email: 'test@example.com'
  }
}

export async function depositRoutes(
  fastify: FastifyInstance,
  context: DepositRouteContext
) {
  const { walletService } = context

  /**
   * POST /wallet/deposit
   * Process a deposit request
   */
  fastify.post<{
    Body: DepositRequest
    Reply: {
      success: boolean
      transaction?: any
      paymentUrl?: string
      qrCode?: string
      error?: string
    }
  }>('/deposit', {
    schema: {
      body: {
        type: 'object',
        required: ['amount', 'paymentMethod'],
        properties: {
          amount: {
            type: 'number',
            minimum: 1.00,
            maximum: 10000.00
          },
          paymentMethod: {
            type: 'string',
            enum: ['credit_card', 'debit_card', 'bank_transfer', 'crypto', 'paypal', 'skrill']
          },
          paymentDetails: {
            type: 'object',
            properties: {
              cardNumber: { type: 'string' },
              expiryMonth: { type: 'string' },
              expiryYear: { type: 'string' },
              cvv: { type: 'string' },
              cardholderName: { type: 'string' },
              billingAddress: {
                type: 'object',
                properties: {
                  street: { type: 'string' },
                  city: { type: 'string' },
                  state: { type: 'string' },
                  postalCode: { type: 'string' },
                  country: { type: 'string' }
                }
              },
              walletAddress: { type: 'string' },
              currency: { type: 'string' },
              bankAccount: { type: 'string' },
              routingNumber: { type: 'string' }
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
            paymentUrl: { type: 'string' },
            qrCode: { type: 'string' }
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
      // Rate limiting for deposit attempts
      const clientIp = request.ip

      // In production, implement rate limiting here
      // Log deposit attempt for security monitoring
      fastify.log.info({
        ip: clientIp,
        timestamp: new Date().toISOString()
      }, 'Deposit attempt')
    }]
  }, async (request: FastifyRequest<{ Body: DepositRequest }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      // Validate request body
      const validationResult = depositRequestSchema.safeParse(request.body)

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

      const depositData = validationResult.data

      // Additional validation based on payment method
      if (depositData.paymentMethod === 'credit_card' || depositData.paymentMethod === 'debit_card') {
        if (!depositData.paymentDetails?.cardNumber ||
          !depositData.paymentDetails?.expiryMonth ||
          !depositData.paymentDetails?.expiryYear ||
          !depositData.paymentDetails?.cvv) {
          return reply.status(400).send({
            success: false,
            error: 'Credit/debit card details are required'
          })
        }

        // Basic card number validation (Luhn algorithm would be used in production)
        if (depositData.paymentDetails.cardNumber.length < 13 ||
          depositData.paymentDetails.cardNumber.length > 19) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid card number'
          })
        }
      }

      if (depositData.paymentMethod === 'crypto') {
        if (!depositData.paymentDetails?.walletAddress ||
          !depositData.paymentDetails?.currency) {
          return reply.status(400).send({
            success: false,
            error: 'Crypto wallet address and currency are required'
          })
        }
      }

      // Transform data to match DepositRequest interface from shared types
      const depositRequest = {
        amount: depositData.amount,
        currency: 'USD', // Default currency - could be made configurable
        paymentMethod: {
          id: `${depositData.paymentMethod}_${Date.now()}`, // Generate a unique ID
          type: depositData.paymentMethod as any, // Cast to PaymentMethodType
          name: depositData.paymentMethod.replace('_', ' ').toUpperCase(),
          details: depositData.paymentDetails || {},
          isActive: true,
          isDefault: false
        },
        ...(depositData.paymentDetails && { paymentDetails: depositData.paymentDetails })
      }

      // Process deposit
      const transaction = await walletService.processDeposit(userId, depositRequest)

      // Generate response based on payment method
      let response: any = {
        success: true,
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          currency: transaction.currency,
          status: transaction.status,
          createdAt: transaction.createdAt
        }
      }

      // Add payment-specific data for demo
      switch (depositData.paymentMethod) {
        case 'crypto':
          response.paymentUrl = `crypto://deposit/${transaction.id}`
          response.qrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==` // Placeholder QR code
          break

        case 'paypal':
        case 'skrill':
          response.paymentUrl = `https://demo-payment.example.com/redirect/${transaction.id}`
          break

        case 'bank_transfer':
          response.bankDetails = {
            accountNumber: 'DEMO-BANK-123456',
            routingNumber: '021000021',
            reference: transaction.id
          }
          break
      }

      fastify.log.info({
        userId,
        transactionId: transaction.id,
        amount: depositData.amount,
        paymentMethod: depositData.paymentMethod,
        timestamp: new Date().toISOString()
      }, 'Deposit processed')

      return reply.send(response)

    } catch (error) {
      fastify.log.error({ error }, 'Deposit processing error')

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('Minimum deposit') ||
          error.message.includes('Maximum deposit')) {
          return reply.status(400).send({
            success: false,
            error: error.message
          })
        }

        if (error.message.includes('Payment method')) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid payment method'
          })
        }

        if (error.message.includes('Deposit failed')) {
          return reply.status(400).send({
            success: false,
            error: 'Deposit processing failed. Please try again.'
          })
        }
      }

      return reply.status(500).send({
        success: false,
        error: 'Deposit processing failed'
      })
    }
  })

  /**
   * GET /wallet/deposit/methods
   * Get available payment methods
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
        fees: number
        isEnabled: boolean
      }>
      error?: string
    }
  }>('/deposit/methods', {
    schema: {
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
                  fees: { type: 'number' },
                  isEnabled: { type: 'boolean' }
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
          id: 'credit_card',
          name: 'Credit Card',
          type: 'card',
          minAmount: 10.00,
          maxAmount: 5000.00,
          processingTime: 'Instant',
          fees: 0.029, // 2.9%
          isEnabled: true
        },
        {
          id: 'debit_card',
          name: 'Debit Card',
          type: 'card',
          minAmount: 10.00,
          maxAmount: 2500.00,
          processingTime: 'Instant',
          fees: 0.025, // 2.5%
          isEnabled: true
        },
        {
          id: 'crypto',
          name: 'Cryptocurrency',
          type: 'crypto',
          minAmount: 1.00,
          maxAmount: 10000.00,
          processingTime: '10-60 minutes',
          fees: 0.01, // 1%
          isEnabled: true
        },
        {
          id: 'paypal',
          name: 'PayPal',
          type: 'e-wallet',
          minAmount: 5.00,
          maxAmount: 3000.00,
          processingTime: 'Instant',
          fees: 0.035, // 3.5%
          isEnabled: true
        },
        {
          id: 'skrill',
          name: 'Skrill',
          type: 'e-wallet',
          minAmount: 5.00,
          maxAmount: 5000.00,
          processingTime: 'Instant',
          fees: 0.025, // 2.5%
          isEnabled: true
        },
        {
          id: 'bank_transfer',
          name: 'Bank Transfer',
          type: 'bank',
          minAmount: 25.00,
          maxAmount: 10000.00,
          processingTime: '1-3 business days',
          fees: 0.00, // No fees
          isEnabled: true
        }
      ]

      return reply.send({
        success: true,
        methods
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get payment methods error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve payment methods'
      })
    }
  })

  /**
   * GET /wallet/deposit/history
   * Get user's deposit history
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number; status?: string }
    Reply: {
      success: boolean
      deposits?: any[]
      pagination?: any
      error?: string
    }
  }>('/deposit/history', {
    schema: {
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
            enum: ['pending', 'completed', 'failed', 'cancelled']
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            deposits: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  amount: { type: 'number' },
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

      // In production, fetch from TransactionService with deposit filter
      // For now, return mock data
      const deposits: any[] = []

      return reply.send({
        success: true,
        deposits,
        pagination: {
          limit,
          offset,
          total: deposits.length,
          hasMore: deposits.length === limit
        }
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get deposit history error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve deposit history'
      })
    }
  })

  /**
   * GET /wallet/deposit/:id/status
   * Get deposit status and details
   */
  fastify.get<{
    Params: { id: string }
    Reply: {
      success: boolean
      deposit?: {
        id: string
        amount: number
        currency: string
        status: string
        paymentMethod: string
        createdAt: string
        completedAt?: string
        failureReason?: string
        paymentUrl?: string
        qrCode?: string
      }
      error?: string
    }
  }>('/deposit/:id/status', {
    schema: {
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
            deposit: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                status: { type: 'string' },
                paymentMethod: { type: 'string' },
                createdAt: { type: 'string', format: 'date-time' },
                completedAt: { type: 'string', format: 'date-time', nullable: true },
                failureReason: { type: 'string', nullable: true },
                paymentUrl: { type: 'string', nullable: true },
                qrCode: { type: 'string', nullable: true }
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
      // Verify it belongs to the user and is a deposit type

      // For now, return mock data
      const mockDeposit = {
        id,
        amount: 100.00,
        currency: 'USD',
        status: 'completed',
        paymentMethod: 'credit_card',
        createdAt: new Date().toISOString(),
        completedAt: new Date().toISOString()
      }

      return reply.send({
        success: true,
        deposit: mockDeposit
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get deposit status error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve deposit status'
      })
    }
  })
}