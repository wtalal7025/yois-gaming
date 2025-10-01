/**
 * Performance Optimization Middleware
 * Implements compression, caching, monitoring, and optimization for production readiness
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import fastifyCompress from '@fastify/compress';
import * as zlib from 'zlib';
import { getRedisService } from '../services/cache/RedisService';

interface PerformanceConfig {
  compression: {
    enabled: boolean;
    threshold: number; // bytes
    level: number; // 1-9, higher = better compression but slower
    encodings: string[];
  };
  caching: {
    enabled: boolean;
    defaultTTL: number; // seconds
    maxCacheSize: number; // entries
    cacheableRoutes: string[];
  };
  monitoring: {
    enabled: boolean;
    slowRequestThreshold: number; // ms
    enableMetrics: boolean;
  };
  timeouts: {
    requestTimeout: number; // ms
    keepAliveTimeout: number; // ms
  };
}

interface RequestMetrics {
  method: string;
  url: string;
  statusCode: number;
  responseTime: number;
  timestamp: number;
  userAgent?: string;
  ip?: string;
  cached: boolean;
}

/**
 * Performance monitoring and metrics collection
 */
class PerformanceMonitor {
  private metrics: RequestMetrics[] = [];
  private slowRequests: RequestMetrics[] = [];
  private readonly maxMetrics = 10000;
  private readonly maxSlowRequests = 1000;

  recordRequest(metrics: RequestMetrics): void {
    // Add to general metrics
    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Track slow requests separately
    if (metrics.responseTime > 1000) { // > 1 second
      this.slowRequests.push(metrics);
      if (this.slowRequests.length > this.maxSlowRequests) {
        this.slowRequests.shift();
      }
    }
  }

  getStats(): {
    totalRequests: number;
    averageResponseTime: number;
    slowRequestCount: number;
    cacheHitRate: number;
    requestsPerMinute: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalRequests: 0,
        averageResponseTime: 0,
        slowRequestCount: 0,
        cacheHitRate: 0,
        requestsPerMinute: 0
      };
    }

    const totalRequests = this.metrics.length;
    const averageResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const slowRequestCount = this.slowRequests.length;
    const cachedRequests = this.metrics.filter(m => m.cached).length;
    const cacheHitRate = totalRequests > 0 ? (cachedRequests / totalRequests) * 100 : 0;

    // Calculate requests per minute (last 60 seconds)
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = this.metrics.filter(m => m.timestamp > oneMinuteAgo);
    const requestsPerMinute = recentRequests.length;

    return {
      totalRequests,
      averageResponseTime: Math.round(averageResponseTime * 100) / 100,
      slowRequestCount,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      requestsPerMinute
    };
  }

  getSlowRequests(limit = 50): RequestMetrics[] {
    return this.slowRequests
      .sort((a, b) => b.responseTime - a.responseTime)
      .slice(0, limit);
  }
}

/**
 * API Response Cache Manager
 */
class ResponseCacheManager {
  private config: PerformanceConfig['caching'];
  private memoryCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(config: PerformanceConfig['caching']) {
    this.config = config;
  }

  private generateCacheKey(request: FastifyRequest): string {
    const { method, url, headers } = request;
    // Include relevant headers that might affect response
    const relevantHeaders = ['accept', 'accept-encoding', 'authorization'];
    const headerStr = relevantHeaders
      .map(h => `${h}:${headers[h] || ''}`)
      .join('|');
    return `api:${method}:${url}:${Buffer.from(headerStr).toString('base64')}`;
  }

