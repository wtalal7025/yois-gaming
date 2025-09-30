/**
 * Game Page Wrapper Component
 * Dynamically loads and renders individual game components
 */

'use client'

import React, { Suspense, lazy } from 'react'
import { ErrorBoundary } from 'react-error-boundary'
import { Spinner } from '@heroui/react'
import { GameContainer } from './GameContainer'
import type { GameType } from '@stake-games/shared'

/**
 * Props for GamePageWrapper component
 */
interface GamePageWrapperProps {
  gameId: GameType
}

/**
 * Lazy load game components for code splitting
 * Reason: Only load the game component when needed to improve performance
 */
const MinesGame = lazy(() => import('../../../components/games/mines/MinesGame').then(m => ({ default: m.MinesGame })))
const SugarRushGame = lazy(() => import('../../../components/games/sugar-rush/SugarRushGame').then(m => ({ default: m.SugarRushGame })))
const BarsGame = lazy(() => import('../../../components/games/bars/BarsGame').then(m => ({ default: m.BarsGame })))
const DragonTowerGame = lazy(() => import('../../../components/games/dragon-tower/DragonTowerGame').then(m => ({ default: m.DragonTowerGame })))
const CrashGame = lazy(() => import('../../../components/games/crash/CrashGame').then(m => ({ default: m.CrashGame })))
const LimboGame = lazy(() => import('../../../components/games/limbo/LimboGame').then(m => ({ default: m.LimboGame })))

/**
 * Game loading fallback component
 */
function GameLoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center space-y-4">
        <Spinner size="lg" color="primary" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">Loading Game...</h3>
          <p className="text-sm text-foreground-600">Preparing your gaming experience</p>
        </div>
      </div>
    </div>
  )
}

/**
 * Game error fallback component
 */
function GameErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <GameContainer gameId="mines"> {/* Default container for error display */}
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-6xl">😵</div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Game Error</h3>
            <p className="text-sm text-foreground-600 mb-4">
              Something went wrong while loading the game. Please try refreshing the page.
            </p>
            <button
              onClick={resetErrorBoundary}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    </GameContainer>
  )
}

/**
 * Get the appropriate game component based on game ID
 * Reason: Maps game IDs to their respective lazy-loaded components
 */
function getGameComponent(gameId: GameType) {
  const gameComponents = {
    'mines': MinesGame,
    'sugar-rush': SugarRushGame,
    'bars': BarsGame,
    'dragon-tower': DragonTowerGame,
    'crash': CrashGame,
    'limbo': LimboGame,
  }

  return gameComponents[gameId]
}

/**
 * Game Page Wrapper component
 * Reason: Handles dynamic loading, error boundaries, and universal game container
 */
export function GamePageWrapper({ gameId }: GamePageWrapperProps) {
  const GameComponent = getGameComponent(gameId)

  if (!GameComponent) {
    return (
      <GameContainer gameId={gameId}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="text-6xl">🎮</div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Game Not Available</h3>
              <p className="text-sm text-foreground-600">
                The game "{gameId}" is not available at the moment.
              </p>
            </div>
          </div>
        </div>
      </GameContainer>
    )
  }

  return (
    <ErrorBoundary
      FallbackComponent={GameErrorFallback}
      onReset={() => window.location.reload()}
    >
      <GameContainer gameId={gameId}>
        <Suspense fallback={<GameLoadingFallback />}>
          <GameComponent />
        </Suspense>
      </GameContainer>
    </ErrorBoundary>
  )
}