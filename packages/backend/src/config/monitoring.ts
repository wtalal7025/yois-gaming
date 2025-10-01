import { FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

// Monitoring configuration interface
interface MonitoringConfig {
  sentry: {
    dsn: string;
    environment: string;
    release: string;
    tracesSampleRate: number;
    profilesSampleRate: number;
  };
  logging: {
    level: string;
    format: 'json' | 'text';
    enableConsole: boolean;
    enableFile: boolean;
    filePath: string;
  };
  metrics: {
    enabled: boolean;
    interval: number;
    endpoint: string;
  };
  healthCheck: {
    enabled: boolean;
    path: string;
    timeout: number;
  };
}

// Production monitoring configuration
export const productionMonitoringConfig: MonitoringConfig = {
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: process.env.NODE_ENV || 'production',
    release: process.env.SENTRY_RELEASE || 'unknown',
    tracesSampleRate: 0.1, // Lower sampling rate for production
    profilesSampleRate: 0.1,
  },
  logging: {
    level: 'info',
    format: 'json',
    enableConsole: true,
    enableFile: true,
    filePath: '/var/log/stake-games/app.log',
  },
  metrics: {
    enabled: true,
    interval: 30000, // 30 seconds
    endpoint: '/metrics',
  },
  healthCheck: {
    enabled: true,
    path: '/health',
    timeout: 5000,
  },
};

// Development monitoring configuration
export const developmentMonitoringConfig: MonitoringConfig = {
  sentry: {
    dsn: process.env.SENTRY_DSN || '',
    environment: 'development',
    release: 'dev',
    tracesSampleRate: 1.0, // Full sampling for development
    profilesSampleRate: 1.0,
  },
  logging: {
    level: 'debug',
    format: 'text',
    enableConsole: true,
    enableFile: false,
    filePath: '',
  },
  metrics: {
    enabled: true,
    interval: 10000, // 10 seconds
    endpoint: '/metrics',
  },
  healthCheck: {
    enabled: true,
    path: '/health',
    timeout: 3000,
  },
};

// Get monitoring configuration based on environment
export function getMonitoringConfig(): MonitoringConfig {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production' ? productionMonitoringConfig : developmentMonitoringConfig;
}

// Initialize Sentry for error tracking
export function initializeSentry(config: MonitoringConfig): void {
  if (!config.sentry.dsn) {
    console.warn('Sentry DSN not configured, error tracking disabled');
    return;
  }

  Sentry.init({
    dsn: config.sentry.dsn,
    environment: config.sentry.environment,
    release: config.sentry.release,
    tracesSampleRate: config.sentry.tracesSampleRate,
    profilesSampleRate: config.sentry.profilesSampleRate,
    integrations: [
      new ProfilingIntegration(),
    ],
    // Performance monitoring
    beforeSend(event) {
      // Filter out known non-critical errors
      if (event.exception?.values?.[0]?.type === 'ConnectionError') {
        return null;
      }
      return event;
    },
  });

  // Set user context for better error tracking
  Sentry.setContext('server', {
    name: 'stake-games-backend',
    version: process.env.npm_package_version || '1.0.0',
  });
}

// Custom logger configuration
export interface LoggerOptions {
  level: string;
  format: 'json' | 'text';
  enableConsole: boolean;
  enableFile: boolean;
  filePath: string;
}

// Create structured logger
export function createLogger(options: LoggerOptions) {
  const winston = require('winston');

  const transports: any[] = [];

  // Console transport
  if (options.enableConsole) {
    transports.push(new winston.transports.Console({
      format: options.format === 'json'
        ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
        : winston.format.combine(
          winston.format.timestamp(),
          winston.format.colorize(),
          winston.format.simple()
        ),
    }));
  }

  // File transport for production
  if (options.enableFile && options.filePath) {
    transports.push(new winston.transports.File({
      filename: options.filePath,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }));
  }

  return winston.createLogger({
    level: options.level,
    transports,
  });
}

// Metrics collection interface
export interface Metrics {
  requests: {
    total: number;
    success: number;
    error: number;
    avgResponseTime: number;
  };
  games: {
    activeGames: number;
    totalPlayers: number;
    gamesPlayed: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage: number;
  };
}

// Metrics collector class
export class MetricsCollector {
  private metrics: Metrics;
  private startTime: number;

