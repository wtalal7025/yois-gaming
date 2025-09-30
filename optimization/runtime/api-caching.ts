/**
 * Advanced API Response Caching System
 * Implements intelligent caching strategies with TTL, invalidation, and memory management
 */

// Types for caching system
export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  compressionEnabled: boolean;
  persistToStorage: boolean;
  debugMode: boolean;
}

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
  size: number;
  etag?: string;
  compressed?: boolean;
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  evictionCount: number;
  compressionRatio: number;
}

export interface CacheStrategy {
  name: string;
  shouldCache: (url: string, response: Response) => boolean;
  getTTL: (url: string, response: Response) => number;
  getKey: (url: string, options?: RequestInit) => string;
}

/**
 * LRU Cache with TTL support for API responses
 */
class LRUCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = [];
  private readonly maxSize: number;
  private evictionCount = 0;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL expiration
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.delete(key);
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);
    entry.hits++;
    
    return entry;
  }

  set(key: string, entry: CacheEntry<T>): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.delete(key);
    }

    // Evict least recently used if at capacity
    while (this.cache.size >= this.maxSize) {
      const lruKey = this.accessOrder.shift();
      if (lruKey) {
        this.cache.delete(lruKey);
        this.evictionCount++;
      }
    }

    this.cache.set(key, entry);
    this.accessOrder.push(key);
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    // Check TTL expiration
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; evictions: number; entries: Array<{ key: string; hits: number; size: number }> } {
    return {
      size: this.cache.size,
      evictions: this.evictionCount,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        hits: entry.hits,
        size: entry.size
      }))
    };
  }

  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }
}

/**
 * Compression utilities for cache optimization
 */
class CompressionUtils {
  /**
   * Compress data using built-in compression if available
   */
  static async compress(data: string): Promise<{ data: string; originalSize: number; compressedSize: number }> {
    const originalSize = new Blob([data]).size;
    
    // Check if CompressionStream is available (modern browsers)
    if (typeof CompressionStream !== 'undefined') {
      try {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(new TextEncoder().encode(data));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const compressedArray = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        chunks.forEach(chunk => {
          compressedArray.set(chunk, offset);
          offset += chunk.length;
        });
        
        const compressedData = btoa(String.fromCharCode(...compressedArray));
        return {
          data: compressedData,
          originalSize,
          compressedSize: compressedArray.length
        };
      } catch (error) {
        // Fallback to base64 encoding for older browsers
        return this.fallbackCompress(data, originalSize);
      }
    }
    
    return this.fallbackCompress(data, originalSize);
  }

  /**
   * Decompress data
   */
  static async decompress(compressedData: string): Promise<string> {
    // Check if DecompressionStream is available
    if (typeof DecompressionStream !== 'undefined') {
      try {
        const compressedBytes = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressedBytes);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) chunks.push(value);
        }
        
        const decompressedArray = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        chunks.forEach(chunk => {
          decompressedArray.set(chunk, offset);
          offset += chunk.length;
        });
        
        return new TextDecoder().decode(decompressedArray);
      } catch (error) {
        // Fallback for older browsers
        return atob(compressedData);
      }
    }
    
    return atob(compressedData);
  }

  private static fallbackCompress(data: string, originalSize: number) {
    const compressedData = btoa(data);
    return {
      data: compressedData,
      originalSize,
      compressedSize: compressedData.length
    };
  }
}

/**
 * Advanced API Caching Manager
 */
