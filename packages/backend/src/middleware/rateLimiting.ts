/**
 * Rate Limiting Middleware
 * Implements comprehensive rate limiting for production security and DDoS protection
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getRedisService } from '../services/cache/RedisService';

interface RateLimitConfig {
  global: {
    max: number; // requests per window
    timeWindow: number; // milliseconds
  };
  perUser: {
    max: number;
    timeWindow: number;
  };
  perIP: {
    max: number;
    timeWindow: number;
  };
  gameOperations: {
    max: number;
    timeWindow: number;
  };
  authentication: {
    loginAttempts: number;
    timeWindow: number;
    lockoutDuration: number; // milliseconds
  };
  whitelist: string[]; // IP addresses to exclude from rate limiting
  skipRoutes: string[]; // Routes to exclude from rate limiting
}

interface RateLimitInfo {
  totalHits: number;
  totalHitsLeft: number;
  resetTime: Date;
  timeLeft: number;
}

interface RateLimitAttempt {
  ip: string;
  userId?: string;
  timestamp: number;
  route: string;
  userAgent?: string;
}

/**
 * In-memory rate limiter with Redis fallback
 */
class RateLimiter {
  private memoryStore = new Map<string, { count: number; resetTime: number }>();
  private config: RateLimitConfig;
  private attempts: RateLimitAttempt[] = [];
  private maxAttempts = 10000;

  constructor(config: RateLimitConfig) {
    this.config = config;

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  private generateKey(type: 'global' | 'ip' | 'user' | 'game' | 'auth', identifier: string, route?: string): string {
    const routePart = route ? `:${route}` : '';
    return `rate_limit:${type}:${identifier}${routePart}`;
  }

  private async incrementCounter(key: string, limit: number, windowMs: number): Promise<RateLimitInfo> {
    const now = Date.now();
    const resetTime = new Date(now + windowMs);

    try {
      // Try Redis first
      const redisService = getRedisService();
      if (redisService.getConnectionStatus()) {
        const current = await redisService.get(key) as number | null;
        const count = (current || 0) + 1;

        if (!current) {
          // New entry, set with TTL
          await redisService.set(key, count, Math.ceil(windowMs / 1000));
        } else {
          // Update existing entry
          await redisService.set(key, count);
        }

        return {
          totalHits: count,
          totalHitsLeft: Math.max(0, limit - count),
          resetTime,
          timeLeft: windowMs
        };
      }
    } catch (error) {
      console.warn('⚠️ Redis rate limit error, using memory fallback:', error);
    }

    // Memory fallback
    const existing = this.memoryStore.get(key);
    if (existing && now < existing.resetTime) {
      existing.count++;
      return {
        totalHits: existing.count,
        totalHitsLeft: Math.max(0, limit - existing.count),
        resetTime: new Date(existing.resetTime),
        timeLeft: existing.resetTime - now
      };
    }

    // New or expired entry
    const newEntry = { count: 1, resetTime: now + windowMs };
    this.memoryStore.set(key, newEntry);

    return {
      totalHits: 1,
      totalHitsLeft: Math.max(0, limit - 1),
      resetTime,
      timeLeft: windowMs
    };
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryStore.entries()) {
      if (now >= entry.resetTime) {
        this.memoryStore.delete(key);
      }
    }

    // Clean up old attempts
    const cutoff = now - 24 * 60 * 60 * 1000; // 24 hours
    this.attempts = this.attempts.filter(attempt => attempt.timestamp > cutoff);
    if (this.attempts.length > this.maxAttempts) {
      this.attempts = this.attempts.slice(-this.maxAttempts);
    }
  }

  private shouldSkip(request: FastifyRequest): boolean {
    const ip = request.ip;
    const url = request.url;

    // Check whitelist
    if (this.config.whitelist.includes(ip)) {
      return true;
    }

    // Check skip routes
    return this.config.skipRoutes.some(route => {
      if (route.includes('*')) {
        const regex = new RegExp(route.replace(/\*/g, '.*'));
        return regex.test(url);
      }
      return url.includes(route);
    });
  }

