import { describe, it, expect } from 'vitest'
import { getGameById, getAllGames, getGamesByCategory } from '../../apps/web/src/lib/gameRegistry'

describe('Game Registry Integration', () => {
  describe('getGameById', () => {
    it('should return correct game for valid ID', () => {
      const game = getGameById('mines')
      
      expect(game).toBeDefined()
      expect(game?.id).toBe('mines')
      expect(game?.title).toBe('Mines')
      expect(game?.category).toBe('skill')
      expect(game?.rtp).toBeGreaterThan(0)
      expect(game?.features).toBeInstanceOf(Array)
      expect(game?.features.length).toBeGreaterThan(0)
    })

    it('should return undefined for invalid ID', () => {
      const game = getGameById('nonexistent-game')
      expect(game).toBeUndefined()
    })

    it('should handle empty or null ID gracefully', () => {
      expect(getGameById('')).toBeUndefined()
      expect(getGameById(null as any)).toBeUndefined()
      expect(getGameById(undefined as any)).toBeUndefined()
    })
  })

  describe('getAllGames', () => {
    it('should return all 6 games', () => {
      const games = getAllGames()
      
      expect(games).toHaveLength(6)
      expect(games.map(g => g.id).sort()).toEqual([
        'bars', 'crash', 'dragon-tower', 'limbo', 'mines', 'sugar-rush'
      ])
    })

    it('should return games with consistent structure', () => {
      const games = getAllGames()
      
      games.forEach(game => {
        expect(game).toMatchObject({
          id: expect.any(String),
          title: expect.any(String),
          description: expect.any(String),
          category: expect.stringMatching(/^(slots|skill|crash|other)$/),
          rtp: expect.any(Number),
          volatility: expect.stringMatching(/^(low|medium|high)$/),
          minBet: expect.any(Number),
          maxBet: expect.any(Number),
          features: expect.any(Array),
          rules: expect.any(String)
        })
        
        expect(game.rtp).toBeGreaterThan(0)
        expect(game.rtp).toBeLessThanOrEqual(100)
        expect(game.minBet).toBeGreaterThan(0)
        expect(game.maxBet).toBeGreaterThan(game.minBet)
        expect(game.features.length).toBeGreaterThan(0)
      })
    })

    it('should have unique game IDs', () => {
      const games = getAllGames()
      const ids = games.map(g => g.id)
      const uniqueIds = new Set(ids)
      
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('getGamesByCategory', () => {
    it('should return skill games correctly', () => {
      const skillGames = getGamesByCategory('skill')
      
      expect(skillGames.length).toBeGreaterThan(0)
      skillGames.forEach(game => {
        expect(game.category).toBe('skill')
      })
      
      expect(skillGames.find(g => g.id === 'mines')).toBeDefined()
      expect(skillGames.find(g => g.id === 'dragon-tower')).toBeDefined()
    })

    it('should return slot games correctly', () => {
      const slotGames = getGamesByCategory('slots')
      
      expect(slotGames.length).toBeGreaterThan(0)
      slotGames.forEach(game => {
        expect(game.category).toBe('slots')
      })
      
      expect(slotGames.find(g => g.id === 'sugar-rush')).toBeDefined()
      expect(slotGames.find(g => g.id === 'bars')).toBeDefined()
    })

    it('should return crash games correctly', () => {
      const crashGames = getGamesByCategory('crash')
      
      expect(crashGames.length).toBeGreaterThan(0)
      crashGames.forEach(game => {
        expect(game.category).toBe('crash')
      })
      
      expect(crashGames.find(g => g.id === 'crash')).toBeDefined()
      expect(crashGames.find(g => g.id === 'limbo')).toBeDefined()
    })

    it('should return empty array for invalid category', () => {
      const invalidGames = getGamesByCategory('invalid-category' as any)
      expect(invalidGames).toEqual([])
    })

    it('should handle null/undefined category', () => {
      expect(getGamesByCategory(null as any)).toEqual([])
      expect(getGamesByCategory(undefined as any)).toEqual([])
    })
  })

  describe('Game Data Validation', () => {
    it('should have valid RTP ranges for all games', () => {
      const games = getAllGames()
      
      games.forEach(game => {
        expect(game.rtp).toBeGreaterThanOrEqual(85)
        expect(game.rtp).toBeLessThanOrEqual(99)
      })
    })

    it('should have reasonable bet ranges', () => {
      const games = getAllGames()
      
      games.forEach(game => {
        expect(game.minBet).toBeGreaterThan(0)
        expect(game.minBet).toBeLessThanOrEqual(1)
        expect(game.maxBet).toBeGreaterThanOrEqual(10)
        expect(game.maxBet).toBeLessThanOrEqual(10000)
      })
    })

    it('should have meaningful game descriptions', () => {
      const games = getAllGames()
      
      games.forEach(game => {
        expect(game.description.length).toBeGreaterThan(20)
        expect(game.description.length).toBeLessThan(200)
        expect(game.description).not.toMatch(/lorem ipsum/i)
      })
    })

    it('should have proper game rules', () => {
      const games = getAllGames()
      
      games.forEach(game => {
        expect(game.rules.length).toBeGreaterThan(50)
        expect(game.rules).toMatch(/how to play|objective|goal|win/i)
      })
    })
  })
})