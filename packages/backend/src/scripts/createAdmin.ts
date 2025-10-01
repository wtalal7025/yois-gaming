/**
 * Admin User Creation Script - Updated for Supabase
 * Creates admin and test users in Supabase database
 * 
 * MIGRATION NOTE: Converted from Prisma to Supabase 2025-09-23
 */

// Reason: Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables with multiple fallback paths
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), 'packages/backend/.env')
];

for (const envPath of envPaths) {
  try {
    if (require('fs').existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`✅ Loaded .env from: ${envPath}`);
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

import { supabaseService } from '../database/supabase'
import { PasswordService } from '../services/auth/PasswordService'
// import type { User } from '@yois-games/shared'
// import type { Database } from '../types/supabase'

// interface CreateUserData {
// interface _UnusedCreateUserData { // Commented out - unused interface
//   username: string
//   email: string
//   password: string
//   role?: 'user' | 'admin'
//   balance?: number
//   level?: number
//   isVerified?: boolean
// }

/**
 * Admin User Creator using Supabase
 * Reason: Replaced Prisma with Supabase for consistency with authentication system
 */
class AdminUserCreator {
  constructor() {
    // Reason: PasswordService methods are static, no instance needed
  }

  /**
   * Create admin user in Supabase
   */
  async createAdminUser(): Promise<void> {
    console.log('🔧 Creating admin user in Supabase...')

    try {
      // Check if admin user already exists
      const { data: existingUser, error: queryError } = await supabaseService
        .from('users')
        .select('id, email, username')
        .eq('email', 'admin@stake-gaming.com')
        .single()

      if (existingUser && !queryError) {
        const user = existingUser as any
        console.log('✅ Admin user already exists:', {
          id: user.id,
          email: user.email,
          username: user.username
        })
        return
      }

      // Hash admin password
      const hashedPassword = await PasswordService.hashPassword('admin123!@#')

      // Create admin user
      const { data: adminUser, error } = await (supabaseService as any)
        .from('users')
        .insert({
          username: 'admin',
          email: 'admin@stake-gaming.com',
          password_hash: hashedPassword,
          balance: 10000.00,
          level: 99,
          experience_points: 999999,
          is_verified: true,
          is_active: true,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create admin user: ${error.message}`)
      }

      const admin = adminUser as any
      console.log('✅ Admin user created successfully:', {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        balance: admin.balance
      })

    } catch (error) {
      console.error('❌ Failed to create admin user:', error)
      throw error
    }
  }

  /**
   * Create test user in Supabase
   */
  async createTestUser(): Promise<void> {
    console.log('🧪 Creating test user in Supabase...')

    try {
      // Check if test user already exists
      const { data: existingUser } = await supabaseService
        .from('users')
        .select('id, email, username')
        .eq('email', 'test@example.com')
        .single()

      if (existingUser) {
        const user = existingUser as any
        console.log('✅ Test user already exists:', {
          id: user.id,
          email: user.email,
          username: user.username
        })
        return
      }

      // Hash test user password
      const hashedPassword = await PasswordService.hashPassword('test123')

      // Create test user
      const { data: testUser, error } = await (supabaseService as any)
        .from('users')
        .insert({
          username: 'testuser',
          email: 'test@example.com',
          password_hash: hashedPassword,
          balance: 1000.00,
          level: 1,
          experience_points: 0,
          is_verified: true,
          is_active: true,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) {
        throw new Error(`Failed to create test user: ${error.message}`)
      }

      const test = testUser as any
      console.log('✅ Test user created successfully:', {
        id: test.id,
        username: test.username,
        email: test.email,
        balance: test.balance
      })

    } catch (error) {
      console.error('❌ Failed to create test user:', error)
      throw error
    }
  }

  /**
   * List all users in Supabase (for verification)
   */
  async listUsers(): Promise<void> {
    console.log('📋 Listing all users in Supabase...')

    try {
      const { data: users, error } = await supabaseService
        .from('users')
        .select('id, username, email, balance, level, role, is_verified, created_at')
        .order('created_at', { ascending: false })

      if (error) {
        throw new Error(`Failed to list users: ${error.message}`)
      }

      console.log(`\n📊 Found ${users.length} users:`)
      users.forEach((user: any, index: number) => {
        console.log(`${index + 1}. ${user.username} (${user.email})`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Balance: $${user.balance}`)
        console.log(`   Level: ${user.level}`)
        console.log(`   Role: ${user.role || 'user'}`)
        console.log(`   Verified: ${user.is_verified}`)
        console.log(`   Created: ${new Date(user.created_at).toLocaleDateString()}`)
        console.log('')
      })

    } catch (error) {
      console.error('❌ Failed to list users:', error)
      throw error
    }
  }

  /**
   * Cleanup - not needed for Supabase (no connection to close)
   */
  async cleanup(): Promise<void> {
    console.log('✅ Cleanup completed (Supabase connection managed automatically)')
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 Admin User Creation Script (Supabase)')
  console.log('=====================================')

  const creator = new AdminUserCreator()

  try {
    // Verify Supabase environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required Supabase environment variables')
    }

    console.log('🔗 Supabase Configuration:')
    console.log(`   URL: ${process.env.SUPABASE_URL}`)
    console.log(`   Service Role Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`)

    await creator.createAdminUser()
    await creator.createTestUser()
    await creator.listUsers()
    await creator.cleanup()

    console.log('✅ Admin user creation completed successfully!')

  } catch (error) {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }
}

// Run the script if executed directly
if (require.main === module) {
  main()
}

export { AdminUserCreator }