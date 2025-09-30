/**
 * Mines Game Engine Tests
 * Comprehensive tests for the MinesGame implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { MinesGame } from '../../packages/game-engine/src/games/mines/MinesGame'
import type { MinesConfig } from '../../packages/shared/src/types/games/mines'

describe('MinesGame', () => {
  let minesGame: MinesGame
  
  beforeEach(() => {
    minesGame = new MinesGame()
  })

  describe('Game Configuration', () => {
    it('should have correct default configuration', () => {
      const config = minesGame.getConfig()
      
      expect(config.minBet).toBe(0.01)
      expect(config.maxBet).toBe(1000)
      expect(config.maxMultiplier).toBe(1000)
      expect(config.minMines).toBe(1)
      expect(config.maxMines).toBe(24)
      expect(config.boardSize).toBe(25)
    })

    it('should validate bet amounts correctly', () => {
      expect(minesGame.validateBet(0.01)).toBe(true)
      expect(minesGame.validateBet(100)).toBe(true)
      expect(minesGame.validateBet(1000)).toBe(true)
      
      expect(minesGame.validateBet(0)).toBe(false)
      expect(minesGame.validateBet(0.005)).toBe(false)
      expect(minesGame.validateBet(1001)).toBe(false)
      expect(minesGame.validateBet(-1)).toBe(false)
    })
  })

  describe('Mine Generation', () => {
    it('should generate correct number of mines', () => {
      const mineCount = 5
      const positions = minesGame.generateMinePositions('test-seed', 'client-seed', 123, mineCount)
      
      expect(positions).toHaveLength(mineCount)
      expect(new Set(positions).size).toBe(mineCount) // All positions should be unique
    })

    it('should generate mines within valid range', () => {
      const positions = minesGame.generateMinePositions('test-seed', 'client-seed', 123, 10)
      
      positions.forEach(position => {
        expect(position).toBeGreaterThanOrEqual(0)
        expect(position).toBeLessThan(25)
      })
    })

    it('should generate different positions with different seeds', () => {
      const positions1 = minesGame.generateMinePositions('seed1', 'client-seed', 123, 5)
      const positions2 = minesGame.generateMinePositions('seed2', 'client-seed', 123, 5)
      
      expect(positions1).not.toEqual(positions2)
    })

    it('should generate same positions with same seed and nonce', () => {
      const positions1 = minesGame.generateMinePositions('test-seed', 'client-seed', 123, 5)
      const positions2 = minesGame.generateMinePositions('test-seed', 'client-seed', 123, 5)
      
      expect(positions1).toEqual(positions2)
    })

    it('should handle maximum mines (24)', () => {
      const positions = minesGame.generateMinePositions('test-seed', 'client-seed', 123, 24)
      
      expect(positions).toHaveLength(24)
      expect(new Set(positions).size).toBe(24)
    })

    it('should handle minimum mines (1)', () => {
      const positions = minesGame.generateMinePositions('test-seed', 'client-seed', 123, 1)
      
      expect(positions).toHaveLength(1)
      expect(positions[0]).toBeGreaterThanOrEqual(0)
      expect(positions[0]).toBeLessThan(25)
    })
  })

  describe('Multiplier Calculation', () => {
    it('should calculate multiplier correctly for basic cases', () => {
      // 3 mines, 1 safe tile revealed
      const multiplier1 = minesGame.calculateMultiplier(1, 3)
      expect(multiplier1).toBeGreaterThan(1)
      
      // More revealed tiles should give higher multiplier
      const multiplier2 = minesGame.calculateMultiplier(2, 3)
      expect(multiplier2).toBeGreaterThan(multiplier1)
    })

    it('should return 1 for no revealed tiles', () => {
      const multiplier = minesGame.calculateMultiplier(0, 3)
      expect(multiplier).toBe(1)
    })

    it('should handle edge case of all safe tiles revealed', () => {
      const multiplier = minesGame.calculateMultiplier(22, 3) // 25 - 3 = 22 safe tiles
      expect(multiplier).toBeGreaterThan(1)
    })

    it('should give higher multipliers for more mines', () => {
      const multiplier3Mines = minesGame.calculateMultiplier(5, 3)
      const multiplier10Mines = minesGame.calculateMultiplier(5, 10)
      
      expect(multiplier10Mines).toBeGreaterThan(multiplier3Mines)
    })

    it('should round to 4 decimal places', () => {
      const multiplier = minesGame.calculateMultiplier(3, 5)
      const decimalPlaces = (multiplier.toString().split('.')[1] || '').length
      
      expect(decimalPlaces).toBeLessThanOrEqual(4)
    })
  })

  describe('Game Play', () => {
    it('should complete a successful game', async () => {
      const betAmount = 10
      const seed = 'test-seed'
      const nonce = 123
      const config: MinesConfig = { mineCount: 3 }
      
      const result = await minesGame.play(betAmount, seed, nonce, config)
      
      expect(result.gameType).toBe('mines')
      expect(result.betAmount).toBe(betAmount)
      expect(result.seed).toBe(seed)
      expect(result.nonce).toBe(nonce)
      expect(result.config).toEqual(config)
      expect(result.minePositions).toHaveLength(3)
      expect(result.finalState.tiles).toHaveLength(25)
    })

    it('should handle different mine counts', async () => {
      const configs = [
        { mineCount: 1 },
        { mineCount: 5 },
        { mineCount: 10 },
        { mineCount: 24 }
      ]
      
      for (const config of configs) {
        const result = await minesGame.play(1, 'test-seed', 123, config)
        
        expect(result.minePositions).toHaveLength(config.mineCount)
        expect(result.config.mineCount).toBe(config.mineCount)
      }
    })

    it('should validate game configuration', async () => {
      const invalidConfig: MinesConfig = { mineCount: 25 } // Too many mines
      
      await expect(
        minesGame.play(1, 'test-seed', 123, invalidConfig)
      ).rejects.toThrow('Invalid game configuration')
    })

    it('should validate bet amount', async () => {
      expect(minesGame.validateBet(0)).toBe(false)
      expect(minesGame.validateBet(-1)).toBe(false)
      expect(minesGame.validateBet(1001)).toBe(false)
    })
  })

  describe('Game State Management', () => {
    it('should initialize game state correctly', async () => {
      const result = await minesGame.play(5, 'test-seed', 123)
      const gameState = result.finalState
      
      expect(gameState.gameId).toBeDefined()
      expect(gameState.betAmount).toBe(5)
      expect(gameState.mineCount).toBe(3)
      expect(gameState.tiles).toHaveLength(25)
      expect(gameState.revealedTiles).toBeInstanceOf(Array)
      expect(gameState.currentMultiplier).toBeGreaterThan(0)
      expect(gameState.startTime).toBeInstanceOf(Date)
      expect(gameState.seed).toBe('test-seed')
      expect(gameState.nonce).toBe(123)
    })

    it('should create tiles with correct structure', async () => {
      const result = await minesGame.play(1, 'test-seed', 123)
      const tiles = result.finalState.tiles
      
      tiles.forEach((tile, index) => {
        expect(tile.id).toBe(index)
        expect(tile.row).toBeGreaterThanOrEqual(0)
        expect(tile.row).toBeLessThan(5)
        expect(tile.col).toBeGreaterThanOrEqual(0)
        expect(tile.col).toBeLessThan(5)
        expect(tile.state).toMatch(/hidden|revealed|flagged/)
        expect(typeof tile.hasMine).toBe('boolean')
        expect(typeof tile.isRevealed).toBe('boolean')
        expect(typeof tile.isFlagged).toBe('boolean')
      })
    })
  })

  describe('Provably Fair', () => {
    it('should generate consistent results with same parameters', async () => {
      const betAmount = 10
      const seed = 'consistent-seed'
      const nonce = 456
      const config: MinesConfig = { mineCount: 5 }
      
      const result1 = await minesGame.play(betAmount, seed, nonce, config)
      const result2 = await minesGame.play(betAmount, seed, nonce, config)
      
      expect(result1.minePositions).toEqual(result2.minePositions)
      expect(result1.finalState.mineCount).toBe(result2.finalState.mineCount)
    })

    it('should generate different results with different nonces', async () => {
      const betAmount = 10
      const seed = 'same-seed'
      const config: MinesConfig = { mineCount: 5 }
      
      const result1 = await minesGame.play(betAmount, seed, 123, config)
      const result2 = await minesGame.play(betAmount, seed, 124, config)
      
      // With high probability, mine positions should be different
      expect(result1.minePositions).not.toEqual(result2.minePositions)
    })
  })

  describe('Edge Cases', () => {
    it('should handle minimum bet amount', async () => {
      const result = await minesGame.play(0.01, 'test-seed', 123)
      expect(result.betAmount).toBe(0.01)
    })

    it('should handle maximum mines', async () => {
      const config: MinesConfig = { mineCount: 24 }
      const result = await minesGame.play(1, 'test-seed', 123, config)
      
      expect(result.minePositions).toHaveLength(24)
      expect(result.finalState.tiles.filter(t => t.hasMine)).toHaveLength(24)
    })

    it('should handle minimum mines', async () => {
      const config: MinesConfig = { mineCount: 1 }
      const result = await minesGame.play(1, 'test-seed', 123, config)
      
      expect(result.minePositions).toHaveLength(1)
      expect(result.finalState.tiles.filter(t => t.hasMine)).toHaveLength(1)
    })
  })

  describe('Game Results', () => {
    it('should have proper result structure', async () => {
      const result = await minesGame.play(10, 'test-seed', 123)
      
      // Check all required fields
      expect(result.gameId).toBeDefined()
      expect(result.gameType).toBe('mines')
      expect(result.playerId).toBeDefined()
      expect(result.betAmount).toBe(10)
      expect(typeof result.multiplier).toBe('number')
      expect(typeof result.payout).toBe('number')
      expect(['win', 'loss', 'push']).toContain(result.status)
      expect(result.timestamp).toBeInstanceOf(Date)
      expect(result.seed).toBe('test-seed')
      expect(result.nonce).toBe(123)
      expect(result.config).toBeDefined()
      expect(result.finalState).toBeDefined()
      expect(result.moves).toBeInstanceOf(Array)
      expect(typeof result.revealedSafeTiles).toBe('number')
      expect(typeof result.hitMine).toBe('boolean')
      expect(result.minePositions).toBeInstanceOf(Array)
    })
  })
})