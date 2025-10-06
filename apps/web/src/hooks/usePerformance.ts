'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface PerformanceMetrics {
  loadTime: number
  renderTime: number
  interactionTime: number
  memoryUsage: number | null
  connectionType: string
  isSlowConnection: boolean
}

interface ComponentPerformanceMetrics {
  mountTime: number
  updateTime: number
  renderCount: number
}

/**
 * Hook for monitoring overall page/app performance
 */
export function usePerformance() {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    memoryUsage: null,
    connectionType: 'unknown',
    isSlowConnection: false
  })

  const startTime = useRef<number>(performance.now())

  useEffect(() => {
    // Measure initial load time
    const measureLoadTime = () => {
      const loadTime = performance.now() - startTime.current

      // Get memory usage if available
      const memoryUsage = 'memory' in performance
        ? (performance as any).memory?.usedJSHeapSize || null
        : null

      // Get connection info
      const connection = (navigator as any).connection
      const connectionType = connection?.effectiveType || 'unknown'
      const isSlowConnection = connection?.effectiveType === 'slow-2g' ||
        connection?.effectiveType === '2g' ||
        connection?.saveData === true

      setMetrics(prev => ({
        ...prev,
        loadTime,
        memoryUsage,
        connectionType,
        isSlowConnection
      }))
    }

    // Measure when DOM is ready
    if (document.readyState === 'complete') {
      measureLoadTime()
      return undefined // Explicit return to match TypeScript strict mode requirements
    } else {
      window.addEventListener('load', measureLoadTime)
      return () => window.removeEventListener('load', measureLoadTime)
    }
  }, []) // Reason: This effect should only run once on mount, dependencies are captured in closure

  // Measure interaction delay (First Input Delay approximation)
  useEffect(() => {
    let interactionStartTime: number

    const handleInteractionStart = () => {
      interactionStartTime = performance.now()
    }

    const handleInteractionEnd = () => {
      if (interactionStartTime) {
        const interactionTime = performance.now() - interactionStartTime
        setMetrics(prev => ({ ...prev, interactionTime }))
      }
    }

    document.addEventListener('mousedown', handleInteractionStart, { passive: true })
    document.addEventListener('mouseup', handleInteractionEnd, { passive: true })
    document.addEventListener('keydown', handleInteractionStart, { passive: true })
    document.addEventListener('keyup', handleInteractionEnd, { passive: true })

    return () => {
      document.removeEventListener('mousedown', handleInteractionStart)
      document.removeEventListener('mouseup', handleInteractionEnd)
      document.removeEventListener('keydown', handleInteractionStart)
      document.removeEventListener('keyup', handleInteractionEnd)
    }
  }, []) // Reason: This effect should only run once on mount to set up event listeners

  return metrics
}

/**
 * Hook for monitoring individual component performance
 */
export function useComponentPerformance(componentName?: string) {
  const [metrics, setMetrics] = useState<ComponentPerformanceMetrics>({
    mountTime: 0,
    updateTime: 0,
    renderCount: 0
  })

  const mountStartTime = useRef<number>(performance.now())
  const lastUpdateTime = useRef<number>(performance.now())
  const renderCount = useRef<number>(0)

  // Track component mount time
  useEffect(() => {
    const mountTime = performance.now() - mountStartTime.current
    setMetrics(prev => ({ ...prev, mountTime }))

    if (componentName && process.env.NODE_ENV === 'development') {
      console.log(`${componentName} mounted in ${mountTime.toFixed(2)}ms`)
    }
  }, [componentName])

  // Track component updates
  useEffect(() => {
    renderCount.current += 1
    const updateTime = performance.now() - lastUpdateTime.current
    lastUpdateTime.current = performance.now()

    setMetrics(prev => ({
      ...prev,
      updateTime,
      renderCount: renderCount.current
    }))
  })

  const logPerformance = useCallback(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Component ${componentName || 'Unknown'} performance:`, metrics)
    }
  }, [componentName, metrics])

  return {
    metrics,
    logPerformance
  }
}

/**
 * Hook for lazy loading with intersection observer
 */
export function useLazyLoad<T extends HTMLElement>(
  options: IntersectionObserverInit = {}
) {
  const [isInView, setIsInView] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const elementRef = useRef<T>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element || hasLoaded) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            setHasLoaded(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
        ...options
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [hasLoaded]) // Reason: Options object would cause infinite re-renders; it's passed as prop and should be stable

  return {
    elementRef,
    isInView,
    hasLoaded
  }
}

/**
 * Hook for preloading resources on hover/focus
 */
export function usePreloadOnHover() {
  const preloadedResources = useRef<Set<string>>(new Set())

  const preloadResource = useCallback((url: string, type: 'image' | 'script' | 'style' = 'image') => {
    if (preloadedResources.current.has(url)) return

    const link = document.createElement('link')
    link.rel = 'preload'
    link.href = url
    link.as = type

    document.head.appendChild(link)
    preloadedResources.current.add(url)
  }, [])

  const handleMouseEnter = useCallback((url: string, type?: 'image' | 'script' | 'style') => {
    preloadResource(url, type)
  }, [preloadResource])

  return {
    preloadResource,
    handleMouseEnter
  }
}

/**
 * Hook for monitoring bundle loading performance
 */
export function useBundlePerformance() {
  const [bundleMetrics, setBundleMetrics] = useState<{
    chunksLoaded: number
    totalLoadTime: number
    averageChunkSize: number
  }>({
    chunksLoaded: 0,
    totalLoadTime: 0,
    averageChunkSize: 0
  })

  useEffect(() => {
    if (typeof window === 'undefined' || process.env.NODE_ENV !== 'development') {
      return
    }

    // Monitor performance navigation entries
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()

      entries.forEach((entry) => {
        if (entry.name.includes('chunk') || entry.name.includes('.js')) {
          setBundleMetrics(prev => ({
            chunksLoaded: prev.chunksLoaded + 1,
            totalLoadTime: prev.totalLoadTime + entry.duration,
            averageChunkSize: (prev.totalLoadTime + entry.duration) / (prev.chunksLoaded + 1)
          }))
        }
      })
    })

    observer.observe({ entryTypes: ['navigation', 'resource'] })

    return () => observer.disconnect()
  }, [])

  return bundleMetrics
}

/**
 * Hook for adaptive loading based on device capabilities
 */
export function useAdaptiveLoading() {
  const [shouldLoadHighQuality, setShouldLoadHighQuality] = useState(true)
  const [deviceCapabilities, setDeviceCapabilities] = useState({
    memory: 4, // Default to 4GB
    cores: 4,  // Default to 4 cores
    connectionSpeed: 'fast'
  })

  useEffect(() => {
    // Get device memory if available
    const memory = (navigator as any).deviceMemory || 4
    const cores = navigator.hardwareConcurrency || 4

    // Get connection speed
    const connection = (navigator as any).connection
    const connectionSpeed = connection?.effectiveType === '4g' ? 'fast' : 'slow'

    setDeviceCapabilities({ memory, cores, connectionSpeed })

    // Determine if we should load high quality assets
    const shouldLoad = memory >= 2 && cores >= 2 && connectionSpeed === 'fast'
    setShouldLoadHighQuality(shouldLoad)
  }, [])

  return {
    shouldLoadHighQuality,
    deviceCapabilities,
    isLowEndDevice: deviceCapabilities.memory < 2 || deviceCapabilities.cores < 2
  }
}