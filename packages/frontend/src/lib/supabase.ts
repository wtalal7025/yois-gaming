/**
 * Supabase Client Configuration for Frontend
 * Handles client-side authentication and database operations
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

// Reason: Environment variables for Supabase connection (client-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('🚨 Missing required Supabase environment variables in frontend:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing')
}

// Reason: Client-side Supabase client with auth persistence
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'stake-games-auth'
  },
  global: {
    headers: {
      'X-Client-Info': 'stake-games-frontend'
    }
  }
})

// Reason: Helper functions for authentication
export const authHelpers = {
  // Sign up new user
  signUp: async (email: string, password: string, username: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username
        }
      }
    })
    return { data, error }
  },

  // Sign in existing user
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    return { data, error }
  },

  // Sign out current user
  signOut: async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession()
    return { session, error }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    return { user, error }
  },

  // Listen to auth changes
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange(callback)
  }
}

// Reason: Database helpers for common operations
export const dbHelpers = {
  // Get user profile
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()
    
    return { data, error }
  },

  // Update user profile
  updateUserProfile: async (userId: string, updates: any) => {
    const { data, error } = await (supabase as any)
      .from('users')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    
    return { data, error }
  },

  // Get user balance
  getUserBalance: async (userId: string) => {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return { data, error }
  },

  // Get user transactions
  getUserTransactions: async (userId: string, limit: number = 50) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  // Get user game sessions
  getUserGameSessions: async (userId: string, limit: number = 50) => {
    const { data, error } = await supabase
      .from('game_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
    
    return { data, error }
  },

  // Get user preferences
  getUserPreferences: async (userId: string) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    return { data, error }
  },

  // Update user preferences
  updateUserPreferences: async (userId: string, preferences: any) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: userId,
        ...preferences
      })
      .select()
      .single()
    
    return { data, error }
  }
}

// Reason: Real-time subscriptions for live updates
export const realtimeHelpers = {
  // Subscribe to user balance changes
  subscribeToBalance: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`balance_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'balances',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to user transactions
  subscribeToTransactions: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`transactions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  },

  // Subscribe to game sessions
  subscribeToGameSessions: (userId: string, callback: (payload: any) => void) => {
    return supabase
      .channel(`game_sessions_${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_sessions',
          filter: `user_id=eq.${userId}`
        },
        callback
      )
      .subscribe()
  }
}

// Reason: Connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase.from('users').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection failed:', error)
    return false
  }
}