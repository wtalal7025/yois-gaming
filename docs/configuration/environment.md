# ⚙️ Environment Configuration

**Gaming Platform - Environment Variable Reference**

This document provides a complete reference for all environment variables used in the gaming platform, including development and production configurations.

## 📋 Configuration Overview

### Environment Files Structure
```
project-root/
├── .env.example              # Template with all variables
├── .env                     # Local development (git-ignored)
├── .env.development         # Development environment
├── .env.staging            # Staging environment
├── .env.production         # Production environment (encrypted)
└── environments/
    ├── development.env     # Additional dev configs
    ├── staging.env        # Additional staging configs
    └── production.env     # Additional prod configs
```

## 🔧 Complete Environment Variables Reference

### Application Core Settings
```bash
# Node.js Environment
NODE_ENV=production                    # development|staging|production
LOG_LEVEL=info                        # debug|info|warn|error
PORT=3001                             # API server port
WEB_PORT=3000                         # Web server port

# Application Metadata
APP_NAME="Gaming Platform"            # Application display name
APP_VERSION=1.0.0                     # Current application version
APP_URL=https://your-domain.com       # Full application URL
API_URL=https://api.your-domain.com   # API base URL
WEB_URL=https://your-domain.com       # Web application URL
WS_URL=wss://api.your-domain.com      # WebSocket URL

# Timezone and Localization
TZ=UTC                                # Server timezone
DEFAULT_LOCALE=en-US                  # Default locale
SUPPORTED_LOCALES=en-US,es-ES,fr-FR,de-DE,it-IT,pt-BR,ru-RU,ja-JP,ko-KR,zh-CN,ar-SA,hi-IN,th-TH,vi-VN,tr-TR
```

### Database Configuration
```bash
# PostgreSQL Database
DATABASE_URL=postgresql://user:pass@localhost:5432/dbname
DB_HOST=localhost                     # Database host
DB_PORT=5432                         # Database port
DB_NAME=gaming_platform              # Database name
DB_USER=gaming_user                  # Database username
DB_PASSWORD=secure_password          # Database password
DB_SSL=true                          # Enable SSL for database connections

# Connection Pool Settings
DB_POOL_MIN=2                        # Minimum connections in pool
DB_POOL_MAX=20                       # Maximum connections in pool
DB_POOL_IDLE_TIMEOUT=30000           # Idle connection timeout (ms)
DB_POOL_ACQUIRE_TIMEOUT=60000        # Connection acquire timeout (ms)

# Database Features
DB_LOGGING=false                     # Enable query logging
DB_MIGRATIONS_AUTO=true              # Auto-run migrations on startup
DB_SEEDS_AUTO=false                  # Auto-run seeds on startup
```

### Redis Configuration
```bash
# Redis Cache and Sessions
REDIS_URL=redis://localhost:6379     # Redis connection URL
REDIS_HOST=localhost                 # Redis host
REDIS_PORT=6379                      # Redis port
REDIS_PASSWORD=                      # Redis password (empty for no auth)
REDIS_DB=0                          # Redis database number
REDIS_KEY_PREFIX=gaming:             # Key prefix for namespacing

# Redis Features
REDIS_CLUSTER=false                  # Enable cluster mode
REDIS_SENTINEL=false                 # Enable sentinel mode
REDIS_TLS=false                      # Enable TLS for Redis connections
```

### Authentication & Security
```bash
# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-256-bits-long
JWT_REFRESH_SECRET=your-refresh-secret-equally-long-and-secure
JWT_EXPIRES_IN=15m                   # Access token expiry (15 minutes)
JWT_REFRESH_EXPIRES_IN=7d            # Refresh token expiry (7 days)
JWT_ALGORITHM=HS256                  # JWT signing algorithm
JWT_ISSUER=gaming-platform           # JWT issuer

# Password Security
BCRYPT_ROUNDS=12                     # BCrypt hashing rounds (12+ for production)
PASSWORD_MIN_LENGTH=8                # Minimum password length
PASSWORD_REQUIRE_UPPERCASE=true      # Require uppercase letters
PASSWORD_REQUIRE_LOWERCASE=true      # Require lowercase letters
PASSWORD_REQUIRE_NUMBERS=true        # Require numbers
PASSWORD_REQUIRE_SYMBOLS=false       # Require special symbols

# Session Configuration
SESSION_SECRET=your-session-secret-key
SESSION_NAME=gaming_session          # Session cookie name
SESSION_DURATION=86400000           # Session duration (24 hours in ms)
SESSION_SECURE=true                  # Secure flag for production
SESSION_HTTP_ONLY=true              # HttpOnly flag for security
SESSION_SAME_SITE=strict            # SameSite policy
```

