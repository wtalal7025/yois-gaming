/**
 * API Response Caching Service
 * Advanced Redis-based caching for API responses with intelligent invalidation
 * Compatible with existing RedisService interface
 */

import { getRedisService, RedisService } from './RedisService';

interface CacheConfig {
  ttl: number; // Time to live in seconds
  tags: string[]; // Cache tags for group invalidation
  version: string; // Cache version for invalidation
}

interface CacheMetadata {
  created: number;
  ttl: number;
  tags: string[];
  version: string;
  size: number;
  hitCount: number;
  lastAccessed: number;
}

interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalSize: number;
  keyCount: number;
  avgResponseTime: number;
}

/**
 * API Response Cache Service with advanced features
 */
export class ApiCacheService {
  private redis: RedisService = getRedisService();
  private stats = {
    hits: 0,
    misses: 0,
    totalResponseTime: 0,
    requestCount: 0
  };
  
  /**
   * Generate cache key for API request
   */
  private generateKey(route: string, params: any = {}, userId?: string): string {
    const sortedParams = Object.keys(params)
      .sort()
      .reduce((obj, key) => {
        obj[key] = params[key];
        return obj;
      }, {} as any);
    
    const baseKey = `api:${route}:${JSON.stringify(sortedParams)}`;
    return userId ? `${baseKey}:user:${userId}` : baseKey;
  }

  /**
   * Generate metadata key
   */
  private getMetadataKey(cacheKey: string): string {
    return `${cacheKey}:meta`;
  }

  /**
   * Store response in cache
   */
  async set(
    route: string,
    data: any,
    config: Partial<CacheConfig> = {},
    params: any = {},
    userId?: string
  ): Promise<void> {
    if (!this.redis.getConnectionStatus()) {
      return;
    }

    const cacheKey = this.generateKey(route, params, userId);
    const metaKey = this.getMetadataKey(cacheKey);
    
    const finalConfig: CacheConfig = {
      ttl: 300, // 5 minutes default
      tags: [],
      version: '1.0',
      ...config
    };

    try {
      const processedData = JSON.stringify(data);
      const now = Date.now();
      
      const metadata: CacheMetadata = {
        created: now,
        ttl: finalConfig.ttl,
        tags: finalConfig.tags,
        version: finalConfig.version,
        size: processedData.length,
        hitCount: 0,
        lastAccessed: now
      };

      // Store data and metadata
      await Promise.all([
        this.redis.set(cacheKey, processedData, finalConfig.ttl),
        this.redis.set(metaKey, JSON.stringify(metadata), finalConfig.ttl + 60)
      ]);
      
      // Add to tag sets for group invalidation
      for (const tag of finalConfig.tags) {
        const tagKey = `tag:${tag}`;
        await this.redis.set(tagKey, cacheKey, finalConfig.ttl + 300);
      }

    } catch (error) {
      // Silent fail for caching errors
    }
  }

