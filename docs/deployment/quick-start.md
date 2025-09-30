# 🚀 Quick Start Deployment Guide

**Gaming Platform - Rapid Development Setup**

This guide will get you up and running with the complete gaming platform in under 10 minutes.

## 📋 Prerequisites

### System Requirements
- **Node.js**: Version 20 or higher
- **Docker**: Version 24.0 or higher
- **Docker Compose**: Version 2.20 or higher
- **pnpm**: Version 8.0 or higher
- **Git**: Latest version

### Hardware Requirements
- **Minimum**: 4GB RAM, 2 CPU cores, 10GB disk space
- **Recommended**: 8GB RAM, 4 CPU cores, 20GB disk space

### Operating System Support
- ✅ Windows 10/11 (with WSL2)
- ✅ macOS 12.0+
- ✅ Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)

## ⚡ One-Command Setup

### 1. Clone and Setup Repository
```bash
# Clone the repository
git clone <repository-url> gaming-platform
cd gaming-platform

# Install dependencies
pnpm install

# Copy environment configuration
cp .env.example .env
```

### 2. Start Development Environment
```bash
# Start all services with Docker Compose
docker-compose up -d

# Wait for services to be ready (30-60 seconds)
# PostgreSQL, Redis, and other services will initialize

# Run database migrations
pnpm run db:migrate

# Seed initial data (optional)
pnpm run db:seed
```

### 3. Start Development Servers
```bash
# Start all development servers
pnpm run dev

# Or start individually:
# pnpm run dev:web     # Frontend (port 3000)
# pnpm run dev:api     # Backend API (port 3001)
```

## 🌐 Access Your Platform

After successful setup, access your platform at:

- **Web Application**: http://localhost:3000
- **API Documentation**: http://localhost:3001/docs
- **Database Admin**: http://localhost:8080 (pgAdmin)
- **Redis Admin**: http://localhost:8081 (Redis Commander)

## 🔧 Environment Configuration

### Essential Environment Variables

Edit your `.env` file with these critical settings:

```bash
# Database Configuration
DATABASE_URL="postgresql://gaming_user:gaming_pass@localhost:5432/gaming_platform"
REDIS_URL="redis://localhost:6379"

# JWT Security
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
JWT_REFRESH_SECRET="your-refresh-secret-change-this-in-production"

# API Configuration
API_PORT=3001
WEB_PORT=3000

# Game Configuration
GAME_RTP_MINES=97.0
GAME_RTP_SUGAR_RUSH=96.5
GAME_RTP_BARS=95.0
GAME_RTP_DRAGON_TOWER=97.5
GAME_RTP_CRASH=99.0
GAME_RTP_LIMBO=99.0

# Development Settings
NODE_ENV=development
LOG_LEVEL=debug
```

## 🗄️ Database Setup

### PostgreSQL Configuration
The Docker setup automatically creates:
- Database: `gaming_platform`
- User: `gaming_user`
- Password: `gaming_pass`
- Port: `5432`

### Initial Schema Setup
```bash
# Create database schema
pnpm run db:migrate

# Verify connection
pnpm run db:status

# Reset database (if needed)
pnpm run db:reset
```

### Redis Configuration
Redis is configured for:
- Session storage
- Game state caching
- Real-time features
- Port: `6379`

## 👤 First Admin User Creation

### Automatic Admin Setup
```bash
# Create admin user through CLI
pnpm run admin:create

# Follow the prompts:
# Username: admin
# Email: admin@yourdomain.com
# Password: (choose a secure password)
```

### Manual Admin Creation
```sql
-- Connect to PostgreSQL and run:
INSERT INTO users (id, username, email, password_hash, is_admin, balance, created_at)
VALUES (
  gen_random_uuid(),
  'admin',
  'admin@yourdomain.com',
  '$2b$10$encrypted_password_hash',
  true,
  10000.00,
  CURRENT_TIMESTAMP
);
```

## 🧪 Verify Installation

### Health Checks
```bash
# Check all services
pnpm run health:check

# Individual service checks
curl http://localhost:3001/health     # API Health
curl http://localhost:3000/api/health # Web Health
```

### Test Game Functionality
1. Visit http://localhost:3000
2. Register a new user account
3. Navigate to Games lobby
4. Test each game:
   - **Mines**: Place bet, reveal tiles
   - **Sugar Rush**: Spin and check cascades
   - **Bars**: Classic slot machine
   - **Dragon Tower**: Climb tower levels
   - **Crash**: Watch multiplier curve
   - **Limbo**: Set target multiplier

## 🚨 Common Issues & Solutions

### Port Conflicts
```bash
# If ports are in use, modify docker-compose.yml:
# Change port mappings from "3000:3000" to "3001:3000"
```

### Database Connection Issues
```bash
# Reset Docker containers
docker-compose down -v
docker-compose up -d

# Wait for services to fully initialize (60 seconds)
```

### Node.js Version Issues
```bash
# Use Node Version Manager
nvm install 20
nvm use 20
pnpm install
```

### Permission Issues (Linux/macOS)
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER
newgrp docker

# Fix file permissions
sudo chown -R $USER:$USER ./
```

## 📊 Performance Optimization (Development)

### Enable Development Optimizations
```bash
# Add to .env for faster development
TURBO_TELEMETRY_DISABLED=1
NEXT_TELEMETRY_DISABLED=1
DISABLE_SOURCE_MAPS=false
FAST_REFRESH=true
```

### Memory Optimization
```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
```

## 🔄 Development Workflow

### Git Hooks Setup
```bash
# Install pre-commit hooks
pnpm run prepare

# This enables:
# - Code linting before commits
# - Type checking before push
# - Automated formatting
```

### Available Scripts
```bash
# Development
pnpm run dev          # Start all dev servers
pnpm run dev:web      # Frontend only
pnpm run dev:api      # Backend only

# Building
pnpm run build        # Build all packages
pnpm run build:web    # Build frontend
pnpm run build:api    # Build backend

# Testing
pnpm run test         # Run all tests
pnpm run test:unit    # Unit tests only
pnpm run test:e2e     # E2E tests only

# Database
pnpm run db:migrate   # Run migrations
pnpm run db:seed      # Seed test data
pnpm run db:reset     # Reset database

# Linting & Formatting
pnpm run lint         # Check code style
pnpm run lint:fix     # Fix code style
pnpm run format       # Format code
```

## 🎯 Next Steps

### Development Ready Checklist
- [ ] All services running (Web, API, PostgreSQL, Redis)
- [ ] Database migrated and seeded
- [ ] Admin user created
- [ ] All 6 games functional
- [ ] Test user registration/login
- [ ] Verify wallet functionality

### Production Deployment
Once development is working:
1. Review [Production Deployment Guide](./production/README.md)
2. Configure production environment variables
3. Set up SSL certificates
4. Configure monitoring and logging
5. Run security audit
6. Perform load testing

## 📞 Support & Resources

### Documentation Links
- [Architecture Overview](../ARCHITECTURE.md)
- [API Reference](../api/reference.md)
- [Game Mechanics](../games/)
- [Security Guide](../security/)
- [Troubleshooting](../maintenance/troubleshooting.md)

### Community & Support
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions
- **Documentation**: `/docs` directory
- **Examples**: `/examples` directory

---

**🎉 Congratulations!** Your gaming platform is now running. You have access to all 6 games, user management, wallet functionality, and a complete development environment.

For production deployment, continue to the [Production Deployment Guide](./production/).