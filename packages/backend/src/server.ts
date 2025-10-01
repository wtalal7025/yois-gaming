/**
 * Fastify server setup
 * Main application server with health endpoints and Socket.IO
 */

// Reason: Ensure environment variables are loaded before any imports
import dotenv from 'dotenv';
import path from 'path';

// Reason: Load .env file from backend directory with multiple fallback paths
const envPaths = [
  path.resolve(__dirname, '../.env'),           // When running from dist/
  path.resolve(__dirname, '../../.env'),        // Alternative path
  path.resolve(process.cwd(), '.env'),          // From current working dir
  path.resolve(process.cwd(), 'packages/backend/.env')  // From project root
];

console.log('🔍 Environment Loading Debug:');
console.log('- __dirname:', __dirname);
console.log('- process.cwd():', process.cwd());

let envLoaded = false;
for (const envPath of envPaths) {
  console.log(`- Trying .env path: ${envPath}`);
  try {
    if (require('fs').existsSync(envPath)) {
      dotenv.config({ path: envPath });
      console.log(`✅ Loaded .env from: ${envPath}`);
      envLoaded = true;
      break;
    } else {
      console.log(`❌ File not found: ${envPath}`);
    }
  } catch (error) {
    console.log(`❌ Error loading ${envPath}:`, error instanceof Error ? error.message : String(error));
  }
}

if (!envLoaded) {
  console.error('🚨 Failed to load any .env file from attempted paths');
}

import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
// Reason: Import database modules AFTER environment is loaded
// These imports are moved to after env loading to prevent premature execution

/**
 * Create and configure Fastify server instance
 */
export async function createServer() {
  const server = Fastify({
    logger: process.env.NODE_ENV === 'development'
  });

  try {
    // Reason: Import database modules after environment variables are loaded
    const { checkSupabaseConnection } = await import('./database/supabase');
    const { registerRoutes } = await import('./routes');
    // Register CORS plugin for frontend communication
    await server.register(fastifyCors, {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    });

    // Register cookie plugin for authentication
    await server.register(fastifyCookie, {
      secret: process.env.JWT_SECRET || 'fallback-secret-key',
      parseOptions: {}
    });

    // Register multipart plugin for file uploads
    await server.register(fastifyMultipart, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        files: 1 // Single file per request
      }
    });

    // Initialize Supabase connection instead of local database
    const supabaseConnected = await checkSupabaseConnection();
    if (!supabaseConnected) {
      throw new Error('Failed to connect to Supabase database');
    }
    console.log('✅ Supabase database connected successfully');

    // Register performance optimization and security middleware
    const {
      registerPerformanceMiddleware,
      defaultPerformanceConfig,
      registerRateLimitingMiddleware,
      defaultRateLimitConfig,
      registerSecurityMiddleware,
      defaultSecurityConfig
    } = await import('./middleware');

    // Configure performance middleware with custom settings for production
    const performanceConfig = {
      ...defaultPerformanceConfig,
      caching: {
        ...defaultPerformanceConfig.caching,
        enabled: true,
        defaultTTL: process.env.NODE_ENV === 'production' ? 300 : 60, // 5min prod, 1min dev
      },
      compression: {
        ...defaultPerformanceConfig.compression,
        enabled: true,
        threshold: 1024, // Compress responses larger than 1KB
      },
      monitoring: {
        ...defaultPerformanceConfig.monitoring,
        enabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_MONITORING === 'true',
        slowRequestThreshold: process.env.NODE_ENV === 'production' ? 1000 : 500, // 1s prod, 0.5s dev
      }
    };

    // Configure rate limiting with production-ready limits
    const rateLimitConfig = {
      ...defaultRateLimitConfig,
      global: {
        max: process.env.NODE_ENV === 'production' ? 2000 : 1000,
        timeWindow: 60 * 1000 // 1 minute
      },
      perUser: {
        max: process.env.NODE_ENV === 'production' ? 200 : 100,
        timeWindow: 60 * 1000
      },
      perIP: {
        max: process.env.NODE_ENV === 'production' ? 300 : 200,
        timeWindow: 60 * 1000
      },
      gameOperations: {
        max: 60, // Allow more game operations for better UX
        timeWindow: 60 * 1000
      }
    };

    // Configure security hardening for production
    const securityConfig = {
      ...defaultSecurityConfig,
      cors: {
        ...defaultSecurityConfig.cors,
        allowedOrigins: [
          process.env.FRONTEND_URL || 'http://localhost:3000',
          'http://localhost:3000',
          'https://localhost:3000'
        ]
      },
      headers: {
        ...defaultSecurityConfig.headers,
        hsts: {
          ...defaultSecurityConfig.headers.hsts,
          enabled: process.env.NODE_ENV === 'production' // Only enable HSTS in production
        }
      },
      monitoring: {
        ...defaultSecurityConfig.monitoring,
        enabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_SECURITY_MONITORING === 'true'
      }
    };

    // Register middleware in proper order
    // 1. Security middleware first (for request validation and headers)
    await registerSecurityMiddleware(server, securityConfig);

    // 2. Performance middleware second (for request timing)
    await registerPerformanceMiddleware(server, performanceConfig);

    // 3. Rate limiting middleware third (after performance tracking starts)
    await registerRateLimitingMiddleware(server, rateLimitConfig);

    // Register all API routes
    await server.register(registerRoutes, { prefix: '/api' });

    console.log('🚀 Server configured successfully with Supabase and performance optimization');
    return server;
  } catch (error) {
    console.error('❌ Server configuration failed:', error);
    throw error;
  }
}

/**
 * Start the server (only when run directly)
 */
if (require.main === module) {
  const start = async () => {
    try {
      const server = await createServer();
      const port = Number(process.env.PORT) || 3001;
      const host = process.env.HOST || 'localhost';

      await server.listen({ port, host });
      server.log.info(`Server listening on http://${host}:${port}`);
    } catch (error) {
      console.error('Error starting server:', error);
      process.exit(1);
    }
  };

  start();
}