'use client'

import React, { Suspense, useState, useEffect } from 'react'
import { Skeleton, Card, CardBody, Button } from '@heroui/react'
import { GamePreloader, DynamicImports } from '../../utils/codeSplitting'
import { useAdaptiveLoading, useComponentPerformance, useLazyLoad } from '../../hooks/usePerformance'
import { LazyImage, GameThumbnail } from '../common/LazyImage'
import { GameInfo } from '../../lib/gameRegistry'

interface OptimizedGameLoaderProps {
  game: GameInfo
  onGameLoad?: (gameId: string) => void
  onError?: (error: Error) => void
  preload?: boolean
  priority?: boolean
}

/**
 * Optimized game loader with adaptive loading and performance monitoring
 */
export function OptimizedGameLoader({
  game,
  onGameLoad,
  onError,
  preload = false,
  priority = false
}: OptimizedGameLoaderProps) {
  const [loadState, setLoadState] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')
  const [GameComponent, setGameComponent] = useState<any>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const { shouldLoadHighQuality, isLowEndDevice } = useAdaptiveLoading()
  const { metrics, logPerformance } = useComponentPerformance(`GameLoader-${game.id}`)
  const { elementRef, isInView } = useLazyLoad<HTMLDivElement>()

  // Preload game on hover for better UX
  const handlePreload = () => {
    if (loadState === 'idle') {
      GamePreloader.preloadGame(game.id)
    }
  }

  // Load game component when in view or when explicitly requested
  useEffect(() => {
    if ((isInView || preload || priority) && loadState === 'idle') {
      loadGameComponent()
    }
  }, [isInView, preload, priority, loadState, game.id])

  const loadGameComponent = async () => {
    setLoadState('loading')

    try {
      const startTime = performance.now()

      // Load game component dynamically
      const Component = await DynamicImports.gameComponent(game.id)
      const loadTime = performance.now() - startTime

      setGameComponent(() => Component)
      setLoadState('loaded')
      onGameLoad?.(game.id)

      if (process.env.NODE_ENV === 'development') {
        console.log(`${game.title} loaded in ${loadTime.toFixed(2)}ms`)
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load game'
      setLoadError(errorMessage)
      setLoadState('error')
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }

  const handleRetry = () => {
    setLoadState('idle')
    setLoadError(null)
    loadGameComponent()
  }

  const renderLoadingState = () => (
    <Card className="w-full max-w-4xl mx-auto">
      <CardBody className="p-6">
        <div className="flex items-center space-x-4">
          <Skeleton className="w-16 h-16 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-2/3" />
        </div>
        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-default-500">
            Loading {game.title}...
            {isLowEndDevice && (
              <span className="ml-2 text-warning-500">
                ⚡ Optimizing for your device
              </span>
            )}
          </div>
          <div className="text-xs text-default-400">
            {metrics.renderCount > 0 && `${metrics.mountTime.toFixed(0)}ms`}
          </div>
        </div>
      </CardBody>
    </Card>
  )

  const renderErrorState = () => (
    <Card className="w-full max-w-4xl mx-auto border-danger">
      <CardBody className="p-6 text-center">
        <div className="w-16 h-16 text-danger mx-auto mb-4 flex items-center justify-center text-4xl">⚠️</div>
        <h3 className="text-lg font-semibold mb-2">Failed to Load Game</h3>
        <p className="text-default-500 mb-4">
          {loadError || 'Something went wrong while loading the game.'}
        </p>
        <div className="space-y-2">
          <Button color="danger" variant="flat" onPress={handleRetry}>
            Try Again
          </Button>
          <p className="text-xs text-default-400">
            If the problem persists, try refreshing the page.
          </p>
        </div>
      </CardBody>
    </Card>
  )

  const renderIdleState = () => (
    <div
      ref={elementRef}
      className="w-full max-w-4xl mx-auto"
      onMouseEnter={handlePreload}
      onFocus={handlePreload}
    >
      <Card className="cursor-pointer hover:scale-102 transition-transform">
        <CardBody className="p-6">
          <div className="flex items-center space-x-4 mb-4">
            <GameThumbnail
              gameId={game.id}
              title={game.title}
              size="sm"
              priority={priority}
            />
            <div>
              <h3 className="text-lg font-semibold">{game.title}</h3>
              <p className="text-sm text-default-500">{game.description}</p>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              <span className="text-xs bg-primary-100 text-primary-600 px-2 py-1 rounded">
                {game.category}
              </span>
              <span className="text-xs bg-default-100 text-default-600 px-2 py-1 rounded">
                RTP: {game.rtp}%
              </span>
            </div>

            <Button
              color="primary"
              size="sm"
              onPress={loadGameComponent}
            >
              Play Now
            </Button>
          </div>

          {!shouldLoadHighQuality && (
            <div className="mt-3 text-xs text-warning-600 flex items-center">
              ⚡ Optimized loading for slower connection
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )

  return (
    <div className="game-loader">
      {loadState === 'loading' && renderLoadingState()}
      {loadState === 'error' && renderErrorState()}
      {loadState === 'idle' && renderIdleState()}
      {loadState === 'loaded' && GameComponent && (
        <Suspense fallback={renderLoadingState()}>
          <div className="game-container">
            <GameComponent />
            {process.env.NODE_ENV === 'development' && (
              <div className="fixed bottom-4 right-4 bg-black/80 text-white text-xs p-2 rounded">
                Performance: {metrics.mountTime.toFixed(1)}ms mount,
                {metrics.renderCount} renders
                <button
                  className="ml-2 underline"
                  onClick={logPerformance}
                >
                  Log Details
                </button>
              </div>
            )}
          </div>
        </Suspense>
      )}
    </div>
  )
}

/**
 * Game loading skeleton for consistent loading states
 */
export function GameLoadingSkeleton({
  title,
  showOptimization = false
}: {
  title?: string
  showOptimization?: boolean
}) {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardBody className="p-6">
        <div className="space-y-4">
          {/* Header skeleton */}
          <div className="flex items-center space-x-4">
            <Skeleton className="w-20 h-14 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-3 w-64" />
            </div>
          </div>

          {/* Game area skeleton */}
          <div className="space-y-3">
            <Skeleton className="h-48 w-full rounded-lg" />
            <div className="flex space-x-2">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-32" />
            </div>
          </div>

          {/* Loading message */}
          <div className="flex justify-between items-center pt-4">
            <div className="text-sm text-default-500">
              {title ? `Loading ${title}...` : 'Loading game...'}
              {showOptimization && (
                <span className="ml-2 text-warning-500">
                  ⚡ Optimizing experience
                </span>
              )}
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </CardBody>
    </Card>
  )
}

/**
 * Error boundary for game loading failures
 */
interface GameLoadingErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class GameLoadingErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error?: Error }> }>,
  GameLoadingErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): GameLoadingErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Game loading error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
      if (FallbackComponent && this.state.error) {
        return <FallbackComponent error={this.state.error} />
      }

      return (
        <Card className="w-full max-w-4xl mx-auto border-danger">
          <CardBody className="p-6 text-center">
            <div className="w-16 h-16 text-danger mx-auto mb-4 flex items-center justify-center text-4xl">⚠️</div>
            <h3 className="text-lg font-semibold mb-2">Game Loading Error</h3>
            <p className="text-default-500 mb-4">
              Something went wrong while loading the game. Please try refreshing the page.
            </p>
            <Button
              color="danger"
              variant="flat"
              onPress={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </CardBody>
        </Card>
      )
    }

    return this.props.children
  }
}