  async checkRateLimit(request: FastifyRequest): Promise<{ allowed: boolean; info: RateLimitInfo | null; reason?: string }> {
    if (this.shouldSkip(request)) {
      return { allowed: true, info: null };
    }

    const ip = request.ip;
    const userId = (request as any).user?.id;
    const url = request.url;
    const now = Date.now();

    // Record attempt
    this.recordAttempt({
      ip,
      userId,
      timestamp: now,
      route: url,
      userAgent: request.headers['user-agent'] || 'unknown'
    });

    // Check global rate limit
    const globalKey = this.generateKey('global', 'all');
    const globalLimit = await this.incrementCounter(
      globalKey,
      this.config.global.max,
      this.config.global.timeWindow
    );

    if (globalLimit.totalHits > this.config.global.max) {
      return {
        allowed: false,
        info: globalLimit,
        reason: 'Global rate limit exceeded'
      };
    }

    // Check per-IP rate limit
    const ipKey = this.generateKey('ip', ip);
    const ipLimit = await this.incrementCounter(
      ipKey,
      this.config.perIP.max,
      this.config.perIP.timeWindow
    );

    if (ipLimit.totalHits > this.config.perIP.max) {
      return {
        allowed: false,
        info: ipLimit,
        reason: 'IP rate limit exceeded'
      };
    }

    // Check per-user rate limit (if authenticated)
    if (userId) {
      const userKey = this.generateKey('user', userId);
      const userLimit = await this.incrementCounter(
        userKey,
        this.config.perUser.max,
        this.config.perUser.timeWindow
      );

      if (userLimit.totalHits > this.config.perUser.max) {
        return {
          allowed: false,
          info: userLimit,
          reason: 'User rate limit exceeded'
        };
      }
    }

    // Check game operation limits
    if (url.includes('/api/games/') && request.method === 'POST') {
      const gameKey = this.generateKey('game', userId || ip, 'operations');
      const gameLimit = await this.incrementCounter(
        gameKey,
        this.config.gameOperations.max,
        this.config.gameOperations.timeWindow
      );

      if (gameLimit.totalHits > this.config.gameOperations.max) {
        return {
          allowed: false,
          info: gameLimit,
          reason: 'Game operation rate limit exceeded'
        };
      }
    }

    // Check authentication limits
    if (url.includes('/api/auth/login')) {
      const authKey = this.generateKey('auth', ip, 'login');
      const authLimit = await this.incrementCounter(
        authKey,
        this.config.authentication.loginAttempts,
        this.config.authentication.timeWindow
      );

      if (authLimit.totalHits > this.config.authentication.loginAttempts) {
        return {
          allowed: false,
          info: authLimit,
          reason: 'Too many login attempts'
        };
      }
    }

    return { allowed: true, info: globalLimit };
  }

  private recordAttempt(attempt: RateLimitAttempt): void {
    this.attempts.push(attempt);
    if (this.attempts.length > this.maxAttempts) {
      this.attempts.shift();
    }
  }

