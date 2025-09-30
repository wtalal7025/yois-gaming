/**
 * Token Service
 * Handles JWT token generation, validation, and management
 */

import * as jose from 'jose'
import crypto from 'crypto'
import type { JWTPayload } from '@stake-games/shared'

export class TokenService {
  private static readonly ACCESS_TOKEN_EXPIRY = '15m' // 15 minutes
  private static readonly REFRESH_TOKEN_EXPIRY = '7d' // 7 days
  private static readonly ISSUER = 'stake-games'
  private static readonly AUDIENCE = 'stake-games-clients'

  // Reason: Use environment variables for production, fallback for development
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production'
  private static readonly REFRESH_SECRET = process.env.REFRESH_SECRET || 'dev-refresh-key-change-in-production'

  // Convert string secrets to Uint8Array for jose
  private static getSecretKey(secret: string): Uint8Array {
    return new TextEncoder().encode(secret)
  }

  /**
   * Generate access token with user information
   * @param payload - JWT payload containing user information
   * @returns Promise with signed JWT token
   */
  static async generateAccessToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): Promise<string> {
    const secretKey = this.getSecretKey(this.JWT_SECRET)
    
    const jwt = await new jose.SignJWT({
      sub: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role || 'user',
      sessionId: payload.sessionId
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.ISSUER)
      .setAudience(this.AUDIENCE)
      .setExpirationTime(this.ACCESS_TOKEN_EXPIRY)
      .sign(secretKey)

    return jwt
  }

  /**
   * Generate refresh token
   * @param userId - User ID for the refresh token
   * @param sessionId - Session ID to link token to session
   * @returns Promise with signed refresh token
   */
  static async generateRefreshToken(userId: string, sessionId: string): Promise<string> {
    const secretKey = this.getSecretKey(this.REFRESH_SECRET)
    
    const jwt = await new jose.SignJWT({
      sub: userId,
      sessionId,
      type: 'refresh'
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setIssuer(this.ISSUER)
      .setAudience(this.AUDIENCE)
      .setExpirationTime(this.REFRESH_TOKEN_EXPIRY)
      .sign(secretKey)

    return jwt
  }

  /**
   * Verify and decode access token
   * @param token - JWT token to verify
   * @returns Promise with decoded payload or null if invalid
   */
  static async verifyAccessToken(token: string): Promise<JWTPayload | null> {
    try {
      const secretKey = this.getSecretKey(this.JWT_SECRET)
      
      const { payload } = await jose.jwtVerify(token, secretKey, {
        issuer: this.ISSUER,
        audience: this.AUDIENCE
      })

      return {
        sub: payload.sub as string,
        username: payload.username as string,
        email: payload.email as string,
        role: payload.role as string,
        sessionId: payload.sessionId as string,
        iat: payload.iat as number,
        exp: payload.exp as number
      }
    } catch (error) {
      // Reason: Don't log JWT verification errors to prevent log spam from invalid tokens
      return null
    }
  }

  /**
   * Verify and decode refresh token
   * @param token - Refresh token to verify
   * @returns Promise with decoded payload or null if invalid
   */
  static async verifyRefreshToken(token: string): Promise<{ sub: string; sessionId: string } | null> {
    try {
      const secretKey = this.getSecretKey(this.REFRESH_SECRET)
      
      const { payload } = await jose.jwtVerify(token, secretKey, {
        issuer: this.ISSUER,
        audience: this.AUDIENCE
      })

      if (payload.type !== 'refresh') {
        return null
      }

      return {
        sub: payload.sub as string,
        sessionId: payload.sessionId as string
      }
    } catch (error) {
      return null
    }
  }

  /**
   * Extract token from Authorization header
   * @param authHeader - Authorization header value
   * @returns Token string or null
   */
  static extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null
    }

    const parts = authHeader.split(' ')
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null
    }

    return parts[1]
  }

  /**
   * Generate secure random session ID
   * @returns Random session ID
   */
  static generateSessionId(): string {
    return crypto.randomUUID()
  }

  /**
   * Generate secure random token (for password reset, etc.)
   * @param length - Length of token to generate (default 32)
   * @returns Random token string
   */
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex')
  }

  /**
   * Get token expiry time as ISO string
   * @param token - Token to decode (no verification)
   * @returns Expiry time or null if invalid
   */
  static getTokenExpiry(token: string): string | null {
    try {
      const payload = jose.decodeJwt(token)
      if (!payload.exp) {
        return null
      }
      return new Date(payload.exp * 1000).toISOString()
    } catch (error) {
      return null
    }
  }

  /**
   * Check if token is expired
   * @param token - Token to check (no verification)
   * @returns Boolean indicating if token is expired
   */
  static isTokenExpired(token: string): boolean {
    try {
      const payload = jose.decodeJwt(token)
      if (!payload.exp) {
        return true
      }
      return Date.now() >= payload.exp * 1000
    } catch (error) {
      return true
    }
  }

  /**
   * Get remaining token lifetime in seconds
   * @param token - Token to check (no verification)
   * @returns Remaining seconds or 0 if expired/invalid
   */
  static getTokenRemainingTime(token: string): number {
    try {
      const payload = jose.decodeJwt(token)
      if (!payload.exp) {
        return 0
      }
      const remaining = Math.max(0, payload.exp * 1000 - Date.now())
      return Math.floor(remaining / 1000)
    } catch (error) {
      return 0
    }
  }

  /**
   * Create token pair for authentication response
   * @param user - User information for token
   * @param sessionId - Session ID for tokens
   * @returns Promise with access and refresh tokens plus expiry
   */
  static async createTokenPair(
    user: { id: string; username: string; email: string; role?: string }, 
    sessionId: string
  ): Promise<{ accessToken: string; refreshToken: string; expiresAt: string }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.generateAccessToken({
        sub: user.id,
        username: user.username,
        email: user.email,
        role: user.role || 'user',
        sessionId
      }),
      this.generateRefreshToken(user.id, sessionId)
    ])

    const expiresAt = this.getTokenExpiry(accessToken) || new Date(Date.now() + 15 * 60 * 1000).toISOString()

    return {
      accessToken,
      refreshToken,
      expiresAt
    }
  }
}