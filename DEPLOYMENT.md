# 🚀 Production Deployment Guide

Complete guide for deploying the Stake Games platform to production using containerized architecture with Vercel (frontend) and Railway (backend).

## 📋 Overview

This deployment setup provides:
- **Frontend**: Next.js on Vercel with CDN, automatic SSL, and global edge deployment
- **Backend**: Fastify API on Railway with Docker containers and auto-scaling
- **Database**: Supabase PostgreSQL with automated backups
- **Cache**: Upstash Redis for session management and performance
- **Storage**: Supabase Storage for game assets and user uploads
- **Email**: Resend service for notifications and authentication
- **Monitoring**: Comprehensive logging, metrics, and error tracking
- **Security**: Production-hardened security configurations
- **CI/CD**: Automated deployment pipeline with GitHub Actions

## 🛠️ Prerequisites

### Required Accounts & Services
1. **GitHub Account** - For source code and CI/CD
2. **Vercel Account** - For frontend deployment
3. **Railway Account** - For backend deployment
4. **Supabase Account** - For database and storage
5. **Upstash Account** - For Redis cache
6. **Resend Account** - For email services
7. **Sentry Account** (Optional) - For error tracking

### Required Tools
- Node.js 22+ and pnpm
- Docker Desktop
- Git CLI

## 🔧 Environment Setup

### 1. Production Environment Variables

Create `.env.production` with the following variables:

```bash
# Database Configuration (Supabase)
DATABASE_URL="postgresql://[username]:[password]@db.[project-ref].supabase.co:6543/postgres?pgbouncer=true&connection_limit=10"
SUPABASE_URL="https://[project-ref].supabase.co"
SUPABASE_ANON_KEY="[your-anon-key]"
SUPABASE_SERVICE_ROLE_KEY="[your-service-role-key]"

# Redis Configuration (Upstash)
REDIS_URL="rediss://[username]:[password]@[endpoint]:6379"
UPSTASH_REDIS_REST_URL="https://[endpoint].upstash.io"
UPSTASH_REDIS_REST_TOKEN="[your-token]"

# Email Configuration (Resend)
RESEND_API_KEY="re_[your-resend-api-key]"
FROM_EMAIL="noreply@yourdomain.com"

# Storage Configuration
SUPABASE_STORAGE_URL="https://[project-ref].supabase.co/storage/v1"
SUPABASE_STORAGE_BUCKET="game-assets"

# Application URLs
FRONTEND_URL="https://your-domain.com"
BACKEND_URL="https://your-api.railway.app"
ADMIN_URL="https://admin.your-domain.com"

# Security Configuration
JWT_SECRET="[generate-strong-secret-key]"
SESSION_SECRET="[generate-strong-session-secret]"
ENCRYPTION_KEY="[generate-32-byte-hex-key]"

# Monitoring & Logging
SENTRY_DSN="https://[key]@[org-id].ingest.sentry.io/[project-id]"
SENTRY_RELEASE="1.0.0"

# Backup Configuration
BACKUP_BUCKET="stake-games-backups"
BACKUP_ENCRYPTION_KEY="[generate-backup-encryption-key]"

# Performance & Limits
RATE_LIMIT_MAX="100"
RATE_LIMIT_WINDOW="900000"
MAX_FILE_SIZE="5242880"
```

### 2. Staging Environment Variables

Create `.env.staging` for testing deployments (similar to production but with relaxed settings).

## 🐳 Docker Deployment

### Building Containers Locally

```bash
# Build backend container
cd packages/backend
docker build -t stake-games-backend .

# Build frontend container  
cd apps/web
docker build -t stake-games-frontend .

# Run full stack locally
docker-compose -f docker-compose.prod.yml up
```

### Production Container Registry

Images are automatically built and pushed during CI/CD pipeline. Manual builds:

```bash
# Tag for production
docker tag stake-games-backend:latest registry.railway.app/[project-id]:latest

# Push to Railway registry
docker push registry.railway.app/[project-id]:latest
```

## ☁️ Platform Deployment

### Vercel Frontend Deployment

