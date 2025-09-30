/**
 * API Cache Service Tests
 * Comprehensive test suite for Redis-based API response caching
 */

import { describe, expect, test, beforeEach, afterEach, jest } from '@jest/globals';
import { ApiCacheService, getApiCacheService, createCacheHelper } from '../../../services/cache/ApiCacheService';

// Mock RedisService
jest.mock('../../../services/cache/RedisService', () => ({
  getRedisService: jest.fn(() => mockRedisService)
}));

const mockRedisService = {
  getConnectionStatus: jest.fn(() => true),
  get: jest.fn(),
  set: jest.fn(),
  delete: jest.fn(),
  exists: jest.fn(),
  keys: jest.fn()
};

describe('ApiCacheService', () => {
  let cacheService: ApiCacheService;

  beforeEach(() => {
    cacheService = new ApiCacheService();
    jest.clearAllMocks();
    mockRedisService.getConnectionStatus.mockReturnValue(true);
  });

  afterEach(() => {
    cacheService.resetStats();
  });

  describe('set and get operations', () => {
    test('should cache and retrieve API response successfully', async () => {
      // Arrange
      const route = '/api/users/profile';
      const params = { userId: '123' };
      const testData = { id: '123', name: 'Test User', email: 'test@example.com' };
      const config = { ttl: 300, tags: ['user'], version: '1.0' };

      mockRedisService.set.mockResolvedValue(true);
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(testData)) // First call for data
        .mockResolvedValueOnce(JSON.stringify({ // Second call for metadata
          created: Date.now(),
          ttl: 300,
          tags: ['user'],
          version: '1.0',
          size: JSON.stringify(testData).length,
          hitCount: 0,
          lastAccessed: Date.now()
        }));

      // Act
      await cacheService.set(route, testData, config, params);
      const result = await cacheService.get(route, params);

      // Assert
      expect(mockRedisService.set).toHaveBeenCalledTimes(3); // Data, metadata, and tag
      expect(result).toBeTruthy();
      expect(result.data).toEqual(testData);
      expect(result.metadata.cached).toBe(true);
      expect(result.metadata.version).toBe('1.0');
    });

    test('should return null when cache miss occurs', async () => {
      // Arrange
      const route = '/api/users/nonexistent';
      const params = { userId: '999' };

      mockRedisService.get.mockResolvedValue(null);

      // Act
      const result = await cacheService.get(route, params);

      // Assert
      expect(result).toBeNull();
      expect(cacheService.getStats().misses).toBe(1);
    });

    test('should handle Redis connection failure gracefully', async () => {
      // Arrange
      mockRedisService.getConnectionStatus.mockReturnValue(false);
      const route = '/api/test';
      const testData = { message: 'test' };

      // Act
      await cacheService.set(route, testData);
      const result = await cacheService.get(route);

      // Assert
      expect(result).toBeNull();
      expect(mockRedisService.set).not.toHaveBeenCalled();
    });
  });

  describe('exists operation', () => {
    test('should check if cache entry exists', async () => {
      // Arrange
      const route = '/api/test';
      const params = { id: '123' };
      mockRedisService.exists.mockResolvedValue(true);

      // Act
      const exists = await cacheService.exists(route, params);

      // Assert
      expect(exists).toBe(true);
      expect(mockRedisService.exists).toHaveBeenCalledWith(
        expect.stringContaining('api:/api/test:')
      );
    });

    test('should return false when Redis is disconnected', async () => {
      // Arrange
      mockRedisService.getConnectionStatus.mockReturnValue(false);
      const route = '/api/test';

      // Act
      const exists = await cacheService.exists(route);

      // Assert
      expect(exists).toBe(false);
    });
  });

  describe('invalidation operations', () => {
    test('should invalidate specific cache entry', async () => {
      // Arrange
      const route = '/api/users/profile';
      const params = { userId: '123' };
      mockRedisService.delete.mockResolvedValue(1);

      // Act
      await cacheService.invalidate(route, params);

      // Assert
      expect(mockRedisService.delete).toHaveBeenCalledTimes(2); // Data and metadata
    });

    test('should invalidate cache by tags', async () => {
      // Arrange
      const tags = ['user', 'profile'];
      mockRedisService.get.mockResolvedValue('api:cached:key');
      mockRedisService.delete.mockResolvedValue(1);

      // Act
      const invalidated = await cacheService.invalidateByTags(tags);

      // Assert
      expect(invalidated).toBe(2);
      expect(mockRedisService.get).toHaveBeenCalledWith('tag:user');
      expect(mockRedisService.get).toHaveBeenCalledWith('tag:profile');
    });

    test('should invalidate all API cache', async () => {
      // Arrange
      const keys = ['api:route1:key1', 'api:route2:key2', 'api:route3:key3'];
      mockRedisService.keys.mockResolvedValue(keys);
      mockRedisService.delete.mockResolvedValue(1);

      // Act
      const invalidated = await cacheService.invalidateAll();

      // Assert
      expect(invalidated).toBe(3);
      expect(mockRedisService.keys).toHaveBeenCalledWith('api:*');
    });
  });

  describe('statistics tracking', () => {
    test('should track cache hits and misses', async () => {
      // Arrange
      mockRedisService.get.mockResolvedValueOnce(null); // Miss
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify({ data: 'test' })) // Hit - data
        .mockResolvedValueOnce(JSON.stringify({ // Hit - metadata
          created: Date.now(),
          ttl: 300,
          tags: [],
          version: '1.0',
          size: 100,
          hitCount: 0,
          lastAccessed: Date.now()
        }));

      // Act
      await cacheService.get('/api/miss'); // Miss
      await cacheService.get('/api/hit');  // Hit

      // Assert
      const stats = cacheService.getStats();
      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
    });

    test('should calculate average response time', async () => {
      // Arrange
      mockRedisService.get.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(null), 50))
      );

      // Act
      await cacheService.get('/api/test1');
      await cacheService.get('/api/test2');

      // Assert
      const stats = cacheService.getStats();
      expect(stats.avgResponseTime).toBeGreaterThan(40); // Rough timing check
    });
  });

  describe('warm up functionality', () => {
    test('should warm up cache with provided routes', async () => {
      // Arrange
      const routes = [
        {
          route: '/api/users',
          params: {},
          ttl: 600,
          fetcher: jest.fn().mockResolvedValue([{ id: '1', name: 'User 1' }])
        },
        {
          route: '/api/posts',
          params: { limit: 10 },
          fetcher: jest.fn().mockResolvedValue([{ id: '1', title: 'Post 1' }])
        }
      ];

      mockRedisService.exists.mockResolvedValue(false);
      mockRedisService.set.mockResolvedValue(true);

      // Act
      await cacheService.warmUp(routes);

      // Assert
      expect(routes[0].fetcher).toHaveBeenCalled();
      expect(routes[1].fetcher).toHaveBeenCalled();
    });

    test('should skip existing cache entries during warm up', async () => {
      // Arrange
      const routes = [
        {
          route: '/api/cached',
          fetcher: jest.fn().mockResolvedValue({ data: 'test' })
        }
      ];

      mockRedisService.exists.mockResolvedValue(true);

      // Act
      await cacheService.warmUp(routes);

      // Assert
      expect(routes[0].fetcher).not.toHaveBeenCalled();
    });
  });

  describe('cleanup functionality', () => {
    test('should clean up expired cache entries', async () => {
      // Arrange
      const keys = ['api:expired:key', 'api:valid:key'];
      const expiredMeta = {
        created: Date.now() - 400000, // 400 seconds ago
        ttl: 300, // 5 minutes TTL
        tags: [],
        version: '1.0',
        size: 100,
        hitCount: 1,
        lastAccessed: Date.now() - 400000
      };
      const validMeta = {
        created: Date.now() - 100000, // 100 seconds ago
        ttl: 300,
        tags: [],
        version: '1.0',
        size: 100,
        hitCount: 1,
        lastAccessed: Date.now() - 100000
      };

      mockRedisService.keys.mockResolvedValue(keys);
      mockRedisService.get
        .mockResolvedValueOnce(JSON.stringify(expiredMeta))
        .mockResolvedValueOnce(JSON.stringify(validMeta));
      mockRedisService.delete.mockResolvedValue(1);

      // Act
      const cleaned = await cacheService.cleanup();

      // Assert
      expect(cleaned).toBe(1);
      expect(mockRedisService.delete).toHaveBeenCalledWith('api:expired:key');
    });
  });
});

