# 🚀 Supabase Migration Guide for Gaming Platform

## Overview
This guide provides step-by-step instructions to migrate from the local PostgreSQL + JWT authentication system to Supabase for production-ready online storage and authentication.

## 🎯 Why Supabase?
- **50K Monthly Active Users** - Perfect for free tier
- **500MB PostgreSQL Database** - Sufficient for gaming platform
- **Unlimited API Requests** - Critical for real-time gaming
- **Built-in Authentication** - Replace complex JWT system
- **Real-time Subscriptions** - Live game updates
- **Row Level Security** - Automatic data protection

---

## 📋 Prerequisites

### 1. Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Fill in project details:
   - **Name**: `stake-gaming-platform`
   - **Database Password**: Generate strong password
   - **Region**: Choose closest to your users
5. Wait for project setup (2-3 minutes)

### 2. Gather Supabase Credentials
After project creation, go to Project Settings > API:
- **Project URL**: `https://your-project-ref.supabase.co`
- **Anon Public Key**: `eyJhbGciOiJIUzI1NiIsIn...`
- **Service Role Key**: `eyJhbGciOiJIUzI1NiIsIn...` (Keep secret!)

---

## ⚙️ Environment Configuration

### Backend Configuration
Update `packages/backend/.env`:
```env
# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsIn...

# Keep existing for migration reference
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stake_games"
```

