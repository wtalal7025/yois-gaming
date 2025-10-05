'use client'

import { useState, useEffect } from 'react'
import { Card, CardBody, CardHeader, Button, Progress, Chip } from '@heroui/react'
import {
  usePerformance,
  useBundlePerformance,
  useAdaptiveLoading
} from '../../hooks/usePerformance'
import { GamePreloader } from '../../utils/codeSplitting'
import { memoryUtils, getNetworkInfo } from '../../utils/lazyLoading'

/**
 * Performance dashboard for development and debugging
 * Only shows in development mode
 */
export function PerformanceDashboard() {
  const [isVisible, setIsVisible] = useState(false)
  const [preloadStatus, setPreloadStatus] = useState({ preloaded: [] as string[], loading: [] as string[] })

  const performance = usePerformance()
  const bundleMetrics = useBundlePerformance()
  const { shouldLoadHighQuality, deviceCapabilities, isLowEndDevice } = useAdaptiveLoading()

  // Only show in development
  useEffect(() => {
    setIsVisible(process.env.NODE_ENV === 'development')
  }, [])

  // Update preload status periodically
  useEffect(() => {
    const updatePreloadStatus = () => {
      const stats = GamePreloader.getStats()
      // Reason: Transform GamePreloader stats to match expected preloadStatus structure
      setPreloadStatus({
        preloaded: [...stats.preloadedGames, ...stats.preloadedRoutes],
        loading: [] // No direct way to track currently loading items from GamePreloader
      })
    }

    updatePreloadStatus()
    const interval = setInterval(updatePreloadStatus, 1000)
    return () => clearInterval(interval)
  }, [])

  if (!isVisible) return null

  const networkInfo = getNetworkInfo()
  const memoryInfo = memoryUtils.getMemoryInfo()

  const getPerformanceColor = (value: number, thresholds: [number, number]) => {
    if (value <= thresholds[0]) return 'success'
    if (value <= thresholds[1]) return 'warning'
    return 'danger'
  }

  return (
    <div className="fixed top-4 left-4 w-80 max-h-96 overflow-y-auto z-50 bg-black/90 rounded-lg p-2 text-white text-xs">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-semibold">Performance Dashboard</h3>
        <Button
          size="sm"
          variant="light"
          onPress={() => setIsVisible(false)}
        >
          ×
        </Button>
      </div>

      {/* Loading Performance */}
      <Card className="mb-2">
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium">Load Performance</h4>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Load Time:</span>
              <Chip
                size="sm"
                color={getPerformanceColor(performance.loadTime, [1000, 3000])}
              >
                {performance.loadTime.toFixed(0)}ms
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>Interaction:</span>
              <Chip
                size="sm"
                color={getPerformanceColor(performance.interactionTime, [100, 300])}
              >
                {performance.interactionTime.toFixed(0)}ms
              </Chip>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Network & Device */}
      <Card className="mb-2">
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium">Device & Network</h4>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Connection:</span>
              <Chip size="sm" color={networkInfo.effectiveType === '4g' ? 'success' : 'warning'}>
                {networkInfo.effectiveType}
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>Memory:</span>
              <Chip size="sm">
                {deviceCapabilities.memory}GB
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>CPU Cores:</span>
              <Chip size="sm">
                {deviceCapabilities.cores}
              </Chip>
            </div>
            <div className="flex justify-between">
              <span>High Quality:</span>
              <Chip size="sm" color={shouldLoadHighQuality ? 'success' : 'warning'}>
                {shouldLoadHighQuality ? 'Yes' : 'No'}
              </Chip>
            </div>
            {isLowEndDevice && (
              <Chip size="sm" color="warning" className="w-full">
                Low-end device detected
              </Chip>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Memory Usage */}
      {memoryInfo && (
        <Card className="mb-2">
          <CardHeader className="pb-2">
            <h4 className="text-sm font-medium">Memory Usage</h4>
          </CardHeader>
          <CardBody className="pt-0">
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Used:</span>
                <span>{(memoryInfo.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</span>
              </div>
              <Progress
                size="sm"
                color={getPerformanceColor(
                  (memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100,
                  [50, 80]
                )}
                value={(memoryInfo.usedJSHeapSize / memoryInfo.totalJSHeapSize) * 100}
              />
              <div className="flex justify-between text-xs">
                <span>Total:</span>
                <span>{(memoryInfo.totalJSHeapSize / 1024 / 1024).toFixed(1)}MB</span>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Bundle Performance */}
      <Card className="mb-2">
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium">Bundle Loading</h4>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-1">
            <div className="flex justify-between">
              <span>Chunks Loaded:</span>
              <span>{bundleMetrics.chunksLoaded}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Time:</span>
              <span>{bundleMetrics.totalLoadTime.toFixed(0)}ms</span>
            </div>
            <div className="flex justify-between">
              <span>Avg Chunk:</span>
              <span>{bundleMetrics.averageChunkSize.toFixed(0)}ms</span>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Game Preloading */}
      <Card className="mb-2">
        <CardHeader className="pb-2">
          <h4 className="text-sm font-medium">Game Preloading</h4>
        </CardHeader>
        <CardBody className="pt-0">
          <div className="space-y-2">
            <div>
              <div className="flex justify-between mb-1">
                <span>Preloaded:</span>
                <span>{preloadStatus.preloaded.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {preloadStatus.preloaded.map(gameId => (
                  <Chip key={gameId} size="sm" color="success">
                    {gameId}
                  </Chip>
                ))}
              </div>
            </div>
            {preloadStatus.loading.length > 0 && (
              <div>
                <div className="flex justify-between mb-1">
                  <span>Loading:</span>
                  <span>{preloadStatus.loading.length}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {preloadStatus.loading.map(gameId => (
                    <Chip key={gameId} size="sm" color="warning">
                      {gameId}
                    </Chip>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="flat"
          onPress={() => console.log('Bundle analysis would go here')}
        >
          Analyze
        </Button>
        <Button
          size="sm"
          variant="flat"
          onPress={() => GamePreloader.preloadGamesPriority([
            { id: 'mines', priority: 3 },
            { id: 'crash', priority: 3 },
            { id: 'limbo', priority: 2 }
          ])}
        >
          Preload
        </Button>
        <Button
          size="sm"
          variant="flat"
          onPress={() => memoryUtils.forceGC()}
        >
          GC
        </Button>
      </div>
    </div>
  )
}

/**
 * Performance toggle button for easy access
 */
export function PerformanceToggle() {
  const [showDashboard, setShowDashboard] = useState(false)

  if (process.env.NODE_ENV !== 'development') return null

  return (
    <>
      <Button
        size="sm"
        variant="flat"
        className="fixed bottom-4 left-4 z-40"
        onPress={() => setShowDashboard(!showDashboard)}
      >
        📊
      </Button>
      {showDashboard && <PerformanceDashboard />}
    </>
  )
}