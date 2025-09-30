/**
 * Redis Service
 * Handles all Redis operations using Upstash Redis for persistent session storage
 * Provides centralized cache management with error handling and fallback mechanisms
 */

import { Redis } from '@upstash/redis'

interface RedisConfig {
  url: string
  token: string
  // Reason: Connection settings for optimal performance and reliability
  retry: {
    attempts: number
    delay: number
  }
  timeout: number
}

interface RedisHealthStatus {
  status: 'connected' | 'disconnected'
  latency?: number
  error?: string
  timestamp: string
  message: string
}

/**
 * Custom error class for Redis operations
 * Reason: Provide detailed error context for debugging and monitoring
 */
class RedisOperationError extends Error {
  public readonly operationName: string
  public readonly originalError: Error | null

  constructor(message: string, operationName: string, originalError: Error | null = null) {
    super(message)
    this.name = 'RedisOperationError'
    this.operationName = operationName
    this.originalError = originalError
    
    // Reason: Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RedisOperationError)
    }
  }
}

export class RedisService {
  private redis: Redis
  private isConnected: boolean = false
  private retryAttempts: number = 3
  private retryDelay: number = 1000
  
  constructor(config: RedisConfig) {
    try {
      this.redis = new Redis({
        url: config.url,
        token: config.token,
        // Reason: Configure automatic retries for network issues
        automaticDeserialization: true,
      })
      
      this.retryAttempts = config.retry.attempts
      this.retryDelay = config.retry.delay
      
      console.log('🔧 RedisService: Initialized with Upstash configuration')
    } catch (error) {
      console.error('❌ RedisService: Initialization failed:', error)
      throw new Error('Failed to initialize Redis service')
    }
  }

