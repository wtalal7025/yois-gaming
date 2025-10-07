/**
 * Responsive React Hook
 * Custom hook for responsive behavior in React components
 */

'use client'

import { useState, useEffect } from 'react'
import { breakpoints, type Breakpoint } from '../utils/responsive'

export interface ResponsiveState {
  isMobile: boolean
  isTablet: boolean
  isDesktop: boolean
  currentBreakpoint: Breakpoint
  width: number
}

/**
 * Custom hook for responsive design
 * Returns current breakpoint information and updates on window resize
 */
export function useResponsive(): ResponsiveState {
  const [state, setState] = useState<ResponsiveState>(() => {
    if (typeof window === 'undefined') {
      return {
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        currentBreakpoint: 'lg' as Breakpoint,
        width: 1024
      }
    }

    const width = window.innerWidth
    return {
      isMobile: width < breakpoints.md,
      isTablet: width >= breakpoints.md && width < breakpoints.lg,
      isDesktop: width >= breakpoints.lg,
      currentBreakpoint: getCurrentBreakpoint(width),
      width
    }
  })

  useEffect(() => {
    function handleResize() {
      const width = window.innerWidth
      setState({
        isMobile: width < breakpoints.md,
        isTablet: width >= breakpoints.md && width < breakpoints.lg,
        isDesktop: width >= breakpoints.lg,
        currentBreakpoint: getCurrentBreakpoint(width),
        width
      })
    }

    // Add event listener with passive option for better performance
    window.addEventListener('resize', handleResize, { passive: true })
    
    // Call handler right away so state gets updated with initial window size
    handleResize()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}

/**
 * Get current breakpoint based on width
 */
function getCurrentBreakpoint(width: number): Breakpoint {
  if (width >= breakpoints['2xl']) return '2xl'
  if (width >= breakpoints.xl) return 'xl'
  if (width >= breakpoints.lg) return 'lg'
  if (width >= breakpoints.md) return 'md'
  if (width >= breakpoints.sm) return 'sm'
  return 'xs'
}

/**
 * Hook to check if device supports hover
 */
export function useHover(): boolean {
  const [supportsHover, setSupportsHover] = useState(true)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(hover: hover)')
      setSupportsHover(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setSupportsHover(e.matches)
      }

      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
    return undefined
  }, [])

  return supportsHover
}

/**
 * Hook to check for reduced motion preference
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
      setPrefersReduced(mediaQuery.matches)

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReduced(e.matches)
      }

      mediaQuery.addListener(handleChange)
      return () => mediaQuery.removeListener(handleChange)
    }
  }, [])

  return prefersReduced
}

/**
 * Hook for responsive grid columns
 */
export function useResponsiveGrid(contentType: 'games' | 'compact' | 'list' = 'games') {
  const { currentBreakpoint } = useResponsive()
  
  const getColumns = () => {
    const columnMap = {
      games: {
        'xs': 1,
        'sm': 2,
        'md': 2,
        'lg': 3,
        'xl': 4,
        '2xl': 4
      },
      compact: {
        'xs': 2,
        'sm': 3,
        'md': 4,
        'lg': 6,
        'xl': 8,
        '2xl': 8
      },
      list: {
        'xs': 1,
        'sm': 1,
        'md': 1,
        'lg': 1,
        'xl': 1,
        '2xl': 1
      }
    }
    
    return columnMap[contentType][currentBreakpoint]
  }

  return {
    columns: getColumns(),
    currentBreakpoint
  }
}