/**
 * Limbo Game Engine Tests
 * Comprehensive tests for the LimboGame implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { LimboGame } from '../../packages/game-engine/src/games/limbo/LimboGame'
import type { LimboConfig } from '../../packages/shared/src/types/games/limbo'
import { LIMBO_CONSTANTS } from '../../packages/shared/src/constants'

describe('LimboGame', () => {
  let limboGame: LimboGame
  
  beforeEach(() => {
    limboGame = new LimboGame()
  })

  describe('Game Configuration', () => {
    it('should have correct default configuration', () => {
      const config = limboGame.getConfig()
      
      expect(config.minTargetMultiplier).toBe(LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER)
      expect(config.maxTargetMultiplier).toBe(LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER)
      expect(config.houseEdge).toBe(LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE)
      expect(config.minBet).toBe(LIMBO_CONSTANTS.MIN_BET)
      expect(config.maxBet).toBe(LIMBO_CONSTANTS.MAX_BET)
    })

    it('should validate bet amounts correctly', () => {
      expect(limboGame.validateBet(0.01)).toBe(true)
      expect(limboGame.validateBet(100)).toBe(true)
      expect(limboGame.validateBet(1000)).toBe(true)
      
      expect(limboGame.validateBet(0)).toBe(false)
      expect(limboGame.validateBet(0.005)).toBe(false)
      expect(limboGame.validateBet(10001)).toBe(false)
      expect(limboGame.validateBet(-1)).toBe(false)
    })

    it('should validate target multipliers correctly', () => {
      const defaultConfig: LimboConfig = {
        minTargetMultiplier: LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER,
        maxTargetMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER,
        houseEdge: LIMBO_CONSTANTS.DEFAULT_HOUSE_EDGE,
        multiplierPrecision: LIMBO_CONSTANTS.MULTIPLIER_PRECISION,
        quickPresets: [...LIMBO_CONSTANTS.QUICK_PRESETS]
      }
      
      expect(limboGame.validateTargetMultiplier(1.01, 10, defaultConfig).isValid).toBe(true)
      expect(limboGame.validateTargetMultiplier(2.00, 10, defaultConfig).isValid).toBe(true)
      expect(limboGame.validateTargetMultiplier(100.00, 10, defaultConfig).isValid).toBe(true)
      expect(limboGame.validateTargetMultiplier(1000.00, 10, defaultConfig).isValid).toBe(true)
      
      expect(limboGame.validateTargetMultiplier(1.00, 10, defaultConfig).isValid).toBe(false)
      expect(limboGame.validateTargetMultiplier(0.99, 10, defaultConfig).isValid).toBe(false)
      expect(limboGame.validateTargetMultiplier(1000001, 10, defaultConfig).isValid).toBe(false)
      expect(limboGame.validateTargetMultiplier(-1, 10, defaultConfig).isValid).toBe(false)
    })
  })

  describe('Multiplier Generation', () => {
    it('should generate multiplier within valid range', () => {
      const multiplier = limboGame.generateMultiplier({
        serverSeed: 'test-seed',
        clientSeed: 'client-seed',
        nonce: 123,
        houseEdge: 0.01,
        minMultiplier: 1.00,
        maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER
      })
      
      expect(multiplier).toBeGreaterThanOrEqual(1.00)
      expect(multiplier).toBeLessThanOrEqual(LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER)
    })

    it('should generate consistent multipliers for same seeds', () => {
      const params = {
        serverSeed: 'test-server-seed',
        clientSeed: 'test-client-seed',
        nonce: 456,
        houseEdge: 0.01,
        minMultiplier: 1.00,
        maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER
      }
      
      const multiplier1 = limboGame.generateMultiplier(params)
      const multiplier2 = limboGame.generateMultiplier(params)
      
      expect(multiplier1).toBe(multiplier2)
    })

    it('should generate different multipliers for different seeds', () => {
      const baseParams = {
        houseEdge: 0.01,
        minMultiplier: 1.00,
        maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER
      }
      
      const multiplier1 = limboGame.generateMultiplier({
        ...baseParams,
        serverSeed: 'seed1',
        clientSeed: 'client1',
        nonce: 1
      })
      
      const multiplier2 = limboGame.generateMultiplier({
        ...baseParams,
        serverSeed: 'seed2',
        clientSeed: 'client2',
        nonce: 2
      })
      
      expect(multiplier1).not.toBe(multiplier2)
    })

    it('should respect house edge in distribution', () => {
      const samples = 100
      const multipliers: number[] = []
      
      for (let i = 0; i < samples; i++) {
        const multiplier = limboGame.generateMultiplier({
          serverSeed: 'distribution-test',
          clientSeed: 'client-seed',
          nonce: i,
          houseEdge: 0.01,
          minMultiplier: 1.00,
          maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER
        })
        multipliers.push(multiplier)
      }
      
      // Test that we get a variety of multipliers
      const uniqueMultipliers = new Set(multipliers.map(m => Math.floor(m * 100) / 100))
      expect(uniqueMultipliers.size).toBeGreaterThan(10)
      
      // More low multipliers than high multipliers (inverse distribution)
      const lowMultipliers = multipliers.filter(m => m < 2.0).length
      const highMultipliers = multipliers.filter(m => m >= 10.0).length
      expect(lowMultipliers).toBeGreaterThan(highMultipliers)
    })

    it('should handle minimum multiplier correctly', () => {
      const multiplier = limboGame.generateMultiplier({
        serverSeed: 'min-test',
        clientSeed: 'client',
        nonce: 0,
        houseEdge: 0.01,
        minMultiplier: 1.00,
        maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER
      })
      
      expect(multiplier).toBeGreaterThanOrEqual(1.00)
    })
  })

  describe('Win Probability Calculation', () => {
    it('should calculate win probability correctly', () => {
      // 2x target should have ~49.5% win probability (99/2 * 0.99)
      const prob2x = limboGame.calculateWinProbability(2.0, 0.01)
      expect(prob2x).toBeCloseTo(49.5, 1)
      
      // 10x target should have ~9.9% win probability
      const prob10x = limboGame.calculateWinProbability(10.0, 0.01)
      expect(prob10x).toBeCloseTo(9.9, 1)
      
      // 100x target should have ~0.99% win probability  
      const prob100x = limboGame.calculateWinProbability(100.0, 0.01)
      expect(prob100x).toBeCloseTo(0.99, 2)
    })

    it('should handle different house edge values', () => {
      const target = 2.0
      
      const probZeroEdge = limboGame.calculateWinProbability(target, 0)
      const probNormalEdge = limboGame.calculateWinProbability(target, 0.01)
      const probHighEdge = limboGame.calculateWinProbability(target, 0.05)
      
      // Higher house edge should mean lower win probability
      expect(probZeroEdge).toBeGreaterThan(probNormalEdge)
      expect(probNormalEdge).toBeGreaterThan(probHighEdge)
    })
  })

  describe('Complete Game Play', () => {
    it('should play a complete game correctly', async () => {
      const betAmount = 10.0
      const targetMultiplier = 2.0
      const seed = 'test-seed'
      const nonce = 123
      
      const result = await limboGame.play(betAmount, seed, nonce, targetMultiplier)
      
      expect(result.gameType).toBe('limbo')
      expect(result.betAmount).toBe(betAmount)
      expect(result.targetMultiplier).toBe(targetMultiplier)
      expect(result.generatedMultiplier).toBeGreaterThanOrEqual(1.00)
      expect(result.status).toMatch(/^(win|loss)$/)
      expect(result.isWin).toBe(result.status === 'win')
    })

    it('should handle wins correctly', async () => {
      // Test multiple games with low target to increase win chances
      let winFound = false
      
      for (let i = 0; i < 50; i++) {
        const result = await limboGame.play(10, `win-test-${i}`, i, 1.5) // Low target for better win chance
        
        if (result.status === 'win') {
          expect(result.payout).toBeGreaterThan(result.betAmount)
          expect(result.generatedMultiplier).toBeGreaterThanOrEqual(result.targetMultiplier)
          expect(result.isWin).toBe(true)
          winFound = true
          break
        }
      }
      
      expect(winFound).toBe(true)
    })

    it('should handle losses correctly', async () => {
      // Test multiple games with high target to increase loss chances
      let lossFound = false
      
      for (let i = 0; i < 50; i++) {
        const result = await limboGame.play(10, `loss-test-${i}`, i, 100.0) // High target for likely loss
        
        if (result.status === 'loss') {
          expect(result.payout).toBe(0)
          expect(result.generatedMultiplier).toBeLessThan(result.targetMultiplier)
          expect(result.isWin).toBe(false)
          lossFound = true
          break
        }
      }
      
      expect(lossFound).toBe(true)
    })

    it('should reject invalid bet amounts', async () => {
      await expect(limboGame.play(0, 'test', 1, 2.0))
        .rejects.toThrow()
      
      await expect(limboGame.play(10001, 'test', 1, 2.0))
        .rejects.toThrow()
    })

    it('should reject invalid target multipliers', async () => {
      await expect(limboGame.play(10, 'test', 1, 0.99))
        .rejects.toThrow()
      
      await expect(limboGame.play(10, 'test', 1, 1000001))
        .rejects.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum target multiplier', async () => {
      const result = await limboGame.play(10, 'min-target-test', 1, LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER)
      
      expect(result.targetMultiplier).toBe(LIMBO_CONSTANTS.MIN_TARGET_MULTIPLIER)
      expect(result).toBeDefined()
    })

    it('should handle maximum target multiplier', async () => {
      const result = await limboGame.play(10, 'max-target-test', 1, LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER)
      
      expect(result.targetMultiplier).toBe(LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER)
      expect(result).toBeDefined()
    })

    it('should handle very high generated multipliers', async () => {
      // Try multiple seeds to find a high multiplier
      let highMultiplierFound = false
      
      for (let i = 0; i < 100; i++) {
        const result = await limboGame.play(1, `high-mult-test-${i}`, i, 1.01) // Very low target to ensure win
        
        if (result.generatedMultiplier > 10) {
          expect(result.status).toBe('win')
          expect(result.payout).toBeGreaterThan(result.betAmount)
          highMultiplierFound = true
          break
        }
      }
      
      // Should find at least one reasonably high multiplier
      expect(highMultiplierFound).toBe(true)
    })
  })

  describe('Performance Tests', () => {
    it('should generate multipliers efficiently', () => {
      const startTime = performance.now()
      const iterations = 100
      
      for (let i = 0; i < iterations; i++) {
        limboGame.generateMultiplier({
          serverSeed: 'perf-test',
          clientSeed: 'client',
          nonce: i,
          houseEdge: 0.01,
          minMultiplier: 1.00,
          maxMultiplier: LIMBO_CONSTANTS.MAX_TARGET_MULTIPLIER
        })
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      // Should complete 100 generations in reasonable time
      expect(duration).toBeLessThan(1000)
    })

    it('should calculate win probabilities efficiently', () => {
      const startTime = performance.now()
      const iterations = 1000
      
      for (let i = 0; i < iterations; i++) {
        const target = 1.01 + (i * 0.01) // Varying targets
        limboGame.calculateWinProbability(target, 0.01)
      }
      
      const endTime = performance.now()
      const duration = endTime - startTime
      
      expect(duration).toBeLessThan(100)
    })

    it('should handle multiple concurrent games', async () => {
      const startTime = performance.now()
      const promises: Promise<any>[] = []
      
      for (let i = 0; i < 10; i++) {
        promises.push(limboGame.play(10, `concurrent-${i}`, i, 2.0))
      }
      
      const results = await Promise.all(promises)
      const endTime = performance.now()
      
      expect(results).toHaveLength(10)
      expect(endTime - startTime).toBeLessThan(5000)
      
      results.forEach(result => {
        expect(result.gameType).toBe('limbo')
        expect(result.generatedMultiplier).toBeGreaterThanOrEqual(1.0)
      })
    })
  })

  describe('Consistency Tests', () => {
    it('should produce consistent results for same inputs', async () => {
      const betAmount = 10
      const targetMultiplier = 3.0
      const seed = 'consistent-seed'
      const nonce = 42
      
      const result1 = await limboGame.play(betAmount, seed, nonce, targetMultiplier)
      const result2 = await limboGame.play(betAmount, seed, nonce, targetMultiplier)
      
      expect(result1.generatedMultiplier).toBe(result2.generatedMultiplier)
      expect(result1.status).toBe(result2.status)
      expect(result1.payout).toBe(result2.payout)
      expect(result1.isWin).toBe(result2.isWin)
    })

    it('should produce different results with different nonces', async () => {
      const betAmount = 10
      const targetMultiplier = 2.0
      const seed = 'nonce-test-seed'
      
      const results = []
      for (let i = 0; i < 10; i++) {
        const result = await limboGame.play(betAmount, seed, i, targetMultiplier)
        results.push(result.generatedMultiplier)
      }
      
      const uniqueResults = new Set(results)
      expect(uniqueResults.size).toBeGreaterThan(1)
    })
  })

  describe('Configuration Tests', () => {
    it('should handle custom configuration', async () => {
      const config: LimboConfig = {
        minTargetMultiplier: 1.01,
        maxTargetMultiplier: 500.0,
        houseEdge: 0.02,
        multiplierPrecision: 2,
        quickPresets: [2, 5, 10]
      }
      
      const result = await limboGame.play(10, 'config-test', 1, 2.0, config)
      
      expect(result).toBeDefined()
      expect(result.config).toBeDefined()
      expect(result.config.houseEdge).toBe(0.02)
    })

    it('should respect house edge in configuration', async () => {
      const zeroEdgeConfig: LimboConfig = {
        minTargetMultiplier: 1.01,
        maxTargetMultiplier: 1000000,
        houseEdge: 0,
        multiplierPrecision: 2,
        quickPresets: [2, 5, 10]
      }
      
      const highEdgeConfig: LimboConfig = {
        minTargetMultiplier: 1.01,
        maxTargetMultiplier: 1000000,
        houseEdge: 0.05,
        multiplierPrecision: 2,
        quickPresets: [2, 5, 10]
      }
      
      // Same seed/nonce should produce different results with different house edge
      const betAmount = 10
      const targetMultiplier = 2.0
      const seed = 'house-edge-test'
      const nonce = 1
      
      const zeroEdgeResult = await limboGame.play(betAmount, seed, nonce, targetMultiplier, zeroEdgeConfig)
      const highEdgeResult = await limboGame.play(betAmount, seed, nonce, targetMultiplier, highEdgeConfig)
      
      // Results should be different due to house edge affecting generation
      expect(zeroEdgeResult.generatedMultiplier).not.toBe(highEdgeResult.generatedMultiplier)
    })
  })

  describe('Mathematical Properties', () => {
    it('should maintain expected win rate over many games', async () => {
      const targetMultiplier = 4.0 // Should have ~24.75% win rate
      const expectedWinRate = LIMBO_CONSTANTS.WIN_PROBABILITY_NUMERATOR / targetMultiplier * (1 - 0.01)
      const games = 100 // Reasonable sample for testing
      
      let wins = 0
      for (let i = 0; i < games; i++) {
        const result = await limboGame.play(1, 'winrate-test', i, targetMultiplier)
        
        if (result.status === 'win') wins++
      }
      
      const actualWinRate = (wins / games) * 100
      
      // Allow for reasonable variance in small sample
      expect(actualWinRate).toBeGreaterThan(expectedWinRate * 0.5)
      expect(actualWinRate).toBeLessThan(expectedWinRate * 1.5)
    })

    it('should handle extreme multiplier ranges correctly', async () => {
      // Test with very high target
      const highTargetResult = await limboGame.play(10, 'extreme-high', 1, 10000.0)
      
      expect(highTargetResult.targetMultiplier).toBe(10000.0)
      expect(highTargetResult.generatedMultiplier).toBeGreaterThanOrEqual(1.0)
      
      // Very likely to be a loss, but should handle correctly
      if (highTargetResult.status === 'win') {
        expect(highTargetResult.payout).toBe(highTargetResult.betAmount * highTargetResult.targetMultiplier)
      }
    })
  })

  describe('Quick Presets', () => {
    it('should return presets with calculated probabilities', () => {
      const presets = limboGame.getQuickPresets()
      
      expect(presets).toBeDefined()
      expect(presets.length).toBeGreaterThan(0)
      
      presets.forEach(preset => {
        expect(preset.multiplier).toBeGreaterThan(1)
        expect(preset.probability).toBeGreaterThan(0)
        expect(preset.probability).toBeLessThan(100)
      })
    })

    it('should handle custom config presets', () => {
      const customConfig: LimboConfig = {
        minTargetMultiplier: 1.01,
        maxTargetMultiplier: 1000000,
        houseEdge: 0.02,
        multiplierPrecision: 2,
        quickPresets: [1.5, 3.0, 7.5]
      }
      
      const presets = limboGame.getQuickPresets(customConfig)
      
      expect(presets).toHaveLength(3)
      expect(presets[0]?.multiplier).toBe(1.5)
      expect(presets[1]?.multiplier).toBe(3.0)
      expect(presets[2]?.multiplier).toBe(7.5)
    })
  })
})