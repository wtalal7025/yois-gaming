/**
 * Game Registry System
 * Central configuration and metadata for all games in the platform
 */

import type { GameType } from '@yois-games/shared'

/**
 * Game category definitions
 */
export type GameCategory = 'slots' | 'skill' | 'crash' | 'other'

/**
 * Game volatility levels
 */
export type GameVolatility = 'low' | 'medium' | 'high'

/**
 * Comprehensive game information interface
 */
export interface GameInfo {
  id: GameType
  title: string
  description: string
  category: GameCategory
  thumbnail: string
  minBet: number
  maxBet: number
  rtp: number
  volatility: GameVolatility
  features: string[]
  rules: string
  isPopular: boolean
  isNew: boolean
  playerCount?: number
  lastBigWin?: number
}

/**
 * Game metadata registry
 * Contains all information needed for the gaming platform integration
 */
// Reason: Supabase Storage CDN URLs for game thumbnails
const SUPABASE_STORAGE_URL = 'https://aafwiwiknehytaptptek.supabase.co/storage/v1/object/public/game-assets'

export const GAMES_INFO: Record<GameType, GameInfo> = {
  'mines': {
    id: 'mines',
    title: 'Mines',
    description: 'Navigate the minefield and cash out before hitting a mine. The more tiles you reveal, the higher your multiplier!',
    category: 'skill',
    thumbnail: `${SUPABASE_STORAGE_URL}/games/mines-thumbnail.jpg`,
    minBet: 0.01,
    maxBet: 1000,
    rtp: 99,
    volatility: 'medium',
    features: ['Provably Fair', 'Customizable Mines', 'Auto Cash Out', 'Strategy Based'],
    rules: 'Choose the number of mines (1-24) and bet amount. Click tiles to reveal them. Each revealed tile increases your multiplier. Cash out anytime or lose everything if you hit a mine.',
    isPopular: true,
    isNew: false,
    playerCount: 1250,
    lastBigWin: 125.50
  },
  'sugar-rush': {
    id: 'sugar-rush',
    title: 'Sugar Rush',
    description: 'Sweet cascade slot with cluster wins and multipliers. Match symbols to create cascading wins!',
    category: 'slots',
    thumbnail: `${SUPABASE_STORAGE_URL}/games/sugar-rush-thumbnail.jpg`,
    minBet: 0.10,
    maxBet: 500,
    rtp: 96.5,
    volatility: 'high',
    features: ['Cascading Reels', 'Cluster Pays', 'Multipliers', 'Free Spins'],
    rules: 'Land 5 or more matching symbols to form clusters. Winning symbols disappear and new ones cascade down. Multipliers increase with consecutive wins.',
    isPopular: true,
    isNew: false,
    playerCount: 890,
    lastBigWin: 2847.60
  },
  'bars': {
    id: 'bars',
    title: 'Bars',
    description: 'Classic slot machine with traditional symbols. Simple yet rewarding gameplay with multiple paylines.',
    category: 'slots',
    thumbnail: `${SUPABASE_STORAGE_URL}/games/bars-thumbnail.jpg`,
    minBet: 0.05,
    maxBet: 100,
    rtp: 95.8,
    volatility: 'low',
    features: ['Classic Symbols', '5 Paylines', 'Wild Symbols', 'Auto Spin'],
    rules: 'Spin the 3x3 reels and match symbols across 5 paylines. BAR symbols and fruits pay different amounts based on combinations.',
    isPopular: false,
    isNew: false,
    playerCount: 456,
    lastBigWin: 89.25
  },
  'dragon-tower': {
    id: 'dragon-tower',
    title: 'Dragon Tower',
    description: 'Climb the tower and face the dragon! Choose your difficulty and climb higher for bigger rewards.',
    category: 'skill',
    thumbnail: `${SUPABASE_STORAGE_URL}/games/dragon-tower-thumbnail.jpg`,
    minBet: 0.01,
    maxBet: 1000,
    rtp: 99,
    volatility: 'high',
    features: ['4 Difficulty Levels', 'Progressive Multipliers', 'Auto Climb', 'Risk Management'],
    rules: 'Choose difficulty (Easy/Medium/Hard/Expert) affecting tile count per level. Climb 9 levels by selecting safe tiles. Cash out anytime or lose if you pick a trapped tile.',
    isPopular: true,
    isNew: false,
    playerCount: 723,
    lastBigWin: 1456.80
  },
  'crash': {
    id: 'crash',
    title: 'Crash',
    description: 'Watch the multiplier rise and cash out before it crashes! Real-time excitement with provably fair outcomes.',
    category: 'crash',
    thumbnail: `${SUPABASE_STORAGE_URL}/games/crash-thumbnail.jpg`,
    minBet: 0.01,
    maxBet: 5000,
    rtp: 99,
    volatility: 'high',
    features: ['Real-time Multiplier', 'Auto Cash Out', 'Live Player Feed', 'Instant Results'],
    rules: 'Place your bet and watch the multiplier curve rise. Cash out manually or set auto cash-out. The game crashes at a random multiplier - cash out before it crashes to win.',
    isPopular: true,
    isNew: false,
    playerCount: 2103,
    lastBigWin: 9876.40
  },
  'limbo': {
    id: 'limbo',
    title: 'Limbo',
    description: 'Set your target multiplier and see if you can reach it! Simple concept with unlimited potential.',
    category: 'other',
    thumbnail: `${SUPABASE_STORAGE_URL}/games/limbo-thumbnail.jpg`,
    minBet: 0.01,
    maxBet: 10000,
    rtp: 99,
    volatility: 'high',
    features: ['Unlimited Multipliers', 'Target Selection', 'Quick Bets', 'Auto Betting'],
    rules: 'Choose a target multiplier (1.01x to 1,000,000x). The higher the target, the lower the win chance. If the random result meets or exceeds your target, you win.',
    isPopular: false,
    isNew: true,
    playerCount: 334,
    lastBigWin: 15623.30
  }
}