### Game Engine Configuration
```bash
# Game RTP (Return to Player) Settings
GAME_RTP_MINES=97.0                 # Mines game RTP percentage
GAME_RTP_SUGAR_RUSH=96.5            # Sugar Rush game RTP percentage
GAME_RTP_BARS=95.0                  # Bars game RTP percentage
GAME_RTP_DRAGON_TOWER=97.5          # Dragon Tower game RTP percentage
GAME_RTP_CRASH=99.0                 # Crash game RTP percentage
GAME_RTP_LIMBO=99.0                 # Limbo game RTP percentage

# Game Limits
GAME_MIN_BET=0.01                   # Minimum bet amount
GAME_MAX_BET=1000.00                # Maximum bet amount
GAME_MAX_WIN=100000.00              # Maximum win amount per game
GAME_MAX_SESSIONS_PER_USER=5        # Max concurrent sessions per user

# Game Features
GAME_AUTO_PLAY_ENABLED=true         # Enable auto-play features
GAME_MAX_AUTO_PLAYS=1000            # Maximum auto-plays per session
GAME_PROVABLY_FAIR=true             # Enable provably fair system
GAME_STATISTICS_ENABLED=true        # Enable game statistics tracking

# Game Performance
GAME_TICK_RATE=60                   # Game engine tick rate (FPS)
GAME_MAX_HISTORY=1000               # Maximum game history entries
GAME_CACHE_TTL=300                  # Game cache TTL in seconds
```

### Wallet & Financial Settings
```bash
# Wallet Configuration
WALLET_CURRENCY=USD                  # Primary currency
WALLET_PRECISION=2                   # Decimal places for currency
WALLET_MIN_BALANCE=0.00             # Minimum allowed balance
WALLET_MAX_BALANCE=1000000.00       # Maximum allowed balance

# Transaction Limits
TRANSACTION_MIN_DEPOSIT=1.00        # Minimum deposit amount
TRANSACTION_MAX_DEPOSIT=10000.00    # Maximum deposit amount
TRANSACTION_MIN_WITHDRAWAL=5.00     # Minimum withdrawal amount
TRANSACTION_MAX_WITHDRAWAL=50000.00 # Maximum withdrawal amount

# Transaction Fees
DEPOSIT_FEE_PERCENTAGE=0.0          # Deposit fee percentage
WITHDRAWAL_FEE_PERCENTAGE=2.5       # Withdrawal fee percentage
WITHDRAWAL_FEE_FIXED=1.00          # Fixed withdrawal fee

# Financial Security
TRANSACTION_VERIFICATION=true        # Require transaction verification
LARGE_TRANSACTION_THRESHOLD=1000.00 # Threshold for enhanced verification
FRAUD_DETECTION=true                # Enable fraud detection
AML_COMPLIANCE=true                 # Enable AML compliance checking
```

### Rate Limiting & Security
```bash
# Rate Limiting
RATE_LIMIT_WINDOW=900000            # Rate limit window (15 minutes)
RATE_LIMIT_MAX_REQUESTS=100         # Max requests per window
RATE_LIMIT_LOGIN_MAX=5              # Max login attempts per window
RATE_LIMIT_REGISTER_MAX=3           # Max registration attempts per window
RATE_LIMIT_API_MAX=1000             # Max API requests per window

# CORS Configuration
CORS_ORIGIN=https://your-domain.com  # Allowed CORS origins (comma-separated)
CORS_CREDENTIALS=true               # Allow credentials in CORS
CORS_METHODS=GET,POST,PUT,DELETE    # Allowed HTTP methods

# Security Headers
SECURITY_HEADERS_ENABLED=true       # Enable security headers
CSP_POLICY=default-src 'self'       # Content Security Policy
HSTS_MAX_AGE=31536000              # HSTS max age in seconds
X_FRAME_OPTIONS=SAMEORIGIN         # X-Frame-Options header
```

