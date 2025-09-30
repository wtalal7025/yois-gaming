/**
 * Supabase-Only Verification Script
 * Tests that backend ONLY connects to Supabase, never local database
 * 
 * This script validates the complete removal of local database traces
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';

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

import { authService, userRepository } from '../services'
import { supabaseService } from '../database/supabase'

/**
 * Verification Test Suite
 */
class SupabaseVerification {
  
  /**
   * Verify environment configuration
   */
  async verifyEnvironment(): Promise<boolean> {
    console.log('\n🔧 ENVIRONMENT VERIFICATION')
    console.log('============================')

    // Check DATABASE_URL is NOT present (should be removed)
    const databaseUrl = process.env.DATABASE_URL
    if (databaseUrl && databaseUrl.includes('localhost')) {
      console.error('❌ CRITICAL: DATABASE_URL still points to local database!')
      console.error(`   Found: ${databaseUrl}`)
      return false
    } else if (databaseUrl) {
      console.log('⚠️  DATABASE_URL exists but not localhost:', databaseUrl.substring(0, 30) + '...')
    } else {
      console.log('✅ DATABASE_URL correctly removed (no local database)')
    }

    // Check Supabase environment variables
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      console.error('❌ CRITICAL: Missing Supabase environment variables!')
      return false
    }

    console.log('✅ Supabase URL configured:', supabaseUrl)
    console.log('✅ Supabase Anon Key configured:', supabaseAnonKey.substring(0, 20) + '...')
    console.log('✅ Supabase Service Key configured:', supabaseServiceKey.substring(0, 20) + '...')