/**
 * Get all games sorted by category
 */
export function getGamesByCategory(): Record<GameCategory | 'all' | 'popular' | 'new', GameInfo[]> {
  const allGames = Object.values(GAMES_INFO)

  return {
    all: allGames,
    popular: allGames.filter(game => game.isPopular),
    new: allGames.filter(game => game.isNew),
    slots: allGames.filter(game => game.category === 'slots'),
    skill: allGames.filter(game => game.category === 'skill'),
    crash: allGames.filter(game => game.category === 'crash'),
    other: allGames.filter(game => game.category === 'other')
  }
}

/**
 * Get game info by ID
 */
export function getGameInfo(gameId: GameType): GameInfo | undefined {
  return GAMES_INFO[gameId]
}

/**
 * Get popular games (most played)
 */
export function getPopularGames(): GameInfo[] {
  return Object.values(GAMES_INFO)
    .filter(game => game.isPopular)
    .sort((a, b) => (b.playerCount || 0) - (a.playerCount || 0))
}

/**
 * Get new games
 */
export function getNewGames(): GameInfo[] {
  return Object.values(GAMES_INFO).filter(game => game.isNew)
}

/**
 * Search games by title or description
 */
export function searchGames(query: string): GameInfo[] {
  const lowercaseQuery = query.toLowerCase()
  return Object.values(GAMES_INFO).filter(game =>
    game.title.toLowerCase().includes(lowercaseQuery) ||
    game.description.toLowerCase().includes(lowercaseQuery) ||
    game.features.some(feature => feature.toLowerCase().includes(lowercaseQuery))
  )
}

/**
 * Get category display name
 */
export function getCategoryDisplayName(category: string): string {
  const categoryNames: Record<string, string> = {
    all: 'All Games',
    popular: 'Popular',
    new: 'New Games',
    slots: 'Slots',
    skill: 'Skill Games',
    crash: 'Crash Games',
    other: 'Other Games'
  }
  return categoryNames[category] || category
}

/**
 * Get total player count across all games
 */
export function getTotalPlayerCount(): number {
  return Object.values(GAMES_INFO).reduce((total, game) => total + (game.playerCount || 0), 0)
}

/**
 * Get highest recent win across all games
 */
export function getHighestRecentWin(): number {
  return Math.max(...Object.values(GAMES_INFO).map(game => game.lastBigWin || 0))
}