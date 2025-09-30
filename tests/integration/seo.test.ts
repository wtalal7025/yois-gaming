import { describe, it, expect } from 'vitest'
import { 
  generateGameSEO, 
  generateLobbyGamesSEO, 
  generateHomeSEO,
  generateRobotsTxt,
  generateSitemapXML,
  generateSitemapEntries,
  optimizeMetaDescription,
  generateCanonicalUrl
} from '../../apps/web/src/utils/seo'

// Mock game data for testing
const mockGame = {
  id: 'test-game',
  title: 'Test Game',
  description: 'A fun test game for testing purposes',
  category: 'slots' as const,
  rtp: 96.5,
  volatility: 'medium' as const,
  minBet: 0.1,
  maxBet: 100,
  features: ['autoplay', 'bonus rounds', 'free spins'],
  rules: 'How to play: This is a test game with simple rules for testing SEO functionality.'
}

describe('SEO Utils Integration', () => {
  describe('generateGameSEO', () => {
    it('should generate proper SEO data for a game', () => {
      const seo = generateGameSEO(mockGame, 'https://example.com')
      
      expect(seo.title).toContain(mockGame.title)
      expect(seo.title).toContain('Cheats Gaming')
      expect(seo.description).toContain(mockGame.title)
      expect(seo.description).toContain(mockGame.rtp.toString())
      expect(seo.keywords).toContain(mockGame.title.toLowerCase())
      expect(seo.keywords).toContain(mockGame.category)
      expect(seo.canonical).toBe(`https://example.com/games/${mockGame.id}`)
      expect(seo.ogImage).toContain(mockGame.id)
      expect(seo.structuredData).toBeDefined()
    })

    it('should handle games with different categories', () => {
      const skillGame = { ...mockGame, category: 'skill' as const }
      const crashGame = { ...mockGame, category: 'crash' as const }
      
      const skillSEO = generateGameSEO(skillGame)
      const crashSEO = generateGameSEO(crashGame)
      
      expect(skillSEO.keywords).toContain('skill')
      expect(crashSEO.keywords).toContain('crash')
    })

    it('should work without baseUrl', () => {
      const seo = generateGameSEO(mockGame)
      
      expect(seo.title).toBeDefined()
      expect(seo.description).toBeDefined()
      expect(seo.keywords.length).toBeGreaterThan(0)
    })
  })

  describe('generateLobbyGamesSEO', () => {
    it('should generate proper lobby SEO data', () => {
      const seo = generateLobbyGamesSEO('https://example.com')
      
      expect(seo.title).toContain('Games Lobby')
      expect(seo.title).toContain('Cheats Gaming')
      expect(seo.description).toMatch(/casino games/i)
      expect(seo.keywords).toContain('casino games')
      expect(seo.keywords).toContain('mines')
      expect(seo.canonical).toBe('https://example.com/games')
      expect(seo.structuredData).toBeDefined()
    })

    it('should include all game names in keywords', () => {
      const seo = generateLobbyGamesSEO()
      
      expect(seo.keywords).toContain('mines')
      expect(seo.keywords).toContain('sugar rush')
      expect(seo.keywords).toContain('crash games')
      expect(seo.keywords).toContain('dragon tower')
    })
  })

  describe('generateHomeSEO', () => {
    it('should generate proper home page SEO data', () => {
      const seo = generateHomeSEO('https://example.com')
      
      expect(seo.title).toContain('Cheats Gaming')
      expect(seo.description).toMatch(/online gaming|casino/i)
      expect(seo.keywords).toContain('online casino')
      expect(seo.canonical).toBe('https://example.com')
      expect(seo.structuredData).toBeDefined()
    })
  })

  describe('generateRobotsTxt', () => {
    it('should generate proper robots.txt content', () => {
      const robots = generateRobotsTxt('https://example.com')
      
      expect(robots).toContain('User-agent: *')
      expect(robots).toContain('Allow: /')
      expect(robots).toContain('Allow: /games')
      expect(robots).toContain('Disallow: /api/')
      expect(robots).toContain('Sitemap: https://example.com/sitemap.xml')
    })

    it('should disallow admin and private paths', () => {
      const robots = generateRobotsTxt('https://example.com')
      
      expect(robots).toContain('Disallow: /admin/')
      expect(robots).toContain('Disallow: /_next/')
      expect(robots).toContain('Disallow: /static/')
    })
  })

  describe('generateSitemapEntries', () => {
    it('should generate proper sitemap entries', () => {
      const games = [mockGame]
      const entries = generateSitemapEntries(games, 'https://example.com')
      
      expect(entries.length).toBeGreaterThanOrEqual(3) // Home, games lobby, + game pages
      
      // Check home page entry
      const homeEntry = entries.find(e => e.url === 'https://example.com')
      expect(homeEntry).toBeDefined()
      expect(homeEntry?.priority).toBe(1.0)
      expect(homeEntry?.changeFrequency).toBe('daily')
      
      // Check games lobby entry
      const lobbyEntry = entries.find(e => e.url === 'https://example.com/games')
      expect(lobbyEntry).toBeDefined()
      expect(lobbyEntry?.priority).toBe(0.9)
      
      // Check game page entry
      const gameEntry = entries.find(e => e.url === `https://example.com/games/${mockGame.id}`)
      expect(gameEntry).toBeDefined()
      expect(gameEntry?.priority).toBe(0.8)
      expect(gameEntry?.changeFrequency).toBe('weekly')
    })

    it('should handle multiple games', () => {
      const games = [
        mockGame,
        { ...mockGame, id: 'game2', title: 'Game 2' },
        { ...mockGame, id: 'game3', title: 'Game 3' }
      ]
      const entries = generateSitemapEntries(games, 'https://example.com')
      
      expect(entries.length).toBe(5) // Home + lobby + 3 games
      expect(entries.filter(e => e.url.includes('/games/')).length).toBe(3)
    })
  })

  describe('generateSitemapXML', () => {
    it('should generate valid XML sitemap', () => {
      const entries = [
        {
          url: 'https://example.com',
          lastModified: '2024-01-01T00:00:00.000Z',
          changeFrequency: 'daily' as const,
          priority: 1.0
        },
        {
          url: 'https://example.com/games',
          lastModified: '2024-01-01T00:00:00.000Z',
          changeFrequency: 'weekly' as const,
          priority: 0.8
        }
      ]
      
      const xml = generateSitemapXML(entries)
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(xml).toContain('<url>')
      expect(xml).toContain('<loc>https://example.com</loc>')
      expect(xml).toContain('<lastmod>2024-01-01T00:00:00.000Z</lastmod>')
      expect(xml).toContain('<changefreq>daily</changefreq>')
      expect(xml).toContain('<priority>1.0</priority>')
      expect(xml).toContain('</urlset>')
    })

    it('should handle empty entries array', () => {
      const xml = generateSitemapXML([])
      
      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>')
      expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
      expect(xml).toContain('</urlset>')
    })
  })

  describe('optimizeMetaDescription', () => {
    it('should return description as-is if under limit', () => {
      const shortDesc = 'Short description'
      const result = optimizeMetaDescription(shortDesc, 160)
      
      expect(result).toBe(shortDesc)
    })

    it('should truncate at sentence boundary when possible', () => {
      const longDesc = 'First sentence. Second sentence that makes this very long and exceeds the character limit significantly.'
      const result = optimizeMetaDescription(longDesc, 50)
      
      expect(result).toBe('First sentence.')
      expect(result.length).toBeLessThanOrEqual(50)
    })

    it('should truncate at word boundary if no sentence boundary', () => {
      const longDesc = 'This is a very long description without proper sentence endings that needs to be truncated'
      const result = optimizeMetaDescription(longDesc, 30)
      
      expect(result).toContain('...')
      expect(result.length).toBeLessThanOrEqual(33) // 30 + '...'
      expect(result).not.toMatch(/\s$/) // Should not end with space
    })

    it('should use default maxLength of 160', () => {
      const longDesc = 'A'.repeat(200)
      const result = optimizeMetaDescription(longDesc)
      
      expect(result.length).toBeLessThanOrEqual(160)
    })
  })

  describe('generateCanonicalUrl', () => {
    it('should generate proper canonical URL', () => {
      const url = generateCanonicalUrl('games', 'https://example.com')
      expect(url).toBe('https://example.com/games')
    })

    it('should handle paths with leading slash', () => {
      const url = generateCanonicalUrl('/games', 'https://example.com')
      expect(url).toBe('https://example.com/games')
    })

    it('should include important parameters', () => {
      const params = { category: 'slots', sort: 'popular', utm_source: 'google' }
      const url = generateCanonicalUrl('games', 'https://example.com', params)
      
      expect(url).toContain('category=slots')
      expect(url).toContain('sort=popular')
      expect(url).not.toContain('utm_source') // Should exclude tracking params
    })

    it('should handle empty parameters', () => {
      const url = generateCanonicalUrl('games', 'https://example.com', {})
      expect(url).toBe('https://example.com/games')
    })
  })
})