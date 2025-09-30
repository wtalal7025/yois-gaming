/**
 * Token Refresh Route
 * Handles JWT token refresh
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from '../../services/auth/AuthService'

interface RefreshRouteContext {
  authService: AuthService
}

export async function refreshRoutes(
  fastify: FastifyInstance,
  context: RefreshRouteContext
) {
  const { authService } = context

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post('/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get refresh token from cookie or request body
      const refreshToken = request.cookies?.refreshToken || 
                          (request.body as any)?.refreshToken

      if (!refreshToken) {
        return reply.status(401).send({
          success: false,
          error: 'Refresh token required'
        })
      }

      const result = await authService.refreshToken({ refreshToken })

      if (result.success) {
        // Set new refresh token cookie
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
          path: '/'
        })

        return reply.send({
          success: true,
          accessToken: result.accessToken,
          expiresAt: result.expiresAt
        })
      } else {
        return reply.status(401).send({
          success: false,
          error: 'Invalid refresh token'
        })
      }
    } catch (error) {
      console.error('Token refresh error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Token refresh failed'
      })
    }
  })
}