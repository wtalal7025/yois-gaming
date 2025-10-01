/**
 * Supabase User Repository
 * Handles all user database operations using Supabase
 */

import { supabaseService } from '../../database/supabase'
import type { User } from '@yois-games/shared'

interface UserWithPassword extends Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  passwordHash: string
}

export class SupabaseUserRepository {
  async findById(id: string): Promise<(User & { passwordHash?: string }) | null> {
    try {
      const { data: user, error } = await supabaseService
        .from('users')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !user) {
        console.log('User not found by ID:', id)
        return null
      }

      // Reason: Type assertion to ensure TypeScript recognizes the user object structure
      const typedUser = user as any

      return {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        avatarUrl: typedUser.avatar_url || undefined,
        balance: Number(typedUser.balance),
        level: typedUser.level,
        experiencePoints: typedUser.experience_points,
        totalWagered: Number(typedUser.total_wagered),
        totalWon: Number(typedUser.total_won),
        gamesPlayed: typedUser.games_played,
        isActive: typedUser.is_active,
        isVerified: typedUser.is_verified,
        lastLoginAt: typedUser.last_login_at?.toISOString(),
        createdAt: typedUser.created_at,
        updatedAt: typedUser.updated_at,
        passwordHash: typedUser.password_hash
      }
    } catch (error) {
      console.error('Error finding user by ID:', error)
      return null
    }
  }

  async findByEmail(email: string): Promise<(User & { passwordHash?: string }) | null> {
    try {
      const { data: user, error } = await supabaseService
        .from('users')
        .select('*')
        .eq('email', email)
        .single()

      if (error || !user) {
        console.log('User not found by email:', email)
        return null
      }

      // Reason: Type assertion to ensure TypeScript recognizes the user object structure
      const typedUser = user as any

      return {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        avatarUrl: typedUser.avatar_url || undefined,
        balance: Number(typedUser.balance),
        level: typedUser.level,
        experiencePoints: typedUser.experience_points,
        totalWagered: Number(typedUser.total_wagered),
        totalWon: Number(typedUser.total_won),
        gamesPlayed: typedUser.games_played,
        isActive: typedUser.is_active,
        isVerified: typedUser.is_verified,
        lastLoginAt: typedUser.last_login_at?.toISOString(),
        createdAt: typedUser.created_at,
        updatedAt: typedUser.updated_at,
        passwordHash: typedUser.password_hash
      }
    } catch (error) {
      console.error('Error finding user by email:', error)
      return null
    }
  }

  async findByUsername(username: string): Promise<(User & { passwordHash?: string }) | null> {
    try {
      const { data: user, error } = await supabaseService
        .from('users')
        .select('*')
        .eq('username', username)
        .single()

      if (error || !user) {
        console.log('User not found by username:', username)
        return null
      }

      // Reason: Type assertion to ensure TypeScript recognizes the user object structure
      const typedUser = user as any

      return {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        avatarUrl: typedUser.avatar_url || undefined,
        balance: Number(typedUser.balance),
        level: typedUser.level,
        experiencePoints: typedUser.experience_points,
        totalWagered: Number(typedUser.total_wagered),
        totalWon: Number(typedUser.total_won),
        gamesPlayed: typedUser.games_played,
        isActive: typedUser.is_active,
        isVerified: typedUser.is_verified,
        lastLoginAt: typedUser.last_login_at?.toISOString(),
        createdAt: typedUser.created_at,
        updatedAt: typedUser.updated_at,
        passwordHash: typedUser.password_hash
      }
    } catch (error) {
      console.error('Error finding user by username:', error)
      return null
    }
  }

  async create(userData: UserWithPassword): Promise<User> {
    try {
      const { data: user, error } = await (supabaseService as any)
        .from('users')
        .insert({
          username: userData.username,
          email: userData.email,
          password_hash: userData.passwordHash,
          avatar_url: userData.avatarUrl || null,
          balance: userData.balance,
          level: userData.level || 1,
          experience_points: userData.experiencePoints || 0,
          total_wagered: userData.totalWagered || 0,
          total_won: userData.totalWon || 0,
          games_played: userData.gamesPlayed || 0,
          is_active: userData.isActive !== false,
          is_verified: userData.isVerified || false
        })
        .select()
        .single()

      if (error) {
        console.error('Supabase create user error:', error)
        if (error.code === '23505') {
          // Unique constraint violation
          if (error.message.includes('username')) {
            throw new Error('Username already taken')
          } else if (error.message.includes('email')) {
            throw new Error('Email already registered')
          }
        }
        throw new Error('Failed to create user: ' + error.message)
      }

      if (!user) {
        throw new Error('User creation returned no data')
      }

      // Reason: Type assertion to ensure TypeScript recognizes the user object structure
      const typedUser = user as any

      return {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        avatarUrl: typedUser.avatar_url || undefined,
        balance: Number(typedUser.balance),
        level: typedUser.level,
        experiencePoints: typedUser.experience_points,
        totalWagered: Number(typedUser.total_wagered),
        totalWon: Number(typedUser.total_won),
        gamesPlayed: typedUser.games_played,
        isActive: typedUser.is_active,
        isVerified: typedUser.is_verified,
        lastLoginAt: typedUser.last_login_at?.toISOString(),
        createdAt: typedUser.created_at,
        updatedAt: typedUser.updated_at
      }
    } catch (error) {
      console.error('Error creating user:', error)
      throw error instanceof Error ? error : new Error('Failed to create user')
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData: any = {}

      if (updates.username !== undefined) updateData.username = updates.username
      if (updates.email !== undefined) updateData.email = updates.email
      if (updates.avatarUrl !== undefined) updateData.avatar_url = updates.avatarUrl || null
      if (updates.balance !== undefined) updateData.balance = updates.balance
      if (updates.level !== undefined) updateData.level = updates.level
      if (updates.experiencePoints !== undefined) updateData.experience_points = updates.experiencePoints
      if (updates.totalWagered !== undefined) updateData.total_wagered = updates.totalWagered
      if (updates.totalWon !== undefined) updateData.total_won = updates.totalWon
      if (updates.gamesPlayed !== undefined) updateData.games_played = updates.gamesPlayed
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive
      if (updates.isVerified !== undefined) updateData.is_verified = updates.isVerified
      if (updates.lastLoginAt !== undefined) updateData.last_login_at = updates.lastLoginAt
      if ((updates as any).passwordHash !== undefined) updateData.password_hash = (updates as any).passwordHash

      const { data: user, error } = await (supabaseService as any)
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error || !user) {
        console.error('Error updating user:', error)
        return null
      }

      // Reason: Type assertion to ensure TypeScript recognizes the user object structure
      const typedUser = user as any

      return {
        id: typedUser.id,
        username: typedUser.username,
        email: typedUser.email,
        avatarUrl: typedUser.avatar_url || undefined,
        balance: Number(typedUser.balance),
        level: typedUser.level,
        experiencePoints: typedUser.experience_points,
        totalWagered: Number(typedUser.total_wagered),
        totalWon: Number(typedUser.total_won),
        gamesPlayed: typedUser.games_played,
        isActive: typedUser.is_active,
        isVerified: typedUser.is_verified,
        lastLoginAt: typedUser.last_login_at?.toISOString(),
        createdAt: typedUser.created_at,
        updatedAt: typedUser.updated_at
      }
    } catch (error) {
      console.error('Error updating user:', error)
      return null
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const { error } = await supabaseService
        .from('users')
        .delete()
        .eq('id', id)

      return !error
    } catch (error) {
      console.error('Error deleting user:', error)
      return false
    }
  }

  async updateLastLogin(id: string): Promise<void> {
    try {
      await (supabaseService as any)
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', id)
    } catch (error) {
      console.error('Error updating last login:', error)
    }
  }

  async incrementLoginAttempts(email: string): Promise<number> {
    // TODO: Implement proper login attempts tracking in Supabase
    console.log('📝 Incrementing login attempts for:', email)
    return 1
  }

  async resetLoginAttempts(email: string): Promise<void> {
    // TODO: Implement login attempts reset in Supabase
    console.log('📝 Resetting login attempts for:', email)
  }

  async isBlocked(_email: string): Promise<boolean> {
    // TODO: Implement account blocking logic in Supabase
    return false
  }
}