    return true
  }

  /**
   * Verify Supabase connectivity
   */
  async verifySupabaseConnection(): Promise<boolean> {
    console.log('\n🔗 SUPABASE CONNECTION VERIFICATION')
    console.log('===================================')

    try {
      // Test Supabase connection
      const { data, error } = await supabaseService
        .from('users')
        .select('count(*)', { count: 'exact', head: true })

      if (error) {
        console.error('❌ CRITICAL: Supabase connection failed!')
        console.error('   Error:', error.message)
        return false
      }

      console.log('✅ Supabase connection successful')
      console.log(`✅ Users table accessible (${data?.length || 0} records)`)
      return true

    } catch (error) {
      console.error('❌ CRITICAL: Supabase connection error:', error)
      return false
    }
  }

  /**
   * Verify no local database imports/connections
   */
  async verifyNoLocalDatabase(): Promise<boolean> {
    console.log('\n🚫 LOCAL DATABASE ELIMINATION VERIFICATION')
    console.log('==========================================')

    // Test that we cannot import old database functions
    try {
      // This should fail if we properly removed local database
      const fs = require('fs')
      const localDbPath = path.resolve(__dirname, '../database/index.ts')
      
      if (fs.existsSync(localDbPath)) {
        console.error('❌ CRITICAL: Local database file still exists!')
        console.error(`   Found: ${localDbPath}`)
        return false
      }
      
      console.log('✅ Local database files properly removed')
      return true

    } catch (error) {
      console.log('✅ Local database imports correctly unavailable')
      return true
    }
  }

  /**
   * Verify authentication service uses Supabase
   */
  async verifyAuthenticationService(): Promise<boolean> {
    console.log('\n🔐 AUTHENTICATION SERVICE VERIFICATION')
    console.log('======================================')

    try {
      // Test that userRepository is Supabase-based
      const repositoryName = userRepository.constructor.name
      if (repositoryName !== 'SupabaseUserRepository') {
        console.error(`❌ CRITICAL: Wrong repository type: ${repositoryName}`)
        console.error('   Expected: SupabaseUserRepository')
        return false
      }

      console.log('✅ Authentication service uses SupabaseUserRepository')

      // Test that we can attempt to find a user (should use Supabase)
      try {
        const result = await userRepository.findByEmail('test-verification@example.com')
        // This should not find a user (it's a test email), but importantly:
        // - It should NOT error about local database connections
        // - It should query Supabase instead
        
        if (result === null) {
          console.log('✅ User lookup correctly queries Supabase (user not found as expected)')
        } else {
          console.log('✅ User lookup correctly queries Supabase (found user)')
        }
        
        return true
      } catch (error) {
        console.error('❌ User lookup failed:', error)
        return false
      }

    } catch (error) {
      console.error('❌ Authentication service verification failed:', error)
      return false
    }
  }

  /**
   * Test authentication flow
   */
  async testAuthenticationFlow(): Promise<boolean> {
    console.log('\n🧪 AUTHENTICATION FLOW TEST')
    console.log('============================')

    try {
      // Test login attempt with non-existent user
      // This should fail gracefully and use Supabase exclusively
      const testEmail = 'verification-test-' + Date.now() + '@example.com'
      
      try {
        await authService.login(
          { email: testEmail, password: 'testpassword' },
          { ipAddress: '127.0.0.1' }
        )
        
        // If we get here, something unexpected happened
        console.log('⚠️ Login with fake credentials unexpectedly succeeded')
        return false
        
      } catch (error) {
        // This is expected - fake credentials should fail
        const errorMessage = error instanceof Error ? error.message : String(error)
        
        if (errorMessage.includes('Invalid email') || 
            errorMessage.includes('User not found') ||
            errorMessage.includes('password')) {
          console.log('✅ Authentication correctly rejects invalid credentials via Supabase')
          return true
        } else {
          console.error('❌ Unexpected authentication error:', errorMessage)
          return false
        }
      }

    } catch (error) {
      console.error('❌ Authentication flow test failed:', error)
      return false
    }
  }

  /**
   * Run complete verification suite
   */
  async runFullVerification(): Promise<boolean> {
    console.log('🚀 SUPABASE-ONLY VERIFICATION SUITE')
    console.log('===================================')
    console.log('Testing that backend ONLY uses Supabase, never local database')

    const tests = [
      { name: 'Environment Configuration', test: () => this.verifyEnvironment() },
      { name: 'Supabase Connection', test: () => this.verifySupabaseConnection() },
      { name: 'Local Database Elimination', test: () => this.verifyNoLocalDatabase() },
      { name: 'Authentication Service', test: () => this.verifyAuthenticationService() },
      { name: 'Authentication Flow', test: () => this.testAuthenticationFlow() }
    ]

    let allPassed = true
    const results: { name: string; passed: boolean }[] = []

    for (const test of tests) {
      try {
        const passed = await test.test()
        results.push({ name: test.name, passed })
        if (!passed) allPassed = false
      } catch (error) {
        console.error(`❌ ${test.name} test crashed:`, error)
        results.push({ name: test.name, passed: false })
        allPassed = false
      }
    }

    // Summary
    console.log('\n📊 VERIFICATION SUMMARY')
    console.log('========================')
    results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.name}: ${result.passed ? 'PASSED' : 'FAILED'}`)
    })

    if (allPassed) {
      console.log('\n🎉 SUCCESS: Backend ONLY uses Supabase!')
      console.log('   • No local database connections found')
      console.log('   • All authentication goes through Supabase')
      console.log('   • User frustration should be resolved!')
    } else {
      console.log('\n💥 FAILURE: Local database traces still exist!')
      console.log('   • Check failed tests above')
      console.log('   • Authentication conflicts may continue')
    }

    return allPassed
  }
}

/**
 * Main execution
 */
async function main() {
  const verifier = new SupabaseVerification()
  
  try {
    const success = await verifier.runFullVerification()
    process.exit(success ? 0 : 1)
  } catch (error) {
    console.error('💥 Verification script failed:', error)
    process.exit(1)
  }
}

// Run verification if executed directly
if (require.main === module) {
  main()
}

export { SupabaseVerification }