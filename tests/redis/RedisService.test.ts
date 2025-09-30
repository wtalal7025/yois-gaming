/**
 * RedisService Tests
 * Comprehensive tests for Redis operations with error handling and fallback mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RedisService } from '../../packages/backend/src/services/cache/RedisService'

// Mock Redis instance
const mockRedis = {
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  hget: vi.fn(),
  hset: vi.fn(),
  hgetall: vi.fn(),
  hdel: vi.fn(),
  lrange: vi.fn(),
  lpush: vi.fn(),
  lrem: vi.fn()
}

// Mock Upstash Redis
vi.mock('@upstash/redis', () => ({
  Redis: vi.fn().mockImplementation(() => mockRedis)
}))

describe('RedisService', () => {
  let redisService: RedisService
  const mockConfig = {
    url: 'redis://localhost:6379',
    token: 'test-token',
    retry: { attempts: 3, delay: 100 },
    timeout: 5000
  }

  beforeEach(() => {
    vi.clearAllMocks()
    redisService = new RedisService(mockConfig)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection Management', () => {
    it('should successfully test connection', async () => {
      // Expected use case
      mockRedis.ping.mockResolvedValueOnce('PONG')

      const result = await redisService.testConnection()

      expect(result).toBe(true)
      expect(mockRedis.ping).toHaveBeenCalledTimes(1)
    })

    it('should handle connection failure', async () => {
      // Failure case
      mockRedis.ping.mockRejectedValueOnce(new Error('Connection refused'))

      const result = await redisService.testConnection()

      expect(result).toBe(false)
      expect(mockRedis.ping).toHaveBeenCalledTimes(1)
    })

    it('should provide detailed health check', async () => {
      // Expected use case with latency measurement
      mockRedis.ping.mockResolvedValueOnce('PONG')

      const healthStatus = await redisService.healthCheck()

      expect(healthStatus.status).toBe('connected')
      expect(healthStatus.latency).toBeGreaterThanOrEqual(0)
      expect(healthStatus.timestamp).toBeDefined()
      expect(healthStatus.message).toBe('Redis connection healthy')
    })

    it('should handle health check failure', async () => {
      // Failure case
      const errorMessage = 'Connection timeout'
      mockRedis.ping.mockRejectedValueOnce(new Error(errorMessage))

      const healthStatus = await redisService.healthCheck()

      expect(healthStatus.status).toBe('disconnected')
      expect(healthStatus.error).toBe(errorMessage)
      expect(healthStatus.message).toBe('Redis connection failed')
    })
  })

  describe('Basic Operations', () => {
    it('should successfully get value', async () => {
      // Expected use case
      const testKey = 'test:key'
      const testValue = { id: '123', name: 'test' }
      mockRedis.get.mockResolvedValueOnce(testValue)

      const result = await redisService.get(testKey)

      expect(result).toEqual(testValue)
      expect(mockRedis.get).toHaveBeenCalledWith(testKey)
    })

    it('should return null for non-existent key', async () => {
      // Edge case
      const testKey = 'non:existent'
      mockRedis.get.mockResolvedValueOnce(null)

      const result = await redisService.get(testKey)

      expect(result).toBeNull()
    })

    it('should use fallback for get operation on connection error', async () => {
      // Failure case with fallback
      const testKey = 'test:key'
      mockRedis.get.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await redisService.get(testKey)

      expect(result).toBeNull() // Fallback value
      expect(mockRedis.get).toHaveBeenCalledTimes(3) // Retries
    })

    it('should successfully set value with TTL', async () => {
      // Expected use case
      const testKey = 'test:key'
      const testValue = 'test value'
      const ttl = 3600
      mockRedis.set.mockResolvedValueOnce('OK')

      const result = await redisService.set(testKey, testValue, ttl)

      expect(result).toBe(true)
      expect(mockRedis.set).toHaveBeenCalledWith(testKey, testValue, { ex: ttl })
    })

    it('should successfully set value without TTL', async () => {
      // Expected use case
      const testKey = 'test:key'
      const testValue = 'test value'
      mockRedis.set.mockResolvedValueOnce('OK')

      const result = await redisService.set(testKey, testValue)

      expect(result).toBe(true)
      expect(mockRedis.set).toHaveBeenCalledWith(testKey, testValue)
    })

    it('should check if key exists', async () => {
      // Expected use case
      const testKey = 'test:key'
      mockRedis.exists.mockResolvedValueOnce(1)

      const result = await redisService.exists(testKey)

      expect(result).toBe(true)
    })

    it('should use fallback for exists operation on connection error', async () => {
      // Failure case with fallback
      const testKey = 'test:key'
      mockRedis.exists.mockRejectedValue(new Error('Connection refused'))

      const result = await redisService.exists(testKey)

      expect(result).toBe(false) // Fallback value
    })
  })

  describe('Hash Operations', () => {
    it('should successfully set hash field', async () => {
      // Expected use case
      const testKey = 'test:hash'
      const field = 'balance'
      const value = 100.50
      mockRedis.hset.mockResolvedValueOnce(1)

      const result = await redisService.hset(testKey, field, value)

      expect(result).toBe(true)
      expect(mockRedis.hset).toHaveBeenCalledWith(testKey, { [field]: value })
    })

    it('should successfully get hash field', async () => {
      // Expected use case
      const testKey = 'test:hash'
      const field = 'balance'
      const expectedValue = 100.50
      mockRedis.hget.mockResolvedValueOnce(expectedValue)

      const result = await redisService.hget(testKey, field)

      expect(result).toBe(expectedValue)
    })

    it('should get all hash fields', async () => {
      // Expected use case
      const testKey = 'test:hash'
      const expectedHash = { balance: 100.50, currency: 'USD' }
      mockRedis.hgetall.mockResolvedValueOnce(expectedHash)

      const result = await redisService.hgetall(testKey)

      expect(result).toEqual(expectedHash)
    })

    it('should use fallback for hgetall on connection error', async () => {
      // Failure case with fallback
      const testKey = 'test:hash'
      mockRedis.hgetall.mockRejectedValue(new Error('ETIMEDOUT'))

      const result = await redisService.hgetall(testKey)

      expect(result).toEqual({}) // Fallback value
    })
  })

  describe('List Operations', () => {
    it('should successfully push to list', async () => {
      // Expected use case
      const testKey = 'test:list'
      const value = 'item1'
      mockRedis.lpush.mockResolvedValueOnce(1)

      const result = await redisService.lPush(testKey, value)

      expect(result).toBe(1)
    })

    it('should successfully get list range', async () => {
      // Expected use case
      const testKey = 'test:list'
      const expectedItems = ['item1', 'item2', 'item3']
      mockRedis.lrange.mockResolvedValueOnce(expectedItems)

      const result = await redisService.lRange(testKey, 0, -1)

      expect(result).toEqual(expectedItems)
    })

    it('should use fallback for lrange on connection error', async () => {
      // Failure case with fallback
      const testKey = 'test:list'
      mockRedis.lrange.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await redisService.lRange(testKey, 0, -1)

      expect(result).toEqual([]) // Fallback value
    })
  })

  describe('Error Handling and Retries', () => {
    it('should retry on connection errors', async () => {
      // Edge case - retries then succeeds
      const testKey = 'test:key'
      const testValue = 'success'
      
      mockRedis.get
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockRejectedValueOnce(new Error('ECONNREFUSED'))
        .mockResolvedValueOnce(testValue)

      const result = await redisService.get(testKey)

      expect(result).toBe(testValue)
      expect(mockRedis.get).toHaveBeenCalledTimes(3)
    })

    it('should use exponential backoff for retries', async () => {
      // Edge case - verify retry timing
      const testKey = 'test:key'
      let callTimes: number[] = []
      
      mockRedis.get.mockImplementation(() => {
        callTimes.push(Date.now())
        return Promise.reject(new Error('ECONNREFUSED'))
      })

      try {
        await redisService.get(testKey)
      } catch (error) {
        // Expected to fail after retries
      }

      // Verify we made the expected number of calls
      expect(mockRedis.get).toHaveBeenCalledTimes(3)
      
      // Verify exponential backoff (allowing some variance for test timing)
      if (callTimes.length >= 2 && callTimes[0] !== undefined && callTimes[1] !== undefined) {
        const firstDelay = callTimes[1] - callTimes[0]
        expect(firstDelay).toBeGreaterThanOrEqual(80) // 100ms with some tolerance
      }
    })

    it('should not retry non-connection errors', async () => {
      // Edge case - immediate failure for non-retryable errors
      const testKey = 'test:key'
      mockRedis.set.mockRejectedValue(new Error('Invalid command'))

      await expect(redisService.set(testKey, 'value')).rejects.toThrow()
      expect(mockRedis.set).toHaveBeenCalledTimes(1) // No retries
    })
  })

  describe('Key Generation Utilities', () => {
    it('should generate proper cache keys', () => {
      // Expected use case
      const prefix = 'user'
      const identifier = '12345'
      
      const result = redisService.generateKey(prefix, identifier)
      
      expect(result).toBe('gaming:user:12345')
    })

    it('should generate session keys', () => {
      // Expected use case
      const sessionToken = 'abc123'
      
      const result = redisService.generateSessionKey(sessionToken)
      
      expect(result).toBe('gaming:session:abc123')
    })

    it('should generate balance keys', () => {
      // Expected use case
      const userId = 'user123'
      
      const result = redisService.generateBalanceKey(userId)
      
      expect(result).toBe('gaming:balance:user123')
    })

    it('should generate transaction keys', () => {
      // Expected use case
      const transactionId = 'tx123'
      
      const result = redisService.generateTransactionKey(transactionId)
      
      expect(result).toBe('gaming:transaction:tx123')
    })
  })

  describe('Fallback Mechanisms', () => {
    it('should execute with fallback successfully', async () => {
      // Expected use case
      const operation = vi.fn().mockResolvedValue('success')
      const fallback = 'fallback'

      const result = await redisService.executeWithFallback(operation, fallback, 'test')

      expect(result).toBe('success')
      expect(operation).toHaveBeenCalledTimes(1)
    })

    it('should use fallback on operation failure', async () => {
      // Failure case
      const operation = vi.fn().mockRejectedValue(new Error('Operation failed'))
      const fallback = 'fallback'

      const result = await redisService.executeWithFallback(operation, fallback, 'test')

      expect(result).toBe(fallback)
    })
  })
})