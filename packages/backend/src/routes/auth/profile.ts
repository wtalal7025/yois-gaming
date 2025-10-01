/**
 * User Profile Route
 * Handles user profile retrieval and updates
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from '../../services/auth/AuthService'

interface ProfileRouteContext {
  authService: AuthService
}

export async function profileRoutes(
  fastify: FastifyInstance,
  context: ProfileRouteContext
) {
  const { authService } = context

  /**
   * GET /auth/profile
   * Get current user profile
   */
  fastify.get('/profile', async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      // TODO: Extract user from JWT token (would be done by auth middleware)
      const userId = 'mock-user-id' // Placeholder

      const user = await authService.getUserById(userId)

      if (!user) {
        return reply.status(404).send({
          success: false,
          error: 'User not found'
        })
      }

      return reply.send({
        success: true,
        user
      })
    } catch (error) {
      fastify.log.error('Profile retrieval error: ' + (error instanceof Error ? error.message : String(error)))
      return reply.status(500).send({
        success: false,
        error: 'Failed to retrieve profile'
      })
    }
  })
}