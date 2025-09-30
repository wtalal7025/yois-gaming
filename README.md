# 🎮 Yois Gaming Platform

A comprehensive, fully-integrated gaming platform built with modern TypeScript stack, featuring 6 provably fair games with complete lobby system, responsive design, and advanced performance optimizations.

## 🚀 Features

### 🎯 Complete Gaming Experience
- **6 Exciting Games**: Sugar Rush, Mines, Bars, Dragon Tower, Crash, and Limbo
- **Games Lobby**: Fully-featured game browser with search, filtering, and categories
- **Dynamic Routing**: Individual game pages with SEO optimization
- **Game Categories**: Organized by Skill Games, Slots, and Crash Games
- **Recent Games**: Track and resume recently played games
- **Favorites System**: Bookmark and quickly access favorite games
- **Universal Game Container**: Consistent gaming experience across all games

### 🌟 User Experience
- **Advanced Search**: Real-time game search with intelligent filtering
- **Responsive Design**: Mobile-first design with touch-friendly interactions
- **Adaptive Loading**: Network-aware content loading based on connection speed
- **Performance Dashboard**: Real-time performance monitoring (development mode)
- **Loading Optimizations**: Lazy loading, code splitting, and preloading strategies
- **Smooth Animations**: Framer Motion powered transitions and micro-interactions

### 🔍 SEO & Discoverability
- **SEO Optimized**: Complete meta tags, structured data, and sitemap generation
- **Social Sharing**: Open Graph and Twitter Card meta tags for all games
- **Progressive Web App**: Web manifest with app shortcuts and offline capabilities
- **Search Engine Ready**: Auto-generated robots.txt and XML sitemaps
- **Breadcrumb Navigation**: Enhanced navigation with structured data

### 🚀 Performance & Technical
- **Provably Fair Gaming**: Cryptographically secure random number generation
- **Real-time Multiplayer**: Live game sessions via WebSocket
- **Modern UI**: Built with Next.js 15, React 19, and HeroUI
- **High Performance**: Lazy loading, code splitting, and bundle optimization
- **Type Safety**: Full TypeScript implementation across all packages
- **Monorepo Architecture**: Organized with pnpm workspaces and Turborepo

### 🏎️ Production Optimizations (Priority 4 Complete)
- **Advanced API Performance**: Response caching, compression (gzip/brotli), intelligent cache invalidation
- **Comprehensive Rate Limiting**: Multi-tier protection (IP, user, game operations) with abuse detection
- **Frontend Bundle Optimization**: Code splitting, lazy loading, service worker caching, PWA features
- **Database Performance**: Strategic indexing, connection pooling, query optimization, monitoring views
- **Redis Caching Integration**: API response caching, session persistence, intelligent preloading
- **Real-time Monitoring**: Performance metrics, error tracking, user analytics, alerting system
- **Security Hardening**: Request validation, security headers (HSTS, CSP), suspicious activity detection
- **Performance Testing**: Comprehensive test suites, automated benchmarking, validation tools

### 🚀 Production Deployment (Priority 5 Complete)
- **Docker Containerization**: Multi-stage production builds with security hardening and health checks
- **CI/CD Pipeline**: Automated GitHub Actions workflow with quality gates and deployment automation
- **Platform Deployment**: Vercel frontend deployment and Railway backend deployment with auto-scaling
- **Production Monitoring**: Comprehensive logging, error tracking (Sentry), and performance monitoring
- **Security & Backup**: Production security configurations and automated backup systems
- **Environment Management**: Production/staging environment configurations with secrets management

## 🛠 Technology Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features  
- **TypeScript** - Type safety throughout the application
- **HeroUI** - Modern UI component library
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Animation library
- **Zustand** - State management

### Backend
- **Node.js 23** - JavaScript runtime
- **Fastify** - High-performance web framework
- **Socket.IO** - Real-time bidirectional communication
- **TypeScript** - Type safety for server-side code
- **Prisma ORM** - Database toolkit

### Database & Cache
- **PostgreSQL** - Primary database
- **Redis** - Caching and session storage
- **Upstash Redis** - Production-ready Redis with global CDN

### Development Tools
- **pnpm workspaces** - Efficient monorepo management
- **Turborepo** - Build system orchestration
- **Docker** - Containerization for development
- **Vitest** - Unit testing framework
- **ESLint & Prettier** - Code quality and formatting

