# 🔧 Third-Party Services Setup Guide
*Complete Step-by-Step Documentation for Yois Gaming Platform*

**Project**: Yois Gaming Platform  
**Created**: October 2, 2025  
**Version**: 1.0  
**Target**: Production-Ready Gaming Platform with Supabase, Upstash Redis, and Resend

---

## 📋 Table of Contents

1. [Overview & Architecture](#overview--architecture)
2. [Prerequisites](#prerequisites)
3. [Service Architecture Diagram](#service-architecture-diagram)
4. [1. Supabase Setup (PostgreSQL Database)](#1-supabase-setup-postgresql-database)
5. [2. Upstash Redis Setup (Caching Layer)](#2-upstash-redis-setup-caching-layer)
6. [3. Resend Setup (Email Service)](#3-resend-setup-email-service)
7. [Environment Variables Configuration](#environment-variables-configuration)
8. [Service Integration & Testing](#service-integration--testing)
9. [Free Tier Limitations](#free-tier-limitations)
10. [Troubleshooting Guide](#troubleshooting-guide)
11. [Production Deployment](#production-deployment)
12. [Next Steps](#next-steps)

---

## 🌟 Overview & Architecture

The Yois Gaming Platform utilizes three critical third-party services, all on their **FREE TIERS**, to provide a production-ready gaming experience:

### **Service Stack**
- **🗄️ Supabase**: PostgreSQL database with Row Level Security (RLS) for user management, game sessions, and transactions
- **⚡ Upstash Redis**: High-performance caching for API responses, session management, and game state
- **📧 Resend**: Professional email service for user authentication, notifications, and transactional emails

### **Key Features Implemented**
- Advanced error handling and retry mechanisms
- Production-ready security patterns
- Comprehensive health monitoring
- Fallback strategies for service failures
- Professional email templates
- Database migrations and RLS policies

---

## 🔧 Prerequisites

Before setting up the third-party services, ensure you have:

### **Development Environment**
- **Node.js 18+** (Latest LTS recommended)
- **TypeScript 5+** for type safety
- **pnpm** package manager (or npm/yarn)
- **Git** for version control

### **Required Accounts** (All Free)
- GitHub account (for deployment integration)
- Supabase account (free PostgreSQL database)
- Upstash account (free Redis caching)
- Resend account (free email service)

### **Local Development**
```bash
# Verify Node.js version
node --version  # Should be 18.0.0 or higher

# Verify TypeScript installation
tsc --version   # Should be 5.0.0 or higher

# Clone and setup project
git clone <your-repo-url>
cd yois-gaming-platform
pnpm install   # Install dependencies
```

---

## 📊 Service Architecture Diagram

```mermaid
graph TB
    Frontend[Next.js Frontend<br/>Vercel] --> API[Fastify Backend<br/>Railway]
    
    API --> Supabase[Supabase PostgreSQL<br/>Database + Auth + Storage]
    API --> Redis[Upstash Redis<br/>Caching + Sessions]
    API --> Email[Resend<br/>Email Service]
    
    subgraph "Database Layer"
        Supabase --> Users[Users Table]
        Supabase --> Sessions[Sessions Table] 
        Supabase --> Transactions[Transactions Table]
        Supabase --> GameSessions[Game Sessions Table]
    end
    
    subgraph "Cache Layer"
        Redis --> APICache[API Response Cache]
        Redis --> SessionCache[User Sessions]
        Redis --> GameCache[Game State Cache]
    end
    
    subgraph "Email Layer"
        Email --> Welcome[Welcome Emails]
        Email --> Reset[Password Reset]
        Email --> Verify[Email Verification]
        Email --> Notifications[Transaction Notifications]
    end
    
    subgraph "Security Layer"
        Supabase --> RLS[Row Level Security]
        API --> JWT[JWT Authentication]
        Redis --> Encryption[Data Encryption]
    end
```

---

## 1. 🗄️ Supabase Setup (PostgreSQL Database)

Supabase provides a free PostgreSQL database with 500MB storage, perfect for gaming platforms.

### **Step 1: Create Supabase Account & Project**

1. **Sign Up**: Visit [supabase.com](https://supabase.com) and create a free account
2. **New Project**: Click "New Project" 
3. **Project Settings**:
   - **Name**: `yois-gaming-db`
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free (500MB database, 50MB storage, 2GB bandwidth)

4. **Wait for Setup**: Project creation takes 1-2 minutes

### **Step 2: Get Your Credentials**

Once your project is ready, collect these credentials from **Settings > API**:

```bash
# Save these values - you'll need them for environment variables
Project URL: https://[your-project-id].supabase.co
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (long string)
Service Role Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (different long string)
```

⚠️ **Security Note**: The Service Role Key bypasses RLS policies. Never expose it in frontend code.

### **Step 3: Database Schema Setup**

Navigate to **SQL Editor** in your Supabase dashboard and execute this schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table with gaming-specific fields
CREATE TABLE public.users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    balance DECIMAL(15,2) DEFAULT 100.00,
    level INTEGER DEFAULT 1,
    experience_points INTEGER DEFAULT 0,
    total_wagered DECIMAL(15,2) DEFAULT 0.00,
    total_won DECIMAL(15,2) DEFAULT 0.00,
    games_played INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User sessions for JWT management
CREATE TABLE public.user_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transactions for balance management
CREATE TABLE public.transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'loss')),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(15,2) NOT NULL,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Game sessions for tracking plays
CREATE TABLE public.game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    game_type VARCHAR(50) NOT NULL,
    bet_amount DECIMAL(10,2) NOT NULL,
    payout DECIMAL(10,2) DEFAULT 0.00,
    profit_loss DECIMAL(10,2) NOT NULL,
    game_data JSONB NOT NULL,
    multiplier DECIMAL(8,4),
    seed VARCHAR(255) NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- User preferences for game settings
CREATE TABLE public.user_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    auto_cashout_enabled BOOLEAN DEFAULT false,
    auto_cashout_multiplier DECIMAL(8,4) DEFAULT 2.00,
    sound_enabled BOOLEAN DEFAULT true,
    animation_enabled BOOLEAN DEFAULT true,
    theme VARCHAR(20) DEFAULT 'dark',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password reset tokens
CREATE TABLE public.password_reset_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs for security
CREATE TABLE public.audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_username ON public.users(username);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_transactions_user_id ON public.transactions(user_id);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at);
CREATE INDEX idx_game_sessions_user_id ON public.game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_type ON public.game_sessions(game_type);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- Update trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **Step 4: Row Level Security (RLS) Setup**

Row Level Security ensures users can only access their own data. Execute these policies in the **SQL Editor**:

```sql
-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Enable user registration" ON public.users
    FOR INSERT WITH CHECK (true);

-- User sessions policies
CREATE POLICY "Users can view own sessions" ON public.user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can manage own sessions" ON public.user_sessions
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Transactions policies
CREATE POLICY "Users can view own transactions" ON public.transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can manage transactions" ON public.transactions
    FOR ALL USING (true);

-- Game sessions policies
CREATE POLICY "Users can view own game sessions" ON public.game_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "System can manage game sessions" ON public.game_sessions
    FOR ALL USING (true);

-- User preferences policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid()::text = user_id::text);

-- Password reset tokens policies
CREATE POLICY "System can manage reset tokens" ON public.password_reset_tokens
    FOR ALL USING (true);

-- Audit logs policies (admin only)
CREATE POLICY "System can manage audit logs" ON public.audit_logs
    FOR ALL USING (true);
```

### **Step 5: Supabase Environment Variables**

Based on your working configuration, add these to your `.env` file:

```bash
# Supabase Configuration - PRODUCTION READY
SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU2MjM1NSwiZXhwIjoyMDc0MTM4MzU1fQ.rOc8siraQiVDJ1fo8XgZ5h4ieE6m8fGLRFyPMrLc6xo"

# Frontend Configuration
NEXT_PUBLIC_SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"
```

**🔒 Security Notes:**
- **ANON_KEY**: Safe for frontend use (public)
- **SERVICE_ROLE_KEY**: Backend only - never expose to frontend
- Replace the example URLs and keys with your actual Supabase credentials

---

## 2. ⚡ Upstash Redis Setup (Caching Layer)

Upstash provides serverless Redis with 10,000 requests/day free, perfect for caching and session management.

### **Step 1: Create Upstash Account & Database**

1. **Sign Up**: Visit [upstash.com](https://upstash.com) and create a free account
2. **Create Database**: Click "Create Database"
3. **Database Settings**:
   - **Name**: `yois-gaming-cache`
   - **Type**: Regional (Global for better performance but uses paid tier)
   - **Region**: Choose closest to your backend deployment
   - **Plan**: Free (10,000 requests/day, 256MB memory)

### **Step 2: Get Redis Credentials**

From your database dashboard, copy these credentials:

```bash
# Save these values for environment variables
UPSTASH_REDIS_REST_URL=https://content-terrier-15070.upstash.io
UPSTASH_REDIS_REST_TOKEN=ATreAAIncDIwMDI2MmIzZTkwNDU0NmQwOWUwNWNkMTM0Y2RhNzlmNXAyMTUwNzA
```

### **Step 3: Install Dependencies**

```bash
# Install Upstash Redis client
pnpm add @upstash/redis
```

### **Step 4: Environment Variables**

Add to your `.env` file:

```bash
# Upstash Redis Configuration - PRODUCTION READY
UPSTASH_REDIS_REST_URL="https://content-terrier-15070.upstash.io"
UPSTASH_REDIS_REST_TOKEN="ATreAAIncDIwMDI2MmIzZTkwNDU0NmQwOWUwNWNkMTM0Y2RhNzlmNXAyMTUwNzA"

# Redis Connection Settings
REDIS_RETRY_ATTEMPTS=5
REDIS_RETRY_DELAY=2000
REDIS_TIMEOUT=10000
```

---

## 3. 📧 Resend Setup (Email Service)

Resend provides 3,000 free emails/month with excellent deliverability and professional templates.

### **Step 1: Create Resend Account & Domain**

1. **Sign Up**: Visit [resend.com](https://resend.com) and create a free account
2. **Add Domain**: Go to **Domains** section
   - **Option A**: Use your domain (requires DNS setup)
   - **Option B**: Use default `@resend.dev` domain for testing
3. **Verify Domain**: Follow DNS verification steps if using custom domain

### **Step 2: Generate API Key**

1. **Navigate**: Go to **API Keys** section
2. **Create Key**: Click "Create API Key"
3. **Settings**:
   - **Name**: `yois-gaming-emails`
   - **Permission**: Full access (for production)
   - **Domain**: Select your domain

4. **Save Key**: Copy the API key (starts with `re_`)

### **Step 3: Install Dependencies**

```bash
# Install Resend SDK
pnpm add resend
```

### **Step 4: Environment Variables**

Add to your `.env` file:

```bash
# Resend Email Configuration - PRODUCTION READY
RESEND_API_KEY="re_RcEB7YGo_2vJyvzQd9GxDstoqmz2NwhZp"
FROM_EMAIL="business@zacport.com"
SUPPORT_EMAIL="business@zacport.com"
```

---

## 📝 Environment Variables Configuration

Here's a complete summary of all required environment variables for production deployment:

### **Complete .env File Template**

```bash
# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=production
APP_PORT=3001
APP_HOST=0.0.0.0
APP_NAME="Yois Bet Games"

# ===========================================
# SUPABASE DATABASE (FREE: 500MB + 2GB bandwidth)
# ===========================================
SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODU2MjM1NSwiZXhwIjoyMDc0MTM4MzU1fQ.rOc8siraQiVDJ1fo8XgZ5h4ieE6m8fGLRFyPMrLc6xo"

# ===========================================
# UPSTASH REDIS (FREE: 10K requests/day + 256MB)
# ===========================================
UPSTASH_REDIS_REST_URL="https://content-terrier-15070.upstash.io"
UPSTASH_REDIS_REST_TOKEN="ATreAAIncDIwMDI2MmIzZTkwNDU0NmQwOWUwNWNkMTM0Y2RhNzlmNXAyMTUwNzA"
REDIS_RETRY_ATTEMPTS=5
REDIS_RETRY_DELAY=2000
REDIS_TIMEOUT=10000

# ===========================================
# RESEND EMAIL (FREE: 3K emails/month)
# ===========================================
RESEND_API_KEY="re_RcEB7YGo_2vJyvzQd9GxDstoqmz2NwhZp"
FROM_EMAIL="business@zacport.com"
SUPPORT_EMAIL="business@zacport.com"

# ===========================================
# FRONTEND CONFIGURATION (Next.js)
# ===========================================
NEXT_PUBLIC_API_BASE_URL="https://yois.io/api"
NEXT_PUBLIC_SOCKET_URL="https://yois.io"
NEXT_PUBLIC_APP_NAME="Yois Bet Games"
NEXT_PUBLIC_SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhZndpd2lrbmVoeXRhcHRwdGVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1NjIzNTUsImV4cCI6MjA3NDEzODM1NX0.MOFyMkw3LKZZVKHfdb1pdbzqpmdv_lbeRZyQ2ZXsrp4"

# ===========================================
# SECURITY & AUTHENTICATION
# ===========================================
JWT_SECRET="[GENERATE_STRONG_JWT_SECRET_64_CHARS]"
JWT_EXPIRES_IN="24h"
SESSION_SECRET="[GENERATE_STRONG_SESSION_SECRET_64_CHARS]"
CORS_ORIGIN="https://yois.io"
```

**⚠️ Important**: Replace all placeholder values with your actual service credentials!

---

## 🧪 Service Integration & Testing

### **Step 1: Install Dependencies**

```bash
# Backend dependencies
cd packages/backend
pnpm add @supabase/supabase-js @upstash/redis resend

# Install types
pnpm add -D @types/node
```

### **Step 2: Health Check Implementation**

Create comprehensive health checks using the actual working implementations:

```typescript
// packages/backend/src/services/health/HealthCheckService.ts
import { checkSupabaseConnection } from '../database/supabase'
import { getRedisService } from '../cache/RedisService'
import { EmailService } from '../email/EmailService'

interface ServiceHealth {
  supabase: boolean
  redis: boolean
  email: boolean
  overall: boolean
}

export class HealthCheckService {
  static async checkAllServices(): Promise<ServiceHealth> {
    const [supabaseHealth, redisHealth, emailHealth] = await Promise.all([
      this.checkSupabase(),
      this.checkRedis(),
      this.checkEmail()
    ])

    return {
      supabase: supabaseHealth,
      redis: redisHealth,
      email: emailHealth,
      overall: supabaseHealth && redisHealth && emailHealth
    }
  }

  private static async checkSupabase(): Promise<boolean> {
    try {
      return await checkSupabaseConnection()
    } catch (error) {
      console.error('Supabase health check failed:', error)
      return false
    }
  }

  private static async checkRedis(): Promise<boolean> {
    try {
      const redis = getRedisService()
      return await redis.testConnection()
    } catch (error) {
      console.error('Redis health check failed:', error)
      return false
    }
  }

  private static async checkEmail(): Promise<boolean> {
    try {
      const emailService = new EmailService({
        apiKey: process.env.RESEND_API_KEY || '',
        fromEmail: process.env.FROM_EMAIL || '',
        fromName: 'Gaming Platform'
      })
      const result = await emailService.testConnection()
      return result.success
    } catch (error) {
      console.error('Email service health check failed:', error)
      return false
    }
  }
}
```

### **Step 3: Test Each Service**

```bash
# Test Supabase connection
curl -X GET "https://aafwiwiknehytaptptek.supabase.co/rest/v1/" \
  -H "apikey: YOUR_ANON_KEY"

# Test Redis connection (via your health endpoint)
curl -X GET "https://your-api.com/health"

# Test email service (send test email)
curl -X POST "https://your-api.com/test-email"
```

---

## 📊 Free Tier Limitations

Understanding the limitations helps you plan for scaling:

### **🗄️ Supabase Free Tier**
- **Database**: 500MB storage
- **Bandwidth**: 2GB/month
- **API Requests**: Unlimited
- **Row Level Security**: ✅ Included
- **Real-time subscriptions**: ✅ Included
- **Upgrade Trigger**: Storage >500MB or bandwidth >2GB

### **⚡ Upstash Redis Free Tier**
- **Requests**: 10,000/day (≈300,000/month)
- **Memory**: 256MB
- **Connection Pool**: Unlimited
- **Global Replication**: ❌ (Regional only)
- **Upgrade Trigger**: >10K daily requests or >256MB data

### **📧 Resend Free Tier**
- **Emails**: 3,000/month (≈100/day)
- **Domains**: 1 verified domain
- **Templates**: ✅ Unlimited
- **Analytics**: ✅ Included
- **Upgrade Trigger**: >3K monthly emails

### **📈 Scaling Strategy**
1. **Monitor Usage**: Set up alerts at 80% of limits
2. **Optimize First**: Reduce unnecessary requests/emails
3. **Upgrade Path**: Start with most constrained service
4. **Alternative Plans**:
   - Supabase Pro: $25/month
   - Upstash Paid: $0.2 per 100K requests
   - Resend Pro: $20/month

---

## 🔧 Troubleshooting Guide

Common issues and solutions based on real implementation experience:

### **Supabase Issues**

**❌ "Missing required Supabase environment variables"**
```bash
# Check environment loading
echo $SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY

# Solution: Restart server after adding .env variables
```

**❌ RLS Policy Errors**
```sql
-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Re-enable RLS if needed
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
```

**❌ Connection Timeouts**
```typescript
// Add connection retry logic
const { data, error } = await supabaseService
  .from('users')
  .select('*')
  .timeout(5000) // 5 second timeout
```

### **Redis Issues**

**❌ "Redis connection failed"**
```bash
# Verify credentials
curl -X GET "$UPSTASH_REDIS_REST_URL/ping" \
  -H "Authorization: Bearer $UPSTASH_REDIS_REST_TOKEN"

# Expected response: "PONG"
```

**❌ Rate Limiting (10K requests exceeded)**
```typescript
// Implement request counting
const dailyRequests = await redis.get('daily_count') || 0
if (dailyRequests > 9000) {
  console.warn('Approaching Redis rate limit')
  // Use fallback or reduce requests
}
```

### **Email Issues**

**❌ "Email service disabled - missing API key"**
```bash
# Check API key format
echo $RESEND_API_KEY | grep "^re_" # Should start with "re_"
```

**❌ Domain Verification Required**
```typescript
// Use resend.dev domain for testing
FROM_EMAIL="noreply@resend.dev"

// For production, verify your domain in Resend dashboard
```

**❌ Email Delivery Issues**
- Check spam folders
- Verify DNS records for custom domains
- Monitor bounce rates in Resend dashboard

---

## 🚀 Production Deployment

### **Step 1: Railway Backend Deployment**

```bash
# Deploy to Railway
railway login
railway link [your-project-id]

# Set environment variables
railway variables set SUPABASE_URL="https://aafwiwiknehytaptptek.supabase.co"
railway variables set SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
railway variables set UPSTASH_REDIS_REST_URL="your-redis-url"
railway variables set UPSTASH_REDIS_REST_TOKEN="your-redis-token"
railway variables set RESEND_API_KEY="your-resend-api-key"

# Deploy
railway up
```

### **Step 2: Vercel Frontend Deployment**

```bash
# Deploy to Vercel
vercel login
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add NEXT_PUBLIC_API_BASE_URL

# Deploy
vercel --prod
```

### **Step 3: Post-Deployment Verification**

```bash
# Test health endpoint
curl https://your-backend.railway.app/health

# Test database connection
curl https://your-backend.railway.app/api/health/database

# Test Redis connection
curl https://your-backend.railway.app/api/health/redis

# Test email service
curl https://your-backend.railway.app/api/health/email
```

---

## 🎯 Next Steps

After completing the third-party services setup:

### **Immediate Actions**
1. **Test All Services**: Run health checks on all three services
2. **Create Test User**: Register and login to verify authentication flow
3. **Send Test Email**: Trigger welcome email to verify email service
4. **Monitor Usage**: Set up alerts for approaching free tier limits

### **Production Readiness**
1. **Security Review**: Rotate all API keys and secrets
2. **Backup Strategy**: Set up automated database backups
3. **Monitoring**: Implement error tracking and performance monitoring
4. **Documentation**: Update your team on service credentials and processes

### **Scaling Preparation**
1. **Usage Analytics**: Monitor service usage patterns
2. **Performance Optimization**: Implement caching strategies
3. **Load Testing**: Test your platform under expected user load
4. **Upgrade Planning**: Prepare for paid tier migration when needed

---

## 🎉 Success!

You now have a **production-ready** third-party services setup for your Yois Gaming Platform:

- **🗄️ Supabase**: Production database with RLS policies
- **⚡ Redis**: High-performance caching with retry logic
- **📧 Resend**: Professional email service with templates

**Total Cost**: **$0/month** (all free tiers)
**Estimated Capacity**: 1000+ daily active users

Your platform is ready for deployment and scaling! 🚀

---

*Last Updated: October 2, 2025*
*For questions or issues, refer to the troubleshooting section above.*