/**
 * Supabase Database Configuration
 * Configures Supabase client for backend services
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/supabase'

// Reason: Environment variables for Supabase connection
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || ''

// DEBUG: Log environment variable status
console.log('🔍 Environment Variables Check:')
console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing')
console.log('- SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing')
console.log('- SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing')
console.log('- Working Directory:', process.cwd())
console.log('- Node Environment:', process.env.NODE_ENV)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required Supabase environment variables')
  console.error('📍 Expected variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  console.error('📂 In production: Configure these in your deployment platform dashboard')
  console.error('📂 In development: Make sure .env file exists at:', process.cwd() + '/packages/backend/.env')
  console.error('🔄 Try restarting the development server to load new environment variables')

  // Reason: Throw error instead of process.exit(1) for production-friendly error handling
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Please configure these in your deployment platform or .env file.')
}

// Reason: Service role client for backend operations (bypasses RLS)
export const supabaseService = createClient<Database>(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Reason: Anonymous client for regular operations (respects RLS)
export const supabaseAnon = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey
)

// Reason: Helper to get user-authenticated client
export const getAuthenticatedClient = (accessToken: string) => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }
  })
}

// Reason: Database connection health check
export const checkSupabaseConnection = async (): Promise<boolean> => {
  try {
    const { error } = await supabaseService.from('users').select('count').limit(1)
    return !error
  } catch (error) {
    console.error('Supabase connection failed:', error)
    return false
  }
}