  getStats(): {
    totalRequests: number;
    rejectedRequests: number;
    topIPs: Array<{ ip: string; count: number }>;
    topRoutes: Array<{ route: string; count: number }>;
  } {
    const totalRequests = this.attempts.length;

    // Count IPs
    const ipCounts = new Map<string, number>();
    const routeCounts = new Map<string, number>();

    for (const attempt of this.attempts) {
      ipCounts.set(attempt.ip, (ipCounts.get(attempt.ip) || 0) + 1);
      routeCounts.set(attempt.route, (routeCounts.get(attempt.route) || 0) + 1);
    }

    const topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topRoutes = Array.from(routeCounts.entries())
      .map(([route, count]) => ({ route, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalRequests,
      rejectedRequests: 0, // Would need to track rejections separately
      topIPs,
      topRoutes
    };
  }

  async clearLimits(identifier: string, type: 'ip' | 'user' | 'all' = 'all'): Promise<number> {
    let cleared = 0;

    try {
      const redisService = getRedisService();
      if (redisService.getConnectionStatus()) {
        const pattern = type === 'all' ? `rate_limit:*` : `rate_limit:*:${identifier}*`;
        const keys = await redisService.keys(pattern);
        for (const key of keys) {
          await redisService.delete(key);
          cleared++;
        }
      }
    } catch (error) {
      console.warn('⚠️ Redis rate limit clear error:', error);
    }

    // Clear from memory
    for (const [key] of this.memoryStore) {
      if (type === 'all' || key.includes(identifier)) {
        this.memoryStore.delete(key);
        cleared++;
      }
    }

    return cleared;
  }
}

// Global rate limiter instance
let rateLimiter: RateLimiter;

/**
 * Register rate limiting middleware
 */
export async function registerRateLimitingMiddleware(
  fastify: FastifyInstance,
  config: RateLimitConfig
): Promise<void> {
  // Initialize rate limiter
  rateLimiter = new RateLimiter(config);

  // Add rate limiting hook
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = await rateLimiter.checkRateLimit(request);

    if (!result.allowed && result.info) {
      // Add rate limit headers
      reply.header('X-RateLimit-Limit', config.global.max);
      reply.header('X-RateLimit-Remaining', Math.max(0, result.info.totalHitsLeft));
      reply.header('X-RateLimit-Reset', result.info.resetTime.toISOString());
      reply.header('Retry-After', Math.ceil(result.info.timeLeft / 1000));

      console.warn(`🚫 Rate limit exceeded: ${result.reason} for ${request.ip} on ${request.url}`);

      return reply.code(429).send({
        error: 'Too Many Requests',
        message: result.reason || 'Rate limit exceeded',
        retryAfter: Math.ceil(result.info.timeLeft / 1000),
        resetTime: result.info.resetTime
      });
    }

    // Add rate limit headers for successful requests
    if (result.info) {
      reply.header('X-RateLimit-Limit', config.global.max);
      reply.header('X-RateLimit-Remaining', Math.max(0, result.info.totalHitsLeft));
      reply.header('X-RateLimit-Reset', result.info.resetTime.toISOString());
    }
  });

  // Rate limit stats endpoint
  fastify.get('/api/rate-limit/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = rateLimiter.getStats();
    return {
      ...stats,
      timestamp: new Date().toISOString()
    };
  });

  // Rate limit management endpoint
  fastify.delete('/api/rate-limit/clear', async (request: FastifyRequest, reply: FastifyReply) => {
    const { identifier, type } = request.query as { identifier?: string; type?: 'ip' | 'user' | 'all' };

    if (!identifier && type !== 'all') {
      return reply.code(400).send({ error: 'Identifier required unless clearing all limits' });
    }

    const cleared = await rateLimiter.clearLimits(identifier || '', type);
    return { cleared, identifier, type };
  });

  console.log('✅ Rate limiting middleware registered successfully');
}

// Default configuration
export const defaultRateLimitConfig: RateLimitConfig = {
  global: {
    max: 1000, // 1000 requests per minute globally
    timeWindow: 60 * 1000 // 1 minute
  },
  perUser: {
    max: 100, // 100 requests per minute per user
    timeWindow: 60 * 1000
  },
  perIP: {
    max: 200, // 200 requests per minute per IP
    timeWindow: 60 * 1000
  },
  gameOperations: {
    max: 30, // 30 game operations per minute
    timeWindow: 60 * 1000
  },
  authentication: {
    loginAttempts: 5, // 5 login attempts per 15 minutes
    timeWindow: 15 * 60 * 1000,
    lockoutDuration: 15 * 60 * 1000
  },
  whitelist: ['127.0.0.1', '::1'], // Localhost
  skipRoutes: ['/api/health', '/api/performance/stats', '/api/rate-limit/stats']
};

export function getRateLimiter(): RateLimiter | undefined {
  return rateLimiter;
}