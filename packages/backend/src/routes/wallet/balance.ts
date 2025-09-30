/**
 * Balance Management Route
 * Handles balance retrieval, history, and basic balance operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { Balance, WalletStats } from '@yois-games/shared'
import { WalletService } from '../../services/wallet/WalletService'

// Validation schema for balance history query
const balanceHistorySchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  startDate: z.string().optional(),
  endDate: z.string().optional()
})

interface BalanceRouteContext {
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

export async function balanceRoutes(
  fastify: FastifyInstance,
  context: BalanceRouteContext
) {
  const { walletService } = context

  /**
   * GET /wallet/balance
   * Get current user balance
   */
  fastify.get<{
    Reply: { success: boolean; balance?: Balance; error?: string }
  }>('/balance', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            balance: {
              type: 'object',
              properties: {
                userId: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                availableAmount: { type: 'number' },
                frozenAmount: { type: 'number' },
                pendingAmount: { type: 'number' },
                lastUpdated: { type: 'string', format: 'date-time' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      const balance = await walletService.getBalance(userId)

      return reply.send({
        success: true,
        balance
      })

    } catch (error) {
      fastify.log.error('Get balance error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve balance'
      })
    }
  })

  /**
   * GET /wallet/balance/history
   * Get balance history with pagination
   */
  fastify.get<{
    Querystring: { limit?: number; offset?: number; startDate?: string; endDate?: string }
    Reply: { success: boolean; history?: Balance[]; pagination?: any; error?: string }
  }>('/balance/history', {
    schema: {
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            minimum: 1,
            maximum: 100,
            default: 50
          },
          offset: {
            type: 'number',
            minimum: 0,
            default: 0
          },
          startDate: {
            type: 'string',
            format: 'date-time'
          },
          endDate: {
            type: 'string',
            format: 'date-time'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            history: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  userId: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  lastUpdated: { type: 'string', format: 'date-time' }
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
    Querystring: { limit?: number; offset?: number; startDate?: string; endDate?: string }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      // Validate query parameters
      const validationResult = balanceHistorySchema.safeParse(request.query)

      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid query parameters'
        })
      }

      const { limit, offset } = validationResult.data

      // Get balance history (this would need to be implemented in the service)
      // For now, return a placeholder response
      const history = [] // await walletService.getBalanceHistory(userId, limit, offset)

      return reply.send({
        success: true,
        history,
        pagination: {
          limit,
          offset,
          total: history.length,
          hasMore: history.length === limit
        }
      })

    } catch (error) {
      fastify.log.error('Get balance history error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve balance history'
      })
    }
  })

  /**
   * GET /wallet/balance/stats
   * Get wallet statistics
   */
  fastify.get<{
    Reply: { success: boolean; stats?: WalletStats; error?: string }
  }>('/balance/stats', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                totalDeposits: { type: 'number' },
                totalWithdrawals: { type: 'number' },
                totalBets: { type: 'number' },
                totalWins: { type: 'number' },
                netProfit: { type: 'number' },
                biggestWin: { type: 'number' },
                biggestLoss: { type: 'number' },
                averageBet: { type: 'number' },
                winRate: { type: 'number' },
                totalTransactions: { type: 'number' }
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

      const stats = await walletService.getWalletStats(userId)

      return reply.send({
        success: true,
        stats
      })

    } catch (error) {
      fastify.log.error('Get wallet stats error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve wallet statistics'
      })
    }
  })

  /**
   * POST /wallet/balance/validate
   * Validate if user has sufficient balance for a specific amount
   */
  fastify.post<{
    Body: { amount: number }
    Reply: { valid: boolean; currentBalance?: number; error?: string }
  }>('/balance/validate', {
    schema: {
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        required: ['amount'],
        properties: {
          amount: {
            type: 'number',
            minimum: 0.01,
            maximum: 1000000
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            valid: { type: 'boolean' },
            currentBalance: { type: 'number' },
            error: { type: 'string' }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Body: { amount: number } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id
      const { amount } = request.body

      // Validate amount
      if (amount <= 0) {
        return reply.status(400).send({
          valid: false,
          error: 'Amount must be greater than zero'
        })
      }

      // Check balance
      const hasBalance = await walletService.validateBalance(userId, amount)
      const currentBalance = await walletService.getBalance(userId)

      return reply.send({
        valid: hasBalance,
        currentBalance: currentBalance?.amount || 0
      })

    } catch (error) {
      fastify.log.error('Balance validation error:', error)

      return reply.send({
        valid: false,
        error: 'Failed to validate balance'
      })
    }
  })

  /**
   * GET /wallet/balance/summary
   * Get balance summary with recent activity
   */
  fastify.get<{
    Reply: {
      success: boolean
      summary?: {
        currentBalance: number
        availableBalance: number
        frozenBalance: number
        pendingTransactions: number
        recentActivity: any[]
        lastDeposit?: any
        lastWithdrawal?: any
      }
      error?: string
    }
  }>('/balance/summary', {
    schema: {
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            summary: {
              type: 'object',
              properties: {
                currentBalance: { type: 'number' },
                availableBalance: { type: 'number' },
                frozenBalance: { type: 'number' },
                pendingTransactions: { type: 'number' },
                recentActivity: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      type: { type: 'string' },
                      amount: { type: 'number' },
                      timestamp: { type: 'string', format: 'date-time' },
                      status: { type: 'string' }
                    }
                  }
                },
                lastDeposit: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    amount: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' }
                  }
                },
                lastWithdrawal: {
                  type: 'object',
                  nullable: true,
                  properties: {
                    amount: { type: 'number' },
                    timestamp: { type: 'string', format: 'date-time' }
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
      const userId = (request as any).user.id

      // Get current balance
      const balance = await walletService.getBalance(userId)

      // Get wallet stats
      const stats = await walletService.getWalletStats(userId)

      // In production, this would fetch recent transactions, pending operations, etc.
      const summary = {
        currentBalance: balance?.amount || 0,
        availableBalance: balance?.amount || 0, // Would subtract frozen amounts
        frozenBalance: 0, // Would be calculated from frozen balance records
        pendingTransactions: 0, // Would be counted from pending transactions
        recentActivity: [], // Would be fetched from recent transactions
        lastDeposit: null, // Would be fetched from transaction history
        lastWithdrawal: null // Would be fetched from transaction history
      }

      return reply.send({
        success: true,
        summary
      })

    } catch (error) {
      fastify.log.error('Balance summary error:', error)

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve balance summary'
      })
    }
  })
}