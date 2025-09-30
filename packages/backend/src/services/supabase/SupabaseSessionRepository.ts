/**
 * Supabase Session Repository
 * Handles all user session database operations using Supabase
 * Enhanced with Redis caching for improved performance
 * Updated to match UserSession interface and implement all required methods
 */

import { supabaseService } from '../../database/supabase'
import { getRedisService } from '../cache/RedisService'
import type { UserSession } from '@yois-games/shared'

export class SupabaseSessionRepository {
  private readonly CACHE_TTL = 3600 // 1 hour in seconds

  /**
   * Get Redis service instance
   */
  private getRedis() {
    try {
      return getRedisService()
    } catch (error) {
      console.warn('⚠️ Redis not available, using Supabase only:', error)
      return null
    }
  }

  /**
   * Generate cache key for session
   */
  private getSessionCacheKey(id: string): string {
    return `session:${id}`
  }

  /**
   * Generate cache key for session by token
   */
  private getSessionTokenCacheKey(token: string): string {
    return `session_token:${token}`
  }

  /**
   * Generate cache key for user sessions
   */
  private getUserSessionsCacheKey(userId: string): string {
    return `user_sessions:${userId}`
  }

  /**
   * Cache session data
   */
  private async cacheSession(session: UserSession): Promise<void> {
    try {
      const redis = this.getRedis()
      if (!redis) return

      const sessionData = JSON.stringify(session)

      // Cache by ID
      await redis.set(this.getSessionCacheKey(session.id), sessionData, this.CACHE_TTL)

      // Cache by token for fast token lookups
      await redis.set(this.getSessionTokenCacheKey(session.sessionToken), sessionData, this.CACHE_TTL)
    } catch (error) {
      console.warn('⚠️ Failed to cache session:', error)
    }
  }

  /**
   * Get cached session by ID
   */
  private async getCachedSession(id: string): Promise<UserSession | null> {
    try {
      const redis = this.getRedis()
      if (!redis) return null

      const data = await redis.get(this.getSessionCacheKey(id))
      if (!data) return null

      return JSON.parse(data as string) as UserSession
    } catch (error) {
      console.warn('⚠️ Failed to get cached session:', error)
      return null
    }
  }

  /**
   * Get cached session by token
   */
  private async getCachedSessionByToken(token: string): Promise<UserSession | null> {
    try {
      const redis = this.getRedis()
      if (!redis) return null

      const data = await redis.get(this.getSessionTokenCacheKey(token))
      if (!data) return null

      return JSON.parse(data as string) as UserSession
    } catch (error) {
      console.warn('⚠️ Failed to get cached session by token:', error)
      return null
    }
  }

  /**
   * Invalidate session caches
   */
  private async invalidateSessionCache(session: UserSession): Promise<void> {
    try {
      const redis = this.getRedis()
      if (!redis) return

      // Remove session cache
      await redis.del(this.getSessionCacheKey(session.id))
      await redis.del(this.getSessionTokenCacheKey(session.sessionToken))

      // Invalidate user sessions list cache
      await redis.del(this.getUserSessionsCacheKey(session.userId))
    } catch (error) {
      console.warn('⚠️ Failed to invalidate session cache:', error)
    }
  }
  /**
   * Create a new session in the database
   * @param sessionData Session data without id and createdAt
   * @returns Promise with created session
   */
  async create(sessionData: Omit<UserSession, 'id' | 'createdAt'>): Promise<UserSession> {
    try {
      console.log('🔧 SupabaseSessionRepository: Creating session for user:', sessionData.userId)

      const { data: session, error } = await supabaseService
        .from('user_sessions')
        .insert({
          user_id: sessionData.userId,
          session_token: sessionData.sessionToken,
          refresh_token: sessionData.refreshToken,
          device_info: sessionData.deviceInfo || {},
          ip_address: sessionData.ipAddress,
          user_agent: sessionData.userAgent,
          is_active: sessionData.isActive,
          expires_at: sessionData.expiresAt,
          last_used_at: sessionData.lastUsedAt
        })
        .select()
        .single()

      if (error) {
        console.error('❌ Supabase create session error:', error)
        throw new Error('Failed to create session: ' + error.message)
      }

      if (!session) {
        throw new Error('Session creation returned no data')
      }

      const createdSession: UserSession = {
        id: session.id,
        userId: session.user_id,
        sessionToken: session.session_token,
        refreshToken: session.refresh_token,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        lastUsedAt: session.last_used_at,
        createdAt: session.created_at
      }

      console.log('✅ Session created successfully:', createdSession.id)
      return createdSession
    } catch (error) {
      console.error('❌ Error creating session:', error)
      throw error instanceof Error ? error : new Error('Failed to create session')
    }
  }

