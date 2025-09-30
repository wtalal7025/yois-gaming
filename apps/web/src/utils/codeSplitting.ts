/**
 * Code Splitting Utilities
 * Advanced code splitting and dynamic imports for optimal bundle loading
 */

import { lazy, ComponentType } from 'react'
import { lazyWithRetry } from './lazyLoading'

/**
 * Game component registry for dynamic imports
 */
const GAME_COMPONENTS = {
  mines: () => import('../components/games/mines/MinesGame'),
  crash: () => import('../components/games/crash/CrashGame'),
  limbo: () => import('../components/games/limbo/LimboGame'),
  'sugar-rush': () => import('../components/games/sugar-rush/SugarRushGame'),
  'dragon-tower': () => import('../components/games/dragon-tower/DragonTowerGame'),
  bars: () => import('../components/games/bars/BarsGame')
} as const

type GameId = keyof typeof GAME_COMPONENTS

/**
 * Route-based component registry for page-level code splitting
 */
const ROUTE_COMPONENTS = {
  // Auth routes
  'auth/login': () => import('../components/auth/LoginModal'),
  'auth/register': () => import('../components/auth/RegisterModal'),
  'auth/profile': () => import('../components/auth/UserProfile'),
  
  // Wallet routes  
  'wallet/deposit': () => import('../components/wallet/DepositModal'),
  'wallet/withdraw': () => import('../components/wallet/WithdrawModal'),
  'wallet/history': () => import('../components/wallet/TransactionHistory'),
  
  // Game routes
  'games/lobby': () => import('../app/games/GamesLobby'),
  
  // Admin/Debug routes
  'debug/performance': () => import('../components/debug/PerformanceDashboard')
} as const

type RouteId = keyof typeof ROUTE_COMPONENTS

/**
 * Preloader class for managing component preloading
 */
export class GamePreloader {
  private static preloadedGames = new Set<GameId>()
  private static preloadedRoutes = new Set<RouteId>()
  private static preloadPromises = new Map<string, Promise<any>>()

  /**
   * Preload a game component
   */
  static async preloadGame(gameId: GameId): Promise<void> {
    if (this.preloadedGames.has(gameId)) {
      return
    }

    const cacheKey = `game-${gameId}`
    if (this.preloadPromises.has(cacheKey)) {
      return this.preloadPromises.get(cacheKey)
    }

    const gameImport = GAME_COMPONENTS[gameId]
    if (!gameImport) {
      console.warn(`Unknown game ID: ${gameId}`)
      return
    }

    const preloadPromise = gameImport()
      .then((component) => {
        this.preloadedGames.add(gameId)
        console.log(`✅ Preloaded game: ${gameId}`)
        return component
      })
      .catch((error) => {
        console.error(`❌ Failed to preload game ${gameId}:`, error)
        throw error
      })

    this.preloadPromises.set(cacheKey, preloadPromise)
    return preloadPromise
  }

  /**
   * Preload a route component
   */
  static async preloadRoute(routeId: RouteId): Promise<void> {
    if (this.preloadedRoutes.has(routeId)) {
      return
    }

    const cacheKey = `route-${routeId}`
    if (this.preloadPromises.has(cacheKey)) {
      return this.preloadPromises.get(cacheKey)
    }

    const routeImport = ROUTE_COMPONENTS[routeId]
    if (!routeImport) {
      console.warn(`Unknown route ID: ${routeId}`)
      return
    }

    const preloadPromise = routeImport()
      .then((component) => {
        this.preloadedRoutes.add(routeId)
        console.log(`✅ Preloaded route: ${routeId}`)
        return component
      })
      .catch((error) => {
        console.error(`❌ Failed to preload route ${routeId}:`, error)
        throw error
      })

    this.preloadPromises.set(cacheKey, preloadPromise)
    return preloadPromise
  }

  /**
   * Preload multiple games based on priority
   */
  static async preloadGamesPriority(games: Array<{ id: GameId; priority: number }>): Promise<void> {
    // Sort by priority (higher number = higher priority)
    const sortedGames = games.sort((a, b) => b.priority - a.priority)
    
    // Preload high priority games first
    const highPriorityGames = sortedGames.filter(g => g.priority >= 3)
    const mediumPriorityGames = sortedGames.filter(g => g.priority === 2)
    const lowPriorityGames = sortedGames.filter(g => g.priority <= 1)

    // Load high priority games immediately
    await Promise.allSettled(
      highPriorityGames.map(game => this.preloadGame(game.id))
    )

    // Load medium priority games with a small delay
    setTimeout(() => {
      Promise.allSettled(
        mediumPriorityGames.map(game => this.preloadGame(game.id))
      )
    }, 1000)

    // Load low priority games with a larger delay
    setTimeout(() => {
      Promise.allSettled(
        lowPriorityGames.map(game => this.preloadGame(game.id))
      )
    }, 3000)
  }

  /**
   * Clear preload cache
   */
  static clearCache(): void {
    this.preloadedGames.clear()
    this.preloadedRoutes.clear()
    this.preloadPromises.clear()
  }

  /**
   * Get preload statistics
   */
  static getStats() {
    return {
      preloadedGames: Array.from(this.preloadedGames),
      preloadedRoutes: Array.from(this.preloadedRoutes),
      totalPreloaded: this.preloadedGames.size + this.preloadedRoutes.size,
      pendingPreloads: this.preloadPromises.size
    }
  }
}

/**
 * Dynamic import utilities with enhanced error handling
 */
