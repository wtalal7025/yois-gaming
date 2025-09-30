/**
 * Authentication Service
 * Main authentication service that orchestrates user management,
 * password handling, tokens, and sessions
 */

import type {
  User,
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ChangePasswordRequest,
  UpdateProfileRequest,
  UserStats
} from '@yois-games/shared'

import { PasswordService } from './PasswordService'
import { TokenService } from './TokenService'
import { SessionService } from './SessionService'
import type {
  EmailService
} from '../email/EmailService'
import type {
  WelcomeEmailData,
  PasswordResetEmailData
} from '@yois-games/shared'

// Reason: Interface for database operations, will be implemented with actual DB later
interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  findByUsername(username: string): Promise<User | null>
  create(user: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  update(id: string, updates: Partial<User>): Promise<User | null>
  delete(id: string): Promise<boolean>
  updateLastLogin(id: string): Promise<void>
  incrementLoginAttempts(email: string): Promise<number>
  resetLoginAttempts(email: string): Promise<void>
  isBlocked(email: string): Promise<boolean>
}

interface AuditLogger {
  logAuthentication(userId: string, action: string, success: boolean, metadata?: Record<string, any>): Promise<void>
  logSecurityEvent(userId: string | null, event: string, metadata?: Record<string, any>): Promise<void>
}

export class AuthService {
  private userRepository: UserRepository
  private sessionService: SessionService
  private auditLogger: AuditLogger
  private emailService: EmailService

  constructor(
    userRepository: UserRepository,
    sessionService: SessionService,
    auditLogger: AuditLogger,
    emailService: EmailService
  ) {
    this.userRepository = userRepository
    this.sessionService = sessionService
    this.auditLogger = auditLogger
    this.emailService = emailService
  }

  /**
   * Register a new user
   * @param request - Registration request data
   * @param clientInfo - Client information for session
   * @returns Promise with authentication response
   */
  async register(
    request: RegisterRequest,
    clientInfo?: { ipAddress?: string; userAgent?: string; deviceInfo?: Record<string, any> }
  ): Promise<AuthResponse> {
    try {
      // Validate input
      if (!request.username || !request.email || !request.password) {
        throw new Error('Username, email, and password are required')
      }

      if (!request.acceptedTerms) {
        throw new Error('You must accept the terms and conditions')
      }

      // Check if user already exists
      const existingEmail = await this.userRepository.findByEmail(request.email)
      if (existingEmail) {
        throw new Error('Email already registered')
      }

      const existingUsername = await this.userRepository.findByUsername(request.username)
      if (existingUsername) {
        throw new Error('Username already taken')
      }

      // Validate password strength
      const passwordValidation = PasswordService.validatePassword(request.password)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '))
      }

      // Hash password
      const passwordHash = await PasswordService.hashPassword(request.password)

      // Create user
      const userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { passwordHash: string } = {
        username: request.username,
        email: request.email,
        passwordHash: passwordHash,
        balance: 100.00, // Starting bonus
        level: 1,
        experiencePoints: 0,
        totalWagered: 0,
        totalWon: 0,
        gamesPlayed: 0,
        isActive: true,
        isVerified: false // TODO: Implement email verification
      }

      const user = await this.userRepository.create(userData)

      // Create session
      const session = await this.sessionService.createSession(
        user.id,
        clientInfo?.deviceInfo,
        clientInfo?.ipAddress,
        clientInfo?.userAgent
      )

      // Generate tokens
      const tokens = await TokenService.createTokenPair(user, session.id)

      // Log successful registration
      await this.auditLogger.logAuthentication(user.id, 'register', true, {
        username: user.username,
        email: user.email,
        ipAddress: clientInfo?.ipAddress
      })

      // Send welcome email
      try {
        const welcomeData: WelcomeEmailData = {
          username: user.username,
          email: user.email,
          loginUrl: `${process.env.FRONTEND_URL}/auth/login`
        }

        const emailResult = await this.emailService.sendWelcomeEmail(welcomeData)
        if (!emailResult.success) {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error)
          // Don't fail registration if email fails
        }
      } catch (error) {
        console.warn('⚠️ Welcome email error:', error)
        // Don't fail registration if email fails
      }

