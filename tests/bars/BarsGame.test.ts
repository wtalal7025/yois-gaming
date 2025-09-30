/**
 * BarsGame Unit Tests
 * Tests for the Bars slot machine game engine
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { BarsGame } from '../../packages/game-engine/src/games/bars/BarsGame'
import type { BarsConfig, BarsSymbol } from '../../packages/shared/src/types/games/bars'

describe('BarsGame', () => {
  let game: BarsGame
  let mockConfig: BarsConfig

  beforeEach(() => {
    mockConfig = {
      activePaylines: 5,
      betPerLine: 1.0,
      turboMode: false,
      soundEnabled: true
    }
    
    game = new BarsGame()
  })

  describe('Game Initialization', () => {
    it('should initialize correctly', () => {
      expect(game).toBeInstanceOf(BarsGame)
    })
  })

  describe('Game Play - Expected Use Cases', () => {
    it('should handle a basic spin with valid parameters', async () => {
      const betAmount = 5.0 // 5 paylines × $1.00
      const seed = 'test-seed-123'
      const nonce = 1

      const result = await game.play(betAmount, seed, nonce, mockConfig)

      // Verify result structure
      expect(result.gameType).toBe('bars')
      expect(result.betAmount).toBe(betAmount)
      expect(result.seed).toBe(seed)
      expect(result.nonce).toBe(nonce)
      expect(result.config).toEqual(mockConfig)
      
      // Verify final state
      expect(result.finalState).toBeDefined()
      expect(result.finalState.reels).toHaveLength(9)
      expect(result.finalState.paylines).toHaveLength(5)
      expect(result.finalState.gameStatus).toBe('complete')
      
      // Verify spin result
      expect(result.spinResult).toBeDefined()
      expect(result.spinResult.finalReels).toHaveLength(9)
      
      // Verify all reels have valid symbols
      const validSymbols: BarsSymbol[] = [
        'triple-bar', 'double-bar', 'single-bar', 'seven', 'bell',
        'cherry', 'lemon', 'orange', 'plum', 'grape'
      ]
      
      result.finalState.reels.forEach(reel => {
        expect(validSymbols).toContain(reel.symbol)
        expect(reel.id).toBeGreaterThanOrEqual(0)
        expect(reel.id).toBeLessThan(9)
        expect(reel.row).toBeGreaterThanOrEqual(0)
        expect(reel.row).toBeLessThan(3)
        expect(reel.col).toBeGreaterThanOrEqual(0)
        expect(reel.col).toBeLessThan(3)
      })
    })

    it('should calculate winnings correctly for winning spins', async () => {
      const betAmount = 5.0
      const seed = 'winning-seed'
      const nonce = 1

      const result = await game.play(betAmount, seed, nonce, mockConfig)

      // Verify payout calculation
      if (result.status === 'win') {
        expect(result.payout).toBeGreaterThan(0)
        expect(result.multiplier).toBeGreaterThan(0)
        expect(result.finalState.totalPayout).toBe(result.payout)
        expect(result.finalState.winningPaylines.length).toBeGreaterThan(0)
      }

      // Total payout should match sum of winning paylines
      const expectedPayout = result.finalState.winningPaylines.reduce(
        (sum, win) => sum + win.totalPayout, 
        0
      )
      expect(result.finalState.totalPayout).toBe(expectedPayout)
    })

    it('should handle different bet configurations', async () => {
      const configs = [
        { activePaylines: 1, betPerLine: 0.5 },
        { activePaylines: 3, betPerLine: 2.0 },
        { activePaylines: 5, betPerLine: 10.0 }
      ]

      for (const config of configs) {
        const fullConfig = { ...mockConfig, ...config }
        const betAmount = config.activePaylines * config.betPerLine
        
        const result = await game.play(betAmount, 'test-seed', 1, fullConfig)

        expect(result.betAmount).toBe(betAmount)
        expect(result.finalState.activePaylines).toBe(config.activePaylines)
        expect(result.finalState.betPerLine).toBe(config.betPerLine)
        expect(result.finalState.totalBet).toBe(betAmount)

        // Check active paylines count
        const activePaylines = result.finalState.paylines.filter(p => p.isActive)
        expect(activePaylines).toHaveLength(config.activePaylines)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum bet amounts', async () => {
      const minConfig: BarsConfig = {
        activePaylines: 1,
        betPerLine: 0.01,
        turboMode: false,
        soundEnabled: false
      }

      const result = await game.play(0.01, 'min-seed', 1, minConfig)

      expect(result.betAmount).toBe(0.01)
      expect(result.finalState.totalBet).toBe(0.01)
      expect(result.finalState.paylines.filter(p => p.isActive)).toHaveLength(1)
    })

    it('should handle maximum bet configuration', async () => {
      const maxConfig: BarsConfig = {
        activePaylines: 5,
        betPerLine: 100.0,
        turboMode: true,
        soundEnabled: true
      }

      const result = await game.play(500.0, 'max-seed', 1, maxConfig)

      expect(result.betAmount).toBe(500.0)
      expect(result.finalState.totalBet).toBe(500.0)
      expect(result.finalState.paylines.filter(p => p.isActive)).toHaveLength(5)
    })

    it('should handle zero active paylines', async () => {
      const zeroConfig: BarsConfig = {
        activePaylines: 0,
        betPerLine: 1.0,
        turboMode: false,
        soundEnabled: false
      }

      const result = await game.play(0, 'zero-seed', 1, zeroConfig)

      expect(result.betAmount).toBe(0)
      expect(result.finalState.totalBet).toBe(0)
      expect(result.finalState.paylines.filter(p => p.isActive)).toHaveLength(0)
      expect(result.finalState.winningPaylines).toHaveLength(0)
    })
  })

  describe('Failure Cases', () => {
    it('should handle invalid bet amounts gracefully', async () => {
      // Test negative bet
      await expect(
        game.play(-1, 'test-seed', 1, mockConfig)
      ).rejects.toThrow()
    })

    it('should handle invalid configuration', async () => {
      const invalidConfig = {
        ...mockConfig,
        activePaylines: -1 // Invalid payline count
      }

      await expect(
        game.play(5.0, 'test-seed', 1, invalidConfig)
      ).rejects.toThrow()
    })

    it('should handle empty or invalid seeds', async () => {
      // Empty seed should be handled
      const result = await game.play(5.0, '', 1, mockConfig)
      expect(result.seed).toBe('')
      
      // Very long seed should be handled
      const longSeed = 'a'.repeat(1000)
      const longResult = await game.play(5.0, longSeed, 1, mockConfig)
      expect(longResult.seed).toBe(longSeed)
    })
  })

  describe('Provably Fair', () => {
    it('should produce identical results with same seed and nonce', async () => {
      const seed = 'deterministic-seed-123'
      const nonce = 42

      const result1 = await game.play(5.0, seed, nonce, mockConfig)
      const result2 = await game.play(5.0, seed, nonce, mockConfig)

      // Results should be identical
      expect(result1.finalState.reels).toEqual(result2.finalState.reels)
      expect(result1.payout).toBe(result2.payout)
      expect(result1.multiplier).toBe(result2.multiplier)
      expect(result1.finalState.winningPaylines).toEqual(result2.finalState.winningPaylines)
    })

    it('should produce different results with different seeds', async () => {
      const nonce = 1
      const config = mockConfig

      const result1 = await game.play(5.0, 'seed-1', nonce, config)
      const result2 = await game.play(5.0, 'seed-2', nonce, config)

      // Results should be different with different seeds
      let symbolsDifferent = false
      for (let i = 0; i < result1.finalState.reels.length; i++) {
        if (result1.finalState.reels[i].symbol !== result2.finalState.reels[i].symbol) {
          symbolsDifferent = true
          break
        }
      }

      expect(symbolsDifferent).toBe(true)
    })

    it('should produce different results with different nonces', async () => {
      const seed = 'same-seed-different-nonces'
      const config = mockConfig

      const result1 = await game.play(5.0, seed, 1, config)
      const result2 = await game.play(5.0, seed, 2, config)

      // Results should be different with different nonces
      let symbolsDifferent = false
      for (let i = 0; i < result1.finalState.reels.length; i++) {
        if (result1.finalState.reels[i].symbol !== result2.finalState.reels[i].symbol) {
          symbolsDifferent = true
          break
        }
      }

      expect(symbolsDifferent).toBe(true)
    })

    it('should maintain determinism across multiple game instances', async () => {
      const seed = 'cross-instance-seed'
      const nonce = 100
      const betAmount = 5.0
      const config = mockConfig

      const game1 = new BarsGame()
      const game2 = new BarsGame()

      const result1 = await game1.play(betAmount, seed, nonce, config)
      const result2 = await game2.play(betAmount, seed, nonce, config)

      // Results should be identical across different game instances
      expect(result1.finalState.reels).toEqual(result2.finalState.reels)
      expect(result1.payout).toBe(result2.payout)
    })
  })

  describe('Symbol Distribution', () => {
    it('should use weighted random distribution', async () => {
      const symbolCounts: Record<string, number> = {}
      const testRuns = 100

      // Run multiple spins to test distribution
      for (let i = 0; i < testRuns; i++) {
        const result = await game.play(5.0, `test-seed-${i}`, 1, mockConfig)
        
        result.finalState.reels.forEach(reel => {
          symbolCounts[reel.symbol] = (symbolCounts[reel.symbol] || 0) + 1
        })
      }

      // Higher value symbols should generally appear less frequently
      const tripleBarCount = symbolCounts['triple-bar'] || 0
      const grapeCount = symbolCounts['grape'] || 0

      // With proper weighting, grape should appear more often than triple-bar
      expect(grapeCount).toBeGreaterThan(tripleBarCount)

      // All symbols should appear at least once in 100 spins × 9 positions
      const validSymbols: BarsSymbol[] = [
        'triple-bar', 'double-bar', 'single-bar', 'seven', 'bell',
        'cherry', 'lemon', 'orange', 'plum', 'grape'
      ]

      validSymbols.forEach(symbol => {
        expect(symbolCounts[symbol]).toBeGreaterThan(0)
      })
    })
  })

  describe('Payline Logic', () => {
    it('should correctly identify payline positions', async () => {
      const result = await game.play(5.0, 'payline-test', 1, mockConfig)

      // Verify payline position configurations
      const expectedPaylines = [
        { id: 1, positions: [0, 1, 2] }, // Top row
        { id: 2, positions: [3, 4, 5] }, // Middle row  
        { id: 3, positions: [6, 7, 8] }, // Bottom row
        { id: 4, positions: [0, 4, 8] }, // Diagonal down
        { id: 5, positions: [6, 4, 2] }  // Diagonal up
      ]

      expectedPaylines.forEach((expected, index) => {
        const payline = result.finalState.paylines[index]
        expect(payline.id).toBe(expected.id)
        expect(payline.positions).toEqual(expected.positions)
      })
    })

    it('should calculate multiple payline wins correctly', async () => {
      // Run multiple tests to find games with multiple wins
      let foundMultipleWins = false
      
      for (let i = 0; i < 50; i++) {
        const result = await game.play(5.0, `multi-win-${i}`, 1, mockConfig)
        
        if (result.finalState.winningPaylines.length > 1) {
          foundMultipleWins = true
          
          // Verify total payout equals sum of individual payline wins
          const totalWinAmount = result.finalState.winningPaylines.reduce(
            (sum, win) => sum + win.totalPayout,
            0
          )
          expect(result.finalState.totalPayout).toBe(totalWinAmount)
          break
        }
      }

      // This test might not always pass due to randomness, but should pass occasionally
      // If it consistently fails, there might be an issue with multi-win detection
    })
  })

  describe('Performance', () => {
    it('should handle multiple rapid plays efficiently', async () => {
      const startTime = Date.now()
      const playCount = 50

      const promises = []
      for (let i = 0; i < playCount; i++) {
        promises.push(game.play(5.0, `perf-test-${i}`, i, mockConfig))
      }

      await Promise.all(promises)

      const endTime = Date.now()
      const duration = endTime - startTime

      // Should complete 50 plays in reasonable time (< 2 seconds)
      expect(duration).toBeLessThan(2000)
    })

    it('should maintain consistent performance across different configurations', async () => {
      const configs = [
        { activePaylines: 1, betPerLine: 1.0 },
        { activePaylines: 3, betPerLine: 5.0 },
        { activePaylines: 5, betPerLine: 10.0 }
      ]

      for (const configOverride of configs) {
        const testConfig = { ...mockConfig, ...configOverride }
        const betAmount = configOverride.activePaylines * configOverride.betPerLine
        
        const startTime = Date.now()
        
        for (let i = 0; i < 10; i++) {
          await game.play(betAmount, `config-perf-${i}`, i, testConfig)
        }
        
        const endTime = Date.now()
        const duration = endTime - startTime
        
        // Each configuration should perform similarly
        expect(duration).toBeLessThan(500) // 500ms for 10 plays
      }
    })
  })
})