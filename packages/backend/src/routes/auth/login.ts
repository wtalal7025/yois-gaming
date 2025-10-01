/**
 * User Login Route
 * Handles user authentication and session creation
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { LoginRequest, LoginResponse } from '@yois-games/shared'
import { AuthService } from '../../services/auth/AuthService'

// Validation schema for login request
const loginSchema = z.object({
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters'),
  password: z.string()
    .min(1, 'Password is required')
    .max(128, 'Password must be at most 128 characters'),
  rememberMe: z.boolean().optional().default(false),
  twoFactorCode: z.string().optional()
})

interface LoginRouteContext {
  authService: AuthService
}

export async function loginRoutes(
  fastify: FastifyInstance,
  context: LoginRouteContext
) {
  const { authService } = context

  /**
   * POST /auth/login
   * Authenticate user and create session
   */
  fastify.post<{
    Body: LoginRequest
    Reply: LoginResponse
  }>('/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255
          },
          password: {
            type: 'string',
            minLength: 1,
            maxLength: 128
          },
          rememberMe: {
            type: 'boolean',
            default: false
          },
          twoFactorCode: {
            type: 'string',
            minLength: 6,
            maxLength: 8
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' },
                balance: { type: 'number' },
                level: { type: 'number' },
                isVerified: { type: 'boolean' },
                lastLoginAt: { type: 'string', format: 'date-time' }
              }
            },
            accessToken: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        401: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            remainingAttempts: { type: 'number' },
            lockoutTime: { type: 'number' }
          }
        },
        429: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            retryAfter: { type: 'number' }
          }
        }
      }
    },
    preHandler: async (request: FastifyRequest, _reply: FastifyReply) => {
      // Rate limiting for login attempts
      const clientIp = request.ip
      const userAgent = request.headers['user-agent']

      // In production, implement rate limiting here
      // Check for suspicious login patterns

      // Log login attempt for security monitoring
      console.log('📝 Login attempt:', {
        ip: clientIp,
        userAgent,
        timestamp: new Date().toISOString()
      })
    }
  }, async (request: FastifyRequest<{ Body: LoginRequest }>, reply: FastifyReply) => {
    try {
      // Validate request body
      const validationResult = loginSchema.safeParse(request.body)

      if (!validationResult.success) {
        const errors = validationResult.error.errors.map((err: any) => ({
          field: err.path.join('.'),
          message: err.message
        }))

        return reply.status(400).send({
          success: false,
          error: 'Invalid request data',
          details: errors
        })
      }

      const loginData = validationResult.data

      // Extract client information with proper header type handling
      const userAgent = request.headers['user-agent']
      const platform = request.headers['sec-ch-ua-platform']
      const browser = request.headers['sec-ch-ua']

      const clientInfo = {
        ipAddress: request.ip,
        ...(userAgent ? { userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent } : {}),
        deviceInfo: {
          platform: typeof platform === 'string' ? platform.replace(/"/g, '') : undefined,
          browser: typeof browser === 'string' ? browser.split('"')[1] : undefined,
          mobile: request.headers['sec-ch-ua-mobile'] === '?1'
        }
      }

      // Attempt login with comprehensive logging
      console.log('🚀 LOGIN: Starting login process for:', {
        email: loginData.email,
        rememberMe: loginData.rememberMe,
        clientInfo: {
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent?.substring(0, 100)
        }
      })

      const authResult = await authService.login(loginData, clientInfo)

      console.log('✅ LOGIN: Login successful for user:', {
        userId: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email
      })

      // Set refresh token cookie
      const cookieMaxAge = loginData.rememberMe
        ? 30 * 24 * 60 * 60 * 1000  // 30 days if remember me
        : 7 * 24 * 60 * 60 * 1000   // 7 days default

      reply.setCookie('refreshToken', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: cookieMaxAge,
        path: '/'
      })

      // Log successful login
      console.log('📝 Successful login:', {
        userId: authResult.user.id,
        username: authResult.user.username,
        ip: request.ip,
        rememberMe: loginData.rememberMe
      })

      // Return response with refresh token
      const response: LoginResponse = {
        success: authResult.success,
        user: authResult.user,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt
      }

      return reply.status(200).send(response)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown login error'
      fastify.log.error('Login error: ' + errorMessage)
      console.error('❌ LOGIN ERROR:', error)

      // Handle specific error types
      if (error instanceof Error) {
        // Account blocked/locked
        if (error.message.includes('blocked') || error.message.includes('locked')) {
          return reply.status(401).send({
            success: false,
            error: error.message,
            lockoutTime: 15 * 60 * 1000 // 15 minutes
          })
        }

        // Invalid credentials
        if (error.message.includes('Invalid email') ||
          error.message.includes('Invalid password') ||
          error.message.includes('password')) {
          return reply.status(401).send({
            success: false,
            error: 'Invalid email or password',
            remainingAttempts: 3 // Would be calculated based on actual attempts
          })
        }

        // Account deactivated
        if (error.message.includes('deactivated') ||
          error.message.includes('inactive')) {
          return reply.status(401).send({
            success: false,
            error: 'Account is deactivated. Please contact support.'
          })
        }

        // Two-factor authentication required
        if (error.message.includes('2FA') ||
          error.message.includes('two-factor')) {
          return reply.status(400).send({
            success: false,
            error: 'Two-factor authentication code required',
            requiresTwoFactor: true
          })
        }
      }

      // Generic error response
      return reply.status(500).send({
        success: false,
        error: 'Login failed. Please try again.'
      })
    }
  })

  /**
   * POST /auth/logout
   * Logout user and invalidate session
   */
  fastify.post<{
    Body: { allDevices?: boolean }
    Reply: { success: boolean; message?: string }
  }>('/logout', {
    schema: {
      body: {
        type: 'object',
        properties: {
          allDevices: {
            type: 'boolean',
            default: false
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            message: { type: 'string' }
          }
        }
      }
    },
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Extract user from JWT token (would be done by auth middleware)
      const authHeader = request.headers.authorization

      if (!authHeader?.startsWith('Bearer ')) {
        return reply.status(401).send({
          success: false,
          error: 'Authorization token required'
        })
      }

      // In production, verify JWT token and extract user info
      // For now, we'll simulate this
      // const _unusedToken = authHeader.substring(7) // Commented out - unused
      // request.user = await verifyAccessToken(token)
    }
  }, async (request: FastifyRequest<{ Body: { allDevices?: boolean } }>, reply: FastifyReply) => {
    try {
      // Extract user ID from verified token (would be set by middleware)
      const userId = 'user-id-from-token' // Placeholder
      const sessionId = 'session-id-from-token' // Placeholder

      const { allDevices = false } = request.body

      // Logout user
      const success = await authService.logout(userId, sessionId, allDevices)

      if (success) {
        // Clear refresh token cookie
        reply.clearCookie('refreshToken', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict'
        })

        console.log('📝 User logout:', {
          userId,
          allDevices,
          timestamp: new Date().toISOString()
        })

        return reply.send({
          success: true,
          message: allDevices
            ? 'Logged out from all devices'
            : 'Logged out successfully'
        })
      } else {
        return reply.status(400).send({
          success: false,
          error: 'Logout failed'
        })
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown logout error'
      fastify.log.error('Logout error: ' + errorMessage)
      console.error('❌ LOGOUT ERROR:', error)

      return reply.status(500).send({
        success: false,
        error: 'Logout failed'
      })
    }
  })

}