## 📋 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

1. **Node.js 23+**
   ```bash
   # Download from https://nodejs.org/
   # Or using Node Version Manager (recommended)
   nvm install 23
   nvm use 23
   ```

2. **pnpm (Package Manager)**
   ```bash
   # Install pnpm globally
   npm install -g pnpm
   
   # Verify installation
   pnpm --version
   ```

3. **Docker & Docker Compose**
   ```bash
   # Download Docker Desktop from https://www.docker.com/products/docker-desktop
   # Verify installation
   docker --version
   docker-compose --version
   ```

4. **Git**
   ```bash
   # Download from https://git-scm.com/
   # Verify installation
   git --version
   ```

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd yois-gaming
```

### 2. Install Dependencies

```bash
# Install all dependencies for the monorepo
pnpm install
```

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your configuration
# Most default values will work for development
```

#### 📧 Email Service Configuration

The platform uses **Resend** for email services (password reset, welcome emails, etc.). To enable email functionality:

1. **Create a Resend Account** (free tier includes 3,000 emails/month)
   - Visit [https://resend.com](https://resend.com)
   - Sign up for a free account
   - Verify your domain (or use their sandbox for testing)

2. **Get Your API Key**
   - Navigate to the Resend dashboard
   - Go to API Keys section
   - Create a new API key with sending permissions

3. **Configure Environment Variables**
   ```bash
   # Add these to your .env file in packages/backend/
   RESEND_API_KEY=re_your_resend_api_key_here
   FROM_EMAIL=noreply@yourdomain.com
   FROM_NAME="Your Gaming Platform"
   REPLY_TO_EMAIL=support@yourdomain.com  # Optional
   ```

4. **Email Features**
   - ✅ **Password Reset**: Secure password reset via email
   - ✅ **Welcome Emails**: Professional welcome emails for new users
   - ✅ **Email Verification**: User email verification system
   - ✅ **Transaction Notifications**: Optional gaming transaction emails
   - ✅ **Professional Templates**: Responsive HTML and text email templates

**Note**: Without email configuration, authentication will work but users won't receive password reset or welcome emails. Check console logs for email delivery status.

#### 📁 File Storage & CDN Configuration

The platform uses **Supabase Storage** for file storage and global CDN delivery (game thumbnails, user avatars, etc.). This is already configured if you have Supabase set up.

1. **Supabase Storage Features**
   - ✅ **Game Thumbnails**: All 6 game thumbnails served via global CDN
   - ✅ **User Avatar Uploads**: Ready for user profile image uploads
   - ✅ **File Validation**: Secure file type and size validation
   - ✅ **CDN Optimization**: Automatic image optimization and caching
   - ✅ **Storage Buckets**: Organized file storage with proper permissions

2. **Storage Configuration** (Already configured with your Supabase project)
   ```bash
   # Your existing Supabase environment variables handle storage
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_key
   ```

3. **Initialize Storage Buckets**
   ```bash
   # Run this once to set up storage buckets and migrate game assets
   cd packages/backend
   pnpm storage:init
   ```

4. **Storage API Endpoints**
   - `POST /storage/avatar` - Upload user avatars (max 5MB)
   - `POST /storage/game-asset` - Upload game assets (admin only)
   - `DELETE /storage/:bucket/:path` - Delete files
   - `GET /storage/url/:bucket/:path` - Get public CDN URLs

**Note**: Game thumbnails are automatically migrated from local storage to Supabase CDN for global performance. The free tier includes 1GB storage + unlimited bandwidth via CDN.

#### 🔄 Session Storage & Redis Configuration

The platform uses **Upstash Redis** for persistent session storage and wallet data, replacing in-memory implementations for production scalability.

1. **Upstash Redis Setup** (Recommended for Production)
   - Visit [https://upstash.com](https://upstash.com) and create a free account
   - Create a new Redis database (10,000 requests/day FREE)
   - Get your Redis REST URL and token from the dashboard
   - Copy the connection details to your environment variables

2. **Environment Configuration**
   ```bash
   # Add these to your .env file in packages/backend/
   UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
   
   # Alternative: Traditional Redis URL (for local development)
   REDIS_URL=redis://localhost:6379
   ```

3. **Session Storage Features**
   - ✅ **Persistent Wallet Balances**: User balances survive server restarts
   - ✅ **Transaction History**: Complete transaction logs with Redis persistence
   - ✅ **Session Caching**: Fast session lookup with automatic expiration
   - ✅ **Horizontal Scaling**: Ready for multiple server instances
   - ✅ **Graceful Fallbacks**: Automatic fallback to in-memory if Redis unavailable
   - ✅ **Error Recovery**: Exponential backoff retry logic for Redis operations

4. **Development vs Production**
   ```bash
   # Local Development (using Docker Redis)
   REDIS_URL=redis://localhost:6379
   
   # Production (using Upstash Redis)
   UPSTASH_REDIS_REST_URL=https://your-region.upstash.io
   UPSTASH_REDIS_REST_TOKEN=your_token_here
   ```

5. **Test Redis Connectivity**
   ```bash
   # Test Redis connection in backend
   cd packages/backend
   pnpm redis:test
   
   # Or check Redis health via API
   curl http://localhost:3001/health/redis
   ```

6. **Redis Service Features**
   - **Connection Pooling**: Efficient connection management
   - **Health Monitoring**: Real-time Redis health checks
   - **Automatic Retries**: Exponential backoff for failed operations
   - **Fallback Mechanisms**: Graceful degradation when Redis is unavailable
   - **Data Serialization**: Automatic JSON serialization for complex data types

**Note**: The system automatically detects available Redis configuration and falls back gracefully. For development, local Docker Redis is sufficient, but production should use Upstash Redis for reliability and global performance.

### 4. Start Development Services

```bash
# Start PostgreSQL and Redis using Docker
docker compose -f docker/docker-compose.yml up -d

# Wait a moment for services to be ready, then start the development servers
pnpm dev
```

### 5. Open Your Browser

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Database Admin (pgAdmin)**: http://localhost:5050 (admin@yoisgaming.dev / admin)
- **Redis Admin**: http://localhost:8081

## 🔧 Development Setup

### Project Structure

```
yois-gaming/
├── packages/                    # Monorepo packages
│   ├── frontend/               # Next.js 15 + React 19 frontend library
│   ├── backend/                # Fastify API server
│   ├── shared/                 # Shared TypeScript types/utilities
│   └── game-engine/            # Core game logic library
├── apps/
│   └── web/                    # Main web application
├── docker/                     # Docker configuration
│   ├── docker-compose.yml     # Development services
│   ├── postgres/               # PostgreSQL setup
│   └── redis/                  # Redis configuration
├── docs/                       # Documentation
├── tests/                      # Test utilities and configs
├── package.json               # Root workspace configuration
├── pnpm-workspace.yaml        # pnpm workspace config
├── turbo.json                 # Turborepo configuration
└── tsconfig.json              # Root TypeScript config
```

### Available Scripts

#### Root Level Commands

```bash
# Install all dependencies
pnpm install

# Start all development servers
pnpm dev

# Build all packages
pnpm build

# Run all tests
pnpm test

# Type check all packages
pnpm type-check

# Lint all packages
pnpm lint

# Clean all build artifacts
pnpm clean
```

#### Package-Specific Commands

```bash
# Frontend development
pnpm --filter @yois-games/frontend dev
pnpm --filter @yois-games/frontend build

# Backend development
pnpm --filter @yois-games/backend dev
pnpm --filter @yois-games/backend build

# Web app development
pnpm --filter @yois-games/web dev
pnpm --filter @yois-games/web build
```

### Database Management

```bash
# Start database services
docker compose -f docker/docker-compose.yml up -d postgres redis

# Stop database services
docker compose -f docker/docker-compose.yml down

# Reset database (WARNING: This will delete all data)
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d postgres redis

# Access PostgreSQL directly
docker exec -it yois-games-db psql -U postgres -d yois_games

# Access Redis directly
docker exec -it yois-games-redis redis-cli
```

### Development Tools

```bash
# Start database admin tools
docker compose -f docker/docker-compose.yml --profile dev up -d

# This starts:
# - pgAdmin at http://localhost:5050
# - Redis Commander at http://localhost:8081
```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage

# Run tests for a specific package
pnpm --filter @yois-games/game-engine test
```

### Test Structure

```
tests/
├── setup.ts                   # Global test setup
├── vitest.config.ts           # Vitest configuration
└── [package-specific-tests]   # Tests for each package
```

## 🎯 Game Integration Architecture

### Complete Gaming Platform

The platform features a fully integrated gaming experience with:

#### 🏛️ Game Registry System
- **Centralized Metadata**: All games registered in `apps/web/src/lib/gameRegistry.ts`
- **Type-Safe Access**: Complete TypeScript interfaces for all game properties
- **Dynamic Loading**: Games loaded on-demand with performance optimization
- **Category Management**: Automatic grouping by skill, slots, and crash games

```typescript
// Game registry structure
interface GameInfo {
  id: string
  title: string
  description: string
  category: 'slots' | 'skill' | 'crash' | 'other'
  rtp: number
  volatility: 'low' | 'medium' | 'high'
  minBet: number
  maxBet: number
  features: string[]
  rules: string
  thumbnail: string
  isPopular: boolean
  isNew: boolean
}
```

#### 🎮 Games Lobby (`/games`)
- **Game Discovery**: Browse all games with attractive preview cards
- **Advanced Search**: Real-time search with debounced input
- **Category Filtering**: Filter by game type (All, Skill, Slots, Crash, Popular, New)
- **Recent Games**: Track and display recently played games
- **Favorites System**: Bookmark games for quick access
- **Responsive Grid**: Adaptive layout for desktop and mobile

#### 🛣️ Dynamic Routing System
- **Individual Game Pages**: Each game accessible at `/games/[gameId]`
- **SEO Optimized**: Custom meta tags and structured data for each game
- **Error Boundaries**: Graceful handling of game loading failures
- **Breadcrumb Navigation**: Clear navigation hierarchy
- **Deep Linking**: Direct links to specific games

#### 🎨 Universal Game Container
- **Consistent Layout**: Unified header, controls, and game area
- **Balance Display**: Real-time balance updates
- **Game Controls**: Sound, fullscreen, help, and settings
- **Loading States**: Skeleton loaders and progress indicators
- **Error Handling**: User-friendly error messages and retry options

### 🔧 Performance Optimizations

#### ⚡ Lazy Loading & Code Splitting
- **Route-based Splitting**: Each game loads independently
- **Component Lazy Loading**: Non-critical components load on demand
- **Image Optimization**: Lazy loading with intersection observer
- **Bundle Analysis**: Automatic chunk optimization
- **Preloading Strategy**: Popular games preloaded during idle time

```typescript
// Example: Game preloading on hover
const handleGameHover = useCallback((gameId: string) => {
  GamePreloader.preloadGame(gameId)
}, [])
```

#### 📱 Responsive Design
- **Mobile-First**: Optimized for touch interactions
- **Adaptive Layouts**: Different components for mobile/desktop
- **Touch Targets**: Minimum 44px tap targets
- **Responsive Images**: Optimized for different screen densities
- **Network-Aware**: Adjusts quality based on connection speed

```typescript
// Responsive hook example
const { isMobile, breakpoint } = useResponsive()
return isMobile ? <MobileGameCard /> : <DesktopGameCard />
```

### 🔍 SEO & Discoverability

#### 🌐 SEO Features
- **Dynamic Meta Tags**: Unique titles, descriptions for each game
- **Structured Data**: Schema.org markup for games and organization
- **Open Graph**: Social sharing optimization
- **XML Sitemap**: Auto-generated sitemap with all games
- **Robots.txt**: Search engine crawling instructions

#### 📊 Analytics Ready
- **Performance Monitoring**: Real-time performance metrics
- **User Behavior**: Game preferences and usage patterns
- **Error Tracking**: Comprehensive error boundaries and logging
- **Bundle Analysis**: Development-time performance insights

### 🎯 User Experience Features

#### 🔍 Advanced Search
```typescript
// Search functionality
- Real-time filtering with debounced input
- Search across game titles, descriptions, features
- Category-based filtering
- Recent searches and suggestions
- Empty state handling with recommendations
```

#### ⭐ Favorites & Recent Games
```typescript
// Persistent user preferences
- Zustand store with localStorage persistence
- Recently played games tracking
- Favorite games bookmarking
- Cross-session state management
- Optimistic updates for better UX
```

#### 🎨 Visual Polish
- **Smooth Animations**: Framer Motion powered transitions
- **Loading States**: Skeleton components and progress indicators
- **Micro-interactions**: Hover effects and button feedback
- **Dark Theme**: Consistent theming across all components
- **Icon System**: Lucide React icons with consistent sizing

### 🏗️ Component Architecture

#### 🎮 Game Components Structure
```
apps/web/src/components/games/
├── GameCard.tsx              # Desktop game preview card
├── MobileGameCard.tsx        # Touch-optimized mobile card
├── GameGrid.tsx              # Responsive game grid layout
├── GameCategories.tsx        # Category filtering
├── GameSearch.tsx            # Search functionality
├── RecentGames.tsx           # Recent games display
├── FavoriteGames.tsx         # Favorites management
├── GameContainer.tsx         # Universal game wrapper
├── ResponsiveGameGrid.tsx    # Adaptive grid component
├── OptimizedGameLoader.tsx   # Performance-optimized loading
└── [game-name]/              # Individual game components
    ├── [GameName]Game.tsx    # Main game component
    ├── [GameName]Controls.tsx # Game-specific controls
    └── [GameName]Stats.tsx   # Game statistics display
```

#### 🛠️ Utility Systems
```
apps/web/src/utils/
├── responsive.ts             # Responsive design utilities
├── lazyLoading.ts           # Performance optimization
├── codeSplitting.ts         # Bundle optimization
└── seo.ts                   # SEO and metadata generation

apps/web/src/hooks/
├── useResponsive.ts         # Responsive behavior hooks
├── usePerformance.ts        # Performance monitoring
└── useGamePreferences.ts    # User preferences management
```

### 🎯 Game Development

#### Adding a New Game

1. **Create Game Engine Class**
   ```typescript
   // packages/game-engine/src/games/your-game/YourGame.ts
   import { BaseGame } from '../../base'
   
   export class YourGame extends BaseGame {
     // Implement game logic
   }
   ```

2. **Add to Game Registry**
   ```typescript
   // apps/web/src/lib/gameRegistry.ts
   export const GAMES: GameInfo[] = [
     // ... existing games
     {
       id: 'your-game',
       title: 'Your Game',
       description: 'Game description',
       category: 'skill',
       rtp: 96.5,
       // ... other properties
     }
   ]
   ```

3. **Create React Components**
   ```bash
   # Create game component structure
   mkdir apps/web/src/components/games/your-game
   touch apps/web/src/components/games/your-game/YourGameGame.tsx
   touch apps/web/src/components/games/your-game/YourGameControls.tsx
   ```

4. **Add Game Types**
   ```typescript
   // packages/shared/src/types/games/your-game.ts
   export interface YourGameState {
     // Define game state interface
   }
   ```

5. **Create Tests**
   ```bash
   # Add comprehensive test coverage
   touch tests/your-game/YourGame.test.ts
   touch tests/integration/yourGame.test.ts
   ```

#### Best Practices
- **Follow TypeScript strict mode** for all game code
- **Implement proper error boundaries** for game components
- **Add comprehensive test coverage** (unit + integration)
- **Use the BaseGame architecture** for consistency
- **Optimize for mobile interactions** with proper touch targets
- **Include SEO metadata** in the game registry
- **Add loading and error states** for all game components

## 🐳 Docker Development

### Full Docker Setup

```bash
# Start all services with Docker
docker compose -f docker/docker-compose.yml up -d

# View logs
docker compose -f docker/docker-compose.yml logs -f

# Stop all services
docker compose -f docker/docker-compose.yml down

# Remove volumes (deletes all data)
docker compose -f docker/docker-compose.yml down -v
```

### Environment Profiles

```bash
# Development profile (includes admin tools)
docker compose -f docker/docker-compose.yml --profile dev up -d

# Production profile (minimal services)
docker compose -f docker/docker-compose.yml --profile prod up -d
```

### Production Deployment

For production deployment, see the comprehensive [**DEPLOYMENT.md**](./DEPLOYMENT.md) guide which includes:

#### 🚀 Quick Production Deploy
```bash
# Deploy to production (requires setup - see DEPLOYMENT.md)
git push origin main  # Triggers automated CI/CD pipeline

# Manual deployment commands
vercel deploy --prod  # Deploy frontend to Vercel
railway up           # Deploy backend to Railway
```

#### 🌐 Production Architecture
- **Frontend**: Next.js on Vercel with global CDN and automatic SSL
- **Backend**: Fastify API on Railway with Docker containers and auto-scaling
- **Database**: Supabase PostgreSQL with automated backups
- **Cache**: Upstash Redis for session management and performance
- **Storage**: Supabase Storage for assets with global CDN
- **Email**: Resend service for notifications
- **Monitoring**: Sentry error tracking, performance monitoring, and logging
- **CI/CD**: GitHub Actions with automated testing and deployment

#### 📋 Production Features
- ✅ **Zero-downtime deployments** with automated rollback
- ✅ **Auto-scaling** based on traffic patterns
- ✅ **Comprehensive monitoring** with real-time alerts
- ✅ **Automated backups** with disaster recovery
- ✅ **Security hardening** with production-grade configurations
- ✅ **SSL certificates** with automatic renewal
- ✅ **Global CDN** for optimal performance worldwide

#### 🔧 Production Setup
1. **Prerequisites**: GitHub, Vercel, Railway, Supabase, Upstash, Resend accounts
2. **Environment Setup**: Configure production environment variables
3. **Platform Configuration**: Set up deployment platforms and domains
4. **CI/CD Pipeline**: Enable automated deployments with GitHub Actions
5. **Monitoring**: Configure error tracking and performance monitoring

See [**DEPLOYMENT.md**](./DEPLOYMENT.md) for complete step-by-step production deployment instructions.

## 🔒 Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/yois_games"

# Redis Configuration (choose one approach)
# Option 1: Upstash Redis (Production Recommended)
UPSTASH_REDIS_REST_URL="https://your-region.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your_redis_token_here"

# Option 2: Traditional Redis (Local Development)
REDIS_URL="redis://localhost:6379"

# Supabase Configuration (required)
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_KEY="your_service_key_here"
SUPABASE_ANON_KEY="your_anon_key_here"

# Email Service (Resend)
RESEND_API_KEY="re_your_api_key_here"
FROM_EMAIL="noreply@yourdomain.com"
FROM_NAME="Your Gaming Platform"

# Application
NODE_ENV="development"
JWT_SECRET="your-secret-key-here"

# API Configuration
API_BASE_URL="http://localhost:3001/api"
NEXT_PUBLIC_API_BASE_URL="http://localhost:3001/api"
```

See `.env.example` for a complete list of available configuration options.

## 📚 API Documentation

Once the backend is running, you can access:

- **API Docs**: http://localhost:3001/docs (if Swagger is configured)
- **Health Check**: http://localhost:3001/health

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes**
4. **Run tests**: `pnpm test`
5. **Run linting**: `pnpm lint`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Create a Pull Request**

### Code Style

- Follow TypeScript strict mode
- Use ESLint and Prettier configurations
- Write tests for new features
- Document complex logic with comments
- Follow the established project structure

## 🐛 Troubleshooting

### Common Issues

**pnpm not found**
```bash
npm install -g pnpm
```

**Docker services not starting**
```bash
docker compose -f docker/docker-compose.yml down -v
docker compose -f docker/docker-compose.yml up -d
```

**Port already in use**
```bash
# Kill process using port 3000
npx kill-port 3000

# Or change ports in .env file
```

**TypeScript errors**
```bash
# Clean and rebuild
pnpm clean
pnpm install
pnpm build
```

**Database connection issues**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Reset database
docker compose -f docker/docker-compose.yml restart postgres
```

## 🎯 Production Optimization Features

### ⚡ Performance Optimization
- **Bundle Analysis & Code Splitting**: Automated webpack analysis with dynamic imports
- **Runtime Performance**: 60fps game rendering with memory leak prevention
- **API Caching**: Advanced caching strategies with TTL and cache invalidation
- **Database Optimization**: Query optimization and intelligent indexing

### 🎨 User Experience Polish
- **Micro-interactions**: Enhanced button feedback and hover animations
- **Loading States**: Beautiful skeleton screens and progress indicators
- **Transition Effects**: Smooth page and component transitions
- **Celebration Effects**: Enhanced win animations and user feedback
- **Mobile Optimization**: Touch gestures and responsive design refinements
- **PWA Features**: Progressive Web App with offline capabilities

### ♿ Accessibility & Usability
- **WCAG 2.1 AA Compliance**: Full accessibility standard compliance
- **Screen Reader Support**: Complete ARIA labels and semantic markup
- **Keyboard Navigation**: Full keyboard accessibility for all games
- **Focus Management**: Advanced focus control for dynamic content
- **Color Contrast**: Optimized contrast ratios and theme support
- **User-friendly Errors**: Contextual error messages and recovery options

### 🔐 Security Hardening
- **Vulnerability Scanning**: Automated security audit and penetration testing
- **Input Validation**: Enhanced sanitization and validation layers
- **Rate Limiting**: DDoS protection and abuse prevention
- **Security Headers**: CSP, HSTS, and comprehensive security headers
- **Audit Logging**: Complete security event tracking and monitoring

### 🌍 Internationalization
- **15 Languages**: Comprehensive multi-language support including RTL
- **RTL Support**: Right-to-left layouts for Arabic and Hebrew
- **Translation Management**: Dynamic loading with fallback chains
- **Locale Detection**: Intelligent language detection from multiple sources
- **Cultural Adaptation**: Localized number formats, dates, and currencies

### 📊 Monitoring & Analytics
- **Real User Monitoring**: Live performance tracking and optimization
- **Core Web Vitals**: LCP, FID, CLS monitoring with performance budgets
- **Error Tracking**: Comprehensive error boundary and logging system
- **User Analytics**: Privacy-compliant behavior tracking and insights
- **Game Analytics**: Play patterns, preferences, and conversion metrics

### 🛠️ Developer Experience
- **Debug Tools**: Enhanced debugging console with component state tracking
- **Performance Profiler**: Real-time FPS, memory, and network monitoring
- **Component Library**: Auto-generated documentation with interactive examples
- **API Documentation**: Interactive API testing and endpoint analysis
- **Code Quality**: Custom ESLint rules and automated quality scoring

### 🧪 Testing & Validation
- **Smoke Testing**: Comprehensive platform validation covering all features
- **Load Testing**: Virtual user simulation with performance benchmarking
- **Security Audit**: Vulnerability assessment and compliance checking
- **Compatibility Check**: Cross-browser and device compatibility validation
- **Accessibility Testing**: Automated WCAG compliance validation

### 🔧 Configuration & Deployment
- **Environment Validation**: Production configuration security auditing
- **Dependency Audit**: Security vulnerability and version checking
- **Performance Baseline**: Automated performance regression testing
- **Monitoring Setup**: Production-ready observability configuration

### 📋 Usage Examples

#### Performance Monitoring
```typescript
import { PerformanceProfiler } from './devtools/performance-profiler'

// Real-time performance tracking
const profiler = new PerformanceProfiler()
profiler.startProfiling('game-session')
// ... game logic
const metrics = profiler.getMetrics()
```

#### Security Auditing
```typescript
import { SecurityAuditor } from './final/testing/security-audit'

// Comprehensive security audit
const auditor = new SecurityAuditor(productionConfig)
const results = await auditor.runSecurityAudit()
console.log(`Security Score: ${results.overallScore}/100`)
```

#### Load Testing
```typescript
import { LoadTestRunner } from './final/testing/load-testing'

// Production load testing
const testRunner = new LoadTestRunner(loadTestConfig)
const results = await testRunner.runLoadTest()
console.log(`Throughput: ${results.metrics.throughput} RPS`)
```

#### Internationalization
```typescript
import { LanguageSupport } from './i18n/language-support'

// Multi-language support
const i18n = LanguageSupport.getInstance()
await i18n.setLanguage('ar') // Arabic with RTL support
const text = i18n.translate('game.welcome', { username: 'أحمد' })
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by popular gaming platforms
- Uses industry-standard security practices
- Implements provably fair gaming algorithms
- Optimized for production deployment with comprehensive monitoring
- Accessibility-first design with WCAG 2.1 AA compliance
- Multi-language support with cultural adaptation

---

**Happy Gaming! 🎮**

For more detailed documentation, see the [docs](./docs) directory.