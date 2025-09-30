/**
 * RedisBalanceRepository Tests
 * Comprehensive tests for Redis-based balance operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RedisBalanceRepository } from '../../packages/backend/src/services/wallet/RedisBalanceRepository'
import { getRedisService } from '../../packages/backend/src/services/cache/RedisService'

// Mock Redis service
const mockRedisService = {
  hget: vi.fn(),
  hset: vi.fn(),
  hgetall: vi.fn(),
  hdel: vi.fn(),
  exists: vi.fn(),
  generateBalanceKey: vi.fn(),
  del: vi.fn(),
  executeWithFallback: vi.fn()
}

// Mock getRedisService
vi.mock('../../packages/backend/src/services/cache/RedisService', () => ({
  getRedisService: vi.fn(() => mockRedisService)
}))

describe('RedisBalanceRepository', () => {
  let balanceRepository: RedisBalanceRepository
  const testUserId = 'user123'
  const testBalanceKey = 'gaming:balance:user123'

  beforeEach(() => {
    vi.clearAllMocks()
    balanceRepository = new RedisBalanceRepository()
    mockRedisService.generateBalanceKey.mockReturnValue(testBalanceKey)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Balance Creation', () => {
    it('should create new balance successfully', async () => {
      // Expected use case
      const initialAmount = 100.0
      
      mockRedisService.hset.mockResolvedValue(true)
      
      const result = await balanceRepository.createBalance(testUserId, initialAmount)
      
      expect(result).toEqual({
        userId: testUserId,
        amount: initialAmount,
        currency: 'USD',
        lastUpdated: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
      
      expect(mockRedisService.generateBalanceKey).toHaveBeenCalledWith(testUserId)
      expect(mockRedisService.hset).toHaveBeenCalledWith(
        testBalanceKey,
        'balance',
        expect.stringContaining('"amount":100')
      )
    })

    it('should handle balance creation failure', async () => {
      // Failure case
      mockRedisService.hset.mockRejectedValue(new Error('Redis error'))
      
      await expect(
        balanceRepository.createBalance(testUserId, 100)
      ).rejects.toThrow('Failed to create balance')
    })

    it('should create balance with zero amount', async () => {
      // Edge case
      const initialAmount = 0
      mockRedisService.hset.mockResolvedValue(true)
      
      const result = await balanceRepository.createBalance(testUserId, initialAmount)
      
      expect(result.amount).toBe(0)
    })
  })

  describe('Balance Retrieval', () => {
    it('should get existing balance', async () => {
      // Expected use case
      const mockBalance = {
        userId: testUserId,
        amount: 150.75,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(mockBalance))
      
      const result = await balanceRepository.getBalance(testUserId)
      
      expect(result).toEqual({
        ...mockBalance,
        lastUpdated: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      })
      
      expect(mockRedisService.hget).toHaveBeenCalledWith(testBalanceKey, 'balance')
    })

    it('should return null for non-existent balance', async () => {
      // Edge case
      mockRedisService.hget.mockResolvedValue(null)
      
      const result = await balanceRepository.getBalance(testUserId)
      
      expect(result).toBeNull()
    })

    it('should handle corrupted balance data', async () => {
      // Failure case
      mockRedisService.hget.mockResolvedValue('invalid json')
      
      await expect(
        balanceRepository.getBalance(testUserId)
      ).rejects.toThrow('Failed to get balance')
    })
  })

  describe('Balance Updates', () => {
    it('should update balance with positive amount', async () => {
      // Expected use case - deposit
      const existingBalance = {
        userId: testUserId,
        amount: 100,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const updateAmount = 50
      const transactionId = 'tx456'
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(existingBalance))
      mockRedisService.hset.mockResolvedValue(true)
      
      const result = await balanceRepository.updateBalance(testUserId, updateAmount, transactionId)
      
      expect(result?.amount).toBe(150)
      expect(mockRedisService.hset).toHaveBeenCalledWith(
        testBalanceKey,
        'balance',
        expect.stringContaining('"amount":150')
      )
    })

    it('should update balance with negative amount', async () => {
      // Expected use case - withdrawal
      const existingBalance = {
        userId: testUserId,
        amount: 100,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const updateAmount = -30
      const transactionId = 'tx789'
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(existingBalance))
      mockRedisService.hset.mockResolvedValue(true)
      
      const result = await balanceRepository.updateBalance(testUserId, updateAmount, transactionId)
      
      expect(result?.amount).toBe(70)
    })

    it('should reject update that would create negative balance', async () => {
      // Edge case
      const existingBalance = {
        userId: testUserId,
        amount: 50,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      const updateAmount = -100 // Would result in -50
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(existingBalance))
      
      await expect(
        balanceRepository.updateBalance(testUserId, updateAmount, 'tx999')
      ).rejects.toThrow('Insufficient balance')
    })

    it('should handle update for non-existent balance', async () => {
      // Edge case
      mockRedisService.hget.mockResolvedValue(null)
      
      const result = await balanceRepository.updateBalance(testUserId, 100, 'tx555')
      
      expect(result).toBeNull()
    })
  })

  describe('Balance Validation', () => {
    it('should validate sufficient balance', async () => {
      // Expected use case
      const mockBalance = {
        userId: testUserId,
        amount: 200,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(mockBalance))
      
      const result = await balanceRepository.validateSufficientBalance(testUserId, 150)
      
      expect(result).toBe(true)
    })

    it('should reject insufficient balance', async () => {
      // Edge case
      const mockBalance = {
        userId: testUserId,
        amount: 100,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(mockBalance))
      
      const result = await balanceRepository.validateSufficientBalance(testUserId, 150)
      
      expect(result).toBe(false)
    })

    it('should reject validation for non-existent balance', async () => {
      // Edge case
      mockRedisService.hget.mockResolvedValue(null)
      
      const result = await balanceRepository.validateSufficientBalance(testUserId, 50)
      
      expect(result).toBe(false)
    })

    it('should handle exact balance amount', async () => {
      // Edge case
      const mockBalance = {
        userId: testUserId,
        amount: 100,
        currency: 'USD',
        lastUpdated: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      mockRedisService.hget.mockResolvedValue(JSON.stringify(mockBalance))
      
      const result = await balanceRepository.validateSufficientBalance(testUserId, 100)
      
      expect(result).toBe(true)
    })
  })

  describe('Balance Locking', () => {
    it('should successfully lock balance', async () => {
      // Expected use case
      const result = await balanceRepository.lockBalance(testUserId)
      
      expect(result).toBe(true)
      // Note: This is a simplified implementation that always returns true
      // In production, this would implement actual locking logic
    })

    it('should successfully unlock balance', async () => {
      // Expected use case
      const result = await balanceRepository.unlockBalance(testUserId)
      
      expect(result).toBe(true)
    })
  })


  describe('Error Handling with Fallbacks', () => {
    it('should use fallback for balance retrieval', async () => {
      // Failure case with fallback
      mockRedisService.executeWithFallback.mockResolvedValue(null)
      
      const result = await balanceRepository.getBalance(testUserId)
      
      expect(result).toBeNull()
    })

    it('should handle Redis connection errors gracefully', async () => {
      // Failure case
      mockRedisService.hget.mockRejectedValue(new Error('ECONNREFUSED'))
      
      await expect(
        balanceRepository.getBalance(testUserId)
      ).rejects.toThrow('Failed to get balance')
    })
  })
})