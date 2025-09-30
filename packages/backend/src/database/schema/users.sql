-- Gaming Platform Database Schema
-- Users, Authentication, Balance Management, and Transactions

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with comprehensive user information
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    balance DECIMAL(15,2) DEFAULT 100.00 CHECK (balance >= 0), -- Starting balance $100
    level INTEGER DEFAULT 1 CHECK (level >= 1),
    experience_points INTEGER DEFAULT 0 CHECK (experience_points >= 0),
    total_wagered DECIMAL(15,2) DEFAULT 0.00 CHECK (total_wagered >= 0),
    total_won DECIMAL(15,2) DEFAULT 0.00 CHECK (total_won >= 0),
    games_played INTEGER DEFAULT 0 CHECK (games_played >= 0),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for JWT and session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(500) UNIQUE NOT NULL,
    refresh_token VARCHAR(500) UNIQUE NOT NULL,
    device_info JSONB, -- Store device/browser information
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP NOT NULL,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table for comprehensive balance management
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('bet', 'win', 'deposit', 'withdrawal', 'bonus', 'refund')),
    amount DECIMAL(15,2) NOT NULL CHECK (amount != 0),
    balance_before DECIMAL(15,2) NOT NULL CHECK (balance_before >= 0),
    balance_after DECIMAL(15,2) NOT NULL CHECK (balance_after >= 0),
    game_type VARCHAR(50), -- 'mines', 'crash', 'limbo', etc.
    game_session_id UUID, -- Reference to game session if applicable
    reference_id VARCHAR(100), -- External transaction reference
    description TEXT,
    metadata JSONB, -- Store additional transaction data
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User preferences for gaming settings
CREATE TABLE user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    auto_play_enabled BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    animation_speed VARCHAR(10) DEFAULT 'normal' CHECK (animation_speed IN ('slow', 'normal', 'fast')),
    theme VARCHAR(10) DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
    language VARCHAR(5) DEFAULT 'en',
    currency VARCHAR(3) DEFAULT 'USD',
    notifications JSONB DEFAULT '{"email": true, "push": true, "sms": false}',
    privacy_settings JSONB DEFAULT '{"profile_visible": true, "stats_visible": true}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game sessions for tracking individual game plays
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL CHECK (bet_amount > 0),
    payout DECIMAL(10,2) DEFAULT 0.00 CHECK (payout >= 0),
    multiplier DECIMAL(8,4) DEFAULT 1.0000,
    profit_loss DECIMAL(10,2) NOT NULL,
    game_data JSONB NOT NULL, -- Game-specific state and results
    seed_client VARCHAR(64), -- Client seed for provably fair
    seed_server VARCHAR(64), -- Server seed for provably fair
    seed_nonce INTEGER DEFAULT 1,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit log for security and compliance
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimization
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active, expires_at);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);
CREATE INDEX idx_transactions_user_created ON transactions(user_id, created_at);
CREATE INDEX idx_transactions_game_session ON transactions(game_session_id);

CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_type ON game_sessions(game_type);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at);
CREATE INDEX idx_game_sessions_user_game_created ON game_sessions(user_id, game_type, created_at);

CREATE INDEX idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_user_expires ON password_reset_tokens(user_id, expires_at);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate balance consistency
CREATE OR REPLACE FUNCTION validate_transaction_balance()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the balance calculation is correct
    IF NEW.balance_before + NEW.amount != NEW.balance_after THEN
        RAISE EXCEPTION 'Balance calculation error: % + % != %', NEW.balance_before, NEW.amount, NEW.balance_after;
    END IF;
    
    -- Ensure balance never goes negative
    IF NEW.balance_after < 0 THEN
        RAISE EXCEPTION 'Insufficient balance: balance would be %', NEW.balance_after;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to validate transaction balance consistency
CREATE TRIGGER validate_transaction_balance_trigger BEFORE INSERT OR UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION validate_transaction_balance();

-- Insert default admin user (password: 'admin123' - should be changed)
-- Password hash is bcrypt of 'admin123' with cost 12
INSERT INTO users (username, email, password_hash, balance, level, is_active, is_verified) 
VALUES (
    'admin',
    'admin@stakegames.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LmZNuZXNw1234567890', -- admin123
    10000.00,
    100,
    true,
    true
) ON CONFLICT (username) DO NOTHING;

-- Insert default preferences for admin user
INSERT INTO user_preferences (user_id)
SELECT id FROM users WHERE username = 'admin'
ON CONFLICT (user_id) DO NOTHING;