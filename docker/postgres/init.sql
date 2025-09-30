-- Stake Games Database Initialization Script
-- This script runs when PostgreSQL container is first created

-- Create extensions that might be useful for gaming applications
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application schema
CREATE SCHEMA IF NOT EXISTS app;

-- Set default search path
ALTER DATABASE stake_games SET search_path TO app, public;

-- Create enum types for common gaming concepts
CREATE TYPE app.game_type AS ENUM (
    'sugar_rush',
    'mines', 
    'bars',
    'dragon_tower',
    'crash',
    'limbo'
);

CREATE TYPE app.game_status AS ENUM (
    'pending',
    'active',
    'completed',
    'cancelled'
);

-- Users table (basic structure for future development)
CREATE TABLE IF NOT EXISTS app.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game sessions table (for tracking individual game instances)
CREATE TABLE IF NOT EXISTS app.game_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES app.users(id),
    game_type app.game_type NOT NULL,
    status app.game_status DEFAULT 'pending',
    bet_amount DECIMAL(10,2),
    payout_amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_game_sessions_user_id ON app.game_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON app.game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created_at ON app.game_sessions(created_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION app.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for users table
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON app.users 
    FOR EACH ROW 
    EXECUTE FUNCTION app.update_updated_at_column();

-- Grant permissions (adjust as needed for production)
GRANT USAGE ON SCHEMA app TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO postgres;

-- Insert some test data for development
INSERT INTO app.users (username, email) VALUES
    ('testuser1', 'test1@example.com'),
    ('testuser2', 'test2@example.com')
ON CONFLICT (username) DO NOTHING;

-- Success message
\echo 'Stake Games database initialized successfully!'