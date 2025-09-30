/**
 * Password Reset Route
 * Handles password reset functionality
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import type { AuthService } from '../../services/auth/AuthService'
import type { EmailService } from '../../services/email/EmailService'
import type { PasswordResetEmailData } from '@stake-games/shared'
import { PasswordService } from '../../services/auth/PasswordService'
import { TokenService } from '../../services/auth/TokenService'
import { userRepository } from '../../services'

interface PasswordRouteContext {
  authService: AuthService
  emailService: EmailService
}

export async function passwordRoutes(
  fastify: FastifyInstance,
  context: PasswordRouteContext
) {
  const { authService, emailService } = context

  /**
   * POST /auth/forgot-password
   * Request password reset
   */
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email } = request.body as { email: string }

      if (!email) {
        return reply.status(400).send({
          success: false,
          error: 'Email is required'
        })
      }

      // Find user by email
      const user = await userRepository.findByEmail(email)
      
      if (!user) {
        // Don't reveal if user exists for security, but still return success
        console.log('Password reset requested for non-existent email:', email)
        return reply.send({
          success: true,
          message: 'If an account with this email exists, you will receive password reset instructions.'
        })
      }

      // Generate reset token using existing TokenService
      const tokenData = {
        sub: user.id,
        username: user.username,
        email: user.email,
        sessionId: 'password-reset',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
      }
      
      const tokens = await TokenService.createTokenPair(user, 'password-reset')
      const resetToken = tokens.accessToken
      
      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/auth/reset-password?token=${resetToken}`
      
      // Send password reset email
      const passwordResetData: PasswordResetEmailData = {
        username: user.username,
        email: user.email,
        resetToken,
        resetUrl,
        expiresInHours: 1
      }

      try {
        const emailResult = await emailService.sendPasswordResetEmail(passwordResetData)
        
        if (emailResult.success) {
          console.log('✅ Password reset email sent successfully to:', email)
        } else {
          console.error('❌ Failed to send password reset email:', emailResult.error)
        }
      } catch (error) {
        console.error('❌ Password reset email error:', error)
        // Don't fail the request if email fails
      }

      return reply.send({
        success: true,
        message: 'If an account with this email exists, you will receive password reset instructions.'
      })
    } catch (error) {
      console.error('Password reset error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Password reset failed'
      })
    }
  })

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { token, newPassword, confirmPassword } = request.body as {
        token: string
        newPassword: string
        confirmPassword: string
      }

      if (!token || !newPassword || !confirmPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Token and passwords are required'
        })
      }

      if (newPassword !== confirmPassword) {
        return reply.status(400).send({
          success: false,
          error: 'Passwords do not match'
        })
      }

      // Verify the reset token
      try {
        const decoded = await TokenService.verifyAccessToken(token)
        
        if (!decoded || !decoded.sub) {
          return reply.status(400).send({
            success: false,
            error: 'Invalid reset token'
          })
        }

        // Get the user by ID from token
        const user = await userRepository.findById(decoded.sub)
        if (!user) {
          return reply.status(400).send({
            success: false,
            error: 'User not found'
          })
        }

        // Hash the new password
        const hashedPassword = await PasswordService.hashPassword(newPassword)
        
        // Update user's password using the existing update method
        const updatedUser = await userRepository.update(user.id, { passwordHash: hashedPassword } as any)
        
        if (!updatedUser) {
          return reply.status(500).send({
            success: false,
            error: 'Failed to update password'
          })
        }
        
        console.log('✅ Password reset successful for user:', user.email)

        return reply.send({
          success: true,
          message: 'Password reset successfully'
        })
      } catch (tokenError) {
        console.error('❌ Invalid reset token:', tokenError)
        return reply.status(400).send({
          success: false,
          error: 'Invalid or expired reset token'
        })
      }
    } catch (error) {
      console.error('Password reset error:', error)
      return reply.status(500).send({
        success: false,
        error: 'Password reset failed'
      })
    }
  })
}