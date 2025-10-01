/**
 * Transaction Management Route
 * Handles transaction history, filtering, and transaction operations
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type {
  Transaction,
  TransactionFilters,
  TransactionHistory,
  TransactionType,
  TransactionStatus
} from '@yois-games/shared'

import {
  TransactionTypeEnum,
  TransactionStatusEnum
} from '@yois-games/shared'

import { TransactionService } from '../../services/wallet/TransactionService'

// Validation schema for transaction filters
const transactionFilterSchema = z.object({
  limit: z.number().min(1).max(100).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  type: z.nativeEnum(TransactionTypeEnum).optional(),
  status: z.nativeEnum(TransactionStatusEnum).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gameId: z.string().optional(),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional()
})

interface TransactionRouteContext {
  transactionService: TransactionService
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

export async function transactionRoutes(
  fastify: FastifyInstance,
  context: TransactionRouteContext
) {
  const { transactionService } = context

  /**
   * GET /wallet/transactions
   * Get user transactions with filtering and pagination
   */
  fastify.get<{
    Querystring: {
      limit?: number
      offset?: number
      type?: TransactionType
      status?: TransactionStatus
      startDate?: string
      endDate?: string
      gameId?: string
      minAmount?: number
      maxAmount?: number
    }
    Reply: {
      success: boolean
      transactions?: Transaction[]
      pagination?: any
      error?: string
    }
  }>('/transactions', {
    schema: {
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
          type: {
            type: 'string',
            enum: Object.values(TransactionTypeEnum)
          },
          status: {
            type: 'string',
            enum: Object.values(TransactionStatusEnum)
          },
          startDate: {
            type: 'string',
            format: 'date-time'
          },
          endDate: {
            type: 'string',
            format: 'date-time'
          },
          gameId: {
            type: 'string'
          },
          minAmount: {
            type: 'number',
            minimum: 0
          },
          maxAmount: {
            type: 'number',
            minimum: 0
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  userId: { type: 'string' },
                  type: { type: 'string' },
                  amount: { type: 'number' },
                  currency: { type: 'string' },
                  status: { type: 'string' },
                  reference: { type: 'string', nullable: true },
                  metadata: { type: 'object' },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' }
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
    Querystring: {
      limit?: number
      offset?: number
      type?: TransactionType
      status?: TransactionStatus
      startDate?: string
      endDate?: string
      gameId?: string
      minAmount?: number
      maxAmount?: number
    }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id

      // Validate query parameters
      const validationResult = transactionFilterSchema.safeParse(request.query)

      if (!validationResult.success) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid query parameters'
        })
      }

      const filters = validationResult.data
      const { limit, offset } = filters

      // Build transaction filter - omit undefined properties for exactOptionalPropertyTypes
      const transactionFilter: TransactionFilters = {
        userId,
        limit: filters.limit,
        offset: filters.offset,
        ...(filters.type && { type: [filters.type as TransactionType] }),
        ...(filters.status && { status: [filters.status as TransactionStatus] }),
        ...(filters.gameId && { gameType: [filters.gameId] }),
        ...(filters.minAmount !== undefined && { minAmount: filters.minAmount }),
        ...(filters.maxAmount !== undefined && { maxAmount: filters.maxAmount }),
        ...(filters.startDate && { fromDate: filters.startDate }),
        ...(filters.endDate && { toDate: filters.endDate })
      }

      // Get filtered transactions
      const transactions = await transactionService.getTransactionsByFilter(transactionFilter)

      return reply.send({
        success: true,
        transactions,
        pagination: {
          limit,
          offset,
          total: transactions.length,
          hasMore: transactions.length === limit
        }
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get transactions error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve transactions'
      })
    }
  })

  /**
   * GET /wallet/transactions/:id
   * Get specific transaction by ID
   */
  fastify.get<{
    Params: { id: string }
    Reply: { success: boolean; transaction?: Transaction; error?: string }
  }>('/transactions/:id', {
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
            transaction: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                type: { type: 'string' },
                amount: { type: 'number' },
                currency: { type: 'string' },
                status: { type: 'string' },
                reference: { type: 'string', nullable: true },
                metadata: { type: 'object' },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' }
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

      const transaction = await transactionService.getTransactionById(id)

      if (!transaction) {
        return reply.status(404).send({
          success: false,
          error: 'Transaction not found'
        })
      }

      // Verify transaction belongs to user
      if (transaction.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        })
      }

      return reply.send({
        success: true,
        transaction
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get transaction error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve transaction'
      })
    }
  })

  /**
   * GET /wallet/transactions/history
   * Get comprehensive transaction history with analytics
   */
  fastify.get<{
    Querystring: { period?: string; groupBy?: string }
    Reply: { success: boolean; history?: TransactionHistory; error?: string }
  }>('/transactions/history', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year', 'all'],
            default: 'month'
          },
          groupBy: {
            type: 'string',
            enum: ['day', 'week', 'month', 'type'],
            default: 'day'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            history: {
              type: 'object',
              properties: {
                transactions: {
                  type: 'array',
                  items: { type: 'object' }
                },
                summary: {
                  type: 'object',
                  properties: {
                    totalTransactions: { type: 'number' },
                    totalAmount: { type: 'number' },
                    deposits: { type: 'number' },
                    withdrawals: { type: 'number' },
                    bets: { type: 'number' },
                    wins: { type: 'number' }
                  }
                },
                chartData: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      date: { type: 'string' },
                      amount: { type: 'number' },
                      count: { type: 'number' }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{
    Querystring: { period?: string; groupBy?: string }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id
      const { period = 'month', groupBy = 'day' } = request.query

      // Build filter based on period
      const filter: TransactionFilters = {
        userId
      }

      // Set date range based on period
      const now = new Date()
      switch (period) {
        case 'day':
          filter.fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
          break
        case 'week':
          filter.fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'month':
          filter.fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
          break
        case 'year':
          filter.fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString()
          break
        // 'all' case doesn't set startDate
      }

      const history = await transactionService.getTransactionHistory(userId, filter)

      return reply.send({
        success: true,
        history
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get transaction history error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve transaction history'
      })
    }
  })

  /**
   * GET /wallet/transactions/pending
   * Get pending transactions for user
   */
  fastify.get<{
    Reply: { success: boolean; transactions?: Transaction[]; error?: string }
  }>('/transactions/pending', {
    schema: {
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            transactions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string' },
                  amount: { type: 'number' },
                  status: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                  metadata: { type: 'object' }
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

      const pendingTransactions = await transactionService.getPendingTransactions(userId)

      return reply.send({
        success: true,
        transactions: pendingTransactions
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get pending transactions error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve pending transactions'
      })
    }
  })

  /**
   * POST /wallet/transactions/:id/cancel
   * Cancel a pending transaction
   */
  fastify.post<{
    Params: { id: string }
    Reply: { success: boolean; transaction?: Transaction; error?: string }
  }>('/transactions/:id/cancel', {
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
            transaction: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                status: { type: 'string' },
                updatedAt: { type: 'string', format: 'date-time' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id
      const { id } = request.params

      // Get transaction to verify ownership
      const transaction = await transactionService.getTransactionById(id)

      if (!transaction) {
        return reply.status(404).send({
          success: false,
          error: 'Transaction not found'
        })
      }

      if (transaction.userId !== userId) {
        return reply.status(403).send({
          success: false,
          error: 'Access denied'
        })
      }

      // Cancel transaction
      const cancelledTransaction = await transactionService.cancelTransaction(id)

      if (!cancelledTransaction) {
        return reply.status(400).send({
          success: false,
          error: 'Transaction cannot be cancelled'
        })
      }

      fastify.log.info({
        userId,
        transactionId: id,
        timestamp: new Date().toISOString()
      }, 'Transaction cancelled')

      return reply.send({
        success: true,
        transaction: cancelledTransaction
      })

    } catch (error) {
      fastify.log.error({ error }, 'Cancel transaction error')

      if (error instanceof Error) {
        if (error.message.includes('Can only cancel pending')) {
          return reply.status(400).send({
            success: false,
            error: 'Only pending transactions can be cancelled'
          })
        }
      }

      return reply.status(500).send({
        success: false,
        error: 'Failed to cancel transaction'
      })
    }
  })

  /**
   * GET /wallet/transactions/stats
   * Get transaction statistics
   */
  fastify.get<{
    Querystring: { period?: string }
    Reply: {
      success: boolean
      stats?: {
        totalTransactions: number
        totalAmount: number
        averageAmount: number
        byType: Record<string, { count: number; amount: number }>
        byStatus: Record<string, number>
        trends: any[]
      }
      error?: string
    }
  }>('/transactions/stats', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['day', 'week', 'month', 'year'],
            default: 'month'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            stats: {
              type: 'object',
              properties: {
                totalTransactions: { type: 'number' },
                totalAmount: { type: 'number' },
                averageAmount: { type: 'number' },
                byType: { type: 'object' },
                byStatus: { type: 'object' },
                trends: { type: 'array' }
              }
            }
          }
        }
      }
    },
    preHandler: authenticateUser
  }, async (request: FastifyRequest<{
    Querystring: { period?: string }
  }>, reply: FastifyReply) => {
    try {
      const userId = (request as any).user.id
      const { period = 'month' } = request.query

      // Calculate date range
      const now = new Date()
      let fromDate: Date | undefined

      switch (period) {
        case 'day':
          fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case 'week':
          fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        case 'year':
          fromDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
          break
      }

      // Get overall stats
      const overallStats = await transactionService.getTransactionStats(userId, undefined, fromDate)

      // Get stats by type
      const byType: Record<string, { count: number; amount: number }> = {}
      for (const type of Object.values(TransactionTypeEnum)) {
        const typeStats = await transactionService.getTransactionStats(userId, type, fromDate)
        byType[type] = {
          count: typeStats.count,
          amount: typeStats.totalAmount
        }
      }

      // Mock status distribution and trends for now
      const byStatus = {
        [TransactionStatusEnum.COMPLETED]: 85,
        [TransactionStatusEnum.PENDING]: 10,
        [TransactionStatusEnum.FAILED]: 3,
        [TransactionStatusEnum.CANCELLED]: 2
      }

      const trends: any[] = [] // Would be calculated from historical data

      return reply.send({
        success: true,
        stats: {
          totalTransactions: overallStats.count,
          totalAmount: overallStats.totalAmount,
          averageAmount: overallStats.averageAmount,
          byType,
          byStatus,
          trends
        }
      })

    } catch (error) {
      fastify.log.error({ error }, 'Get transaction stats error')

      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve transaction statistics'
      })
    }
  })
}