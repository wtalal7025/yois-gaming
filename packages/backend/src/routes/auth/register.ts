/**
 * User Registration Route
 * Handles new user account creation with validation and security
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import type { RegisterRequest, RegisterResponse, WelcomeEmailData } from '@stake-games/shared'
import { AuthService } from '../../services/auth/AuthService'
import { EmailService } from '../../services/email/EmailService'

// Validation schema for registration request
const registerSchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username must be at most 20 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
  email: z.string()
    .email('Invalid email format')
    .max(255, 'Email must be at most 255 characters'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be at most 128 characters'),
  confirmPassword: z.string(),
  acceptedTerms: z.boolean()
    .refine(val => val === true, 'You must accept the terms and conditions'),
  acceptedPrivacy: z.boolean()
    .refine(val => val === true, 'You must accept the privacy policy'),
  dateOfBirth: z.string()
    .optional(),
  referralCode: z.string()
    .optional()
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
})

interface RegisterRouteContext {
  authService: AuthService
  emailService: EmailService
}

export async function registerRoutes(
  fastify: FastifyInstance,
  context: RegisterRouteContext
) {
  const { authService, emailService } = context

  /**
   * POST /auth/register
   * Register a new user account
   */
  fastify.post<{
    Body: RegisterRequest
    Reply: RegisterResponse
  }>('/register', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'email', 'password', 'confirmPassword', 'acceptedTerms', 'acceptedPrivacy'],
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20,
            pattern: '^[a-zA-Z0-9_-]+$'
          },
          email: {
            type: 'string',
            format: 'email',
            maxLength: 255
          },
          password: {
            type: 'string',
            minLength: 8,
            maxLength: 128
          },
          confirmPassword: {
            type: 'string'
          },
          acceptedTerms: {
            type: 'boolean'
          },
          acceptedPrivacy: {
            type: 'boolean'
          },
          dateOfBirth: {
            type: 'string',
            format: 'date'
          },
          referralCode: {
            type: 'string',
            maxLength: 50
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
                createdAt: { type: 'string', format: 'date-time' }
              }
            },
            accessToken: { type: 'string' },
            refreshToken: { type: 'string' },
            expiresAt: { type: 'string', format: 'date-time' }
          }
        },
        400: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            error: { type: 'string' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string' },
                  message: { type: 'string' }
                }
              }
            }
          }
        }
      }
    },
    preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
      // Rate limiting for registration attempts
      // This would be implemented with fastify-rate-limit plugin
      
      // Basic IP rate limiting (simplified)
      const clientIp = request.ip
      // In production, implement proper rate limiting here
    }
  }, async (request: FastifyRequest<{ Body: RegisterRequest }>, reply: FastifyReply) => {
    try {
      // Validate request body with Zod
      const validationResult = registerSchema.safeParse(request.body)
      
      if (!validationResult.success) {
        const errors = validationResult.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
        
        return reply.status(400).send({
          success: false,
          error: 'Validation failed',
          details: errors
        })
      }

      const registerData = validationResult.data

      // Validate age if date of birth provided
      if (registerData.dateOfBirth) {
        const birthDate = new Date(registerData.dateOfBirth)
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        
        if (age < 18) {
          return reply.status(400).send({
            success: false,
            error: 'You must be at least 18 years old to register'
          })
        }
      }

      // Extract client information for session
      const userAgent = request.headers['user-agent']
      const platform = request.headers['sec-ch-ua-platform']
      const browser = request.headers['sec-ch-ua']
      
      const clientInfo = {
        ipAddress: request.ip,
        userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
        deviceInfo: {
          platform: typeof platform === 'string' ? platform.replace(/"/g, '') :
                   Array.isArray(platform) ? platform[0]?.replace(/"/g, '') : undefined,
          browser: typeof browser === 'string' ? browser.split('"')[1] :
                  Array.isArray(browser) ? browser[0]?.split('"')[1] : undefined,
          mobile: request.headers['sec-ch-ua-mobile'] === '?1'
        }
      }

      // Attempt registration with comprehensive logging
      console.log('🚀 REGISTRATION: Starting registration process for:', {
        username: registerData.username,
        email: registerData.email,
        clientInfo: {
          ipAddress: clientInfo.ipAddress,
          userAgent: clientInfo.userAgent?.substring(0, 100)
        }
      })
      
      const authResult = await authService.register(registerData, clientInfo)
      
      console.log('✅ REGISTRATION: Registration successful for user:', {
        userId: authResult.user.id,
        username: authResult.user.username,
        email: authResult.user.email
      })

      // Send welcome email to new user
      try {
        const welcomeEmailData: WelcomeEmailData = {
          username: authResult.user.username,
          email: authResult.user.email,
          loginUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/login`
        }

        const emailResult = await emailService.sendWelcomeEmail(welcomeEmailData)
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to:', authResult.user.email)
        } else {
          console.error('❌ Failed to send welcome email:', emailResult.error)
        }
      } catch (emailError) {
        console.error('❌ Welcome email error:', emailError)
        // Don't fail registration if email fails - just log the error
      }

      // Set secure HTTP-only cookie for refresh token
      reply.setCookie('refreshToken', authResult.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/'
      })

      // Return response with refresh token
      const response: RegisterResponse = {
        success: authResult.success,
        user: authResult.user,
        accessToken: authResult.accessToken,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt
      }

      return reply.status(200).send(response)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown registration error'
      fastify.log.error('Registration error: ' + errorMessage)
      console.error('❌ REGISTRATION ERROR:', error)

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('already registered') || 
            error.message.includes('already taken')) {
          return reply.status(409).send({
            success: false,
            error: error.message
          })
        }
        
        if (error.message.includes('password') ||
            error.message.includes('validation') ||
            error.message.includes('terms')) {
          return reply.status(400).send({
            success: false,
            error: error.message
          })
        }
      }

      // Generic error response
      return reply.status(500).send({
        success: false,
        error: 'Registration failed. Please try again.'
      })
    }
  })

  /**
   * POST /auth/check-availability
   * Check if username or email is available
   */
  fastify.post<{
    Body: { username?: string; email?: string }
    Reply: { available: boolean; field: string }
  }>('/check-availability', {
    schema: {
      body: {
        type: 'object',
        properties: {
          username: {
            type: 'string',
            minLength: 3,
            maxLength: 20
          },
          email: {
            type: 'string',
            format: 'email'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
            field: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Body: { username?: string; email?: string } }>, reply: FastifyReply) => {
    try {
      const { username, email } = request.body

      if (username) {
        const existingUser = await authService.getUserById(username) // This would need a getUserByUsername method
        return reply.send({
          available: !existingUser,
          field: 'username'
        })
      }

      if (email) {
        // Similar check for email
        // This would need implementation in AuthService
        return reply.send({
          available: true, // Placeholder
          field: 'email'
        })
      }

      return reply.status(400).send({
        success: false,
        error: 'Username or email must be provided'
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown availability check error'
      fastify.log.error('Availability check error: ' + errorMessage)
      console.error('❌ AVAILABILITY CHECK ERROR:', error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to check availability'
      })
    }
  })
}