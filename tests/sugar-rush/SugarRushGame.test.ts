/**
 * Sugar Rush Game Engine Tests
 * Tests cluster detection, cascade mechanics, multiplier calculations, and game logic
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { SugarRushGame } from '@stake-games/game-engine/games/sugar-rush/SugarRushGame'
import type { SugarRushConfig } from '@stake-games/shared'

describe('SugarRushGame', () => {
  let game: SugarRushGame
  const testSeed = 'test-seed-123'
  const testNonce = 123456

  beforeEach(() => {
    game = new SugarRushGame()
  })

  describe('Game Configuration', () => {
    it('should have correct default configuration', () => {
      const config = game.getConfig()
      
      expect(config.minBet).toBe(0.01)
      expect(config.maxBet).toBe(1000)
      expect(config.maxMultiplier).toBe(1000)
      expect(config.gridSize).toBe(49) // 7x7
      expect(config.gridWidth).toBe(7)
      expect(config.gridHeight).toBe(7)
      expect(config.minClusterSize).toBe(5)
    })

    it('should validate bet amounts correctly', () => {
      expect(game.validateBet(0.01)).toBe(true) // Minimum bet
      expect(game.validateBet(1000)).toBe(true) // Maximum bet
      expect(game.validateBet(10.50)).toBe(true) // Valid middle amount
      
      expect(game.validateBet(0.001)).toBe(false) // Below minimum
      expect(game.validateBet(1001)).toBe(false) // Above maximum
      expect(game.validateBet(-1)).toBe(false) // Negative amount
    })
  })

  describe('Game Initialization and Basic Play', () => {
    it('should play a complete game round successfully', async () => {
      const betAmount = 1.0
      const config: SugarRushConfig = {
        autoSpin: false,
        turboMode: false,
        soundEnabled: true
      }

      const result = await game.play(betAmount, testSeed, testNonce, config)

      // Verify basic result structure
      expect(result).toBeDefined()
      expect(result.gameType).toBe('sugar-rush')
      expect(result.betAmount).toBe(betAmount)
      expect(result.gameId).toBeDefined()
      expect(result.playerId).toBeDefined()
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.seed).toBe(testSeed)
      expect(result.nonce).toBe(testNonce)
      expect(result.config).toEqual(config)
      
      // Verify game state
      expect(result.finalState).toBeDefined()
      expect(result.finalState.grid).toHaveLength(49) // 7x7 grid
      expect(result.finalState.gameStatus).toBe('complete')
      
      // Verify spin result
      expect(result.spinResult).toBeDefined()
      expect(result.spinResult.initialGrid).toHaveLength(49)
      expect(result.spinResult.finalGrid).toHaveLength(49)
      expect(result.spinResult.cascades).toBeDefined()
      
      // Verify payout logic
      if (result.payout > 0) {
        expect(result.status).toBe('win')
        expect(result.multiplier).toBeGreaterThan(0)
        expect(result.clustersWon.length).toBeGreaterThan(0)
      } else {
        expect(result.status).toBe('loss')
        expect(result.multiplier).toBe(0)
      }
    })

    it('should generate valid 7x7 grid with proper cell structure', async () => {
      const result = await game.play(1.0, testSeed, testNonce)
      const grid = result.finalState.grid

      expect(grid).toHaveLength(49)

      // Check each cell has proper structure
      grid.forEach((cell, index) => {
        expect(cell.id).toBe(index)
        expect(cell.row).toBe(Math.floor(index / 7))
        expect(cell.col).toBe(index % 7)
        expect(cell.symbol).toBeDefined()
        expect(['red-candy', 'orange-candy', 'yellow-candy', 'green-candy', 'blue-candy', 'purple-candy', 'pink-candy', 'wild']).toContain(cell.symbol)
        expect(cell.state).toBeDefined()
        expect(typeof cell.isMatched).toBe('boolean')
      })
    })

    it('should handle invalid configuration gracefully', async () => {
      const invalidConfig = {} as SugarRushConfig

      // Should not throw, should use defaults
      const result = await game.play(1.0, testSeed, testNonce, invalidConfig)
      expect(result).toBeDefined()
    })
  })

  describe('Symbol Generation', () => {
    it('should generate valid symbols with proper distribution', async () => {
      const results = []
      
      // Run multiple games to test symbol distribution
      for (let i = 0; i < 50; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        results.push(result)
      }

      const allSymbols = results.flatMap(r => r.finalState.grid.map(cell => cell.symbol))
      const uniqueSymbols = [...new Set(allSymbols)]

      // Should have variety in symbols generated
      expect(uniqueSymbols.length).toBeGreaterThan(3)
      
      // All symbols should be valid
      uniqueSymbols.forEach(symbol => {
        expect(['red-candy', 'orange-candy', 'yellow-candy', 'green-candy', 'blue-candy', 'purple-candy', 'pink-candy', 'wild']).toContain(symbol)
      })
    })
  })

  describe('Payout and Multiplier Calculations', () => {
    it('should calculate payouts correctly for winning games', async () => {
      // Run multiple games to find wins
      const results = []
      for (let i = 0; i < 100; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        if (result.status === 'win') {
          results.push(result)
        }
        if (results.length >= 5) break // Get at least 5 wins for testing
      }

      results.forEach(result => {
        // Verify win structure
        expect(result.status).toBe('win')
        expect(result.payout).toBeGreaterThan(0)
        expect(result.multiplier).toBeGreaterThan(0)
        expect(result.clustersWon.length).toBeGreaterThan(0)
        
        // Payout should match multiplier * bet
        const expectedPayout = result.betAmount * result.multiplier
        expect(Math.abs(result.payout - expectedPayout)).toBeLessThan(0.01) // Allow for rounding
        
        // Clusters should have valid structure
        result.clustersWon.forEach(cluster => {
          expect(cluster.symbol).toBeDefined()
          expect(cluster.cells).toBeDefined()
          expect(cluster.size).toBeGreaterThanOrEqual(5) // Minimum cluster size
          expect(cluster.payout).toBeGreaterThan(0)
        })
      })
    })

    it('should handle losing games correctly', async () => {
      // Run games to find losses
      const results = []
      for (let i = 0; i < 100; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        if (result.status === 'loss') {
          results.push(result)
        }
        if (results.length >= 5) break
      }

      results.forEach(result => {
        expect(result.status).toBe('loss')
        expect(result.payout).toBe(0)
        expect(result.multiplier).toBe(0)
        expect(result.clustersWon).toHaveLength(0)
      })
    })

    it('should respect maximum multiplier limit', async () => {
      // Test with many games to try to hit edge cases
      for (let i = 0; i < 200; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        
        expect(result.multiplier).toBeLessThanOrEqual(1000) // Max multiplier
        expect(result.spinResult.finalMultiplier).toBeLessThanOrEqual(1000)
      }
    })
  })

  describe('Cascade Mechanics', () => {
    it('should handle cascade levels correctly', async () => {
      // Find games with cascades
      const results = []
      for (let i = 0; i < 150; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        if (result.cascadeLevels > 0) {
          results.push(result)
        }
        if (results.length >= 10) break
      }

      results.forEach(result => {
        expect(result.cascadeLevels).toBeGreaterThan(0)
        expect(result.spinResult.cascades).toHaveLength(result.cascadeLevels)
        
        // Each cascade should have valid structure
        result.spinResult.cascades.forEach((cascade, index) => {
          expect(cascade.level).toBe(index + 1)
          expect(cascade.clustersFound).toBeDefined()
          expect(cascade.totalPayout).toBeGreaterThanOrEqual(0)
          expect(cascade.multiplier).toBeGreaterThan(0)
          expect(cascade.newSymbols).toBeDefined()
        })
      })
    })

    it('should increase multipliers with cascade levels', async () => {
      // Find games with multiple cascades
      const results = []
      for (let i = 0; i < 200; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        if (result.cascadeLevels >= 2) {
          results.push(result)
        }
        if (results.length >= 5) break
      }

      results.forEach(result => {
        const cascades = result.spinResult.cascades
        
        // Multipliers should generally increase with cascade level
        for (let i = 1; i < cascades.length; i++) {
          expect(cascades[i]?.multiplier).toBeGreaterThanOrEqual(cascades[i - 1]?.multiplier || 0)
        }
      })
    })
  })

  describe('Game State Management', () => {
    it('should track game state correctly throughout play', async () => {
      const result = await game.play(1.0, testSeed, testNonce)
      const gameState = result.finalState

      // Verify state tracking
      expect(gameState.gameId).toBeDefined()
      expect(gameState.playerId).toBeDefined()
      expect(gameState.betAmount).toBe(1.0)
      expect(gameState.startTime).toBeInstanceOf(Date)
      expect(gameState.gameStatus).toBe('complete')
      expect(gameState.seed).toBe(testSeed)
      expect(gameState.nonce).toBe(testNonce)
      
      // Verify final state consistency
      if (result.status === 'win') {
        expect(gameState.totalPayout).toBeGreaterThan(0)
        expect(gameState.totalMultiplier).toBeGreaterThan(0)
      } else {
        expect(gameState.totalPayout).toBe(0)
      }
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('should handle minimum bet correctly', async () => {
      const result = await game.play(0.01, testSeed, testNonce)
      
      expect(result.betAmount).toBe(0.01)
      expect(result).toBeDefined()
    })

    it('should handle maximum bet correctly', async () => {
      const result = await game.play(1000, testSeed, testNonce)
      
      expect(result.betAmount).toBe(1000)
      expect(result).toBeDefined()
    })

    it('should handle different seeds consistently', async () => {
      const seed1Result = await game.play(1.0, 'seed1', testNonce)
      const seed2Result = await game.play(1.0, 'seed2', testNonce)
      const seed1Repeat = await game.play(1.0, 'seed1', testNonce)

      // Different seeds should give different results
      expect(seed1Result.finalState.grid).not.toEqual(seed2Result.finalState.grid)
      
      // Same seed should give same result (provably fair)
      expect(seed1Result.finalState.grid).toEqual(seed1Repeat.finalState.grid)
    })

    it('should handle all configuration options', async () => {
      const configs = [
        { autoSpin: true, turboMode: false, soundEnabled: true },
        { autoSpin: false, turboMode: true, soundEnabled: false },
        { autoSpin: true, turboMode: true, soundEnabled: true }
      ]

      for (const config of configs) {
        const result = await game.play(1.0, testSeed, testNonce, config)
        expect(result.config).toEqual(config)
        expect(result).toBeDefined()
      }
    })
  })

  describe('Performance and Safety', () => {
    it('should complete games within reasonable time', async () => {
      const startTime = Date.now()
      
      await game.play(1.0, testSeed, testNonce)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      // Should complete within 5 seconds (very generous limit)
      expect(duration).toBeLessThan(5000)
    })

    it('should not have infinite cascades', async () => {
      // Test multiple games to ensure cascade limits work
      for (let i = 0; i < 50; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        
        // Should never exceed reasonable cascade limit (safety limit is 10)
        expect(result.cascadeLevels).toBeLessThanOrEqual(10)
        expect(result.spinResult.maxCascadeLevel).toBeLessThanOrEqual(10)
      }
    })

    it('should maintain grid integrity throughout cascades', async () => {
      const results = []
      for (let i = 0; i < 50; i++) {
        const result = await game.play(1.0, testSeed, testNonce + i)
        if (result.cascadeLevels > 0) {
          results.push(result)
        }
        if (results.length >= 5) break
      }

      results.forEach(result => {
        // Initial and final grids should always be 7x7
        expect(result.spinResult.initialGrid).toHaveLength(49)
        expect(result.spinResult.finalGrid).toHaveLength(49)
        
        // All cells should have valid positions
        result.spinResult.finalGrid.forEach((cell, index) => {
          expect(cell.row).toBe(Math.floor(index / 7))
          expect(cell.col).toBe(index % 7)
          expect(cell.row).toBeGreaterThanOrEqual(0)
          expect(cell.row).toBeLessThan(7)
          expect(cell.col).toBeGreaterThanOrEqual(0)
          expect(cell.col).toBeLessThan(7)
        })
      })
    })
  })
})