      return {
        success: true,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      }

    } catch (error) {
      // Log failed registration attempt
      await this.auditLogger.logSecurityEvent(null, 'failed_registration', {
        email: request.email,
        username: request.username,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: clientInfo?.ipAddress
      })

      throw error
    }
  }

  /**
   * Authenticate user login
   * @param request - Login request data
   * @param clientInfo - Client information for session
   * @returns Promise with authentication response
   */
  async login(
    request: LoginRequest,
    clientInfo?: { ipAddress?: string; userAgent?: string; deviceInfo?: Record<string, any> }
  ): Promise<AuthResponse> {
    try {
      // Check if account is blocked
      if (await this.userRepository.isBlocked(request.email)) {
        throw new Error('Account temporarily blocked due to too many failed attempts')
      }

      // Find user by email
      const user = await this.userRepository.findByEmail(request.email)
      if (!user) {
        await this.userRepository.incrementLoginAttempts(request.email)
        throw new Error('Invalid email or password')
      }

      // Verify password - ensure passwordHash exists in backend context
      if (!user.passwordHash) {
        throw new Error('User password hash not found')
      }
      const isValidPassword = await PasswordService.verifyPassword(request.password, user.passwordHash)
      if (!isValidPassword) {
        await this.userRepository.incrementLoginAttempts(request.email)
        await this.auditLogger.logAuthentication(user.id, 'failed_login', false, {
          reason: 'invalid_password',
          ipAddress: clientInfo?.ipAddress
        })
        throw new Error('Invalid email or password')
      }

      // Check if user account is active
      if (!user.isActive) {
        await this.auditLogger.logSecurityEvent(user.id, 'inactive_account_access', {
          ipAddress: clientInfo?.ipAddress
        })
        throw new Error('Account is deactivated')
      }

      // Reset login attempts on successful authentication
      await this.userRepository.resetLoginAttempts(request.email)

      // Enforce session limits if needed
      if (await this.sessionService.hasExceededSessionLimit(user.id)) {
        await this.sessionService.enforceSessionLimit(user.id)
      }

      // Create new session
      const session = await this.sessionService.createSession(
        user.id,
        clientInfo?.deviceInfo,
        clientInfo?.ipAddress,
        clientInfo?.userAgent
      )

      // Update last login time
      await this.userRepository.updateLastLogin(user.id)

      // Generate tokens
      const tokens = await TokenService.createTokenPair(user, session.id)

      // Log successful login
      await this.auditLogger.logAuthentication(user.id, 'login', true, {
        sessionId: session.id,
        ipAddress: clientInfo?.ipAddress
      })

      return {
        success: true,
        user,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      }

    } catch (error) {
      // Log failed login attempt
      await this.auditLogger.logSecurityEvent(null, 'failed_login', {
        email: request.email,
        error: error instanceof Error ? error.message : 'Unknown error',
        ipAddress: clientInfo?.ipAddress
      })

      throw error
    }
  }

  /**
   * Refresh authentication tokens
   * @param request - Refresh token request
   * @returns Promise with new tokens
   */
  async refreshToken(request: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    try {
      // Verify refresh token
      const tokenData = await TokenService.verifyRefreshToken(request.refreshToken)
      if (!tokenData) {
        throw new Error('Invalid refresh token')
      }

      // Get session
      const session = await this.sessionService.getSession(tokenData.sessionId)
      if (!session || !session.isActive) {
        throw new Error('Session not found or inactive')
      }

      // Get user
      const user = await this.userRepository.findById(tokenData.sub)
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive')
      }

      // Update session activity
      await this.sessionService.updateSessionActivity(session.id)

      // Generate new tokens
      const tokens = await TokenService.createTokenPair(user, session.id)

      // Log token refresh
      await this.auditLogger.logAuthentication(user.id, 'token_refresh', true, {
        sessionId: session.id
      })

      return {
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt
      }

    } catch (error) {
      await this.auditLogger.logSecurityEvent(null, 'failed_token_refresh', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })

      throw error
    }
  }

  /**
   * Logout user and invalidate session
   * @param userId - User ID
   * @param sessionId - Session ID to logout (optional, all if not provided)
   * @param allDevices - Whether to logout from all devices
   * @returns Promise with boolean result
   */
  async logout(userId: string, sessionId?: string, allDevices: boolean = false): Promise<boolean> {
    try {
      let loggedOut = false

      if (allDevices) {
        const deletedCount = await this.sessionService.deleteUserSessions(userId)
        loggedOut = deletedCount > 0
      } else if (sessionId) {
        loggedOut = await this.sessionService.deleteSession(sessionId)
      } else {
        // Default: logout current session only
        const sessions = await this.sessionService.getActiveSessions(userId)
        if (sessions.length > 0) {
          if (sessions[0]) {
            loggedOut = await this.sessionService.deleteSession(sessions[0].id)
          }
        }
      }

      if (loggedOut) {
        await this.auditLogger.logAuthentication(userId, 'logout', true, {
          sessionId,
          allDevices
        })
      }

      return loggedOut
    } catch (error) {
      await this.auditLogger.logSecurityEvent(userId, 'logout_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Change user password
   * @param userId - User ID
   * @param request - Change password request
   * @returns Promise with boolean result
   */
  async changePassword(userId: string, request: ChangePasswordRequest): Promise<boolean> {
    try {
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Verify current password
      if (!user.passwordHash) {
        throw new Error('User password hash not found')
      }
      const isValidPassword = await PasswordService.verifyPassword(request.currentPassword, user.passwordHash)
      if (!isValidPassword) {
        await this.auditLogger.logSecurityEvent(userId, 'failed_password_change', {
          reason: 'invalid_current_password'
        })
        throw new Error('Current password is incorrect')
      }

      // Validate new password
      if (request.newPassword !== request.confirmPassword) {
        throw new Error('New passwords do not match')
      }

      const passwordValidation = PasswordService.validatePassword(request.newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '))
      }

      // Hash new password
      const newPasswordHash = await PasswordService.hashPassword(request.newPassword)

      // Update user password
      const updatedUser = await this.userRepository.update(userId, {
        passwordHash: newPasswordHash
      })

      if (!updatedUser) {
        throw new Error('Failed to update password')
      }

      // Invalidate all sessions except current one (force re-login on other devices)
      const sessions = await this.sessionService.getUserSessions(userId)
      for (const session of sessions.slice(1)) { // Keep first session (current)
        await this.sessionService.deleteSession(session.id)
      }

      await this.auditLogger.logSecurityEvent(userId, 'password_changed', {})

      return true
    } catch (error) {
      await this.auditLogger.logSecurityEvent(userId, 'password_change_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param request - Update profile request
   * @returns Promise with updated user
   */
  async updateProfile(userId: string, request: UpdateProfileRequest): Promise<User> {
    try {
      const user = await this.userRepository.findById(userId)
      if (!user) {
        throw new Error('User not found')
      }

      const updates: Partial<User> = {}

      if (request.username && request.username !== user.username) {
        // Check if username is available
        const existingUser = await this.userRepository.findByUsername(request.username)
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Username already taken')
        }
        updates.username = request.username
      }

      if (request.email && request.email !== user.email) {
        // Check if email is available
        const existingUser = await this.userRepository.findByEmail(request.email)
        if (existingUser && existingUser.id !== userId) {
          throw new Error('Email already registered')
        }
        updates.email = request.email
        updates.isVerified = false // Re-verify email
      }

      if (request.avatarUrl !== undefined) {
        updates.avatarUrl = request.avatarUrl
      }

      if (Object.keys(updates).length === 0) {
        return user // No updates needed
      }

      const updatedUser = await this.userRepository.update(userId, updates)
      if (!updatedUser) {
        throw new Error('Failed to update profile')
      }

      await this.auditLogger.logSecurityEvent(userId, 'profile_updated', {
        changes: Object.keys(updates)
      })

      return updatedUser
    } catch (error) {
      await this.auditLogger.logSecurityEvent(userId, 'profile_update_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      throw error
    }
  }

  /**
   * Get user by ID
   * @param userId - User ID
   * @returns Promise with user or null
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId)
  }

  /**
   * Verify user session and get user data
   * @param sessionToken - Session token
   * @returns Promise with user data or null
   */
  async verifySession(sessionToken: string): Promise<User | null> {
    try {
      const session = await this.sessionService.getSessionByToken(sessionToken)
      if (!session) {
        return null
      }

      const user = await this.userRepository.findById(session.userId)
      if (!user || !user.isActive) {
        return null
      }

      // Update session activity
      await this.sessionService.updateSessionActivity(session.id)

      return user
    } catch (error) {
      return null
    }
  }

  /**
   * Get user statistics
   * @param userId - User ID
   * @returns Promise with user statistics
   */
  async getUserStats(userId: string): Promise<UserStats> {
    const user = await this.userRepository.findById(userId)
    if (!user) {
      throw new Error('User not found')
    }

    // Calculate derived statistics
    const winRate = user.gamesPlayed > 0 ? (user.totalWon / user.totalWagered) * 100 : 0
    const netProfit = user.totalWon - user.totalWagered
    const averageBet = user.gamesPlayed > 0 ? user.totalWagered / user.gamesPlayed : 0

    return {
      totalBets: user.gamesPlayed,
      totalWagered: user.totalWagered,
      totalWon: user.totalWon,
      netProfit,
      winRate,
      // favoriteGame is omitted since it's optional and not implemented yet
      longestWinStreak: 0, // TODO: Implement win streak tracking
      biggestWin: 0, // TODO: Track biggest win
      averageBet
    }
  }

  /**
   * Request password reset email
   * @param email - User email address
   * @returns Promise with boolean result
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        // Don't reveal if user exists for security
        console.log('Password reset requested for non-existent email:', email)
        return true // Return true anyway for security
      }

      // Generate reset token (using JWT with short expiry)
      const resetTokenData = {
        sub: user.id,
        email: user.email,
        purpose: 'password-reset',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
      }

      const resetToken = await TokenService.createTokenPair(user, 'temp-session').then(t => t.accessToken)

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`

      // Send password reset email
      const passwordResetData: PasswordResetEmailData = {
        username: user.username,
        email: user.email,
        resetToken,
        resetUrl,
        expiresInHours: 1
      }

      const emailResult = await this.emailService.sendPasswordResetEmail(passwordResetData)

      if (emailResult.success) {
        await this.auditLogger.logSecurityEvent(user.id, 'password_reset_requested', {
          email: user.email,
          messageId: emailResult.messageId
        })
        console.log('✅ Password reset email sent successfully to:', email)
        return true
      } else {
        console.error('❌ Failed to send password reset email:', emailResult.error)
        await this.auditLogger.logSecurityEvent(user.id, 'password_reset_email_failed', {
          email: user.email,
          error: emailResult.error
        })
        return false
      }
    } catch (error) {
      console.error('❌ Password reset request error:', error)
      await this.auditLogger.logSecurityEvent(null, 'password_reset_error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Reset password using reset token
   * @param token - Reset token from email
   * @param newPassword - New password
   * @returns Promise with boolean result
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    try {
      // Verify and decode reset token
      const tokenData = await TokenService.verifyAccessToken(token)
      if (!tokenData) {
        throw new Error('Invalid or expired reset token')
      }

      // Find user
      const user = await this.userRepository.findById(tokenData.sub)
      if (!user) {
        throw new Error('User not found')
      }

      // Validate new password
      const passwordValidation = PasswordService.validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '))
      }

      // Hash new password
      const newPasswordHash = await PasswordService.hashPassword(newPassword)

      // Update user password
      const updatedUser = await this.userRepository.update(user.id, {
        passwordHash: newPasswordHash
      })

      if (!updatedUser) {
        throw new Error('Failed to update password')
      }

      // Invalidate all user sessions (force re-login on all devices)
      await this.sessionService.deleteUserSessions(user.id)

      // Log successful password reset
      await this.auditLogger.logSecurityEvent(user.id, 'password_reset_completed', {
        email: user.email
      })

      console.log('✅ Password reset completed successfully for user:', user.email)
      return true
    } catch (error) {
      console.error('❌ Password reset with token error:', error)
      await this.auditLogger.logSecurityEvent(null, 'password_reset_token_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Request password reset email
   * @param email - User email address
   * @returns Promise with boolean result
   */
  async requestPasswordReset(email: string): Promise<boolean> {
    try {
      // Find user by email
      const user = await this.userRepository.findByEmail(email)
      if (!user) {
        // Don't reveal if user exists for security
        console.log('Password reset requested for non-existent email:', email)
        return true // Return true anyway for security
      }

      // Generate reset token (using JWT with short expiry)
      const resetTokenData = {
        userId: user.id,
        email: user.email,
        purpose: 'password-reset',
        exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour expiry
      }

      const resetToken = await TokenService.createCustomToken(resetTokenData)

      // Create reset URL
      const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${resetToken}`

      // Send password reset email
      const passwordResetData: PasswordResetEmailData = {
        username: user.username,
        email: user.email,
        resetToken,
        resetUrl,
        expiresInHours: 1
      }

      const emailResult = await this.emailService.sendPasswordResetEmail(passwordResetData)

      if (emailResult.success) {
        await this.auditLogger.logSecurityEvent(user.id, 'password_reset_requested', {
          email: user.email,
          messageId: emailResult.messageId
        })
        console.log('✅ Password reset email sent successfully to:', email)
        return true
      } else {
        console.error('❌ Failed to send password reset email:', emailResult.error)
        await this.auditLogger.logSecurityEvent(user.id, 'password_reset_email_failed', {
          email: user.email,
          error: emailResult.error
        })
        return false
      }
    } catch (error) {
      console.error('❌ Password reset request error:', error)
      await this.auditLogger.logSecurityEvent(null, 'password_reset_error', {
        email,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }

  /**
   * Reset password using reset token
   * @param token - Reset token from email
   * @param newPassword - New password
   * @returns Promise with boolean result
   */
  async resetPasswordWithToken(token: string, newPassword: string): Promise<boolean> {
    try {
      // Verify and decode reset token
      const tokenData = await TokenService.verifyCustomToken(token)
      if (!tokenData || tokenData.purpose !== 'password-reset') {
        throw new Error('Invalid or expired reset token')
      }

      // Find user
      const user = await this.userRepository.findById(tokenData.userId)
      if (!user) {
        throw new Error('User not found')
      }

      // Validate new password
      const passwordValidation = PasswordService.validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.errors.join(', '))
      }

      // Hash new password
      const newPasswordHash = await PasswordService.hashPassword(newPassword)

      // Update user password
      const updatedUser = await this.userRepository.update(user.id, {
        passwordHash: newPasswordHash
      })

      if (!updatedUser) {
        throw new Error('Failed to update password')
      }

      // Invalidate all user sessions (force re-login on all devices)
      await this.sessionService.deleteUserSessions(user.id)

      // Log successful password reset
      await this.auditLogger.logSecurityEvent(user.id, 'password_reset_completed', {
        email: user.email
      })

      console.log('✅ Password reset completed successfully for user:', user.email)
      return true
    } catch (error) {
      console.error('❌ Password reset with token error:', error)
      await this.auditLogger.logSecurityEvent(null, 'password_reset_token_error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      })
      return false
    }
  }
}