### Email & Notifications
```bash
# Email Configuration
SMTP_HOST=smtp.your-provider.com    # SMTP server hostname
SMTP_PORT=587                       # SMTP server port
SMTP_SECURE=false                   # Use TLS (false for STARTTLS)
SMTP_USER=your-smtp-username        # SMTP username
SMTP_PASSWORD=your-smtp-password    # SMTP password
SMTP_FROM_EMAIL=noreply@your-domain.com # From email address
SMTP_FROM_NAME=Gaming Platform      # From name

# Email Features
EMAIL_VERIFICATION=true             # Enable email verification
PASSWORD_RESET_ENABLED=true         # Enable password reset emails
NOTIFICATION_EMAILS=true            # Enable notification emails
MARKETING_EMAILS=false              # Enable marketing emails
```

### Third-Party Integrations
```bash
# Analytics
GOOGLE_ANALYTICS_ID=GA-XXXXXXXXX-X  # Google Analytics tracking ID
MIXPANEL_TOKEN=your-mixpanel-token  # Mixpanel analytics token
HOTJAR_ID=your-hotjar-id           # Hotjar user experience analytics

# Social Authentication
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FACEBOOK_CLIENT_ID=your-facebook-client-id
FACEBOOK_CLIENT_SECRET=your-facebook-client-secret

# Payment Providers
STRIPE_PUBLIC_KEY=pk_test_xxxxxx    # Stripe publishable key
STRIPE_SECRET_KEY=sk_test_xxxxxx    # Stripe secret key
STRIPE_WEBHOOK_SECRET=whsec_xxxxxx  # Stripe webhook secret
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_CLIENT_SECRET=your-paypal-client-secret
```

### Monitoring & Logging
```bash
# Application Monitoring
APM_ENABLED=true                    # Enable application performance monitoring
APM_SERVICE_NAME=gaming-platform    # APM service name
APM_SERVICE_VERSION=1.0.0          # APM service version
APM_ENVIRONMENT=production          # APM environment name

# Error Tracking
SENTRY_DSN=https://xxx@sentry.io/xxx # Sentry error tracking DSN
ERROR_REPORTING=true               # Enable error reporting
ERROR_SAMPLING_RATE=1.0            # Error sampling rate (0.0-1.0)

# Logging Configuration
LOG_FORMAT=json                    # Log format (json|text)
LOG_TIMESTAMP=true                 # Include timestamps in logs
LOG_REQUEST_ID=true                # Include request IDs in logs
LOG_FILE_ENABLED=true              # Enable file logging
LOG_FILE_PATH=/var/log/gaming      # Log file directory
LOG_ROTATION=daily                 # Log rotation frequency
LOG_MAX_FILES=30                   # Maximum log files to retain
```

### Performance & Caching
```bash
# Application Caching
CACHE_TTL=3600                     # Default cache TTL (1 hour)
CACHE_ENABLED=true                 # Enable application caching
CACHE_COMPRESSION=true             # Enable cache compression

# Static Asset Configuration
CDN_URL=https://cdn.your-domain.com # CDN URL for static assets
STATIC_CACHE_TTL=31536000          # Static asset cache TTL (1 year)
ASSET_VERSIONING=true              # Enable asset versioning

# Database Performance
DB_QUERY_TIMEOUT=30000             # Database query timeout (ms)
DB_STATEMENT_TIMEOUT=30000         # Statement timeout (ms)
DB_EXPLAIN_ANALYZE=false           # Enable query analysis logging
```

## 🌍 Environment-Specific Configurations

### Development Environment (.env.development)
```bash
NODE_ENV=development
LOG_LEVEL=debug
DB_LOGGING=true
GAME_PROVABLY_FAIR=false
RATE_LIMIT_ENABLED=false
EMAIL_VERIFICATION=false
BCRYPT_ROUNDS=4
JWT_EXPIRES_IN=24h
SESSION_SECURE=false
CORS_ORIGIN=http://localhost:3000
CDN_URL=http://localhost:3000
```

### Staging Environment (.env.staging)
```bash
NODE_ENV=staging
LOG_LEVEL=info
DB_LOGGING=false
GAME_PROVABLY_FAIR=true
RATE_LIMIT_ENABLED=true
EMAIL_VERIFICATION=true
BCRYPT_ROUNDS=10
JWT_EXPIRES_IN=30m
SESSION_SECURE=true
CORS_ORIGIN=https://staging.your-domain.com
CDN_URL=https://cdn-staging.your-domain.com
```