1. **Connect Repository**
   ```bash
   # Install Vercel CLI
   npm i -g vercel
   
   # Login and link project
   vercel login
   vercel --cwd apps/web
   ```

2. **Configure Build Settings**
   - Build Command: `cd ../.. && pnpm build:web`
   - Output Directory: `apps/web/.next`
   - Install Command: `cd ../.. && pnpm install`

3. **Environment Variables**
   Add all frontend environment variables in Vercel dashboard under Settings → Environment Variables.

4. **Domain Configuration**
   - Add custom domain in Vercel dashboard
   - Configure DNS records pointing to Vercel
   - SSL certificates are automatically managed

### Railway Backend Deployment

1. **Create Railway Project**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login and create project
   railway login
   railway init
   ```

2. **Configure Deployment**
   - Connect GitHub repository
   - Set root directory to project root
   - Use `railway.json` configuration for Docker build
   - Set environment variables in Railway dashboard

3. **Environment Variables**
   Add all backend environment variables in Railway dashboard under Variables tab.

4. **Scaling Configuration**
   - Memory: 512MB-2GB (auto-scaling)
   - CPU: Shared to dedicated based on load
   - Replicas: 1-3 (auto-scaling enabled)

## 🔄 CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/deploy.yml`) automatically:

1. **Quality Checks**
   - Runs linting and type checking
   - Executes test suites
   - Performs security scanning

2. **Build Process**
   - Builds Docker containers
   - Optimizes for production
   - Validates build integrity

3. **Deployment**
   - Deploys frontend to Vercel
   - Deploys backend to Railway
   - Runs post-deployment tests

4. **Notifications**
   - Slack notifications for deployment status
   - Email alerts for failures

### Triggering Deployments

```bash
# Production deployment (main branch)
git push origin main

# Staging deployment (staging branch)
git push origin staging

# Rollback to previous version
railway rollback [deployment-id]
```

## 🔍 Monitoring & Logging

### Application Monitoring

1. **Health Checks**
   - Backend: `https://your-api.railway.app/health`
   - Frontend: Automatic Vercel monitoring
   - Database: Supabase dashboard metrics

2. **Performance Monitoring**
   - Response times: `https://your-api.railway.app/metrics`
   - Error rates: Sentry dashboard
   - Resource usage: Railway metrics

3. **Log Access**
   ```bash
   # Railway logs
   railway logs
   
   # Vercel logs
   vercel logs
   
   # Application logs
   tail -f logs/application.log
   ```

### Alerts Configuration

Production monitoring automatically alerts on:
- Application errors (>5% error rate)
- High response times (>2s average)
- Service downtime
- Database connection issues
- Memory/CPU threshold breaches

## 🔒 Security Configuration

### SSL/TLS Setup
- **Vercel**: Automatic SSL certificates for all domains
- **Railway**: Automatic SSL for railway.app domains
- **Custom Domains**: SSL certificates auto-provisioned

### Security Headers
Production deployment includes:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### Access Control
- CORS configured for production domains only
- Rate limiting: 100 requests per 15 minutes per IP
- Input validation and sanitization
- SQL injection protection
- XSS protection enabled

## 💾 Backup & Recovery

### Automated Backups
- **Database**: Daily backups at 2 AM UTC
- **Files**: Weekly backups on Sundays at 3 AM UTC
- **Logs**: Weekly log archival on Sundays at 4 AM UTC

### Backup Retention
- Daily backups: 7 days
- Weekly backups: 4 weeks  
- Monthly backups: 12 months

### Recovery Procedures

1. **Database Recovery**
   ```bash
   # List available backups
   railway run -- node -e "require('./src/config/backup').backupService.getBackupHistory('database')"
   
   # Restore from backup
   railway run -- node -e "require('./src/config/backup').backupService.restoreFromBackup('[backup-id]')"
   ```

2. **File Recovery**
   ```bash
   # Emergency backup creation
   railway run -- node -e "require('./src/config/backup').createEmergencyBackup()"
   ```

3. **Service Recovery**
   ```bash
   # Restart services
   railway restart
   vercel rollback
   ```

