/**
 * Session Service
 * Handles user session management, storage, and cleanup
 */

import type { UserSession } from '@yois-games/shared'
import { TokenService } from './TokenService'

// Reason: Interface for database operations, will be implemented with actual DB later
interface SessionRepository {
  create(session: Omit<UserSession, 'id' | 'createdAt'>): Promise<UserSession>
  findById(sessionId: string): Promise<UserSession | null>
  findByUserId(userId: string): Promise<UserSession[]>
  findByToken(sessionToken: string): Promise<UserSession | null>
  update(sessionId: string, updates: Partial<UserSession>): Promise<UserSession | null>
  delete(sessionId: string): Promise<boolean>
  deleteByUserId(userId: string): Promise<number>
  deleteExpired(): Promise<number>
}

export class SessionService {
  private repository: SessionRepository

  constructor(repository: SessionRepository) {
    this.repository = repository
  }

  /**
   * Create a new user session
   * @param userId - User ID for the session
   * @param deviceInfo - Device/browser information
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @returns Promise with created session
   */
  async createSession(
    userId: string,
    deviceInfo?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<UserSession> {
    const sessionId = TokenService.generateSessionId()
    const sessionToken = TokenService.generateSecureToken(64)
    const refreshToken = TokenService.generateSecureToken(64)

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days from now

    const session = await this.repository.create({
      userId,
      sessionToken,
      refreshToken,
      deviceInfo: deviceInfo || {},
      ...(ipAddress ? { ipAddress } : {}),
      ...(userAgent ? { userAgent } : {}),
      isActive: true,
      expiresAt: expiresAt.toISOString(),
      lastUsedAt: new Date().toISOString()
    })

    return session
  }

  /**
   * Get session by ID
   * @param sessionId - Session ID to find
   * @returns Promise with session or null
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    return await this.repository.findById(sessionId)
  }

  /**
   * Get session by session token
   * @param sessionToken - Session token to find
   * @returns Promise with session or null
   */
  async getSessionByToken(sessionToken: string): Promise<UserSession | null> {
    const session = await this.repository.findByToken(sessionToken)

    if (!session || !session.isActive) {
      return null
    }

    // Check if session is expired
    if (new Date(session.expiresAt) < new Date()) {
      await this.deactivateSession(session.id)
      return null
    }

    return session
  }

  /**
   * Get all sessions for a user
   * @param userId - User ID to find sessions for
   * @returns Promise with array of sessions
   */
  async getUserSessions(userId: string): Promise<UserSession[]> {
    return await this.repository.findByUserId(userId)
  }

  /**
   * Get active sessions for a user
   * @param userId - User ID to find active sessions for
   * @returns Promise with array of active sessions
   */
  async getActiveSessions(userId: string): Promise<UserSession[]> {
    const sessions = await this.repository.findByUserId(userId)
    const now = new Date()

    return sessions.filter(session =>
      session.isActive && new Date(session.expiresAt) > now
    )
  }

  /**
   * Update session activity
   * @param sessionId - Session ID to update
   * @returns Promise with updated session or null
   */
  async updateSessionActivity(sessionId: string): Promise<UserSession | null> {
    return await this.repository.update(sessionId, {
      lastUsedAt: new Date().toISOString()
    })
  }

  /**
   * Deactivate a session
   * @param sessionId - Session ID to deactivate
   * @returns Promise with boolean result
   */
  async deactivateSession(sessionId: string): Promise<boolean> {
    const result = await this.repository.update(sessionId, {
      isActive: false
    })
    return result !== null
  }

  /**
   * Delete a session
   * @param sessionId - Session ID to delete
   * @returns Promise with boolean result
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    return await this.repository.delete(sessionId)
  }

  /**
   * Delete all sessions for a user (logout all devices)
   * @param userId - User ID to delete sessions for
   * @returns Promise with number of deleted sessions
   */
  async deleteUserSessions(userId: string): Promise<number> {
    return await this.repository.deleteByUserId(userId)
  }

  /**
   * Deactivate all sessions for a user except current one
   * @param userId - User ID to deactivate sessions for
   * @param currentSessionId - Session ID to keep active
   * @returns Promise with number of deactivated sessions
   */
  async deactivateOtherSessions(userId: string, currentSessionId: string): Promise<number> {
    const sessions = await this.repository.findByUserId(userId)
    let deactivated = 0

    for (const session of sessions) {
      if (session.id !== currentSessionId && session.isActive) {
        const success = await this.deactivateSession(session.id)
        if (success) deactivated++
      }
    }

    return deactivated
  }

  /**
   * Validate session and refresh if needed
   * @param sessionToken - Session token to validate
   * @param refreshThreshold - Time in minutes before expiry to refresh (default 60)
   * @returns Promise with session info and refresh status
   */
  async validateAndRefreshSession(
    sessionToken: string,
    refreshThreshold: number = 60
  ): Promise<{
    session: UserSession | null
    needsRefresh: boolean
    timeToExpiry: number
  }> {
    const session = await this.getSessionByToken(sessionToken)

    if (!session) {
      return {
        session: null,
        needsRefresh: false,
        timeToExpiry: 0
      }
    }

    const expiryTime = new Date(session.expiresAt).getTime()
    const currentTime = new Date().getTime()
    const timeToExpiry = Math.max(0, expiryTime - currentTime)
    const minutesToExpiry = timeToExpiry / (1000 * 60)

    const needsRefresh = minutesToExpiry <= refreshThreshold

    if (needsRefresh) {
      // Extend session by 7 days
      const newExpiryDate = new Date()
      newExpiryDate.setDate(newExpiryDate.getDate() + 7)

      await this.repository.update(session.id, {
        expiresAt: newExpiryDate.toISOString(),
        lastUsedAt: new Date().toISOString()
      })
    }

    return {
      session,
      needsRefresh,
      timeToExpiry: Math.floor(timeToExpiry / 1000) // Convert to seconds
    }
  }

  /**
   * Clean up expired sessions
   * @returns Promise with number of cleaned up sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    return await this.repository.deleteExpired()
  }

  /**
   * Get session statistics for a user
   * @param userId - User ID to get stats for
   * @returns Promise with session statistics
   */
  async getSessionStats(userId: string): Promise<{
    totalSessions: number
    activeSessions: number
    expiredSessions: number
    lastActivity: string | null
    mostRecentDevice: string | null
  }> {
    const sessions = await this.repository.findByUserId(userId)
    const now = new Date()

    const activeSessions = sessions.filter(s =>
      s.isActive && new Date(s.expiresAt) > now
    ).length

    const expiredSessions = sessions.filter(s =>
      !s.isActive || new Date(s.expiresAt) <= now
    ).length

    const lastActivity = sessions.length > 0
      ? sessions.reduce((latest, session) => {
        const sessionTime = new Date(session.lastUsedAt)
        const latestTime = latest ? new Date(latest) : new Date(0)
        return sessionTime > latestTime ? session.lastUsedAt : latest
      }, sessions[0]?.lastUsedAt)
      : null

    const mostRecentSession = sessions.length > 0
      ? sessions.reduce((latest, session) => {
        const sessionTime = new Date(session.lastUsedAt)
        const latestTime = latest ? new Date(latest.lastUsedAt) : new Date()
        return sessionTime > latestTime ? session : latest
      }, sessions[0])
      : null

    const mostRecentDevice = mostRecentSession?.deviceInfo?.platform ||
      mostRecentSession?.userAgent?.split(' ')[0] ||
      null

    return {
      totalSessions: sessions.length,
      activeSessions,
      expiredSessions,
      lastActivity: lastActivity || null,
      mostRecentDevice
    }
  }

  /**
   * Check if user has exceeded maximum concurrent sessions
   * @param userId - User ID to check
   * @param maxSessions - Maximum allowed concurrent sessions (default 5)
   * @returns Promise with boolean result
   */
  async hasExceededSessionLimit(userId: string, maxSessions: number = 5): Promise<boolean> {
    const activeSessions = await this.getActiveSessions(userId)
    return activeSessions.length >= maxSessions
  }

  /**
   * Remove oldest sessions to stay within limit
   * @param userId - User ID to clean up sessions for
   * @param maxSessions - Maximum allowed sessions (default 5)
   * @returns Promise with number of removed sessions
   */
  async enforceSessionLimit(userId: string, maxSessions: number = 5): Promise<number> {
    const activeSessions = await this.getActiveSessions(userId)

    if (activeSessions.length <= maxSessions) {
      return 0
    }

    // Sort by last used time, oldest first
    const sortedSessions = activeSessions.sort((a, b) =>
      new Date(a.lastUsedAt).getTime() - new Date(b.lastUsedAt).getTime()
    )

    const sessionsToRemove = sortedSessions.slice(0, activeSessions.length - maxSessions)
    let removedCount = 0

    for (const session of sessionsToRemove) {
      const success = await this.deleteSession(session.id)
      if (success) removedCount++
    }

    return removedCount
  }
}