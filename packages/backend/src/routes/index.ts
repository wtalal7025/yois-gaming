/**
 * API routes module
 * Contains all REST API endpoint definitions
 */

import { FastifyInstance } from 'fastify'
import { loginRoutes } from './auth/login'
import { registerRoutes as authRegisterRoutes } from './auth/register'
import { profileRoutes } from './auth/profile'
import { refreshRoutes } from './auth/refresh'
import { passwordRoutes } from './auth/password'
import { uploadRoutes } from './storage/upload'
import { balanceRoutes } from './wallet/balance'
import { transactionRoutes } from './wallet/transactions'
import { depositRoutes } from './wallet/deposit'
import { withdrawRoutes } from './wallet/withdraw'
import { authService, emailService, storageService, walletService, getTransactionService } from '../services'

/**
 * Register all API routes with the Fastify instance
 * Reason: Central route registration to keep server.ts clean
 */
export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health check endpoint
  fastify.get('/health', async () => {
    return { 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'authentication-api'
    }
  })

  // API info endpoint  
  fastify.get('/info', async () => {
    return {
      name: '@stake-games/backend',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        auth: ['/auth/login', '/auth/register', '/auth/logout', '/auth/refresh', '/auth/profile'],
        storage: ['/storage/avatar', '/storage/game-asset', '/storage/url/:bucket/*'],
        wallet: ['/wallet/balance', '/wallet/transactions', '/wallet/deposit', '/wallet/withdraw'],
        health: ['/health', '/info']
      }
    }
  })

  // Register auth routes under /auth prefix
  await fastify.register(async function (fastify) {
    // Add CORS headers for all auth routes
    fastify.addHook('preHandler', async (request, reply) => {
      reply.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      reply.header('Access-Control-Allow-Credentials', 'true')
      
      if (request.method === 'OPTIONS') {
        reply.status(200).send()
      }
    })

    // Auth routes context
    const authContext = { authService, emailService }

    // Register auth route modules
    await loginRoutes(fastify, authContext)
    await authRegisterRoutes(fastify, authContext)
    await profileRoutes(fastify, authContext)
    await refreshRoutes(fastify, authContext)
    await passwordRoutes(fastify, authContext)

  }, { prefix: '/auth' })

  // Register storage routes under /storage prefix
  await fastify.register(async function (fastify) {
    // Add CORS headers for all storage routes
    fastify.addHook('preHandler', async (request, reply) => {
      reply.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
      reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      reply.header('Access-Control-Allow-Credentials', 'true')
      
      if (request.method === 'OPTIONS') {
        reply.status(200).send()
      }
    })

    // Storage routes context
    const storageContext = { storageService }

    // Register storage route modules
    await uploadRoutes(fastify, storageContext)

  }, { prefix: '/storage' })

  // Register wallet routes under /wallet prefix - only if wallet service is available
  if (walletService) {
    await fastify.register(async function (fastify) {
      // Add CORS headers for all wallet routes
      fastify.addHook('preHandler', async (request, reply) => {
        reply.header('Access-Control-Allow-Origin', process.env.FRONTEND_URL || 'http://localhost:3000')
        reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        reply.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        reply.header('Access-Control-Allow-Credentials', 'true')
        
        if (request.method === 'OPTIONS') {
          reply.status(200).send()
        }
      })

      // Create wallet contexts - each route has different context requirements
      const walletContext = { walletService: walletService! } // Non-null assertion since we checked above
      
      // Get the actual transaction service
      const actualTransactionService = getTransactionService()
      const transactionContext = actualTransactionService
        ? { transactionService: actualTransactionService }
        : null

      // Register wallet route modules with proper contexts
      try {
        await balanceRoutes(fastify, walletContext)
        
        // Only register transaction routes if transaction service is available
        if (transactionContext) {
          await transactionRoutes(fastify, transactionContext)
        } else {
          console.warn('⚠️ Transaction service not available, skipping transaction routes')
        }
        
        await depositRoutes(fastify, walletContext)
        await withdrawRoutes(fastify, walletContext)
        console.log('✅ Wallet routes registered successfully with Redis persistence')
      } catch (error) {
        console.warn('⚠️ Some wallet routes failed to register:', error)
      }

    }, { prefix: '/wallet' })
  } else {
    console.warn('⚠️ Wallet service not available, skipping wallet routes')
  }

  console.log('✅ API routes registered successfully')
}

// Export for backward compatibility
export {}