## 🚨 Troubleshooting

### Common Deployment Issues

1. **Build Failures**
   ```bash
   # Check build logs
   railway logs --deployment [deployment-id]
   
   # Local build test
   pnpm build:backend
   pnpm build:web
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connectivity
   railway run -- node -e "require('./packages/backend/src/database').testConnection()"
   
   # Check connection pool status
   railway logs | grep "database"
   ```

3. **Redis Connection Issues**
   ```bash
   # Test Redis connectivity
   railway run -- node -e "require('./packages/backend/src/config/redis').testConnection()"
   ```

4. **Environment Variable Issues**
   ```bash
   # Verify environment variables
   railway vars
   vercel env ls
   ```

### Performance Issues

1. **High Memory Usage**
   ```bash
   # Check memory usage
   railway metrics
   
   # Restart with more memory
   railway up --memory 1GB
   ```

2. **Slow Response Times**
   ```bash
   # Check performance metrics
   curl https://your-api.railway.app/metrics
   
   # Scale up resources
   railway scale --replicas 2
   ```

3. **Database Performance**
   ```bash
   # Check slow queries
   railway run -- psql $DATABASE_URL -c "SELECT query, calls, total_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
   ```

### Security Issues

1. **Rate Limiting Triggers**
   ```bash
   # Check rate limit logs
   railway logs | grep "rate-limit"
   
   # Whitelist specific IPs if needed
   railway vars set WHITELIST_IPS="1.2.3.4,5.6.7.8"
   ```

2. **SSL Certificate Issues**
   - Vercel: Automatically resolves within 24 hours
   - Railway: Contact support for custom domain SSL

### Rollback Procedures

1. **Frontend Rollback**
   ```bash
   vercel rollback
   ```

2. **Backend Rollback**
   ```bash
   railway rollback [deployment-id]
   ```

3. **Database Rollback**
   ```bash
   # Restore from backup (see Recovery Procedures)
   railway run -- node -e "require('./src/config/backup').backupService.restoreFromBackup('[backup-id]')"
   ```

## 📊 Monitoring Dashboard URLs

After deployment, access monitoring via:

- **Application Health**: `https://your-api.railway.app/health`
- **Metrics Endpoint**: `https://your-api.railway.app/metrics`
- **Railway Dashboard**: https://railway.app/project/[project-id]
- **Vercel Dashboard**: https://vercel.com/[team]/[project]
- **Supabase Dashboard**: https://app.supabase.com/project/[project-ref]
- **Upstash Console**: https://console.upstash.com/redis/[database-id]
- **Sentry Dashboard**: https://sentry.io/organizations/[org]/projects/[project]/

## ✅ Post-Deployment Checklist

After successful deployment, verify:

- [ ] Frontend accessible at production URL
- [ ] Backend API responding at `/health` endpoint
- [ ] Database connections working
- [ ] Redis cache operational
- [ ] Email services sending correctly
- [ ] File uploads working
- [ ] All games functional
- [ ] User authentication working
- [ ] Monitoring systems active
- [ ] Backup schedules running
- [ ] SSL certificates valid
- [ ] Performance metrics within acceptable ranges
- [ ] Security headers configured
- [ ] Rate limiting functional

## 🎯 Performance Optimization

Post-deployment optimization recommendations:

1. **Enable CDN caching** for static assets
2. **Configure Redis caching** for frequently accessed data
3. **Optimize database queries** using monitoring insights
4. **Enable compression** for API responses
5. **Implement service worker** for offline functionality
6. **Use image optimization** for game assets
7. **Configure auto-scaling** based on traffic patterns

## 📞 Support & Maintenance

### Regular Maintenance Tasks

- **Weekly**: Review performance metrics and error rates
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Review and optimize database performance
- **Annually**: Security audit and penetration testing

### Support Contacts

- **Platform Issues**: Railway/Vercel support
- **Database Issues**: Supabase support
- **Email Issues**: Resend support
- **Cache Issues**: Upstash support

---

*Last Updated: 2024-09-23*
*Version: 1.0.0*