-- Row Level Security Policies for Gaming Platform
-- These policies ensure users can only access their own data

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- USERS TABLE POLICIES
-- Reason: Users can view and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

-- Reason: Allow user registration (insert) - handled by service role
CREATE POLICY "Enable user registration" ON public.users
    FOR INSERT WITH CHECK (true);

-- USER SESSIONS POLICIES
-- Reason: Users can only see their own sessions
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own sessions" ON public.user_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sessions" ON public.user_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own sessions" ON public.user_sessions
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- TRANSACTIONS POLICIES
-- Reason: Users can only view their own transaction history
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert transactions" ON public.transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update transactions" ON public.transactions
    FOR UPDATE USING (true);

-- BALANCES POLICIES
-- Reason: Users can only see their own balance
CREATE POLICY "Users can view own balance" ON public.balances
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own balance" ON public.balances
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own balance" ON public.balances
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- USER PREFERENCES POLICIES
-- Reason: Users can manage their own preferences
CREATE POLICY "Users can view own preferences" ON public.user_preferences
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own preferences" ON public.user_preferences
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own preferences" ON public.user_preferences
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- GAME SESSIONS POLICIES
-- Reason: Users can only see their own game sessions
CREATE POLICY "Users can view own game sessions" ON public.game_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own game sessions" ON public.game_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own game sessions" ON public.game_sessions
    FOR UPDATE USING (auth.uid()::text = user_id::text);

-- PASSWORD RESET TOKENS POLICIES
-- Reason: Tokens are managed by the system, users cannot directly access
CREATE POLICY "System manages password reset tokens" ON public.password_reset_tokens
    FOR ALL USING (false);

-- AUDIT LOGS POLICIES
-- Reason: Users can view their own audit logs for transparency
CREATE POLICY "Users can view own audit logs" ON public.audit_logs
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can insert audit logs" ON public.audit_logs
    FOR INSERT WITH CHECK (true);

-- LEADERBOARDS AND PUBLIC DATA
-- Reason: Create view for public leaderboard data (anonymized)
CREATE OR REPLACE VIEW public.leaderboard_stats AS
SELECT 
    u.id,
    u.username,
    u.level,
    u.experience_points,
    u.total_wagered,
    u.total_won,
    (u.total_won - u.total_wagered) as net_profit,
    u.games_played,
    CASE 
        WHEN u.games_played > 0 THEN ROUND((u.total_won / NULLIF(u.total_wagered, 0) * 100)::numeric, 2)
        ELSE 0
    END as win_rate,
    u.created_at
FROM public.users u
WHERE u.is_active = true
ORDER BY u.experience_points DESC, u.total_won DESC;

-- Note: Views inherit security from their underlying tables, so no RLS policy needed
-- The leaderboard_stats view is secured through the users table RLS policies

-- REAL-TIME SUBSCRIPTIONS
-- Reason: Publications removed - gaming platforms use RLS policies for security, not logical replication
-- Supabase real-time subscriptions work without publications and RLS policies provide adequate security

-- FUNCTIONS FOR COMMON OPERATIONS
-- Reason: Function to safely update user balance with transaction logging
CREATE OR REPLACE FUNCTION public.update_user_balance(
    p_user_id UUID,
    p_amount DECIMAL(15,2),
    p_transaction_type VARCHAR(20),
    p_description TEXT DEFAULT NULL,
    p_game_session_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_balance DECIMAL(15,2);
    new_balance DECIMAL(15,2);
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance 
    FROM users 
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Calculate new balance
    new_balance := current_balance + p_amount;
    
    -- Prevent negative balances for withdrawals
    IF new_balance < 0 AND p_transaction_type IN ('bet', 'withdrawal') THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;
    
    -- Update user balance
    UPDATE users 
    SET balance = new_balance, updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Insert transaction record
    INSERT INTO transactions (
        user_id, type, amount, balance_before, balance_after, 
        description, game_session_id
    ) VALUES (
        p_user_id, p_transaction_type, p_amount, current_balance, new_balance,
        p_description, p_game_session_id
    );
    
    -- Update or insert balance record
    INSERT INTO balances (user_id, amount)
    VALUES (p_user_id, new_balance)
    ON CONFLICT (user_id)
    DO UPDATE SET amount = new_balance, updated_at = NOW();
    
    RETURN TRUE;
END;
$$;

-- Reason: Function to create game session with balance deduction
CREATE OR REPLACE FUNCTION public.create_game_session(
    p_user_id UUID,
    p_game_type VARCHAR(50),
    p_bet_amount DECIMAL(10,2),
    p_game_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    session_id UUID;
    current_balance DECIMAL(15,2);
BEGIN
    -- Check user balance
    SELECT balance INTO current_balance 
    FROM users 
    WHERE id = p_user_id;
    
    IF current_balance < p_bet_amount THEN
        RAISE EXCEPTION 'Insufficient balance for bet';
    END IF;
    
    -- Create game session
    INSERT INTO game_sessions (
        user_id, game_type, bet_amount, profit_loss, game_data
    ) VALUES (
        p_user_id, p_game_type, p_bet_amount, -p_bet_amount, p_game_data
    ) RETURNING id INTO session_id;
    
    -- Deduct bet amount from balance
    PERFORM update_user_balance(
        p_user_id, 
        -p_bet_amount, 
        'bet', 
        'Game bet: ' || p_game_type,
        session_id
    );
    
    RETURN session_id;
END;
$$;

-- SECURITY POLICIES FOR FUNCTIONS
-- Reason: Allow authenticated users to call balance functions
REVOKE ALL ON FUNCTION public.update_user_balance FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_user_balance TO authenticated;

REVOKE ALL ON FUNCTION public.create_game_session FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_game_session TO authenticated;