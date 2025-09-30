-- ============================================================================
-- PERFORMANCE OPTIMIZATION MIGRATIONS
-- Production-ready database performance enhancements for gaming platform
-- ============================================================================

-- Enable performance monitoring extensions
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For text search performance
CREATE EXTENSION IF NOT EXISTS btree_gin; -- For composite indexes

-- ============================================================================
-- USERS TABLE PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Indexes for user authentication and profile lookups
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_active 
ON users (email) WHERE active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at_desc 
ON users (created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_last_login 
ON users (last_login_at) WHERE last_login_at IS NOT NULL;

-- Composite index for user sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_password_active 
ON users (email, password_hash) WHERE active = true;

-- Text search index for user search functionality
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_username_trgm 
ON users USING gin (username gin_trgm_ops);

-- ============================================================================
-- WALLET TRANSACTIONS PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create wallet_transactions table if not exists
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'bet', 'win', 'bonus')),
  amount DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference_id VARCHAR(100),
  game_id VARCHAR(50),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- High-performance indexes for wallet transactions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_user_id_created 
ON wallet_transactions (user_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_status_created 
ON wallet_transactions (status, created_at DESC) WHERE status = 'pending';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_type_amount 
ON wallet_transactions (transaction_type, amount) WHERE status = 'completed';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_reference 
ON wallet_transactions (reference_id) WHERE reference_id IS NOT NULL;

-- GIN index for metadata searches
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_metadata 
ON wallet_transactions USING gin (metadata);

-- Composite index for game-specific transaction queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallet_transactions_game_user_date 
ON wallet_transactions (game_id, user_id, created_at DESC) WHERE game_id IS NOT NULL;

-- ============================================================================
-- GAME SESSIONS PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create game_sessions table if not exists
CREATE TABLE IF NOT EXISTS game_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(50) NOT NULL,
  session_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  session_end TIMESTAMP WITH TIME ZONE,
  total_bets DECIMAL(15,2) DEFAULT 0,
  total_wins DECIMAL(15,2) DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Performance indexes for game sessions
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_user_active 
ON game_sessions (user_id, status) WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_game_date 
ON game_sessions (game_id, session_start DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_user_game_date 
ON game_sessions (user_id, game_id, session_start DESC);

-- Index for analytics queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_sessions_completed_stats 
ON game_sessions (game_id, total_bets, total_wins, created_at) WHERE status = 'completed';

-- ============================================================================
-- GAME ROUNDS PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create game_rounds table if not exists
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES game_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id VARCHAR(50) NOT NULL,
  round_number INTEGER NOT NULL,
  bet_amount DECIMAL(15,2) NOT NULL,
  win_amount DECIMAL(15,2) DEFAULT 0,
  multiplier DECIMAL(10,4) DEFAULT 1.0000,
  result JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- High-performance indexes for game rounds
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_session_round 
ON game_rounds (session_id, round_number);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_user_game_date 
ON game_rounds (user_id, game_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_game_stats 
ON game_rounds (game_id, bet_amount, win_amount, created_at) WHERE status = 'completed';

-- Index for leaderboard queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_game_rounds_big_wins 
ON game_rounds (game_id, win_amount DESC, created_at DESC) WHERE win_amount > 0;

-- ============================================================================
-- USER BALANCES PERFORMANCE OPTIMIZATIONS
-- ============================================================================

-- Create user_balances table if not exists
CREATE TABLE IF NOT EXISTS user_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  locked_balance DECIMAL(15,2) NOT NULL DEFAULT 0 CHECK (locked_balance >= 0),
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  version INTEGER NOT NULL DEFAULT 1 -- For optimistic locking
);

-- Indexes for balance operations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_balance_desc 
ON user_balances (balance DESC) WHERE balance > 0;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_balances_updated 
ON user_balances (updated_at DESC);

-- ============================================================================
-- PERFORMANCE MONITORING VIEWS
-- ============================================================================

-- View for slow queries monitoring
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time,
  rows,
  100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE mean_time > 100 -- Queries taking more than 100ms on average
ORDER BY mean_time DESC;

-- View for table statistics
CREATE OR REPLACE VIEW table_stats AS
SELECT 
  schemaname,
  tablename,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes,
  n_tup_hot_upd AS hot_updates,
  n_live_tup AS live_tuples,
  n_dead_tup AS dead_tuples,
  last_vacuum,
  last_autovacuum,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_tup_ins + n_tup_upd + n_tup_del DESC;

-- View for index usage statistics
CREATE OR REPLACE VIEW index_usage AS
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_tup_read,
  idx_tup_fetch,
  idx_scan,
  CASE 
    WHEN idx_scan = 0 THEN 'UNUSED'
    WHEN idx_scan < 50 THEN 'RARELY_USED'
    ELSE 'ACTIVELY_USED'
  END AS usage_status
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- ============================================================================
-- DATABASE MAINTENANCE FUNCTIONS
-- ============================================================================

-- Function to update user balance with optimistic locking
CREATE OR REPLACE FUNCTION update_user_balance(
  p_user_id UUID,
  p_amount DECIMAL(15,2),
  p_operation VARCHAR(10) -- 'add' or 'subtract'
) RETURNS BOOLEAN AS $$
DECLARE
  current_version INTEGER;
  current_balance DECIMAL(15,2);
  new_balance DECIMAL(15,2);
BEGIN
  -- Lock the row and get current values
  SELECT balance, version INTO current_balance, current_version
  FROM user_balances 
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Calculate new balance
  IF p_operation = 'add' THEN
    new_balance := current_balance + p_amount;
  ELSIF p_operation = 'subtract' THEN
    new_balance := current_balance - p_amount;
    IF new_balance < 0 THEN
      RAISE EXCEPTION 'Insufficient balance';
    END IF;
  ELSE
    RAISE EXCEPTION 'Invalid operation: %', p_operation;
  END IF;
  
  -- Update with optimistic locking
  UPDATE user_balances 
  SET 
    balance = new_balance,
    updated_at = NOW(),
    version = version + 1
  WHERE user_id = p_user_id AND version = current_version;
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics efficiently
CREATE OR REPLACE FUNCTION get_user_game_stats(p_user_id UUID, p_days INTEGER DEFAULT 30)
RETURNS TABLE(
  game_id VARCHAR(50),
  total_rounds INTEGER,
  total_bet DECIMAL(15,2),
  total_win DECIMAL(15,2),
  biggest_win DECIMAL(15,2),
  avg_multiplier DECIMAL(10,4)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gr.game_id,
    COUNT(*)::INTEGER AS total_rounds,
    COALESCE(SUM(gr.bet_amount), 0) AS total_bet,
    COALESCE(SUM(gr.win_amount), 0) AS total_win,
    COALESCE(MAX(gr.win_amount), 0) AS biggest_win,
    COALESCE(AVG(gr.multiplier), 0) AS avg_multiplier
  FROM game_rounds gr
  WHERE 
    gr.user_id = p_user_id 
    AND gr.created_at >= NOW() - INTERVAL '1 day' * p_days
    AND gr.status = 'completed'
  GROUP BY gr.game_id
  ORDER BY total_bet DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- AUTOMATED MAINTENANCE TASKS
-- ============================================================================

-- Update statistics for better query planning
ANALYZE users;
ANALYZE wallet_transactions;
ANALYZE game_sessions;
ANALYZE game_rounds;
ANALYZE user_balances;

-- ============================================================================
-- PERFORMANCE MONITORING QUERIES (FOR ADMIN USE)
-- ============================================================================

-- Query to identify missing indexes
-- Run this periodically to find tables that might need additional indexes
/*
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname = 'public'
  AND n_distinct > 100
  AND abs(correlation) < 0.1
ORDER BY n_distinct DESC;
*/

-- Query to find unused indexes (run after significant usage)
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  pg_size_pretty(pg_relation_size(indexrelname::regclass)) AS size
FROM pg_stat_user_indexes
WHERE idx_scan < 50
ORDER BY pg_relation_size(indexrelname::regclass) DESC;
*/

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Performance optimizations applied successfully!';
  RAISE NOTICE 'Created % indexes for optimal query performance', 
    (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%');
  RAISE NOTICE 'Database is now optimized for production gaming workloads';
END $$;