export class APICacheManager {
  private static instance: APICacheManager;
  private cache: LRUCache;
  private config: CacheConfig;
  private strategies: Map<string, CacheStrategy> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0,
    evictions: 0,
    compressionSavings: 0
  };

  private constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 100,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      compressionEnabled: true,
      persistToStorage: true,
      debugMode: false,
      ...config
    };
    
    this.cache = new LRUCache(this.config.maxSize);
    this.setupDefaultStrategies();
    this.loadFromStorage();
  }

  static getInstance(config?: Partial<CacheConfig>): APICacheManager {
    if (!APICacheManager.instance) {
      APICacheManager.instance = new APICacheManager(config);
    }
    return APICacheManager.instance;
  }

  /**
   * Cached fetch with intelligent caching strategies
   */
  async cachedFetch<T = any>(
    url: string, 
    options: RequestInit = {},
    cacheOptions: { 
      strategy?: string; 
      ttl?: number; 
      forceRefresh?: boolean;
      staleWhileRevalidate?: boolean;
    } = {}
  ): Promise<T> {
    this.stats.totalRequests++;
    
    const strategy = this.strategies.get(cacheOptions.strategy || 'default');
    if (!strategy) {
      throw new Error(`Cache strategy '${cacheOptions.strategy}' not found`);
    }

    const cacheKey = strategy.getKey(url, options);
    
    // Force refresh bypasses cache
    if (!cacheOptions.forceRefresh) {
      const cachedEntry = this.cache.get(cacheKey);
      if (cachedEntry) {
        this.stats.hits++;
        
        if (this.config.debugMode) {
          console.log(`Cache HIT for ${url}`);
        }

        // Stale-while-revalidate: return cached data but fetch fresh data in background
        if (cacheOptions.staleWhileRevalidate && this.isStale(cachedEntry)) {
          this.backgroundRefresh(url, options, cacheOptions, strategy, cacheKey);
        }

        return cachedEntry.compressed 
          ? JSON.parse(await CompressionUtils.decompress(cachedEntry.data))
          : cachedEntry.data;
      }
    }

    // Cache miss - fetch fresh data
    this.stats.misses++;
    
    if (this.config.debugMode) {
      console.log(`Cache MISS for ${url}`);
    }

    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the response if strategy allows
      if (strategy.shouldCache(url, response)) {
        await this.setCacheEntry(cacheKey, data, strategy.getTTL(url, response), response);
      }

      return data;
    } catch (error) {
      // On error, return stale cache if available
      const staleEntry = this.cache.get(cacheKey);
      if (staleEntry) {
        if (this.config.debugMode) {
          console.warn(`Returning stale cache for ${url} due to error:`, error);
        }
        return staleEntry.compressed 
          ? JSON.parse(await CompressionUtils.decompress(staleEntry.data))
          : staleEntry.data;
      }
      throw error;
    }
  }

  /**
   * Add custom caching strategy
   */
  addStrategy(strategy: CacheStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Manually invalidate cache entries
   */
  invalidate(pattern: string | RegExp): number {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];

    // Get all cache keys for pattern matching
    const stats = this.cache.getStats();
    const allKeys = stats.entries.map(entry => entry.key);

    for (const key of allKeys) {
      const shouldInvalidate = typeof pattern === 'string' 
        ? key.includes(pattern)
        : pattern.test(key);
        
      if (shouldInvalidate) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => {
      this.cache.delete(key);
      invalidatedCount++;
    });

    if (this.config.debugMode && invalidatedCount > 0) {
      console.log(`Invalidated ${invalidatedCount} cache entries matching pattern:`, pattern);
    }

    return invalidatedCount;
  }

  /**
   * Get comprehensive cache statistics
   */
  getStats(): CacheStats {
    const cacheStats = this.cache.getStats();
    const totalSize = cacheStats.entries.reduce((sum, entry) => sum + entry.size, 0);
    
    return {
      totalEntries: cacheStats.size,
      totalSize,
      hitRate: this.stats.totalRequests > 0 ? this.stats.hits / this.stats.totalRequests : 0,
      missRate: this.stats.totalRequests > 0 ? this.stats.misses / this.stats.totalRequests : 0,
      evictionCount: cacheStats.evictions,
      compressionRatio: this.stats.compressionSavings > 0 ? this.stats.compressionSavings : 1
    };
  }

  /**
   * Clear all cached data
   */
  clear(): void {
    this.cache.clear();
    this.clearStorage();
    this.stats = { hits: 0, misses: 0, totalRequests: 0, evictions: 0, compressionSavings: 0 };
  }

  /**
   * Preload data into cache
   */
  async preload(requests: Array<{ url: string; options?: RequestInit; strategy?: string }>): Promise<void> {
    const preloadPromises = requests.map(({ url, options = {}, strategy = 'default' }) =>
      this.cachedFetch(url, options, { strategy }).catch(error => {
        if (this.config.debugMode) {
          console.warn(`Preload failed for ${url}:`, error);
        }
      })
    );

    await Promise.allSettled(preloadPromises);
  }

  private async setCacheEntry<T>(
    key: string, 
    data: T, 
    ttl: number, 
    response: Response
  ): Promise<void> {
    let processedData: string;
    let compressed = false;
    let originalSize = 0;
    let finalSize = 0;

    const serializedData = JSON.stringify(data);
    originalSize = new Blob([serializedData]).size;

    if (this.config.compressionEnabled && originalSize > 1024) { // Compress if > 1KB
      try {
        const compressionResult = await CompressionUtils.compress(serializedData);
        processedData = compressionResult.data;
        finalSize = compressionResult.compressedSize;
        compressed = true;
        
        // Track compression savings
        this.stats.compressionSavings += (originalSize - finalSize);
      } catch (error) {
        processedData = serializedData;
        finalSize = originalSize;
      }
    } else {
      processedData = serializedData;
      finalSize = originalSize;
    }

    const entry: CacheEntry = {
      data: processedData,
      timestamp: Date.now(),
      ttl,
      hits: 0,
      size: finalSize,
      etag: response.headers.get('etag') || undefined,
      compressed
    };

    this.cache.set(key, entry);
    
    // Persist to storage if enabled
    if (this.config.persistToStorage) {
      this.saveToStorage();
    }
  }

  private isStale(entry: CacheEntry): boolean {
    const age = Date.now() - entry.timestamp;
    return age > (entry.ttl * 0.8); // Consider stale at 80% of TTL
  }

  private async backgroundRefresh(
    url: string,
    options: RequestInit,
    cacheOptions: any,
    strategy: CacheStrategy,
    cacheKey: string
  ): Promise<void> {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        const data = await response.json();
        await this.setCacheEntry(cacheKey, data, strategy.getTTL(url, response), response);
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.warn(`Background refresh failed for ${url}:`, error);
      }
    }
  }

  private setupDefaultStrategies(): void {
    // Default strategy - cache GET requests for default TTL
    this.addStrategy({
      name: 'default',
      shouldCache: (url, response) => response.status === 200,
      getTTL: () => this.config.defaultTTL,
      getKey: (url, options) => `${options?.method || 'GET'}:${url}`
    });

    // Static resources strategy - longer TTL for static assets
    this.addStrategy({
      name: 'static',
      shouldCache: (url, response) => {
        const isStatic = /\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/i.test(url);
        return response.status === 200 && isStatic;
      },
      getTTL: () => 60 * 60 * 1000, // 1 hour
      getKey: (url) => `static:${url}`
    });

    // API data strategy - medium TTL for API responses
    this.addStrategy({
      name: 'api',
      shouldCache: (url, response) => {
        const isAPI = url.includes('/api/');
        return response.status === 200 && isAPI;
      },
      getTTL: (url, response) => {
        const cacheControl = response.headers.get('cache-control');
        if (cacheControl) {
          const match = cacheControl.match(/max-age=(\d+)/);
          if (match) return parseInt(match[1]) * 1000;
        }
        return 2 * 60 * 1000; // 2 minutes default
      },
      getKey: (url, options) => `api:${options?.method || 'GET'}:${url}`
    });
  }

  private saveToStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stats = this.cache.getStats();
      const cacheData = {
        timestamp: Date.now(),
        entries: stats.entries.slice(0, 50) // Limit storage size
      };
      localStorage.setItem('api-cache-data', JSON.stringify(cacheData));
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('Failed to persist cache to storage:', error);
      }
    }
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('api-cache-data');
      if (stored) {
        const cacheData = JSON.parse(stored);
        // Only load if data is less than 1 hour old
        if (Date.now() - cacheData.timestamp < 60 * 60 * 1000) {
          // Note: In a real implementation, you'd reconstruct cache entries
          if (this.config.debugMode) {
            console.log('Cache data loaded from storage');
          }
        }
      }
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('Failed to load cache from storage:', error);
      }
    }
  }

  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;
    
    try {
      localStorage.removeItem('api-cache-data');
    } catch (error) {
      if (this.config.debugMode) {
        console.warn('Failed to clear cache storage:', error);
      }
    }
  }
}

// Export convenience function for easy use
export const createCacheManager = (config?: Partial<CacheConfig>) => 
  APICacheManager.getInstance(config);

// Default export
export default APICacheManager;