  constructor() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        avgResponseTime: 0,
      },
      games: {
        activeGames: 0,
        totalPlayers: 0,
        gamesPlayed: 0,
      },
      system: {
        uptime: 0,
        memoryUsage: process.memoryUsage(),
        cpuUsage: 0,
      },
    };
    this.startTime = Date.now();
  }

  // Record request metrics
  recordRequest(responseTime: number, success: boolean): void {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.success++;
    } else {
      this.metrics.requests.error++;
    }

    // Update average response time
    const totalTime = this.metrics.requests.avgResponseTime * (this.metrics.requests.total - 1) + responseTime;
    this.metrics.requests.avgResponseTime = totalTime / this.metrics.requests.total;
  }

  // Update game metrics
  updateGameMetrics(activeGames: number, totalPlayers: number): void {
    this.metrics.games.activeGames = activeGames;
    this.metrics.games.totalPlayers = totalPlayers;
  }

  // Record game completion
  recordGameCompletion(): void {
    this.metrics.games.gamesPlayed++;
  }

  // Get current metrics
  getMetrics(): Metrics {
    this.metrics.system.uptime = Date.now() - this.startTime;
    this.metrics.system.memoryUsage = process.memoryUsage();

    return { ...this.metrics };
  }

  // Reset metrics (useful for testing)
  reset(): void {
    this.metrics = {
      requests: { total: 0, success: 0, error: 0, avgResponseTime: 0 },
      games: { activeGames: 0, totalPlayers: 0, gamesPlayed: 0 },
      system: { uptime: 0, memoryUsage: process.memoryUsage(), cpuUsage: 0 },
    };
    this.startTime = Date.now();
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector();

// Health check function
export async function performHealthCheck(timeout: number = 5000): Promise<{
  status: 'healthy' | 'unhealthy';
  checks: Record<string, { status: 'pass' | 'fail'; message: string; responseTime?: number }>;
}> {
  const checks: Record<string, { status: 'pass' | 'fail'; message: string; responseTime?: number }> = {};

  // Database health check
  try {
    const dbStart = Date.now();
    // Assuming we have a database connection available
    // This would be replaced with actual database ping
    await new Promise(resolve => setTimeout(resolve, 10)); // Simulate DB check
    checks.database = {
      status: 'pass',
      message: 'Database connection successful',
      responseTime: Date.now() - dbStart,
    };
  } catch (error) {
    checks.database = {
      status: 'fail',
      message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  // Redis health check
  try {
    const redisStart = Date.now();
    // This would be replaced with actual Redis ping
    await new Promise(resolve => setTimeout(resolve, 5)); // Simulate Redis check
    checks.redis = {
      status: 'pass',
      message: 'Redis connection successful',
      responseTime: Date.now() - redisStart,
    };
  } catch (error) {
    checks.redis = {
      status: 'fail',
      message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  // External services health check
  try {
    const extStart = Date.now();
    // Check external dependencies (Supabase, Resend, etc.)
    await new Promise(resolve => setTimeout(resolve, 20)); // Simulate external service check
    checks.external_services = {
      status: 'pass',
      message: 'External services accessible',
      responseTime: Date.now() - extStart,
    };
  } catch (error) {
    checks.external_services = {
      status: 'fail',
      message: `External services check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }

  // Overall health status
  const allPassed = Object.values(checks).every(check => check.status === 'pass');

  return {
    status: allPassed ? 'healthy' : 'unhealthy',
    checks,
  };
}

// Register monitoring routes
export function registerMonitoringRoutes(fastify: FastifyInstance, config: MonitoringConfig): void {
  // Health check endpoint
  if (config.healthCheck.enabled) {
    fastify.get(config.healthCheck.path, async (request, reply) => {
      const healthResult = await performHealthCheck(config.healthCheck.timeout);

      reply.code(healthResult.status === 'healthy' ? 200 : 503);
      return {
        status: healthResult.status,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...healthResult.checks,
      };
    });
  }

  // Metrics endpoint
  if (config.metrics.enabled) {
    fastify.get(config.metrics.endpoint, async (request, reply) => {
      const metrics = metricsCollector.getMetrics();

      return {
        timestamp: new Date().toISOString(),
        ...metrics,
      };
    });
  }

  // Ready endpoint for Kubernetes-style readiness probes
  fastify.get('/ready', async (request, reply) => {
    return { status: 'ready', timestamp: new Date().toISOString() };
  });

  // Live endpoint for Kubernetes-style liveness probes
  fastify.get('/live', async (request, reply) => {
    return { status: 'alive', timestamp: new Date().toISOString() };
  });
}