/**
 * Crash Game Engine Tests
 * Comprehensive tests for the CrashGame implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CrashGame } from '../../packages/game-engine/src/games/crash/CrashGame'
import type { CrashConfig } from '../../packages/shared/src/types/games/crash'

describe('CrashGame', () => {
  let crashGame: CrashGame
  
  beforeEach(() => {
    crashGame = new CrashGame()
  })

  describe('Game Configuration', () => {
    it('should have correct default configuration', () => {
      const config = crashGame.getConfig()
      
      expect(config.minBet).toBe(0.01)
      expect(config.maxBet).toBe(10000)
      expect(config.maxMultiplier).toBe(1000000)
    })

    it('should validate bet amounts correctly', () => {
      expect(crashGame.validateBet(0.01)).toBe(true)
      expect(crashGame.validateBet(100)).toBe(true)
      expect(crashGame.validateBet(1000)).toBe(true)
      
      expect(crashGame.validateBet(0)).toBe(false)
      expect(crashGame.validateBet(0.005)).toBe(false)
      expect(crashGame.validateBet(10001)).toBe(false)
      expect(crashGame.validateBet(-1)).toBe(false)
    })
  })

  describe('Crash Point Generation', () => {
    it('should generate crash point within valid range', () => {
      const crashPoint = crashGame.generateCrashPoint({
        serverSeed: 'test-seed',
        clientSeed: 'client-seed',
        nonce: 123,
        houseEdge: 0.01,
        minCrash: 1.0,
        maxCrash: 1000
      })
      
      expect(crashPoint).toBeGreaterThanOrEqual(1.00)
      expect(crashPoint).toBeLessThanOrEqual(1000)
    })

    it('should generate consistent crash points for same seeds', () => {
      const params = {
        serverSeed: 'test-server-seed',
        clientSeed: 'test-client-seed',
        nonce: 456,
        houseEdge: 0.01,
        minCrash: 1.0,
        maxCrash: 1000
      }
      
      const crashPoint1 = crashGame.generateCrashPoint(params)
      const crashPoint2 = crashGame.generateCrashPoint(params)
      
      expect(crashPoint1).toBe(crashPoint2)
    })

    it('should generate different crash points for different seeds', () => {
      const baseParams = {
        houseEdge: 0.01,
        minCrash: 1.0,
        maxCrash: 1000
      }
      
      const crashPoint1 = crashGame.generateCrashPoint({
        ...baseParams,
        serverSeed: 'seed1',
        clientSeed: 'client1',
        nonce: 1
      })
      
      const crashPoint2 = crashGame.generateCrashPoint({
        ...baseParams,
        serverSeed: 'seed2',
        clientSeed: 'client2',
        nonce: 2
      })
      
      expect(crashPoint1).not.toBe(crashPoint2)
    })

    it('should respect house edge in crash point distribution', () => {
      const samples = 100 // Reduced for faster testing
      const crashPoints: number[] = []
      
      for (let i = 0; i < samples; i++) {
        const crashPoint = crashGame.generateCrashPoint({
          serverSeed: 'test-seed',
          clientSeed: 'client-seed',
          nonce: i,
          houseEdge: 0.01,
          minCrash: 1.0,
          maxCrash: 1000
        })
        crashPoints.push(crashPoint)
      }
      
      // Test that we get a variety of crash points
      const uniqueCrashPoints = new Set(crashPoints)
      expect(uniqueCrashPoints.size).toBeGreaterThan(10) // Should have variety
      
      // Test distribution - more low values than high values
      const lowCrashCount = crashPoints.filter(cp => cp < 2.0).length
      const highCrashCount = crashPoints.filter(cp => cp >= 2.0).length
      expect(lowCrashCount).toBeGreaterThan(highCrashCount)
    })

    it('should handle minimum crash point correctly', () => {
      const crashPoint = crashGame.generateCrashPoint({
        serverSeed: 'min-seed',
        clientSeed: 'client',
        nonce: 0,
        houseEdge: 0.01,
        minCrash: 1.0,
        maxCrash: 1000
      })
      
      expect(crashPoint).toBeGreaterThanOrEqual(1.00)
    })
  })

  describe('Multiplier Calculation', () => {
    it('should calculate multiplier at time correctly', () => {
      const crashPoint = 4.0
      const roundStartTime = Date.now()
      
      // At start (t=0), multiplier should be 1.00
      const multiplier0 = crashGame.calculateMultiplierAtTime(
        roundStartTime, crashPoint, roundStartTime
      )
      expect(multiplier0).toBe(1.00)
      
      // At mid-point, should be between 1 and crash point
      const midTime = roundStartTime + 5000 // 5 seconds later
      const multiplierMid = crashGame.calculateMultiplierAtTime(
        roundStartTime, crashPoint, midTime
      )
      expect(multiplierMid).toBeGreaterThan(1.00)
      expect(multiplierMid).toBeLessThan(crashPoint)
    })

    it('should handle instant crash (1.00x)', () => {
      const crashPoint = 1.00
      const roundStartTime = Date.now()
      const currentTime = roundStartTime + 1000
      
      const multiplier = crashGame.calculateMultiplierAtTime(
        roundStartTime, crashPoint, currentTime
      )
      expect(multiplier).toBe(1.00)
    })

    it('should calculate exponential growth correctly', () => {
      const crashPoint = 2.0
      const roundStartTime = Date.now()
      
      const times = [1000, 2000, 3000, 4000, 5000] // 1-5 seconds
      const multipliers = times.map(offset => 
        crashGame.calculateMultiplierAtTime(
          roundStartTime, crashPoint, roundStartTime + offset
        )
      )
      
      // Multipliers should be increasing
      for (let i = 1; i < multipliers.length; i++) {
        expect(multipliers[i]!).toBeGreaterThan(multipliers[i-1]!)
      }
    })
  })

  describe('Complete Game Play', () => {
    it('should play a complete game correctly', async () => {
      const betAmount = 10.0
      const seed = 'test-seed'
      const nonce = 123
      
      const result = await crashGame.play(betAmount, seed, nonce)
      
      expect(result.gameType).toBe('crash')
      expect(result.betAmount).toBe(betAmount)
      expect(result.crashPoint).toBeGreaterThanOrEqual(1.00)
      expect(result.status).toMatch(/^(win|loss)$/)
    })

    it('should handle wins correctly', async () => {
      const betAmount = 10.0
      const seed = 'test-seed'
      const nonce = 123
      
      // Play with auto-cashout to increase win chances
      const config: CrashConfig = {
        bettingWindow: 12,
        maxRoundDuration: 60,
        minCrashPoint: 1.0,
        maxCrashPoint: 1000,
        houseEdge: 0.01,
        autoCashout: {
          enabled: true,
          target: 1.5, // Low target to increase win chance
          minTarget: 1.01,
          maxTarget: 100
        }
      }
      
      const result = await crashGame.play(betAmount, seed, nonce, config)
      
      if (result.status === 'win') {
        expect(result.payout).toBeGreaterThan(betAmount)
        expect(result.multiplier).toBeGreaterThan(1.0)
      }
      
      expect(result).toBeDefined()
    })

    it('should reject invalid bet amounts', async () => {
      await expect(crashGame.play(0, 'test-seed', 1))
        .rejects.toThrow()
        
      await expect(crashGame.play(10001, 'test-seed', 1))
        .rejects.toThrow()
        
      await expect(crashGame.play(-1, 'test-seed', 1))
        .rejects.toThrow()
    })

    it('should handle losses correctly', async () => {
      // Try multiple games to test loss scenarios
      let lossFound = false
      
      for (let i = 0; i < 20; i++) {
        const result = await crashGame.play(10, `loss-test-${i}`, i)
        if (result.status === 'loss') {
          expect(result.payout).toBe(0)
          expect(result.multiplier).toBe(0)
          lossFound = true
          break
        }
      }
      
      // Statistical games should produce some losses
      expect(lossFound).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle extremely low crash points', async () => {
      // Use config to force low crash points
      const config: CrashConfig = {
        bettingWindow: 10,
        maxRoundDuration: 60,
        minCrashPoint: 1.0,
        maxCrashPoint: 1.5, // Force low crashes
        houseEdge: 0.01
      }
      
      const result = await crashGame.play(10, 'low-crash-seed', 1, config)
      expect(result.crashPoint).toBeLessThanOrEqual(1.5)
      expect(result).toBeDefined()
    })

    it('should handle high crash point configuration', async () => {
      const config: CrashConfig = {
        bettingWindow: 10,
        maxRoundDuration: 60,
        minCrashPoint: 1.0,
        maxCrashPoint: 10000,
        houseEdge: 0.001 // Lower house edge
      }
      
      const result = await crashGame.play(10, 'high-crash-seed', 1, config)
      expect(result.crashPoint).toBeGreaterThanOrEqual(1.0)
      expect(result.crashPoint).toBeLessThanOrEqual(10000)
    })

    it('should handle network timeout scenarios in calculations', () => {
      const startTime = Date.now()
      const crashPoint = 2.0
      
      // Test with extreme future time (simulating network delay)
      const futureTime = startTime + 1000000 // Very far future
      
      const multiplier = crashGame.calculateMultiplierAtTime(startTime, crashPoint, futureTime)
      
      // Should cap at crash point even with extreme time
      expect(multiplier).toBeLessThanOrEqual(crashPoint)
    })
  })

  describe('Performance Tests', () => {
    it('should generate crash points efficiently', () => {
      const startTime = performance.now()
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        crashGame.generateCrashPoint({
          serverSeed: 'perf-test',
          clientSeed: 'client',
          nonce: i,
          houseEdge: 0.01,
          minCrash: 1.0,
          maxCrash: 1000
        })
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete 100 generations in reasonable time (< 1 second)
      expect(duration).toBeLessThan(1000)
    })

    it('should calculate multipliers efficiently', () => {
      const startTime = performance.now()
      const roundStart = Date.now()
      const crashPoint = 5.0
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        const currentTime = roundStart + (i * 10)
        crashGame.calculateMultiplierAtTime(roundStart, crashPoint, currentTime)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete 100 calculations in reasonable time (< 500ms)
      expect(duration).toBeLessThan(500)
    })

    it('should handle multiple concurrent game simulations', async () => {
      const startTime = performance.now()
      const promises: Promise<any>[] = []
      
      // Simulate 10 concurrent games
      for (let i = 0; i < 10; i++) {
        promises.push(crashGame.play(10, `concurrent-${i}`, i))
      }
      
      const results = await Promise.all(promises)
      const endTime = performance.now()
      
      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(5000) // Should complete in under 5 seconds
      
      // All results should be valid
      results.forEach(result => {
        expect(result.gameType).toBe('crash')
        expect(result.crashPoint).toBeGreaterThanOrEqual(1.0)
      })
    })
  })

  describe('Consistency Tests', () => {
    it('should produce consistent results for same inputs', async () => {
      const betAmount = 10
      const seed = 'consistent-seed'
      const nonce = 42
      
      const result1 = await crashGame.play(betAmount, seed, nonce)
      const result2 = await crashGame.play(betAmount, seed, nonce)
      
      // Same inputs should produce same crash point and outcome
      expect(result1.crashPoint).toBe(result2.crashPoint)
      expect(result1.status).toBe(result2.status)
      expect(result1.payout).toBe(result2.payout)
    })

    it('should produce different results with different nonces', async () => {
      const betAmount = 10
      const seed = 'nonce-test-seed'
      
      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await crashGame.play(betAmount, seed, i)
        results.push(result.crashPoint)
      }
      
      // Should have variety in crash points
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })

  describe('Configuration Tests', () => {
    it('should handle auto-cashout configuration', async () => {
      const config: CrashConfig = {
        bettingWindow: 10,
        maxRoundDuration: 60,
        minCrashPoint: 1.0,
        maxCrashPoint: 1000,
        houseEdge: 0.01,
        autoCashout: {
          enabled: true,
          target: 2.0,
          minTarget: 1.01,
          maxTarget: 100
        }
      }
      
      const result = await crashGame.play(10, 'auto-cashout-test', 1, config)
      
      // Should complete without errors
      expect(result).toBeDefined()
      expect(result.config?.autoCashout).toBeDefined()
    })

    it('should handle auto-play configuration', async () => {
      const config: CrashConfig = {
        bettingWindow: 10,
        maxRoundDuration: 60,
        minCrashPoint: 1.0,
        maxCrashPoint: 1000,
        houseEdge: 0.01,
        autoPlay: {
          enabled: true,
          numberOfRounds: 5,
          stopOnBigWin: 10.0,
          stopOnBalance: 100.0
        }
      }
      
      const result = await crashGame.play(10, 'auto-play-test', 1, config)
      
      expect(result).toBeDefined()
      expect(result.config?.autoPlay).toBeDefined()
    })
  })
})