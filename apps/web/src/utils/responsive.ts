/**
 * Responsive Design Utilities
 * Helper functions for responsive behavior and breakpoint management
 */

/**
 * Breakpoint definitions following Tailwind CSS conventions
 */
export const breakpoints = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
} as const

export type Breakpoint = keyof typeof breakpoints

/**
 * Check if current screen width matches breakpoint
 */
export function useBreakpoint() {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      currentBreakpoint: 'lg' as Breakpoint
    }
  }

  const width = window.innerWidth
  
  return {
    isMobile: width < breakpoints.md,
    isTablet: width >= breakpoints.md && width < breakpoints.lg,
    isDesktop: width >= breakpoints.lg,
    currentBreakpoint: getCurrentBreakpoint(width)
  }
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
 * Get optimal grid columns based on breakpoint and content type
 */
export function getGridColumns(
  breakpoint: Breakpoint, 
  contentType: 'games' | 'compact' | 'list' = 'games'
): number {
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
  
  return columnMap[contentType][breakpoint]
}

/**
 * Get responsive image sizes string for Next.js Image component
 */
export function getImageSizes(sizes?: {
  mobile?: string
  tablet?: string
  desktop?: string
}): string {
  const defaultSizes = {
    mobile: '100vw',
    tablet: '50vw',
    desktop: '25vw'
  }
  
  const finalSizes = { ...defaultSizes, ...sizes }
  
  return `(max-width: 768px) ${finalSizes.mobile}, (max-width: 1024px) ${finalSizes.tablet}, ${finalSizes.desktop}`
}

/**
 * Touch-friendly sizing utilities
 */
export const touchTargetSizes = {
  minimum: 44, // iOS minimum touch target
  comfortable: 48, // Comfortable touch target
  large: 56 // Large touch target
} as const

/**
 * Get responsive padding based on screen size
 */
export function getResponsivePadding(
  breakpoint: Breakpoint,
  variant: 'tight' | 'normal' | 'loose' = 'normal'
): string {
  const paddingMap = {
    tight: {
      'xs': 'p-2',
      'sm': 'p-3',
      'md': 'p-4',
      'lg': 'p-4',
      'xl': 'p-6',
      '2xl': 'p-6'
    },
    normal: {
      'xs': 'p-4',
      'sm': 'p-4',
      'md': 'p-6',
      'lg': 'p-6',
      'xl': 'p-8',
      '2xl': 'p-8'
    },
    loose: {
      'xs': 'p-6',
      'sm': 'p-6',
      'md': 'p-8',
      'lg': 'p-8',
      'xl': 'p-12',
      '2xl': 'p-16'
    }
  }
  
  return paddingMap[variant][breakpoint]
}

/**
 * Get responsive gap classes
 */
export function getResponsiveGap(
  breakpoint: Breakpoint,
  size: 'small' | 'medium' | 'large' = 'medium'
): string {
  const gapMap = {
    small: {
      'xs': 'gap-2',
      'sm': 'gap-3',
      'md': 'gap-3',
      'lg': 'gap-4',
      'xl': 'gap-4',
      '2xl': 'gap-6'
    },
    medium: {
      'xs': 'gap-3',
      'sm': 'gap-4',
      'md': 'gap-4',
      'lg': 'gap-6',
      'xl': 'gap-6',
      '2xl': 'gap-8'
    },
    large: {
      'xs': 'gap-4',
      'sm': 'gap-6',
      'md': 'gap-6',
      'lg': 'gap-8',
      'xl': 'gap-8',
      '2xl': 'gap-12'
    }
  }
  
  return gapMap[size][breakpoint]
}

/**
 * Check if device supports hover interactions
 * Useful for disabling hover effects on touch devices
 */
export function supportsHover(): boolean {
  if (typeof window === 'undefined') return true
  return window.matchMedia('(hover: hover)').matches
}

/**
 * Check if device prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get container max width class based on breakpoint
 */
export function getContainerMaxWidth(breakpoint: Breakpoint): string {
  const maxWidthMap = {
    'xs': 'max-w-full',
    'sm': 'max-w-screen-sm',
    'md': 'max-w-screen-md', 
    'lg': 'max-w-screen-lg',
    'xl': 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl'
  }
  
  return maxWidthMap[breakpoint]
}

/**
 * Responsive text size utilities
 */
export function getResponsiveTextSize(
  size: 'small' | 'medium' | 'large' | 'xl' | 'xxl',
  breakpoint: Breakpoint
): string {
  const textSizeMap = {
    small: {
      'xs': 'text-xs',
      'sm': 'text-sm',
      'md': 'text-sm',
      'lg': 'text-base',
      'xl': 'text-base',
      '2xl': 'text-base'
    },
    medium: {
      'xs': 'text-sm',
      'sm': 'text-base',
      'md': 'text-base',
      'lg': 'text-lg',
      'xl': 'text-lg',
      '2xl': 'text-xl'
    },
    large: {
      'xs': 'text-lg',
      'sm': 'text-xl',
      'md': 'text-xl',
      'lg': 'text-2xl',
      'xl': 'text-2xl',
      '2xl': 'text-3xl'
    },
    xl: {
      'xs': 'text-xl',
      'sm': 'text-2xl',
      'md': 'text-2xl',
      'lg': 'text-3xl',
      'xl': 'text-4xl',
      '2xl': 'text-5xl'
    },
    xxl: {
      'xs': 'text-2xl',
      'sm': 'text-3xl',
      'md': 'text-4xl',
      'lg': 'text-5xl',
      'xl': 'text-6xl',
      '2xl': 'text-7xl'
    }
  }
  
  return textSizeMap[size][breakpoint]
}