  /**
   * Get response from cache
   */
  async get(route: string, params: any = {}, userId?: string): Promise<any | null> {
    if (!this.redis.getConnectionStatus()) {
      this.stats.misses++;
      return null;
    }

    const cacheKey = this.generateKey(route, params, userId);
    const metaKey = this.getMetadataKey(cacheKey);
    const startTime = Date.now();

    try {
      const [data, metaStr] = await Promise.all([
        this.redis.get(cacheKey) as Promise<string | null>,
        this.redis.get(metaKey) as Promise<string | null>
      ]);

      const responseTime = Date.now() - startTime;
      this.stats.totalResponseTime += responseTime;
      this.stats.requestCount++;

      if (!data || !metaStr) {
        this.stats.misses++;
        return null;
      }

      const metadata: CacheMetadata = JSON.parse(metaStr);
      const now = Date.now();
      
      // Check if cache is stale
      const age = now - metadata.created;
      const isStale = age > (metadata.ttl - 60) * 1000; // Stale 1 minute before expiry
      
      // Update access statistics
      metadata.hitCount++;
      metadata.lastAccessed = now;
      
      // Update metadata in background
      this.redis.set(metaKey, JSON.stringify(metadata), metadata.ttl).catch(() => {});

      this.stats.hits++;
      
      const decompressedData = JSON.parse(data);
      
      return {
        data: decompressedData,
        metadata: {
          cached: true,
          age: age,
          isStale: isStale,
          hitCount: metadata.hitCount,
          version: metadata.version
        }
      };
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if cache entry exists and is fresh
   */
  async exists(route: string, params: any = {}, userId?: string): Promise<boolean> {
    if (!this.redis.getConnectionStatus()) return false;

    const cacheKey = this.generateKey(route, params, userId);
    return await this.redis.exists(cacheKey);
  }

  /**
   * Invalidate specific cache entry
   */
  async invalidate(route: string, params: any = {}, userId?: string): Promise<void> {
    if (!this.redis.getConnectionStatus()) return;

    const cacheKey = this.generateKey(route, params, userId);
    const metaKey = this.getMetadataKey(cacheKey);
    
    try {
      await Promise.all([
        this.redis.delete(cacheKey),
        this.redis.delete(metaKey)
      ]);
    } catch (error) {
      // Silent fail for invalidation errors
    }
  }

  /**
   * Invalidate by cache tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.redis.getConnectionStatus()) return 0;

    let totalInvalidated = 0;
    
    try {
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const cacheKey = await this.redis.get(tagKey);
        
        if (cacheKey) {
          const metaKey = this.getMetadataKey(cacheKey);
          await Promise.all([
            this.redis.delete(cacheKey),
            this.redis.delete(metaKey),
            this.redis.delete(tagKey)
          ]);
          totalInvalidated++;
        }
      }
      
      return totalInvalidated;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Invalidate all API cache
   */
  async invalidateAll(): Promise<number> {
    if (!this.redis.getConnectionStatus()) return 0;

    try {
      const keys = await this.redis.keys('api:*');
      if (keys.length === 0) return 0;

      const deletePromises = keys.map(key => this.redis.delete(key));
      await Promise.all(deletePromises);

      return keys.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const hitRate = this.stats.requestCount > 0 
      ? (this.stats.hits / this.stats.requestCount) * 100 
      : 0;
    
    const avgResponseTime = this.stats.requestCount > 0
      ? this.stats.totalResponseTime / this.stats.requestCount
      : 0;

    return {
      hits: this.stats.hits,
      misses: this.stats.misses,
      hitRate: parseFloat(hitRate.toFixed(2)),
      totalSize: 0, // Would need Redis memory analysis
      keyCount: 0, // Would need to count keys
      avgResponseTime: parseFloat(avgResponseTime.toFixed(2))
    };
  }

  /**
   * Get detailed cache info for monitoring
   */
  async getCacheInfo(): Promise<{
    stats: CacheStats;
    keyCount: number;
    connected: boolean;
  }> {
    const stats = this.getStats();
    let keyCount = 0;
    
    try {
      const keys = await this.redis.keys('api:*');
      keyCount = keys.length;
    } catch (error) {
      // Silent fail
    }

    return {
      stats,
      keyCount,
      connected: this.redis.getConnectionStatus()
    };
  }

  /**
   * Warm up cache with common routes
   */
  async warmUp(routes: Array<{
    route: string;
    params?: any;
    ttl?: number;
    fetcher: () => Promise<any>;
  }>): Promise<void> {
    
    const promises = routes.map(async ({ route, params, ttl, fetcher }) => {
      try {
        const exists = await this.exists(route, params);
        if (!exists) {
          const data = await fetcher();
          await this.set(route, data, { ttl: ttl || 300, tags: [], version: '1.0' }, params);
        }
      } catch (error) {
        // Silent fail for warm-up errors
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      totalResponseTime: 0,
      requestCount: 0
    };
  }

  /**
   * Clear expired entries (manual cleanup)
   */
  async cleanup(): Promise<number> {
    if (!this.redis.getConnectionStatus()) return 0;

    try {
      const keys = await this.redis.keys('api:*');
      let cleaned = 0;

      for (const key of keys) {
        const metaKey = this.getMetadataKey(key);
        const metaStr = await this.redis.get(metaKey);
        
        if (!metaStr) {
          await this.redis.delete(key);
          cleaned++;
          continue;
        }

        try {
          const metadata: CacheMetadata = JSON.parse(metaStr);
          const age = Date.now() - metadata.created;
          
          if (age > metadata.ttl * 1000) {
            await Promise.all([
              this.redis.delete(key),
              this.redis.delete(metaKey)
            ]);
            cleaned++;
          }
        } catch (error) {
          // Delete corrupted entries
          await Promise.all([
            this.redis.delete(key),
            this.redis.delete(metaKey)
          ]);
          cleaned++;
        }
      }

      return cleaned;
    } catch (error) {
      return 0;
    }
  }
}

// Global instance
let apiCacheService: ApiCacheService;

/**
 * Get or create API cache service instance
 */
export function getApiCacheService(): ApiCacheService {
  if (!apiCacheService) {
    apiCacheService = new ApiCacheService();
  }
  return apiCacheService;
}

/**
 * Cache middleware helper for route handlers
 */
export function createCacheHelper(defaultTTL: number = 300) {
  return {
    /**
     * Get cached response or execute function and cache result
     */
    getOrSet: async function<T>(
      route: string,
      fetcher: () => Promise<T>,
      config?: Partial<CacheConfig>,
      params?: any,
      userId?: string
    ): Promise<T> {
      const cacheService = getApiCacheService();
      
      // Try to get from cache
      const cached = await cacheService.get(route, params, userId);
      
      if (cached) {
        return cached.data;
      }
      
      // Execute fetcher and cache result
      try {
        const result = await fetcher();
        await cacheService.set(route, result, {
          ttl: defaultTTL,
          ...config
        }, params, userId);
        return result;
      } catch (error) {
        throw error;
      }
    },

    /**
     * Invalidate cache for specific route
     */
    invalidate: async function(route: string, params?: any, userId?: string): Promise<void> {
      const cacheService = getApiCacheService();
      await cacheService.invalidate(route, params, userId);
    },

    /**
     * Invalidate cache by tags
     */
    invalidateByTags: async function(tags: string[]): Promise<number> {
      const cacheService = getApiCacheService();
      return await cacheService.invalidateByTags(tags);
    }
  };
}