### Frontend Configuration
**📝 Create `packages/frontend/.env.local`** (if it doesn't exist):

> **💡 Important**: This file may not exist yet and needs to be created. If the file is missing, create it first, then add the configuration below.

> **📋 Note**: The frontend uses the same Supabase project as the backend, but only requires **public** environment variables. Copy the values from your backend configuration above.

```env
# Supabase Configuration (Public keys only - safe for client-side)
# Copy SUPABASE_URL from packages/backend/.env (same value)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co

# Copy SUPABASE_ANON_KEY from packages/backend/.env (same value)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsIn...
```

**⚠️ Important**:
- Only use the **URL** and **ANON_KEY** in frontend configuration
- Never expose the **SERVICE_ROLE_KEY** in frontend code
- The `NEXT_PUBLIC_` prefix makes these variables available to the browser

---

## 🗄️ Database Migration

### Step 1: Create Database Schema
1. Open Supabase Dashboard > SQL Editor
2. Copy contents of `packages/backend/src/database/migrations/supabase_init.sql`
3. Paste and run in SQL Editor
4. Verify all tables are created successfully

### Step 2: Set Up Security Policies
1. In Supabase Dashboard > SQL Editor
2. Copy contents of `packages/backend/src/database/migrations/supabase_policies.sql`
3. Paste and run in SQL Editor
4. Verify Row Level Security is enabled on all tables

### Step 3: Enable Authentication
1. Go to Authentication > Settings
2. Enable Email provider
3. Configure Site URL: `http://localhost:3000` (development)
4. Add production URLs when deploying

---

## 🔧 Code Integration

### Backend Integration
The following files are already configured:
- `packages/backend/src/database/supabase.ts` - Supabase client
- `packages/backend/src/types/supabase.ts` - Database types

### Frontend Integration  
The following files are already configured:
- `packages/frontend/src/lib/supabase.ts` - Client configuration
- `packages/frontend/src/types/supabase.ts` - Database types

---

## 🔄 Migration Process

### Phase 1: Parallel Running (Recommended)
1. Keep existing local system running
2. Deploy Supabase configuration alongside
3. Test authentication flows
4. Validate all game functions work
5. Run both systems in parallel for safety

### Phase 2: Data Migration (OPTIONAL - Read This First!)

> **⚠️ IMPORTANT: Determine if you need this phase**
>
> **SKIP Phase 2 entirely if:**
> - You have no users or only test users (usernames like `testuser`, emails like `test@example.com`)
> - You have no game sessions or transaction history worth preserving
> - Your local database has authentication issues or schema mismatches
> - You're experiencing "login failed" errors with the local system
> - This is essentially a fresh project or development environment
>
> **PROCEED with Phase 2 only if:**
> - You have real users with meaningful usernames and email addresses
> - You have actual game transaction history and balances to preserve
> - Your local authentication system is working properly
> - You have production data that cannot be recreated

#### Option A: Skip Data Migration (Recommended for Most Users)
If you fall into the "SKIP" category above:

1. **Skip to Phase 3** - Go directly to the switch-over section
2. **Start Fresh**: Users will need to re-register on your Supabase-powered platform
3. **Benefits**:
   - Clean start with proper schema
   - No data inconsistency issues
   - Faster migration process
   - No risk of importing problematic data

#### Option B: Migrate Existing Data (Only for Production Systems)
If you have valuable production data to preserve:

```bash
# First, verify your data is worth migrating
# Check what you actually have:
docker exec -it stake-games-db psql -U postgres -d stake_games -c "
SELECT
  (SELECT COUNT(*) FROM users) as user_count,
  (SELECT COUNT(*) FROM transactions) as transaction_count,
  (SELECT COUNT(*) FROM game_sessions) as game_session_count;
"

# Only proceed if counts are significant AND data is production-worthy

# Export existing user data
pg_dump -h localhost -U postgres -d stake_games -t users --data-only --inserts > users_export.sql

# Export transaction data (if exists)
pg_dump -h localhost -U postgres -d stake_games -t transactions --data-only --inserts > transactions_export.sql

# Import to Supabase using Dashboard > SQL Editor
# Note: You may need to modify the SQL to match Supabase schema requirements
```

#### Option C: Hybrid Approach (Manual Recreation)
For small amounts of important data:

1. **Export usernames/emails manually** from local database
2. **Set up Supabase with fresh schema**
3. **Manually recreate accounts** for important users
4. **Start fresh with balances and game data**

### Phase 3: Switch Over
1. Update environment variables to use Supabase
2. Update authentication to use Supabase Auth
3. Test all functionality thoroughly
4. Monitor for any issues

---

## 🧪 Testing Checklist

### Authentication Testing
- [ ] User registration works
- [ ] User login works  
- [ ] User logout works
- [ ] Session persistence works
- [ ] Password reset works

### Game Testing
- [ ] All 6 games load properly
- [ ] Betting and balance updates work
- [ ] Game sessions are recorded
- [ ] Transaction history is accurate
- [ ] Real-time updates work

### Security Testing
- [ ] Users can only see their own data
- [ ] Row Level Security prevents data leaks
- [ ] API endpoints are properly protected
- [ ] Balance manipulation is prevented

---

## 🚨 Rollback Plan

If issues arise, you can quickly rollback:

### Quick Rollback Steps
1. Update `.env` files to use local database:
   ```env
   # Comment out Supabase
   # SUPABASE_URL=...
   
   # Enable local database
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stake_games"
   ```
2. Restart backend services
3. Verify local system is working
4. Debug Supabase issues separately

### Data Backup
- Regularly export Supabase data during migration
- Keep local database as backup during transition
- Use Supabase's built-in backup features

---

## 📊 Monitoring & Maintenance

### Supabase Dashboard Monitoring
- Monitor API usage in Dashboard > Settings > Usage
- Check database size regularly
- Monitor authentication metrics
- Set up alerts for usage limits

### Performance Optimization
- Use database indexes (already configured)
- Monitor slow queries in Dashboard
- Optimize real-time subscriptions
- Cache frequently accessed data

---

## 🔧 Troubleshooting

### Common Issues

#### "Missing Supabase environment variables"
- Verify all environment variables are set correctly
- Restart development servers after changing .env files

#### "Row Level Security prevents access"  
- Check RLS policies in Dashboard > Authentication > Policies
- Ensure user is properly authenticated
- Verify user ID matches in database

#### "Connection timeout errors"
- Check internet connection
- Verify Supabase project is active
- Check project region/performance

#### "API rate limits"
- Monitor usage in Dashboard > Settings > Usage  
- Optimize API calls to reduce frequency
- Implement proper caching strategies

---

## 📈 Scaling Considerations

### Free Tier Limits
- **50K MAUs**: Monitor active user count
- **500MB DB**: Monitor database size growth
- **5GB Egress**: Optimize API response sizes

### Upgrade Path
When approaching limits:
1. **Pro Plan**: $25/month for 100K MAUs + more storage
2. **Optimize Queries**: Reduce database size/API calls
3. **Implement Caching**: Reduce database load

---

## ✅ Success Criteria

Migration is successful when:
- [ ] All authentication flows work seamlessly
- [ ] All 6 games function identically to local setup
- [ ] User balances and transactions are accurate
- [ ] Real-time features work (if implemented)
- [ ] Performance is equal or better than local setup
- [ ] No data loss or corruption occurred
- [ ] Security policies protect user data properly

---

*This migration should provide a production-ready, scalable authentication and database system for your gaming platform while maintaining all existing functionality.*