export class DynamicImports {
  /**
   * Import game component with retry and error handling
   */
  static gameComponent(gameId: GameId): Promise<ComponentType<any>> {
    const gameImport = GAME_COMPONENTS[gameId]
    if (!gameImport) {
      return Promise.reject(new Error(`Game component not found: ${gameId}`))
    }

    return gameImport()
      .then(module => module.default)
      .catch(error => {
        console.error(`Failed to load game component ${gameId}:`, error)
        throw new Error(`Failed to load ${gameId}. Please check your connection and try again.`)
      })
  }

  /**
   * Import route component with retry and error handling
   */
  static routeComponent(routeId: RouteId): Promise<ComponentType<any>> {
    const routeImport = ROUTE_COMPONENTS[routeId]
    if (!routeImport) {
      return Promise.reject(new Error(`Route component not found: ${routeId}`))
    }

    return routeImport()
      .then(module => module.default)
      .catch(error => {
        console.error(`Failed to load route component ${routeId}:`, error)
        throw new Error(`Failed to load page. Please refresh and try again.`)
      })
  }
}

/**
 * Create lazy-loaded game components with retry mechanism
 */
export const LazyGameComponents = {
  MinesGame: lazyWithRetry(() => GAME_COMPONENTS.mines()),
  CrashGame: lazyWithRetry(() => GAME_COMPONENTS.crash()),
  LimboGame: lazyWithRetry(() => GAME_COMPONENTS.limbo()),
  SugarRushGame: lazyWithRetry(() => GAME_COMPONENTS['sugar-rush']()),
  DragonTowerGame: lazyWithRetry(() => GAME_COMPONENTS['dragon-tower']()),
  BarsGame: lazyWithRetry(() => GAME_COMPONENTS.bars())
}

/**
 * Create lazy-loaded route components with retry mechanism
 */
export const LazyRouteComponents = {
  LoginModal: lazyWithRetry(() => ROUTE_COMPONENTS['auth/login']()),
  RegisterModal: lazyWithRetry(() => ROUTE_COMPONENTS['auth/register']()),
  UserProfile: lazyWithRetry(() => ROUTE_COMPONENTS['auth/profile']()),
  DepositModal: lazyWithRetry(() => ROUTE_COMPONENTS['wallet/deposit']()),
  WithdrawModal: lazyWithRetry(() => ROUTE_COMPONENTS['wallet/withdraw']()),
  TransactionHistory: lazyWithRetry(() => ROUTE_COMPONENTS['wallet/history']()),
  GamesLobby: lazyWithRetry(() => ROUTE_COMPONENTS['games/lobby']()),
  PerformanceDashboard: lazyWithRetry(() => ROUTE_COMPONENTS['debug/performance']())
}

/**
 * Intelligent preloading strategy based on user behavior
 */
export class IntelligentPreloader {
  private static userInteractions = new Map<string, number>()
  private static lastVisited = new Map<string, number>()

  /**
   * Track user interaction with a component
   */
  static trackInteraction(componentId: string): void {
    const current = this.userInteractions.get(componentId) || 0
    this.userInteractions.set(componentId, current + 1)
    this.lastVisited.set(componentId, Date.now())
  }

  /**
   * Get components that should be preloaded based on user behavior
   */
  static getPreloadCandidates(): Array<{ id: string; score: number; type: 'game' | 'route' }> {
    const candidates: Array<{ id: string; score: number; type: 'game' | 'route' }> = []

    // Score games based on interaction frequency and recency
    for (const [id, interactions] of this.userInteractions.entries()) {
      const lastVisit = this.lastVisited.get(id) || 0
      const recencyScore = Math.max(0, 1 - (Date.now() - lastVisit) / (7 * 24 * 60 * 60 * 1000)) // 7 days
      const score = interactions * 0.7 + recencyScore * 0.3

      const type = id.startsWith('game-') ? 'game' : 'route'
      candidates.push({ id: id.replace(/^(game-|route-)/, ''), score, type })
    }

    return candidates.sort((a, b) => b.score - a.score)
  }

  /**
   * Execute intelligent preloading
   */
  static async executeIntelligentPreloading(): Promise<void> {
    const candidates = this.getPreloadCandidates()
    const topCandidates = candidates.slice(0, 5) // Preload top 5

    for (const candidate of topCandidates) {
      try {
        if (candidate.type === 'game') {
          await GamePreloader.preloadGame(candidate.id as GameId)
        } else {
          await GamePreloader.preloadRoute(candidate.id as RouteId)
        }
      } catch (error) {
        console.warn(`Failed to preload ${candidate.id}:`, error)
      }
    }
  }
}

/**
 * Bundle splitting configuration helper
 */
export const bundleConfig = {
  /**
   * Get webpack splitChunks configuration
   */
  getSplitChunksConfig() {
    return {
      chunks: 'all',
      cacheGroups: {
        // Vendor chunk for external libraries
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 20,
          reuseExistingChunk: true
        },
        
        // Games chunk for game-related code
        games: {
          test: /[\\/]components[\\/]games[\\/]/,
          name: 'games',
          priority: 15,
          minChunks: 2,
          reuseExistingChunk: true
        },
        
        // Auth chunk for authentication code
        auth: {
          test: /[\\/]components[\\/]auth[\\/]/,
          name: 'auth',
          priority: 10,
          minChunks: 1,
          reuseExistingChunk: true
        },
        
        // Common chunk for shared utilities
        common: {
          name: 'common',
          priority: 5,
          minChunks: 2,
          reuseExistingChunk: true
        }
      }
    }
  }
}