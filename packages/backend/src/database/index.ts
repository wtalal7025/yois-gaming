/**
 * Database package exports
 * Exports all database-related modules for use by other packages
 */

// Export all Supabase database configuration and clients
export * from './supabase'

// Export database types
export type { Database } from '../types/supabase'