  /**
   * Find session by ID
   * @param id Session ID
   * @returns Promise with session or null
   */
  async findById(id: string): Promise<UserSession | null> {
    try {
      console.log('🔍 SupabaseSessionRepository: Finding session by ID:', id)

      const { data: session, error } = await supabaseService
        .from('user_sessions')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !session) {
        console.log('📝 Session not found by ID:', id)
        return null
      }

      const foundSession: UserSession = {
        id: session.id,
        userId: session.user_id,
        sessionToken: session.session_token,
        refreshToken: session.refresh_token,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        lastUsedAt: session.last_used_at,
        createdAt: session.created_at
      }

      console.log('✅ Session found by ID:', foundSession.id)
      return foundSession
    } catch (error) {
      console.error('❌ Error finding session by ID:', error)
      return null
    }
  }

  /**
   * Find session by session token
   * @param sessionToken Session token to find
   * @returns Promise with session or null
   */
  async findByToken(sessionToken: string): Promise<UserSession | null> {
    try {
      console.log('🔍 SupabaseSessionRepository: Finding session by token')

      const { data: session, error } = await supabaseService
        .from('user_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('is_active', true)
        .single()

      if (error || !session) {
        console.log('📝 Session not found by token')
        return null
      }

      const foundSession: UserSession = {
        id: session.id,
        userId: session.user_id,
        sessionToken: session.session_token,
        refreshToken: session.refresh_token,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        lastUsedAt: session.last_used_at,
        createdAt: session.created_at
      }

      console.log('✅ Session found by token:', foundSession.id)
      return foundSession
    } catch (error) {
      console.error('❌ Error finding session by token:', error)
      return null
    }
  }

  /**
   * Update session data
   * @param id Session ID to update
   * @param updateData Partial session data to update
   * @returns Promise with updated session or null
   */
  async update(id: string, updateData: Partial<UserSession>): Promise<UserSession | null> {
    try {
      console.log('🔧 SupabaseSessionRepository: Updating session:', id)

      const supabaseUpdateData: any = {}

      if (updateData.sessionToken !== undefined) supabaseUpdateData.session_token = updateData.sessionToken
      if (updateData.refreshToken !== undefined) supabaseUpdateData.refresh_token = updateData.refreshToken
      if (updateData.deviceInfo !== undefined) supabaseUpdateData.device_info = updateData.deviceInfo
      if (updateData.ipAddress !== undefined) supabaseUpdateData.ip_address = updateData.ipAddress
      if (updateData.userAgent !== undefined) supabaseUpdateData.user_agent = updateData.userAgent
      if (updateData.isActive !== undefined) supabaseUpdateData.is_active = updateData.isActive
      if (updateData.expiresAt !== undefined) supabaseUpdateData.expires_at = updateData.expiresAt
      if (updateData.lastUsedAt !== undefined) supabaseUpdateData.last_used_at = updateData.lastUsedAt

      // Always update the last used time when updating a session
      supabaseUpdateData.last_used_at = new Date().toISOString()

      const { data: session, error } = await supabaseService
        .from('user_sessions')
        .update(supabaseUpdateData)
        .eq('id', id)
        .select()
        .single()

      if (error || !session) {
        console.error('❌ Error updating session:', error)
        return null
      }

      const updatedSession: UserSession = {
        id: session.id,
        userId: session.user_id,
        sessionToken: session.session_token,
        refreshToken: session.refresh_token,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        lastUsedAt: session.last_used_at,
        createdAt: session.created_at
      }

      console.log('✅ Session updated successfully:', updatedSession.id)
      return updatedSession
    } catch (error) {
      console.error('❌ Error updating session:', error)
      return null
    }
  }

  /**
   * Delete session by ID
   * @param id Session ID to delete
   * @returns Promise with boolean result
   */
  async delete(id: string): Promise<boolean> {
    try {
      console.log('🗑️ SupabaseSessionRepository: Deleting session:', id)

      const { error } = await supabaseService
        .from('user_sessions')
        .delete()
        .eq('id', id)

      const success = !error
      if (success) {
        console.log('✅ Session deleted successfully:', id)
      } else {
        console.error('❌ Error deleting session:', error)
      }

      return success
    } catch (error) {
      console.error('❌ Error deleting session:', error)
      return false
    }
  }

  /**
   * Find all sessions for a user
   * @param userId User ID
   * @returns Promise with array of sessions
   */
  async findByUserId(userId: string): Promise<UserSession[]> {
    try {
      console.log('🔍 SupabaseSessionRepository: Finding sessions for user:', userId)

      const { data: sessions, error } = await supabaseService
        .from('user_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('last_used_at', { ascending: false })

      if (error) {
        console.error('❌ Error finding sessions by user ID:', error)
        return []
      }

      const userSessions = sessions?.map(session => ({
        id: session.id,
        userId: session.user_id,
        sessionToken: session.session_token,
        refreshToken: session.refresh_token,
        deviceInfo: session.device_info,
        ipAddress: session.ip_address,
        userAgent: session.user_agent,
        isActive: session.is_active,
        expiresAt: session.expires_at,
        lastUsedAt: session.last_used_at,
        createdAt: session.created_at
      } as UserSession)) || []

      console.log(`✅ Found ${userSessions.length} sessions for user:`, userId)
      return userSessions
    } catch (error) {
      console.error('❌ Error finding sessions by user ID:', error)
      return []
    }
  }

  /**
   * Delete all sessions for a user
   * @param userId User ID
   * @returns Promise with number of deleted sessions
   */
  async deleteByUserId(userId: string): Promise<number> {
    try {
      console.log('🗑️ SupabaseSessionRepository: Deleting all sessions for user:', userId)

      // First get the count of sessions to be deleted
      const { data: sessions, error: selectError } = await supabaseService
        .from('user_sessions')
        .select('id')
        .eq('user_id', userId)

      if (selectError) {
        console.error('❌ Error counting sessions for user:', selectError)
        return 0
      }

      const sessionCount = sessions?.length || 0

      // Delete all sessions for the user
      const { error } = await supabaseService
        .from('user_sessions')
        .delete()
        .eq('user_id', userId)

      if (error) {
        console.error('❌ Error deleting sessions by user ID:', error)
        return 0
      }

      console.log(`✅ Deleted ${sessionCount} sessions for user:`, userId)
      return sessionCount
    } catch (error) {
      console.error('❌ Error deleting sessions by user ID:', error)
      return 0
    }
  }

  /**
   * Delete expired sessions
   * @returns Promise with number of deleted sessions
   */
  async deleteExpired(): Promise<number> {
    try {
      console.log('🧹 SupabaseSessionRepository: Cleaning up expired sessions')

      const now = new Date().toISOString()

      // First count expired sessions
      const { data: expiredSessions, error: countError } = await supabaseService
        .from('user_sessions')
        .select('id')
        .lt('expires_at', now)

      if (countError) {
        console.error('❌ Error counting expired sessions:', countError)
        return 0
      }

      const expiredCount = expiredSessions?.length || 0

      if (expiredCount === 0) {
        console.log('📝 No expired sessions to delete')
        return 0
      }

      // Delete expired sessions
      const { error } = await supabaseService
        .from('user_sessions')
        .delete()
        .lt('expires_at', now)

      if (error) {
        console.error('❌ Error deleting expired sessions:', error)
        return 0
      }

      console.log(`✅ Deleted ${expiredCount} expired sessions`)
      return expiredCount
    } catch (error) {
      console.error('❌ Error deleting expired sessions:', error)
      return 0
    }
  }
}