describe('getApiCacheService', () => {
  test('should return singleton instance', () => {
    const instance1 = getApiCacheService();
    const instance2 = getApiCacheService();
    
    expect(instance1).toBe(instance2);
  });
});

describe('createCacheHelper', () => {
  let cacheHelper: ReturnType<typeof createCacheHelper>;

  beforeEach(() => {
    cacheHelper = createCacheHelper(300);
    jest.clearAllMocks();
    mockRedisService.getConnectionStatus.mockReturnValue(true);
  });

  test('should get or set cached data', async () => {
    // Arrange
    const route = '/api/helper/test';
    const fetcherResult = { id: '1', data: 'fetched' };
    const fetcher = jest.fn().mockResolvedValue(fetcherResult);

    mockRedisService.get.mockResolvedValue(null); // Cache miss
    mockRedisService.set.mockResolvedValue(true);

    // Act
    const result = await cacheHelper.getOrSet(route, fetcher);

    // Assert
    expect(result).toEqual(fetcherResult);
    expect(fetcher).toHaveBeenCalled();
    expect(mockRedisService.set).toHaveBeenCalledTimes(2); // Data and metadata
  });

  test('should return cached data without calling fetcher', async () => {
    // Arrange
    const route = '/api/helper/cached';
    const cachedData = { id: '1', data: 'cached' };
    const fetcher = jest.fn();

    mockRedisService.get
      .mockResolvedValueOnce(JSON.stringify(cachedData))
      .mockResolvedValueOnce(JSON.stringify({
        created: Date.now(),
        ttl: 300,
        tags: [],
        version: '1.0',
        size: 100,
        hitCount: 0,
        lastAccessed: Date.now()
      }));

    // Act
    const result = await cacheHelper.getOrSet(route, fetcher);

    // Assert
    expect(result).toEqual(cachedData);
    expect(fetcher).not.toHaveBeenCalled();
  });

  test('should propagate fetcher errors', async () => {
    // Arrange
    const route = '/api/helper/error';
    const error = new Error('Fetch failed');
    const fetcher = jest.fn().mockRejectedValue(error);

    mockRedisService.get.mockResolvedValue(null);

    // Act & Assert
    await expect(cacheHelper.getOrSet(route, fetcher)).rejects.toThrow('Fetch failed');
  });

  test('should invalidate cache using helper', async () => {
    // Arrange
    mockRedisService.delete.mockResolvedValue(1);

    // Act
    await cacheHelper.invalidate('/api/helper/invalidate');

    // Assert
    expect(mockRedisService.delete).toHaveBeenCalledTimes(2);
  });

  test('should invalidate by tags using helper', async () => {
    // Arrange
    const tags = ['helper', 'test'];
    mockRedisService.get.mockResolvedValue('api:cached:key');
    mockRedisService.delete.mockResolvedValue(1);

    // Act
    const invalidated = await cacheHelper.invalidateByTags(tags);

    // Assert
    expect(invalidated).toBe(2);
  });
});