/**
 * Lazy Loading Utilities
 * Helper functions and components for lazy loading and code splitting
 */

import { lazy, ComponentType, Suspense } from 'react'

/**
 * Enhanced lazy loading with error boundaries and fallbacks
 */
export function lazyWithPreload<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  const LazyComponent = lazy(importFunc)
  
  // Add preload method to component
  const preload = () => importFunc()
  
  // Attach preload to the component
  ;(LazyComponent as any).preload = preload
  
  return LazyComponent as T & { preload: () => Promise<{ default: T }> }
}

/**
 * Lazy loading with retry mechanism for network failures
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  maxRetries: number = 3
) {
  return lazy(() => {
    const retry = (attempt = 1): Promise<{ default: T }> => {
      return importFunc().catch((error) => {
        if (attempt < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s...
          const delay = Math.pow(2, attempt - 1) * 1000
          return new Promise((resolve) => {
            setTimeout(() => resolve(retry(attempt + 1)), delay)
          })
        }
        throw error
      })
    }
    
    return retry()
  })
}

/**
 * Intersection Observer for lazy loading elements
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
    return null
  }

  return new IntersectionObserver(callback, {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  })
}

/**
 * Preload resources for better performance
 */
export function preloadResource(href: string, type: 'script' | 'style' | 'image' | 'fetch') {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'preload'
  link.href = href
  
  switch (type) {
    case 'script':
      link.as = 'script'
      break
    case 'style':
      link.as = 'style'
      break
    case 'image':
      link.as = 'image'
      break
    case 'fetch':
      link.as = 'fetch'
      link.crossOrigin = 'anonymous'
      break
  }
  
  document.head.appendChild(link)
}

/**
 * Prefetch resources for future navigation
 */
export function prefetchResource(href: string) {
  if (typeof document === 'undefined') return

  const link = document.createElement('link')
  link.rel = 'prefetch'
  link.href = href
  document.head.appendChild(link)
}

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): T {
  let timeout: NodeJS.Timeout | null = null
  
  return ((...args: Parameters<T>) => {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }
    
    const callNow = immediate && !timeout
    
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    
    if (callNow) func(...args)
  }) as T
}

/**
 * Throttle function for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): T {
  let inThrottle: boolean
  
  return ((...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }) as T
}

/**
 * Check if device has reduced data preference
 */
export function prefersReducedData(): boolean {
  if (typeof navigator === 'undefined') return false
  
  // Check for Save-Data header support
  const connection = (navigator as any).connection
  if (connection && 'saveData' in connection) {
    return connection.saveData === true
  }
  
  // Check for reduced data media query
  if (window.matchMedia) {
    return window.matchMedia('(prefers-reduced-data: reduce)').matches
  }
  
  return false
}

/**
 * Get network connection information
 */
export function getNetworkInfo() {
  if (typeof navigator === 'undefined') {
    return {
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false
    }
  }

  const connection = (navigator as any).connection
  
  if (connection) {
    return {
      effectiveType: connection.effectiveType || '4g',
      downlink: connection.downlink || 10,
      rtt: connection.rtt || 50,
      saveData: connection.saveData || false
    }
  }
  
  return {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false
  }
}

/**
 * Adaptive loading based on network conditions
 */
export function shouldLoadHighQuality(): boolean {
  if (prefersReducedData()) return false
  
  const network = getNetworkInfo()
  
  // Load high quality on good connections
  return network.effectiveType === '4g' && network.downlink > 1.5
}

/**
 * Memory management utilities
 */
export const memoryUtils = {
  /**
   * Clear image cache
   */
  clearImageCache() {
    if (typeof window !== 'undefined' && 'caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          if (name.includes('image')) {
            caches.delete(name)
          }
        })
      })
    }
  },
  
  /**
   * Get memory usage information
   */
  getMemoryInfo() {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perf = (performance as any).memory
      if (perf) {
        return {
          usedJSHeapSize: perf.usedJSHeapSize,
          totalJSHeapSize: perf.totalJSHeapSize,
          jsHeapSizeLimit: perf.jsHeapSizeLimit
        }
      }
    }
    return null
  },
  
  /**
   * Force garbage collection (if available)
   */
  forceGC() {
    if (typeof window !== 'undefined' && 'gc' in window) {
      ;(window as any).gc()
    }
  }
}