  private isCacheableRoute(url: string): boolean {
    return this.config.cacheableRoutes.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));
        return regex.test(url);
      }
      return url.includes(pattern);
    });
  }

  private isCacheableRequest(request: FastifyRequest): boolean {
    // Only cache GET requests
    if (request.method !== 'GET') return false;

    // Check if route is cacheable
    if (!this.isCacheableRoute(request.url)) return false;

    // Don't cache if authorization header is present (user-specific data)
    if (request.headers.authorization) return false;

    return true;
  }

  async get(request: FastifyRequest): Promise<any | null> {
    if (!this.config.enabled || !this.isCacheableRequest(request)) {
      return null;
    }

    const cacheKey = this.generateCacheKey(request);

    try {
      // Try Redis first
      const redisService = getRedisService();
      if (redisService.getConnectionStatus()) {
        const cached = await redisService.get(cacheKey);
        if (cached) {
          console.log(`🎯 Cache HIT (Redis): ${request.method} ${request.url}`);
          return cached;
        }
      }
    } catch (error) {
      console.warn('⚠️ Redis cache read error:', error);
    }

    // Fallback to memory cache
    const memCached = this.memoryCache.get(cacheKey);
    if (memCached && Date.now() - memCached.timestamp < memCached.ttl * 1000) {
      console.log(`🎯 Cache HIT (Memory): ${request.method} ${request.url}`);
      return memCached.data;
    }

    // Clean up expired memory cache entries
    if (memCached && Date.now() - memCached.timestamp >= memCached.ttl * 1000) {
      this.memoryCache.delete(cacheKey);
    }

    return null;
  }

  async set(request: FastifyRequest, data: any, customTTL?: number): Promise<void> {
    if (!this.config.enabled || !this.isCacheableRequest(request)) {
      return;
    }

    const cacheKey = this.generateCacheKey(request);
    const ttl = customTTL || this.config.defaultTTL;

    try {
      // Store in Redis
      const redisService = getRedisService();
      if (redisService.getConnectionStatus()) {
        await redisService.set(cacheKey, data, ttl);
        console.log(`💾 Cache SET (Redis): ${request.method} ${request.url} (TTL: ${ttl}s)`);
      }
    } catch (error) {
      console.warn('⚠️ Redis cache write error:', error);
    }

    // Store in memory cache as fallback
    if (this.memoryCache.size >= this.config.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  async invalidate(pattern: string): Promise<number> {
    let invalidatedCount = 0;

    try {
      // Invalidate from Redis
      const redisService = getRedisService();
      if (redisService.getConnectionStatus()) {
        const keys = await redisService.keys(`api:*${pattern}*`);
        for (const key of keys) {
          await redisService.delete(key);
          invalidatedCount++;
        }
      }
    } catch (error) {
      console.warn('⚠️ Redis cache invalidation error:', error);
    }

    // Invalidate from memory cache
    for (const [key] of this.memoryCache) {
      if (key.includes(pattern)) {
        this.memoryCache.delete(key);
        invalidatedCount++;
      }
    }

    console.log(`🧹 Cache invalidated ${invalidatedCount} entries matching: ${pattern}`);
    return invalidatedCount;
  }

  getStats(): { memoryEntries: number; hitRate: number } {
    // This is a simplified implementation
    return {
      memoryEntries: this.memoryCache.size,
      hitRate: 0 // Would need to track hits/misses for accurate calculation
    };
  }
}

// Global instances
let performanceMonitor: PerformanceMonitor;
let responseCacheManager: ResponseCacheManager;

// Extend FastifyRequest interface
declare module 'fastify' {
  interface FastifyRequest {
    requestStartTime?: number;
  }
}

/**
 * Register performance optimization middleware
 */
export async function registerPerformanceMiddleware(
  fastify: FastifyInstance,
  config: PerformanceConfig
): Promise<void> {
  // Initialize global instances
  performanceMonitor = new PerformanceMonitor();
  responseCacheManager = new ResponseCacheManager(config.caching);

  // Register compression middleware
  if (config.compression.enabled) {
    await fastify.register(fastifyCompress as any, {
      global: true,
      threshold: config.compression.threshold,
      brotliOptions: {
        params: {
          [zlib.constants.BROTLI_PARAM_QUALITY]: Math.min(config.compression.level, 6),
          [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        },
      },
      zlibOptions: {
        level: config.compression.level,
        chunkSize: 16 * 1024, // 16KB chunks for better performance
      },
      encodings: config.compression.encodings,
      customTypes: /^application\/(json|javascript)|^text\//,
      removeContentLengthHeader: false, // Keep content-length for better caching
    });

    console.log('✅ Compression middleware registered');
  }

  // Pre-handler hook for cache checking
  fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = Date.now();
    request.requestStartTime = startTime;

    // Check cache for GET requests
    if (request.method === 'GET') {
      const cachedResponse = await responseCacheManager.get(request);
      if (cachedResponse) {
        reply.header('X-Cache-Status', 'HIT');
        reply.header('X-Response-Time', `${Date.now() - startTime}ms`);
        reply.send(cachedResponse);
        return;
      }
    }

    reply.header('X-Cache-Status', 'MISS');
  });

  // Post-response hook for caching and monitoring
  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const responseTime = Date.now() - (request.requestStartTime || Date.now());

    // Record metrics if monitoring is enabled
    if (config.monitoring.enabled) {
      const metrics: RequestMetrics = {
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        responseTime,
        timestamp: Date.now(),
        userAgent: request.headers['user-agent'] || 'unknown',
        ip: request.ip,
        cached: reply.getHeader('X-Cache-Status') === 'HIT',
      };

      performanceMonitor.recordRequest(metrics);

      // Log slow requests
      if (responseTime > config.monitoring.slowRequestThreshold) {
        console.warn(`🐌 Slow request detected: ${request.method} ${request.url} (${responseTime}ms)`);
      }
    }

    // Cache successful GET responses
    if (
      request.method === 'GET' &&
      reply.statusCode === 200 &&
      reply.getHeader('X-Cache-Status') === 'MISS' &&
      !reply.getHeader('Cache-Control')?.toString().includes('no-cache')
    ) {
      try {
        // For now, we'll skip caching response body as it requires more complex handling
        // This would need to be implemented with payload capture
      } catch (error) {
        // Ignore caching errors
      }
    }

    // Add performance headers
    reply.header('X-Response-Time', `${responseTime}ms`);
    reply.header('X-Powered-By', 'Fastify-Optimized');
  });

  // Register performance stats endpoint
  fastify.get('/api/performance/stats', async (_request: FastifyRequest, reply: FastifyReply) => {
    if (!config.monitoring.enabled) {
      return reply.code(404).send({ error: 'Performance monitoring disabled' });
    }

    const stats = performanceMonitor.getStats();
    const cacheStats = responseCacheManager.getStats();

    return {
      performance: stats,
      cache: cacheStats,
      timestamp: new Date().toISOString(),
    };
  });

  // Register cache management endpoints
  fastify.post('/api/performance/cache/invalidate', async (request: FastifyRequest, reply: FastifyReply) => {
    const { pattern } = request.body as { pattern?: string };

    if (!pattern) {
      return reply.code(400).send({ error: 'Pattern is required' });
    }

    const invalidatedCount = await responseCacheManager.invalidate(pattern);
    return { invalidated: invalidatedCount, pattern };
  });

  console.log('✅ Performance middleware registered successfully');
}

// Default configuration
export const defaultPerformanceConfig: PerformanceConfig = {
  compression: {
    enabled: true,
    threshold: 1024, // 1KB
    level: 6, // Balanced compression vs speed
    encodings: ['br', 'gzip', 'deflate'], // Prefer Brotli, fallback to gzip/deflate
  },
  caching: {
    enabled: true,
    defaultTTL: 300, // 5 minutes
    maxCacheSize: 1000, // entries
    cacheableRoutes: ['/api/games/*', '/api/user/profile', '/api/leaderboard*'],
  },
  monitoring: {
    enabled: process.env.NODE_ENV === 'development' || process.env.ENABLE_MONITORING === 'true',
    slowRequestThreshold: 1000, // 1 second
    enableMetrics: true,
  },
  timeouts: {
    requestTimeout: 30000, // 30 seconds
    keepAliveTimeout: 5000, // 5 seconds
  },
};

// Export monitor for external access
export function getPerformanceMonitor(): PerformanceMonitor | undefined {
  return performanceMonitor;
}

export function getResponseCacheManager(): ResponseCacheManager | undefined {
  return responseCacheManager;
}