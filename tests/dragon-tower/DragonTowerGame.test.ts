/**
 * Dragon Tower Game Engine Tests
 * Comprehensive tests for the DragonTowerGame implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DragonTowerGame } from '../../packages/game-engine/src/games/dragon-tower/DragonTowerGame'
import type { 
  DragonTowerConfig,
  DragonTowerDifficulty,
  DragonTowerMove
} from '../../packages/shared/src/types/games/dragon-tower'

describe('DragonTowerGame', () => {
  let dragonTowerGame: DragonTowerGame
  
  beforeEach(() => {
    dragonTowerGame = new DragonTowerGame()
  })

  describe('Game Configuration', () => {
    it('should have correct default configuration', () => {
      const config = dragonTowerGame.getConfig()
      
      expect(config.minBet).toBe(0.01)
      expect(config.maxBet).toBe(1000)
      expect(config.maxMultiplier).toBe(50000)
      expect(config.minLevel).toBe(1)
      expect(config.maxLevel).toBe(9)
      expect(config.difficulties).toEqual(['easy', 'medium', 'hard', 'expert'])
    })

    it('should validate bet amounts correctly', () => {
      expect(dragonTowerGame.validateBet(0.01)).toBe(true)
      expect(dragonTowerGame.validateBet(100)).toBe(true)
      expect(dragonTowerGame.validateBet(1000)).toBe(true)
      
      expect(dragonTowerGame.validateBet(0)).toBe(false)
      expect(dragonTowerGame.validateBet(0.005)).toBe(false)
      expect(dragonTowerGame.validateBet(1001)).toBe(false)
      expect(dragonTowerGame.validateBet(-1)).toBe(false)
    })
  })

  describe('Egg Position Generation', () => {
    it('should generate correct number of eggs per level', () => {
      const difficulty: DragonTowerDifficulty = 'easy'
      const eggPositions = dragonTowerGame.generateEggPositions('test-seed', 'client-seed', 123, difficulty)
      
      expect(eggPositions).toHaveLength(9) // 9 levels
      // Each level should have 1 egg position for easy mode (2 tiles, 1 safe, 1 egg)
      eggPositions.forEach((levelEggs, levelIndex) => {
        expect(levelEggs).toHaveLength(1) // 1 egg per level in easy mode
        expect(levelEggs[0]).toBeGreaterThanOrEqual(0)
        expect(levelEggs[0]).toBeLessThan(2) // Easy mode has 2 tiles (0, 1)
      })
    })

    it('should generate different tile counts for different difficulties', () => {
      const difficulties: DragonTowerDifficulty[] = ['easy', 'medium', 'hard', 'expert']
      const expectedTileCounts = [2, 3, 4, 5]
      
      difficulties.forEach((difficulty, index) => {
        const eggPositions = dragonTowerGame.generateEggPositions('test-seed', 'client-seed', 123, difficulty)
        const tileCount = expectedTileCounts[index]!
        
        eggPositions.forEach((levelEggs, levelIndex) => {
          expect(levelEggs).toHaveLength(tileCount - 1) // All tiles except the safe one are eggs
          levelEggs.forEach(eggPos => {
            expect(eggPos).toBeGreaterThanOrEqual(0)
            expect(eggPos).toBeLessThan(tileCount)
          })
        })
      })
    })

    it('should be deterministic with same seed and nonce', () => {
      const difficulty: DragonTowerDifficulty = 'medium'
      const seed = 'test-seed-123'
      const clientSeed = 'client-seed-456'
      const nonce = 789
      
      const positions1 = dragonTowerGame.generateEggPositions(seed, clientSeed, nonce, difficulty)
      const positions2 = dragonTowerGame.generateEggPositions(seed, clientSeed, nonce, difficulty)
      
      expect(positions1).toEqual(positions2)
    })

    it('should produce different results with different seeds', () => {
      const difficulty: DragonTowerDifficulty = 'hard'
      const nonce = 456
      
      const positions1 = dragonTowerGame.generateEggPositions('seed-1', 'client-seed', nonce, difficulty)
      const positions2 = dragonTowerGame.generateEggPositions('seed-2', 'client-seed', nonce, difficulty)
      
      expect(positions1).not.toEqual(positions2)
    })
  })

  describe('Multiplier Calculations', () => {
    it('should calculate correct multipliers for easy difficulty', () => {
      const baseMultiplier = 1.5
      const houseEdge = 0.97
      
      expect(dragonTowerGame.calculateLevelMultiplier(1, 'easy')).toBeCloseTo(baseMultiplier * houseEdge, 4)
      expect(dragonTowerGame.calculateLevelMultiplier(2, 'easy')).toBeCloseTo(Math.pow(baseMultiplier, 2) * houseEdge, 4)
      expect(dragonTowerGame.calculateLevelMultiplier(3, 'easy')).toBeCloseTo(Math.pow(baseMultiplier, 3) * houseEdge, 4)
      expect(dragonTowerGame.calculateLevelMultiplier(9, 'easy')).toBeCloseTo(Math.pow(baseMultiplier, 9) * houseEdge, 4)
    })

    it('should calculate correct multipliers for all difficulties', () => {
      const baseMultipliers = { easy: 1.5, medium: 2, hard: 2.67, expert: 3.33 }
      const houseEdge = 0.97
      
      Object.entries(baseMultipliers).forEach(([difficulty, baseMultiplier]) => {
        const level5Multiplier = dragonTowerGame.calculateLevelMultiplier(5, difficulty as DragonTowerDifficulty)
        const expectedMultiplier = Math.pow(baseMultiplier, 5) * houseEdge
        expect(level5Multiplier).toBeCloseTo(expectedMultiplier, 2)
      })
    })

    it('should return 1 for level 0 or negative levels', () => {
      expect(dragonTowerGame.calculateLevelMultiplier(0, 'easy')).toBe(1)
      expect(dragonTowerGame.calculateLevelMultiplier(-1, 'medium')).toBe(1)
      expect(dragonTowerGame.calculateLevelMultiplier(-5, 'hard')).toBe(1)
    })

    it('should have higher multipliers for harder difficulties', () => {
      const level = 5
      const easyMultiplier = dragonTowerGame.calculateLevelMultiplier(level, 'easy')
      const mediumMultiplier = dragonTowerGame.calculateLevelMultiplier(level, 'medium')
      const hardMultiplier = dragonTowerGame.calculateLevelMultiplier(level, 'hard')
      const expertMultiplier = dragonTowerGame.calculateLevelMultiplier(level, 'expert')
      
      expect(mediumMultiplier).toBeGreaterThan(easyMultiplier)
      expect(hardMultiplier).toBeGreaterThan(mediumMultiplier)
      expect(expertMultiplier).toBeGreaterThan(hardMultiplier)
    })
  })

  describe('Game Flow - Expected Use', () => {
    it('should start a new game correctly', async () => {
      const betAmount = 10
      const config: DragonTowerConfig = { 
        difficulty: 'easy', 
        autoClimb: { enabled: false }
      }
      
      const result = await dragonTowerGame.play(betAmount, 'test-seed', 123, config)
      
      expect(result.gameType).toBe('dragon-tower')
      expect(result.betAmount).toBe(betAmount)
      expect(result.eggPositions).toHaveLength(9)
      expect(result.levelsCompleted).toBe(3) // Auto-demo climbs 3 levels
      expect(result.maxLevelReached).toBeGreaterThanOrEqual(3)
    })

    it('should handle different difficulty levels', async () => {
      const betAmount = 5
      const difficulties: DragonTowerDifficulty[] = ['easy', 'medium', 'hard', 'expert']
      
      for (const difficulty of difficulties) {
        const config: DragonTowerConfig = { 
          difficulty, 
          autoClimb: { enabled: false }
        }
        
        const result = await dragonTowerGame.play(betAmount, 'test-seed', 456, config)
        
        expect(result.gameType).toBe('dragon-tower')
        expect(result.betAmount).toBe(betAmount)
        expect(result.config.difficulty).toBe(difficulty)
        
        // Check that egg positions match the difficulty's tile count
        const expectedEggCount = { easy: 1, medium: 2, hard: 3, expert: 4 }[difficulty]
        result.eggPositions.forEach(levelEggs => {
          expect(levelEggs).toHaveLength(expectedEggCount)
        })
      }
    })
  })

  describe('Game State Processing', () => {
    it('should process tile selection moves correctly', async () => {
      const betAmount = 10
      const config: DragonTowerConfig = { 
        difficulty: 'medium', 
        autoClimb: { enabled: false }
      }
      
      // Start a game to get initial state
      const gameResult = await dragonTowerGame.play(betAmount, 'test-seed', 789, config)
      
      // Extract initial game state from the result
      const initialState = gameResult.finalState
      expect(initialState).toBeDefined()
      
      if (initialState) {
        // Find safe tile for level 1 (index 0 in eggPositions)
        const level1EggPositions = gameResult.eggPositions[0]
        expect(level1EggPositions).toBeDefined()
        
        if (level1EggPositions) {
          const safeTileId = [0, 1, 2].find(tileId => !level1EggPositions.includes(tileId))
          
          expect(safeTileId).toBeDefined()
          
          if (safeTileId !== undefined) {
            const move: DragonTowerMove = {
              type: 'select-tile',
              levelId: 1,
              tileId: safeTileId,
              timestamp: new Date()
            }
            
            const newState = dragonTowerGame.processMove(initialState, move)
            
            expect(newState.currentLevel).toBeGreaterThanOrEqual(initialState.currentLevel)
            expect(newState.potentialPayout).toBeGreaterThanOrEqual(initialState.potentialPayout)
          }
        }
      }
    })

    it('should process cash-out moves correctly', async () => {
      const betAmount = 20
      const config: DragonTowerConfig = { 
        difficulty: 'hard', 
        autoClimb: { enabled: false }
      }
      
      const gameResult = await dragonTowerGame.play(betAmount, 'test-seed', 999, config)
      const initialState = gameResult.finalState
      
      expect(initialState).toBeDefined()
      
      if (initialState) {
        const cashOutMove: DragonTowerMove = {
          type: 'cash-out',
          timestamp: new Date()
        }
        
        const newState = dragonTowerGame.processMove(initialState, cashOutMove)
        
        expect(newState.gameStatus).toBe('cashed-out')
        expect(newState.endTime).toBeDefined()
        expect(newState.canCashOut).toBe(false)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum bet amounts', async () => {
      const betAmount = 0.01
      const config: DragonTowerConfig = { 
        difficulty: 'expert', 
        autoClimb: { enabled: false }
      }
      
      const result = await dragonTowerGame.play(betAmount, 'test-seed', 111, config)
      
      expect(result.betAmount).toBe(betAmount)
      expect(result.gameType).toBe('dragon-tower')
    })

    it('should handle maximum bet amounts', async () => {
      const betAmount = 1000
      const config: DragonTowerConfig = { 
        difficulty: 'medium', 
        autoClimb: { enabled: false }
      }
      
      const result = await dragonTowerGame.play(betAmount, 'test-seed', 222, config)
      
      expect(result.betAmount).toBe(betAmount)
      expect(result.gameType).toBe('dragon-tower')
    })

    it('should handle games with default configuration', async () => {
      const betAmount = 5
      
      // Test without providing config (should use defaults)
      const result = await dragonTowerGame.play(betAmount, 'test-seed', 333)
      
      expect(result.betAmount).toBe(betAmount)
      expect(result.gameType).toBe('dragon-tower')
      expect(result.config.difficulty).toBe('easy') // Default difficulty
    })
  })

  describe('Failure Cases', () => {
    it('should reject invalid bet amounts', async () => {
      const config: DragonTowerConfig = { 
        difficulty: 'easy', 
        autoClimb: { enabled: false }
      }
      
      await expect(dragonTowerGame.play(-1, 'test-seed', 123, config))
        .rejects.toThrow()
      
      await expect(dragonTowerGame.play(0, 'test-seed', 123, config))
        .rejects.toThrow()
      
      await expect(dragonTowerGame.play(1001, 'test-seed', 123, config))
        .rejects.toThrow()
    })

    it('should reject invalid difficulty levels', async () => {
      const config = { 
        difficulty: 'impossible' as DragonTowerDifficulty, 
        autoClimb: { enabled: false }
      }
      
      await expect(dragonTowerGame.play(10, 'test-seed', 123, config))
        .rejects.toThrow()
    })

    it('should handle invalid move operations gracefully', async () => {
      const betAmount = 5
      const config: DragonTowerConfig = { 
        difficulty: 'easy', 
        autoClimb: { enabled: false }
      }
      
      const gameResult = await dragonTowerGame.play(betAmount, 'test-seed', 444, config)
      const initialState = gameResult.finalState
      
      if (initialState) {
        // Try to select invalid tile ID (easy mode only has tiles 0-1)
        const invalidMove: DragonTowerMove = {
          type: 'select-tile',
          levelId: 1,
          tileId: 5, // Invalid tile ID
          timestamp: new Date()
        }
        
        // Should not crash, but return the same state
        const result = dragonTowerGame.processMove(initialState, invalidMove)
        expect(result).toBeDefined()
      }
    })
  })

  describe('Provably Fair Validation', () => {
    it('should generate consistent results for provably fair verification', () => {
      const serverSeed = 'server-seed-12345'
      const clientSeed = 'client-seed-67890'
      const nonce = 12345
      const difficulty: DragonTowerDifficulty = 'medium'
      
      // Generate egg positions multiple times with same parameters
      const positions1 = dragonTowerGame.generateEggPositions(serverSeed, clientSeed, nonce, difficulty)
      const positions2 = dragonTowerGame.generateEggPositions(serverSeed, clientSeed, nonce, difficulty)
      
      expect(positions1).toEqual(positions2)
    })

    it('should generate different results when nonce changes', () => {
      const serverSeed = 'server-seed-test'
      const clientSeed = 'client-seed-test'
      const difficulty: DragonTowerDifficulty = 'hard'
      
      const positions1 = dragonTowerGame.generateEggPositions(serverSeed, clientSeed, 1, difficulty)
      const positions2 = dragonTowerGame.generateEggPositions(serverSeed, clientSeed, 2, difficulty)
      
      expect(positions1).not.toEqual(positions2)
    })
  })

  describe('Performance and Stability', () => {
    it('should handle multiple consecutive games without issues', async () => {
      const betAmount = 1
      const config: DragonTowerConfig = { 
        difficulty: 'easy', 
        autoClimb: { enabled: false }
      }
      
      // Run multiple games in sequence
      for (let i = 0; i < 10; i++) {
        const result = await dragonTowerGame.play(betAmount, `seed-${i}`, i, config)
        expect(result.gameType).toBe('dragon-tower')
        expect(result.betAmount).toBe(betAmount)
      }
    })

    it('should handle all difficulty levels consistently', () => {
      const difficulties: DragonTowerDifficulty[] = ['easy', 'medium', 'hard', 'expert']
      
      difficulties.forEach(difficulty => {
        const eggPositions = dragonTowerGame.generateEggPositions('test', 'test', 1, difficulty)
        expect(eggPositions).toHaveLength(9)
        
        const level5Multiplier = dragonTowerGame.calculateLevelMultiplier(5, difficulty)
        expect(level5Multiplier).toBeGreaterThan(1)
      })
    })
  })
})