### Production Environment (.env.production)
```bash
NODE_ENV=production
LOG_LEVEL=warn
DB_LOGGING=false
GAME_PROVABLY_FAIR=true
RATE_LIMIT_ENABLED=true
EMAIL_VERIFICATION=true
BCRYPT_ROUNDS=12
JWT_EXPIRES_IN=15m
SESSION_SECURE=true
CORS_ORIGIN=https://your-domain.com
CDN_URL=https://cdn.your-domain.com
```

## 🔒 Security Best Practices

### Secret Management
```bash
# Use strong, randomly generated secrets
JWT_SECRET=$(openssl rand -hex 64)
JWT_REFRESH_SECRET=$(openssl rand -hex 64)
SESSION_SECRET=$(openssl rand -hex 32)

# Different secrets for each environment
DEV_JWT_SECRET=development-only-secret
STAGING_JWT_SECRET=staging-environment-secret
PROD_JWT_SECRET=production-secure-secret
```

### Environment Variable Validation
```javascript
// Example validation schema
const envSchema = {
  NODE_ENV: { type: 'string', enum: ['development', 'staging', 'production'] },
  PORT: { type: 'number', min: 1, max: 65535 },
  DATABASE_URL: { type: 'string', format: 'uri' },
  JWT_SECRET: { type: 'string', minLength: 32 },
  GAME_RTP_MINES: { type: 'number', min: 85, max: 99 }
};
```

### Encryption for Sensitive Data
```bash
# Use encryption for sensitive environment files
gpg --symmetric --cipher-algo AES256 .env.production
# Creates .env.production.gpg

# Decrypt when needed
gpg --decrypt .env.production.gpg > .env.production
```

## 🧪 Configuration Testing

### Environment Validation Script
```bash
#!/bin/bash
# scripts/validate-env.sh

echo "🧪 Validating environment configuration..."

# Check required variables
required_vars=(
  "NODE_ENV"
  "DATABASE_URL"
  "REDIS_URL"
  "JWT_SECRET"
  "JWT_REFRESH_SECRET"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing required environment variable: $var"
    exit 1
  else
    echo "✅ $var is set"
  fi
done

# Check database connection
if node -e "require('./scripts/test-db.js')"; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  exit 1
fi

# Check Redis connection
if node -e "require('./scripts/test-redis.js')"; then
  echo "✅ Redis connection successful"
else
  echo "❌ Redis connection failed"
  exit 1
fi

echo "✅ All environment validations passed"
```

## 📋 Configuration Checklist

### Development Setup
- [ ] `.env` file created from `.env.example`
- [ ] Database credentials configured
- [ ] Redis connection configured
- [ ] JWT secrets generated
- [ ] Email configuration (if needed)
- [ ] All required variables set
- [ ] Environment validation script passes

### Production Deployment
- [ ] Production environment variables configured
- [ ] Secrets securely stored (not in source control)
- [ ] Database connection strings use production values
- [ ] SSL/TLS enabled for all connections
- [ ] Rate limiting properly configured
- [ ] CORS origins restricted to production domains
- [ ] Security headers enabled
- [ ] Error reporting configured
- [ ] Monitoring and logging enabled
- [ ] Backup and recovery procedures tested

## 🚨 Troubleshooting

### Common Configuration Issues

#### Database Connection Errors
```bash
# Test database connection
node -e "
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
pool.query('SELECT NOW()').then(() => console.log('✅ DB OK')).catch(console.error);
"
```

#### Redis Connection Errors
```bash
# Test Redis connection
node -e "
const Redis = require('redis');
const client = Redis.createClient(process.env.REDIS_URL);
client.ping().then(() => console.log('✅ Redis OK')).catch(console.error);
"
```

#### JWT Token Issues
```bash
# Verify JWT secret length
node -e "console.log('JWT Secret length:', process.env.JWT_SECRET.length)"
# Should be at least 32 characters for security
```

### Configuration Debugging
```bash
# Debug environment loading
DEBUG=* npm start

# Check loaded configuration
node -e "console.log(JSON.stringify(process.env, null, 2))"

# Validate specific configuration
node scripts/debug-config.js
```

---

**Next Steps:**
- Configure [Database Settings](./database.md)
- Set up [Game Configuration](./games.md)
- Review [Security Configuration](../security/setup.md)