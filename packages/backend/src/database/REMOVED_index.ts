/**
 * REMOVED: Local Prisma Database Connection Infrastructure
 * Date: 2025-09-23
 * Reason: Complete migration to Supabase - all local database connections eliminated
 * 
 * This file previously contained:
 * - PrismaClient connection management
 * - Local PostgreSQL database connectivity
 * - Database health checking functions
 * 
 * All functionality has been replaced with Supabase connections via:
 * - packages/backend/src/database/supabase.ts
 * - packages/backend/src/services/supabase/SupabaseUserRepository.ts
 * - packages/backend/src/services/supabase/SupabaseSessionRepository.ts
 * 
 * DO NOT RESTORE THIS FILE - it will cause authentication conflicts
 */

// This file intentionally left empty to prevent accidental imports
// All database operations now go through Supabase exclusively

export const MIGRATION_NOTICE = {
  message: "Local database connections completely removed in favor of Supabase",
  date: "2025-09-23",
  impact: "All authentication now uses Supabase exclusively"
}