  /**
   * Test Redis connection
   * @returns Promise with connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.redis.ping()
      this.isConnected = true
      console.log('✅ RedisService: Connection test successful')
      return true
    } catch (error) {
      console.error('❌ RedisService: Connection test failed:', error)
      this.isConnected = false
      return false
    }
  }

  /**
   * Get value from Redis with automatic retry and fallback
   * @param key - Redis key
   * @returns Promise with value or null
   */
  async get<T = any>(key: string): Promise<T | null> {
    return this.withRetry(async () => {
      const result = await this.redis.get(key)
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔍 RedisService: Retrieved key "${key}"`)
      }
      return result as T | null
    }, true, 'get')
  }

  /**
   * Set value in Redis with TTL
   * @param key - Redis key
   * @param value - Value to store
   * @param ttl - Time to live in seconds (optional)
   * @returns Promise with success status
   */
  async set<T = any>(key: string, value: T, ttl?: number): Promise<boolean> {
    return this.withRetry(async () => {
      try {
        if (ttl) {
          await this.redis.set(key, value, { ex: ttl })
        } else {
          await this.redis.set(key, value)
        }
        console.log(`✅ RedisService: Set key "${key}" with TTL: ${ttl || 'none'}`)
        return true
      } catch (error) {
        console.error(`❌ RedisService: Failed to set key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Delete key from Redis
   * @param key - Redis key
   * @returns Promise with success status
   */
  async delete(key: string): Promise<boolean> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.del(key)
        console.log(`🗑️ RedisService: Deleted key "${key}", result: ${result}`)
        return result > 0
      } catch (error) {
        console.error(`❌ RedisService: Failed to delete key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Check if key exists in Redis
   * @param key - Redis key
   * @returns Promise with existence status
   */
  async exists(key: string): Promise<boolean> {
    return this.withRetry(async () => {
      const result = await this.redis.exists(key)
      return result === 1
    }, true, 'exists')
  }

  /**
   * Increment numeric value in Redis
   * @param key - Redis key
   * @param increment - Amount to increment by (default: 1)
   * @returns Promise with new value
   */
  async increment(key: string, increment: number = 1): Promise<number> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.incrby(key, increment)
        console.log(`📈 RedisService: Incremented key "${key}" by ${increment}, new value: ${result}`)
        return result
      } catch (error) {
        console.error(`❌ RedisService: Failed to increment key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Set hash field value
   * @param key - Redis hash key
   * @param field - Hash field
   * @param value - Field value
   * @returns Promise with success status
   */
  async hset<T = any>(key: string, field: string, value: T): Promise<boolean> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.hset(key, { [field]: value })
        console.log(`✅ RedisService: Set hash field "${field}" in key "${key}"`)
        return result >= 0
      } catch (error) {
        console.error(`❌ RedisService: Failed to set hash field "${field}" in key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Get hash field value
   * @param key - Redis hash key
   * @param field - Hash field
   * @returns Promise with field value or null
   */
  async hget<T = any>(key: string, field: string): Promise<T | null> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.hget(key, field)
        console.log(`🔍 RedisService: Retrieved hash field "${field}" from key "${key}"`)
        return result as T | null
      } catch (error) {
        console.error(`❌ RedisService: Failed to get hash field "${field}" from key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Get all hash fields and values
   * @param key - Redis hash key
   * @returns Promise with hash object
   */
  async hgetall<T = Record<string, any>>(key: string): Promise<T | null> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.hgetall(key)
        console.log(`🔍 RedisService: Retrieved all hash fields from key "${key}"`)
        return result as T | null
      } catch (error) {
        console.error(`❌ RedisService: Failed to get all hash fields from key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Delete hash field
   * @param key - Redis hash key
   * @param field - Hash field to delete
   * @returns Promise with success status
   */
  async hdel(key: string, field: string): Promise<boolean> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.hdel(key, field)
        console.log(`🗑️ RedisService: Deleted hash field "${field}" from key "${key}"`)
        return result > 0
      } catch (error) {
        console.error(`❌ RedisService: Failed to delete hash field "${field}" from key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Set expiry for a key
   * @param key - Redis key
   * @param seconds - Expiry time in seconds
   * @returns Promise with success status
   */
  async expire(key: string, seconds: number): Promise<boolean> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.expire(key, seconds)
        console.log(`⏰ RedisService: Set expiry for key "${key}" to ${seconds} seconds`)
        return result === 1
      } catch (error) {
        console.error(`❌ RedisService: Failed to set expiry for key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Get keys matching a pattern
   * @param pattern - Redis key pattern (e.g., "user:*")
   * @returns Promise with matching keys
   */
  async keys(pattern: string): Promise<string[]> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.keys(pattern)
        console.log(`🔍 RedisService: Found ${result.length} keys matching pattern "${pattern}"`)
        return result
      } catch (error) {
        console.error(`❌ RedisService: Failed to get keys with pattern "${pattern}":`, error)
        throw error
      }
    })
  }

  /**
   * Push element to the head of a list
   * @param key - Redis list key
   * @param value - Value to push
   * @returns Promise with list length after push
   */
  async lPush(key: string, value: string): Promise<number> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.lpush(key, value)
        console.log(`📝 RedisService: Pushed to list "${key}"`)
        return result
      } catch (error) {
        console.error(`❌ RedisService: Failed to push to list "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Get range of elements from a list
   * @param key - Redis list key
   * @param start - Start index
   * @param stop - Stop index
   * @returns Promise with list elements
   */
  async lRange(key: string, start: number, stop: number): Promise<string[]> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.lrange(key, start, stop)
        console.log(`📋 RedisService: Retrieved ${result.length} elements from list "${key}"`)
        return result
      } catch (error) {
        console.error(`❌ RedisService: Failed to get list range from "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Remove elements from a list
   * @param key - Redis list key
   * @param count - Number of elements to remove (0 = all)
   * @param value - Value to remove
   * @returns Promise with number of removed elements
   */
  async lRem(key: string, count: number, value: string): Promise<number> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.lrem(key, count, value)
        console.log(`🗑️ RedisService: Removed ${result} elements from list "${key}"`)
        return result
      } catch (error) {
        console.error(`❌ RedisService: Failed to remove from list "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Delete a key
   * @param key - Redis key to delete
   * @returns Promise with number of deleted keys
   */
  async del(key: string): Promise<number> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.del(key)
        console.log(`🗑️ RedisService: Deleted key "${key}"`)
        return result
      } catch (error) {
        console.error(`❌ RedisService: Failed to delete key "${key}":`, error)
        throw error
      }
    })
  }

  /**
   * Execute multiple operations atomically using pipeline
   * @param operations - Array of Redis operations
   * @returns Promise with results array
   */
  async pipeline(operations: Array<{ command: string; args: any[] }>): Promise<any[]> {
    return this.withRetry(async () => {
      try {
        const pipeline = this.redis.pipeline()
        
        // Reason: Build pipeline with dynamic operations
        operations.forEach(({ command, args }) => {
          (pipeline as any)[command](...args)
        })
        
        const results = await pipeline.exec()
        console.log(`🚀 RedisService: Executed pipeline with ${operations.length} operations`)
        return results
      } catch (error) {
        console.error('❌ RedisService: Pipeline execution failed:', error)
        throw error
      }
    })
  }

  /**
   * Flush all data from Redis (USE WITH CAUTION)
   * @returns Promise with success status
   */
  async flushAll(): Promise<boolean> {
    try {
      await this.redis.flushall()
      console.log('🧹 RedisService: Flushed all Redis data')
      return true
    } catch (error) {
      console.error('❌ RedisService: Failed to flush all data:', error)
      return false
    }
  }

  /**
   * Get Redis info
   * @returns Promise with Redis server information
   */
  async info(): Promise<string> {
    return this.withRetry(async () => {
      try {
        const result = await this.redis.ping() // Upstash doesn't support INFO, use ping as health check
        return 'Upstash Redis connection active'
      } catch (error) {
        console.error('❌ RedisService: Failed to get Redis info:', error)
        throw error
      }
    })
  }

  /**
   * Execute operation with retry logic and fallback mechanisms
   * @param operation - Async operation to execute
   * @param allowFallback - Whether to use fallback for read operations
   * @param operationName - Name of the operation for logging
   * @returns Promise with operation result
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    allowFallback: boolean = false,
    operationName: string = 'unknown'
  ): Promise<T> {
    let lastError: Error | null = null
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Check if it's a connection error
        const isConnectionError = this.isConnectionError(lastError)
        
        if (attempt === this.retryAttempts) {
          console.error(`❌ RedisService: ${operationName} failed after ${this.retryAttempts} attempts:`, lastError)
          
          // Try fallback for read operations if Redis is unavailable
          if (allowFallback && isConnectionError) {
            console.warn(`⚠️ RedisService: Using fallback for ${operationName}`)
            return this.getFallbackValue(operationName) as T
          }
          
          break
        }
        
        // Only retry on connection errors or temporary failures
        if (isConnectionError || lastError.message.includes('timeout')) {
          const backoffDelay = this.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
          console.warn(`⚠️ RedisService: ${operationName} attempt ${attempt} failed, retrying in ${backoffDelay}ms:`, lastError.message)
          await new Promise(resolve => setTimeout(resolve, backoffDelay))
        } else {
          // Non-retryable error, fail immediately
          console.error(`❌ RedisService: ${operationName} failed with non-retryable error:`, lastError)
          break
        }
      }
    }
    
    throw new RedisOperationError(`Redis ${operationName} failed after ${this.retryAttempts} attempts`, operationName, lastError)
  }

  /**
   * Check if error is a connection-related error that should trigger retries
   * @param error - Error to check
   * @returns True if it's a connection error
   */
  private isConnectionError(error: Error): boolean {
    const connectionErrorMessages = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ENOTFOUND',
      'Connection refused',
      'connect ETIMEDOUT',
      'socket hang up',
      'network timeout',
      'connection reset'
    ]
    
    return connectionErrorMessages.some(message =>
      error.message.toLowerCase().includes(message.toLowerCase())
    )
  }

  /**
   * Get fallback value for read operations when Redis is unavailable
   * @param operationName - Name of the failed operation
   * @returns Appropriate fallback value
   */
  private getFallbackValue(operationName: string): any {
    const readOnlyOperations: Record<string, any> = {
      'get': null,
      'hget': null,
      'hgetall': {},
      'lrange': [],
      'exists': false,
      'keys': [],
      'info': 'Redis unavailable - using fallback'
    }

    return readOnlyOperations[operationName.toLowerCase()] ?? null
  }

  /**
   * Health check for Redis connection with detailed status
   * @returns Promise with detailed health status
   */
  async healthCheck(): Promise<RedisHealthStatus> {
    try {
      const startTime = Date.now()
      await this.redis.ping()
      const latency = Date.now() - startTime
      
      this.isConnected = true
      return {
        status: 'connected',
        latency,
        timestamp: new Date().toISOString(),
        message: 'Redis connection healthy'
      }
    } catch (error) {
      this.isConnected = false
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        status: 'disconnected',
        error: errorMessage,
        timestamp: new Date().toISOString(),
        message: 'Redis connection failed'
      }
    }
  }

  /**
   * Execute operation with circuit breaker pattern
   * @param operation - Async operation to execute
   * @param key - Cache key for the operation
   * @returns Promise with operation result
   */
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackValue: T,
    operationName: string = 'operation'
  ): Promise<T> {
    try {
      return await this.withRetry(operation, true, operationName)
    } catch (error) {
      console.warn(`⚠️ RedisService: ${operationName} failed, using fallback value`, { error: error instanceof Error ? error.message : error })
      return fallbackValue
    }
  }

  /**
   * Get connection status
   * @returns Current connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  /**
   * Generate cache key with prefix
   * @param prefix - Key prefix
   * @param identifier - Key identifier
   * @returns Formatted cache key
   */
  generateKey(prefix: string, identifier: string): string {
    return `gaming:${prefix}:${identifier}`
  }

  /**
   * Generate session cache key
   * @param sessionToken - Session token
   * @returns Formatted session cache key
   */
  generateSessionKey(sessionToken: string): string {
    return this.generateKey('session', sessionToken)
  }

  /**
   * Generate balance cache key
   * @param userId - User ID
   * @returns Formatted balance cache key
   */
  generateBalanceKey(userId: string): string {
    return this.generateKey('balance', userId)
  }

  /**
   * Generate transaction cache key
   * @param transactionId - Transaction ID
   * @returns Formatted transaction cache key
   */
  generateTransactionKey(transactionId: string): string {
    return this.generateKey('transaction', transactionId)
  }

  /**
   * Generate user transactions list key
   * @param userId - User ID
   * @returns Formatted user transactions key
   */
  generateUserTransactionsKey(userId: string): string {
    return this.generateKey('user_transactions', userId)
  }
}

// Reason: Create singleton instance for application-wide use
let redisServiceInstance: RedisService | null = null

/**
 * Get or create Redis service instance
 * @param config - Redis configuration (required on first call)
 * @returns Redis service instance
 */
export function getRedisService(config?: RedisConfig): RedisService {
  if (!redisServiceInstance && config) {
    redisServiceInstance = new RedisService(config)
  }
  
  if (!redisServiceInstance) {
    throw new Error('Redis service not initialized. Call with config first.')
  }
  
  return redisServiceInstance
}

/**
 * Initialize Redis service with configuration
 * @param config - Redis configuration
 * @returns Promise with Redis service instance
 */
export async function initializeRedisService(config: RedisConfig): Promise<RedisService> {
  try {
    const redisService = getRedisService(config)
    const isConnected = await redisService.testConnection()
    
    if (!isConnected) {
      throw new Error('Failed to establish Redis connection')
    }
    
    console.log('✅ RedisService: Successfully initialized and connected')
    return redisService
  } catch (error) {
    console.error('❌ RedisService: Initialization failed:', error)
    throw error
  }
}